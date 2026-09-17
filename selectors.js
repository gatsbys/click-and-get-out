(() => {
  // selectors.js also gets loaded outside the extension (the screenshot script asks it
  // for selectors from the page's own world), where chrome.i18n does not exist.
  const t = key => globalThis.chrome?.i18n?.getMessage(key) || key;
  const forbidden = new Set(['HTML', 'BODY', 'HEAD', 'SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE']);
  const safe = el => el instanceof Element && !forbidden.has(el.tagName) && el.getRootNode() === document;
  const unique = (selector, el) => {
    try {
      const matches = document.querySelectorAll(selector);
      return matches.length === 1 && matches[0] === el;
    } catch { return false; }
  };
  const stable = value => value.length < 100 && !/[0-9]{5,}|[a-f0-9]{12,}/i.test(value);
  function anchor(el) {
    if (el.id && stable(el.id)) {
      const selector = `#${CSS.escape(el.id)}`;
      if (unique(selector, el)) return selector;
    }
    for (const name of ['data-testid', 'data-test', 'aria-label']) {
      const value = el.getAttribute(name);
      if (value && stable(value)) {
        const selector = `${el.localName}[${name}="${CSS.escape(value)}"]`;
        if (unique(selector, el)) return selector;
      }
    }
    const classes = [...el.classList].filter(stable).slice(0, 4);
    for (let count = 1; count <= classes.length; count++) {
      const selector = el.localName + classes.slice(0, count).map(c => `.${CSS.escape(c)}`).join('');
      if (unique(selector, el)) return selector;
    }
    // Some widgets regenerate a numeric namespace on every load, but keep the
    // semantic part of each class (e.g. _d123456789_pp__modal). Match that stable
    // suffix at a class-token boundary instead of falling back to body position.
    for (const token of el.classList) {
      const suffix = token.match(/^_[a-z]\d{6,}(_[a-z][a-z0-9_-]{3,})$/i)?.[1];
      if (!suffix || !stable(suffix)) continue;
      const end = `[class$="${CSS.escape(suffix)}"]`;
      const boundaries = [' ', '\t', '\n', '\r', '\f'].map(space => `[class*="${CSS.escape(suffix + space)}"]`);
      const selector = `${el.localName}:is(${[end, ...boundaries].join(',')})`;
      if (unique(selector, el)) return selector;
    }
    return null;
  }
  function selectorFor(el) {
    if (!safe(el)) throw new Error(t('errWholePage'));
    const direct = anchor(el);
    if (direct) return { selector: direct, fragile: false };
    const parts = [];
    for (let node = el; safe(node); node = node.parentElement) {
      if (node !== el) {
        const prefix = anchor(node);
        if (prefix) return { selector: `${prefix} > ${parts.join(' > ')}`, fragile: true };
      }
      const siblings = [...node.parentElement.children].filter(s => s.localName === node.localName);
      parts.unshift(`${node.localName}:nth-of-type(${siblings.indexOf(node) + 1})`);
    }
    const selector = `body > ${parts.join(' > ')}`;
    if (!unique(selector, el)) throw new Error(t('errNoSelector'));
    return { selector, fragile: true };
  }
  globalThis.ClickAndGetOutSelectors = { safe, selectorFor };
})();
