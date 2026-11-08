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

// ۳. حذف سوابق یک درس یا یک فعالیت خاص (اصلاح‌شده)
async function resetSpecificRecords() {
    const selectedValue = document.getElementById('resetRecordSelect').value;
    if (!selectedValue) {
        showToast('لطفاً یک مورد را از لیست انتخاب کنید.', 'error');
        return;
    }

    // تشخیص اینکه کاربر درس انتخاب کرده یا یک آیتم/فعالیت
    const type = selectedValue.split('_')[0]; 
    const target = selectedValue.substring(type.length + 1); 

    const confirmMsg = type === 'subject' 
        ? 'آیا از حذف تمام سوابق ارزشیابی این درس مطمئن هستید؟'
        : 'آیا از حذف تمام سوابق این فعالیت/تشویق در کل دروس مطمئن هستید؟';

    if (!confirm(confirmMsg)) return;

    try {
        const allRecords = await getAllData('records');
        let recordsToDelete = [];
        
        if (type === 'subject') {
            recordsToDelete = allRecords.filter(r => r.subjectId === parseInt(target));
        } else if (type === 'item') {
            recordsToDelete = allRecords.filter(r => r.itemName === target);
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

// ۴. بازنشانی کامل (تنظیمات کارخانه)
async function resetFactoryAll() {
    const confirm1 = confirm('⚠️ خطر! آیا می‌خواهید کل اطلاعات برنامه (کلاس، دانش‌آموزان، دروس، سوابق و...) را برای همیشه پاک کنید؟');
    if (!confirm1) return;

    const confirm2 = confirm('🚨 آخرین هشدار!\n\nاین عمل غیرقابل بازگشت است. آیا واقعاً مطمئن هستید؟');
    if (!confirm2) return;

    try {
        const stores = ['classProfile', 'students', 'groups', 'subjects', 'records', 'badgesSettings', 'sessions', 'attendance', 'assessmentItems', 'weeklySchedule'];
        for (const store of stores) {
            await clearStore(store);
        }
        
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

// ۶. پر کردن هوشمند منوی کشویی (دروس + آیتم‌ها)
function populateResetSelect() {
    const select = document.getElementById('resetRecordSelect');
    if (!select) return;
    
    let html = '<option value="" disabled selected>انتخاب کنید...</option>';
    
    // دسته اول: دروس
    if (window.allSubjectsData && window.allSubjectsData.length > 0) {
        html += '<optgroup label="📚 دروس (حذف تمام سوابق درس)">';
        window.allSubjectsData.forEach(s => {
            html += `<option value="subject_${s.id}">📚 ${s.symbol || ''} ${s.name}</option>`;
        });
        html += '</optgroup>';
    }
    
    // دسته دوم: روش‌های کسب امتیاز و تشویق‌ها
    html += '<optgroup label="🎯 روش‌های کسب امتیاز و تشویق‌ها">';
    
    if (window.allAssessmentItems) {
        window.allAssessmentItems.forEach(i => {
            html += `<option value="item_${i.title}">🎯 ${i.title}</option>`;
        });
    }
    
    // موارد ثابت سیستم (قرآن و تشویق‌ها)
    html += `<option value="item_پویش حفظ جزء سی قرآن کریم">🌟 پویش حفظ جزء سی قرآن کریم</option>`;
    html += `<option value="item_تشویق ویژه">🎁 تشویق ویژه</option>`;
    html += `<option value="item_تشویق خوش‌خط‌نویسی">✍️ تشویق خوش‌خط‌نویسی</option>`;
    
    html += '</optgroup>';
    
    select.innerHTML = html;
}