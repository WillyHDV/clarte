import './support/storage.js';
import './support/window.js';
import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { fakeCapacitor } from './support/capacitor.js';
import * as S from '../js/store.js';
import * as R from '../js/reminders.js';

const PLUGINS = ['Filesystem', 'Share', 'LocalNotifications'];
const base = new Date(2026, 10, 1, 10, 0); let agora = base.getTime();
let cap;
beforeEach(() => { S.resetAll(); localStorage.clear(); R.esquecer(); agora = base.getTime(); cap = fakeCapacitor({ plugins: PLUGINS }); mock.method(Date, 'now', () => agora); });
afterEach(() => { mock.restoreAll(); delete globalThis.Capacitor; });
const ligar = (hora = '19:00') => { S.setSetting('reminder', true); S.setSetting('reminderTime', hora); };
const estudou = () => { S.get().today = { date: new Date(agora).toLocaleDateString('sv-SE'), n: 4 }; };
const dias = (lista) => lista.map((n) => n.schedule.at.getDate());
const pendentesOrdenados = () => cap.agendamentos.at(-1);

test('planTimes: um horário por dia, hoje só se ainda não passou e se você não estudou', () => {
  const t = (d, h, m = 0) => new Date(2026, 10, d, h, m);
  assert.deepEqual(R.planTimes(t(1, 10), '19:00', false).map((d) => d.getDate()), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(R.planTimes(t(1, 10), '19:00', true).map((d) => d.getDate()), [2, 3, 4, 5, 6, 7, 8], 'já estudou hoje: o aviso de hoje não vem');
  assert.deepEqual(R.planTimes(t(1, 20), '19:00', false).map((d) => d.getDate()), [2, 3, 4, 5, 6, 7, 8], 'a hora de hoje já passou');
  assert.equal(R.planTimes(t(1, 18, 58), '19:00', false)[0].getDate(), 1, 'faltam 2 minutos: ainda vale');
  assert.equal(R.planTimes(t(1, 18, 59), '19:00', false)[0].getDate(), 2, 'falta menos de 1 minuto: fica para amanhã');
  const virada = R.planTimes(t(29, 22), '07:30', false); assert.deepEqual(virada.map((d) => `${d.getMonth() + 1}/${d.getDate()}`), ['11/30', '12/1', '12/2', '12/3', '12/4', '12/5', '12/6'], 'vira o mês');
  assert.ok(R.planTimes(t(1, 10), '19:00', false).every((d) => d.getHours() === 19 && d.getMinutes() === 0));
});

test('horário e mensagens: horário inválido volta para 19:00 e as mensagens nunca ficam vazias', () => {
  for (const ok of ['00:00', '07:30', '19:00', '23:59']) assert.equal(R.horaValida(ok), true, ok);
  for (const ruim of ['', '7:30', '24:00', '19:60', 'abc', null, undefined]) assert.equal(R.horaValida(ruim), false, String(ruim));
  S.setSetting('reminderTime', '99:99'); assert.equal(R.config().hora, '19:00'); assert.equal(R.config().ligado, false, 'começa desligado');
  for (let k = -3; k < 20; k++) assert.ok(R.mensagem(k).length > 10);
});

test('fora do app, ou sem o plugin (app instalado antes), nada agenda e o texto orienta', async () => {
  delete globalThis.Capacitor; ligar(); assert.equal(R.disponivel(), false); assert.equal((await R.sync()).estado, 'indisponivel'); assert.deepEqual(await R.diagnose(), []); assert.equal(R.statusText(), '');
  cap = fakeCapacitor({ plugins: ['Filesystem', 'Share'] }); assert.equal(R.disponivel(), false); assert.equal((await R.sync()).estado, 'indisponivel');
  assert.match(R.statusText(), /Run de novo/); const d = await R.diagnose(); assert.equal(d[0].estado, 'warn'); assert.match(d[0].detalhe, /Run de novo/);
});

test('ligar pela primeira vez pede a permissão e agenda os 7 dias sem exigir hora exata', async () => {
  cap = fakeCapacitor({ plugins: PLUGINS, permissao: 'prompt' }); ligar();
  assert.equal((await R.sync()).estado, 'sem-permissao', 'sem o pedido explícito não pergunta nada'); assert.equal(cap.agendamentos.length, 0);
  const r = await R.sync({ pedirPermissao: true }); assert.equal(r.estado, 'ok'); assert.equal(r.total, 7);
  assert.ok(cap.chamadas.some((c) => c[0] === 'pedir-permissao'));
  const lista = pendentesOrdenados(); assert.equal(lista.length, 7); assert.deepEqual(lista.map((n) => n.id), R.IDS);
  assert.ok(lista.every((n) => n.channelId === 'estudo' && n.isExactNotification === false && n.schedule.allowWhileIdle === true && n.title === 'Clarté' && n.body.length > 10));
  assert.deepEqual(dias(lista), [1, 2, 3, 4, 5, 6, 7]); assert.ok(lista.every((n) => n.schedule.at.getHours() === 19));
  assert.equal(cap.canais.length, 1); assert.equal(cap.canais[0].id, 'estudo'); assert.equal(cap.pendentes.size, 7);
  assert.match(R.statusText(), /Próximo lembrete.*19:00/);
});

test('permissão negada: não agenda e o texto explica onde liberar', async () => {
  cap = fakeCapacitor({ plugins: PLUGINS, permissao: 'prompt', pedir: 'denied' }); ligar();
  assert.equal((await R.sync({ pedirPermissao: true })).estado, 'negado'); assert.equal(cap.pendentes.size, 0);
  assert.match(R.statusText(), /Notificações/);
  cap = fakeCapacitor({ plugins: PLUGINS, permissao: 'denied' }); R.esquecer(); assert.equal((await R.sync()).estado, 'sem-permissao');
});

test('se você já estudou hoje o aviso de hoje é cancelado; sem mudanças não reagenda', async () => {
  ligar(); await R.sync(); assert.deepEqual(dias(pendentesOrdenados()), [1, 2, 3, 4, 5, 6, 7]);
  const n = cap.agendamentos.length; await R.sync(); assert.equal(cap.agendamentos.length, n, 'mesmo plano: nada a enviar de novo');
  estudou(); const r = await R.sync(); assert.equal(r.estado, 'ok');
  assert.deepEqual(dias(pendentesOrdenados()), [2, 3, 4, 5, 6, 7, 8]); assert.equal(cap.pendentes.size, 7, 'os mesmos 7 códigos, sem sobras');
  assert.equal(S.studiedToday(new Date(agora)), true); assert.equal(S.studiedToday(new Date(agora + 86400000)), false, 'amanhã conta de novo');
});

test('a fala com a Clara também conta como estudar', () => {
  assert.equal(S.studiedToday(new Date(agora)), false);
  S.get().voiceToday = { date: new Date(agora).toLocaleDateString('sv-SE'), n: 1 }; assert.equal(S.studiedToday(new Date(agora)), true);
});

test('mudar o horário reagenda; com a hora de hoje já passada começa amanhã', async () => {
  ligar('19:00'); await R.sync(); S.setSetting('reminderTime', '07:30'); await R.sync();
  const lista = pendentesOrdenados(); assert.deepEqual(dias(lista), [2, 3, 4, 5, 6, 7, 8]); assert.ok(lista.every((n) => n.schedule.at.getHours() === 7 && n.schedule.at.getMinutes() === 30));
  assert.equal(cap.pendentes.size, 7);
});

test('desligar cancela tudo uma vez só', async () => {
  ligar(); await R.sync(); assert.equal(cap.pendentes.size, 7);
  S.setSetting('reminder', false); assert.equal((await R.sync()).estado, 'desligado'); assert.equal(cap.pendentes.size, 0); assert.equal(R.statusText(), 'Desligado.');
  const chamadas = cap.chamadas.length; await R.sync(); assert.equal(cap.chamadas.length, chamadas, 'já está desligado');
});

test('falha do Android ao agendar vira estado "erro" com o motivo, sem derrubar o app', async () => {
  cap = fakeCapacitor({ plugins: PLUGINS, falhaAgendar: true }); ligar();
  const r = await R.sync(); assert.equal(r.estado, 'erro'); assert.match(r.erro, /Notifications are blocked/); assert.match(R.statusText(), /Não consegui agendar: Notifications are blocked/);
});

test('teste: agenda uma notificação solta para daqui a poucos segundos; negada, avisa', async () => {
  const r = await R.testar(8); assert.equal(r.estado, 'ok'); const n = cap.agendamentos.at(-1)[0];
  assert.equal(n.id, 199); assert.equal(n.schedule.at.getTime(), agora + 8000); assert.match(n.body, /Teste/); assert.equal(n.isExactNotification, false);
  assert.ok(!R.IDS.includes(199), 'o teste não mexe nos lembretes diários');
  cap = fakeCapacitor({ plugins: PLUGINS, permissao: 'denied' }); assert.equal((await R.testar()).estado, 'negado');
  delete globalThis.Capacitor; assert.equal((await R.testar()).estado, 'indisponivel');
});

test('diagnóstico: permissão e quantos lembretes estão agendados', async () => {
  let d = await R.diagnose(); assert.equal(d[0].estado, 'ok'); assert.match(d[1].detalhe, /desligados/);
  ligar(); await R.sync(); d = await R.diagnose(); assert.match(d[1].detalhe, /ligados para as 19:00 · 7 agendado/);
  cap = fakeCapacitor({ plugins: PLUGINS, permissao: 'denied' }); d = await R.diagnose(); assert.equal(d[0].estado, 'warn');
});
