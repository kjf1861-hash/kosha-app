// ==========================================
// فایل sw.js — سرویس‌ورکر (نسخه v107)
// ==========================================

const CACHE_NAME = 'kosha-cache-v107';
const ASSETS_TO_CACHE = [
    './', './index.html', './styles.css', './app.js', './db.js', './manifest.json', './icon.svg',
    './class.js', './students.js', './lesson.js', './group.js', './session.js', './score.js',
    './reset.js', './exam.js', './game.js', './calendar-data.js', './calendar.js',
    './back-button.js', './sw-register.js'
];

const NETWORK_FIRST_ASSETS = [
    './index.html', './app.js', './exam.js', './game.js', './score.js',
    './session.js', './back-button.js', './styles.css', './sw-register.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET') return;
    if (url.origin !== self.location.origin) return;
    
    const isNetworkFirst = NETWORK_FIRST_ASSETS.some(asset => url.pathname.endsWith(asset.replace('./', '')));
    
    if (isNetworkFirst) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
    } else {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                return fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                });
            })
        );
    }
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});