// Praticar: o Reforço em destaque, o plano de hoje e os outros treinos numa lista curta.
import * as S from '../store.js';
import { $app, st } from '../core.js';
import { esc, I, linha } from '../ui.js';
import { canTalk } from '../speech.js';
import { nextEvaluation, ensurePlan } from '../progress.js';
import { reforcoPendentes } from '../nav.js';

// reta final: nas 2 semanas antes da próxima avaliação o app põe a simulação da prova em evidência
const STRETCH_DAYS = 14;
const ICONE_TAREFA = { review: 'repeat', focus: 'route', speak: 'microphone', clara: 'phone', exam: 'trophy' };
const nota = (v) => String(v).replace('.', ',');

function planoHtml() {
  const p = ensurePlan(); const feitas = p.tasks.filter((t) => p.done[t.id]).length;
  const falta = p.tasks.filter((t) => !p.done[t.id]).reduce((a, t) => a + t.min, 0);
  if (feitas === p.tasks.length && !p.bonus) { p.bonus = true; S.addXp(30); }
  return `<section class="card plan"><div class="ptitle"><h3>Plano de hoje</h3><small>${feitas} de ${p.tasks.length} · ${falta ? `faltam ~${falta} min` : 'concluído! +30 pontos'}</small></div>
    ${p.tasks.map((t) => `<button class="ptask ${p.done[t.id] ? 'done' : ''}" data-go="${esc(t.go)}"><span class="chk ${p.done[t.id] ? 'on' : ''}">${p.done[t.id] ? I('check') : ''}</span><span class="tt">${I(ICONE_TAREFA[t.id] || 'bolt')} ${esc(t.title)}</span><small>${t.min} min</small></button>`).join('')}</section>`;
}

// resumo da última simulação da prova oral (texto simples, para a linha da lista)
function resumoSimulacao() {
  const ex = st().exams || []; if (!ex.length) return 'Você ainda não fez uma simulação';
  const ultima = ex[ex.length - 1]; const melhor = Math.max(0, ...ex.map((e) => e.score || 0));
  return `Última nota ${nota(ultima.score)}/10${ex.length > 1 ? ` · melhor ${nota(melhor)}/10 · ${ex.length} simulações` : ''}`;
}

export function praticar() {
  S.touchDay(); S.save();
  const fracos = reforcoPendentes(); const erros = S.dueMistakes().length; const nx = nextEvaluation(); const reta = nx && nx.days <= STRETCH_DAYS;
  const reforco = fracos
    ? `<section class="card reforco"><div class="topo"><span class="anel">${fracos}</span><div><b>Reforço</b><small>${fracos} ${fracos > 1 ? 'itens fracos' : 'item fraco'} para rever</small></div></div>
       <button class="btn" data-go="#/practice/review" id="reforcar">Reforçar agora</button></section>`
    : '<section class="card reforco"><div class="topo"><span class="anel">0</span><div><b>Reforço em dia</b><small>Nada fraco por enquanto. Bom trabalho!</small></div></div></section>';
  $app.innerHTML = `
    <header class="apphead"><div class="hello"><b>Praticar</b><small>Escolha um treino</small></div></header>
    ${reforco}
    ${planoHtml()}
    <h2 class="sec">Outros treinos</h2>
    <div class="grupo">
      ${reta ? linha({ icone: 'trophy', titulo: 'Simular a prova oral', resumo: `${nx.ev.title} · ${resumoSimulacao()}`, go: '#/tutor/exam' }) : ''}
      ${linha({ icone: 'bolt', titulo: 'Treino inteligente', resumo: 'Mistura o que está mais fraco', go: '#/practice/mix' })}
      ${canTalk() ? linha({ icone: 'microphone', titulo: 'Treino de fala', resumo: 'Repetir 5 frases em voz alta', go: '#/practice/speakdrill' }) : ''}
      ${linha({ icone: 'rotate-clockwise', titulo: 'Rever erros', resumo: erros ? `${erros} para hoje` : 'Nenhum erro pendente', go: '#/practice/review' })}
      ${nx && nx.ev.sheet ? linha({ icone: 'file-text', titulo: 'Folha de revisão', resumo: esc(nx.ev.title), go: '#/folha' }) : ''}
    </div>`;
}
