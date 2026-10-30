// Conteúdo extraído dos cours 1–4, de "La phrase interrogative" e de "Contenus de la première évaluation".

export const EXAM_DATE = '2026-11-04';

export const UNITS = [
  { id: 'alphabet',  n: 1, icon: '🔤', title: "L'alphabet",               sub: 'Letras, acentos e soletrar nomes' },
  { id: 'comm',      n: 2, icon: '🆘', title: 'Problèmes de communication', sub: 'Não entendi, repita, como se diz…' },
  { id: 'presenter', n: 3, icon: '👋', title: 'Se présenter',             sub: 'Nome, profissão, nacionalidade, cidade, idiomas' },
  { id: 'saluer',    n: 4, icon: '🤝', title: 'Saluer et prendre congé',  sub: 'Cumprimentar, se despedir, tu × vous' },
  { id: 'verbes',    n: 5, icon: '🧩', title: 'Les verbes',               sub: 'être + verbos em -er (1er groupe)' },
  { id: 'metiers',   n: 6, icon: '💼', title: 'Nationalités et métiers',  sub: 'Masculino e feminino' },
  { id: 'questions', n: 7, icon: '❓', title: "L'interrogation",          sub: 'Entonação, est-ce que, où/qui/comment/pourquoi' },
  { id: 'negation',  n: 8, icon: '🚫', title: 'La négation simple',       sub: 'ne … pas' },
];

// ---------- Alfabeto ----------
export const LETTERS = {
  A: 'a', B: 'bé', C: 'cé', D: 'dé', E: 'e', F: 'effe', G: 'gé', H: 'ache', I: 'i', J: 'ji', K: 'ka', L: 'elle', M: 'emme',
  N: 'enne', O: 'o', P: 'pé', Q: 'ku', R: 'erre', S: 'esse', T: 'té', U: 'u', V: 'vé', W: 'double vé', X: 'ix', Y: 'i grec', Z: 'zède',
};
export const ACCENTS = [
  { c: 'é', name: 'accent aigu' }, { c: 'è', name: 'accent grave' }, { c: 'ê', name: 'accent circonflexe' },
  { c: 'ë', name: 'tréma' }, { c: 'ç', name: 'cédille' },
];
export const NAMES = ['Émilie', 'Alexis', 'Charlie', 'Simon', 'Mehmet', 'Jérémie', 'Céline', 'Samuel', 'Mohammed', 'Alexandre',
  'Amélie', 'Julian', 'Camille', 'Rosalie', 'Lucas', 'William', 'Marie', 'Adam', 'Pablo', 'Clara', 'Léonie', 'Taynah', 'Rariane'];

// ---------- Expressões (pt = tradução) ----------
export const PHRASES = {
  comm: [
    { fr: 'Je ne sais pas.', pt: 'Eu não sei.' },
    { fr: 'Je ne comprends pas.', pt: 'Eu não entendo.' },
    { fr: "Répétez, s'il vous plaît.", pt: 'Repita, por favor.' },
    { fr: "Tu peux répéter, s'il te plaît ?", pt: 'Você pode repetir, por favor? (tu)' },
    { fr: "Vous pouvez répéter, s'il vous plaît ?", pt: 'O senhor/a senhora/vocês podem repetir, por favor? (vous)' },
    { fr: 'Comment ça se dit « obrigado » en français ?', pt: 'Como se diz "obrigado" em francês?' },
    { fr: 'Comment ça se dit « bonjour » en portugais ?', pt: 'Como se diz "bonjour" em português?' },
  ],
  saluer: [
    { fr: 'Bonjour !', pt: 'Bom dia! / Olá! (formal, durante o dia)' },
    { fr: 'Bonsoir !', pt: 'Boa noite! (ao chegar)' },
    { fr: 'Salut !', pt: 'Oi! (informal)' },
    { fr: 'Coucou !', pt: 'Oizinho! (bem informal)' },
    { fr: 'Tu vas bien ?', pt: 'Você está bem? (tu)' },
    { fr: 'Vous allez bien ?', pt: 'O senhor/a senhora está bem? (vous)' },
    { fr: 'Ça va ?', pt: 'Tudo bem?' },
    { fr: 'Ça va bien, merci.', pt: 'Vou bem, obrigado(a).' },
  ],
  congé: [
    { fr: 'Au revoir !', pt: 'Tchau! / Até logo!' },
    { fr: 'À bientôt !', pt: 'Até breve!' },
    { fr: 'À demain !', pt: 'Até amanhã!' },
    { fr: 'À plus !', pt: 'Até mais! (informal)' },
    { fr: 'Bonne journée !', pt: 'Tenha um bom dia!' },
    { fr: 'Bonne soirée !', pt: 'Tenha uma boa noite! (ao se despedir à noite)' },
    { fr: 'Bonne nuit !', pt: 'Boa noite! (para dormir)' },
  ],
  presenter: [
    { fr: "Je m'appelle Marie.", pt: 'Eu me chamo Marie.' },
    { fr: "Comment tu t'appelles ?", pt: 'Como você se chama? (tu)' },
    { fr: "Comment vous appelez-vous ?", pt: 'Como o senhor/a senhora se chama? (vous)' },
    { fr: 'Je suis brésilienne.', pt: 'Eu sou brasileira.' },
    { fr: "J'habite à Maceió.", pt: 'Eu moro em Maceió.' },
    { fr: 'Je parle portugais et un peu français.', pt: 'Eu falo português e um pouco de francês.' },
    { fr: "J'étudie le français.", pt: 'Eu estudo francês.' },
    { fr: 'Je travaille comme vendeur.', pt: 'Eu trabalho como vendedor.' },
    { fr: 'Tu fais quoi comme métier ?', pt: 'Qual é a sua profissão? (tu)' },
    { fr: 'Tu parles quelles langues ?', pt: 'Quais idiomas você fala?' },
    { fr: 'Quelle est ta nationalité ?', pt: 'Qual é a sua nacionalidade?' },
  ],
};
// Situações tu × vous (cours 4)
export const SITUATIONS = [
  { pt: 'Professor e estudante (sala de aula)', fr: "Vous pouvez répéter, s'il vous plaît ?", wrong: "Tu peux répéter, s'il te plaît ?", reg: 'vous' },
  { pt: 'Cliente e garçom no restaurante', fr: 'Vous pouvez me donner le menu ?', wrong: 'Tu peux me donner le menu ?', reg: 'vous' },
  { pt: 'Duas amigas se encontram', fr: 'Coucou ! Tu vas bien ?', wrong: 'Bonjour ! Vous allez bien ?', reg: 'tu' },
  { pt: 'Você fala com um colega de classe da sua idade', fr: 'Salut ! Tu habites où ?', wrong: 'Bonjour ! Vous habitez où ?', reg: 'tu' },
  { pt: 'Você fala com o diretor da escola que acabou de conhecer', fr: 'Bonjour ! Comment allez-vous ?', wrong: 'Salut ! Comment vas-tu ?', reg: 'vous' },
];

// ---------- Verbos ----------
export const PRONOUNS = ['je', 'tu', 'il/elle', 'nous', 'vous', 'ils/elles'];
export const VERBS = {
  être:       { pt: 'ser / estar', forms: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'] },
  "s'appeler": { pt: 'chamar-se', forms: ["m'appelle", "t'appelles", "s'appelle", 'nous appelons', 'vous appelez', "s'appellent"], reflexive: true },
  parler:     { pt: 'falar', forms: ['parle', 'parles', 'parle', 'parlons', 'parlez', 'parlent'] },
  habiter:    { pt: 'morar', forms: ['habite', 'habites', 'habite', 'habitons', 'habitez', 'habitent'] },
  étudier:    { pt: 'estudar', forms: ['étudie', 'étudies', 'étudie', 'étudions', 'étudiez', 'étudient'] },
  travailler: { pt: 'trabalhar', forms: ['travaille', 'travailles', 'travaille', 'travaillons', 'travaillez', 'travaillent'] },
  aimer:      { pt: 'gostar / amar', forms: ['aime', 'aimes', 'aime', 'aimons', 'aimez', 'aiment'] },
};

// ---------- Nacionalidades, idiomas, cidades ----------
export const NATS = [
  { m: 'français', f: 'française', pt: 'francês(a)' }, { m: 'canadien', f: 'canadienne', pt: 'canadense' },
  { m: 'québécois', f: 'québécoise', pt: 'quebequense' }, { m: 'libanais', f: 'libanaise', pt: 'libanês(a)' },
  { m: 'turc', f: 'turque', pt: 'turco(a)' }, { m: 'brésilien', f: 'brésilienne', pt: 'brasileiro(a)' },
  { m: 'autrichien', f: 'autrichienne', pt: 'austríaco(a)' }, { m: 'belge', f: 'belge', pt: 'belga' },
  { m: 'japonais', f: 'japonaise', pt: 'japonês(a)' }, { m: 'allemand', f: 'allemande', pt: 'alemão(ã)' },
  { m: 'britannique', f: 'britannique', pt: 'britânico(a)' }, { m: 'italien', f: 'italienne', pt: 'italiano(a)' },
  { m: 'espagnol', f: 'espagnole', pt: 'espanhol(a)' }, { m: 'portugais', f: 'portugaise', pt: 'português(a)' },
  { m: 'chinois', f: 'chinoise', pt: 'chinês(a)' }, { m: 'suisse', f: 'suisse', pt: 'suíço(a)' },
  { m: 'américain', f: 'américaine', pt: 'americano(a)' }, { m: 'argentin', f: 'argentine', pt: 'argentino(a)' },
  { m: 'mexicain', f: 'mexicaine', pt: 'mexicano(a)' }, { m: 'colombien', f: 'colombienne', pt: 'colombiano(a)' },
  { m: 'équatorien', f: 'équatorienne', pt: 'equatoriano(a)' }, { m: 'sénégalais', f: 'sénégalaise', pt: 'senegalês(a)' },
  { m: 'haïtien', f: 'haïtienne', pt: 'haitiano(a)' }, { m: 'russe', f: 'russe', pt: 'russo(a)' },
];
export const LANGS = [
  { fr: 'le français', v: 'français', pt: 'francês' }, { fr: 'le portugais', v: 'portugais', pt: 'português' },
  { fr: "l'anglais", v: 'anglais', pt: 'inglês' }, { fr: "l'espagnol", v: 'espagnol', pt: 'espanhol' },
  { fr: "l'allemand", v: 'allemand', pt: 'alemão' }, { fr: "l'arabe", v: 'arabe', pt: 'árabe' },
  { fr: 'le turc', v: 'turc', pt: 'turco' }, { fr: "l'italien", v: 'italien', pt: 'italiano' },
  { fr: 'le japonais', v: 'japonais', pt: 'japonês' }, { fr: 'le chinois', v: 'chinois', pt: 'chinês' },
  { fr: 'le néerlandais', v: 'néerlandais', pt: 'holandês' },
];
export const CITIES = ['Maceió', 'Recife', 'Quito', 'Toulouse', 'Montréal', 'Bruxelles'];
export const QUARTIERS = ['Hochelaga', 'Saint-Louis', 'le Centre-ville'];

// ---------- Profissões (m / f / português) ----------
export const JOBS = [
  { m: 'journaliste', f: 'journaliste', pt: 'jornalista' }, { m: 'professeur', f: 'professeure', pt: 'professor(a)' },
  { m: 'acteur', f: 'actrice', pt: 'ator / atriz' }, { m: 'écrivain', f: 'écrivaine', pt: 'escritor(a)' },
  { m: 'chanteur', f: 'chanteuse', pt: 'cantor(a)' }, { m: 'médecin', f: 'médecin', pt: 'médico(a)' },
  { m: 'pompier', f: 'pompière', pt: 'bombeiro(a)' }, { m: 'étudiant', f: 'étudiante', pt: 'estudante' },
  { m: 'boulanger', f: 'boulangère', pt: 'padeiro(a)' }, { m: 'dentiste', f: 'dentiste', pt: 'dentista' },
  { m: 'ingénieur', f: 'ingénieure', pt: 'engenheiro(a)' }, { m: 'infirmier', f: 'infirmière', pt: 'enfermeiro(a)' },
  { m: 'architecte', f: 'architecte', pt: 'arquiteto(a)' }, { m: 'serveur', f: 'serveuse', pt: 'garçom / garçonete' },
  { m: 'vétérinaire', f: 'vétérinaire', pt: 'veterinário(a)' }, { m: 'avocat', f: 'avocate', pt: 'advogado(a)' },
  { m: 'vendeur', f: 'vendeuse', pt: 'vendedor(a)' }, { m: 'cuisinier', f: 'cuisinière', pt: 'cozinheiro(a)' },
  { m: 'coiffeur', f: 'coiffeuse', pt: 'cabeleireiro(a)' }, { m: 'policier', f: 'policière', pt: 'policial' },
  { m: 'facteur', f: 'factrice', pt: 'carteiro(a)' }, { m: 'mécanicien', f: 'mécanicienne', pt: 'mecânico(a)' },
  { m: 'chimiste', f: 'chimiste', pt: 'químico(a)' }, { m: 'secrétaire', f: 'secrétaire', pt: 'secretário(a)' },
  { m: 'pharmacien', f: 'pharmacienne', pt: 'farmacêutico(a)' }, { m: 'électricien', f: 'électricienne', pt: 'eletricista' },
  { m: 'boucher', f: 'bouchère', pt: 'açougueiro(a)' }, { m: 'peintre', f: 'peintre', pt: 'pintor(a)' },
  { m: 'concierge', f: 'concierge', pt: 'porteiro(a)' }, { m: 'juge', f: 'juge', pt: 'juiz(a)' },
  { m: 'photographe', f: 'photographe', pt: 'fotógrafo(a)' }, { m: 'musicien', f: 'musicienne', pt: 'músico(a)' },
  { m: 'enseignant', f: 'enseignante', pt: 'professor(a) / docente' }, { m: 'danseur', f: 'danseuse', pt: 'dançarino(a)' },
  { m: 'artiste', f: 'artiste', pt: 'artista' }, { m: 'chauffeur', f: 'chauffeuse', pt: 'motorista' },
];

// ---------- Interrogação ----------
// frases afirmativas (sujeito + verbo + resto) usadas em est-ce que / negação (slides + extras)
export const STATEMENTS = [
  { s: 'Elle', v: 'parle', r: 'allemand' }, { s: 'Ils', v: 'sont', r: 'ingénieurs' }, { s: 'Tu', v: 'habites', r: 'à Maceió' },
  { s: 'Vous', v: 'êtes', r: "enseignants d'anglais" }, { s: 'Tu', v: 'aimes', r: 'les films français' },
  { s: 'Il', v: 'travaille', r: 'comme pompier' }, { s: 'Elles', v: 'étudient', r: 'le portugais' },
  { s: 'Alfred Enoch', v: 'parle', r: 'portugais' }, { s: 'Pablo', v: 'parle', r: 'japonais' },
  { s: 'Clara', v: 'est', r: 'vétérinaire' }, { s: 'Rariane', v: 'étudie', r: "l'italien" },
  { s: 'La professeure', v: "s'appelle", r: 'Léonie' }, { s: 'Taynah', v: 'habite', r: 'dans le quartier Prado' },
  { s: 'Willy', v: 'travaille', r: 'comme policier' }, { s: 'Je', v: 'suis', r: 'vendeuse' }, { s: 'Elle', v: 'parle', r: 'chinois' },
  { s: 'Tu', v: 'es', r: 'britannique' }, { s: 'Il', v: 'habite', r: 'à Bruxelles' }, { s: 'Vous', v: 'parlez', r: 'français' },
  { s: 'Elle', v: 'habite', r: 'à Montréal' }, { s: 'Ils', v: 'étudient', r: "l'espagnol" }, { s: 'Tu', v: 'travailles', r: 'comme avocat' },
];
export const QWORDS = [
  { w: 'Où', q: '___ habitez-vous ?', ans: 'Où', pt: 'onde' },
  { w: 'Qui', q: '___ est Céline Dion ?', ans: 'Qui', pt: 'quem' },
  { w: 'Comment', q: "___ tu t'appelles ?", ans: 'Comment', pt: 'como' },
  { w: 'Pourquoi', q: '___ vous étudiez le français ?', ans: 'Pourquoi', pt: 'por que' },
  { w: 'Comment', q: '___ vous appelez-vous ?', ans: 'Comment', pt: 'como' },
  { w: 'Qui', q: '___ est votre professeure de français ?', ans: 'Qui', pt: 'quem' },
  { w: 'Où', q: 'Elle habite ___ ?', ans: 'où', pt: 'onde' },
  { w: 'Pourquoi', q: '___ Alfred Enoch parle portugais ?', ans: 'Pourquoi', pt: 'por que' },
  { w: 'Où', q: '___ est-ce que tu habites ?', ans: 'Où', pt: 'onde' },
  { w: 'Qui', q: '___ habite à Maceió ?', ans: 'Qui', pt: 'quem' },
];

// ---------- Aulas (resumo em português) ----------
// {{say:texto|rótulo}} vira botão que fala o texto.
export const LESSONS = {
  alphabet: `
    <h3>As 26 letras</h3>
    <p>Toque em uma letra para ouvir o nome dela.</p>
    <div class="letters">{{letters}}</div>
    <h3>Cuidado com estas letras</h3>
    <ul>
      <li><b>G</b> = {{say:gé}} e <b>J</b> = {{say:ji}} (nada de "jê").</li>
      <li><b>E</b> = {{say:e}} (boca arredondada) e <b>I</b> = {{say:i}}.</li>
      <li><b>H</b> = {{say:ache}} (a letra H é muda dentro das palavras).</li>
      <li><b>R</b> = {{say:erre}}, <b>U</b> = {{say:u}} (lábios em "u", língua em "i"), <b>Q</b> = {{say:ku}}.</li>
      <li><b>W</b> = {{say:double vé}}, <b>Y</b> = {{say:i grec}}, <b>Z</b> = {{say:zède}}.</li>
    </ul>
    <h3>Os acentos</h3>
    <div class="chips">{{accents}}</div>
    <p>O acento faz parte da grafia: <i>Émilie</i> e <i>Jérémie</i> levam <b>é</b> (accent aigu).</p>
    <h3>Para soletrar</h3>
    <ul>
      <li>{{say:Comment ça s'écrit ?}} — Como se escreve?</li>
      <li>{{say:Épelez, s'il vous plaît.}} — Soletre, por favor.</li>
      <li>{{say:Ça s'écrit M, A, R, I, E.}}</li>
    </ul>`,
  comm: `
    <h3>Quando você trava, use estas frases</h3>
    <ul class="phr">{{phrases:comm}}</ul>
    <p class="note"><b>Tu</b> ou <b>vous</b>? Com a professora e com pessoas que você não conhece, use <b>vous</b>. Com colegas e amigos, <b>tu</b>.</p>`,
  presenter: `
    <h3>Modelo de apresentação</h3>
    <div class="dialog">
      {{say:Bonjour ! Je m'appelle Marie. Je suis brésilienne. J'habite à Maceió. Je parle portugais et un peu français. Je travaille comme vendeuse. J'étudie le français.|▶ Ouvir o modelo completo}}
    </div>
    <ul class="phr">{{phrases:presenter}}</ul>
    <h3>Estrutura</h3>
    <ul>
      <li><b>Je m'appelle</b> + nome</li>
      <li><b>Je suis</b> + nacionalidade (sem artigo): <i>Je suis brésilien / brésilienne</i></li>
      <li><b>J'habite à</b> + cidade: <i>J'habite à Maceió</i> · bairro: <i>dans le quartier Hochelaga</i></li>
      <li><b>Je parle</b> + idioma: <i>Je parle portugais</i></li>
      <li><b>Je travaille comme</b> + profissão (ou <b>Je suis</b> + profissão): <i>Je suis vendeur</i></li>
    </ul>`,
  saluer: `
    <h3>Cumprimentar</h3>
    <ul class="phr">{{phrases:saluer}}</ul>
    <h3>Se despedir</h3>
    <ul class="phr">{{phrases:congé}}</ul>
    <h3>Tu × vous</h3>
    <p><b>Tu</b> = informal (amigos, família, colegas, crianças). <b>Vous</b> = formal (desconhecidos, professor, cliente/garçom, chefe) — e também plural.</p>
    <p>Se tutoyer = tratar por "tu". Se vouvoyer = tratar por "vous". Na dúvida, comece com <b>vous</b> e espere: {{say:On se tutoie ?}}</p>`,
  verbes: `
    <h3>Présent — {{say:être}} e os verbos em -er</h3>
    {{verbtables}}
    <h3>Regras rápidas</h3>
    <ul>
      <li>Verbos em <b>-er</b>: terminações <b>-e, -es, -e, -ons, -ez, -ent</b>.</li>
      <li><b>je</b> vira <b>j'</b> antes de vogal ou h mudo: <i>j'habite, j'étudie, j'aime</i>.</li>
      <li><i>parle / parles / parlent</i> têm o <b>mesmo som</b>: o -s e o -ent não se pronunciam.</li>
      <li><b>Être</b> é irregular: decore (<i>suis, es, est, sommes, êtes, sont</i>).</li>
      <li><b>S'appeler</b> é pronominal: <i>je m'appelle, tu t'appelles, il s'appelle, nous nous appelons…</i></li>
    </ul>`,
  metiers: `
    <h3>Nacionalidades</h3>
    <ul>
      <li>Regra geral: acrescente <b>-e</b> ao feminino: <i>français → française</i>, <i>allemand → allemande</i>.</li>
      <li><b>-ien → -ienne</b>: <i>brésilien → brésilienne</i>, <i>canadien → canadienne</i>.</li>
      <li><b>Invariáveis</b> (terminam em -e): <i>belge, suisse, russe, britannique</i>.</li>
      <li>Nacionalidades e idiomas ficam em <b>minúscula</b>: <i>Je suis brésilien. Je parle français.</i></li>
    </ul>
    <h3>Profissões</h3>
    <ul>
      <li><b>-eur → -euse</b>: <i>chanteur → chanteuse, vendeur → vendeuse, serveur → serveuse</i>.</li>
      <li><b>-teur → -trice</b>: <i>acteur → actrice, facteur → factrice</i>.</li>
      <li><b>-ier → -ière</b>, <b>-er → -ère</b>: <i>boulanger → boulangère, infirmier → infirmière, cuisinier → cuisinière</i>.</li>
      <li><b>-ien → -ienne</b>: <i>mécanicien → mécanicienne</i>.</li>
      <li>Iguais nos dois gêneros: <i>journaliste, dentiste, architecte, vétérinaire, secrétaire, médecin</i>.</li>
      <li>Sem artigo: <i>Il est boulanger.</i> · Com artigo: <i>C'est un boulanger.</i></li>
    </ul>
    <h3>Perguntas úteis</h3>
    <ul class="phr">
      <li>{{say:Tu fais quoi comme métier ?}}</li><li>{{say:Qu'est-ce que tu fais comme métier ?}}</li>
      <li>{{say:Tu fais quoi dans la vie ?}}</li><li>{{say:Quelle est ta nationalité ?}}</li><li>{{say:Tu parles quelles langues ?}}</li>
    </ul>
    <h3>Lista de profissões</h3>
    <table class="tbl"><tr><th>Masculin</th><th>Féminin</th><th>PT</th></tr>{{jobrows}}</table>`,
  questions: `
    <h3>3 maneiras de perguntar (sim/não)</h3>
    <ol>
      <li><b>Entonação</b> — natural, falada: {{say:Vous aimez le français ?}}</li>
      <li><b>Est-ce que</b> — natural, um pouco mais educada: {{say:Est-ce que vous aimez le français ?}}</li>
      <li><b>Inversão</b> — muito formal, mais escrita: {{say:Aimez-vous le français ?}} (inverte sujeito e verbo + hífen)</li>
    </ol>
    <p class="note"><b>Elisão:</b> antes de vogal, <i>est-ce que</i> → <i>est-ce <b>qu'</b></i>: {{say:Est-ce qu'elle habite à Maceió ?}} · {{say:Est-ce qu'il parle français ?}}</p>
    <h3>Palavras interrogativas</h3>
    <ul>
      <li><b>Où</b> (onde): {{say:Où habitez-vous ?}}</li>
      <li><b>Qui</b> (quem): {{say:Qui est Céline Dion ?}}</li>
      <li><b>Comment</b> (como): {{say:Comment tu t'appelles ?}}</li>
      <li><b>Pourquoi</b> (por que): {{say:Pourquoi vous étudiez le français ?}}</li>
    </ul>
    <p>Elas ficam no <b>início</b>, mas na fala é natural colocar no <b>fim</b>:</p>
    <table class="tbl"><tr><th>Est-ce que</th><th>Inversão</th><th>No fim (oral)</th></tr>
      <tr><td>Où est-ce que vous habitez ?</td><td>Où habitez-vous ?</td><td>Vous habitez où ?</td></tr>
      <tr><td>Où est-ce que tu habites ?</td><td>Où habites-tu ?</td><td>Tu habites où ?</td></tr></table>`,
  negation: `
    <h3>ne + verbo + pas</h3>
    <ul>
      <li>{{say:Je suis vendeuse.}} → {{say:Je ne suis pas vendeuse.}}</li>
      <li>{{say:Elle parle chinois.}} → {{say:Elle ne parle pas chinois.}}</li>
      <li>{{say:Tu es britannique.}} → {{say:Tu n'es pas britannique.}}</li>
      <li>{{say:Il habite à Bruxelles.}} → {{say:Il n'habite pas à Bruxelles.}}</li>
    </ul>
    <p class="note"><b>Elisão:</b> antes de vogal ou h mudo, <b>ne</b> vira <b>n'</b>: <i>Taynah <b>n'</b>habite pas…</i>, <i>Rariane <b>n'</b>étudie pas…</i></p>
    <p>Com verbo pronominal: <i>La professeure <b>ne</b> s'appelle <b>pas</b> Léonie.</i> (o <i>ne</i> vem antes do pronome).</p>`,
};
