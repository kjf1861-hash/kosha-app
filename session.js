// ==========================================
// فایل session.js — منطق تب جلسه
// ==========================================

let currentSessionId = null;
let currentSessionDay = null;
let currentSessionAttendanceState = {}; // ساختار: { periodNumber: { studentId: 'present' } }
let currentAttReportFilter = 'class';

function initSessionEvents() {
    document.getElementById('scheduleDaySelect').addEventListener('change', renderScheduleForDay);
    document.getElementById('sessionDayOfWeek').addEventListener('change', checkScheduleExists);

    // بارگذاری اولیه برنامه هفتگی برای روز پیش‌فرض (شنبه)
    renderScheduleForDay();
}

async function renderSessionData() {
    renderSessionsList();
    generateAttendanceReports();
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

    let periods = schedule ? schedule.periods : [null, null, null, null, null]; // 5 زنگ پیش‌فرض
    if (periods.length < 5) periods = [...periods, ...Array(5 - periods.length).fill(null)];

    const subjectsOptions = window.allSubjectsData.map(s => `<option value="${s.id}">${s.symbol || ''} ${s.name}</option>`).join('');

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
    
    if (currentCount >= 10) {
        showToast('حداکثر ۱۰ زنگ مجاز است.', 'error');
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

async function checkScheduleExists() {
    const day = document.getElementById('sessionDayOfWeek').value;
    if (!day) return;
    
    const schedules = await getAllData('weeklySchedule');
    const hasSchedule = schedules.some(s => s.day === day && s.periods.some(p => p !== null));
    
    if (!hasSchedule) {
        showToast(`برای روز ${day} برنامه‌ای تعریف نشده است. لطفاً ابتدا برنامه هفتگی را تنظیم کنید.`, 'error');
    }
}

// ==========================================
// 2. ثبت جلسه و لیست جلسات
// ==========================================
async function createNewSession() {
    const d = document.getElementById('sessDateDay').value;
    const m = document.getElementById('sessDateMonth').value;
    const y = document.getElementById('sessDateYear').value;
    const dayOfWeek = document.getElementById('sessionDayOfWeek').value;

    if (!d || !m || !y) {
        showToast('لطفاً تاریخ را کامل انتخاب کنید.', 'error'); return;
    }
    if (!dayOfWeek) {
        showToast('لطفاً روز برنامه هفتگی را انتخاب کنید.', 'error'); return;
    }

    const dateStr = jalaliToDateString(y, m, d);
    
    const allSessions = await getAllData('sessions');
    if (allSessions.find(s => s.date === dateStr)) {
        showToast('این تاریخ قبلاً ثبت شده است.', 'error'); return;
    }

    await saveData('sessions', { date: dateStr, dayOfWeek: dayOfWeek });
    showToast('جلسه با موفقیت ثبت شد!', 'success');
    
    // ریست فرم
    document.getElementById('sessDateDay').value = '';
    document.getElementById('sessDateMonth').value = '';
    document.getElementById('sessDateYear').value = '';
    document.getElementById('sessionDayOfWeek').value = '';

    loadAllData();
}

async function renderSessionsList() {
    const container = document.getElementById('sessions-list');
    if (!container) return;

    if (window.allSessionsData.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#64748b;">هنوز جلسه‌ای ثبت نشده است.</p>';
        return;
    }

    // مرتب‌سازی از جدیدترین به قدیمی‌ترین
    const sorted = [...window.allSessionsData].sort((a, b) => b.date.localeCompare(a.date));

    container.innerHTML = '';
    sorted.forEach((sess, index) => {
        container.innerHTML += `
            <div class="list-item">
                <div>
                    <strong>${index + 1}. 📅 ${sess.date}</strong>
                    <span class="group-label" style="margin-right:8px;">${sess.dayOfWeek}</span>
                </div>
                <div style="display:flex; gap:5px;">
                    <button class="btn btn-primary btn-sm" onclick="openSessionDetails(${sess.id})">👁️ مشاهده</button>
                    <button class="btn btn-secondary btn-sm" onclick="editSessionDate(${sess.id}, '${sess.date}')">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteSession(${sess.id})">🗑️</button>
                </div>
            </div>
        `;
    });
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

    // حذف حضور و غیاب‌ها
    const allAtt = await getAllData('attendance');
    const sessionAtt = allAtt.filter(a => a.sessionId === sessionId);
    for (const att of sessionAtt) await deleteData('attendance', att.id);

    await deleteData('sessions', sessionId);
    showToast('جلسه و سوابق آن حذف شد.', 'success');
    loadAllData();
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

    // 1. دریافت برنامه هفتگی برای روز مورد نظر
    const schedules = await getAllData('weeklySchedule');
    const schedule = schedules.find(s => s.day === session.dayOfWeek);
    
    if (!schedule || !schedule.periods.some(p => p !== null)) {
        document.getElementById('session-details-content').innerHTML = '<p style="text-align:center; color:red;">برنامه‌ای برای این روز تعریف نشده است.</p>';
        return;
    }

    // 2. دریافت حضور و غیاب‌های قبلی این جلسه
    const existingAtt = window.allAttendanceData.filter(a => a.sessionId === sessionId);
    
    // 3. مقداردهی اولیه استیت
    schedule.periods.forEach((subId, index) => {
        if (subId === null) return; // زنگ خالی
        const periodNum = index + 1;
        currentSessionAttendanceState[periodNum] = {};
        
        window.allStudentsData.forEach(st => {
            const record = existingAtt.find(a => a.periodNumber === periodNum && a.studentId === st.id);
            currentSessionAttendanceState[periodNum][st.id] = record ? record.status : 'present'; // پیش‌فرض حاضر
        });
    });

    renderSessionDetails(schedule);
}

function renderSessionDetails(schedule) {
    const container = document.getElementById('session-details-content');
    container.innerHTML = '';

    schedule.periods.forEach((subId, index) => {
        if (subId === null) return; // زنگ خالی
        
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
    
    // آپدیت UI برای این زنگ خاص
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
        // برای جلوگیری از تکرار رکوردها، رکوردهای قبلی این جلسه را پاک میکنیم
        const existing = window.allAttendanceData.filter(a => a.sessionId === currentSessionId);
        for (const rec of existing) await deleteData('attendance', rec.id);
        
        // ذخیره گروهی جدید
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
// 4. گزارش حضور و غیاب (انتقال یافته)
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

// خروجی اکسل حضور و غیاب
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