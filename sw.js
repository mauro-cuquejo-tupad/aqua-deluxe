/* ==========================================================================
   AQUASORT MASTER DELUXE - SERVICE WORKER (PWA)
   Soporte Offline, Caché Rápida y Experiencia de App Nativa Móvil
   ========================================================================== */

const CACHE_NAME = 'aquasort-deluxe-v7.7';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon.svg',
  './css/main.css?v=77',
  './css/tubes.css?v=77',
  './css/roulette.css?v=77',
  './css/accessibility.css?v=77',
  './js/firebase-config.js?v=77',
  './js/cloud-sync.js?v=77',
  './js/audio.js?v=77',
  './js/palette.js?v=77',
  './js/levels.js?v=77',
  './js/challenges.js?v=77',
  './js/honor.js?v=77',
  './js/state.js?v=77',
  './js/achievements.js?v=77',
  './js/leaderboard.js?v=77',
  './js/roulette.js?v=77',
  './js/story.js?v=77',
  './js/game.js?v=77'
];

// Instalación: Cachear recursos críticos evitando caché HTTP obsoleta
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const freshRequests = PRECACHE_ASSETS.map((url) => new Request(url, { cache: 'no-cache' }));
      return cache.addAll(freshRequests).catch((err) => {
        console.warn('PWA Precache warning (some assets might load on demand):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activación: Limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network First sin caché HTTP estancada, con fallback a Caché para soporte sin conexión
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones que no sean GET
  if (event.request.method !== 'GET') return;

  const isSameOrigin = event.request.url.startsWith(self.location.origin);
  const fetchOptions = isSameOrigin ? { cache: 'no-cache' } : {};

  event.respondWith(
    fetch(event.request, fetchOptions)
      .then((networkResponse) => {
        // Si la respuesta es válida, clonar y actualizar la caché para uso offline
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Si falla la red (offline), servir desde la caché
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // Si busca la raíz o HTML y está offline, retornar index.html
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
  );
});
