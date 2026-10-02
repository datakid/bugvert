window.Logic = (() => {
const E = Engine;
const TSRC = {rule: 'Unit rule', unit: 'Unit default', default: 'Default pack size', memory: 'Remembered pack', name: 'Read from item name', row: 'Set by you', keep: 'Kept as is', off: 'Unit not converted', already: 'Already a pack', nosize: 'Pack size unknown', none: ''};
const FLAG = {
noUnit: 'No unit', badUnit: 'Unit could not be read', unknownUnit: 'Unit word not in the dictionary', noPrice: 'No price', noQty: 'No quantity', zeroQty: 'Quantity is 0',
partial: 'Quantity no longer whole', review: 'Duplicate prices disagree', edited: 'Edited by you', custom: 'Custom pack size', merged: 'Merged duplicates', dup: 'Has duplicates kept separate', junk: 'Empty row',
noSize: 'Container with no size', nameConflict: 'Name and unit disagree', nameMulti: 'Name has several sizes', fromName: 'Unit read from name'
};
const READ = {unit: 'Unit column', name: 'Item name', 'unit+name': 'Unit column + size from name', none: 'Nothing readable'};
const MODES = {off: 'Off: names are never read', fill: 'Fill gaps: names fill in what the unit column leaves out', prefer: 'Prefer name: a size in the name wins over the unit column'};
const SOURCES = {auto: 'Auto: unit column, then item name when the unit is empty', unit: 'Unit column only', name: 'Item name only'};
const LEVELS = {strict: 'Strict: only sure patterns', balanced: 'Balanced: sure and likely patterns', loose: 'Loose: every pattern, guesses too'};
const MULTI = {skip: 'Skip the row', best: 'Use the most certain one', largest: 'Use the largest'};
const ORDER = {memory: 'Remembered pack', name: 'Size in item name', unit: 'Unit default (Units tab)'};
const n = v => v == null ? '' : E.fmtN(v);
const fmtNum = (v, d) => v == null ? '' : String(+(+v).toFixed(Math.min(10, d + 2)));

function clue(rs) {
const nm = rs && rs.nm;
if (!nm) return '';
if (nm.count) return '“' + nm.match + '” → ' + nm.count + ' (' + E.PATS[nm.pat].label.toLowerCase() + ', ' + E.CONF_OF[nm.conf] + ')';
if (nm.multi) return 'several sizes: ' + [...new Set(nm.cands.filter(c => c.ok).map(c => c.n))].join(', ');
const rej = nm.cands.filter(c => !c.ok);
if (rej.length) return 'ignored ' + rej.map(c => '“' + c.text + '” (' + c.why + ')').join(', ');
return '';
}

function readAs(it) {
const p = it.parsed;
if (!p) return '';
if (p.measure) return n(p.count) + ' ' + p.tok + ' (a measure, not converted)';
const fam = E.FAM[p.family] ? E.FAM[p.family][p.count === 1 ? 1 : 2].toLowerCase() : '“' + p.tok + '”';
if (p.container) return p.count > 1 ? n(p.count) + ' ' + (E.FAM[p.out] ? E.FAM[p.out][2].toLowerCase() : 'pieces') + ' per box' : 'a box, size unknown';
return n(p.count) + ' ' + fam;
}

function why(it, res, S, doc) {
const p = it.parsed, rs = it.rs, parts = [];
if (it.flags.includes('junk')) return 'Empty row' + (it.excluded ? ', excluded automatically' : '');
if (!p) {
if (!it.unitRaw) parts.push('No unit and no size in the name, so the row is left as it is.');
else parts.push('“' + it.unitRaw + '” could not be read as a unit, so the row is left as it is.');
return parts.join(' ');
}
if (rs.src === 'name') parts.push('Unit taken from the name' + (rs.nm && rs.nm.count ? ' (“' + rs.nm.match + '”)' : ' (form word only)') + '.');
else if (rs.src === 'unit+name') parts.push('“' + it.unitRaw + '” has no size, so the size ' + p.count + ' came from the name (“' + rs.nm.match + '”).');
else parts.push('Read “' + it.unitRaw + '” as ' + readAs(it) + '.');
if (rs.conflict) parts.push('The name suggests ' + rs.nm.count + ' but the unit column says ' + n(p.count) + '. The unit column was used.');
const t = it.target, lbl = it.newUnit;
switch (it.tsrc) {
case 'rule': parts.push('Pack → single: each pack becomes ' + lbl + '.'); break;
case 'unit': parts.push('Target ' + n(t) + ' set for this unit in the Units tab.'); break;
case 'default': parts.push('Single → pack: nothing better was known, so the default pack size ' + n(t) + ' was used.'); break;
case 'memory': parts.push('Single → pack: ' + n(t) + ' is remembered for this item from an earlier file.'); break;
case 'name': parts.push('Single → pack: the name gives a pack of ' + n(t) + ' (“' + rs.nm.match + '”).'); break;
case 'row': parts.push('You set the target to ' + n(t) + ' for this row.'); break;
case 'keep': parts.push('You chose not to convert this row.'); break;
case 'off': parts.push('This unit is switched off in the Units tab.'); break;
case 'already': parts.push('Already a pack, and repacking is off.'); break;
case 'nosize': parts.push('A container with no known size can\'t be split. Set the pack size on the row or add it to the name.'); break;
}
if (it.converted) parts.push('Factor ' + n(t) + ' ÷ ' + n(p.count) + ' = ' + E.fmtN(it.factor) + ': price × factor, quantity ÷ factor.');
if (it.ov.price != null) parts.push('Price typed by you.');
if (it.ov.qty != null) parts.push('Quantity typed by you.');
if (it.flags.includes('partial')) parts.push('The new quantity is not a whole number.');
return parts.join(' ');
}

function priceCalc(it, S) {
if (it.oldPrice == null) return '';
if (it.ov && it.ov.price != null) return 'typed';
if (Math.abs(it.factor - 1) < 1e-12) return 'unchanged';
return fmtNum(it.oldPrice, S.priceDec) + ' × ' + E.fmtN(it.factor) + ' = ' + fmtNum(it.oldPrice * it.factor, S.priceDec) + ' → ' + S.priceDec + ' dp ' + S.priceMode;
}
function qtyCalc(it, S) {
if (it.oldQty == null) return '';
if (it.ov && it.ov.qty != null) return 'typed';
if (Math.abs(it.factor - 1) < 1e-12) return 'unchanged';
return fmtNum(it.oldQty, S.qtyDec) + ' ÷ ' + E.fmtN(it.factor) + ' = ' + fmtNum(it.oldQty / it.factor, S.qtyDec) + ' → ' + S.qtyDec + ' dp ' + S.qtyMode;
}
function dupText(it, res) {
const g = it.group;
if (!g) return '';
const RULE = {weighted: 'weighted by qty', avg: 'average', max: 'highest', min: 'lowest', first: 'first row', last: 'last row'};
if (g.merged && g.merged.rids.includes(it.rid)) return 'Merged with ' + (g.merged.rids.length - 1) + ' other row' + (g.merged.rids.length > 2 ? 's' : '') + (g.manual ? ' by you' : '') + ' · price ' + RULE[g.rule] + ' · qty summed';
if (g.mode === 'merge') return 'Taken out of a merge';
return 'Duplicate kept separate' + (g.review ? ' · prices differ ' + Math.round(g.spread * 100) + '%' : '') + (g.fuzzy ? ' · similar names' : '');
}

const HEAD = ['Source row', 'Name', 'Old unit', 'Read as', 'Read from', 'Name clue', 'Confidence', 'Rule', 'New unit', 'Factor', 'Old price', 'Price calculation', 'New price', 'Old qty', 'Qty calculation', 'New qty', 'Duplicates', 'Flags', 'Status', 'Explanation'];
function logicRows(items, res, S, doc) {
const rowsOut = [];
const seen = new Set();
items.forEach(x => {
const list = x.kind === 'merged' ? x.members : [x];
list.forEach(it => {
if (seen.has(it.rid)) return; seen.add(it.rid);
const mg = x.kind === 'merged' ? x : null;
rowsOut.push([
it.rid + 2, it.name || null, it.unitRaw || null, readAs(it) || null, READ[it.rs.src] || null, clue(it.rs) || null,
it.conf || null, TSRC[it.tsrc] || null, it.newUnit || null, it.parsed ? E.rnd(it.factor, 6) : null,
it.oldPrice, priceCalc(it, S) || null, it.newPrice, it.oldQty, qtyCalc(it, S) || null, it.newQty,
dupText(it, res) + (mg ? ' → ' + (E.fmtN(mg.newPrice ?? 0)) + ' @ ' + (E.fmtN(mg.newQty ?? 0)) : '') || null,
it.flags.filter(f => FLAG[f] && f !== 'fromName').map(f => FLAG[f]).join(', ') || null,
it.excluded ? 'Excluded' : it.converted ? 'Converted' : 'Unchanged',
why(it, res, S, doc)
]);
});
});
return [HEAD].concat(rowsOut);
}

function about(res, S, doc, src) {
const cfg = res.cfg, st = res.stats, da = doc.dirAuto || {};
const R = doc.roles;
const col = k => R[k] >= 0 ? src.headers[R[k]] : 'not found';
const on = Object.keys(E.PATS).filter(k => cfg.namePats[k]);
const off = Object.keys(E.PATS).filter(k => !cfg.namePats[k]);
const L = [];
const sec = t => L.push([t, null]);
const kv = (k, v) => L.push([k, v == null ? '' : String(v)]);
sec('bugvert 2.5 · how this file was converted');
kv('File', src.name + (src.sheet ? ' · ' + src.sheet : ''));
kv('Exported', new Date().toLocaleString());
kv('Rows', st.source + ' source · ' + st.rows + ' in output · ' + st.excluded + ' excluded · ' + st.converted + ' converted');
L.push([]);
sec('Columns used');
['name', 'unit', 'price', 'qty', 'value'].forEach(k => kv({name: 'Name', unit: 'Unit', price: 'Price', qty: 'Quantity', value: 'Value'}[k], col(k)));
L.push([]);
sec('Direction');
kv('Used', doc.dir === 'toBase' ? 'Pack → single' : 'Single → pack');
kv('How chosen', doc.dirTouched ? 'Set by you' : S.autoDir ? 'Detected: ' + (da.packs || 0) + ' packs vs ' + (da.singles || 0) + ' singles' + (da.fromName ? ' (' + da.fromName + ' read with help from names)' : '') : 'Auto-detect is off');
L.push([]);
sec('Detection settings');
kv('Unit source', SOURCES[cfg.unitSource]);
kv('Sizes in names', MODES[cfg.nameMode]);
kv('Certainty needed', LEVELS[cfg.nameConf]);
kv('Patterns on', on.map(k => E.PATS[k].label).join(', ') || 'none');
if (off.length) kv('Patterns off', off.map(k => E.PATS[k].label).join(', '));
kv('Valid pack range', cfg.nameMin + ' to ' + cfg.nameMax);
kv('Several sizes in a name', MULTI[cfg.nameMulti]);
kv('Flag name vs unit conflicts', cfg.flagConflict ? 'Yes' : 'No');
kv('Protected words', cfg.guardWords.join(', ') || 'none');
if (cfg.extraMeasures.length) kv('Extra strength units', cfg.extraMeasures.join(', '));
kv('Single → pack priority', cfg.order.map((k, i) => (i + 1) + '. ' + ORDER[k]).join('  ') + '  ' + (cfg.order.length + 1) + '. Default pack ' + S.packSize);
kv('Use pack memory', S.useMemory ? 'Yes' : 'No');
kv('Repack existing packs', S.repack ? 'Yes' : 'No');
L.push([]);
sec('Results');
kv('Unit read from', Object.entries(st.read).filter(([k]) => READ[k]).map(([k, v]) => READ[k] + ': ' + v).join(' · '));
kv('Rules applied', Object.entries(st.tsrc).filter(([k]) => TSRC[k]).map(([k, v]) => TSRC[k] + ': ' + v).join(' · '));
kv('Confidence', ['sure', 'likely', 'guess'].map(c => c + ': ' + (st.conf[c] || 0)).join(' · '));
kv('Need a look', st.issues + (st.conflicts ? ' · ' + st.conflicts + ' name/unit conflicts' : '') + (st.noSize ? ' · ' + st.noSize + ' containers with no size' : '') + (st.multi ? ' · ' + st.multi + ' names with several sizes' : ''));
L.push([]);
sec('Rounding');
kv('Price', S.priceDec + ' decimals, ' + S.priceMode);
kv('Quantity', S.qtyDec + ' decimals, ' + S.qtyMode);
L.push([]);
sec('Duplicates');
kv('Match', 'Same name' + (S.dupLoose ? ' (ignoring case, spaces, punctuation)' : '') + ' and same new unit' + (S.dupFuzzy ? ', near-duplicates allowed' : ''));
kv('Default', {smart: 'Smart: merge when prices are within ' + S.tolerance + '%', merge: 'Always merge', keep: 'Keep separate'}[S.dupMode]);
kv('Merged price', {weighted: 'Weighted by qty', avg: 'Average', max: 'Highest', min: 'Lowest', first: 'First row', last: 'Last row'}[S.mergeRule]);
kv('Groups', st.groups + ' found · ' + st.merged + ' merged · ' + st.review + ' to review');
const fams = Object.values(res.fams);
if (fams.length) {
L.push([]);
sec('Units found');
fams.sort((a, b) => b.rows - a.rows).forEach(f => { const r = res.famRule(f.id); kv(f.title, f.rows + ' rows · ' + (f.measure ? 'measure, never converted' : !f.known ? 'unknown word' : r.convert ? 'converted' + (r.target ? ' to ' + r.target : '') : 'off')); });
}
L.push([]);
sec('Formulas');
kv('Factor', 'target count ÷ count read from the unit');
kv('New price', 'old price × factor, then rounded');
kv('New quantity', 'old quantity ÷ factor, then rounded');
kv('New value', 'new price × new quantity');
L.push([]);
sec('Name patterns');
Object.entries(E.PATS).forEach(([k, p]) => kv(p.label, p.ex + ' · ' + {high: 'sure', medium: 'likely', low: 'guess'}[p.conf] + (cfg.namePats[k] ? '' : ' · off')));
return L;
}

function bench(name, unit, S, dir) {
const ctx = E.makeCtx(S);
const rs = E.resolve(E.clean(name), E.clean(unit), ctx);
const nm = rs.nm || (name ? E.readName(name, ctx.R) : null);
return {rs, nm};
}

return {TSRC, FLAG, READ, MODES, SOURCES, LEVELS, MULTI, ORDER, clue, readAs, why, priceCalc, qtyCalc, dupText, logicRows, about, bench, HEAD};
})();
