// Voz: síntese (ouvir) e reconhecimento (falar).
// Ouvir: voz francesa do aparelho (Edge no PC, Google no Android) ou, se não houver, voz natural do Gemini (grátis, com cache).
import * as S from './store.js';
import * as T from './tutor.js';
import * as N from './native.js';

let voices = [];
const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
const loadVoices = () => { voices = synth ? synth.getVoices() : []; };
if (synth) { loadVoices(); synth.onvoiceschanged = loadVoices; }

export const canSpeak = !!synth;
let nativeVoz = null; let nativeInit = null; let nativeErro = ''; // voz do Android (plugin TextToSpeech), preenchida por initNativeVoice()
const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
export const canListen = !!Rec;

const frVoices = () => voices.filter((v) => /^fr[-_]/i.test(v.lang));
function frVoice() {
  const fr = frVoices();
  return fr.find((v) => /fr[-_]FR/i.test(v.lang) && /natural|online/i.test(v.name)) || fr.find((v) => /fr[-_]FR/i.test(v.lang) && /google/i.test(v.name)) || fr.find((v) => /fr[-_]FR/i.test(v.lang)) || fr[0] || null;
}
export const hasFrenchVoice = () => !!frVoice() || !!(nativeVoz && nativeVoz.ok);
export const webVoiceCount = () => voices.length;
export const frenchVoiceName = () => { const v = frVoice(); return v ? v.name : nativeVoz && nativeVoz.ok ? nativeVoz.nome : ''; };

async function voicesReady() {
  await initNativeVoice();
  return new Promise((res) => {
    if (!synth) return res();
    loadVoices(); if (voices.length) return res();
    const t = setTimeout(res, 800);
    synth.addEventListener('voiceschanged', () => { clearTimeout(t); loadVoices(); res(); }, { once: true });
  });
}

const clean = (t) => String(t).replace(/<[^>]+>/g, '').replace(/_{2,}/g, ' ').replace(/\s+/g, ' ').trim();
const geminiKey = () => (S.get().settings.keys || {}).gemini || '';

// Qual voz será usada agora? ('browser' = voz do aparelho, 'gemini' = voz natural online)
export function engineInfo() {
  initNativeVoice();
  const mode = S.get().settings.voiceEngine || 'auto';
  const hasFr = hasFrenchVoice(); const key = !!geminiKey(); const pausa = key ? lerPausa() : null; // pausa: limite gratuito do Gemini atingido
  const gemini = { engine: pausa ? 'browser' : 'gemini', hasFr, mode, pausa };
  if (mode === 'gemini' && key) return gemini;
  if (mode === 'browser') return { engine: 'browser', hasFr, mode, pausa };
  if (!hasFr && key) return gemini;
  return { engine: 'browser', hasFr, mode, pausa };
}

// ---------- voz do aparelho ----------
function browserSpeak(text, rate, cancel = true) {
  if (nativeVoz && nativeVoz.ok && nativeTts()) return nativeSpeak(text, rate, cancel).then((ok) => (ok || !synth ? undefined : webSpeak(text, rate, cancel)));
  return webSpeak(text, rate, cancel);
}
function webSpeak(text, rate, cancel = true) {
  return new Promise((resolve) => {
    if (!synth) return resolve();
    if (cancel) synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR'; u.rate = rate;
    const v = frVoice(); if (v) u.voice = v;
    const done = () => resolve();
    u.onend = done; u.onerror = done;
    setTimeout(done, 20000);
    synth.speak(u);
  });
}

// ---------- voz do Android (app): o plugin TextToSpeech fala pelo mecanismo do aparelho (Samsung, Google), sem passar pelo WebView ----------
const nativeTts = () => (N.isNative() && N.hasPlugin('TextToSpeech') ? globalThis.Capacitor.Plugins.TextToSpeech : null);
const msgErro = (e) => String((e && (e.message || e.errorMessage)) || e).replace(/\s+/g, ' ').slice(0, 120);
export function initNativeVoice() { // consulta uma vez; sem o plugin devolve null e tenta de novo na próxima chamada
  if (nativeInit) return nativeInit;
  const p = nativeTts(); if (!p) return Promise.resolve(null);
  nativeInit = (async () => {
    try {
      const sup = await p.isLanguageSupported({ lang: 'fr-FR' });
      let voices = []; try { voices = ((await p.getSupportedVoices()) || {}).voices || []; } catch (e) { /* basta o idioma */ }
      let i = voices.findIndex((v) => /^fr[-_]FR/i.test(v.lang) && v.localService !== false); if (i < 0) i = voices.findIndex((v) => /^fr[-_]/i.test(v.lang));
      nativeVoz = { ok: !!(sup && sup.supported), voice: i, nome: i >= 0 ? voices[i].name : 'voz francesa do Android', n: voices.length };
    } catch (e) { nativeVoz = { ok: false, voice: -1, nome: '', n: 0, erro: msgErro(e) }; }
    return nativeVoz;
  })();
  return nativeInit;
}
// depois de instalar a voz pela tela do Android, consulta de novo
export function recheckNativeVoice() { nativeVoz = null; nativeInit = null; return initNativeVoice(); }
export const nativeVoiceInfo = () => ({ plugin: !!nativeTts(), ...(nativeVoz || {}) });
// abre a tela do Android para instalar/atualizar os dados de voz
export async function openVoiceInstall() { const p = nativeTts(); if (!p) return false; try { await p.openInstall(); return true; } catch (e) { return false; } }
async function nativeSpeak(text, rate, cancel) {
  try {
    await nativeTts().speak({ text, lang: 'fr-FR', rate: Math.min(2, Math.max(0.3, rate)), pitch: 1, volume: 1, voice: nativeVoz.voice, queueStrategy: cancel ? 0 : 1 });
    nativeErro = ''; return true;
  } catch (e) { nativeErro = msgErro(e); return false; }
}
// Fala uma frase com a voz do aparelho e diz por onde saiu e quanto levou (uma frase de verdade passa de 0,7 s).
export async function deviceVoiceTest(text = 'Bonjour ! Ceci est un test de la voix du téléphone.') {
  await voicesReady();
  const via = nativeVoz && nativeVoz.ok ? 'android' : synth ? 'webview' : 'nenhuma';
  if (via === 'nenhuma') return { ok: false, via, erro: 'sem síntese de voz neste aparelho' };
  nativeErro = ''; const t0 = performance.now(); await browserSpeak(clean(text), 0.9); const ms = Math.round(performance.now() - t0);
  return { ok: ms > 700 && !nativeErro, via, ms, erro: nativeErro };
}

// ---------- voz natural (Gemini TTS) ----------
// O plano gratuito da voz do Gemini é bem pequeno (cerca de 10 pedidos por dia, por modelo). Ao esgotar, o app pausa a voz natural
// (sem ficar tentando e atrasando cada frase) e usa a voz do aparelho até o limite voltar.
const PAUSA = 'fr_tts_pausa';
export function lerPausa() {
  try { const p = JSON.parse(localStorage.getItem(PAUSA)); return p && p.ate > Date.now() ? p : null; } catch (e) { return null; }
}
export const geminiPausa = () => lerPausa();
// o limite diário zera à meia-noite do Pacífico (a hora de Los Angeles)
export function proximaMeiaNoitePacifico(agora = Date.now()) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(agora));
  const g = (t) => +p.find((x) => x.type === t).value;
  return agora - (agora % 1000) + 86400000 - ((g('hour') * 60 + g('minute')) * 60 + g('second')) * 1000; // meia-noite exata, sem os milissegundos de agora
}
// quando este erro 429 deixa de valer: dia (meia-noite do Pacífico), minuto (o tempo que o Google pediu) ou indefinido (30 min)
export function pausaDe(e, agora = Date.now()) {
  const d = String(e.detail || '');
  const q = /limit: (\d+)/.exec(d); const m = /model: ([\w.-]+)/.exec(d); const detalhe = q ? `limite ${q[1]}${m ? ' (' + m[1] + ')' : ''}` : '';
  if (/PerDay|per day/i.test(d)) return { ate: proximaMeiaNoitePacifico(agora), motivo: 'dia', detalhe };
  const r = /"retryDelay":\s*"(\d+(?:\.\d+)?)s"/.exec(d) || /retry in (\d+(?:\.\d+)?)s/i.exec(d);
  if (r) return { ate: agora + (Math.ceil(+r[1]) + 5) * 1000, motivo: 'minuto', detalhe };
  return { ate: agora + 30 * 60000, motivo: 'indefinido', detalhe };
}
function pausarGemini(erros) {
  const p = erros.map((e) => pausaDe(e)).sort((a, b) => a.ate - b.ate)[0]; // volta quando o primeiro modelo voltar
  try { localStorage.setItem(PAUSA, JSON.stringify(p)); } catch (e) { /* sem armazenamento */ }
}
export function limparPausa() { avisadoAte = 0; try { localStorage.removeItem(PAUSA); } catch (e) { /* ignore */ } }
const TTS_DEFAULT = ['gemini-3.8-flash-tts', 'gemini-2.5-flash-preview-tts'];
// modelos de voz que o Diagnóstico sabe comparar; o escolhido em Ajustes → Voz passa à frente dos padrões
export const TTS_CANDIDATES = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts'];
export function ttsModels() {
  const p = (S.get().settings || {}).ttsModel;
  return p && TTS_CANDIDATES.includes(p) ? [p, ...TTS_DEFAULT.filter((m) => m !== p)] : TTS_DEFAULT;
}
const ttsFetch = (model, text, signal) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
  method: 'POST', signal, headers: { 'content-type': 'application/json', 'x-goog-api-key': geminiKey() },
  body: JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } } }),
});
// Mede quanto cada modelo leva para gerar a mesma frase (não toca nem guarda): serve para escolher o mais rápido.
export async function ttsBenchmark(text, models = TTS_CANDIDATES) {
  const out = [];
  for (const model of models) {
    const t0 = performance.now();
    try {
      const res = await ttsFetch(model, text);
      if (!res.ok) { let msg = ''; try { const j = await res.json(); msg = (j.error && j.error.message) || ''; } catch (e) { /* sem corpo */ } out.push({ model, ok: false, status: res.status, message: msg.slice(0, 90) }); continue; }
      const j = await res.json(); const part = j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts && j.candidates[0].content.parts[0];
      out.push({ model, ok: !!(part && part.inlineData), ms: Math.round(performance.now() - t0), message: part && part.inlineData ? '' : 'sem áudio' });
    } catch (e) { out.push({ model, ok: false, message: String(e.message || e).slice(0, 90) }); }
  }
  return out;
}
let player = null; let ttsCtl = null;
let avisadoAte = 0;
export let voiceNote = ''; // aviso para a interface (ex.: limite gratuito atingido)

const b64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
function pcmToWav(pcm, rate = 24000) {
  const h = new DataView(new ArrayBuffer(44)); const w = (o, s) => [...s].forEach((c, i) => h.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); h.setUint32(4, 36 + pcm.length, true); w(8, 'WAVE'); w(12, 'fmt '); h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true);
  h.setUint32(24, rate, true); h.setUint32(28, rate * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true); w(36, 'data'); h.setUint32(40, pcm.length, true);
  return new Blob([h, pcm], { type: 'audio/wav' });
}
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + s.length; };
const cacheReq = (model, text) => new Request(`${location.origin}/__tts/${model}/${hash(text)}`);

async function geminiAudio(text, signal) {
  let cache = null; try { cache = await caches.open('fr-tts-v1'); } catch (e) { /* sem Cache API */ }
  const models = [...new Set([...ttsModels(), ...TTS_DEFAULT])];
  for (const model of models) { // frase já gerada por qualquer modelo conhecido vem do cache, sem rede
    if (cache) { const hit = await cache.match(cacheReq(model, text)); if (hit) return hit.blob(); }
  }
  if (lerPausa()) { const e = new Error('429'); e.status = 429; e.pausado = true; throw e; } // limite já atingido: nem tenta (o cache acima continua valendo)
  let lastErr; const lista = ttsModels(); const cotas = [];
  for (const model of lista) {
    try {
      const res = await ttsFetch(model, text, signal);
      if (!res.ok) { let detail = ''; try { detail = (await res.text()).slice(0, 1500); } catch (x) { /* sem corpo */ } const e = new Error(String(res.status)); e.status = res.status; e.detail = detail; throw e; }
      const j = await res.json(); const part = j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts && j.candidates[0].content.parts[0];
      const inl = part && part.inlineData; if (!inl) throw new Error('sem áudio');
      const bytes = b64ToBytes(inl.data);
      const blob = /wav/i.test(inl.mimeType) ? new Blob([bytes], { type: 'audio/wav' }) : pcmToWav(bytes, +(/rate=(\d+)/.exec(inl.mimeType) || [0, 24000])[1]);
      if (cache) { try { await cache.put(cacheReq(model, text), new Response(blob, { headers: { 'content-type': 'audio/wav' } })); } catch (e) { /* ignore */ } }
      return blob;
    } catch (e) { if (e.name === 'AbortError') throw e; lastErr = e; if (e.status === 429) cotas.push(e); }
  }
  if (cotas.length && cotas.length === lista.length) pausarGemini(cotas); // todos os modelos no limite
  throw lastErr || new Error('falha');
}

function playBlob(blob, rate) {
  return new Promise((resolve) => {
    const a = new Audio(URL.createObjectURL(blob)); player = a;
    a.playbackRate = Math.min(1, rate / 0.9);
    const done = () => { URL.revokeObjectURL(a.src); resolve(); };
    a.onended = done; a.onerror = done; a.onpause = () => { if (a.ended || player !== a) done(); };
    a.play().catch(done);
  });
}

async function geminiSpeak(text, rate) {
  stopSpeaking(); ttsCtl = new AbortController();
  const blob = await geminiAudio(text, ttsCtl.signal);
  return playBlob(blob, rate);
}

// Fala em fila, frase por frase, para a conversa por voz: o áudio da próxima frase já é preparado
// enquanto a anterior toca. push(texto) adiciona; done() espera tudo terminar; stop() corta.
export function createSpeaker(getRate) {
  let chain = Promise.resolve(); let stopped = false; const ctl = new AbortController(); let usedFallback = false;
  const useG = engineInfo().engine === 'gemini';
  if (useG) stopSpeaking();
  return {
    get fallback() { return usedFallback; },
    push(text) {
      const t = clean(text); if (!t || stopped) return;
      if (useG) {
        const pending = geminiAudio(t, ctl.signal).catch((e) => { if (e.name !== 'AbortError') usedFallback = true; return null; });
        chain = chain.then(async () => {
          if (stopped) return; const blob = await pending; if (stopped) return;
          if (blob) await playBlob(blob, getRate()); else await browserSpeak(t, getRate(), false);
        });
      } else {
        chain = chain.then(() => (stopped ? undefined : browserSpeak(t, getRate(), false)));
      }
    },
    done() { return chain; },
    stop() { stopped = true; ctl.abort(); stopSpeaking(); },
  };
}

// pré-carrega o áudio natural (para o próximo exercício) sem tocar
export function prefetch(text) {
  const t = clean(text || ''); if (!t || engineInfo().engine !== 'gemini') return;
  geminiAudio(t).catch(() => {});
}

// rapido: toque curto (ler uma opção ao selecioná-la) usa a voz do aparelho quando ela é francesa, sem esperar a voz natural online nem gastar o limite dela
export async function speak(text, { rate = 0.9, rapido = false } = {}) {
  const t = clean(text); if (!t) return;
  await voicesReady();
  voiceNote = '';
  const ei = engineInfo();
  if (rapido && ei.hasFr) return browserSpeak(t, rate);
  if (ei.engine === 'gemini') {
    try { return await geminiSpeak(t, rate); } catch (e) {
      if (e.name === 'AbortError') return;
      voiceNote = e.status === 429 ? 'Limite gratuito da voz natural atingido; usando a voz do aparelho até ele voltar.' : 'Voz natural indisponível; usando a voz do aparelho.';
      const p = lerPausa(); if (p) avisadoAte = p.ate; // já avisou desta pausa
    }
  } else if (ei.pausa && (ei.mode === 'gemini' || !ei.hasFr)) {
    if (avisadoAte !== ei.pausa.ate) { avisadoAte = ei.pausa.ate; voiceNote = 'Voz natural em pausa (limite gratuito); usando a voz do aparelho.'; } // um aviso por pausa, não a cada frase
  } else if (!ei.hasFr && !voiceNote) {
    voiceNote = 'Seu aparelho não tem voz francesa: o áudio sai com sotaque brasileiro. Veja Ajustes → Voz.';
  }
  return browserSpeak(t, rate);
}
export function stopSpeaking() {
  if (synth) synth.cancel();
  if (nativeVoz && nativeTts()) nativeTts().stop().catch(() => {});
  if (ttsCtl) { ttsCtl.abort(); ttsCtl = null; }
  if (player) { const p = player; player = null; p.pause(); }
}

// ---------- gravação do microfone (você fala quanto quiser e toca em Enviar) ----------
export const canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

// Abre o microfone e grava até stop(). onLevel(0..1) recebe o volume para animar a tela.
export async function createRecorder({ onLevel } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) => MediaRecorder.isTypeSupported(t)) || '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = []; let peak = -1; let raf = 0; let ctx = null; // peak -1 = sem medidor de volume (não bloqueia o envio)
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const an = ctx.createAnalyser(); an.fftSize = 512; ctx.createMediaStreamSource(stream).connect(an);
    const buf = new Uint8Array(an.fftSize); peak = 0;
    const tick = () => { an.getByteTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) { const d = (buf[i] - 128) / 128; s += d * d; } const rms = Math.sqrt(s / buf.length); if (rms > peak) peak = rms; if (onLevel) onLevel(rms); raf = requestAnimationFrame(tick); };
    tick();
  } catch (e) { /* sem medidor de volume */ }
  const started = Date.now();
  const cleanup = () => { cancelAnimationFrame(raf); try { ctx && ctx.close(); } catch (e) { /* ignore */ } stream.getTracks().forEach((t) => t.stop()); };
  rec.start(250);
  return {
    stop() {
      return new Promise((resolve) => {
        const done = () => { cleanup(); resolve({ blob: new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' }), ms: Date.now() - started, peak }); };
        if (rec.state === 'inactive') return done();
        rec.onstop = done; try { rec.stop(); } catch (e) { done(); }
      });
    },
    cancel() { try { rec.onstop = null; if (rec.state !== 'inactive') rec.stop(); } catch (e) { /* ignore */ } cleanup(); },
  };
}

// ---------- falar sem o reconhecimento do navegador (ex.: dentro do app Android, cujo WebView não o tem) ----------
// Grava a fala e a IA transcreve (Gemini ou Groq, o mesmo caminho da ligação com a Clara). Precisa de chave.
export const canDictate = () => canRecord && !!T.transcribeProvider(S.get().settings || {});
// Reconhecimento do navegador: no app Android o WebView até expõe a API, mas ela não é confiável ali; o app usa gravação + IA.
export const browserRec = () => canListen && !N.isNative();
// Dá para o aluno falar? Pelo reconhecimento do navegador ou por gravação + IA.
export const canTalk = () => browserRec() || canDictate();

// Mesma forma de listen(): { stop() } encerra a gravação e, depois da transcrição, chama onFinal(texto).
// onPhase('rec' | 'think') avisa a tela; onError(código, mensagem) cobre microfone negado e falha da IA.
export function dictate({ onPhase, onFinal, onError }) {
  const s = S.get().settings || {}; const tp = T.transcribeProvider(s);
  if (!canRecord || !tp) { onError && onError('unsupported'); return { stop() {}, cancel() {} }; }
  let rec = null; let ctl = null; let state = 'open'; // open → stopping → done
  const fail = (er, msg) => { if (state === 'done') return; state = 'done'; onError && onError(er, msg); };
  const finish = async () => {
    if (state !== 'stopping' || !rec) return;
    const { blob, ms, peak } = await rec.stop();
    if (state === 'done') return;
    // só silêncio quase total é descartado: fala baixa passa e é amplificada antes de transcrever
    if (ms < 800 || (peak >= 0 && peak < 0.003)) { state = 'done'; onFinal && onFinal(''); return; }
    onPhase && onPhase('think'); ctl = new AbortController();
    try {
      const text = await T.transcribe({ provider: tp, apiKey: (s.keys || {})[tp], model: (s.models || {})[tp] || T.PROVIDERS[tp].model, blob, signal: ctl.signal });
      if (state === 'done') return; state = 'done'; onFinal && onFinal(text || '');
    } catch (e) { fail(e && e.name === 'AbortError' ? 'aborted' : 'network', T.friendlyError(e)); }
  };
  createRecorder().then((r) => {
    rec = r; if (state === 'done') { r.cancel(); return; }
    onPhase && onPhase('rec'); if (state === 'stopping') finish();
  }).catch((e) => fail(e && e.name === 'NotAllowedError' ? 'not-allowed' : 'audio-capture'));
  return {
    stop() { if (state !== 'open') return; state = 'stopping'; finish(); },
    cancel() { state = 'done'; if (rec) rec.cancel(); if (ctl) ctl.abort(); },
  };
}

// ---------- reconhecimento de fala ----------
export function listen({ onInterim, onFinal, onError, lang = 'fr-FR' }) {
  if (!Rec) { onError && onError('unsupported'); return { stop() {} }; }
  const r = new Rec();
  r.lang = lang; r.interimResults = true; r.maxAlternatives = 1; r.continuous = false;
  let finalText = '';
  r.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += t; else interim += t;
    }
    if (onInterim) onInterim((finalText + interim).trim());
  };
  r.onerror = (e) => { onError && onError(e.error); };
  r.onend = () => { onFinal && onFinal(finalText.trim()); };
  try { r.start(); } catch (e) { onError && onError('start-failed'); }
  return { stop() { try { r.stop(); } catch (e) { /* ignore */ } } };
}

// Reconhecimento paciente, para quem fala devagar ou com pausas: em vez de cortar no primeiro silêncio do
// Chrome, acumula tudo e só termina depois de `patienceMs` sem fala (mais tempo se a frase parece incompleta),
// ou quando você toca em "Terminei" (finish). Reinicia sozinho se o Chrome encerrar antes da hora.
export function listenPatient({ onInterim, onFinal, onError, patienceMs = 4500, initialMs = 12000, lang = 'fr-FR' }) {
  if (!Rec) { onError && onError('unsupported'); return { finish() {}, abort() {} }; }
  let carry = ''; let current = ''; let r = null; let timer = null; let done = false; let restarts = 0;
  const norm = (s) => s.toLowerCase().replace(/[’']/g, "'").replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ').trim();
  // junta os resultados sem duplicar (o Chrome do Android às vezes repete a frase inteira a cada resultado)
  const merge = (parts) => {
    let acc = '';
    for (const p of parts) {
      const t = p.trim(); if (!t) continue;
      if (acc && norm(t).startsWith(norm(acc))) acc = t;
      else if (acc && norm(acc).endsWith(norm(t))) continue;
      else acc = acc ? `${acc} ${t}` : t;
    }
    return acc;
  };
  const total = () => [carry, current].filter(Boolean).join(' ').trim();
  const incomplete = (t) => /(,|\b(et|ou|mais|donc|parce que|que|qui|je|tu|il|elle|nous|vous|le|la|les|un|une|des|de|du|à|au|aux|en|dans|avec|pour|ne|n'|j'|l'|d'|c'|s'|m'|t'|est-ce que|comment|où|pourquoi))\s*$/i.test(t.trim());
  const finalize = () => { if (done) return; done = true; clearTimeout(timer); try { r && r.stop(); } catch (e) { /* ignore */ } onFinal && onFinal(total()); };
  const arm = () => { clearTimeout(timer); const t = total(); timer = setTimeout(finalize, t ? patienceMs + (incomplete(t) ? 1800 : 0) : initialMs); };
  const start = () => {
    r = new Rec(); r.lang = lang; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1; current = '';
    r.onresult = (e) => {
      const parts = []; for (let i = 0; i < e.results.length; i++) parts.push(e.results[i][0].transcript);
      current = merge(parts); onInterim && onInterim(total()); arm();
    };
    r.onerror = (e) => {
      if (done || e.error === 'no-speech' || e.error === 'aborted') return;
      if (/not-allowed|service-not-allowed|network|audio-capture|language-not-supported/.test(e.error)) { done = true; clearTimeout(timer); onError && onError(e.error); }
    };
    r.onend = () => {
      if (done) return;
      carry = total(); current = '';
      if (restarts++ < 10) setTimeout(() => { if (!done) { try { start(); } catch (err) { finalize(); } } }, 150); else finalize();
    };
    try { r.start(); } catch (err) { done = true; clearTimeout(timer); onError && onError('start-failed'); }
  };
  start(); arm();
  return { finish: finalize, abort() { done = true; clearTimeout(timer); try { r && r.abort ? r.abort() : r.stop(); } catch (e) { /* ignore */ } } };
}
