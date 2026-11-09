// ==========================================
// فایل score.js — منطق تب امتیاز (ارزشیابی)
// ==========================================

let isSaveAndNext = false;

let currentQuranStudentView = 'flat';
let currentSpecialStudentView = 'flat';
let currentHandwritingStudentView = 'flat';

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
            quranSurahSelect.innerHTML += `<option value="${ayat}" data-surah="${surah}">${surah} (${ayat} آیه)</option>`;
        }
    }

    initQuranDateDropdowns();
    initSpecialDateDropdowns();
    initHandwritingDateDropdowns();

    renderStudentCheckboxes();
    renderQuranStudentCheckboxes();
    renderSpecialStudentCheckboxes();
    renderHandwritingStudentCheckboxes();
    loadAssessmentRecords();
    loadQuranRewards();
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
        let groupHtml = `<details class="group-accordion"><summary><div class="group-header-checkbox"><input type="checkbox" class="group-select-all-checkbox" onchange="${toggleGroupFnName}(this, ${g.id}, '${checkboxClass}')"><span>${g.symbol} ${g.name} (${groupStudents.length} نفر)</span></div></summary><div class="group-students-container">`;
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
            select.innerHTML += `<option value="${level.score}">${level.name} (${level.score} امتیاز)</option>`;
        });
        container.appendChild(select);
    } else if (item.type === 'count') {
        label.textContent = item.placeholder || 'تعداد واحد را وارد کنید:';
        const input = document.createElement('input');
        input.type = 'number'; input.className = 'form-control'; input.id = 'dynamicCountInput'; input.min = '1'; input.placeholder = 'تعداد'; input.required = true;
        container.appendChild(input);
    } else if (item.type === 'fixed') {
        label.textContent = 'امتیاز اختصاص‌یافته:';
        container.innerHTML = `<p style="font-weight: bold; color: #4A90E2;">${item.score} امتیاز (خودکار)</p>`;
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
    
    const daySelect = document.getElementById('dateDay'), monthSelect = document.getElementById('dateMonth'), yearSelect = document.getElementById('dateYear');
    const dateStr = document.getElementById('recordDate').value;
    
    if (!daySelect.value || !monthSelect.value || !yearSelect.value || !dateStr) {
        showToast('تاریخ را کامل انتخاب کنید.', 'error'); return;
    }

    document.getElementById('preview-content').innerHTML = `
        <div class="preview-row"><strong>آیتم:</strong> <span>${selectedItem.title}</span></div>
        <div class="preview-row"><strong>تعداد:</strong> <span>${studentCheckboxes.length} نفر</span></div>
        <div class="preview-row"><strong>تاریخ:</strong> <span>${dateStr}</span></div>
        <div class="preview-row" style="background: #eef2ff; padding: 10px; border-radius: 8px; margin-top: 10px;"><strong>امتیاز:</strong> <span style="font-size: 1.2rem; color: #4A90E2;">${finalScore}</span></div>
    `;
    
    window.tempRecordData = {
        subjectId: parseInt(document.getElementById('recordSubject').value),
        itemName: selectedItem.title, 
        title: document.getElementById('recordTitle').value, 
        date: dateStr,
        students: Array.from(studentCheckboxes).map(cb => parseInt(cb.value)),
        arf: document.getElementById('recordArf').checked, 
        finalScore: finalScore,
        academicYear: window.activeAcademicYear // *** تگ سال تحصیلی ***
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
        } else {
            document.getElementById('record-form').reset(); 
            if(typeof initDateDropdowns === 'function') initDateDropdowns();
            document.getElementById('dynamic-score-section').style.display = 'none'; 
            loadAllData();
        }
    } catch (error) { showToast('خطا در ذخیره!', 'error'); closePreviewModal(); }
}

// ==========================================
// 8. منطق ثبت پویش قرآن کریم
// ==========================================
function initQuranDateDropdowns() {
    const daySelect = document.getElementById('quranDateDay');
    const monthSelect = document.getElementById('quranDateMonth');
    const yearSelect = document.getElementById('quranDateYear');
    if (!daySelect || !monthSelect || !yearSelect) return;

    daySelect.innerHTML = '<option value="" disabled selected>روز</option>';
    for (let i = 1; i <= 31; i++) daySelect.innerHTML += `<option value="${i}">${i}</option>`;
    const monthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
    monthSelect.innerHTML = '<option value="" disabled selected>ماه</option>';
    monthNames.forEach((name, index) => monthSelect.innerHTML += `<option value="${index + 1}">${name}</option>`);
    yearSelect.innerHTML = '<option value="" disabled selected>سال</option>';
    for (let i = 1405; i <= 1410; i++) yearSelect.innerHTML += `<option value="${i}">${i}</option>`;
    daySelect.value = ''; monthSelect.value = ''; yearSelect.value = '';
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
        showToast(`برای دریافت امتیاز، حداقل ${threshold} آیه از سوره ${surahName} باید حفظ شود.`, 'error');
        return;
    }

    const d = document.getElementById('quranDateDay').value;
    const m = document.getElementById('quranDateMonth').value;
    const y = document.getElementById('quranDateYear').value;
    if (!d || !m || !y) { showToast('تاریخ را انتخاب کنید.', 'error'); return; }
    const dateStr = jalaliToDateString(y, m, d);

    const recordData = {
        subjectId: null,
        itemName: "پویش حفظ جزء سی قرآن کریم",
        title: `حفظ سوره ${surahName} - ${ayat} آیه`,
        date: dateStr,
        students: Array.from(studentCheckboxes).map(cb => parseInt(cb.value)),
        arf: false,
        finalScore: finalScore,
        academicYear: window.activeAcademicYear // *** تگ سال تحصیلی ***
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
        initQuranDateDropdowns();
        loadAllData();
    } catch (e) { console.error(e); showToast('خطا در ثبت پویش قرآن.', 'error'); }
}

// ==========================================
// 9. منطق ثبت تشویق ویژه
// ==========================================
function initSpecialDateDropdowns() {
    const daySelect = document.getElementById('specialDateDay');
    const monthSelect = document.getElementById('specialDateMonth');
    const yearSelect = document.getElementById('specialDateYear');
    if (!daySelect || !monthSelect || !yearSelect) return;

    daySelect.innerHTML = '<option value="" disabled selected>روز</option>';
    for (let i = 1; i <= 31; i++) daySelect.innerHTML += `<option value="${i}">${i}</option>`;
    const monthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
    monthSelect.innerHTML = '<option value="" disabled selected>ماه</option>';
    monthNames.forEach((name, index) => monthSelect.innerHTML += `<option value="${index + 1}">${name}</option>`);
    yearSelect.innerHTML = '<option value="" disabled selected>سال</option>';
    for (let i = 1405; i <= 1410; i++) yearSelect.innerHTML += `<option value="${i}">${i}</option>`;
    daySelect.value = ''; monthSelect.value = ''; yearSelect.value = '';
}

async function saveSpecialReward() {
    const studentCheckboxes = document.querySelectorAll('.special-student-checkbox:checked');
    if (studentCheckboxes.length === 0) { showToast('دانش‌آموز انتخاب کنید.', 'error'); return; }

    const title = document.getElementById('specialRewardTitle').value.trim();
    if (!title) { showToast('عنوان تشویق را وارد کنید.', 'error'); return; }

    const score = parseInt(document.getElementById('specialRewardScore').value);
    if (isNaN(score) || score <= 0) { showToast('امتیاز معتبر وارد کنید.', 'error'); return; }

    const d = document.getElementById('specialDateDay').value;
    const m = document.getElementById('specialDateMonth').value;
    const y = document.getElementById('specialDateYear').value;
    if (!d || !m || !y) { showToast('تاریخ را انتخاب کنید.', 'error'); return; }
    const dateStr = jalaliToDateString(y, m, d);

    const recordData = {
        subjectId: null,
        itemName: "تشویق ویژه",
        title: title,
        date: dateStr,
        students: Array.from(studentCheckboxes).map(cb => parseInt(cb.value)),
        arf: false,
        finalScore: score,
        academicYear: window.activeAcademicYear // *** تگ سال تحصیلی ***
    };

    try {
        await saveData('records', recordData);
        showToast('تشویق ویژه با موفقیت ثبت شد!', 'success');
        document.getElementById('special-reward-form').reset();
        initSpecialDateDropdowns();
        loadAllData();
    } catch (e) { console.error(e); showToast('خطا در ثبت تشویق ویژه.', 'error'); }
}

// ==========================================
// 10. منطق ثبت تشویق خوش‌خط‌نویسی
// ==========================================
function initHandwritingDateDropdowns() {
    const daySelect = document.getElementById('handwritingDateDay');
    const monthSelect = document.getElementById('handwritingDateMonth');
    const yearSelect = document.getElementById('handwritingDateYear');
    if (!daySelect || !monthSelect || !yearSelect) return;

    daySelect.innerHTML = '<option value="" disabled selected>روز</option>';
    for (let i = 1; i <= 31; i++) daySelect.innerHTML += `<option value="${i}">${i}</option>`;
    const monthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
    monthSelect.innerHTML = '<option value="" disabled selected>ماه</option>';
    monthNames.forEach((name, index) => monthSelect.innerHTML += `<option value="${index + 1}">${name}</option>`);
    yearSelect.innerHTML = '<option value="" disabled selected>سال</option>';
    for (let i = 1405; i <= 1410; i++) yearSelect.innerHTML += `<option value="${i}">${i}</option>`;
    daySelect.value = ''; monthSelect.value = ''; yearSelect.value = '';
}

async function saveHandwritingReward() {
    const studentCheckboxes = document.querySelectorAll('.handwriting-student-checkbox:checked');
    if (studentCheckboxes.length === 0) { showToast('دانش‌آموز انتخاب کنید.', 'error'); return; }

    const d = document.getElementById('handwritingDateDay').value;
    const m = document.getElementById('handwritingDateMonth').value;
    const y = document.getElementById('handwritingDateYear').value;
    if (!d || !m || !y) { showToast('تاریخ را انتخاب کنید.', 'error'); return; }
    const dateStr = jalaliToDateString(y, m, d);

    const recordData = {
        subjectId: null,
        itemName: "تشویق خوش‌خط‌نویسی",
        title: "تشویق خوش‌خط‌نویسی",
        date: dateStr,
        students: Array.from(studentCheckboxes).map(cb => parseInt(cb.value)),
        arf: false,
        finalScore: 4,
        academicYear: window.activeAcademicYear // *** تگ سال تحصیلی ***
    };

    try {
        await saveData('records', recordData);
        showToast('تشویق خوش‌خط‌نویسی با موفقیت ثبت شد!', 'success');
        document.getElementById('handwriting-reward-form').reset();
        initHandwritingDateDropdowns();
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

    // نکته: window.allRecordsData قبلاً در app.js فیلتر شده است و فقط شامل رکوردهای سال جاری است
    let filteredRecords = window.allRecordsData.filter(rec => {
        if (filterSubject && rec.subjectId != filterSubject) return false;
        if (filterStudent && (!rec.students || !rec.students.includes(parseInt(filterStudent)))) return false;
        if (searchText && !rec.title.includes(searchText)) return false;
        return true;
    });

    filteredRecords.sort((a, b) => b.date.localeCompare(a.date));
    const countEl = document.getElementById('records-count');
    if (countEl) countEl.textContent = `تعداد نتایج: ${filteredRecords.length} رکورد`;

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
                    <span class="record-score">${rec.finalScore} امتیاز</span>
                </div>
                <div class="record-details"><span>📚 ${subjectName} | ${rec.itemName}</span><span>📅 ${rec.date}</span></div>
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
            document.getElementById('recordsPageInfo').textContent = `صفحه ${currentPage.records} از ${totalPages}`;
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
        record.academicYear = window.activeAcademicYear; // *** اطمینان از حفظ تگ ***
        
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
        // فیلتر بر اساس سال تحصیلی هم اضافه شد
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
            const studentName = student ? `${student.firstName} ${student.lastName}` : `دانش‌آموز ${studentId}`;
            const latest = grouped[studentId][grouped[studentId].length - 1];
            html += `<div class="list-item" style="flex-direction: column; align-items: flex-start; padding: 15px; background: var(--arf-bg); border-right: 4px solid var(--arf-border); margin-bottom: 10px;"><strong style="font-size: 1.1rem;">🏅 ${studentName}</strong><span style="font-size: 0.9rem; color: var(--arf-border);">تعداد سوره‌ها: ${latest.totalSurahs} | تعداد آیات: ${latest.totalAyats}</span></div>`;
        }
        container.innerHTML = html;
    } catch (e) { container.innerHTML = '<p style="color:red;">خطا</p>'; }
}

// ==========================================
// 14. خروجی اکسل سوابق ارزشیابی
// ==========================================
async function exportScoreCSV() {
    try {
        let csvContent = "ردیف,عنوان,درس,آیتم,تاریخ,امتیاز,ارفاق\n";
        const sorted = [...window.allRecordsData].sort((a, b) => b.date.localeCompare(a.date));
        
        sorted.forEach((rec, i) => {
            const s = window.allSubjectsData.find(x => x.id === rec.subjectId); 
            const sn = s ? s.name : 'بدون درس';
            csvContent += `${i + 1},"${rec.title}","${sn}","${rec.itemName}","${rec.date}",${rec.finalScore},"${rec.arf ? 'دارد' : 'ندارد'}"\n`;
        });

        const BOM = "\uFEFF";
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `kosha_records_${new Date().toISOString().slice(0,10)}.csv`; a.click();
        URL.revokeObjectURL(url);
        showToast('فایل اکسل سوابق دانلود شد!', 'success');
    } catch (e) { console.error(e); showToast('خطا در تولید فایل اکسل.', 'error'); }
}