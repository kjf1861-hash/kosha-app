const CACHE_NAME = 'kosha-cache-v12';
const ASSETS_TO_CACHE = [
    './', './index.html', './styles.css', './app.js', './db.js', './manifest.json', './icon.svg'
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(caches.keys().then((names) => Promise.all(names.map((n) => { if (n !== CACHE_NAME) return caches.delete(n); }))));
    return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request).then((r) => caches.open(CACHE_NAME).then((c) => { c.put(event.request, r.clone()); return r; })).catch(() => caches.match(event.request)));
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') self.skipWaiting();
});