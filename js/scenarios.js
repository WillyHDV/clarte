// Cenários da Clara: lógica que não depende da tela (marcadores da IA, dicas por nível, resultado).
// Os dados dos cenários ficam em content/fb1/scenarios.js; a tela, em js/screens/tutor.js.

export const NIVEIS = [
  { n: 1, nome: 'Com frases', desc: 'Mostra as frases que você pode dizer.' },
  { n: 2, nome: 'Com dicas', desc: 'Mostra só o começo de cada frase.' },
  { n: 3, nome: 'Modo prova', desc: 'Sem ajuda e sem correção até o fim.' },
];

// A IA escreve, em linhas próprias no fim da resposta:
//   ##OK:id1,id2   objetivos que o aluno cumpriu na última fala (vazio se nenhum)
//   ##FIN          todos os objetivos foram cumpridos; a missão acaba
//   ##FINAL:ids    na avaliação final, todos os objetivos cumpridos na conversa inteira
// Ids que não existem no cenário são ignorados.
export function parseMarkers(text, objIds) {
  const validos = new Set(objIds); const ok = []; let fim = false; let final = null;
  for (const ln of String(text || '').split(/\r?\n/)) {
    const m = /^\s*##\s*(OK|FINAL)\s*:\s*(.*)$/i.exec(ln);
    if (m) {
      const ids = m[2].split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter((x) => validos.has(x));
      if (m[1].toUpperCase() === 'OK') ok.push(...ids); else final = [...(final || []), ...ids];
      continue;
    }
    if (/^\s*##\s*FIN\s*$/i.test(ln)) fim = true;
  }
  return { ok: [...new Set(ok)], fim, final: final ? [...new Set(final)] : null };
}

// o texto sem as linhas de marcador (o que pode ser falado ou mostrado)
export const stripMarkers = (text) => String(text || '').split(/\r?\n/).filter((l) => !/^\s*##/.test(l)).join('\n').trim();

export const pendentes = (sc, done) => sc.objetivos.filter((o) => !done.has(o.id));

// o que mostrar como ajuda: nível 1 = frases completas, nível 2 = só o começo, nível 3 = nada; sempre os 2 próximos objetivos
export function dicas(sc, nivel, done) {
  if (nivel >= 3) return [];
  return pendentes(sc, done).slice(0, 2).map((o) => ({ id: o.id, texto: nivel === 1 ? o.frase : o.dica }));
}

export const nivelDe = (sc, nivel) => (sc.nivelFixo || [1, 2, 3].find((n) => n === nivel) || 1);

// primeiro nível ainda não vencido neste cenário (sugestão ao abrir a missão)
export function nivelSugerido(sc, stats) {
  if (sc.nivelFixo) return sc.nivelFixo;
  const s = (stats && stats[sc.id]) || {};
  return Math.min(3, (s.levelDone || 0) + 1);
}

export function veredito(feitos, total) {
  if (feitos >= total) return { chave: 'ok', titulo: 'Missão cumprida' };
  return feitos > 0 ? { chave: 'parcial', titulo: 'Missão parcial' } : { chave: 'nao', titulo: 'Missão não cumprida' };
}
