// Ponto de entrada: roteador, cliques globais e inicialização. As telas ficam em js/screens/.
import { stopSpeaking } from './speech.js';
import * as S from './store.js';
import * as T from './tutor.js';
import { toast } from './ui.js';
import { $app, rate, speak, go, onRoute, runCleanup } from './core.js';
import { checkUpdate } from './update.js';
import { home } from './screens/home.js';
import { unitPage } from './screens/lesson.js';
import { practice } from './screens/practice.js';
import { openTutor } from './screens/tutor.js';
import { settingsPage } from './screens/settings.js';
import { folhaPage, diagPage } from './screens/tools.js';

// ---------- roteador ----------
async function route() {
  // link de configuração: #/setup/<provedor>/<chave> salva a chave neste aparelho e some da barra de endereço
  const setup = (location.hash || '').match(/^#\/setup\/(\w+)\/(.+)$/);
  if (setup && setup[1] in T.PROVIDERS) {
    S.setSetting('provider', setup[1]); S.setKey(setup[1], decodeURIComponent(setup[2]).trim());
    history.replaceState(null, '', location.pathname + location.search + '#/tutor');
    toast('Chave salva neste aparelho ✅');
  }
  runCleanup();
  stopSpeaking();
  const [, page, arg, arg2] = (location.hash || '#/').slice(1).split('/');
  document.querySelectorAll('nav.tabs a').forEach((a) => a.classList.toggle('on', a.dataset.p === (page || 'home') || (a.dataset.p === 'home' && ['unit', 'practice', 'step'].includes(page))));
  $app.scrollTo?.(0, 0); window.scrollTo(0, 0);
  document.body.classList.toggle('focus', page === 'practice' || page === 'step');
  if (page === 'unit') return unitPage(arg);
  if (page === 'practice') return practice(arg);
  if (page === 'step') return practice(arg, arg2);
  if (page === 'tutor') return openTutor(arg);
  if (page === 'settings') return settingsPage();
  if (page === 'folha') return folhaPage();
  if (page === 'diag') return diagPage();
  return home();
}
onRoute(route);
window.addEventListener('hashchange', route);

// ---------- delegação: botões de áudio ----------
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-say]');
  if (b) { b.classList.add('playing'); speak(b.dataset.say, { rate: rate() }).then(() => b.classList.remove('playing')); }
});

// ---------- delegação: botões de navegação (data-go) ----------
document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-go]'); if (!g) return;
  if (g.dataset.lock && !confirm(`Esta unidade vem depois de "${g.dataset.lock}". Abrir mesmo assim?`)) return;
  go(g.dataset.go);
});

// ---------- inicialização ----------
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
S.requestPersist();
if (location.protocol !== 'file:') { setTimeout(() => checkUpdate(false), 4000); setInterval(() => checkUpdate(false), 15 * 60 * 1000); document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUpdate(false); }); }
// registro simples de erros inesperados (aparece no relatório de diagnóstico futuro e evita tela travada sem aviso)
window.addEventListener('error', (e) => { try { const l = JSON.parse(localStorage.getItem('fr_errlog') || '[]'); l.push({ t: new Date().toISOString(), m: String(e.message).slice(0, 200), f: String(e.filename || '').split('/').pop(), l: e.lineno }); localStorage.setItem('fr_errlog', JSON.stringify(l.slice(-20))); } catch (er) { /* ignore */ } });
window.addEventListener('unhandledrejection', (e) => { try { const l = JSON.parse(localStorage.getItem('fr_errlog') || '[]'); l.push({ t: new Date().toISOString(), m: String((e.reason && e.reason.message) || e.reason).slice(0, 200), f: 'promise' }); localStorage.setItem('fr_errlog', JSON.stringify(l.slice(-20))); } catch (er) { /* ignore */ } });
route();
