// Folha de revisão: resumo de uma página (2 colunas) com tudo o que cai na Évaluation 1, gerado a partir do mesmo conteúdo do app.
import { evaluations } from './progress.js';
import { LETTERS, ACCENTS, PHRASES, VERBS, PRONOUNS, JOBS, NATS, TUVOUS } from './data.js';
import { esc, I } from './ui.js';

const vowel = (w) => /^[aeiouyhàâäéèêëîïôöùûüœ]/i.test(w);
const forms = (v) => v.forms.map((f, i) => (i === 0 ? (vowel(f) ? `j'${f}` : `je ${f}`) : `${PRONOUNS[i]} ${f}`));
const list = (arr) => `<ul>${arr.map((x) => `<li>${x}</li>`).join('')}</ul>`;
const phr = (arr) => list(arr.map((p) => `<b>${esc(p.fr)}</b> <span>${esc(p.pt)}</span>`));

export function folhaHtml() {
  const ev = evaluations().find((e) => e.sheet) || evaluations()[0];
  const d = new Date(ev.date + 'T12:00:00').toLocaleDateString('pt-BR');
  return `
  <article class="folha">
    <header class="fhead">
      <div><div class="brand">Clarté</div><h1>Folha de revisão</h1><small>${esc(ev.title)} · ${d} · Français basique 1</small></div>
      <button class="btn primary noprint" id="fprint">${I('printer')} Imprimir / salvar PDF</button>
    </header>

    <section><h2>1. L'alphabet</h2>
      <p class="letters-line">${Object.entries(LETTERS).map(([l, n]) => `<b>${l}</b> ${esc(n)}`).join(' · ')}</p>
      <p>Acentos: ${ACCENTS.map((a) => `<b>${a.c}</b> ${esc(a.name)}`).join(' · ')}</p>
      <p><b>Comment ça s'écrit ?</b> — <b>Épelez, s'il vous plaît.</b></p></section>

    <section><h2>2. Problèmes de communication</h2>${phr(PHRASES.comm)}</section>

    <section><h2>3. Se présenter</h2>
      <p><b>Bonjour ! Je m'appelle</b> Marie. <b>Je suis</b> brésilienne. <b>J'habite à</b> Maceió. <b>Je parle</b> portugais. <b>Je travaille comme</b> vendeuse. <b>J'étudie</b> le français.</p>
      ${phr(PHRASES.presenter)}</section>

    <section><h2>4. Saluer et prendre congé</h2>
      ${phr(PHRASES.saluer)}${phr(PHRASES.congé)}
      <p><b>Tu</b> (amigos, colegas) × <b>vous</b> (professora, desconhecidos, cliente/garçom).</p>
      <table class="ftbl"><tr><th>tu</th><th>vous</th></tr>${TUVOUS.map((p) => `<tr><td>${esc(p.tu)}</td><td>${esc(p.vous)}</td></tr>`).join('')}</table></section>

    <section><h2>5. Les verbes (présent)</h2>
      <div class="fverbs">${Object.entries(VERBS).map(([inf, v]) => `<div><h3>${esc(inf)} <small>${esc(v.pt)}</small></h3>${forms(v).map((x) => esc(x)).join('<br>')}</div>`).join('')}</div>
      <p>Verbos em <b>-er</b>: terminações <b>-e, -es, -e, -ons, -ez, -ent</b>. <i>je</i> → <i>j'</i> antes de vogal ou h mudo.</p></section>

    <section><h2>6. Nationalités et métiers</h2>
      <p><b>Nacionalidades</b> (masc. / fem.): ${NATS.map((n) => (n.m === n.f ? esc(n.m) : `${esc(n.m)} / ${esc(n.f)}`)).join(' · ')}.</p>
      <p><b>Profissões</b> (masc. / fem.): ${JOBS.map((j) => (j.m === j.f ? esc(j.m) : `${esc(j.m)} / ${esc(j.f)}`)).join(' · ')}.</p>
      <p>Perguntas: <b>Tu fais quoi comme métier ?</b> · <b>Quelle est ta nationalité ?</b> · <b>Tu parles quelles langues ?</b></p></section>

    <section><h2>7. L'interrogation</h2>
      ${list(['<b>Entonação:</b> Vous aimez le français ?', '<b>Est-ce que:</b> Est-ce que vous aimez le français ? · Est-ce <b>qu\'</b>elle habite à Maceió ?', '<b>Inversão</b> (formal): Aimez-vous le français ? · Où habitez-vous ?'])}
      <p><b>Où</b> (onde) · <b>Qui</b> (quem) · <b>Comment</b> (como) · <b>Pourquoi</b> (por que) — no início, ou no fim na fala: <i>Tu habites où ?</i></p></section>

    <section><h2>8. La négation</h2>
      ${list(['<b>ne + verbo + pas:</b> Elle <b>ne</b> parle <b>pas</b> chinois.', "<b>n'</b> antes de vogal: Il <b>n'</b>habite <b>pas</b> à Bruxelles.", "Pronominal: La professeure <b>ne</b> s'appelle <b>pas</b> Léonie."])}</section>

    <section class="fcrit"><h2>Como a prova oral é avaliada</h2>
      ${list(['<b>Compréhension</b> das perguntas', '<b>Capacité à répondre</b>: respostas pertinentes', '<b>Vocabulaire</b> estudado em aula', '<b>Correction linguistique</b>: estruturas estudadas', '<b>Prononciation</b>: palavras claras', "<b>Aisance à l'oral</b>: bom ritmo, mesmo com pausas"])}
      <p><b>Dicas:</b> fale devagar; se não entender, diga <i>Répétez, s'il vous plaît</i>; responda em frases completas; use <i>vous</i> com a professora.</p></section>
  </article>`;
}
