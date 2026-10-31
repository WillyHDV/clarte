import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VIEW, niceMax, ticksWithGoal, indexAt, pointPos, lineChart, barChart } from '../js/chart.js';

const dia = (i) => `${String((i % 28) + 1).padStart(2, '0')}/10`;
const pts = (ys) => ys.map((y, i) => ({ label: dia(i), y }));
const count = (s, re) => (s.match(re) || []).length;
// toda coordenada do desenho precisa existir e caber na área visível
function geometriaOk(svg) {
  assert.ok(!/NaN|undefined|Infinity|null/.test(svg.replace(/aria-label="[^"]*"/, '')), 'valor inválido no SVG');
  for (const m of svg.matchAll(/\b(?:x1|x2|y1|y2|cx|cy|x|y)="(-?[\d.]+)"/g)) assert.ok(+m[1] >= 0 && +m[1] <= VIEW.w, `coordenada fora da área: ${m[0]}`);
  for (const m of svg.matchAll(/ d="([^"]+)"/g)) for (const num of m[1].match(/-?\d+(?:\.\d+)?/g)) assert.ok(+num >= 0 && +num <= VIEW.w, `número fora da área no caminho: ${num}`);
}

test('niceMax: limites redondos e pares', () => {
  assert.deepEqual([0, 7, 10, 11, 25, 61, 100, 250, 1000].map(niceMax), [10, 10, 10, 20, 40, 80, 100, 300, 1000]);
  assert.equal(niceMax(1001), 1500);
  for (let v = 1; v < 2000; v += 37) assert.ok(niceMax(v) >= v && niceMax(v) % 2 === 0, `niceMax(${v})`);
});

test('ticksWithGoal: meta entra no eixo, sem marcas coladas', () => {
  assert.deepEqual(ticksWithGoal(40, 20), [0, 20, 40]);
  assert.deepEqual(ticksWithGoal(60, 20), [0, 20, 60], 'o meio (30) fica perto demais da meta (20) e sai');
  assert.deepEqual(ticksWithGoal(100, 20), [0, 20, 50, 100]);
  assert.deepEqual(ticksWithGoal(40, 0), [0, 20, 40]);
});

test('indexAt: qual ponto fica sob o dedo', () => {
  assert.equal(indexAt(30, 'bars', VIEW.l), 0); assert.equal(indexAt(30, 'bars', VIEW.w - VIEW.r), 29); assert.equal(indexAt(30, 'bars', 0), 0); assert.equal(indexAt(30, 'bars', 9999), 29);
  assert.equal(indexAt(5, 'line', VIEW.l), 0); assert.equal(indexAt(5, 'line', VIEW.w - VIEW.r), 4);
  assert.equal(indexAt(5, 'line', (VIEW.l + VIEW.w - VIEW.r) / 2), 2);
  assert.equal(indexAt(1, 'line', 200), 0); assert.equal(indexAt(0, 'bars', 200), 0);
});

test('linha: segmentos quebram onde não há medida e o último ponto ganha um marcador', () => {
  const svg = lineChart({ points: pts([10, 20, 30, null, null, 40, 50, 60]), yMax: 100, ticks: [0, 50, 100], aria: 'teste' });
  assert.equal(count(svg, /class="ch-line"/g), 2, 'dois trechos');
  assert.equal(count(svg, /class="ch-area"/g), 2);
  assert.equal(count(svg, /class="ch-dot"/g), 1, 'só o ponto final');
  assert.equal(count(svg, /class="ch-value"/g), 1, 'um único rótulo de valor: o do fim');
  assert.match(svg, /<text class="ch-value"[^>]*>60<\/text>/);
  geometriaOk(svg);
});

test('linha: ponto isolado aparece como marcador e a linha não inventa valor', () => {
  const svg = lineChart({ points: pts([null, 30, null, 50, 60]), yMax: 100, ticks: [0, 100], aria: 'x' });
  assert.equal(count(svg, /class="ch-line"/g), 1);
  assert.equal(count(svg, /class="ch-dot"/g), 2, 'o isolado e o final');
  geometriaOk(svg);
});

test('linha: sem nenhuma medida, um ponto só e dois pontos', () => {
  const vazio = lineChart({ points: pts([null, null, null]), yMax: 100, ticks: [0, 100], aria: 'x' });
  assert.equal(count(vazio, /ch-line|ch-dot|ch-value/g), 0); geometriaOk(vazio);
  const um = lineChart({ points: pts([42]), yMax: 100, ticks: [0, 100], aria: 'x' });
  assert.equal(count(um, /class="ch-dot"/g), 1); assert.equal(count(um, /class="ch-line"/g), 0); geometriaOk(um);
  const dois = lineChart({ points: pts([5, 7]), yMax: 10, ticks: [0, 5, 10], aria: 'x' }); assert.equal(count(dois, /class="ch-line"/g), 1); geometriaOk(dois);
});

test('linha: o valor no fim nunca sai do desenho, mesmo no teto da escala', () => {
  const svg = lineChart({ points: pts([100, 100, 100]), yMax: 100, ticks: [0, 100], aria: 'x', fmt: (v) => `${v}%` });
  geometriaOk(svg); assert.match(svg, /100%<\/text>/);
});

test('colunas: espessura de no máximo 24px, só dias com valor e topo arredondado', () => {
  const poucos = barChart({ points: pts([5, 0, 12]), yMax: 20, ticks: [0, 10, 20], aria: 'x' });
  assert.equal(count(poucos, /class="ch-bar"/g), 2, 'dia zerado não desenha coluna');
  for (const m of poucos.matchAll(/class="ch-bar" d="M([\d.]+) [\d.]+ V[\d.]+ Q[\d.]+ [\d.]+ [\d.]+ [\d.]+ H[\d.]+ Q[\d.]+ [\d.]+ ([\d.]+) [\d.]+ V[\d.]+ Z"/g)) assert.ok(+m[2] - +m[1] <= 24.01, 'coluna mais grossa que 24px');
  const trinta = barChart({ points: pts(Array.from({ length: 30 }, (_, i) => i + 1)), yMax: 40, ticks: [0, 20, 40], aria: 'x' });
  assert.equal(count(trinta, /class="ch-bar"/g), 30); geometriaOk(trinta);
  // 30 colunas cabem na área e há respiro entre elas
  const xs = [...trinta.matchAll(/class="ch-bar" d="M([\d.]+) /g)].map((m) => +m[1]);
  const larg = (VIEW.w - VIEW.l - VIEW.r) / 30; for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] >= larg - 0.2, 'colunas coladas');
});

test('colunas: linha da meta, rótulo só na maior coluna, valores acima do limite ficam no teto', () => {
  const svg = barChart({ points: pts([3, 38, 12]), yMax: 40, ticks: [0, 20, 40], goal: 20, aria: 'x' });
  assert.equal(count(svg, /class="ch-goal"/g), 1); assert.equal(count(svg, /class="ch-value"/g), 1); assert.match(svg, /class="ch-value"[^>]*>38<\/text>/);
  assert.equal(count(svg, /class="ch-note"/g), 0, 'sem texto solto sobre as colunas');
  geometriaOk(barChart({ points: pts([500]), yMax: 40, ticks: [0, 40], aria: 'x' }));
  geometriaOk(barChart({ points: pts([0, 0, 0]), yMax: 10, ticks: [0, 10], aria: 'x' }));
  assert.equal(count(barChart({ points: pts([0, 0]), yMax: 10, ticks: [0, 10], aria: 'x' }), /class="ch-value"/g), 0);
});

test('acessibilidade: descrição, foco por teclado e rótulos do eixo sem repetição', () => {
  const svg = lineChart({ points: pts([1, 2, 3, 4, 5]), yMax: 10, ticks: [0, 5, 10], aria: 'Prontidão: de "1" para 5 <b>' });
  assert.match(svg, /role="img"/); assert.match(svg, /tabindex="0"/);
  assert.match(svg, /aria-label="Prontidão: de &quot;1&quot; para 5 &lt;b&gt;"/, 'a descrição é escapada');
  assert.equal(count(svg, /class="ch-cursor"[^>]*hidden/g), 1); assert.equal(count(svg, /class="ch-focus"[^>]*hidden/g), 1);
  const dois = lineChart({ points: pts([1, 2]), yMax: 10, ticks: [0], aria: 'x' });
  const rotulosX = [...dois.matchAll(/y="182" text-anchor="\w+">([^<]+)</g)].map((m) => m[1]);
  assert.deepEqual(rotulosX, ['01/10', '02/10'], 'com 2 pontos há 2 rótulos, sem repetir o do meio');
});

test('pointPos acompanha o desenho', () => {
  const l = pointPos('line', 0, 5, 50, 100); assert.equal(l.x, VIEW.l);
  assert.ok(Math.abs(pointPos('line', 4, 5, 50, 100).x - (VIEW.w - VIEW.r)) < 1e-9);
  const b = pointPos('bars', 0, 30, 10, 40); assert.ok(b.x > VIEW.l && b.x < VIEW.l + 12);
  assert.ok(pointPos('line', 1, 3, 100, 100).y < pointPos('line', 1, 3, 0, 100).y, 'valor maior fica mais acima');
});
