// Minhas cartas: palavras e correções que você guardou (da Leitura, da Clara ou escritas por você), com treino e edição.
import * as S from '../store.js';
import { $app, abrirFolha } from '../core.js';
import { lacuna } from '../exercises.js';
import { esc, I, linha, toast } from '../ui.js';

// cartas novas ou já enfraquecendo: as que valem uma revisão agora
const paraRever = (cartas) => cartas.filter((c) => { const s = S.strength(`card:${c.id}`); return s === null || s < 0.85; }).length;
const resumoDa = (c) => (c.erro ? [`errado: ${c.erro}`, c.pt].filter(Boolean).join(' · ') : [c.pt, c.frase].filter(Boolean).join(' · '));

// folha para editar uma carta: palavra comum (significado e frase) ou correção da Clara (frase certa e explicação)
function editar(c) {
  const campos = c.erro
    ? `<label>Frase certa<input id="cfr" class="inp" maxlength="160" value="${esc(c.fr)}" autocomplete="off"></label>
       <label>Explicação<input id="cpt" class="inp" maxlength="160" value="${esc(c.pt)}" autocomplete="off"></label>
       <small>Frase errada que você escreveu: <i>${esc(c.erro)}</i>. No treino ela aparece e você escreve a certa.</small>`
    : `<label>Significado<input id="cpt" class="inp" maxlength="90" value="${esc(c.pt)}" autocomplete="off"></label>
       <label>Uma frase sua com a palavra<input id="cfrase" class="inp" maxlength="160" value="${esc(c.frase)}" autocomplete="off"></label>
       <small>A palavra some da frase no treino: você escreve o que falta.</small>`;
  const { box, fechar } = abrirFolha(`<h3 class="carta-t">${esc(c.erro ? 'Correção' : c.fr)}</h3>${campos}
    <div class="sc-acoes"><button class="btn primary" id="csalvar">Salvar</button><button class="btn danger" id="capagar">${I('trash')} Apagar a carta</button><button class="btn" id="cfechar">Fechar</button></div>`);
  box.querySelector('#cfechar').onclick = fechar;
  box.querySelector('#csalvar').onclick = () => {
    const valor = (id) => box.querySelector(id).value;
    if (c.erro) { const certa = valor('#cfr').trim(); if (!certa) { toast('A frase certa não pode ficar vazia.'); return; } S.updateCarta(c.id, { fr: certa, frase: certa, pt: valor('#cpt') }); } else S.updateCarta(c.id, { pt: valor('#cpt'), frase: valor('#cfrase') });
    fechar(); toast('Carta salva.'); cartasPage();
  };
  box.querySelector('#capagar').onclick = () => { if (confirm(`Apagar a carta "${c.fr}"?`)) { S.deleteCarta(c.id); fechar(); cartasPage(); } };
}

// folha para criar uma carta do zero: palavra ou expressão, significado e uma frase sua
function nova() {
  const { box, fechar } = abrirFolha(`<h3 class="carta-t">Nova carta</h3>
    <label>Palavra ou expressão em francês<input id="nfr" class="inp" maxlength="80" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
    <label>Significado<input id="npt" class="inp" maxlength="90" autocomplete="off"></label>
    <label>Uma frase sua com ela (opcional)<input id="nfrase" class="inp" maxlength="160" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
    <small>No treino a palavra some da frase e você escreve. Sem frase, o treino mostra o significado e você escreve em francês.</small>
    <div class="sc-acoes"><button class="btn primary" id="nsalvar">Guardar carta</button><button class="btn" id="ncancelar">Cancelar</button></div>`);
  box.querySelector('#ncancelar').onclick = fechar;
  box.querySelector('#nsalvar').onclick = () => {
    const fr = box.querySelector('#nfr').value.trim(); const pt = box.querySelector('#npt').value.trim(); const frase = box.querySelector('#nfrase').value.trim();
    if (!fr) { toast('Escreva a palavra ou expressão em francês.'); return; }
    const cabe = !!lacuna(frase, fr);
    if (!pt && !cabe) { toast(frase ? 'A palavra não aparece na frase. Escreva o significado ou ajuste a frase.' : 'Escreva o significado ou uma frase com a palavra, senão não há o que treinar.'); return; }
    S.addCarta({ fr, pt, frase, origem: 'minha' }); fechar(); toast(frase && !cabe ? 'Carta guardada. A palavra não está na frase: o treino só pergunta o significado.' : 'Carta guardada. Ela entra no Reforço.'); cartasPage();
  };
}

export function cartasPage() {
  const cartas = S.cartas().slice().reverse(); const rever = paraRever(cartas);
  $app.innerHTML = `
    <header class="apphead"><button class="back" data-go="#/praticar" aria-label="Voltar para Praticar">${I('chevron-left')}</button><div class="hello"><b>Minhas cartas</b><small>${cartas.length === 1 ? '1 carta' : `${cartas.length} cartas`} · ${rever} para rever</small></div></header>
    ${cartas.length ? `<button class="btn primary wide" data-go="#/practice/cartas" id="ctreinar">${I('player-play')} Treinar agora</button><div class="spc"></div>` : ''}
    <button class="btn wide" id="cnova">${I('plus')} Nova carta</button><div class="spc"></div>
    ${cartas.length ? `<div class="grupo">${cartas.map((c) => linha({ icone: c.erro ? 'pencil' : 'bulb', titulo: c.fr, resumo: resumoDa(c), id: `carta-${c.id}` })).join('')}</div>`
      : '<div class="card center"><p>Você ainda não guardou nenhuma carta. Na Leitura, toque numa palavra e use "Guardar nas minhas cartas". Nas conversas com a Clara, guarde as correções dela. Ou crie uma carta sua agora.</p><button class="btn primary" data-go="#/leitura">Abrir a Leitura</button></div>'}`;
  document.getElementById('cnova').onclick = nova;
  cartas.forEach((c) => { document.getElementById(`carta-${c.id}`).onclick = () => editar(c); });
}
