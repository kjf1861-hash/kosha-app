// نسخه کش را با هر بار آپدیت تغییر دهید (مثلاً به v2, v3, ...)
const CACHE_NAME = 'kosha-cache-v2'; 
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

// 3. مدیریت درخواست‌ها (آفلاین بودن)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // اگر در کش بود، همان را برگردان، وگرنه از شبکه بگیر
            return response || fetch(event.request);
        })
    );
});

// 4. گوش دادن به پیام‌ها (برای دکمه آپدیت)
self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});