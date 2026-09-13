/* Dzięki temu Bilans otwiera się bez internetu — na lekcji też.
   Po zmianie plików podnieś CACHE, żeby stara wersja nie została w pamięci. */

const CACHE = 'bilans-2';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/core.js',
  './js/params.js',
  './js/plan-kont.js',
  './js/calc.js',
  './js/ksiegi.js',
  './js/ksiegi-ui.js',
  './js/tools.js',
  './js/app.js',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) { return key === CACHE ? null : caches.delete(key); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  const request = event.request;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(function () { return caches.match('./index.html'); }));
    return;
  }
  event.respondWith(
    caches.match(request).then(function (cached) {
      const fresh = fetch(request).then(function (response) {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      }).catch(function () { return cached; });
      return cached || fresh;
    })
  );
});
