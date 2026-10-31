// Ajustes: provedor e chave da IA, voz, microfone, dados (backup), instalação e sobre.
import { canTalk, canRecord, canSpeak, engineInfo, frenchVoiceName, TTS_CANDIDATES } from '../speech.js';
import * as S from '../store.js';
import * as T from '../tutor.js';
import { esc, I, toast } from '../ui.js';
import { VERSION, BUILD_DATE } from '../version.js';
import { $app, st, rate, speak, cur, provOptions, CHAT_KEY, download } from '../core.js';
import { checkUpdate } from '../update.js';
import * as A from '../autobackup.js';
import { buildIcs } from '../ics.js';
import { evaluations, parseDay } from '../progress.js';

// ---------- ajustes ----------
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });
export function settingsPage() {
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
      <label>Endereço do app<input id="sbase" class="inp" value="${esc(/^(localhost|127\.)/.test(location.hostname) ? '' : location.origin + location.pathname)}" placeholder="https://seu-usuario.github.io/clarte/" autocomplete="off" spellcheck="false"></label>
      <button class="btn" id="slink">🔗 Copiar link de configuração</button><div id="slmsg"></div>
    </section>
    <section class="card"><h3>Voz</h3>
      <label class="chk-l"><input type="checkbox" id="svoice" ${s.voice !== false ? 'checked' : ''}> Ler as respostas do professor em voz alta</label>
      <label class="chk-l"><input type="checkbox" id="sslow" ${s.slow ? 'checked' : ''}> Voz mais devagar</label>
      <label>Microfone na conversa por voz<select id="smic" class="inp">
        <option value="rec" ${s.micMode !== 'web' ? 'selected' : ''}>Gravar e transcrever (recomendado)</option>
        <option value="web" ${s.micMode === 'web' ? 'selected' : ''}>Reconhecimento de voz do navegador</option></select></label>
      <label>Voz do professor<select id="sengine" class="inp">
        <option value="auto" ${(s.voiceEngine || 'auto') === 'auto' ? 'selected' : ''}>Automática (recomendado)</option>
        <option value="browser" ${s.voiceEngine === 'browser' ? 'selected' : ''}>Voz do aparelho</option>
        <option value="gemini" ${s.voiceEngine === 'gemini' ? 'selected' : ''}>Voz natural online (Gemini)</option></select></label>
      <label>Modelo da voz natural<select id="sttsm" class="inp">
        <option value="auto" ${!TTS_CANDIDATES.includes(s.ttsModel) ? 'selected' : ''}>Automático (recomendado)</option>
        ${TTS_CANDIDATES.map((m) => `<option value="${m}" ${s.ttsModel === m ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
      <small>Para saber qual modelo é mais rápido no seu aparelho, use Diagnóstico → Comparar vozes.</small>
      <button class="btn" id="stest">🔊 Testar voz</button>
      <div id="vstatus"></div>
      <small>${canTalk() ? '' : canRecord ? 'Para falar com a Clara neste aparelho, é preciso uma chave do Gemini (ou do Groq).' : 'Reconhecimento de fala indisponível: use o Chrome ou o Edge.'}</small>
    </section>
    <section class="card"><h3>Seus dados</h3>
      <p class="pt">Seu progresso fica só neste aparelho. <b>Se você desinstalar o app ou limpar os dados do navegador, ele some.</b> Guarde um backup de vez em quando (o app lembra a cada 7 dias): use Compartilhar para mandar o arquivo ao Google Drive, WhatsApp ou e-mail, e Importar para recuperar ou levar para outro aparelho.</p>
      <small id="sbk">${s.lastBackup ? 'Último backup: ' + esc(new Date(s.lastBackup).toLocaleString('pt-BR')) : 'Nenhum backup feito ainda.'} · Armazenamento protegido: <span id="spersist">verificando…</span></small>
      <label class="chk-l"><input type="checkbox" id="sbkkeys"> Incluir minha chave de IA no arquivo (guarde com cuidado)</label>
      <div class="row"><button class="btn primary" id="sshare">${I('send')} Compartilhar backup</button><button class="btn" id="sexport">${I('download')} Baixar</button><button class="btn" id="simport">${I('upload')} Importar</button></div>
      <input type="file" id="sfile" accept="application/json,.json" hidden>
      ${A.disponivel() ? `<hr><label class="chk-l"><input type="checkbox" id="sautoon" ${s.autoBackup !== false ? 'checked' : ''}> Backup automático em Documentos/Clarte (sobrevive à desinstalação, sem a chave de IA)</label>
      <small id="sautost">${esc(A.statusText())}</small>
      <div class="row"><button class="btn sm" id="sautonow">Fazer agora</button><button class="btn sm" id="sautorest">Restaurar do backup automático</button></div>
      <small>Depois de reinstalar o app, o Android pode não deixar ele ler o arquivo sozinho. Nesse caso use Importar e escolha Documentos → Clarte → clarte-backup.json.</small>` : ''}
    </section>
    <section class="card"><h3>Sobre</h3>
      <p>Clarté <b>v${VERSION}</b> · ${BUILD_DATE}</p>
      <div class="row"><button class="btn" id="supd">${I('refresh')} Verificar atualização</button><button class="btn" data-go="#/diag">${I('activity')} Diagnóstico</button></div>
      <div class="row"><button class="btn" data-go="#/folha">${I('file')} Folha de revisão</button><button class="btn" data-go="#/about">${I('shield')} Privacidade e créditos</button></div>
      <small>Sua chave e seu progresso ficam só neste aparelho. Nos planos gratuitos, os provedores de IA podem usar as conversas para melhorar os modelos.</small>
    </section>
    <section class="card"><h3>Meta diária</h3><label>Exercícios por dia<input id="sgoal" class="inp" type="number" min="5" max="100" value="${s.goal}"></label></section>
    <section class="card"><h3>Avaliações</h3><p class="pt">Se a professora mudar uma data, ajuste aqui: a contagem regressiva e a reta final seguem a próxima avaliação.</p>
      ${evaluations().map((e) => `<label>${esc(e.title)}<input class="inp" type="date" data-eval="${e.id}" value="${e.date}"></label>`).join('')}
      <div class="row"><button class="btn sm" id="sics">${I('calendar')} Lembretes no calendário</button><button class="btn sm" id="sevreset">Voltar às datas do curso</button></div>
      <small>O lembrete é um arquivo (.ics): ao abrir, o seu calendário cria um evento por avaliação futura, com alerta na véspera às 9h e no dia às 7h.</small></section>
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
  // data vazia ou inválida volta à data do curso
  document.querySelectorAll('[data-eval]').forEach((inp) => { inp.onchange = () => { const mine = { ...(st().settings.evalDates || {}) }; if (parseDay(inp.value)) mine[inp.dataset.eval] = inp.value; else delete mine[inp.dataset.eval]; S.setSetting('evalDates', mine); toast('Data salva.'); }; });
  on('sics', 'click', () => {
    const hoje = new Date(); const dia0 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const futuras = evaluations().filter((e) => { const d = parseDay(e.date); return d && d >= dia0; });
    if (!futuras.length) { toast('Não há avaliações futuras para lembrar.'); return; }
    download('clarte-avaliacoes.ics', buildIcs(futuras), 'text/calendar');
    toast('Arquivo gerado. Abra-o para adicionar ao seu calendário.');
  });
  on('sevreset', 'click', () => { S.setSetting('evalDates', {}); toast('Datas do curso restauradas.'); settingsPage(); });
  const paintVoice = () => {
    const el = document.getElementById('vstatus'); if (!el) return; const ei = engineInfo(); const hasKey = !!((st().settings.keys || {}).gemini);
    el.innerHTML = !canSpeak ? '<small>Este navegador não tem síntese de voz.</small>'
      : ei.engine === 'gemini' ? '<small>🎧 Usando a <b>voz natural do Gemini</b> (grátis). Frases novas levam 3–6 s para carregar; depois ficam guardadas no aparelho.</small>'
      : ei.hasFr ? `<small>✅ Voz francesa do aparelho: <b>${esc(frenchVoiceName())}</b>.</small>`
      : `<small style="color:var(--bad)">⚠️ Este aparelho <b>não tem voz francesa</b>: o áudio sai com sotaque brasileiro. ${hasKey ? 'Escolha “Voz natural online (Gemini)”.' : 'Opções: abrir o app no <b>Microsoft Edge</b> (PC), instalar a voz francesa no Android, ou salvar uma chave do Gemini (aba Clara) para usar a voz natural.'}</small>`;
  };
  paintVoice(); setTimeout(paintVoice, 700);
  on('smic', 'change', (e) => S.setSetting('micMode', e.target.value));
  on('sttsm', 'change', (e) => { S.setSetting('ttsModel', e.target.value); toast('Modelo da voz salvo.'); });
  on('sengine', 'change', (e) => { S.setSetting('voiceEngine', e.target.value); paintVoice(); });
  on('stest', 'click', () => speak('Bonjour ! Je m’appelle Clara. Comment allez-vous ?', { rate: rate() }));
  on('sinstall', 'click', async () => { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; settingsPage(); });
  on('supd', 'click', () => checkUpdate(true));
  (async () => { const el = document.getElementById('spersist'); if (!el) return; try { const p = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false; el.textContent = p ? 'sim' : 'não (faça backups)'; } catch (e) { el.textContent = 'desconhecido'; } })();
  // Compartilhar: abre a lista de apps do celular (Drive, WhatsApp, e-mail…). Sem suporte, baixa o arquivo. A data do backup só vale se o envio não foi cancelado.
  on('sshare', 'click', async () => {
    const nome = `clarte-progresso-${new Date().toLocaleDateString('sv-SE')}.json`; const incluir = document.getElementById('sbkkeys').checked;
    const texto = JSON.stringify(S.exportData({ includeKeys: incluir, mark: false }), null, 1);
    try {
      const arquivo = new File([texto], nome, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: 'Backup do Clarté', text: 'Backup do meu progresso no Clarté' });
        S.markBackup(); document.getElementById('sbk').textContent = 'Backup compartilhado agora.'; toast('Backup compartilhado.'); return;
      }
    } catch (e) { if (e && e.name === 'AbortError') { toast('Compartilhamento cancelado: o backup não foi guardado.'); return; } }
    download(nome, texto, 'application/json'); S.markBackup();
    document.getElementById('sbk').textContent = 'Este aparelho não compartilha arquivos: o backup foi baixado. Procure em Downloads.'; toast('Backup baixado.');
  });
  on('sexport', 'click', () => {
    const data = S.exportData({ includeKeys: document.getElementById('sbkkeys').checked });
    download(`clarte-progresso-${new Date().toLocaleDateString('sv-SE')}.json`, JSON.stringify(data, null, 1), 'application/json');
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
  // backup automático em Documentos/Clarte (só no app Android)
  const sautost = (t) => { const el = document.getElementById('sautost'); if (el) el.textContent = t || A.statusText(); };
  on('sautoon', 'change', async (e) => { S.setSetting('autoBackup', e.target.checked); sautost(); if (e.target.checked) { await A.autoBackup({ urgent: true }); sautost(); } });
  on('sautonow', 'click', async () => {
    const mais = await A.richerBackup({ fresh: true });
    if (mais && !confirm(`Já existe um backup com mais pontos (${mais.obj.state.xp || 0}) do que este app tem (${st().xp}). Substituir pelo estado atual?`)) return;
    sautost('Gravando…'); const r = await A.autoBackup({ force: true }); sautost();
    toast(r.estado === 'ok' ? 'Backup gravado em Documentos/Clarte ✅' : 'Não consegui gravar: ' + (r.erro || r.estado));
  });
  on('sautorest', 'click', async () => {
    const b = await A.findBackup();
    if (!b) { toast('Não consegui ler um backup automático. Use Importar e escolha o arquivo em Documentos → Clarte.'); return; }
    const quando = b.obj.exportedAt ? new Date(b.obj.exportedAt).toLocaleString('pt-BR') : 'data desconhecida';
    if (!confirm(`Substituir o progresso deste app pelo do backup (${quando}, ${b.obj.state.xp || 0} pontos)? Isso não pode ser desfeito.`)) return;
    A.restore(b); toast('Progresso restaurado ✅'); settingsPage();
  });
  on('sreset', 'click', () => { if (confirm('Apagar todo o progresso e os erros salvos?')) { S.resetAll(); try { localStorage.removeItem(CHAT_KEY); } catch (e) { /* ignore */ } settingsPage(); } });
}
