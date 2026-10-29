/* Dzięki temu Saper otwiera się bez internetu — w metrze i w samolocie też.
   Po zmianie plików podnieś CACHE, żeby stara wersja nie została w pamięci. */

const CACHE = 'saper-2';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/store.js',
  './js/ui.js',
  './js/game.js',
  './js/views/gra.js',
  './js/views/rekordy.js',
  './js/views/ustawienia.js',
  './js/app.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
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
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (key) {
          return key === CACHE ? null : caches.delete(key);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  const request = event.request;
  if (request.method !== 'GET') return;

  // Wejście na stronę: najpierw sieć, żeby nowa wersja doszła od razu;
  // bez zasięgu wraca zapisana kopia.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(function () {
        return caches.match('./index.html');
      })
    );
    return;
  }

  // Reszta: podaj z pamięci od razu i odśwież ją w tle.
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
