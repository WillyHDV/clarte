// Leitura do livro: a lista de páginas (foto → a Clara lê) e a leitura frase a frase, com letras mudas e ligações marcadas.
import * as S from '../store.js';
import * as T from '../tutor.js';
import { esc, I, toast, linha, estado } from '../ui.js';
import { $app, st, rate, rateDevagar, speak, setCleanup, go } from '../core.js';
import { prepararImagem, validarPagina, lerJson, palavrasMarcadas, textoDaPalavra, acharPalavra } from '../leitura.js';

export const leituraPage = (id) => (id ? paginaDeLeitura(id) : listaDePaginas());

const apertar = (t) => t.replace(/^[«“"(]+|[.,;:!?»”")…]+$/g, '');
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// ---------- lista de páginas e envio da foto ----------
function listaDePaginas() {
  const todas = S.bookPages(); const temChave = !!((st().settings.keys || {}).gemini);
  const linhas = todas.map((p, i) => ({ p, n: i + 1 })).reverse();
  const topo = temChave ? '' : `${estado('aviso', 'key', 'Falta a chave do Gemini', 'A leitura por foto usa o Gemini, que é grátis. Coloque a chave em Ajustes, na Professora Clara.')}<button class="btn wide" data-go="#/settings/ia">Abrir Ajustes</button><div class="spc"></div>`;
  $app.innerHTML = `
    <header class="apphead"><button class="back" data-go="#/tutor" aria-label="Voltar">${I('chevron-left')}</button><div class="hello"><b>Leitura do livro</b><small>Fotografe uma página e leia com a Clara</small></div></header>
    ${topo}
    <section class="card"><h3>Adicionar uma página</h3>
      <p class="pt">Foto reta, com boa luz e sem cortar as bordas. Pode ser só o francês ou o par francês e português: a Clara separa e alinha as frases. A foto não fica guardada, só o texto.</p>
      <div class="row"><button class="btn primary" id="lcam" ${temChave ? '' : 'disabled'}>${I('camera')} Tirar foto</button><button class="btn" id="ladd" ${temChave ? '' : 'disabled'}>${I('upload')} Da galeria</button></div>
      <input type="file" id="lcamera" accept="image/*" capture="environment" hidden>
      <input type="file" id="lfile" accept="image/*" hidden>
      <div id="lstatus" role="status" aria-live="polite"></div>
    </section>
    ${linhas.length ? `<div class="grupo">${linhas.map(({ p, n }) => linha({ icone: 'book', titulo: `Página ${n}`, resumo: `${plural(p.frases.length, 'frase', 'frases')} · ${new Date(p.criada).toLocaleDateString('pt-BR')}`, go: `#/leitura/${p.id}` })).join('')}</div>` : '<p class="pt">Nenhuma página lida ainda.</p>'}`;

  let atual = null; // { ctl, imagem } da leitura em andamento
  const status = document.getElementById('lstatus'); const add = document.getElementById('ladd'); const cam = document.getElementById('lcam'); const arquivo = document.getElementById('lfile'); const camera = document.getElementById('lcamera');
  const travar = (sim) => { add.disabled = sim; cam.disabled = sim; };
  const vivo = () => document.body.contains(status); // saiu da tela no meio: não mexe mais nela
  const pinta = (html) => { if (vivo()) status.innerHTML = html; };
  setCleanup(() => { if (atual && atual.ctl) atual.ctl.abort(); });

  async function processar(imagem) {
    const ctl = new AbortController(); atual = { ctl, imagem }; travar(true);
    pinta(`${estado('info', 'sparkles', 'A Clara está lendo a página…', 'Leva de 10 a 30 segundos.')}<button class="btn wide" id="lcancelar">Cancelar</button>`);
    status.querySelector('#lcancelar').onclick = () => ctl.abort();
    try {
      const texto = await T.lerPagina({ apiKey: st().settings.keys.gemini, model: (st().settings.models || {}).gemini, image: imagem, signal: ctl.signal });
      const { frases } = validarPagina(lerJson(texto));
      if (!vivo()) return; // você saiu da tela: a página não é guardada
      const id = S.addBookPage(frases); toast(`Página lida: ${plural(frases.length, 'frase', 'frases')}.`); go(`#/leitura/${id}`);
    } catch (e) {
      if (!vivo()) return; travar(false);
      if (e && e.name === 'AbortError') { pinta(estado('info', 'x', 'Leitura cancelada')); return; }
      pinta(`${estado('erro', 'alert-circle', 'Não consegui ler a página', esc(T.friendlyError(e)))}<button class="btn primary wide" id="ltentar">Tentar de novo</button>`);
      status.querySelector('#ltentar').onclick = () => processar(imagem);
    }
  }
  add.onclick = () => arquivo.click(); cam.onclick = () => camera.click(); // câmera: no app Android abre a câmera do aparelho e a foto volta direto para cá
  const receber = (entrada) => async () => {
    const f = entrada.files && entrada.files[0]; entrada.value = ''; if (!f) return;
    travar(true); pinta(estado('info', 'camera', 'Preparando a foto…'));
    try { await processar(await prepararImagem(f)); } catch (e) { travar(false); pinta(estado('erro', 'alert-circle', 'Não consegui usar essa foto', esc(e.message || 'Tente outra foto.'))); }
  };
  arquivo.onchange = receber(arquivo); camera.onchange = receber(camera);
}

// ---------- leitura de uma página ----------
function paginaDeLeitura(id) {
  const todas = S.bookPages(); const idx = todas.findIndex((p) => p.id === id);
  if (idx < 0) { go('#/leitura'); return; }
  const pagina = todas[idx]; const frases = pagina.frases; const lidas = frases.map((f) => palavrasMarcadas(f.marcada));
  const cartao = (f, i) => `
    <article class="cd-frase" data-i="${i}">
      <p class="frase">${lidas[i].map((w, n) => `<button type="button" class="pal" data-i="${i}" data-n="${n}">${w.map((s) => (s.k === 'n' ? esc(s.t) : `<span class="${s.k}">${esc(s.t)}</span>`)).join('')}</button>`).join(' ')}</p>
      ${f.leitura ? `<div class="como"><small>Como se lê</small><span>${esc(f.leitura)}</span></div>` : ''}
      ${f.pt ? `<p class="pt-t">${esc(f.pt)}</p>` : ''}
      <div class="acoes"><button class="btn sm" data-ouvir="${i}">${I('volume')} Ouvir</button><button class="btn sm" data-devagar="${i}">${I('clock')} Devagar</button></div>
      ${f.regras.length || f.avancado ? `<div class="rgrs">${f.regras.map((r) => `<span class="rgr">${esc(r)}</span>`).join('')}${f.avancado ? `<span class="rgr av">${I('alert-circle')} mais avançado</span>` : ''}</div>` : ''}
      <div class="pop" hidden></div>
    </article>`;
  $app.innerHTML = `
    <header class="apphead"><button class="back" data-go="#/leitura" aria-label="Voltar">${I('chevron-left')}</button><div class="hello"><b>Página ${idx + 1}</b><small>${plural(frases.length, 'frase', 'frases')} · toque numa palavra</small></div><button class="icon" id="lapagar" aria-label="Apagar esta página">${I('trash')}</button></header>
    ${frases.map(cartao).join('')}
    <small class="fine">Letras mudas em cinza, ligações sublinhadas. O guia "como se lê" e as marcas são geradas pela IA e podem errar: o áudio é a referência.</small>`;

  const tocar = (i, velocidade) => {
    document.querySelectorAll('.cd-frase.falando').forEach((c) => c.classList.remove('falando'));
    const c = document.querySelector(`.cd-frase[data-i="${i}"]`); c.classList.add('falando');
    speak(frases[i].fr, { rate: velocidade }).then(() => c.classList.remove('falando'));
  };
  document.querySelectorAll('[data-ouvir]').forEach((b) => { b.onclick = () => tocar(+b.dataset.ouvir, rate()); });
  document.querySelectorAll('[data-devagar]').forEach((b) => { b.onclick = () => tocar(+b.dataset.devagar, rateDevagar()); });
  document.querySelectorAll('.pal').forEach((b) => {
    b.onclick = () => {
      const i = +b.dataset.i; const w = lidas[i][+b.dataset.n]; const texto = apertar(textoDaPalavra(w));
      const pop = document.querySelector(`.cd-frase[data-i="${i}"] .pop`); const ligada = b.classList.contains('on');
      document.querySelectorAll('.pal.on').forEach((x) => x.classList.remove('on')); document.querySelectorAll('.pop').forEach((p) => { p.hidden = true; });
      if (ligada) return;
      b.classList.add('on'); const achada = acharPalavra(frases[i].palavras, textoDaPalavra(w));
      pop.hidden = false;
      pop.innerHTML = `<b>${esc(texto)}</b>${achada ? ` · ${esc(achada.pt)}${achada.uso ? `<small>${esc(achada.uso)}</small>` : ''}` : '<small>Sem detalhes desta palavra. Ouça e compare com a frase inteira.</small>'}`;
      speak(texto, { rate: rate(), rapido: true });
    };
  });
  document.getElementById('lapagar').onclick = () => { if (confirm('Apagar esta página da leitura? O texto dela some do app.')) { S.deleteBookPage(id); go('#/leitura'); } };
}
