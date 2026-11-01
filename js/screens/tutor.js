// Professora Clara: conversa em texto, prova oral simulada, dúvidas e ligação por voz.
import { speakScore, itemLabel } from '../exercises.js';
import * as V from '../speech.js';
import { stopSpeaking, listen, dictate, browserRec, canTalk, canRecord } from '../speech.js';
import * as S from '../store.js';
import * as T from '../tutor.js';
import { esc, I, toast, linha } from '../ui.js';
import { $app, st, rate, speak, setCleanup, cur, provOptions, loadChats, saveChats, go, haptico } from '../core.js';
import { readiness, CRITERIA, planDone } from '../progress.js';
import { ACC } from './practice.js';
import * as SC from '../scenarios.js';
import { SCENARIOS } from '../data.js';

// pontos fracos para a Clara puxar na conversa (só nos modos de conversa; na prova ela fica neutra, como numa prova de verdade)
function weakContext() {
  const ids = readiness().per.flatMap((x) => x.m.weak).sort((a, b) => a[1] - b[1]).map(([iid]) => iid).filter((iid) => !/^(letter|accent):/.test(iid));
  const labels = [...new Set(ids.map((iid) => itemLabel(iid)).filter(Boolean))].slice(0, 5);
  return labels.length ? `Points faibles de l'élève d'après ses exercices dans l'application (libellés en portugais) : ${labels.join(' ; ')}.\nDans la conversation, amène naturellement UN seul de ces points à la fois, par une question qui le fait utiliser. Ne dis jamais à l'élève que tu as cette liste.` : '';
}
// ---------- reta final: simulações da prova, folha de revisão e lembrete de backup ----------
function recordExam(text) {
  const m = /Nota geral:?\**\s*(\d+(?:[.,]\d+)?)\s*\/\s*10/i.exec(text); if (!m) return;
  const crit = {};
  for (const [fr, , key] of CRITERIA) {
    const r = new RegExp(fr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+') + '[^0-9\\n]{0,40}(\\d)\\s*/\\s*5', 'i').exec(text);
    if (r) crit[key] = +r[1];
  }
  S.addExam({ score: +m[1].replace(',', '.'), crit });
}
let tutorMode = 'free';
let tutorView = 'hub'; // hub (entrada em lista), chat (free, exam, duvidas) ou cenarios
let scRun = null; // missão (cenário) em andamento: { def, nivel, done:Set, turns }
const nota = (v) => String(v).replace('.', ',');
const marca = (feito) => I(feito ? 'circle-check' : 'circle'); // objetivo da missão: feito ou por fazer
const CHAT_TITULOS = { free: ['Conversa por texto', 'Escreva em francês'], exam: ['Prova oral', 'Simulação da avaliação'], duvidas: ['Dúvidas em português', 'Pergunte à vontade'] };

// o que fazer ao encerrar uma ligação: nada (o usuário já está saindo da tela), ir ao chat mostrar o resumo ou redesenhar a tela atual
export const destinoFimLigacao = ({ saindo, resumo, daCentral }) => (saindo ? 'nada' : resumo && daCentral ? 'chat' : 'redesenhar');

export function openTutor(arg) {
  if (arg === 'free' || arg === 'exam' || arg === 'duvidas') { tutorMode = arg; tutorView = 'chat'; } else if (arg === 'cenarios') tutorView = 'cenarios'; else tutorView = 'hub';
  return tutorPage();
}

async function tutorPage() {
  const chats = loadChats(); let busy = false; let ctrl = null; let rec = null; let callEnd = null; let leaving = false;
  if (!cur().key) {
    const c = cur();
    $app.innerHTML = `<header class="apphead"><div class="hello"><b>Clara</b><small>Sua professora de francês</small></div></header>
      <div class="card"><p>A professora Clara usa uma IA com <b>plano gratuito, sem cartão</b>. Você só precisa de uma chave (um código), que fica salva só neste aparelho.</p>
      <label>Provedor<select id="prov" class="inp">${provOptions(c.p)}</select></label>
      <p id="how" class="pt">${esc(c.def.how)}</p>
      <input id="key" class="inp" type="password" placeholder="${esc(c.def.keyHint)}" autocomplete="off"><button class="btn primary wide" id="savekey">Salvar chave</button></div>`;
    document.getElementById('prov').onchange = (e) => { S.setSetting('provider', e.target.value); tutorPage(); };
    document.getElementById('savekey').onclick = () => { const v = document.getElementById('key').value.trim(); if (v) { S.setKey(c.p, v); tutorPage(); } };
    return;
  }
  const getMsgs = () => (chats[scRun ? `sc:${scRun.def.id}` : tutorMode] ||= []);
  const apiMsgs = () => [{ role: 'user', content: scRun ? '(début du scénario)' : tutorMode === 'exam' ? "[DÉBUT DE L'EXAMEN]" : '(début de la session)' }, ...getMsgs().filter((m) => !m.hidden).map((m) => ({ role: m.role, content: m.api || m.content }))];
  const split = (t) => { const i = t.search(/\n\s*---\s*\n?/); return i < 0 ? [t.trim(), ''] : [t.slice(0, i).trim(), t.slice(i).replace(/^\s*---\s*/, '').trim()]; };
  const md = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  const speakable = (t) => tutorMode !== 'duvidas' && !/Nota geral/i.test(t);

  function drawMsg(m) {
    const [fr, corr] = m.role === 'assistant' ? split(m.content) : [m.content, ''];
    return `<div class="msg ${m.role}"><div class="bub">${md(fr)}${m.role === 'assistant' && speakable(m.content) ? `<button class="say sm" data-say="${esc(fr)}" aria-label="Ouvir">${I('volume')}</button>` : ''}</div>${corr ? `<div class="corr">${md(corr)}</div>` : ''}</div>`;
  }
  function sumCard(msgs) {
    const x = chats.sum; if (!x || x.mode !== tutorMode || x.n !== msgs.length) return '';
    const rep = x.repeats.length ? `<p>Frases que você repetiu: ${x.repeats.map((r) => `<span class="rep ${r.ok ? 'ok' : ''}">${I(r.ok ? 'check' : 'repeat')} ${esc(r.t)}</span>`).join(' · ')}</p>${x.repeats.some((r) => !r.ok) ? '<small>As frases marcadas com a seta circular foram para o Reforço, para você repetir de novo depois.</small>' : ''}` : '';
    const notes = x.notes.length ? `<small>Correções da Clara:</small><ul>${x.notes.map((n) => `<li>${md(n)}</li>`).join('')}</ul>` : '<small>A Clara não precisou corrigir nada. Muito bem!</small>';
    return `<div class="card sumcard"><h3>Resumo da ligação</h3><p>Você falou <b>${x.turns} ${x.turns > 1 ? 'vezes' : 'vez'}</b>.</p>${rep}${notes}</div>`;
  }
  function draw() {
    if (tutorView === 'hub') return drawHub();
    if (tutorView === 'cenarios') return drawScenarios();
    const msgs = getMsgs(); const [titulo, sub] = CHAT_TITULOS[tutorMode];
    $app.innerHTML = `
      <header class="apphead"><button class="back" data-go="#/tutor" aria-label="Voltar">${I('chevron-left')}</button><div class="hello"><b>${titulo}</b><small>${sub}</small></div>${tutorMode !== 'duvidas' && canTalk() ? `<button class="icon" id="callbtn" aria-label="Ligar para a Clara">${I('phone')}</button>` : ''}<button class="icon" id="newc" title="Nova conversa" aria-label="Nova conversa">${I('trash')}</button></header>
      ${tutorMode !== 'duvidas' && !canTalk() ? `<div class="pt">${canRecord ? 'Para conversar por voz neste aparelho, coloque uma chave do Gemini (ou do Groq) em Ajustes.' : 'A conversa por voz precisa do Chrome (ou Edge).'}</div>` : ''}
      <div class="chat" id="chat">${msgs.filter((m) => !m.hidden).map(drawMsg).join('')}${sumCard(msgs)}${tutorMode === 'exam' && !msgs.length ? `<div class="card center"><p>Simulação da <b>avaliação oral</b>: a professora Clara faz perguntas por voz ou texto, sem corrigir durante a prova. No fim, você recebe a nota nos 6 critérios.</p><button class="btn primary" id="startexam">Começar a prova</button></div>` : ''}</div>
      <div class="composer ${tutorMode === 'exam' && !msgs.length ? 'hide' : ''}">
        ${tutorMode === 'exam' && msgs.length ? '<button class="btn warn sm" id="endexam">Terminar e avaliar</button>' : ''}
        <div class="inrow">
          ${canTalk() ? `<button class="micb" id="tmic" aria-label="Falar">${I('mic')}</button>` : ''}
          <input id="tin" class="inp" aria-label="Mensagem para a Clara" placeholder="${tutorMode === 'duvidas' ? 'Pergunte em português…' : 'Écris en français…'}" autocomplete="off" autocapitalize="off" spellcheck="false">
          <button class="send" id="tsend" aria-label="Enviar">${I('send')}</button>
        </div>
        <div class="acentos">${ACC.map((a) => `<button type="button" data-ins="${a}">${a}</button>`).join('')}</div>
      </div>`;
    const chat = document.getElementById('chat'); chat.scrollTop = chat.scrollHeight;
    document.getElementById('newc').onclick = () => { if (busy) return; if (confirm('Apagar esta conversa?')) { chats[tutorMode] = []; saveChats(chats); ensureOpening(); draw(); } };
    const tin = document.getElementById('tin'); const send = document.getElementById('tsend');
    if (tin) {
      tin.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(tin.value); } };
      send.onclick = () => submit(tin.value);
      document.querySelectorAll('.composer [data-ins]').forEach((b) => { b.onmousedown = (e) => e.preventDefault(); b.onclick = () => { tin.value += b.dataset.ins; tin.focus(); }; });
    }
    const cb = document.getElementById('callbtn'); if (cb) cb.onclick = () => startCall();
    const sx = document.getElementById('startexam'); if (sx) sx.onclick = () => run();
    const ee = document.getElementById('endexam'); if (ee) ee.onclick = () => { if (confirm('Terminar a prova e receber a avaliação?')) submit('[FIN]', true); };
    const tm = document.getElementById('tmic');
    if (tm) tm.onclick = () => {
      if (busy) return; if (rec) { rec.stop(); return; }
      stopSpeaking(); tm.classList.add('on');
      rec = (browserRec() ? listen : dictate)({ onInterim: (t) => { tin.value = t; }, onPhase: (p) => { tin.placeholder = p === 'think' ? 'Entendendo você…' : 'Gravando… toque de novo para enviar'; }, onFinal: (t) => { tm.classList.remove('on'); rec = null; if (t) submit(t); else tin.placeholder = 'Não ouvi nada, tente de novo'; }, onError: (er, msg) => { tm.classList.remove('on'); rec = null; tin.placeholder = er === 'not-allowed' ? 'Permita o microfone no navegador' : msg || 'Não ouvi nada, tente de novo'; } });
    };
  }
  function ensureOpening() {
    const abertura = T.opening[tutorMode];
    if (abertura && !getMsgs().length) { chats[tutorMode] = [{ role: 'assistant', content: abertura }]; saveChats(chats); }
  }
  function submit(text, hideUser) {
    text = text.trim(); if (!text || busy) return;
    if (text !== '[FIN]' && S.voiceTurn() >= 4) planDone('clara');
    getMsgs().push({ role: 'user', content: text, hidden: false });
    if (hideUser) getMsgs()[getMsgs().length - 1].content = '[FIN]';
    saveChats(chats); draw(); run();
  }
  async function run() {
    busy = true; ctrl = new AbortController();
    const chat = document.getElementById('chat'); const sx = document.getElementById('startexam'); if (sx) sx.closest('.card').remove();
    chat.insertAdjacentHTML('beforeend', '<div class="msg assistant" id="live"><div class="bub"><span class="dots">…</span></div></div>');
    chat.scrollTop = chat.scrollHeight;
    const send = document.getElementById('tsend'); if (send) send.disabled = true;
    let acc = '';
    try {
      const c = cur();
      const { text } = await T.chat({ provider: c.p, apiKey: c.key, model: c.model, mode: tutorMode, messages: apiMsgs(), signal: ctrl.signal, context: tutorMode === 'free' ? weakContext() : '', onText: (d) => { acc += d; const live = document.getElementById('live'); if (live) { live.querySelector('.bub').innerHTML = md(split(acc)[0]); chat.scrollTop = chat.scrollHeight; } } });
      getMsgs().push({ role: 'assistant', content: text }); saveChats(chats);
      if (/Nota geral/i.test(text)) { planDone('exam'); recordExam(text); }
      busy = false; draw();
      if (st().settings.voice !== false && speakable(text)) speak(split(text)[0], { rate: rate() });
    } catch (e) {
      busy = false; const live = document.getElementById('live'); if (live) live.remove();
      // devolve a mensagem não respondida para a caixa de texto, para tentar de novo sem duplicar
      const m = getMsgs(); let back = '';
      if (m.length && m[m.length - 1].role === 'user') back = m.pop().content;
      saveChats(chats); draw();
      if (back && back !== '[FIN]' && document.getElementById('tin')) document.getElementById('tin').value = back;
      const c = document.getElementById('chat'); c.insertAdjacentHTML('beforeend', `<div class="err">${I('alert-circle')} ${esc(T.friendlyError(e))}</div>`); c.scrollTop = c.scrollHeight;
    }
  }
  // ---------- conversa por voz: a Clara fala, você grava a resposta e toca em Enviar ----------
  function startCall(sc = null) {
    if (busy || callEnd) return;
    const isExam = !sc && tutorMode === 'exam'; const mode = sc ? 'scenario' : isExam ? 'examVoice' : 'voice'; const daCentral = tutorView === 'hub';
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let alive = true; let paused = false; let phase = 'think'; let target = ''; let cr = null; let listenId = 0; let blocked = false;
    let speaker = null; let abortCtl = null; let wake = null; let evalMode = false; let hideText = false;
    let recorder = null; let lastClip = null; let autoStop = null; let tries = 0;
    const stats = { turns: 0, repeats: [], notes: [] }; // alimenta o resumo ao encerrar a ligação
    const el = document.createElement('div'); el.className = 'call';
    el.innerHTML = `
      <div class="call-glow"></div>
      <header class="call-top">
        <div class="ct-l"><button class="cbtn ghost" id="cend" aria-label="Encerrar">${I('x')}</button></div>
        <div class="call-who"><b>${sc ? esc(sc.def.title) : 'Clara'}</b><small id="cstatus">Conectando…</small></div>
        <div class="ct-r"><button class="cbtn ghost" id="chistbtn" aria-label="Ver a conversa">${I('chat')}</button><button class="cbtn ghost" id="chide" aria-label="Esconder o texto">${I('eye')}</button></div>
      </header>
      <section class="mission" id="cmission" hidden></section>
      <section class="stage">
        <div class="speakrow">
          <div class="orb" id="cav" data-state="think"><i class="o1"></i><i class="o2"></i><i class="o3"></i></div>
          <p class="clara" id="cclara"></p>
        </div>
        <div class="ctarget" id="ctarget" hidden></div>
        <div class="cnote" id="cnote" hidden></div>
        <p class="you" id="cyou"></p>
        <div class="call-err" id="cerr" hidden></div>
      </section>
      <footer class="call-bar">
        <div class="hints" id="chints" hidden></div>
        <div class="ctl">
          <button class="cbtn" id="cslow" aria-label="Falar mais devagar"></button>
          <button class="cbig" id="cmic" aria-label="Falar"></button>
          <button class="cbtn" id="cpause" aria-label="Pausar"></button>
        </div>
        <div class="ctl2"><button class="pill" id="credo" hidden>${I('redo')} Refazer</button>${isExam || sc ? `<button class="pill warn" id="cfin">${I('check')} ${sc ? 'Terminar e ver o resultado' : 'Terminar e avaliar'}</button>` : ''}</div>
      </footer>
      <aside class="chist" id="chist" hidden>
        <div class="chist-top"><b>Conversa</b><button class="cbtn ghost" id="chistclose" aria-label="Fechar a conversa">${I('x')}</button></div>
        <div class="chist-list" id="chistlist"></div>
      </aside>`;
    el.dataset.ts = ['p', 'g'].includes(st().settings.callText) ? st().settings.callText : 'm'; // tamanho do texto (Ajustes)
    document.body.appendChild(el); document.body.classList.add('incall');
    const $ = (id) => el.querySelector('#' + id);
    // barra da missão (objetivos marcados ao vivo) e frases-guia do nível escolhido
    const drawMission = () => {
      if (!sc) return; const d = sc.def; const m = $('cmission'); const hb = $('chints'); m.hidden = false;
      if (sc.nivel >= 3) { m.innerHTML = `<div class="mrow"><b>Missão</b><span>Modo prova: sem ajuda</span></div>`; hb.hidden = true; return; }
      const total = d.objetivos.length; const aberta = m.classList.contains('open');
      m.innerHTML = `<button class="mhead" id="cmtoggle" aria-expanded="${aberta}"><b>Missão</b><span>${sc.done.size} de ${total}</span><span class="mseg">${d.objetivos.map((o) => `<i class="${sc.done.has(o.id) ? 'on' : ''}"></i>`).join('')}</span></button>
        <ul class="mlist">${d.objetivos.map((o) => `<li class="${sc.done.has(o.id) ? 'ok' : ''}">${marca(sc.done.has(o.id))} ${esc(o.texto)}</li>`).join('')}</ul>`;
      $('cmtoggle').onclick = () => { m.classList.toggle('open'); $('cmtoggle').setAttribute('aria-expanded', String(m.classList.contains('open'))); };
      const dicas = SC.dicas(d, sc.nivel, sc.done); hb.hidden = !dicas.length;
      hb.innerHTML = dicas.map((x) => `<button class="hint" data-say="${esc(x.texto.replace(/…/g, ''))}">${esc(x.texto)}</button>`).join('');
    };
    // fim da missão: grava o resultado, fecha a ligação e mostra o resumo
    function endScenario(text, mk) {
      S.recordScenario(sc.def.id, { nivel: sc.nivel, done: sc.done.size, total: sc.def.objetivos.length });
      haptico(sc.done.size >= sc.def.objetivos.length ? 'fim' : 'toque');
      const relatorio = SC.stripMarkers(text); end(false); showSummary(sc, relatorio);
    }
    // micMode 'web' (reserva escolhida no PC/Chrome) só vale onde o navegador tem reconhecimento; no app Android a gravação é o único caminho
    const recOk = () => V.canRecord && (st().settings.micMode !== 'web' || !browserRec()) && !!T.transcribeProvider(st().settings);
    const micFace = (p) => (p === 'listen' ? `${I('send')}<span>Enviar</span>` : p === 'think' ? '<span class="dots3"><i></i><i></i><i></i></span>' : `${I('mic')}<span>Falar</span>`);
    const setPhase = (p, txt) => {
      phase = p; $('cav').dataset.state = p; $('cstatus').textContent = txt;
      const mb = $('cmic'); mb.innerHTML = micFace(p); mb.classList.toggle('send', p === 'listen'); $('credo').hidden = !(p === 'listen' && recOk());
    };
    const setLevel = (l) => el.style.setProperty('--lvl', Math.min(1, l * 7).toFixed(2));
    const slowLabel = () => { $('cslow').innerHTML = `${I('clock')}<span>${st().settings.slow ? 'Devagar: sim' : 'Devagar'}</span>`; $('cslow').classList.toggle('on', !!st().settings.slow); };
    slowLabel();
    const pauseFace = (p) => { $('cpause').innerHTML = `${I(p ? 'play' : 'pause')}<span>${p ? 'Continuar' : 'Pausar'}</span>`; };
    pauseFace(false);
    const getRate = () => (st().settings.slow ? 0.7 : 0.85);
    const lastMsg = () => { const m = getMsgs(); return m[m.length - 1]; };

    // separa a parte falada, a nota em português (---) e a frase para repetir (>>)
    const parts = (t) => {
      const sp = []; const note = []; let tgt = ''; let inNote = false;
      for (const ln of t.replace(/\r/g, '').split('\n')) {
        if (/^\s*##/.test(ln)) continue;
        if (/^\s*>>/.test(ln)) { tgt = ln.replace(/^\s*>>\s*/, '').trim(); continue; }
        if (/^\s*---\s*$/.test(ln)) { inNote = true; continue; }
        (inNote ? note : sp).push(ln);
      }
      return { spoken: sp.join('\n').trim(), note: note.join('\n').trim(), target: tgt };
    };
    const show = (spoken, note, tgt) => {
      $('cclara').textContent = spoken || '';
      const n = $('cnote'); n.hidden = !note; n.innerHTML = note ? md(note) : '';
      const tg = $('ctarget'); tg.hidden = !tgt;
      tg.innerHTML = tgt ? `<small>Repita em voz alta</small><b>${esc(tgt)}</b><span><button class="pill" data-say="${esc(tgt)}">${I('volume')} Ouvir</button><button class="pill" id="ctslow">${I('clock')} Devagar</button></span>` : '';
      const ts = tg.querySelector('#ctslow'); if (ts) ts.onclick = () => { stopRec(); speaker && speaker.stop(); speak(tgt, { rate: 0.6 }).then(() => { if (alive && !paused && phase === 'listen') listenTurn(); }); };
    };
    const fail = (msg, retry, alt) => {
      setPhase('error', msg); const er = $('cerr'); er.hidden = false;
      er.innerHTML = `${retry ? `<button class="pill primary" id="cretry">Tentar de novo</button>` : ''}${alt ? `<button class="pill" id="calt">${esc(alt.label)}</button>` : ''}`;
      const b = er.querySelector('#cretry'); if (b) b.onclick = () => { er.hidden = true; if (typeof retry === 'function') retry(); else clara(); };
      const a = er.querySelector('#calt'); if (a) a.onclick = () => { er.hidden = true; alt.fn(); };
    };

    function stopRec() {
      listenId++; clearTimeout(autoStop);
      if (cr) { const r = cr; cr = null; try { r.abort(); } catch (e) { /* ignore */ } }
      if (recorder) { const r = recorder; recorder = null; try { r.cancel(); } catch (e) { /* ignore */ } }
      setLevel(0);
    }

    // ----- gravar a resposta: sem cortes; você toca em Enviar quando terminar -----
    async function recordTurn() {
      if (!alive || paused) return;
      stopRec(); const id = ++listenId; $('cerr').hidden = true; $('cyou').textContent = '';
      setPhase('listen', 'Sua vez: fale e toque em Enviar');
      try {
        const r = await V.createRecorder({ onLevel: setLevel });
        if (id !== listenId || !alive) { r.cancel(); return; }
        recorder = r;
      } catch (e) {
        if (id !== listenId) return; blocked = true;
        setPhase('idle', e && e.name === 'NotAllowedError' ? 'Permita o microfone no navegador e toque em Falar.' : 'Não consegui abrir o microfone. Toque em Falar para tentar.'); return;
      }
      autoStop = setTimeout(() => sendRecording(), 90000);
    }
    async function sendRecording() {
      if (!recorder) return; clearTimeout(autoStop); const r = recorder; recorder = null; listenId++;
      const { blob, ms, peak } = await r.stop(); setLevel(0);
      if (!alive || paused) return;
      // só silêncio quase total é barrado: fala baixa passa e é amplificada antes de transcrever
      if (ms < 800 || (peak >= 0 && peak < 0.003)) { tries++; setPhase('idle', tries >= 2 ? 'Não ouvi nada. Veja se o microfone está liberado e toque em Falar.' : 'Não ouvi nada. Toque em Falar e tente de novo.'); return; }
      tries = 0; await transcribeClip(blob);
    }
    async function transcribeClip(blob) {
      lastClip = blob; setPhase('think', 'Entendendo você…'); $('cerr').hidden = true; abortCtl = new AbortController();
      try {
        const s = st().settings; const tp = T.transcribeProvider(s);
        const text = await T.transcribe({ provider: tp, apiKey: (s.keys || {})[tp], model: (s.models || {})[tp] || T.PROVIDERS[tp].model, blob, signal: abortCtl.signal });
        if (!alive || paused) return;
        if (!text) { setPhase('idle', 'Não consegui entender. Toque em Falar e tente de novo.'); return; }
        userSaid(text);
      } catch (e) {
        if (!alive || e.name === 'AbortError') return;
        fail(T.friendlyError(e), () => transcribeClip(lastClip), browserRec() ? { label: 'Usar o reconhecimento do navegador', fn: () => { S.setSetting('micMode', 'web'); toast('Usando o reconhecimento de voz do navegador.'); listenTurn(); } } : null);
      }
    }

    // ----- reserva: reconhecimento do navegador, também com envio manual -----
    function webListen() {
      if (!alive || paused) return;
      stopRec(); const id = ++listenId; $('cerr').hidden = true;
      setPhase('listen', 'Sua vez: fale e toque em Enviar'); $('cyou').textContent = '';
      cr = V.listenPatient({
        patienceMs: 600000, initialMs: 600000,
        onInterim: (t) => { if (id === listenId) $('cyou').textContent = t; },
        onFinal: (t) => {
          if (id !== listenId) return; cr = null;
          if (!alive || paused || blocked) return;
          if (t) userSaid(t); else setPhase('idle', 'Não ouvi nada. Toque em Falar e tente de novo.');
        },
        onError: (er) => {
          if (id !== listenId) return;
          if (er === 'not-allowed' || er === 'service-not-allowed') { blocked = true; setPhase('idle', 'Permita o microfone no navegador e toque em Falar.'); }
          else if (er === 'network') { blocked = true; setPhase('idle', 'O reconhecimento de voz precisa de internet. Toque em Falar para tentar.'); }
          else if (er !== 'no-speech' && er !== 'aborted') { blocked = true; setPhase('idle', `Erro no microfone (${er}). Toque em Falar.`); }
        },
      });
    }
    function listenTurn() { return recOk() ? recordTurn() : webListen(); }

    function userSaid(t, plain) {
      const m = { role: 'user', content: t }; if (sc && !plain) sc.turns++;
      if (target && !plain) {
        const r = speakScore(target, t); const miss = r.words.filter((w, i) => !r.marks[i]);
        m.api = `${t}\n\n[Note de l'application : l'élève devait répéter « ${target} ». Reconnu : « ${t} ». Mots reconnus : ${r.marks.filter(Boolean).length}/${r.words.length}. Correspondance : ${Math.round(r.score * 100)} %.${miss.length ? ' Mots non reconnus : ' + miss.join(', ') + '.' : ''}]`;
        // frase que não saiu bem vai para a aba Revisão (repetição espaçada); se saiu bem, avança na revisão
        const ex = { unit: 'voice', kind: 'speak', q: 'Diga em voz alta (da conversa com a Clara):', answer: target.replace(/[.!?]+$/, ''), shown: target, audio: target, key: `speak|voice|${target}` };
        S.noteResult(ex, r.score >= 0.75, true);
        S.recordSkill('pronuncia', r.score);
        stats.repeats.push({ t: target, ok: r.score >= 0.75 });
      }
      if (!plain) stats.turns++;
      target = '';
      // critérios da prova: responder de fato (não só pedir ajuda) e falar frases mais longas
      if (!plain && S.voiceTurn() >= 4) planDone('clara');
      S.recordSkill('resposta', plain ? 0 : 1);
      if (!plain) S.recordSkill('fluidez', Math.min(1, t.trim().split(/\s+/).length / 7));
      getMsgs().push(m); saveChats(chats);
      $('cyou').textContent = `“${t}”`; if ($('cyou').scrollIntoView) $('cyou').scrollIntoView({ block: 'nearest' }); clara();
    }

    async function clara() {
      if (!alive || paused) return;
      stopRec(); setPhase('think', 'Clara está pensando…'); $('cerr').hidden = true;
      abortCtl = new AbortController(); speaker = V.createSpeaker(getRate);
      const sp = speaker; let acc = ''; let consumed = 0; let began = false;
      const flush = (spoken, final) => {
        if (evalMode) return; let rest = spoken.slice(consumed);
        for (;;) { const m = /[.!?…]+["»”)]*\s/.exec(rest); if (!m) break; const end = m.index + m[0].length; sp.push(rest.slice(0, end).replace(/[*_`#]/g, '')); consumed += end; rest = rest.slice(end); }
        if (final && rest.trim()) { sp.push(rest.replace(/[*_`#]/g, '')); consumed += rest.length; }
      };
      try {
        const c = cur(); let text = ''; let attempt = 0;
        for (;;) {
          try {
            ({ text } = await T.chat({ provider: c.p, apiKey: c.key, model: c.model, mode, system: sc ? T.scenarioSystem(sc.def, sc.nivel) : undefined, messages: apiMsgs(), signal: abortCtl.signal, context: isExam || sc ? '' : weakContext(),
              onText: (d) => { if (!alive || sp !== speaker) return; acc += d; const p = parts(acc); if (!began && p.spoken) { began = true; if (!evalMode) setPhase('speak', 'Clara está falando…'); } show(p.spoken, evalMode ? p.spoken : '', ''); flush(p.spoken, false); } }));
            break;
          } catch (e) {
            // falhas passageiras (limite, rede, servidor): tenta de novo sozinho, sem você precisar tocar
            const s = e && e.status; const transient = e instanceof TypeError || s === 408 || s === 429 || s >= 500;
            if (!transient || began || attempt >= 2 || !alive || sp !== speaker || e.name === 'AbortError') throw e;
            attempt++; setPhase('think', 'Reconectando…'); await sleep(1500 * attempt); acc = ''; consumed = 0;
            if (!alive || sp !== speaker) return;
          }
        }
        if (!alive || sp !== speaker) return;
        getMsgs().push({ role: 'assistant', content: text }); saveChats(chats);
        const mk = sc ? SC.parseMarkers(text, sc.def.objetivos.map((o) => o.id)) : null;
        // ##OK marca ao vivo; ##FINAL (avaliação final) confere e acrescenta o que a marcação ao vivo tenha perdido
        if (mk) { const antes = sc.done.size; [...mk.ok, ...(mk.final || [])].forEach((id) => sc.done.add(id)); if (sc.done.size !== antes) drawMission(); }
        const p = parts(text); const isEval = evalMode || (!sc && /Nota geral/i.test(text));
        if (p.note && !isEval) stats.notes.push(p.note);
        if (isEval && sc) { sp.stop(); endScenario(text, mk); return; }
        if (isEval) { sp.stop(); planDone('exam'); recordExam(text); finish(true); return; }
        show(p.spoken, p.note, p.target); target = p.target; flush(p.spoken, true);
        if (!began) setPhase('speak', 'Clara está falando…');
        await sp.done();
        if (!alive || paused || sp !== speaker) return;
        if (sp.fallback) toast('Voz natural indisponível; usando a voz do aparelho.');
        if (sc && (mk.fim || sc.done.size >= sc.def.objetivos.length || sc.turns >= sc.def.maxTurnos)) { autoFinish(); return; } // missão completa ou sem mais turnos
        await sleep(250); listenTurn();
      } catch (e) {
        if (!alive || e.name === 'AbortError' || sp !== speaker) return;
        sp.stop(); fail(T.friendlyError(e), true);
      }
    }

    // retoma a conversa: a Clara repete a última fala e abre o microfone
    async function sayLast() {
      const m = lastMsg(); const p = parts(m.content); show(p.spoken, p.note, p.target); target = p.target;
      speaker = V.createSpeaker(getRate); const sp = speaker; setPhase('speak', 'Clara está falando…');
      p.spoken.split(/(?<=[.!?…])\s+/).forEach((s) => sp.push(s.replace(/[*_`#]/g, '')));
      await sp.done(); if (!alive || paused || sp !== speaker) return; await sleep(250); listenTurn();
    }

    async function finish(showEval) {
      if (callEnd !== end) return; end(showEval);
    }
    function end(showEval) {
      if (!alive) return; alive = false; stopRec(); if (speaker) speaker.stop(); if (abortCtl) abortCtl.abort(); stopSpeaking();
      if (wake) { try { wake.release(); } catch (e) { /* ignore */ } }
      document.removeEventListener('keydown', onKey); el.remove(); document.body.classList.remove('incall'); callEnd = null; scRun = null;
      // resumo da ligação (conversa livre com pelo menos 2 falas suas); aparece no chat até a conversa continuar
      const resumo = !sc && !isExam && !showEval && stats.turns >= 2;
      if (resumo) chats.sum = { mode: tutorMode, n: getMsgs().length, turns: stats.turns, repeats: stats.repeats.slice(-6), notes: [...new Set(stats.notes)].slice(-4) };
      saveChats(chats); const destino = destinoFimLigacao({ saindo: leaving, resumo, daCentral });
      if (destino === 'nada') return;
      if (destino === 'chat') { go('#/tutor/free'); return; } // o resumo aparece no topo do chat
      draw(); if (showEval) toast('Avaliação pronta, no chat.');
    }
    callEnd = end;
    const onKey = (e) => { if (e.key === 'Escape') end(false); };
    document.addEventListener('keydown', onKey);

    $('cend').onclick = () => end(false);
    // a conversa até aqui, em bolhas (só a parte falada de cada resposta)
    const drawHist = () => {
      const itens = getMsgs().filter((m) => !m.hidden && m.content !== '[FIN]').map((m) => {
        if (m.role === 'assistant' && /Nota geral/i.test(m.content)) return '<div class="hb cl">Avaliação pronta: veja no chat.</div>';
        const t = m.role === 'assistant' ? parts(m.content).spoken : m.content;
        return t ? `<div class="hb ${m.role === 'assistant' ? 'cl' : 'me'}">${esc(t)}</div>` : '';
      }).join('');
      $('chistlist').innerHTML = itens || '<p class="pt">A conversa ainda não começou.</p>';
      $('chistlist').scrollTop = $('chistlist').scrollHeight;
    };
    $('chistbtn').onclick = () => { const h = $('chist'); h.hidden = !h.hidden; if (!h.hidden) drawHist(); };
    $('chistclose').onclick = () => { $('chist').hidden = true; };
    $('chide').onclick = () => { hideText = !hideText; el.classList.toggle('hidetext', hideText); $('chide').innerHTML = I(hideText ? 'eyeoff' : 'eye'); };
    $('cslow').onclick = () => { S.setSetting('slow', !st().settings.slow); slowLabel(); };
    $('credo').onclick = () => { stopRec(); listenTurn(); };
    $('cmic').onclick = () => {
      blocked = false;
      if (phase === 'listen') { if (recorder) { sendRecording(); return; } if (cr) { cr.finish(); return; } }
      if (phase === 'speak') { if (speaker) speaker.stop(); listenTurn(); return; } // pular a fala da Clara
      if (phase === 'think' || paused) return;
      if (lastMsg() && lastMsg().role === 'user') clara(); else listenTurn();
    };
    $('cpause').onclick = () => {
      if (!paused) { paused = true; stopRec(); if (speaker) speaker.stop(); if (abortCtl) abortCtl.abort(); setPhase('paused', 'Conversa pausada'); pauseFace(true); }
      else { paused = false; pauseFace(false); if (lastMsg() && lastMsg().role === 'user') clara(); else listenTurn(); }
    };
    // pede a avaliação final (a IA responde ao "[FIN]")
    const autoFinish = () => { evalMode = true; stopRec(); if (speaker) speaker.stop(); getMsgs().push({ role: 'user', content: '[FIN]' }); saveChats(chats); if (sc) setPhase('think', 'Preparando o seu resultado…'); clara(); };
    const fin = $('cfin');
    if (fin) fin.onclick = () => { if (!confirm(sc ? 'Terminar a missão e ver o resultado?' : 'Terminar a prova e receber a avaliação?')) return; autoFinish(); };

    (async () => {
      try { if (navigator.wakeLock) wake = await navigator.wakeLock.request('screen'); } catch (e) { /* sem wake lock */ }
      setPhase('think', 'Conectando…'); drawMission();
      const m = lastMsg();
      if (!m || m.role === 'user') clara();
      else if (/Nota geral/i.test(m.content)) { setPhase('idle', 'Esta prova já foi avaliada. Apague a conversa para recomeçar.'); }
      else sayLast();
    })();
  }

  // ---------- central da Clara: ligar e as quatro formas de estudar com ela ----------
  const cumpridas = () => { const sc = S.get().scenarios || {}; return SCENARIOS.filter((d) => (sc[d.id] || {}).levelDone).length; };
  function drawHub() {
    const ex = st().exams || []; const prova = ex.length ? `Última nota ${nota(ex[ex.length - 1].score)} de 10` : 'Você ainda não fez uma simulação';
    const chamada = canTalk() ? `<button class="btn" id="callbtn">${I('phone')} Ligar agora</button>`
      : `<p class="exam">${canRecord ? 'Para conversar por voz neste aparelho, coloque uma chave do Gemini (ou do Groq) em Ajustes.' : 'A conversa por voz precisa do Chrome (ou Edge).'}</p>${canRecord ? '<button class="btn" data-go="#/settings/ia">Abrir Ajustes</button>' : ''}`;
    $app.innerHTML = `
      <header class="apphead"><div class="hello"><b>Clara</b><small>Sua professora de francês</small></div></header>
      <section class="card continuar ligar" id="callcard" aria-labelledby="ltitulo">
        <small class="eyebrow">Conversa por voz</small>
        <h2 id="ltitulo">Ligar para a Clara</h2>
        <p class="exam">Fale em francês: ela responde, corrige e pede para você repetir.</p>
        ${chamada}
      </section>
      <div class="grupo">
        ${linha({ icone: 'route', titulo: 'Cenários', resumo: `${cumpridas()} de ${SCENARIOS.length} missões cumpridas`, go: '#/tutor/cenarios' })}
        ${linha({ icone: 'trophy', titulo: 'Prova oral', resumo: prova, go: '#/tutor/exam' })}
        ${linha({ icone: 'message-circle', titulo: 'Conversa por texto', resumo: 'Escreva em francês, com acentos à mão', go: '#/tutor/free' })}
        ${linha({ icone: 'help-circle', titulo: 'Dúvidas em português', resumo: 'Pergunte sobre gramática e vocabulário', go: '#/tutor/duvidas' })}
      </div>`;
    const cb = document.getElementById('callbtn'); if (cb) cb.onclick = () => { tutorMode = 'free'; ensureOpening(); startCall(); };
  }
  // ---------- cenários: lista, ficha da missão e resultado ----------
  function drawScenarios() {
    const stats = S.get().scenarios || {};
    const lista = SCENARIOS.map((d) => {
      const x = stats[d.id] || {}; const total = d.objetivos.length;
      const sel = x.levelDone ? `<span class="linha-v ok">${I('check')} nível ${x.levelDone}</span>` : `<span class="linha-v">${x.runs ? `${Math.min(x.best || 0, total)}/${total}` : 'novo'}</span>`;
      return `<button class="linha" data-sc="${d.id}"><span class="linha-i emo">${d.icon}</span><span class="linha-t"><b>${esc(d.title)}</b><small>${esc(d.sub)}</small><small>${total} objetivos${x.runs ? ` · ${x.runs} ${x.runs > 1 ? 'tentativas' : 'tentativa'}` : ''}</small></span>${sel}${I('chevron-right')}</button>`;
    }).join('');
    $app.innerHTML = `
      <header class="apphead"><button class="back" data-go="#/tutor" aria-label="Voltar">${I('chevron-left')}</button><div class="hello"><b>Cenários</b><small>${cumpridas()} de ${SCENARIOS.length} missões cumpridas</small></div></header>
      <p class="pt">Missões curtas por voz: a Clara interpreta um papel (recepcionista, colega, guia…) e você cumpre os objetivos falando. Escolha quanta ajuda quer, de frases na tela até o modo prova.</p>
      ${canTalk() ? '' : '<div class="card"><p class="pt">Para falar nos cenários, o app precisa gravar a sua voz e entender o que você diz: coloque uma chave do Gemini (ou do Groq) em Ajustes e permita o microfone.</p></div>'}
      <div class="grupo">${lista}</div><div id="scsheet"></div>`;
    document.querySelectorAll('[data-sc]').forEach((b) => { b.onclick = () => openBriefing(SCENARIOS.find((d) => d.id === b.dataset.sc)); });
  }
  function openBriefing(d, nivelInicial) {
    let nivel = nivelInicial || SC.nivelSugerido(d, S.get().scenarios); const box = document.getElementById('scsheet'); if (!box) return;
    const pinta = () => {
      const niveis = d.nivelFixo ? `<p class="pt"><b>Modo prova</b>: ${SC.NIVEIS[2].desc}</p>`
        : `<h4>Quanta ajuda?</h4><div class="lvls">${SC.NIVEIS.map((n) => `<label class="lvl ${n.n === nivel ? 'on' : ''}"><input type="radio" name="nivel" value="${n.n}" ${n.n === nivel ? 'checked' : ''}><span><b>${n.nome}</b><small>${n.desc}</small></span></label>`).join('')}</div>`;
      box.innerHTML = `<div class="scsheet" role="dialog" aria-modal="true" aria-label="Missão: ${esc(d.title)}"><div class="box"><span class="grab" aria-hidden="true"></span>
        <div class="sc-head"><span class="linha-i emo">${d.icon}</span><div><h3>${esc(d.title)}</h3><small>${esc(d.sub)}</small></div></div>
        <p class="sc-situacao">${esc(d.situacao)}</p>
        <h4>Objetivos</h4><ul class="scobj">${d.objetivos.map((o) => `<li>${marca(false)} ${esc(o.texto)}</li>`).join('')}</ul>${niveis}
        <div class="sc-acoes">${canTalk() ? `<button class="btn primary" id="scgo">${I('phone')} Começar a missão</button>` : ''}<button class="btn" id="scno">Agora não</button></div></div></div>`;
      box.querySelectorAll('input[name="nivel"]').forEach((r) => { r.onchange = () => { nivel = +r.value; pinta(); }; });
      box.querySelector('#scno').onclick = () => { box.innerHTML = ''; };
      box.querySelector('.scsheet').onclick = (e) => { if (e.target.classList.contains('scsheet')) box.innerHTML = ''; }; // tocar fora fecha
      const go = box.querySelector('#scgo'); if (go) go.onclick = () => { box.innerHTML = ''; startScenario(d, nivel); };
    };
    pinta();
  }
  function startScenario(d, nivel) {
    if (busy || callEnd) return;
    scRun = { def: d, nivel: SC.nivelDe(d, nivel), done: new Set(), turns: 0 };
    chats[`sc:${d.id}`] = [{ role: 'assistant', content: d.abertura }]; saveChats(chats); // a Clara abre a conversa, sem chamar a IA
    startCall(scRun);
  }
  function showSummary(sc, relatorio) {
    const d = sc.def; const total = d.objetivos.length; const n = sc.done.size; const v = SC.veredito(n, total);
    const el = document.createElement('div'); el.className = 'call csum-wrap'; el.dataset.ts = 'm';
    const medalha = { ok: 'trophy', parcial: 'star', nao: 'rotate-clockwise' }[v.chave];
    el.innerHTML = `<div class="csum"><span class="cs-medal ${v.chave}">${I(medalha)}</span><h2>${v.titulo}</h2><p class="csub">${esc(d.title)} · ${SC.NIVEIS[sc.nivel - 1].nome} · ${n} de ${total}</p>
      <ul class="mlist open">${d.objetivos.map((o) => `<li class="${sc.done.has(o.id) ? 'ok' : ''}">${marca(sc.done.has(o.id))} ${esc(o.texto)}</li>`).join('')}</ul>
      <div class="creport">${md(relatorio)}</div>
      <div class="cs-acoes"><button class="btn primary" id="csagain">${I('rotate-clockwise')} Repetir a missão</button><button class="btn" id="csclose">Voltar aos cenários</button></div></div>`;
    document.body.appendChild(el); document.body.classList.add('incall');
    const fechar = () => { el.remove(); document.body.classList.remove('incall'); };
    el.querySelector('#csclose').onclick = fechar;
    el.querySelector('#csagain').onclick = () => { fechar(); openBriefing(d, SC.nivelSugerido(d, S.get().scenarios)); };
  }

  if (tutorView === 'chat') ensureOpening();
  draw();
  setCleanup(() => { leaving = true; if (callEnd) callEnd(false); if (ctrl) ctrl.abort(); if (rec) rec.stop(); saveChats(chats); });
}
