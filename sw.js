// Cache para funcionar offline (exceto a professora de IA). A rede vem primeiro e sempre revalida,
// então uma publicação nova chega sem esperar o cache do servidor; o cache só serve quando está sem internet.
const CACHE = 'fr-v14';
const ASSETS = ['./', 'index.html', 'styles.css', 'manifest.webmanifest', 'js/app.js', 'js/core.js', 'js/progress.js', 'js/update.js', 'js/screens/home.js', 'js/screens/lesson.js', 'js/screens/practice.js', 'js/screens/tutor.js', 'js/screens/settings.js', 'js/screens/tools.js', 'js/ui.js', 'js/version.js', 'js/folha.js', 'js/diag.js', 'js/data.js', 'js/exercises.js', 'js/speech.js', 'js/store.js', 'js/tutor.js', 'content/fb1/pack.js', 'content/fb1/units.js', 'content/fb1/evaluations.js', 'content/fb1/alphabet.js', 'content/fb1/phrases.js', 'content/fb1/social.js', 'content/fb1/verbs.js', 'content/fb1/people.js', 'content/fb1/questions.js', 'content/fb1/lessons.js', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => Promise.all(ASSETS.map((a) => c.add(new Request(a, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => /^fr-v\d+$/.test(k) && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return r; })
      .catch(() => caches.match(e.request)),
  );
});
