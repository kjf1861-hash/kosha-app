// ==========================================
// فایل class.js — منطق تب کلاس (داشبورد) و تنظیمات
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

    const data = {
        id: 1,
        name: document.getElementById('className').value,
        symbol: document.getElementById('classSymbol').value,
        motto: document.getElementById('classMotto').value,
        grade: document.getElementById('classGrade').value,
        teacherName: document.getElementById('teacherName').value,
        schoolName: document.getElementById('schoolName').value,
        academicYear: document.getElementById('academicYear').value,
        scheduleActiveDays: selectedDays,
        schedulePeriodsCount: periodsCount
    };
    
    await saveData('classProfile', data);
    
    window.scheduleActiveDays = selectedDays;
    window.schedulePeriodsCount = periodsCount;

    showToast('مشخصات کلاس ذخیره شد!', 'success');
    document.getElementById('header-subtitle').textContent = data.name;
    
    if(typeof closeSettingsModal === 'function') closeSettingsModal();
    
    loadAllData();
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
    document.getElementById('stat-students').textContent = window.allStudentsData.length;
    document.getElementById('stat-subjects').textContent = window.allSubjectsData.length;
    document.getElementById('stat-sessions').textContent = window.allSessionsData.length;
    document.getElementById('stat-records').textContent = window.allRecordsData.length;

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
        { icon: '🌟', value: totalAyats, label: 'آیه حفظ شده' },
        { icon: '✍️', value: handwritingCount, label: 'خوش‌خط‌نویسی' },
        { icon: '🎁', value: specialRewardsCount, label: 'تشویق ویژه' },
        { icon: '🧪', value: examCount, label: 'آزمون برگزار شده' },
        { icon: '📈', value: progressPercent + '%', label: 'پیشرفت ارزشیابی' }
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
                <span style="font-size: 1.5rem; font-weight: bold; color: #22c55e;">${pp}%</span>
                <span style="font-size: 0.75rem; color: var(--text-muted);">حضور</span>
            </div>
        </div>
        <div class="att-legend" style="flex-direction: column; align-items: flex-start; margin-bottom: 0; margin-right: 20px; gap: 10px;">
            <div class="att-legend-item"><div class="att-legend-color present"></div>حاضر: ${present} (${pp}%)</div>
            <div class="att-legend-item"><div class="att-legend-color absent"></div>غایب: ${absent} (${pa}%)</div>
            <div class="att-legend-item"><div class="att-legend-color late"></div>تأخیر: ${late} (${pl}%)</div>
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
                    <strong style="color: var(--primary);">${sub.total} امتیاز</strong>
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
                <span class="rank-badge" style="background: var(--primary); color: white;">${st.totalScore} امتیاز</span>
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
            <span class="rank-badge">${g.totalScore} امتیاز</span>
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
                <span class="rank-badge" style="background:#fee2e2; color:#b91c1c;">${st.totalScore} امتیاز</span>
                <span class="rank-badge" style="background:#fef3c7; color:#b45309;">${st.absences} غیبت</span>
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
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${rec.date}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size: 0.8rem; color: var(--text-muted);">
                    <span>📚 ${subjectName} | 🎯 ${rec.itemName}</span>
                    <span>👥 ${studentCount} نفر</span>
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
                        <span style="font-weight:bold; min-width:25px; color:var(--text-muted);">${index + 1}.</span>
                        <span><strong>${st.firstName} ${st.lastName}</strong></span>
                        ${groupBadge}
                    </div>
                    <span class="rank-badge">${st.totalScore} امتیاز</span>
                </div>
                <div class="score-bar-container">
                    <div class="score-bar-fill ${index === 0 && st.totalScore > 0 ? 'is-first' : ''}" style="width: ${percent}%;"></div>
                </div>
            </div>
        `;
    }).join('');
}

async function exportClassCSV() {
    try {
        // استفاده از Tab به عنوان جداکننده برای سازگاری کامل با اکسل موبایل
        let csvContent = "ردیف\tنام\tنام خانوادگی\tمجموع امتیاز\r\n";
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
            csvContent += `${i + 1}\t"${st.firstName}"\t"${st.lastName}"\t${st.totalScore}\r\n`;
        });

        // *** راه‌حل قطعی: UTF-16LE با BOM و جداکننده Tab ***
        const bom = new Uint8Array([0xFF, 0xFE]); // BOM مخصوص UTF-16LE
        const contentBytes = new Uint8Array(csvContent.length * 2);
        for (let i = 0; i < csvContent.length; i++) {
            const code = csvContent.charCodeAt(i);
            contentBytes[i * 2] = code & 0xFF;
            contentBytes[i * 2 + 1] = code >> 8;
        }
        
        const fullBytes = new Uint8Array(bom.length + contentBytes.length);
        fullBytes.set(bom, 0);
        fullBytes.set(contentBytes, bom.length);

        const blob = new Blob([fullBytes], { type: 'application/vnd.ms-excel;charset=utf-16le;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); 
        a.href = url; 
        a.download = `kosha_class_scores_${new Date().toISOString().slice(0,10)}.xls`; 
        a.click();
        URL.revokeObjectURL(url);
        showToast('فایل اکسل دانلود شد!', 'success');
    } catch (e) {
        console.error(e);
        showToast('خطا در تولید فایل اکسل.', 'error');
    }
}

function printClassReport() {
    const content = document.getElementById('report-card-content');
    if(!content) return;
    
    const classData = document.getElementById('header-subtitle').textContent;
    
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
    
    document.getElementById('report-card-modal').classList.add('show');
    setTimeout(() => {
        window.print();
    }, 100);
}