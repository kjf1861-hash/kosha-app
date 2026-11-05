/**
 * فایل db.js — لایه ارتباط با IndexedDB
 * این فایل پایگاه داده اپلیکیشن «کوشا» را راه‌اندازی می‌کند
 * و توابع پایه برای ذخیره، خواندن و حذف داده‌ها را فراهم می‌آورد.
 */

const DB_NAME = 'KoshaDB';
const DB_VERSION = 1;

let db;

/**
 * راه‌اندازی اولیه پایگاه داده
 */
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
            console.log('در حال ساخت جداول پایگاه داده...');

            // 1. جدول تنظیمات کلاس (فقط یک رکورد با ID = 1)
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
                recordStore.createIndex('sourceRecordId', 'sourceRecordId', { unique: false });
            }

            // 6. جدول تنظیمات جایگاه‌ها و نشان‌ها
            if (!db.objectStoreNames.contains('badgesSettings')) {
                db.createObjectStore('badgesSettings', { keyPath: 'id' });
            }
        };
    });
}

/**
 * توابع عمومی برای کار با IndexedDB
 */

// ذخیره یک رکورد (افزودن یا به‌روزرسانی)
function saveData(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// خواندن تمام رکوردهای یک جدول
function getAllData(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// خواندن یک رکورد با شناسه
function getDataById(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// حذف یک رکورد با شناسه
function deleteData(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

// پاک کردن کل یک جدول (برای Import/Reset)
function clearStore(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * توابع پشتیبان‌گیری و بازیابی (Export / Import JSON)
 */
async function exportAllData() {
    const data = {};
    const stores = ['classProfile', 'students', 'groups', 'subjects', 'records', 'badgesSettings'];
    
    for (const store of stores) {
        try {
            data[store] = await getAllData(store);
        } catch (e) {
            data[store] = [];
        }
    }
    
    return data;
}

async function importAllData(data) {
    const stores = ['classProfile', 'students', 'groups', 'subjects', 'records', 'badgesSettings'];
    
    for (const store of stores) {
        if (data[store]) {
            await clearStore(store);
            for (const item of data[store]) {
                await saveData(store, item);
            }
        }
    }
}