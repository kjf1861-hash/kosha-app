// ==========================================
// فایل reset.js — منطق بازنشانی و پاکسازی داده‌ها
// نسخه v2 (اصلاح‌شده)
// ==========================================
//
// تغییرات نسخه v2:
// - resetYearlyRecords: بعد از پاک کردن، تقویم جلسات و امتیازها هم ریست می‌شوند
// - resetFactoryAll: فقط کلیدهای لازم پاک می‌شوند (kosha-theme و kosha-version حفظ)
// - پاک کردن شمارنده examResultCounter برای جلوگیری از ناسازگاری
// ==========================================

async function resetYearlyRecords() {
    const currentYear = window.activeAcademicYear || '1405-1406';
    
    const isConfirmed = confirm(
        '⚠️ هشدار بسیار مهم:\n\n' +
        'شما در حال پاک کردن سوابق سال تحصیلی «' + toPersianNumber(currentYear) + '» هستید.\n\n' +
        'با این کار:\n' +
        '❌ تمام سوابق ارزشیابی این سال پاک می‌شوند.\n' +
        '❌ تمام جلسات و حضور و غیاب‌های این سال پاک می‌شوند.\n' +
        '❌ تمام تشویق‌های این سال پاک می‌شوند.\n\n' +
        'اما موارد زیر حفظ می‌شوند:\n' +
        '✅ مشخصات کلاس\n' +
        '✅ لیست دانش‌آموزان\n' +
        '✅ لیست دروس و گروه‌ها\n\n' +
        'آیا مطمئن هستید؟'
    );
    
    if (!isConfirmed) return;

    const doubleConfirm = confirm(
        '🚨 آخرین هشدار!\n\n' +
        'این عمل غیرقابل بازگشت است. آیا ۱۰۰٪ مطمئن هستید؟\n\n' +
        '(پیشنهاد: قبل از ادامه، از تنظیمات یک نسخه پشتیبان دستی بگیرید.)'
    );
    
    if (!doubleConfirm) return;

    try {
        // ۱. حذف سوابق ارزشیابی سال تحصیلی جاری
        const allRecords = await getAllData('records');
        const currentYearRecords = allRecords.filter(r => r.academicYear === currentYear);
        for (const rec of currentYearRecords) {
            await deleteData('records', rec.id);
        }
        
        // ۲. حذف جلسات سال تحصیلی جاری
        const allSessions = await getAllData('sessions');
        const currentYearSessions = allSessions.filter(s => s.academicYear === currentYear);
        for (const sess of currentYearSessions) {
            await deleteData('sessions', sess.id);
        }
        
        // ۳. حذف حضور و غیاب‌های مربوط به این جلسات
        const allAttendance = await getAllData('attendance');
        const currentYearSessionIds = currentYearSessions.map(s => s.id);
        const currentYearAttendance = allAttendance.filter(a => currentYearSessionIds.includes(a.sessionId));
        for (const att of currentYearAttendance) {
            await deleteData('attendance', att.id);
        }
        
        // ۴. حذف تشویق‌های سال تحصیلی جاری
        const allBadges = await getAllData('badgesSettings');
        const currentYearBadges = allBadges.filter(b => b.academicYear === currentYear);
        for (const badge of currentYearBadges) {
            await deleteData('badgesSettings', badge.id);
        }
        
        // ۵. پاک کردن وضعیت تقویم‌ها تا به حالت اولیه برگردند
        localStorage.removeItem('kosha-session-cal');
        localStorage.removeItem('kosha-score-cal-record');
        localStorage.removeItem('kosha-score-cal-quran');
        localStorage.removeItem('kosha-score-cal-special');
        localStorage.removeItem('kosha-score-cal-handwriting');
        
        // ✅ ریست متغیرهای درون‌حافظه‌ای جلسات
        if (typeof selectedSessionDate !== 'undefined') {
            try { selectedSessionDate = ""; selectedSessionDayOfWeek = ""; } catch (e) {}
        }
        if (typeof currentCalendarYear !== 'undefined' && typeof window.activeAcademicYear !== 'undefined') {
            try {
                const [startYearStr] = (window.activeAcademicYear || '1405-1406').split('-');
                currentCalendarYear = parseInt(startYearStr);
                currentCalendarMonth = 7;
            } catch (e) {}
        }
        
        showToast(
            `سوابق سال تحصیلی ${toPersianNumber(currentYear)} پاک شد. ` +
            `(دانش‌آموزان، دروس و مشخصات کلاس حفظ شدند.)`, 
            'success'
        );
        
        // ۶. رفرش کامل داده‌ها
        await loadAllData();
        
        // ۷. اطمینان از رفرش تقویم جلسات و امتیازها
        if (typeof renderSessionData === 'function') {
            try { renderSessionData(); } catch (e) { console.warn(e); }
        }
        if (typeof renderScoreData === 'function') {
            try { renderScoreData(); } catch (e) { console.warn(e); }
        }
    } catch (e) {
        console.error(e);
        showToast('خطا در پاک کردن سوابق! لطفاً از پشتیبان خود بازیابی کنید.', 'error');
    }
}

async function resetGroupAssignments() {
    const hasAssignedStudents = window.allStudentsData.some(st => st.groupId !== null);
    
    if (!hasAssignedStudents) {
        showToast('هیچ دانش‌آموزی در گروه‌ها وجود ندارد که خارج شود.', 'error');
        return;
    }

    const isConfirmed = confirm('آیا از خارج کردن تمام دانش‌آموزان از گروه‌ها مطمئن هستید؟ (گروه‌ها و دانش‌آموزان حذف نمی‌شوند)');
    if (!isConfirmed) return;

    try {
        const allStudents = await getAllData('students');
        for (const student of allStudents) {
            if (student.groupId) {
                student.groupId = null;
                await saveData('students', student);
            }
        }
        showToast('تمام دانش‌آموزان از گروه‌ها خارج شدند.', 'success');
        loadAllData();
    } catch (e) {
        console.error(e);
        showToast('خطا در پاک کردن گروه‌بندی!', 'error');
    }
}

async function resetSpecificRecords() {
    const select = document.getElementById('resetRecordSelect');
    if (!select) return;
    const selectedValue = select.value;
    if (!selectedValue) {
        showToast('لطفاً یک مورد را از لیست انتخاب کنید.', 'error');
        return;
    }

    const type = selectedValue.split('_')[0]; 
    const target = selectedValue.substring(type.length + 1); 

    const confirmMsg = type === 'subject' 
        ? 'آیا از حذف تمام سوابق ارزشیابی این درس مطمئن هستید؟'
        : 'آیا از حذف تمام سوابق این فعالیت/تشویق در کل دروس مطمئن هستید؟';

    if (!confirm(confirmMsg)) return;

    try {
        const currentYear = window.activeAcademicYear || '1405-1406';
        const allRecords = await getAllData('records');
        let recordsToDelete = [];
        
        if (type === 'subject') {
            recordsToDelete = allRecords.filter(r => r.subjectId === parseInt(target) && r.academicYear === currentYear);
        } else if (type === 'item') {
            recordsToDelete = allRecords.filter(r => r.itemName === target && r.academicYear === currentYear);
        }
        
        for (const rec of recordsToDelete) {
            await deleteData('records', rec.id);
        }
        
        showToast('سوابق مورد نظر با موفقیت حذف شدند.', 'success');
        loadAllData();
    } catch (e) {
        console.error(e);
        showToast('خطا در حذف سوابق!', 'error');
    }
}

// ==========================================
// ✅ resetFactoryAll — اصلاح‌شده
// ==========================================
// باگ قبلی: localStorage.clear() باعث پاک شدن kosha-version می‌شد و
// بعد از factory reset، Kill Switch دوباره اجرا می‌شد و یک رفرش اضافه می‌خورد.
// راه‌حل: فقط کلیدهای داده‌ای پاک می‌شوند، kosha-theme و kosha-version حفظ می‌شوند.
// ==========================================
async function resetFactoryAll() {
    const confirm1 = confirm('⚠️ خطر! آیا می‌خواهید کل اطلاعات برنامه (کلاس، دانش‌آموزان، دروس، سوابق و...) را برای همیشه پاک کنید؟');
    if (!confirm1) return;

    const confirm2 = confirm('🚨 آخرین هشدار!\n\nاین عمل غیرقابل بازگشت است. آیا واقعاً مطمئن هستید؟');
    if (!confirm2) return;

    try {
        const stores = [
            'classProfile', 'students', 'groups', 'subjects', 'records', 
            'badgesSettings', 'sessions', 'attendance', 'assessmentItems', 
            'weeklySchedule', 'exams', 'examResults', 'backupSettings'
        ];
        for (const store of stores) {
            await clearStore(store);
        }
        
        // ✅ پاک کردن فقط کلیدهای داده‌ای، نه تنظیمات ظاهری و نسخه
        const keepKeys = ['kosha-theme', 'kosha-version'];
        const allKeysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && !keepKeys.includes(key)) {
                allKeysToRemove.push(key);
            }
        }
        allKeysToRemove.forEach(k => localStorage.removeItem(k));
        
        // ✅ حذف کش‌ها (تا داده‌های stale بارگذاری نشوند)
        try {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (const name of cacheNames) {
                    await caches.delete(name);
                }
            }
        } catch (e) { console.warn('خطا در پاک کردن کش:', e); }
        
        showToast('برنامه با موفقیت بازنشانی شد. در حال راه‌اندازی مجدد...', 'info');
        setTimeout(() => window.location.reload(), 2000);
    } catch (e) {
        console.error(e);
        showToast('خطا در بازنشانی کامل!', 'error');
    }
}

async function resetTechnicalCache() {
    const isConfirmed = confirm('این عملیات فقط حافظه پنهان (کش) برنامه را پاک می‌کند تا آخرین تغییرات بارگذاری شوند. اطلاعات درسی شما دست‌نخورده می‌ماند. ادامه می‌دهید؟');
    if (!isConfirmed) return;

    try {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
            await caches.delete(name);
        }
        
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
            await registration.unregister();
        }

        showToast('کش پاک شد. در حال بارگذاری مجدد...', 'success');
        setTimeout(() => window.location.reload(true), 1500);
    } catch (e) {
        console.error(e);
        showToast('خطا در پاکسازی کش!', 'error');
    }
}

function populateResetSelect() {
    const select = document.getElementById('resetRecordSelect');
    if (!select) return;
    
    let html = '<option value="" disabled selected>انتخاب کنید...</option>';
    
    if (window.allSubjectsData && window.allSubjectsData.length > 0) {
        html += '<optgroup label="📚 دروس (حذف تمام سوابق درس)">';
        window.allSubjectsData.forEach(s => {
            html += `<option value="subject_${s.id}">📚 ${s.symbol || ''} ${s.name}</option>`;
        });
        html += '</optgroup>';
    }
    
    html += '<optgroup label="🎯 روش‌های کسب امتیاز و تشویق‌ها">';
    
    if (window.allAssessmentItems) {
        window.allAssessmentItems.forEach(i => {
            html += `<option value="item_${i.title}">🎯 ${i.title}</option>`;
        });
    }
    
    html += `<option value="item_پویش حفظ جزء سی قرآن کریم">🌟 پویش حفظ جزء سی قرآن کریم</option>`;
    html += `<option value="item_تشویق ویژه">🎁 تشویق ویژه</option>`;
    html += `<option value="item_تشویق خوش‌خط‌نویسی">✍️ تشویق خوش‌خط‌نویسی</option>`;
    
    html += '</optgroup>';
    
    select.innerHTML = html;
}