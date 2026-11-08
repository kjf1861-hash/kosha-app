// ==========================================
// فایل reset.js — منطق بازنشانی و پاکسازی داده‌ها
// ==========================================

// ۱. شروع سال تحصیلی جدید (پاک کردن سوابق)
async function resetYearlyRecords() {
    const isConfirmed = confirm('⚠️ هشدار مهم:\n\nبا این کار تمام سوابق ارزشیابی، حضور و غیاب‌ها، جلسات و تشویق‌ها پاک می‌شوند.\nاما اطلاعات کلاس، دانش‌آموزان، دروس و گروه‌ها حفظ می‌شوند.\n\nآیا مطمئن هستید؟');
    
    if (!isConfirmed) return;

    try {
        await clearStore('records');
        await clearStore('attendance');
        await clearStore('sessions');
        await clearStore('badgesSettings');
        
        showToast('سوابق با موفقیت پاک شد. سال تحصیلی جدید آغاز شد!', 'success');
        loadAllData();
    } catch (e) {
        console.error(e);
        showToast('خطا در پاک کردن سوابق!', 'error');
    }
}

// ۲. پاک کردن گروه‌بندی دانش‌آموزان
async function resetGroupAssignments() {
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

// ۳. حذف سوابق یک درس خاص
async function resetSpecificSubjectRecords() {
    const subjectId = document.getElementById('resetSubjectSelect').value;
    if (!subjectId) {
        showToast('لطفاً یک درس را انتخاب کنید.', 'error');
        return;
    }

    const isConfirmed = confirm('آیا از حذف تمام سوابق ارزشیابی این درس مطمئن هستید؟');
    if (!isConfirmed) return;

    try {
        const allRecords = await getAllData('records');
        const recordsToDelete = allRecords.filter(r => r.subjectId === parseInt(subjectId));
        
        for (const rec of recordsToDelete) {
            await deleteData('records', rec.id);
        }
        
        showToast('سوابق درس مورد نظر با موفقیت حذف شد.', 'success');
        loadAllData();
    } catch (e) {
        console.error(e);
        showToast('خطا در حذف سوابق درس!', 'error');
    }
}

// ۴. بازنشانی کامل (تنظیمات کارخانه)
async function resetFactoryAll() {
    // هشدار اول
    const confirm1 = confirm('⚠️ خطر! آیا می‌خواهید کل اطلاعات برنامه (کلاس، دانش‌آموزان، دروس، سوابق و...) را برای همیشه پاک کنید؟');
    if (!confirm1) return;

    // هشدار دوم (امنیت بیشتر)
    const confirm2 = confirm('🚨 آخرین هشدار!\n\nاین عمل غیرقابل بازگشت است. آیا واقعاً مطمئن هستید؟');
    if (!confirm2) return;

    try {
        const stores = ['classProfile', 'students', 'groups', 'subjects', 'records', 'badgesSettings', 'sessions', 'attendance', 'assessmentItems', 'weeklySchedule'];
        for (const store of stores) {
            await clearStore(store);
        }
        
        // پاک کردن تنظیمات محلی
        localStorage.clear();
        
        showToast('برنامه با موفقیت بازنشانی شد. در حال راه‌اندازی مجدد...', 'info');
        setTimeout(() => window.location.reload(), 2000);
    } catch (e) {
        console.error(e);
        showToast('خطا در بازنشانی کامل!', 'error');
    }
}

// ۵. پاکسازی فنی (کش و آپدیت)
async function resetTechnicalCache() {
    const isConfirmed = confirm('این عملیات فقط حافظه پنهان (کش) برنامه را پاک می‌کند تا آخرین تغییرات بارگذاری شوند. اطلاعات درسی شما دست‌نخورده می‌ماند. ادامه می‌دهید؟');
    if (!isConfirmed) return;

    try {
        // پاک کردن کش‌ها
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
            await caches.delete(name);
        }
        
        // لغو ثبت Service Worker
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

// پر کردن منوی کشویی دروس برای بخش حذف سوابق
function populateResetSubjectSelect() {
    const select = document.getElementById('resetSubjectSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="" disabled selected>انتخاب درس...</option>' + 
        window.allSubjectsData.map(s => `<option value="${s.id}">${s.symbol || ''} ${s.name}</option>`).join('');
}