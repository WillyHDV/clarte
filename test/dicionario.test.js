import './support/storage.js';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { validarVerbete, hashFrase, chaveVerbete, verbeteSalvo, guardarVerbete, totalVerbetes } from '../js/dicionario.js';

beforeEach(() => { localStorage.removeItem('fr_dict_v1'); });

test('validarVerbete: limpa, limita e aceita significados em texto solto', () => {
  const v = validarVerbete({ palavra: ' petit ', lema: 'petit', classe: 'adjetivo', nivel: 'A1', leitura: 'pe-ti', significados: ['pequeno', { pt: 'baixo', nota: 'altura' }, { pt: '' }, null, 3], neste_contexto: ' pequeno ', exemplos: [{ fr: 'Un petit chat.', pt: 'Um gatinho.' }, { fr: '' }, 'x'], expressoes: [], notas: 'dica' });
  assert.equal(v.palavra, 'petit'); assert.deepEqual(v.significados, [{ pt: 'pequeno', nota: '' }, { pt: 'baixo', nota: 'altura' }]); assert.equal(v.contexto, 'pequeno');
  assert.deepEqual(v.exemplos, [{ fr: 'Un petit chat.', pt: 'Um gatinho.' }]); assert.equal(v.nivel, 'A1'); assert.equal(v.notas, 'dica');
});

test('validarVerbete: nível inválido some, listas têm limite e verbete vazio é erro', () => {
  const muitos = Array.from({ length: 20 }, (_, i) => ({ pt: `s${i}`, nota: 'n'.repeat(500) }));
  const v = validarVerbete({ significados: muitos, exemplos: Array.from({ length: 9 }, (_, i) => ({ fr: `e${i}`, pt: 'x' })), expressoes: Array.from({ length: 9 }, (_, i) => ({ fr: `x${i}`, pt: 'y' })), nivel: 'Z9', notas: 'z'.repeat(900) });
  assert.equal(v.significados.length, 6); assert.equal(v.significados[0].nota.length, 140); assert.equal(v.exemplos.length, 4); assert.equal(v.expressoes.length, 4); assert.equal(v.nivel, ''); assert.equal(v.notas.length, 320);
  assert.equal(validarVerbete({ neste_contexto: 'só o contexto' }).contexto, 'só o contexto', 'só o contexto já basta');
  for (const ruim of [null, 'texto', [], {}, { significados: [], neste_contexto: ' ' }, { significados: [{ pt: '' }] }]) assert.throws(() => validarVerbete(ruim), /não conseguiu montar o verbete/);
});

test('cache: o verbete vale para a palavra na mesma frase; outra frase, outra entrada', () => {
  const v = validarVerbete({ significados: ['pequeno'] });
  assert.equal(chaveVerbete('Petit,', 'Ils ont un petit chat.'), chaveVerbete('petit', 'ils ont un  petit chat.'), 'maiúscula, pontuação e espaços não mudam a chave');
  assert.notEqual(chaveVerbete('petit', 'Ils ont un petit chat.'), chaveVerbete('petit', 'Le petit prince.')); assert.equal(hashFrase("J’ai"), hashFrase("J'ai"));
  const k = chaveVerbete('petit', 'Ils ont un petit chat.'); assert.equal(verbeteSalvo(k), null); guardarVerbete(k, v); assert.deepEqual(verbeteSalvo(k), v); assert.equal(totalVerbetes(), 1);
});

test('cache: guarda no máximo 400 verbetes, descartando os mais antigos, e aguenta dado quebrado', () => {
  const v = validarVerbete({ significados: ['x'] }); const real = Date.now; let t = 1000; Date.now = () => ++t;
  try { for (let i = 0; i < 405; i++) guardarVerbete(`p${i}|a`, v); } finally { Date.now = real; }
  assert.equal(totalVerbetes(), 400); assert.equal(verbeteSalvo('p0|a'), null, 'os primeiros saíram'); assert.ok(verbeteSalvo('p404|a'));
  localStorage.setItem('fr_dict_v1', '{lixo'); assert.equal(totalVerbetes(), 0); assert.equal(verbeteSalvo('p404|a'), null); guardarVerbete('a|b', v); assert.equal(totalVerbetes(), 1, 'recomeça limpo');
  localStorage.setItem('fr_dict_v1', JSON.stringify({ itens: 5 })); assert.equal(totalVerbetes(), 0);
});
