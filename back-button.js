// ==========================================
// فایل back-button.js — مدیریت دکمه بازگشت و هشدار خروج در PWA
// نسخه v8 — رفع باگ حلقه خروج و یکپارچه‌سازی مودال‌ها
// ==========================================

(function() {
    'use strict';
    
    // ✅ اصلاح: ترکیب تمام مودال‌ها در یک لیست واحد با اولویت مشخص
    // مودال‌هایی که در بالای لیست هستند، اولویت بالاتری برای بسته شدن دارند
    const PRIORITY_MODALS = [
        'exit-confirm-modal',       // بالاترین اولویت (نباید همزمان با مودال دیگر باز شود)
        'update-available-modal',
        'backup-reminder-modal',
        'period-editor-modal',
        'academic-year-modal',
        'settings-modal',
        'exam-editor-modal',
        'exam-grading-modal',
        'item-management-modal',
        'preview-modal',
        'edit-record-modal',
        'edit-group-modal',
        'edit-student-modal',
        'edit-lesson-modal',
        'group-details-modal',
        'lesson-details-modal',
        'student-details-modal',
        'session-details-modal',
        'report-card-modal',
        'attendance-details-modal'
    ];
    
    let backPressCount = 0;
    let backPressTimer = null;
    let isInitialized = false;
    let isExiting = false; // ✅ متغیر جدید برای جلوگیری از حلقه خروج
    
    function getOpenModal() {
        // با توجه به اولویت‌بندی لیست، اولین مودالِ باز شده را برمی‌گردانیم
        for (let i = 0; i < PRIORITY_MODALS.length; i++) {
            const modal = document.getElementById(PRIORITY_MODALS[i]);
            if (modal && modal.classList.contains('show')) {
                return PRIORITY_MODALS[i];
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
            // ✅ توابع بستن مودال‌های جدید
            'academic-year-modal': 'closeAcademicYearModal',
            'exit-confirm-modal': 'cancelExit',  // ← مهم: cancelExit (نه confirmExit)
            'backup-reminder-modal': 'closeReminderModal',
            'period-editor-modal': 'closePeriodEditor',
            'update-available-modal': 'closeUpdateModal'
        };
        
        const fnName = closeFnMap[modalId];
        if (fnName && typeof window[fnName] === 'function') {
            try { 
                window[fnName](); 
                return true; 
            } catch (e) { 
                console.warn('خطا در بستن مودال ' + modalId + ':', e);
            }
        }
        
        // fallback: اگر تابع بستن وجود نداشت، مستقیماً کلاس را برمی‌داریم
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
    
    // برای فراخوانی از بیرون (وقتی تب عوض می‌شود)
    function ensureGuardState() {
        try {
            window.history.pushState({ koshaGuard: true, ts: Date.now() }, '', window.location.href);
        } catch (e) { console.warn('pushState failed:', e); }
    }
    
    window.resetBackGuard = function() {
        ensureGuardState();
    };
    
    function resetBackPressCount() {
        backPressCount = 0;
        if (backPressTimer) { 
            clearTimeout(backPressTimer); 
            backPressTimer = null; 
        }
    }

    function initBackButtonHandler() {
        if (isInitialized) return;
        isInitialized = true;
        
        try {
            window.history.replaceState({ koshaGuard: true, ts: Date.now() }, '', window.location.href);
        } catch (e) { console.warn('replaceState failed:', e); }
        
        ensureGuardState();
        
        console.log('✅ Back handler initialized.');
        
        // ✅ اصلاح حلقه: اگر در حال خروج هستیم، رویداد popstate را نادیده بگیر
        window.addEventListener('popstate', function(event) {
            if (isExiting) return; 
            handleBackAction();
        });
    }
    
    function handleBackAction() {
        // مرحله ۱: اگر مودال باز است، ببند
        const openModal = getOpenModal();
        if (openModal) {
            closeModal(openModal);
            ensureGuardState();
            resetBackPressCount();
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
                ensureGuardState();
            }
            resetBackPressCount();
            return;
        }
        
        // مرحله ۳: بررسی تب فعال (اگر در تب دیگری غیر از کلاس هستیم)
        const activePage = getActivePageId();
        if (activePage && activePage !== 'page-class') {
            goToPage('page-class');
            ensureGuardState();
            resetBackPressCount();
            return;
        }
        
        // مرحله ۴: در تب کلاس هستیم (مدیریت خروج)
        backPressCount++;
        
        if (backPressCount === 1) {
            // ✅ نمایش پیام هشدار (فرصت ۵ ثانیه‌ای)
            if (typeof showToast === 'function') {
                showToast('برای خروج از برنامه، دکمه بازگشت را دوباره بزنید (تا ۵ ثانیه)', 'info');
            }
            ensureGuardState();
            
            if (backPressTimer) clearTimeout(backPressTimer);
            backPressTimer = setTimeout(resetBackPressCount, 5000);
        } else {
            // ✅ خروج واقعی (بدون ایجاد حلقه بی‌پایان)
            isExiting = true; // پرچم خروج را فعال می‌کنیم
            resetBackPressCount();
            
            if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
                try {
                    window.close();
                } catch (e) {
                    if (typeof showToast === 'function') {
                        showToast('برای خروج، برنامه را از گوشی ببندید.', 'info');
                    }
                }
                // اگر close کار نکرد، یک قدم به عقب می‌رویم
                window.history.back();
            } else {
                // در حالت وب، یک قدم به عقب می‌رویم
                window.history.back();
            }

            // بعد از یک ثانیه، پرچم خروج را غیرفعال می‌کنیم تا اگر کاربر برگشت، دکمه بازگشت دوباره کار کند
            setTimeout(() => { isExiting = false; }, 1000);
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBackButtonHandler);
    } else {
        initBackButtonHandler();
    }
    
})();