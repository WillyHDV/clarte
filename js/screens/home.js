// Trilha (tela inicial): cartão "Continuar de onde parou" e o caminho das unidades.
// O plano do dia e a reta final ficam em Praticar; a prontidão e os critérios, em Evolução.
import { UNITS } from '../data.js';
import * as S from '../store.js';
import { esc, I, toast, avatarHtml } from '../ui.js';
import * as A from '../autobackup.js';
import { $app, st } from '../core.js';
import { nextEvaluation, readiness, unitPassed, currentUnit, nextStep, stepHref } from '../progress.js';

const dm = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7);
// aviso de backup: nunca fez, ou faz 7 dias ou mais (reinstalar o app ou limpar os dados apaga o progresso)
const backupText = () => { const d = S.backupAgeDays(); return d === null ? 'Você ainda não fez backup do progresso. Se o app for reinstalado, ele se perde.' : `Faz ${d} dias desde o último backup do progresso.`; };
const backupNudge = (text) => `<div class="nudge">${I('shield-check')}<span>${text}</span><button class="pill" data-go="#/perfil">Perfil</button></div>`;

// App Android reinstalado (ou dados perdidos): se o backup automático em Documentos/Clarte tem mais pontos que o app, oferece restaurar
async function offerRestore() {
  if (!A.disponivel()) return;
  let b = null; try { b = await A.richerBackup(); } catch (e) { return; }
  if (!b || A.dismissed(b) || !$app.querySelector('.continuar') || document.getElementById('restore')) return;
  const quando = b.obj.exportedAt ? new Date(b.obj.exportedAt).toLocaleString('pt-BR') : 'data desconhecida';
  $app.querySelector('.continuar').insertAdjacentHTML('beforebegin', `<section class="card" id="restore"><h3>${I('shield-check')} Encontrei um backup do seu progresso</h3>
    <p class="pt">Está em Documentos/Clarte, de ${esc(quando)}, com <b>${b.obj.state.xp || 0} pontos</b>. Este app tem ${st().xp}. Quer restaurar?</p>
    <div class="row"><button class="btn primary" id="rrestore">Restaurar o backup</button><button class="btn" id="rskip">Agora não</button></div></section>`);
  document.getElementById('rrestore').onclick = () => {
    if (!confirm(`Substituir o progresso deste app pelo do backup (${quando})?`)) return;
    A.restore(b); toast('Progresso restaurado ✅'); home();
  };
  document.getElementById('rskip').onclick = () => { A.dismiss(b); document.getElementById('restore').remove(); };
}

// deslocamento lateral de cada unidade no caminho (px), repetido: faz o zigue-zague
export const ONDA = [0, 30, 52, 30];

// estado de cada unidade no caminho: concluída, a atual ou a que vem depois
export const estadoDe = (idx, passed, cidx) => (passed ? 'feita' : idx === cidx ? 'atual' : 'depois');

function noHtml(u, idx, m, estado, cu) {
  const off = ONDA[idx % ONDA.length];
  const selo = estado === 'feita' ? `<span class="selo ok">${I('check')}</span>` : estado === 'depois' ? `<span class="selo">${I('lock')}</span>` : '';
  const tag = estado === 'atual' ? ' · você está aqui' : estado === 'feita' ? ' · concluída' : '';
  const etiqueta = estado === 'atual' ? '<span class="etq aqui">você está aqui</span>' : estado === 'feita' ? `<span class="etq ok">${I('check')} concluída</span>` : '';
  return `<button class="passo ${estado}" data-go="#/unit/${u.id}" ${estado === 'depois' ? `data-lock="${esc(cu.title)}"` : ''} style="--off:${off}px;--p:${m.pct};--i:${Math.min(idx, 8)}" aria-label="${u.n}. ${esc(u.title)}, ${m.pct}% dominado${tag}">
    <span class="no" aria-hidden="true"><span class="emo">${u.icon}</span>${selo}</span>
    <span class="tx"><small class="uni">Unidade ${u.n}</small><b>${esc(u.title)}</b><span class="mini" aria-hidden="true"><i style="width:${m.pct}%"></i></span><small class="meta">${m.pct}% · ${m.seen}/${m.total} itens</small>${etiqueta}</span></button>`;
}

// linha pontilhada que liga os nós (medida depois de desenhar; em tela sem layout não desenha nada)
export function ligarNos(caminho) {
  const box = caminho.getBoundingClientRect(); if (!box.width) return;
  const nos = [...caminho.querySelectorAll('.passo .no')].map((n) => { const r = n.getBoundingClientRect(); return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top }; });
  if (nos.length < 2) return;
  const atual = [...caminho.querySelectorAll('.passo')].findIndex((p) => p.classList.contains('atual'));
  const seg = (a, b) => { const dy = (b.y - a.y) / 2; return `C ${a.x} ${a.y + dy} ${b.x} ${b.y - dy} ${b.x} ${b.y}`; };
  const feitos = atual < 0 ? nos.length - 1 : atual; // índice do nó até onde o caminho já foi percorrido
  let ok = `M ${nos[0].x} ${nos[0].y}`; let falta = `M ${nos[feitos].x} ${nos[feitos].y}`;
  for (let i = 1; i < nos.length; i++) { if (i <= feitos) ok += ` ${seg(nos[i - 1], nos[i])}`; else falta += ` ${seg(nos[i - 1], nos[i])}`; }
  let svg = caminho.querySelector('svg.liga');
  if (!svg) { svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'liga'); svg.setAttribute('aria-hidden', 'true'); caminho.prepend(svg); }
  svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`); svg.setAttribute('width', box.width); svg.setAttribute('height', box.height);
  svg.innerHTML = `<path class="falta" d="${falta}"/><path class="ok" d="${ok}"/>`;
}

export function home() {
  S.touchDay(); S.save();
  const R = readiness(); S.logDay({ r: R.overall }); // um ponto por dia para o gráfico de Evolução
  const s = st(); const nx = nextEvaluation();
  const goal = s.settings.goal; const pct = Math.min(100, Math.round((100 * s.today.n) / goal));
  const examTxt = !nx ? 'Nenhuma avaliação marcada. Você pode cadastrar as datas em Ajustes.' : nx.days > 1 ? `${esc(nx.ev.title)} em <b>${nx.days} dias</b> (${dm(nx.ev.date)})` : nx.days === 1 ? `${esc(nx.ev.title)} é <b>amanhã</b>!` : `<b>Hoje</b> é a ${esc(nx.ev.title)}. Bonne chance !`;
  const cu = currentUnit(); const cidx = cu ? UNITS.indexOf(cu) : -1; const ns = cu ? nextStep(cu.id) : null;
  const titulo = cu ? `${esc(cu.title)}<span>${ns ? esc(ns.title) : 'Revisão da unidade'}</span>` : 'Tudo concluído<span>Treino inteligente</span>';
  const destino = cu ? (ns ? stepHref(cu.id, ns) : `#/unit/${cu.id}`) : '#/practice/mix';
  $app.innerHTML = `
    <header class="apphead"><div class="hello"><small class="brand">Clarté</small><b>Salut, ${esc(S.studentName())} !</b></div><div class="stats"><span class="stat flame" title="Dias seguidos">${I('flame')} ${s.streak}</span><button class="avatar-btn" data-go="#/perfil" aria-label="Abrir o seu perfil">${avatarHtml(s.settings.avatar, S.studentName(), 40)}</button></div></header>
    ${S.backupDue() ? backupNudge(backupText()) : ''}
    <section class="card continuar" aria-labelledby="ctitulo">
      <div class="c-topo"><div class="c-txt"><small class="eyebrow">Continuar de onde parou</small><h2 id="ctitulo">${titulo}</h2></div>
        <div class="meta-dia"><div class="meta-ring" role="img" aria-label="Meta de hoje: ${Math.min(s.today.n, goal)} de ${goal} exercícios" style="--p:${pct}"><b>${Math.min(s.today.n, goal)}</b><small>de ${goal}</small></div><small>meta de hoje</small></div></div>
      <p class="exam">${examTxt}</p>
      <button class="btn" id="continuar" data-go="${destino}">${I('player-play')} Continuar</button>
    </section>
    <div class="sec-head"><h2>Trilha da avaliação</h2><span class="chip-prova">${R.per.filter(({ u }) => unitPassed(u.id)).length} de ${UNITS.length} concluídas</span></div>
    <div class="caminho" id="caminho">${R.per.map(({ u, m }, idx) => noHtml(u, idx, m, estadoDe(idx, unitPassed(u.id), cidx), cu || { title: '' })).join('')}</div>`;
  offerRestore();
  ligarNos(document.getElementById('caminho'));
  if (!home.ouvindo) { home.ouvindo = true; window.addEventListener('resize', () => { const c = document.getElementById('caminho'); if (c) ligarNos(c); }); }
}
