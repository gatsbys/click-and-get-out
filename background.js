const emptySite = () => ({ rules: [], unlockScroll: false });
const keyFor = origin => `site:${origin}`;
function webOrigin(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Abre una página web http o https.');
  return url.origin;
}
function matchFor(origin) {
  const url = new URL(origin);
  return `${url.protocol}//${url.hostname}/*`;
}
const scriptId = origin => `site-${Array.from(origin, c => c.charCodeAt(0).toString(16)).join('-')}`;
async function readSite(origin) {
  return (await chrome.storage.local.get(keyFor(origin)))[keyFor(origin)] || emptySite();
}
function badgeFor(site) {
  const count = site.rules.filter(rule => rule.enabled !== false).length;
  if (!count && !site.unlockScroll) return { text: '', title: 'Click and get out' };
  const detail = [count && `${count} ${count === 1 ? 'elemento oculto' : 'elementos ocultos'}`, site.unlockScroll && 'desplazamiento recuperado'].filter(Boolean);
  return { text: count ? String(count) : '\u2022', title: `Click and get out \u00b7 ${detail.join(' y ')} en esta web` };
}
// Chrome solo revela tab.url donde el sitio ha concedido acceso, que es justo donde
// pueden aplicarse reglas. En el resto la marca queda vacía sin pedir el permiso «tabs».
async function paint(tab) {
  let badge = { text: '', title: 'Click and get out' };
  try { if (tab.url) badge = badgeFor(await readSite(webOrigin(tab.url))); } catch { /* No es una página web. */ }
  try {
    await chrome.action.setBadgeText({ tabId: tab.id, text: badge.text });
    await chrome.action.setTitle({ tabId: tab.id, title: badge.title });
  } catch { /* La pestaña se cerró mientras se pintaba. */ }
}
const paintAll = async () => { for (const tab of await chrome.tabs.query({})) await paint(tab); };
async function register(origin) {
  const matches = [matchFor(origin)];
  if (!await chrome.permissions.contains({ origins: matches })) throw new Error('Activa «Recordar en esta web» y concede el permiso del sitio.');
  const id = scriptId(origin);
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [id] });
  if (!existing.length) await chrome.scripting.registerContentScripts([{
    id, matches, js: ['selectors.js', 'content.js'], runAt: 'document_start', persistAcrossSessions: true
  }]);
}
async function handle(message, sender) {
  if (sender.id !== chrome.runtime.id) throw new Error('Origen no permitido.');
  const fromPage = !sender.url?.startsWith(chrome.runtime.getURL(''));
  const origin = webOrigin(fromPage ? sender.url : message.origin);
  const site = await readSite(origin);
  switch (message.type) {
    case 'get': return { site };
    case 'enable':
      if (fromPage) throw new Error('Acción solo disponible en el menú.');
      await register(origin);
      return { site };
    case 'add': {
      if (typeof message.selector !== 'string' || message.selector.length > 3000 || !message.selector.trim()) throw new Error('Selector no válido.');
      await register(origin);
      let rule = site.rules.find(r => r.selector === message.selector);
      // What «Deshacer» has to undo later: a brand new rule, or one that was disabled.
      let revert = null;
      if (!rule) {
        if (site.rules.length >= 200) throw new Error('Máximo de 200 bloques por web. Restaura algunos antes de continuar.');
        rule = { id: crypto.randomUUID(), selector: message.selector, label: String(message.label || 'Bloque').slice(0, 100), fragile: Boolean(message.fragile), enabled: true, createdAt: Date.now() };
        site.rules.push(rule);
        revert = 'remove';
      } else if (rule.enabled === false) {
        rule.enabled = true;
        revert = 'disable';
      }
      if (revert) await chrome.storage.local.set({ [keyFor(origin)]: site });
      return { rule, revert };
    }
    case 'toggle': {
      const rule = site.rules.find(r => r.id === message.id);
      if (!rule) throw new Error('Esa regla ya no existe. Vuelve a abrir el menú.');
      rule.enabled = Boolean(message.value);
      break;
    }
    case 'remove':
      site.rules = site.rules.filter(r => r.id !== message.id);
      break;
    case 'unlock':
      await register(origin);
      site.unlockScroll = Boolean(message.value);
      break;
    case 'reset':
      site.rules = [];
      site.unlockScroll = false;
      break;
    default: throw new Error('Acción desconocida.');
  }
  await chrome.storage.local.set({ [keyFor(origin)]: site });
  return { site };
}
// A worker can receive writes from several tabs at once. Keep read/modify/write atomic.
let queue = Promise.resolve();
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.channel !== 'click-and-get-out') return;
  queue = queue.then(() => handle(message, sender));
  queue.then(result => respond({ ok: true, ...result }), error => respond({ ok: false, error: error.message }));
  queue = queue.catch(() => {});
  return true;
});
chrome.permissions.onRemoved.addListener(() => {
  queue = queue.then(async () => {
    for (const script of await chrome.scripting.getRegisteredContentScripts()) {
      if (!await chrome.permissions.contains({ origins: script.matches })) {
        await chrome.scripting.unregisterContentScripts({ ids: [script.id] });
      }
    }
    await paintAll();
  }).catch(console.error);
});
chrome.tabs.onUpdated.addListener((tabId, change, tab) => { if (change.status || change.url) void paint(tab); });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && Object.keys(changes).some(key => key.startsWith('site:'))) void paintAll();
});
// El color y las marcas por pestaña se pierden al reiniciar el navegador o el worker.
chrome.action.setBadgeBackgroundColor({ color: '#16a34a' });
void paintAll();
