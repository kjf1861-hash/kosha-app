// ==========================================
// فایل updater.js — سیستم به‌روزرسانی هوشمند
// این فایل مسئول چک کردن نسخه جدید، اعلان به کاربر، و اجرای آپدیت است.
// ==========================================

(function() {
    'use strict';

    // ==========================================
    // 📌 تنظیمات و متغیرها
    // ==========================================
    
    // کلیدهای localStorage
    const STORAGE_KEYS = {
        updateMode: 'kosha-update-mode',       // حالت به‌روزرسانی (auto/notify/manual)
        lastCheck: 'kosha-last-update-check',   // زمان آخرین بررسی (timestamp)
        lastSnooze: 'kosha-last-snooze',        // زمان «بعداً»
        dismissedVersion: 'kosha-dismissed-version' // نسخه‌ای که کاربر «بعداً» زد
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
    
    /**
     * خواندن حالت فعلی به‌روزرسانی از localStorage
     * مقادیر ممکن: 'auto' | 'notify' | 'manual'
     * پیش‌فرض: 'notify'
     */
    function getUpdateMode() {
        try {
            const mode = localStorage.getItem(STORAGE_KEYS.updateMode);
            if (mode && ['auto', 'notify', 'manual'].includes(mode)) {
                return mode;
            }
        } catch (e) {
            console.warn('خطا در خواندن حالت به‌روزرسانی:', e);
        }
        return 'notify'; // پیش‌فرض
    }
    
    /**
     * ذخیره حالت جدید به‌روزرسانی
     */
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
    
    /**
     * به‌روزرسانی رادیو باتن‌های حالت به‌روزرسانی در تنظیمات
     */
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
    
    /**
     * نمایش وضعیت «آخرین بررسی» به صورت خوانا
     */
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
        
        // تبدیل به فارسی
        const persianText = text.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
        display.innerHTML = '⏱️ آخرین بررسی: ' + persianText;
    }
    
    // ==========================================
    // 📌 مقایسه نسخه‌ها (Semantic Versioning)
    // ==========================================
    
    /**
     * مقایسه دو نسخه با استاندارد Semantic Versioning
     * ورودی: 'v1.0.0' یا '1.0.0'
     * خروجی:
     *   -1 اگر a < b
     *    0 اگر a == b
     *    1 اگر a > b
     */
    function compareVersions(a, b) {
        // حذف حرف v از ابتدا (اگر باشد)
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
    
    let isChecking = false;  // جلوگیری از چک همزمان
    
    /**
     * تابع اصلی چک کردن نسخه جدید
     * @param {boolean} silent - اگر true باشد، خطاها را نمایش نمی‌دهد
     * @param {boolean} isManual - اگر true باشد، از دکمه دستی صدا زده شده
     */
    async function checkForUpdates(silent = false, isManual = false) {
        if (isChecking) {
            if (!silent) {
                console.log('⏳ بررسی در حال انجام است...');
            }
            return;
        }
        
        // اگر حالت "manual" است و از دکمه دستی صدا زده نشده، کاری نکن
        const mode = getUpdateMode();
        if (mode === 'manual' && !isManual) {
            console.log('✋ حالت دستی فعال است. بررسی خودکار انجام نمی‌شود.');
            return;
        }
        
        // بررسی اینترنت
        if (!navigator.onLine) {
            if (!silent) {
                showToastSafe('اینترنت متصل نیست. بررسی به‌روزرسانی ممکن نیست.', 'error');
            }
            return;
        }
        
        isChecking = true;
        
        // غیرفعال کردن دکمه بررسی در حالت دستی
        if (isManual) {
            const btn = document.getElementById('checkUpdateBtn');
            if (btn) {
                btn.disabled = true;
                btn.textContent = '⏳ در حال بررسی...';
            }
        }
        
        try {
            // استفاده از cache: 'no-store' برای جلوگیری از کش شدن version.json
            const response = await fetch('./version.json?t=' + Date.now(), {
                cache: 'no-store'
            });
            
            if (!response.ok) {
                throw new Error('پاسخ سرور: ' + response.status);
            }
            
            const serverInfo = await response.json();
            
            if (!serverInfo || !serverInfo.version) {
                throw new Error('فرمت version.json نامعتبر است');
            }
            
            setLastCheckTime();
            updateLastCheckDisplay();
            
            const currentVersion = getCurrentVersion();
            const serverVersion = serverInfo.version;
            
            console.log('🔍 نسخه فعلی:', currentVersion, '| نسخه سرور:', serverVersion);
            
            const comparison = compareVersions(serverVersion, currentVersion);
            
            if (comparison > 0) {
                // نسخه سرور جدیدتر است
                console.log('🎉 نسخه جدید پیدا شد:', serverVersion);
                
                // بررسی "بعداً زدن" قبلی
                const dismissedVersion = localStorage.getItem(STORAGE_KEYS.dismissedVersion);
                const lastSnooze = parseInt(localStorage.getItem(STORAGE_KEYS.lastSnooze) || '0');
                const snoozeElapsed = Date.now() - lastSnooze;
                
                // اگر کاربر همین نسخه را «بعداً» زده و ۶ ساعت نگذشته، اعلان نده
                if (dismissedVersion === serverVersion && snoozeElapsed < SNOOZE_DURATION) {
                    console.log('⏰ کاربر این نسخه را قبلاً «بعداً» زده. صبر می‌کنیم.');
                    if (isManual) {
                        showToastSafe('نسخه جدید موجود است، ولی قبلاً «بعداً» را زده‌اید.', 'info');
                    }
                    return;
                }
                
                // نمایش اعلان
                showUpdateNotification(serverInfo);
                
            } else if (comparison === 0) {
                // نسخه‌ها مساوی هستند
                console.log('✅ برنامه به‌روز است.');
                if (isManual) {
                    showToastSafe('برنامه به‌روز است! نسخه ' + currentVersion, 'success');
                }
            } else {
                // نسخه فعلی جدیدتر است (احتمالاً حالت توسعه)
                console.log('🔧 نسخه فعلی از سرور جدیدتر است.');
                if (isManual) {
                    showToastSafe('نسخه فعلی جدیدتر از سرور است.', 'info');
                }
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
    
    /**
     * نمایش اعلان به‌روزرسانی بر اساس حالت کاربر
     */
    function showUpdateNotification(versionInfo) {
        const mode = getUpdateMode();
        
        if (mode === 'auto') {
            // حالت خودکار: فقط اگر کاربر در حال کار نیست، مستقیم آپدیت کن
            if (!window.isFormDirty) {
                console.log('🔄 حالت خودکار: به‌روزرسانی بدون اعلان...');
                performUpdate();
            } else {
                console.log('⏳ کاربر در حال کار است. صبر تا تمام شدن...');
                showUpdateToast(versionInfo);
            }
        } else {
            // حالت اعلان یا دستی: مودال نمایش بده
            if (typeof window.openUpdateModal === 'function') {
                window.openUpdateModal(versionInfo);
            } else {
                // اگر مودال نبود، از toast استفاده کن
                showUpdateToast(versionInfo);
            }
        }
    }
    
    /**
     * نمایش نوار اعلان (fallback)
     */
    function showUpdateToast(versionInfo) {
        // حذف نوار قبلی اگر بود
        const existing = document.getElementById('update-toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.id = 'update-toast';
        toast.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            z-index: 4000;
            font-family: inherit;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            gap: 12px;
            max-width: 90vw;
            direction: rtl;
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
    
    /**
     * نمایش toast به صورت ایمن (اگر showToast در app.js نبود، از alert استفاده کن)
     */
    function showToastSafe(message, type) {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            console.log('[' + type + '] ' + message);
        }
    }

// ⏸️ پایان بخش ۱ — منتظر پیام «ادامه» شما هستم تا بخش ۲ را بفرستم.
    // ==========================================
    // 📌 اجرای آپدیت
    // ==========================================
    
    /**
     * اجرای آپدیت: پاک کردن کش و رفرش صفحه
     */
    async function performUpdate() {
        console.log('🔄 شروع به‌روزرسانی...');
        
        try {
            // ۱. علامت‌گذاری که آپدیت در حال انجام است
            if (typeof showToastSafe === 'function') {
                showToastSafe('در حال به‌روزرسانی... لطفاً صبر کنید.', 'info');
            }
            
            // ۲. پاک کردن وضعیت "دور زدن" تا نسخه جدید واقعاً نصب شود
            localStorage.removeItem(STORAGE_KEYS.dismissedVersion);
            localStorage.removeItem(STORAGE_KEYS.lastSnooze);
            
            // ۳. پاک کردن همه cacheها
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
                console.log('🗑️ ' + cacheNames.length + ' کش پاک شد.');
            }
            
            // ۴. Unregister کردن همه سرویس‌ورکرها
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
                console.log('🗑️ ' + registrations.length + ' سرویس‌ورکر حذف شد.');
            }
            
            // ۵. پاک کردن localStorage نسخه (تا Kill Switch یک بار دیگر اجرا شود)
            localStorage.removeItem('kosha-version');
            
            // ۶. بارگذاری مجدد صفحه
            console.log('🔁 در حال بارگذاری مجدد...');
            setTimeout(() => {
                window.location.reload(true);
            }, 800);
            
        } catch (error) {
            console.error('خطا در آپدیت:', error);
            if (typeof showToastSafe === 'function') {
                showToastSafe('خطا در به‌روزرسانی. لطفاً صفحه را دستی رفرش کنید.', 'error');
            }
            // در هر صورت صفحه را رفرش کن
            setTimeout(() => {
                window.location.reload(true);
            }, 1500);
        }
    }
    
    /**
     * «بعداً» زدن اعلان: ۶ ساعت صبر می‌کند
     */
    function snoozeUpdateNotification() {
        try {
            // ذخیره زمان snooze
            localStorage.setItem(STORAGE_KEYS.lastSnooze, Date.now().toString());
            
            // ذخیره نسخه‌ای که کاربر «بعداً» زد
            // (تا ۶ ساعت آینده اعلان همین نسخه نمایش داده نشود)
            const currentVersion = getCurrentVersion();
            // از version.json آخرین نسخه را می‌خوانیم (اگر موجود بود)
            fetch('./version.json?t=' + Date.now(), { cache: 'no-store' })
                .then(r => r.json())
                .then(data => {
                    if (data && data.version) {
                        localStorage.setItem(STORAGE_KEYS.dismissedVersion, data.version);
                    }
                })
                .catch(() => {
                    // اگر خطا داد، فقط زمان snooze را نگه می‌داریم
                });
            
            console.log('⏰ به‌روزرسانی ۶ ساعت به تعویق افتاد.');
            
            if (typeof showToastSafe === 'function') {
                showToastSafe('یادآوری بعدی: ۶ ساعت دیگر', 'info');
            }
            
        } catch (e) {
            console.error('خطا در snooze:', e);
        }
    }
    
    /**
     * بررسی دستی (از دکمه در تنظیمات)
     */
    function checkForUpdatesManually() {
        // اگر «بعداً» زده بودیم، این بار حتماً چک کن
        localStorage.removeItem(STORAGE_KEYS.lastSnooze);
        localStorage.removeItem(STORAGE_KEYS.dismissedVersion);
        
        checkForUpdates(false, true);
    }
    
    // ==========================================
    // 📌 شروع چک خودکار دوره‌ای
    // ==========================================
    
    let autoCheckIntervalId = null;
    let focusCheckTimeoutId = null;
    
    /**
     * شروع چک خودکار
     */
    function startAutoCheck() {
        // ۱. بررسی اولیه بعد از ۵ ثانیه (تا برنامه کاملاً بالا بیاید)
        setTimeout(() => {
            shouldCheckNow().then(shouldCheck => {
                if (shouldCheck) {
                    checkForUpdates(true); // silent
                }
            });
        }, 5000);
        
        // ۲. بررسی دوره‌ای هر ۲۴ ساعت (با setInterval)
        // (برای اطمینان، هر ۱ ساعت چک می‌کنیم که آیا ۲۴ ساعت گذشته یا نه)
        if (autoCheckIntervalId) {
            clearInterval(autoCheckIntervalId);
        }
        autoCheckIntervalId = setInterval(() => {
            shouldCheckNow().then(shouldCheck => {
                if (shouldCheck) {
                    checkForUpdates(true); // silent
                }
            });
        }, 60 * 60 * 1000); // هر ۱ ساعت چک می‌کنیم، ولی فقط هر ۲۴ ساعت واقعاً درخواست می‌فرستیم
        
        // ۳. بررسی وقتی کاربر به برنامه برمی‌گردد (focus)
        window.addEventListener('focus', () => {
            if (focusCheckTimeoutId) {
                clearTimeout(focusCheckTimeoutId);
            }
            // صبر ۱۰ ثانیه (تا اگر کاربر سریع چیزی را بست، درخواست نفرستد)
            focusCheckTimeoutId = setTimeout(() => {
                shouldCheckNow().then(shouldCheck => {
                    if (shouldCheck) {
                        checkForUpdates(true);
                    }
                });
            }, 10000);
        });
        
        // ۴. بررسی وقتی برنامه از sleep بیدار می‌شود
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                shouldCheckNow().then(shouldCheck => {
                    if (shouldCheck) {
                        checkForUpdates(true);
                    }
                });
            }
        });
        
        console.log('✅ سیستم چک خودکار به‌روزرسانی راه‌اندازی شد (هر ۲۴ ساعت).');
    }
    
    /**
     * بررسی اینکه آیا الان باید چک کنیم یا نه
     */
    async function shouldCheckNow() {
        // اگر حالت manual است، نه
        const mode = getUpdateMode();
        if (mode === 'manual') return false;
        
        // اگر آنلاین نیستیم، نه
        if (!navigator.onLine) return false;
        
        // اگر ۲۴ ساعت از آخرین بررسی نگذشته، نه
        const lastCheck = getLastCheckTime();
        const elapsed = Date.now() - lastCheck;
        
        if (elapsed < CHECK_INTERVAL) {
            return false;
        }
        
        return true;
    }
    
    // ==========================================
    // 📌 راه‌اندازی و Event Listeners
    // ==========================================
    
    /**
     * راه‌اندازی رادیو باتن‌های حالت به‌روزرسانی
     */
    function setupUpdateModeListeners() {
        document.querySelectorAll('input[name="updateMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    setUpdateMode(e.target.value);
                }
            });
        });
        
        // به‌روزرسانی اولیه UI
        updateUpdateModeUI();
    }
    
    /**
     * راه‌اندازی اولیه
     */
    function initUpdater() {
        // صبر کن تا DOM آماده شود
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initUpdater);
            return;
        }
        
        console.log('🚀 راه‌اندازی سیستم به‌روزرسانی...');
        console.log('   نسخه فعلی:', getCurrentVersion());
        console.log('   حالت به‌روزرسانی:', getUpdateMode());
        
        // ۱. راه‌اندازی رادیو باتن‌ها
        setupUpdateModeListeners();
        
        // ۲. به‌روزرسانی نمایش آخرین بررسی
        updateLastCheckDisplay();
        
        // ۳. شروع چک خودکار
        startAutoCheck();
        
        // ۴. بررسی event: کاربر آنلاین شد
        window.addEventListener('online', () => {
            console.log('🌐 کاربر آنلاین شد.');
            shouldCheckNow().then(shouldCheck => {
                if (shouldCheck) {
                    checkForUpdates(true);
                }
            });
        });
        
        // ۵. به‌روزرسانی زمان آخرین بررسی هر ۱ دقیقه
        setInterval(updateLastCheckDisplay, 60 * 1000);
    }
    
    // ==========================================
    // 📌 در دسترس قرار دادن توابع برای بقیه فایل‌ها
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
    
    // ==========================================
    // 📌 خودکار شروع کن
    // ==========================================
    
    initUpdater();
    
})();

// ✅ پایان فایل updater.js