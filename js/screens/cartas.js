// Minhas cartas: palavras que você guardou (da Leitura e do dicionário), com treino e edição.
import * as S from '../store.js';
import { $app, abrirFolha } from '../core.js';
import { esc, I, linha, toast } from '../ui.js';

// cartas novas ou já enfraquecendo: as que valem uma revisão agora
const paraRever = (cartas) => cartas.filter((c) => { const s = S.strength(`card:${c.id}`); return s === null || s < 0.85; }).length;

export function cartasPage() {
  const cartas = S.cartas().slice().reverse(); const rever = paraRever(cartas);
  $app.innerHTML = `
    <header class="apphead"><button class="back" data-go="#/praticar" aria-label="Voltar para Praticar">${I('chevron-left')}</button><div class="hello"><b>Minhas cartas</b><small>${cartas.length === 1 ? '1 carta' : `${cartas.length} cartas`} · ${rever} para rever</small></div></header>
    ${cartas.length ? `<button class="btn primary wide" data-go="#/practice/cartas" id="ctreinar">${I('player-play')} Treinar agora</button><div class="spc"></div>
      <div class="grupo">${cartas.map((c) => linha({ icone: 'bulb', titulo: c.fr, resumo: [c.pt, c.frase].filter(Boolean).join(' · '), id: `carta-${c.id}` })).join('')}</div>`
      : '<div class="card center"><p>Você ainda não guardou nenhuma carta. Na Leitura, toque numa palavra e use "Guardar nas minhas cartas".</p><button class="btn primary" data-go="#/leitura">Abrir a Leitura</button></div>'}`;
  cartas.forEach((c) => {
    document.getElementById(`carta-${c.id}`).onclick = () => {
      const { box, fechar } = abrirFolha(`<h3 class="carta-t">${esc(c.fr)}</h3>
        <label>Significado<input id="cpt" class="inp" maxlength="90" value="${esc(c.pt)}" autocomplete="off"></label>
        <label>Uma frase sua com a palavra<input id="cfrase" class="inp" maxlength="160" value="${esc(c.frase)}" autocomplete="off"></label>
        <small>A palavra some da frase no treino: você escreve o que falta.</small>
        <div class="sc-acoes"><button class="btn primary" id="csalvar">Salvar</button><button class="btn danger" id="capagar">${I('trash')} Apagar a carta</button><button class="btn" id="cfechar">Fechar</button></div>`);
      box.querySelector('#cfechar').onclick = fechar;
      box.querySelector('#csalvar').onclick = () => { S.updateCarta(c.id, { pt: box.querySelector('#cpt').value, frase: box.querySelector('#cfrase').value }); fechar(); toast('Carta salva.'); cartasPage(); };
      box.querySelector('#capagar').onclick = () => { if (confirm(`Apagar a carta "${c.fr}"?`)) { S.deleteCarta(c.id); fechar(); cartasPage(); } };
    };
  });
}
