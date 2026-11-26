/* Мини-рантайм макетов AURA: рендерит <x-dc> с {{ }}, <sc-if>, <sc-for> и обработчиками из класса Component. Только для просмотра макетов. */
(function () {
  class DCLogic {
    constructor(p) { this.props = p || {}; this.state = {}; }
    setState(o) { Object.assign(this.state, typeof o === 'function' ? o(this.state) : o); render(); }
    forceUpdate() { render(); }
  }
  const root = document.querySelector('x-dc');
  if (!root) return;
  root.style.display = 'block';
  const helmet = root.querySelector('helmet');
  if (helmet) { Array.from(helmet.children).forEach((c) => document.head.appendChild(c)); helmet.remove(); }
  const tpl = document.createElement('template');
  tpl.innerHTML = root.innerHTML;
  root.innerHTML = '';
  const sc = document.querySelector('script[data-dc-script]');
  const props = {};
  try {
    const dp = JSON.parse(sc.getAttribute('data-props') || '{}');
    Object.keys(dp).forEach((k) => { if (k[0] !== '$' && dp[k] && 'default' in dp[k]) props[k] = dp[k].default; });
  } catch (e) { /* без настроек */ }
  const Comp = new Function('DCLogic', sc.textContent + '\n;return Component;')(DCLogic);
  const inst = new Comp(props);
  inst.props = props;
  const get = (scope, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), scope);
  const HOLE = /\{\{\s*([\w.$]+)\s*\}\}/g;
  const WHOLE = /^\s*\{\{\s*([\w.$]+)\s*\}\}\s*$/;
  const interp = (s, scope) => s.replace(HOLE, (m, p) => { const v = get(scope, p); return v == null ? '' : String(v); });
  function walk(node, scope, out) {
    if (node.nodeType === 3) { out.appendChild(document.createTextNode(interp(node.textContent, scope))); return; }
    if (node.nodeType !== 1) return;
    const tag = node.localName;
    if (tag === 'sc-if') {
      const m = WHOLE.exec(node.getAttribute('value') || '');
      if (m && get(scope, m[1])) Array.from(node.childNodes).forEach((c) => walk(c, scope, out));
      return;
    }
    if (tag === 'sc-for') {
      const m = WHOLE.exec(node.getAttribute('list') || '');
      const list = (m ? get(scope, m[1]) : []) || [];
      const as = node.getAttribute('as') || 'item';
      list.forEach((it, i) => { const s = Object.create(scope); s[as] = it; s.$index = i; Array.from(node.childNodes).forEach((c) => walk(c, s, out)); });
      return;
    }
    const el = document.createElementNS(node.namespaceURI, tag);
    Array.from(node.attributes).forEach((a) => {
      const m = WHOLE.exec(a.value);
      if (a.name.startsWith('on') && m) {
        const fn = get(scope, m[1]);
        if (typeof fn === 'function') {
          const ev = a.name.slice(2).toLowerCase();
          el.addEventListener(ev === 'change' ? 'input' : ev, fn);
        }
        return;
      }
      if (a.name.startsWith('hint-')) return;
      const v = interp(a.value, scope);
      el.setAttribute(a.name, v);
      if (a.name === 'value' && 'value' in el) el.value = v;
    });
    Array.from(node.childNodes).forEach((c) => walk(c, scope, el));
    out.appendChild(el);
  }
  function render() {
    const act = document.activeElement;
    const inputs = Array.from(root.querySelectorAll('input'));
    const idx = inputs.indexOf(act);
    const sel = idx >= 0 ? act.selectionStart : null;
    const vals = inst.renderVals();
    const frag = document.createDocumentFragment();
    Array.from(tpl.content.childNodes).forEach((c) => walk(c, vals, frag));
    root.innerHTML = '';
    root.appendChild(frag);
    if (idx >= 0) { const n = root.querySelectorAll('input')[idx]; if (n) { n.focus(); try { n.setSelectionRange(sel, sel); } catch (e) { /* */ } } }
  }
  render();
})();
