// ==========================================
// فایل exam.js — منطق تب آزمون‌ها
// ==========================================

// متغیرهای سراسری مربوط به آزمون‌ها
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

    if (window.allExamsData.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#64748b;">هنوز آزمونی ثبت نشده است.</p>';
        return;
    }

    // فعلاً یک لیست ساده برای تست
    let html = '';
    window.allExamsData.forEach(exam => {
        const sub = window.allSubjectsData.find(s => s.id === exam.subjectId);
        const subName = sub ? sub.name : 'بدون درس';
        
        html += `
            <div class="list-item" style="flex-direction: column; align-items: stretch; gap: 5px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color:var(--primary);">${exam.title}</strong>
                    <span class="rank-badge">${toPersianNumber(exam.maxScore)} نمره</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:var(--text-muted);">
                    <span>📚 ${subName}</span>
                    <span>📅 ${toPersianNumber(exam.date)}</span>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function openExamEditorModal() {
    showToast('این بخش در فازهای بعدی تکمیل می‌شود.', 'info');
}