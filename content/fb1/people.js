// Nacionalidades, idiomas, cidades e profissões (masculino / feminino / português).

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
