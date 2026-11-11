// ==========================================
// فایل back-button.js — مدیریت دکمه بازگشت (Back) در PWA
// ==========================================

(function() {
    'use strict';
    
    // لیست مودال‌ها و توابع بستن آنها
    const MODAL_IDS = [
        'settings-modal', 'preview-modal', 'edit-record-modal', 'item-management-modal',
        'report-card-modal', 'attendance-details-modal', 'lesson-details-modal',
        'group-details-modal', 'edit-group-modal', 'edit-student-modal',
        'edit-lesson-modal', 'session-details-modal', 'student-details-modal',
        'exam-editor-modal', 'exam-grading-modal'
    ];
    
    // شمارنده برای دکمه back
    let backPressCount = 0;
    let backPressTimer = null;
    
    // بررسی اینکه آیا مودالی باز است
    function getOpenModal() {
        for (let i = 0; i < MODAL_IDS.length; i++) {
            const modal = document.getElementById(MODAL_IDS[i]);
            if (modal && modal.classList.contains('show')) {
                return MODAL_IDS[i];
            }
        }
        return null;
    }
    
    // بستن مودال
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            return true;
        }
        return false;
    }
    
    // تعیین تب فعال فعلی
    function getActivePageId() {
        const activePage = document.querySelector('.page-section.active');
        return activePage ? activePage.id : 'page-class';
    }
    
    // رفتن به یک تب خاص
    function goToPage(pageId) {
        const page = document.getElementById(pageId);
        if (!page) return;
        
        // تغییر کلاس active
        document.querySelectorAll('.page-section').forEach(function(p) {
            p.classList.remove('active');
        });
        page.classList.add('active');
        
        // به‌روزرسانی نویگیشن
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(function(nav) {
            nav.classList.remove('active');
        });
        
        const pageToNavIndex = {
            'page-class': 0,
            'page-students': 1,
            'page-group': 2,
            'page-lesson': 3,
            'page-calendar': 4,
            'page-session': 5,
            'page-score': 6,
            'page-exams': 7
        };
        
        const navIndex = pageToNavIndex[pageId];
        if (navIndex !== undefined && navItems[navIndex]) {
            navItems[navIndex].classList.add('active');
        }
        
        // رندر مجدد محتوا
        if (pageId === 'page-class' && typeof renderDashboardData === 'function') renderDashboardData();
        if (pageId === 'page-students' && typeof renderStudentsList === 'function') renderStudentsList();
        if (pageId === 'page-lesson' && typeof renderLessonData === 'function') renderLessonData();
        if (pageId === 'page-calendar' && typeof initFullCalendar === 'function') initFullCalendar();
        if (pageId === 'page-group' && typeof renderGroupData === 'function') renderGroupData();
        if (pageId === 'page-session' && typeof renderSessionData === 'function') renderSessionData();
        if (pageId === 'page-score' && typeof renderScoreData === 'function') renderScoreData();
        if (pageId === 'page-exams' && typeof renderExamsData === 'function') renderExamsData();
    }
    
    // مقداردهی اولیه
    function initBackButtonHandler() {
        // فقط یک بار state اولیه را اضافه کن
        if (window.history.state === null || window.history.state.koshaPage === undefined) {
            window.history.replaceState({ koshaPage: 'page-class' }, '', window.location.href);
        }
        
        // گوش دادن به رویداد popstate
        window.addEventListener('popstate', function(event) {
            console.log('🔙 دکمه back زده شد. State:', event.state);
            
            // ۱. بررسی مودال باز
            const openModal = getOpenModal();
            if (openModal) {
                closeModal(openModal);
                // state را دوباره push کن تا از اپ خارج نشویم
                window.history.pushState({ koshaPage: getActivePageId() }, '', window.location.href);
                backPressCount = 0;
                return;
            }
            
            // ۲. بررسی تب
            const activePage = getActivePageId();
            if (activePage && activePage !== 'page-class') {
                goToPage('page-class');
                window.history.pushState({ koshaPage: 'page-class' }, '', window.location.href);
                backPressCount = 0;
                return;
            }
            
            // ۳. در تب کلاس هستیم و مودالی باز نیست
            backPressCount++;
            
            if (backPressCount === 1) {
                // اولین back: هشدار
                if (typeof showToast === 'function') {
                    showToast('برای خروج از برنامه، دوباره دکمه بازگشت را بزنید.', 'info');
                }
                // state را دوباره push کن
                window.history.pushState({ koshaPage: 'page-class' }, '', window.location.href);
                
                // ریست شمارنده بعد از ۳ ثانیه
                if (backPressTimer) clearTimeout(backPressTimer);
                backPressTimer = setTimeout(function() {
                    backPressCount = 0;
                }, 3000);
            } else {
                // دومین back: اجازه بده از اپ خارج شود
                backPressCount = 0;
                if (backPressTimer) clearTimeout(backPressTimer);
                window.history.back();
            }
        });
        
        console.log('✅ مدیریت دکمه Back فعال شد.');
    }
    
    // اجرا وقتی صفحه کاملاً لود شد
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBackButtonHandler);
    } else {
        // اگر صفحه قبلاً لود شده
        setTimeout(initBackButtonHandler, 300);
    }
})();