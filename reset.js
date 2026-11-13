// ==========================================
// فایل reset.js — منطق بازنشانی و پاکسازی داده‌ها
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
        // ==========================================
        // ✅ تغییر اصلی: پاک کردن فقط رکوردهای مربوط به سال تحصیلی جاری
        // (نه کل جدول، تا در آینده که چند ساله شد، به سال‌های دیگر آسیب نزند)
        // ==========================================
        
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
        
        // پاک کردن وضعیت تقویم‌ها تا به حالت اولیه برگردند
        localStorage.removeItem('kosha-session-cal');
        localStorage.removeItem('kosha-score-cal-record');
        localStorage.removeItem('kosha-score-cal-quran');
        localStorage.removeItem('kosha-score-cal-special');
        localStorage.removeItem('kosha-score-cal-handwriting');
        
        showToast(
            `سوابق سال تحصیلی ${toPersianNumber(currentYear)} پاک شد. ` +
            `(دانش‌آموزان، دروس و مشخصات کلاس حفظ شدند.)`, 
            'success'
        );
        
        loadAllData();
    } catch (e) {
        console.error(e);
        showToast('خطا در پاک کردن سوابق! لطفاً از پشتیبان خود بازیابی کنید.', 'error');
    }
}

async function resetGroupAssignments() {
    const currentYear = window.activeAcademicYear || '1405-1406';
    
    // بررسی اینکه آیا اصلاً دانش‌آموزی در سال جاری گروه‌بندی شده است؟
    const hasAssignedStudents = window.allStudentsData.some(
        st => st.groupId !== null && st.groupId !== undefined
    );
    
    if (!hasAssignedStudents) {
        showToast('هیچ دانش‌آموزی در گروه‌ها (سال تحصیلی جاری) وجود ندارد.', 'error');
        return;
    }

    // ✅ پیام تأیید شفاف‌تر
    const confirmMessage = 
        `⚠️ هشدار:\n\n` +
        `شما در حال خارج کردن تمام دانش‌آموزان از گروه‌ها هستید.\n\n` +
        `📌 توجه مهم:\n` +
        `• این عملیات فقط برای سال تحصیلی «${toPersianNumber(currentYear)}» اعمال می‌شود.\n` +
        `• گروه‌بندی سال‌های دیگر دست‌نخورده باقی می‌ماند.\n` +
        `• گروه‌ها و دانش‌آموزان حذف نمی‌شوند (فقط گروه‌بندی پاک می‌شود).\n\n` +
        `آیا مطمئن هستید؟`;
    
    const isConfirmed = confirm(confirmMessage);
    if (!isConfirmed) return;

    try {
        const allStudents = await getAllData('students');
        let unassignedCount = 0;
        
        for (const student of allStudents) {
            // ✅ فقط دانش‌آموزان سال جاری (یا بدون سال برای سازگاری با نسخه قدیمی)
            const belongsToCurrentYear = 
                !student.academicYear || student.academicYear === currentYear;
            
            if (student.groupId && belongsToCurrentYear) {
                student.groupId = null;
                await saveData('students', student);
                unassignedCount++;
            }
        }
        
        if (unassignedCount > 0) {
            showToast(
                `${toPersianNumber(unassignedCount)} دانش‌آموز از گروه‌ها خارج شدند. (سال تحصیلی ${toPersianNumber(currentYear)})`, 
                'success'
            );
        } else {
            showToast('هیچ دانش‌آموزی در سال تحصیلی جاری گروه‌بندی نشده بود.', 'info');
        }
        
        loadAllData();
    } catch (e) {
        console.error(e);
        showToast('خطا در پاک کردن گروه‌بندی!', 'error');
    }
}

async function resetSpecificRecords() {
    const selectedValue = document.getElementById('resetRecordSelect').value;
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

async function resetFactoryAll() {
    const confirm1 = confirm('⚠️ خطر! آیا می‌خواهید کل اطلاعات برنامه (کلاس، دانش‌آموزان، دروس، سوابق و...) را برای همیشه پاک کنید؟');
    if (!confirm1) return;

    const confirm2 = confirm('🚨 آخرین هشدار!\n\nاین عمل غیرقابل بازگشت است. آیا واقعاً مطمئن هستید؟');
    if (!confirm2) return;

    try {
        const stores = ['classProfile', 'students', 'groups', 'subjects', 'records', 'badgesSettings', 'sessions', 'attendance', 'assessmentItems', 'weeklySchedule', 'exams', 'examResults', 'backupSettings'];
        for (const store of stores) {
            await clearStore(store);
        }
        
        // پاک کردن تمام حافظه محلی
        localStorage.clear();
        
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