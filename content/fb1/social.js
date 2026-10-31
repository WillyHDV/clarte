// Apresentações, tu × vous e situações sociais (cours 2–4 e vídeos da professora).

// Os 6 apresentados no vídeo "Présentation" da professora (mesmos dados dos exercícios das aulas 2 e 3)
export const PROFILES = [
  { name: 'Émilie', g: 'f', nat: 'canadienne', langs: ['français'] },
  { name: 'Alexis', g: 'm', nat: 'québécois', langs: ['français', 'anglais'] },
  { name: 'Charlie', g: 'f', nat: 'libano-québécoise', langs: ['français', 'anglais', 'arabe'] },
  { name: 'Simon', g: 'm', nat: 'montréalais', langs: ['français'] },
  { name: 'Mehmet', g: 'm', nat: 'turc', langs: ['turc', 'anglais', 'un peu français'] },
  { name: 'Jérémie', g: 'm', nat: 'québécois', langs: ['français'] },
];
// Falas do vídeo "On se tutoie ?": quem se trata por tu e quem por vous
export const VIDEO_TV = [
  { fr: 'Bonjour Christophe, comment allez-vous ?', reg: 'vous', pt: 'Bom dia, Christophe, como vai o senhor?' },
  { fr: 'Et vous, ça va ?', reg: 'vous', pt: 'E o senhor, tudo bem?' },
  { fr: 'Salut Maxime, ça va ?', reg: 'tu', pt: 'Oi, Maxime, tudo bem?' },
  { fr: 'Ça va, et toi ?', reg: 'tu', pt: 'Tudo bem, e você?' },
  { fr: 'Vous habitez dans le quartier ?', reg: 'vous', pt: 'O senhor/a senhora mora no bairro?' },
  { fr: 'Je vous présente Sophie, notre nouvelle voisine.', reg: 'vous', pt: 'Apresento-lhe a Sophie, nossa nova vizinha.' },
  { fr: 'Ravi de faire votre connaissance.', reg: 'vous', pt: 'Prazer em conhecê-lo(a).' },
];
// Perguntas em tu e em vous (curso + quadro "Tutoyer et vouvoyer", Rodrigues p. 27)
export const TUVOUS = [
  { tu: "Tu t'appelles comment ?", vous: 'Vous vous appelez comment ?', pt: 'Como você se chama?' },
  { tu: 'Quel est ton nom ?', vous: 'Quel est votre nom ?', pt: 'Qual é o seu nome?' },
  { tu: 'Quelle est ta nationalité ?', vous: 'Quelle est votre nationalité ?', pt: 'Qual é a sua nacionalidade?' },
  { tu: 'Tu habites où ?', vous: 'Vous habitez où ?', pt: 'Onde você mora?' },
  { tu: 'Tu parles quelles langues ?', vous: 'Vous parlez quelles langues ?', pt: 'Quais idiomas você fala?' },
  { tu: 'Tu vas bien ?', vous: 'Vous allez bien ?', pt: 'Você está bem?' },
  { tu: "Tu peux répéter, s'il te plaît ?", vous: "Vous pouvez répéter, s'il vous plaît ?", pt: 'Você pode repetir, por favor?' },
];
// Situações tu × vous (cours 4)
export const SITUATIONS = [
  { pt: 'Professor e estudante (sala de aula)', fr: "Vous pouvez répéter, s'il vous plaît ?", wrong: "Tu peux répéter, s'il te plaît ?", reg: 'vous' },
  { pt: 'Cliente e garçom no restaurante', fr: 'Vous pouvez me donner le menu ?', wrong: 'Tu peux me donner le menu ?', reg: 'vous' },
  { pt: 'Duas amigas se encontram', fr: 'Coucou ! Tu vas bien ?', wrong: 'Bonjour ! Vous allez bien ?', reg: 'tu' },
  { pt: 'Você fala com um colega de classe da sua idade', fr: 'Salut ! Tu habites où ?', wrong: 'Bonjour ! Vous habitez où ?', reg: 'tu' },
  { pt: 'Você fala com o diretor da escola que acabou de conhecer', fr: 'Bonjour ! Comment allez-vous ?', wrong: 'Salut ! Comment vas-tu ?', reg: 'vous' },
];
