// Evolução: números da semana e três gráficos (prontidão, exercícios por dia, notas das simulações), feitos do histórico diário.
import { esc, I } from '../ui.js';
import { $app, st } from '../core.js';
import { historySeries } from '../progress.js';
import { prontidaoHtml } from '../prontidao.js';
import { lineChart, barChart, niceMax, ticksWithGoal, indexAt, pointPos, VIEW } from '../chart.js';

const DAYS = 30;
const dm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const nota = (v) => String(v).replace('.', ',');
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// monta os dados de cada gráfico (o desenho em si fica em chart.js)
export function buildCharts({ series, exams, goal }) {
  const charts = [];
  const measured = series.filter((x) => x.r !== null);
  if (measured.length) {
    const a = measured[0]; const b = measured[measured.length - 1];
    charts.push({
      title: 'Prontidão para a avaliação', sub: `Média do domínio das unidades (%), nos últimos ${DAYS} dias. Dia sem abrir o app fica sem medida.`,
      kind: 'line', yMax: 100, ys: series.map((x) => x.r),
      svg: (aria) => lineChart({ points: series.map((x) => ({ label: dm(x.d), y: x.r })), yMax: 100, ticks: [0, 50, 100], fmt: (v) => `${v}%`, aria }),
      aria: measured.length > 1 ? `Prontidão para a avaliação: de ${a.r}% em ${dm(a.d)} para ${b.r}% em ${dm(b.d)}.` : `Prontidão para a avaliação: ${b.r}% em ${dm(b.d)}.`,
      texts: series.map((x) => `${dm(x.d)} · ${x.r === null ? 'sem medida' : `prontidão ${x.r}%`}`),
      table: { head: ['Dia', 'Prontidão'], rows: series.map((x) => [dm(x.d), x.r === null ? '—' : `${x.r}%`]) },
    });
  }
  const total = series.reduce((acc, x) => acc + x.n, 0);
  if (total > 0) {
    const maxN = Math.max(...series.map((x) => x.n)); const best = series.find((x) => x.n === maxN);
    const yMax = niceMax(Math.max(goal * 1.25, maxN));
    charts.push({
      title: 'Exercícios por dia', sub: `Quantos exercícios você fez em cada um dos últimos ${DAYS} dias; a linha é a sua meta diária.`,
      kind: 'bars', yMax, ys: series.map((x) => x.n),
      svg: (aria) => barChart({ points: series.map((x) => ({ label: dm(x.d), y: x.n })), yMax, ticks: ticksWithGoal(yMax, goal), goal, aria }),
      aria: `Exercícios por dia: ${total} nos últimos ${DAYS} dias, no máximo ${maxN} em ${dm(best.d)}; meta diária de ${goal}.`,
      texts: series.map((x) => `${dm(x.d)} · ${x.n ? `${plural(x.n, 'exercício', 'exercícios')}, ${plural(x.ok, 'acerto', 'acertos')} (${Math.round((100 * x.ok) / x.n)}%)` : 'nenhum exercício'}`),
      table: { head: ['Dia', 'Exercícios', 'Acertos'], rows: series.map((x) => [dm(x.d), x.n, x.n ? `${Math.round((100 * x.ok) / x.n)}%` : '—']) },
    });
  }
  if (exams.length >= 2) {
    const a = exams[0]; const b = exams[exams.length - 1]; const day = (e) => dm(new Date(e.date).toLocaleDateString('sv-SE'));
    charts.push({
      title: 'Simulações da prova oral', sub: `Nota que a Clara deu (0 a 10) nas últimas ${exams.length} simulações.`,
      kind: 'line', yMax: 10, ys: exams.map((e) => e.score),
      svg: (aria) => lineChart({ points: exams.map((e) => ({ label: day(e), y: e.score })), yMax: 10, ticks: [0, 5, 10], fmt: nota, aria }),
      aria: `Notas das simulações: de ${nota(a.score)} em ${day(a)} para ${nota(b.score)} em ${day(b)}.`,
      texts: exams.map((e) => `${day(e)} · nota ${nota(e.score)}/10`),
      table: { head: ['Dia', 'Nota'], rows: exams.map((e) => [day(e), `${nota(e.score)}/10`]) },
    });
  }
  return charts;
}

const figure = (c, i) => `
  <figure class="chart card" data-c="${i}">
    <figcaption><h3>${esc(c.title)}</h3><small>${esc(c.sub)}</small></figcaption>
    ${c.svg(c.aria)}
    <div class="readout" aria-live="polite">Toque no gráfico (ou use as setas) para ver um dia.</div>
    <details class="tview"><summary>Ver como tabela</summary>
      <table><thead><tr>${c.table.head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${c.table.rows.map((r) => `<tr>${r.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>
    </details>
  </figure>`;

export function historyPage() {
  const s = st(); const goal = s.settings.goal || 20;
  const series = historySeries(DAYS); const week = series.slice(-7);
  const n7 = week.reduce((a, x) => a + x.n, 0); const ok7 = week.reduce((a, x) => a + x.ok, 0);
  const exams = (s.exams || []).slice(-12); const bestExam = Math.max(0, ...(s.exams || []).map((e) => e.score || 0));
  const charts = buildCharts({ series, exams, goal });
  $app.innerHTML = `
    <header class="top"><button class="back" data-go="#/perfil" aria-label="Voltar">${I('back')}</button><h1>Evolução</h1></header>
    <section class="kpis" aria-label="Resumo">
      <div class="kpi"><small>Dias seguidos</small><b>${s.streak}</b><span>${s.streak ? 'sem pular um dia' : 'comece hoje'}</span></div>
      <div class="kpi"><small>Exercícios (7 dias)</small><b>${n7}</b><span>meta de ${goal} por dia</span></div>
      <div class="kpi"><small>Acertos (7 dias)</small><b>${n7 ? `${Math.round((100 * ok7) / n7)}%` : '—'}</b><span>${n7 ? `${ok7} de ${n7}` : 'sem exercícios na semana'}</span></div>
      <div class="kpi"><small>Simulações da prova</small><b>${(s.exams || []).length}</b><span>${bestExam ? `melhor nota ${nota(bestExam)}/10` : 'ainda nenhuma'}</span></div>
    </section>
    ${prontidaoHtml()}
    ${charts.length ? charts.map(figure).join('') : '<div class="card center"><p>Ainda não há histórico para mostrar. Faça um treino hoje e volte aqui: os gráficos aparecem a partir do primeiro dia de uso.</p><button class="btn primary" data-go="#/practice/mix">Treino inteligente</button></div>'}
    ${exams.length === 1 ? '<p class="pt">Faça mais uma simulação da prova oral com a Clara para ver a evolução das notas.</p>' : ''}
    <small class="fine">O histórico fica só neste aparelho e entra no backup.</small>`;
  wire(charts);
}

// elementos SVG não têm a propriedade .hidden: é preciso mexer no atributo
const setHidden = (el, hide) => (hide ? el.setAttribute('hidden', '') : el.removeAttribute('hidden'));

// leitura ao tocar / passar o mouse / usar as setas; a tabela é a alternativa sem gráfico
function wire(charts) {
  $app.querySelectorAll('figure.chart').forEach((fig) => {
    const c = charts[+fig.dataset.c]; const svg = fig.querySelector('svg'); const out = fig.querySelector('.readout');
    const cursor = svg.querySelector('.ch-cursor'); const dot = svg.querySelector('.ch-focus'); const n = c.ys.length; let cur = n - 1;
    const show = (i) => {
      cur = i; const y = c.ys[i]; const p = pointPos(c.kind, i, n, y, c.yMax);
      cursor.setAttribute('x1', p.x); cursor.setAttribute('x2', p.x); setHidden(cursor, false);
      dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y); setHidden(dot, y === null || y === undefined || c.kind === 'bars');
      out.textContent = c.texts[i];
    };
    const at = (e) => { const r = svg.getBoundingClientRect(); return indexAt(n, c.kind === 'bars' ? 'bars' : 'line', ((e.clientX - r.left) / (r.width || VIEW.w)) * VIEW.w); };
    svg.addEventListener('pointerdown', (e) => show(at(e)));
    svg.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || e.buttons) show(at(e)); });
    svg.addEventListener('focus', () => show(cur));
    svg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { show(Math.max(0, cur - 1)); e.preventDefault(); } else if (e.key === 'ArrowRight') { show(Math.min(n - 1, cur + 1)); e.preventDefault(); } else if (e.key === 'Escape') { setHidden(cursor, true); setHidden(dot, true); }
    });
  });
}
