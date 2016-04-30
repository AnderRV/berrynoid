importScripts('./js/serviceworker-cache-polyfill.js');

var CACHE_NAME = 'berrynoid-v2';
var urlsToCache = [
  '/berrynoid/',
  'css/ark.css',
  'js/berrynoid.js',
  'js/quo.js',
  'js/serviceworker-cache-polyfill.js',
  'favicon.ico',
  'icon.png',
  'block_0.png',
  'block_1.png',
  'block_2.png',
  'block_3.png'
];

self.addEventListener('install', function(event) {
    event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }

        return fetch(event.request);
      }
    )
  );
});