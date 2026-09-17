// Graba el GIF de uso del README: la extensión real, en inglés, limpiando la web de
// demostración. No captura vídeo en tiempo real: avanza la escena fotograma a fotograma
// —mueve el ratón de verdad, deja que la extensión repinte y saca una captura—, y por
// eso el resultado es el mismo en cualquier máquina. Necesita `ffmpeg` para montarlo.
//
//   npm run clip        docs/images/demo.gif y dist/demo.mp4
//   npm run clip es     lo mismo con la edición y la interfaz en español (demo.es.*)
import { chromium } from 'playwright';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { stage } from './stage.mjs';

const root = resolve(import.meta.dirname, '..');
const locale = process.argv[2] === 'es' ? 'es' : 'en';
const suffix = locale === 'en' ? '' : `.${locale}`;
const size = { width: 1024, height: 640 };
const fps = 20;
// Dónde se dibuja el menú sobre la página: en una captura no hay barra del navegador,
// así que cuelga de la esquina, como lo haría del icono de la extensión.
const menuAt = { top: 10, right: 16, width: 360 };

const server = spawn(process.execPath, [resolve(root, 'scripts/demo.mjs')], { env: { ...process.env, PORT: '4197' }, stdio: 'ignore' });
const origin = 'http://localhost:4197';
const temp = await mkdtemp(join(tmpdir(), 'click-and-get-out-clip-'));
let context;
try {
  // Grant the demo origin up front: the native permission prompt cannot be driven here.
  const extPath = await stage(join(temp, 'extension'), { hosts: ['http://localhost/*'], locale });
  context = await chromium.launchPersistentContext(join(temp, 'profile'), {
    channel: 'chromium', headless: true, viewport: size, deviceScaleFactor: 1,
    args: [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`]
  });
  context.setDefaultTimeout(15000);
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const extensionId = new URL(worker.url()).host;
  const page = await context.newPage();
  const control = await context.newPage();
  await control.setViewportSize({ width: menuAt.width, height: 640 });
  await control.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.goto(`${origin}/${locale === 'en' ? 'en.html' : ''}`);
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  await page.bringToFront();
  const tabId = await worker.evaluate(async origin => (await chrome.tabs.query({})).find(t => t.url?.startsWith(origin)).id, origin);
  const toTab = data => control.evaluate(({ tabId, data }) => chrome.tabs.sendMessage(tabId, { channel: 'click-and-get-out-tab', ...data }, { frameId: 0 }), { tabId, data });

  // El menú es el de verdad, fotografiado en su pestaña y pegado sobre la demo. Lee la
  // pestaña activa al abrirse, así que la demo tiene que estar delante al recargarlo.
  const menuShot = async ({ hover, rules = 0 } = {}) => {
    await page.bringToFront();
    await control.reload();
    await control.waitForFunction(rules => !document.querySelector('#pick').disabled && document.querySelector('#count').textContent === String(rules), rules);
    if (hover) await control.hover(hover);
    await control.waitForTimeout(200);
    return `data:image/png;base64,${(await control.locator('body').screenshot()).toString('base64')}`;
  };
  const menuIdle = await menuShot();
  const menuHover = await menuShot({ hover: '#pick' });
  const pickBox = await control.locator('#pick').boundingBox();

  // Lo que la grabación añade a la página: el puntero (una captura no lo incluye), el
  // anillo del clic y el menú. Nada de ello recibe eventos, así que la extensión no lo ve.
  await page.evaluate(({ menuAt }) => {
    const layer = document.createElement('div');
    layer.id = 'clip-layer';
    layer.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none';
    layer.innerHTML = `
      <div id="clip-menu" style="position:absolute;top:${menuAt.top}px;right:${menuAt.right}px;width:${menuAt.width}px;opacity:0">
        <span style="position:absolute;top:-16px;right:74px;border:9px solid transparent;border-bottom-color:#fff;filter:drop-shadow(0 -2px 2px #00000018)"></span>
        <img style="display:block;width:100%;border-radius:12px;box-shadow:0 18px 50px #00000045,0 3px 10px #0000002e">
      </div>
      <div id="clip-ring" style="position:absolute;left:-17px;top:-17px;width:34px;height:34px;border-radius:50%;border:2px solid #0070f3;background:#0070f326;opacity:0"></div>
      <svg id="clip-cursor" width="28" height="28" viewBox="0 0 28 28" style="position:absolute;left:-6px;top:-3px;filter:drop-shadow(0 1px 2px #0006)"><path d="M6 3v19.5l5.3-4.7 3.4 7.7 3-1.3-3.3-7.6 7-.6Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    document.documentElement.append(layer);
  }, { menuAt });

  const frames = join(temp, 'frames');
  await mkdir(frames);
  let count = 0;
  let pointer = { x: 600, y: 470 };
  const draw = state => page.evaluate(({ state, time }) => {
    // Las animaciones de la demo (la marquesina, el piloto «en directo») avanzan con el
    // reloj del clip, no con el de la máquina que lo graba.
    for (const animation of document.getAnimations()) if (animation instanceof CSSAnimation) { animation.pause(); animation.currentTime = time; }
    const at = (id, x, y, extra = '') => { document.getElementById(id).style.transform = `translate(${x}px,${y}px) ${extra}`; };
    at('clip-cursor', state.x, state.y, `scale(${state.press ? .86 : 1})`);
    at('clip-ring', state.x, state.y, `scale(${.35 + 1.1 * (state.ring ?? 0)})`);
    document.getElementById('clip-ring').style.opacity = state.ring == null ? 0 : 1 - state.ring;
    if (state.menu != null) {
      const menu = document.getElementById('clip-menu');
      menu.style.opacity = state.menu;
      menu.style.transform = `translateY(${(state.menu - 1) * 8}px)`;
    }
  }, { state, time: count * 1000 / fps });
  const frame = async (state = {}) => {
    await draw({ ...pointer, ...state });
    await page.screenshot({ path: join(frames, `${String(count++).padStart(5, '0')}.png`) });
  };
  const steps = ms => Math.max(1, Math.round(ms * fps / 1000));
  const hold = async ms => { for (let i = 0; i < steps(ms); i++) await frame(); };
  // Una mano no traza rectas ni va a velocidad constante: el recorrido se comba un poco
  // y acelera y frena.
  const glide = async (to, ms) => {
    const from = pointer;
    const bend = Math.min(60, Math.hypot(to.x - from.x, to.y - from.y) * .12);
    const mid = { x: (from.x + to.x) / 2 + bend * Math.sign(to.y - from.y || 1), y: (from.y + to.y) / 2 - bend * Math.sign(to.x - from.x || 1) };
    for (let i = 1, n = steps(ms); i <= n; i++) {
      const t = i / n;
      const e = t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      pointer = { x: (1 - e) ** 2 * from.x + 2 * (1 - e) * e * mid.x + e ** 2 * to.x, y: (1 - e) ** 2 * from.y + 2 * (1 - e) * e * mid.y + e ** 2 * to.y };
      await page.mouse.move(pointer.x, pointer.y);
      await frame();
    }
  };
  // real: false es un clic solo dibujado, para el menú, que aquí es una imagen.
  const click = async ({ real = true, then } = {}) => {
    await frame({ press: true });
    if (real) await page.mouse.click(pointer.x, pointer.y);
    await then?.();
    await frame({ press: true, ring: 0 });
    for (const ring of [.25, .5, .75]) await frame({ ring });
  };
  const menu = async (src, show) => {
    if (src) await page.evaluate(src => new Promise(done => { const img = document.querySelector('#clip-menu img'); img.onload = done; img.src = src; }), src);
    if (show != null) for (const step of [.34, .67, 1]) await frame({ menu: show ? step : 1 - step });
  };
  const inMenu = box => ({ x: size.width - menuAt.right - menuAt.width + box.x + box.width / 2, y: menuAt.top + box.y + box.height / 2 });
  const ui = (fn, arg) => page.evaluate(`(${fn})(document.querySelector('[data-click-and-get-out-ui]').shadowRoot, ${JSON.stringify(arg ?? null)})`);
  const button = action => ui((root, action) => { const r = root.querySelector(`[data-action=${action}]`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, action);
  const gone = selector => page.waitForFunction(selector => getComputedStyle(document.querySelector(selector)).display === 'none', selector);
  // Marca el bloque bajo el puntero y lo amplía con el botón hasta encuadrar `selector`,
  // igual que haría alguien que ha señalado el texto y quiere llevarse la caja entera.
  const mark = async (point, selector, { travel = 600 } = {}) => {
    await glide(point, travel);
    await hold(200);
    await click();
    await hold(350);
    const framed = () => page.evaluate(selector => { const a = document.querySelector('[data-click-and-get-out-ui]').shadowRoot.querySelector('.outline').getBoundingClientRect(); const b = document.querySelector(selector).getBoundingClientRect(); return Math.abs(a.left - b.left) < 2 && Math.abs(a.top - b.top) < 2 && Math.abs(a.width - b.width) < 2 && Math.abs(a.height - b.height) < 2; }, selector);
    for (let i = 0; i < 4 && !await framed(); i++) {
      if (i === 0) await glide(await button('parent'), 480);
      await hold(100);
      await click();
      await hold(350);
    }
    if (!await framed()) throw new Error(`No se llega a encuadrar ${selector}`);
  };

  // 1. La página tal cual llega.
  await page.mouse.move(pointer.x, pointer.y);
  await hold(800);

  // 2. El icono de la extensión, su menú y «Seleccionar elemento».
  await glide({ x: size.width - menuAt.right - 83, y: 3 }, 600);
  await click({ real: false });
  await menu(menuIdle, true);
  await hold(450);
  await glide(inMenu(pickBox), 500);
  await menu(menuHover);
  await hold(200);
  await click({ real: false, then: () => menu(menuIdle) });
  await menu(null, false);
  // Lo mismo que hace el menú al pulsar el botón: inyectar el selector y arrancarlo.
  await control.evaluate(tabId => chrome.scripting.executeScript({ target: { tabId }, files: ['selectors.js', 'content.js'] }), tabId);
  await toTab({ type: 'start', remember: true });
  await hold(400);

  // 3. El anuncio de cabecera: marcar, ampliar a la caja entera y «Ocultar».
  await mark({ x: 452, y: 268 }, 'div.wrap.ad-billboard', { travel: 750 });
  await glide(await button('hide'), 500);
  await hold(150);
  await click({ then: () => gone('div.wrap.ad-billboard') });
  await hold(500);

  // 4. La franja de ofertas, desde su botón de cerrar.
  await mark({ x: 984, y: 18 }, '#promo-bar', { travel: 550 });
  await glide(await button('hide'), 480);
  await hold(100);
  await click({ then: () => gone('#promo-bar') });
  await hold(400);

  // 5. El vídeo flotante: aquí confirma el segundo clic sobre el propio bloque.
  await mark({ x: 792, y: 442 }, '#video-float', { travel: 650 });
  await glide({ x: 842, y: 452 }, 600);
  await hold(150);
  await click({ then: () => gone('#video-float') });
  await hold(400);

  // 6. El aviso de cookies: señalando su borde se coge entero, y son dos clics seguidos.
  await mark({ x: 1011, y: 604 }, '#cookie-wall', { travel: 550 });
  await click({ then: () => gone('#cookie-wall') });
  await hold(600);

  // 7. «Terminar», la página limpia y el menú con lo guardado.
  await glide(await button('close'), 650);
  await hold(150);
  await click();
  await hold(200);
  await glide({ x: 560, y: 380 }, 550);
  await hold(1000);
  const menuSaved = await menuShot({ rules: 4 });
  await glide({ x: size.width - menuAt.right - 83, y: 3 }, 600);
  await click({ real: false });
  await menu(menuSaved, true);
  await hold(2400);

  const gif = resolve(root, `docs/images/demo${suffix}.gif`);
  const mp4 = resolve(root, `dist/demo${suffix}.mp4`);
  await mkdir(resolve(root, 'docs/images'), { recursive: true });
  await mkdir(resolve(root, 'dist'), { recursive: true });
  const input = ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(frames, '%05d.png')];
  // Una sola paleta para todo el clip y, en cada fotograma, solo el rectángulo que cambia:
  // con la página quieta casi todo el rato, es lo que mantiene el GIF en un peso razonable.
  execFileSync('ffmpeg', [...input, '-vf', 'split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle', '-loop', '0', gif], { stdio: 'inherit' });
  execFileSync('ffmpeg', [...input, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', mp4], { stdio: 'inherit' });
  console.log(`${count} fotogramas a ${fps} fps (${(count / fps).toFixed(1)} s)\n${gif}\n${mp4}`);
} finally {
  await context?.close().catch(() => {});
  server.kill();
  await rm(temp, { recursive: true, force: true });
}
