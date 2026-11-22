// ==========================================
// فایل exam.js — منطق کامل تب آزمون‌ها
// نسخه ارتقاء یافته با قابلیت بازی هوشمند و دریافت کد نتیجه امن
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

function b64DecodeUnicode(str) {
    try {
        return decodeURIComponent(Array.prototype.map.call(atob(str), function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    } catch (e) {
        console.error('Base64 Decode Error:', e);
        return atob(str);
    }
}

const SECRET_KEY = "KOSHA_SECURE_V1"; // کلید مخفی مشترک با game.js

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

    // ✅ اضافه کردن دکمه سراسری دریافت کد در بالای لیست
    let topHtml = `
        <div style="margin-bottom: 15px; padding: 15px; background: var(--card-bg); border-radius: var(--radius-md); border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div style="font-weight: bold; color: var(--text-main);">📥 ثبت خودکار نتایج با کد</div>
            <button type="button" class="btn btn-primary" onclick="openResultCodeModal()" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border: none;">📥 دریافت کد نتیجه</button>
        </div>
    `;

    if (!window.allExamsData || window.allExamsData.length === 0) {
        container.innerHTML = topHtml + `
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

    let html = topHtml;
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
                    <button class="btn btn-primary btn-sm" onclick="openExamGradingModal('${exam.id}')" title="ثبت نمرات دستی">📝 ثبت نمرات</button>
                    <button class="btn btn-secondary btn-sm" onclick="generateGameFile('${exam.id}', false)" title="بازی ساده (بدون لاگین)" style="background: #64748b; color: white; border: none;">🎮 بازی ساده</button>
                    <button class="btn btn-secondary btn-sm" onclick="generateGameFile('${exam.id}', true)" title="بازی هوشمند (با لاگین و کد نتیجه)" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; border: none;">🧠 بازی هوشمند</button>
                    <button class="btn btn-secondary btn-sm" onclick="exportExamCSV('${exam.id}')" title="خروجی اکسل">📗</button>
                    <button class="btn btn-secondary btn-sm" onclick="exportExamHTML('${exam.id}')" title="خروجی HTML">🌐</button>
                    <button class="btn btn-secondary btn-sm" onclick="printExam('${exam.id}')" title="چاپ / PDF">🖨️</button>
                    <button class="btn btn-secondary btn-sm" onclick="exportExamJSON('${exam.id}')" title="خروجی JSON">📄</button>
                    <button class="btn btn-secondary btn-sm" onclick="openExamEditorModal('${exam.id}')" title="ویرایش">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteExam('${exam.id}')" title="حذف">🗑️</button>
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
    try { localStorage.setItem('kosha-exam-cal', JSON.stringify(examCalendarState)); } catch (e) { }
}
function loadExamCalendarState() {
    try {
        const saved = localStorage.getItem('kosha-exam-cal');
        if (saved) { const parsed = JSON.parse(saved); if (parsed && parsed.year) examCalendarState = parsed; }
    } catch (e) { }
}
function initExamCalendar() {
    const ay = window.activeAcademicYear || '1405-1406';
    const [startYearStr] = ay.split('-');
    const startYear = parseInt(startYearStr);
    loadExamCalendarState();
    if (!examCalendarState.year || examCalendarState.year < startYear) {
        examCalendarState.year = startYear; examCalendarState.month = 7; examCalendarState.selectedDate = '';
    }
    const displayEl = document.getElementById('examDateDisplay');
    if (displayEl) {
        displayEl.textContent = examCalendarState.selectedDate ? toPersianNumber(examCalendarState.selectedDate) : 'انتخاب نشده';
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
    if (delta === -1 && examCalendarState.year === startYear && examCalendarState.month === 7) { showToast('ابتدای سال تحصیلی.', 'error'); return; }
    if (delta === 1 && examCalendarState.year === endYear && examCalendarState.month === 6) { showToast('انتهای سال تحصیلی.', 'error'); return; }
    examCalendarState.month += delta;
    if (examCalendarState.month < 1) { examCalendarState.month = 12; examCalendarState.year--; }
    else if (examCalendarState.month > 12) { examCalendarState.month = 1; examCalendarState.year++; }
    if (examCalendarState.year < startYear || examCalendarState.year > endYear) { showToast('خارج از بازه.', 'error'); return; }
    saveExamCalendarState(); renderExamCalendar();
}
function updateExamCalendarSelect(field, value) { examCalendarState[field] = parseInt(value); saveExamCalendarState(); renderExamCalendar(); }
function renderExamCalendar() {
    const titleEl = document.getElementById('exam-calendar-title'); if (!titleEl) return;
    titleEl.dataset.year = examCalendarState.year; titleEl.dataset.month = examCalendarState.month;
    const ay = window.activeAcademicYear || '1405-1406'; const [startY, endY] = ay.split('-');
    const monthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
    titleEl.innerHTML = `
        <select onchange="updateExamCalendarSelect('month', this.value)">
            ${monthNames.map((m, i) => `<option value="${i + 1}" ${examCalendarState.month === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
        <select onchange="updateExamCalendarSelect('year', this.value)">
            ${[parseInt(startY), parseInt(endY)].map(y => `<option value="${y}" ${examCalendarState.year === y ? 'selected' : ''}>${toPersianNumber(y)}</option>`).join('')}
        </select>
    `;
    const grid = document.getElementById('exam-calendar-grid'); if (!grid) return; grid.innerHTML = '';
    const firstDay = getJalaliFirstDayOfWeek(examCalendarState.year, examCalendarState.month);
    const daysInMonth = getJalaliDaysInMonth(examCalendarState.year, examCalendarState.month);
    const startBound = `${startY}/07/01`; const endBound = `${endY}/06/31`;
    for (let i = 0; i < firstDay; i++) { grid.innerHTML += `<div class="calendar-day empty"></div>`; }
    for (let day = 1; day <= daysInMonth; day++) {
        const isFriday = ((firstDay + day - 1) % 7) === 6;
        const dateStr = `${examCalendarState.year}/${String(examCalendarState.month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
        const inAcademicYear = (dateStr >= startBound && dateStr <= endBound);
        let classes = 'calendar-day'; if (isFriday) classes += ' holiday'; if (examCalendarState.selectedDate === dateStr) classes += ' selected'; if (!inAcademicYear) classes += ' outside-range';
        const clickHandler = inAcademicYear ? `onclick="selectExamCalendarDay('${dateStr}')"` : `onclick="showToast('خارج از بازه.', 'error')"`;
        grid.innerHTML += `<div class="${classes}" ${clickHandler}>${toPersianNumber(day)}</div>`;
    }
}
function selectExamCalendarDay(dateStr) {
    examCalendarState.selectedDate = dateStr; saveExamCalendarState();
    const displayEl = document.getElementById('examDateDisplay'); if (displayEl) displayEl.textContent = toPersianNumber(dateStr);
    const hiddenInput = document.getElementById('examDate'); if (hiddenInput) hiddenInput.value = dateStr;
    renderExamCalendar();
    const calendarBody = document.getElementById('exam-calendar-body');
    if (calendarBody) {
        const existingEventBox = calendarBody.querySelector('.exam-event-display'); if (existingEventBox) existingEventBox.remove();
        const eventText = (typeof getFormattedEventsForDate === 'function') ? getFormattedEventsForDate(dateStr) : '';
        if (eventText) {
            const eventBox = document.createElement('div'); eventBox.className = 'exam-event-display';
            eventBox.style.cssText = 'background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%); border: 1px solid #c4b5fd; border-radius: 8px; padding: 8px 10px; margin-top: 10px; font-size: 0.85rem; color: #5b21b6; display: flex; align-items: flex-start; gap: 6px;';
            eventBox.innerHTML = `<span>🎉</span><span>${eventText}</span>`; calendarBody.appendChild(eventBox);
        }
    }
}

// ==========================================
// 3. مودال سازنده آزمون
// ==========================================
async function openExamEditorModal(examId = null) {
    const modal = document.getElementById('exam-editor-modal'); const form = document.getElementById('exam-editor-form');
    const titleEl = document.getElementById('exam-editor-title'); const questionsContainer = document.getElementById('exam-questions-container');
    if (!modal || !form) { showToast('مودال یافت نشد.', 'error'); return; }
    form.reset(); questionsContainer.innerHTML = ''; examQuestionCounter = 0; document.getElementById('examEditId').value = '';
    const subjectSelect = document.getElementById('examSubject');
    subjectSelect.innerHTML = '<option value="" disabled selected>یک درس را انتخاب کنید...</option>' + window.allSubjectsData.map(s => `<option value="${s.id}">${escapeHtml(s.symbol || '')} ${escapeHtml(s.name)}</option>`).join('');
    if (examId) {
        const exam = await getDataById('exams', examId); if (!exam) { showToast('یافت نشد.', 'error'); return; }
        titleEl.textContent = '✏️ ویرایش آزمون'; document.getElementById('examEditId').value = exam.id; document.getElementById('examTitle').value = exam.title;
        document.getElementById('examSubject').value = exam.subjectId; document.getElementById('examMaxScore').value = exam.maxScore;
        if (exam.date && /^\d{4}\/\d{2}\/\d{2}$/.test(exam.date)) {
            const parts = exam.date.split('/'); examCalendarState.year = parseInt(parts[0]); examCalendarState.month = parseInt(parts[1]); examCalendarState.selectedDate = exam.date;
        }
        if (exam.questions && exam.questions.length > 0) { exam.questions.forEach(q => addExamQuestion(q)); }
    } else {
        titleEl.textContent = '➕ ساخت آزمون جدید'; examCalendarState.selectedDate = ''; addExamQuestion();
    }
    initExamCalendar(); modal.classList.add('show');
}
function closeExamEditorModal() { const modal = document.getElementById('exam-editor-modal'); if (modal) modal.classList.remove('show'); }

function addExamQuestion(questionData = null) {
    const container = document.getElementById('exam-questions-container'); if (!container) return;
    examQuestionCounter++; const questionId = 'q_' + Date.now() + '_' + examQuestionCounter; const type = questionData ? questionData.type : 'multiple-choice';
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
                <div class="exam-question-type-specific">${getQuestionTypeHtml(type, questionData, questionId)}</div>
                <div class="exam-question-score-row">
                    <label>نمره سوال:</label>
                    <input type="number" class="exam-question-score" min="0.25" step="0.25" value="${questionData ? questionData.score : 1}" required>
                </div>
            </div>
        </div>
    `; container.insertAdjacentHTML('beforeend', questionHtml); updateQuestionNumbers();
}
function getQuestionTypeHtml(type, data = null, qid = 'default_qid') {
    if (type === 'multiple-choice') {
        const options = data && data.options ? data.options : ['', '', '', '']; const correctIndex = data && data.correctIndex !== undefined ? data.correctIndex : 0;
        let optionsHtml = '';
        options.forEach((opt, i) => {
            optionsHtml += `<div class="exam-option-row"><input type="radio" name="correct_${qid}" ${i === correctIndex ? 'checked' : ''}><input type="text" class="exam-option-text" placeholder="گزینه ${toPersianNumber(i + 1)}" value="${escapeHtml(opt)}"><button type="button" class="exam-option-delete" onclick="removeExamOption(this)" title="حذف گزینه">🗑️</button></div>`;
        });
        return `<div class="exam-question-field"><label>گزینه‌ها (گزینه صحیح را انتخاب کنید)</label><div class="exam-options-container">${optionsHtml}<button type="button" class="exam-add-option-btn" onclick="addExamOption(this)">➕ افزودن گزینه</button></div></div>`;
    } else if (type === 'essay') {
        return `<div class="exam-question-field"><label>پاسخ صحیح (اختیاری)</label><textarea class="exam-essay-answer" placeholder="پاسخ صحیح...">${data && data.answer ? escapeHtml(data.answer) : ''}</textarea></div>`;
    } else if (type === 'fill-blank') {
        return `<div class="exam-question-field"><label>پاسخ جای خالی</label><input type="text" class="exam-fill-answer" placeholder="پاسخ صحیح..." value="${data && data.answer ? escapeHtml(data.answer) : ''}"></div>`;
    } else if (type === 'true-false') {
        const correctAnswer = data && data.correctAnswer !== undefined ? data.correctAnswer : true;
        return `<div class="exam-question-field"><label>پاسخ صحیح</label><select class="exam-tf-answer"><option value="true" ${correctAnswer === true ? 'selected' : ''}>درست ✅</option><option value="false" ${correctAnswer === false ? 'selected' : ''}>غلط ❌</option></select></div>`;
    } else if (type === 'matching') {
        const pairs = data && data.pairs ? data.pairs : [{a: '', b: ''}, {a: '', b: ''}];
        let pairsHtml = '';
        pairs.forEach((pair) => { pairsHtml += `<div class="exam-matching-row" style="display:flex; gap:8px; margin-bottom:8px; align-items:center;"><input type="text" class="exam-match-a form-control" placeholder="مفهوم (ستون ۱)" value="${escapeHtml(pair.a)}"><span>⬅️</span><input type="text" class="exam-match-b form-control" placeholder="مصداق (ستون ۲)" value="${escapeHtml(pair.b)}"><button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()" title="حذف">✖</button></div>`; });
        return `<div class="exam-question-field"><label>جفت‌های تطبیقی (حداقل ۲ جفت)</label><div class="exam-matching-container">${pairsHtml}<button type="button" class="btn btn-secondary btn-sm mt-4" onclick="addMatchingRow(this)">➕ افزودن جفت جدید</button></div></div>`;
    }
    return '';
}
window.addMatchingRow = function(btn) {
    const container = btn.closest('.exam-matching-container'); const newRow = document.createElement('div');
    newRow.className = 'exam-matching-row'; newRow.style = 'display:flex; gap:8px; margin-bottom:8px; align-items:center;';
    newRow.innerHTML = `<input type="text" class="exam-match-a form-control" placeholder="مفهوم (ستون ۱)"><span>⬅️</span><input type="text" class="exam-match-b form-control" placeholder="مصداق (ستون ۲)"><button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()" title="حذف">✖</button>`;
    container.insertBefore(newRow, btn);
};
function changeQuestionType(selectEl) { const questionItem = selectEl.closest('.exam-question-item'); const typeSpecificContainer = questionItem.querySelector('.exam-question-type-specific'); const qid = questionItem.getAttribute('data-qid') || 'default_qid'; if (typeSpecificContainer) typeSpecificContainer.innerHTML = getQuestionTypeHtml(selectEl.value, null, qid); }
function addExamOption(btn) { const container = btn.closest('.exam-options-container'); const questionItem = btn.closest('.exam-question-item'); const qid = questionItem ? questionItem.getAttribute('data-qid') : 'default_qid'; const optionCount = container.querySelectorAll('.exam-option-row').length; const newRow = document.createElement('div'); newRow.className = 'exam-option-row'; newRow.innerHTML = `<input type="radio" name="correct_${qid}"><input type="text" class="exam-option-text" placeholder="گزینه ${toPersianNumber(optionCount + 1)}"><button type="button" class="exam-option-delete" onclick="removeExamOption(this)" title="حذف گزینه">🗑️</button>`; container.insertBefore(newRow, btn); }
function removeExamOption(btn) { const container = btn.closest('.exam-options-container'); if (container.querySelectorAll('.exam-option-row').length <= 2) { showToast('حداقل ۲ گزینه.', 'error'); return; } btn.closest('.exam-option-row').remove(); }
function removeExamQuestion(btn) { if (!confirm('حذف سوال؟')) return; btn.closest('.exam-question-item').remove(); updateQuestionNumbers(); }
function updateQuestionNumbers() { document.querySelectorAll('#exam-questions-container .exam-question-item').forEach((q, index) => { const numEl = q.querySelector('.exam-question-number'); if (numEl) numEl.textContent = `سوال ${toPersianNumber(index + 1)}`; }); }

async function saveExam(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    const editId = document.getElementById('examEditId').value;
    let title; try { title = sanitizeInput(document.getElementById('examTitle').value, 150); } catch (err) { showToast(err.message, 'error'); return; }
    const subjectId = parseInt(document.getElementById('examSubject').value); const date = document.getElementById('examDate').value.trim(); const maxScore = parseFloat(document.getElementById('examMaxScore').value);
    if (!title) { showToast('عنوان الزامی است.', 'error'); return; } if (!subjectId || isNaN(subjectId)) { showToast('درس الزامی است.', 'error'); return; } if (!/^\d{4}\/\d{2}\/\d{2}$/.test(date)) { showToast('تاریخ الزامی است.', 'error'); return; } if (isNaN(maxScore) || maxScore <= 0) { showToast('نمره معتبر نیست.', 'error'); return; }
    const questionItems = document.querySelectorAll('#exam-questions-container .exam-question-item'); if (questionItems.length === 0) { showToast('حداقل یک سوال.', 'error'); return; }
    const questions = []; let totalQuestionScores = 0; let hasError = false;
    questionItems.forEach((item, index) => {
        const type = item.querySelector('.exam-question-type').value; const text = item.querySelector('.exam-question-text').value.trim(); const score = parseFloat(item.querySelector('.exam-question-score').value);
        if (type !== 'matching' && !text) { showToast(`متن سوال ${index + 1} الزامی است.`, 'error'); hasError = true; return; }
        if (isNaN(score) || score <= 0) { showToast(`نمره سوال ${index + 1} معتبر نیست.`, 'error'); hasError = true; return; }
        totalQuestionScores += score;
        const questionData = { id: 'q_' + Date.now() + '_' + index, type: type, text: text, score: score };
        if (type === 'multiple-choice') {
            const options = []; let correctIndex = 0; const optionRows = item.querySelectorAll('.exam-option-row');
            optionRows.forEach((row) => { const optText = row.querySelector('.exam-option-text').value.trim(); const isCorrect = row.querySelector('input[type="radio"]').checked; if (optText) { if (isCorrect) correctIndex = options.length; options.push(optText); } });
            if (options.length < 2) { showToast(`سوال ${index + 1} نیاز به ۲ گزینه دارد.`, 'error'); hasError = true; return; }
            const anyChecked = Array.from(optionRows).some(row => row.querySelector('input[type="radio"]').checked); if (!anyChecked) correctIndex = 0;
            questionData.options = options; questionData.correctIndex = correctIndex;
        } else if (type === 'essay') { questionData.answer = item.querySelector('.exam-essay-answer') ? item.querySelector('.exam-essay-answer').value.trim() : ''; }
        else if (type === 'fill-blank') { questionData.answer = item.querySelector('.exam-fill-answer') ? item.querySelector('.exam-fill-answer').value.trim() : ''; }
        else if (type === 'true-false') { const answerEl = item.querySelector('.exam-tf-answer'); questionData.correctAnswer = answerEl ? (answerEl.value === 'true') : true; }
        else if (type === 'matching') {
            const pairs = []; item.querySelectorAll('.exam-matching-row').forEach(row => { const a = row.querySelector('.exam-match-a').value.trim(); const b = row.querySelector('.exam-match-b').value.trim(); if (a && b) pairs.push({ a, b }); });
            if (pairs.length < 2) { showToast(`سوال ${index + 1} نیاز به ۲ جفت دارد.`, 'error'); hasError = true; return; }
            questionData.pairs = pairs;
        }
        questions.push(questionData);
    });
    if (hasError) return;
    if (totalQuestionScores > maxScore) { if (!confirm(`مجموع نمرات سوالات (${totalQuestionScores}) از نمره کل (${maxScore}) بیشتر است. مطمئنید؟`)) return; }
    const examData = { title: title, subjectId: subjectId, date: date, maxScore: maxScore, questions: questions, academicYear: window.activeAcademicYear };
    if (editId) { examData.id = editId; const existing = await getDataById('exams', editId); if (existing && existing.academicYear) examData.academicYear = existing.academicYear; } else { examData.id = generateUniqueId(); }
    try {
        await saveData('exams', examData); showToast('آزمون ذخیره شد!', 'success'); if (typeof clearFormDirty === 'function') clearFormDirty(); closeExamEditorModal(); await loadExamsData(); renderExamsData();
    } catch (e) { showToast('خطا در ذخیره.', 'error'); }
}

async function deleteExam(examId) {
    if (!confirm('حذف آزمون و تمام نتایج؟')) return;
    try {
        await deleteData('exams', examId); const results = window.allExamResultsData.filter(r => r.examId === examId);
        for (const result of results) { await deleteData('examResults', result.id); }
        showToast('آزمون حذف شد.', 'success'); await loadExamsData(); renderExamsData();
    } catch (e) { showToast('خطا در حذف.', 'error'); }
}

// ==========================================
// 4. ثبت نمرات دستی
// ==========================================
async function openExamGradingModal(examId) {
    const modal = document.getElementById('exam-grading-modal'); if (!modal) return;
    const exam = await getDataById('exams', examId); if (!exam) return;
    currentGradingExamId = examId;
    const sub = window.allSubjectsData.find(s => s.id === exam.subjectId);
    document.getElementById('grading-exam-title').textContent = exam.title;
    document.getElementById('grading-exam-subject').textContent = sub ? `${sub.symbol || ''} ${sub.name}` : 'بدون درس';
    document.getElementById('grading-exam-date').textContent = toPersianNumber(exam.date);
    document.getElementById('grading-exam-max').textContent = toPersianNumber(exam.maxScore);
    const existingResults = window.allExamResultsData.filter(r => r.examId === examId);
    const scoresMap = {}; existingResults.forEach(r => { scoresMap[r.studentId] = r.score; });
    const container = document.getElementById('exam-grading-students-list');
    if (!window.allStudentsData || window.allStudentsData.length === 0) { container.innerHTML = '<p>هیچ دانش‌آموزی نیست.</p>'; } 
    else {
        container.innerHTML = '';
        window.allStudentsData.forEach((st, index) => {
            const g = window.allGroupsData.find(x => x.id === st.groupId); const groupBadge = g ? `<span class="exam-grading-student-group">${escapeHtml(g.symbol)} ${escapeHtml(g.name)}</span>` : '';
            const currentScore = scoresMap[st.id] !== undefined ? scoresMap[st.id] : '';
            container.innerHTML += `
                <div class="exam-grading-row" data-student-id="${st.id}">
                    <div class="exam-grading-student-info">
                        <span class="exam-grading-student-rank">${toPersianNumber(index + 1)}.</span>
                        <span class="exam-grading-student-name">${escapeHtml(st.firstName)} ${escapeHtml(st.lastName)}</span>${groupBadge}
                    </div>
                    <div class="exam-grading-score-wrapper">
                        <input type="number" class="exam-grading-score-input ${currentScore !== '' ? 'has-value' : ''}" data-student-id="${st.id}" min="0" max="${exam.maxScore}" step="0.25" value="${currentScore}" placeholder="نمره" oninput="scheduleGradingStatsUpdate()">
                        <span class="exam-grading-score-max">از ${toPersianNumber(exam.maxScore)}</span>
                    </div>
                </div>`;
        });
    }
    updateGradingStats(); modal.classList.add('show');
}
function closeExamGradingModal() { document.getElementById('exam-grading-modal').classList.remove('show'); currentGradingExamId = null; if (typeof clearFormDirty === 'function') clearFormDirty(); }
function scheduleGradingStatsUpdate() { if (gradingStatsTimer) clearTimeout(gradingStatsTimer); gradingStatsTimer = setTimeout(() => { updateGradingStats(); }, 150); }
function updateGradingStats() {
    const inputs = document.querySelectorAll('.exam-grading-score-input'); const scores = [];
    inputs.forEach(input => { const val = parseFloat(input.value); if (!isNaN(val) && val >= 0) { scores.push(val); input.classList.add('has-value'); } else input.classList.remove('has-value'); });
    const avgEl = document.getElementById('grading-stat-avg'); const maxEl = document.getElementById('grading-stat-max'); const minEl = document.getElementById('grading-stat-min');
    if (scores.length === 0) { if (avgEl) avgEl.textContent = '-'; if (maxEl) maxEl.textContent = '-'; if (minEl) minEl.textContent = '-'; return; }
    if (avgEl) avgEl.textContent = toPersianNumber((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
    if (maxEl) maxEl.textContent = toPersianNumber(Math.max(...scores)); if (minEl) minEl.textContent = toPersianNumber(Math.min(...scores));
}
function setAllExamScores(value) {
    const exam = window.allExamsData.find(e => e.id === currentGradingExamId); if (!exam) return;
    document.querySelectorAll('.exam-grading-score-input').forEach(input => {
        if (value === 'clear') { input.value = ''; input.classList.remove('has-value'); } 
        else if (value === 'max') { input.value = exam.maxScore; input.classList.add('has-value'); } 
        else { input.value = value; input.classList.add('has-value'); }
    });
    if (gradingStatsTimer) clearTimeout(gradingStatsTimer); updateGradingStats();
}
async function saveExamGrades() {
    if (!currentGradingExamId) return; const exam = window.allExamsData.find(e => e.id === currentGradingExamId); if (!exam) return;
    const inputs = document.querySelectorAll('.exam-grading-score-input'); const newResults = []; let hasError = false;
    inputs.forEach(input => {
        const studentId = parseInt(input.getAttribute('data-student-id')); const rawValue = input.value.trim(); if (rawValue === '') return;
        const score = parseFloat(rawValue); if (isNaN(score) || score < 0) { hasError = true; return; } if (score > exam.maxScore) { hasError = true; return; }
        newResults.push({ examId: currentGradingExamId, studentId: studentId, score: score, academicYear: window.activeAcademicYear });
    });
    if (hasError) { showToast('نمرات نامعتبر.', 'error'); return; }
    try {
        const oldResults = window.allExamResultsData.filter(r => r.examId === currentGradingExamId); for (const r of oldResults) await deleteData('examResults', r.id);
        for (let i = 0; i < newResults.length; i++) { newResults[i].id = generateUniqueId(); await saveData('examResults', newResults[i]); }
        showToast(`نمرات ${newResults.length} دانش‌آموز ذخیره شد.`, 'success'); if (typeof clearFormDirty === 'function') clearFormDirty();
        closeExamGradingModal(); await loadExamsData(); renderExamsData();
    } catch (e) { showToast('خطا در ذخیره.', 'error'); }
}

// ==========================================
// 5. مودال سراسری دریافت کد نتیجه
// ==========================================
function initResultCodeModal() {
    if (document.getElementById('result-code-modal')) return;
    const modalHtml = `
        <div id="result-code-modal" class="modal-overlay">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header" style="color: #7c3aed;">📥 دریافت کد نتیجه</div>
                <div style="padding: 10px 0;">
                    <p style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 15px; text-align: center;">
                        کدی که دانش‌آموز پس از پایان بازی برای شما ارسال کرده است را در کادر زیر پیست کنید. سیستم به صورت خودکار آزمون و دانش‌آموز را پیدا کرده و نمره را ثبت می‌کند.
                    </p>
                    <textarea id="resultCodeInput" class="form-control" rows="5" placeholder="کد را اینجا پیست کنید (با KOSHA- شروع می‌شود)..." style="font-family: monospace; font-size: 0.9rem; text-align: left; direction: ltr;"></textarea>
                    <div id="resultCodeStatus" style="margin-top: 10px; font-size: 0.85rem; text-align: center; display: none; padding: 10px; border-radius: 8px;"></div>
                </div>
                <div class="modal-footer" style="margin-top: 10px; display: flex; gap: 10px;">
                    <button type="button" class="btn btn-secondary" style="flex: 1;" onclick="closeResultCodeModal()">انصراف</button>
                    <button type="button" class="btn btn-primary" style="flex: 2; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border: none;" id="btnProcessCode" onclick="processResultCode()">ثبت نتیجه ✅</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}
// فراخوانی تابع ساخت مودال هنگام لود
document.addEventListener('DOMContentLoaded', initResultCodeModal);

function openResultCodeModal() {
    initResultCodeModal();
    document.getElementById('resultCodeInput').value = '';
    document.getElementById('resultCodeStatus').style.display = 'none';
    document.getElementById('result-code-modal').classList.add('show');
}
function closeResultCodeModal() {
    document.getElementById('result-code-modal').classList.remove('show');
}

async function verifyHMAC(message, secret, signatureBase64) {
    try {
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey(
            "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
        );
        const signature = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));
        return await crypto.subtle.verify("HMAC", key, signature, enc.encode(message));
    } catch (e) {
        console.error('HMAC Error:', e);
        return false;
    }
}

async function processResultCode() {
    const code = document.getElementById('resultCodeInput').value.trim();
    const statusEl = document.getElementById('resultCodeStatus');
    const btn = document.getElementById('btnProcessCode');

    if (!code.startsWith("KOSHA-")) {
        statusEl.style.display = 'block'; statusEl.style.background = '#fee2e2'; statusEl.style.color = '#b91c1c';
        statusEl.innerText = '❌ کد نامعتبر است. (باید با KOSHA- شروع شود)'; return;
    }

    btn.innerText = "⏳ در حال بررسی...";
    btn.disabled = true;

    try {
        if (!crypto || !crypto.subtle) {
            throw new Error("مرورگر شما از Web Crypto API پشتیبانی نمی‌کند.");
        }

        const base64Data = code.replace("KOSHA-", "");
        // رمزگشایی امن از Base64
        const jsonStr = b64DecodeUnicode(base64Data);
        const parsed = JSON.parse(jsonStr);
        
        if (!parsed.p || !parsed.s) throw new Error('ساختار کد ناقص است.');

        // ۱. بررسی امضای دیجیتال
        const isValid = await verifyHMAC(parsed.p, SECRET_KEY, parsed.s);
        if (!isValid) {
            statusEl.style.display = 'block'; statusEl.style.background = '#fee2e2'; statusEl.style.color = '#b91c1c';
            statusEl.innerText = '❌ امضای دیجیتال نامعتبر است. کد دستکاری شده است.'; return;
        }

        const payload = JSON.parse(parsed.p);

        // ۲. پیدا کردن دانش‌آموز
        const student = window.allStudentsData.find(s => s.nationalId === payload.studentNationalId);
        if (!student) {
            statusEl.style.display = 'block'; statusEl.style.background = '#fef3c7'; statusEl.style.color = '#b45309';
            statusEl.innerText = `⚠️ دانش‌آموز با کد ملی ${payload.studentNationalId} یافت نشد.`; return;
        }

        // ۳. پیدا کردن آزمون
        const exam = window.allExamsData.find(e => e.id === payload.examId);
        if (!exam) {
            statusEl.style.display = 'block'; statusEl.style.background = '#fef3c7'; statusEl.style.color = '#b45309';
            statusEl.innerText = `⚠️ آزمون مرتبط با این کد یافت نشد.`; return;
        }

        // ۴. ذخیره در دیتابیس
        const existing = window.allExamResultsData.find(r => r.examId === payload.examId && r.studentId === student.id);
        const newResult = {
            id: existing ? existing.id : generateUniqueId(),
            examId: payload.examId,
            studentId: student.id,
            score: payload.totalScore,
            academicYear: window.activeAcademicYear,
            details: payload.history
        };

        await saveData('examResults', newResult);
        await loadExamsData();
        renderExamsData();

        statusEl.style.display = 'block'; statusEl.style.background = '#dcfce7'; statusEl.style.color = '#166534';
        statusEl.innerText = `✅ نمره ${payload.totalScore} برای «${student.firstName} ${student.lastName}» در آزمون «${exam.title}» ثبت شد.`;

        setTimeout(() => {
            closeResultCodeModal();
            showToast('نتیجه با موفقیت ثبت شد.', 'success');
        }, 2500);

    } catch (e) {
        console.error(e);
        statusEl.style.display = 'block'; statusEl.style.background = '#fee2e2'; statusEl.style.color = '#b91c1c';
        statusEl.innerText = '❌ خطا در خواندن کد: ' + e.message;
    } finally {
        btn.innerText = "ثبت نتیجه ✅";
        btn.disabled = false;
    }
}


// ==========================================
// توابع خروجی (CSV, HTML, JSON, Print)
// ==========================================

async function exportExamCSV(examId) {
    const exam = await getDataById('exams', examId); if (!exam) return;
    const sub = window.allSubjectsData.find(s => s.id === exam.subjectId); const subName = sub ? sub.name : 'بدون درس';
    try {
        const safeCsv = (val) => { if (val === null || val === undefined) return ''; let str = String(val); if (/^[=+\-@]/.test(str)) str = "'" + str; return str.replace(/"/g, '""'); };
        let csvContent = `عنوان آزمون:, "${safeCsv(exam.title)}"\nدرس:, "${safeCsv(subName)}"\nتاریخ:, "${safeCsv(exam.date)}"\nنمره کل:, ${exam.maxScore}\n\n`;
        csvContent += "ردیف,متن سوال,نوع سوال,گزینه ۱,گزینه ۲,گزینه ۳,گزینه ۴,پاسخ صحیح,نمره\r\n";
        exam.questions.forEach((q, i) => {
            let typeName = ''; let opt1 = '', opt2 = '', opt3 = '', opt4 = ''; let correctAnswer = '';
            if (q.type === 'multiple-choice') { typeName = 'چندگزینه‌ای'; if (q.options) { opt1 = q.options[0] || ''; opt2 = q.options[1] || ''; opt3 = q.options[2] || ''; opt4 = q.options[3] || ''; correctAnswer = q.options[q.correctIndex] || ''; } }
            else if (q.type === 'true-false') { typeName = 'درست/غلط'; correctAnswer = q.correctAnswer ? 'درست' : 'غلط'; }
            else if (q.type === 'fill-blank') { typeName = 'جای خالی'; correctAnswer = q.answer || ''; }
            else if (q.type === 'essay') { typeName = 'تشریحی'; correctAnswer = q.answer || ''; }
            else if (q.type === 'matching') { typeName = 'تطبیقی'; if (q.pairs) correctAnswer = q.pairs.map(p => `${p.a} = ${p.b}`).join(' | '); }
            csvContent += `${i + 1},"${safeCsv(q.text)}","${typeName}","${safeCsv(opt1)}","${safeCsv(opt2)}","${safeCsv(opt3)}","${safeCsv(opt4)}","${safeCsv(correctAnswer)}",${q.score}\r\n`;
        });
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a');
        const dateStr = (typeof window.getJalaliDateTimeForFilename === 'function') ? window.getJalaliDateTimeForFilename().split('-').slice(0, 3).join('-') : new Date().toISOString().slice(0, 10);
        a.href = url; a.download = `exam_${exam.title.replace(/\s+/g, '_')}_${dateStr}.csv`; a.click(); URL.revokeObjectURL(url);
        showToast('CSV دانلود شد.', 'success');
    } catch (e) { showToast('خطا در CSV.', 'error'); }
}

async function exportExamHTML(examId) {
    const exam = await getDataById('exams', examId); if (!exam) return;
    const sub = window.allSubjectsData.find(s => s.id === exam.subjectId); const subName = sub ? sub.name : 'بدون درس';
    const htmlQuestions = [];
    exam.questions.forEach((q, index) => {
        if (q.type === 'matching' && q.pairs) {
            q.pairs.forEach((pair, pIndex) => {
                let options = [pair.b, ...q.pairs.filter((_, i) => i !== pIndex).map(p => p.b)]; options = options.sort(() => Math.random() - 0.5);
                htmlQuestions.push({ id: `q_${index}_${pIndex}`, type: 'multiple-choice', text: `مفهوم «${pair.a}» با کدام تطبیق دارد؟`, options: options, correctIndex: options.indexOf(pair.b), score: Math.round((q.score / q.pairs.length) * 100) / 100 });
            });
        } else { htmlQuestions.push({ ...q, id: `q_${index}` }); }
    });
    let questionsHtml = '';
    htmlQuestions.forEach((q, i) => {
        questionsHtml += `<div class="question-item" id="question_${i}" data-qindex="${i}"><div class="question-header"><span class="question-number">سوال ${i + 1}</span><span class="question-score">${q.score} نمره</span></div><div class="question-text">${escapeHtml(q.text)}</div>`;
        if (q.type === 'multiple-choice' && q.options) { questionsHtml += `<div class="options-list">`; q.options.forEach((opt, optIdx) => { questionsHtml += `<label class="option-item"><input type="radio" name="q_${i}" value="${optIdx}"><span class="option-text">${escapeHtml(opt)}</span></label>`; }); questionsHtml += `</div>`; }
        else if (q.type === 'true-false') { questionsHtml += `<div class="options-list" style="flex-direction: row; gap: 30px; margin-top: 15px;"><label class="option-item"><input type="radio" name="q_${i}" value="true"><span class="option-text">درست</span></label><label class="option-item"><input type="radio" name="q_${i}" value="false"><span class="option-text">غلط</span></label></div>`; }
        else if (q.type === 'fill-blank') { questionsHtml += `<div style="margin-top: 15px;"><input type="text" class="answer-input" id="input_q_${i}" placeholder="پاسخ خود را بنویسید..."></div>`; }
        else if (q.type === 'essay') { questionsHtml += `<div style="margin-top: 15px;"><textarea class="answer-input" id="input_q_${i}" rows="4" placeholder="پاسخ خود را بنویسید..."></textarea></div>`; }
        questionsHtml += `</div>`;
    });
    const jsonData = JSON.stringify(htmlQuestions).replace(/</g, '\\u003c');
    const html = `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>آزمون: ${escapeHtml(exam.title)}</title><style>body { font-family: Tahoma, sans-serif; background: #f1f5f9; color: #1e293b; padding: 20px; } .paper { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; } .header { text-align: center; border-bottom: 2px solid #4A90E2; padding-bottom: 20px; margin-bottom: 30px; } .header h1 { color: #4A90E2; } .question-item { margin-bottom: 30px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; } .question-header { display: flex; justify-content: space-between; margin-bottom: 10px; } .question-number { font-weight: bold; color: #4A90E2; } .question-score { background: #eef2ff; color: #4A90E2; padding: 2px 10px; border-radius: 12px; font-size: 0.8rem; } .question-text { font-size: 1.1rem; font-weight: bold; margin-bottom: 15px; } .options-list { display: flex; flex-direction: column; gap: 10px; } .option-item { display: flex; gap: 10px; align-items: center; } .answer-input { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; } .correct-answer { background: #dcfce7; border-color: #22c55e; color: #166534; font-weight: bold; } .wrong-answer { background: #fee2e2; border-color: #ef4444; color: #991b1b; text-decoration: line-through; } .correct-input { border-color: #22c55e; background: #f0fdf4; } .wrong-input { border-color: #ef4444; background: #fef2f2; }</style></head><body><div class="paper"><div class="header"><h1>${escapeHtml(exam.title)}</h1><p>${escapeHtml(subName)}</p></div><div id="questions-container">${questionsHtml}</div><button onclick="submitExam()" style="display:block; width:100%; padding:15px; background:#22c55e; color:white; border:none; border-radius:12px; font-size:1.2rem; cursor:pointer;">✅ پایان و مشاهده نتیجه</button><div id="resultBox" style="display:none; text-align:center; margin-top:30px; padding:25px; border-radius:12px; background:linear-gradient(135deg,#4A90E2 0%,#357ABD 100%); color:white;"></div></div><script>const EXAM_QUESTIONS = ${jsonData}; function submitExam() { let totalEarned = 0; EXAM_QUESTIONS.forEach((q, i) => { const qItem = document.getElementById('question_' + i); let isCorrect = false; if (q.type === 'multiple-choice') { const selected = document.querySelector('input[name="q_' + i + '"]:checked'); const val = selected ? parseInt(selected.value) : -1; if (val === q.correctIndex) { isCorrect = true; totalEarned += q.score; } qItem.querySelectorAll('.option-item').forEach((label, idx) => { if (idx === q.correctIndex) label.classList.add('correct-answer'); else if (idx === val) label.classList.add('wrong-answer'); }); } else if (q.type === 'true-false') { const selected = document.querySelector('input[name="q_' + i + '"]:checked'); const val = selected ? selected.value === 'true' : null; if (val === q.correctAnswer) { isCorrect = true; totalEarned += q.score; } qItem.querySelectorAll('.option-item').forEach((label, idx) => { const r = label.querySelector('input'); const v = r.value === 'true'; if (v === q.correctAnswer) label.classList.add('correct-answer'); else if (r.checked) label.classList.add('wrong-answer'); }); } else if (q.type === 'fill-blank') { const input = document.getElementById('input_q_' + i); const userAns = input.value.trim().toLowerCase(); const correctAns = (q.answer || '').trim().toLowerCase(); if (userAns === correctAns) { isCorrect = true; totalEarned += q.score; input.classList.add('correct-input'); } else { input.classList.add('wrong-input'); } } }); document.getElementById('resultBox').style.display = 'block'; document.getElementById('resultBox').innerHTML = '<h2>نمره شما: ' + totalEarned + ' از ${exam.maxScore}</h2>'; }</script></body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `exam_${exam.title.replace(/\s+/g, '_')}_interactive.html`; a.click(); URL.revokeObjectURL(url); showToast('HTML دانلود شد.', 'success');
}

async function printExam(examId) {
    const exam = await getDataById('exams', examId); if (!exam) return;
    const sub = window.allSubjectsData.find(s => s.id === exam.subjectId); const subName = sub ? `${sub.symbol || ''} ${sub.name}` : 'بدون درس';
    let html = `<div class="rc-header"><h2>${escapeHtml(exam.title)}</h2><p>${escapeHtml(subName)} | تاریخ: ${toPersianNumber(exam.date)} | نمره کل: ${toPersianNumber(exam.maxScore)}</p></div><div style="margin-top: 20px;">`;
    exam.questions.forEach((q, i) => {
        html += `<div style="margin-bottom: 25px; page-break-inside: avoid;"><div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: bold;"><span>سوال ${toPersianNumber(i + 1)}</span><span style="color: #4A90E2; font-size: 0.85rem;">(${toPersianNumber(q.score)} نمره)</span></div><div style="font-size: 1.1rem; margin-bottom: 12px; font-weight: bold;">${escapeHtml(q.text)}</div>`;
        if (q.type === 'multiple-choice' && q.options) { html += `<div style="display: flex; flex-direction: column; gap: 8px; padding-right: 15px;">`; q.options.forEach((opt, optIdx) => { html += `<div style="display: flex; gap: 10px;"><span style="font-weight: bold;">${toPersianNumber(optIdx + 1)})</span><span>${escapeHtml(opt)}</span></div>`; }); html += `</div>`; }
        else if (q.type === 'true-false') { html += `<div style="display: flex; gap: 40px; padding-right: 15px; margin-top: 10px;"><div style="display: flex; gap: 8px;"><span style="font-weight: bold;">1)</span><span>درست</span></div><div style="display: flex; gap: 8px;"><span style="font-weight: bold;">2)</span><span>غلط</span></div></div>`; }
        else if (q.type === 'fill-blank' || q.type === 'essay') { html += `<div style="min-height: 80px; border-bottom: 1px dashed #ccc; margin-top: 15px;"></div>`; }
        else if (q.type === 'matching' && q.pairs) { html += `<div style="margin-top: 15px; display: flex; gap: 20px; padding-right: 15px;"><div style="flex: 1;"><strong>ستون ۱:</strong><ul style="margin-top: 10px;">${q.pairs.map(p => `<li>${escapeHtml(p.a)}</li>`).join('')}</ul></div><div style="flex: 1;"><strong>ستون ۲:</strong><ul style="margin-top: 10px;">${q.pairs.map(p => `<li>${escapeHtml(p.b)}</li>`).join('')}</ul></div></div>`; }
        html += `</div>`;
    });
    html += `</div>`;
    if (typeof window.printHtmlContent === 'function') window.printHtmlContent(html);
}

async function exportExamJSON(examId) {
    const exam = await getDataById('exams', examId); if (!exam) return;
    try {
        const mappedQuestions = [];
        exam.questions.forEach(q => {
            if (q.type === 'matching') { if (q.pairs) q.pairs.forEach(p => mappedQuestions.push({ type: 'dd', a: p.a, b: p.b })); } 
            else {
                const mapped = {};
                if (q.type === 'multiple-choice') { mapped.type = 'mc'; mapped.q = q.text; mapped.o0 = q.options[0] || ''; mapped.o1 = q.options[1] || ''; mapped.o2 = q.options[2] || ''; mapped.o3 = q.options[3] || ''; mapped.a = String(q.correctIndex); }
                else if (q.type === 'true-false') { mapped.type = 'tf'; mapped.q = q.text; mapped.a = q.correctAnswer ? "true" : "false"; }
                else if (q.type === 'fill-blank') { mapped.type = 'bl'; mapped.q = q.text; mapped.a = q.answer || ''; }
                else if (q.type === 'essay') { mapped.type = 'de'; mapped.q = q.text; mapped.a = q.answer || ''; }
                mappedQuestions.push(mapped);
            }
        });
        const jsonString = JSON.stringify(mappedQuestions, null, 2); const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a');
        const dateStr = (typeof window.getJalaliDateTimeForFilename === 'function') ? window.getJalaliDateTimeForFilename().split('-').slice(0, 3).join('-') : new Date().toISOString().slice(0, 10);
        a.href = url; a.download = `exam_${exam.title.replace(/\s+/g, '_')}_${dateStr}.json`; a.click(); URL.revokeObjectURL(url); showToast('JSON دانلود شد.', 'success');
    } catch (e) { showToast('خطا در JSON.', 'error'); }
}