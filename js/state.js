window.Store = (() => {
const DEFAULTS = {
packSize: 10, autoDir: true, repack: false, useMemory: true, useName: true, theme: 'system',
priceDec: 4, priceMode: 'nearest', qtyDec: 2, qtyMode: 'nearest',
unitStyle: 'file', unitSpace: true, hideOne: false,
nameTpl: '{name}',
dupMode: 'smart', mergeRule: 'weighted', tolerance: 5, dupLoose: true, dupFuzzy: false,
autoJunk: true, preset: 'clean', layout: null, density: 'comfy',
fmt: 'xlsx', scope: 'view', aliases: {},
labels: {'new.name': 'Name', 'new.unit': 'New unit', 'new.qty': 'New qty', 'new.price': 'New price', 'new.value': 'New value', 'new.factor': 'Factor'}
};
const K = {S: 'bugvert2.settings', M: 'bugvert2.memory', SES: 'bugvert2.session'};
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const clone = o => JSON.parse(JSON.stringify(o));

const st = {
S: Object.assign(clone(DEFAULTS), load(K.S, {})),
mem: load(K.M, {}),
src: null, det: null, doc: null, wb: null,
view: {quick: 'all', search: '', sort: null, rules: [], family: null},
sel: new Set(), expanded: new Set(),
undo: [], redo: [], ver: 0, _res: null, _resVer: -1, listeners: []
};
st.S.labels = Object.assign(clone(DEFAULTS.labels), st.S.labels || {});
st.S.aliases = st.S.aliases || {};

function res() {
if (!st.src) return null;
if (st._resVer !== st.ver) { st._res = Engine.compute(st.src, st.doc, st.S, st.mem); st._resVer = st.ver; }
return st._res;
}
function fresh() { st.ver++; return res(); }
function emit(what) { st.ver++; persistSoon(); st.listeners.forEach(f => f(what)); }
function on(f) { st.listeners.push(f); }

function commit(label, fn) {
if (!st.doc) return;
const before = JSON.stringify(st.doc);
fn(st.doc);
if (JSON.stringify(st.doc) === before) return false;
st.undo.push({label, doc: before});
if (st.undo.length > 120) st.undo.shift();
st.redo = [];
emit('doc');
return true;
}
function undo() {
const h = st.undo.pop(); if (!h) return null;
st.redo.push({label: h.label, doc: JSON.stringify(st.doc)});
st.doc = JSON.parse(h.doc); emit('doc'); return h.label;
}
function redo() {
const h = st.redo.pop(); if (!h) return null;
st.undo.push({label: h.label, doc: JSON.stringify(st.doc)});
st.doc = JSON.parse(h.doc); emit('doc'); return h.label;
}

function setS(patch) {
Object.assign(st.S, patch);
save(K.S, st.S);
emit('settings');
}
function resetS() {
const keepAliases = st.S.aliases, keepTheme = st.S.theme;
st.S = clone(DEFAULTS); st.S.aliases = keepAliases; st.S.theme = keepTheme;
save(K.S, st.S); emit('settings');
}

function learn(force) {
if (!st.src || (!st.S.useMemory && !force)) return 0;
const dict = Engine.buildDict(st.S.aliases);
const R = st.doc.roles;
if (R.name < 0 || R.unit < 0) return 0;
let n = 0;
st.src.rows.forEach(r => {
const name = Engine.clean(r[R.name]); if (!name) return;
const p = Engine.parseUnit(r[R.unit], dict);
if (p && p.known && p.count > 1) { st.mem[Engine.memKey(name)] = {family: p.family, count: p.count}; n++; }
});
save(K.M, st.mem);
return n;
}
function remember(name, family, count) {
if (!name || !family || !(count > 1)) return;
st.mem[Engine.memKey(name)] = {family, count};
save(K.M, st.mem);
}
function clearMem() { st.mem = {}; save(K.M, st.mem); emit('settings'); }

function semRef(key) {
if (!key.startsWith('o:')) return key;
const i = +key.slice(2);
const role = Object.keys(st.doc.roles).find(r => st.doc.roles[r] === i);
return role ? 'role:' + role : 'hdr:' + st.src.headers[i];
}
function fromRef(ref) {
if (!ref.startsWith('role:') && !ref.startsWith('hdr:')) return ref;
if (ref.startsWith('role:')) { const i = st.doc.roles[ref.slice(5)]; return i >= 0 ? 'o:' + i : null; }
const i = st.src.headers.indexOf(ref.slice(4)); return i >= 0 ? 'o:' + i : null;
}
function saveLayout() {
const layout = st.doc.columns.map(c => ({ref: semRef(c.key), on: c.on, label: c.label || null}));
setS({layout});
}
function buildColumns(preset) {
const base = Engine.buildColumns(st.src.headers, {cols: st.doc.kinds.map((k, i) => ({garbage: st.doc.ignored.includes(i)}))}, preset || st.S.preset, st.doc.roles);
if (!preset && st.S.layout && st.S.preset === 'mine') {
const used = new Set(), out = [];
st.S.layout.forEach(l => { const key = fromRef(l.ref); if (key && !used.has(key)) { used.add(key); out.push({key, on: l.on, ...(l.label ? {label: l.label} : {})}); } });
base.forEach(c => { if (!used.has(c.key)) out.push({key: c.key, on: false}); });
return out;
}
return base;
}

function open(src) {
const det = Engine.detect(src.headers, src.rows, st.S.aliases);
const dd = Engine.detectDirection(src.headers, src.rows, det.roles.unit, st.S.aliases);
st.src = src; st.det = det;
st.doc = {
v: 2, roles: {...det.roles},
kinds: det.cols.map(c => c.kind), conf: det.cols.map(c => c.conf), reasons: det.cols.map(c => c.reason),
ignored: det.cols.filter(c => c.garbage).map(c => c.i),
dir: st.S.autoDir ? dd.dir : 'toBase', dirAuto: dd,
fam: {}, rows: {}, groups: {}, columns: [], colsTouched: false
};
st.doc.columns = buildColumns();
st.view = {quick: 'all', search: '', sort: null, rules: [], family: null};
st.sel.clear(); st.expanded.clear();
st.undo = []; st.redo = [];
learn();
emit('open');
}

function setRole(role, col) {
let swapped = null;
commit('Change column role', d => {
const cur = Object.keys(d.roles).find(r => d.roles[r] === col);
d.ignored = d.ignored.filter(i => i !== col);
if (role === 'ignore' || role === 'other') {
if (cur) d.roles[cur] = -1;
if (role === 'ignore') d.ignored.push(col);
} else {
const prev = d.roles[role];
if (cur && cur !== role) { d.roles[cur] = prev; if (prev >= 0) swapped = cur; }
d.roles[role] = col;
}
if (!d.colsTouched) d.columns = buildColumnsFor(d);
});
return swapped;
}
function buildColumnsFor(d) {
const prev = st.doc; st.doc = d;
try { return buildColumns(); } finally { st.doc = prev; }
}

let pt;
function persistSoon() {
clearTimeout(pt);
pt = setTimeout(() => {
if (!st.src) { localStorage.removeItem(K.SES); return; }
const ok = save(K.SES, {src: st.src, doc: st.doc, ts: Date.now()});
if (!ok) localStorage.removeItem(K.SES);
}, 500);
}
function savedSession() { const s = load(K.SES, null); return s && s.src && s.doc && s.doc.v === 2 ? s : null; }
function resume() {
const s = savedSession(); if (!s) return false;
st.src = s.src; st.doc = s.doc;
st.det = {roles: s.doc.roles, cols: s.doc.kinds.map((k, i) => ({i, kind: k}))};
st.undo = []; st.redo = []; st.sel.clear(); st.expanded.clear();
emit('open');
return true;
}
function close() { st.src = null; st.doc = null; st.det = null; st.sel.clear(); st.undo = []; st.redo = []; localStorage.removeItem(K.SES); emit('close'); }

return {st, DEFAULTS, res, fresh, emit, on, commit, undo, redo, setS, resetS, learn, remember, clearMem, saveLayout, buildColumns, open, setRole, savedSession, resume, close, clone};
})();
