// ==========================================
// فایل jalali-utils.js — توابع مشترک تقویم شمسی
// این فایل باید قبل از سایر فایل‌های تقویم لود شود
// (calendar.js, session.js, score.js, exam.js)
// ==========================================

(function() {
    'use strict';

    // ==========================================
    // سال‌های کبیسه در بازه پشتیبانی‌شده (۱۴۰۵ تا ۱۴۱۶)
    // ==========================================
    window.JALALI_LEAP_YEARS = [1408, 1412, 1416];

    // ==========================================
    // بررسی کبیسه بودن سال شمسی
    // ==========================================
    window.isJalaliLeapYear = function(year) {
        return window.JALALI_LEAP_YEARS.includes(year);
    };

    // ==========================================
    // دریافت تعداد روزهای یک ماه شمسی
    // ۶ ماه اول: ۳۱ روز
    // ۶ ماه دوم: ۳۰ روز
    // اسفند: ۲۹ روز (کبیسه: ۳۰ روز)
    // ==========================================
    window.getJalaliDaysInMonth = function(year, month) {
        if (month <= 6) return 31;
        if (month <= 11) return 30;
        return window.isJalaliLeapYear(year) ? 30 : 29;
    };

    // ==========================================
    // دریافت روز اول هفته برای یک ماه شمسی
    // خروجی: عددی بین ۰ (شنبه) تا ۶ (جمعه)
    // مبدأ محاسبه: ۱ فروردین ۱۴۰۵
    // ==========================================
    window.getJalaliFirstDayOfWeek = function(year, month) {
        let daysPassed = 0;
        for (let y = 1405; y < year; y++) {
            daysPassed += window.isJalaliLeapYear(y) ? 366 : 365;
        }
        for (let m = 1; m < month; m++) {
            daysPassed += window.getJalaliDaysInMonth(year, m);
        }
        return daysPassed % 7;
    };

})();