// ==========================================
// فایل exam.js — منطق کامل تب آزمون‌ها (فاز ۲ و ۳)
// ==========================================

window.allExamsData = [];
window.allExamResultsData = [];

// شمارنده برای شناسه‌های موقت سوالات
let examQuestionCounter = 0;

// شناسه آزمون در حال ثبت نمره
let currentGradingExamId = null;

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

    // مرتب‌سازی بر اساس تاریخ (جدیدترین اول)
    const sortedExams = [...window.allExamsData].sort((a, b) => b.date.localeCompare(a.date));

    let html = '';
    sortedExams.forEach(exam => {
        const sub = window.allSubjectsData ? window.allSubjectsData.find(s => s.id === exam.subjectId) : null;
        const subName = sub ? `${sub.symbol || '📚'} ${sub.name}` : 'بدون درس';
        
        const results = window.allExamResultsData ? window.allExamResultsData.filter(r => r.examId === exam.id) : [];
        const participantCount = results.length;
        const questionCount = exam.questions ? exam.questions.length : 0;
        
        // محاسبه میانگین اگر نمره ثبت شده باشد
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
                    <button class="btn btn-secondary btn-sm" onclick="openExamEditorModal(${exam.id})" title="ویرایش آزمون">✏️ ویرایش</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteExam(${exam.id})" title="حذف آزمون">🗑️ حذف</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ==========================================
// 2. باز کردن مودال سازنده آزمون
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

    // پر کردن لیست دروس
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
        document.getElementById('examDate').value = exam.date;
        document.getElementById('examMaxScore').value = exam.maxScore;
        
        if (exam.questions && exam.questions.length > 0) {
            exam.questions.forEach(q => addExamQuestion(q));
        }
    } else {
        titleEl.textContent = '➕ ساخت آزمون جدید';
        addExamQuestion();
    }

    modal.classList.add('show');
}

function closeExamEditorModal() {
    const modal = document.getElementById('exam-editor-modal');
    if (modal) modal.classList.remove('show');
}

// ==========================================
// 3. افزودن سوال جدید
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

// ==========================================
// 4. تولید HTML مخصوص هر نوع سوال
// ==========================================
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
    if (event) event.preventDefault();
    
    const editId = document.getElementById('examEditId').value;
    const title = document.getElementById('examTitle').value.trim();
    const subjectId = parseInt(document.getElementById('examSubject').value);
    const date = document.getElementById('examDate').value.trim();
    const maxScore = parseFloat(document.getElementById('examMaxScore').value);
    
    if (!title) { showToast('عنوان آزمون را وارد کنید.', 'error'); return; }
    if (!subjectId || isNaN(subjectId)) { showToast('درس را انتخاب کنید.', 'error'); return; }
    if (!/^\d{4}\/\d{2}\/\d{2}$/.test(date)) { showToast('فرمت تاریخ نامعتبر است. مثلاً: 1405/08/15', 'error'); return; }
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
    
    // پر کردن اطلاعات آزمون
    const sub = window.allSubjectsData.find(s => s.id === exam.subjectId);
    document.getElementById('grading-exam-title').textContent = exam.title;
    document.getElementById('grading-exam-subject').textContent = sub ? `${sub.symbol || ''} ${sub.name}` : 'بدون درس';
    document.getElementById('grading-exam-date').textContent = toPersianNumber(exam.date);
    document.getElementById('grading-exam-max').textContent = toPersianNumber(exam.maxScore);
    
    // گرفتن نمرات ثبت‌شده قبلی (اگر وجود دارد)
    const existingResults = window.allExamResultsData.filter(r => r.examId === examId);
    const scoresMap = {};
    existingResults.forEach(r => { scoresMap[r.studentId] = r.score; });
    
    // ساخت لیست دانش‌آموزان
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

// ==========================================
// 8. محاسبه لحظه‌ای آمار
// ==========================================
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

// ==========================================
// 9. دکمه‌های عملیات سریع
// ==========================================
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

// ==========================================
// 10. ذخیره نمرات
// ==========================================
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
        
        if (rawValue === '') {
            // اگر خالی باشد، نمره‌ای ثبت نمی‌شود (می‌تواند غایب باشد)
            return;
        }
        
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
        // حذف نتایج قبلی این آزمون
        const oldResults = window.allExamResultsData.filter(r => r.examId === currentGradingExamId);
        for (const r of oldResults) {
            await deleteData('examResults', r.id);
        }
        
        // ذخیره نتایج جدید
        for (const r of newResults) {
            r.id = Date.now() + Math.random();
            await saveData('examResults', r);
        }
        
        showToast(`نمرات ${toPersianNumber(newResults.length)} دانش‌آموز ذخیره شد!`, 'success');
        closeExamGradingModal();
        
        // بارگذاری مجدد و رفرش لیست
        await loadExamsData();
        renderExamsData();
    } catch (e) {
        console.error(e);
        showToast('خطا در ذخیره نمرات.', 'error');
    }
}

// ==========================================
// 11. اتصال رویداد submit فرم آزمون
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const examForm = document.getElementById('exam-editor-form');
        if (examForm && !examForm.dataset.listenerAttached) {
            examForm.addEventListener('submit', saveExam);
            examForm.dataset.listenerAttached = 'true';
        }
    }, 500);
});