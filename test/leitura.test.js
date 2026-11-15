import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerJson, validarPagina, palavrasMarcadas, textoDaPalavra, chavesDaPalavra, acharPalavra, semMarcas } from '../js/leitura.js';

const boa = { fr: "Ils ont un petit chat.", pt: 'Eles têm um gatinho.', marcada: 'Il<s> on{t} un peti{t} cha{t}.', leitura: 'il-zõ ã pe-ti chá', regras: ['ligação: ils‿ont'], palavras: [{ fr: 'petit', pt: 'pequeno', uso: 'vem antes do substantivo' }], avancado: false };

test('lerJson: aceita JSON puro, com cerca de código ou com texto em volta, e recusa lixo', () => {
  assert.deepEqual(lerJson('{"frases":[]}'), { frases: [] });
  assert.deepEqual(lerJson('```json\n{"frases":[]}\n```'), { frases: [] });
  assert.deepEqual(lerJson('Aqui está: {"frases":[{"fr":"a"}]} pronto'), { frases: [{ fr: 'a' }] });
  assert.throws(() => lerJson('{"frases":[{"fr":"a"'), /incompleta/);
  assert.throws(() => lerJson(''), /incompleta/);
});

test('validarPagina: mantém frase, tradução, leitura, regras e palavras limpas', () => {
  const { frases } = validarPagina({ frases: [boa] }); const f = frases[0];
  assert.equal(f.fr, 'Ils ont un petit chat.'); assert.equal(f.marcada, 'Il<s> on{t} un peti{t} cha{t}.'); assert.equal(f.pt, 'Eles têm um gatinho.');
  assert.deepEqual(f.regras, ['ligação: ils‿ont']); assert.deepEqual(f.palavras, [{ fr: 'petit', pt: 'pequeno', uso: 'vem antes do substantivo' }]); assert.equal(f.avancado, false);
  assert.equal(validarPagina([boa]).frases.length, 1, 'também aceita a lista solta');
});

test('validarPagina: marcas que alteram o texto são descartadas (o texto da frase nunca muda)', () => {
  const casos = ['Il<s> on{t} un peti{t} cha{t}', 'Ils ont un gros chat.', 'Il<s> on{t un peti{t} cha{t}.', 'Il<s{x}> ont un petit chat.', 'Ils{ ont} un petit chat.'];
  for (const marcada of casos) assert.equal(validarPagina({ frases: [{ ...boa, marcada }] }).frases[0].marcada, boa.fr, marcada);
  assert.equal(validarPagina({ frases: [{ ...boa, marcada: undefined }] }).frases[0].marcada, boa.fr);
  assert.equal(validarPagina({ frases: [{ fr: "J’avais six ans.", marcada: "J'avai{s} six an{s}." }] }).frases[0].marcada, "J'avai{s} six an{s}.", 'apóstrofo tipográfico não conta como diferença');
});

test('validarPagina: limites e entradas ruins', () => {
  const muitas = Array.from({ length: 60 }, (_, i) => ({ fr: `Frase ${i}.`, regras: ['a', 'b', 'c', 'd', 'e'], palavras: Array.from({ length: 12 }, (__, k) => ({ fr: `p${k}`, pt: 'x' })), avancado: 'sim' }));
  const { frases } = validarPagina({ frases: muitas });
  assert.equal(frases.length, 40); assert.equal(frases[0].regras.length, 3); assert.equal(frases[0].palavras.length, 8); assert.equal(frases[0].avancado, false, 'só true de verdade conta');
  assert.equal(validarPagina({ frases: [null, 3, 'x', { fr: '' }, { fr: '  Salut  ' }] }).frases.length, 1);
  assert.equal(validarPagina({ frases: [{ fr: 'x'.repeat(2000) }] }).frases[0].fr.length, 600);
  for (const vazio of [{ frases: [] }, {}, null, 'texto', [{ fr: ' ' }]]) assert.throws(() => validarPagina(vazio), /não achou frases/);
});

test('palavrasMarcadas: separa palavras e tipos de trecho (normal, muda, ligação)', () => {
  const w = palavrasMarcadas('Il<s> on{t} un peti{t} cha{t}.');
  assert.deepEqual(w.map(textoDaPalavra), ['Ils', 'ont', 'un', 'petit', 'chat.']);
  assert.deepEqual(w[0], [{ t: 'Il', k: 'n' }, { t: 's', k: 'lg' }]); assert.deepEqual(w[1], [{ t: 'on', k: 'n' }, { t: 't', k: 'mu' }]);
  assert.deepEqual(w[4], [{ t: 'cha', k: 'n' }, { t: 't', k: 'mu' }, { t: '.', k: 'n' }]);
  assert.deepEqual(palavrasMarcadas('vou{s} <s>avez').map(textoDaPalavra), ['vous', 'savez'], 'marca colada a outra palavra não cria palavra nova sem espaço');
  assert.deepEqual(palavrasMarcadas('  a   b ').map(textoDaPalavra), ['a', 'b']); assert.deepEqual(palavrasMarcadas(''), []);
  assert.equal(semMarcas('Il<s> on{t}'), 'Ils ont');
});

test('acharPalavra: acha o significado ignorando maiúsculas, pontuação e o apóstrofo', () => {
  assert.deepEqual(chavesDaPalavra("J’avais,"), ["j'avais", 'avais']);
  const lista = [{ fr: 'avais', pt: 'tinha' }, { fr: 'Petit', pt: 'pequeno' }, { fr: "l'ami", pt: 'o amigo' }];
  assert.equal(acharPalavra(lista, "J'avais").pt, 'tinha'); assert.equal(acharPalavra(lista, 'petit,').pt, 'pequeno'); assert.equal(acharPalavra(lista, "l'ami").pt, 'o amigo');
  assert.equal(acharPalavra(lista, 'chat'), null); assert.equal(acharPalavra([], 'petit'), null);
});
