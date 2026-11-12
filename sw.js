// ==========================================
// فایل sw.js — نسخه v116
// ==========================================
//
// تغییرات نسخه v116:
// - NETWORK_ONLY_ASSETS اصلاح شد: فقط فایل‌های اصلی (index.html, app.js, db.js, sw.js)
//   از شبکه بارگذاری می‌شوند — بقیه از کش (برای آفلاین بهتر)
// - در حین توسعه، اگر می‌خواهید تغییرات را ببینید: APP_VERSION در index.html را تغییر دهید
// - اضافه شدن همه فایل‌های جدید به ASSETS_TO_CACHE
// ==========================================

const CACHE_NAME = 'kosha-cache-v116';

// فایل‌هایی که باید در نصب اولیه کش شوند
const ASSETS_TO_CACHE = [
    './', 
    './index.html', 
    './styles.css', 
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
    './back-button.js'
];

// ⚠️ فایل‌های حساس که باید همیشه از شبکه لود شوند (بدون کش)
// این فایل‌ها همان‌هایی هستند که بیشتر تغییر می‌کنند یا تأثیر بحرانی دارند
const NETWORK_ONLY_ASSETS = [
    './index.html',
    './app.js',
    './db.js',
    './sw.js'
];

// نصب: کش کردن فایل‌های اصلی
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.warn('⚠️ خطا در کش کردن برخی فایل‌ها:', err);
                // حداقل فایل‌های ضروری را کش کن
                return cache.addAll([
                    './index.html',
                    './styles.css',
                    './manifest.json'
                ]).catch(() => {});
            });
        }).then(() => {
            console.log('✅ سرویس‌ورکر جدید نصب شد (v116).');
            return self.skipWaiting();
        })
    );
});

// فعال‌سازی: پاک کردن کش‌های قدیمی
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
        }).then(() => {
            console.log('✅ سرویس‌ورکر فعال شد (v116).');
            return self.clients.claim();
        })
    );
});

// استراتژی هوشمند Fetch
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // فقط درخواست‌های GET را مدیریت کن
    if (event.request.method !== 'GET') return;
    // درخواست‌های خارجی (مثل گوگل فونت) را مدیریت نکن
    if (url.origin !== self.location.origin) return;
    
    // اگر فایل در لیست Network-Only است، همیشه از شبکه بگیر
    const isNetworkOnly = NETWORK_ONLY_ASSETS.some(asset => 
        url.pathname.endsWith(asset.replace('./', ''))
    );
    
    if (isNetworkOnly) {
        event.respondWith(
            fetch(event.request).catch(() => {
                // اگر شبکه قطع بود، از کش استفاده کن (برای اطمینان)
                return caches.match(event.request);
            })
        );
        return;
    }
    
    // برای بقیه فایل‌ها: اول از کش بگیر، اگر نبود از شبکه
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((response) => {
                // فقط پاسخ‌های موفق و از همان origin را کش کن
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    }).catch(err => console.warn('خطا در کش:', err));
                }
                return response;
            }).catch(err => {
                console.warn('خطا در fetch:', err);
                // اگر فایل HTML بود، صفحه اصلی را برگردان
                if (event.request.destination === 'document') {
                    return caches.match('./index.html');
                }
                throw err;
            });
        })
    );
});

// پیام‌ها
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