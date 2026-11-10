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

    const data = { 
        name: document.getElementById('lessonName').value,
        symbol: document.getElementById('lessonSymbol').value,
        motto: document.getElementById('lessonMotto').value 
    };
    
    await saveData('subjects', data);
    
    document.getElementById('lesson-form').reset();
    showToast('درس جدید با موفقیت ثبت شد!', 'success');
    loadAllData();
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
    
    const data = {
        id: id,
        name: document.getElementById('editLessonNameModal').value,
        symbol: document.getElementById('editLessonSymbolModal').value,
        motto: document.getElementById('editLessonMottoModal').value
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
        container.innerHTML = '<p style="text-align:center; color:#64748b;">لیست خالی است. ابتدا درس اضافه کنید.</p>';
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
                        <strong>${sub.name}</strong>
                        ${sub.motto ? `<div style="font-size:0.8rem; color:var(--text-muted);">${sub.motto}</div>` : ''}
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

    const confirm1 = confirm('⚠️ هشدار شدید:\n\nآیا مطمئن هستید که می‌خواهید تمام دروس را حذف کنید؟ تمام سوابق ارزشیابی مرتبط با دروس نیز پاک خواهد شد.');
    if (!confirm1) return;

    const confirm2 = confirm('🚨 آخرین هشدار!\n\nاین عمل غیرقابل بازگشت است و تمام دروس برای همیشه حذف می‌شوند. آیا ۱۰۰٪ مطمئن هستید؟');
    if (!confirm2) return;

    try {
        await clearStore('subjects');
        await clearStore('records'); 
        
        showToast('تمام دروس و سوابق مرتبط با موفقیت حذف شدند.', 'success');
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
        items.forEach((item, index) => {
            let medal = '';
            if (item.totalScore === goldScore) medal = '🥇';
            else if (item.totalScore === silverScore) medal = '🥈';
            else if (item.totalScore === bronzeScore) medal = '🥉';

            const rankNum = index + 1;
            
            html += `
                <div class="list-item" style="padding: 10px 15px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-weight:bold; color:var(--text-muted); min-width:20px;">${toPersianNumber(rankNum)}.</span>
                        <span class="medal-badge">${medal}</span>
                        <strong>${item.name}</strong>
                        ${item.badgeHtml || ''}
                    </div>
                    <span class="rank-badge">${toPersianNumber(item.totalScore)} امتیاز</span>
                </div>
            `;
        });
        return html;
    };

    if (currentLessonDetailView === 'class') {
        const studentScores = window.allStudentsData.map(st => {
            let total = 0;
            subjectRecords.forEach(rec => {
                if (rec.students && rec.students.includes(st.id)) total += rec.finalScore;
            });
            return { id: st.id, name: `${st.firstName} ${st.lastName}`, totalScore: total, badgeHtml: '' };
        });

        if (studentScores.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#64748b;">هیچ دانش‌آموزی وجود ندارد.</p>';
            return;
        }
        container.innerHTML = processRanking(studentScores);

    } else {
        const groupData = window.allGroupsData.map(g => {
            const groupStudents = window.allStudentsData.filter(st => st.groupId === g.id);
            let groupTotal = 0;
            
            const studentScores = groupStudents.map(st => {
                let total = 0;
                subjectRecords.forEach(rec => {
                    if (rec.students && rec.students.includes(st.id)) total += rec.finalScore;
                });
                groupTotal += total;
                return { id: st.id, name: `${st.firstName} ${st.lastName}`, totalScore: total, badgeHtml: '' };
            });

            const studentsHtml = studentScores.length > 0 ? processRanking(studentScores) : '<p style="font-size:0.8rem; color:#64748b; text-align:center;">دانش‌آموزی ندارد.</p>';

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
        groupData.forEach((g, index) => {
            let medal = '';
            if (g.totalScore === goldG) medal = '🥇';
            else if (g.totalScore === silverG) medal = '🥈';
            else if (g.totalScore === bronzeG) medal = '🥉';

            finalHtml += `
                <div class="card" style="margin-bottom: 15px; padding: 15px; background: var(--input-bg); border: 1px solid var(--border-color);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px dashed var(--border-color); padding-bottom:10px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-weight:bold; color:var(--text-muted);">${toPersianNumber(index + 1)}.</span>
                            <span class="medal-badge" style="font-size:1.5rem;">${medal}</span>
                            <strong style="color:var(--primary); font-size:1.1rem;">${g.name}</strong>
                        </div>
                        <span class="rank-badge">${toPersianNumber(g.totalScore)} امتیاز کل</span>
                    </div>
                    <div style="padding-right: 10px;">
                        ${g.studentsHtml}
                    </div>
                </div>
            `;
        });

        if (groupData.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#64748b;">هیچ گروهی وجود ندارد.</p>';
        } else {
            container.innerHTML = finalHtml;
        }
    }
}