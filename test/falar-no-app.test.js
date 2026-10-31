// Telas no cenário do app Android: o WebView grava o microfone (MediaRecorder) mas não tem SpeechRecognition.
// "Falar" e a ligação com a Clara têm de continuar disponíveis, gravando e pedindo a transcrição à IA.
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

class FakeRecorder {
  constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm'; }
  static isTypeSupported() { return true; }
  start() { this.state = 'recording'; }
  stop() { this.state = 'inactive'; if (this.ondataavailable) this.ondataavailable({ data: new Blob([new Uint8Array(2000)]) }); setTimeout(() => this.onstop && this.onstop(), 0); }
}
w.MediaRecorder = globalThis.MediaRecorder = FakeRecorder;
Object.defineProperty(w.navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) } });

// O WebView do app expõe o reconhecimento de fala do Chrome (webkitSpeechRecognition), mas dentro do app ele não deve ser usado: vale a gravação + IA.
let reconhecimentosCriados = 0;
w.webkitSpeechRecognition = class { constructor() { reconhecimentosCriados++; } start() {} stop() {} abort() {} };
fakeCapacitor(); // e o Capacitor injetado pelo app Android

const $ = (sel) => document.querySelector(sel);
const tick = (ms = 25) => new Promise((r) => setTimeout(r, ms));
async function goto(hash) { w.location.hash = hash; await tick(); }

let S;
before(async () => { await import('../js/app.js'); S = await import('../js/store.js'); await tick(); });
after(() => { mock.timers.reset(); delete globalThis.Capacitor; assert.equal(reconhecimentosCriados, 0, 'o app não pode abrir o reconhecimento do navegador'); assert.deepEqual(problems, [], 'erros durante a navegação'); assert.equal(localStorage.getItem('fr_errlog'), null, 'o app registrou erros no fr_errlog'); });

test('sem chave de IA: Falar oferece "Pular" e a Clara explica o que falta (e não manda usar o Chrome)', async () => {
  await goto('#/practice/speakdrill');
  assert.equal($('#mic'), null); assert.equal($('#ok').textContent.trim(), 'Pular');
  assert.match($('.heard').textContent, /chave do Gemini/); assert.doesNotMatch($('.heard').textContent, /use o Chrome/);
});

test('com chave: Falar grava, a IA transcreve e o exercício é corrigido', async () => {
  S.setKey('gemini', 'chave-de-teste'); let alvo = ''; let pedidos = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (_url, opts) => {
    const corpo = JSON.parse(opts.body);
    if (!(corpo.contents[0].parts[1] || {}).inlineData) return new Response('{}', { status: 500 }); // voz do exercício seguinte (pré-carga): não interessa aqui
    pedidos++; return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: alvo }] } }] }), { status: 200 });
  };
  try {
    await goto('#/'); await goto('#/practice/speakdrill'); // sair e voltar: a mesma rota não desenha de novo
    assert.ok($('#mic'), 'botão do microfone'); assert.notEqual($('#ok').textContent.trim(), 'Pular'); assert.equal($('#ok').disabled, true);
    alvo = $('.target').textContent.trim();
    $('#mic').click(); await tick();
    assert.match($('#heard').textContent, /Gravando/); assert.ok($('#mic').classList.contains('on'));
    mock.timers.tick(1500); // passou tempo suficiente de gravação
    $('#mic').click(); await tick(80);
    assert.equal(pedidos, 1, 'a IA recebeu o áudio uma vez'); assert.ok($('#heard').textContent.includes(alvo), 'mostra o que foi entendido');
    assert.equal($('#ok').disabled, false); assert.ok(!$('#mic').classList.contains('on'));
    $('#ok').click();
    assert.match($('#fb').className, /\bgood\b/, 'frase igual ao alvo é correta');
  } finally { globalThis.fetch = realFetch; }
});

test('com chave: a ligação e o microfone do chat aparecem na tela da Clara', async () => {
  await goto('#/tutor/free');
  assert.ok($('#callbtn')); assert.ok($('#tmic')); assert.doesNotMatch($('#app').textContent, /precisa do Chrome/);
});
