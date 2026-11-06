// ==========================================
// 1. متغیرهای سراسری
// ==========================================
let currentReportFilter = 'class'; 
let currentStudentView = 'flat'; 
let isSaveAndNext = false; 
let currentSessionId = null;
let currentSessionDate = null;
let currentAttView = 'flat'; 
let currentAttendanceState = {}; 
let currentReportType = 'scores'; 
let currentAttReportFilter = 'class'; 

// متغیرهای صفحه‌بندی
let currentPage = { students: 1, reports: 1, records: 1 };
const itemsPerPage = 10;

// آرایه آیتم‌های ارزشیابی (از دیتابیس خوانده می‌شود)
let assessmentItems = [];
const quranSurahs = { "ناس": 6, "فلق": 5, "توحید": 4, "مسد": 5, "نصر": 3, "کافرون": 6, "کوثر": 3, "ماعون": 7 };

// ==========================================
// 2. توابع کمکی و پیام شناور
// ==========================================
function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.custom-toast-container');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `custom-toast-container custom-toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '❌';

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// بررسی و یادآوری پشتیبان‌گیری
function checkBackupReminder() {
    try {
        const lastBackup = localStorage.getItem('kosha-last-backup');
        const statusEl = document.getElementById('backup-status');
        
        if (!lastBackup) {
            if (statusEl) statusEl.innerHTML = 'آخرین پشتیبان‌گیری: <strong style="color:red;">هرگز!</strong>';
            setTimeout(() => showToast('لطفاً از داده‌های خود نسخه پشتیبان تهیه کنید.', 'info'), 4000);
        } else {
            const daysDiff = Math.floor((Date.now() - parseInt(lastBackup)) / (1000 * 60 * 60 * 24));
            if (statusEl) statusEl.innerHTML = `آخرین پشتیبان‌گیری: <strong>${daysDiff} روز پیش</strong>`;
            if (daysDiff >= 7) {
                setTimeout(() => showToast('یک هفته از آخرین پشتیبان‌گیری گذشته است. لطفاً نسخه پشتیبان بگیرید.', 'info'), 4000);
            }
        }
    } catch (e) { console.log(e); }
}

// ==========================================
// 3. راه‌اندازی اولیه
// ==========================================
function initApp() {
    // فرم‌های اصلی
    document.getElementById('class-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveData('classProfile', { id: 1, name: document.getElementById('className').value, grade: document.getElementById('classGrade').value, motto: document.getElementById('classMotto').value, teacherName: document.getElementById('teacherName').value });
        showToast('اطلاعات کلاس شما ذخیره شد!', 'success');
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
        showToast(editId ? 'درس با موفقیت ویرایش شد!' : 'درس با موفقیت ثبت شد!', 'success');
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
        showToast(editId ? 'گروه با موفقیت ویرایش شد!' : 'گروه با موفقیت ثبت شد!', 'success');
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
        showToast(editId ? 'دانش‌آموز با موفقیت ویرایش شد!' : 'دانش‌آموز با موفقیت ثبت شد!', 'success');
        loadAllData();
    });

    // محدود کردن فیلد نماد گروه به یک ایموجی
    const symbolInput = document.getElementById('groupSymbol');
    if (symbolInput) {
        symbolInput.addEventListener('input', function() {
            const val = this.value;
            const emojis = val.match(/\p{Extended_Pictographic}/gu); 
            if (emojis && emojis.length > 0) { this.value = emojis[0]; } else { this.value = ''; }
        });
    }

    // تنظیمات آیتم ارزشیابی در فرم ثبت
    const itemSelect = document.getElementById('recordItem');
    if (itemSelect) {
        itemSelect.addEventListener('change', (e) => { 
            if (e.target.value !== "") {
                const item = window.allAssessmentItems.find(i => i.id == e.target.value);
                renderScoreInput(item); 
            } else {
                document.getElementById('dynamic-score-section').style.display = 'none';
            }
        });
    }

    // تنظیمات مدیریت آیتم‌ها (مودال جدید)
    document.getElementById('item-manager-form').addEventListener('submit', saveItem);
    document.getElementById('itemType').addEventListener('change', toggleItemTypeFields);

    // نشان‌ها
    document.getElementById('top-student-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveData('badgesSettings', { id: 'topStudent', icon: document.getElementById('topStudentIcon').value, title: document.getElementById('topStudentTitle').value, motto: document.getElementById('topStudentMotto').value });
        showToast('نشان شاگرد اول ذخیره شد!', 'success'); loadBadgesSettings();
    });

    document.getElementById('subject-badge-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectedSubjectId = document.getElementById('badgeSubjectSelect').value;
        if (!selectedSubjectId) { showToast('لطفاً یک درس انتخاب کنید.', 'error'); return; }
        await saveData('badgesSettings', {
            id: `subject_${selectedSubjectId}`, subjectId: parseInt(selectedSubjectId),
            icon: document.getElementById('subjectBadgeIcon').value, title: document.getElementById('subjectBadgeTitle').value, motto: document.getElementById('subjectBadgeMotto').value
        });
        showToast('نشان درس ذخیره شد!', 'success'); loadBadgesSettings();
    });

    initDateDropdowns();
    initAttendanceDateDropdowns();
    loadAllData();
    checkBackupReminder();
}

// ==========================================
// 4. بارگذاری داده‌ها
// ==========================================
async function loadAllData() {
    try {
        // کلاس
        const classData = await getDataById('classProfile', 1);
        if (classData) {
            document.getElementById('className').value = classData.name || '';
            document.getElementById('classGrade').value = classData.grade || '';
            document.getElementById('classMotto').value = classData.motto || '';
            document.getElementById('teacherName').value = classData.teacherName || '';
            document.getElementById('header-subtitle').textContent = classData.name || 'همیار پرتلاش معلم';
        }

        // آیتم‌های ارزشیابی
        assessmentItems = await getAllData('assessmentItems');
        window.allAssessmentItems = assessmentItems; 
        
        const recordSubjectSelect = document.getElementById('recordSubject');
        const itemSelect = document.getElementById('recordItem');
        const editRecordItemSelect = document.getElementById('editRecordItem');
        
        if (itemSelect) {
            itemSelect.innerHTML = '<option value="" disabled selected>روش سنجشی را انتخاب کنید!</option>' + assessmentItems.map(i => `<option value="${i.id}">${i.title}</option>`).join('');
        }
        if (editRecordItemSelect) {
            editRecordItemSelect.innerHTML = '<option value="" disabled selected>انتخاب کنید...</option>' + assessmentItems.map(i => `<option value="${i.id}">${i.title}</option>`).join('');
        }

        // دروس
        const subjects = await getAllData('subjects');
        const subjectsList = document.getElementById('subjects-list');
        const badgeSubjectSelect = document.getElementById('badgeSubjectSelect');
        const reportSubjectSelect = document.getElementById('reportSubjectSelect');
        const recordsFilterSubject = document.getElementById('recordsFilterSubject');
        const editRecordSubject = document.getElementById('editRecordSubject');
        
        if (subjectsList) {
            subjectsList.innerHTML = subjects.length === 0 ? '<p style="text-align:center; color:#64748b;">لیست خالی است.</p>' : '';
            subjects.forEach(s => {
                subjectsList.innerHTML += `<div class="list-item"><span><strong>${s.name}</strong></span><div style="display:flex; gap:5px;"><button class="btn btn-secondary btn-sm" onclick="editSubject(${s.id})">✏️</button><button class="btn btn-danger btn-sm" onclick="deleteItem('subjects', ${s.id})">🗑️</button></div></div>`;
            });
        }
        
        if (recordSubjectSelect) recordSubjectSelect.innerHTML = '<option value="" disabled selected>درسی را انتخاب کنید!</option>' + subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        if (editRecordSubject) editRecordSubject.innerHTML = '<option value="" disabled selected>انتخاب کنید...</option>' + subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        if (badgeSubjectSelect) badgeSubjectSelect.innerHTML = '<option value="" disabled selected>انتخاب کنید...</option>' + subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        if (reportSubjectSelect) reportSubjectSelect.innerHTML = '<option value="" disabled selected>انتخاب درس...</option>' + subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        if (recordsFilterSubject) recordsFilterSubject.innerHTML = '<option value="">همه دروس</option>' + subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

        // گروه‌ها
        const groups = await getAllData('groups');
        const groupsList = document.getElementById('groups-list');
        const studentGroupSelect = document.getElementById('studentGroup');
        if (groupsList) {
            groupsList.innerHTML = groups.length === 0 ? '<p style="text-align:center; color:#64748b;">لیست خالی است.</p>' : '';
            groups.forEach(g => { groupsList.innerHTML += `<div class="list-item"><span>${g.symbol} <strong>${g.name}</strong></span><div style="display:flex; gap:5px;"><button class="btn btn-secondary btn-sm" onclick="editGroup(${g.id})">✏️</button><button class="btn btn-danger btn-sm" onclick="deleteItem('groups', ${g.id})">🗑️</button></div></div>`; });
        }
        if (studentGroupSelect) studentGroupSelect.innerHTML = '<option value="" disabled selected>گروهی را انتخاب کنید!</option>' + groups.map(g => `<option value="${g.id}">${g.symbol} ${g.name}</option>`).join('');

        // دانش‌آموزان
        const students = await getAllData('students');
        const recordsFilterStudent = document.getElementById('recordsFilterStudent');
        
        window.allStudentsData = students;
        window.allGroupsData = groups;

        if (recordsFilterStudent) recordsFilterStudent.innerHTML = '<option value="">همه دانش‌آموزان</option>' + students.map(st => `<option value="${st.id}">${st.firstName} ${st.lastName}</option>`).join('');
        
        renderStudentsListWithPagination(); // لیست با صفحه‌بندی
        renderStudentCheckboxes();
        loadSessions();
        loadAssessmentRecords();

    } catch (e) { console.log('خطا', e); }
}

// ==========================================
// 5. توابع صفحه‌بندی و لیست‌ها
// ==========================================
function renderStudentsListWithPagination() {
    const students = window.allStudentsData || [];
    const groups = window.allGroupsData || [];
    const studentsList = document.getElementById('students-list');
    const pagination = document.getElementById('students-pagination');
    
    if (!studentsList) return;
    
    if (students.length === 0) { 
        studentsList.innerHTML = '<p style="text-align:center; color:#64748b;">لیست خالی است.</p>'; 
        if(pagination) pagination.style.display = 'none';
        return; 
    }

    // محاسبه صفحه‌بندی
    const totalPages = Math.ceil(students.length / itemsPerPage);
    if (currentPage.students > totalPages) currentPage.students = totalPages;
    if (currentPage.students < 1) currentPage.students = 1;
    
    const startIndex = (currentPage.students - 1) * itemsPerPage;
    const paginatedStudents = students.slice(startIndex, startIndex + itemsPerPage);

    studentsList.innerHTML = '';
    paginatedStudents.forEach(st => {
        const g = groups.find(x => x.id === st.groupId);
        studentsList.innerHTML += `<div class="list-item"><span><strong>${st.firstName} ${st.lastName}</strong></span><div style="display:flex; gap:5px; align-items:center;"><span class="group-label">${g ? g.symbol+' '+g.name : 'بدون گروه'}</span><button class="btn btn-secondary btn-sm" onclick="editStudent(${st.id})">✏️</button><button class="btn btn-danger btn-sm" onclick="deleteItem('students', ${st.id})">🗑️</button></div></div>`;
    });

    // آپدیت UI صفحه‌بندی
    if (pagination) {
        if (totalPages > 1) {
            pagination.style.display = 'flex';
            document.getElementById('studentsPageInfo').textContent = `صفحه ${currentPage.students} از ${totalPages}`;
            document.getElementById('btnPrevStudents').disabled = (currentPage.students === 1);
            document.getElementById('btnNextStudents').disabled = (currentPage.students === totalPages);
        } else {
            pagination.style.display = 'none';
        }
    }
}

function changePage(section, direction) {
    if (section === 'students') { currentPage.students += direction; renderStudentsListWithPagination(); }
    else if (section === 'reports') { currentPage.reports += direction; generateReports(); }
    else if (section === 'records') { currentPage.records += direction; loadAssessmentRecords(); }
}

// ==========================================
// 6. توابع ویرایش و حذف پایه
// ==========================================
async function deleteItem(storeName, id) {
    if (confirm('آیا مطمئن هستید؟')) {
        await deleteData(storeName, id);
        showToast('با موفقیت حذف شد!', 'success');
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
// 7. مدیریت آیتم‌های ارزشیابی (سیستم پویا)
// ==========================================
function openItemManagementModal() {
    document.getElementById('item-management-modal').classList.add('show');
    renderItemsList();
    resetItemForm();
}

function closeItemManagementModal() {
    document.getElementById('item-management-modal').classList.remove('show');
    loadAllData(); // آپدیت فرم‌های ثبت ارزشیابی
}

function renderItemsList() {
    const container = document.getElementById('items-list-container');
    if (!container) return;
    if (assessmentItems.length === 0) {
        container.innerHTML = '<p style="text-align:center;">هیچ آیتمی یافت نشد.</p>';
        return;
    }
    container.innerHTML = '';
    assessmentItems.forEach(item => {
        let typeName = item.type === 'level' ? 'سطح محور' : item.type === 'count' ? 'شمارشی' : item.type === 'free' ? 'آزاد' : 'ویژه (قرآن)';
        container.innerHTML += `
            <div class="item-management-row">
                <div><strong>${item.title}</strong> <span style="font-size:0.8rem; color:var(--text-muted);">(${typeName})</span></div>
                <div style="display:flex; gap:5px;">
                    <button class="btn btn-secondary btn-sm" onclick="editItem(${item.id})" ${item.type === 'quran' ? 'disabled title="این آیتم سیستمی است"' : ''}>✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteCustomItem(${item.id})" ${item.type === 'quran' ? 'disabled title="این آیتم سیستمی است"' : ''}>🗑️</button>
                </div>
            </div>
        `;
    });
}

function resetItemForm() {
    document.getElementById('item-manager-form').reset();
    document.getElementById('editItemId').value = '';
    document.getElementById('item-form-title').textContent = '➕ افزودن آیتم جدید';
    document.getElementById('levels-container').innerHTML = '';
    document.getElementById('itemLevelPlaceholder').value = '';
    document.getElementById('item-type-level').style.display = 'none';
    document.getElementById('item-type-count').style.display = 'none';
    document.getElementById('item-type-free').style.display = 'none';
    document.getElementById('itemTitle').readOnly = false;
}

function toggleItemTypeFields() {
    const type = document.getElementById('itemType').value;
    document.getElementById('item-type-level').style.display = type === 'level' ? 'block' : 'none';
    document.getElementById('item-type-count').style.display = type === 'count' ? 'block' : 'none';
    document.getElementById('item-type-free').style.display = type === 'free' ? 'block' : 'none';
    
    if (type === 'level' && document.getElementById('levels-container').children.length === 0) {
        addLevelRow(); addLevelRow(); // دو ردیف پیش‌فرض
    }
}

function addLevelRow(name = '', score = '') {
    const container = document.getElementById('levels-container');
    const row = document.createElement('div');
    row.className = 'level-row-input';
    row.innerHTML = `
        <input type="text" class="form-control level-name" placeholder="نام سطح" value="${name}">
        <input type="number" class="form-control level-score" placeholder="امتیاز" value="${score}">
        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">✖</button>
    `;
    container.appendChild(row);
}

async function editItem(id) {
    const item = assessmentItems.find(i => i.id === id);
    if (!item) return;
    
    document.getElementById('editItemId').value = item.id;
    document.getElementById('itemTitle').value = item.title;
    document.getElementById('itemType').value = item.type;
    document.getElementById('item-form-title').textContent = '✏️ ویرایش آیتم';
    
    document.getElementById('item-type-level').style.display = 'none';
    document.getElementById('item-type-count').style.display = 'none';
    document.getElementById('item-type-free').style.display = 'none';
    
    if (item.type === 'level') {
        document.getElementById('item-type-level').style.display = 'block';
        document.getElementById('itemLevelPlaceholder').value = item.placeholder || 'انتخاب سطح عملکرد:';
        const container = document.getElementById('levels-container');
        container.innerHTML = '';
        item.levels.forEach(l => addLevelRow(l.name, l.score));
    } else if (item.type === 'count') {
        document.getElementById('item-type-count').style.display = 'block';
        document.getElementById('itemUnitScore').value = item.unitScore;
        document.getElementById('itemCountPlaceholder').value = item.placeholder || '';
    } else if (item.type === 'free') {
        document.getElementById('item-type-free').style.display = 'block';
        document.getElementById('itemFreePlaceholder').value = item.placeholder || '';
    }
}

async function saveItem(e) {
    e.preventDefault();
    const id = document.getElementById('editItemId').value;
    const title = document.getElementById('itemTitle').value;
    const type = document.getElementById('itemType').value;
    
    if (!title || !type) { showToast('عنوان و نوع را مشخص کنید.', 'error'); return; }
    
    let itemData = { title, type };
    if (id) itemData.id = parseInt(id);
    else itemData.id = Date.now();
    
    if (type === 'level') {
        itemData.placeholder = document.getElementById('itemLevelPlaceholder').value || 'انتخاب سطح عملکرد:';
        const levels = [];
        const rows = document.querySelectorAll('#levels-container .level-row-input');
        rows.forEach(row => {
            const name = row.querySelector('.level-name').value.trim();
            const score = parseInt(row.querySelector('.level-score').value);
            if (name && !isNaN(score)) levels.push({ name, score });
        });
        if (levels.length === 0) { showToast('حداقل یک سطح با نام و امتیاز تعریف کنید.', 'error'); return; }
        itemData.levels = levels;
    } else if (type === 'count') {
        itemData.unitScore = parseInt(document.getElementById('itemUnitScore').value);
        itemData.placeholder = document.getElementById('itemCountPlaceholder').value;
    } else if (type === 'free') {
        itemData.placeholder = document.getElementById('itemFreePlaceholder').value;
    }
    
    try {
        await saveData('assessmentItems', itemData);
        showToast('آیتم با موفقیت ذخیره شد!', 'success');
        resetItemForm();
        assessmentItems = await getAllData('assessmentItems');
        window.allAssessmentItems = assessmentItems;
        renderItemsList();
        
        const itemSelect = document.getElementById('recordItem');
        if (itemSelect) itemSelect.innerHTML = '<option value="" disabled selected>روش سنجشی را انتخاب کنید!</option>' + assessmentItems.map(i => `<option value="${i.id}">${i.title}</option>`).join('');
    } catch (error) {
        showToast('خطا در ذخیره آیتم!', 'error');
    }
}

async function deleteCustomItem(id) {
    if(!confirm('آیا از حذف این آیتم مطمئن هستید؟ (رکوردهای قبلی ثبت شده با این آیتم حذف نمی‌شوند)')) return;
    await deleteData('assessmentItems', id);
    showToast('آیتم حذف شد.', 'success');
    assessmentItems = await getAllData('assessmentItems');
    window.allAssessmentItems = assessmentItems;
    renderItemsList();
    const itemSelect = document.getElementById('recordItem');
    if (itemSelect) itemSelect.innerHTML = '<option value="" disabled selected>روش سنجشی را انتخاب کنید!</option>' + assessmentItems.map(i => `<option value="${i.id}">${i.title}</option>`).join('');
}

// ==========================================
// 8. منطق امتیازدهی بر اساس آیتم‌های جدید
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
    } else if (item.type === 'quran') {
        label.textContent = 'جزئیات حفظ:';
        const select = document.createElement('select');
        select.className = 'form-control'; select.id = 'quranSurahSelect';
        select.innerHTML = '<option value="" disabled selected>انتخاب سوره...</option>';
        for (const [surah, ayat] of Object.entries(quranSurahs)) select.innerHTML += `<option value="${ayat}">${surah} (${ayat} آیه)</option>`;
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

    if (students.length === 0) { container.innerHTML = '<p style="text-align:center; color:#64748b;">هیچ دانش‌آموزی ثبت نشده است.</p>'; return; }
    container.innerHTML = '';

    const createStudentLabel = (st, isEdit = false) => {
        const g = groups.find(x => x.id === st.groupId);
        const badge = g ? `<span class="group-label">${g.symbol} ${g.name}</span>` : '';
        const checkboxClass = isEdit ? 'edit-student-checkbox' : 'student-checkbox';
        return `<label class="student-checkbox-item"><input type="checkbox" class="${checkboxClass}" value="${st.id}"><div class="student-checkbox-item-content"><span>${st.firstName} ${st.lastName}</span>${badge}</div></label>`;
    };

    if (currentStudentView === 'flat') {
        students.forEach(st => { container.innerHTML += createStudentLabel(st); });
    } else {
        if (groups.length === 0) { container.innerHTML = '<p style="text-align:center; color:#dc2626;">هیچ گروهی ساخته نشده است.</p>'; return; }
        groups.forEach(g => {
            const groupStudents = students.filter(st => st.groupId === g.id);
            let groupHtml = `<details class="group-accordion"><summary><div class="group-header-checkbox"><input type="checkbox" class="group-select-all-checkbox" onchange="toggleGroupSelection(this, ${g.id})"><span>${g.symbol} ${g.name} (${groupStudents.length} نفر)</span></div></summary><div class="group-students-container">`;
            if (groupStudents.length === 0) groupHtml += `<p style="color:#64748b; font-size:0.85rem; text-align:center;">هیچ دانش‌آموزی در این گروه نیست.</p>`;
            else groupStudents.forEach(st => { 
                groupHtml += `<label class="student-checkbox-item"><input type="checkbox" class="student-checkbox group-student-${g.id}" value="${st.id}"><div class="student-checkbox-item-content"><span>${st.firstName} ${st.lastName}</span><span class="group-label">${g.symbol} ${g.name}</span></div></label>`; 
            });
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
    document.querySelectorAll(`.group-student-${groupId}`).forEach(cb => cb.checked = checkbox.checked);
}

function toggleAllStudents(checked) { 
    document.querySelectorAll('.student-checkbox').forEach(cb => cb.checked = checked); 
    document.querySelectorAll('.group-select-all-checkbox').forEach(cb => cb.checked = checked);
}
// ==========================================
// 9. تاریخ
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

    daySelect.value = ''; monthSelect.value = ''; yearSelect.value = '';
    document.getElementById('recordDate').value = '';

    const updateDate = () => {
        const d = daySelect.value, m = monthSelect.value, y = yearSelect.value;
        if (d && m && y) document.getElementById('recordDate').value = jalaliToDateString(y, m, d);
        daySelect.classList.remove('input-error'); monthSelect.classList.remove('input-error'); yearSelect.classList.remove('input-error');
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
    daySelect.value = ''; monthSelect.value = ''; yearSelect.value = '';
}

function jalaliToDateString(jy, jm, jd) {
    return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

// ==========================================
// 10. جلسات (روزهای آموزشی)
// ==========================================
async function createSession() {
    const d = document.getElementById('attDateDay').value;
    const m = document.getElementById('attDateMonth').value;
    const y = document.getElementById('attDateYear').value;
    if (!d || !m || !y) {
        document.getElementById('attDateDay').classList.add('input-error'); document.getElementById('attDateMonth').classList.add('input-error'); document.getElementById('attDateYear').classList.add('input-error');
        showToast('لطفاً ابتدا تاریخ روز آموزشی را انتخاب کنید.', 'error'); return;
    }
    const dateStr = jalaliToDateString(y, m, d);
    try {
        const allSessions = await getAllData('sessions');
        if (allSessions.find(s => s.date === dateStr)) { showToast('این روز آموزشی قبلاً ثبت شده است.', 'error'); return; }
        await saveData('sessions', { date: dateStr });
        showToast('روز آموزشی با موفقیت ثبت شد!', 'success');
        document.getElementById('attDateDay').value = ''; document.getElementById('attDateMonth').value = ''; document.getElementById('attDateYear').value = '';
        document.getElementById('attDateDay').classList.remove('input-error'); document.getElementById('attDateMonth').classList.remove('input-error'); document.getElementById('attDateYear').classList.remove('input-error');
        loadSessions();
    } catch (e) { console.error(e); showToast('خطا در ثبت روز آموزشی!', 'error'); }
}

async function loadSessions() {
    const container = document.getElementById('sessions-list');
    if (!container) return;
    try {
        const sessions = await getAllData('sessions');
        sessions.sort((a, b) => b.date.localeCompare(a.date));
        if (sessions.length === 0) { container.innerHTML = '<p style="text-align:center; color:#64748b;">هنوز روز آموزشی ثبت نشده است.</p>'; return; }
        container.innerHTML = '';
        sessions.forEach(session => {
            container.innerHTML += `
                <div class="list-item" style="justify-content: space-between;">
                    <div onclick="openAttendanceForm(${session.id}, '${session.date}')" style="cursor: pointer; flex-grow: 1;">
                        <span><strong>📅 ${session.date}</strong></span>
                    </div>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <button class="btn btn-secondary btn-sm" onclick="editSessionDate(${session.id}, '${session.date}')" title="ویرایش تاریخ">✏️</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteSession(${session.id})" title="حذف روز">🗑️</button>
                        <button class="btn btn-primary btn-sm" onclick="openAttendanceForm(${session.id}, '${session.date}')">ثبت حضور</button>
                    </div>
                </div>
            `;
        });
    } catch (e) { console.error(e); container.innerHTML = '<p style="color:red; text-align:center;">خطا در بارگذاری روزها.</p>'; }
}

async function editSessionDate(sessionId, currentDate) {
    const newDate = prompt('تاریخ جدید را وارد کنید (مثلاً 1405/08/20):', currentDate);
    if (newDate === null) return;
    const trimmed = newDate.trim();
    if (!/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) { showToast('فرمت تاریخ نامعتبر است.', 'error'); return; }
    if (trimmed === currentDate) { showToast('تاریخ جدید با تاریخ قبلی یکسان است.', 'error'); return; }
    try {
        const allSessions = await getAllData('sessions');
        if (allSessions.find(s => s.date === trimmed && s.id !== sessionId)) { showToast('این تاریخ قبلاً ثبت شده است.', 'error'); return; }
        const session = await getDataById('sessions', sessionId);
        if (!session) return;
        session.date = trimmed;
        await saveData('sessions', session);
        showToast('تاریخ با موفقیت به‌روزرسانی شد.', 'success');
        loadSessions();
    } catch (e) { console.error(e); showToast('خطا در ویرایش تاریخ.', 'error'); }
}

async function deleteSession(sessionId) {
    if (!confirm('آیا از حذف این روز آموزشی مطمئن هستید؟ تمام حضور و غیاب‌های ثبت‌شده برای این روز نیز حذف خواهند شد.')) return;
    try {
        const allAttendance = await getAllData('attendance');
        const sessionAttendance = allAttendance.filter(a => a.sessionId === sessionId);
        for (const att of sessionAttendance) await deleteData('attendance', att.id);
        await deleteData('sessions', sessionId);
        showToast('روز آموزشی و رکوردهای آن حذف شد.', 'success');
        loadSessions();
        if (currentSessionId === sessionId) closeAttendanceForm();
    } catch (e) { console.error(e); showToast('خطا در حذف روز آموزشی.', 'error'); }
}

// ==========================================
// 11. حضور و غیاب
// ==========================================
async function openAttendanceForm(sessionId, dateStr) {
    currentSessionId = sessionId; currentSessionDate = dateStr;
    document.getElementById('attendance-form-section').style.display = 'block';
    document.getElementById('attendance-form-title').textContent = `📝 ثبت حضور و غیاب - ${dateStr}`;
    document.getElementById('attendance-form-section').scrollIntoView({ behavior: 'smooth' });
    await loadAttendanceStudents(sessionId);
}

function closeAttendanceForm() {
    document.getElementById('attendance-form-section').style.display = 'none';
    currentSessionId = null; currentSessionDate = null; currentAttendanceState = {};
}

async function loadAttendanceStudents(sessionId) {
    const container = document.getElementById('attendance-students-list');
    if (!container) return;
    container.innerHTML = '<p style="text-align:center;">در حال بارگذاری...</p>';
    try {
        const students = await getAllData('students');
        if (students.length === 0) { container.innerHTML = '<p style="text-align:center; color:#64748b;">هیچ دانش‌آموزی ثبت نشده است.</p>'; return; }
        const allAttendance = await getAllData('attendance');
        const sessionRecords = allAttendance.filter(a => a.sessionId === sessionId);
        currentAttendanceState = {};
        sessionRecords.forEach(r => { currentAttendanceState[r.studentId] = r.status; });
        renderAttendanceButtons();
    } catch (e) { console.error(e); container.innerHTML = '<p style="text-align:center; color:red;">خطا در بارگذاری لیست.</p>'; }
}

function renderAttendanceButtons() {
    const container = document.getElementById('attendance-students-list');
    if (!container) return;
    const students = window.allStudentsData || [];
    const groups = window.allGroupsData || [];
    if (students.length === 0) { container.innerHTML = '<p style="text-align:center; color:#64748b;">هیچ دانش‌آموزی ثبت نشده است.</p>'; return; }
    container.innerHTML = '';

    const createStudentRow = (st) => {
        const g = groups.find(x => x.id === st.groupId);
        const badge = g ? `<span class="group-label">${g.symbol} ${g.name}</span>` : '';
        const currentStatus = currentAttendanceState[st.id] || 'present'; 
        return `<div class="attendance-student-row">
                    <div class="attendance-student-name">${st.firstName} ${st.lastName} ${badge}</div>
                    <div class="att-btn-group">
                        <button type="button" class="att-btn present ${currentStatus === 'present' ? 'active' : ''}" onclick="setAttendanceStatus(${st.id}, 'present', this)">🟢 حاضر</button>
                        <button type="button" class="att-btn absent ${currentStatus === 'absent' ? 'active' : ''}" onclick="setAttendanceStatus(${st.id}, 'absent', this)">🔴 غایب</button>
                        <button type="button" class="att-btn late ${currentStatus === 'late' ? 'active' : ''}" onclick="setAttendanceStatus(${st.id}, 'late', this)">🟡 تأخیر</button>
                    </div>
                </div>`;
    };

    if (currentAttView === 'flat') {
        students.forEach(st => { container.innerHTML += createStudentRow(st); });
    } else {
        if (groups.length === 0) { container.innerHTML = '<p style="text-align:center; color:#dc2626;">هیچ گروهی ساخته نشده است.</p>'; return; }
        groups.forEach(g => {
            const groupStudents = students.filter(st => st.groupId === g.id);
            if (groupStudents.length === 0) return;
            let groupHtml = `<details class="group-accordion" open><summary>${g.symbol} ${g.name} (${groupStudents.length} نفر)</summary><div class="group-students-container">`;
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
    if (!currentSessionId) { showToast('ابتدا یک روز آموزشی را انتخاب کنید.', 'error'); return; }
    try {
        const allAttendance = await getAllData('attendance');
        const sessionRecords = allAttendance.filter(a => a.sessionId === currentSessionId);
        const recordsToSave = [];

        for (const studentId in currentAttendanceState) {
            const status = currentAttendanceState[studentId];
            const existing = sessionRecords.find(r => r.studentId == studentId);
            if (existing) { existing.status = status; recordsToSave.push(existing); }
            else { recordsToSave.push({ sessionId: currentSessionId, studentId: parseInt(studentId), status: status }); }
        }
        
        await saveBulkData('attendance', recordsToSave);
        showToast('حضور و غیاب با موفقیت ذخیره شد!', 'success');
    } catch (e) { console.error(e); showToast('خطا در ذخیره حضور و غیاب!', 'error'); }
}

// ==========================================
// 12. ثبت ارزشیابی جدید (پیش‌نمایش و ذخیره)
// ==========================================
function showPreview(isFinal) {
    isSaveAndNext = !isFinal;
    const selectedIndex = document.getElementById('recordItem').value;
    if (selectedIndex === "") { showToast('آیتم ارزشیابی را انتخاب کنید.', 'error'); return; }
    const selectedItem = assessmentItems.find(i => i.id == selectedIndex);
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
        } else if (selectedItem.type === 'quran') {
            const ayat = parseInt(document.getElementById('quranAyatInput').value) || 0;
            const total = parseInt(document.getElementById('quranSurahSelect').value) || 0;
            const threshold = Math.ceil((total / 2) + 1);
            finalScore = (ayat >= threshold && total > 0) ? ayat * 5 : 0;
        }
    } catch (e) { showToast('فیلدها را کامل کنید.', 'error'); return; }

    const studentCheckboxes = document.querySelectorAll('.student-checkbox:checked');
    if (studentCheckboxes.length === 0) { showToast('دانش‌آموز انتخاب کنید.', 'error'); return; }
    const daySelect = document.getElementById('dateDay'), monthSelect = document.getElementById('dateMonth'), yearSelect = document.getElementById('dateYear');
    const dateStr = document.getElementById('recordDate').value;
    daySelect.classList.remove('input-error'); monthSelect.classList.remove('input-error'); yearSelect.classList.remove('input-error');
    if (!daySelect.value || !monthSelect.value || !yearSelect.value || !dateStr) {
        if (!daySelect.value) daySelect.classList.add('input-error');
        if (!monthSelect.value) monthSelect.classList.add('input-error');
        if (!yearSelect.value) yearSelect.classList.add('input-error');
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
        itemName: selectedItem.title, // ذخیره عنوان آیتم برای گزارشات
        title: document.getElementById('recordTitle').value, date: dateStr,
        students: Array.from(studentCheckboxes).map(cb => parseInt(cb.value)),
        arf: document.getElementById('recordArf').checked, finalScore: finalScore
    };
    document.getElementById('preview-modal').classList.add('show');
}

function closePreviewModal() { document.getElementById('preview-modal').classList.remove('show'); }

async function confirmAndSaveRecord() {
    if (!window.tempRecordData) return;
    try {
        await saveData('records', window.tempRecordData);
        if (window.tempRecordData.itemName === "پویش حفظ قرآن کریم" && window.tempRecordData.finalScore > 0) {
            const allRecords = await getAllData('records'); // خواندن یک‌باره در بیرون حلقه
            for (const studentId of window.tempRecordData.students) {
                let totalSurahs = 0, totalAyats = 0;
                allRecords.forEach(rec => {
                    if (rec.itemName === "پویش حفظ قرآن کریم" && rec.students.includes(studentId)) {
                        totalSurahs += 1;
                        const match = rec.title.match(/\d+/); if (match) totalAyats += parseInt(match[0]);
                    }
                });
                await saveData('badgesSettings', { id: `quranReward_${studentId}_${Date.now()}`, studentId: studentId, title: "تشویق شرکت در پویش حفظ جزء سی قرآن", totalSurahs: totalSurahs, totalAyats: totalAyats, date: window.tempRecordData.date });
            }
        }
        showToast('ارزشیابی با موفقیت ذخیره شد!', 'success');
        closePreviewModal();
        if (isSaveAndNext) {
            toggleAllStudents(false);
            const scoreInput = document.getElementById('dynamicLevelInput') || document.getElementById('dynamicCountInput') || document.getElementById('dynamicFreeInput');
            if (scoreInput) scoreInput.value = '';
            if (document.getElementById('quranSurahSelect')) document.getElementById('quranSurahSelect').value = '';
            if (document.getElementById('quranAyatInput')) document.getElementById('quranAyatInput').value = '';
            document.getElementById('record-form').scrollIntoView({ behavior: 'smooth' });
        } else {
            document.getElementById('record-form').reset(); initDateDropdowns();
            document.getElementById('dynamic-score-section').style.display = 'none'; loadAllData();
        }
    } catch (error) { showToast('خطا در ذخیره!', 'error'); closePreviewModal(); }
}

// ==========================================
// 13. سوابق ارزشیابی و ویرایش کامل
// ==========================================
async function loadAssessmentRecords() {
    const container = document.getElementById('assessment-records-list');
    const pagination = document.getElementById('records-pagination');
    if (!container) return;
    container.innerHTML = '<p style="text-align:center;">در حال بارگذاری...</p>';
    try {
        const records = await getAllData('records');
        const subjects = await getAllData('subjects');
        const filterSubjectEl = document.getElementById('recordsFilterSubject');
        const filterStudentEl = document.getElementById('recordsFilterStudent');
        const searchTextEl = document.getElementById('recordsSearchText');
        const filterSubject = filterSubjectEl ? filterSubjectEl.value : '';
        const filterStudent = filterStudentEl ? filterStudentEl.value : '';
        const searchText = searchTextEl ? searchTextEl.value.trim() : '';

        let filteredRecords = records.filter(rec => {
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

        // اعمال صفحه‌بندی
        const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
        if (currentPage.records > totalPages) currentPage.records = totalPages;
        if (currentPage.records < 1) currentPage.records = 1;
        const startIndex = (currentPage.records - 1) * itemsPerPage;
        const paginatedRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage);

        container.innerHTML = '';
        paginatedRecords.forEach(rec => {
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
                    <div class="record-details"><span>📚 ${subjectName} | ${rec.itemName}</span><span>📅 ${rec.date}</span></div>
                    <div class="record-details" style="font-size: 0.8rem; margin-top: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">👥 ${studentNames}</div>
                    <div class="record-actions">
                        <button class="btn btn-secondary btn-sm" onclick="openEditRecordModal(${rec.id})">✏️ ویرایش کامل</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteRecord(${rec.id})">🗑️ حذف</button>
                    </div>
                </div>`;
        });

        // آپدیت UI صفحه‌بندی
        if (pagination) {
            if (totalPages > 1) {
                pagination.style.display = 'flex';
                document.getElementById('recordsPageInfo').textContent = `صفحه ${currentPage.records} از ${totalPages}`;
                document.getElementById('btnPrevRecords').disabled = (currentPage.records === 1);
                document.getElementById('btnNextRecords').disabled = (currentPage.records === totalPages);
            } else { pagination.style.display = 'none'; }
        }

    } catch (e) { console.error(e); container.innerHTML = '<p style="color:red; text-align:center;">خطا در بارگذاری سوابق.</p>'; }
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
    try { await deleteData('records', id); showToast('رکورد حذف شد.', 'success'); loadAssessmentRecords(); loadAllData(); }
    catch (e) { console.error(e); showToast('خطا در حذف رکورد.', 'error'); }
}

// مودال ویرایش کامل رکورد
async function openEditRecordModal(id) {
    try {
        const record = await getDataById('records', id);
        if (!record) return;
        document.getElementById('editRecordId').value = record.id;
        document.getElementById('editRecordTitle').value = record.title;
        document.getElementById('editRecordDate').value = record.date;
        document.getElementById('editRecordScore').value = record.finalScore;
        
        // پر کردن سلکت‌ها
        document.getElementById('editRecordSubject').value = record.subjectId;
        document.getElementById('editRecordItem').value = record.itemName; // از عنوان استفاده می‌کنیم چون ID نداریم
        
        // پر کردن چک‌باکس دانش‌آموزان
        const container = document.getElementById('edit-record-students-container');
        container.innerHTML = '';
        const groups = window.allGroupsData || [];
        
        window.allStudentsData.forEach(st => {
            const g = groups.find(x => x.id === st.groupId);
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
    const subjectId = parseInt(document.getElementById('editRecordSubject').value);
    const itemName = document.getElementById('editRecordItem').value;
    const newTitle = document.getElementById('editRecordTitle').value;
    const newDate = document.getElementById('editRecordDate').value;
    const newScore = parseInt(document.getElementById('editRecordScore').value);
    
    const studentCheckboxes = document.querySelectorAll('.edit-student-checkbox:checked');
    const students = Array.from(studentCheckboxes).map(cb => parseInt(cb.value));

    if (!newTitle || !newDate || isNaN(newScore) || !subjectId || !itemName) { 
        showToast('لطفاً تمام فیلدهای الزامی را پر کنید.', 'error'); return; 
    }
    if (students.length === 0) {
        showToast('حداقل یک دانش‌آموز را انتخاب کنید.', 'error'); return;
    }

    try {
        const record = await getDataById('records', id);
        if (!record) return;
        
        record.subjectId = subjectId;
        record.itemName = itemName;
        record.title = newTitle; 
        record.date = newDate; 
        record.finalScore = newScore;
        record.students = students;
        
        await saveData('records', record);
        showToast('رکورد با موفقیت ویرایش شد.', 'success');
        closeEditModal(); loadAssessmentRecords(); loadAllData();
    } catch (e) { console.error(e); showToast('خطا در ذخیره.', 'error'); }
}
// ==========================================
// 14. جایگاه‌ها و نشان‌ها
// ==========================================
async function loadBadgesSettings() {
    try {
        const groups = await getAllData('groups'), students = await getAllData('students'), records = await getAllData('records');
        let maxGroupSize = 0;
        if (groups.length > 0) maxGroupSize = Math.max(...groups.map(g => students.filter(s => s.groupId === g.id).length));
        document.getElementById('max-group-size').textContent = maxGroupSize;
        const ranksSettings = await getDataById('badgesSettings', 'groupRanks') || { id: 'groupRanks', ranks: [] };
        const container = document.getElementById('group-ranks-form-container');
        if (maxGroupSize > 0) {
            container.innerHTML = '';
            for (let i = 1; i <= maxGroupSize; i++) {
                const existing = ranksSettings.ranks.find(r => r.rankNumber === i) || { rankNumber: i, icon: '', title: '', motto: '' };
                container.innerHTML += `<div class="card" style="background: var(--input-bg); padding: 12px; margin-bottom: 10px;"><h4 style="margin: 0 0 10px 0; color: var(--primary);">جایگاه ${i}</h4><div class="form-group"><input type="text" id="rankIcon_${i}" class="form-control" placeholder="آیکون" value="${existing.icon}" autocomplete="on" required></div><div class="form-group"><input type="text" id="rankTitle_${i}" class="form-control" placeholder="عنوان" value="${existing.title}" autocomplete="on" required></div><div class="form-group"><input type="text" id="rankMotto_${i}" class="form-control" placeholder="شعار" value="${existing.motto}" autocomplete="on" required></div></div>`;
            }
            container.innerHTML += `<button type="button" class="btn btn-primary mt-4" onclick="saveGroupRanks(${maxGroupSize})">💾 ذخیره</button>`;
        } else container.innerHTML = '<p style="color:#64748b;">ابتدا گروه بسازید.</p>';
        const topStudent = await getDataById('badgesSettings', 'topStudent');
        if (topStudent) { document.getElementById('topStudentIcon').value = topStudent.icon || ''; document.getElementById('topStudentTitle').value = topStudent.title || ''; document.getElementById('topStudentMotto').value = topStudent.motto || ''; }
        renderLiveRanks(groups, students, records, ranksSettings.ranks, topStudent);
        loadQuranRewards();
    } catch (e) { console.log('خطا', e); }
}

async function saveGroupRanks(maxGroupSize) {
    const ranks = [];
    for (let i = 1; i <= maxGroupSize; i++) ranks.push({ rankNumber: i, icon: document.getElementById(`rankIcon_${i}`).value, title: document.getElementById(`rankTitle_${i}`).value, motto: document.getElementById(`rankMotto_${i}`).value });
    await saveData('badgesSettings', { id: 'groupRanks', ranks: ranks });
    showToast('تنظیمات جایگاه‌ها ذخیره شد!', 'success'); 
    loadBadgesSettings();
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
    if (badge) { document.getElementById('subjectBadgeIcon').value = badge.icon || ''; document.getElementById('subjectBadgeTitle').value = badge.title || ''; document.getElementById('subjectBadgeMotto').value = badge.motto || ''; }
    else { document.getElementById('subjectBadgeIcon').value = ''; document.getElementById('subjectBadgeTitle').value = ''; document.getElementById('subjectBadgeMotto').value = ''; }
}

async function renderLiveRanks(groups, students, records, ranksSettings, topStudent) {
    const container = document.getElementById('live-ranks-list');
    if (!container) return;
    const groupScores = groups.map(g => {
        let total = 0; const gs = students.filter(s => s.groupId === g.id);
        records.forEach(rec => { rec.students.forEach(id => { if (gs.find(s => s.id === id)) total += rec.finalScore; }); });
        return { ...g, totalScore: total };
    });
    groupScores.sort((a, b) => b.totalScore - a.totalScore);
    let html = '<h3>🏆 جایگاه گروه‌ها</h3>';
    groupScores.forEach((g, index) => {
        const rs = ranksSettings.find(r => r.rankNumber === index + 1);
        const badge = rs ? `${rs.icon} ${rs.title}` : '—';
        html += `<div class="list-item"><span>${g.symbol} <strong>${g.name}</strong></span><span class="rank-badge">${badge} (${g.totalScore} امتیاز)</span></div>`;
    });
    if (students.length > 0 && topStudent) {
        const studentScores = students.map(st => { let total = 0; records.forEach(rec => { if (rec.students.includes(st.id)) total += rec.finalScore; }); return { ...st, totalScore: total }; });
        const maxScore = Math.max(...studentScores.map(s => s.totalScore));
        const topStudents = studentScores.filter(s => s.totalScore === maxScore && maxScore > 0);
        html += `<h3 style="margin-top: 20px;">🎓 شاگرد اول کلاس</h3>`;
        if (topStudents.length > 0) topStudents.forEach(st => { html += `<div class="list-item top-student-row"><span>${topStudent.icon} <strong>${st.firstName} ${st.lastName}</strong></span><span class="rank-badge">${topStudent.title} (${st.totalScore} امتیاز)</span></div>`; });
        else html += '<p style="color:#64748b;">هنوز امتیازی ثبت نشده است.</p>';
    }
    html += `<h3 style="margin-top: 20px;">🏅 شاگردان اول دروس</h3>`;
    const subjects = await getAllData('subjects');
    let hasSubjectBadges = false;
    for (const subject of subjects) {
        const badge = await getDataById('badgesSettings', `subject_${subject.id}`);
        if (!badge) continue;
        const subjectRecords = records.filter(r => r.subjectId === subject.id);
        const subjectScores = students.map(st => { let total = 0; subjectRecords.forEach(rec => { if (rec.students.includes(st.id)) total += rec.finalScore; }); return { ...st, totalScore: total }; });
        const maxScore = Math.max(...subjectScores.map(s => s.totalScore));
        if (maxScore === 0) continue;
        const topStudents = subjectScores.filter(s => s.totalScore === maxScore);
        hasSubjectBadges = true;
        html += `<div class="card" style="padding: 10px; margin-bottom: 10px; background: var(--input-bg);"><h4 style="margin: 0 0 8px 0; color: var(--primary);">📖 ${subject.name}</h4>`;
        topStudents.forEach(st => { html += `<div class="list-item" style="margin-bottom: 5px;"><span>${badge.icon} <strong>${st.firstName} ${st.lastName}</strong></span><span class="rank-badge">${badge.title} (${st.totalScore} امتیاز)</span></div>`; });
        html += `</div>`;
    }
    if (!hasSubjectBadges) html += '<p style="color:#64748b;">برای دروس نشان تعریف نشده است.</p>';
    container.innerHTML = html;
}

async function loadQuranRewards() {
    const container = document.getElementById('quran-rewards-list');
    if (!container) return;
    try {
        const allBadges = await getAllData('badgesSettings');
        const quranRewards = allBadges.filter(b => b.id && b.id.startsWith('quranReward_'));
        const students = await getAllData('students');
        if (quranRewards.length === 0) { container.innerHTML = '<p style="color:#64748b;">هنوز تشویقی صادر نشده است.</p>'; return; }
        const grouped = {};
        quranRewards.forEach(reward => { if (!grouped[reward.studentId]) grouped[reward.studentId] = []; grouped[reward.studentId].push(reward); });
        let html = '';
        for (const studentId in grouped) {
            const student = students.find(s => s.id == studentId);
            const studentName = student ? `${student.firstName} ${student.lastName}` : `دانش‌آموز ${studentId}`;
            const latest = grouped[studentId][grouped[studentId].length - 1];
            html += `<div class="list-item" style="flex-direction: column; align-items: flex-start; padding: 15px; background: var(--arf-bg); border-right: 4px solid var(--arf-border);"><strong style="font-size: 1.1rem;">🏅 ${studentName}</strong><span style="font-size: 0.9rem; color: var(--arf-border);">تعداد سوره‌ها: ${latest.totalSurahs} | تعداد آیات: ${latest.totalAyats}</span></div>`;
        }
        container.innerHTML = html;
    } catch (e) { container.innerHTML = '<p style="color:red;">خطا</p>'; }
}

// ==========================================
// 15. گزارشات (با صفحه‌بندی)
// ==========================================
function switchReportType(type) {
    currentReportType = type;
    document.getElementById('score-report-section').style.display = 'none';
    document.getElementById('attendance-report-section').style.display = 'none';
    document.getElementById('records-report-section').style.display = 'none';
    document.getElementById('btnReportScores').classList.remove('active');
    document.getElementById('btnReportAttendance').classList.remove('active');
    document.getElementById('btnReportRecords').classList.remove('active');
    
    currentPage.reports = 1; // ریست صفحه
    
    if (type === 'scores') { document.getElementById('score-report-section').style.display = 'block'; document.getElementById('btnReportScores').classList.add('active'); generateReports(); }
    else if (type === 'attendance') { document.getElementById('attendance-report-section').style.display = 'block'; document.getElementById('btnReportAttendance').classList.add('active'); generateAttendanceReports(); }
    else if (type === 'records') { document.getElementById('records-report-section').style.display = 'block'; document.getElementById('btnReportRecords').classList.add('active'); loadAssessmentRecords(); }
}

function changeReportFilter(filter, btn) {
    currentReportFilter = filter;
    document.querySelectorAll('#score-report-section .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('subject-filter-container').style.display = filter === 'subject' ? 'block' : 'none';
    currentPage.reports = 1;
    generateReports();
}

async function generateReports() {
    const container = document.getElementById('reports-list');
    const pagination = document.getElementById('reports-pagination');
    if (!container) return;
    container.innerHTML = '<p style="text-align:center;">در حال محاسبه...</p>';
    try {
        if (!window.allStudentsData || !window.allGroupsData) {
            window.allStudentsData = await getAllData('students');
            window.allGroupsData = await getAllData('groups');
        }

        const students = await getAllData('students'), records = await getAllData('records'), groups = await getAllData('groups');
        const topStudent = await getDataById('badgesSettings', 'topStudent') || { icon: '👑', title: 'شاگرد اول' };
        const sortCriteria = document.getElementById('sortCriteriaSelect') ? document.getElementById('sortCriteriaSelect').value : 'score';
        if (students.length === 0) { container.innerHTML = '<p style="text-align:center;">لیست خالی است.</p>'; if(pagination) pagination.style.display='none'; return; }
        
        const getDominantLevel = (sr) => {
            const lc = { "خیلی خوب": 0, "خوب": 0, "قابل قبول": 0, "نیازمند تلاش": 0 };
            // استفاده از آیتم‌های داینامیک برای تشخیص سطح
            sr.forEach(rec => { 
                const item = assessmentItems.find(i => i.title === rec.itemName); 
                if (item && item.type === 'level' && item.levels) {
                    item.levels.forEach(level => {
                        if (level.score === rec.finalScore) lc[level.name] = (lc[level.name] || 0) + 1;
                    });
                }
            });
            let dl = null, mf = 0;
            const lo = { "خیلی خوب": 4, "خوب": 3, "قابل قبول": 2, "نیازمند تلاش": 1 };
            for (const [level, freq] of Object.entries(lc)) if (freq > mf || (freq === mf && (lo[level] || 0) > (lo[dl] || 0))) { mf = freq; dl = level; }
            return dl;
        };

        let reportData = [];
        let isGroup = false;

        if (currentReportFilter === 'subject') {
            const subjectId = parseInt(document.getElementById('reportSubjectSelect').value);
            if (!subjectId) { container.innerHTML = '<p style="text-align:center; color:#64748b;">لطفاً یک درس انتخاب کنید.</p>'; if(pagination) pagination.style.display='none'; return; }
            const sr = records.filter(r => r.subjectId === subjectId);
            reportData = students.map(st => { let t = 0; const mr = sr.filter(rec => rec.students.includes(st.id)); mr.forEach(rec => t += rec.finalScore); return { ...st, totalScore: t, count: mr.length, dominantLevel: getDominantLevel(mr) }; });
            container.innerHTML = '<h3>📚 گزارش درسی</h3>';
        } else if (currentReportFilter === 'group') {
            isGroup = true;
            reportData = groups.map(g => { let t = 0, c = 0; const gst = students.filter(s => s.groupId === g.id); records.forEach(rec => { rec.students.forEach(id => { if (gst.find(s => s.id === id)) { t += rec.finalScore; c++; } }); }); return { ...g, totalScore: t, count: c }; });
            container.innerHTML = '<h3>👥 گزارش گروهی</h3>';
        } else {
            reportData = students.map(st => { const mr = records.filter(rec => rec.students.includes(st.id)); let t = 0; mr.forEach(rec => t += rec.finalScore); return { ...st, totalScore: t, count: mr.length, dominantLevel: getDominantLevel(mr) }; });
            container.innerHTML = '<h3>🏫 گزارش کلاسی</h3>';
        }

        // مرتب‌سازی
        if (sortCriteria === 'level') { const o = { "خیلی خوب": 4, "خوب": 3, "قابل قبول": 2, "نیازمند تلاش": 1, null: 0 }; reportData.sort((a, b) => (o[b.dominantLevel] || 0) - (o[a.dominantLevel] || 0)); }
        else if (sortCriteria === 'count') reportData.sort((a, b) => b.count - a.count);
        else reportData.sort((a, b) => b.totalScore - a.totalScore);

        const ms = reportData.length > 0 ? Math.max(...reportData.map(s => s.totalScore)) : 0;

        // صفحه‌بندی
        const totalPages = Math.ceil(reportData.length / itemsPerPage);
        if (currentPage.reports > totalPages) currentPage.reports = totalPages;
        if (currentPage.reports < 1) currentPage.reports = 1;
        const startIndex = (currentPage.reports - 1) * itemsPerPage;
        const paginatedData = reportData.slice(startIndex, startIndex + itemsPerPage);

        let htmlStr = '';
        paginatedData.forEach((item, i) => {
            const globalIndex = startIndex + i + 1;
            const dv = sortCriteria === 'level' ? (item.dominantLevel || '—') : (sortCriteria === 'count' ? `${item.count} ارزشیابی` : `${item.totalScore} امتیاز`);
            const isF = sortCriteria === 'score' && item.totalScore === ms && ms > 0;
            const pct = ms > 0 ? (item.totalScore / ms) * 100 : 0;
            
            if (isGroup) {
                htmlStr += `<div class="list-item" style="flex-direction: column; align-items: stretch; gap: 5px;"><div style="display: flex; justify-content: space-between; align-items: center;"><span><strong>${item.symbol} ${item.name}</strong> ${isF ? '🏆' : ''}</span><span class="rank-badge" style="font-size: 1rem; ${isF ? 'background: var(--arf-border); color: white;' : ''}">${dv}</span></div>${sortCriteria === 'score' ? `<div class="score-bar-container"><div class="score-bar-fill ${isF ? 'is-first' : ''}" style="width: ${pct}%;"></div></div>` : ''}</div>`;
            } else {
                const g = groups.find(x => x.id === item.groupId);
                const badge = g ? `<span class="group-label" style="margin-right:5px;">${g.symbol} ${g.name}</span>` : '';
                htmlStr += `<div class="list-item" style="flex-direction: column; align-items: stretch; gap: 5px;"><div style="display: flex; justify-content: space-between; align-items: center;"><span><strong>${globalIndex}. ${item.firstName} ${item.lastName}</strong> ${badge} ${isF ? topStudent.icon : ''}</span><div style="display: flex; gap: 5px; align-items: center;"><span class="rank-badge" style="font-size: 1rem; ${isF ? 'background: var(--arf-border); color: white;' : ''}">${dv}</span><button class="btn btn-secondary btn-sm" onclick="openReportCard(${item.id})">🖨️</button></div></div>${sortCriteria === 'score' ? `<div class="score-bar-container"><div class="score-bar-fill ${isF ? 'is-first' : ''}" style="width: ${pct}%;"></div></div>` : ''}</div>`;
            }
        });
        container.innerHTML += htmlStr;

        // UI صفحه‌بندی
        if (pagination) {
            if (totalPages > 1) {
                pagination.style.display = 'flex';
                document.getElementById('reportsPageInfo').textContent = `صفحه ${currentPage.reports} از ${totalPages}`;
                document.getElementById('btnPrevReports').disabled = (currentPage.reports === 1);
                document.getElementById('btnNextReports').disabled = (currentPage.reports === totalPages);
            } else { pagination.style.display = 'none'; }
        }

    } catch (e) { console.error(e); container.innerHTML = '<p style="text-align:center; color:red;">خطا</p>'; }
}

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
    container.innerHTML = '<p style="text-align:center;">در حال محاسبه...</p>';
    try {
        const students = await getAllData('students'), groups = await getAllData('groups'), sessions = await getAllData('sessions'), attendance = await getAllData('attendance');
        tsc.textContent = sessions.length;
        if (students.length === 0) { container.innerHTML = '<p style="text-align:center;">لیست خالی است.</p>'; return; }
        let tp = 0, ta = 0, tl = 0;
        attendance.forEach(att => { if (att.status === 'present') tp++; else if (att.status === 'absent') ta++; else if (att.status === 'late') tl++; });
        const tall = tp + ta + tl;
        let html = '';
        if (tall > 0) {
            const pp = (tp / tall) * 100, pa = (ta / tall) * 100, pl = (tl / tall) * 100;
            html += `<div class="card" style="background: var(--input-bg); margin-bottom: 20px; border: 1px solid var(--border-color);"><h4 style="margin: 0 0 10px 0; color: var(--primary); text-align: center;">📊 نمودار کلی حضور کلاس</h4><div class="att-stacked-bar-container">${pp > 0 ? `<div class="att-stacked-segment present" style="width: ${pp}%;">${Math.round(pp)}%</div>` : ''}${pa > 0 ? `<div class="att-stacked-segment absent" style="width: ${pa}%;">${Math.round(pa)}%</div>` : ''}${pl > 0 ? `<div class="att-stacked-segment late" style="width: ${pl}%;">${Math.round(pl)}%</div>` : ''}</div><div class="att-legend"><div class="att-legend-item"><div class="att-legend-color present"></div>حاضر</div><div class="att-legend-item"><div class="att-legend-color absent"></div>غایب</div><div class="att-legend-item"><div class="att-legend-color late"></div>تأخیر</div></div></div>`;
        }
        if (currentAttReportFilter === 'class') {
            html += '<h3 style="margin-bottom: 15px;">👦 گزارش حضور کلاسی</h3>';
            students.forEach(st => {
                let p = 0, a = 0, l = 0;
                attendance.forEach(att => { if (att.studentId === st.id) { if (att.status === 'present') p++; else if (att.status === 'absent') a++; else if (att.status === 'late') l++; } });
                const g = groups.find(x => x.id === st.groupId);
                const badge = g ? `<span class="group-label" style="margin-right:5px;">${g.symbol} ${g.name}</span>` : '';
                html += `<div class="list-item" style="flex-direction: column; align-items: stretch; gap: 8px;"><div style="display: flex; justify-content: space-between; align-items: center;"><div style="font-weight: bold; font-size: 1.05rem;">${st.firstName} ${st.lastName} ${badge}</div><button class="btn btn-secondary btn-sm" onclick="openReportCard(${st.id})">🖨️ کارنامه</button></div><div style="display: flex; gap: 5px; flex-wrap: wrap;"><span class="att-report-badge present clickable" onclick="showAttendanceDetails(${st.id}, 'present')">حاضر: ${p}</span><span class="att-report-badge absent clickable" onclick="showAttendanceDetails(${st.id}, 'absent')">غایب: ${a}</span><span class="att-report-badge late clickable" onclick="showAttendanceDetails(${st.id}, 'late')">تأخیر: ${l}</span></div></div>`;
            });
        } else {
            html += '<h3 style="margin-bottom: 15px;">👥 گزارش حضور گروهی</h3>';
            groups.forEach(g => {
                let p = 0, a = 0, l = 0;
                const gs = students.filter(s => s.groupId === g.id), gsi = gs.map(s => s.id);
                attendance.forEach(att => { if (gsi.includes(att.studentId)) { if (att.status === 'present') p++; else if (att.status === 'absent') a++; else if (att.status === 'late') l++; } });
                html += `<div class="list-item" style="flex-direction: column; align-items: stretch; gap: 8px;"><div style="font-weight: bold; font-size: 1.05rem;">${g.symbol} ${g.name} (${gs.length} نفر)</div><div style="display: flex; gap: 5px; flex-wrap: wrap;"><span class="att-report-badge present">حاضر: ${p}</span><span class="att-report-badge absent">غایب: ${a}</span><span class="att-report-badge late">تأخیر: ${l}</span></div></div>`;
            });
        }
        container.innerHTML = html;
    } catch (e) { console.error(e); container.innerHTML = '<p style="color:red; text-align:center;">خطا در تولید گزارش.</p>'; }
}

async function showAttendanceDetails(studentId, statusType) {
    try {
        const student = window.allStudentsData.find(s => s.id === studentId);
        if (!student) return;
        const sessions = await getAllData('sessions'), attendance = await getAllData('attendance');
        const records = attendance.filter(a => a.studentId === studentId && a.status === statusType);
        const labels = { present: 'حاضر', absent: 'غایب', late: 'تأخیر' };
        const icons = { present: '🟢', absent: '🔴', late: '🟡' };
        const label = labels[statusType] || 'نامشخص', icon = icons[statusType] || '';
        document.getElementById('attendance-details-title').textContent = `${icon} تاریخ‌های ${label} - ${student.firstName} ${student.lastName}`;
        const content = document.getElementById('attendance-details-content');
        if (records.length === 0) content.innerHTML = `<p style="color:#64748b; text-align:center; padding: 20px;">هیچ تاریخ ${label} برای این دانش‌آموز ثبت نشده است.</p>`;
        else {
            const dates = records.map(r => { const s = sessions.find(x => x.id === r.sessionId); return s ? s.date : 'تاریخ نامشخص'; }).filter(d => d !== 'تاریخ نامشخص');
            dates.sort((a, b) => b.localeCompare(a));
            let html = `<p style="text-align:center; font-weight:bold; margin-bottom: 15px;">تعداد: ${dates.length} روز</p><div class="list-group">`;
            dates.forEach(d => { html += `<div class="list-item"><span>📅 ${d}</span><span class="att-report-badge ${statusType}">${label}</span></div>`; });
            html += '</div>';
            content.innerHTML = html;
        }
        document.getElementById('attendance-details-modal').classList.add('show');
    } catch (e) { console.error(e); showToast('خطا در بارگذاری جزئیات.', 'error'); }
}

function closeAttendanceDetails() { document.getElementById('attendance-details-modal').classList.remove('show'); }

// ==========================================
// 16. کارنامه
// ==========================================
async function openReportCard(studentId) {
    try {
        const student = window.allStudentsData.find(s => s.id === studentId);
        if (!student) { showToast('دانش‌آموز یافت نشد.', 'error'); return; }
        const classData = await getDataById('classProfile', 1) || { name: 'کلاس من', teacherName: 'معلم' };
        const groups = await getAllData('groups'), subjects = await getAllData('subjects'), records = await getAllData('records'), sessions = await getAllData('sessions'), attendance = await getAllData('attendance');
        const topStudentBadge = await getDataById('badgesSettings', 'topStudent');
        const group = groups.find(g => g.id === student.groupId);
        const groupName = group ? `${group.symbol} ${group.name}` : 'بدون گروه';
        let pc = 0, ac = 0, lc = 0;
        attendance.forEach(att => { if (att.studentId === studentId) { if (att.status === 'present') pc++; else if (att.status === 'absent') ac++; else if (att.status === 'late') lc++; } });
        const srs = records.filter(rec => rec.students.includes(studentId));
        let ssh = '', tos = 0;
        for (const subject of subjects) {
            const sr = srs.filter(r => r.subjectId === subject.id);
            let st = 0; sr.forEach(r => st += r.finalScore); tos += st;
            if (st > 0) ssh += `<div class="rc-subject-row"><span>📚 ${subject.name}</span><strong>${st} امتیاز</strong></div>`;
        }
        if (ssh === '') ssh = '<p style="color:#64748b; text-align:center; font-size:0.9rem;">هنوز نمره‌ای ثبت نشده است.</p>';
        let bh = '';
        const ass = window.allStudentsData.map(st => { let t = 0; records.forEach(rec => { if (rec.students.includes(st.id)) t += rec.finalScore; }); return { id: st.id, score: t }; });
        const ms = Math.max(...ass.map(s => s.score));
        if (ms > 0 && tos === ms && topStudentBadge) bh += `<div class="arf-badge" style="margin-top: 10px;">${topStudentBadge.icon} <strong>${topStudentBadge.title}</strong> - ${topStudentBadge.motto}</div>`;
        
        const html = `<div id="report-card-text-to-copy" style="background: white; padding: 10px; border-radius: 8px;"><div class="rc-header"><h2>🏫 ${classData.name}</h2><p>کارنامه دانش‌آموز</p></div><div class="rc-student-info"><div><strong>👤 ${student.firstName} ${student.lastName}</strong><div style="font-size: 0.9rem; margin-top: 5px;">گروه: <span class="group-label">${groupName}</span></div></div><div style="text-align: left;"><div style="font-size: 0.9rem;">آموزگار: ${classData.teacherName}</div><div style="font-size: 0.9rem;">پایه: ${classData.grade || '-'}</div></div></div><div class="rc-section-title">📅 وضعیت حضور و غیاب (از ${sessions.length} روز آموزشی)</div><div class="rc-stats-row"><div class="rc-stat-box present">حاضر <span>${pc}</span></div><div class="rc-stat-box absent">غایب <span>${ac}</span></div><div class="rc-stat-box late">تأخیر <span>${lc}</span></div></div><div class="rc-section-title">📊 کارنامه دروس</div>${ssh}<div class="rc-subject-row" style="margin-top: 10px; background: var(--primary-light); padding: 10px; border-radius: 8px; border-bottom: none;"><strong>مجموع کل امتیازات:</strong><strong style="color: var(--primary); font-size: 1.1rem;">${tos} امتیاز</strong></div>${bh}</div>`;
        
        document.getElementById('report-card-content').innerHTML = html;
        document.getElementById('report-card-modal').classList.add('show');
    } catch (e) { console.error(e); showToast('خطا در تولید کارنامه.', 'error'); }
}

function closeReportCard() { document.getElementById('report-card-modal').classList.remove('show'); }

async function copyReportText() {
    const textToCopy = document.getElementById('report-card-text-to-copy');
    if (!textToCopy) return;
    
    const text = textToCopy.innerText;
    
    try {
        await navigator.clipboard.writeText(text);
        showToast('متن کارنامه کپی شد!', 'success');
    } catch (err) {
        const range = document.createRange();
        range.selectNode(textToCopy);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        try {
            document.execCommand('copy');
            showToast('متن کارنامه کپی شد!', 'success');
        } catch (e) {
            showToast('مرورگر شما از کپی خودکار پشتیبانی نمی‌کند.', 'error');
        }
        window.getSelection().removeAllRanges();
    }
}

// ==========================================
// 17. پشتیبان‌گیری و CSV
// ==========================================
async function exportData() {
    try {
        const data = await exportAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); 
        a.href = url; 
        a.download = `kosha_backup_${new Date().toISOString().slice(0,10)}.json`; 
        a.click();
        URL.revokeObjectURL(url);
        
        // ثبت تاریخ آخرین پشتیبان‌گیری
        localStorage.setItem('kosha-last-backup', Date.now());
        checkBackupReminder(); // آپدیت UI
        
        showToast('فایل پشتیبان دانلود شد. آن را در جای امنی نگه دارید.', 'info');
    } catch (e) { 
        showToast('خطا در تولید فایل پشتیبان!', 'error'); 
    }
}

async function importData(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try { const data = JSON.parse(e.target.result); await importAllData(data); showToast('بازیابی شد!', 'success'); loadAllData(); }
        catch (err) { showToast('فایل نامعتبر! تغییرات لغو شد.', 'error'); }
    };
    reader.readAsText(file);
}

async function exportCSV() {
    try {
        let csvContent = "", fileName = "";
        if (currentReportType === 'scores') {
            const students = await getAllData('students'), records = await getAllData('records');
            csvContent = "ردیف,نام,نام خانوادگی,تعداد ارزشیابی,مجموع امتیاز\n";
            let ss = students.map(st => { let t = 0, c = 0; records.forEach(rec => { if (rec.students.includes(st.id)) { t += rec.finalScore; c++; } }); return { ...st, totalScore: t, count: c }; });
            ss.sort((a, b) => b.totalScore - a.totalScore);
            ss.forEach((st, i) => { csvContent += `${i + 1},${st.firstName},${st.lastName},${st.count},${st.totalScore}\n`; });
            fileName = `kosha_scores_${new Date().toISOString().slice(0,10)}.csv`;
        } else if (currentReportType === 'attendance') {
            const students = await getAllData('students'), attendance = await getAllData('attendance');
            csvContent = "ردیف,نام,نام خانوادگی,تعداد حاضر,تعداد غایب,تعداد تأخیر\n";
            students.forEach((st, i) => {
                let p = 0, a = 0, l = 0;
                attendance.forEach(att => { if (att.studentId === st.id) { if (att.status === 'present') p++; else if (att.status === 'absent') a++; else if (att.status === 'late') l++; } });
                csvContent += `${i + 1},${st.firstName},${st.lastName},${p},${a},${l}\n`;
            });
            fileName = `kosha_attendance_${new Date().toISOString().slice(0,10)}.csv`;
        } else if (currentReportType === 'records') {
            const records = await getAllData('records'), subjects = await getAllData('subjects');
            csvContent = "ردیف,عنوان,درس,آیتم,تاریخ,امتیاز,ارفاق\n";
            records.sort((a, b) => b.date.localeCompare(a.date));
            records.forEach((rec, i) => {
                const s = subjects.find(x => x.id === rec.subjectId); const sn = s ? s.name : 'نامشخص';
                csvContent += `${i + 1},"${rec.title}","${sn}","${rec.itemName}","${rec.date}",${rec.finalScore},"${rec.arf ? 'دارد' : 'ندارد'}"\n`;
            });
            fileName = `kosha_records_${new Date().toISOString().slice(0,10)}.csv`;
        }
        const BOM = "\uFEFF";
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
        URL.revokeObjectURL(url);
        showToast('فایل اکسل دانلود شد!', 'success');
    } catch (e) { console.error(e); showToast('خطا در تولید فایل اکسل.', 'error'); }
}

// ==========================================
// 18. Service Worker
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((reg) => {
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) showUpdateToast(newWorker);
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