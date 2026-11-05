const CACHE_NAME = 'kosha-cache-v3'; // نسخه را بالا بردم تا کش قدیمی پاک شود
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './db.js',
    './manifest.json',
    './icon.svg'
];

// 1. نصب و کش کردن اولیه فایل‌ها
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('کش کردن فایل‌های اصلی...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    // فعال‌سازی فوری نسخه جدید
    self.skipWaiting();
});

// 2. فعال‌سازی و پاک کردن کش‌های قدیمی
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('پاک کردن کش قدیمی:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// 3. مدیریت درخواست‌ها (حالت Network-First)
// این حالت اول از شبکه درخواست می‌کند، اگر نبود از کش می‌خواند (برای آفلاین)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // اگر پاسخ از شبکه آمد، آن را در کش ذخیره کن و برگردان
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            })
            .catch(() => {
                // اگر آفلاین بود، از کش بخوان
                return caches.match(event.request);
            })
    );
});

// 4. گوش دادن به پیام‌ها (برای دکمه آپدیت)
self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});