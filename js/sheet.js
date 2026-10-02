(() => {
const {$, $$, esc, icon, toast, menu, popover, closePop, select, stepper, confirm, fmt} = UI;
const E = Engine, ST = Store, st = Store.st, A = App;
const V = {rows: [], cols: [], widths: new Map(), active: null, edit: null, showOld: true, last: null, main: null, raf: 0};
const QUICK = [
{v: 'all', l: 'All rows'}, {v: 'issues', l: 'Needs a look', tone: 'warn'}, {v: 'converted', l: 'Converted'},
{v: 'kept', l: 'Unchanged'}, {v: 'custom', l: 'Edited'}, {v: 'dups', l: 'Duplicates'}, {v: 'excluded', l: 'Excluded'}
];
const OPS = {
empty: 'is empty', filled: 'is not empty', zero: '= 0', nonzero: '≠ 0', eq: '=', neq: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤',
contains: 'contains', ncontains: "doesn't contain", in: 'is one of', nin: 'is not'
};
const NEEDS_VAL = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'ncontains']);
const rowH = () => st.S.density === 'compact' ? 34 : 44;
A.sheetView = V;

function width(key) {
if (V.widths.has(key)) return V.widths.get(key);
const m = A.colMeta(key);
let w;
if (key === 'new.name' || m.role === 'name') w = 300;
else if (key === 'new.unit') w = 160;
else if (m.role === 'unit') w = 120;
else if (key === 'new.price' || key === 'new.qty') w = 150;
else if (m.num) w = 124;
else {
let tot = 0, n = 0;
for (const r of st.src.rows) { const v = E.clean(r[m.i]); if (v) { tot += Math.min(v.length, 40); n++; } if (n > 120) break; }
w = Math.max(110, Math.min(280, Math.max((n ? tot / n : 6) * 7.6, m.label.length * 7.6) + 46));
}
V.widths.set(key, Math.round(w));
return V.widths.get(key);
}
ST.on(w => { if (w === 'open') V.widths.clear(); });

function computeRows() {
const r = ST.res();
const cols = A.visibleCols();
V.cols = cols.map(c => ({...c, m: A.colMeta(c.key), label: A.colLabel(c)}));
const list = E.viewItems(r, st.view, cols, st.S);
const rows = [];
list.forEach(it => {
rows.push({it});
if (it.kind === 'merged' && st.expanded.has(it.id)) it.members.forEach((m, i) => rows.push({it: m, member: true, parent: it, lastMember: i === it.members.length - 1}));
});
V.rows = rows;
const ids = new Set(r.items.map(i => i.id));
[...st.sel].forEach(id => { if (!ids.has(id)) st.sel.delete(id); });
}

const template = () => '48px 46px ' + V.cols.map(c => width(c.key) + 'px').join(' ') + ' 52px';
const totalW = () => 48 + 46 + 52 + V.cols.reduce((a, c) => a + width(c.key), 0);

A.views.sheet = {
render(main) {
V.main = main;
main.innerHTML = `
<section class="sheet">
<div class="sheet-bar">
<div class="quick" id="quick" role="tablist" aria-label="Row filter"></div>
<div class="sb-tools">
<label class="search">${icon('search')}<input id="sheet-search" placeholder="Search" value="${esc(st.view.search)}" aria-label="Search rows"><button class="search-x ${st.view.search ? '' : 'hidden'}" id="search-x" aria-label="Clear search">${icon('x')}</button></label>
<button class="btn ghost icon-only ${V.showOld ? 'on' : ''}" id="old-toggle" title="Show old values next to new ones">${icon(V.showOld ? 'eye' : 'eyeOff')}</button>
<button class="btn ghost icon-only" id="sheet-more" title="More">${icon('more')}</button>
</div>
</div>
<div class="sub-bar" id="sub-bar"></div>
<div class="grid" id="grid">
<div class="grid-scroll" id="grid-scroll" tabindex="0" aria-label="Data sheet">
<div class="grid-head" id="grid-head"></div>
<div class="grid-body" id="grid-body"></div>
<div class="grid-empty hidden" id="grid-empty"></div>
</div>
</div>
<div class="bulk" id="bulk" aria-live="polite"></div>
</section>`;
const sc = $('#grid-scroll', main);
sc.addEventListener('scroll', () => { cancelAnimationFrame(V.raf); V.raf = requestAnimationFrame(paintRows); }, {passive: true});
let t;
$('#sheet-search', main).oninput = e => { clearTimeout(t); $('#search-x', main).classList.toggle('hidden', !e.target.value); t = setTimeout(() => { st.view.search = e.target.value; refresh(true); }, 140); };
$('#search-x', main).onclick = () => { $('#sheet-search', main).value = ''; st.view.search = ''; $('#search-x', main).classList.add('hidden'); refresh(true); };
$('#old-toggle', main).onclick = e => { V.showOld = !V.showOld; e.currentTarget.classList.toggle('on', V.showOld); e.currentTarget.innerHTML = icon(V.showOld ? 'eye' : 'eyeOff'); paintRows(true); };
$('#sheet-more', main).onclick = e => menu(e.currentTarget, [
{head: 'Sheet'},
{label: 'Compact rows', icon: 'layers', active: st.S.density === 'compact', run: () => { ST.setS({density: st.S.density === 'compact' ? 'comfy' : 'compact'}); document.body.dataset.density = st.S.density; refresh(); }},
{label: 'Expand all merged', icon: 'chevron', run: () => { ST.res().items.forEach(i => i.kind === 'merged' && st.expanded.add(i.id)); refresh(); }},
{label: 'Collapse all merged', icon: 'right', run: () => { st.expanded.clear(); refresh(); }},
'-',
{label: 'Clear filters and sort', icon: 'reset', disabled: !st.view.rules.length && !st.view.sort && !st.view.family && !st.view.flag && !st.view.search, run: clearView}
], {align: 'end'});
$('#grid-head', main).onclick = headClick;
$('#grid-body', main).addEventListener('click', bodyClick);
$('#grid-body', main).addEventListener('dblclick', e => { const c = e.target.closest('.gc[data-k]'); if (c) { setActive(c.parentNode.dataset.id, c.dataset.k); startEdit(); } });
sc.addEventListener('keydown', keyNav);
refresh();
},
update() { if (V.edit) cancelEdit(); refresh(); }
};

function clearView() { st.view.rules = []; st.view.sort = null; st.view.family = null; st.view.flag = null; st.view.search = ''; const s = $('#sheet-search', V.main); if (s) s.value = ''; refresh(true); }

function refresh(resetScroll) {
if (!V.main || !$('#grid', V.main)) return;
computeRows();
quickBar();
subBar();
paintHead();
const sc = $('#grid-scroll', V.main);
if (resetScroll) sc.scrollTop = 0;
paintRows(true);
bulkBar();
}
A.sheetRefresh = refresh;

function quickBar() {
const r = ST.res();
const counts = {};
QUICK.forEach(q => counts[q.v] = E.viewItems(r, {quick: q.v}, [], st.S).length);
$('#quick', V.main).innerHTML = QUICK.filter(q => q.v === 'all' || counts[q.v] || st.view.quick === q.v).map(q => `<button class="qchip ${st.view.quick === q.v ? 'on' : ''} ${q.tone || ''}" data-q="${q.v}" role="tab" aria-selected="${st.view.quick === q.v}">${q.l}<b>${counts[q.v]}</b></button>`).join('');
$$('.qchip', V.main).forEach(b => b.onclick = () => { st.view.quick = b.dataset.q; st.view.flag = null; refresh(true); });
}

function subBar() {
const r = ST.res();
const chips = [];
if (st.view.quick === 'issues') {
const fl = ['noPrice', 'badUnit', 'unknownUnit', 'noUnit', 'partial', 'review'];
const c = {};
r.items.forEach(it => { if (!it.excluded) it.flags.forEach(f => { if (fl.includes(f)) c[f] = (c[f] || 0) + 1; }); });
fl.filter(f => c[f]).forEach(f => chips.push(`<button class="fchip ${st.view.flag === f ? 'on' : ''}" data-flag="${f}">${A.FLAG[f]}<b>${c[f]}</b></button>`));
}
if (st.view.family) chips.push(`<span class="rule-chip">${icon('units')}Unit: ${esc(E.famTitle(st.view.family, r.fams[st.view.family]))}<button data-clr="family" aria-label="Remove">${icon('x')}</button></span>`);
st.view.rules.forEach((ru, i) => {
const lbl = V.cols.find(c => c.key === ru.key)?.label || A.colMeta(ru.key).label;
const val = ru.op === 'in' || ru.op === 'nin' ? (ru.val.length > 2 ? ru.val.length + ' values' : ru.val.map(v => v === '' ? '(empty)' : v).join(', ')) : NEEDS_VAL.has(ru.op) ? ru.val : '';
chips.push(`<span class="rule-chip">${icon('filter')}<b>${esc(lbl)}</b> ${esc(OPS[ru.op])} ${esc(val)}<button data-rule="${i}" aria-label="Remove filter">${icon('x')}</button></span>`);
});
if (st.view.sort) {
const lbl = A.colMeta(st.view.sort.key).label;
chips.push(`<span class="rule-chip">${icon(st.view.sort.dir === 'asc' ? 'sortUp' : 'sortDown')}${esc(lbl)}<button data-clr="sort" aria-label="Remove sort">${icon('x')}</button></span>`);
}
const shown = V.rows.filter(x => !x.member).length;
const sb = $('#sub-bar', V.main);
sb.innerHTML = chips.join('') + `<span class="sb-count">${shown} of ${r.stats.rows + r.stats.excluded} rows</span>`;
sb.classList.toggle('has', chips.length > 0);
sb.onclick = e => {
const f = e.target.closest('[data-flag]'); if (f) { st.view.flag = st.view.flag === f.dataset.flag ? null : f.dataset.flag; return refresh(true); }
const ru = e.target.closest('[data-rule]'); if (ru) { st.view.rules.splice(+ru.dataset.rule, 1); return refresh(true); }
const c = e.target.closest('[data-clr]'); if (c) { st.view[c.dataset.clr] = null; refresh(true); }
};
}

function paintHead() {
const h = $('#grid-head', V.main);
const viewIds = V.rows.filter(x => !x.member).map(x => x.it.id);
const selN = viewIds.filter(id => st.sel.has(id)).length;
const all = viewIds.length && selN === viewIds.length;
h.style.gridTemplateColumns = template();
h.style.width = totalW() + 'px';
h.innerHTML = `<div class="gh cb"><button class="ck ${all ? 'on' : selN ? 'mixed' : ''}" data-act="all" aria-label="Select all shown">${icon(selN && !all ? 'minus' : 'check')}</button></div><div class="gh st"></div>` + V.cols.map(c => {
const sorted = st.view.sort && st.view.sort.key === c.key;
const filt = st.view.rules.some(r => r.key === c.key);
return `<button class="gh col ${c.m.isNew ? 'new' : ''} ${c.m.num ? 'num' : ''} ${filt ? 'filtered' : ''}" data-k="${esc(c.key)}">${c.m.role ? `<i class="role-dot r-${c.m.role}" title="${A.ROLES[c.m.role].label}"></i>` : c.m.isNew ? '<i class="new-dot"></i>' : ''}<span class="gh-l">${esc(c.label)}</span>${sorted ? icon(st.view.sort.dir === 'asc' ? 'sortUp' : 'sortDown', 'gh-sort') : ''}${filt ? icon('filter', 'gh-filt') : ''}${icon('chevron', 'gh-chev')}</button>`;
}).join('') + `<div class="gh more"><button class="icon-btn" data-act="cols" title="Columns">${icon('columns')}</button></div>`;
}

function headClick(e) {
const ck = e.target.closest('[data-act="all"]');
if (ck) {
const ids = V.rows.filter(x => !x.member).map(x => x.it.id);
const all = ids.every(id => st.sel.has(id));
ids.forEach(id => all ? st.sel.delete(id) : st.sel.add(id));
paintHead(); paintRows(true); bulkBar();
return;
}
if (e.target.closest('[data-act="cols"]')) return A.go('columns');
const col = e.target.closest('.gh.col');
if (col) colPop(col, col.dataset.k);
}

function paintRows(force) {
const sc = $('#grid-scroll', V.main); if (!sc) return;
const body = $('#grid-body', V.main);
const h = rowH(), n = V.rows.length;
body.style.height = n * h + 'px';
body.style.width = totalW() + 'px';
const empty = $('#grid-empty', V.main);
empty.classList.toggle('hidden', n > 0);
if (!n) empty.innerHTML = `<div>${icon('search')}<b>No rows here</b><span>${st.view.rules.length || st.view.search || st.view.family || st.view.flag ? 'Try clearing some filters.' : 'Nothing matches this view.'}</span>${st.view.rules.length || st.view.search || st.view.family || st.view.flag ? '<button class="btn ghost" id="empty-clear">Clear filters</button>' : ''}</div>`;
const ec = $('#empty-clear', V.main); if (ec) ec.onclick = clearView;
const top = sc.scrollTop - 36, vh = sc.clientHeight;
const from = Math.max(0, Math.floor(top / h) - 8), to = Math.min(n, Math.ceil((top + vh) / h) + 8);
const key = from + ':' + to;
if (!force && body.dataset.range === key) return;
body.dataset.range = key;
const tpl = template();
let html = '';
for (let i = from; i < to; i++) html += rowHTML(V.rows[i], i, h, tpl);
body.innerHTML = html;
}

function stateOf(it) {
if (it.excluded) return 'ex';
if (it.flags.some(f => E.ISSUE_FLAGS.includes(f))) return 'warn';
if (it.kind === 'merged') return 'mg';
if (it.flags.includes('custom') || it.edited) return 'ed';
if (it.converted) return 'ok';
return 'idle';
}

function rowHTML(row, i, h, tpl) {
const it = row.it;
const sel = !row.member && st.sel.has(it.id);
const s = stateOf(it);
const cls = ['gr', 's-' + s, sel ? 'sel' : '', row.member ? 'member' : '', row.lastMember ? 'last' : '', it.kind === 'merged' ? 'merged' : '', it.kind === 'merged' && st.expanded.has(it.id) ? 'open' : ''].join(' ');
const tip = it.flags.filter(f => A.FLAG[f]).map(f => A.FLAG[f]).join(' · ') || (it.converted ? 'Converted' : 'Unchanged');
let stc;
if (it.kind === 'merged') stc = `<button class="mg-badge" data-act="expand" title="${it.members.length} rows merged, click to ${st.expanded.has(it.id) ? 'collapse' : 'expand'}">${icon('chevron')}${it.members.length}</button>`;
else stc = `<button class="sdot" data-act="inspect" title="${esc(tip)}" aria-label="Row details"><i></i></button>`;
const cells = V.cols.map(c => cellHTML(it, c, row)).join('');
return `<div class="${cls}" style="top:${i * h}px;height:${h}px;grid-template-columns:${tpl}" data-id="${esc(it.id)}" data-i="${i}" ${row.member ? `data-parent="${esc(row.parent.id)}"` : ''}>
<div class="gc cb">${row.member ? '<span class="tree"></span>' : `<button class="ck ${sel ? 'on' : ''}" data-act="sel" aria-label="Select row">${icon('check')}</button>`}</div>
<div class="gc st">${stc}</div>${cells}
<div class="gc more"><button class="icon-btn" data-act="more" aria-label="Row actions">${icon('more')}</button></div></div>`;
}

function cellHTML(it, c, row) {
const k = c.key, m = c.m;
const act = V.active && V.active.id === it.id && V.active.key === k ? ' act' : '';
const v = E.value(it, k, st.S);
let inner, cls = m.num ? 'num' : '';
if (k === 'new.unit') {
const custom = it.tsrc === 'row' || it.tsrc === 'keep';
const was = V.showOld && it.converted && it.unitRaw ? `<span class="was">${esc(it.unitRaw)}</span>${icon('arrow', 'was-ar')}` : '';
inner = it.newUnit ? `${was}<span class="upill ${it.converted ? 'conv' : ''} ${custom ? 'custom' : ''} ${it.tsrc === 'memory' ? 'mem' : ''}">${esc(it.newUnit)}</span>` : '<span class="nil">no unit</span>';
cls += ' unit';
} else if (k === 'new.price' || k === 'new.qty') {
const f = k === 'new.price' ? 'price' : 'qty';
const old = f === 'price' ? it.oldPrice : it.oldQty;
const ed = it.ov && it.ov[f] != null;
const showWas = V.showOld && it.kind !== 'merged' && old != null && (it.converted || ed) && old !== v;
inner = (showWas ? `<span class="was">${esc(fmt(old, 8))}</span>` : '') + (v == null ? '<span class="nil">—</span>' : `<span class="now">${esc(fmt(v, 10))}</span>`);
if (ed) cls += ' ed';
} else if (k === 'new.value' || k === 'new.factor') {
inner = v == null ? '<span class="nil">—</span>' : esc(fmt(v, 10));
cls += ' calc';
} else {
const i = k === 'new.name' ? st.doc.roles.name : +k.slice(2);
const ed = i >= 0 && (it.kind === 'merged' ? it.members.some(x => x.ov.cells && i in x.ov.cells) : it.ov && it.ov.cells && i in it.ov.cells);
if (ed) cls += ' ed';
inner = v == null ? '' : esc(m.num ? fmt(v, 10) : v);
if (k === 'new.name' || m.role === 'name') cls += ' name';
}
return `<div class="gc ${cls}${act}" data-k="${esc(k)}">${inner}</div>`;
}

function findItem(id, parent) {
const r = ST.res();
if (parent) { const p = r.items.find(i => i.id === parent); return p && p.members.find(m => m.id === id); }
return r.items.find(i => i.id === id);
}
function rowItemFromEl(el) { const gr = el.closest('.gr'); return gr ? findItem(gr.dataset.id, gr.dataset.parent) : null; }

function bodyClick(e) {
const b = e.target.closest('[data-act]');
const gr = e.target.closest('.gr'); if (!gr) return;
const it = rowItemFromEl(gr); if (!it) return;
if (b) {
const a = b.dataset.act;
if (a === 'sel') return toggleSel(it.id, +gr.dataset.i, e.shiftKey);
if (a === 'expand') { st.expanded.has(it.id) ? st.expanded.delete(it.id) : st.expanded.add(it.id); return refresh(); }
if (a === 'inspect') return inspect(b, it, gr.dataset.parent);
if (a === 'more') return rowMenu(b, it, gr.dataset.parent);
}
const c = e.target.closest('.gc[data-k]');
if (c) {
const same = V.active && V.active.id === it.id && V.active.key === c.dataset.k;
setActive(it.id, c.dataset.k, gr.dataset.parent);
if (c.dataset.k === 'new.unit' && (same || e.target.closest('.upill'))) packPop(c, rowsOf([it]));
}
}

function toggleSel(id, idx, range) {
if (range && V.last != null) {
const [a, b] = [Math.min(V.last, idx), Math.max(V.last, idx)];
const on = !st.sel.has(id);
for (let i = a; i <= b; i++) { const r = V.rows[i]; if (r && !r.member) on ? st.sel.add(r.it.id) : st.sel.delete(r.it.id); }
} else st.sel.has(id) ? st.sel.delete(id) : st.sel.add(id);
V.last = idx;
paintHead(); paintRows(true); bulkBar();
}

function setActive(id, key, parent) {
V.active = {id, key, parent: parent || null};
$$('.gc.act', V.main).forEach(x => x.classList.remove('act'));
const gr = $$('.gr', V.main).find(g => g.dataset.id === id);
const c = gr && $$('.gc[data-k]', gr).find(x => x.dataset.k === key);
if (c) c.classList.add('act');
$('#grid-scroll', V.main).focus({preventScroll: true});
}

function keyNav(e) {
if (V.edit || !V.active || e.target.closest('input')) return;
const ri = V.rows.findIndex(r => r.it.id === V.active.id);
const ci = V.cols.findIndex(c => c.key === V.active.key);
if (ri < 0 || ci < 0) return;
const move = (dr, dc) => {
const nr = Math.max(0, Math.min(V.rows.length - 1, ri + dr)), nc = Math.max(0, Math.min(V.cols.length - 1, ci + dc));
const r = V.rows[nr];
V.active = {id: r.it.id, key: V.cols[nc].key, parent: r.member ? r.parent.id : null};
ensureVisible(nr, nc);
paintRows(true);
};
const k = e.key;
if (k === 'ArrowDown') { e.preventDefault(); move(1, 0); }
else if (k === 'ArrowUp') { e.preventDefault(); move(-1, 0); }
else if (k === 'ArrowRight' || (k === 'Tab' && !e.shiftKey)) { e.preventDefault(); move(0, 1); }
else if (k === 'ArrowLeft' || (k === 'Tab' && e.shiftKey)) { e.preventDefault(); move(0, -1); }
else if (k === 'Enter' || k === 'F2') { e.preventDefault(); startEdit(); }
else if (k === ' ' && !V.rows[ri].member) { e.preventDefault(); toggleSel(V.active.id, ri, e.shiftKey); }
else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); revertCell(V.rows[ri].it, V.active.key); }
else if (k === 'Escape') { if (st.sel.size) { st.sel.clear(); paintHead(); paintRows(true); bulkBar(); } }
else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); startEdit(k); }
}

function ensureVisible(ri, ci) {
const sc = $('#grid-scroll', V.main), h = rowH();
const top = ri * h, headH = 40;
if (top < sc.scrollTop) sc.scrollTop = top;
else if (top + h > sc.scrollTop + sc.clientHeight - headH) sc.scrollTop = top + h - sc.clientHeight + headH;
let left = 94; for (let i = 0; i < ci; i++) left += width(V.cols[i].key);
const w = width(V.cols[ci].key);
if (left - 94 < sc.scrollLeft) sc.scrollLeft = left - 94;
else if (left + w > sc.scrollLeft + sc.clientWidth - 52) sc.scrollLeft = left + w - sc.clientWidth + 52;
}

function activeCellEl() {
if (!V.active) return null;
const gr = $$('.gr', V.main).find(g => g.dataset.id === V.active.id);
return gr && $$('.gc[data-k]', gr).find(x => x.dataset.k === V.active.key);
}

function startEdit(initial) {
const cell = activeCellEl(); if (!cell) return;
const it = findItem(V.active.id, V.active.parent); if (!it) return;
const key = V.active.key;
if (key === 'new.unit') return packPop(cell, rowsOf([it]));
if (key === 'new.value' || key === 'new.factor') return toast('Calculated from price and quantity', {icon: 'info'});
if (key === 'new.name' && st.doc.roles.name < 0) return;
let cur;
if (key === 'new.price' || key === 'new.qty') cur = E.value(it, key, st.S);
else { const i = key === 'new.name' ? st.doc.roles.name : +key.slice(2); cur = it.cells[i]; }
const inp = document.createElement('input');
inp.className = 'cell-edit' + (A.colMeta(key).num ? ' num' : '');
inp.value = initial != null ? initial : cur == null ? '' : String(cur);
cell.classList.add('editing');
cell.appendChild(inp);
inp.focus();
if (initial == null) inp.select();
V.edit = {inp, it, key};
let done = false;
const finish = (save, dr) => {
if (done) return; done = true;
const val = inp.value;
V.edit = null;
cell.classList.remove('editing');
inp.remove();
if (save) applyEdit(it, key, val, cur);
$('#grid-scroll', V.main).focus({preventScroll: true});
if (dr) setTimeout(() => keyNav({key: dr > 0 ? 'ArrowDown' : 'ArrowUp', preventDefault() {}, target: document.body}), 0);
};
V.edit.finish = finish;
inp.onkeydown = e => {
e.stopPropagation();
if (e.key === 'Enter') { e.preventDefault(); finish(true, e.shiftKey ? -1 : 1); }
else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
else if (e.key === 'Tab') { e.preventDefault(); finish(true); setTimeout(() => keyNav({key: 'Tab', shiftKey: e.shiftKey, preventDefault() {}, target: document.body}), 0); }
};
inp.onblur = () => finish(true);
}
function cancelEdit() { if (V.edit) V.edit.finish(false); }
A.flushEdit = () => { if (V.edit) V.edit.finish(true); };

const tidy = (d, rid) => { const r = d.rows[rid]; if (r && r.cells && !Object.keys(r.cells).length) delete r.cells; if (r && !Object.keys(r).length) delete d.rows[rid]; };
const tidyG = (d, k) => { const g = d.groups[k]; if (g && g.out && !g.out.length) delete g.out; if (g && !Object.keys(g).length) delete d.groups[k]; };

function applyEdit(it, key, raw, cur) {
const val = String(raw).trim();
if (key === 'new.price' || key === 'new.qty') {
const f = key === 'new.price' ? 'price' : 'qty';
const n = val === '' ? null : E.parseNum(val);
if (val !== '' && n == null) return toast('That is not a number', {tone: 'warn', icon: 'alert'});
if (n != null && cur != null && Math.abs(n - cur) < 1e-12 && !(it.ov && it.ov[f] != null)) return;
ST.commit(f === 'price' ? 'Edit price' : 'Edit quantity', d => {
if (it.kind === 'merged') { const g = d.groups[it.gkey] ||= {}; n == null ? delete g[f] : g[f] = n; tidyG(d, it.gkey); }
else { const r = d.rows[it.rid] ||= {}; n == null ? delete r[f] : r[f] = n; tidy(d, it.rid); }
});
if (n == null) toast((f === 'price' ? 'Price' : 'Quantity') + ' back to calculated', {icon: 'reset'});
return;
}
const i = key === 'new.name' ? st.doc.roles.name : +key.slice(2);
if (i < 0) return;
if (E.clean(cur) === E.clean(val)) return;
ST.commit('Edit cell', d => {
it.rids.forEach(rid => {
const r = d.rows[rid] ||= {};
r.cells ||= {};
if (E.clean(st.src.rows[rid][i]) === E.clean(val)) delete r.cells[i]; else r.cells[i] = val;
tidy(d, rid);
});
});
}

function revertCell(it, key) {
if (key === 'new.price' || key === 'new.qty') {
const f = key === 'new.price' ? 'price' : 'qty';
if (!(it.ov && it.ov[f] != null)) return;
ST.commit('Reset cell', d => { if (it.kind === 'merged') { delete d.groups[it.gkey][f]; tidyG(d, it.gkey); } else { delete d.rows[it.rid][f]; tidy(d, it.rid); } });
return toast('Back to calculated value', {icon: 'reset'});
}
if (key === 'new.unit') return setTarget(rowsOf([it]), null);
const i = key === 'new.name' ? st.doc.roles.name : key.startsWith('o:') ? +key.slice(2) : -1;
if (i < 0) return;
let any = false;
ST.commit('Reset cell', d => it.rids.forEach(rid => { const r = d.rows[rid]; if (r && r.cells && i in r.cells) { delete r.cells[i]; any = true; tidy(d, rid); } }));
if (any) toast('Cell back to original', {icon: 'reset'});
}

function rowsOf(items) {
const out = [];
items.forEach(it => { if (it.kind === 'merged') it.members.forEach(m => out.push(m)); else out.push(it); });
return out;
}

function setTarget(rows, target, remember) {
const n = rows.length;
const changed = ST.commit(target == null ? 'Reset pack size' : 'Set pack size', d => rows.forEach(it => {
const r = d.rows[it.rid] ||= {};
if (target == null) delete r.target; else r.target = target;
tidy(d, it.rid);
}));
if (remember && typeof target === 'number' && target > 1) rows.forEach(it => it.parsed && ST.remember(it.name, it.family, target));
if (changed || remember) toast(target == null ? `Pack size back to auto on ${n} row${n > 1 ? 's' : ''}` : target === 'keep' ? `Kept as is on ${n} row${n > 1 ? 's' : ''}` : `Converted to ${target} on ${n} row${n > 1 ? 's' : ''}${remember ? ' · remembered' : ''}`, {icon: 'units', action: changed ? {label: 'Undo', run: () => ST.undo()} : null});
}

function packPop(anchor, rows) {
const withUnit = rows.filter(r => r.parsed);
if (!withUnit.length) return toast(rows.length > 1 ? 'None of these rows have a unit' : 'This row has no readable unit', {tone: 'warn', icon: 'alert'});
const r = ST.res();
const one = withUnit.length === 1 ? withUnit[0] : null;
const fams = [...new Set(withUnit.map(x => x.family))];
const counts = new Set([1]);
fams.forEach(f => Object.keys(r.fams[f]?.counts || {}).forEach(c => counts.add(+c)));
[5, 7, 10, 14, 20, 28, 30].forEach(c => counts.add(c));
const opts = [...counts].filter(c => c > 0).sort((a, b) => a - b).slice(0, 14);
const curT = one ? one.target : null;
const anyOv = withUnit.some(x => x.ov.target != null);
const lbl = c => r.fmtUnit(c, r.labelFor(fams[0], c));
const memo = one && one.name ? st.mem[E.memKey(one.name)] : null;
const el = popover(anchor, `
<div class="pp">
<header class="pp-h">${one ? `<b>${esc(one.name || 'Row')}</b><span>${esc(one.unitRaw)} → <em>${esc(one.newUnit)}</em> · ${esc(A.TSRC[one.tsrc] || '')}</span>` : `<b>${withUnit.length} rows</b><span>${fams.length > 1 ? 'mixed units, each keeps its own unit word' : esc(E.famTitle(fams[0], r.fams[fams[0]]))}</span>`}</header>
<div class="pp-sec"><span class="pp-l">Convert to</span>
<div class="pp-grid">${opts.map(c => `<button class="pp-o ${curT === c && one && one.tsrc === 'row' ? 'on' : ''}" data-t="${c}">${fams.length === 1 ? esc(lbl(c)) : c}${c === 1 ? '<small>single</small>' : ''}</button>`).join('')}</div></div>
<div class="pp-sec pp-custom"><span class="pp-l">Custom</span><div id="pp-step"></div><button class="btn primary sm" id="pp-set">Apply</button></div>
<div class="pp-sec pp-row"><button class="pp-keep ${one && one.tsrc === 'keep' ? 'on' : ''}" data-t="keep">${icon('x')}Don't convert</button>${anyOv ? `<button class="pp-keep" data-t="auto">${icon('reset')}Back to auto</button>` : ''}</div>
<label class="pp-mem"><span>${icon('brain')}Remember for ${one ? 'this item' : 'these items'}<small>${memo ? 'remembered: ' + memo.count : 'reused when you convert singles to packs'}</small></span>${UI.sw(false, 'id="pp-rem"')}</label>
</div>`, {cls: 'pop-pack'});
if (!el) return;
let custom = one && typeof one.target === 'number' ? one.target : st.S.packSize;
stepper($('#pp-step', el), {value: custom, min: 1, max: 10000, onChange: v => custom = v});
let rem = false;
$('#pp-rem', el).onclick = e => { rem = !rem; e.currentTarget.classList.toggle('on', rem); e.currentTarget.setAttribute('aria-checked', rem); };
const go = t => { closePop(); setTarget(withUnit, t, rem); };
$$('[data-t]', el).forEach(b => b.onclick = () => go(b.dataset.t === 'keep' ? 'keep' : b.dataset.t === 'auto' ? null : +b.dataset.t));
$('#pp-set', el).onclick = () => { const n = E.parseNum($('#pp-step input', el).value); if (n > 0) go(n); };
}
A.packPop = packPop;

function inspect(anchor, it, parent) {
const r = ST.res();
const flags = it.flags.filter(f => A.FLAG[f]);
const g = it.group;
const el = popover(anchor, `
<div class="insp">
<header><b>${esc(it.name || 'Row ' + (it.rid + 1))}</b><span>source row ${it.rid + 2}${it.excluded ? ' · excluded' : ''}</span></header>
<dl>
<dt>Unit</dt><dd>${esc(it.unitRaw || '—')} ${icon('arrow')} <b>${esc(it.newUnit || '—')}</b></dd>
<dt>Rule</dt><dd>${esc(A.TSRC[it.tsrc] || '—')}${it.factor != null && it.factor !== 1 ? ` · ×${E.fmtN(it.factor)}` : ''}</dd>
<dt>Price</dt><dd>${esc(fmt(it.oldPrice, 8) || '—')} ${icon('arrow')} <b>${esc(fmt(it.newPrice, 10) || '—')}</b>${it.ov.price != null ? ' <em>edited</em>' : ''}</dd>
<dt>Qty</dt><dd>${esc(fmt(it.oldQty, 8) || '—')} ${icon('arrow')} <b>${esc(fmt(it.newQty, 10) || '—')}</b>${it.ov.qty != null ? ' <em>edited</em>' : ''}</dd>
</dl>
${flags.length ? `<ul class="insp-flags">${flags.map(f => `<li class="f-${f}">${esc(A.FLAG[f])}</li>`).join('')}</ul>` : ''}
${g ? `<button class="insp-link" id="insp-dup">${icon('dups')}<span>${g.members.length} rows share this name and unit · <b>${g.mode === 'merge' ? 'merged' : 'kept separate'}</b></span>${icon('right')}</button>` : ''}
<div class="insp-act">
<button class="btn ghost sm" id="insp-pack">${icon('units')}Pack size</button>
<button class="btn ghost sm" id="insp-ex">${icon(it.excluded ? 'eye' : 'eyeOff')}${it.excluded ? 'Include' : 'Exclude'}</button>
${it.edited || it.ov.target != null ? `<button class="btn ghost sm" id="insp-reset">${icon('reset')}Reset</button>` : ''}
</div>
</div>`, {cls: 'pop-insp'});
if (!el) return;
$('#insp-pack', el).onclick = () => packPop(anchor, [it]);
$('#insp-ex', el).onclick = () => { closePop(); setExcluded([it], !it.excluded); };
const rs = $('#insp-reset', el); if (rs) rs.onclick = () => { closePop(); resetRows([it]); };
const dl = $('#insp-dup', el); if (dl) dl.onclick = () => { closePop(); A.focusGroup = g.key; A.go('dups'); };
}

function rowMenu(anchor, it, parent) {
const items = [{head: it.name || 'Row ' + (it.rid + 1)}];
items.push({label: 'Pack size…', icon: 'units', run: () => packPop(anchor, rowsOf([it]))});
if (parent) {
items.push({label: 'Take out of merge', icon: 'split', hint: 'Becomes its own row again', run: () => takeOut(it, parent)});
} else if (it.kind === 'merged') {
items.push({label: 'Keep separate', icon: 'split', hint: 'Show each source row', run: () => groupMode([it.group], 'keep')});
items.push({label: st.expanded.has(it.id) ? 'Hide merged rows' : 'Show merged rows', icon: 'chevron', run: () => { st.expanded.has(it.id) ? st.expanded.delete(it.id) : st.expanded.add(it.id); refresh(); }});
} else if (it.group) {
items.push({label: 'Merge its duplicates', icon: 'merge', hint: it.group.members.length + ' rows', run: () => groupMode([it.group], 'merge')});
if (!it.ov.mg) items.push({label: 'Leave out of duplicates', icon: 'split', run: () => ST.commit('Leave out of duplicates', d => { (d.rows[it.rid] ||= {}).solo = true; })});
}
if (it.ov && it.ov.solo) items.push({label: 'Allow duplicate matching', icon: 'dups', run: () => ST.commit('Allow duplicate matching', d => { delete d.rows[it.rid].solo; tidy(d, it.rid); })});
items.push({label: it.excluded ? 'Include row' : 'Exclude row', icon: it.excluded ? 'eye' : 'eyeOff', run: () => setExcluded([it], !it.excluded)});
items.push('-');
items.push({label: 'Copy row', icon: 'copy', run: () => copyText(V.cols.map(c => E.value(it, c.key, st.S) ?? '').join('\t'))});
if (it.edited || it.ov.target != null || it.ov.mg || it.ov.solo) items.push({label: 'Reset all edits', icon: 'reset', danger: true, run: () => resetRows([it])});
menu(anchor, items, {align: 'end'});
}

function takeOut(it, parentId) {
const p = findItem(parentId);
if (!p) return;
ST.commit('Take out of merge', d => {
if (it.ov.mg) { delete d.rows[it.rid].mg; tidy(d, it.rid); }
else { const g = d.groups[p.gkey] ||= {}; g.out = [...new Set([...(g.out || []), it.rid])]; }
});
toast('Taken out of the merge', {icon: 'split', action: {label: 'Undo', run: () => ST.undo()}});
}

function setExcluded(items, ex) {
const rows = rowsOf(items);
ST.commit(ex ? 'Exclude rows' : 'Include rows', d => rows.forEach(it => {
const r = d.rows[it.rid] ||= {};
if (ex) r.ex = true; else if (it.flags.includes('junk')) r.ex = false; else delete r.ex;
tidy(d, it.rid);
}));
items.forEach(i => st.sel.delete(i.id));
toast(`${rows.length} row${rows.length > 1 ? 's' : ''} ${ex ? 'excluded' : 'included'}`, {icon: ex ? 'eyeOff' : 'eye', action: {label: 'Undo', run: () => ST.undo()}});
}

function resetRows(items) {
ST.commit('Reset edits', d => items.forEach(it => {
if (it.kind === 'merged') delete d.groups[it.gkey];
rowsOf([it]).forEach(m => { const ex = d.rows[m.rid] && d.rows[m.rid].ex; delete d.rows[m.rid]; if (ex != null) d.rows[m.rid] = {ex}; });
}));
toast('Edits reset', {icon: 'reset', action: {label: 'Undo', run: () => ST.undo()}});
}

function groupMode(groups, mode) {
ST.commit(mode === 'merge' ? 'Merge duplicates' : 'Keep duplicates separate', d => groups.forEach(g => {
if (g.manual && mode === 'keep') { g.members.forEach(m => { if (d.rows[m.rid]) { delete d.rows[m.rid].mg; tidy(d, m.rid); } }); return; }
(d.groups[g.key] ||= {}).mode = mode;
}));
toast(mode === 'merge' ? 'Merged' : 'Kept separate', {icon: mode === 'merge' ? 'merge' : 'split', action: {label: 'Undo', run: () => ST.undo()}});
}
A.groupMode = groupMode;
A.tidy = tidy; A.tidyG = tidyG;

async function mergeSelected(items) {
const rows = rowsOf(items).filter(x => !x.excluded);
if (rows.length < 2) return toast('Pick at least two rows to merge', {tone: 'warn', icon: 'alert'});
const units = new Set(rows.map(x => E.nameKey(x.newUnit, true)));
if (units.size > 1 && !await confirm({title: 'Merge different units?', body: `These rows end up in ${units.size} different units. The merged row uses “${rows[0].newUnit}” and adds the quantities together as they are.`, ok: 'Merge anyway'})) return;
const id = Date.now().toString(36);
ST.commit('Merge selected', d => rows.forEach(it => { const r = d.rows[it.rid] ||= {}; r.mg = id; delete r.solo; }));
st.sel.clear();
toast(`${rows.length} rows merged into one`, {icon: 'merge', action: {label: 'Undo', run: () => ST.undo()}});
}

function bulkBar() {
const b = $('#bulk', V.main);
const r = ST.res();
const items = r.items.filter(i => st.sel.has(i.id));
document.body.classList.toggle('bulk-on', items.length > 0);
if (!items.length) { b.classList.remove('show'); return; }
const anyEx = items.some(i => i.excluded), anyIn = items.some(i => !i.excluded);
const anyDup = items.some(i => i.kind === 'merged' || i.group);
b.innerHTML = `<span class="bk-n"><b>${items.length}</b> selected</span>
<button class="bk-b" data-b="pack">${icon('units')}Pack size</button>
<button class="bk-b" data-b="merge" ${items.length < 2 && items[0].kind !== 'merged' ? 'disabled' : ''}>${icon('merge')}Merge</button>
${anyDup ? `<button class="bk-b" data-b="keep">${icon('split')}Keep separate</button>` : ''}
${anyIn ? `<button class="bk-b" data-b="ex">${icon('eyeOff')}Exclude</button>` : ''}
${anyEx ? `<button class="bk-b" data-b="in">${icon('eye')}Include</button>` : ''}
<button class="bk-b" data-b="reset">${icon('reset')}Reset</button>
<button class="bk-x" data-b="clear" aria-label="Clear selection">${icon('x')}</button>`;
b.classList.add('show');
b.onclick = e => {
const t = e.target.closest('[data-b]'); if (!t || t.disabled) return;
const fresh = ST.res().items.filter(i => st.sel.has(i.id));
const a = t.dataset.b;
if (a === 'pack') packPop(t, rowsOf(fresh));
else if (a === 'merge') mergeSelected(fresh);
else if (a === 'keep') {
const groups = [...new Map(fresh.filter(i => i.kind === 'merged').map(i => [i.group.key, i.group])).values()];
const solo = fresh.filter(i => i.kind !== 'merged' && i.group);
ST.commit('Keep separate', d => {
groups.forEach(g => { if (g.manual) g.members.forEach(m => { if (d.rows[m.rid]) { delete d.rows[m.rid].mg; tidy(d, m.rid); } }); else (d.groups[g.key] ||= {}).mode = 'keep'; });
solo.forEach(it => { const r = d.rows[it.rid] ||= {}; r.solo = true; delete r.mg; });
});
st.sel.clear();
toast('Kept separate', {icon: 'split', action: {label: 'Undo', run: () => ST.undo()}});
}
else if (a === 'ex') setExcluded(fresh.filter(i => !i.excluded), true);
else if (a === 'in') setExcluded(fresh.filter(i => i.excluded), false);
else if (a === 'reset') resetRows(fresh);
else if (a === 'clear') { st.sel.clear(); paintHead(); paintRows(true); bulkBar(); }
};
}

function colPop(anchor, key) {
const m = A.colMeta(key);
const col = st.doc.columns.find(c => c.key === key);
const label = A.colLabel(col);
const r = ST.res();
const base = r.items.filter(i => st.view.quick === 'excluded' ? i.excluded : !i.excluded);
const counts = new Map();
base.forEach(it => { const v = E.value(it, key, st.S); const s = v == null ? '' : String(v); counts.set(s, (counts.get(s) || 0) + 1); });
const coll = new Intl.Collator(undefined, {numeric: true});
const vals = [...counts.entries()].sort((a, b) => a[0] === '' ? -1 : b[0] === '' ? 1 : coll.compare(a[0], b[0]));
const exist = st.view.rules.find(x => x.key === key);
const picked = new Set(exist && exist.op === 'in' ? exist.val : exist && exist.op === 'nin' ? vals.map(v => v[0]).filter(v => !exist.val.includes(v)) : vals.map(v => v[0]));
let op = exist && exist.op !== 'in' && exist.op !== 'nin' ? exist.op : m.num ? 'gt' : 'contains';
const sorted = st.view.sort && st.view.sort.key === key ? st.view.sort.dir : null;
const opList = m.num ? ['gt', 'gte', 'lt', 'lte', 'eq', 'neq', 'zero', 'nonzero', 'empty', 'filled'] : ['contains', 'ncontains', 'eq', 'neq', 'empty', 'filled'];
const LIM = 400;
const el = popover(anchor, `
<div class="cp">
<header class="cp-h">${m.role ? `<i class="role-dot r-${m.role}"></i>` : m.isNew ? '<i class="new-dot"></i>' : ''}<b>${esc(label)}</b>${m.role ? `<span>${A.ROLES[m.role].label}</span>` : m.isNew ? '<span>new</span>' : ''}</header>
<div class="cp-sort"><button class="cp-sb ${sorted === 'asc' ? 'on' : ''}" data-s="asc">${icon('sortUp')}${m.num ? '1 → 9' : 'A → Z'}</button><button class="cp-sb ${sorted === 'desc' ? 'on' : ''}" data-s="desc">${icon('sortDown')}${m.num ? '9 → 1' : 'Z → A'}</button></div>
<div class="cp-sec"><span class="pp-l">Condition</span><div class="cp-cond"><button id="cp-op"></button><input id="cp-val" class="field" placeholder="value" value="${esc(exist && NEEDS_VAL.has(exist.op) ? exist.val : '')}" ${NEEDS_VAL.has(op) ? '' : 'disabled'}></div></div>
<div class="cp-sec"><span class="pp-l">Values <button class="link" id="cp-all">all</button><button class="link" id="cp-none">none</button></span>
<label class="search sm">${icon('search')}<input id="cp-q" placeholder="Find value"></label>
<div class="cp-vals" id="cp-vals"></div></div>
<footer class="cp-f">${m.isNew || key.startsWith('o:') ? `<button class="btn ghost sm" id="cp-hide">${icon('eyeOff')}Hide</button>` : ''}<span class="grow"></span>${exist ? `<button class="btn ghost sm" id="cp-clear">Clear</button>` : ''}<button class="btn primary sm" id="cp-apply">Apply</button></footer>
</div>`, {cls: 'pop-col'});
if (!el) return;
let mode = exist && NEEDS_VAL.has(exist.op) || (exist && ['empty', 'filled', 'zero', 'nonzero'].includes(exist.op)) ? 'cond' : 'vals';
const paintVals = q => {
const s = (q || '').toLowerCase();
const list = vals.filter(([v]) => !s || v.toLowerCase().includes(s));
$('#cp-vals', el).innerHTML = list.slice(0, LIM).map(([v, n]) => `<label class="cp-v"><button class="ck sm ${picked.has(v) ? 'on' : ''}" data-v="${esc(v)}">${icon('check')}</button><span>${v === '' ? '<em>(empty)</em>' : esc(m.num ? fmt(+v, 10) : v)}</span><b>${n}</b></label>`).join('') + (list.length > LIM ? `<div class="cp-more">${list.length - LIM} more, search to narrow down</div>` : '') + (!list.length ? '<div class="cp-more">No values</div>' : '');
};
paintVals('');
const opBtn = $('#cp-op', el), valIn = $('#cp-val', el);
const setOp = v => { op = v; mode = 'cond'; valIn.disabled = !NEEDS_VAL.has(v); if (!valIn.disabled) valIn.focus(); select(opBtn, {value: op, options: opList.map(o => ({value: o, label: OPS[o]})), onChange: setOp}); };
select(opBtn, {value: op, options: opList.map(o => ({value: o, label: OPS[o]})), onChange: setOp});
valIn.oninput = () => mode = 'cond';
valIn.onkeydown = e => { if (e.key === 'Enter') $('#cp-apply', el).click(); };
$('#cp-q', el).oninput = e => paintVals(e.target.value);
$('#cp-vals', el).onclick = e => { const b = e.target.closest('.ck'); if (!b) return; e.preventDefault(); mode = 'vals'; const v = b.dataset.v; picked.has(v) ? picked.delete(v) : picked.add(v); b.classList.toggle('on'); };
$('#cp-all', el).onclick = () => { mode = 'vals'; vals.forEach(([v]) => picked.add(v)); paintVals($('#cp-q', el).value); };
$('#cp-none', el).onclick = () => { mode = 'vals'; picked.clear(); paintVals($('#cp-q', el).value); };
$$('.cp-sb', el).forEach(b => b.onclick = () => { st.view.sort = sorted === b.dataset.s ? null : {key, dir: b.dataset.s}; closePop(); refresh(true); });
const hide = $('#cp-hide', el);
if (hide) hide.onclick = () => { closePop(); ST.commit('Hide column', d => { d.columns.find(c => c.key === key).on = false; d.colsTouched = true; }); toast(`“${label}” hidden from sheet and export`, {icon: 'eyeOff', action: {label: 'Undo', run: () => ST.undo()}}); };
const clr = $('#cp-clear', el);
if (clr) clr.onclick = () => { st.view.rules = st.view.rules.filter(x => x.key !== key); closePop(); refresh(true); };
$('#cp-apply', el).onclick = () => {
let rule = null;
if (mode === 'cond') {
if (NEEDS_VAL.has(op) && valIn.value.trim() === '') return valIn.focus();
rule = {key, op, val: NEEDS_VAL.has(op) ? valIn.value.trim() : null};
} else if (picked.size < vals.length) {
rule = picked.size <= vals.length / 2 ? {key, op: 'in', val: [...picked]} : {key, op: 'nin', val: vals.map(v => v[0]).filter(v => !picked.has(v))};
}
st.view.rules = st.view.rules.filter(x => x.key !== key);
if (rule) st.view.rules.push(rule);
closePop();
refresh(true);
};
}

async function copyText(text) {
try { await navigator.clipboard.writeText(text); }
catch { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
toast('Copied', {icon: 'copy'});
}
A.copyText = copyText;
A.setExcluded = setExcluded;
A.setTarget = setTarget;
A.rowsOf = rowsOf;
A.resetRows = resetRows;
})();
