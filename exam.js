// ==========================================
// فایل exam.js — منطق کامل تب آزمون‌ها (نسخه اصلاح‌شده با تقویم)
// ==========================================

window.allExamsData = [];
window.allExamResultsData = [];

let examQuestionCounter = 0;
let currentGradingExamId = null;

// *** متغیرهای وضعیت تقویم آزمون ***
let examCalendarState = {
    year: 1405,
    month: 7,
    selectedDate: ''
};

async function loadExamsData() {
    try {
        window.allExamsData = await getAllData('exams');
        window.allExamResultsData = await getAllData('examResults');
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
        container.innerHTML = '<p style="text-align:center; color:#64748b; padding: 20px;">هنوز آزمونی ثبت نشده است. با دکمه بالا اولین آزمون خود را بسازید.</p>';
        return;
    }

    const sortedExams = [...window.allExamsData].sort((a, b) => b.date.localeCompare(a.date));

    let html = '';
    sortedExams.forEach(exam => {
        const sub = window.allSubjectsData ? window.allSubjectsData.find(s => s.id === exam.subjectId) : null;
        const subName = sub ? `${sub.symbol || '📚'} ${sub.name}` : 'بدون درس';
        
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
                    <span class="exam-list-title">${exam.title}</span>
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
                    <button class="btn btn-primary btn-sm" onclick="openExamGradingModal(${exam.id})" title="ثبت نمرات">📝 ثبت نمرات</button>
                    <button class="btn btn-secondary btn-sm" onclick="generateGameFile(${exam.id})" title="تولید فایل بازی برای دانش‌آموز" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; border: none;">🎮 تولید بازی</button>
                    <button class="btn btn-secondary btn-sm" onclick="openExamEditorModal(${exam.id})" title="ویرایش آزمون">✏️ ویرایش</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteExam(${exam.id})" title="حذف آزمون">🗑️ حذف</button>
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

function isExamLeapYear(year) { return [1408, 1412, 1416].includes(year); }

function getExamDaysInMonth(year, month) {
    if (month <= 6) return 31;
    if (month <= 11) return 30;
    return isExamLeapYear(year) ? 30 : 29;
}

function getExamFirstDayOfWeek(year, month) {
    let daysPassed = 0;
    for (let y = 1405; y < year; y++) {
        daysPassed += isExamLeapYear(y) ? 366 : 365;
    }
    for (let m = 1; m < month; m++) {
        daysPassed += getExamDaysInMonth(year, m);
    }
    return daysPassed % 7;
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

    const firstDay = getExamFirstDayOfWeek(examCalendarState.year, examCalendarState.month);
    const daysInMonth = getExamDaysInMonth(examCalendarState.year, examCalendarState.month);
    
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
    
    // نمایش مناسبت زیر تقویم (اختیاری)
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
        window.allSubjectsData.map(s => `<option value="${s.id}">${s.symbol || ''} ${s.name}</option>`).join('');

    if (examId) {
        const exam = await getDataById('exams', examId);
        if (!exam) { showToast('آزمون یافت نشد.', 'error'); return; }
        
        titleEl.textContent = '✏️ ویرایش آزمون';
        document.getElementById('examEditId').value = exam.id;
        document.getElementById('examTitle').value = exam.title;
        document.getElementById('examSubject').value = exam.subjectId;
        document.getElementById('examMaxScore').value = exam.maxScore;
        
        // *** تنظیم تقویم بر اساس تاریخ آزمون ***
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
                    <textarea class="exam-question-text" placeholder="متن سوال را وارد کنید..." required>${questionData ? questionData.text : ''}</textarea>
                </div>
                <div class="exam-question-type-specific">
                    ${getQuestionTypeHtml(type, questionData)}
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

function getQuestionTypeHtml(type, data = null) {
    if (type === 'multiple-choice') {
        const options = data && data.options ? data.options : ['', '', '', ''];
        const correctIndex = data && data.correctIndex !== undefined ? data.correctIndex : 0;
        
        let optionsHtml = '';
        options.forEach((opt, i) => {
            optionsHtml += `
                <div class="exam-option-row">
                    <input type="radio" name="correct_${Date.now()}" ${i === correctIndex ? 'checked' : ''}>
                    <input type="text" class="exam-option-text" placeholder="گزینه ${toPersianNumber(i + 1)}" value="${opt}">
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
        return `
            <div class="exam-question-field">
                <label>پاسخ صحیح (اختیاری، برای تصحیح خودکار)</label>
                <textarea class="exam-essay-answer" placeholder="پاسخ صحیح را وارد کنید...">${data && data.answer ? data.answer : ''}</textarea>
            </div>
        `;
    } else if (type === 'fill-blank') {
        return `
            <div class="exam-question-field">
                <label>پاسخ جای خالی</label>
                <input type="text" class="exam-fill-answer" placeholder="پاسخ صحیح..." value="${data && data.answer ? data.answer : ''}">
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
    if (typeSpecificContainer) {
        typeSpecificContainer.innerHTML = getQuestionTypeHtml(type);
    }
}

function addExamOption(btn) {
    const container = btn.closest('.exam-options-container');
    const optionCount = container.querySelectorAll('.exam-option-row').length;
    
    const newRow = document.createElement('div');
    newRow.className = 'exam-option-row';
    newRow.innerHTML = `
        <input type="radio" name="correct_${Date.now()}">
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
    const title = document.getElementById('examTitle').value.trim();
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
            optionRows.forEach((row, i) => {
                const optText = row.querySelector('.exam-option-text').value.trim();
                const isCorrect = row.querySelector('input[type="radio"]').checked;
                if (optText) options.push(optText);
                if (isCorrect) correctIndex = i;
            });
            if (options.length < 2) {
                showToast(`سوال ${toPersianNumber(index + 1)} باید حداقل ۲ گزینه داشته باشد.`, 'error');
                hasError = true;
                return;
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
        examData.id = parseInt(editId);
    } else {
        examData.id = Date.now();
    }
    
    try {
        await saveData('exams', examData);
        showToast('آزمون با موفقیت ذخیره شد!', 'success');
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
            const groupBadge = g ? `<span class="exam-grading-student-group">${g.symbol} ${g.name}</span>` : '';
            const currentScore = scoresMap[st.id] !== undefined ? scoresMap[st.id] : '';
            
            container.innerHTML += `
                <div class="exam-grading-row" data-student-id="${st.id}">
                    <div class="exam-grading-student-info">
                        <span class="exam-grading-student-rank">${toPersianNumber(index + 1)}.</span>
                        <span class="exam-grading-student-name">${st.firstName} ${st.lastName}</span>
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
        
        for (const r of newResults) {
            r.id = Date.now() + Math.random();
            await saveData('examResults', r);
        }
        
        showToast(`نمرات ${toPersianNumber(newResults.length)} دانش‌آموز ذخیره شد!`, 'success');
        closeExamGradingModal();
        
        await loadExamsData();
        renderExamsData();
    } catch (e) {
        console.error(e);
        showToast('خطا در ذخیره نمرات.', 'error');
    }
}

// ==========================================
// 8. تولید فایل بازی برای دانش‌آموز (آفلاین)
// ==========================================
async function generateGameFile(examId) {
    const exam = await getDataById('exams', examId);
    if (!exam) {
        showToast('آزمون یافت نشد.', 'error');
        return;
    }
    
    if (!exam.questions || exam.questions.length === 0) {
        showToast('این آزمون هیچ سوالی ندارد. ابتدا سوالات را اضافه کنید.', 'error');
        return;
    }
    
    const sub = window.allSubjectsData.find(s => s.id === exam.subjectId);
    const subName = sub ? `${sub.symbol || ''} ${sub.name}` : 'بدون درس';
    
    const gameQuestions = exam.questions.map((q, index) => {
        const safeQuestion = {
            index: index + 1,
            type: q.type,
            text: q.text,
            score: q.score
        };
        
        if (q.type === 'multiple-choice') {
            safeQuestion.options = q.options;
        }
        
        return safeQuestion;
    });
    
    const gameHtml = buildGameHtml(exam, subName, gameQuestions);
    
    const blob = new Blob([gameHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `بازی_آزمون_${exam.title.replace(/\s+/g, '_')}_${exam.date.replace(/\//g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('فایل بازی با موفقیت تولید و دانلود شد! 🎮', 'success');
}

// ==========================================
// 9. ساخت HTML فایل بازی
// ==========================================
function buildGameHtml(exam, subName, questions) {
    const questionsJson = JSON.stringify(questions);
    
    return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>🎮 بازی آزمون: ${exam.title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body {
            margin: 0; padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: 'Vazirmatn', Tahoma, sans-serif;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 15px;
            direction: rtl;
        }
        .game-container {
            width: 100%;
            max-width: 600px;
            background: white;
            border-radius: 24px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
            animation: slideUp 0.5s ease-out;
        }
        @keyframes slideUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .game-header {
            background: linear-gradient(135deg, #4A90E2 0%, #357ABD 100%);
            color: white;
            padding: 25px 20px;
            text-align: center;
            position: relative;
        }
        .game-header h1 { margin: 0 0 5px 0; font-size: 1.4rem; }
        .game-header p { margin: 0; font-size: 0.9rem; opacity: 0.9; }
        .game-info-bar {
            display: flex;
            justify-content: space-around;
            background: rgba(255,255,255,0.15);
            padding: 10px;
            border-radius: 12px;
            margin-top: 15px;
            font-size: 0.85rem;
        }
        .game-body { padding: 25px 20px; }
        .progress-bar-outer {
            width: 100%;
            height: 10px;
            background: #e2e8f0;
            border-radius: 5px;
            margin-bottom: 20px;
            overflow: hidden;
        }
        .progress-bar-inner {
            height: 100%;
            background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
            border-radius: 5px;
            transition: width 0.4s ease;
        }
        .question-counter {
            text-align: center;
            font-size: 0.9rem;
            color: #64748b;
            margin-bottom: 15px;
            font-weight: bold;
        }
        .question-text {
            font-size: 1.15rem;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 20px;
            line-height: 1.8;
            padding: 15px;
            background: #f8fafc;
            border-radius: 12px;
            border-right: 4px solid #4A90E2;
        }
        .question-score-badge {
            display: inline-block;
            background: #fef3c7;
            color: #b45309;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 0.75rem;
            margin-bottom: 10px;
        }
        .options-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 20px;
        }
        .option-btn {
            background: white;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 15px;
            font-size: 1rem;
            font-family: inherit;
            color: #1e293b;
            cursor: pointer;
            text-align: right;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .option-btn:hover {
            border-color: #4A90E2;
            background: #eff6ff;
            transform: translateX(-4px);
        }
        .option-btn.selected {
            border-color: #4A90E2;
            background: #dbeafe;
            box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.2);
        }
        .option-btn.correct {
            border-color: #22c55e;
            background: #dcfce7;
        }
        .option-btn.wrong {
            border-color: #ef4444;
            background: #fee2e2;
        }
        .option-letter {
            width: 30px;
            height: 30px;
            background: #f1f5f9;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            flex-shrink: 0;
            color: #4A90E2;
        }
        .text-answer-input {
            width: 100%;
            padding: 15px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            font-size: 1rem;
            font-family: inherit;
            color: #1e293b;
            outline: none;
            transition: border-color 0.2s;
            margin-bottom: 15px;
        }
        .text-answer-input:focus {
            border-color: #4A90E2;
            box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.15);
        }
        .nav-buttons {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        .btn-nav {
            flex: 1;
            padding: 15px;
            border-radius: 12px;
            border: none;
            font-size: 1rem;
            font-weight: bold;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-next {
            background: linear-gradient(135deg, #4A90E2 0%, #357ABD 100%);
            color: white;
            box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
        }
        .btn-next:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(74, 144, 226, 0.4); }
        .btn-prev {
            background: #f1f5f9;
            color: #64748b;
        }
        .btn-prev:hover { background: #e2e8f0; }
        .btn-next:disabled, .btn-prev:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        .finish-screen {
            text-align: center;
            padding: 20px;
        }
        .finish-icon { font-size: 4rem; margin-bottom: 15px; animation: bounce 1s ease; }
        @keyframes bounce {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
        }
        .finish-title { font-size: 1.4rem; color: #16a34a; margin-bottom: 10px; }
        .finish-subtitle { color: #64748b; margin-bottom: 20px; }
        .code-box {
            background: #f8fafc;
            border: 2px dashed #4A90E2;
            border-radius: 12px;
            padding: 15px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
            font-size: 1.1rem;
            font-weight: bold;
            color: #4A90E2;
            word-break: break-all;
            letter-spacing: 1px;
        }
        .code-label { font-size: 0.85rem; color: #64748b; margin-bottom: 10px; }
        .copy-btn {
            background: #4A90E2;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 10px;
            cursor: pointer;
            font-family: inherit;
            font-size: 0.9rem;
            margin-bottom: 15px;
        }
        .copy-btn:hover { background: #357ABD; }
        .restart-btn {
            background: #f1f5f9;
            color: #64748b;
            border: none;
            padding: 12px 30px;
            border-radius: 10px;
            cursor: pointer;
            font-family: inherit;
            font-size: 0.95rem;
        }
    </style>
</head>
<body>
    <div class="game-container" id="gameContainer">
        <div class="game-header">
            <h1>🎮 ${exam.title}</h1>
            <p>${subName}</p>
            <div class="game-info-bar">
                <span>📅 ${exam.date}</span>
                <span>❓ ${questions.length} سوال</span>
                <span>🎯 ${exam.maxScore} نمره</span>
            </div>
        </div>
        <div class="game-body" id="gameBody">
            <!-- توسط JS پر می‌شود -->
        </div>
    </div>

    <script>
        const EXAM_DATA = {
            title: "${exam.title.replace(/"/g, '\\"')}",
            maxScore: ${exam.maxScore},
            questions: ${questionsJson}
        };
        
        let currentQuestionIndex = 0;
        let userAnswers = [];
        
        function initGame() {
            userAnswers = EXAM_DATA.questions.map(q => {
                if (q.type === 'multiple-choice') return -1;
                if (q.type === 'true-false') return null;
                return '';
            });
            renderQuestion();
        }
        
        function renderQuestion() {
            const body = document.getElementById('gameBody');
            const q = EXAM_DATA.questions[currentQuestionIndex];
            const total = EXAM_DATA.questions.length;
            const progress = ((currentQuestionIndex) / total) * 100;
            
            let questionHtml = '';
            
            if (q.type === 'multiple-choice') {
                questionHtml = '<div class="options-list">';
                q.options.forEach((opt, i) => {
                    const letters = ['الف', 'ب', 'ج', 'د', 'ه', 'و'];
                    const isSelected = userAnswers[currentQuestionIndex] === i;
                    questionHtml += \`
                        <button class="option-btn \${isSelected ? 'selected' : ''}" onclick="selectOption(\${i})">
                            <span class="option-letter">\${letters[i] || (i+1)}</span>
                            <span>\${opt}</span>
                        </button>
                    \`;
                });
                questionHtml += '</div>';
            } else if (q.type === 'true-false') {
                const selected = userAnswers[currentQuestionIndex];
                questionHtml = \`
                    <div class="options-list">
                        <button class="option-btn \${selected === true ? 'selected' : ''}" onclick="selectTrueFalse(true)">
                            <span class="option-letter">✅</span>
                            <span>درست</span>
                        </button>
                        <button class="option-btn \${selected === false ? 'selected' : ''}" onclick="selectTrueFalse(false)">
                            <span class="option-letter">❌</span>
                            <span>غلط</span>
                        </button>
                    </div>
                \`;
            } else {
                const currentAnswer = userAnswers[currentQuestionIndex] || '';
                questionHtml = \`
                    <input type="text" class="text-answer-input" 
                           placeholder="پاسخ خود را بنویسید..." 
                           value="\${currentAnswer}"
                           oninput="updateTextAnswer(this.value)">
                \`;
            }
            
            const isFirst = currentQuestionIndex === 0;
            const isLast = currentQuestionIndex === total - 1;
            
            body.innerHTML = \`
                <div class="progress-bar-outer">
                    <div class="progress-bar-inner" style="width: \${progress}%;"></div>
                </div>
                <div class="question-counter">سوال \${currentQuestionIndex + 1} از \${total}</div>
                <div class="question-text">
                    <span class="question-score-badge">\${q.score} نمره</span>
                    <br>
                    \${q.text}
                </div>
                \${questionHtml}
                <div class="nav-buttons">
                    <button class="btn-nav btn-prev" onclick="prevQuestion()" \${isFirst ? 'disabled' : ''}>▶ قبلی</button>
                    <button class="btn-nav btn-next" onclick="nextQuestion()">\${isLast ? '🏁 پایان آزمون' : 'بعدی ◀'}</button>
                </div>
            \`;
        }
        
        function selectOption(index) {
            userAnswers[currentQuestionIndex] = index;
            renderQuestion();
        }
        
        function selectTrueFalse(value) {
            userAnswers[currentQuestionIndex] = value;
            renderQuestion();
        }
        
        function updateTextAnswer(value) {
            userAnswers[currentQuestionIndex] = value;
        }
        
        function prevQuestion() {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                renderQuestion();
            }
        }
        
        function nextQuestion() {
            if (currentQuestionIndex < EXAM_DATA.questions.length - 1) {
                currentQuestionIndex++;
                renderQuestion();
            } else {
                showFinishScreen();
            }
        }
        
        function showFinishScreen() {
            const answersString = userAnswers.map(a => {
                if (a === null) return 'null';
                if (typeof a === 'string') return a.trim();
                return a;
            }).join('|');
            
            let hash = 0;
            const combined = EXAM_DATA.title + '|' + answersString;
            for (let i = 0; i < combined.length; i++) {
                const char = combined.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            const code = Math.abs(hash).toString(36).toUpperCase().substring(0, 8).padStart(8, '0');
            
            document.getElementById('gameBody').innerHTML = \`
                <div class="finish-screen">
                    <div class="finish-icon">🎉</div>
                    <div class="finish-title">آفرین! آزمون را به پایان رساندی.</div>
                    <div class="finish-subtitle">کد زیر را برای معلم خود بفرست تا نمره‌ات را ثبت کند.</div>
                    <div class="code-box" id="outputCode">\${code}</div>
                    <div class="code-label">کد خروجی (این کد را کپی کنید)</div>
                    <button class="copy-btn" onclick="copyCode('\${code}')">📋 کپی کد</button>
                    <br>
                    <button class="restart-btn" onclick="restartGame()">🔄 شروع مجدد</button>
                </div>
            \`;
        }
        
        function copyCode(code) {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(code).then(() => {
                    alert('✅ کد کپی شد!');
                });
            } else {
                const ta = document.createElement('textarea');
                ta.value = code;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                alert('✅ کد کپی شد!');
            }
        }
        
        function restartGame() {
            currentQuestionIndex = 0;
            initGame();
        }
        
        initGame();
    </script>
</body>
</html>`;
}