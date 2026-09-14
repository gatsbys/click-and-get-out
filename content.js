(() => {
  if (globalThis.__clickAndGetOut) return;
  globalThis.__clickAndGetOut = true;
  const { safe, selectorFor } = globalThis.ClickAndGetOutSelectors;
  const storageKey = `site:${location.origin}`;
  let site = { rules: [], unlockScroll: false };
  let temporary = [];
  let temporaryUnlock = false;
  let undoStack = [];
  const hidden = new Map();
  const scrollStyles = new Map();
  let picker = null;
  let observer;
  let scheduled = false;
  const rpc = async data => {
    const result = await chrome.runtime.sendMessage({ channel: 'click-and-get-out', ...data });
    if (!result?.ok) throw new Error(result?.error || 'No se pudo guardar el cambio.');
    return result;
  };
  function saveProperty(el, name) {
    return { value: el.style.getPropertyValue(name), priority: el.style.getPropertyPriority(name) };
  }
  function restoreProperty(el, name, previous) {
    if (previous.value) el.style.setProperty(name, previous.value, previous.priority);
    else el.style.removeProperty(name);
  }
  function reconcile() {
    scheduled = false;
    const targets = new Set();
    for (const rule of [...site.rules, ...temporary]) {
      if (rule.enabled === false) continue;
      try {
        for (const el of document.querySelectorAll(rule.selector)) {
          if (safe(el) && el !== picker?.host && !el.contains(picker?.host)) targets.add(el);
        }
      } catch { /* Ignore selectors invalidated by a manual storage edit. */ }
    }
    for (const [el, original] of hidden) {
      if (!targets.has(el)) {
        if (el.style.getPropertyValue('display') === 'none' && el.style.getPropertyPriority('display') === 'important') restoreProperty(el, 'display', original);
        hidden.delete(el);
      }
    }
    for (const el of targets) {
      if (!hidden.has(el)) hidden.set(el, saveProperty(el, 'display'));
      if (el.style.getPropertyValue('display') !== 'none' || el.style.getPropertyPriority('display') !== 'important') el.style.setProperty('display', 'none', 'important');
    }
    const unlock = site.unlockScroll || temporaryUnlock;
    if (unlock) {
      for (const el of [document.documentElement, document.body].filter(Boolean)) {
        if (!scrollStyles.has(el)) scrollStyles.set(el, new Map(['overflow-x', 'overflow-y', 'position', 'height', 'max-height'].map(p => [p, saveProperty(el, p)])));
        const desired = { 'overflow-x': 'auto', 'overflow-y': 'auto', position: 'static', height: 'auto', 'max-height': 'none' };
        for (const [name, value] of Object.entries(desired)) {
          if (el.style.getPropertyValue(name) !== value || el.style.getPropertyPriority(name) !== 'important') el.style.setProperty(name, value, 'important');
        }
      }
    } else {
      for (const [el, properties] of scrollStyles) for (const [name, value] of properties) restoreProperty(el, name, value);
      scrollStyles.clear();
    }
  }
  const active = () => temporary.length > 0 || site.rules.some(rule => rule.enabled !== false);
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(reconcile, 40);
  }
  function observe() {
    observer = new MutationObserver(mutations => {
      if (mutations.some(m => m.target !== picker?.host) && (active() || site.unlockScroll || temporaryUnlock)) schedule();
    });
    observer.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['id', 'class', 'style', 'data-testid', 'data-test', 'aria-label'] });
  }
  async function undo() {
    const action = undoStack.at(-1);
    if (!action) return;
    if (action.persistent) await rpc(action.revert === 'disable' ? { type: 'toggle', id: action.id, value: false } : { type: 'remove', id: action.id });
    else temporary = temporary.filter(r => r.id !== action.id);
    undoStack.pop();
    if (action.persistent) site = (await rpc({ type: 'get' })).site;
    reconcile();
    picker?.refresh();
  }
  function stop() {
    if (!picker) return;
    const old = picker;
    picker = null;
    old.cleanup();
    old.host.remove();
    if (old.focus instanceof HTMLElement && old.focus.isConnected) old.focus.focus({ preventScroll: true });
  }
  function start(remember) {
    stop();
    const host = document.createElement('div');
    host.setAttribute('data-click-and-get-out-ui', '');
    host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important;display:block!important';
    const root = host.attachShadow({ mode: 'open' });
    const icon = name => {
      const paths = {
        up: '<path d="m6 14 6-6 6 6"/>',
        down: '<path d="m6 10 6 6 6-6"/>',
        undo: '<path d="m8 4-5 5 5 5M3 9h10a6 6 0 0 1 0 12"/>',
        close: '<path d="m6 6 12 12M6 18 18 6"/>',
        cursor: '<path d="m5 3 14 8-7 2-2 7-5-17Z"/>'
      };
      return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
    };
    root.innerHTML = `
      <style>
        :host{color-scheme:light dark;--surface:#fff;--glass:rgba(255,255,255,.94);--subtle:#f5f5f5;--hover:#ededed;--text:#171717;--muted:#666;--border:#e5e5e5;--accent:#0068d9;--warning:#8a4b00;--error:#b42318}
        @media(prefers-color-scheme:dark){:host{--surface:#171717;--glass:rgba(23,23,23,.94);--subtle:#202020;--hover:#2b2b2b;--text:#ededed;--muted:#a1a1a1;--border:#333;--accent:#52a8ff;--warning:#f3bc68;--error:#ffaaa3}}
        *{box-sizing:border-box}[hidden]{display:none!important}
        .outline{position:fixed;border:2px solid #0070f3;background:#0070f312;pointer-events:none;display:none;box-shadow:0 0 0 1px #fff,0 0 0 2px #0006}
        .bar{position:fixed;top:16px;left:50%;transform:translateX(-50%);width:560px;max-width:calc(100vw - 24px);max-height:calc(100vh - 32px);overflow:auto;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:12px;padding:12px;pointer-events:auto;box-shadow:0 4px 20px #00000014,0 1px 3px #0000000a;font:13px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:left;letter-spacing:normal}
        @supports(backdrop-filter:blur(12px)){.bar{background:var(--glass);backdrop-filter:blur(12px)}}
        .top{display:flex;align-items:center;gap:8px}.title{font-weight:600;letter-spacing:-.15px;min-width:0}.mode{font-size:11px;color:var(--muted);margin-left:auto;white-space:nowrap}.row{display:flex;align-items:center;gap:12px;margin-top:10px}.actions{display:flex;gap:4px;flex-shrink:0}
        svg{display:block;width:16px;height:16px;flex:0 0 auto;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
        button{font:inherit;font-size:12px;display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:30px;cursor:pointer;border:1px solid transparent;border-radius:8px;padding:5px 7px;background:transparent;color:var(--text);transition:background .12s,border-color .12s}button:hover:not(:disabled){background:var(--subtle);border-color:var(--border)}button:active:not(:disabled){background:var(--hover)}button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}button:disabled{opacity:.4;cursor:default}
        .close{border-color:var(--border);padding:4px 7px}.close svg{width:12px;height:12px}kbd{font:10px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--muted);border:1px solid var(--border);border-radius:4px;padding:1px 4px;white-space:nowrap}
        .target{font-size:12px;color:var(--muted);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-left:1px solid var(--border);padding-left:12px;flex:1}
        .hint,.warning{font-size:12px;margin:9px 0 0;overflow-wrap:anywhere}.hint{color:var(--muted)}.hint.error{color:var(--error)}.warning{color:var(--warning)}
        .picks{margin-top:10px;border-top:1px solid var(--border);padding-top:9px}
        .picks-top{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted)}
        .picks-count{border:1px solid var(--border);border-radius:4px;padding:0 4px;font-variant-numeric:tabular-nums}
        .picks-list{list-style:none;margin:6px 0 0;padding:0;max-height:84px;overflow:auto;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
        .picks-list li{display:flex;align-items:center;gap:8px;font-size:12px;padding:2px 0}
        .pick-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .pick-mode{font-size:10px;color:var(--muted);white-space:nowrap;flex-shrink:0}
        @media(max-width:520px){.row{flex-wrap:wrap;gap:8px}.target{flex-basis:100%;border-left:0;padding-left:0}.actions{flex:1}.actions button{flex:1}.mode{font-size:10px}.bar{top:8px;padding:10px}.close .close-label{display:none}}
        @media(max-width:340px){.top{flex-wrap:wrap}.mode{order:3;flex-basis:100%;margin-left:24px}.close{margin-left:auto}.actions{gap:2px}.actions button{padding:5px}.actions kbd{display:none}}
        @media(prefers-reduced-motion:reduce){*{transition:none!important}}
        @media(prefers-reduced-transparency:reduce){.bar{background:var(--surface);backdrop-filter:none}}
      </style>
      <div class="outline"></div>
      <section class="bar" role="dialog" aria-label="Selector de elementos">
        <div class="top">${icon('cursor')}<span class="title">Selecciona un elemento</span><span class="mode">${remember ? 'En esta web' : 'Solo esta visita'}</span><button data-action="close" class="close" aria-label="Terminar selección" aria-keyshortcuts="Escape" title="Terminar selección (Esc)">${icon('close')}<span class="close-label">Terminar</span><kbd aria-hidden="true">Esc</kbd></button></div>
        <div class="row">
          <div class="actions"><button data-action="parent" aria-keyshortcuts="ArrowUp" title="Ampliar al contenedor (flecha arriba)">${icon('up')}Ampliar<kbd aria-hidden="true">↑</kbd></button><button data-action="child" aria-keyshortcuts="ArrowDown" title="Volver al elemento anterior (flecha abajo)">${icon('down')}Reducir<kbd aria-hidden="true">↓</kbd></button><button data-action="undo">${icon('undo')}Deshacer</button></div>
          <div class="target" tabindex="0" title="Haz clic en un elemento o pulsa Enter para ocultarlo.">Señala y haz clic para ocultar</div>
        </div>
        <p class="warning" hidden>Esta selección depende de la estructura de la página.</p>
        <p class="hint" role="status" aria-live="polite" hidden></p>
        <div class="picks" role="group" aria-label="Elementos ocultos en esta visita" hidden>
          <div class="picks-top"><span>Ocultados en esta visita</span><span class="picks-count">0</span></div>
          <ul class="picks-list"></ul>
        </div>
      </section>`;
    (document.body || document.documentElement).append(host);
    const outline = root.querySelector('.outline');
    const hint = root.querySelector('.hint');
    const targetLabel = root.querySelector('.target');
    const warning = root.querySelector('.warning');
    const status = (text, error = false) => {
      hint.textContent = text;
      hint.hidden = !text;
      hint.classList.toggle('error', error);
    };
    const describe = el => {
      const kinds = { A: 'Enlace', IMG: 'Imagen', BUTTON: 'Botón', ASIDE: 'Aviso', NAV: 'Navegación', ARTICLE: 'Artículo', SECTION: 'Sección', IFRAME: 'Contenido incrustado' };
      const label = (el.getAttribute('aria-label') || el.getAttribute('alt') || el.innerText || el.localName).trim().replace(/\s+/g, ' ').slice(0, 80);
      return `${kinds[el.tagName] || 'Elemento'} · ${label}`;
    };
    const picks = root.querySelector('.picks');
    const picksList = root.querySelector('.picks-list');
    const picksCount = root.querySelector('.picks-count');
    // The list mirrors the undo stack: exactly what «Deshacer» can still revert.
    function renderPicks() {
      picks.hidden = !undoStack.length;
      picksCount.textContent = undoStack.length;
      picksList.replaceChildren();
      for (const action of [...undoStack].reverse()) {
        const li = document.createElement('li');
        const label = document.createElement('span');
        label.className = 'pick-label';
        label.textContent = action.label;
        label.title = action.label;
        const mode = document.createElement('span');
        mode.className = 'pick-mode';
        mode.textContent = action.persistent ? 'Guardado' : 'Esta visita';
        li.append(label, mode);
        picksList.append(li);
      }
    }
    const parentButton = root.querySelector('[data-action=parent]');
    const childButton = root.querySelector('[data-action=child]');
    const undoButton = root.querySelector('[data-action=undo]');
    let selected = null;
    let hovered = null;
    let children = [];
    let busy = false;
    const focus = document.activeElement;
    function paint() {
      if (!selected?.isConnected) selected = null;
      parentButton.disabled = !safe(selected?.parentElement);
      childButton.disabled = !children.length;
      undoButton.disabled = busy || !undoStack.length;
      if (!selected) {
        outline.style.display = 'none';
        warning.hidden = true;
        targetLabel.textContent = 'Señala y haz clic para ocultar';
        targetLabel.title = 'Haz clic en un elemento o pulsa Enter para ocultarlo.';
        targetLabel.removeAttribute('aria-description');
        return;
      }
      const rect = selected.getBoundingClientRect();
      Object.assign(outline.style, { display: 'block', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
      try {
        const result = selectorFor(selected);
        targetLabel.textContent = describe(selected);
        targetLabel.title = `${describe(selected)}\n${result.selector}`;
        targetLabel.setAttribute('aria-description', `Selector CSS: ${result.selector}`);
        warning.hidden = !result.fragile;
      } catch (error) { status(error.message, true); }
    }
    function parent() {
      if (safe(selected?.parentElement)) { children.push(selected); selected = selected.parentElement; paint(); }
    }
    function child() { if (children.length) { selected = children.pop(); paint(); } }
    function move(event) {
      if (busy || event.composedPath().includes(host)) return;
      const next = event.target;
      if (next === hovered) return;
      hovered = next;
      children = [];
      selected = safe(next) ? next : null;
      paint();
    }
    async function hideSelection() {
      if (!selected || busy) return;
      busy = true;
      paint();
      try {
        const info = selectorFor(selected);
        // innerText respeta el renderizado: separa bloques que en el HTML van pegados.
        const text = (selected.innerText || selected.textContent || '').trim().replace(/\s+/g, ' ');
        const label = (selected.getAttribute('aria-label') || text || selected.localName).slice(0, 100);
        if (remember) {
          const result = await rpc({ type: 'add', ...info, label });
          if (result.revert) undoStack.push({ id: result.rule.id, persistent: true, revert: result.revert, label: result.rule.label });
          site = (await rpc({ type: 'get' })).site;
        } else {
          const rule = { id: crypto.randomUUID(), ...info, label };
          temporary.push(rule);
          undoStack.push({ id: rule.id, persistent: false, label });
        }
        reconcile();
        renderPicks();
        selected = null;
        hovered = null;
        children = [];
        status(remember ? 'Elemento oculto. Guardado para próximas visitas.' : 'Elemento oculto hasta que recargues la página.');
      } catch (error) { status(error.message, true); }
      finally { busy = false; paint(); }
    }
    function intercept(event) {
      if (event.composedPath().includes(host)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.type === 'click') {
        if (!selected && safe(event.target)) selected = event.target;
        void hideSelection();
      }
    }
    function key(event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); stop(); return; }
      if (event.composedPath().includes(host)) return;
      if (['ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (event.key === 'ArrowUp') parent();
        if (event.key === 'ArrowDown') child();
        if (event.key === 'Enter') void hideSelection();
      }
    }
    root.addEventListener('click', async event => {
      const action = event.target.closest('button')?.dataset.action;
      if (action === 'close') stop();
      if (busy) return;
      if (action === 'parent') parent();
      if (action === 'child') child();
      if (action === 'undo') {
        busy = true;
        try { await undo(); status('Último elemento restaurado.'); }
        catch (error) { status(error.message, true); }
        finally { busy = false; paint(); }
      }
    });
    const pointerEvents = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'dblclick', 'contextmenu', 'auxclick'];
    document.addEventListener('pointermove', move, true);
    for (const name of pointerEvents) window.addEventListener(name, intercept, true);
    window.addEventListener('keydown', key, true);
    window.addEventListener('scroll', paint, true);
    window.addEventListener('resize', paint);
    picker = { host, focus, refresh: renderPicks, cleanup() {
      document.removeEventListener('pointermove', move, true);
      for (const name of pointerEvents) window.removeEventListener(name, intercept, true);
      window.removeEventListener('keydown', key, true);
      window.removeEventListener('scroll', paint, true);
      window.removeEventListener('resize', paint);
    } };
    renderPicks();
    paint();
  }
  const ready = chrome.storage.local.get(storageKey).then(data => {
    site = data[storageKey] || site;
    reconcile();
    observe();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[storageKey]) {
      site = changes[storageKey].newValue || { rules: [], unlockScroll: false };
      schedule();
    }
  });
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.channel !== 'click-and-get-out-tab' || sender.id !== chrome.runtime.id) return;
    (async () => {
      await ready;
      switch (message.type) {
        case 'start': start(Boolean(message.remember)); break;
        case 'undo': await undo(); break;
        case 'reset': temporary = []; temporaryUnlock = false; undoStack = []; stop(); site = (await rpc({ type: 'get' })).site; reconcile(); break;
        case 'unlock': temporaryUnlock = Boolean(message.value); reconcile(); break;
        case 'status': break;
        default: throw new Error('Acción desconocida.');
      }
      return { temporaryCount: temporary.length, canUndo: undoStack.length > 0, temporaryUnlock };
    })().then(result => respond({ ok: true, ...result }), error => respond({ ok: false, error: error.message }));
    return true;
  });
})();
