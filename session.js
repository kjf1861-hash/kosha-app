// ==========================================
// فایل session.js — منطق تب جلسه
// ==========================================

let currentSessionId = null;
let currentSessionDay = null;
let currentSessionAttendanceState = {};
let currentAttReportFilter = 'class';

// متغیر حالت برنامه هفتگی
let currentScheduleMode = 'view'; // 'view' or 'edit'

const jalaliMonths = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const leapYears = [1408];

const officialHolidays = {
    1405: ["1405/01/01", "1405/01/02", "1405/01/03", "1405/01/04", "1405/01/12", "1405/01/13", "1405/01/21", "1405/01/23", "1405/02/01", "1405/02/09", "1405/03/05", "1405/03/06", "1405/03/14", "1405/03/15", "1405/03/25", "1405/04/02", "1405/04/04", "1405/04/12", "1405/04/20", "1405/05/09", "1405/06/01", "1405/07/13", "1405/08/27", "1405/09/15", "1405/10/25", "1405/11/19", "1405/11/22", "1405/12/29"],
    1406: ["1406/01/01", "1406/01/02", "1406/01/03", "1406/01/04", "1406/01/11", "1406/01/12", "1406/01/13", "1406/01/20", "1406/01/30", "1406/02/08", "1406/02/17", "1406/02/25", "1406/03/03", "1406/03/11", "1406/03/14", "1406/03/15", "1406/03/19", "1406/03/27", "1406/04/04", "1406/04/28", "1406/05/22", "1406/06/18", "1406/07/06", "1406/07/18", "1406/08/08", "1406/09/04", "1406/10/06", "1406/10/15", "1406/11/12", "1406/11/22", "1406/12/10"],
    1407: ["1407/01/01", "1407/01/02", "1407/01/03", "1407/01/04", "1407/01/12", "1407/01/13", "1407/01/31", "1407/02/02", "1407/02/10", "1407/02/18", "1407/02/26", "1407/03/05", "1407/03/13", "1407/03/14", "1407/03/15", "1407/03/21", "1407/03/29", "1407/04/06", "1407/05/05", "1407/05/24", "1407/06/15", "1407/07/01", "1407/07/13", "1407/08/03", "1407/08/22", "1407/08/30", "1407/09/09", "1407/09/19", "1407/10/08", "1407/10/17", "1407/11/07", "1407/11/16", "1407/11/22", "1407/12/14"],
    1408: ["1408/01/01", "1408/01/02", "1408/01/03", "1408/01/04", "1408/01/12", "1408/01/13", "1408/01/20", "1408/01/22", "1408/01/30", "1408/02/07", "1408/02/15", "1408/02/23", "1408/03/02", "1408/03/10", "1408/03/14", "1408/03/15", "1408/03/18", "1408/03/26", "1408/04/04", "1408/04/05", "1408/05/14", "1408/05/24", "1408/06/05", "1408/07/11", "1408/07/26", "1408/08/20", "1408/09/09", "1408/09/17", "1408/10/06", "1408/10/15", "1408/10/23", "1408/11/01", "1408/11/10", "1408/11/11", "1408/11/22", "1408/12/09"],
    1409: ["1409/01/01", "1409/01/02", "1409/01/03", "1409/01/04", "1409/01/10", "1409/01/12", "1409/01/13", "1409/01/20", "1409/01/28", "1409/02/05", "1409/02/13", "1409/02/21", "1409/03/02", "1409/03/10", "1409/03/14", "1409/03/15", "1409/03/18", "1409/03/26", "1409/04/03", "1409/04/11", "1409/04/23", "1409/05/10", "1409/06/15", "1409/06/25", "1409/07/12", "1409/07/25", "1409/08/14", "1409/08/24", "1409/09/22", "1409/10/11", "1409/10/20", "1409/10/29", "1409/11/07", "1409/11/08", "1409/11/22", "1409/12/06"],
    1410: ["1410/01/01", "1410/01/02", "1410/01/03", "1410/01/04", "1410/01/12", "1410/01/13", "1410/01/18", "1410/01/20", "1410/01/30", "1410/02/08", "1410/02/16", "1410/02/24", "1410/03/04", "1410/03/12", "1410/03/14", "1410/03/15", "1410/03/20", "1410/03/28", "1410/04/06", "1410/04/26", "1410/05/05", "1410/06/02", "1410/06/30", "1410/07/19", "1410/07/29", "1410/08/07", "1410/08/17", "1410/09/05", "1410/10/01", "1410/10/10", "1410/10/28", "1410/11/05", "1410/11/14", "1410/11/15", "1410/11/22", "1410/12/13"]
};

let currentCalendarYear = 1405;
let currentCalendarMonth = 1;
let selectedSessionDate = "";
let selectedSessionDayOfWeek = "";

function initSessionEvents() {}

async function renderSessionData() {
    initCalendar(); 
    toggleScheduleMode('view'); 
    generateAttendanceReports();
}

// ==========================================
// 1. برنامه هفتگی جدید (جدول و ویرایش)
// ==========================================
function toggleScheduleMode(mode) {
    currentScheduleMode = mode;
    const viewBtn = document.getElementById('btnScheduleViewMode');
    const editBtn = document.getElementById('btnScheduleEditMode');
    const viewContainer = document.getElementById('schedule-view-mode');
    const editContainer = document.getElementById('schedule-edit-mode');

    if (mode === 'view') {
        if(viewBtn) viewBtn.classList.add('active');
        if(editBtn) editBtn.classList.remove('active');
        if(viewContainer) viewContainer.style.display = 'block';
        if(editContainer) editContainer.style.display = 'none';
        renderScheduleView();
    } else {
        if(viewBtn) viewBtn.classList.remove('active');
        if(editBtn) editBtn.classList.add('active');
        if(viewContainer) viewContainer.style.display = 'none';
        if(editContainer) editContainer.style.display = 'block';
        renderScheduleEdit();
    }
}

function getPopulatedScheduleData() {
    const activeDays = window.scheduleActiveDays || [];
    
    const populatedDays = activeDays.filter(day => {
        const sched = window.allWeeklyScheduleData.find(s => s.day === day);
        return sched && sched.periods && sched.periods.some(p => p !== null && p !== undefined);
    });

    let maxPeriod = 0;
    populatedDays.forEach(day => {
        const sched = window.allWeeklyScheduleData.find(s => s.day === day);
        if (sched && sched.periods) {
            sched.periods.forEach((p, idx) => {
                if (p !== null && p !== undefined) {
                    if (idx + 1 > maxPeriod) maxPeriod = idx + 1;
                }
            });
        }
    });

    return {
        daysToShow: populatedDays.length > 0 ? populatedDays : activeDays,
        maxPeriodToShow: maxPeriod > 0 ? maxPeriod : (window.schedulePeriodsCount || 1)
    };
}

function renderScheduleView() {
    const table = document.getElementById('schedule-display-table');
    if (!table) return;

    const { daysToShow, maxPeriodToShow } = getPopulatedScheduleData();

    if (daysToShow.length === 0) {
        table.innerHTML = '<tbody><tr><td style="text-align:center; padding: 20px; color: var(--text-muted);">هنوز برنامه‌ای ثبت نشده است.</td></tr></tbody>';
        return;
    }

    let html = `<thead><tr><th>روز / زنگ</th>`;
    for (let i = 1; i <= maxPeriodToShow; i++) {
        html += `<th>زنگ ${i}</th>`;
    }
    html += `</tr></thead><tbody>`;

    daysToShow.forEach(day => {
        const daySchedule = window.allWeeklyScheduleData.find(s => s.day === day);
        const periods = daySchedule ? daySchedule.periods : [];

        html += `<tr><th>${day}</th>`;
        for (let i = 0; i < maxPeriodToShow; i++) {
            const subId = periods[i];
            if (subId) {
                const sub = window.allSubjectsData.find(s => s.id === subId);
                if (sub) {
                    html += `<td>${sub.symbol || ''} ${sub.name}</td>`;
                } else {
                    html += `<td class="empty-cell">-</td>`;
                }
            } else {
                html += `<td class="empty-cell">-</td>`;
            }
        }
        html += `</tr>`;
    });

    html += `</tbody>`;
    table.innerHTML = html;
}

function renderScheduleEdit() {
    const container = document.getElementById('schedule-edit-container');
    if (!container) return;

    const activeDays = window.scheduleActiveDays || [];
    const periodsCount = window.schedulePeriodsCount || 5;

    if (activeDays.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#dc2626;">هیچ روزی در تنظیمات انتخاب نکرده‌اید. لطفاً ابتدا از تنظیمات (⚙️) روزهای هفته را انتخاب کنید.</p>';
        return;
    }

    container.innerHTML = '';

    activeDays.forEach(day => {
        const daySchedule = window.allWeeklyScheduleData.find(s => s.day === day);
        const periods = daySchedule ? daySchedule.periods : [];

        let html = `
            <details class="schedule-edit-accordion">
                <summary>${day}</summary>
                <div class="schedule-edit-content">
        `;

        for (let i = 0; i < periodsCount; i++) {
            const currentSubId = periods[i] || '';
            html += `
                <div class="schedule-period-row">
                    <span>زنگ ${i + 1}:</span>
                    <select class="schedule-subject-select" data-day="${day}" data-period="${i}">
                        <option value="">-- خالی --</option>
                        ${window.allSubjectsData.map(s => `<option value="${s.id}" ${s.id == currentSubId ? 'selected' : ''}>${s.symbol || ''} ${s.name}</option>`).join('')}
                    </select>
                </div>
            `;
        }

        html += `</div></details>`;
        container.innerHTML += html;
    });
}

async function saveAllWeeklySchedules() {
    const selects = document.querySelectorAll('.schedule-subject-select');
    const newSchedule = {};

    selects.forEach(sel => {
        const day = sel.getAttribute('data-day');
        const periodIndex = parseInt(sel.getAttribute('data-period'));
        const subId = sel.value ? parseInt(sel.value) : null;

        if (!newSchedule[day]) {
            newSchedule[day] = [];
        }
        newSchedule[day][periodIndex] = subId;
    });

    try {
        await clearStore('weeklySchedule');
        
        for (const day in newSchedule) {
            await saveData('weeklySchedule', { day: day, periods: newSchedule[day] });
        }

        showToast('برنامه هفتگی با موفقیت ذخیره شد!', 'success');
        await loadAllData(); 
        toggleScheduleMode('view'); 
    } catch (e) {
        console.error(e);
        showToast('خطا در ذخیره برنامه هفتگی!', 'error');
    }
}

async function resetAllWeeklySchedules() {
    if (window.allWeeklyScheduleData.length === 0) {
        showToast('هیچ برنامه هفتگی برای حذف وجود ندارد.', 'error');
        return;
    }

    const confirm1 = confirm('⚠️ هشدار شدید:\n\nآیا مطمئن هستید که می‌خواهید کل برنامه هفتگی را حذف کنید؟');
    if (!confirm1) return;

    const confirm2 = confirm('🚨 آخرین هشدار!\n\nاین عمل غیرقابل بازگشت است. آیا ۱۰۰٪ مطمئن هستید؟');
    if (!confirm2) return;

    try {
        await clearStore('weeklySchedule');
        showToast('کل برنامه هفتگی با موفقیت حذف شد.', 'success');
        loadAllData();
    } catch (e) {
        console.error(e);
        showToast('خطا در حذف برنامه هفتگی!', 'error');
    }
}

function getScheduleDataMatrix() {
    const { daysToShow, maxPeriodToShow } = getPopulatedScheduleData();
    const matrix = [];

    daysToShow.forEach(day => {
        const daySchedule = window.allWeeklyScheduleData.find(s => s.day === day);
        const periods = daySchedule ? daySchedule.periods : [];
        const row = [day];
        for (let i = 0; i < maxPeriodToShow; i++) {
            const subId = periods[i];
            if (subId) {
                const sub = window.allSubjectsData.find(s => s.id === subId);
                row.push(sub ? `${sub.symbol || ''} ${sub.name}` : '-');
            } else {
                row.push('-');
            }
        }
        matrix.push(row);
    });

    return { matrix, maxPeriodToShow };
}

function exportScheduleCSV() {
    try {
        const { matrix, maxPeriodToShow } = getScheduleDataMatrix(); // اصلاح باگ
        if (matrix.length === 0) { showToast('برنامه‌ای برای خروجی وجود ندارد.', 'error'); return; }

        let csvContent = '"روز / زنگ"';
        for (let i = 1; i <= maxPeriodToShow; i++) {
            csvContent += `,"زنگ ${i}"`;
        }
        csvContent += "\r\n"; 

        matrix.forEach(row => {
            const rowData = row.map(cell => `"${cell}"`).join(',');
            csvContent += rowData + "\r\n";
        });

        // *** اصلاح نهایی و تضمینی برای اکسل (استفاده از UTF-16LE) ***
        const bom = new Uint8Array([0xFF, 0xFE]); // BOM مخصوص UTF-16LE
        const contentBytes = new Uint8Array(csvContent.length * 2);
        for (let i = 0; i < csvContent.length; i++) {
            const code = csvContent.charCodeAt(i);
            contentBytes[i * 2] = code & 0xFF;
            contentBytes[i * 2 + 1] = code >> 8;
        }
        
        const fullBytes = new Uint8Array(bom.length + contentBytes.length);
        fullBytes.set(bom, 0);
        fullBytes.set(contentBytes, bom.length);

        const blob = new Blob([fullBytes], { type: 'text/csv;charset=utf-16le;' }); 
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); 
        a.href = url; 
        a.download = `kosha_schedule_${new Date().toISOString().slice(0,10)}.csv`; 
        a.click();
        URL.revokeObjectURL(url);
        showToast('خروجی اکسل دانلود شد!', 'success');
    } catch (e) {
        console.error(e);
        showToast('خطا در تولید فایل اکسل.', 'error');
    }
}

// ... ادامه فایل (بدون تغییر) ...
function exportScheduleHTML() { /* ... */ }
function printSchedule() { /* ... */ }
function isLeapYear(year) { return leapYears.includes(year); }
function getDaysInMonth(year, month) {
    if (month <= 6) return 31;
    if (month <= 11) return 30;
    return isLeapYear(year) ? 30 : 29;
}
function getFirstDayOfWeek(year, month) {
    let daysPassed = 0;
    for (let y = 1405; y < year; y++) {
        daysPassed += isLeapYear(y) ? 366 : 365;
    }
    for (let m = 1; m < month; m++) {
        daysPassed += getDaysInMonth(year, m);
    }
    return daysPassed % 7;
}
function initCalendar() { /* ... */ }
function renderCalendarGrid() { /* ... */ }
function showOutsideRangeError() { /* ... */ }
function changeCalendarMonth(delta) { /* ... */ }
function changeCalendarYear() { /* ... */ }
function selectCalendarDay(day, dateStr) { /* ... */ }
async function createNewSession() { /* ... */ }
async function editSessionDate(sessionId, currentDate) { /* ... */ }
async function deleteSession(sessionId) { /* ... */ }
async function resetAllSessions() { /* ... */ }
async function openSessionDetails(sessionId) { /* ... */ }
function renderSessionDetails(schedule) { /* ... */ }
function setPeriodAttendance(periodNum, studentId, status, btnElement) { /* ... */ }
function setAllPeriodAttendance(periodNum, status) { /* ... */ }
async function saveAllSessionAttendance() { /* ... */ }
function closeSessionDetails() { /* ... */ }
function changeAttReportFilter(filter, btn) { /* ... */ }
async function generateAttendanceReports() { /* ... */ }

async function exportSessionCSV() {
    try {
        let csvContent = "ردیف,نام,نام خانوادگی,تعداد حاضر,تعداد غایب,تعداد تأخیر\r\n";
        window.allStudentsData.forEach((st, i) => {
            let p = 0, a = 0, l = 0;
            window.allAttendanceData.forEach(att => { 
                if (att.studentId === st.id) { 
                    if (att.status === 'present') p++; 
                    else if (att.status === 'absent') a++; 
                    else if (att.status === 'late') l++; 
                } 
            });
            csvContent += `${i + 1},"${st.firstName}","${st.lastName}",${p},${a},${l}\r\n`;
        });

        // اصلاح به UTF-16LE
        const bom = new Uint8Array([0xFF, 0xFE]);
        const contentBytes = new Uint8Array(csvContent.length * 2);
        for (let i = 0; i < csvContent.length; i++) {
            const code = csvContent.charCodeAt(i);
            contentBytes[i * 2] = code & 0xFF;
            contentBytes[i * 2 + 1] = code >> 8;
        }
        const fullBytes = new Uint8Array(bom.length + contentBytes.length);
        fullBytes.set(bom, 0);
        fullBytes.set(contentBytes, bom.length);

        const blob = new Blob([fullBytes], { type: 'text/csv;charset=utf-16le;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `kosha_attendance_${new Date().toISOString().slice(0,10)}.csv`; a.click();
        URL.revokeObjectURL(url);
        showToast('فایل اکسل حضور و غیاب دانلود شد!', 'success');
    } catch (e) { console.error(e); showToast('خطا در تولید فایل اکسل.', 'error'); }
}