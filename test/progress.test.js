import './support/storage.js';
import './support/window.js';
import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/store.js';
import { parseDay, evaluations, nextEvaluation, daysToExam, ensurePlan } from '../js/progress.js';

beforeEach(() => { S.resetAll(); localStorage.clear(); });
afterEach(() => { mock.timers.reset(); });
const at = (y, m, d, h = 10) => new Date(y, m - 1, d, h); // mês 1–12

test('parseDay: só aceita datas reais no formato AAAA-MM-DD', () => {
  assert.equal(parseDay('2026-11-04').getDate(), 4);
  for (const ruim of ['2026-02-30', '2026-13-01', '2026-1-1', '04/11/2026', '', null, undefined, 20261104]) assert.equal(parseDay(ruim), null, String(ruim));
});

test('as avaliações do pacote vêm em ordem de data', () => {
  const evs = evaluations();
  assert.deepEqual(evs.map((e) => e.id), ['eval1', 'eval2']);
  assert.ok(evs[0].date < evs[1].date);
});

test('próxima avaliação: antes, no próprio dia, depois e depois de todas', () => {
  assert.deepEqual([nextEvaluation(at(2026, 10, 31)).ev.id, nextEvaluation(at(2026, 10, 31)).days], ['eval1', 4]);
  assert.deepEqual([nextEvaluation(at(2026, 11, 3, 23)).ev.id, nextEvaluation(at(2026, 11, 3, 23)).days], ['eval1', 1]);
  assert.deepEqual([nextEvaluation(at(2026, 11, 4, 0)).ev.id, nextEvaluation(at(2026, 11, 4, 0)).days], ['eval1', 0], 'meia-noite do dia da prova');
  assert.deepEqual([nextEvaluation(at(2026, 11, 4, 23)).ev.id, nextEvaluation(at(2026, 11, 4, 23)).days], ['eval1', 0], 'o dia inteiro ainda é a prova');
  const dia5 = nextEvaluation(at(2026, 11, 5, 0)); assert.deepEqual([dia5.ev.id, dia5.days], ['eval2', 27]);
  assert.equal(nextEvaluation(at(2026, 12, 2, 18)).days, 0);
  assert.equal(nextEvaluation(at(2026, 12, 3)), null);
});

test('daysToExam acompanha a próxima avaliação e vira null quando não há mais', () => {
  mock.timers.enable({ apis: ['Date'], now: at(2026, 11, 1) }); assert.equal(daysToExam(), 3);
  mock.timers.setTime(at(2026, 11, 20).getTime()); assert.equal(daysToExam(), 12);
  mock.timers.setTime(at(2027, 1, 1).getTime()); assert.equal(daysToExam(), null);
});

test('datas ajustadas em Ajustes valem; data inválida é ignorada', () => {
  S.setSetting('evalDates', { eval1: '2026-11-10' });
  const n = nextEvaluation(at(2026, 11, 5)); assert.deepEqual([n.ev.id, n.ev.date, n.days], ['eval1', '2026-11-10', 5]);
  S.setSetting('evalDates', { eval1: '2026-02-30', eval2: 'amanhã' });
  assert.deepEqual(evaluations().map((e) => e.date), ['2026-11-04', '2026-12-02'], 'valores inválidos não substituem as datas do curso');
});

test('se uma data ajustada passa a outra, a ordem se reorganiza', () => {
  S.setSetting('evalDates', { eval1: '2026-12-20' });
  assert.deepEqual(evaluations().map((e) => e.id), ['eval2', 'eval1']);
  assert.equal(nextEvaluation(at(2026, 11, 5)).ev.id, 'eval2');
});

test('plano do dia: a simulação da prova entra só nos 2 dias antes da avaliação', () => {
  const planoEm = (data) => { S.resetAll(); mock.timers.reset(); mock.timers.enable({ apis: ['Date'], now: data }); return ensurePlan().tasks.map((t) => t.id); };
  assert.ok(!planoEm(at(2026, 10, 31)).includes('exam'), '4 dias antes');
  assert.ok(planoEm(at(2026, 11, 2)).includes('exam'), '2 dias antes');
  assert.ok(planoEm(at(2026, 11, 4)).includes('exam'), 'no dia');
  assert.ok(!planoEm(at(2026, 11, 10)).includes('exam'), 'depois de uma, longe da próxima');
  assert.ok(planoEm(at(2026, 11, 30)).includes('exam'), '2 dias antes da avaliação 2');
  assert.ok(!planoEm(at(2027, 1, 10)).includes('exam'), 'sem avaliação à frente');
});
