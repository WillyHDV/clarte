import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { isNative, hasPlugin, platform, selfTest, STORAGE_PLACES, BACKUP_DIR, BACKUP_FILE, canBackup, readBackupFile, writeBackupFile, listBackupFiles } from '../js/native.js';
import { fakeCapacitor } from './support/capacitor.js';

afterEach(() => { delete globalThis.Capacitor; });

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

test('arquivos de backup: grava em Documentos/Clarte, lê de volta e lista a pasta', async () => {
  const { arquivos, chamadas } = fakeCapacitor(); assert.equal(canBackup(), true);
  await writeBackupFile(BACKUP_FILE, '{"a":1}'); await writeBackupFile('clarte-backup-20261101-1000.json', '{}'); await writeBackupFile('outra-coisa.txt', 'x');
  assert.equal(arquivos.get(`DOCUMENTS:${BACKUP_DIR}/${BACKUP_FILE}`), '{"a":1}');
  assert.ok(chamadas.filter((c) => c[0] === 'write').every((c) => c[1].directory === 'DOCUMENTS' && c[1].encoding === 'utf8' && c[1].recursive === true));
  assert.equal(await readBackupFile(BACKUP_FILE), '{"a":1}');
  assert.deepEqual((await listBackupFiles()).sort(), ['clarte-backup-20261101-1000.json', BACKUP_FILE], 'só nomes de backup do Clarté');
});

test('arquivos de backup: arquivo ausente ou recusado vira null, e gravação que não confere falha', async () => {
  fakeCapacitor({ inicial: { [`DOCUMENTS:${BACKUP_DIR}/${BACKUP_FILE}`]: 'x' }, negarLeitura: [BACKUP_FILE] });
  assert.equal(await readBackupFile('nao-existe.json'), null); assert.equal(await readBackupFile(BACKUP_FILE), null, 'o Android recusou a leitura');
  fakeCapacitor({ leitura: 'outro texto' }); await assert.rejects(writeBackupFile(BACKUP_FILE, 'texto'), /não confere/);
  fakeCapacitor({ quebra: ['DOCUMENTS'] }); await assert.rejects(writeBackupFile(BACKUP_FILE, 'texto'), /Permission denied/);
});

test('fora do app não há backup em arquivo', async () => {
  assert.equal(canBackup(), false); fakeCapacitor({ native: false }); assert.equal(canBackup(), false);
  fakeCapacitor({ plugins: [] }); assert.equal(canBackup(), false);
  fakeCapacitor({ quebra: [] }); delete globalThis.Capacitor.Plugins.Filesystem.readdir; assert.deepEqual(await listBackupFiles(), [], 'pasta ilegível não derruba nada');
});

test('Documentos é o primeiro lugar e o único marcado como durável', () => {
  assert.equal(STORAGE_PLACES[0].dir, 'DOCUMENTS'); assert.deepEqual(STORAGE_PLACES.filter((p) => p.dura).map((p) => p.dir), ['DOCUMENTS']); assert.equal(BACKUP_DIR, 'Clarte');
});
