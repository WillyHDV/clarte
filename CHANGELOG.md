# Histórico de versões

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
