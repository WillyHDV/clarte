# Pacotes de conteúdo

Cada pacote é uma pasta com o conteúdo de um curso ou nível. Hoje existe um: `fb1/` (Français basique 1).

Um pacote é **só dados**: módulos JavaScript que exportam listas e objetos, sem lógica e sem nada que `JSON.stringify` perca. Foi escolhido JavaScript em vez de `.json` para o app carregar tudo de forma síncrona e sem depender de recursos novos do navegador; os testes garantem que o pacote continua sendo JSON puro, então a troca para `.json` é mecânica quando valer a pena.

## Arquivos de `fb1/`

| Arquivo | Conteúdo |
| --- | --- |
| `pack.js` | junta tudo e traz os metadados: `schema`, `id`, `title`, `version` |
| `evaluations.js` | avaliações do curso (`id`, `title`, `date`, `sheet`), em ordem de data; o app mostra a próxima, e as datas podem ser ajustadas em Ajustes |
| `units.js` | unidades, na ordem da trilha (`id`, `n`, `icon`, `title`, `sub`) |
| `lessons.js` | uma aula em HTML por unidade, com marcadores `{{…}}` |
| `alphabet.js` | letras, acentos e prenomes para soletrar |
| `phrases.js` | frases por tema, `{ fr, pt }` |
| `social.js` | perfis do vídeo, falas tu × vous, situações |
| `verbs.js` | pronomes e verbos (6 formas cada) |
| `people.js` | nacionalidades, idiomas, cidades, profissões |
| `questions.js` | frases afirmativas e palavras interrogativas |

`js/data.js` entrega o pacote ativo com os nomes que o app já usa (`UNITS`, `PHRASES`, `VERBS`…). Para trocar de pacote, é só mudar o import dele.

## Marcadores das aulas

`{{letters}}`, `{{accents}}`, `{{verbtables}}`, `{{tuvous}}`, `{{profiles}}`, `{{videotv}}`, `{{jobrows}}`, `{{phrases:<tema>}}` e `{{say:texto|rótulo}}`. Os testes recusam qualquer outro, porque marcador desconhecido some da tela sem aviso.

## Conferir um pacote

```bash
npm test
```

`validate.js` confere formato, campos obrigatórios, repetições, espaços sobrando, verbos com 6 formas, alfabeto completo, unidades × aulas, `tu`/`vous` válidos e mais. Os testes ainda provam que cada regra detecta o defeito que deveria.

## Acrescentar unidades ou um pacote novo

1. Copie `fb1/` para uma pasta nova (ex.: `fb2/`) e ajuste `pack.js` (`id`, `title`) e `evaluations.js` (as datas das provas do novo curso).
2. Acrescente os dados e as aulas. Cada `id` de unidade precisa de um gerador de exercícios em `js/exercises.js` (os testes avisam quando falta).
3. Liste os arquivos novos em `ASSETS` no `sw.js` (o teste de publicação avisa se faltar algum, para o app funcionar offline).
4. Aumente `version` do pacote e a versão do app (`js/version.js` + `CACHE` do `sw.js`).
