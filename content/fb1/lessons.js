// Aulas em português (HTML). {{say:texto|rótulo}} vira botão de áudio; veja os marcadores aceitos em renderLesson (js/app.js).

// {{say:texto|rótulo}} vira botão que fala o texto.
export const LESSONS = {
  alphabet: `
    <h3>As 26 letras</h3>
    <p>Toque em uma letra para ouvir o nome dela.</p>
    <div class="letters">{{letters}}</div>
    <h3>Cuidado com estas letras</h3>
    <ul>
      <li><b>G</b> = {{say:gé}} e <b>J</b> = {{say:ji}} (nada de "jê").</li>
      <li><b>E</b> = {{say:e}} (boca arredondada) e <b>I</b> = {{say:i}}.</li>
      <li><b>H</b> = {{say:ache}} (a letra H é muda dentro das palavras).</li>
      <li><b>R</b> = {{say:erre}}, <b>U</b> = {{say:u}} (lábios em "u", língua em "i"), <b>Q</b> = {{say:ku}}.</li>
      <li><b>W</b> = {{say:double vé}}, <b>Y</b> = {{say:i grec}}, <b>Z</b> = {{say:zède}}.</li>
    </ul>
    <h3>Os acentos</h3>
    <div class="chips">{{accents}}</div>
    <p>O acento faz parte da grafia: <i>Émilie</i> e <i>Jérémie</i> levam <b>é</b> (accent aigu).</p>
    <h3>Para soletrar</h3>
    <ul>
      <li>{{say:Comment ça s'écrit ?}} — Como se escreve?</li>
      <li>{{say:Épelez, s'il vous plaît.}} — Soletre, por favor.</li>
      <li>{{say:Ça s'écrit M, A, R, I, E.}}</li>
    </ul>
    <div class="extra"><h3>📚 Pronúncia: o que os livros reforçam</h3>
      <ul>
        <li><b>Só a letra E muda de som com o acento.</b> <i>e</i> sem acento é fraco (<i>je, parle</i>); <i>é</i> soa "ê" (<i>étudiant</i>); <i>è</i> e <i>ê</i> soam "é" (<i>très, fête</i>).</li>
        <li><b>A força cai na última sílaba:</b> <i>é-tu-di-ANT</i>, e não <i>É-tu-di-ant</i>.</li>
        <li><b>Letras finais quase sempre são mudas.</b> As que costumam soar são <b>R, L, C (ou K/Q) e F</b>: <i>bonjour, avec, chef</i>. Em <i>vous, français, salut, étudiant</i> a última letra não soa.</li>
        <li><b>Verbos em -er:</b> o <i>r</i> final não soa, e o fim fica "ê": <i>parler, habiter, étudier</i>.</li>
        <li><b>Vogais nasais:</b> <i>an / en</i> (<i>étudiant</i>), <i>on</i> (<i>bonjour</i>) e <i>in / un</i>. O "n" não é pronunciado como em português.</li>
        <li><b>Combinações:</b> <i>ou</i> = "u" (<i>vous</i>); <i>oi</i> = "uá"; <i>ai</i> = "é/ê" (<i>français</i>); <i>gn</i> = "nh"; <i>ill</i> = som de "i" curto (<i>travailler, famille</i>; exceção: <i>ville</i>).</li>
        <li><b>U e Q:</b> feche os lábios como para "u" e diga "i" ao mesmo tempo. O nome da letra Q é {{say:ku|"ky"}}.</li>
        <li><b>H mudo:</b> o <i>h</i> não tem som e age como vogal: <i>j'habite</i>, <i>l'hôtel</i>. <b>Ligação:</b> <i>les amis</i> soa "lezami".</li>
      </ul>
      <small class="src">Fontes: Pierini, <i>Apostila Avangardix</i>, p. 5–8; Rodrigues, <i>Francês Básico</i>, p. 11. O curso da professora manda; estes pontos servem para treinar o ouvido.</small></div>`,
  comm: `
    <h3>Quando você trava, use estas frases</h3>
    <ul class="phr">{{phrases:comm}}</ul>
    <p class="note"><b>Tu</b> ou <b>vous</b>? Com a professora e com pessoas que você não conhece, use <b>vous</b>. Com colegas e amigos, <b>tu</b>.</p>`,
  presenter: `
    <h3>Modelo de apresentação</h3>
    <div class="dialog">
      {{say:Bonjour ! Je m'appelle Marie. Je suis brésilienne. J'habite à Maceió. Je parle portugais et un peu français. Je travaille comme vendeuse. J'étudie le français.|▶ Ouvir o modelo completo}}
    </div>
    <ul class="phr">{{phrases:presenter}}</ul>
    <h3>Estrutura</h3>
    <ul>
      <li><b>Je m'appelle</b> + nome</li>
      <li><b>Je suis</b> + nacionalidade (sem artigo): <i>Je suis brésilien / brésilienne</i></li>
      <li><b>J'habite à</b> + cidade: <i>J'habite à Maceió</i> · bairro: <i>dans le quartier Hochelaga</i></li>
      <li><b>Je parle</b> + idioma: <i>Je parle portugais</i></li>
      <li><b>Je travaille comme</b> + profissão (ou <b>Je suis</b> + profissão): <i>Je suis vendeur</i></li>
    </ul>
    <div class="extra"><h3>🎬 No vídeo "Présentation" da professora</h3>
      <p>Seis pessoas se apresentam. Ouça cada uma e confira:</p>
      <table class="tbl"><tr><th>Quem</th><th>Nacionalidade</th><th>Fala</th></tr>{{profiles}}</table>
      <small class="src">Fonte: vídeo "Présentation" e exercícios das aulas 2 e 3 do curso (transcrição automática conferida).</small></div>
    <div class="extra"><h3>📚 Apresentar outra pessoa</h3>
      <p>Como na atividade de apresentar quem está ao seu lado, estas frases ajudam:</p>
      <ul class="phr">
        <li>{{say:Voilà Christine. Elle est infirmière.}}</li>
        <li>{{say:Je vous présente Pierre. Il est français.}}</li>
        <li>{{say:Bonjour madame, bonjour monsieur !}}</li>
      </ul>
      <small class="src">Fonte: Rodrigues, <i>Francês Básico</i>, p. 9–10 (texto de apresentação e "présenter quelqu'un").</small></div>`,
  saluer: `
    <h3>Cumprimentar</h3>
    <ul class="phr">{{phrases:saluer}}</ul>
    <h3>Se despedir</h3>
    <ul class="phr">{{phrases:congé}}</ul>
    <h3>Tu × vous</h3>
    <p><b>Tu</b> = informal (amigos, família, colegas, crianças). <b>Vous</b> = formal (desconhecidos, professor, cliente/garçom, chefe) — e também plural.</p>
    <p>Se tutoyer = tratar por "tu". Se vouvoyer = tratar por "vous". Na dúvida, comece com <b>vous</b> e espere: {{say:On se tutoie ?}}</p>
    <div class="extra"><h3>🎬 No vídeo "On se tutoie ?" da professora</h3>
      <p>Na cena, quem se conhece bem usa <b>tu</b>; com o colega que se respeita à distância e com a vizinha nova usa-se <b>vous</b>. Ouça as falas e veja o registro:</p>
      <ul class="phr">{{videotv}}</ul>
      <p class="pt">Para se despedir: <i>À bientôt ! Au revoir ! Bonne journée !</i> Para dar boas-vindas: <i>Bienvenue !</i></p>
      <small class="src">Fonte: vídeo "On se tutoie ?" e a aula 4 do curso (transcrição automática conferida).</small></div>
    <div class="extra"><h3>📚 As mesmas perguntas em tu e em vous</h3>
      <table class="tbl"><tr><th>Tu (informal)</th><th>Vous (formal)</th></tr>{{tuvous}}</table>
      <p class="pt"><b>ton / ta</b> (tu) → <b>votre</b> (vous). O <b>vous</b> de polidez vale para pessoas mais velhas, desconhecidas ou superiores; para mais de uma pessoa, <i>vous</i> também significa "vocês".</p>
      <small class="src">Fontes: Rodrigues, <i>Francês Básico</i>, p. 27 (quadro "Tutoyer et vouvoyer"); Pierini, <i>Apostila Avangardix</i>, p. 14.</small></div>`,
  verbes: `
    <h3>Présent — {{say:être}} e os verbos em -er</h3>
    {{verbtables}}
    <h3>Regras rápidas</h3>
    <ul>
      <li>Verbos em <b>-er</b>: terminações <b>-e, -es, -e, -ons, -ez, -ent</b>.</li>
      <li><b>je</b> vira <b>j'</b> antes de vogal ou h mudo: <i>j'habite, j'étudie, j'aime</i>.</li>
      <li><i>parle / parles / parlent</i> têm o <b>mesmo som</b>: o -s e o -ent não se pronunciam.</li>
      <li><b>Être</b> é irregular: decore (<i>suis, es, est, sommes, êtes, sont</i>).</li>
      <li><b>S'appeler</b> é pronominal: <i>je m'appelle, tu t'appelles, il s'appelle, nous nous appelons…</i></li>
    </ul>
    <div class="extra"><h3>📚 Por que "m'appelle" tem dois L e "nous appelons" só um?</h3>
      <p>As terminações <b>-e, -es, -ent</b> são fracas. Depois de outro "e" fraco, dobra-se a consoante para manter o som: <i>je m'appelle, ils s'appellent</i>. Em <b>nous / vous</b> a terminação (<i>-ons, -ez</i>) é forte e não precisa: <i>nous appelons, vous appelez</i>.</p>
      <ul>
        <li><b>on</b> é muito usado no lugar de <i>nous</i> ("a gente"): <i>On parle portugais.</i></li>
        <li>O primeiro grupo (verbos em <b>-er</b>) é regular: só o <i>aller</i> foge da regra.</li>
        <li><b>vous</b> = "o senhor / a senhora" (polidez) ou "vocês".</li>
      </ul>
      <small class="src">Fonte: Pierini, <i>Apostila Avangardix</i>, p. 14–16. Mudanças como <i>nous mangeons</i> ficam para depois da Évaluation 1.</small></div>`,
  metiers: `
    <h3>Nacionalidades</h3>
    <ul>
      <li>Regra geral: acrescente <b>-e</b> ao feminino: <i>français → française</i>, <i>allemand → allemande</i>.</li>
      <li><b>-ien → -ienne</b>: <i>brésilien → brésilienne</i>, <i>canadien → canadienne</i>.</li>
      <li><b>Invariáveis</b> (terminam em -e): <i>belge, suisse, russe, britannique</i>.</li>
      <li>Nacionalidades e idiomas ficam em <b>minúscula</b>: <i>Je suis brésilien. Je parle français.</i></li>
    </ul>
    <h3>Profissões</h3>
    <ul>
      <li><b>-eur → -euse</b>: <i>chanteur → chanteuse, vendeur → vendeuse, serveur → serveuse</i>.</li>
      <li><b>-teur → -trice</b>: <i>acteur → actrice, facteur → factrice</i>.</li>
      <li><b>-ier → -ière</b>, <b>-er → -ère</b>: <i>boulanger → boulangère, infirmier → infirmière, cuisinier → cuisinière</i>.</li>
      <li><b>-ien → -ienne</b>: <i>mécanicien → mécanicienne</i>.</li>
      <li>Iguais nos dois gêneros: <i>journaliste, dentiste, architecte, vétérinaire, secrétaire, médecin</i>.</li>
      <li>Sem artigo: <i>Il est boulanger.</i> · Com artigo: <i>C'est un boulanger.</i></li>
    </ul>
    <h3>Perguntas úteis</h3>
    <ul class="phr">
      <li>{{say:Tu fais quoi comme métier ?}}</li><li>{{say:Qu'est-ce que tu fais comme métier ?}}</li>
      <li>{{say:Tu fais quoi dans la vie ?}}</li><li>{{say:Quelle est ta nationalité ?}}</li><li>{{say:Tu parles quelles langues ?}}</li>
    </ul>
    <h3>Lista de profissões</h3>
    <table class="tbl"><tr><th>Masculin</th><th>Féminin</th><th>PT</th></tr>{{jobrows}}</table>
    <div class="extra"><h3>📚 O que os livros acrescentam</h3>
      <ul>
        <li>Em francês, o gênero nem sempre é fácil de ver como no português (-o / -a). A regra mais comum: <b>masculino + e</b> (<i>avocat → avocate, étudiant → étudiante</i>). Nomes de profissões funcionam como adjetivos.</li>
        <li>Outros casos: <b>-eur → -euse</b> (<i>chanteur → chanteuse</i>), <b>-teur → -trice</b> (<i>producteur → productrice</i>), <b>-ier → -ière</b> (<i>infirmier → infirmière</i>), <b>-ien → -ienne</b> (<i>informaticien → informaticienne</i>), <b>-if → -ive</b> (<i>sportif → sportive</i>).</li>
        <li>Não mudam: <i>journaliste, russe</i>. O "e" final do feminino é mudo, então o <b>artigo</b> (<i>un / une</i>) mostra o gênero na fala.</li>
      </ul>
      <small class="src">Fonte: Pierini, <i>Apostila Avangardix</i>, p. 8–9.</small></div>`,
  questions: `
    <h3>3 maneiras de perguntar (sim/não)</h3>
    <ol>
      <li><b>Entonação</b> — natural, falada: {{say:Vous aimez le français ?}}</li>
      <li><b>Est-ce que</b> — natural, um pouco mais educada: {{say:Est-ce que vous aimez le français ?}}</li>
      <li><b>Inversão</b> — muito formal, mais escrita: {{say:Aimez-vous le français ?}} (inverte sujeito e verbo + hífen)</li>
    </ol>
    <p class="note"><b>Elisão:</b> antes de vogal, <i>est-ce que</i> → <i>est-ce <b>qu'</b></i>: {{say:Est-ce qu'elle habite à Maceió ?}} · {{say:Est-ce qu'il parle français ?}}</p>
    <h3>Palavras interrogativas</h3>
    <ul>
      <li><b>Où</b> (onde): {{say:Où habitez-vous ?}}</li>
      <li><b>Qui</b> (quem): {{say:Qui est Céline Dion ?}}</li>
      <li><b>Comment</b> (como): {{say:Comment tu t'appelles ?}}</li>
      <li><b>Pourquoi</b> (por que): {{say:Pourquoi vous étudiez le français ?}}</li>
    </ul>
    <p>Elas ficam no <b>início</b>, mas na fala é natural colocar no <b>fim</b>:</p>
    <table class="tbl"><tr><th>Est-ce que</th><th>Inversão</th><th>No fim (oral)</th></tr>
      <tr><td>Où est-ce que vous habitez ?</td><td>Où habitez-vous ?</td><td>Vous habitez où ?</td></tr>
      <tr><td>Où est-ce que tu habites ?</td><td>Où habites-tu ?</td><td>Tu habites où ?</td></tr></table>
    <div class="extra"><h3>📚 Para falar melhor</h3>
      <ul>
        <li><b>Entonação:</b> na pergunta a voz <b>sobe</b> no fim; na resposta, <b>desce</b>: <i>Il est professeur ?</i> ↗ — <i>Oui, il est professeur.</i> ↘</li>
        <li><b>Est-ce que</b> marca a pergunta sozinho e ajuda ao telefone, quando a entonação fica menos clara.</li>
        <li><b>Inversão:</b> aparece sobretudo com <i>vous</i> (<i>Êtes-vous du Brésil ?</i>) e sempre com hífen.</li>
        <li><b>Responder:</b> <b>oui</b> / <b>non</b>. Se a pergunta já é negativa (<i>Vous n'êtes pas médecin ?</i>), a resposta "sim" é <b>si</b>.</li>
        <li><b>Pourquoi?</b> costuma ser respondido com <b>parce que…</b> (<i>Parce que j'aime le français.</i>).</li>
      </ul>
      <small class="src">Fonte (entonação, est-ce que, inversão, oui / si): Ferreira, <i>Aprenda Francês sem Complicação</i>, p. 96–100. A dica do <i>parce que</i> é gramática geral. O "t" eufônico (<i>aime-t-elle</i>) e as perguntas com nome próprio ficam para depois da Évaluation 1.</small></div>`,
  negation: `
    <h3>ne + verbo + pas</h3>
    <ul>
      <li>{{say:Je suis vendeuse.}} → {{say:Je ne suis pas vendeuse.}}</li>
      <li>{{say:Elle parle chinois.}} → {{say:Elle ne parle pas chinois.}}</li>
      <li>{{say:Tu es britannique.}} → {{say:Tu n'es pas britannique.}}</li>
      <li>{{say:Il habite à Bruxelles.}} → {{say:Il n'habite pas à Bruxelles.}}</li>
    </ul>
    <p class="note"><b>Elisão:</b> antes de vogal ou h mudo, <b>ne</b> vira <b>n'</b>: <i>Taynah <b>n'</b>habite pas…</i>, <i>Rariane <b>n'</b>étudie pas…</i></p>
    <p>Com verbo pronominal: <i>La professeure <b>ne</b> s'appelle <b>pas</b> Léonie.</i> (o <i>ne</i> vem antes do pronome).</p>
    <div class="extra"><h3>📚 O que os livros acrescentam</h3>
      <ul>
        <li>A negação envolve sempre o <b>verbo conjugado</b>: <i>Elle ne sait pas parler l'anglais.</i></li>
        <li>Para concordar numa conversa: <b>moi aussi</b> (eu também) depois de uma frase afirmativa; <b>moi non plus</b> (nem eu) depois de uma negativa: <i>Je ne parle pas allemand, moi non plus.</i></li>
        <li>A resposta curta é <b>non</b>: <i>Tu viens ? — Non !</i></li>
      </ul>
      <p class="pt">Depois da prova: <i>ne … jamais, ne … rien, ne … personne</i> e <i>ne … pas de</i> (<i>Je n'ai pas de café</i>).</p>
      <small class="src">Fontes: Ferreira, <i>Aprenda Francês sem Complicação</i>, p. 82–86; Pierini, <i>Apostila Avangardix</i>, p. 27–28.</small></div>`,
};
