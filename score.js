// ==========================================
// فایل score.js — منطق تب امتیاز (نسخه چندساله)
// ==========================================

let isSaveAndNext = false;

let currentQuranStudentView = 'flat';
let currentSpecialStudentView = 'flat';
let currentHandwritingStudentView = 'flat';

let scoreCalendarState = {
    record: { year: 1405, month: 7, selectedDate: '' },
    quran: { year: 1405, month: 7, selectedDate: '' },
    special: { year: 1405, month: 7, selectedDate: '' },
    handwriting: { year: 1405, month: 7, selectedDate: '' }
};

const scoreJalaliMonths = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

let _lastStudentsHash = '';

function getStudentsHash() {
    return window.allStudentsData.map(s => s.id).join(',') + '|' + window.allGroupsData.map(g => g.id).join(',');
}

function saveScoreCalendarState(type) {
    try {
        localStorage.setItem(`kosha-score-cal-${type}`, JSON.stringify(scoreCalendarState[type]));
    } catch (e) { console.log('خطا در ذخیره تقویم', e); }
}

function loadScoreCalendarState(type, startYear) {
    try {
        const saved = localStorage.getItem(`kosha-score-cal-${type}`);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.year >= startYear) {
                scoreCalendarState[type] = parsed;
            }
        }
    } catch (e) { console.log('خطا در بازیابی تقویم', e); }
}

function initScoreEvents() {
    const recordItem = document.getElementById('recordItem');
    if (recordItem && !recordItem.dataset.listenerAttached) {
        recordItem.addEventListener('change', (e) => {
            if (e.target.value !== "") {
                const item = window.allAssessmentItems.find(i => i.id == e.target.value);
                if(item) renderScoreInput(item);
            } else {
                const section = document.getElementById('dynamic-score-section');
                if (section) section.style.display = 'none';
            }
        });
        recordItem.dataset.listenerAttached = 'true';
    }
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

    if (window.allRecordsData && Array.isArray(window.allRecordsData)) {
        initScoreCalendars();
    }
    
    const currentHash = getStudentsHash();
    if (currentHash !== _lastStudentsHash) {
        renderStudentCheckboxes();
        renderQuranStudentCheckboxes();
        renderSpecialStudentCheckboxes();
        renderHandwritingStudentCheckboxes();
        _lastStudentsHash = currentHash;
    }
    
    loadAssessmentRecords();
    loadQuranRewards();
}

function initScoreCalendars() {
    const ay = window.activeAcademicYear || '1405-1406';
    const [startYearStr] = ay.split('-');
    const startYear = parseInt(startYearStr);
    
    ['record', 'quran', 'special', 'handwriting'].forEach(type => {
        loadScoreCalendarState(type, startYear);
        
        if (!scoreCalendarState[type].year || scoreCalendarState[type].year < startYear) {
            scoreCalendarState[type].year = startYear;
            if (!scoreCalendarState[type].month) scoreCalendarState[type].month = 7;
        }
        
        if (scoreCalendarState[type].selectedDate) {
            const displayEl = document.getElementById(`${type}DateDisplay`);
            if (displayEl) displayEl.textContent = toPersianNumber(scoreCalendarState[type].selectedDate);
            
            const hiddenInputId = type === 'record' ? 'recordDate' : `${type}DateHidden`;
            const hiddenInput = document.getElementById(hiddenInputId);
            if (hiddenInput) hiddenInput.value = scoreCalendarState[type].selectedDate;
        }
        
        renderScoreCalendar(type);
    });
}

function changeScoreCalendarMonth(type, delta) {
    const ay = window.activeAcademicYear || '1405-1406';
    const [startYearStr, endYearStr] = ay.split('-');
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
        const titleEl = document.getElementById(`${type}-calendar-title`);
        if (titleEl && titleEl.dataset.year) {
            state.year = parseInt(titleEl.dataset.year);
            state.month = parseInt(titleEl.dataset.month);
        }
        return;
    }

    saveScoreCalendarState(type);
    renderScoreCalendar(type);
}

function renderScoreCalendar(type) {
    const state = scoreCalendarState[type];
    
    const titleEl = document.getElementById(`${type}-calendar-title`);
    if (!titleEl) return;
    
    titleEl.dataset.year = state.year;
    titleEl.dataset.month = state.month;
    
    const ay = window.activeAcademicYear || '1405-1406';
    const [startY, endY] = ay.split('-');
    
    titleEl.innerHTML = `
        <select onchange="updateScoreCalendarSelect('${type}', 'month', this.value)">
            ${scoreJalaliMonths.map((m, i) => `<option value="${i + 1}" ${state.month === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
        <select onchange="updateScoreCalendarSelect('${type}', 'year', this.value)">
            ${[parseInt(startY), parseInt(endY)].map(y => `<option value="${y}" ${state.year === y ? 'selected' : ''}>${toPersianNumber(y)}</option>`).join('')}
        </select>
    `;

    const grid = document.getElementById(`${type}-calendar-grid`);
    if (!grid) return;
    grid.innerHTML = '';

    const firstDay = getJalaliFirstDayOfWeek(state.year, state.month);
    const daysInMonth = getJalaliDaysInMonth(state.year, state.month);
    
    const startBound = `${startY}/07/01`;
    const endBound = `${endY}/06/31`;

    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div class="calendar-day empty"></div>`;
    }

    const relevantRecords = (window.allRecordsData || []).filter(rec => {
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
    saveScoreCalendarState(type);
    renderScoreCalendar(type);
}

function selectScoreCalendarDay(type, dateStr) {
    scoreCalendarState[type].selectedDate = dateStr;
    saveScoreCalendarState(type);
    
    const displayEl = document.getElementById(`${type}DateDisplay`);
    if (displayEl) displayEl.textContent = toPersianNumber(dateStr);

    const hiddenInputId = type === 'record' ? 'recordDate' : `${type}DateHidden`;
    const hiddenInput = document.getElementById(hiddenInputId);
    if (hiddenInput) hiddenInput.value = dateStr;

    renderScoreCalendar(type);
    renderScoreDayArchive(type, dateStr);
}

function renderScoreDayArchive(type, dateStr) {
    const archiveContainer = document.getElementById(`${type}-day-archive`);
    const archiveList = document.getElementById(`${type}-day-archive-list`);
    if (!archiveContainer || !archiveList) return;

    const eventText = (typeof getEventTitleForDateString === 'function') 
        ? getEventTitleForDateString(dateStr) 
        : '';

    const dayRecords = (window.allRecordsData || []).filter(rec => {
        if (rec.date !== dateStr) return false;
        if (type === 'quran') return rec.itemName === "پویش حفظ جزء سی قرآن کریم";
        if (type === 'special') return rec.itemName === "تشویق ویژه";
        if (type === 'handwriting') return rec.itemName === "تشویق خوش‌خط‌نویسی";
        if (type === 'record') return rec.subjectId !== null && rec.itemName !== "پویش حفظ جزء سی قرآن کریم" && rec.itemName !== "تشویق ویژه" && rec.itemName !== "تشویق خوش‌خط‌نویسی";
        return false;
    });

    if (!eventText && dayRecords.length === 0) {
        archiveContainer.style.display = 'none';
        return;
    }

    archiveContainer.style.display = 'block';
    archiveList.innerHTML = '';

    if (eventText) {
        archiveList.innerHTML += `
            <div style="background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%); border: 1px solid #c4b5fd; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; display: flex; align-items: flex-start; gap: 8px;">
                <span style="font-size: 1.2rem; flex-shrink: 0;">🎉</span>
                <div>
                    <div style="font-size: 0.75rem; color: #7c3aed; font-weight: bold; margin-bottom: 2px;">مناسبت این روز</div>
                    <div style="font-size: 0.9rem; color: #5b21b6; line-height: 1.5;">${eventText}</div>
                </div>
            </div>
        `;
    }

    if (dayRecords.length > 0) {
        archiveList.innerHTML += `<h4 style="margin: 8px 0;">📋 سوابق ثبت‌شده در این روز (${toPersianNumber(dayRecords.length)} مورد):</h4>`;
        
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
    } else {
        archiveList.innerHTML += `<p style="text-align:center; color: var(--text-muted); font-size: 0.85rem; margin: 8px 0;">هیچ رکوردی برای این روز ثبت نشده است.</p>`;
    }
}

function resetScoreCalendar(type) {
    scoreCalendarState[type].selectedDate = '';
    saveScoreCalendarState(type);
    
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
// مدیریت انتخاب دانش‌آموزان
// ==========================================

function createStudentLabel(st, checkboxClass) {
    const g = window.allGroupsData.find(x => x.id === st.groupId);
    const badge = g ? `<span class="group-label">${g.symbol} ${g.name}</span>` : '';
    return `<label class="student-checkbox-item"><input type="checkbox" class="${checkboxClass}" value="${st.id}"><div class="student-checkbox-item-content"><span>${st.firstName} ${st.lastName}</span>${badge}</div></label>`;
}

function createGroupedView(container, checkboxClass, toggleGroupFnName) {
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
        createGroupedView(container, 'student-checkbox', 'toggleGroupSelection');
    }
}

function switchStudentView(view) {
    currentStudentView = view;
    const btnFlat = document.getElementById('btnFlatView');
    const btnGroup = document.getElementById('btnGroupView');
    if (btnFlat) btnFlat.classList.toggle('active', view === 'flat');
    if (btnGroup) btnGroup.classList.toggle('active', view === 'grouped');
    renderStudentCheckboxes();
}

function toggleGroupSelection(checkbox, groupId, checkboxClass = 'student-checkbox') {
    document.querySelectorAll(`.group-student-${groupId}`).forEach(cb => {
        if (cb.classList.contains(checkboxClass)) cb.checked = checkbox.checked;
    });
}

function toggleAllStudents(checked, checkboxClass = 'student-checkbox') { 
    document.querySelectorAll(`.${checkboxClass}`).forEach(cb => cb.checked = checked); 
    const section = checkboxClass === 'student-checkbox' ? null : document.getElementById(`${checkboxClass.replace('-student-checkbox', '')}-students-container`);
    if (section) {
        section.querySelectorAll('.group-select-all-checkbox').forEach(cb => cb.checked = checked);
    } else {
        document.querySelectorAll('.group-select-all-checkbox').forEach(cb => cb.checked = checked);
    }
}

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
        createGroupedView(container, 'quran-student-checkbox', 'toggleQuranGroupSelection');
    }
}

function switchQuranStudentView(view) {
    currentQuranStudentView = view;
    const btnFlat = document.getElementById('btnQuranFlatView');
    const btnGroup = document.getElementById('btnQuranGroupView');
    if (btnFlat) btnFlat.classList.toggle('active', view === 'flat');
    if (btnGroup) btnGroup.classList.toggle('active', view === 'grouped');
    renderQuranStudentCheckboxes();
}

function toggleQuranGroupSelection(checkbox, groupId, checkboxClass) {
    document.querySelectorAll(`.quran-student-checkbox.group-student-${groupId}`).forEach(cb => cb.checked = checkbox.checked);
}

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
        createGroupedView(container, 'special-student-checkbox', 'toggleSpecialGroupSelection');
    }
}

function switchSpecialStudentView(view) {
    currentSpecialStudentView = view;
    const btnFlat = document.getElementById('btnSpecialFlatView');
    const btnGroup = document.getElementById('btnSpecialGroupView');
    if (btnFlat) btnFlat.classList.toggle('active', view === 'flat');
    if (btnGroup) btnGroup.classList.toggle('active', view === 'grouped');
    renderSpecialStudentCheckboxes();
}

function toggleSpecialGroupSelection(checkbox, groupId, checkboxClass) {
    document.querySelectorAll(`.special-student-checkbox.group-student-${groupId}`).forEach(cb => cb.checked = checkbox.checked);
}

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
        createGroupedView(container, 'handwriting-student-checkbox', 'toggleHandwritingGroupSelection');
    }
}

function switchHandwritingStudentView(view) {
    currentHandwritingStudentView = view;
    const btnFlat = document.getElementById('btnHandwritingFlatView');
    const btnGroup = document.getElementById('btnHandwritingGroupView');
    if (btnFlat) btnFlat.classList.toggle('active', view === 'flat');
    if (btnGroup) btnGroup.classList.toggle('active', view === 'grouped');
    renderHandwritingStudentCheckboxes();
}

function toggleHandwritingGroupSelection(checkbox, groupId, checkboxClass) {
    document.querySelectorAll(`.handwriting-student-checkbox.group-student-${groupId}`).forEach(cb => cb.checked = checkbox.checked);
}

// ==========================================
// ثبت ارزشیابی
// ==========================================

function renderScoreInput(item) {
    const section = document.getElementById('dynamic-score-section');
    const container = document.getElementById('score-input-container');
    const label = document.getElementById('score-label');
    if (!section || !container || !label) return;
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

function showPreview(isFinal) {
    isSaveAndNext = !isFinal;
    const selectedIndexEl = document.getElementById('recordItem');
    if (!selectedIndexEl) return;
    const selectedIndex = selectedIndexEl.value;
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

    const previewContent = document.getElementById('preview-content');
    if (previewContent) {
        const eventText = (typeof getFormattedEventsForDate === 'function') 
            ? getFormattedEventsForDate(dateStr) 
            : '';
        
        previewContent.innerHTML = `
            <div class="preview-row"><strong>آیتم:</strong> <span>${selectedItem.title}</span></div>
            <div class="preview-row"><strong>تعداد:</strong> <span>${toPersianNumber(studentCheckboxes.length)} نفر</span></div>
            <div class="preview-row"><strong>تاریخ:</strong> <span>${toPersianNumber(dateStr)}</span></div>
            ${eventText ? `<div class="preview-row" style="background: #ede9fe; padding: 8px 10px; border-radius: 8px; margin-top: 5px; font-size: 0.85rem; color: #5b21b6;"><span>${eventText}</span></div>` : ''}
            <div class="preview-row" style="background: #eef2ff; padding: 10px; border-radius: 8px; margin-top: 10px;"><strong>امتیاز:</strong> <span style="font-size: 1.2rem; color: #4A90E2;">${toPersianNumber(finalScore)}</span></div>
        `;
    }
    
    // ✅ داده‌های رکورد با سال تحصیلی جاری
    window.tempRecordData = {
        subjectId: parseInt(document.getElementById('recordSubject').value),
        itemName: selectedItem.title, 
        title: document.getElementById('recordTitle').value, 
        date: dateStr,
        students: Array.from(studentCheckboxes).map(cb => parseInt(cb.value)),
        arf: document.getElementById('recordArf').checked, 
        finalScore: finalScore,
        academicYear: window.activeAcademicYear // ✅ سال تحصیلی جاری
    };
    const previewModal = document.getElementById('preview-modal');
    if (previewModal) previewModal.classList.add('show');
}

function closePreviewModal() { 
    const modal = document.getElementById('preview-modal');
    if (modal) modal.classList.remove('show'); 
}

async function confirmAndSaveRecord() {
    if (!window.tempRecordData) return;
    
    const recordSubjectEl = document.getElementById('recordSubject');
    const recordItemEl = document.getElementById('recordItem');
    const currentSubject = recordSubjectEl ? recordSubjectEl.value : '';
    const currentItem = recordItemEl ? recordItemEl.value : '';
    
    try {
        await saveData('records', window.tempRecordData);
        
        showToast('امتیاز با موفقیت ثبت شد!', 'success');
        closePreviewModal();
        
        if (typeof clearFormDirty === 'function') clearFormDirty();
        
        if (isSaveAndNext) {
            document.querySelectorAll('.student-checkbox').forEach(cb => cb.checked = false);
            document.querySelectorAll('.group-select-all-checkbox').forEach(cb => cb.checked = false);
            
            const scoreInput = document.getElementById('dynamicLevelInput') || document.getElementById('dynamicCountInput') || document.getElementById('dynamicFreeInput');
            if (scoreInput) scoreInput.value = '';
            
            await loadAllData(); 
            
            setTimeout(() => {
                if (currentSubject && recordSubjectEl) recordSubjectEl.value = currentSubject;
                if (currentItem && recordItemEl) {
                    recordItemEl.value = currentItem;
                    const itemData = window.allAssessmentItems.find(i => i.id == currentItem);
                    if (itemData && typeof renderScoreInput === 'function') renderScoreInput(itemData);
                }
            }, 100);
            
            const recordForm = document.getElementById('record-form');
            if (recordForm) recordForm.scrollIntoView({ behavior: 'smooth' });
            
        } else {
            const recordForm = document.getElementById('record-form');
            if (recordForm) recordForm.reset(); 
            resetScoreCalendar('record');
            const dynSection = document.getElementById('dynamic-score-section');
            if (dynSection) dynSection.style.display = 'none'; 
            await loadAllData();
            
            if (recordForm) recordForm.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) { 
        showToast('خطا در ذخیره!', 'error'); 
        closePreviewModal(); 
    }
}

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
                id: `quranReward_${studentId}_${generateUniqueId()}`, 
                studentId: studentId, 
                title: "تشویق شرکت در پویش حفظ جزء سی قرآن کریم", 
                totalSurahs: totalSurahs, 
                totalAyats: totalAyats, 
                date: dateStr,
                academicYear: window.activeAcademicYear
            });
        }

        showToast('پویش قرآن با موفقیت ثبت شد!', 'success');
        const form = document.getElementById('quran-form');
        if (form) form.reset();
        
        if (typeof clearFormDirty === 'function') clearFormDirty();
        
        loadAllData();
        
        const quranForm = document.getElementById('quran-form');
        if (quranForm) quranForm.scrollIntoView({ behavior: 'smooth' });
        
    } catch (e) { console.error(e); showToast('خطا در ثبت پویش قرآن.', 'error'); }
}

async function saveSpecialReward() {
    const studentCheckboxes = document.querySelectorAll('.special-student-checkbox:checked');
    if (studentCheckboxes.length === 0) { showToast('دانش‌آموز انتخاب کنید.', 'error'); return; }

    const titleEl = document.getElementById('specialRewardTitle');
    const title = titleEl.value.trim();
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
        academicYear: window.activeAcademicYear // ✅ سال تحصیلی جاری
    };

    try {
        await saveData('records', recordData);
        showToast('تشویق ویژه با موفقیت ثبت شد!', 'success');
        const form = document.getElementById('special-reward-form');
        if (form) form.reset();
        
        if (typeof clearFormDirty === 'function') clearFormDirty();
        
        loadAllData();
        
        const specialForm = document.getElementById('special-reward-form');
        if (specialForm) specialForm.scrollIntoView({ behavior: 'smooth' });
        
    } catch (e) { console.error(e); showToast('خطا در ثبت تشویق ویژه.', 'error'); }
}

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
        academicYear: window.activeAcademicYear // ✅ سال تحصیلی جاری
    };

    try {
        await saveData('records', recordData);
        showToast('تشویق خوش‌خط‌نویسی با موفقیت ثبت شد!', 'success');
        const form = document.getElementById('handwriting-reward-form');
        if (form) form.reset();
        
        if (typeof clearFormDirty === 'function') clearFormDirty();
        
        loadAllData();
        
        const handwritingForm = document.getElementById('handwriting-reward-form');
        if (handwritingForm) handwritingForm.scrollIntoView({ behavior: 'smooth' });
        
    } catch (e) { console.error(e); showToast('خطا در ثبت تشویق خوش‌خط‌نویسی.', 'error'); }
}

// ==========================================
// سوابق ارزشیابی
// ==========================================

function loadAssessmentRecords() {
    const container = document.getElementById('assessment-records-list');
    const pagination = document.getElementById('records-pagination');
    if (!container) return;
    
    container.innerHTML = '<p style="text-align:center;">در حال بارگذاری...</p>';
    
    const filterSubject = document.getElementById('recordsFilterSubject')?.value || '';
    const filterStudent = document.getElementById('recordsFilterStudent')?.value || '';
    const searchText = document.getElementById('recordsSearchText')?.value.trim() || '';

    let filteredRecords = window.allRecordsData.filter(rec => {
        if (filterSubject && rec.subjectId != filterSubject) return false;
        if (filterStudent && (!rec.students || !rec.students.includes(parseInt(filterStudent)))) return false;
        if (searchText && (!rec.title || !rec.title.includes(searchText))) return false;
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
            const pageInfo = document.getElementById('recordsPageInfo');
            if (pageInfo) pageInfo.textContent = `صفحه ${toPersianNumber(currentPage.records)} از ${toPersianNumber(totalPages)}`;
            const btnPrev = document.getElementById('btnPrevRecords');
            const btnNext = document.getElementById('btnNextRecords');
            if (btnPrev) btnPrev.disabled = (currentPage.records === 1);
            if (btnNext) btnNext.disabled = (currentPage.records === totalPages);
        } else { pagination.style.display = 'none'; }
    }
}

async function deleteRecord(id) {
    if (!confirm('آیا از حذف این رکورد مطمئن هستید؟')) return;
    try { 
        await deleteData('records', id); 
        showToast('رکورد حذف شد.', 'success'); 
        loadAllData(); 
    }
    catch (e) { 
        console.error(e); 
        showToast('خطا در حذف رکورد.', 'error'); 
    }
}

async function openEditRecordModal(id) {
    try {
        const record = await getDataById('records', id);
        if (!record) return;
        
        const editId = document.getElementById('editRecordId');
        if (editId) editId.value = record.id;
        const editTitle = document.getElementById('editRecordTitle');
        if (editTitle) editTitle.value = record.title;
        const editDate = document.getElementById('editRecordDate');
        if (editDate) editDate.value = record.date;
        const editScore = document.getElementById('editRecordScore');
        if (editScore) editScore.value = record.finalScore;
        
        const subjectSelect = document.getElementById('editRecordSubject');
        const itemSelect = document.getElementById('editRecordItem');

        if (subjectSelect && itemSelect) {
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
        }
        
        const container = document.getElementById('edit-record-students-container');
        if (container) {
            container.innerHTML = '';
            window.allStudentsData.forEach(st => {
                const g = window.allGroupsData.find(x => x.id === st.groupId);
                const badge = g ? `<span class="group-label">${g.symbol} ${g.name}</span>` : '';
                const isChecked = record.students.includes(st.id) ? 'checked' : '';
                container.innerHTML += `
                    <label class="student-checkbox-item">
                        <input type="checkbox" class="edit-student-checkbox" value="${st.id}" ${isChecked}>
                        <div class="student-checkbox-item-content"><span>${escapeHtml(st.firstName)} ${escapeHtml(st.lastName)}</span>${badge}</div>
                    </label>
                `;
            });
        }

        const modal = document.getElementById('edit-record-modal');
        if (modal) modal.classList.add('show');
    } catch (e) { 
        console.error(e); 
        showToast('خطا در باز کردن فرم ویرایش.', 'error'); 
    }
}

function closeEditModal() { 
    const modal = document.getElementById('edit-record-modal');
    if (modal) modal.classList.remove('show'); 
    
    if (typeof clearFormDirty === 'function') clearFormDirty();
}

async function saveEditedRecord(event) {
    if(event) event.preventDefault();
    const id = parseInt(document.getElementById('editRecordId').value);
    const subjectSelect = document.getElementById('editRecordSubject');
    const itemSelect = document.getElementById('editRecordItem');
    
    const subjectId = (subjectSelect.value) ? parseInt(subjectSelect.value) : null;
    const itemId = itemSelect.value;
    const newTitle = document.getElementById('editRecordTitle').value;
    const newDate = document.getElementById('editRecordDate').value.trim();
    const newScore = parseInt(document.getElementById('editRecordScore').value);
    
    const studentCheckboxes = document.querySelectorAll('.edit-student-checkbox:checked');
    const students = Array.from(studentCheckboxes).map(cb => parseInt(cb.value));

    let itemName = '';
    if (subjectId !== null && itemId) {
        const selectedItem = window.allAssessmentItems.find(i => i.id == itemId);
        itemName = selectedItem ? selectedItem.title : '';
    }

    if (!window.isValidJalaliDateString(newDate)) {
        showToast('تاریخ وارد شده معتبر نیست. لطفاً یک تاریخ واقعی وارد کنید.', 'error');
        return;
    }

    if (!newTitle || isNaN(newScore)) { 
        showToast('لطفاً عنوان و امتیاز را پر کنید.', 'error'); return; 
    }
    if (students.length === 0) {
        showToast('حداقل یک دانش‌آموز را انتخاب کنید.', 'error'); return;
    }

    try {
        const record = await getDataById('records', id);
        if (!record) {
            showToast('رکورد یافت نشد.', 'error');
            return;
        }
        
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
        record.academicYear = record.academicYear || window.activeAcademicYear;
        
        await saveData('records', record);
        showToast('رکورد با موفقیت ویرایش شد.', 'success');
        
        if (typeof clearFormDirty === 'function') clearFormDirty();
        
        closeEditModal(); 
        loadAllData();
    } catch (e) { 
        console.error(e); 
        showToast('خطا در ذخیره.', 'error'); 
    }
}

function clearRecordFilters() {
    const el1 = document.getElementById('recordsFilterSubject');
    const el2 = document.getElementById('recordsFilterStudent');
    const el3 = document.getElementById('recordsSearchText');
    if (el1) el1.value = '';
    if (el2) el2.value = '';
    if (el3) el3.value = '';
    currentPage.records = 1;
    loadAssessmentRecords();
}

async function loadQuranRewards() {
    const container = document.getElementById('quran-rewards-list');
    if (!container) return;
    try {
        const allBadges = await getAllData('badgesSettings');
        const quranRewards = allBadges.filter(b => b.id && b.id.startsWith('quranReward_') && b.academicYear === window.activeAcademicYear);
        
        if (quranRewards.length === 0) { 
            container.innerHTML = '<p style="color:#64748b; text-align:center;">هنوز تشویقی صادر نشده است.</p>'; 
            return; 
        }
        
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
    } catch (e) { 
        container.innerHTML = '<p style="color:red;">خطا</p>'; 
    }
}

async function exportScoreCSV() {
    try {
        let csvContent = "ردیف,عنوان,درس,آیتم,تاریخ,امتیاز,ارفاق\r\n";
        const sorted = [...window.allRecordsData].sort((a, b) => b.date.localeCompare(a.date));
        
        sorted.forEach((rec, i) => {
            const s = window.allSubjectsData.find(x => x.id === rec.subjectId); 
            const sn = s ? s.name : 'بدون درس';
            csvContent += `${i + 1},"${rec.title}","${sn}","${rec.itemName}","${rec.date}",${rec.finalScore},"${rec.arf ? 'دارد' : 'ندارد'}"\r\n`;
        });

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