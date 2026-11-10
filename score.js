// ==========================================
// فایل score.js — منطق تب امتیاز (ارزشیابی)
// ==========================================

let isSaveAndNext = false;

let currentQuranStudentView = 'flat';
let currentSpecialStudentView = 'flat';
let currentHandwritingStudentView = 'flat';

// وضعیت تقویم‌های تب امتیاز
let scoreCalendarState = {
    record: { year: 1405, month: 7, selectedDate: '' },
    quran: { year: 1405, month: 7, selectedDate: '' },
    special: { year: 1405, month: 7, selectedDate: '' },
    handwriting: { year: 1405, month: 7, selectedDate: '' }
};

const scoreJalaliMonths = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const scoreLeapYears = [1408]; 

function initScoreEvents() {
    document.getElementById('recordItem').addEventListener('change', (e) => {
        if (e.target.value !== "") {
            const item = window.allAssessmentItems.find(i => i.id == e.target.value);
            if(item) renderScoreInput(item);
        } else {
            document.getElementById('dynamic-score-section').style.display = 'none';
        }
    });

    document.getElementById('edit-record-form').addEventListener('submit', saveEditedRecord);
}

function renderScoreData() {
    const recordSubjectSelect = document.getElementById('recordSubject');
    const recordsFilterSubject = document.getElementById('recordsFilterSubject');
    const editRecordSubject = document.getElementById('editRecordSubject');
    
    const subjOptions = window.allSubjectsData.map(s => `<option value="${s.id}">${s.symbol || ''} ${s.name}</option>`).join('');
    
    if (recordSubjectSelect) recordSubjectSelect.innerHTML = '<option value="" disabled selected>درسی را انتخاب کنید!</option>' + subjOptions;
    if (editRecordSubject) editRecordSubject.innerHTML = '<option value="" disabled selected>انتخاب کنید...</option>' + subjOptions;
    if (recordsFilterSubject) recordsFilterSubject.innerHTML = '<option value="">همه دروس</option>' + subjOptions;

    const itemSelect = document.getElementById('recordItem');
    const editRecordItemSelect = document.getElementById('editRecordItem');
    const itemOptions = window.allAssessmentItems.map(i => `<option value="${i.id}">${i.title}</option>`).join('');
    
    if (itemSelect) itemSelect.innerHTML = '<option value="" disabled selected>روش سنجشی را انتخاب کنید!</option>' + itemOptions;
    if (editRecordItemSelect) editRecordItemSelect.innerHTML = '<option value="" disabled selected>انتخاب کنید...</option>' + itemOptions;

    const recordsFilterStudent = document.getElementById('recordsFilterStudent');
    if (recordsFilterStudent) {
        recordsFilterStudent.innerHTML = '<option value="">همه دانش‌آموزان</option>' + window.allStudentsData.map(st => `<option value="${st.id}">${st.firstName} ${st.lastName}</option>`).join('');
    }

    const quranSurahSelect = document.getElementById('quranSurahSelect');
    if (quranSurahSelect) {
        quranSurahSelect.innerHTML = '<option value="" disabled selected>انتخاب سوره...</option>';
        for (const [surah, ayat] of Object.entries(quranSurahs)) {
            quranSurahSelect.innerHTML += `<option value="${ayat}" data-surah="${surah}">${surah} (${toPersianNumber(ayat)} آیه)</option>`;
        }
    }

    initScoreCalendars();

    renderStudentCheckboxes();
    renderQuranStudentCheckboxes();
    renderSpecialStudentCheckboxes();
    renderHandwritingStudentCheckboxes();
    loadAssessmentRecords();
    loadQuranRewards();
}

// ==========================================
// توابع تقویم شمسی تب امتیاز
// ==========================================
function isScoreLeapYear(year) { return scoreLeapYears.includes(year); }

function getScoreDaysInMonth(year, month) {
    if (month <= 6) return 31;
    if (month <= 11) return 30;
    return isScoreLeapYear(year) ? 30 : 29;
}

function getScoreFirstDayOfWeek(year, month) {
    let daysPassed = 0;
    for (let y = 1405; y < year; y++) {
        daysPassed += isScoreLeapYear(y) ? 366 : 365;
    }
    for (let m = 1; m < month; m++) {
        daysPassed += getScoreDaysInMonth(year, m);
    }
    return daysPassed % 7;
}

function initScoreCalendars() {
    const [startYearStr, endYearStr] = window.activeAcademicYear.split('-');
    const startYear = parseInt(startYearStr);
    
    ['record', 'quran', 'special', 'handwriting'].forEach(type => {
        if (!scoreCalendarState[type].year || scoreCalendarState[type].year < startYear) {
            scoreCalendarState[type].year = startYear;
            scoreCalendarState[type].month = 7; 
        }
        renderScoreCalendar(type);
    });
}

function changeScoreCalendarMonth(type, delta) {
    const [startYearStr, endYearStr] = window.activeAcademicYear.split('-');
    const startYear = parseInt(startYearStr);
    const endYear = parseInt(endYearStr);

    let state = scoreCalendarState[type];

    if (delta === -1) {
        if (state.year === startYear && state.month === 7) {
            showToast('شما در ابتدای سال تحصیلی هستید.', 'error');
            return;
        }
    } else if (delta === 1) {
        if (state.year === endYear && state.month === 6) {
            showToast('شما در انتهای سال تحصیلی هستید.', 'error');
            return;
        }
    }

    state.month += delta;
    if (state.month < 1) { state.month = 12; state.year--; } 
    else if (state.month > 12) { state.month = 1; state.year++; }

    if (state.year < startYear || state.year > endYear) {
        showToast('این ماه خارج از بازه سال تحصیلی است.', 'error');
        state.year = parseInt(document.getElementById(`${type}-calendar-title`).dataset.year);
        state.month = parseInt(document.getElementById(`${type}-calendar-title`).dataset.month);
        return;
    }

    renderScoreCalendar(type);
}

function renderScoreCalendar(type) {
    const state = scoreCalendarState[type];
    
    const titleEl = document.getElementById(`${type}-calendar-title`);
    if (!titleEl) return;
    
    titleEl.dataset.year = state.year;
    titleEl.dataset.month = state.month;
    titleEl.innerHTML = `
        <select onchange="updateScoreCalendarSelect('${type}', 'month', this.value)">
            ${scoreJalaliMonths.map((m, i) => `<option value="${i + 1}" ${state.month === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
        <select onchange="updateScoreCalendarSelect('${type}', 'year', this.value)">
            ${[parseInt(window.activeAcademicYear.split('-')[0]), parseInt(window.activeAcademicYear.split('-')[1])].map(y => `<option value="${y}" ${state.year === y ? 'selected' : ''}>${toPersianNumber(y)}</option>`).join('')}
        </select>
    `;

    const grid = document.getElementById(`${type}-calendar-grid`);
    if (!grid) return;
    grid.innerHTML = '';

    const firstDay = getScoreFirstDayOfWeek(state.year, state.month);
    const daysInMonth = getScoreDaysInMonth(state.year, state.month);
    
    const [startY, endY] = window.activeAcademicYear.split('-');
    const startBound = `${startY}/07/01`;
    const endBound = `${endY}/06/31`;

    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div class="calendar-day empty"></div>`;
    }

    const relevantRecords = window.allRecordsData.filter(rec => {
        if (type === 'quran') return rec.itemName === "پویش حفظ جزء سی قرآن کریم";
        if (type === 'special') return rec.itemName === "تشویق ویژه";
        if (type === 'handwriting') return rec.itemName === "تشویق خوش‌خط‌نویسی";
        if (type === 'record') return rec.subjectId !== null && rec.itemName !== "پویش حفظ جزء سی قرآن کریم" && rec.itemName !== "تشویق ویژه" && rec.itemName !== "تشویق خوش‌خط‌نویسی";
        return false;
    });

    for (let day = 1; day <= daysInMonth; day++) {
        const isFriday = ((firstDay + day - 1) % 7) === 6;
        const dateStr = `${state.year}/${String(state.month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
        
        const inAcademicYear = (dateStr >= startBound && dateStr <= endBound);
        const hasRecord = relevantRecords.some(r => r.date === dateStr);
        
        let classes = 'calendar-day';
        if (isFriday) classes += ' holiday';
        if (state.selectedDate === dateStr) classes += ' selected';
        if (hasRecord) classes += ' has-record';
        if (!inAcademicYear) classes += ' outside-range'; 

        const clickHandler = inAcademicYear ? `onclick="selectScoreCalendarDay('${type}', '${dateStr}')"` : `onclick="showToast('این تاریخ خارج از بازه سال تحصیلی است.', 'error')"`;

        grid.innerHTML += `<div class="${classes}" ${clickHandler}>${toPersianNumber(day)}</div>`;
    }
}

function updateScoreCalendarSelect(type, field, value) {
    scoreCalendarState[type][field] = parseInt(value);
    renderScoreCalendar(type);
}

function selectScoreCalendarDay(type, dateStr) {
    scoreCalendarState[type].selectedDate = dateStr;
    
    const displayEl = document.getElementById(`${type}DateDisplay`);
    if (displayEl) displayEl.textContent = toPersianNumber(dateStr);

    const hiddenInputId = type === 'record' ? 'recordDate' : `${type}DateHidden`;
    const hiddenInput = document.getElementById(hiddenInputId);
    if (hiddenInput) hiddenInput.value = dateStr;

    renderScoreCalendar(type);

    renderScoreDayArchive(type, dateStr);
    
    const accordion = document.getElementById(`${type}-date-accordion`);
    if (accordion) accordion.removeAttribute('open');
}

function renderScoreDayArchive(type, dateStr) {
    const archiveContainer = document.getElementById(`${type}-day-archive`);
    const archiveList = document.getElementById(`${type}-day-archive-list`);
    if (!archiveContainer || !archiveList) return;

    const dayRecords = window.allRecordsData.filter(rec => {
        if (rec.date !== dateStr) return false;
        if (type === 'quran') return rec.itemName === "پویش حفظ جزء سی قرآن کریم";
        if (type === 'special') return rec.itemName === "تشویق ویژه";
        if (type === 'handwriting') return rec.itemName === "تشویق خوش‌خط‌نویسی";
        if (type === 'record') return rec.subjectId !== null && rec.itemName !== "پویش حفظ جزء سی قرآن کریم" && rec.itemName !== "تشویق ویژه" && rec.itemName !== "تشویق خوش‌خط‌نویسی";
        return false;
    });

    if (dayRecords.length === 0) {
        archiveContainer.style.display = 'none';
        return;
    }

    archiveContainer.style.display = 'block';
    archiveList.innerHTML = `<h4>📋 سوابق ثبت‌شده در این روز (${toPersianNumber(dayRecords.length)} مورد):</h4>`;
    
    dayRecords.forEach(rec => {
        let names = '';
        if (rec.students && rec.students.length > 0) {
            names = rec.students.map(id => {
                const st = window.allStudentsData.find(s => s.id === id);
                return st ? `${st.firstName} ${st.lastName}` : '';
            }).filter(n => n !== '').join('، ');
        }
        
        archiveList.innerHTML += `
            <div class="score-archive-item">
                <div style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    <strong>${rec.title}</strong> 
                    <span style="font-size:0.75rem; color:var(--text-muted);">(${names || 'بدون دانش‌آموز'})</span>
                </div>
                <div style="color:var(--primary); font-weight:bold; margin-right:10px;">${toPersianNumber(rec.finalScore)} امتیاز</div>
            </div>
        `;
    });
}

function resetScoreCalendar(type) {
    scoreCalendarState[type].selectedDate = '';
    const displayEl = document.getElementById(`${type}DateDisplay`);
    if (displayEl) displayEl.textContent = 'انتخاب نشده';
    
    const hiddenInputId = type === 'record' ? 'recordDate' : `${type}DateHidden`;
    const hiddenInput = document.getElementById(hiddenInputId);
    if (hiddenInput) hiddenInput.value = '';
    
    const archiveContainer = document.getElementById(`${type}-day-archive`);
    if (archiveContainer) archiveContainer.style.display = 'none';

    renderScoreCalendar(type);
}

// ==========================================
// 1. توابع کمکی برای رندر چک‌باکس‌ها
// ==========================================
function createStudentLabel(st, checkboxClass, viewMode) {
    const g = window.allGroupsData.find(x => x.id === st.groupId);
    const badge = g ? `<span class="group-label">${g.symbol} ${g.name}</span>` : '';
    return `<label class="student-checkbox-item"><input type="checkbox" class="${checkboxClass}" value="${st.id}"><div class="student-checkbox-item-content"><span>${st.firstName} ${st.lastName}</span>${badge}</div></label>`;
}

function createGroupedView(container, checkboxClass, viewMode, toggleGroupFnName) {
    if (window.allGroupsData.length === 0) { container.innerHTML = '<p style="text-align:center; color:#dc2626;">هیچ گروهی ساخته نشده است.</p>'; return; }
    window.allGroupsData.forEach(g => {
        const groupStudents = window.allStudentsData.filter(st => st.groupId === g.id);
        let groupHtml = `<details class="group-accordion"><summary><div class="group-header-checkbox"><input type="checkbox" class="group-select-all-checkbox" onchange="${toggleGroupFnName}(this, ${g.id}, '${checkboxClass}')"><span>${g.symbol} ${g.name} (${toPersianNumber(groupStudents.length)} نفر)</span></div></summary><div class="group-students-container">`;
        if (groupStudents.length === 0) groupHtml += `<p style="color:#64748b; font-size:0.85rem; text-align:center;">خالی</p>`;
        else groupStudents.forEach(st => { 
            const g2 = window.allGroupsData.find(x => x.id === st.groupId);
            const badge = g2 ? `<span class="group-label">${g2.symbol} ${g2.name}</span>` : '';
            groupHtml += `<label class="student-checkbox-item"><input type="checkbox" class="${checkboxClass} group-student-${g.id}" value="${st.id}"><div class="student-checkbox-item-content"><span>${st.firstName} ${st.lastName}</span>${badge}</div></label>`; 
        });
        groupHtml += `</div></details>`;
        container.innerHTML += groupHtml;
    });
}

// ==========================================
// 2. رندر چک‌باکس‌های بخش ارزشیابی عمومی
// ==========================================
function renderStudentCheckboxes() {
    const container = document.getElementById('students-checkbox-container');
    if (!container) return;
    
    if (window.allStudentsData.length === 0) { 
        container.innerHTML = '<p style="text-align:center; color:#64748b;">هیچ دانش‌آموزی ثبت نشده است.</p>'; 
        return; 
    }
    
    container.innerHTML = '';

    if (currentStudentView === 'flat') {
        window.allStudentsData.forEach(st => { container.innerHTML += createStudentLabel(st, 'student-checkbox'); });
    } else {
        createGroupedView(container, 'student-checkbox', 'grouped', 'toggleGroupSelection');
    }
}

function switchStudentView(view) {
    currentStudentView = view;
    document.getElementById('btnFlatView').classList.toggle('active', view === 'flat');
    document.getElementById('btnGroupView').classList.toggle('active', view === 'grouped');
    renderStudentCheckboxes();
}

function toggleGroupSelection(checkbox, groupId, checkboxClass = 'student-checkbox') {
    document.querySelectorAll(`.group-student-${groupId}`).forEach(cb => {
        if (cb.classList.contains(checkboxClass)) cb.checked = checkbox.checked;
    });
}

function toggleAllStudents(checked) { 
    document.querySelectorAll('.student-checkbox').forEach(cb => cb.checked = checked); 
    document.querySelectorAll('.group-select-all-checkbox').forEach(cb => cb.checked = checked);
}

// ==========================================
// 3. رندر چک‌باکس‌های بخش پویش قرآن
// ==========================================
function renderQuranStudentCheckboxes() {
    const container = document.getElementById('quran-students-container');
    if (!container) return;
    
    if (window.allStudentsData.length === 0) { 
        container.innerHTML = '<p style="text-align:center; color:#64748b;">هیچ دانش‌آموزی ثبت نشده است.</p>'; 
        return; 
    }
    
    container.innerHTML = '';

    if (currentQuranStudentView === 'flat') {
        window.allStudentsData.forEach(st => { container.innerHTML += createStudentLabel(st, 'quran-student-checkbox'); });
    } else {
        createGroupedView(container, 'quran-student-checkbox', 'grouped', 'toggleQuranGroupSelection');
    }
}

function switchQuranStudentView(view) {
    currentQuranStudentView = view;
    document.getElementById('btnQuranFlatView').classList.toggle('active', view === 'flat');
    document.getElementById('btnQuranGroupView').classList.toggle('active', view === 'grouped');
    renderQuranStudentCheckboxes();
}

function toggleQuranGroupSelection(checkbox, groupId, checkboxClass) {
    document.querySelectorAll(`.quran-student-checkbox.group-student-${groupId}`).forEach(cb => cb.checked = checkbox.checked);
}

// ==========================================
// 4. رندر چک‌باکس‌های بخش تشویق ویژه
// ==========================================
function renderSpecialStudentCheckboxes() {
    const container = document.getElementById('special-reward-students-container');
    if (!container) return;
    
    if (window.allStudentsData.length === 0) { 
        container.innerHTML = '<p style="text-align:center; color:#64748b;">هیچ دانش‌آموزی ثبت نشده است.</p>'; 
        return; 
    }
    
    container.innerHTML = '';

    if (currentSpecialStudentView === 'flat') {
        window.allStudentsData.forEach(st => { container.innerHTML += createStudentLabel(st, 'special-student-checkbox'); });
    } else {
        createGroupedView(container, 'special-student-checkbox', 'grouped', 'toggleSpecialGroupSelection');
    }
}

function switchSpecialStudentView(view) {
    currentSpecialStudentView = view;
    document.getElementById('btnSpecialFlatView').classList.toggle('active', view === 'flat');
    document.getElementById('btnSpecialGroupView').classList.toggle('active', view === 'grouped');
    renderSpecialStudentCheckboxes();
}

function toggleSpecialGroupSelection(checkbox, groupId, checkboxClass) {
    document.querySelectorAll(`.special-student-checkbox.group-student-${groupId}`).forEach(cb => cb.checked = checkbox.checked);
}

// ==========================================
// 5. رندر چک‌باکس‌های بخش خوش‌خط‌نویسی
// ==========================================
function renderHandwritingStudentCheckboxes() {
    const container = document.getElementById('handwriting-students-container');
    if (!container) return;
    
    if (window.allStudentsData.length === 0) { 
        container.innerHTML = '<p style="text-align:center; color:#64748b;">هیچ دانش‌آموزی ثبت نشده است.</p>'; 
        return; 
    }
    
    container.innerHTML = '';

    if (currentHandwritingStudentView === 'flat') {
        window.allStudentsData.forEach(st => { container.innerHTML += createStudentLabel(st, 'handwriting-student-checkbox'); });
    } else {
        createGroupedView(container, 'handwriting-student-checkbox', 'grouped', 'toggleHandwritingGroupSelection');
    }
}

function switchHandwritingStudentView(view) {
    currentHandwritingStudentView = view;
    document.getElementById('btnHandwritingFlatView').classList.toggle('active', view === 'flat');
    document.getElementById('btnHandwritingGroupView').classList.toggle('active', view === 'grouped');
    renderHandwritingStudentCheckboxes();
}

function toggleHandwritingGroupSelection(checkbox, groupId, checkboxClass) {
    document.querySelectorAll(`.handwriting-student-checkbox.group-student-${groupId}`).forEach(cb => cb.checked = checkbox.checked);
}

// ==========================================
// 6. منطق نمایش فرم امتیاز (پویا) برای ارزشیابی عمومی
// ==========================================
function renderScoreInput(item) {
    const section = document.getElementById('dynamic-score-section');
    const container = document.getElementById('score-input-container');
    const label = document.getElementById('score-label');
    section.style.display = 'block';
    container.innerHTML = '';
    if (!item) { section.style.display = 'none'; return; }

    if (item.type === 'level') {
        label.textContent = item.placeholder || 'انتخاب سطح عملکرد:';
        const select = document.createElement('select');
        select.className = 'form-control'; select.id = 'dynamicLevelInput'; select.required = true;
        select.innerHTML = '<option value="" disabled selected>انتخاب سطح...</option>';
        item.levels.forEach(level => {
            select.innerHTML += `<option value="${level.score}">${level.name} (${toPersianNumber(level.score)} امتیاز)</option>`;
        });
        container.appendChild(select);
    } else if (item.type === 'count') {
        label.textContent = item.placeholder || 'تعداد واحد را وارد کنید:';
        const input = document.createElement('input');
        input.type = 'number'; input.className = 'form-control'; input.id = 'dynamicCountInput'; input.min = '1'; input.placeholder = 'تعداد'; input.required = true;
        container.appendChild(input);
    } else if (item.type === 'fixed') {
        label.textContent = 'امتیاز اختصاص‌یافته:';
        container.innerHTML = `<p style="font-weight: bold; color: #4A90E2;">${toPersianNumber(item.score)} امتیاز (خودکار)</p>`;
    } else if (item.type === 'free') {
        label.textContent = item.placeholder || 'امتیاز را وارد کنید:';
        const input = document.createElement('input');
        input.type = 'number'; input.className = 'form-control'; input.id = 'dynamicFreeInput'; input.min = '0'; input.placeholder = 'عدد امتیاز'; input.required = true;
        container.appendChild(input);
    }
}

// ==========================================
// 7. پیش‌نمایش و ثبت ارزشیابی عمومی
// ==========================================
function showPreview(isFinal) {
    isSaveAndNext = !isFinal;
    const selectedIndex = document.getElementById('recordItem').value;
    if (selectedIndex === "") { showToast('آیتم ارزشیابی را انتخاب کنید.', 'error'); return; }
    
    const selectedItem = window.allAssessmentItems.find(i => i.id == selectedIndex);
    if (!selectedItem) { showToast('آیتم یافت نشد.', 'error'); return; }
    
    let finalScore = 0;
    try {
        if (selectedItem.type === 'level') {
            const l = document.getElementById('dynamicLevelInput');
            if (!l || !l.value) { showToast('سطح را انتخاب کنید.', 'error'); return; }
            finalScore = parseInt(l.value) || 0;
        } else if (selectedItem.type === 'count') { 
            finalScore = (parseInt(document.getElementById('dynamicCountInput').value) || 0) * selectedItem.unitScore; 
        } else if (selectedItem.type === 'fixed') { 
            finalScore = selectedItem.score; 
        } else if (selectedItem.type === 'free') { 
            finalScore = parseInt(document.getElementById('dynamicFreeInput').value) || 0; 
        }
    } catch (e) { showToast('فیلدها را کامل کنید.', 'error'); return; }

    const studentCheckboxes = document.querySelectorAll('.student-checkbox:checked');
    if (studentCheckboxes.length === 0) { showToast('دانش‌آموز انتخاب کنید.', 'error'); return; }
    
    const dateStr = document.getElementById('recordDate').value;
    if (!dateStr) {
        showToast('تاریخ را از تقویم انتخاب کنید.', 'error'); return;
    }

    document.getElementById('preview-content').innerHTML = `
        <div class="preview-row"><strong>آیتم:</strong> <span>${selectedItem.title}</span></div>
        <div class="preview-row"><strong>تعداد:</strong> <span>${toPersianNumber(studentCheckboxes.length)} نفر</span></div>
        <div class="preview-row"><strong>تاریخ:</strong> <span>${toPersianNumber(dateStr)}</span></div>
        <div class="preview-row" style="background: #eef2ff; padding: 10px; border-radius: 8px; margin-top: 10px;"><strong>امتیاز:</strong> <span style="font-size: 1.2rem; color: #4A90E2;">${toPersianNumber(finalScore)}</span></div>
    `;
    
    window.tempRecordData = {
        subjectId: parseInt(document.getElementById('recordSubject').value),
        itemName: selectedItem.title, 
        title: document.getElementById('recordTitle').value, 
        date: dateStr,
        students: Array.from(studentCheckboxes).map(cb => parseInt(cb.value)),
        arf: document.getElementById('recordArf').checked, 
        finalScore: finalScore,
        academicYear: window.activeAcademicYear
    };
    document.getElementById('preview-modal').classList.add('show');
}

function closePreviewModal() { document.getElementById('preview-modal').classList.remove('show'); }

async function confirmAndSaveRecord() {
    if (!window.tempRecordData) return;
    try {
        await saveData('records', window.tempRecordData);
        
        showToast('امتیاز با موفقیت ثبت شد!', 'success');
        closePreviewModal();
        
        if (isSaveAndNext) {
            document.querySelectorAll('.student-checkbox').forEach(cb => cb.checked = false);
            const scoreInput = document.getElementById('dynamicLevelInput') || document.getElementById('dynamicCountInput') || document.getElementById('dynamicFreeInput');
            if (scoreInput) scoreInput.value = '';
            document.getElementById('record-form').scrollIntoView({ behavior: 'smooth' });
            loadAllData(); 
        } else {
            document.getElementById('record-form').reset(); 
            resetScoreCalendar('record');
            document.getElementById('dynamic-score-section').style.display = 'none'; 
            loadAllData();
        }
    } catch (error) { showToast('خطا در ذخیره!', 'error'); closePreviewModal(); }
}

// ==========================================
// 8. منطق ثبت پویش قرآن کریم
// ==========================================
async function saveQuranRecord() {
    const studentCheckboxes = document.querySelectorAll('.quran-student-checkbox:checked');
    if (studentCheckboxes.length === 0) { showToast('دانش‌آموز انتخاب کنید.', 'error'); return; }

    const surahSelect = document.getElementById('quranSurahSelect');
    const selectedOption = surahSelect.options[surahSelect.selectedIndex];
    if (!surahSelect.value) { showToast('سوره را انتخاب کنید.', 'error'); return; }
    const totalAyat = parseInt(surahSelect.value);
    const surahName = selectedOption.getAttribute('data-surah');

    const ayat = parseInt(document.getElementById('quranAyatInput').value) || 0;
    if (ayat <= 0) { showToast('تعداد آیات را وارد کنید.', 'error'); return; }

    const threshold = Math.ceil((totalAyat / 2) + 1);
    const finalScore = (ayat >= threshold) ? ayat * 5 : 0;
    
    if (finalScore === 0) {
        showToast(`برای دریافت امتیاز، حداقل ${toPersianNumber(threshold)} آیه از سوره ${surahName} باید حفظ شود.`, 'error');
        return;
    }

    const dateStr = document.getElementById('quranDateHidden').value;
    if (!dateStr) { showToast('تاریخ را از تقویم انتخاب کنید.', 'error'); return; }

    const recordData = {
        subjectId: null,
        itemName: "پویش حفظ جزء سی قرآن کریم",
        title: `حفظ سوره ${surahName} - ${toPersianNumber(ayat)} آیه`,
        date: dateStr,
        students: Array.from(studentCheckboxes).map(cb => parseInt(cb.value)),
        arf: false,
        finalScore: finalScore,
        academicYear: window.activeAcademicYear
    };

    try {
        await saveData('records', recordData);

        for (const studentId of recordData.students) {
            const allRecords = await getAllData('records'); 
            let totalSurahs = 0, totalAyats = 0;
            allRecords.forEach(rec => {
                if (rec.itemName === "پویش حفظ جزء سی قرآن کریم" && rec.students.includes(studentId) && rec.academicYear === window.activeAcademicYear) {
                    totalSurahs += 1;
                    const match = rec.title.match(/- (\d+) آیه/); 
                    if (match) totalAyats += parseInt(match[1]);
                }
            });
            await saveData('badgesSettings', { 
                id: `quranReward_${studentId}_${Date.now()}`, 
                studentId: studentId, 
                title: "تشویق شرکت در پویش حفظ جزء سی قرآن کریم", 
                totalSurahs: totalSurahs, 
                totalAyats: totalAyats, 
                date: dateStr,
                academicYear: window.activeAcademicYear
            });
        }

        showToast('پویش قرآن با موفقیت ثبت شد!', 'success');
        document.getElementById('quran-form').reset();
        resetScoreCalendar('quran');
        loadAllData();
    } catch (e) { console.error(e); showToast('خطا در ثبت پویش قرآن.', 'error'); }
}

// ==========================================
// 9. منطق ثبت تشویق ویژه
// ==========================================
async function saveSpecialReward() {
    const studentCheckboxes = document.querySelectorAll('.special-student-checkbox:checked');
    if (studentCheckboxes.length === 0) { showToast('دانش‌آموز انتخاب کنید.', 'error'); return; }

    const title = document.getElementById('specialRewardTitle').value.trim();
    if (!title) { showToast('عنوان تشویق را وارد کنید.', 'error'); return; }

    const score = parseInt(document.getElementById('specialRewardScore').value);
    if (isNaN(score) || score <= 0) { showToast('امتیاز معتبر وارد کنید.', 'error'); return; }

    const dateStr = document.getElementById('specialDateHidden').value;
    if (!dateStr) { showToast('تاریخ را از تقویم انتخاب کنید.', 'error'); return; }

    const recordData = {
        subjectId: null,
        itemName: "تشویق ویژه",
        title: title,
        date: dateStr,
        students: Array.from(studentCheckboxes).map(cb => parseInt(cb.value)),
        arf: false,
        finalScore: score,
        academicYear: window.activeAcademicYear
    };

    try {
        await saveData('records', recordData);
        showToast('تشویق ویژه با موفقیت ثبت شد!', 'success');
        document.getElementById('special-reward-form').reset();
        resetScoreCalendar('special');
        loadAllData();
    } catch (e) { console.error(e); showToast('خطا در ثبت تشویق ویژه.', 'error'); }
}

// ==========================================
// 10. منطق ثبت تشویق خوش‌خط‌نویسی
// ==========================================
async function saveHandwritingReward() {
    const studentCheckboxes = document.querySelectorAll('.handwriting-student-checkbox:checked');
    if (studentCheckboxes.length === 0) { showToast('دانش‌آموز انتخاب کنید.', 'error'); return; }

    const dateStr = document.getElementById('handwritingDateHidden').value;
    if (!dateStr) { showToast('تاریخ را از تقویم انتخاب کنید.', 'error'); return; }

    const recordData = {
        subjectId: null,
        itemName: "تشویق خوش‌خط‌نویسی",
        title: "تشویق خوش‌خط‌نویسی",
        date: dateStr,
        students: Array.from(studentCheckboxes).map(cb => parseInt(cb.value)),
        arf: false,
        finalScore: 4,
        academicYear: window.activeAcademicYear
    };

    try {
        await saveData('records', recordData);
        showToast('تشویق خوش‌خط‌نویسی با موفقیت ثبت شد!', 'success');
        document.getElementById('handwriting-reward-form').reset();
        resetScoreCalendar('handwriting');
        loadAllData();
    } catch (e) { console.error(e); showToast('خطا در ثبت تشویق خوش‌خط‌نویسی.', 'error'); }
}

// ==========================================
// 11. سوابق ارزشیابی (لیست، فیلتر، صفحه‌بندی)
// ==========================================
function loadAssessmentRecords() {
    const container = document.getElementById('assessment-records-list');
    const pagination = document.getElementById('records-pagination');
    if (!container) return;
    
    container.innerHTML = '<p style="text-align:center;">در حال بارگذاری...</p>';
    
    const filterSubject = document.getElementById('recordsFilterSubject').value;
    const filterStudent = document.getElementById('recordsFilterStudent').value;
    const searchText = document.getElementById('recordsSearchText').value.trim();

    let filteredRecords = window.allRecordsData.filter(rec => {
        if (filterSubject && rec.subjectId != filterSubject) return false;
        if (filterStudent && (!rec.students || !rec.students.includes(parseInt(filterStudent)))) return false;
        if (searchText && !rec.title.includes(searchText)) return false;
        return true;
    });

    filteredRecords.sort((a, b) => b.date.localeCompare(a.date));
    const countEl = document.getElementById('records-count');
    if (countEl) countEl.textContent = `تعداد نتایج: ${toPersianNumber(filteredRecords.length)} رکورد`;

    if (filteredRecords.length === 0) { 
        container.innerHTML = '<p style="text-align:center; color:#64748b;">هیچ رکوردی یافت نشد.</p>'; 
        if(pagination) pagination.style.display = 'none';
        return; 
    }

    const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
    if (currentPage.records > totalPages) currentPage.records = totalPages;
    if (currentPage.records < 1) currentPage.records = 1;
    const startIndex = (currentPage.records - 1) * itemsPerPage;
    const paginatedRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage);

    container.innerHTML = '';
    paginatedRecords.forEach(rec => {
        const subject = window.allSubjectsData.find(s => s.id === rec.subjectId);
        const subjectName = subject ? `${subject.symbol || ''} ${subject.name}` : 'بدون درس (تشویق/قرآن)';
        let studentNames = '';
        if (rec.students && rec.students.length > 0) {
            const names = rec.students.map(id => {
                const st = window.allStudentsData.find(s => s.id === id);
                return st ? `${st.firstName} ${st.lastName}` : '';
            }).filter(n => n !== '');
            studentNames = names.join('، ');
        }
        container.innerHTML += `
            <div class="record-item ${rec.arf ? 'arf-list-item' : ''}">
                <div class="record-header">
                    <span class="record-title">${rec.title} ${rec.arf ? '🎁' : ''}</span>
                    <span class="record-score">${toPersianNumber(rec.finalScore)} امتیاز</span>
                </div>
                <div class="record-details"><span>📚 ${subjectName} | ${rec.itemName}</span><span>📅 ${toPersianNumber(rec.date)}</span></div>
                <div class="record-details" style="font-size: 0.8rem; margin-top: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">👥 ${studentNames}</div>
                <div class="record-actions">
                    <button class="btn btn-secondary btn-sm" onclick="openEditRecordModal(${rec.id})">✏️ ویرایش</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteRecord(${rec.id})">🗑️ حذف</button>
                </div>
            </div>`;
    });

    if (pagination) {
        if (totalPages > 1) {
            pagination.style.display = 'flex';
            document.getElementById('recordsPageInfo').textContent = `صفحه ${toPersianNumber(currentPage.records)} از ${toPersianNumber(totalPages)}`;
            document.getElementById('btnPrevRecords').disabled = (currentPage.records === 1);
            document.getElementById('btnNextRecords').disabled = (currentPage.records === totalPages);
        } else { pagination.style.display = 'none'; }
    }
}

function clearRecordFilters() {
    document.getElementById('recordsFilterSubject').value = '';
    document.getElementById('recordsFilterStudent').value = '';
    document.getElementById('recordsSearchText').value = '';
    currentPage.records = 1;
    loadAssessmentRecords();
}

async function deleteRecord(id) {
    if (!confirm('آیا از حذف این رکورد مطمئن هستید؟')) return;
    try { await deleteData('records', id); showToast('رکورد حذف شد.', 'success'); loadAllData(); }
    catch (e) { console.error(e); showToast('خطا در حذف رکورد.', 'error'); }
}

// ==========================================
// 12. ویرایش رکورد
// ==========================================
async function openEditRecordModal(id) {
    try {
        const record = await getDataById('records', id);
        if (!record) return;
        
        document.getElementById('editRecordId').value = record.id;
        document.getElementById('editRecordTitle').value = record.title;
        document.getElementById('editRecordDate').value = record.date;
        document.getElementById('editRecordScore').value = record.finalScore;
        
        const subjectSelect = document.getElementById('editRecordSubject');
        const itemSelect = document.getElementById('editRecordItem');

        if (record.subjectId && record.itemName !== "پویش حفظ جزء سی قرآن کریم" && record.itemName !== "تشویق ویژه" && record.itemName !== "تشویق خوش‌خط‌نویسی") {
            subjectSelect.value = record.subjectId;
            const itemInList = window.allAssessmentItems.find(i => i.title === record.itemName);
            if (itemInList) itemSelect.value = itemInList.id;
            subjectSelect.disabled = false;
            itemSelect.disabled = false;
        } else {
            subjectSelect.value = '';
            itemSelect.value = '';
            subjectSelect.disabled = true;
            itemSelect.disabled = true;
        }
        
        const container = document.getElementById('edit-record-students-container');
        container.innerHTML = '';
        
        window.allStudentsData.forEach(st => {
            const g = window.allGroupsData.find(x => x.id === st.groupId);
            const badge = g ? `<span class="group-label">${g.symbol} ${g.name}</span>` : '';
            const isChecked = record.students.includes(st.id) ? 'checked' : '';
            container.innerHTML += `
                <label class="student-checkbox-item">
                    <input type="checkbox" class="edit-student-checkbox" value="${st.id}" ${isChecked}>
                    <div class="student-checkbox-item-content"><span>${st.firstName} ${st.lastName}</span>${badge}</div>
                </label>
            `;
        });

        document.getElementById('edit-record-modal').classList.add('show');
    } catch (e) { console.error(e); showToast('خطا در باز کردن فرم ویرایش.', 'error'); }
}

function closeEditModal() { document.getElementById('edit-record-modal').classList.remove('show'); }

async function saveEditedRecord(event) {
    if(event) event.preventDefault();
    const id = parseInt(document.getElementById('editRecordId').value);
    const subjectSelect = document.getElementById('editRecordSubject');
    const itemSelect = document.getElementById('editRecordItem');
    
    const subjectId = (subjectSelect.value) ? parseInt(subjectSelect.value) : null;
    const itemId = itemSelect.value;
    const newTitle = document.getElementById('editRecordTitle').value;
    const newDate = document.getElementById('editRecordDate').value;
    const newScore = parseInt(document.getElementById('editRecordScore').value);
    
    const studentCheckboxes = document.querySelectorAll('.edit-student-checkbox:checked');
    const students = Array.from(studentCheckboxes).map(cb => parseInt(cb.value));

    let itemName = '';
    if (subjectId !== null && itemId) {
        const selectedItem = window.allAssessmentItems.find(i => i.id == itemId);
        itemName = selectedItem ? selectedItem.title : '';
    }

    if (!newTitle || !newDate || isNaN(newScore)) { 
        showToast('لطفاً عنوان، تاریخ و امتیاز را پر کنید.', 'error'); return; 
    }
    if (students.length === 0) {
        showToast('حداقل یک دانش‌آموز را انتخاب کنید.', 'error'); return;
    }

    try {
        const record = await getDataById('records', id);
        if (!record) return;
        
        if (subjectId !== null && itemName) {
            record.subjectId = subjectId;
            record.itemName = itemName;
        } else {
            record.subjectId = null;
        }
        
        record.title = newTitle; 
        record.date = newDate; 
        record.finalScore = newScore;
        record.students = students;
        record.academicYear = window.activeAcademicYear;
        
        await saveData('records', record);
        showToast('رکورد با موفقیت ویرایش شد.', 'success');
        closeEditModal(); loadAllData();
    } catch (e) { console.error(e); showToast('خطا در ذخیره.', 'error'); }
}

// ==========================================
// 13. تشویق‌های پویش قرآن (لیست)
// ==========================================
async function loadQuranRewards() {
    const container = document.getElementById('quran-rewards-list');
    if (!container) return;
    try {
        const allBadges = await getAllData('badgesSettings');
        const quranRewards = allBadges.filter(b => b.id && b.id.startsWith('quranReward_') && b.academicYear === window.activeAcademicYear);
        
        if (quranRewards.length === 0) { container.innerHTML = '<p style="color:#64748b; text-align:center;">هنوز تشویقی صادر نشده است.</p>'; return; }
        
        const grouped = {};
        quranRewards.forEach(reward => { 
            if (!grouped[reward.studentId]) grouped[reward.studentId] = []; 
            grouped[reward.studentId].push(reward); 
        });
        
        let html = '';
        for (const studentId in grouped) {
            const student = window.allStudentsData.find(s => s.id == studentId);
            const studentName = student ? `${student.firstName} ${student.lastName}` : `دانش‌آموز ${toPersianNumber(studentId)}`;
            const latest = grouped[studentId][grouped[studentId].length - 1];
            html += `<div class="list-item" style="flex-direction: column; align-items: flex-start; padding: 15px; background: var(--arf-bg); border-right: 4px solid var(--arf-border); margin-bottom: 10px;"><strong style="font-size: 1.1rem;">🏅 ${studentName}</strong><span style="font-size: 0.9rem; color: var(--arf-border);">تعداد سوره‌ها: ${toPersianNumber(latest.totalSurahs)} | تعداد آیات: ${toPersianNumber(latest.totalAyats)}</span></div>`;
        }
        container.innerHTML = html;
    } catch (e) { container.innerHTML = '<p style="color:red;">خطا</p>'; }
}

// ==========================================
// 14. خروجی اکسل سوابق ارزشیابی (استاندارد نهایی)
// ==========================================
async function exportScoreCSV() {
    try {
        // استفاده از کاما (,) برای سازگاری کامل با Google Sheets
        let csvContent = "ردیف,عنوان,درس,آیتم,تاریخ,امتیاز,ارفاق\r\n";
        const sorted = [...window.allRecordsData].sort((a, b) => b.date.localeCompare(a.date));
        
        sorted.forEach((rec, i) => {
            const s = window.allSubjectsData.find(x => x.id === rec.subjectId); 
            const sn = s ? s.name : 'بدون درس';
            csvContent += `${i + 1},"${rec.title}","${sn}","${rec.itemName}","${rec.date}",${rec.finalScore},"${rec.arf ? 'دارد' : 'ندارد'}"\r\n`;
        });

        // *** راه‌حل استاندارد: UTF-8 با BOM و پسوند CSV ***
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); 
        a.href = url; 
        a.download = `kosha_records_${new Date().toISOString().slice(0,10)}.csv`; 
        a.click();
        URL.revokeObjectURL(url);
        showToast('فایل CSV سوابق دانلود شد!', 'success');
    } catch (e) { 
        console.error(e); 
        showToast('خطا در تولید فایل.', 'error'); 
    }
}