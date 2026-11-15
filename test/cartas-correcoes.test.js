// Cartas de correção da Clara ("Corrija a frase"), apóstrofo curvo nas lacunas e avisos de "marcação errada" no estado.
import './support/storage.js';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/store.js';
import { cartaExercicios, buildCartas, check, lacuna, politicaSom } from '../js/exercises.js';

beforeEach(() => { S.resetAll(); localStorage.clear(); });

test('lacuna: o apóstrofo vale reto ou curvo, nos dois lados', () => {
  assert.equal(lacuna('L’aube se lève.', "l'aube"), '____ se lève.');
  assert.equal(lacuna("L'aube se lève.", 'l’aube'), '____ se lève.');
  assert.equal(lacuna("Il se leva à l'aube.", 'aube'), "Il se leva à l'____.", 'a palavra sozinha, depois do apóstrofo, também casa');
  assert.equal(lacuna('Elle est là.', "l'aube"), '');
});

test('carta de correção vira um exercício: mostra a frase errada e você escreve a certa, inteira', () => {
  const id = S.addCarta({ fr: "J'ai vingt ans.", erro: 'Je suis vingt ans', pt: 'Idade usa avoir.', frase: "J'ai vingt ans.", origem: 'clara' });
  const c = S.cartas()[0]; assert.equal(c.id, id);
  const lista = cartaExercicios(c); assert.equal(lista.length, 1, 'só um exercício: a explicação não é tradução');
  const ex = lista[0]; assert.deepEqual([ex.kind, ex.unit, ex.items], ['type', 'cartas', [`card:${id}`]]);
  assert.match(ex.q, /Corrija a frase:<br><i>Je suis vingt ans<\/i>/); assert.equal(ex.answer, "J'ai vingt ans."); assert.doesNotMatch(ex.q, /J'ai/, 'a resposta não aparece no enunciado');
  assert.equal(check(ex, "J'ai vingt ans").ok, true, 'sem o ponto final vale'); assert.equal(check(ex, 'j’ai vingt ans').ok, true, 'apóstrofo curvo e maiúscula valem'); assert.equal(check(ex, 'Je suis vingt ans').ok, false);
  assert.equal(check(ex, "J'ai vingt ans").almost, undefined); assert.equal(check(ex, 'J’ai vingt âns').almost, true, 'só o acento errado é "quase"');
  assert.match(ex.explain, /J'ai vingt ans\.<br>Idade usa avoir\./); assert.equal(politicaSom(ex).antes, false, 'o áudio não entrega a resposta antes'); assert.equal(politicaSom(ex).aoVerificar, true);
  assert.equal(buildCartas([c], 5).length, 1);
});

test('carta de correção: texto do usuário sai escapado e a explicação é opcional', () => {
  S.addCarta({ fr: 'Je mange <b>du</b> pain', erro: 'Je mange <img src=x onerror=alert(1)>', frase: 'Je mange du pain' });
  const ex = cartaExercicios(S.cartas()[0])[0]; assert.doesNotMatch(ex.q + ex.explain, /<img|<b>/); assert.equal(ex.explain, 'Je mange &lt;b&gt;du&lt;/b&gt; pain');
});

test('correção no estado: não repete, diferencia pela frase errada, aceita frase longa e sobrevive à normalização', () => {
  const a = S.addCarta({ fr: "J'ai 20 ans", erro: 'Je suis 20 ans', pt: 'avoir', frase: "J'ai 20 ans" });
  assert.equal(S.addCarta({ fr: "j'ai 20 ans", erro: 'JE SUIS 20 ANS', frase: "J'ai 20 ans" }), a, 'a mesma correção não duplica');
  assert.notEqual(S.addCarta({ fr: "J'ai 20 ans", erro: "Je ai 20 ans", frase: "J'ai 20 ans" }), a, 'outro erro para a mesma frase é outra carta');
  assert.notEqual(S.addCarta({ fr: "J'ai 20 ans", frase: "J'ai 20 ans" }), a, 'e uma carta comum com a mesma frase também');
  assert.equal(S.temCorrecao("J'ai 20 ans", 'je suis 20 ans'), true); assert.equal(S.temCorrecao("J'ai 20 ans", 'outra'), false); assert.equal(S.temCorrecao('x', 'y'), false);
  const longa = 'Je voudrais une chambre avec une vue sur la mer pour deux personnes pendant une semaine, s’il vous plaît, merci beaucoup'; const c = S.addCarta({ fr: longa, erro: longa.replace('une vue', 'un vue'), frase: longa });
  assert.equal(S.cartas().find((x) => x.id === c).fr, longa, 'correção guarda a frase inteira (até 160)');
  const comum = S.addCarta({ fr: longa, frase: '' }); assert.equal(S.cartas().find((x) => x.id === comum).fr.length, 80, 'palavra comum continua cortada em 80');
  const volta = S.normalize(JSON.parse(JSON.stringify(S.get()))); assert.equal(volta.cartas.find((x) => x.id === a).erro, 'Je suis 20 ans', 'o erro sobrevive ao backup');
  assert.equal(volta.cartas.find((x) => x.id === comum).erro, undefined, 'carta comum não ganha campo de erro');
  const lixo = S.normalize({ cartas: [{ id: 'c1', fr: 'x'.repeat(300), erro: 7, pt: 5 }, { id: 'c2', fr: 'y'.repeat(300), erro: '  Je suis  ', pt: 'z'.repeat(300) }] });
  assert.deepEqual([lixo.cartas[0].fr.length, 'erro' in lixo.cartas[0], lixo.cartas[0].pt], [80, false, ''], 'erro que não é texto some'); assert.deepEqual([lixo.cartas[1].fr.length, lixo.cartas[1].erro, lixo.cartas[1].pt.length], [160, 'Je suis', 160]);
});

test('editar uma correção troca a frase certa e a explicação; a carta comum não troca a palavra', () => {
  const id = S.addCarta({ fr: 'Je suis 20 ans', erro: 'x y', frase: 'Je suis 20 ans' }); const comum = S.addCarta({ fr: 'chat', pt: 'gato', frase: 'Le chat dort.' });
  assert.equal(S.updateCarta(id, { fr: "  J'ai   20 ans ", frase: "J'ai 20 ans", pt: 'x'.repeat(200) }), true); const c = S.cartas().find((x) => x.id === id);
  assert.deepEqual([c.fr, c.frase, c.pt.length, c.erro], ["J'ai 20 ans", "J'ai 20 ans", 160, 'x y']); S.updateCarta(id, { fr: '   ' }); assert.equal(S.cartas().find((x) => x.id === id).fr, "J'ai 20 ans", 'vazio não apaga a frase');
  S.updateCarta(comum, { pt: 'y'.repeat(200) }); assert.equal(S.cartas().find((x) => x.id === comum).pt.length, 90, 'significado de palavra continua em 90');
});

test('avisos de marcação errada: guardar, limites, normalização e apagar', () => {
  assert.deepEqual(S.avisos(), []); assert.equal(S.addAviso({ tipo: '  ' }), '', 'sem tipo não guarda');
  const id = S.addAviso({ tipo: 'marcas', onde: 'frase', texto: '  Ils ont   un petit chat. ', detalhe: JSON.stringify({ marcada: 'Il<s> on{t}' }), nota: 'o t de ont soa' });
  assert.deepEqual(S.avisos().map((a) => [a.id, a.tipo, a.onde, a.texto, a.nota]), [[id, 'marcas', 'frase', 'Ils ont un petit chat.', 'o t de ont soa']]); assert.match(S.avisos()[0].criada, /^\d{4}-\d{2}-\d{2}T/);
  const grande = S.addAviso({ tipo: 'x'.repeat(50), texto: 'a'.repeat(500), detalhe: 'b'.repeat(5000), nota: 'c'.repeat(900) }); const a = S.avisos().find((x) => x.id === grande);
  assert.deepEqual([a.tipo.length, a.texto.length, a.detalhe.length, a.nota.length], [20, 200, 1500, 300], 'campos cortados');
  for (let i = 0; i < 110; i++) S.addAviso({ tipo: 'outro', texto: `caso ${i}` }); assert.equal(S.avisos().length, 100); assert.equal(S.avisos().at(-1).texto, 'caso 109', 'guarda os 100 mais recentes');
  const volta = S.normalize(JSON.parse(JSON.stringify(S.get()))); assert.equal(volta.avisos.length, 100);
  const lixo = S.normalize({ avisos: [{ id: 'a1', tipo: 'marcas', texto: 3 }, { id: 5, tipo: 'x' }, null, 'x', { id: 'a2' }, { id: 'a3', tipo: 'outro', detalhe: 'ok' }] });
  assert.deepEqual(lixo.avisos.map((x) => [x.id, x.texto, x.detalhe]), [['a1', '', ''], ['a3', '', 'ok']]); assert.deepEqual(S.normalize({ avisos: 'x' }).avisos, []); assert.deepEqual(S.normalize({}).avisos, []);
  S.clearAvisos(); assert.deepEqual(S.avisos(), []);
});
