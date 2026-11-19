// ==========================================
// فایل sw.js — نسخه نهایی (ترکیب هوشمند Network-First و Cache-First)
// ==========================================

// ✅ اصلاح: استفاده از ?t= برای دور زدن کش مرورگر و دریافت حتمی آخرین نسخه
importScripts('./version.js?t=' + Date.now());

// ✅ اصلاح امنیتی: نام کش از نسخه اپ خوانده می‌شود تا با هر bump، کش جدید ساخته شود
const APP_VERSION_SAFE = (self.APP_VERSION || 'v0.0.0').replace(/\./g, '-');
const CACHE_NAME = `kosha-cache-${APP_VERSION_SAFE}`; 

// ✅ لیست فایل‌های اصلی برای کش شدن
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
    './icon-192.png',  // ✅ آیکون جدید ۱۹۲
    './icon-512.png'   // ✅ آیکون جدید ۵۱۲
];

// ✅ اصلاح کش: اضافه کردن نسخه داینامیک به فایل‌های استاتیک (به جز فایل‌های حساس)
const ASSETS_TO_CACHE = RAW_ASSETS_TO_CACHE.map(url => {
    if (
        url === './' || 
        url === './index.html' || 
        url === './version.js' ||
        url === './icon-192.png' ||
        url === './icon-512.png'
    ) {
        return url; // این فایل‌ها نباید ?v= داشته باشند
    }
    return `${url}?v=${self.APP_VERSION || 'v0'}`; // بقیه فایل‌ها با نسخه جدید کش می‌شوند
});

// ✅ لیست فایل‌هایی که باید همیشه از اینترنت (سرور) خونده بشن تا ظاهر برنامه آپدیت بشه
// ✅ اضافه شدن manifest.json برای اعمال سریع تغییرات مانیفست
const NETWORK_FIRST_PATHS = ['/index.html', '/updater.js', '/version.json', '/version.js', '/manifest.json'];

// ✅ محاسبه مسیر ریشه برنامه به‌صورت داینامیک (پشتیبانی از ریشه و زیرمسیر)
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

// ✅ تابع کمکی برای ذخیره در کش با await کامل
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
    // ✅ self.skipWaiting() حذف شده تا سرویس‌ورکر جدید منتظر بماند
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

    // ✅ تشخیص اینکه آیا این فایل باید از اینترنت خونده بشه یا از کش
    const isNetworkFirst = NETWORK_FIRST_PATHS.some(path => url.pathname.endsWith(path)) 
        || url.pathname === APP_ROOT_PATH;

    if (isNetworkFirst) {
        // ✅ فایل‌های ظاهری: اول اینترنت (با timeout)، بعد کش (آفلاین)
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
        // ✅ فایل‌های اصلی (کدها و آیکون‌ها): اول کش، بعد اینترنت
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