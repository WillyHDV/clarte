// Ajustes no app Android: bloco do lembrete diário (liga, permissão, horário, teste) e o que aparece sem o plugin ou no site.
import './support/storage.js';
import { test, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { fakeCapacitor } from './support/capacitor.js';

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

const PLUGINS = ['Filesystem', 'Share', 'LocalNotifications', 'TextToSpeech'];
const $ = (sel) => document.querySelector(sel);
const tick = (ms = 25) => new Promise((r) => setTimeout(r, ms));
async function goto(hash) { w.location.hash = hash; await tick(60); }
async function abrirAjustes(sub = 'estudo') { await goto('#/'); await goto('#/settings/' + sub); await tick(40); }
const mudar = (el, valor) => { if (typeof valor === 'boolean') el.checked = valor; else el.value = valor; el.dispatchEvent(new w.Event('change')); };

let S; let R; let cap;
before(async () => { cap = fakeCapacitor({ plugins: PLUGINS }); await import('../js/app.js'); S = await import('../js/store.js'); R = await import('../js/reminders.js'); await tick(); });
after(() => { mock.timers.reset(); delete globalThis.Capacitor; assert.deepEqual(problems, [], 'erros durante a navegação'); assert.equal(localStorage.getItem('fr_errlog'), null, 'o app registrou erros no fr_errlog'); });
const novo = (opts) => { S.resetAll(); R.esquecer(); cap = fakeCapacitor({ plugins: PLUGINS, ...opts }); };

test('começa desligado, com horário padrão 19:00', async () => {
  novo(); await abrirAjustes();
  assert.ok($('#srem')); assert.equal($('#srem').checked, false); assert.equal($('#sremt').value, '19:00'); assert.equal($('#sremst').textContent, 'Desligado.');
  assert.match(document.body.textContent, /Lembrete diário/);
});

test('ligar pede a permissão uma vez, agenda e mostra o próximo lembrete', async () => {
  novo({ permissao: 'prompt' }); await abrirAjustes();
  mudar($('#srem'), true); await tick(80);
  assert.equal(S.get().settings.reminder, true); assert.equal($('#srem').checked, true); assert.equal(cap.pendentes.size, 7);
  assert.match($('#sremst').textContent, /Próximo lembrete.*19:00/); assert.ok(cap.chamadas.some((c) => c[0] === 'pedir-permissao'));
});

test('permissão negada: o botão volta a desligado e o motivo aparece', async () => {
  novo({ permissao: 'prompt', pedir: 'denied' }); await abrirAjustes();
  mudar($('#srem'), true); await tick(80);
  assert.equal($('#srem').checked, false); assert.equal(S.get().settings.reminder, false); assert.equal(cap.pendentes.size, 0);
  assert.match(document.body.textContent, /Libere em Configurações → Apps → Clarté → Notificações/);
});

test('mudar o horário reagenda, e horário vazio volta ao anterior', async () => {
  novo(); S.setSetting('reminder', true); await abrirAjustes(); await tick(40);
  mudar($('#sremt'), '07:30'); await tick(80);
  assert.equal(S.get().settings.reminderTime, '07:30'); assert.equal(cap.agendamentos.at(-1)[0].schedule.at.getHours(), 7);
  mudar($('#sremt'), ''); await tick(40); assert.equal($('#sremt').value, '07:30', 'horário inválido não é salvo'); assert.equal(S.get().settings.reminderTime, '07:30');
});

test('"Enviar um teste" agenda uma notificação solta', async () => {
  novo(); await abrirAjustes(); $('#sremtest').click(); await tick(80);
  assert.equal(cap.agendamentos.at(-1)[0].id, 199); assert.match(document.body.textContent, /Teste enviado/);
});

test('app instalado antes do plugin: explica como atualizar e não mostra controles que não funcionam', async () => {
  S.resetAll(); R.esquecer(); cap = fakeCapacitor({ plugins: ['Filesystem', 'Share'] }); await abrirAjustes();
  assert.equal($('#srem'), null); assert.match(document.body.textContent, /instalado antes dos lembretes/); assert.match(document.body.textContent, /Run de novo/);
});

test('no site (sem app Android) o bloco não existe', async () => {
  S.resetAll(); R.esquecer(); delete globalThis.Capacitor; await abrirAjustes();
  assert.equal($('#srem'), null); assert.doesNotMatch(document.body.textContent, /Lembrete diário/);
});

test('Ajustes → Voz no app: mostra a voz francesa do Android, instala/atualiza e testa pelo plugin', async () => {
  const V = await import('../js/speech.js'); novo(); await V.recheckNativeVoice(); await abrirAjustes('voz');
  assert.match($('#vstatus').textContent, /Voz francesa do aparelho.*fr-fr-x-vlf-local/); assert.ok($('#sinstvoz')); assert.ok($('#stestapar'));
  $('#sinstvoz').click(); await tick(40); assert.equal(cap.voz.instalou, 1, 'abriu a instalação de voz do Android');
});

test('Ajustes → Voz: sem voz francesa, orienta a instalar; com o limite do Gemini em pausa, explica quando volta', async () => {
  const V = await import('../js/speech.js'); novo({ tts: { suportado: false, vozes: [] } }); await V.recheckNativeVoice(); S.setKey('gemini', 'k'); V.limparPausa();
  await abrirAjustes('voz'); assert.match($('#vstatus').textContent, /não tem voz francesa.*Instalar ou atualizar a voz francesa/);
  localStorage.setItem('fr_tts_pausa', JSON.stringify({ ate: Date.now() + 3600000, motivo: 'dia', detalhe: 'limite 10 (gemini-3.8-flash-tts)' }));
  await goto('#/'); await goto('#/settings/voz'); await tick(40);
  const t = $('#vstatus').textContent;
  assert.match(t, /em pausa/); assert.ok(t.includes('limite 10 (gemini-3.8-flash-tts)')); assert.match(t, /meia-noite do horário do Pacífico/); V.limparPausa();
});

// ---- som dos exercícios no app (voz do Android): as opções falam, a resposta não vaza ----
const responder = async () => {
  const ok = $('#ok'); if (ok.textContent.trim() === 'Continuar') return;
  if ($('#match')) { for (const b of document.querySelectorAll('#mleft [data-l]')) { const n = b.dataset.l; $(`[data-l="${n}"]`).click(); $(`[data-r="${n}"]`).click(); } return; }
  if ($('.opt')) $('.opt').click(); else if ($('#inp')) { $('#inp').value = 'x'; $('#inp').dispatchEvent(new w.Event('input')); } else if ($('#bank [data-b]')) $('#bank [data-b]').click();
  $('#ok').click();
};
// anda pelos treinos das unidades até aparecer um exercício cujo enunciado combine com o padrão (os exercícios são sorteados)
async function acharNoTreino(unidades, padrao) {
  for (let rodada = 0; rodada < 40; rodada++) {
    await goto('#/'); await goto(`#/practice/${unidades[rodada % unidades.length]}`);
    for (let n = 0; n < 14 && !$('.end') && $('#ok'); n++) {
      if ($('.q') && padrao.test($('.q').textContent)) return true;
      await responder(); if ($('#ok') && $('#ok').textContent.trim() === 'Continuar') $('#ok').click(); await tick(20);
    }
  }
  return false;
}

test('treino no app: opções em francês falam ao tocar (certa ou errada), sem botão que entregue a resposta e sem som depois de verificar', async () => {
  const V = await import('../js/speech.js'); novo(); await V.recheckNativeVoice();
  assert.ok(await acharNoTreino(['alphabet', 'verbes', 'metiers', 'questions', 'saluer'], /Escolha a forma certa|última letra é pronunciada|vogal nasal|Complete:|Qual pergunta é/), 'achou um exercício de escolha com opções em francês');
  assert.equal($('#play'), null, 'sem botão de áudio antes de responder'); assert.equal($('[data-slow]'), null);
  await tick(400); // deixa terminar o som do exercício anterior (verificar toca a frase certa)
  const opcoes = [...document.querySelectorAll('.opt')]; const antes = cap.falas.length;
  opcoes[0].click(); await tick(30); opcoes[1].click(); await tick(30);
  assert.deepEqual(cap.falas.slice(antes).map((x) => x.text), [opcoes[0].textContent.trim(), opcoes[1].textContent.trim()], 'as duas opções tocadas foram lidas, qualquer que seja a certa');
  const total = cap.falas.length; $('#ok').click(); await tick(60);
  assert.equal(cap.falas.length, total, 'verificar não fala nada nas escolhas com opções em francês'); assert.equal($('#fb [data-say]'), null, 'e não há botão Ouvir para a resposta certa');
});

test('treino no app: escrever e montar não têm som antes, e a frase certa toca sozinha ao verificar (com botão Ouvir)', async () => {
  const V = await import('../js/speech.js'); novo(); await V.recheckNativeVoice();
  assert.ok(await acharNoTreino(['metiers', 'verbes', 'questions', 'presenter'], /Passe para o|Conjugue|Transforme com|Monte a/), 'achou um exercício de escrever ou montar');
  assert.equal($('#play'), null, 'sem botão de áudio antes de responder');
  await tick(400); const antes = cap.falas.length; await responder(); await tick(60);
  assert.equal(cap.falas.length, antes + 1, 'verificar tocou a frase certa uma vez'); const botao = $('#fb [data-say]');
  assert.ok(botao, 'botão Ouvir no painel de resposta'); assert.equal(cap.falas.at(-1).text, botao.dataset.say.replace(/\s+/g, ' ').trim());
});
