/**
 * فایل app.js — مغز متفکر اپلیکیشن کوشا
 * شامل منطق ۶ حالت امتیازدهی، CRUD کامل، گزارشات و پشتیبان‌گیری
 */

// ==========================================
// 1. ساختار ثابت درخت ارزشیابی (با اصلاح آزمون مداد و کاغذی)
// ==========================================
const assessmentTree = [
    { value: "پرسش و پاسخ", type: "level1", levels: { "خیلی خوب": 25, "خوب": 16, "قابل قبول": 9, "نیازمند تلاش": 0 } },
    { value: "حفظ و قرائت", type: "level1", levels: { "خیلی خوب": 25, "خوب": 16, "قابل قبول": 9, "نیازمند تلاش": 0 } },
    { value: "پویش حفظ قرآن کریم", type: "quran", levels: {} },
    { value: "آزمون مداد و کاغذی", type: "level2", levels: { "خیلی خوب": 100, "خوب": 66, "قابل قبول": 33, "نیازمند تلاش": 0 } }, // اصلاح شد
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

// لیست کامل سوره‌های جزء سی به همراه تعداد آیات
const quranSurahs = {
    "ناس": 6, "فلق": 5, "توحید": 4, "مسد": 5, "نصر": 3, "کافرون": 6, "کوثر": 3, "ماعون": 7,
    "قریش": 4, "فیل": 5, "همزه": 9, "عصر": 3, "تکاثر": 8, "قارعه": 11, "عادیات": 11, "زلزله": 8,
    "بینه": 8, "قدر": 5, "علق": 19, "تین": 8, "شرح": 8, "ضحی": 11, "لیل": 21, "شمس": 15,
    "بلد": 20, "فجر": 30, "غاشیه": 26, "اعلی": 19, "طارق": 17, "بروج": 22, "انشقاق": 25,
    "مطففین": 36, "انفطار": 19, "تکویر": 29, "عبس": 42, "نازعات": 46, "نبأ": 40, "ملک": 30,
    "قلم": 52, "حاقه": 52, "معارج": 44, "نوح": 28, "جن": 28, "مزمل": 20, "مدثر": 56, "قیامه": 40,
    "انسان": 31, "مرسلات": 50
};

// ==========================================
// 2. راه‌اندازی اولیه اپلیکیشن
// ==========================================
function initApp() {
    // --- فرم کلاس ---
    const classForm = document.getElementById('class-form');
    if (classForm) {
        classForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveData('classProfile', {
                id: 1,
                name: document.getElementById('className').value,
                grade: document.getElementById('classGrade').value,
                motto: document.getElementById('classMotto').value,
                teacherName: document.getElementById('teacherName').value
            });
            alert('اطلاعات کلاس ذخیره شد!');
            document.getElementById('header-subtitle').textContent = document.getElementById('className').value;
        });
    }

    // --- فرم درس ---
    const subjectForm = document.getElementById('subject-form');
    if (subjectForm) {
        subjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveData('subjects', { name: document.getElementById('subjectName').value });
            subjectForm.reset();
            loadAllData();
        });
    }

    // --- فرم گروه ---
    const groupForm = document.getElementById('group-form');
    if (groupForm) {
        groupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveData('groups', {
                name: document.getElementById('groupName').value,
                symbol: document.getElementById('groupSymbol').value,
                motto: document.getElementById('groupMotto').value
            });
            groupForm.reset();
            loadAllData();
        });
    }

    // --- فرم دانش‌آموز ---
    const studentForm = document.getElementById('student-form');
    if (studentForm) {
        studentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveData('students', {
                firstName: document.getElementById('studentFirstName').value,
                lastName: document.getElementById('studentLastName').value,
                groupId: parseInt(document.getElementById('studentGroup').value)
            });
            studentForm.reset();
            loadAllData();
        });
    }

    // --- آیتم‌های ارزشیابی ---
    const itemSelect = document.getElementById('recordItem');
    if (itemSelect) {
        assessmentTree.forEach((item, index) => {
            const opt = document.createElement('option');
            opt.value = index; opt.textContent = item.value;
            itemSelect.appendChild(opt);
        });
        itemSelect.addEventListener('change', (e) => renderScoreInput(assessmentTree[e.target.value]));
    }

    // --- فرم ارزشیابی ---
    const recordForm = document.getElementById('record-form');
    if (recordForm) {
        recordForm.addEventListener('submit', (e) => {
            e.preventDefault(); showPreview();
        });
    }

    loadAllData();
}

// ==========================================
// 3. بارگذاری داده‌ها و رندر لیست‌ها (با قابلیت حذف)
// ==========================================
async function loadAllData() {
    try {
        // لود کلاس
        const classData = await getDataById('classProfile', 1);
        if (classData) {
            document.getElementById('className').value = classData.name || '';
            document.getElementById('classGrade').value = classData.grade || '';
            document.getElementById('classMotto').value = classData.motto || '';
            document.getElementById('teacherName').value = classData.teacherName || '';
            document.getElementById('header-subtitle').textContent = classData.name || 'همیار پرتلاش معلم';
        }

        // لود دروس
        const subjects = await getAllData('subjects');
        const subjectsList = document.getElementById('subjects-list');
        const recordSubjectSelect = document.getElementById('recordSubject');
        if (subjectsList) {
            subjectsList.innerHTML = subjects.length === 0 ? '<p style="text-align:center; color:#64748b;">لیست خالی است.</p>' : '';
            subjects.forEach(s => {
                subjectsList.innerHTML += `
                    <div class="list-item">
                        <span><strong>${s.name}</strong></span>
                        <button class="btn btn-danger btn-sm" onclick="deleteItem('subjects', ${s.id})">🗑️</button>
                    </div>`;
            });
        }
        if (recordSubjectSelect) {
            recordSubjectSelect.innerHTML = '<option value="" disabled selected>انتخاب کنید...</option>' + subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        }

        // لود گروه‌ها
        const groups = await getAllData('groups');
        const groupsList = document.getElementById('groups-list');
        const studentGroupSelect = document.getElementById('studentGroup');
        if (groupsList) {
            groupsList.innerHTML = groups.length === 0 ? '<p style="text-align:center; color:#64748b;">لیست خالی است.</p>' : '';
            groups.forEach(g => {
                groupsList.innerHTML += `
                    <div class="list-item">
                        <span>${g.symbol} <strong>${g.name}</strong></span>
                        <button class="btn btn-danger btn-sm" onclick="deleteItem('groups', ${g.id})">🗑️</button>
                    </div>`;
            });
        }
        if (studentGroupSelect) {
            studentGroupSelect.innerHTML = '<option value="" disabled selected>انتخاب کنید...</option>' + groups.map(g => `<option value="${g.id}">${g.symbol} ${g.name}</option>`).join('');
        }

        // لود دانش‌آموزان
        const students = await getAllData('students');
        const studentsList = document.getElementById('students-list');
        const checkboxContainer = document.getElementById('students-checkbox-container');
        if (studentsList) {
            studentsList.innerHTML = students.length === 0 ? '<p style="text-align:center; color:#64748b;">لیست خالی است.</p>' : '';
            students.forEach(st => {
                const g = groups.find(x => x.id === st.groupId);
                studentsList.innerHTML += `
                    <div class="list-item">
                        <span><strong>${st.firstName} ${st.lastName}</strong></span>
                        <div style="display:flex; gap:5px; align-items:center;">
                            <span class="rank-badge">${g ? g.symbol+' '+g.name : 'بدون گروه'}</span>
                            <button class="btn btn-danger btn-sm" onclick="deleteItem('students', ${st.id})">🗑️</button>
                        </div>
                    </div>`;
            });
        }
        if (checkboxContainer) {
            checkboxContainer.innerHTML = students.length === 0 ? '<p style="text-align:center; color:#64748b;">هیچ دانش‌آموزی نیست.</p>' : '';
            students.forEach(st => {
                checkboxContainer.innerHTML += `
                    <label class="student-checkbox-item">
                        <input type="checkbox" class="student-checkbox" value="${st.id}">
                        <span>${st.firstName} ${st.lastName}</span>
                    </label>`;
            });
        }

    } catch (e) { console.log('خطا در لود داده‌ها', e); }
}

// ==========================================
// 4. تابع حذف (CRUD: Delete)
// ==========================================
async function deleteItem(storeName, id) {
    if (confirm('آیا مطمئن هستید که می‌خواهید این مورد را حذف کنید؟')) {
        await deleteData(storeName, id);
        loadAllData();
    }
}

// ==========================================
// 5. منطق امتیازدهی (۶ حالت)
// ==========================================
function renderScoreInput(item) {
    const section = document.getElementById('dynamic-score-section');
    const container = document.getElementById('score-input-container');
    section.style.display = 'block'; container.innerHTML = '';

    if (item.type === 'level1' || item.type === 'level2') {
        const select = document.createElement('select'); select.className = 'form-control'; select.id = 'dynamicLevelInput'; select.required = true;
        select.innerHTML = '<option value="" disabled selected>انتخاب سطح...</option>';
        for (const [level, score] of Object.entries(item.levels)) select.innerHTML += `<option value="${score}">${level} (${score} امتیاز)</option>`;
        container.appendChild(select);
    } else if (item.type === 'count') {
        const input = document.createElement('input'); input.type = 'number'; input.className = 'form-control'; input.id = 'dynamicCountInput'; input.min = '1'; input.placeholder = 'تعداد صفحات'; input.required = true; container.appendChild(input);
    } else if (item.type === 'fixed') {
        container.innerHTML = `<p style="font-weight: bold; color: #4A90E2;">${item.score} امتیاز (به صورت خودکار)</p>`;
    } else if (item.type === 'free') {
        const input = document.createElement('input'); input.type = 'number'; input.className = 'form-control'; input.id = 'dynamicFreeInput'; input.min = '0'; input.placeholder = 'عدد امتیاز را وارد کنید'; input.required = true; container.appendChild(input);
    } else if (item.type === 'quran') {
        const select = document.createElement('select'); select.className = 'form-control'; select.id = 'quranSurahSelect';
        select.innerHTML = '<option value="" disabled selected>انتخاب سوره...</option>';
        for (const [surah, ayat] of Object.entries(quranSurahs)) select.innerHTML += `<option value="${ayat}">${surah} (${ayat} آیه)</option>`;
        const input = document.createElement('input'); input.type = 'number'; input.className = 'form-control'; input.id = 'quranAyatInput'; input.placeholder = 'تعداد آیات حفظ‌شده'; input.min = '1';
        container.appendChild(select); container.appendChild(document.createElement('br')); container.appendChild(input);
    }
}

function toggleAllStudents(checked) {
    document.querySelectorAll('.student-checkbox').forEach(cb => cb.checked = checked);
}

// ==========================================
// 6. پیش‌نمایش و ذخیره ارزشیابی
// ==========================================
function showPreview() {
    const selectedIndex = document.getElementById('recordItem').value;
    const selectedItem = assessmentTree[selectedIndex];
    let finalScore = 0; let scoreDetails = '';

    try {
        if (selectedItem.type === 'level1' || selectedItem.type === 'level2') {
            finalScore = parseInt(document.getElementById('dynamicLevelInput').value) || 0;
            scoreDetails = `سطح: ${finalScore}`;
        } else if (selectedItem.type === 'count') {
            const c = parseInt(document.getElementById('dynamicCountInput').value) || 0;
            finalScore = c * selectedItem.factor;
            scoreDetails = `${c} × ${selectedItem.factor} = ${finalScore}`;
        } else if (selectedItem.type === 'fixed') {
            finalScore = selectedItem.score;
            scoreDetails = `ثابت: ${finalScore}`;
        } else if (selectedItem.type === 'free') {
            finalScore = parseInt(document.getElementById('dynamicFreeInput').value) || 0;
            scoreDetails = `دستی: ${finalScore}`;
        } else if (selectedItem.type === 'quran') {
            const ayat = parseInt(document.getElementById('quranAyatInput').value) || 0;
            const total = parseInt(document.getElementById('quranSurahSelect').value) || 0;
            const threshold = Math.ceil((total / 2) + 1);
            if (ayat >= threshold && total > 0) {
                finalScore = ayat * 5;
                scoreDetails = `حد نصاب (${threshold}) رعایت شد: ${ayat} × 5 = ${finalScore}`;
            } else {
                finalScore = 0;
                scoreDetails = `حد نصاب (${threshold}) رعایت نشد. امتیاز ۰.`;
            }
        }
    } catch (e) {
        alert('لطفاً فیلدهای امتیاز را کامل کنید.');
        return;
    }

    const studentCheckboxes = document.querySelectorAll('.student-checkbox:checked');
    if (studentCheckboxes.length === 0) {
        alert('لطفاً حداقل یک دانش‌آموز انتخاب کنید.');
        return;
    }

    document.getElementById('preview-content').innerHTML = `
        <div class="preview-row"><strong>درس:</strong> <span>${document.getElementById('recordSubject').options[document.getElementById('recordSubject').selectedIndex].text}</span></div>
        <div class="preview-row"><strong>آیتم:</strong> <span>${selectedItem.value}</span></div>
        <div class="preview-row"><strong>عنوان:</strong> <span>${document.getElementById('recordTitle').value}</span></div>
        <div class="preview-row"><strong>دانش‌آموزان:</strong> <span>${studentCheckboxes.length} نفر</span></div>
        <div class="preview-row" style="background: #eef2ff; padding: 10px; border-radius: 8px; margin-top: 10px;">
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
        // ذخیره ثبت ارزشیابی
        await saveData('records', window.tempRecordData);
        
        // منطق تشویق خودکار برای پویش (در صورت وجود)
        if (window.tempRecordData.itemName === "پویش حفظ قرآن کریم" && window.tempRecordData.finalScore > 0) {
            // در اینجا می‌توان منطق تشویق را اضافه کرد، فعلاً فقط یک پیام
            console.log('تشویق پویش صادر شد.');
        }

        alert('اطلاعات با موفقیت ذخیره شد!');
        closePreviewModal();
        document.getElementById('record-form').reset();
        document.getElementById('dynamic-score-section').style.display = 'none';
        loadAllData(); // آپدیت لیست‌ها
    } catch (error) {
        alert('خطا در ذخیره اطلاعات!');
        closePreviewModal();
    }
}

// ==========================================
// 7. گزارشات (Reports)
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

        const studentScores = students.map(st => {
            let total = 0;
            records.forEach(rec => {
                if (rec.students && rec.students.includes(st.id)) {
                    total += rec.finalScore;
                }
            });
            return { ...st, totalScore: total };
        });

        studentScores.sort((a, b) => b.totalScore - a.totalScore);

        container.innerHTML = studentScores.map((st, index) => `
            <div class="list-item ${index === 0 ? 'top-student-row' : ''}">
                <span><strong>${index + 1}. ${st.firstName} ${st.lastName}</strong> ${index === 0 ? '👑' : ''}</span>
                <span class="rank-badge" style="font-size: 1rem; ${index === 0 ? 'background: var(--arf-border); color: white;' : ''}">${st.totalScore} امتیاز</span>
            </div>
        `).join('');

    } catch (e) {
        container.innerHTML = '<p style="text-align:center; color:red;">خطا در تولید گزارش.</p>';
    }
}

// ==========================================
// 8. پشتیبان‌گیری (Export / Import)
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
    } catch (e) {
        alert('خطا در گرفتن خروجی: ' + e.message);
    }
}

async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            await importAllData(data);
            alert('بازیابی با موفقیت انجام شد!');
            loadAllData();
        } catch (err) {
            alert('فایل نامعتبر است!');
        }
    };
    reader.readAsText(file);
}

// ==========================================
// 9. Service Worker و اعلان آپدیت
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