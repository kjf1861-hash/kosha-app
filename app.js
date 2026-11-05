// ==========================================
// ساختار ثابت درخت ارزشیابی و داده‌ها
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
    // --- 1. راه‌اندازی فرم درس‌ها ---
    const subjectForm = document.getElementById('subject-form');
    if (subjectForm) {
        subjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('subjectName').value;
            try {
                await saveData('subjects', { name });
                alert('درس ثبت شد!');
                subjectForm.reset();
                loadAllData();
            } catch (e) { alert('خطا در ذخیره!'); }
        });
    }

    // --- 2. راه‌اندازی فرم گروه‌ها ---
    const groupForm = document.getElementById('group-form');
    if (groupForm) {
        groupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                name: document.getElementById('groupName').value,
                symbol: document.getElementById('groupSymbol').value,
                motto: document.getElementById('groupMotto').value
            };
            try {
                await saveData('groups', data);
                alert('گروه ثبت شد!');
                groupForm.reset();
                loadAllData();
            } catch (e) { alert('خطا در ذخیره!'); }
        });
    }

    // --- 3. راه‌اندازی فرم دانش‌آموزان ---
    const studentForm = document.getElementById('student-form');
    if (studentForm) {
        studentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                firstName: document.getElementById('studentFirstName').value,
                lastName: document.getElementById('studentLastName').value,
                groupId: parseInt(document.getElementById('studentGroup').value)
            };
            try {
                await saveData('students', data);
                alert('دانش‌آموز ثبت شد!');
                studentForm.reset();
                loadAllData();
            } catch (e) { alert('خطا در ذخیره!'); }
        });
    }

    // --- 4. راه‌اندازی آیتم‌های ارزشیابی ---
    const itemSelect = document.getElementById('recordItem');
    if (itemSelect) {
        assessmentTree.forEach((item, index) => {
            const opt = document.createElement('option');
            opt.value = index;
            opt.textContent = item.value;
            itemSelect.appendChild(opt);
        });
        itemSelect.addEventListener('change', (e) => renderScoreInput(assessmentTree[e.target.value]));
    }

    // --- 5. راه‌اندازی فرم ثبت ارزشیابی ---
    const recordForm = document.getElementById('record-form');
    if (recordForm) {
        recordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showPreview();
        });
    }

    // بارگذاری اولیه داده‌ها
    loadAllData();
}

// ==========================================
// بارگذاری همه داده‌ها و رندر لیست‌ها
// ==========================================
async function loadAllData() {
    // 1. دروس
    try {
        const subjects = await getAllData('subjects');
        const subjectsList = document.getElementById('subjects-list');
        const recordSubjectSelect = document.getElementById('recordSubject');
        
        if (subjectsList) {
            subjectsList.innerHTML = subjects.length === 0 ? '<p style="color: #64748b; text-align: center;">لیست خالی است.</p>' : '';
            subjects.forEach(sub => {
                subjectsList.innerHTML += `<div class="list-item"><strong>${sub.name}</strong></div>`;
            });
        }
        
        if (recordSubjectSelect) {
            recordSubjectSelect.innerHTML = '<option value="" disabled selected>لطفاً یک درس انتخاب کنید...</option>';
            subjects.forEach(sub => {
                recordSubjectSelect.innerHTML += `<option value="${sub.id}">${sub.name}</option>`;
            });
        }
    } catch (e) { console.log('خطا در لود دروس'); }

    // 2. گروه‌ها
    let groups = [];
    try {
        groups = await getAllData('groups');
        const groupsList = document.getElementById('groups-list');
        const studentGroupSelect = document.getElementById('studentGroup');

        if (groupsList) {
            groupsList.innerHTML = groups.length === 0 ? '<p style="color: #64748b; text-align: center;">لیست خالی است.</p>' : '';
            groups.forEach(g => {
                groupsList.innerHTML += `<div class="list-item"><span>${g.symbol} <strong>${g.name}</strong></span></div>`;
            });
        }

        if (studentGroupSelect) {
            studentGroupSelect.innerHTML = '<option value="" disabled selected>لطفاً یک گروه انتخاب کنید...</option>';
            groups.forEach(g => {
                studentGroupSelect.innerHTML += `<option value="${g.id}">${g.symbol} ${g.name}</option>`;
            });
        }
    } catch (e) { console.log('خطا در لود گروه‌ها'); }

    // 3. دانش‌آموزان
    try {
        const students = await getAllData('students');
        const studentsList = document.getElementById('students-list');
        const checkboxContainer = document.getElementById('students-checkbox-container');

        if (studentsList) {
            studentsList.innerHTML = students.length === 0 ? '<p style="color: #64748b; text-align: center;">لیست خالی است.</p>' : '';
            students.forEach(st => {
                const group = groups.find(g => g.id === st.groupId);
                const groupName = group ? `${group.symbol} ${group.name}` : 'بدون گروه';
                studentsList.innerHTML += `<div class="list-item"><span><strong>${st.firstName} ${st.lastName}</strong></span><span class="rank-badge">${groupName}</span></div>`;
            });
        }

        if (checkboxContainer) {
            checkboxContainer.innerHTML = students.length === 0 ? '<p style="color: #64748b; text-align: center;">لیست خالی است.</p>' : '';
            students.forEach(st => {
                checkboxContainer.innerHTML += `
                    <label class="student-checkbox-item">
                        <input type="checkbox" class="student-checkbox" value="${st.id}">
                        <span>${st.firstName} ${st.lastName}</span>
                    </label>
                `;
            });
        }
    } catch (e) { console.log('خطا در لود دانش‌آموزان'); }
}

// ==========================================
// توابع کمکی (بدون تغییر از گام قبل)
// ==========================================
function renderScoreInput(item) {
    const section = document.getElementById('dynamic-score-section');
    const container = document.getElementById('score-input-container');
    section.style.display = 'block';
    container.innerHTML = '';

    if (item.type === 'level1' || item.type === 'level2') {
        const select = document.createElement('select');
        select.className = 'form-control'; select.id = 'dynamicLevelInput'; select.required = true;
        select.innerHTML = '<option value="" disabled selected>انتخاب سطح...</option>';
        for (const [level, score] of Object.entries(item.levels)) {
            select.innerHTML += `<option value="${score}">${level} (${score} امتیاز)</option>`;
        }
        container.appendChild(select);
    } else if (item.type === 'count') {
        const input = document.createElement('input');
        input.type = 'number'; input.className = 'form-control'; input.id = 'dynamicCountInput'; input.min = '1'; input.placeholder = 'تعداد را وارد کنید'; input.required = true;
        container.appendChild(input);
    } else if (item.type === 'fixed') {
        container.innerHTML = `<p style="font-weight: bold; color: #4A90E2;">${item.score} امتیاز (خودکار)</p>`;
    } else if (item.type === 'free') {
        const input = document.createElement('input');
        input.type = 'number'; input.className = 'form-control'; input.id = 'dynamicFreeInput'; input.min = '0'; input.placeholder = 'عدد امتیاز را وارد کنید'; input.required = true;
        container.appendChild(input);
    } else if (item.type === 'quran') {
        const select = document.createElement('select');
        select.className = 'form-control'; select.id = 'quranSurahSelect';
        select.innerHTML = '<option value="" disabled selected>انتخاب سوره...</option>';
        for (const [surah, ayat] of Object.entries(quranSurahs)) {
            select.innerHTML += `<option value="${ayat}">${surah} (${ayat} آیه)</option>`;
        }
        const input = document.createElement('input');
        input.type = 'number'; input.className = 'form-control'; input.id = 'quranAyatInput'; input.placeholder = 'تعداد آیات حفظ‌شده'; input.min = '1';
        container.appendChild(select);
        container.appendChild(document.createElement('br'));
        container.appendChild(input);
    }
}

function toggleAllStudents(checked) {
    document.querySelectorAll('.student-checkbox').forEach(cb => cb.checked = checked);
}

function showPreview() {
    const selectedItem = assessmentTree[document.getElementById('recordItem').value];
    let finalScore = 0; let scoreDetails = '';
    
    if (selectedItem.type === 'level1' || selectedItem.type === 'level2') {
        finalScore = parseInt(document.getElementById('dynamicLevelInput').value) || 0;
        scoreDetails = `امتیاز سطح: ${finalScore}`;
    } else if (selectedItem.type === 'count') {
        const count = parseInt(document.getElementById('dynamicCountInput').value) || 0;
        finalScore = count * selectedItem.factor;
        scoreDetails = `${count} × ${selectedItem.factor} = ${finalScore}`;
    } else if (selectedItem.type === 'fixed') {
        finalScore = selectedItem.score; scoreDetails = `امتیاز ثابت: ${finalScore}`;
    } else if (selectedItem.type === 'free') {
        finalScore = parseInt(document.getElementById('dynamicFreeInput').value) || 0;
        scoreDetails = `امتیاز دستی: ${finalScore}`;
    } else if (selectedItem.type === 'quran') {
        const ayat = parseInt(document.getElementById('quranAyatInput').value) || 0;
        const surahTotal = parseInt(document.getElementById('quranSurahSelect').value) || 0;
        const threshold = Math.ceil((surahTotal / 2) + 1);
        if (ayat >= threshold && surahTotal > 0) {
            finalScore = ayat * 5; scoreDetails = `حد نصاب (${threshold}) رعایت شد. امتیاز: ${ayat} × 5 = ${finalScore}`;
        } else {
            finalScore = 0; scoreDetails = `حد نصاب (${threshold}) رعایت نشد. امتیاز: 0`;
        }
    }

    const studentCheckboxes = document.querySelectorAll('.student-checkbox:checked');
    document.getElementById('preview-content').innerHTML = `
        <div class="preview-row"><strong>درس:</strong> <span>${document.getElementById('recordSubject').options[document.getElementById('recordSubject').selectedIndex].text}</span></div>
        <div class="preview-row"><strong>آیتم:</strong> <span>${selectedItem.value}</span></div>
        <div class="preview-row"><strong>عنوان:</strong> <span>${document.getElementById('recordTitle').value}</span></div>
        <div class="preview-row"><strong>دانش‌آموزان:</strong> <span>${studentCheckboxes.length} نفر</span></div>
        <div class="preview-row" style="border-bottom: none; margin-top: 10px; background: #eef2ff; padding: 10px; border-radius: 8px;">
            <strong>امتیاز نهایی هر نفر:</strong> <span style="font-size: 1.2rem; color: #4A90E2;">${finalScore}</span>
        </div>
    `;
    
    window.tempRecordData = {
        subjectId: parseInt(document.getElementById('recordSubject').value),
        itemName: selectedItem.value,
        title: document.getElementById('recordTitle').value,
        date: document.getElementById('recordDate').value,
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
        alert('اطلاعات با موفقیت ذخیره شد!');
        closePreviewModal();
        document.getElementById('record-form').reset();
        document.getElementById('dynamic-score-section').style.display = 'none';
    } catch (error) {
        alert('خطا در ذخیره!');
        closePreviewModal();
    }
}

// ==========================================
// راه‌اندازی Service Worker
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
    toast.innerHTML = `<span>🚀 نسخه جدید در دسترس است!</span><button class="toast-btn" id="update-btn">به‌روزرسانی</button>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    document.getElementById('update-btn').addEventListener('click', () => {
        if (newWorker) newWorker.postMessage({ action: 'skipWaiting' });
        setTimeout(() => window.location.reload(), 500);
    });
                                }
