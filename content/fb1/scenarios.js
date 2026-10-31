// Cenários da Clara: missões curtas de conversa por voz, com situação, papel da Clara, objetivos e frases-guia.
// Só dados (o formato está em content/README.md e é conferido por content/validate.js).
//
// id           identificador (letras minúsculas e números)
// icon, title, sub   como aparece na lista
// unit         id da unidade do curso a que o cenário se liga
// registro     'tu', 'vous' ou 'misto' (muda no meio da conversa)
// papel        quem a Clara interpreta (texto para a IA, em francês)
// situacao     o que acontece, mostrado ao aluno antes de começar (português)
// objetivos    o que o aluno precisa conseguir dizer. Cada um tem:
//                id     identificador (a IA marca o que foi cumprido por ele)
//                texto  o objetivo, em português
//                dica   o começo da frase (nível 2)
//                frase  uma frase completa de exemplo (nível 1)
// roteiro      como a Clara conduz a conversa (texto para a IA, em francês)
// abertura     a primeira fala da Clara (francês); é falada sem chamar a IA
// maxTurnos    depois de tantas falas do aluno a missão termina sozinha
// nivelFixo    (opcional) 3 = sempre sem ajuda, como na prova

export const SCENARIOS = [
  {
    id: 'apresentacao', icon: '🤝', title: 'Primeiro encontro', sub: 'Apresentação formal (vous)', unit: 'presenter', registro: 'vous',
    papel: "madame Martin, la directrice du centre de langues, une dame sympathique que l'élève rencontre pour la première fois",
    situacao: 'Você chega ao centro de idiomas e conhece a diretora, madame Martin. Apresente-se com educação, tratando-a por vous.',
    objetivos: [
      { id: 'saudar', texto: 'Cumprimentar e dizer como vai', dica: 'Bonjour, je vais…', frase: 'Bonjour, madame. Je vais bien, merci.' },
      { id: 'nome', texto: 'Dizer o seu nome', dica: "Je m'appelle…", frase: "Je m'appelle Willy." },
      { id: 'nacionalidade', texto: 'Dizer a sua nacionalidade', dica: 'Je suis…', frase: 'Je suis brésilien.' },
      { id: 'cidade', texto: 'Dizer onde você mora', dica: "J'habite à…", frase: "J'habite à Maceió." },
      { id: 'profissao', texto: 'Dizer o que você faz', dica: 'Je suis… ou Je travaille…', frase: 'Je suis étudiant.' },
    ],
    roteiro: "Après sa réponse à ta question d'ouverture, demande dans cet ordre : son prénom, sa nationalité, la ville où il habite, puis son métier. Une seule question à la fois. Vouvoie l'élève.",
    abertura: 'Bonjour, monsieur. Je suis madame Martin. Comment allez-vous ?', maxTurnos: 9,
  },
  {
    id: 'recepcao', icon: '🛎️', title: 'Cadastro na recepção', sub: 'Soletrar o nome e dar seus dados (vous)', unit: 'alphabet', registro: 'vous',
    papel: "la réceptionniste du centre de langues, qui remplit la fiche d'inscription de l'élève",
    situacao: 'Você vai se matricular num curso. A recepcionista preenche a sua ficha e precisa do seu nome (soletrado), da nacionalidade, da cidade e dos idiomas que você fala.',
    objetivos: [
      { id: 'nome', texto: 'Dizer o seu nome', dica: "Je m'appelle…", frase: "Je m'appelle Willy." },
      { id: 'soletrar', texto: 'Soletrar o nome letra por letra', dica: "Ça s'écrit…", frase: "Ça s'écrit W, I, L, L, Y." },
      { id: 'nacionalidade', texto: 'Dizer a sua nacionalidade', dica: 'Je suis…', frase: 'Je suis brésilien.' },
      { id: 'cidade', texto: 'Dizer a cidade onde mora', dica: "J'habite à…", frase: "J'habite à Maceió." },
      { id: 'idiomas', texto: 'Dizer que idiomas você fala', dica: 'Je parle…', frase: 'Je parle portugais et un peu français.' },
    ],
    roteiro: "Remplis la fiche : demande le prénom, puis demande-lui de l'épeler (« Vous pouvez épeler, s'il vous plaît ? »), puis la nationalité, la ville et les langues parlées. Quand il épelle, répète les lettres une fois pour confirmer. Une seule question à la fois. Vouvoie l'élève.",
    abertura: "Bonjour, monsieur ! Bienvenue. Vous vous appelez comment ?", maxTurnos: 10,
  },
  {
    id: 'colega', icon: '😄', title: 'Conhecendo um colega', sub: 'Conversa informal (tu)', unit: 'saluer', registro: 'tu',
    papel: "Léa, une camarade de classe française du même âge, décontractée et amicale",
    situacao: 'No intervalo da aula você conhece Léa, uma colega. Converse de forma informal, tratando-a por tu.',
    objetivos: [
      { id: 'saudar', texto: 'Cumprimentar de forma informal', dica: 'Salut…', frase: 'Salut ! Ça va ?' },
      { id: 'nome', texto: 'Perguntar o nome dela', dica: "Tu t'appelles…", frase: "Tu t'appelles comment ?" },
      { id: 'origem', texto: 'Dizer de onde você é', dica: 'Je suis…', frase: 'Je suis brésilien, de Maceió.' },
      { id: 'mora', texto: 'Perguntar onde ela mora', dica: 'Tu habites…', frase: 'Tu habites où ?' },
      { id: 'estuda', texto: 'Dizer que você estuda francês', dica: "J'étudie…", frase: "J'étudie le français." },
    ],
    roteiro: "Ne dis pas ton prénom avant qu'il te le demande (tu t'appelles Léa, tu habites à Lyon, tu étudies le portugais). Pose-lui de temps en temps une question simple (il vient d'où, il étudie quoi) et réponds brièvement à ses questions. Tutoie l'élève. Une seule question à la fois.",
    abertura: 'Salut ! Tu es nouveau ici ?', maxTurnos: 10,
  },
  {
    id: 'naoentendi', icon: '🆘', title: 'Não entendi', sub: 'Pedir ajuda para se comunicar', unit: 'comm', registro: 'vous',
    papel: 'un guide de musée qui parle un peu vite et utilise quelques mots difficiles',
    situacao: 'Um guia fala rápido e usa palavras que você não conhece. Use as expressões do curso para pedir ajuda: não entendi, repita, como se diz…',
    objetivos: [
      { id: 'naoentendo', texto: 'Dizer que não entendeu', dica: 'Je ne comprends…', frase: 'Je ne comprends pas.' },
      { id: 'repetir', texto: 'Pedir para repetir', dica: 'Répétez…', frase: "Répétez, s'il vous plaît." },
      { id: 'comosedisse', texto: 'Perguntar como se diz uma palavra', dica: 'Comment ça se dit…', frase: 'Comment ça se dit « museu » en français ?' },
      { id: 'naosei', texto: 'Dizer que não sabe', dica: 'Je ne sais…', frase: 'Je ne sais pas.' },
      { id: 'responder', texto: 'Responder depois de entender', dica: 'Oui, … ou Non, …', frase: "Oui, j'aime les musées." },
    ],
    roteiro: "Pour ce scénario seulement, tu peux utiliser quelques mots hors du cours (« exposition », « tableau », « visite ») et parler un peu plus vite, pour que l'élève ait de vraies raisons de demander de l'aide. Quand il demande de répéter, répète plus lentement avec des mots plus simples. Quand il demande « Comment ça se dit… », donne le mot en français. Pose aussi une question à laquelle il peut répondre « Je ne sais pas », puis une question simple oui ou non. Vouvoie l'élève.",
    abertura: "Bonjour ! Bienvenue au musée. Aujourd'hui, la visite commence par l'exposition de peinture.", maxTurnos: 10,
  },
  {
    id: 'entrevista', icon: '🎤', title: 'Entrevistar a Clara', sub: 'Você faz as perguntas', unit: 'questions', registro: 'vous',
    papel: "Clara elle-même, avec un personnage cohérent : française, de Lyon, professeure de français, parle français et un peu portugais, adore le cinéma",
    situacao: 'Agora é você quem pergunta! Entreviste a Clara usando comment, où, est-ce que, pourquoi e a entonação.',
    objetivos: [
      { id: 'nome', texto: 'Perguntar como ela se chama', dica: 'Comment vous…', frase: "Comment vous vous appelez ?" },
      { id: 'mora', texto: 'Perguntar onde ela mora', dica: 'Où est-ce que…', frase: 'Où est-ce que vous habitez ?' },
      { id: 'estceque', texto: 'Fazer uma pergunta com est-ce que', dica: 'Est-ce que vous…', frase: 'Est-ce que vous êtes professeure ?' },
      { id: 'entonacao', texto: 'Fazer uma pergunta só com a entonação', dica: 'Vous parlez…', frase: 'Vous parlez portugais ?' },
      { id: 'pourquoi', texto: 'Perguntar o motivo com pourquoi', dica: 'Pourquoi…', frase: 'Pourquoi vous aimez le cinéma ?' },
    ],
    roteiro: "C'est l'élève qui pose les questions : toi, tu réponds brièvement (une phrase) avec ton personnage. Ne pose pas de question toi-même, sauf « Vous avez d'autres questions ? » s'il hésite. S'il pose une question incorrecte mais compréhensible, réponds-y quand même. Vouvoie l'élève.",
    abertura: "Bonjour ! Aujourd'hui, c'est vous qui posez les questions. Je vous écoute.", maxTurnos: 11,
  },
  {
    id: 'verdadeirofalso', icon: '🚫', title: 'Verdadeiro ou falso', sub: 'Negar com ne … pas', unit: 'negation', registro: 'vous',
    papel: "un agent à l'accueil qui vérifie la fiche de l'élève, mais qui se trompe exprès",
    situacao: 'A atendente confere a sua ficha, mas "erra" de propósito. Corrija com ne … pas e dê a informação certa. Aqui você é brasileiro, mora em Maceió e fala português.',
    objetivos: [
      { id: 'negar1', texto: 'Negar a nacionalidade com ne … pas', dica: 'Non, je ne suis pas…', frase: 'Non, je ne suis pas italien.' },
      { id: 'negar2', texto: 'Negar a cidade com ne … pas', dica: "Non, je n'habite pas…", frase: "Non, je n'habite pas à Paris." },
      { id: 'negar3', texto: 'Negar um idioma com ne … pas', dica: 'Non, je ne parle pas…', frase: 'Non, je ne parle pas allemand.' },
      { id: 'corrigir', texto: 'Dar a informação certa depois de negar', dica: 'Je suis…', frase: 'Je suis brésilien.' },
      { id: 'confirmar', texto: 'Confirmar algo verdadeiro com Oui', dica: 'Oui, …', frase: "Oui, j'habite à Maceió." },
    ],
    roteiro: "Fais exprès des erreurs sur la fiche : la nationalité (italien, argentin), la ville (Paris, Lisbonne), une langue (allemand, espagnol). Les vraies informations de l'élève : brésilien, il habite à Maceió, il parle portugais. Après chaque négation correcte, demande-lui la bonne information. À un moment, dis une chose VRAIE (par exemple « Vous habitez à Maceió, c'est ça ? ») pour qu'il réponde « Oui ». Une seule question à la fois. Vouvoie l'élève.",
    abertura: "Bonjour, monsieur. Je vérifie votre fiche. Vous êtes italien, c'est ça ?", maxTurnos: 10,
  },
  {
    id: 'despedida', icon: '👋', title: 'Despedida', sub: 'Tu com a colega, vous com a professora', unit: 'saluer', registro: 'misto',
    papel: "d'abord Léa, une camarade de classe (tu), puis madame Martin, la professeure (vous)",
    situacao: 'A aula acabou. Primeiro você se despede da colega Léa (tu) e depois da professora, madame Martin (vous).',
    objetivos: [
      { id: 'colega', texto: 'Despedir-se da colega (tu)', dica: 'Salut Léa, à…', frase: 'Salut Léa, à demain !' },
      { id: 'vaibem', texto: 'Dizer que está bem e agradecer', dica: 'Ça va bien…', frase: 'Ça va bien, merci.' },
      { id: 'professora', texto: 'Despedir-se da professora (vous)', dica: 'Au revoir, madame…', frase: 'Au revoir, madame.' },
      { id: 'merci', texto: 'Agradecer à professora', dica: 'Merci…', frase: 'Merci beaucoup, madame.' },
      { id: 'desejar', texto: 'Desejar um bom dia ou fim de semana', dica: 'Bonne journée…', frase: 'Bonne journée, madame !' },
    ],
    roteiro: "Phase 1 (deux ou trois répliques) : tu es Léa, tu tutoies. Ensuite annonce le changement de personnage par une phrase parlée simple : « Voilà madame Martin, la professeure. » Phase 2 : tu es madame Martin et tu vouvoies. Si l'élève dit « tu » à la professeure ou « vous » à Léa, corrige-le avec douceur (niveaux 1 et 2 seulement). Une seule question à la fois.",
    abertura: 'Salut ! Le cours est fini. Ça va ?', maxTurnos: 10,
  },
  {
    id: 'miniprova', icon: '🎓', title: 'Mini-prova oral', sub: 'Sem ajuda, como na avaliação', unit: 'presenter', registro: 'vous', nivelFixo: 3,
    papel: "l'examinatrice (la professeure Clara), calme et neutre, comme dans une vraie évaluation orale",
    situacao: 'Simulação curta da avaliação oral: sem frases na tela e sem correção durante a conversa. No fim você recebe o resultado de cada objetivo.',
    objetivos: [
      { id: 'saudar', texto: 'Cumprimentar e dizer como vai', dica: 'Bonjour, je vais…', frase: 'Bonjour, madame. Je vais bien, merci.' },
      { id: 'nome', texto: 'Dizer o seu nome', dica: "Je m'appelle…", frase: "Je m'appelle Willy." },
      { id: 'soletrar', texto: 'Soletrar o nome', dica: "Ça s'écrit…", frase: "Ça s'écrit W, I, L, L, Y." },
      { id: 'nacionalidade', texto: 'Dizer a nacionalidade', dica: 'Je suis…', frase: 'Je suis brésilien.' },
      { id: 'cidade', texto: 'Dizer onde mora', dica: "J'habite à…", frase: "J'habite à Maceió." },
      { id: 'profissao', texto: 'Dizer o que faz', dica: 'Je suis…', frase: 'Je suis étudiant.' },
      { id: 'pergunta', texto: 'Fazer uma pergunta com est-ce que', dica: 'Est-ce que…', frase: 'Est-ce que vous habitez à Paris ?' },
      { id: 'negacao', texto: 'Dizer uma frase negativa', dica: 'Je ne… pas', frase: 'Je ne parle pas allemand.' },
    ],
    roteiro: "Pose UNE question à la fois, dans cet ordre approximatif : comment il va, son prénom, l'épeler, sa nationalité, sa ville, son métier ; puis demande-lui de te poser une question (« Posez-moi une question avec est-ce que ») ; puis une phrase négative (par exemple « Vous parlez allemand ? » pour qu'il réponde « Non, je ne parle pas allemand »). Vouvoie l'élève. N'aide jamais.",
    abertura: "Bonjour, monsieur. Asseyez-vous, s'il vous plaît. Comment allez-vous ?", maxTurnos: 12,
  },
];
