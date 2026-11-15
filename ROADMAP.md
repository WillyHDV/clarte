# Linha de progressão do Clarté

Escrita em 15/11/2026, a partir de sete livros que o Willy anexou e do estado real do app (v31). Serve para decidir **o que fazer, em que ordem e por quê**. Os livros são só referência: nada deles foi copiado para o projeto (o repositório é público); o que está aqui é síntese com palavras próprias e a indicação do capítulo.

## 1. Onde o app está e o que os livros dizem

| O que os livros pedem | Como está no app hoje | Lacuna |
| --- | --- | --- |
| Pronúncia primeiro, com treino de ouvido (pares mínimos com resposta imediata) e ligação entre grafia e som | Leitura mostra letras mudas e ligações; exercícios de ouvir; unidade do alfabeto | Não há treino de ouvido com pares mínimos (u/ou, an/on/in, é/è, s/z…) nem regras de som ensinadas em sequência |
| Recuperar da memória, não reler; revisar **perto de esquecer**, não o que já esqueceu | Todo exercício é recuperação; força por item que decai com o tempo (modelo de meia-vida); erros voltam em 0, 1, 3, 7 e 14 dias | A prioridade vai ao item **mais fraco**, não ao que está **no ponto de esquecer**; intervalos param em 14 dias |
| Corrigir na hora, e transformar cada correção em cartão | Painel de feedback imediato nos exercícios; frases fracas da ligação vão ao Reforço | Correções da Clara no chat e palavras do dicionário não viram cartões |
| Conexão pessoal e imagens para a palavra grudar (elaboração) | Nenhuma | O app só apresenta; você não "constrói" o cartão |
| Misturar tipos de exercício (intercalar) e variar contextos | Treino inteligente mistura unidades; tipos sorteados | Dentro de uma unidade, a mistura é só aleatória |
| Calibrar: saber o que você realmente sabe | Prontidão por unidade e gráficos | A prontidão mistura reconhecer e produzir; não pergunta o quanto você acha que sabe |
| Escrever e falar (saída) com correção | Cenários e prova oral com a Clara; texto livre | Falta guardar o que errou e voltar a isso |
| Entrada rica (ler e ouvir o que importa para você) | Leitura de livro com dicionário e biblioteca | Falta ler em voz alta e levar frases e palavras para o Reforço |
| Funcionar bem com rede ruim; offline como estado normal | Cache do site pelo service worker; backup local | A política é "rede primeiro"; não há teste real offline no celular |
| Poucas idas à rede no celular (cada pedido custa latência e bateria) | O app consulta a versão nova a cada 15 minutos e ao voltar à tela | Dá para reduzir |
| Módulos profundos, pouca duplicação, funções curtas | Testes fortes (330), sem dependências; telas simples | `tutor.js` tem uma função de quase 500 linhas; adicionar um tipo de exercício exige mexer em vários arquivos; CSS em camadas históricas |
| Avaliar a IA com critérios e um conjunto fixo de exemplos | Respostas da IA são validadas no formato | Ninguém mede se as marcas de som e os verbetes estão **certos** |

## 2. Princípios que guiam as decisões

1. **Som antes de grafia** (Fluent Forever, cap. 3): quem aprende a ouvir os sons memoriza melhor as palavras. Vale como ordem de ensino.
2. **Recuperar, não reler** e **esperar até quase esquecer** (Fluent Forever cap. 2; Make It Stick cap. 2 e 8): todo conteúdo novo vira pergunta, e a revisão chega quando está difícil, mas possível.
3. **Dificuldade desejável** (Make It Stick cap. 4): treino que parece mais lento rende mais; não otimizar para a sensação de fluência.
4. **Intercalar e espaçar** (Make It Stick cap. 3 e 8): misturar tipos e voltar ao que ficou para trás.
5. **Elaborar**: ligar a palavra a uma frase sua, a uma cena, a algo que você viveu.
6. **Corrigir na hora e guardar a correção** (Fluent Forever cap. 2 e 5).
7. **Medir antes de otimizar** (Refactoring, cap. 2): perfil e números antes de mexer em desempenho; avaliação antes de mexer em prompt.
8. **Módulos profundos** (A Philosophy of Software Design): interface pequena, muita coisa escondida atrás. Cada mudança deixa o código um pouco melhor do que estava.
9. **Offline e rede ruim são estados normais** (Building Progressive Web Apps cap. 5; High Performance Browser Networking cap. 8).
10. **Avaliar a IA como qualquer outra parte do produto** (AI Engineering cap. 4): critérios claros, exemplos de referência, medida repetível.

## 3. A linha de progressão

As datas são estimativas; o que muda o ritmo é quando o Willy consegue testar no celular.

### Onda 0: até 02/12 (Évaluation 2): o que serve à prova

| # | Entrega | Por quê | Depende de |
| --- | --- | --- | --- |
| 0.1 | **Conteúdo da Évaluation 2**: unidades novas, frases, missões e simulação da prova oral | Hoje o app cobre só o conteúdo da avaliação 1 | Material do curso (programa, slides, vocabulário, critérios da prova oral) |
| 0.2 | **Revisão no ponto certo**: o Reforço passa a priorizar os itens com força entre 0,45 e 0,8 e deixa o que está muito fraco para o treino dirigido; intervalos de erro estendidos (30 e 60 dias) | Mais retenção por minuto; é pequeno e já está apoiado no modelo existente | nada |
| 0.3 | **Corrigir vira cartão**: botão "guardar" nas correções da Clara e nas palavras do dicionário, com o campo "uma frase sua com essa palavra" | Fecha o ciclo: errar, corrigir, voltar a ver | nada |
| 0.4 | **Teste real offline** no celular (modo avião) e consulta de versão menos frequente | Confirma o que o app faz sem rede e economiza bateria | seu celular |

### Onda 1: dezembro: sons e saída

| # | Entrega | Por quê |
| --- | --- | --- |
| 1.1 | **Sons do francês**: unidade de ouvido com pares mínimos (rue/roue, pain/peint, dessus/dessous, vent/vin, bon/beau…) com resposta imediata, e regras de som em ordem (letras finais mudas, nasais, ligação) | É o maior ganho de aprendizagem que os livros apontam e conversa direto com a Leitura |
| 1.2 | **Ler em voz alta** na Leitura: gravar a frase, marcar as palavras que escaparam, levar as difíceis ao Reforço | Treina a saída e a pronúncia com texto que você escolheu |
| 1.3 | **Minhas frases**: cartões feitos por você (da Leitura, do dicionário, das correções), com recuperação em forma de lacuna | Elaboração e conexão pessoal |
| 1.4 | Aviso "marcação errada" na Leitura e no dicionário (guarda o caso para a avaliação da IA) | Começa a coletar o conjunto de exemplos da onda 2 |

### Onda 2: janeiro e fevereiro: memória e qualidade

| # | Entrega | Por quê |
| --- | --- | --- |
| 2.1 | **Revisão v2**: orçamento diário (novas e revisões), intervalos de meses, agenda por retenção estimada | Aproxima o app de um sistema de repetição espaçada completo |
| 2.2 | **Calibragem**: antes de alguns exercícios, "você acha que sabe?"; no fim, o quanto acertou | Reduz a ilusão de saber |
| 2.3 | **Avaliação da IA**: conjunto fixo de frases com marcas certas (letras mudas, ligações) e um roteiro que roda com a sua chave e mostra a taxa de acerto; regras simples de som verificam as marcas da IA | Dá número ao que hoje é impressão |
| 2.4 | **Entrada graduada**: leituras em níveis e escuta de textos curtos com perguntas | Entrada que acompanha o seu nível |

### Onda 3: março em diante: estrutura

| # | Entrega | Por quê |
| --- | --- | --- |
| 3.1 | Separar a **chamada de voz** de `tutor.js` em um módulo próprio, com interface pequena | Função longa demais; mexer nela é arriscado |
| 3.2 | **Tipos de exercício registrados**: cada tipo declara como desenha, liga e corrige | Hoje um tipo novo exige mexer em vários lugares |
| 3.3 | **Livros e dicionário em armazenamento próprio** (chave separada ou IndexedDB) | O progresso inteiro é gravado de uma vez; livros crescem e podem pesar |
| 3.4 | **Cache primeiro** para os arquivos do app, com atualização na próxima abertura; empacotamento opcional | Abertura mais rápida e uso offline previsível |
| 3.5 | Consolidar o CSS por camadas (base, peças, telas) | O arquivo cresceu por acréscimo |

## 4. Como saber se está funcionando

- **Aprendizagem:** acerto no segundo contato com cada item (7 e 30 dias depois); itens "no ponto de esquecer" resolvidos por dia; nota das simulações da prova oral.
- **Hábito:** dias seguidos, minutos por dia, e quanto do tempo é recuperação (não leitura).
- **Técnica:** tempo até a Trilha aparecer no celular; peso do que é baixado a cada abertura; número de testes; zero erros no registro do app.
- **IA:** taxa de acerto das marcas de som no conjunto fixo (meta inicial: 90% das letras mudas e ligações certas); proporção de "marcação errada" avisada por você.

## 5. Decisões em aberto

1. **Material da Évaluation 2** (bloqueia a onda 0.1).
2. **Imagens nos cartões**: o método do livro usa fotos escolhidas por quem aprende. O app não tem como buscar imagens grátis sem custo; alternativa: uma frase sua e um ícone. A decidir com o Willy.
3. **Alfabeto fonético (IPA)**: o livro recomenda; o app mostra "como se lê" em português. Mostrar também o IPA em Ajustes avançados? Decidido adiar até a unidade de sons.
4. **Ordem das ondas 1 e 2** depende de como a Leitura e o Reforço forem usados nas próximas semanas.

## 6. O que foi lido

Foram lidos, em texto, trechos escolhidos; **não** os sete livros inteiros (cerca de 3.000 páginas).

| Livro | Lido | Não lido |
| --- | --- | --- |
| *Fluent Forever* (Wyner) | Introdução, cap. 2 (cinco princípios e repetição espaçada), cap. 3 (treino de ouvido, pares mínimos, grafia e som), resumos dos caps. 4 a 6 e a parte de saída e correção | Galerias de cartões e apêndices |
| *Make It Stick* (Brown, Roediger, McDaniel) | Prefácio e cap. 8 inteiro (estratégias práticas) | Os capítulos narrativos 1 a 7, só conhecidos pelo resumo do cap. 8 |
| *Building Progressive Web Apps* (Ater) | Cap. 1 e a parte de padrões de cache e offline-first (cap. 5) | Notificações, sincronização em segundo plano, instalação |
| *High Performance Browser Networking* (Grigorik) | Sumário e cap. 8 (redes móveis) | TCP, TLS, HTTP/2, WebRTC |
| *A Philosophy of Software Design* (Ousterhout) | Sumário, resumo dos princípios e dos sinais de alerta | Corpo dos capítulos |
| *Refactoring* (Fowler, 2ª ed.) | Cap. 2 e o começo do cap. 3 (sinais de código ruim) | Catálogo de refatorações |
| *AI Engineering* (Huyen) | Cap. 4 (como montar um pipeline de avaliação) e o começo do cap. 10 (feedback de usuários) | Treino de modelos, busca com documentos, agentes, ajuste fino |
