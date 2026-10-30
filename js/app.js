import { EXAM_DATE, UNITS, LESSONS, LETTERS, ACCENTS, PHRASES, VERBS, PRONOUNS, JOBS } from './data.js';
import { buildSession, check, shuffle } from './exercises.js';
import { speak as rawSpeak, stopSpeaking, listen, canListen, canSpeak, prefetch, engineInfo, frenchVoiceName } from './speech.js';
import * as V from './speech.js';
import * as S from './store.js';
import * as T from './tutor.js';

const $app = document.getElementById('app');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const st = () => S.get();
const rate = () => (st().settings.slow ? 0.7 : 0.9);
let lastToast = '';
function toast(msg) {
  if (msg === lastToast) return; lastToast = msg;
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => { t.remove(); }, 6000);
}
async function speak(text, opts) { await rawSpeak(text, opts); if (V.voiceNote) toast(V.voiceNote); }
let cleanup = null; // função chamada ao sair da tela atual

// ---------- roteador ----------
function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
async function route() {
  // link de configuração: #/setup/<provedor>/<chave> salva a chave neste aparelho e some da barra de endereço
  const setup = (location.hash || '').match(/^#\/setup\/(\w+)\/(.+)$/);
  if (setup && setup[1] in T.PROVIDERS) {
    S.setSetting('provider', setup[1]); S.setKey(setup[1], decodeURIComponent(setup[2]).trim());
    history.replaceState(null, '', location.pathname + location.search + '#/tutor');
    toast('Chave salva neste aparelho ✅');
  }
  if (cleanup) { try { cleanup(); } catch (e) { /* ignore */ } cleanup = null; }
  stopSpeaking();
  const [, page, arg] = (location.hash || '#/').slice(1).split('/');
  document.querySelectorAll('nav.tabs a').forEach((a) => a.classList.toggle('on', a.dataset.p === (page || 'home') || (a.dataset.p === 'home' && ['unit', 'practice'].includes(page))));
  $app.scrollTo?.(0, 0); window.scrollTo(0, 0);
  document.body.classList.toggle('focus', page === 'practice');
  if (page === 'unit') return unitPage(arg);
  if (page === 'practice') return practice(arg);
  if (page === 'tutor') return tutorPage();
  if (page === 'settings') return settingsPage();
  return home();
}
window.addEventListener('hashchange', route);

// ---------- delegação: botões de áudio ----------
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-say]');
  if (b) { b.classList.add('playing'); speak(b.dataset.say, { rate: rate() }).then(() => b.classList.remove('playing')); }
});

// ---------- home ----------
function daysToExam() { return Math.ceil((new Date(EXAM_DATE + 'T08:00:00') - new Date()) / 86400000); }
function home() {
  S.touchDay(); S.save();
  const s = st(); const d = daysToExam(); const due = S.dueMistakes().length;
  const goal = s.settings.goal; const pct = Math.min(100, Math.round((100 * s.today.n) / goal));
  const examTxt = d > 1 ? `Évaluation 1 em <b>${d} dias</b> (04/11)` : d === 1 ? 'Évaluation 1 é <b>amanhã</b>!' : d === 0 ? '<b>Hoje</b> é a Évaluation 1. Bonne chance !' : 'Évaluation 1 já passou. Próxima: 02/12 (Évaluation 2)';
  $app.innerHTML = `
    <header class="top"><div><div class="brand">Clarté</div><h1>Salut, Willy ! 👋</h1></div><div class="stats"><span title="Dias seguidos">🔥 ${s.streak}</span><span title="Pontos">⭐ ${s.xp}</span></div></header>
    <section class="card hero">
      <div>${examTxt}</div>
      <div class="goal"><div class="bar"><i style="width:${pct}%"></i></div><small>Meta de hoje: ${Math.min(s.today.n, goal)}/${goal} exercícios</small></div>
      <div class="row">
        <button class="btn primary" data-go="#/practice/mix">⚡ Simulado misto</button>
        <button class="btn" data-go="#/tutor">🎓 Prova oral com IA</button>
      </div>
      ${due ? `<button class="btn warn wide" data-go="#/practice/review">🔁 Revisar ${due} erro${due > 1 ? 's' : ''}</button>` : ''}
    </section>
    <h2>Trilha da avaliação</h2>
    <div class="units">${UNITS.map((u) => {
      const p = s.units[u.id]; const best = p ? p.best : 0;
      return `<button class="unit" data-go="#/unit/${u.id}"><span class="ic">${u.icon}</span><span class="tx"><b>${u.n}. ${esc(u.title)}</b><small>${esc(u.sub)}</small><span class="bar"><i style="width:${best}%"></i></span></span><span class="sc">${p ? best + '%' : ''}</span></button>`;
    }).join('')}</div>`;
}
document.addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) go(g.dataset.go); });

// ---------- lição ----------
const vowel = (w) => /^[aeiouyhàâäéèêëîïôöùûüœ]/i.test(w);
function verbTables() {
  return '<div class="verbs">' + Object.entries(VERBS).map(([inf, v]) => `
    <div class="vt"><h4>${esc(inf)} <small>${esc(v.pt)}</small></h4><table>${v.forms.map((f, i) => {
      const p = PRONOUNS[i]; let txt;
      if (i === 0) txt = vowel(f) ? `j'${f}` : `je ${f}`; else txt = `${p} ${f}`;
      const say = i === 2 ? `il ${f}` : i === 5 ? `ils ${f}` : txt;
      return `<tr><td><button class="say sm" data-say="${esc(say)}">🔊</button></td><td>${esc(txt)}</td></tr>`;
    }).join('')}</table></div>`).join('') + '</div>';
}
function renderLesson(html) {
  return html.replace(/\{\{(.+?)\}\}/g, (_, t) => {
    if (t === 'letters') return Object.entries(LETTERS).map(([l, n]) => `<button class="letter" data-say="${esc(n)}">${l}<small>${esc(n)}</small></button>`).join('');
    if (t === 'accents') return ACCENTS.map((a) => `<button class="chip say" data-say="${esc(a.name)}">${a.c} <small>${a.name}</small></button>`).join('');
    if (t === 'verbtables') return verbTables();
    if (t === 'jobrows') return JOBS.map((j) => `<tr><td>${j.m}</td><td>${j.f}</td><td>${j.pt}</td></tr>`).join('');
    if (t.startsWith('phrases:')) return PHRASES[t.slice(8)].map((p) => `<li><button class="say" data-say="${esc(p.fr)}">🔊 ${esc(p.fr)}</button><span class="pt">${esc(p.pt)}</span></li>`).join('');
    if (t.startsWith('say:')) { const [txt, label] = t.slice(4).split('|'); return `<button class="say" data-say="${esc(txt)}">🔊 ${esc(label || txt)}</button>`; }
    return '';
  });
}
function unitPage(id) {
  const u = UNITS.find((x) => x.id === id); if (!u) return go('#/');
  $app.innerHTML = `
    <header class="top"><button class="back" data-go="#/">‹</button><h1>${u.icon} ${esc(u.title)}</h1></header>
    <article class="lesson card">${renderLesson(LESSONS[id])}</article>
    <div class="dock"><button class="btn primary wide" data-go="#/practice/${id}">Praticar · 10 exercícios</button></div>`;
}

// ---------- prática ----------
const ACC = ['é', 'è', 'ê', 'ë', 'à', 'â', 'î', 'ï', 'ô', 'û', 'ù', 'ç', 'œ', '’'];
function practice(id) {
  const review = id === 'review';
  let list = review ? shuffle(S.dueMistakes()).slice(0, 10) : buildSession(id, 10);
  if (!list.length) { $app.innerHTML = `<header class="top"><button class="back" data-go="#/">‹</button><h1>Revisão</h1></header><div class="card center"><p>🎉 Nenhum erro pendente agora.</p><button class="btn primary" data-go="#/">Voltar</button></div>`; return; }
  const total = list.length; let i = 0; let correct = 0; let attempted = 0; let wrongList = [];
  let ex; let sel; let placed; let bank; let heard = ''; let rec = null; let answered = false; let skipped = false;

  function showEnd() {
    S.recordSession(review ? 'review' : id, correct, Math.max(attempted, 1));
    const pct = Math.round((100 * correct) / Math.max(attempted, 1));
    $app.innerHTML = `
      <div class="end card center"><div class="big">${pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</div>
      <h2>${correct}/${attempted} corretas · ${pct}%</h2>
      <p>+${correct * 10 + (correct === attempted ? 20 : 0)} ⭐ ${wrongList.length ? `· ${wrongList.length} erro(s) foram para a revisão` : ''}</p>
      <div class="row"><button class="btn primary" data-go="#/practice/${id}" id="again">Novamente</button>
      ${S.dueMistakes().length ? '<button class="btn warn" data-go="#/practice/review">🔁 Revisar erros</button>' : ''}</div>
      <button class="btn" data-go="#/">Voltar ao início</button></div>`;
  }

  function render() {
    if (i >= list.length) return showEnd();
    ex = list[i]; sel = null; heard = ''; answered = false; skipped = false; rec = null;
    const k = ex.kind; const listen = k.startsWith('listen');
    placed = []; bank = k === 'tiles' ? ex.tiles.map((t, n) => ({ t, n })) : [];
    let body = '';
    const audioBtn = ex.audio ? `<div class="audio"><button class="say big" data-say="${esc(ex.audio)}" id="play">🔊</button><button class="say" data-slow="1" title="Devagar">🐢</button></div>` : '';
    if (k === 'choice' || k === 'listen-choice') {
      body = `<div class="opts">${ex.options.map((o, n) => `<button class="opt" data-o="${n}">${esc(o)}</button>`).join('')}</div>`;
    } else if (k === 'type' || k === 'listen-type') {
      body = `<input id="inp" class="inp" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Digite em francês…"><div class="acc">${ACC.map((a) => `<button type="button" data-ins="${a}">${a}</button>`).join('')}</div>`;
    } else if (k === 'tiles') {
      body = `<div class="place" id="place"></div><div class="bank" id="bank"></div>`;
    } else if (k === 'speak') {
      body = `<div class="speakbox"><div class="target">${esc(ex.shown || ex.answer)}</div>
        ${canListen ? `<button class="mic" id="mic">🎤</button><div class="heard" id="heard">Toque no microfone e fale.</div>` : `<div class="heard">Seu navegador não reconhece voz (use o Chrome). Leia em voz alta e toque em "Pular".</div>`}</div>`;
    }
    $app.innerHTML = `
      <div class="ptop"><button class="x" data-go="#/">✕</button><div class="bar"><i style="width:${(100 * Math.min(i, total)) / list.length}%"></i></div></div>
      <div class="qcard">
        <div class="q">${ex.q}${ex.sub ? `<small class="sub">${esc(ex.sub)}</small>` : ''}</div>
        ${audioBtn}${body}
      </div>
      <div class="fb" id="fb"></div>
      <div class="dock"><button class="btn primary wide" id="ok" ${k === 'speak' && !canListen ? '' : 'disabled'}>${k === 'speak' && !canListen ? 'Pular' : 'Verificar'}</button></div>`;
    wire();
    if (listen && ex.audio && st().settings.voice !== false) setTimeout(() => speak(ex.audio, { rate: rate() }), 250);
    if (k === 'tiles') drawTiles();
    if (k === 'type' || k === 'listen-type') document.getElementById('inp').focus();
    const nxt = list[i + 1]; if (nxt && nxt.audio) prefetch(nxt.audio);
  }

  function drawTiles() {
    const place = document.getElementById('place'); const bk = document.getElementById('bank');
    place.innerHTML = placed.map((t, n) => `<button class="tile" data-p="${n}">${esc(t.t)}</button>`).join('') || '<span class="hint">Toque nas palavras abaixo</span>';
    bk.innerHTML = bank.filter((t) => !placed.includes(t)).map((t) => `<button class="tile" data-b="${t.n}">${esc(t.t)}</button>`).join('');
    if (!answered) document.getElementById('ok').disabled = !placed.length;
  }

  function wire() {
    const ok = document.getElementById('ok');
    document.querySelectorAll('[data-slow]').forEach((b) => { b.onclick = () => speak(ex.audio, { rate: 0.6 }); });
    document.querySelectorAll('.opt').forEach((b) => { b.onclick = () => { if (answered) return; sel = ex.options[+b.dataset.o]; document.querySelectorAll('.opt').forEach((x) => x.classList.toggle('sel', x === b)); ok.disabled = false; if (ex.kind === 'choice' && ex.audio === sel) speak(sel, { rate: rate() }); }; });
    const inp = document.getElementById('inp');
    if (inp) {
      inp.oninput = () => { ok.disabled = !inp.value.trim(); };
      document.querySelectorAll('[data-ins]').forEach((b) => { b.onmousedown = (e) => e.preventDefault(); b.onclick = () => { const s = inp.selectionStart ?? inp.value.length; inp.value = inp.value.slice(0, s) + b.dataset.ins + inp.value.slice(inp.selectionEnd ?? s); inp.setSelectionRange(s + 1, s + 1); inp.focus(); ok.disabled = false; }; });
    }
    if (ex.kind === 'tiles') {
      document.getElementById('place').onclick = (e) => { const b = e.target.closest('[data-p]'); if (b && !answered) { placed.splice(+b.dataset.p, 1); drawTiles(); } };
      document.getElementById('bank').onclick = (e) => { const b = e.target.closest('[data-b]'); if (b && !answered) { placed.push(bank.find((t) => t.n === +b.dataset.b)); drawTiles(); } };
    }
    const mic = document.getElementById('mic');
    if (mic) mic.onclick = () => {
      if (answered) return;
      if (rec) { rec.stop(); return; }
      mic.classList.add('on'); const hd = document.getElementById('heard'); hd.textContent = 'Ouvindo…';
      rec = listen({
        onInterim: (t) => { hd.textContent = t || 'Ouvindo…'; },
        onFinal: (t) => { mic.classList.remove('on'); rec = null; heard = t; hd.textContent = t ? `“${t}”` : 'Não ouvi nada. Tente de novo.'; ok.disabled = !t; },
        onError: (er) => { mic.classList.remove('on'); rec = null; hd.textContent = er === 'not-allowed' ? 'Permita o microfone no navegador.' : er === 'no-speech' ? 'Não ouvi nada. Tente de novo.' : 'Erro no reconhecimento de voz (' + er + ').'; },
      });
    };
    ok.onclick = () => (answered ? next() : verify());
  }

  function verify() {
    if (ex.kind === 'speak' && !canListen) { skipped = true; answered = true; return feedback({ ok: true }, true); }
    let input;
    if (ex.kind === 'choice' || ex.kind === 'listen-choice') input = sel;
    else if (ex.kind === 'tiles') input = placed.map((t) => t.t);
    else if (ex.kind === 'speak') input = heard;
    else input = document.getElementById('inp').value;
    const r = check(ex, input); answered = true; if (rec) rec.stop();
    feedback(r, false);
  }

  function feedback(r, skip) {
    const fb = document.getElementById('fb'); const ok = document.getElementById('ok');
    const first = !ex._retry;
    if (!skip) {
      if (first) { attempted++; if (r.ok) correct++; else wrongList.push(ex); }
      S.noteResult(ex, r.ok, review);
      if (!r.ok && first) list.push({ ...ex, _retry: true });
    }
    document.querySelectorAll('.opt').forEach((b) => { const v = ex.options[+b.dataset.o]; b.disabled = true; if (v === ex.answer) b.classList.add('right'); else if (v === sel) b.classList.add('wrong'); });
    const answer = [].concat(ex.answer)[0];
    let extra = '';
    if (ex.kind === 'speak' && r.words) extra = `<div class="words">${r.words.map((w, n) => `<span class="${r.marks[n] ? 'g' : 'r'}">${esc(w)}</span>`).join(' ')}</div>`;
    const title = skip ? 'Pulado' : r.ok ? (r.almost ? 'Quase! Atenção aos acentos' : ['Très bien !', 'Parfait !', 'Excellent !', 'Bravo !'][Math.floor(Math.random() * 4)]) : (ex.kind === 'speak' ? 'Tente pronunciar de novo' : 'Resposta correta:');
    fb.className = 'fb show ' + (skip ? 'neutral' : r.ok && !r.almost ? 'good' : r.ok ? 'almost' : 'bad');
    fb.innerHTML = `<b>${title}</b>${!r.ok || r.almost ? `<div class="ans">${esc(answer)}</div>` : ''}${extra}${ex.explain ? `<div class="ex">${ex.explain}</div>` : ''}${ex.audio ? `<button class="say" data-say="${esc(ex.audio)}">🔊 Ouvir</button>` : ''}`;
    ok.disabled = false; ok.textContent = 'Continuar'; ok.classList.toggle('bad', !r.ok && !skip);
    if (document.getElementById('inp')) document.getElementById('inp').disabled = true;
  }

  function next() { i++; render(); }

  const onKey = (e) => { if (e.key === 'Enter') { const ok = document.getElementById('ok'); if (ok && !ok.disabled && document.activeElement?.tagName !== 'BUTTON') { e.preventDefault(); ok.click(); } } };
  document.addEventListener('keydown', onKey);
  cleanup = () => { document.removeEventListener('keydown', onKey); if (rec) rec.stop(); };
  render();
}

// ---------- professor de IA ----------
const cur = () => { const s = st().settings; const p = s.provider in T.PROVIDERS ? s.provider : 'gemini'; return { p, def: T.PROVIDERS[p], key: (s.keys || {})[p] || '', model: (s.models || {})[p] || T.PROVIDERS[p].model }; };
const provOptions = (sel) => Object.entries(T.PROVIDERS).map(([id, v]) => `<option value="${id}" ${id === sel ? 'selected' : ''}>${v.label}</option>`).join('');
const CHAT_KEY = 'fr_chat_v2';
const loadChats = () => { try { return JSON.parse(localStorage.getItem(CHAT_KEY)) || {}; } catch (e) { return {}; } };
const saveChats = (c) => { try { localStorage.setItem(CHAT_KEY, JSON.stringify(c)); } catch (e) { /* ignore */ } };
let tutorMode = 'free';

async function tutorPage() {
  const chats = loadChats(); let busy = false; let ctrl = null; let rec = null;
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
  const apiMsgs = () => [{ role: 'user', content: tutorMode === 'exam' ? "[DÉBUT DE L'EXAMEN]" : '(début de la session)' }, ...getMsgs().filter((m) => !m.hidden).map((m) => ({ role: m.role, content: m.content }))];
  const split = (t) => { const i = t.search(/\n\s*---\s*\n?/); return i < 0 ? [t.trim(), ''] : [t.slice(0, i).trim(), t.slice(i).replace(/^\s*---\s*/, '').trim()]; };
  const md = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  const speakable = (t) => tutorMode !== 'duvidas' && !/Nota geral/i.test(t);

  function drawMsg(m) {
    const [fr, corr] = m.role === 'assistant' ? split(m.content) : [m.content, ''];
    return `<div class="msg ${m.role}"><div class="bub">${md(fr)}${m.role === 'assistant' && speakable(m.content) ? `<button class="say sm" data-say="${esc(fr)}">🔊</button>` : ''}</div>${corr ? `<div class="corr">${md(corr)}</div>` : ''}</div>`;
  }
  function draw() {
    const msgs = getMsgs();
    $app.innerHTML = `
      <header class="top"><h1>👩‍🏫 Professora Clara</h1><button class="icon" id="newc" title="Nova conversa">🗑️</button></header>
      <div class="seg">${Object.entries(labels).map(([k, v]) => `<button data-m="${k}" class="${k === tutorMode ? 'on' : ''}">${v}</button>`).join('')}</div>
      <div class="chat" id="chat">${msgs.filter((m) => !m.hidden).map(drawMsg).join('')}${tutorMode === 'exam' && !msgs.length ? `<div class="card center"><p>Simulação da <b>avaliação oral</b>: a professora Clara faz perguntas por voz ou texto, sem corrigir durante a prova. No fim, você recebe a nota nos 6 critérios.</p><button class="btn primary" id="startexam">Começar a prova</button></div>` : ''}</div>
      <div class="composer ${tutorMode === 'exam' && !msgs.length ? 'hide' : ''}">
        ${tutorMode === 'exam' && msgs.length ? '<button class="btn warn sm" id="endexam">Terminar e avaliar</button>' : ''}
        <div class="inrow">
          ${canListen ? '<button class="micb" id="tmic">🎤</button>' : ''}
          <input id="tin" class="inp" placeholder="${tutorMode === 'duvidas' ? 'Pergunte em português…' : 'Écris en français…'}" autocomplete="off" autocapitalize="off" spellcheck="false">
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
      const { text } = await T.chat({ provider: c.p, apiKey: c.key, model: c.model, mode: tutorMode, messages: apiMsgs(), signal: ctrl.signal, onText: (d) => { acc += d; const live = document.getElementById('live'); if (live) { live.querySelector('.bub').innerHTML = md(split(acc)[0]); chat.scrollTop = chat.scrollHeight; } } });
      getMsgs().push({ role: 'assistant', content: text }); saveChats(chats);
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
  ensureOpening(); draw();
  cleanup = () => { if (ctrl) ctrl.abort(); if (rec) rec.stop(); saveChats(chats); };
}

// ---------- ajustes ----------
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });
function settingsPage() {
  const s = st().settings; const c = cur();
  $app.innerHTML = `
    <header class="top"><h1>Ajustes</h1></header>
    <section class="card"><h3>Professora Clara (IA, plano gratuito)</h3>
      <label>Provedor<select id="sprov" class="inp">${provOptions(c.p)}</select></label>
      <p class="pt">${esc(c.def.how)}</p>
      <label>Chave (fica só neste aparelho)<input id="skey" class="inp" type="password" value="${esc(c.key)}" placeholder="${esc(c.def.keyHint)}" autocomplete="off"></label>
      <label>Modelo<input id="smodel" class="inp" list="mlist" value="${esc(c.model)}" autocomplete="off" spellcheck="false"><datalist id="mlist"></datalist></label>
      <button class="btn sm" id="sload">↻ Carregar modelos disponíveis</button> <button class="btn sm" id="sdef">Usar o padrão</button>
      <div id="smsg"><small>Limites gratuitos mudam e podem barrar por alguns minutos (erro 429). Planos gratuitos podem usar suas conversas para melhorar os modelos — não escreva dados pessoais sensíveis.</small></div>
    </section>
    <section class="card"><h3>Usar em outro aparelho</h3>
      <small>Gera um link que salva a chave sozinho (sem digitar). Cole o endereço do app publicado, copie o link e mande para você mesmo (ex.: WhatsApp). Não compartilhe esse link com ninguém: quem abrir recebe a sua chave.</small>
      <label>Endereço do app<input id="sbase" class="inp" value="${esc(/^(localhost|127\.)/.test(location.hostname) ? '' : location.origin + location.pathname)}" placeholder="https://seu-site.netlify.app/" autocomplete="off" spellcheck="false"></label>
      <button class="btn" id="slink">🔗 Copiar link de configuração</button><div id="slmsg"></div>
    </section>
    <section class="card"><h3>Voz</h3>
      <label class="chk"><input type="checkbox" id="svoice" ${s.voice !== false ? 'checked' : ''}> Ler as respostas do professor em voz alta</label>
      <label class="chk"><input type="checkbox" id="sslow" ${s.slow ? 'checked' : ''}> Voz mais devagar</label>
      <label>Voz do professor<select id="sengine" class="inp">
        <option value="auto" ${(s.voiceEngine || 'auto') === 'auto' ? 'selected' : ''}>Automática (recomendado)</option>
        <option value="browser" ${s.voiceEngine === 'browser' ? 'selected' : ''}>Voz do aparelho</option>
        <option value="gemini" ${s.voiceEngine === 'gemini' ? 'selected' : ''}>Voz natural online (Gemini)</option></select></label>
      <button class="btn" id="stest">🔊 Testar voz</button>
      <div id="vstatus"></div>
      <small>${canListen ? '' : 'Reconhecimento de fala indisponível: use o Chrome ou o Edge.'}</small>
    </section>
    <section class="card"><h3>Meta diária</h3><label>Exercícios por dia<input id="sgoal" class="inp" type="number" min="5" max="100" value="${s.goal}"></label></section>
    <section class="card"><h3>App</h3>
      ${deferredInstall ? '<button class="btn primary wide" id="sinstall">📲 Instalar no aparelho</button>' : '<small>No Android: menu ⋮ do Chrome → “Instalar app”.</small>'}
      <button class="btn danger" id="sreset">Zerar progresso</button>
    </section>`;
  const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
  on('sprov', 'change', (e) => { S.setSetting('provider', e.target.value); settingsPage(); });
  on('skey', 'change', (e) => S.setKey(c.p, e.target.value.trim()));
  on('smodel', 'change', (e) => S.setModel(c.p, e.target.value.trim() || c.def.model));
  on('slink', 'click', async () => {
    const msg = document.getElementById('slmsg'); let base = document.getElementById('sbase').value.trim();
    const key = (cur().key || '').trim();
    if (!key) { msg.innerHTML = '<small>Salve primeiro a chave do provedor atual.</small>'; return; }
    if (!/^https:\/\/.+/.test(base)) { msg.innerHTML = '<small style="color:var(--bad)">Cole o endereço https:// do app publicado.</small>'; return; }
    base = base.split('#')[0].replace(/\/?$/, '/');
    const link = `${base}#/setup/${cur().p}/${encodeURIComponent(key)}`;
    try { await navigator.clipboard.writeText(link); msg.innerHTML = '<small>✅ Link copiado. Abra-o no outro aparelho uma vez.</small>'; }
    catch (e) { msg.innerHTML = '<small>Não consegui copiar automaticamente. Selecione e copie:</small><input class="inp" readonly value="' + esc(link) + '" onfocus="this.select()">'; }
  });
  on('sdef', 'click', () => { S.setModel(c.p, c.def.model); settingsPage(); });
  on('sload', 'click', async () => {
    const msg = document.getElementById('smsg'); const key = document.getElementById('skey').value.trim();
    if (!key) { msg.innerHTML = '<small>Cole a chave primeiro.</small>'; return; }
    S.setKey(c.p, key); msg.innerHTML = '<small>Carregando…</small>';
    try {
      const list = await T.listModels(c.p, key);
      document.getElementById('mlist').innerHTML = list.map((m) => `<option value="${esc(m)}">`).join('');
      msg.innerHTML = `<small>✅ Chave válida. ${list.length} modelos: toque no campo “Modelo” para escolher.</small>`;
    } catch (e) { msg.innerHTML = `<small style="color:var(--bad)">⚠️ ${esc(T.friendlyError(e))}</small>`; }
  });
  on('svoice', 'change', (e) => S.setSetting('voice', e.target.checked));
  on('sslow', 'change', (e) => S.setSetting('slow', e.target.checked));
  on('sgoal', 'change', (e) => S.setSetting('goal', Math.max(5, +e.target.value || 20)));
  const paintVoice = () => {
    const el = document.getElementById('vstatus'); if (!el) return; const ei = engineInfo(); const hasKey = !!((st().settings.keys || {}).gemini);
    el.innerHTML = !canSpeak ? '<small>Este navegador não tem síntese de voz.</small>'
      : ei.engine === 'gemini' ? '<small>🎧 Usando a <b>voz natural do Gemini</b> (grátis). Frases novas levam 3–6 s para carregar; depois ficam guardadas no aparelho.</small>'
      : ei.hasFr ? `<small>✅ Voz francesa do aparelho: <b>${esc(frenchVoiceName())}</b>.</small>`
      : `<small style="color:var(--bad)">⚠️ Este aparelho <b>não tem voz francesa</b>: o áudio sai com sotaque brasileiro. ${hasKey ? 'Escolha “Voz natural online (Gemini)”.' : 'Opções: abrir o app no <b>Microsoft Edge</b> (PC), instalar a voz francesa no Android, ou salvar uma chave do Gemini (aba Clara) para usar a voz natural.'}</small>`;
  };
  paintVoice(); setTimeout(paintVoice, 700);
  on('sengine', 'change', (e) => { S.setSetting('voiceEngine', e.target.value); paintVoice(); });
  on('stest', 'click', () => speak('Bonjour ! Je m’appelle Clara. Comment allez-vous ?', { rate: rate() }));
  on('sinstall', 'click', async () => { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; settingsPage(); });
  on('sreset', 'click', () => { if (confirm('Apagar todo o progresso e os erros salvos?')) { S.resetAll(); try { localStorage.removeItem(CHAT_KEY); } catch (e) { /* ignore */ } settingsPage(); } });
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
route();
