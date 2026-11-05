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

const quranSurahs = {
    "ناس": 6, "فلق": 5, "توحید": 4, "مسد": 5, "نصر": 3, "کافرون": 6, "کوثر": 3, "ماعون": 7,
    "قریش": 4, "فیل": 5, "همزه": 9, "عصر": 3, "تکاثر": 8, "قارعه": 11, "عادیات": 11, "زلزله": 8
    // برای سادگی فقط چند سوره اینجا آورده شده است
};

let currentCalculatedScore = 0;

// ==========================================
// راه‌اندازی فرم
// ==========================================
async function initAssessmentForm() {
    // 1. لود دروس (از دیتابیس)
    const subjectSelect = document.getElementById('recordSubject');
    if (subjectSelect) {
        try {
            const subjects = await getAllData('subjects');
            if (subjects.length === 0) {
                subjectSelect.innerHTML = '<option value="" disabled selected>هیچ درسی یافت نشد!</option>';
            } else {
                subjects.forEach(sub => {
                    const opt = document.createElement('option');
                    opt.value = sub.id;
                    opt.textContent = sub.name;
                    subjectSelect.appendChild(opt);
                });
            }
        } catch (e) {
            subjectSelect.innerHTML = '<option value="1">ریاضی (تست)</option>';
        }
    }

    // 2. لود آیتم‌های ارزشیابی
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

    // 3. لود دانش‌آموزان
    loadStudentsForCheckbox();

    // 4. مدیریت ارسال فرم
    document.getElementById('record-form').addEventListener('submit', (e) => {
        e.preventDefault();
        showPreview();
    });
}

// ==========================================
// نمایش فیلد امتیاز داینامیک
// ==========================================
function renderScoreInput(item) {
    const section = document.getElementById('dynamic-score-section');
    const container = document.getElementById('score-input-container');
    
    section.style.display = 'block';
    container.innerHTML = '';
    currentCalculatedScore = 0;

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
        input.type = 'number';
        input.className = 'form-control';
        input.id = 'dynamicCountInput';
        input.min = '1';
        input.placeholder = 'تعداد را وارد کنید';
        input.required = true;
        container.appendChild(input);

    } else if (item.type === 'fixed') {
        container.innerHTML = `<p style="font-weight: bold; color: #4A90E2;">${item.score} امتیاز (خودکار)</p>`;
        currentCalculatedScore = item.score;

    } else if (item.type === 'free') {
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'form-control';
        input.id = 'dynamicFreeInput';
        input.min = '0';
        input.placeholder = 'عدد امتیاز را وارد کنید';
        input.required = true;
        container.appendChild(input);

    } else if (item.type === 'quran') {
        // فرم پویش قرآن
        const select = document.createElement('select');
        select.className = 'form-control';
        select.id = 'quranSurahSelect';
        select.innerHTML = '<option value="" disabled selected>انتخاب سوره...</option>';
        for (const [surah, ayat] of Object.entries(quranSurahs)) {
            select.innerHTML += `<option value="${ayat}">${surah} (${ayat} آیه)</option>`;
        }
        
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'form-control';
        input.id = 'quranAyatInput';
        input.placeholder = 'تعداد آیات حفظ‌شده';
        input.min = '1';
        
        container.appendChild(select);
        container.appendChild(document.createElement('br'));
        container.appendChild(input);
    }
}

// ==========================================
// بارگذاری دانش‌آموزان
// ==========================================
async function loadStudentsForCheckbox() {
    const container = document.getElementById('students-checkbox-container');
    if (!container) return;

    try {
        const students = await getAllData('students');
        if (students.length === 0) {
            container.innerHTML = '<p style="color: #64748b; text-align: center;">هیچ دانش‌آموزی در دیتابیس نیست.</p>';
            return;
        }

        container.innerHTML = '';
        students.forEach(student => {
            const div = document.createElement('label');
            div.className = 'student-checkbox-item';
            div.innerHTML = `
                <input type="checkbox" class="student-checkbox" value="${student.id}">
                <span>${student.firstName} ${student.lastName}</span>
            `;
            container.appendChild(div);
        });
    } catch (e) {
        container.innerHTML = '<p style="color: red; text-align: center;">خطا در بارگذاری (حالت تست).</p>';
    }
}

// انتخاب / لغو انتخاب همه
function toggleAllStudents(checked) {
    const checkboxes = document.querySelectorAll('.student-checkbox');
    checkboxes.forEach(cb => cb.checked = checked);
}

// ==========================================
// پیش‌نمایش و ذخیره
// ==========================================
function showPreview() {
    const itemSelect = document.getElementById('recordItem');
    const selectedItem = assessmentTree[itemSelect.value];
    
    // محاسبه امتیاز نهایی
    let finalScore = 0;
    let scoreDetails = '';
    
    if (selectedItem.type === 'level1' || selectedItem.type === 'level2') {
        const level = document.getElementById('dynamicLevelInput').value;
        finalScore = parseInt(level) || 0;
        scoreDetails = `امتیاز سطح: ${finalScore}`;
    } else if (selectedItem.type === 'count') {
        const count = parseInt(document.getElementById('dynamicCountInput').value) || 0;
        finalScore = count * selectedItem.factor;
        scoreDetails = `${count} × ${selectedItem.factor} = ${finalScore}`;
    } else if (selectedItem.type === 'fixed') {
        finalScore = selectedItem.score;
        scoreDetails = `امتیاز ثابت: ${finalScore}`;
    } else if (selectedItem.type === 'free') {
        finalScore = parseInt(document.getElementById('dynamicFreeInput').value) || 0;
        scoreDetails = `امتیاز دستی: ${finalScore}`;
    } else if (selectedItem.type === 'quran') {
        // محاسبه حد نصاب پویش
        const ayat = parseInt(document.getElementById('quranAyatInput').value) || 0;
        const surahTotal = parseInt(document.getElementById('quranSurahSelect').value) || 0;
        
        const threshold = Math.ceil((surahTotal / 2) + 1);
        
        if (ayat >= threshold && surahTotal > 0) {
            finalScore = ayat * 5;
            scoreDetails = `حد نصاب (${threshold}) رعایت شد. امتیاز: ${ayat} × 5 = ${finalScore}`;
        } else {
            finalScore = 0;
            scoreDetails = `حد نصاب (${threshold}) رعایت نشد. امتیاز: 0`;
        }
    }

    // نمایش در مودال
    const content = document.getElementById('preview-content');
    const studentCheckboxes = document.querySelectorAll('.student-checkbox:checked');
    
    content.innerHTML = `
        <div class="preview-row"><strong>درس:</strong> <span>${document.getElementById('recordSubject').options[document.getElementById('recordSubject').selectedIndex].text}</span></div>
        <div class="preview-row"><strong>آیتم:</strong> <span>${selectedItem.value}</span></div>
        <div class="preview-row"><strong>عنوان:</strong> <span>${document.getElementById('recordTitle').value}</span></div>
        <div class="preview-row"><strong>تاریخ:</strong> <span>${document.getElementById('recordDate').value}</span></div>
        <div class="preview-row"><strong>تعداد دانش‌آموز:</strong> <span>${studentCheckboxes.length} نفر</span></div>
        <div class="preview-row"><strong>نحوه محاسبه:</strong> <span>${scoreDetails}</span></div>
        <div class="preview-row" style="border-bottom: none; margin-top: 10px; background: #eef2ff; padding: 10px; border-radius: 8px;">
            <strong>امتیاز نهایی هر نفر:</strong> <span style="font-size: 1.2rem; color: #4A90E2;">${finalScore}</span>
        </div>
    `;
    
    // ذخیره موقت برای استفاده در مرحله بعد
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

function closePreviewModal() {
    document.getElementById('preview-modal').classList.remove('show');
}

async function confirmAndSaveRecord() {
    const data = window.tempRecordData;
    if (!data) return;

    try {
        // ذخیره در دیتابیس
        await saveData('records', {
            subjectId: data.subjectId,
            itemName: data.itemName,
            title: data.title,
            date: data.date,
            students: data.students,
            arf: data.arf,
            finalScore: data.finalScore,
            timestamp: Date.now()
        });
        
        alert('اطلاعات با موفقیت ذخیره شد!');
        closePreviewModal();
        document.getElementById('record-form').reset();
        document.getElementById('dynamic-score-section').style.display = 'none';
        
    } catch (error) {
        console.error(error);
        alert('خطا در ذخیره! (در حالت تست محلی، دیتابیس کار نمی‌کند)');
        closePreviewModal();
    }
}
// ==========================================
// 5. مدیریت Service Worker و اعلان آپدیت (Toast)
// ==========================================

// ثبت Service Worker (فقط در محیط‌های HTTPS یا localhost کار می‌کند)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((registration) => {
            console.log('Service Worker با موفقیت ثبت شد.');

            // بررسی آپدیت
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // نسخه جدید آماده است، نمایش Toast
                        showUpdateToast(newWorker);
                    }
                });
            });
        }).catch((error) => {
            console.log('خطا در ثبت Service Worker:', error);
        });
    });
}

// تابع نمایش Toast آپدیت
function showUpdateToast(newWorker) {
    // ساخت المان Toast
    const toast = document.createElement('div');
    toast.className = 'toast-container';
    toast.id = 'update-toast';
    toast.innerHTML = `
        <span>🚀 نسخه جدید در دسترس است!</span>
        <button class="toast-btn" id="update-btn">به‌روزرسانی</button>
    `;
    document.body.appendChild(toast);

    // نمایش با انیمیشن
    setTimeout(() => toast.classList.add('show'), 100);

    // دکمه به‌روزرسانی
    document.getElementById('update-btn').addEventListener('click', () => {
        if (newWorker) {
            newWorker.postMessage({ action: 'skipWaiting' });
        }
        // رفرش صفحه پس از کنترل Service Worker جدید
        setTimeout(() => window.location.reload(), 500);
    });
}
