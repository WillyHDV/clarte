import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { isNative, hasPlugin, platform, selfTest, STORAGE_PLACES, BACKUP_DIR } from '../js/native.js';

afterEach(() => { delete globalThis.Capacitor; });

// Capacitor de mentira: o que o app Android injeta na página. `quebra` lista os diretórios em que a gravação falha.
function fakeCapacitor({ plugins = ['Filesystem', 'Share'], quebra = [], native = true, leitura } = {}) {
  const arquivos = new Map(); const chamadas = [];
  const key = (a) => `${a.directory}:${a.path}`;
  const Filesystem = {
    async writeFile(a) { chamadas.push(['write', a]); if (quebra.includes(a.directory)) throw new Error(`Permission denied (${a.directory})`); arquivos.set(key(a), a.data); return { uri: 'file:///x' }; },
    async readFile(a) { chamadas.push(['read', a]); return { data: leitura !== undefined ? leitura : arquivos.get(key(a)) }; },
    async deleteFile(a) { chamadas.push(['delete', a]); arquivos.delete(key(a)); },
  };
  globalThis.Capacitor = {
    isNativePlatform: () => native, getPlatform: () => (native ? 'android' : 'web'), isPluginAvailable: (n) => plugins.includes(n),
    Plugins: { Filesystem, Share: { canShare: async () => ({ value: true }) } },
  };
  return { arquivos, chamadas };
}

test('fora do app (site ou navegador) nada é nativo e o teste explica', async () => {
  assert.equal(isNative(), false); assert.equal(hasPlugin('Filesystem'), false); assert.equal(platform(), 'web');
  const r = await selfTest(); assert.equal(r.length, 1); assert.equal(r[0].estado, 'warn'); assert.match(r[0].detalhe, /site ou no navegador/);
});

test('Capacitor presente mas na web (não nativo) também conta como fora do app', async () => {
  fakeCapacitor({ native: false }); assert.equal(isNative(), false); assert.equal((await selfTest())[0].estado, 'warn');
});

test('objeto Capacitor quebrado não derruba o app', () => {
  globalThis.Capacitor = { isNativePlatform() { throw new Error('boom'); }, isPluginAvailable() { throw new Error('boom'); } };
  assert.equal(isNative(), false); assert.equal(hasPlugin('Filesystem'), false);
  globalThis.Capacitor = {}; assert.equal(isNative(), false);
});

test('app Android completo: grava, lê e apaga em cada lugar, e diz quais sobrevivem à desinstalação', async () => {
  const { arquivos, chamadas } = fakeCapacitor(); const r = await selfTest();
  assert.equal(r[0].nome, 'App nativo'); assert.match(r[0].detalhe, /android/);
  assert.ok(r.every((l) => l.estado === 'ok'), JSON.stringify(r.filter((l) => l.estado !== 'ok')));
  const doc = r.find((l) => /Documentos/.test(l.nome)); assert.match(doc.detalhe, /sobrevive à desinstalação/);
  assert.match(r.find((l) => /dados internos/.test(l.nome)).detalhe, /some ao desinstalar/);
  assert.equal(arquivos.size, 0, 'o arquivo de teste é apagado no fim');
  const escritas = chamadas.filter((c) => c[0] === 'write'); assert.deepEqual(escritas.map((c) => c[1].directory), STORAGE_PLACES.map((p) => p.dir));
  assert.ok(escritas.every((c) => c[1].path === `${BACKUP_DIR}/teste.txt` && c[1].encoding === 'utf8' && c[1].recursive === true));
  assert.ok(r.some((l) => l.nome === 'Compartilhar arquivos' && l.estado === 'ok'));
});

test('falha ao gravar em Documentos vira aviso (não erro) e o motivo aparece', async () => {
  fakeCapacitor({ quebra: ['DOCUMENTS'] }); const r = await selfTest();
  const doc = r.find((l) => /Documentos/.test(l.nome)); assert.equal(doc.estado, 'warn'); assert.match(doc.detalhe, /Permission denied \(DOCUMENTS\)/);
  assert.equal(r.find((l) => /dados internos/.test(l.nome)).estado, 'ok', 'os outros lugares continuam sendo testados');
});

test('falha nos dados internos é erro de verdade', async () => {
  fakeCapacitor({ quebra: ['DATA'] }); const r = await selfTest(); assert.equal(r.find((l) => /dados internos/.test(l.nome)).estado, 'fail');
});

test('conteúdo lido diferente do gravado é avisado', async () => {
  fakeCapacitor({ leitura: 'outro texto' }); const r = await selfTest();
  assert.ok(r.filter((l) => /^Gravar em/.test(l.nome)).every((l) => l.estado === 'warn' && /não bate/.test(l.detalhe)));
});

test('sem o plugin de arquivos a ponte não chegou: erro claro e o teste para', async () => {
  fakeCapacitor({ plugins: [] }); const r = await selfTest();
  assert.ok(r.filter((l) => /^Plugin/.test(l.nome)).every((l) => l.estado === 'fail' && /ponte nativa não chegou/.test(l.detalhe)));
  assert.ok(!r.some((l) => /^Gravar/.test(l.nome)));
});

test('Documentos é o primeiro lugar e o único marcado como durável', () => {
  assert.equal(STORAGE_PLACES[0].dir, 'DOCUMENTS'); assert.deepEqual(STORAGE_PLACES.filter((p) => p.dura).map((p) => p.dir), ['DOCUMENTS']); assert.equal(BACKUP_DIR, 'Clarte');
});
