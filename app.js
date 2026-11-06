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

// متغیرهای سراسری
let currentReportFilter = 'class'; 
let currentStudentView = 'flat'; 
let isSaveAndNext = false; 

// متغیرهای حضور و غیاب
let currentSessionId = null;
let currentSessionDate = null;
let currentAttView = 'flat'; 
let currentAttendanceState = {}; 

// متغیرهای گزارشات
let currentReportType = 'scores'; 
let currentAttReportFilter = 'class'; 

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
        setTimeout(() => { renderScoreInput(assessmentTree[0]); }, 100);

        itemSelect.addEventListener('change', (e) => {
            const selectedItem = assessmentTree[e.target.value];
            renderScoreInput(selectedItem);
        });
    }

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

    initDateDropdowns();
    initAttendanceDateDropdowns();

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
        
        window.allStudentsData = students;
        window.allGroupsData = groups;

        if (studentsList) {
            studentsList.innerHTML = students.length === 0 ? '<p style="text-align:center; color:#64748b;">لیست خالی است.</p>' : '';
            students.forEach(st => {
                const g = groups.find(x => x.id === st.groupId);
                studentsList.innerHTML += `<div class="list-item"><span><strong>${st.firstName} ${st.lastName}</strong></span><div style="display:flex; gap:5px; align-items:center;"><span class="rank-badge">${g ? g.symbol+' '+g.name : 'بدون گروه'}</span><button class="btn btn-secondary btn-sm" onclick="editStudent(${st.id})">✏️</button><button class="btn btn-danger btn-sm" onclick="deleteItem('students', ${st.id})">🗑️</button></div></div>`;
            });
        }
        
        renderStudentCheckboxes();
        loadSessions();
        loadAssessmentRecords();

    } catch (e) { console.log('خطا', e); }
}

// ==========================================
// 4. توابع ویرایش و حذف پایه
// ==========================================
async function deleteItem(storeName, id) {
    if (confirm('آیا مطمئن هستید؟')) {
        await deleteData(storeName, id);
        loadAllData();
        if (storeName === 'groups') loadBadgesSettings();
    }
}

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
// 5. منطق امتیازدهی و رندر لیست دانش‌آموزان
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

function renderStudentCheckboxes() {
    const container = document.getElementById('students-checkbox-container');
    if (!container) return;

    const students = window.allStudentsData || [];
    const groups = window.allGroupsData || [];

    if (students.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#64748b;">هیچ دانش‌آموزی ثبت نشده است.</p>';
        return;
    }

    container.innerHTML = '';

    if (currentStudentView === 'flat') {
        students.forEach(st => {
            container.innerHTML += `<label class="student-checkbox-item"><input type="checkbox" class="student-checkbox" value="${st.id}"><span>${st.firstName} ${st.lastName}</span></label>`;
        });
    } else {
        if (groups.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#dc2626;">هیچ گروهی ساخته نشده است. ابتدا از تب «دانش‌آموزان» گروه بسازید.</p>';
            return;
        }

        groups.forEach(g => {
            const groupStudents = students.filter(st => st.groupId === g.id);
            
            let groupHtml = `
                <details class="group-accordion">
                    <summary>
                        <div class="group-header-checkbox">
                            <input type="checkbox" class="group-select-all-checkbox" onchange="toggleGroupSelection(this, ${g.id})">
                            <span>${g.symbol} ${g.name} (${groupStudents.length} نفر)</span>
                        </div>
                    </summary>
                    <div class="group-students-container">
            `;
            
            if (groupStudents.length === 0) {
                groupHtml += `<p style="color:#64748b; font-size:0.85rem; text-align:center;">هیچ دانش‌آموزی در این گروه نیست.</p>`;
            } else {
                groupStudents.forEach(st => {
                    groupHtml += `<label class="student-checkbox-item"><input type="checkbox" class="student-checkbox group-student-${g.id}" value="${st.id}"><span>${st.firstName} ${st.lastName}</span></label>`;
                });
            }

            groupHtml += `</div></details>`;
            container.innerHTML += groupHtml;
        });
    }
}

function switchStudentView(view) {
    currentStudentView = view;
    document.getElementById('btnFlatView').classList.toggle('active', view === 'flat');
    document.getElementById('btnGroupView').classList.toggle('active', view === 'grouped');
    renderStudentCheckboxes();
}

function toggleGroupSelection(checkbox, groupId) {
    const groupCheckboxes = document.querySelectorAll(`.group-student-${groupId}`);
    groupCheckboxes.forEach(cb => cb.checked = checkbox.checked);
}

function toggleAllStudents(checked) { 
    document.querySelectorAll('.student-checkbox').forEach(cb => cb.checked = checked); 
    document.querySelectorAll('.group-select-all-checkbox').forEach(cb => cb.checked = checked);
}

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
// 6. تاریخ (انتخابگر روز، ماه، سال)
// ==========================================
function initDateDropdowns() {
    const daySelect = document.getElementById('dateDay');
    const monthSelect = document.getElementById('dateMonth');
    const yearSelect = document.getElementById('dateYear');

    if (!daySelect || !monthSelect || !yearSelect) return;

    daySelect.innerHTML = '<option value="" disabled selected>روز</option>';
    for (let i = 1; i <= 31; i++) daySelect.innerHTML += `<option value="${i}">${i}</option>`;

    const monthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
    monthSelect.innerHTML = '<option value="" disabled selected>ماه</option>';
    monthNames.forEach((name, index) => monthSelect.innerHTML += `<option value="${index + 1}">${name}</option>`);

    yearSelect.innerHTML = '<option value="" disabled selected>سال</option>';
    for (let i = 1405; i <= 1409; i++) yearSelect.innerHTML += `<option value="${i}">${i}</option>`;

    daySelect.value = '';
    monthSelect.value = '';
    yearSelect.value = '';
    document.getElementById('recordDate').value = '';

    const updateDate = () => {
        const d = daySelect.value;
        const m = monthSelect.value;
        const y = yearSelect.value;
        if (d && m && y) document.getElementById('recordDate').value = jalaliToDateString(y, m, d);
        
        daySelect.classList.remove('input-error');
        monthSelect.classList.remove('input-error');
        yearSelect.classList.remove('input-error');
    };

    daySelect.addEventListener('change', updateDate);
    monthSelect.addEventListener('change', updateDate);
    yearSelect.addEventListener('change', updateDate);
}

function initAttendanceDateDropdowns() {
    const daySelect = document.getElementById('attDateDay');
    const monthSelect = document.getElementById('attDateMonth');
    const yearSelect = document.getElementById('attDateYear');

    if (!daySelect || !monthSelect || !yearSelect) return;

    daySelect.innerHTML = '<option value="" disabled selected>روز</option>';
    for (let i = 1; i <= 31; i++) daySelect.innerHTML += `<option value="${i}">${i}</option>`;

    const monthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
    monthSelect.innerHTML = '<option value="" disabled selected>ماه</option>';
    monthNames.forEach((name, index) => monthSelect.innerHTML += `<option value="${index + 1}">${name}</option>`);

    yearSelect.innerHTML = '<option value="" disabled selected>سال</option>';
    for (let i = 1405; i <= 1409; i++) yearSelect.innerHTML += `<option value="${i}">${i}</option>`;

    daySelect.value = '';
    monthSelect.value = '';
    yearSelect.value = '';
}

function jalaliToDateString(jy, jm, jd) {
    return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

// ==========================================
// 7. منطق جلسات (روزهای آموزشی)
// ==========================================
async function createSession() {
    const d = document.getElementById('attDateDay').value;
    const m = document.getElementById('attDateMonth').value;
    const y = document.getElementById('attDateYear').value;

    if (!d || !m || !y) {
        document.getElementById('attDateDay').classList.add('input-error');
        document.getElementById('attDateMonth').classList.add('input-error');
        document.getElementById('attDateYear').classList.add('input-error');
        alert('لطفاً ابتدا تاریخ روز آموزشی را به طور کامل انتخاب کنید.');
        return;
    }

    const dateStr = jalaliToDateString(y, m, d);

    try {
        const allSessions = await getAllData('sessions');
        const existing = allSessions.find(s => s.date === dateStr);

        if (existing) {
            alert('این روز آموزشی قبلاً ثبت شده است.');
            return;
        }

        await saveData('sessions', { date: dateStr });
        alert('روز آموزشی با موفقیت ثبت شد!');
        
        document.getElementById('attDateDay').value = '';
        document.getElementById('attDateMonth').value = '';
        document.getElementById('attDateYear').value = '';
        document.getElementById('attDateDay').classList.remove('input-error');
        document.getElementById('attDateMonth').classList.remove('input-error');
        document.getElementById('attDateYear').classList.remove('input-error');

        loadSessions();
    } catch (e) {
        console.error(e);
        alert('خطا در ثبت روز آموزشی!');
    }
}

async function loadSessions() {
    const container = document.getElementById('sessions-list');
    if (!container) return;

    try {
        const sessions = await getAllData('sessions');
        sessions.sort((a, b) => b.date.localeCompare(a.date));

        if (sessions.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#64748b;">هنوز روز آموزشی ثبت نشده است.</p>';
            return;
        }

        container.innerHTML = '';
        sessions.forEach(session => {
            container.innerHTML += `
                <div class="list-item" onclick="openAttendanceForm(${session.id}, '${session.date}')" style="cursor: pointer;">
                    <span><strong>📅 ${session.date}</strong></span>
                    <button class="btn btn-primary btn-sm">ثبت حضور و غیاب</button>
                </div>
            `;
        });
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="color:red; text-align:center;">خطا در بارگذاری روزها.</p>';
    }
}

// ==========================================
// 8. منطق حضور و غیاب در جلسه
// ==========================================
async function openAttendanceForm(sessionId, dateStr) {
    currentSessionId = sessionId;
    currentSessionDate = dateStr;
    
    const formSection = document.getElementById('attendance-form-section');
    const title = document.getElementById('attendance-form-title');
    
    title.textContent = `📝 ثبت حضور و غیاب - ${dateStr}`;
    formSection.style.display = 'block';
    
    formSection.scrollIntoView({ behavior: 'smooth' });
    await loadAttendanceStudents(sessionId);
}

function closeAttendanceForm() {
    document.getElementById('attendance-form-section').style.display = 'none';
    currentSessionId = null;
    currentSessionDate = null;
    currentAttendanceState = {};
}

async function loadAttendanceStudents(sessionId) {
    const container = document.getElementById('attendance-students-list');
    if (!container) return;

    container.innerHTML = '<p style="text-align:center;">در حال بارگذاری...</p>';

    try {
        const students = await getAllData('students');
        if (students.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#64748b;">هیچ دانش‌آموزی ثبت نشده است.</p>';
            return;
        }

        const allAttendance = await getAllData('attendance');
        const sessionRecords = allAttendance.filter(a => a.sessionId === sessionId);

        currentAttendanceState = {};
        sessionRecords.forEach(r => {
            currentAttendanceState[r.studentId] = r.status;
        });

        renderAttendanceButtons();
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="text-align:center; color:red;">خطا در بارگذاری لیست.</p>';
    }
}

function renderAttendanceButtons() {
    const container = document.getElementById('attendance-students-list');
    if (!container) return;

    const students = window.allStudentsData || [];
    const groups = window.allGroupsData || [];

    if (students.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#64748b;">هیچ دانش‌آموزی ثبت نشده است.</p>';
        return;
    }

    container.innerHTML = '';

    const createStudentRow = (st) => {
        const currentStatus = currentAttendanceState[st.id] || 'present'; 
        return `
            <div class="attendance-student-row">
                <div class="attendance-student-name">${st.firstName} ${st.lastName}</div>
                <div class="att-btn-group">
                    <button type="button" class="att-btn present ${currentStatus === 'present' ? 'active' : ''}" onclick="setAttendanceStatus(${st.id}, 'present', this)">🟢 حاضر</button>
                    <button type="button" class="att-btn absent ${currentStatus === 'absent' ? 'active' : ''}" onclick="setAttendanceStatus(${st.id}, 'absent', this)">🔴 غایب</button>
                    <button type="button" class="att-btn late ${currentStatus === 'late' ? 'active' : ''}" onclick="setAttendanceStatus(${st.id}, 'late', this)">🟡 تأخیر</button>
                </div>
            </div>
        `;
    };

    if (currentAttView === 'flat') {
        students.forEach(st => { container.innerHTML += createStudentRow(st); });
    } else {
        if (groups.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#dc2626;">هیچ گروهی ساخته نشده است.</p>';
            return;
        }

        groups.forEach(g => {
            const groupStudents = students.filter(st => st.groupId === g.id);
            if (groupStudents.length === 0) return;

            let groupHtml = `
                <details class="group-accordion" open>
                    <summary>${g.symbol} ${g.name} (${groupStudents.length} نفر)</summary>
                    <div class="group-students-container">
            `;
            groupStudents.forEach(st => { groupHtml += createStudentRow(st); });
            groupHtml += `</div></details>`;
            container.innerHTML += groupHtml;
        });
    }
}

function switchAttView(view) {
    currentAttView = view;
    document.getElementById('btnAttFlatView').classList.toggle('active', view === 'flat');
    document.getElementById('btnAttGroupView').classList.toggle('active', view === 'grouped');
    renderAttendanceButtons();
}

function setAttendanceStatus(studentId, status, btnElement) {
    currentAttendanceState[studentId] = status;
    const parent = btnElement.parentElement;
    parent.querySelectorAll('.att-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
}

function setAllAttendance(status) {
    const students = window.allStudentsData || [];
    students.forEach(st => { currentAttendanceState[st.id] = status; });
    renderAttendanceButtons();
}

async function saveAttendance() {
    if (!currentSessionId) {
        alert('ابتدا یک روز آموزشی را از لیست انتخاب کنید.');
        return;
    }

    try {
        const allAttendance = await getAllData('attendance');
        const sessionRecords = allAttendance.filter(a => a.sessionId === currentSessionId);

        for (const studentId in currentAttendanceState) {
            const status = currentAttendanceState[studentId];
            const existing = sessionRecords.find(r => r.studentId == studentId);

            if (existing) {
                existing.status = status;
                await saveData('attendance', existing);
            } else {
                await saveData('attendance', {
                    sessionId: currentSessionId,
                    studentId: parseInt(studentId),
                    status: status
                });
            }
        }

        alert('حضور و غیاب با موفقیت ذخیره شد!');
    } catch (e) {
        console.error(e);
        alert('خطا در ذخیره حضور و غیاب!');
    }
}

// ==========================================
// 9. مدیریت سوابق ارزشیابی
// ==========================================
async function loadAssessmentRecords() {
    const container = document.getElementById('assessment-records-list');
    if (!container) return;

    container.innerHTML = '<p style="text-align:center;">در حال بارگذاری...</p>';

    try {
        const records = await getAllData('records');
        const subjects = await getAllData('subjects');
        
        records.sort((a, b) => b.date.localeCompare(a.date));

        if (records.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#64748b;">هنوز هیچ ارزشیابی ثبت نشده است.</p>';
            return;
        }

        container.innerHTML = '';
        records.forEach(rec => {
            const subject = subjects.find(s => s.id === rec.subjectId);
            const subjectName = subject ? subject.name : 'نامشخص';
            
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
                    <div class="record-details">
                        <span>📚 ${subjectName} | ${rec.itemName}</span>
                        <span>📅 ${rec.date}</span>
                    </div>
                    <div class="record-details" style="font-size: 0.8rem; margin-top: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        👥 ${studentNames}
                    </div>
                    <div class="record-actions">
                        <button class="btn btn-secondary btn-sm" onclick="openEditRecordModal(${rec.id})">✏️ ویرایش</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteRecord(${rec.id})">🗑️ حذف</button>
                    </div>
                </div>
            `;
        });

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="color:red; text-align:center;">خطا در بارگذاری سوابق.</p>';
    }
}

async function deleteRecord(id) {
    if (!confirm('آیا از حذف این رکورد ارزشیابی مطمئن هستید؟')) return;
    try {
        await deleteData('records', id);
        alert('رکورد با موفقیت حذف شد.');
        loadAssessmentRecords();
        loadAllData();
    } catch (e) {
        console.error(e);
        alert('خطا در حذف رکورد.');
    }
}

async function openEditRecordModal(id) {
    try {
        const record = await getDataById('records', id);
        if (!record) return;

        document.getElementById('editRecordId').value = record.id;
        document.getElementById('editRecordTitle').value = record.title;
        document.getElementById('editRecordDate').value = record.date;
        document.getElementById('editRecordScore').value = record.finalScore;

        document.getElementById('edit-record-modal').classList.add('show');
    } catch (e) {
        console.error(e);
        alert('خطا در باز کردن فرم ویرایش.');
    }
}

function closeEditModal() {
    document.getElementById('edit-record-modal').classList.remove('show');
}

async function saveEditedRecord() {
    const id = parseInt(document.getElementById('editRecordId').value);
    const newTitle = document.getElementById('editRecordTitle').value;
    const newDate = document.getElementById('editRecordDate').value;
    const newScore = parseInt(document.getElementById('editRecordScore').value);

    if (!newTitle || !newDate || isNaN(newScore)) {
        alert('لطفاً تمام فیلدها را به درستی پر کنید.');
        return;
    }

    try {
        const record = await getDataById('records', id);
        if (!record) return;

        record.title = newTitle;
        record.date = newDate;
        record.finalScore = newScore;

        await saveData('records', record);
        
        alert('تغییرات با موفقیت ذخیره شد.');
        closeEditModal();
        loadAssessmentRecords();
        loadAllData();

    } catch (e) {
        console.error(e);
        alert('خطا در ذخیره تغییرات.');
    }
}

// ادامه در بخش ۳.۲...

// ==========================================
// 10. پیش‌نمایش و ثبت ارزشیابی
// ==========================================
function showPreview(isFinal) {
    isSaveAndNext = !isFinal; 

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

    const daySelect = document.getElementById('dateDay');
    const monthSelect = document.getElementById('dateMonth');
    const yearSelect = document.getElementById('dateYear');
    const dateStr = document.getElementById('recordDate').value;
    
    daySelect.classList.remove('input-error');
    monthSelect.classList.remove('input-error');
    yearSelect.classList.remove('input-error');

    if (!daySelect.value || !monthSelect.value || !yearSelect.value || !dateStr) {
        if (!daySelect.value) daySelect.classList.add('input-error');
        if (!monthSelect.value) monthSelect.classList.add('input-error');
        if (!yearSelect.value) yearSelect.classList.add('input-error');
        alert('لطفاً تاریخ را به طور کامل (روز، ماه و سال) انتخاب کنید.');
        return;
    }

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
        
        if (isSaveAndNext) {
            toggleAllStudents(false);
            
            const scoreInput = document.getElementById('dynamicLevelInput') || document.getElementById('dynamicCountInput') || document.getElementById('dynamicFreeInput');
            if (scoreInput) scoreInput.value = '';
            if (document.getElementById('quranSurahSelect')) document.getElementById('quranSurahSelect').value = '';
            if (document.getElementById('quranAyatInput')) document.getElementById('quranAyatInput').value = '';
            
            document.getElementById('record-form').scrollIntoView({ behavior: 'smooth' });
        } else {
            document.getElementById('record-form').reset(); 
            initDateDropdowns();
            document.getElementById('dynamic-score-section').style.display = 'none'; 
            loadAllData();
        }
    } catch (error) { alert('خطا!'); closePreviewModal(); }
}

// ==========================================
// 11. سیستم جایگاه‌ها و نشان‌ها
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
// 12. گزارشات (تعویض نوع گزارش و نمایش آمار)
// ==========================================
function switchReportType(type) {
    currentReportType = type;
    
    document.getElementById('score-report-section').style.display = 'none';
    document.getElementById('attendance-report-section').style.display = 'none';
    document.getElementById('records-report-section').style.display = 'none';
    
    document.getElementById('btnReportScores').classList.remove('active');
    document.getElementById('btnReportAttendance').classList.remove('active');
    document.getElementById('btnReportRecords').classList.remove('active');

    if (type === 'scores') {
        document.getElementById('score-report-section').style.display = 'block';
        document.getElementById('btnReportScores').classList.add('active');
        generateReports();
    } else if (type === 'attendance') {
        document.getElementById('attendance-report-section').style.display = 'block';
        document.getElementById('btnReportAttendance').classList.add('active');
        generateAttendanceReports();
    } else if (type === 'records') {
        document.getElementById('records-report-section').style.display = 'block';
        document.getElementById('btnReportRecords').classList.add('active');
        loadAssessmentRecords();
    }
}

function changeReportFilter(filter, btn) {
    currentReportFilter = filter;
    document.querySelectorAll('#score-report-section .filter-btn').forEach(b => b.classList.remove('active'));
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
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <span class="rank-badge" style="font-size: 1rem; ${isFirst ? 'background: var(--arf-border); color: white;' : ''}">${displayValue}</span>
                        <button class="btn btn-secondary btn-sm" onclick="openReportCard(${st.id})" title="چاپ کارنامه">🖨️</button>
                    </div>
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
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <span class="rank-badge" style="font-size: 1rem; ${isFirst ? 'background: var(--arf-border); color: white;' : ''}">${displayValue}</span>
                        <button class="btn btn-secondary btn-sm" onclick="openReportCard(${st.id})" title="چاپ کارنامه">🖨️</button>
                    </div>
                </div>`;
            }).join('');
        }
    } catch (e) { console.error(e); container.innerHTML = '<p style="text-align:center; color:red;">خطا</p>'; }
}

// گزارش حضور و غیاب
function changeAttReportFilter(filter, btn) {
    currentAttReportFilter = filter;
    const btns = btn.parentElement.querySelectorAll('.filter-btn');
    btns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    generateAttendanceReports();
}

async function generateAttendanceReports() {
    const container = document.getElementById('attendance-reports-list');
    const totalSessionsEl = document.getElementById('total-sessions-count');
    if (!container || !totalSessionsEl) return;

    container.innerHTML = '<p style="text-align:center;">در حال محاسبه...</p>';

    try {
        const students = await getAllData('students');
        const groups = await getAllData('groups');
        const sessions = await getAllData('sessions');
        const attendance = await getAllData('attendance');

        totalSessionsEl.textContent = sessions.length;

        if (students.length === 0) {
            container.innerHTML = '<p style="text-align:center;">لیست خالی است.</p>';
            return;
        }

        let html = '';

        if (currentAttReportFilter === 'class') {
            html = '<h3 style="margin-bottom: 15px;">👦 گزارش حضور کلاسی</h3>';
            students.forEach(st => {
                let present = 0, absent = 0, late = 0;
                attendance.forEach(att => {
                    if (att.studentId === st.id) {
                        if (att.status === 'present') present++;
                        else if (att.status === 'absent') absent++;
                        else if (att.status === 'late') late++;
                    }
                });
                html += `
                    <div class="list-item" style="flex-direction: column; align-items: stretch; gap: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="font-weight: bold; font-size: 1.05rem;">${st.firstName} ${st.lastName}</div>
                            <button class="btn btn-secondary btn-sm" onclick="openReportCard(${st.id})" title="چاپ کارنامه">🖨️ کارنامه</button>
                        </div>
                        <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                            <span class="att-report-badge present">حاضر: ${present}</span>
                            <span class="att-report-badge absent">غایب: ${absent}</span>
                            <span class="att-report-badge late">تأخیر: ${late}</span>
                        </div>
                    </div>
                `;
            });
        } else {
            html = '<h3 style="margin-bottom: 15px;">👥 گزارش حضور گروهی</h3>';
            groups.forEach(g => {
                let present = 0, absent = 0, late = 0;
                const groupStudents = students.filter(s => s.groupId === g.id);
                const groupStudentIds = groupStudents.map(s => s.id);

                attendance.forEach(att => {
                    if (groupStudentIds.includes(att.studentId)) {
                        if (att.status === 'present') present++;
                        else if (att.status === 'absent') absent++;
                        else if (att.status === 'late') late++;
                    }
                });

                html += `
                    <div class="list-item" style="flex-direction: column; align-items: stretch; gap: 8px;">
                        <div style="font-weight: bold; font-size: 1.05rem;">${g.symbol} ${g.name} (${groupStudents.length} نفر)</div>
                        <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                            <span class="att-report-badge present">حاضر: ${present}</span>
                            <span class="att-report-badge absent">غایب: ${absent}</span>
                            <span class="att-report-badge late">تأخیر: ${late}</span>
                        </div>
                    </div>
                `;
            });
        }

        container.innerHTML = html;

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="color:red; text-align:center;">خطا در تولید گزارش.</p>';
    }
}

// ==========================================
// 13. کارنامه اختصاصی دانش‌آموز (Report Card)
// ==========================================
async function openReportCard(studentId) {
    try {
        const student = window.allStudentsData.find(s => s.id === studentId);
        if (!student) { alert('دانش‌آموز یافت نشد.'); return; }

        const classData = await getDataById('classProfile', 1) || { name: 'کلاس من', teacherName: 'معلم' };
        const groups = await getAllData('groups');
        const subjects = await getAllData('subjects');
        const records = await getAllData('records');
        const sessions = await getAllData('sessions');
        const attendance = await getAllData('attendance');
        const topStudentBadge = await getDataById('badgesSettings', 'topStudent');

        const group = groups.find(g => g.id === student.groupId);
        const groupName = group ? `${group.symbol} ${group.name}` : 'بدون گروه';

        // 1. آمار حضور و غیاب
        let presentCount = 0, absentCount = 0, lateCount = 0;
        attendance.forEach(att => {
            if (att.studentId === studentId) {
                if (att.status === 'present') presentCount++;
                else if (att.status === 'absent') absentCount++;
                else if (att.status === 'late') lateCount++;
            }
        });

        // 2. نمرات درسی
        const studentRecords = records.filter(rec => rec.students.includes(studentId));
        let subjectScoresHtml = '';
        let totalOverallScore = 0;

        for (const subject of subjects) {
            const subRecords = studentRecords.filter(r => r.subjectId === subject.id);
            let subjectTotal = 0;
            subRecords.forEach(r => subjectTotal += r.finalScore);
            totalOverallScore += subjectTotal;
            
            if (subjectTotal > 0) {
                subjectScoresHtml += `<div class="rc-subject-row"><span>📚 ${subject.name}</span><strong>${subjectTotal} امتیاز</strong></div>`;
            }
        }

        if (subjectScoresHtml === '') {
            subjectScoresHtml = '<p style="color:#64748b; text-align:center; font-size:0.9rem;">هنوز نمره‌ای برای این دانش‌آموز ثبت نشده است.</p>';
        }

        // 3. بررسی نشان‌ها (شاگرد اول کلاس)
        let badgesHtml = '';
        const allStudentScores = window.allStudentsData.map(st => {
            let total = 0;
            records.forEach(rec => { if (rec.students.includes(st.id)) total += rec.finalScore; });
            return { id: st.id, score: total };
        });
        const maxScore = Math.max(...allStudentScores.map(s => s.score));
        
        if (maxScore > 0 && totalOverallScore === maxScore && topStudentBadge) {
            badgesHtml += `<div class="arf-badge" style="margin-top: 10px;">${topStudentBadge.icon} <strong>${topStudentBadge.title}</strong> - ${topStudentBadge.motto}</div>`;
        }

        // تولید HTML نهایی
        const html = `
            <div class="rc-header">
                <h2>🏫 ${classData.name}</h2>
                <p>کارنامه دانش‌آموز | سال تحصیلی ۱۴۰۵-۱۴۰۶</p>
            </div>
            
            <div class="rc-student-info">
                <div>
                    <strong>👤 ${student.firstName} ${student.lastName}</strong>
                    <div style="font-size: 0.9rem; margin-top: 5px;">گروه: ${groupName}</div>
                </div>
                <div style="text-align: left;">
                    <div style="font-size: 0.9rem;">آموزگار: ${classData.teacherName}</div>
                    <div style="font-size: 0.9rem;">پایه: ${classData.grade || '-'}</div>
                </div>
            </div>

            <div class="rc-section-title">📅 وضعیت حضور و غیاب (از ${sessions.length} روز آموزشی)</div>
            <div class="rc-stats-row">
                <div class="rc-stat-box present">حاضر <span>${presentCount}</span></div>
                <div class="rc-stat-box absent">غایب <span>${absentCount}</span></div>
                <div class="rc-stat-box late">تأخیر <span>${lateCount}</span></div>
            </div>

            <div class="rc-section-title">📊 کارنامه دروس</div>
            ${subjectScoresHtml}
            
            <div class="rc-subject-row" style="margin-top: 10px; background: var(--primary-light); padding: 10px; border-radius: 8px; border-bottom: none;">
                <strong>مجموع کل امتیازات:</strong>
                <strong style="color: var(--primary-dark); font-size: 1.1rem;">${totalOverallScore} امتیاز</strong>
            </div>

            ${badgesHtml}
        `;

        document.getElementById('report-card-content').innerHTML = html;
        document.getElementById('report-card-modal').classList.add('show');

    } catch (e) {
        console.error(e);
        alert('خطا در تولید کارنامه.');
    }
}

function closeReportCard() {
    document.getElementById('report-card-modal').classList.remove('show');
}

// ==========================================
// 14. پشتیبان‌گیری
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
// 15. Service Worker
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