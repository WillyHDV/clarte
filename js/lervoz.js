// Ler em voz alta (Leitura): você lê a frase do livro, o app confere palavra por palavra e leva ao Reforço o que não saiu bem.
// Reaproveita o reconhecimento de voz dos exercícios de fala (navegador, ou gravação + IA no app Android) e a nota speakScore.
import { listen, dictate, browserRec, canTalk, stopSpeaking } from './speech.js';
import { speakScore } from './exercises.js';
import * as S from './store.js';
import { esc, I, toast } from './ui.js';

export const LIMITE = 0.75; // a mesma régua dos exercícios de fala: 75% das palavras reconhecidas
const dicaInicial = () => (browserRec() ? 'Toque no microfone e leia a frase.' : 'Toque no microfone, leia a frase e toque de novo para enviar.');

// monta o painel de leitura dentro de `painel` (um elemento do cartão da frase).
// traduzir(palavra) devolve o significado conhecido da palavra ou '' (vem da página lida); devolve { parar } para quem fechar a tela.
export function lerEmVozAlta(painel, { frase, traduzir = () => '' }) {
  if (!canTalk()) { toast('Para ler em voz alta, coloque uma chave do Gemini (ou do Groq) em Ajustes, ou use o Chrome.'); return { parar() {} }; }
  let rec = null;
  const alvo = frase.replace(/[.!?…]+$/, '');
  // a frase que não saiu bem entra na revisão espaçada, como as repetições da ligação com a Clara
  const ex = { unit: 'leitura', kind: 'speak', q: 'Diga em voz alta (da Leitura):', answer: alvo, shown: frase, audio: frase, key: `speak|leitura|${frase}` };

  function inicio(msg) {
    painel.innerHTML = `<div class="lervoz"><button class="lv-mic" type="button" aria-label="Gravar minha leitura">${I('microphone')}</button><div class="heard" aria-live="polite">${esc(msg || dicaInicial())}</div></div>`;
    painel.querySelector('.lv-mic').onclick = gravar;
  }
  function gravar() {
    if (rec) { rec.stop(); return; }
    const mic = painel.querySelector('.lv-mic'); const hd = painel.querySelector('.heard');
    stopSpeaking(); mic.classList.add('on'); hd.textContent = 'Ouvindo…';
    rec = (browserRec() ? listen : dictate)({
      onInterim: (t) => { hd.textContent = t || 'Ouvindo…'; },
      onPhase: (p) => { hd.textContent = p === 'think' ? 'Entendendo você…' : 'Gravando… toque de novo para enviar.'; },
      onFinal: (t) => { rec = null; if (t) resultado(t); else inicio('Não ouvi nada. Tente de novo.'); },
      onError: (er, msg) => { rec = null; mic.classList.remove('on'); hd.textContent = er === 'not-allowed' ? 'Permita o microfone no navegador.' : er === 'no-speech' ? 'Não ouvi nada. Tente de novo.' : msg || `Erro no reconhecimento de voz (${er}).`; },
    });
  }
  function resultado(ouvido) {
    const r = speakScore(alvo, ouvido); const ok = r.score >= LIMITE; const acertos = r.marks.filter(Boolean).length;
    S.noteResult(ex, ok, true); S.recordSkill('pronuncia', r.score);
    const dificeis = [...new Set(r.words.filter((w, i) => !r.marks[i] && [...w].length >= 3))];
    painel.innerHTML = `<div class="lervoz fim">
      <div class="words">${r.words.map((w, i) => `<span class="${r.marks[i] ? 'g' : 'r'}">${esc(w)}</span>`).join(' ')}</div>
      <p class="lv-res">${ok ? 'Muito bem!' : 'Quase lá.'} Você acertou ${acertos} de ${r.words.length} palavras.${acertos < r.words.length ? ' As vermelhas não foram reconhecidas: ouça a frase e tente de novo.' : ''}${ok ? '' : ' A frase vai para o Reforço.'}</p>
      <div class="acoes"><button class="btn sm" type="button" data-lv="de-novo">${I('microphone')} Tentar de novo</button>${dificeis.length ? `<button class="btn sm" type="button" data-lv="guardar">${I('bulb')} Guardar difíceis (${dificeis.length})</button>` : ''}</div></div>`;
    painel.querySelector('[data-lv="de-novo"]').onclick = () => inicio();
    const g = painel.querySelector('[data-lv="guardar"]');
    if (g) g.onclick = () => {
      for (const w of dificeis) S.addCarta({ fr: w, pt: traduzir(w), frase, origem: 'leitura-voz' });
      g.disabled = true; g.innerHTML = `${I('circle-check')} Guardadas`; toast(`${dificeis.length === 1 ? 'Palavra guardada' : `${dificeis.length} palavras guardadas`} nas suas cartas. Elas entram no Reforço.`);
    };
  }
  inicio();
  return { parar() { if (rec) { rec.stop(); rec = null; } } };
}
