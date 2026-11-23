// ==========================================
// فایل sw.js — نسخه نهایی (ترکیب هوشمند Network-First و Cache-First)
// ==========================================

// ✅ استفاده از ?t= برای دور زدن کش مرورگر و دریافت حتمی آخرین نسخه
importScripts('./version.js?t=' + Date.now());

// ✅ نام کش از نسخه اپ خوانده می‌شود تا با هر bump، کش جدید ساخته شود
const APP_VERSION_SAFE = (self.APP_VERSION || 'v0.0.0').replace(/\./g, '-');
const CACHE_NAME = `kosha-cache-${APP_VERSION_SAFE}`; 

// ✅ لیست فایل‌های اصلی برای کش شدن (آیکون‌ها به پوشه icons منتقل شدند)
const RAW_ASSETS_TO_CACHE = [
    './', 
    './index.html', 
    './styles.css', 
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
    './calendar-data.js', 
    './calendar.js',
    './jalali-utils.js', 
    './back-button.js', 
    './version.js', 
    './updater.js',
    // ✅ آیکون‌های جدید در پوشه icons
    './icons/icon-72.png',
    './icons/icon-96.png',
    './icons/icon-128.png',
    './icons/icon-144.png',
    './icons/icon-152.png',
    './icons/icon-192.png',
    './icons/icon-384.png',
    './icons/icon-512.png',
    './icons/icon-maskable-192.png',
    './icons/icon-maskable-512.png',
    './icons/apple-touch-icon.png',
    './icons/favicon-16x16.png',
    './icons/favicon-32x32.png'
];

// ✅ اضافه کردن نسخه داینامیک به فایل‌های استاتیک (به جز فایل‌های حساس و تصاویر)
const ASSETS_TO_CACHE = RAW_ASSETS_TO_CACHE.map(url => {
    if (
        url === './' || 
        url === './index.html' || 
        url === './version.js' ||
        url.endsWith('.png') ||
        url === './icon.svg'
    ) {
        return url; // این فایل‌ها نباید ?v= داشته باشند
    }
    return `${url}?v=${self.APP_VERSION || 'v0'}`; // بقیه فایل‌ها با نسخه جدید کش می‌شوند
});

// ✅ لیست فایل‌هایی که باید همیشه از اینترنت خونده بشن (شامل مانیفست)
const NETWORK_FIRST_PATHS = ['/index.html', '/updater.js', '/version.json', '/version.js', '/manifest.json'];

// ✅ محاسبه مسیر ریشه برنامه به‌صورت داینامیک
const APP_ROOT_PATH = new URL('./', self.location.href).pathname;

// ✅ timeout برای fetch (جلوگیری از انتظار بی‌پایان در صورت سرور کند)
const FETCH_TIMEOUT_MS = 3000;

function fetchWithTimeout(request, timeoutMs) {
    let timeoutId = null;
    
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Fetch timeout')), timeoutMs);
    });
    
    return Promise.race([fetch(request), timeoutPromise]).finally(() => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
    });
}

// ✅ تابع کمکی برای ذخیره در کش
async function putInCache(cacheName, request, response) {
    try {
        const cache = await caches.open(cacheName);
        await cache.put(request, response);
    } catch (err) {
        console.warn('⚠️ ذخیره در کش ناموفق:', request.url, err);
    }
}

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
});

// ✅ پاک کردن کش‌های قدیمی نسخه‌های قبل
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then((keys) => {
                return Promise.all(
                    keys
                        .filter(key => key !== CACHE_NAME)
                        .map(key => {
                            console.log('🧹 حذف کش قدیمی:', key);
                            return caches.delete(key);
                        })
                );
            })
        ])
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (event.request.method !== 'GET') return;
    if (url.origin !== self.location.origin) return;

    const isNetworkFirst = NETWORK_FIRST_PATHS.some(path => url.pathname.endsWith(path)) 
        || url.pathname === APP_ROOT_PATH;

    if (isNetworkFirst) {
        event.respondWith(
            fetchWithTimeout(event.request, FETCH_TIMEOUT_MS)
                .then(async (response) => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        await putInCache(CACHE_NAME, event.request, clone);
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request).then(cached => {
                        if (cached) return cached;
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                        return new Response('', { status: 503, statusText: 'Offline' });
                    });
                })
        );
    } else {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then(async (response) => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        await putInCache(CACHE_NAME, event.request, clone);
                    }
                    return response;
                });
            }).catch(() => new Response('', { status: 503, statusText: 'Offline' }))
        );
    }
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});