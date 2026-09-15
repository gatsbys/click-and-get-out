// Captura las imágenes 1280x800 de la ficha de Chrome Web Store usando la
// extensión real sobre la web de demostración, en cada idioma, y un primer
// plano de la barra a 2x para el README. Arranca el servidor por su cuenta:
// basta con `npm run shots`.
import { chromium } from 'playwright';
import { mkdtemp, mkdir, cp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const size = { width: 1280, height: 800 };
const noise = ['#promo-bar', '#cookie-wall', '#video-float', 'div.wrap.ad-billboard', '#sidebar-ad', '#app-banner', '.sponsored-grid', '.related-spam'];
const editions = [{ locale: 'es', path: '' }, { locale: 'en', path: 'en.html' }];
// Recorte del primer plano: la barra centrada, el anuncio enmarcado y su etiqueta «Marcado».
const closeup = { x: 0, y: 0, width: 1000, height: 350 };

const server = spawn(process.execPath, [resolve(root, 'scripts/demo.mjs')], { env: { ...process.env, PORT: '4199' }, stdio: 'inherit' });
const origin = 'http://localhost:4199';
const temp = await mkdtemp(join(tmpdir(), 'click-and-get-out-shots-'));
const open = [];
try {
  const extPath = join(temp, 'extension');
  await mkdir(extPath);
  await cp(join(root, 'icons'), join(extPath, 'icons'), { recursive: true });
  for (const file of ['background.js', 'content.js', 'selectors.js', 'popup.js', 'popup.html', 'popup.css']) await cp(join(root, file), join(extPath, file));
  const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
  // Grant the demo origin up front: the native permission prompt cannot be driven here.
  await writeFile(join(extPath, 'manifest.json'), JSON.stringify({ ...manifest, host_permissions: ['http://localhost/*'] }));

  // Abre Chromium con la extensión cargada y devuelve lo necesario para manejarla
  // desde fuera: la pestaña de la demo, la del menú y los mensajes a cada parte.
  async function session(scale) {
    const context = await chromium.launchPersistentContext(join(temp, `profile-${scale}x`), {
      channel: 'chromium', headless: true, viewport: size, deviceScaleFactor: scale,
      args: [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`]
    });
    open.push(context);
    context.setDefaultTimeout(15000);
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const extensionId = new URL(worker.url()).host;
    const page = await context.newPage();
    const control = await context.newPage();
    await control.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.goto(origin);
    await page.bringToFront();
    const tabId = await worker.evaluate(async origin => (await chrome.tabs.query({})).find(t => t.url?.startsWith(origin)).id, origin);
    const inject = () => control.evaluate(tabId => chrome.scripting.executeScript({ target: { tabId }, files: ['selectors.js', 'content.js'] }), tabId);
    const toTab = data => control.evaluate(({ tabId, data }) => chrome.tabs.sendMessage(tabId, { channel: 'click-and-get-out-tab', ...data }, { frameId: 0 }), { tabId, data });
    const toWorker = data => control.evaluate(({ origin, data }) => chrome.runtime.sendMessage({ channel: 'click-and-get-out', origin, ...data }), { origin, data });
    const settle = () => page.waitForTimeout(450);
    const ready = async url => {
      await page.goto(url);
      await page.waitForFunction(() => document.fonts.status === 'loaded');
      await settle();
    };
    // El selector activo, señalando el anuncio de cabecera. El puntero cae en un hijo
    // del anuncio, así que se amplía con ↑ hasta encuadrar el bloque entero, que es
    // cuando el selector deja de depender de la estructura de la página. Ampliar ya
    // marca el bloque; si no hizo falta, Enter lo marca para que la barra se vea en uso.
    const pickBillboard = async locale => {
      await inject();
      await toTab({ type: 'start', remember: true });
      await page.hover('div.wrap.ad-billboard');
      const ui = fn => page.evaluate(fn);
      const fragile = () => ui(() => document.querySelector('[data-click-and-get-out-ui]').shadowRoot.querySelector('.warning').hidden === false);
      for (let i = 0; i < 4 && await fragile(); i++) await page.keyboard.press('ArrowUp');
      if (await fragile()) throw new Error(`[${locale}] El anuncio de cabecera no llega a una selección estable.`);
      if (!await ui(() => document.querySelector('[data-click-and-get-out-ui]').shadowRoot.querySelector('.outline').classList.contains('pinned'))) await page.keyboard.press('Enter');
      await settle();
    };
    return { context, page, control, inject, toTab, toWorker, settle, ready, pickBillboard };
  }

  const store = await session(1);
  for (const { locale, path } of editions) {
    const { page, control, context, toTab, toWorker, ready, pickBillboard } = store;
    const out = resolve(root, 'store/screenshots', locale);
    await mkdir(out, { recursive: true });
    const shot = (name, target = page) => target.screenshot({ path: join(out, name) });
    // Las reglas viven por origen, así que las dos ediciones comparten estado.
    await toWorker({ type: 'reset' });
    await ready(`${origin}/${path}`);

    // 1. La página tal cual llega, con todo el ruido encima.
    await shot('01-before.png');

    // 2. El selector activo sobre el anuncio de cabecera, ya marcado.
    await pickBillboard(locale);
    await shot('02-picking.png');
    await toTab({ type: 'reset' });

    // 3. La misma página con las reglas aplicadas por la extensión. selectors.js
    // corre en el mundo aislado del content script, así que para consultarlo desde
    // aquí se carga una segunda copia en el mundo de la página.
    await page.addScriptTag({ path: resolve(root, 'selectors.js') });
    const report = [];
    for (const selector of noise) {
      const info = await page.evaluate(sel => {
        const el = document.querySelector(sel);
        return el ? globalThis.ClickAndGetOutSelectors.selectorFor(el) : null;
      }, selector);
      if (!info) throw new Error(`[${locale}] No existe en la demo: ${selector}`);
      // Misma etiqueta que deriva content.js al ocultar, para que el menú de la
      // captura muestre exactamente lo que vería quien use la extensión.
      const label = await page.evaluate(sel => {
        const el = document.querySelector(sel);
        return (el.getAttribute('aria-label') || el.textContent?.trim().replace(/\s+/g, ' ') || el.localName).slice(0, 100);
      }, selector);
      const result = await toWorker({ type: 'add', ...info, label });
      if (!result?.ok) throw new Error(`[${locale}] ${selector}: ${result?.error}`);
      report.push({ idioma: locale, pedido: selector, guardado: info.selector, fragil: info.fragile });
    }
    await ready(`${origin}/${path}`);
    await shot('03-after.png');

    // 4. El menú de la extensión sobre la página, como lo ve quien la usa. El menú
    // lee la pestaña activa, así que la demo tiene que estar delante al recargarlo.
    await page.bringToFront();
    await control.setViewportSize({ width: 360, height: 640 });
    await control.reload();
    await control.waitForFunction(count => document.querySelector('#count').textContent === count, String(noise.length));
    const popupShot = (await control.locator('body').screenshot()).toString('base64');
    const pageShot = (await page.screenshot()).toString('base64');
    const stage = await context.newPage();
    await stage.setViewportSize(size);
    await stage.setContent(`<style>html,body{margin:0;width:1280px;height:800px;overflow:hidden}
      .bg{position:absolute;inset:0;width:1280px;height:800px}
      .pop{position:absolute;top:14px;right:22px;width:360px;border-radius:12px;box-shadow:0 18px 50px #00000045,0 3px 10px #0000002e}
      .arrow{position:absolute;top:0;right:96px;border:9px solid transparent;border-bottom-color:#fff;filter:drop-shadow(0 -2px 2px #00000018)}</style>
      <img class="bg" src="data:image/png;base64,${pageShot}"><span class="arrow"></span><img class="pop" src="data:image/png;base64,${popupShot}">`);
    await stage.waitForTimeout(400);
    await shot('04-menu.png', stage);
    await stage.close();

    console.table(report);
    console.log(`[${locale}] capturas 1280x800 en ${out}\n`);
  }
  await store.toWorker({ type: 'reset' });
  await store.context.close();

  // 5. Primer plano de la barra para el README, sobre la edición inglesa y a 2x
  // para que la tarjeta del elemento se lea nítida también en pantallas retina.
  const detail = await session(2);
  await detail.ready(`${origin}/en.html`);
  await detail.pickBillboard('en');
  const out = resolve(root, 'docs/images');
  await mkdir(out, { recursive: true });
  await detail.page.screenshot({ path: join(out, 'toolbar.png'), clip: closeup });
  console.log(`[readme] primer plano de la barra (${closeup.width * 2}x${closeup.height * 2}) en ${out}\n`);
} finally {
  for (const context of open) await context.close().catch(() => {});
  server.kill();
  await rm(temp, { recursive: true, force: true });
}
