// Ajustes no app Android: bloco do lembrete diário (liga, permissão, horário, teste) e o que aparece sem o plugin ou no site.
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
put('confirm', () => true); w.confirm = globalThis.confirm; w.alert = () => {};
w.history.replaceState = (_s, _t, url) => { w.location.hash = String(url).split('#')[1] ? '#' + String(url).split('#')[1] : ''; };
const problems = [];
process.on('unhandledRejection', (e) => problems.push(`promessa sem tratamento: ${e && e.message}`));
w.addEventListener('error', (e) => problems.push(`erro na tela: ${e.message}`));

const PLUGINS = ['Filesystem', 'Share', 'LocalNotifications', 'TextToSpeech'];
const $ = (sel) => document.querySelector(sel);
const tick = (ms = 25) => new Promise((r) => setTimeout(r, ms));
async function goto(hash) { w.location.hash = hash; await tick(60); }
async function abrirAjustes() { await goto('#/'); await goto('#/settings'); await tick(40); }
const mudar = (el, valor) => { if (typeof valor === 'boolean') el.checked = valor; else el.value = valor; el.dispatchEvent(new w.Event('change')); };

let S; let R; let cap;
before(async () => { cap = fakeCapacitor({ plugins: PLUGINS }); await import('../js/app.js'); S = await import('../js/store.js'); R = await import('../js/reminders.js'); await tick(); });
after(() => { mock.timers.reset(); delete globalThis.Capacitor; assert.deepEqual(problems, [], 'erros durante a navegação'); assert.equal(localStorage.getItem('fr_errlog'), null, 'o app registrou erros no fr_errlog'); });
const novo = (opts) => { S.resetAll(); R.esquecer(); cap = fakeCapacitor({ plugins: PLUGINS, ...opts }); };

test('começa desligado, com horário padrão 19:00', async () => {
  novo(); await abrirAjustes();
  assert.ok($('#srem')); assert.equal($('#srem').checked, false); assert.equal($('#sremt').value, '19:00'); assert.equal($('#sremst').textContent, 'Desligado.');
  assert.match(document.body.textContent, /Lembrete diário/);
});

test('ligar pede a permissão uma vez, agenda e mostra o próximo lembrete', async () => {
  novo({ permissao: 'prompt' }); await abrirAjustes();
  mudar($('#srem'), true); await tick(80);
  assert.equal(S.get().settings.reminder, true); assert.equal($('#srem').checked, true); assert.equal(cap.pendentes.size, 7);
  assert.match($('#sremst').textContent, /Próximo lembrete.*19:00/); assert.ok(cap.chamadas.some((c) => c[0] === 'pedir-permissao'));
});

test('permissão negada: o botão volta a desligado e o motivo aparece', async () => {
  novo({ permissao: 'prompt', pedir: 'denied' }); await abrirAjustes();
  mudar($('#srem'), true); await tick(80);
  assert.equal($('#srem').checked, false); assert.equal(S.get().settings.reminder, false); assert.equal(cap.pendentes.size, 0);
  assert.match(document.body.textContent, /Libere em Configurações → Apps → Clarté → Notificações/);
});

test('mudar o horário reagenda, e horário vazio volta ao anterior', async () => {
  novo(); S.setSetting('reminder', true); await abrirAjustes(); await tick(40);
  mudar($('#sremt'), '07:30'); await tick(80);
  assert.equal(S.get().settings.reminderTime, '07:30'); assert.equal(cap.agendamentos.at(-1)[0].schedule.at.getHours(), 7);
  mudar($('#sremt'), ''); await tick(40); assert.equal($('#sremt').value, '07:30', 'horário inválido não é salvo'); assert.equal(S.get().settings.reminderTime, '07:30');
});

test('"Enviar um teste" agenda uma notificação solta', async () => {
  novo(); await abrirAjustes(); $('#sremtest').click(); await tick(80);
  assert.equal(cap.agendamentos.at(-1)[0].id, 199); assert.match(document.body.textContent, /Teste enviado/);
});

test('app instalado antes do plugin: explica como atualizar e não mostra controles que não funcionam', async () => {
  S.resetAll(); R.esquecer(); cap = fakeCapacitor({ plugins: ['Filesystem', 'Share'] }); await abrirAjustes();
  assert.equal($('#srem'), null); assert.match(document.body.textContent, /instalado antes dos lembretes/); assert.match(document.body.textContent, /Run de novo/);
});

test('no site (sem app Android) o bloco não existe', async () => {
  S.resetAll(); R.esquecer(); delete globalThis.Capacitor; await abrirAjustes();
  assert.equal($('#srem'), null); assert.doesNotMatch(document.body.textContent, /Lembrete diário/);
});

test('Ajustes → Voz no app: mostra a voz francesa do Android, instala/atualiza e testa pelo plugin', async () => {
  const V = await import('../js/speech.js'); novo(); await V.recheckNativeVoice(); await abrirAjustes();
  assert.match($('#vstatus').textContent, /Voz francesa do aparelho: fr-fr-x-vlf-local/); assert.ok($('#sinstvoz')); assert.ok($('#stestapar'));
  $('#sinstvoz').click(); await tick(40); assert.equal(cap.voz.instalou, 1, 'abriu a instalação de voz do Android');
});

test('Ajustes → Voz: sem voz francesa, orienta a instalar; com o limite do Gemini em pausa, explica quando volta', async () => {
  const V = await import('../js/speech.js'); novo({ tts: { suportado: false, vozes: [] } }); await V.recheckNativeVoice(); S.setKey('gemini', 'k'); V.limparPausa();
  await abrirAjustes(); assert.match($('#vstatus').textContent, /não tem voz francesa.*Instalar ou atualizar a voz francesa/);
  localStorage.setItem('fr_tts_pausa', JSON.stringify({ ate: Date.now() + 3600000, motivo: 'dia', detalhe: 'limite 10 (gemini-3.8-flash-tts)' }));
  await goto('#/'); await goto('#/settings'); await tick(40);
  const t = $('#vstatus').textContent;
  assert.match(t, /em pausa/); assert.ok(t.includes('limite 10 (gemini-3.8-flash-tts)')); assert.match(t, /meia-noite do horário do Pacífico/); V.limparPausa();
});
