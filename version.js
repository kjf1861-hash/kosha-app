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
    const APP_VERSION = 'v1.3.1';
    const APP_RELEASE_DATE = '۱۴۰۵/۰۸/۲۶'; // تاریخ امروز را اینجا بگذارید
    const APP_RELEASE_NOTES = '🛡️ نسخه بهبود پایداری و رفع باگ‌های اولویت بالا\n\n✅ جلوگیری از خالی شدن ناخواسته دیتابیس در صورت انتخاب فایل بکاپ نامعتبر\n✅ رفع مشکل آپدیت نشدن نسخه در سرویس‌ورکر (جلوگیری از کش شدن version.js قدیمی)\n✅ بهبود فرآیند دریافت آپدیت‌ها\n\n⚠️ توصیه: قبل از به‌روزرسانی، یک نسخه پشتیبان تهیه کنید.';

    // ==========================================
    // 🧩 در دسترس قرار دادن برای همه فایل‌ها
    // ==========================================
    const versionInfo = {
        version: APP_VERSION,
        releaseDate: APP_RELEASE_DATE,
        releaseNotes: APP_RELEASE_NOTES
    };

    // برای دنیای صفحه (Window)
    if (typeof window !== 'undefined') {
        window.APP_VERSION = APP_VERSION;
        window.APP_RELEASE_DATE = APP_RELEASE_DATE;
        window.APP_RELEASE_NOTES = APP_RELEASE_NOTES;
        window.APP_VERSION_INFO = versionInfo;
    }

    // برای دنیای سرویس‌ورکر (Service Worker)
    if (typeof self !== 'undefined') {
        self.APP_VERSION = APP_VERSION;
        self.APP_RELEASE_DATE = APP_RELEASE_DATE;
        self.APP_RELEASE_NOTES = APP_RELEASE_NOTES;
        self.APP_VERSION_INFO = versionInfo;
    }

    // لاگ برای دیباگ (فقط در کنسول، برای کاربر عادی دیده نمی‌شود)
    console.log('📦 Kosha Version: ' + APP_VERSION + ' (' + APP_RELEASE_DATE + ')');
})();