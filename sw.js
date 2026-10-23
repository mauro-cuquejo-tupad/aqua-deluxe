/* ==========================================================================
   AQUASORT MASTER DELUXE - SERVICE WORKER (PWA)
   Soporte Offline, Caché Rápida y Experiencia de App Nativa Móvil
   ========================================================================== */

const CACHE_NAME = 'aquasort-deluxe-v4.2';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon.svg',
  './css/main.css?v=42',
  './css/tubes.css?v=42',
  './css/roulette.css?v=42',
  './css/accessibility.css?v=42',
  './js/firebase-config.js?v=42',
  './js/cloud-sync.js?v=42',
  './js/audio.js?v=42',
  './js/palette.js?v=42',
  './js/levels.js?v=42',
  './js/challenges.js?v=42',
  './js/honor.js?v=42',
  './js/state.js?v=42',
  './js/achievements.js?v=42',
  './js/leaderboard.js?v=42',
  './js/roulette.js?v=42',
  './js/story.js?v=42',
  './js/game.js?v=42'
];

// Instalación: Cachear recursos críticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
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

// Fetch: Network First con fallback a Caché para máxima frescura y soporte sin conexión
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones que no sean GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
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
