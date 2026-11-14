// ==========================================
// فایل updater.js — سیستم به‌روزرسانی هوشمند
// نسخه v1.0.2 — اصلاح باگ کش HTTP مرورگر
// ==========================================

(function() {
    'use strict';

    // ==========================================
    // 📌 تنظیمات و متغیرها
    // ==========================================
    
    // کلیدهای localStorage
    const STORAGE_KEYS = {
        updateMode: 'kosha-update-mode',
        lastCheck: 'kosha-last-update-check',
        lastSnooze: 'kosha-last-snooze',
        dismissedVersion: 'kosha-dismissed-version'
    };
    
    // زمان‌ها (میلی‌ثانیه)
    const CHECK_INTERVAL = 24 * 60 * 60 * 1000;  // ۲۴ ساعت
    const SNOOZE_DURATION = 6 * 60 * 60 * 1000;  // ۶ ساعت
    
    // نسخه فعلی (از version.js خوانده می‌شود)
    function getCurrentVersion() {
        return (typeof window !== 'undefined' && window.APP_VERSION) 
            ? window.APP_VERSION 
            : 'v1.0.0';
    }
    
    // ==========================================
    // 📌 مدیریت حالت به‌روزرسانی
    // ==========================================
    
    function getUpdateMode() {
        try {
            const mode = localStorage.getItem(STORAGE_KEYS.updateMode);
            if (mode && ['auto', 'notify', 'manual'].includes(mode)) {
                return mode;
            }
        } catch (e) {
            console.warn('خطا در خواندن حالت به‌روزرسانی:', e);
        }
        return 'notify';
    }
    
    function setUpdateMode(mode) {
        if (!['auto', 'notify', 'manual'].includes(mode)) {
            console.warn('حالت نامعتبر:', mode);
            return;
        }
        try {
            localStorage.setItem(STORAGE_KEYS.updateMode, mode);
            console.log('✅ حالت به‌روزرسانی ذخیره شد:', mode);
            updateUpdateModeUI();
        } catch (e) {
            console.error('خطا در ذخیره حالت به‌روزرسانی:', e);
        }
    }
    
    function updateUpdateModeUI() {
        const currentMode = getUpdateMode();
        
        document.querySelectorAll('input[name="updateMode"]').forEach(radio => {
            radio.checked = (radio.value === currentMode);
        });
        
        document.querySelectorAll('.update-mode-option').forEach(option => {
            const mode = option.getAttribute('data-mode');
            option.classList.toggle('selected', mode === currentMode);
        });
    }
    
    // ==========================================
    // 📌 مدیریت زمان آخرین بررسی
    // ==========================================
    
    function getLastCheckTime() {
        try {
            const time = localStorage.getItem(STORAGE_KEYS.lastCheck);
            return time ? parseInt(time) : 0;
        } catch (e) {
            return 0;
        }
    }
    
    function setLastCheckTime() {
        try {
            localStorage.setItem(STORAGE_KEYS.lastCheck, Date.now().toString());
        } catch (e) {
            console.warn('خطا در ذخیره زمان بررسی:', e);
        }
    }
    
    function updateLastCheckDisplay() {
        const display = document.getElementById('lastCheckDisplay');
        if (!display) return;
        
        const lastCheck = getLastCheckTime();
        
        if (!lastCheck) {
            display.innerHTML = '⏱️ آخرین بررسی: هرگز';
            return;
        }
        
        const diffMinutes = Math.floor((Date.now() - lastCheck) / (1000 * 60));
        
        let text = '';
        if (diffMinutes < 1) {
            text = 'همین الان';
        } else if (diffMinutes < 60) {
            text = diffMinutes + ' دقیقه پیش';
        } else if (diffMinutes < 24 * 60) {
            text = Math.floor(diffMinutes / 60) + ' ساعت پیش';
        } else {
            text = Math.floor(diffMinutes / (24 * 60)) + ' روز پیش';
        }
        
        const persianText = text.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
        display.innerHTML = '⏱️ آخرین بررسی: ' + persianText;
    }
    
    // ==========================================
    // 📌 مقایسه نسخه‌ها
    // ==========================================
    
    function compareVersions(a, b) {
        const cleanA = String(a).replace(/^v/i, '');
        const cleanB = String(b).replace(/^v/i, '');
        
        const partsA = cleanA.split('.').map(x => parseInt(x) || 0);
        const partsB = cleanB.split('.').map(x => parseInt(x) || 0);
        
        const maxLength = Math.max(partsA.length, partsB.length);
        
        for (let i = 0; i < maxLength; i++) {
            const numA = partsA[i] || 0;
            const numB = partsB[i] || 0;
            
            if (numA > numB) return 1;
            if (numA < numB) return -1;
        }
        
        return 0;
    }
    
    // ==========================================
    // 📌 چک کردن نسخه جدید
    // ==========================================
    
    let isChecking = false;
    
    async function checkForUpdates(silent = false, isManual = false) {
        if (isChecking) {
            if (!silent) console.log('⏳ بررسی در حال انجام است...');
            return;
        }
        
        const mode = getUpdateMode();
        if (mode === 'manual' && !isManual) {
            console.log('✋ حالت دستی فعال است. بررسی خودکار انجام نمی‌شود.');
            return;
        }
        
        if (!navigator.onLine) {
            if (!silent) {
                showToastSafe('اینترنت متصل نیست. بررسی به‌روزرسانی ممکن نیست.', 'error');
            }
            return;
        }
        
        isChecking = true;
        
        if (isManual) {
            const btn = document.getElementById('checkUpdateBtn');
            if (btn) {
                btn.disabled = true;
                btn.textContent = '⏳ در حال بررسی...';
            }
        }
        
        try {
            const response = await fetch('./version.json?t=' + Date.now(), {
                cache: 'no-store'
            });
            
            if (!response.ok) throw new Error('پاسخ سرور: ' + response.status);
            
            const serverInfo = await response.json();
            
            if (!serverInfo || !serverInfo.version) throw new Error('فرمت version.json نامعتبر است');
            
            setLastCheckTime();
            updateLastCheckDisplay();
            
            const currentVersion = getCurrentVersion();
            const serverVersion = serverInfo.version;
            
            console.log('🔍 نسخه فعلی:', currentVersion, '| نسخه سرور:', serverVersion);
            
            const comparison = compareVersions(serverVersion, currentVersion);
            
            if (comparison > 0) {
                console.log('🎉 نسخه جدید پیدا شد:', serverVersion);
                
                const dismissedVersion = localStorage.getItem(STORAGE_KEYS.dismissedVersion);
                const lastSnooze = parseInt(localStorage.getItem(STORAGE_KEYS.lastSnooze) || '0');
                const snoozeElapsed = Date.now() - lastSnooze;
                
                if (dismissedVersion === serverVersion && snoozeElapsed < SNOOZE_DURATION) {
                    console.log('⏰ کاربر این نسخه را قبلاً «بعداً» زده. صبر می‌کنیم.');
                    if (isManual) showToastSafe('نسخه جدید موجود است، ولی قبلاً «بعداً» را زده‌اید.', 'info');
                    return;
                }
                
                showUpdateNotification(serverInfo);
                
            } else if (comparison === 0) {
                console.log('✅ برنامه به‌روز است.');
                if (isManual) showToastSafe('برنامه به‌روز است! نسخه ' + currentVersion, 'success');
            } else {
                console.log('🔧 نسخه فعلی از سرور جدیدتر است.');
                if (isManual) showToastSafe('نسخه فعلی جدیدتر از سرور است.', 'info');
            }
            
        } catch (error) {
            console.error('خطا در بررسی به‌روزرسانی:', error);
            if (!silent && isManual) {
                showToastSafe('خطا در بررسی به‌روزرسانی. لطفاً اتصال اینترنت را بررسی کنید.', 'error');
            }
        } finally {
            isChecking = false;
            if (isManual) {
                const btn = document.getElementById('checkUpdateBtn');
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = '🔍 بررسی به‌روزرسانی';
                }
            }
        }
    }
    
    function showUpdateNotification(versionInfo) {
        const mode = getUpdateMode();
        
        if (mode === 'auto') {
            if (!window.isFormDirty) {
                console.log('🔄 حالت خودکار: به‌روزرسانی بدون اعلان...');
                performUpdate();
            } else {
                console.log('⏳ کاربر در حال کار است. صبر تا تمام شدن...');
                showUpdateToast(versionInfo);
            }
        } else {
            if (typeof window.openUpdateModal === 'function') {
                window.openUpdateModal(versionInfo);
            } else {
                showUpdateToast(versionInfo);
            }
        }
    }
    
    function showUpdateToast(versionInfo) {
        const existing = document.getElementById('update-toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.id = 'update-toast';
        toast.style.cssText = `
            position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
            background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
            color: white; padding: 12px 20px; border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2); z-index: 4000;
            font-family: inherit; font-size: 0.9rem; display: flex;
            align-items: center; gap: 12px; max-width: 90vw; direction: rtl;
        `;
        toast.innerHTML = `
            <span>🚀 نسخه جدید ${versionInfo.version} آماده است</span>
            <button id="update-toast-btn" style="background: white; color: #16a34a; border: none; padding: 6px 12px; border-radius: 8px; font-family: inherit; font-weight: bold; cursor: pointer;">آپدیت</button>
            <button id="update-toast-dismiss" style="background: transparent; color: white; border: none; font-size: 1.2rem; cursor: pointer; padding: 0 4px;">✖</button>
        `;
        document.body.appendChild(toast);
        
        document.getElementById('update-toast-btn').addEventListener('click', () => {
            toast.remove();
            performUpdate();
        });
        document.getElementById('update-toast-dismiss').addEventListener('click', () => {
            toast.remove();
            snoozeUpdateNotification();
        });
    }
    
    function showToastSafe(message, type) {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            console.log('[' + type + '] ' + message);
        }
    }

    // ==========================================
    // 📌 اجرای آپدیت
    // ==========================================
    
    async function performUpdate() {
        console.log('🔄 شروع به‌روزرسانی...');
        
        try {
            showToastSafe('در حال به‌روزرسانی... لطفاً صبر کنید.', 'info');
            
            localStorage.removeItem(STORAGE_KEYS.dismissedVersion);
            localStorage.removeItem(STORAGE_KEYS.lastSnooze);
            
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
                console.log('🗑️ ' + cacheNames.length + ' کش پاک شد.');
            }
            
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
                console.log('🗑️ ' + registrations.length + ' سرویس‌ورکر حذف شد.');
            }
            
            // ✅ پاک کردن localStorage نسخه
            localStorage.removeItem('kosha-version');
            
            // ✅ اصلاح باگ: اضافه کردن پارامتر تصادفی به URL برای دور زدن HTTP Cache مرورگر
            // به جای window.location.reload(true) که در موبایل گاهی کار نمی‌کند
            setTimeout(() => {
                console.log('🔁 در حال بارگذاری مجدد با دور زدن کش...');
                const timestamp = Date.now();
                const baseUrl = window.location.href.split('?')[0]; // حذف پارامترهای قبلی
                window.location.href = baseUrl + '?updated=' + timestamp;
            }, 800);
            
        } catch (error) {
            console.error('خطا در آپدیت:', error);
            showToastSafe('خطا در به‌روزرسانی. لطفاً صفحه را دستی رفرش کنید.', 'error');
            
            setTimeout(() => {
                const timestamp = Date.now();
                const baseUrl = window.location.href.split('?')[0];
                window.location.href = baseUrl + '?updated=' + timestamp;
            }, 1500);
        }
    }
    
    function snoozeUpdateNotification() {
        try {
            localStorage.setItem(STORAGE_KEYS.lastSnooze, Date.now().toString());
            
            fetch('./version.json?t=' + Date.now(), { cache: 'no-store' })
                .then(r => r.json())
                .then(data => {
                    if (data && data.version) {
                        localStorage.setItem(STORAGE_KEYS.dismissedVersion, data.version);
                    }
                })
                .catch(() => {});
            
            console.log('⏰ به‌روزرسانی ۶ ساعت به تعویق افتاد.');
            showToastSafe('یادآوری بعدی: ۶ ساعت دیگر', 'info');
            
        } catch (e) {
            console.error('خطا در snooze:', e);
        }
    }
    
    function checkForUpdatesManually() {
        localStorage.removeItem(STORAGE_KEYS.lastSnooze);
        localStorage.removeItem(STORAGE_KEYS.dismissedVersion);
        checkForUpdates(false, true);
    }
    
    // ==========================================
    // 📌 شروع چک خودکار
    // ==========================================
    
    let autoCheckIntervalId = null;
    let focusCheckTimeoutId = null;
    
    function startAutoCheck() {
        setTimeout(() => {
            shouldCheckNow().then(shouldCheck => {
                if (shouldCheck) checkForUpdates(true);
            });
        }, 5000);
        
        if (autoCheckIntervalId) clearInterval(autoCheckIntervalId);
        
        autoCheckIntervalId = setInterval(() => {
            shouldCheckNow().then(shouldCheck => {
                if (shouldCheck) checkForUpdates(true);
            });
        }, 60 * 60 * 1000);
        
        window.addEventListener('focus', () => {
            if (focusCheckTimeoutId) clearTimeout(focusCheckTimeoutId);
            focusCheckTimeoutId = setTimeout(() => {
                shouldCheckNow().then(shouldCheck => {
                    if (shouldCheck) checkForUpdates(true);
                });
            }, 10000);
        });
        
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                shouldCheckNow().then(shouldCheck => {
                    if (shouldCheck) checkForUpdates(true);
                });
            }
        });
        
        console.log('✅ سیستم چک خودکار به‌روزرسانی راه‌اندازی شد (هر ۲۴ ساعت).');
    }
    
    async function shouldCheckNow() {
        const mode = getUpdateMode();
        if (mode === 'manual') return false;
        if (!navigator.onLine) return false;
        
        const lastCheck = getLastCheckTime();
        const elapsed = Date.now() - lastCheck;
        
        if (elapsed < CHECK_INTERVAL) return false;
        
        return true;
    }
    
    // ==========================================
    // 📌 راه‌اندازی
    // ==========================================
    
    function setupUpdateModeListeners() {
        document.querySelectorAll('input[name="updateMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    setUpdateMode(e.target.value);
                }
            });
        });
        updateUpdateModeUI();
    }
    
    function initUpdater() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initUpdater);
            return;
        }
        
        console.log('🚀 راه‌اندازی سیستم به‌روزرسانی...');
        console.log('   نسخه فعلی:', getCurrentVersion());
        console.log('   حالت به‌روزرسانی:', getUpdateMode());
        
        setupUpdateModeListeners();
        updateLastCheckDisplay();
        startAutoCheck();
        
        window.addEventListener('online', () => {
            console.log('🌐 کاربر آنلاین شد.');
            shouldCheckNow().then(shouldCheck => {
                if (shouldCheck) checkForUpdates(true);
            });
        });
        
        setInterval(updateLastCheckDisplay, 60 * 1000);
    }
    
    // ==========================================
    // 📌 دسترسی از بیرون
    // ==========================================
    
    window.getUpdateMode = getUpdateMode;
    window.setUpdateMode = setUpdateMode;
    window.updateUpdateModeUI = updateUpdateModeUI;
    window.updateLastCheckDisplay = updateLastCheckDisplay;
    window.compareVersions = compareVersions;
    window.checkForUpdates = checkForUpdates;
    window.checkForUpdatesManually = checkForUpdatesManually;
    window.performUpdate = performUpdate;
    window.snoozeUpdateNotification = snoozeUpdateNotification;
    window.startAutoCheck = startAutoCheck;
    window.getCurrentVersion = getCurrentVersion;
    
    initUpdater();
    
})();

// ✅ پایان فایل updater.js