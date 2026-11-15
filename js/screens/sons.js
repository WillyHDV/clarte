// Sons do francês: a lista de sons difíceis para quem fala português e a lição de cada um (ouvir e comparar, depois treinar).
import * as S from '../store.js';
import { $app, rate, rateDevagar, speak } from '../core.js';
import { esc, I, linha, estado } from '../ui.js';
import { grupoPorId, progressoSons, sonsGrupos } from '../sons.js';

const forca = (it) => S.strength(it);
const exemplos = (g) => g.pares.slice(0, 3).map((p) => p.palavras.map((w) => w.fr).join(' / ')).join(' · ');
const progressoTxt = (p) => (p.vistos ? `${p.pct}% firme${p.rever ? ` · ${p.rever} para rever` : ''}` : 'Novo');

function lista() {
  const tudo = progressoSons(sonsGrupos(), forca);
  $app.innerHTML = `
    <header class="apphead"><button class="back" data-go="#/praticar" aria-label="Voltar para Praticar">${I('chevron-left')}</button><div class="hello"><b>Sons do francês</b><small>Treino de ouvido · use fones</small></div></header>
    ${estado('info', 'headphones', 'Primeiro o ouvido, depois a boca', 'Palavras que só mudam num som. Quem aprende a separar os sons ouve melhor e fala melhor.')}
    <button class="btn primary wide" data-go="#/practice/sons" id="streinar">${I('player-play')} Treinar todos os sons</button>
    <p class="som-prog">${tudo.vistos ? `${tudo.vistos} de ${tudo.total} pares já treinados · ${tudo.pct}% firme` : `${tudo.total} pares para treinar em ${sonsGrupos().length} sons`}</p>
    <div class="grupo">${sonsGrupos().map((g) => linha({ icone: 'headphones', titulo: g.titulo, resumo: exemplos(g), valor: progressoTxt(progressoSons([g], forca)), go: `#/sons/${g.id}` })).join('')}</div>`;
}

function licao(g) {
  const prog = progressoSons([g], forca);
  $app.innerHTML = `
    <header class="apphead"><button class="back" data-go="#/sons" aria-label="Voltar para os sons">${I('chevron-left')}</button><div class="hello"><b>${esc(g.titulo)}</b><small>${esc(g.ipa)} · ${progressoTxt(prog)}</small></div></header>
    <section class="card som-dica"><h3>${esc(g.resumo)}</h3><p>${esc(g.dica)}</p></section>
    <button class="btn primary wide" data-go="#/practice/sons/${g.id}" id="streinar">${I('player-play')} Treinar este som</button>
    <div class="som-topo"><h2 class="sec">Ouça e compare</h2><button class="pill" id="sdevagar" aria-pressed="false">${I('clock')} Devagar</button></div>
    <div class="sompares">${g.pares.map((p) => `<div class="sompar">${p.palavras.map((w) => `<button class="sompal" data-w="${esc(w.fr)}" aria-label="Ouvir ${esc(w.fr)}">${I('volume')}<span><b>${esc(w.fr)}</b><small>${esc(w.ipa)} · ${esc(w.pt)}</small></span></button>`).join('')}</div>`).join('')}</div>`;
  let devagar = false; const bt = document.getElementById('sdevagar');
  bt.onclick = () => { devagar = !devagar; bt.setAttribute('aria-pressed', String(devagar)); bt.classList.toggle('on', devagar); };
  document.querySelectorAll('.sompal').forEach((b) => {
    b.onclick = () => { b.classList.add('playing'); speak(b.dataset.w, { rate: devagar ? rateDevagar() : rate(), rapido: true }).then(() => b.classList.remove('playing')); };
  });
}

export function sonsPage(grupoId) {
  const g = grupoId ? grupoPorId(grupoId) : null;
  if (grupoId && !g) { location.hash = '#/sons'; return; } // endereço antigo ou digitado errado
  return g ? licao(g) : lista();
}
