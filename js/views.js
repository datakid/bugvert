(() => {
const {$, $$, esc, icon, toast, menu, popover, closePop, select, seg, sw, stepper, confirm, fmt} = UI;
const E = Engine, ST = Store, st = Store.st, A = App;
const FAMS = Object.keys(E.FAM);

A.views.units = {
render(main) {
const r = ST.res();
const fams = Object.values(r.fams).sort((a, b) => (a.known === b.known ? 0 : a.known ? -1 : 1) || b.rows - a.rows);
const toPack = st.doc.dir === 'toPack';
const known = fams.filter(f => f.known), other = fams.filter(f => !f.known);
const tsrc = {};
r.items.forEach(it => { if (!it.excluded && it.parsed) tsrc[it.tsrc] = (tsrc[it.tsrc] || 0) + 1; });
main.innerHTML = `
<section class="view-head">
<div><h2>Units</h2><p>${toPack ? `Singles become packs. Remembered packs come first, then sizes in item names${st.S.useName ? '' : ' (off)'}, then unit defaults, then <b>${st.S.packSize}</b>.` : 'Packs become singles. Turn a unit off to leave it as it is, or give it a different target.'}</p></div>
<div class="vh-stats">${Object.entries(tsrc).filter(([k]) => A.TSRC[k]).map(([k, n]) => `<span class="mini t-${k}"><b>${n}</b>${esc(A.TSRC[k])}</span>`).join('')}</div>
</section>
<section class="unit-grid">${known.map(f => unitCard(f, r, toPack)).join('') || '<div class="empty-card">No known units yet. Check the unit column in Source.</div>'}</section>
${other.length ? `<section class="sec-block"><header class="sec-head"><div><h3>Unrecognized</h3><p>Tell bugvert what these words mean once. It's saved in your dictionary.</p></div></header>
<div class="unk-list">${other.map(f => unkRow(f, r)).join('')}</div></section>` : ''}`;
$$('.uc', main).forEach(card => wireCard(card, r, toPack));
$$('.unk', main).forEach(row => {
const id = row.dataset.f, f = r.fams[id];
const b = $('.unk-map', row);
select(b, {value: '', placeholder: 'Means…', options: FAMS.map(k => ({value: k, label: E.FAM[k][2]})), onChange: fam => {
const tok = f.id.startsWith('x:') ? f.id.slice(2) : f.tok.toUpperCase();
if (!tok || tok === '#') return toast('Bare numbers need a unit word', {tone: 'warn', icon: 'alert'});
const aliases = {...st.S.aliases, [tok]: fam};
Object.keys(f.tokens).forEach(t => { if (t) aliases[t.toUpperCase().replace(/[.\s]/g, '')] = fam; });
ST.setS({aliases});
toast(`“${f.tok}” now means ${E.FAM[fam][2]}`, {icon: 'brain'});
}});
$('.unk-rows', row).onclick = () => showRows(id);
});
},
update() { this.render($('#view')); }
};

function showRows(fam) { st.view = {quick: 'all', search: '', sort: null, rules: [], family: fam, flag: null}; A.go('sheet'); }

function unitCard(f, r, toPack) {
const rule = r.famRule(f.id);
const counts = Object.entries(f.counts).sort((a, b) => b[1] - a[1]);
const ex = f.tok ? r.fmtUnit(counts[0][0], f.tok) : '';
const tgt = rule.target || (toPack ? st.S.packSize : 1);
const out = r.fmtUnit(tgt, r.labelFor(f.id, tgt));
return `<article class="uc ${rule.convert ? 'on' : ''}" data-f="${esc(f.id)}">
<header><div class="uc-t"><b>${esc(f.title)}</b><span>${f.rows} row${f.rows > 1 ? 's' : ''} · ${Object.keys(f.tokens).filter(Boolean).map(esc).join(', ') || '—'}</span></div>${sw(rule.convert, 'data-a="conv" aria-label="Convert ' + esc(f.title) + '"')}</header>
<div class="uc-flow"><span class="upill">${esc(ex)}</span>${icon('arrow', 'was-ar')}<span class="upill conv">${rule.convert ? esc(out) : 'unchanged'}</span></div>
<div class="uc-counts">${counts.slice(0, 6).map(([c, n]) => `<span>${E.fmtN(c)}<b>×${n}</b></span>`).join('')}</div>
<div class="uc-set ${rule.convert ? '' : 'dim'}">
<label><span>${toPack ? 'Pack of' : 'Convert to'}</span><div class="uc-step" data-a="target"></div></label>
<label><span>Label</span><input class="field sm" data-a="label" value="${esc(rule.label)}" placeholder="${esc(r.labelFor(f.id, 2))}"></label>
</div>
<footer><button class="link" data-a="rows">${icon('sheet')}See rows</button>${!rule.auto !== !rule.convert || rule.target || rule.label ? `<button class="link" data-a="reset">${icon('reset')}Auto</button>` : `<span class="muted">auto</span>`}</footer>
</article>`;
}

function wireCard(card, r, toPack) {
const id = card.dataset.f, rule = r.famRule(id);
const upd = (label, fn) => ST.commit(label, d => { const o = d.fam[id] ||= {}; fn(o); if (!Object.keys(o).length) delete d.fam[id]; });
$('[data-a="conv"]', card).onclick = () => upd(rule.convert ? 'Turn unit off' : 'Turn unit on', o => { const v = !rule.convert; if (v === rule.auto) delete o.convert; else o.convert = v; });
stepper($('[data-a="target"]', card), {value: rule.target || (toPack ? st.S.packSize : 1), min: 1, max: 10000, onChange: v => upd('Unit target', o => { const def = toPack ? st.S.packSize : 1; if (v === def) delete o.target; else o.target = v; })});
const li = $('[data-a="label"]', card);
li.onchange = () => upd('Unit label', o => { const v = li.value.trim(); if (v) o.label = v; else delete o.label; });
li.onkeydown = e => e.key === 'Enter' && li.blur();
$('[data-a="rows"]', card).onclick = () => showRows(id);
const rs = $('[data-a="reset"]', card); if (rs) rs.onclick = () => ST.commit('Unit back to auto', d => { delete d.fam[id]; });
}

function unkRow(f, r) {
const rule = r.famRule(f.id);
return `<article class="unk" data-f="${esc(f.id)}">
<span class="upill">${esc(f.title)}</span><span class="unk-n">${f.rows} row${f.rows > 1 ? 's' : ''}${f.measure ? ' · a measure, not a count' : ''}</span>
<span class="grow"></span>
${f.measure || f.id === 'x:#' ? '' : '<button class="unk-map"></button>'}
<button class="btn ghost sm unk-rows">${icon('sheet')}Rows</button>
</article>`;
}

let dupFilter = 'all';
A.views.dups = {
render(main) {
const r = ST.res();
const G = r.groups;
const counts = {all: G.length, review: G.filter(g => g.review).length, merged: G.filter(g => g.mode === 'merge').length, kept: G.filter(g => g.mode === 'keep').length};
if (!counts[dupFilter] && dupFilter !== 'all') dupFilter = 'all';
const list = G.filter(g => dupFilter === 'all' || (dupFilter === 'review' ? g.review : dupFilter === 'merged' ? g.mode === 'merge' : g.mode === 'keep'));
main.innerHTML = `
<section class="view-head">
<div><h2>Duplicates</h2><p>Same name and same new unit. ${st.S.dupMode === 'smart' ? `Merged on their own when prices are within ${st.S.tolerance}%, otherwise left for you.` : st.S.dupMode === 'merge' ? 'Merged by default.' : 'Kept separate by default.'} <button class="link" id="dup-set">Change</button></p></div>
</section>
${G.length ? `<div class="dup-bar"><div id="dup-seg"></div><span class="grow"></span>
<button class="btn ghost sm" id="dup-merge-all">${icon('merge')}Merge shown</button><button class="btn ghost sm" id="dup-keep-all">${icon('split')}Keep shown separate</button>${G.some(g => !g.auto) ? `<button class="btn ghost sm" id="dup-auto">${icon('reset')}All auto</button>` : ''}</div>
<section class="dup-list">${list.map(g => groupCard(g)).join('')}</section>` : `<div class="empty-card big">${icon('dups')}<b>No duplicates</b><span>Every name and unit pair is unique. To combine rows by hand, select them in the Sheet and press Merge.</span></div>`}`;
$('#dup-set', main).onclick = () => { A.settingsFocus = 'dups'; A.go('settings'); };
if (!G.length) return;
seg($('#dup-seg', main), {value: dupFilter, options: [{value: 'all', label: 'All', count: counts.all}, {value: 'review', label: 'Review', count: counts.review}, {value: 'merged', label: 'Merged', count: counts.merged}, {value: 'kept', label: 'Separate', count: counts.kept}], onChange: v => { dupFilter = v; this.render(main); }});
$('#dup-merge-all', main).onclick = () => A.groupMode(list, 'merge');
$('#dup-keep-all', main).onclick = () => A.groupMode(list, 'keep');
const au = $('#dup-auto', main); if (au) au.onclick = () => ST.commit('Duplicates back to auto', d => { d.groups = {}; });
$$('.dg', main).forEach(card => wireGroup(card, r));
if (A.focusGroup) { const c = $$('.dg', main).find(x => x.dataset.k === A.focusGroup); if (c) { c.scrollIntoView({block: 'center'}); c.classList.add('flash'); } A.focusGroup = null; }
},
update() { const y = $('#view').scrollTop; this.render($('#view')); $('#view').scrollTop = y; }
};

const RULES = [{value: 'weighted', label: 'Weighted by qty'}, {value: 'avg', label: 'Average'}, {value: 'max', label: 'Highest'}, {value: 'min', label: 'Lowest'}, {value: 'first', label: 'First row'}, {value: 'last', label: 'Last row'}];

function groupCard(g) {
const out = new Set(g.ov.out || []);
const m = g.merged;
const spread = g.spread * 100;
return `<article class="dg ${g.mode === 'merge' ? 'is-merge' : 'is-keep'} ${g.review ? 'review' : ''}" data-k="${esc(g.key)}">
<header>
<div class="dg-t"><b>${esc(g.name)}</b><span><span class="upill sm">${esc(g.unit)}</span>${g.members.length} rows${g.conflict ? ` · <em class="warn">prices differ ${spread > 999 ? '>999' : spread.toFixed(0)}%</em>` : ' · prices agree'}${g.fuzzy ? ' · <em class="warn">similar names</em>' : ''}${g.manual ? ' · merged by you' : ''}</span></div>
<div class="dg-mode"></div>
</header>
<div class="dg-rows">${g.members.map(x => `<div class="dg-r ${g.mode === 'merge' && out.has(x.rid) ? 'out' : ''}" data-rid="${x.rid}">
${g.mode === 'merge' ? `<button class="ck sm ${out.has(x.rid) ? '' : 'on'}" data-a="inc" aria-label="Include in merge">${icon('check')}</button>` : '<span class="dg-dot"></span>'}
<span class="dg-src">row ${x.rid + 2}</span><span class="dg-u" title="${esc(x.name)}">${g.fuzzy ? esc(x.name) + ' · ' : ''}${esc(x.unitRaw)}</span>
<span class="dg-p"><small>price</small>${esc(fmt(x.newPrice, 8) || '—')}</span><span class="dg-q"><small>qty</small>${esc(fmt(x.newQty, 8) || '—')}</span></div>`).join('')}</div>
${g.mode === 'merge' ? `<footer class="dg-f">
<div class="dg-res">${icon('merge')}<span>${m ? `<b>${esc(fmt(m.newPrice, 8) || '—')}</b> price · <b>${esc(fmt(m.newQty, 8) || '—')}</b> qty` : 'Pick at least two rows'}</span></div>
<span class="grow"></span><span class="muted">Price</span><button class="dg-rule"></button>${g.ov.price != null || g.ov.qty != null ? `<button class="link" data-a="unedit">${icon('reset')}Calculated</button>` : ''}
</footer>` : ''}
</article>`;
}

function wireGroup(card, r) {
const g = r.groups.find(x => x.key === card.dataset.k); if (!g) return;
seg($('.dg-mode', card), {value: g.mode, options: [{value: 'merge', label: 'Merge', icon: 'merge'}, {value: 'keep', label: 'Separate', icon: 'split'}], onChange: v => A.groupMode([g], v)});
$$('[data-a="inc"]', card).forEach(b => b.onclick = () => {
const rid = +b.closest('.dg-r').dataset.rid;
if (g.manual) return ST.commit('Take out of merge', d => { delete d.rows[rid].mg; A.tidy(d, rid); });
ST.commit('Change merge rows', d => {
const o = d.groups[g.key] ||= {};
const set = new Set(o.out || []);
set.has(rid) ? set.delete(rid) : set.add(rid);
o.out = [...set];
A.tidyG(d, g.key);
});
});
const rb = $('.dg-rule', card);
if (rb) select(rb, {value: g.rule, options: RULES, onChange: v => ST.commit('Merge price rule', d => { const o = d.groups[g.key] ||= {}; if (v === st.S.mergeRule) delete o.rule; else o.rule = v; A.tidyG(d, g.key); })});
const ue = $('[data-a="unedit"]', card);
if (ue) ue.onclick = () => ST.commit('Reset merged values', d => { const o = d.groups[g.key]; delete o.price; delete o.qty; A.tidyG(d, g.key); });
}

A.views.columns = {
render(main) {
const cols = st.doc.columns.filter(c => !c.key.startsWith('o:') || +c.key.slice(2) < st.src.headers.length);
const on = cols.filter(c => c.on).length;
main.innerHTML = `
<section class="view-head">
<div><h2>Columns</h2><p>What you see here is what gets exported. Drag to reorder, tap to rename.</p></div>
<div class="vh-act"><div id="preset-seg"></div></div>
</section>
<section class="col-layout">
<div class="card col-list-card">
<header class="cl-h"><b>${on} shown</b><span class="muted">of ${cols.length}</span><span class="grow"></span><button class="link" id="save-layout">${icon('check')}Use as my default</button></header>
<ol class="col-list" id="col-list">${cols.map((c, idx) => colRow(c, idx)).join('')}</ol>
</div>
<aside class="card col-side">
<h3>New name</h3>
<p class="muted">Template for the <b>${esc(st.S.labels['new.name'])}</b> column. Use {name}, {unit} and {old}.</p>
<input class="field" id="name-tpl" value="${esc(st.S.nameTpl)}" spellcheck="false">
<div class="tpl-chips">${['{name}', '{name} {unit}', '{name} ({unit})', '{name} - {old}'].map(t => `<button class="qchip sm ${st.S.nameTpl === t ? 'on' : ''}" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>
<div class="tpl-prev" id="tpl-prev"></div>
</aside>
</section>`;
seg($('#preset-seg', main), {value: st.S.preset, options: [{value: 'clean', label: 'Clean', title: 'Name, new unit, new qty, new price'}, {value: 'side', label: 'Side by side', title: 'Old and new values'}, {value: 'full', label: 'Everything', title: 'All useful source columns plus new ones'}].concat(st.S.layout ? [{value: 'mine', label: 'My default'}] : []), onChange: v => {
ST.st.S.preset = v; ST.setS({preset: v});
ST.commit('Column preset', d => { d.columns = ST.buildColumns(v === 'mine' ? null : v); d.colsTouched = false; });
}});
$('#save-layout', main).onclick = () => { ST.saveLayout(); ST.setS({preset: 'mine'}); toast('Saved. New files open with this layout.', {icon: 'check'}); };
const tpl = $('#name-tpl', main);
const prev = () => { const it = ST.res().items.find(i => i.name && i.converted) || ST.res().items.find(i => i.name); $('#tpl-prev', main).innerHTML = it ? `${icon('eye')}<span>${esc(E.value(it, 'new.name', {...st.S, nameTpl: tpl.value}))}</span>` : ''; };
prev();
tpl.oninput = prev;
tpl.onchange = () => ST.setS({nameTpl: tpl.value || '{name}'});
$$('.tpl-chips .qchip', main).forEach(b => b.onclick = () => { tpl.value = b.dataset.t; ST.setS({nameTpl: b.dataset.t}); });
const list = $('#col-list', main);
list.onclick = e => {
const li = e.target.closest('.cl-r'); if (!li) return;
const key = li.dataset.k;
if (e.target.closest('[data-a="tog"]')) ST.commit('Toggle column', d => { const c = d.columns.find(x => x.key === key); c.on = !c.on; d.colsTouched = true; });
else if (e.target.closest('[data-a="up"]')) move(key, -1);
else if (e.target.closest('[data-a="down"]')) move(key, 1);
};
$$('.cl-name', list).forEach(inp => {
inp.onkeydown = e => { if (e.key === 'Enter') inp.blur(); if (e.key === 'Escape') { inp.value = inp.dataset.orig; inp.blur(); } };
inp.onchange = () => { const key = inp.closest('.cl-r').dataset.k; const v = inp.value.trim(); ST.commit('Rename column', d => { const c = d.columns.find(x => x.key === key); const def = A.colMeta(key).label; if (!v || v === def) delete c.label; else c.label = v; d.colsTouched = true; }); };
});
dragSort(list);
},
update() { this.render($('#view')); }
};

function colRow(c, idx) {
const m = A.colMeta(c.key);
const ign = m.i != null && st.doc.ignored.includes(m.i);
const sample = (() => { const it = ST.res().items.find(i => !i.excluded && E.value(i, c.key, st.S) != null); return it ? E.value(it, c.key, st.S) : ''; })();
return `<li class="cl-r ${c.on ? 'on' : ''} ${m.isNew ? 'new' : ''}" data-k="${esc(c.key)}">
<span class="cl-grip" title="Drag">${icon('grip')}</span>
${sw(c.on, 'data-a="tog" aria-label="Show column"')}
<span class="cl-tag">${m.role ? `<i class="role-dot r-${m.role}"></i>${A.ROLES[m.role].label}` : m.isNew ? '<i class="new-dot"></i>New' : ign ? 'Ignored' : 'Source'}</span>
<input class="cl-name" value="${esc(A.colLabel(c))}" data-orig="${esc(A.colLabel(c))}" aria-label="Column name">
<span class="cl-sample">${esc(typeof sample === 'number' ? fmt(sample, 8) : sample)}</span>
<span class="cl-mv"><button class="icon-btn" data-a="up" aria-label="Move up">${icon('sortUp')}</button><button class="icon-btn" data-a="down" aria-label="Move down">${icon('sortDown')}</button></span>
</li>`;
}

function move(key, d) {
ST.commit('Reorder columns', doc => {
const i = doc.columns.findIndex(c => c.key === key), j = i + d;
if (j < 0 || j >= doc.columns.length) return;
const [c] = doc.columns.splice(i, 1); doc.columns.splice(j, 0, c); doc.colsTouched = true;
});
}

function dragSort(list) {
let drag = null;
list.addEventListener('pointerdown', e => {
const g = e.target.closest('.cl-grip'); if (!g) return;
e.preventDefault();
const li = g.closest('.cl-r');
const rect = li.getBoundingClientRect();
const ghost = li.cloneNode(true); ghost.classList.add('cl-ghost'); ghost.style.width = rect.width + 'px'; ghost.style.left = rect.left + 'px'; ghost.style.top = rect.top + 'px';
document.body.appendChild(ghost);
li.classList.add('dragging');
drag = {li, ghost, dy: e.clientY - rect.top, key: li.dataset.k};
const mv = ev => {
drag.ghost.style.top = (ev.clientY - drag.dy) + 'px';
const sib = [...list.children].filter(x => x !== drag.li);
const after = sib.find(x => { const r = x.getBoundingClientRect(); return ev.clientY < r.top + r.height / 2; });
after ? list.insertBefore(drag.li, after) : list.appendChild(drag.li);
};
const up = () => {
removeEventListener('pointermove', mv); removeEventListener('pointerup', up);
const order = [...list.children].map(x => x.dataset.k);
drag.ghost.remove(); drag.li.classList.remove('dragging');
drag = null;
ST.commit('Reorder columns', d => {
const map = new Map(d.columns.map(c => [c.key, c]));
const rest = d.columns.filter(c => !order.includes(c.key));
d.columns = order.map(k => map.get(k)).filter(Boolean).concat(rest);
d.colsTouched = true;
});
};
addEventListener('pointermove', mv); addEventListener('pointerup', up);
});
}

function exportData(scope) {
A.flushEdit && A.flushEdit();
const r = ST.fresh();
const cols = A.visibleCols();
const items = scope === 'view' ? E.viewItems(r, st.view, cols, st.S) : r.items.filter(i => !i.excluded);
const head = cols.map(c => A.colLabel(c));
const rows = items.map(it => cols.map(c => E.value(it, c.key, st.S)));
return {head, rows, cols, items};
}
A.exportData = exportData;
const viewFiltered = () => st.view.quick !== 'all' || st.view.rules.length || st.view.search || st.view.family || st.view.flag || st.view.sort;

A.views.export = {
render(main) {
const scope = viewFiltered() ? st.S.scope : 'all';
const data = exportData(scope);
const name = st.src.name + '-bugvert';
main.innerHTML = `
<section class="exp">
<div class="card exp-main">
<header class="exp-h"><div class="exp-ic">${icon('export')}</div><div><h2>Export</h2><p>Exactly what the sheet shows, recalculated at the moment you export.</p></div></header>
<div class="exp-sum"><span><b>${data.rows.length}</b> rows</span><span>×</span><span><b>${data.cols.length}</b> columns</span>${ST.res().stats.excluded ? `<span class="muted">${ST.res().stats.excluded} excluded</span>` : ''}</div>
<div class="exp-opts">
${viewFiltered() ? `<label><span>Rows</span><div id="exp-scope"></div></label>` : ''}
<label><span>Format</span><div id="exp-fmt"></div></label>
<label><span>File name</span><div class="fn"><input class="field" id="exp-name" value="${esc(name)}" spellcheck="false"><em>.${st.S.fmt === 'csv' ? 'csv' : 'xlsx'}</em></div></label>
</div>
<div class="exp-act"><button class="btn ghost lg" id="exp-copy">${icon('copy')}Copy</button><button class="btn primary lg" id="exp-dl">${icon('export')}Download</button></div>
</div>
<div class="card exp-prev"><header><b>Preview</b><button class="link" id="exp-cols">${icon('columns')}Edit columns</button></header>
<div class="prev-wrap"><table><thead><tr>${data.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${data.rows.slice(0, 12).map(r => `<tr>${r.map(v => `<td class="${typeof v === 'number' ? 'num' : ''}">${esc(typeof v === 'number' ? fmt(v, 10) : v ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>${data.rows.length > 12 ? `<div class="prev-more">+ ${data.rows.length - 12} more rows</div>` : ''}${!data.rows.length ? '<div class="prev-more">Nothing to export</div>' : ''}</div></div>
</section>`;
if (viewFiltered()) seg($('#exp-scope', main), {value: st.S.scope, options: [{value: 'view', label: 'Current view', count: exportData('view').rows.length}, {value: 'all', label: 'All rows', count: exportData('all').rows.length}], onChange: v => ST.setS({scope: v})});
seg($('#exp-fmt', main), {value: st.S.fmt, options: [{value: 'xlsx', label: 'Excel'}, {value: 'csv', label: 'CSV'}], onChange: v => ST.setS({fmt: v})});
$('#exp-cols', main).onclick = () => A.go('columns');
$('#exp-copy', main).onclick = () => {
const d = exportData(scope);
if (!d.cols.length || !d.rows.length) return toast('Nothing to copy', {tone: 'warn', icon: 'alert'});
const cell = v => v == null ? '' : String(v).replace(/[\t\r\n]+/g, ' ');
A.copyText([d.head].concat(d.rows).map(r => r.map(cell).join('\t')).join('\n'));
};
$('#exp-dl', main).onclick = () => {
const d = exportData(viewFiltered() ? st.S.scope : 'all');
if (!d.cols.length) return toast('Turn on at least one column', {tone: 'warn', icon: 'alert'});
if (!d.rows.length) return toast('No rows to export', {tone: 'warn', icon: 'alert'});
const fname = ($('#exp-name', main).value.trim() || name).replace(/[\\/:*?"<>|]+/g, '-');
const grid = [d.head].concat(d.rows);
const ws = XLSX.utils.aoa_to_sheet(grid);
ws['!cols'] = d.head.map((_, c) => ({wch: Math.min(48, Math.max(8, ...grid.slice(0, 300).map(r => String(r[c] ?? '').length + 2)))}));
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'bugvert');
if (st.S.fmt === 'csv') XLSX.writeFile(wb, fname + '.csv', {bookType: 'csv'});
else XLSX.writeFile(wb, fname + '.xlsx');
toast(`Exported ${d.rows.length} rows`, {icon: 'export'});
};
},
update() { this.render($('#view')); }
};

A.views.settings = {
render(main) {
const S = st.S;
const memN = Object.keys(st.mem).length;
const al = Object.entries(S.aliases);
main.innerHTML = `
<section class="view-head"><div><h2>Settings</h2><p>Saved in this browser and used for every file.</p></div><div class="vh-act"><button class="btn ghost" id="set-reset">${icon('reset')}Reset defaults</button></div></section>
<section class="set-grid">
<article class="card set" id="set-look"><h3>${icon('sun')}Appearance</h3>
${row('Theme', 'System follows your device setting', '<div id="s-theme"></div>')}
${row('Row density', '', '<div id="s-density"></div>')}
</article>
<article class="card set" id="set-conv"><h3>${icon('units')}Conversion</h3>
${row('Default pack size', 'Used for single → pack when nothing better is known', '<div id="s-pack"></div>')}
${row('Detect direction', 'Choose pack → single or single → pack from the data', sw(S.autoDir, 'data-k="autoDir"'))}
${row('Repack existing packs', 'In single → pack, also change rows that are already packs', sw(S.repack, 'data-k="repack"'))}
${row('Pack size from item names', 'Reads “Panadol 24s”, “x 30” or “20 tabs” in single → pack', sw(S.useName, 'data-k="useName"'))}
${row('Remember packs per item', `Learns “Amoxicillin 500 = 8 C” from files you open · ${memN} remembered`, sw(S.useMemory, 'data-k="useMemory"'))}
<div class="set-foot"><button class="link" id="mem-learn">${icon('brain')}Learn from this file</button>${memN ? `<button class="link danger" id="mem-clear">${icon('trash')}Forget all</button>` : ''}</div>
</article>
<article class="card set" id="set-round"><h3>${icon('dot')}Rounding</h3>
${row('Price decimals', '', '<div id="s-pdec"></div>')}
${row('Price rounding', '', '<div id="s-pmode"></div>')}
${row('Quantity decimals', '', '<div id="s-qdec"></div>')}
${row('Quantity rounding', 'Round down to avoid counting stock you don’t have', '<div id="s-qmode"></div>')}
</article>
<article class="card set" id="set-label"><h3>${icon('edit')}Unit labels</h3>
${row('Label style', 'How new units are written', '<div id="s-style"></div>')}
${row('Space before label', '“1 T” or “1T”', sw(S.unitSpace, 'data-k="unitSpace"'))}
${row('Drop the 1', '“T” instead of “1 T”', sw(S.hideOne, 'data-k="hideOne"'))}
<div class="set-prev" id="s-prev"></div>
</article>
<article class="card set" id="set-dups"><h3>${icon('dups')}Duplicates</h3>
${row('Default action', '', '<div id="s-dmode"></div>')}
${row('Merged price', '', '<button id="s-mrule"></button>')}
${row('Price tolerance', 'Smart merges only when prices are this close', '<div id="s-tol"></div>')}
${row('Loose name match', 'Ignore case, spaces and punctuation', sw(S.dupLoose, 'data-k="dupLoose"'))}
${row('Near-duplicate names', 'Match small typos, word order and mg/tab noise. Always sent to review', sw(S.dupFuzzy, 'data-k="dupFuzzy"'))}
</article>
<article class="card set" id="set-rows"><h3>${icon('sheet')}Rows & columns</h3>
${row('Auto-exclude empty rows', 'Rows with no name and no unit', sw(S.autoJunk, 'data-k="autoJunk"'))}
${row('Columns for new files', '', '<button id="s-preset"></button>')}
</article>
<article class="card set" id="set-dict"><h3>${icon('brain')}Unit dictionary</h3>
<p class="muted">Your own spellings on top of the built-in list.</p>
<div class="dict">${al.map(([t, f]) => `<span class="dict-c"><b>${esc(t)}</b>${icon('arrow')}${esc(E.FAM[f] ? E.FAM[f][2] : f)}<button data-del="${esc(t)}" aria-label="Remove">${icon('x')}</button></span>`).join('') || '<span class="muted">Nothing added yet</span>'}</div>
<div class="dict-add"><input class="field" id="d-tok" placeholder="Word, e.g. Btl" spellcheck="false"><button id="d-fam"></button><button class="btn primary sm" id="d-add">${icon('plus')}Add</button></div>
</article>
</section>`;
const set = p => ST.setS(p);
$$('.switch[data-k]', main).forEach(b => b.onclick = () => set({[b.dataset.k]: !S[b.dataset.k]}));
seg($('#s-theme', main), {value: S.theme || 'system', options: A.THEMES, onChange: v => set({theme: v})});
seg($('#s-density', main), {value: S.density, options: [{value: 'comfy', label: 'Comfy'}, {value: 'compact', label: 'Compact'}], onChange: v => { document.body.dataset.density = v; set({density: v}); }});
stepper($('#s-pack', main), {value: S.packSize, min: 1, max: 1000, onChange: v => set({packSize: v})});
stepper($('#s-pdec', main), {value: S.priceDec, min: 0, max: 8, onChange: v => set({priceDec: v})});
stepper($('#s-qdec', main), {value: S.qtyDec, min: 0, max: 8, onChange: v => set({qtyDec: v})});
const modes = [{value: 'nearest', label: 'Nearest'}, {value: 'up', label: 'Up'}, {value: 'down', label: 'Down'}];
seg($('#s-pmode', main), {value: S.priceMode, options: modes, onChange: v => set({priceMode: v})});
seg($('#s-qmode', main), {value: S.qtyMode, options: modes, onChange: v => set({qtyMode: v})});
seg($('#s-style', main), {value: S.unitStyle, options: [{value: 'file', label: 'As in file'}, {value: 'short', label: 'Tab'}, {value: 'long', label: 'Tablets'}], onChange: v => set({unitStyle: v})});
seg($('#s-dmode', main), {value: S.dupMode, options: [{value: 'smart', label: 'Smart'}, {value: 'merge', label: 'Merge'}, {value: 'keep', label: 'Separate'}], onChange: v => set({dupMode: v})});
select($('#s-mrule', main), {value: S.mergeRule, options: RULES, onChange: v => set({mergeRule: v})});
stepper($('#s-tol', main), {value: S.tolerance, min: 0, max: 1000, suffix: '%', onChange: v => set({tolerance: v})});
select($('#s-preset', main), {value: S.preset, options: [{value: 'clean', label: 'Clean'}, {value: 'side', label: 'Side by side'}, {value: 'full', label: 'Everything'}].concat(S.layout ? [{value: 'mine', label: 'My default'}] : []), onChange: v => set({preset: v})});
const ex = st.src ? ST.res().items.find(i => i.converted && i.family === 'tab') || ST.res().items.find(i => i.converted) : null;
$('#s-prev', main).innerHTML = ex ? `<span class="upill">${esc(ex.unitRaw)}</span>${icon('arrow', 'was-ar')}<span class="upill conv">${esc(ex.newUnit)}</span>` : `<span class="upill">10 T</span>${icon('arrow', 'was-ar')}<span class="upill conv">${esc((S.hideOne ? '' : '1' + (S.unitSpace ? ' ' : '')) + (S.unitStyle === 'short' ? 'Tab' : S.unitStyle === 'long' ? 'Tablet' : 'T'))}</span>`;
let fam = 'tab';
const fb = $('#d-fam', main);
const paintFam = () => select(fb, {value: fam, options: FAMS.map(k => ({value: k, label: E.FAM[k][2]})), onChange: v => { fam = v; paintFam(); }});
paintFam();
$('#d-add', main).onclick = () => {
const t = $('#d-tok', main).value.trim().toUpperCase().replace(/[.\s]/g, '');
if (!t) return $('#d-tok', main).focus();
set({aliases: {...S.aliases, [t]: fam}});
toast(`“${t}” means ${E.FAM[fam][2]}`, {icon: 'brain'});
};
$('#d-tok', main).onkeydown = e => e.key === 'Enter' && $('#d-add', main).click();
$$('[data-del]', main).forEach(b => b.onclick = () => { const a = {...S.aliases}; delete a[b.dataset.del]; set({aliases: a}); });
$('#mem-learn', main).onclick = () => { if (!st.src) return toast('Open a file with packs first', {tone: 'warn', icon: 'alert'}); const n = ST.learn(true); ST.emit('settings'); toast(n ? `Learned ${n} pack sizes` : 'No packs found to learn', {icon: 'brain'}); };
const mc = $('#mem-clear', main); if (mc) mc.onclick = async () => { if (await confirm({title: 'Forget remembered packs?', body: `${memN} items will go back to the default pack size.`, ok: 'Forget', danger: true})) ST.clearMem(); };
$('#set-reset', main).onclick = async () => { if (await confirm({title: 'Reset settings?', body: 'Rounding, labels, duplicates and column defaults go back to defaults. Your dictionary and memory are kept.', ok: 'Reset'})) ST.resetS(); };
if (A.settingsFocus) { const c = $('#set-' + A.settingsFocus, main); if (c) { c.scrollIntoView({block: 'center'}); c.classList.add('flash'); } A.settingsFocus = null; }
},
update() { const y = $('#view').scrollTop; this.render($('#view')); $('#view').scrollTop = y; }
};
function row(t, h, ctl) { return `<div class="set-r"><div class="set-l"><b>${esc(t)}</b>${h ? `<small>${esc(h)}</small>` : ''}</div><div class="set-c">${ctl}</div></div>`; }
})();
