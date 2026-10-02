window.Engine = (() => {
const ALIASES = {
tab: ['T','TAB','TABS','TABLET','TABLETS','TB','TBL','PILL','PILLS','P','CAPLET','CAPLETS','قرص','اقراص','أقراص','ق','F','FT','FC','FILM','ODT','CHEW','EFF','EFFERVESCENT'],
cap: ['C','CAP','CAPS','CAPSULE','CAPSULES','كبسول','كبسولة','كبسولات','ك','SOFTGEL','SOFTGELS','SG','GELCAP','GELCAPS'],
supp: ['SUPP','SUPPS','SUP','SUPPOSITORY','SUPPOSITORIES','لبوس','لبوسة'],
sachet: ['SACH','SACHET','SACHETS','SACHS','SAC','STICK','STICKS','كيس','اكياس','أكياس'],
amp: ['AMP','AMPS','AMPOULE','AMPOULES','AMPULE','AMPULES','امبول','أمبول','امبولة'],
vial: ['VIAL','VIALS','V','فيال'],
syringe: ['SYRINGE','SYRINGES','PFS','PREFILLED','سرنجة','حقنة'],
inh: ['INH','INHALER','INHALERS','PUFF','PUFFS','بخاخ'],
bottle: ['B','BOT','BTL','BOTTLE','BOTTLES','SYRUP','SUSP','SUSPENSION','SOL','SOLUTION','LOTION','SPRAY','زجاجة','شراب','دواء شرب'],
tube: ['TUBE','TUBES','TUB','CREAM','OINT','OINTMENT','GEL','انبوبة','أنبوبة','كريم','مرهم','جل'],
patch: ['PATCH','PATCHES','لصقة'],
drop: ['DROP','DROPS','قطرة','نقط'],
lozenge: ['LOZ','LOZENGE','LOZENGES','LOZNG'],
piece: ['PC','PCS','PIECE','PIECES','EA','EACH','حبة','قطعة'],
box: ['BOX','BOXES','BX','PK','PACK','PACKS','CARTON','CTN','علبة','عبوة'],
strip: ['STRIP','STRIPS','STR','BLISTER','BLISTERS','شريط']
};
const FAM = {
tab: ['Tab','Tablet','Tablets'], cap: ['Cap','Capsule','Capsules'], supp: ['Supp','Suppository','Suppositories'],
sachet: ['Sach','Sachet','Sachets'], amp: ['Amp','Ampoule','Ampoules'], vial: ['Vial','Vial','Vials'],
syringe: ['Syr','Syringe','Syringes'], inh: ['Inh','Inhaler','Inhalers'], bottle: ['Btl','Bottle','Bottles'],
tube: ['Tube','Tube','Tubes'], patch: ['Patch','Patch','Patches'], drop: ['Drop','Drop','Drops'],
lozenge: ['Loz','Lozenge','Lozenges'], piece: ['Pc','Piece','Pieces'], box: ['Box','Box','Boxes'], strip: ['Strip','Strip','Strips']
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
const ISSUE_FLAGS = ['noUnit','badUnit','unknownUnit','noPrice','partial','review','noSize','nameConflict','nameMulti'];
const PACKABLE = new Set(['tab','cap','supp','sachet','amp','vial','lozenge','patch','strip','piece']);
const CONTAINER = new Set(['box']);
const FORMS = {
tab: ['tab','tabs','tablet','tablets','tb','tbl','tbs','pill','pills','caplet','caplets'],
cap: ['cap','caps','capsule','capsules','softgel','softgels','gelcap','gelcaps'],
supp: ['supp','supps','suppository','suppositories'],
sachet: ['sachet','sachets','sach','sachs','stick','sticks'],
amp: ['amp','amps','ampoule','ampoules','ampule','ampules'],
vial: ['vial','vials'],
lozenge: ['loz','lozenge','lozenges'],
patch: ['patch','patches'],
strip: ['strip','strips'],
piece: ['pc','pcs','piece','pieces'],
syringe: ['syringe','syringes','pfs']
};
const AR_PLURAL = {tab: ['اقراص','أقراص'], cap: ['كبسولات'], sachet: ['اكياس','أكياس'], amp: ['امبولات','أمبولات'], supp: ['لبوسات'], piece: ['حبات']};
const AR_SINGLE = {tab: ['قرص'], cap: ['كبسولة','كبسول'], sachet: ['كيس'], amp: ['امبول','أمبول','امبولة'], supp: ['لبوس','لبوسة'], piece: ['حبة']};
const PATS = {
form: {label: 'Count + form word', ex: '24 tabs · 30 caps · 10 amp', conf: 'high'},
suffix: {label: 's after the count', ex: "Panadol 24s · 30's", conf: 'medium'},
mult: {label: 'Multiplier', ex: 'Brufen x 30 · ×20', conf: 'medium'},
blister: {label: 'Blister math', ex: '2x10 · 3 strips of 10', conf: 'high'},
box: {label: 'Container size', ex: 'box of 30 · 30/pack', conf: 'high'},
arabic: {label: 'Arabic count', ex: '24 قرص · 10 أقراص', conf: 'high'},
paren: {label: 'Number in brackets', ex: 'Cipro 500 (10)', conf: 'low'},
trail: {label: 'Trailing number', ex: 'Panadol 500mg 24', conf: 'low'}
};
const DET_DEFAULTS = {
unitSource: 'auto', nameMode: 'fill', nameConf: 'balanced',
namePats: {form: true, suffix: true, mult: true, blister: true, box: true, arabic: true, paren: true, trail: true},
nameMin: 2, nameMax: 1000, nameMulti: 'skip', flagConflict: true,
guardWords: ['omega','vitamin','vit','coq','q','b','d','k','e'], extraMeasures: [],
order: ['memory','name','unit']
};
const CONF_RANK = {high: 3, medium: 2, low: 1};
const COMMON_PACKS = new Set([6, 7, 8, 10, 12, 14, 15, 16, 20, 21, 24, 28, 30, 32, 36, 40, 42, 48, 50, 56, 60, 84, 90, 100]);
const LEVEL_MIN = {strict: 3, balanced: 2, loose: 1};

const AR = '٠١٢٣٤٥٦٧٨٩', FA = '۰۱۲۳۴۵۶۷۸۹';
const toLatin = s => String(s ?? '').replace(/[٠-٩]/g, d => AR.indexOf(d)).replace(/[۰-۹]/g, d => FA.indexOf(d)).replace(/٫/g, '.').replace(/[٬،]/g, ',');
const clean = s => toLatin(s).replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff\u00a0\t]/g, ' ').replace(/\s+/g, ' ').trim();
const isEmpty = v => v == null || clean(v) === '';
const rxEsc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

const dictCache = new Map();
function buildDict(user) {
const key = JSON.stringify(user || {});
if (dictCache.has(key)) return dictCache.get(key);
const d = {};
Object.entries(ALIASES).forEach(([k, arr]) => arr.forEach(a => d[a] = k));
Object.entries(user || {}).forEach(([t, k]) => { if (t && k) d[String(t).toUpperCase()] = k; });
Object.defineProperty(d, '_cache', {value: new Map(), enumerable: false});
if (dictCache.size > 20) dictCache.clear();
dictCache.set(key, d);
return d;
}

function tokenFamily(tok, dict) {
const t = tok.toUpperCase().replace(/[.\s'’]/g, '');
if (!t) return 'x:#';
if (dict[t]) return dict[t];
if (MEASURE.has(t)) return 'm:' + t;
if (t.length > 3 && t.endsWith('S') && dict[t.slice(0, -1)]) return dict[t.slice(0, -1)];
if (t.length >= 3) {
for (const a in dict) if (a.length >= 3 && /^[A-Z]+$/.test(a) && (a.startsWith(t) || t.startsWith(a))) return dict[a];
}
return 'x:' + t;
}

const MEAS_BASE = ['mg','mcg','µg','ug','g','gm','gr','kg','ml','l','cc','iu','i\\.u','u','units?','mmol','meq','%','مجم','ملجم','مج','ملغ','مل','جم','جرام','غ','وحدة','وحدات'];
const LET = 'a-z\\u0600-\\u06FF';
const strengthRx = meas => new RegExp('\\d+(?:\\.\\d+)?(?:\\s*[/+]\\s*\\d+(?:\\.\\d+)?)*\\s*(?:' + meas + ')(?:\\s*/\\s*\\d*(?:\\.\\d+)?\\s*(?:' + meas + '))?(?![' + LET + '])', 'gi');
const UNIT_STRENGTH = strengthRx(MEAS_BASE.join('|'));

function parseUnitRaw(raw, dict) {
let s = clean(raw).replace(/['’]s\b/gi, '').replace(/[()[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();
if (!s) return null;
const stripped = s.replace(UNIT_STRENGTH, ' ').replace(/\s+/g, ' ').trim();
if (stripped && stripped !== s && /[A-Za-z\u0600-\u06FF]/.test(stripped)) s = stripped;
const W = '([A-Za-z\\u0600-\\u06FF][A-Za-z\\u0600-\\u06FF.]*)';
const N = '(\\d+(?:\\.\\d+)?)';
let m, count = null, tok = '', inner = '';
if ((m = s.match(new RegExp('^' + N + '\\s*[x*×]\\s*' + N + '\\s*' + W + '?$', 'i')))) { count = +m[1] * +m[2]; tok = m[3] || ''; }
else if ((m = s.match(new RegExp('^' + N + '\\s*' + W + '(?:\\s*(?:/|per|in|-)\\s*' + W + ')?$', 'i')))) { count = +m[1]; tok = m[2]; }
else if ((m = s.match(new RegExp('^' + W + '\\s*(?:of|x|\\*|×|:|-)?\\s*' + N + '(?:\\s*' + W + ')?$', 'i')))) { count = +m[2]; tok = m[1]; inner = m[3] || ''; }
else if ((m = s.match(new RegExp('^' + W + '(?:\\s+' + W + ')?$')))) { count = 1; tok = m[1]; }
else if ((m = s.match(new RegExp('^' + N + '$')))) { count = +m[1]; tok = ''; }
else if ((m = s.match(new RegExp(N + '\\s*' + W)))) { count = +m[1]; tok = m[2]; }
else return null;
tok = tok.replace(/\.+$/, '');
if (!count || count <= 0) return null;
let family = tokenFamily(tok, dict);
if (inner) {
const fi = tokenFamily(inner.replace(/\.+$/, ''), dict);
if (PACKABLE.has(fi) && (CONTAINER.has(family) || family === 'strip' || family.startsWith('x:'))) { family = fi; tok = inner.replace(/\.+$/, ''); }
}
return {count, tok, family, known: !!FAM[family], measure: family.startsWith('m:'), container: CONTAINER.has(family)};
}
function parseUnit(raw, dict) {
const c = dict && dict._cache;
const k = String(raw ?? '');
if (c && c.has(k)) return c.get(k);
const r = parseUnitRaw(raw, dict);
if (c) { if (c.size > 200000) c.clear(); c.set(k, r); }
return r;
}

const B = '(?:^|[\\s(\\-/,+\\[])', A_ = '(?=$|[\\s)\\-/,.;:+\\]])';
const MOD = '(?:(?:f\\.?\\s?c|film[\\s-]?coated|coated|chewable|chew|eff|effervescent|odt|s\\.?r|x\\.?r|e\\.?r|e\\.?c|d\\.?r|m\\.?r|c\\.?r|oral|vaginal|rectal|soft|hard|enteric|dispersible|disp)\\.?\\s*)*';
const BOXW = 'box(?:es)?|packs?|pk|cartons?|ctn|علبة|عبوة';
const readers = new Map();
function detCfg(S) {
const d = DET_DEFAULTS;
return {
unitSource: S.unitSource || d.unitSource, nameMode: S.nameMode || d.nameMode, nameConf: S.nameConf || d.nameConf,
namePats: Object.assign({}, d.namePats, S.namePats || {}), nameMin: S.nameMin ?? d.nameMin, nameMax: S.nameMax ?? d.nameMax,
nameMulti: S.nameMulti || d.nameMulti, flagConflict: S.flagConflict ?? d.flagConflict,
guardWords: Array.isArray(S.guardWords) ? S.guardWords : d.guardWords, extraMeasures: Array.isArray(S.extraMeasures) ? S.extraMeasures : d.extraMeasures,
order: Array.isArray(S.order) && S.order.length ? S.order : d.order, aliases: S.aliases || {}
};
}
function getReader(S) {
const cfg = detCfg(S);
const sig = JSON.stringify([cfg.namePats, cfg.nameConf, cfg.nameMin, cfg.nameMax, cfg.nameMulti, cfg.guardWords, cfg.extraMeasures, cfg.aliases]);
if (readers.has(sig)) return readers.get(sig);
const words = new Map();
Object.entries(FORMS).forEach(([f, arr]) => arr.forEach(w => words.set(w, {f, pl: w === 'pcs' || (w.length > 3 && /s$/.test(w)), ar: false})));
Object.entries(AR_PLURAL).forEach(([f, arr]) => arr.forEach(w => words.set(w, {f, pl: true, ar: true})));
Object.entries(AR_SINGLE).forEach(([f, arr]) => arr.forEach(w => words.set(w, {f, pl: false, ar: true, sing: true})));
Object.entries(cfg.aliases).forEach(([t, f]) => {
const w = String(t).toLowerCase();
if (!PACKABLE.has(f) || w.length < 3 || words.has(w)) return;
words.set(w, {f, pl: false, ar: false});
if (/^[a-z]+$/.test(w) && !words.has(w + 's')) words.set(w + 's', {f, pl: true, ar: false});
});
const alt = [...words.keys()].sort((a, b) => b.length - a.length).map(rxEsc).join('|');
const meas = MEAS_BASE.concat(cfg.extraMeasures.filter(Boolean).map(x => rxEsc(String(x).toLowerCase()))).join('|');
const guard = cfg.guardWords.filter(Boolean).map(x => rxEsc(String(x).toLowerCase())).sort((a, b) => b.length - a.length).join('|');
const R = {
cfg, sig, words, cache: new Map(),
strength: strengthRx(meas),
guard: guard ? new RegExp(B + '(' + guard + ')[\\s-]?(\\d{1,2})' + A_, 'gi') : null,
blister: new RegExp(B + '(\\d{1,3})\\s*(?:strips?|blisters?|شريط|شرائط)?\\s*(?:[x×*]|of)\\s*(\\d{1,3})(?:\\s*' + MOD + '(' + alt + '))?' + A_, 'gi'),
form: new RegExp(B + '(\\d{1,4})\\s*' + MOD + '(' + alt + ')\\.?' + A_, 'gi'),
letter: /(?:^|\s)(\d{1,4})\s*([tc])\.?\s*$/i,
suffix: new RegExp(B + "(\\d{1,4})\\s?(['’])?s" + A_, 'gi'),
mult: new RegExp(B + '[x×*]\\s*(\\d{1,4})' + A_, 'gi'),
boxOf: new RegExp('(?:' + BOXW + ')\\s*(?:of|:|-|x)?\\s*(\\d{1,4})' + A_, 'gi'),
perBox: new RegExp(B + '(\\d{1,4})\\s*(?:/|per|in\\s+a|in)\\s*(?:' + BOXW + '|strips?|blisters?)' + A_, 'gi'),
paren: /[(\[]\s*(\d{1,4})\s*[)\]]/g,
formWord: new RegExp(B + '(' + alt + ')\\.?' + A_, 'i')
};
if (readers.size > 12) readers.clear();
readers.set(sig, R);
return R;
}

function readNameRaw(name, R) {
const cfg = R.cfg;
const orig = clean(name);
const res = {text: orig, count: null, fam: null, form: null, conf: null, pat: null, match: '', strengths: [], guarded: [], cands: [], multi: false};
if (!orig) return res;
let s = ' ' + orig.toLowerCase() + ' ';
s = s.replace(R.strength, m => { res.strengths.push(m.trim()); return ' '; });
s = s.replace(/\d+(?:\.\d+)?\s*[/:]\s*\d+(?:\.\d+)?(?!\s*(?:box|pack|strip))/g, m => { res.strengths.push(m.trim()); return ' '; });
s = s.replace(/\d*\.\d+/g, m => { res.strengths.push(m.trim()); return ' '; });
if (R.guard) s = s.replace(R.guard, (all, w, n) => { if (+n <= 12) { res.guarded.push(w + ' ' + n); return ' ' + w + ' '; } return all; });
const singleConf = (n, f) => res.strengths.length && COMMON_PACKS.has(n) ? 'medium' : f !== 'tab' && f !== 'cap' && n <= 12 ? 'medium' : 'low';
const add = (n, pat, conf, text, fam, idx) => res.cands.push({n, pat, conf, text: String(text).trim(), fam: fam || null, idx});
s = s.replace(R.blister, (all, a, b, w, off) => {
a = +a; b = +b;
const fam = w && R.words.get(w) ? R.words.get(w).f : null;
if (a >= 1 && a <= 10 && b >= 1) add(a * b, 'blister', 'high', all, fam, off);
else if (b === 1 && a > 1) add(a, 'blister', 'high', all, fam, off);
else add(b, 'mult', 'medium', all, fam, off);
return ' '.repeat(all.length);
});
for (const m of s.matchAll(R.form)) {
const w = R.words.get(m[2]); if (!w) continue;
const n = +m[1];
if (w.ar) { if (w.sing && n < 11) continue; add(n, 'arabic', 'high', m[0], w.f, m.index); }
else add(n, 'form', w.pl ? (n <= 100 || COMMON_PACKS.has(n) ? 'high' : 'low') : singleConf(n, w.f), m[0], w.f, m.index);
}
const lm = s.match(R.letter);
if (lm) add(+lm[1], 'form', singleConf(+lm[1], 'tab'), lm[0], lm[2].toLowerCase() === 't' ? 'tab' : 'cap', s.length - lm[0].length);
for (const m of s.matchAll(R.suffix)) add(+m[1], 'suffix', m[2] ? 'high' : 'medium', m[0], null, m.index);
for (const m of s.matchAll(R.mult)) add(+m[1], 'mult', 'medium', m[0], null, m.index);
for (const m of s.matchAll(R.boxOf)) add(+m[1], 'box', 'high', m[0], null, m.index);
for (const m of s.matchAll(R.perBox)) add(+m[1], 'box', 'high', m[0], null, m.index);
for (const m of s.matchAll(R.paren)) add(+m[1], 'paren', res.strengths.length && COMMON_PACKS.has(+m[1]) ? 'medium' : 'low', m[0], null, m.index);
const nums = s.match(/(?:^|\s)\d{1,4}(?=\s|$)/g) || [];
const tm = s.match(/(?:^|\s)(\d{1,4})\s*$/);
if (tm && (res.strengths.length || nums.length >= 2)) add(+tm[1], 'trail', res.strengths.length && COMMON_PACKS.has(+tm[1]) ? 'medium' : 'low', tm[0], null, s.length - tm[0].length);
const minRank = LEVEL_MIN[cfg.nameConf] || 2;
res.cands.forEach(c => {
if (!cfg.namePats[c.pat]) c.why = 'pattern off';
else if (CONF_RANK[c.conf] < minRank) c.why = 'not sure enough';
else if (c.n < cfg.nameMin || c.n > cfg.nameMax) c.why = 'outside ' + cfg.nameMin + '–' + cfg.nameMax;
c.ok = !c.why;
});
const ok = res.cands.filter(c => c.ok);
const byN = new Map();
ok.forEach(c => { const b = byN.get(c.n); if (!b || CONF_RANK[c.conf] > CONF_RANK[b.conf]) byN.set(c.n, c); });
let pick = null;
if (byN.size === 1) pick = [...byN.values()][0];
else if (byN.size > 1) {
const list = [...byN.values()];
if (cfg.nameMulti === 'best') {
const top = Math.max(...list.map(c => CONF_RANK[c.conf]));
const tops = list.filter(c => CONF_RANK[c.conf] === top);
pick = tops.length === 1 ? tops[0] : null;
if (!pick) res.multi = true;
} else if (cfg.nameMulti === 'largest') pick = list.sort((a, b) => b.n - a.n)[0];
else res.multi = true;
}
if (pick) {
res.count = pick.n; res.pat = pick.pat; res.match = pick.text; res.fam = pick.fam;
res.conf = ok.filter(c => c.n === pick.n).reduce((a, c) => CONF_RANK[c.conf] > CONF_RANK[a] ? c.conf : a, pick.conf);
pick.used = true;
}
const fw = (' ' + orig.toLowerCase() + ' ').match(R.formWord);
res.form = res.fam || (fw && R.words.get(fw[1]) ? R.words.get(fw[1]).f : null);
return res;
}
function readName(name, R) {
const k = String(name ?? '');
if (R.cache.has(k)) return R.cache.get(k);
const r = readNameRaw(name, R);
if (R.cache.size > 200000) R.cache.clear();
R.cache.set(k, r);
return r;
}

function synth(fam, count) { return {count, tok: FAM[fam] ? FAM[fam][0] : fam, family: fam, known: !!FAM[fam], measure: false, container: CONTAINER.has(fam), synthetic: true}; }

function resolve(name, unitRaw, ctx) {
const cfg = ctx.R.cfg, mode = cfg.nameMode, source = cfg.unitSource;
const u = source !== 'name' && unitRaw ? parseUnit(unitRaw, ctx.dict) : null;
const nm = (mode !== 'off' || source === 'name') && name ? readName(name, ctx.R) : null;
const okN = nm && nm.count ? nm : null;
const out = {u, nm, p: null, src: 'none', conflict: false, noSize: false, nameTarget: null, multi: false, fallback: false};
const fromName = () => {
if (okN) return synth(okN.fam || okN.form || 'piece', okN.count);
if (nm && nm.form) return synth(nm.form, 1);
return null;
};
if (source === 'name' || (!u && source === 'auto' && mode !== 'off')) {
out.p = fromName();
out.src = out.p ? 'name' : 'none';
out.fallback = !!(unitRaw && out.p && source !== 'name');
out.multi = !!(nm && nm.multi);
return out;
}
if (!u) return out;
if (u.measure || !u.known) { out.p = u; out.src = 'unit'; return out; }
if (u.container) {
const outFam = (okN && okN.fam) || (nm && nm.form) || 'piece';
if (u.count > 1) {
out.p = {...u, out: outFam}; out.src = 'unit';
if (okN && okN.count !== u.count) { if (mode === 'prefer') { out.p = {...out.p, count: okN.count}; out.src = 'name'; } else out.conflict = true; }
} else if (okN && mode !== 'off') { out.p = {...u, count: okN.count, out: outFam}; out.src = 'unit+name'; }
else { out.p = {...u, out: outFam}; out.src = 'unit'; out.noSize = true; out.multi = !!(nm && nm.multi); }
return out;
}
out.p = u; out.src = 'unit';
if (u.count > 1) {
if (okN && okN.count !== u.count) { if (mode === 'prefer') { out.p = {...u, count: okN.count}; out.src = 'name'; } else out.conflict = true; }
} else if (mode !== 'off') {
if (okN) out.nameTarget = okN.count;
else if (nm && nm.multi) out.multi = true;
}
return out;
}

function makeCtx(S) { return {dict: buildDict(S.aliases), R: getReader(S)}; }

function ingest(grid) {
grid = (grid || []).map(r => (r || []).map(c => c == null ? '' : c)).filter(r => r.some(c => !isEmpty(c)));
if (!grid.length) return null;
let width = 0;
grid.forEach(r => { if (r.length > width) width = r.length; });
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
const step = rows.length > 1800 ? Math.floor(rows.length / 600) : 1;
for (let r = 0; r < rows.length && vals.length < 600; r += step) if (!isEmpty(rows[r][i])) vals.push(rows[r][i]);
let filled = 0;
for (let r = 0; r < rows.length; r += Math.max(1, Math.floor(rows.length / 3000))) { if (!isEmpty(rows[r][i])) filled++; }
const sampled = Math.ceil(rows.length / Math.max(1, Math.floor(rows.length / 3000))) || 1;
const n = vals.length || 1;
const cl = vals.map(clean);
const numeric = vals.filter(isNumCell);
const nums = numeric.map(parseNum).filter(x => x !== null);
const units = vals.map(v => clean(v).length <= 18 ? parseUnit(v, dict) : null);
const uniqSet = new Set(cl.map(s => s.toLowerCase()));
let seq = 0;
for (let k = 1; k < nums.length; k++) if (Math.abs(nums[k] - nums[k - 1] - 1) < 1e-9) seq++;
return {
fill: Math.min(1, filled / sampled),
count: vals.length,
num: numeric.length / n,
dec: nums.filter(x => Math.abs(x % 1) > 1e-9).length / n,
int: nums.filter(x => Math.abs(x % 1) <= 1e-9).length / n,
unit: units.filter(p => p && p.family !== 'x:#' && !p.family.startsWith('x:')).length / n,
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
const sample = rows.length > 3000 ? rows.filter((_, i) => i % Math.ceil(rows.length / 3000) === 0) : rows;
const st = headers.map((h, i) => ({i, h, s: colStats(sample, i, dict), hint: Object.fromEntries(Object.keys(HINTS).map(k => [k, hintScore(h, k)]))}));
const cols = st.map(c => ({i: c.i, kind: 'other', garbage: false, reason: '', conf: ''}));
st.forEach(c => {
const g = cols[c.i];
if (c.s.fill < .03) { g.garbage = true; g.reason = 'Almost empty'; }
else if (c.s.uniqCount === 1 && c.s.count > 2) { g.garbage = true; g.reason = 'Same value in every row'; }
else if (c.s.num > .9 && c.s.seq > .85 && c.s.int > .9) { g.garbage = true; g.reason = 'Row numbers'; }
});
const lim = Math.min(sample.length, 300);
for (let a = 0; a < st.length; a++) for (let b = 0; b < a; b++) {
if (cols[a].garbage || cols[b].garbage) continue;
let same = 0;
for (let r = 0; r < lim; r++) if (clean(sample[r][a]) === clean(sample[r][b])) same++;
if (lim && same / lim > .98) { cols[a].garbage = true; cols[a].reason = 'Copy of “' + headers[b] + '”'; }
}
const roles = {name: -1, unit: -1, price: -1, qty: -1, value: -1};
const conf = {};
const live = c => !cols[c.i].garbage;
const unitC = st.filter(live).map(c => ({c, sc: c.s.known * 3 + c.s.unit * 2 + c.s.packish + (c.s.uniq < .3 ? .5 : 0) - (c.s.len > 16 ? 3 : 0) - (c.s.num > .8 ? 4 : 0) - (c.s.letters > .8 && c.s.uniq > .6 ? 2 : 0) + c.hint.unit * 1.5}))
.filter(x => x.c.s.unit >= .35 || (x.c.hint.unit && x.c.s.num < .5)).sort((a, b) => b.sc - a.sc)[0];
if (unitC) { roles.unit = unitC.c.i; conf.unit = unitC.c.s.known > .6 ? 'high' : unitC.c.s.unit > .5 ? 'medium' : 'low'; }
const numC = st.filter(c => live(c) && c.i !== roles.unit && c.s.num >= .85);
const N = (r, i) => { const v = sample[r][i]; return isEmpty(v) ? 0 : parseNum(v); };
let trip = null;
const cand = numC.slice(0, 10);
const tl = Math.min(sample.length, 500);
for (const a of cand) for (const b of cand) {
if (b.i <= a.i) continue;
for (const c of cand) {
if (c.i === a.i || c.i === b.i) continue;
let ok = 0, tot = 0, real = 0;
for (let r = 0; r < tl; r++) {
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

function guessDir(rows, roles, S) {
const ctx = makeCtx(S);
let packs = 0, singles = 0, fromName = 0;
const step = rows.length > 6000 ? Math.ceil(rows.length / 6000) : 1;
for (let i = 0; i < rows.length; i += step) {
const r = rows[i];
const name = roles.name >= 0 ? clean(r[roles.name]) : '';
const unit = roles.unit >= 0 ? clean(r[roles.unit]) : '';
const x = resolve(name, unit, ctx);
const p = x.p;
if (!p || p.measure || !p.known) continue;
if (x.src !== 'unit') fromName++;
if (p.count > 1 || p.container) packs++; else singles++;
}
return {dir: packs >= singles ? 'toBase' : 'toPack', packs, singles, fromName};
}
function detectDirection(headers, rows, unitCol, userAliases, S) {
return guessDir(rows, {name: -1, unit: unitCol}, Object.assign({aliases: userAliases}, S || {}));
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
function namePack(name, S) { const R = getReader(S || {}); return readName(name, R).count; }
const fmtN = n => String(+(+n).toFixed(4));

function famTitle(id, f) {
if (FAM[id]) return FAM[id][2];
if (id === 'x:#') return 'Bare numbers';
if (id.startsWith('m:')) return id.slice(2) + ' (measure)';
return f && f.tok ? f.tok : id.slice(2);
}

const CONF_OF = {high: 'sure', medium: 'likely', low: 'guess'};

function compute(src, doc, S, mem) {
const ctx = makeCtx(S);
const cfg = ctx.R.cfg;
const R = doc.roles;
const has = Object.prototype.hasOwnProperty;
const base = src.rows.map((raw, rid) => {
const ov = doc.rows[rid] || {};
const cells = ov.cells ? raw.map((c, i) => has.call(ov.cells, i) ? ov.cells[i] : c) : raw;
const name = R.name >= 0 ? clean(cells[R.name]) : '';
const unitRaw = R.unit >= 0 ? clean(cells[R.unit]) : '';
const rs = resolve(name, unitRaw, ctx);
const price = R.price >= 0 ? parseNum(cells[R.price]) : null;
const qty = R.qty >= 0 ? parseNum(cells[R.qty]) : null;
const junk = !name && !unitRaw;
return {rid, raw, cells, name, unitRaw, rs, parsed: rs.p, price, qty, ov, junk};
});
const fams = {};
let packs = 0, singles = 0;
base.forEach(b => {
const p = b.parsed;
if (!p) return;
const f = fams[p.family] ||= {id: p.family, rows: 0, packs: 0, tokens: {}, counts: {}, known: p.known, measure: p.measure, fromName: 0};
f.rows++;
if (p.count > 1) f.packs++;
if (b.rs.src !== 'unit') f.fromName++;
f.tokens[p.tok] = (f.tokens[p.tok] || 0) + 1;
f.counts[p.count] = (f.counts[p.count] || 0) + 1;
if (!b.junk && p.known && !p.measure) { if (p.count > 1 || p.container) packs++; else singles++; }
});
Object.values(fams).forEach(f => {
f.tok = Object.entries(f.tokens).sort((a, b) => b[1] - a[1])[0][0];
f.title = famTitle(f.id, f);
f.short = FAM[f.id] ? FAM[f.id][0] : f.tok;
});
const memFams = new Set(Object.values(mem || {}).map(m => m.family));
const ruleCache = {};
const famRule = id => {
if (ruleCache[id]) return ruleCache[id];
const f = fams[id] || {known: false, measure: false, packs: 0};
const r = doc.fam[id] || {};
const auto = f.known && !f.measure && (doc.dir === 'toPack' ? (PACKABLE.has(id) || memFams.has(id)) : f.packs > 0);
return ruleCache[id] = {convert: r.convert ?? auto, auto, target: r.target || null, label: r.label || ''};
};
const labelFor = (id, n, outFam) => {
const rule = famRule(id);
if (rule.label) return rule.label;
const fid = outFam && outFam !== id ? outFam : id;
if (S.unitStyle === 'short' && FAM[fid]) return FAM[fid][0];
if (S.unitStyle === 'long' && FAM[fid]) return n === 1 ? FAM[fid][1] : FAM[fid][2];
const f = fams[fid];
if (f && fid === id) return f.tok;
if (f && f.tok) return f.tok;
return FAM[fid] ? FAM[fid][0] : (f ? f.tok : '');
};
const fmtUnit = (n, label) => {
if (!label) return fmtN(n);
if (S.hideOne && n === 1) return label;
return S.unitSpace ? fmtN(n) + ' ' + label : fmtN(n) + label;
};
const PM = S.priceMode, QM = S.qtyMode;
let PD = 2, QD = 0;
const order = cfg.order.filter(k => k !== 'default');
const items = base.map(b => {
const p = b.parsed, ov = b.ov, flags = [], rs = b.rs;
let target = null, tsrc = 'none', outFam = null;
if (!b.unitRaw) { if (R.unit >= 0 && !b.junk && !p) flags.push('noUnit'); }
else if (!rs.u && !p && cfg.unitSource !== 'name') flags.push('badUnit');
if (p) {
const f = fams[p.family], rule = famRule(p.family);
if (!f.known && !f.measure) flags.push('unknownUnit');
const ot = ov.target;
if (ot === 'keep') { target = p.count; tsrc = 'keep'; }
else if (typeof ot === 'number' && ot > 0) { target = ot; tsrc = 'row'; if (p.container && doc.dir === 'toBase') outFam = p.out; }
else if (doc.dir === 'toPack' && (p.count > 1 || p.container) && !S.repack && p.known && !p.measure) { target = p.count; tsrc = 'already'; }
else if (!rule.convert) { target = p.count; tsrc = 'off'; }
else if (doc.dir === 'toBase') {
if (p.container && rs.noSize) { target = p.count; tsrc = 'nosize'; }
else { target = rule.target || 1; tsrc = rule.target ? 'unit' : 'rule'; if (p.container) outFam = p.out; }
}
else if ((p.count > 1 || p.container) && !S.repack) { target = p.count; tsrc = 'already'; }
else {
const m = S.useMemory && b.name ? mem[memKey(b.name)] : null;
const canName = !!rs.nameTarget && PACKABLE.has(p.family);
for (const k of order) {
if (k === 'memory' && m && m.family === p.family && m.count > 0) { target = m.count; tsrc = 'memory'; break; }
if (k === 'name' && canName) { target = rs.nameTarget; tsrc = 'name'; break; }
if (k === 'unit' && rule.target) { target = rule.target; tsrc = 'unit'; break; }
}
if (target == null) { target = S.packSize; tsrc = 'default'; }
}
}
const factor = p && target ? target / p.count : 1;
const rawPrice = b.price == null ? null : b.price * factor;
const rawQty = b.qty == null ? null : b.qty / factor;
const same = Math.abs(factor - 1) < 1e-12;
const keepText = same && tsrc !== 'row' && !!b.unitRaw && rs.src === 'unit' && (S.unitStyle === 'file' || !FAM[p && p.family]) && !(p && famRule(p.family).label);
const newUnit = p && !keepText ? fmtUnit(target, labelFor(p.family, target, outFam)) : b.unitRaw;
if (R.price >= 0 && b.price == null && !b.junk) flags.push('noPrice');
if (R.qty >= 0 && b.qty == null) flags.push('noQty');
if (b.qty === 0) flags.push('zeroQty');
if (ov.qty == null && b.qty != null && Math.abs(b.qty % 1) < 1e-9 && Math.abs(b.qty / factor - Math.round(b.qty / factor)) > 1e-6) flags.push('partial');
if (rs.noSize && tsrc !== 'row' && tsrc !== 'keep' && doc.dir === 'toBase') flags.push('noSize');
if (rs.conflict && cfg.flagConflict && tsrc !== 'keep' && tsrc !== 'row') flags.push('nameConflict');
if (rs.multi && !b.junk && (tsrc === 'default' || tsrc === 'nosize' || !p)) flags.push('nameMulti');
if (rs.src === 'name' || rs.src === 'unit+name') flags.push('fromName');
const edited = !!((ov.cells && Object.keys(ov.cells).length) || ov.price != null || ov.qty != null);
if (edited) flags.push('edited');
if (ov.target != null) flags.push('custom');
if (b.junk) flags.push('junk');
const excluded = ov.ex === true || (ov.ex !== false && S.autoJunk && b.junk);
let conf = null;
if (p) {
const nc = rs.nm && rs.nm.conf ? CONF_OF[rs.nm.conf] : 'guess';
if (tsrc === 'row' || tsrc === 'keep' || tsrc === 'memory' || tsrc === 'off') conf = 'sure';
else if (tsrc === 'nosize') conf = 'guess';
else if (tsrc === 'name') conf = nc;
else if (tsrc === 'default') conf = 'guess';
else if (tsrc === 'unit') conf = 'likely';
else conf = rs.src === 'unit' ? (p.known ? 'sure' : 'guess') : rs.src === 'unit+name' || rs.src === 'name' ? (rs.nm && rs.nm.count ? nc : 'likely') : 'likely';
if (conf === 'sure' && flags.includes('nameConflict')) conf = 'likely';
}
return {
id: 'r:' + b.rid, kind: 'row', rid: b.rid, rids: [b.rid], ov, cells: b.cells, raw: b.raw, name: b.name, unitRaw: b.unitRaw,
parsed: p, family: p ? p.family : null, count: p ? p.count : null, target, tsrc, factor, rs, conf, outFam,
oldPrice: b.price, oldQty: b.qty, rawPrice, rawQty, autoPrice: null, autoQty: null, newPrice: null, newQty: null, newUnit,
converted: !!p && Math.abs(factor - 1) > 1e-12, flags, edited, excluded
};
});
const live0 = items.filter(i => !i.excluded);
const round = {
price: autoDec(S.priceDec, live0.map(i => i.oldPrice), live0.map(i => i.rawPrice), 2, 6),
qty: autoDec(S.qtyDec, live0.map(i => i.oldQty), live0.map(i => i.rawQty), 0, 4)
};
PD = round.price.d; QD = round.qty.d;
items.forEach(it => {
it.autoPrice = rnd(it.rawPrice, PD, PM);
it.autoQty = rnd(it.rawQty, QD, QM);
it.newPrice = it.ov.price != null ? it.ov.price : it.autoPrice;
it.newQty = it.ov.qty != null ? it.ov.qty : it.autoQty;
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
let lo = 0, hi = 0;
if (prices.length) { lo = prices[0]; hi = prices[0]; prices.forEach(v => { if (v < lo) lo = v; if (v > hi) hi = v; }); }
const spread = prices.length > 1 ? (hi - lo) / Math.max(Math.abs(lo), 1e-9) : 0;
const conflict = spread * 100 > S.tolerance + 1e-9;
const manual = k.startsWith('m:');
const fuzzy = !manual && new Set(members.map(m => nameKey(m.name, S.dupLoose))).size > 1;
const smartOk = !conflict && !fuzzy;
const autoMode = manual ? 'merge' : S.dupMode === 'smart' ? (smartOk ? 'merge' : 'keep') : S.dupMode === 'merge' ? 'merge' : 'keep';
const mode = g.mode || autoMode;
const outSet = new Set(g.out || []);
const inc = members.filter(m => !outSet.has(m.rid));
const rule = g.rule || S.mergeRule;
const review = (conflict || fuzzy) && !g.mode && !manual && S.dupMode !== 'keep';
const grp = {key: k, name: members[0].name, unit: members[0].newUnit, members, inc, mode, auto: !g.mode, conflict, review, spread, rule, lo, hi, ov: g, manual, fuzzy, smartOk};
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
['nameConflict', 'noSize', 'fromName'].forEach(f => { if (inc.some(m => m.flags.includes(f))) flags.push(f); });
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
const liveRows = items.filter(i => !i.excluded);
const count = f => liveRows.filter(f).length;
const tsrcN = {}, confN = {}, readN = {};
liveRows.forEach(i => { if (i.parsed) { tsrcN[i.tsrc] = (tsrcN[i.tsrc] || 0) + 1; confN[i.conf] = (confN[i.conf] || 0) + 1; } readN[i.rs.src] = (readN[i.rs.src] || 0) + 1; });
const stats = {
source: src.rows.length, rows: live.length, excluded: out.length - live.length,
converted: live.filter(i => i.converted).length,
groups: groups.length, review: groups.filter(g => g.review).length, merged: groups.filter(g => g.merged).length,
issues: live.filter(i => i.flags.some(f => ISSUE_FLAGS.includes(f))).length,
unknown: Object.values(fams).filter(f => !f.known && !f.measure).length,
dirGuess: {dir: packs >= singles ? 'toBase' : 'toPack', packs, singles},
tsrc: tsrcN, conf: confN, read: readN,
conflicts: count(i => i.flags.includes('nameConflict')), noSize: count(i => i.flags.includes('noSize')), multi: count(i => i.flags.includes('nameMulti')),
fromName: count(i => i.flags.includes('fromName')), nameTargets: tsrcN.name || 0
};
return {items: out, rowItems: items, fams, famRule, groups, stats, labelFor, fmtUnit, cfg, round};
}

function decOf(v) {
if (v == null || !isFinite(v)) return 0;
const s = String(+(+v).toPrecision(12));
if (s.includes('e-')) return 10;
const i = s.indexOf('.');
return i < 0 ? 0 : s.length - i - 1;
}
function autoDec(setting, src, raw, floor, cap) {
if (setting !== 'auto' && setting != null && isFinite(+setting)) return {d: Math.max(0, Math.min(10, setting | 0)), auto: false, src: 0};
const sv = src.filter(v => v != null && isFinite(v));
let srcD = 0;
sv.forEach(v => { const d = decOf(v); if (d > srcD) srcD = d; });
srcD = Math.min(srcD, cap);
const start = Math.max(floor, srcD);
const need = [];
for (const v of raw) {
if (v == null || !isFinite(v) || v === 0) continue;
const e = decOf(rnd(v, cap, 'nearest'));
need.push(e < cap ? e : Math.min(cap, Math.max(0, 3 - Math.floor(Math.log10(Math.abs(v))))));
}
need.sort((a, b) => a - b);
const p = need.length ? need[Math.min(need.length - 1, Math.floor(need.length * 0.98))] : 0;
return {d: Math.min(cap, Math.max(start, p)), auto: true, src: srcD};
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
if (view.tsrc) list = list.filter(it => it.tsrc === view.tsrc || (it.members && it.members.some(m => m.tsrc === view.tsrc)));
if (view.conf) list = list.filter(it => it.conf === view.conf || (it.members && it.members.some(m => m.conf === view.conf)));
if (view.family) list = list.filter(it => it.family === view.family || (it.members && it.members.some(m => m.family === view.family)));
(view.rules || []).forEach(rule => { const t = ruleTest(rule); list = list.filter(it => t(value(it, rule.key, S))); });
const s = clean(view.search).toLowerCase();
if (s) {
const keys = (cols || []).map(c => c.key);
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

return {ALIASES, FAM, FORMS, PATS, DET_DEFAULTS, PACKABLE, CONTAINER, ISSUE_FLAGS, NEW_COLS, NUM_NEW, CONF_OF, clean, parseNum, isNumCell, parseUnit, buildDict, ingest, detect, detectDirection, guessDir, compute, value, exportCell, buildColumns, viewItems, ruleTest, rnd, autoDec, nameKey, memKey, famTitle, fmtN, namePack, fuzzyKey, readName, getReader, resolve, makeCtx, detCfg};
})();
