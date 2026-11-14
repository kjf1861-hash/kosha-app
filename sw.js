// ==========================================
// فایل sw.js — نسخه نهایی (ترکیب هوشمند Network-First و Cache-First)
// ==========================================

importScripts('./version.js');

const CACHE_NAME = 'kosha-cache-static'; 

const ASSETS_TO_CACHE = [
    './', './index.html', './styles.css', './app.js', './db.js', './manifest.json', './icon.svg',
    './class.js', './students.js', './lesson.js', './group.js', './session.js', './score.js',
    './reset.js', './exam.js', './game.js', './calendar-data.js', './calendar.js',
    './jalali-utils.js', './back-button.js', './version.js', './updater.js'
];

// ✅ لیست فایل‌هایی که باید همیشه از اینترنت (سرور) خونده بشن تا ظاهر برنامه آپدیت بشه
const NETWORK_FIRST_PATHS = ['/index.html', '/updater.js', '/version.json'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.all(
                ASSETS_TO_CACHE.map((url) => {
                    return cache.match(url).then((cachedResponse) => {
                        if (cachedResponse) return; 
                        return cache.add(url).catch((err) => console.warn('⚠️ کش نشد:', url, err));
                    });
                })
            );
        })
    );
    self.skipWaiting(); // ✅ فعالسازی فوری سرویس‌ورکر جدید
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (event.request.method !== 'GET') return;
    if (url.origin !== self.location.origin) return;

    // تشخیص اینکه آیا این فایل باید از اینترنت خونده بشه یا از کش
    const isNetworkFirst = NETWORK_FIRST_PATHS.some(path => url.pathname.endsWith(path)) || url.pathname === '/';

    if (isNetworkFirst) {
        // ✅ فایل‌های ظاهری: اول اینترنت، بعد کش (آفلاین)
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request).then(cached => {
                    if (cached) return cached;
                    if (event.request.mode === 'navigate') return caches.match('./index.html');
                }))
        );
    } else {
        // ✅ فایل‌های اصلی (کدها): اول کش، بعد اینترنت (تا آپدیت خودسرانه نشود)
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                });
            }).catch(() => new Response('', { status: 503 }))
        );
    }
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});