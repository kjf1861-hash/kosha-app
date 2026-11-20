// ==========================================
// فایل exam.js — منطق کامل تب آزمون‌ها (نسخه چندساله)
// ==========================================

window.allExamsData = [];
window.allExamResultsData = [];

let examQuestionCounter = 0;
let currentGradingExamId = null;
let gradingStatsTimer = null; 

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
                <div class="exam-list-actions" style="flex-wrap: wrap; gap: 5px;">
                    <button class="btn btn-primary btn-sm" onclick="openExamGradingModal('${exam.id}')" title="ثبت نمرات">📝 ثبت نمرات</button>
                    <button class="btn btn-secondary btn-sm" onclick="generateGameFile('${exam.id}')" title="تولید فایل بازی" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; border: none;">🎮 بازی</button>
                    <button class="btn btn-secondary btn-sm" onclick="exportExamCSV('${exam.id}')" title="خروجی اکسل">📗</button>
                    <button class="btn btn-secondary btn-sm" onclick="exportExamHTML('${exam.id}')" title="خروجی HTML تعاملی">🌐</button>
                    <button class="btn btn-secondary btn-sm" onclick="printExam('${exam.id}')" title="چاپ / PDF">🖨️</button>
                    <button class="btn btn-secondary btn-sm" onclick="exportExamJSON('${exam.id}')" title="خروجی JSON">📄</button>
                    <button class="btn btn-secondary btn-sm" onclick="openExamEditorModal('${exam.id}')" title="ویرایش آزمون">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteExam('${exam.id}')" title="حذف آزمون">🗑️</button>
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
                        <option value="true-false" ${type === 'true-false' ? 'selected' : ''}>درست / غلط</option>
                        <option value="fill-blank" ${type === 'fill-blank' ? 'selected' : ''}>جای خالی</option>
                        <option value="essay" ${type === 'essay' ? 'selected' : ''}>تشریحی</option>
                        <option value="matching" ${type === 'matching' ? 'selected' : ''}>تطبیقی (جور کردنی)</option>
                    </select>
                </div>
                <div class="exam-question-field">
                    <label>متن سوال (در صورت نیاز)</label>
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
            const safeOpt = escapeHtml(opt);
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
        const safeAnswer = data && data.answer ? escapeHtml(data.answer) : '';
        return `
            <div class="exam-question-field">
                <label>پاسخ صحیح (اختیاری، برای تصحیح خودکار)</label>
                <textarea class="exam-essay-answer" placeholder="پاسخ صحیح را وارد کنید...">${safeAnswer}</textarea>
            </div>
        `;
    } else if (type === 'fill-blank') {
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
    } else if (type === 'matching') {
        const pairs = data && data.pairs ? data.pairs : [{a: '', b: ''}, {a: '', b: ''}];
        let pairsHtml = '';
        pairs.forEach((pair, i) => {
            const safeA = escapeHtml(pair.a);
            const safeB = escapeHtml(pair.b);
            pairsHtml += `
                <div class="exam-matching-row" style="display:flex; gap:8px; margin-bottom:8px; align-items:center;">
                    <input type="text" class="exam-match-a form-control" placeholder="مفهوم (ستون ۱)" value="${safeA}">
                    <span>⬅️</span>
                    <input type="text" class="exam-match-b form-control" placeholder="مصداق (ستون ۲)" value="${safeB}">
                    <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()" title="حذف">✖</button>
                </div>
            `;
        });
        return `
            <div class="exam-question-field">
                <label>جفت‌های تطبیقی (حداقل ۲ جفت)</label>
                <div class="exam-matching-container">
                    ${pairsHtml}
                    <button type="button" class="btn btn-secondary btn-sm mt-4" onclick="addMatchingRow(this)">➕ افزودن جفت جدید</button>
                </div>
            </div>
        `;
    }
    return '';
}

window.addMatchingRow = function(btn) {
    const container = btn.closest('.exam-matching-container');
    const newRow = document.createElement('div');
    newRow.className = 'exam-matching-row';
    newRow.style = 'display:flex; gap:8px; margin-bottom:8px; align-items:center;';
    newRow.innerHTML = `
        <input type="text" class="exam-match-a form-control" placeholder="مفهوم (ستون ۱)">
        <span>⬅️</span>
        <input type="text" class="exam-match-b form-control" placeholder="مصداق (ستون ۲)">
        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()" title="حذف">✖</button>
    `;
    container.insertBefore(newRow, btn);
};

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

// ==========================================
// 5. ذخیره آزمون
// ==========================================
async function saveExam(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const editId = document.getElementById('examEditId').value;
    
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
        
        if (type !== 'matching' && !text) {
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
            
            optionRows.forEach((row) => {
                const optText = row.querySelector('.exam-option-text').value.trim();
                const isCorrect = row.querySelector('input[type="radio"]').checked;
                
                if (optText) {
                    if (isCorrect) correctIndex = options.length;
                    options.push(optText);
                }
            });
            
            if (options.length < 2) {
                showToast(`سوال ${toPersianNumber(index + 1)} باید حداقل ۲ گزینه داشته باشد.`, 'error');
                hasError = true;
                return;
            }
            
            const anyChecked = Array.from(optionRows).some(row => row.querySelector('input[type="radio"]').checked);
            if (!anyChecked) correctIndex = 0;

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
        } else if (type === 'matching') {
            const pairs = [];
            item.querySelectorAll('.exam-matching-row').forEach(row => {
                const a = row.querySelector('.exam-match-a').value.trim();
                const b = row.querySelector('.exam-match-b').value.trim();
                if (a && b) pairs.push({ a, b });
            });
            if (pairs.length < 2) {
                showToast(`سوال ${toPersianNumber(index + 1)} باید حداقل ۲ جفت معتبر داشته باشد.`, 'error');
                hasError = true;
                return;
            }
            questionData.pairs = pairs;
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
            const groupBadge = g ? `<span class="exam-grading-student-group">${escapeHtml(g.symbol)} ${escapeHtml(g.name)}</span>` : '';
            const currentScore = scoresMap[st.id] !== undefined ? scoresMap[st.id] : '';
            
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
           oninput="scheduleGradingStatsUpdate()">
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

function scheduleGradingStatsUpdate() {
    if (gradingStatsTimer) clearTimeout(gradingStatsTimer);
    gradingStatsTimer = setTimeout(() => {
        updateGradingStats();
    }, 150);
}

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
            input.classList.remove('has-value');
        } else if (value === 'max') {
            input.value = exam.maxScore;
            input.classList.add('has-value');
        } else {
            input.value = value;
            input.classList.add('has-value');
        }
    });
    if (gradingStatsTimer) clearTimeout(gradingStatsTimer);
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

// ==========================================
// ✅ توابع جدید: خروجی CSV، HTML تعاملی، چاپ و JSON آزمون
// ==========================================

async function exportExamCSV(examId) {
    const exam = await getDataById('exams', examId);
    if (!exam || !exam.questions || exam.questions.length === 0) {
        showToast('آزمون سوالی ندارد.', 'error');
        return;
    }

    const sub = window.allSubjectsData.find(s => s.id === exam.subjectId);
    const subName = sub ? sub.name : 'بدون درس';

    try {
        const safeCsv = (val) => {
            if (val === null || val === undefined) return '';
            let str = String(val);
            if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
                str = "'" + str;
            }
            return str.replace(/"/g, '""');
        };

        let csvContent = `عنوان آزمون:, "${safeCsv(exam.title)}"\n`;
        csvContent += `درس:, "${safeCsv(subName)}"\n`;
        csvContent += `تاریخ:, "${safeCsv(exam.date)}"\n`;
        csvContent += `نمره کل:, ${exam.maxScore}\n\n`;

        csvContent += "ردیف,متن سوال,نوع سوال,گزینه ۱,گزینه ۲,گزینه ۳,گزینه ۴,پاسخ صحیح,نمره\r\n";

        exam.questions.forEach((q, i) => {
            let typeName = '';
            let opt1 = '', opt2 = '', opt3 = '', opt4 = '';
            let correctAnswer = '';

            if (q.type === 'multiple-choice') {
                typeName = 'چندگزینه‌ای';
                if (q.options) {
                    opt1 = q.options[0] || '';
                    opt2 = q.options[1] || '';
                    opt3 = q.options[2] || '';
                    opt4 = q.options[3] || '';
                    correctAnswer = q.options[q.correctIndex] || '';
                }
            } else if (q.type === 'true-false') {
                typeName = 'درست/غلط';
                correctAnswer = q.correctAnswer ? 'درست' : 'غلط';
            } else if (q.type === 'fill-blank') {
                typeName = 'جای خالی';
                correctAnswer = q.answer || '';
            } else if (q.type === 'essay') {
                typeName = 'تشریحی';
                correctAnswer = q.answer || '';
            } else if (q.type === 'matching') {
                typeName = 'تطبیقی';
                if (q.pairs) {
                    correctAnswer = q.pairs.map(p => `${p.a} = ${p.b}`).join(' | ');
                }
            }

            csvContent += `${i + 1},"${safeCsv(q.text)}","${typeName}","${safeCsv(opt1)}","${safeCsv(opt2)}","${safeCsv(opt3)}","${safeCsv(opt4)}","${safeCsv(correctAnswer)}",${q.score}\r\n`;
        });

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const dateStr = (typeof window.getJalaliDateTimeForFilename === 'function') 
            ? window.getJalaliDateTimeForFilename().split('-').slice(0, 3).join('-') 
            : new Date().toISOString().slice(0, 10);

        a.href = url;
        a.download = `exam_${exam.title.replace(/\s+/g, '_')}_${dateStr}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('فایل CSV دانلود شد.', 'success');
    } catch (e) {
        console.error(e);
        showToast('خطا در تولید فایل اکسل.', 'error');
    }
}

// ۲. خروجی فایل HTML تعاملی (برگه امتحان هوشمند)
async function exportExamHTML(examId) {
    const exam = await getDataById('exams', examId);
    if (!exam || !exam.questions || exam.questions.length === 0) {
        showToast('آزمون سوالی ندارد.', 'error');
        return;
    }
    
    const sub = window.allSubjectsData.find(s => s.id === exam.subjectId);
    const subName = sub ? `${sub.symbol || ''} ${sub.name}` : 'بدون درس';

    // تبدیل سوالات تطبیقی به چندگزینه‌ای برای فایل HTML (مانند بازی)
    const htmlQuestions = [];
    exam.questions.forEach((q, index) => {
        if (q.type === 'matching' && q.pairs) {
            q.pairs.forEach((pair, pIndex) => {
                let options = [pair.b, ...q.pairs.filter((_, i) => i !== pIndex).map(p => p.b)];
                options = options.sort(() => Math.random() - 0.5);
                const correctIndex = options.indexOf(pair.b);
                const distributedScore = Math.round((q.score / q.pairs.length) * 100) / 100;
                htmlQuestions.push({
                    id: `q_${index}_${pIndex}`,
                    type: 'multiple-choice',
                    text: `مفهوم «${pair.a}» با کدام گزینه تطبیق دارد؟`,
                    options: options,
                    correctIndex: correctIndex,
                    score: distributedScore
                });
            });
        } else {
            htmlQuestions.push({ ...q, id: `q_${index}` });
        }
    });

    let questionsHtml = '';
    htmlQuestions.forEach((q, i) => {
        questionsHtml += `
            <div class="question-item" id="question_${i}" data-qindex="${i}">
                <div class="question-header">
                    <span class="question-number">سوال ${i + 1}</span>
                    <span class="question-score">${q.score} نمره</span>
                </div>
                <div class="question-text">${escapeHtml(q.text)}</div>
        `;

        if (q.type === 'multiple-choice' && q.options) {
            questionsHtml += `<div class="options-list">`;
            q.options.forEach((opt, optIdx) => {
                questionsHtml += `
                    <label class="option-item">
                        <input type="radio" name="q_${i}" value="${optIdx}">
                        <span class="option-text">${escapeHtml(opt)}</span>
                    </label>
                `;
            });
            questionsHtml += `</div>`;
        } else if (q.type === 'true-false') {
            questionsHtml += `
                <div class="options-list" style="flex-direction: row; gap: 30px; margin-top: 15px;">
                    <label class="option-item">
                        <input type="radio" name="q_${i}" value="true">
                        <span class="option-text">درست</span>
                    </label>
                    <label class="option-item">
                        <input type="radio" name="q_${i}" value="false">
                        <span class="option-text">غلط</span>
                    </label>
                </div>
            `;
        } else if (q.type === 'fill-blank') {
            questionsHtml += `
                <div style="margin-top: 15px;">
                    <input type="text" class="answer-input" id="input_q_${i}" placeholder="پاسخ خود را بنویسید...">
                </div>
            `;
        } else if (q.type === 'essay') {
            questionsHtml += `
                <div style="margin-top: 15px;">
                    <textarea class="answer-input" id="input_q_${i}" rows="4" placeholder="پاسخ خود را بنویسید..."></textarea>
                </div>
            `;
        }

        questionsHtml += `</div>`;
    });

    const jsonData = JSON.stringify(htmlQuestions).replace(/</g, '\\u003c');

    const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>آزمون تعاملی: ${escapeHtml(exam.title)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Vazirmatn', Tahoma, sans-serif; background: #f1f5f9; color: #1e293b; padding: 20px; line-height: 1.8; }
        .paper { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .header { text-align: center; border-bottom: 2px solid #4A90E2; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #4A90E2; margin: 0 0 10px 0; font-size: 1.8rem; }
        .header p { margin: 0; color: #64748b; font-size: 0.95rem; }
        .info-bar { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 25px; font-size: 0.9rem; }
        
        .question-item { margin-bottom: 30px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; page-break-inside: avoid; transition: all 0.3s; }
        .question-item.correct-border { border-color: #22c55e; background: #f0fdf4; }
        .question-item.wrong-border { border-color: #ef4444; background: #fef2f2; }
        .question-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .question-number { font-weight: bold; color: #4A90E2; }
        .question-score { background: #eef2ff; color: #4A90E2; padding: 2px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; }
        .question-text { font-size: 1.1rem; font-weight: bold; margin-bottom: 15px; }
        
        .options-list { display: flex; flex-direction: column; gap: 10px; }
        .option-item { display: flex; gap: 10px; align-items: center; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: background 0.2s; }
        .option-item:hover { background: #f8fafc; }
        .option-item input[type="radio"] { width: 18px; height: 18px; accent-color: #4A90E2; }
        .option-item.correct-answer { background: #dcfce7; border-color: #22c55e; color: #166534; font-weight: bold; }
        .option-item.wrong-answer { background: #fee2e2; border-color: #ef4444; color: #991b1b; text-decoration: line-through; }
        
        .answer-input { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 1rem; box-sizing: border-box; }
        .answer-input:focus { outline: none; border-color: #4A90E2; box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.2); }
        .answer-input.correct-input { border-color: #22c55e; background: #f0fdf4; }
        .answer-input.wrong-input { border-color: #ef4444; background: #fef2f2; }
        
        .correct-answer-text { display: none; margin-top: 10px; padding: 10px; background: #e0f2fe; color: #0369a1; border-radius: 8px; font-size: 0.9rem; border-right: 4px solid #0ea5e9; }
        
        .result-box { display: none; text-align: center; margin-top: 30px; padding: 25px; border-radius: 12px; background: linear-gradient(135deg, #4A90E2 0%, #357ABD 100%); color: white; box-shadow: 0 10px 25px rgba(74, 144, 226, 0.3); }
        .result-box h2 { margin: 0 0 10px 0; font-size: 2rem; }
        .result-box p { margin: 0; font-size: 1.2rem; opacity: 0.9; }
        
        .submit-btn { display: block; width: 100%; max-width: 300px; margin: 30px auto 0; padding: 15px; background: #22c55e; color: white; border: none; border-radius: 12px; font-size: 1.2rem; font-weight: bold; cursor: pointer; font-family: inherit; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3); transition: transform 0.2s; }
        .submit-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(34, 197, 94, 0.4); }
        .submit-btn:disabled { background: #94a3b8; cursor: not-allowed; transform: none; box-shadow: none; }
    </style>
</head>
<body>
    <div class="paper">
        <div class="header">
            <h1>${escapeHtml(exam.title)}</h1>
            <p>${escapeHtml(subName)}</p>
        </div>
        <div class="info-bar">
            <span><strong>تاریخ:</strong> ${toPersianNumber(exam.date)}</span>
            <span><strong>تعداد سوالات:</strong> ${toPersianNumber(htmlQuestions.length)}</span>
            <span><strong>نمره کل:</strong> ${toPersianNumber(exam.maxScore)}</span>
        </div>
        
        <div id="questions-container">
            ${questionsHtml}
        </div>
        
        <button class="submit-btn" id="submitBtn" onclick="submitExam()">✅ پایان و مشاهده نتیجه</button>
        
        <div class="result-box" id="resultBox">
            <h2 id="scoreText"></h2>
            <p id="percentText"></p>
        </div>
    </div>

    <script>
        const EXAM_QUESTIONS = ${jsonData};
        const MAX_SCORE = ${exam.maxScore};
        
        function normalizeText(str) {
            if (!str) return '';
            return str.toString()
                .trim()
                .toLowerCase()
                .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
                .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
                .replace(/ي/g, 'ی')
                .replace(/ك/g, 'ک')
                .replace(/\s+/g, ' ');
        }
        
        function submitExam() {
            let totalEarned = 0;
            let hasEssay = false;
            
            EXAM_QUESTIONS.forEach((q, i) => {
                const qItem = document.getElementById('question_' + i);
                let isCorrect = false;
                let isAnswered = false;
                
                if (q.type === 'multiple-choice') {
                    const selected = document.querySelector('input[name="q_' + i + '"]:checked');
                    if (selected) isAnswered = true;
                    const selectedVal = selected ? parseInt(selected.value) : -1;
                    
                    if (selectedVal === q.correctIndex) {
                        isCorrect = true;
                        totalEarned += q.score;
                    }
                    
                    qItem.querySelectorAll('.option-item').forEach((label, optIdx) => {
                        const radio = label.querySelector('input[type="radio"]');
                        if (optIdx === q.correctIndex) {
                            label.classList.add('correct-answer');
                        } else if (radio.checked) {
                            label.classList.add('wrong-answer');
                        }
                        radio.disabled = true;
                    });
                    
                } else if (q.type === 'true-false') {
                    const selected = document.querySelector('input[name="q_' + i + '"]:checked');
                    if (selected) isAnswered = true;
                    const selectedVal = selected ? (selected.value === 'true') : null;
                    
                    if (selectedVal === q.correctAnswer) {
                        isCorrect = true;
                        totalEarned += q.score;
                    }
                    
                    qItem.querySelectorAll('.option-item').forEach((label, optIdx) => {
                        const radio = label.querySelector('input[type="radio"]');
                        const val = radio.value === 'true';
                        if (val === q.correctAnswer) {
                            label.classList.add('correct-answer');
                        } else if (radio.checked) {
                            label.classList.add('wrong-answer');
                        }
                        radio.disabled = true;
                    });
                    
                } else if (q.type === 'fill-blank') {
                    const input = document.getElementById('input_q_' + i);
                    const userAns = normalizeText(input.value);
                    const correctAns = normalizeText(q.answer);
                    if (userAns) isAnswered = true;
                    
                    if (userAns && userAns === correctAns) {
                        isCorrect = true;
                        totalEarned += q.score;
                        input.classList.add('correct-input');
                    } else {
                        input.classList.add('wrong-input');
                        // نمایش پاسخ صحیح
                        const correctDiv = document.createElement('div');
                        correctDiv.className = 'correct-answer-text';
                        correctDiv.style.display = 'block';
                        correctDiv.innerHTML = '✍️ پاسخ صحیح: ' + escapeHtml(q.answer);
                        input.parentElement.appendChild(correctDiv);
                    }
                    input.disabled = true;
                    
                } else if (q.type === 'essay') {
                    hasEssay = true;
                    const input = document.getElementById('input_q_' + i);
                    if (input.value.trim()) isAnswered = true;
                    input.disabled = true;
                    
                    // برای تشریحی نمره خودکار نمی‌دهیم، فقط پاسخ صحیح را نشان می‌دهیم
                    if (q.answer) {
                        const correctDiv = document.createElement('div');
                        correctDiv.className = 'correct-answer-text';
                        correctDiv.style.display = 'block';
                        correctDiv.innerHTML = '📝 پاسخ پیشنهادی: ' + escapeHtml(q.answer);
                        input.parentElement.appendChild(correctDiv);
                    }
                }
                
                if (isCorrect || (q.type === 'essay' && isAnswered)) {
                    qItem.classList.add('correct-border');
                    if (q.type === 'essay') {
                        qItem.classList.remove('correct-border');
                        qItem.style.borderColor = '#4A90E2';
                    }
                } else if (!isCorrect && q.type !== 'essay') {
                    qItem.classList.add('wrong-border');
                }
            });
            
            const percent = Math.round((totalEarned / MAX_SCORE) * 100);
            
            const resultBox = document.getElementById('resultBox');
            const scoreText = document.getElementById('scoreText');
            const percentText = document.getElementById('percentText');
            
            resultBox.style.display = 'block';
            if (percent >= 50) resultBox.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
            else resultBox.style.background = 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)';
            
            scoreText.innerHTML = 'نمره شما: ' + totalEarned + ' از ' + MAX_SCORE;
            percentText.innerHTML = 'درصد موفقیت: ' + percent + '٪' + (hasEssay ? ' (سوالات تشریحی نیاز به تصحیح دستی دارند)' : '');
            
            document.getElementById('submitBtn').disabled = true;
            document.getElementById('submitBtn').innerHTML = 'آزمون تصحیح شد';
            
            resultBox.scrollIntoView({ behavior: 'smooth' });
        }
        
        function escapeHtml(str) {
            if (str === null || str === undefined) return '';
            return String(str).replace(/[&<>"']/g, function(m) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
            });
        }
    </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam_${exam.title.replace(/\s+/g, '_')}_interactive.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('فایل HTML تعاملی دانلود شد.', 'success');
}

// ۳. چاپ / خروجی PDF
async function printExam(examId) {
    const exam = await getDataById('exams', examId);
    if (!exam || !exam.questions || exam.questions.length === 0) {
        showToast('آزمون سوالی ندارد.', 'error');
        return;
    }

    const sub = window.allSubjectsData.find(s => s.id === exam.subjectId);
    const subName = sub ? `${sub.symbol || ''} ${sub.name}` : 'بدون درس';

    let html = `
        <div class="rc-header">
            <h2>${escapeHtml(exam.title)}</h2>
            <p>${escapeHtml(subName)} | تاریخ: ${toPersianNumber(exam.date)} | نمره کل: ${toPersianNumber(exam.maxScore)}</p>
        </div>
        <div style="margin-top: 20px;">
    `;

    exam.questions.forEach((q, i) => {
        html += `
            <div style="margin-bottom: 25px; page-break-inside: avoid;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: bold;">
                    <span>سوال ${toPersianNumber(i + 1)}</span>
                    <span style="color: #4A90E2; font-size: 0.85rem;">(${toPersianNumber(q.score)} نمره)</span>
                </div>
                <div style="font-size: 1.1rem; margin-bottom: 12px; font-weight: bold;">${escapeHtml(q.text)}</div>
        `;

        if (q.type === 'multiple-choice' && q.options) {
            html += `<div style="display: flex; flex-direction: column; gap: 8px; padding-right: 15px;">`;
            q.options.forEach((opt, optIdx) => {
                html += `
                    <div style="display: flex; gap: 10px;">
                        <span style="font-weight: bold;">${toPersianNumber(optIdx + 1)})</span>
                        <span>${escapeHtml(opt)}</span>
                    </div>
                `;
            });
            html += `</div>`;
        } else if (q.type === 'true-false') {
            html += `
                <div style="display: flex; gap: 40px; padding-right: 15px; margin-top: 10px;">
                    <div style="display: flex; gap: 8px;"><span style="font-weight: bold;">1)</span><span>درست</span></div>
                    <div style="display: flex; gap: 8px;"><span style="font-weight: bold;">2)</span><span>غلط</span></div>
                </div>
            `;
        } else if (q.type === 'fill-blank' || q.type === 'essay') {
            html += `<div style="min-height: 80px; border-bottom: 1px dashed #ccc; margin-top: 15px;"></div>`;
        } else if (q.type === 'matching' && q.pairs) {
            html += `
                <div style="margin-top: 15px; display: flex; gap: 20px; padding-right: 15px;">
                    <div style="flex: 1;">
                        <strong>ستون ۱:</strong>
                        <ul style="margin-top: 10px;">
                            ${q.pairs.map(p => `<li>${escapeHtml(p.a)}</li>`).join('')}
                        </ul>
                    </div>
                    <div style="flex: 1;">
                        <strong>ستون ۲:</strong>
                        <ul style="margin-top: 10px;">
                            ${q.pairs.map(p => `<li>${escapeHtml(p.b)}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }

        html += `</div>`;
    });

    html += `</div>`;

    if (typeof window.printHtmlContent === 'function') {
        window.printHtmlContent(html);
    } else {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="UTF-8"><title>چاپ آزمون</title></head><body>${html}</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
    }
}

// ۴. خروجی JSON
async function exportExamJSON(examId) {
    const exam = await getDataById('exams', examId);
    if (!exam || !exam.questions || exam.questions.length === 0) {
        showToast('آزمون سوالی ندارد.', 'error');
        return;
    }

    try {
        const mappedQuestions = [];
        exam.questions.forEach(q => {
            if (q.type === 'matching') {
                if (q.pairs) {
                    q.pairs.forEach(p => {
                        mappedQuestions.push({
                            type: 'dd',
                            a: p.a,
                            b: p.b
                        });
                    });
                }
            } else {
                const mapped = {};
                if (q.type === 'multiple-choice') {
                    mapped.type = 'mc';
                    mapped.q = q.text;
                    mapped.o0 = q.options[0] || '';
                    mapped.o1 = q.options[1] || '';
                    mapped.o2 = q.options[2] || '';
                    mapped.o3 = q.options[3] || '';
                    mapped.a = String(q.correctIndex);
                } else if (q.type === 'true-false') {
                    mapped.type = 'tf';
                    mapped.q = q.text;
                    mapped.a = q.correctAnswer ? "true" : "false";
                } else if (q.type === 'fill-blank') {
                    mapped.type = 'bl';
                    mapped.q = q.text;
                    mapped.a = q.answer || '';
                } else if (q.type === 'essay') {
                    mapped.type = 'de';
                    mapped.q = q.text;
                    mapped.a = q.answer || '';
                }
                mappedQuestions.push(mapped);
            }
        });

        const jsonString = JSON.stringify(mappedQuestions, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const dateStr = (typeof window.getJalaliDateTimeForFilename === 'function') 
            ? window.getJalaliDateTimeForFilename().split('-').slice(0, 3).join('-') 
            : new Date().toISOString().slice(0, 10);

        a.href = url;
        a.download = `exam_${exam.title.replace(/\s+/g, '_')}_${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast('فایل JSON با موفقیت دانلود شد.', 'success');
    } catch (e) {
        console.error(e);
        showToast('خطا در تولید فایل JSON.', 'error');
    }
}