// ==========================================
// فایل exam.js — منطق تب آزمون‌ها
// ==========================================

window.allExamsData = [];
window.allExamResultsData = [];

async function loadExamsData() {
    try {
        window.allExamsData = await getAllData('exams');
        window.allExamResultsData = await getAllData('examResults');
    } catch (e) {
        console.error('خطا در بارگذاری داده‌های آزمون:', e);
    }
}

function renderExamsData() {
    const container = document.getElementById('exams-list-container');
    if (!container) return;

    if (!window.allExamsData || window.allExamsData.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#64748b;">هنوز آزمونی ثبت نشده است.</p>';
        return;
    }

    let html = '';
    window.allExamsData.forEach(exam => {
        const sub = window.allSubjectsData ? window.allSubjectsData.find(s => s.id === exam.subjectId) : null;
        const subName = sub ? `${sub.symbol || ''} ${sub.name}` : 'بدون درس';
        
        const results = window.allExamResultsData ? window.allExamResultsData.filter(r => r.examId === exam.id) : [];
        const participantCount = results.length;
        
        html += `
            <div class="list-item" style="flex-direction: column; align-items: stretch; gap: 5px; padding: 15px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color:var(--primary); font-size: 1.05rem;">${exam.title}</strong>
                    <span class="rank-badge">${toPersianNumber(exam.maxScore)} نمره</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:var(--text-muted);">
                    <span>📚 ${subName}</span>
                    <span>📅 ${toPersianNumber(exam.date)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 5px; padding-top: 8px; border-top: 1px dashed var(--border-color);">
                    <span style="font-size: 0.85rem;">👥 ${toPersianNumber(participantCount)} شرکت‌کننده</span>
                    <button class="btn btn-secondary btn-sm" onclick="openExamEditorModal(${exam.id})">✏️ ویرایش</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function openExamEditorModal(examId = null) {
    const modal = document.getElementById('exam-editor-modal');
    if (modal) modal.classList.add('show');
}