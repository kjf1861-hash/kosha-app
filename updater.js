// ==========================================
// فایل updater.js — منطق بررسی و اعمال به‌روزرسانی
// (نسخه اپ در version.js تعریف شده)
// ==========================================
(function() {
    'use strict';

    const STORAGE_KEYS = {
        updateMode: 'kosha-update-mode',
        lastCheck: 'kosha-last-update-check',
        lastSnooze: 'kosha-last-snooze',
        dismissedVersion: 'kosha-dismissed-version',
        skippedVersion: 'kosha-skipped-version'
    };
    
    const CHECK_INTERVAL = 24 * 60 * 60 * 1000;  
    const SNOOZE_DURATION = 6 * 60 * 60 * 1000;  
    
    function getCurrentVersion() {
        if (typeof window === 'undefined' || !window.APP_VERSION) {
            console.error('❌ APP_VERSION تعریف نشده — بررسی به‌روزرسانی لغو شد.');
            return null;
        }
        return window.APP_VERSION;
    }
    
    function getUpdateMode() {
        try {
            const mode = localStorage.getItem(STORAGE_KEYS.updateMode);
            if (mode && ['auto', 'notify', 'manual'].includes(mode)) return mode;
        } catch (e) {}
        return 'notify'; // پیش‌فرض: اعلان
    }
    
    function setUpdateMode(mode) {
        if (!['auto', 'notify', 'manual'].includes(mode)) return;
        try {
            localStorage.setItem(STORAGE_KEYS.updateMode, mode);
            updateUpdateModeUI();
        } catch (e) {}
    }
    
    function updateUpdateModeUI() {
        const currentMode = getUpdateMode();
        document.querySelectorAll('input[name="updateMode"]').forEach(radio => { radio.checked = (radio.value === currentMode); });
        document.querySelectorAll('.update-mode-option').forEach(option => { option.classList.toggle('selected', option.getAttribute('data-mode') === currentMode); });
    }
    
    function getLastCheckTime() {
        try { return parseInt(localStorage.getItem(STORAGE_KEYS.lastCheck) || '0'); } catch (e) { return 0; }
    }
    
    function setLastCheckTime() {
        try { localStorage.setItem(STORAGE_KEYS.lastCheck, Date.now().toString()); } catch (e) {}
    }
    
    function updateLastCheckDisplay() {
        const display = document.getElementById('lastCheckDisplay');
        if (!display) return;
        const lastCheck = getLastCheckTime();
        if (!lastCheck) { display.innerHTML = '⏱️ آخرین بررسی: هرگز'; return; }
        const diffMinutes = Math.floor((Date.now() - lastCheck) / (1000 * 60));
        let text = diffMinutes < 1 ? 'همین الان' : diffMinutes < 60 ? diffMinutes + ' دقیقه پیش' : diffMinutes < 1440 ? Math.floor(diffMinutes / 60) + ' ساعت پیش' : Math.floor(diffMinutes / 1440) + ' روز پیش';
        display.innerHTML = '⏱️ آخرین بررسی: ' + text.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
    }
    
    function compareVersions(a, b) {
        const partsA = String(a).replace(/^v/i, '').split('.').map(x => parseInt(x) || 0);
        const partsB = String(b).replace(/^v/i, '').split('.').map(x => parseInt(x) || 0);
        const maxLength = Math.max(partsA.length, partsB.length);
        for (let i = 0; i < maxLength; i++) {
            const numA = partsA[i] || 0;
            const numB = partsB[i] || 0;
            if (numA > numB) return 1;
            if (numA < numB) return -1;
        }
        return 0;
    }
    
    let isChecking = false;
    let currentServerVersion = null;
    let waitingWorker = null; // ✅ نگهداری سرویس‌ورکر در حالت انتظار

    // ✅ تابع اصلی مدیریت سرویس‌ورکر جدید (بر اساس ۳ حالت)
    function handleNewSW(worker) {
        waitingWorker = worker; // ذخیره برای استفاده در حالت دستی
        const mode = getUpdateMode();

        if (mode === 'auto' && !window.isFormDirty) {
            console.log('🚀 حالت خودکار: در حال نصب به‌روزرسانی...');
            performUpdate();
        } else if (mode === 'notify') {
            console.log('🔔 حالت اعلان: نمایش پیام به کاربر.');
            if (currentServerVersion) {
                showUpdateNotification({ version: currentServerVersion });
            } else {
                showUpdateToast({ version: 'جدید' });
            }
        } else {
            console.log('✋ حالت دستی: سرویس‌ورکر در انتظار می‌ماند تا کاربر دکمه بررسی را بزند.');
        }
    }
    
    // ✅ در دسترس قرار دادن برای app.js
    window.handleNewSW = handleNewSW;

    async function checkForUpdates(silent = false, isManual = false) {
        if (isChecking) return;
        const mode = getUpdateMode();
        if (mode === 'manual' && !isManual) return;
        if (!navigator.onLine) {
            if (!silent) showToastSafe('اینترنت متصل نیست.', 'error');
            return;
        }
        
        const currentVersion = getCurrentVersion();
        if (!currentVersion) {
            if (isManual) showToastSafe('خطا: نسخه برنامه قابل خواندن نیست.', 'error');
            return;
        }
        
        isChecking = true;
        if (isManual) {
            const btn = document.getElementById('checkUpdateBtn');
            if (btn) { btn.disabled = true; btn.textContent = '⏳ در حال بررسی...'; }
        }
        
        try {
            const response = await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' });
            if (!response.ok) throw new Error('خطای سرور');
            const serverInfo = await response.json();
            if (!serverInfo || !serverInfo.version) throw new Error('نسخه نامعتبر');
            
            setLastCheckTime();
            updateLastCheckDisplay();
            
            const serverVersion = serverInfo.version;
            currentServerVersion = serverVersion;
            
            const comparison = compareVersions(serverVersion, currentVersion);
            
            if (comparison > 0) {
                const skippedVersion = localStorage.getItem(STORAGE_KEYS.skippedVersion);
                if (skippedVersion === serverVersion) {
                    if (isManual) showToastSafe('شما این نسخه را قبلاً رد کرده‌اید.', 'info');
                    return;
                }
                const dismissedVersion = localStorage.getItem(STORAGE_KEYS.dismissedVersion);
                const lastSnooze = parseInt(localStorage.getItem(STORAGE_KEYS.lastSnooze) || '0');
                if (dismissedVersion === serverVersion && (Date.now() - lastSnooze < SNOOZE_DURATION)) {
                    if (isManual) showToastSafe('نسخه جدید موجود است، ولی قبلاً «بعداً» زده‌اید.', 'info');
                    return;
                }
                
                // اگر در حالت manual و کاربر دکمه را زده، و SW در انتظار است، آن را فعال کن
                if (isManual && waitingWorker) {
                    performUpdate();
                } else if (!waitingWorker) {
                    showUpdateNotification(serverInfo);
                }
            } else {
                // حتی اگر version.json جدید نبود، ممکن است SW جدید در پس‌زمینه نصب شده باشد
                if (isManual && waitingWorker) {
                    performUpdate();
                } else if (isManual) {
                    showToastSafe('برنامه به‌روز است! (نسخه ' + currentVersion + ')', 'success');
                }
            }
        } catch (error) {
            if (!silent && isManual) showToastSafe('خطا در بررسی به‌روزرسانی.', 'error');
        } finally {
            isChecking = false;
            if (isManual) {
                const btn = document.getElementById('checkUpdateBtn');
                if (btn) { btn.disabled = false; btn.textContent = '🔍 بررسی به‌روزرسانی'; }
            }
        }
    }
        function showUpdateNotification(versionInfo) {
        if (getUpdateMode() === 'auto' && !window.isFormDirty) {
            performUpdate();
        } else {
            if (typeof window.openUpdateModal === 'function') window.openUpdateModal(versionInfo);
            else showUpdateToast(versionInfo);
        }
    }
    
    function showUpdateToast(versionInfo) {
        const existing = document.getElementById('update-toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.id = 'update-toast';
        toast.style.cssText = `position: fixed; top: 10px; left: 50%; transform: translateX(-50%); background: #16a34a; color: white; padding: 12px 20px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.2); z-index: 4000; display: flex; gap: 12px; direction: rtl;`;
        toast.innerHTML = `<span>🚀 نسخه جدید ${versionInfo.version || ''} آماده است</span><button id="update-toast-btn" style="background: white; color: #16a34a; border: none; padding: 6px 12px; border-radius: 8px; font-weight: bold; cursor: pointer;">آپدیت</button>`;
        document.body.appendChild(toast);
        document.getElementById('update-toast-btn').addEventListener('click', () => { toast.remove(); performUpdate(); });
    }
    
    function showToastSafe(message, type) {
        if (typeof window.showToast === 'function') window.showToast(message, type);
    }

    // ==========================================
    // 📌 اجرای آپدیت (نیروی اتمی)
    // ==========================================
    async function performUpdate() {
        try {
            if (window.isFormDirty) {
                showToastSafe('⚠️ ابتدا فرم را ذخیره کنید. به‌روزرسانی به تعویق افتاد.', 'error');
                return;
            }
            
            showToastSafe('در حال به‌روزرسانی کامل... لطفاً صبر کنید.', 'info');
            
            localStorage.removeItem(STORAGE_KEYS.dismissedVersion);
            localStorage.removeItem(STORAGE_KEYS.lastSnooze);
            
            // ✅ پاک کردن تمام کش‌ها
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }
            
            // ✅ اگر سرویس‌ورکر در حالت انتظار داریم، به آن اجازه فعال شدن بدهیم
            if (waitingWorker) {
                waitingWorker.postMessage({ action: 'skipWaiting' });
            }
            
            // ✅ حذف سرویس‌ورکرهای قدیمی
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
            }
            
            setTimeout(() => {
                if (window.isFormDirty) {
                    showToastSafe('⚠️ به‌روزرسانی به تعویق افتاد. ابتدا فرم را ذخیره کنید.', 'error');
                    return;
                }
                const newUrl = window.location.origin + window.location.pathname + '?update=' + Date.now();
                window.location.replace(newUrl);
            }, 1000);
            
        } catch (error) {
            window.location.reload();
        }
    }
    
    function snoozeUpdateNotification() {
        try {
            localStorage.setItem(STORAGE_KEYS.lastSnooze, Date.now().toString());
            
            if (currentServerVersion) {
                localStorage.setItem(STORAGE_KEYS.dismissedVersion, currentServerVersion);
            } else {
                fetch('./version.json?t=' + Date.now(), { cache: 'no-store' })
                    .then(r => r.json())
                    .then(data => {
                        if (data && data.version) {
                            localStorage.setItem(STORAGE_KEYS.dismissedVersion, data.version);
                        }
                    })
                    .catch(() => {});
            }
            
            showToastSafe('یادآوری بعدی: ۶ ساعت دیگر', 'info');
        } catch (e) {}
    }
    
    function skipThisVersion() {
        try {
            if (currentServerVersion) {
                localStorage.setItem(STORAGE_KEYS.skippedVersion, currentServerVersion);
                localStorage.removeItem(STORAGE_KEYS.dismissedVersion);
                localStorage.removeItem(STORAGE_KEYS.lastSnooze);
                showToastSafe('نسخه جدید رد شد. تا نسخه بعدی پیامی نمایش داده نمی‌شود.', 'info');
            } else {
                fetch('./version.json?t=' + Date.now(), { cache: 'no-store' })
                    .then(r => r.json())
                    .then(data => {
                        if (data && data.version) {
                            localStorage.setItem(STORAGE_KEYS.skippedVersion, data.version);
                            localStorage.removeItem(STORAGE_KEYS.dismissedVersion);
                            localStorage.removeItem(STORAGE_KEYS.lastSnooze);
                            showToastSafe('نسخه جدید رد شد. تا نسخه بعدی پیامی نمایش داده نمی‌شود.', 'info');
                        }
                    })
                    .catch(() => {});
            }
        } catch (e) {}
    }
    
    function checkForUpdatesManually() {
        localStorage.removeItem(STORAGE_KEYS.lastSnooze);
        localStorage.removeItem(STORAGE_KEYS.dismissedVersion);
        checkForUpdates(false, true);
    }
    
    let autoCheckIntervalId = null;
    function startAutoCheck() {
        setTimeout(() => { shouldCheckNow().then(yes => { if (yes) checkForUpdates(true); }); }, 5000);
        if (autoCheckIntervalId) clearInterval(autoCheckIntervalId);
        autoCheckIntervalId = setInterval(() => { shouldCheckNow().then(yes => { if (yes) checkForUpdates(true); }); }, 60 * 60 * 1000);
    }
    
    async function shouldCheckNow() {
        if (getUpdateMode() === 'manual' || !navigator.onLine) return false;
        return (Date.now() - getLastCheckTime()) >= CHECK_INTERVAL;
    }
    
    function setupUpdateModeListeners() {
        document.querySelectorAll('input[name="updateMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => { if (e.target.checked) setUpdateMode(e.target.value); });
        });
        updateUpdateModeUI();
    }
    
    function cleanUpdateQueryFromUrl() {
        try {
            const url = new URL(window.location.href);
            if (url.searchParams.has('update')) {
                url.searchParams.delete('update');
                const cleanUrl = url.pathname + (url.search || '') + url.hash;
                window.history.replaceState({}, document.title, cleanUrl);
                console.log('🧹 پارامتر ?update از URL پاک شد.');
            }
        } catch (e) {
            console.warn('⚠️ خطا در پاکسازی URL:', e);
        }
    }
    
    function initUpdater() {
        if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initUpdater); return; }
        cleanUpdateQueryFromUrl();
        setupUpdateModeListeners();
        updateLastCheckDisplay();
        startAutoCheck();
        setInterval(updateLastCheckDisplay, 60000);
    }
    
    window.getUpdateMode = getUpdateMode;
    window.setUpdateMode = setUpdateMode;
    window.updateUpdateModeUI = updateUpdateModeUI;
    window.updateLastCheckDisplay = updateLastCheckDisplay;
    window.checkForUpdatesManually = checkForUpdatesManually;
    window.performUpdate = performUpdate;
    window.snoozeUpdateNotification = snoozeUpdateNotification;
    window.skipThisVersion = skipThisVersion;
    
    initUpdater();
})();