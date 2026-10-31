// Tela inicial: prontidão, plano de hoje, reta final e trilha de unidades.
import { UNITS } from '../data.js';
import * as S from '../store.js';
import { esc, I, toast, avatarHtml } from '../ui.js';
import * as A from '../autobackup.js';
import { $app, st } from '../core.js';
import { nextEvaluation, readiness, CRITERIA, unitPassed, currentUnit, ensurePlan } from '../progress.js';

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
// Reta final: aparece nas 2 semanas antes da próxima avaliação
const STRETCH_DAYS = 14;
const dm = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7);
// aviso de backup: nunca fez, ou faz 7 dias ou mais (reinstalar o app ou limpar os dados do navegador apaga o progresso)
const backupText = () => { const d = S.backupAgeDays(); return d === null ? 'Você ainda não fez backup do progresso. Se o app for reinstalado ou os dados do navegador forem apagados, ele se perde.' : `Faz ${d} dias desde o último backup do progresso.`; };
const backupNudge = (text) => `<div class="nudge">${I('shield')}<span>${text}</span><button class="pill" data-go="#/settings">Ajustes</button></div>`;
function finalStretch(nx) {
  const ex = st().exams || []; const last = ex[ex.length - 1]; const best = Math.max(0, ...ex.map((e) => e.score || 0));
  const sim = last ? `Última simulação: <b>${String(last.score).replace(".", ",")}/10</b> (${new Date(last.date).toLocaleDateString('pt-BR')})${ex.length > 1 ? ` · melhor ${String(best).replace(".", ",")}/10 · ${ex.length} simulações` : ''}` : 'Você ainda não fez uma simulação da prova oral com a Clara.';
  return `<section class="card quick"><h3>Reta final · ${esc(nx.ev.title)}</h3><p class="pt">${sim}</p>
    <div class="row"><button class="btn" data-go="#/tutor/exam">${I('phone')} Simular a prova oral</button>${nx.ev.sheet ? `<button class="btn" data-go="#/folha">${I('file')} Folha de revisão</button>` : ''}</div>
    ${S.backupDue() ? backupNudge(backupText()) : ''}</section>`;
}
// App Android reinstalado (ou dados perdidos): se o backup automático em Documentos/Clarte tem mais pontos que o app, oferece restaurar
async function offerRestore() {
  if (!A.disponivel()) return;
  let b = null; try { b = await A.richerBackup(); } catch (e) { return; }
  if (!b || A.dismissed(b) || !$app.querySelector('.hero') || document.getElementById('restore')) return;
  const quando = b.obj.exportedAt ? new Date(b.obj.exportedAt).toLocaleString('pt-BR') : 'data desconhecida';
  $app.querySelector('.hero').insertAdjacentHTML('beforebegin', `<section class="card" id="restore"><h3>${I('shield')} Encontrei um backup do seu progresso</h3>
    <p class="pt">Está em Documentos/Clarte, de ${esc(quando)}, com <b>${b.obj.state.xp || 0} pontos</b>. Este app tem ${st().xp}. Quer restaurar?</p>
    <div class="row"><button class="btn primary" id="rrestore">Restaurar o backup</button><button class="btn" id="rskip">Agora não</button></div></section>`);
  document.getElementById('rrestore').onclick = () => {
    if (!confirm(`Substituir o progresso deste app pelo do backup (${quando})?`)) return;
    A.restore(b); toast('Progresso restaurado ✅'); home();
  };
  document.getElementById('rskip').onclick = () => { A.dismiss(b); document.getElementById('restore').remove(); };
}
export function home() {
  S.touchDay(); S.save();
  const R = readiness(); S.logDay({ r: R.overall }); // um ponto por dia para o gráfico de Evolução
  const s = st(); const nx = nextEvaluation(); const due = R.weakCount + S.dueMistakes().length;
  const goal = s.settings.goal; const pct = Math.min(100, Math.round((100 * s.today.n) / goal));
  const examTxt = !nx ? 'Nenhuma avaliação marcada. Você pode cadastrar as datas em Ajustes.' : nx.days > 1 ? `${esc(nx.ev.title)} em <b>${nx.days} dias</b> (${dm(nx.ev.date)})` : nx.days === 1 ? `${esc(nx.ev.title)} é <b>amanhã</b>!` : `<b>Hoje</b> é a ${esc(nx.ev.title)}. Bonne chance !`;
  $app.innerHTML = `
    <header class="apphead"><div class="hello"><small class="brand">Clarté</small><b>Salut, ${esc(S.studentName())} !</b></div><div class="stats"><span class="stat flame" title="Dias seguidos">${I('flame')} ${s.streak}</span><button class="avatar-btn" data-go="#/perfil" aria-label="Abrir o seu perfil">${avatarHtml(s.settings.avatar, S.studentName(), 40)}</button></div></header>
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
    ${nx && nx.days <= STRETCH_DAYS ? finalStretch(nx) : S.backupDue() ? `<section class="card quick">${backupNudge(backupText())}</section>` : ''}
    <section class="card ready">
      <div class="rtop"><div class="ring" style="--p:${R.overall}"><b>${R.overall}%</b></div>
        <div><h3>Prontidão para a avaliação</h3><small>Média do domínio das 8 unidades. O treino inteligente escolhe o que está mais fraco.${R.weakest ? `<br>Mais fraca agora: <b>${esc(R.weakest.u.title)}</b> (${R.weakest.m.pct}%).` : ''}</small></div></div>
      <h4>Os 6 critérios da prova oral</h4>
      ${criteriaHtml()}
      <small class="fine">Estimativa do app a partir dos seus exercícios e das conversas por voz, não é a nota da professora.</small>
      <button class="btn sm" data-go="#/history">${I('activity')} Ver evolução</button>
    </section>
    <h2>Trilha da avaliação</h2>
    <div class="units">${R.per.map(({ u, m }, idx) => {
      const cu = currentUnit(); const cidx = cu ? UNITS.indexOf(cu) : -1;
      const passed = unitPassed(u.id); const locked = !passed && cidx >= 0 && idx > cidx;
      const tag = passed ? '✅ concluída' : idx === cidx ? '▶ você está aqui' : locked ? '🔒 depois' : '';
      return `<button class="unit ${locked ? 'locked' : ''} ${idx === cidx ? 'cur' : ''}" data-go="#/unit/${u.id}" ${locked ? `data-lock="${esc(cu.title)}"` : ''}><span class="ic">${u.icon}</span><span class="tx"><b>${u.n}. ${esc(u.title)}</b><small>${esc(u.sub)}</small><span class="bar"><i style="width:${m.pct}%"></i></span><small>${m.seen}/${m.total} itens vistos${tag ? ' · ' + tag : ''}</small></span><span class="sc">${m.pct}%</span></button>`;
    }).join('')}</div>`;
  offerRestore();
}
