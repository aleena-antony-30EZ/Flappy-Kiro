// Flappy Kiro — Service Worker
// Cache-first for assets, network-first for index.html

const CACHE_NAME = 'flappy-kiro-v1';

const PRECACHE = [
  '/',
  '/index.html',
  '/assets/ghosty.png',
  '/assets/jump.wav',
  '/assets/game_over.wav'
];

// ─── INSTALL: precache all game files ────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting(); // activate immediately
});

// ─── ACTIVATE: remove old caches ─────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // take control of all open tabs
});

// ─── FETCH: cache-first for assets, network-first for HTML ───
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    // Network-first for HTML — always try to get the latest game
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
  } else {
    // Cache-first for assets (images, audio)
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
      )
    );
  }
});
