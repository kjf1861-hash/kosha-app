/**
 * فایل db.js — لایه ارتباط با IndexedDB
 * نسخه ۱۴ — بازطراحی کامل برای پرونده‌های مستقل سال تحصیلی
 */

const DB_NAME = 'KoshaDB';
const DB_VERSION = 14; 

// لیست سال‌های تحصیلی مجاز در اپلیکیشن (طبق نظر کاربر)
const ALLOWED_ACADEMIC_YEARS = [
    '1405-1406',
    '1406-1407',
    '1407-1408',
    '1408-1409',
    '1409-1410'
];

let db;

// آیتم‌های ارزشیابی پیش‌فرض (برای هر سال تحصیلی جداگانه ساخته می‌شوند)
const defaultAssessmentItems = [
    { title: "پرسش و پاسخ", type: "level", placeholder: "انتخاب سطح عملکرد:", levels: [{name: "خیلی خوب", score: 25}, {name: "خوب", score: 16}, {name: "قابل قبول", score: 9}, {name: "نیازمند تلاش", score: 0}] },
    { title: "حفظ و قرائت", type: "level", placeholder: "انتخاب سطح عملکرد:", levels: [{name: "خیلی خوب", score: 25}, {name: "خوب", score: 16}, {name: "قابل قبول", score: 9}, {name: "نیازمند تلاش", score: 0}] },
    { title: "آزمون مداد و کاغذی", type: "level", placeholder: "انتخاب سطح عملکرد:", levels: [{name: "خیلی خوب", score: 100}, {name: "خوب", score: 66}, {name: "قابل قبول", score: 33}, {name: "نیازمند تلاش", score: 0}] },
    { title: "کاربرگ", type: "count", unitScore: 10, placeholder: "تعداد برگه را وارد کنید:" },
    { title: "آزمون الکترونیکی", type: "level", placeholder: "انتخاب سطح عملکرد:", levels: [{name: "خیلی خوب", score: 25}, {name: "خوب", score: 16}, {name: "قابل قبول", score: 9}, {name: "نیازمند تلاش", score: 0}] },
    { title: "کاردستی و مهارت دست‌ورزی", type: "fixed", score: 25 },
    { title: "نمایش و ایفای نقش", type: "fixed", score: 50 },
    { title: "پروژه و آزمایش علمی", type: "fixed", score: 20 },
    { title: "بازی آموزشی تعاملی", type: "fixed", score: 5 },
    { title: "آزمون مهارت حرکتی", type: "level", placeholder: "انتخاب سطح عملکرد:", levels: [{name: "خیلی خوب", score: 100}, {name: "خوب", score: 66}, {name: "قابل قبول", score: 33}, {name: "نیازمند تلاش", score: 0}] },
    { title: "مشاهده", type: "level", placeholder: "انتخاب سطح عملکرد:", levels: [{name: "خیلی خوب", score: 100}, {name: "خوب", score: 66}, {name: "قابل قبول", score: 33}, {name: "نیازمند تلاش", score: 0}] }
];

function initDB() {
    return new Promise((resolve, reject) => {
        // *** تغییر بحرانی: قبل از باز کردن دیتابیس، بررسی می‌کنیم آیا نسخه قدیمی است یا خیر ***
        // اگر نسخه قدیمی باشد (۱۲ یا ۱۳)، با ارتقا به ۱۴، دیتابیس را کاملاً از نو می‌سازیم.
        
        const checkRequest = indexedDB.open(DB_NAME);
        checkRequest.onsuccess = (event) => {
            const existingDB = event.target.result;
            const existingVersion = existingDB.version;
            existingDB.close();
            
            // اگر نسخه قبلی کمتر از ۱۴ بود، دیتابیس قدیمی را حذف کن
            if (existingVersion > 0 && existingVersion < DB_VERSION) {
                console.log('🗑️ حذف دیتابیس قدیمی (نسخه ' + existingVersion + ') برای شروع تمیز...');
                const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
                deleteRequest.onsuccess = () => {
                    console.log('✅ دیتابیس قدیمی حذف شد. در حال ساخت دیتابیس جدید...');
                    openNewDB(resolve, reject);
                };
                deleteRequest.onerror = (err) => {
                    console.error('خطا در حذف دیتابیس قدیمی:', err);
                    reject(err);
                };
                return;
            }
            
            // اگر نسخه فعلی همان ۱۴ است یا اصلاً دیتابیسی وجود ندارد، مستقیم باز کن
            openNewDB(resolve, reject);
        };
        
        checkRequest.onerror = (err) => {
            // اگر دیتابیسی وجود ندارد، آن را بساز
            openNewDB(resolve, reject);
        };
        
        checkRequest.onblocked = () => {
            console.warn('⚠️ دیتابیس توسط تب دیگری باز است. لطفاً تمام تب‌های دیگر اپلیکیشن را ببندید.');
        };
    });
}

// تابع کمکی برای باز کردن دیتابیس جدید
function openNewDB(resolve, reject) {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
        console.error('خطا در باز کردن پایگاه داده:', event.target.error);
        reject(event.target.error);
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        console.log('✅ پایگاه داده نسخه ' + DB_VERSION + ' با موفقیت راه‌اندازی شد.');
        resolve(db);
    };

    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('در حال ساخت جداول پایگاه داده جدید...');

        // *** ساخت جداول جدید ***
        
        // ۱. مشخصات کلاس: به ازای هر سال تحصیلی یک رکورد با id = '1405-1406' و غیره
        if (!db.objectStoreNames.contains('classProfile')) {
            db.createObjectStore('classProfile', { keyPath: 'id' });
        }
        
        // ۲. دانش‌آموزان: با ایندکس روی academicYear برای فیلتر سریع
        if (!db.objectStoreNames.contains('students')) {
            const studentStore = db.createObjectStore('students', { keyPath: 'id', autoIncrement: true });
            studentStore.createIndex('groupId', 'groupId', { unique: false });
            studentStore.createIndex('nationalId', 'nationalId', { unique: false }); // یکتایی رو در کد چک می‌کنیم
            studentStore.createIndex('academicYear', 'academicYear', { unique: false });
        }

        // ۳. گروه‌ها: با ایندکس روی academicYear
        if (!db.objectStoreNames.contains('groups')) {
            const groupStore = db.createObjectStore('groups', { keyPath: 'id', autoIncrement: true });
            groupStore.createIndex('academicYear', 'academicYear', { unique: false });
        }
        
        // ۴. دروس: با ایندکس روی academicYear
        if (!db.objectStoreNames.contains('subjects')) {
            const subjectStore = db.createObjectStore('subjects', { keyPath: 'id', autoIncrement: true });
            subjectStore.createIndex('academicYear', 'academicYear', { unique: false });
        }
        
        // ۵. رکوردهای ارزشیابی
        if (!db.objectStoreNames.contains('records')) {
            const recordStore = db.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
            recordStore.createIndex('subjectId', 'subjectId', { unique: false });
            recordStore.createIndex('date', 'date', { unique: false });
            recordStore.createIndex('academicYear', 'academicYear', { unique: false });
        }
        
        // ۶. تشویق‌ها
        if (!db.objectStoreNames.contains('badgesSettings')) {
            const badgeStore = db.createObjectStore('badgesSettings', { keyPath: 'id' });
            badgeStore.createIndex('academicYear', 'academicYear', { unique: false });
        }
        
        // ۷. جلسات
        if (!db.objectStoreNames.contains('sessions')) {
            const sessionStore = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
            sessionStore.createIndex('date', 'date', { unique: false });
            sessionStore.createIndex('academicYear', 'academicYear', { unique: false });
        }
        
        // ۸. حضور و غیاب
        if (!db.objectStoreNames.contains('attendance')) {
            const attStore = db.createObjectStore('attendance', { keyPath: 'id', autoIncrement: true });
            attStore.createIndex('sessionId', 'sessionId', { unique: false });
            attStore.createIndex('studentId', 'studentId', { unique: false });
        }
        
        // ۹. آیتم‌های ارزشیابی: با id ترکیبی (year_id) و ایندکس روی سال
        if (!db.objectStoreNames.contains('assessmentItems')) {
            const itemStore = db.createObjectStore('assessmentItems', { keyPath: 'id' });
            itemStore.createIndex('academicYear', 'academicYear', { unique: false });
        }
        
        // ۱۰. برنامه هفتگی: با id ترکیبی (year_day)
        if (!db.objectStoreNames.contains('weeklySchedule')) {
            const schedStore = db.createObjectStore('weeklySchedule', { keyPath: 'id' });
            schedStore.createIndex('academicYear', 'academicYear', { unique: false });
        }
        
        // ۱۱. آزمون‌ها
        if (!db.objectStoreNames.contains('exams')) {
            const examStore = db.createObjectStore('exams', { keyPath: 'id' });
            examStore.createIndex('subjectId', 'subjectId', { unique: false });
            examStore.createIndex('date', 'date', { unique: false });
            examStore.createIndex('academicYear', 'academicYear', { unique: false });
        }
        
        // ۱۲. نتایج آزمون‌ها
        if (!db.objectStoreNames.contains('examResults')) {
            const resultStore = db.createObjectStore('examResults', { keyPath: 'id' });
            resultStore.createIndex('examId', 'examId', { unique: false });
            resultStore.createIndex('studentId', 'studentId', { unique: false });
            resultStore.createIndex('academicYear', 'academicYear', { unique: false });
        }
        
        // ۱۳. تنظیمات پشتیبان‌گیری: با id = 'backup_1405-1406'
        if (!db.objectStoreNames.contains('backupSettings')) {
            const backupStore = db.createObjectStore('backupSettings', { keyPath: 'id' });
            backupStore.createIndex('academicYear', 'academicYear', { unique: false });
        }
    };
}

// ==========================================
// توابع پایه دیتابیس
// ==========================================

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

// ==========================================
// ✅ تابع جدید: دریافت داده‌های یک جدول، فیلتر شده بر اساس سال تحصیلی
// ==========================================
async function getAllDataByYear(storeName, academicYear) {
    try {
        const allData = await getAllData(storeName);
        // فیلتر بر اساس فیلد academicYear
        // اگر داده academicYear نداشت، به عنوان داده‌ی سال جاری در نظر گرفته می‌شود
        return allData.filter(item => {
            if (!item.academicYear) return false;
            return item.academicYear === academicYear;
        });
    } catch (e) {
        console.error('خطا در دریافت داده‌های ' + storeName + ' برای سال ' + academicYear, e);
        return [];
    }
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

// ==========================================
// ✅ تابع جدید: دریافت مشخصات کلاس برای یک سال تحصیلی خاص
// ==========================================
async function getClassProfile(academicYear) {
    try {
        const profile = await getDataById('classProfile', academicYear);
        return profile || null;
    } catch (e) {
        console.error('خطا در دریافت مشخصات کلاس:', e);
        return null;
    }
}

// ==========================================
// ✅ تابع جدید: ساخت آیتم‌های ارزشیابی پیش‌فرض برای یک سال تحصیلی
// ==========================================
async function initDefaultAssessmentItemsForYear(academicYear) {
    try {
        // بررسی اینکه آیا آیتم‌هایی برای این سال وجود دارد یا نه
        const existingItems = await getAllDataByYear('assessmentItems', academicYear);
        if (existingItems.length > 0) {
            return; // آیتم‌ها قبلاً ساخته شده‌اند
        }
        
        // ساخت آیتم‌های پیش‌فرض برای این سال
        const itemsToSave = [];
        for (let i = 0; i < defaultAssessmentItems.length; i++) {
            const item = defaultAssessmentItems[i];
            const newItem = {
                ...item,
                id: academicYear + '_item_' + i,
                academicYear: academicYear
            };
            itemsToSave.push(newItem);
        }
        
        // اضافه کردن آیتم ویژه «پویش قرآن» (سیستمی)
        itemsToSave.push({
            id: academicYear + '_item_quran',
            title: "پویش حفظ جزء سی قرآن کریم",
            type: "quran",
            academicYear: academicYear
        });
        
        // اضافه کردن آیتم «تشویق ویژه»
        itemsToSave.push({
            id: academicYear + '_item_special',
            title: "تشویق ویژه",
            type: "free",
            placeholder: "امتیاز تشویقی را وارد کنید:",
            academicYear: academicYear
        });
        
        // اضافه کردن آیتم «تشویق خوش‌خط‌نویسی»
        itemsToSave.push({
            id: academicYear + '_item_handwriting',
            title: "تشویق خوش‌خط‌نویسی",
            type: "fixed",
            score: 4,
            academicYear: academicYear
        });
        
        await saveBulkData('assessmentItems', itemsToSave);
        console.log('✅ آیتم‌های ارزشیابی پیش‌فرض برای سال ' + academicYear + ' ساخته شدند.');
    } catch (e) {
        console.error('خطا در ساخت آیتم‌های پیش‌فرض:', e);
    }
}

// ==========================================
// پشتیبان‌گیری و بازیابی
// ==========================================

async function exportAllData() {
    const data = {};
    const stores = ['classProfile', 'students', 'groups', 'subjects', 'records', 'badgesSettings', 'sessions', 'attendance', 'assessmentItems', 'weeklySchedule', 'exams', 'examResults', 'backupSettings'];
    for (const store of stores) {
        try { data[store] = await getAllData(store); } catch (e) { data[store] = []; }
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

// ==========================================
// ✅ تابع به‌روزرسانی شده: دریافت تنظیمات پشتیبان‌گیری برای یک سال تحصیلی
// ==========================================
async function getBackupSettings(academicYear) {
    try {
        const id = 'backup_' + academicYear;
        let settings = await getDataById('backupSettings', id);
        if (!settings) {
            // اگر تنظیمات وجود نداشت، مقادیر پیش‌فرض را ایجاد کن
            settings = {
                id: id,
                academicYear: academicYear,
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
            id: 'backup_' + academicYear,
            academicYear: academicYear,
            reminderType: 'off',
            lastReminderDate: null,
            periods: []
        };
    }
}