# Design do Clarté (visual v2)

O app é feito **só para o celular** (telas de cerca de 360 a 430 px de largura, toque, polegar). O visual novo está sendo construído em fases na linha `dev` e só vai ao ar quando estiver inteiro pronto.

## Princípios

1. **Ler sem esforço.** Todo texto tem contraste de pelo menos 4,5 para 1 sobre o fundo (claro e escuro) e nenhum fica abaixo de 13 px. Os testes (`test/design.test.js`) reprovam a versão se uma cor ou um tamanho novo quebrar isso.
2. **Rolar pouco.** Tela que cresce demais vira lista que abre uma subtela, sanfona (`<details class="acc">`) ou abas. Meta: o essencial de cada tela cabe em uma altura de celular.
3. **Polegar primeiro.** Ações principais ficam embaixo; áreas de toque com no mínimo 48 px (`--tap`); a barra de baixo é fixa e não cobre o conteúdo.
4. **Um só estilo de ícone.** Ícones de linha do conjunto Tabler (`js/icons.js`, `I('nome')`). Emoji só como identidade das unidades.
5. **Mesma identidade.** Terracota (`--brand`), azul-marinho (`--ink`) e creme (`--bg`), com modo escuro.

## Cores (em `:root` de `styles.css`)

| Papel | Claro | Observação |
| --- | --- | --- |
| `--bg` / `--card` | `#f6f2ee` / `#ffffff` | fundo e cartões |
| `--ink` / `--muted` | `#1d2433` / `#5a667d` | texto principal e secundário (5,2:1 sobre o creme) |
| `--brand` | `#c8442a` | **fundo** de botões e selos; texto branco por cima (4,9:1) |
| `--brand-text` | `#a8361f` | a marca como **texto** ou ícone sobre creme/branco (5,9:1); o `--brand` puro não passa (4,4:1) |
| `--on-brand`, `--on-bad` | branco | no escuro viram quase preto, porque o fundo clareia |
| `--good`, `--bad`, `--warn` (+ `-bg`) | verde, vermelho, âmbar | sempre em par com o fundo suave do mesmo nome |
| `--disabled-bg` / `--disabled-ink` | `#e4dfd8` / `#4f5a70` | botão desativado continua legível |

Regra: texto de marca usa `--brand-text`; fundo de marca usa `--brand` ou `--grad` com `--on-brand`.

## Tipografia e espaço

- Escala de texto: `--fs-xs` 13 px, `--fs-sm` 14, `--fs-md` 16, `--fs-lg` 18, `--fs-xl` 22, `--fs-2xl` 28.
- Espaços (múltiplos de 4): `--s1` 4 … `--s8` 32. Raios: `--r-sm` 14, `--r` 22, `--r-lg` 28.

## Peças

| Peça | Onde | Notas |
| --- | --- | --- |
| Barra de baixo (`js/nav.js`) | todas as telas, menos exercício e chamada | Trilha, **Clara no centro** (botão de ligar) e Praticar (com contador de itens para reforçar) |
| Cabeçalho (`.apphead`) | Trilha, Praticar | fixo e compacto; na Trilha leva a sequência de dias e o **avatar**, que abre o Perfil |
| Avatar (`avatarHtml`) | cabeçalho e Perfil | a inicial do nome ou um desenho de linha; as cores têm contraste conferido |
| Linha (`linha()`, `.grupo`) | Praticar, Perfil, Ajustes, central da Clara e lista de cenários | ícone, título, resumo atual e seta; abre uma tela ou subtela |
| Sanfona (`.acc`) | aulas e seções longas | usa `<details>`, sem JavaScript |
| Interruptor (`opcao()`, `.switch`) | Ajustes | linha inteira clicável; o interruptor tem 52×32 px |
| Cartão de estado (`estado()`, `.estado`) | topo de cada subtela de Ajustes | `ok`, `aviso`, `erro` ou `info`; texto simples sobre o estado, antes de qualquer botão |
| Cartão que abre (`.acc.evo`) | Evolução | rótulo, número principal e minigráfico (`sparkLine`, `sparkBars`) sempre à vista; o gráfico completo fica dentro |
| Cartão do Reforço (`.reforco`) | Praticar | anel com o contador e botão branco dentro |
| Cartão Continuar (`.continuar`) | Trilha | unidade e degrau certos, contagem da avaliação e o anel da meta de hoje (`.meta-ring`) |
| Caminho (`.caminho`, `.passo`) | Trilha | nós em zigue-zague (`ONDA`), anel de domínio, selo de check ou cadeado; cada unidade tem "UNIDADE N", título, barra fina de domínio (`.mini`) e etiqueta de estado (`.etq`); a linha é desenhada por `ligarNos` e o nó atual pulsa |
| Folha que sobe (`.scsheet`) | ficha da missão (Cenários) e escolha de avatar (Perfil) | alça, conteúdo e botões largos; tocar fora fecha |
| Abas (`.abas`) e botão fixo (`.cta-fixo`) | Unidade | abas Trilha, Aula e Frases; o botão fica acima da barra de baixo |

## Som dos exercícios

Quem decide é `politicaSom(ex)` em `js/exercises.js` (testada em `test/exercises.test.js` e no app em `test/lembrete-no-app.test.js`). `audioEntrega(ex)` diz se o áudio do exercício contém a resposta, por palavras inteiras.

| Tipo de exercício | Botão Ouvir antes | Ao tocar numa opção | Depois de Verificar |
| --- | --- | --- | --- |
| Ouça e escolha / ouça e escreva | sim (é o enunciado; toca sozinho ao abrir) | não | toca a frase e mostra Ouvir |
| Escolha com opções em francês (forma verbal, som mudo, vogal nasal, "Complete…", tu ou vous) | não | lê a opção tocada, certa ou errada | não toca e não mostra Ouvir |
| Escolha com enunciado em francês e opções em português | sim | não | toca a frase e mostra Ouvir |
| Escrever o que está oculto e montar a frase | não | n/a | toca a frase certa (acerto ou erro) e mostra Ouvir |
| Diga em voz alta | sim (modelo) | n/a | só o botão Ouvir |
| Associar pares | n/a | n/a | n/a |

A leitura das opções usa a voz do aparelho quando ela é francesa (`speak(texto, { rapido: true })`): instantânea e sem gastar o limite da voz online.

## Navegação

`Trilha` · `Clara` · `Praticar`. Evolução, Ajustes e Backup ficam no **Perfil** (avatar na Trilha). O exercício e a chamada escondem a barra.

Telas de lista seguem o mesmo padrão: cabeçalho fixo com **voltar** (`.apphead .back`), corpo em grupos de linhas e, no fim, o que é técnico numa sanfona "Avançado". Rotas: `#/settings/<ia|voz|estudo|avaliacoes|dados|sobre>` e `#/tutor` (central) com `#/tutor/<cenarios|exam|free|duvidas>`.

## Fases

1. **Base**: tokens, teste de contraste, ícones, componentes, nova barra, cabeçalho com avatar, Praticar e Perfil (feita).
2. **Trilha** (cartão "Continuar" e caminho em zigue-zague) e **Unidade** (abas Trilha, Aula e Frases; aula em cartões que abrem; botão fixo): feita. O plano do dia e a reta final foram para Praticar; a prontidão e os critérios, para Evolução.
3. **Exercícios** (feedback em painel que sobe, opções com ícone, fim do treino novo) e **chamada** alinhada ao novo visual (cores `--call-*` com contraste testado): feita.
4. Clara (central em lista, cenários e chat em telas próprias), Evolução em cartões que abrem e Ajustes em subtelas: feita.
5. Polimento (ficha e resumo da missão no sistema novo, animações leves que respeitam "menos movimento", vibração curta no app, CSS antigo removido, modo escuro conferido) e publicação de tudo junto: feita (v26).

Ícones: Tabler Icons, licença MIT, © Paweł Kuna.
