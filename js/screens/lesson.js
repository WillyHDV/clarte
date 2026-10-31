// Página da unidade: abas Trilha, Aula (em cartões que abrem) e Frases, com o botão de continuar fixo embaixo.
import { UNITS, LESSONS, LETTERS, ACCENTS, PHRASES, VERBS, PRONOUNS, JOBS, TUVOUS, PROFILES, VIDEO_TV } from '../data.js';
import { itemLabel } from '../exercises.js';
import * as S from '../store.js';
import { esc, I, toast, linha } from '../ui.js';
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
      return `<tr><td><button class="say sm" data-say="${esc(say)}">${I('volume')}</button></td><td>${esc(txt)}</td></tr>`;
    }).join('')}</table></div>`).join('') + '</div>';
}
function renderLesson(html) {
  return html.replace(/\{\{(.+?)\}\}/g, (_, t) => {
    if (t === 'letters') return Object.entries(LETTERS).map(([l, n]) => `<button class="letter" data-say="${esc(n)}">${l}<small>${esc(n)}</small></button>`).join('');
    if (t === 'accents') return ACCENTS.map((a) => `<button class="chip say" data-say="${esc(a.name)}">${a.c} <small>${a.name}</small></button>`).join('');
    if (t === 'verbtables') return verbTables();
    if (t === 'tuvous') return TUVOUS.map((p) => `<tr><td><button class="say sm" data-say="${esc(p.tu)}">${I('volume')}</button> ${esc(p.tu)}</td><td><button class="say sm" data-say="${esc(p.vous)}">${I('volume')}</button> ${esc(p.vous)}</td></tr>`).join('');
    if (t === 'profiles') return PROFILES.map((p) => { const l = p.langs.length > 1 ? p.langs.slice(0, -1).join(', ') + ' et ' + p.langs[p.langs.length - 1] : p.langs[0]; const say = `Bonjour, je m'appelle ${p.name}, je suis ${p.nat}, je parle ${l}.`; return `<tr><td><button class="say sm" data-say="${esc(say)}">${I('volume')}</button> ${esc(p.name)}</td><td>${esc(p.nat)}</td><td>${esc(l)}</td></tr>`; }).join('');
    if (t === 'videotv') return VIDEO_TV.map((p) => `<li><button class="say" data-say="${esc(p.fr)}">${I('volume')} ${esc(p.fr)}</button><span class="pt"><b>${p.reg}</b> · ${esc(p.pt)}</span></li>`).join('');
    if (t === 'jobrows') return JOBS.map((j) => `<tr><td>${j.m}</td><td>${j.f}</td><td>${j.pt}</td></tr>`).join('');
    if (t.startsWith('phrases:')) return PHRASES[t.slice(8)].map((p) => `<li><button class="say" data-say="${esc(p.fr)}">${I('volume')} ${esc(p.fr)}</button><span class="pt">${esc(p.pt)}</span></li>`).join('');
    if (t.startsWith('say:')) { const [txt, label] = t.slice(4).split('|'); return `<button class="say" data-say="${esc(txt)}">${I('volume')} ${esc(label || txt)}</button>`; }
    return '';
  });
}
// aba aberta em cada unidade (só enquanto o app está aberto)
const abaPorUnidade = {};
// listas de frases por tema que valem como "Frases" da unidade
const TEMAS = { comm: ['comm'], presenter: ['presenter'], saluer: ['saluer', 'congé'] };

// Frases da unidade para ouvir: as listas do tema e as frases com áudio que aparecem dentro da aula (marcador say:)
export function fraseList(id) {
  const out = []; const vistos = new Set();
  for (const t of TEMAS[id] || []) for (const p of PHRASES[t] || []) if (!vistos.has(p.fr)) { vistos.add(p.fr); out.push(p); }
  for (const m of (LESSONS[id] || '').matchAll(/\{\{say:([^}|]+)(?:\|[^}]*)?\}\}/g)) {
    const fr = m[1].trim(); if (fr.length > 8 && /[\s']/.test(fr) && !vistos.has(fr)) { vistos.add(fr); out.push({ fr, pt: '' }); }
  }
  return out.slice(0, 40);
}

// A aula em cartões: o texto antes do primeiro título e um cartão que abre para cada título (<h3>)
export function aulaCartoes(id) {
  const limpo = (t) => t.replace(/\{\{say:([^}|]*)(?:\|[^}]*)?\}\}/g, '$1').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  let intro = ''; const cartoes = [];
  for (const p of (LESSONS[id] || '').split(/(?=<h3\b)/)) {
    const m = /^<h3[^>]*>([\s\S]*?)<\/h3>/.exec(p);
    if (m) cartoes.push({ titulo: limpo(m[1]), corpo: p.slice(m[0].length) }); else intro += p;
  }
  return { intro: intro.trim(), cartoes };
}

export function unitPage(id) {
  const u = UNITS.find((x) => x.id === id); if (!u) return go('#/');
  const m = unitMastery(id); const nx = nextStep(id); const testReady = stepDone(id, 'recognize') && stepDone(id, 'write');
  const frases = fraseList(id); const { intro, cartoes } = aulaCartoes(id);
  const abas = [['trilha', 'Trilha'], ['aula', 'Aula'], ...(frases.length ? [['frases', 'Frases']] : [])];
  const aba = abas.some(([k]) => k === abaPorUnidade[id]) ? abaPorUnidade[id] : 'trilha';
  const fracos = m.weak.map(([iid]) => itemLabel(iid));
  const passos = activeSteps().map((s, i) => {
    const done = stepDone(id, s.id); const rec = S.pathOf(id)[s.id]; const best = rec && rec.best ? ` · melhor ${rec.best}%` : '';
    const isNext = nx && nx.id === s.id; const weakTest = s.id === 'test' && !testReady;
    return `<button class="step ${done ? 'done' : ''} ${isNext ? 'next' : ''}" data-step="${s.id}" ${weakTest ? 'data-weak="1"' : ''}><span class="si">${done ? I('check') : weakTest ? I('lock') : I(s.ic)}</span><span class="st"><b>${i + 1}. ${s.title}</b><small>${s.desc}${s.pass ? ` · passa com ${s.pass}%` : ''}${best}</small></span>${I('chevron-right')}</button>`;
  }).join('');
  const rotuloContinuar = nx ? (nx.id === 'learn' ? 'Começar: Aprender' : `Continuar: ${nx.title}`) : 'Concluída · treino inteligente';
  $app.innerHTML = `
    <header class="apphead"><button class="back" data-go="#/" aria-label="Voltar">${I('chevron-left')}</button><div class="hello"><b>${esc(u.title)}</b><small>${esc(u.sub)}</small></div><span class="dom" title="Seu domínio nesta unidade">${m.pct}%</span></header>
    <div class="abas" role="tablist" aria-label="Partes da unidade">${abas.map(([k, r]) => `<button role="tab" id="aba-${k}" aria-selected="${k === aba}" aria-controls="painel-${k}" data-aba="${k}">${r}</button>`).join('')}</div>
    <section role="tabpanel" id="painel-trilha" aria-labelledby="aba-trilha" ${aba === 'trilha' ? '' : 'hidden'}>
      <div class="dominio"><div class="mrow"><b>Seu domínio: ${m.pct}%</b><small>${m.seen} de ${m.total} itens vistos</small></div><div class="bar"><i style="width:${m.pct}%"></i></div></div>
      <div class="grupo passos">${passos}</div>
      ${fracos.length ? `<details class="acc"><summary>Para reforçar agora (${fracos.length})</summary><div class="acc-corpo"><div class="wchips">${fracos.slice(0, 12).map((t) => `<span class="wchip">${esc(t)}</span>`).join('')}</div></div></details>` : `<p class="pt">${m.seen ? 'Nenhum item fraco no momento. Continue praticando para manter.' : 'Você ainda não praticou esta unidade.'}</p>`}
      <div class="grupo">${linha({ icone: 'repeat', titulo: 'Treino livre da unidade', resumo: 'Exercícios variados só desta unidade', go: `#/practice/${id}` })}</div>
    </section>
    <section role="tabpanel" id="painel-aula" aria-labelledby="aba-aula" ${aba === 'aula' ? '' : 'hidden'}>
      <div class="lesson" id="lesson">
        ${intro ? `<div class="aula-intro">${renderLesson(intro)}</div>` : ''}
        ${cartoes.map((c, i) => `<details class="acc" ${i === 0 ? 'open' : ''}><summary>${esc(c.titulo)}</summary><div class="acc-corpo lesson">${renderLesson(c.corpo)}</div></details>`).join('')}
      </div>
      <button class="btn wide" id="learned">${stepDone(id, 'learn') ? `${I('check')} Lição lida (reler quando quiser)` : `${I('check')} Li a lição`}</button>
    </section>
    ${frases.length ? `<section role="tabpanel" id="painel-frases" aria-labelledby="aba-frases" ${aba === 'frases' ? '' : 'hidden'}>
      <p class="pt">Toque para ouvir. ${frases.length} ${frases.length > 1 ? 'frases' : 'frase'} desta unidade.</p>
      <ul class="frases">${frases.map((p) => `<li><button class="say circ" data-say="${esc(p.fr)}" aria-label="Ouvir: ${esc(p.fr)}">${I('volume')}</button><span class="ft"><b>${esc(p.fr)}</b>${p.pt ? `<small>${esc(p.pt)}</small>` : ''}</span></li>`).join('')}</ul>
    </section>` : ''}
    <div class="cta-fixo"><button class="btn primary" id="cont">${I('player-play')} ${rotuloContinuar}</button></div>`;
  const abrirAba = (k) => {
    abaPorUnidade[id] = k;
    document.querySelectorAll('[data-aba]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.aba === k)));
    document.querySelectorAll('[role="tabpanel"]').forEach((p) => { p.hidden = p.id !== `painel-${k}`; });
    window.scrollTo(0, 0);
  };
  document.querySelectorAll('[data-aba]').forEach((b) => { b.onclick = () => abrirAba(b.dataset.aba); });
  const openStep = (s, weak) => {
    if (s.id === 'learn') return abrirAba('aula');
    if (weak && !confirm('Recomendo concluir Reconhecer e Escrever antes do teste. Fazer o teste mesmo assim?')) return;
    go(stepHref(id, s));
  };
  document.querySelectorAll('[data-step]').forEach((b) => { b.onclick = () => openStep(STEPS.find((x) => x.id === b.dataset.step), !!b.dataset.weak); });
  document.getElementById('cont').onclick = () => (nx ? openStep(nx, nx.id === 'test' && !testReady) : go('#/practice/mix'));
  document.getElementById('learned').onclick = () => { S.setLearned(id); markFocus(id, 'learn'); toast('Lição marcada como lida ✅'); unitPage(id); };
}
