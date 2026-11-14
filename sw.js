// ==========================================
// فایل sw.js — سرویس‌ورکر (نسخه جدید با version.js)
// این نسخه از version.js می‌خواند، نه از عدد hardcode شده
// ==========================================

// ✅ بارگذاری version.js برای خواندن نسخه از منبع واحد
importScripts('./version.js');

// ✅ نام کش به صورت خودکار از نسخه ساخته می‌شود
const CACHE_NAME = 'kosha-cache-' + (self.APP_VERSION || 'v1.0.0');

// ==========================================
// لیست فایل‌هایی که باید در کش ذخیره شوند
// ==========================================
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
    './version.js',           // ✅ جدید: منبع نسخه
    './version.json',         // ✅ جدید: اعلام نسخه روی سرور
    './updater.js'            // ✅ جدید: منطق به‌روزرسانی (بعداً ساخته می‌شود)
];

// ==========================================
// فایل‌هایی که اول از اینترنت گرفته می‌شوند
// (اگر اینترنت نبود، از کش می‌آیند)
// ==========================================
const NETWORK_FIRST_ASSETS = [
    './index.html',
    './app.js',
    './db.js',
    './class.js',
    './students.js',
    './lesson.js',
    './group.js',
    './session.js',
    './score.js',
    './reset.js',
    './exam.js',
    './game.js',
    './calendar.js',
    './calendar-data.js',
    './jalali-utils.js',
    './back-button.js',
    './styles.css',
    './updater.js',           // ✅ جدید
    './version.js',           // ✅ جدید: باید همیشه تازه باشد
    './version.json'          // ✅ جدید: باید همیشه تازه باشد
];

// ==========================================
// نصب: کش کردن فایل‌های اصلی
// ==========================================
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // ✅ از addAll استفاده نمی‌کنیم تا اگر یک فایل نبود،
            //    بقیه فایل‌ها هم خراب نشوند
            return Promise.all(
                ASSETS_TO_CACHE.map((url) => {
                    return cache.add(url).catch((err) => {
                        console.warn('⚠️ کش نشد:', url, err);
                    });
                })
            );
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

    // فقط درخواست‌های GET را مدیریت می‌کنیم
    if (event.request.method !== 'GET') return;

    // فقط درخواست‌های هم‌منبع (خود برنامه) را مدیریت می‌کنیم
    if (url.origin !== self.location.origin) {
        return;
    }

    // بررسی اینکه این فایل باید Network-First باشد یا Cache-First
    const isNetworkFirst = NETWORK_FIRST_ASSETS.some((asset) => {
        return url.pathname.endsWith(asset.replace('./', '').split('?')[0]);
    });

    if (isNetworkFirst) {
        // ✅ Network-First: اول اینترنت، بعد کش
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
                    // اگر اینترنت نبود، از کش بگیر
                    return caches.match(event.request);
                })
        );
    } else {
        // Cache-First: اول کش، بعد اینترنت
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
// پیام‌ها (برای به‌روزرسانی خودکار و مدیریت کش)
// ==========================================
self.addEventListener('message', (event) => {
    if (!event.data) return;

    // ✅ پیام skipWaiting: به‌روزرسانی فوری
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }

    // ✅ پیام clearCache: پاک کردن همه کش‌ها (برای دیباگ)
    if (event.data.action === 'clearCache') {
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

    // ✅ پیام getVersion: برگرداندن نسخه فعلی سرویس‌ورکر
    if (event.data.action === 'getVersion') {
        if (event.source) {
            event.source.postMessage({
                action: 'versionInfo',
                version: self.APP_VERSION || 'unknown'
            });
        }
    }
});

// ==========================================
// لاگ نسخه در کنسول (فقط برای دیباگ)
// ==========================================
console.log('🛠️ Service Worker فعال شد — کش: ' + CACHE_NAME);