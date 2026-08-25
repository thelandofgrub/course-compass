const CACHE_NAME = 'coursecompass-v54';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './assets/fonts/inter-latin.woff2',
  './assets/fonts/jetbrains-mono-latin.woff2',
  './assets/fonts/playfair-display-latin.woff2',
  './js/firebase-config.js',
  './js/storage.js',
  './js/vendor/qrcode.js',
  './js/sync.js',
  './js/course-data-open.js',
  './js/data.js',
  './js/ai-policy.js',
  './js/voice.js',
  './js/lessons.js',
  './js/caddie.js',
  './js/scoring.js',
  './js/leaderboard.js',
  './js/trivia.js',
  './js/app.js',
  './manifest.json',
  './legal/legal.css',
  './legal/privacy.html',
  './legal/terms.html',
  './legal/support.html',
  './legal/delete-account.html',
  './legal/data-licenses.html',
  './data/coursecompass-open-courses.json'
].map(relative => new URL(relative, self.registration.scope).href);

// Install — cache all core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first for app assets, network-first for API calls
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-first for Overpass API and external requests
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for app shell
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }))
  );
});
