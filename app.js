// ==========================================
// 1. متغیرهای سراسری
// ==========================================
window.allStudentsData = [];
window.allGroupsData = [];
window.allSubjectsData = [];
window.allRecordsData = [];
window.allSessionsData = [];
window.allAttendanceData = [];
window.allWeeklyScheduleData = [];
let assessmentItems = [];

let currentStudentView = 'flat';
let currentPage = { students: 1, records: 1, reports: 1 };
const itemsPerPage = 10;

const quranSurahs = {
    "ناس": 6, "فلق": 5, "توحید": 4, "مسد": 5, "نصر": 3, "کافرون": 6, "کوثر": 3, "ماعون": 7,
    "قریش": 4, "فیل": 5, "همزه": 9, "عصر": 3, "تکاثر": 8, "قارعه": 11, "عاديات": 11, "زلزال": 8,
    "بینه": 8, "قدر": 5, "علق": 19, "تین": 8, "شرح": 8, "ضحی": 11, "لیل": 21, "شمس": 15,
    "بلد": 20, "فجر": 30, "غاشیه": 26, "اعلی": 19, "طارق": 17, "بروج": 22, "انشقاق": 25,
    "مطففین": 36, "انفطار": 19, "تکویر": 29, "عبس": 42, "نازعات": 46, "نبأ": 40
};

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
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

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
            if (daysDiff >= 7) setTimeout(() => showToast('یک هفته از آخرین پشتیبان‌گیری گذشته است. لطفاً نسخه پشتیبان بگیرید.', 'info'), 4000);
        }
    } catch (e) { console.log(e); }
}

function applyEmojiRestriction(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.addEventListener('input', function() {
            const val = this.value;
            const emojis = val.match(/\p{Extended_Pictographic}/gu); 
            if (emojis && emojis.length > 0) { this.value = emojis[0]; } else { this.value = ''; }
        });
    }
}

function initApp() {
    applyEmojiRestriction('classSymbol');
    applyEmojiRestriction('lessonSymbol');
    applyEmojiRestriction('groupSymbol');
    initDateDropdowns();
    initSessionDateDropdowns();
    
    try {
        if(document.getElementById('class-form')) document.getElementById('class-form').addEventListener('submit', saveClassProfile);
        if(document.getElementById('student-form')) document.getElementById('student-form').addEventListener('submit', saveStudent);
        if(document.getElementById('lesson-form')) document.getElementById('lesson-form').addEventListener('submit', saveLesson);
        if(document.getElementById('group-form')) document.getElementById('group-form').addEventListener('submit', saveGroup);
        if(document.getElementById('scheduleDaySelect')) document.getElementById('scheduleDaySelect').addEventListener('change', renderScheduleForDay);
        if(document.getElementById('sessionDayOfWeek')) document.getElementById('sessionDayOfWeek').addEventListener('change', checkScheduleExists);
        if(document.getElementById('recordItem')) {
            document.getElementById('recordItem').addEventListener('change', (e) => {
                if (e.target.value !== "") {
                    const item = window.allAssessmentItems.find(i => i.id == e.target.value);
                    if(item) renderScoreInput(item);
                } else {
                    document.getElementById('dynamic-score-section').style.display = 'none';
                }
            });
        }
        if(document.getElementById('item-manager-form')) {
            document.getElementById('item-manager-form').addEventListener('submit', saveItem);
        }
        if(document.getElementById('itemType')) {
            document.getElementById('itemType').addEventListener('change', toggleItemTypeFields);
        }
        if(document.getElementById('edit-record-form')) {
            document.getElementById('edit-record-form').addEventListener('submit', saveEditedRecord);
        }
    } catch (error) { console.error("خطا در اتصال رویدادها:", error); }
    loadAllData();
    checkBackupReminder();
}

async function loadAllData() {
    try {
        const classData = await getDataById('classProfile', 1);
        if (classData) {
            document.getElementById('className').value = classData.name || '';
            document.getElementById('classSymbol').value = classData.symbol || '';
            document.getElementById('classMotto').value = classData.motto || '';
            document.getElementById('classGrade').value = classData.grade || '';
            document.getElementById('teacherName').value = classData.teacherName || '';
            document.getElementById('schoolName').value = classData.schoolName || '';
            document.getElementById('header-subtitle').textContent = classData.name || 'همیار پرتلاش معلم';
        }
        window.allStudentsData = await getAllData('students');
        window.allGroupsData = await getAllData('groups');
        window.allSubjectsData = await getAllData('subjects');
        window.allRecordsData = await getAllData('records');
        window.allSessionsData = await getAllData('sessions');
        window.allAttendanceData = await getAllData('attendance');
        window.allWeeklyScheduleData = await getAllData('weeklySchedule');
        assessmentItems = await getAllData('assessmentItems');
        window.allAssessmentItems = assessmentItems;
        if (typeof renderClassData === 'function') renderClassData();
        if (typeof renderLessonData === 'function') renderLessonData();
        if (typeof renderGroupData === 'function') renderGroupData();
        if (typeof renderSessionData === 'function') renderSessionData();
        if (typeof renderScoreData === 'function') renderScoreData();
    } catch (e) { console.log('خطا در بارگذاری داده‌ها:', e); }
}

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

function initSessionDateDropdowns() {
    const daySelect = document.getElementById('sessDateDay');
    const monthSelect = document.getElementById('sessDateMonth');
    const yearSelect = document.getElementById('sessDateYear');
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

function openItemManagementModal() {
    document.getElementById('item-management-modal').classList.add('show');
    renderItemsList();
    resetItemForm();
}

function closeItemManagementModal() {
    document.getElementById('item-management-modal').classList.remove('show');
    loadAllData();
}

function renderItemsList() {
    const container = document.getElementById('items-list-container');
    if (!container) return;
    if (assessmentItems.length === 0) { container.innerHTML = '<p style="text-align:center;">هیچ آیتمی یافت نشد.</p>'; return; }
    container.innerHTML = '';
    assessmentItems.forEach(item => {
        let typeName = item.type === 'level' ? 'سطح محور' : item.type === 'count' ? 'شمارشی' : item.type === 'free' ? 'آزاد' : 'ویژه (قرآن)';
        container.innerHTML += `
            <div class="item-management-row">
                <div><strong>${item.title}</strong> <span style="font-size:0.8rem; color:var(--text-muted);">(${typeName})</span></div>
                <div style="display:flex; gap:5px;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="editItem(${item.id})" ${item.type === 'quran' ? 'disabled title="سیستمی"' : ''}>✏️</button>
                    <button type="button" class="btn btn-danger btn-sm" onclick="deleteCustomItem(${item.id})" ${item.type === 'quran' ? 'disabled title="سیستمی"' : ''}>🗑️</button>
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
        addLevelRow(); addLevelRow(); 
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
    if (!item) { showToast('آیتم یافت نشد.', 'error'); return; }
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
    const title = document.getElementById('itemTitle').value.trim();
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
        const freshItems = await getAllData('assessmentItems');
        window.allAssessmentItems = freshItems;
        assessmentItems = freshItems;
        renderItemsList();
        resetItemForm();
        const itemSelect = document.getElementById('recordItem');
        if (itemSelect) itemSelect.innerHTML = '<option value="" disabled selected>روش سنجشی را انتخاب کنید!</option>' + freshItems.map(i => `<option value="${i.id}">${i.title}</option>`).join('');
    } catch (error) { console.error(error); showToast('خطا در ذخیره آیتم!', 'error'); }
}

async function deleteCustomItem(id) {
    if(!confirm('آیا از حذف این آیتم مطمئن هستید؟')) return;
    try {
        await deleteData('assessmentItems', id);
        showToast('آیتم حذف شد.', 'success');
        const freshItems = await getAllData('assessmentItems');
        window.allAssessmentItems = freshItems;
        assessmentItems = freshItems;
        renderItemsList();
        const itemSelect = document.getElementById('recordItem');
        if (itemSelect) itemSelect.innerHTML = '<option value="" disabled selected>روش سنجشی را انتخاب کنید!</option>' + freshItems.map(i => `<option value="${i.id}">${i.title}</option>`).join('');
    } catch (e) { console.error(e); showToast('خطا در حذف آیتم!', 'error'); }
}

async function exportData() {
    try {
        const data = await exportAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `kosha_backup_${new Date().toISOString().slice(0,10)}.json`; a.click();
        URL.revokeObjectURL(url);
        localStorage.setItem('kosha-last-backup', Date.now());
        checkBackupReminder(); 
        showToast('فایل پشتیبان دانلود شد. آن را در جای امنی نگه دارید.', 'info');
    } catch (e) { showToast('خطا در تولید فایل پشتیبان!', 'error'); }
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

function changePage(section, direction) {
    if (section === 'students') { currentPage.students += direction; if(typeof renderClassData === 'function') renderClassData(); }
    else if (section === 'records') { currentPage.records += direction; if(typeof loadAssessmentRecords === 'function') loadAssessmentRecords(); }
}

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