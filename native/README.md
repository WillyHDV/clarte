# Clarté para Android (casca nativa)

Um app Android que abre o Clarté publicado (`https://willyhdv.github.io/clarte/`) dentro de uma janela própria. O código do app continua sendo o do site: **o que eu publico no site aparece no app sozinho**, sem instalar nada de novo. A casca (pasta `native/`) só acrescenta o que o navegador não dá: arquivos que sobrevivem à desinstalação, lembretes e, mais adiante, voz nativa.

É feita com [Capacitor](https://capacitorjs.com). A pasta `android/` é um projeto normal do Android Studio.

## Instalar no seu celular (primeira vez)

1. **Ative a Depuração USB** no celular: Configurações → Sobre o telefone → toque 7 vezes em "Número da versão" → volte, abra "Opções do desenvolvedor" → ligue "Depuração USB".
2. Ligue o celular ao PC com o cabo e **aceite o aviso** "Permitir depuração USB?" que aparece no celular.
3. Abra o **Android Studio** (`E:\AndroidStudio\bin\studio64.exe`) → *Open* → escolha a pasta `native\android` deste projeto. Espere o "Gradle sync" terminar (a primeira vez baixa coisas e demora alguns minutos).
4. No alto da janela, escolha o seu celular na lista de aparelhos e aperte **▶ Run**. O app "Clarté" é instalado e abre.
5. Na primeira ligação com a Clara, o Android pede **permissão do microfone**: permita.

## Levar o seu progresso do site para o app

O app tem armazenamento próprio, então começa vazio. Uma vez só:

1. No **site instalado**: Ajustes → Seus dados → **Compartilhar backup** (mande para o Google Drive, e-mail ou WhatsApp) ou **Baixar**.
2. No **app**: Ajustes → Seus dados → **Importar** e escolha o arquivo.
3. A chave da IA: marque "Incluir minha chave de IA no arquivo" ao fazer o backup, ou use o "link de configuração" em Ajustes → Usar em outro aparelho.

## Atualizar

- **Mudanças no Clarté** (exercícios, telas, correções): nada a fazer. O app abre o site publicado e atualiza junto com ele.
- **Mudanças na casca** (esta pasta): rode `npm run sync` dentro de `native/` e aperte ▶ Run de novo. O progresso é mantido, porque o app é reinstalado por cima.

## Conferir se os recursos nativos funcionam

No app: Ajustes → Diagnóstico → **Testar o app Android (arquivos)**. O relatório mostra se a ponte nativa chegou ao site e em quais lugares o app consegue gravar (Documentos, pasta do app, dados internos). Cole o relatório para mim.

## Cuidados importantes

- **A chave de assinatura** fica em `C:\Users\willy\.android\debug.keystore` (há uma cópia em `E:\Pessoal - Claude\Francês\ferramentas\chaves\`). Se o app for instalado com **outra** chave, o Android recusa a atualização (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`) e só deixa instalar depois de **desinstalar, o que apaga o progresso**. Por isso: faça backup antes de qualquer reinstalação e nunca apague essa chave.
- **Desinstalar o app apaga o progresso dele.** O backup em Documentos (quando existir) e o "Compartilhar backup" são a proteção.
- O primeiro uso precisa de **internet** (o app abre o site). Depois, o site guarda os arquivos e abre mesmo sem rede.
- Dentro do app **não existe o reconhecimento de fala do Chrome**. A ligação com a Clara usa gravação e transcrição pelo Gemini e funciona; os exercícios "Falar" serão adaptados para o mesmo caminho.
- A chave do Gemini restrita ao site (`https://willyhdv.github.io/*`) continua valendo, porque o app abre o site publicado.

## Por linha de comando (opcional)

```bash
cd native
npm install
npm run sync          # copia a configuração para o projeto Android
npm run apk           # gera native/android/app/build/outputs/apk/debug/app-debug.apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

É preciso o JDK 21 (`JAVA_HOME`) e o Android SDK (`ANDROID_HOME`). Se `adb devices` não listar o celular, confira o cabo e a depuração USB.

## O que vem depois

1. Backup automático em `Documentos/Clarte/` (depende do resultado do teste acima).
2. Lembretes diários de estudo.
3. Manter a tela ligada durante a ligação com a Clara.
4. Exercícios "Falar" pela gravação do microfone.
5. Voz e reconhecimento nativos do Android; depois, aos poucos, mais telas nativas.
