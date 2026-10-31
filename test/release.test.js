// Verificações de publicação: coisas que já quebraram (ou poderiam quebrar) o app no ar sem aparecer em nenhum exercício.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION, BUILD_DATE } from '../js/version.js';
import { UNITS, LESSONS, EXAM_DATE, PHRASES, VERBS, PRONOUNS, JOBS, NATS, LETTERS } from '../js/data.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const jsFiles = readdirSync(join(root, 'js')).filter((f) => f.endsWith('.js')).map((f) => `js/${f}`);

test('a versão do app e o cache do service worker andam juntos', () => {
  assert.match(VERSION, /^\d+$/);
  assert.match(BUILD_DATE, /^\d{4}-\d{2}-\d{2}$/);
  const cache = /const CACHE = 'fr-v(\d+)'/.exec(read('sw.js'));
  assert.ok(cache, 'sw.js sem CACHE no formato fr-vN');
  assert.equal(cache[1], VERSION, `js/version.js diz v${VERSION}, mas sw.js usa fr-v${cache[1]}: sem isso o celular pode ficar com arquivos velhos`);
});

test('todo arquivo da lista offline do service worker existe', () => {
  const list = /const ASSETS = \[([^\]]+)\]/.exec(read('sw.js'));
  const assets = [...list[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  for (const a of assets) assert.ok(existsSync(join(root, a === './' ? 'index.html' : a)), `ASSETS cita ${a}, que não existe`);
});

test('todo módulo JS está na lista offline (senão o app falha sem internet)', () => {
  const sw = read('sw.js');
  for (const f of jsFiles) assert.ok(sw.includes(`'${f}'`), `${f} não está em ASSETS de sw.js`);
});

test('todos os arquivos JS têm sintaxe válida', () => {
  for (const f of [...jsFiles, 'sw.js']) execFileSync(process.execPath, ['--check', join(root, f)], { stdio: 'pipe' });
});

test('os imports entre módulos apontam para arquivos que existem', () => {
  for (const f of jsFiles) for (const m of read(f).matchAll(/from '(\.[^']+)'/g)) assert.ok(existsSync(join(root, 'js', m[1])), `${f} importa ${m[1]}, que não existe`);
});

test('index.html e manifest apontam para arquivos existentes', () => {
  const html = read('index.html');
  for (const m of html.matchAll(/(?:href|src)="(?!https?:|#|data:)([^"?#]+)/g)) assert.ok(existsSync(join(root, m[1])), `index.html cita ${m[1]}`);
  const man = JSON.parse(read('manifest.webmanifest'));
  assert.ok(man.name && man.start_url && man.icons.length, 'manifest incompleto');
  for (const i of man.icons) assert.ok(existsSync(join(root, i.src)), `ícone ${i.src} não existe`);
});

test('nenhuma chave de API no código versionado', () => {
  const files = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter((f) => f && !/\.(png|jpg|ico|woff2?)$/.test(f));
  const re = /AIza[0-9A-Za-z_-]{30,}|gsk_[0-9A-Za-z]{30,}|\bsk-[0-9A-Za-z]{30,}/;
  for (const f of files) if (existsSync(join(root, f))) assert.ok(!re.test(read(f)), `possível chave de API em ${f}`);
});

test('material do curso e livros não vão para o repositório', () => {
  const files = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n');
  const bad = files.filter((f) => /\.(pdf|epub|mp4|mov|mkv)$/i.test(f) || /^fontes\//.test(f));
  assert.deepEqual(bad, []);
});

test('conteúdo: toda unidade tem aula, e a data da prova é válida', () => {
  for (const u of UNITS) assert.ok(LESSONS[u.id] && LESSONS[u.id].length > 200, `unidade ${u.id} sem aula`);
  assert.equal(new Set(UNITS.map((u) => u.id)).size, UNITS.length);
  assert.ok(!Number.isNaN(new Date(`${EXAM_DATE}T12:00:00`).getTime()));
});

test('conteúdo: frases, verbos, profissões e nacionalidades completos', () => {
  for (const [set, list] of Object.entries(PHRASES)) {
    assert.ok(list.length > 0, `grupo ${set} vazio`);
    const seen = new Set();
    for (const p of list) { assert.ok(p.fr && p.pt, `frase incompleta em ${set}`); assert.ok(!seen.has(p.fr), `frase repetida em ${set}: ${p.fr}`); seen.add(p.fr); }
  }
  for (const [inf, v] of Object.entries(VERBS)) { assert.equal(v.forms.length, PRONOUNS.length, `${inf} sem as 6 formas`); assert.ok(v.pt); }
  for (const j of JOBS) assert.ok(j.m && j.f, `profissão incompleta: ${JSON.stringify(j)}`);
  for (const n of NATS) assert.ok(n.m && n.f, `nacionalidade incompleta: ${JSON.stringify(n)}`);
  assert.equal(Object.keys(LETTERS).length, 26);
});

test('as aulas só usam marcadores {{…}} que o app sabe desenhar (os desconhecidos somem sem aviso)', () => {
  const app = read('js/app.js'); const fn = app.slice(app.indexOf('function renderLesson'));
  const exact = new Set([...fn.matchAll(/t === '(\w+)'/g)].map((m) => m[1]));
  const prefixed = new Set([...fn.matchAll(/t\.startsWith\('(\w+):'\)/g)].map((m) => m[1]));
  assert.ok(exact.size >= 6 && prefixed.has('say') && prefixed.has('phrases'), 'não consegui ler os marcadores do renderLesson');
  for (const [id, html] of Object.entries(LESSONS)) {
    for (const m of html.matchAll(/\{\{(.+?)\}\}/g)) {
      const [name, arg] = m[1].split(/:(.*)/s);
      assert.ok(exact.has(m[1]) || (prefixed.has(name) && arg !== undefined), `aula ${id} usa marcador desconhecido {{${m[1]}}}`);
      if (name === 'phrases') assert.ok(PHRASES[arg], `aula ${id}: {{phrases:${arg}}} não existe em PHRASES`);
    }
  }
});

test('as aulas têm HTML equilibrado', () => {
  for (const [id, html] of Object.entries(LESSONS)) {
    for (const tag of ['ul', 'ol', 'p', 'div', 'table']) assert.equal((html.match(new RegExp(`<${tag}[ >]`, 'g')) || []).length, (html.match(new RegExp(`</${tag}>`, 'g')) || []).length, `aula ${id}: <${tag}> sem fechar`);
  }
});
