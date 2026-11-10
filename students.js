// ==========================================
// فایل students.js — منطق تب دانش‌آموزان
// ==========================================

async function saveStudent(e) {
    e.preventDefault();
    
    if (window.allStudentsData.length >= 36) {
        showToast('حداکثر تعداد مجاز دانش‌آموز (۳۶ نفر) تکمیل شده است.', 'error');
        return;
    }

    const data = {
        firstName: document.getElementById('studentFirstName').value,
        lastName: document.getElementById('studentLastName').value,
        groupId: null
    };
    
    await saveData('students', data);
    
    document.getElementById('student-form').reset();
    showToast('دانش‌آموز جدید با موفقیت ثبت شد!', 'success');
    loadAllData();
}

function renderStudentsList() {
    const container = document.getElementById('students-list');
    if (!container) return;
    
    if (window.allStudentsData.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#64748b;">لیست خالی است. ابتدا دانش‌آموز اضافه کنید.</p>';
        const pagination = document.getElementById('students-pagination');
        if (pagination) pagination.style.display = 'none';
        return;
    }

    const studentScores = window.allStudentsData.map(st => {
        let total = 0;
        window.allRecordsData.forEach(rec => {
            if (rec.students && rec.students.includes(st.id)) {
                total += rec.finalScore;
            }
        });
        return { ...st, totalScore: total };
    });

    studentScores.sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return a.lastName.localeCompare(b.lastName, 'fa');
    });

    const uniqueScores = [...new Set(studentScores.map(s => s.totalScore))].filter(s => s > 0).sort((a, b) => b - a);
    const goldScore = uniqueScores.length > 0 ? uniqueScores[0] : -1;
    const silverScore = uniqueScores.length > 1 ? uniqueScores[1] : -1;
    const bronzeScore = uniqueScores.length > 2 ? uniqueScores[2] : -1;

    const totalPages = Math.ceil(studentScores.length / itemsPerPage);
    if (currentPage.students > totalPages) currentPage.students = totalPages;
    if (currentPage.students < 1) currentPage.students = 1;
    
    const startIndex = (currentPage.students - 1) * itemsPerPage;
    const paginated = studentScores.slice(startIndex, startIndex + itemsPerPage);

    container.innerHTML = '';
    paginated.forEach((st, index) => {
        const globalRank = startIndex + index + 1;
        
        let medalHtml = '';
        if (st.totalScore > 0) { 
            if (st.totalScore === goldScore) medalHtml = '<span class="medal-badge">🥇</span>';
            else if (st.totalScore === silverScore) medalHtml = '<span class="medal-badge">🥈</span>';
            else if (st.totalScore === bronzeScore) medalHtml = '<span class="medal-badge">🥉</span>';
        }

        const g = window.allGroupsData.find(x => x.id === st.groupId);
        const groupBadge = g ? `<span class="group-label">${g.symbol} ${g.name}</span>` : '';

        container.innerHTML += `
            <div class="list-item" style="flex-direction: column; align-items: stretch; gap: 5px;">
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <div style="display:flex; align-items:center; gap:5px;">
                        <span style="font-weight:bold; min-width:25px; color:var(--text-muted);">${toPersianNumber(globalRank)}.</span>
                        ${medalHtml}
                        <span><strong>${st.firstName} ${st.lastName}</strong></span>
                        ${groupBadge}
                    </div>
                    <div style="display:flex; align-items:center; gap:5px;">
                        <span class="rank-badge">${toPersianNumber(st.totalScore)} امتیاز</span>
                        <button class="btn btn-secondary btn-sm" onclick="openStudentDetails(${st.id})" title="مشاهده جزئیات">👁️</button>
                        <button class="btn btn-secondary btn-sm" onclick="editStudent(${st.id})" title="ویرایش">✏️</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteStudent(${st.id})" title="حذف">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    });

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
        document.getElementById('edit-student-modal').classList.add('show');
    }
}

function closeEditStudentModal() {
    document.getElementById('edit-student-modal').classList.remove('show');
}

async function saveEditedStudent(e) {
    if(e) e.preventDefault();
    const id = parseInt(document.getElementById('editStudentIdModal').value);
    
    const existing = await getDataById('students', id);
    const existingGroupId = existing ? existing.groupId : null;

    const data = {
        id: id,
        firstName: document.getElementById('editStudentFirstNameModal').value,
        lastName: document.getElementById('editStudentLastNameModal').value,
        groupId: existingGroupId
    };
    
    await saveData('students', data);
    showToast('اطلاعات دانش‌آموز با موفقیت ویرایش شد!', 'success');
    closeEditStudentModal();
    loadAllData();
}

async function deleteStudent(id) {
    if (!confirm('آیا از حذف این دانش‌آموز مطمئن هستید؟ تمام سوابق ارزشیابی این دانش‌آموز نیز حذف خواهد شد!')) return;
    
    const allRecords = await getAllData('records');
    const studentRecords = allRecords.filter(r => r.students.includes(id));
    for (const rec of studentRecords) {
        rec.students = rec.students.filter(sid => sid !== id);
        if (rec.students.length === 0) {
            await deleteData('records', rec.id);
        } else {
            await saveData('records', rec);
        }
    }

    await deleteData('students', id);
    showToast('دانش‌آموز و سوابق مرتبط حذف شد.', 'success');
    loadAllData();
}

async function resetAllStudents() {
    if (window.allStudentsData.length === 0) {
        showToast('هیچ دانش‌آموزی برای حذف وجود ندارد.', 'error');
        return;
    }

    const confirm1 = confirm('⚠️ هشدار شدید:\n\nآیا مطمئن هستید که می‌خواهید تمام دانش‌آموزان را حذف کنید؟ تمام سوابق ارزشیابی و حضور و غیاب آن‌ها نیز پاک خواهد شد.');
    if (!confirm1) return;

    const confirm2 = confirm('🚨 آخرین هشدار!\n\nاین عمل غیرقابل بازگشت است و تمام اطلاعات دانش‌آموزان برای همیشه حذف می‌شود. آیا ۱۰۰٪ مطمئن هستید؟');
    if (!confirm2) return;

    try {
        await clearStore('students');
        await clearStore('records');
        await clearStore('attendance');
        await clearStore('badgesSettings');
        
        showToast('تمام دانش‌آموزان و سوابق مرتبط با موفقیت حذف شدند.', 'success');
        loadAllData();
    } catch (e) {
        console.error(e);
        showToast('خطا در حذف دانش‌آموزان!', 'error');
    }
}

async function openStudentDetails(id) {
    const student = window.allStudentsData.find(s => s.id === id);
    if (!student) return;

    document.getElementById('student-details-title').textContent = `👤 جزئیات ${student.firstName} ${student.lastName}`;
    const content = document.getElementById('student-details-content');
    content.innerHTML = '<p style="text-align:center;">در حال محاسبه...</p>';

    const srs = window.allRecordsData.filter(rec => rec.students && rec.students.includes(id));

    let subjectHtml = '<h4 style="color:var(--primary); margin-bottom:10px;">📊 امتیاز به تفکیک دروس</h4>';
    let hasSubjects = false;
    window.allSubjectsData.forEach(sub => {
        const subRecords = srs.filter(r => r.subjectId === sub.id);
        let total = 0;
        subRecords.forEach(r => total += r.finalScore);
        
        if (subRecords.length > 0) {
            subjectHtml += `<div class="details-list-item"><span>${sub.symbol || ''} ${sub.name}</span><strong>${toPersianNumber(total)} امتیاز</strong></div>`;
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
        itemHtml += `<div class="details-list-item"><span>${itemName}</span><span style="color:var(--text-muted); font-size:0.85rem;">${toPersianNumber(stats.count)} بار (${toPersianNumber(stats.totalScore)} امتیاز)</span></div>`;
        hasItems = true;
    }
    if (!hasItems) itemHtml += '<p style="color:#64748b; font-size:0.9rem; text-align:center;">هیچ ارزشیابی ثبت نشده است.</p>';

    content.innerHTML = subjectHtml + itemHtml;
    document.getElementById('student-details-modal').classList.add('show');
}

function closeStudentDetails() {
    document.getElementById('student-details-modal').classList.remove('show');
}