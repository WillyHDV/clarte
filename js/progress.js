// Domínio, prontidão, degraus da trilha e plano do dia: regras puras, usadas por várias telas.
import { EVALUATIONS, UNITS } from './data.js';
import { unitItems } from './exercises.js';
import { canListen } from './speech.js';
import * as S from './store.js';
import { toast } from './ui.js';

// ---------- avaliações ----------
// "2026-11-04" → data local à meia-noite (ou null se não for uma data real)
export function parseDay(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : null;
}
// avaliações do pacote com as datas que você ajustou em Ajustes (data inválida é ignorada), em ordem de data
export function evaluations() {
  const mine = S.get().settings.evalDates || {};
  return EVALUATIONS.map((e) => ({ ...e, date: parseDay(mine[e.id]) ? mine[e.id] : e.date })).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
// a próxima avaliação (o próprio dia dela ainda conta) e quantos dias faltam; null se não há mais nenhuma
export function nextEvaluation(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (const ev of evaluations()) { const d = parseDay(ev.date); if (d && d >= today) return { ev, days: Math.round((d - today) / 86400000) }; }
  return null;
}
export function daysToExam() { const n = nextEvaluation(); return n ? n.days : null; }
export const strengthOf = (id) => { const s = S.strength(id); return s === null ? 0.3 : s; };
export const unitMastery = (uid) => S.mastery(unitItems(uid));
export function readiness() {
  const per = UNITS.map((u) => ({ u, m: unitMastery(u.id) }));
  const overall = Math.round(per.reduce((a, x) => a + x.m.pct, 0) / per.length);
  return { per, overall, weakCount: per.reduce((a, x) => a + x.m.weak.length, 0), weakest: [...per].sort((a, b) => a.m.pct - b.m.pct)[0] };
}
// critérios da prova oral (Contenus de la première évaluation) e a competência que os alimenta
export const CRITERIA = [
  ['Compréhension des questions', 'Entender as perguntas', 'compreensao', 'exercícios de escuta'],
  ['Capacité à répondre', 'Responder com pertinência', 'resposta', 'conversa por voz com a Clara'],
  ['Vocabulaire', 'Vocabulário do curso', 'vocabulario', 'exercícios de vocabulário'],
  ['Correction linguistique', 'Gramática correta', 'gramatica', 'exercícios de gramática'],
  ['Prononciation', 'Pronúncia', 'pronuncia', 'exercícios de fala e repetições com a Clara'],
  ["Aisance à l'oral", 'Fluência', 'fluidez', 'conversa por voz com a Clara'],
];
export const STEPS = [
  { id: 'learn', title: 'Aprender', icon: '📖', desc: 'Leia o resumo da unidade' },
  { id: 'recognize', title: 'Reconhecer', icon: '👀', desc: 'Escolher e entender, com escuta', kinds: ['choice', 'listen-choice'], n: 8, pass: 80 },
  { id: 'write', title: 'Escrever', icon: '✍️', desc: 'Escrever e montar frases', kinds: ['type', 'tiles', 'listen-type'], n: 8, pass: 80 },
  { id: 'speak', title: 'Falar', icon: '🎤', desc: 'Repetir em voz alta', kinds: ['speak'], n: 5, pass: 70 },
  { id: 'test', title: 'Teste da unidade', icon: '🏁', desc: 'Misto, para concluir a unidade', n: 12, pass: 80 },
];
export const activeSteps = () => STEPS.filter((s) => s.id !== 'speak' || canListen);
export const stepDone = (uid, sid) => { const p = S.pathOf(uid); return sid === 'learn' ? !!p.learned : !!(p[sid] && p[sid].done); };
export const unitPassed = (uid) => stepDone(uid, 'test');
export const nextStep = (uid) => activeSteps().find((s) => !stepDone(uid, s.id)) || null;
export const currentUnit = () => UNITS.find((u) => !unitPassed(u.id)) || null;
export const stepHref = (uid, s) => (s.id === 'learn' ? `#/unit/${uid}` : `#/step/${uid}/${s.id}`);
// ---------- plano de hoje ----------
export function planDone(id) { if (S.markPlan(id)) toast('✅ Plano de hoje: tarefa concluída'); }
export function markFocus(uid, sid) { const t = (S.plan().tasks || []).find((x) => x.id === 'focus'); if (t && t.go === stepHref(uid, STEPS.find((s) => s.id === sid))) planDone('focus'); }
export function ensurePlan() {
  const p = S.plan(); if (p.tasks) return p;
  const R = readiness(); const d = daysToExam(); const cur = currentUnit(); const tasks = [];
  const weakN = R.weakCount + S.dueMistakes().length;
  if (weakN >= 3) tasks.push({ id: 'review', icon: '🔁', title: `Reforçar ${Math.min(weakN, 10)} itens fracos`, min: 3, go: '#/practice/review' });
  const ns = cur ? nextStep(cur.id) : null;
  tasks.push(ns ? { id: 'focus', icon: cur.icon, title: `${cur.title}: ${ns.title}`, min: 5, go: stepHref(cur.id, ns) } : { id: 'focus', icon: '⚡', title: 'Treino inteligente', min: 5, go: '#/practice/mix' });
  if (canListen) tasks.push({ id: 'speak', icon: '🎤', title: 'Treino de fala: repetir 5 frases', min: 3, go: '#/practice/speakdrill' });
  tasks.push({ id: 'clara', icon: '📞', title: 'Conversar com a Clara (4 respostas)', min: 4, go: '#/tutor/free' });
  if (d !== null && d <= 2) tasks.push({ id: 'exam', icon: '🎓', title: 'Simular a prova oral com a Clara', min: 6, go: '#/tutor/exam' });
  p.tasks = tasks; S.save(); return p;
}
