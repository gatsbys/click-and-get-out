const $ = id => document.getElementById(id);
let tab;
let origin;
let site = { rules: [], unlockScroll: false };
let tabStatus = { temporaryCount: 0, canUndo: false, temporaryUnlock: false };
let busy = false;
// Una única concesión que cubre cualquier sitio: evita el diálogo en cada web nueva.
const everySite = ['http://*/*', 'https://*/*'];
let allSites = false;
const readAllSites = () => chrome.permissions.contains({ origins: everySite });
const showError = error => {
  $('status').textContent = error.message || String(error);
  document.body.classList.add('has-error');
};
async function rpc(data) {
  const result = await chrome.runtime.sendMessage({ channel: 'click-and-get-out', origin, ...data });
  if (!result?.ok) throw new Error(result?.error || 'No se pudo completar la acción.');
  return result;
}
async function page(data, inject = true) {
  if (inject) await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['selectors.js', 'content.js'] });
  const result = await chrome.tabs.sendMessage(tab.id, { channel: 'click-and-get-out-tab', ...data }, { frameId: 0 });
  if (!result?.ok) throw new Error(result?.error || 'La página no responde. Recárgala y prueba de nuevo.');
  return result;
}
function render() {
  $('count').textContent = site.rules.length;
  $('empty').hidden = site.rules.length > 0;
  $('rules').replaceChildren();
  for (const rule of site.rules) {
    // Rules saved before disabling existed have no flag: they count as active.
    const enabled = rule.enabled !== false;
    const li = $('rule-template').content.firstElementChild.cloneNode(true);
    li.classList.toggle('off', !enabled);
    const label = li.querySelector('.label');
    label.textContent = rule.label;
    label.title = rule.selector + (rule.fragile ? ' (Depende de la estructura de la página)' : '');
    const toggle = li.querySelector('.toggle');
    toggle.checked = enabled;
    toggle.disabled = busy;
    toggle.setAttribute('aria-label', `Ocultar ${rule.label}`);
    toggle.title = enabled ? 'Se está ocultando. Desactívalo para volver a verlo sin borrar la regla.' : 'Desactivado: el elemento se ve. Actívalo para volver a ocultarlo.';
    toggle.addEventListener('change', () => run(async () => { await rpc({ type: 'toggle', id: rule.id, value: toggle.checked }); await refresh(); }));
    const remove = li.querySelector('.delete');
    remove.setAttribute('aria-label', `Eliminar ${rule.label}`);
    remove.title = 'Eliminar esta regla de la web';
    remove.disabled = busy;
    remove.addEventListener('click', () => run(async () => { await rpc({ type: 'remove', id: rule.id }); await refresh(); }));
    $('rules').append(li);
  }
  $('pick').disabled = busy || !origin;
  $('remember').disabled = busy || !origin;
  $('unlock').disabled = busy || !origin;
  $('unlock').checked = site.unlockScroll || tabStatus.temporaryUnlock;
  // No depende del origen: puede concederse incluso desde una pestaña no compatible.
  $('grant-text').textContent = allSites ? 'Permiso concedido en todas las webs.' : 'Se pedirá permiso en cada web nueva.';
  $('grant-toggle').textContent = allSites ? 'Quitar' : 'Permitir en todas';
  $('grant-toggle').disabled = busy;
  $('undo').disabled = busy || !tabStatus.canUndo;
  $('reset').disabled = busy || !(site.rules.length || tabStatus.temporaryCount || site.unlockScroll || tabStatus.temporaryUnlock);
  $('temporary').hidden = !tabStatus.temporaryCount;
  $('temporary').textContent = `${tabStatus.temporaryCount} ${tabStatus.temporaryCount === 1 ? 'elemento oculto' : 'elementos ocultos'} solo en esta visita.`;
}
async function refresh() {
  site = (await rpc({ type: 'get' })).site;
  try { tabStatus = await page({ type: 'status' }, false); } catch { /* No content script yet. */ }
  render();
}
async function run(action) {
  if (busy) return;
  busy = true;
  $('status').textContent = '';
  document.body.classList.remove('has-error');
  // Start synchronously: permissions.request must retain the user's click gesture.
  try { const pending = action(); render(); await pending; }
  catch (error) { showError(error); }
  finally { busy = false; render(); }
}
async function permit() {
  const url = new URL(origin);
  const granted = await chrome.permissions.request({ origins: [`${url.protocol}//${url.hostname}/*`] });
  if (!granted) throw new Error('Permiso no concedido. Desmarca «Recordar en esta web» para usar el modo temporal.');
  await rpc({ type: 'enable' });
}
$('pick').addEventListener('click', () => run(async () => {
  const remember = $('remember').checked;
  if (remember) await permit();
  await page({ type: 'start', remember });
  window.close();
}));
$('grant-toggle').addEventListener('click', () => {
  const grant = !allSites;
  void run(async () => {
    // Start synchronously: permissions.request must retain the user's click gesture.
    const pending = grant ? chrome.permissions.request({ origins: everySite }) : chrome.permissions.remove({ origins: everySite });
    const changed = await pending;
    allSites = await readAllSites();
    if (!changed) throw new Error(grant ? 'Permiso no concedido. Se seguirá pidiendo en cada web.' : 'Chrome no ha retirado el permiso. Puedes hacerlo en Detalles → Acceso al sitio.');
  });
});
$('undo').addEventListener('click', () => run(async () => { await page({ type: 'undo' }); await refresh(); }));
$('reset').addEventListener('click', () => run(async () => {
  await rpc({ type: 'reset' });
  await page({ type: 'reset' });
  await refresh();
}));
$('unlock').addEventListener('change', () => {
  const value = $('unlock').checked;
  const remember = $('remember').checked;
  void run(async () => {
    if (value && remember) await permit();
    if (remember || site.unlockScroll) await rpc({ type: 'unlock', value });
    await page({ type: 'unlock', value: value && !remember });
    await refresh();
  });
});
(async () => {
  try {
    allSites = await readAllSites();
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    if (!['https:', 'http:'].includes(url.protocol) || url.hostname === 'chromewebstore.google.com' || (url.hostname === 'chrome.google.com' && url.pathname.startsWith('/webstore'))) throw new Error('Abre una web normal. Chrome no permite modificar sus páginas internas ni la tienda de extensiones.');
    origin = url.origin;
    $('site').textContent = url.hostname;
    await refresh();
  } catch (error) { origin = null; $('site').textContent = 'Página no compatible'; showError(error); }
  render();
})();
