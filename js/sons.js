// Sons do francês: exercícios de ouvido com pares mínimos e o progresso de cada som.
// Camada pessoal (não depende do curso): os itens são "som:<grupo>:<par>" e entram na mesma memória por item (força que decai, erros que voltam).
import { SONS } from '../content/sons.js';
import { mk, shuffle, urgencia } from './exercises.js';
import { esc, I } from './ui.js';

export const sonsGrupos = () => SONS;
export const grupoPorId = (id) => SONS.find((g) => g.id === id) || null;
export const itemDoPar = (g, p) => `som:${g.id}:${p.id}`;

const pick = (a) => a[Math.floor(Math.random() * a.length)];

// depois de responder, mostra as palavras do par com IPA, significado e um botão de ouvir cada uma (o áudio vem da voz do aparelho, para soar igual nas duas)
const explicacao = (p) => `<div class="somfb">${p.palavras.map((w) => `<div class="somw"><button class="say sm" data-say="${esc(w.fr)}" data-rapido="1" aria-label="Ouvir ${esc(w.fr)}">${I('volume')}</button><span><b>${esc(w.fr)}</b> <i>${esc(w.ipa)}</i> · ${esc(w.pt)}</span></div>`).join('')}</div>`;

const base = (g, p, v, w) => ({ key: `som|${g.id}|${p.id}|${v}|${w}`, items: [itemDoPar(g, p)], rapido: true, sub: g.titulo, explain: explicacao(p), _v: v, _p: itemDoPar(g, p) });
// ouvir uma palavra e escolher como se escreve
const identificar = (g, p, w) => mk('sons', 'listen-choice', { ...base(g, p, 'ident', w.fr), q: 'Qual palavra você ouviu?', audio: w.fr, options: shuffle(p.palavras.map((x) => x.fr)), answer: w.fr });
// ouvir uma palavra e escolher o que ela significa (liga o som ao sentido)
const sentido = (g, p, w) => mk('sons', 'listen-choice', { ...base(g, p, 'sentido', w.fr), q: 'O que a palavra significa?', audio: w.fr, options: shuffle(p.palavras.map((x) => x.pt)), answer: w.pt });
// ouvir duas palavras seguidas e dizer se são a mesma ou diferentes
const igualOuNao = (g, p, a, b) => mk('sons', 'listen-choice', { ...base(g, p, 'igual', `${a.fr}+${b.fr}`), q: 'Estas duas palavras soam iguais ou diferentes?', audio: `${a.fr}, ${b.fr}`, options: ['Iguais', 'Diferentes'], answer: a === b ? 'Iguais' : 'Diferentes' });

// todos os exercícios possíveis de um grupo (um por palavra e tipo; "iguais" e "diferentes" uma vez cada por par)
export function candidatosDoGrupo(g) {
  const out = [];
  for (const p of g.pares) {
    for (const w of p.palavras) { out.push(identificar(g, p, w)); out.push(sentido(g, p, w)); }
    const a = pick(p.palavras); out.push(igualOuNao(g, p, a, a));
    const [x, y] = shuffle(p.palavras); out.push(igualOuNao(g, p, x, y));
  }
  return out;
}

// escolhe n exercícios pelo ponto de esquecer (como o resto do app): no máximo um por par quando há pares de sobra, no máximo metade de cada tipo.
// aceitar(item) deixa o Reforço pedir só pares já vistos e enfraquecendo.
export function buildSons(grupoId, n = 10, strengthOf = () => 0.3, { aceitar = () => true } = {}) {
  const grupo = grupoId ? grupoPorId(grupoId) : null; const grupos = grupo ? [grupo] : SONS; // grupo desconhecido vale como "todos"
  const todos = grupos.flatMap(candidatosDoGrupo).filter((ex) => aceitar(ex._p));
  const pares = new Set(todos.map((ex) => ex._p)).size; const porPar = pares >= n ? 1 : 2; const porTipo = Math.ceil(n * 0.5);
  const ordenados = todos.map((ex) => ({ ex, p: urgencia(strengthOf(ex._p)) + Math.random() * 0.3 })).sort((a, b) => b.p - a.p);
  const out = []; const contaPar = {}; const contaTipo = {}; const contaParTipo = new Set();
  for (const { ex } of ordenados) {
    if (out.length >= n) break;
    const pt = `${ex._p}|${ex._v}`;
    if ((contaPar[ex._p] || 0) >= porPar || (contaTipo[ex._v] || 0) >= porTipo || contaParTipo.has(pt)) continue;
    contaPar[ex._p] = (contaPar[ex._p] || 0) + 1; contaTipo[ex._v] = (contaTipo[ex._v] || 0) + 1; contaParTipo.add(pt); out.push(ex);
  }
  for (const { ex } of ordenados) { if (out.length >= n) break; if (!out.includes(ex)) out.push(ex); } // se os limites deixaram faltar, completa
  return shuffle(out);
}

// quanto do grupo (ou de todos) já está firme: média da força dos pares (par nunca visto conta 0), e quantos pares já vistos pedem revisão
export function progressoSons(grupos, forca) {
  const itens = grupos.flatMap((g) => g.pares.map((p) => itemDoPar(g, p)));
  const fs = itens.map((it) => forca(it)); const vistos = fs.filter((s) => s !== null).length;
  const pct = itens.length ? Math.round((100 * fs.reduce((a, s) => a + (s === null ? 0 : s), 0)) / itens.length) : 0;
  return { total: itens.length, vistos, pct, rever: fs.filter((s) => s !== null && s < 0.85).length };
}
