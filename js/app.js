import { EXAM_DATE, UNITS, LESSONS, LETTERS, ACCENTS, PHRASES, VERBS, PRONOUNS, JOBS, TUVOUS, PROFILES, VIDEO_TV } from './data.js';
import { buildSession, check, shuffle, speakScore, unitItems, itemLabel, skillsFor } from './exercises.js';
import { speak as rawSpeak, stopSpeaking, listen, canListen, canSpeak, prefetch, engineInfo, frenchVoiceName } from './speech.js';
import * as V from './speech.js';
import * as S from './store.js';
import * as T from './tutor.js';
import { esc, I, toast } from './ui.js';
import { folhaHtml } from './folha.js';
import { diagHtml, initDiag } from './diag.js';
import { VERSION, BUILD_DATE } from './version.js';

const $app = document.getElementById('app');
const st = () => S.get();
const rate = () => (st().settings.slow ? 0.7 : 0.9);
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
  const [, page, arg, arg2] = (location.hash || '#/').slice(1).split('/');
  document.querySelectorAll('nav.tabs a').forEach((a) => a.classList.toggle('on', a.dataset.p === (page || 'home') || (a.dataset.p === 'home' && ['unit', 'practice', 'step'].includes(page))));
  $app.scrollTo?.(0, 0); window.scrollTo(0, 0);
  document.body.classList.toggle('focus', page === 'practice' || page === 'step');
  if (page === 'unit') return unitPage(arg);
  if (page === 'practice') return practice(arg);
  if (page === 'step') return practice(arg, arg2);
  if (page === 'tutor') { if (arg === 'exam' || arg === 'free') tutorMode = arg; return tutorPage(); }
  if (page === 'settings') return settingsPage();
  if (page === 'folha') return folhaPage();
  if (page === 'diag') return diagPage();
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
// ---------- domínio e prontidão ----------
const strengthOf = (id) => { const s = S.strength(id); return s === null ? 0.3 : s; };
const unitMastery = (uid) => S.mastery(unitItems(uid));
function readiness() {
  const per = UNITS.map((u) => ({ u, m: unitMastery(u.id) }));
  const overall = Math.round(per.reduce((a, x) => a + x.m.pct, 0) / per.length);
  return { per, overall, weakCount: per.reduce((a, x) => a + x.m.weak.length, 0), weakest: [...per].sort((a, b) => a.m.pct - b.m.pct)[0] };
}
// critérios da prova oral (Contenus de la première évaluation) e a competência que os alimenta
const CRITERIA = [
  ['Compréhension des questions', 'Entender as perguntas', 'compreensao', 'exercícios de escuta'],
  ['Capacité à répondre', 'Responder com pertinência', 'resposta', 'conversa por voz com a Clara'],
  ['Vocabulaire', 'Vocabulário do curso', 'vocabulario', 'exercícios de vocabulário'],
  ['Correction linguistique', 'Gramática correta', 'gramatica', 'exercícios de gramática'],
  ['Prononciation', 'Pronúncia', 'pronuncia', 'exercícios de fala e repetições com a Clara'],
  ["Aisance à l'oral", 'Fluência', 'fluidez', 'conversa por voz com a Clara'],
];
function criteriaHtml() {
  return CRITERIA.map(([fr, pt, key, how]) => {
    const k = S.skill(key); const ok = k && k.n >= 5; const v = ok ? Math.round(k.v * 100) : 0;
    return `<div class="crit"><div class="ct"><b>${esc(fr)}</b><small>${esc(pt)}</small></div><div class="cb"><div class="bar ${ok ? '' : 'off'}"><i style="width:${v}%"></i></div><small>${ok ? v + '%' : 'sem dados — ' + esc(how)}</small></div></div>`;
  }).join('');
}
// ---------- trilha por degraus ----------
const STEPS = [
  { id: 'learn', title: 'Aprender', icon: '📖', desc: 'Leia o resumo da unidade' },
  { id: 'recognize', title: 'Reconhecer', icon: '👀', desc: 'Escolher e entender, com escuta', kinds: ['choice', 'listen-choice'], n: 8, pass: 80 },
  { id: 'write', title: 'Escrever', icon: '✍️', desc: 'Escrever e montar frases', kinds: ['type', 'tiles', 'listen-type'], n: 8, pass: 80 },
  { id: 'speak', title: 'Falar', icon: '🎤', desc: 'Repetir em voz alta', kinds: ['speak'], n: 5, pass: 70 },
  { id: 'test', title: 'Teste da unidade', icon: '🏁', desc: 'Misto, para concluir a unidade', n: 12, pass: 80 },
];
const activeSteps = () => STEPS.filter((s) => s.id !== 'speak' || canListen);
const stepDone = (uid, sid) => { const p = S.pathOf(uid); return sid === 'learn' ? !!p.learned : !!(p[sid] && p[sid].done); };
const unitPassed = (uid) => stepDone(uid, 'test');
const nextStep = (uid) => activeSteps().find((s) => !stepDone(uid, s.id)) || null;
const currentUnit = () => UNITS.find((u) => !unitPassed(u.id)) || null;
const stepHref = (uid, s) => (s.id === 'learn' ? `#/unit/${uid}` : `#/step/${uid}/${s.id}`);

// ---------- plano de hoje ----------
function planDone(id) { if (S.markPlan(id)) toast('✅ Plano de hoje: tarefa concluída'); }
function markFocus(uid, sid) { const t = (S.plan().tasks || []).find((x) => x.id === 'focus'); if (t && t.go === stepHref(uid, STEPS.find((s) => s.id === sid))) planDone('focus'); }
function ensurePlan() {
  const p = S.plan(); if (p.tasks) return p;
  const R = readiness(); const d = daysToExam(); const cur = currentUnit(); const tasks = [];
  const weakN = R.weakCount + S.dueMistakes().length;
  if (weakN >= 3) tasks.push({ id: 'review', icon: '🔁', title: `Reforçar ${Math.min(weakN, 10)} itens fracos`, min: 3, go: '#/practice/review' });
  const ns = cur ? nextStep(cur.id) : null;
  tasks.push(ns ? { id: 'focus', icon: cur.icon, title: `${cur.title}: ${ns.title}`, min: 5, go: stepHref(cur.id, ns) } : { id: 'focus', icon: '⚡', title: 'Treino inteligente', min: 5, go: '#/practice/mix' });
  if (canListen) tasks.push({ id: 'speak', icon: '🎤', title: 'Treino de fala: repetir 5 frases', min: 3, go: '#/practice/speakdrill' });
  tasks.push({ id: 'clara', icon: '📞', title: 'Conversar com a Clara (4 respostas)', min: 4, go: '#/tutor/free' });
  if (d >= 0 && d <= 2) tasks.push({ id: 'exam', icon: '🎓', title: 'Simular a prova oral com a Clara', min: 6, go: '#/tutor/exam' });
  p.tasks = tasks; S.save(); return p;
}
function planHtml() {
  const p = ensurePlan(); const done = p.tasks.filter((t) => p.done[t.id]).length;
  const left = p.tasks.filter((t) => !p.done[t.id]).reduce((a, t) => a + t.min, 0);
  if (done === p.tasks.length && !p.bonus) { p.bonus = true; S.addXp(30); }
  return `<section class="card plan"><div class="ptitle"><h3>Plano de hoje</h3><small>${done}/${p.tasks.length} · ${left ? `faltam ~${left} min` : '🎉 concluído! +30 ⭐'}</small></div>
    ${p.tasks.map((t) => `<button class="ptask ${p.done[t.id] ? 'done' : ''}" data-go="${t.go}"><span class="chk ${p.done[t.id] ? 'on' : ''}">${p.done[t.id] ? I('check') : ''}</span><span class="tt">${t.icon} ${esc(t.title)}</span><small>${t.min} min</small></button>`).join('')}</section>`;
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
function finalStretch() {
  const ex = st().exams || []; const last = ex[ex.length - 1]; const best = Math.max(0, ...ex.map((e) => e.score || 0));
  const sim = last ? `Última simulação: <b>${String(last.score).replace(".", ",")}/10</b> (${new Date(last.date).toLocaleDateString('pt-BR')})${ex.length > 1 ? ` · melhor ${String(best).replace(".", ",")}/10 · ${ex.length} simulações` : ''}` : 'Você ainda não fez uma simulação da prova oral com a Clara.';
  const noBackup = st().xp > 60 && !st().lastBackup;
  return `<section class="card quick"><h3>Reta final</h3><p class="pt">${sim}</p>
    <div class="row"><button class="btn" data-go="#/tutor/exam">${I('phone')} Simular a prova oral</button><button class="btn" data-go="#/folha">${I('file')} Folha de revisão</button></div>
    ${noBackup ? `<div class="nudge">${I('shield')}<span>Faça um backup do seu progresso antes da prova.</span><button class="pill" data-go="#/settings">Ajustes</button></div>` : ''}</section>`;
}
function folhaPage() {
  $app.innerHTML = `<div class="noprint"><button class="back" data-go="#/" aria-label="Voltar">${I('back')}</button></div>${folhaHtml()}`;
  document.getElementById('fprint').onclick = () => window.print();
}
function diagPage() { $app.innerHTML = diagHtml(); initDiag($app, { cur }); }

// ---------- atualização: avisa quando há versão nova no ar ----------
function showUpdate(v) {
  if (document.querySelector('.upd')) return;
  const b = document.createElement('div'); b.className = 'upd'; b.setAttribute('role', 'alert');
  b.innerHTML = `<span>Nova versão disponível (v${esc(v)})</span><button class="pill primary" id="updgo">Atualizar</button>`;
  document.body.appendChild(b);
  b.querySelector('#updgo').onclick = async () => {
    try { for (const k of await caches.keys()) await caches.delete(k); for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch (e) { /* ignore */ }
    location.reload();
  };
}
async function checkUpdate(manual) {
  try {
    const t = await (await fetch('js/version.js', { cache: 'no-store' })).text(); const m = /VERSION\s*=\s*'([^']+)'/.exec(t);
    if (m && m[1] !== VERSION) { showUpdate(m[1]); return true; }
    if (manual) toast('Você está na versão mais nova.');
  } catch (e) { if (manual) toast('Não consegui verificar agora (sem internet?).'); }
  return false;
}

function home() {
  S.touchDay(); S.save();
  const R = readiness();
  const s = st(); const d = daysToExam(); const due = R.weakCount + S.dueMistakes().length;
  const goal = s.settings.goal; const pct = Math.min(100, Math.round((100 * s.today.n) / goal));
  const examTxt = d > 1 ? `Évaluation 1 em <b>${d} dias</b> (04/11)` : d === 1 ? 'Évaluation 1 é <b>amanhã</b>!' : d === 0 ? '<b>Hoje</b> é a Évaluation 1. Bonne chance !' : 'Évaluation 1 já passou. Próxima: 02/12 (Évaluation 2)';
  $app.innerHTML = `
    <header class="top"><div><div class="brand">Clarté</div><h1>Salut, Willy ! 👋</h1></div><div class="stats"><span class="stat flame" title="Dias seguidos">${I('flame')} ${s.streak}</span><span class="stat star" title="Pontos">${I('star')} ${s.xp}</span></div></header>
    <section class="card hero">
      <div class="exam">${examTxt}</div>
      <div class="goal"><div class="bar"><i style="width:${pct}%"></i></div><small>Meta de hoje: ${Math.min(s.today.n, goal)}/${goal} exercícios</small></div>
      <div class="row">
        <button class="btn primary" data-go="#/practice/mix">${I('zap')} Treino inteligente</button>
        <button class="btn" data-go="#/tutor">${I('phone')} Falar com a Clara</button>
      </div>
      ${due ? `<button class="btn warn wide" data-go="#/practice/review">${I('repeat')} Reforçar ${due} ${due > 1 ? 'itens que estão fracos' : 'item que está fraco'}</button>` : ''}
    </section>
    ${planHtml()}
    ${finalStretch()}
    <section class="card ready">
      <div class="rtop"><div class="ring" style="--p:${R.overall}"><b>${R.overall}%</b></div>
        <div><h3>Prontidão para a prova</h3><small>Média do domínio das 8 unidades. O treino inteligente escolhe o que está mais fraco.${R.weakest ? `<br>Mais fraca agora: <b>${esc(R.weakest.u.title)}</b> (${R.weakest.m.pct}%).` : ''}</small></div></div>
      <h4>Os 6 critérios da prova oral</h4>
      ${criteriaHtml()}
      <small class="fine">Estimativa do app a partir dos seus exercícios e das conversas por voz, não é a nota da professora.</small>
    </section>
    <h2>Trilha da avaliação</h2>
    <div class="units">${R.per.map(({ u, m }, idx) => {
      const cu = currentUnit(); const cidx = cu ? UNITS.indexOf(cu) : -1;
      const passed = unitPassed(u.id); const locked = !passed && cidx >= 0 && idx > cidx;
      const tag = passed ? '✅ concluída' : idx === cidx ? '▶ você está aqui' : locked ? '🔒 depois' : '';
      return `<button class="unit ${locked ? 'locked' : ''} ${idx === cidx ? 'cur' : ''}" data-go="#/unit/${u.id}" ${locked ? `data-lock="${esc(cu.title)}"` : ''}><span class="ic">${u.icon}</span><span class="tx"><b>${u.n}. ${esc(u.title)}</b><small>${esc(u.sub)}</small><span class="bar"><i style="width:${m.pct}%"></i></span><small>${m.seen}/${m.total} itens vistos${tag ? ' · ' + tag : ''}</small></span><span class="sc">${m.pct}%</span></button>`;
    }).join('')}</div>`;
}
document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-go]'); if (!g) return;
  if (g.dataset.lock && !confirm(`Esta unidade vem depois de "${g.dataset.lock}". Abrir mesmo assim?`)) return;
  go(g.dataset.go);
});

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
function unitPage(id) {
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

// ---------- prática ----------
const ACC = ['é', 'è', 'ê', 'ë', 'à', 'â', 'î', 'ï', 'ô', 'û', 'ù', 'ç', 'œ', '’'];
function practice(id, stepId) {
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
  const total = list.length; let i = 0; let correct = 0; let attempted = 0; let wrongList = [];
  let ex; let sel; let placed; let bank; let heard = ''; let rec = null; let answered = false; let skipped = false;

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
  cleanup = () => { document.removeEventListener('keydown', onKey); if (rec) rec.stop(); };
  render();
}

// ---------- professor de IA ----------
const cur = () => { const s = st().settings; const p = s.provider in T.PROVIDERS ? s.provider : 'gemini'; return { p, def: T.PROVIDERS[p], key: (s.keys || {})[p] || '', model: (s.models || {})[p] || T.PROVIDERS[p].model }; };
const provOptions = (sel) => Object.entries(T.PROVIDERS).map(([id, v]) => `<option value="${id}" ${id === sel ? 'selected' : ''}>${v.label}</option>`).join('');
const CHAT_KEY = S.CHAT_KEY;
const loadChats = () => { try { return JSON.parse(localStorage.getItem(CHAT_KEY)) || {}; } catch (e) { return {}; } };
const saveChats = (c) => { try { localStorage.setItem(CHAT_KEY, JSON.stringify(c)); } catch (e) { /* ignore */ } };
let tutorMode = 'free';

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
  function draw() {
    const msgs = getMsgs();
    $app.innerHTML = `
      <header class="top"><div class="avatar-s">C</div><h1>Professora Clara</h1><button class="icon" id="newc" title="Nova conversa" aria-label="Nova conversa">${I('trash')}</button></header>
      <div class="seg">${Object.entries(labels).map(([k, v]) => `<button data-m="${k}" class="${k === tutorMode ? 'on' : ''}">${v}</button>`).join('')}</div>
      ${tutorMode !== 'duvidas' ? (canListen ? `<button class="btn primary wide callbtn" id="callbtn">${I('phone')} Conversar por voz com a Clara</button>` : '<div class="pt">A conversa por voz precisa do Chrome (ou Edge).</div>') : ''}
      <div class="chat" id="chat">${msgs.filter((m) => !m.hidden).map(drawMsg).join('')}${tutorMode === 'exam' && !msgs.length ? `<div class="card center"><p>Simulação da <b>avaliação oral</b>: a professora Clara faz perguntas por voz ou texto, sem corrigir durante a prova. No fim, você recebe a nota nos 6 critérios.</p><button class="btn primary" id="startexam">Começar a prova</button></div>` : ''}</div>
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
      const { text } = await T.chat({ provider: c.p, apiKey: c.key, model: c.model, mode: tutorMode, messages: apiMsgs(), signal: ctrl.signal, onText: (d) => { acc += d; const live = document.getElementById('live'); if (live) { live.querySelector('.bub').innerHTML = md(split(acc)[0]); chat.scrollTop = chat.scrollHeight; } } });
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
      }
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
            ({ text } = await T.chat({ provider: c.p, apiKey: c.key, model: c.model, mode, messages: apiMsgs(), signal: abortCtl.signal,
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
  cleanup = () => { if (callEnd) callEnd(false); if (ctrl) ctrl.abort(); if (rec) rec.stop(); saveChats(chats); };
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
      <label>Microfone na conversa por voz<select id="smic" class="inp">
        <option value="rec" ${s.micMode !== 'web' ? 'selected' : ''}>Gravar e transcrever (recomendado)</option>
        <option value="web" ${s.micMode === 'web' ? 'selected' : ''}>Reconhecimento de voz do navegador</option></select></label>
      <label>Voz do professor<select id="sengine" class="inp">
        <option value="auto" ${(s.voiceEngine || 'auto') === 'auto' ? 'selected' : ''}>Automática (recomendado)</option>
        <option value="browser" ${s.voiceEngine === 'browser' ? 'selected' : ''}>Voz do aparelho</option>
        <option value="gemini" ${s.voiceEngine === 'gemini' ? 'selected' : ''}>Voz natural online (Gemini)</option></select></label>
      <button class="btn" id="stest">🔊 Testar voz</button>
      <div id="vstatus"></div>
      <small>${canListen ? '' : 'Reconhecimento de fala indisponível: use o Chrome ou o Edge.'}</small>
    </section>
    <section class="card"><h3>Seus dados</h3>
      <p class="pt">Seu progresso fica só neste aparelho. Faça um backup de vez em quando, principalmente antes da prova, e use Importar para recuperar ou levar para outro aparelho.</p>
      <small id="sbk">${s.lastBackup ? 'Último backup: ' + esc(new Date(s.lastBackup).toLocaleString('pt-BR')) : 'Nenhum backup feito ainda.'} · Armazenamento protegido: <span id="spersist">verificando…</span></small>
      <label class="chk"><input type="checkbox" id="sbkkeys"> Incluir minha chave de IA no arquivo (guarde com cuidado)</label>
      <div class="row"><button class="btn" id="sexport">${I('download')} Exportar</button><button class="btn" id="simport">${I('upload')} Importar</button></div>
      <input type="file" id="sfile" accept="application/json,.json" hidden>
    </section>
    <section class="card"><h3>Sobre</h3>
      <p>Clarté <b>v${VERSION}</b> · ${BUILD_DATE}</p>
      <div class="row"><button class="btn" id="supd">${I('refresh')} Verificar atualização</button><button class="btn" data-go="#/diag">${I('activity')} Diagnóstico</button></div>
      <div class="row"><button class="btn" data-go="#/folha">${I('file')} Folha de revisão</button></div>
      <small>Sua chave e seu progresso ficam só neste aparelho. Nos planos gratuitos, os provedores de IA podem usar as conversas para melhorar os modelos.</small>
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
  on('smic', 'change', (e) => S.setSetting('micMode', e.target.value));
  on('sengine', 'change', (e) => { S.setSetting('voiceEngine', e.target.value); paintVoice(); });
  on('stest', 'click', () => speak('Bonjour ! Je m’appelle Clara. Comment allez-vous ?', { rate: rate() }));
  on('sinstall', 'click', async () => { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; settingsPage(); });
  on('supd', 'click', () => checkUpdate(true));
  (async () => { const el = document.getElementById('spersist'); if (!el) return; try { const p = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false; el.textContent = p ? 'sim' : 'não (faça backups)'; } catch (e) { el.textContent = 'desconhecido'; } })();
  on('sexport', 'click', () => {
    const data = S.exportData({ includeKeys: document.getElementById('sbkkeys').checked });
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
    a.download = `clarte-progresso-${new Date().toLocaleDateString('sv-SE')}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 8000);
    document.getElementById('sbk').textContent = 'Backup salvo agora. Procure o arquivo em Downloads.'; toast('Backup exportado.');
  });
  on('simport', 'click', () => document.getElementById('sfile').click());
  on('sfile', 'change', async (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    try {
      const obj = JSON.parse(await f.text()); const err = S.validateBackup(obj); if (err) { toast(err); return; }
      const when = obj.exportedAt ? new Date(obj.exportedAt).toLocaleString('pt-BR') : 'data desconhecida';
      if (!confirm(`Substituir o progresso deste aparelho pelo do backup (${when})? Isso não pode ser desfeito.`)) return;
      S.importData(obj); toast('Progresso restaurado ✅'); settingsPage();
    } catch (er) { toast('Não consegui ler o arquivo: ' + (er.message || 'formato inválido')); }
    e.target.value = '';
  });
  on('sreset', 'click', () => { if (confirm('Apagar todo o progresso e os erros salvos?')) { S.resetAll(); try { localStorage.removeItem(CHAT_KEY); } catch (e) { /* ignore */ } settingsPage(); } });
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
S.requestPersist();
if (location.protocol !== 'file:') { setTimeout(() => checkUpdate(false), 4000); setInterval(() => checkUpdate(false), 15 * 60 * 1000); document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUpdate(false); }); }
// registro simples de erros inesperados (aparece no relatório de diagnóstico futuro e evita tela travada sem aviso)
window.addEventListener('error', (e) => { try { const l = JSON.parse(localStorage.getItem('fr_errlog') || '[]'); l.push({ t: new Date().toISOString(), m: String(e.message).slice(0, 200), f: String(e.filename || '').split('/').pop(), l: e.lineno }); localStorage.setItem('fr_errlog', JSON.stringify(l.slice(-20))); } catch (er) { /* ignore */ } });
window.addEventListener('unhandledrejection', (e) => { try { const l = JSON.parse(localStorage.getItem('fr_errlog') || '[]'); l.push({ t: new Date().toISOString(), m: String((e.reason && e.reason.message) || e.reason).slice(0, 200), f: 'promise' }); localStorage.setItem('fr_errlog', JSON.stringify(l.slice(-20))); } catch (er) { /* ignore */ } });
route();
