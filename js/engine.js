window.Engine = (() => {
const ALIASES = {
tab: ['T','TAB','TABS','TABLET','TABLETS','TB','TBL','PILL','PILLS','P','قرص','اقراص','أقراص','ق','F','FT','FC','FILM','ODT','CHEW','EFF','EFFERVESCENT'],
cap: ['C','CAP','CAPS','CAPSULE','CAPSULES','كبسول','كبسولة','كبسولات','ك','SOFTGEL','SOFTGELS','SG'],
supp: ['SUPP','SUPPS','SUP','SUPPOSITORY','SUPPOSITORIES','لبوس','لبوسة'],
sachet: ['SACH','SACHET','SACHETS','SACHS','SAC','كيس','اكياس','أكياس'],
amp: ['AMP','AMPS','AMPOULE','AMPOULES','امبول','أمبول','امبولة'],
vial: ['VIAL','VIALS','V','فيال'],
syringe: ['SYRINGE','SYRINGES','PFS','PREFILLED','سرنجة','حقنة'],
inh: ['INH','INHALER','INHALERS','PUFF','PUFFS','بخاخ'],
bottle: ['B','BOT','BTL','BOTTLE','BOTTLES','SYRUP','SUSP','SUSPENSION','SOL','SOLUTION','LOTION','SPRAY','زجاجة','شراب','دواء شرب'],
tube: ['TUBE','TUBES','TUB','CREAM','OINT','OINTMENT','GEL','انبوبة','أنبوبة','كريم','مرهم','جل'],
patch: ['PATCH','PATCHES','لصقة'],
drop: ['DROP','DROPS','قطرة','نقط'],
lozenge: ['LOZ','LOZENGE','LOZENGES'],
box: ['BOX','BOXES','BX','PK','PACK','PACKS','علبة','عبوة'],
strip: ['STRIP','STRIPS','STR','شريط']
};
const FAM = {
tab: ['Tab','Tablet','Tablets'], cap: ['Cap','Capsule','Capsules'], supp: ['Supp','Suppository','Suppositories'],
sachet: ['Sach','Sachet','Sachets'], amp: ['Amp','Ampoule','Ampoules'], vial: ['Vial','Vial','Vials'],
syringe: ['Syr','Syringe','Syringes'], inh: ['Inh','Inhaler','Inhalers'], bottle: ['Btl','Bottle','Bottles'],
tube: ['Tube','Tube','Tubes'], patch: ['Patch','Patch','Patches'], drop: ['Drop','Drop','Drops'],
lozenge: ['Loz','Lozenge','Lozenges'], box: ['Box','Box','Boxes'], strip: ['Strip','Strip','Strips']
};
const MEASURE = new Set(['ML','MG','G','GM','GR','GRAM','L','LTR','LITER','MCG','UG','IU','KG','CC','MM','CM']);
const HINTS = {
name: ['name','item','product','drug','desc','description','الاسم','اسم','الصنف','البيان','المادة','الدواء'],
unit: ['unit','uom','pack','الوحدة','وحدة','العبوة'],
price: ['price','cost','rate','السعر','سعر','ثمن','تكلفة'],
qty: ['qty','quantity','stock','balance','on hand','onhand','الرصيد','رصيد','الكمية','كمية','العدد'],
value: ['value','total','amount','قيمة','الاجمالي','الإجمالي','اجمالي','إجمالي','المبلغ'],
code: ['code','sku','id','barcode','رقم','الرقم','كود','الكود']
};
const ISSUE_FLAGS = ['noUnit','badUnit','unknownUnit','noPrice','partial','review'];
const PACKABLE = new Set(['tab','cap','supp','sachet','amp','vial','lozenge','patch','strip']);

const AR = '٠١٢٣٤٥٦٧٨٩', FA = '۰۱۲۳۴۵۶۷۸۹';
const toLatin = s => String(s ?? '').replace(/[٠-٩]/g, d => AR.indexOf(d)).replace(/[۰-۹]/g, d => FA.indexOf(d)).replace(/٫/g, '.').replace(/[٬،]/g, ',');
const clean = s => toLatin(s).replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff\u00a0\t]/g, ' ').replace(/\s+/g, ' ').trim();
const isEmpty = v => v == null || clean(v) === '';

function isNumCell(v) {
if (typeof v === 'number') return isFinite(v);
const s = clean(v).replace(/[\s$€£]/g, '');
return /^[-+]?\d[\d,.]*%?$/.test(s) || /^[-+]?\.\d+$/.test(s);
}

function parseNum(v) {
if (typeof v === 'number') return isFinite(v) ? v : null;
let s = clean(v);
if (!s || !/\d/.test(s)) return null;
const neg = /^\(.*\)$/.test(s) || /^-/.test(s);
s = s.replace(/[^\d.,]/g, '');
if (!s) return null;
if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
else if (s.includes(',')) s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(/,/g, '.');
if ((s.match(/\./g) || []).length > 1) s = s.replace(/\.(?=.*\.)/g, '');
const n = parseFloat(s);
return isFinite(n) ? (neg ? -n : n) : null;
}

function buildDict(user) {
const d = {};
Object.entries(ALIASES).forEach(([k, arr]) => arr.forEach(a => d[a] = k));
Object.entries(user || {}).forEach(([t, k]) => { if (t && k) d[String(t).toUpperCase()] = k; });
return d;
}

function tokenFamily(tok, dict) {
const t = tok.toUpperCase().replace(/[.\s'’]/g, '');
if (!t) return 'x:#';
if (dict[t]) return dict[t];
if (MEASURE.has(t)) return 'm:' + t;
if (t.length > 3 && t.endsWith('S') && dict[t.slice(0, -1)]) return dict[t.slice(0, -1)];
if (t.length >= 3) {
for (const [a, k] of Object.entries(dict)) if (a.length >= 3 && /^[A-Z]+$/.test(a) && (a.startsWith(t) || t.startsWith(a))) return k;
}
return 'x:' + t;
}

function parseUnit(raw, dict) {
let s = clean(raw).replace(/['’]s\b/gi, '');
if (!s) return null;
const W = '([A-Za-z\\u0600-\\u06FF][A-Za-z\\u0600-\\u06FF.]*)';
const N = '(\\d+(?:\\.\\d+)?)';
let m, count = null, tok = '';
if ((m = s.match(new RegExp('^' + N + '\\s*[x*×]\\s*' + N + '\\s*' + W + '?$', 'i')))) { count = +m[1] * +m[2]; tok = m[3] || ''; }
else if ((m = s.match(new RegExp('^' + N + '\\s*' + W + '$')))) { count = +m[1]; tok = m[2]; }
else if ((m = s.match(new RegExp('^' + W + '\\s*(?:of|x|\\*|×|:|-)?\\s*' + N + '$', 'i')))) { count = +m[2]; tok = m[1]; }
else if ((m = s.match(new RegExp('^' + W + '(?:\\s+' + W + ')?$')))) { count = 1; tok = m[1]; }
else if ((m = s.match(new RegExp('^' + N + '$')))) { count = +m[1]; tok = ''; }
else if ((m = s.match(new RegExp(N + '\\s*' + W)))) { count = +m[1]; tok = m[2]; }
else return null;
tok = tok.replace(/\.+$/, '');
if (!count || count <= 0) return null;
const family = tokenFamily(tok, dict);
return {count, tok, family, known: !!FAM[family], measure: family.startsWith('m:')};
}

function ingest(grid) {
grid = (grid || []).map(r => (r || []).map(c => c == null ? '' : c)).filter(r => r.some(c => !isEmpty(c)));
if (!grid.length) return null;
const width = Math.max(...grid.map(r => r.length));
grid = grid.map(r => { const a = r.slice(); while (a.length < width) a.push(''); return a; });
const keep = [...Array(width).keys()].filter(i => grid.some(r => !isEmpty(r[i])));
grid = grid.map(r => keep.map(i => r[i]));
const dict = buildDict();
const kind = c => {
if (isEmpty(c)) return 'e';
if (isNumCell(c)) return 'n';
const p = parseUnit(c, dict);
if (p && p.known && clean(c).length <= 10 && /\d/.test(clean(c))) return 'u';
return clean(c).length < 48 ? 't' : 'l';
};
let best = -1, bestScore = -Infinity;
for (let r = 0; r < Math.min(grid.length, 15); r++) {
const ks = grid[r].map(kind);
const filled = ks.filter(k => k !== 'e').length;
if (filled < 2) continue;
const t = ks.filter(k => k === 't').length, n = ks.filter(k => k === 'n').length, u = ks.filter(k => k === 'u').length;
const next = grid[r + 1] ? grid[r + 1].map(kind) : [];
const nextNum = next.filter(k => k === 'n' || k === 'u').length;
const score = t * 2 - n * 3 - u * 3 + filled * .5 + nextNum * .8 - r * .2;
if (t >= Math.max(2, filled * .6) && n === 0 && u === 0 && score > bestScore) { bestScore = score; best = r; }
}
let headers;
if (best >= 0) headers = grid[best].map((h, i) => clean(h) || 'Column ' + (i + 1));
else headers = grid[0].map((_, i) => 'Column ' + (i + 1));
const seen = {};
headers = headers.map(h => seen[h] ? h + ' ' + (++seen[h]) : (seen[h] = 1, h));
const hdrRaw = best >= 0 ? grid[best].map(clean) : null;
const rows = grid.slice(best + 1).filter(r => !hdrRaw || !r.every((c, i) => clean(c) === hdrRaw[i]));
return {headers, rows, hadHeader: best >= 0};
}

function colStats(rows, i, dict) {
const all = rows.length || 1;
const vals = [];
for (let r = 0; r < rows.length && vals.length < 600; r++) if (!isEmpty(rows[r][i])) vals.push(rows[r][i]);
const n = vals.length || 1;
const cl = vals.map(clean);
const numeric = vals.filter(isNumCell);
const nums = numeric.map(parseNum).filter(x => x !== null);
const units = vals.map(v => clean(v).length <= 16 ? parseUnit(v, dict) : null);
const uniqSet = new Set(cl.map(s => s.toLowerCase()));
let seq = 0;
for (let k = 1; k < nums.length; k++) if (Math.abs(nums[k] - nums[k - 1] - 1) < 1e-9) seq++;
return {
fill: vals.length / all,
count: vals.length,
num: numeric.length / n,
dec: nums.filter(x => Math.abs(x % 1) > 1e-9).length / n,
int: nums.filter(x => Math.abs(x % 1) <= 1e-9).length / n,
unit: units.filter(p => p && p.family !== 'x:#').length / n,
known: units.filter(p => p && p.known).length / n,
packish: cl.filter(s => s.length <= 14 && /\d\s*[A-Za-z\u0600-\u06FF]|[A-Za-z\u0600-\u06FF]\s*\d/.test(s)).length / n,
uniq: uniqSet.size / n,
uniqCount: uniqSet.size,
len: cl.reduce((a, s) => a + s.length, 0) / n,
letters: cl.filter(s => /[A-Za-z\u0600-\u06FF]{3,}/.test(s)).length / n,
digitsMix: cl.filter(s => /\d/.test(s) && /[A-Za-z\u0600-\u06FF]/.test(s)).length / n,
seq: nums.length > 4 ? seq / (nums.length - 1) : 0,
zeros: nums.filter(x => x === 0).length / n
};
}

function hintScore(h, role) {
const s = clean(h).toLowerCase();
return HINTS[role].some(w => w.length <= 3 ? new RegExp('(^|[^a-z])' + w + '([^a-z]|$)').test(s) : s.includes(w)) ? 1 : 0;
}

function detect(headers, rows, userAliases) {
const dict = buildDict(userAliases);
const st = headers.map((h, i) => ({i, h, s: colStats(rows, i, dict), hint: Object.fromEntries(Object.keys(HINTS).map(k => [k, hintScore(h, k)]))}));
const cols = st.map(c => ({i: c.i, kind: 'other', garbage: false, reason: '', conf: ''}));
st.forEach(c => {
const g = cols[c.i];
if (c.s.fill < .03) { g.garbage = true; g.reason = 'Almost empty'; }
else if (c.s.uniqCount === 1 && c.s.count > 2) { g.garbage = true; g.reason = 'Same value in every row'; }
else if (c.s.num > .9 && c.s.seq > .85 && c.s.int > .9) { g.garbage = true; g.reason = 'Row numbers'; }
});
for (let a = 0; a < st.length; a++) for (let b = 0; b < a; b++) {
if (cols[a].garbage || cols[b].garbage) continue;
let same = 0, tot = 0;
for (let r = 0; r < Math.min(rows.length, 300); r++) { tot++; if (clean(rows[r][a]) === clean(rows[r][b])) same++; }
if (tot && same / tot > .98) { cols[a].garbage = true; cols[a].reason = 'Copy of “' + headers[b] + '”'; }
}
const roles = {name: -1, unit: -1, price: -1, qty: -1, value: -1};
const conf = {};
const live = c => !cols[c.i].garbage;
const unitC = st.filter(live).map(c => ({c, sc: c.s.known * 3 + c.s.unit * 2 + c.s.packish + (c.s.uniq < .3 ? .5 : 0) - (c.s.len > 16 ? 3 : 0) - (c.s.num > .8 ? 4 : 0) + c.hint.unit * 1.5}))
.filter(x => x.c.s.unit >= .35 || (x.c.hint.unit && x.c.s.num < .5)).sort((a, b) => b.sc - a.sc)[0];
if (unitC) { roles.unit = unitC.c.i; conf.unit = unitC.c.s.known > .6 ? 'high' : unitC.c.s.unit > .5 ? 'medium' : 'low'; }
const numC = st.filter(c => live(c) && c.i !== roles.unit && c.s.num >= .85);
const N = (r, i) => { const v = rows[r][i]; return isEmpty(v) ? 0 : parseNum(v); };
let trip = null;
const cand = numC.slice(0, 10);
for (const a of cand) for (const b of cand) {
if (b.i <= a.i) continue;
for (const c of cand) {
if (c.i === a.i || c.i === b.i) continue;
let ok = 0, tot = 0, real = 0;
for (let r = 0; r < Math.min(rows.length, 500); r++) {
const x = N(r, a.i), y = N(r, b.i), z = N(r, c.i);
if (x === null || y === null || z === null) continue;
if (x === 0 && y === 0 && z === 0) continue;
tot++;
if (Math.abs(x * y - z) <= Math.max(.011, Math.abs(z) * .002)) { ok++; if (z !== 0) real++; }
}
const ratio = tot ? ok / tot : 0;
if (real >= 3 && ratio >= .7 && (!trip || ratio > trip.ratio)) trip = {a, b, c, ratio};
}
}
const pScore = c => c.s.dec * 2 + c.s.fill + c.hint.price * 2 - c.hint.qty * 2 - c.hint.value * 1.5 - c.hint.code * 2;
const qScore = c => c.s.int * 1.5 + (1 - c.s.fill) * .6 + c.s.zeros * .3 + c.hint.qty * 2 - c.hint.price * 2 - c.hint.value * 1.5 - c.hint.code * 2;
if (trip) {
const [p, q] = pScore(trip.a) - qScore(trip.a) >= pScore(trip.b) - qScore(trip.b) ? [trip.a, trip.b] : [trip.b, trip.a];
roles.price = p.i; roles.qty = q.i; roles.value = trip.c.i;
conf.price = conf.qty = conf.value = 'high';
} else {
const p = numC.filter(c => !c.hint.value && !c.hint.code).sort((a, b) => pScore(b) - pScore(a))[0];
if (p) { roles.price = p.i; conf.price = p.hint.price ? 'high' : 'medium'; }
const q = numC.filter(c => c.i !== roles.price && !c.hint.value && !c.hint.code).sort((a, b) => qScore(b) - qScore(a))[0];
if (q && (qScore(q) > .8)) { roles.qty = q.i; conf.qty = q.hint.qty ? 'high' : 'low'; }
const v = numC.find(c => c.hint.value && c.i !== roles.price && c.i !== roles.qty);
if (v) { roles.value = v.i; conf.value = 'medium'; }
}
const used = new Set(Object.values(roles).filter(i => i >= 0));
const nameC = st.filter(c => live(c) && !used.has(c.i) && c.s.num < .5).map(c => ({c, sc: c.s.letters * 2 + c.s.uniq * 2 + Math.min(c.s.len, 30) / 10 + c.hint.name * 1.5 - (c.s.len < 7 && c.s.digitsMix > .5 ? 2 : 0) - c.hint.code * 2 - c.s.unit}))
.sort((a, b) => b.sc - a.sc)[0];
if (nameC && nameC.sc > 1.5) { roles.name = nameC.c.i; conf.name = nameC.sc > 4 ? 'high' : 'medium'; }
st.forEach(c => {
const g = cols[c.i];
const role = Object.keys(roles).find(k => roles[k] === c.i);
if (role) { g.kind = role; g.conf = conf[role]; g.garbage = false; g.reason = ''; return; }
if (g.garbage) return;
if (c.s.digitsMix > .6 && c.s.len < 12 && c.s.uniq > .5) g.kind = 'code';
else if (c.hint.code) g.kind = 'code';
else if (c.s.num < .5 && c.s.uniqCount <= Math.max(12, c.s.count * .3)) g.kind = 'category';
});
return {roles, cols};
}

function detectDirection(headers, rows, unitCol, userAliases) {
if (unitCol < 0) return {dir: 'toBase', packs: 0, singles: 0};
const dict = buildDict(userAliases);
let packs = 0, singles = 0;
rows.forEach(r => { const p = parseUnit(r[unitCol], dict); if (!p || p.measure) return; p.count > 1 ? packs++ : singles++; });
return {dir: packs >= singles ? 'toBase' : 'toPack', packs, singles};
}

function rnd(n, d, mode) {
if (n == null || !isFinite(n)) return null;
const f = Math.pow(10, Math.max(0, Math.min(10, d | 0)));
const x = n * f;
const e = 1e-9 * Math.max(1, Math.abs(x));
let r;
if (mode === 'up') r = Math.ceil(x - e);
else if (mode === 'down') r = Math.floor(x + e);
else r = Math.round(x + (x >= 0 ? e : -e));
const out = r / f;
return Object.is(out, -0) ? 0 : out;
}

const nameKey = (s, loose) => { let k = clean(s).toLowerCase(); if (loose) k = k.replace(/[^a-z0-9\u0600-\u06FF]+/g, ''); return k; };
const memKey = s => nameKey(s, true);
const NOISE = new Set(['mg','mcg','ug','g','gm','ml','iu','tab','tabs','tablet','tablets','cap','caps','capsule','capsules','film','coated','fc','f','t','c','s','x']);
function fuzzyKey(s) {
return clean(s).toLowerCase().replace(/(\d)([a-z\u0600-\u06FF])/g, '$1 $2').replace(/([a-z\u0600-\u06FF])(\d)/g, '$1 $2')
.split(/[^a-z0-9.\u0600-\u06FF]+/).map(w => w.replace(/^\.+|\.+$/g, '')).filter(w => w && !NOISE.has(w))
.map(w => w.length > 4 && w.endsWith('s') && !/\d/.test(w) ? w.slice(0, -1) : w).sort().join(' ');
}
function lev(a, b, max) {
if (Math.abs(a.length - b.length) > max) return max + 1;
let prev = Array.from({length: b.length + 1}, (_, i) => i);
for (let i = 1; i <= a.length; i++) {
const cur = [i]; let best = i;
for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); if (cur[j] < best) best = cur[j]; }
if (best > max) return max + 1;
prev = cur;
}
return prev[b.length];
}
function clusterFuzzy(gmap) {
const buckets = new Map();
[...gmap.keys()].filter(k => !k.startsWith('m:')).forEach(k => {
const cut = k.lastIndexOf('|'), words = k.slice(0, cut).split(' ');
const letters = words.filter(w => !/\d/.test(w)).join(' ');
const b = k.slice(cut) + '|' + words.filter(w => /\d/.test(w)).join(' ') + '|' + letters.charAt(0);
if (!buckets.has(b)) buckets.set(b, []);
buckets.get(b).push({k, letters});
});
buckets.forEach(list => {
if (list.length < 2 || list.length > 400) return;
for (let i = 0; i < list.length; i++) {
if (!gmap.has(list[i].k)) continue;
for (let j = i + 1; j < list.length; j++) {
const a = list[i], b = list[j];
if (!gmap.has(b.k)) continue;
const L = Math.min(a.letters.length, b.letters.length), tol = L >= 12 ? 2 : L >= 5 ? 1 : 0;
if (tol && lev(a.letters, b.letters, tol) <= tol) { gmap.get(a.k).push(...gmap.get(b.k)); gmap.delete(b.k); }
}
}
});
gmap.forEach((ms, k) => { ms.sort((x, y) => x.rid - y.rid); ms.forEach(m => m.gkey = k); });
}
const PACK_WORDS = 'tabs?|tablets?|caps?|capsules?|pcs?|pieces?|sachets?|amps?|ampoules?|supps?|vials?|strips?|قرص|اقراص|أقراص|كبسولة|كبسولات|كبسول';
const B = '(?:^|[\\s(\\-/])', A_ = '(?=$|[\\s)\\-/,])';
const NAME_RX = [new RegExp(B + '(\\d{1,4})\\s*[\'’]?s' + A_, 'i'), new RegExp(B + '[x×*]\\s*(\\d{1,4})' + A_, 'i'), new RegExp(B + '(\\d{1,4})\\s*(?:' + PACK_WORDS + ')' + A_, 'i')];
function namePack(name) {
const s = clean(name); if (!s) return null;
const mm = s.match(new RegExp(B + '(\\d{1,2})\\s*[x×*]\\s*(\\d{1,3})' + A_, 'i'));
if (mm) { const n = +mm[1] * +mm[2]; if (+mm[1] > 0 && n > 1 && n <= 1000) return n; }
for (const rx of NAME_RX) { const m = s.match(rx); if (m) { const n = +m[1]; if (n > 1 && n <= 1000) return n; } }
return null;
}
const fmtN = n => String(+(+n).toFixed(4));

function famTitle(id, f) {
if (FAM[id]) return FAM[id][2];
if (id === 'x:#') return 'Bare numbers';
if (id.startsWith('m:')) return id.slice(2) + ' (measure)';
return f && f.tok ? f.tok : id.slice(2);
}

function compute(src, doc, S, mem) {
const dict = buildDict(S.aliases);
const R = doc.roles;
const has = Object.prototype.hasOwnProperty;
const base = src.rows.map((raw, rid) => {
const ov = doc.rows[rid] || {};
const cells = ov.cells ? raw.map((c, i) => has.call(ov.cells, i) ? ov.cells[i] : c) : raw;
const name = R.name >= 0 ? clean(cells[R.name]) : '';
const unitRaw = R.unit >= 0 ? clean(cells[R.unit]) : '';
const parsed = unitRaw ? parseUnit(unitRaw, dict) : null;
const price = R.price >= 0 ? parseNum(cells[R.price]) : null;
const qty = R.qty >= 0 ? parseNum(cells[R.qty]) : null;
const junk = !name && !unitRaw;
return {rid, raw, cells, name, unitRaw, parsed, price, qty, ov, junk};
});
const fams = {};
base.forEach(b => {
const p = b.parsed;
if (!p) return;
const f = fams[p.family] ||= {id: p.family, rows: 0, packs: 0, tokens: {}, counts: {}, known: p.known, measure: p.measure};
f.rows++;
if (p.count > 1) f.packs++;
f.tokens[p.tok] = (f.tokens[p.tok] || 0) + 1;
f.counts[p.count] = (f.counts[p.count] || 0) + 1;
});
Object.values(fams).forEach(f => {
f.tok = Object.entries(f.tokens).sort((a, b) => b[1] - a[1])[0][0];
f.title = famTitle(f.id, f);
f.short = FAM[f.id] ? FAM[f.id][0] : f.tok;
});
const memFams = new Set(Object.values(mem || {}).map(m => m.family));
const famRule = id => {
const f = fams[id] || {known: false, measure: false, packs: 0};
const r = doc.fam[id] || {};
const auto = f.known && !f.measure && (doc.dir === 'toPack' ? (PACKABLE.has(id) || memFams.has(id)) : f.packs > 0);
return {convert: r.convert ?? auto, auto, target: r.target || null, label: r.label || ''};
};
const labelFor = (id, n) => {
const f = fams[id], rule = famRule(id);
if (rule.label) return rule.label;
if (!f) return '';
if (S.unitStyle === 'short' && FAM[id]) return FAM[id][0];
if (S.unitStyle === 'long' && FAM[id]) return n === 1 ? FAM[id][1] : FAM[id][2];
return f.tok;
};
const fmtUnit = (n, label) => {
if (!label) return fmtN(n);
if (S.hideOne && n === 1) return label;
return S.unitSpace ? fmtN(n) + ' ' + label : fmtN(n) + label;
};
const PD = S.priceDec, PM = S.priceMode, QD = S.qtyDec, QM = S.qtyMode;
const items = base.map(b => {
const p = b.parsed, ov = b.ov, flags = [];
let target = null, tsrc = 'none';
if (!b.unitRaw) { if (R.unit >= 0 && !b.junk) flags.push('noUnit'); }
else if (!p) flags.push('badUnit');
if (p) {
const f = fams[p.family], rule = famRule(p.family);
if (!f.known && !f.measure) flags.push('unknownUnit');
const ot = ov.target;
if (ot === 'keep') { target = p.count; tsrc = 'keep'; }
else if (typeof ot === 'number' && ot > 0) { target = ot; tsrc = 'row'; }
else if (!rule.convert) { target = p.count; tsrc = 'off'; }
else if (doc.dir === 'toBase') { target = rule.target || 1; tsrc = rule.target ? 'unit' : 'rule'; }
else if (p.count > 1 && !S.repack) { target = p.count; tsrc = 'already'; }
else {
const m = S.useMemory && b.name ? mem[memKey(b.name)] : null;
const np = S.useName ? namePack(b.name) : null;
if (m && m.family === p.family && m.count > 0) { target = m.count; tsrc = 'memory'; }
else if (np) { target = np; tsrc = 'name'; }
else if (rule.target) { target = rule.target; tsrc = 'unit'; }
else { target = S.packSize; tsrc = 'default'; }
}
}
const factor = p && target ? target / p.count : 1;
const autoPrice = b.price == null ? null : rnd(b.price * factor, PD, PM);
const autoQty = b.qty == null ? null : rnd(b.qty / factor, QD, QM);
const newPrice = ov.price != null ? ov.price : autoPrice;
const newQty = ov.qty != null ? ov.qty : autoQty;
const same = Math.abs(factor - 1) < 1e-12;
const keepText = same && tsrc !== 'row' && (S.unitStyle === 'file' || !FAM[p && p.family]) && !(p && famRule(p.family).label);
const newUnit = p && !keepText ? fmtUnit(target, labelFor(p.family, target)) : b.unitRaw;
if (R.price >= 0 && b.price == null && !b.junk) flags.push('noPrice');
if (R.qty >= 0 && b.qty == null) flags.push('noQty');
if (b.qty === 0) flags.push('zeroQty');
if (newQty != null && b.qty != null && Math.abs(b.qty % 1) < 1e-9 && Math.abs(b.qty / factor - Math.round(b.qty / factor)) > 1e-6) flags.push('partial');
const edited = !!((ov.cells && Object.keys(ov.cells).length) || ov.price != null || ov.qty != null);
if (edited) flags.push('edited');
if (ov.target != null) flags.push('custom');
if (b.junk) flags.push('junk');
const excluded = ov.ex === true || (ov.ex !== false && S.autoJunk && b.junk);
return {
id: 'r:' + b.rid, kind: 'row', rid: b.rid, rids: [b.rid], ov, cells: b.cells, raw: b.raw, name: b.name, unitRaw: b.unitRaw,
parsed: p, family: p ? p.family : null, count: p ? p.count : null, target, tsrc, factor,
oldPrice: b.price, oldQty: b.qty, autoPrice, autoQty, newPrice, newQty, newUnit,
converted: !!p && Math.abs(factor - 1) > 1e-12, flags, edited, excluded
};
});
const gmap = new Map();
const fz = !!S.dupFuzzy;
items.forEach(it => {
if (it.excluded || it.ov.solo) return;
if (!it.name && !it.ov.mg) return;
const nk = fz ? fuzzyKey(it.name) || nameKey(it.name, S.dupLoose) : nameKey(it.name, S.dupLoose);
const k = it.ov.mg ? 'm:' + it.ov.mg : nk + '|' + nameKey(it.newUnit, true);
it.gkey = k;
if (!gmap.has(k)) gmap.set(k, []);
gmap.get(k).push(it);
});
if (fz) clusterFuzzy(gmap);
const groups = [];
const mergedBy = new Map();
gmap.forEach((members, k) => {
if (members.length < 2) return;
const g = doc.groups[k] || {};
const prices = members.map(m => m.newPrice).filter(v => v != null);
const lo = prices.length ? Math.min(...prices) : 0, hi = prices.length ? Math.max(...prices) : 0;
const spread = prices.length > 1 ? (hi - lo) / Math.max(Math.abs(lo), 1e-9) : 0;
const conflict = spread * 100 > S.tolerance + 1e-9;
const manual = k.startsWith('m:');
const fuzzy = !manual && new Set(members.map(m => nameKey(m.name, S.dupLoose))).size > 1;
const autoMode = manual ? 'merge' : S.dupMode === 'smart' ? (conflict || fuzzy ? 'keep' : 'merge') : S.dupMode;
const mode = g.mode || autoMode;
const outSet = new Set(g.out || []);
const inc = members.filter(m => !outSet.has(m.rid));
const rule = g.rule || S.mergeRule;
const review = (conflict || fuzzy) && !g.mode && !manual;
const grp = {key: k, name: members[0].name, unit: members[0].newUnit, members, inc, mode, auto: !g.mode, conflict, review, spread, rule, lo, hi, ov: g, manual, fuzzy};
groups.push(grp);
if (mode === 'merge' && inc.length >= 2) {
const qs = inc.map(m => m.newQty).filter(v => v != null);
let tq = qs.length ? qs.reduce((a, b) => a + b, 0) : null;
let price = mergePrice(inc, rule);
const edited = g.price != null || g.qty != null;
if (g.price != null) price = g.price;
if (g.qty != null) tq = g.qty;
const first = inc[0];
const flags = ['merged'];
if (review) flags.push('review');
if (edited) flags.push('edited');
if (inc.some(m => m.flags.includes('custom'))) flags.push('custom');
const merged = {
...first, id: 'g:' + k, kind: 'merged', rids: inc.map(m => m.rid), members: inc, gkey: k, ov: g, rid: null,
newPrice: g.price != null ? g.price : rnd(price, PD, PM), newQty: g.qty != null ? g.qty : rnd(tq, QD, QM),
oldQty: inc.every(m => m.oldQty == null) ? null : inc.reduce((a, m) => a + (m.oldQty || 0), 0),
factor: new Set(inc.map(m => rnd(m.factor, 8))).size === 1 ? first.factor : null,
converted: inc.some(m => m.converted), flags, edited, excluded: false, group: grp
};
grp.merged = merged;
inc.forEach(m => mergedBy.set(m.rid, merged));
} else {
members.forEach(m => { m.flags.push('dup'); if (review) m.flags.push('review'); m.group = grp; });
}
inc.forEach(m => { if (!m.group) m.group = grp; });
members.forEach(m => { if (!m.group) m.group = grp; });
});
const out = [];
const placed = new Set();
items.forEach(it => {
const mg = mergedBy.get(it.rid);
if (mg) { if (!placed.has(mg.id)) { placed.add(mg.id); out.push(mg); } return; }
out.push(it);
});
out.forEach(it => { it.newValue = it.newPrice != null && it.newQty != null ? rnd(it.newPrice * it.newQty, PD, 'nearest') : null; });
const live = out.filter(i => !i.excluded);
const stats = {
source: src.rows.length, rows: live.length, excluded: out.length - live.length,
converted: live.filter(i => i.converted).length,
groups: groups.length, review: groups.filter(g => g.review).length, merged: groups.filter(g => g.merged).length,
issues: live.filter(i => i.flags.some(f => ISSUE_FLAGS.includes(f))).length,
unknown: Object.values(fams).filter(f => !f.known && !f.measure).length
};
return {items: out, fams, famRule, groups, stats, labelFor, fmtUnit};
}

function mergePrice(list, rule) {
const ps = list.filter(m => m.newPrice != null);
if (!ps.length) return null;
const v = ps.map(m => m.newPrice);
if (rule === 'max') return Math.max(...v);
if (rule === 'min') return Math.min(...v);
if (rule === 'first') return v[0];
if (rule === 'last') return v[v.length - 1];
if (rule === 'weighted') {
const tq = ps.reduce((a, m) => a + (m.newQty > 0 ? m.newQty : 0), 0);
if (tq > 0) return ps.reduce((a, m) => a + m.newPrice * (m.newQty > 0 ? m.newQty : 0), 0) / tq;
}
return v.reduce((a, b) => a + b, 0) / v.length;
}

function exportCell(v) {
if (v == null) return null;
if (typeof v === 'number') return isFinite(v) ? v : null;
const s = clean(v);
if (s === '' || /^(null|undefined|nan)$/i.test(s)) return null;
if (/^-?\d+(\.\d+)?$/.test(s) && !/^-?0\d/.test(s)) return Number(s);
return String(v).trim();
}

const NEW_COLS = ['new.name', 'new.unit', 'new.qty', 'new.price', 'new.value', 'new.factor'];
const NUM_NEW = new Set(['new.qty', 'new.price', 'new.value', 'new.factor']);

function value(it, key, S) {
if (key.startsWith('o:')) return exportCell(it.cells[+key.slice(2)]);
switch (key) {
case 'new.name': {
if (!it.name) return null;
return (S.nameTpl || '{name}').replace(/\{name\}/g, it.name).replace(/\{unit\}/g, it.newUnit || '').replace(/\{old\}/g, it.unitRaw || '').replace(/\s+/g, ' ').trim();
}
case 'new.unit': return it.newUnit || null;
case 'new.qty': return it.newQty;
case 'new.price': return it.newPrice;
case 'new.value': return it.newValue;
case 'new.factor': return it.factor == null ? null : rnd(it.factor, 6);
}
return null;
}

function buildColumns(headers, det, preset, roles) {
const R = roles || det.roles;
const o = i => 'o:' + i;
let order = [];
const want = [];
if (preset === 'side') {
['name', 'unit', 'qty', 'price'].forEach(k => R[k] >= 0 && want.push(o(R[k])));
want.push('new.unit'); if (R.qty >= 0) want.push('new.qty'); want.push('new.price');
} else if (preset === 'full') {
headers.forEach((_, i) => { if (!det.cols[i].garbage) want.push(o(i)); });
want.push('new.unit'); if (R.qty >= 0) want.push('new.qty'); want.push('new.price');
} else {
want.push(R.name >= 0 ? 'new.name' : null, 'new.unit', R.qty >= 0 ? 'new.qty' : null, 'new.price');
}
const on = want.filter(Boolean);
order = on.map(key => ({key, on: true}));
const rest = headers.map((_, i) => o(i)).concat(NEW_COLS).filter(k => !on.includes(k));
rest.forEach(key => order.push({key, on: false}));
return order;
}

function viewItems(res, view, cols, S) {
const QUICK = {
all: it => !it.excluded,
issues: it => !it.excluded && it.flags.some(f => ISSUE_FLAGS.includes(f)),
converted: it => !it.excluded && it.converted,
kept: it => !it.excluded && !it.converted,
custom: it => !it.excluded && (it.flags.includes('custom') || it.edited),
dups: it => !it.excluded && (it.kind === 'merged' || it.flags.includes('dup')),
excluded: it => it.excluded
};
const q = QUICK[view.quick] || QUICK.all;
let list = res.items.filter(q);
if (view.flag) list = list.filter(it => it.flags.includes(view.flag));
if (view.family) list = list.filter(it => it.family === view.family || (it.members && it.members.some(m => m.family === view.family)));
(view.rules || []).forEach(rule => { const t = ruleTest(rule); list = list.filter(it => t(value(it, rule.key, S))); });
const s = clean(view.search).toLowerCase();
if (s) {
const keys = cols.map(c => c.key);
list = list.filter(it => it.name.toLowerCase().includes(s) || it.unitRaw.toLowerCase().includes(s) || keys.some(k => { const v = value(it, k, S); return v != null && String(v).toLowerCase().includes(s); }));
}
if (view.sort && view.sort.key) {
const {key, dir} = view.sort, m = dir === 'desc' ? -1 : 1;
const coll = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
list = list.map((it, i) => ({it, i, v: value(it, key, S)})).sort((a, b) => {
const av = a.v, bv = b.v;
if (av == null && bv == null) return a.i - b.i;
if (av == null) return 1;
if (bv == null) return -1;
const c = typeof av === 'number' && typeof bv === 'number' ? av - bv : coll.compare(String(av), String(bv));
return c * m || a.i - b.i;
}).map(x => x.it);
}
return list;
}

function ruleTest(r) {
const num = x => typeof x === 'number' ? x : parseNum(x);
const val = r.val;
const n = parseNum(val);
const txt = x => String(x ?? '').toLowerCase();
switch (r.op) {
case 'empty': return v => v == null || v === '';
case 'filled': return v => !(v == null || v === '');
case 'zero': return v => num(v) === 0;
case 'nonzero': return v => v != null && num(v) !== 0;
case 'eq': return v => n != null && num(v) != null ? Math.abs(num(v) - n) < 1e-9 : txt(v) === txt(val);
case 'neq': return v => n != null && num(v) != null ? Math.abs(num(v) - n) >= 1e-9 : txt(v) !== txt(val);
case 'gt': return v => num(v) != null && n != null && num(v) > n;
case 'gte': return v => num(v) != null && n != null && num(v) >= n;
case 'lt': return v => num(v) != null && n != null && num(v) < n;
case 'lte': return v => num(v) != null && n != null && num(v) <= n;
case 'contains': return v => txt(v).includes(txt(val));
case 'ncontains': return v => !txt(v).includes(txt(val));
case 'in': { const set = new Set((val || []).map(String)); return v => set.has(v == null ? '' : String(v)); }
case 'nin': { const set = new Set((val || []).map(String)); return v => !set.has(v == null ? '' : String(v)); }
}
return () => true;
}

return {ALIASES, FAM, ISSUE_FLAGS, NEW_COLS, NUM_NEW, clean, parseNum, isNumCell, parseUnit, buildDict, ingest, detect, detectDirection, compute, value, exportCell, buildColumns, viewItems, ruleTest, rnd, nameKey, memKey, famTitle, fmtN, namePack, fuzzyKey};
})();
