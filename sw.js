const CACHE_NAME = 'hello-world-pwa-v1';

// Liste minimale des assets à mettre en cache.
// (On évite les fichiers dynamiques comme le canvas.)
const CORE_ASSETS = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'manifest.json',
  'icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {
        // Silencieusement : en dev certains chemins peuvent différer.
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Ne pas intercepter les requêtes qui ne sont pas GET.
  if (req.method !== 'GET') return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Stratégie cache-first pour les assets.
    const cached = await cache.match(req);
    if (cached) return cached;

    try {
      const res = await fetch(req);
      // Mise en cache de la réponse si elle est OK.
      if (res && res.status === 200 && res.type !== 'opaque') {
        cache.put(req, res.clone()).catch(() => {});
      }
      return res;
    } catch (e) {
      // Fallback : renvoyer index.html si on ne peut pas.
      if (req.mode === 'navigate' || req.destination === 'document') {
        const fallback = await cache.match('index.html');
        if (fallback) return fallback;
      }
      throw e;
    }
  })());
});
