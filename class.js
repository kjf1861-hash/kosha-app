// ==========================================
// فایل class.js — منطق تب کلاس (داشبورد) و تنظیمات
// ==========================================

async function saveClassProfile(e) {
    e.preventDefault();
    const data = {
        id: 1,
        name: document.getElementById('className').value,
        symbol: document.getElementById('classSymbol').value,
        motto: document.getElementById('classMotto').value,
        grade: document.getElementById('classGrade').value,
        teacherName: document.getElementById('teacherName').value,
        schoolName: document.getElementById('schoolName').value,
        academicYear: document.getElementById('academicYear').value
    };
    await saveData('classProfile', data);
    showToast('مشخصات کلاس ذخیره شد!', 'success');
    document.getElementById('header-subtitle').textContent = data.name;
    
    if(typeof closeSettingsModal === 'function') closeSettingsModal();
    
    loadAllData();
}

// ==========================================
// منطق داشبورد کلاس (تب اول)
// ==========================================
function renderDashboardData() {
    // 1. آمار کلی
    const statStudents = document.getElementById('stat-students');
    if (statStudents) statStudents.textContent = window.allStudentsData.length;
    
    const statSubjects = document.getElementById('stat-subjects');
    if (statSubjects) statSubjects.textContent = window.allSubjectsData.length;
    
    const statSessions = document.getElementById('stat-sessions');
    if (statSessions) statSessions.textContent = window.allSessionsData.length;
    
    const statRecords = document.getElementById('stat-records');
    if (statRecords) statRecords.textContent = window.allRecordsData.length;

    // 2. محاسبه امتیازات دانش‌آموزان برای رتبه‌بندی
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

    // 3. رندر شاگردان برتر (فقط کسانی که امتیاز بالای ۰ دارند)
    const topStudentsContainer = document.getElementById('dashboard-top-students');
    if (topStudentsContainer) {
        const topStudents = studentScores.filter(st => st.totalScore > 0).slice(0, 3);

        if (topStudents.length === 0) {
            topStudentsContainer.innerHTML = '<p style="text-align:center; color:#64748b;">هنوز امتیازی ثبت نشده است.</p>';
        } else {
            topStudentsContainer.innerHTML = '';
            const medals = ['🥇', '🥈', '🥉'];
            
            topStudents.forEach((st, index) => {
                const g = window.allGroupsData.find(x => x.id === st.groupId);
                const groupBadge = g ? `<span class="group-label">${g.symbol} ${g.name}</span>` : '';
                
                topStudentsContainer.innerHTML += `
                    <div class="list-item top-student-row" style="padding: 12px 15px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span class="medal-badge" style="font-size:1.5rem;">${medals[index]}</span>
                            <span style="font-size: 1.1rem; font-weight: bold;">${st.firstName} ${st.lastName}</span>
                            ${groupBadge}
                        </div>
                        <span class="rank-badge" style="background: var(--primary); color: white;">${st.totalScore} امتیاز</span>
                    </div>
                `;
            });
        }
    }

    // 4. رندر گزارش کامل امتیازات کلاس
    const reportsList = document.getElementById('reports-list');
    if (reportsList) {
        if (studentScores.length === 0) {
            reportsList.innerHTML = '<p style="text-align:center; color:#64748b;">لیست خالی است.</p>';
        } else {
            reportsList.innerHTML = '';
            studentScores.forEach((st, index) => {
                const g = window.allGroupsData.find(x => x.id === st.groupId);
                const groupBadge = g ? `<span class="group-label" style="margin-right:5px;">${g.symbol} ${g.name}</span>` : '';
                
                reportsList.innerHTML += `
                    <div class="list-item" style="flex-direction: column; align-items: stretch; gap: 5px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                            <div style="display:flex; align-items:center; gap:5px;">
                                <span style="font-weight:bold; min-width:25px; color:var(--text-muted);">${index + 1}.</span>
                                <span><strong>${st.firstName} ${st.lastName}</strong></span>
                                ${groupBadge}
                            </div>
                            <span class="rank-badge">${st.totalScore} امتیاز</span>
                        </div>
                        <div class="score-bar-container">
                            <div class="score-bar-fill ${index === 0 && st.totalScore > 0 ? 'is-first' : ''}" style="width: ${studentScores[0].totalScore > 0 ? (st.totalScore / studentScores[0].totalScore) * 100 : 0}%;"></div>
                        </div>
                    </div>
                `;
            });
        }
    }
}

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

// تابع اختصاصی چاپ گزارش کلاس
function printClassReport() {
    const content = document.getElementById('report-card-content');
    if(!content) return;
    
    const classData = window.allStudentsData.length > 0 ? document.getElementById('header-subtitle').textContent : 'کلاس';
    
    let html = `
        <div class="rc-header">
            <h2>گزارش امتیازات کلاس</h2>
            <p>${classData} - سال تحصیلی ${window.activeAcademicYear}</p>
        </div>
        <table style="width:100%; border-collapse: collapse; margin-top:15px; font-family:inherit; text-align:center;">
            <thead>
                <tr style="background: #f1f5f9;">
                    <th style="border: 1px solid #cbd5e1; padding: 8px;">رتبه</th>
                    <th style="border: 1px solid #cbd5e1; padding: 8px; text-align:right;">نام و نام خانوادگی</th>
                    <th style="border: 1px solid #cbd5e1; padding: 8px;">مجموع امتیاز</th>
                </tr>
            </thead>
            <tbody>
    `;
    
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
        html += `
            <tr>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">${i + 1}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align:right;">${st.firstName} ${st.lastName}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">${st.totalScore}</td>
            </tr>
        `;
    });
    
    html += `</tbody></table>`;
    content.innerHTML = html;
    
    // باز کردن مودال و چاپ
    document.getElementById('report-card-modal').classList.add('show');
    setTimeout(() => {
        window.print();
    }, 100);
}