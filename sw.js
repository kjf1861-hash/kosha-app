// ==========================================
// فایل sw.js — سرویس‌ورکر بهینه‌شده (نسخه v133 - بازگشت به JS)
// ==========================================

const CACHE_NAME = 'kosha-cache-v133';
const ASSETS_TO_CACHE = [
    './', 
    './index.html', 
    './styles.css', 
    './app.js', 
    './db.js', 
    './manifest.json', 
    './icon.svg', 
    './class.js', 
    './students.js', 
    './lesson.js', 
    './group.js', 
    './session.js', 
    './score.js', 
    './reset.js',
    './exam.js',
    './game.js',
    './calendar-data.js', // ✅ بازگشت به فایل JS
    './calendar.js',
    './jalali-utils.js',
    './back-button.js'
];

const NETWORK_FIRST_ASSETS = [
    './index.html',
    './app.js',
    './exam.js',
    './game.js',
    './score.js',
    './session.js',
    './calendar.js',
    './calendar-data.js', // ✅ بازگشت به فایل JS
    './jalali-utils.js',
    './back-button.js',
    './styles.css'
];

// ==========================================
// نصب: کش کردن فایل‌های اصلی
// ==========================================
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
    );
});

// ==========================================
// فعال‌سازی: پاک کردن کش‌های قدیمی
// ==========================================
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ پاک کردن کش قدیمی:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// ==========================================
// استراتژی هوشمند Fetch
// ==========================================
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    if (event.request.method !== 'GET') return;
    
    if (url.origin !== self.location.origin) {
        return;
    }
    
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
                .catch(() => {
                    return caches.match(event.request);
                })
        );
    } else {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
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

// ==========================================
// پیام‌ها (برای به‌روزرسانی خودکار)
// ==========================================
self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
    if (event.data && event.data.action === 'clearCache') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            }).then(() => {
                if (event.source) {
                    event.source.postMessage({ action: 'cacheCleared' });
                }
            })
        );
    }
});