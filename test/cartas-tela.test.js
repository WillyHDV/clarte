// Minhas cartas: guardar pelo dicionário da Leitura, lista com edição, treino, linha em Praticar e mistura no Reforço, no jsdom.
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

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const text = () => $('#app').textContent.replace(/\s+/g, ' ');
const tick = (ms = 25) => new Promise((r) => setTimeout(r, ms));
async function goto(hash) { w.location.hash = hash; await tick(60); }
let S;
before(async () => { await import('../js/app.js'); S = await import('../js/store.js'); await tick(); });
after(() => { mock.timers.reset(); assert.deepEqual(problems, [], 'erros durante a navegação'); assert.equal(localStorage.getItem('fr_errlog'), null, 'o app registrou erros no fr_errlog'); });

const PAGINA = [{ fr: 'Ils ont un petit chat.', pt: 'Eles têm um gatinho.', marcada: 'Il<s> on{t} un peti{t} cha{t}.', leitura: 'il-zõ ã pe-ti chá', regras: [], palavras: [], avancado: false }];
const VERBETE = { palavra: 'petit', lema: 'petit', classe: 'adjetivo', nivel: 'A1', leitura: 'pe-ti', significados: [{ pt: 'pequeno', nota: '' }], neste_contexto: 'pequeno', forma: '', exemplos: [{ fr: 'Elle est petite.', pt: 'Ela é baixa.' }], expressoes: [], notas: '' };
const resposta = (obj) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }), { status: 200 });
const ehDicionario = (corpo) => /dicionário francês–português/.test(corpo.contents[0].parts[0].text);
const comFetch = async (fn, impl) => { const real = globalThis.fetch; globalThis.fetch = impl; try { await fn(); } finally { globalThis.fetch = real; } };
const CARTAS = [{ fr: 'petit', pt: 'pequeno', frase: 'Ils ont un petit chat.' }, { fr: 'maison', pt: 'casa', frase: 'Ma maison est grande.' }];

// responde a sessão de cartas certo, achando a carta pelo significado que aparece no enunciado
async function treinarCertas() {
  for (let n = 0; n < 12 && !$('.end'); n++) {
    const q = $('.q').textContent; const c = S.cartas().find((x) => q.includes(x.pt)); assert.ok(c, `enunciado sem significado de carta: ${q}`);
    const inp = $('#inp'); assert.ok(inp, 'exercício de escrever'); inp.value = c.fr; inp.dispatchEvent(new w.Event('input')); $('#ok').click(); await tick(10);
    assert.ok($('.fb.good'), `a resposta certa da carta ${c.fr} foi aceita`); $('#ok').click(); await tick(10);
  }
}

test('dicionário da Leitura: guardar a palavra usa a frase do livro, ou a sua; palavra já guardada avisa', async () => {
  S.resetAll(); S.setKey('gemini', 'chave-de-teste'); localStorage.removeItem('fr_dict_v1');
  const livro = S.addLivro('Livro'); const id = S.addBookPage(PAGINA, { livro, numero: 1 });
  await comFetch(async () => {
    await goto('#/'); await goto(`#/leitura/${id}`); const palavra = (i) => $$('.cd-frase[data-i="0"] .pal')[i];
    palavra(3).click(); await tick(60);
    assert.ok($('#dic-guardar'), 'o verbete tem o botão de guardar'); assert.match($('#dic').textContent, /Minhas cartas.*Uma frase sua com «petit»/s);
    $('#dic-guardar').click();
    assert.deepEqual(S.cartas().map((c) => [c.fr, c.pt, c.frase, c.origem]), [['petit', 'pequeno', 'Ils ont un petit chat.', 'leitura']], 'sem frase sua, usa a frase do livro');
    assert.equal($('#dic-guardar').disabled, true); assert.match($('#dic-guardar').textContent, /Guardada/);
    $('#dic-fechar').click(); palavra(3).click(); await tick(20);
    assert.equal($('#dic-guardar'), null, 'palavra já guardada não oferece guardar de novo'); assert.match($('#dic').textContent, /já está nas suas cartas/); $('#dic-fechar').click();
    palavra(4).click(); await tick(60); $('#dic-frase').value = '  Mon   chat dort.  '; $('#dic-guardar').click();
    assert.deepEqual(S.cartas().map((c) => [c.fr, c.frase]), [['petit', 'Ils ont un petit chat.'], ['chat', 'Mon chat dort.']], 'a frase sua tem prioridade e sai sem espaços sobrando');
  }, async (_u, opts) => { const c = JSON.parse(opts.body); return ehDicionario(c) ? resposta(VERBETE) : new Response('{}', { status: 500 }); });
});

test('Minhas cartas vazia: explica como guardar e leva à Leitura; Praticar mostra a linha sem número', async () => {
  S.resetAll(); await goto('#/'); await goto('#/praticar');
  const linha = $('[data-go="#/cartas"]'); assert.ok(linha, 'Praticar tem a linha das cartas'); assert.match(linha.textContent, /Minhas cartas.*Guarde palavras que você toca na Leitura/s);
  linha.click(); await tick(60); assert.match(w.location.hash, /#\/cartas/); assert.deepEqual($$('nav.tabbar .tab.on').map((a) => a.dataset.p), ['praticar'], 'a aba Praticar fica marcada');
  assert.match(text(), /Você ainda não guardou nenhuma carta/); assert.equal($('#ctreinar'), null, 'sem cartas não há o que treinar'); assert.equal($('.apphead .back').dataset.go, '#/praticar');
  assert.equal($('#app [data-go="#/leitura"]').tagName, 'BUTTON');
  await goto('#/practice/cartas'); assert.match(text(), /Você ainda não tem cartas/); assert.equal($('#ok'), null); assert.equal($('[data-go="#/cartas"]').tagName, 'BUTTON');
});

test('lista de cartas: contagem, o que falta rever, editar e apagar', async () => {
  S.resetAll(); const ids = CARTAS.map((c) => S.addCarta(c));
  await goto('#/'); await goto('#/praticar'); assert.match($('[data-go="#/cartas"]').textContent, /2 cartas · 2 para rever/);
  S.recordItems([`card:${ids[0]}`], true, 'type'); S.recordItems([`card:${ids[0]}`], true, 'type'); S.recordItems([`card:${ids[0]}`], true, 'type'); assert.ok(S.strength(`card:${ids[0]}`) >= 0.85, 'carta bem firme não conta para rever');
  await goto('#/cartas'); assert.match($('.hello small').textContent, /2 cartas · 1 para rever/); assert.equal($$('.grupo .linha').length, 2);
  assert.match($('.grupo').textContent, /maison.*casa · Ma maison est grande\..*petit.*pequeno · Ils ont un petit chat\./s, 'a mais recente vem primeiro');
  $(`#carta-${ids[0]}`).click(); assert.ok($('#folha .scsheet')); assert.equal($('#cpt').value, 'pequeno'); assert.equal($('#cfrase').value, 'Ils ont un petit chat.');
  $('#cpt').value = ' pequeno, baixo '; $('#cfrase').value = 'Elle est petite.'; $('#csalvar').click(); await tick(20);
  assert.deepEqual([S.cartas()[0].pt, S.cartas()[0].frase], ['pequeno, baixo', 'Elle est petite.']); assert.equal($('#folha .scsheet'), null, 'a folha fecha ao salvar'); assert.match(text(), /pequeno, baixo · Elle est petite\./);
  confirmou = false; $(`#carta-${ids[1]}`).click(); $('#capagar').click(); assert.equal(S.cartas().length, 2, 'cancelar a confirmação mantém a carta'); $('#cfechar').click(); assert.equal($('#folha .scsheet'), null);
  confirmou = true; $(`#carta-${ids[1]}`).click(); $('#capagar').click(); await tick(20);
  assert.deepEqual(S.cartas().map((c) => c.fr), ['petit']); assert.match($('.hello small').textContent, /1 carta · /); assert.equal($$('.grupo .linha').length, 1);
  $(`#carta-${ids[0]}`).click(); $('#capagar').click(); await tick(20); assert.match(text(), /Você ainda não guardou nenhuma carta/);
});

test('treinar cartas: escreve a palavra que falta, a força da carta sobe e o fim volta para a lista', async () => {
  S.resetAll(); const ids = CARTAS.map((c) => S.addCarta(c));
  await goto('#/'); await goto('#/cartas'); assert.match($('#ctreinar').textContent, /Treinar agora/); $('#ctreinar').click(); await tick(60);
  assert.match(w.location.hash, /#\/practice\/cartas/); const q0 = $('.q').textContent; assert.ok(/____/.test(q0) || /Como se diz em francês/.test(q0), `enunciado de carta: ${q0}`);
  assert.doesNotMatch($('.q').innerHTML, /petit|maison/, 'a palavra não aparece no enunciado'); // a lacuna esconde a palavra e o "como se diz" mostra só o significado
  await treinarCertas(); assert.ok($('.end'), 'duas cartas = duas perguntas'); assert.match($('.end').textContent, /2.*corretas|corretas/);
  for (const id of ids) assert.ok(S.strength(`card:${id}`) > 0.3, 'acertar escrevendo fortalece a carta');
  assert.match($('#voltar').textContent, /Voltar às cartas/); $('#voltar').click(); await tick(60); assert.match(w.location.hash, /#\/cartas/);
});

test('errar uma carta deixa a força baixa; sem a palavra na frase só pergunta "como se diz"', async () => {
  S.resetAll(); const id = S.addCarta({ fr: 'chat', pt: 'gato', frase: 'Le chien dort.' });
  await goto('#/'); await goto('#/practice/cartas'); assert.match($('.q').textContent, /Como se diz em francês: gato/);
  $('#inp').value = 'chien'; $('#inp').dispatchEvent(new w.Event('input')); $('#ok').click(); await tick(10);
  assert.ok($('.fb.bad'), 'resposta errada'); assert.match($('.fb .ans').textContent, /chat/); assert.ok(S.strength(`card:${id}`) < 0.3);
  assert.ok(S.get().mistakes.length >= 1, 'o erro também entra na revisão espaçada');
});

test('Reforço mistura até 3 cartas com o resto, mesmo quando só há cartas', async () => {
  S.resetAll(); for (const c of [...CARTAS, { fr: 'chat', pt: 'gato', frase: '' }, { fr: 'chien', pt: 'cachorro', frase: '' }]) S.addCarta(c);
  await goto('#/'); await goto('#/practice/review'); const vistas = new Set(); let passos = 0;
  while (!$('.end') && passos++ < 20) { const q = $('.q').textContent; for (const c of S.cartas()) if (q.includes(c.pt)) vistas.add(c.id); $('#inp') ? ($('#inp').value = 'x', $('#inp').dispatchEvent(new w.Event('input'))) : $('.opt') && $('.opt').click(); $('#ok').click(); await tick(5); if ($('#ok') && $('#ok').textContent.trim() === 'Continuar') $('#ok').click(); }
  assert.ok($('.end'), 'a sessão termina'); assert.equal(vistas.size, 3, 'só 3 das 4 cartas entram de uma vez');
});

test('a linha das cartas e a barra continuam certas com muitas cartas e sem Reforço pendente', async () => {
  S.resetAll(); for (let i = 0; i < 30; i++) S.addCarta({ fr: `mot${i}`, pt: `palavra ${i}`, frase: `Voici mot${i}.` });
  await goto('#/'); await goto('#/praticar'); assert.match($('[data-go="#/cartas"]').textContent, /30 cartas · 30 para rever/); assert.equal($('nav.tabbar [data-p="praticar"] .badge'), null, 'cartas novas não acendem a bolinha de reforço');
  await goto('#/cartas'); assert.equal($$('.grupo .linha').length, 30);
});

test('Reforço traz o que já foi visto e está entre 0,7 e 0,85 (perto de esquecer), não só o muito fraco', async () => {
  const { UNITS } = await import('../js/data.js'); const { unitItems } = await import('../js/exercises.js');
  S.resetAll(); const ids = [...new Set(UNITS.flatMap((u) => unitItems(u.id)))];
  for (let n = 0; n < 12 && !(S.strength(ids[0]) >= 0.72); n++) S.recordItems(ids, true, 'type');
  const s = S.strength(ids[0]); assert.ok(s >= 0.72 && s < 0.85, `ponto de partida entre 0,7 e 0,85: ${s}`); assert.equal(S.dueMistakes().length, 0); assert.equal(S.cartas().length, 0);
  await goto('#/'); await goto('#/practice/review'); assert.ok($('#ok'), 'há exercícios no Reforço'); assert.doesNotMatch(text(), /Nada fraco agora/);
  S.resetAll(); for (let n = 0; n < 40 && !(S.strength(ids[0]) >= 0.9); n++) S.recordItems(ids, true, 'type'); assert.ok(S.strength(ids[0]) >= 0.9);
  await goto('#/praticar'); await goto('#/practice/review'); assert.equal($('#ok'), null, 'itens firmes (acima de 0,85) não entram no Reforço'); assert.match(text(), /Nada fraco agora/);
});

const toasts = () => $$('.toast').map((t) => t.textContent).join(' | ');

test('Nova carta: confere o que falta, aceita palavra com significado e frase e entra na lista', async () => {
  S.resetAll(); await goto('#/'); await goto('#/cartas'); assert.ok($('#cnova'), 'o botão existe mesmo sem cartas'); assert.equal($('#ctreinar'), null);
  $('#cnova').click(); assert.ok($('#folha .scsheet')); $('#nsalvar').click(); assert.equal(S.cartas().length, 0); assert.match(toasts(), /Escreva a palavra ou expressão em francês/);
  $('#nfr').value = 'pomme'; $('#nsalvar').click(); assert.equal(S.cartas().length, 0, 'sem significado e sem frase não há o que treinar'); assert.match(toasts(), /Escreva o significado ou uma frase com a palavra/);
  $('#nfrase').value = 'Je mange une poire.'; $('#nsalvar').click(); assert.equal(S.cartas().length, 0, 'frase sem a palavra e sem significado'); assert.match(toasts(), /A palavra não aparece na frase/);
  $('#npt').value = 'maçã'; $('#nsalvar').click(); await tick(20);
  assert.deepEqual(S.cartas().map((c) => [c.fr, c.pt, c.frase, c.origem]), [['pomme', 'maçã', 'Je mange une poire.', 'minha']]); assert.equal($('#folha .scsheet'), null, 'a folha fecha'); assert.match(toasts(), /A palavra não está na frase: o treino só pergunta o significado/);
  assert.match($('.grupo').textContent, /pomme.*maçã · Je mange une poire\./s); assert.ok($('#ctreinar'));
  $('#cnova').click(); $('#nfr').value = 'poire'; $('#nfrase').value = 'Je mange une poire.'; $('#nsalvar').click(); await tick(20);
  assert.equal(S.cartas().length, 2, 'com a palavra na frase basta a frase'); assert.equal(S.cartas()[1].pt, ''); assert.match(toasts(), /Carta guardada\. Ela entra no Reforço/);
  $('#cnova').click(); $('#ncancelar').click(); assert.equal($('#folha .scsheet'), null, 'cancelar fecha sem guardar'); assert.equal(S.cartas().length, 2);
});

const CORRECAO = "Très bien ! Où habites-tu ?\n---\nVocê escreveu: Je suis 20 ans → Melhor: J'ai 20 ans. Em francês, a idade usa avoir.";
test('conversa com a Clara: cada correção ganha um botão; guardar cria a carta de correção e o treino pede a frase certa', async () => {
  S.resetAll(); S.setKey('gemini', 'chave-de-teste');
  localStorage.setItem('fr_chat_v2', JSON.stringify({ free: [{ role: 'assistant', content: 'Bonjour ! Comment tu t’appelles ?' }, { role: 'user', content: 'Je suis 20 ans' }, { role: 'assistant', content: CORRECAO }, { role: 'user', content: 'À Maceió' }, { role: 'assistant', content: 'Très bien. Tu aimes la plage ?' }] }));
  await goto('#/'); await goto('#/tutor/free');
  assert.match($('.corr').textContent, /Você escreveu: Je suis 20 ans/); const botoes = $$('.corr-guardar'); assert.equal(botoes.length, 1, 'só a mensagem com correção tem botão');
  assert.match(botoes[0].textContent, /Guardar nas cartas: J'ai 20 ans\./); assert.equal(botoes[0].disabled, false);
  botoes[0].click(); assert.deepEqual(S.cartas().map((c) => [c.fr, c.erro, c.pt, c.frase, c.origem]), [["J'ai 20 ans.", 'Je suis 20 ans', 'Em francês, a idade usa avoir.', "J'ai 20 ans.", 'clara']]);
  assert.equal($('.corr-guardar').disabled, true); assert.match($('.corr-guardar').textContent, /Guardada: J'ai 20 ans\./); assert.match(toasts(), /Correção guardada nas suas cartas/);
  $('.corr-guardar').click(); assert.equal(S.cartas().length, 1, 'clicar de novo não duplica');
  await goto('#/praticar'); await goto('#/tutor/free'); assert.equal($('.corr-guardar').disabled, true, 'ao voltar, já aparece como guardada'); assert.match($('.corr-guardar').textContent, /Guardada/);
  await goto('#/cartas'); assert.match($('.grupo').textContent, /J'ai 20 ans\..*errado: Je suis 20 ans · Em francês, a idade usa avoir\./s); assert.ok($('#carta-' + S.cartas()[0].id + ' svg'), 'ícone de lápis');
  await goto('#/practice/cartas'); assert.match($('.q').textContent, /Corrija a frase:\s*Je suis 20 ans/); assert.doesNotMatch($('.q').textContent, /J'ai/);
  $('#inp').value = "j'ai 20 ans"; $('#inp').dispatchEvent(new w.Event('input')); $('#ok').click(); await tick(10); assert.ok($('.fb.good'), 'a frase certa é aceita'); assert.match($('.fb .ex').textContent, /Em francês, a idade usa avoir\./);
  $('#ok').click(); await tick(10); assert.ok($('.end')); assert.ok(S.strength(`card:${S.cartas()[0].id}`) > 0);
});

test('a ligação com a Clara: o resumo também oferece guardar cada correção', async () => {
  S.resetAll(); S.setKey('gemini', 'chave-de-teste');
  localStorage.setItem('fr_chat_v2', JSON.stringify({ free: [{ role: 'assistant', content: 'Bonjour !' }], sum: { mode: 'free', n: 1, turns: 2, repeats: [], notes: ["Você disse: Je habite à Maceió → Melhor: J'habite à Maceió. Je vira j' antes de vogal.", 'Pronúncia melhor no fim.'] } }));
  await goto('#/'); await goto('#/tutor/free'); assert.match($('.sumcard').textContent, /Resumo da ligação/); const b = $$('.sumcard .corr-guardar'); assert.equal(b.length, 1, 'só a nota que é uma correção ganha botão');
  b[0].click(); assert.deepEqual(S.cartas().map((c) => [c.fr, c.erro]), [["J'habite à Maceió.", 'Je habite à Maceió']]);
});

test('editar uma carta de correção: frase certa e explicação; a frase errada fica só como lembrete; apagar', async () => {
  S.resetAll(); const id = S.addCarta({ fr: "J'ai 20 ans.", erro: 'Je suis 20 ans', pt: 'avoir', frase: "J'ai 20 ans.", origem: 'clara' });
  await goto('#/'); await goto('#/cartas'); $(`#carta-${id}`).click(); assert.match($('.carta-t').textContent, /Correção/); assert.equal($('#cfr').value, "J'ai 20 ans."); assert.equal($('#cpt').value, 'avoir'); assert.match($('.scsheet small').textContent, /Frase errada que você escreveu: Je suis 20 ans/);
  assert.equal($('#cfrase'), null, 'correção não tem campo de frase separado');
  $('#cfr').value = '   '; $('#csalvar').click(); assert.equal(S.cartas()[0].fr, "J'ai 20 ans.", 'frase vazia não salva'); assert.ok($('#folha .scsheet'), 'a folha continua aberta');
  $('#cfr').value = "J'ai vingt ans."; $('#cpt').value = 'Idade: avoir.'; $('#csalvar').click(); await tick(20);
  assert.deepEqual([S.cartas()[0].fr, S.cartas()[0].frase, S.cartas()[0].pt, S.cartas()[0].erro], ["J'ai vingt ans.", "J'ai vingt ans.", 'Idade: avoir.', 'Je suis 20 ans']);
  $(`#carta-${id}`).click(); $('#capagar').click(); await tick(20); assert.equal(S.cartas().length, 0); assert.match(text(), /Você ainda não guardou nenhuma carta/);
});

test('avaliação da prova oral: a lista "Erros para corrigir" também ganha um botão para cada erro', async () => {
  S.resetAll(); S.setKey('gemini', 'chave-de-teste');
  const avaliacao = ['**Nota geral:** 7/10', 'Compréhension des questions: 4/5', '**Erros para corrigir:**', '- você disse "Je suis 20 ans" → correto: "J\'ai 20 ans" (avoir para idade)', '- você disse "Tu es brésilienne" → "Tu es brésilien" — masculino', '**O que treinar antes da prova:** 3 itens'].join('\n');
  localStorage.setItem('fr_chat_v2', JSON.stringify({ exam: [{ role: 'assistant', content: 'Bonjour.' }, { role: 'user', content: '[FIN]' }, { role: 'assistant', content: avaliacao }] }));
  await goto('#/'); await goto('#/tutor/exam'); const b = $$('.corr-guardar'); assert.equal(b.length, 2, 'um botão por erro, e nenhum para as notas');
  assert.match(b[0].textContent, /J'ai 20 ans/); assert.match(b[1].textContent, /Tu es brésilien/); b[1].click();
  assert.deepEqual(S.cartas().map((c) => [c.fr, c.erro, c.pt]), [['Tu es brésilien', 'Tu es brésilienne', 'masculino']]);
});
