// Leitura do livro: o que a IA devolve para uma foto de página (validação e marcas de som) e o preparo da imagem.
// Nada daqui conhece a tela; os testes rodam sem navegador (exceto prepararImagem).

const MAX_FRASES = 40;
const limpa = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
// compara textos sem ligar para marcas, espaços e o tipo do apóstrofo
const forma = (s) => String(s).replace(/[{}<>]/g, '').replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim();
// marcas bem formadas: {letras mudas} e <letra de ligação> sem aninhar, sem abrir sem fechar e sem espaço dentro
const MARCAS_OK = /^[^{}<>]*(?:(?:\{[^{}<>\s]*\}|<[^{}<>\s]*>)[^{}<>]*)*$/;

export const semMarcas = (s) => String(s).replace(/[{}<>]/g, '');

// a IA pode responder com cerca de código ou texto em volta; devolve o objeto ou lança um erro em português
export function lerJson(texto, erro = 'A resposta da Clara veio incompleta. Tente de novo (uma página só, com boa luz, costuma resolver).') {
  const t = String(texto || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(t); } catch (e) { /* tenta recortar */ }
  const a = t.indexOf('{'); const b = t.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { /* cai no erro */ } }
  throw new Error(erro);
}

// Valida e limpa a resposta. Se as marcas alterarem o texto da frase, a frase fica sem marcas (o texto nunca muda).
export function validarPagina(raw) {
  const lista = Array.isArray(raw) ? raw : raw && Array.isArray(raw.frases) ? raw.frases : [];
  const frases = [];
  for (const it of lista.slice(0, MAX_FRASES)) {
    if (!it || typeof it !== 'object') continue;
    const fr = limpa(it.fr, 600); if (!fr) continue;
    let marcada = limpa(it.marcada, 800);
    if (!marcada || !MARCAS_OK.test(marcada) || forma(marcada) !== forma(fr)) marcada = fr;
    const regras = (Array.isArray(it.regras) ? it.regras : []).map((r) => limpa(r, 80)).filter(Boolean).slice(0, 3);
    const palavras = (Array.isArray(it.palavras) ? it.palavras : []).map((p) => (p && typeof p === 'object' ? { fr: limpa(p.fr, 40), pt: limpa(p.pt, 90), uso: limpa(p.uso, 180) } : null)).filter((p) => p && p.fr).slice(0, 8);
    frases.push({ fr, pt: limpa(it.pt, 600), marcada, leitura: limpa(it.leitura, 600), regras, palavras, avancado: it.avancado === true });
  }
  if (!frases.length) throw new Error('A Clara não achou frases em francês nessa foto. Tente de novo, com a página reta, bem iluminada e sem cortar as bordas.');
  return { frases };
}

// "Il<s> on{t}" → palavras, cada uma com trechos { t: texto, k: 'n' (normal) | 'mu' (letra muda) | 'lg' (ligação) }
export function palavrasMarcadas(marcada) {
  const segs = []; const re = /\{([^{}<>]*)\}|<([^{}<>]*)>|([^{}<>]+)/g; let m;
  while ((m = re.exec(marcada))) segs.push(m[1] !== undefined ? { t: m[1], k: 'mu' } : m[2] !== undefined ? { t: m[2], k: 'lg' } : { t: m[3], k: 'n' });
  const out = [[]];
  for (const s of segs) {
    for (const p of s.t.split(/(\s+)/)) {
      if (!p) continue;
      if (/^\s+$/.test(p)) { if (out[out.length - 1].length) out.push([]); } else out[out.length - 1].push({ t: p, k: s.k });
    }
  }
  return out.filter((w) => w.length);
}
export const textoDaPalavra = (w) => w.map((s) => s.t).join('');
// chaves para procurar a palavra na lista de significados: ela inteira e, se tiver apóstrofo (j'avais), o que vem depois
export function chavesDaPalavra(texto) {
  const k = String(texto).toLowerCase().replace(/[’‘`]/g, "'").replace(/[.,;:!?«»"“”…()[\]—–-]+/g, ' ').trim();
  const depois = k.includes("'") ? k.slice(k.indexOf("'") + 1) : '';
  return [k, depois].filter(Boolean);
}
export function acharPalavra(palavras, texto) {
  const mapa = new Map(palavras.map((p) => [chavesDaPalavra(p.fr)[0], p]));
  for (const k of chavesDaPalavra(texto)) if (mapa.has(k)) return mapa.get(k);
  return null;
}

const blobBase64 = (blob) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(',')[1] || ''); r.onerror = () => reject(r.error || new Error('Não consegui ler a foto.')); r.readAsDataURL(blob); });

// Reduz a foto (lado maior de 1800 px, JPEG) para a chamada ser rápida; sem suporte do navegador, manda o arquivo como está.
export async function prepararImagem(file, max = 1800) {
  try {
    if (typeof createImageBitmap === 'function' && typeof document !== 'undefined') {
      const bmp = await createImageBitmap(file); const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.86));
      if (blob) return { mimeType: 'image/jpeg', data: await blobBase64(blob) };
    }
  } catch (e) { /* cai no arquivo original */ }
  if (file.size > 12 * 1024 * 1024) throw new Error('A foto é grande demais. Tire outra, com a câmera em resolução normal.');
  return { mimeType: file.type || 'image/jpeg', data: await blobBase64(file) };
}
