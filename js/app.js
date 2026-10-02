window.App = (() => {
const {$, $$, esc, icon, toast, menu, select, seg, stepper, confirm, fmt} = UI;
const E = Engine, ST = Store, st = Store.st;
const App = {tab: 'source', views: {}};

const TABS = [
{id: 'source', label: 'Source', icon: 'import'},
{id: 'sheet', label: 'Sheet', icon: 'sheet', data: true},
{id: 'units', label: 'Units', icon: 'units', data: true},
{id: 'dups', label: 'Duplicates', icon: 'dups', data: true},
{id: 'columns', label: 'Columns', icon: 'columns', data: true},
{id: 'export', label: 'Export', icon: 'export', data: true},
{id: 'settings', label: 'Settings', icon: 'settings'}
];
const ROLES = {
name: {label: 'Name', hint: 'Item name, used for duplicates and memory'},
unit: {label: 'Unit', hint: 'Pack text like 10 T, 8 C, Syringe'},
price: {label: 'Price', hint: 'Price per old unit'},
qty: {label: 'Quantity', hint: 'Stock in old units'},
value: {label: 'Value', hint: 'Price × quantity, used only for detection'}
};
const KIND = {code: 'Code', category: 'Category', other: 'Info'};
App.ROLES = ROLES;
App.FLAG = {
noUnit: 'No unit', badUnit: 'Unit could not be read', unknownUnit: 'Unit word not in the dictionary', noPrice: 'No price', noQty: 'No quantity', zeroQty: 'Quantity is 0',
partial: 'Quantity no longer whole', review: 'Duplicate prices disagree', edited: 'Edited by you', custom: 'Custom pack size', merged: 'Merged duplicates', dup: 'Has duplicates kept separate', junk: 'Empty row'
};
App.TSRC = {rule: 'Unit rule', unit: 'Unit default', default: 'Default pack size', memory: 'Remembered pack', name: 'Read from item name', row: 'Set by you', keep: 'Kept as is', off: 'Unit not converted', already: 'Already a pack', none: ''};

App.roleOf = i => Object.keys(st.doc.roles).find(r => st.doc.roles[r] === i) || null;
let numMemo = new Map();
App.numCol = i => {
if (numMemo.has(i)) return numMemo.get(i);
let n = 0, t = 0;
for (const r of st.src.rows) { if (E.clean(r[i]) === '') continue; t++; if (E.isNumCell(r[i])) n++; if (t > 300) break; }
const v = t > 0 && n / t > .8; numMemo.set(i, v); return v;
};
App.colMeta = key => {
if (key.startsWith('o:')) {
const i = +key.slice(2), role = App.roleOf(i);
return {key, i, label: st.src.headers[i], isNew: false, role, num: role === 'price' || role === 'qty' || role === 'value' || App.numCol(i), editable: true};
}
return {key, label: st.S.labels[key] || key, isNew: true, num: E.NUM_NEW.has(key), editable: ['new.unit', 'new.price', 'new.qty'].includes(key)};
};
App.colLabel = c => c.label || App.colMeta(c.key).label;
App.visibleCols = () => st.doc.columns.filter(c => c.on && (!c.key.startsWith('o:') || +c.key.slice(2) < st.src.headers.length));

App.go = id => {
const t = TABS.find(x => x.id === id);
if (!t || (t.data && !st.src)) return;
if (App.tab === id) return;
UI.closePop();
document.body.classList.remove('bulk-on');
App.tab = id;
renderDock();
renderView(true);
};

function renderHeader() {
const h = $('#app-header');
const loaded = !!st.src;
$('#file-slot', h).innerHTML = loaded ? `<button class="file-chip" id="file-chip" title="Source">${icon('file')}<span class="fc-name">${esc(st.src.name)}</span><span class="fc-meta">${st.src.rows.length} rows</span></button>` : '';
const ds = $('#dir-slot', h);
ds.innerHTML = '';
if (loaded) {
const d = document.createElement('div'); d.id = 'dir-seg';
ds.appendChild(d);
seg(d, {value: st.doc.dir, options: [{value: 'toBase', label: 'Pack → single', icon: 'split'}, {value: 'toPack', label: 'Single → pack', icon: 'merge'}], onChange: App.setDir});
}
$('#undo-btn').disabled = !st.undo.length;
$('#redo-btn').disabled = !st.redo.length;
$('#undo-btn').title = st.undo.length ? 'Undo ' + st.undo[st.undo.length - 1].label.toLowerCase() + ' (Ctrl+Z)' : 'Nothing to undo';
$('#redo-btn').title = st.redo.length ? 'Redo ' + st.redo[st.redo.length - 1].label.toLowerCase() + ' (Ctrl+Shift+Z)' : 'Nothing to redo';
$('#hist').classList.toggle('hidden', !loaded);
$('#export-cta').classList.toggle('hidden', !loaded);
$('#new-btn').classList.toggle('hidden', !loaded);
if (loaded) $('#file-chip').onclick = () => App.go('source');
}

function renderDock() {
const dock = $('#dock');
const r = ST.res();
const badge = {sheet: r && r.stats.issues, units: r && r.stats.unknown, dups: r && r.stats.review};
dock.innerHTML = TABS.map(t => {
const dis = t.data && !st.src;
const b = badge[t.id];
return `<button class="dock-b ${App.tab === t.id ? 'on' : ''}" data-tab="${t.id}" ${dis ? 'disabled' : ''} role="tab" aria-selected="${App.tab === t.id}">${icon(t.icon)}<span class="dock-l">${t.label}</span>${b ? `<b class="dock-badge">${b > 99 ? '99+' : b}</b>` : ''}</button>`;
}).join('') + '<span class="dock-glider"></span>';
requestAnimationFrame(() => {
const on = $('.dock-b.on', dock), g = $('.dock-glider', dock);
if (!on) return;
g.style.width = on.offsetWidth + 'px';
g.style.transform = `translateX(${on.offsetLeft}px)`;
});
}

function renderView(switched) {
const main = $('#view');
const v = App.views[App.tab];
if (switched) { main.classList.remove('enter'); void main.offsetWidth; main.classList.add('enter'); main.dataset.view = App.tab; }
v.render(main, switched);
}

App.refresh = what => {
renderHeader();
renderDock();
const v = App.views[App.tab];
if (what === 'open' || what === 'close') { renderView(true); return; }
if (v.update) v.update(what); else renderView(false);
};
ST.on(App.refresh);

App.setDir = dir => {
const label = dir === 'toBase' ? 'Pack → single' : 'Single → pack';
ST.commit('Change direction', d => { d.dir = dir; });
toast(label + (dir === 'toPack' ? ` · default pack ${st.S.packSize}` : ''), {icon: dir === 'toBase' ? 'split' : 'merge'});
};

App.loadGrid = (grid, name, wb, sheet) => {
const src = E.ingest(grid);
if (!src) return toast('No data found in that input', {tone: 'warn', icon: 'alert'});
if (!src.rows.length) return toast('Only a header row was found', {tone: 'warn', icon: 'alert'});
src.name = name || 'pasted-data';
src.sheet = sheet || null;
src.sheets = wb ? wb.SheetNames.filter(n => { const ref = wb.Sheets[n]['!ref']; return ref && ref !== 'A1'; }) : null;
st.wb = wb || null;
numMemo = new Map();
ST.open(src);
const r = ST.res();
const R = st.doc.roles;
const found = Object.keys(ROLES).filter(k => R[k] >= 0 && k !== 'value').map(k => ROLES[k].label.toLowerCase());
toast(`${src.rows.length} rows · found ${found.join(', ') || 'no roles'} · ${r.stats.converted} to convert`, {icon: 'spark'});
};

function parseText(txt) {
const lines = txt.replace(/\r/g, '').split('\n');
if (lines.slice(0, 10).some(l => l.includes('\t'))) return lines.map(l => l.split('\t').map(c => c.replace(/^"([\s\S]*)"$/, '$1').replace(/""/g, '"')));
const wb = XLSX.read(txt, {type: 'string', raw: true});
return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1, raw: true, defval: ''});
}
App.loadText = (txt, name) => { if (!txt.trim()) return toast('Paste some rows first', {tone: 'warn', icon: 'alert'}); try { App.loadGrid(parseText(txt), name); } catch { toast('Could not read that text', {tone: 'warn', icon: 'alert'}); } };
App.loadSheet = name => {
if (!st.wb || !st.wb.Sheets[name]) return;
App.loadGrid(XLSX.utils.sheet_to_json(st.wb.Sheets[name], {header: 1, raw: true, defval: ''}), st.src.name, st.wb, name);
};
App.readFile = file => {
const base = file.name.replace(/\.[^.]+$/, '') || 'bugvert';
const r = new FileReader();
r.onerror = () => toast('Could not read this file', {tone: 'warn', icon: 'alert'});
if (/\.(xlsx|xlsm|xlsb|xls|ods)$/i.test(file.name)) {
r.onload = e => {
try {
const wb = XLSX.read(new Uint8Array(e.target.result), {type: 'array'});
const sheet = wb.SheetNames.find(n => { const ref = wb.Sheets[n]['!ref']; return ref && ref !== 'A1'; }) || wb.SheetNames[0];
App.loadGrid(XLSX.utils.sheet_to_json(wb.Sheets[sheet], {header: 1, raw: true, defval: ''}), base, wb, sheet);
} catch { toast('Could not read this file', {tone: 'warn', icon: 'alert'}); }
};
r.readAsArrayBuffer(file);
} else { r.onload = e => App.loadText(e.target.result, base); r.readAsText(file); }
};
App.pickFile = () => $('#file-input').click();

const SAMPLE = `الصرف\tالرقم\tالاسم\tالوحدة\tالرصيد\tالسعر\tقيمة المنصرف\tالمجموعة
مجاني\t003 A\tAcetazolamide\t10 T\t\t17.1150\t0.0000\tنفسية وعصبية
مجاني\t005 A\tAcetylsalicylic Acid 75\t10 T\t471\t3.1500\t1483.6500\tعظام
مجاني\t005 A\tAcetylsalicylic Acid 81\t10 T\t\t6.3000\t0.0000\tعظام
مجاني\t007 A\tAcetylsalicylic Acid 81\t10 T\t1391\t5.0400\t7010.6400\tعظام
مجاني\t009 A\tAcetylsalicylic Acid 100\t10 T\t\t2.0000\t0.0000\tعظام
مجاني\t011 A\tAcyclovir 200\t10 T\t119\t17.3250\t2061.6750\tجلدية
مجاني\t013 A\tAlfacalcidol 0.25\t10 T\t\t18.3750\t0.0000\tعظام
مجاني\t013 A\tAlfacalcidol 0.5\t10 T\t130\t29.9250\t3890.2500\tعظام
مجاني\t015 A\tAlfacalcidol 1\t10 T\t\t32.2350\t0.0000\tعظام
مجاني\t017 A\tAllopurinol  300\t10T\t261\t14.7000\t3836.7000\tمسالك
مجاني\t019 A\tAlpha Lipoic Acid 300\t10 T\t\t19.9500\t0.0000\tمخ واعصاب
مجاني\t021 A\tAlpha Lipoic Acid 300 + B Vitamins\t10 T\t\t37.8000\t0.0000\tمخ واعصاب
مجاني\t023 A\tAlpha Lipoic Acid 600\t10 T\t\t38.8500\t0.0000\tمخ واعصاب
مجاني\t027 A\tAmantadine 100\t10 T\t\t2.0000\t0.0000\tمخ واعصاب
مجاني\t029 A\tAmitriptyline 25\t10  T\t626\t8.6620\t5422.4120\tمخ واعصاب
مجاني\t031 A\tAmoxicillin 500\t8 C\t200\t8.7360\t1747.2000\tجراحة
مجاني\t033 A\tAmoxicillin 500\t10 C\t\t2.0000\t0.0000\tجراحة
مجاني\t034 A\tAmoxicillin + Clavulanic Acid 1g\t4 T\t\t19.7400\t0.0000\tجراحة
مجاني\t035 A\tAmoxicillin + Clavulanic Acid 1g\t7 T\t\t2.0000\t0.0000\tجراحة
مجاني\t037 A\tDiclofenac 100\t5 supp\t40\t12.5000\t500.0000\tعظام
مجاني\t039 A\tSalbutamol\tInh\t15\t25.0000\t375.0000\tصدر
مجاني\t041 A\tEnoxaparin 40\tSyringe\t30\t45.0000\t1350.0000\tقلب
مجاني\t043 A\tOral Rehydration\t10 sach\t80\t15.0000\t1200.0000\tاطفال
مجاني\t045 A\tVitamin D3\t30F\t50\t60.0000\t3000.0000\tعظام
مجاني\t047 A\tOmeprazole 20\t14 C\t\t28.0000\t\tباطنة
مجاني\t048 A\tOmeprazole 20\t14 C\t60\t28.0000\t1680.0000\tباطنة
\t\t\t\t\t\t\t
مجاني\t049 A\tParacetamol 500\t12 Pill\t100\t9.0000\t900.0000\tباطنة
مجاني\t051 A\tCetirizine 10\t20 Lozng\t12\t16.0000\t192.0000\tباطنة`;
App.loadSample = () => App.loadText(SAMPLE, 'sample-pharmacy');

App.views.source = {
render(main) {
if (!st.src) return renderStart(main);
const r = ST.res();
const d = st.doc, src = st.src;
const da = d.dirAuto || {packs: 0, singles: 0};
const tot = da.packs + da.singles;
main.innerHTML = `
<section class="src-top">
<article class="card src-file">
<div class="sf-ic">${icon('file')}</div>
<div class="sf-txt"><h2>${esc(src.name)}</h2><p>${src.rows.length} rows · ${src.headers.length} columns${src.sheet ? ' · sheet “' + esc(src.sheet) + '”' : ''}</p></div>
<div class="sf-act">${src.sheets && src.sheets.length > 1 && st.wb ? '<button id="sheet-pick"></button>' : ''}<button class="btn ghost" id="replace-btn">${icon('upload')}Replace</button></div>
</article>
<article class="card src-dir">
<header><h3>Direction</h3><span class="pill-note">${tot ? `${da.packs} pack${da.packs === 1 ? '' : 's'} · ${da.singles} single${da.singles === 1 ? '' : 's'} found` : 'no units read'}</span></header>
<div class="dir-opts">
<button class="dir-opt ${d.dir === 'toBase' ? 'on' : ''}" data-dir="toBase"><span class="do-ic">${icon('split')}</span><span class="do-t"><b>Pack → single</b><small>10 T @ 17.11 becomes 1 T @ 1.711</small></span>${da.dir === 'toBase' && tot ? '<em>detected</em>' : ''}</button>
<button class="dir-opt ${d.dir === 'toPack' ? 'on' : ''}" data-dir="toPack"><span class="do-ic">${icon('merge')}</span><span class="do-t"><b>Single → pack</b><small>1 T @ 1.71 becomes a pack of N</small></span>${da.dir === 'toPack' && tot ? '<em>detected</em>' : ''}</button>
</div>
${d.dir === 'toPack' ? `<div class="dir-pack"><span>Default pack size</span><div id="src-pack"></div><small>Per unit and per item sizes live in Units and the Sheet.</small></div>` : ''}
</article>
</section>
<section class="card src-cols">
<header class="sec-head"><div><h3>Columns</h3><p>Picked from what's inside each column, not just the header. Tap a tag to change it.</p></div>
<div class="role-legend">${Object.keys(ROLES).filter(k => k !== 'value').map(k => `<span class="rl ${d.roles[k] >= 0 ? '' : 'missing'}"><i class="role-dot r-${k}"></i>${ROLES[k].label}${d.roles[k] >= 0 ? '' : ' · missing'}</span>`).join('')}</div></header>
<div class="col-cards">${src.headers.map((h, i) => colCard(h, i)).join('')}</div>
</section>
<section class="src-next">
<div class="sn-stats">
<span><b>${r.stats.rows}</b> rows ready</span><span><b>${r.stats.converted}</b> will convert</span>${r.stats.groups ? `<span><b>${r.stats.groups}</b> duplicate groups</span>` : ''}${r.stats.issues ? `<span class="warn"><b>${r.stats.issues}</b> need a look</span>` : ''}
</div>
<button class="btn primary lg" id="open-sheet">Open sheet ${icon('arrow')}</button>
</section>`;
$$('.dir-opt', main).forEach(b => b.onclick = () => b.dataset.dir !== d.dir && App.setDir(b.dataset.dir));
if (d.dir === 'toPack') stepper($('#src-pack', main), {value: st.S.packSize, min: 1, max: 1000, onChange: v => ST.setS({packSize: v})});
$('#replace-btn', main).onclick = App.pickFile;
$('#open-sheet', main).onclick = () => App.go('sheet');
const sp = $('#sheet-pick', main);
if (sp) select(sp, {value: src.sheet, options: src.sheets.map(n => ({value: n, label: n, icon: 'sheet'})), onChange: async n => { if (n === src.sheet) return; if (st.undo.length && !await confirm({title: 'Switch sheet?', body: 'Edits made on this sheet will be lost.', ok: 'Switch'})) return; App.loadSheet(n); }});
$$('.role-tag', main).forEach(b => b.onclick = () => roleMenu(b, +b.dataset.i));
}
};

function colCard(h, i) {
const d = st.doc;
const role = App.roleOf(i);
const ign = d.ignored.includes(i);
const kind = d.kinds[i];
const samples = [];
for (const r of st.src.rows) { const v = E.clean(r[i]); if (v && !samples.includes(v)) samples.push(v); if (samples.length >= 3) break; }
const tag = role ? `<i class="role-dot r-${role}"></i>${ROLES[role].label}` : ign ? `${icon('eyeOff')}Ignored` : (KIND[kind] || 'Info');
const conf = role && d.conf[i] && d.roles[role] === i && st.det.roles[role] === i ? d.conf[i] : '';
return `<article class="col-card ${role ? 'has-role r-' + role : ''} ${ign ? 'ignored' : ''}">
<div class="cc-top"><span class="cc-h" title="${esc(h)}">${esc(h)}</span><button class="role-tag ${role ? 'r-' + role : ''}" data-i="${i}">${tag}${icon('chevron', 'sel-chev')}</button></div>
<ul class="cc-samples">${samples.map(s => `<li>${esc(s)}</li>`).join('') || '<li class="muted">empty</li>'}</ul>
<div class="cc-foot">${conf ? `<span class="conf c-${conf}">${conf === 'high' ? 'sure' : conf === 'medium' ? 'likely' : 'guess'}</span>` : ''}${ign && d.reasons[i] ? `<span class="cc-why">${esc(d.reasons[i])}</span>` : ''}</div>
</article>`;
}

function roleMenu(anchor, i) {
const cur = App.roleOf(i);
const ign = st.doc.ignored.includes(i);
const items = [{head: 'Use “' + st.src.headers[i] + '” as'}];
Object.keys(ROLES).forEach(k => {
const holder = st.doc.roles[k];
items.push({label: ROLES[k].label, hint: holder >= 0 && holder !== i ? 'now “' + st.src.headers[holder] + '”' : ROLES[k].hint, icon: 'dot', active: cur === k, run: () => {
const sw = ST.setRole(k, i);
toast(sw ? `${ROLES[k].label} set · ${ROLES[sw].label} moved to “${st.src.headers[st.doc.roles[sw]]}”` : `${ROLES[k].label} → “${st.src.headers[i]}”`, {icon: 'check', action: {label: 'Undo', run: () => ST.undo()}});
}});
});
items.push('-');
items.push({label: 'Keep as info', hint: 'Shown, no role', icon: 'info', active: !cur && !ign, run: () => ST.setRole('other', i)});
items.push({label: 'Ignore column', hint: 'Garbage, hidden by default', icon: 'eyeOff', active: ign, run: () => ST.setRole('ignore', i)});
menu(anchor, items);
}

function renderStart(main) {
const ses = ST.savedSession();
main.innerHTML = `
<section class="hero">
<div class="hero-copy">
<span class="eyebrow">${icon('spark')}bugvert 2</span>
<h2>Drop a sheet.<br><em>Get every unit right.</em></h2>
<p>Name, unit, price and quantity are found from what's in the cells. Packs and singles are rescaled, duplicates sorted out, and every row stays yours to change.</p>
</div>
<div class="hero-in">
<button class="drop" id="drop-zone" type="button">
<span class="drop-ic">${icon('upload')}</span>
<b>Drop an Excel or CSV file</b>
<small>or click to browse · .xlsx .xls .csv .tsv</small>
</button>
<div class="paste-card">
<textarea id="paste-input" placeholder="…or paste rows straight from Excel" spellcheck="false" aria-label="Paste data"></textarea>
<div class="pc-act"><button class="btn ghost" id="sample-btn">${icon('spark')}Try a sample</button><button class="btn primary" id="parse-btn">Analyze${icon('arrow')}</button></div>
</div>
</div>
${ses ? `<button class="resume" id="resume-btn"><span class="rs-ic">${icon('reset')}</span><span><b>Continue “${esc(ses.src.name)}”</b><small>${ses.src.rows.length} rows · saved ${new Date(ses.ts).toLocaleString()}</small></span>${icon('arrow')}</button>` : ''}
<ul class="hero-points">
<li>${icon('brain')}<span><b>Reads content</b>Columns are found from their values, not their header names</span></li>
<li>${icon('swap')}<span><b>Knows the direction</b>Packs to singles or singles to packs, picked for you</span></li>
<li>${icon('edit')}<span><b>Control every row</b>Pack size, price and duplicates, row by row</span></li>
</ul>
</section>`;
const dz = $('#drop-zone', main);
dz.onclick = App.pickFile;
['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('over'); }));
dz.addEventListener('drop', e => e.dataTransfer.files[0] && App.readFile(e.dataTransfer.files[0]));
$('#parse-btn', main).onclick = () => App.loadText($('#paste-input', main).value);
$('#paste-input', main).addEventListener('paste', () => setTimeout(() => App.loadText($('#paste-input', main).value), 0));
$('#sample-btn', main).onclick = App.loadSample;
if (ses) $('#resume-btn', main).onclick = () => { ST.resume(); App.go('sheet'); toast('Session restored', {icon: 'reset'}); };
}

function boot() {
$('#file-input').onchange = e => { if (e.target.files[0]) App.readFile(e.target.files[0]); e.target.value = ''; };
$('#dock').onclick = e => { const b = e.target.closest('.dock-b'); if (b && !b.disabled) App.go(b.dataset.tab); };
$('#undo-btn').onclick = () => { const l = ST.undo(); if (l) toast('Undid ' + l.toLowerCase(), {icon: 'undo'}); };
$('#redo-btn').onclick = () => { const l = ST.redo(); if (l) toast('Redid ' + l.toLowerCase(), {icon: 'redo'}); };
$('#export-cta').onclick = () => App.go('export');
$('#new-btn').onclick = async () => { if (await confirm({title: 'Start over?', body: 'This clears the current data and all edits. Settings and remembered packs are kept.', ok: 'Start over', danger: true})) { ST.close(); App.tab = 'source'; App.refresh('close'); } };
$('#brand').onclick = () => App.go('source');
document.addEventListener('keydown', e => {
const typing = e.target.closest('input, textarea, [contenteditable]');
const mod = e.ctrlKey || e.metaKey;
if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); $(e.shiftKey ? '#redo-btn' : '#undo-btn').click(); }
else if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); $('#redo-btn').click(); }
});
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files[0] && !e.target.closest('#drop-zone')) App.readFile(e.dataTransfer.files[0]); });
document.addEventListener('paste', e => {
if (e.target.closest('input, textarea')) return;
if (st.src && App.tab !== 'source') return;
const t = e.clipboardData && e.clipboardData.getData('text');
if (t && t.includes('\t')) { e.preventDefault(); App.loadText(t); }
});
document.body.dataset.density = st.S.density;
renderHeader();
renderDock();
renderView(true);
}
App.boot = boot;
return App;
})();
