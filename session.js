// ==========================================
// فایل session.js — منطق تب جلسه
// ==========================================

let currentSessionId = null;
let currentSessionDay = null;
let currentSessionAttendanceState = {};
let currentAttReportFilter = 'class';

// متغیرهای تقویم
const jalaliMonths = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const calendarYears = [1405, 1406, 1407, 1408, 1409, 1410];
const leapYears = [1408]; // 1412 هم کبیسه است، اما فعلا تا 1410 داریم

// دیکشنری تعطیلات رسمی (شمسی و قمری) برای سال‌های 1405 تا 1410
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

function initSessionEvents() {
    document.getElementById('scheduleDaySelect').addEventListener('change', renderScheduleForDay);
}

async function renderSessionData() {
    renderScheduleForDay();
    initCalendar(); 
    generateAttendanceReports();
}

// ==========================================
// توابع تقویم شمسی
// ==========================================
function isLeapYear(year) {
    return leapYears.includes(year);
}

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

    let savedYear = localStorage.getItem('kosha-calendar-year');
    let savedMonth = localStorage.getItem('kosha-calendar-month');
    
    currentCalendarYear = savedYear ? parseInt(savedYear) : 1405;
    currentCalendarMonth = savedMonth ? parseInt(savedMonth) : 1;

    yearSelect.innerHTML = '';
    calendarYears.forEach(y => {
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

    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div class="calendar-day empty"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const isFriday = ((firstDay + day - 1) % 7) === 6;
        const dateStr = `${currentCalendarYear}/${String(currentCalendarMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
        
        // بررسی تعطیلات رسمی
        const isHoliday = officialHolidays[currentCalendarYear]?.includes(dateStr) || false;
        
        // بررسی وجود جلسه در این روز
        const hasSession = window.allSessionsData.some(s => s.date === dateStr);
        
        let classes = 'calendar-day';
        if (isFriday || isHoliday) classes += ' holiday';
        if (selectedSessionDate === dateStr) classes += ' selected';
        if (hasSession) classes += ' has-session';

        grid.innerHTML += `<div class="${classes}" onclick="selectCalendarDay(${day}, '${dateStr}')">${day}</div>`;
    }
}

function changeCalendarMonth(delta) {
    if (delta === 0) {
        currentCalendarMonth = parseInt(document.getElementById('calendarMonthSelect').value);
    } else {
        currentCalendarMonth += delta;
        if (currentCalendarMonth < 1) {
            currentCalendarMonth = 12;
            currentCalendarYear--;
        } else if (currentCalendarMonth > 12) {
            currentCalendarMonth = 1;
            currentCalendarYear++;
        }
    }

    if (currentCalendarYear < 1405) { currentCalendarYear = 1405; currentCalendarMonth = 1; }
    if (currentCalendarYear > 1410) { currentCalendarYear = 1410; currentCalendarMonth = 12; }

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
    const isHoliday = officialHolidays[currentCalendarYear]?.includes(dateStr) || (dayOfWeekIndex === 6);

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
            const hasSchedule = window.allWeeklyScheduleData.some(s => s.day === selectedSessionDayOfWeek && s.periods.some(p => p !== null));
            
            if (isHoliday) {
                 detectedDisplay.innerHTML = `📅 روز انتخابی: <strong>${selectedSessionDayOfWeek}</strong> (تعطیل)<br><span style="font-size:0.85rem; color:#dc2626;">⚠️ امکان ثبت جلسه در روزهای تعطیل وجود ندارد.</span>`;
                 actionArea.innerHTML = ''; // دکمه ثبت را مخفی کن
            } else if (hasSchedule) {
                detectedDisplay.innerHTML = `📅 روز انتخابی: <strong>${selectedSessionDayOfWeek}</strong><br><span style="font-size:0.85rem; color:#16a34a;">✅ برنامه هفتگی برای این روز تعریف شده است.</span>`;
                actionArea.innerHTML = `<button type="button" class="btn btn-primary btn-block" onclick="createNewSession()">➕ ثبت جلسه</button>`;
            } else {
                detectedDisplay.innerHTML = `📅 روز انتخابی: <strong>${selectedSessionDayOfWeek}</strong><br><span style="font-size:0.85rem; color:#dc2626;">⚠️ برنامه‌ای برای این روز تعریف نشده است.</span>`;
                actionArea.innerHTML = `<button type="button" class="btn btn-primary btn-block" onclick="createNewSession()">➕ ثبت جلسه</button>`;
            }
        }
    }

    renderCalendarGrid();
}

// ==========================================
// 1. برنامه هفتگی
// ==========================================
async function renderScheduleForDay() {
    const day = document.getElementById('scheduleDaySelect').value;
    const container = document.getElementById('weekly-schedule-container');
    if (!container) return;

    const schedules = await getAllData('weeklySchedule');
    let schedule = schedules.find(s => s.day === day);

    let periods = schedule ? schedule.periods : [null, null, null, null, null];
    if (periods.length < 5) periods = [...periods, ...Array(5 - periods.length).fill(null)];

    container.innerHTML = '';
    periods.forEach((subjectId, index) => {
        container.innerHTML += `
            <div class="weekly-schedule-row">
                <span>زنگ ${index + 1}:</span>
                <select class="schedule-period-select" data-index="${index}">
                    <option value="">-- خالی --</option>
                    ${window.allSubjectsData.map(s => `<option value="${s.id}" ${subjectId === s.id ? 'selected' : ''}>${s.symbol || ''} ${s.name}</option>`).join('')}
                </select>
                <button type="button" class="remove-period-btn" onclick="this.parentElement.remove()">✖</button>
            </div>
        `;
    });
}

async function addSchedulePeriod() {
    const container = document.getElementById('weekly-schedule-container');
    const currentCount = container.querySelectorAll('.schedule-period-select').length;
    
    if (currentCount >= 5) {
        showToast('حداکثر تعداد مجاز زنگ در هر روز (۵ زنگ) تکمیل شده است.', 'error');
        return;
    }

    const row = document.createElement('div');
    row.className = 'weekly-schedule-row';
    row.innerHTML = `
        <span>زنگ ${currentCount + 1}:</span>
        <select class="schedule-period-select" data-index="${currentCount}">
            <option value="">-- خالی --</option>
            ${window.allSubjectsData.map(s => `<option value="${s.id}">${s.symbol || ''} ${s.name}</option>`).join('')}
        </select>
        <button type="button" class="remove-period-btn" onclick="this.parentElement.remove()">✖</button>
    `;
    container.appendChild(row);
}

async function saveWeeklySchedule() {
    const day = document.getElementById('scheduleDaySelect').value;
    const selects = document.querySelectorAll('.schedule-period-select');
    const periods = [];
    
    selects.forEach(sel => {
        periods.push(sel.value ? parseInt(sel.value) : null);
    });

    await saveData('weeklySchedule', { day: day, periods: periods });
    showToast(`برنامه هفتگی روز ${day} ذخیره شد!`, 'success');
}

async function resetAllWeeklySchedules() {
    if (window.allWeeklyScheduleData.length === 0) {
        showToast('هیچ برنامه هفتگی برای حذف وجود ندارد.', 'error');
        return;
    }

    const confirm1 = confirm('⚠️ هشدار شدید:\n\nآیا مطمئن هستید که می‌خواهید کل برنامه هفتگی (برای تمام روزها) را حذف کنید؟');
    if (!confirm1) return;

    const confirm2 = confirm('🚨 آخرین هشدار!\n\nاین عمل غیرقابل بازگشت است و تمام تنظیمات برنامه هفتگی پاک می‌شوند. آیا ۱۰۰٪ مطمئن هستید؟');
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

// ==========================================
// 2. ثبت جلسه
// ==========================================
async function createNewSession() {
    if (!selectedSessionDate) {
        showToast('لطفاً یک تاریخ را از تقویم انتخاب کنید.', 'error'); return;
    }
    if (!selectedSessionDayOfWeek) {
        showToast('خطا در تشخیص روز هفته.', 'error'); return;
    }

    const firstDay = getFirstDayOfWeek(currentCalendarYear, currentCalendarMonth);
    const dayOfWeekIndex = (firstDay + parseInt(selectedSessionDate.split('/')[2]) - 1) % 7;
    const isHoliday = officialHolidays[currentCalendarYear]?.includes(selectedSessionDate) || (dayOfWeekIndex === 6);

    if (isHoliday) {
        showToast('امکان ثبت جلسه در روزهای تعطیل وجود ندارد.', 'error');
        return;
    }

    const hasSchedule = window.allWeeklyScheduleData.some(s => s.day === selectedSessionDayOfWeek && s.periods.some(p => p !== null));
    if (!hasSchedule) {
        showToast(`برای روز ${selectedSessionDayOfWeek} برنامه‌ای تعریف نشده است. لطفاً ابتدا برنامه هفتگی را تنظیم کنید.`, 'error');
        return;
    }

    const allSessions = await getAllData('sessions');
    if (allSessions.find(s => s.date === selectedSessionDate)) {
        showToast('این تاریخ قبلاً ثبت شده است.', 'error'); return;
    }

    await saveData('sessions', { date: selectedSessionDate, dayOfWeek: selectedSessionDayOfWeek });
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

    await saveData('sessions', { id: sessionId, date: trimmed, dayOfWeek: window.allSessionsData.find(s=>s.id===sessionId).dayOfWeek });
    showToast('تاریخ ویرایش شد.', 'success');
    loadAllData();
}

async function deleteSession(sessionId) {
    if (!confirm('آیا از حذف این جلسه و تمام حضور و غیاب‌های آن مطمئن هستید؟')) return;

    const sessionToDelete = window.allSessionsData.find(s => s.id === sessionId);
    const allAtt = await getAllData('attendance');
    const sessionAtt = allAtt.filter(a => a.sessionId === sessionId);
    for (const att of sessionAtt) await deleteData('attendance', att.id);

    await deleteData('sessions', sessionId);
    showToast('جلسه و سوابق آن حذف شد.', 'success');
    
    if (selectedSessionDate === sessionToDelete.date) {
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

    const confirm1 = confirm('⚠️ هشدار شدید:\n\nآیا مطمئن هستید که می‌خواهید تمام جلسات را حذف کنید؟ تمام حضور و غیاب‌های مرتبط نیز پاک خواهند شد.');
    if (!confirm1) return;

    const confirm2 = confirm('🚨 آخرین هشدار!\n\nاین عمل غیرقابل بازگشت است و تمام جلسات برای همیشه حذف می‌شوند. آیا ۱۰۰٪ مطمئن هستید؟');
    if (!confirm2) return;

    try {
        await clearStore('sessions');
        await clearStore('attendance');
        
        showToast('تمام جلسات و سوابق حضور و غیاب با موفقیت حذف شدند.', 'success');
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
// 3. مشاهده جزئیات جلسه و ثبت حضور و غیاب زنگ‌ها
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
    
    if (!schedule || !schedule.periods.some(p => p !== null)) {
        document.getElementById('session-details-content').innerHTML = '<p style="text-align:center; color:red;">برنامه‌ای برای این روز تعریف نشده است.</p>';
        return;
    }

    const existingAtt = window.allAttendanceData.filter(a => a.sessionId === sessionId);
    
    schedule.periods.forEach((subId, index) => {
        if (subId === null) return;
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
        if (subId === null) return;
        
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
                status: currentSessionAttendanceState[periodNum][studentId]
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
// 4. گزارش حضور و غیاب
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
        let csvContent = "ردیف,نام,نام خانوادگی,تعداد حاضر,تعداد غایب,تعداد تأخیر\n";
        window.allStudentsData.forEach((st, i) => {
            let p = 0, a = 0, l = 0;
            window.allAttendanceData.forEach(att => { 
                if (att.studentId === st.id) { 
                    if (att.status === 'present') p++; 
                    else if (att.status === 'absent') a++; 
                    else if (att.status === 'late') l++; 
                } 
            });
            csvContent += `${i + 1},${st.firstName},${st.lastName},${p},${a},${l}\n`;
        });

        const BOM = "\uFEFF";
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `kosha_attendance_${new Date().toISOString().slice(0,10)}.csv`; a.click();
        URL.revokeObjectURL(url);
        showToast('فایل اکسل حضور و غیاب دانلود شد!', 'success');
    } catch (e) { console.error(e); showToast('خطا در تولید فایل اکسل.', 'error'); }
}