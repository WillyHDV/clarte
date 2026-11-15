// Dicionário da Leitura: validação do verbete que a IA devolve e o cache local (guardado à parte do progresso; dá para refazer).
import { chavesDaPalavra } from './leitura.js';

const MSG = 'A Clara não conseguiu montar o verbete dessa palavra. Tente de novo.';
const limpa = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const par = (lista, n) => (Array.isArray(lista) ? lista : []).map((e) => (e && typeof e === 'object' ? { fr: limpa(e.fr, 160), pt: limpa(e.pt, 160) } : null)).filter((e) => e && e.fr).slice(0, n);

// Aceita o objeto da IA e devolve o verbete limpo; sem nenhum significado nem sentido na frase, é erro.
export function validarVerbete(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(MSG);
  const significados = (Array.isArray(raw.significados) ? raw.significados : [])
    .map((x) => (typeof x === 'string' ? { pt: limpa(x, 90), nota: '' } : x && typeof x === 'object' ? { pt: limpa(x.pt, 90), nota: limpa(x.nota, 140) } : null))
    .filter((x) => x && x.pt).slice(0, 6);
  const v = {
    palavra: limpa(raw.palavra, 40), lema: limpa(raw.lema, 40), classe: limpa(raw.classe, 40), leitura: limpa(raw.leitura, 80),
    nivel: /^(A1|A2|B1|B2|C1|C2)$/.test(String(raw.nivel)) ? String(raw.nivel) : '',
    significados, contexto: limpa(raw.neste_contexto ?? raw.contexto, 220), forma: limpa(raw.forma, 220),
    exemplos: par(raw.exemplos, 4), expressoes: par(raw.expressoes, 4), notas: limpa(raw.notas, 320),
  };
  if (!v.significados.length && !v.contexto) throw new Error(MSG);
  return v;
}

// ---------- cache ----------
const CHAVE = 'fr_dict_v1'; const MAXIMO = 400;
const ler = () => { try { const o = JSON.parse(globalThis.localStorage.getItem(CHAVE)); return o && typeof o === 'object' && o.itens && typeof o.itens === 'object' ? o : { itens: {} }; } catch (e) { return { itens: {} }; } };
// resumo curto da frase, para o mesmo verbete não valer em outro contexto
export function hashFrase(frase) {
  const s = String(frase).toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim(); let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
export const chaveVerbete = (palavra, frase) => `${chavesDaPalavra(palavra)[0] || ''}|${hashFrase(frase)}`;
export function verbeteSalvo(chave) { const e = ler().itens[chave]; return e && e.v ? e.v : null; }
export function guardarVerbete(chave, v) {
  const o = ler(); o.itens[chave] = { t: Date.now(), v };
  const chaves = Object.keys(o.itens);
  if (chaves.length > MAXIMO) chaves.sort((a, b) => o.itens[a].t - o.itens[b].t).slice(0, chaves.length - MAXIMO).forEach((k) => { delete o.itens[k]; });
  try { globalThis.localStorage.setItem(CHAVE, JSON.stringify(o)); } catch (e) { /* sem espaço: só não guarda */ }
}
export const totalVerbetes = () => Object.keys(ler().itens).length;
