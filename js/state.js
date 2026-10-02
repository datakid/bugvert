window.Store = (() => {
const DEFAULTS = {
packSize: 10, autoDir: true, repack: false, useMemory: true, useName: true, theme: 'system',
priceDec: 4, priceMode: 'nearest', qtyDec: 2, qtyMode: 'nearest',
unitStyle: 'file', unitSpace: true, hideOne: false,
nameTpl: '{name}',
dupMode: 'smart', mergeRule: 'weighted', tolerance: 5, dupLoose: true, dupFuzzy: false,
autoJunk: true, preset: 'clean', layout: null, density: 'comfy',
fmt: 'xlsx', scope: 'view', aliases: {}, expLogic: true,
...JSON.parse(JSON.stringify(Engine.DET_DEFAULTS)),
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
view: {quick: 'all', search: '', sort: null, rules: [], family: null, tsrc: null, conf: null, flag: null},
sel: new Set(), expanded: new Set(),
undo: [], redo: [], ver: 0, _res: null, _resVer: -1, listeners: []
};
st.S.labels = Object.assign(clone(DEFAULTS.labels), st.S.labels || {});
st.S.aliases = st.S.aliases || {};
{ const raw = load(K.S, {}) || {}; if (raw.useName === false && !raw.nameMode) st.S.nameMode = 'off'; delete st.S.useName; }
st.S.namePats = Object.assign(clone(DEFAULTS.namePats), st.S.namePats || {});
if (!Array.isArray(st.S.order) || !st.S.order.length) st.S.order = clone(DEFAULTS.order);
const DET_KEYS = Object.keys(Engine.DET_DEFAULTS).concat(['aliases']);

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

function autoDir() {
if (!st.doc || !st.S.autoDir || st.doc.dirTouched) return;
const dd = Engine.guessDir(st.src.rows, st.doc.roles, st.S);
st.doc.dirAuto = dd;
st.doc.dir = dd.dir;
}
function setS(patch) {
Object.assign(st.S, patch);
save(K.S, st.S);
if (st.doc && Object.keys(patch).some(k => DET_KEYS.includes(k))) autoDir();
emit('settings');
}
function resetS() {
const keep = {aliases: st.S.aliases, theme: st.S.theme};
st.S = Object.assign(clone(DEFAULTS), keep);
save(K.S, st.S); autoDir(); emit('settings');
}
function resetDet() {
setS(clone(Engine.DET_DEFAULTS));
}

function learn(force) {
if (!st.src || (!st.S.useMemory && !force)) return 0;
const dict = Engine.buildDict(st.S.aliases);
const R = st.doc.roles;
if (R.name < 0) return 0;
const ctx = Engine.makeCtx(st.S);
let n = 0;
st.src.rows.forEach(r => {
const name = Engine.clean(r[R.name]); if (!name) return;
const x = Engine.resolve(name, R.unit >= 0 ? Engine.clean(r[R.unit]) : '', ctx);
const p = x.p;
if (!p || !p.known || !(p.count > 1) || x.conflict) return;
const fam = p.container ? p.out : p.family;
if (!Engine.PACKABLE.has(fam)) return;
st.mem[Engine.memKey(name)] = {family: fam, count: p.count}; n++;
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
const dd = Engine.guessDir(src.rows, det.roles, st.S);
st.src = src; st.det = det;
st.doc = {
v: 2, roles: {...det.roles},
kinds: det.cols.map(c => c.kind), conf: det.cols.map(c => c.conf), reasons: det.cols.map(c => c.reason),
ignored: det.cols.filter(c => c.garbage).map(c => c.i),
dir: st.S.autoDir ? dd.dir : 'toBase', dirAuto: dd, dirTouched: false,
fam: {}, rows: {}, groups: {}, columns: [], colsTouched: false
};
st.doc.columns = buildColumns();
st.view = blankView();
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
if (st.S.autoDir && !d.dirTouched) { const dd = Engine.guessDir(st.src.rows, d.roles, st.S); d.dirAuto = dd; d.dir = dd.dir; }
});
return swapped;
}
function buildColumnsFor(d) {
const prev = st.doc; st.doc = d;
try { return buildColumns(); } finally { st.doc = prev; }
}

const blankView = () => ({quick: 'all', search: '', sort: null, rules: [], family: null, tsrc: null, conf: null, flag: null});
let pt = 0, dirty = false;
function persistNow() {
clearTimeout(pt); pt = 0;
if (!dirty) return;
dirty = false;
if (!st.src) { try { localStorage.removeItem(K.SES); } catch {} return; }
if (!save(K.SES, {src: st.src, doc: st.doc, view: st.view, ts: Date.now()})) try { localStorage.removeItem(K.SES); } catch {}
}
function persistSoon() { dirty = true; clearTimeout(pt); pt = setTimeout(persistNow, 400); }
addEventListener('pagehide', persistNow);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persistNow(); });
function savedSession() {
const s = load(K.SES, null);
return s && s.src && Array.isArray(s.src.rows) && Array.isArray(s.src.headers) && s.doc && s.doc.v === 2 && s.doc.roles && Array.isArray(s.doc.columns) ? s : null;
}
function resume(quiet) {
const s = savedSession(); if (!s) return false;
st.src = s.src; st.doc = Object.assign({fam: {}, rows: {}, groups: {}, ignored: [], kinds: [], conf: [], reasons: []}, s.doc);
st.det = {roles: {...st.doc.roles}, cols: st.doc.kinds.map((k, i) => ({i, kind: k}))};
st.undo = []; st.redo = []; st.sel.clear(); st.expanded.clear();
st.view = Object.assign(blankView(), s.view && typeof s.view === 'object' ? s.view : {});
if (!Array.isArray(st.view.rules)) st.view.rules = [];
if (quiet) { st.ver++; return true; }
emit('open');
return true;
}
function close() { st.src = null; st.doc = null; st.det = null; st.wb = null; st.sel.clear(); st.expanded.clear(); st.undo = []; st.redo = []; st.view = blankView(); try { localStorage.removeItem(K.SES); } catch {} emit('close'); }

function setView(patch) { st.view = Object.assign(blankView(), patch || {}); persistSoon(); }
return {st, DEFAULTS, res, fresh, emit, on, commit, undo, redo, setS, resetS, resetDet, learn, remember, clearMem, saveLayout, buildColumns, open, setRole, savedSession, resume, close, clone, blankView, setView, persistSoon};
})();
