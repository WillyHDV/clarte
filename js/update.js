// Aviso de versão nova: compara js/version.js com o que está no ar.
import { esc, toast } from './ui.js';
import { VERSION } from './version.js';

// ---------- atualização: avisa quando há versão nova no ar ----------
function showUpdate(v) {
  if (document.querySelector('.upd')) return;
  const b = document.createElement('div'); b.className = 'upd'; b.setAttribute('role', 'alert');
  b.innerHTML = `<span>Nova versão disponível (v${esc(v)})</span><button class="pill primary" id="updgo">Atualizar</button>`;
  document.body.appendChild(b);
  b.querySelector('#updgo').onclick = async () => {
    try { for (const k of await caches.keys()) await caches.delete(k); for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch (e) { /* ignore */ }
    location.reload();
  };
}
export async function checkUpdate(manual) {
  try {
    const t = await (await fetch('js/version.js', { cache: 'no-store' })).text(); const m = /VERSION\s*=\s*'([^']+)'/.exec(t);
    if (m && m[1] !== VERSION) { showUpdate(m[1]); return true; }
    if (manual) toast('Você está na versão mais nova.');
  } catch (e) { if (manual) toast('Não consegui verificar agora (sem internet?).'); }
  return false;
}
