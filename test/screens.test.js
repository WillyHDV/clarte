// Testes de tela: carrega o index.html no jsdom, importa o app de verdade e navega pelas telas.
// Não substituem testar no celular, mas pegam telas que quebram (erro de código, texto "undefined", botão que sumiu).
import './support/storage.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { UNITS } from '../js/data.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { url: 'file:///clarte/index.html', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
const w = dom.window;
const put = (k, v) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
for (const k of ['document', 'location', 'history', 'navigator', 'screen', 'Element', 'HTMLElement', 'Node', 'Event', 'KeyboardEvent', 'MouseEvent', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) put(k, w[k]);
put('window', w);
w.scrollTo = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
put('matchMedia', w.matchMedia);
put('confirm', () => true); put('prompt', () => ''); w.confirm = globalThis.confirm; w.alert = () => {};

w.history.replaceState = (_s, _t, url) => { w.location.hash = String(url).split('#')[1] ? '#' + String(url).split('#')[1] : ''; }; // o jsdom recusa replaceState em file:
const problems = [];
process.on('unhandledRejection', (e) => problems.push(`promessa sem tratamento: ${e && e.message}`));
w.addEventListener('error', (e) => problems.push(`erro na tela: ${e.message}`));

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const text = () => $('#app').textContent.replace(/\s+/g, ' ');
const tick = (ms = 25) => new Promise((r) => setTimeout(r, ms));
async function goto(hash) { w.location.hash = hash; await tick(); }
const noBroken = (where) => assert.ok(!/undefined|NaN|\[object|{{/.test($('#app').textContent), `texto quebrado em ${where}: ${text().match(/.{0,40}(undefined|NaN|\[object|{{).{0,40}/)?.[0]}`);

// responde qualquer exercício (certo ou errado) até aparecer a tela final
async function drive(hash) {
  await goto(hash);
  for (let n = 0; n < 80; n++) {
    if ($('.end')) return $('.end').textContent.replace(/\s+/g, ' ');
    const ok = $('#ok'); assert.ok(ok, `sem botão de verificar em ${hash} (passo ${n}): ${text().slice(0, 120)}`);
    if (ok.textContent.trim() !== 'Continuar') {
      const inp = $('#inp'); const tile = $('#bank [data-b]');
      if ($('.opt')) $('.opt').click(); else if (inp) { inp.value = 'x'; inp.dispatchEvent(new w.Event('input')); } else if (tile) tile.click();
    }
    ok.click();
  }
  assert.fail(`a sessão ${hash} não terminou em 80 passos`);
}

let S;
before(async () => { await import('../js/app.js'); S = await import('../js/store.js'); await tick(); });
after(() => { assert.deepEqual(problems, [], 'erros durante a navegação'); assert.equal(localStorage.getItem('fr_errlog'), null, 'o app registrou erros no fr_errlog'); });

test('início: prontidão, plano do dia e as 8 unidades', () => {
  const t = text();
  assert.match(t, /Prontidão para a prova/);
  for (const u of UNITS) assert.ok(t.includes(u.title), `unidade ausente no início: ${u.title}`);
  assert.equal($$('nav.tabs a').length, 4);
  assert.ok($$('nav.tabs a.on').some((a) => a.dataset.p === 'home'));
  noBroken('início');
});

test('cada unidade abre com aula e degraus', async () => {
  for (const u of UNITS) {
    await goto(`#/unit/${u.id}`);
    assert.ok(text().includes(u.title), `título de ${u.id}`);
    assert.ok($$('[data-step]').length >= 4, `degraus de ${u.id}`);
    assert.ok($('#learned'), `botão "marcar como lida" de ${u.id}`);
    assert.ok($$('[data-say]').length > 0 || u.id === 'negation', `botões de áudio em ${u.id}`);
    noBroken(`unidade ${u.id}`);
  }
});

test('marcar a lição como lida grava no progresso', async () => {
  await goto('#/unit/comm'); $('#learned').click(); await tick();
  assert.equal(S.pathOf('comm').learned, true);
});

test('treino de cada unidade chega até o fim e registra a sessão', async () => {
  const xp0 = S.get().xp;
  for (const u of UNITS) {
    const end = await drive(`#/practice/${u.id}`);
    assert.match(end, /\d+\/\d+ corretas/, `tela final de ${u.id}`);
    assert.ok(S.get().units[u.id].sessions >= 1, `sessão de ${u.id} não registrada`);
    noBroken(`treino ${u.id}`);
  }
  assert.ok(Object.keys(S.get().mastery).length > 20, 'o domínio por item deveria ter sido gravado');
  assert.ok(S.get().mistakes.length > 0, 'respostas erradas deveriam ir para a revisão');
  assert.ok(S.get().xp >= xp0);
});

test('treino inteligente (mix), degraus da trilha e reforço', async () => {
  assert.match(await drive('#/practice/mix'), /corretas/);
  assert.match(await drive('#/step/comm/recog'), /corretas/);
  assert.match(await drive('#/step/verbes/write'), /corretas/);
  assert.match(await drive('#/practice/review'), /corretas/);
});

test('fim do treino mostra o ganho de domínio e volta ao início', async () => {
  await drive('#/practice/comm');
  assert.match($('.end').textContent, /Domínio da unidade/);
  $('.end [data-go="#/"]').click(); await tick();
  assert.match(text(), /Prontidão para a prova/);
});

test('Clara sem chave pede a chave; o link de configuração salva e abre o chat', async () => {
  await goto('#/tutor');
  assert.ok($('#savekey'), 'formulário de chave');
  await goto('#/setup/gemini/AIzaTESTE');
  assert.equal(S.get().settings.keys.gemini, 'AIzaTESTE');
  assert.match(w.location.hash, /^#\/tutor/, 'a chave some da barra de endereço');
  assert.ok($('#tin'), 'campo de mensagem');
  assert.match(text(), /Comment tu t’appelles/, 'frase de abertura da Clara');
});

test('Clara: abas, prova oral, envio de mensagem e limpar conversa', async () => {
  const realFetch = globalThis.fetch; const sent = [];
  globalThis.fetch = async (url, opts) => { if (!/streamGenerateContent/.test(String(url))) return new Response('{}', { status: 500 }); /* voz (TTS) falha: o chat segue */ sent.push(JSON.parse(opts.body)); return new Response(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Très bien, Willy ! Tu habites où ?\n---\nBoa frase.' }] } }] })}\n\n`, { status: 200 }); };
  try {
    await goto('#/tutor/free');
    $('#tin').value = "je m'appelle Willy"; $('#tsend').click(); await tick(150);
    assert.match(text(), /Très bien, Willy ! Tu habites où ?/); assert.match(text(), /Boa frase/);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].contents.at(-1).parts[0].text, "je m'appelle Willy");
    assert.match(sent[0].systemInstruction.parts[0].text, /MODE : conversation libre/);
    // aba da prova oral e das dúvidas
    $('.seg [data-m="exam"]').click(); await tick(); assert.ok($('#startexam'), 'botão da prova');
    $('.seg [data-m="duvidas"]').click(); await tick(); assert.match(text(), /Pode perguntar qualquer dúvida/);
    // limpar conversa
    $('.seg [data-m="free"]').click(); await tick(); $('#newc').click(); await tick();
    assert.doesNotMatch(text(), /Très bien, Willy/);
  } finally { globalThis.fetch = realFetch; }
});

test('Clara mostra o erro em português quando a IA falha', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'bad key' } }), { status: 401 });
  try {
    await goto('#/tutor/free'); $('#tin').value = 'bonjour'; $('#tsend').click(); await tick(150);
    assert.match(text(), /Chave inválida/);
  } finally { globalThis.fetch = realFetch; }
});

test('ajustes: seções, exportar backup e apagar progresso', async () => {
  await goto('#/settings');
  const t = text();
  for (const s of ['Seus dados', 'Diagnóstico', 'Sobre']) assert.ok(t.includes(s), `seção ausente: ${s}`);
  assert.ok(t.includes(`v${(await import('../js/version.js')).VERSION}`), 'versão visível');
  noBroken('ajustes');
  $('#sexport').click(); await tick();
  assert.match($('#sbk').textContent, /Backup salvo/);
  assert.ok(S.get().lastBackup, 'registra a data do backup');
  $('#sreset').click(); await tick();
  assert.equal(Object.keys(S.get().mastery).length, 0, 'apagar progresso zera o domínio');
});

test('folha de revisão: todas as seções e botão de imprimir', async () => {
  await goto('#/folha');
  for (const h of ["L'alphabet", 'Problèmes de communication', 'Se présenter', 'Saluer et prendre congé', 'Les verbes', 'Nationalités et métiers', "L'interrogation", 'La négation', 'Como a prova oral é avaliada']) assert.ok(text().includes(h), `seção ausente na folha: ${h}`);
  assert.ok($('#fprint'));
  noBroken('folha');
});

test('diagnóstico: botões e informações do aparelho', async () => {
  await goto('#/diag'); await tick(100);
  assert.equal($$('[data-t]').length, 5);
  assert.ok($$('#dres li').length >= 8, 'linhas de informação');
  assert.match($('#dres').textContent, /Versão do app/);
  noBroken('diagnóstico');
});

test('rota desconhecida cai no início e nenhuma tela some o menu', async () => {
  await goto('#/nao-existe'); assert.match(text(), /Prontidão para a prova/);
  assert.equal($$('nav.tabs a').length, 4);
});
