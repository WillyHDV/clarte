# Histórico de versões

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
