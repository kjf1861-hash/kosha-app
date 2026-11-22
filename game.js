// ==========================================
// فایل game.js — منطق تولید فایل بازی آزمون (آفلاین)
// نسخه نهایی: رفع کامل خطای بک‌تیک، دکمه‌های لاگین و کپی کد
// ==========================================

async function encryptStudentName(name, password) {
    try {
        const enc = new TextEncoder();
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const keyMaterial = await crypto.subtle.importKey(
            "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits", "deriveKey"]
        );
        const key = await crypto.subtle.deriveKey(
            { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
            keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt"]
        );
        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv }, key, enc.encode(name)
        );

        const toBase64 = (arr) => btoa(String.fromCharCode.apply(null, arr));

        return {
            ciphertext: toBase64(new Uint8Array(encrypted)),
            salt: toBase64(salt),
            iv: toBase64(iv)
        };
    } catch (e) {
        console.error('خطا در رمزنگاری نام:', e);
        return null;
    }
}

async function generateGameFile(examId, isSmart = false) {
    const exam = await getDataById('exams', examId);
    if (!exam) { showToast('آزمون یافت نشد.', 'error'); return; }
    if (!exam.questions || exam.questions.length === 0) { showToast('آزمون سوالی ندارد.', 'error'); return; }
    
    const sub = window.allSubjectsData.find(s => s.id === exam.subjectId);
    const subName = sub ? `${sub.symbol || ''} ${sub.name}` : 'بدون درس';
    
    let classProfile = null;
    let encryptedStudents = [];

    if (isSmart) {
        try {
            showToast('در حال رمزنگاری اطلاعات و تولید بازی هوشمند...', 'info');
            classProfile = await getClassProfile(window.activeAcademicYear);
            const studentsList = await getDataByYear('students', window.activeAcademicYear);
            for (const st of studentsList) {
                const password = generateStudentPassword(st.nationalId);
                const encryptedData = await encryptStudentName(st.firstName + ' ' + st.lastName, password);
                if (encryptedData) {
                    encryptedStudents.push({ nationalId: st.nationalId, ...encryptedData });
                }
            }
        } catch (e) {
            console.error('خطا در آماده‌سازی داده‌های هوشمند:', e);
            showToast('خطا در آماده‌سازی اطلاعات بازی.', 'error');
            return;
        }
    }

    const gameQuestions = [];
    exam.questions.forEach((q, index) => {
        if (q.type === 'matching' && q.pairs && q.pairs.length > 0) {
            q.pairs.forEach((pair, pIndex) => {
                let options = [pair.b, ...q.pairs.filter((_, i) => i !== pIndex).map(p => p.b)];
                options = options.sort(() => Math.random() - 0.5);
                const correctIndex = options.indexOf(pair.b);
                const distributedScore = Math.round((q.score / q.pairs.length) * 100) / 100;
                gameQuestions.push({ type: 'multiple-choice', text: `مفهوم «${pair.a}» با کدام گزینه تطبیق دارد؟ ${q.text ? '(' + q.text + ')' : ''}`, options: options, score: distributedScore, correctIndex: correctIndex, correctText: pair.b });
            });
        } else if (q.type === 'multiple-choice') {
            gameQuestions.push({ type: 'multiple-choice', text: q.text, options: q.options, score: q.score, correctIndex: q.correctIndex, correctText: q.options[q.correctIndex] });
        } else if (q.type === 'true-false') {
            gameQuestions.push({ type: 'true-false', text: q.text, score: q.score, correctAnswer: q.correctAnswer, correctText: q.correctAnswer ? 'درست' : 'غلط' });
        } else {
            gameQuestions.push({ type: 'fill-blank', text: q.text, score: q.score, answer: q.answer || '', correctText: q.answer || '' });
        }
    });

    const MAX_LEVELS = 3;
    const levelsData = [];
    if (gameQuestions.length <= 4) {
        levelsData.push({ name: 'مرحله ۱', questions: gameQuestions });
    } else {
        const chunkSize = Math.ceil(gameQuestions.length / MAX_LEVELS);
        for (let i = 0; i < MAX_LEVELS; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, gameQuestions.length);
            if (start < gameQuestions.length) {
                levelsData.push({ name: 'مرحله ' + (i + 1), questions: gameQuestions.slice(start, end) });
            }
        }
    }
    
    const gameHtml = buildGameHtml(exam, subName, levelsData, classProfile, encryptedStudents, isSmart);
    
    const blob = new Blob([gameHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `بازی_${isSmart ? 'هوشمند' : 'ساده'}_${exam.title.replace(/\s+/g, '_')}_${exam.date.replace(/\//g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`فایل بازی ${isSmart ? 'هوشمند' : 'ساده'} تولید شد! 🎮`, 'success');
}

function buildGameHtml(exam, subName, levelsData, classProfile, encryptedStudents, isSmart) {
    // ✅ تابع امن‌سازی رشته‌ها برای جلوگیری از خطای سینتکس
    const safeJson = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
    
    const safeTitleJs = JSON.stringify(exam.title);
    const levelsJson = safeJson(levelsData);
    const studentsJson = safeJson(encryptedStudents);
    const classProfileJson = safeJson(classProfile);
    const examIdJs = JSON.stringify(exam.id);
    const secretKeyJs = JSON.stringify("KOSHA_SECURE_V1");

    const safeExamTitleHtml = escapeHtml(exam.title);
    const safeSubNameHtml = escapeHtml(subName);
    const safeDateHtml = escapeHtml(exam.date);

    let html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🎮 بازی آزمون: ${safeExamTitleHtml}</title>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;font-family:'Vazirmatn',Tahoma,sans-serif}
body{background:#f0f4f8;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;padding:15px;overflow-x:hidden}
.c{background:#fff;padding:20px;border-radius:15px;box-shadow:0 5px 15px rgba(0,0,0,.1);width:100%;max-width:600px;text-align:center;position:relative;z-index:10}
h1{color:#2c3e50;font-size:22px;margin-bottom:10px}
h2{color:#34495e;font-size:18px;margin-bottom:15px}
.info{background:#e8f4f8;padding:10px;border-radius:8px;font-size:13px;color:#2980b9;margin-bottom:15px;line-height:1.6}
.date-box{background:#fff;border:1px solid #bdc3c7;border-radius:8px;padding:5px 15px;font-size:12px;color:#7f8c8d;margin-bottom:15px;display:inline-block;}
.input-group { margin-bottom: 5px; text-align: right; }
input{width:100%;padding:10px;border:2px solid #bdc3c7;border-radius:8px;font-size:14px;text-align:center;outline:none; transition: 0.3s; background: #fff; font-family: inherit;}
input:focus{border-color:#3498db}
input:disabled { background: #e9ecef; color: #7f8c8d; cursor: not-allowed; border-color: #ced4da; }
.filled{border-color:#2ecc71 !important; background: #f0fff4;}
.error{border-color:#e74c3c !important; background: #fff5f5;}
.field-msg { font-size: 12px; font-weight: bold; height: 18px; display: block; padding-right: 5px; margin-top: 2px;}
.msg-green { color: #27ae60; }
.msg-red { color: #e74c3c; }
.b{display:block;width:100%;padding:12px;margin:10px 0;background:#3498db;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;transition:.2s;font-family:inherit}
.b:hover:not(.btn-disabled){background:#2980b9}
.btn-disabled{background:#bdc3c7 !important; cursor: pointer; opacity: 0.8;} 
.o{display:block;width:100%;padding:12px;margin:10px 0;background:#ecf0f1;border:2px solid #ecf0f1;border-radius:8px;font-size:16px;cursor:pointer;transition:.2s;color:#333;text-align:right;font-family:inherit}
.o:hover:not(:disabled){background:#e0e6ed;border-color:#bdc3c7}
.correct{background:#2ecc71!important;border-color:#27ae60!important;color:#fff!important}
.wrong{background:#e74c3c!important;border-color:#c0392b!important;color:#fff!important}
#q{font-size:18px;font-weight:bold;color:#e67e22;margin:15px 0;line-height:1.6;}
#f{font-size:14px;margin-top:15px;line-height:1.6;font-weight:bold}
#n{display:none;background:#2ecc71;margin-top:15px}
#n:hover{background:#27ae60}
.score-badge{background:#f1c40f;color:#333;padding:5px 15px;border-radius:20px;font-weight:bold;display:inline-block;margin-bottom:15px}
.report{background:#f9f9f9;padding:15px;border-radius:10px;border:2px dashed #3498db;margin-bottom:15px}
.report p{font-size:15px;line-height:1.8;color:#2c3e50;margin:5px 0}
.hidden{display:none!important}
.stats-bar{display:flex;justify-content:space-between;flex-wrap:wrap;background:#f8f9fa;padding:8px;border-radius:8px;font-size:12px;font-weight:bold;color:#555;margin-bottom:15px;border:1px solid #e9ecef}
.stats-bar span{display:inline-block;margin:2px}
.sc-score{color:#2980b9}.sc-correct{color:#27ae60}.sc-wrong{color:#e74c3c}
.instruction-box { background: #fff3cd; color: #856404; padding: 10px; border-radius: 8px; font-size: 13px; font-weight: bold; margin-bottom: 15px; border: 1px solid #ffeeba; text-align: right; line-height: 1.5; }
.table-wrap { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; margin-top: 10px; border: 1px solid #ddd; border-radius: 5px;}
table{width:100%; border-collapse:collapse; font-size:12px; text-align:center; white-space:nowrap;}
th,td{border:1px solid #ddd;padding:6px;}
th{background:#f2f2f2;color:#333;font-weight:bold;}
.pass-msg{color:#27ae60;font-weight:bold}
.fail-msg{color:#e74c3c;font-weight:bold}
.math-alert{color:#e74c3c;background:#fdeaea;padding:8px;border-radius:5px;margin-top:10px;font-size:13px;border:1px solid #e74c3c; display:none;}
.flower{position:fixed;top:-50px;font-size:24px;z-index:999;pointer-events:none;animation:fall 2.5s linear forwards}
@keyframes fall{to{transform:translateY(100vh) rotate(360deg);opacity:0}}
.pdf-btn{background:#e74c3c !important;}
.pdf-btn:hover{background:#c0392b !important;}
.code-btn{background:#8e44ad !important;}
.code-btn:hover{background:#732d91 !important;}
</style>
</head>
<body>
<div class="c">
    <div id="sc-auth" class="${isSmart ? '' : 'hidden'}">
        <div style="font-size:50px">🔐</div>
        <h1>ورود به آزمون</h1>
        <p style="color:#7f8c8d;font-size:14px">لطفاً نوع ورود خود را انتخاب کنید</p>
        <button class="b" onclick="showLoginForm()">🎓 دانش‌آموز رسمی (ورود با کد ملی)</button>
        <button class="b" style="background:#95a5a6" onclick="loginAsGuest()">👤 دانش‌آموز آزاد (بدون ثبت نتیجه)</button>
        <div id="officialLoginForm" class="hidden" style="margin-top:20px; border-top:1px dashed #ccc; padding-top:20px;">
            <div class="input-group"><input type="tel" id="authNationalId" placeholder="کد ملی (۱۰ رقم)" maxlength="10"></div>
            <div class="input-group"><input type="password" id="authPassword" placeholder="رمز عبور ۴ رقمی" maxlength="4"></div>
            <button class="b" id="btnAuthLogin" onclick="handleOfficialLogin()">ورود به بازی ✅</button>
            <button class="b" style="background:#e74c3c; font-size:14px; padding:8px;" onclick="hideLoginForm()">انصراف</button>
        </div>
    </div>

    <div id="sc-welcome" class="${isSmart ? 'hidden' : ''}">
        <div style="font-size:50px">🎮</div>
        <h1>${safeExamTitleHtml}</h1>
        <p style="color:#7f8c8d;font-size:14px">سلام قهرمان! آماده‌ای این آزمون رو با موفقیت پشت سر بذاری؟</p>
        <div class="info">📚 <b>درس:</b> ${safeSubNameHtml} | 📅 <b>تاریخ:</b> ${safeDateHtml}</div>
        <div class="date-box" id="welcomeDate"></div>
        <form onsubmit="event.preventDefault(); handleStartClick();">
            <div class="input-group"><input type="text" id="fName" placeholder="نام..." oninput="checkField('fName')" onblur="checkField('fName')"><span id="msg-fName" class="field-msg"></span></div>
            <div class="input-group"><input type="text" id="lName" placeholder="نام خانوادگی..." oninput="checkField('lName')" onblur="checkField('lName')"><span id="msg-lName" class="field-msg"></span></div>
            <div class="input-group"><input type="text" id="classNum" placeholder="کلاس..." oninput="checkField('classNum')" onblur="checkField('classNum')"><span id="msg-classNum" class="field-msg"></span></div>
            <div class="input-group"><input type="text" id="school" placeholder="مدرسه..." oninput="checkField('school')" onblur="checkField('school')"><span id="msg-school" class="field-msg"></span></div>
            <div class="input-group"><input type="text" id="grade" placeholder="پایه..." oninput="checkField('grade')" onblur="checkField('grade')"><span id="msg-grade" class="field-msg"></span></div>
            <button type="submit" class="b btn-disabled" id="startBtn">شروع آزمون 🚀</button>
        </form>
    </div>

    <div id="sc-menu" class="hidden">
        <h2>مسیر خود را انتخاب کن:</h2>
        <div class="score-badge" id="menuScore">امتیاز کل: 0</div>
        <div id="levelButtonsContainer"></div>
        <button class="b" style="background:#e67e22" onclick="showFinalReport()">مشاهده کارنامه کل 📜</button>
        <button class="b" style="background:#95a5a6" onclick="goMenu()">بازگشت به منو 🔙</button>
    </div>

    <div id="sc-game" class="hidden">
        <button class="b" style="background:#95a5a6; padding:8px; font-size:14px; margin-bottom:10px" onclick="goMenu()">🔙 بازگشت به منو</button>
        <div class="stats-bar">
            <span id="gameLevel">...</span><span id="gameQNum">سوال 1/1</span><span id="gameScore" class="sc-score">امتیاز: 0</span><span id="gameCorrect" class="sc-correct">✅ 0</span><span id="gameWrong" class="sc-wrong">❌ 0</span>
        </div>
        <div id="instructionBox" class="instruction-box hidden"></div>
        <div id="q">...</div>
        <div id="options"></div>
        <div id="f"></div>
        <div id="math-alert" class="math-alert"></div>
        <button id="n" class="b" onclick="nextQ()">سؤال بعدی ⏭️</button>
    </div>

    <div id="sc-level-end" class="hidden">
        <div style="font-size:50px">🎉</div>
        <h2>پایان مرحله <span id="endLevelNum"></span></h2>
        <div class="report">
            <p style="font-size:12px;color:#7f8c8d;margin-bottom:10px" id="levelEndDate"></p>
            <p id="levelEncouragement"></p>
            <p>✅ صحیح: <span id="endCorrect"></span> | ❌ غلط: <span id="endWrong"></span></p>
            <p>از کل <span id="endTotalQ"></span> سوال | درصد موفقیت: <b><span id="endPercent"></span>%</b></p>
            <p>امتیاز این مرحله: <b id="endScore"></b></p>
            <div id="global-alert" class="math-alert"></div>
        </div>
        <button class="b" id="btn-next-level" onclick="goNextLevel()">رفتن به مرحله بعد 🚀</button>
        <button class="b" id="btn-replay" style="background:#95a5a6" onclick="replayLevel()">بازی مجدد این مرحله 🔄</button>
        <button class="b" style="background:#95a5a6" onclick="goMenu()">بازگشت به منو 🔙</button>
        <button class="b pdf-btn" id="btn-pdf-level" onclick="printPDF('level')">دریافت کارنامه مرحله 📄</button>
        <button class="b" style="background:#e67e22" id="btn-final-report" onclick="showFinalReport()">مشاهده کارنامه کل 📜</button>
    </div>

    <div id="sc-report" class="hidden">
        <div style="font-size:50px">🏆</div>
        <h2>کارنامه نهایی</h2>
        <div class="report" id="reportText"></div>
        <button class="b code-btn ${isSmart ? '' : 'hidden'}" id="btn-result-code" onclick="generateResultCode()">📋 کپی کد نتیجه (برای معلم)</button>
        <button class="b pdf-btn" onclick="printPDF('final')">دریافت کارنامه نهایی 📄</button>
        <button class="b" style="background:#95a5a6" onclick="location.reload()">بازی مجدد از ابتدا 🔄</button>
    </div>
</div>

<script>
const LEVELS_DATA = ${levelsJson};
const EXAM_TITLE = ${safeTitleJs};
const EXAM_ID = ${examIdJs};
const SECRET_KEY = ${secretKeyJs};
const IS_SMART = ${isSmart};
const CLASS_PROFILE = ${classProfileJson};
const STUDENTS_DATA = ${studentsJson};

const encCorrect = ["آفرین! ادامه بده 💪", "عالی بود! تو نابغه‌ای 🌟", "چه هوش بالایی داری 🧠", "دقیق و درست! 👏", "همینطور ادامه بده 🚀", "تو می‌تونی! 🎯", "پاسخ درست بود! ✨", "کارت درسته! 🏆", "محشر بود! 🌈", "عالی جواب دادی! 🎉"];
const encWrong = ["اشکالی نداره، یاد می‌گیری 🌸", "نزدیک بود! دوباره تلاش کن 💪", "مهم نیست، از اشتباهات یاد می‌گیریم 🌟", "تلاشت قابل تحسینه، ادامه بده 🚀", "کمی دقت کن، دفعه بعد درستش می‌کنی ✨", "پاسخ درست رو بخون و یاد بگیر 📖", "نگران نباش، تمرین باعث پیشرفت میشه 🧩", "دفعه بعد حتماً می‌تونی! 🎯"];

let state = { 
    isOfficial: false, nationalId: "", fName: "", lName: "", classNum: "", school: "", grade: "",
    totalScore: 0, unlocked: 1, level: 0, idx: 0, qs: [], answered: false, levelScore: 0, levelCorrect: 0, levelWrong: 0, examHistory: []
};
let levelStats = {}; 
const $ = id => document.getElementById(id);
const show = id => $(id).classList.remove("hidden");
const hide = id => $(id).classList.add("hidden");

// ================= توابع رمزنگاری =================
async function deriveKey(password, saltBase64) {
    const enc = new TextEncoder();
    const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
    const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits", "deriveKey"]);
    return await crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
}
async function decryptName(ciphertextBase64, ivBase64, saltBase64, password) {
    try {
        const key = await deriveKey(password, saltBase64);
        const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
        const ciphertext = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0));
        const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, ciphertext);
        return new TextDecoder().decode(decrypted);
    } catch (e) { return null; }
}
async function hmacSign(message, secret) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
    return btoa(String.fromCharCode.apply(null, new Uint8Array(signature)));
}
function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode(parseInt(p1, 16));
    }));
}

// ================= احراز هویت =================
function showLoginForm() { show("officialLoginForm"); }
function hideLoginForm() { hide("officialLoginForm"); }
async function handleOfficialLogin() {
    if (!crypto || !crypto.subtle) {
        alert("خطای امنیتی: مرورگر شما از رمزنگاری پشتیبانی نمی‌کند (یا فایل به صورت محلی باز شده است). لطفاً از مرورگر Chrome و در محیط وب استفاده کنید.");
        return;
    }
    
    const nationalId = $("authNationalId").value.trim(); 
    const password = $("authPassword").value.trim(); 
    const btn = $("btnAuthLogin");
    
    if (nationalId.length !== 10 || password.length !== 4) { alert("کد ملی ۱۰ رقمی و رمز ۴ رقمی وارد کنید."); return; }
    
    btn.innerText = "⏳ در حال بررسی..."; 
    btn.disabled = true;
    
    const studentData = STUDENTS_DATA.find(s => s.nationalId === nationalId);
    if (!studentData) { alert("کد ملی یافت نشد."); btn.innerText = "ورود به بازی ✅"; btn.disabled = false; return; }
    
    const decryptedName = await decryptName(studentData.ciphertext, studentData.iv, studentData.salt, password);
    
    if (decryptedName) {
        state.isOfficial = true; state.nationalId = nationalId;
        const nameParts = decryptedName.split(' '); state.fName = nameParts[0] || ''; state.lName = nameParts.slice(1).join(' ') || '';
        $("fName").value = state.fName; $("lName").value = state.lName;
        if (CLASS_PROFILE) { $("classNum").value = CLASS_PROFILE.name || 'کلاس'; $("school").value = CLASS_PROFILE.schoolName || ''; $("grade").value = CLASS_PROFILE.grade || ''; }
        ["fName", "lName", "classNum", "school", "grade"].forEach(id => { $(id).disabled = true; $(id).classList.add("filled"); });
        $("startBtn").classList.remove("btn-disabled");
        hide("sc-auth"); show("sc-welcome");
    } else { 
        alert("رمز عبور اشتباه است."); 
        btn.innerText = "ورود به بازی ✅"; 
        btn.disabled = false; 
    }
}
function loginAsGuest() { state.isOfficial = false; hide("sc-auth"); show("sc-welcome"); }

// ================= فرم =================
function checkField(id) { let el = $(id); let msgEl = $("msg-" + id); if (el.value.trim().length > 0) { el.classList.remove("error"); el.classList.add("filled"); msgEl.className = "field-msg msg-green"; msgEl.innerText = "ثبت شد"; } else { el.classList.remove("filled"); el.classList.add("error"); msgEl.className = "field-msg msg-red"; msgEl.innerText = "الزامی"; } checkAllFilled(); }
function checkAllFilled() { let isAllFilled = $("fName").value.trim().length > 0 && $("lName").value.trim().length > 0 && $("classNum").value.trim().length > 0 && $("school").value.trim().length > 0 && $("grade").value.trim().length > 0; if (isAllFilled) $("startBtn").classList.remove("btn-disabled"); else $("startBtn").classList.add("btn-disabled"); }
function handleStartClick() { if ($("startBtn").classList.contains("btn-disabled")) { alert("همه فیلدها را پر کنید."); return; } state.fName = $("fName").value.trim(); state.lName = $("lName").value.trim(); state.classNum = $("classNum").value.trim(); state.school = $("school").value.trim(); state.grade = $("grade").value.trim(); playSound('welcome'); showConfetti(); updateMenu(); hide("sc-welcome"); show("sc-menu"); }

// ================= بازی =================
function getPersianDate() { return new Date().toLocaleDateString('fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
let audioCtx;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playTone(freq, type, duration) { if (!audioCtx) return; const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = type; osc.frequency.value = freq; gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration); osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + duration); }
function playSound(type) { initAudio(); if (type === 'correct') { playTone(600, 'sine', 0.1); setTimeout(() => playTone(800, 'sine', 0.15), 100); } else if (type === 'wrong') { playTone(200, 'sawtooth', 0.3); } else if (type === 'win') { playTone(400, 'sine', 0.1); setTimeout(() => playTone(500, 'sine', 0.1), 100); setTimeout(() => playTone(600, 'sine', 0.1), 200); setTimeout(() => playTone(800, 'sine', 0.4), 300); } else if (type === 'fail') { playTone(300, 'sawtooth', 0.2); setTimeout(() => playTone(200, 'sawtooth', 0.3), 200); } }
function showConfetti(isFail = false) { const emojis = isFail ? ['❌','💔','⚠️','💥'] : ['🌸','🌺','🌟','🎉','✨']; for(let i=0; i<30; i++) { let el = document.createElement('div'); el.className = 'flower'; el.innerText = emojis[Math.floor(Math.random()*emojis.length)]; el.style.left = Math.random() * 100 + 'vw'; el.style.animationDuration = (Math.random() * 1.5 + 1.5) + 's'; el.style.fontSize = (Math.random() * 20 + 15) + 'px'; if(isFail) el.style.filter = "grayscale(80%)"; document.body.appendChild(el); setTimeout(() => el.remove(), 3000); } }

function updateMenu() {
    $("menuScore").innerText = "امتیاز کل: " + state.totalScore; const container = $("levelButtonsContainer"); container.innerHTML = "";
    LEVELS_DATA.forEach((lvl, index) => {
        const lvlNum = index + 1; let btn = document.createElement("button"); btn.className = "b"; let statusText = ""; let isLocked = false;
        if (levelStats[lvlNum] && levelStats[lvlNum].percent === 100) statusText = "✅ " + lvl.name;
        else if (index > 0 && (!levelStats[index] || !levelStats[index].passed)) { statusText = "🔒 " + lvl.name; isLocked = true; }
        else statusText = "🔓 " + lvl.name;
        btn.innerText = statusText; btn.onclick = () => startLevel(lvlNum);
        if (isLocked) { btn.style.background = "#bdc3c7"; btn.style.cursor = "not-allowed"; }
        container.appendChild(btn);
    });
}
function goMenu() { updateMenu(); hide("sc-game"); hide("sc-level-end"); hide("sc-report"); show("sc-menu"); }
function updateLiveStats() { $("gameLevel").innerText = LEVELS_DATA[state.level - 1].name; $("gameQNum").innerText = "سوال " + (state.idx + 1) + "/" + state.qs.length; $("gameScore").innerText = "امتیاز: " + state.totalScore; $("gameCorrect").innerText = "✅ " + state.levelCorrect; $("gameWrong").innerText = "❌ " + state.levelWrong; }
function startLevel(lvl) {
    const lvlIndex = lvl - 1;
    if (lvlIndex > 0 && (!levelStats[lvlIndex] || !levelStats[lvlIndex].passed)) { alert("قفل است."); return; }
    if (levelStats[lvl] && levelStats[lvl].percent === 100) { alert("پاس شده."); return; }
    if (levelStats[lvl]) state.totalScore -= levelStats[lvl].score;
    state.level = lvl; state.idx = 0; state.levelScore = 0; state.levelCorrect = 0; state.levelWrong = 0; state.qs = [...LEVELS_DATA[lvlIndex].questions].sort(() => Math.random() - 0.5);
    hide("sc-menu"); hide("sc-level-end"); show("sc-game"); $("math-alert").style.display = "none";
    $("instructionBox").innerText = "به مرحله " + lvl + " خوش آمدی!"; $("instructionBox").classList.remove("hidden");
    updateLiveStats(); loadQ();
}
function loadQ() {
    state.answered = false; $("f").innerText = ""; $("n").style.display = "none"; $("n").innerText = (state.idx === state.qs.length - 1) ? "پایان مرحله 🏁" : "سؤال بعدی ⏭️"; $("n").onclick = nextQ;
    const q = state.qs[state.idx]; $("q").innerText = q.text; $("options").innerHTML = ""; updateLiveStats();
    if (q.type === 'multiple-choice') {
        let opts = [...q.options].sort(() => Math.random() - 0.5);
        opts.forEach(opt => { let btn = document.createElement("button"); btn.className = "o"; btn.innerText = opt; btn.onclick = () => checkAns(btn, opt, q.correctText); $("options").appendChild(btn); });
    } else if (q.type === 'true-false') {
        let trueBtn = document.createElement("button"); trueBtn.className = "o"; trueBtn.innerText = "درست ✅"; trueBtn.onclick = () => checkAns(trueBtn, 'درست', q.correctText);
        let falseBtn = document.createElement("button"); falseBtn.className = "o"; falseBtn.innerText = "غلط ❌"; falseBtn.onclick = () => checkAns(falseBtn, 'غلط', q.correctText);
        $("options").appendChild(trueBtn); $("options").appendChild(falseBtn);
    } else {
        let input = document.createElement("input"); input.type = "text"; input.className = "o"; input.placeholder = "پاسخ خود را بنویسید..."; input.style.textAlign = "center"; input.id = "textInput";
        let submitBtn = document.createElement("button"); submitBtn.className = "b"; submitBtn.innerText = "ثبت پاسخ"; submitBtn.style.marginTop = "10px"; submitBtn.onclick = () => checkAns(input, input.value, q.correctText);
        $("options").appendChild(input); $("options").appendChild(submitBtn);
    }
}
function normalizeText(str) { if (!str) return ''; return str.toString().trim().toLowerCase().replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\s+/g, ' '); }
function checkAns(btnElement, chosen, correct) {
    if (state.answered) return; state.answered = true; $("options").querySelectorAll(".o").forEach(b => b.disabled = true); let submitBtn = $("options").querySelector("button.b"); if (submitBtn) submitBtn.disabled = true;
    let isCorrect = false; let correctText = correct;
    if (btnElement && btnElement.tagName === 'BUTTON') isCorrect = (chosen === correctText);
    else isCorrect = (normalizeText(chosen) !== '' && normalizeText(chosen) === normalizeText(correct));
    if (IS_SMART) state.examHistory.push({ qIndex: state.idx, questionText: state.qs[state.idx].text, userAnswer: chosen || '(بدون پاسخ)', correctAnswer: correctText, isCorrect: isCorrect });
    if (isCorrect) {
        if (btnElement && btnElement.tagName === 'BUTTON') btnElement.classList.add("correct"); 
        const earnedScore = state.qs[state.idx].score || 10; state.levelScore += earnedScore; state.totalScore += earnedScore; state.levelCorrect++;
        playSound('correct'); showConfetti(false); $("f").style.color = "#27ae60"; $("f").innerText = encCorrect[Math.floor(Math.random() * encCorrect.length)];
    } else {
        if (btnElement && btnElement.tagName === 'BUTTON') btnElement.classList.add("wrong"); state.levelWrong++; playSound('wrong');
        $("options").querySelectorAll(".o").forEach(b => { if (b.innerText === correct) b.classList.add("correct"); });
        let wrongMsg = encWrong[Math.floor(Math.random() * encWrong.length)]; $("f").style.color = "#e74c3c"; $("f").innerHTML = '<span style="color:#e74c3c">' + wrongMsg + '</span><br>پاسخ صحیح: <span style="color:#27ae60">' + correctText + '</span>';
    }
    updateLiveStats(); $("n").style.display = "block";
    if (state.idx === state.qs.length - 1) { $("n").style.display = "none"; setTimeout(() => { nextQ(); }, 1500); } 
    else {
        let remaining = state.qs.length - (state.idx + 1); let passMark = Math.floor(state.qs.length / 2) + 1;
        if (state.levelCorrect + remaining < passMark) { let mathAlert = $("math-alert"); mathAlert.innerHTML = '❌ امکان قبولی نیست.'; mathAlert.style.display = "block"; $("n").innerText = "تلاش مجدد 🔄"; $("n").onclick = replayLevel; }
    }
}
function nextQ() { state.idx++; if (state.idx < state.qs.length) loadQ(); else endLevel(); }
function endLevel() {
    hide("sc-game"); show("sc-level-end"); let qCount = state.qs.length; let percent = Math.round((state.levelCorrect / qCount) * 100); let passMark = Math.floor(qCount / 2) + 1; let isPassed = state.levelCorrect >= passMark;
    levelStats[state.level] = { name: LEVELS_DATA[state.level - 1].name, qCount: qCount, correct: state.levelCorrect, wrong: state.levelWrong, score: state.levelScore, percent: percent, passed: isPassed };
    $("endLevelNum").innerText = LEVELS_DATA[state.level - 1].name; $("levelEndDate").innerText = "تاریخ: " + getPersianDate(); $("endCorrect").innerText = state.levelCorrect; $("endWrong").innerText = state.levelWrong; $("endTotalQ").innerText = qCount; $("endPercent").innerText = percent; $("endScore").innerText = state.levelScore; $("btn-pdf-level").innerText = "دریافت کارنامه مرحله " + state.level + " 📄";
    if (isPassed) { playSound('win'); showConfetti(); $("levelEncouragement").innerHTML = '<span class="pass-msg">🎉 تبریک! شما در این مرحله قبول شدید.</span>'; $("btn-pdf-level").style.display = "block"; } 
    else { playSound('fail'); showConfetti(true); $("levelEncouragement").innerHTML = '<span class="fail-msg">❌ شرط قبولی رو نتونستی کسب کنی.<br><span style="font-size:12px;color:#555">(حداقل: ' + passMark + ' سوال)</span></span>'; $("btn-pdf-level").style.display = "none"; }
    $("btn-replay").style.display = (state.levelCorrect === qCount) ? "none" : "block"; $("btn-next-level").style.display = (isPassed && state.level < LEVELS_DATA.length) ? "block" : "none"; $("btn-final-report").style.display = (state.level === LEVELS_DATA.length) ? "block" : "none";
}
function replayLevel() { startLevel(state.level); }
function goNextLevel() { startLevel(state.level + 1); }
function showFinalReport() {
    if (Object.keys(levelStats).length === 0) { alert("هنوز مرحله‌ای بازی نکرده‌اید."); return; }
    hide("sc-menu"); hide("sc-level-end"); show("sc-report"); let tScore = 0, tCorrect = 0, tWrong = 0, tQ = 0; let table = '<div class="table-wrap"><table><tr><th>مرحله</th><th>امتیاز</th><th>درست</th><th>غلط</th><th>کل سوال</th><th>درصد</th><th>وضعیت</th></tr>';
    for(let i = 1; i <= LEVELS_DATA.length; i++) { let s = levelStats[i]; if (s) { tScore += s.score; tCorrect += s.correct; tWrong += s.wrong; tQ += s.qCount; let status = s.passed ? '<span style="color:#27ae60">قبول</span>' : '<span style="color:#e74c3c">نیاز به تلاش</span>'; table += '<tr><td>' + s.name + '</td><td>' + s.score + '</td><td>' + s.correct + '</td><td>' + s.wrong + '</td><td>' + s.qCount + '</td><td>' + s.percent + '%</td><td>' + status + '</td></tr>'; } else { table += '<tr><td>' + LEVELS_DATA[i-1].name + '</td><td colspan="6" style="color:#999">انجام نشده</td></tr>'; } }
    table += '</table></div>'; let tPercent = tQ > 0 ? Math.round((tCorrect / tQ) * 100) : 0; let allLevelsPassed = Object.values(levelStats).length === LEVELS_DATA.length && Object.values(levelStats).every(s => s.passed);
    let finalMsg = allLevelsPassed ? '<span class="pass-msg">🏆 تبریک! شما در کل بازی قبول شدید.</span>' : '<span class="fail-msg">❌ متاسفانه در برخی مراحل قبول نشدید.</span>';
    $("reportText").innerHTML = '<p style="font-size:18px;color:#2980b9;text-align:center"><b>' + state.fName + ' ' + state.lName + ' عزیز</b> 🌺</p><p style="font-size:12px;color:#7f8c8d;margin-bottom:10px;text-align:center">تاریخ: ' + getPersianDate() + '</p>' + table + '<div style="margin-top:15px;padding-top:10px;border-top:2px solid #bdc3c7;font-weight:bold"><p>مجموع امتیاز: ' + tScore + '</p><p>از کل ' + tQ + ' سوال | درصد موفقیت: <span style="color:#2980b9">' + tPercent + '%</span></p></div>' + '<div style="margin-top:15px;font-weight:bold">' + finalMsg + '</div>';
}

// ================= تولید کد نتیجه امن =================
async function generateResultCode() {
    if (!IS_SMART) return;
    const btn = $("btn-result-code"); btn.innerText = "⏳ در حال تولید کد..."; btn.disabled = true;
    try {
        if (!crypto || !crypto.subtle) throw new Error("مرورگر شما از Web Crypto API پشتیبانی نمی‌کند.");
        const payload = { examId: EXAM_ID, examTitle: EXAM_TITLE, studentNationalId: state.nationalId, studentName: state.fName, studentLastName: state.lName, classNum: state.classNum, school: state.school, grade: state.grade, totalScore: state.totalScore, history: state.examHistory, timestamp: Date.now() };
        const payloadString = JSON.stringify(payload);
        const signature = await hmacSign(payloadString, SECRET_KEY);
        const finalPayload = JSON.stringify({ p: payloadString, s: signature });
        const base64Payload = b64EncodeUnicode(finalPayload);
        const finalCode = "KOSHA-" + base64Payload;
        
        let copySuccess = false;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(finalCode);
                copySuccess = true;
            }
        } catch (err) { console.warn("Clipboard API failed, trying fallback...", err); }

        if (!copySuccess) {
            try {
                const ta = document.createElement("textarea");
                ta.value = finalCode; ta.style.position = "fixed"; ta.style.opacity = "0";
                document.body.appendChild(ta); ta.focus(); ta.select();
                copySuccess = document.execCommand('copy');
                document.body.removeChild(ta);
            } catch (err) { console.warn("Fallback copy failed", err); }
        }

        if (copySuccess) { alert("✅ کد نتیجه با موفقیت کپی شد!"); } 
        else { prompt("⚠️ کپی خودکار مسدود شد. لطفاً متن زیر را کپی کنید:", finalCode); }
    } catch (e) { console.error(e); alert("خطا در تولید کد نتیجه: " + e.message); } 
    finally { btn.innerText = "📋 کپی کد نتیجه (برای معلم)"; btn.disabled = false; }
}

// ================= چاپ =================
function printPDF(type) {
    let title = type === 'level' ? ('کارنامه مرحله ' + LEVELS_DATA[state.level - 1].name) : 'کارنامه نهایی بازی'; let content = "";
    if (type === 'level') { let s = levelStats[state.level]; content = '<div style="overflow-x: auto; width: 100%;"><table><tr><th>نام مرحله</th><th>امتیاز</th><th>درست</th><th>غلط</th><th>کل سوال</th><th>درصد</th><th>وضعیت</th></tr><tr><td>' + s.name + '</td><td>' + s.score + '</td><td>' + s.correct + '</td><td>' + s.wrong + '</td><td>' + s.qCount + '</td><td>' + s.percent + '%</td><td>' + (s.passed ? 'قبول' : 'نیاز به تلاش') + '</td></tr></table></div><p style="margin-top:20px; font-weight:bold;">تبریک!</p>'; } 
    else { let tScore = 0, tCorrect = 0, tWrong = 0, tQ = 0; let tableHtml = '<div style="overflow-x: auto; width: 100%;"><table><tr><th>مرحله</th><th>امتیاز</th><th>درست</th><th>غلط</th><th>کل سوال</th><th>درصد</th><th>وضعیت</th></tr>'; for(let i = 1; i <= LEVELS_DATA.length; i++) { let s = levelStats[i]; if (s) { tScore += s.score; tCorrect += s.correct; tWrong += s.wrong; tQ += s.qCount; tableHtml += '<tr><td>' + s.name + '</td><td>' + s.score + '</td><td>' + s.correct + '</td><td>' + s.wrong + '</td><td>' + s.qCount + '</td><td>' + s.percent + '%</td><td>' + (s.passed ? 'قبول' : 'نیاز به تلاش') + '</td></tr>'; } } tableHtml += '</table></div>'; let tPercent = tQ > 0 ? Math.round((tCorrect / tQ) * 100) : 0; let tPassed = Object.values(levelStats).length === LEVELS_DATA.length && Object.values(levelStats).every(s => s.passed); content = tableHtml + '<div style="margin-top:15px; padding-top:10px; border-top:2px solid #000; font-weight:bold;"><p>مجموع امتیاز: ' + tScore + '</p><p>از کل ' + tQ + ' سوال | درصد: ' + tPercent + '%</p></div><p style="margin-top:20px; font-weight:bold; color:' + (tPassed ? '#27ae60' : '#e74c3c') + ';">' + (tPassed ? 'تبریک!' : 'شرط قبولی را کسب نکردید.') + '</p>'; }
    let printWin = window.open('', '_blank'); let htmlContent = '<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="UTF-8"><title>' + title + '</title><style>body { font-family: Tahoma, sans-serif; direction: rtl; padding: 30px; text-align: center; } .header { border-bottom: 3px double #2980b9; padding-bottom: 20px; margin-bottom: 20px; } h1 { color: #2c3e50; } h2 { color: #3498db; } .info { background: #f8f9fa; border: 1px solid #ddd; padding: 15px; border-radius: 8px; display: inline-block; margin-bottom: 20px; text-align: right; } .info span { font-weight: bold; color: #2980b9; margin-left: 10px; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border: 1px solid #000; padding: 10px; text-align: center; } th { background: #ecf0f1; } .footer { margin-top: 40px; font-size: 13px; color: #7f8c8d; }</style></head><body><div class="header"><h1>🎮 ' + EXAM_TITLE + '</h1><h2>' + title + '</h2></div><div class="info"><div><span>نام:</span> ' + state.fName + '</div><div><span>نام خانوادگی:</span> ' + state.lName + '</div><div><span>کلاس:</span> ' + state.classNum + '</div><div><span>مدرسه:</span> ' + state.school + '</div><div><span>پایه:</span> ' + state.grade + '</div></div>' + content + '<div class="footer"><p>' + getPersianDate() + '</p></div><script>window.onload = function() { setTimeout(function() { window.print(); }, 500); }<\\/script></body></html>'; printWin.document.write(htmlContent); printWin.document.close();
}
document.addEventListener("DOMContentLoaded", () => { $("welcomeDate").innerText = getPersianDate(); });
</script>
</body>
</html>`;
    return html;
}