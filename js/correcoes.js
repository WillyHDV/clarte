// Correções da Clara: acha, nos textos dela, os pares "frase errada → frase certa" para você guardar nas cartas.
// A Clara escreve a correção em português, perto do formato "Você escreveu: … → Melhor: …. Explicação." (chat, ligação) ou numa lista
// "você disse → correto" (avaliação da prova oral). Este módulo é tolerante: se a linha não parecer uma correção, é ignorada.

const SETA = /\s*(?:→|->|⇒|=>)\s*/;
const PREFIXO_ERRO = /^.*\b(?:você|voce)\s+(?:disse|escreveu|falou)\s*:?\s*/i; // vale o último "Você escreveu:" da parte esquerda
const PREFIXO_CERTO = /^(?:melhor|correto|certo|o correto é|forma correta|correção)\s*:?\s*/i;
const AO_REDOR = /^[«“"]+|[»”"]+$/g;

// tira marcas de lista e de negrito do começo e do meio da linha
const limpar = (s) => s.replace(/\*\*|__|`/g, '').replace(/^[\s>*•·–—-]+/, '').replace(/^\d+[.)]\s+/, '').trim();
const semAspas = (s) => s.replace(AO_REDOR, '').trim();
const sinais = (s) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[.,!?;:«»"“”…]/g, ' ').replace(/\s+/g, ' ').trim();
const plausivel = (s) => s.length >= 2 && s.length <= 140 && /\p{L}/u.test(s) && s.split(/\s+/).length <= 16 && !/\d\s*\/\s*\d/.test(s);

// a frase certa vai até as aspas que a fecham ou, sem aspas, até " — ", " (" ou o ponto que termina a frase; o resto é a explicação
function separar(dir) {
  const texto = dir.trim(); const limparExpl = (e) => e.replace(/^[\s—–:(-]+/, '').replace(/\)\s*$/, '').trim();
  if (/^[«“"]/.test(texto)) {
    const fecha = texto.slice(1).search(/[»”"]/);
    if (fecha >= 0) return { certa: texto.slice(1, fecha + 1).trim(), explicacao: limparExpl(texto.slice(fecha + 2)) };
  }
  let fim = texto.length;
  const corte = [[/\s[—–]\s/, 0], [/\s\(/, 0], [/[.!?](?=\s+\p{Lu})/u, 1]];
  for (const [re, ate] of corte) { const m = re.exec(texto); if (m) fim = Math.min(fim, m.index + ate); }
  return { certa: semAspas(texto.slice(0, fim).trim()), explicacao: limparExpl(texto.slice(fim)) };
}

export function extrairCorrecoes(texto) {
  const saida = [];
  for (const bruta of String(texto || '').split(/\n+/)) {
    const linha = limpar(bruta); const seta = SETA.exec(linha); if (!seta) continue; // vale a primeira seta: a explicação pode ter outras
    const erro = semAspas(linha.slice(0, seta.index).replace(PREFIXO_ERRO, '').trim()); const { certa, explicacao } = separar(linha.slice(seta.index + seta[0].length).replace(PREFIXO_CERTO, ''));
    if (!plausivel(erro) || !plausivel(certa) || sinais(erro) === sinais(certa)) continue;
    if (saida.some((x) => sinais(x.certa) === sinais(certa))) continue;
    saida.push({ erro, certa, explicacao: explicacao.slice(0, 160) });
  }
  return saida.slice(0, 6);
}
