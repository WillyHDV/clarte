// Prontidão para a avaliação e os 6 critérios da prova oral (aparecem em Evolução).
import * as S from './store.js';
import { esc } from './ui.js';
import { readiness, CRITERIA } from './progress.js';

export function criteriaHtml() {
  return CRITERIA.map(([fr, pt, key, how]) => {
    const k = S.skill(key); const ok = k && k.n >= 5; const v = ok ? Math.round(k.v * 100) : 0;
    return `<div class="crit"><div class="ct"><b>${esc(fr)}</b><small>${esc(pt)}</small></div><div class="cb"><div class="bar ${ok ? '' : 'off'}"><i style="width:${v}%"></i></div><small>${ok ? v + '%' : 'sem dados — ' + esc(how)}</small></div></div>`;
  }).join('');
}

export function prontidaoHtml() {
  const R = readiness();
  return `<section class="card ready">
      <div class="rtop"><div class="ring" style="--p:${R.overall}"><b>${R.overall}%</b></div>
        <div><h3>Prontidão para a avaliação</h3><small>Média do domínio das 8 unidades. O treino inteligente escolhe o que está mais fraco.${R.weakest ? `<br>Mais fraca agora: <b>${esc(R.weakest.u.title)}</b> (${R.weakest.m.pct}%).` : ''}</small></div></div>
      <h4>Os 6 critérios da prova oral</h4>
      ${criteriaHtml()}
      <small class="fine">Estimativa do app a partir dos seus exercícios e das conversas por voz, não é a nota da professora.</small>
    </section>`;
}
