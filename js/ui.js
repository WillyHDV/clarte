// Peças de interface compartilhadas: escape de HTML, ícones de linha (estilo Feather) e avisos rápidos.
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

import { TABLER } from './icons.js';

// Nomes antigos do app apontam para os ícones do conjunto Tabler (todos de linha, traço 2 px, mesmo estilo).
const LEGADO = { back: 'chevron-left', next: 'chevron-right', mic: 'microphone', pause: 'player-pause', play: 'player-play', redo: 'rotate-clockwise', zap: 'bolt', settings: 'adjustments', chat: 'message-circle', file: 'file-text', eyeoff: 'eye-off' };
export const ICONS = { ...TABLER, ...Object.fromEntries(Object.entries(LEGADO).map(([antigo, novo]) => [antigo, TABLER[novo]])) };
export const I = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

let lastToast = '';
export function toast(msg) {
  if (msg === lastToast) return; lastToast = msg;
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => { t.remove(); if (lastToast === msg) lastToast = ''; }, 6000);
}
// ---------- avatares do perfil ----------
// "initial" = a inicial do nome; os demais são desenhos de linha em cores suaves (contraste do desenho com o fundo conferido nos testes).
export const AVATARS = [
  { id: 'initial', nome: 'Inicial', bg: '#2b4268', fg: '#ffffff' },
  { id: 'moon-stars', nome: 'Lua', bg: '#f3c9b6', fg: '#6b2615' },
  { id: 'leaf', nome: 'Folha', bg: '#cfe5d8', fg: '#17502f' },
  { id: 'mountain', nome: 'Montanha', bg: '#d6e0f2', fg: '#1f3d68' },
  { id: 'sun', nome: 'Sol', bg: '#f8e3a8', fg: '#5e3a00' },
  { id: 'flower', nome: 'Flor', bg: '#f2d2e0', fg: '#6d1d44' },
  { id: 'paw', nome: 'Patinha', bg: '#e4dccf', fg: '#4c3a22' },
  { id: 'compass', nome: 'Bússola', bg: '#d4e8ea', fg: '#124a55' },
  { id: 'coffee', nome: 'Café', bg: '#e9d8c8', fg: '#5a3418' },
];
export const avatarDe = (id) => AVATARS.find((a) => a.id === id) || AVATARS[0];
// Bolinha do avatar. size em px; `nome` dá a inicial.
export const avatarHtml = (id, nome = 'W', size = 40) => {
  const a = avatarDe(id); const px = Math.round(size * 0.5);
  return `<span class="avatar" style="width:${size}px;height:${size}px;background:${a.bg};color:${a.fg};font-size:${px}px">${a.id === 'initial' ? esc(String(nome).trim().charAt(0).toUpperCase() || 'W') : I(a.id)}</span>`;
};

// ---------- peças de lista ----------
// Linha de lista que abre algo: ícone, título, resumo e seta. `go` vai para data-go (o app navega para essa rota).
export const linha = ({ icone, titulo, resumo = '', valor = '', go = '', id = '', chevron = true }) => {
  const tag = go || id ? 'button' : 'div';
  return `<${tag} class="linha" ${go ? `data-go="${esc(go)}"` : ''} ${id ? `id="${esc(id)}"` : ''}>${icone ? `<span class="linha-i">${I(icone)}</span>` : ''}<span class="linha-t"><b>${esc(titulo)}</b>${resumo ? `<small>${esc(resumo)}</small>` : ''}</span>${valor ? `<span class="linha-v">${esc(valor)}</span>` : ''}${chevron && (go || id) ? I('chevron-right') : ''}</${tag}>`;
};
