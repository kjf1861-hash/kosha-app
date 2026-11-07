// ==========================================
// فایل score.js — منطق تب امتیاز (ارزشیابی)
// ==========================================

let isSaveAndNext = false;
let currentStudentView = 'flat'; 

function initScoreEvents() {
    document.getElementById('recordItem').addEventListener('change', (e) => {
        if (e.target.value !== "") {
            // پیدا کردن آیتم بر اساس ID
            const item = window.allAssessmentItems.find(i => i.id == e.target.value);
            if(item) renderScoreInput(item);
        } else {
            document.getElementById('dynamic-score-section').style.display = 'none';
        }
    });

    document.getElementById('edit-record-form').addEventListener('submit', saveEditedRecord);
}

function renderScoreData() {
    // پر کردن منوی دروس
    const recordSubjectSelect = document.getElementById('recordSubject');
    const recordsFilterSubject = document.getElementById('recordsFilterSubject');
    const editRecordSubject = document.getElementById('editRecordSubject');
    
    const subjOptions = window.allSubjectsData.map(s => `<option value="${s.id}">${s.symbol || ''} ${s.name}</option>`).join('');
    
    if (recordSubjectSelect) recordSubjectSelect.innerHTML = '<option value="" disabled selected>درسی را انتخاب کنید!</option>' + subjOptions;
    if (editRecordSubject) editRecordSubject.innerHTML = '<option value="" disabled selected>انتخاب کنید...</option>' + subjOptions;
    if (recordsFilterSubject) recordsFilterSubject.innerHTML = '<option value="">همه دروس</option>' + subjOptions;

    // پر کردن منوی آیتم‌ها (value روی ID تنظیم شد)
    const itemSelect = document.getElementById('recordItem');
    const editRecordItemSelect = document.getElementById('editRecordItem');
    const itemOptions = window.allAssessmentItems.map(i => `<option value="${i.id}">${i.title}</option>`).join('');
    
    if (itemSelect) itemSelect.innerHTML = '<option value="" disabled selected>روش سنجشی را انتخاب کنید!</option>' + itemOptions;
    if (editRecordItemSelect) editRecordItemSelect.innerHTML = '<option value="" disabled selected>انتخاب کنید...</option>' + itemOptions;

    // پر کردن فیلتر دانش‌آموز
    const recordsFilterStudent = document.getElementById('recordsFilterStudent');
    if (recordsFilterStudent) {
        recordsFilterStudent.innerHTML = '<option value="">همه دانش‌آموزان</option>' + window.allStudentsData.map(st => `<option value="${st.id}">${st.firstName} ${st.lastName}</option>`).join('');
    }

    renderStudentCheckboxes();
    loadAssessmentRecords();
    loadQuranRewards();
}

// ==========================================
// 1. انتخاب دانش‌آموزان و رندر چک‌باکس‌ها
// ==========================================
function renderStudentCheckboxes() {
    const container = document.getElementById('students-checkbox-container');
    if (!container) return;
    
    if (window.allStudentsData.length === 0) { 
        container.innerHTML = '<p style="text-align:center; color:#64748b;">هیچ دانش‌آموزی ثبت نشده است.</p>'; 
        return; 
    }
    
    container.innerHTML = '';

    const createStudentLabel = (st) => {
        const g = window.allGroupsData.find(x => x.id === st.groupId);
        const badge = g ? `<span class="group-label">${g.symbol} ${g.name}</span>` : '';
        return `<label class="student-checkbox-item"><input type="checkbox" class="student-checkbox" value="${st.id}"><div class="student-checkbox-item-content"><span>${st.firstName} ${st.lastName}</span>${badge}</div></label>`;
    };

    if (currentStudentView === 'flat') {
        window.allStudentsData.forEach(st => { container.innerHTML += createStudentLabel(st); });
    } else {
        if (window.allGroupsData.length === 0) { container.innerHTML = '<p style="text-align:center; color:#dc2626;">هیچ گروهی ساخته نشده است.</p>'; return; }
        window.allGroupsData.forEach(g => {
            const groupStudents = window.allStudentsData.filter(st => st.groupId === g.id);
            let groupHtml = `<details class="group-accordion"><summary><div class="group-header-checkbox"><input type="checkbox" class="group-select-all-checkbox" onchange="toggleGroupSelection(this, ${g.id})"><span>${g.symbol} ${g.name} (${groupStudents.length} نفر)</span></div></summary><div class="group-students-container">`;
            if (groupStudents.length === 0) groupHtml += `<p style="color:#64748b; font-size:0.85rem; text-align:center;">خالی</p>`;
            else groupStudents.forEach(st => { 
                groupHtml += `<label class="student-checkbox-item"><input type="checkbox" class="student-checkbox group-student-${g.id}" value="${st.id}"><div class="student-checkbox-item-content"><span>${st.firstName} ${st.lastName}</span><span class="group-label">${g.symbol} ${g.name}</span></div></label>`; 
            });
            groupHtml += `</div></details>`;
            container.innerHTML += groupHtml;
        });
    }
}

function switchStudentView(view) {
    currentStudentView = view;
    document.getElementById('btnFlatView').classList.toggle('active', view === 'flat');
    document.getElementById('btnGroupView').classList.toggle('active', view === 'grouped');
    renderStudentCheckboxes();
}

function toggleGroupSelection(checkbox, groupId) {
    document.querySelectorAll(`.group-student-${groupId}`).forEach(cb => cb.checked = checkbox.checked);
}

function toggleAllStudents(checked) { 
    document.querySelectorAll('.student-checkbox').forEach(cb => cb.checked = checked); 
    document.querySelectorAll('.group-select-all-checkbox').forEach(cb => cb.checked = checked);
}

// ==========================================
// 2. منطق نمایش فرم امتیاز (پویا)
// ==========================================
function renderScoreInput(item) {
    const section = document.getElementById('dynamic-score-section');
    const container = document.getElementById('score-input-container');
    const label = document.getElementById('score-label');
    section.style.display = 'block';
    container.innerHTML = '';
    if (!item) { section.style.display = 'none'; return; }

    if (item.type === 'level') {
        label.textContent = item.placeholder || 'انتخاب سطح عملکرد:';
        const select = document.createElement('select');
        select.className = 'form-control'; select.id = 'dynamicLevelInput'; select.required = true;
        select.innerHTML = '<option value="" disabled selected>انتخاب سطح...</option>';
        item.levels.forEach(level => {
            select.innerHTML += `<option value="${level.score}">${level.name} (${level.score} امتیاز)</option>`;
        });
        container.appendChild(select);
    } else if (item.type === 'count') {
        label.textContent = item.placeholder || 'تعداد واحد را وارد کنید:';
        const input = document.createElement('input');
        input.type = 'number'; input.className = 'form-control'; input.id = 'dynamicCountInput'; input.min = '1'; input.placeholder = 'تعداد'; input.required = true;
        container.appendChild(input);
    } else if (item.type === 'fixed') {
        label.textContent = 'امتیاز اختصاص‌یافته:';
        container.innerHTML = `<p style="font-weight: bold; color: #4A90E2;">${item.score} امتیاز (خودکار)</p>`;
    } else if (item.type === 'free') {
        label.textContent = item.placeholder || 'امتیاز را وارد کنید:';
        const input = document.createElement('input');
        input.type = 'number'; input.className = 'form-control'; input.id = 'dynamicFreeInput'; input.min = '0'; input.placeholder = 'عدد امتیاز'; input.required = true;
        container.appendChild(input);
    } else if (item.type === 'quran') {
        label.textContent = 'جزئیات حفظ:';
        const select = document.createElement('select');
        select.className = 'form-control'; select.id = 'quranSurahSelect';
        select.innerHTML = '<option value="" disabled selected>انتخاب سوره...</option>';
        for (const [surah, ayat] of Object.entries(quranSurahs)) select.innerHTML += `<option value="${ayat}">${surah} (${ayat} آیه)</option>`;
        const input = document.createElement('input');
        input.type = 'number'; input.className = 'form-control'; input.id = 'quranAyatInput'; input.placeholder = 'تعداد آیات'; input.min = '1';
        container.appendChild(select);
        container.appendChild(document.createElement('br'));
        container.appendChild(input);
    }
}

// ==========================================
// 3. پیش‌نمایش و ثبت امتیاز
// ==========================================
function showPreview(isFinal) {
    isSaveAndNext = !isFinal;
    const selectedIndex = document.getElementById('recordItem').value;
    if (selectedIndex === "") { showToast('آیتم ارزشیابی را انتخاب کنید.', 'error'); return; }
    
    // پیدا کردن آیتم بر اساس ID
    const selectedItem = window.allAssessmentItems.find(i => i.id == selectedIndex);
    if (!selectedItem) { showToast('آیتم یافت نشد.', 'error'); return; }
    
    let finalScore = 0;
    try {
        if (selectedItem.type === 'level') {
            const l = document.getElementById('dynamicLevelInput');
            if (!l || !l.value) { showToast('سطح را انتخاب کنید.', 'error'); return; }
            finalScore = parseInt(l.value) || 0;
        } else if (selectedItem.type === 'count') { 
            finalScore = (parseInt(document.getElementById('dynamicCountInput').value) || 0) * selectedItem.unitScore; 
        } else if (selectedItem.type === 'fixed') { 
            finalScore = selectedItem.score; 
        } else if (selectedItem.type === 'free') { 
            finalScore = parseInt(document.getElementById('dynamicFreeInput').value) || 0; 
        } else if (selectedItem.type === 'quran') {
            const ayat = parseInt(document.getElementById('quranAyatInput').value) || 0;
            const total = parseInt(document.getElementById('quranSurahSelect').value) || 0;
            const threshold = Math.ceil((total / 2) + 1);
            finalScore = (ayat >= threshold && total > 0) ? ayat * 5 : 0;
        }
    } catch (e) { showToast('فیلدها را کامل کنید.', 'error'); return; }

    const studentCheckboxes = document.querySelectorAll('.student-checkbox:checked');
    if (studentCheckboxes.length === 0) { showToast('دانش‌آموز انتخاب کنید.', 'error'); return; }
    
    const daySelect = document.getElementById('dateDay'), monthSelect = document.getElementById('dateMonth'), yearSelect = document.getElementById('dateYear');
    const dateStr = document.getElementById('recordDate').value;
    
    if (!daySelect.value || !monthSelect.value || !yearSelect.value || !dateStr) {
        showToast('تاریخ را کامل انتخاب کنید.', 'error'); return;
    }

    document.getElementById('preview-content').innerHTML = `
        <div class="preview-row"><strong>آیتم:</strong> <span>${selectedItem.title}</span></div>
        <div class="preview-row"><strong>تعداد:</strong> <span>${studentCheckboxes.length} نفر</span></div>
        <div class="preview-row"><strong>تاریخ:</strong> <span>${dateStr}</span></div>
        <div class="preview-row" style="background: #eef2ff; padding: 10px; border-radius: 8px; margin-top: 10px;"><strong>امتیاز:</strong> <span style="font-size: 1.2rem; color: #4A90E2;">${finalScore}</span></div>
    `;
    
    window.tempRecordData = {
        subjectId: parseInt(document.getElementById('recordSubject').value),
        itemName: selectedItem.title, 
        title: document.getElementById('recordTitle').value, 
        date: dateStr,
        students: Array.from(studentCheckboxes).map(cb => parseInt(cb.value)),
        arf: document.getElementById('recordArf').checked, 
        finalScore: finalScore
    };
    document.getElementById('preview-modal').classList.add('show');
}

function closePreviewModal() { document.getElementById('preview-modal').classList.remove('show'); }

async function confirmAndSaveRecord() {
    if (!window.tempRecordData) return;
    try {
        await saveData('records', window.tempRecordData);
        
        // منطق تشویق پویش قرآن
        if (window.tempRecordData.itemName === "پویش حفظ قرآن کریم" && window.tempRecordData.finalScore > 0) {
            for (const studentId of window.tempRecordData.students) {
                const allRecords = await getAllData('records'); 
                let totalSurahs = 0, totalAyats = 0;
                allRecords.forEach(rec => {
                    if (rec.itemName === "پویش حفظ قرآن کریم" && rec.students.includes(studentId)) {
                        totalSurahs += 1;
                        const match = rec.title.match(/\d+/); if (match) totalAyats += parseInt(match[0]);
                    }
                });
                await saveData('badgesSettings', { id: `quranReward_${studentId}_${Date.now()}`, studentId: studentId, title: "تشویق شرکت در پویش حفظ جزء سی قرآن", totalSurahs: totalSurahs, totalAyats: totalAyats, date: window.tempRecordData.date });
            }
        }
        
        showToast('امتیاز با موفقیت ثبت شد!', 'success');
        closePreviewModal();
        
        if (isSaveAndNext) {
            toggleAllStudents(false);
            const scoreInput = document.getElementById('dynamicLevelInput') || document.getElementById('dynamicCountInput') || document.getElementById('dynamicFreeInput');
            if (scoreInput) scoreInput.value = '';
            if (document.getElementById('quranSurahSelect')) document.getElementById('quranSurahSelect').value = '';
            if (document.getElementById('quranAyatInput')) document.getElementById('quranAyatInput').value = '';
            document.getElementById('record-form').scrollIntoView({ behavior: 'smooth' });
        } else {
            document.getElementById('record-form').reset(); 
            if(typeof initDateDropdowns === 'function') initDateDropdowns();
            document.getElementById('dynamic-score-section').style.display = 'none'; 
            loadAllData();
        }
    } catch (error) { showToast('خطا در ذخیره!', 'error'); closePreviewModal(); }
}

// ==========================================
// 4. سوابق ارزشیابی (لیست، فیلتر، صفحه‌بندی و ویرایش)
// ==========================================
function loadAssessmentRecords() {
    const container = document.getElementById('assessment-records-list');
    const pagination = document.getElementById('records-pagination');
    if (!container) return;
    
    container.innerHTML = '<p style="text-align:center;">در حال بارگذاری...</p>';
    
    const filterSubject = document.getElementById('recordsFilterSubject').value;
    const filterStudent = document.getElementById('recordsFilterStudent').value;
    const searchText = document.getElementById('recordsSearchText').value.trim();

    let filteredRecords = window.allRecordsData.filter(rec => {
        if (filterSubject && rec.subjectId != filterSubject) return false;
        if (filterStudent && (!rec.students || !rec.students.includes(parseInt(filterStudent)))) return false;
        if (searchText && !rec.title.includes(searchText)) return false;
        return true;
    });

    filteredRecords.sort((a, b) => b.date.localeCompare(a.date));
    const countEl = document.getElementById('records-count');
    if (countEl) countEl.textContent = `تعداد نتایج: ${filteredRecords.length} رکورد`;

    if (filteredRecords.length === 0) { 
        container.innerHTML = '<p style="text-align:center; color:#64748b;">هیچ رکوردی یافت نشد.</p>'; 
        if(pagination) pagination.style.display = 'none';
        return; 
    }

    const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
    if (currentPage.records > totalPages) currentPage.records = totalPages;
    if (currentPage.records < 1) currentPage.records = 1;
    const startIndex = (currentPage.records - 1) * itemsPerPage;
    const paginatedRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage);

    container.innerHTML = '';
    paginatedRecords.forEach(rec => {
        const subject = window.allSubjectsData.find(s => s.id === rec.subjectId);
        const subjectName = subject ? `${subject.symbol || ''} ${subject.name}` : 'نامشخص';
        let studentNames = '';
        if (rec.students && rec.students.length > 0) {
            const names = rec.students.map(id => {
                const st = window.allStudentsData.find(s => s.id === id);
                return st ? `${st.firstName} ${st.lastName}` : '';
            }).filter(n => n !== '');
            studentNames = names.join('، ');
        }
        container.innerHTML += `
            <div class="record-item ${rec.arf ? 'arf-list-item' : ''}">
                <div class="record-header">
                    <span class="record-title">${rec.title} ${rec.arf ? '🎁' : ''}</span>
                    <span class="record-score">${rec.finalScore} امتیاز</span>
                </div>
                <div class="record-details"><span>📚 ${subjectName} | ${rec.itemName}</span><span>📅 ${rec.date}</span></div>
                <div class="record-details" style="font-size: 0.8rem; margin-top: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">👥 ${studentNames}</div>
                <div class="record-actions">
                    <button class="btn btn-secondary btn-sm" onclick="openEditRecordModal(${rec.id})">✏️ ویرایش</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteRecord(${rec.id})">🗑️ حذف</button>
                </div>
            </div>`;
    });

    if (pagination) {
        if (totalPages > 1) {
            pagination.style.display = 'flex';
            document.getElementById('recordsPageInfo').textContent = `صفحه ${currentPage.records} از ${totalPages}`;
            document.getElementById('btnPrevRecords').disabled = (currentPage.records === 1);
            document.getElementById('btnNextRecords').disabled = (currentPage.records === totalPages);
        } else { pagination.style.display = 'none'; }
    }
}

function clearRecordFilters() {
    document.getElementById('recordsFilterSubject').value = '';
    document.getElementById('recordsFilterStudent').value = '';
    document.getElementById('recordsSearchText').value = '';
    currentPage.records = 1;
    loadAssessmentRecords();
}

async function deleteRecord(id) {
    if (!confirm('آیا از حذف این رکورد مطمئن هستید؟')) return;
    try { await deleteData('records', id); showToast('رکورد حذف شد.', 'success'); loadAllData(); }
    catch (e) { console.error(e); showToast('خطا در حذف رکورد.', 'error'); }
}

async function openEditRecordModal(id) {
    try {
        const record = await getDataById('records', id);
        if (!record) return;
        
        document.getElementById('editRecordId').value = record.id;
        document.getElementById('editRecordTitle').value = record.title;
        document.getElementById('editRecordDate').value = record.date;
        document.getElementById('editRecordScore').value = record.finalScore;
        document.getElementById('editRecordSubject').value = record.subjectId;
        // منوی آیتم‌های ویرایش هم بر اساس ID
        const itemInList = window.allAssessmentItems.find(i => i.title === record.itemName);
        document.getElementById('editRecordItem').value = itemInList ? itemInList.id : ''; 
        
        const container = document.getElementById('edit-record-students-container');
        container.innerHTML = '';
        
        window.allStudentsData.forEach(st => {
            const g = window.allGroupsData.find(x => x.id === st.groupId);
            const badge = g ? `<span class="group-label">${g.symbol} ${g.name}</span>` : '';
            const isChecked = record.students.includes(st.id) ? 'checked' : '';
            container.innerHTML += `
                <label class="student-checkbox-item">
                    <input type="checkbox" class="edit-student-checkbox" value="${st.id}" ${isChecked}>
                    <div class="student-checkbox-item-content"><span>${st.firstName} ${st.lastName}</span>${badge}</div>
                </label>
            `;
        });

        document.getElementById('edit-record-modal').classList.add('show');
    } catch (e) { console.error(e); showToast('خطا در باز کردن فرم ویرایش.', 'error'); }
}

function closeEditModal() { document.getElementById('edit-record-modal').classList.remove('show'); }

async function saveEditedRecord(event) {
    if(event) event.preventDefault();
    const id = parseInt(document.getElementById('editRecordId').value);
    const subjectId = parseInt(document.getElementById('editRecordSubject').value);
    const itemId = document.getElementById('editRecordItem').value;
    const newTitle = document.getElementById('editRecordTitle').value;
    const newDate = document.getElementById('editRecordDate').value;
    const newScore = parseInt(document.getElementById('editRecordScore').value);
    
    const studentCheckboxes = document.querySelectorAll('.edit-student-checkbox:checked');
    const students = Array.from(studentCheckboxes).map(cb => parseInt(cb.value));

    // پیدا کردن عنوان آیتم از روی ID
    const selectedItem = window.allAssessmentItems.find(i => i.id == itemId);
    const itemName = selectedItem ? selectedItem.title : '';

    if (!newTitle || !newDate || isNaN(newScore) || !subjectId || !itemName) { 
        showToast('لطفاً تمام فیلدهای الزامی را پر کنید.', 'error'); return; 
    }
    if (students.length === 0) {
        showToast('حداقل یک دانش‌آموز را انتخاب کنید.', 'error'); return;
    }

    try {
        const record = await getDataById('records', id);
        if (!record) return;
        
        record.subjectId = subjectId;
        record.itemName = itemName;
        record.title = newTitle; 
        record.date = newDate; 
        record.finalScore = newScore;
        record.students = students;
        
        await saveData('records', record);
        showToast('رکورد با موفقیت ویرایش شد.', 'success');
        closeEditModal(); loadAllData();
    } catch (e) { console.error(e); showToast('خطا در ذخیره.', 'error'); }
}

// ==========================================
// 5. تشویق‌های پویش قرآن
// ==========================================
async function loadQuranRewards() {
    const container = document.getElementById('quran-rewards-list');
    if (!container) return;
    try {
        const allBadges = await getAllData('badgesSettings');
        const quranRewards = allBadges.filter(b => b.id && b.id.startsWith('quranReward_'));
        
        if (quranRewards.length === 0) { container.innerHTML = '<p style="color:#64748b; text-align:center;">هنوز تشویقی صادر نشده است.</p>'; return; }
        
        const grouped = {};
        quranRewards.forEach(reward => { 
            if (!grouped[reward.studentId]) grouped[reward.studentId] = []; 
            grouped[reward.studentId].push(reward); 
        });
        
        let html = '';
        for (const studentId in grouped) {
            const student = window.allStudentsData.find(s => s.id == studentId);
            const studentName = student ? `${student.firstName} ${student.lastName}` : `دانش‌آموز ${studentId}`;
            const latest = grouped[studentId][grouped[studentId].length - 1];
            html += `<div class="list-item" style="flex-direction: column; align-items: flex-start; padding: 15px; background: var(--arf-bg); border-right: 4px solid var(--arf-border); margin-bottom: 10px;"><strong style="font-size: 1.1rem;">🏅 ${studentName}</strong><span style="font-size: 0.9rem; color: var(--arf-border);">تعداد سوره‌ها: ${latest.totalSurahs} | تعداد آیات: ${latest.totalAyats}</span></div>`;
        }
        container.innerHTML = html;
    } catch (e) { container.innerHTML = '<p style="color:red;">خطا</p>'; }
}

// ==========================================
// 6. خروجی اکسل سوابق
// ==========================================
async function exportScoreCSV() {
    try {
        let csvContent = "ردیف,عنوان,درس,آیتم,تاریخ,امتیاز,ارفاق\n";
        const sorted = [...window.allRecordsData].sort((a, b) => b.date.localeCompare(a.date));
        
        sorted.forEach((rec, i) => {
            const s = window.allSubjectsData.find(x => x.id === rec.subjectId); 
            const sn = s ? s.name : 'نامشخص';
            csvContent += `${i + 1},"${rec.title}","${sn}","${rec.itemName}","${rec.date}",${rec.finalScore},"${rec.arf ? 'دارد' : 'ندارد'}"\n`;
        });

        const BOM = "\uFEFF";
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `kosha_records_${new Date().toISOString().slice(0,10)}.csv`; a.click();
        URL.revokeObjectURL(url);
        showToast('فایل اکسل سوابق دانلود شد!', 'success');
    } catch (e) { console.error(e); showToast('خطا در تولید فایل اکسل.', 'error'); }
}