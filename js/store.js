// Estado salvo no aparelho (localStorage): progresso, erros para revisão e configurações.
const KEY = 'fr_app_v1';
const DAY = 86400000;
const INTERVALS = [0, 1 * DAY, 3 * DAY, 7 * DAY, 14 * DAY];

const blank = () => ({
  xp: 0, streak: 0, lastDay: '', today: { date: '', n: 0 }, units: {}, mistakes: [],
  settings: { provider: 'gemini', keys: {}, models: {}, voice: true, voiceEngine: 'auto', slow: false, patience: 'longo', goal: 20 },
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
export const dueMistakes = () => state.mistakes.filter((m) => m.due <= Date.now()).map((m) => m.ex);
export function setSetting(k, v) { state.settings[k] = v; save(); }
export function setKey(provider, key) { state.settings.keys = { ...state.settings.keys, [provider]: key }; save(); }
export function setModel(provider, model) { state.settings.models = { ...state.settings.models, [provider]: model }; save(); }
export function resetAll() { state = blank(); save(); }
