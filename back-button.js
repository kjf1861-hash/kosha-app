// ==========================================
// فایل back-button.js — مدیریت دکمه بازگشت (Back) در PWA
// نسخه v4 — راه‌حل قطعی و بدون تداخل با لینک‌های هش
// ==========================================

(function() {
    'use strict';
    
    const MODAL_IDS = [
        'settings-modal', 'preview-modal', 'edit-record-modal', 'item-management-modal',
        'report-card-modal', 'attendance-details-modal', 'lesson-details-modal',
        'group-details-modal', 'edit-group-modal', 'edit-student-modal',
        'edit-lesson-modal', 'session-details-modal', 'student-details-modal',
        'exam-editor-modal', 'exam-grading-modal'
    ];
    
    let backPressCount = 0;
    let backPressTimer = null;
    let isInitialized = false;
    
    function getOpenModal() {
        for (let i = 0; i < MODAL_IDS.length; i++) {
            const modal = document.getElementById(MODAL_IDS[i]);
            if (modal && modal.classList.contains('show')) {
                return MODAL_IDS[i];
            }
        }
        return null;
    }
    
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return false;
        
        const closeFnMap = {
            'settings-modal': 'closeSettingsModal',
            'edit-record-modal': 'closeEditModal',
            'edit-group-modal': 'closeEditGroupModal',
            'edit-student-modal': 'closeEditStudentModal',
            'edit-lesson-modal': 'closeEditLessonModal',
            'group-details-modal': 'closeGroupDetails',
            'lesson-details-modal': 'closeLessonDetails',
            'student-details-modal': 'closeStudentDetails',
            'session-details-modal': 'closeSessionDetails',
            'item-management-modal': 'closeItemManagementModal',
            'exam-editor-modal': 'closeExamEditorModal',
            'exam-grading-modal': 'closeExamGradingModal',
            'preview-modal': 'closePreviewModal',
            'report-card-modal': 'closeReportCard',
            'attendance-details-modal': 'closeAttendanceDetails'
        };
        
        const fnName = closeFnMap[modalId];
        if (fnName && typeof window[fnName] === 'function') {
            try { window[fnName](); return true; } catch (e) { }
        }
        
        modal.classList.remove('show');
        return true;
    }
    
    function getActivePageId() {
        const activePage = document.querySelector('.page-section.active');
        return activePage ? activePage.id : 'page-class';
    }
    
    function goToPage(pageId) {
        const page = document.getElementById(pageId);
        if (!page) return;
        
        document.querySelectorAll('.page-section').forEach(function(p) {
            p.classList.remove('active');
        });
        page.classList.add('active');
        
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(function(nav) { nav.classList.remove('active'); });
        
        const pageToNavIndex = {
            'page-class': 0, 'page-students': 1, 'page-group': 2, 'page-lesson': 3,
            'page-calendar': 4, 'page-session': 5, 'page-score': 6, 'page-exams': 7
        };
        
        const navIndex = pageToNavIndex[pageId];
        if (navIndex !== undefined && navItems[navIndex]) {
            navItems[navIndex].classList.add('active');
        }
        
        try {
            if (pageId === 'page-class' && typeof renderDashboardData === 'function') renderDashboardData();
            if (pageId === 'page-students' && typeof renderStudentsList === 'function') renderStudentsList();
            if (pageId === 'page-lesson' && typeof renderLessonData === 'function') renderLessonData();
            if (pageId === 'page-calendar' && typeof initFullCalendar === 'function') initFullCalendar();
            if (pageId === 'page-group' && typeof renderGroupData === 'function') renderGroupData();
            if (pageId === 'page-session' && typeof renderSessionData === 'function') renderSessionData();
            if (pageId === 'page-score' && typeof renderScoreData === 'function') renderScoreData();
            if (pageId === 'page-exams' && typeof renderExamsData === 'function') renderExamsData();
        } catch (e) { console.warn('render error:', e); }
    }
    
    // تابعی برای ثبت یک گام جدید در تاریخچه مرورگر (بدون تغییر آدرس)
    function pushGuard() {
        try {
            window.history.pushState(
                { koshaGuard: true, page: getActivePageId(), ts: Date.now() },
                '',
                window.location.href // آدرس فعلی (حتی اگر # داشته باشد) را حفظ می‌کند
            );
        } catch (e) { console.warn('pushState failed:', e); }
    }
    
    function initBackButtonHandler() {
        if (isInitialized) return;
        isInitialized = true;
        
        // مرحله ۱: ذخیره وضعیت اولیه
        try {
            window.history.replaceState(
                { koshaGuard: true, page: 'page-class', ts: Date.now() },
                '',
                window.location.href
            );
        } catch (e) { console.warn('replaceState failed:', e); }
        
        // مرحله ۲: ثبت گام نگهبان
        pushGuard();
        
        console.log('✅ Back handler initialized.');
        
        // مرحله ۳: شنونده رویداد popstate (مخصوص دکمه Back گوشی/مرورگر)
        window.addEventListener('popstate', function(event) {
            console.log('🔙 popstate fired.');
            handleBackAction();
        });
    }
    
    function handleBackAction() {
        // ۱. بررسی مودال باز
        const openModal = getOpenModal();
        if (openModal) {
            closeModal(openModal);
            pushGuard();
            backPressCount = 0;
            if (backPressTimer) { clearTimeout(backPressTimer); backPressTimer = null; }
            return;
        }
        
        // ۲. بررسی تب فعال
        const activePage = getActivePageId();
        if (activePage && activePage !== 'page-class') {
            goToPage('page-class');
            pushGuard();
            backPressCount = 0;
            if (backPressTimer) { clearTimeout(backPressTimer); backPressTimer = null; }
            return;
        }
        
        // ۳. در تب کلاس هستیم (پیام خروج)
        backPressCount++;
        
        if (backPressCount === 1) {
            if (typeof showToast === 'function') {
                showToast('برای خروج از برنامه، دوباره دکمه بازگشت را بزنید.', 'info');
            }
            pushGuard();
            
            if (backPressTimer) clearTimeout(backPressTimer);
            backPressTimer = setTimeout(function() {
                backPressCount = 0;
                backPressTimer = null;
            }, 3000);
        } else {
            // خروج واقعی
            backPressCount = 0;
            if (backPressTimer) { clearTimeout(backPressTimer); backPressTimer = null; }
            
            try {
                window.history.go(-2); // رد شدن از هر دو گام ثبت شده
            } catch (e) {
                window.history.back();
            }
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBackButtonHandler);
    } else {
        initBackButtonHandler();
    }
    
})();