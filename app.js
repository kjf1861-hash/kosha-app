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
let currentReportFilter = 'class'; // برای گزارش امتیازات
let currentStudentView = 'flat'; 
let isSaveAndNext = false; 

// متغیرهای مربوط به حضور و غیاب
let currentSessionId = null;
let currentSessionDate = null;
let currentAttView = 'flat'; 
let currentAttendanceState = {}; 

// متغیرهای جدید برای گزارشات
let currentReportType = 'scores'; // 'scores' or 'attendance'
let currentAttReportFilter = 'class'; // 'class' or 'group'

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

    } catch (e) { console.log('خطا', e); }
}

// ==========================================
// 4. توابع ویرایش و حذف
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

// ادامه در قسمت ۲ (بخش ۳.۲)...