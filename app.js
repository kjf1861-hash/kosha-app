// ==========================================
// ساختار ثابت درخت ارزشیابی
// ==========================================
const assessmentTree = [
    { value: "پرسش و پاسخ", type: "level1", levels: { "خیلی خوب": 25, "خوب": 16, "قابل قبول": 9, "نیازمند تلاش": 0 } },
    { value: "حفظ و قرائت", type: "level1", levels: { "خیلی خوب": 25, "خوب": 16, "قابل قبول": 9, "نیازمند تلاش": 0 } },
    { value: "پویش حفظ قرآن کریم", type: "quran", levels: {} },
    { value: "آزمون مداد و کاغذی", type: "level1", levels: { "خیلی خوب": 25, "خوب": 16, "قابل قبول": 9, "نیازمند تلاش": 0 } },
    { value: "کاربرگ", type: "count", factor: 10, levels: {} },
    { value: "آزمون الکترونیکی", type: "level2", levels: { "خیلی خوب": 100, "خوب": 66, "قابل قبول": 33, "نیازمند تلاش": 0 } },
    { value: "کاردستی و مهارت دست‌ورزی", type: "fixed", score: 25, levels: {} },
    { value: "نمایش و ایفای نقش", type: "fixed", score: 50, levels: {} },
    { value: "پروژه و آزمایش علمی", type: "fixed", score: 20, levels: {} },
    { value: "بازی آموزشی تعاملی", type: "fixed", score: 5, levels: {} },
    { value: "آزمون مهارت حرکتی", type: "level2", levels: { "خیلی خوب": 100, "خوب": 66, "قابل قبول": 33, "نیازمند تلاش": 0 } },
    { value: "مشاهده", type: "level2", levels: { "خیلی خوب": 100, "خوب": 66, "قابل قبول": 33, "نیازمند تلاش": 0 } },
    { value: "تشویق ویژه", type: "free", levels: {} },
    { value: "تشویق خوش‌خط‌نویسی", type: "fixed", score: 4, levels: {} }
];

const quranSurahs = { "ناس": 6, "فلق": 5, "توحید": 4, "مسد": 5, "نصر": 3, "کافرون": 6, "کوثر": 3, "ماعون": 7 };

// ==========================================
// تابع اصلی راه‌اندازی اپلیکیشن
// ==========================================
function initApp() {
    const subjectForm = document.getElementById('subject-form');
    if (subjectForm) {
        subjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveData('subjects', { name: document.getElementById('subjectName').value });
            subjectForm.reset(); loadAllData();
        });
    }

    const groupForm = document.getElementById('group-form');
    if (groupForm) {
        groupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveData('groups', {
                name: document.getElementById('groupName').value,
                symbol: document.getElementById('groupSymbol').value,
                motto: document.getElementById('groupMotto').value
            });
            groupForm.reset(); loadAllData();
        });
    }

    const studentForm = document.getElementById('student-form');
    if (studentForm) {
        studentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveData('students', {
                firstName: document.getElementById('studentFirstName').value,
                lastName: document.getElementById('studentLastName').value,
                groupId: parseInt(document.getElementById('studentGroup').value)
            });
            studentForm.reset(); loadAllData();
        });
    }

    const itemSelect = document.getElementById('recordItem');
    if (itemSelect) {
        assessmentTree.forEach((item, index) => {
            const opt = document.createElement('option');
            opt.value = index; opt.textContent = item.value;
            itemSelect.appendChild(opt);
        });
        itemSelect.addEventListener('change', (e) => renderScoreInput(assessmentTree[e.target.value]));
    }

    const recordForm = document.getElementById('record-form');
    if (recordForm) {
        recordForm.addEventListener('submit', (e) => {
            e.preventDefault(); showPreview();
        });
    }

    loadAllData();
}

// ==========================================
// بارگذاری داده‌ها (بدون تغییر)
// ==========================================
async function loadAllData() {
    try {
        const subjects = await getAllData('subjects');
        const groups = await getAllData('groups');
        const students = await getAllData('students');

        // رندر دروس
        const subjectsList = document.getElementById('subjects-list');
        const recordSubjectSelect = document.getElementById('recordSubject');
        if (subjectsList) subjectsList.innerHTML = subjects.length === 0 ? '<p style="text-align:center; color:#64748b;">لیست خالی است.</p>' : subjects.map(s => `<div class="list-item">${s.name}</div>`).join('');
        if (recordSubjectSelect) {
            recordSubjectSelect.innerHTML = '<option value="" disabled selected>انتخاب کنید...</option>' + subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        }

        // رندر گروه‌ها
        const groupsList = document.getElementById('groups-list');
        const studentGroupSelect = document.getElementById('studentGroup');
        if (groupsList) groupsList.innerHTML = groups.length === 0 ? '<p style="text-align:center; color:#64748b;">لیست خالی است.</p>' : groups.map(g => `<div class="list-item">${g.symbol} <strong>${g.name}</strong></div>`).join('');
        if (studentGroupSelect) {
            studentGroupSelect.innerHTML = '<option value="" disabled selected>انتخاب کنید...</option>' + groups.map(g => `<option value="${g.id}">${g.symbol} ${g.name}</option>`).join('');
        }

        // رندر دانش‌آموزان
        const studentsList = document.getElementById('students-list');
        const checkboxContainer = document.getElementById('students-checkbox-container');
        if (studentsList) {
            studentsList.innerHTML = students.length === 0 ? '<p style="text-align:center; color:#64748b;">لیست خالی است.</p>' : students.map(st => {
                const g = groups.find(x => x.id === st.groupId);
                return `<div class="list-item"><span>${st.firstName} ${st.lastName}</span><span class="rank-badge">${g ? g.symbol+' '+g.name : 'بدون گروه'}</span></div>`;
            }).join('');
        }
        if (checkboxContainer) {
            checkboxContainer.innerHTML = students.length === 0 ? '<p style="text-align:center; color:#64748b;">لیست خالی است.</p>' : students.map(st => `
                <label class="student-checkbox-item"><input type="checkbox" class="student-checkbox" value="${st.id}"><span>${st.firstName} ${st.lastName}</span></label>
            `).join('');
        }

    } catch (e) { console.log('خطا در لود داده‌ها'); }
}

// ==========================================
// توابع کمکی (بدون تغییر)
// ==========================================
function renderScoreInput(item) { /* کد قبلی در اینجا */ 
    const section = document.getElementById('dynamic-score-section');
    const container = document.getElementById('score-input-container');
    section.style.display = 'block'; container.innerHTML = '';

    if (item.type === 'level1' || item.type === 'level2') {
        const select = document.createElement('select'); select.className = 'form-control'; select.id = 'dynamicLevelInput'; select.required = true;
        select.innerHTML = '<option value="" disabled selected>انتخاب سطح...</option>';
        for (const [level, score] of Object.entries(item.levels)) select.innerHTML += `<option value="${score}">${level} (${score} امتیاز)</option>`;
        container.appendChild(select);
    } else if (item.type === 'count') {
        const input = document.createElement('input'); input.type = 'number'; input.className = 'form-control'; input.id = 'dynamicCountInput'; input.min = '1'; input.placeholder = 'تعداد'; input.required = true; container.appendChild(input);
    } else if (item.type === 'fixed') {
        container.innerHTML = `<p style="font-weight: bold; color: #4A90E2;">${item.score} امتیاز (خودکار)</p>`;
    } else if (item.type === 'free') {
        const input = document.createElement('input'); input.type = 'number'; input.className = 'form-control'; input.id = 'dynamicFreeInput'; input.min = '0'; input.placeholder = 'عدد'; input.required = true; container.appendChild(input);
    } else if (item.type === 'quran') {
        const select = document.createElement('select'); select.className = 'form-control'; select.id = 'quranSurahSelect';
        select.innerHTML = '<option value="" disabled selected>انتخاب سوره...</option>';
        for (const [surah, ayat] of Object.entries(quranSurahs)) select.innerHTML += `<option value="${ayat}">${surah} (${ayat} آیه)</option>`;
        const input = document.createElement('input'); input.type = 'number'; input.className = 'form-control'; input.id = 'quranAyatInput'; input.placeholder = 'تعداد آیات'; input.min = '1';
        container.appendChild(select); container.appendChild(document.createElement('br')); container.appendChild(input);
    }
}
function toggleAllStudents(checked) { document.querySelectorAll('.student-checkbox').forEach(cb => cb.checked = checked); }
function showPreview() { /* کد قبلی در اینجا */ 
    const selectedItem = assessmentTree[document.getElementById('recordItem').value];
    let finalScore = 0; let scoreDetails = '';
    if (selectedItem.type === 'level1' || selectedItem.type === 'level2') { finalScore = parseInt(document.getElementById('dynamicLevelInput').value) || 0; scoreDetails = `سطح: ${finalScore}`; } 
    else if (selectedItem.type === 'count') { const c = parseInt(document.getElementById('dynamicCountInput').value) || 0; finalScore = c * selectedItem.factor; scoreDetails = `${c} × ${selectedItem.factor} = ${finalScore}`; } 
    else if (selectedItem.type === 'fixed') { finalScore = selectedItem.score; scoreDetails = `ثابت: ${finalScore}`; } 
    else if (selectedItem.type === 'free') { finalScore = parseInt(document.getElementById('dynamicFreeInput').value) || 0; scoreDetails = `دستی: ${finalScore}`; } 
    else if (selectedItem.type === 'quran') {
        const ayat = parseInt(document.getElementById('quranAyatInput').value) || 0; const total = parseInt(document.getElementById('quranSurahSelect').value) || 0;
        const threshold = Math.ceil((total / 2) + 1);
        if (ayat >= threshold && total > 0) { finalScore = ayat * 5; scoreDetails = `حد نصاب (${threshold}) رعایت شد: ${ayat}×5=${finalScore}`; } 
        else { finalScore = 0; scoreDetails = `حد نصاب (${threshold}) رعایت نشد.`; }
    }
    const studentCheckboxes = document.querySelectorAll('.student-checkbox:checked');
    document.getElementById('preview-content').innerHTML = `
        <div class="preview-row"><strong>درس:</strong> <span>${document.getElementById('recordSubject').options[document.getElementById('recordSubject').selectedIndex].text}</span></div>
        <div class="preview-row"><strong>آیتم:</strong> <span>${selectedItem.value}</span></div>
        <div class="preview-row"><strong>دانش‌آموزان:</strong> <span>${studentCheckboxes.length} نفر</span></div>
        <div class="preview-row" style="background: #eef2ff; padding: 10px; border-radius: 8px; margin-top: 10px;"><strong>امتیاز نهایی:</strong> <span style="font-size: 1.2rem; color: #4A90E2;">${finalScore}</span></div>
    `;
    window.tempRecordData = { subjectId: parseInt(document.getElementById('recordSubject').value), itemName: selectedItem.value, title: document.getElementById('recordTitle').value, date: document.getElementById('recordDate').value, students: Array.from(studentCheckboxes).map(cb => parseInt(cb.value)), arf: document.getElementById('recordArf').checked, finalScore: finalScore };
    document.getElementById('preview-modal').classList.add('show');
}
function closePreviewModal() { document.getElementById('preview-modal').classList.remove('show'); }
async function confirmAndSaveRecord() { /* کد قبلی */ 
    if (!window.tempRecordData) return;
    try { await saveData('records', window.tempRecordData); alert('ذخیره شد!'); closePreviewModal(); document.getElementById('record-form').reset(); document.getElementById('dynamic-score-section').style.display = 'none'; } catch (error) { alert('خطا در ذخیره!'); closePreviewModal(); }
}

// ==========================================
// تابع جدید: تولید گزارشات
// ==========================================
async function generateReports() {
    const container = document.getElementById('reports-list');
    if (!container) return;
    container.innerHTML = '<p style="text-align:center; color:#64748b;">در حال محاسبه...</p>';

    try {
        const students = await getAllData('students');
        const records = await getAllData('records');

        if (students.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#64748b;">هیچ دانش‌آموزی وجود ندارد.</p>';
            return;
        }

        // محاسبه مجموع امتیاز برای هر دانش‌آموز
        const studentScores = students.map(st => {
            let total = 0;
            records.forEach(rec => {
                if (rec.students && rec.students.includes(st.id)) {
                    total += rec.finalScore;
                }
            });
            return { ...st, totalScore: total };
        });

        // مرتب‌سازی نزولی
        studentScores.sort((a, b) => b.totalScore - a.totalScore);

        // نمایش
        container.innerHTML = studentScores.map((st, index) => `
            <div class="list-item" style="background: ${index === 0 ? 'var(--arf-bg)' : 'white'};">
                <span><strong>${index + 1}. ${st.firstName} ${st.lastName}</strong></span>
                <span class="rank-badge" style="font-size: 1rem; ${index === 0 ? 'background: var(--arf-border); color: white;' : ''}">${st.totalScore} امتیاز</span>
            </div>
        `).join('');

    } catch (e) {
        container.innerHTML = '<p style="text-align:center; color:red;">خطا در تولید گزارش.</p>';
    }
}