// Validador de pacotes de conteúdo. Não é usado pelo app: roda nos testes (npm test) e serve para conferir um pacote novo.
// validatePack(pack) devolve a lista de problemas (vazia = pacote válido).

const str = (x) => typeof x === 'string' && x.length > 0;
const clean = (x) => str(x) && x === x.trim() && !/\s{2,}|undefined|NaN|\[object/.test(x);
const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const REG = ['tu', 'vous'];

export function validatePack(pack) {
  const bad = [];
  const need = (cond, msg) => { if (!cond) bad.push(msg); };
  const list = (key, min = 1) => { const v = pack[key]; if (!Array.isArray(v) || v.length < min) { bad.push(`${key}: precisa ser uma lista com pelo menos ${min} item(ns)`); return []; } return v; };
  // confere os campos de cada item de uma lista; `fr` são textos que o app fala em francês e por isso não podem ter espaço sobrando
  const rows = (key, fields, frFields = [], extra) => {
    const seen = new Set();
    list(key).forEach((x, i) => {
      const at = `${key}[${i}]`;
      if (!isObj(x)) { bad.push(`${at}: precisa ser um objeto`); return; }
      for (const f of fields) need(str(x[f]), `${at}.${f}: texto obrigatório`);
      for (const f of frFields) need(clean(x[f]), `${at}.${f}: texto com espaço sobrando ou valor quebrado («${x[f]}»)`);
      if (frFields[0]) { need(!seen.has(x[frFields[0]]), `${at}: ${frFields[0]} repetido («${x[frFields[0]]}»)`); seen.add(x[frFields[0]]); }
      if (extra) extra(x, at);
    });
  };

  need(isObj(pack), 'o pacote precisa ser um objeto');
  if (!isObj(pack)) return bad;
  need(pack.schema === 1, `schema: esperado 1, veio ${pack.schema}`);
  need(/^[a-z][a-z0-9-]*$/.test(pack.id || ''), 'id: use letras minúsculas, números e hífen');
  need(str(pack.title), 'title: texto obrigatório');
  need(Number.isInteger(pack.version) && pack.version >= 1, 'version: inteiro a partir de 1');
  need(/^\d{4}-\d{2}-\d{2}$/.test(pack.examDate || '') && !Number.isNaN(new Date(`${pack.examDate}T12:00:00`).getTime()), 'examDate: data no formato AAAA-MM-DD');

  // unidades e aulas
  const ids = new Set();
  list('units').forEach((u, i) => {
    const at = `units[${i}]`;
    need(/^[a-z]+$/.test(u.id || ''), `${at}.id: só letras minúsculas`);
    need(!ids.has(u.id), `${at}.id repetido: ${u.id}`); ids.add(u.id);
    need(u.n === i + 1, `${at}.n: esperado ${i + 1} (a ordem da trilha), veio ${u.n}`);
    for (const f of ['icon', 'title', 'sub']) need(str(u[f]), `${at}.${f}: texto obrigatório`);
  });
  need(isObj(pack.lessons), 'lessons: precisa ser um objeto {idDaUnidade: html}');
  for (const id of ids) need(isObj(pack.lessons) && str(pack.lessons[id]) && pack.lessons[id].length > 200, `lessons.${id}: aula ausente ou curta demais`);
  for (const id of Object.keys(pack.lessons || {})) need(ids.has(id), `lessons.${id}: não existe unidade com esse id`);

  // alfabeto
  need(isObj(pack.letters) && Object.keys(pack.letters).join('') === 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'letters: precisa das 26 letras A–Z, em ordem');
  for (const [l, n] of Object.entries(pack.letters || {})) need(str(n), `letters.${l}: nome obrigatório`);
  rows('accents', ['c', 'name']);
  const names = list('names');
  need(names.every(clean) && new Set(names).size === names.length, 'names: textos limpos e sem repetição');

  // frases
  need(isObj(pack.phrases) && Object.keys(pack.phrases).length > 0, 'phrases: precisa ser um objeto {tema: [{fr, pt}]}');
  for (const [tema, arr] of Object.entries(pack.phrases || {})) {
    need(Array.isArray(arr) && arr.length > 0, `phrases.${tema}: lista vazia`);
    const seen = new Set();
    (arr || []).forEach((p, i) => { need(clean(p.fr) && str(p.pt), `phrases.${tema}[${i}]: fr e pt obrigatórios, fr sem espaço sobrando`); need(!seen.has(p.fr), `phrases.${tema}[${i}]: repetida («${p.fr}»)`); seen.add(p.fr); });
  }

  // social
  rows('profiles', ['name', 'nat'], ['name'], (p, at) => { need(['m', 'f'].includes(p.g), `${at}.g: use "m" ou "f"`); need(Array.isArray(p.langs) && p.langs.length > 0 && p.langs.every(clean), `${at}.langs: lista de idiomas`); });
  rows('videoTv', ['fr', 'pt'], ['fr'], (p, at) => need(REG.includes(p.reg), `${at}.reg: use "tu" ou "vous"`));
  rows('tuvous', ['tu', 'vous', 'pt'], ['tu', 'vous']);
  rows('situations', ['pt', 'fr', 'wrong'], ['fr'], (p, at) => { need(REG.includes(p.reg), `${at}.reg: use "tu" ou "vous"`); need(clean(p.wrong) && p.wrong !== p.fr, `${at}.wrong: precisa existir e ser diferente de fr`); });

  // verbos
  need(Array.isArray(pack.pronouns) && pack.pronouns.length === 6 && pack.pronouns.every(clean), 'pronouns: 6 pronomes (je, tu, il/elle, nous, vous, ils/elles)');
  need(isObj(pack.verbs) && Object.keys(pack.verbs).length > 0, 'verbs: precisa ser um objeto {infinitivo: {pt, forms}}');
  for (const [inf, v] of Object.entries(pack.verbs || {})) {
    need(str(v.pt), `verbs.${inf}.pt: obrigatório`);
    need(Array.isArray(v.forms) && v.forms.length === 6 && v.forms.every(clean), `verbs.${inf}.forms: 6 formas, uma por pronome`);
  }

  // pessoas e lugares
  rows('nats', ['m', 'f', 'pt'], ['m']);
  rows('jobs', ['m', 'f', 'pt'], ['m']);
  rows('langs', ['fr', 'v', 'pt'], ['fr']);
  need(list('cities').every(clean) && list('quartiers').every(clean), 'cities/quartiers: textos limpos');

  // interrogação
  rows('statements', ['s', 'v', 'r']);
  rows('qwords', ['w', 'q', 'ans', 'pt'], [], (p, at) => { need(/___/.test(p.q), `${at}.q: precisa ter ___ no lugar da palavra`); need(String(p.ans).toLowerCase() === String(p.w).toLowerCase(), `${at}.ans: deve ser a mesma palavra de w`); });

  return bad;
}
