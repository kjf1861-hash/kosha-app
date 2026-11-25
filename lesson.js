// ==========================================
// فایل lesson.js — منطق تب درس
// ==========================================

let currentLessonDetailsId = null;
let currentLessonDetailView = 'class';

function initLessonEvents() {
    const form = document.getElementById('lesson-form');
    if (form && !form.dataset.listenerAttached) {
        form.addEventListener('submit', saveLesson);
        form.dataset.listenerAttached = 'true';
    }
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
        
    try {
        await saveData('subjects', data);
        
        document.getElementById('lesson-form').reset();
        showToast('درس جدید با موفقیت ثبت شد!', 'success');
        
        if (typeof clearFormDirty === 'function') clearFormDirty();
        
        loadAllData();
        
        const lessonForm = document.getElementById('lesson-form');
        if (lessonForm) lessonForm.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        window.handleError(err, 'خطا در ثبت درس! لطفاً دوباره تلاش کنید.');
    }
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
        
    try {
        await saveData('subjects', data);
        showToast('درس با موفقیت ویرایش شد!', 'success');
        
        if (typeof clearFormDirty === 'function') clearFormDirty();
        
        closeEditLessonModal();
        loadAllData();
    } catch (err) {
        window.handleError(err, 'خطا در ویرایش درس! لطفاً دوباره تلاش کنید.');
    }
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
                <button class="empty-action" onclick="document.getElementById('lessonName').focus()"><svg><use href="#ico-plus"/></svg> افزودن اولین درس</button>
            </div>
        `;
        return;
    }

    const sortedSubjects = [...window.allSubjectsData].sort((a, b) => a.name.localeCompare(b.name, 'fa'));

    let html = '';
    sortedSubjects.forEach((sub, index) => {
        // انتخاب رنگ آواتار از پالت ۷ رنگه
        const avatarColorClass = `av-color-${sub.id % 7}`;
        
        html += `
            <div class="modern-list-card">
                <div class="modern-card-header">
                    <div class="student-modern-profile">
                        <div class="modern-card-icon ${avatarColorClass}">
                            ${escapeHtml(sub.symbol || '📚')}
                        </div>
                        <div class="student-modern-info">
                            <div class="student-modern-name">
                                <span style="display:inline-block; min-width:20px; color:var(--text-muted); font-weight:bold;">${toPersianNumber(index + 1)}.</span>
                                <span>${escapeHtml(sub.name)}</span>
                            </div>
                            ${sub.motto ? `<div class="student-modern-rank">${escapeHtml(sub.motto)}</div>` : '<div class="student-modern-rank" style="opacity:0.5;">بدون شعار</div>'}
                        </div>
                    </div>
                </div>
                
                <div class="modern-card-actions">
                    <button class="action-btn-circle btn-action-view" onclick="openLessonDetails(${sub.id})" title="مشاهده جزئیات">
                        <svg viewBox="0 0 24 24"><use href="#ico-eye"/></svg>
                    </button>
                    <button class="action-btn-circle btn-action-edit" onclick="editLesson(${sub.id})" title="ویرایش">
                        <svg viewBox="0 0 24 24"><use href="#ico-edit"/></svg>
                    </button>
                    <button class="action-btn-circle btn-action-delete" onclick="deleteLesson(${sub.id})" title="حذف">
                        <svg viewBox="0 0 24 24"><use href="#ico-trash"/></svg>
                    </button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

async function deleteLesson(id) {
    if (!confirm('آیا از حذف این درس مطمئن هستید؟ تمام سوابق ارزشیابی و آزمون‌های مرتبط با این درس نیز حذف خواهند شد!')) return;
    
    try {
        const subjectRecords = window.allRecordsData.filter(r => r.subjectId === id);
        if (subjectRecords.length > 0) {
            await deleteBulkData('records', subjectRecords.map(r => r.id));
        }

        const allExams = await getAllData('exams');
        const relatedExams = allExams.filter(e => e.subjectId === id);
        const relatedExamIds = relatedExams.map(e => e.id);
        
        if (relatedExamIds.length > 0) {
            const allResults = await getAllData('examResults');
            const relatedResults = allResults.filter(r => relatedExamIds.includes(r.examId));
            if (relatedResults.length > 0) {
                await deleteBulkData('examResults', relatedResults.map(r => r.id));
            }
            await deleteBulkData('exams', relatedExamIds);
        }

        await deleteData('subjects', id);
        showToast('درس و سوابق و آزمون‌های مرتبط حذف شد.', 'success');
        loadAllData();
    } catch (e) {
        console.error(e);
        showToast('خطا در حذف درس!', 'error');
    }
}

async function resetAllLessons() {
    if (window.allSubjectsData.length === 0) {
        showToast('هیچ درسی برای حذف وجود ندارد.', 'error');
        return;
    }

    const confirm1 = confirm('⚠️ هشدار شدید:\n\nآیا مطمئن هستید که می‌خواهید تمام دروس این سال تحصیلی را حذف کنید؟ تمام سوابق ارزشیابی و آزمون‌های مرتبط با دروس نیز پاک خواهند شد.');
    if (!confirm1) return;

    const confirm2 = confirm('🚨 آخرین هشدار!\n\nاین عمل غیرقابل بازگشت است و تمام دروس این سال برای همیشه حذف می‌شوند. آیا ۱۰۰٪ مطمئن هستید؟');
    if (!confirm2) return;

    try {
        const subjectIds = window.allSubjectsData.map(s => s.id);
        
        const recordsToDelete = window.allRecordsData.filter(r => subjectIds.includes(r.subjectId));
        if (recordsToDelete.length > 0) {
            await deleteBulkData('records', recordsToDelete.map(r => r.id));
        }

        const allExams = await getAllData('exams');
        const relatedExams = allExams.filter(e => subjectIds.includes(e.subjectId));
        const relatedExamIds = relatedExams.map(e => e.id);
        
        if (relatedExamIds.length > 0) {
            const allResults = await getAllData('examResults');
            const relatedResults = allResults.filter(r => relatedExamIds.includes(r.examId));
            if (relatedResults.length > 0) {
                await deleteBulkData('examResults', relatedResults.map(r => r.id));
            }
            await deleteBulkData('exams', relatedExamIds);
        }

        if (subjectIds.length > 0) {
            await deleteBulkData('subjects', subjectIds);
        }
        
        showToast('تمام دروس، سوابق و آزمون‌های مرتبط این سال تحصیلی حذف شدند.', 'success');
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
    if(!sub) {
        showToast('درس یافت نشد.', 'error');
        return;
    }

    document.getElementById('lesson-details-title').innerHTML = `<svg style="vertical-align: middle; margin-left: 5px;"><use href="#ico-bar-chart"/></svg> جزئیات درس: ${sub.symbol || ''} ${sub.name}`;
    
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

        const medals = window.calculateMedals(items, 'totalScore');

        let html = '';
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const medal = window.getMedalEmoji(item.totalScore, medals);

            html += `
                <div class="list-item" style="padding: 10px 15px; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; border-radius: 8px;">
                    <div style="display:flex; align-items:center; gap:8px; word-break: break-word;">
                        <span style="font-weight:bold; color:var(--text-muted); min-width:20px;">${toPersianNumber(i + 1)}.</span>
                        <span class="medal-badge">${medal}</span>
                        <strong>${escapeHtml(item.name)}</strong>
                        ${item.badgeHtml || ''}
                    </div>
                    <span class="rank-badge" style="white-space: nowrap;">${toPersianNumber(item.totalScore)} امتیاز</span>
                </div>
            `;
        }
        return html;
    };

    if (currentLessonDetailView === 'class') {
        const studentScores = window.allStudentsData.map(st => ({
            id: st.id,
            name: `${st.firstName} ${st.lastName}`,
            totalScore: studentSubjectScores[st.id] || 0,
            badgeHtml: ''
        }));

        if (studentScores.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">هیچ دانش‌آموزی وجود ندارد.</p>';
            return;
        }
        container.innerHTML = processRanking(studentScores);

    } else {
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
                : '<p style="font-size:0.8rem; color:var(--text-muted); text-align:center;">دانش‌آموزی ندارد.</p>';

            return { id: g.id, name: `${g.symbol || ''} ${g.name}`, totalScore: groupTotal, studentsHtml: studentsHtml };
        });

        const groupMedals = window.calculateMedals(groupData, 'totalScore');

        groupData.sort((a, b) => {
            if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
            return a.name.localeCompare(b.name, 'fa');
        });

        let finalHtml = '';
        for (let i = 0; i < groupData.length; i++) {
            const g = groupData[i];
            const medal = window.getMedalEmoji(g.totalScore, groupMedals);

            finalHtml += `
                <div class="card" style="margin-bottom: 15px; padding: 15px; background: var(--md-surface-container); border: 1px solid var(--md-surface-container-high); border-radius: 12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap: wrap; margin-bottom:10px; border-bottom:1px dashed var(--md-surface-container-high); padding-bottom:10px; gap: 5px;">
                        <div style="display:flex; align-items:center; gap:8px; word-break: break-word;">
                            <span style="font-weight:bold; color:var(--text-muted);">${toPersianNumber(i + 1)}.</span>
                            <span class="medal-badge" style="font-size:1.5rem;">${medal}</span>
                            <strong style="color:var(--text-main); font-size:1.1rem;">${escapeHtml(g.name)}</strong>
                        </div>
                        <span class="rank-badge" style="white-space: nowrap;">${toPersianNumber(g.totalScore)} امتیاز کل</span>
                    </div>
                    <div style="padding-right: 10px;">
                        ${g.studentsHtml}
                    </div>
                </div>
            `;
        }

        if (groupData.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">هیچ گروهی وجود ندارد.</p>';
        } else {
            container.innerHTML = finalHtml;
        }
    }
}

// ✅ پایان کامل فایل lesson.js