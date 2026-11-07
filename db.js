/**
 * فایل db.js — لایه ارتباط با IndexedDB
 */

const DB_NAME = 'KoshaDB';
const DB_VERSION = 7; // نسخه به 7 افزایش یافت برای رفع باگ کلید برنامه هفتگی

let db;

// آرایه آیتم‌های پیش‌فرض (۱۴ آیتم)
const defaultAssessmentItems = [
    { id: 1, title: "پرسش و پاسخ", type: "level", placeholder: "انتخاب سطح عملکرد:", levels: [{name: "خیلی خوب", score: 25}, {name: "خوب", score: 16}, {name: "قابل قبول", score: 9}, {name: "نیازمند تلاش", score: 0}] },
    { id: 2, title: "حفظ و قرائت", type: "level", placeholder: "انتخاب سطح عملکرد:", levels: [{name: "خیلی خوب", score: 25}, {name: "خوب", score: 16}, {name: "قابل قبول", score: 9}, {name: "نیازمند تلاش", score: 0}] },
    { id: 3, title: "پویش حفظ قرآن کریم", type: "quran" },
    { id: 4, title: "آزمون مداد و کاغذی", type: "level", placeholder: "انتخاب سطح عملکرد:", levels: [{name: "خیلی خوب", score: 100}, {name: "خوب", score: 66}, {name: "قابل قبول", score: 33}, {name: "نیازمند تلاش", score: 0}] },
    { id: 5, title: "کاربرگ", type: "count", unitScore: 10, placeholder: "تعداد برگه را وارد کنید:" },
    { id: 6, title: "آزمون الکترونیکی", type: "level", placeholder: "انتخاب سطح عملکرد:", levels: [{name: "خیلی خوب", score: 25}, {name: "خوب", score: 16}, {name: "قابل قبول", score: 9}, {name: "نیازمند تلاش", score: 0}] },
    { id: 7, title: "کاردستی و مهارت دست‌ورزی", type: "fixed", score: 25 },
    { id: 8, title: "نمایش و ایفای نقش", type: "fixed", score: 50 },
    { id: 9, title: "پروژه و آزمایش علمی", type: "fixed", score: 20 },
    { id: 10, title: "بازی آموزشی تعاملی", type: "fixed", score: 5 },
    { id: 11, title: "آزمون مهارت حرکتی", type: "level", placeholder: "انتخاب سطح عملکرد:", levels: [{name: "خیلی خوب", score: 100}, {name: "خوب", score: 66}, {name: "قابل قبول", score: 33}, {name: "نیازمند تلاش", score: 0}] },
    { id: 12, title: "مشاهده", type: "level", placeholder: "انتخاب سطح عملکرد:", levels: [{name: "خیلی خوب", score: 100}, {name: "خوب", score: 66}, {name: "قابل قبول", score: 33}, {name: "نیازمند تلاش", score: 0}] },
    { id: 13, title: "تشویق ویژه", type: "free", placeholder: "امتیاز تشویقی را وارد کنید:" },
    { id: 14, title: "تشویق خوش‌خط‌نویسی", type: "fixed", score: 4 }
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
            seedAssessmentItems(); 
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            console.log('در حال ساخت/به‌روزرسانی جداول پایگاه داده...');

            if (!db.objectStoreNames.contains('classProfile')) db.createObjectStore('classProfile', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('students')) {
                const studentStore = db.createObjectStore('students', { keyPath: 'id', autoIncrement: true });
                studentStore.createIndex('groupId', 'groupId', { unique: false });
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
                db.createObjectStore('assessmentItems', { keyPath: 'id' });
            }
            
            // اصلاح باگ: کلید برنامه هفتگی روی روز هفته تنظیم شد
            if (!db.objectStoreNames.contains('weeklySchedule')) {
                db.createObjectStore('weeklySchedule', { keyPath: 'day' });
            } else {
                // اگر از قبل وجود داشت، آن را حذف و بازسازی میکنیم تا کلید جدید اعمال شود
                // (این کار باعث پاک شدن برنامه‌های قبلی می‌شود که اشکالی ندارد چون باگ داشتند)
                db.deleteObjectStore('weeklySchedule');
                db.createObjectStore('weeklySchedule', { keyPath: 'day' });
            }
        };
    });
}

async function seedAssessmentItems() {
    try {
        const items = await getAllData('assessmentItems');
        if (items.length === 0) {
            for (const item of defaultAssessmentItems) {
                await saveData('assessmentItems', item);
            }
            console.log('آیتم‌های پیش‌فرض با موفقیت به دیتابیس اضافه شدند.');
        }
    } catch (e) { console.error('خطا در مقداردهی اولیه آیتم‌ها:', e); }
}

function saveData(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);
        request.onsuccess = () => resolve(request.result);
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
                if (completed === dataArray.length) resolve();
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
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

function clearStore(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

async function exportAllData() {
    const data = {};
    const stores = ['classProfile', 'students', 'groups', 'subjects', 'records', 'badgesSettings', 'sessions', 'attendance', 'assessmentItems', 'weeklySchedule'];
    for (const store of stores) {
        try { data[store] = await getAllData(store); } catch (e) { data[store] = []; }
    }
    return data;
}

async function importAllData(data) {
    if (!data || typeof data !== 'object') throw new Error('داده‌های نامعتبر');
    
    const stores = ['classProfile', 'students', 'groups', 'subjects', 'records', 'badgesSettings', 'sessions', 'attendance', 'assessmentItems', 'weeklySchedule'];
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