// ==========================================
// فایل back-button.js — مدیریت دکمه بازگشت (Back) در PWA
// نسخه v2 — راه‌حل قطعی با Guard Layer
// ==========================================

(function() {
    'use strict';
    
    // ==========================================
    // 1. لیست مودال‌ها
    // ==========================================
    const MODAL_IDS = [
        'settings-modal', 'preview-modal', 'edit-record-modal', 'item-management-modal',
        'report-card-modal', 'attendance-details-modal', 'lesson-details-modal',
        'group-details-modal', 'edit-group-modal', 'edit-student-modal',
        'edit-lesson-modal', 'session-details-modal', 'student-details-modal',
        'exam-editor-modal', 'exam-grading-modal'
    ];
    
    // ==========================================
    // 2. متغیرهای داخلی
    // ==========================================
    let backPressCount = 0;
    let backPressTimer = null;
    let isInitialized = false;
    
    // ==========================================
    // 3. توابع کمکی
    // ==========================================
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
        
        // تلاش برای استفاده از تابع بستن اختصاصی اگر وجود دارد
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
            try { window[fnName](); return true; } catch (e) { /* ignore */ }
        }
        
        // Fallback: حذف کلاس show
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
        
        // رندر مجدد
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
    
    // ==========================================
    // 4. Push Guard State
    // ==========================================
    function pushGuard() {
        try {
            window.history.pushState(
                { koshaGuard: true, koshaPage: getActivePageId(), ts: Date.now() },
                '',
                window.location.href
            );
        } catch (e) { console.warn('pushState failed:', e); }
    }
    
    // ==========================================
    // 5. راه‌اندازی اولیه
    // ==========================================
    function initBackButtonHandler() {
        if (isInitialized) return;
        isInitialized = true;
        
        // مرحله ۱: مقداردهی state اولیه
        try {
            window.history.replaceState(
                { koshaGuard: true, koshaPage: 'page-class', ts: Date.now() },
                '',
                window.location.href
            );
        } catch (e) { console.warn('replaceState failed:', e); }
        
        // مرحله ۲: اضافه کردن یک entry نگهبان بالای آن
        pushGuard();
        
        console.log('✅ Back handler initialized. history.length =', window.history.length);
        
        // مرحله ۳: گوش دادن به popstate
        window.addEventListener('popstate', handlePopState);
    }
    
    // ==========================================
    // 6. هندلر اصلی popstate
    // ==========================================
    function handlePopState(event) {
        console.log('🔙 popstate fired. state =', event.state);
        
        // ==========================================
        // مورد ۱: مودال باز است → آن را ببند
        // ==========================================
        const openModal = getOpenModal();
        if (openModal) {
            closeModal(openModal);
            pushGuard();
            backPressCount = 0;
            if (backPressTimer) { clearTimeout(backPressTimer); backPressTimer = null; }
            return;
        }
        
        // ==========================================
        // مورد ۲: در تب غیر از کلاس → به کلاس برگرد
        // ==========================================
        const activePage = getActivePageId();
        if (activePage && activePage !== 'page-class') {
            goToPage('page-class');
            pushGuard();
            backPressCount = 0;
            if (backPressTimer) { clearTimeout(backPressTimer); backPressTimer = null; }
            return;
        }
        
        // ==========================================
        // مورد ۳: در تب کلاس بدون مودال → پیام خروج
        // ==========================================
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
            // خروج واقعی: از entry های اپ بگذر
            backPressCount = 0;
            if (backPressTimer) { clearTimeout(backPressTimer); backPressTimer = null; }
            
            // از هر دو entry نگهبان بگذر
            try {
                window.history.go(-2);
            } catch (e) {
                window.history.back();
                setTimeout(() => window.history.back(), 50);
            }
        }
    }
    
    // ==========================================
    // 7. راه‌اندازی
    // ==========================================
    // چون این فایل با defer لود می‌شود، پس از parse کامل DOM اجرا می‌شود
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBackButtonHandler);
    } else {
        initBackButtonHandler();
    }
    
})();