/**
 * فایل db.js — لایه ارتباط با IndexedDB
 * نسخه سالم ۱۴ (اصلاح‌شده)
 *
 * تغییرات نسخه ۱۴:
 * - اصلاح importAllData: پاک کردن همه storeها قبل از import (رفع ناسازگاری)
 * - پشتیبانی از آبجکت تکی در فایل پشتیبان (نه فقط آرایه)
 * - حذف rollback ناقص و جایگزینی با منطق ساده‌تر و امن‌تر
 */

const DB_NAME = 'KoshaDB';
const DB_VERSION = 13; // نسخه DB تغییر نکرده — فقط منطق import اصلاح شد

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
            console.log('پایگاه داده با موفقیت راه‌اندازی شد.');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            console.log('در حال ساخت/به‌روزرسانی جداول پایگاه داده...');

            if (!db.objectStoreNames.contains('classProfile')) db.createObjectStore('classProfile', { keyPath: 'id' });
            
            if (!db.objectStoreNames.contains('students')) {
                const studentStore = db.createObjectStore('students', { keyPath: 'id', autoIncrement: true });
                studentStore.createIndex('groupId', 'groupId', { unique: false });
                studentStore.createIndex('nationalId', 'nationalId', { unique: true });
            } else {
                const studentStore = event.currentTarget.transaction.objectStore('students');
                if (!studentStore.indexNames.contains('nationalId')) {
                    studentStore.createIndex('nationalId', 'nationalId', { unique: true });
                }
            }

            if (!db.objectStoreNames.contains('groups')) db.createObjectStore('groups', { keyPath: 'id', autoIncrement: true });
            if (!db.objectStoreNames.contains('subjects')) db.createObjectStore('subjects', { keyPath: 'id', autoIncrement: true });
            if (!db.objectStoreNames.contains('records')) {
                const recordStore = db.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
                recordStore.createIndex('subjectId', 'subjectId', { unique: false });
                recordStore.createIndex('date', 'date', { unique: false });
            }
            if (!db.objectStoreNames.contains('badgesSettings')) db.createObjectStore('badgesSettings', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('sessions')) {
                const sessionStore = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
                sessionStore.createIndex('date', 'date', { unique: false });
            }
            if (!db.objectStoreNames.contains('attendance')) {
                const attStore = db.createObjectStore('attendance', { keyPath: 'id', autoIncrement: true });
                attStore.createIndex('sessionId', 'sessionId', { unique: false });
                attStore.createIndex('studentId', 'studentId', { unique: false });
            }
            if (!db.objectStoreNames.contains('assessmentItems')) {
                const itemStore = db.createObjectStore('assessmentItems', { keyPath: 'id' });
                for (const item of defaultAssessmentItems) itemStore.put(item);
            }
            if (!db.objectStoreNames.contains('weeklySchedule')) {
                db.createObjectStore('weeklySchedule', { keyPath: 'day' });
            }
            if (!db.objectStoreNames.contains('exams')) {
                const examStore = db.createObjectStore('exams', { keyPath: 'id' });
                examStore.createIndex('subjectId', 'subjectId', { unique: false });
                examStore.createIndex('date', 'date', { unique: false });
            }
            if (!db.objectStoreNames.contains('examResults')) {
                const resultStore = db.createObjectStore('examResults', { keyPath: 'id' });
                resultStore.createIndex('examId', 'examId', { unique: false });
                resultStore.createIndex('studentNationalId', 'studentNationalId', { unique: false });
            }
            if (!db.objectStoreNames.contains('backupSettings')) {
                db.createObjectStore('backupSettings', { keyPath: 'id' });
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
            if (typeof window.triggerAutoBackup === 'function') window.triggerAutoBackup();
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
                    if (typeof window.triggerAutoBackup === 'function') window.triggerAutoBackup();
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
            if (typeof window.triggerAutoBackup === 'function') window.triggerAutoBackup();
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
            if (typeof window.triggerAutoBackup === 'function') window.triggerAutoBackup();
        };
        request.onerror = (event) => reject(event.target.error);
    });
}

const ALL_STORES = ['classProfile', 'students', 'groups', 'subjects', 'records',
                    'badgesSettings', 'sessions', 'attendance', 'assessmentItems',
                    'weeklySchedule', 'exams', 'examResults', 'backupSettings'];

async function exportAllData() {
    const data = {};
    for (const store of ALL_STORES) {
        try { data[store] = await getAllData(store); } catch (e) { data[store] = []; }
    }
    return data;
}

// ==========================================
// ✅ importAllData — اصلاح‌شده
// - همه storeها ابتدا خالی می‌شوند (نه فقط آن‌هایی که در فایل هستند)
// - پشتیبانی از آبجکت تکی (در فایل‌های پشتیبان قدیمی که کلاس یک آبجکت بود)
// - بازگردانی خودکار در صورت خطای غیرمنتظره
// ==========================================
async function importAllData(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('داده‌های نامعتبر برای بازیابی');
    }

    // ۱. تهیه پشتیبان از وضعیت فعلی (برای rollback در صورت خطا)
    const backup = {};
    for (const store of ALL_STORES) {
        try { backup[store] = await getAllData(store); } catch (e) { backup[store] = []; }
    }

    // ۲. نرمال‌سازی داده‌های ورودی: هر store باید آرایه باشد
    const normalized = {};
    for (const store of ALL_STORES) {
        let arr = data[store];
        if (Array.isArray(arr)) {
            normalized[store] = arr;
        } else if (arr && typeof arr === 'object') {
            // آبجکت تکی (مثلاً classProfile در نسخه‌های قدیمی) → آرایه یک‌عضوی
            normalized[store] = [arr];
        } else {
            normalized[store] = []; // نبود در فایل → آرایه خالی (پاک می‌شود)
        }
    }

    // ۳. اعتبارسنجی اولیه (وجود id در رکوردهای دارای keyPath)
    const storesRequiringId = ['classProfile', 'badgesSettings', 'assessmentItems'];
    for (const store of storesRequiringId) {
        for (const rec of normalized[store]) {
            if (rec && typeof rec === 'object' && (rec.id === undefined || rec.id === null)) {
                throw new Error(`رکورد بدون id در جدول ${store} — فایل پشتیبان معتبر نیست.`);
            }
        }
    }

    // ۴. اجرای import
    try {
        for (const store of ALL_STORES) {
            await clearStore(store);
            if (normalized[store].length > 0) {
                await saveBulkData(store, normalized[store]);
            }
        }
    } catch (e) {
        // ۵. rollback
        console.error('خطا در import — در حال بازگردانی...', e);
        try {
            for (const store of ALL_STORES) {
                await clearStore(store);
                if (backup[store].length > 0) {
                    await saveBulkData(store, backup[store]);
                }
            }
        } catch (rollbackErr) {
            console.error('خطا در rollback:', rollbackErr);
        }
        throw new Error('خطا در بازیابی داده‌ها، تغییرات لغو شد.');
    }
}

async function getBackupSettings() {
    try {
        let settings = await getDataById('backupSettings', 1);
        if (!settings) {
            settings = { id: 1, reminderType: 'off', lastReminderDate: null, periods: [] };
            await saveData('backupSettings', settings);
        }
        return settings;
    } catch (e) { return { id: 1, reminderType: 'off', lastReminderDate: null, periods: [] }; }
}

async function getClassProfile() { return null; }
async function getAllDataByYear(storeName, academicYear) { return await getAllData(storeName); }