(() => {
const {$, $$, esc, icon, toast, menu, popover, closePop, select, seg, sw, stepper, confirm, fmt, flash} = UI;
const E = Engine, ST = Store, st = Store.st, A = App;
const FAMS = Object.keys(E.FAM);

A.views.units = {
render(main) {
const r = ST.res();
const fams = Object.values(r.fams).sort((a, b) => (a.known === b.known ? 0 : a.known ? -1 : 1) || b.rows - a.rows);
const toPack = st.doc.dir === 'toPack';
const known = fams.filter(f => f.known), other = fams.filter(f => !f.known);
const tsrc = {};
r.rowItems.forEach(it => { if (!it.excluded && it.parsed) tsrc[it.tsrc] = (tsrc[it.tsrc] || 0) + 1; });
A.paint(main, `
<section class="view-head">
<div><h2>Units</h2><p>${toPack ? `Singles become packs. Order: ${r.cfg.order.map(k => esc(Logic.ORDER[k].toLowerCase())).join(' → ')} → default <b>${st.S.packSize}</b>${r.cfg.nameMode === 'off' ? ' (names off)' : ''}. <button class="link" id="u-tune">Change</button>` : 'Packs become singles. Turn a unit off to leave it as it is, or give it a different target.'}</p></div>
<div class="vh-stats">${Object.entries(tsrc).filter(([k]) => A.TSRC[k]).map(([k, n]) => `<span class="mini t-${k}" data-key="t-${k}"><b>${n}</b>${esc(A.TSRC[k])}</span>`).join('')}</div>
</section>
<section class="unit-grid" id="unit-grid">${known.map(f => unitCard(f, r, toPack)).join('') || '<div class="empty-card">No known units yet. Check the unit column in Source.</div>'}</section>
${other.length ? `<section class="sec-block" id="unk-block"><header class="sec-head"><div><h3>Unrecognized</h3><p>Tell bugvert what these words mean once. It's saved in your dictionary.</p></div></header>
<div class="unk-list">${other.map(f => unkRow(f, r)).join('')}</div></section>` : ''}`);
$$('.uc', main).forEach(card => wireCard(card, r, toPack));
const ut = $('#u-tune', main); if (ut) ut.onclick = () => { A.settingsFocus = 'detect'; A.go('settings'); };
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

function showRows(fam) { ST.setView({family: fam}); A.go('sheet'); }

function unitCard(f, r, toPack) {
const rule = r.famRule(f.id);
const counts = Object.entries(f.counts).sort((a, b) => b[1] - a[1]);
const ex = f.tok ? r.fmtUnit(counts[0][0], f.tok) : '';
const tgt = rule.target || (toPack ? st.S.packSize : 1);
const out = r.fmtUnit(tgt, r.labelFor(f.id, tgt));
return `<article class="uc ${rule.convert ? 'on' : ''}" data-key="uc-${esc(f.id)}" data-f="${esc(f.id)}">
<header><div class="uc-t"><b>${esc(f.title)}</b><span>${f.rows} row${f.rows > 1 ? 's' : ''}${f.fromName ? ` · ${f.fromName} from names` : ''} · ${Object.keys(f.tokens).filter(Boolean).map(esc).join(', ') || '—'}</span></div>${sw(rule.convert, 'data-a="conv" aria-label="Convert ' + esc(f.title) + '"')}</header>
<div class="uc-flow"><span class="upill">${esc(ex)}</span>${icon('arrow', 'was-ar')}<span class="upill conv">${rule.convert ? esc(out) : 'unchanged'}</span></div>
<div class="uc-counts">${counts.slice(0, 6).map(([c, n]) => `<span>${E.fmtN(c)}<b>×${n}</b></span>`).join('')}</div>
<div class="uc-set ${rule.convert ? '' : 'dim'}">
<label><span>${toPack ? 'Pack of' : 'Convert to'}</span><div class="uc-step" data-a="target"></div></label>
<label><span>Label</span><input class="field sm" data-a="label" value="${esc(rule.label)}" placeholder="${esc(r.labelFor(f.id, 2))}"></label>
</div>
<footer><button class="link" data-a="rows">${icon('sheet')}See rows</button>${!rule.auto !== !rule.convert || rule.target || rule.label ? `<button class="link" data-a="reset">${icon('reset')}Back to auto</button>` : `<span class="pill-note">auto</span>`}</footer>
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
return `<article class="unk" data-key="unk-${esc(f.id)}" data-f="${esc(f.id)}">
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
const smartList = list.filter(g => g.smartOk && g.mode !== 'merge' && !g.manual);
const smartN = smartList.length;
A.paint(main, `
<section class="view-head">
<div><h2>Duplicates</h2><p>Same name and same new unit. ${st.S.dupMode === 'smart' ? `Merged on their own when prices are within ${st.S.tolerance}%, otherwise left for you.` : st.S.dupMode === 'merge' ? 'All merged by default.' : 'Kept separate, as in your file. Merge only the ones you pick, or use Smart merge.'} <button class="link" id="dup-set">Change</button></p></div>
</section>
${G.length ? `<div class="dup-bar" id="dup-bar"><div id="dup-seg"></div><span class="grow"></span>
${smartN ? `<button class="btn primary sm" id="dup-smart" title="Merge groups whose prices are within ${st.S.tolerance}% and names match exactly">${icon('spark')}Smart merge ${smartN}</button>` : ''}<button class="btn ghost sm" id="dup-merge-all">${icon('merge')}Merge shown</button><button class="btn ghost sm" id="dup-keep-all">${icon('split')}Keep shown separate</button>${G.some(g => !g.auto) ? `<button class="btn ghost sm" id="dup-auto">${icon('reset')}All auto</button>` : ''}</div>
<section class="dup-list" id="dup-list">${list.map(g => groupCard(g)).join('')}</section>` : `<div class="empty-card big" id="dup-empty">${icon('dups')}<b>No duplicates</b><span>Every name and unit pair is unique. To combine rows by hand, select them in the Sheet and press Merge.</span></div>`}`);
$('#dup-set', main).onclick = () => { A.settingsFocus = 'dups'; A.go('settings'); };
if (!G.length) return;
seg($('#dup-seg', main), {value: dupFilter, options: [{value: 'all', label: 'All', count: counts.all}, {value: 'review', label: 'Review', count: counts.review}, {value: 'merged', label: 'Merged', count: counts.merged}, {value: 'kept', label: 'Separate', count: counts.kept}], onChange: v => { dupFilter = v; this.render(main); }});
$('#dup-merge-all', main).onclick = () => A.groupMode(list, 'merge');
const sm = $('#dup-smart', main); if (sm) sm.onclick = () => A.groupMode(smartList, 'merge');
$('#dup-keep-all', main).onclick = () => A.groupMode(list, 'keep');
const au = $('#dup-auto', main); if (au) au.onclick = () => ST.commit('Duplicates back to auto', d => { d.groups = {}; });
$$('.dg', main).forEach(card => wireGroup(card, r));
if (A.focusGroup) { const c = $$('.dg', main).find(x => x.dataset.k === A.focusGroup); if (c) { c.scrollIntoView({block: 'center'}); flash(c); } A.focusGroup = null; }
},
update() { this.render($('#view')); }
};

const RULES = [{value: 'weighted', label: 'Weighted by qty'}, {value: 'avg', label: 'Average'}, {value: 'max', label: 'Highest'}, {value: 'min', label: 'Lowest'}, {value: 'first', label: 'First row'}, {value: 'last', label: 'Last row'}];

function groupCard(g) {
const out = new Set(g.ov.out || []);
const m = g.merged;
const spread = g.spread * 100;
return `<article class="dg ${g.mode === 'merge' ? 'is-merge' : 'is-keep'} ${g.review ? 'review' : ''}" data-key="dg-${esc(g.key)}" data-k="${esc(g.key)}">
<header>
<div class="dg-t"><b>${esc(g.name)}</b><span><span class="upill sm">${esc(g.unit)}</span>${g.members.length} rows${g.conflict ? ` · <em class="warn">prices differ ${spread > 999 ? '>999' : spread.toFixed(0)}%</em>` : ' · prices agree'}${g.fuzzy ? ' · <em class="warn">similar names</em>' : ''}${g.manual ? ' · merged by you' : ''}</span></div>
<div class="dg-mode"></div>
</header>
<div class="dg-rows">${g.members.map(x => `<div class="dg-r ${g.mode === 'merge' && out.has(x.rid) ? 'out' : ''}" data-key="r-${x.rid}" data-rid="${x.rid}">
${g.mode === 'merge' ? `<button class="ck sm ${out.has(x.rid) ? '' : 'on'}" data-a="inc" aria-pressed="${!out.has(x.rid)}" aria-label="Include in merge">${icon('check')}</button>` : '<span class="dg-dot"></span>'}
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
const first = cols[0] && cols[0].key, last = cols.length && cols[cols.length - 1].key;
A.colEnds = {first, last};
const on = cols.filter(c => c.on).length;
A.paint(main, `
<section class="view-head">
<div><h2>Columns</h2><p>What you see here is what gets exported. Drag to reorder, tap to rename.</p></div>
<div class="vh-act"><div id="preset-seg"></div></div>
</section>
<section class="col-layout">
<div class="card col-list-card">
<header class="cl-h"><b>${on} shown</b><span class="muted">of ${cols.length}</span><span class="grow"></span><button class="link" id="save-layout">${icon('check')}Use as my default</button></header>
<ol class="col-list" id="col-list">${cols.map(c => colRow(c, sampleOf(c.key))).join('')}</ol>
</div>
<aside class="card col-side">
<h3>New name</h3>
<p class="muted">Template for the <b>${esc(st.S.labels['new.name'])}</b> column. Use {name}, {unit} and {old}.</p>
<input class="field" id="name-tpl" value="${esc(st.S.nameTpl)}" spellcheck="false">
<div class="tpl-chips">${['{name}', '{name} {unit}', '{name} ({unit})', '{name} - {old}'].map(t => `<button class="qchip sm ${st.S.nameTpl === t ? 'on' : ''}" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>
<div class="tpl-prev" id="tpl-prev"></div>
</aside>
</section>`);
seg($('#preset-seg', main), {value: st.S.preset, options: [{value: 'clean', label: 'Clean', title: 'Name, new unit, new qty, new price'}, {value: 'side', label: 'Side by side', title: 'Old and new values'}, {value: 'full', label: 'Everything', title: 'All useful source columns plus new ones'}].concat(st.S.layout ? [{value: 'mine', label: 'My default'}] : []), onChange: v => {
st.S.preset = v;
const changed = ST.commit('Column preset', d => { d.columns = ST.buildColumns(v === 'mine' ? null : v); d.colsTouched = false; });
ST.setS({preset: v});
if (changed === false) this.render(main);
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

function sampleOf(key) {
for (const i of ST.res().items) { if (i.excluded) continue; const v = E.value(i, key, st.S); if (v != null && v !== '') return v; }
return '';
}
function colRow(c, sample) {
const m = A.colMeta(c.key);
const ign = m.i != null && st.doc.ignored.includes(m.i);
return `<li class="cl-r ${c.on ? 'on' : ''} ${m.isNew ? 'new' : ''}" data-key="cl-${esc(c.key)}" data-k="${esc(c.key)}">
<span class="cl-grip" title="Drag">${icon('grip')}</span>
${sw(c.on, 'data-a="tog" aria-label="Show ' + esc(A.colLabel(c)) + '"')}
<span class="cl-tag">${m.role ? `<i class="role-dot r-${m.role}"></i>${A.ROLES[m.role].label}` : m.isNew ? '<i class="new-dot"></i>New' : ign ? 'Ignored' : 'Source'}</span>
<input class="cl-name" value="${esc(A.colLabel(c))}" data-orig="${esc(A.colLabel(c))}" aria-label="Column name">
<span class="cl-sample">${esc(typeof sample === 'number' ? fmt(sample, 8) : sample)}</span>
<span class="cl-mv"><button class="icon-btn" data-a="up" aria-label="Move up" ${A.colEnds && A.colEnds.first === c.key ? 'disabled' : ''}>${icon('sortUp')}</button><button class="icon-btn" data-a="down" aria-label="Move down" ${A.colEnds && A.colEnds.last === c.key ? 'disabled' : ''}>${icon('sortDown')}</button></span>
</li>`;
}

function move(key, d) {
ST.commit('Reorder columns', doc => {
const vis = doc.columns.filter(c => !c.key.startsWith('o:') || +c.key.slice(2) < st.src.headers.length);
const vi = vis.findIndex(c => c.key === key), other = vis[vi + d];
if (vi < 0 || !other) return;
const i = doc.columns.indexOf(vis[vi]), j = doc.columns.indexOf(other);
[doc.columns[i], doc.columns[j]] = [doc.columns[j], doc.columns[i]]; doc.colsTouched = true;
});
}

function dragSort(list) {
let drag = null;
list.onpointerdown = e => {
const g = e.target.closest('.cl-grip'); if (!g) return;
e.preventDefault();
const li = g.closest('.cl-r');
const rect = li.getBoundingClientRect();
const ghost = li.cloneNode(true); ghost.classList.add('cl-ghost'); ghost.removeAttribute('data-key'); ghost.style.width = rect.width + 'px'; ghost.style.left = rect.left + 'px'; ghost.style.top = rect.top + 'px';
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
removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
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
addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
};
}

const SECTIONS = [
{id: 'detect', label: 'Detection', icon: 'spark', hint: 'How units and pack sizes are read'},
{id: 'patterns', label: 'Name patterns', icon: 'search', hint: 'Pack sizes written inside item names'},
{id: 'conv', label: 'Conversion', icon: 'units', hint: 'Direction, default pack and memory'},
{id: 'round', label: 'Rounding', icon: 'dot', hint: 'Decimals for new prices and quantities'},
{id: 'label', label: 'Unit labels', icon: 'edit', hint: 'How new units are written'},
{id: 'dups', label: 'Duplicates', icon: 'dups', hint: 'Matching and merging repeated items'},
{id: 'rows', label: 'Rows & columns', icon: 'sheet', hint: 'Empty rows and column presets'},
{id: 'dict', label: 'Dictionary', icon: 'brain', hint: 'Your own unit spellings'},
{id: 'look', label: 'Appearance', icon: 'sun', hint: 'Theme and row density'}
];
let spyLock = 0;
function secHead(id, extra) {
const s = SECTIONS.find(x => x.id === id), n = SECTIONS.indexOf(s) + 1;
return `<header class="set-h"><span class="set-ic">${icon(s.icon)}</span><div class="set-ht"><span class="set-n">${String(n).padStart(2, '0')}</span><h3>${esc(s.label)}</h3><p>${esc(s.hint)}</p></div>${extra || ''}</header>`;
}
function setNav() {
return `<nav class="set-nav" id="set-nav" aria-label="Settings sections"><div class="sn-list" id="sn-list">${SECTIONS.map(s => `<a class="sn-b ${(A.settingsSec || 'detect') === s.id ? 'on' : ''}" href="#set-${s.id}" data-key="sn-${s.id}" data-sec="${s.id}">${icon(s.icon)}<span>${esc(s.label)}</span></a>`).join('')}</div></nav>`;
}
function markNav(id) {
if (A.settingsSec === id && $('.sn-b.on')?.dataset.sec === id) return;
A.settingsSec = id;
$$('.sn-b').forEach(b => { const on = b.dataset.sec === id; b.classList.toggle('on', on); on ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current'); });
const b = $(`.sn-b[data-sec="${id}"]`), list = $('#sn-list');
if (b && list && list.scrollWidth > list.clientWidth + 1) list.scrollTo({left: b.offsetLeft - (list.clientWidth - b.offsetWidth) / 2, behavior: 'smooth'});
}
const navOff = main => { const nav = $('#set-nav', main); return nav && innerWidth <= 1000 ? nav.offsetHeight + 18 : 18; };
let anchor = null;
function keepAnchor(main) {
const id = A.settingsSec || 'detect', el = $('#set-' + id, main);
if (el) anchor = {id, off: el.getBoundingClientRect().top - main.getBoundingClientRect().top};
}
const reAnchor = () => {
const main = $('#view');
if (!main || main.dataset.view !== 'settings' || !anchor) return;
const el = $('#set-' + anchor.id, main); if (!el) return;
const d = el.getBoundingClientRect().top - main.getBoundingClientRect().top - anchor.off;
if (Math.abs(d) < 1) return;
spyLock = Math.max(spyLock, Date.now() + 150);
main.scrollTop += d;
};
const anchorRO = window.ResizeObserver ? new ResizeObserver(reAnchor) : null;
addEventListener('resize', reAnchor);
function spy(main) {
if (Date.now() < spyLock) return keepAnchor(main);
const top = main.getBoundingClientRect().top + navOff(main) + 40;
let cur = SECTIONS[0].id;
for (const s of SECTIONS) { const el = $('#set-' + s.id, main); if (el && el.getBoundingClientRect().top <= top) cur = s.id; }
if (main.scrollTop + main.clientHeight >= main.scrollHeight - 4) cur = SECTIONS[SECTIONS.length - 1].id;
markNav(cur);
keepAnchor(main);
}
function goSec(main, id, smooth) {
const el = $('#set-' + id, main); if (!el) return;
spyLock = Date.now() + (smooth ? 700 : 120);
markNav(id);
const y = el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - navOff(main);
main.scrollTo({top: Math.max(0, y), behavior: smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto'});
anchor = {id, off: navOff(main)};
flash(el);
}

A.views.settings = {
render(main) {
const S = st.S;
const memN = Object.keys(st.mem).length;
const al = Object.entries(S.aliases);
A.paint(main, `
<section class="view-head" id="set-head"><div><h2>Settings</h2><p>Saved in this browser and used for every file.</p></div><div class="vh-act"><button class="btn ghost" id="set-reset">${icon('reset')}Reset defaults</button></div></section>
<section class="set-layout" id="set-layout">
${setNav()}
<div class="set-stack" id="set-stack">
${detPanel(S)}
<article class="card set" id="set-conv">${secHead('conv')}
<div class="set-body">
${row('Default pack size', 'Used for single → pack when nothing better is known', '<div id="s-pack"></div>')}
${row('Detect direction', 'Choose pack → single or single → pack from the data', sw(S.autoDir, 'data-k="autoDir" aria-label="Detect direction"'))}
${row('Repack existing packs', 'In single → pack, also change rows that are already packs', sw(S.repack, 'data-k="repack" aria-label="Repack existing packs"'))}
${row('Remember packs per item', `Learns “Amoxicillin 500 = 8 C” from files you open · ${memN} remembered`, sw(S.useMemory, 'data-k="useMemory" aria-label="Remember packs per item"'))}
</div>
<div class="set-foot"><button class="link" id="mem-learn">${icon('brain')}Learn from this file</button>${memN ? `<button class="link danger" id="mem-clear">${icon('trash')}Forget all ${memN}</button>` : ''}</div>
</article>
<article class="card set" id="set-round">${secHead('round')}
<div class="set-body">
<p class="set-note">Auto reads the decimals already used in your file and adds only as many as the converted numbers need, so 17.115 ÷ 10 keeps 1.7115 and 3.15 × 10 stays 31.5.</p>
<h4 class="set-sub">Price</h4>
${row('Decimals', decHint('price', S.priceDec), '<div class="dec-ctl"><div id="s-pdec-m"></div><div id="s-pdec"></div></div>')}
${row('Rounding', '', '<div id="s-pmode"></div>')}
<h4 class="set-sub">Quantity</h4>
${row('Decimals', decHint('qty', S.qtyDec), '<div class="dec-ctl"><div id="s-qdec-m"></div><div id="s-qdec"></div></div>')}
${row('Rounding', 'Round down to avoid counting stock you don’t have', '<div id="s-qmode"></div>')}
</div>
</article>
<article class="card set" id="set-label">${secHead('label')}
<div class="set-body">
${row('Label style', 'How new units are written', '<div id="s-style"></div>')}
${row('Space before label', '“1 T” or “1T”', sw(S.unitSpace, 'data-k="unitSpace" aria-label="Space before label"'))}
${row('Drop the 1', '“T” instead of “1 T”', sw(S.hideOne, 'data-k="hideOne" aria-label="Drop the 1"'))}
</div>
<div class="set-prev" id="s-prev"><span class="set-prev-l">Preview</span>${labelPrev(S)}</div>
</article>
<article class="card set" id="set-dups">${secHead('dups')}
<div class="set-body">
${row('Default action', 'Separate keeps every row as it is in the file. Use Smart merge or Merge in the Duplicates tab when you want to combine', '<div id="s-dmode"></div>')}
${row('Merged price', '', '<button id="s-mrule"></button>')}
${row('Price tolerance', 'Smart merge only combines rows whose prices are this close', '<div id="s-tol"></div>')}
${row('Loose name match', 'Ignore case, spaces and punctuation', sw(S.dupLoose, 'data-k="dupLoose" aria-label="Loose name match"'))}
${row('Near-duplicate names', 'Match small typos, word order and mg/tab noise. Always sent to review', sw(S.dupFuzzy, 'data-k="dupFuzzy" aria-label="Near-duplicate names"'))}
</div>
</article>
<article class="card set" id="set-rows">${secHead('rows')}
<div class="set-body">
${row('Auto-exclude empty rows', 'Rows with no name and no unit', sw(S.autoJunk, 'data-k="autoJunk" aria-label="Auto-exclude empty rows"'))}
${row('Columns for new files', 'Preset used the next time a file opens', '<button id="s-preset"></button>')}
</div>
</article>
<article class="card set" id="set-dict">${secHead('dict', al.length ? `<span class="pill-note">${al.length} added</span>` : '')}
<div class="set-body">
<p class="set-note">Your own spellings on top of the built-in list. Unrecognized words in the Units tab land here too.</p>
<div class="dict" id="dict-list">${al.map(([t, f]) => `<span class="dict-c" data-key="dc-${esc(t)}"><b>${esc(t)}</b>${icon('arrow')}${esc(E.FAM[f] ? E.FAM[f][2] : f)}<button data-del="${esc(t)}" aria-label="Remove ${esc(t)}">${icon('x')}</button></span>`).join('') || '<span class="muted" data-key="dc-none">Nothing added yet</span>'}</div>
<div class="dict-add"><input class="field" id="d-tok" placeholder="Word, e.g. Btl" spellcheck="false" aria-label="Unit word"><button id="d-fam"></button><button class="btn primary sm" id="d-add">${icon('plus')}Add</button></div>
</div>
</article>
<article class="card set" id="set-look">${secHead('look')}
<div class="set-body">
${row('Theme', 'System follows your device setting', '<div id="s-theme"></div>')}
${row('Row density', 'Height of rows in the Sheet', '<div id="s-density"></div>')}
</div>
</article>
</div>
</section>`);
const set = p => ST.setS(p);
$$('.switch[data-k]', main).forEach(b => b.onclick = () => set({[b.dataset.k]: !st.S[b.dataset.k]}));
seg($('#s-theme', main), {value: S.theme || 'system', options: A.THEMES, onChange: v => set({theme: v})});
seg($('#s-density', main), {value: S.density, options: [{value: 'comfy', label: 'Comfy'}, {value: 'compact', label: 'Compact'}], onChange: v => set({density: v})});
stepper($('#s-pack', main), {value: S.packSize, min: 1, max: 1000, onChange: v => set({packSize: v})});
[['priceDec', 'price', '#s-pdec'], ['qtyDec', 'qty', '#s-qdec']].forEach(([k, rk, id]) => {
const isAuto = S[k] === 'auto';
const cur = curDec(rk, S[k]);
seg($(id + '-m', main), {value: isAuto ? 'auto' : 'fixed', options: [{value: 'auto', label: 'Auto'}, {value: 'fixed', label: 'Fixed'}], onChange: v => set({[k]: v === 'auto' ? 'auto' : cur})});
const sp = $(id, main);
sp.hidden = isAuto;
if (!isAuto) stepper(sp, {value: S[k] | 0, min: 0, max: 8, onChange: v => set({[k]: v})});
});
const modes = [{value: 'nearest', label: 'Nearest'}, {value: 'up', label: 'Up'}, {value: 'down', label: 'Down'}];
seg($('#s-pmode', main), {value: S.priceMode, options: modes, onChange: v => set({priceMode: v})});
seg($('#s-qmode', main), {value: S.qtyMode, options: modes, onChange: v => set({qtyMode: v})});
seg($('#s-style', main), {value: S.unitStyle, options: [{value: 'file', label: 'As in file'}, {value: 'short', label: 'Tab'}, {value: 'long', label: 'Tablets'}], onChange: v => set({unitStyle: v})});
seg($('#s-dmode', main), {value: S.dupMode, options: [{value: 'keep', label: 'Separate'}, {value: 'smart', label: 'Smart'}, {value: 'merge', label: 'Merge all'}], onChange: v => set({dupMode: v})});
select($('#s-mrule', main), {value: S.mergeRule, options: RULES, onChange: v => set({mergeRule: v})});
stepper($('#s-tol', main), {value: S.tolerance, min: 0, max: 1000, suffix: '%', onChange: v => set({tolerance: v})});
select($('#s-preset', main), {value: S.preset, options: [{value: 'clean', label: 'Clean'}, {value: 'side', label: 'Side by side'}, {value: 'full', label: 'Everything'}].concat(S.layout ? [{value: 'mine', label: 'My default'}] : []), onChange: v => set({preset: v})});
const fb = $('#d-fam', main);
const paintFam = () => select(fb, {value: A.dictFam || 'tab', options: FAMS.map(k => ({value: k, label: E.FAM[k][2]})), onChange: v => { A.dictFam = v; paintFam(); }});
paintFam();
const tok = $('#d-tok', main);
$('#d-add', main).onclick = () => {
const t = tok.value.trim().toUpperCase().replace(/[.\s]/g, '');
if (!t) return tok.focus();
const fam = A.dictFam || 'tab';
tok.value = '';
set({aliases: {...st.S.aliases, [t]: fam}});
toast(`“${t}” means ${E.FAM[fam][2]}`, {icon: 'brain'});
};
tok.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); $('#d-add', main).click(); } };
$('#dict-list', main).onclick = e => { const b = e.target.closest('[data-del]'); if (!b) return; const a = {...st.S.aliases}; delete a[b.dataset.del]; set({aliases: a}); };
$('#mem-learn', main).onclick = () => { if (!st.src) return toast('Open a file with packs first', {tone: 'warn', icon: 'alert'}); const n = ST.learn(true); ST.emit('settings'); toast(n ? `Learned ${n} pack sizes` : 'No packs found to learn', {icon: 'brain'}); };
const mc = $('#mem-clear', main); if (mc) mc.onclick = async () => { const k = Object.keys(st.mem).length; if (await confirm({title: 'Forget remembered packs?', body: `${k} item${k === 1 ? '' : 's'} will go back to the default pack size.`, ok: 'Forget', danger: true})) ST.clearMem(); };
$('#set-reset', main).onclick = async () => { if (await confirm({title: 'Reset settings?', body: 'Detection, rounding, labels, duplicates and column defaults go back to defaults. Your dictionary, theme and memory are kept.', ok: 'Reset'})) { ST.resetS(); toast('Settings back to defaults', {icon: 'reset'}); } };
wireDet(main, S);
const nav = $('#set-nav', main);
nav.onclick = e => { const a = e.target.closest('.sn-b'); if (!a) return; e.preventDefault(); goSec(main, a.dataset.sec, true); };
if (anchorRO) { anchorRO.disconnect(); anchorRO.observe($('#set-stack', main)); }
main.onscroll = () => { if (main.dataset.view !== 'settings') return; cancelAnimationFrame(A.spyRaf); A.spyRaf = requestAnimationFrame(() => spy(main)); };
if (A.settingsFocus) { const id = A.settingsFocus; A.settingsFocus = null; requestAnimationFrame(() => goSec(main, id, false)); }
else if (A.switching) { A.settingsSec = 'detect'; markNav('detect'); }
},
update() { this.render($('#view')); }
};
function curDec(k, setting) {
const r = st.src ? ST.res() : null;
if (r && r.round) return r.round[k].d;
return setting === 'auto' ? (k === 'price' ? 2 : 0) : setting | 0;
}
function decHint(k, setting) {
const r = st.src ? ST.res() : null;
if (setting !== 'auto') return 'Always ' + (setting | 0);
if (!r || !r.round) return 'Picked from each file';
const x = r.round[k];
return 'This file: ' + x.d + (x.d === x.src ? ' (same as the file)' : ' (file uses ' + x.src + ')');
}
function labelPrev(S) {
const ex = st.src ? ST.res().items.find(i => i.converted && i.family === 'tab') || ST.res().items.find(i => i.converted) : null;
return ex ? `<span class="upill">${esc(ex.unitRaw)}</span>${icon('arrow', 'was-ar')}<span class="upill conv">${esc(ex.newUnit)}</span>` : `<span class="upill">10 T</span>${icon('arrow', 'was-ar')}<span class="upill conv">${esc((S.hideOne ? '' : '1' + (S.unitSpace ? ' ' : '')) + (S.unitStyle === 'short' ? 'Tab' : S.unitStyle === 'long' ? 'Tablet' : 'T'))}</span>`;
}
function detPanel(S) {
const cfg = E.detCfg(S);
const res = st.src ? ST.res() : null;
const used = {};
if (res) res.rowItems.forEach(it => { if (it.excluded) return; const nm = it.rs.nm; if (nm && nm.pat && (it.tsrc === 'name' || it.rs.src !== 'unit')) used[nm.pat] = (used[nm.pat] || 0) + 1; });
const dirty = JSON.stringify(E.DET_DEFAULTS) !== JSON.stringify(Object.fromEntries(Object.keys(E.DET_DEFAULTS).map(k => [k, cfg[k]])));
const CONF = {high: 'sure', medium: 'likely', low: 'guess'};
const chips = (list, attr, ph) => `<div class="tag-list" id="tags-${attr}">${list.map(w => `<span class="tag-c" data-key="t-${esc(w)}">${esc(w)}<button data-${attr}="${esc(w)}" aria-label="Remove ${esc(w)}">${icon('x')}</button></span>`).join('') || '<span class="muted" data-key="t-none">None</span>'}</div><div class="tag-add"><input class="field sm" id="add-${attr}" placeholder="${esc(ph)}" spellcheck="false" aria-label="${esc(ph)}"><button class="btn ghost sm" data-add="${attr}">${icon('plus')}Add</button></div>`;
const reset = dirty ? `<button class="link" id="det-reset">${icon('reset')}Recommended</button>` : '<span class="pill-note ok">recommended</span>';
return `<article class="card set" id="set-detect">${secHead('detect', reset)}
<div class="set-body">
<p class="set-note">The unit column comes first. Item names only fill gaps when they clearly state a count.</p>
<h4 class="set-sub">Reading units</h4>
${row('Where units come from', Logic.SOURCES[cfg.unitSource], '<div id="d-src"></div>')}
${row('Sizes in item names', Logic.MODES[cfg.nameMode].split(': ')[1], '<div id="d-mode"></div>')}
${row('Certainty needed', Logic.LEVELS[cfg.nameConf].split(': ')[1], '<div id="d-conf"></div>')}
${row('Name shows several sizes', 'e.g. “24s 12s”', '<div id="d-multi"></div>')}
${row('Valid pack sizes', 'Counts outside this range are ignored', '<div class="range"><div id="d-min"></div><span>to</span><div id="d-max"></div></div>')}
${row('Flag name vs unit conflicts', '“Zyrtec 20s” with unit “10 T” goes to Needs a look', sw(cfg.flagConflict, 'data-k="flagConflict" aria-label="Flag name vs unit conflicts"'))}
<h4 class="set-sub">Single → pack priority</h4>
<p class="set-note">When a single has to become a pack, the first source that knows a size wins. Your own per-row choice always comes first.</p>
<ol class="prio" id="d-order">${cfg.order.map((k, i) => `<li data-key="o-${k}" data-o="${k}"><span class="prio-n">${i + 1}</span><b>${esc(Logic.ORDER[k])}</b>${k === 'memory' && !S.useMemory ? '<em>off</em>' : ''}<span class="grow"></span><button class="icon-btn" data-mv="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">${icon('sortUp')}</button><button class="icon-btn" data-mv="1" ${i === cfg.order.length - 1 ? 'disabled' : ''} aria-label="Move down">${icon('sortDown')}</button></li>`).join('')}<li class="fixed" data-key="o-default"><span class="prio-n">${cfg.order.length + 1}</span><b>Default pack size · ${S.packSize}</b><span class="grow"></span><span class="muted">always last</span></li></ol>
</div>
</article>
<article class="card set" id="set-patterns">${secHead('patterns')}
<div class="set-body">
<p class="set-note">Strengths like 500mg, 875/125, 100u/ml, 2% and decimals are removed first, so they are never read as a pack size.</p>
<div class="pats">${Object.entries(E.PATS).map(([k, p]) => `<button class="pat ${cfg.namePats[k] ? 'on' : ''}" data-key="p-${k}" data-pat="${k}" aria-pressed="${!!cfg.namePats[k]}"><span class="pat-ck">${icon('check')}</span><span class="pat-t"><b>${esc(p.label)}</b><small>${esc(p.ex)}</small></span><span class="conf c-${p.conf}">${CONF[p.conf]}</span>${used[k] ? `<span class="pat-n" title="Rows in this file">${used[k]}</span>` : ''}</button>`).join('')}</div>
<div class="set-split">
<div><h4 class="set-sub">Protected words</h4>
<p class="set-note">A small number right after these words is part of the name, as in Omega 3 or Vitamin B 12.</p>
${chips(cfg.guardWords, 'guard', 'Word, e.g. zinc')}</div>
<div><h4 class="set-sub">Extra strength units</h4>
<p class="set-note">Numbers followed by these are treated as strength, never pack size.</p>
${chips(cfg.extraMeasures, 'meas', 'e.g. mu, mega')}</div>
</div>
<div class="bench" id="bench">
<h4 class="set-sub">${icon('search')}Try it</h4>
<div class="bench-in"><input class="field" id="b-name" placeholder="Item name, e.g. Panadol Extra 500mg 24s" value="${esc(A.benchName ?? 'Augmentin 875/125mg 2x7 F.C. tabs')}" spellcheck="false" aria-label="Item name"><input class="field" id="b-unit" placeholder="Unit (optional)" value="${esc(A.benchUnit ?? '1 T')}" spellcheck="false" aria-label="Unit"></div>
<div class="bench-out" id="b-out"></div>
</div>
</div>
</article>`;
}

function benchHTML(name, unit, S) {
const {rs, nm} = Logic.bench(name, unit, S);
const dir = st.doc ? st.doc.dir : 'toBase';
const CONF = {high: 'sure', medium: 'likely', low: 'guess'};
const p = rs.p;
let verdict, target = null;
if (!p) verdict = 'Nothing readable. The row is left as it is.';
else if (p.measure) verdict = 'A measure (' + E.fmtN(p.count) + ' ' + p.tok + '), never converted.';
else if (dir === 'toBase') { if (p.container && rs.noSize) verdict = 'Container with no size: flagged, not split.'; else { target = 1; verdict = 'Pack → single: becomes 1, factor 1 ÷ ' + E.fmtN(p.count) + '.'; } }
else if (p.count > 1 || p.container) verdict = 'Already a pack' + (S.repack ? '' : ', kept') + '.';
else if (rs.nameTarget && E.PACKABLE.has(p.family)) { target = rs.nameTarget; verdict = 'Single → pack: pack of ' + rs.nameTarget + ' from the name (if no remembered pack comes first).'; }
else { target = S.packSize; verdict = 'Single → pack: no size found, uses the default ' + S.packSize + '.'; }
const steps = [];
if (nm && nm.strengths.length) steps.push(`<div class="bs"><span class="bs-l">Strength removed</span>${nm.strengths.map(x => `<span class="bt strike">${esc(x)}</span>`).join('')}</div>`);
if (nm && nm.guarded.length) steps.push(`<div class="bs"><span class="bs-l">Protected</span>${nm.guarded.map(x => `<span class="bt">${esc(x)}</span>`).join('')}</div>`);
if (nm && nm.cands.length) steps.push(`<div class="bs"><span class="bs-l">Candidates</span>${nm.cands.map(c => `<span class="bt ${c.used ? 'used' : c.ok ? 'ok' : 'no'}" title="${esc(E.PATS[c.pat].label)}">“${esc(c.text)}” → ${c.n}<small>${esc(c.ok ? CONF[c.conf] : c.why)}</small></span>`).join('')}</div>`);
else if (name) steps.push(`<div class="bs"><span class="bs-l">Candidates</span><span class="muted">No count in the name${nm && nm.form ? ' · form: ' + esc(E.FAM[nm.form][2].toLowerCase()) : ''}</span></div>`);
if (nm && nm.multi) steps.push(`<div class="bs"><span class="bs-l">Several sizes</span><span class="muted">${esc(Logic.MULTI[E.detCfg(S).nameMulti])}</span></div>`);
if (unit) steps.push(`<div class="bs"><span class="bs-l">Unit column</span>${rs.u ? `<span class="bt">${esc(unit)} → ${E.fmtN(rs.u.count)} ${esc(rs.u.known ? E.FAM[rs.u.family][rs.u.count === 1 ? 1 : 2].toLowerCase() : rs.u.tok)}</span>` : `<span class="bt no">${esc(unit)}<small>${E.detCfg(S).unitSource === 'name' ? 'ignored' : 'not readable'}</small></span>`}</div>`);
if (rs.conflict) steps.push(`<div class="bs"><span class="bs-l">Conflict</span><span class="bt no">name ${nm.count} vs unit ${E.fmtN(rs.u.count)}<small>unit wins, row flagged</small></span></div>`);
return `${steps.join('')}
<div class="bench-res"><span class="upill">${p ? esc(Logic.READ[rs.src]) : '—'}</span>${p ? `<b>${esc(E.fmtN(p.count))} ${esc(p.container ? 'per box' : E.FAM[p.family] ? E.FAM[p.family][p.count === 1 ? 1 : 2].toLowerCase() : p.tok)}</b>` : ''}${icon('arrow', 'was-ar')}${target != null ? `<span class="upill conv">${E.fmtN(target)}</span>` : ''}<span class="bench-v">${esc(verdict)}</span></div>`;
}

function wireDet(main, S) {
const cfg = E.detCfg(S);
const set = p => ST.setS(p);
seg($('#d-src', main), {value: cfg.unitSource, options: [{value: 'auto', label: 'Auto'}, {value: 'unit', label: 'Unit column'}, {value: 'name', label: 'Name'}], onChange: v => set({unitSource: v})});
seg($('#d-mode', main), {value: cfg.nameMode, options: [{value: 'off', label: 'Off'}, {value: 'fill', label: 'Fill gaps'}, {value: 'prefer', label: 'Prefer name'}], onChange: v => set({nameMode: v})});
seg($('#d-conf', main), {value: cfg.nameConf, options: [{value: 'strict', label: 'Strict'}, {value: 'balanced', label: 'Balanced'}, {value: 'loose', label: 'Loose'}], onChange: v => set({nameConf: v})});
seg($('#d-multi', main), {value: cfg.nameMulti, options: [{value: 'skip', label: 'Skip'}, {value: 'best', label: 'Most sure'}, {value: 'largest', label: 'Largest'}], onChange: v => set({nameMulti: v})});
stepper($('#d-min', main), {value: cfg.nameMin, min: 2, max: 500, onChange: v => set({nameMin: Math.min(v, cfg.nameMax)})});
stepper($('#d-max', main), {value: cfg.nameMax, min: 2, max: 10000, step: 10, onChange: v => set({nameMax: Math.max(v, cfg.nameMin)})});
$('.pats', main).onclick = e => { const b = e.target.closest('[data-pat]'); if (!b) return; const c = E.detCfg(st.S); set({namePats: {...c.namePats, [b.dataset.pat]: !c.namePats[b.dataset.pat]}}); };
$('#d-order', main).onclick = e => {
const b = e.target.closest('[data-mv]'); if (!b || b.disabled) return;
const c = E.detCfg(st.S), k = b.closest('li').dataset.o, o = c.order.slice(), i = o.indexOf(k), j = i + +b.dataset.mv;
if (i < 0 || j < 0 || j >= o.length) return;
[o[i], o[j]] = [o[j], o[i]]; set({order: o});
};
const lists = {guard: 'guardWords', meas: 'extraMeasures'};
Object.entries(lists).forEach(([a, key]) => {
$('#tags-' + a, main).onclick = e => { const b = e.target.closest(`[data-${a}]`); if (b) set({[key]: E.detCfg(st.S)[key].filter(w => w !== b.dataset[a])}); };
const inp = $('#add-' + a, main), add = () => { const w = inp.value.trim().toLowerCase(); if (!w) return inp.focus(); inp.value = ''; const cur = E.detCfg(st.S)[key]; if (!cur.includes(w)) set({[key]: cur.concat(w)}); };
$(`[data-add="${a}"]`, main).onclick = add;
inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); add(); } };
});
const dr = $('#det-reset', main);
if (dr) dr.onclick = () => { ST.resetDet(); toast('Detection back to recommended', {icon: 'reset'}); };
const bn = $('#b-name', main), bu = $('#b-unit', main), out = $('#b-out', main);
const paint = () => { A.benchName = bn.value; A.benchUnit = bu.value; UI.morph(out, benchHTML(bn.value, bu.value, st.S)); };
bn.oninput = bu.oninput = paint;
paint();
}

function row(t, h, ctl) { return `<div class="set-r"><div class="set-l"><b>${esc(t)}</b>${h ? `<small>${esc(h)}</small>` : ''}</div><div class="set-c">${ctl}</div></div>`; }
})();
