/**
 * فایل db.js — لایه ارتباط با IndexedDB
 */

const DB_NAME = 'KoshaDB';
const DB_VERSION = 3; // نسخه به 3 افزایش یافت برای اضافه شدن جدول حضور و غیاب

let db;

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

            // 1. جدول تنظیمات کلاس
            if (!db.objectStoreNames.contains('classProfile')) {
                db.createObjectStore('classProfile', { keyPath: 'id' });
            }

            // 2. جدول دانش‌آموزان
            if (!db.objectStoreNames.contains('students')) {
                const studentStore = db.createObjectStore('students', { keyPath: 'id', autoIncrement: true });
                studentStore.createIndex('groupId', 'groupId', { unique: false });
            }

            // 3. جدول گروه‌ها
            if (!db.objectStoreNames.contains('groups')) {
                db.createObjectStore('groups', { keyPath: 'id', autoIncrement: true });
            }

            // 4. جدول درس‌ها
            if (!db.objectStoreNames.contains('subjects')) {
                db.createObjectStore('subjects', { keyPath: 'id', autoIncrement: true });
            }

            // 5. جدول ثبت ارزشیابی‌ها
            if (!db.objectStoreNames.contains('records')) {
                const recordStore = db.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
                recordStore.createIndex('subjectId', 'subjectId', { unique: false });
                recordStore.createIndex('date', 'date', { unique: false });
            }

            // 6. جدول تنظیمات جایگاه‌ها و نشان‌ها
            if (!db.objectStoreNames.contains('badgesSettings')) {
                db.createObjectStore('badgesSettings', { keyPath: 'id' });
            }

            // 7. جدول جدید: حضور و غیاب
            if (!db.objectStoreNames.contains('attendance')) {
                const attStore = db.createObjectStore('attendance', { keyPath: 'id', autoIncrement: true });
                attStore.createIndex('date', 'date', { unique: false });
                attStore.createIndex('studentId', 'studentId', { unique: false });
            }
        };
    });
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
    const stores = ['classProfile', 'students', 'groups', 'subjects', 'records', 'badgesSettings', 'attendance'];
    for (const store of stores) {
        try { data[store] = await getAllData(store); } catch (e) { data[store] = []; }
    }
    return data;
}

async function importAllData(data) {
    const stores = ['classProfile', 'students', 'groups', 'subjects', 'records', 'badgesSettings', 'attendance'];
    for (const store of stores) {
        if (data[store]) {
            await clearStore(store);
            for (const item of data[store]) { await saveData(store, item); }
        }
    }
}