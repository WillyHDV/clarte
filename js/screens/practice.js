// Treino: sessão de exercícios (escolha, digitação, peças, fala) com correção e resultado.
import { UNITS } from '../data.js';
import { buildSession, check, shuffle, skillsFor } from '../exercises.js';
import { listen, canListen, prefetch } from '../speech.js';
import * as S from '../store.js';
import { esc, I } from '../ui.js';
import { $app, st, rate, speak, setCleanup } from '../core.js';
import { strengthOf, unitMastery, STEPS, nextStep, planDone, markFocus } from '../progress.js';

// ---------- prática ----------
export const ACC = ['é', 'è', 'ê', 'ë', 'à', 'â', 'î', 'ï', 'ô', 'û', 'ù', 'ç', 'œ', '’'];
export function practice(id, stepId) {
  const review = id === 'review'; const speakDrill = id === 'speakdrill'; const cfg = stepId ? STEPS.find((s) => s.id === stepId) : null;
  // treino adaptativo: escolhe os exercícios cujos itens estão mais fracos (ou ainda não vistos)
  const scope = (review || id === 'mix' || speakDrill) ? UNITS.map((u) => u.id) : [id];
  const avgPct = () => Math.round(scope.reduce((a, u) => a + unitMastery(u).pct, 0) / scope.length);
  const before = avgPct();
  let list;
  if (review) {
    // revisão = frases mal repetidas + itens já vistos que estão enfraquecendo
    const mis = shuffle(S.dueMistakes()).slice(0, 4);
    const weakSeen = (iid) => { const s = S.strength(iid); return s === null ? 1 : s; };
    const adapt = buildSession('mix', 24, weakSeen).filter((ex) => ex.items.some((iid) => { const s = S.strength(iid); return s !== null && s < 0.7; })).slice(0, 10 - mis.length);
    list = [...mis, ...adapt];
  } else if (speakDrill) list = buildSession('mix', 5, strengthOf, { kinds: ['speak'] });
  else if (cfg) list = buildSession(id, cfg.n, strengthOf, cfg.kinds ? { kinds: cfg.kinds } : {});
  else list = buildSession(id, 10, strengthOf);
  if (!list.length) { $app.innerHTML = `<header class="top"><button class="back" data-go="#/" aria-label="Voltar">${I('back')}</button><h1>Reforço</h1></header><div class="card center"><p>🎉 Nenhum item fraco agora. Faça um treino inteligente para avançar.</p><button class="btn primary" data-go="#/practice/mix">⚡ Treino inteligente</button> <button class="btn" data-go="#/">Voltar</button></div>`; return; }
  const total = list.length; let i = 0; let correct = 0; let attempted = 0; const wrongList = [];
  let ex; let sel; let placed; let bank; let heard = ''; let rec = null; let answered = false;

  function showEnd() {
    S.recordSession(review ? 'review' : id, correct, Math.max(attempted, 1));
    const pct = Math.round((100 * correct) / Math.max(attempted, 1));
    // degrau da trilha: guarda o resultado e libera o próximo se passou
    let stepMsg = ''; let nextBtn = '';
    if (attempted > 0) {
      if (review) planDone('review'); else if (speakDrill) planDone('speak');
    }
    if (cfg && attempted > 0) {
      const passed = pct >= cfg.pass; S.recordStep(id, cfg.id, pct, passed); markFocus(id, cfg.id);
      const u = UNITS.find((x) => x.id === id); const nx = nextStep(id);
      if (passed && cfg.id === 'test') {
        const nu = UNITS[UNITS.indexOf(u) + 1];
        stepMsg = `<div class="passbox ok">🏁 <b>Unidade concluída!</b> ${esc(u.title)} está completa.</div>`;
        nextBtn = nu ? `<button class="btn primary" data-go="#/unit/${nu.id}">Próxima unidade: ${esc(nu.title)} ▶</button>` : '<button class="btn primary" data-go="#/practice/mix">⚡ Treino inteligente</button>';
      } else if (passed) {
        stepMsg = `<div class="passbox ok">✅ <b>${esc(cfg.title)}</b> concluído (${pct}% — precisa de ${cfg.pass}%).</div>`;
        nextBtn = nx ? `<button class="btn primary" data-go="${nx.id === 'learn' ? '#/unit/' + id : '#/step/' + id + '/' + nx.id}">Próximo: ${esc(nx.title)} ▶</button>` : '';
      } else {
        stepMsg = `<div class="passbox no">Quase! Para concluir <b>${esc(cfg.title)}</b> são ${cfg.pass}% e você fez ${pct}%. Os itens que errou voltam a aparecer.</div>`;
      }
    }
    const again = cfg ? `#/step/${id}/${cfg.id}` : `#/practice/${id}`;
    $app.innerHTML = `
      <div class="end card center"><div class="big">${pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</div>
      <h2>${correct}/${attempted} corretas · ${pct}%</h2>
      ${stepMsg}
      <p>+${correct * 10 + (correct === attempted ? 20 : 0)} ⭐ ${wrongList.length ? `· ${wrongList.length} erro(s) vão voltar no reforço` : ''}</p>
      <p class="dom">Domínio ${scope.length > 1 ? 'geral' : 'da unidade'}: <b>${before}% → ${avgPct()}%</b> ${avgPct() > before ? '▲' : avgPct() < before ? '▼' : ''}</p>
      <div class="row">${nextBtn}<button class="btn ${nextBtn ? '' : 'primary'}" data-go="${again}" id="again">${cfg ? 'Tentar de novo' : 'Novamente'}</button>
      ${S.dueMistakes().length && !cfg ? '<button class="btn warn" data-go="#/practice/review">🔁 Revisar erros</button>' : ''}</div>
      <button class="btn" data-go="${cfg ? '#/unit/' + id : '#/'}">${cfg ? 'Voltar à unidade' : 'Voltar ao início'}</button></div>`;
  }

  function render() {
    if (i >= list.length) return showEnd();
    ex = list[i]; sel = null; heard = ''; answered = false; rec = null;
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
      <div class="ptop"><button class="x" data-go="#/" aria-label="Sair">${I('x')}</button><div class="bar"><i style="width:${(100 * Math.min(i, total)) / list.length}%"></i></div></div>
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
    if (ex.kind === 'speak' && !canListen) { answered = true; return feedback({ ok: true }, true); }
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
      S.recordItems(ex.items, r.ok, ex.kind);
      skillsFor(ex, r).forEach(([k, v]) => S.recordSkill(k, v));
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
  setCleanup(() => { document.removeEventListener('keydown', onKey); if (rec) rec.stop(); });
  render();
}
