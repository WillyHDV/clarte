// Capacitor de mentira: o que o app Android injeta na página, com um "Documentos" de memória.
// quebra: diretórios em que toda gravação falha · leitura: texto fixo devolvido por qualquer leitura
// negarEscrita / negarLeitura: nomes de arquivo (só o nome) que o Android recusa, como acontece com arquivos de uma instalação anterior
// inicial: { 'DOCUMENTS:Clarte/arquivo.json': 'texto' } já existentes
// permissao: estado da permissão de notificações ('granted' | 'prompt' | 'denied'); pedir: o que o usuário responde ao pedido; falhaAgendar: o agendamento recusa
export function fakeCapacitor({ plugins = ['Filesystem', 'Share'], quebra = [], native = true, leitura, negarEscrita = [], negarLeitura = [], inicial = {}, permissao = 'granted', pedir = 'granted', falhaAgendar = false } = {}) {
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
  globalThis.Capacitor = {
    isNativePlatform: () => native, getPlatform: () => (native ? 'android' : 'web'), isPluginAvailable: (n) => plugins.includes(n),
    Plugins: { Filesystem, Share: { canShare: async () => ({ value: true }) }, LocalNotifications },
  };
  return { arquivos, chamadas, pendentes, canais, agendamentos };
}
