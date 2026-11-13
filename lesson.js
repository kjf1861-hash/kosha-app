// ==========================================
// فایل lesson.js — منطق تب درس
// ==========================================

let currentLessonDetailsId = null;
let currentLessonDetailView = 'class';

function initLessonEvents() {
    document.getElementById('lesson-form').addEventListener('submit', saveLesson);
}

async function saveLesson(e) {
    e.preventDefault();

    if (window.allSubjectsData.length >= 14) {
        showToast('حداکثر تعداد مجاز درس (۱۴ درس) تکمیل شده است.', 'error');
        return;
    }

    let sanitized;
try {
    sanitized = {
        name: sanitizeInput(document.getElementById('lessonName').value, 80),
        symbol: sanitizeInput(document.getElementById('lessonSymbol').value, 10),
        motto: sanitizeInput(document.getElementById('lessonMotto').value, 200)
    };
} catch (err) {
    showToast(err.message, 'error');
    return;
}

const data = { 
    name: sanitized.name,
    symbol: sanitized.symbol,
    motto: sanitized.motto,
    academicYear: window.activeAcademicYear
};
    
    await saveData('subjects', data);
    
    document.getElementById('lesson-form').reset();
    showToast('درس جدید با موفقیت ثبت شد!', 'success');
    loadAllData();
    
    const lessonForm = document.getElementById('lesson-form');
    if (lessonForm) lessonForm.scrollIntoView({ behavior: 'smooth' });
}

async function editLesson(id) {
    const sub = await getDataById('subjects', id);
    if (sub) {
        document.getElementById('editLessonIdModal').value = sub.id;
        document.getElementById('editLessonNameModal').value = sub.name;
        document.getElementById('editLessonSymbolModal').value = sub.symbol || '';
        document.getElementById('editLessonMottoModal').value = sub.motto || '';
        document.getElementById('edit-lesson-modal').classList.add('show');
    }
}

function closeEditLessonModal() {
    document.getElementById('edit-lesson-modal').classList.remove('show');
}

async function saveEditedLesson(e) {
    if(e) e.preventDefault();
    const id = parseInt(document.getElementById('editLessonIdModal').value);
    
    const existing = await getDataById('subjects', id);

let sanitized;
try {
    sanitized = {
        name: sanitizeInput(document.getElementById('editLessonNameModal').value, 80),
        symbol: sanitizeInput(document.getElementById('editLessonSymbolModal').value, 10),
        motto: sanitizeInput(document.getElementById('editLessonMottoModal').value, 200)
    };
} catch (err) {
    showToast(err.message, 'error');
    return;
}

const data = {
    id: id,
    name: sanitized.name,
    symbol: sanitized.symbol,
    motto: sanitized.motto,
    academicYear: existing ? existing.academicYear : window.activeAcademicYear
};
    
    await saveData('subjects', data);
    showToast('درس با موفقیت ویرایش شد!', 'success');
    closeEditLessonModal();
    loadAllData();
}

function renderLessonData() {
    const container = document.getElementById('lessons-list');
    if (!container) return;

    if (window.allSubjectsData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg><use href="#empty-lessons"/></svg>
                <div class="empty-title">هنوز درسی اضافه نکردی!</div>
                <div class="empty-desc">اولین درس رو اضافه کن تا ارزشیابی‌های مربوط به اون درس رو ثبت کنی.</div>
                <button class="empty-action" onclick="document.getElementById('lessonName').focus()">➕ افزودن اولین درس</button>
            </div>
        `;
        return;
    }

    const sortedSubjects = [...window.allSubjectsData].sort((a, b) => a.name.localeCompare(b.name, 'fa'));

    container.innerHTML = '';
    sortedSubjects.forEach((sub, index) => {
        container.innerHTML += `
            <div class="list-item">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-weight:bold; color:var(--text-muted); min-width:20px;">${toPersianNumber(index + 1)}.</span>
                    <span style="font-size:1.5rem;">${sub.symbol || '📚'}</span>
                    <div>
    <strong>${escapeHtml(sub.name)}</strong>
    ${sub.motto ? `<div style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(sub.motto)}</div>` : ''}
</div>
                </div>
                <div style="display:flex; gap:5px;">
                    <button class="btn btn-secondary btn-sm" onclick="openLessonDetails(${sub.id})" title="مشاهده جزئیات">👁️</button>
                    <button class="btn btn-secondary btn-sm" onclick="editLesson(${sub.id})" title="ویرایش">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteLesson(${sub.id})" title="حذف">🗑️</button>
                </div>
            </div>
        `;
    });
}

async function deleteLesson(id) {
    if (!confirm('آیا از حذف این درس مطمئن هستید؟ تمام سوابق ارزشیابی مرتبط با این درس نیز حذف خواهند شد!')) return;
    
    const allRecords = await getAllData('records');
    const subjectRecords = allRecords.filter(r => r.subjectId === id);
    for (const rec of subjectRecords) {
        await deleteData('records', rec.id);
    }

    await deleteData('subjects', id);
    showToast('درس و سوابق مرتبط حذف شد.', 'success');
    loadAllData();
}

async function resetAllLessons() {
    if (window.allSubjectsData.length === 0) {
        showToast('هیچ درسی برای حذف وجود ندارد.', 'error');
        return;
    }

    const confirm1 = confirm('⚠️ هشدار شدید:\n\nآیا مطمئن هستید که می‌خواهید تمام دروس این سال تحصیلی را حذف کنید؟ تمام سوابق ارزشیابی مرتبط با دروس نیز پاک خواهد شد.');
    if (!confirm1) return;

    const confirm2 = confirm('🚨 آخرین هشدار!\n\nاین عمل غیرقابل بازگشت است و تمام دروس این سال برای همیشه حذف می‌شوند. آیا ۱۰۰٪ مطمئن هستید؟');
    if (!confirm2) return;

    try {
        for (const sub of window.allSubjectsData) {
            const allRecords = await getAllData('records');
            const subRecords = allRecords.filter(r => r.subjectId === sub.id);
            for (const rec of subRecords) {
                await deleteData('records', rec.id);
            }
            await deleteData('subjects', sub.id);
        }
        
        showToast('تمام دروس و سوابق مرتبط این سال تحصیلی حذف شدند.', 'success');
        loadAllData();
    } catch (e) {
        console.error(e);
        showToast('خطا در حذف دروس!', 'error');
    }
}

function openLessonDetails(id) {
    currentLessonDetailsId = id;
    currentLessonDetailView = 'class'; 
    
    const sub = window.allSubjectsData.find(s => s.id === id);
    if(!sub) return;

    document.getElementById('lesson-details-title').textContent = `📊 جزئیات درس: ${sub.symbol || ''} ${sub.name}`;
    
    document.getElementById('btnLessonClassView').classList.add('active');
    document.getElementById('btnLessonGroupView').classList.remove('active');

    renderLessonDetails();
    document.getElementById('lesson-details-modal').classList.add('show');
}

function closeLessonDetails() {
    document.getElementById('lesson-details-modal').classList.remove('show');
    currentLessonDetailsId = null;
}

function switchLessonDetailView(view) {
    currentLessonDetailView = view;
    document.getElementById('btnLessonClassView').classList.toggle('active', view === 'class');
    document.getElementById('btnLessonGroupView').classList.toggle('active', view === 'group');
    renderLessonDetails();
}

function renderLessonDetails() {
    const container = document.getElementById('lesson-details-content');
    if (!container || !currentLessonDetailsId) return;

    const subjectRecords = window.allRecordsData.filter(r => r.subjectId === currentLessonDetailsId);

    // ✅ محاسبه یک‌باره امتیاز هر دانش‌آموز در این درس
    const studentSubjectScores = {};
    for (const rec of subjectRecords) {
        if (!rec.students || !Array.isArray(rec.students)) continue;
        const score = Number(rec.finalScore) || 0;
        for (const stId of rec.students) {
            studentSubjectScores[stId] = (studentSubjectScores[stId] || 0) + score;
        }
    }

    const processRanking = (items) => {
        items.sort((a, b) => {
            if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
            return a.name.localeCompare(b.name, 'fa');
        });

        const uniqueScores = [...new Set(items.map(i => i.totalScore))].filter(s => s > 0).sort((a, b) => b - a);
        const goldScore = uniqueScores.length > 0 ? uniqueScores[0] : -1;
        const silverScore = uniqueScores.length > 1 ? uniqueScores[1] : -1;
        const bronzeScore = uniqueScores.length > 2 ? uniqueScores[2] : -1;

        let html = '';
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            let medal = '';
            if (item.totalScore === goldScore) medal = '🥇';
            else if (item.totalScore === silverScore) medal = '🥈';
            else if (item.totalScore === bronzeScore) medal = '🥉';

            html += `
                <div class="list-item" style="padding: 10px 15px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-weight:bold; color:var(--text-muted); min-width:20px;">${toPersianNumber(i + 1)}.</span>
                        <span class="medal-badge">${medal}</span>
                        <strong>${escapeHtml(item.name)}</strong>
                        ${item.badgeHtml || ''}
                    </div>
                    <span class="rank-badge">${toPersianNumber(item.totalScore)} امتیاز</span>
                </div>
            `;
        }
        return html;
    };

    if (currentLessonDetailView === 'class') {
        // ✅ خواندن از نقشه (نه حلقه روی رکوردها برای هر دانش‌آموز)
        const studentScores = window.allStudentsData.map(st => ({
            id: st.id,
            name: `${st.firstName} ${st.lastName}`,
            totalScore: studentSubjectScores[st.id] || 0,
            badgeHtml: ''
        }));

        if (studentScores.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#64748b;">هیچ دانش‌آموزی وجود ندارد.</p>';
            return;
        }
        container.innerHTML = processRanking(studentScores);

    } else {
        // ✅ ساخت نقشه گروه → دانش‌آموزان (یک بار)
        const groupStudentMap = {};
        for (const st of window.allStudentsData) {
            if (!st.groupId) continue;
            if (!groupStudentMap[st.groupId]) groupStudentMap[st.groupId] = [];
            groupStudentMap[st.groupId].push(st);
        }

        const groupData = window.allGroupsData.map(g => {
            const groupStudents = groupStudentMap[g.id] || [];
            let groupTotal = 0;
            
            const studentScores = groupStudents.map(st => {
                const score = studentSubjectScores[st.id] || 0;
                groupTotal += score;
                return { id: st.id, name: `${st.firstName} ${st.lastName}`, totalScore: score, badgeHtml: '' };
            });

            const studentsHtml = studentScores.length > 0 
                ? processRanking(studentScores) 
                : '<p style="font-size:0.8rem; color:#64748b; text-align:center;">دانش‌آموزی ندارد.</p>';

            return { id: g.id, name: `${g.symbol} ${g.name}`, totalScore: groupTotal, studentsHtml: studentsHtml };
        });

        const uniqueGroupScores = [...new Set(groupData.map(g => g.totalScore))].filter(s => s > 0).sort((a, b) => b - a);
        const goldG = uniqueGroupScores.length > 0 ? uniqueGroupScores[0] : -1;
        const silverG = uniqueGroupScores.length > 1 ? uniqueGroupScores[1] : -1;
        const bronzeG = uniqueGroupScores.length > 2 ? uniqueGroupScores[2] : -1;

        groupData.sort((a, b) => {
            if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
            return a.name.localeCompare(b.name, 'fa');
        });

        let finalHtml = '';
        for (let i = 0; i < groupData.length; i++) {
            const g = groupData[i];
            let medal = '';
            if (g.totalScore === goldG) medal = '🥇';
            else if (g.totalScore === silverG) medal = '🥈';
            else if (g.totalScore === bronzeG) medal = '🥉';

            finalHtml += `
                <div class="card" style="margin-bottom: 15px; padding: 15px; background: var(--input-bg); border: 1px solid var(--border-color);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px dashed var(--border-color); padding-bottom:10px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-weight:bold; color:var(--text-muted);">${toPersianNumber(i + 1)}.</span>
                            <span class="medal-badge" style="font-size:1.5rem;">${medal}</span>
                            <strong style="color:var(--primary); font-size:1.1rem;">${escapeHtml(g.name)}</strong>
                        </div>
                        <span class="rank-badge">${toPersianNumber(g.totalScore)} امتیاز کل</span>
                    </div>
                    <div style="padding-right: 10px;">
                        ${g.studentsHtml}
                    </div>
                </div>
            `;
        }

        if (groupData.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#64748b;">هیچ گروهی وجود ندارد.</p>';
        } else {
            container.innerHTML = finalHtml;
        }
    }
}