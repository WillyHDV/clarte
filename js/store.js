// Estado salvo no aparelho (localStorage): progresso, erros para revisão e configurações.
const KEY = 'fr_app_v1';
export const CHAT_KEY = 'fr_chat_v2';
export const SCHEMA = 2; // versão do formato dos dados (para migrar no futuro sem perder progresso)
const DAY = 86400000;
const INTERVALS = [0, 1 * DAY, 3 * DAY, 7 * DAY, 14 * DAY];

const blank = () => ({
  v: SCHEMA, exams: [], lastBackup: '', xp: 0, streak: 0, lastDay: '', today: { date: '', n: 0 }, units: {}, mistakes: [], mastery: {}, skills: {}, path: {}, plan: { date: '', done: {}, bonus: false, tasks: null }, voiceToday: { date: '', n: 0 },
  settings: { provider: 'gemini', keys: {}, models: {}, voice: true, voiceEngine: 'auto', slow: false, micMode: 'rec', goal: 20 },
});
let state = blank();
try {
  const raw = localStorage.getItem(KEY);
  if (raw) { const s = JSON.parse(raw); state = { ...blank(), ...s, settings: { ...blank().settings, ...(s.settings || {}) } }; }
} catch (e) { /* sem armazenamento: segue em memória */ }

export const get = () => state;
export const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } };
const dayStr = (d = new Date()) => d.toLocaleDateString('sv-SE');

export function touchDay() {
  const t = dayStr();
  if (state.today.date !== t) state.today = { date: t, n: 0 };
  if (state.lastDay !== t) {
    const y = dayStr(new Date(Date.now() - DAY));
    state.streak = state.lastDay === y ? state.streak + 1 : 1;
    state.lastDay = t;
  }
}
export function recordSession(unit, correct, total) {
  touchDay();
  const u = (state.units[unit] ||= { sessions: 0, best: 0, correct: 0, total: 0 });
  u.sessions++; u.correct += correct; u.total += total; u.best = Math.max(u.best, Math.round((100 * correct) / total));
  state.xp += correct * 10 + (correct === total ? 20 : 0);
  state.today.n += total;
  save();
}
export function noteResult(ex, ok, fromReview) {
  const i = state.mistakes.findIndex((m) => m.ex.key === ex.key);
  if (!ok) {
    const entry = { ex, box: 0, due: Date.now() };
    if (i >= 0) state.mistakes[i] = entry; else state.mistakes.push(entry);
  } else if (i >= 0 && fromReview) {
    const m = state.mistakes[i]; m.box++;
    if (m.box >= INTERVALS.length) state.mistakes.splice(i, 1); else m.due = Date.now() + INTERVALS[m.box];
  }
  save();
}
// ---------- domínio por item (modelo simples de esquecimento, inspirado na "meia-vida" do Duolingo) ----------
// Cada item guarda: s = força logo após a última prática (0..1), h = meia-vida em dias, t = quando foi. A força decai: s·2^(-dias/h).
// Acertar sobe a força e alonga a meia-vida (mais ainda quando você PRODUZ a resposta do que quando só reconhece); errar derruba as duas.
export function strength(id, now = Date.now()) {
  const m = state.mastery[id]; if (!m) return null;
  return m.s * Math.pow(2, -((now - m.t) / DAY) / m.h);
}
export function recordItems(items, ok, kind, now = Date.now()) {
  const recog = kind === 'choice' || kind === 'listen-choice';
  for (const id of items || []) {
    const cur = strength(id, now) || 0; const m = state.mastery[id] || { s: 0, h: 0, t: now, n: 0, c: 0 };
    m.n++;
    if (ok) { m.c++; m.s = cur + (1 - cur) * (recog ? 0.3 : 0.5); m.h = m.h ? Math.min(45, m.h * (recog ? 1.4 : 2)) : (recog ? 0.8 : 1.5); }
    else { m.s = cur * 0.5; m.h = m.h ? Math.max(0.3, m.h * 0.5) : 0.3; }
    m.t = now; state.mastery[id] = m;
  }
  save();
}
// domínio de uma lista de itens: média das forças (item nunca visto conta 0)
export function mastery(ids, now = Date.now()) {
  let sum = 0; let seen = 0; const weak = [];
  for (const id of ids) { const s = strength(id, now); if (s !== null) { seen++; sum += s; if (s < 0.6) weak.push([id, s]); } }
  weak.sort((a, b) => a[1] - b[1]);
  return { pct: ids.length ? Math.round((100 * sum) / ids.length) : 0, seen, total: ids.length, weak };
}
// competências ligadas aos critérios da prova oral (média móvel dos últimos resultados)
export function recordSkill(name, v) {
  const k = state.skills[name] || { v, n: 0 };
  k.v = k.n ? k.v * 0.88 + v * 0.12 : v; k.n++; state.skills[name] = k; save();
}
export const skill = (name) => state.skills[name] || null;
// ---------- trilha por degraus (por unidade) ----------
export const pathOf = (u) => state.path[u] || {};
export function setLearned(u) { (state.path[u] ||= {}).learned = true; save(); }
export function recordStep(u, step, pct, passed) {
  const p = (state.path[u] ||= {}); const s = (p[step] ||= { best: 0, done: false });
  s.best = Math.max(s.best, pct); if (passed) s.done = true; save();
}
export const addXp = (n) => { state.xp += n; save(); };

// ---------- plano de hoje ----------
export function plan() {
  const t = dayStr();
  if (state.plan.date !== t) state.plan = { date: t, done: {}, bonus: false, tasks: null };
  return state.plan;
}
export function markPlan(id) { const p = plan(); if (p.done[id]) return false; p.done[id] = true; save(); return true; }
export function voiceTurn() {
  const t = dayStr(); if (state.voiceToday.date !== t) state.voiceToday = { date: t, n: 0 };
  state.voiceToday.n++; save(); return state.voiceToday.n;
}
export const dueMistakes = () => state.mistakes.filter((m) => m.due <= Date.now()).map((m) => m.ex);
export function setSetting(k, v) { state.settings[k] = v; save(); }
export function setKey(provider, key) { state.settings.keys = { ...state.settings.keys, [provider]: key }; save(); }
export function setModel(provider, model) { state.settings.models = { ...state.settings.models, [provider]: model }; save(); }
export function resetAll() { state = blank(); save(); }

// ---------- simulações da prova oral (nota que a Clara dá ao fim) ----------
export function addExam(entry) { state.exams = [...(state.exams || []), { date: new Date().toISOString(), ...entry }].slice(-30); save(); }

// ---------- backup: exportar e importar o progresso ----------
// A chave de API só vai para o arquivo se você pedir (includeKeys).
export function exportData({ includeKeys = false } = {}) {
  const s = JSON.parse(JSON.stringify(state));
  if (!includeKeys) s.settings.keys = {};
  let chats = {}; try { chats = JSON.parse(localStorage.getItem(CHAT_KEY)) || {}; } catch (e) { /* sem conversas */ }
  state.lastBackup = new Date().toISOString(); save();
  return { app: 'clarte', schema: SCHEMA, exportedAt: state.lastBackup, state: { ...s, lastBackup: state.lastBackup }, chats };
}
export function validateBackup(obj) {
  if (!obj || obj.app !== 'clarte' || typeof obj.state !== 'object' || obj.state === null) return 'Este arquivo não é um backup do Clarté.';
  if (typeof obj.schema !== 'number' || obj.schema > SCHEMA) return 'Este backup é de uma versão mais nova do app. Atualize o app e tente de novo.';
  const s = obj.state;
  if (typeof s.mastery !== 'object' || typeof s.settings !== 'object') return 'O arquivo está incompleto.';
  return '';
}
export function importData(obj) {
  const err = validateBackup(obj); if (err) throw new Error(err);
  const keep = state.settings.keys || {}; const s = obj.state;
  state = { ...blank(), ...s, v: SCHEMA, settings: { ...blank().settings, ...(s.settings || {}) } };
  // as chaves atuais do aparelho vencem, a menos que o backup traga chaves
  state.settings.keys = (s.settings && s.settings.keys && Object.keys(s.settings.keys).length) ? s.settings.keys : keep;
  save();
  try { if (obj.chats && typeof obj.chats === 'object') localStorage.setItem(CHAT_KEY, JSON.stringify(obj.chats)); } catch (e) { /* ignore */ }
}
// pede ao navegador para não apagar os dados do app quando faltar espaço
export async function requestPersist() {
  try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (e) { /* ignore */ }
  return false;
}
