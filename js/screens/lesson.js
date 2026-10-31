// Página da unidade: aula e degraus da trilha.
import { UNITS, LESSONS, LETTERS, ACCENTS, PHRASES, VERBS, PRONOUNS, JOBS, TUVOUS, PROFILES, VIDEO_TV } from '../data.js';
import { itemLabel } from '../exercises.js';
import * as S from '../store.js';
import { esc, I, toast } from '../ui.js';
import { $app, go } from '../core.js';
import { unitMastery, STEPS, activeSteps, stepDone, nextStep, stepHref, markFocus } from '../progress.js';

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
    if (t === 'tuvous') return TUVOUS.map((p) => `<tr><td><button class="say sm" data-say="${esc(p.tu)}">🔊</button> ${esc(p.tu)}</td><td><button class="say sm" data-say="${esc(p.vous)}">🔊</button> ${esc(p.vous)}</td></tr>`).join('');
    if (t === 'profiles') return PROFILES.map((p) => { const l = p.langs.length > 1 ? p.langs.slice(0, -1).join(', ') + ' et ' + p.langs[p.langs.length - 1] : p.langs[0]; const say = `Bonjour, je m'appelle ${p.name}, je suis ${p.nat}, je parle ${l}.`; return `<tr><td><button class="say sm" data-say="${esc(say)}">🔊</button> ${esc(p.name)}</td><td>${esc(p.nat)}</td><td>${esc(l)}</td></tr>`; }).join('');
    if (t === 'videotv') return VIDEO_TV.map((p) => `<li><button class="say" data-say="${esc(p.fr)}">🔊 ${esc(p.fr)}</button><span class="pt"><b>${p.reg}</b> · ${esc(p.pt)}</span></li>`).join('');
    if (t === 'jobrows') return JOBS.map((j) => `<tr><td>${j.m}</td><td>${j.f}</td><td>${j.pt}</td></tr>`).join('');
    if (t.startsWith('phrases:')) return PHRASES[t.slice(8)].map((p) => `<li><button class="say" data-say="${esc(p.fr)}">🔊 ${esc(p.fr)}</button><span class="pt">${esc(p.pt)}</span></li>`).join('');
    if (t.startsWith('say:')) { const [txt, label] = t.slice(4).split('|'); return `<button class="say" data-say="${esc(txt)}">🔊 ${esc(label || txt)}</button>`; }
    return '';
  });
}
export function unitPage(id) {
  const u = UNITS.find((x) => x.id === id); if (!u) return go('#/');
  const m = unitMastery(id); const nx = nextStep(id); const testReady = stepDone(id, 'recognize') && stepDone(id, 'write');
  const weak = m.weak.slice(0, 8).map(([iid]) => `<span class="wchip">${esc(itemLabel(iid))}</span>`).join('');
  $app.innerHTML = `
    <header class="top"><button class="back" data-go="#/" aria-label="Voltar">${I('back')}</button><h1>${esc(u.title)}</h1></header>
    <section class="card mast"><div class="mrow"><b>Seu domínio: ${m.pct}%</b><small>${m.seen} de ${m.total} itens vistos</small></div><div class="bar"><i style="width:${m.pct}%"></i></div>
      ${weak ? `<small>Para reforçar agora:</small><div class="wchips">${weak}</div>` : `<small>${m.seen ? 'Nenhum item fraco no momento. Continue praticando para manter.' : 'Você ainda não praticou esta unidade.'}</small>`}</section>
    <section class="card path"><h3>Trilha da unidade</h3>
      ${activeSteps().map((s, i) => {
        const done = stepDone(id, s.id); const rec = S.pathOf(id)[s.id]; const best = rec && rec.best ? ` · melhor ${rec.best}%` : '';
        const isNext = nx && nx.id === s.id; const weakTest = s.id === 'test' && !testReady;
        return `<button class="step ${done ? 'done' : ''} ${isNext ? 'next' : ''}" data-step="${s.id}" ${weakTest ? 'data-weak="1"' : ''}><span class="si">${done ? '✅' : weakTest ? '🔒' : s.icon}</span><span class="st"><b>${i + 1}. ${s.title}</b><small>${s.desc}${s.pass ? ` · passa com ${s.pass}%` : ''}${best}</small></span><span class="go">${isNext ? '▶' : ''}</span></button>`;
      }).join('')}
    </section>
    <article class="lesson card" id="lesson">${renderLesson(LESSONS[id])}
      <button class="btn wide" id="learned">${stepDone(id, 'learn') ? '✅ Lição lida (reler quando quiser)' : '✅ Li a lição'}</button></article>
    <div class="dock"><div class="row">
      ${nx ? `<button class="btn primary" id="cont">▶ ${nx.id === 'learn' ? 'Começar: Aprender' : 'Continuar: ' + nx.title}</button>` : '<button class="btn primary" data-go="#/practice/mix">🏁 Concluída · treino inteligente</button>'}
      <button class="btn" data-go="#/practice/${id}">Treino livre</button></div></div>`;
  const toLesson = () => document.getElementById('lesson').scrollIntoView({ behavior: 'smooth' });
  const openStep = (s, weak) => {
    if (s.id === 'learn') return toLesson();
    if (weak && !confirm('Recomendo concluir Reconhecer e Escrever antes do teste. Fazer o teste mesmo assim?')) return;
    go(stepHref(id, s));
  };
  document.querySelectorAll('[data-step]').forEach((b) => { b.onclick = () => openStep(STEPS.find((x) => x.id === b.dataset.step), !!b.dataset.weak); });
  const cont = document.getElementById('cont'); if (cont) cont.onclick = () => openStep(nx, nx.id === 'test' && !testReady);
  document.getElementById('learned').onclick = () => { S.setLearned(id); markFocus(id, 'learn'); toast('Lição marcada como lida ✅'); unitPage(id); window.scrollTo(0, 0); };
}
