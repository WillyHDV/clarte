// Leitura: biblioteca de livros, páginas de cada livro (foto → a Clara lê) e a leitura frase a frase, com dicionário ao tocar numa palavra.
import * as S from '../store.js';
import * as T from '../tutor.js';
import { esc, I, toast, linha, estado } from '../ui.js';
import { $app, st, rate, rateDevagar, speak, setCleanup, go, abrirFolha } from '../core.js';
import { prepararImagem, validarPagina, lerJson, palavrasMarcadas, textoDaPalavra, acharPalavra } from '../leitura.js';
import { validarVerbete, chaveVerbete, verbeteSalvo, guardarVerbete } from '../dicionario.js';

export function leituraPage(arg, arg2) {
  if (arg === 'livro') return livroTela(arg2);
  return arg ? paginaDeLeitura(arg) : biblioteca();
}

const apertar = (t) => t.replace(/^[«“"(]+|[.,;:!?»”")…]+$/g, '');
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const temChave = () => !!((st().settings.keys || {}).gemini);
const avisoSemChave = () => (temChave() ? '' : `${estado('aviso', 'key', 'Falta a chave do Gemini', 'A leitura por foto e o dicionário usam o Gemini, que é grátis. Coloque a chave em Ajustes, na Professora Clara.')}<button class="btn wide" data-go="#/settings/ia">Abrir Ajustes</button><div class="spc"></div>`);

// ---------- biblioteca ----------
function biblioteca() {
  const livros = S.bookLivros();
  $app.innerHTML = `
    <header class="apphead"><button class="back" data-go="#/tutor" aria-label="Voltar">${I('chevron-left')}</button><div class="hello"><b>Biblioteca</b><small>Seus livros de leitura</small></div><button class="icon" id="lnovolivro" aria-label="Novo livro">${I('plus')}</button></header>
    ${livros.length ? `<div class="grupo">${livros.map((l) => linha({ icone: 'book', titulo: l.titulo, resumo: plural(S.bookPages(l.id).length, 'página', 'páginas'), go: `#/leitura/livro/${l.id}` })).join('')}</div>`
      : '<div class="card center"><p>Sua biblioteca está vazia. Crie o primeiro livro, por exemplo O Pequeno Príncipe, e depois fotografe as páginas.</p><button class="btn primary" id="lcriarprimeiro">Criar um livro</button></div>'}`;
  const novo = () => {
    const { box, fechar } = abrirFolha(`<h3>Novo livro</h3><label>Título<input id="ltitulo" class="inp" maxlength="80" placeholder="O Pequeno Príncipe" autocomplete="off"></label><div id="lerro" role="status"></div>
      <div class="sc-acoes"><button class="btn primary" id="lcriar">Criar livro</button><button class="btn" id="lagoranao">Agora não</button></div>`);
    const campo = box.querySelector('#ltitulo');
    const criar = () => {
      const titulo = campo.value.trim();
      if (!titulo) { box.querySelector('#lerro').innerHTML = '<small style="color:var(--bad)">Dê um nome ao livro.</small>'; return; }
      go(`#/leitura/livro/${S.addLivro(titulo)}`);
    };
    box.querySelector('#lcriar').onclick = criar; box.querySelector('#lagoranao').onclick = fechar;
    campo.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); criar(); } };
  };
  document.getElementById('lnovolivro').onclick = novo;
  const primeiro = document.getElementById('lcriarprimeiro'); if (primeiro) primeiro.onclick = novo;
}

// ---------- um livro: páginas e envio da foto ----------
function livroTela(id) {
  const livro = S.bookLivros().find((l) => l.id === id);
  if (!livro) { go('#/leitura'); return; }
  const paginas = S.bookPages(id).slice().sort((a, b) => a.numero - b.numero); const chave = temChave();
  $app.innerHTML = `
    <header class="apphead"><button class="back" data-go="#/leitura" aria-label="Voltar para a biblioteca">${I('chevron-left')}</button><div class="hello"><b>${esc(livro.titulo)}</b><small>${plural(paginas.length, 'página', 'páginas')}</small></div><button class="icon" id="lrenomear" aria-label="Renomear o livro">${I('pencil')}</button><button class="icon" id="lapagarlivro" aria-label="Apagar o livro">${I('trash')}</button></header>
    ${avisoSemChave()}
    <section class="card"><h3>Adicionar uma página</h3>
      <p class="pt">Foto reta, com boa luz e sem cortar as bordas. Pode ser só o francês ou o par francês e português: a Clara separa e alinha as frases. A foto não fica guardada, só o texto.</p>
      <label>Número da página<input id="lnum" class="inp" type="number" min="1" inputmode="numeric" value="${S.proximoNumero(id)}"></label>
      <div class="row"><button class="btn primary" id="lcam" ${chave ? '' : 'disabled'}>${I('camera')} Tirar foto</button><button class="btn" id="ladd" ${chave ? '' : 'disabled'}>${I('upload')} Da galeria</button></div>
      <input type="file" id="lcamera" accept="image/*" capture="environment" hidden>
      <input type="file" id="lfile" accept="image/*" hidden>
      <div id="lstatus" role="status" aria-live="polite"></div>
    </section>
    ${paginas.length ? `<div class="grupo">${paginas.map((p) => linha({ icone: 'book', titulo: `Página ${p.numero}`, resumo: `${plural(p.frases.length, 'frase', 'frases')} · ${new Date(p.criada).toLocaleDateString('pt-BR')}`, go: `#/leitura/${p.id}` })).join('')}</div>` : '<p class="pt">Nenhuma página lida ainda.</p>'}`;

  document.getElementById('lrenomear').onclick = () => {
    const { box, fechar } = abrirFolha(`<h3>Renomear o livro</h3><label>Título<input id="ltitulo" class="inp" maxlength="80" value="${esc(livro.titulo)}" autocomplete="off"></label><div id="lerro" role="status"></div>
      <div class="sc-acoes"><button class="btn primary" id="lsalvar">Salvar</button><button class="btn" id="lcancelarnome">Cancelar</button></div>`);
    box.querySelector('#lcancelarnome').onclick = fechar;
    box.querySelector('#lsalvar').onclick = () => { if (!S.renameLivro(id, box.querySelector('#ltitulo').value)) { box.querySelector('#lerro').innerHTML = '<small style="color:var(--bad)">Dê um nome ao livro.</small>'; return; } fechar(); livroTela(id); };
  };
  document.getElementById('lapagarlivro').onclick = () => {
    if (confirm(`Apagar o livro "${livro.titulo}" e ${plural(paginas.length, 'página', 'páginas')} dele? O texto some do app.`)) { S.deleteLivro(id); go('#/leitura'); }
  };

  let atual = null; // { ctl, imagem } da leitura em andamento
  const status = document.getElementById('lstatus'); const add = document.getElementById('ladd'); const cam = document.getElementById('lcam');
  const arquivo = document.getElementById('lfile'); const camera = document.getElementById('lcamera'); const campoNum = document.getElementById('lnum');
  const travar = (sim) => { add.disabled = sim; cam.disabled = sim; };
  const vivo = () => document.body.contains(status); // saiu da tela no meio: não mexe mais nela
  const pinta = (html) => { if (vivo()) status.innerHTML = html; };
  setCleanup(() => { if (atual && atual.ctl) atual.ctl.abort(); });

  async function processar(imagem, numero) {
    const ctl = new AbortController(); atual = { ctl, imagem }; travar(true);
    pinta(`${estado('info', 'sparkles', 'A Clara está lendo a página…', 'Leva de 10 a 30 segundos.')}<button class="btn wide" id="lcancelar">Cancelar</button>`);
    status.querySelector('#lcancelar').onclick = () => ctl.abort();
    try {
      const texto = await T.lerPagina({ apiKey: st().settings.keys.gemini, model: (st().settings.models || {}).gemini, image: imagem, signal: ctl.signal });
      const { frases } = validarPagina(lerJson(texto));
      if (!vivo()) return; // você saiu da tela: a página não é guardada
      const pagina = S.addBookPage(frases, { livro: id, numero }); toast(`Página ${numero} lida: ${plural(frases.length, 'frase', 'frases')}.`); go(`#/leitura/${pagina}`);
    } catch (e) {
      if (!vivo()) return; travar(false);
      if (e && e.name === 'AbortError') { pinta(estado('info', 'x', 'Leitura cancelada')); return; }
      pinta(`${estado('erro', 'alert-circle', 'Não consegui ler a página', esc(T.friendlyError(e)))}<button class="btn primary wide" id="ltentar">Tentar de novo</button>`);
      status.querySelector('#ltentar').onclick = () => processar(imagem, numero);
    }
  }
  add.onclick = () => arquivo.click(); cam.onclick = () => camera.click(); // câmera: no app Android abre a câmera do aparelho e a foto volta direto para cá
  const receber = (entrada) => async () => {
    const f = entrada.files && entrada.files[0]; entrada.value = ''; if (!f) return;
    const numero = parseInt(campoNum.value, 10);
    if (!(numero > 0)) { pinta(estado('aviso', 'alert-circle', 'Informe o número da página', 'Escreva o número que está na página do livro e escolha a foto de novo.')); return; }
    travar(true); pinta(estado('info', 'camera', 'Preparando a foto…'));
    try { await processar(await prepararImagem(f), numero); } catch (e) { travar(false); pinta(estado('erro', 'alert-circle', 'Não consegui usar essa foto', esc(e.message || 'Tente outra foto.'))); }
  };
  arquivo.onchange = receber(arquivo); camera.onchange = receber(camera);
}

// ---------- verbete do dicionário (HTML da folha) ----------
function verbeteHtml({ texto, achada, v, aviso, jaTem }) {
  const lema = v && v.lema && v.lema.toLowerCase() !== texto.toLowerCase() ? `<small>forma de <b>${esc(v.lema)}</b></small>` : '';
  const meta = v ? [v.classe, v.nivel].filter(Boolean).join(' · ') : '';
  const secao = (titulo, corpo) => `<section class="dic-sec"><h4>${titulo}</h4>${corpo}</section>`;
  const exemplos = (lista) => `<ul class="dic-lista">${lista.map((e) => `<li class="dic-ex"><div><b>${esc(e.fr)}</b>${e.pt ? `<small>${esc(e.pt)}</small>` : ''}</div><button class="say sm" data-dex="${esc(e.fr)}" aria-label="Ouvir o exemplo">${I('volume')}</button></li>`).join('')}</ul>`;
  const rapido = !v && achada ? secao('Nesta página', `<p class="dic-p"><b>${esc(achada.pt)}</b>${achada.uso ? `<small>${esc(achada.uso)}</small>` : ''}</p>`) : '';
  const corpo = v ? [
    v.contexto ? secao('Nesta frase', `<p class="dic-p">${esc(v.contexto)}</p>`) : '',
    v.significados.length ? secao('Significados', `<ul class="dic-lista">${v.significados.map((s) => `<li class="dic-p"><b>${esc(s.pt)}</b>${s.nota ? `<small>${esc(s.nota)}</small>` : ''}</li>`).join('')}</ul>`) : '',
    v.forma ? secao('Forma', `<p class="dic-p">${esc(v.forma)}</p>`) : '',
    v.exemplos.length ? secao('Em outros contextos', exemplos(v.exemplos)) : '',
    v.expressoes.length ? secao('Expressões', exemplos(v.expressoes)) : '',
    v.notas ? secao('Dicas de uso', `<p class="dic-p">${esc(v.notas)}</p>`) : '',
    secao('Minhas cartas', jaTem ? `<p class="dic-p">${I('circle-check')} Esta palavra já está nas suas cartas.</p>`
      : `<label>Uma frase sua com «${esc(texto)}»<input id="dic-frase" class="inp" maxlength="160" autocomplete="off" placeholder="Uma frase da sua vida (opcional)"></label><small>Sem frase sua, a carta usa a frase do livro. No treino a palavra some da frase e você escreve.</small><button class="btn primary wide" id="dic-guardar">${I('bulb')} Guardar nas minhas cartas</button>`),
  ].join('') : '';
  return `<div class="dic-topo"><div><h3>${esc(texto)}</h3>${lema}${meta ? `<small>${esc(meta)}</small>` : ''}</div><button class="say circ" id="dic-ouvir" aria-label="Ouvir a palavra">${I('volume')}</button></div>
    ${v && v.leitura ? `<div class="como"><small>Como se lê</small><span>${esc(v.leitura)}</span></div>` : ''}
    ${rapido}${aviso || ''}${corpo}
    <div class="sc-acoes"><button class="btn" id="dic-fechar">Fechar</button></div>`;
}

// ---------- leitura de uma página ----------
let limparPagina = null; // desfaz o que a página aberta deixou (teclas, temporizadores, consulta em andamento)
function paginaDeLeitura(id) {
  if (limparPagina) { limparPagina(); limparPagina = null; } // redesenhar a mesma página (depois de editar) não acumula teclas
  const pagina = S.bookPages().find((p) => p.id === id);
  if (!pagina) { go('#/leitura'); return; }
  const livro = S.bookLivros().find((l) => l.id === pagina.livro); const frases = pagina.frases; const lidas = frases.map((f) => palavrasMarcadas(f.marcada));
  const cartao = (f, i) => `
    <article class="cd-frase" data-i="${i}">
      <p class="frase">${lidas[i].map((w, n) => `<button type="button" class="pal" data-i="${i}" data-n="${n}">${w.map((s) => (s.k === 'n' ? esc(s.t) : `<span class="${s.k}">${esc(s.t)}</span>`)).join('')}</button>`).join(' ')}</p>
      ${f.leitura ? `<div class="como"><small>Como se lê</small><span>${esc(f.leitura)}</span></div>` : ''}
      ${f.pt ? `<p class="pt-t">${esc(f.pt)}</p>` : ''}
      <div class="acoes"><button class="btn sm" data-ouvir="${i}">${I('volume')} Ouvir</button><button class="btn sm" data-devagar="${i}">${I('clock')} Devagar</button></div>
      ${f.regras.length || f.avancado ? `<div class="rgrs">${f.regras.map((r) => `<span class="rgr">${esc(r)}</span>`).join('')}${f.avancado ? `<span class="rgr av">${I('alert-circle')} mais avançado</span>` : ''}</div>` : ''}
    </article>`;
  $app.innerHTML = `
    <header class="apphead"><button class="back" data-go="#/leitura/livro/${pagina.livro}" aria-label="Voltar para o livro">${I('chevron-left')}</button><div class="hello"><b>Página ${pagina.numero}</b><small>${esc(livro ? livro.titulo : '')} · ${plural(frases.length, 'frase', 'frases')}</small></div><button class="icon" id="leditar" aria-label="Mudar de livro ou de número">${I('pencil')}</button><button class="icon" id="lapagar" aria-label="Apagar esta página">${I('trash')}</button></header>
    <div class="pager-nav"><button class="icon" id="pprev" aria-label="Frase anterior">${I('chevron-left')}</button><span id="ppos" aria-live="polite"></span><button class="icon" id="pnext" aria-label="Próxima frase">${I('chevron-right')}</button></div>
    <div class="pager" id="pager" aria-label="Frases da página: deslize para o lado">${frases.map(cartao).join('')}</div>
    <small class="fine">Deslize para o lado para a próxima frase. Letras mudas em cinza, ligações sublinhadas. O guia "como se lê", as marcas e o dicionário vêm da IA e podem errar: o áudio é a referência.</small>`;

  const pager = document.getElementById('pager'); const cards = [...pager.querySelectorAll('.cd-frase')];
  const dic = { ctl: null }; let pos = 0; let salvar = null; let rolando = null;
  const marcar = (i) => {
    pos = Math.max(0, Math.min(cards.length - 1, i));
    document.getElementById('ppos').textContent = `${pos + 1} de ${cards.length}`;
    document.getElementById('pprev').disabled = pos === 0; document.getElementById('pnext').disabled = pos === cards.length - 1;
    clearTimeout(salvar); salvar = setTimeout(() => S.setBookPos(id, pos), 600);
  };
  const irPara = (i, suave) => {
    marcar(i); const esq = cards[pos].offsetLeft - cards[0].offsetLeft;
    if (pager.scrollTo) pager.scrollTo({ left: esq, behavior: suave ? 'smooth' : 'auto' }); else pager.scrollLeft = esq;
  };
  document.getElementById('pprev').onclick = () => irPara(pos - 1, true); document.getElementById('pnext').onclick = () => irPara(pos + 1, true);
  // ao arrastar, a posição segue a frase que ficou à vista
  pager.addEventListener('scroll', () => {
    clearTimeout(rolando);
    rolando = setTimeout(() => { const passo = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : 0; if (passo > 0) marcar(Math.round(pager.scrollLeft / passo)); }, 80);
  }, { passive: true });
  const onKey = (e) => { if (document.getElementById('folha') && document.getElementById('folha').firstChild) return; if (e.key === 'ArrowRight') irPara(pos + 1, true); else if (e.key === 'ArrowLeft') irPara(pos - 1, true); };
  document.addEventListener('keydown', onKey);
  limparPagina = () => { document.removeEventListener('keydown', onKey); clearTimeout(salvar); clearTimeout(rolando); if (dic.ctl) dic.ctl.abort(); S.setBookPos(id, pos); };
  setCleanup(limparPagina);
  irPara(Math.min(pagina.pos || 0, cards.length - 1), false);

  const tocar = (i, velocidade) => {
    document.querySelectorAll('.cd-frase.falando').forEach((c) => c.classList.remove('falando'));
    const c = cards[i]; c.classList.add('falando');
    speak(frases[i].fr, { rate: velocidade }).then(() => c.classList.remove('falando'));
  };
  document.querySelectorAll('[data-ouvir]').forEach((b) => { b.onclick = () => tocar(+b.dataset.ouvir, rate()); });
  document.querySelectorAll('[data-devagar]').forEach((b) => { b.onclick = () => tocar(+b.dataset.devagar, rateDevagar()); });

  // tocar numa palavra: lê a palavra e abre o verbete (do cache ou consultado na hora)
  document.querySelectorAll('.pal').forEach((botao) => {
    botao.onclick = () => {
      const i = +botao.dataset.i; const w = lidas[i][+botao.dataset.n]; const bruto = textoDaPalavra(w); const texto = apertar(bruto); const frase = frases[i].fr;
      const achada = acharPalavra(frases[i].palavras, bruto); const chave = chaveVerbete(texto, frase);
      if (dic.ctl) dic.ctl.abort(); const ctl = new AbortController(); dic.ctl = ctl;
      document.querySelectorAll('.pal.on').forEach((x) => x.classList.remove('on')); botao.classList.add('on');
      speak(texto, { rate: rate(), rapido: true });
      const { box, fechar } = abrirFolha('<div id="dic"></div>', () => { ctl.abort(); botao.classList.remove('on'); });
      const alvo = box.querySelector('#dic');
      const pinta = (v, aviso) => {
        alvo.innerHTML = verbeteHtml({ texto, achada, v, aviso, jaTem: !!v && S.temPalavra(texto) });
        alvo.querySelector('#dic-ouvir').onclick = () => speak(texto, { rate: rate(), rapido: true });
        alvo.querySelectorAll('[data-dex]').forEach((b) => { b.onclick = () => speak(b.dataset.dex, { rate: rate() }); });
        alvo.querySelector('#dic-fechar').onclick = fechar;
        const tentar = alvo.querySelector('#dtentar'); if (tentar) tentar.onclick = consultar;
        const guardar = alvo.querySelector('#dic-guardar');
        if (guardar) guardar.onclick = () => {
          const propria = alvo.querySelector('#dic-frase').value.trim(); const pt = (v.significados[0] && v.significados[0].pt) || v.contexto;
          S.addCarta({ fr: texto, pt, frase: propria || frase, origem: 'leitura' }); toast('Carta guardada. Ela entra no Reforço.');
          guardar.disabled = true; guardar.innerHTML = `${I('circle-check')} Guardada nas minhas cartas`;
        };
      };
      async function consultar() {
        pinta(null, estado('info', 'sparkles', 'Consultando o dicionário…'));
        try {
          const resposta = await T.consultarPalavra({ apiKey: st().settings.keys.gemini, model: (st().settings.models || {}).gemini, palavra: texto, frase, signal: ctl.signal });
          const v = validarVerbete(lerJson(resposta, 'A resposta do dicionário veio incompleta. Tente de novo.'));
          guardarVerbete(chave, v); if (document.body.contains(alvo)) pinta(v);
        } catch (e) {
          if (ctl.signal.aborted || !document.body.contains(alvo)) return;
          pinta(null, `${estado('erro', 'alert-circle', 'Não consegui consultar o dicionário', esc(T.friendlyError(e)))}<button class="btn primary wide" id="dtentar">Tentar de novo</button>`);
        }
      }
      const salvo = verbeteSalvo(chave);
      if (salvo) pinta(salvo); else if (temChave()) consultar(); else pinta(null, estado('aviso', 'key', 'Falta a chave do Gemini', 'O dicionário completo usa o Gemini, que é grátis. Coloque a chave em Ajustes, na Professora Clara.'));
    };
  });

  document.getElementById('leditar').onclick = () => {
    const { box, fechar } = abrirFolha(`<h3>Página no livro</h3>
      <label>Livro<select id="eslivro" class="inp">${S.bookLivros().map((l) => `<option value="${esc(l.id)}" ${l.id === pagina.livro ? 'selected' : ''}>${esc(l.titulo)}</option>`).join('')}</select></label>
      <label>Número da página<input id="esnum" class="inp" type="number" min="1" inputmode="numeric" value="${pagina.numero}"></label>
      <div class="sc-acoes"><button class="btn primary" id="essalvar">Salvar</button><button class="btn" id="escancelar">Cancelar</button></div>`);
    box.querySelector('#escancelar').onclick = fechar;
    box.querySelector('#essalvar').onclick = () => {
      const numero = parseInt(box.querySelector('#esnum').value, 10); if (!(numero > 0)) { toast('Informe o número da página.'); return; }
      S.updateBookPage(id, { livro: box.querySelector('#eslivro').value, numero }); fechar(); paginaDeLeitura(id);
    };
  };
  document.getElementById('lapagar').onclick = () => { if (confirm('Apagar esta página da leitura? O texto dela some do app.')) { S.deleteBookPage(id); go(`#/leitura/livro/${pagina.livro}`); } };
}
