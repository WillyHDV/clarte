// Tela inicial: prontidão, plano de hoje, reta final e trilha de unidades.
import { UNITS } from '../data.js';
import * as S from '../store.js';
import { esc, I } from '../ui.js';
import { $app, st } from '../core.js';
import { daysToExam, readiness, CRITERIA, unitPassed, currentUnit, ensurePlan } from '../progress.js';

function criteriaHtml() {
  return CRITERIA.map(([fr, pt, key, how]) => {
    const k = S.skill(key); const ok = k && k.n >= 5; const v = ok ? Math.round(k.v * 100) : 0;
    return `<div class="crit"><div class="ct"><b>${esc(fr)}</b><small>${esc(pt)}</small></div><div class="cb"><div class="bar ${ok ? '' : 'off'}"><i style="width:${v}%"></i></div><small>${ok ? v + '%' : 'sem dados — ' + esc(how)}</small></div></div>`;
  }).join('');
}
function planHtml() {
  const p = ensurePlan(); const done = p.tasks.filter((t) => p.done[t.id]).length;
  const left = p.tasks.filter((t) => !p.done[t.id]).reduce((a, t) => a + t.min, 0);
  if (done === p.tasks.length && !p.bonus) { p.bonus = true; S.addXp(30); }
  return `<section class="card plan"><div class="ptitle"><h3>Plano de hoje</h3><small>${done}/${p.tasks.length} · ${left ? `faltam ~${left} min` : '🎉 concluído! +30 ⭐'}</small></div>
    ${p.tasks.map((t) => `<button class="ptask ${p.done[t.id] ? 'done' : ''}" data-go="${t.go}"><span class="chk ${p.done[t.id] ? 'on' : ''}">${p.done[t.id] ? I('check') : ''}</span><span class="tt">${t.icon} ${esc(t.title)}</span><small>${t.min} min</small></button>`).join('')}</section>`;
}
function finalStretch() {
  const ex = st().exams || []; const last = ex[ex.length - 1]; const best = Math.max(0, ...ex.map((e) => e.score || 0));
  const sim = last ? `Última simulação: <b>${String(last.score).replace(".", ",")}/10</b> (${new Date(last.date).toLocaleDateString('pt-BR')})${ex.length > 1 ? ` · melhor ${String(best).replace(".", ",")}/10 · ${ex.length} simulações` : ''}` : 'Você ainda não fez uma simulação da prova oral com a Clara.';
  const noBackup = st().xp > 60 && !st().lastBackup;
  return `<section class="card quick"><h3>Reta final</h3><p class="pt">${sim}</p>
    <div class="row"><button class="btn" data-go="#/tutor/exam">${I('phone')} Simular a prova oral</button><button class="btn" data-go="#/folha">${I('file')} Folha de revisão</button></div>
    ${noBackup ? `<div class="nudge">${I('shield')}<span>Faça um backup do seu progresso antes da prova.</span><button class="pill" data-go="#/settings">Ajustes</button></div>` : ''}</section>`;
}
export function home() {
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
