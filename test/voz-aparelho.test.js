import './support/storage.js';
import './support/window.js';
import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { fakeCapacitor } from './support/capacitor.js';
import * as S from '../js/store.js';
import * as V from '../js/speech.js';

const PLUGINS = ['Filesystem', 'Share', 'TextToSpeech'];
const realFetch = globalThis.fetch;
let cap; let tocadas;
// "Audio" mínimo: toca na hora e termina
globalThis.Audio = class { constructor(src) { this.src = src; tocadas.push(src); } play() { Promise.resolve().then(() => this.onended && this.onended()); return Promise.resolve(); } pause() {} };
const corpo429 = (extra) => new Response(JSON.stringify({ error: { code: 429, message: 'Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 10, model: gemini-3.8-flash-tts', status: 'RESOURCE_EXHAUSTED', details: extra || [] } }), { status: 429 });
const corpoDia = () => corpo429([{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] }]);
const audioOk = () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: 'AAAAAAAAAAAA' } }] } }] }), { status: 200 });

beforeEach(async () => {
  S.resetAll(); localStorage.clear(); V.limparPausa(); tocadas = [];
  cap = fakeCapacitor({ plugins: PLUGINS }); await V.recheckNativeVoice();
});
afterEach(() => { globalThis.fetch = realFetch; mock.restoreAll(); delete globalThis.Capacitor; });

test('voz do Android: o app reconhece a voz francesa do aparelho e a prefere à voz natural online', async () => {
  S.setKey('gemini', 'k');
  assert.equal(V.hasFrenchVoice(), true); assert.equal(V.frenchVoiceName(), 'fr-fr-x-vlf-local'); assert.equal(V.nativeVoiceInfo().n, 2);
  const e = V.engineInfo(); assert.equal(e.engine, 'browser', 'com voz francesa no aparelho a voz natural (limitada) não é usada sozinha'); assert.equal(e.hasFr, true);
});

test('voz do Android: falar usa o plugin, com o idioma, a velocidade e a voz francesa, sem rede', async () => {
  S.setKey('gemini', 'k'); let rede = 0; globalThis.fetch = async () => { rede++; return audioOk(); };
  await V.speak('Bonjour, Willy !', { rate: 0.85 });
  assert.equal(rede, 0); assert.equal(cap.falas.length, 1);
  assert.deepEqual([cap.falas[0].text, cap.falas[0].lang, cap.falas[0].rate, cap.falas[0].voice, cap.falas[0].queueStrategy], ['Bonjour, Willy !', 'fr-FR', 0.85, 1, 0], 'voz 1 = a francesa da lista');
  assert.equal(V.voiceNote, '', 'sem aviso: está tudo certo');
});

test('voz do Android: sem a voz francesa instalada, o app avisa e usa a voz natural online', async () => {
  cap = fakeCapacitor({ plugins: PLUGINS, tts: { suportado: false, vozes: [] } }); await V.recheckNativeVoice(); S.setKey('gemini', 'k');
  assert.equal(V.hasFrenchVoice(), false); assert.equal(V.engineInfo().engine, 'gemini');
});

test('voz do Android: se a fala falhar, não derruba o app', async () => {
  cap = fakeCapacitor({ plugins: PLUGINS, tts: { falha: true } }); await V.recheckNativeVoice();
  await assert.doesNotReject(V.speak('Bonjour')); const r = await V.deviceVoiceTest(); assert.equal(r.ok, false); assert.match(r.erro, /Failed to read text/);
});

test('teste da voz do aparelho: frase de verdade passa de 0,7 s; resposta instantânea indica que não saiu som', async () => {
  cap = fakeCapacitor({ plugins: PLUGINS, tts: { duracao: 760 } }); await V.recheckNativeVoice();
  const ok = await V.deviceVoiceTest(); assert.equal(ok.via, 'android'); assert.equal(ok.ok, true); assert.ok(ok.ms >= 700);
  cap = fakeCapacitor({ plugins: PLUGINS, tts: { duracao: 0 } }); await V.recheckNativeVoice();
  assert.equal((await V.deviceVoiceTest()).ok, false, 'voltou na hora: provavelmente mudo');
});

test('parar a fala e abrir a instalação de voz chegam ao Android', async () => {
  V.stopSpeaking(); await Promise.resolve(); assert.equal(cap.voz.parou >= 1, true);
  assert.equal(await V.openVoiceInstall(), true); assert.equal(cap.voz.instalou, 1);
  delete globalThis.Capacitor; assert.equal(await V.openVoiceInstall(), false);
});

test('limite diário: tenta cada modelo (cada um tem a sua cota), pausa até a meia-noite do Pacífico e não tenta mais', async () => {
  cap = fakeCapacitor({ plugins: PLUGINS, tts: { suportado: false, vozes: [] } }); await V.recheckNativeVoice(); S.setKey('gemini', 'k');
  const modelos = []; globalThis.fetch = async (url) => { modelos.push(/models\/([^:]+):/.exec(String(url))[1]); return corpoDia(); };
  const t0 = Date.now(); await V.speak('Bonjour', { rate: 0.9 });
  assert.deepEqual(modelos, V.ttsModels(), 'tentou todos os modelos'); const p = V.geminiPausa(); assert.ok(p); assert.equal(p.motivo, 'dia'); assert.ok(Math.abs(p.ate - V.proximaMeiaNoitePacifico(t0)) <= 1000, 'meia-noite do Pacífico (tolerância de uma virada de segundo)'); assert.equal(p.ate % 1000, 0);
  assert.match(p.detalhe, /limite 10/); assert.match(V.voiceNote, /Limite gratuito/);
  modelos.length = 0; await V.speak('Merci', { rate: 0.9 }); assert.equal(modelos.length, 0, 'em pausa: nenhuma chamada nova');
  assert.equal(V.engineInfo().engine, 'browser'); assert.equal(V.engineInfo().pausa.motivo, 'dia');
});

test('limite diário: o aviso aparece uma vez por pausa, não a cada frase', async () => {
  cap = fakeCapacitor({ plugins: PLUGINS, tts: { suportado: false, vozes: [] } }); await V.recheckNativeVoice(); S.setKey('gemini', 'k');
  globalThis.fetch = async () => corpoDia(); await V.speak('Un'); assert.match(V.voiceNote, /Limite gratuito/, 'a primeira frase avisa do limite');
  await V.speak('Deux'); assert.equal(V.voiceNote, '', 'as seguintes seguem em silêncio, sem repetir o aviso'); await V.speak('Trois'); assert.equal(V.voiceNote, '');
  V.limparPausa(); globalThis.fetch = async () => corpoDia(); await V.speak('Quatre'); assert.match(V.voiceNote, /Limite gratuito/, 'uma nova pausa avisa de novo');
});

test('limite por minuto: pausa só pelo tempo que o Google pediu', async () => {
  cap = fakeCapacitor({ plugins: PLUGINS, tts: { suportado: false, vozes: [] } }); await V.recheckNativeVoice(); S.setKey('gemini', 'k');
  globalThis.fetch = async () => corpo429([{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '34s' }]);
  const t0 = Date.now(); await V.speak('Bonjour'); const p = V.geminiPausa(); assert.equal(p.motivo, 'minuto'); assert.ok(p.ate >= t0 + 38000 && p.ate <= t0 + 45000, `pausa de ~39 s, veio ${p.ate - t0} ms`);
});

test('um modelo no limite e outro livre: usa o livre e não pausa', async () => {
  cap = fakeCapacitor({ plugins: PLUGINS, tts: { suportado: false, vozes: [] } }); await V.recheckNativeVoice(); S.setKey('gemini', 'k');
  let n = 0; globalThis.fetch = async () => (++n === 1 ? corpoDia() : audioOk());
  await V.speak('Bonjour'); assert.equal(n, 2); assert.equal(V.geminiPausa(), null); assert.equal(tocadas.length, 1, 'o áudio do segundo modelo tocou'); assert.equal(V.voiceNote, '');
});

test('frases que já estão no cache continuam tocando durante a pausa (e erro que não é de limite não pausa)', async () => {
  cap = fakeCapacitor({ plugins: PLUGINS, tts: { suportado: false, vozes: [] } }); await V.recheckNativeVoice(); S.setKey('gemini', 'k');
  globalThis.fetch = async () => new Response('{}', { status: 503 }); await V.speak('Bonjour'); assert.equal(V.geminiPausa(), null, '503 não é limite'); assert.match(V.voiceNote, /indisponível/);
});

test('pausaDe e proximaMeiaNoitePacifico', () => {
  assert.equal(V.proximaMeiaNoitePacifico(Date.UTC(2026, 10, 1, 12)), Date.UTC(2026, 10, 2, 8), 'inverno (PST, UTC-8)');
  assert.equal(V.proximaMeiaNoitePacifico(Date.UTC(2026, 6, 1, 20)), Date.UTC(2026, 6, 2, 7), 'verão (PDT, UTC-7)');
  const agora = Date.UTC(2026, 6, 1, 20);
  assert.equal(V.pausaDe({ detail: 'x PerDay y' }, agora).motivo, 'dia'); assert.equal(V.pausaDe({ detail: '"retryDelay": "12s"' }, agora).ate, agora + 17000);
  const sem = V.pausaDe({}, agora); assert.equal(sem.motivo, 'indefinido'); assert.equal(sem.ate, agora + 30 * 60000);
  const d = V.pausaDe({ detail: 'limit: 10, model: gemini-2.5-flash-tts PerDay' }, agora); assert.equal(d.detalhe, 'limite 10 (gemini-2.5-flash-tts)');
});

test('uma ligação já em andamento também respeita a pausa: não chama a rede e cai na voz do aparelho', async () => {
  cap = fakeCapacitor({ plugins: PLUGINS, tts: { suportado: false, vozes: [] } }); await V.recheckNativeVoice(); S.setKey('gemini', 'k');
  const sp = V.createSpeaker(() => 0.9); // criada com a voz natural valendo
  localStorage.setItem('fr_tts_pausa', JSON.stringify({ ate: Date.now() + 3600000, motivo: 'dia', detalhe: '' })); // outra frase estourou o limite
  let rede = 0; globalThis.fetch = async () => { rede++; return audioOk(); };
  sp.push('Bonjour, Willy.'); await sp.done(); assert.equal(rede, 0, 'nenhuma chamada em pausa'); assert.equal(sp.fallback, true, 'a ligação avisa que usou a voz do aparelho');
});
