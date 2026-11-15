// Ajustes no app Android: bloco do lembrete diário (liga, permissão, horário, teste) e o que aparece sem o plugin ou no site.
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
put('FileReader', w.FileReader); put('File', w.File);

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const tick = (ms = 25) => new Promise((r) => setTimeout(r, ms));
async function goto(hash) { w.location.hash = hash; await tick(60); }
let S;
before(async () => { await import('../js/app.js'); S = await import('../js/store.js'); await tick(); });
after(() => { mock.timers.reset(); assert.deepEqual(problems, [], 'erros durante a navegação'); assert.equal(localStorage.getItem('fr_errlog'), null, 'o app registrou erros no fr_errlog'); });

const PAGINA = { frases: [
  { fr: 'Ils ont un petit chat.', pt: 'Eles têm um gatinho.', marcada: 'Il<s> on{t} un peti{t} cha{t}.', leitura: 'il-zõ ã pe-ti chá', regras: ['ligação: ils‿ont', 't final mudo'], palavras: [{ fr: 'petit', pt: 'pequeno', uso: 'vem antes do substantivo' }], avancado: false },
  { fr: "Il se leva à l'aube.", pt: 'Ele se levantou ao amanhecer.', marcada: "Il se leva à l'aube.", leitura: 'il sê lê-va a lôb', regras: [], palavras: [], avancado: true },
] };
const resposta = (obj) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: typeof obj === 'string' ? obj : JSON.stringify(obj) }] } }] }), { status: 200 });
const mandarFoto = async () => {
  const entrada = $('#lfile'); const arquivo = new w.File([new Uint8Array(3000)], 'pagina.jpg', { type: 'image/jpeg' });
  Object.defineProperty(entrada, 'files', { configurable: true, value: [arquivo] }); entrada.dispatchEvent(new w.Event('change')); await tick(120);
};

test('sem chave do Gemini a tela avisa e o botão de foto fica desligado', async () => {
  S.resetAll(); await goto('#/'); await goto('#/leitura');
  assert.match($('#app').textContent, /Falta a chave do Gemini/); assert.equal($('#ladd').disabled, true); assert.equal($('[data-go="#/settings/ia"]').tagName, 'BUTTON');
  assert.equal($('.apphead .back').dataset.go, '#/tutor', 'volta para a central da Clara'); assert.equal($$('nav.tabbar .tab.on')[0].dataset.p, 'tutor', 'a aba da Clara fica marcada');
});

test('foto → a IA recebe a imagem e o pedido de JSON → a página abre com marcas de som, tradução e significado ao tocar', async () => {
  S.resetAll(); S.setKey('gemini', 'chave-de-teste'); const pedidos = []; const real = globalThis.fetch;
  globalThis.fetch = async (url, opts) => { pedidos.push({ url: String(url), corpo: JSON.parse(opts.body), cabecalho: opts.headers }); return resposta(PAGINA); };
  try {
    await goto('#/'); await goto('#/leitura'); assert.equal($('#ladd').disabled, false); assert.match($('#app').textContent, /Nenhuma página lida ainda/);
    await mandarFoto();
    assert.equal(pedidos.length, 1); const [{ url, corpo, cabecalho }] = pedidos;
    assert.match(url, /generativelanguage\.googleapis\.com.*:generateContent$/); assert.equal(cabecalho['x-goog-api-key'], 'chave-de-teste'); assert.ok(!/key=/.test(url), 'a chave vai no cabeçalho, não no endereço');
    const partes = corpo.contents[0].parts; assert.match(partes[0].text, /SOMENTE com JSON/); assert.equal(partes[1].inlineData.mimeType, 'image/jpeg'); assert.ok(partes[1].inlineData.data.length > 100, 'a foto foi como base64');
    assert.equal(corpo.generationConfig.responseMimeType, 'application/json');
    assert.match(w.location.hash, /^#\/leitura\/p/, 'abriu a página lida'); assert.equal(S.bookPages().length, 1); assert.equal(S.bookPages()[0].frases.length, 2);
    assert.match($('.hello b').textContent, /Página 1/); assert.equal($$('.cd-frase').length, 2);
    const primeira = $('.cd-frase[data-i="0"]');
    assert.deepEqual([...primeira.querySelectorAll('.pal')].map((b) => b.textContent), ['Ils', 'ont', 'un', 'petit', 'chat.']);
    assert.deepEqual([...primeira.querySelectorAll('.mu')].map((s) => s.textContent), ['t', 't', 't'], 'letras mudas em cinza'); assert.deepEqual([...primeira.querySelectorAll('.lg')].map((s) => s.textContent), ['s'], 'ligação sublinhada');
    assert.match(primeira.querySelector('.como').textContent, /il-zõ ã pe-ti chá/); assert.match(primeira.textContent, /Eles têm um gatinho/); assert.deepEqual([...primeira.querySelectorAll('.rgr')].map((s) => s.textContent), ['ligação: ils‿ont', 't final mudo']);
    assert.ok($('.cd-frase[data-i="1"] .rgr.av'), 'frase avançada ganha a etiqueta'); assert.ok(primeira.querySelector('[data-ouvir]') && primeira.querySelector('[data-devagar]'));
    assert.equal(primeira.querySelector('.pop').hidden, true);
    primeira.querySelectorAll('.pal')[3].click(); assert.equal(primeira.querySelector('.pop').hidden, false); assert.match(primeira.querySelector('.pop').textContent, /petit.*pequeno.*vem antes do substantivo/s);
    primeira.querySelectorAll('.pal')[0].click(); assert.match(primeira.querySelector('.pop').textContent, /Sem detalhes desta palavra/); assert.equal(primeira.querySelectorAll('.pal.on').length, 1, 'só uma palavra marcada por vez');
    primeira.querySelectorAll('.pal')[0].click(); assert.equal(primeira.querySelector('.pop').hidden, true, 'tocar de novo fecha');
    await goto('#/leitura'); assert.match($('.grupo').textContent, /Página 1.*2 frases/s);
    await goto('#/tutor'); assert.match($('[data-go="#/leitura"]').textContent, /1 página lida/);
  } finally { globalThis.fetch = real; }
});

test('resposta quebrada mostra o erro em português e "Tentar de novo" reaproveita a mesma foto', async () => {
  S.resetAll(); S.setKey('gemini', 'chave-de-teste'); let n = 0; const real = globalThis.fetch;
  globalThis.fetch = async () => { n++; return n === 1 ? resposta('{"frases":[{"fr":"Salut') : resposta(PAGINA); };
  try {
    await goto('#/'); await goto('#/leitura'); await mandarFoto();
    assert.match($('#lstatus').textContent, /Não consegui ler a página.*veio incompleta/s); assert.equal(S.bookPages().length, 0); assert.equal($('#ladd').disabled, false);
    $('#ltentar').click(); await tick(120);
    assert.equal(n, 2); assert.equal(S.bookPages().length, 1); assert.match(w.location.hash, /^#\/leitura\/p/);
  } finally { globalThis.fetch = real; }
});

test('foto sem texto em francês, chave recusada e cancelar não guardam nada', async () => {
  S.resetAll(); S.setKey('gemini', 'chave-de-teste'); const real = globalThis.fetch;
  try {
    globalThis.fetch = async () => resposta({ frases: [] });
    await goto('#/'); await goto('#/leitura'); await mandarFoto(); assert.match($('#lstatus').textContent, /não achou frases em francês/);
    globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 400 });
    await goto('#/'); await goto('#/leitura'); await mandarFoto(); assert.match($('#lstatus').textContent, /Chave da API inválida/);
    globalThis.fetch = (_u, opts) => new Promise((_ok, falha) => { opts.signal.addEventListener('abort', () => { const e = new Error('abortado'); e.name = 'AbortError'; falha(e); }); });
    await goto('#/'); await goto('#/leitura'); await mandarFoto(); assert.ok($('#lcancelar'), 'enquanto lê, dá para cancelar'); assert.equal($('#ladd').disabled, true);
    $('#lcancelar').click(); await tick(60); assert.match($('#lstatus').textContent, /Leitura cancelada/); assert.equal($('#ladd').disabled, false);
    assert.equal(S.bookPages().length, 0, 'nada foi guardado');
  } finally { globalThis.fetch = real; }
});

test('sair da tela no meio da leitura cancela o pedido e não guarda a página', async () => {
  S.resetAll(); S.setKey('gemini', 'chave-de-teste'); const real = globalThis.fetch; let abortou = false;
  globalThis.fetch = (_u, opts) => new Promise((_ok, falha) => { opts.signal.addEventListener('abort', () => { abortou = true; const e = new Error('abortado'); e.name = 'AbortError'; falha(e); }); });
  try { await goto('#/'); await goto('#/leitura'); await mandarFoto(); await goto('#/praticar'); await tick(60); assert.equal(abortou, true); assert.equal(S.bookPages().length, 0); } finally { globalThis.fetch = real; }
});

test('resposta que chega depois de você sair da tela não guarda a página nem muda a navegação', async () => {
  S.resetAll(); S.setKey('gemini', 'chave-de-teste'); const real = globalThis.fetch;
  globalThis.fetch = () => new Promise((ok) => setTimeout(() => ok(resposta(PAGINA)), 400)); // ignora o cancelamento e responde tarde
  try { await goto('#/'); await goto('#/leitura'); await mandarFoto(); await goto('#/praticar'); await tick(500); assert.equal(S.bookPages().length, 0); assert.equal(w.location.hash, '#/praticar'); } finally { globalThis.fetch = real; }
});

test('apagar uma página e página que não existe voltam para a lista; o backup leva as páginas', async () => {
  S.resetAll(); const id = S.addBookPage(PAGINA.frases);
  const obj = S.exportData({ includeKeys: false, mark: false }); assert.equal(obj.state.book.pages.length, 1); assert.equal(obj.state.book.pages[0].frases[0].fr, 'Ils ont un petit chat.');
  await goto('#/'); await goto(`#/leitura/${id}`); $('#lapagar').click(); await tick(60);
  assert.equal(S.bookPages().length, 0); assert.equal(w.location.hash, '#/leitura');
  await goto('#/'); await goto('#/leitura/nao-existe'); assert.equal(w.location.hash, '#/leitura');
  S.importData({ ...obj, state: { ...obj.state, book: { pages: [obj.state.book.pages[0], { id: 5 }, null] } } }); assert.equal(S.bookPages().length, 1, 'importar descarta páginas quebradas e mantém as boas');
  S.resetAll();
});
