// Sons do francês: conteúdo dos pares mínimos, exercícios gerados, seleção pelo ponto de esquecer e progresso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SONS } from '../content/sons.js';
import { buildSons, candidatosDoGrupo, grupoPorId, itemDoPar, progressoSons } from '../js/sons.js';
import { check, itemLabel, politicaSom } from '../js/exercises.js';

const todosPares = SONS.flatMap((g) => g.pares.map((p) => ({ g, p })));
const FR = /^[a-zàâäçéèêëîïôöùûüœ'-]+$/;
const IPA = /^\/([abdefgijklmnoprstuvwyzøœɔɛɑəʁʃʒ]̃?)+\/$/; // letras do IPA usadas, cada uma com til de nasalização opcional

test('conteúdo: grupos e pares bem formados, sem repetir id', () => {
  assert.ok(SONS.length >= 8, 'pelo menos 8 sons');
  assert.equal(new Set(SONS.map((g) => g.id)).size, SONS.length, 'ids de grupo únicos');
  for (const g of SONS) {
    for (const campo of ['id', 'titulo', 'ipa', 'resumo', 'dica']) assert.ok(typeof g[campo] === 'string' && g[campo].trim() === g[campo] && g[campo], `${g.id}: ${campo}`);
    assert.match(g.id, /^[a-z-]+$/, 'id de grupo usável no endereço'); assert.ok(g.dica.length > 60, `${g.id}: dica com explicação de verdade`);
    assert.ok(g.pares.length >= 5, `${g.id}: pelo menos 5 pares`); assert.equal(new Set(g.pares.map((p) => p.id)).size, g.pares.length, `${g.id}: ids de par únicos`);
    assert.ok(g.digitar === undefined || typeof g.digitar === 'boolean');
  }
  assert.equal(todosPares.length, new Set(todosPares.map(({ g, p }) => itemDoPar(g, p))).size, 'item de cada par é único');
});

test('conteúdo: cada par traz 2 ou 3 palavras que diferem no som e no significado', () => {
  for (const { g, p } of todosPares) {
    const onde = `${g.id}/${p.id}`; assert.match(p.id, /^[a-z-]+$/, onde); assert.ok(p.palavras.length === 2 || p.palavras.length === 3, `${onde}: 2 ou 3 palavras`);
    for (const campo of ['fr', 'pt', 'ipa']) assert.equal(new Set(p.palavras.map((w) => w[campo])).size, p.palavras.length, `${onde}: ${campo} diferente em cada palavra (par mínimo, e sem homófonos)`);
    for (const w of p.palavras) {
      assert.match(w.fr, FR, `${onde}: ${w.fr}`); assert.match(w.ipa, IPA, `${onde}: IPA de ${w.fr}: ${w.ipa}`);
      assert.ok(w.pt && w.pt === w.pt.trim() && !/\s{2}/.test(w.pt), `${onde}: significado de ${w.fr}`);
    }
    assert.ok(p.id.split('-').length >= 2 || p.palavras.length === 2, onde);
  }
  assert.deepEqual(JSON.parse(JSON.stringify(SONS)), SONS, 'só dados, sobrevive a JSON');
});

test('conteúdo: o id do par nasce das palavras (pega troca de par sem querer) e os trios são os nasais', () => {
  for (const { g, p } of todosPares) {
    const esperado = p.palavras.map((w) => w.fr.normalize('NFD').replace(/[̀-ͯ]/g, '')).join('-');
    assert.equal(p.id, esperado, `${g.id}: o id ${p.id} deveria ser ${esperado}`);
  }
  assert.deepEqual([...new Set(todosPares.filter(({ p }) => p.palavras.length === 3).map(({ g }) => g.id))], ['nasais']);
});

test('exercícios: toda opção, resposta e áudio fazem sentido, e a resposta certa é aceita', () => {
  for (const g of SONS) {
    const lista = candidatosDoGrupo(g); const chaves = new Set();
    assert.ok(lista.length >= g.pares.length * 6, `${g.id}: muitos candidatos`);
    for (const ex of lista) {
      assert.deepEqual([ex.unit, ex.kind, ex.rapido, ex.sub], ['sons', 'listen-choice', true, g.titulo]); assert.ok(!chaves.has(ex.key), `chave repetida ${ex.key}`); chaves.add(ex.key);
      assert.equal(ex.items.length, 1); assert.match(ex.items[0], new RegExp(`^som:${g.id}:`)); const par = g.pares.find((p) => itemDoPar(g, p) === ex.items[0]); assert.ok(par);
      assert.ok(ex.options.includes(ex.answer), 'a opção certa existe'); assert.equal(new Set(ex.options).size, ex.options.length, 'opções diferentes'); assert.ok(ex.audio && ex.q);
      assert.equal(check(ex, ex.answer).ok, true); for (const o of ex.options.filter((x) => x !== ex.answer)) assert.equal(check(ex, o).ok, false, `${o} não pode valer`);
      const palavra = par.palavras.find((w) => w.fr === ex.audio);
      if (ex._v === 'ident') assert.deepEqual([ex.answer, [...ex.options].sort()], [ex.audio, par.palavras.map((w) => w.fr).sort()]);
      else if (ex._v === 'sentido') assert.deepEqual([ex.answer, [...ex.options].sort()], [palavra.pt, par.palavras.map((w) => w.pt).sort()]);
      else { const [a, b] = ex.audio.split(', '); assert.ok(par.palavras.some((w) => w.fr === a) && par.palavras.some((w) => w.fr === b)); assert.deepEqual(ex.options, ['Iguais', 'Diferentes']); assert.equal(ex.answer, a === b ? 'Iguais' : 'Diferentes'); }
      for (const w of par.palavras) assert.ok(ex.explain.includes(`data-say="${w.fr}"`) && ex.explain.includes(w.ipa) && ex.explain.includes(w.pt), `explicação traz ${w.fr}`);
      assert.equal((ex.explain.match(/data-rapido="1"/g) || []).length, par.palavras.length, 'cada botão usa a voz do aparelho');
      assert.doesNotMatch(JSON.stringify(ex), /undefined|NaN|\[object/);
    }
    const tipos = new Set(lista.map((e) => e._v)); assert.deepEqual([...tipos].sort(), ['ident', 'igual', 'sentido']);
    assert.equal(lista.filter((e) => e._v === 'igual' && e.answer === 'Iguais').length, g.pares.length, 'uma pergunta "iguais" por par');
    assert.equal(lista.filter((e) => e._v === 'igual' && e.answer === 'Diferentes').length, g.pares.length, 'uma "diferentes" por par');
  }
});

test('o botão final só aparece em "iguais ou diferentes" (nos outros o painel já tem um botão por palavra)', () => {
  const g = SONS[0]; const lista = candidatosDoGrupo(g);
  for (const ex of lista) { const som = politicaSom(ex); assert.equal(som.antes, true, 'o áudio vem antes: é o enunciado'); assert.equal(som.aoVerificar, true); assert.equal(som.botaoFinal, ex._v === 'igual', ex._v); }
});

test('sessão: n exercícios, no máximo um por par quando há pares de sobra, e nenhum tipo passa da metade', () => {
  for (let k = 0; k < 20; k++) {
    const mix = buildSons(null, 10); assert.equal(mix.length, 10); assert.equal(new Set(mix.map((e) => e._p)).size, 10, 'todos os 10 de pares diferentes');
    for (const t of ['ident', 'sentido', 'igual']) assert.ok(mix.filter((e) => e._v === t).length <= 5, `tipo ${t}`);
    for (const g of SONS) {
      const l = buildSons(g.id, 10); assert.equal(l.length, 10, g.id); const porPar = {}; for (const e of l) porPar[e._p] = (porPar[e._p] || 0) + 1;
      assert.ok(Object.values(porPar).every((n) => n <= 2), `${g.id}: no máximo 2 por par`); assert.equal(new Set(l.map((e) => e.key)).size, 10, `${g.id}: sem repetir exercício`);
      assert.ok(l.every((e) => e.items[0].startsWith(`som:${g.id}:`)), 'só do grupo pedido');
    }
  }
  assert.equal(buildSons('nao-existe', 4).length, 4, 'grupo desconhecido vira todos os sons'); assert.equal(buildSons(null, 3).length, 3);
});

test('sessão: o par perto de esquecer vem antes do esquecido e do firme; "aceitar" restringe', () => {
  const g = SONS[0]; const alvo = itemDoPar(g, g.pares[2]); const forca = (it) => (it === alvo ? 0.6 : 0.97);
  for (let k = 0; k < 20; k++) { assert.equal(buildSons(g.id, 1, forca)[0]._p, alvo, 'o par no ponto de esquecer vem antes dos firmes'); assert.ok(buildSons(g.id, 3, forca).some((e) => e._p === alvo)); }
  const esquecido = itemDoPar(g, g.pares[1]); const f2 = (it) => (it === alvo ? 0.6 : it === esquecido ? 0.05 : 0.97);
  for (let k = 0; k < 20; k++) assert.equal(buildSons(g.id, 1, f2)[0]._p, alvo, 'perto de esquecer antes do já esquecido');
  const so = buildSons(null, 10, () => 0.3, { aceitar: (it) => it === alvo }); assert.ok(so.length > 0 && so.length <= 10 && so.every((e) => e._p === alvo), 'só o par aceito');
  assert.deepEqual(buildSons(null, 5, () => 0.3, { aceitar: () => false }), []);
});

test('progresso: par nunca visto conta zero, "para rever" é só o que já foi visto e está abaixo de 0,85', () => {
  const g = SONS[0]; const n = g.pares.length; const sem = progressoSons([g], () => null);
  assert.deepEqual(sem, { total: n, vistos: 0, pct: 0, rever: 0 });
  const forcas = { [itemDoPar(g, g.pares[0])]: 1, [itemDoPar(g, g.pares[1])]: 0.5 };
  const p = progressoSons([g], (it) => (it in forcas ? forcas[it] : null)); assert.equal(p.vistos, 2); assert.equal(p.rever, 1); assert.equal(p.pct, Math.round((100 * 1.5) / n));
  assert.equal(progressoSons([], () => null).total, 0); assert.equal(progressoSons(SONS, () => 1).pct, 100); assert.equal(progressoSons(SONS, () => 1).total, todosPares.length);
  assert.equal(grupoPorId(g.id), g); assert.equal(grupoPorId('x'), null);
});

test('nome legível do item de som (usado na lista do que reforçar)', () => {
  const g = SONS[0]; const p = g.pares[0];
  assert.equal(itemLabel(itemDoPar(g, p)), `Som ${g.titulo}: ${p.palavras.map((w) => w.fr).join(' · ')}`); assert.equal(itemLabel('som:x:y'), 'som:x:y');
});
