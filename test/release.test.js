// Verificações de publicação: coisas que já quebraram (ou poderiam quebrar) o app no ar sem aparecer em nenhum exercício.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION, BUILD_DATE } from '../js/version.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
// todos os .js do app (js/ e content/), com barras normais
const walk = (dir) => readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : e.name.endsWith('.js') ? [`${dir}/${e.name}`] : []));
const jsFiles = [...walk('js'), ...walk('content')];
// arquivos alcançados por import a partir de uma entrada (estático ou dinâmico)
function reach(entry) {
  const seen = new Set();
  const visit = (f) => { if (seen.has(f)) return; seen.add(f); if (!existsSync(join(root, f))) return; for (const m of read(f).matchAll(/(?:from|import)\s*\(?\s*'(\.[^']+)'/g)) visit(posix.join(posix.dirname(f), m[1])); };
  visit(entry); return seen;
}

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

test('todo arquivo que o app importa existe e está na lista offline (senão falha sem internet)', () => {
  const graph = reach('js/app.js'); const sw = read('sw.js');
  assert.ok(graph.size > 10, 'não consegui seguir os imports a partir de js/app.js');
  for (const f of graph) { assert.ok(existsSync(join(root, f)), `um módulo importa ${f}, que não existe`); assert.ok(sw.includes(`'${f}'`), `${f} é importado pelo app mas não está em ASSETS de sw.js`); }
});

test('a lista offline não guarda módulos que ninguém importa', () => {
  const graph = reach('js/app.js'); const list = /const ASSETS = \[([^\]]+)\]/.exec(read('sw.js'));
  for (const a of [...list[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((x) => x.endsWith('.js'))) assert.ok(graph.has(a), `ASSETS lista ${a}, mas o app não o importa`);
});

test('todos os arquivos JS têm sintaxe válida', () => {
  for (const f of [...jsFiles, 'sw.js']) execFileSync(process.execPath, ['--check', join(root, f)], { stdio: 'pipe' });
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

test('arquitetura: telas não importam umas às outras; a base não conhece as telas', () => {
  const imports = (f) => [...read(f).matchAll(/from '(\.[^']+)'/g)].map((m) => posix.join(posix.dirname(f), m[1]));
  const tolerado = new Set(['js/screens/tutor.js>js/screens/practice.js']); // só a lista de acentos (ACC)
  for (const f of jsFiles.filter((x) => x.startsWith('js/screens/'))) {
    for (const alvo of imports(f)) {
      if (alvo.startsWith('js/screens/')) assert.ok(tolerado.has(`${f}>${alvo}`), `${f} importa outra tela (${alvo}): leve o que é comum para js/core.js ou js/progress.js`);
      assert.notEqual(alvo, 'js/app.js', `${f} importa app.js`);
    }
  }
  for (const f of ['js/core.js', 'js/progress.js', 'js/update.js', 'js/data.js', 'js/exercises.js', 'js/store.js', 'js/tutor.js', 'js/speech.js']) {
    for (const alvo of imports(f)) assert.ok(!alvo.startsWith('js/screens/') && alvo !== 'js/app.js', `${f} (base) importa ${alvo}`);
  }
  assert.ok(jsFiles.some((f) => f.startsWith('js/screens/')), 'não achei js/screens/');
});
