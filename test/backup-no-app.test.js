// Telas no app Android com backup em Documentos/Clarte: oferta de restauração na tela inicial e o bloco em Ajustes.
import './support/storage.js';
import { test, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { fakeCapacitor } from './support/capacitor.js';

mock.timers.enable({ apis: ['Date'], now: new Date(2026, 10, 1, 10) });

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { url: 'file:///clarte/index.html', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
const w = dom.window;
const put = (k, v) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
for (const k of ['document', 'location', 'history', 'navigator', 'screen', 'Element', 'HTMLElement', 'Node', 'Event', 'KeyboardEvent', 'MouseEvent', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) put(k, w[k]);
put('window', w);
w.scrollTo = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
put('matchMedia', w.matchMedia);
let confirmou = true; const perguntas = [];
put('confirm', (t) => { perguntas.push(t); return confirmou; }); w.confirm = globalThis.confirm; w.alert = () => {};
w.history.replaceState = (_s, _t, url) => { w.location.hash = String(url).split('#')[1] ? '#' + String(url).split('#')[1] : ''; };
const problems = [];
process.on('unhandledRejection', (e) => problems.push(`promessa sem tratamento: ${e && e.message}`));
w.addEventListener('error', (e) => problems.push(`erro na tela: ${e.message}`));

const ARQ = 'DOCUMENTS:Clarte/clarte-backup.json';
const $ = (sel) => document.querySelector(sel);
const tick = (ms = 25) => new Promise((r) => setTimeout(r, ms));
async function goto(hash) { w.location.hash = hash; await tick(60); }

let S; let cap;
// escreve em Documentos um backup do estado atual com `xp` pontos
const guardar = (xp, quando) => { const d = S.exportData({ mark: false }); d.state.xp = xp; d.exportedAt = quando; cap.arquivos.set(ARQ, JSON.stringify(d)); };

before(async () => {
  cap = fakeCapacitor(); // o app Android injeta o Capacitor antes de a página carregar
  await import('../js/app.js'); S = await import('../js/store.js'); await tick();
});
after(() => { mock.timers.reset(); delete globalThis.Capacitor; assert.deepEqual(problems, [], 'erros durante a navegação'); assert.equal(localStorage.getItem('fr_errlog'), null, 'o app registrou erros no fr_errlog'); });

test('app reinstalado (0 pontos) com backup de 300 pontos: a tela inicial oferece restaurar', async () => {
  mock.timers.tick(60000); guardar(300, new Date(2026, 9, 30, 21).toISOString()); // o início do app já consultou a pasta (vazia): passa o prazo da consulta guardada
  await goto('#/'); await goto('#/settings'); await goto('#/');
  const card = $('#restore'); assert.ok(card, 'cartão de restauração');
  assert.match(card.textContent, /300 pontos/); assert.match(card.textContent, /Documentos\/Clarte/); assert.doesNotMatch(card.textContent, /undefined|NaN/);
  $('#rrestore').click(); await tick(60);
  assert.match(perguntas.at(-1), /Substituir o progresso/); assert.equal(S.get().xp, 300, 'progresso restaurado');
  assert.equal($('#restore'), null, 'depois de restaurar a oferta some');
});

test('"Agora não" some e não volta para o mesmo backup', async () => {
  S.resetAll(); mock.timers.tick(60000); guardar(300, new Date(2026, 9, 30, 21).toISOString());
  await goto('#/settings'); await goto('#/');
  assert.ok($('#restore')); $('#rskip').click(); assert.equal($('#restore'), null);
  mock.timers.tick(60000); await goto('#/settings'); await goto('#/'); await tick(40);
  assert.equal($('#restore'), null, 'já foi dispensado');
});

test('sem backup ou com backup menor que o do app, não há oferta', async () => {
  S.resetAll(); S.addXp(500); mock.timers.tick(60000); guardar(300, new Date(2026, 9, 29, 21).toISOString());
  await goto('#/settings'); await goto('#/'); await tick(40); assert.equal($('#restore'), null);
  cap.arquivos.clear(); S.resetAll(); mock.timers.tick(60000); await goto('#/settings'); await goto('#/'); await tick(40); assert.equal($('#restore'), null);
});

test('Ajustes mostra o backup automático; "Fazer agora" avisa antes de trocar um backup maior', async () => {
  S.resetAll(); S.addXp(20); mock.timers.tick(60000); guardar(300, new Date(2026, 9, 31, 21).toISOString());
  await goto('#/'); await goto('#/settings/dados');
  assert.ok($('#sautoon').checked); assert.match($('#sautost').textContent, /Ainda sem backup automático/); assert.ok($('#sautonow')); assert.ok($('#sautorest'));
  confirmou = false; $('#sautonow').click(); await tick(60);
  assert.match(perguntas.at(-1), /Já existe um backup com mais pontos \(300\)/); assert.equal(JSON.parse(cap.arquivos.get(ARQ)).state.xp, 300, 'cancelou: backup intacto');
  confirmou = true; $('#sautonow').click(); await tick(80);
  assert.equal(JSON.parse(cap.arquivos.get(ARQ)).state.xp, 20, 'confirmou: substituído'); assert.match($('#sautost').textContent, /Último backup automático/);
  $('#sautoon').checked = false; $('#sautoon').dispatchEvent(new w.Event('change')); await tick(); assert.equal(S.get().settings.autoBackup, false); assert.match($('#sautost').textContent, /Desligado/);
});

test('restaurar pelo botão de Ajustes e mensagem clara quando o Android não deixa ler', async () => {
  S.resetAll(); mock.timers.tick(60000); guardar(150, new Date(2026, 9, 31, 22).toISOString());
  await goto('#/'); await goto('#/settings/dados'); confirmou = true; $('#sautorest').click(); await tick(80);
  assert.equal(S.get().xp, 150);
  cap.arquivos.clear(); await goto('#/'); await goto('#/settings/dados'); $('#sautorest').click(); await tick(60);
  assert.match(document.body.textContent, /Não consegui ler um backup automático/);
});

test('no site (sem app Android) o bloco de backup automático não existe', async () => {
  const guarda = globalThis.Capacitor; delete globalThis.Capacitor;
  try { await goto('#/'); await goto('#/settings/dados'); assert.ok($('#sshare'), 'a tela de dados abriu'); assert.equal($('#sautoon'), null); assert.equal($('#restore'), null); } finally { globalThis.Capacitor = guarda; }
});
