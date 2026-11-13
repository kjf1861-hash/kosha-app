/**
 * فایل db.js — لایه ارتباط با IndexedDB (نسخه چندساله)
 * نسخه ۱۷ — اصلاح مهاجرت داده‌ها و آیتم‌های پیش‌فرض
 */

const DB_NAME = 'KoshaDB';
const DB_VERSION = 17; // ✅ نسخه 17 برای اصلاح مهاجرت داده‌ها

let db;

const defaultAssessmentItems = [
    { title: "پرسش و پاسخ", type: "level", placeholder: "انتخاب سطح عملکرد:", levels: [{name: "خیلی خوب", score: 25}, {name: "خوب", score: 16}, {name: "قابل قبول", score: 9}, {name: "نیازمند تلاش", score: 0}] },
    { title: "حفظ و قرائت", type: "level", placeholder: "انتخاب سطح عملکرد:", levels: [{name: "خیلی خوب", score: 25}, {name: "خوب", score: 16}, {name: "قابل قبول", score: 9}, {name: "نیازمند تلاش", score: 0}] },
    { title: "آزمون مداد و کاغذی", type: "level", placeholder: "انتخاب سطح عملکرد:", levels: [{name: "خیلی خوب", score: 100}, {name: "خوب", score: 66}, {name: "قابل قبول", score: 33}, {name: "نیازمند تلاش", score: 0}] },
    { title: "کاربرگ", type: "count", unitScore: 10, placeholder: "تعداد برگه را وارد کنید:" },
    { title: "آزمون الکترونیکی", type: "level", placeholder: "انتخاب سطح عملکرد:", levels: [{name: "خیلی خوب", score: 25}, {name: "خوب", score: 16}, {name: "قابل قبول", score: 9}, {name: "نیازمند تلاش", score: 0}] },
    
    // ✅ اصلاح فنی: تغییر نوع از fixed به count برای هماهنگی با رابط کاربری
    { title: "کاردستی و مهارت دست‌ورزی", type: "count", unitScore: 25, placeholder: "تعداد کاردستی را وارد کنید:" },
    { title: "نمایش و ایفای نقش", type: "count", unitScore: 50, placeholder: "تعداد نمایش را وارد کنید:" },
    { title: "پروژه و آزمایش علمی", type: "count", unitScore: 20, placeholder: "تعداد پروژه را وارد کنید:" },
    { title: "بازی آموزشی تعاملی", type: "count", unitScore: 5, placeholder: "تعداد بازی را وارد کنید:" },
    
    { title: "آزمون مهارت حرکتی", type: "level", placeholder: "انتخاب سطح عملکرد:", levels: [{name: "خیلی خوب", score: 100}, {name: "خوب", score: 66}, {name: "قابل قبول", score: 33}, {name: "نیازمند تلاش", score: 0}] },
    { title: "مشاهده", type: "level", placeholder: "انتخاب سطح عملکرد:", levels: [{name: "خیلی خوب", score: 100}, {name: "خوب", score: 66}, {name: "قابل قبول", score: 33}, {name: "نیازمند تلاش", score: 0}] }
];

// ==========================================
// ✅ تابع کمکی: گرفتن تاریخ شمسی و ساعت برای نام فایل
// ==========================================
function getJalaliDateTimeForFilename() {
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false
        });
        const parts = formatter.formatToParts(now);
        const getPart = (type) => parts.find(p => p.type === type)?.value || '00';
        
        const toEn = (s) => s.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
        
        const year = toEn(getPart('year'));
        const month = toEn(getPart('month')).padStart(2, '0');
        const day = toEn(getPart('day')).padStart(2, '0');
        const hour = toEn(getPart('hour')).padStart(2, '0');
        const minute = toEn(getPart('minute')).padStart(2, '0');
        
        return `${year}-${month}-${day}-${hour}-${minute}`;
    } catch (e) {
        console.warn('خطا در تولید تاریخ شمسی نام فایل:', e);
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
    }
}

// ==========================================
// ✅ تابع کمکی: گرفتن تاریخ شمسی خوانا
// ==========================================
function getJalaliDateTimeForDisplay() {
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false
        });
        return formatter.format(now);
    } catch (e) {
        return new Date().toISOString();
    }
}

// ==========================================
// ✅ تابع کمکی: تولید نام فایل بکاپ
// ==========================================
function generateBackupFilename() {
    return `kosha-backup-${getJalaliDateTimeForFilename()}.json`;
}

window.generateBackupFilename = generateBackupFilename;
window.getJalaliDateTimeForFilename = getJalaliDateTimeForFilename;
window.getJalaliDateTimeForDisplay = getJalaliDateTimeForDisplay;

// ==========================================
// ✅ تابع: تضمین وجود آیتم‌های ارزشیابی برای یک سال
// ==========================================
async function ensureAssessmentItemsForYear(year) {
    try {
        let items = await getDataByYear('assessmentItems', year);
        if (items && items.length > 0) return items;

        const allItems = await getAllData('assessmentItems');
        let sourceItems = [];
        
        if (allItems.length > 0) {
            const years = [...new Set(allItems.map(i => i.academicYear).filter(y => y))];
            years.sort((a, b) => b.localeCompare(a));
            
            if (years.length > 0) {
                sourceItems = allItems.filter(i => i.academicYear === years[0]);
            }
        }

        if (sourceItems.length === 0) {
            sourceItems = defaultAssessmentItems;
        }

        const newItems = sourceItems.map((item, index) => ({
            ...item,
            id: `${year}_${Date.now()}_${index}`,
            academicYear: year
        }));

        await saveBulkData('assessmentItems', newItems);
        return newItems;
    } catch (e) {
        console.error('خطا در تضمین آیتم‌های ارزشیابی:', e);
        return [];
    }
}
window.ensureAssessmentItemsForYear = ensureAssessmentItemsForYear;

// ⏸️ پایان بخش ۱ — منتظر پیام «ادامه» شما هستم تا بخش ۲ را بفرستم.
// ==========================================
// مقداردهی اولیه دیتابیس (نسخه ۱۷)
// ==========================================
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('خطا در باز کردن پایگاه داده:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = async (event) => {
            db = event.target.result;
            console.log('پایگاه داده با موفقیت راه‌اندازی شد (نسخه چندساله v17).');
            
            // ✅ اجرای مهاجرت داده‌ها بعد از باز شدن موفق دیتابیس
            try {
                await migrateDataToV17();
            } catch (e) {
                console.error('خطا در مهاجرت داده‌ها:', e);
            }
            
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            const transaction = event.currentTarget.transaction;
            console.log('در حال ساخت/به‌روزرسانی جداول پایگاه داده...');

            // مهاجرت weeklySchedule (از قبل وجود داشت)
            if (db.objectStoreNames.contains('weeklySchedule') && event.oldVersion >= 1 && event.oldVersion < 15) {
                const oldStore = transaction.objectStore('weeklySchedule');
                const oldKeyPath = oldStore.keyPath;
                
                if (oldKeyPath === 'day') {
                    const getAllRequest = oldStore.getAll();
                    getAllRequest.onsuccess = () => {
                        const oldData = getAllRequest.result || [];
                        db.deleteObjectStore('weeklySchedule');
                        const newStore = db.createObjectStore('weeklySchedule', { keyPath: 'id' });
                        newStore.createIndex('day', 'day', { unique: false });
                        newStore.createIndex('academicYear', 'academicYear', { unique: false });
                        
                        const currentYear = window.activeAcademicYear || '1405-1406';
                        oldData.forEach(item => {
                            if (item && item.day) {
                                newStore.put({
                                    id: `${item.academicYear || currentYear}_${item.day}`,
                                    day: item.day,
                                    periods: item.periods || [],
                                    academicYear: item.academicYear || currentYear
                                });
                            }
                        });
                    };
                }
            }

            // مهاجرت assessmentItems (از قبل وجود داشت)
            if (db.objectStoreNames.contains('assessmentItems') && event.oldVersion >= 1 && event.oldVersion < 16) {
                const oldStore = transaction.objectStore('assessmentItems');
                const getAllRequest = oldStore.getAll();
                getAllRequest.onsuccess = () => {
                    const oldData = getAllRequest.result || [];
                    db.deleteObjectStore('assessmentItems');
                    const newStore = db.createObjectStore('assessmentItems', { keyPath: 'id' });
                    newStore.createIndex('academicYear', 'academicYear', { unique: false });
                    
                    const currentYear = window.activeAcademicYear || '1405-1406';
                    oldData.forEach((item, index) => {
                        const newId = item.academicYear ? item.id : `${currentYear}_migrated_${item.id || Date.now()}_${index}`;
                        newStore.put({ ...item, id: newId, academicYear: item.academicYear || currentYear });
                    });
                };
            }
            
            // ساخت یا به‌روزرسانی سایر جداول
            if (!db.objectStoreNames.contains('classProfile')) {
                db.createObjectStore('classProfile', { keyPath: 'id' });
            }
            
            if (!db.objectStoreNames.contains('students')) {
                const studentStore = db.createObjectStore('students', { keyPath: 'id', autoIncrement: true });
                studentStore.createIndex('groupId', 'groupId', { unique: false });
                studentStore.createIndex('nationalId', 'nationalId', { unique: false });
                studentStore.createIndex('academicYear', 'academicYear', { unique: false });
            } else {
                const studentStore = transaction.objectStore('students');
                if (studentStore.indexNames.contains('nationalId')) studentStore.deleteIndex('nationalId');
                studentStore.createIndex('nationalId', 'nationalId', { unique: false });
                if (!studentStore.indexNames.contains('academicYear')) studentStore.createIndex('academicYear', 'academicYear', { unique: false });
            }

            if (!db.objectStoreNames.contains('groups')) {
                const groupStore = db.createObjectStore('groups', { keyPath: 'id', autoIncrement: true });
                groupStore.createIndex('academicYear', 'academicYear', { unique: false });
            } else {
                const groupStore = transaction.objectStore('groups');
                if (!groupStore.indexNames.contains('academicYear')) groupStore.createIndex('academicYear', 'academicYear', { unique: false });
            }

            if (!db.objectStoreNames.contains('subjects')) {
                const subjectStore = db.createObjectStore('subjects', { keyPath: 'id', autoIncrement: true });
                subjectStore.createIndex('academicYear', 'academicYear', { unique: false });
            } else {
                const subjectStore = transaction.objectStore('subjects');
                if (!subjectStore.indexNames.contains('academicYear')) subjectStore.createIndex('academicYear', 'academicYear', { unique: false });
            }

            if (!db.objectStoreNames.contains('records')) {
                const recordStore = db.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
                recordStore.createIndex('subjectId', 'subjectId', { unique: false });
                recordStore.createIndex('date', 'date', { unique: false });
                recordStore.createIndex('academicYear', 'academicYear', { unique: false });
            } else {
                const recordStore = transaction.objectStore('records');
                if (!recordStore.indexNames.contains('academicYear')) recordStore.createIndex('academicYear', 'academicYear', { unique: false });
            }

            if (!db.objectStoreNames.contains('badgesSettings')) {
                const badgeStore = db.createObjectStore('badgesSettings', { keyPath: 'id' });
                badgeStore.createIndex('academicYear', 'academicYear', { unique: false });
            } else {
                const badgeStore = transaction.objectStore('badgesSettings');
                if (!badgeStore.indexNames.contains('academicYear')) badgeStore.createIndex('academicYear', 'academicYear', { unique: false });
            }

            if (!db.objectStoreNames.contains('sessions')) {
                const sessionStore = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
                sessionStore.createIndex('date', 'date', { unique: false });
                sessionStore.createIndex('academicYear', 'academicYear', { unique: false });
            } else {
                const sessionStore = transaction.objectStore('sessions');
                if (!sessionStore.indexNames.contains('academicYear')) sessionStore.createIndex('academicYear', 'academicYear', { unique: false });
            }

            if (!db.objectStoreNames.contains('attendance')) {
                const attStore = db.createObjectStore('attendance', { keyPath: 'id', autoIncrement: true });
                attStore.createIndex('sessionId', 'sessionId', { unique: false });
                attStore.createIndex('studentId', 'studentId', { unique: false });
                attStore.createIndex('academicYear', 'academicYear', { unique: false });
            } else {
                const attStore = transaction.objectStore('attendance');
                if (!attStore.indexNames.contains('academicYear')) attStore.createIndex('academicYear', 'academicYear', { unique: false });
            }

            if (!db.objectStoreNames.contains('assessmentItems')) {
                const itemStore = db.createObjectStore('assessmentItems', { keyPath: 'id' });
                itemStore.createIndex('academicYear', 'academicYear', { unique: false });
            }
            
            if (!db.objectStoreNames.contains('weeklySchedule')) {
                const scheduleStore = db.createObjectStore('weeklySchedule', { keyPath: 'id' });
                scheduleStore.createIndex('day', 'day', { unique: false });
                scheduleStore.createIndex('academicYear', 'academicYear', { unique: false });
            }
            
            if (!db.objectStoreNames.contains('exams')) {
                const examStore = db.createObjectStore('exams', { keyPath: 'id' });
                examStore.createIndex('subjectId', 'subjectId', { unique: false });
                examStore.createIndex('date', 'date', { unique: false });
                examStore.createIndex('academicYear', 'academicYear', { unique: false });
            } else {
                const examStore = transaction.objectStore('exams');
                if (!examStore.indexNames.contains('academicYear')) examStore.createIndex('academicYear', 'academicYear', { unique: false });
            }

            if (!db.objectStoreNames.contains('examResults')) {
                const resultStore = db.createObjectStore('examResults', { keyPath: 'id' });
                resultStore.createIndex('examId', 'examId', { unique: false });
                resultStore.createIndex('studentNationalId', 'studentNationalId', { unique: false });
                resultStore.createIndex('academicYear', 'academicYear', { unique: false });
            } else {
                const resultStore = transaction.objectStore('examResults');
                if (!resultStore.indexNames.contains('academicYear')) resultStore.createIndex('academicYear', 'academicYear', { unique: false });
            }
            
            if (!db.objectStoreNames.contains('backupSettings')) {
                const backupStore = db.createObjectStore('backupSettings', { keyPath: 'id' });
                backupStore.createIndex('academicYear', 'academicYear', { unique: false });
            } else {
                const backupStore = transaction.objectStore('backupSettings');
                if (!backupStore.indexNames.contains('academicYear')) backupStore.createIndex('academicYear', 'academicYear', { unique: false });
            }
        };
    });
}

// ==========================================
// ✅ تابع مهاجرت داده‌های قدیمی به نسخه ۱۷
// ==========================================
async function migrateDataToV17() {
    const currentYear = window.activeAcademicYear || '1405-1406';
    if (localStorage.getItem('kosha-db-migrated-v17')) return;

    console.log('🔄 در حال بررسی و مهاجرت داده‌های قدیمی به نسخه چندساله...');
    const storesToMigrate = ['students', 'groups', 'subjects', 'attendance', 'exams', 'examResults', 'badgesSettings', 'backupSettings'];
    let migratedCount = 0;

    for (const storeName of storesToMigrate) {
        try {
            const allData = await getAllData(storeName);
            const needsMigration = allData.filter(item => !item.academicYear);
            
            if (needsMigration.length > 0) {
                for (let item of needsMigration) {
                    item.academicYear = currentYear;
                    await saveData(storeName, item);
                    migratedCount++;
                }
            }
        } catch (e) {
            console.warn(`خطا در مهاجرت جدول ${storeName}:`, e);
        }
    }

    localStorage.setItem('kosha-db-migrated-v17', 'true');
    if (migratedCount > 0) {
        console.log(`✅ ${migratedCount} رکورد قدیمی به سال تحصیلی جاری منتقل شدند.`);
    }
}

// ==========================================
// ذخیره داده
// ==========================================
function saveData(storeName, data) {
    return new Promise((resolve, reject) => {
        if (storeName === 'classProfile' && data) {
            if (!data.academicYear) {
                data.academicYear = window.activeAcademicYear || '1405-1406';
            }
            data.id = data.academicYear;
        }
        
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);
        
        request.onsuccess = () => {
            resolve(request.result);
            if (typeof window.triggerAutoBackup === 'function') {
                window.triggerAutoBackup();
            }
        };
        
        request.onerror = (event) => reject(event.target.error);
    });
}

// ==========================================
// ذخیره دسته‌ای
// ==========================================
function saveBulkData(storeName, dataArray) {
    return new Promise((resolve, reject) => {
        if (!dataArray || dataArray.length === 0) {
            resolve();
            return;
        }
        
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        dataArray.forEach(data => {
            store.put(data);
        });
        
        transaction.oncomplete = () => {
            resolve();
            if (typeof window.triggerAutoBackup === 'function') {
                window.triggerAutoBackup();
            }
        };
        
        transaction.onerror = (event) => reject(event.target.error);
        transaction.onabort = (event) => reject(new Error('تراکنش لغو شد'));
    });
}

// ==========================================
// خواندن همه داده‌های یک store
// ==========================================
function getAllData(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// ==========================================
// خواندن داده‌های یک سال تحصیلی
// ==========================================
function getDataByYear(storeName, year) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        
        if (!store.indexNames.contains('academicYear')) {
            const request = store.getAll();
            request.onsuccess = () => {
                const allData = request.result;
                const filtered = allData.filter(item => item.academicYear === year);
                resolve(filtered);
            };
            request.onerror = (event) => reject(event.target.error);
            return;
        }
        
        const index = store.index('academicYear');
        const request = index.getAll(year);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// ==========================================
// خواندن داده با ID
// ==========================================
function getDataById(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// ==========================================
// دریافت مشخصات کلاس برای سال تحصیلی جاری
// ==========================================
async function getClassProfile(year) {
    try {
        let classData = await getDataById('classProfile', year);
        if (classData) return classData;
        
        const oldData = await getDataById('classProfile', 1);
        if (oldData) {
            oldData.id = year;
            oldData.academicYear = year;
            await saveData('classProfile', oldData);
            return oldData;
        }
        
        return null;
    } catch (e) {
        console.error('خطا در دریافت مشخصات کلاس:', e);
        return null;
    }
}

// ==========================================
// حذف داده
// ==========================================
function deleteData(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);
        
        request.onsuccess = () => {
            resolve();
            if (typeof window.triggerAutoBackup === 'function') {
                window.triggerAutoBackup();
            }
        };
        
        request.onerror = (event) => reject(event.target.error);
    });
}

// ==========================================
// پاک کردن کامل یک store
// ==========================================
function clearStore(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => {
            resolve();
            if (typeof window.triggerAutoBackup === 'function') {
                window.triggerAutoBackup();
            }
        };
        
        request.onerror = (event) => reject(event.target.error);
    });
}

// ⏸️ پایان بخش ۲ — منتظر پیام «ادامه» شما هستم تا بخش ۳ (آخرین بخش) را بفرستم.
// ==========================================
// خروجی کامل با _meta
// ==========================================
async function exportAllData() {
    const data = {};
    const stores = ['classProfile', 'students', 'groups', 'subjects', 'records', 'badgesSettings', 'sessions', 'attendance', 'assessmentItems', 'weeklySchedule', 'exams', 'examResults', 'backupSettings'];
    for (const store of stores) {
        try { data[store] = await getAllData(store); } catch (e) { data[store] = []; }
    }
    
    const uniqueYears = new Set();
    if (data.classProfile) data.classProfile.forEach(c => c.academicYear && uniqueYears.add(c.academicYear));
    if (data.students) data.students.forEach(s => s.academicYear && uniqueYears.add(s.academicYear));
    
    data._meta = {
        version: DB_VERSION,
        appVersion: 'v114',
        exportedAt: new Date().toISOString(),
        exportedAtJalali: getJalaliDateTimeForDisplay(),
        totalYears: uniqueYears.size,
        totalStudents: data.students ? data.students.length : 0,
        totalRecords: data.records ? data.records.length : 0
    };
    
    return data;
}

// ==========================================
// خروجی داده‌های یک سال
// ==========================================
async function exportYearData(year) {
    const data = {};
    const stores = ['classProfile', 'students', 'groups', 'subjects', 'records', 'badgesSettings', 'sessions', 'attendance', 'weeklySchedule', 'exams', 'examResults', 'backupSettings', 'assessmentItems'];
    for (const store of stores) {
        try { data[store] = await getDataByYear(store, year); } catch (e) { data[store] = []; }
    }
    return data;
}

// ==========================================
// بازیابی داده‌ها (با پشتیبانی کامل از بکاپ‌های قدیمی/جدید)
// ==========================================
async function importAllData(data) {
    if (!data || typeof data !== 'object') throw new Error('داده‌های نامعتبر');
    
    if (data._meta && data._meta.version) {
        if (data._meta.version > DB_VERSION) {
            throw new Error(`این بکاپ از نسخه جدیدتر برنامه (v${data._meta.version}) است. لطفاً برنامه را به‌روزرسانی کنید.`);
        }
        console.log(`📦 در حال بازیابی بکاپ نسخه ${data._meta.version} (${data._meta.exportedAtJalali || 'تاریخ نامشخص'})...`);
    } else {
        console.log('📦 در حال بازیابی بکاپ قدیمی (بدون _meta)...');
    }
    
    const stores = ['classProfile', 'students', 'groups', 'subjects', 'records', 'badgesSettings', 'sessions', 'attendance', 'assessmentItems', 'weeklySchedule', 'exams', 'examResults', 'backupSettings'];
    const backup = {};
    for (const store of stores) { backup[store] = await getAllData(store); }
    
    const currentYear = window.activeAcademicYear || '1405-1406';

    try {
        for (const store of stores) {
            if (data[store] && Array.isArray(data[store])) {
                await clearStore(store);
                if (data[store].length > 0) {
                    
                    // ✅ اصلاح باگ: بررسی و تزریق academicYear برای تمام جداول (سازگاری با بکاپ‌های قدیمی)
                    let storeData = data[store].map((item, index) => {
                        let newItem = { ...item };
                        
                        // اگر رکورد اصلاً academicYear ندارد، سال جاری را به آن می‌دهیم
                        if (!newItem.academicYear) {
                            newItem.academicYear = currentYear;
                        }

                        // تنظیمات مخصوص weeklySchedule
                        if (store === 'weeklySchedule') {
                            if (!newItem.id && newItem.day) {
                                newItem.id = `${newItem.academicYear}_${newItem.day}`;
                            }
                        }
                        
                        // تنظیمات مخصوص assessmentItems
                        if (store === 'assessmentItems') {
                            if (!newItem.id) {
                                newItem.id = `${newItem.academicYear}_migrated_${Date.now()}_${index}`;
                            }
                        }

                        // تنظیمات مخصوص classProfile (شناسه باید با سال تحصیلی یکی شود)
                        if (store === 'classProfile') {
                            newItem.id = newItem.academicYear;
                        }
                        
                        return newItem;
                    });
                    
                    await saveBulkData(store, storeData);
                }
            }
        }
        
        // پاک کردن پرچم مهاجرت تا برنامه یک بار دیگر چک کند (اطمینان از سلامت داده)
        localStorage.removeItem('kosha-db-migrated-v17');
        
    } catch (e) {
        // اگر خطایی رخ داد، داده‌های قبلی را برمی‌گردانیم
        for (const store of stores) {
            await clearStore(store);
            if (backup[store].length > 0) {
                await saveBulkData(store, backup[store]);
            }
        }
        throw new Error('خطا در بازیابی داده‌ها، تغییرات لغو شد.');
    }
}

// ==========================================
// دریافت تنظیمات بکاپ
// ==========================================
async function getBackupSettings(year) {
    try {
        const allSettings = await getAllData('backupSettings');
        let settings = allSettings.find(s => s.academicYear === year);
        
        if (!settings) {
            settings = {
                id: year,
                academicYear: year,
                reminderType: 'off',
                lastReminderDate: null,
                periods: []
            };
            await saveData('backupSettings', settings);
        }
        return settings;
    } catch (e) {
        console.error('خطا در دریافت تنظیمات پشتیبان‌گیری:', e);
        return {
            id: year,
            academicYear: year,
            reminderType: 'off',
            lastReminderDate: null,
            periods: []
        };
    }
}

// ✅ پایان فایل db.js