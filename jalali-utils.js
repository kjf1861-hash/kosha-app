// ==========================================
// فایل jalali-utils.js — توابع مشترک تقویم شمسی
// این فایل باید قبل از سایر فایل‌های تقویم لود شود
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
    // ==========================================
    window.getJalaliDaysInMonth = function(year, month) {
        if (month <= 6) return 31;
        if (month <= 11) return 30;
        return window.isJalaliLeapYear(year) ? 30 : 29;
    };

    // ==========================================
    // دریافت روز اول هفته برای یک ماه شمسی
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

    // ==========================================
    // بررسی معتبر بودن یک تاریخ شمسی (سال، ماه، روز)
    // ==========================================
    window.isValidJalaliDate = function(year, month, day) {
        if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
        if (year < 1300 || year > 1500) return false;
        if (month < 1 || month > 12) return false;
        if (day < 1) return false;
        const maxDays = window.getJalaliDaysInMonth(year, month);
        if (day > maxDays) return false;
        return true;
    };

    // ==========================================
    // بررسی معتبر بودن یک رشته تاریخ (مثلاً "1405/08/15")
    // ==========================================
    window.isValidJalaliDateString = function(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') return false;
        const match = dateStr.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
        if (!match) return false;
        return window.isValidJalaliDate(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
    };

})();