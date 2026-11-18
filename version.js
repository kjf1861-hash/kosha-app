// ==========================================
// فایل version.js — منبع واحد نسخه برنامه
// ==========================================

(function() {
    'use strict';

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

    // ==========================================
    // 📌 اطلاعات پیش‌فرض نسخه
    // ==========================================
    let APP_VERSION = 'v1.3.2';
    let APP_RELEASE_DATE = '۱۴۰۵/۰۸/۲۷'; 
    let APP_RELEASE_NOTES = '🎯 نسخه تکمیل پایداری و بهبود تجربه کاربری\n\n✅ رفع ۱۰ باگ اولویت بالا (مجموع ۱۹ باگ از نسخه ۱.۳.۰)\n✅ بهینه‌سازی سرعت رندر (فقط تب فعال بارگذاری می‌شود)\n✅ بهبود مدیریت گروه‌ها (ظرفیت‌سنجی هوشمند)\n✅ سیستم تعطیلات هوشمند (پشتیبانی از سال‌های آینده)\n✅ جلوگیری از حملات Direction Spoofing در ورودی‌ها\n✅ همگام‌سازی هوشمند نسخه در سیستم آپدیت\n\n⚠️ توصیه: قبل از به‌روزرسانی، یک نسخه پشتیبان تهیه کنید.';

    // ==========================================
    // ✅ همگام‌سازی هوشمند با localStorage
    // ==========================================
    try {
        const syncedVersion = localStorage.getItem('kosha-synced-version');
        if (syncedVersion && compareVersions(syncedVersion, APP_VERSION) > 0) {
            APP_VERSION = syncedVersion;
        }
        
        const syncedDate = localStorage.getItem('kosha-synced-date');
        if (syncedDate) APP_RELEASE_DATE = syncedDate;
        
        const syncedNotes = localStorage.getItem('kosha-synced-notes');
        if (syncedNotes) APP_RELEASE_NOTES = syncedNotes;
    } catch (e) { 
        console.warn('خطا در همگام‌سازی نسخه از localStorage:', e); 
    }

    const versionInfo = {
        version: APP_VERSION,
        releaseDate: APP_RELEASE_DATE,
        releaseNotes: APP_RELEASE_NOTES
    };

    if (typeof window !== 'undefined') {
        window.APP_VERSION = APP_VERSION;
        window.APP_RELEASE_DATE = APP_RELEASE_DATE;
        window.APP_RELEASE_NOTES = APP_RELEASE_NOTES;
        window.APP_VERSION_INFO = versionInfo;
    }

    if (typeof self !== 'undefined') {
        self.APP_VERSION = APP_VERSION;
        self.APP_RELEASE_DATE = APP_RELEASE_DATE;
        self.APP_RELEASE_NOTES = APP_RELEASE_NOTES;
        self.APP_VERSION_INFO = versionInfo;
    }

    console.log('📦 Kosha Version: ' + APP_VERSION + ' (' + APP_RELEASE_DATE + ')');
})();