// Estado salvo no aparelho (localStorage): progresso, erros para revisão e configurações.
const KEY = 'fr_app_v1';
export const CHAT_KEY = 'fr_chat_v2';
export const SCHEMA = 3; // versão do formato dos dados (para migrar no futuro sem perder progresso)
const DAY = 86400000;
const INTERVALS = [0, 1 * DAY, 3 * DAY, 7 * DAY, 14 * DAY];

const blank = () => ({
  v: SCHEMA, exams: [], history: [], lastBackup: '', xp: 0, streak: 0, lastDay: '', today: { date: '', n: 0 }, units: {}, mistakes: [], mastery: {}, skills: {}, path: {}, plan: { date: '', done: {}, bonus: false, tasks: null }, voiceToday: { date: '', n: 0 },
  settings: { provider: 'gemini', keys: {}, models: {}, voice: true, voiceEngine: 'auto', slow: false, micMode: 'rec', goal: 20, evalDates: {}, ttsModel: 'auto', autoBackup: true, reminder: false, reminderTime: '19:00', callText: 'm' },
});
// ---------- versões do formato ----------
// MIGRATIONS[n] converte o estado da versão n para a n+1. Ao mudar o formato: aumente SCHEMA e acrescente a migração aqui.
const MIGRATIONS = {
  1: (s) => s, // v1 → v2: só ganhou exams e lastBackup, que entram com os valores padrão em normalize()
  2: (s) => s, // v2 → v3: ganhou history (histórico diário), que começa vazio
};
const kind = (x) => (Array.isArray(x) ? 'array' : x === null ? 'null' : typeof x);
const isObj = (x) => kind(x) === 'object';
// Aceita qualquer coisa que veio do disco ou de um backup e devolve um estado válido na versão atual:
// migra versões antigas, completa campos que faltam e descarta campos com tipo errado (ex.: mastery: null).
export function normalize(raw) {
  let s = isObj(raw) ? { ...raw } : {};
  let v = Number.isInteger(s.v) && s.v >= 1 ? s.v : 1;
  for (; v < SCHEMA; v++) { if (MIGRATIONS[v]) s = MIGRATIONS[v](s); s.v = v + 1; }
  const base = blank(); const out = { ...base, ...s };
  for (const k of Object.keys(base)) if (kind(out[k]) !== kind(base[k])) out[k] = base[k];
  for (const k of ['today', 'plan', 'voiceToday']) out[k] = { ...base[k], ...out[k] };
  if (!isObj(out.plan.done)) out.plan.done = {};
  // histórico diário: só registros com data real, números válidos e em ordem (os demais são descartados)
  out.history = out.history.filter((h) => isObj(h) && /^\d{4}-\d{2}-\d{2}$/.test(h.d))
    .map((h) => ({ d: h.d, n: Math.max(0, +h.n || 0), ok: Math.max(0, +h.ok || 0), r: Number.isFinite(h.r) ? h.r : null }))
    .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0)).slice(-400);
  out.settings = { ...base.settings, ...(isObj(s.settings) ? s.settings : {}) };
  for (const k of ['keys', 'models', 'evalDates']) if (!isObj(out.settings[k])) out.settings[k] = {};
  return out;
}

let state = blank();
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    try {
      const velho = JSON.parse(raw); const de = isObj(velho) && Number.isInteger(velho.v) && velho.v >= 1 ? velho.v : 1;
      // mudança de formato: guarda uma cópia do progresso na versão antiga (uma vez só por versão) antes de migrar,
      // para dar para voltar atrás se uma atualização der errado; fica em fr_app_v1_antes_v<N>
      if (de < SCHEMA) { const k = `${KEY}_antes_v${de}`; try { if (localStorage.getItem(k) === null) localStorage.setItem(k, raw); } catch (e2) { /* sem espaço */ } }
      state = normalize(velho);
    } catch (e) {
      // dado ilegível: guarda uma cópia antes que o próximo save() sobrescreva (dá para recuperar à mão)
      try { localStorage.setItem(KEY + '_corrompido', raw); } catch (e2) { /* sem espaço */ }
    }
  }
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
// já estudou no dia de `d` (exercícios ou fala com a Clara)? Usado para não lembrar de quem já estudou
export function studiedToday(d = new Date()) {
  const t = dayStr(d);
  return (state.today.date === t && state.today.n > 0) || (state.voiceToday.date === t && state.voiceToday.n > 0);
}
export function recordSession(unit, correct, total) {
  touchDay();
  const u = (state.units[unit] ||= { sessions: 0, best: 0, correct: 0, total: 0 });
  u.sessions++; u.correct += correct; u.total += total; u.best = Math.max(u.best, Math.round((100 * correct) / total));
  logDay({ n: total, ok: correct });
  state.xp += correct * 10 + (correct === total ? 20 : 0);
  state.today.n += total;
  save();
}
// ---------- histórico diário (alimenta os gráficos de Evolução) ----------
// Um registro por dia: n = exercícios feitos, ok = acertos, r = prontidão (%) na última vez que foi calculada (null = não medida).
const MAX_HISTORY = 400;
export function logDay({ n = 0, ok = 0, r } = {}) {
  const t = dayStr(); let h = state.history[state.history.length - 1];
  if (!h || h.d !== t) {
    h = { d: t, n: 0, ok: 0, r: null }; state.history.push(h);
    if (state.history.length > MAX_HISTORY) state.history.splice(0, state.history.length - MAX_HISTORY);
  }
  h.n += n; h.ok += ok; if (typeof r === 'number' && Number.isFinite(r)) h.r = Math.round(r);
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
  const recog = kind === 'choice' || kind === 'listen-choice' || kind === 'match'; // reconhecer rende menos que produzir
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
// mark: false não anota a data do backup (use markBackup() depois, quando o arquivo realmente saiu do aparelho)
export function exportData({ includeKeys = false, mark = true } = {}) {
  const s = JSON.parse(JSON.stringify(state));
  if (!includeKeys) s.settings.keys = {};
  let chats = {}; try { chats = JSON.parse(localStorage.getItem(CHAT_KEY)) || {}; } catch (e) { /* sem conversas */ }
  const quando = new Date().toISOString();
  if (mark) { state.lastBackup = quando; save(); }
  return { app: 'clarte', schema: SCHEMA, exportedAt: quando, state: { ...s, lastBackup: mark ? quando : state.lastBackup }, chats };
}
export function markBackup() { state.lastBackup = new Date().toISOString(); save(); }
// já há algum progresso a perder? (um app recém-instalado ou zerado devolve false e não deve sobrescrever um backup antigo)
export const hasProgress = () => state.xp > 0 || state.mistakes.length > 0 || state.exams.length > 0 || Object.keys(state.mastery).length > 0;
// dias desde o último backup (0 = hoje); null se nunca fez
export function backupAgeDays(now = Date.now()) {
  const t = Date.parse(state.lastBackup); if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((now - t) / DAY));
}
// já há o que perder (mais de 60 pontos) e o backup nunca foi feito ou tem uma semana ou mais
export function backupDue(now = Date.now()) { const age = backupAgeDays(now); return state.xp > 60 && (age === null || age >= 7); }
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
  state = normalize({ ...s, v: Number.isInteger(s.v) ? s.v : obj.schema });
  // as chaves atuais do aparelho vencem, a menos que o backup traga chaves
  state.settings.keys = (isObj(s.settings) && isObj(s.settings.keys) && Object.keys(s.settings.keys).length) ? s.settings.keys : keep;
  save();
  try { if (obj.chats && typeof obj.chats === 'object') localStorage.setItem(CHAT_KEY, JSON.stringify(obj.chats)); } catch (e) { /* ignore */ }
}
// pede ao navegador para não apagar os dados do app quando faltar espaço
export async function requestPersist() {
  try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (e) { /* ignore */ }
  return false;
}
