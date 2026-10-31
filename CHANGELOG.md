# Histórico de versões

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
