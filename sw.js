// ==========================================
// فایل sw.js — سرویس‌ورکر (نسخه جدید: Cache-First کامل)
// این نسخه از version.js می‌خواند و از آپدیت مخفیانه جلوگیری می‌کند.
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
    './version.js',
    './version.json',
    './updater.js'
];

// ==========================================
// نصب: کش کردن فایل‌های اصلی
// ==========================================
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // ✅ از Promise.all استفاده می‌کنیم تا اگر یک فایل مشکل داشت،
            // بقیه فایل‌ها کش شوند و کل نصب شکست نخورد.
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
// استراتژی هوشمند Fetch (تغییر یافته به Cache-First)
// ==========================================
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // فقط درخواست‌های GET را مدیریت می‌کنیم
    if (event.request.method !== 'GET') return;

    // فقط درخواست‌های هم‌منبع (خود برنامه) را مدیریت می‌کنیم
    if (url.origin !== self.location.origin) {
        return;
    }

    // ✅ استراتژی جدید: Cache-First برای تمام فایل‌های برنامه
    // این کار باعث می‌شود تا زمانی که کاربر دکمه "به‌روزرسانی" را نزند،
    // برنامه به نسخه قدیمی خود وفادار بماند و آپدیت مخفیانه انجام نشود.
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            // اگر در کش نبود، از اینترنت بگیر
            return fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // ✅ Fallback: اگر آفلاین بود و فایل در کش نبود (باگ کرش کردن حل شد)
                if (event.request.mode === 'navigate') {
                    // اگر کاربر در حال باز کردن صفحه اصلی بود، index.html کش شده را برگردان
                    return caches.match('./index.html');
                }
                // برای بقیه فایل‌ها یک پاسخ خالی برگردان تا برنامه کرش نکند
                return new Response('', { status: 503, statusText: 'Offline and not in cache' });
            });
        })
    );
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

    // ✅ پیام clearCache: پاک کردن همه کش‌ها (برای دیباگ یا آپدیت دستی)
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