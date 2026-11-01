// Privacidade e créditos: o que fica no aparelho, o que sai dele (e para onde) e de onde vem o conteúdo.
// Cada afirmação aqui é conferida por teste (test/release.test.js): se o app passar a falar com outro endereço, o teste avisa.
import { esc, I } from '../ui.js';
import { $app } from '../core.js';
import { VERSION, BUILD_DATE } from '../version.js';
import { PACK } from '../data.js';

export function aboutPage() {
  $app.innerHTML = `
    <header class="top"><button class="back" data-go="#/settings/sobre" aria-label="Voltar">${I('back')}</button><h1>Privacidade e créditos</h1></header>
    <section class="card about"><h3>O que fica só no seu aparelho</h3>
      <ul>
        <li>Seu progresso, histórico, erros para revisão, conversas com a Clara e as configurações.</li>
        <li>A chave da IA. Ela só é enviada ao provedor que você escolheu, para ele aceitar os seus pedidos.</li>
        <li>Não há conta, cadastro, anúncios nem estatísticas de uso. O Clarté não tem servidor próprio.</li>
      </ul>
      <small><b>Desinstalar o app ou limpar os dados do navegador apaga o seu progresso</b>: guarde um backup (Ajustes → Seus dados → Compartilhar). Para levar o progresso a outro aparelho, use esse mesmo backup. Para apagar tudo, use “Zerar progresso” nos Ajustes e, se quiser, limpe os dados do site no navegador.</small>
    </section>
    <section class="card about"><h3>O que sai do aparelho (só quando você usa a Clara ou a voz natural)</h3>
      <ul>
        <li><b>Texto das conversas</b> vai ao provedor escolhido: Google Gemini, Groq ou Mistral.</li>
        <li><b>Áudio das suas falas</b> (quando você grava e toca em enviar) vai ao Gemini ou ao Groq para virar texto.</li>
        <li><b>Frases da voz natural</b> vão ao Gemini, que devolve o áudio. Depois ficam guardadas no aparelho.</li>
        <li>O reconhecimento de voz do próprio navegador (Chrome) pode enviar o áudio ao Google, conforme as regras do navegador.</li>
        <li>A hospedagem do app (GitHub Pages) registra acessos como qualquer site, mas não recebe nada do que você estuda ou fala.</li>
      </ul>
      <small>Nos planos gratuitos, os provedores de IA podem usar o conteúdo enviado para melhorar os modelos. Evite contar dados pessoais sensíveis nas conversas.</small>
    </section>
    <section class="card about"><h3>Proteja a sua chave</h3>
      <p>No Google Cloud, em Credenciais, restrinja a chave a este endereço (Restrições de aplicativo → Sites): <code>${esc(location.origin + location.pathname.replace(/[^/]*$/, ''))}*</code>. Assim, mesmo que alguém copie a chave, ela não funciona em outro site. Não envie o “link de configuração” a ninguém: ele leva a sua chave.</p>
    </section>
    <section class="card about"><h3>Conteúdo e créditos</h3>
      <ul>
        <li>As aulas e os exercícios são <b>resumos próprios</b> feitos a partir das aulas e dos materiais da professora, de “La phrase interrogative”, de “Contenus de la première évaluation” e de livros de apoio. Quando uma aula usa um livro de apoio, ela cita o livro e as páginas.</li>
        <li>O Clarté é um <b>projeto pessoal de estudo</b>, sem vínculo oficial com a escola, a professora ou as editoras. As notas e correções da Clara e do app são estimativas, não a avaliação oficial.</li>
        <li>Os ícones são do conjunto <b>Tabler Icons</b> (licença MIT, © Paweł Kuna), já incluídos no app: não há download na hora de usar.</li>
        <li>A voz e as respostas da Clara são geradas por IA e podem errar: confira com a sua professora quando tiver dúvida.</li>
      </ul>
      <small>Pacote de conteúdo: ${PACK.title} (v${PACK.version}) · app v${VERSION} · ${BUILD_DATE}</small>
    </section>`;
}
