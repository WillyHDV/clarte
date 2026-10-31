// Pacote de conteúdo "Français basique 1" (cours 1–4, "La phrase interrogative", "Contenus de la première évaluation",
// vídeos da professora e livros de apoio). Só dados: nada aqui executa lógica, e tudo precisa sobreviver a JSON.stringify.
// Formato e validação: content/README.md e content/validate.js (rodam nos testes).
import { UNITS } from './units.js';
import { LETTERS, ACCENTS, NAMES } from './alphabet.js';
import { PHRASES } from './phrases.js';
import { PROFILES, VIDEO_TV, TUVOUS, SITUATIONS } from './social.js';
import { PRONOUNS, VERBS } from './verbs.js';
import { NATS, LANGS, CITIES, QUARTIERS, JOBS } from './people.js';
import { STATEMENTS, QWORDS } from './questions.js';
import { LESSONS } from './lessons.js';

export default {
  schema: 1, // versão do formato do pacote
  id: 'fb1',
  title: 'Français basique 1',
  version: 1, // aumente quando o conteúdo mudar
  examDate: '2026-11-04', // Évaluation 1 (oral)
  units: UNITS,
  lessons: LESSONS,
  letters: LETTERS,
  accents: ACCENTS,
  names: NAMES,
  phrases: PHRASES,
  profiles: PROFILES,
  videoTv: VIDEO_TV,
  tuvous: TUVOUS,
  situations: SITUATIONS,
  pronouns: PRONOUNS,
  verbs: VERBS,
  nats: NATS,
  langs: LANGS,
  cities: CITIES,
  quartiers: QUARTIERS,
  jobs: JOBS,
  statements: STATEMENTS,
  qwords: QWORDS,
};
