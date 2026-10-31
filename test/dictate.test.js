import './support/storage.js';
import './support/window.js';
import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// O WebView do app Android grava (MediaRecorder) mas não tem SpeechRecognition: é o cenário destes testes.
let paradas = 0; let negar = null;
class FakeRecorder {
  constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm'; }
  static isTypeSupported() { return true; }
  start() { this.state = 'recording'; }
  stop() { this.state = 'inactive'; if (this.ondataavailable) this.ondataavailable({ data: new Blob([new Uint8Array(2000)]) }); setTimeout(() => this.onstop && this.onstop(), 0); }
}
globalThis.window.MediaRecorder = globalThis.MediaRecorder = FakeRecorder; // o código usa os dois jeitos de citar
globalThis.cancelAnimationFrame ??= () => {}; // o medidor de volume (AudioContext) não existe no Node, mas a limpeza chama isto
Object.defineProperty(globalThis.navigator, 'mediaDevices', {
  configurable: true,
  value: { getUserMedia: async () => { if (negar) throw negar; return { getTracks: () => [{ stop() { paradas++; } }] }; } },
});

const S = await import('../js/store.js');
const V = await import('../js/speech.js');

const realFetch = globalThis.fetch;
const resposta = (text) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });
let relogio = 0;
beforeEach(() => { S.resetAll(); paradas = 0; negar = null; relogio = 0; mock.method(Date, 'now', () => (relogio += 1500)); });
afterEach(() => { globalThis.fetch = realFetch; mock.restoreAll(); });

const gravar = (opts = {}) => new Promise((resolve) => {
  const fases = [];
  const ctl = V.dictate({
    onPhase: (p) => { fases.push(p); if (p === 'rec' && opts.parar !== false) setTimeout(() => ctl.stop(), 0); },
    onFinal: (texto) => resolve({ texto, fases }), onError: (er, msg) => resolve({ er, msg, fases }), // onError pode vir antes de ctl existir (sem chave)
  });
  if (opts.cedo) ctl.stop();
});

test('sem reconhecimento do navegador, falar depende de gravar + uma chave que transcreva', () => {
  assert.equal(V.canListen, false);
  assert.equal(V.canDictate(), false); assert.equal(V.canTalk(), false, 'sem chave não há como entender a fala');
  S.setKey('mistral', 'm'); assert.equal(V.canTalk(), false, 'o Mistral não transcreve áudio');
  S.setKey('gemini', 'g'); assert.equal(V.canDictate(), true); assert.equal(V.canTalk(), true);
});

test('dictate: grava, a IA transcreve e a tela recebe as fases e o texto', async () => {
  S.setKey('gemini', 'g'); const corpos = [];
  globalThis.fetch = async (url, opts) => { corpos.push({ url: String(url), body: JSON.parse(opts.body) }); return resposta('Bonjour, je m’appelle Willy.'); };
  const r = await gravar();
  assert.equal(r.texto, 'Bonjour, je m’appelle Willy.'); assert.deepEqual(r.fases, ['rec', 'think']);
  assert.equal(corpos.length, 1); assert.match(corpos[0].url, /generateContent$/); assert.ok(corpos[0].body.contents[0].parts[1].inlineData.data.length > 100, 'o áudio vai no pedido');
  assert.equal(paradas, 1, 'o microfone é liberado no fim');
});

test('dictate: com chave só do Groq usa o Whisper', async () => {
  S.setKey('groq', 'k'); S.setSetting('provider', 'groq'); let url = '';
  globalThis.fetch = async (u) => { url = String(u); return new Response(JSON.stringify({ text: ' Salut ' }), { status: 200 }); };
  assert.equal((await gravar()).texto, 'Salut'); assert.match(url, /audio\/transcriptions$/);
});

test('dictate: tocar em parar antes de o microfone abrir não perde a gravação', async () => {
  S.setKey('gemini', 'g'); globalThis.fetch = async () => resposta('Salut');
  const r = await gravar({ cedo: true, parar: false }); assert.equal(r.texto, 'Salut'); assert.deepEqual(r.fases, ['rec', 'think']);
});

test('dictate: gravação curta demais vira "não ouvi nada", sem gastar a IA', async () => {
  S.setKey('gemini', 'g'); let chamadas = 0; globalThis.fetch = async () => { chamadas++; return resposta('x'); };
  mock.restoreAll(); mock.method(Date, 'now', () => 1000); // 0 ms entre abrir e parar
  const r = await gravar(); assert.equal(r.texto, ''); assert.equal(chamadas, 0); assert.deepEqual(r.fases, ['rec']);
});

test('dictate: microfone negado e microfone ocupado têm códigos próprios', async () => {
  S.setKey('gemini', 'g');
  negar = Object.assign(new Error('x'), { name: 'NotAllowedError' }); assert.equal((await gravar()).er, 'not-allowed');
  negar = Object.assign(new Error('x'), { name: 'NotReadableError' }); assert.equal((await gravar()).er, 'audio-capture');
});

test('dictate: falha da IA devolve o motivo em português; sem chave avisa que não há suporte', async () => {
  S.setKey('gemini', 'g'); globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'denied' } }), { status: 403 });
  const r = await gravar(); assert.equal(r.er, 'network'); assert.match(r.msg, /Chave inválida ou sem permissão/); assert.equal(paradas, 1);
  S.resetAll(); assert.equal((await gravar()).er, 'unsupported');
});

test('dictate: cancelar libera o microfone e não chama a tela depois', async () => {
  S.setKey('gemini', 'g'); let chamado = false; globalThis.fetch = async () => resposta('x');
  const ctl = V.dictate({ onFinal: () => { chamado = true; }, onError: () => { chamado = true; } });
  await new Promise((r) => setTimeout(r, 10)); ctl.cancel(); ctl.stop();
  await new Promise((r) => setTimeout(r, 20)); assert.equal(chamado, false); assert.equal(paradas, 1);
});
