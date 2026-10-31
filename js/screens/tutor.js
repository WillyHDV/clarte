// Professora Clara: conversa em texto, prova oral simulada, dúvidas e ligação por voz.
import { speakScore, itemLabel } from '../exercises.js';
import * as V from '../speech.js';
import { stopSpeaking, listen, canListen } from '../speech.js';
import * as S from '../store.js';
import * as T from '../tutor.js';
import { esc, I, toast } from '../ui.js';
import { $app, st, rate, speak, setCleanup, cur, provOptions, loadChats, saveChats } from '../core.js';
import { readiness, CRITERIA, planDone } from '../progress.js';
import { ACC } from './practice.js';

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

export function openTutor(arg) { if (arg === 'exam' || arg === 'free') tutorMode = arg; return tutorPage(); }

async function tutorPage() {
  const chats = loadChats(); let busy = false; let ctrl = null; let rec = null; let callEnd = null;
  const labels = { free: '💬 Conversa', exam: '🎓 Prova oral', duvidas: '❓ Dúvidas' };
  if (!cur().key) {
    const c = cur();
    $app.innerHTML = `<header class="top"><h1>👩‍🏫 Professora Clara</h1></header>
      <div class="card"><p>A professora Clara usa uma IA com <b>plano gratuito, sem cartão</b>. Você só precisa de uma chave (um código), que fica salva só neste aparelho.</p>
      <label>Provedor<select id="prov" class="inp">${provOptions(c.p)}</select></label>
      <p id="how" class="pt">${esc(c.def.how)}</p>
      <input id="key" class="inp" type="password" placeholder="${esc(c.def.keyHint)}" autocomplete="off"><button class="btn primary wide" id="savekey">Salvar chave</button></div>`;
    document.getElementById('prov').onchange = (e) => { S.setSetting('provider', e.target.value); tutorPage(); };
    document.getElementById('savekey').onclick = () => { const v = document.getElementById('key').value.trim(); if (v) { S.setKey(c.p, v); tutorPage(); } };
    return;
  }
  const getMsgs = () => (chats[tutorMode] ||= []);
  const apiMsgs = () => [{ role: 'user', content: tutorMode === 'exam' ? "[DÉBUT DE L'EXAMEN]" : '(début de la session)' }, ...getMsgs().filter((m) => !m.hidden).map((m) => ({ role: m.role, content: m.api || m.content }))];
  const split = (t) => { const i = t.search(/\n\s*---\s*\n?/); return i < 0 ? [t.trim(), ''] : [t.slice(0, i).trim(), t.slice(i).replace(/^\s*---\s*/, '').trim()]; };
  const md = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  const speakable = (t) => tutorMode !== 'duvidas' && !/Nota geral/i.test(t);

  function drawMsg(m) {
    const [fr, corr] = m.role === 'assistant' ? split(m.content) : [m.content, ''];
    return `<div class="msg ${m.role}"><div class="bub">${md(fr)}${m.role === 'assistant' && speakable(m.content) ? `<button class="say sm" data-say="${esc(fr)}">🔊</button>` : ''}</div>${corr ? `<div class="corr">${md(corr)}</div>` : ''}</div>`;
  }
  function sumCard(msgs) {
    const x = chats.sum; if (!x || x.mode !== tutorMode || x.n !== msgs.length) return '';
    const rep = x.repeats.length ? `<p>Frases que você repetiu: ${x.repeats.map((r) => `<span>${r.ok ? '✅' : '🔁'} ${esc(r.t)}</span>`).join(' · ')}</p>${x.repeats.some((r) => !r.ok) ? '<small>As frases com 🔁 foram para o Reforço, para você repetir de novo depois.</small>' : ''}` : '';
    const notes = x.notes.length ? `<small>Correções da Clara:</small><ul>${x.notes.map((n) => `<li>${md(n)}</li>`).join('')}</ul>` : '<small>A Clara não precisou corrigir nada. Muito bem!</small>';
    return `<div class="card sumcard"><h3>Resumo da ligação</h3><p>Você falou <b>${x.turns} ${x.turns > 1 ? 'vezes' : 'vez'}</b>.</p>${rep}${notes}</div>`;
  }
  function draw() {
    const msgs = getMsgs();
    $app.innerHTML = `
      <header class="top"><div class="avatar-s">C</div><h1>Professora Clara</h1><button class="icon" id="newc" title="Nova conversa" aria-label="Nova conversa">${I('trash')}</button></header>
      <div class="seg">${Object.entries(labels).map(([k, v]) => `<button data-m="${k}" class="${k === tutorMode ? 'on' : ''}">${v}</button>`).join('')}</div>
      ${tutorMode !== 'duvidas' ? (canListen ? `<button class="btn primary wide callbtn" id="callbtn">${I('phone')} Conversar por voz com a Clara</button>` : '<div class="pt">A conversa por voz precisa do Chrome (ou Edge).</div>') : ''}
      <div class="chat" id="chat">${msgs.filter((m) => !m.hidden).map(drawMsg).join('')}${sumCard(msgs)}${tutorMode === 'exam' && !msgs.length ? `<div class="card center"><p>Simulação da <b>avaliação oral</b>: a professora Clara faz perguntas por voz ou texto, sem corrigir durante a prova. No fim, você recebe a nota nos 6 critérios.</p><button class="btn primary" id="startexam">Começar a prova</button></div>` : ''}</div>
      <div class="composer ${tutorMode === 'exam' && !msgs.length ? 'hide' : ''}">
        ${tutorMode === 'exam' && msgs.length ? '<button class="btn warn sm" id="endexam">Terminar e avaliar</button>' : ''}
        <div class="inrow">
          ${canListen ? '<button class="micb" id="tmic">🎤</button>' : ''}
          <input id="tin" class="inp" aria-label="Mensagem para a Clara" placeholder="${tutorMode === 'duvidas' ? 'Pergunte em português…' : 'Écris en français…'}" autocomplete="off" autocapitalize="off" spellcheck="false">
          <button class="send" id="tsend">➤</button>
        </div>
        <div class="acc">${ACC.map((a) => `<button type="button" data-ins="${a}">${a}</button>`).join('')}</div>
      </div>`;
    const chat = document.getElementById('chat'); chat.scrollTop = chat.scrollHeight;
    document.querySelectorAll('.seg [data-m]').forEach((b) => { b.onclick = () => { if (busy) return; tutorMode = b.dataset.m; ensureOpening(); draw(); }; });
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
      rec = listen({ onInterim: (t) => { tin.value = t; }, onFinal: (t) => { tm.classList.remove('on'); rec = null; if (t) submit(t); }, onError: (er) => { tm.classList.remove('on'); rec = null; tin.placeholder = er === 'not-allowed' ? 'Permita o microfone no navegador' : 'Não ouvi nada, tente de novo'; } });
    };
  }
  function ensureOpening() {
    if (tutorMode !== 'exam' && !getMsgs().length) { chats[tutorMode] = [{ role: 'assistant', content: T.opening[tutorMode] }]; saveChats(chats); }
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
      const c = document.getElementById('chat'); c.insertAdjacentHTML('beforeend', `<div class="err">⚠️ ${esc(T.friendlyError(e))}</div>`); c.scrollTop = c.scrollHeight;
    }
  }
  // ---------- conversa por voz: a Clara fala, você grava a resposta e toca em Enviar ----------
  function startCall() {
    if (busy || callEnd) return;
    const isExam = tutorMode === 'exam'; const mode = isExam ? 'examVoice' : 'voice';
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let alive = true; let paused = false; let phase = 'think'; let target = ''; let cr = null; let listenId = 0; let blocked = false;
    let speaker = null; let abortCtl = null; let wake = null; let evalMode = false; let hideText = false;
    let recorder = null; let lastClip = null; let autoStop = null; let tries = 0;
    const stats = { turns: 0, repeats: [], notes: [] }; // alimenta o resumo ao encerrar a ligação
    const el = document.createElement('div'); el.className = 'call';
    el.innerHTML = `
      <div class="call-glow"></div>
      <header class="call-top">
        <button class="cbtn ghost" id="cend" aria-label="Encerrar">${I('x')}</button>
        <div class="call-who"><b>Clara</b><small id="cstatus">Conectando…</small></div>
        <button class="cbtn ghost" id="chide" aria-label="Esconder o texto">${I('eye')}</button>
      </header>
      <section class="stage">
        <div class="orb" id="cav" data-state="think"><i class="o1"></i><i class="o2"></i><i class="o3"></i></div>
        <p class="clara" id="cclara"></p>
        <div class="ctarget" id="ctarget" hidden></div>
        <div class="cnote" id="cnote" hidden></div>
        <p class="you" id="cyou"></p>
        <div class="call-err" id="cerr" hidden></div>
      </section>
      <footer class="call-bar">
        <div class="call-chips">
          <button class="chip" data-q="rep">Répétez, s'il vous plaît</button>
          <button class="chip" data-q="Je ne comprends pas.">Je ne comprends pas</button>
          <button class="chip" data-q="Je ne sais pas.">Je ne sais pas</button>
        </div>
        <div class="ctl">
          <button class="cbtn" id="cslow" aria-label="Falar mais devagar"></button>
          <button class="cbig" id="cmic" aria-label="Falar"></button>
          <button class="cbtn" id="cpause" aria-label="Pausar"></button>
        </div>
        <div class="ctl2"><button class="pill" id="credo" hidden>${I('redo')} Refazer</button>${isExam ? `<button class="pill warn" id="cfin">${I('check')} Terminar e avaliar</button>` : ''}</div>
      </footer>`;
    document.body.appendChild(el); document.body.classList.add('incall');
    const $ = (id) => el.querySelector('#' + id);
    const recOk = () => V.canRecord && st().settings.micMode !== 'web' && !!T.transcribeProvider(st().settings);
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
        fail(T.friendlyError(e), () => transcribeClip(lastClip), { label: 'Usar o reconhecimento do navegador', fn: () => { S.setSetting('micMode', 'web'); toast('Usando o reconhecimento de voz do navegador.'); listenTurn(); } });
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
      const m = { role: 'user', content: t };
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
      $('cyou').textContent = `“${t}”`; clara();
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
            ({ text } = await T.chat({ provider: c.p, apiKey: c.key, model: c.model, mode, messages: apiMsgs(), signal: abortCtl.signal, context: isExam ? '' : weakContext(),
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
        const p = parts(text); const isEval = evalMode || /Nota geral/i.test(text);
        if (p.note && !isEval) stats.notes.push(p.note);
        if (isEval) { sp.stop(); planDone('exam'); recordExam(text); finish(true); return; }
        show(p.spoken, p.note, p.target); target = p.target; flush(p.spoken, true);
        if (!began) setPhase('speak', 'Clara está falando…');
        await sp.done();
        if (!alive || paused || sp !== speaker) return;
        if (sp.fallback) toast('Voz natural indisponível; usando a voz do aparelho.');
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
      document.removeEventListener('keydown', onKey); el.remove(); document.body.classList.remove('incall'); callEnd = null;
      // resumo da ligação (conversa livre com pelo menos 2 falas suas); aparece no chat até a conversa continuar
      if (!isExam && !showEval && stats.turns >= 2) chats.sum = { mode: tutorMode, n: getMsgs().length, turns: stats.turns, repeats: stats.repeats.slice(-6), notes: [...new Set(stats.notes)].slice(-4) };
      saveChats(chats); draw(); if (showEval) toast('Avaliação pronta, no chat.');
    }
    callEnd = end;
    const onKey = (e) => { if (e.key === 'Escape') end(false); };
    document.addEventListener('keydown', onKey);

    $('cend').onclick = () => end(false);
    $('chide').onclick = () => { hideText = !hideText; el.classList.toggle('hidetext', hideText); $('chide').innerHTML = I(hideText ? 'eyeoff' : 'eye'); };
    $('cslow').onclick = () => { S.setSetting('slow', !st().settings.slow); slowLabel(); };
    $('credo').onclick = () => { stopRec(); listenTurn(); };
    // frases do curso para pedir ajuda (item "régler des problèmes de communication" da prova)
    el.querySelectorAll('.call-chips [data-q]').forEach((b) => {
      b.onclick = async () => {
        if (paused || !alive || phase === 'think') return;
        const q = b.dataset.q; stopRec(); if (speaker) speaker.stop();
        if (q === 'rep') {
          const last = [...getMsgs()].reverse().find((x) => x.role === 'assistant'); if (!last) return;
          const p = parts(last.content); setPhase('speak', 'Clara repete devagar…');
          speaker = V.createSpeaker(() => 0.65); const sp = speaker; p.spoken.split(/(?<=[.!?…])\s+/).forEach((s) => sp.push(s.replace(/[*_`#]/g, '')));
          await sp.done(); if (alive && !paused && sp === speaker) { await sleep(250); listenTurn(); } return;
        }
        userSaid(q, true);
      };
    });
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
    const fin = $('cfin');
    if (fin) fin.onclick = () => {
      if (!confirm('Terminar a prova e receber a avaliação?')) return;
      evalMode = true; stopRec(); if (speaker) speaker.stop(); getMsgs().push({ role: 'user', content: '[FIN]' }); saveChats(chats); clara();
    };

    (async () => {
      try { if (navigator.wakeLock) wake = await navigator.wakeLock.request('screen'); } catch (e) { /* sem wake lock */ }
      setPhase('think', 'Conectando…');
      const m = lastMsg();
      if (!m || m.role === 'user') clara();
      else if (/Nota geral/i.test(m.content)) { setPhase('idle', 'Esta prova já foi avaliada. Apague a conversa para recomeçar.'); }
      else sayLast();
    })();
  }

  ensureOpening(); draw();
  setCleanup(() => { if (callEnd) callEnd(false); if (ctrl) ctrl.abort(); if (rec) rec.stop(); saveChats(chats); });
}
