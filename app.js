// ==========================================
// فایل app.js — نسخه نجات‌بخش (بازگشت به حالت پایدار)
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

window.isFormDirty = false;
window.pendingExitAction = null;
window.currentFormName = '';
let autoBackupTimer = null;
const AUTO_BACKUP_DELAY = 2000;
let currentBackupSettings = null;

// ==========================================
// توابع پایه
// ==========================================
function toPersianNumber(num) {
    if (num === undefined || num === null || num === '') return '';
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().replace(/\d/g, x => persianDigits[x]);
}

function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.custom-toast-container');
    if (existingToast) existingToast.remove();
    const iconMap = {
        success: '<svg viewBox="0 0 24 24"><use href="#ico-check"/></svg>',
        error: '<svg viewBox="0 0 24 24"><use href="#ico-x"/></svg>',
        info: '<svg viewBox="0 0 24 24"><use href="#ico-info"/></svg>'
    };
    const toast = document.createElement('div');
    toast.className = `custom-toast-container custom-toast-${type}`;
    toast.innerHTML = `${iconMap[type] || iconMap.info}<span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

window.triggerAutoBackup = function() {
    if (autoBackupTimer) clearTimeout(autoBackupTimer);
    autoBackupTimer = setTimeout(async () => {
        try {
            const allData = await exportAllData();
            localStorage.setItem('kosha-emergency-backup', JSON.stringify(allData));
            localStorage.setItem('kosha-emergency-backup-time', Date.now().toString());
        } catch (e) { }
    }, AUTO_BACKUP_DELAY);
};

// ==========================================
// loadAllData (همه‌چیز را ساده لود می‌کند)
// ==========================================
async function loadAllData() {
    try {
        const classData = await getDataById('classProfile', 1);
        if (classData) {
            // ⚠️ خط مربوط به تغییر activeAcademicYear را حذف کردیم تا برنامه ریستارت نشود
            // if (classData.academicYear) window.activeAcademicYear = classData.academicYear; 
            
            if (classData.scheduleActiveDays) window.scheduleActiveDays = classData.scheduleActiveDays;
            if (classData.schedulePeriodsCount) window.schedulePeriodsCount = parseInt(classData.schedulePeriodsCount);
        }

        const rawStudents = await getAllData('students');
        const rawGroups = await getAllData('groups');
        const rawSubjects = await getAllData('subjects');
        const rawRecords = await getAllData('records');
        const rawSessions = await getAllData('sessions');
        const rawAttendance = await getAllData('attendance');

        window.allStudentsData = rawStudents;
        window.allGroupsData = rawGroups;
        window.allSubjectsData = rawSubjects;
        
        // فیلتر کردن سوابق بر اساس سال تحصیلی فعلی
        window.allRecordsData = rawRecords.filter(r => !r.academicYear || r.academicYear === window.activeAcademicYear);
        window.allSessionsData = rawSessions.filter(s => !s.academicYear || s.academicYear === window.activeAcademicYear);
        
        const validSessionIds = window.allSessionsData.map(s => s.id);
        window.allAttendanceData = rawAttendance.filter(a => validSessionIds.includes(a.sessionId));
        
        window.allWeeklyScheduleData = await getAllData('weeklySchedule');
        assessmentItems = await getAllData('assessmentItems');
        window.allAssessmentItems = assessmentItems;
        currentBackupSettings = await getBackupSettings();

        renderUI();
    } catch (e) { 
        console.error('خطا در بارگذاری داده‌ها:', e); 
    }
}

function renderUI() {
    try {
        if (typeof renderDashboardData === 'function') renderDashboardData();
        if (typeof renderStudentsList === 'function') renderStudentsList();
        if (typeof renderLessonData === 'function') renderLessonData();
        if (typeof renderGroupData === 'function') renderGroupData();
        if (typeof renderSessionData === 'function') renderSessionData();
        if (typeof renderScoreData === 'function') renderScoreData();
    } catch (e) { console.error(e); }
}

// ==========================================
// initApp (بازگشت به حالت عادی)
// ==========================================
async function initApp() {
    if (typeof applyEmojiRestriction === 'function') {
        applyEmojiRestriction('classSymbol');
        applyEmojiRestriction('lessonSymbol');
        applyEmojiRestriction('groupSymbol');
    }
    
    if (typeof attachDirtyListeners === 'function') attachDirtyListeners();
    if (typeof initAppEvents === 'function') initAppEvents();
    
    await loadAllData();
    
    if (typeof checkBackupReminder === 'function') checkBackupReminder();
    
    try {
        if (typeof loadExamsData === 'function') await loadExamsData();
        if (typeof renderExamsData === 'function') renderExamsData();
    } catch (error) { }
}