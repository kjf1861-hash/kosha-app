// ==========================================
// فایل calendar.js — منطق مشترک تقویم شمسی
// ==========================================

// ==========================================
// 1. توابع پایه تقویم شمسی
// ==========================================

// بررسی سال کبیسه (در حال حاضر ۱۴۰۸ کبیسه است)
const JALALI_LEAP_YEARS = [1408, 1412, 1416];

function isJalaliLeapYear(year) {
    return JALALI_LEAP_YEARS.includes(year);
}

// تعداد روزهای یک ماه شمسی
function getJalaliDaysInMonth(year, month) {
    if (month <= 6) return 31;
    if (month <= 11) return 30;
    return isJalaliLeapYear(year) ? 30 : 29;
}

// پیدا کردن روز اول ماه (۰ = شنبه، ۶ = جمعه)
function getJalaliFirstDayOfWeek(year, month) {
    let daysPassed = 0;
    for (let y = 1405; y < year; y++) {
        daysPassed += isJalaliLeapYear(y) ? 366 : 365;
    }
    for (let m = 1; m < month; m++) {
        daysPassed += getJalaliDaysInMonth(year, m);
    }
    return daysPassed % 7;
}

// ==========================================
// 2. توابع کمکی
// ==========================================

// نام روزهای هفته
const JALALI_DAY_NAMES = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

// نام ماه‌های شمسی
const JALALI_MONTH_NAMES = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

// دریافت نام روز هفته از شماره
function getJalaliDayName(dayIndex) {
    return JALALI_DAY_NAMES[dayIndex] || '';
}

// دریافت نام ماه از شماره
function getJalaliMonthName(monthIndex) {
    return JALALI_MONTH_NAMES[monthIndex - 1] || '';
}

// ==========================================
// 3. توابع جدید برای تب تقویم جامع
// ==========================================

// دریافت مناسبت‌های یک ماه خاص از calendar-data.js
// *** اصلاح‌شده: حالا با ساختار آبجکت (کلید = روز) کار می‌کند ***
function getMonthEvents(year, month) {
    if (typeof CALENDAR_EVENTS === 'undefined') {
        console.warn('CALENDAR_EVENTS تعریف نشده است. فایل calendar-data.js را بررسی کنید.');
        return {};
    }
    
    const yearStr = year.toString();
    if (!CALENDAR_EVENTS[yearStr]) return {};
    
    const monthStr = month.toString();
    if (!CALENDAR_EVENTS[yearStr][monthStr]) return {};
    
    // ساختار جدید: آبجکت با کلید روز
    return CALENDAR_EVENTS[yearStr][monthStr];
}

// دریافت مناسبت‌های یک روز خاص
function getDayEvents(year, month, day) {
    const monthEvents = getMonthEvents(year, month);
    return monthEvents[day] || null;
}

// بررسی اینکه آیا یک روز مناسبت دارد یا نه
function hasEventOnDay(year, month, day) {
    return getDayEvents(year, month, day) !== null;
}

// ==========================================
// 4. رندر تقویم جامع در تب تقویم
// ==========================================

// متغیرهای وضعیت تقویم جامع
let fullCalendarYear = 1405;
let fullCalendarMonth = 1;
let fullCalendarSelectedDay = null;

// مقداردهی اولیه تقویم جامع
function initFullCalendar() {
    const ay = window.activeAcademicYear || '1405-1406';
    const [startYearStr] = ay.split('-');
    const startYear = parseInt(startYearStr);
    
    // بازیابی وضعیت از localStorage
    try {
        const saved = localStorage.getItem('kosha-full-calendar');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.year >= startYear) {
                fullCalendarYear = parsed.year;
                fullCalendarMonth = parsed.month;
                fullCalendarSelectedDay = parsed.day || null;
            } else {
                fullCalendarYear = startYear;
                fullCalendarMonth = 7;
            }
        } else {
            fullCalendarYear = startYear;
            fullCalendarMonth = 7;
        }
    } catch (e) {
        fullCalendarYear = startYear;
        fullCalendarMonth = 7;
    }
    
    renderFullCalendar();
}

// ذخیره وضعیت تقویم جامع
function saveFullCalendarState() {
    try {
        localStorage.setItem('kosha-full-calendar', JSON.stringify({
            year: fullCalendarYear,
            month: fullCalendarMonth,
            day: fullCalendarSelectedDay
        }));
    } catch (e) { console.log(e); }
}

// رندر کل تب تقویم جامع
function renderFullCalendar() {
    renderFullCalendarHeader();
    renderFullCalendarGrid();
    renderFullCalendarEventsList();
}

// رندر هدر (انتخاب ماه و سال)
function renderFullCalendarHeader() {
    const titleEl = document.getElementById('full-calendar-title');
    if (!titleEl) return;
    
    const ay = window.activeAcademicYear || '1405-1406';
    const [startY, endY] = ay.split('-');
    const startYear = parseInt(startY);
    const endYear = parseInt(endY);
    
    titleEl.innerHTML = `
        <select onchange="changeFullCalendarMonth(this.value)">
            ${JALALI_MONTH_NAMES.map((m, i) => `<option value="${i + 1}" ${fullCalendarMonth === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
        <select onchange="changeFullCalendarYear(this.value)">
            ${[startYear, startYear + 1, startYear + 2, startYear + 3, startYear + 4, startYear + 5].filter(y => y <= endYear).map(y => `<option value="${y}" ${fullCalendarYear === y ? 'selected' : ''}>${toPersianNumber(y)}</option>`).join('')}
        </select>
    `;
}

// تغییر ماه در تقویم جامع
function changeFullCalendarMonth(month) {
    fullCalendarMonth = parseInt(month);
    saveFullCalendarState();
    renderFullCalendar();
}

// تغییر سال در تقویم جامع
function changeFullCalendarYear(year) {
    fullCalendarYear = parseInt(year);
    saveFullCalendarState();
    renderFullCalendar();
}

// رندر شبکه روزهای تقویم جامع
function renderFullCalendarGrid() {
    const grid = document.getElementById('full-calendar-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const firstDay = getJalaliFirstDayOfWeek(fullCalendarYear, fullCalendarMonth);
    const daysInMonth = getJalaliDaysInMonth(fullCalendarYear, fullCalendarMonth);
    const eventsMap = getMonthEvents(fullCalendarYear, fullCalendarMonth);
    
    // خانه‌های خالی
    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div class="full-calendar-day empty"></div>`;
    }
    
    // روزهای ماه
    for (let day = 1; day <= daysInMonth; day++) {
        const isFriday = ((firstDay + day - 1) % 7) === 6;
        const hasEvent = eventsMap[day] !== undefined;
        const isSelected = fullCalendarSelectedDay === day;
        
        let classes = 'full-calendar-day';
        if (isFriday) classes += ' friday';
        if (hasEvent) classes += ' has-event';
        if (isSelected) classes += ' selected';
        
        grid.innerHTML += `
            <div class="${classes}" onclick="selectFullCalendarDay(${day})" title="${hasEvent ? eventsMap[day].substring(0, 50) + '...' : ''}">
                ${toPersianNumber(day)}
                ${hasEvent ? '<div class="event-dot"></div>' : ''}
            </div>
        `;
    }
}

// انتخاب یک روز در تقویم جامع
function selectFullCalendarDay(day) {
    fullCalendarSelectedDay = day;
    saveFullCalendarState();
    renderFullCalendarGrid();
    renderFullCalendarEventsList();
}

// رندر لیست مناسبت‌های ماه
function renderFullCalendarEventsList() {
    const container = document.getElementById('full-calendar-events');
    if (!container) return;
    
    const eventsMap = getMonthEvents(fullCalendarYear, fullCalendarMonth);
    const monthName = getJalaliMonthName(fullCalendarMonth);
    
    if (Object.keys(eventsMap).length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#64748b; padding: 20px;">هیچ مناسبتی برای ماه ${monthName} ثبت نشده است.</p>`;
        return;
    }
    
    let html = `
        <h3 style="color:var(--primary); margin-bottom: 15px; text-align: center;">
            📅 مناسبت‌های ماه ${monthName} ${toPersianNumber(fullCalendarYear)}
        </h3>
    `;
    
    // اگر روزی انتخاب شده، فقط مناسبت‌های آن روز را نشان بده
    if (fullCalendarSelectedDay && eventsMap[fullCalendarSelectedDay]) {
        html += `
            <div class="event-highlight">
                <div class="event-highlight-day">${toPersianNumber(fullCalendarSelectedDay)} ${monthName}</div>
                <div class="event-highlight-text">${eventsMap[fullCalendarSelectedDay]}</div>
            </div>
            <hr style="margin: 15px 0; border-top: 1px dashed var(--border-color);">
        `;
    }
    
    // لیست همه مناسبت‌های ماه
    const sortedDays = Object.keys(eventsMap).map(Number).sort((a, b) => a - b);
    
    html += '<div class="events-list">';
    sortedDays.forEach(day => {
        const isSelected = fullCalendarSelectedDay === day;
        html += `
            <div class="event-item ${isSelected ? 'selected' : ''}" onclick="selectFullCalendarDay(${day})">
                <div class="event-day-badge">${toPersianNumber(day)}</div>
                <div class="event-text">${eventsMap[day]}</div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

// رفتن به ماه قبل
function fullCalendarPrevMonth() {
    fullCalendarMonth--;
    if (fullCalendarMonth < 1) {
        fullCalendarMonth = 12;
        fullCalendarYear--;
    }
    saveFullCalendarState();
    renderFullCalendar();
}

// رفتن به ماه بعد
function fullCalendarNextMonth() {
    fullCalendarMonth++;
    if (fullCalendarMonth > 12) {
        fullCalendarMonth = 1;
        fullCalendarYear++;
    }
    saveFullCalendarState();
    renderFullCalendar();
}