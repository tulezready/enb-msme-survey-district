const CACHE_NAME = 'msme-survey-district-v1';
const APP_SHELL = [
  './index.html',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Each file is fetched with {cache:'reload'} to bypass the browser's own
      // HTTP cache, not just the service worker's cache - otherwise a new
      // service worker version can still get populated with stale content
      // the browser already had cached from an earlier visit.
      await Promise.all(APP_SHELL.map(async (url) => {
        const response = await fetch(url, { cache: 'reload' });
        await cache.put(url, response);
      }));
      await self.skipWaiting();
    })().catch((err) => console.error('SW install failed to cache app shell:', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Cache-first for everything, with a guaranteed fallback to the cached
// index.html for any page-navigation request. This is what makes a
// hard refresh with zero signal still load the app shell.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cachedExact = await caches.match(req);
        if (cachedExact) return cachedExact;
        const cachedShell = await caches.match('./index.html');
        try {
          const network = await fetch(req);
          return network;
        } catch (e) {
          return cachedShell || Response.error();
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const response = await fetch(req);
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, clone);
        }
        return response;
      } catch (e) {
        return cached; // undefined -> browser shows its own offline error for uncached, non-shell assets
      }
    })()
  );
});
