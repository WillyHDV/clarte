// Sons do francês: treino de ouvido com pares mínimos (palavras que só mudam num som).
// Só dados, como os pacotes de curso, mas fora de `fb1/` de propósito: sons não dependem de curso nenhum e acompanham o aluno (camada pessoal, ROADMAP seção 3).
// Cada grupo traz um contraste difícil para quem fala português; cada par (ou trio) traz as palavras, o significado e a pronúncia em IPA.
// Formato conferido por test/sons.test.js: ids únicos; 2 a 3 palavras por par, com significados e pronúncias diferentes entre si.
//   grupo: { id, titulo, ipa, resumo, dica, digitar?, pares: [ { id, palavras: [ { fr, pt, ipa } ] } ] }

export const SONS = [
  {
    id: 'u-ou', titulo: 'u × ou', ipa: '/y/ × /u/', resumo: 'O "u" francês não existe em português; o "ou" é o nosso "u".',
    dica: 'O "ou" (roue) é o "u" de "tudo". Para o "u" de rue, prepare a língua como para dizer "i" e, sem mexê-la, arredonde os lábios como quem vai assobiar. Se sair o "u" de "tudo", os lábios estão certos e a língua está recuada demais.',
    pares: [
      { id: 'rue-roue', palavras: [{ fr: 'rue', pt: 'rua', ipa: '/ʁy/' }, { fr: 'roue', pt: 'roda', ipa: '/ʁu/' }] },
      { id: 'tu-tout', palavras: [{ fr: 'tu', pt: 'você (tu)', ipa: '/ty/' }, { fr: 'tout', pt: 'tudo, todo', ipa: '/tu/' }] },
      { id: 'vu-vous', palavras: [{ fr: 'vu', pt: 'visto', ipa: '/vy/' }, { fr: 'vous', pt: 'vocês', ipa: '/vu/' }] },
      { id: 'dessus-dessous', palavras: [{ fr: 'dessus', pt: 'em cima', ipa: '/dəsy/' }, { fr: 'dessous', pt: 'embaixo', ipa: '/dəsu/' }] },
      { id: 'sur-sourd', palavras: [{ fr: 'sur', pt: 'sobre', ipa: '/syʁ/' }, { fr: 'sourd', pt: 'surdo', ipa: '/suʁ/' }] },
      { id: 'lu-loup', palavras: [{ fr: 'lu', pt: 'lido', ipa: '/ly/' }, { fr: 'loup', pt: 'lobo', ipa: '/lu/' }] },
    ],
  },
  {
    id: 'u-i', titulo: 'u × i', ipa: '/y/ × /i/', resumo: 'Mesma posição da língua; só os lábios mudam.',
    dica: 'A língua fica no mesmo lugar nos dois sons, na frente da boca. No "i" (riz) os lábios ficam esticados, como num sorriso; no "u" (rue) ficam arredondados. Diante de um espelho, a língua não se mexe, só os lábios.',
    pares: [
      { id: 'rue-riz', palavras: [{ fr: 'rue', pt: 'rua', ipa: '/ʁy/' }, { fr: 'riz', pt: 'arroz', ipa: '/ʁi/' }] },
      { id: 'du-dit', palavras: [{ fr: 'du', pt: 'do (de + o)', ipa: '/dy/' }, { fr: 'dit', pt: 'disse, dito', ipa: '/di/' }] },
      { id: 'vu-vie', palavras: [{ fr: 'vu', pt: 'visto', ipa: '/vy/' }, { fr: 'vie', pt: 'vida', ipa: '/vi/' }] },
      { id: 'lu-lit', palavras: [{ fr: 'lu', pt: 'lido', ipa: '/ly/' }, { fr: 'lit', pt: 'cama', ipa: '/li/' }] },
      { id: 'sur-cire', palavras: [{ fr: 'sur', pt: 'sobre', ipa: '/syʁ/' }, { fr: 'cire', pt: 'cera', ipa: '/siʁ/' }] },
      { id: 'nu-nid', palavras: [{ fr: 'nu', pt: 'nu', ipa: '/ny/' }, { fr: 'nid', pt: 'ninho', ipa: '/ni/' }] },
    ],
  },
  {
    id: 'e-e', titulo: 'é × è', ipa: '/e/ × /ɛ/', resumo: 'O "é" francês é fechado e o "è" é aberto: o acento pode enganar quem lê em português.',
    dica: 'Cuidado com o nome do acento. O "é" francês (accent aigu) soa como o nosso "ê" de "você"; o "è" (accent grave) soa como o nosso "é" de "café". Em "ais", "ait" e "êt" o som também é o aberto: mais, lait, prêt.',
    digitar: false,
    pares: [
      { id: 'mes-mais', palavras: [{ fr: 'mes', pt: 'meus, minhas', ipa: '/me/' }, { fr: 'mais', pt: 'mas', ipa: '/mɛ/' }] },
      { id: 'les-lait', palavras: [{ fr: 'les', pt: 'os, as', ipa: '/le/' }, { fr: 'lait', pt: 'leite', ipa: '/lɛ/' }] },
      { id: 'pre-pret', palavras: [{ fr: 'pré', pt: 'prado', ipa: '/pʁe/' }, { fr: 'prêt', pt: 'pronto', ipa: '/pʁɛ/' }] },
      { id: 'fee-fait', palavras: [{ fr: 'fée', pt: 'fada', ipa: '/fe/' }, { fr: 'fait', pt: 'faz, feito', ipa: '/fɛ/' }] },
      { id: 'ete-etait', palavras: [{ fr: 'été', pt: 'verão', ipa: '/ete/' }, { fr: 'était', pt: 'era', ipa: '/etɛ/' }] },
    ],
  },
  {
    id: 'nasais', titulo: 'an × on × in', ipa: '/ɑ̃/ × /ɔ̃/ × /ɛ̃/', resumo: 'Três vogais nasais diferentes. O "n" do fim não se pronuncia.',
    dica: 'A vogal inteira soa pelo nariz e a língua não encosta para fazer o "n". O "on" (bon) é redondo e fechado, perto do "õ" de "bom". O "an" (vent) é aberto, perto do "ã" de "lã". O "in" (vin) é um "é" pelo nariz. Em nenhum deles se fecha a boca no fim, como faríamos com um "m".',
    pares: [
      { id: 'vin-vent-vont', palavras: [{ fr: 'vin', pt: 'vinho', ipa: '/vɛ̃/' }, { fr: 'vent', pt: 'vento', ipa: '/vɑ̃/' }, { fr: 'vont', pt: 'vão (ir)', ipa: '/vɔ̃/' }] },
      { id: 'bain-banc-bon', palavras: [{ fr: 'bain', pt: 'banho', ipa: '/bɛ̃/' }, { fr: 'banc', pt: 'banco (de sentar)', ipa: '/bɑ̃/' }, { fr: 'bon', pt: 'bom', ipa: '/bɔ̃/' }] },
      { id: 'sein-sans-son', palavras: [{ fr: 'sein', pt: 'seio', ipa: '/sɛ̃/' }, { fr: 'sans', pt: 'sem', ipa: '/sɑ̃/' }, { fr: 'son', pt: 'seu, som', ipa: '/sɔ̃/' }] },
      { id: 'lin-lent-long', palavras: [{ fr: 'lin', pt: 'linho', ipa: '/lɛ̃/' }, { fr: 'lent', pt: 'lento', ipa: '/lɑ̃/' }, { fr: 'long', pt: 'longo', ipa: '/lɔ̃/' }] },
      { id: 'teint-temps-ton', palavras: [{ fr: 'teint', pt: 'tez', ipa: '/tɛ̃/' }, { fr: 'temps', pt: 'tempo', ipa: '/tɑ̃/' }, { fr: 'ton', pt: 'teu, tom', ipa: '/tɔ̃/' }] },
    ],
  },
  {
    id: 'masc-fem', titulo: 'masculino × feminino', ipa: 'consoante final', resumo: 'Em muitos adjetivos, o feminino se ouve: a última consoante aparece.',
    dica: 'No masculino a última consoante é muda (petit); no feminino ela soa, porque há um "e" depois dela (petite). Nos nasais, bon vira bonne: a vogal deixa de ser nasal e o "n" aparece. Ouvir essa diferença diz se a frase fala de um homem ou de uma mulher.',
    pares: [
      { id: 'petit-petite', palavras: [{ fr: 'petit', pt: 'pequeno', ipa: '/pəti/' }, { fr: 'petite', pt: 'pequena', ipa: '/pətit/' }] },
      { id: 'grand-grande', palavras: [{ fr: 'grand', pt: 'grande (m.)', ipa: '/gʁɑ̃/' }, { fr: 'grande', pt: 'grande (f.)', ipa: '/gʁɑ̃d/' }] },
      { id: 'chaud-chaude', palavras: [{ fr: 'chaud', pt: 'quente (m.)', ipa: '/ʃo/' }, { fr: 'chaude', pt: 'quente (f.)', ipa: '/ʃod/' }] },
      { id: 'vert-verte', palavras: [{ fr: 'vert', pt: 'verde (m.)', ipa: '/vɛʁ/' }, { fr: 'verte', pt: 'verde (f.)', ipa: '/vɛʁt/' }] },
      { id: 'gris-grise', palavras: [{ fr: 'gris', pt: 'cinza (m.)', ipa: '/gʁi/' }, { fr: 'grise', pt: 'cinza (f.)', ipa: '/gʁiz/' }] },
      { id: 'bon-bonne', palavras: [{ fr: 'bon', pt: 'bom', ipa: '/bɔ̃/' }, { fr: 'bonne', pt: 'boa', ipa: '/bɔn/' }] },
      { id: 'francais-francaise', palavras: [{ fr: 'français', pt: 'francês', ipa: '/fʁɑ̃sɛ/' }, { fr: 'française', pt: 'francesa', ipa: '/fʁɑ̃sɛz/' }] },
      { id: 'un-une', palavras: [{ fr: 'un', pt: 'um', ipa: '/œ̃/' }, { fr: 'une', pt: 'uma', ipa: '/yn/' }] },
      { id: 'content-contente', palavras: [{ fr: 'content', pt: 'contente (m.)', ipa: '/kɔ̃tɑ̃/' }, { fr: 'contente', pt: 'contente (f.)', ipa: '/kɔ̃tɑ̃t/' }] },
    ],
  },
  {
    id: 's-z', titulo: 's × z', ipa: '/s/ × /z/', resumo: 'Entre vogais, um "s" simples soa como "z"; com "ss" soa como "s".',
    dica: 'É como em português: "casa" tem som de z e "passo" tem som de s. Em francês a diferença troca a palavra: poison é veneno e poisson é peixe. No começo da palavra, o "s" soa como "s" (sac).',
    pares: [
      { id: 'poison-poisson', palavras: [{ fr: 'poison', pt: 'veneno', ipa: '/pwazɔ̃/' }, { fr: 'poisson', pt: 'peixe', ipa: '/pwasɔ̃/' }] },
      { id: 'desert-dessert', palavras: [{ fr: 'désert', pt: 'deserto', ipa: '/dezɛʁ/' }, { fr: 'dessert', pt: 'sobremesa', ipa: '/desɛʁ/' }] },
      { id: 'cousin-coussin', palavras: [{ fr: 'cousin', pt: 'primo', ipa: '/kuzɛ̃/' }, { fr: 'coussin', pt: 'almofada', ipa: '/kusɛ̃/' }] },
      { id: 'base-basse', palavras: [{ fr: 'base', pt: 'base', ipa: '/baz/' }, { fr: 'basse', pt: 'baixa', ipa: '/bas/' }] },
      { id: 'case-casse', palavras: [{ fr: 'case', pt: 'cabana', ipa: '/kaz/' }, { fr: 'casse', pt: 'quebra', ipa: '/kas/' }] },
    ],
  },
  {
    id: 'ch-j', titulo: 'ch × j', ipa: '/ʃ/ × /ʒ/', resumo: 'O "ch" é o "x" de "xícara"; o "j" é o "j" de "janela".',
    dica: 'Os dois sons já existem em português. O "ch" é o "x" de "xícara"; o "j" é o "j" de "janela". Para sentir a diferença, toque a garganta com os dedos: no "j" ela vibra, no "ch" não.',
    pares: [
      { id: 'chou-joue', palavras: [{ fr: 'chou', pt: 'repolho', ipa: '/ʃu/' }, { fr: 'joue', pt: 'bochecha', ipa: '/ʒu/' }] },
      { id: 'bouche-bouge', palavras: [{ fr: 'bouche', pt: 'boca', ipa: '/buʃ/' }, { fr: 'bouge', pt: 'mexe', ipa: '/buʒ/' }] },
      { id: 'chant-gens', palavras: [{ fr: 'chant', pt: 'canto', ipa: '/ʃɑ̃/' }, { fr: 'gens', pt: 'pessoas', ipa: '/ʒɑ̃/' }] },
      { id: 'cher-gere', palavras: [{ fr: 'cher', pt: 'caro', ipa: '/ʃɛʁ/' }, { fr: 'gère', pt: 'gerencia', ipa: '/ʒɛʁ/' }] },
      { id: 'hache-age', palavras: [{ fr: 'hache', pt: 'machado', ipa: '/aʃ/' }, { fr: 'âge', pt: 'idade', ipa: '/aʒ/' }] },
    ],
  },
  {
    id: 'r-l', titulo: 'r × l', ipa: '/ʁ/ × /l/', resumo: 'O "r" francês vem do fundo da garganta; o "l" usa a ponta da língua.',
    dica: 'No "l" a ponta da língua toca atrás dos dentes de cima, como em "lua". No "r" a ponta da língua fica baixa, atrás dos dentes de baixo, e o som sai do fundo da garganta, parecido com o "r" de "carro" em alguns sotaques, só que mais suave. Se a ponta da língua subir, o "r" vira "l".',
    pares: [
      { id: 'roi-loi', palavras: [{ fr: 'roi', pt: 'rei', ipa: '/ʁwa/' }, { fr: 'loi', pt: 'lei', ipa: '/lwa/' }] },
      { id: 'rire-lire', palavras: [{ fr: 'rire', pt: 'rir', ipa: '/ʁiʁ/' }, { fr: 'lire', pt: 'ler', ipa: '/liʁ/' }] },
      { id: 'rond-long', palavras: [{ fr: 'rond', pt: 'redondo', ipa: '/ʁɔ̃/' }, { fr: 'long', pt: 'longo', ipa: '/lɔ̃/' }] },
      { id: 'riz-lit', palavras: [{ fr: 'riz', pt: 'arroz', ipa: '/ʁi/' }, { fr: 'lit', pt: 'cama', ipa: '/li/' }] },
      { id: 'rame-lame', palavras: [{ fr: 'rame', pt: 'remo', ipa: '/ʁam/' }, { fr: 'lame', pt: 'lâmina', ipa: '/lam/' }] },
    ],
  },
];
