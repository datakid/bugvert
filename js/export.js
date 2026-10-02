(() => {
const {$, $$, esc, icon, toast, seg, sw, fmt} = UI;
const E = Engine, ST = Store, st = Store.st, A = App;
let tab = 'data';
const viewFiltered = () => st.view.quick !== 'all' || st.view.rules.length || st.view.search || st.view.family || st.view.flag || st.view.sort || st.view.tsrc || st.view.conf;

function exportData(scope) {
A.flushEdit && A.flushEdit();
const r = ST.fresh();
const cols = A.visibleCols();
const items = scope === 'view' ? E.viewItems(r, st.view, cols, st.S) : r.items.filter(i => !i.excluded);
const head = cols.map(c => A.colLabel(c));
const rows = items.map(it => cols.map(c => E.value(it, c.key, st.S)));
return {head, rows, cols, items, r};
}
A.exportData = exportData;

function sheetOf(grid, widths) {
const ws = XLSX.utils.aoa_to_sheet(grid);
const n = Math.max(...grid.slice(0, 5).map(r => r.length));
ws['!cols'] = [...Array(n).keys()].map(c => ({wch: widths && widths[c] ? widths[c] : Math.min(60, Math.max(8, ...grid.slice(0, 300).map(r => String(r[c] ?? '').length + 2)))}));
return ws;
}

const LOGIC_W = {0: 9, 1: 34, 2: 10, 3: 22, 4: 18, 5: 34, 6: 10, 7: 18, 8: 12, 9: 8, 10: 10, 11: 34, 12: 11, 13: 9, 14: 30, 15: 10, 16: 34, 17: 30, 18: 11, 19: 90};

function preview(grid, max, cls) {
if (!grid.length) return '<div class="prev-more">Nothing to show</div>';
const [h, ...body] = grid;
return `<table class="${cls || ''}"><thead><tr>${h.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${body.slice(0, max).map(r => `<tr>${r.map((v, i) => `<td class="${typeof v === 'number' ? 'num' : ''} ${cls === 'logic' && i === h.length - 1 ? 'why' : ''}">${esc(typeof v === 'number' ? fmt(v, 10) : v ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>${body.length > max ? `<div class="prev-more">+ ${body.length - max} more rows in the file</div>` : ''}${!body.length ? '<div class="prev-more">Nothing to export</div>' : ''}`;
}

function aboutHTML(L) {
let html = '', open = false;
L.forEach(r => {
if (!r.length) return;
if (r[1] === null) { if (open) html += '</dl></section>'; html += `<section class="ab-sec"><h4>${esc(r[0])}</h4><dl>`; open = true; return; }
html += `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`;
});
return html + (open ? '</dl></section>' : '');
}

A.views.export = {
render(main) {
const scope = viewFiltered() ? st.S.scope : 'all';
const data = exportData(scope);
const r = data.r;
const name = st.src.name + '-bugvert';
const logic = Logic.logicRows(data.items, r, st.S, st.doc);
const about = Logic.about(r, st.S, st.doc, st.src);
const csv = st.S.fmt === 'csv';
main.innerHTML = `
<section class="exp">
<div class="card exp-main">
<header class="exp-h"><div class="exp-ic">${icon('export')}</div><div><h2>Export</h2><p>Exactly what the sheet shows, recalculated at the moment you export.</p></div></header>
<div class="exp-sum"><span><b>${data.rows.length}</b> rows</span><span>×</span><span><b>${data.cols.length}</b> columns</span>${r.stats.excluded ? `<span class="muted">${r.stats.excluded} excluded</span>` : ''}</div>
<div class="exp-opts">
${viewFiltered() ? `<label><span>Rows</span><div id="exp-scope"></div></label>` : ''}
<label><span>Format</span><div id="exp-fmt"></div></label>
<label><span>File name</span><div class="fn"><input class="field" id="exp-name" value="${esc(name)}" spellcheck="false"><em>.${csv ? 'csv' : 'xlsx'}</em></div></label>
</div>
<div class="exp-logic ${csv ? 'dim' : ''}">
<div class="el-t"><b>${icon('info')}Include the logic</b><small>${csv ? 'CSV holds one sheet. Use Download logic below, or pick Excel.' : 'Adds “Logic” (every row, step by step) and “How it works” (settings and formulas) sheets'}</small></div>
${csv ? '' : sw(st.S.expLogic, 'id="exp-lg" aria-label="Include logic sheets"')}
</div>
<div class="exp-act"><button class="btn ghost lg" id="exp-copy">${icon('copy')}Copy</button><button class="btn primary lg" id="exp-dl">${icon('export')}Download</button></div>
<button class="link exp-lonly" id="exp-ldl">${icon('file')}Download the logic on its own</button>
</div>
<div class="card exp-prev">
<header><div id="exp-tabs"></div><button class="link" id="exp-cols">${icon('columns')}Edit columns</button></header>
<div class="prev-wrap ${tab === 'about' ? 'about' : ''}">${tab === 'data' ? preview([data.head].concat(data.rows), 12) : tab === 'logic' ? preview(logic, 40, 'logic') : `<div class="about-wrap">${aboutHTML(about)}</div>`}</div>
</div>
</section>`;
seg($('#exp-tabs', main), {value: tab, options: [{value: 'data', label: 'Data', icon: 'sheet'}, {value: 'logic', label: 'Logic', icon: 'brain', count: logic.length - 1}, {value: 'about', label: 'How it works', icon: 'info'}], onChange: v => { tab = v; this.render(main); }});
if (viewFiltered()) seg($('#exp-scope', main), {value: st.S.scope, options: [{value: 'view', label: 'Current view', count: exportData('view').rows.length}, {value: 'all', label: 'All rows', count: exportData('all').rows.length}], onChange: v => ST.setS({scope: v})});
seg($('#exp-fmt', main), {value: st.S.fmt, options: [{value: 'xlsx', label: 'Excel'}, {value: 'csv', label: 'CSV'}], onChange: v => ST.setS({fmt: v})});
const lg = $('#exp-lg', main); if (lg) lg.onclick = () => ST.setS({expLogic: !st.S.expLogic});
$('#exp-cols', main).onclick = () => A.go('columns');
const fname = () => ($('#exp-name', main).value.trim() || name).replace(/[\\/:*?"<>|]+/g, '-');
$('#exp-copy', main).onclick = () => {
const d = exportData(scope);
if (tab !== 'data') {
const g = tab === 'logic' ? Logic.logicRows(d.items, d.r, st.S, st.doc) : Logic.about(d.r, st.S, st.doc, st.src);
return A.copyText(g.map(row => row.map(v => v == null ? '' : String(v).replace(/[\t\r\n]+/g, ' ')).join('\t')).join('\n'));
}
if (!d.cols.length || !d.rows.length) return toast('Nothing to copy', {tone: 'warn', icon: 'alert'});
const cell = v => v == null ? '' : String(v).replace(/[\t\r\n]+/g, ' ');
A.copyText([d.head].concat(d.rows).map(row => row.map(cell).join('\t')).join('\n'));
};
$('#exp-dl', main).onclick = () => {
const d = exportData(viewFiltered() ? st.S.scope : 'all');
if (!d.cols.length) return toast('Turn on at least one column', {tone: 'warn', icon: 'alert'});
if (!d.rows.length) return toast('No rows to export', {tone: 'warn', icon: 'alert'});
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, sheetOf([d.head].concat(d.rows)), 'bugvert');
const withLogic = st.S.fmt !== 'csv' && st.S.expLogic;
if (withLogic) {
XLSX.utils.book_append_sheet(wb, sheetOf(Logic.logicRows(d.items, d.r, st.S, st.doc), LOGIC_W), 'Logic');
XLSX.utils.book_append_sheet(wb, sheetOf(Logic.about(d.r, st.S, st.doc, st.src), {0: 30, 1: 110}), 'How it works');
}
if (st.S.fmt === 'csv') XLSX.writeFile(wb, fname() + '.csv', {bookType: 'csv'});
else XLSX.writeFile(wb, fname() + '.xlsx');
toast(`Exported ${d.rows.length} rows${withLogic ? ' with the logic' : ''}`, {icon: 'export'});
};
$('#exp-ldl', main).onclick = () => {
const d = exportData(viewFiltered() ? st.S.scope : 'all');
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, sheetOf(Logic.logicRows(d.items, d.r, st.S, st.doc), LOGIC_W), 'Logic');
XLSX.utils.book_append_sheet(wb, sheetOf(Logic.about(d.r, st.S, st.doc, st.src), {0: 30, 1: 110}), 'How it works');
if (st.S.fmt === 'csv') XLSX.writeFile(wb, fname() + '-logic.csv', {bookType: 'csv'});
else XLSX.writeFile(wb, fname() + '-logic.xlsx');
toast('Logic downloaded', {icon: 'file'});
};
},
update() { this.render($('#view')); }
};
})();
