// Leitura: ler a frase em voz alta (gravação + IA), guardar as palavras difíceis, e os avisos de "algo errado?" (frase e verbete) com a lista em Ajustes.
import './support/storage.js';
import { test, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

mock.timers.enable({ apis: ['Date'], now: new Date(2026, 10, 15, 10) });

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { url: 'file:///clarte/index.html', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
const w = dom.window;
const put = (k, v) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
for (const k of ['document', 'location', 'history', 'navigator', 'screen', 'Element', 'HTMLElement', 'Node', 'Event', 'KeyboardEvent', 'MouseEvent', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) put(k, w[k]);
put('window', w);
w.scrollTo = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
put('matchMedia', w.matchMedia);
let confirmou = true; put('confirm', () => confirmou); w.confirm = globalThis.confirm; w.alert = () => {};
w.history.replaceState = (_s, _t, url) => { w.location.hash = String(url).split('#')[1] ? '#' + String(url).split('#')[1] : ''; };
const problems = [];
process.on('unhandledRejection', (e) => problems.push(`promessa sem tratamento: ${e && e.message}`));
w.addEventListener('error', (e) => problems.push(`erro na tela: ${e.message}`));

// o microfone do app Android: grava (MediaRecorder) e a IA transcreve
class FakeRecorder {
  constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm'; }
  static isTypeSupported() { return true; }
  start() { this.state = 'recording'; }
  stop() { this.state = 'inactive'; if (this.ondataavailable) this.ondataavailable({ data: new Blob([new Uint8Array(2000)]) }); setTimeout(() => this.onstop && this.onstop(), 0); }
}
w.MediaRecorder = globalThis.MediaRecorder = FakeRecorder;
Object.defineProperty(w.navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) } });
const baixados = []; w.URL.createObjectURL = (b) => { baixados.push(b); return 'blob:teste'; }; w.URL.revokeObjectURL = () => {};
w.HTMLAnchorElement.prototype.click = function clique() { this.dataset.baixou = this.download; baixados.push(this.download); };

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const text = () => $('#app').textContent.replace(/\s+/g, ' ');
const toasts = () => $$('.toast').map((t) => t.textContent).join(' | ');
const tick = (ms = 25) => new Promise((r) => setTimeout(r, ms));
async function goto(hash) { w.location.hash = hash; await tick(60); }
let S;
before(async () => { await import('../js/app.js'); S = await import('../js/store.js'); await tick(); });
after(() => { mock.timers.reset(); assert.deepEqual(problems, [], 'erros durante a navegação'); assert.equal(localStorage.getItem('fr_errlog'), null, 'o app registrou erros no fr_errlog'); });

const FRASES = [
  { fr: 'Ils ont un petit chat.', pt: 'Eles têm um gatinho.', marcada: 'Il<s> on{t} un peti{t} cha{t}.', leitura: 'il-zõ ã pe-ti chá', regras: ['ligação: ils‿ont'], palavras: [{ fr: 'petit', pt: 'pequeno', uso: 'vem antes do substantivo' }], avancado: false },
  { fr: "Il se leva à l’aube.", pt: 'Ele se levantou ao amanhecer.', marcada: "Il se leva à l’aube.", leitura: 'il sê lê-va a lôb', regras: [], palavras: [], avancado: false },
];
const VERBETE = { palavra: 'petit', lema: 'petit', classe: 'adjetivo', nivel: 'A1', leitura: 'pe-ti', significados: [{ pt: 'pequeno', nota: '' }], contexto: 'pequeno', forma: '', exemplos: [], expressoes: [], notas: '' };
const preparar = () => { S.resetAll(); S.setKey('gemini', 'chave-de-teste'); localStorage.removeItem('fr_dict_v1'); const livro = S.addLivro('Livro'); return S.addBookPage(FRASES, { livro, numero: 1 }); };

// lê a frase em voz alta: toca no microfone, "grava" 1,5 s, toca de novo e a IA devolve `dito`
async function ler(i, dito) {
  const realFetch = globalThis.fetch; let pedidos = 0;
  globalThis.fetch = async (_u, opts) => { const c = JSON.parse(opts.body); if (!(c.contents[0].parts[1] || {}).inlineData) return new Response('{}', { status: 500 }); pedidos++; return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: dito }] } }] }), { status: 200 }); };
  try {
    $(`[data-ler="${i}"]`).click(); assert.ok($('.lervoz .lv-mic')); $('.lv-mic').click(); await tick(); assert.match($('.lervoz .heard').textContent, /Gravando/); assert.ok($('.lv-mic').classList.contains('on'));
    mock.timers.tick(1500); $('.lv-mic').click(); await tick(100); assert.equal(pedidos, 1, 'a IA recebeu o áudio uma vez');
  } finally { globalThis.fetch = realFetch; }
}

test('ler em voz alta: lendo certo, mostra todas as palavras certas, anota a pronúncia e não vai para o Reforço', async () => {
  const id = preparar(); await goto('#/'); await goto(`#/leitura/${id}`); assert.equal($$('[data-ler]').length, 2, 'um botão em cada frase'); assert.equal($('.lervoz'), null, 'o painel só abre ao tocar');
  $('[data-ler="0"]').click(); assert.match($('.lervoz .heard').textContent, /Toque no microfone, leia a frase e toque de novo para enviar/);
  await ler(0, 'Ils ont un petit chat'); assert.equal($$('.lervoz .words .g').length, 5); assert.equal($$('.lervoz .words .r').length, 0);
  assert.match($('.lv-res').textContent, /Muito bem! Você acertou 5 de 5 palavras\./); assert.doesNotMatch($('.lv-res').textContent, /Reforço/); assert.equal($('[data-lv="guardar"]'), null, 'nada difícil para guardar');
  assert.equal(S.get().mistakes.length, 0); assert.equal(S.skill('pronuncia').n, 1); assert.equal(S.skill('pronuncia').v, 1);
});

test('ler em voz alta: palavras que não saíram ficam em vermelho, a frase vai para o Reforço e as difíceis viram cartas', async () => {
  const id = preparar(); await goto('#/'); await goto(`#/leitura/${id}`);
  await ler(0, 'ils ont un');
  assert.deepEqual($$('.lervoz .words .g').map((s) => s.textContent), ['ils', 'ont', 'un']); assert.deepEqual($$('.lervoz .words .r').map((s) => s.textContent), ['petit', 'chat']);
  assert.match($('.lv-res').textContent, /Quase lá\. Você acertou 3 de 5 palavras\..*As vermelhas não foram reconhecidas.*A frase vai para o Reforço/);
  assert.equal(S.get().mistakes.length, 1); const ex = S.get().mistakes[0].ex; assert.deepEqual([ex.unit, ex.kind, ex.answer, ex.shown, ex.audio], ['leitura', 'speak', 'Ils ont un petit chat', 'Ils ont un petit chat.', 'Ils ont un petit chat.']);
  assert.ok(Math.abs(S.skill('pronuncia').v - 0.6) < 1e-9, 'nota 3 de 5');
  assert.match($('[data-lv="guardar"]').textContent, /Guardar difíceis \(2\)/); $('[data-lv="guardar"]').click();
  assert.deepEqual(S.cartas().map((c) => [c.fr, c.pt, c.frase, c.origem]), [['petit', 'pequeno', 'Ils ont un petit chat.', 'leitura-voz'], ['chat', '', 'Ils ont un petit chat.', 'leitura-voz']], 'o significado vem da página quando ela já trazia');
  assert.equal($('[data-lv="guardar"]').disabled, true); assert.match(toasts(), /2 palavras guardadas nas suas cartas/); $('[data-lv="guardar"]').click(); assert.equal(S.cartas().length, 2);
  $('[data-lv="de-novo"]').click(); assert.ok($('.lv-mic'), 'tentar de novo volta ao microfone'); assert.equal($('.lervoz .words'), null);
  // a frase errada volta em Rever erros como exercício de fala
  S.get().mistakes[0].due = 0; await goto('#/praticar'); await goto('#/practice/review'); assert.ok($('.q'), 'há exercícios no Reforço');
});

test('ler em voz alta: só uma frase por vez; apóstrofo curvo e palavras curtas; erro do reconhecimento; sem chave avisa', async () => {
  const id = preparar(); await goto('#/'); await goto(`#/leitura/${id}`);
  $('[data-ler="0"]').click(); assert.ok($('[data-box="0"] .lv-mic')); $('[data-ler="1"]').click(); assert.equal($('[data-box="0"] .lv-mic'), null, 'abrir a leitura de outra frase fecha a anterior'); assert.ok($('[data-box="1"] .lv-mic'));
  await ler(1, 'leva'); assert.deepEqual($$('.lervoz .words .r').map((s) => s.textContent), ['il', 'se', 'à', "l'aube"]); assert.match($('[data-lv="guardar"]').textContent, /Guardar difíceis \(1\)/, 'palavras de até 2 letras (il, se, à) não valem uma carta'); $('[data-lv="guardar"]').click();
  assert.deepEqual(S.cartas().map((c) => [c.fr, c.frase]), [["l'aube", 'Il se leva à l’aube.']], 'a carta guarda o apóstrofo normalizado e a frase original (curvo)'); const { cartaExercicios } = await import('../js/exercises.js');
  assert.match(cartaExercicios(S.cartas()[0])[0].q, /Il se leva à ____\./, 'e a lacuna ainda acha a palavra');
  S.get().mistakes = []; await goto('#/praticar'); await goto(`#/leitura/${id}`); $('[data-ler="0"]').click();
  const realFetch = globalThis.fetch; globalThis.fetch = async (_u, o) => ((JSON.parse(o.body).contents[0].parts[1] || {}).inlineData ? new Response('{}', { status: 500 }) : new Response('{}', { status: 500 }));
  try { $('.lv-mic').click(); await tick(); mock.timers.tick(1500); $('.lv-mic').click(); await tick(100); } finally { globalThis.fetch = realFetch; }
  assert.ok($('.lervoz .heard').textContent.length > 5 && !$('.lv-mic').classList.contains('on'), 'o erro aparece e o microfone volta ao normal'); assert.equal(S.get().mistakes.length, 0, 'falha técnica não conta como erro de leitura');
  S.setKey('gemini', ''); await goto('#/praticar'); await goto(`#/leitura/${id}`); $('[data-ler="0"]').click(); assert.equal($('.lervoz'), null); assert.match(toasts(), /Para ler em voz alta, coloque uma chave/);
});

test('"Algo errado nesta frase?": escolhe o tipo, explica e o caso fica guardado com a frase e as marcas', async () => {
  const id = preparar(); await goto('#/'); await goto(`#/leitura/${id}`); assert.equal($$('[data-aviso]').length, 2);
  $('[data-aviso="0"]').click(); assert.ok($('#folha .scsheet')); assert.deepEqual($$('#atipo option').map((o) => o.value), ['marcas', 'leitura', 'traducao', 'outro']);
  $('#atipo').value = 'marcas'; $('#anota').value = 'o t de ont soa por causa da ligação'; $('#aenviar').click();
  assert.equal($('#folha .scsheet'), null, 'a folha fecha'); assert.match(toasts(), /Aviso guardado/); assert.equal(S.avisos().length, 1); const a = S.avisos()[0];
  assert.deepEqual([a.tipo, a.onde, a.texto, a.nota], ['marcas', 'frase', 'Ils ont un petit chat.', 'o t de ont soa por causa da ligação']); assert.deepEqual(JSON.parse(a.detalhe), { marcada: FRASES[0].marcada, leitura: FRASES[0].leitura, pt: FRASES[0].pt, regras: FRASES[0].regras });
  $('[data-aviso="1"]').click(); $('#acancelar').click(); assert.equal(S.avisos().length, 1, 'cancelar não guarda');
});

test('"Algo errado neste verbete?": fecha o dicionário e guarda o verbete inteiro com a frase', async () => {
  const id = preparar(); const D = await import('../js/dicionario.js'); D.guardarVerbete(D.chaveVerbete('petit', FRASES[0].fr), VERBETE);
  await goto('#/'); await goto(`#/leitura/${id}`); $$('.cd-frase[data-i="0"] .pal')[3].click(); await tick(30); assert.ok($('#dic-aviso'), 'o verbete tem o aviso');
  $('#dic-aviso').click(); assert.ok($('#aenviar'), 'abre o aviso'); assert.equal($('#dic'), null, 'o dicionário fechou'); assert.ok(!$('.pal.on'), 'a palavra deixa de estar marcada');
  assert.deepEqual($$('#atipo option').map((o) => o.value), ['significado', 'leitura', 'exemplo', 'outro']); $('#atipo').value = 'significado'; $('#aenviar').click();
  const a = S.avisos()[0]; assert.deepEqual([a.tipo, a.onde, a.texto], ['significado', 'verbete', 'petit']); assert.equal(JSON.parse(a.detalhe).frase, FRASES[0].fr); assert.equal(JSON.parse(a.detalhe).verbete.lema, 'petit');
  $$('.cd-frase[data-i="0"] .pal')[1].click(); await tick(20); assert.equal($('#dic-aviso'), null, 'sem verbete (consultando) não há o que avisar'); $('.scsheet').click();
});

test('Ajustes → Seus dados: conta os avisos, baixa o arquivo e apaga com confirmação', async () => {
  S.resetAll(); await goto('#/'); await goto('#/settings/dados'); assert.match(text(), /Avisos da Leitura.*Quando a IA errar/s); assert.equal($('#savdown'), null);
  S.addAviso({ tipo: 'marcas', onde: 'frase', texto: 'Ils ont' }); S.addAviso({ tipo: 'outro', onde: 'verbete', texto: 'petit' }); await goto('#/settings'); await goto('#/settings/dados');
  assert.match(text(), /2 casos guardados/); baixados.length = 0; $('#savdown').click(); await tick(10); assert.ok(baixados.some((n) => /^clarte-avisos-\d{4}-\d{2}-\d{2}\.json$/.test(n)), `arquivo de avisos: ${baixados}`);
  confirmou = false; $('#savclear').click(); assert.equal(S.avisos().length, 2, 'cancelar mantém'); confirmou = true; $('#savclear').click(); await tick(20); assert.equal(S.avisos().length, 0); assert.match(text(), /Quando a IA errar/);
  S.addAviso({ tipo: 'outro' }); await goto('#/settings'); await goto('#/settings/dados'); assert.match(text(), /1 caso guardado/);
});
