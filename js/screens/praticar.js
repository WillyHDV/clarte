// Praticar: o Reforço em destaque e os outros treinos numa lista curta.
import * as S from '../store.js';
import { $app } from '../core.js';
import { esc, linha } from '../ui.js';
import { canTalk } from '../speech.js';
import { nextEvaluation } from '../progress.js';
import { reforcoPendentes } from '../nav.js';

export function praticar() {
  S.touchDay(); S.save();
  const fracos = reforcoPendentes(); const erros = S.dueMistakes().length; const nx = nextEvaluation();
  const reforco = fracos
    ? `<section class="card reforco"><div class="topo"><span class="anel">${fracos}</span><div><b>Reforço</b><small>${fracos} ${fracos > 1 ? 'itens fracos' : 'item fraco'} para rever</small></div></div>
       <button class="btn" data-go="#/practice/review" id="reforcar">Reforçar agora</button></section>`
    : `<section class="card reforco"><div class="topo"><span class="anel">0</span><div><b>Reforço em dia</b><small>Nada fraco por enquanto. Bom trabalho!</small></div></div></section>`;
  $app.innerHTML = `
    <header class="apphead"><div class="hello"><b>Praticar</b><small>Escolha um treino</small></div></header>
    ${reforco}
    <h2>Outros treinos</h2>
    <div class="grupo">
      ${linha({ icone: 'bolt', titulo: 'Treino inteligente', resumo: 'Mistura o que está mais fraco', go: '#/practice/mix' })}
      ${canTalk() ? linha({ icone: 'microphone', titulo: 'Treino de fala', resumo: 'Repetir 5 frases em voz alta', go: '#/practice/speakdrill' }) : ''}
      ${linha({ icone: 'rotate-clockwise', titulo: 'Rever erros', resumo: erros ? `${erros} para hoje` : 'Nenhum erro pendente', go: '#/practice/review' })}
      ${nx && nx.ev.sheet ? linha({ icone: 'file-text', titulo: 'Folha de revisão', resumo: esc(nx.ev.title), go: '#/folha' }) : ''}
    </div>`;
}
