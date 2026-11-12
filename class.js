// ==========================================
// فایل class.js — منطق تب کلاس (نسخه اصلاح‌شده نهایی)
// ==========================================

async function saveClassProfile(e) {
    e.preventDefault();
    
    const checkedBoxes = document.querySelectorAll('.schedule-day-checkbox:checked');
    const selectedDays = Array.from(checkedBoxes).map(cb => cb.value);
    
    if (selectedDays.length === 0) {
        showToast('حداقل یک روز را برای برنامه هفتگی انتخاب کنید.', 'error');
        return;
    }

    const weekOrder = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
    selectedDays.sort((a, b) => weekOrder.indexOf(a) - weekOrder.indexOf(b));

    const periodsInput = document.getElementById('schedulePeriodsCount');
    let periodsCount = periodsInput ? parseInt(periodsInput.value) : 5;
    if (isNaN(periodsCount) || periodsCount < 1) periodsCount = 5;
    if (periodsCount > 6) periodsCount = 6;

    const classNameEl = document.getElementById('className');
    const classSymbolEl = document.getElementById('classSymbol');
    const classMottoEl = document.getElementById('classMotto');
    const classGradeEl = document.getElementById('classGrade');
    const teacherNameEl = document.getElementById('teacherName');
    const schoolNameEl = document.getElementById('schoolName');
    const academicYearEl = document.getElementById('academicYear');

    if (!classNameEl) return;

    // ذخیره سال تحصیلی انتخاب‌شده در حافظه
    let selectedYear = window.activeAcademicYear;
    if (academicYearEl && academicYearEl.value) {
        selectedYear = academicYearEl.value;
        window.activeAcademicYear = selectedYear;
        localStorage.setItem('kosha-active-academic-year', selectedYear);
    }

    const data = {
        id: 1, // همیشه id=1 باشد تا همیشه یک رکورد کلاس داشته باشیم
        name: classNameEl.value,
        symbol: classSymbolEl ? classSymbolEl.value : '',
        motto: classMottoEl ? classMottoEl.value : '',
        grade: classGradeEl ? classGradeEl.value : '',
        teacherName: teacherNameEl ? teacherNameEl.value : '',
        schoolName: schoolNameEl ? schoolNameEl.value : '',
        academicYear: selectedYear,
        scheduleActiveDays: selectedDays,
        schedulePeriodsCount: periodsCount
    };
    
    try {
        await saveData('classProfile', data);
        
        window.scheduleActiveDays = selectedDays;
        window.schedulePeriodsCount = periodsCount;

        showToast('مشخصات کلاس ذخیره شد!', 'success');
        const headerSubtitle = document.getElementById('header-subtitle');
        if (headerSubtitle) headerSubtitle.textContent = data.name;
        
        // پاک کردن وضعیت ذخیره‌نشده
        if (typeof clearFormDirty === 'function') clearFormDirty();
        
        if(typeof closeSettingsModal === 'function') closeSettingsModal();
        
        // دوباره پر کردن فرم با داده‌های ذخیره شده (تا از پاک شدن جلوگیری شود)
        populateCurrentClassProfile(data);
        
        await loadAllData();
    } catch (err) {
        console.error(err);
        showToast('خطا در ذخیره مشخصات کلاس.', 'error');
    }
}

function populateCurrentClassProfile(classData) {
    const classNameEl = document.getElementById('className');
    const classSymbolEl = document.getElementById('classSymbol');
    const classMottoEl = document.getElementById('classMotto');
    const classGradeEl = document.getElementById('classGrade');
    const teacherNameEl = document.getElementById('teacherName');
    const schoolNameEl = document.getElementById('schoolName');
    const academicYearEl = document.getElementById('academicYear');

    if (classData) {
        if (classNameEl) classNameEl.value = classData.name || '';
        if (classSymbolEl) classSymbolEl.value = classData.symbol || '';
        if (classMottoEl) classMottoEl.value = classData.motto || '';
        if (classGradeEl) classGradeEl.value = classData.grade || '';
        if (teacherNameEl) teacherNameEl.value = classData.teacherName || '';
        if (schoolNameEl) schoolNameEl.value = classData.schoolName || '';
        if (academicYearEl && classData.academicYear) academicYearEl.value = classData.academicYear;
    }
}

function populateScheduleDaysCheckboxes() {
    const container = document.getElementById('schedule-days-checkboxes');
    if (!container) return;

    const weekDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
    
    container.innerHTML = '';
    weekDays.forEach(day => {
        const isChecked = window.scheduleActiveDays.includes(day) ? 'checked' : '';
        const label = document.createElement('label');
        label.className = 'day-checkbox-label';
        label.innerHTML = `
            <input type="checkbox" class="schedule-day-checkbox" value="${day}" ${isChecked}>
            <span>${day}</span>
        `;
        container.appendChild(label);
    });
}

function renderDashboardData() {
    const statStudents = document.getElementById('stat-students');
    const statSubjects = document.getElementById('stat-subjects');
    const statSessions = document.getElementById('stat-sessions');
    const statRecords = document.getElementById('stat-records');

    if (statStudents) statStudents.textContent = toPersianNumber(window.allStudentsData.length);
    if (statSubjects) statSubjects.textContent = toPersianNumber(window.allSubjectsData.length);
    if (statSessions) statSessions.textContent = toPersianNumber(window.allSessionsData.length);
    if (statRecords) statRecords.textContent = toPersianNumber(window.allRecordsData.length);

    const studentScores = window.allStudentsData.map(st => {
        let total = 0;
        window.allRecordsData.forEach(rec => {
            if (rec.students && rec.students.includes(st.id)) total += rec.finalScore;
        });
        return { ...st, totalScore: total };
    });

    renderActivityCards();
    renderAttendanceChart();
    renderSubjectAveragesChart();
    renderTopStudents(studentScores);
    renderTopGroups();
    renderNeedsAttention(studentScores);
    renderRecentActivities();
    renderFullClassReport(studentScores);
    
    // *** کارت گزارش آزمون‌ها ***
    renderExamsDashboard();
}

function renderActivityCards() {
    const container = document.getElementById('dashboard-activity-cards');
    if (!container) return;

    let totalAyats = 0;
    let handwritingCount = 0;
    let specialRewardsCount = 0;
    let examCount = 0;
    const usedItems = new Set();

    window.allRecordsData.forEach(rec => {
        usedItems.add(rec.itemName);
        if (rec.itemName === "پویش حفظ جزء سی قرآن کریم") {
            const match = rec.title.match(/- (\d+) آیه/);
            if (match) totalAyats += parseInt(match[1]);
        } else if (rec.itemName === "تشویق خوش‌خط‌نویسی") {
            handwritingCount++;
        } else if (rec.itemName === "تشویق ویژه") {
            specialRewardsCount++;
        } else if (rec.itemName && rec.itemName.includes('آزمون')) {
            examCount++;
        }
    });

    const totalItems = window.allAssessmentItems ? window.allAssessmentItems.length : 1;
    const progressPercent = Math.round((usedItems.size / totalItems) * 100);

    const cards = [
        { icon: '🌟', value: toPersianNumber(totalAyats), label: 'آیه حفظ شده' },
        { icon: '✍️', value: toPersianNumber(handwritingCount), label: 'خوش‌خط‌نویسی' },
        { icon: '🎁', value: toPersianNumber(specialRewardsCount), label: 'تشویق ویژه' },
        { icon: '🧪', value: toPersianNumber(examCount), label: 'آزمون برگزار شده' },
        { icon: '📈', value: toPersianNumber(progressPercent) + '٪', label: 'پیشرفت ارزشیابی' }
    ];

    container.innerHTML = cards.map(c => `
        <div class="activity-card">
            <div class="ac-icon">${c.icon}</div>
            <div class="ac-value">${c.value}</div>
            <div class="ac-label">${c.label}</div>
        </div>
    `).join('');
}

function renderAttendanceChart() {
    const container = document.getElementById('dashboard-attendance-chart');
    if (!container) return;

    let present = 0, absent = 0, late = 0;
    window.allAttendanceData.forEach(att => {
        if (att.status === 'present') present++;
        else if (att.status === 'absent') absent++;
        else if (att.status === 'late') late++;
    });

    const total = present + absent + late;
    
    if (total === 0) {
        container.innerHTML = '<p style="color:#64748b; text-align:center;">هنوز حضور و غیابی ثبت نشده است.</p>';
        return;
    }

    const pp = Math.round((present / total) * 100);
    const pa = Math.round((absent / total) * 100);
    const pl = Math.round((late / total) * 100);

    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    
    const pDash = (present / total) * circumference;
    const aDash = (absent / total) * circumference;
    const lDash = (late / total) * circumference;

    container.innerHTML = `
        <div style="position: relative; width: 150px; height: 150px;">
            <svg viewBox="0 0 100 100" style="transform: rotate(-90deg); width: 100%; height: 100%;">
                <circle cx="50" cy="50" r="${radius}" fill="transparent" stroke="var(--border-color)" stroke-width="15" />
                ${present > 0 ? `<circle cx="50" cy="50" r="${radius}" fill="transparent" stroke="#22c55e" stroke-width="15" stroke-dasharray="${pDash} ${circumference}" stroke-dashoffset="0" />` : ''}
                ${absent > 0 ? `<circle cx="50" cy="50" r="${radius}" fill="transparent" stroke="#ef4444" stroke-width="15" stroke-dasharray="${aDash} ${circumference}" stroke-dashoffset="-${pDash}" />` : ''}
                ${late > 0 ? `<circle cx="50" cy="50" r="${radius}" fill="transparent" stroke="#f59e0b" stroke-width="15" stroke-dasharray="${lDash} ${circumference}" stroke-dashoffset="-${pDash + aDash}" />` : ''}
            </svg>
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <span style="font-size: 1.5rem; font-weight: bold; color: #22c55e;">${toPersianNumber(pp)}٪</span>
                <span style="font-size: 0.75rem; color: var(--text-muted);">حضور</span>
            </div>
        </div>
        <div class="att-legend" style="flex-direction: column; align-items: flex-start; margin-bottom: 0; margin-right: 20px; gap: 10px;">
            <div class="att-legend-item"><div class="att-legend-color present"></div>حاضر: ${toPersianNumber(present)} (${toPersianNumber(pp)}٪)</div>
            <div class="att-legend-item"><div class="att-legend-color absent"></div>غایب: ${toPersianNumber(absent)} (${toPersianNumber(pa)}٪)</div>
            <div class="att-legend-item"><div class="att-legend-color late"></div>تأخیر: ${toPersianNumber(late)} (${toPersianNumber(pl)}٪)</div>
        </div>
    `;
}

function renderSubjectAveragesChart() {
    const container = document.getElementById('dashboard-subject-averages');
    if (!container) return;

    if (window.allSubjectsData.length === 0) {
        container.innerHTML = '<p style="color:#64748b; text-align:center;">هنوز درسی تعریف نشده است.</p>';
        return;
    }

    const subjectData = window.allSubjectsData.map(sub => {
        let total = 0;
        window.allRecordsData.forEach(rec => {
            if (rec.subjectId === sub.id) total += rec.finalScore;
        });
        return { ...sub, total };
    });

    subjectData.sort((a, b) => b.total - a.total);
    const maxTotal = subjectData[0].total || 1;

    container.innerHTML = subjectData.map(sub => {
        const percent = Math.round((sub.total / maxTotal) * 100);
        return `
            <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 4px;">
                    <span>${sub.symbol || '📚'} ${sub.name}</span>
                    <strong style="color: var(--primary);">${toPersianNumber(sub.total)} امتیاز</strong>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${percent}%;"></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderTopStudents(studentScores) {
    const container = document.getElementById('dashboard-top-students');
    if (!container) return;

    const sorted = [...studentScores].sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return a.lastName.localeCompare(b.lastName, 'fa');
    });

    const topStudents = sorted.filter(st => st.totalScore > 0).slice(0, 3);

    if (topStudents.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#64748b;">هنوز امتیازی ثبت نشده است.</p>';
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    container.innerHTML = topStudents.map((st, index) => {
        const g = window.allGroupsData.find(x => x.id === st.groupId);
        const groupBadge = g ? `<span class="group-label">${g.symbol} ${g.name}</span>` : '';
        return `
            <div class="list-item top-student-row" style="padding: 12px 15px; margin-bottom: 8px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span class="medal-badge" style="font-size:1.5rem;">${medals[index]}</span>
                    <span style="font-size: 1.1rem; font-weight: bold;">${st.firstName} ${st.lastName}</span>
                    ${groupBadge}
                </div>
                <span class="rank-badge" style="background: var(--primary); color: white;">${toPersianNumber(st.totalScore)} امتیاز</span>
            </div>
        `;
    }).join('');
}

function renderTopGroups() {
    const container = document.getElementById('dashboard-top-groups');
    if (!container) return;

    if (window.allGroupsData.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#64748b;">هنوز گروهی تعریف نشده است.</p>';
        return;
    }

    const groupData = window.allGroupsData.map(g => {
        let total = 0;
        window.allRecordsData.forEach(rec => {
            if (rec.students) {
                rec.students.forEach(stId => {
                    const st = window.allStudentsData.find(s => s.id === stId);
                    if (st && st.groupId === g.id) total += rec.finalScore;
                });
            }
        });
        return { ...g, totalScore: total };
    });

    groupData.sort((a, b) => b.totalScore - a.totalScore);
    const topGroups = groupData.filter(g => g.totalScore > 0).slice(0, 3);

    if (topGroups.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#64748b;">هنوز امتیازی برای گروه‌ها ثبت نشده است.</p>';
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    container.innerHTML = topGroups.map((g, index) => `
        <div class="list-item" style="padding: 12px 15px; margin-bottom: 8px; border-right: 4px solid var(--primary);">
            <div style="display:flex; align-items:center; gap:10px;">
                <span class="medal-badge" style="font-size:1.5rem;">${medals[index]}</span>
                <span style="font-size:1.3rem;">${g.symbol}</span>
                <span style="font-size: 1.1rem; font-weight: bold;">${g.name}</span>
            </div>
            <span class="rank-badge">${toPersianNumber(g.totalScore)} امتیاز</span>
        </div>
    `).join('');
}

function renderNeedsAttention(studentScores) {
    const container = document.getElementById('dashboard-needs-attention');
    if (!container) return;

    if (studentScores.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#64748b;">لیست خالی است.</p>';
        return;
    }

    const studentStats = studentScores.map(st => {
        let absences = 0;
        window.allAttendanceData.forEach(att => {
            if (att.studentId === st.id && att.status === 'absent') absences++;
        });
        return { ...st, absences };
    });

    studentStats.sort((a, b) => {
        if (a.totalScore !== b.totalScore) return a.totalScore - b.totalScore;
        return b.absences - a.absences;
    });

    const needsAttention = studentStats.slice(0, 3);

    container.innerHTML = needsAttention.map(st => `
        <div class="list-item" style="padding: 12px 15px; background: rgba(255,255,255,0.5);">
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size: 1.2rem;">⚠️</span>
                <strong>${st.firstName} ${st.lastName}</strong>
            </div>
            <div style="display:flex; gap:8px; font-size: 0.85rem;">
                <span class="rank-badge" style="background:#fee2e2; color:#b91c1c;">${toPersianNumber(st.totalScore)} امتیاز</span>
                <span class="rank-badge" style="background:#fef3c7; color:#b45309;">${toPersianNumber(st.absences)} غیبت</span>
            </div>
        </div>
    `).join('');
}

function renderRecentActivities() {
    const container = document.getElementById('dashboard-recent-activities');
    if (!container) return;

    if (window.allRecordsData.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#64748b;">هنوز فعالیتی ثبت نشده است.</p>';
        return;
    }

    const sorted = [...window.allRecordsData].sort((a, b) => b.id - a.id).slice(0, 4);

    container.innerHTML = sorted.map(rec => {
        const subject = window.allSubjectsData.find(s => s.id === rec.subjectId);
        const subjectName = subject ? `${subject.symbol || ''} ${subject.name}` : 'بدون درس';
        const studentCount = rec.students ? rec.students.length : 0;
        
        return `
            <div class="list-item" style="padding: 10px 15px; flex-direction: column; align-items: stretch; gap: 5px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color: var(--primary); font-size: 0.95rem;">${rec.title}</strong>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${toPersianNumber(rec.date)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size: 0.8rem; color: var(--text-muted);">
                    <span>📚 ${subjectName} | 🎯 ${rec.itemName}</span>
                    <span>👥 ${toPersianNumber(studentCount)} نفر</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderFullClassReport(studentScores) {
    const reportsList = document.getElementById('reports-list');
    if (!reportsList) return;

    if (studentScores.length === 0) {
        reportsList.innerHTML = '<p style="text-align:center; color:#64748b;">لیست خالی است.</p>';
        return;
    }

    const sorted = [...studentScores].sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return a.lastName.localeCompare(b.lastName, 'fa');
    });

    reportsList.innerHTML = sorted.map((st, index) => {
        const g = window.allGroupsData.find(x => x.id === st.groupId);
        const groupBadge = g ? `<span class="group-label" style="margin-right:5px;">${g.symbol} ${g.name}</span>` : '';
        
        const maxScore = sorted[0].totalScore || 1;
        const percent = Math.round((st.totalScore / maxScore) * 100);

        return `
            <div class="list-item" style="flex-direction: column; align-items: stretch; gap: 5px; margin-bottom: 8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <div style="display:flex; align-items:center; gap:5px;">
                        <span style="font-weight:bold; min-width:25px; color:var(--text-muted);">${toPersianNumber(index + 1)}.</span>
                        <span><strong>${st.firstName} ${st.lastName}</strong></span>
                        ${groupBadge}
                    </div>
                    <span class="rank-badge">${toPersianNumber(st.totalScore)} امتیاز</span>
                </div>
                <div class="score-bar-container">
                    <div class="score-bar-fill ${index === 0 && st.totalScore > 0 ? 'is-first' : ''}" style="width: ${percent}%;"></div>
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// گزارش جامع آزمون‌ها در داشبورد
// ==========================================
function renderExamsDashboard() {
    const container = document.getElementById('dashboard-exams-report');
    if (!container) return;
    
    if (!window.allExamsData) window.allExamsData = [];
    if (!window.allExamResultsData) window.allExamResultsData = [];
    
    const exams = window.allExamsData;
    const results = window.allExamResultsData;
    
    if (exams.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#64748b; padding: 15px;">هنوز آزمونی تعریف نشده است. از تب «آزمون‌ها» اولین آزمون را بسازید.</p>';
        return;
    }
    
    const totalExams = exams.length;
    const totalResults = results.length;
    
    let totalScorePercent = 0;
    let validResults = 0;
    results.forEach(r => {
        const exam = exams.find(e => e.id === r.examId);
        if (exam) {
            totalScorePercent += (r.score / exam.maxScore) * 100;
            validResults++;
        }
    });
    const avgPercent = validResults > 0 ? Math.round(totalScorePercent / validResults) : 0;
    
    const studentPercentMap = {};
    results.forEach(r => {
        const exam = exams.find(e => e.id === r.examId);
        if (!exam) return;
        const percent = (r.score / exam.maxScore) * 100;
        if (!studentPercentMap[r.studentId]) studentPercentMap[r.studentId] = { total: 0, count: 0 };
        studentPercentMap[r.studentId].total += percent;
        studentPercentMap[r.studentId].count++;
    });
    
    let bestStudentId = null;
    let bestAvg = -1;
    for (const sid in studentPercentMap) {
        const avg = studentPercentMap[sid].total / studentPercentMap[sid].count;
        if (avg > bestAvg) { bestAvg = avg; bestStudentId = parseInt(sid); }
    }
    
    let bestStudentHtml = '';
    if (bestStudentId) {
        const st = window.allStudentsData.find(s => s.id === bestStudentId);
        if (st) {
            bestStudentHtml = `
                <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 12px; border-radius: 12px; text-align: center; color: white;">
                    <div style="font-size: 1.8rem; margin-bottom: 4px;">🏆</div>
                    <div style="font-size: 0.75rem; opacity: 0.9;">بهترین دانش‌آموز</div>
                    <div style="font-weight: bold; font-size: 1rem; margin-top: 4px;">${st.firstName} ${st.lastName}</div>
                    <div style="font-size: 0.8rem; margin-top: 2px;">میانگین: ${toPersianNumber(Math.round(bestAvg))}٪</div>
                </div>
            `;
        }
    } else {
        bestStudentHtml = `
            <div style="background: var(--input-bg); padding: 12px; border-radius: 12px; text-align: center; color: var(--text-muted);">
                <div style="font-size: 1.8rem; margin-bottom: 4px;">🏆</div>
                <div style="font-size: 0.85rem;">هنوز نمره‌ای ثبت نشده</div>
            </div>
        `;
    }
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 15px;">
            <div class="dashboard-card" style="padding: 12px 8px;">
                <div class="dc-icon" style="font-size: 1.5rem;">🎓</div>
                <div class="dc-value" style="font-size: 1.4rem;">${toPersianNumber(totalExams)}</div>
                <div class="dc-label" style="font-size: 0.75rem;">آزمون</div>
            </div>
            <div class="dashboard-card" style="padding: 12px 8px;">
                <div class="dc-icon" style="font-size: 1.5rem;">👥</div>
                <div class="dc-value" style="font-size: 1.4rem;">${toPersianNumber(totalResults)}</div>
                <div class="dc-label" style="font-size: 0.75rem;">نمره ثبت‌شده</div>
            </div>
            <div class="dashboard-card" style="padding: 12px 8px;">
                <div class="dc-icon" style="font-size: 1.5rem;">📊</div>
                <div class="dc-value" style="font-size: 1.4rem; color: ${avgPercent >= 60 ? '#22c55e' : avgPercent >= 40 ? '#f59e0b' : '#ef4444'};">${toPersianNumber(avgPercent)}٪</div>
                <div class="dc-label" style="font-size: 0.75rem;">میانگین کل</div>
            </div>
        </div>
        ${bestStudentHtml}
    `;
}

async function exportClassCSV() {
    try {
        let csvContent = "ردیف,نام,نام خانوادگی,مجموع امتیاز\r\n";
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
            csvContent += `${i + 1},"${st.firstName}","${st.lastName}",${st.totalScore}\r\n`;
        });

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); 
        a.href = url; 
        a.download = `kosha_class_scores_${new Date().toISOString().slice(0,10)}.csv`; 
        a.click();
        URL.revokeObjectURL(url);
        showToast('فایل CSV دانلود شد!', 'success');
    } catch (e) {
        showToast('خطا در تولید فایل.', 'error');
    }
}

function printClassReport() {
    const content = document.getElementById('report-card-content');
    if(!content) return;
    
    const headerSubtitle = document.getElementById('header-subtitle');
    const classData = headerSubtitle ? headerSubtitle.textContent : '';
    
    let html = `
        <div class="rc-header">
            <h2>گزارش امتیازات کلاس</h2>
            <p>${classData} - سال تحصیلی ${toPersianNumber(window.activeAcademicYear)}</p>
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
                <td style="border: 1px solid #cbd5e1; padding: 8px;">${toPersianNumber(i + 1)}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align:right;">${st.firstName} ${st.lastName}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">${toPersianNumber(st.totalScore)}</td>
            </tr>
        `;
    });
    
    html += `</tbody></table>`;
    content.innerHTML = html;
    
    const modal = document.getElementById('report-card-modal');
    if (modal) modal.classList.add('show');
    setTimeout(() => { window.print(); }, 100);
}