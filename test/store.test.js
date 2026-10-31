import './support/storage.js';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/store.js';

const DAY = 86400000;
const T0 = Date.UTC(2026, 9, 31, 12);
beforeEach(() => { S.resetAll(); localStorage.clear(); });

test('acertar sobe a força e errar derruba', () => {
  S.recordItems(['x'], true, 'type', T0);
  const s1 = S.strength('x', T0);
  assert.ok(s1 > 0.4 && s1 <= 1, `força depois de acertar digitando: ${s1}`);
  S.recordItems(['x'], false, 'type', T0);
  assert.ok(Math.abs(S.strength('x', T0) - s1 * 0.5) < 1e-9, 'errar corta a força pela metade');
});

test('reconhecer (escolha) rende menos que produzir (digitar)', () => {
  S.recordItems(['rec'], true, 'choice', T0); S.recordItems(['prod'], true, 'type', T0);
  assert.ok(S.strength('rec', T0) < S.strength('prod', T0));
});

test('a força decai com o tempo (meia-vida) e item nunca visto é nulo', () => {
  assert.equal(S.strength('nunca', T0), null);
  S.recordItems(['y'], true, 'type', T0);
  const h = S.get().mastery.y.h; const s0 = S.strength('y', T0);
  assert.ok(Math.abs(S.strength('y', T0 + h * DAY) - s0 / 2) < 1e-9, 'passada uma meia-vida, a força cai à metade');
  assert.ok(S.strength('y', T0 + 30 * DAY) < s0 / 4);
});

test('acertos seguidos alongam a meia-vida (sem passar de 45 dias)', () => {
  let t = T0; let last = 0;
  for (let i = 0; i < 12; i++) { S.recordItems(['z'], true, 'type', t); const h = S.get().mastery.z.h; assert.ok(h >= last); last = h; t += DAY; }
  assert.equal(S.get().mastery.z.h, 45);
});

test('domínio da unidade: média dos itens (não vistos contam 0) e lista de fracos', () => {
  S.recordItems(['a'], true, 'type', T0); S.recordItems(['a'], true, 'type', T0); S.recordItems(['b'], false, 'type', T0);
  const m = S.mastery(['a', 'b', 'c'], T0);
  assert.equal(m.total, 3); assert.equal(m.seen, 2);
  assert.ok(m.pct > 0 && m.pct < 100);
  assert.deepEqual(m.weak.map(([id]) => id), ['b'], 'só b está abaixo de 0,6, e c nunca foi visto');
  assert.equal(S.mastery([], T0).pct, 0);
});

test('revisão espaçada: errar agenda, acertar na revisão avança, ao fim sai da lista', () => {
  const ex = { key: 'k1', kind: 'type' };
  S.noteResult(ex, false);
  assert.equal(S.get().mistakes.length, 1);
  assert.equal(S.dueMistakes().length, 1, 'recém-errado já está vencido');
  S.noteResult(ex, true, true);
  assert.equal(S.get().mistakes[0].box, 1);
  assert.equal(S.dueMistakes().length, 0, 'agora só volta depois do intervalo');
  for (let i = 0; i < 4; i++) S.noteResult(ex, true, true);
  assert.equal(S.get().mistakes.length, 0, 'depois de todas as caixas, sai da revisão');
  S.noteResult(ex, true, true); assert.equal(S.get().mistakes.length, 0, 'acertar algo que não está na lista não cria nada');
});

test('errar de novo na revisão volta para a primeira caixa, sem duplicar', () => {
  const ex = { key: 'k2' };
  S.noteResult(ex, false); S.noteResult(ex, true, true); S.noteResult(ex, false);
  assert.equal(S.get().mistakes.length, 1); assert.equal(S.get().mistakes[0].box, 0);
});

test('sessão: soma XP, bônus de sessão perfeita e melhor nota', () => {
  S.recordSession('comm', 8, 10); assert.equal(S.get().xp, 80);
  S.recordSession('comm', 10, 10); assert.equal(S.get().xp, 80 + 100 + 20);
  assert.equal(S.get().units.comm.best, 100); assert.equal(S.get().units.comm.sessions, 2);
});

test('degraus da trilha guardam a melhor nota e só marcam como feito quando passa', () => {
  S.recordStep('comm', 'test', 60, false); assert.equal(S.pathOf('comm').test.done, false);
  S.recordStep('comm', 'test', 85, true); S.recordStep('comm', 'test', 40, false);
  assert.deepEqual(S.pathOf('comm').test, { best: 85, done: true });
});

test('competências: média móvel', () => {
  assert.equal(S.skill('pronuncia'), null);
  S.recordSkill('pronuncia', 1); assert.equal(S.skill('pronuncia').v, 1);
  S.recordSkill('pronuncia', 0); assert.ok(Math.abs(S.skill('pronuncia').v - 0.88) < 1e-9);
});

test('plano do dia: marcar só conta uma vez; falas por voz acumulam', () => {
  assert.equal(S.markPlan('review'), true); assert.equal(S.markPlan('review'), false);
  assert.equal(S.voiceTurn(), 1); assert.equal(S.voiceTurn(), 2);
});

test('simulações da prova: guarda só as 30 últimas', () => {
  for (let i = 0; i < 35; i++) S.addExam({ score: i % 10, crit: {} });
  assert.equal(S.get().exams.length, 30); assert.equal(S.get().exams.at(-1).score, 4);
});

test('o estado é salvo e carregado de volta', async () => {
  S.setKey('gemini', 'chave-de-teste'); S.recordItems(['p'], true, 'type', T0);
  const saved = JSON.parse(localStorage.getItem('fr_app_v1'));
  assert.equal(saved.settings.keys.gemini, 'chave-de-teste'); assert.ok(saved.mastery.p); assert.equal(saved.v, S.SCHEMA);
});

test('backup: a chave não vai para o arquivo, a menos que se peça', () => {
  S.setKey('gemini', 'segredo'); S.recordItems(['p'], true, 'type', T0);
  const b = S.exportData();
  assert.equal(b.app, 'clarte'); assert.equal(b.schema, S.SCHEMA); assert.deepEqual(b.state.settings.keys, {});
  assert.ok(!JSON.stringify(b).includes('segredo'));
  assert.equal(S.exportData({ includeKeys: true }).state.settings.keys.gemini, 'segredo');
  assert.ok(S.get().lastBackup, 'registra a data do último backup');
});

test('restaurar: traz o progresso e mantém a chave do aparelho', () => {
  S.recordItems(['p'], true, 'type', T0); S.addXp(50);
  localStorage.setItem(S.CHAT_KEY, JSON.stringify({ free: [{ role: 'user', content: 'oi' }] }));
  const backup = JSON.parse(JSON.stringify(S.exportData()));
  S.resetAll(); localStorage.clear(); S.setKey('gemini', 'chave-nova');
  S.importData(backup);
  assert.ok(S.get().mastery.p); assert.equal(S.get().xp, 50);
  assert.equal(S.get().settings.keys.gemini, 'chave-nova', 'a chave do aparelho vence quando o backup não tem chave');
  assert.equal(JSON.parse(localStorage.getItem(S.CHAT_KEY)).free[0].content, 'oi', 'conversas voltam junto');
});

test('restaurar rejeita arquivos errados, incompletos ou de versão mais nova', () => {
  assert.match(S.validateBackup(null), /não é um backup/);
  assert.match(S.validateBackup({ app: 'outro', state: {} }), /não é um backup/);
  assert.match(S.validateBackup({ app: 'clarte', schema: S.SCHEMA + 1, state: { mastery: {}, settings: {} } }), /mais nova/);
  assert.match(S.validateBackup({ app: 'clarte', schema: S.SCHEMA, state: {} }), /incompleto/);
  assert.equal(S.validateBackup({ app: 'clarte', schema: S.SCHEMA, state: { mastery: {}, settings: {} } }), '');
  assert.throws(() => S.importData({ app: 'x' }), /não é um backup/);
});

test('backup antigo (esquema menor, sem campos novos) é aceito e completado', () => {
  S.importData({ app: 'clarte', schema: 1, state: { mastery: { q: { s: 0.5, h: 1, t: T0, n: 1, c: 1 } }, settings: { provider: 'groq' } } });
  assert.equal(S.get().settings.provider, 'groq'); assert.equal(S.get().settings.micMode, 'rec', 'campo novo ganha o valor padrão');
  assert.deepEqual(S.get().exams, []); assert.equal(S.get().v, S.SCHEMA);
});

test('normalize: estado de versão antiga ganha a versão e os campos novos', () => {
  const s = S.normalize({ xp: 40, mastery: { a: { s: 1, h: 1, t: 1, n: 1, c: 1 } } });
  assert.equal(s.v, S.SCHEMA); assert.equal(s.xp, 40); assert.ok(s.mastery.a);
  assert.deepEqual(s.exams, []); assert.equal(s.lastBackup, ''); assert.equal(s.settings.micMode, 'rec');
});

test('normalize: descarta campos com tipo errado e completa objetos pela metade', () => {
  const s = S.normalize({ mastery: null, mistakes: {}, exams: 'x', xp: '10', today: { n: 3 }, plan: { done: 5 }, settings: { keys: 'oops', goal: 30 } });
  assert.deepEqual(s.mastery, {}); assert.deepEqual(s.mistakes, []); assert.deepEqual(s.exams, []); assert.equal(s.xp, 0);
  assert.deepEqual(s.today, { date: '', n: 3 }); assert.deepEqual(s.plan.done, {});
  assert.deepEqual(s.settings.keys, {}); assert.equal(s.settings.goal, 30);
});

test('normalize: lixo vira estado em branco e versão mais nova não é rebaixada', () => {
  for (const lixo of [null, undefined, 5, 'texto', [], [1, 2]]) assert.equal(S.normalize(lixo).v, S.SCHEMA);
  assert.equal(S.normalize({ v: S.SCHEMA + 3, xp: 7 }).v, S.SCHEMA + 3);
  assert.equal(S.normalize({ v: 'x' }).v, S.SCHEMA);
});

test('normalize não altera o objeto recebido', () => {
  const entrada = { xp: 1, settings: { goal: 5 } }; const copia = JSON.stringify(entrada);
  S.normalize(entrada); assert.equal(JSON.stringify(entrada), copia);
});

test('dados salvos ilegíveis: o app abre em branco e guarda uma cópia do original', async () => {
  localStorage.setItem('fr_app_v1', '{"xp": 12, quebrado');
  const novo = await import(`../js/store.js?corrompido=${Date.now()}`);
  assert.equal(novo.get().xp, 0);
  assert.equal(localStorage.getItem('fr_app_v1_corrompido'), '{"xp": 12, quebrado');
});

test('dados salvos válidos, mas com campos ruins, não derrubam o app', async () => {
  localStorage.setItem('fr_app_v1', JSON.stringify({ v: 1, xp: 90, mastery: null, mistakes: 'x', settings: null }));
  const novo = await import(`../js/store.js?ruim=${Date.now()}`);
  assert.equal(novo.get().xp, 90); assert.deepEqual(novo.get().mastery, {});
  assert.doesNotThrow(() => { novo.recordItems(['a'], true, 'type'); novo.noteResult({ key: 'k' }, false); novo.dueMistakes(); });
  assert.equal(novo.get().settings.provider, 'gemini');
});

test('normalize: datas de avaliação ajustadas precisam ser um objeto (e vêm vazias por padrão)', () => {
  assert.deepEqual(S.normalize({}).settings.evalDates, {});
  assert.deepEqual(S.normalize({ settings: { evalDates: 'x' } }).settings.evalDates, {});
  assert.deepEqual(S.normalize({ settings: { evalDates: { eval1: '2026-11-10' } } }).settings.evalDates, { eval1: '2026-11-10' });
});
