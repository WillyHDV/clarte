import './support/storage.js';
import './support/window.js';
import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { fakeCapacitor } from './support/capacitor.js';
import * as S from '../js/store.js';
import * as A from '../js/autobackup.js';
import { BACKUP_FILE, BACKUP_PREV, BACKUP_DIR } from '../js/native.js';

const P = (nome) => `DOCUMENTS:${BACKUP_DIR}/${nome}`;
const hoje = new Date(2026, 10, 1, 10); let agora = hoje.getTime();
let cap;
beforeEach(() => { S.resetAll(); localStorage.clear(); cap = fakeCapacitor(); agora = hoje.getTime(); mock.method(Date, 'now', () => agora); });
afterEach(() => { mock.restoreAll(); delete globalThis.Capacitor; });
const estudar = (pontos = 40) => { S.addXp(pontos); };
const noArquivo = (nome = BACKUP_FILE) => JSON.parse(cap.arquivos.get(P(nome)));
// um backup "de outro dia" já salvo em Documentos
const guardado = (xp, quando, nome = BACKUP_FILE) => {
  const d = S.exportData({ mark: false }); d.state.xp = xp; d.exportedAt = quando; cap.arquivos.set(P(nome), JSON.stringify(d));
};

test('fora do app Android o backup automático não faz nada', async () => {
  delete globalThis.Capacitor; estudar();
  assert.equal(A.disponivel(), false); assert.equal((await A.autoBackup()).estado, 'indisponivel'); assert.equal(await A.findBackup(), null); assert.deepEqual(await A.diagnose(), []);
});

test('app vazio não grava (não pisa em um backup antigo); com progresso, grava sem a chave de IA', async () => {
  S.setKey('gemini', 'segredo-123');
  assert.equal((await A.autoBackup()).estado, 'vazio'); assert.equal(cap.arquivos.size, 0);
  estudar(40); const r = await A.autoBackup(); assert.equal(r.estado, 'ok'); assert.equal(r.nome, BACKUP_FILE);
  const b = noArquivo(); assert.equal(b.app, 'clarte'); assert.equal(b.state.xp, 40); assert.deepEqual(b.state.settings.keys, {}, 'a chave de IA não vai para Documentos');
  assert.ok(![...cap.arquivos.values()].some((t) => t.includes('segredo-123')));
  assert.ok(S.get().lastBackup, 'conta como backup feito (some o lembrete na tela inicial)'); assert.equal(S.validateBackup(b), '');
});

test('sem mudanças não regrava; mudança dentro de 2 minutos espera, ao sair do app grava na hora', async () => {
  estudar(40); assert.equal((await A.autoBackup()).estado, 'ok'); const escritas = () => cap.chamadas.filter((c) => c[0] === 'write').length; const n = escritas();
  assert.equal((await A.autoBackup()).estado, 'sem-mudancas'); assert.equal(escritas(), n);
  estudar(10); agora += 30000; assert.equal((await A.autoBackup()).estado, 'cedo'); assert.equal(noArquivo().state.xp, 40);
  assert.equal((await A.autoBackup({ urgent: true })).estado, 'ok'); assert.equal(noArquivo().state.xp, 50);
  estudar(5); agora += 3 * 60000; assert.equal((await A.autoBackup()).estado, 'ok'); assert.equal(noArquivo().state.xp, 55);
});

test('desligado em Ajustes não grava; "Fazer agora" (force) grava mesmo assim', async () => {
  estudar(); S.setSetting('autoBackup', false);
  assert.equal(A.ligado(), false); assert.equal((await A.autoBackup()).estado, 'desligado'); assert.equal(cap.arquivos.size, 0); assert.match(A.statusText(), /Desligado/);
  assert.equal((await A.autoBackup({ force: true })).estado, 'ok'); assert.equal(noArquivo().state.xp, 40);
});

test('o backup de outro dia vira "anterior"; no mesmo dia não', async () => {
  guardado(30, new Date(2020, 0, 1, 20).toISOString()); estudar(40); // "outro dia" bem distante: exportData usa o relógio real, não o simulado
  assert.equal((await A.autoBackup()).estado, 'ok'); assert.equal(noArquivo(BACKUP_PREV).state.xp, 30, 'a cópia de ontem ficou guardada'); assert.equal(noArquivo().state.xp, 40);
  estudar(5); agora += 3 * 60000; await A.autoBackup(); assert.equal(noArquivo(BACKUP_PREV).state.xp, 30, 'no mesmo dia a anterior continua a de ontem'); assert.equal(noArquivo().state.xp, 45);
});

test('nunca troca um backup por outro com menos pontos, a menos que seja forçado', async () => {
  guardado(500, new Date(2026, 9, 31, 20).toISOString()); estudar(20);
  const r = await A.autoBackup(); assert.equal(r.estado, 'maior'); assert.equal(r.xp, 500); assert.equal(noArquivo().state.xp, 500, 'o backup rico continua intacto');
  assert.match(A.statusText(), /Pausado.*500/);
  assert.equal((await A.autoBackup({ force: true })).estado, 'ok'); assert.equal(noArquivo().state.xp, 20);
});

test('findBackup/richerBackup: acham o mais recente legível e só oferecem se tem mais pontos', async () => {
  guardado(80, new Date(2026, 9, 30, 9).toISOString(), BACKUP_PREV); guardado(120, new Date(2026, 9, 31, 9).toISOString());
  cap.arquivos.set(P('clarte-backup-lixo.json'), '{ isto não é json'); cap.arquivos.set(P('clarte-backup-outro.json'), JSON.stringify({ app: 'outro' }));
  const b = await A.findBackup(); assert.equal(b.nome, BACKUP_FILE); assert.equal(b.obj.state.xp, 120);
  assert.equal((await A.richerBackup({ fresh: true })).obj.state.xp, 120, 'app com 0 pontos: há backup maior');
  estudar(200); assert.equal(await A.richerBackup({ fresh: true }), null, 'o app já tem mais pontos que o backup');
});

test('arquivo de uma instalação anterior que o Android não deixa sobrescrever: grava com outro nome', async () => {
  cap = fakeCapacitor({ inicial: { [P(BACKUP_FILE)]: '{}' }, negarEscrita: [BACKUP_FILE] }); estudar(40);
  const r = await A.autoBackup(); assert.equal(r.estado, 'ok'); assert.match(r.nome, /^clarte-backup-\d{8}-\d{4}\.json$/); assert.equal(noArquivo(r.nome).state.xp, 40);
  assert.equal(cap.arquivos.get(P(BACKUP_FILE)), '{}', 'o arquivo antigo ficou como estava');
});

test('falha ao gravar vira estado "erro" com o motivo (sem derrubar) e aparece no status e no diagnóstico', async () => {
  cap = fakeCapacitor({ quebra: ['DOCUMENTS'] }); estudar();
  const r = await A.autoBackup(); assert.equal(r.estado, 'erro'); assert.match(r.erro, /Permission denied/);
  assert.match(A.statusText(), /Não consegui gravar: Permission denied/); const d = await A.diagnose(); assert.equal(d[0].estado, 'fail'); assert.match(d[0].detalhe, /Permission denied/);
});

test('restaurar traz o progresso, mantém a chave deste aparelho e silencia a oferta', async () => {
  guardado(120, new Date(2026, 9, 31, 9).toISOString()); S.setKey('gemini', 'minha-chave');
  const b = await A.richerBackup({ fresh: true }); assert.ok(b); assert.equal(A.dismissed(b), false);
  A.dismiss(b); assert.equal(A.dismissed(b), true, 'não pergunta de novo pelo mesmo backup');
  A.restore(b); assert.equal(S.get().xp, 120); assert.equal(S.get().settings.keys.gemini, 'minha-chave');
  assert.equal(await A.richerBackup({ fresh: true }), null, 'depois de restaurar não há backup maior');
});

test('diagnóstico: lista os arquivos e diz quais este app consegue ler', async () => {
  guardado(10, new Date(2026, 9, 31, 9).toISOString()); guardado(5, new Date(2026, 9, 30, 9).toISOString(), BACKUP_PREV);
  let d = await A.diagnose(); const arq = d.find((l) => l.nome === 'Arquivos em Documentos/Clarte'); assert.equal(arq.estado, 'ok'); assert.match(arq.detalhe, /clarte-backup\.json \(10 pontos\)/);
  cap = fakeCapacitor({ inicial: { [P(BACKUP_FILE)]: JSON.stringify({ app: 'clarte' }) }, negarLeitura: [BACKUP_FILE] });
  d = await A.diagnose(); const arq2 = d.find((l) => l.nome === 'Arquivos em Documentos/Clarte'); assert.equal(arq2.estado, 'warn'); assert.match(arq2.detalhe, /legíveis por este app: nenhum.*Importar/);
});

test('a assinatura ignora a data do backup mas muda com o conteúdo', () => {
  estudar(); const a = S.exportData({ mark: false }); const b = JSON.parse(JSON.stringify(a)); b.state.lastBackup = '2030-01-01'; b.exportedAt = 'outra hora';
  assert.equal(A.signature(a), A.signature(b)); b.state.xp += 1; assert.notEqual(A.signature(a), A.signature(b));
});
