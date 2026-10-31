// Sistema visual: leitura (contraste e tamanho mínimo), ícones e avatares. Se uma cor nova deixar o texto difícil de ler, estes testes reprovam.
import './support/window.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ICONS, AVATARS, I, avatarHtml, avatarDe, linha } from '../js/ui.js';

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

// ---------- cores ----------
const hex = (h) => { const x = h.replace('#', ''); const v = x.length === 3 ? [...x].map((c) => c + c).join('') : x; return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16)); };
const lum = ([r, g, b]) => { const f = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contraste = (a, b) => { const [x, y] = [lum(hex(a)), lum(hex(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// variáveis de um bloco "{ ... }": --nome: #cor;
const vars = (bloco) => Object.fromEntries([...bloco.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6})\b/g)].map((m) => [m[1], m[2]]));
const abre = css.indexOf(':root {'); const claroBloco = css.slice(abre, css.indexOf('\n}', abre));
const escuroIni = css.indexOf('@media (prefers-color-scheme: dark) {\n  :root {'); const escuroBloco = css.slice(escuroIni, css.indexOf('\n  }', escuroIni));
const claro = vars(claroBloco); const escuro = { ...claro, ...vars(escuroBloco) };

// pares de texto e fundo realmente usados (texto precisa de 4,5:1)
const PARES = [
  ['ink', 'bg'], ['ink', 'card'], ['ink', 'card-2'], ['muted', 'bg'], ['muted', 'card'], ['muted', 'card-2'],
  ['brand-text', 'bg'], ['brand-text', 'card'], ['navy', 'card'],
  ['good', 'good-bg'], ['good', 'card'], ['bad', 'bad-bg'], ['bad', 'card'], ['warn', 'warn-bg'], ['disabled-ink', 'disabled-bg'],
  ['on-brand', 'brand'], ['on-bad', 'bad'], ['on-good', 'good'], ['on-warn', 'warn'],
  ['ink', 'good-bg'], ['ink', 'warn-bg'], ['ink', 'bad-bg'], ['muted', 'card-2'], // texto do painel de feedback sobre o fundo de acerto, quase e erro
  ['call-ink', 'call-bg'], ['call-ink-2', 'call-bg'], ['call-accent', 'call-bg'], ['call-ok', 'call-bg'], ['call-warn', 'call-bg'], // chamada e resumo da missão (fundo escuro)
];
for (const [nome, v] of [['claro', claro], ['escuro', escuro]]) {
  test(`leitura (${nome}): todo par de texto e fundo tem contraste de pelo menos 4,5 para 1`, () => {
    const ruins = PARES.filter(([t, f]) => v[t] && v[f]).map(([t, f]) => ({ par: `${t} em ${f}`, valor: contraste(v[t], v[f]) })).filter((x) => x.valor < 4.5);
    assert.deepEqual(ruins.map((x) => `${x.par}: ${x.valor.toFixed(2)}`), []);
    for (const [t, f] of PARES) assert.ok(v[t] && v[f], `variável ausente: ${v[t] ? f : t}`);
  });
}

test('texto branco sobre o fundo dos botões da marca (claro e escuro) tem contraste de 4,5 para 1', () => {
  const grad = [...css.matchAll(/--grad:\s*linear-gradient\([^)]*\)/g)][0][0].match(/#[0-9a-fA-F]{6}/g);
  assert.equal(grad.length, 3);
  for (const cor of [...grad, claro.brand]) assert.ok(contraste('#ffffff', cor) >= 4.5, `branco sobre ${cor}: ${contraste('#ffffff', cor).toFixed(2)}`);
});

test('nenhum texto do CSS fica abaixo de 13 px', () => {
  const pequenos = [...css.matchAll(/font-size:\s*([\d.]+)(rem|px)/g)].filter((m) => (m[2] === 'rem' ? parseFloat(m[1]) * 16 : parseFloat(m[1])) < 13).map((m) => m[0]);
  assert.deepEqual(pequenos, []);
});

test('área de toque: botões e linhas têm pelo menos 48 px', () => {
  assert.match(css, /--tap:\s*48px/); assert.match(css, /\.btn \{ min-height: var\(--tap\); \}/);
  assert.match(css, /\.linha \{[^}]*min-height: 56px/); assert.match(css, /\.acc > summary \{[^}]*min-height: 56px/); assert.match(css, /\.tab \{[^}]*min-height: var\(--tap\)/);
});

// ---------- ícones ----------
function arquivos(dir) { return readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? arquivos(p) : p.endsWith('.js') ? [p] : []; }); }

test('todo ícone pedido no código existe no conjunto (nenhum quadrado vazio na tela)', () => {
  const usados = new Set();
  for (const f of arquivos(decodeURIComponent(new URL('../js', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'))) {
    const t = readFileSync(f, 'utf8');
    for (const m of t.matchAll(/\bI\('([a-z0-9-]+)'\)/g)) usados.add(m[1]);
    for (const m of t.matchAll(/icone:\s*'([a-z0-9-]+)'/g)) usados.add(m[1]);
    for (const m of t.matchAll(/icone:\s*'([a-z0-9-]+)'/g)) usados.add(m[1]);
  }
  for (const a of AVATARS) if (a.id !== 'initial') usados.add(a.id);
  const faltam = [...usados].filter((n) => !ICONS[n]);
  assert.deepEqual(faltam, []); assert.ok(usados.size > 20, 'o teste encontrou os ícones do código');
});

test('os ícones são de linha, do mesmo conjunto, e I() devolve um SVG com a classe do app', () => {
  assert.ok(Object.keys(ICONS).length >= 75);
  for (const [nome, svg] of Object.entries(ICONS)) { assert.ok(svg && !/fill="(?!none)/.test(svg), `ícone ${nome} vazio ou preenchido`); assert.ok(/<(path|circle|rect|line|polyline)\b/.test(svg), nome); }
  assert.match(I('route'), /^<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path/); assert.equal(I('nao-existe'), '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"></svg>');
  assert.equal(ICONS.back, ICONS['chevron-left'], 'nomes antigos apontam para o conjunto novo'); assert.equal(ICONS.mic, ICONS.microphone);
});

// ---------- avatares ----------
test('avatares: 9 opções, ids únicos, com o desenho em contraste suficiente com o fundo', () => {
  assert.equal(AVATARS.length, 9); assert.equal(new Set(AVATARS.map((a) => a.id)).size, 9); assert.equal(AVATARS[0].id, 'initial');
  for (const a of AVATARS) assert.ok(contraste(a.fg, a.bg) >= 4.5, `${a.nome}: ${contraste(a.fg, a.bg).toFixed(2)}`);
});

test('avatarHtml: inicial do nome ou desenho; id desconhecido volta para a inicial; nome é escapado', () => {
  assert.match(avatarHtml('initial', 'willy', 40), />W<\/span>$/); assert.match(avatarHtml('leaf', 'Willy', 40), /<svg class="i"/);
  assert.equal(avatarDe('inexistente').id, 'initial'); assert.match(avatarHtml('xx', '<b>', 40), /&lt;<\/span>$/); assert.match(avatarHtml('initial', '', 40), />W<\/span>$/);
  assert.match(avatarHtml('sun', 'W', 72), /width:72px;height:72px/);
});

test('linha de lista: botão com ícone, título, resumo e seta; sem destino vira texto', () => {
  const l = linha({ icone: 'bolt', titulo: 'Treino <inteligente>', resumo: 'Mistura', go: '#/practice/mix' });
  assert.match(l, /^<button class="linha" data-go="#\/practice\/mix"/); assert.match(l, /Treino &lt;inteligente&gt;/); assert.match(l, /<small>Mistura<\/small>/); assert.match(l, /chevron|<svg/);
  assert.match(linha({ titulo: 'Só texto', valor: '19:00' }), /^<div class="linha"/); assert.doesNotMatch(linha({ titulo: 'x' }), /<svg/);
});
