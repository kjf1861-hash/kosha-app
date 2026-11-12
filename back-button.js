// ==========================================
// فایل back-button.js — مدیریت دکمه بازگشت و هشدار خروج در PWA
// نسخه v7 — هماهنگ با سیستم هشدار تغییرات ذخیره‌نشده (app.js)
// ==========================================
//
// تغییرات نسخه v7:
// - اضافه شدن مودال‌های جاافتاده: exit-confirm-modal، backup-reminder-modal، period-editor-modal
// - اضافه شدن توابع بستن مربوطه به closeFnMap
// - اضافه شدن pre-check برای مودال‌های نیازمند هشدار تغییرات ذخیره‌نشده
// ==========================================

(function() {
    'use strict';
    
    // ✅ مودال‌های کامل (شامل موارد قبلاً جاافتاده)
    const MODAL_IDS = [
        'settings-modal', 'preview-modal', 'edit-record-modal', 'item-management-modal',
        'report-card-modal', 'attendance-details-modal', 'lesson-details-modal',
        'group-details-modal', 'edit-group-modal', 'edit-student-modal',
        'edit-lesson-modal', 'session-details-modal', 'student-details-modal',
        'exam-editor-modal', 'exam-grading-modal',
        // ✅ اضافه شده:
        'exit-confirm-modal', 'backup-reminder-modal', 'period-editor-modal'
    ];
    
    let backPressCount = 0;
    let backPressTimer = null;
    let isInitialized = false;
    let hasGuardState = false;
    
    // مودال‌هایی که بستن‌شون نیاز به تأیید ندارد (فقط بسته می‌شوند)
    // مودال‌های exit-confirm و backup-reminder هنگام back نباید دوباره به exit-confirm برن
    const MODALS_WITHOUT_DIRTY_CHECK = [
        'exit-confirm-modal', 'backup-reminder-modal', 'period-editor-modal'
    ];
    
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
            'attendance-details-modal': 'closeAttendanceDetails',
            // ✅ اضافه شده:
            'exit-confirm-modal': 'cancelExit',
            'backup-reminder-modal': 'closeReminderModal',
            'period-editor-modal': 'closePeriodEditor'
        };
        
        const fnName = closeFnMap[modalId];
        if (fnName && typeof window[fnName] === 'function') {
            try { window[fnName](); return true; } catch (e) { console.warn('closeModal error:', e); }
        }
        
        // fallback: فقط کلاس show را بردار
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
    
    // یک بار pushState برای قرار دادن یک گارد در تاریخچه (بدون تکرار)
    function ensureGuardState() {
        if (!hasGuardState) {
            try {
                window.history.pushState(
                    { koshaGuard: true, ts: Date.now() },
                    '',
                    window.location.href
                );
                hasGuardState = true;
            } catch (e) { console.warn('pushState failed:', e); }
        }
    }
    
    // برای فراخوانی از بیرون (وقتی تب عوض می‌شود)
    window.resetBackGuard = function() {
        hasGuardState = false;
        ensureGuardState();
    };
    
    function initBackButtonHandler() {
        if (isInitialized) return;
        isInitialized = true;
        
        try {
            window.history.replaceState(
                { koshaGuard: true, ts: Date.now() },
                '',
                window.location.href
            );
        } catch (e) { console.warn('replaceState failed:', e); }
        
        ensureGuardState();
        
        console.log('✅ Back handler initialized.');
        
        window.addEventListener('popstate', function(event) {
            handleBackAction();
        });
    }
    
    function handleBackAction() {
        // مرحله ۱: اگر مودال باز است، ببند
        const openModal = getOpenModal();
        if (openModal) {
            // ✅ مودال‌های بدون هشدار Dirty: فقط ببند
            if (MODALS_WITHOUT_DIRTY_CHECK.includes(openModal)) {
                closeModal(openModal);
                ensureGuardState();
                backPressCount = 0;
                if (backPressTimer) { clearTimeout(backPressTimer); backPressTimer = null; }
                return;
            }
            
            // مودال‌های دیگر: ببند (اگر Dirty دارند، خود مودال مسئول است)
            closeModal(openModal);
            ensureGuardState();
            backPressCount = 0;
            if (backPressTimer) { clearTimeout(backPressTimer); backPressTimer = null; }
            return;
        }
        
        // مرحله ۲: اگر فرم دارای تغییرات ذخیره‌نشده است
        if (window.isFormDirty) {
            if (typeof window.requestExit === 'function') {
                window.requestExit(function() {
                    if (getActivePageId() !== 'page-class') {
                        goToPage('page-class');
                    }
                    ensureGuardState();
                });
            } else {
                if (getActivePageId() !== 'page-class') {
                    goToPage('page-class');
                }
            }
            ensureGuardState();
            backPressCount = 0;
            if (backPressTimer) { clearTimeout(backPressTimer); backPressTimer = null; }
            return;
        }
        
        // مرحله ۳: بررسی تب فعال (اگر در تب دیگری غیر از کلاس هستیم)
        const activePage = getActivePageId();
        if (activePage && activePage !== 'page-class') {
            goToPage('page-class');
            ensureGuardState();
            backPressCount = 0;
            if (backPressTimer) { clearTimeout(backPressTimer); backPressTimer = null; }
            return;
        }
        
        // مرحله ۴: در تب کلاس هستیم (مدیریت خروج)
        backPressCount++;
        
        if (backPressCount === 1) {
            if (typeof showToast === 'function') {
                showToast('برای خروج از برنامه، دوباره دکمه بازگشت را بزنید.', 'info');
            }
            ensureGuardState();
            
            if (backPressTimer) clearTimeout(backPressTimer);
            backPressTimer = setTimeout(function() {
                backPressCount = 0;
                backPressTimer = null;
            }, 3000);
        } else {
            backPressCount = 0;
            if (backPressTimer) { clearTimeout(backPressTimer); backPressTimer = null; }
            
            // تلاش برای خروج در PWA
            if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
                try {
                    window.close();
                } catch (e) {
                    if (typeof showToast === 'function') {
                        showToast('برای خروج، برنامه را از گوشی ببندید.', 'info');
                    }
                }
            } else {
                try {
                    window.history.go(-2);
                } catch (e) {
                    window.history.back();
                }
            }
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBackButtonHandler);
    } else {
        initBackButtonHandler();
    }
    
})();