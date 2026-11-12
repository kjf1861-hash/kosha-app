// ==========================================
// فایل calendar.js — منطق مشترک تقویم شمسی (نسخه اصلاح‌شده برای مرحله ۲)
// ==========================================

// ==========================================
// 1. توابع پایه تقویم شمسی
// (این توابع حالا از jalali-utils.js می‌آیند)
// ==========================================

// ==========================================
// 2. توابع کمکی
// ==========================================

const JALALI_DAY_NAMES = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
const JALALI_MONTH_NAMES = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

function getJalaliDayName(dayIndex) {
    return JALALI_DAY_NAMES[dayIndex] || '';
}

function getJalaliMonthName(monthIndex) {
    return JALALI_MONTH_NAMES[monthIndex - 1] || '';
}

// ==========================================
// 3. توابع دریافت مناسبت‌ها
// ==========================================

function getMonthEvents(year, month) {
    if (typeof CALENDAR_EVENTS === 'undefined') {
        console.warn('CALENDAR_EVENTS تعریف نشده است. فایل calendar-data.js را بررسی کنید.');
        return {};
    }
    
    const yearStr = year.toString();
    if (!CALENDAR_EVENTS[yearStr]) return {};
    
    const monthStr = month.toString();
    if (!CALENDAR_EVENTS[yearStr][monthStr]) return {};
    
    return CALENDAR_EVENTS[yearStr][monthStr];
}

function getDayEvents(year, month, day) {
    const monthEvents = getMonthEvents(year, month);
    return monthEvents[day] || null;
}

function hasEventOnDay(year, month, day) {
    return getDayEvents(year, month, day) !== null;
}

// ==========================================
// 4. توابع جدید برای استفاده در سایر تب‌ها
// ==========================================

// دریافت مناسبت یک تاریخ به صورت رشته (مثلاً "1405/08/08")
function getEventsForDateString(dateStr) {
    if (!dateStr || !/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) return null;
    const parts = dateStr.split('/');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    return getDayEvents(year, month, day);
}

// بررسی وجود مناسبت در یک تاریخ
function hasEventOnDateString(dateStr) {
    return getEventsForDateString(dateStr) !== null;
}

// دریافت متن مناسبت (یا رشته خالی)
function getEventTitleForDateString(dateStr) {
    const event = getEventsForDateString(dateStr);
    return event || '';
}

// *** تابع جدید: خروجی آماده برای نمایش در tooltip یا باکس زیر تقویم ***
// اگر مناسبت وجود داشته باشد، متن را با پیشوند "🎉 مناسبت: " برمی‌گرداند
function getFormattedEventsForDate(dateStr) {
    const event = getEventsForDateString(dateStr);
    if (!event) return '';
    return `🎉 مناسبت: ${event}`;
}

// ==========================================
// 5. رندر تقویم جامع در تب تقویم
// ==========================================

let fullCalendarYear = 1405;
let fullCalendarMonth = 1;
let fullCalendarSelectedDay = null;

function initFullCalendar() {
    const ay = window.activeAcademicYear || '1405-1406';
    const [startYearStr] = ay.split('-');
    const startYear = parseInt(startYearStr);
    
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

function saveFullCalendarState() {
    try {
        localStorage.setItem('kosha-full-calendar', JSON.stringify({
            year: fullCalendarYear,
            month: fullCalendarMonth,
            day: fullCalendarSelectedDay
        }));
    } catch (e) { console.log(e); }
}

function renderFullCalendar() {
    renderFullCalendarHeader();
    renderFullCalendarGrid();
    renderFullCalendarEventsList();
}

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

function changeFullCalendarMonth(month) {
    fullCalendarMonth = parseInt(month);
    saveFullCalendarState();
    renderFullCalendar();
}

function changeFullCalendarYear(year) {
    fullCalendarYear = parseInt(year);
    saveFullCalendarState();
    renderFullCalendar();
}

// *** تغییر اصلی: حذف نقطه قرمز و استفاده از یک نشانه‌ی بسیار ملایم ***
function renderFullCalendarGrid() {
    const grid = document.getElementById('full-calendar-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const firstDay = getJalaliFirstDayOfWeek(fullCalendarYear, fullCalendarMonth);
    const daysInMonth = getJalaliDaysInMonth(fullCalendarYear, fullCalendarMonth);
    const eventsMap = getMonthEvents(fullCalendarYear, fullCalendarMonth);
    
    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div class="full-calendar-day empty"></div>`;
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const isFriday = ((firstDay + day - 1) % 7) === 6;
        const hasEvent = eventsMap[day] !== undefined;
        const isSelected = fullCalendarSelectedDay === day;
        
        let classes = 'full-calendar-day';
        if (isFriday) classes += ' friday';
        if (hasEvent) classes += ' has-event-soft';  // کلاس جدید: نشانه‌ی ملایم
        if (isSelected) classes += ' selected';
        
        // tooltip به جای نقطه قرمز
        const tooltipText = hasEvent ? eventsMap[day] : '';
        
        grid.innerHTML += `
            <div class="${classes}" onclick="selectFullCalendarDay(${day})" title="${tooltipText}">
                ${toPersianNumber(day)}
            </div>
        `;
    }
}

function selectFullCalendarDay(day) {
    fullCalendarSelectedDay = day;
    saveFullCalendarState();
    renderFullCalendarGrid();
    renderFullCalendarEventsList();
}

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
    
    if (fullCalendarSelectedDay && eventsMap[fullCalendarSelectedDay]) {
        html += `
            <div class="event-highlight">
                <div class="event-highlight-day">${toPersianNumber(fullCalendarSelectedDay)} ${monthName}</div>
                <div class="event-highlight-text">${eventsMap[fullCalendarSelectedDay]}</div>
            </div>
            <hr style="margin: 15px 0; border-top: 1px dashed var(--border-color);">
        `;
    }
    
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

function fullCalendarPrevMonth() {
    fullCalendarMonth--;
    if (fullCalendarMonth < 1) {
        fullCalendarMonth = 12;
        fullCalendarYear--;
    }
    saveFullCalendarState();
    renderFullCalendar();
}

function fullCalendarNextMonth() {
    fullCalendarMonth++;
    if (fullCalendarMonth > 12) {
        fullCalendarMonth = 1;
        fullCalendarYear++;
    }
    saveFullCalendarState();
    renderFullCalendar();
}