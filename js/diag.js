// Diagnóstico do aparelho: testes guiados (microfone, voz, transcrição, IA, armazenamento) com relatório para copiar.
import * as S from './store.js';
import * as T from './tutor.js';
import * as V from './speech.js';
import { VERSION, BUILD_DATE } from './version.js';
import { esc, I, toast } from './ui.js';

export function diagHtml() {
  return `
  <header class="top"><button class="back" data-go="#/settings" aria-label="Voltar">${I('back')}</button><h1>Diagnóstico do aparelho</h1></header>
  <section class="card"><p class="pt">Rode os testes um por um e, se algo falhar, copie o relatório e me envie. Os testes de voz, transcrição e IA usam sua chave gratuita (1 pedido cada).</p>
    <div class="diag-btns">
      <button class="btn" data-t="voz">${I('volume')} Testar a voz</button>
      <button class="btn" data-t="mic">${I('mic')} Testar o microfone (3 s)</button>
      <button class="btn" data-t="transc">${I('send')} Testar a transcrição (4 s)</button>
      <button class="btn" data-t="ia">${I('chat')} Testar a Clara</button>
      <button class="btn primary" data-t="tudo">${I('activity')} Rodar tudo</button>
    </div>
    <div id="dlevel" class="dlevel" hidden><i></i></div>
  </section>
  <section class="card"><h3>Resultados</h3><ul id="dres" class="dres"></ul>
    <button class="btn wide" id="dcopy">${I('file')} Copiar relatório</button></section>`;
}

export function initDiag(root, { cur }) {
  const res = root.querySelector('#dres'); const lines = []; const lvl = root.querySelector('#dlevel');
  const add = (state, label, detail = '') => {
    const ico = { ok: '✅', warn: '⚠️', fail: '❌' }[state] || '•';
    lines.push(`${ico} ${label}${detail ? ' — ' + detail : ''}`);
    res.insertAdjacentHTML('beforeend', `<li class="${state}"><b>${ico} ${esc(label)}</b>${detail ? `<small>${esc(detail)}</small>` : ''}</li>`);
  };
  const ms = (t0) => `${Math.round(performance.now() - t0)} ms`;
  const s = S.get().settings;

  async function info() {
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    add('ok', 'Versão do app', `v${VERSION} (${BUILD_DATE})`);
    add(standalone ? 'ok' : 'warn', 'Instalado como app', standalone ? 'sim' : 'não: abrindo pelo navegador (menu ⋮ → Instalar app)');
    add(navigator.onLine ? 'ok' : 'warn', 'Internet', navigator.onLine ? 'conectado' : 'sem conexão');
    add(navigator.serviceWorker && navigator.serviceWorker.controller ? 'ok' : 'warn', 'Modo offline (service worker)', navigator.serviceWorker && navigator.serviceWorker.controller ? 'ativo' : 'ainda não ativo (recarregue uma vez)');
    try { const p = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null; const e = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null; add(p ? 'ok' : 'warn', 'Armazenamento protegido', `${p ? 'sim' : 'não'}${e ? ` · uso ${(e.usage / 1024).toFixed(0)} KB` : ''}${p ? '' : ' · faça um backup em Ajustes'}`); } catch (e) { add('warn', 'Armazenamento', 'não consegui verificar'); }
    add(V.hasFrenchVoice() ? 'ok' : 'warn', 'Voz francesa do aparelho', V.hasFrenchVoice() ? V.frenchVoiceName() : 'nenhuma (o app usa a voz natural do Gemini)');
    const c = cur(); add(c.key ? 'ok' : 'fail', 'Chave de IA', c.key ? `${T.PROVIDERS[c.p].label}, modelo ${c.model}` : 'não configurada');
    add(V.canRecord ? 'ok' : 'fail', 'Gravação de áudio', V.canRecord ? 'disponível' : 'indisponível neste navegador');
    try { const el = JSON.parse(localStorage.getItem('fr_errlog') || '[]'); add(el.length ? 'warn' : 'ok', 'Erros recentes do app', el.length ? el.slice(-3).map((x) => x.m + ' (' + x.f + ')').join(' | ') : 'nenhum'); } catch (e) { /* ignore */ }
    add('ok', 'Aparelho', `${screen.width}×${screen.height}, ${navigator.userAgent.replace(/^Mozilla\/5.0 /, '').slice(0, 60)}`);
  }
  async function voz() {
    const t0 = performance.now(); const e = V.engineInfo();
    try { await V.speak('Bonjour ! Ceci est un test de la voix de Clara.', { rate: 0.9 }); add(V.voiceNote ? 'warn' : 'ok', 'Voz da Clara', `${e.engine === 'gemini' ? 'voz natural (Gemini)' : 'voz do aparelho'} · ${ms(t0)}${V.voiceNote ? ' · ' + V.voiceNote : ''}`); } catch (err) { add('fail', 'Voz da Clara', String(err.message || err)); }
  }
  async function gravar(segundos) {
    let rec; const t0 = performance.now(); let peak = 0;
    try { rec = await V.createRecorder({ onLevel: (l) => { peak = Math.max(peak, l); lvl.firstElementChild.style.width = Math.min(100, l * 700) + '%'; } }); } catch (e) { add('fail', 'Microfone', e && e.name === 'NotAllowedError' ? 'permissão negada: libere o microfone nas permissões do site' : String(e.message || e)); return null; }
    lvl.hidden = false; toast(`Fale agora por ${segundos} s…`); await new Promise((r) => setTimeout(r, segundos * 1000));
    const out = await rec.stop(); lvl.hidden = true; out.t = ms(t0); out.peakSeen = peak; return out;
  }
  async function mic() {
    const r = await gravar(3); if (!r) return;
    const p = r.peak < 0 ? 'sem medidor' : r.peak.toFixed(3);
    add(r.peak < 0 ? 'warn' : r.peak >= 0.012 ? 'ok' : 'fail', 'Microfone', `${(r.blob.size / 1024).toFixed(0)} KB gravados · volume máximo ${p}${r.peak >= 0 && r.peak < 0.012 ? ' (muito baixo: fale mais perto ou aumente o volume)' : ''}`);
  }
  async function transc() {
    const tp = T.transcribeProvider(s); if (!tp) { add('fail', 'Transcrição', 'precisa de chave do Gemini ou do Groq'); return; }
    const r = await gravar(4); if (!r) return; const t0 = performance.now();
    try { const text = await T.transcribe({ provider: tp, apiKey: (s.keys || {})[tp], model: (s.models || {})[tp] || T.PROVIDERS[tp].model, blob: r.blob }); add(text ? 'ok' : 'warn', `Transcrição (${T.PROVIDERS[tp].label})`, `${ms(t0)} · ${text ? '“' + text + '”' : 'não entendi nada: fale uma frase em francês'}`); } catch (e) { add('fail', 'Transcrição', T.friendlyError(e)); }
  }
  async function ia() {
    const c = cur(); if (!c.key) { add('fail', 'Clara (IA)', 'sem chave'); return; } const t0 = performance.now();
    try { const { text } = await T.chat({ provider: c.p, apiKey: c.key, model: c.model, mode: 'duvidas', messages: [{ role: 'user', content: 'Responda apenas: ok' }] }); add('ok', 'Clara (IA)', `${ms(t0)} · resposta: ${text.trim().slice(0, 40)}`); } catch (e) { add('fail', 'Clara (IA)', T.friendlyError(e)); }
  }

  const run = { voz, mic, transc, ia, tudo: async () => { await voz(); await mic(); await transc(); await ia(); } };
  let busy = false;
  root.querySelectorAll('[data-t]').forEach((b) => { b.onclick = async () => { if (busy) return; busy = true; root.querySelectorAll('[data-t]').forEach((x) => { x.disabled = true; }); try { await run[b.dataset.t](); } finally { busy = false; root.querySelectorAll('[data-t]').forEach((x) => { x.disabled = false; }); } }; });
  root.querySelector('#dcopy').onclick = async () => { const txt = `Clarté diagnóstico (${new Date().toLocaleString('pt-BR')})\n` + lines.join('\n'); try { await navigator.clipboard.writeText(txt); toast('Relatório copiado.'); } catch (e) { prompt('Copie o relatório:', txt); } };
  info();
}
