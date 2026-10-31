import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../js/tutor.js';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

const sseGemini = (t) => new Response(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: t }] } }] })}\n\n`, { status: 200 });
const sseOpenAI = (t) => new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\ndata: [DONE]\n\n`, { status: 200 });
const fail = (status, message) => new Response(JSON.stringify({ error: { message } }), { status });
const msgs = [{ role: 'user', content: 'oi' }];

// finge o Gemini: `byModel` diz o que cada modelo responde (modelo ausente = 404). Devolve o registro das chamadas.
function fakeGemini(byModel) {
  const calls = [];
  globalThis.fetch = async (url, opts) => {
    const model = decodeURIComponent(/models\/([^:]+):/.exec(String(url))[1]);
    calls.push({ model, body: JSON.parse(opts.body) }); const r = byModel[model];
    return r ? r() : fail(404, 'model not found');
  };
  return calls;
}
const chatGemini = (model, extra = {}) => T.chat({ provider: 'gemini', apiKey: 'k', model, mode: 'duvidas', messages: msgs, ...extra });

test('modelo sobrecarregado: usa a reserva e devolve qual respondeu', async () => {
  const calls = fakeGemini({ 'g-a': () => fail(503, 'overloaded'), 'gemini-3.5-flash-lite': () => sseGemini('Salut !') });
  const r = await chatGemini('g-a');
  assert.equal(r.text, 'Salut !'); assert.equal(r.model, 'gemini-3.5-flash-lite');
  assert.deepEqual(calls.map((c) => c.model), ['g-a', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'], 'pula o que não existe (404) e segue para o próximo');
});

test('lembra da reserva que funcionou e começa por ela', async () => {
  fakeGemini({ 'g-b': () => fail(429, 'quota'), 'gemini-3.5-flash-lite': () => sseGemini('ok') });
  await chatGemini('g-b');
  const calls = fakeGemini({ 'g-b': () => sseGemini('voltou'), 'gemini-3.5-flash-lite': () => sseGemini('reserva') });
  const r = await chatGemini('g-b');
  assert.equal(r.model, 'gemini-3.5-flash-lite'); assert.equal(calls.length, 1, 'não perde tempo testando o que falhou há pouco');
});

test('429, 408 e 404 também levam à reserva', async () => {
  for (const [i, status] of [429, 408, 404].entries()) {
    const calls = fakeGemini({ [`g-c${i}`]: () => fail(status, 'x'), 'gemini-3.5-flash-lite': () => sseGemini('ok') });
    assert.equal((await chatGemini(`g-c${i}`)).model, 'gemini-3.5-flash-lite', `status ${status}`); assert.equal(calls[0].model, `g-c${i}`);
  }
});

test('chave inválida (401/403) não tenta outros modelos', async () => {
  for (const status of [401, 403]) {
    const calls = fakeGemini({ [`g-d${status}`]: () => fail(status, 'bad key'), 'gemini-3.5-flash-lite': () => sseGemini('não deveria') });
    await assert.rejects(chatGemini(`g-d${status}`), (e) => e.status === status);
    assert.equal(calls.length, 1, `status ${status}`);
  }
});

test('tudo fora do ar: erro com código, lista de modelos tentados e mensagem clara', async () => {
  const down = () => fail(503, 'The model is overloaded.');
  fakeGemini({ 'g-f': down, 'gemini-3.1-flash-lite': down, 'gemini-3.5-flash-lite': down, 'gemini-2.5-flash-lite': down, 'gemini-2.5-flash': down });
  const e = await chatGemini('g-f').then(() => assert.fail('deveria falhar'), (x) => x);
  assert.equal(e.status, 503); assert.ok(e.tried.length >= 3 && e.tried.length <= 4, `tentou ${e.tried.length}`);
  assert.match(T.friendlyError(e), /instável \(erro 503/);
  assert.match(T.errorDetail(e), /HTTP 503 · The model is overloaded\. · modelos tentados: g-f/);
});

test('o erro mostrado é o do modelo escolhido, não o "não existe" das reservas', async () => {
  fakeGemini({ 'g-g': () => fail(503, 'overloaded') }); // reservas respondem 404
  const e = await chatGemini('g-g').then(() => assert.fail('deveria falhar'), (x) => x);
  assert.equal(e.status, 503);
});

test('se o texto já começou a chegar, não troca de modelo no meio', async () => {
  const got = [];
  globalThis.fetch = async (url) => {
    const model = /models\/([^:]+):/.exec(String(url))[1];
    if (model === 'g-h') { // começa a transmitir e depois cai
      const enc = new TextEncoder(); let n = 0;
      return new Response(new ReadableStream({ pull(c) { if (n++ === 0) c.enqueue(enc.encode(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Bonj' }] } }] })}\n\n`)); else c.error(new TypeError('rede caiu')); } }), { status: 200 });
    }
    got.push(model); return sseGemini('outro');
  };
  await assert.rejects(chatGemini('g-h', { onText: () => {} }), /rede caiu/);
  assert.deepEqual(got, []);
});

test('cancelar (AbortSignal) não dispara reservas', async () => {
  const ctl = new AbortController(); ctl.abort();
  let n = 0;
  globalThis.fetch = async (url, opts) => { n++; if (opts.signal.aborted) throw new DOMException('abortado', 'AbortError'); return fail(503, 'x'); };
  await assert.rejects(chatGemini('g-i', { signal: ctl.signal }), (e) => e.name === 'AbortError');
  assert.equal(n, 1, 'só a primeira tentativa; cancelar não passa para a reserva');
});

test('o contexto extra (pontos fracos) é anexado às instruções do modelo', async () => {
  const calls = fakeGemini({ 'g-j': () => sseGemini('ok') });
  await chatGemini('g-j', { mode: 'free', context: 'Points faibles : être — je.' });
  const sys = calls[0].body.systemInstruction.parts[0].text;
  assert.match(sys, /Tu t'appelles Clara/); assert.match(sys, /Points faibles : être — je\.$/);
  const calls2 = fakeGemini({ 'g-k': () => sseGemini('ok') });
  await chatGemini('g-k', { mode: 'free' });
  assert.doesNotMatch(calls2[0].body.systemInstruction.parts[0].text, /Points faibles/);
});

test('Groq e Mistral (formato OpenAI) também têm reserva', async () => {
  const used = [];
  globalThis.fetch = async (url, opts) => { const m = JSON.parse(opts.body).model; used.push(m); return m === 'llama-3.3-70b-versatile' ? fail(503, 'over capacity') : sseOpenAI('Bonjour'); };
  const r = await T.chat({ provider: 'groq', apiKey: 'k', model: 'llama-3.3-70b-versatile', mode: 'duvidas', messages: msgs });
  assert.equal(r.text, 'Bonjour'); assert.equal(r.model, 'llama-3.1-8b-instant'); assert.deepEqual(used, ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']);
});

test('modelo que devolve vazio vira erro claro', async () => {
  fakeGemini({ 'g-l': () => new Response('data: {"candidates":[{"content":{"parts":[]}}]}\n\n', { status: 200 }) });
  await assert.rejects(chatGemini('g-l'), /não devolveu texto/);
});

test('mensagens de erro em português para cada situação', () => {
  const E = (status, message = '') => Object.assign(new Error(message), { status });
  assert.match(T.friendlyError(E(401)), /Chave inválida/);
  assert.match(T.friendlyError(E(400, 'API key not valid')), /Chave da API inválida/);
  assert.match(T.friendlyError(E(404)), /Modelo não encontrado/);
  assert.match(T.friendlyError(E(408)), /demorou demais/);
  assert.match(T.friendlyError(E(429)), /Limite gratuito/);
  assert.match(T.friendlyError(E(500)), /erro 500/);
  assert.match(T.friendlyError(new TypeError('fetch failed')), /Sem conexão/);
  assert.equal(T.friendlyError(Object.assign(new Error(), { name: 'AbortError' })), 'Cancelado.');
});

test('transcrição: usa a reserva, devolve o texto limpo e trata “vazio”', async () => {
  const blob = new Blob([new Uint8Array(2000)], { type: 'audio/webm' });
  const reply = (text) => () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });
  const calls = fakeGemini({ 't-a': () => fail(500, 'internal'), 'gemini-3.5-flash-lite': reply('« Bonjour, je m’appelle Willy. »') });
  assert.equal(await T.transcribe({ provider: 'gemini', apiKey: 'k', model: 't-a', blob }), 'Bonjour, je m’appelle Willy.');
  assert.equal(T.transcribe.lastModel, 'gemini-3.5-flash-lite'); assert.equal(calls[0].model, 't-a');
  assert.equal(calls.at(-1).body.contents[0].parts[1].inlineData.mimeType, 'audio/webm');
  fakeGemini({ 't-b': reply('<vazio>') });
  assert.equal(await T.transcribe({ provider: 'gemini', apiKey: 'k', model: 't-b', blob }), '');
});

test('transcrição: Groq usa o Whisper e Mistral não transcreve', async () => {
  const blob = new Blob([new Uint8Array(100)], { type: 'audio/webm' });
  let url = '';
  globalThis.fetch = async (u) => { url = String(u); return new Response(JSON.stringify({ text: ' Salut ' }), { status: 200 }); };
  assert.equal(await T.transcribe({ provider: 'groq', apiKey: 'k', blob }), 'Salut'); assert.match(url, /audio\/transcriptions$/);
  await assert.rejects(T.transcribe({ provider: 'mistral', apiKey: 'k', blob }), /não transcreve/);
});

test('qual provedor transcreve: o escolhido se puder, senão o que tiver chave', () => {
  assert.equal(T.transcribeProvider({ provider: 'gemini', keys: { gemini: 'a' } }), 'gemini');
  assert.equal(T.transcribeProvider({ provider: 'mistral', keys: { mistral: 'a', groq: 'b' } }), 'groq');
  assert.equal(T.transcribeProvider({ provider: 'mistral', keys: { mistral: 'a' } }), null);
});
