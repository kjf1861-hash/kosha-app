// ==========================================
// فایل sw-register.js — مدیریت Service Worker و آپدیت
// ==========================================
(function() {
    'use strict';
    
    let pendingWorker = null;
    let refreshing = false;
    
    function showUpdateBanner() {
        const banner = document.getElementById('update-banner');
        if (!banner) return;
        if (banner.classList.contains('show')) return;
        banner.classList.add('show');
    }
    
    window.dismissUpdateBanner = function() {
        const banner = document.getElementById('update-banner');
        if (banner) banner.classList.remove('show');
    };
    
    window.applyUpdate = function() {
        if (pendingWorker) {
            try {
                pendingWorker.postMessage({ action: 'skipWaiting' });
            } catch (e) {
                console.warn('postMessage failed:', e);
                window.location.reload();
            }
        } else if (navigator.serviceWorker.controller) {
            window.location.reload();
        }
    };
    
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            try {
                navigator.serviceWorker.register('./sw.js').then((reg) => {
                    // اگر از قبل worker در انتظار است
                    if (reg.waiting) {
                        pendingWorker = reg.waiting;
                        showUpdateBanner();
                    }
                    
                    // رویداد آپدیت جدید
                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        if (!newWorker) return;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                pendingWorker = newWorker;
                                showUpdateBanner();
                            }
                        });
                    });
                }).catch((e) => {
                    console.warn('Service Worker registration failed:', e);
                });
                
                // اگر controller عوض شد → reload
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (refreshing) return;
                    refreshing = true;
                    window.location.reload();
                });
            } catch (e) {
                console.warn('SW setup failed:', e);
            }
        });
    }
})();