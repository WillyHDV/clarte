import {
  LETTERS, ACCENTS, NAMES, PHRASES, SITUATIONS, PRONOUNS, VERBS, NATS, LANGS, CITIES, JOBS, STATEMENTS, QWORDS,
} from './data.js';

// ---------- utilitários ----------
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
export const shuffle = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = rnd(i + 1); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const sample = (a, k, not = []) => shuffle(a.filter((x) => !not.includes(x))).slice(0, k);
const startsVowel = (w) => /^[aeiouyhàâäéèêëîïôöùûüœ]/i.test(w);
const NF = ['Émilie', 'Charlie', 'Céline', 'Amélie', 'Camille', 'Rosalie', 'Marie', 'Clara', 'Léonie', 'Taynah', 'Rariane'];
const NM = ['Alexis', 'Simon', 'Mehmet', 'Jérémie', 'Samuel', 'Mohammed', 'Alexandre', 'Julian', 'Lucas', 'William', 'Adam', 'Pablo'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);

export const stripAcc = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
export const norm = (s) => s.toLowerCase().replace(/[’‘`]/g, "'").replace(/[.,!?;:«»"“”…]/g, ' ').replace(/\s+/g, ' ').trim();

const mk = (unit, kind, o) => ({ unit, kind, key: `${kind}|${o.q}|${[].concat(o.answer).join('/')}`, items: [], ...o });
// letras de um nome (sem acento) como itens de domínio
const lettersOf = (name) => [...new Set(name.toUpperCase().normalize('NFD').replace(/[^A-Z]/g, '').split(''))].map((c) => `letter:${c}`);

// ---------- verificação ----------
export function check(ex, input) {
  if (ex.kind === 'choice' || ex.kind === 'listen-choice') return { ok: input === ex.answer };
  if (ex.kind === 'tiles') {
    const got = norm(input.join(' '));
    return { ok: [].concat(ex.answer).some((a) => norm(a) === got) };
  }
  if (ex.kind === 'speak') return speakScore(ex.answer, input);
  // type / listen-type
  const got = norm(input);
  const answers = [].concat(ex.answer);
  if (answers.some((a) => norm(a) === got)) return { ok: true };
  if (answers.some((a) => stripAcc(norm(a)) === stripAcc(got))) return { ok: true, almost: true };
  return { ok: false };
}

function lev(a, b) {
  const m = a.length, n = b.length; const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
export function speakScore(target, heard) {
  const t = stripAcc(norm(target)).split(' ').filter(Boolean);
  const h = stripAcc(norm(heard)).split(' ').filter(Boolean);
  const used = new Set();
  const marks = t.map((w) => {
    let best = -1;
    h.forEach((x, i) => { if (!used.has(i) && lev(w, x) <= (w.length > 4 ? 1 : 0) && best < 0) best = i; });
    if (best >= 0) { used.add(best); return true; }
    return false;
  });
  const score = marks.filter(Boolean).length / t.length;
  return { ok: score >= 0.75, score, marks, words: norm(target).split(' ').filter(Boolean) };
}

// ---------- blocos de frase ----------
const pluralize = (w) => (/[sx]$/.test(w) ? w : w + 's');
function subjectFor(idx, g) {
  return [['Je'], ['Tu'], [g === 'f' ? 'Elle' : 'Il'], ['Nous'], ['Vous'], [g === 'f' ? 'Elles' : 'Ils']][idx][0];
}
function sentenceFor(verb, idx, g = pick(['m', 'f'])) {
  const forms = VERBS[verb].forms; const form = forms[idx];
  let rest = '';
  if (verb === 'être') {
    const n = pick(NATS);
    if (idx <= 1) rest = n[g];
    else if (idx === 2) rest = n[g];
    else if (idx === 5) rest = pluralize(n[g]);
    else rest = pluralize(n.m);
  } else if (verb === "s'appeler") rest = pick(g === 'f' ? NF : NM);
  else if (verb === 'parler') rest = pick(LANGS).v;
  else if (verb === 'habiter') rest = 'à ' + pick(CITIES);
  else if (verb === 'étudier') rest = pick(LANGS).fr;
  else if (verb === 'travailler') { const j = pick(JOBS); rest = 'comme ' + (g === 'f' ? j.f : j.m); }
  else rest = pick(['le français', 'les films français', 'la musique', 'le café', 'le cinéma']);
  let subj = subjectFor(idx, g); let subjSpace = true;
  if (idx === 0 && startsVowel(form)) { subj = "J'"; subjSpace = false; }
  return { subj, subjSpace, form, rest, full: `${subj}${subjSpace ? ' ' : ''}${form} ${rest}.`, verb, idx };
}

// ---------- geradores por unidade ----------
function genAlphabet() {
  const L = Object.keys(LETTERS);
  const out = [];
  const a = pick(L); const optsL = shuffle([a, ...sample(L, 3, [a])]);
  out.push(mk('alphabet', 'listen-choice', { items: [`letter:${a}`], q: 'Qual letra você ouviu?', audio: LETTERS[a], options: optsL, answer: a, explain: `Era a letra ${a} (${LETTERS[a]}).` }));
  const nm = pick(NAMES.filter((n) => !/[^A-Za-z]/.test(n)));
  out.push(mk('alphabet', 'listen-type', { items: lettersOf(nm), q: 'Ouça as letras e escreva o nome.', audio: nm.toUpperCase().split('').map((c) => LETTERS[c]).join(', '), answer: nm, explain: `Nome: ${nm} (${nm.toUpperCase().split('').join('-')}).` }));
  const b = pick(L); const names = shuffle([...new Set([LETTERS[b], ...sample(Object.values(LETTERS), 6, [LETTERS[b]])])].slice(0, 4));
  if (!names.includes(LETTERS[b])) names[0] = LETTERS[b];
  out.push(mk('alphabet', 'choice', { items: [`letter:${b}`], q: `Como se pronuncia a letra <b>${b}</b> em francês?`, options: shuffle(names), answer: LETTERS[b], audio: LETTERS[b], explain: `${b} = ${LETTERS[b]}.` }));
  const ac = pick(ACCENTS);
  out.push(mk('alphabet', 'choice', { items: [`accent:${ac.c}`], q: `Como se chama o acento de <b>${ac.c}</b>?`, options: shuffle([ac.name, ...sample(ACCENTS.map((x) => x.name), 3, [ac.name])]), answer: ac.name, explain: `${ac.c} = ${ac.name}.` }));
  // o reconhecimento de voz não avalia bem letras soletradas; treinamos as frases de soletrar e o próprio nome
  const nm2 = pick(NAMES); const say = pick(["Comment ça s'écrit ?", "Épelez, s'il vous plaît.", `Je m'appelle ${nm2}.`, `Mon prénom, c'est ${nm2}.`]);
  out.push(mk('alphabet', 'speak', { items: /appelle|prénom/.test(say) ? lettersOf(nm2) : [], q: 'Diga em voz alta:', answer: say.replace(/[.?]$/, ''), shown: say, audio: say, explain: 'Depois tente soletrar o nome em voz alta, letra por letra.' }));
  out.push(mk('alphabet', 'tiles', { q: 'Monte a frase: "Como se escreve?"', tiles: shuffle(['Comment', 'ça', "s'écrit", 'bonjour']), answer: "Comment ça s'écrit", audio: "Comment ça s'écrit ?" }));
  return pick(out);
}

function allPhrases(keys) { return keys.flatMap((k) => PHRASES[k]); }
function genPhraseUnit(unit, keys) {
  const list = allPhrases(keys); const p = pick(list); const it = [`phrase:${p.fr}`];
  const ptOpts = shuffle([p.pt, ...sample(allPhrases(['comm', 'saluer', 'congé', 'presenter']).map((x) => x.pt), 3, [p.pt])]);
  const frOpts = shuffle([p.fr, ...sample(allPhrases(['comm', 'saluer', 'congé', 'presenter']).map((x) => x.fr), 3, [p.fr])]);
  const types = [
    () => mk(unit, 'choice', { items: it, q: `O que significa <b>${p.fr}</b>?`, audio: p.fr, options: ptOpts, answer: p.pt }),
    () => mk(unit, 'choice', { items: it, q: `Como se diz: <b>${p.pt}</b>?`, options: frOpts, answer: p.fr, audio: p.fr }),
    () => mk(unit, 'listen-choice', { items: it, q: 'O que você ouviu?', audio: p.fr, options: ptOpts, answer: p.pt, explain: p.fr }),
    () => mk(unit, 'listen-type', { items: it, q: 'Ouça e escreva a frase.', audio: p.fr, answer: p.fr, explain: p.fr + ' — ' + p.pt }),
    () => mk(unit, 'speak', { items: it, q: `Diga em voz alta (${p.pt})`, answer: p.fr, shown: p.fr, audio: p.fr }),
  ];
  const tileable = !/«/.test(p.fr);
  if (tileable) types.push(() => {
    const toks = p.fr.replace(/[.,!?]/g, '').split(' ');
    return mk(unit, 'tiles', { items: it, q: `Monte a frase: <b>${p.pt}</b>`, tiles: shuffle(toks), answer: p.fr, audio: p.fr });
  });
  return pick(types)();
}
const genComm = () => genPhraseUnit('comm', ['comm']);

function genPresenter() {
  if (rnd(3) === 0) return genPhraseUnit('presenter', ['presenter']); // frases-modelo da apresentação (inclui as perguntas)
  const g = pick(['m', 'f']); const name = pick(g === 'f' ? NF : NM); const n = pick(NATS); const city = pick(CITIES); const lang = pick(LANGS); const job = pick(JOBS);
  const nat = n[g]; const jb = job[g];
  const pool = [
    { fr: `Je m'appelle ${name}.`, pt: `Eu me chamo ${name}.`, extra: ['suis', 'parle'] },
    { fr: `Je suis ${nat}.`, pt: `Eu sou ${n.pt}.`, extra: ['appelle', 'habite'] },
    { fr: `J'habite à ${city}.`, pt: `Eu moro em ${city}.`, extra: ['suis', 'en'] },
    { fr: `Je parle ${lang.v}.`, pt: `Eu falo ${lang.pt}.`, extra: ['suis', 'le'] },
    { fr: `Je travaille comme ${jb}.`, pt: `Eu trabalho como ${job.pt}.`, extra: ['suis', 'à'] },
    { fr: `J'étudie ${lang.fr}.`, pt: `Eu estudo ${lang.pt}.`, extra: ['suis', 'à'] },
  ];
  const si = rnd(pool.length); const s = pool[si]; const sitem = [`pres:${['nom', 'nat', 'ville', 'langue', 'metier', 'etude'][si]}`];
  const mcq = [
    { q: "Como dizer \"Eu moro em Maceió\"?", a: "J'habite à Maceió", w: ["Je suis à Maceió", "J'habite Maceió à", "Je habite à Maceió"] },
    { q: 'Como dizer "Eu me chamo Pablo"?', a: "Je m'appelle Pablo", w: ["Je appelle Pablo", "Je suis appelle Pablo", "Je m'appeler Pablo"] },
    { q: 'Como dizer "Eu falo português e inglês"?', a: 'Je parle portugais et anglais', w: ['Je parler portugais et anglais', 'Je parle portugais est anglais', 'Je parle portugais anglais et'] },
    { q: 'Como dizer "Eu trabalho como vendedor"?', a: 'Je travaille comme vendeur', w: ['Je travaille vendeur comme', "Je suis travaille vendeur", "J'travaille comme vendeur"] },
    { q: 'Como dizer "Eu sou estudante"?', a: 'Je suis étudiant', w: ["J'étudiant", 'Je suis étudie', 'Je étudiant suis'] },
  ];
  const lis = () => {
    const gg = pick(['m', 'f']); const spk = pick(gg === 'f' ? NF : NM); const nn = pick(NATS); const cc = pick(CITIES); const l1 = pick(LANGS); const l2 = pick(LANGS.filter((x) => x !== l1));
    const text = `Bonjour ! Je m'appelle ${spk}. Je suis ${nn[gg]}. J'habite à ${cc}. Je parle ${l1.v} et ${l2.v}.`;
    const what = pick(['city', 'lang', 'nat']);
    if (what === 'city') return mk('presenter', 'listen-choice', { items: ['pres:ville'], q: `Onde ${spk} mora?`, audio: text, options: shuffle([cc, ...sample(CITIES, 3, [cc])]), answer: cc, explain: text });
    if (what === 'nat') return mk('presenter', 'listen-choice', { items: ['pres:nat'], q: `Qual é a nacionalidade de ${spk}?`, audio: text, options: shuffle([nn[gg], ...sample(NATS.map((x) => x[gg]), 3, [nn[gg]])]), answer: nn[gg], explain: text });
    return mk('presenter', 'listen-choice', { items: ['pres:langue'], q: `Qual idioma ${spk} fala (além de ${l2.pt})?`, audio: text, options: shuffle([l1.v, ...sample(LANGS.map((x) => x.v), 3, [l1.v, l2.v])]), answer: l1.v, explain: text });
  };
  const t = rnd(6);
  if (t === 0) return mk('presenter', 'tiles', { items: sitem, q: `Monte em francês: <b>${s.pt}</b>`, tiles: shuffle([...s.fr.replace(/[.]/g, '').split(' '), ...s.extra.slice(0, 1)]), answer: s.fr, audio: s.fr });
  if (t === 1) { const mi = rnd(mcq.length); const m = mcq[mi]; return mk('presenter', 'choice', { items: [`pres:${['ville', 'nom', 'langue', 'metier', 'metier'][mi]}`], q: m.q, options: shuffle([m.a, ...m.w]), answer: m.a, audio: m.a }); }
  if (t === 2) return lis();
  if (t === 3) return mk('presenter', 'speak', { items: sitem, q: `Diga em voz alta: <i>${s.pt}</i>`, answer: s.fr, shown: s.fr, audio: s.fr });
  if (t === 4) return mk('presenter', 'listen-type', { items: sitem, q: 'Ouça e escreva.', audio: s.fr, answer: s.fr, explain: s.pt });
  return mk('presenter', 'tiles', { items: sitem, q: `Monte em francês: <b>${s.pt}</b>`, tiles: shuffle(s.fr.replace(/[.]/g, '').split(' ')), answer: s.fr, audio: s.fr });
}

function genSaluer() {
  const t = rnd(5);
  if (t === 0) {
    const isS = Math.random() < 0.5; const p = pick(PHRASES[isS ? 'saluer' : 'congé'].filter((x) => !/^(Tu|Vous|Ça)/.test(x.fr)));
    return mk('saluer', 'choice', { items: [`phrase:${p.fr}`], q: `<b>${p.fr}</b> — cumprimentar ou despedir-se?`, audio: p.fr, options: ['Saluer (cumprimentar)', 'Prendre congé (despedir-se)'], answer: isS ? 'Saluer (cumprimentar)' : 'Prendre congé (despedir-se)', explain: p.pt });
  }
  if (t === 1) {
    const s = pick(SITUATIONS);
    return mk('saluer', 'choice', { items: [`sit:${SITUATIONS.indexOf(s)}`], q: `Situação: <b>${s.pt}</b>. Qual frase é adequada?`, options: shuffle([s.fr, s.wrong]), answer: s.fr, audio: s.fr, explain: `Aqui usamos <b>${s.reg}</b>.` });
  }
  return genPhraseUnit('saluer', ['saluer', 'congé']);
}

function genVerbes() {
  const verb = pick(Object.keys(VERBS)); const idx = rnd(6); const g = pick(['m', 'f']);
  const sen = sentenceFor(verb, idx, g); const forms = VERBS[verb].forms;
  const t = rnd(5);
  const blank = `${sen.subj}${sen.subjSpace ? ' ' : ''}<span class="blank">____</span> (${verb}) ${sen.rest}.`;
  const hint = `${verb} = ${VERBS[verb].pt}`;
  const vit = [`verb:${verb}:${idx}`];
  if (t === 4 && rnd(2)) return mk('verbes', 'speak', { items: vit, q: 'Diga em voz alta:', answer: sen.full.replace('.', ''), shown: sen.full, audio: sen.full, explain: `${PRONOUNS[idx]} → ${sen.form}` });
  if (t === 0 || t === 1) return mk('verbes', 'type', { items: vit, q: `Conjugue: ${blank}`, sub: hint, answer: sen.form, audio: sen.full, explain: `${sen.full} (${PRONOUNS[idx]} → ${sen.form})` });
  if (t === 2) {
    const opts = shuffle([...new Set([sen.form, ...sample(forms.filter((f) => f !== sen.form), 3)])]);
    return mk('verbes', 'choice', { items: vit, q: `Escolha a forma certa: ${blank}`, sub: hint, options: opts, answer: sen.form, explain: sen.full });
  }
  if (t === 3) {
    const clean = sen.full.replace('.', '');
    return mk('verbes', 'tiles', { items: vit, q: 'Ouça e monte a frase.', tiles: shuffle(sen.subjSpace ? clean.split(' ') : ["J'" + sen.form, ...sen.rest.split(' ')]), answer: clean, audio: sen.full });
  }
  const safe = sentenceFor(verb, pick([0, 1, 3, 4]), g);
  return mk('verbes', 'listen-type', { items: [`verb:${verb}:${safe.idx}`], q: 'Ouça e escreva a frase completa.', audio: safe.full, answer: safe.full.replace('.', ''), explain: safe.full });
}

function genMetiers() {
  const t = rnd(8);
  const diff = JOBS.filter((j) => j.m !== j.f);
  if (t === 7) { const j = pick(JOBS); const g = pick(['m', 'f']); const sp = `${g === 'f' ? 'Elle' : 'Il'} est ${j[g]}`; return mk('metiers', 'speak', { items: [`job:${j.m}`], q: `Diga em voz alta: <i>${j.pt}</i>`, answer: sp, shown: sp + '.', audio: sp, explain: `${j.m} / ${j.f}` }); }
  if (t === 0) { const j = pick(diff); return mk('metiers', 'type', { items: [`job:${j.m}`], q: `Passe para o <b>feminino</b>: <i>Il est ${j.m}</i> → Elle est ____`, answer: j.f, audio: `Elle est ${j.f}`, explain: `${j.m} → ${j.f}` }); }
  if (t === 1) { const j = pick(diff); return mk('metiers', 'type', { items: [`job:${j.m}`], q: `Passe para o <b>masculino</b>: <i>Elle est ${j.f}</i> → Il est ____`, answer: j.m, audio: `Il est ${j.m}`, explain: `${j.f} → ${j.m}` }); }
  if (t === 2) { const j = pick(JOBS); return mk('metiers', 'choice', { items: [`job:${j.m}`], q: `Ela é ${j.pt}. → Elle est ____`, options: shuffle([j.f, ...sample(JOBS.map((x) => x.f), 3, [j.f])]), answer: j.f, audio: `Elle est ${j.f}`, explain: `Elle est ${j.f}.` }); }
  if (t === 3) { const j = pick(JOBS); return mk('metiers', 'listen-choice', { items: [`job:${j.m}`], q: 'Qual profissão você ouviu?', audio: `Il est ${j.m}`, options: shuffle([j.pt, ...sample(JOBS.map((x) => x.pt), 3, [j.pt])]), answer: j.pt, explain: `Il est ${j.m} = ${j.pt}` }); }
  if (t === 4) { const j = pick(JOBS); const g = pick(['m', 'f']); const w = g === 'f' ? 'mulher' : 'homem';
    return mk('metiers', 'type', { items: [`job:${j.m}`], q: `<i>Tu fais quoi comme métier ?</i><br>Responda (você é ${j.pt}, ${w}):`, sub: 'Je suis … / Je travaille comme …', answer: [`Je suis ${j[g]}`, `Je travaille comme ${j[g]}`], audio: 'Tu fais quoi comme métier ?', explain: `Je suis ${j[g]}.` }); }
  if (t === 5) { const n = pick(NATS.filter((x) => x.m !== x.f)); return mk('metiers', 'type', { items: [`nat:${n.m}`], q: `Passe para o feminino: <i>Il est ${n.m}</i> → Elle est ____`, answer: n.f, audio: `Elle est ${n.f}`, explain: `${n.m} → ${n.f}` }); }
  const n = pick(NATS); const g = pick(['m', 'f']);
  return mk('metiers', 'choice', { items: [`nat:${n.m}`], q: `Complete: ${g === 'f' ? 'Elle' : 'Il'} est ____ <small>(${n.pt})</small>`, options: shuffle([n[g], ...sample(NATS.map((x) => x[g]), 3, [n[g]])]), answer: n[g], audio: `${g === 'f' ? 'Elle' : 'Il'} est ${n[g]}`, explain: `${g === 'f' ? 'Elle' : 'Il'} est ${n[g]}.` });
}

const estCe = (s) => {
  const words = s.s.split(' '); const w0 = words[0];
  const small = ['Elle', 'Il', 'Ils', 'Elles', 'Tu', 'Vous', 'Je', 'La'].includes(w0);
  const sub = small ? [lowerFirst(w0), ...words.slice(1)].join(' ') : s.s;
  const first = sub.split(' ')[0];
  const pre = startsVowel(first) && first.toLowerCase() !== 'je' ? "Est-ce qu'" : 'Est-ce que ';
  return `${pre}${sub} ${s.v} ${s.r}`;
};
const flat = (s) => `${s.s} ${s.v} ${s.r}`;
const estCeItems = (s) => (estCe(s).startsWith("Est-ce qu'") ? ['q:estce', 'q:elision'] : ['q:estce']);
const QTYPE = { 'Entonação': 'int', 'Est-ce que': 'estce', 'Inversão': 'inv' };
const QTILES = [
  { pt: 'Onde você mora? (formal, inversão)', fr: 'Où habitez-vous' }, { pt: 'Como você se chama? (formal, inversão)', fr: "Comment vous appelez-vous" },
  { pt: 'Por que você estuda francês? (entonação)', fr: 'Pourquoi vous étudiez le français' }, { pt: 'Você mora em Maceió? (est-ce que)', fr: 'Est-ce que tu habites à Maceió' },
  { pt: 'Onde você mora? (est-ce que)', fr: 'Où est-ce que tu habites' }, { pt: 'Onde você mora? (palavra no fim)', fr: 'Tu habites où' },
  { pt: 'Quem é Céline Dion?', fr: 'Qui est Céline Dion' }, { pt: 'Como você se chama? (informal)', fr: "Comment tu t'appelles" },
];
function genQuestions() {
  const t = rnd(7);
  if (t === 0 || t === 1) { const s = pick(STATEMENTS.filter((x) => x.s !== 'Je')); return mk('questions', 'type', { items: estCeItems(s), q: `Transforme com <b>est-ce que</b>:<br><i>${flat(s)} ?</i>`, answer: estCe(s), audio: estCe(s) + ' ?', explain: `${estCe(s)} ?` }); }
  if (t === 2) {
    const s = pick(STATEMENTS.filter((x) => ['Tu', 'Vous'].includes(x.s))); const inv = `${cap(s.v)}-${s.s.toLowerCase()} ${s.r}`;
    return mk('questions', 'type', { items: [`q:inv:${s.s.toLowerCase()}`], q: `Transforme com <b>inversão</b>:<br><i>${flat(s)} ?</i>`, answer: inv, audio: inv + ' ?', explain: `${inv} ? (verbo + hífen + sujeito)` });
  }
  if (t === 3) { const q = pick(QWORDS); const opts = shuffle(['Où', 'Qui', 'Comment', 'Pourquoi']); return mk('questions', 'choice', { items: [`q:mot:${q.w}`], q: `Complete: <i>${q.q.replace('___', '<span class="blank">____</span>')}</i>`, options: opts, answer: opts.find((o) => o.toLowerCase() === q.ans.toLowerCase()), explain: `${q.w} = ${q.pt}`, audio: q.q.replace('___', q.ans) }); }
  if (t === 4) { const q = pick(QTILES); return mk('questions', 'tiles', { items: [`q:tile:${q.fr}`], q: `Monte a pergunta: <b>${q.pt}</b>`, tiles: shuffle(q.fr.split(' ')), answer: q.fr, audio: q.fr + ' ?' }); }
  if (t === 5) {
    const items = [
      { q: 'Vous aimez le français ?', a: 'Entonação' }, { q: 'Est-ce que vous aimez le français ?', a: 'Est-ce que' }, { q: 'Aimez-vous le français ?', a: 'Inversão' },
      { q: 'Tu habites où ?', a: 'Entonação' }, { q: 'Où est-ce que tu habites ?', a: 'Est-ce que' }, { q: 'Où habites-tu ?', a: 'Inversão' },
      { q: "Est-ce qu'elle parle allemand ?", a: 'Est-ce que' }, { q: 'Parlez-vous anglais ?', a: 'Inversão' },
    ];
    const it = pick(items); return mk('questions', 'choice', { items: [`q:type:${QTYPE[it.a]}`], q: `Que tipo de pergunta é esta?<br><b>${it.q}</b>`, audio: it.q, options: ['Entonação', 'Est-ce que', 'Inversão'], answer: it.a, explain: 'Inversão = muito formal; est-ce que = educada; entonação = coloquial.' });
  }
  const q = pick(QTILES.concat([{ pt: 'Você fala francês?', fr: 'Vous parlez français' }]));
  return mk('questions', 'speak', { items: [`q:tile:${q.fr}`], q: 'Faça a pergunta em voz alta:', answer: q.fr, shown: q.fr + ' ?', audio: q.fr + ' ?', explain: q.pt });
}

const neg = (s) => `${s.s} ${startsVowel(s.v) ? "n'" + s.v : 'ne ' + s.v} pas ${s.r}`;
const negItems = (s) => ['neg:ne', ...(startsVowel(s.v) ? ['neg:elision'] : []), ...(s.v.startsWith("s'") ? ['neg:pronominal'] : [])];
function genNegation() {
  const t = rnd(5);
  const s = pick(STATEMENTS.filter((x) => !(x.s === 'Je' && false)));
  if (t === 0 || t === 1) return mk('negation', 'type', { items: negItems(s), q: `Coloque na <b>negativa</b>:<br><i>${flat(s)}</i>`, answer: neg(s), audio: neg(s), explain: `${neg(s)}.${startsVowel(s.v) ? ' (ne → n\' antes de vogal)' : ''}` });
  if (t === 2) {
    const opts = shuffle([neg(s), `${s.s} ${s.v} pas ${s.r}`, `${s.s} ne pas ${s.v} ${s.r}`, startsVowel(s.v) ? `${s.s} ne ${s.v} pas ${s.r}` : `${s.s} ne ${s.v} ${s.r} pas`]);
    return mk('negation', 'choice', { items: negItems(s), q: `Qual é a negativa de <i>${flat(s)}</i>?`, options: opts, answer: neg(s), audio: neg(s), explain: neg(s) });
  }
  if (t === 3) {
    const toks = neg(s).split(' '); return mk('negation', 'tiles', { items: negItems(s), q: `Monte a negativa de: <i>${flat(s)}</i>`, tiles: shuffle([...toks, 'non']), answer: neg(s), audio: neg(s) });
  }
  const n = pick(NATS);
  if (Math.random() < 0.5) return mk('negation', 'type', { items: ['neg:reponse', 'neg:ne'], q: `<i>Tu es ${n.m} ?</i><br>Responda <b>não</b> (como se fosse você):`, sub: 'Non, je …', answer: `Non, je ne suis pas ${n.m}`, audio: `Tu es ${n.m} ?`, explain: `Non, je ne suis pas ${n.m}.` });
  return mk('negation', 'speak', { items: negItems(s), q: 'Diga em voz alta:', answer: neg(s), shown: neg(s) + '.', audio: neg(s), explain: '' });
}

const GEN = { alphabet: genAlphabet, comm: genComm, presenter: genPresenter, saluer: genSaluer, verbes: genVerbes, metiers: genMetiers, questions: genQuestions, negation: genNegation };

// ---------- itens de domínio ----------
// Cada unidade tem uma lista fixa de itens (o "universo"); cada exercício diz quais itens treina.
const QTILES_ALL = QTILES.concat([{ pt: 'Você fala francês?', fr: 'Vous parlez français' }]);
const UNIVERSE = {
  alphabet: () => [...Object.keys(LETTERS).map((l) => `letter:${l}`), ...ACCENTS.map((a) => `accent:${a.c}`)],
  comm: () => PHRASES.comm.map((p) => `phrase:${p.fr}`),
  presenter: () => [...PHRASES.presenter.map((p) => `phrase:${p.fr}`), ...['nom', 'nat', 'ville', 'langue', 'metier', 'etude'].map((k) => `pres:${k}`)],
  saluer: () => [...PHRASES.saluer, ...PHRASES.congé].map((p) => `phrase:${p.fr}`).concat(SITUATIONS.map((_, i) => `sit:${i}`)),
  verbes: () => Object.keys(VERBS).flatMap((v) => PRONOUNS.map((_, i) => `verb:${v}:${i}`)),
  metiers: () => [...JOBS.map((j) => `job:${j.m}`), ...NATS.map((n) => `nat:${n.m}`)],
  questions: () => ['q:estce', 'q:elision', 'q:inv:tu', 'q:inv:vous', 'q:mot:Où', 'q:mot:Qui', 'q:mot:Comment', 'q:mot:Pourquoi', 'q:type:int', 'q:type:estce', 'q:type:inv', ...QTILES_ALL.map((q) => `q:tile:${q.fr}`)],
  negation: () => ['neg:ne', 'neg:elision', 'neg:pronominal', 'neg:reponse'],
};
export const unitItems = (unit) => UNIVERSE[unit]();

// nome legível de um item, para mostrar "o que reforçar"
export function itemLabel(id) {
  const [k, a, b] = id.split(':');
  if (k === 'letter') return `Letra ${a}`;
  if (k === 'accent') return `Acento ${a}`;
  if (k === 'phrase') return a + (b ? ':' + b : '');
  if (k === 'pres') return { nom: 'Dizer o nome', nat: 'Dizer a nacionalidade', ville: 'Dizer onde mora', langue: 'Dizer os idiomas', metier: 'Dizer a profissão', etude: 'Dizer o que estuda' }[a];
  if (k === 'sit') return `Tu ou vous: ${SITUATIONS[+a].pt}`;
  if (k === 'verb') return `${a} — ${PRONOUNS[+b]}`;
  if (k === 'job') { const j = JOBS.find((x) => x.m === a); return j ? `${j.m} / ${j.f}` : a; }
  if (k === 'nat') { const n = NATS.find((x) => x.m === a); return n ? `${n.m} / ${n.f}` : a; }
  if (k === 'q') {
    if (a === 'estce') return 'Pergunta com est-ce que';
    if (a === 'elision') return "Est-ce qu' (elisão)";
    if (a === 'inv') return `Inversão com ${b}`;
    if (a === 'mot') return `Palavra: ${b}`;
    if (a === 'type') return `Reconhecer ${{ int: 'entonação', estce: 'est-ce que', inv: 'inversão' }[b]}`;
    if (a === 'tile') return `Pergunta: ${id.slice(7)}`;
  }
  if (k === 'neg') return { ne: 'Negação ne … pas', elision: "Negação com n'", pronominal: 'Negação com s\'appeler', reponse: 'Responder "Non, je ne…"' }[a];
  return id;
}

// ---------- seleção adaptativa ----------
// strengthOf(item) devolve 0..1 (item ainda não visto: ~0.3). Quanto mais fraco o item, maior a prioridade.
const priorityOf = (ex, strengthOf) => {
  const its = ex.items || [];
  const s = its.length ? its.reduce((a, i) => a + strengthOf(i), 0) / its.length : 0.5;
  return (1 - s) + Math.random() * 0.3;
};

function pickAdaptive(cands, n, strengthOf, perUnit = 99) {
  const scored = cands.map((ex) => ({ ex, p: priorityOf(ex, strengthOf) })).sort((a, b) => b.p - a.p);
  const out = []; const itemCount = {}; const unitCount = {}; const kindCount = {};
  for (const { ex } of scored) {
    if (out.length >= n) break;
    const firstItem = (ex.items || [])[0] || ex.key;
    if ((itemCount[firstItem] || 0) >= 2 || (unitCount[ex.unit] || 0) >= perUnit || (kindCount[ex.kind] || 0) >= Math.ceil(n * 0.4)) continue;
    itemCount[firstItem] = (itemCount[firstItem] || 0) + 1; unitCount[ex.unit] = (unitCount[ex.unit] || 0) + 1; kindCount[ex.kind] = (kindCount[ex.kind] || 0) + 1;
    out.push(ex);
  }
  // completa se os limites deixaram faltar exercícios
  for (const { ex } of scored) { if (out.length >= n) break; if (!out.includes(ex)) out.push(ex); }
  return shuffle(out);
}

function candidates(unitIds, perUnit) {
  const out = []; const seen = new Set();
  for (const id of unitIds) {
    let guard = 0, got = 0;
    while (got < perUnit && guard++ < perUnit * 8) {
      const ex = GEN[id]();
      if (ex.kind === 'choice' && !ex.options.includes(ex.answer)) continue;
      if (seen.has(ex.key)) continue;
      seen.add(ex.key); out.push(ex); got++;
    }
  }
  return out;
}

// unitId: uma unidade, ou 'mix' (todas, escolhendo o que está mais fraco)
// opts.kinds: limita aos tipos de exercício (usado nos degraus Reconhecer / Escrever / Falar)
export function buildSession(unitId, n = 10, strengthOf = () => 0.3, opts = {}) {
  const keep = (list) => (opts.kinds ? list.filter((ex) => opts.kinds.includes(ex.kind)) : list);
  if (unitId === 'mix') return pickAdaptive(keep(candidates(Object.keys(GEN), opts.kinds ? 40 : 12)), n, strengthOf, opts.kinds ? 99 : Math.ceil(n * 0.3));
  return pickAdaptive(keep(candidates([unitId], opts.kinds ? 120 : 44)), n, strengthOf);
}

// ---------- competências (critérios da prova oral) ----------
// Devolve [[competência, valor 0..1], ...] para o resultado de um exercício.
export function skillsFor(ex, res) {
  const out = []; const k = ex.kind; const vocabUnits = ['alphabet', 'comm', 'saluer', 'presenter', 'metiers'];
  if (k === 'listen-choice' || k === 'listen-type') out.push(['compreensao', res.ok ? 1 : 0]);
  if (k === 'speak') out.push(['pronuncia', typeof res.score === 'number' ? res.score : (res.ok ? 1 : 0)]);
  else out.push([vocabUnits.includes(ex.unit) ? 'vocabulario' : 'gramatica', res.ok ? 1 : 0]);
  return out;
}

// frases para o professor de IA (tópicos da prova)
export const EXAM_TOPICS = ["l'alphabet (épeler un prénom)", 'se présenter', 'saluer et prendre congé', 'être et les verbes en -er', 'nationalités et métiers', 'poser des questions (est-ce que, où, qui, comment, pourquoi)', 'la négation', 'régler des problèmes de communication'];
