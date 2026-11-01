// Gráficos SVG simples, sem biblioteca. Cada função devolve texto (string), então dá para testar sem navegador.
// Cores e fontes vêm do CSS (classes ch-*): modo escuro e tema seguem o resto do app.
// Regras seguidas: uma série por gráfico (sem legenda), linha de 2px, marcas finas, grade fininha e sólida,
// colunas de no máximo 24px com 4px arredondados só no topo, ponto final com anel da cor do fundo, rótulos só onde importa.
import { esc } from './ui.js';

export const VIEW = { w: 340, h: 190, l: 34, r: 12, t: 14, b: 26 };
const plotW = VIEW.w - VIEW.l - VIEW.r; const plotH = VIEW.h - VIEW.t - VIEW.b;
const n1 = (x) => Math.round(x * 10) / 10; // uma casa decimal basta e mantém o texto curto

// menor limite "redondo" (e par, para o meio da escala cair em número inteiro) que comporta o valor
export function niceMax(v) {
  const steps = [10, 20, 40, 60, 80, 100, 120, 160, 200, 300, 400, 600, 800, 1000];
  const s = steps.find((x) => x >= v);
  return s || Math.ceil(v / 500) * 500;
}
// qual ponto fica sob a posição x (em unidades do desenho)? kind: 'line' (pontos nas pontas) ou 'bars' (uma faixa por dia)
export function indexAt(n, kind, vx) {
  if (n <= 1) return 0;
  const raw = kind === 'bars' ? Math.floor(((vx - VIEW.l) / plotW) * n) : Math.round(((vx - VIEW.l) / plotW) * (n - 1));
  return Math.max(0, Math.min(n - 1, raw));
}
const xLine = (i, n) => VIEW.l + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
const xBar = (i, n) => VIEW.l + ((i + 0.5) / n) * plotW;
const yAt = (v, yMax) => VIEW.t + plotH - (Math.max(0, Math.min(v, yMax)) / yMax) * plotH;
// rótulos do eixo x: primeiro, do meio e último (sem repetir)
const xTickIdx = (n) => [...new Set([0, Math.floor((n - 1) / 2), n - 1])].filter((i) => i >= 0);

function frame({ n, yMax, ticks, labels, pos, fmt }) {
  const grid = ticks.map((t) => `<line class="ch-grid" x1="${VIEW.l}" x2="${VIEW.w - VIEW.r}" y1="${n1(yAt(t, yMax))}" y2="${n1(yAt(t, yMax))}"/><text class="ch-tick" x="${VIEW.l - 6}" y="${n1(yAt(t, yMax) + 4)}" text-anchor="end">${esc(fmt ? fmt(t) : String(t))}</text>`).join('');
  const xs = xTickIdx(n).map((i, k, a) => `<text class="ch-tick" x="${n1(pos(i, n))}" y="${VIEW.h - 8}" text-anchor="${k === 0 && a.length > 1 ? 'start' : k === a.length - 1 && a.length > 1 ? 'end' : 'middle'}">${esc(labels[i])}</text>`).join('');
  return grid + xs;
}
const open = (aria, n, kind) => `<svg class="chart-svg" viewBox="0 0 ${VIEW.w} ${VIEW.h}" role="img" aria-label="${esc(aria)}" data-n="${n}" data-kind="${kind}" tabindex="0" focusable="true">`;
const overlay = '<line class="ch-cursor" x1="0" x2="0" y1="' + VIEW.t + '" y2="' + (VIEW.h - VIEW.b) + '" hidden/><circle class="ch-focus" r="5" cx="0" cy="0" hidden/>';

// Linha (uma série). points: [{ label, y }] com y = null quando não houve medida naquele dia (a linha quebra, sem inventar valor).
export function lineChart({ points, yMax, ticks, aria, fmt, endLabel = true }) {
  const n = points.length;
  const segs = []; let cur = [];
  points.forEach((p, i) => { if (p.y === null || p.y === undefined) { if (cur.length) segs.push(cur); cur = []; } else cur.push([xLine(i, n), yAt(p.y, yMax), i]); });
  if (cur.length) segs.push(cur);
  const base = n1(yAt(0, yMax));
  const d = (s) => s.map(([x, y], k) => `${k ? 'L' : 'M'}${n1(x)} ${n1(y)}`).join(' ');
  const area = segs.filter((s) => s.length > 1).map((s) => `<path class="ch-area" d="${d(s)} L${n1(s[s.length - 1][0])} ${base} L${n1(s[0][0])} ${base} Z"/>`).join('');
  const lines = segs.filter((s) => s.length > 1).map((s) => `<path class="ch-line" d="${d(s)}"/>`).join('');
  // pontos: o último valor medido e os pontos isolados (que a linha não alcança)
  const lastSeg = segs[segs.length - 1]; const last = lastSeg && lastSeg[lastSeg.length - 1];
  const dots = segs.filter((s) => s.length === 1 || s === lastSeg).map((s) => s[s.length - 1]);
  const dotSvg = dots.map(([x, y]) => `<circle class="ch-dot" cx="${n1(x)}" cy="${n1(y)}" r="4.5"/>`).join('');
  const label = endLabel && last ? `<text class="ch-value" x="${n1(Math.min(last[0], VIEW.w - VIEW.r - 2))}" y="${n1(Math.max(last[1] - 11, VIEW.t + 8))}" text-anchor="${last[0] > VIEW.w - 40 ? 'end' : 'middle'}">${esc(fmt ? fmt(points[last[2]].y) : String(points[last[2]].y))}</text>` : '';
  return `${open(aria, n, 'line')}${frame({ n, yMax, ticks, labels: points.map((p) => p.label), pos: xLine, fmt })}${area}${lines}${dotSvg}${label}${overlay}</svg>`;
}

// Colunas (uma série) com linha de meta opcional. points: [{ label, y }].
export function barChart({ points, yMax, ticks, goal, aria }) {
  const n = points.length; const slot = plotW / n; const bw = Math.min(24, Math.max(2, slot - 2)); const base = yAt(0, yMax);
  const max = Math.max(0, ...points.map((p) => p.y || 0));
  const bars = points.map((p, i) => {
    if (!p.y) return '';
    const x = xBar(i, n) - bw / 2; const y = yAt(p.y, yMax); const h = base - y; const r = Math.min(4, h, bw / 2);
    // topo arredondado (4px), base reta
    return `<path class="ch-bar" d="M${n1(x)} ${n1(base)} V${n1(y + r)} Q${n1(x)} ${n1(y)} ${n1(x + r)} ${n1(y)} H${n1(x + bw - r)} Q${n1(x + bw)} ${n1(y)} ${n1(x + bw)} ${n1(y + r)} V${n1(base)} Z"/>`;
  }).join('');
  // a meta é uma linha fininha; o número dela entra como marca do eixo (veja ticksWithGoal) e o subtítulo explica a linha
  const goalSvg = goal ? `<line class="ch-goal" x1="${VIEW.l}" x2="${VIEW.w - VIEW.r}" y1="${n1(yAt(goal, yMax))}" y2="${n1(yAt(goal, yMax))}"/>` : '';
  // valor só na coluna mais alta (o resto fica na leitura ao tocar e na tabela)
  const mi = points.findIndex((p) => p.y === max);
  const top = max > 0 ? `<text class="ch-value" x="${n1(Math.min(Math.max(xBar(mi, n), VIEW.l + 8), VIEW.w - VIEW.r - 8))}" y="${n1(Math.max(yAt(max, yMax) - 5, VIEW.t + 8))}" text-anchor="middle">${max}</text>` : '';
  return `${open(aria, n, 'bars')}${frame({ n, yMax, ticks, labels: points.map((p) => p.label), pos: xBar })}${bars}${goalSvg}${top}${overlay}</svg>`;
}

// Minigráficos do resumo dos cartões da Evolução: sem eixos nem rótulos (o gráfico completo fica dentro do cartão)
const spark = (w, h, corpo) => `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true" focusable="false">${corpo}</svg>`;
// a escala acompanha os próprios valores (mínimo e máximo, com folga), para a tendência aparecer mesmo em números altos e parecidos
export function sparkLine(values, { w = 88, h = 34 } = {}) {
  const pts = values.map((v, i) => [i, v]).filter(([, v]) => v !== null && v !== undefined); if (!pts.length) return '';
  const vs = pts.map(([, v]) => v); const lo = Math.max(0, Math.min(...vs) - 5); const hi = Math.max(...vs, lo + 10);
  const n = values.length; const x = (i) => 3 + (n <= 1 ? (w - 6) / 2 : (i / (n - 1)) * (w - 6)); const y = (v) => 3 + (h - 6) - ((v - lo) / (hi - lo)) * (h - 6);
  const d = pts.map(([i, v], k) => `${k ? 'L' : 'M'}${n1(x(i))} ${n1(y(v))}`).join(' '); const [li, lv] = pts[pts.length - 1];
  return spark(w, h, `${pts.length > 1 ? `<path class="spark-line" d="${d}"/>` : ''}<circle class="spark-dot" cx="${n1(x(li))}" cy="${n1(y(lv))}" r="3"/>`);
}
export function sparkBars(values, { max, w = 88, h = 34 } = {}) {
  const n = values.length; if (!n) return ''; const top = max || Math.max(1, ...values.map((v) => v || 0));
  const slot = (w - 6) / n; const bw = Math.max(2, Math.min(8, slot - 2));
  return spark(w, h, values.map((v, i) => { if (!v) return ''; const bh = Math.max(2, (Math.min(v, top) / top) * (h - 6)); return `<rect class="spark-bar" x="${n1(3 + i * slot + (slot - bw) / 2)}" y="${n1(h - 3 - bh)}" width="${n1(bw)}" height="${n1(bh)}" rx="1.5"/>`; }).join(''));
}

// marcas do eixo y: 0, meio e topo, mais a meta (se o meio ficar colado nela, sai o meio)
export function ticksWithGoal(yMax, goal) {
  const t = [0, yMax / 2, yMax]; if (!goal || t.includes(goal)) return t;
  return [...t.filter((v) => Math.abs(v - goal) >= yMax * 0.18), goal].sort((a, b) => a - b);
}

// posição (em unidades do desenho) do ponto i, para o cursor da leitura ao tocar
export function pointPos(kind, i, n, y, yMax) { return { x: kind === 'bars' ? xBar(i, n) : xLine(i, n), y: yAt(y || 0, yMax) }; }
