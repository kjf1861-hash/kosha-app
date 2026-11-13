/**
 * فایل db.js — لایه ارتباط با IndexedDB (نسخه چندساله)
 */

const DB_NAME = 'KoshaDB';
const DB_VERSION = 14; // ✅ ارتقا به 14 برای پشتیبانی از چند سال تحصیلی

let db;

const defaultAssessmentItems = [
    { id: 1, title: "پرسش و پاسخ", type: "level", placeholder: "انتخاب سطح عملکرد:", levels: [{name: "خیلی خوب", score: 25}, {name: "خوب", score: 16}, {name: "قابل قبول", score: 9}, {name: "نیازمند تلاش", score: 0}] },
    { id: 2, title: "حفظ و قرائت", type: "level", placeholder: "انتخاب سطح عملکرد:", levels: [{name: "خیلی خوب", score: 25}, {name: "خوب", score: 16}, {name: "قابل قبول", score: 9}, {name: "نیازمند تلاش", score: 0}] },
    { id: 4, title: "آزمون مداد و کاغذی", type: "level", placeholder: "انتخاب سطح عملکرد:", levels: [{name: "خیلی خوب", score: 100}, {name: "خوب", score: 66}, {name: "قابل قبول", score: 33}, {name: "نیازمند تلاش", score: 0}] },
    { id: 5, title: "کاربرگ", type: "count", unitScore: 10, placeholder: "تعداد برگه را وارد کنید:" },
    { id: 6, title: "آزمون الکترونیکی", type: "level", placeholder: "انتخاب سطح عملکرد:", levels: [{name: "خیلی خوب", score: 25}, {name: "خوب", score: 16}, {name: "قابل قبول", score: 9}, {name: "نیازمند تلاش", score: 0}] },
    { id: 7, title: "کاردستی و مهارت دست‌ورزی", type: "fixed", score: 25 },
    { id: 8, title: "نمایش و ایفای نقش", type: "fixed", score: 50 },
    { id: 9, title: "پروژه و آزمایش علمی", type: "fixed", score: 20 },
    { id: 10, title: "بازی آموزشی تعاملی", type: "fixed", score: 5 },
    { id: 11, title: "آزمون مهارت حرکتی", type: "level", placeholder: "انتخاب سطح عملکرد:", levels: [{name: "خیلی خوب", score: 100}, {name: "خوب", score: 66}, {name: "قابل قبول", score: 33}, {name: "نیازمند تلاش", score: 0}] },
    { id: 12, title: "مشاهده", type: "level", placeholder: "انتخاب سطح عملکرد:", levels: [{name: "خیلی خوب", score: 100}, {name: "خوب", score: 66}, {name: "قابل قبول", score: 33}, {name: "نیازمند تلاش", score: 0}] }
];

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('خطا در باز کردن پایگاه داده:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('پایگاه داده با موفقیت راه‌اندازی شد (نسخه چندساله).');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            console.log('در حال ساخت/به‌روزرسانی جداول پایگاه داده برای پشتیبانی از چند سال تحصیلی...');

            if (!db.objectStoreNames.contains('classProfile')) db.createObjectStore('classProfile', { keyPath: 'id' });
            
            if (!db.objectStoreNames.contains('students')) {
                const studentStore = db.createObjectStore('students', { keyPath: 'id', autoIncrement: true });
                studentStore.createIndex('groupId', 'groupId', { unique: false });
                studentStore.createIndex('nationalId', 'nationalId', { unique: false }); // ✅ یکتایی برداشته شد تا در سال‌های مختلف تکرار شود
                studentStore.createIndex('academicYear', 'academicYear', { unique: false }); // ✅ ایندکس جدید
            } else {
                const studentStore = event.currentTarget.transaction.objectStore('students');
                if (studentStore.indexNames.contains('nationalId')) {
                    studentStore.deleteIndex('nationalId');
                    studentStore.createIndex('nationalId', 'nationalId', { unique: false });
                }
                if (!studentStore.indexNames.contains('academicYear')) {
                    studentStore.createIndex('academicYear', 'academicYear', { unique: false });
                }
            }

            if (!db.objectStoreNames.contains('groups')) {
                const groupStore = db.createObjectStore('groups', { keyPath: 'id', autoIncrement: true });
                groupStore.createIndex('academicYear', 'academicYear', { unique: false });
            } else {
                const groupStore = event.currentTarget.transaction.objectStore('groups');
                if (!groupStore.indexNames.contains('academicYear')) {
                    groupStore.createIndex('academicYear', 'academicYear', { unique: false });
                }
            }

            if (!db.objectStoreNames.contains('subjects')) {
                const subjectStore = db.createObjectStore('subjects', { keyPath: 'id', autoIncrement: true });
                subjectStore.createIndex('academicYear', 'academicYear', { unique: false });
            } else {
                const subjectStore = event.currentTarget.transaction.objectStore('subjects');
                if (!subjectStore.indexNames.contains('academicYear')) {
                    subjectStore.createIndex('academicYear', 'academicYear', { unique: false });
                }
            }

            if (!db.objectStoreNames.contains('records')) {
                const recordStore = db.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
                recordStore.createIndex('subjectId', 'subjectId', { unique: false });
                recordStore.createIndex('date', 'date', { unique: false });
                recordStore.createIndex('academicYear', 'academicYear', { unique: false });
            } else {
                const recordStore = event.currentTarget.transaction.objectStore('records');
                if (!recordStore.indexNames.contains('academicYear')) {
                    recordStore.createIndex('academicYear', 'academicYear', { unique: false });
                }
            }

            if (!db.objectStoreNames.contains('badgesSettings')) {
                const badgeStore = db.createObjectStore('badgesSettings', { keyPath: 'id' });
                badgeStore.createIndex('academicYear', 'academicYear', { unique: false });
            } else {
                const badgeStore = event.currentTarget.transaction.objectStore('badgesSettings');
                if (!badgeStore.indexNames.contains('academicYear')) {
                    badgeStore.createIndex('academicYear', 'academicYear', { unique: false });
                }
            }

            if (!db.objectStoreNames.contains('sessions')) {
                const sessionStore = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
                sessionStore.createIndex('date', 'date', { unique: false });
                sessionStore.createIndex('academicYear', 'academicYear', { unique: false });
            } else {
                const sessionStore = event.currentTarget.transaction.objectStore('sessions');
                if (!sessionStore.indexNames.contains('academicYear')) {
                    sessionStore.createIndex('academicYear', 'academicYear', { unique: false });
                }
            }

            if (!db.objectStoreNames.contains('attendance')) {
                const attStore = db.createObjectStore('attendance', { keyPath: 'id', autoIncrement: true });
                attStore.createIndex('sessionId', 'sessionId', { unique: false });
                attStore.createIndex('studentId', 'studentId', { unique: false });
                attStore.createIndex('academicYear', 'academicYear', { unique: false });
            } else {
                const attStore = event.currentTarget.transaction.objectStore('attendance');
                if (!attStore.indexNames.contains('academicYear')) {
                    attStore.createIndex('academicYear', 'academicYear', { unique: false });
                }
            }

            if (!db.objectStoreNames.contains('assessmentItems')) {
                const itemStore = db.createObjectStore('assessmentItems', { keyPath: 'id' });
                for (const item of defaultAssessmentItems) {
                    itemStore.put(item);
                }
            }
            
            if (!db.objectStoreNames.contains('weeklySchedule')) {
                const scheduleStore = db.createObjectStore('weeklySchedule', { keyPath: 'day' });
                scheduleStore.createIndex('academicYear', 'academicYear', { unique: false });
            } else {
                const scheduleStore = event.currentTarget.transaction.objectStore('weeklySchedule');
                if (!scheduleStore.indexNames.contains('academicYear')) {
                    scheduleStore.createIndex('academicYear', 'academicYear', { unique: false });
                }
            }
            
            if (!db.objectStoreNames.contains('exams')) {
                const examStore = db.createObjectStore('exams', { keyPath: 'id' });
                examStore.createIndex('subjectId', 'subjectId', { unique: false });
                examStore.createIndex('date', 'date', { unique: false });
                examStore.createIndex('academicYear', 'academicYear', { unique: false });
            } else {
                const examStore = event.currentTarget.transaction.objectStore('exams');
                if (!examStore.indexNames.contains('academicYear')) {
                    examStore.createIndex('academicYear', 'academicYear', { unique: false });
                }
            }

            if (!db.objectStoreNames.contains('examResults')) {
                const resultStore = db.createObjectStore('examResults', { keyPath: 'id' });
                resultStore.createIndex('examId', 'examId', { unique: false });
                resultStore.createIndex('studentNationalId', 'studentNationalId', { unique: false });
                resultStore.createIndex('academicYear', 'academicYear', { unique: false });
            } else {
                const resultStore = event.currentTarget.transaction.objectStore('examResults');
                if (!resultStore.indexNames.contains('academicYear')) {
                    resultStore.createIndex('academicYear', 'academicYear', { unique: false });
                }
            }
            
            if (!db.objectStoreNames.contains('backupSettings')) {
                const backupStore = db.createObjectStore('backupSettings', { keyPath: 'id' });
                backupStore.createIndex('academicYear', 'academicYear', { unique: false });
            } else {
                const backupStore = event.currentTarget.transaction.objectStore('backupSettings');
                if (!backupStore.indexNames.contains('academicYear')) {
                    backupStore.createIndex('academicYear', 'academicYear', { unique: false });
                }
            }
        };
    });
}

function saveData(storeName, data) {
    return new Promise((resolve, reject) => {
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

function saveBulkData(storeName, dataArray) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        let completed = 0;
        if (dataArray.length === 0) { resolve(); return; }
        dataArray.forEach(data => {
            const request = store.put(data);
            request.onsuccess = () => {
                completed++;
                if (completed === dataArray.length) {
                    resolve();
                    if (typeof window.triggerAutoBackup === 'function') {
                        window.triggerAutoBackup();
                    }
                }
            };
            request.onerror = (event) => reject(event.target.error);
        });
    });
}

function getAllData(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// ✅ تابع جدید: دریافت داده‌های یک سال تحصیلی خاص
function getDataByYear(storeName, year) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        
        if (!store.indexNames.contains('academicYear')) {
            // اگر جدول ایندکس سال ندارد (مثل classProfile)، کل داده‌ها را برگردان
            const request = store.getAll();
            request.onsuccess = () => {
                const allData = request.result;
                // برای classProfile فقط رکوردی که سالش با year برابر است را برگردان
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

function getDataById(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

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

// ✅ خروجی کامل (برای پشتیبان‌گیری - شامل تمام سال‌ها)
async function exportAllData() {
    const data = {};
    const stores = ['classProfile', 'students', 'groups', 'subjects', 'records', 'badgesSettings', 'sessions', 'attendance', 'assessmentItems', 'weeklySchedule', 'exams', 'examResults', 'backupSettings'];
    for (const store of stores) {
        try { data[store] = await getAllData(store); } catch (e) { data[store] = []; }
    }
    return data;
}

// ✅ خروجی فقط برای یک سال خاص (برای ریست و مدیریت)
async function exportYearData(year) {
    const data = {};
    const stores = ['classProfile', 'students', 'groups', 'subjects', 'records', 'badgesSettings', 'sessions', 'attendance', 'weeklySchedule', 'exams', 'examResults', 'backupSettings'];
    for (const store of stores) {
        try { data[store] = await getDataByYear(store, year); } catch (e) { data[store] = []; }
    }
    return data;
}

async function importAllData(data) {
    if (!data || typeof data !== 'object') throw new Error('داده‌های نامعتبر');
    
    const stores = ['classProfile', 'students', 'groups', 'subjects', 'records', 'badgesSettings', 'sessions', 'attendance', 'assessmentItems', 'weeklySchedule', 'exams', 'examResults', 'backupSettings'];
    const backup = {};
    for (const store of stores) { backup[store] = await getAllData(store); }
    
    try {
        for (const store of stores) {
            if (data[store] && Array.isArray(data[store])) {
                await clearStore(store);
                if (data[store].length > 0) {
                    await saveBulkData(store, data[store]);
                }
            }
        }
    } catch (e) {
        for (const store of stores) {
            await clearStore(store);
            if (backup[store].length > 0) {
                await saveBulkData(store, backup[store]);
            }
        }
        throw new Error('خطا در بازیابی داده‌ها، تغییرات لغو شد.');
    }
}

// ✅ تابع جدید: دریافت تنظیمات پشتیبان‌گیری برای یک سال خاص
async function getBackupSettings(year) {
    try {
        const allSettings = await getAllData('backupSettings');
        let settings = allSettings.find(s => s.academicYear === year);
        
        if (!settings) {
            // اگر تنظیمات وجود نداشت، مقادیر پیش‌فرض را برای این سال ایجاد کن
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