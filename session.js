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
        const { matrix, maxPeriodToShow } = getScheduleDataMatrix();
        if (matrix.length === 0) { showToast('برنامه‌ای برای خروجی وجود ندارد.', 'error'); return; }

        // اصلاح: قرار دادن هدرها هم داخل دابل کوتیشن
        let csvContent = '"روز / زنگ"';
        for (let i = 1; i <= maxPeriodToShow; i++) {
            csvContent += `,"زنگ ${i}"`;
        }
        csvContent += "\r\n"; 

        matrix.forEach(row => {
            const rowData = row.map(cell => `"${cell}"`).join(',');
            csvContent += rowData + "\r\n";
        });

        // اصلاح قطعی: استفاده از آرایه بایتی برای BOM به جای رشته متنی
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' }); 
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

function exportScheduleHTML() {
    try {
        const { matrix, maxPeriodToShow } = getScheduleDataMatrix();
        if (matrix.length === 0) { showToast('برنامه‌ای برای خروجی وجود ندارد.', 'error'); return; }
        
        let html = `
        <!DOCTYPE html>
        <html lang="fa" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>برنامه هفتگی</title>
            <style>
                body { font-family: Tahoma, sans-serif; background-color: #f0f4f8; display: flex; justify-content: center; padding: 20px; }
                .container { background: white; padding: 25px; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); width: 100%; max-width: 900px; overflow-x: auto; }
                h1 { text-align: center; color: #2c3e50; margin-bottom: 25px; }
                table { width: 100%; border-collapse: collapse; min-width: 600px; }
                th, td { border: 2px solid #e2e8f0; padding: 12px 8px; text-align: center; vertical-align: middle; height: 50px; }
                thead th { background-color: #4a90e2; color: white; border-bottom: 4px solid #357abd; }
                tbody th { background-color: #f39c12; color: white; border-left: 4px solid #d68910; width: 100px; }
                td { background-color: #f8fafc; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📚 برنامه هفتگی کلاس 📚</h1>
                <table>
                    <thead><tr><th>روز / زنگ</th>`;
        for (let i = 1; i <= maxPeriodToShow; i++) {
            html += `<th>زنگ ${i}</th>`;
        }
        html += `</tr></thead><tbody>`;
        
        matrix.forEach(row => {
            html += `<tr>`;
            row.forEach((cell, idx) => {
                if (idx === 0) html += `<th>${cell}</th>`;
                else html += `<td>${cell}</td>`;
            });
            html += `</tr>`;
        });
        
        html += `</tbody></table></div></body></html>`;

        const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); 
        a.href = url; 
        a.download = `kosha_schedule_${new Date().toISOString().slice(0,10)}.html`; 
        a.click();
        URL.revokeObjectURL(url);
        showToast('خروجی HTML دانلود شد!', 'success');
    } catch (e) {
        console.error(e);
        showToast('خطا در تولید فایل HTML.', 'error');
    }
}

function printSchedule() {
    try {
        const { matrix, maxPeriodToShow } = getScheduleDataMatrix();
        if (matrix.length === 0) { showToast('برنامه‌ای برای چاپ وجود ندارد.', 'error'); return; }
        
        let html = `
        <!DOCTYPE html>
        <html lang="fa" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>چاپ برنامه هفتگی</title>
            <style>
                body { font-family: Tahoma, sans-serif; padding: 20px; }
                h1 { text-align: center; color: #2c3e50; margin-bottom: 25px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 2px solid #333; padding: 12px 8px; text-align: center; vertical-align: middle; height: 50px; }
                thead th { background-color: #ddd; color: #000; border-bottom: 3px solid #333; }
                tbody th { background-color: #eee; color: #000; border-left: 3px solid #333; width: 100px; }
                td { font-size: 14px; }
            </style>
        </head>
        <body>
            <h1>📚 برنامه هفتگی 📚</h1>
            <table>
                <thead><tr><th>روز / زنگ</th>`;
        for (let i = 1; i <= maxPeriodToShow; i++) {
            html += `<th>زنگ ${i}</th>`;
        }
        html += `</tr></thead><tbody>`;
        
        matrix.forEach(row => {
            html += `<tr>`;
            row.forEach((cell, idx) => {
                if (idx === 0) html += `<th>${cell}</th>`;
                else html += `<td>${cell}</td>`;
            });
            html += `</tr>`;
        });
        
        html += `</tbody></table></body></html>`;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500);
        
    } catch (e) {
        console.error(e);
        showToast('خطا در آماده‌سازی برای چاپ.', 'error');
    }
}

// ==========================================
// 2. توابع تقویم شمسی
// ==========================================
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

function initCalendar() {
    const yearSelect = document.getElementById('calendarYearSelect');
    const monthSelect = document.getElementById('calendarMonthSelect');
    if (!yearSelect || !monthSelect) return;

    const [startYearStr, endYearStr] = window.activeAcademicYear.split('-');
    const startYear = parseInt(startYearStr);
    const endYear = parseInt(endYearStr);
    const allowedYears = [startYear, endYear];

    let savedYear = localStorage.getItem('kosha-calendar-year');
    let savedMonth = localStorage.getItem('kosha-calendar-month');
    
    currentCalendarYear = savedYear ? parseInt(savedYear) : startYear;
    currentCalendarMonth = savedMonth ? parseInt(savedMonth) : 1;

    if (!allowedYears.includes(currentCalendarYear)) {
        currentCalendarYear = startYear;
        currentCalendarMonth = 7;
        localStorage.setItem('kosha-calendar-year', currentCalendarYear);
        localStorage.setItem('kosha-calendar-month', currentCalendarMonth);
    }

    yearSelect.innerHTML = '';
    allowedYears.forEach(y => {
        yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
    });
    yearSelect.value = currentCalendarYear;

    monthSelect.innerHTML = '';
    jalaliMonths.forEach((m, i) => {
        monthSelect.innerHTML += `<option value="${i + 1}">${m}</option>`;
    });
    monthSelect.value = currentCalendarMonth;

    renderCalendarGrid();
}

function renderCalendarGrid() {
    const grid = document.getElementById('calendarDaysGrid');
    if (!grid) return;

    grid.innerHTML = '';
    const firstDay = getFirstDayOfWeek(currentCalendarYear, currentCalendarMonth);
    const daysInMonth = getDaysInMonth(currentCalendarYear, currentCalendarMonth);
    
    const [startYear, endYear] = window.activeAcademicYear.split('-');
    const startBound = `${startYear}/07/01`;
    const endBound = `${endYear}/06/31`;
    const dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div class="calendar-day empty"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayOfWeekIndex = (firstDay + day - 1) % 7;
        const isFriday = dayOfWeekIndex === 6;
        const dateStr = `${currentCalendarYear}/${String(currentCalendarMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
        
        const isHoliday = officialHolidays[currentCalendarYear]?.includes(dateStr) || false;
        const hasSession = window.allSessionsData.some(s => s.date === dateStr);
        const inAcademicYear = (dateStr >= startBound && dateStr <= endBound);
        
        const isActiveDay = (window.scheduleActiveDays || []).includes(dayNames[dayOfWeekIndex]);

        let classes = 'calendar-day';
        if ((isFriday && !isActiveDay) || isHoliday) classes += ' holiday';
        if (selectedSessionDate === dateStr) classes += ' selected';
        if (hasSession) classes += ' has-session';
        if (!inAcademicYear) classes += ' outside-range';

        const clickHandler = inAcademicYear ? `onclick="selectCalendarDay(${day}, '${dateStr}')"` : `onclick="showOutsideRangeError()"`;

        grid.innerHTML += `<div class="${classes}" ${clickHandler}>${day}</div>`;
    }
}

function showOutsideRangeError() {
    showToast('این تاریخ خارج از بازه سال تحصیلی جاری است.', 'error');
}

function changeCalendarMonth(delta) {
    const [startYearStr, endYearStr] = window.activeAcademicYear.split('-');
    const startYear = parseInt(startYearStr);
    const endYear = parseInt(endYearStr);

    if (delta === 0) {
        currentCalendarMonth = parseInt(document.getElementById('calendarMonthSelect').value);
    } else {
        if (delta === -1) {
            if (currentCalendarYear === startYear && currentCalendarMonth === 7) {
                showToast('شما در ابتدای سال تحصیلی هستید.', 'error');
                return;
            }
        } else if (delta === 1) {
            if (currentCalendarYear === endYear && currentCalendarMonth === 6) {
                showToast('شما در انتهای سال تحصیلی هستید.', 'error');
                return;
            }
        }

        currentCalendarMonth += delta;
        if (currentCalendarMonth < 1) {
            currentCalendarMonth = 12;
            currentCalendarYear--;
        } else if (currentCalendarMonth > 12) {
            currentCalendarMonth = 1;
            currentCalendarYear++;
        }
    }

    if (currentCalendarYear < startYear || currentCalendarYear > endYear) {
        showToast('این ماه خارج از بازه سال تحصیلی است.', 'error');
        currentCalendarYear = parseInt(document.getElementById('calendarYearSelect').value);
        currentCalendarMonth = parseInt(document.getElementById('calendarMonthSelect').value);
        return;
    }

    localStorage.setItem('kosha-calendar-year', currentCalendarYear);
    localStorage.setItem('kosha-calendar-month', currentCalendarMonth);

    document.getElementById('calendarYearSelect').value = currentCalendarYear;
    document.getElementById('calendarMonthSelect').value = currentCalendarMonth;

    renderCalendarGrid();
}

function changeCalendarYear() {
    currentCalendarYear = parseInt(document.getElementById('calendarYearSelect').value);
    localStorage.setItem('kosha-calendar-year', currentCalendarYear);
    renderCalendarGrid();
}

function selectCalendarDay(day, dateStr) {
    selectedSessionDate = dateStr;
    document.getElementById('sessionDateHidden').value = dateStr;
    
    const firstDay = getFirstDayOfWeek(currentCalendarYear, currentCalendarMonth);
    const dayOfWeekIndex = (firstDay + day - 1) % 7;
    const dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
    selectedSessionDayOfWeek = dayNames[dayOfWeekIndex];

    const detectedDisplay = document.getElementById('detectedDayDisplay');
    const actionArea = document.getElementById('sessionActionArea');
    
    const existingSession = window.allSessionsData.find(s => s.date === dateStr);
    const isHoliday = officialHolidays[currentCalendarYear]?.includes(dateStr) || false;
    
    const isActiveDay = (window.scheduleActiveDays || []).includes(selectedSessionDayOfWeek);

    if (detectedDisplay && actionArea) {
        detectedDisplay.style.display = 'block';
        
        if (existingSession) {
            detectedDisplay.innerHTML = `📅 تاریخ انتخابی: <strong>${selectedSessionDate}</strong> (${selectedSessionDayOfWeek})`;
            actionArea.innerHTML = `
                <div style="text-align:center; margin-bottom:10px; color:#16a34a; font-weight:bold;">✅ جلسه ثبت شده است.</div>
                <div style="display:flex; gap:5px;">
                    <button type="button" class="btn btn-primary" style="flex:2;" onclick="openSessionDetails(${existingSession.id})">👁️ مشاهده حضور و غیاب</button>
                    <button type="button" class="btn btn-secondary" style="flex:1;" onclick="editSessionDate(${existingSession.id}, '${existingSession.date}')">✏️</button>
                    <button type="button" class="btn btn-danger" style="flex:1;" onclick="deleteSession(${existingSession.id})">🗑️</button>
                </div>
            `;
        } else {
            if (isHoliday) {
                 detectedDisplay.innerHTML = `📅 روز انتخابی: <strong>${selectedSessionDayOfWeek}</strong> (تعطیل رسمی)<br><span style="font-size:0.85rem; color:#dc2626;">⚠️ امکان ثبت جلسه در تعطیلات رسمی وجود ندارد.</span>`;
                 actionArea.innerHTML = '';
            } else if (!isActiveDay) {
                 detectedDisplay.innerHTML = `📅 روز انتخابی: <strong>${selectedSessionDayOfWeek}</strong><br><span style="font-size:0.85rem; color:#dc2626;">⚠️ این روز در تنظیمات کلاس به عنوان روز فعال انتخاب نشده است.</span>`;
                 actionArea.innerHTML = '';
            } else {
                const hasSchedule = window.allWeeklyScheduleData.some(s => s.day === selectedSessionDayOfWeek && s.periods && s.periods.some(p => p !== null && p !== undefined));
                
                if (hasSchedule) {
                    detectedDisplay.innerHTML = `📅 روز انتخابی: <strong>${selectedSessionDayOfWeek}</strong><br><span style="font-size:0.85rem; color:#16a34a;">✅ برنامه هفتگی برای این روز تعریف شده است.</span>`;
                    actionArea.innerHTML = `<button type="button" class="btn btn-primary btn-block" onclick="createNewSession()">➕ ثبت جلسه</button>`;
                } else {
                    detectedDisplay.innerHTML = `📅 روز انتخابی: <strong>${selectedSessionDayOfWeek}</strong><br><span style="font-size:0.85rem; color:#dc2626;">⚠️ برنامه‌ای برای این روز تعریف نشده است.</span>`;
                    actionArea.innerHTML = `<button type="button" class="btn btn-primary btn-block" onclick="createNewSession()">➕ ثبت جلسه</button>`;
                }
            }
        }
    }

    renderCalendarGrid();
}

// ==========================================
// 3. ثبت جلسه
// ==========================================
async function createNewSession() {
    if (!selectedSessionDate) {
        showToast('لطفاً یک تاریخ را از تقویم انتخاب کنید.', 'error'); return;
    }
    if (!selectedSessionDayOfWeek) {
        showToast('خطا در تشخیص روز هفته.', 'error'); return;
    }

    const isHoliday = officialHolidays[currentCalendarYear]?.includes(selectedSessionDate) || false;

    if (isHoliday) {
        showToast('امکان ثبت جلسه در تعطیلات رسمی وجود ندارد.', 'error');
        return;
    }

    const isActiveDay = (window.scheduleActiveDays || []).includes(selectedSessionDayOfWeek);
    if (!isActiveDay) {
        showToast('این روز در تنظیمات کلاس به عنوان روز فعال انتخاب نشده است.', 'error');
        return;
    }

    const hasSchedule = window.allWeeklyScheduleData.some(s => s.day === selectedSessionDayOfWeek && s.periods && s.periods.some(p => p !== null && p !== undefined));
    if (!hasSchedule) {
        showToast(`برای روز ${selectedSessionDayOfWeek} برنامه‌ای تعریف نشده است. لطفاً ابتدا برنامه هفتگی را تنظیم کنید.`, 'error');
        return;
    }

    const allSessions = await getAllData('sessions');
    if (allSessions.find(s => s.date === selectedSessionDate && s.academicYear === window.activeAcademicYear)) {
        showToast('این تاریخ قبلاً ثبت شده است.', 'error'); return;
    }

    await saveData('sessions', { 
        date: selectedSessionDate, 
        dayOfWeek: selectedSessionDayOfWeek,
        academicYear: window.activeAcademicYear
    });
    showToast('جلسه با موفقیت ثبت شد!', 'success');
    
    selectedSessionDate = "";
    selectedSessionDayOfWeek = "";
    document.getElementById('sessionDateHidden').value = "";
    document.getElementById('detectedDayDisplay').style.display = 'none';
    document.getElementById('sessionActionArea').innerHTML = '';
    
    loadAllData();
}

async function editSessionDate(sessionId, currentDate) {
    const newDate = prompt('تاریخ جدید (مثلاً 1405/08/20):', currentDate);
    if (newDate === null) return;
    const trimmed = newDate.trim();
    if (!/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) { showToast('فرمت نامعتبر است.', 'error'); return; }
    if (trimmed === currentDate) return;

    const session = await getDataById('sessions', sessionId);
    if(session) {
        session.date = trimmed;
        await saveData('sessions', session);
        showToast('تاریخ ویرایش شد.', 'success');
        loadAllData();
    }
}

async function deleteSession(sessionId) {
    if (!confirm('آیا از حذف این جلسه و تمام حضور و غیاب‌های آن مطمئن هستید؟')) return;

    const sessionToDelete = window.allSessionsData.find(s => s.id === sessionId);
    const allAtt = await getAllData('attendance');
    const sessionAtt = allAtt.filter(a => a.sessionId === sessionId);
    for (const att of sessionAtt) await deleteData('attendance', att.id);

    await deleteData('sessions', sessionId);
    showToast('جلسه و سوابق آن حذف شد.', 'success');
    
    if (selectedSessionDate === sessionToDelete?.date) {
        selectedSessionDate = "";
        document.getElementById('sessionActionArea').innerHTML = '';
        document.getElementById('detectedDayDisplay').style.display = 'none';
    }
    
    loadAllData();
}

async function resetAllSessions() {
    if (window.allSessionsData.length === 0) {
        showToast('هیچ جلسه‌ای برای حذف وجود ندارد.', 'error');
        return;
    }

    const confirm1 = confirm('⚠️ هشدار شدید:\n\nآیا مطمئن هستید که می‌خواهید تمام جلسات سال تحصیلی جاری را حذف کنید؟');
    if (!confirm1) return;

    const confirm2 = confirm('🚨 آخرین هشدار!\n\nاین عمل غیرقابل بازگشت است. آیا ۱۰۰٪ مطمئن هستید؟');
    if (!confirm2) return;

    try {
        for (const sess of window.allSessionsData) {
            const atts = window.allAttendanceData.filter(a => a.sessionId === sess.id);
            for (const att of atts) await deleteData('attendance', att.id);
            await deleteData('sessions', sess.id);
        }
        
        showToast('تمام جلسات سال جاری با موفقیت حذف شدند.', 'success');
        selectedSessionDate = "";
        document.getElementById('sessionActionArea').innerHTML = '';
        document.getElementById('detectedDayDisplay').style.display = 'none';
        loadAllData();
    } catch (e) {
        console.error(e);
        showToast('خطا در حذف جلسات!', 'error');
    }
}

// ==========================================
// 4. مشاهده جزئیات جلسه و ثبت حضور و غیاب زنگ‌ها
// ==========================================
async function openSessionDetails(sessionId) {
    const session = window.allSessionsData.find(s => s.id === sessionId);
    if (!session) return;

    currentSessionId = sessionId;
    currentSessionDay = session.dayOfWeek;
    currentSessionAttendanceState = {};

    document.getElementById('session-details-title').textContent = `📅 حضور و غیاب - ${session.date} (${session.dayOfWeek})`;
    document.getElementById('session-details-content').innerHTML = '<p style="text-align:center;">در حال بارگذاری...</p>';
    document.getElementById('session-details-modal').classList.add('show');

    const schedules = await getAllData('weeklySchedule');
    const schedule = schedules.find(s => s.day === session.dayOfWeek);
    
    if (!schedule || !schedule.periods || !schedule.periods.some(p => p !== null && p !== undefined)) {
        document.getElementById('session-details-content').innerHTML = '<p style="text-align:center; color:red;">برنامه‌ای برای این روز تعریف نشده است.</p>';
        return;
    }

    const existingAtt = window.allAttendanceData.filter(a => a.sessionId === sessionId);
    
    schedule.periods.forEach((subId, index) => {
        if (subId === null || subId === undefined) return;
        const periodNum = index + 1;
        currentSessionAttendanceState[periodNum] = {};
        
        window.allStudentsData.forEach(st => {
            const record = existingAtt.find(a => a.periodNumber === periodNum && a.studentId === st.id);
            currentSessionAttendanceState[periodNum][st.id] = record ? record.status : 'present';
        });
    });

    renderSessionDetails(schedule);
}

function renderSessionDetails(schedule) {
    const container = document.getElementById('session-details-content');
    container.innerHTML = '';

    schedule.periods.forEach((subId, index) => {
        if (subId === null || subId === undefined) return;
        
        const periodNum = index + 1;
        const subject = window.allSubjectsData.find(s => s.id === subId);
        const subName = subject ? `${subject.symbol || ''} ${subject.name}` : 'نامشخص';

        let sectionHtml = `
            <div class="session-period-section" id="session-period-${periodNum}">
                <div class="session-period-title">🔔 زنگ ${periodNum}: ${subName}</div>
                <div style="display:flex; gap:5px; margin-bottom:10px;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="setAllPeriodAttendance(${periodNum}, 'present')">همه حاضر 🟢</button>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="setAllPeriodAttendance(${periodNum}, 'absent')">همه غایب 🔴</button>
                </div>
                <div class="attendance-list-container" style="max-height: 250px;">
        `;

        window.allStudentsData.forEach(st => {
            const status = currentSessionAttendanceState[periodNum][st.id] || 'present';
            const g = window.allGroupsData.find(x => x.id === st.groupId);
            const badge = g ? `<span class="group-label">${g.symbol} ${g.name}</span>` : '';

            sectionHtml += `
                <div class="attendance-student-row">
                    <div class="attendance-student-name">${st.firstName} ${st.lastName} ${badge}</div>
                    <div class="att-btn-group">
                        <button type="button" class="att-btn present ${status === 'present' ? 'active' : ''}" onclick="setPeriodAttendance(${periodNum}, ${st.id}, 'present', this)">🟢 حاضر</button>
                        <button type="button" class="att-btn absent ${status === 'absent' ? 'active' : ''}" onclick="setPeriodAttendance(${periodNum}, ${st.id}, 'absent', this)">🔴 غایب</button>
                        <button type="button" class="att-btn late ${status === 'late' ? 'active' : ''}" onclick="setPeriodAttendance(${periodNum}, ${st.id}, 'late', this)">🟡 تأخیر</button>
                    </div>
                </div>
            `;
        });

        sectionHtml += `</div></div>`;
        container.innerHTML += sectionHtml;
    });
}

function setPeriodAttendance(periodNum, studentId, status, btnElement) {
    currentSessionAttendanceState[periodNum][studentId] = status;
    const parent = btnElement.parentElement;
    parent.querySelectorAll('.att-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
}

function setAllPeriodAttendance(periodNum, status) {
    window.allStudentsData.forEach(st => {
        currentSessionAttendanceState[periodNum][st.id] = status;
    });
    
    const section = document.getElementById(`session-period-${periodNum}`);
    if (section) {
        section.querySelectorAll('.attendance-student-row').forEach(row => {
            row.querySelectorAll('.att-btn').forEach(btn => btn.classList.remove('active'));
            const targetBtn = row.querySelector(`.att-btn.${status}`);
            if (targetBtn) targetBtn.classList.add('active');
        });
    }
}

async function saveAllSessionAttendance() {
    if (!currentSessionId) return;

    const recordsToSave = [];
    for (const periodNum in currentSessionAttendanceState) {
        for (const studentId in currentSessionAttendanceState[periodNum]) {
            recordsToSave.push({
                sessionId: currentSessionId,
                periodNumber: parseInt(periodNum),
                studentId: parseInt(studentId),
                status: currentSessionAttendanceState[periodNum][studentId],
                academicYear: window.activeAcademicYear
            });
        }
    }

    try {
        const existing = window.allAttendanceData.filter(a => a.sessionId === currentSessionId);
        for (const rec of existing) await deleteData('attendance', rec.id);
        
        await saveBulkData('attendance', recordsToSave);
        showToast('حضور و غیاب کل جلسه ذخیره شد!', 'success');
        loadAllData();
    } catch (e) {
        console.error(e);
        showToast('خطا در ذخیره حضور و غیاب!', 'error');
    }
}

function closeSessionDetails() {
    document.getElementById('session-details-modal').classList.remove('show');
    currentSessionId = null;
    currentSessionDay = null;
    currentSessionAttendanceState = {};
}

// ==========================================
// 5. گزارش حضور و غیاب
// ==========================================
function changeAttReportFilter(filter, btn) {
    currentAttReportFilter = filter;
    btn.parentElement.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    generateAttendanceReports();
}

async function generateAttendanceReports() {
    const container = document.getElementById('attendance-reports-list');
    const tsc = document.getElementById('total-sessions-count');
    if (!container || !tsc) return;
    
    tsc.textContent = window.allSessionsData.length;
    if (window.allStudentsData.length === 0) { container.innerHTML = '<p style="text-align:center;">لیست خالی است.</p>'; return; }
    
    let tp = 0, ta = 0, tl = 0;
    window.allAttendanceData.forEach(att => { if (att.status === 'present') tp++; else if (att.status === 'absent') ta++; else if (att.status === 'late') tl++; });
    const tall = tp + ta + tl;
    let html = '';
    
    if (tall > 0) {
        const pp = (tp / tall) * 100, pa = (ta / tall) * 100, pl = (tl / tall) * 100;
        html += `<div class="card" style="background: var(--input-bg); margin-bottom: 20px; border: 1px solid var(--border-color);"><h4 style="margin: 0 0 10px 0; color: var(--primary); text-align: center;">📊 نمودار کلی حضور</h4><div class="att-stacked-bar-container">${pp > 0 ? `<div class="att-stacked-segment present" style="width: ${pp}%;">${Math.round(pp)}%</div>` : ''}${pa > 0 ? `<div class="att-stacked-segment absent" style="width: ${pa}%;">${Math.round(pa)}%</div>` : ''}${pl > 0 ? `<div class="att-stacked-segment late" style="width: ${pl}%;">${Math.round(pl)}%</div>` : ''}</div><div class="att-legend"><div class="att-legend-item"><div class="att-legend-color present"></div>حاضر</div><div class="att-legend-item"><div class="att-legend-color absent"></div>غایب</div><div class="att-legend-item"><div class="att-legend-color late"></div>تأخیر</div></div></div>`;
    }
    
    if (currentAttReportFilter === 'class') {
        html += '<h3 style="margin-bottom: 15px;">👦 گزارش حضور کلاسی</h3>';
        window.allStudentsData.forEach(st => {
            let p = 0, a = 0, l = 0;
            window.allAttendanceData.forEach(att => { 
                if (att.studentId === st.id) { 
                    if (att.status === 'present') p++; 
                    else if (att.status === 'absent') a++; 
                    else if (att.status === 'late') l++; 
                } 
            });
            const g = window.allGroupsData.find(x => x.id === st.groupId);
            const badge = g ? `<span class="group-label" style="margin-right:5px;">${g.symbol} ${g.name}</span>` : '';
            html += `<div class="list-item" style="flex-direction: column; align-items: stretch; gap: 8px;"><div style="display: flex; justify-content: space-between; align-items: center;"><div style="font-weight: bold; font-size: 1.05rem;">${st.firstName} ${st.lastName} ${badge}</div></div><div style="display: flex; gap: 5px; flex-wrap: wrap;"><span class="att-report-badge present">حاضر: ${p}</span><span class="att-report-badge absent">غایب: ${a}</span><span class="att-report-badge late">تأخیر: ${l}</span></div></div>`;
        });
    } else {
        html += '<h3 style="margin-bottom: 15px;">👥 گزارش حضور گروهی</h3>';
        window.allGroupsData.forEach(g => {
            let p = 0, a = 0, l = 0;
            const gs = window.allStudentsData.filter(s => s.groupId === g.id), gsi = gs.map(s => s.id);
            window.allAttendanceData.forEach(att => { if (gsi.includes(att.studentId)) { if (att.status === 'present') p++; else if (att.status === 'absent') a++; else if (att.status === 'late') l++; } });
            html += `<div class="list-item" style="flex-direction: column; align-items: stretch; gap: 8px;"><div style="font-weight: bold; font-size: 1.05rem;">${g.symbol} ${g.name} (${gs.length} نفر)</div><div style="display: flex; gap: 5px; flex-wrap: wrap;"><span class="att-report-badge present">حاضر: ${p}</span><span class="att-report-badge absent">غایب: ${a}</span><span class="att-report-badge late">تأخیر: ${l}</span></div></div>`;
        });
    }
    container.innerHTML = html;
}

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

        // اصلاح قطعی BOM برای این بخش
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `kosha_attendance_${new Date().toISOString().slice(0,10)}.csv`; a.click();
        URL.revokeObjectURL(url);
        showToast('فایل اکسل حضور و غیاب دانلود شد!', 'success');
    } catch (e) { console.error(e); showToast('خطا در تولید فایل اکسل.', 'error'); }
}