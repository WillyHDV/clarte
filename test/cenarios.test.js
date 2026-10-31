import './support/storage.js';
import './support/window.js';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, UNITS, PACK } from '../js/data.js';
import { validatePack } from '../content/validate.js';
import * as SC from '../js/scenarios.js';
import * as T from '../js/tutor.js';
import * as S from '../js/store.js';

beforeEach(() => { S.resetAll(); });
const sc = SCENARIOS.find((x) => x.id === 'apresentacao');
const ids = (d) => d.objetivos.map((o) => o.id);

test('os 8 cenários existem, cobrem as unidades do curso e passam na validação do pacote', () => {
  assert.deepEqual(SCENARIOS.map((x) => x.id), ['apresentacao', 'recepcao', 'colega', 'naoentendi', 'entrevista', 'verdadeirofalso', 'despedida', 'miniprova']);
  assert.deepEqual(validatePack(PACK), []);
  const unidades = new Set(UNITS.map((u) => u.id)); assert.ok(SCENARIOS.every((x) => unidades.has(x.unit)));
  assert.equal(SCENARIOS.find((x) => x.id === 'miniprova').nivelFixo, 3, 'a mini-prova é sempre sem ajuda');
  assert.ok(SCENARIOS.every((x) => x.objetivos.length >= 5 && x.abertura.length > 10));
});

test('a validação pega cenários com defeito', () => {
  const ruim = (muda) => { const p = JSON.parse(JSON.stringify(PACK)); muda(p.scenarios); return validatePack(p).join(' | '); };
  assert.match(ruim((s) => { s[1].id = s[0].id; }), /scenarios\[1\]\.id/);
  assert.match(ruim((s) => { s[0].unit = 'inexistente'; }), /scenarios\[0\]\.unit/);
  assert.match(ruim((s) => { s[0].objetivos[0].frase = ' com espaço '; }), /objetivos\[0\]\.frase/);
  assert.match(ruim((s) => { s[0].objetivos.push({ ...s[0].objetivos[0] }); }), /objetivos\[5\]\.id/);
  assert.match(ruim((s) => { s[0].registro = 'tutu'; }), /registro/);
  assert.match(ruim((s) => { s[0].objetivos = s[0].objetivos.slice(0, 2); }), /de 3 a 10 objetivos/);
  assert.match(ruim((s) => { s[0].nivelFixo = 7; }), /nivelFixo/);
});

test('marcadores da IA: objetivos cumpridos, fim e avaliação final, ignorando ids que não existem', () => {
  const a = SC.parseMarkers('Enchantée, Willy.\nVous habitez où ?\n##OK:nome, nacionalidade', ids(sc));
  assert.deepEqual(a, { ok: ['nome', 'nacionalidade'], fim: false, final: null });
  assert.deepEqual(SC.parseMarkers('Bien.\n##OK:\n', ids(sc)).ok, [], '##OK vazio = nada cumprido');
  assert.deepEqual(SC.parseMarkers('##OK:nome,inventado,NOME,cidade', ids(sc)).ok, ['nome', 'cidade'], 'id desconhecido some, repetido conta uma vez, maiúscula vale');
  assert.equal(SC.parseMarkers('Au revoir !\n##OK:profissao\n##FIN', ids(sc)).fim, true);
  assert.equal(SC.parseMarkers('##FINAL:nome', ids(sc)).fim, false, '##FINAL não é ##FIN');
  assert.deepEqual(SC.parseMarkers('**Missão:** cumprida\n##FINAL: saudar,nome', ids(sc)).final, ['saudar', 'nome']);
  assert.deepEqual(SC.parseMarkers('', ids(sc)), { ok: [], fim: false, final: null }); assert.deepEqual(SC.parseMarkers(undefined, ids(sc)).ok, []);
});

test('o que é falado ou mostrado nunca leva os marcadores', () => {
  assert.equal(SC.stripMarkers('Bonjour !\n##OK:nome\n##FIN'), 'Bonjour !'); assert.equal(SC.stripMarkers('##OK:'), '');
  assert.equal(SC.stripMarkers('**Missão:** cumprida\n✓ Nome\n##FINAL:nome'), '**Missão:** cumprida\n✓ Nome');
});

test('ajuda por nível: frases, só o começo ou nada, e sempre os próximos objetivos que faltam', () => {
  const nenhum = new Set();
  assert.deepEqual(SC.dicas(sc, 1, nenhum), [{ id: 'saudar', texto: 'Bonjour, madame. Je vais bien, merci.' }, { id: 'nome', texto: "Je m'appelle Willy." }]);
  assert.deepEqual(SC.dicas(sc, 2, nenhum).map((d) => d.texto), ['Bonjour, je vais…', "Je m'appelle…"]);
  assert.deepEqual(SC.dicas(sc, 3, nenhum), [], 'modo prova: nada na tela');
  assert.deepEqual(SC.dicas(sc, 1, new Set(['saudar', 'nome'])).map((d) => d.id), ['nacionalidade', 'cidade'], 'o que já foi cumprido sai');
  assert.deepEqual(SC.dicas(sc, 1, new Set(ids(sc))), [], 'tudo cumprido: sem dicas');
});

test('nível sugerido, nível fixo e veredito', () => {
  assert.equal(SC.nivelSugerido(sc, {}), 1); assert.equal(SC.nivelSugerido(sc, { apresentacao: { levelDone: 1 } }), 2); assert.equal(SC.nivelSugerido(sc, { apresentacao: { levelDone: 3 } }), 3);
  const prova = SCENARIOS.find((x) => x.id === 'miniprova'); assert.equal(SC.nivelSugerido(prova, {}), 3); assert.equal(SC.nivelDe(prova, 1), 3); assert.equal(SC.nivelDe(sc, 2), 2); assert.equal(SC.nivelDe(sc, 9), 1);
  assert.equal(SC.veredito(5, 5).chave, 'ok'); assert.equal(SC.veredito(2, 5).chave, 'parcial'); assert.equal(SC.veredito(0, 5).chave, 'nao');
});

test('as instruções do cenário trazem papel, objetivos, marcadores e a regra de ajuda do nível', () => {
  const n1 = T.scenarioSystem(sc, 1);
  for (const id of ids(sc)) assert.ok(n1.includes(`- ${id} :`), `objetivo ${id}`);
  assert.ok(n1.includes('madame Martin')); assert.match(n1, /##OK:/); assert.match(n1, /##FIN/); assert.match(n1, /##FINAL:/); assert.match(n1, /\[FIN\]/);
  assert.match(n1, /NIVEAU 1/); assert.match(n1, /Vouvoie/); assert.match(n1, /UNE seule erreur/);
  const n3 = T.scenarioSystem(sc, 3); assert.match(n3, /NIVEAU 3 \(mode examen\) : ne corrige RIEN/); assert.doesNotMatch(n3, /UNE seule erreur/);
  assert.match(T.scenarioSystem(SCENARIOS.find((x) => x.id === 'colega'), 2), /Tutoie/);
  assert.match(T.scenarioSystem(SCENARIOS.find((x) => x.id === 'despedida'), 1), /Le registre change/);
  assert.doesNotMatch(n1, /undefined|\[object/);
});

test('progresso dos cenários: tentativas, melhor resultado, maior nível vencido e pontos', () => {
  const xp0 = S.get().xp;
  S.recordScenario('apresentacao', { nivel: 1, done: 3, total: 5 });
  assert.deepEqual(S.get().scenarios.apresentacao, { ...S.get().scenarios.apresentacao, runs: 1, best: 3, levelDone: 0, nivel: 1 }); assert.equal(S.get().xp, xp0 + 15);
  S.recordScenario('apresentacao', { nivel: 2, done: 5, total: 5 });
  const x = S.get().scenarios.apresentacao; assert.equal(x.runs, 2); assert.equal(x.best, 5); assert.equal(x.levelDone, 2); assert.equal(x.nivel, 2); assert.equal(S.get().xp, xp0 + 15 + 45, 'missão cumprida dá 20 a mais');
  S.recordScenario('apresentacao', { nivel: 1, done: 5, total: 5 }); assert.equal(S.get().scenarios.apresentacao.levelDone, 2, 'repetir um nível mais fácil não rebaixa');
});

test('o progresso dos cenários entra no backup e sobrevive a dados estragados', () => {
  S.recordScenario('colega', { nivel: 1, done: 5, total: 5 });
  const b = S.exportData({ mark: false }); assert.equal(b.state.scenarios.colega.levelDone, 1);
  S.importData(JSON.parse(JSON.stringify(b))); assert.equal(S.get().scenarios.colega.levelDone, 1);
  S.get().scenarios.colega = 'lixo'; S.recordScenario('colega', { nivel: 1, done: 2, total: 5 }); assert.equal(S.get().scenarios.colega.runs, 1, 'entrada ilegível é refeita sem derrubar');
  assert.deepEqual(S.normalize({ v: 3, scenarios: null }).scenarios, {}, 'tipo errado volta para vazio');
  assert.deepEqual(S.normalize({ v: 2 }).scenarios, {}, 'dados antigos ganham o campo');
});
