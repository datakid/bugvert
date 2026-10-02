window.UI = (() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const P = {
upload: '<path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
clipboard: '<rect x="6" y="4" width="12" height="17" rx="2.5"/><path d="M9 4.5V3.8A1 1 0 0 1 10 3h4a1 1 0 0 1 1 .8v.7"/>',
sheet: '<rect x="3.5" y="4" width="17" height="16" rx="3"/><path d="M3.5 9.5h17M9.5 9.5V20"/>',
units: '<circle cx="8" cy="8" r="3.5"/><circle cx="16" cy="16" r="3.5"/><path d="M14 6h4v4M10 18H6v-4"/>',
dups: '<rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
columns: '<rect x="3.5" y="4" width="17" height="16" rx="3"/><path d="M9.2 4v16M14.8 4v16"/>',
export: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 19h14"/>',
settings: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
import: '<path d="M4 12h11M11 8l4 4-4 4"/><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/>',
search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
x: '<path d="M6 6l12 12M18 6L6 18"/>',
check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
chevron: '<path d="M7 10l5 5 5-5"/>',
right: '<path d="M10 7l5 5-5 5"/>',
undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
sortUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
sortDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 6.1A9.7 9.7 0 0 1 12 6c5 0 9 6 9 6a16 16 0 0 1-2.8 3.3M6.5 7.6C4.4 9.1 3 12 3 12s4 6 9 6a8.6 8.6 0 0 0 3.8-.9"/>',
eye: '<path d="M3 12s4-6 9-6 9 6 9 6-4 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.5"/>',
plus: '<path d="M12 5v14M5 12h14"/>',
minus: '<path d="M5 12h14"/>',
merge: '<path d="M6 4v4a4 4 0 0 0 4 4h4a4 4 0 0 1 4 4v4"/><path d="M18 4v4a4 4 0 0 1-4 4"/><path d="M15 17l3 3 3-3"/>',
split: '<path d="M12 20v-7M12 13L6 4M12 13l6-9"/>',
spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>',
trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>',
grip: '<circle cx="9" cy="7" r="1"/><circle cx="15" cy="7" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="17" r="1"/><circle cx="15" cy="17" r="1"/>',
copy: '<rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
dot: '<circle cx="12" cy="12" r="3"/>',
brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h0V4z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3h0V4z"/>',
edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
more: '<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>',
info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.5"/>',
layers: '<path d="M12 4l8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4M4 16l8 4 8-4"/>',
sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
monitor: '<rect x="3" y="4.5" width="18" height="12" rx="2.5"/><path d="M9 20h6M12 16.5V20"/>'
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

let toastTimer;
function toast(msg, opts = {}) {
const t = $('#toast');
t.innerHTML = `<span class="toast-ic ${opts.tone || ''}">${icon(opts.icon || 'check')}</span><span class="toast-msg">${esc(msg)}</span>` + (opts.action ? `<button class="toast-act">${esc(opts.action.label)}</button>` : '');
t.classList.add('show');
if (opts.action) $('.toast-act', t).onclick = () => { opts.action.run(); t.classList.remove('show'); };
clearTimeout(toastTimer);
toastTimer = setTimeout(() => t.classList.remove('show'), opts.action ? 5000 : 2200);
}

const pops = [];
function closeFrom(idx) {
while (pops.length > idx) {
const p = pops.pop();
p.el.classList.remove('open');
p.anchor && p.anchor.classList.remove('is-open');
p.onClose && p.onClose();
p.el.remove();
}
}
function closePop() { closeFrom(0); }
function closeTop() { closeFrom(pops.length - 1); }
function popover(anchor, html, opts = {}) {
const existing = pops.findIndex(p => p.anchor === anchor);
if (existing >= 0 && !opts.force) { closeFrom(existing); return null; }
const parent = pops.findIndex(p => p.el.contains(anchor));
closeFrom(parent + 1);
const el = document.createElement('div');
el.className = 'pop ' + (opts.cls || '');
el.innerHTML = html;
document.body.appendChild(el);
const place = () => {
const r = anchor.getBoundingClientRect();
const w = el.offsetWidth, h = el.offsetHeight;
let x = opts.align === 'end' ? r.right - w : r.left;
x = Math.max(10, Math.min(x, innerWidth - w - 10));
let y = r.bottom + 8;
if (y + h > innerHeight - 10 && r.top - h - 8 > 10) { y = r.top - h - 8; el.classList.add('up'); }
el.style.left = x + 'px'; el.style.top = Math.max(10, y) + 'px';
};
place();
void el.offsetWidth;
el.classList.add('open');
anchor.classList.add('is-open');
pops.push({el, anchor, onClose: opts.onClose, place});
const f = $('[autofocus]', el); if (f) setTimeout(() => { f.focus(); f.select && f.select(); }, 30);
return el;
}
document.addEventListener('pointerdown', e => {
if (!pops.length || e.target.closest('.modal')) return;
let keep = -1;
pops.forEach((p, i) => { if (p.el.contains(e.target) || p.anchor.contains(e.target)) keep = i; });
closeFrom(keep + 1);
}, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && pops.length) { closeTop(); e.stopPropagation(); e.preventDefault(); } }, true);
addEventListener('resize', () => pops.forEach(p => document.body.contains(p.anchor) ? p.place() : null));
document.addEventListener('scroll', e => { if (pops.length && !pops.some(p => p.el.contains(e.target))) closePop(); }, true);

function menu(anchor, items, opts = {}) {
const html = `<div class="menu" role="menu">` + items.map((it, i) => it === '-' ? '<div class="menu-sep"></div>' : it.head ? `<div class="menu-head">${esc(it.head)}</div>` :
`<button class="menu-item ${it.active ? 'active' : ''} ${it.danger ? 'danger' : ''}" data-i="${i}" role="menuitem" ${it.disabled ? 'disabled' : ''}>${it.icon ? icon(it.icon) : '<span class="ic"></span>'}<span class="mi-label">${esc(it.label)}${it.hint ? `<small>${esc(it.hint)}</small>` : ''}</span>${it.active ? icon('check', 'mi-check') : it.kbd ? `<kbd>${esc(it.kbd)}</kbd>` : ''}</button>`).join('') + '</div>';
const el = popover(anchor, html, opts);
if (!el) return;
el.addEventListener('click', e => {
const b = e.target.closest('.menu-item'); if (!b) return;
const it = items[+b.dataset.i];
const idx = pops.findIndex(p => p.el === el);
closeFrom(idx < 0 ? 0 : idx);
it.run && it.run();
});
}

function select(el, {options, value, onChange, placeholder}) {
const cur = options.find(o => String(o.value) === String(value));
el.classList.add('sel');
el.type = 'button';
el.innerHTML = `<span class="sel-val">${cur ? esc(cur.label) : `<em>${esc(placeholder || 'Choose')}</em>`}</span>${icon('chevron', 'sel-chev')}`;
el.onclick = () => menu(el, options.map(o => o.head ? o : {label: o.label, hint: o.hint, icon: o.icon, active: String(o.value) === String(value), run: () => onChange(o.value)}), {cls: 'pop-sel'});
}

function seg(el, {options, value, onChange}) {
el.classList.add('seg');
el.innerHTML = options.map(o => `<button type="button" class="seg-b ${String(o.value) === String(value) ? 'on' : ''}" data-v="${esc(o.value)}" ${o.title ? `title="${esc(o.title)}"` : ''}>${o.icon ? icon(o.icon) : ''}<span>${esc(o.label)}</span>${o.count != null ? `<b>${o.count}</b>` : ''}</button>`).join('');
el.onclick = e => { const b = e.target.closest('.seg-b'); if (!b || b.classList.contains('on')) return; const o = options.find(x => String(x.value) === b.dataset.v); $$('.seg-b', el).forEach(x => x.classList.toggle('on', x === b)); onChange(o.value); };
}

function sw(on, attrs = '') { return `<button type="button" class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" ${attrs}><span></span></button>`; }

function stepper(el, {value, min = 0, max = 9999, step = 1, onChange, suffix = ''}) {
el.classList.add('stepper');
el.innerHTML = `<button type="button" class="st-b" data-d="-1" aria-label="Decrease">${icon('minus')}</button><input type="text" inputmode="decimal" value="${esc(value)}" aria-label="Value"><span class="st-suf">${esc(suffix)}</span><button type="button" class="st-b" data-d="1" aria-label="Increase">${icon('plus')}</button>`;
const inp = $('input', el);
const set = v => { v = Math.min(max, Math.max(min, v)); v = +(+v).toFixed(6); inp.value = v; if (v !== value) { value = v; onChange(v); } };
el.onclick = e => { const b = e.target.closest('.st-b'); if (b) set((Engine.parseNum(inp.value) ?? value) + step * +b.dataset.d); };
inp.onchange = () => { const n = Engine.parseNum(inp.value); n == null ? inp.value = value : set(n); };
inp.onkeydown = e => { if (e.key === 'Enter') inp.blur(); if (e.key === 'ArrowUp') { e.preventDefault(); set(value + step); } if (e.key === 'ArrowDown') { e.preventDefault(); set(value - step); } };
}

function confirm({title, body, ok = 'Confirm', cancel = 'Cancel', danger = false}) {
return new Promise(res => {
closePop();
const m = document.createElement('div');
m.className = 'modal';
m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="mt"><div class="modal-ic ${danger ? 'danger' : ''}">${icon(danger ? 'alert' : 'info')}</div><h3 id="mt">${esc(title)}</h3><p>${esc(body)}</p><div class="modal-actions"><button class="btn ghost" data-r="0">${esc(cancel)}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-r="1">${esc(ok)}</button></div></div>`;
document.body.appendChild(m);
void m.offsetWidth;
m.classList.add('open');
const done = v => { m.classList.remove('open'); setTimeout(() => m.remove(), 160); document.removeEventListener('keydown', key, true); res(v); };
const key = e => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } if (e.key === 'Enter') { e.preventDefault(); done(true); } };
document.addEventListener('keydown', key, true);
m.onclick = e => { if (e.target === m) done(false); const b = e.target.closest('[data-r]'); if (b) done(b.dataset.r === '1'); };
setTimeout(() => $('[data-r="1"]', m).focus(), 40);
});
}

const fmt = (v, d = 4) => {
if (v == null || v === '') return '';
if (typeof v !== 'number') return String(v);
return v.toLocaleString('en-US', {maximumFractionDigits: d});
};

return {$, $$, esc, icon, toast, popover, closePop, closeTop, menu, select, seg, sw, stepper, confirm, fmt, pops};
})();
