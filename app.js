// ==========================================
// 1. ساختار درخت ارزشیابی
// ==========================================
const assessmentTree = [
    { value: "پرسش و پاسخ", type: "level1", levels: { "خیلی خوب": 25, "خوب": 16, "قابل قبول": 9, "نیازمند تلاش": 0 } },
    { value: "حفظ و قرائت", type: "level1", levels: { "خیلی خوب": 25, "خوب": 16, "قابل قبول": 9, "نیازمند تلاش": 0 } },
    { value: "پویش حفظ قرآن کریم", type: "quran", levels: {} },
    { value: "آزمون مداد و کاغذی", type: "level2", levels: { "خیلی خوب": 100, "خوب": 66, "قابل قبول": 33, "نیازمند تلاش": 0 } },
    { value: "کاربرگ", type: "count", factor: 10, levels: {} },
    { value: "آزمون الکترونیکی", type: "level1", levels: { "خیلی خوب": 25, "خوب": 16, "قابل قبول": 9, "نیازمند تلاش": 0 } },
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
let currentReportFilter = 'class';

// ==========================================
// 2. راه‌اندازی اولیه
// ==========================================
function initApp() {
    document.getElementById('class-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveData('classProfile', { id: 1, name: document.getElementById('className').value, grade: document.getElementById('classGrade').value, motto: document.getElementById('classMotto').value, teacherName: document.getElementById('teacherName').value });
        alert('ذخیره شد!');
        document.getElementById('header-subtitle').textContent = document.getElementById('className').value;
    });

    document.getElementById('subject-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('editSubjectId').value;
        const data = { name: document.getElementById('subjectName').value };
        if (editId) data.id = parseInt(editId);
        await saveData('subjects', data);
        document.getElementById('subject-form').reset();
        document.getElementById('editSubjectId').value = '';
        document.getElementById('subject-submit-btn').textContent = '➕ ثبت درس';
        loadAllData();
    });

    document.getElementById('group-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('editGroupId').value;
        const data = { name: document.getElementById('groupName').value, symbol: document.getElementById('groupSymbol').value, motto: document.getElementById('groupMotto').value };
        if (editId) data.id = parseInt(editId);
        await saveData('groups', data);
        document.getElementById('group-form').reset();
        document.getElementById('editGroupId').value = '';
        document.getElementById('group-submit-btn').textContent = '➕ ثبت گروه';
        loadAllData();
    });

    document.getElementById('student-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('editStudentId').value;
        const data = { firstName: document.getElementById('studentFirstName').value, lastName: document.getElementById('studentLastName').value, groupId: parseInt(document.getElementById('studentGroup').value) };
        if (editId) data.id = parseInt(editId);
        await saveData('students', data);
        document.getElementById('student-form').reset();
        document.getElementById('editStudentId').value = '';
        document.getElementById('student-submit-btn').textContent = '➕ ثبت دانش‌آموز';
        loadAllData();
    });

    const itemSelect = document.getElementById('recordItem');
    if (itemSelect) {
        assessmentTree.forEach((item, index) => {
            const opt = document.createElement('option'); opt.value = index; opt.textContent = item.value;
            itemSelect.appendChild(opt);
        });
        
        itemSelect.selectedIndex = 0;
        renderScoreInput(assessmentTree[0]);

        itemSelect.addEventListener('change', (e) => {
            const selectedItem = assessmentTree[e.target.value];
            renderScoreInput(selectedItem);
        });
    }

    document.getElementById('record-form').addEventListener('submit', (e) => { e.preventDefault(); showPreview(); });

    document.getElementById('top-student-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveData('badgesSettings', { id: 'topStudent', icon: document.getElementById('topStudentIcon').value, title: document.getElementById('topStudentTitle').value, motto: document.getElementById('topStudentMotto').value });
        alert('ذخیره شد!'); loadBadgesSettings();
    });

    document.getElementById('subject-badge-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectedSubjectId = document.getElementById('badgeSubjectSelect').value;
        if (!selectedSubjectId) { alert('لطفاً یک درس انتخاب کنید.'); return; }
        await saveData('badgesSettings', {
            id: `subject_${selectedSubjectId}`,
            subjectId: parseInt(selectedSubjectId),
            icon: document.getElementById('subjectBadgeIcon').value,
            title: document.getElementById('subjectBadgeTitle').value,
            motto: document.getElementById('subjectBadgeMotto').value
        });
        alert('ذخیره شد!'); loadBadgesSettings();
    });

    // راه‌اندازی منوهای تاریخ
    initDateDropdowns();

    loadAllData();
}

// ==========================================
// 3. بارگذاری داده‌ها
// ==========================================
async function loadAllData() {
    try {
        const classData = await getDataById('classProfile', 1);
        if (classData) {
            document.getElementById('className').value = classData.name || '';
            document.getElementById('classGrade').value = classData.grade || '';
            document.getElementById('classMotto').value = classData.motto || '';
            document.getElementById('teacherName').value = classData.teacherName || '';
            document.getElementById('header-subtitle').textContent = classData.name || 'همیار پرتلاش معلم';
        }

        const subjects = await getAllData('subjects');
        const subjectsList = document.getElementById('subjects-list');
        const recordSubjectSelect = document.getElementById('recordSubject');
        const badgeSubjectSelect = document.getElementById('badgeSubjectSelect');
        const reportSubjectSelect = document.getElementById('reportSubjectSelect');
        
        if (subjectsList) {
            subjectsList.innerHTML = subjects.length === 0 ? '<p style="text-align:center; color:#64748b;">لیست خالی است.</p>' : '';
            subjects.forEach(s => {
                subjectsList.innerHTML += `<div class="list-item"><span><strong>${s.name}</strong></span><div style="display:flex; gap:5px;"><button class="btn btn-secondary btn-sm" onclick="editSubject(${s.id})">✏️</button><button class="btn btn-danger btn-sm" onclick="deleteItem('subjects', ${s.id})">🗑️</button></div></div>`;
            });
        }
        
        if (recordSubjectSelect) recordSubjectSelect.innerHTML = '<option value="" disabled selected>انتخاب کنید...</option>' + subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        if (badgeSubjectSelect) badgeSubjectSelect.innerHTML = '<option value="" disabled selected>انتخاب کنید...</option>' + subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        if (reportSubjectSelect) reportSubjectSelect.innerHTML = '<option value="" disabled selected>انتخاب درس...</option>' + subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

        const groups = await getAllData('groups');
        const groupsList = document.getElementById('groups-list');
        const studentGroupSelect = document.getElementById('studentGroup');
        if (groupsList) {
            groupsList.innerHTML = groups.length === 0 ? '<p style="text-align:center; color:#64748b;">لیست خالی است.</p>' : '';
            groups.forEach(g => { groupsList.innerHTML += `<div class="list-item"><span>${g.symbol} <strong>${g.name}</strong></span><div style="display:flex; gap:5px;"><button class="btn btn-secondary btn-sm" onclick="editGroup(${g.id})">✏️</button><button class="btn btn-danger btn-sm" onclick="deleteItem('groups', ${g.id})">🗑️</button></div></div>`; });
        }
        if (studentGroupSelect) studentGroupSelect.innerHTML = '<option value="" disabled selected>انتخاب کنید...</option>' + groups.map(g => `<option value="${g.id}">${g.symbol} ${g.name}</option>`).join('');

        const groupFilterSelect = document.getElementById('groupFilterSelect');
        if (groupFilterSelect) {
            groupFilterSelect.innerHTML = '<option value="">انتخاب گروه...</option>' + groups.map(g => `<option value="${g.id}">${g.symbol} ${g.name}</option>`).join('');
        }

        const students = await getAllData('students');
        const studentsList = document.getElementById('students-list');
        const checkboxContainer = document.getElementById('students-checkbox-container');
        
        window.allStudentsData = students;

        if (studentsList) {
            studentsList.innerHTML = students.length === 0 ? '<p style="text-align:center; color:#64748b;">لیست خالی است.</p>' : '';
            students.forEach(st => {
                const g = groups.find(x => x.id === st.groupId);
                studentsList.innerHTML += `<div class="list-item"><span><strong>${st.firstName} ${st.lastName}</strong></span><div style="display:flex; gap:5px; align-items:center;"><span class="rank-badge">${g ? g.symbol+' '+g.name : 'بدون گروه'}</span><button class="btn btn-secondary btn-sm" onclick="editStudent(${st.id})">✏️</button><button class="btn btn-danger btn-sm" onclick="deleteItem('students', ${st.id})">🗑️</button></div></div>`;
            });
        }
        if (checkboxContainer) {
            checkboxContainer.innerHTML = students.length === 0 ? '<p style="text-align:center; color:#64748b;">هیچ دانش‌آموزی نیست.</p>' : '';
            students.forEach(st => { checkboxContainer.innerHTML += `<label class="student-checkbox-item"><input type="checkbox" class="student-checkbox" value="${st.id}"><span>${st.firstName} ${st.lastName}</span></label>`; });
        }
    } catch (e) { console.log('خطا', e); }
}

async function deleteItem(storeName, id) {
    if (confirm('آیا مطمئن هستید؟')) {
        await deleteData(storeName, id);
        loadAllData();
        if (storeName === 'groups') loadBadgesSettings();
    }
}

// ==========================================
// 4. توابع ویرایش
// ==========================================
async function editSubject(id) {
    const subject = await getDataById('subjects', id);
    if (subject) {
        document.getElementById('subjectName').value = subject.name;
        document.getElementById('editSubjectId').value = subject.id;
        document.getElementById('subject-submit-btn').textContent = '💾 به‌روزرسانی درس';
        document.getElementById('subject-form').scrollIntoView({ behavior: 'smooth' });
    }
}

async function editGroup(id) {
    const group = await getDataById('groups', id);
    if (group) {
        document.getElementById('groupName').value = group.name;
        document.getElementById('groupSymbol').value = group.symbol;
        document.getElementById('groupMotto').value = group.motto;
        document.getElementById('editGroupId').value = group.id;
        document.getElementById('group-submit-btn').textContent = '💾 به‌روزرسانی گروه';
        document.getElementById('group-form').scrollIntoView({ behavior: 'smooth' });
    }
}

async function editStudent(id) {
    const student = await getDataById('students', id);
    if (student) {
        document.getElementById('studentFirstName').value = student.firstName;
        document.getElementById('studentLastName').value = student.lastName;
        document.getElementById('studentGroup').value = student.groupId;
        document.getElementById('editStudentId').value = student.id;
        document.getElementById('student-submit-btn').textContent = '💾 به‌روزرسانی دانش‌آموز';
        document.getElementById('student-form').scrollIntoView({ behavior: 'smooth' });
    }
}

// ==========================================
// 5. منطق امتیازدهی
// ==========================================
function renderScoreInput(item) {
    const section = document.getElementById('dynamic-score-section');
    const container = document.getElementById('score-input-container');
    
    section.style.display = 'block';
    container.innerHTML = '';

    if (!item) return;

    if (item.type === 'level1' || item.type === 'level2') {
        const select = document.createElement('select');
        select.className = 'form-control';
        select.id = 'dynamicLevelInput';
        select.required = true;
        select.innerHTML = '<option value="" disabled selected>انتخاب سطح...</option>';
        for (const [level, score] of Object.entries(item.levels)) {
            select.innerHTML += `<option value="${score}">${level} (${score} امتیاز)</option>`;
        }
        container.appendChild(select);
    } else if (item.type === 'count') {
        const input = document.createElement('input');
        input.type = 'number'; input.className = 'form-control'; input.id = 'dynamicCountInput'; input.min = '1'; input.placeholder = 'تعداد صفحات'; input.required = true;
        container.appendChild(input);
    } else if (item.type === 'fixed') {
        container.innerHTML = `<p style="font-weight: bold; color: #4A90E2;">${item.score} امتیاز (خودکار)</p>`;
    } else if (item.type === 'free') {
        const input = document.createElement('input');
        input.type = 'number'; input.className = 'form-control'; input.id = 'dynamicFreeInput'; input.min = '0'; input.placeholder = 'عدد امتیاز'; input.required = true;
        container.appendChild(input);
    } else if (item.type === 'quran') {
        const select = document.createElement('select');
        select.className = 'form-control'; select.id = 'quranSurahSelect';
        select.innerHTML = '<option value="" disabled selected>انتخاب سوره...</option>';
        for (const [surah, ayat] of Object.entries(quranSurahs)) {
            select.innerHTML += `<option value="${ayat}">${surah} (${ayat} آیه)</option>`;
        }
        const input = document.createElement('input');
        input.type = 'number'; input.className = 'form-control'; input.id = 'quranAyatInput'; input.placeholder = 'تعداد آیات'; input.min = '1';
        container.appendChild(select);
        container.appendChild(document.createElement('br'));
        container.appendChild(input);
    }
}

function toggleAllStudents(checked) { document.querySelectorAll('.student-checkbox').forEach(cb => cb.checked = checked); }

function selectGroupMembers(groupId) {
    if (!groupId) return;
    document.querySelectorAll('.student-checkbox').forEach(cb => cb.checked = false);
    if (window.allStudentsData) {
        window.allStudentsData.forEach(st => {
            if (st.groupId == groupId) {
                const checkbox = document.querySelector(`.student-checkbox[value="${st.id}"]`);
                if (checkbox) checkbox.checked = true;
            }
        });
    }
}

// ==========================================
// 5.1. تاریخ (انتخابگر روز، ماه، سال)
// ==========================================
function initDateDropdowns() {
    const daySelect = document.getElementById('dateDay');
    const monthSelect = document.getElementById('dateMonth');
    const yearSelect = document.getElementById('dateYear');

    if (!daySelect || !monthSelect || !yearSelect) return;

    // پر کردن روزها (1 تا 31)
    daySelect.innerHTML = '<option value="" disabled selected>روز</option>';
    for (let i = 1; i <= 31; i++) {
        daySelect.innerHTML += `<option value="${i}">${i}</option>`;
    }

    // پر کردن ماه‌ها
    const monthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
    monthSelect.innerHTML = '<option value="" disabled selected>ماه</option>';
    monthNames.forEach((name, index) => {
        monthSelect.innerHTML += `<option value="${index + 1}">${name}</option>`;
    });

    // پر کردن سال‌ها (1300 تا 1500)
    yearSelect.innerHTML = '<option value="" disabled selected>سال</option>';
    for (let i = 1300; i <= 1500; i++) {
        yearSelect.innerHTML += `<option value="${i}">${i}</option>`;
    }

    // تنظیم مقدار پیش‌فرض روی تاریخ امروز
    const today = getTodayJalali();
    daySelect.value = today.day;
    monthSelect.value = today.month;
    yearSelect.value = today.year;

    // با هر تغییر، فیلد مخفی را به‌روزرسانی کن
    const updateDate = () => {
        const d = daySelect.value;
        const m = monthSelect.value;
        const y = yearSelect.value;
        if (d && m && y) {
            document.getElementById('recordDate').value = jalaliToDateString(y, m, d);
        }
    };

    daySelect.addEventListener('change', updateDate);
    monthSelect.addEventListener('change', updateDate);
    yearSelect.addEventListener('change', updateDate);

    // مقدار اولیه
    updateDate();
}

// ==========================================
// 6. پیش‌نمایش و ثبت
// ==========================================
function showPreview() {
    const selectedIndex = document.getElementById('recordItem').value;
    if (selectedIndex === "") { alert('لطفاً آیتم ارزشیابی را انتخاب کنید.'); return; }
    const selectedItem = assessmentTree[selectedIndex];
    let finalScore = 0;

    try {
        if (selectedItem.type === 'level1' || selectedItem.type === 'level2') {
            const levelInput = document.getElementById('dynamicLevelInput');
            if (!levelInput || !levelInput.value) { alert('لطفاً سطح را انتخاب کنید.'); return; }
            finalScore = parseInt(levelInput.value) || 0;
        } else if (selectedItem.type === 'count') {
            finalScore = (parseInt(document.getElementById('dynamicCountInput').value) || 0) * selectedItem.factor;
        } else if (selectedItem.type === 'fixed') {
            finalScore = selectedItem.score;
        } else if (selectedItem.type === 'free') {
            finalScore = parseInt(document.getElementById('dynamicFreeInput').value) || 0;
        } else if (selectedItem.type === 'quran') {
            const ayat = parseInt(document.getElementById('quranAyatInput').value) || 0;
            const total = parseInt(document.getElementById('quranSurahSelect').value) || 0;
            const threshold = Math.ceil((total / 2) + 1);
            finalScore = (ayat >= threshold && total > 0) ? ayat * 5 : 0;
        }
    } catch (e) { alert('لطفاً فیلدها را کامل کنید.'); return; }

    const studentCheckboxes = document.querySelectorAll('.student-checkbox:checked');
    if (studentCheckboxes.length === 0) { alert('لطفاً دانش‌آموز انتخاب کنید.'); return; }

    const dateStr = document.getElementById('recordDate').value;
    if (!dateStr) { alert('لطفاً تاریخ را انتخاب کنید.'); return; }

    document.getElementById('preview-content').innerHTML = `
        <div class="preview-row"><strong>آیتم:</strong> <span>${selectedItem.value}</span></div>
        <div class="preview-row"><strong>تعداد:</strong> <span>${studentCheckboxes.length} نفر</span></div>
        <div class="preview-row"><strong>تاریخ:</strong> <span>${dateStr}</span></div>
        <div class="preview-row" style="background: #eef2ff; padding: 10px; border-radius: 8px; margin-top: 10px;"><strong>امتیاز:</strong> <span style="font-size: 1.2rem; color: #4A90E2;">${finalScore}</span></div>
    `;

    window.tempRecordData = {
        subjectId: parseInt(document.getElementById('recordSubject').value),
        itemName: selectedItem.value,
        title: document.getElementById('recordTitle').value,
        date: dateStr,
        students: Array.from(studentCheckboxes).map(cb => parseInt(cb.value)),
        arf: document.getElementById('recordArf').checked,
        finalScore: finalScore
    };
    document.getElementById('preview-modal').classList.add('show');
}

function closePreviewModal() { document.getElementById('preview-modal').classList.remove('show'); }

async function confirmAndSaveRecord() {
    if (!window.tempRecordData) return;
    try {
        await saveData('records', window.tempRecordData);

        if (window.tempRecordData.itemName === "پویش حفظ قرآن کریم" && window.tempRecordData.finalScore > 0) {
            for (const studentId of window.tempRecordData.students) {
                const allRecords = await getAllData('records');
                let totalSurahs = 0;
                let totalAyats = 0;
                allRecords.forEach(rec => {
                    if (rec.itemName === "پویش حفظ قرآن کریم" && rec.students.includes(studentId)) {
                        totalSurahs += 1;
                        const match = rec.title.match(/\d+/);
                        if (match) totalAyats += parseInt(match[0]);
                    }
                });

                await saveData('badgesSettings', {
                    id: `quranReward_${studentId}_${Date.now()}`,
                    studentId: studentId,
                    title: "تشویق شرکت در پویش حفظ جزء سی قرآن",
                    totalSurahs: totalSurahs,
                    totalAyats: totalAyats,
                    date: window.tempRecordData.date
                });
            }
        }

        alert('ذخیره شد!'); 
        closePreviewModal(); 
        document.getElementById('record-form').reset(); 
        // بازنشانی تاریخ به امروز
        initDateDropdowns();
        document.getElementById('dynamic-score-section').style.display = 'none'; 
        loadAllData();
    } catch (error) { alert('خطا!'); closePreviewModal(); }
}

// ==========================================
// 7. سیستم جایگاه‌ها و نشان‌ها
// ==========================================
async function loadBadgesSettings() {
    try {
        const groups = await getAllData('groups');
        const students = await getAllData('students');
        const records = await getAllData('records');

        let maxGroupSize = 0;
        if (groups.length > 0) { maxGroupSize = Math.max(...groups.map(g => students.filter(s => s.groupId === g.id).length)); }
        document.getElementById('max-group-size').textContent = maxGroupSize;

        const ranksSettings = await getDataById('badgesSettings', 'groupRanks') || { id: 'groupRanks', ranks: [] };
        const container = document.getElementById('group-ranks-form-container');
        
        if (maxGroupSize > 0) {
            container.innerHTML = '';
            for (let i = 1; i <= maxGroupSize; i++) {
                const existing = ranksSettings.ranks.find(r => r.rankNumber === i) || { rankNumber: i, icon: '', title: '', motto: '' };
                container.innerHTML += `
                    <div class="card" style="background: #f8fafc; padding: 12px; margin-bottom: 10px;">
                        <h4 style="margin: 0 0 10px 0; color: var(--primary-dark);">جایگاه ${i}</h4>
                        <div class="form-group"><input type="text" id="rankIcon_${i}" class="form-control" placeholder="آیکون" value="${existing.icon}" required></div>
                        <div class="form-group"><input type="text" id="rankTitle_${i}" class="form-control" placeholder="عنوان" value="${existing.title}" required></div>
                        <div class="form-group"><input type="text" id="rankMotto_${i}" class="form-control" placeholder="شعار" value="${existing.motto}" required></div>
                    </div>
                `;
            }
            container.innerHTML += `<button type="button" class="btn btn-primary mt-4" onclick="saveGroupRanks(${maxGroupSize})">💾 ذخیره</button>`;
        } else {
            container.innerHTML = '<p style="color:#64748b;">ابتدا گروه بسازید.</p>';
        }

        const topStudent = await getDataById('badgesSettings', 'topStudent');
        if (topStudent) {
            document.getElementById('topStudentIcon').value = topStudent.icon || '';
            document.getElementById('topStudentTitle').value = topStudent.title || '';
            document.getElementById('topStudentMotto').value = topStudent.motto || '';
        }

        renderLiveRanks(groups, students, records, ranksSettings.ranks, topStudent);
        loadQuranRewards();

    } catch (e) { console.log('خطا', e); }
}

async function saveGroupRanks(maxGroupSize) {
    const ranks = [];
    for (let i = 1; i <= maxGroupSize; i++) {
        ranks.push({ rankNumber: i, icon: document.getElementById(`rankIcon_${i}`).value, title: document.getElementById(`rankTitle_${i}`).value, motto: document.getElementById(`rankMotto_${i}`).value });
    }
    await saveData('badgesSettings', { id: 'groupRanks', ranks: ranks });
    alert('ذخیره شد!'); loadBadgesSettings();
}

async function loadSubjectBadgeList() {
    const subjects = await getAllData('subjects');
    const select = document.getElementById('badgeSubjectSelect');
    if (select) select.innerHTML = '<option value="" disabled selected>انتخاب کنید...</option>' + subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

async function loadSubjectBadgeSettings() {
    const subjectId = document.getElementById('badgeSubjectSelect').value;
    if (!subjectId) return;
    const badge = await getDataById('badgesSettings', `subject_${subjectId}`);
    if (badge) {
        document.getElementById('subjectBadgeIcon').value = badge.icon || '';
        document.getElementById('subjectBadgeTitle').value = badge.title || '';
        document.getElementById('subjectBadgeMotto').value = badge.motto || '';
    } else {
        document.getElementById('subjectBadgeIcon').value = '';
        document.getElementById('subjectBadgeTitle').value = '';
        document.getElementById('subjectBadgeMotto').value = '';
    }
}

async function renderLiveRanks(groups, students, records, ranksSettings, topStudent) {
    const container = document.getElementById('live-ranks-list');
    if (!container) return;

    const groupScores = groups.map(g => {
        let total = 0;
        const groupStudents = students.filter(s => s.groupId === g.id);
        records.forEach(rec => { rec.students.forEach(id => { if (groupStudents.find(s => s.id === id)) total += rec.finalScore; }); });
        return { ...g, totalScore: total };
    });
    groupScores.sort((a, b) => b.totalScore - a.totalScore);

    let html = '<h3>🏆 جایگاه گروه‌ها</h3>';
    groupScores.forEach((g, index) => {
        const rankSetting = ranksSettings.find(r => r.rankNumber === index + 1);
        const badge = rankSetting ? `${rankSetting.icon} ${rankSetting.title}` : '—';
        html += `<div class="list-item"><span>${g.symbol} <strong>${g.name}</strong></span><span class="rank-badge">${badge} (${g.totalScore} امتیاز)</span></div>`;
    });

    if (students.length > 0 && topStudent) {
        const studentScores = students.map(st => {
            let total = 0;
            records.forEach(rec => { if (rec.students.includes(st.id)) total += rec.finalScore; });
            return { ...st, totalScore: total };
        });
        const maxScore = Math.max(...studentScores.map(s => s.totalScore));
        const topStudents = studentScores.filter(s => s.totalScore === maxScore && maxScore > 0);

        html += `<h3 style="margin-top: 20px;">🎓 شاگرد اول کلاس</h3>`;
        if (topStudents.length > 0) {
            topStudents.forEach(st => {
                html += `<div class="list-item top-student-row"><span>${topStudent.icon} <strong>${st.firstName} ${st.lastName}</strong></span><span class="rank-badge">${topStudent.title} (${st.totalScore} امتیاز)</span></div>`;
            });
        } else { html += '<p style="color:#64748b;">هنوز امتیازی ثبت نشده است.</p>'; }
    }

    html += `<h3 style="margin-top: 20px;">🏅 شاگردان اول دروس</h3>`;
    const subjects = await getAllData('subjects');
    let hasSubjectBadges = false;
    for (const subject of subjects) {
        const badge = await getDataById('badgesSettings', `subject_${subject.id}`);
        if (!badge) continue;

        const subjectRecords = records.filter(r => r.subjectId === subject.id);
        const subjectScores = students.map(st => {
            let total = 0;
            subjectRecords.forEach(rec => { if (rec.students.includes(st.id)) total += rec.finalScore; });
            return { ...st, totalScore: total };
        });
        const maxScore = Math.max(...subjectScores.map(s => s.totalScore));
        if (maxScore === 0) continue;
        const topStudents = subjectScores.filter(s => s.totalScore === maxScore);
        
        hasSubjectBadges = true;
        html += `<div class="card" style="padding: 10px; margin-bottom: 10px; background: #f8fafc;"><h4 style="margin: 0 0 8px 0; color: var(--primary-dark);">📖 ${subject.name}</h4>`;
        topStudents.forEach(st => {
            html += `<div class="list-item" style="margin-bottom: 5px;"><span>${badge.icon} <strong>${st.firstName} ${st.lastName}</strong></span><span class="rank-badge">${badge.title} (${st.totalScore} امتیاز)</span></div>`;
        });
        html += `</div>`;
    }
    if (!hasSubjectBadges) {
        html += '<p style="color:#64748b;">برای دروس نشان تعریف نشده است.</p>';
    }

    container.innerHTML = html;
}

async function loadQuranRewards() {
    const container = document.getElementById('quran-rewards-list');
    if (!container) return;

    try {
        const allBadges = await getAllData('badgesSettings');
        const quranRewards = allBadges.filter(b => b.id && b.id.startsWith('quranReward_'));
        const students = await getAllData('students');

        if (quranRewards.length === 0) {
            container.innerHTML = '<p style="color:#64748b;">هنوز تشویقی صادر نشده است.</p>';
            return;
        }

        const grouped = {};
        quranRewards.forEach(reward => {
            if (!grouped[reward.studentId]) grouped[reward.studentId] = [];
            grouped[reward.studentId].push(reward);
        });

        let html = '';
        for (const studentId in grouped) {
            const student = students.find(s => s.id == studentId);
            const studentName = student ? `${student.firstName} ${student.lastName}` : `دانش‌آموز ${studentId}`;
            const latest = grouped[studentId][grouped[studentId].length - 1];
            html += `<div class="list-item" style="flex-direction: column; align-items: flex-start; padding: 15px; background: #FFF8E1; border-right: 4px solid #f59e0b;">
                <strong style="font-size: 1.1rem;">🏅 ${studentName}</strong>
                <span style="font-size: 0.9rem; color: #b45309;">تعداد سوره‌ها: ${latest.totalSurahs} | تعداد آیات: ${latest.totalAyats}</span>
            </div>`;
        }
        container.innerHTML = html;
    } catch (e) { container.innerHTML = '<p style="color:red;">خطا</p>'; }
}

// ==========================================
// 8. گزارشات (با مرتب‌سازی)
// ==========================================
function changeReportFilter(filter, btn) {
    currentReportFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (filter === 'subject') {
        document.getElementById('subject-filter-container').style.display = 'block';
    } else {
        document.getElementById('subject-filter-container').style.display = 'none';
    }
    generateReports();
}

async function generateReports() {
    const container = document.getElementById('reports-list');
    if (!container) return;
    container.innerHTML = '<p style="text-align:center;">در حال محاسبه...</p>';

    try {
        const students = await getAllData('students');
        const records = await getAllData('records');
        const groups = await getAllData('groups');
        const topStudent = await getDataById('badgesSettings', 'topStudent') || { icon: '👑', title: 'شاگرد اول' };

        const sortCriteria = document.getElementById('sortCriteriaSelect') ? document.getElementById('sortCriteriaSelect').value : 'score';

        if (students.length === 0) { container.innerHTML = '<p style="text-align:center;">لیست خالی است.</p>'; return; }

        const getDominantLevel = (studentRecords) => {
            const levelCounts = { "خیلی خوب": 0, "خوب": 0, "قابل قبول": 0, "نیازمند تلاش": 0 };
            studentRecords.forEach(rec => {
                const item = assessmentTree.find(i => i.value === rec.itemName);
                if (item && item.levels) {
                    for (const [level, score] of Object.entries(item.levels)) {
                        if (score === rec.finalScore) { levelCounts[level]++; break; }
                    }
                }
            });
            
            let dominantLevel = null, maxFreq = 0;
            const levelOrder = { "خیلی خوب": 4, "خوب": 3, "قابل قبول": 2, "نیازمند تلاش": 1 };
            for (const [level, freq] of Object.entries(levelCounts)) {
                if (freq > maxFreq || (freq === maxFreq && levelOrder[level] > (levelOrder[dominantLevel] || 0))) {
                    maxFreq = freq; dominantLevel = level;
                }
            }
            return dominantLevel;
        };

        if (currentReportFilter === 'subject') {
            const subjectId = parseInt(document.getElementById('reportSubjectSelect').value);
            if (!subjectId) { container.innerHTML = '<p style="text-align:center; color:#64748b;">لطفاً یک درس انتخاب کنید.</p>'; return; }
            
            const subjectRecords = records.filter(r => r.subjectId === subjectId);
            let studentScores = students.map(st => {
                let total = 0;
                const myRecords = subjectRecords.filter(rec => rec.students.includes(st.id));
                myRecords.forEach(rec => { total += rec.finalScore; });
                return { ...st, totalScore: total, count: myRecords.length, dominantLevel: getDominantLevel(myRecords) };
            });

            if (sortCriteria === 'level') {
                const order = { "خیلی خوب": 4, "خوب": 3, "قابل قبول": 2, "نیازمند تلاش": 1, null: 0 };
                studentScores.sort((a, b) => (order[b.dominantLevel] || 0) - (order[a.dominantLevel] || 0));
            } else if (sortCriteria === 'count') {
                studentScores.sort((a, b) => b.count - a.count);
            } else {
                studentScores.sort((a, b) => b.totalScore - a.totalScore);
            }

            const maxScore = studentScores.length > 0 ? Math.max(...studentScores.map(s => s.totalScore)) : 0;

            container.innerHTML = '<h3>📚 گزارش درسی</h3>' + studentScores.map((st, index) => {
                let displayValue = sortCriteria === 'level' ? (st.dominantLevel || '—') : (sortCriteria === 'count' ? `${st.count} ارزشیابی` : `${st.totalScore} امتیاز`);
                const isFirst = sortCriteria === 'score' && st.totalScore === maxScore && maxScore > 0;
                return `<div class="list-item ${isFirst ? 'top-student-row' : ''}">
                    <span><strong>${index + 1}. ${st.firstName} ${st.lastName}</strong> ${isFirst ? topStudent.icon : ''}</span>
                    <span class="rank-badge" style="font-size: 1rem; ${isFirst ? 'background: var(--arf-border); color: white;' : ''}">${displayValue}</span>
                </div>`;
            }).join('');

        } else if (currentReportFilter === 'group') {
            let groupScores = groups.map(g => {
                let total = 0;
                let count = 0;
                const groupStudents = students.filter(s => s.groupId === g.id);
                records.forEach(rec => { rec.students.forEach(id => { if (groupStudents.find(s => s.id === id)) { total += rec.finalScore; count++; } }); });
                return { ...g, totalScore: total, count: count };
            });
            
            if (sortCriteria === 'count') groupScores.sort((a, b) => b.count - a.count);
            else groupScores.sort((a, b) => b.totalScore - a.totalScore);

            const maxScore = groupScores.length > 0 ? Math.max(...groupScores.map(s => s.totalScore)) : 0;

            container.innerHTML = '<h3>👥 گزارش گروهی</h3>' + groupScores.map((g, index) => {
                let displayValue = sortCriteria === 'count' ? `${g.count} ارزشیابی` : `${g.totalScore} امتیاز`;
                const isFirst = sortCriteria === 'score' && g.totalScore === maxScore && maxScore > 0;
                return `<div class="list-item ${isFirst ? 'top-student-row' : ''}">
                    <span><strong>${g.symbol} ${g.name}</strong> ${isFirst ? '🏆' : ''}</span>
                    <span class="rank-badge" style="font-size: 1rem; ${isFirst ? 'background: var(--arf-border); color: white;' : ''}">${displayValue}</span>
                </div>`;
            }).join('');

        } else {
            let studentScores = students.map(st => {
                const myRecords = records.filter(rec => rec.students.includes(st.id));
                let total = 0;
                myRecords.forEach(rec => { total += rec.finalScore; });
                return { ...st, totalScore: total, count: myRecords.length, dominantLevel: getDominantLevel(myRecords) };
            });

            if (sortCriteria === 'level') {
                const order = { "خیلی خوب": 4, "خوب": 3, "قابل قبول": 2, "نیازمند تلاش": 1, null: 0 };
                studentScores.sort((a, b) => (order[b.dominantLevel] || 0) - (order[a.dominantLevel] || 0));
            } else if (sortCriteria === 'count') {
                studentScores.sort((a, b) => b.count - a.count);
            } else {
                studentScores.sort((a, b) => b.totalScore - a.totalScore);
            }

            const maxScore = studentScores.length > 0 ? Math.max(...studentScores.map(s => s.totalScore)) : 0;

            container.innerHTML = '<h3>🏫 گزارش کلاسی</h3>' + studentScores.map((st, index) => {
                let displayValue = sortCriteria === 'level' ? (st.dominantLevel || '—') : (sortCriteria === 'count' ? `${st.count} ارزشیابی` : `${st.totalScore} امتیاز`);
                const isFirst = sortCriteria === 'score' && st.totalScore === maxScore && maxScore > 0;
                return `<div class="list-item ${isFirst ? 'top-student-row' : ''}">
                    <span><strong>${index + 1}. ${st.firstName} ${st.lastName}</strong> ${isFirst ? topStudent.icon : ''}</span>
                    <span class="rank-badge" style="font-size: 1rem; ${isFirst ? 'background: var(--arf-border); color: white;' : ''}">${displayValue}</span>
                </div>`;
            }).join('');
        }
    } catch (e) { console.error(e); container.innerHTML = '<p style="text-align:center; color:red;">خطا</p>'; }
}

// ==========================================
// 9. پشتیبان‌گیری
// ==========================================
async function exportData() {
    try {
        const data = await exportAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `kosha_backup.json`; a.click();
        URL.revokeObjectURL(url);
    } catch (e) { alert('خطا: ' + e.message); }
}

async function importData(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            await importAllData(data);
            alert('بازیابی شد!'); loadAllData();
        } catch (err) { alert('فایل نامعتبر!'); }
    };
    reader.readAsText(file);
}

// ==========================================
// 10. Service Worker
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((reg) => {
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateToast(newWorker);
                    }
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
function getTodayJalali() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = formatter.format(now).split('/');
    return { year: parseInt(parts[0]), month: parseInt(parts[1]), day: parseInt(parts[2]) };
}

function jalaliToDateString(jy, jm, jd) {
    return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

// ادامه در قسمت ۲...
