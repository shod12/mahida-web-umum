'use strict';

const MAHIDA_CACHE = 'mahida-web-umum-shell-v1';
const MAHIDA_SHELL = [
  './',
  './index.html',
  './styles.css?v=7',
  './rudder.css?v=1',
  './script.js?v=10',
  './pwa.js?v=1',
  './manifest.webmanifest',
  './favicon.png',
  './assets/logo-pondok.png',
  './assets/logo-koperasi.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(MAHIDA_CACHE)
      .then(function (cache) {
        return cache.addAll(MAHIDA_SHELL);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key !== MAHIDA_CACHE && key.indexOf('mahida-web-umum-') === 0;
            })
            .map(function (key) {
              return caches.delete(key);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', function (event) {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  /* Never intercept Apps Script/Public Bridge/scanner or any other origin. */
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          const copy = response.clone();
          caches.open(MAHIDA_CACHE).then(function (cache) {
            cache.put('./index.html', copy);
          });
          return response;
        })
        .catch(function () {
          return caches.match('./index.html');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(function (cached) {
        const network = fetch(request)
          .then(function (response) {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(MAHIDA_CACHE).then(function (cache) {
                cache.put(request, copy);
              });
            }
            return response;
          })
          .catch(function () {
            return cached;
          });

        return cached || network;
      })
  );
});
