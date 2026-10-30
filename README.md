# Clarté — Français Basique 1

PWA (site instalável) que roda no PC e no Android. Conteúdo baseado nos cours 1–4, na *phrase interrogative* e em *Contenus de la première évaluation*.

## Rodar no PC

```bash
cd app
npm start       # http://localhost:5173  (precisa de Python)
```

Ou dê dois cliques em `iniciar.bat`. Use o **Chrome** ou o Edge (reconhecimento de voz). Não há dependências para instalar.

## Professora Clara (IA gratuita)

Em **Ajustes** (ou na aba Clara), escolha um provedor com plano gratuito e cole a chave. Ela fica só no navegador do aparelho.

| Provedor | Onde criar a chave |
|---|---|
| Google Gemini (recomendado) | aistudio.google.com/apikey |
| Groq | console.groq.com/keys |
| Mistral | console.mistral.ai/api-keys |

Se der erro 429, é o limite gratuito: espere 1 minuto ou troque de modelo/provedor. Use "Carregar modelos" em Ajustes para ver os nomes de modelo válidos.
Modos: conversa, prova oral (simulação com nota nos 6 critérios) e dúvidas em português.

**Conversa por voz:** o botão 📞 abre uma ligação com a Clara. Ela fala, o microfone abre sozinho, você responde e o ciclo continua sem apertar nada. Quando você erra, ela diz a frase certa e pede para repetir; o app compara o que você disse com a frase-alvo e a Clara comenta a pronúncia. O microfone é paciente: só envia depois de alguns segundos de silêncio (botão ⏱ ajusta; ✅ Terminei envia na hora), e as frases que você não repetiu bem vão para a aba Revisão.

Para levar a chave a outro aparelho sem digitar: Ajustes → "Usar em outro aparelho" gera um link de configuração (não compartilhe esse link).

## Usar no celular

O microfone e a instalação exigem **HTTPS**, então o app precisa estar hospedado (ex.: Netlify, GitHub Pages ou Cloudflare Pages — todos gratuitos para sites estáticos).
Publique a pasta `publicar/` (gerada a partir de `app/`), abra o endereço no Chrome do Android e use ⋮ → **Instalar app**.

## Estrutura

- `js/data.js` — conteúdo das aulas (vocabulário, verbos, profissões, frases)
- `js/exercises.js` — geradores de exercícios e correção
- `js/app.js` — telas; `js/store.js` — progresso e revisão; `js/speech.js` — voz
- `js/tutor.js` — professora de IA (prompts + chamadas aos provedores gratuitos)
