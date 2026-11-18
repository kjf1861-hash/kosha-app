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
    const APP_VERSION = 'v1.3.0';
    const APP_RELEASE_DATE = '۱۴۰۵/۰۸/۲۷'; // تاریخ امروز را اینجا بگذارید
    const APP_RELEASE_NOTES = '🛡️ نسخه ارتقای امنیت داده‌ها و پایداری\n\n✅ رفع ۹ باگ بحرانی برای جلوگیری از هرگونه احتمال از دست رفتن اطلاعات:\n🔹 جلوگیری از حذف داده‌ها در بازیابی بکاپ و حذف دانش‌آموز\n🔹 اصلاح بازسازی تشویق‌های قرآن\n🔹 فعال‌سازی به‌روزرسانی اجباری\n🔹 رفع صفحه سفید در زمان لود اولیه\n🔹 همگام‌سازی فوری نام دانش‌آموزان\n🔹 افزایش پایداری ذخیره حضور و غیاب\n\n⚠️ توصیه: قبل از به‌روزرسانی، یک نسخه پشتیبان تهیه کنید.';

    // ==========================================
    // 🧩 در دسترس قرار دادن برای همه فایل‌ها
    // ==========================================
    // - window.APP_VERSION → برای فایل‌های دنیای صفحه (index.html، db.js، updater.js)
    // - self.APP_VERSION   → برای فایل‌های دنیای سرویس‌ورکر (sw.js)

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