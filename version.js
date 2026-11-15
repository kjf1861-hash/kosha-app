// ==========================================
// فایل version.js — منبع واحد نسخه برنامه
// این فایل تنها جایی است که عدد نسخه به صورت دستی تغییر می‌کند.
// سایر فایل‌ها (index.html ، sw.js ، db.js ، updater.js) باید از این فایل بخوانند.
// ==========================================

(function() {
    'use strict';

    // ==========================================
    // 📌 اطلاعات نسخه — تنها این سه خط را برای نسخه جدید تغییر دهید
    // ==========================================
    const APP_VERSION = 'v1.1.1';
    const APP_RELEASE_DATE = '۱۴۰۵/۰۸/۲۴';
    const APP_RELEASE_NOTES = '🔧 رفع باگ: دکمه بازگشت گوشی حالا مودال تقویم ویرایش تاریخ جلسه را می‌بندد';

    // ==========================================
    // 🧩 در دسترس قرار دادن برای همه فایل‌ها
    // ==========================================
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