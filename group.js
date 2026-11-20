// ==========================================
// فایل group.js — منطق تب گروه
// ==========================================

let currentGroupDetailsId = null;

function initGroupEvents() {
    const groupForm = document.getElementById('group-form');
    if (groupForm && !groupForm.dataset.listenerAttached) {
        groupForm.addEventListener('submit', saveGroup);
        groupForm.dataset.listenerAttached = 'true';
    }
}

async function saveGroup(e) {
    e.preventDefault();

    if (window.allGroupsData.length >= 12) {
        showToast('حداکثر تعداد مجاز گروه (۱۲ گروه) تکمیل شده است.', 'error');
        return;
    }

    const nameEl = document.getElementById('groupName');
    const symbolEl = document.getElementById('groupSymbol');
    const mottoEl = document.getElementById('groupMotto');
    if (!nameEl || !symbolEl) return;

    let sanitized;
    try {
        sanitized = {
            name: sanitizeInput(nameEl.value, 80),
            symbol: sanitizeInput(symbolEl.value, 10),
            motto: mottoEl ? sanitizeInput(mottoEl.value, 200) : ''
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
        await saveData('groups', data);
        
        const form = document.getElementById('group-form');
        if (form) form.reset();
        showToast('گروه جدید با موفقیت ثبت شد!', 'success');
        
        if (typeof clearFormDirty === 'function') clearFormDirty();
        
        loadAllData();
        
        if (form) form.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        window.handleError(err, 'خطا در ثبت گروه! لطفاً دوباره تلاش کنید.');
    }
}

function renderGroupData() {
    renderGroupsList();
}

function renderGroupsList() {
    const container = document.getElementById('groups-list');
    if (!container) return;

    if (window.allGroupsData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg><use href="#empty-groups"/></svg>
                <div class="empty-title">هنوز گروهی ایجاد نکردی!</div>
                <div class="empty-desc">گروه‌ها بهت کمک می‌کنن تا رقابت سالم بین دانش‌آموزها ایجاد کنی.</div>
                <button class="empty-action" onclick="document.getElementById('groupName').focus()">➕ ایجاد اولین گروه</button>
            </div>
        `;
        return;
    }

    if (!window._cacheGroupScores && typeof buildScoreCaches === 'function') {
        buildScoreCaches();
    }
    const groupCache = window._cacheGroupScores || {};

    const groupStudentCount = {};
    for (const st of window.allStudentsData) {
        if (st.groupId) {
            groupStudentCount[st.groupId] = (groupStudentCount[st.groupId] || 0) + 1;
        }
    }

    const groupScores = window.allGroupsData.map(g => ({
        ...g,
        totalScore: groupCache[g.id] || 0,
        studentCount: groupStudentCount[g.id] || 0
    }));

    groupScores.sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return a.name.localeCompare(b.name, 'fa');
    });

    // ✅ بهینه‌سازی (اولویت ۳): استفاده از تابع مشترک در app.js
    const medals = window.calculateMedals(groupScores, 'totalScore');

    let html = '';
    for (let i = 0; i < groupScores.length; i++) {
        const g = groupScores[i];
        const rank = i + 1;
        const medal = window.getMedalEmoji(g.totalScore, medals);

        html += `
            <div class="list-item" style="flex-direction: column; align-items: stretch; gap: 8px; padding: 15px;">
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%; flex-wrap: wrap; gap: 10px;">
                    <div style="display:flex; align-items:center; gap:8px; flex: 1 1 200px; min-width: 0;">
                        <span style="font-weight:bold; color:var(--text-muted); min-width:20px;">${toPersianNumber(rank)}.</span>
                        <span class="medal-badge" style="font-size:1.3rem;">${medal}</span>
                        <span style="font-size:1.5rem;">${escapeHtml(g.symbol)}</span>
                        <div style="word-break: break-word;">
                            <strong>${escapeHtml(g.name)}</strong>
                            <div style="font-size:0.8rem; color:var(--text-muted);">${toPersianNumber(g.studentCount)} دانش‌آموز</div>
                        </div>
                    </div>
                    <span class="rank-badge" style="flex-shrink: 0;">${toPersianNumber(g.totalScore)} امتیاز</span>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:5px; margin-top:5px; border-top:1px dashed var(--border-color); padding-top:10px;">
                    <button class="btn btn-secondary btn-sm" onclick="openGroupDetails(${g.id})" title="مشاهده جزئیات و مدیریت اعضا">👁️</button>
                    <button class="btn btn-secondary btn-sm" onclick="editGroup(${g.id})" title="ویرایش">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteGroup(${g.id})" title="حذف">🗑️</button>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

async function editGroup(id) {
    const group = await getDataById('groups', id);
    if (group) {
        const editId = document.getElementById('editGroupIdModal');
        const editName = document.getElementById('editGroupNameModal');
        const editSymbol = document.getElementById('editGroupSymbolModal');
        const editMotto = document.getElementById('editGroupMottoModal');
        if(editId) editId.value = group.id;
        if(editName) editName.value = group.name;
        if(editSymbol) editSymbol.value = group.symbol;
        if(editMotto) editMotto.value = group.motto;
        const modal = document.getElementById('edit-group-modal');
        if (modal) modal.classList.add('show');
    }
}

function closeEditGroupModal() {
    const modal = document.getElementById('edit-group-modal');
    if (modal) modal.classList.remove('show');
}

async function saveEditedGroup(e) {
    if(e) e.preventDefault();
    const idEl = document.getElementById('editGroupIdModal');
    if (!idEl) return;
    const id = parseInt(idEl.value);
    
    const existing = await getDataById('groups', id);

    let sanitized;
    try {
        sanitized = {
            name: sanitizeInput(document.getElementById('editGroupNameModal').value, 80),
            symbol: sanitizeInput(document.getElementById('editGroupSymbolModal').value, 10),
            motto: sanitizeInput(document.getElementById('editGroupMottoModal').value, 200)
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
        await saveData('groups', data);
        showToast('گروه با موفقیت ویرایش شد!', 'success');
        
        if (typeof clearFormDirty === 'function') clearFormDirty();
        
        closeEditGroupModal();
        loadAllData();
    } catch (err) {
        window.handleError(err, 'خطا در ویرایش گروه! لطفاً دوباره تلاش کنید.');
    }
}

async function deleteGroup(id) {
    if (!confirm('آیا از حذف این گروه مطمئن هستید؟ (دانش‌آموزان این گروه بدون گروه خواهند شد)')) return;
    
    try {
        const groupStudents = window.allStudentsData.filter(st => st.groupId === id);
        
        // ✅ بهینه‌سازی (اولویت ۲): استفاده از saveBulkData برای به‌روزرسانی یک‌جای دانش‌آموزان
        if (groupStudents.length > 0) {
            const updatedStudents = groupStudents.map(st => ({ ...st, groupId: null }));
            await saveBulkData('students', updatedStudents);
        }

        await deleteData('groups', id);
        showToast('گروه حذف شد و دانش‌آموزان آن بدون گروه شدند.', 'success');
        loadAllData();
    } catch (e) {
        console.error(e);
        showToast('خطا در حذف گروه!', 'error');
    }
}
function openGroupDetails(id) {
    const group = window.allGroupsData.find(g => g.id === id);
    if (!group) {
        showToast('گروه یافت نشد.', 'error');
        return;
    }
    
    currentGroupDetailsId = id;

    const titleEl = document.getElementById('group-details-title');
    if (titleEl) titleEl.textContent = `📊 جزئیات گروه: ${group.symbol} ${group.name}`;
    
    populateModalStudentSelect(); 

    renderGroupDetails();
    const modal = document.getElementById('group-details-modal');
    if (modal) modal.classList.add('show');
}

function closeGroupDetails() {
    const modal = document.getElementById('group-details-modal');
    if (modal) modal.classList.remove('show');
    currentGroupDetailsId = null;
}

function populateModalStudentSelect() {
    const select = document.getElementById('assignStudentSelectModal');
    if (!select) return;
    
    // همه دانش‌آموزان به جز کسانی که در همین گروه هستند
    const availableStudents = window.allStudentsData.filter(st => st.groupId !== currentGroupDetailsId);
    
    if (availableStudents.length === 0) {
        select.innerHTML = '<option value="" disabled selected>همه دانش‌آموزان در این گروه هستند.</option>';
    } else {
        // ✅ اصلاح: نمایش وضعیت گروه فعلی برای دانش‌آموزانی که در گروه دیگری هستند
        select.innerHTML = '<option value="" disabled selected>انتخاب دانش‌آموز...</option>' + 
            availableStudents.map(st => {
                let groupInfo = '';
                if (st.groupId) {
                    const otherGroup = window.allGroupsData.find(g => g.id === st.groupId);
                    if (otherGroup) {
                        groupInfo = ` (عضو گروه: ${otherGroup.name})`;
                    }
                }
                return `<option value="${st.id}">${escapeHtml(st.firstName)} ${escapeHtml(st.lastName)}${escapeHtml(groupInfo)}</option>`;
            }).join('');
    }
}

async function assignStudentFromModal() {
    const select = document.getElementById('assignStudentSelectModal');
    if (!select) return;
    const studentId = select.value;
    if (!studentId) {
        showToast('لطفاً یک دانش‌آموز را از لیست انتخاب کنید.', 'error');
        return;
    }

    // ۱. محاسبه ظرفیت مجاز برای هر گروه
    const totalStudents = window.allStudentsData.length;
    const totalGroups = window.allGroupsData.length;
    
    // فرمول: سقف(تعداد کل / تعداد گروه‌ها) + ۲ (انعطاف برای اعداد فرد و جلوگیری از عدم تعادل شدید)
    const maxCapacity = totalGroups > 0 ? Math.ceil(totalStudents / totalGroups) + 2 : totalStudents;
    
    // محاسبه تعداد فعلی اعضای این گروه
    const currentGroupMembersCount = window.allStudentsData.filter(st => st.groupId === currentGroupDetailsId).length;

    // ۲. بررسی محدودیت ظرفیت
    if (currentGroupMembersCount >= maxCapacity) {
        showToast(`ظرفیت این گروه تکمیل شده است. (حداکثر مجاز برای این گروه: ${toPersianNumber(maxCapacity)} نفر)`, 'error');
        return;
    }

    try {
        const student = await getDataById('students', parseInt(studentId));
        if (student) {
            // ۳. بررسی اینکه آیا دانش‌آموز در گروه دیگری است؟
            if (student.groupId && student.groupId !== currentGroupDetailsId) {
                const oldGroup = window.allGroupsData.find(g => g.id === student.groupId);
                const oldGroupName = oldGroup ? oldGroup.name : 'دیگر';
                if (!confirm(`این دانش‌آموز در حال حاضر در گروه «${oldGroupName}» است.\nآیا مایلید او را به این گروه منتقل کنید؟`)) {
                    return;
                }
            }

            // ۴. ذخیره تغییرات
            student.groupId = currentGroupDetailsId;
            await saveData('students', student);
            showToast('دانش‌آموز با موفقیت به گروه اضافه/منتقل شد.', 'success');
            
            await loadAllData(); 
            populateModalStudentSelect(); 
            renderGroupDetails(); 
        }
    } catch (e) {
        console.error(e);
        showToast('خطا در اختصاص گروه!', 'error');
    }
}

function renderGroupDetails() {
    const container = document.getElementById('group-details-content');
    if (!container || !currentGroupDetailsId) return;

    const groupStudents = window.allStudentsData.filter(st => st.groupId === currentGroupDetailsId);
    
    if (groupStudents.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#64748b;">هیچ دانش‌آموزی در این گروه وجود ندارد.</p>';
        return;
    }

    if (!window._cacheStudentScores && typeof buildScoreCaches === 'function') {
        buildScoreCaches();
    }
    const scoreCache = window._cacheStudentScores || {};

    const studentScores = groupStudents.map(st => ({
        ...st,
        totalScore: scoreCache[st.id] || 0
    }));

    studentScores.sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return a.lastName.localeCompare(b.lastName, 'fa');
    });

    // ✅ بهینه‌سازی (اولویت ۳): استفاده از تابع مشترک در app.js
    const medals = window.calculateMedals(studentScores, 'totalScore');

    let html = '';
    for (let i = 0; i < studentScores.length; i++) {
        const st = studentScores[i];
        const medal = window.getMedalEmoji(st.totalScore, medals);

        html += `
            <div class="details-list-item" style="background: var(--card-bg); margin-bottom: 5px; border-radius: 8px; border: 1px solid var(--border-color); padding: 10px; flex-wrap: wrap; gap: 5px;">
                <div style="display:flex; align-items:center; gap:8px; flex: 1 1 auto; min-width: 0;">
                    <span style="font-weight:bold; color:var(--text-muted); min-width:25px;">${toPersianNumber(i + 1)}.</span>
                    <span class="medal-badge" style="font-size:1.2rem;">${medal}</span>
                    <strong style="word-break: break-word;">${escapeHtml(st.firstName)} ${escapeHtml(st.lastName)}</strong>
                </div>
                <div style="display:flex; align-items:center; gap:5px; flex-shrink: 0; margin-right: auto;">
                    <span class="rank-badge" style="font-size:0.9rem; white-space: nowrap;">${toPersianNumber(st.totalScore)} امتیاز</span>
                    <button class="btn btn-danger btn-sm" onclick="removeStudentFromGroup(${st.id})" title="حذف از گروه">🗑️</button>
                </div>
            </div>
        `;
    }

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
            
            await loadAllData(); 
            populateModalStudentSelect();
            renderGroupDetails(); 
        }
    } catch (e) {
        console.error(e);
        showToast('خطا در حذف دانش‌آموز از گروه!', 'error');
    }
}

// ✅ پایان کامل فایل group.js