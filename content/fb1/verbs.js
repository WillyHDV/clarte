// Pronomes e verbos (presente): cada verbo tem as 6 formas na ordem dos pronomes.

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
