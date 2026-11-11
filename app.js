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
window.activeAcademicYear = '1405-1406'; 

window.scheduleActiveDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه'];
window.schedulePeriodsCount = 5;

let currentStudentView = 'flat';
let currentPage = { students: 1, records: 1, reports: 1 };
const itemsPerPage = 40;

function toPersianNumber(num) {
    if (num === undefined || num === null || num === '') return '';
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().replace(/\d/g, x => persianDigits[x]);
}

function validateNationalId(nationalId) {
    if (!/^\d{10}$/.test(nationalId)) return false;
    if (/^(\d)\1{9}$/.test(nationalId)) return false;

    let check = parseInt(nationalId[9]);
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(nationalId[i]) * (10 - i);
    }
    let remainder = sum % 11;
    if ((remainder < 2 && check === remainder) || (remainder >= 2 && check === 11 - remainder)) {
        return true;
    }
    return false;
}

function generateStudentPassword(nationalId) {
    if (!nationalId || nationalId.length !== 10) return '0000';
    
    const part1 = nationalId.substring(0, 5);
    const part2 = nationalId.substring(5, 10);
    
    let sum1 = 0;
    for (let i = 0; i < part1.length; i++) sum1 += parseInt(part1[i]);
    
    let sum2 = 0;
    for (let i = 0; i < part2.length; i++) sum2 += parseInt(part2[i]);
    
    const hash = Math.pow((sum1 * 7) + (sum2 * 3), 2);
    const finalPass = (hash % 9000) + 1000;
    
    return finalPass.toString();
}

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
            if (statusEl) statusEl.innerHTML = `آخرین پشتیبان‌گیری: <strong>${toPersianNumber(daysDiff)} روز پیش</strong>`;
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

function initAppEvents() {
    const classForm = document.getElementById('class-form');
    if (classForm) classForm.addEventListener('submit', saveClassProfile);
    
    const studentForm = document.getElementById('student-form');
    if (studentForm) studentForm.addEventListener('submit', saveStudent);
    
    const lessonForm = document.getElementById('lesson-form');
    if (lessonForm) lessonForm.addEventListener('submit', saveLesson);
    
    const groupForm = document.getElementById('group-form');
    if (groupForm && !groupForm.dataset.listenerAttached) {
        groupForm.addEventListener('submit', saveGroup);
        groupForm.dataset.listenerAttached = 'true';
    }
    
    const itemManagerForm = document.getElementById('item-manager-form');
    if (itemManagerForm) itemManagerForm.addEventListener('submit', saveItem);
    
    const itemType = document.getElementById('itemType');
    if (itemType) itemType.addEventListener('change', toggleItemTypeFields);
    
    if (typeof initScoreEvents === 'function') initScoreEvents();
    if (typeof initGroupEvents === 'function') initGroupEvents();
    if (typeof initLessonEvents === 'function') initLessonEvents();
    if (typeof initSessionEvents === 'function') initSessionEvents();
    
    const editRecordForm = document.getElementById('edit-record-form');
    if (editRecordForm) editRecordForm.addEventListener('submit', saveEditedRecord);
    
    const editGroupForm = document.getElementById('edit-group-form');
    if (editGroupForm) editGroupForm.addEventListener('submit', saveEditedGroup);
    
    const editLessonForm = document.getElementById('edit-lesson-form');
    if (editLessonForm) editLessonForm.addEventListener('submit', saveEditedLesson);
    
    const editStudentForm = document.getElementById('edit-student-form');
    if (editStudentForm) editStudentForm.addEventListener('submit', saveEditedStudent);
}

async function initApp() {
    applyEmojiRestriction('classSymbol');
    applyEmojiRestriction('lessonSymbol');
    applyEmojiRestriction('groupSymbol');
    
    try {
        initAppEvents();
    } catch (error) { console.error("خطا در اتصال رویدادها:", error); }
    
    await loadAllData();
    checkBackupReminder();
    
    if (typeof loadExamsData === 'function') await loadExamsData();
    if (typeof renderExamsData === 'function') renderExamsData();
}

async function loadAllData() {
    try {
        const classData = await getDataById('classProfile', 1);
        if (classData) {
            const classNameEl = document.getElementById('className');
            if(classNameEl) classNameEl.value = classData.name || '';
            const classSymbolEl = document.getElementById('classSymbol');
            if(classSymbolEl) classSymbolEl.value = classData.symbol || '';
            const classMottoEl = document.getElementById('classMotto');
            if(classMottoEl) classMottoEl.value = classData.motto || '';
            const classGradeEl = document.getElementById('classGrade');
            if(classGradeEl) classGradeEl.value = classData.grade || '';
            const teacherNameEl = document.getElementById('teacherName');
            if(teacherNameEl) teacherNameEl.value = classData.teacherName || '';
            const schoolNameEl = document.getElementById('schoolName');
            if(schoolNameEl) schoolNameEl.value = classData.schoolName || '';
            
            if (classData.academicYear) {
                window.activeAcademicYear = classData.academicYear;
            } else {
                classData.academicYear = window.activeAcademicYear;
            }

            if (classData.scheduleActiveDays && Array.isArray(classData.scheduleActiveDays)) {
                window.scheduleActiveDays = classData.scheduleActiveDays;
            } else if (classData.scheduleDaysCount) {
                const days = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
                window.scheduleActiveDays = days.slice(0, classData.scheduleDaysCount);
                classData.scheduleActiveDays = window.scheduleActiveDays;
            } else {
                classData.scheduleActiveDays = window.scheduleActiveDays;
            }

            if (classData.schedulePeriodsCount) {
                window.schedulePeriodsCount = parseInt(classData.schedulePeriodsCount);
            } else {
                classData.schedulePeriodsCount = window.schedulePeriodsCount;
            }

            await saveData('classProfile', classData);
            
            const aySelect = document.getElementById('academicYear');
            if (aySelect) aySelect.value = window.activeAcademicYear;
            
            const headerSubtitle = document.getElementById('header-subtitle');
            if (headerSubtitle) headerSubtitle.textContent = classData.name || 'همیار پرتلاش معلم';
        }

        const rawStudents = await getAllData('students');
        const rawGroups = await getAllData('groups');
        const rawSubjects = await getAllData('subjects');
        const rawRecords = await getAllData('records');
        const rawSessions = await getAllData('sessions');
        const rawAttendance = await getAllData('attendance');
        
        let migrationNeeded = false;
        
        for (let r of rawRecords) {
            if (!r.academicYear) { r.academicYear = window.activeAcademicYear; await saveData('records', r); migrationNeeded = true; }
        }
        for (let s of rawSessions) {
            if (!s.academicYear) { s.academicYear = window.activeAcademicYear; await saveData('sessions', s); migrationNeeded = true; }
        }

        window.allStudentsData = rawStudents;
        window.allGroupsData = rawGroups;
        window.allSubjectsData = rawSubjects;
        
        window.allRecordsData = rawRecords.filter(r => r.academicYear === window.activeAcademicYear);
        window.allSessionsData = rawSessions.filter(s => s.academicYear === window.activeAcademicYear);
        
        const validSessionIds = window.allSessionsData.map(s => s.id);
        window.allAttendanceData = rawAttendance.filter(a => validSessionIds.includes(a.sessionId));
        
        window.allWeeklyScheduleData = await getAllData('weeklySchedule');

        assessmentItems = await getAllData('assessmentItems');
        window.allAssessmentItems = assessmentItems;
        
        if (typeof renderDashboardData === 'function') renderDashboardData();
        if (typeof renderStudentsList === 'function') renderStudentsList();
        if (typeof renderLessonData === 'function') renderLessonData();
        if (typeof renderGroupData === 'function') renderGroupData();
        if (typeof renderSessionData === 'function') renderSessionData();
        if (typeof renderScoreData === 'function') renderScoreData();
        
        if (migrationNeeded) showToast('اطلاعات قبلی به سال تحصیلی جدید منتقل شد.', 'info');
        
    } catch (e) { console.log('خطا در بارگذاری داده‌ها:', e); }
}

function jalaliToDateString(jy, jm, jd) {
    return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

// ==========================================
// توابع مدیریت آیتم‌ها
// ==========================================
function openItemManagementModal() {
    const modal = document.getElementById('item-management-modal');
    if (modal) modal.classList.add('show');
    renderItemsList();
    resetItemForm();
}

function closeItemManagementModal() {
    const modal = document.getElementById('item-management-modal');
    if (modal) modal.classList.remove('show');
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
    const form = document.getElementById('item-manager-form');
    if (form) form.reset();
    const editId = document.getElementById('editItemId');
    if (editId) editId.value = '';
    const title = document.getElementById('item-form-title');
    if (title) title.textContent = '➕ افزودن آیتم جدید';
    const levelsContainer = document.getElementById('levels-container');
    if (levelsContainer) levelsContainer.innerHTML = '';
    const placeholder = document.getElementById('itemLevelPlaceholder');
    if (placeholder) placeholder.value = '';
    const typeLevel = document.getElementById('item-type-level');
    if (typeLevel) typeLevel.style.display = 'none';
    const typeCount = document.getElementById('item-type-count');
    if (typeCount) typeCount.style.display = 'none';
    const typeFree = document.getElementById('item-type-free');
    if (typeFree) typeFree.style.display = 'none';
    const itemTitle = document.getElementById('itemTitle');
    if (itemTitle) itemTitle.readOnly = false;
}

function toggleItemTypeFields() {
    const typeEl = document.getElementById('itemType');
    if (!typeEl) return;
    const type = typeEl.value;
    const typeLevel = document.getElementById('item-type-level');
    const typeCount = document.getElementById('item-type-count');
    const typeFree = document.getElementById('item-type-free');
    if (typeLevel) typeLevel.style.display = type === 'level' ? 'block' : 'none';
    if (typeCount) typeCount.style.display = type === 'count' ? 'block' : 'none';
    if (typeFree) typeFree.style.display = type === 'free' ? 'block' : 'none';
    const levelsContainer = document.getElementById('levels-container');
    if (type === 'level' && levelsContainer && levelsContainer.children.length === 0) {
        addLevelRow(); addLevelRow(); 
    }
}

function addLevelRow(name = '', score = '') {
    const container = document.getElementById('levels-container');
    if (!container) return;
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
    const editId = document.getElementById('editItemId');
    if (editId) editId.value = item.id;
    const titleEl = document.getElementById('itemTitle');
    if (titleEl) titleEl.value = item.title;
    const typeEl = document.getElementById('itemType');
    if (typeEl) typeEl.value = item.type;
    const formTitle = document.getElementById('item-form-title');
    if (formTitle) formTitle.textContent = '✏️ ویرایش آیتم';
    const typeLevel = document.getElementById('item-type-level');
    if (typeLevel) typeLevel.style.display = 'none';
    const typeCount = document.getElementById('item-type-count');
    if (typeCount) typeCount.style.display = 'none';
    const typeFree = document.getElementById('item-type-free');
    if (typeFree) typeFree.style.display = 'none';
    if (item.type === 'level') {
        if (typeLevel) typeLevel.style.display = 'block';
        const placeholder = document.getElementById('itemLevelPlaceholder');
        if (placeholder) placeholder.value = item.placeholder || 'انتخاب سطح عملکرد:';
        const container = document.getElementById('levels-container');
        if (container) {
            container.innerHTML = '';
            item.levels.forEach(l => addLevelRow(l.name, l.score));
        }
    } else if (item.type === 'count') {
        if (typeCount) typeCount.style.display = 'block';
        const unitScore = document.getElementById('itemUnitScore');
        if (unitScore) unitScore.value = item.unitScore;
        const placeholder = document.getElementById('itemCountPlaceholder');
        if (placeholder) placeholder.value = item.placeholder || '';
    } else if (item.type === 'free') {
        if (typeFree) typeFree.style.display = 'block';
        const placeholder = document.getElementById('itemFreePlaceholder');
        if (placeholder) placeholder.value = item.placeholder || '';
    }
}

async function saveItem(e) {
    if (e) e.preventDefault();
    
    const idEl = document.getElementById('editItemId');
    const titleEl = document.getElementById('itemTitle');
    const typeEl = document.getElementById('itemType');
    if (!idEl || !titleEl || !typeEl) return;
    
    const id = idEl.value;
    const title = titleEl.value.trim();
    const type = typeEl.value;
    
    if (!title) { showToast('عنوان آیتم را وارد کنید.', 'error'); return; }
    if (!type) { showToast('نوع آیتم را انتخاب کنید.', 'error'); return; }
    
    if (!id && assessmentItems.length >= 16) {
        showToast('حداکثر تعداد مجاز آیتم ارزشیابی (۱۶ آیتم) تکمیل شده است.', 'error');
        return;
    }
    
    // *** پیدا کردن آیتم قدیمی برای بررسی تغییر نام ***
    const oldItem = id ? assessmentItems.find(i => i.id === parseInt(id)) : null;
    const oldTitle = oldItem ? oldItem.title : null;

    let itemData = { title, type };
    if (id) {
        itemData.id = parseInt(id);
    } else {
        itemData.id = Date.now();
    }
    
    if (type === 'level') {
        const placeholder = document.getElementById('itemLevelPlaceholder');
        itemData.placeholder = (placeholder && placeholder.value) || 'انتخاب سطح عملکرد:';
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
        const unitScore = document.getElementById('itemUnitScore');
        const placeholder = document.getElementById('itemCountPlaceholder');
        itemData.unitScore = parseInt(unitScore ? unitScore.value : 10);
        itemData.placeholder = placeholder ? placeholder.value : '';
    } else if (type === 'free') {
        const placeholder = document.getElementById('itemFreePlaceholder');
        itemData.placeholder = placeholder ? placeholder.value : '';
    }
    
    try {
        await saveData('assessmentItems', itemData);
        
        // *** همگام‌سازی: اگر نام آیتم تغییر کرده باشد، رکوردهای قدیمی را به‌روزرسانی می‌کنیم ***
        if (oldTitle && oldTitle !== title) {
            const allRecords = await getAllData('records');
            let updatedCount = 0;
            for (let rec of allRecords) {
                if (rec.itemName === oldTitle) {
                    rec.itemName = title;
                    await saveData('records', rec);
                    updatedCount++;
                }
            }
            if (updatedCount > 0) {
                showToast(`نام آیتم در ${toPersianNumber(updatedCount)} رکورد قبلی نیز به‌روزرسانی شد.`, 'info');
            }
        }

        showToast('آیتم با موفقیت ذخیره شد!', 'success');
        
        const freshItems = await getAllData('assessmentItems');
        window.allAssessmentItems = freshItems;
        assessmentItems = freshItems;
        
        renderItemsList();
        resetItemForm();
        
        // به‌روزرسانی هر دو select
        const itemSelect = document.getElementById('recordItem');
        if (itemSelect) {
            itemSelect.innerHTML = '<option value="" disabled selected>روش سنجشی را انتخاب کنید!</option>' + freshItems.map(i => `<option value="${i.id}">${i.title}</option>`).join('');
        }
        const editItemSelect = document.getElementById('editRecordItem');
        if (editItemSelect) {
            editItemSelect.innerHTML = '<option value="" disabled selected>انتخاب کنید...</option>' + freshItems.map(i => `<option value="${i.id}">${i.title}</option>`).join('');
        }

        // اگر آیتم در حال ویرایش بود و نامش عوض شد، باید لیست سوابق هم رفرش شود
        if (oldTitle && oldTitle !== title) {
            await loadAllData();
        }

    } catch (error) { 
        console.error(error); 
        showToast('خطا در ذخیره آیتم!', 'error'); 
    }
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
        const editItemSelect = document.getElementById('editRecordItem');
        if (editItemSelect) editItemSelect.innerHTML = '<option value="" disabled selected>انتخاب کنید...</option>' + freshItems.map(i => `<option value="${i.id}">${i.title}</option>`).join('');
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
    const file = event.target.files[0]; 
    if (!file) return;
    
    const isConfirmed = confirm('⚠️ هشدار مهم:\n\nبا بازیابی این فایل، تمام اطلاعات فعلی شما (از جمله تغییرات و آیتم‌های جدید) پاک شده و با اطلاعات داخل فایل بکاپ جایگزین می‌شود.\n\nآیا مطمئن هستید؟');
    
    if (!isConfirmed) {
        event.target.value = ''; 
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try { 
            const data = JSON.parse(e.target.result); 
            await importAllData(data); 
            
            showToast('اطلاعات با موفقیت بازیابی شد! در حال بارگذاری مجدد...', 'success'); 
            
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        }
        catch (err) { 
            console.error(err);
            showToast('فایل نامعتبر! تغییرات لغو شد.', 'error'); 
        }
        event.target.value = ''; 
    };
    reader.readAsText(file);
}

function changePage(section, direction) {
    if (section === 'students') { currentPage.students += direction; if(typeof renderStudentsList === 'function') renderStudentsList(); }
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