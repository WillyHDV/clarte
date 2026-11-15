// Sons do francês: linha em Praticar, lista, lição, treino de ouvido, erros que voltam e mistura no Reforço, no jsdom.
import './support/storage.js';
import { test, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { SONS } from '../content/sons.js';

mock.timers.enable({ apis: ['Date'], now: new Date(2026, 10, 15, 10) });

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

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const text = () => $('#app').textContent.replace(/\s+/g, ' ');
const tick = (ms = 25) => new Promise((r) => setTimeout(r, ms));
async function goto(hash) { w.location.hash = hash; await tick(60); }
let S;
before(async () => { await import('../js/app.js'); S = await import('../js/store.js'); await tick(); });
after(() => { mock.timers.reset(); assert.deepEqual(problems, [], 'erros durante a navegação'); assert.equal(localStorage.getItem('fr_errlog'), null, 'o app registrou erros no fr_errlog'); });

const palavras = SONS.flatMap((g) => g.pares.flatMap((p) => p.palavras));
// descobre a resposta certa só pelo que a tela mostra: o áudio do botão grande e o enunciado (nada de olhar dentro do exercício)
function certa() {
  const audio = $('#play').dataset.say; const q = $('.q').textContent;
  if (/iguais ou diferentes/.test(q)) { const [a, b] = audio.split(', '); return a === b ? 'Iguais' : 'Diferentes'; }
  if (/Qual palavra/.test(q)) return audio;
  const opcoes = $$('.opt').map((o) => o.textContent); const candidatas = palavras.filter((x) => x.fr === audio && opcoes.includes(x.pt)); assert.ok(candidatas.length >= 1, `significado de ${audio} entre ${opcoes}`); return candidatas[0].pt;
}
async function responder(acerta) {
  const resp = certa(); const opcoes = $$('.opt'); const alvo = acerta ? opcoes.find((o) => o.textContent === resp) : opcoes.find((o) => o.textContent !== resp);
  assert.ok(alvo, 'opção para clicar'); alvo.click(); $('#ok').click(); await tick(10); return resp;
}
async function treinar(acerta = true) {
  for (let n = 0; n < 14 && !$('.end'); n++) {
    await responder(acerta); assert.ok($(acerta ? '.fb.good' : '.fb.bad'), acerta ? 'resposta certa aceita' : 'resposta errada recusada');
    assert.ok($$('.fb .somfb [data-say]').length >= 2, 'o painel traz um botão para cada palavra do par'); assert.ok($$('.fb [data-say]').every((b) => b.dataset.rapido === '1'));
    $('#ok').click(); await tick(10);
  }
}

test('Praticar tem a linha dos sons; a lista traz os 8 sons com exemplos e o botão de treinar tudo', async () => {
  S.resetAll(); await goto('#/'); await goto('#/praticar');
  const linha = $('[data-go="#/sons"]'); assert.ok(linha); assert.match(linha.textContent, /Sons do francês.*Treino de ouvido: palavras que se confundem/s);
  linha.click(); await tick(60); assert.match(w.location.hash, /#\/sons$/); assert.deepEqual($$('nav.tabbar .tab.on').map((a) => a.dataset.p), ['praticar'], 'a aba Praticar fica marcada'); assert.equal($('.apphead .back').dataset.go, '#/praticar');
  assert.equal($$('.grupo .linha').length, SONS.length); assert.match($('.grupo').textContent, /u × ou.*rue \/ roue · tu \/ tout · vu \/ vous.*Novo/s);
  assert.match($('.som-prog').textContent, /46 pares para treinar em 8 sons/); assert.equal($('#streinar').dataset.go, '#/practice/sons');
});

test('lição de um som: dica, ouvir e comparar cada palavra, Devagar, treinar este som', async () => {
  S.resetAll(); await goto('#/'); await goto('#/sons'); $$('.grupo .linha')[0].click(); await tick(60);
  const g = SONS[0]; assert.match(w.location.hash, /#\/sons\/u-ou/); assert.match($('.hello b').textContent, /u × ou/); assert.match($('.hello small').textContent, /\/y\/ × \/u\/ · Novo/); assert.equal($('.apphead .back').dataset.go, '#/sons');
  assert.match($('.som-dica').textContent, /não existe em português.*assobiar/s); assert.equal($('#streinar').dataset.go, '#/practice/sons/u-ou');
  assert.equal($$('.sompal').length, g.pares.reduce((n, p) => n + p.palavras.length, 0)); assert.equal($$('.sompar').length, g.pares.length);
  assert.match($('.sompar').textContent, /rue.*\/ʁy\/ · rua.*roue.*\/ʁu\/ · roda/s);
  const dev = $('#sdevagar'); assert.equal(dev.getAttribute('aria-pressed'), 'false'); dev.click(); assert.equal(dev.getAttribute('aria-pressed'), 'true'); dev.click(); assert.equal(dev.getAttribute('aria-pressed'), 'false');
  $('.sompal').click(); assert.ok($('.sompal').classList.contains('playing'), 'o botão marca que está tocando'); await tick(20);
  await goto('#/sons/nao-existe'); assert.match(w.location.hash, /#\/sons$/, 'som desconhecido volta para a lista');
});

test('treinar um som: 10 perguntas de ouvido respondidas pelo que a tela mostra, painel com as palavras do par, progresso e volta para a lição', async () => {
  S.resetAll(); await goto('#/'); await goto('#/practice/sons/u-ou');
  assert.ok($('#play') && $('#play').dataset.rapido === '1', 'o botão de ouvir usa a voz do aparelho'); assert.match($('.q').textContent, /Qual palavra|O que a palavra|iguais ou diferentes/); assert.match($('.sub').textContent, /u × ou/);
  assert.equal($$('.opt').length, 2, 'dois sons, duas opções');
  await treinar(true); assert.ok($('.end'), 'a sessão termina'); assert.match($('.end h2').textContent, /10 de 10 corretas/); assert.match($('.end').textContent, /Sons firmes: 0% → [1-9]\d*%/);
  const itens = SONS[0].pares.map((p) => `som:u-ou:${p.id}`); assert.ok(itens.filter((it) => S.strength(it) !== null).length >= 5, 'pelo menos cinco dos seis pares foram treinados (10 perguntas, no máximo 2 por par)'); assert.ok(itens.every((it) => S.strength(it) === null || S.strength(it) > 0), 'acertar deixa o par com força maior que zero');
  assert.match($('#voltar').textContent, /Voltar aos sons/); assert.equal($('#again').dataset.go, '#/practice/sons/u-ou'); $('#voltar').click(); await tick(60); assert.match(w.location.hash, /#\/sons\/u-ou/); assert.match($('.hello small').textContent, /% firme/);
  await goto('#/praticar'); assert.match($('[data-go="#/sons"]').textContent, /% firme · \d+ para rever/);
});

test('três opções nos nasais; treinar todos os sons mistura grupos e volta para a lista', async () => {
  S.resetAll(); await goto('#/'); await goto('#/practice/sons/nasais'); let tres = 0;
  for (let n = 0; n < 14 && !$('.end'); n++) { if (!/iguais ou diferentes/.test($('.q').textContent)) { assert.equal($$('.opt').length, 3); tres++; } await responder(true); $('#ok').click(); await tick(10); }
  assert.ok(tres >= 5, 'identificar e significado têm três opções nos trios'); assert.ok($('.end'));
  S.resetAll(); await goto('#/practice/sons'); const grupos = new Set(); for (let n = 0; n < 14 && !$('.end'); n++) { grupos.add($('.sub').textContent); await responder(true); $('#ok').click(); await tick(10); }
  assert.ok(grupos.size >= 3, `vários sons na mesma sessão: ${[...grupos]}`); assert.match($('#again').dataset.go, /#\/practice\/sons$/); assert.match($('#voltar').textContent, /Voltar aos sons/); $('#voltar').click(); await tick(60); assert.match(w.location.hash, /#\/sons$/);
  await goto('#/practice/sons/nao-existe'); assert.ok($('#ok'), 'som desconhecido treina todos'); await goto('#/praticar');
});

test('errar um par: o erro entra na revisão, o exercício volta no fim, e Rever erros traz o par de novo', async () => {
  S.resetAll(); await goto('#/'); await goto('#/practice/sons/r-l');
  await responder(false); assert.ok($('.fb.bad')); assert.ok($('.fb .ans').textContent, 'mostra a resposta certa'); assert.equal(S.get().mistakes.length, 1); assert.equal(S.get().mistakes[0].ex.unit, 'sons');
  const par = S.get().mistakes[0].ex.items[0]; assert.match(par, /^som:r-l:/); assert.ok(S.strength(par) < 0.3, 'errar derruba a força do par'); $('#ok').click(); await tick(10);
  let total = 1; for (let n = 0; n < 14 && !$('.end'); n++) { await responder(true); $('#ok').click(); await tick(10); total++; } assert.equal(total, 11, 'a pergunta errada volta no fim');
  assert.match($('.end h2').textContent, /9 de 10 corretas/, 'a repetição não conta como tentativa nova');
  S.resetAll(); const g = SONS[7]; S.noteResult({ key: 'k-som', kind: 'listen-choice', unit: 'sons', items: [`som:${g.id}:${g.pares[0].id}`], q: 'Qual palavra você ouviu?', audio: g.pares[0].palavras[0].fr, options: g.pares[0].palavras.map((x) => x.fr), answer: g.pares[0].palavras[0].fr, rapido: true, explain: '', sub: g.titulo, _v: 'ident', _p: 'x' }, false);
  await goto('#/practice/review'); assert.match($('.q').textContent, /Qual palavra você ouviu/); assert.ok($('#play'), 'o erro de som volta com o botão de ouvir'); await goto('#/praticar');
});

test('Reforço mistura até 2 pares de sons já treinados e enfraquecendo, e nenhum quando nada foi treinado', async () => {
  S.resetAll(); await goto('#/'); await goto('#/practice/review'); assert.match(text(), /Nada fraco agora/, 'sem nada treinado, o Reforço não inventa sons');
  const g = SONS[1]; for (const p of g.pares) { S.recordItems([itemDoPar(g, p)], true, 'listen-choice'); } // pares vistos, ainda fracos
  await goto('#/praticar'); await goto('#/practice/review'); assert.ok($('#ok'), 'o Reforço agora tem exercícios'); let n = 0; const sub = new Set();
  while (!$('.end') && n++ < 20) { assert.match($('.q').textContent, /Qual palavra|O que a palavra|iguais ou diferentes/); sub.add($('.sub').textContent); await responder(true); $('#ok').click(); await tick(10); }
  assert.ok(n <= 3 && n >= 1, `no máximo 2 exercícios de som (passos: ${n})`); assert.deepEqual([...sub], ['u × i']);
  S.resetAll(); for (const p of g.pares) S.recordItems([itemDoPar(g, p)], true, 'listen-choice'); for (const p of g.pares) for (let k = 0; k < 80 && S.strength(itemDoPar(g, p)) < 0.9; k++) S.recordItems([itemDoPar(g, p)], true, 'listen-choice');
  assert.ok(g.pares.every((p) => S.strength(itemDoPar(g, p)) >= 0.9));
  await goto('#/praticar'); await goto('#/practice/review'); assert.match(text(), /Nada fraco agora/, 'pares firmes não entram no Reforço');
});

test('os sons sempre usam a voz do aparelho, mesmo com a voz natural (limitada e demorada) escolhida', async () => {
  const { fakeCapacitor } = await import('./support/capacitor.js'); const V = await import('../js/speech.js');
  const cap = fakeCapacitor({ plugins: ['TextToSpeech'] }); await V.recheckNativeVoice(); const realFetch = globalThis.fetch; let rede = 0; globalThis.fetch = async () => { rede++; return new Response('{}', { status: 500 }); };
  try {
    S.resetAll(); S.setKey('gemini', 'k'); S.setSetting('voiceEngine', 'gemini'); assert.equal(V.engineInfo().engine, 'gemini', 'ponto de partida: a voz natural está escolhida');
    await goto('#/'); await goto('#/sons/u-ou'); const antes = cap.falas.length; $$('.sompal')[1].click(); await tick(30);
    assert.equal(cap.falas.length, antes + 1, 'ouvir uma palavra na lição fala pelo aparelho'); assert.equal(cap.falas.at(-1).text, 'roue'); assert.equal(cap.falas.at(-1).rate, 0.9);
    $('#sdevagar').click(); $$('.sompal')[0].click(); await tick(30); assert.equal(cap.falas.at(-1).text, 'rue'); assert.equal(cap.falas.at(-1).rate, 0.45, 'Devagar de verdade');
    await goto('#/practice/sons/u-ou'); await tick(300); const audio = $('#play').dataset.say; assert.equal(cap.falas.at(-1).text, audio, 'o áudio da pergunta toca sozinho ao abrir'); assert.equal(cap.falas.at(-1).rate, 0.9);
    const n0 = cap.falas.length; $('#play').click(); await tick(30); assert.equal(cap.falas.length, n0 + 1); assert.equal(cap.falas.at(-1).text, audio, 'o botão grande repete');
    $('[data-slow]').click(); await tick(30); assert.equal(cap.falas.at(-1).rate, 0.45); assert.equal(cap.falas.at(-1).text, audio);
    await responder(true); await tick(30); const n1 = cap.falas.length; $('.fb .somfb [data-say]').click(); await tick(30); assert.equal(cap.falas.length, n1 + 1, 'os botões do painel de resposta também'); assert.equal(rede, 0, 'nenhuma ida à rede (voz natural) durante os sons');
    await goto('#/praticar');
  } finally { globalThis.fetch = realFetch; Reflect.deleteProperty(globalThis, 'Capacitor'); await V.recheckNativeVoice(); S.setSetting('voiceEngine', 'auto'); }
});

function itemDoPar(g, p) { return `som:${g.id}:${p.id}`; }
