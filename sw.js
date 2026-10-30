// Cache simples: o app funciona offline (exceto o professor de IA). Troque CACHE ao publicar uma nova versao.
const CACHE = 'fr-v11';
const ASSETS = ['./', 'index.html', 'styles.css', 'manifest.webmanifest', 'js/app.js', 'js/data.js', 'js/exercises.js', 'js/speech.js', 'js/store.js', 'js/tutor.js', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => /^fr-v\d+$/.test(k) && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// rede primeiro (sempre pega a versao nova online), cache como reserva offline
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
