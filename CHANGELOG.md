# Histórico de versões

## v26 — 31/10/2026

**App novo (visual v2)**: reforma completa do visual, só para celular, feita em cinco fases e publicada de uma vez. Plano e regras em `DESIGN.md`. Para voltar ao visual anterior existe a etiqueta `v25`. Fase 1 (base):

- **Sistema visual**: cores com contraste conferido por teste (mínimo 4,5 para 1, claro e escuro), escala de texto sem nada abaixo de 13 px, espaços e raios em escala, botões e linhas com área de toque de 48 px ou mais. A marca usada como texto ganhou um tom mais escuro (`--brand-text`).
- **Ícones de linha** do conjunto Tabler no lugar do conjunto antigo, todos no mesmo estilo.
- **Barra de baixo nova**: Trilha, Clara (no centro, grande, botão de ligar) e Praticar (com o contador de itens para reforçar). Fixa, sem cobrir o conteúdo.
- **Perfil**: avatar no cabeçalho da Trilha (a inicial ou 8 desenhos), com nome, números do estudo e atalhos para Evolução, Ajustes e Backup.
- **Praticar**: o Reforço em destaque e os outros treinos numa lista curta.
- **Peças reutilizáveis**: linha de lista que abre algo, sanfona, interruptor e cartão do Reforço.
- **Testes**: 268 → 282 (contraste, tamanho de texto, ícones, avatares, barra, Praticar e Perfil).

Fase 2 (Trilha e Unidade) pronta:

- **Trilha**: o topo agora é o cartão "Continuar de onde parou" (a unidade e o degrau certos, a contagem da avaliação, a meta do dia e um botão grande). Abaixo, as 8 unidades num **caminho em zigue-zague**: concluídas em verde com selo de check, a atual maior e destacada, as próximas com cadeado e linha pontilhada, cada uma com o anel do seu domínio. A tela caiu de cerca de 3.000 px para cerca de 1.400 px.
- **O que mudou de lugar**: o plano do dia e a reta final (simular a prova oral, folha de revisão) foram para **Praticar**; a prontidão e os 6 critérios da prova, para **Evolução**, que agora se abre pelo Perfil.
- **Unidade**: três abas (Trilha, Aula e Frases), cabeçalho com o domínio e botão "Continuar" fixo embaixo (a página caiu de 3.470 px para cerca de 950 px). A **aula virou cartões que abrem**, um por título, com o primeiro aberto, e os botões de áudio usam ícone de linha. A aba **Frases** lista as frases da unidade, com tradução quando existe, para ouvir com um toque.
- **Degraus** da unidade e **tarefas do plano** com ícones de linha, sem emoji.
- **Testes**: 282 → 287.

Fase 3 (Exercícios e chamada) pronta:

- **Exercício**: topo com o X (volta à unidade ou a Praticar), a barra de progresso e a sequência de dias; pergunta grande; opções grandes (62 px); o botão **Verificar** fica fixo embaixo, legível mesmo desativado.
- **Painel de feedback que sobe**: ao responder, um painel colorido sobe de baixo (verde no acerto, âmbar no "quase", vermelho no erro, neutro ao pular) com ícone, a resposta certa, a explicação, "Ouvir" e o botão **Continuar** na cor do resultado. As opções ganham um ícone de certo ou errado (e texto para leitor de tela).
- **Fim do treino**: medalha com ícone, "6 de 8 corretas" com o percentual grande, resultado do degrau, pontos, ganho de domínio e botões grandes; o "voltar" leva à unidade ou a Praticar.
- **Sem emoji** nos botões de áudio, microfone, "Devagar" e no fim do treino.
- **Texto das perguntas**: acabou a pontuação dobrada ("??" e ".?") e a pergunta de fala não tem mais parênteses dentro de parênteses.
- **Chamada com a Clara**: as cores de texto sobre o fundo escuro viraram variáveis (`--call-*`) e entram no teste de contraste, junto com as cores do painel de feedback.
- **Nomes de classe que colidiam** foram separados (a linha de acentos e os cartões de números da Evolução), o que também corrige o visual das peças do exercício de montar frases.
- **Testes**: 287 → 292.

Fase 4 (Ajustes, Clara e Evolução) pronta:

- **Ajustes** viraram uma **lista que abre subtelas**: Professora Clara, Voz, Estudo, Avaliações, Seus dados e Sobre. Cada linha mostra o estado atual (por exemplo "Gemini · chave salva", "Meta de 20 exercícios por dia"). Cada subtela começa com um **cartão de estado em linguagem simples** ("A Clara está pronta", "Falta a voz francesa", "Você ainda não fez backup") e deixa o que é técnico numa sanfona **Avançado** (modelo da IA, voz natural online, microfone, incluir a chave no backup, zerar o progresso). Caixas de seleção viraram interruptores grandes.
- **Clara** agora abre numa **central em lista**: cartão "Ligar para a Clara" e linhas para Cenários ("2 de 8 missões cumpridas"), Prova oral ("Última nota 7,5 de 10"), Conversa por texto e Dúvidas em português. Cada uma abre em **tela própria, com botão de voltar**; as abas apertadas em cima do chat acabaram, e o chat ganhou altura. Ligação que começa na central e tem pelo menos duas falas termina no chat, onde fica o resumo; sair da tela no meio da ligação não puxa mais a navegação de volta.
- **Evolução** virou **cinco cartões que abrem** (Prontidão, Exercícios dos 7 dias, Notas da prova oral, Os 6 critérios, Acertos da semana), fechados no início: cada um mostra o número principal e um minigráfico, e o gráfico completo, a leitura ao tocar e a tabela ficam dentro. A tela cabe numa altura de celular.
- **Sem emoji** nas mensagens do chat (alto-falante, microfone, enviar, aviso) e nos Ajustes; os ícones dos cenários continuam como identidade.
- **Testes**: 292 → 299.

Fase 5 (polimento) pronta:

- **Ficha da missão** (a folha que sobe ao tocar num cenário) refeita: alça, ícone e subtítulo, objetivos com círculos, os três níveis de ajuda como opções grandes (58 px), botões largos e toque fora para fechar. **Resumo da missão** com medalha (troféu, estrela ou seta circular), objetivos com ícones de check e dois botões grandes ("Repetir a missão" e "Voltar aos cenários").
- **Animações leves**: a tela nova aparece com um esmaecer rápido, as sanfonas abrem suavemente e os botões da barra de baixo afundam ao toque. Tudo some para quem pede menos movimento no Android.
- **Vibração curta** ao acertar, errar e terminar um treino ou missão, com interruptor em Ajustes → Estudo (só aparece onde o aparelho vibra). **No app Android isso exige reinstalar o APK** (a casca ganhou a permissão VIBRATE); sem reinstalar, tudo funciona, só não vibra.
- **A casca Android** deixou de imprimir no log do Android os dados que passam pelos plugins (`loggingBehavior: none`), outro motivo para reinstalar o APK quando for conveniente.
- **Limpeza**: saíram 34 linhas de CSS do visual antigo (`.hero`, `.unit`, `.seg`, `.mast` e outras sem uso). Tudo o que o app usa passa pelo mesmo sistema de peças.
- **Testes**: 299 → 300.

## v25 — 31/10/2026

Cenários da Clara: missões de conversa por voz com objetivos.

- **Aba Cenários** (na tela da Clara): 8 missões — primeiro encontro (vous), cadastro na recepção (soletrar o nome), conhecendo um colega (tu), não entendi, entrevistar a Clara (est-ce que, où, comment, pourquoi), verdadeiro ou falso (ne … pas), despedida (tu e vous) e mini-prova oral.
- **A Clara interpreta o papel** (diretora, recepcionista, colega, guia, atendente, examinadora…) e conduz a conversa. Ela abre falando a primeira frase na hora, sem esperar a IA.
- **Objetivos marcados ao vivo**: uma barra de missão no topo da ligação mostra "2 de 5" e a lista, que se marca conforme você cumpre cada objetivo falando. A IA marca em linhas invisíveis (nunca faladas nem mostradas), e a avaliação final confere o que a marcação ao vivo perdeu.
- **Três níveis de ajuda**: com frases (as 2 próximas frases que você pode dizer, tocando para ouvir), com dicas (só o começo da frase) e modo prova (nada na tela e sem correção até o fim). O app sugere o próximo nível quando você vence um. A mini-prova é sempre modo prova.
- **Fim da missão**: ao cumprir todos os objetivos, ao esgotar os turnos ou no botão "Terminar e ver o resultado". Aparece o resultado (cumprida, parcial ou não cumprida), a lista de objetivos, o erro mais importante e uma frase para repetir, com "Repetir a missão".
- **Progresso**: tentativas, melhor resultado e maior nível vencido por cenário, e pontos (5 por objetivo, mais 20 se a missão for cumprida). Entra no backup.
- **Dados**: os cenários são conteúdo do curso (`content/fb1/scenarios.js`, validado nos testes); para a Évaluation 2 basta acrescentar cenários.
- **Testes**: 254 → 268, incluindo missões completas de ponta a ponta com a IA e o microfone simulados.

## v24 — 31/10/2026

Nova tela da ligação com a Clara, a primeira parte dos cenários (a tela agora tem espaço para a missão e as frases-guia).

- **Layout**: a esfera animada encolheu de 230 para uns 74 px e fica ao lado da fala da Clara, sem perder as cores nem a pulsação com a sua voz. Nada estoura mais a tela: a frase para repetir, a correção e o que você disse ficam à vista, com sobra de espaço.
- **Sem frases prontas**: saíram os três atalhos ("Répétez, s'il vous plaît", "Je ne comprends pas", "Je ne sais pas").
- **Histórico**: um botão no topo abre a conversa em bolhas (só a parte falada), para rever o que foi dito sem sair da ligação.
- **Tamanho do texto**: Ajustes → Voz → "Tamanho do texto na ligação" (pequeno, médio, grande). O padrão continua como era.
- **Telas pequenas**: abaixo de 640 px de altura a esfera, o botão do microfone e o texto diminuem.
- **Testes**: 252 → 254.

## v23 — 31/10/2026

Voz sem silêncio: o limite gratuito da voz natural do Gemini acabava e o app ficava mudo.

- **Causa**: o plano gratuito da voz do Gemini é pequeno (cerca de 10 pedidos por dia por modelo, e cada frase da Clara é um pedido). Ao acabar, o app caía na voz do WebView, que no Android não achava a voz francesa que o celular tem, e ficava sem som.
- **Voz do Android** (app): novo plugin de voz nativa. O app fala pelo mecanismo do aparelho (Samsung ou Google), sem limite de uso, sem internet e sem passar pelo WebView. Com a voz francesa do aparelho, a voz natural do Gemini deixa de ser usada sozinha. **Precisa reinstalar o app (▶ Run no Android Studio).**
- **Pausa inteligente do limite**: ao esgotar a cota, o app tenta os outros modelos (cada um tem a sua cota), pausa a voz natural até o limite voltar (meia-noite do horário do Pacífico, ou o tempo que o Google pedir) e usa a voz do aparelho, sem tentar e atrasar a cada frase. Um aviso por pausa, não por frase.
- **Ajustes → Voz**: mostra a voz do aparelho, a pausa e quando ela volta, e tem os botões "Instalar ou atualizar a voz francesa" (abre a tela do Android) e "Testar a voz do aparelho".
- **Diagnóstico**: novo botão "Testar a voz do aparelho", linhas "Vozes visíveis" e "Voz natural (Gemini)" com o limite.
- **Testes**: 237 → 252.

## v22 — 31/10/2026

Correção do "Falar" no app Android, a partir do diagnóstico da v21.

- **Falar no app**: o WebView do app expõe o reconhecimento de fala do Chrome, mas ele não é confiável ali. Dentro do app, os exercícios "Falar", o microfone do chat e a ligação com a Clara agora usam sempre a gravação + transcrição pelo Gemini (ou Groq). No Chrome e no site instalado nada muda.
- **Diagnóstico**: a linha "Falar (exercícios e Clara)" diz qual caminho está valendo.
- **Testes**: 235 → 237.

## v21 — 31/10/2026

Lembrete diário de estudo no app Android.

- **Lembrete diário** (Ajustes → Lembrete diário, só no app Android): uma notificação por dia na hora que você escolher (19:00 por padrão). Ficam agendados os próximos 7 dias; ao abrir e ao sair do app o plano é refeito, e **o aviso de hoje some se você já estudou** (exercícios ou fala com a Clara). O horário não precisa ser exato, então o Android não abre a tela de "Alarmes e lembretes". Há um botão para enviar um teste em 8 segundos.
- **Precisa atualizar o app no celular**: a notificação depende de um plugin novo na casca Android. Abra o projeto `native/android` no Android Studio e aperte ▶ Run de novo (o progresso é mantido). Enquanto isso, Ajustes explica isso em vez de mostrar controles que não funcionam.
- **Diagnóstico**: mostra se as notificações estão permitidas e quantos lembretes estão agendados.
- **Testes**: 216 → 235 (planejamento dos horários, permissão, reagendamento, telas).

## v20 — 31/10/2026

Backup automático no app Android: o progresso passa a ter uma cópia fora do app, que sobrevive à desinstalação.

- **Backup automático em Documentos/Clarte** (só no app Android): o app grava `clarte-backup.json` sozinho ao abrir, a cada 5 minutos quando algo mudou e ao sair do app. O arquivo não leva a chave de IA e guarda também a cópia do dia anterior (`clarte-backup-anterior.json`).
- **Proteções**: um app vazio nunca grava por cima de um backup; um backup com mais pontos nunca é trocado por um com menos (só o botão "Fazer agora" força, depois de perguntar); se o Android não deixar sobrescrever um arquivo de uma instalação anterior, o backup vai para um arquivo com data no nome.
- **Restaurar**: depois de reinstalar, a tela inicial oferece restaurar quando acha um backup com mais pontos do que o app tem ("Agora não" dispensa aquele backup). Em Ajustes → Seus dados há o botão de restaurar, o de "Fazer agora" e a chave para ligar e desligar.
- **Diagnóstico**: "Testar o app Android" também lista os arquivos de Documentos/Clarte e quais este app consegue ler (depois de reinstalar, o Android pode recusar a leitura; nesse caso use Importar e escolha o arquivo).
- **Testes**: 195 → 216 (backup, proteções, telas do app).

## v19 — 31/10/2026

Correção para o app Android, a partir do diagnóstico feito no celular (a ponte nativa e a gravação em Documentos/Clarte funcionaram).

- **Falar e conversar por voz no app Android**: a janela do app não tem o reconhecimento de fala do Chrome, e por isso a ligação com a Clara, o microfone do chat e os exercícios "Falar" ficavam escondidos (ou só dava para "Pular"). Agora, sem o reconhecimento do navegador, o app grava a sua fala e a IA transcreve (Gemini ou Groq, o mesmo caminho da ligação). No Chrome nada muda.
- **Plano do dia e degraus das unidades**: o treino de fala e o degrau "Falar" voltam a aparecer onde há como falar.
- **Diagnóstico**: dentro do app não pede mais para "instalar o app" e explica o armazenamento do Android; nova linha "Falar (exercícios e Clara)" diz por qual caminho a fala é entendida.
- **Testes**: gravação + transcrição (inclui microfone negado, silêncio, falha da IA e cancelamento) e as telas no cenário do app (184 → 195 testes).

## v18 — 31/10/2026

Primeiro passo para o app Android.

- **Casca Android** (pasta `native/`): um app que abre o Clarté publicado dentro de uma janela própria, instalado pelo Android Studio com o celular ligado ao PC. Ele atualiza junto com o site; o passo a passo está em `native/README.md`.
- **Diagnóstico**: mostra o modo de uso (site instalado ou app Android) e, dentro do app, o botão "Testar o app Android (arquivos)", que confere se a ponte nativa chegou ao site e em quais lugares dá para gravar backups (Documentos, pasta do app, dados internos).

## v17 — 31/10/2026

Proteção do progresso e uma correção visual, a partir do diagnóstico da v16 (que mostrou o armazenamento zerado depois de reinstalar o app).

- **Compartilhar backup** (Ajustes → Seus dados): abre a lista de apps do celular (Google Drive, WhatsApp, e-mail). A data do backup só é anotada se o envio não for cancelado; em aparelhos sem esse recurso, o arquivo é baixado.
- **Lembrete na tela inicial** quando nunca houve backup ou faz 7 dias ou mais (a partir de 60 pontos).
- **Aviso claro**: desinstalar o app ou limpar os dados do navegador apaga o progresso (em Ajustes e em Privacidade e créditos).
- **Correção**: três caixas de seleção de Ajustes (ler as respostas em voz alta, voz mais devagar, incluir a chave no backup) estavam com o texto invisível, branco sobre branco.

## v16 — 31/10/2026

Ajustes a partir do diagnóstico feito no celular com a v15.

- **Modelo de reserva**: o Diagnóstico agora mostra *por que* o modelo principal falhou (código HTTP e mensagem do Google). A reserva que funcionou passa a ser lembrada por 30 minutos e sobrevive a fechar o app (antes eram 10 minutos e se perdia ao fechar), então o app deixa de gastar alguns segundos testando um modelo que acabou de falhar.
- **Voz natural**: Diagnóstico → "Comparar vozes" mede 4 modelos de voz com a mesma frase e oferece usar o mais rápido; a escolha também fica em Ajustes → Voz → "Modelo da voz natural".
- **Transcrição**: dica dos nomes (Willy, Clara, Maceió) para errar menos o seu próprio nome.

## v15 — 31/10/2026

Atualização grande: a base inteira foi reorganizada e passou a ter testes automáticos.

**Novo**
- **Evolução** (tela inicial → "Ver evolução"): números da semana e três gráficos (prontidão, exercícios por dia, notas das simulações), com leitura ao tocar e tabela equivalente.
- **Associar pares**: novo exercício de duas colunas (frase ↔ tradução, pronome ↔ forma do verbo, masculino ↔ feminino, letra ↔ nome, palavra interrogativa ↔ tradução).
- **Avaliações como dados**: a contagem, a Reta final e o plano do dia seguem a próxima avaliação; as datas podem ser ajustadas em Ajustes. Depois da Évaluation 1 o app já passa para a Évaluation 2.
- **Lembretes no calendário** (.ics) das avaliações futuras, em Ajustes → Avaliações.
- **Privacidade e créditos** (Ajustes → Sobre) e **atalhos ao segurar o ícone** no Android (Clara, treino inteligente, reforço, simular a prova).

**Por dentro**
- `app.js` dividido em telas (`js/screens/`) e módulos de base; conteúdo do curso em pacote próprio (`content/fb1/`) com validador.
- 143 testes automáticos, ESLint e verificação no GitHub a cada envio.
- Dados no formato 3 (histórico diário). Ao abrir pela primeira vez, o app guarda uma **cópia do progresso antigo** (`fr_app_v1_antes_v2`) antes de migrar.

**Se algo der errado**: a versão anterior está na etiqueta `v14` do repositório.

## v14 — 31/10/2026
- A Clara conhece os seus pontos fracos e puxa um por vez na conversa (na prova oral ela fica neutra).
- Resumo ao fim da ligação: falas, frases repetidas e correções.

## v13 — 31/10/2026
- Reserva automática de modelos de IA quando o escolhido falha (erro 5xx, limite ou lentidão), no chat e na transcrição.
- Microfone mais sensível: fala baixa é amplificada antes de transcrever.
- Diagnóstico guiado, com contagem regressiva e erros com código HTTP.

## v12 — 31/10/2026
- Reta final para a Évaluation 1: backup e restauração, atualização confiável, Folha de revisão, diagnóstico do aparelho e acessibilidade.
