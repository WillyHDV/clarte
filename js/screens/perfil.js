// Perfil: nome, números do estudo, Evolução, Ajustes, Backup e a escolha do avatar.
import * as S from '../store.js';
import { $app } from '../core.js';
import { I, esc, linha, avatarHtml, AVATARS } from '../ui.js';
import { nextEvaluation } from '../progress.js';

export function perfilPage() {
  const s = S.get(); const nome = S.studentName(); const atual = s.settings.avatar || 'initial'; const nx = nextEvaluation();
  const backup = s.lastBackup ? `último em ${new Date(s.lastBackup).toLocaleDateString('pt-BR')}` : 'ainda não feito';
  $app.innerHTML = `
    <button class="voltar" data-go="#/" id="pvoltar">${I('chevron-left')} Trilha</button>
    <section class="perfil-topo" style="display:flex;align-items:center;gap:16px;margin:4px 0 16px">
      ${avatarHtml(atual, nome, 72)}
      <div style="display:grid;line-height:1.25"><b style="font-size:var(--fs-xl)">${esc(nome)}</b><small>Français basique 1</small></div>
    </section>
    <div class="stats3">
      <div><b>${s.streak}</b><small>${s.streak === 1 ? 'dia seguido' : 'dias seguidos'}</small></div>
      <div><b>${s.xp}</b><small>pontos</small></div>
      <div><b>${nx ? nx.days : '—'}</b><small>dias para a prova</small></div>
    </div>
    <div class="grupo">
      ${linha({ icone: 'chart-line', titulo: 'Minha evolução', resumo: 'Gráficos e prontidão', go: '#/history' })}
      ${linha({ icone: 'adjustments', titulo: 'Ajustes', resumo: 'Clara, voz, estudo e dados', go: '#/settings' })}
      ${linha({ icone: 'shield-check', titulo: 'Backup e dados', resumo: backup, go: '#/settings' })}
    </div>
    <h3>Avatar</h3>
    <div class="avatares" role="radiogroup" aria-label="Avatar">
      ${AVATARS.map((a) => `<button type="button" role="radio" aria-checked="${a.id === atual}" aria-label="${esc(a.nome)}" data-av="${a.id}" class="${a.id === atual ? 'on' : ''}">${avatarHtml(a.id, nome, 40)}<span>${esc(a.nome)}</span></button>`).join('')}
    </div>`;
  document.querySelectorAll('[data-av]').forEach((b) => { b.onclick = () => { S.setSetting('avatar', b.dataset.av); perfilPage(); }; });
}
