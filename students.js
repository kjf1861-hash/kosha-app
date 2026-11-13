// ==========================================
// فایل students.js — منطق تب دانش‌آموزان
// ==========================================

let currentStudentDetailsId = null;

async function saveStudent(e) {
    e.preventDefault();
    
    if (window.allStudentsData.length >= 36) {
        showToast('حداکثر تعداد مجاز دانش‌آموز (۳۶ نفر) تکمیل شده است.', 'error');
        return;
    }

    const nationalId = document.getElementById('studentNationalId').value.trim();
    
    if (!validateNationalId(nationalId)) {
        showToast('کد ملی وارد شده معتبر نیست. لطفاً ۱۰ رقم صحیح وارد کنید.', 'error');
        return;
    }

    const isDuplicate = window.allStudentsData.some(st => st.nationalId === nationalId);
    if (isDuplicate) {
        showToast('این کد ملی در همین سال تحصیلی قبلاً ثبت شده است.', 'error');
        return;
    }

    let sanitizedFirstName, sanitizedLastName;
try {
    sanitizedFirstName = sanitizeInput(document.getElementById('studentFirstName').value, 50);
    sanitizedLastName = sanitizeInput(document.getElementById('studentLastName').value, 50);
    if (!sanitizedFirstName || !sanitizedLastName) {
        showToast('نام و نام خانوادگی نمی‌تواند خالی باشد.', 'error');
        return;
    }
} catch (err) {
    showToast(err.message, 'error');
    return;
}

const data = {
    firstName: sanitizedFirstName,
    lastName: sanitizedLastName,
    nationalId: nationalId,
    groupId: null,
    academicYear: window.activeAcademicYear
};
    
    try {
        await saveData('students', data);
        document.getElementById('student-form').reset();
        
        if (typeof clearFormDirty === 'function') clearFormDirty();
        
        showToast('دانش‌آموز جدید با موفقیت ثبت شد!', 'success');
        loadAllData();
        
        const studentForm = document.getElementById('student-form');
        if (studentForm) studentForm.scrollIntoView({ behavior: 'smooth' });
        
    } catch (err) {
        console.error(err);
        showToast('خطا در ثبت دانش‌آموز.', 'error');
    }
}

function renderStudentsList() {
    const container = document.getElementById('students-list');
    if (!container) return;
    
    if (window.allStudentsData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg><use href="#empty-students"/></svg>
                <div class="empty-title">هنوز دانش‌آموزی اضافه نکردی!</div>
                <div class="empty-desc">اولین دانش‌آموز کلاس رو اضافه کن تا بتونی ارزشیابی رو شروع کنی.</div>
                <button class="empty-action" onclick="document.getElementById('studentFirstName').focus()">➕ افزودن اولین دانش‌آموز</button>
            </div>
        `;
        const pagination = document.getElementById('students-pagination');
        if (pagination) pagination.style.display = 'none';
        return;
    }

    if (!window._cacheStudentScores && typeof buildScoreCaches === 'function') {
        buildScoreCaches();
    }
    const scoreCache = window._cacheStudentScores || {};

    const studentScores = window.allStudentsData.map(st => ({
        ...st,
        totalScore: scoreCache[st.id] || 0
    }));

    studentScores.sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return a.lastName.localeCompare(b.lastName, 'fa');
    });

    const uniqueScores = [...new Set(studentScores.map(s => s.totalScore))].filter(s => s > 0).sort((a, b) => b - a);
    const goldScore = uniqueScores.length > 0 ? uniqueScores[0] : -1;
    const silverScore = uniqueScores.length > 1 ? uniqueScores[1] : -1;
    const bronzeScore = uniqueScores.length > 2 ? uniqueScores[2] : -1;

    const groupMap = {};
    for (const g of window.allGroupsData) groupMap[g.id] = g;

    const totalPages = Math.ceil(studentScores.length / itemsPerPage);
    if (currentPage.students > totalPages) currentPage.students = totalPages;
    if (currentPage.students < 1) currentPage.students = 1;
    
    const startIndex = (currentPage.students - 1) * itemsPerPage;
    const paginated = studentScores.slice(startIndex, startIndex + itemsPerPage);

    let html = '';
    for (let i = 0; i < paginated.length; i++) {
        const st = paginated[i];
        const globalRank = startIndex + i + 1;
        
        let medalHtml = '';
        if (st.totalScore > 0) { 
            if (st.totalScore === goldScore) medalHtml = '<span class="medal-badge">🥇</span>';
            else if (st.totalScore === silverScore) medalHtml = '<span class="medal-badge">🥈</span>';
            else if (st.totalScore === bronzeScore) medalHtml = '<span class="medal-badge">🥉</span>';
        }

        const g = groupMap[st.groupId];
        // ✅ اصلاح امنیتی: escape نام و نماد گروه
        const groupBadge = g ? `<span class="group-label">${escapeHtml(g.symbol)} ${escapeHtml(g.name)}</span>` : '';
        
        const studentPass = st.nationalId ? generateStudentPassword(st.nationalId) : '---';

        html += `
            <div class="list-item" style="flex-direction: column; align-items: stretch; gap: 5px;">
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <div style="display:flex; align-items:center; gap:5px;">
                        <span style="font-weight:bold; min-width:25px; color:var(--text-muted);">${toPersianNumber(globalRank)}.</span>
                        ${medalHtml}
                        <span><strong>${escapeHtml(st.firstName)} ${escapeHtml(st.lastName)}</strong></span>
                        ${groupBadge}
                    </div>
                    <div style="display:flex; align-items:center; gap:5px;">
                        <span class="rank-badge">${toPersianNumber(st.totalScore)} امتیاز</span>
                        <button class="btn btn-secondary btn-sm" onclick="openStudentDetails(${st.id})" title="مشاهده جزئیات">👁️</button>
                        <button class="btn btn-secondary btn-sm" onclick="editStudent(${st.id})" title="ویرایش">✏️</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteStudent(${st.id})" title="حذف">🗑️</button>
                    </div>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-right: 25px; display: flex; gap: 15px;">
                    <span>🆔 کد ملی: <strong style="font-family: 'IRNumber';">${escapeHtml(toPersianNumber(st.nationalId || 'ثبت نشده'))}</strong></span>
                    <span>🔑 رمز: <strong style="font-family: 'IRNumber'; color: var(--primary);">${toPersianNumber(studentPass)}</strong></span>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;

    const pagination = document.getElementById('students-pagination');
    if (pagination) {
        if (totalPages > 1) {
            pagination.style.display = 'flex';
            document.getElementById('studentsPageInfo').textContent = `صفحه ${toPersianNumber(currentPage.students)} از ${toPersianNumber(totalPages)}`;
            document.getElementById('btnPrevStudents').disabled = (currentPage.students === 1);
            document.getElementById('btnNextStudents').disabled = (currentPage.students === totalPages);
        } else {
            pagination.style.display = 'none';
        }
    }
}

async function editStudent(id) {
    const student = await getDataById('students', id);
    if (student) {
        document.getElementById('editStudentIdModal').value = student.id;
        document.getElementById('editStudentFirstNameModal').value = student.firstName;
        document.getElementById('editStudentLastNameModal').value = student.lastName;
        document.getElementById('editStudentNationalIdModal').value = student.nationalId || '';
        document.getElementById('edit-student-modal').classList.add('show');
    }
}

function closeEditStudentModal() {
    document.getElementById('edit-student-modal').classList.remove('show');
}

async function saveEditedStudent(e) {
    if(e) e.preventDefault();
    
    const id = parseInt(document.getElementById('editStudentIdModal').value);

let newFirstName, newLastName;
try {
    newFirstName = sanitizeInput(document.getElementById('editStudentFirstNameModal').value, 50);
    newLastName = sanitizeInput(document.getElementById('editStudentLastNameModal').value, 50);
} catch (err) {
    showToast(err.message, 'error');
    return;
}

const newNationalId = document.getElementById('editStudentNationalIdModal').value.trim();

    if (!newFirstName || !newLastName) {
        showToast('نام و نام خانوادگی نمی‌تواند خالی باشد.', 'error');
        return;
    }
    
    if (!newNationalId) {
        showToast('کد ملی نمی‌تواند خالی باشد.', 'error');
        return;
    }
    
    if (newNationalId.length !== 10) {
        showToast('کد ملی باید دقیقاً ۱۰ رقم باشد.', 'error');
        return;
    }
    
    if (!/^\d{10}$/.test(newNationalId)) {
        showToast('کد ملی باید فقط شامل اعداد باشد.', 'error');
        return;
    }
    
    if (!validateNationalId(newNationalId)) {
        showToast('کد ملی وارد شده معتبر نیست (الگوریتم چک‌سام). لطفاً کد صحیح وارد کنید.', 'error');
        return;
    }

    const isDuplicate = window.allStudentsData.some(st => st.nationalId === newNationalId && st.id !== id);
    if (isDuplicate) {
        const duplicateStudent = window.allStudentsData.find(st => st.nationalId === newNationalId && st.id !== id);
        showToast(`این کد ملی قبلاً برای «${duplicateStudent.firstName} ${duplicateStudent.lastName}» در همین سال ثبت شده است.`, 'error');
        return;
    }

    const existing = await getDataById('students', id);
    if (!existing) {
        showToast('دانش‌آموز یافت نشد! ممکن است حذف شده باشد.', 'error');
        closeEditStudentModal();
        loadAllData();
        return;
    }
    const existingGroupId = existing.groupId;

    const data = {
        id: id,
        firstName: newFirstName,
        lastName: newLastName,
        nationalId: newNationalId,
        groupId: existingGroupId,
        academicYear: existing.academicYear || window.activeAcademicYear
    };
    
    try {
        await saveData('students', data);
        
        if (typeof clearFormDirty === 'function') clearFormDirty();
        
        showToast('اطلاعات دانش‌آموز با موفقیت ویرایش شد!', 'success');
        closeEditStudentModal();
        loadAllData();
    } catch (err) {
        console.error('خطا در ویرایش دانش‌آموز:', err);
        
        if (err && err.name === 'ConstraintError') {
            showToast('خطای دیتابیس: این کد ملی قبلاً ثبت شده است.', 'error');
        } else {
            showToast('خطا در ذخیره تغییرات. لطفاً دوباره تلاش کنید.', 'error');
        }
    }
}

// ⏸️ پایان بخش ۱ — منتظر پیام «ادامه» شما هستم تا بخش ۲ را بفرستم.
async function deleteStudent(id) {
    if (!confirm('آیا از حذف این دانش‌آموز مطمئن هستید؟ تمام سوابق ارزشیابی، نمرات آزمون و تشویق‌های این دانش‌آموز نیز حذف خواهد شد!')) return;
    
    try {
        // ۱. حذف رکوردهای ارزشیابی
        const allRecords = await getAllData('records');
        const studentRecords = allRecords.filter(r => r.students && r.students.includes(id));
        for (const rec of studentRecords) {
            rec.students = rec.students.filter(sid => sid !== id);
            if (rec.students.length === 0) {
                await deleteData('records', rec.id);
            } else {
                await saveData('records', rec);
            }
        }

        // ✅ اصلاح باگ: حذف نتایج آزمون دانش‌آموز
        const allResults = await getAllData('examResults');
        const studentResults = allResults.filter(r => r.studentId === id);
        for (const res of studentResults) {
            await deleteData('examResults', res.id);
        }

        // ✅ اصلاح باگ: حذف تشویق‌های قرآن دانش‌آموز
        const allBadges = await getAllData('badgesSettings');
        const studentBadges = allBadges.filter(b => b.studentId === id);
        for (const badge of studentBadges) {
            await deleteData('badgesSettings', badge.id);
        }

        // ۴. حذف خود دانش‌آموز
        await deleteData('students', id);
        
        showToast('دانش‌آموز و تمام سوابق مرتبط حذف شد.', 'success');
        loadAllData();
    } catch (e) {
        console.error(e);
        showToast('خطا در حذف دانش‌آموز!', 'error');
    }
}

async function resetAllStudents() {
    if (window.allStudentsData.length === 0) {
        showToast('هیچ دانش‌آموزی برای حذف وجود ندارد.', 'error');
        return;
    }

    const confirm1 = confirm('⚠️ هشدار شدید:\n\nآیا مطمئن هستید که می‌خواهید تمام دانش‌آموزان این سال تحصیلی را حذف کنید؟ تمام سوابق ارزشیابی، نمرات آزمون و حضور و غیاب آن‌ها نیز پاک خواهد شد.');
    if (!confirm1) return;

    const confirm2 = confirm('🚨 آخرین هشدار!\n\nاین عمل غیرقابل بازگشت است و تمام اطلاعات دانش‌آموزان این سال برای همیشه حذف می‌شود. آیا ۱۰۰٪ مطمئن هستید؟');
    if (!confirm2) return;

    try {
        const currentYear = window.activeAcademicYear;
        
        // ۱. حذف دانش‌آموزان
        for (const st of window.allStudentsData) {
            await deleteData('students', st.id);
        }
        // ۲. حذف رکوردهای ارزشیابی
        for (const rec of window.allRecordsData) {
            await deleteData('records', rec.id);
        }
        // ۳. حذف حضور و غیاب
        for (const att of window.allAttendanceData) {
            await deleteData('attendance', att.id);
        }
        
        // ✅ اصلاح باگ: حذف تمام نتایج آزمون سال جاری
        const allResults = await getAllData('examResults');
        const yearResults = allResults.filter(r => r.academicYear === currentYear);
        for (const res of yearResults) {
            await deleteData('examResults', res.id);
        }
        
        // ✅ اصلاح باگ: حذف تمام تشویق‌های قرآن سال جاری
        const allBadges = await getAllData('badgesSettings');
        const yearBadges = allBadges.filter(b => b.academicYear === currentYear);
        for (const badge of yearBadges) {
            await deleteData('badgesSettings', badge.id);
        }
        
        showToast('تمام دانش‌آموزان و سوابق مرتبط این سال تحصیلی حذف شدند.', 'success');
        loadAllData();
    } catch (e) {
        console.error(e);
        showToast('خطا در حذف دانش‌آموزان!', 'error');
    }
}

async function openStudentDetails(id) {
    const student = window.allStudentsData.find(s => s.id === id);
    if (!student) return;

    currentStudentDetailsId = id;

    // ✅ اصلاح امنیتی: escape نام دانش‌آموز
    document.getElementById('student-details-title').textContent = `👤 جزئیات ${student.firstName} ${student.lastName}`;
    
    switchStudentDetailsTab('summary');
    
    const content = document.getElementById('student-details-content');
    content.innerHTML = '<p style="text-align:center;">در حال محاسبه...</p>';

    const srs = window.allRecordsData.filter(rec => rec.students && rec.students.includes(id));
    const studentPass = student.nationalId ? generateStudentPassword(student.nationalId) : '---';

    let headerHtml = `
    <div style="background: var(--primary-light); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px dashed var(--primary);">
        <p style="margin: 0 0 5px 0;"><strong>کد ملی:</strong> <span style="font-family: 'IRNumber';">${escapeHtml(toPersianNumber(student.nationalId || 'ثبت نشده'))}</span></p>
        <p style="margin: 0;"><strong>رمز عبور:</strong> <span style="font-family: 'IRNumber'; color: var(--primary); font-weight: bold; font-size: 1.2rem;">${escapeHtml(toPersianNumber(studentPass))}</span></p>
    </div>
`;

    let subjectHtml = '<h4 style="color:var(--primary); margin-bottom:10px;">📊 امتیاز به تفکیک دروس</h4>';
    let hasSubjects = false;
    window.allSubjectsData.forEach(sub => {
        const subRecords = srs.filter(r => r.subjectId === sub.id);
        let total = 0;
        subRecords.forEach(r => total += r.finalScore);
        
        if (subRecords.length > 0) {
            // ✅ اصلاح امنیتی: escape نام درس
            subjectHtml += `<div class="details-list-item"><span>${escapeHtml(sub.symbol || '')} ${escapeHtml(sub.name)}</span><strong>${escapeHtml(toPersianNumber(total))} امتیاز</strong></div>`;
            hasSubjects = true;
        }
    });
    if (!hasSubjects) subjectHtml += '<p style="color:#64748b; font-size:0.9rem; text-align:center;">هنوز امتیازی در هیچ درسی ثبت نشده است.</p>';

    let itemHtml = '<h4 style="color:var(--primary); margin-top:20px; margin-bottom:10px;">📝 دفعات و جزئیات ارزشیابی‌ها</h4>';
    let hasItems = false;

    const itemCounts = {};
    srs.forEach(r => {
        if (!itemCounts[r.itemName]) itemCounts[r.itemName] = { count: 0, totalScore: 0 };
        itemCounts[r.itemName].count++;
        itemCounts[r.itemName].totalScore += r.finalScore;
    });

    for (const [itemName, stats] of Object.entries(itemCounts)) {
        // ✅ اصلاح امنیتی: escape نام آیتم
        itemHtml += `<div class="details-list-item"><span>${escapeHtml(itemName)}</span><span style="color:var(--text-muted); font-size:0.85rem;">${escapeHtml(toPersianNumber(stats.count))} بار (${escapeHtml(toPersianNumber(stats.totalScore))} امتیاز)</span></div>`;
        hasItems = true;
    }
    if (!hasItems) itemHtml += '<p style="color:#64748b; font-size:0.9rem; text-align:center;">هیچ ارزشیابی ثبت نشده است.</p>';

    content.innerHTML = headerHtml + subjectHtml + itemHtml;

    loadStudentExamsForDetails(id);

    document.getElementById('student-details-modal').classList.add('show');
}

function closeStudentDetails() {
    document.getElementById('student-details-modal').classList.remove('show');
    currentStudentDetailsId = null;
}

function switchStudentDetailsTab(tab) {
    const btnSummary = document.getElementById('btnStudentTabSummary');
    const btnExams = document.getElementById('btnStudentTabExams');
    const summaryEl = document.getElementById('student-details-summary');
    const examsEl = document.getElementById('student-details-exams');
    
    if (tab === 'summary') {
        if (btnSummary) btnSummary.classList.add('active');
        if (btnExams) btnExams.classList.remove('active');
        if (summaryEl) summaryEl.style.display = 'block';
        if (examsEl) examsEl.style.display = 'none';
    } else {
        if (btnSummary) btnSummary.classList.remove('active');
        if (btnExams) btnExams.classList.add('active');
        if (summaryEl) summaryEl.style.display = 'none';
        if (examsEl) examsEl.style.display = 'block';
    }
}

// ⏸️ پایان بخش ۲ — منتظر پیام «ادامه» شما هستم تا بخش ۳ (آخرین بخش) را بفرستم.
async function loadStudentExamsForDetails(studentId) {
    const container = document.getElementById('student-exams-content');
    if (!container) return;
    
    container.innerHTML = '<p style="text-align:center;">در حال بارگذاری...</p>';
    
    if (!window.allExamsData || window.allExamsData.length === 0) {
        if (typeof loadExamsData === 'function') {
            await loadExamsData();
        }
    }
    
    const exams = window.allExamsData || [];
    const results = window.allExamResultsData || [];
    
    const studentResults = results.filter(r => r.studentId === studentId);
    
    if (exams.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg><use href="#empty-exams"/></svg>
                <div class="empty-title">هنوز آزمونی تعریف نشده!</div>
                <div class="empty-desc">از تب «آزمون‌ها» اولین آزمون رو بساز تا نمرات اینجا نمایش داده بشه.</div>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    const totalExamsWithScore = studentResults.length;
    const totalScores = studentResults.reduce((sum, r) => sum + r.score, 0);
    const avgScore = totalExamsWithScore > 0 ? (totalScores / totalExamsWithScore).toFixed(1) : 0;
    
    html += `
        <div style="background: var(--primary-light); padding: 12px; border-radius: 8px; margin-bottom: 15px; display: flex; justify-content: space-around; flex-wrap: wrap; gap: 10px; font-size: 0.85rem;">
            <span>📊 تعداد آزمون: <strong style="color:var(--primary);">${toPersianNumber(totalExamsWithScore)}</strong></span>
            <span>🎯 میانگین نمرات: <strong style="color:var(--primary);">${toPersianNumber(avgScore)}</strong></span>
        </div>
    `;
    
    const sortedExams = [...exams].sort((a, b) => b.date.localeCompare(a.date));
    
    html += '<h4 style="color:var(--primary); margin-bottom: 10px;">📋 نتایج آزمون‌ها</h4>';
    
    sortedExams.forEach(exam => {
        const sub = window.allSubjectsData.find(s => s.id === exam.subjectId);
        // ✅ اصلاح امنیتی: escape نام و نماد درس
        const subName = sub ? `${escapeHtml(sub.symbol || '')} ${escapeHtml(sub.name)}` : 'بدون درس';
        
        const result = studentResults.find(r => r.examId === exam.id);
        
        let scoreHtml = '';
        let badgeColor = '#94a3b8';
        
        if (result) {
            const percent = (result.score / exam.maxScore) * 100;
            if (percent >= 85) badgeColor = '#22c55e';
            else if (percent >= 60) badgeColor = '#3b82f6';
            else if (percent >= 40) badgeColor = '#f59e0b';
            else badgeColor = '#ef4444';
            
            scoreHtml = `<span class="rank-badge" style="background: ${badgeColor}20; color: ${badgeColor}; font-weight: bold;">${toPersianNumber(result.score)} از ${toPersianNumber(exam.maxScore)} (${toPersianNumber(Math.round(percent))}٪)</span>`;
        } else {
            scoreHtml = `<span class="rank-badge" style="background:#f1f5f9; color:#94a3b8;">ثبت نشده</span>`;
        }
        
        // ✅ اصلاح امنیتی: escape عنوان آزمون
        html += `
            <div class="details-list-item" style="flex-direction: column; align-items: stretch; gap: 5px; padding: 10px; background: var(--input-bg); border-radius: 8px; margin-bottom: 8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color:var(--text-main); font-size: 0.95rem;">${escapeHtml(exam.title)}</strong>
                    ${scoreHtml}
                </div>
                <div style="display:flex; justify-content:space-between; font-size: 0.8rem; color: var(--text-muted);">
                    <span>📚 ${subName}</span>
                    <span>📅 ${toPersianNumber(exam.date)}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ✅ پایان فایل students.js