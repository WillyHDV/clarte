// Testes de tela: carrega o index.html no jsdom, importa o app de verdade e navega pelas telas.
// Não substituem testar no celular, mas pegam telas que quebram (erro de código, texto "undefined", botão que sumiu).
import './support/storage.js';
import { test, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { UNITS } from '../js/data.js';

// relógio fixo (1/11/2026, três dias antes da Évaluation 1): o texto do início depende da data de hoje
const DIA = (m, d, h = 10) => new Date(2026, m - 1, d, h);
mock.timers.enable({ apis: ['Date'], now: DIA(11, 1) });

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

// associar pares: o índice do par está nos botões (data-l / data-r), então o parceiro certo é o de mesmo índice
async function resolverPares(comErro) {
  const n = $$('#mleft .mbtn').length;
  if (comErro) { $('#mleft [data-l="0"]').click(); $('#mright [data-r="1"]').click(); await tick(470); } // trava de 450 ms depois de um erro
  for (let k = 0; k < n; k++) { $(`#mleft [data-l="${k}"]`).click(); $(`#mright [data-r="${k}"]`).click(); }
}

// responde qualquer exercício (certo ou errado) até aparecer a tela final
async function drive(hash) {
  await goto(hash);
  for (let n = 0; n < 80; n++) {
    if ($('.end')) return $('.end').textContent.replace(/\s+/g, ' ');
    const ok = $('#ok'); assert.ok(ok, `sem botão de verificar em ${hash} (passo ${n}): ${text().slice(0, 120)}`);
    if (ok.textContent.trim() !== 'Continuar') {
      const inp = $('#inp'); const tile = $('#bank [data-b]');
      if ($('#match')) await resolverPares(n % 2 === 0); // nos pares, um treino sim e outro não começa errando de propósito
      else if ($('.opt')) $('.opt').click(); else if (inp) { inp.value = 'x'; inp.dispatchEvent(new w.Event('input')); } else if (tile) tile.click();
    }
    ok.click();
  }
  assert.fail(`a sessão ${hash} não terminou em 80 passos`);
}

let S;
before(async () => { await import('../js/app.js'); S = await import('../js/store.js'); await tick(); });
after(() => { mock.timers.reset(); assert.deepEqual(problems, [], 'erros durante a navegação'); assert.equal(localStorage.getItem('fr_errlog'), null, 'o app registrou erros no fr_errlog'); });

test('início: prontidão, plano do dia e as 8 unidades', () => {
  const t = text();
  assert.match(t, /Prontidão para a avaliação/);
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
  assert.match(text(), /Prontidão para a avaliação/);
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
  assert.equal($$('[data-t]').length, 6);
  assert.ok($$('#dres li').length >= 8, 'linhas de informação');
  assert.match($('#dres').textContent, /Versão do app/);
  noBroken('diagnóstico');
});

test('rota desconhecida cai no início e nenhuma tela some o menu', async () => {
  await goto('#/nao-existe'); assert.match(text(), /Prontidão para a avaliação/);
  assert.equal($$('nav.tabs a').length, 4);
});

async function inicioEm(data) { mock.timers.setTime(data.getTime()); await goto('#/settings'); await goto('#/'); return text(); }

test('início segue a próxima avaliação: contagem, reta final e folha', async () => {
  let t = await inicioEm(DIA(11, 1));
  assert.match(t, /Évaluation 1 em 3 dias \(04\/11\)/); assert.match(t, /Reta final · Évaluation 1/); assert.ok($('[data-go="#/folha"]'), 'folha de revisão da avaliação 1');
  assert.match(await inicioEm(DIA(11, 3)), /Évaluation 1 é amanhã/);
  assert.match(await inicioEm(DIA(11, 4, 20)), /Hoje é a Évaluation 1/);
  t = await inicioEm(DIA(11, 6));
  assert.match(t, /Évaluation 2 em 26 dias \(02\/12\)/); assert.doesNotMatch(t, /Reta final/, 'longe da avaliação 2 a reta final some');
  t = await inicioEm(DIA(11, 25));
  assert.match(t, /Reta final · Évaluation 2/); assert.ok(!$('[data-go="#/folha"]'), 'a avaliação 2 ainda não tem folha');
  assert.match(await inicioEm(DIA(12, 10)), /Nenhuma avaliação marcada/);
  noBroken('início depois de todas as avaliações');
  await inicioEm(DIA(11, 1));
});

test('Ajustes: mudar a data de uma avaliação muda a contagem; vazio e "voltar" restauram', async () => {
  await goto('#/settings');
  assert.deepEqual($$('[data-eval]').map((i) => i.value), ['2026-11-04', '2026-12-02']);
  const eval1 = $('[data-eval="eval1"]'); eval1.value = '2026-11-10'; eval1.dispatchEvent(new w.Event('change')); await tick();
  assert.equal(S.get().settings.evalDates.eval1, '2026-11-10');
  assert.match(await inicioEm(DIA(11, 1)), /Évaluation 1 em 9 dias \(10\/11\)/);
  await goto('#/settings'); const again = $('[data-eval="eval1"]'); again.value = ''; again.dispatchEvent(new w.Event('change')); await tick();
  assert.deepEqual(S.get().settings.evalDates, {}, 'data vazia volta à data do curso');
  $('[data-eval="eval2"]').value = '2026-12-09'; $('[data-eval="eval2"]').dispatchEvent(new w.Event('change')); await tick();
  $('#sevreset').click(); await tick();
  assert.deepEqual(S.get().settings.evalDates, {}); assert.equal($('[data-eval="eval2"]').value, '2026-12-02');
});

// ---- Evolução (histórico e gráficos) ----
test('os treinos e a tela inicial gravam o histórico do dia', async () => {
  S.resetAll(); mock.timers.setTime(DIA(11, 1).getTime());
  await goto('#/settings'); await goto('#/');
  assert.equal(S.get().history.at(-1).d, '2026-11-01'); assert.equal(typeof S.get().history.at(-1).r, 'number', 'início grava a prontidão do dia');
  const fim = await drive('#/practice/comm');
  const h = S.get().history.at(-1); const [, ok, tot] = /(\d+)\/(\d+) corretas/.exec(fim).map(Number);
  assert.equal(h.n, Math.max(tot, 1)); assert.equal(h.ok, ok, 'o histórico bate com o resultado mostrado na tela final');
});

test('Evolução sem histórico mostra o convite, sem gráficos quebrados', async () => {
  S.resetAll(); S.get().history = []; S.save(); await goto('#/settings'); await goto('#/history');
  assert.match(text(), /Ainda não há histórico/); assert.equal($$('figure.chart').length, 0); assert.ok($('[data-go="#/practice/mix"]'));
  assert.equal($$('.tile').length, 4); noBroken('evolução vazia');
});

function semear() {
  S.resetAll(); const dias = [];
  for (let k = 29; k >= 0; k--) { const d = new Date(2026, 10, 1 - k).toLocaleDateString('sv-SE'); dias.push({ d, n: k % 5 === 2 ? 0 : 10 + k, ok: k % 5 === 2 ? 0 : 7, r: k % 7 === 3 ? null : 20 + (29 - k) }); }
  S.get().history = dias; S.get().streak = 4;
  S.get().exams = [{ date: new Date(2026, 9, 28).toISOString(), score: 5.5, crit: {} }, { date: new Date(2026, 10, 1).toISOString(), score: 7.5, crit: {} }]; S.save();
}

test('Evolução com dados: cartões, três gráficos acessíveis e tabelas equivalentes', async () => {
  semear(); mock.timers.setTime(DIA(11, 1).getTime()); await goto('#/settings'); await goto('#/history');
  assert.equal($$('figure.chart').length, 3); assert.equal($$('svg.chart-svg').length, 3);
  const cartoes = $$('.tile').map((t) => [...t.children].map((c) => c.textContent).join(' '));
  assert.match(cartoes[0], /Dias seguidos 4/); assert.match(cartoes[3], /Simulações da prova 2 melhor nota 7,5\/10/);
  for (const svg of $$('svg.chart-svg')) { assert.equal(svg.getAttribute('role'), 'img'); assert.ok(svg.getAttribute('aria-label').length > 20, 'descrição do gráfico'); assert.equal(svg.getAttribute('tabindex'), '0'); }
  assert.match($$('svg.chart-svg')[0].getAttribute('aria-label'), /Prontidão para a avaliação: de 20% em 03\/10 para 49% em 01\/11/);
  assert.match($$('svg.chart-svg')[2].getAttribute('aria-label'), /de 5,5 em 28\/10 para 7,5 em 01\/11/);
  const tabelas = $$('figure.chart table'); assert.equal(tabelas.length, 3);
  assert.equal(tabelas[0].querySelectorAll('tbody tr').length, 30); assert.equal(tabelas[2].querySelectorAll('tbody tr').length, 2);
  assert.match(tabelas[1].textContent, /Exercícios.*Acertos/s);
  assert.doesNotMatch(document.body.innerHTML, /NaN|undefined/); assert.ok($$('nav.tabs a.on').some((a) => a.dataset.p === 'home'), 'Trilha continua marcada');
});

test('Evolução: tocar mostra o dia, setas andam e Esc limpa', async () => {
  semear(); await goto('#/settings'); await goto('#/history');
  const fig = $$('figure.chart')[1]; const svg = fig.querySelector('svg'); const out = fig.querySelector('.readout'); const cursor = fig.querySelector('.ch-cursor');
  svg.getBoundingClientRect = () => ({ left: 0, width: 340, top: 0, height: 190 });
  assert.ok(cursor.hasAttribute('hidden'), 'começa sem cursor');
  svg.dispatchEvent(new w.MouseEvent('pointerdown', { clientX: 328, bubbles: true }));
  assert.match(out.textContent, /^01\/11 · \d+ exercícios, 7 acertos/); assert.ok(!cursor.hasAttribute('hidden'), 'o cursor aparece');
  svg.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })); assert.match(out.textContent, /^31\/10 ·/);
  svg.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); svg.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.match(out.textContent, /^01\/11 ·/, 'não passa do último dia');
  svg.dispatchEvent(new w.MouseEvent('pointerdown', { clientX: 34, bubbles: true })); assert.match(out.textContent, /^03\/10 ·/);
  svg.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); assert.ok(cursor.hasAttribute('hidden'));
  // dia sem exercício
  svg.dispatchEvent(new w.MouseEvent('pointerdown', { clientX: 34 + (294 / 30) * 3.5, bubbles: true }));
  assert.match(out.textContent, /nenhum exercício|exercícios/);
});

test('Evolução: com uma só simulação, mostra a dica em vez de um gráfico de um ponto', async () => {
  semear(); S.get().exams = [{ date: new Date(2026, 10, 1).toISOString(), score: 6, crit: {} }]; S.save();
  await goto('#/settings'); await goto('#/history');
  assert.equal($$('figure.chart').length, 2); assert.match(text(), /Faça mais uma simulação/);
});

test('início leva à Evolução e a Evolução volta ao início', async () => {
  await goto('#/settings'); await goto('#/'); $('[data-go="#/history"]').click(); await tick();
  assert.match(w.location.hash, /#\/history/); assert.ok($$('.tile').length === 4);
  $('.top .back').click(); await tick(); assert.match(text(), /Prontidão para a avaliação/);
});

// ---- associar pares na tela ----
// navega por treinos até aparecer um exercício de pares (20% dos exercícios das unidades com pares)
async function irAtePares(unidade) {
  for (let tentativa = 0; tentativa < 12; tentativa++) {
    await goto('#/settings'); await goto(`#/practice/${unidade}`);
    for (let n = 0; n < 40 && !$('.end'); n++) {
      if ($('#match')) return;
      const ok = $('#ok'); if (ok.textContent.trim() !== 'Continuar') { const inp = $('#inp'); if ($('.opt')) $('.opt').click(); else if (inp) { inp.value = 'x'; inp.dispatchEvent(new w.Event('input')); } else if ($('#bank [data-b]')) $('#bank [data-b]').click(); }
      ok.click();
    }
  }
  assert.fail(`não apareceu um exercício de pares em ${unidade}`);
}

test('pares: duas colunas, selecionar, acertar trava o par e errar pisca e conta', async () => {
  await irAtePares('comm');
  assert.equal($$('#mleft .mbtn').length, 4); assert.equal($$('#mright .mbtn').length, 4); assert.equal($('#ok').disabled, true, 'sem botão até terminar');
  $('#mleft [data-l="2"]').click(); assert.ok($('#mleft [data-l="2"]').classList.contains('sel'));
  $('#mleft [data-l="2"]').click(); assert.ok(!$('#mleft [data-l="2"]').classList.contains('sel'), 'tocar de novo desmarca');
  $('#mleft [data-l="0"]').click(); $('#mright [data-r="1"]').click(); // par errado
  assert.ok($('#mleft [data-l="0"]').classList.contains('bad') && $('#mright [data-r="1"]').classList.contains('bad'), 'pisca em vermelho');
  $('#mleft [data-l="3"]').click(); assert.ok(!$('#mleft [data-l="3"]').classList.contains('sel'), 'durante o piscar os toques são ignorados');
  await tick(480);
  assert.ok(!$('#mleft [data-l="0"]').classList.contains('bad'), 'a seleção é liberada'); assert.equal($('#mleft [data-l="0"]').classList.contains('sel'), false);
  $('#mleft [data-l="1"]').click(); $('#mright [data-r="1"]').click();
  assert.ok($('#mleft [data-l="1"]').classList.contains('done') && $('#mleft [data-l="1"]').disabled, 'par certo fica travado em verde');
  $('#mleft [data-l="1"]').click(); assert.equal(document.querySelectorAll('#mleft .mbtn.sel').length, 0, 'par travado não seleciona');
});

test('pares: ao completar verifica sozinho; com erro mostra os pares e vai para a revisão', async () => {
  await irAtePares('presenter');
  const antes = S.get().mistakes.length;
  $('#mleft [data-l="0"]').click(); $('#mright [data-r="3"]').click(); await tick(480); // erra o par 0
  for (let k = 0; k < 4; k++) { $(`#mleft [data-l="${k}"]`).click(); $(`#mright [data-r="${k}"]`).click(); }
  assert.match($('#fb').textContent, /Confira os pares/); assert.equal($$('#fb .words .r').length, 1, 'só o par errado em vermelho'); assert.equal($$('#fb .words .g').length, 3);
  assert.equal($('#ok').textContent.trim(), 'Continuar'); assert.ok($('#ok').classList.contains('bad'));
  assert.equal(S.get().mistakes.length, antes + 1, 'o exercício errado entra na revisão');
});

test('pares: cada item é avaliado sozinho (o par errado enfraquece, os certos fortalecem)', async () => {
  await irAtePares('verbes'); S.get().mastery = {};
  const itens = $$('#mleft .mbtn').map((b) => b.textContent); assert.equal(itens.length, 4);
  $('#mleft [data-l="0"]').click(); $('#mright [data-r="2"]').click(); await tick(480);
  for (let k = 0; k < 4; k++) { $(`#mleft [data-l="${k}"]`).click(); $(`#mright [data-r="${k}"]`).click(); }
  const forcas = Object.values(S.get().mastery).map((m) => m.s).sort((a, b) => a - b);
  assert.equal(forcas.length, 4, 'um registro por par'); assert.equal(forcas[0], 0, 'o par errado fica sem força'); assert.ok(forcas[1] > 0 && forcas[3] > 0, 'os acertados ganham força');
});

test('pares: perfeito conta como acerto e a sessão continua normalmente', async () => {
  await irAtePares('metiers');
  await resolverPares(false);
  assert.match($('#fb').className, /good/); assert.doesNotMatch($('#fb').textContent, /Confira/);
  $('#ok').click(); await tick(); assert.ok($('.qcard, .end'), 'foi para o próximo exercício ou para o fim');
});

// ---- Privacidade e créditos, lembretes de calendário ----
test('Privacidade e créditos: seções, link de Ajustes e volta', async () => {
  await goto('#/settings'); $('[data-go="#/about"]').click(); await tick();
  assert.match(w.location.hash, /#\/about/);
  for (const h of ['O que fica só no seu aparelho', 'O que sai do aparelho', 'Proteja a sua chave', 'Conteúdo e créditos']) assert.ok(text().includes(h), `seção ausente: ${h}`);
  assert.match(text(), /Google Gemini, Groq ou Mistral/); assert.match(text(), /Français basique 1 \(v1\)/); assert.match(text(), /sem vínculo oficial/);
  assert.ok($$('nav.tabs a.on').some((a) => a.dataset.p === 'settings'), 'a aba Ajustes continua marcada');
  noBroken('privacidade'); $('.top .back').click(); await tick(); assert.match(w.location.hash, /#\/settings/);
});

test('Ajustes: lembretes no calendário baixam só as avaliações futuras', async () => {
  const baixados = []; const proto = w.HTMLAnchorElement.prototype; const click0 = proto.click; const criar0 = URL.createObjectURL;
  let ultimo = null; URL.createObjectURL = (b) => { ultimo = b; return 'blob:teste'; }; proto.click = function () { baixados.push({ nome: this.download, blob: ultimo }); };
  try {
    const gerar = async (data) => { mock.timers.setTime(data.getTime()); await goto('#/history'); await goto('#/settings'); baixados.length = 0; $('#sics').click(); await tick(); return baixados[0]; };
    let d = await gerar(DIA(11, 1)); assert.equal(d.nome, 'clarte-avaliacoes.ics'); let t = await d.blob.text();
    assert.equal(d.blob.type, 'text/calendar'); assert.match(t, /SUMMARY:Évaluation 1 \(prova oral\)/); assert.match(t, /SUMMARY:Évaluation 2 \(prova oral\)/); assert.match(t, /DTSTART;VALUE=DATE:20261204|DTSTART;VALUE=DATE:20261202/);
    d = await gerar(DIA(11, 5)); t = await d.blob.text(); assert.doesNotMatch(t, /Évaluation 1/); assert.match(t, /Évaluation 2/);
    d = await gerar(DIA(11, 4, 20)); t = await d.blob.text(); assert.match(t, /Évaluation 1/, 'no dia da prova ela ainda entra');
    d = await gerar(DIA(12, 10)); assert.equal(d, undefined, 'sem avaliações futuras não baixa nada'); assert.match([...document.querySelectorAll('[role="status"]')].at(-1)?.textContent || '', /Não há avaliações futuras/);
    // datas ajustadas valem no arquivo
    S.setSetting('evalDates', { eval2: '2026-12-09' }); d = await gerar(DIA(11, 1)); t = await d.blob.text(); assert.match(t, /DTSTART;VALUE=DATE:20261209/);
  } finally { proto.click = click0; URL.createObjectURL = criar0; S.setSetting('evalDates', {}); await inicioEm(DIA(11, 1)); }
});

// ---- diagnóstico: vozes e reserva de modelo; Ajustes: modelo da voz ----
test('Diagnóstico → Comparar vozes: mostra os tempos e oferece trocar para a mais rápida', async () => {
  S.resetAll(); S.setKey('gemini', 'AIzaTESTE');
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const m = /models\/([^:]+):/.exec(String(url))[1];
    await new Promise((r) => setTimeout(r, m === 'gemini-3.8-flash-lite-tts' ? 5 : 60)); // a leve responde bem mais rápido
    if (m === 'gemini-3.1-flash-tts-preview') return new Response(JSON.stringify({ error: { message: 'model overloaded' } }), { status: 503 });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;rate=24000', data: 'AAAA' } }] } }] }), { status: 200 });
  };
  try {
    await goto('#/history'); await goto('#/diag'); await tick(60); $('[data-t="vozes"]').click();
    for (let n = 0; n < 60 && !/Mais rápida agora/.test($('#dres').textContent); n++) await tick(50);
    const t = $('#dres').textContent;
    assert.match(t, /Voz gemini-3\.8-flash-tts.*s/); assert.match(t, /Voz gemini-3\.8-flash-lite-tts/); assert.match(t, /Voz gemini-3\.1-flash-tts-preview.*HTTP 503 · model overloaded/);
    assert.match(t, /Mais rápida agora.*gemini-3\.8-flash-lite-tts/);
    const usar = $('[data-voz]'); assert.ok(usar, 'botão para usar a mais rápida'); assert.equal(usar.dataset.voz, 'gemini-3.8-flash-lite-tts');
    usar.click(); await tick();
    assert.equal(S.get().settings.ttsModel, 'gemini-3.8-flash-lite-tts'); assert.ok(!$('[data-voz]'), 'o botão some depois de usar');
    assert.equal($('[data-t="vozes"]').disabled, false, 'os botões voltam a funcionar');
  } finally { globalThis.fetch = realFetch; S.setSetting('ttsModel', 'auto'); }
});

test('Diagnóstico → Comparar vozes sem chave pede a chave, sem fazer pedidos', async () => {
  S.resetAll(); let pedidos = 0; const realFetch = globalThis.fetch; globalThis.fetch = async () => { pedidos++; return new Response('{}', { status: 500 }); };
  try { await goto('#/history'); await goto('#/diag'); await tick(60); $('[data-t="vozes"]').click(); await tick(80); assert.match($('#dres').textContent, /Comparar vozes.*precisa da chave/); assert.equal(pedidos, 0); } finally { globalThis.fetch = realFetch; }
});

test('Ajustes: modelo da voz natural lista os candidatos e salva a escolha', async () => {
  S.resetAll(); await goto('#/history'); await goto('#/settings');
  const opcoes = $$('#sttsm option').map((o) => o.value); assert.deepEqual(opcoes, ['auto', 'gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts']);
  assert.equal($('#sttsm').value, 'auto');
  $('#sttsm').value = 'gemini-3.8-flash-lite-tts'; $('#sttsm').dispatchEvent(new w.Event('change')); await tick(); assert.equal(S.get().settings.ttsModel, 'gemini-3.8-flash-lite-tts');
  await goto('#/history'); await goto('#/settings'); assert.equal($('#sttsm').value, 'gemini-3.8-flash-lite-tts', 'a escolha volta marcada ao reabrir');
  S.setSetting('ttsModel', 'auto');
});

test('Diagnóstico → Testar a Clara: quando uma reserva responde, mostra por que o principal falhou', async () => {
  S.resetAll(); S.setKey('gemini', 'AIzaTESTE'); localStorage.removeItem('fr_model_pref');
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const m = /models\/([^:]+):/.exec(String(url))[1];
    if (m === 'gemini-3.1-flash-lite') return new Response(JSON.stringify({ error: { message: 'The model is overloaded' } }), { status: 503 });
    return new Response(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] })}\n\n`, { status: 200 });
  };
  try {
    await goto('#/history'); await goto('#/diag'); await tick(60); $('[data-t="ia"]').click();
    for (let n = 0; n < 40 && !/Clara \(IA\)/.test($('#dres').textContent); n++) await tick(50);
    const t = $('#dres').textContent; assert.match(t, /a reserva gemini-3\.5-flash-lite respondeu \(falharam: gemini-3\.1-flash-lite \(HTTP 503 · The model is overloaded\)\)/);
    assert.ok($$('#dres li.warn').some((li) => /Clara \(IA\)/.test(li.textContent)), 'marcado como aviso');
    // ao reabrir o Diagnóstico, a reserva lembrada aparece nas informações do aparelho
    await goto('#/history'); await goto('#/diag'); await tick(120);
    assert.match($('#dres').textContent, /Modelo de reserva em uso.*gemini-3\.5-flash-lite no lugar de gemini-3\.1-flash-lite/);
  } finally { globalThis.fetch = realFetch; localStorage.removeItem('fr_model_pref'); }
});
