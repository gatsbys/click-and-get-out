import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdtemp, readFile, writeFile, cp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createServer } from 'node:http';

const root = resolve(import.meta.dirname, '..');
const fixture = await readFile(join(import.meta.dirname, 'fixture.html'));
const productionManifest = JSON.parse(await readFile(join(root, 'manifest.json')));

test('Manifest: no broad mandatory site access and no remote runtime code', () => {
  assert.equal(productionManifest.manifest_version, 3);
  assert.equal(productionManifest.host_permissions, undefined);
  assert.deepEqual(productionManifest.permissions, ['activeTab', 'scripting', 'storage']);
  assert.equal(productionManifest.content_scripts, undefined);
});

test('Real extension: selection, persistence, dynamic content, undo and isolation', { timeout: 90000 }, async t => {
  const temp = await mkdtemp(join(tmpdir(), 'click-and-get-out-test-'));
  const server = createServer((req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(fixture); });
  await new Promise(resolve => server.listen(0, '0.0.0.0', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const extPath = join(temp, 'extension');
  await mkdir(extPath);
  await cp(join(root, 'icons'), join(extPath, 'icons'), { recursive: true });
  for (const file of ['background.js', 'content.js', 'selectors.js', 'popup.js', 'popup.html', 'popup.css']) await cp(join(root, file), join(extPath, file));
  // Grant only the local fixture origin in this test build. The production manifest
  // keeps optional host permissions; native browser permission prompts need a manual check.
  await writeFile(join(extPath, 'manifest.json'), JSON.stringify({ ...productionManifest, host_permissions: ['http://127.0.0.1/*'] }));
  let context;
  try {
    context = await chromium.launchPersistentContext(join(temp, 'profile'), {
      channel: 'chromium', headless: true,
      args: [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`],
      viewport: { width: 1280, height: 900 }
    });
    context.setDefaultTimeout(7000);
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const extensionId = new URL(worker.url()).host;
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    const control = await context.newPage();
    // Keep the fixture tab active while the extension page acts as the popup.
    await page.bringToFront();
    await control.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.bringToFront();
    await control.reload();
    const tabId = await worker.evaluate(async origin => (await chrome.tabs.query({})).find(t => t.url === origin + '/').id, origin);
    const rpc = async data => { const result = await control.evaluate(async ({ origin, data }) => chrome.runtime.sendMessage({ channel: 'click-and-get-out', origin, ...data }), { origin, data }); assert.equal(result.ok, true, JSON.stringify(result)); return result; };
    const send = data => control.evaluate(async ({ tabId, data }) => chrome.tabs.sendMessage(tabId, { channel: 'click-and-get-out-tab', ...data }, { frameId: 0 }), { tabId, data });
    const inject = () => control.evaluate(async tabId => chrome.scripting.executeScript({ target: { tabId }, files: ['selectors.js', 'content.js'] }), tabId);
    const visible = selector => page.locator(selector).isVisible();
    const waitHidden = selector => page.locator(selector).waitFor({ state: 'hidden' });
    const waitVisible = selector => page.locator(selector).waitFor({ state: 'visible' });
    const start = async remember => { assert.equal((await send({ type: 'start', remember })).ok, true); };
    const selectNotice = async () => {
      await page.locator('#notice-link').hover();
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('Enter');
      await waitHidden('#notice');
    };
    await inject();
    await t.test('temporary selection hides the whole banner and blocks link activation', async () => {
      await start(false);
      await selectNotice();
      assert.equal(await page.evaluate(() => window.pageClicks), 0);
      assert.equal(await visible('#article-one'), true);
      assert.equal((await rpc({ type: 'get' })).site.rules.length, 0);
      assert.equal((await send({ type: 'status' })).temporaryCount, 1);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('[data-click-and-get-out-ui]').count(), 0);
      await send({ type: 'undo' });
      await waitVisible('#notice');
      assert.equal(await page.locator('#notice').evaluate(el => el.style.getPropertyValue('display')), 'block');
      assert.equal(await page.locator('#notice').evaluate(el => el.style.getPropertyPriority('display')), 'important');
    });
    await t.test('click hides the pointed element without navigating', async () => {
      await start(false);
      await page.locator('#notice-link').click();
      await waitHidden('#notice-link');
      assert.equal(await page.evaluate(() => window.pageClicks), 0);
      assert.equal(page.url(), origin + '/');
      await send({ type: 'undo' });
      await waitVisible('#notice-link');
      await page.keyboard.press('Escape');
    });
    await t.test('remembered rules survive reload and site reinsertion', async () => {
      assert.equal((await rpc({ type: 'enable' })).ok, true);
      await start(true);
      await selectNotice();
      await page.keyboard.press('Escape');
      assert.equal((await rpc({ type: 'get' })).site.rules[0].selector, '#notice');
      await page.reload();
      await waitHidden('#notice');
      await page.evaluate(() => { const old = document.querySelector('#notice'); const copy = old.cloneNode(true); copy.style.display = 'block'; old.replaceWith(copy); });
      await waitHidden('#notice');
      await page.evaluate(() => document.querySelector('#notice').style.setProperty('display', 'block', 'important'));
      await waitHidden('#notice');
      assert.equal(await visible('#article-two'), true);
    });
    await t.test('concurrent writes are retained and rules stay isolated by origin', async () => {
      const results = await Promise.all(['#article-one', '#article-two'].map(selector => rpc({ type: 'add', selector, label: selector })));
      assert.ok(results.every(result => result.ok));
      assert.equal((await rpc({ type: 'get' })).site.rules.length, 3);
      for (const result of results) await rpc({ type: 'remove', id: result.rule.id });
      await waitVisible('#article-one');
      const other = await context.newPage();
      await other.goto(origin.replace('127.0.0.1', 'localhost'));
      assert.equal(await other.locator('#notice').isVisible(), true);
      await other.close();
    });
    await t.test('scroll recovery is opt-in and restores original inline properties', async () => {
      await page.evaluate(() => { document.body.style.setProperty('overflow', 'hidden', 'important'); document.body.style.position = 'fixed'; });
      await send({ type: 'unlock', value: true });
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).overflowY), 'auto');
      await send({ type: 'unlock', value: false });
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).overflowY), 'hidden');
      assert.equal(await page.evaluate(() => document.body.style.position), 'fixed');
      await page.evaluate(() => document.body.removeAttribute('style'));
    });
    await t.test('popup displays stored rules and deleting one updates the page', async () => {
      await page.bringToFront();
      await control.reload();
      await control.waitForFunction(() => document.querySelector('#count').textContent === '1');
      await mkdir(join(root, 'test-results'), { recursive: true });
      await control.locator('body').screenshot({ path: join(root, 'test-results/popup.png') });
      await control.locator('#rules .delete').click();
      await waitVisible('#notice');
      assert.equal((await rpc({ type: 'get' })).site.rules.length, 0);
    });
    await t.test('a stored rule can be switched off and on again without losing it', async () => {
      const { rule } = await rpc({ type: 'add', selector: '#notice', label: 'Aviso' });
      await waitHidden('#notice');
      await page.bringToFront();
      await control.reload();
      await control.waitForFunction(() => document.querySelector('#count').textContent === '1');
      await control.locator('#rules .toggle').click();
      await waitVisible('#notice');
      const stored = (await rpc({ type: 'get' })).site.rules;
      assert.deepEqual([stored.length, stored[0].id, stored[0].enabled], [1, rule.id, false]);
      await page.reload();
      await waitVisible('#notice');
      await control.locator('#rules .toggle').click();
      await waitHidden('#notice');
      assert.equal((await rpc({ type: 'get' })).site.rules[0].enabled, true);
      // Hiding the same element again while it is off re-enables the rule; undo turns it back off.
      await rpc({ type: 'toggle', id: rule.id, value: false });
      await waitVisible('#notice');
      await start(true);
      await selectNotice();
      await page.keyboard.press('Escape');
      assert.equal((await rpc({ type: 'get' })).site.rules.length, 1);
      await send({ type: 'undo' });
      await waitVisible('#notice');
      assert.equal((await rpc({ type: 'get' })).site.rules[0].enabled, false);
      await control.reload();
      await control.locator('#rules .delete').click();
      await waitVisible('#notice');
      assert.equal((await rpc({ type: 'get' })).site.rules.length, 0);
    });
    await t.test('structural selectors and repeated injection remain reversible', async () => {
      await inject();
      await inject();
      await start(false);
      assert.equal(await page.locator('[data-click-and-get-out-ui]').count(), 1);
      await page.locator('#article-one .picture').hover();
      await page.keyboard.press('Enter');
      await waitHidden('#article-one .picture');
      assert.equal(await visible('#article-two .picture'), true);
      await send({ type: 'undo' });
      await waitVisible('#article-one .picture');
      await page.keyboard.press('Escape');
    });
    await t.test('restoring site clears persistent and temporary state', async () => {
      await rpc({ type: 'add', selector: '#notice', label: 'Aviso' });
      await rpc({ type: 'unlock', value: true });
      await start(false);
      await page.locator('#article-two').hover({ position: { x: 10, y: 10 } });
      await page.keyboard.press('Enter');
      await waitHidden('#article-two');
      await rpc({ type: 'reset' });
      await send({ type: 'reset' });
      await waitVisible('#notice');
      await waitVisible('#article-two');
      assert.equal((await send({ type: 'status' })).canUndo, false);
      await page.reload();
      await waitVisible('#notice');
    });
    await t.test('the toolbar icon marks the sites with saved changes', async () => {
      const badge = () => worker.evaluate(tabId => chrome.action.getBadgeText({ tabId }), tabId);
      const waitBadge = async expected => {
        for (let i = 0; i < 60 && await badge() !== expected; i++) await new Promise(resolve => setTimeout(resolve, 50));
        assert.equal(await badge(), expected);
      };
      await waitBadge('');
      const { rule } = await rpc({ type: 'add', selector: '#notice', label: 'Aviso' });
      await waitBadge('1');
      assert.match(await worker.evaluate(tabId => chrome.action.getTitle({ tabId }), tabId), /1 elemento oculto en esta web/);
      await rpc({ type: 'toggle', id: rule.id, value: false });
      await waitBadge('');
      await rpc({ type: 'toggle', id: rule.id, value: true });
      await waitBadge('1');
      await rpc({ type: 'remove', id: rule.id });
      await waitBadge('');
      await rpc({ type: 'unlock', value: true });
      await waitBadge('\u2022');
      await rpc({ type: 'reset' });
      await waitBadge('');
      await waitVisible('#notice');
    });
    await t.test('generated banner classes survive prefix and body-position changes', async () => {
      await page.evaluate(() => {
        const shell = document.createElement('div');
        shell.id = '_d25544777196781';
        shell.style.cssText = 'position:fixed;top:280px;left:40px;z-index:100;background:white;padding:20px';
        shell.innerHTML = '<div class="_d25544777196781_pp"><div class="_d25544777196781_pp__modal"><div class="_d25544777196781_pp__info">Generated banner</div></div></div>';
        document.body.append(shell);
      });
      await start(true);
      await page.locator('div._d25544777196781_pp__info').hover();
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('Enter');
      await waitHidden('div._d25544777196781_pp__modal');
      const saved = (await rpc({ type: 'get' })).site.rules;
      const rule = saved.find(r => r.label === 'Generated banner');
      assert.ok(rule);
      assert.equal(rule.fragile, false, 'Generated semantic class suffix should not depend on body order');
      await page.keyboard.press('Escape');
      await page.evaluate(() => {
        document.getElementById('_d25544777196781').remove();
        const shell = document.createElement('div');
        shell.id = '_d39431720196649';
        shell.style.cssText = 'position:fixed;top:280px;left:40px;z-index:100;background:white;padding:20px';
        shell.innerHTML = '<div class="_d39431720196649_pp"><div class="extra _d39431720196649_pp__modal another"><div class="_d39431720196649_pp__info">Generated banner</div></div><div class="_d39431720196649_pp__modal-title">Do not hide suffix extensions</div></div>';
        document.body.prepend(shell);
      });
      await waitHidden('div._d39431720196649_pp__modal');
      assert.equal(await visible('div._d39431720196649_pp__info'), false);
      assert.equal(await visible('div._d39431720196649_pp__modal-title'), true);
      await page.evaluate(() => document.querySelector('div._d39431720196649_pp__modal').className = '_d39431720196649_pp__modal\tother');
      await waitHidden('div._d39431720196649_pp__modal');
      await send({ type: 'undo' });
      await waitVisible('div._d39431720196649_pp__modal');
      await page.evaluate(() => document.getElementById('_d39431720196649').remove());
    });
    await t.test('popup keeps its intrinsic width during Chrome autosizing', async () => {
      await control.setViewportSize({ width: 80, height: 600 });
      await control.reload();
      assert.equal((await control.locator('body').boundingBox()).width, 360);
      assert.equal((await control.locator('html').boundingBox()).width, 360);
      await control.setViewportSize({ width: 360, height: 600 });
    });
    for (const theme of ['light', 'dark']) {
      await t.test(`redesign: ${theme} popup states, sizing and keyboard controls`, async () => {
        await control.reload();
        await rpc({ type: 'reset' });
        await page.bringToFront();
        await control.emulateMedia({ colorScheme: theme });
        await control.setViewportSize({ width: 360, height: 600 });
        await control.reload();
        await control.locator('#pick').waitFor({ state: 'visible' });
        await control.waitForFunction(() => !document.querySelector('#pick').disabled);
        const size = await control.locator('body').boundingBox();
        assert.equal(size.width, 360);
        assert.ok(size.height <= 440, `Empty popup height: ${size.height}`);
        assert.equal(await control.evaluate(() => getComputedStyle(document.body).backgroundColor), theme === 'dark' ? 'rgb(23, 23, 23)' : 'rgb(255, 255, 255)');
        assert.equal(await control.locator('#undo').isDisabled(), true);
        await control.locator('body').screenshot({ path: join(root, `test-results/popup-${theme}-empty.png`) });
        await control.locator('#pick').focus();
        await control.keyboard.press('Tab');
        assert.equal(await control.locator('#remember').evaluate(el => el === document.activeElement), true);
        await control.keyboard.press('Space');
        assert.equal(await control.locator('#remember').isChecked(), false);
        await control.keyboard.press('Space');
        assert.equal(await control.locator('#remember').isChecked(), true);
        const previews = [];
        for (let i = 0; i < 2; i++) previews.push((await rpc({ type: 'add', selector: `#preview-${i}`, label: ['Aviso de publicidad', 'Vídeo flotante'][i] })).rule);
        // Capture both states in the reference screenshot: one rule applied, one switched off.
        await rpc({ type: 'toggle', id: previews[1].id, value: false });
        await control.reload();
        await control.waitForFunction(() => document.querySelector('#count').textContent === '2');
        await control.locator('body').screenshot({ path: join(root, `test-results/popup-${theme}.png`) });
        for (let i = 2; i < 10; i++) await rpc({ type: 'add', selector: `#preview-${i}`, label: 'Un elemento con una descripción muy larga que debe truncarse sin desplazar los controles de la lista' });
        await control.reload();
        await control.waitForFunction(() => document.querySelector('#count').textContent === '10');
        assert.ok((await control.locator('body').boundingBox()).height < 600);
        assert.equal(await control.locator('#rules').evaluate(el => el.scrollHeight > el.clientHeight), true);
        assert.equal(await control.evaluate(() => document.body.scrollWidth <= 360), true);
        await control.locator('body').screenshot({ path: join(root, `test-results/popup-${theme}-many.png`) });
        // Exercise the real error rendering after a failed extension API call.
        await control.evaluate(() => { chrome.runtime.sendMessage = async () => ({ ok: false, error: 'No se pudo guardar el cambio. Recarga la página y vuelve a intentarlo.' }); });
        await control.locator('#rules .delete').first().click();
        await control.locator('#status').waitFor({ state: 'visible' });
        await control.locator('body').screenshot({ path: join(root, `test-results/popup-${theme}-error.png`) });
        const errorHeight = (await control.locator('body').boundingBox()).height;
        assert.ok(errorHeight < 600, `Popup height with error: ${errorHeight}`);
        await control.reload();
        await rpc({ type: 'reset' });
      });
      await t.test(`redesign: ${theme} toolbar, structure warning and narrow windows`, async () => {
        await page.emulateMedia({ colorScheme: theme });
        await page.setViewportSize({ width: 1280, height: 900 });
        await start(false);
        await page.locator('#notice-link').hover();
        await page.keyboard.press('ArrowUp');
        const bar = page.locator('[data-click-and-get-out-ui]').locator('.bar');
        const target = bar.locator('.target');
        assert.match(await target.textContent(), /^Aviso ·/);
        assert.ok((await target.getAttribute('title')).includes('#notice'));
        assert.equal(await bar.locator('.warning').isVisible(), false);
        assert.equal((await bar.boundingBox()).width, 560);
        assert.ok((await bar.boundingBox()).height <= 112);
        await page.screenshot({ path: join(root, `test-results/selector-${theme}.png`) });
        await bar.screenshot({ path: join(root, `test-results/toolbar-${theme}.png`) });
        await page.locator('#article-one .picture').hover();
        await bar.locator('.warning').waitFor({ state: 'visible' });
        await bar.screenshot({ path: join(root, `test-results/toolbar-${theme}-warning.png`) });
        await bar.getByRole('button', { name: 'Ampliar', exact: true }).click();
        assert.match(await target.textContent(), /^Artículo ·/);
        // La barra va listando lo ocultado en esta visita y sigue al botón Deshacer.
        assert.equal(await bar.locator('.picks').isVisible(), false);
        await page.locator('#article-two').click({ position: { x: 10, y: 10 } });
        await waitHidden('#article-two');
        const picked = bar.locator('.picks-list li');
        await picked.first().waitFor({ state: 'visible' });
        assert.equal(await picked.count(), 1);
        assert.equal(await bar.locator('.picks-count').textContent(), '1');
        assert.match(await picked.first().textContent(), /^Más noticias del día.*Esta visita$/);
        await bar.screenshot({ path: join(root, `test-results/toolbar-${theme}-picks.png`) });
        await bar.getByRole('button', { name: 'Deshacer' }).click();
        await waitVisible('#article-two');
        await bar.locator('.picks').waitFor({ state: 'hidden' });
        await page.setViewportSize({ width: 320, height: 640 });
        const box = await bar.boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= 320);
        assert.equal(await bar.evaluate(el => el.scrollWidth <= el.clientWidth), true);
        await bar.screenshot({ path: join(root, `test-results/toolbar-${theme}-narrow.png`) });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        assert.equal(await bar.locator('button').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
        await bar.getByRole('button', { name: 'Terminar selección' }).focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('[data-click-and-get-out-ui]').count(), 0);
        await page.setViewportSize({ width: 1280, height: 900 });
      });
    }
    assert.deepEqual(errors, []);
  } finally {
    await context?.close();
    await new Promise(resolve => server.close(resolve));
    await rm(temp, { recursive: true, force: true });
  }
});
