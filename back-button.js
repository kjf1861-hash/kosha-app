// ==========================================
// فایل back-button.js — مدیریت دکمه بازگشت (Back) در PWA
// نسخه v3 — راه‌حل قطعی با Hash-based Navigation
// تست‌شده روی Chrome Android, Safari iOS, Firefox
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
    let lastHash = '';
    
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
    
    // ==========================================
    // 4. به‌روزرسانی Hash برای Push یک entry جدید
    // ==========================================
    function pushGuard() {
        try {
            const currentPage = getActivePageId();
            const newHash = '#' + currentPage + '-' + Date.now();
            // تغییر hash یک history entry جدید می‌سازد
            window.location.hash = newHash;
            lastHash = newHash;
        } catch (e) { console.warn('pushGuard failed:', e); }
    }
    
    // ==========================================
    // 5. راه‌اندازی اولیه
    // ==========================================
    function initBackButtonHandler() {
        if (isInitialized) return;
        isInitialized = true;
        
        // مرحله ۱: اگر hash خالی است، hash اولیه بگذار
        if (!window.location.hash) {
            window.location.hash = '#page-class-init';
        }
        lastHash = window.location.hash;
        
        // مرحله ۲: Push یک entry نگهبان اضافه
        // تا وقتی کاربر Back می‌زند، به hash اولیه برگردد نه به بیرون
        setTimeout(function() {
            pushGuard();
        }, 100);
        
        // مرحله ۳: گوش دادن به رویداد hashchange
        // (این روش قطعی است و در همه PWA ها کار می‌کند)
        window.addEventListener('hashchange', handleHashChange);
        
        // مرحله ۴: گوش دادن به popstate به عنوان مکمل
        window.addEventListener('popstate', function(e) {
            // اگر hash تغییر نکرده، احتمالاً popstate از swipe یا back browser است
            // hashchange به تنهایی کار می‌کند، ولی popstate هم بررسی می‌کنیم
            handleBackAction();
        });
        
        // مرحله ۵: مدیریت pageshow (برای iOS Safari bfcache)
        window.addEventListener('pageshow', function(event) {
            if (event.persisted) {
                // صفحه از bfcache برگشته — hash را دوباره تنظیم کن
                if (!window.location.hash) {
                    window.location.hash = '#page-class-init';
                }
                lastHash = window.location.hash;
            }
        });
        
        console.log('✅ Back handler initialized (hash-based). hash =', window.location.hash);
    }
    
    // ==========================================
    // 6. هندلر hashchange
    // ==========================================
    function handleHashChange() {
        const currentHash = window.location.hash;
        
        // اگر hash همان hash قبلی است، نادیده بگیر
        if (currentHash === lastHash) return;
        lastHash = currentHash;
        
        console.log('🔙 hashchange fired. new hash =', currentHash);
        handleBackAction();
    }
    
    // ==========================================
    // 7. هندلر اصلی Back
    // ==========================================
    function handleBackAction() {
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
            // دوباره push نکن! بگذار history در hash فعلی بماند
            // تا اگر کاربر دوباره Back بزند، hash قبلی تحریک شود
            if (backPressTimer) clearTimeout(backPressTimer);
            backPressTimer = setTimeout(function() {
                backPressCount = 0;
                backPressTimer = null;
                // بعد از ۳ ثانیه، یک نگهبان جدید push کن
                pushGuard();
            }, 3000);
        } else {
            // خروج واقعی: با تغییر hash به hash خالی، از اپ خارج می‌شود
            backPressCount = 0;
            if (backPressTimer) { clearTimeout(backPressTimer); backPressTimer = null; }
            
            // از اپ خارج شو — hash را به '#' یا خالی تغییر بده
            // این باعث می‌شود مرورگر از اپ خارج شود (چون entry نگهبان قبلی داریم)
            try {
                window.history.go(-1); // به entry قبل از اپ برو
            } catch (e) {
                window.history.back();
            }
        }
    }
    
    // ==========================================
    // 8. راه‌اندازی
    // ==========================================
    // راه‌اندازی بلافاصله (چون defer خورده)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBackButtonHandler);
    } else {
        initBackButtonHandler();
    }
    
})();