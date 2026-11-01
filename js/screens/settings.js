// Ajustes: uma lista que abre subtelas (Professora Clara, Voz, Estudo, Seus dados, Avaliações e Sobre).
// Cada subtela começa com o estado em linguagem simples; o que é técnico fica numa sanfona "Avançado".
import { canTalk, canRecord, canSpeak, engineInfo, frenchVoiceName, nativeVoiceInfo, openVoiceInstall, recheckNativeVoice, deviceVoiceTest, TTS_CANDIDATES } from '../speech.js';
import * as S from '../store.js';
import * as T from '../tutor.js';
import { esc, I, toast, linha, estado, opcao } from '../ui.js';
import { VERSION, BUILD_DATE } from '../version.js';
import { $app, st, rate, speak, cur, CHAT_KEY, download } from '../core.js';
import { checkUpdate } from '../update.js';
import * as A from '../autobackup.js';
import * as N from '../native.js';
import * as R from '../reminders.js';
import { buildIcs } from '../ics.js';
import { evaluations, nextEvaluation, parseDay } from '../progress.js';

let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });

const dm = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7);
const quandoBr = (iso) => new Date(iso).toLocaleString('pt-BR');
const avancado = (corpo, titulo = 'Avançado') => `<details class="acc"><summary>${I('adjustments')} ${titulo}</summary><div class="acc-corpo">${corpo}</div></details>`;
const nomeCurto = (label) => label.replace(/^Google /, '');
// próxima avaliação em uma frase (a mesma na lista e na subtela)
const proximaAvaliacao = () => { const nx = nextEvaluation(); return !nx ? 'Nenhuma avaliação marcada' : nx.days > 1 ? `${nx.ev.title} em ${nx.days} dias (${dm(nx.ev.date)})` : nx.days === 1 ? `${nx.ev.title} é amanhã` : `Hoje é a ${nx.ev.title}`; };

// ---------- lista ----------
function resumoVoz() {
  const s = st().settings; const ei = engineInfo();
  if (s.voice === false) return 'Leitura em voz alta desligada';
  return ei.pausa ? 'Voz natural em pausa, usando a do aparelho' : ei.engine === 'gemini' ? 'Voz natural do Gemini' : ei.hasFr ? 'Voz francesa do aparelho' : 'Este aparelho não tem voz francesa';
}
function listaHtml() {
  const s = st().settings; const c = cur();
  const estudo = `Meta de ${s.goal} exercícios por dia` + (N.isNative() && R.disponivel() ? (s.reminder ? ` · lembrete às ${R.config().hora}` : ' · lembrete desligado') : '');
  const backup = s.lastBackup ? `Último backup em ${new Date(s.lastBackup).toLocaleDateString('pt-BR')}` : 'Backup ainda não feito';
  return `
    <header class="apphead"><button class="back" data-go="#/perfil" aria-label="Voltar">${I('chevron-left')}</button><div class="hello"><b>Ajustes</b><small>Toque numa linha para abrir</small></div></header>
    <div class="grupo">
      ${linha({ icone: 'sparkles', titulo: 'Professora Clara', resumo: `${nomeCurto(c.def.label)} · ${c.key ? 'chave salva' : 'falta a chave'}`, go: '#/settings/ia' })}
      ${linha({ icone: 'volume', titulo: 'Voz', resumo: resumoVoz(), go: '#/settings/voz' })}
      ${linha({ icone: 'target', titulo: 'Estudo', resumo: estudo, go: '#/settings/estudo' })}
      ${linha({ icone: 'calendar-event', titulo: 'Avaliações', resumo: proximaAvaliacao(), go: '#/settings/avaliacoes' })}
    </div>
    <div class="grupo">
      ${linha({ icone: 'shield-check', titulo: 'Seus dados', resumo: backup, go: '#/settings/dados' })}
      ${linha({ icone: 'info-circle', titulo: 'Sobre', resumo: `Versão ${VERSION}, diagnóstico e privacidade`, go: '#/settings/sobre' })}
    </div>`;
}

// ---------- subtelas: HTML ----------
const iaTopo = () => {
  const c = cur();
  return c.key ? estado('ok', 'circle-check', 'A Clara está pronta', `Usando ${esc(c.def.label)}, modelo ${esc(c.model)}.`)
    : estado('aviso', 'alert-circle', 'Falta a chave da IA', `Sem a chave de ${esc(c.def.label)} a Clara não conversa. Veja logo abaixo como conseguir uma, de graça.`);
};
function iaHtml() {
  const c = cur();
  const origem = /^(localhost|127\.)/.test(location.hostname) ? '' : location.origin + location.pathname;
  return `<div id="iatopo">${iaTopo()}</div>
    <section class="card"><h3>Qual IA usar</h3>
      <div class="abas" role="radiogroup" aria-label="Provedor da IA" id="sprov">${Object.entries(T.PROVIDERS).map(([id, v]) => `<button type="button" role="radio" aria-checked="${id === c.p}" data-prov="${id}">${esc(nomeCurto(v.label))}</button>`).join('')}</div>
      <label>Chave (fica só neste aparelho)<input id="skey" class="inp" type="password" value="${esc(c.key)}" placeholder="${esc(c.def.keyHint)}" autocomplete="off"></label>
    </section>
    <details class="acc"><summary>${I('help-circle')} Como conseguir uma chave</summary><div class="acc-corpo"><p class="pt">${esc(c.def.how)}</p></div></details>
    <details class="acc"><summary>${I('share-3')} Usar em outro aparelho</summary><div class="acc-corpo">
      <small>Gera um link que salva a chave sozinho (sem digitar). Cole o endereço do app publicado, copie o link e mande para você mesmo (ex.: WhatsApp). Não compartilhe esse link com ninguém: quem abrir recebe a sua chave.</small>
      <label>Endereço do app<input id="sbase" class="inp" value="${esc(origem)}" placeholder="https://seu-usuario.github.io/clarte/" autocomplete="off" spellcheck="false"></label>
      <button class="btn wide" id="slink">${I('share-3')} Copiar link de configuração</button><div id="slmsg"></div></div></details>
    ${avancado(`<label>Modelo<input id="smodel" class="inp" list="mlist" value="${esc(c.model)}" autocomplete="off" spellcheck="false"><datalist id="mlist"></datalist></label>
      <div class="row"><button class="btn sm" id="sload">${I('refresh')} Carregar modelos</button><button class="btn sm" id="sdef">Usar o padrão</button></div>
      <div id="smsg"><small>Limites gratuitos mudam e podem barrar por alguns minutos (erro 429). Planos gratuitos podem usar suas conversas para melhorar os modelos: não escreva dados pessoais sensíveis.</small></div>`)}`;
}

function vozHtml() {
  const s = st().settings;
  const semMic = canTalk() ? '' : estado('aviso', 'microphone', 'Falar com a Clara', canRecord ? 'Para falar com a Clara neste aparelho, é preciso uma chave do Gemini (ou do Groq).' : 'Reconhecimento de fala indisponível: use o Chrome ou o Edge.');
  return `<div id="vstatus"></div>${semMic}
    <div class="grupo">
      ${opcao({ id: 'svoice', titulo: 'Ler as respostas em voz alta', resumo: 'A Clara fala o que escreve', marcado: s.voice !== false })}
      ${opcao({ id: 'sslow', titulo: 'Voz mais devagar', resumo: 'Bom para entender cada palavra', marcado: !!s.slow })}
    </div>
    <section class="card"><label>Tamanho do texto na ligação<select id="sctext" class="inp">
        <option value="p" ${s.callText === 'p' ? 'selected' : ''}>Pequeno</option>
        <option value="m" ${!['p', 'g'].includes(s.callText) ? 'selected' : ''}>Médio (padrão)</option>
        <option value="g" ${s.callText === 'g' ? 'selected' : ''}>Grande</option></select></label></section>
    <button class="btn wide" id="stest">${I('volume')} Testar a voz</button>
    <div class="spc"></div>
    ${avancado(`<label>Voz do professor<select id="sengine" class="inp">
        <option value="auto" ${(s.voiceEngine || 'auto') === 'auto' ? 'selected' : ''}>Automática (recomendado)</option>
        <option value="browser" ${s.voiceEngine === 'browser' ? 'selected' : ''}>Voz do aparelho</option>
        <option value="gemini" ${s.voiceEngine === 'gemini' ? 'selected' : ''}>Voz natural online (Gemini)</option></select></label>
      <label>Modelo da voz natural<select id="sttsm" class="inp">
        <option value="auto" ${!TTS_CANDIDATES.includes(s.ttsModel) ? 'selected' : ''}>Automático (recomendado)</option>
        ${TTS_CANDIDATES.map((m) => `<option value="${m}" ${s.ttsModel === m ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
      <small>Para saber qual modelo é mais rápido no seu aparelho, use Sobre → Diagnóstico → Comparar vozes.</small>
      <label>Microfone na conversa por voz<select id="smic" class="inp">
        <option value="rec" ${s.micMode !== 'web' ? 'selected' : ''}>Gravar e transcrever (recomendado)</option>
        <option value="web" ${s.micMode === 'web' ? 'selected' : ''}>Reconhecimento de voz do navegador</option></select></label>`)}`;
}

function estudoHtml() {
  const s = st().settings;
  const lembrete = N.isNative() ? `<section class="card"><h3>Lembrete diário</h3>
      ${R.disponivel() ? `<p class="pt">Uma notificação por dia, na hora que você escolher, só se você ainda não tiver estudado.</p>
      <div class="grupo sem-borda">${opcao({ id: 'srem', titulo: 'Lembrar de estudar', marcado: !!s.reminder })}</div>
      <label>Horário<input type="time" id="sremt" class="inp" value="${esc(R.config().hora)}"></label>
      <div class="row"><button class="btn sm" id="sremtest">Enviar um teste (em 8 segundos)</button></div>` : ''}
      <small id="sremst">${esc(R.statusText())}</small></section>` : '';
  return `${estado('info', 'target', `Hoje: ${Math.min(st().today.n, s.goal)} de <span id="estmeta">${s.goal}</span> exercícios`, 'A meta diária define a barra do cartão Continuar na Trilha.')}
    <section class="card"><h3>Meta diária</h3><label>Exercícios por dia<input id="sgoal" class="inp" type="number" inputmode="numeric" min="5" max="100" value="${s.goal}"></label></section>
    ${lembrete}`;
}

function dadosHtml() {
  const s = st().settings;
  const topo = s.lastBackup ? estado('ok', 'shield-check', 'Seu progresso tem backup', `<span id="sbk">Último backup: ${esc(quandoBr(s.lastBackup))}</span>`)
    : estado('aviso', 'alert-circle', 'Você ainda não fez backup', '<span id="sbk">Nenhum backup feito ainda.</span>');
  const auto = A.disponivel() ? `<section class="card"><h3>Backup automático</h3>
      <div class="grupo sem-borda">${opcao({ id: 'sautoon', titulo: 'Guardar em Documentos/Clarte', resumo: 'Sobrevive à desinstalação, sem a chave de IA', marcado: s.autoBackup !== false })}</div>
      <small id="sautost">${esc(A.statusText())}</small>
      <div class="row"><button class="btn sm" id="sautonow">Fazer agora</button><button class="btn sm" id="sautorest">Restaurar</button></div>
      <small>Depois de reinstalar o app, o Android pode não deixar ele ler o arquivo sozinho. Nesse caso use Importar e escolha Documentos → Clarte → clarte-backup.json.</small></section>` : '';
  return `${topo}
    <section class="card"><p class="pt">Seu progresso fica só neste aparelho. <b>Se você desinstalar o app ou limpar os dados do navegador, ele some.</b> Guarde um backup de vez em quando (o app lembra a cada 7 dias): use Compartilhar para mandar o arquivo ao Google Drive, WhatsApp ou e-mail, e Importar para recuperar ou levar para outro aparelho.</p>
      <button class="btn primary wide" id="sshare">${I('send')} Compartilhar backup</button>
      <div class="row"><button class="btn" id="sexport">${I('download')} Baixar</button><button class="btn" id="simport">${I('upload')} Importar</button></div>
      <input type="file" id="sfile" accept="application/json,.json" hidden></section>
    ${auto}
    ${avancado(`<div class="grupo sem-borda">${opcao({ id: 'sbkkeys', titulo: 'Incluir minha chave de IA no arquivo', resumo: 'Guarde o arquivo com cuidado' })}</div>
      <small>Armazenamento protegido neste aparelho: <span id="spersist">verificando…</span></small>
      <hr><button class="btn danger wide" id="sreset">${I('trash')} Zerar progresso</button>`)}`;
}

const avTexto = () => proximaAvaliacao();
function avaliacoesHtml() {
  return `${estado('info', 'calendar-event', `<span id="avtxt">${esc(avTexto())}</span>`, 'A contagem regressiva e a reta final seguem a próxima avaliação.')}
    <section class="card"><p class="pt">Se a professora mudar uma data, ajuste aqui.</p>
      ${evaluations().map((e) => `<label>${esc(e.title)}<input class="inp" type="date" data-eval="${e.id}" value="${e.date}"></label>`).join('')}
      <div class="row"><button class="btn sm" id="sics">${I('calendar')} Lembretes no calendário</button><button class="btn sm" id="sevreset">Voltar às datas do curso</button></div>
      <small>O lembrete é um arquivo (.ics): ao abrir, o seu calendário cria um evento por avaliação futura, com alerta na véspera às 9h e no dia às 7h.</small></section>`;
}

function sobreHtml() {
  return `${estado('info', 'info-circle', `Clarté v${VERSION}`, esc(BUILD_DATE))}
    <div class="grupo">
      <button class="linha" id="supd"><span class="linha-i">${I('refresh')}</span><span class="linha-t"><b>Verificar atualização</b></span></button>
      ${linha({ icone: 'activity', titulo: 'Diagnóstico do aparelho', go: '#/diag' })}
      ${linha({ icone: 'file-text', titulo: 'Folha de revisão', go: '#/folha' })}
      ${linha({ icone: 'shield', titulo: 'Privacidade e créditos', go: '#/about' })}
    </div>
    ${deferredInstall ? `<button class="btn primary wide" id="sinstall">${I('download')} Instalar no aparelho</button>` : '<small>No Android: menu ⋮ do Chrome → “Instalar app”.</small>'}
    <p><small>Sua chave e seu progresso ficam só neste aparelho. Nos planos gratuitos, os provedores de IA podem usar as conversas para melhorar os modelos.</small></p>`;
}

const SUBS = {
  ia: { titulo: 'Professora Clara', sub: 'IA, chave e modelo', html: iaHtml },
  voz: { titulo: 'Voz', sub: 'Fala da Clara e microfone', html: vozHtml },
  estudo: { titulo: 'Estudo', sub: 'Meta e lembrete diário', html: estudoHtml },
  dados: { titulo: 'Seus dados', sub: 'Backup e restauração', html: dadosHtml },
  avaliacoes: { titulo: 'Avaliações', sub: 'Datas e calendário', html: avaliacoesHtml },
  sobre: { titulo: 'Sobre', sub: 'Versão, diagnóstico e privacidade', html: sobreHtml },
};

export function settingsPage(sub) {
  const def = SUBS[sub];
  if (!def) { $app.innerHTML = listaHtml(); return; }
  $app.innerHTML = `<header class="apphead"><button class="back" data-go="#/settings" aria-label="Voltar">${I('chevron-left')}</button><div class="hello"><b>${def.titulo}</b><small>${def.sub}</small></div></header>${def.html()}`;
  ({ ia: wireIa, voz: wireVoz, estudo: wireEstudo, dados: wireDados, avaliacoes: wireAvaliacoes, sobre: wireSobre })[sub](sub);
}

const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };

// ---------- subtelas: ligações ----------
function wireIa(sub) {
  const c = cur();
  document.querySelectorAll('[data-prov]').forEach((b) => b.addEventListener('click', () => { S.setSetting('provider', b.dataset.prov); settingsPage(sub); }));
  on('skey', 'change', (e) => { S.setKey(c.p, e.target.value.trim()); document.getElementById('iatopo').innerHTML = iaTopo(); });
  on('smodel', 'change', (e) => S.setModel(c.p, e.target.value.trim() || c.def.model));
  on('slink', 'click', async () => {
    const msg = document.getElementById('slmsg'); let base = document.getElementById('sbase').value.trim();
    const key = (cur().key || '').trim();
    if (!key) { msg.innerHTML = '<small>Salve primeiro a chave do provedor atual.</small>'; return; }
    if (!/^https:\/\/.+/.test(base)) { msg.innerHTML = '<small style="color:var(--bad)">Cole o endereço https:// do app publicado.</small>'; return; }
    base = base.split('#')[0].replace(/\/?$/, '/');
    const link = `${base}#/setup/${cur().p}/${encodeURIComponent(key)}`;
    try { await navigator.clipboard.writeText(link); msg.innerHTML = '<small>Link copiado. Abra-o no outro aparelho uma vez.</small>'; }
    catch (e) { msg.innerHTML = '<small>Não consegui copiar automaticamente. Selecione e copie:</small><input class="inp" readonly value="' + esc(link) + '" onfocus="this.select()">'; }
  });
  on('sdef', 'click', () => { S.setModel(c.p, c.def.model); settingsPage(sub); });
  on('sload', 'click', async () => {
    const msg = document.getElementById('smsg'); const key = document.getElementById('skey').value.trim();
    if (!key) { msg.innerHTML = '<small>Cole a chave primeiro.</small>'; return; }
    S.setKey(c.p, key); msg.innerHTML = '<small>Carregando…</small>';
    try {
      const list = await T.listModels(c.p, key);
      document.getElementById('mlist').innerHTML = list.map((m) => `<option value="${esc(m)}">`).join('');
      msg.innerHTML = `<small>Chave válida. ${list.length} modelos: toque no campo “Modelo” para escolher.</small>`;
    } catch (e) { msg.innerHTML = `<small style="color:var(--bad)">${esc(T.friendlyError(e))}</small>`; }
  });
}

function wireVoz() {
  on('svoice', 'change', (e) => S.setSetting('voice', e.target.checked));
  on('sslow', 'change', (e) => S.setSetting('slow', e.target.checked));
  const paintVoice = () => {
    const el = document.getElementById('vstatus'); if (!el) return; const ei = engineInfo(); const hasKey = !!((st().settings.keys || {}).gemini); const nv = nativeVoiceInfo();
    const quando = ei.pausa ? (ei.pausa.motivo === 'dia' ? 'à meia-noite do horário do Pacífico (por volta das 4h–5h da manhã aqui)' : `em ${Math.max(1, Math.ceil((ei.pausa.ate - Date.now()) / 60000))} min`) : '';
    const instalar = nv.plugin ? 'Toque em “Instalar ou atualizar a voz francesa”.' : '';
    const semFr = `Este aparelho <b>não tem voz francesa</b>: o áudio sai com sotaque brasileiro. ${nv.plugin ? instalar : hasKey ? 'Escolha “Voz natural online (Gemini)” em Avançado.' : 'Opções: abrir o app no <b>Microsoft Edge</b> (PC), instalar a voz francesa no Android, ou salvar uma chave do Gemini (aba Clara) para usar a voz natural.'}`;
    const card = !canSpeak && !nv.plugin ? estado('erro', 'volume', 'Sem voz neste navegador', 'Este navegador não tem síntese de voz.')
      : ei.engine === 'gemini' ? estado(ei.hasFr ? 'ok' : 'aviso', 'headphones', 'Usando a voz natural do Gemini', 'Grátis, com limite pequeno (cerca de 10 frases por dia por modelo). Passado o limite, o app volta sozinho para a voz do aparelho.' + (ei.hasFr ? '' : ` <b>Este aparelho não tem voz francesa</b>: com ela o app não depende do limite. ${instalar}`))
      : ei.hasFr ? estado('ok', 'circle-check', 'Voz francesa do aparelho', `<b>${esc(frenchVoiceName())}</b>. Sem limite de uso e funciona sem internet.`)
      : estado('erro', 'alert-circle', 'Falta a voz francesa', semFr);
    const pausa = ei.pausa ? estado('aviso', 'clock', 'Voz natural do Gemini em pausa', `O limite gratuito acabou${ei.pausa.detalhe ? ' (' + esc(ei.pausa.detalhe) + ')' : ''}. Ela volta ${quando}. Enquanto isso o app usa a voz do aparelho.`) : '';
    const antigo = N.isNative() && !nv.plugin ? estado('info', 'info-circle', 'Voz do Android indisponível', 'Este app foi instalado antes da voz do Android (sem limite de uso). Para ativá-la, reinstale o app pelo Android Studio (▶ Run): o progresso é mantido.') : '';
    const botoes = nv.plugin ? `<div class="row"><button class="btn sm" id="sinstvoz">${I('download')} Instalar ou atualizar a voz francesa</button><button class="btn sm" id="stestapar">${I('volume')} Testar a voz do aparelho</button></div>` : '';
    el.innerHTML = card + pausa + antigo + botoes;
  };
  paintVoice(); setTimeout(paintVoice, 700);
  on('smic', 'change', (e) => S.setSetting('micMode', e.target.value));
  on('sctext', 'change', (e) => S.setSetting('callText', e.target.value));
  on('sttsm', 'change', (e) => { S.setSetting('ttsModel', e.target.value); toast('Modelo da voz salvo.'); });
  on('sengine', 'change', (e) => { S.setSetting('voiceEngine', e.target.value); paintVoice(); });
  on('vstatus', 'click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'sinstvoz') {
      if (!(await openVoiceInstall())) { toast('Não consegui abrir a instalação de voz. Veja Configurações do Android → Saída de texto para voz.'); return; }
      const aoVoltar = async () => { if (document.hidden) return; document.removeEventListener('visibilitychange', aoVoltar); await recheckNativeVoice(); paintVoice(); };
      document.addEventListener('visibilitychange', aoVoltar);
    }
    if (b.id === 'stestapar') {
      b.disabled = true; const r = await deviceVoiceTest(); b.disabled = false;
      toast(r.ok ? `Voz do aparelho ok (${r.via}). Se você ouviu a frase, está tudo certo.` : `Não saiu som (${r.via}${r.erro ? ': ' + r.erro : ''}). Instale a voz francesa.`);
    }
  });
  on('stest', 'click', () => speak('Bonjour ! Je m’appelle Clara. Comment allez-vous ?', { rate: rate() }));
}

function wireEstudo() {
  on('sgoal', 'change', (e) => { const g = Math.max(5, +e.target.value || 20); S.setSetting('goal', g); const m = document.getElementById('estmeta'); if (m) m.textContent = g; });
  // lembrete diário (só no app Android com o plugin de notificações)
  const sremst = () => { const el = document.getElementById('sremst'); if (el) el.textContent = R.statusText(); };
  if (R.disponivel()) R.sync().then(sremst);
  on('srem', 'change', async (e) => {
    const box = e.target; S.setSetting('reminder', box.checked);
    const r = await R.sync({ pedirPermissao: box.checked });
    if (box.checked && (r.estado === 'negado' || r.estado === 'sem-permissao')) { box.checked = false; S.setSetting('reminder', false); await R.sync(); toast('O Android não deixou o Clarté mostrar notificações. Libere em Configurações → Apps → Clarté → Notificações.'); }
    sremst();
  });
  on('sremt', 'change', async (e) => {
    if (!R.horaValida(e.target.value)) { e.target.value = R.config().hora; return; }
    S.setSetting('reminderTime', e.target.value); await R.sync(); sremst();
  });
  on('sremtest', 'click', async () => {
    const r = await R.testar(8);
    toast(r.estado === 'ok' ? 'Teste enviado: ele aparece em 8 segundos (pode sair do app).' : r.estado === 'negado' ? 'O Android não deixou mostrar notificações. Libere em Configurações → Apps → Clarté → Notificações.' : 'Não consegui enviar o teste: ' + (r.erro || r.estado));
  });
}

function wireDados(sub) {
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
      S.importData(obj); toast('Progresso restaurado ✅'); settingsPage(sub);
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
    A.restore(b); toast('Progresso restaurado ✅'); settingsPage(sub);
  });
  on('sreset', 'click', () => { if (confirm('Apagar todo o progresso e os erros salvos?')) { S.resetAll(); try { localStorage.removeItem(CHAT_KEY); } catch (e) { /* ignore */ } settingsPage(sub); } });
}

function wireAvaliacoes(sub) {
  const pinta = () => { const el = document.getElementById('avtxt'); if (el) el.textContent = avTexto(); };
  // data vazia ou inválida volta à data do curso
  document.querySelectorAll('[data-eval]').forEach((inp) => { inp.onchange = () => { const mine = { ...(st().settings.evalDates || {}) }; if (parseDay(inp.value)) mine[inp.dataset.eval] = inp.value; else delete mine[inp.dataset.eval]; S.setSetting('evalDates', mine); pinta(); toast('Data salva.'); }; });
  on('sics', 'click', () => {
    const hoje = new Date(); const dia0 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const futuras = evaluations().filter((e) => { const d = parseDay(e.date); return d && d >= dia0; });
    if (!futuras.length) { toast('Não há avaliações futuras para lembrar.'); return; }
    download('clarte-avaliacoes.ics', buildIcs(futuras), 'text/calendar');
    toast('Arquivo gerado. Abra-o para adicionar ao seu calendário.');
  });
  on('sevreset', 'click', () => { S.setSetting('evalDates', {}); toast('Datas do curso restauradas.'); settingsPage(sub); });
}

function wireSobre(sub) {
  on('supd', 'click', () => checkUpdate(true));
  on('sinstall', 'click', async () => { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; settingsPage(sub); });
}
