// Ponte com o app Android (Capacitor, pasta native/). No site e no navegador nada disso existe: tudo devolve "indisponível".
// No modo "site dentro do app" o Capacitor injeta window.Capacitor na página publicada, e os plugins são chamados por ele.
const cap = () => globalThis.Capacitor;

export function isNative() {
  try { const c = cap(); return !!(c && typeof c.isNativePlatform === 'function' && c.isNativePlatform()); } catch (e) { return false; }
}
export function hasPlugin(nome) {
  try { const c = cap(); return !!(c && typeof c.isPluginAvailable === 'function' && c.isPluginAvailable(nome)); } catch (e) { return false; }
}
export const platform = () => { try { return cap().getPlatform(); } catch (e) { return 'web'; } };
const msg = (e) => String((e && (e.message || e.errorMessage)) || e).replace(/\s+/g, ' ').slice(0, 120);

// Pasta dos backups no armazenamento do aparelho (Documentos/Clarte): sobrevive à desinstalação do app.
export const BACKUP_DIR = 'Clarte';
// Onde tentar gravar, da mais durável para a menos: Documentos (fica depois de desinstalar), pasta do app no cartão
// (visível por USB, some ao desinstalar) e dados internos do app (sempre funciona, some ao desinstalar).
export const STORAGE_PLACES = [
  { dir: 'DOCUMENTS', nome: 'Documentos/Clarte', dura: true },
  { dir: 'EXTERNAL', nome: 'pasta do app no armazenamento (Android/data)', dura: false },
  { dir: 'DATA', nome: 'dados internos do app', dura: false },
];

// ---------- arquivos de backup em Documentos/Clarte (a política de quando gravar fica em autobackup.js) ----------
export const BACKUP_FILE = 'clarte-backup.json';
export const BACKUP_PREV = 'clarte-backup-anterior.json';
export const canBackup = () => isNative() && hasPlugin('Filesystem');
const arq = (nome) => ({ path: `${BACKUP_DIR}/${nome}`, directory: 'DOCUMENTS' });

// texto do arquivo, ou null se não existe ou o Android não deixa este app lê-lo (ex.: criado por uma instalação anterior)
export async function readBackupFile(nome) {
  try { const r = await cap().Plugins.Filesystem.readFile({ ...arq(nome), encoding: 'utf8' }); return r && typeof r.data === 'string' ? r.data : null; } catch (e) { return null; }
}
// grava e lê de volta; se algo não bate, falha em vez de deixar um backup quebrado
export async function writeBackupFile(nome, texto) {
  const fs = cap().Plugins.Filesystem;
  await fs.writeFile({ ...arq(nome), data: texto, encoding: 'utf8', recursive: true });
  const lido = await fs.readFile({ ...arq(nome), encoding: 'utf8' });
  if (!lido || lido.data !== texto) throw new Error('o arquivo gravado não confere com o original');
}
// nomes dos backups que existem na pasta (mesmo os que este app talvez não consiga ler)
export async function listBackupFiles() {
  try {
    const r = await cap().Plugins.Filesystem.readdir({ path: BACKUP_DIR, directory: 'DOCUMENTS' });
    return ((r && r.files) || []).map((f) => (typeof f === 'string' ? f : f && f.name)).filter((n) => /^clarte-backup.*\.json$/.test(n || ''));
  } catch (e) { return []; }
}

// Testa os recursos nativos e devolve linhas { estado: 'ok' | 'warn' | 'fail', nome, detalhe } para o Diagnóstico.
export async function selfTest() {
  if (!isNative()) return [{ estado: 'warn', nome: 'App nativo', detalhe: 'você está no site ou no navegador; este teste só roda dentro do app Android' }];
  const out = [{ estado: 'ok', nome: 'App nativo', detalhe: `plataforma ${platform()}` }];
  for (const nome of ['Filesystem', 'Share']) out.push({ estado: hasPlugin(nome) ? 'ok' : 'fail', nome: `Plugin ${nome}`, detalhe: hasPlugin(nome) ? 'disponível' : 'não encontrado: a ponte nativa não chegou ao site carregado' });
  if (!hasPlugin('Filesystem')) return out;
  const fs = cap().Plugins.Filesystem; const texto = `Clarté ${new Date().toISOString()}`;
  for (const lugar of STORAGE_PLACES) {
    const arq = { path: `${BACKUP_DIR}/teste.txt`, directory: lugar.dir };
    try {
      await fs.writeFile({ ...arq, data: texto, encoding: 'utf8', recursive: true });
      const lido = await fs.readFile({ ...arq, encoding: 'utf8' });
      const ok = lido && lido.data === texto;
      try { await fs.deleteFile(arq); } catch (e) { /* o arquivo de teste pode ficar */ }
      out.push({ estado: ok ? 'ok' : 'warn', nome: `Gravar em ${lugar.nome}`, detalhe: ok ? `gravou e leu de volta${lugar.dura ? ' (sobrevive à desinstalação)' : ' (some ao desinstalar o app)'}` : 'gravou, mas o conteúdo lido não bate' });
    } catch (e) { out.push({ estado: lugar.dura ? 'warn' : 'fail', nome: `Gravar em ${lugar.nome}`, detalhe: msg(e) }); }
  }
  if (hasPlugin('Share')) { try { const r = await cap().Plugins.Share.canShare(); out.push({ estado: r && r.value ? 'ok' : 'warn', nome: 'Compartilhar arquivos', detalhe: r && r.value ? 'o Android aceita compartilhar' : 'este aparelho diz que não compartilha' }); } catch (e) { out.push({ estado: 'warn', nome: 'Compartilhar arquivos', detalhe: msg(e) }); } }
  return out;
}
