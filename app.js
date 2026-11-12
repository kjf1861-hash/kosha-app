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
window.activeAcademicYear = null; // مقدار اولیه: null (باید توسط کاربر انتخاب شود)

// لیست سال‌های تحصیلی مجاز (همان لیست db.js)
const ALLOWED_ACADEMIC_YEARS = [
    '1405-1406',
    '1406-1407',
    '1407-1408',
    '1408-1409',
    '1409-1410'
];

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
const AUTO_BACKUP_DELAY = 2000; // ۲ ثانیه تاخیر

// *** متغیرهای مربوط به تنظیمات پشتیبان‌گیری دوره‌ای و بازه‌ها ***
let currentBackupSettings = null;
let periodCalendarState = {
    year: 1405,
    month: 7,
    selectedDate: ''
};
let currentEditingPeriodIndex = -1;
let currentCalendarTarget = 'start';

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

// *** تابع بهبودیافته Toast ***
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
// ✅ توابع جدید: انتخاب سال تحصیلی
// ==========================================

function openAcademicYearModal() {
    const modal = document.getElementById('academic-year-modal');
    if (!modal) return;
    
    // پیش‌انتخاب سال جاری
    const selectEl = document.getElementById('academicYearSelect');
    if (selectEl && window.activeAcademicYear) {
        selectEl.value = window.activeAcademicYear;
    }
    
    modal.classList.add('show');
}

function confirmAcademicYearSelection() {
    const selectEl = document.getElementById('academicYearSelect');
    if (!selectEl || !selectEl.value) {
        showToast('لطفاً یک سال تحصیلی انتخاب کنید.', 'error');
        return;
    }
    
    const selectedYear = selectEl.value;
    
    // بررسی اینکه آیا سال در لیست مجاز است
    if (!ALLOWED_ACADEMIC_YEARS.includes(selectedYear)) {
        showToast('سال تحصیلی انتخاب‌شده معتبر نیست.', 'error');
        return;
    }
    
    // اگر همان سال قبلی است، فقط مودال را ببند
    if (window.activeAcademicYear === selectedYear) {
        document.getElementById('academic-year-modal').classList.remove('show');
        return;
    }
    
    // در غیر این صورت، تأیید بگیر
    const isChange = window.activeAcademicYear !== null;
    if (isChange) {
        const confirmMsg = 'آیا از تغییر سال تحصیلی به «' + toPersianNumber(selectedYear) + '» مطمئن هستید؟\n\nتمام داده‌ها به این سال تحصیلی منتقل می‌شوند.';
        if (!confirm(confirmMsg)) return;
    }
    
    // ذخیره در localStorage
    localStorage.setItem('kosha-active-academic-year', selectedYear);
    
    showToast('سال تحصیلی ' + toPersianNumber(selectedYear) + ' انتخاب شد. در حال بارگذاری...', 'success');
    
    // رفرش صفحه برای بارگذاری داده‌های سال جدید
    setTimeout(() => window.location.reload(), 800);
}

// ==========================================
// ✅ توابع پشتیبان‌گیری خودکار در پس‌زمینه
// ==========================================

window.triggerAutoBackup = function() {
    if (autoBackupTimer) {
        clearTimeout(autoBackupTimer);
    }
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

function checkEmergencyBackup() {
    try {
        const backupStr = localStorage.getItem('kosha-emergency-backup');
        const backupTimeStr = localStorage.getItem('kosha-emergency-backup-time');
        if (!backupStr || !backupTimeStr) return;
        const backupTime = parseInt(backupTimeStr);
        const diffHours = (Date.now() - backupTime) / (1000 * 60 * 60);
        if (diffHours < 1) return;
        console.log('💡 نسخه اضطراری موجود است، از ' + Math.floor(diffHours) + ' ساعت پیش.');
    } catch (e) { console.warn('خطا در بررسی نسخه اضطراری:', e); }
}

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
        
        if (!lastBackup) {
            if (statusEl) statusEl.innerHTML = 'آخرین پشتیبان‌گیری دستی: <strong style="color:red;">هرگز!</strong>';
            setTimeout(() => showToast('لطفاً از داده‌های خود نسخه پشتیبان تهیه کنید.', 'info'), 4000);
        } else {
            const daysDiff = Math.floor((Date.now() - parseInt(lastBackup)) / (1000 * 60 * 60 * 24));
            if (statusEl) statusEl.innerHTML = `آخرین پشتیبان‌گیری دستی: <strong>${toPersianNumber(daysDiff)} روز پیش</strong>`;
            if (daysDiff >= 7) setTimeout(() => showToast('یک هفته از آخرین پشتیبان‌گیری گذشته است. لطفاً نسخه پشتیبان بگیرید.', 'info'), 4000);
        }
        
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

// ==========================================
// ✅ توابع جدید: تنظیمات پشتیبان‌گیری دوره‌ای و بازه‌ها
// ==========================================

async function initBackupSettingsForm() {
    currentBackupSettings = await getBackupSettings(window.activeAcademicYear);
    
    const reminderTypeEl = document.getElementById('backupReminderType');
    if (reminderTypeEl) {
        reminderTypeEl.value = currentBackupSettings.reminderType || 'off';
    }
    
    renderPeriodsList();
    
    const ay = window.activeAcademicYear || '1405-1406';
    const startYear = parseInt(ay.split('-')[0]);
    periodCalendarState.year = startYear;
    periodCalendarState.month = 7;
    periodCalendarState.selectedDate = '';
}

async function saveBackupSettings() {
    if (!currentBackupSettings) {
        currentBackupSettings = await getBackupSettings(window.activeAcademicYear);
    }
    
    const reminderTypeEl = document.getElementById('backupReminderType');
    if (reminderTypeEl) {
        currentBackupSettings.reminderType = reminderTypeEl.value;
    }
    
    try {
        await saveData('backupSettings', currentBackupSettings);
        showToast('تنظیمات یادآور با موفقیت ذخیره شد.', 'success');
    } catch (e) {
        console.error(e);
        showToast('خطا در ذخیره تنظیمات.', 'error');
    }
}

function renderPeriodsList() {
    const container = document.getElementById('periods-list-container');
    if (!container) return;
    
    const periods = (currentBackupSettings && currentBackupSettings.periods) ? currentBackupSettings.periods : [];
    
    if (periods.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">هیچ بازه‌ای تعریف نشده است.</p>';
        return;
    }
    
    let html = '';
    periods.forEach((period, index) => {
        html += `
            <div class="list-item" style="padding: 10px 12px; margin-bottom: 8px; flex-direction: column; align-items: stretch; gap: 5px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: var(--primary); font-size: 0.95rem;">📅 ${period.title}</strong>
                    <button type="button" class="btn btn-danger btn-sm" onclick="deletePeriod(${index})" title="حذف" style="padding: 2px 8px;">🗑️</button>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">
                    از <strong>${toPersianNumber(period.startDate)}</strong> تا <strong>${toPersianNumber(period.endDate)}</strong>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

async function deletePeriod(index) {
    if (!confirm('آیا از حذف این بازه مطمئن هستید؟')) return;
    
    if (!currentBackupSettings) {
        currentBackupSettings = await getBackupSettings(window.activeAcademicYear);
    }
    
    currentBackupSettings.periods.splice(index, 1);
    
    try {
        await saveData('backupSettings', currentBackupSettings);
        renderPeriodsList();
        showToast('بازه حذف شد.', 'success');
    } catch (e) {
        console.error(e);
        showToast('خطا در حذف بازه.', 'error');
    }
}

function openPeriodEditor() {
    const modal = document.getElementById('period-editor-modal');
    if (!modal) return;
    
    currentEditingPeriodIndex = -1;
    currentCalendarTarget = 'start';
    
    document.getElementById('period-editor-title').textContent = '➕ تعریف بازه جدید';
    document.getElementById('periodTitle').value = '';
    document.getElementById('periodStartDate').value = '';
    document.getElementById('periodEndDate').value = '';
    document.getElementById('periodStartDisplay').textContent = 'انتخاب نشده';
    document.getElementById('periodEndDisplay').textContent = 'انتخاب نشده';
    
    const ay = window.activeAcademicYear || '1405-1406';
    const startYear = parseInt(ay.split('-')[0]);
    periodCalendarState.year = startYear;
    periodCalendarState.month = 7;
    periodCalendarState.selectedDate = '';
    
    renderPeriodCalendar();
    modal.classList.add('show');
}

function closePeriodEditor() {
    const modal = document.getElementById('period-editor-modal');
    if (modal) modal.classList.remove('show');
}

function setCalendarTarget(target) {
    currentCalendarTarget = target;
    showToast(target === 'start' ? 'روی تقویم، تاریخ شروع را انتخاب کنید.' : 'روی تقویم، تاریخ پایان را انتخاب کنید.', 'info');
}

function renderPeriodCalendar() {
    const titleEl = document.getElementById('period-calendar-title');
    if (!titleEl) return;
    
    const ay = window.activeAcademicYear || '1405-1406';
    const [startYearStr, endYearStr] = ay.split('-');
    const startYear = parseInt(startYearStr);
    const endYear = parseInt(endYearStr);
    
    const monthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
    
    titleEl.innerHTML = `
        <select onchange="updatePeriodCalendarSelect('month', this.value)">
            ${monthNames.map((m, i) => `<option value="${i + 1}" ${periodCalendarState.month === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
        <select onchange="updatePeriodCalendarSelect('year', this.value)">
            ${[startYear, endYear].map(y => `<option value="${y}" ${periodCalendarState.year === y ? 'selected' : ''}>${toPersianNumber(y)}</option>`).join('')}
        </select>
    `;
    
    const grid = document.getElementById('period-calendar-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const firstDay = getJalaliFirstDayOfWeek(periodCalendarState.year, periodCalendarState.month);
    const daysInMonth = getJalaliDaysInMonth(periodCalendarState.year, periodCalendarState.month);
    
    const startBound = `${startYear}/07/01`;
    const endBound = `${endYear}/06/31`;
    
    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div class="calendar-day empty"></div>`;
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const isFriday = ((firstDay + day - 1) % 7) === 6;
        const dateStr = `${periodCalendarState.year}/${String(periodCalendarState.month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
        const inAcademicYear = (dateStr >= startBound && dateStr <= endBound);
        
        const isStart = document.getElementById('periodStartDate').value === dateStr;
        const isEnd = document.getElementById('periodEndDate').value === dateStr;
        
        let classes = 'calendar-day';
        if (isFriday) classes += ' holiday';
        if (isStart) classes += ' selected';
        if (isEnd) classes += ' selected';
        if (isStart && isEnd) classes += ' selected';
        if (!inAcademicYear) classes += ' outside-range';
        
        const clickHandler = inAcademicYear 
            ? `onclick="selectPeriodCalendarDay('${dateStr}')"` 
            : `onclick="showToast('این تاریخ خارج از بازه سال تحصیلی است.', 'error')"`;
        
        let styleExtra = '';
        if (isStart && !isEnd) styleExtra = 'background: #22c55e; color: white;';
        else if (isEnd && !isStart) styleExtra = 'background: #ef4444; color: white;';
        
        grid.innerHTML += `<div class="${classes}" ${clickHandler} style="${styleExtra}">${toPersianNumber(day)}</div>`;
    }
}

function updatePeriodCalendarSelect(field, value) {
    periodCalendarState[field] = parseInt(value);
    renderPeriodCalendar();
}

function selectPeriodCalendarDay(dateStr) {
    if (currentCalendarTarget === 'start') {
        document.getElementById('periodStartDate').value = dateStr;
        document.getElementById('periodStartDisplay').textContent = toPersianNumber(dateStr);
        const endDate = document.getElementById('periodEndDate').value;
        if (endDate && endDate < dateStr) {
            document.getElementById('periodEndDate').value = '';
            document.getElementById('periodEndDisplay').textContent = 'انتخاب نشده';
        }
    } else {
        document.getElementById('periodEndDate').value = dateStr;
        document.getElementById('periodEndDisplay').textContent = toPersianNumber(dateStr);
        
        const startDate = document.getElementById('periodStartDate').value;
        if (!startDate || dateStr < startDate) {
            showToast('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.', 'error');
            document.getElementById('periodEndDate').value = '';
            document.getElementById('periodEndDisplay').textContent = 'انتخاب نشده';
            return;
        }
    }
    renderPeriodCalendar();
}

async function savePeriod() {
    const title = document.getElementById('periodTitle').value.trim();
    const startDate = document.getElementById('periodStartDate').value;
    const endDate = document.getElementById('periodEndDate').value;
    
    if (!title) {
        showToast('عنوان بازه را وارد کنید.', 'error');
        return;
    }
    
    if (!startDate || !endDate) {
        showToast('تاریخ شروع و پایان را انتخاب کنید.', 'error');
        return;
    }
    
    if (!window.isValidJalaliDateString(startDate) || !window.isValidJalaliDateString(endDate)) {
        showToast('تاریخ وارد شده معتبر نیست.', 'error');
        return;
    }
    
    if (startDate >= endDate) {
        showToast('تاریخ شروع باید قبل از تاریخ پایان باشد.', 'error');
        return;
    }
    
    const ay = window.activeAcademicYear || '1405-1406';
    const [startYear, endYear] = ay.split('-');
    const startBound = `${startYear}/07/01`;
    const endBound = `${endYear}/06/31`;
    
    if (startDate < startBound || endDate > endBound) {
        showToast(`تاریخ‌ها باید در بازه سال تحصیلی (${toPersianNumber(startBound)} تا ${toPersianNumber(endBound)}) باشند.`, 'error');
        return;
    }
    
    if (!currentBackupSettings) {
        currentBackupSettings = await getBackupSettings(window.activeAcademicYear);
    }
    
    const periods = currentBackupSettings.periods || [];
    for (let i = 0; i < periods.length; i++) {
        if (currentEditingPeriodIndex === i) continue;
        const existing = periods[i];
        if (!(endDate < existing.startDate || startDate > existing.endDate)) {
            showToast(`این بازه با بازه «${existing.title}» همپوشانی دارد.`, 'error');
            return;
        }
    }
    
    const newPeriod = {
        title: title,
        startDate: startDate,
        endDate: endDate,
        lastReminded: null
    };
    
    if (currentEditingPeriodIndex >= 0) {
        currentBackupSettings.periods[currentEditingPeriodIndex] = newPeriod;
    } else {
        if (!currentBackupSettings.periods) currentBackupSettings.periods = [];
        currentBackupSettings.periods.push(newPeriod);
    }
    
    try {
        await saveData('backupSettings', currentBackupSettings);
        showToast('بازه با موفقیت ذخیره شد.', 'success');
        closePeriodEditor();
        renderPeriodsList();
    } catch (e) {
        console.error(e);
        showToast('خطا در ذخیره بازه.', 'error');
    }
}

async function checkPeriodReminders() {
    try {
        currentBackupSettings = await getBackupSettings(window.activeAcademicYear);
        const now = Date.now();
        
        const reminderType = currentBackupSettings.reminderType;
        if (reminderType && reminderType !== 'off') {
            const lastReminder = currentBackupSettings.lastReminderDate || 0;
            const daysSinceLast = (now - lastReminder) / (1000 * 60 * 60 * 24);
            
            let shouldRemind = false;
            let reminderText = '';
            
            if (reminderType === 'daily' && daysSinceLast >= 1) {
                shouldRemind = true;
                reminderText = 'روزانه';
            } else if (reminderType === 'weekly' && daysSinceLast >= 7) {
                shouldRemind = true;
                reminderText = 'هفتگی';
            } else if (reminderType === 'monthly' && daysSinceLast >= 30) {
                shouldRemind = true;
                reminderText = 'ماهانه';
            }
            
            if (shouldRemind) {
                showReminderModal(`موعد پشتیبان‌گیری ${reminderText} فرا رسیده است. آیا می‌خواهید از داده‌های خود نسخه پشتیبان تهیه کنید؟`, 'general');
                return;
            }
        }
        
        const todayDate = getTodayJalali();
        const periods = currentBackupSettings.periods || [];
        
        for (let i = 0; i < periods.length; i++) {
            const period = periods[i];
            if (todayDate >= period.endDate && (!period.lastReminded || period.lastReminded < period.endDate)) {
                showReminderModal(`بازه «${period.title}» به پایان رسید. آیا می‌خواهید از داده‌های این بازه پشتیبان تهیه کنید؟`, 'period', i);
                return;
            }
        }
    } catch (e) {
        console.error('خطا در بررسی یادآورها:', e);
    }
}

function getTodayJalali() {
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
            year: 'numeric', month: '2-digit', day: '2-digit'
        });
        const parts = formatter.formatToParts(now);
        let year, month, day;
        parts.forEach(p => {
            if (p.type === 'year') year = p.value.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).padStart(4, '0');
            if (p.type === 'month') month = p.value.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).padStart(2, '0');
            if (p.type === 'day') day = p.value.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).padStart(2, '0');
        });
        year = year.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
        month = month.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
        day = day.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
        return `${year}/${month}/${day}`;
    } catch (e) {
        return '1405/01/01';
    }
}

let reminderModalContext = { type: 'general', periodIndex: -1 };

function showReminderModal(message, type = 'general', periodIndex = -1) {
    reminderModalContext = { type, periodIndex };
    const modal = document.getElementById('backup-reminder-modal');
    const messageEl = document.getElementById('backup-reminder-message');
    if (messageEl) messageEl.textContent = message;
    if (modal) modal.classList.add('show');
}

function closeReminderModal() {
    const modal = document.getElementById('backup-reminder-modal');
    if (modal) modal.classList.remove('show');
    reminderModalContext = { type: 'general', periodIndex: -1 };
}

async function handleReminderDownload() {
    try {
        const data = await exportAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        let filename = `kosha_backup_${new Date().toISOString().slice(0,10)}`;
        if (reminderModalContext.type === 'period' && currentBackupSettings && currentBackupSettings.periods[reminderModalContext.periodIndex]) {
            const period = currentBackupSettings.periods[reminderModalContext.periodIndex];
            filename = `kosha_backup_${period.title.replace(/\s+/g, '_')}`;
            currentBackupSettings.periods[reminderModalContext.periodIndex].lastReminded = getTodayJalali();
            await saveData('backupSettings', currentBackupSettings);
        } else {
            currentBackupSettings.lastReminderDate = Date.now();
            await saveData('backupSettings', currentBackupSettings);
        }
        
        const a = document.createElement('a'); 
        a.href = url; 
        a.download = filename + '.json'; 
        a.click();
        URL.revokeObjectURL(url);
        
        localStorage.setItem('kosha-last-backup', Date.now());
        checkBackupReminder();
        closeReminderModal();
        showToast('فایل پشتیبان دانلود شد.', 'success');
    } catch (e) {
        console.error(e);
        showToast('خطا در تولید پشتیبان.', 'error');
    }
}

async function snoozeReminder() {
    try {
        if (reminderModalContext.type === 'period' && currentBackupSettings && currentBackupSettings.periods[reminderModalContext.periodIndex]) {
            // فقط برای این جلسه به تعویق بینداز
        } else {
            currentBackupSettings.lastReminderDate = Date.now();
            await saveData('backupSettings', currentBackupSettings);
        }
        closeReminderModal();
        showToast('یادآور بعداً نمایش داده می‌شود.', 'info');
    } catch (e) { console.error(e); }
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
    // ==========================================
    // ✅ مرحله ۱: بررسی انتخاب سال تحصیلی
    // ==========================================
    const savedYear = localStorage.getItem('kosha-active-academic-year');
    
    if (!savedYear || !ALLOWED_ACADEMIC_YEARS.includes(savedYear)) {
        // اگر سال تحصیلی انتخاب نشده یا معتبر نیست، مودال را نمایش بده
        console.log('📌 سال تحصیلی انتخاب نشده است. نمایش مودال...');
        openAcademicYearModal();
        return; // هیچ داده‌ای لود نمی‌شود
    }
    
    // تنظیم سال تحصیلی جاری
    window.activeAcademicYear = savedYear;
    console.log('✅ سال تحصیلی فعال: ' + savedYear);
    
    // به‌روزرسانی نمایشگر در تنظیمات
    const yearDisplay = document.getElementById('current-academic-year-display');
    if (yearDisplay) yearDisplay.textContent = toPersianNumber(savedYear);
    
    // ادامه‌ی راه‌اندازی
    applyEmojiRestriction('classSymbol');
    applyEmojiRestriction('lessonSymbol');
    applyEmojiRestriction('groupSymbol');
    
    attachDirtyListeners();
    
    try {
        initAppEvents();
    } catch (error) { console.error("خطا در اتصال رویدادها:", error); }
    
    // ساخت آیتم‌های پیش‌فرض برای این سال (اگر وجود نداشته باشند)
    try {
        await initDefaultAssessmentItemsForYear(savedYear);
    } catch (error) { console.error("خطا در ساخت آیتم‌های پیش‌فرض:", error); }
    
    try {
        await loadAllData();
    } catch (error) { console.error("خطا در بارگذاری داده‌ها:", error); }
    
    checkBackupReminder();
    checkEmergencyBackup();
    
    setTimeout(() => {
        checkPeriodReminders();
    }, 2000);
    
    try {
        if (typeof loadExamsData === 'function') await loadExamsData();
        if (typeof renderExamsData === 'function') renderExamsData();
    } catch (error) { console.error("خطا در بارگذاری آزمون‌ها:", error); }
}

// *** جدا کردن بارگذاری داده از رندر UI — با فیلتر سال تحصیلی ***
async function loadAllData() {
    try {
        const currentYear = window.activeAcademicYear;
        if (!currentYear) {
            console.log('⏸️ بارگذاری متوقف شد: سال تحصیلی انتخاب نشده.');
            return;
        }
        
        console.log('🔄 در حال بارگذاری داده‌های سال تحصیلی: ' + currentYear);

        // ۱. خواندن مشخصات کلاس برای این سال
        const classData = await getClassProfile(currentYear);
        if (classData) {
            if (classData.scheduleActiveDays && Array.isArray(classData.scheduleActiveDays)) {
                window.scheduleActiveDays = classData.scheduleActiveDays;
            }
            if (classData.schedulePeriodsCount) {
                window.schedulePeriodsCount = parseInt(classData.schedulePeriodsCount);
            }
        } else {
            // اگر مشخصات کلاس وجود ندارد، مقادیر پیش‌فرض
            window.scheduleActiveDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه'];
            window.schedulePeriodsCount = 5;
        }

        // ۲. خواندن داده‌های فیلترشده بر اساس سال تحصیلی
        window.allStudentsData = await getAllDataByYear('students', currentYear);
        window.allGroupsData = await getAllDataByYear('groups', currentYear);
        window.allSubjectsData = await getAllDataByYear('subjects', currentYear);
        window.allRecordsData = await getAllDataByYear('records', currentYear);
        window.allSessionsData = await getAllDataByYear('sessions', currentYear);
        
        // ۳. حضور و غیاب‌های مربوط به جلسات این سال
        const allAttendance = await getAllData('attendance');
        const validSessionIds = window.allSessionsData.map(s => s.id);
        window.allAttendanceData = allAttendance.filter(a => validSessionIds.includes(a.sessionId));
        
        // ۴. برنامه هفتگی این سال
        window.allWeeklyScheduleData = await getAllDataByYear('weeklySchedule', currentYear);
        // تبدیل به فرمت قبلی (day, periods) برای سازگاری
        window.allWeeklyScheduleData = window.allWeeklyScheduleData.map(sched => ({
            ...sched,
            day: sched.day || (sched.id ? sched.id.split('_')[1] : null)
        }));
        
        // ۵. آیتم‌های ارزشیابی این سال
        assessmentItems = await getAllDataByYear('assessmentItems', currentYear);
        window.allAssessmentItems = assessmentItems;
        
        // ۶. تنظیمات پشتیبان‌گیری این سال
        currentBackupSettings = await getBackupSettings(currentYear);

        // ۷. رندر UI
        renderUI();

        console.log('✅ بارگذاری داده‌های سال ' + currentYear + ' تکمیل شد.');
        console.log('   دانش‌آموزان: ' + window.allStudentsData.length);
        console.log('   دروس: ' + window.allSubjectsData.length);
        console.log('   گروه‌ها: ' + window.allGroupsData.length);
        console.log('   رکوردها: ' + window.allRecordsData.length);
        console.log('   جلسات: ' + window.allSessionsData.length);
        console.log('   آیتم‌های ارزشیابی: ' + window.allAssessmentItems.length);
        
    } catch (e) { 
        console.error('خطا در بارگذاری داده‌ها:', e); 
        showToast('خطا در بارگذاری داده‌ها.', 'error');
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
    } catch (e) {
        console.error('خطا در رندر UI:', e);
    }
}

function jalaliToDateString(jy, jm, jd) {
    return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

// ==========================================
// توابع مدیریت آیتم‌ها
// ==========================================
function openItemManagementModal() {
    const modal = document.getElementById('item-management-modal');
    if (modal) modal.classList.add('show');
    renderItemsList();
    resetItemForm();
}

function closeItemManagementModal() {
    const modal = document.getElementById('item-management-modal');
    if (modal) modal.classList.remove('show');
    loadAllData();
}

function renderItemsList() {
    const container = document.getElementById('items-list-container');
    if (!container) return;
    if (assessmentItems.length === 0) { container.innerHTML = '<p style="text-align:center;">هیچ آیتمی یافت نشد.</p>'; return; }
    container.innerHTML = '';
    assessmentItems.forEach(item => {
        let typeName = item.type === 'level' ? 'سطح محور' : item.type === 'count' ? 'شمارشی' : item.type === 'free' ? 'آزاد' : item.type === 'fixed' ? 'ثابت' : 'ویژه (قرآن)';
        const isSystem = item.type === 'quran';
        container.innerHTML += `
            <div class="item-management-row">
                <div><strong>${item.title}</strong> <span style="font-size:0.8rem; color:var(--text-muted);">(${typeName})</span></div>
                <div style="display:flex; gap:5px;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="editItem('${item.id}')" ${isSystem ? 'disabled title="سیستمی"' : ''}>✏️</button>
                    <button type="button" class="btn btn-danger btn-sm" onclick="deleteCustomItem('${item.id}')" ${isSystem ? 'disabled title="سیستمی"' : ''}>🗑️</button>
                </div>
            </div>
        `;
    });
}

function resetItemForm() {
    const form = document.getElementById('item-manager-form');
    if (form) form.reset();
    const editId = document.getElementById('editItemId');
    if (editId) editId.value = '';
    const title = document.getElementById('item-form-title');
    if (title) title.textContent = '➕ افزودن آیتم جدید';
    const levelsContainer = document.getElementById('levels-container');
    if (levelsContainer) levelsContainer.innerHTML = '';
    const placeholder = document.getElementById('itemLevelPlaceholder');
    if (placeholder) placeholder.value = '';
    const typeLevel = document.getElementById('item-type-level');
    if (typeLevel) typeLevel.style.display = 'none';
    const typeCount = document.getElementById('item-type-count');
    if (typeCount) typeCount.style.display = 'none';
    const typeFree = document.getElementById('item-type-free');
    if (typeFree) typeFree.style.display = 'none';
    const itemTitle = document.getElementById('itemTitle');
    if (itemTitle) itemTitle.readOnly = false;
}

function toggleItemTypeFields() {
    const typeEl = document.getElementById('itemType');
    if (!typeEl) return;
    const type = typeEl.value;
    const typeLevel = document.getElementById('item-type-level');
    const typeCount = document.getElementById('item-type-count');
    const typeFree = document.getElementById('item-type-free');
    if (typeLevel) typeLevel.style.display = type === 'level' ? 'block' : 'none';
    if (typeCount) typeCount.style.display = type === 'count' ? 'block' : 'none';
    if (typeFree) typeFree.style.display = type === 'free' ? 'block' : 'none';
    const levelsContainer = document.getElementById('levels-container');
    if (type === 'level' && levelsContainer && levelsContainer.children.length === 0) {
        addLevelRow(); addLevelRow(); 
    }
}

function addLevelRow(name = '', score = '') {
    const container = document.getElementById('levels-container');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'level-row-input';
    row.innerHTML = `
        <input type="text" class="form-control level-name" placeholder="نام سطح" value="${name}">
        <input type="number" class="form-control level-score" placeholder="امتیاز" value="${score}">
        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">✖</button>
    `;
    container.appendChild(row);
}

async function editItem(id) {
    const item = assessmentItems.find(i => i.id === id);
    if (!item) { showToast('آیتم یافت نشد.', 'error'); return; }
    const editId = document.getElementById('editItemId');
    if (editId) editId.value = item.id;
    const titleEl = document.getElementById('itemTitle');
    if (titleEl) titleEl.value = item.title;
    const typeEl = document.getElementById('itemType');
    if (typeEl) typeEl.value = item.type;
    const formTitle = document.getElementById('item-form-title');
    if (formTitle) formTitle.textContent = '✏️ ویرایش آیتم';
    const typeLevel = document.getElementById('item-type-level');
    if (typeLevel) typeLevel.style.display = 'none';
    const typeCount = document.getElementById('item-type-count');
    if (typeCount) typeCount.style.display = 'none';
    const typeFree = document.getElementById('item-type-free');
    if (typeFree) typeFree.style.display = 'none';
    if (item.type === 'level') {
        if (typeLevel) typeLevel.style.display = 'block';
        const placeholder = document.getElementById('itemLevelPlaceholder');
        if (placeholder) placeholder.value = item.placeholder || 'انتخاب سطح عملکرد:';
        const container = document.getElementById('levels-container');
        if (container) {
            container.innerHTML = '';
            item.levels.forEach(l => addLevelRow(l.name, l.score));
        }
    } else if (item.type === 'count') {
        if (typeCount) typeCount.style.display = 'block';
        const unitScore = document.getElementById('itemUnitScore');
        if (unitScore) unitScore.value = item.unitScore;
        const placeholder = document.getElementById('itemCountPlaceholder');
        if (placeholder) placeholder.value = item.placeholder || '';
    } else if (item.type === 'free') {
        if (typeFree) typeFree.style.display = 'block';
        const placeholder = document.getElementById('itemFreePlaceholder');
        if (placeholder) placeholder.value = item.placeholder || '';
    }
}

async function saveItem(e) {
    if (e) e.preventDefault();
    
    const idEl = document.getElementById('editItemId');
    const titleEl = document.getElementById('itemTitle');
    const typeEl = document.getElementById('itemType');
    if (!idEl || !titleEl || !typeEl) return;
    
    const currentYear = window.activeAcademicYear;
    const editingId = idEl.value;
    const title = titleEl.value.trim();
    const type = typeEl.value;
    
    if (!title) { showToast('عنوان آیتم را وارد کنید.', 'error'); return; }
    if (!type) { showToast('نوع آیتم را انتخاب کنید.', 'error'); return; }
    
    // بررسی سقف آیتم‌ها (بدون احتساب آیتم‌های سیستمی)
    const customItems = assessmentItems.filter(i => i.type !== 'quran' && i.type !== 'fixed' && i.type !== 'free');
    if (!editingId && customItems.length >= 16) {
        showToast('حداکثر تعداد مجاز آیتم ارزشیابی سفارشی (۱۶ آیتم) تکمیل شده است.', 'error');
        return;
    }
    
    const oldItem = editingId ? assessmentItems.find(i => i.id === editingId) : null;
    const oldTitle = oldItem ? oldItem.title : null;

    let itemData = { title, type, academicYear: currentYear };
    
    if (editingId) {
        itemData.id = editingId;
    } else {
        itemData.id = currentYear + '_item_' + Date.now();
    }
    
    if (type === 'level') {
        const placeholder = document.getElementById('itemLevelPlaceholder');
        itemData.placeholder = (placeholder && placeholder.value) || 'انتخاب سطح عملکرد:';
        const levels = [];
        const rows = document.querySelectorAll('#levels-container .level-row-input');
        rows.forEach(row => {
            const name = row.querySelector('.level-name').value.trim();
            const score = parseInt(row.querySelector('.level-score').value);
            if (name && !isNaN(score)) levels.push({ name, score });
        });
        if (levels.length === 0) { showToast('حداقل یک سطح با نام و امتیاز تعریف کنید.', 'error'); return; }
        itemData.levels = levels;
    } else if (type === 'count') {
        const unitScore = document.getElementById('itemUnitScore');
        const placeholder = document.getElementById('itemCountPlaceholder');
        itemData.unitScore = parseInt(unitScore ? unitScore.value : 10);
        itemData.placeholder = placeholder ? placeholder.value : '';
    } else if (type === 'free') {
        const placeholder = document.getElementById('itemFreePlaceholder');
        itemData.placeholder = placeholder ? placeholder.value : '';
    }
    
    try {
        await saveData('assessmentItems', itemData);
        
        // اگر نام آیتم تغییر کرد، رکوردهای مرتبط را هم آپدیت کن
        if (oldTitle && oldTitle !== title) {
            const yearRecords = await getAllDataByYear('records', currentYear);
            let updatedCount = 0;
            for (let rec of yearRecords) {
                if (rec.itemName === oldTitle) {
                    rec.itemName = title;
                    await saveData('records', rec);
                    updatedCount++;
                }
            }
            if (updatedCount > 0) {
                showToast(`نام آیتم در ${toPersianNumber(updatedCount)} رکورد قبلی نیز به‌روزرسانی شد.`, 'info');
            }
        }

        showToast('آیتم با موفقیت ذخیره شد!', 'success');
        
        // بارگذاری مجدد
        const freshItems = await getAllDataByYear('assessmentItems', currentYear);
        window.allAssessmentItems = freshItems;
        assessmentItems = freshItems;
        
        renderItemsList();
        resetItemForm();
        
        // آپدیت انتخابگرهای آیتم
        const itemSelect = document.getElementById('recordItem');
        if (itemSelect) {
            itemSelect.innerHTML = '<option value="" disabled selected>روش سنجشی را انتخاب کنید!</option>' + freshItems.map(i => `<option value="${i.id}">${i.title}</option>`).join('');
        }
        const editItemSelect = document.getElementById('editRecordItem');
        if (editItemSelect) {
            editItemSelect.innerHTML = '<option value="" disabled selected>انتخاب کنید...</option>' + freshItems.map(i => `<option value="${i.id}">${i.title}</option>`).join('');
        }

        if (oldTitle && oldTitle !== title) {
            await loadAllData();
        }
        
        if (typeof clearFormDirty === 'function') clearFormDirty();

    } catch (error) { 
        console.error(error); 
        showToast('خطا در ذخیره آیتم!', 'error'); 
    }
}

async function deleteCustomItem(id) {
    if(!confirm('آیا از حذف این آیتم مطمئن هستید؟')) return;
    try {
        const currentYear = window.activeAcademicYear;
        await deleteData('assessmentItems', id);
        showToast('آیتم حذف شد.', 'success');
        const freshItems = await getAllDataByYear('assessmentItems', currentYear);
        window.allAssessmentItems = freshItems;
        assessmentItems = freshItems;
        renderItemsList();
        const itemSelect = document.getElementById('recordItem');
        if (itemSelect) itemSelect.innerHTML = '<option value="" disabled selected>روش سنجشی را انتخاب کنید!</option>' + freshItems.map(i => `<option value="${i.id}">${i.title}</option>`).join('');
        const editItemSelect = document.getElementById('editRecordItem');
        if (editItemSelect) editItemSelect.innerHTML = '<option value="" disabled selected>انتخاب کنید...</option>' + freshItems.map(i => `<option value="${i.id}">${i.title}</option>`).join('');
    } catch (e) { console.error(e); showToast('خطا در حذف آیتم!', 'error'); }
}

async function exportData() {
    try {
        const data = await exportAllData();
        const currentYear = window.activeAcademicYear || 'unknown';
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); 
        a.href = url; 
        a.download = `kosha_backup_${currentYear}_${new Date().toISOString().slice(0,10)}.json`; 
        a.click();
        URL.revokeObjectURL(url);
        localStorage.setItem('kosha-last-backup', Date.now());
        checkBackupReminder(); 
        showToast('فایل پشتیبان دانلود شد. آن را در جای امنی نگه دارید.', 'info');
    } catch (e) { showToast('خطا در تولید فایل پشتیبان!', 'error'); }
}

async function importData(event) {
    const file = event.target.files[0]; 
    if (!file) return;
    
    const isConfirmed = confirm('⚠️ هشدار مهم:\n\nبا بازیابی این فایل، تمام اطلاعات فعلی شما (از جمله تغییرات و آیتم‌های جدید) پاک شده و با اطلاعات داخل فایل بکاپ جایگزین می‌شود.\n\nآیا مطمئن هستید؟');
    
    if (!isConfirmed) {
        event.target.value = ''; 
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try { 
            const data = JSON.parse(e.target.result); 
            await importAllData(data); 
            
            showToast('اطلاعات با موفقیت بازیابی شد! در حال بارگذاری مجدد...', 'success'); 
            
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        }
        catch (err) { 
            console.error(err);
            showToast('فایل نامعتبر! تغییرات لغو شد.', 'error'); 
        }
        event.target.value = ''; 
    };
    reader.readAsText(file);
}

function changePage(section, direction) {
    if (section === 'students') { currentPage.students += direction; if(typeof renderStudentsList === 'function') renderStudentsList(); }
    else if (section === 'records') { currentPage.records += direction; if(typeof loadAssessmentRecords === 'function') loadAssessmentRecords(); }
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((reg) => {
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) showUpdateToast(newWorker);
                });
            });
        });
    });
}

function showUpdateToast(newWorker) {
    const toast = document.createElement('div');
    toast.className = 'toast-container';
    toast.innerHTML = `<span>🚀 نسخه جدید!</span><button class="toast-btn" id="update-btn">به‌روزرسانی</button>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    document.getElementById('update-btn').addEventListener('click', () => {
        if (newWorker) newWorker.postMessage({ action: 'skipWaiting' });
        setTimeout(() => window.location.reload(), 500);
    });
}