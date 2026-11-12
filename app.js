// ==========================================
// فایل app.js — نسخه پایدار v12 (رفع کامل باگ‌ها)
// ==========================================

window.allStudentsData = [];
window.allGroupsData = [];
window.allSubjectsData = [];
window.allRecordsData = [];
window.allSessionsData = [];
window.allAttendanceData = [];
window.allWeeklyScheduleData = [];
let assessmentItems = [];
window.activeAcademicYear = null; 

const ALLOWED_ACADEMIC_YEARS = [
    '1405-1406', '1406-1407', '1407-1408', '1408-1409', '1409-1410'
];

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
let periodCalendarState = { year: 1405, month: 7, selectedDate: '' };
let currentEditingPeriodIndex = -1;
let currentCalendarTarget = 'start';

// ==========================================
// مدیریت خطای سراسری
// ==========================================
window.onerror = function(msg, url, line, col, error) {
    console.error('خطای سراسری:', msg, 'در', url, line);
    return true;
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
    for (let i = 0; i < 9; i++) { sum += parseInt(nationalId[i]) * (10 - i); }
    let remainder = sum % 11;
    return (remainder < 2 && check === remainder) || (remainder >= 2 && check === 11 - remainder);
}

function generateStudentPassword(nationalId) {
    if (!nationalId || nationalId.length !== 10) return '0000';
    const part1 = nationalId.substring(0, 5);
    const part2 = nationalId.substring(5, 10);
    let sum1 = 0; for (let i = 0; i < part1.length; i++) sum1 += parseInt(part1[i]);
    let sum2 = 0; for (let i = 0; i < part2.length; i++) sum2 += parseInt(part2[i]);
    const hash = Math.pow((sum1 * 7) + (sum2 * 3), 2);
    return ((hash % 9000) + 1000).toString();
}

const quranSurahs = {
    "ناس": 6, "فلق": 5, "توحید": 4, "مسد": 5, "نصر": 3, "کافرون": 6, "کوثر": 3, "ماعون": 7,
    "قریش": 4, "فیل": 5, "همزه": 9, "عصر": 3, "تکاثر": 8, "قارعه": 11, "عاديات": 11, "زلزال": 8,
    "بینه": 8, "قدر": 5, "علق": 19, "تین": 8, "شرح": 8, "ضحی": 11, "لیل": 21, "شمس": 15,
    "بلد": 20, "فجر": 30, "غاشیه": 26, "اعلی": 19, "طارق": 17, "بروج": 22, "انشقاق": 25,
    "مطففین": 36, "انفطار": 19, "تکویر": 29, "عبس": 42, "نازعات": 46, "نبأ": 40
};

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
// توابع انتخاب سال تحصیلی
// ==========================================
function openAcademicYearModal() {
    const modal = document.getElementById('academic-year-modal');
    if (modal) modal.classList.add('show');
}

function confirmAcademicYearSelection() {
    const selectEl = document.getElementById('academicYearSelect');
    if (!selectEl || !selectEl.value) {
        showToast('لطفاً یک سال تحصیلی انتخاب کنید.', 'error');
        return;
    }
    const selectedYear = selectEl.value;
    if (!ALLOWED_ACADEMIC_YEARS.includes(selectedYear)) {
        showToast('سال تحصیلی معتبر نیست.', 'error');
        return;
    }
    if (window.activeAcademicYear === selectedYear) {
        document.getElementById('academic-year-modal').classList.remove('show');
        return;
    }
    localStorage.setItem('kosha-active-academic-year', selectedYear);
    showToast('در حال بارگذاری سال ' + toPersianNumber(selectedYear) + '...', 'success');
    setTimeout(() => window.location.reload(), 800);
}

// ==========================================
// توابع بارگذاری
// ==========================================
async function loadAllData() {
    try {
        const currentYear = window.activeAcademicYear;
        if (!currentYear) return;

        const classData = await getClassProfile(currentYear);
        if (classData) {
            if (classData.scheduleActiveDays) window.scheduleActiveDays = classData.scheduleActiveDays;
            if (classData.schedulePeriodsCount) window.schedulePeriodsCount = parseInt(classData.schedulePeriodsCount);
        }

        window.allStudentsData = await getAllDataByYear('students', currentYear);
        window.allGroupsData = await getAllDataByYear('groups', currentYear);
        window.allSubjectsData = await getAllDataByYear('subjects', currentYear);
        window.allRecordsData = await getAllDataByYear('records', currentYear);
        window.allSessionsData = await getAllDataByYear('sessions', currentYear);
        
        const allAttendance = await getAllData('attendance');
        const validSessionIds = window.allSessionsData.map(s => s.id);
        window.allAttendanceData = allAttendance.filter(a => validSessionIds.includes(a.sessionId));
        
        window.allWeeklyScheduleData = await getAllDataByYear('weeklySchedule', currentYear);
        window.allWeeklyScheduleData = window.allWeeklyScheduleData.map(sched => ({ ...sched, day: sched.day || (sched.id ? sched.id.split('_')[1] : null) }));
        
        assessmentItems = await getAllDataByYear('assessmentItems', currentYear);
        window.allAssessmentItems = assessmentItems;
        currentBackupSettings = await getBackupSettings(currentYear);

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
    } catch (e) {}
}

// ==========================================
// initApp (بخش حیاتی)
// ==========================================
async function initApp() {
    const savedYear = localStorage.getItem('kosha-active-academic-year');
    
    if (!savedYear || !ALLOWED_ACADEMIC_YEARS.includes(savedYear)) {
        // باز کردن مودال انتخاب سال با اطمینان
        openAcademicYearModal();
        return; 
    }
    
    window.activeAcademicYear = savedYear;
    const yearDisplay = document.getElementById('current-academic-year-display');
    if (yearDisplay) yearDisplay.textContent = toPersianNumber(savedYear);
    
    if (typeof attachDirtyListeners === 'function') attachDirtyListeners();
    if (typeof initAppEvents === 'function') initAppEvents();
    
    await initDefaultAssessmentItemsForYear(savedYear);
    await loadAllData();
    
    if (typeof checkBackupReminder === 'function') checkBackupReminder();
}