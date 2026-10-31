// Capacitor de mentira: o que o app Android injeta na página, com um "Documentos" de memória.
// quebra: diretórios em que toda gravação falha · leitura: texto fixo devolvido por qualquer leitura
// negarEscrita / negarLeitura: nomes de arquivo (só o nome) que o Android recusa, como acontece com arquivos de uma instalação anterior
// inicial: { 'DOCUMENTS:Clarte/arquivo.json': 'texto' } já existentes
// tts: voz do Android (plugin TextToSpeech): { suportado, vozes, falha, duracao } · permissao: estado da permissão de notificações ('granted' | 'prompt' | 'denied'); pedir: o que o usuário responde ao pedido; falhaAgendar: o agendamento recusa
export function fakeCapacitor({ plugins = ['Filesystem', 'Share'], quebra = [], native = true, leitura, negarEscrita = [], negarLeitura = [], inicial = {}, permissao = 'granted', pedir = 'granted', falhaAgendar = false, tts = {} } = {}) {
  const arquivos = new Map(Object.entries(inicial)); const chamadas = [];
  const key = (a) => `${a.directory}:${a.path}`;
  const nome = (a) => String(a.path).split('/').pop();
  const Filesystem = {
    async writeFile(a) {
      chamadas.push(['write', a]);
      if (quebra.includes(a.directory)) throw new Error(`Permission denied (${a.directory})`);
      if (negarEscrita.includes(nome(a)) && arquivos.has(key(a))) throw new Error(`EACCES: ${nome(a)} pertence a outra instalação`);
      arquivos.set(key(a), a.data); return { uri: 'file:///x' };
    },
    async readFile(a) {
      chamadas.push(['read', a]);
      if (leitura !== undefined) return { data: leitura };
      if (negarLeitura.includes(nome(a))) throw new Error(`EACCES: ${nome(a)} não pode ser lido`);
      if (!arquivos.has(key(a))) throw new Error('File does not exist');
      return { data: arquivos.get(key(a)) };
    },
    async readdir(a) {
      chamadas.push(['readdir', a]); const pre = `${a.directory}:${a.path}/`;
      return { files: [...arquivos.keys()].filter((k) => k.startsWith(pre)).map((k) => ({ name: k.slice(pre.length), type: 'file' })) };
    },
    async deleteFile(a) { chamadas.push(['delete', a]); arquivos.delete(key(a)); },
  };
  const pendentes = new Map(); const canais = []; const agendamentos = []; let perm = permissao;
  const LocalNotifications = {
    async checkPermissions() { return { display: perm }; },
    async requestPermissions() { chamadas.push(['pedir-permissao']); if (perm === 'prompt') perm = pedir; return { display: perm }; },
    async createChannel(c) { canais.push(c); },
    async schedule({ notifications }) { if (falhaAgendar) throw new Error('Notifications are blocked'); agendamentos.push(notifications); for (const n of notifications) pendentes.set(n.id, n); return { notifications: notifications.map((n) => ({ id: n.id })) }; },
    async cancel({ notifications }) { for (const n of notifications) pendentes.delete(n.id); },
    async getPending() { return { notifications: [...pendentes.values()].map((n) => ({ id: n.id })) }; },
  };
  const falas = []; const voz = { parou: 0, instalou: 0 };
  const ttsCfg = { suportado: true, vozes: [{ lang: 'pt-BR', name: 'pt-br-x-abc-local', localService: true, default: true }, { lang: 'fr-FR', name: 'fr-fr-x-vlf-local', localService: true, default: false }], falha: false, duracao: 0, ...tts };
  const TextToSpeech = {
    async isLanguageSupported() { return { supported: ttsCfg.suportado }; },
    async getSupportedVoices() { return { voices: ttsCfg.vozes }; },
    async speak(o) { falas.push(o); if (ttsCfg.falha) throw new Error('Failed to read text.'); if (ttsCfg.duracao) await new Promise((r) => setTimeout(r, ttsCfg.duracao)); },
    async stop() { voz.parou++; },
    async openInstall() { voz.instalou++; },
  };
  globalThis.Capacitor = {
    isNativePlatform: () => native, getPlatform: () => (native ? 'android' : 'web'), isPluginAvailable: (n) => plugins.includes(n),
    Plugins: { Filesystem, Share: { canShare: async () => ({ value: true }) }, LocalNotifications, TextToSpeech },
  };
  return { arquivos, chamadas, pendentes, canais, agendamentos, falas, voz };
}
