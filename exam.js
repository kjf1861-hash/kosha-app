// ==========================================
// فایل exam.js — منطق کامل تب آزمون‌ها (نسخه چندساله)
// ==========================================

window.allExamsData = [];
window.allExamResultsData = [];

let examQuestionCounter = 0;
let currentGradingExamId = null;

let examCalendarState = {
    year: 1405,
    month: 7,
    selectedDate: ''
};

async function loadExamsData() {
    try {
        window.allExamsData = await getDataByYear('exams', window.activeAcademicYear);
        window.allExamResultsData = await getDataByYear('examResults', window.activeAcademicYear);
    } catch (e) {
        console.error('خطا در بارگذاری داده‌های آزمون:', e);
    }
}

// ==========================================
// 1. نمایش لیست آزمون‌ها
// ==========================================
function renderExamsData() {
    const container = document.getElementById('exams-list-container');
    if (!container) return;

    if (!window.allExamsData || window.allExamsData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg><use href="#empty-exams"/></svg>
                <div class="empty-title">هنوز آزمونی نساختی!</div>
                <div class="empty-desc">اولین آزمونت رو بساز تا نمرات رو ثبت کنی و گزارش‌ها رو ببینی.</div>
                <button class="empty-action" onclick="openExamEditorModal()">➕ ساخت اولین آزمون</button>
            </div>
        `;
        return;
    }

    const sortedExams = [...window.allExamsData].sort((a, b) => b.date.localeCompare(a.date));

    let html = '';
    sortedExams.forEach(exam => {
        const sub = window.allSubjectsData ? window.allSubjectsData.find(s => s.id === exam.subjectId) : null;
        
        // ✅ اصلاح امنیتی: escape نام و نماد درس
        const subName = sub ? `${escapeHtml(sub.symbol || '📚')} ${escapeHtml(sub.name)}` : 'بدون درس';
        
        const results = window.allExamResultsData ? window.allExamResultsData.filter(r => r.examId === exam.id) : [];
        const participantCount = results.length;
        const questionCount = exam.questions ? exam.questions.length : 0;
        
        let avgHtml = '';
        if (participantCount > 0) {
            const avg = results.reduce((sum, r) => sum + r.score, 0) / participantCount;
            avgHtml = `<span>📊 میانگین: <strong style="color:var(--primary);">${toPersianNumber(avg.toFixed(1))}</strong></span>`;
        } else {
            avgHtml = `<span style="color:#dc2626;">⚠️ نمره ثبت نشده</span>`;
        }
        
        // ✅ اصلاح امنیتی: escape عنوان آزمون
        html += `
            <div class="exam-list-item">
                <div class="exam-list-header">
                    <span class="exam-list-title">${escapeHtml(exam.title)}</span>
                    <span class="rank-badge">${toPersianNumber(exam.maxScore)} نمره</span>
                </div>
                <div class="exam-list-details">
                    <span>📚 ${subName}</span>
                    <span>📅 ${toPersianNumber(exam.date)}</span>
                </div>
                <div class="exam-list-details" style="margin-top: 4px;">
                    <span>❓ ${toPersianNumber(questionCount)} سوال</span>
                    <span>👥 ${toPersianNumber(participantCount)} شرکت‌کننده</span>
                </div>
                <div class="exam-list-details" style="margin-top: 4px;">
                    ${avgHtml}
                </div>
                <div class="exam-list-actions" style="flex-wrap: wrap;">
                    <button class="btn btn-primary btn-sm" onclick="openExamGradingModal('${exam.id}')" title="ثبت نمرات">📝 ثبت نمرات</button>
                    <button class="btn btn-secondary btn-sm" onclick="generateGameFile('${exam.id}')" title="تولید فایل بازی برای دانش‌آموز" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; border: none;">🎮 تولید بازی</button>
                    <button class="btn btn-secondary btn-sm" onclick="openExamEditorModal('${exam.id}')" title="ویرایش آزمون">✏️ ویرایش</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteExam('${exam.id}')" title="حذف آزمون">🗑️ حذف</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ==========================================
// 2. تقویم آزمون
// ==========================================
function saveExamCalendarState() {
    try {
        localStorage.setItem('kosha-exam-cal', JSON.stringify(examCalendarState));
    } catch (e) { console.log('خطا در ذخیره تقویم آزمون', e); }
}

function loadExamCalendarState() {
    try {
        const saved = localStorage.getItem('kosha-exam-cal');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.year) {
                examCalendarState = parsed;
            }
        }
    } catch (e) { console.log('خطا در بازیابی تقویم آزمون', e); }
}

function initExamCalendar() {
    const ay = window.activeAcademicYear || '1405-1406';
    const [startYearStr] = ay.split('-');
    const startYear = parseInt(startYearStr);
    
    loadExamCalendarState();
    
    if (!examCalendarState.year || examCalendarState.year < startYear) {
        examCalendarState.year = startYear;
        examCalendarState.month = 7;
        examCalendarState.selectedDate = '';
    }
    
    const displayEl = document.getElementById('examDateDisplay');
    if (displayEl) {
        if (examCalendarState.selectedDate) {
            displayEl.textContent = toPersianNumber(examCalendarState.selectedDate);
        } else {
            displayEl.textContent = 'انتخاب نشده';
        }
    }
    
    const hiddenInput = document.getElementById('examDate');
    if (hiddenInput) hiddenInput.value = examCalendarState.selectedDate;
    
    renderExamCalendar();
}

function changeExamCalendarMonth(delta) {
    const ay = window.activeAcademicYear || '1405-1406';
    const [startYearStr, endYearStr] = ay.split('-');
    const startYear = parseInt(startYearStr);
    const endYear = parseInt(endYearStr);

    if (delta === -1) {
        if (examCalendarState.year === startYear && examCalendarState.month === 7) {
            showToast('شما در ابتدای سال تحصیلی هستید.', 'error');
            return;
        }
    } else if (delta === 1) {
        if (examCalendarState.year === endYear && examCalendarState.month === 6) {
            showToast('شما در انتهای سال تحصیلی هستید.', 'error');
            return;
        }
    }

    examCalendarState.month += delta;
    if (examCalendarState.month < 1) { examCalendarState.month = 12; examCalendarState.year--; }
    else if (examCalendarState.month > 12) { examCalendarState.month = 1; examCalendarState.year++; }

    if (examCalendarState.year < startYear || examCalendarState.year > endYear) {
        showToast('این ماه خارج از بازه سال تحصیلی است.', 'error');
        examCalendarState.year = parseInt(document.getElementById('exam-calendar-title').dataset.year);
        examCalendarState.month = parseInt(document.getElementById('exam-calendar-title').dataset.month);
        return;
    }

    saveExamCalendarState();
    renderExamCalendar();
}

function updateExamCalendarSelect(field, value) {
    examCalendarState[field] = parseInt(value);
    saveExamCalendarState();
    renderExamCalendar();
}

function renderExamCalendar() {
    const titleEl = document.getElementById('exam-calendar-title');
    if (!titleEl) return;
    
    titleEl.dataset.year = examCalendarState.year;
    titleEl.dataset.month = examCalendarState.month;
    
    const ay = window.activeAcademicYear || '1405-1406';
    const [startY, endY] = ay.split('-');
    const monthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
    
    titleEl.innerHTML = `
        <select onchange="updateExamCalendarSelect('month', this.value)">
            ${monthNames.map((m, i) => `<option value="${i + 1}" ${examCalendarState.month === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
        <select onchange="updateExamCalendarSelect('year', this.value)">
            ${[parseInt(startY), parseInt(endY)].map(y => `<option value="${y}" ${examCalendarState.year === y ? 'selected' : ''}>${toPersianNumber(y)}</option>`).join('')}
        </select>
    `;

    const grid = document.getElementById('exam-calendar-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const firstDay = getJalaliFirstDayOfWeek(examCalendarState.year, examCalendarState.month);
    const daysInMonth = getJalaliDaysInMonth(examCalendarState.year, examCalendarState.month);
    
    const startBound = `${startY}/07/01`;
    const endBound = `${endY}/06/31`;

    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div class="calendar-day empty"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const isFriday = ((firstDay + day - 1) % 7) === 6;
        const dateStr = `${examCalendarState.year}/${String(examCalendarState.month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
        const inAcademicYear = (dateStr >= startBound && dateStr <= endBound);
        
        let classes = 'calendar-day';
        if (isFriday) classes += ' holiday';
        if (examCalendarState.selectedDate === dateStr) classes += ' selected';
        if (!inAcademicYear) classes += ' outside-range';

        const clickHandler = inAcademicYear 
            ? `onclick="selectExamCalendarDay('${dateStr}')"` 
            : `onclick="showToast('این تاریخ خارج از بازه سال تحصیلی است.', 'error')"`;

        grid.innerHTML += `<div class="${classes}" ${clickHandler}>${toPersianNumber(day)}</div>`;
    }
}

function selectExamCalendarDay(dateStr) {
    examCalendarState.selectedDate = dateStr;
    saveExamCalendarState();
    
    const displayEl = document.getElementById('examDateDisplay');
    if (displayEl) displayEl.textContent = toPersianNumber(dateStr);
    
    const hiddenInput = document.getElementById('examDate');
    if (hiddenInput) hiddenInput.value = dateStr;

    renderExamCalendar();
    
    const calendarBody = document.getElementById('exam-calendar-body');
    if (calendarBody) {
        const existingEventBox = calendarBody.querySelector('.exam-event-display');
        if (existingEventBox) existingEventBox.remove();
        
        const eventText = (typeof getFormattedEventsForDate === 'function') 
            ? getFormattedEventsForDate(dateStr) 
            : '';
        
        if (eventText) {
            const eventBox = document.createElement('div');
            eventBox.className = 'exam-event-display';
            eventBox.style.cssText = 'background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%); border: 1px solid #c4b5fd; border-radius: 8px; padding: 8px 10px; margin-top: 10px; font-size: 0.85rem; color: #5b21b6; display: flex; align-items: flex-start; gap: 6px;';
            eventBox.innerHTML = `<span>🎉</span><span>${eventText}</span>`;
            calendarBody.appendChild(eventBox);
        }
    }
}

// ⏸️ پایان بخش ۱ — منتظر پیام «ادامه» شما هستم تا بخش ۲ را بفرستم.
// ==========================================
// 3. باز کردن مودال سازنده آزمون
// ==========================================
async function openExamEditorModal(examId = null) {
    const modal = document.getElementById('exam-editor-modal');
    const form = document.getElementById('exam-editor-form');
    const titleEl = document.getElementById('exam-editor-title');
    const questionsContainer = document.getElementById('exam-questions-container');
    
    if (!modal || !form) {
        showToast('خطا: مودال آزمون یافت نشد.', 'error');
        return;
    }

    form.reset();
    questionsContainer.innerHTML = '';
    examQuestionCounter = 0;
    document.getElementById('examEditId').value = '';

    const subjectSelect = document.getElementById('examSubject');
    // ✅ اصلاح امنیتی: escape نام و نماد دروس
    subjectSelect.innerHTML = '<option value="" disabled selected>یک درس را انتخاب کنید...</option>' +
        window.allSubjectsData.map(s => `<option value="${s.id}">${escapeHtml(s.symbol || '')} ${escapeHtml(s.name)}</option>`).join('');

    if (examId) {
        const exam = await getDataById('exams', examId);
        if (!exam) { showToast('آزمون یافت نشد.', 'error'); return; }
        
        titleEl.textContent = '✏️ ویرایش آزمون';
        document.getElementById('examEditId').value = exam.id;
        document.getElementById('examTitle').value = exam.title;
        document.getElementById('examSubject').value = exam.subjectId;
        document.getElementById('examMaxScore').value = exam.maxScore;
        
        if (exam.date && /^\d{4}\/\d{2}\/\d{2}$/.test(exam.date)) {
            const parts = exam.date.split('/');
            examCalendarState.year = parseInt(parts[0]);
            examCalendarState.month = parseInt(parts[1]);
            examCalendarState.selectedDate = exam.date;
        }
        
        if (exam.questions && exam.questions.length > 0) {
            exam.questions.forEach(q => addExamQuestion(q));
        }
    } else {
        titleEl.textContent = '➕ ساخت آزمون جدید';
        examCalendarState.selectedDate = '';
        addExamQuestion();
    }

    initExamCalendar();
    modal.classList.add('show');
}

function closeExamEditorModal() {
    const modal = document.getElementById('exam-editor-modal');
    if (modal) modal.classList.remove('show');
}

// ==========================================
// 4. مدیریت سوالات در مودال
// ==========================================
function addExamQuestion(questionData = null) {
    const container = document.getElementById('exam-questions-container');
    if (!container) return;
    
    examQuestionCounter++;
    const questionId = 'q_' + Date.now() + '_' + examQuestionCounter;
    const type = questionData ? questionData.type : 'multiple-choice';
    
    // ✅ اصلاح امنیتی: escape متن سوال در textarea
    const safeQuestionText = questionData ? escapeHtml(questionData.text) : '';
    
    const questionHtml = `
        <div class="exam-question-item" data-qid="${questionId}">
            <div class="exam-question-header">
                <span class="exam-question-number">سوال ${toPersianNumber(examQuestionCounter)}</span>
                <button type="button" class="exam-question-delete-btn" onclick="removeExamQuestion(this)" title="حذف سوال">✖</button>
            </div>
            <div class="exam-question-body">
                <div class="exam-question-field">
                    <label>نوع سوال</label>
                    <select class="exam-question-type" onchange="changeQuestionType(this)">
                        <option value="multiple-choice" ${type === 'multiple-choice' ? 'selected' : ''}>چندگزینه‌ای</option>
                        <option value="essay" ${type === 'essay' ? 'selected' : ''}>تشریحی</option>
                        <option value="fill-blank" ${type === 'fill-blank' ? 'selected' : ''}>جای خالی</option>
                        <option value="true-false" ${type === 'true-false' ? 'selected' : ''}>درست / غلط</option>
                    </select>
                </div>
                <div class="exam-question-field">
                    <label>متن سوال</label>
                    <textarea class="exam-question-text" placeholder="متن سوال را وارد کنید..." required>${safeQuestionText}</textarea>
                </div>
                <div class="exam-question-type-specific">
                    ${getQuestionTypeHtml(type, questionData, questionId)}
                </div>
                <div class="exam-question-score-row">
                    <label>نمره سوال:</label>
                    <input type="number" class="exam-question-score" min="0.25" step="0.25" value="${questionData ? questionData.score : 1}" required>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', questionHtml);
    updateQuestionNumbers();
}

function getQuestionTypeHtml(type, data = null, qid = 'default_qid') {
    if (type === 'multiple-choice') {
        const options = data && data.options ? data.options : ['', '', '', ''];
        const correctIndex = data && data.correctIndex !== undefined ? data.correctIndex : 0;
        
        let optionsHtml = '';
        options.forEach((opt, i) => {
            // ✅ اصلاح امنیتی: escape گزینه‌ها
            const safeOpt = escapeHtml(opt);
            // ✅ اصلاح باگ: استفاده از qid برای گروه‌بندی رادیو باتن‌ها
            optionsHtml += `
                <div class="exam-option-row">
                    <input type="radio" name="correct_${qid}" ${i === correctIndex ? 'checked' : ''}>
                    <input type="text" class="exam-option-text" placeholder="گزینه ${toPersianNumber(i + 1)}" value="${safeOpt}">
                    <button type="button" class="exam-option-delete" onclick="removeExamOption(this)" title="حذف گزینه">🗑️</button>
                </div>
            `;
        });
        
        return `
            <div class="exam-question-field">
                <label>گزینه‌ها (گزینه صحیح را انتخاب کنید)</label>
                <div class="exam-options-container">
                    ${optionsHtml}
                    <button type="button" class="exam-add-option-btn" onclick="addExamOption(this)">➕ افزودن گزینه</button>
                </div>
            </div>
        `;
    } else if (type === 'essay') {
        // ✅ اصلاح امنیتی: escape پاسخ تشریحی
        const safeAnswer = data && data.answer ? escapeHtml(data.answer) : '';
        return `
            <div class="exam-question-field">
                <label>پاسخ صحیح (اختیاری، برای تصحیح خودکار)</label>
                <textarea class="exam-essay-answer" placeholder="پاسخ صحیح را وارد کنید...">${safeAnswer}</textarea>
            </div>
        `;
    } else if (type === 'fill-blank') {
        // ✅ اصلاح امنیتی: escape پاسخ جای خالی
        const safeAnswer = data && data.answer ? escapeHtml(data.answer) : '';
        return `
            <div class="exam-question-field">
                <label>پاسخ جای خالی</label>
                <input type="text" class="exam-fill-answer" placeholder="پاسخ صحیح..." value="${safeAnswer}">
            </div>
        `;
    } else if (type === 'true-false') {
        const correctAnswer = data && data.correctAnswer !== undefined ? data.correctAnswer : true;
        return `
            <div class="exam-question-field">
                <label>پاسخ صحیح</label>
                <select class="exam-tf-answer">
                    <option value="true" ${correctAnswer === true ? 'selected' : ''}>درست ✅</option>
                    <option value="false" ${correctAnswer === false ? 'selected' : ''}>غلط ❌</option>
                </select>
            </div>
        `;
    }
    return '';
}

function changeQuestionType(selectEl) {
    const questionItem = selectEl.closest('.exam-question-item');
    const type = selectEl.value;
    const typeSpecificContainer = questionItem.querySelector('.exam-question-type-specific');
    const qid = questionItem.getAttribute('data-qid') || 'default_qid';
    
    if (typeSpecificContainer) {
        typeSpecificContainer.innerHTML = getQuestionTypeHtml(type, null, qid);
    }
}

function addExamOption(btn) {
    const container = btn.closest('.exam-options-container');
    const questionItem = btn.closest('.exam-question-item');
    const qid = questionItem ? questionItem.getAttribute('data-qid') : 'default_qid';
    const optionCount = container.querySelectorAll('.exam-option-row').length;
    
    const newRow = document.createElement('div');
    newRow.className = 'exam-option-row';
    // ✅ اصلاح باگ: استفاده از qid برای رادیو باتن گزینه جدید
    newRow.innerHTML = `
        <input type="radio" name="correct_${qid}">
        <input type="text" class="exam-option-text" placeholder="گزینه ${toPersianNumber(optionCount + 1)}">
        <button type="button" class="exam-option-delete" onclick="removeExamOption(this)" title="حذف گزینه">🗑️</button>
    `;
    container.insertBefore(newRow, btn);
}

function removeExamOption(btn) {
    const container = btn.closest('.exam-options-container');
    const rows = container.querySelectorAll('.exam-option-row');
    if (rows.length <= 2) {
        showToast('حداقل ۲ گزینه باید وجود داشته باشد.', 'error');
        return;
    }
    btn.closest('.exam-option-row').remove();
}

function removeExamQuestion(btn) {
    const questionItem = btn.closest('.exam-question-item');
    if (!questionItem) return;
    
    if (!confirm('آیا از حذف این سوال مطمئن هستید؟')) return;
    
    questionItem.remove();
    updateQuestionNumbers();
}

function updateQuestionNumbers() {
    const questions = document.querySelectorAll('#exam-questions-container .exam-question-item');
    questions.forEach((q, index) => {
        const numEl = q.querySelector('.exam-question-number');
        if (numEl) numEl.textContent = `سوال ${toPersianNumber(index + 1)}`;
    });
}

// ⏸️ پایان بخش ۲ — منتظر پیام «ادامه» شما هستم تا بخش ۳ را بفرستم.
// ==========================================
// 5. ذخیره آزمون
// ==========================================
async function saveExam(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const editId = document.getElementById('examEditId').value;
    
    // ✅ اصلاح امنیتی: sanitize عنوان آزمون
    let title;
    try {
        title = sanitizeInput(document.getElementById('examTitle').value, 150);
    } catch (err) {
        showToast(err.message, 'error');
        return;
    }

    const subjectId = parseInt(document.getElementById('examSubject').value);
    const date = document.getElementById('examDate').value.trim();
    const maxScore = parseFloat(document.getElementById('examMaxScore').value);
    
    if (!title) { showToast('عنوان آزمون را وارد کنید.', 'error'); return; }
    if (!subjectId || isNaN(subjectId)) { showToast('درس را انتخاب کنید.', 'error'); return; }
    if (!/^\d{4}\/\d{2}\/\d{2}$/.test(date)) { showToast('تاریخ را از تقویم انتخاب کنید.', 'error'); return; }
    if (isNaN(maxScore) || maxScore <= 0) { showToast('نمره کل معتبر وارد کنید.', 'error'); return; }
    
    const questionItems = document.querySelectorAll('#exam-questions-container .exam-question-item');
    if (questionItems.length === 0) { showToast('حداقل یک سوال اضافه کنید.', 'error'); return; }
    
    const questions = [];
    let totalQuestionScores = 0;
    let hasError = false;
    
    questionItems.forEach((item, index) => {
        const type = item.querySelector('.exam-question-type').value;
        const text = item.querySelector('.exam-question-text').value.trim();
        const score = parseFloat(item.querySelector('.exam-question-score').value);
        
        if (!text) {
            showToast(`متن سوال ${toPersianNumber(index + 1)} را وارد کنید.`, 'error');
            hasError = true;
            return;
        }
        if (isNaN(score) || score <= 0) {
            showToast(`نمره سوال ${toPersianNumber(index + 1)} معتبر نیست.`, 'error');
            hasError = true;
            return;
        }
        
        totalQuestionScores += score;
        
        const questionData = {
            id: 'q_' + Date.now() + '_' + index,
            type: type,
            text: text,
            score: score
        };
        
        if (type === 'multiple-choice') {
            const options = [];
            let correctIndex = 0;
            const optionRows = item.querySelectorAll('.exam-option-row');
            
            // ✅ اصلاح باگ: پیدا کردن دقیق ایندکس گزینه صحیح (در صورت خالی بودن گزینه‌ها)
            optionRows.forEach((row) => {
                const optText = row.querySelector('.exam-option-text').value.trim();
                const isCorrect = row.querySelector('input[type="radio"]').checked;
                
                // فقط گزینه‌هایی که متن دارند را به آرایه اضافه می‌کنیم
                if (optText) {
                    // اگر این گزینه به عنوان پاسخ صحیح انتخاب شده بود، ایندکس جدید آن را ذخیره می‌کنیم
                    if (isCorrect) {
                        correctIndex = options.length;
                    }
                    options.push(optText);
                }
            });
            
            if (options.length < 2) {
                showToast(`سوال ${toPersianNumber(index + 1)} باید حداقل ۲ گزینه داشته باشد.`, 'error');
                hasError = true;
                return;
            }
            
            // اگر کاربر هیچ گزینه‌ای را به عنوان صحیح انتخاب نکرده بود، گزینه اول را صحیح در نظر می‌گیریم
            const anyChecked = Array.from(optionRows).some(row => row.querySelector('input[type="radio"]').checked);
            if (!anyChecked) {
                correctIndex = 0;
            }

            questionData.options = options;
            questionData.correctIndex = correctIndex;
            
        } else if (type === 'essay') {
            const answerEl = item.querySelector('.exam-essay-answer');
            questionData.answer = answerEl ? answerEl.value.trim() : '';
        } else if (type === 'fill-blank') {
            const answerEl = item.querySelector('.exam-fill-answer');
            questionData.answer = answerEl ? answerEl.value.trim() : '';
        } else if (type === 'true-false') {
            const answerEl = item.querySelector('.exam-tf-answer');
            questionData.correctAnswer = answerEl ? (answerEl.value === 'true') : true;
        }
        
        questions.push(questionData);
    });
    
    if (hasError) return;
    
    if (totalQuestionScores > maxScore) {
        if (!confirm(`مجموع نمرات سوالات (${toPersianNumber(totalQuestionScores)}) از نمره کل آزمون (${toPersianNumber(maxScore)}) بیشتر است. آیا مطمئن هستید؟`)) {
            return;
        }
    }
    
    const examData = {
        title: title,
        subjectId: subjectId,
        date: date,
        maxScore: maxScore,
        questions: questions,
        academicYear: window.activeAcademicYear
    };
    
    if (editId) {
        examData.id = editId;
        const existing = await getDataById('exams', editId);
        if (existing && existing.academicYear) {
            examData.academicYear = existing.academicYear;
        }
    } else {
        examData.id = generateUniqueId();
    }
    
    try {
        await saveData('exams', examData);
        showToast('آزمون با موفقیت ذخیره شد!', 'success');
        
        if (typeof clearFormDirty === 'function') clearFormDirty();
        
        closeExamEditorModal();
        await loadExamsData();
        renderExamsData();
    } catch (e) {
        console.error(e);
        showToast('خطا در ذخیره آزمون.', 'error');
    }
}

// ==========================================
// 6. حذف آزمون
// ==========================================
async function deleteExam(examId) {
    if (!confirm('آیا از حذف این آزمون و تمام نتایج آن مطمئن هستید؟')) return;
    
    try {
        await deleteData('exams', examId);
        
        const results = window.allExamResultsData.filter(r => r.examId === examId);
        for (const result of results) {
            await deleteData('examResults', result.id);
        }
        
        showToast('آزمون و نتایج آن حذف شد.', 'success');
        await loadExamsData();
        renderExamsData();
    } catch (e) {
        console.error(e);
        showToast('خطا در حذف آزمون.', 'error');
    }
}

// ==========================================
// 7. باز کردن مودال ثبت نمرات
// ==========================================
async function openExamGradingModal(examId) {
    const modal = document.getElementById('exam-grading-modal');
    if (!modal) { showToast('مودال ثبت نمرات یافت نشد.', 'error'); return; }
    
    const exam = await getDataById('exams', examId);
    if (!exam) { showToast('آزمون یافت نشد.', 'error'); return; }
    
    currentGradingExamId = examId;
    
    const sub = window.allSubjectsData.find(s => s.id === exam.subjectId);
    document.getElementById('grading-exam-title').textContent = exam.title;
    // ✅ اصلاح امنیتی: escape نام درس
    document.getElementById('grading-exam-subject').textContent = sub ? `${sub.symbol || ''} ${sub.name}` : 'بدون درس';
    document.getElementById('grading-exam-date').textContent = toPersianNumber(exam.date);
    document.getElementById('grading-exam-max').textContent = toPersianNumber(exam.maxScore);
    
    const existingResults = window.allExamResultsData.filter(r => r.examId === examId);
    const scoresMap = {};
    existingResults.forEach(r => { scoresMap[r.studentId] = r.score; });
    
    const container = document.getElementById('exam-grading-students-list');
    if (!window.allStudentsData || window.allStudentsData.length === 0) {
        container.innerHTML = '<p class="exam-grading-empty">هیچ دانش‌آموزی ثبت نشده است.</p>';
    } else {
        container.innerHTML = '';
        window.allStudentsData.forEach((st, index) => {
            const g = window.allGroupsData.find(x => x.id === st.groupId);
            // ✅ اصلاح امنیتی: escape نام و نماد گروه
            const groupBadge = g ? `<span class="exam-grading-student-group">${escapeHtml(g.symbol)} ${escapeHtml(g.name)}</span>` : '';
            const currentScore = scoresMap[st.id] !== undefined ? scoresMap[st.id] : '';
            
            // ✅ اصلاح امنیتی: escape نام دانش‌آموز
            container.innerHTML += `
                <div class="exam-grading-row" data-student-id="${st.id}">
                    <div class="exam-grading-student-info">
                        <span class="exam-grading-student-rank">${toPersianNumber(index + 1)}.</span>
                        <span class="exam-grading-student-name">${escapeHtml(st.firstName)} ${escapeHtml(st.lastName)}</span>
                        ${groupBadge}
                    </div>
                    <div class="exam-grading-score-wrapper">
                        <input type="number" 
                               class="exam-grading-score-input ${currentScore !== '' ? 'has-value' : ''}" 
                               data-student-id="${st.id}"
                               min="0" 
                               max="${exam.maxScore}" 
                               step="0.25" 
                               value="${currentScore}"
                               placeholder="نمره"
                               oninput="updateGradingStats()">
                        <span class="exam-grading-score-max">از ${toPersianNumber(exam.maxScore)}</span>
                    </div>
                </div>
            `;
        });
    }
    
    updateGradingStats();
    modal.classList.add('show');
}

function closeExamGradingModal() {
    const modal = document.getElementById('exam-grading-modal');
    if (modal) modal.classList.remove('show');
    currentGradingExamId = null;
    
    if (typeof clearFormDirty === 'function') clearFormDirty();
}

// ⏸️ پایان بخش ۳ — منتظر پیام «ادامه» شما هستم تا بخش ۴ را بفرستم.
function updateGradingStats() {
    const inputs = document.querySelectorAll('.exam-grading-score-input');
    const scores = [];
    inputs.forEach(input => {
        const val = parseFloat(input.value);
        if (!isNaN(val) && val >= 0) {
            scores.push(val);
            input.classList.add('has-value');
        } else {
            input.classList.remove('has-value');
        }
    });
    
    const avgEl = document.getElementById('grading-stat-avg');
    const maxEl = document.getElementById('grading-stat-max');
    const minEl = document.getElementById('grading-stat-min');
    
    if (scores.length === 0) {
        if (avgEl) avgEl.textContent = '-';
        if (maxEl) maxEl.textContent = '-';
        if (minEl) minEl.textContent = '-';
        return;
    }
    
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    
    if (avgEl) avgEl.textContent = toPersianNumber(avg.toFixed(1));
    if (maxEl) maxEl.textContent = toPersianNumber(max);
    if (minEl) minEl.textContent = toPersianNumber(min);
}

function setAllExamScores(value) {
    const exam = window.allExamsData.find(e => e.id === currentGradingExamId);
    if (!exam) return;
    
    const inputs = document.querySelectorAll('.exam-grading-score-input');
    inputs.forEach(input => {
        if (value === 'clear') {
            input.value = '';
        } else if (value === 'max') {
            input.value = exam.maxScore;
        } else {
            input.value = value;
        }
    });
    updateGradingStats();
}

async function saveExamGrades() {
    if (!currentGradingExamId) return;
    
    const exam = window.allExamsData.find(e => e.id === currentGradingExamId);
    if (!exam) { showToast('آزمون یافت نشد.', 'error'); return; }
    
    const inputs = document.querySelectorAll('.exam-grading-score-input');
    const newResults = [];
    let hasError = false;
    
    inputs.forEach(input => {
        const studentId = parseInt(input.getAttribute('data-student-id'));
        const rawValue = input.value.trim();
        
        if (rawValue === '') return;
        
        const score = parseFloat(rawValue);
        if (isNaN(score) || score < 0) {
            showToast('نمرات وارد شده معتبر نیستند.', 'error');
            hasError = true;
            return;
        }
        
        if (score > exam.maxScore) {
            showToast(`نمره ${toPersianNumber(score)} برای یک دانش‌آموز از نمره کل (${toPersianNumber(exam.maxScore)}) بیشتر است.`, 'error');
            hasError = true;
            return;
        }
        
        newResults.push({
            examId: currentGradingExamId,
            studentId: studentId,
            score: score,
            academicYear: window.activeAcademicYear
        });
    });
    
    if (hasError) return;
    
    try {
        const oldResults = window.allExamResultsData.filter(r => r.examId === currentGradingExamId);
        for (const r of oldResults) {
            await deleteData('examResults', r.id);
        }
        
        for (let i = 0; i < newResults.length; i++) {
            newResults[i].id = generateUniqueId();
            await saveData('examResults', newResults[i]);
        }
        
        showToast(`نمرات ${toPersianNumber(newResults.length)} دانش‌آموز ذخیره شد!`, 'success');
        
        if (typeof clearFormDirty === 'function') clearFormDirty();
        
        closeExamGradingModal();
        
        await loadExamsData();
        renderExamsData();
    } catch (e) {
        console.error(e);
        showToast('خطا در ذخیره نمرات.', 'error');
    }
}

// ⏸️ پایان بخش ۴ — منتظر پیام «ادامه» شما هستم تا بخش ۵ (آخرین بخش) را بفرستم.
