// Barra de navegação de baixo: Trilha, Clara (no centro, botão de ligar) e Praticar (com o contador do Reforço).
// Evolução e Ajustes ficam no perfil (avatar no cabeçalho da Trilha).
import { I } from './ui.js';
import * as S from './store.js';
import { readiness } from './progress.js';

export const ABAS = [
  { id: 'home', rotulo: 'Trilha', icone: 'route', href: '#/' },
  { id: 'tutor', rotulo: 'Clara', icone: 'phone', href: '#/tutor', centro: true },
  { id: 'praticar', rotulo: 'Praticar', icone: 'barbell', href: '#/praticar' },
];
// em qual aba cada rota cai; as demais (perfil, ajustes, evolução…) não marcam nenhuma
export const AREA = { '': 'home', home: 'home', unit: 'home', step: 'home', tutor: 'tutor', praticar: 'praticar', practice: 'praticar' };

// itens que pedem reforço (o que está fraco e os erros que vencem hoje)
export const reforcoPendentes = () => readiness().weakCount + S.dueMistakes().length;

export function montarBarra() {
  if (document.querySelector('nav.tabbar')) return;
  const nav = document.createElement('nav'); nav.className = 'tabbar'; nav.setAttribute('aria-label', 'Navegação principal');
  nav.innerHTML = ABAS.map((a) => `<a class="tab ${a.centro ? 'tab-call' : ''}" href="${a.href}" data-p="${a.id}" aria-label="${a.rotulo}">${a.centro ? `<span class="bubble">${I(a.icone)}</span>` : I(a.icone)}<span class="rot">${a.rotulo}</span></a>`).join('');
  document.body.appendChild(nav);
}

// marca a aba da rota atual e atualiza o contador do Praticar
export function marcarAba(pagina) {
  const alvo = AREA[pagina || ''];
  document.querySelectorAll('nav.tabbar .tab').forEach((a) => { const on = a.dataset.p === alvo; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const tab = document.querySelector('nav.tabbar .tab[data-p="praticar"]'); if (!tab) return;
  let n = 0; try { n = reforcoPendentes(); } catch (e) { n = 0; }
  let b = tab.querySelector('.badge');
  if (!n) { if (b) b.remove(); tab.setAttribute('aria-label', 'Praticar'); return; }
  if (!b) { b = document.createElement('span'); b.className = 'badge'; tab.appendChild(b); }
  b.textContent = n > 99 ? '99+' : String(n); tab.setAttribute('aria-label', `Praticar, ${n} para reforçar`);
}
