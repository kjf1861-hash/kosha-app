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
window.activeAcademicYear = localStorage.getItem('kosha-active-academic-year') || '1405-1406'; 

window.scheduleActiveDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه'];
window.schedulePeriodsCount = 5;

let currentStudentView = 'flat';
let currentPage = { students: 1, records: 1, reports: 1 };
const itemsPerPage = 40;

// *** متغیرهای مدیریت تغییرات ذخیره‌نشده ***
window.isFormDirty = false;
window.pendingExitAction = null;
window.currentFormName = '';

// *** متغیرهای پشتیبان‌گیری خودکار ***
let autoBackupTimer = null;
const AUTO_BACKUP_DELAY = 2000;
let currentBackupSettings = null;
let periodCalendarState = { year: 1405, month: 7, selectedDate: '' };
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
// ✅ پشتیبان‌گیری خودکار
// ==========================================
window.triggerAutoBackup = function() {
    if (autoBackupTimer) clearTimeout(autoBackupTimer);
    autoBackupTimer = setTimeout(async () => {
        try {
            const allData = await exportAllData();
            localStorage.setItem('kosha-emergency-backup', JSON.stringify(allData));
            localStorage.setItem('kosha-emergency-backup-time', Date.now().toString());
        } catch (e) { console.warn('پشتیبان‌گیری خودکار:', e); }
    }, AUTO_BACKUP_DELAY);
};

function checkEmergencyBackup() {
    try {
        const backupStr = localStorage.getItem('kosha-emergency-backup');
        const backupTimeStr = localStorage.getItem('kosha-emergency-backup-time');
        if (!backupStr || !backupTimeStr) return;
        console.log('💡 نسخه اضطراری موجود است.');
    } catch (e) { console.warn(e); }
}

async function restoreFromEmergencyBackup() {
    if (!confirm('⚠️ هشدار مهم:\n\nبا بازیابی این نسخه، تمام اطلاعات فعلی شما پاک شده و با نسخه خودکار جایگزین می‌شود.\n\nآیا مطمئن هستید؟')) return;
    try {
        const backupStr = localStorage.getItem('kosha-emergency-backup');
        if (!backupStr) { showToast('هیچ نسخه خودکاری یافت نشد.', 'error'); return; }
        const data = JSON.parse(backupStr);
        await importAllData(data);
        showToast('نسخه خودکار بازیابی شد! در حال بارگذاری...', 'success');
        setTimeout(() => window.location.reload(), 1500);
    } catch (e) { console.error(e); showToast('خطا در بازیابی.', 'error'); }
}

function checkBackupReminder() {
    try {
        const lastBackup = localStorage.getItem('kosha-last-backup');
        const statusEl = document.getElementById('backup-status');
        if (!lastBackup) {
            if (statusEl) statusEl.innerHTML = 'آخرین پشتیبان‌گیری: <strong style="color:red;">هرگز!</strong>';
            setTimeout(() => showToast('لطفاً از داده‌های خود پشتیبان بگیرید.', 'info'), 4000);
        } else {
            const daysDiff = Math.floor((Date.now() - parseInt(lastBackup)) / (1000 * 60 * 60 * 24));
            if (statusEl) statusEl.innerHTML = `آخرین پشتیبان‌گیری: <strong>${toPersianNumber(daysDiff)} روز پیش</strong>`;
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
// ✅ تنظیمات پشتیبان‌گیری و بازه‌ها
// ==========================================
async function initBackupSettingsForm() {
    currentBackupSettings = await getBackupSettings();
    const reminderTypeEl = document.getElementById('backupReminderType');
    if (reminderTypeEl) reminderTypeEl.value = currentBackupSettings.reminderType || 'off';
    renderPeriodsList();
    const ay = window.activeAcademicYear || '1405-1406';
    periodCalendarState.year = parseInt(ay.split('-')[0]);
    periodCalendarState.month = 7;
    periodCalendarState.selectedDate = '';
}

async function saveBackupSettings() {
    if (!currentBackupSettings) currentBackupSettings = await getBackupSettings();
    const reminderTypeEl = document.getElementById('backupReminderType');
    if (reminderTypeEl) currentBackupSettings.reminderType = reminderTypeEl.value;
    try {
        await saveData('backupSettings', currentBackupSettings);
        showToast('تنظیمات ذخیره شد.', 'success');
    } catch (e) { showToast('خطا در ذخیره.', 'error'); }
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
                    <button type="button" class="btn btn-danger btn-sm" onclick="deletePeriod(${index})" style="padding: 2px 8px;">🗑️</button>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">از <strong>${toPersianNumber(period.startDate)}</strong> تا <strong>${toPersianNumber(period.endDate)}</strong></div>
            </div>`;
    });
    container.innerHTML = html;
}

async function deletePeriod(index) {
    if (!confirm('آیا از حذف این بازه مطمئن هستید؟')) return;
    if (!currentBackupSettings) currentBackupSettings = await getBackupSettings();
    currentBackupSettings.periods.splice(index, 1);
    try {
        await saveData('backupSettings', currentBackupSettings);
        renderPeriodsList();
        showToast('بازه حذف شد.', 'success');
    } catch (e) { showToast('خطا.', 'error'); }
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
    periodCalendarState.year = parseInt(ay.split('-')[0]);
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
    showToast(target === 'start' ? 'تاریخ شروع را انتخاب کنید.' : 'تاریخ پایان را انتخاب کنید.', 'info');
}

// ==========================================
// ادامه تنظیمات بازه‌ها و تقویم
// ==========================================
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
        </select>`;
    
    const grid = document.getElementById('period-calendar-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const firstDay = getJalaliFirstDayOfWeek(periodCalendarState.year, periodCalendarState.month);
    const daysInMonth = getJalaliDaysInMonth(periodCalendarState.year, periodCalendarState.month);
    const startBound = `${startYear}/07/01`;
    const endBound = `${endYear}/06/31`;
    
    for (let i = 0; i < firstDay; i++) grid.innerHTML += `<div class="calendar-day empty"></div>`;
    
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
        if (!inAcademicYear) classes += ' outside-range';
        const clickHandler = inAcademicYear ? `onclick="selectPeriodCalendarDay('${dateStr}')"` : `onclick="showToast('این تاریخ خارج از بازه سال تحصیلی است.', 'error')"`;
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
    if (!title) { showToast('عنوان بازه را وارد کنید.', 'error'); return; }
    if (!startDate || !endDate) { showToast('تاریخ شروع و پایان را انتخاب کنید.', 'error'); return; }
    if (!window.isValidJalaliDateString(startDate) || !window.isValidJalaliDateString(endDate)) { showToast('تاریخ معتبر نیست.', 'error'); return; }
    if (startDate >= endDate) { showToast('تاریخ شروع باید قبل از پایان باشد.', 'error'); return; }
    
    const ay = window.activeAcademicYear || '1405-1406';
    const [startYear, endYear] = ay.split('-');
    const startBound = `${startYear}/07/01`;
    const endBound = `${endYear}/06/31`;
    if (startDate < startBound || endDate > endBound) { showToast(`تاریخ‌ها باید در بازه سال تحصیلی باشند.`, 'error'); return; }
    
    if (!currentBackupSettings) currentBackupSettings = await getBackupSettings();
    const periods = currentBackupSettings.periods || [];
    for (let i = 0; i < periods.length; i++) {
        if (currentEditingPeriodIndex === i) continue;
        const existing = periods[i];
        if (!(endDate < existing.startDate || startDate > existing.endDate)) { showToast(`همپوشانی با بازه «${existing.title}».`, 'error'); return; }
    }
    
    const newPeriod = { title: title, startDate: startDate, endDate: endDate, lastReminded: null };
    if (currentEditingPeriodIndex >= 0) currentBackupSettings.periods[currentEditingPeriodIndex] = newPeriod;
    else {
        if (!currentBackupSettings.periods) currentBackupSettings.periods = [];
        currentBackupSettings.periods.push(newPeriod);
    }
    try {
        await saveData('backupSettings', currentBackupSettings);
        showToast('بازه ذخیره شد.', 'success');
        closePeriodEditor();
        renderPeriodsList();
    } catch (e) { showToast('خطا در ذخیره.', 'error'); }
}

async function checkPeriodReminders() {
    try {
        currentBackupSettings = await getBackupSettings();
        const now = Date.now();
        const reminderType = currentBackupSettings.reminderType;
        if (reminderType && reminderType !== 'off') {
            const lastReminder = currentBackupSettings.lastReminderDate || 0;
            const daysSinceLast = (now - lastReminder) / (1000 * 60 * 60 * 24);
            let shouldRemind = false;
            let reminderText = '';
            if (reminderType === 'daily' && daysSinceLast >= 1) { shouldRemind = true; reminderText = 'روزانه'; }
            else if (reminderType === 'weekly' && daysSinceLast >= 7) { shouldRemind = true; reminderText = 'هفتگی'; }
            else if (reminderType === 'monthly' && daysSinceLast >= 30) { shouldRemind = true; reminderText = 'ماهانه'; }
            if (shouldRemind) { showReminderModal(`موعد پشتیبان‌گیری ${reminderText} فرا رسیده است.`, 'general'); return; }
        }
        const todayDate = getTodayJalali();
        const periods = currentBackupSettings.periods || [];
        for (let i = 0; i < periods.length; i++) {
            const period = periods[i];
            if (todayDate >= period.endDate && (!period.lastReminded || period.lastReminded < period.endDate)) {
                showReminderModal(`بازه «${period.title}» به پایان رسید.`, 'period', i); return;
            }
        }
    } catch (e) { console.error(e); }
}

function getTodayJalali() {
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const parts = formatter.formatToParts(now);
        let year, month, day;
        parts.forEach(p => {
            if (p.type === 'year') year = p.value.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).padStart(4, '0');
            if (p.type === 'month') month = p.value.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).padStart(2, '0');
            if (p.type === 'day') day = p.value.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).padStart(2, '0');
        });
        return `${year}/${month}/${day}`;
    } catch (e) { return '1405/01/01'; }
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
        const a = document.createElement('a'); a.href = url; a.download = filename + '.json'; a.click();
        URL.revokeObjectURL(url);
        localStorage.setItem('kosha-last-backup', Date.now());
        checkBackupReminder();
        closeReminderModal();
        showToast('فایل پشتیبان دانلود شد.', 'success');
    } catch (e) { showToast('خطا در تولید پشتیبان.', 'error'); }
}

async function snoozeReminder() {
    try {
        if (reminderModalContext.type === 'period' && currentBackupSettings && currentBackupSettings.periods[reminderModalContext.periodIndex]) { }
        else {
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
        'record-form': 'شما در حال ثبت یک ارزشیابی جدید هستید.',
        'exam-editor-form': 'شما در حال ساخت یا ویرایش یک آزمون هستید.',
        'class-form': 'تغییرات تنظیمات کلاس ذخیره نشده است.',
        'student-form': 'اطلاعات دانش‌آموز ذخیره نشده است.',
        'group-form': 'اطلاعات گروه ذخیره نشده است.',
        'lesson-form': 'اطلاعات درس ذخیره نشده است.',
        'quran-form': 'اطلاعات پویش قرآن ذخیره نشده است.',
        'special-reward-form': 'اطلاعات تشویق ذخیره نشده است.',
        'handwriting-reward-form': 'اطلاعات خوش‌خط‌نویسی ذخیره نشده است.'
    };
    return messages[formName] || 'شما تغییرات ذخیره‌نشده دارید.';
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
    if (!window.isFormDirty) { if (callback) callback(); return; }
    window.pendingExitAction = callback;
    const messageEl = document.getElementById('exit-confirm-message');
    if (messageEl) messageEl.textContent = getExitMessage(window.currentFormName);
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
    const formSelectors = ['#record-form', '#exam-editor-form', '#class-form', '#student-form', '#group-form', '#lesson-form', '#quran-form', '#special-reward-form', '#handwriting-reward-form'];
    formSelectors.forEach(selector => {
        const form = document.querySelector(selector);
        if (form) {
            form.addEventListener('input', function() { markFormDirty(form.id); });
            form.addEventListener('change', function() { markFormDirty(form.id); });
        }
    });
    window.addEventListener('beforeunload', function(e) {
        if (window.isFormDirty) {
            e.preventDefault();
            e.returnValue = 'شما تغییرات ذخیره‌نشده دارید.';
            return e.returnValue;
        }
    });
}

// ==========================================
// initAppEvents، initApp و بارگذاری داده‌ها
// ==========================================
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
    if (typeof applyEmojiRestriction === 'function') {
        applyEmojiRestriction('classSymbol');
        applyEmojiRestriction('lessonSymbol');
        applyEmojiRestriction('groupSymbol');
    }
    
    attachDirtyListeners();
    try { initAppEvents(); } catch (e) { console.error(e); }
    
    try { await loadAllData(); } catch (e) { console.error(e); }
    
    checkBackupReminder();
    checkEmergencyBackup();
    setTimeout(() => { checkPeriodReminders(); }, 2000);
    
    try {
        if (typeof loadExamsData === 'function') await loadExamsData();
        if (typeof renderExamsData === 'function') renderExamsData();
    } catch (error) { }
}

// ==========================================
// بارگذاری داده‌ها (بدون ریستارت!)
// ==========================================
async function loadAllData() {
    try {
        const classData = await getDataById('classProfile', 1);
        if (classData) {
            // ✅ فقط اگر academicYear وجود نداشت، از حافظه بخوان
            if (classData.academicYear) {
                window.activeAcademicYear = classData.academicYear;
                localStorage.setItem('kosha-active-academic-year', classData.academicYear);
            }
            if (classData.scheduleActiveDays) window.scheduleActiveDays = classData.scheduleActiveDays;
            if (classData.schedulePeriodsCount) window.schedulePeriodsCount = parseInt(classData.schedulePeriodsCount);
            
            // ✅ پر کردن فرم تنظیمات با داده‌های ذخیره شده
            if (typeof populateCurrentClassProfile === 'function') {
                populateCurrentClassProfile(classData);
            }
        }

        window.allStudentsData = await getAllData('students');
        window.allGroupsData = await getAllData('groups');
        window.allSubjectsData = await getAllData('subjects');
        window.allRecordsData = await getAllData('records');
        window.allSessionsData = await getAllData('sessions');
        
        const validSessionIds = window.allSessionsData.map(s => s.id);
        const allAttendance = await getAllData('attendance');
        window.allAttendanceData = allAttendance.filter(a => validSessionIds.includes(a.sessionId));
        
        window.allWeeklyScheduleData = await getAllData('weeklySchedule');
        assessmentItems = await getAllData('assessmentItems');
        window.allAssessmentItems = assessmentItems;
        currentBackupSettings = await getBackupSettings();

        renderUI();
    } catch (e) { console.error('خطا در بارگذاری داده‌ها:', e); }
}

        window.allStudentsData = await getAllData('students');
        window.allGroupsData = await getAllData('groups');
        window.allSubjectsData = await getAllData('subjects');
        window.allRecordsData = await getAllData('records');
        window.allSessionsData = await getAllData('sessions');
        
        const validSessionIds = window.allSessionsData.map(s => s.id);
        const allAttendance = await getAllData('attendance');
        window.allAttendanceData = allAttendance.filter(a => validSessionIds.includes(a.sessionId));
        
        window.allWeeklyScheduleData = await getAllData('weeklySchedule');
        assessmentItems = await getAllData('assessmentItems');
        window.allAssessmentItems = assessmentItems;
        currentBackupSettings = await getBackupSettings();

        renderUI();
    } catch (e) { console.error('خطا در بارگذاری داده‌ها:', e); }
}

function renderUI() {
    try {
        if (typeof renderDashboardData === 'function') renderDashboardData();
        if (typeof renderStudentsList === 'function') renderStudentsList();
        if (typeof renderLessonData === 'function') renderLessonData();
        if (typeof renderGroupData === 'function') renderGroupData();
        if (typeof renderSessionData === 'function') renderSessionData();
        if (typeof renderScoreData === 'function') renderScoreData();
    } catch (e) { }
}

function jalaliToDateString(jy, jm, jd) {
    return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

// ==========================================
// مدیریت آیتم‌ها
// ==========================================
function openItemManagementModal() {
    document.getElementById('item-management-modal').classList.add('show');
    renderItemsList();
    resetItemForm();
}

function closeItemManagementModal() {
    document.getElementById('item-management-modal').classList.remove('show');
    loadAllData();
}

function renderItemsList() {
    const container = document.getElementById('items-list-container');
    if (!container) return;
    if (assessmentItems.length === 0) { container.innerHTML = '<p style="text-align:center;">هیچ آیتمی یافت نشد.</p>'; return; }
    container.innerHTML = '';
    assessmentItems.forEach(item => {
        let typeName = item.type === 'level' ? 'سطح محور' : item.type === 'count' ? 'شمارشی' : item.type === 'free' ? 'آزاد' : 'ویژه';
        container.innerHTML += `
            <div class="item-management-row">
                <div><strong>${item.title}</strong> <span style="font-size:0.8rem; color:var(--text-muted);">(${typeName})</span></div>
                <div style="display:flex; gap:5px;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="editItem(${item.id})" ${item.type === 'quran' ? 'disabled' : ''}>✏️</button>
                    <button type="button" class="btn btn-danger btn-sm" onclick="deleteCustomItem(${item.id})" ${item.type === 'quran' ? 'disabled' : ''}>🗑️</button>
                </div>
            </div>`;
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
    if (!item) return;
    document.getElementById('editItemId').value = item.id;
    document.getElementById('itemTitle').value = item.title;
    document.getElementById('itemType').value = item.type;
    document.getElementById('item-form-title').textContent = '✏️ ویرایش آیتم';
    const typeLevel = document.getElementById('item-type-level');
    if (typeLevel) typeLevel.style.display = 'none';
    const typeCount = document.getElementById('item-type-count');
    if (typeCount) typeCount.style.display = 'none';
    const typeFree = document.getElementById('item-type-free');
    if (typeFree) typeFree.style.display = 'none';
    if (item.type === 'level') {
        if (typeLevel) typeLevel.style.display = 'block';
        const placeholder = document.getElementById('itemLevelPlaceholder');
        if (placeholder) placeholder.value = item.placeholder || '';
        const container = document.getElementById('levels-container');
        if (container) { container.innerHTML = ''; item.levels.forEach(l => addLevelRow(l.name, l.score)); }
    } else if (item.type === 'count') {
        if (typeCount) typeCount.style.display = 'block';
        document.getElementById('itemUnitScore').value = item.unitScore;
        document.getElementById('itemCountPlaceholder').value = item.placeholder || '';
    } else if (item.type === 'free') {
        if (typeFree) typeFree.style.display = 'block';
        document.getElementById('itemFreePlaceholder').value = item.placeholder || '';
    }
}

async function saveItem(e) {
    if (e) e.preventDefault();
    const idEl = document.getElementById('editItemId');
    const titleEl = document.getElementById('itemTitle');
    const typeEl = document.getElementById('itemType');
    if (!idEl || !titleEl || !typeEl) return;
    
    const id = idEl.value;
    const title = titleEl.value.trim();
    const type = typeEl.value;
    if (!title) { showToast('عنوان آیتم را وارد کنید.', 'error'); return; }
    if (!type) { showToast('نوع آیتم را انتخاب کنید.', 'error'); return; }
    if (!id && assessmentItems.length >= 16) { showToast('حداکثر ۱۶ آیتم مجاز است.', 'error'); return; }
    
    const oldItem = id ? assessmentItems.find(i => i.id === parseInt(id)) : null;
    const oldTitle = oldItem ? oldItem.title : null;
    let itemData = { title, type };
    if (id) itemData.id = parseInt(id);
    else itemData.id = Date.now();
    
    if (type === 'level') {
        const placeholder = document.getElementById('itemLevelPlaceholder');
        itemData.placeholder = (placeholder && placeholder.value) || 'انتخاب سطح عملکرد:';
        const levels = [];
        document.querySelectorAll('#levels-container .level-row-input').forEach(row => {
            const name = row.querySelector('.level-name').value.trim();
            const score = parseInt(row.querySelector('.level-score').value);
            if (name && !isNaN(score)) levels.push({ name, score });
        });
        if (levels.length === 0) { showToast('حداقل یک سطح تعریف کنید.', 'error'); return; }
        itemData.levels = levels;
    } else if (type === 'count') {
        itemData.unitScore = parseInt(document.getElementById('itemUnitScore').value);
        itemData.placeholder = document.getElementById('itemCountPlaceholder').value;
    } else if (type === 'free') {
        itemData.placeholder = document.getElementById('itemFreePlaceholder').value;
    }
    
    try {
        await saveData('assessmentItems', itemData);
        if (oldTitle && oldTitle !== title) {
            const allRecords = await getAllData('records');
            for (let rec of allRecords) {
                if (rec.itemName === oldTitle) { rec.itemName = title; await saveData('records', rec); }
            }
        }
        showToast('آیتم ذخیره شد!', 'success');
        const freshItems = await getAllData('assessmentItems');
        assessmentItems = freshItems;
        window.allAssessmentItems = freshItems;
        renderItemsList();
        resetItemForm();
        clearFormDirty();
    } catch (error) { showToast('خطا در ذخیره آیتم!', 'error'); }
}

async function deleteCustomItem(id) {
    if(!confirm('آیا از حذف این آیتم مطمئن هستید؟')) return;
    try {
        await deleteData('assessmentItems', id);
        showToast('آیتم حذف شد.', 'success');
        const freshItems = await getAllData('assessmentItems');
        assessmentItems = freshItems;
        window.allAssessmentItems = freshItems;
        renderItemsList();
    } catch (e) { showToast('خطا در حذف آیتم!', 'error'); }
}

// ==========================================
// خروجی و ورودی
// ==========================================
async function exportData() {
    try {
        const data = await exportAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); 
        a.href = url; 
        a.download = `kosha_backup_${new Date().toISOString().slice(0,10)}.json`; 
        a.click();
        URL.revokeObjectURL(url);
        localStorage.setItem('kosha-last-backup', Date.now());
        checkBackupReminder(); 
        showToast('فایل پشتیبان دانلود شد.', 'info');
    } catch (e) { showToast('خطا در تولید فایل!', 'error'); }
}

async function importData(event) {
    const file = event.target.files[0]; 
    if (!file) return;
    if (!confirm('⚠️ هشدار: تمام اطلاعات فعلی پاک می‌شوند. مطمئنید؟')) { event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
        try { 
            await importAllData(JSON.parse(e.target.result)); 
            showToast('بازیابی شد! در حال بارگذاری...', 'success'); 
            setTimeout(() => window.location.reload(), 1000);
        } catch (err) { showToast('فایل نامعتبر!', 'error'); }
        event.target.value = ''; 
    };
    reader.readAsText(file);
}

function changePage(section, direction) {
    if (section === 'students') { currentPage.students += direction; if(typeof renderStudentsList === 'function') renderStudentsList(); }
    else if (section === 'records') { currentPage.records += direction; if(typeof loadAssessmentRecords === 'function') loadAssessmentRecords(); }
}

// ==========================================
// Service Worker
// ==========================================
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