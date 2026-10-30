// Voz: síntese (ouvir) e reconhecimento (falar).
// Ouvir: voz francesa do aparelho (Edge no PC, Google no Android) ou, se não houver, voz natural do Gemini (grátis, com cache).
import * as S from './store.js';

let voices = [];
const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
const loadVoices = () => { voices = synth ? synth.getVoices() : []; };
if (synth) { loadVoices(); synth.onvoiceschanged = loadVoices; }

export const canSpeak = !!synth;
const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
export const canListen = !!Rec;

const frVoices = () => voices.filter((v) => /^fr[-_]/i.test(v.lang));
function frVoice() {
  const fr = frVoices();
  return fr.find((v) => /fr[-_]FR/i.test(v.lang) && /natural|online/i.test(v.name)) || fr.find((v) => /fr[-_]FR/i.test(v.lang) && /google/i.test(v.name)) || fr.find((v) => /fr[-_]FR/i.test(v.lang)) || fr[0] || null;
}
export const hasFrenchVoice = () => !!frVoice();
export const frenchVoiceName = () => { const v = frVoice(); return v ? v.name : ''; };

function voicesReady() {
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
  const mode = S.get().settings.voiceEngine || 'auto';
  const hasFr = hasFrenchVoice(); const key = !!geminiKey();
  if (mode === 'gemini' && key) return { engine: 'gemini', hasFr, mode };
  if (mode === 'browser') return { engine: 'browser', hasFr, mode };
  if (!hasFr && key) return { engine: 'gemini', hasFr, mode };
  return { engine: 'browser', hasFr, mode };
}

// ---------- voz do aparelho ----------
function browserSpeak(text, rate) {
  return new Promise((resolve) => {
    if (!synth) return resolve();
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR'; u.rate = rate;
    const v = frVoice(); if (v) u.voice = v;
    const done = () => resolve();
    u.onend = done; u.onerror = done;
    setTimeout(done, 20000);
    synth.speak(u);
  });
}

// ---------- voz natural (Gemini TTS) ----------
const TTS_MODELS = ['gemini-3.8-flash-tts', 'gemini-2.5-flash-preview-tts'];
let player = null; let ttsCtl = null;
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
  for (const model of TTS_MODELS) {
    if (cache) { const hit = await cache.match(cacheReq(model, text)); if (hit) return hit.blob(); }
  }
  let lastErr;
  for (const model of TTS_MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', signal, headers: { 'content-type': 'application/json', 'x-goog-api-key': geminiKey() },
        body: JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } } }),
      });
      if (!res.ok) { const e = new Error(String(res.status)); e.status = res.status; throw e; }
      const j = await res.json(); const part = j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts && j.candidates[0].content.parts[0];
      const inl = part && part.inlineData; if (!inl) throw new Error('sem áudio');
      const bytes = b64ToBytes(inl.data);
      const blob = /wav/i.test(inl.mimeType) ? new Blob([bytes], { type: 'audio/wav' }) : pcmToWav(bytes, +(/rate=(\d+)/.exec(inl.mimeType) || [0, 24000])[1]);
      if (cache) { try { await cache.put(cacheReq(model, text), new Response(blob, { headers: { 'content-type': 'audio/wav' } })); } catch (e) { /* ignore */ } }
      return blob;
    } catch (e) { if (e.name === 'AbortError') throw e; lastErr = e; if (e.status === 429) break; }
  }
  throw lastErr || new Error('falha');
}

async function geminiSpeak(text, rate) {
  stopSpeaking(); ttsCtl = new AbortController();
  const blob = await geminiAudio(text, ttsCtl.signal);
  return new Promise((resolve) => {
    const a = new Audio(URL.createObjectURL(blob)); player = a;
    a.playbackRate = Math.min(1, rate / 0.9);
    const done = () => { URL.revokeObjectURL(a.src); resolve(); };
    a.onended = done; a.onerror = done; a.onpause = () => { if (a.ended || player !== a) done(); };
    a.play().catch(done);
  });
}

// pré-carrega o áudio natural (para o próximo exercício) sem tocar
export function prefetch(text) {
  const t = clean(text || ''); if (!t || engineInfo().engine !== 'gemini') return;
  geminiAudio(t).catch(() => {});
}

export async function speak(text, { rate = 0.9 } = {}) {
  const t = clean(text); if (!t) return;
  await voicesReady();
  voiceNote = '';
  if (engineInfo().engine === 'gemini') {
    try { return await geminiSpeak(t, rate); } catch (e) {
      if (e.name === 'AbortError') return;
      voiceNote = e.status === 429 ? 'Limite gratuito da voz natural atingido por agora; usando a voz do aparelho.' : 'Voz natural indisponível; usando a voz do aparelho.';
    }
  } else if (!hasFrenchVoice() && !voiceNote) {
    voiceNote = 'Seu aparelho não tem voz francesa: o áudio sai com sotaque brasileiro. Veja Ajustes → Voz.';
  }
  return browserSpeak(t, rate);
}
export function stopSpeaking() {
  if (synth) synth.cancel();
  if (ttsCtl) { ttsCtl.abort(); ttsCtl = null; }
  if (player) { const p = player; player = null; p.pause(); }
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
