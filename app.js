// ==========================================
// 1. متغیرهای سراسری
// ==========================================
window.allStudentsData = [];
window.allGroupsData = [];
window.allSubjectsData = [];
window.allRecordsData = [];
window.allSessionsData = [];
window.allAttendanceData = [];
window.allWeeklyScheduleData = [];
let assessmentItems = [];
window.activeAcademicYear = '1405-1406'; 

window.scheduleActiveDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه'];
window.schedulePeriodsCount = 5;

let currentStudentView = 'flat';
let currentPage = { students: 1, records: 1, reports: 1 };
const itemsPerPage = 40;

// *** متغیرهای مدیریت تغییرات ذخیره‌نشده ***
window.isFormDirty = false;
window.pendingExitAction = null;
window.currentFormName = '';

// *** متغیرهای جدید برای پشتیبان‌گیری خودکار ***
let autoBackupTimer = null;
const AUTO_BACKUP_DELAY = 2000; // ۲ ثانیه تاخیر برای جلوگیری از کندی

// *** مدیریت خطای سراسری ***
window.onerror = function(msg, url, line, col, error) {
    console.error('خطای سراسری:', msg, 'در', url, line);
    showToast('خطایی رخ داد. لطفاً صفحه را رفرش کنید.', 'error');
    return true;
};
window.onunhandledrejection = function(event) {
    console.error('خطای Promise:', event.reason);
    showToast('خطایی رخ داد. لطفاً صفحه را رفرش کنید.', 'error');
};

function toPersianNumber(num) {
    if (num === undefined || num === null || num === '') return '';
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().replace(/\d/g, x => persianDigits[x]);
}

function validateNationalId(nationalId) {
    if (!/^\d{10}$/.test(nationalId)) return false;
    if (/^(\d)\1{9}$/.test(nationalId)) return false;

    let check = parseInt(nationalId[9]);
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(nationalId[i]) * (10 - i);
    }
    let remainder = sum % 11;
    if ((remainder < 2 && check === remainder) || (remainder >= 2 && check === 11 - remainder)) {
        return true;
    }
    return false;
}

function generateStudentPassword(nationalId) {
    if (!nationalId || nationalId.length !== 10) return '0000';
    
    const part1 = nationalId.substring(0, 5);
    const part2 = nationalId.substring(5, 10);
    
    let sum1 = 0;
    for (let i = 0; i < part1.length; i++) sum1 += parseInt(part1[i]);
    
    let sum2 = 0;
    for (let i = 0; i < part2.length; i++) sum2 += parseInt(part2[i]);
    
    const hash = Math.pow((sum1 * 7) + (sum2 * 3), 2);
    const finalPass = (hash % 9000) + 1000;
    
    return finalPass.toString();
}

const quranSurahs = {
    "ناس": 6, "فلق": 5, "توحید": 4, "مسد": 5, "نصر": 3, "کافرون": 6, "کوثر": 3, "ماعون": 7,
    "قریش": 4, "فیل": 5, "همزه": 9, "عصر": 3, "تکاثر": 8, "قارعه": 11, "عاديات": 11, "زلزال": 8,
    "بینه": 8, "قدر": 5, "علق": 19, "تین": 8, "شرح": 8, "ضحی": 11, "لیل": 21, "شمس": 15,
    "بلد": 20, "فجر": 30, "غاشیه": 26, "اعلی": 19, "طارق": 17, "بروج": 22, "انشقاق": 25,
    "مطففین": 36, "انفطار": 19, "تکویر": 29, "عبس": 42, "نازعات": 46, "نبأ": 40
};

// *** تابع بهبودیافته Toast با آیکون‌های SVG ***
function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.custom-toast-container');
    if (existingToast) existingToast.remove();

    const iconMap = {
        success: '<svg viewBox="0 0 24 24"><use href="#ico-check"/></svg>',
        error: '<svg viewBox="0 0 24 24"><use href="#ico-x"/></svg>',
        info: '<svg viewBox="0 0 24 24"><use href="#ico-info"/></svg>'
    };
    const iconSvg = iconMap[type] || iconMap.info;

    const toast = document.createElement('div');
    toast.className = `custom-toast-container custom-toast-${type}`;
    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// ==========================================
// ✅ توابع جدید: پشتیبان‌گیری خودکار در پس‌زمینه
// ==========================================

// محافظت از داده‌ها با ذخیره در localStorage (با تاخیر برای جلوگیری از کندی)
window.triggerAutoBackup = function() {
    // لغو تایمر قبلی (Debounce)
    if (autoBackupTimer) {
        clearTimeout(autoBackupTimer);
    }
    
    // تنظیم تایمر جدید
    autoBackupTimer = setTimeout(async () => {
        try {
            const allData = await exportAllData();
            localStorage.setItem('kosha-emergency-backup', JSON.stringify(allData));
            localStorage.setItem('kosha-emergency-backup-time', Date.now().toString());
            console.log('✅ پشتیبان خودکار در پس‌زمینه ذخیره شد.');
        } catch (e) {
            console.warn('⚠️ پشتیبان‌گیری خودکار با خطا مواجه شد:', e);
        }
    }, AUTO_BACKUP_DELAY);
};

// بررسی وجود نسخه اضطراری در هنگام بارگذاری
function checkEmergencyBackup() {
    try {
        const backupStr = localStorage.getItem('kosha-emergency-backup');
        const backupTimeStr = localStorage.getItem('kosha-emergency-backup-time');
        
        if (!backupStr || !backupTimeStr) return; // نسخه اضطراری وجود ندارد
        
        const backupTime = parseInt(backupTimeStr);
        const diffHours = (Date.now() - backupTime) / (1000 * 60 * 60);
        
        // اگر نسخه اضطراری جدیدتر از ۱ ساعت پیش باشد، لازم نیست هشدار بدهیم
        // (چون یعنی کاربر تازه از برنامه استفاده کرده)
        if (diffHours < 1) return;
        
        // نمایش پیام به کاربر
        console.log('💡 نسخه اضطراری موجود است، از ' + Math.floor(diffHours) + ' ساعت پیش.');
        
    } catch (e) { console.warn('خطا در بررسی نسخه اضطراری:', e); }
}

// بازیابی از نسخه اضطراری
async function restoreFromEmergencyBackup() {
    if (!confirm('⚠️ هشدار مهم:\n\nبا بازیابی این نسخه، تمام اطلاعات فعلی شما پاک شده و با نسخه خودکار جایگزین می‌شود.\n\nآیا مطمئن هستید؟')) {
        return;
    }
    
    try {
        const backupStr = localStorage.getItem('kosha-emergency-backup');
        if (!backupStr) {
            showToast('هیچ نسخه خودکاری یافت نشد.', 'error');
            return;
        }
        
        const data = JSON.parse(backupStr);
        await importAllData(data);
        
        showToast('نسخه خودکار با موفقیت بازیابی شد! در حال بارگذاری مجدد...', 'success');
        setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
        console.error(e);
        showToast('خطا در بازیابی نسخه خودکار.', 'error');
    }
}

function checkBackupReminder() {
    try {
        const lastBackup = localStorage.getItem('kosha-last-backup');
        const statusEl = document.getElementById('backup-status');
        
        // نمایش وضعیت آخرین پشتیبان دستی
        if (!lastBackup) {
            if (statusEl) statusEl.innerHTML = 'آخرین پشتیبان‌گیری دستی: <strong style="color:red;">هرگز!</strong>';
            setTimeout(() => showToast('لطفاً از داده‌های خود نسخه پشتیبان تهیه کنید.', 'info'), 4000);
        } else {
            const daysDiff = Math.floor((Date.now() - parseInt(lastBackup)) / (1000 * 60 * 60 * 24));
            if (statusEl) statusEl.innerHTML = `آخرین پشتیبان‌گیری دستی: <strong>${toPersianNumber(daysDiff)} روز پیش</strong>`;
            if (daysDiff >= 7) setTimeout(() => showToast('یک هفته از آخرین پشتیبان‌گیری گذشته است. لطفاً نسخه پشتیبان بگیرید.', 'info'), 4000);
        }
        
        // نمایش اطلاعات نسخه اضطراری (خودکار)
        const emergencyBackupTime = localStorage.getItem('kosha-emergency-backup-time');
        const emergencyStatusEl = document.getElementById('emergency-backup-status');
        if (emergencyStatusEl && emergencyBackupTime) {
            const lastEmergency = parseInt(emergencyBackupTime);
            const minutesDiff = Math.floor((Date.now() - lastEmergency) / (1000 * 60));
            if (minutesDiff < 60) {
                emergencyStatusEl.innerHTML = `♻️ آخرین نسخه خودکار: <strong style="color: green;">${toPersianNumber(minutesDiff)} دقیقه پیش</strong>`;
            } else {
                const hoursDiff = Math.floor(minutesDiff / 60);
                emergencyStatusEl.innerHTML = `♻️ آخرین نسخه خودکار: <strong>${toPersianNumber(hoursDiff)} ساعت پیش</strong>`;
            }
        }
    } catch (e) { console.log(e); }
}

function applyEmojiRestriction(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.addEventListener('input', function() {
            const val = this.value;
            const emojis = val.match(/\p{Extended_Pictographic}/gu); 
            if (emojis && emojis.length > 0) { this.value = emojis[0]; } else { this.value = ''; }
        });
    }
}

// ==========================================
// توابع مدیریت تغییرات ذخیره‌نشده
// ==========================================

function getExitMessage(formName) {
    const messages = {
        'record-form': 'شما در حال ثبت یک ارزشیابی جدید هستید. اطلاعات وارد شده ذخیره نشده است.',
        'exam-editor-form': 'شما در حال ساخت یا ویرایش یک آزمون هستید. سوالات و اطلاعات ذخیره نشده است.',
        'class-form': 'تغییرات تنظیمات کلاس ذخیره نشده است.',
        'student-form': 'اطلاعات دانش‌آموز جدید ذخیره نشده است.',
        'group-form': 'اطلاعات گروه جدید ذخیره نشده است.',
        'lesson-form': 'اطلاعات درس جدید ذخیره نشده است.',
        'quran-form': 'اطلاعات پویش قرآن ذخیره نشده است.',
        'special-reward-form': 'اطلاعات تشویق ویژه ذخیره نشده است.',
        'handwriting-reward-form': 'اطلاعات تشویق خوش‌خط‌نویسی ذخیره نشده است.',
        'edit-student-form': 'تغییرات دانش‌آموز ذخیره نشده است.',
        'edit-group-form': 'تغییرات گروه ذخیره نشده است.',
        'edit-lesson-form': 'تغییرات درس ذخیره نشده است.',
        'edit-record-form': 'تغییرات رکورد ارزشیابی ذخیره نشده است.',
        'item-manager-form': 'آیتم جدید یا تغییرات آن ذخیره نشده است.'
    };
    return messages[formName] || 'شما تغییرات ذخیره‌نشده دارید. اگر خارج شوید، این تغییرات از بین می‌رود.';
}

function markFormDirty(formName) {
    if (formName) window.currentFormName = formName;
    window.isFormDirty = true;
}

function clearFormDirty() {
    window.isFormDirty = false;
    window.pendingExitAction = null;
    window.currentFormName = '';
}

function requestExit(callback) {
    if (!window.isFormDirty) {
        if (callback) callback();
        return;
    }
    
    window.pendingExitAction = callback;
    const messageEl = document.getElementById('exit-confirm-message');
    if (messageEl) {
        messageEl.textContent = getExitMessage(window.currentFormName);
    }
    document.getElementById('exit-confirm-modal').classList.add('show');
}

function cancelExit() {
    document.getElementById('exit-confirm-modal').classList.remove('show');
    window.pendingExitAction = null;
}

function confirmExit() {
    document.getElementById('exit-confirm-modal').classList.remove('show');
    const action = window.pendingExitAction;
    
    window.isFormDirty = false;
    window.pendingExitAction = null;
    window.currentFormName = '';
    
    if (action) action();
}

function attachDirtyListeners() {
    const formSelectors = [
        '#record-form', '#exam-editor-form', '#class-form', '#student-form', 
        '#group-form', '#lesson-form', '#quran-form', '#special-reward-form', 
        '#handwriting-reward-form', '#edit-student-form', '#edit-group-form', 
        '#edit-lesson-form', '#edit-record-form', '#item-manager-form'
    ];

    formSelectors.forEach(selector => {
        const form = document.querySelector(selector);
        if (form) {
            form.addEventListener('input', function() {
                markFormDirty(form.id);
            });
            form.addEventListener('change', function() {
                markFormDirty(form.id);
            });
        }
    });

    window.addEventListener('beforeunload', function(e) {
        if (window.isFormDirty) {
            e.preventDefault();
            e.returnValue = 'شما تغییرات ذخیره‌نشده دارید. آیا می‌خواهید خارج شوید؟';
            return e.returnValue;
        }
    });
}

function initAppEvents() {
    const classForm = document.getElementById('class-form');
    if (classForm) classForm.addEventListener('submit', saveClassProfile);
    
    const studentForm = document.getElementById('student-form');
    if (studentForm) studentForm.addEventListener('submit', saveStudent);
    
    const lessonForm = document.getElementById('lesson-form');
    if (lessonForm) lessonForm.addEventListener('submit', saveLesson);
    
    const groupForm = document.getElementById('group-form');
    if (groupForm && !groupForm.dataset.listenerAttached) {
        groupForm.addEventListener('submit', saveGroup);
        groupForm.dataset.listenerAttached = 'true';
    }
    
    const itemManagerForm = document.getElementById('item-manager-form');
    if (itemManagerForm) itemManagerForm.addEventListener('submit', saveItem);
    
    const itemType = document.getElementById('itemType');
    if (itemType) itemType.addEventListener('change', toggleItemTypeFields);
    
    if (typeof initScoreEvents === 'function') initScoreEvents();
    if (typeof initGroupEvents === 'function') initGroupEvents();
    if (typeof initLessonEvents === 'function') initLessonEvents();
    if (typeof initSessionEvents === 'function') initSessionEvents();
    
    const editRecordForm = document.getElementById('edit-record-form');
    if (editRecordForm) editRecordForm.addEventListener('submit', saveEditedRecord);
    
    const editGroupForm = document.getElementById('edit-group-form');
    if (editGroupForm) editGroupForm.addEventListener('submit', saveEditedGroup);
    
    const editLessonForm = document.getElementById('edit-lesson-form');
    if (editLessonForm) editLessonForm.addEventListener('submit', saveEditedLesson);
    
    const editStudentForm = document.getElementById('edit-student-form');
    if (editStudentForm) editStudentForm.addEventListener('submit', saveEditedStudent);
}

async function initApp() {
    applyEmojiRestriction('classSymbol');
    applyEmojiRestriction('lessonSymbol');
    applyEmojiRestriction('groupSymbol');
    
    attachDirtyListeners();
    
    try {
        initAppEvents();
    } catch (error) { console.error("خطا در اتصال رویدادها:", error); }
    
    try {
        await loadAllData();
    } catch (error) { console.error("خطا در بارگذاری داده‌ها:", error); }
    
    checkBackupReminder();
    
    // *** بررسی وجود نسخه اضطراری در شروع اپلیکیشن ***
    checkEmergencyBackup();
    
    try {
        if (typeof loadExamsData === 'function') await loadExamsData();
        if (typeof renderExamsData === 'function') renderExamsData();
    } catch (error) { console.error("خطا در بارگذاری آزمون‌ها:", error); }
}