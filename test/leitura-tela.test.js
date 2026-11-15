// Leitura: biblioteca, livro, página com deslize, dicionário ao tocar numa palavra, foto pela câmera e erros, no jsdom.
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
const VERBETE = { palavra: 'petit', lema: 'petit', classe: 'adjetivo', nivel: 'A1', leitura: 'pe-ti', significados: [{ pt: 'pequeno', nota: 'vem antes do substantivo' }, { pt: 'baixo', nota: 'falando de altura' }], neste_contexto: 'pequeno: o gato é de pouco tamanho', forma: '', exemplos: [{ fr: 'Un petit café, s’il vous plaît.', pt: 'Um cafezinho, por favor.' }, { fr: 'Elle est petite.', pt: 'Ela é baixa.' }], expressoes: [{ fr: 'petit à petit', pt: 'pouco a pouco' }], notas: 'O t final não soa; no feminino, petite, ele soa.' };
const resposta = (obj) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: typeof obj === 'string' ? obj : JSON.stringify(obj) }] } }] }), { status: 200 });
const ehDicionario = (corpo) => /dicionário francês–português/.test(corpo.contents[0].parts[0].text);
const mandarFoto = async (id = 'lfile') => {
  const entrada = $(`#${id}`); const arquivo = new w.File([new Uint8Array(3000)], 'pagina.jpg', { type: 'image/jpeg' });
  Object.defineProperty(entrada, 'files', { configurable: true, value: [arquivo] }); entrada.dispatchEvent(new w.Event('change')); await tick(120);
};
// biblioteca com um livro e a chave do Gemini; devolve o id do livro
const livroPronto = (titulo = 'O Pequeno Príncipe') => { S.resetAll(); S.setKey('gemini', 'chave-de-teste'); localStorage.removeItem('fr_dict_v1'); return S.addLivro(titulo); };
const comFetch = async (fn, impl) => { const real = globalThis.fetch; globalThis.fetch = impl; try { await fn(); } finally { globalThis.fetch = real; } };

test('biblioteca vazia: criar um livro pede o nome e abre a tela do livro', async () => {
  S.resetAll(); await goto('#/'); await goto('#/leitura');
  assert.match($('#app').textContent, /Sua biblioteca está vazia/); assert.equal($('.apphead .back').dataset.go, '#/tutor', 'volta para a central da Clara'); assert.equal($$('nav.tabbar .tab.on')[0].dataset.p, 'tutor', 'a aba da Clara fica marcada');
  $('#lcriarprimeiro').click(); assert.ok($('.scsheet'), 'a folha de novo livro abre');
  $('#lcriar').click(); assert.match($('#lerro').textContent, /Dê um nome ao livro/); assert.equal(S.bookLivros().length, 0);
  $('#ltitulo').value = '  O Pequeno   Príncipe '; $('#lcriar').click(); await tick(60);
  assert.equal(S.bookLivros().length, 1); assert.equal(S.bookLivros()[0].titulo, 'O Pequeno Príncipe', 'espaços sobrando saem');
  assert.match(w.location.hash, /^#\/leitura\/livro\/l/); assert.match($('.hello b').textContent, /O Pequeno Príncipe/); assert.equal($('#lnum').value, '1', 'a primeira página é a 1');
  S.setKey('gemini', 'chave-de-teste'); await goto('#/tutor'); assert.match($('[data-go="#/leitura"]').textContent, /1 livro · 0 páginas lidas/);
  await goto('#/leitura'); assert.match($('.grupo').textContent, /O Pequeno Príncipe.*0 páginas/s); $('#lnovolivro').click(); assert.ok($('.scsheet')); $('#lagoranao').click(); assert.equal($('.scsheet'), null);
});

test('sem chave do Gemini a tela do livro avisa e os botões de foto ficam desligados', async () => {
  S.resetAll(); const id = S.addLivro('Livro'); await goto('#/'); await goto(`#/leitura/livro/${id}`);
  assert.match($('#app').textContent, /Falta a chave do Gemini/); assert.equal($('#ladd').disabled, true); assert.equal($('#lcam').disabled, true); assert.equal($('[data-go="#/settings/ia"]').tagName, 'BUTTON');
});

test('foto com número de página → a IA recebe imagem e pedido de JSON → a página abre dentro do livro, no número escolhido', async () => {
  const id = livroPronto(); const pedidos = [];
  await comFetch(async () => {
    await goto('#/'); await goto(`#/leitura/livro/${id}`); assert.match($('#app').textContent, /Nenhuma página lida ainda/);
    $('#lnum').value = '12'; await mandarFoto();
    assert.equal(pedidos.length, 1); const [{ url, corpo, cabecalho }] = pedidos;
    assert.match(url, /generativelanguage\.googleapis\.com.*:generateContent$/); assert.equal(cabecalho['x-goog-api-key'], 'chave-de-teste'); assert.ok(!/key=/.test(url), 'a chave vai no cabeçalho');
    const partes = corpo.contents[0].parts; assert.match(partes[0].text, /SOMENTE com JSON/); assert.equal(partes[1].inlineData.mimeType, 'image/jpeg'); assert.ok(partes[1].inlineData.data.length > 100);
    assert.equal(corpo.generationConfig.responseMimeType, 'application/json');
    assert.match(w.location.hash, /^#\/leitura\/p/); const p = S.bookPages()[0]; assert.deepEqual([p.livro, p.numero, p.frases.length], [id, 12, 2]);
    assert.match($('.hello b').textContent, /Página 12/); assert.match($('.hello small').textContent, /O Pequeno Príncipe · 2 frases/); assert.equal($('.apphead .back').dataset.go, `#/leitura/livro/${id}`);
    await goto(`#/leitura/livro/${id}`); assert.match($('.grupo').textContent, /Página 12.*2 frases/s); assert.equal($('#lnum').value, '13', 'o próximo número sugerido vem depois do maior');
    $('#lnum').value = ''; await mandarFoto(); assert.match($('#lstatus').textContent, /Informe o número da página/); assert.equal(pedidos.length, 1, 'sem número não chama a IA'); assert.equal(S.bookPages().length, 1);
  }, async (url, opts) => { pedidos.push({ url: String(url), corpo: JSON.parse(opts.body), cabecalho: opts.headers }); return resposta(PAGINA); });
});

test('página em tela cheia de frase: marcas de som, tradução e botões; deslizar mostra as outras frases e a posição é lembrada', async () => {
  S.resetAll(); const livro = S.addLivro('Livro'); const id = S.addBookPage(PAGINA.frases, { livro, numero: 3 });
  await goto('#/'); await goto(`#/leitura/${id}`);
  assert.equal($$('.pager > .cd-frase').length, 2); assert.equal($('#ppos').textContent, '1 de 2'); assert.equal($('#pprev').disabled, true); assert.equal($('#pnext').disabled, false);
  const primeira = $('.cd-frase[data-i="0"]');
  assert.deepEqual([...primeira.querySelectorAll('.pal')].map((b) => b.textContent), ['Ils', 'ont', 'un', 'petit', 'chat.']);
  assert.deepEqual([...primeira.querySelectorAll('.mu')].map((s) => s.textContent), ['t', 't', 't'], 'letras mudas em cinza'); assert.deepEqual([...primeira.querySelectorAll('.lg')].map((s) => s.textContent), ['s'], 'ligação sublinhada');
  assert.match(primeira.querySelector('.como').textContent, /il-zõ ã pe-ti chá/); assert.match(primeira.textContent, /Eles têm um gatinho/); assert.deepEqual([...primeira.querySelectorAll('.rgr')].map((s) => s.textContent), ['ligação: ils‿ont', 't final mudo']);
  assert.ok($('.cd-frase[data-i="1"] .rgr.av'), 'frase avançada ganha a etiqueta'); assert.ok(primeira.querySelector('[data-ouvir]') && primeira.querySelector('[data-devagar]'));
  assert.equal($('.pop'), null, 'o balão no fim da frase foi trocado pela folha do dicionário');
  $('#pnext').click(); assert.equal($('#ppos').textContent, '2 de 2'); assert.equal($('#pnext').disabled, true); assert.equal($('#pprev').disabled, false);
  $('#pprev').click(); assert.equal($('#ppos').textContent, '1 de 2');
  w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); assert.equal($('#ppos').textContent, '2 de 2', 'a seta do teclado também vira a frase');
  await tick(700); assert.equal(S.bookPages()[0].pos, 1, 'a frase em que você parou fica guardada');
  await goto('#/praticar'); await goto(`#/leitura/${id}`); assert.equal($('#ppos').textContent, '2 de 2', 'ao voltar, abre onde você parou');
  await goto('#/praticar'); w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); await tick(20); // sair limpa as teclas: a seta não mexe mais na tela (se sobrasse, daria erro na tela que sumiu)
});

test('tocar numa palavra abre a folha do dicionário: significados, em outros contextos, expressões e dicas; a consulta fica guardada', async () => {
  const livro = livroPronto(); const id = S.addBookPage(PAGINA.frases, { livro, numero: 1 }); const pedidos = []; let solta;
  await comFetch(async () => {
    await goto('#/'); await goto(`#/leitura/${id}`); const palavra = (i) => $$('.cd-frase[data-i="0"] .pal')[i];
    palavra(3).click(); await tick(10);
    assert.ok($('#folha .scsheet'), 'a folha abre'); assert.match($('#dic').textContent, /petit.*Consultando o dicionário/s, 'mostra que está consultando'); assert.match($('#dic').textContent, /Nesta página.*pequeno.*vem antes do substantivo/s, 'enquanto isso mostra o que a página já trazia');
    assert.ok(palavra(3).classList.contains('on'), 'a palavra tocada fica marcada');
    solta(resposta(VERBETE)); await tick(60);
    const t = $('#dic').textContent; assert.match(t, /adjetivo · A1/); assert.match(t, /pe-ti/); assert.match(t, /Nesta frase.*pequeno: o gato/s); assert.match(t, /Significados.*pequeno.*baixo/s);
    assert.match(t, /Em outros contextos.*Un petit café.*Um cafezinho/s); assert.match(t, /Expressões.*petit à petit.*pouco a pouco/s); assert.match(t, /Dicas de uso.*no feminino/s);
    assert.equal($$('#dic [data-dex]').length, 3, 'cada exemplo e expressão tem botão de ouvir'); assert.ok($('#dic-ouvir'));
    const pedido = pedidos[0]; assert.match(pedido.parts[0].text, /«petit»/); assert.match(pedido.parts[0].text, /Ils ont un petit chat\./); assert.equal(pedido.cfg.responseMimeType, 'application/json');
    $('#dic-fechar').click(); assert.equal($('#folha .scsheet'), null); assert.ok(!palavra(3).classList.contains('on'), 'fechar desmarca a palavra');
    palavra(3).click(); await tick(10); assert.equal(pedidos.length, 1, 'a mesma palavra na mesma frase vem do cache, sem nova consulta'); assert.match($('#dic').textContent, /Significados.*pequeno/s); $('#dic-fechar').click();
    palavra(1).click(); await tick(10); assert.equal(pedidos.length, 2, 'outra palavra consulta de novo'); assert.match($('#dic').textContent, /ont.*Consultando/s); assert.doesNotMatch($('#dic').textContent, /Nesta página/, 'sem detalhe na página, só a consulta'); $('.scsheet').click(); assert.equal($('#folha .scsheet'), null, 'tocar fora fecha');
  }, async (_u, opts) => { const c = JSON.parse(opts.body); assert.ok(ehDicionario(c)); pedidos.push({ parts: c.contents[0].parts, cfg: c.generationConfig }); return pedidos.length === 1 ? new Promise((ok) => { solta = ok; }) : new Promise(() => {}); });
});

test('dicionário: erro mostra o motivo e "Tentar de novo"; resposta vazia é recusada; fechar cancela a consulta; sem chave avisa', async () => {
  const livro = livroPronto(); const id = S.addBookPage(PAGINA.frases, { livro, numero: 1 }); let n = 0; let abortou = false;
  await comFetch(async () => {
    await goto('#/'); await goto(`#/leitura/${id}`); const palavra = $$('.cd-frase[data-i="0"] .pal')[3];
    palavra.click(); await tick(60); assert.match($('#dic').textContent, /Não consegui consultar o dicionário.*Chave da API inválida/s);
    $('#dtentar').click(); await tick(60); assert.match($('#dic').textContent, /Não consegui consultar.*não conseguiu montar o verbete/s, 'verbete sem significado nem contexto é erro');
    $('#dtentar').click(); await tick(60); assert.match($('#dic').textContent, /Significados.*pequeno/s); assert.equal(n, 3); $('#dic-fechar').click();
    S.setKey('gemini', 'chave-de-teste'); localStorage.removeItem('fr_dict_v1'); n = 3; $$('.cd-frase[data-i="1"] .pal')[1].click(); await tick(20); assert.match($('#dic').textContent, /Consultando/);
    $('#dic-fechar').click(); await tick(20); assert.equal(abortou, true, 'fechar a folha cancela o pedido em andamento');
  }, async (_u, opts) => {
    if (!ehDicionario(JSON.parse(opts.body))) return new Response('{}', { status: 500 }); // voz natural da palavra: não interessa aqui
    n++;
    if (n === 1) return new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 400 });
    if (n === 2) return resposta({ significados: [], neste_contexto: '' });
    if (n === 3) return resposta(VERBETE);
    return new Promise((_ok, falha) => { opts.signal.addEventListener('abort', () => { abortou = true; const e = new Error('x'); e.name = 'AbortError'; falha(e); }); });
  });
  S.resetAll(); const livro2 = S.addLivro('Outro'); const id2 = S.addBookPage(PAGINA.frases, { livro: livro2, numero: 1 }); localStorage.removeItem('fr_dict_v1');
  await goto('#/'); await goto(`#/leitura/${id2}`); $$('.cd-frase[data-i="0"] .pal')[3].click(); await tick(20);
  assert.match($('#dic').textContent, /Falta a chave do Gemini/); assert.match($('#dic').textContent, /Nesta página.*pequeno/s, 'sem chave ainda mostra o que a página trazia');
});

test('editar a página (livro e número), apagar a página e renomear ou apagar o livro', async () => {
  S.resetAll(); const a = S.addLivro('Livro A'); const b = S.addLivro('Livro B'); const id = S.addBookPage(PAGINA.frases, { livro: a, numero: 5 });
  await goto('#/'); await goto(`#/leitura/${id}`); $('#leditar').click(); assert.equal($$('#eslivro option').length, 2); assert.equal($('#eslivro').value, a); assert.equal($('#esnum').value, '5');
  $('#esnum').value = '0'; $('#essalvar').click(); assert.equal(S.bookPages()[0].numero, 5, 'número inválido não salva'); assert.ok($('.scsheet'), 'a folha continua aberta');
  $('#eslivro').value = b; $('#esnum').value = '9'; $('#essalvar').click(); await tick(20);
  assert.deepEqual([S.bookPages()[0].livro, S.bookPages()[0].numero], [b, 9]); assert.equal($('.scsheet'), null); assert.match($('.hello b').textContent, /Página 9/); assert.match($('.hello small').textContent, /Livro B/); assert.equal($('.apphead .back').dataset.go, `#/leitura/livro/${b}`);
  await goto(`#/leitura/livro/${a}`); assert.match($('#app').textContent, /Nenhuma página lida ainda/);
  await goto(`#/leitura/livro/${b}`); assert.match($('.grupo').textContent, /Página 9/);
  $('#lrenomear').click(); $('#ltitulo').value = '   '; $('#lsalvar').click(); assert.match($('#lerro').textContent, /Dê um nome/); $('#ltitulo').value = 'Le Petit Prince'; $('#lsalvar').click(); await tick(20); assert.match($('.hello b').textContent, /Le Petit Prince/); assert.equal($('.scsheet'), null);
  await goto(`#/leitura/${id}`); $('#lapagar').click(); await tick(60); assert.equal(S.bookPages().length, 0); assert.equal(w.location.hash, `#/leitura/livro/${b}`, 'apagar a página volta para o livro');
  $('#lapagarlivro').click(); await tick(60); assert.equal(S.bookLivros().length, 1); assert.equal(w.location.hash, '#/leitura');
  await goto('#/'); await goto('#/leitura/nao-existe'); assert.equal(w.location.hash, '#/leitura'); await goto('#/'); await goto('#/leitura/livro/nao-existe'); assert.equal(w.location.hash, '#/leitura');
});

test('resposta quebrada mostra o erro em português e "Tentar de novo" reaproveita a mesma foto e o mesmo número', async () => {
  const id = livroPronto(); let n = 0;
  await comFetch(async () => {
    await goto('#/'); await goto(`#/leitura/livro/${id}`); $('#lnum').value = '4'; await mandarFoto();
    assert.match($('#lstatus').textContent, /Não consegui ler a página.*veio incompleta/s); assert.equal(S.bookPages().length, 0); assert.equal($('#ladd').disabled, false);
    $('#ltentar').click(); await tick(120); assert.equal(n, 2); assert.equal(S.bookPages()[0].numero, 4); assert.match(w.location.hash, /^#\/leitura\/p/);
  }, async () => { n++; return n === 1 ? resposta('{"frases":[{"fr":"Salut') : resposta(PAGINA); });
});

test('foto sem texto em francês, chave recusada e cancelar não guardam nada', async () => {
  const id = livroPronto(); const real = globalThis.fetch;
  try {
    globalThis.fetch = async () => resposta({ frases: [] });
    await goto('#/'); await goto(`#/leitura/livro/${id}`); await mandarFoto(); assert.match($('#lstatus').textContent, /não achou frases em francês/);
    globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 400 });
    await goto('#/'); await goto(`#/leitura/livro/${id}`); await mandarFoto(); assert.match($('#lstatus').textContent, /Chave da API inválida/);
    globalThis.fetch = (_u, opts) => new Promise((_ok, falha) => { opts.signal.addEventListener('abort', () => { const e = new Error('abortado'); e.name = 'AbortError'; falha(e); }); });
    await goto('#/'); await goto(`#/leitura/livro/${id}`); await mandarFoto(); assert.ok($('#lcancelar'), 'enquanto lê, dá para cancelar'); assert.equal($('#ladd').disabled, true); assert.equal($('#lcam').disabled, true);
    $('#lcancelar').click(); await tick(60); assert.match($('#lstatus').textContent, /Leitura cancelada/); assert.equal($('#ladd').disabled, false);
    assert.equal(S.bookPages().length, 0, 'nada foi guardado');
  } finally { globalThis.fetch = real; }
});

test('sair da tela no meio da leitura cancela o pedido; resposta tardia não guarda a página nem muda a navegação', async () => {
  const id = livroPronto(); const real = globalThis.fetch; let abortou = false;
  try {
    globalThis.fetch = (_u, opts) => new Promise((_ok, falha) => { opts.signal.addEventListener('abort', () => { abortou = true; const e = new Error('abortado'); e.name = 'AbortError'; falha(e); }); });
    await goto('#/'); await goto(`#/leitura/livro/${id}`); await mandarFoto(); await goto('#/praticar'); await tick(60); assert.equal(abortou, true); assert.equal(S.bookPages().length, 0);
    globalThis.fetch = () => new Promise((ok) => setTimeout(() => ok(resposta(PAGINA)), 400)); // ignora o cancelamento e responde tarde
    await goto('#/'); await goto(`#/leitura/livro/${id}`); await mandarFoto(); await goto('#/praticar'); await tick(500); assert.equal(S.bookPages().length, 0); assert.equal(w.location.hash, '#/praticar');
  } finally { globalThis.fetch = real; }
});

test('Tirar foto: o botão abre a câmera (campo com capture), a galeria abre o seletor e a foto da câmera segue o mesmo caminho', async () => {
  const id = livroPronto(); let pedidos = 0;
  await comFetch(async () => {
    await goto('#/'); await goto(`#/leitura/livro/${id}`);
    assert.equal($('#lcamera').getAttribute('capture'), 'environment', 'câmera traseira'); assert.equal($('#lcamera').getAttribute('accept'), 'image/*'); assert.equal($('#lfile').hasAttribute('capture'), false, 'a galeria não força a câmera');
    let abriu = ''; $('#lcamera').click = () => { abriu += 'camera '; }; $('#lfile').click = () => { abriu += 'galeria'; };
    $('#lcam').click(); $('#ladd').click(); assert.equal(abriu, 'camera galeria'); assert.match($('#lcam').textContent, /Tirar foto/);
    await mandarFoto('lcamera'); assert.equal(pedidos, 1); assert.match(w.location.hash, /^#\/leitura\/p/); assert.equal(S.bookPages().length, 1);
  }, async () => { pedidos++; return resposta(PAGINA); });
});

test('backup leva livros e páginas; importar descarta o que veio quebrado e mantém o que presta', async () => {
  S.resetAll(); const a = S.addLivro('Livro A'); S.addBookPage(PAGINA.frases, { livro: a, numero: 2 });
  const obj = S.exportData({ includeKeys: false, mark: false }); assert.equal(obj.state.book.livros.length, 1); assert.equal(obj.state.book.pages[0].frases[0].fr, 'Ils ont un petit chat.'); assert.equal(obj.state.book.pages[0].numero, 2);
  S.importData({ ...obj, state: { ...obj.state, book: { livros: [...obj.state.book.livros, { id: 3 }, null], pages: [obj.state.book.pages[0], { id: 5 }, null] } } });
  assert.equal(S.bookLivros().length, 1); assert.equal(S.bookPages().length, 1); S.resetAll();
});
