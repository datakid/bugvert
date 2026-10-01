(() => {
const $ = s => document.querySelector(s);
const ALIASES = {
tab: ['T','TAB','TABS','TABLET','TABLETS','TB','TBL','PILL','PILLS','P','قرص','اقراص','أقراص','ق','F','FT','FC','FILM','ODT','CHEW'],
cap: ['C','CAP','CAPS','CAPSULE','CAPSULES','كبسول','كبسولة','ك','SOFTGEL','SG'],
supp: ['SUPP','SUPPS','SUP','SUPPOSITORY','SUPPOSITORIES','لبوس','لبوسة'],
sachet: ['SACH','SACHET','SACHETS','SACHS','SAC','كيس','اكياس','أكياس'],
amp: ['AMP','AMPS','AMPOULE','AMPOULES','امبول','أمبول'],
vial: ['VIAL','VIALS','V','فيال'],
syringe: ['SYRINGE','SYR','PFS','PREFILLED','سرنجة','حقنة'],
inh: ['INH','INHALER','PUFF','PUFFS','بخاخ'],
bottle: ['B','BOT','BTL','BOTTLE','زجاجة'],
tube: ['TUBE','TUB','انبوبة','أنبوبة'],
patch: ['PATCH','PATCHES','لصقة'],
drop: ['DROP','DROPS','قطرة'],
lozenge: ['LOZ','LOZENGE','LOZENGES'],
box: ['BOX','BX','PK','PACK','علبة','عبوة'],
strip: ['STRIP','STRIPS','STR','شريط']
};
const FAMILY_NAME = {tab:'Tablets',cap:'Capsules',supp:'Suppositories',sachet:'Sachets',amp:'Ampoules',vial:'Vials',syringe:'Syringes',inh:'Inhalers',bottle:'Bottles',tube:'Tubes',patch:'Patches',drop:'Drops',lozenge:'Lozenges',box:'Boxes',strip:'Strips'};
const TOKEN_MAP = {};
Object.entries(ALIASES).forEach(([k, arr]) => arr.forEach(a => TOKEN_MAP[a] = k));
const HINTS = {
unit: ['unit','uom','pack','الوحدة','وحدة','العبوة'],
price: ['price','cost','السعر','سعر','ثمن'],
name: ['name','item','product','drug','description','الاسم','اسم','الصنف'],
qty: ['qty','quantity','stock','balance','الرصيد','رصيد','الكمية','كمية']
};
const state = {headers: [], rows: [], cols: {}, parsed: [], families: {}, enabled: new Set(), offCols: new Set(), offRows: new Set(), output: null, fileName: 'bugvert'};

const toLatin = s => String(s ?? '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/٫/g, '.').replace(/[٬،]/g, ',');
const clean = s => toLatin(s).replace(/[\u200e\u200f\u00a0\u202a-\u202e]/g, ' ').replace(/\s+/g, ' ').trim();
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function parseNum(v) {
if (typeof v === 'number') return isFinite(v) ? v : null;
let s = clean(v).replace(/[^\d.,\-]/g, '');
if (!s || !/\d/.test(s)) return null;
if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
else if (s.includes(',')) s = /,\d{3}$/.test(s) && s.split(',').length > 1 && !/,\d{1,2}$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
const n = parseFloat(s);
return isFinite(n) ? n : null;
}

function tokenFamily(tok) {
const t = tok.toUpperCase().replace(/[.\s]/g, '');
if (TOKEN_MAP[t]) return TOKEN_MAP[t];
if (t.length > 3 && t.endsWith('S') && TOKEN_MAP[t.slice(0, -1)]) return TOKEN_MAP[t.slice(0, -1)];
for (const [k, arr] of Object.entries(ALIASES)) if (t.length >= 3 && arr.some(a => a.length >= 3 && (a.startsWith(t) || t.startsWith(a)))) return k;
return 'x:' + t;
}

function parseUnit(raw) {
const s = clean(raw);
if (!s) return null;
let m, count = null, tok = '';
const W = '([A-Za-z\\u0600-\\u06FF][A-Za-z\\u0600-\\u06FF.]*)';
if ((m = s.match(new RegExp('^(\\d+(?:\\.\\d+)?)\\s*[x*×]\\s*(\\d+(?:\\.\\d+)?)\\s*' + W + '?$', 'i')))) { count = +m[1] * +m[2]; tok = m[3] || 'T'; }
else if ((m = s.match(new RegExp('^(\\d+(?:\\.\\d+)?)\\s*' + W + '$')))) { count = +m[1]; tok = m[2]; }
else if ((m = s.match(new RegExp('^' + W + '\\s*[x*×:\\-]?\\s*(\\d+(?:\\.\\d+)?)$')))) { count = +m[2]; tok = m[1]; }
else if ((m = s.match(new RegExp('^' + W + '(?:\\s+' + W + ')?$')))) { count = 1; tok = m[1]; }
else if ((m = s.match(/^(\d+(?:\.\d+)?)$/))) { return {count: +m[1], tok: '', family: 'x:#', raw: s, bare: true}; }
else if ((m = s.match(/(\d+(?:\.\d+)?)\s*([A-Za-z\u0600-\u06FF]+)/))) { count = +m[1]; tok = m[2]; }
else return null;
tok = tok.replace(/\.$/, '');
if (!count || count <= 0) return null;
return {count, tok, family: tokenFamily(tok), raw: s};
}

function scoreColumns(headers, rows) {
const sample = rows.slice(0, 400);
return headers.map((h, i) => {
const vals = sample.map(r => r[i]).filter(v => clean(v) !== '');
const n = vals.length || 1;
const hl = clean(h).toLowerCase();
const hint = k => HINTS[k].some(w => hl.includes(w)) ? 1 : 0;
const nums = vals.map(parseNum);
const numericRatio = vals.filter(v => /^[\d\s.,\-٠-٩٫]+$/.test(clean(v)) && parseNum(v) !== null).length / n;
const unitRatio = vals.filter(v => { const p = parseUnit(v); return p && !p.bare && clean(v).length <= 14; }).length / n;
const knownRatio = vals.filter(v => { const p = parseUnit(v); return p && !p.family.startsWith('x:') && clean(v).length <= 14; }).length / n;
const packRatio = vals.filter(v => /\d\s*[A-Za-z\u0600-\u06FF]/.test(clean(v)) && clean(v).length <= 14).length / n;
const uniq = new Set(vals.map(clean)).size / n;
const avgLen = vals.reduce((a, v) => a + clean(v).length, 0) / n;
const latinRatio = vals.filter(v => /[A-Za-z]{3,}/.test(v)).length / n;
const decRatio = nums.filter(x => x !== null && Math.abs(x % 1) > 0).length / n;
const fill = vals.length / (sample.length || 1);
return {
i,
unit: unitRatio + knownRatio * 2 + packRatio * 2 + (uniq < .3 ? .5 : 0) - (avgLen > 16 ? 2 : 0) + hint('unit') * 3,
price: numericRatio * 2 + decRatio + fill * .5 + hint('price') * 3 - (clean(h).match(/قيمة|value|total/i) ? 1.5 : 0),
name: latinRatio + uniq * 2 + Math.min(avgLen, 30) / 15 - numericRatio * 3 - unitRatio * 2 + hint('name') * 3,
qty: numericRatio * 1.5 - decRatio + (fill < .9 ? .3 : 0) + hint('qty') * 3 - hint('price') * 3
};
});
}

function pickCols() {
const sc = scoreColumns(state.headers, state.rows);
const used = new Set();
const pick = key => {
const best = [...sc].filter(s => !used.has(s.i)).sort((a, b) => b[key] - a[key])[0];
if (!best || best[key] <= .8) return -1;
used.add(best.i);
return best.i;
};
const unit = pick('unit'), name = pick('name'), price = pick('price'), qty = pick('qty');
state.cols = {unit, name, price, qty};
}

function detectHeaderRow(grid) {
let best = 0, bestScore = -1;
for (let r = 0; r < Math.min(grid.length, 20); r++) {
const row = grid[r] || [];
const filled = row.filter(c => clean(c) !== '');
const textual = filled.filter(c => parseNum(c) === null && clean(c).length < 40).length;
const s = textual * 2 + filled.length - (filled.length < 2 ? 100 : 0);
if (s > bestScore) { bestScore = s; best = r; }
}
return best;
}

function loadGrid(grid) {
grid = grid.map(r => (r || []).map(c => c == null ? '' : c)).filter(r => r.some(c => clean(c) !== ''));
if (!grid.length) return toast('No data found');
const width = Math.max(...grid.map(r => r.length));
grid = grid.map(r => { const a = r.slice(); while (a.length < width) a.push(''); return a; });
const keep = [...Array(width).keys()].filter(i => grid.some(r => clean(r[i]) !== ''));
grid = grid.map(r => keep.map(i => r[i]));
const hr = detectHeaderRow(grid);
const headers = grid[hr].map((h, i) => clean(h) || 'Column ' + (i + 1));
const seen = {};
state.headers = headers.map(h => seen[h] ? h + ' (' + (++seen[h]) + ')' : (seen[h] = 1, h));
state.rows = grid.slice(hr + 1).filter(r => !r.every((c, i) => clean(c) === clean(grid[hr][i])));
if (!state.rows.length) return toast('Only a header row was found');
state.offCols.clear();
state.offRows.clear();
pickCols();
analyze(true);
$('#settings-section').classList.remove('hidden');
$('#result-section').classList.remove('hidden');
fillSelects();
}

function analyze(resetEnabled) {
const {unit} = state.cols;
state.parsed = state.rows.map(r => unit >= 0 ? parseUnit(r[unit]) : null);
const fam = {};
state.parsed.forEach(p => {
if (!p) return;
const f = fam[p.family] ||= {family: p.family, rows: 0, tokens: {}, counts: {}};
f.rows++;
f.tokens[p.tok] = (f.tokens[p.tok] || 0) + 1;
f.counts[p.count] = (f.counts[p.count] || 0) + 1;
});
Object.values(fam).forEach(f => {
f.label = Object.entries(f.tokens).sort((a, b) => b[1] - a[1])[0][0] || '#';
f.multi = Object.keys(f.counts).some(c => +c > 1);
f.title = FAMILY_NAME[f.family] || (f.family === 'x:#' ? 'Bare numbers' : f.label);
});
state.families = fam;
if (resetEnabled) state.enabled = new Set(Object.values(fam).filter(f => f.multi && !f.family.startsWith('x:')).map(f => f.family));
renderChips();
run();
}

const ROLES = ['unit', 'price', 'name', 'qty'];
const ROLE_LABEL = {unit: 'Unit', price: 'Price', name: 'Name', qty: 'Quantity'};
function fillSelects() {
ROLES.forEach(k => {
const el = $('#' + k + '-col');
el.innerHTML = '<option value="-1">— none —</option>' + state.headers.map((h, i) => {
const other = ROLES.find(r => r !== k && state.cols[r] === i);
return `<option value="${i}">${esc(h)}${other ? ' · ' + ROLE_LABEL[other] : ''}</option>`;
}).join('');
el.value = String(state.cols[k]);
});
}
function setRole(k, v) {
const prev = state.cols[k];
if (prev === v) return;
const clash = v >= 0 ? ROLES.find(r => r !== k && state.cols[r] === v) : null;
state.cols[k] = v;
if (clash) {
state.cols[clash] = prev;
toast(`${ROLE_LABEL[clash]} moved to ${prev >= 0 ? '“' + state.headers[prev] + '”' : 'none'}`);
}
fillSelects();
analyze(k === 'unit' || clash === 'unit');
}

function renderChips() {
const fams = Object.values(state.families).sort((a, b) => b.rows - a.rows);
$('#unit-chips').innerHTML = fams.length ? fams.map(f => `<span class="chip ${state.enabled.has(f.family) ? 'on' : ''}" data-f="${esc(f.family)}" title="${esc(Object.keys(f.tokens).join(', '))}">${esc(f.title)} <small>${f.rows}</small></span>`).join('') : '<span class="sugg">No units detected — pick the unit column above.</span>';
}

function suggest(out) {
const s = [];
const fams = Object.values(state.families);
const unknown = fams.filter(f => f.family.startsWith('x:') && f.multi);
if (unknown.length) s.push(`Unrecognized pack units: ${unknown.map(f => '“' + f.label + '”').join(', ')} — tap them above to convert anyway.`);
const unparsed = state.parsed.filter((p, i) => !p && clean(state.rows[i][state.cols.unit]) !== '').length;
if (unparsed) s.push(`${unparsed} rows have unreadable units and were left untouched.`);
const noPrice = state.cols.price >= 0 ? state.rows.filter(r => parseNum(r[state.cols.price]) === null).length : 0;
if (noPrice) s.push(`${noPrice} rows have no valid price.`);
if ($('#merge-toggle').checked && state.cols.name < 0) s.push('Merging needs a name column — pick one above.');
if (!$('#merge-toggle').checked && out.dupes) s.push(`${out.dupes} items share name + unit after conversion — enable merge to combine them.`);
if ($('#merge-toggle').checked && out.conflicts) s.push(`${out.conflicts} merged items combined prices that differ by more than 50% — review the highlighted rows or change the merged price rule.`);
const counts = {};
state.parsed.forEach(p => { if (p && p.count > 1) counts[p.count] = (counts[p.count] || 0) + 1; });
const common = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
if (common && $('#direction').value === 'toPack' && +$('#pack-size').value !== +common[0]) s.push(`Most common pack size in this file is ${common[0]}.`);
$('#suggestions').innerHTML = s.map(x => `<div class="sugg">${esc(x)}</div>`).join('');
}

function round(n, d) { if (n == null) return ''; const f = Math.pow(10, d); return Math.round((n + Number.EPSILON) * f) / f; }

function run() {
const {unit, price, name, qty} = state.cols;
const dir = $('#direction').value;
const pack = Math.max(1, parseNum($('#pack-size').value) || 1);
const dRaw = parseInt($('#decimals').value);
const dec = isNaN(dRaw) ? 4 : Math.min(8, Math.max(0, dRaw));
const merge = $('#merge-toggle').checked && name >= 0;
const rescaleQty = qty >= 0 && ($('#qty-toggle').checked || merge);
const withValue = $('#value-toggle').checked && price >= 0 && qty >= 0;
const valueBasis = $('#value-basis').value;
let items = state.rows.map((r, i) => {
const p = state.parsed[i];
const pr = price >= 0 ? parseNum(r[price]) : null;
const q = qty >= 0 ? parseNum(r[qty]) : null;
const base = {src: i, row: r, unitOut: unit >= 0 ? clean(r[unit]) : '', priceOut: pr, qtyOut: q, qtyIn: q, factor: 1, converted: false, count: 1};
if (!p || !state.enabled.has(p.family)) return base;
const f = state.families[p.family];
const target = dir === 'toBase' ? 1 : pack;
const factor = target / p.count;
if (factor === 1) return {...base, unitOut: `${target} ${f.label}`, converted: true};
return {...base, unitOut: `${target} ${f.label}`, priceOut: pr == null ? null : pr * factor, qtyOut: q == null ? null : q / factor, factor, converted: true, count: 1};
});
const keyOf = (it, i) => name >= 0 && clean(it.row[name]) ? clean(it.row[name]).toLowerCase() + '|' + it.unitOut.toLowerCase().replace(/\s+/g, '') : '#' + i;
const groups = new Map();
items.forEach((it, i) => { const k = keyOf(it, i); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(it); });
const dupes = name >= 0 ? [...groups.values()].filter(g => g.length > 1).reduce((a, g) => a + g.length, 0) : 0;
if (merge) {
const strat = $('#merge-price') ? $('#merge-price').value : 'weighted';
items = [...groups.values()].map(g => {
if (g.length === 1) return g[0];
const tq = g.reduce((a, x) => a + (x.qtyOut || 0), 0);
const tqIn = g.reduce((a, x) => a + (x.qtyIn || 0), 0);
const hasQ = g.some(x => x.qtyOut != null);
const facs = new Set(g.map(x => round(x.factor, 6)));
const prices = g.map(x => x.priceOut).filter(x => x != null);
let p = null;
if (prices.length) {
if (strat === 'max') p = Math.max(...prices);
else if (strat === 'min') p = Math.min(...prices);
else if (strat === 'first') p = prices[0];
else if (tq > 0) p = g.reduce((a, x) => a + (x.priceOut || 0) * (x.qtyOut || 0), 0) / tq;
else p = prices.reduce((a, b) => a + b, 0) / prices.length;
}
const spread = prices.length > 1 ? Math.max(...prices) / Math.max(Math.min(...prices), 1e-9) : 1;
return {...g[0], priceOut: p, qtyOut: qty >= 0 && hasQ ? tq : null, qtyIn: qty >= 0 && hasQ ? tqIn : null, factor: facs.size === 1 ? g[0].factor : null, merged: g.length, spread};
});
}
const num = v => v == null || !isFinite(v) ? null : round(v, dec);
const cols = state.headers.map((h, i) => ({key: 'o:' + h, label: h, isNew: false, num: i === price || i === qty}));
const add = (label, num) => cols.push({key: 'n:' + label, label, isNew: true, num});
add('Unit ↦', false);
add('Price ↦', true);
if (rescaleQty) add('Qty ↦', true);
if (withValue) add('Value ↦', true);
add('Factor', true);
if (merge) add('Merged', true);
const data = items.map(it => {
const extra = [it.unitOut || null, num(it.priceOut)];
if (rescaleQty) extra.push(num(it.qtyOut));
if (withValue) {
const qv = valueBasis === 'orig' ? it.qtyIn : it.qtyOut;
extra.push(it.priceOut == null || qv == null ? null : num(it.priceOut * qv));
}
extra.push(it.factor == null ? null : round(it.factor, 6));
if (merge) extra.push(it.merged || 1);
return {cells: it.row.slice().concat(extra), it};
});
state.output = {cols, headers: cols.map(c => c.label), data, extraStart: state.headers.length, dupes, conflicts: items.filter(i => i.spread > 1.5).length};
renderTable();
suggest(state.output);
const conv = items.filter(i => i.converted && i.factor !== 1).length;
$('#stats').innerHTML = `<span><b>${state.rows.length}</b> rows</span><span><b>${conv}</b> converted</span>${merge ? `<span><b>${items.length}</b> after merge</span>` : ''}`;
}

function rowPasses(d) {
const it = d.it, f = $('#row-filter').value;
if (f === 'converted') return it.converted && it.factor !== 1;
if (f === 'unchanged') return !(it.converted && it.factor !== 1);
if (f === 'priced') return it.priceOut != null;
if (f === 'stocked') return (it.qtyOut ?? it.qtyIn ?? 0) > 0;
return true;
}
const visibleRows = () => state.output.data.filter(rowPasses);
const exportRows = () => visibleRows().filter(d => !state.offRows.has(d.it.src));
const exportCols = () => state.output.cols.map((c, i) => ({...c, i})).filter(c => !state.offCols.has(c.key));

function renderTable() {
const o = state.output;
const LIMIT = 1500;
const roleOf = i => ROLES.find(r => state.cols[r] === i);
const rows = visibleRows();
const onCount = rows.filter(d => !state.offRows.has(d.it.src)).length;
const allOn = rows.length && onCount === rows.length;
let h = `<thead><tr><th class="cb-col"><input type="checkbox" id="all-rows" aria-label="Include all rows" ${allOn ? 'checked' : ''}></th>` + o.cols.map((c, i) => {
const off = state.offCols.has(c.key);
const role = !c.isNew && roleOf(i);
return `<th class="${c.isNew ? 'new' : ''} ${off ? 'off' : ''}"><label class="col-toggle"><input type="checkbox" class="col-cb" data-key="${esc(c.key)}" ${off ? '' : 'checked'}><span>${esc(c.label)}</span>${role ? `<span class="role">${ROLE_LABEL[role]}</span>` : ''}</label></th>`;
}).join('') + '</tr></thead><tbody>';
h += rows.slice(0, LIMIT).map(d => {
const offR = state.offRows.has(d.it.src);
return `<tr class="${d.it.spread > 1.5 ? 'conflict' : ''} ${d.it.merged > 1 ? 'merged' : ''} ${!d.it.converted ? 'skip' : ''} ${offR ? 'off' : ''}"><td class="cb-col"><input type="checkbox" class="row-cb" data-src="${d.it.src}" ${offR ? '' : 'checked'} aria-label="Include row"></td>` + d.cells.map((c, i) => `<td class="${o.cols[i].num ? 'num' : ''} ${state.offCols.has(o.cols[i].key) ? 'off' : ''}">${esc(c ?? '')}</td>`).join('') + '</tr>';
}).join('');
if (!rows.length) h += `<tr><td colspan="${o.cols.length + 1}" class="empty">No rows match this filter.</td></tr>`;
if (rows.length > LIMIT) h += `<tr><td colspan="${o.cols.length + 1}" class="empty">Showing ${LIMIT} of ${rows.length} rows — export includes all of them.</td></tr>`;
$('#result-table').innerHTML = h + '</tbody>';
const ind = $('#all-rows');
if (ind) ind.indeterminate = onCount > 0 && onCount < rows.length;
updateSummary();
}

function updateSummary() {
const r = exportRows().length, c = exportCols().length;
$('#export-summary').innerHTML = `Exporting <b>${r}</b> rows × <b>${c}</b> columns`;
}

function exportValue(v, isNum) {
if (v == null) return null;
if (typeof v === 'number') return isFinite(v) ? v : null;
const s = clean(v);
if (s === '' || /^(null|undefined|nan)$/i.test(s)) return null;
if (/^-?\d+(\.\d+)?$/.test(s) && !/^-?0\d/.test(s)) return Number(s);
if (isNum) { const n = parseNum(s); if (n !== null) return n; }
return String(v).trim();
}

function exportGrid() {
const cols = exportCols();
return [cols.map(c => c.label)].concat(exportRows().map(d => cols.map(c => exportValue(d.cells[c.i], c.num))));
}

function toTSV() {
const cell = v => v == null ? '' : String(v).replace(/[\t\r\n]+/g, ' ');
return exportGrid().map(r => r.map(cell).join('\t')).join('\n');
}

async function copy(text) {
try { await navigator.clipboard.writeText(text); }
catch { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
toast('Copied to clipboard');
}

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 1800); }

function parseText(txt) {
const lines = txt.replace(/\r/g, '').split('\n');
if (lines.slice(0, 10).some(l => l.includes('\t'))) return lines.map(l => l.split('\t').map(c => c.replace(/^"(.*)"$/, '$1')));
const wb = XLSX.read(txt, {type: 'string', raw: true});
return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1, raw: true, defval: ''});
}

function readFile(file) {
state.fileName = file.name.replace(/\.[^.]+$/, '') || 'bugvert';
const r = new FileReader();
r.onerror = () => toast('Could not read this file');
if (/\.(xlsx|xlsm|xls|ods)$/i.test(file.name)) {
r.onload = e => {
try {
const wb = XLSX.read(new Uint8Array(e.target.result), {type: 'array'});
const name = wb.SheetNames.find(n => { const ref = wb.Sheets[n]['!ref']; return ref && ref !== 'A1'; }) || wb.SheetNames[0];
loadGrid(XLSX.utils.sheet_to_json(wb.Sheets[name], {header: 1, raw: true, defval: ''}));
} catch { toast('Could not read this file'); }
};
r.readAsArrayBuffer(file);
} else { r.onload = e => loadGrid(parseText(e.target.result)); r.readAsText(file); }
}

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
\t\t\t\t\t\t\t
مجاني\t049 A\tParacetamol 500\t12 Pill\t100\t9.0000\t900.0000\tباطنة`;

$('#browse-btn').onclick = e => { e.stopPropagation(); $('#file-input').click(); };
$('#drop-zone').onclick = () => $('#file-input').click();
$('#file-input').onchange = e => { if (e.target.files[0]) readFile(e.target.files[0]); e.target.value = ''; };
['dragenter', 'dragover'].forEach(ev => $('#drop-zone').addEventListener(ev, e => { e.preventDefault(); $('#drop-zone').classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => $('#drop-zone').addEventListener(ev, e => { e.preventDefault(); $('#drop-zone').classList.remove('over'); }));
$('#drop-zone').addEventListener('drop', e => e.dataTransfer.files[0] && readFile(e.dataTransfer.files[0]));
$('#parse-btn').onclick = () => { const t = $('#paste-input').value; if (!t.trim()) return toast('Paste some data first'); state.fileName = 'bugvert'; loadGrid(parseText(t)); };
$('#paste-input').addEventListener('paste', () => setTimeout(() => $('#parse-btn').click(), 0));
$('#sample-btn').onclick = () => { $('#paste-input').value = SAMPLE; $('#parse-btn').click(); };
$('#reset-btn').onclick = () => location.reload();
ROLES.forEach(k => $('#' + k + '-col').onchange = e => setRole(k, +e.target.value));
$('#direction').onchange = e => { $('#pack-size-wrap').classList.toggle('hidden', e.target.value !== 'toPack'); run(); };
['#pack-size', '#decimals'].forEach(s => $(s).oninput = () => state.output && run());
$('#qty-toggle').onchange = run;
$('#value-toggle').onchange = e => {
if (e.target.checked && (state.cols.price < 0 || state.cols.qty < 0)) toast('Pick a price and a quantity column first');
$('#value-basis-wrap').classList.toggle('hidden', !e.target.checked);
run();
};
$('#value-basis').onchange = run;
$('#row-filter').onchange = renderTable;
document.querySelector('.export-bar').onclick = e => {
const b = e.target.closest('[data-cols]');
if (!b || !state.output) return;
const m = b.dataset.cols;
state.offCols = new Set(state.output.cols.filter(c => m === 'none' || (m === 'orig' && c.isNew) || (m === 'new' && !c.isNew)).map(c => c.key));
renderTable();
};
$('#result-table').onchange = e => {
const t = e.target;
if (t.classList.contains('col-cb')) t.checked ? state.offCols.delete(t.dataset.key) : state.offCols.add(t.dataset.key);
else if (t.classList.contains('row-cb')) t.checked ? state.offRows.delete(+t.dataset.src) : state.offRows.add(+t.dataset.src);
else if (t.id === 'all-rows') visibleRows().forEach(d => t.checked ? state.offRows.delete(d.it.src) : state.offRows.add(d.it.src));
else return;
renderTable();
};
$('#merge-toggle').onchange = e => {
let w = $('#merge-price-wrap');
if (!w) {
w = document.createElement('label'); w.id = 'merge-price-wrap';
w.innerHTML = 'Merged price<select id="merge-price"><option value="weighted">Weighted by qty</option><option value="max">Highest</option><option value="min">Lowest</option><option value="first">First seen</option></select>';
$('.settings-grid').appendChild(w);
$('#merge-price').onchange = run;
}
w.classList.toggle('hidden', !e.target.checked);
run();
};
$('#unit-chips').onclick = e => { const c = e.target.closest('.chip'); if (!c) return; const f = c.dataset.f; state.enabled.has(f) ? state.enabled.delete(f) : state.enabled.add(f); renderChips(); run(); };
const canExport = () => {
if (!state.output) return false;
if (!exportCols().length) { toast('Tick at least one column'); return false; }
if (!exportRows().length) { toast('No rows are ticked'); return false; }
return true;
};
$('#copy-btn').onclick = () => canExport() && copy(toTSV());
$('#download-btn').onclick = () => {
if (!canExport()) return;
const grid = exportGrid();
const ws = XLSX.utils.aoa_to_sheet(grid);
ws['!cols'] = grid[0].map((_, c) => ({wch: Math.min(40, Math.max(8, ...grid.slice(0, 200).map(r => String(r[c] ?? '').length + 2)))}));
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Converted');
XLSX.writeFile(wb, state.fileName + '-bugvert.xlsx');
};
})();
