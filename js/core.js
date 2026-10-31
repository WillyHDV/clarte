// Núcleo compartilhado pelas telas: elemento raiz, atalhos de estado, fala, navegação, limpeza ao sair e provedor de IA.
import * as V from './speech.js';
import * as S from './store.js';
import * as T from './tutor.js';
import { toast } from './ui.js';

export const $app = document.getElementById('app');
export const st = () => S.get();
export const rate = () => (st().settings.slow ? 0.7 : 0.9);
export async function speak(text, opts) { await V.speak(text, opts); if (V.voiceNote) toast(V.voiceNote); }
// função chamada ao sair da tela atual; cada tela registra a sua com setCleanup()
let cleanup = null;
export const setCleanup = (fn) => { cleanup = fn; };
export function runCleanup() { if (cleanup) { try { cleanup(); } catch (e) { /* ignore */ } cleanup = null; } }

// o roteador (js/app.js) se registra aqui, para as telas poderem navegar sem importá-lo
let router = () => {};
export const onRoute = (fn) => { router = fn; };
export function go(hash) { if (location.hash === hash) router(); else location.hash = hash; }

// ---------- professor de IA ----------
export const cur = () => { const s = st().settings; const p = s.provider in T.PROVIDERS ? s.provider : 'gemini'; return { p, def: T.PROVIDERS[p], key: (s.keys || {})[p] || '', model: (s.models || {})[p] || T.PROVIDERS[p].model }; };
export const provOptions = (sel) => Object.entries(T.PROVIDERS).map(([id, v]) => `<option value="${id}" ${id === sel ? 'selected' : ''}>${v.label}</option>`).join('');
export const CHAT_KEY = S.CHAT_KEY;
export const loadChats = () => { try { return JSON.parse(localStorage.getItem(CHAT_KEY)) || {}; } catch (e) { return {}; } };
export const saveChats = (c) => { try { localStorage.setItem(CHAT_KEY, JSON.stringify(c)); } catch (e) { /* ignore */ } };
