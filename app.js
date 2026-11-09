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
window.activeAcademicYear = '1405-1406'; // مقدار پیش‌فرض

let currentStudentView = 'flat';
let currentPage = { students: 1, records: 1, reports: 1 };
const itemsPerPage = 40;

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
    const toast = document.createElement('div');
    toast.className = `custom-toast-container custom-toast-${type}`;
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '❌';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

function checkBackupReminder() {
    try {
        const lastBackup = localStorage.getItem('kosha-last-backup');
        const statusEl = document.getElementById('backup-status');
        if (!lastBackup) {
            if (statusEl) statusEl.innerHTML = 'آخرین پشتیبان‌گیری: <strong style="color:red;">هرگز!</strong>';
            setTimeout(() => showToast('لطفاً از داده‌های خود نسخه پشتیبان تهیه کنید.', 'info'), 4000);
        } else {
            const daysDiff = Math.floor((Date.now() - parseInt(lastBackup)) / (1000 * 60 * 60 * 24));
            if (statusEl) statusEl.innerHTML = `آخرین پشتیبان‌گیری: <strong>${daysDiff} روز پیش</strong>`;
            if (daysDiff >= 7) setTimeout(() => showToast('یک هفته از آخرین پشتیبان‌گیری گذشته است. لطفاً نسخه پشتیبان بگیرید.', 'info'), 4000);
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

function initApp() {
    applyEmojiRestriction('classSymbol');
    applyEmojiRestriction('lessonSymbol');
    applyEmojiRestriction('groupSymbol');
    initDateDropdowns();
    initSessionDateDropdowns();
    
    try {
        if(document.getElementById('class-form')) document.getElementById('class-form').addEventListener('submit', saveClassProfile);
        if(document.getElementById('student-form')) document.getElementById('student-form').addEventListener('submit', saveStudent);
        if(document.getElementById('lesson-form')) document.getElementById('lesson-form').addEventListener('submit', saveLesson);
        if(document.getElementById('group-form')) document.getElementById('group-form').addEventListener('submit', saveGroup);
        
        if(document.getElementById('scheduleDaySelect')) document.getElementById('scheduleDaySelect').addEventListener('change', renderScheduleForDay);
        if(document.getElementById('sessionDayOfWeek')) document.getElementById('sessionDayOfWeek').addEventListener('change', checkScheduleExists);
        
        if(document.getElementById('item-manager-form')) {
            document.getElementById('item-manager-form').addEventListener('submit', saveItem);
        }
        if(document.getElementById('itemType')) {
            document.getElementById('itemType').addEventListener('change', toggleItemTypeFields);
        }
        
        if(document.getElementById('recordItem')) {
            document.getElementById('recordItem').addEventListener('change', (e) => {
                if (e.target.value !== "") {
                    const item = window.allAssessmentItems.find(i => i.id == e.target.value);
                    if(item) renderScoreInput(item);
                } else {
                    document.getElementById('dynamic-score-section').style.display = 'none';
                }
            });
        }
    } catch (error) { console.error("خطا در اتصال رویدادها:", error); }
    
    loadAllData();
    checkBackupReminder();
}

async function loadAllData() {
    try {
        const classData = await getDataById('classProfile', 1);
        if (classData) {
            document.getElementById('className').value = classData.name || '';
            document.getElementById('classSymbol').value = classData.symbol || '';
            document.getElementById('classMotto').value = classData.motto || '';
            document.getElementById('classGrade').value = classData.grade || '';
            document.getElementById('teacherName').value = classData.teacherName || '';
            document.getElementById('schoolName').value = classData.schoolName || '';
            
            if (classData.academicYear) {
                window.activeAcademicYear = classData.academicYear;
            } else {
                // اگر برای اولین بار است و سال تحصیلی ندارد، مقدار پیش‌فرض را ست می‌کنیم
                classData.academicYear = window.activeAcademicYear;
                await saveData('classProfile', classData);
            }
            
            const aySelect = document.getElementById('academicYear');
            if (aySelect) aySelect.value = window.activeAcademicYear;
            
            document.getElementById('header-subtitle').textContent = classData.name || 'همیار پرتلاش معلم';
        }

        // خواندن خام داده‌ها
        const rawStudents = await getAllData('students');
        const rawGroups = await getAllData('groups');
        const rawSubjects = await getAllData('subjects');
        const rawRecords = await getAllData('records');
        const rawSessions = await getAllData('sessions');
        const rawAttendance = await getAllData('attendance');
        
        // *** مهاجرت داده‌های قدیمی ***
        // اگر رکوردی تگ academicYear ندارد، آن را به سال جاری نسبت می‌دهیم تا از بین نرود
        let migrationNeeded = false;
        
        for (let r of rawRecords) {
            if (!r.academicYear) { r.academicYear = window.activeAcademicYear; await saveData('records', r); migrationNeeded = true; }
        }
        for (let s of rawSessions) {
            if (!s.academicYear) { s.academicYear = window.activeAcademicYear; await saveData('sessions', s); migrationNeeded = true; }
        }

        // *** فیلترینگ هوشمند ***
        window.allStudentsData = rawStudents;
        window.allGroupsData = rawGroups;
        window.allSubjectsData = rawSubjects;
        
        // فقط داده‌های مربوط به سال تحصیلی فعال را نگه می‌داریم
        window.allRecordsData = rawRecords.filter(r => r.academicYear === window.activeAcademicYear);
        window.allSessionsData = rawSessions.filter(s => s.academicYear === window.activeAcademicYear);
        
        // حضور و غیاب فقط برای جلسات مجاز
        const validSessionIds = window.allSessionsData.map(s => s.id);
        window.allAttendanceData = rawAttendance.filter(a => validSessionIds.includes(a.sessionId));
        
        window.allWeeklyScheduleData = await getAllData('weeklySchedule'); // برنامه هفتگی معمولاً بین سال‌ها مشترک است

        assessmentItems = await getAllData('assessmentItems');
        window.allAssessmentItems = assessmentItems;
        
        if (typeof renderClassData === 'function') renderClassData();
        if (typeof renderLessonData === 'function') renderLessonData();
        if (typeof renderGroupData === 'function') renderGroupData();
        if (typeof renderSessionData === 'function') renderSessionData();
        if (typeof renderScoreData === 'function') renderScoreData();
        
        if (migrationNeeded) showToast('اطلاعات قبلی به سال تحصیلی جدید منتقل شد.', 'info');
        
    } catch (e) { console.log('خطا در بارگذاری داده‌ها:', e); }
}

// ... (توابع initDateDropdowns، jalaliToDateString، مدیریت آیتم‌ها و ... دست نخورده‌اند)