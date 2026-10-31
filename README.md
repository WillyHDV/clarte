# Clarté — Français Basique 1

PWA (site instalável) que roda no PC e no Android. Conteúdo baseado nos cours 1–4, na *phrase interrogative* e em *Contenus de la première évaluation*.

## Rodar no PC

```bash
cd app
npm start       # http://localhost:5173  (precisa de Python)
```

Ou dê dois cliques em `iniciar.bat`. Use o **Chrome** ou o Edge (reconhecimento de voz). Não há dependências para instalar.

## Domínio e prontidão

Cada item do conteúdo (letra, frase, forma verbal, profissão, pergunta, negação) tem uma **força** que sobe quando você acerta, cai quando erra e **decai com o tempo** (modelo simples de meia-vida). O **treino inteligente** escolhe os exercícios dos itens mais fracos ou ainda não vistos. A tela inicial mostra a **prontidão** de cada unidade e uma estimativa dos 6 critérios da prova oral.

## Trilha e plano diário

Cada unidade tem 5 degraus: **Aprender**, **Reconhecer**, **Escrever**, **Falar** e **Teste da unidade** (passa com 80%; Falar com 70%). Ao concluir o teste, a próxima unidade vira a atual (as seguintes ficam com 🔒, mas dá para abrir mesmo assim). A tela inicial traz o **Plano de hoje**, de 10 a 15 minutos, montado a partir dos itens fracos e da unidade atual.

## Professora Clara (IA gratuita)

Em **Ajustes** (ou na aba Clara), escolha um provedor com plano gratuito e cole a chave. Ela fica só no navegador do aparelho.

| Provedor | Onde criar a chave |
|---|---|
| Google Gemini (recomendado) | aistudio.google.com/apikey |
| Groq | console.groq.com/keys |
| Mistral | console.mistral.ai/api-keys |

Se der erro 429, é o limite gratuito: espere 1 minuto ou troque de modelo/provedor. Use "Carregar modelos" em Ajustes para ver os nomes de modelo válidos.
Modos: conversa, prova oral (simulação com nota nos 6 critérios) e dúvidas em português.

**Conversa por voz:** o botão 📞 abre uma ligação com a Clara. Ela fala, o microfone abre sozinho, você responde e o ciclo continua sem apertar nada. Quando você erra, ela diz a frase certa e pede para repetir; o app compara o que você disse com a frase-alvo e a Clara comenta a pronúncia. Você grava a resposta sem pressa e toca em **Enviar** quando terminar; o app transcreve o áudio inteiro (Gemini ou Groq) e a Clara responde. **Refazer** descarta a gravação. Se a transcrição falhar, dá para trocar para o reconhecimento de voz do navegador em Ajustes. As frases que você não repetiu bem vão para a aba Reforço.

Para levar a chave a outro aparelho sem digitar: Ajustes → "Usar em outro aparelho" gera um link de configuração (não compartilhe esse link).

## Usar no celular

O microfone e a instalação exigem **HTTPS**, então o app precisa estar hospedado (ex.: Netlify, GitHub Pages ou Cloudflare Pages — todos gratuitos para sites estáticos).
Publique a pasta `publicar/` (gerada a partir de `app/`), abra o endereço no Chrome do Android e use ⋮ → **Instalar app**.

## Seus dados e atualizações

- **Backup:** Ajustes → Seus dados → Exportar gera um arquivo `.json` com progresso, erros e conversas (a chave de IA só entra se você marcar). Importar restaura em outro aparelho ou depois de limpar os dados do site.
- **Atualização:** o app confere sozinho se há versão nova e mostra o aviso "Nova versão disponível". A versão fica em `js/version.js`: aumente-a (e o `CACHE` do `sw.js`) a cada publicação.
- **Diagnóstico:** Ajustes → Diagnóstico testa voz, microfone, transcrição, IA e armazenamento, e copia um relatório.
- **Folha de revisão:** página de resumo da Évaluation 1 para imprimir ou salvar em PDF (Ajustes ou início → Reta final).

## Segurança da chave de IA

A chave fica só no navegador de cada aparelho. Para limitar o estrago caso ela vaze, restrinja-a ao endereço do app no Google Cloud (APIs e serviços → Credenciais → sua chave → Restrições de aplicativo → Sites → `https://willyhdv.github.io/*`).

## Desenvolvimento

- **Branches:** `main` é o que está publicado (GitHub Pages) e só recebe versões testadas. O trabalho novo acontece em `dev`.
- **Verificação:** `npm install` uma vez e depois `npm run check` (ESLint + testes). O mesmo roda no GitHub a cada envio (`.github/workflows/ci.yml`). Só precisa de Node 20 ou mais novo; o app em si não tem etapa de build.
- **Testes** (`test/`): geradores e correção de exercícios, progresso e revisão espaçada, backup, migração e validação dos dados salvos, pacotes de conteúdo (validador próprio), reserva de modelos da IA, telas (o app inteiro roda no jsdom: início, unidades, treinos até o fim, Clara, ajustes, folha, diagnóstico) e checagens de publicação (versão × cache do service worker, arquivos offline, imports, chaves de API no código, material do curso fora do repositório).
- **Publicar uma versão:** aumente `VERSION` em `js/version.js` e o `CACHE` em `sw.js` (o teste confere se andam juntos), rode `npm run check`, faça merge em `main` e confira o app no ar.

## Estrutura

- `content/` — pacotes de conteúdo (aulas, vocabulário, verbos, profissões, frases); veja `content/README.md`
- `js/data.js` — entrega o pacote ativo com os nomes usados pelo app
- `js/exercises.js` — geradores de exercícios e correção
- `js/ui.js` — ícones, escape de HTML e avisos; `js/folha.js` e `js/diag.js` — folha de revisão e diagnóstico; `js/version.js` — versão
- `js/app.js` — telas; `js/store.js` — progresso e revisão; `js/speech.js` — voz
- `js/tutor.js` — professora de IA (prompts + chamadas aos provedores gratuitos)
