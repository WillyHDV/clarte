import './support/storage.js';
import './support/window.js';
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/store.js';
import { ttsModels, ttsBenchmark, TTS_CANDIDATES } from '../js/speech.js';

const realFetch = globalThis.fetch;
beforeEach(() => { S.resetAll(); S.setKey('gemini', 'chave-de-teste'); });
afterEach(() => { globalThis.fetch = realFetch; });

const audioOk = () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: 'AAAA' } }] } }] }), { status: 200 });
const erro = (status, message) => new Response(JSON.stringify({ error: { message } }), { status });

test('modelo da voz: padrão automático e escolha em Ajustes passa à frente', () => {
  assert.deepEqual(ttsModels(), ['gemini-3.8-flash-tts', 'gemini-2.5-flash-preview-tts']);
  S.setSetting('ttsModel', 'gemini-3.8-flash-lite-tts');
  assert.deepEqual(ttsModels(), ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts', 'gemini-2.5-flash-preview-tts'], 'o escolhido vai na frente e os padrões ficam de reserva');
  S.setSetting('ttsModel', 'gemini-2.5-flash-preview-tts'); assert.deepEqual(ttsModels(), ['gemini-2.5-flash-preview-tts', 'gemini-3.8-flash-tts']);
  for (const lixo of ['auto', '', 'modelo-que-nao-existe', undefined, null]) { S.setSetting('ttsModel', lixo); assert.deepEqual(ttsModels(), ['gemini-3.8-flash-tts', 'gemini-2.5-flash-preview-tts'], String(lixo)); }
});

test('os modelos comparáveis incluem os padrões', () => {
  for (const m of ttsModels()) assert.ok(TTS_CANDIDATES.includes(m)); assert.equal(new Set(TTS_CANDIDATES).size, TTS_CANDIDATES.length);
});

test('ttsBenchmark: mede cada modelo em ordem, com a chave e o pedido de áudio', async () => {
  const calls = [];
  globalThis.fetch = async (url, opts) => { calls.push({ model: /models\/([^:]+):/.exec(String(url))[1], key: opts.headers['x-goog-api-key'], body: JSON.parse(opts.body) }); return audioOk(); };
  const r = await ttsBenchmark('Bonjour !');
  assert.deepEqual(calls.map((c) => c.model), TTS_CANDIDATES); assert.deepEqual(r.map((x) => x.model), TTS_CANDIDATES);
  assert.ok(r.every((x) => x.ok && typeof x.ms === 'number' && x.ms >= 0));
  assert.equal(calls[0].key, 'chave-de-teste'); assert.deepEqual(calls[0].body.generationConfig.responseModalities, ['AUDIO']);
  assert.equal(calls[0].body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, 'Kore'); assert.equal(calls[0].body.contents[0].parts[0].text, 'Bonjour !');
});

test('ttsBenchmark: falhas viram linhas com o motivo, sem interromper as demais', async () => {
  globalThis.fetch = async (url) => {
    const m = /models\/([^:]+):/.exec(String(url))[1];
    if (m === 'gemini-3.8-flash-lite-tts') return erro(403, 'API key not valid'); if (m === 'gemini-3.1-flash-tts-preview') throw new TypeError('fetch failed');
    if (m === 'gemini-2.5-flash-preview-tts') return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'sem áudio' }] } }] }), { status: 200 });
    return audioOk();
  };
  const r = await ttsBenchmark('x');
  assert.deepEqual(r.map((x) => x.ok), [true, false, false, false]);
  assert.deepEqual([r[1].status, r[1].message], [403, 'API key not valid']); assert.equal(r[2].message, 'fetch failed'); assert.equal(r[3].message, 'sem áudio');
});

test('ttsBenchmark aceita uma lista própria de modelos', async () => {
  const vistos = []; globalThis.fetch = async (url) => { vistos.push(/models\/([^:]+):/.exec(String(url))[1]); return audioOk(); };
  await ttsBenchmark('x', ['a', 'b']); assert.deepEqual(vistos, ['a', 'b']);
});
