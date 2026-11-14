// ==========================================
// فایل sw.js — نسخه نهایی (Static Cache)
// این نسخه هرگز به طور خودکار فایل‌ها را جایگزین نمی‌کند.
// آپدیت فقط زمانی رخ می‌دهد که updater.js کش را پاک کند.
// ==========================================

// بارگذاری version.js (فقط برای لاگ کردن در کنسول)
importScripts('./version.js');

// ✅ نام کش ثابت است تا با هر آپدیت نسخه، کش جدیدی ساخته نشود
const CACHE_NAME = 'kosha-cache-static'; 

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
    './calendar-data.js',
    './calendar.js',
    './jalali-utils.js',
    './back-button.js',
    './version.js',
    './updater.js'
];

// ==========================================
// نصب (Install)
// ==========================================
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.all(
                ASSETS_TO_CACHE.map((url) => {
                    // ✅ چک می‌کنیم اگر فایل از قبل در کش هست، دوباره دانلودش نکنیم!
                    return cache.match(url).then((cachedResponse) => {
                        if (cachedResponse) {
                            return; // فایل قبلاً کش شده است، کاری نکن
                        }
                        return cache.add(url).catch((err) => {
                            console.warn('⚠️ کش نشد:', url, err);
                        });
                    });
                })
            );
        })
    );
    // ❌ هیچ skipWaiting() در اینجا نیست تا نسخه جدید خودسرانه فعال نشود
});

// ==========================================
// فعال‌سازی (Activate)
// ==========================================
self.addEventListener('activate', (event) => {
    // ✅ ما کش‌ها را اینجا پاک نمی‌کنیم. فقط وقتی updater.js بگوید پاک می‌شوند.
    event.waitUntil(self.clients.claim());
});

// ==========================================
// مدیریت درخواست‌ها (Fetch) — استراتژی Cache-First
// ==========================================
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (event.request.method !== 'GET') return;
    if (url.origin !== self.location.origin) return;

    // ✅ فایل version.json را هرگز کش نمی‌کنیم تا همیشه از سرور تازه خوانده شود
    if (url.pathname.endsWith('version.json')) {
        return; 
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse; // همیشه اول از کش می‌خواند
            }
            return fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
                return new Response('', { status: 503, statusText: 'Offline' });
            });
        })
    );
});

// ==========================================
// پیام‌ها
// ==========================================
self.addEventListener('message', (event) => {
    if (!event.data) return;

    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }

    if (event.data.action === 'clearCache') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            })
        );
    }
});