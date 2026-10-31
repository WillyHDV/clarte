import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import pack from '../content/fb1/pack.js';
import { validatePack } from '../content/validate.js';
import * as D from '../js/data.js';
import { unitItems, buildSession } from '../js/exercises.js';

test('o pacote fb1 é válido', () => {
  assert.deepEqual(validatePack(pack), []);
});

test('o pacote é só dados: sobrevive a JSON sem perder nada', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(pack)), pack);
});

test('data.js entrega cada parte do pacote com os nomes que o app usa', () => {
  const map = { EXAM_DATE: 'examDate', UNITS: 'units', LESSONS: 'lessons', LETTERS: 'letters', ACCENTS: 'accents', NAMES: 'names', PHRASES: 'phrases', PROFILES: 'profiles', VIDEO_TV: 'videoTv', TUVOUS: 'tuvous', SITUATIONS: 'situations', PRONOUNS: 'pronouns', VERBS: 'verbs', NATS: 'nats', LANGS: 'langs', CITIES: 'cities', QUARTIERS: 'quartiers', JOBS: 'jobs', STATEMENTS: 'statements', QWORDS: 'qwords' };
  for (const [name, key] of Object.entries(map)) assert.equal(D[name], pack[key], `${name} deveria ser pack.${key}`);
  const meta = new Set(['schema', 'id', 'title', 'version']);
  const unused = Object.keys(pack).filter((k) => !meta.has(k) && !Object.values(map).includes(k));
  assert.deepEqual(unused, [], 'partes do pacote que data.js não entrega');
});

test('cada unidade do pacote tem gerador de exercícios no código', () => {
  for (const u of pack.units) {
    assert.ok(unitItems(u.id).length > 0, `unidade ${u.id} sem itens de domínio`);
    assert.equal(buildSession(u.id, 5).length, 5, `unidade ${u.id} não gerou exercícios`);
  }
});

test('o validador reprova defeitos de conteúdo (cada regra é testada)', () => {
  const casos = {
    'aula faltando': [(p) => { delete p.lessons.comm; }, /lessons\.comm/],
    'aula sem unidade': [(p) => { p.lessons.fantasma = '<p>'.repeat(100); }, /lessons\.fantasma/],
    'ordem da trilha': [(p) => { p.units[2].n = 9; }, /units\[2\]\.n/],
    'unidade repetida': [(p) => { p.units[1].id = 'alphabet'; }, /repetido/],
    'verbo sem uma forma': [(p) => { p.verbs.parler.forms.pop(); }, /verbs\.parler\.forms/],
    'frase repetida': [(p) => { p.phrases.comm.push({ ...p.phrases.comm[0] }); }, /repetida/],
    'frase sem tradução': [(p) => { p.phrases.comm[0].pt = ''; }, /phrases\.comm\[0\]/],
    'espaço sobrando em francês': [(p) => { p.phrases.saluer[0].fr += ' '; }, /phrases\.saluer\[0\]/],
    'alfabeto incompleto': [(p) => { delete p.letters.Z; }, /26 letras/],
    'data da prova inválida': [(p) => { p.examDate = '2026-13-45'; }, /examDate/],
    'registro tu/vous inválido': [(p) => { p.videoTv[0].reg = 'toi'; }, /videoTv\[0\]\.reg/],
    'situação com errada igual à certa': [(p) => { p.situations[0].wrong = p.situations[0].fr; }, /situations\[0\]\.wrong/],
    'profissão sem feminino': [(p) => { delete p.jobs[3].f; }, /jobs\[3\]\.f/],
    'nacionalidade repetida': [(p) => { p.nats.push({ ...p.nats[0] }); }, /nats\[\d+\]: m repetido/],
    'pergunta sem lacuna': [(p) => { p.qwords[0].q = 'Où habitez-vous ?'; }, /qwords\[0\]\.q/],
    'resposta da lacuna diferente': [(p) => { p.qwords[0].ans = 'Qui'; }, /qwords\[0\]\.ans/],
    'perfil com gênero inválido': [(p) => { p.profiles[0].g = 'x'; }, /profiles\[0\]\.g/],
    'texto "undefined"': [(p) => { p.tuvous[0].tu = 'Tu undefined ?'; }, /tuvous\[0\]\.tu/],
    'schema desconhecido': [(p) => { p.schema = 2; }, /schema/],
  };
  for (const [nome, [quebra, esperado]] of Object.entries(casos)) {
    const p = structuredClone(pack); quebra(p);
    const problemas = validatePack(p);
    assert.ok(problemas.some((x) => esperado.test(x)), `"${nome}" não foi detectado. Problemas: ${JSON.stringify(problemas)}`);
  }
});

test('o validador não aceita lixo no lugar do pacote', () => {
  for (const lixo of [null, undefined, 3, 'x', []]) assert.ok(validatePack(lixo).length > 0);
  assert.ok(validatePack({}).length > 5);
});

// ---- aulas: marcadores e HTML ----
test('as aulas só usam marcadores {{…}} que o app sabe desenhar (os desconhecidos somem sem aviso)', () => {
  const app = readFileSync(new URL('../js/screens/lesson.js', import.meta.url), 'utf8'); const fn = app.slice(app.indexOf('function renderLesson'));
  const exact = new Set([...fn.matchAll(/t === '(\w+)'/g)].map((m) => m[1]));
  const prefixed = new Set([...fn.matchAll(/t\.startsWith\('(\w+):'\)/g)].map((m) => m[1]));
  assert.ok(exact.size >= 6 && prefixed.has('say') && prefixed.has('phrases'), 'não consegui ler os marcadores do renderLesson');
  for (const [id, html] of Object.entries(pack.lessons)) {
    for (const m of html.matchAll(/\{\{(.+?)\}\}/g)) {
      const [name, arg] = m[1].split(/:(.*)/s);
      assert.ok(exact.has(m[1]) || (prefixed.has(name) && arg !== undefined), `aula ${id} usa marcador desconhecido {{${m[1]}}}`);
      if (name === 'phrases') assert.ok(pack.phrases[arg], `aula ${id}: {{phrases:${arg}}} não existe em phrases`);
    }
  }
});

test('as aulas têm HTML equilibrado', () => {
  for (const [id, html] of Object.entries(pack.lessons)) {
    for (const tag of ['ul', 'ol', 'p', 'div', 'table', 'h3', 'small', 'b', 'i']) {
      assert.equal((html.match(new RegExp(`<${tag}[ >]`, 'g')) || []).length, (html.match(new RegExp(`</${tag}>`, 'g')) || []).length, `aula ${id}: <${tag}> sem fechar`);
    }
  }
});

test('o material do curso não é copiado para as aulas (só resumos e fontes citadas)', () => {
  for (const [id, html] of Object.entries(pack.lessons)) assert.ok(html.length < 12000, `aula ${id} com ${html.length} caracteres: parece texto copiado`);
});
