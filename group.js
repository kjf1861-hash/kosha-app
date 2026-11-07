// ==========================================
// فایل group.js — منطق تب گروه
// ==========================================

let currentGroupDetailsId = null;

function initGroupEvents() {
    document.getElementById('group-form').addEventListener('submit', saveGroup);
}

async function saveGroup(e) {
    e.preventDefault();
    const editId = document.getElementById('editGroupId').value;
    const data = { 
        name: document.getElementById('groupName').value,
        symbol: document.getElementById('groupSymbol').value,
        motto: document.getElementById('groupMotto').value
    };
    if (editId) data.id = parseInt(editId);
    
    await saveData('groups', data);
    
    document.getElementById('group-form').reset();
    document.getElementById('editGroupId').value = '';
    document.getElementById('group-submit-btn').textContent = '➕ ثبت گروه';
    
    showToast(editId ? 'گروه ویرایش شد!' : 'گروه ثبت شد!', 'success');
    loadAllData();
}

function renderGroupData() {
    renderGroupsList();
    renderGroupAssignmentUI();
}

function renderGroupsList() {
    const container = document.getElementById('groups-list');
    if (!container) return;

    if (window.allGroupsData.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#64748b;">لیست خالی است. ابتدا گروه اضافه کنید.</p>';
        return;
    }

    // 1. محاسبه امتیاز کل هر گروه
    const groupScores = window.allGroupsData.map(g => {
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

    // 2. مرتب‌سازی: امتیاز (نزولی) -> نام گروه (الفبا)
    groupScores.sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return a.name.localeCompare(b.name, 'fa');
    });

    // 3. تعیین مدال‌ها (قانون تساوی)
    const uniqueScores = [...new Set(groupScores.map(g => g.totalScore))].filter(s => s > 0).sort((a, b) => b - a);
    const goldScore = uniqueScores.length > 0 ? uniqueScores[0] : -1;
    const silverScore = uniqueScores.length > 1 ? uniqueScores[1] : -1;
    const bronzeScore = uniqueScores.length > 2 ? uniqueScores[2] : -1;

    container.innerHTML = '';
    groupScores.forEach((g, index) => {
        const rank = index + 1;
        let medal = '';
        if (g.totalScore === goldScore) medal = '🥇';
        else if (g.totalScore === silverScore) medal = '🥈';
        else if (g.totalScore === bronzeScore) medal = '🥉';

        const studentCount = window.allStudentsData.filter(s => s.groupId === g.id).length;

        container.innerHTML += `
            <div class="list-item" style="flex-direction: column; align-items: stretch; gap: 8px; padding: 15px;">
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-weight:bold; color:var(--text-muted); min-width:20px;">${rank}.</span>
                        <span class="medal-badge" style="font-size:1.3rem;">${medal}</span>
                        <span style="font-size:1.5rem;">${g.symbol}</span>
                        <div>
                            <strong>${g.name}</strong>
                            <div style="font-size:0.8rem; color:var(--text-muted);">${studentCount} دانش‌آموز</div>
                        </div>
                    </div>
                    <span class="rank-badge">${g.totalScore} امتیاز</span>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:5px; margin-top:5px; border-top:1px dashed var(--border-color); padding-top:10px;">
                    <button class="btn btn-secondary btn-sm" onclick="openGroupDetails(${g.id})" title="مشاهده جزئیات">👁️</button>
                    <button class="btn btn-secondary btn-sm" onclick="editGroup(${g.id})" title="ویرایش">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteGroup(${g.id})" title="حذف">🗑️</button>
                </div>
            </div>
        `;
    });
}

function renderGroupAssignmentUI() {
    const studentSelect = document.getElementById('assignStudentSelect');
    const groupSelect = document.getElementById('assignGroupSelect');
    if (!studentSelect || !groupSelect) return;

    // Populate students
    studentSelect.innerHTML = '<option value="" disabled selected>انتخاب دانش‌آموز...</option>' + 
        window.allStudentsData.map(st => {
            const g = window.allGroupsData.find(x => x.id === st.groupId);
            const groupName = g ? ` (در گروه ${g.name})` : ' (بدون گروه)';
            return `<option value="${st.id}">${st.firstName} ${st.lastName}${groupName}</option>`;
        }).join('');

    // Populate groups
    groupSelect.innerHTML = '<option value="" disabled selected>انتخاب گروه...</option>' + 
        window.allGroupsData.map(g => `<option value="${g.id}">${g.symbol} ${g.name}</option>`).join('');
}

async function assignStudentToGroup() {
    const studentId = document.getElementById('assignStudentSelect').value;
    const groupId = document.getElementById('assignGroupSelect').value;

    if (!studentId || !groupId) {
        showToast('لطفاً دانش‌آموز و گروه را انتخاب کنید.', 'error');
        return;
    }

    try {
        const student = await getDataById('students', parseInt(studentId));
        if (student) {
            student.groupId = parseInt(groupId);
            await saveData('students', student);
            showToast('دانش‌آموز با موفقیت به گروه اختصاص یافت.', 'success');
            loadAllData(); 
        }
    } catch (error) {
        showToast('خطا در اختصاص گروه!', 'error');
    }
}

async function editGroup(id) {
    const group = await getDataById('groups', id);
    if (group) {
        document.getElementById('groupName').value = group.name;
        document.getElementById('groupSymbol').value = group.symbol;
        document.getElementById('groupMotto').value = group.motto;
        document.getElementById('editGroupId').value = group.id;
        document.getElementById('group-submit-btn').textContent = '💾 به‌روزرسانی گروه';
        document.getElementById('group-form').scrollIntoView({ behavior: 'smooth' });
    }
}

async function deleteGroup(id) {
    if (!confirm('آیا از حذف این گروه مطمئن هستید؟ (دانش‌آموزان این گروه بدون گروه خواهند شد)')) return;
    
    // دانش‌آموزان این گروه را بدون گروه میکنیم
    const groupStudents = window.allStudentsData.filter(st => st.groupId === id);
    for (const st of groupStudents) {
        st.groupId = null;
        await saveData('students', st);
    }

    await deleteData('groups', id);
    showToast('گروه حذف شد و دانش‌آموزان آن بدون گروه شدند.', 'success');
    loadAllData();
}

// ==========================================
// مشاهده جزئیات گروه (👁️)
// ==========================================
function openGroupDetails(id) {
    currentGroupDetailsId = id;
    const group = window.allGroupsData.find(g => g.id === id);
    if (!group) return;

    document.getElementById('group-details-title').textContent = `📊 جزئیات گروه: ${group.symbol} ${group.name}`;
    renderGroupDetails();
    document.getElementById('group-details-modal').classList.add('show');
}

function closeGroupDetails() {
    document.getElementById('group-details-modal').classList.remove('show');
    currentGroupDetailsId = null;
}

function renderGroupDetails() {
    const container = document.getElementById('group-details-content');
    if (!container || !currentGroupDetailsId) return;

    const groupStudents = window.allStudentsData.filter(st => st.groupId === currentGroupDetailsId);
    
    if (groupStudents.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#64748b;">هیچ دانش‌آموزی در این گروه وجود ندارد.</p>';
        return;
    }

    // 1. محاسبه امتیاز کل هر دانش‌آموز در کل دروس
    const studentScores = groupStudents.map(st => {
        let total = 0;
        window.allRecordsData.forEach(rec => {
            if (rec.students && rec.students.includes(st.id)) total += rec.finalScore;
        });
        return { ...st, totalScore: total };
    });

    // 2. مرتب‌سازی: امتیاز (نزولی) -> نام خانوادگی (الفبا)
    studentScores.sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return a.lastName.localeCompare(b.lastName, 'fa');
    });

    // 3. تعیین مدال‌ها
    const uniqueScores = [...new Set(studentScores.map(s => s.totalScore))].filter(s => s > 0).sort((a, b) => b - a);
    const goldScore = uniqueScores.length > 0 ? uniqueScores[0] : -1;
    const silverScore = uniqueScores.length > 1 ? uniqueScores[1] : -1;
    const bronzeScore = uniqueScores.length > 2 ? uniqueScores[2] : -1;

    let html = '';
    studentScores.forEach((st, index) => {
        let medal = '';
        if (st.totalScore === goldScore) medal = '🥇';
        else if (st.totalScore === silverScore) medal = '🥈';
        else if (st.totalScore === bronzeScore) medal = '🥉';

        html += `
            <div class="details-list-item" style="background: var(--card-bg); margin-bottom: 5px; border-radius: 8px; border: 1px solid var(--border-color);">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-weight:bold; color:var(--text-muted); min-width:25px;">${index + 1}.</span>
                    <span class="medal-badge" style="font-size:1.2rem;">${medal}</span>
                    <strong>${st.firstName} ${st.lastName}</strong>
                </div>
                <div style="display:flex; align-items:center; gap:5px;">
                    <span class="rank-badge" style="font-size:0.9rem;">${st.totalScore} امتیاز</span>
                    <button class="btn btn-danger btn-sm" onclick="removeStudentFromGroup(${st.id})" title="حذف از گروه">🗑️</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

async function removeStudentFromGroup(studentId) {
    if (!confirm('آیا از حذف این دانش‌آموز از گروه مطمئن هستید؟')) return;
    try {
        const student = await getDataById('students', studentId);
        if (student) {
            student.groupId = null;
            await saveData('students', student);
            showToast('دانش‌آموز از گروه حذف شد.', 'success');
            await loadAllData(); // رفرش لیست‌های پس‌زمینه
            renderGroupDetails(); // رفرش محتوای مودال
        }
    } catch (e) {
        console.error(e);
        showToast('خطا در حذف دانش‌آموز از گروه!', 'error');
    }
}