// Prontidão para a avaliação e os 6 critérios da prova oral (aparecem em Evolução, cada um no seu cartão).
import * as S from './store.js';
import { esc } from './ui.js';
import { readiness, CRITERIA } from './progress.js';

// cada critério com o percentual atual; só vale com pelo menos 5 respostas medidas
export const criteriaData = () => CRITERIA.map(([fr, pt, key, how]) => { const k = S.skill(key); const ok = !!k && k.n >= 5; return { fr, pt, how, ok, v: ok ? Math.round(k.v * 100) : 0 }; });

export function criteriaHtml() {
  return criteriaData().map(({ fr, pt, how, ok, v }) =>
    `<div class="crit"><div class="ct"><b>${esc(fr)}</b><small>${esc(pt)}</small></div><div class="cb"><div class="bar ${ok ? '' : 'off'}"><i style="width:${v}%"></i></div><small>${ok ? v + '%' : 'sem dados — ' + esc(how)}</small></div></div>`).join('');
}

// anel da prontidão e a unidade mais fraca
export function prontidaoTopoHtml() {
  const R = readiness();
  return `<div class="ready"><div class="rtop"><div class="ring" style="--p:${R.overall}"><b>${R.overall}%</b></div>
      <div><small>Média do domínio das 8 unidades. O treino inteligente escolhe o que está mais fraco.${R.weakest ? `<br>Mais fraca agora: <b>${esc(R.weakest.u.title)}</b> (${R.weakest.m.pct}%).` : ''}</small></div></div></div>`;
}

export function criteriosHtml() {
  return `${criteriaHtml()}<small class="fine">Estimativa do app a partir dos seus exercícios e das conversas por voz, não é a nota da professora.</small>`;
}
