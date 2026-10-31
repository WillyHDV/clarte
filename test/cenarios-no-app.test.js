// Cenários da Clara de ponta a ponta no jsdom: lista, ficha da missão, ligação com objetivos marcados ao vivo e resultado.
// A IA e a transcrição são simuladas (fetch); o microfone é um gravador de mentira.
import './support/storage.js';
import { test, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

mock.timers.enable({ apis: ['Date'], now: new Date(2026, 10, 1, 10) });

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { url: 'file:///clarte/index.html', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
const w = dom.window;
const put = (k, v) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
for (const k of ['document', 'location', 'history', 'navigator', 'screen', 'Element', 'HTMLElement', 'Node', 'Event', 'KeyboardEvent', 'MouseEvent', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) put(k, w[k]);
put('window', w);
w.scrollTo = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
put('matchMedia', w.matchMedia);
put('confirm', () => true); w.confirm = globalThis.confirm; w.alert = () => {};
w.history.replaceState = (_s, _t, url) => { w.location.hash = String(url).split('#')[1] ? '#' + String(url).split('#')[1] : ''; };
const problems = [];
process.on('unhandledRejection', (e) => problems.push(`promessa sem tratamento: ${e && e.message}`));
w.addEventListener('error', (e) => problems.push(`erro na tela: ${e.message}`));

class FakeRecorder {
  constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm'; }
  static isTypeSupported() { return true; }
  start() { this.state = 'recording'; }
  stop() { this.state = 'inactive'; if (this.ondataavailable) this.ondataavailable({ data: new Blob([new Uint8Array(2000)]) }); setTimeout(() => this.onstop && this.onstop(), 0); }
}
w.MediaRecorder = globalThis.MediaRecorder = FakeRecorder;
Object.defineProperty(w.navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) } });

// IA simulada: respostas e falas do aluno saem de filas
const filaIA = []; const filaAluno = []; const pedidosIA = []; let pedidosTranscricao = 0;
const sse = (texto) => new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: texto }] } }] })}\n\n`)); c.close(); } }), { status: 200, headers: { 'content-type': 'text/event-stream' } });
const texto = (t) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: t }] } }] }), { status: 200 });
globalThis.fetch = async (url, opts) => {
  const u = String(url); const corpo = JSON.parse(opts.body);
  if (u.includes(':streamGenerateContent')) { pedidosIA.push(corpo); return sse(filaIA.shift() || 'Très bien.\n##OK:'); }
  if (u.includes(':generateContent') && (corpo.contents[0].parts[1] || {}).inlineData) { pedidosTranscricao++; return texto(filaAluno.shift() || ''); }
  return new Response('{}', { status: 500 });
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const tick = (ms = 25) => new Promise((r) => setTimeout(r, ms));
async function goto(hash) { w.location.hash = hash; await tick(80); }
async function esperar(cond, quanto = 4000, dica = '') { const t0 = Date.now(); for (;;) { if (cond()) return; await new Promise((r) => setTimeout(r, 20)); mock.timers.tick(20); if (Date.now() - t0 > quanto + 1e9) break; if (realMs() > quanto) assert.fail(`tempo esgotado esperando: ${dica || cond}`); } }
const inicio = process.hrtime.bigint(); let marca = inicio; const realMs = () => Number(process.hrtime.bigint() - marca) / 1e6;
async function aguardar(cond, dica) { marca = process.hrtime.bigint(); await esperar(cond, 5000, dica); }

let S;
before(async () => { await import('../js/app.js'); S = await import('../js/store.js'); S.setKey('gemini', 'chave-de-teste'); S.setSetting('voiceEngine', 'browser'); await tick(); });
after(() => { mock.timers.reset(); assert.deepEqual(problems, [], 'erros durante a navegação'); assert.equal(localStorage.getItem('fr_errlog'), null, 'o app registrou erros no fr_errlog'); });

// o aluno fala (transcrição simulada) e a Clara responde (resposta simulada); espera a Clara voltar a ouvir
async function turno(fala, resposta) {
  filaAluno.push(fala); filaIA.push(resposta); const antes = pedidosIA.length;
  mock.timers.tick(1500); $('.call #cmic').click();
  await aguardar(() => pedidosIA.length === antes + 1 && $('.call #cmic.send'), `resposta a «${fala}»`);
}
async function abrirMissao(id, nivel) {
  await goto('#/'); await goto('#/tutor/cenarios'); $(`[data-sc="${id}"]`).click(); await tick(20);
  if (nivel) { $(`input[name="nivel"][value="${nivel}"]`).click(); await tick(20); }
  $('#scgo').click(); await aguardar(() => $('.call #cmic.send'), 'a Clara abrir e passar a vez');
}

test('a aba Cenários lista as 8 missões e a ficha mostra situação, objetivos e os 3 níveis', async () => {
  await goto('#/tutor/cenarios');
  assert.equal($$('.seg [data-m]').length, 4); assert.ok($('.seg [data-m="cenarios"].on'));
  assert.equal($$('[data-sc]').length, 8); assert.match($('[data-sc="apresentacao"]').textContent, /Primeiro encontro.*5 objetivos.*novo/s);
  $('[data-sc="apresentacao"]').click(); await tick(20);
  assert.match($('.scsheet').textContent, /madame Martin/); assert.equal($$('.scobj li').length, 5); assert.equal($$('.lvl').length, 3); assert.ok($('.lvl.on input[value="1"]'), 'sugere o nível 1 na primeira vez');
  $('input[name="nivel"][value="2"]').click(); await tick(20); assert.ok($('.lvl.on input[value="2"]'));
  $('#scno').click(); assert.equal($('.scsheet'), null);
  $('[data-sc="miniprova"]').click(); await tick(20); assert.equal($$('.lvl').length, 0, 'a mini-prova não tem escolha de nível'); assert.match($('.scsheet').textContent, /Modo prova/); $('#scno').click();
});

test('missão completa no nível 1: frases-guia, objetivos marcados ao vivo, fim sozinho e resultado', async () => {
  const xp0 = S.get().xp; pedidosIA.length = 0;
  await abrirMissao('apresentacao', 1);
  const chamada = $('.call');
  assert.match(chamada.querySelector('.call-who b').textContent, /Primeiro encontro/);
  assert.match($('#cmission').textContent, /Missãos*0 de 5/); assert.equal($$('#chints .hint').length, 2);
  assert.deepEqual($$('#chints .hint').map((h) => h.textContent), ['Bonjour, madame. Je vais bien, merci.', "Je m'appelle Willy."], 'nível 1: frases completas');
  assert.match($('#cclara').textContent, /Je suis madame Martin/, 'a Clara abre com a fala do cenário, sem chamar a IA'); assert.equal(pedidosIA.length, 0);

  await turno('Bonjour madame, je vais bien merci.', 'Enchantée. Vous vous appelez comment ?\n##OK:saudar');
  assert.match($('#cmission').textContent, /1 de 5/); assert.ok($('#cmission .mseg i.on'));
  assert.equal($('#cclara').textContent.includes('##'), false, 'o marcador não aparece');
  assert.deepEqual($$('#chints .hint').map((h) => h.textContent)[0], "Je m'appelle Willy.", 'as dicas andam para os próximos objetivos');
  assert.match(JSON.stringify(pedidosIA[0].systemInstruction), /madame Martin/); assert.match(JSON.stringify(pedidosIA[0].systemInstruction), /##OK:/);

  await turno("Je m'appelle Willy.", 'Très bien, Willy. Vous êtes de quelle nationalité ?\n##OK:nome');
  await turno('Je suis brésilien.', "Ah, le Brésil ! Où est-ce que vous habitez ?\n##OK:nacionalidade");
  await turno("J'habite à Maceió.", 'Maceió, très bien. Et vous faites quoi ?\n##OK:cidade');
  assert.match($('#cmission').textContent, /4 de 5/);

  // último objetivo + ##FIN: a Clara conclui, o app pede a avaliação e mostra o resultado
  filaAluno.push('Je suis étudiant.'); filaIA.push("Parfait. Bienvenue chez nous. À bientôt !\n##OK:profissao\n##FIN");
  filaIA.push('**Missão:** cumprida\n**Objetivos:**\n✓ Cumprimentar — ótimo\n✓ Nome — ótimo\n✓ Nacionalidade — ótimo\n✓ Cidade — ótimo\n✓ Profissão — ótimo\n**Erro mais importante:** nenhum\n**Repita em voz alta:** Je suis étudiant.\n##FINAL:saudar,nome,nacionalidade,cidade,profissao');
  mock.timers.tick(1500); $('.call #cmic').click();
  await aguardar(() => $('.csum'), 'o resultado da missão');
  assert.equal($('.call:not(.csum-wrap)'), null, 'a ligação fechou'); assert.match($('.csum h2').textContent, /Missão cumprida/); assert.match($('.csum .csub').textContent, /Com frases · 5 de 5/);
  assert.equal($$('.csum .mlist li.ok').length, 5); assert.match($('.creport').textContent, /Repita em voz alta/); assert.equal($('.creport').textContent.includes('##'), false);
  assert.ok(pedidosTranscricao >= 5, 'cada fala do aluno passou pela transcrição');
  const final = pedidosIA.at(-1); assert.equal(final.contents.at(-1).parts[0].text, '[FIN]', 'a avaliação foi pedida com [FIN]');
  const x = S.get().scenarios.apresentacao; assert.deepEqual([x.runs, x.best, x.levelDone, x.nivel], [1, 5, 1, 1]); assert.equal(S.get().xp, xp0 + 25 + 20, '5 objetivos × 5 + 20 da missão cumprida');
  $('#csclose').click(); assert.equal($('.csum'), null); assert.match($('#app').textContent, /✅ nível 1/, 'a lista mostra o nível vencido');
});

test('o botão "Terminar" encerra com resultado parcial, e a avaliação final confere o que foi marcado', async () => {
  pedidosIA.length = 0; await abrirMissao('colega', 2);
  assert.deepEqual($$('#chints .hint').map((h) => h.textContent), ['Salut…', "Tu t'appelles…"], 'nível 2: só o começo das frases');
  await turno('Salut ! Ça va ?', "Salut ! Oui, ça va. Moi, c'est Léa.\n##OK:saudar");
  filaIA.push('**Missão:** parcial\n✓ Cumprimentar\n✗ Perguntar o nome\n✓ Origem — você disse de onde é\n##FINAL:saudar,origem');
  $('#cfin').click(); await aguardar(() => $('.csum'), 'o resultado parcial');
  assert.match($('.csum h2').textContent, /Missão parcial/); assert.match($('.csum .csub').textContent, /Com dicas · 2 de 5/, 'a avaliação final acrescentou "origem" que a marcação ao vivo tinha perdido');
  assert.deepEqual($$('.csum .mlist li').map((li) => li.classList.contains('ok')), [true, false, true, false, false]);
  assert.equal(S.get().scenarios.colega.levelDone, 0, 'parcial não vence o nível'); assert.equal(S.get().scenarios.colega.best, 2);
  $('#csagain').click(); await tick(30); assert.ok($('.scsheet'), '"Repetir a missão" volta para a ficha'); assert.ok($('.lvl.on input[value="1"]'), 'e sugere o mesmo nível, que ainda não foi vencido'); $('#scno').click();
});

test('modo prova (nível 3): sem frases na tela, sem lista de objetivos, instruções sem correção e sair no meio não grava nada', async () => {
  pedidosIA.length = 0; const antes = JSON.stringify(S.get().scenarios.miniprova || null);
  await abrirMissao('miniprova');
  assert.equal($('#chints').hidden, true); assert.match($('#cmission').textContent, /Modo prova/); assert.equal($('#cmission .mseg'), null);
  await turno('Bonjour madame, je vais bien.', 'Très bien. Vous vous appelez comment ?\n##OK:saudar');
  assert.match(JSON.stringify(pedidosIA[0].systemInstruction), /NIVEAU 3/); assert.equal($('#chints').hidden, true);
  $('.call #cend').click(); await tick(30);
  assert.equal($('.call'), null); assert.equal($('.csum'), null, 'sem resultado se você sai no meio'); assert.equal(JSON.stringify(S.get().scenarios.miniprova || null), antes);
});

test('a missão termina sozinha quando os turnos acabam, mesmo sem cumprir tudo', async () => {
  pedidosIA.length = 0; await abrirMissao('despedida', 1);
  for (let i = 0; i < 9; i++) await turno('Euh…', 'Pardon ?\n##OK:');
  filaAluno.push('Salut Léa, à demain !'); filaIA.push('Au revoir, Willy !\n##OK:colega');
  filaIA.push('**Missão:** parcial\n✓ Despedir-se da colega\n##FINAL:colega');
  mock.timers.tick(1500); $('.call #cmic').click();
  await aguardar(() => $('.csum'), 'o resultado depois do limite de turnos');
  assert.match($('.csum h2').textContent, /Missão parcial/); assert.match($('.csum .csub').textContent, /1 de 5/); $('#csclose').click();
});
