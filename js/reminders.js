// Lembrete diário de estudo (só no app Android, com o plugin LocalNotifications da casca nativa).
// Sempre ficam agendados os próximos 7 dias; ao abrir e ao sair do app o plano é refeito, e o lembrete de hoje some se você já estudou.
// No site e no navegador nada disso existe: tudo devolve "indisponível".
import * as S from './store.js';
import * as N from './native.js';

export const DIAS = 7;
export const IDS = [101, 102, 103, 104, 105, 106, 107]; // um por dia; 199 é o teste
const ID_TESTE = 199;
const CANAL = 'estudo';
export const NOME = 'LocalNotifications';
const MENSAGENS = [
  'Salut, Willy ! Alguns minutos de francês hoje mantêm a sua sequência.',
  'Hora do francês: um treino rápido de 5 minutos já conta.',
  'Que tal conversar um pouco com a Clara hoje?',
  'Revisar um pouco hoje ajuda a memória. Abra o Clarté.',
  'Vamos praticar francês, Willy ? Poucos minutos bastam.',
  'Pequenos passos todos os dias rendem mais do que estudar tudo de uma vez.',
  'Seu francês agradece: que tal um treino hoje?',
];
export const mensagem = (k) => MENSAGENS[((k % MENSAGENS.length) + MENSAGENS.length) % MENSAGENS.length];

const plugin = () => globalThis.Capacitor.Plugins[NOME];
export const disponivel = () => N.isNative() && N.hasPlugin(NOME);
export const horaValida = (h) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(h));
export function config() {
  const s = S.get().settings;
  return { ligado: s.reminder === true, hora: horaValida(s.reminderTime) ? s.reminderTime : '19:00' };
}

// Os próximos horários de lembrete: um por dia, na hora escolhida, a partir de agora.
// Hoje só entra se a hora ainda não passou (com 1 minuto de folga) e se você ainda não estudou.
export function planTimes(now, hhmm, estudouHoje, dias = DIAS) {
  const [h, m] = hhmm.split(':').map(Number); const out = [];
  for (let k = 0; out.length < dias && k <= dias + 1; k++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + k, h, m, 0, 0);
    if (at.getTime() <= now.getTime() + 60000) continue;
    if (k === 0 && estudouHoje) continue;
    out.push(at);
  }
  return out;
}

let ultimo = ''; // último plano enviado ao Android nesta sessão (evita reagendar à toa)
let resultado = { estado: 'nunca' };
export function esquecer() { ultimo = ''; resultado = { estado: 'nunca' }; } // recomeça do zero (usado nos testes)
const motivo = (e) => String((e && (e.message || e.errorMessage)) || e).replace(/\s+/g, ' ').slice(0, 120);

// Refaz os agendamentos. pedirPermissao: só quando você acabou de ligar o lembrete (o Android 13+ pergunta uma vez).
export async function sync({ pedirPermissao = false } = {}) {
  if (!disponivel()) return (resultado = { estado: 'indisponivel' });
  const cfg = config(); const LN = plugin();
  try {
    if (!cfg.ligado) {
      if (ultimo !== 'off') { await LN.cancel({ notifications: IDS.map((id) => ({ id })) }); ultimo = 'off'; }
      return (resultado = { estado: 'desligado' });
    }
    let perm = await LN.checkPermissions();
    if (perm.display !== 'granted') {
      if (!pedirPermissao) return (resultado = { estado: 'sem-permissao' });
      perm = await LN.requestPermissions();
      if (perm.display !== 'granted') return (resultado = { estado: 'negado' });
    }
    const agora = new Date(Date.now()); const quando = planTimes(agora, cfg.hora, S.studiedToday(agora));
    const chave = `${cfg.hora}|${quando.map((d) => d.getTime()).join(',')}`;
    if (chave === ultimo && !pedirPermissao) return resultado;
    await LN.cancel({ notifications: IDS.map((id) => ({ id })) });
    try { await LN.createChannel({ id: CANAL, name: 'Lembrete de estudo', description: 'Um aviso por dia para estudar francês', importance: 3 }); } catch (e) { /* o canal padrão serve */ }
    if (quando.length) {
      await LN.schedule({ notifications: quando.map((at, i) => ({
        id: IDS[i], title: 'Clarté', body: mensagem(at.getDate() + at.getMonth()), channelId: CANAL,
        schedule: { at, allowWhileIdle: true }, isExactNotification: false, // aviso de estudo não precisa de hora exata (e não abre a tela de "Alarmes e lembretes")
      })) });
    }
    ultimo = chave; return (resultado = { estado: 'ok', proximo: quando[0] || null, total: quando.length });
  } catch (e) { return (resultado = { estado: 'erro', erro: motivo(e) }); }
}

// notificação de teste, daqui a `seg` segundos
export async function testar(seg = 8) {
  if (!disponivel()) return { estado: 'indisponivel' };
  try {
    const LN = plugin(); let perm = await LN.checkPermissions();
    if (perm.display !== 'granted') perm = await LN.requestPermissions();
    if (perm.display !== 'granted') return { estado: 'negado' };
    try { await LN.createChannel({ id: CANAL, name: 'Lembrete de estudo', description: 'Um aviso por dia para estudar francês', importance: 3 }); } catch (e) { /* ok */ }
    await LN.schedule({ notifications: [{ id: ID_TESTE, title: 'Clarté', body: 'Teste: os lembretes de estudo estão funcionando.', channelId: CANAL, schedule: { at: new Date(Date.now() + seg * 1000), allowWhileIdle: true }, isExactNotification: false }] });
    return { estado: 'ok' };
  } catch (e) { return { estado: 'erro', erro: motivo(e) }; }
}

export function statusText() {
  if (!N.isNative()) return '';
  if (!N.hasPlugin(NOME)) return 'Este app foi instalado antes dos lembretes. No PC, abra o projeto no Android Studio e aperte ▶ Run de novo (o progresso é mantido).';
  const cfg = config(); const r = resultado;
  if (!cfg.ligado) return 'Desligado.';
  if (r.estado === 'sem-permissao' || r.estado === 'negado') return 'O Android não deixou o Clarté mostrar notificações. Libere em Configurações → Apps → Clarté → Notificações.';
  if (r.estado === 'erro') return `Não consegui agendar: ${r.erro}`;
  if (r.estado === 'ok' && r.proximo) return `Próximo lembrete: ${r.proximo.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })} às ${cfg.hora}. Se você estudar antes, o aviso do dia é cancelado.`;
  if (r.estado === 'ok') return 'Ligado, sem horário futuro agora.';
  return `Ligado para as ${cfg.hora}.`;
}

// linhas { estado, nome, detalhe } para o Diagnóstico (dentro do app)
export async function diagnose() {
  if (!N.isNative()) return [];
  if (!N.hasPlugin(NOME)) return [{ estado: 'warn', nome: 'Lembretes diários', detalhe: 'o plugin de notificações não está neste app: abra no Android Studio e aperte ▶ Run de novo' }];
  const out = []; const LN = plugin();
  try {
    const p = await LN.checkPermissions(); const pend = await LN.getPending();
    const n = ((pend && pend.notifications) || []).length; const cfg = config();
    out.push({ estado: p.display === 'granted' ? 'ok' : 'warn', nome: 'Notificações do Android', detalhe: p.display === 'granted' ? 'permitidas' : `não permitidas (${p.display})` });
    out.push({ estado: cfg.ligado ? (n ? 'ok' : 'warn') : 'ok', nome: 'Lembretes diários', detalhe: cfg.ligado ? `ligados para as ${cfg.hora} · ${n} agendado(s)` : 'desligados em Ajustes' });
  } catch (e) { out.push({ estado: 'fail', nome: 'Lembretes diários', detalhe: motivo(e) }); }
  return out;
}

export function startReminders() {
  if (!disponivel()) return;
  const rodar = () => { sync().catch(() => {}); };
  // unref: nos testes (Node) o temporizador não segura o processo; no navegador o número devolvido não tem unref
  const a = setTimeout(rodar, 4000); if (a && a.unref) a.unref();
  document.addEventListener('visibilitychange', rodar);
}
