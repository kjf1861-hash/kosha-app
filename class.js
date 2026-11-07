// ==========================================
// فایل class.js — منطق تب کلاس
// ==========================================

function initClassEvents() {
    document.getElementById('class-form').addEventListener('submit', saveClassProfile);
    document.getElementById('student-form').addEventListener('submit', saveStudent);
}

async function saveClassProfile(e) {
    e.preventDefault();
    const data = {
        id: 1,
        name: document.getElementById('className').value,
        symbol: document.getElementById('classSymbol').value,
        motto: document.getElementById('classMotto').value,
        grade: document.getElementById('classGrade').value,
        teacherName: document.getElementById('teacherName').value,
        schoolName: document.getElementById('schoolName').value
    };
    await saveData('classProfile', data);
    showToast('مشخصات کلاس ذخیره شد!', 'success');
    document.getElementById('header-subtitle').textContent = data.name;
}

async function saveStudent(e) {
    e.preventDefault();
    const editId = document.getElementById('editStudentId').value;
    const data = {
        firstName: document.getElementById('studentFirstName').value,
        lastName: document.getElementById('studentLastName').value,
        groupId: null // گروه بعدا در تب گروه تعیین می‌شود
    };
    if (editId) data.id = parseInt(editId);
    
    await saveData('students', data);
    
    document.getElementById('student-form').reset();
    document.getElementById('editStudentId').value = '';
    document.getElementById('student-submit-btn').textContent = '➕ ثبت دانش‌آموز';
    showToast(editId ? 'دانش‌آموز ویرایش شد!' : 'دانش‌آموز ثبت شد!', 'success');
    loadAllData();
}

function renderClassData() {
    renderStudentsList();
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

    // 1. محاسبه امتیاز کل هر دانش‌آموز
    const studentScores = window.allStudentsData.map(st => {
        let total = 0;
        window.allRecordsData.forEach(rec => {
            if (rec.students && rec.students.includes(st.id)) {
                total += rec.finalScore;
            }
        });
        return { ...st, totalScore: total };
    });

    // 2. مرتب‌سازی: امتیاز (نزولی) -> نام خانوادگی (صعودی/الفبا)
    studentScores.sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return a.lastName.localeCompare(b.lastName, 'fa');
    });

    // 3. تعیین مدال‌ها (قانون تساوی)
    const uniqueScores = [...new Set(studentScores.map(s => s.totalScore))].filter(s => s > 0).sort((a, b) => b - a);
    const goldScore = uniqueScores.length > 0 ? uniqueScores[0] : -1;
    const silverScore = uniqueScores.length > 1 ? uniqueScores[1] : -1;
    const bronzeScore = uniqueScores.length > 2 ? uniqueScores[2] : -1;

    // 4. صفحه‌بندی
    const totalPages = Math.ceil(studentScores.length / itemsPerPage);
    if (currentPage.students > totalPages) currentPage.students = totalPages;
    if (currentPage.students < 1) currentPage.students = 1;
    
    const startIndex = (currentPage.students - 1) * itemsPerPage;
    const paginated = studentScores.slice(startIndex, startIndex + itemsPerPage);

    container.innerHTML = '';
    paginated.forEach((st, index) => {
        const globalRank = startIndex + index + 1;
        
        let medalHtml = '';
        if (st.totalScore === goldScore) medalHtml = '<span class="medal-badge">🥇</span>';
        else if (st.totalScore === silverScore) medalHtml = '<span class="medal-badge">🥈</span>';
        else if (st.totalScore === bronzeScore) medalHtml = '<span class="medal-badge">🥉</span>';

        const g = window.allGroupsData.find(x => x.id === st.groupId);
        const groupBadge = g ? `<span class="group-label">${g.symbol} ${g.name}</span>` : '';

        container.innerHTML += `
            <div class="list-item" style="flex-direction: column; align-items: stretch; gap: 5px;">
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <div style="display:flex; align-items:center; gap:5px;">
                        <span style="font-weight:bold; min-width:25px; color:var(--text-muted);">${globalRank}.</span>
                        ${medalHtml}
                        <span><strong>${st.firstName} ${st.lastName}</strong></span>
                        ${groupBadge}
                    </div>
                    <div style="display:flex; align-items:center; gap:5px;">
                        <span class="rank-badge">${st.totalScore} امتیاز</span>
                        <button class="btn btn-secondary btn-sm" onclick="openStudentDetails(${st.id})" title="مشاهده جزئیات">👁️</button>
                        <button class="btn btn-secondary btn-sm" onclick="editStudent(${st.id})" title="ویرایش">✏️</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteStudent(${st.id})" title="حذف">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    });

    // آپدیت UI صفحه‌بندی
    const pagination = document.getElementById('students-pagination');
    if (pagination) {
        if (totalPages > 1) {
            pagination.style.display = 'flex';
            document.getElementById('studentsPageInfo').textContent = `صفحه ${currentPage.students} از ${totalPages}`;
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
        document.getElementById('studentFirstName').value = student.firstName;
        document.getElementById('studentLastName').value = student.lastName;
        document.getElementById('editStudentId').value = student.id;
        document.getElementById('student-submit-btn').textContent = '💾 به‌روزرسانی دانش‌آموز';
        document.getElementById('student-form').scrollIntoView({ behavior: 'smooth' });
    }
}

async function deleteStudent(id) {
    if (!confirm('آیا از حذف این دانش‌آموز مطمئن هستید؟ تمام سوابق ارزشیابی این دانش‌آموز نیز حذف خواهد شد!')) return;
    
    // حذف رکوردهای ارزشیابی مرتبط
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

// ==========================================
// مشاهده جزئیات دانش‌آموز (👁️)
// ==========================================
async function openStudentDetails(id) {
    const student = window.allStudentsData.find(s => s.id === id);
    if (!student) return;

    document.getElementById('student-details-title').textContent = `👤 جزئیات ${student.firstName} ${student.lastName}`;
    const content = document.getElementById('student-details-content');
    content.innerHTML = '<p style="text-align:center;">در حال محاسبه...</p>';

    const srs = window.allRecordsData.filter(rec => rec.students && rec.students.includes(id));

    // 1. امتیاز به تفکیک دروس
    let subjectHtml = '<h4 style="color:var(--primary); margin-bottom:10px;">📊 امتیاز به تفکیک دروس</h4>';
    let hasSubjects = false;
    window.allSubjectsData.forEach(sub => {
        const subRecords = srs.filter(r => r.subjectId === sub.id);
        let total = 0;
        subRecords.forEach(r => total += r.finalScore);
        
        if (subRecords.length > 0) {
            subjectHtml += `<div class="details-list-item"><span>${sub.symbol || ''} ${sub.name}</span><strong>${total} امتیاز</strong></div>`;
            hasSubjects = true;
        }
    });
    if (!hasSubjects) subjectHtml += '<p style="color:#64748b; font-size:0.9rem; text-align:center;">هنوز امتیازی در هیچ درسی ثبت نشده است.</p>';

    // 2. آمار آیتم‌های ارزشیابی
    let itemHtml = '<h4 style="color:var(--primary); margin-top:20px; margin-bottom:10px;">📝 دفعات و جزئیات ارزشیابی‌ها</h4>';
    let hasItems = false;
    
    const itemCounts = {};
    srs.forEach(r => {
        if (!itemCounts[r.itemName]) itemCounts[r.itemName] = { count: 0, totalScore: 0 };
        itemCounts[r.itemName].count++;
        itemCounts[r.itemName].totalScore += r.finalScore;
    });

    for (const [itemName, stats] of Object.entries(itemCounts)) {
        itemHtml += `<div class="details-list-item"><span>${itemName}</span><span style="color:var(--text-muted); font-size:0.85rem;">${stats.count} بار (${stats.totalScore} امتیاز)</span></div>`;
        hasItems = true;
    }
    if (!hasItems) itemHtml += '<p style="color:#64748b; font-size:0.9rem; text-align:center;">هیچ ارزشیابی ثبت نشده است.</p>';

    content.innerHTML = subjectHtml + itemHtml;
    document.getElementById('student-details-modal').classList.add('show');
}

function closeStudentDetails() {
    document.getElementById('student-details-modal').classList.remove('show');
}

// ==========================================
// خروجی اکسل گزارش کلاسی
// ==========================================
async function exportClassCSV() {
    try {
        let csvContent = "ردیف,نام,نام خانوادگی,مجموع امتیاز\n";
        const studentScores = window.allStudentsData.map(st => {
            let total = 0;
            window.allRecordsData.forEach(rec => {
                if (rec.students && rec.students.includes(st.id)) total += rec.finalScore;
            });
            return { ...st, totalScore: total };
        });
        
        studentScores.sort((a, b) => {
            if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
            return a.lastName.localeCompare(b.lastName, 'fa');
        });

        studentScores.forEach((st, i) => {
            csvContent += `${i + 1},${st.firstName},${st.lastName},${st.totalScore}\n`;
        });

        const BOM = "\uFEFF";
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); 
        a.href = url; 
        a.download = `kosha_class_scores_${new Date().toISOString().slice(0,10)}.csv`; 
        a.click();
        URL.revokeObjectURL(url);
        showToast('فایل اکسل دانلود شد!', 'success');
    } catch (e) {
        console.error(e);
        showToast('خطا در تولید فایل اکسل.', 'error');
    }
}