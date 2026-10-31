import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNITS } from '../js/data.js';
import { buildSession, check, speakScore, skillsFor, unitItems, itemLabel, norm, stripAcc } from '../js/exercises.js';

const KINDS = new Set(['choice', 'listen-choice', 'type', 'listen-type', 'tiles', 'speak']);
const unitIds = UNITS.map((u) => u.id);
const universe = new Set(unitIds.flatMap((u) => unitItems(u)));

// várias sessões de cada unidade, para pegar problemas que só aparecem em sorteios raros
const sessions = unitIds.flatMap((u) => Array.from({ length: 25 }, () => ({ u, list: buildSession(u, 10) })));
const all = sessions.flatMap((s) => s.list);

test('normalização de texto', () => {
  assert.equal(norm('  Je  m’appelle, Willy ! '), "je m'appelle willy");
  assert.equal(stripAcc('Maceió à é ç'), 'Maceio a e c');
});

test('check: escolha, digitação, acento e peças', () => {
  assert.equal(check({ kind: 'choice', answer: 'a' }, 'a').ok, true);
  assert.equal(check({ kind: 'choice', answer: 'a' }, 'b').ok, false);
  const t = { kind: 'type', answer: "J'habite à Maceió." };
  assert.deepEqual(check(t, "j'habite à maceió"), { ok: true });
  assert.deepEqual(check(t, "j'habite a maceio"), { ok: true, almost: true }); // acento errado: certo, mas avisa
  assert.equal(check(t, 'je habite a maceio').ok, false);
  assert.equal(check({ kind: 'tiles', answer: ['Vous parlez français'] }, ['Vous', 'parlez', 'français']).ok, true);
  assert.equal(check({ kind: 'tiles', answer: ['Vous parlez français'] }, ['parlez', 'Vous', 'français']).ok, false);
});

test('speakScore: nota de repetição pelas palavras reconhecidas', () => {
  assert.equal(speakScore("J'habite à Maceió.", "j'habite a maceio").score, 1);
  assert.equal(speakScore('Je ne parle pas chinois', 'je parle chinois').ok, false);
  const r = speakScore('Je ne comprends pas', 'je ne comprend pas'); // 1 letra de diferença em palavra longa ainda conta
  assert.equal(r.ok, true);
  assert.equal(speakScore('Bonjour', '').score, 0);
});

test('todas as unidades geram sessões completas', () => {
  for (const { u, list } of sessions) assert.equal(list.length, 10, `unidade ${u} devolveu ${list.length} exercícios`);
});

test('todo exercício tem os campos obrigatórios', () => {
  for (const ex of all) {
    assert.ok(KINDS.has(ex.kind), `tipo desconhecido: ${ex.kind}`);
    assert.ok(ex.key && typeof ex.key === 'string', 'sem key');
    assert.ok(typeof ex.q === 'string' && ex.q.length > 0, `sem enunciado em ${ex.key}`);
    assert.ok(ex.answer !== undefined && ex.answer !== '' && !(Array.isArray(ex.answer) && !ex.answer.length), `sem resposta em ${ex.key}`);
    assert.ok(Array.isArray(ex.items), `items ausente em ${ex.key}`);
    assert.ok(unitIds.includes(ex.unit), `unidade inválida: ${ex.unit}`);
  }
});

test('múltipla escolha: a resposta está entre as opções e não há opções repetidas', () => {
  for (const ex of all.filter((e) => e.kind === 'choice' || e.kind === 'listen-choice')) {
    assert.ok(Array.isArray(ex.options) && ex.options.length >= 2, `opções insuficientes em ${ex.key}`);
    assert.ok(ex.options.includes(ex.answer), `resposta fora das opções em ${ex.key}`);
    assert.equal(new Set(ex.options).size, ex.options.length, `opções repetidas em ${ex.key}`);
  }
});

test('peças (tiles): contêm todas as palavras da resposta, com no máximo 2 peças de distração', () => {
  const tiles = all.filter((e) => e.kind === 'tiles'); assert.ok(tiles.length > 50, 'poucos exercícios de peças na amostra');
  const words = (a) => norm(a).split(' ').filter(Boolean);
  for (const ex of tiles) {
    const pool = ex.tiles.map((t) => norm(t));
    const ok = [].concat(ex.answer).some((a) => {
      const left = [...pool]; // cada palavra da resposta consome uma peça
      for (const w of words(a)) { const i = left.indexOf(w); if (i < 0) return false; left.splice(i, 1); }
      return left.length <= 2;
    });
    assert.ok(ok, `peças não montam a resposta (ou há distração demais) em ${ex.key}: [${ex.tiles.join(' | ')}]`);
  }
});

test('a resposta de cada exercício é aceita pela própria correção', () => {
  for (const ex of all) {
    if (ex.kind === 'speak') { assert.equal(check(ex, [].concat(ex.answer)[0]).ok, true, `fala sem aceitar a própria resposta: ${ex.key}`); continue; }
    if (ex.kind === 'tiles') { assert.equal(check(ex, [].concat(ex.answer)[0].split(' ')).ok, true, `peças: ${ex.key}`); continue; }
    if (ex.kind === 'choice' || ex.kind === 'listen-choice') { assert.equal(check(ex, ex.answer).ok, true, ex.key); continue; }
    assert.equal(check(ex, [].concat(ex.answer)[0]).ok, true, `digitação sem aceitar a própria resposta: ${ex.key}`);
  }
});

test('sem textos quebrados nos exercícios', () => {
  const bad = /undefined|NaN|\[object|\bnull\b/;
  for (const ex of all) {
    const shown = [ex.q, ex.shown, ex.explain].filter((x) => typeof x === 'string');
    // o que é falado, comparado ou escolhido não pode ter espaço duplo (o enunciado e a explicação podem, ex.: «tu  ↔  vous»)
    const spoken = [ex.audio, ...[].concat(ex.answer), ...(ex.options || []), ...(ex.tiles || [])].filter((x) => typeof x === 'string');
    for (const t of [...shown, ...spoken]) assert.ok(!bad.test(t.replace(/<[^>]+>/g, '')), `texto quebrado em ${ex.key}: «${t}»`);
    for (const t of spoken) assert.ok(!/\s{2,}|^\s|\s$/.test(t), `espaço sobrando em ${ex.key}: «${t}»`);
  }
});

test('gramática: elisão e artigos nas respostas geradas', () => {
  const V = 'aeiouyhàâäéèêëîïôöùûüœ';
  const rules = [
    [new RegExp(`\\bje [${V}]`, 'i'), 'je + vogal deve ser j\''],
    [new RegExp(`\\bne [${V}]`, 'i'), 'ne + vogal deve ser n\''],
    [new RegExp(`\\bque [${V}]`, 'i'), 'que + vogal deve ser qu\''],
    [new RegExp(`\\best-ce que [${V}]`, 'i'), 'est-ce que + vogal deve ser est-ce qu\''],
    [new RegExp(`\\ble [${V}]`, 'i'), 'le + vogal deve ser l\' (ou a palavra começa com h aspirado)'],
  ];
  for (const ex of all.filter((e) => e.kind === 'type' || e.kind === 'tiles' || e.kind === 'speak')) {
    for (const a of [].concat(ex.answer)) for (const [re, msg] of rules) {
      if (re.test(a) && !/\bh[aeiou]/i.test(a.match(re)[0])) assert.fail(`${msg}: «${a}» (${ex.key})`);
    }
  }
});

test('itens de domínio: todo item citado por um exercício existe no universo da unidade', () => {
  const lost = new Set();
  for (const ex of all) for (const id of ex.items) if (!universe.has(id)) lost.add(`${ex.unit}: ${id}`);
  assert.deepEqual([...lost], [], 'itens fora do universo nunca contam para o domínio');
});

test('todo item do universo tem um nome legível', () => {
  for (const id of universe) {
    const label = itemLabel(id);
    assert.ok(typeof label === 'string' && label.length > 0 && label !== 'undefined', `sem nome para ${id}`);
  }
});

test('o universo não repete itens e tem tamanho razoável', () => {
  for (const u of unitIds) {
    const items = unitItems(u);
    assert.ok(items.length >= 5, `unidade ${u} com poucos itens`);
    assert.equal(new Set(items).size, items.length, `itens repetidos em ${u}`);
  }
});

test('sessão "mix" mistura unidades e respeita o tipo pedido', () => {
  const mix = buildSession('mix', 12);
  assert.equal(mix.length, 12);
  assert.ok(new Set(mix.map((e) => e.unit)).size >= 3, 'mix deveria misturar ao menos 3 unidades');
  for (const ex of buildSession('mix', 8, () => 0.3, { kinds: ['speak'] })) assert.equal(ex.kind, 'speak');
});

test('a sessão prioriza itens fracos', () => {
  const weakest = unitItems('verbes').find((i) => i.startsWith('verb:parler:'));
  let hits = 0; let base = 0;
  for (let n = 0; n < 30; n++) {
    hits += buildSession('verbes', 10, (id) => (id === weakest ? 0 : 0.9)).filter((e) => e.items.includes(weakest)).length;
    base += buildSession('verbes', 10, () => 0.5).filter((e) => e.items.includes(weakest)).length;
  }
  assert.ok(hits > base, `item fraco apareceu ${hits}× contra ${base}× sem prioridade`);
});

test('competências (critérios da prova) por tipo de exercício', () => {
  assert.deepEqual(skillsFor({ kind: 'listen-choice', unit: 'comm' }, { ok: true }), [['compreensao', 1], ['vocabulario', 1]]);
  assert.deepEqual(skillsFor({ kind: 'type', unit: 'verbes' }, { ok: false }), [['gramatica', 0]]);
  assert.deepEqual(skillsFor({ kind: 'speak', unit: 'comm' }, { ok: true, score: 0.8 }), [['pronuncia', 0.8]]);
});
