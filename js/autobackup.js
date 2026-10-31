// Backup automático do progresso em Documentos/Clarte (só no app Android; no site tudo isto fica inativo).
// A pasta Documentos sobrevive à desinstalação do app. O arquivo não leva a chave de IA.
// Regras de segurança: nunca grava um app vazio por cima de um backup, nunca troca um backup por outro com menos pontos
// (só o botão "Fazer agora" força) e guarda uma cópia do dia anterior (clarte-backup-anterior.json).
import * as S from './store.js';
import * as N from './native.js';

const META = 'fr_autobackup'; // só deste aparelho: não entra no backup
const SKIP = 'fr_restore_skip'; // backup que você disse "agora não"
const MIN_GAP = 2 * 60 * 1000;
let busy = false; let achado = { t: 0, b: null };

const lerMeta = () => { try { return JSON.parse(localStorage.getItem(META)) || {}; } catch (e) { return {}; } };
const gravarMeta = (m) => { try { localStorage.setItem(META, JSON.stringify(m)); } catch (e) { /* ignore */ } };
const dia = (iso) => String(iso || '').slice(0, 10);
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').slice(0, 13).replace('T', '-');

export const disponivel = () => N.canBackup();
export const ligado = () => N.canBackup() && S.get().settings.autoBackup !== false;

// muda quando o conteúdo muda; a data do backup e a hora da exportação ficam de fora
export function signature(data) {
  const st = { ...data.state }; delete st.lastBackup;
  const txt = JSON.stringify({ s: st, c: data.chats });
  let h = 2166136261; for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `${txt.length}:${(h >>> 0).toString(16)}`;
}

// lê um arquivo de backup e confere se é do Clarté; null se não existe, não dá para ler ou não é válido
export async function lerValido(nome) {
  const texto = await N.readBackupFile(nome); if (!texto) return null;
  try { const obj = JSON.parse(texto); return S.validateBackup(obj) ? null : { obj, texto, nome }; } catch (e) { return null; }
}
const nomesPossiveis = async () => [...new Set([N.BACKUP_FILE, N.BACKUP_PREV, ...(await N.listBackupFiles())])];

// o backup mais recente (pela data de exportação) entre os que este app consegue ler
export async function findBackup() {
  if (!N.canBackup()) return null;
  const lidos = (await Promise.all((await nomesPossiveis()).map(lerValido))).filter(Boolean);
  lidos.sort((a, b) => (Date.parse(b.obj.exportedAt) || 0) - (Date.parse(a.obj.exportedAt) || 0));
  return lidos[0] || null;
}
// existe um backup com mais pontos do que o deste app? (app reinstalado ou dados perdidos)
export async function richerBackup({ fresh = false } = {}) {
  if (!N.canBackup()) return null;
  if (!fresh && Date.now() - achado.t < 30000) return achado.b;
  const b = await findBackup(); const mais = b && (b.obj.state.xp || 0) > S.get().xp ? b : null;
  achado = { t: Date.now(), b: mais }; return mais;
}
export const dismissed = (b) => { try { return localStorage.getItem(SKIP) === String(b.obj.exportedAt); } catch (e) { return false; } };
export function dismiss(b) { try { localStorage.setItem(SKIP, String(b.obj.exportedAt)); } catch (e) { /* ignore */ } }
export function restore(b) { S.importData(b.obj); achado = { t: 0, b: null }; gravarMeta({}); }

// Grava se houver o que gravar. force: ignora o desligado, o intervalo mínimo e a proteção de backup maior.
// urgent: ignora só o intervalo mínimo (usado ao sair do app).
export async function autoBackup({ force = false, urgent = false } = {}) {
  if (busy) return { estado: 'ocupado' };
  if (!N.canBackup()) return { estado: 'indisponivel' };
  if (!force && S.get().settings.autoBackup === false) return { estado: 'desligado' };
  if (!force && !S.hasProgress()) return { estado: 'vazio' };
  busy = true; const m = lerMeta();
  try {
    const data = S.exportData({ mark: false }); const sig = signature(data);
    if (!force) {
      if (m.ok && m.sig === sig) return { estado: 'sem-mudancas' };
      if (!urgent && m.tentou && Date.now() - m.tentou < MIN_GAP) return { estado: 'cedo' };
    }
    const atual = await lerValido(N.BACKUP_FILE);
    if (!force && atual && (atual.obj.state.xp || 0) > S.get().xp) { gravarMeta({ ...m, ok: false, motivo: 'maior', xpBackup: atual.obj.state.xp, tentou: Date.now() }); return { estado: 'maior', xp: atual.obj.state.xp }; }
    // o backup de ontem vira "anterior" (um erro de hoje não apaga as duas cópias)
    if (atual && dia(atual.obj.exportedAt) !== dia(data.exportedAt)) { try { await N.writeBackupFile(N.BACKUP_PREV, atual.texto); } catch (e) { /* sem cópia anterior desta vez */ } }
    const texto = JSON.stringify(data, null, 1); let nome = N.BACKUP_FILE;
    // arquivo criado por uma instalação anterior pode não aceitar sobrescrita: grava com outro nome
    try { await N.writeBackupFile(nome, texto); } catch (e) { nome = `clarte-backup-${stamp()}.json`; await N.writeBackupFile(nome, texto); }
    S.markBackup(); achado = { t: 0, b: null };
    gravarMeta({ sig, ok: true, quando: new Date().toISOString(), nome, tentou: Date.now() });
    return { estado: 'ok', nome };
  } catch (e) {
    const erro = String((e && e.message) || e).replace(/\s+/g, ' ').slice(0, 120);
    gravarMeta({ ...m, ok: false, motivo: 'erro', erro, tentou: Date.now() }); return { estado: 'erro', erro };
  } finally { busy = false; }
}

export function startAutoBackup() {
  if (!N.canBackup()) return;
  const rodar = (opts) => { autoBackup(opts).catch(() => {}); };
  // unref: nos testes (Node) os temporizadores não seguram o processo; no navegador o número devolvido não tem unref
  const a = setTimeout(() => rodar({}), 10000); const b = setInterval(() => rodar({}), 5 * 60 * 1000);
  if (a && a.unref) a.unref(); if (b && b.unref) b.unref();
  document.addEventListener('visibilitychange', () => { if (document.hidden) rodar({ urgent: true }); });
}

// texto de situação para Ajustes e Diagnóstico
export function statusText() {
  const m = lerMeta();
  if (S.get().settings.autoBackup === false) return 'Desligado.';
  if (m.motivo === 'maior' && !m.ok) return `Pausado: já existe um backup com mais pontos (${m.xpBackup}) do que este app tem. Restaure-o ou toque em "Fazer agora" para substituí-lo.`;
  if (m.motivo === 'erro' && !m.ok) return `Não consegui gravar: ${m.erro}`;
  if (m.ok && m.quando) return `Último backup automático: ${new Date(m.quando).toLocaleString('pt-BR')} (Documentos/Clarte).`;
  return 'Ainda sem backup automático: ele roda sozinho quando você estuda.';
}

// linhas { estado, nome, detalhe } para o Diagnóstico (dentro do app)
export async function diagnose() {
  if (!N.canBackup()) return [];
  const out = [{ estado: ligado() ? (lerMeta().motivo === 'erro' && !lerMeta().ok ? 'fail' : 'ok') : 'warn', nome: 'Backup automático', detalhe: statusText() }];
  const nomes = await N.listBackupFiles(); const lidos = (await Promise.all((await nomesPossiveis()).map(lerValido))).filter(Boolean);
  if (!nomes.length) out.push({ estado: 'warn', nome: 'Arquivos em Documentos/Clarte', detalhe: 'nenhum ainda' });
  else {
    const todos = nomes.length === lidos.length || nomes.every((n) => lidos.some((l) => l.nome === n));
    out.push({ estado: todos ? 'ok' : 'warn', nome: 'Arquivos em Documentos/Clarte', detalhe: `${nomes.join(', ')} · legíveis por este app: ${lidos.length ? lidos.map((l) => `${l.nome} (${l.obj.state.xp || 0} pontos)`).join(', ') : 'nenhum'}${todos ? '' : ' (o Android não deixa ler os outros; use Importar e escolha o arquivo)'}` });
  }
  return out;
}
