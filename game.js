// ==========================================
// فایل game.js — منطق تولید فایل بازی آزمون (آفلاین)
// نسخه اصلاح‌شده: رفع کامل باگ تگ اسکریپت و دکمه سوال بعدی
// ==========================================

async function generateGameFile(examId) {
    const exam = await getDataById('exams', examId);
    if (!exam) {
        showToast('آزمون یافت نشد.', 'error');
        return;
    }
    
    if (!exam.questions || exam.questions.length === 0) {
        showToast('این آزمون هیچ سوالی ندارد. ابتدا سوالات را اضافه کنید.', 'error');
        return;
    }
    
    const sub = window.allSubjectsData.find(s => s.id === exam.subjectId);
    const subName = sub ? `${sub.symbol || ''} ${sub.name}` : 'بدون درس';
    
    // تبدیل سوالات به فرمت استاندارد بازی
    const gameQuestions = [];
    exam.questions.forEach((q, index) => {
        if (q.type === 'matching' && q.pairs && q.pairs.length > 0) {
            q.pairs.forEach((pair, pIndex) => {
                let options = [pair.b, ...q.pairs.filter((_, i) => i !== pIndex).map(p => p.b)];
                options = options.sort(() => Math.random() - 0.5);
                const correctIndex = options.indexOf(pair.b);
                const distributedScore = Math.round((q.score / q.pairs.length) * 100) / 100;

                gameQuestions.push({
                    type: 'multiple-choice',
                    text: `مفهوم «${pair.a}» با کدام گزینه تطبیق دارد؟ ${q.text ? '(' + q.text + ')' : ''}`,
                    options: options,
                    score: distributedScore,
                    correctIndex: correctIndex
                });
            });
        } else {
            const safeQuestion = {
                type: q.type === 'essay' ? 'fill-blank' : q.type,
                text: q.text,
                score: q.score
            };
            
            if (q.type === 'multiple-choice') {
                safeQuestion.options = q.options;
                safeQuestion.correctIndex = q.correctIndex;
            } else if (q.type === 'true-false') {
                safeQuestion.correctAnswer = q.correctAnswer;
            } else {
                safeQuestion.answer = q.answer || '';
            }
            
            gameQuestions.push(safeQuestion);
        }
    });
    
    // محاسبه نمره کل
    let totalMaxScore = 0;
    gameQuestions.forEach(q => totalMaxScore += q.score);
    
    const gameHtml = buildGameHtml(exam, subName, gameQuestions, totalMaxScore);
    
    const blob = new Blob([gameHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `بازی_آزمون_${exam.title.replace(/\s+/g, '_')}_${exam.date.replace(/\//g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('فایل بازی با موفقیت تولید و دانلود شد! 🎮', 'success');
}

function buildGameHtml(exam, subName, gameQuestions, totalMaxScore) {
    const jsonSafe = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');
    const questionsJson = jsonSafe(gameQuestions);
    const safeTitleJs = jsonSafe(exam.title);
    
    // امن‌سازی داده‌های ورودی برای جلوگیری از شکستن رشته
    const safeExamTitleHtml = escapeHtml(exam.title);
    const safeSubNameHtml = escapeHtml(subName);
    const safeDateHtml = escapeHtml(exam.date);

    return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🎮 بازی آزمون: ${safeExamTitleHtml}</title>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;font-family:'Vazirmatn',Tahoma,sans-serif}
body{background:#f0f4f8;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;padding:15px;overflow-x:hidden;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);}
.c{background:#fff;padding:20px;border-radius:15px;box-shadow:0 5px 15px rgba(0,0,0,.2);width:100%;max-width:600px;text-align:center;position:relative;z-index:10}
h1{color:#2c3e50;font-size:22px;margin-bottom:10px}
h2{color:#34495e;font-size:18px;margin-bottom:15px}
.info{background:#e8f4f8;padding:10px;border-radius:8px;font-size:13px;color:#2980b9;margin-bottom:15px;line-height:1.6}
.date-box{background:#fff;border:1px solid #bdc3c7;border-radius:8px;padding:5px 15px;font-size:12px;color:#7f8c8d;margin-bottom:15px;display:inline-block;}
.input-group { margin-bottom: 5px; text-align: right; }
input{width:100%;padding:10px;border:2px solid #bdc3c7;border-radius:8px;font-size:14px;text-align:center;outline:none; transition: 0.3s; background: #fff; font-family: inherit;}
input:focus{border-color:#3498db}
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
.math-alert{color:#e74c3c;background:#fdeaea;padding:8px;border-radius:5px;margin-top:10px;font-size:13px;border:1px solid #e74c3c; display: none;}
.flower{position:fixed;top:-50px;font-size:24px;z-index:999;pointer-events:none;animation:fall 2.5s linear forwards}
@keyframes fall{to{transform:translateY(100vh) rotate(360deg);opacity:0}}
.pdf-btn{background:#e74c3c !important;}
.pdf-btn:hover{background:#c0392b !important;}
</style>
</head>
<body>
<div class="c">
    <div id="sc-welcome">
        <div style="font-size:50px">🎮</div>
        <h1>${safeExamTitleHtml}</h1>
        <p style="color:#7f8c8d;font-size:14px">سلام قهرمان! آماده‌ای این آزمون رو با موفقیت پشت سر بذاری؟</p>
        <div class="info">📚 <b>درس:</b> ${safeSubNameHtml} | 📅 <b>تاریخ:</b> ${safeDateHtml}</div>
        <div class="date-box" id="welcomeDate"></div>

        <form onsubmit="event.preventDefault(); handleStartClick();">
            <div class="input-group">
                <input type="text" id="fName" placeholder="نام..." oninput="checkField('fName')" onblur="checkField('fName')">
                <span id="msg-fName" class="field-msg"></span>
            </div>
            <div class="input-group">
                <input type="text" id="lName" placeholder="نام خانوادگی..." oninput="checkField('lName')" onblur="checkField('lName')">
                <span id="msg-lName" class="field-msg"></span>
            </div>
            <div class="input-group">
                <input type="text" id="classNum" placeholder="کلاس..." oninput="checkField('classNum')" onblur="checkField('classNum')">
                <span id="msg-classNum" class="field-msg"></span>
            </div>
            <div class="input-group">
                <input type="text" id="school" placeholder="مدرسه..." oninput="checkField('school')" onblur="checkField('school')">
                <span id="msg-school" class="field-msg"></span>
            </div>
            <button type="submit" class="b btn-disabled" id="startBtn">شروع آزمون 🚀</button>
        </form>
    </div>

    <div id="sc-menu" class="hidden">
        <h2>مسیر خود را انتخاب کن:</h2>
        <div class="score-badge" id="menuScore">امتیاز کل: 0</div>
        <div id="levelButtonsContainer"></div>
        <button class="b" style="background:#e67e22" onclick="showFinalReport()">مشاهده کارنامه کل 📜</button>
        <button class="b" style="background:#95a5a6" onclick="goWelcome()">بازگشت به صفحه اول 🔙</button>
    </div>

    <div id="sc-game" class="hidden">
        <button class="b" style="background:#95a5a6; padding:8px; font-size:14px; margin-bottom:10px" onclick="goMenu()">🔙 بازگشت به منو</button>
        <div class="stats-bar">
            <span id="gameLevel">...</span>
            <span id="gameQNum">سوال 1/1</span>
            <span id="gameScore" class="sc-score">امتیاز: 0</span>
            <span id="gameCorrect" class="sc-correct">✅ 0</span>
            <span id="gameWrong" class="sc-wrong">❌ 0</span>
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
            <div id="global-alert" class="math-alert" style="display:none;"></div>
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
        <button class="b pdf-btn" onclick="printPDF('final')">دریافت کارنامه نهایی 📄</button>
        <button class="b" style="background:#95a5a6" onclick="goMenu()">بازگشت به منو 🔙</button>
        <button class="b" onclick="location.reload()">بازی مجدد از ابتدا 🔄</button>
    </div>
</div>

<script>
const ALL_QUESTIONS = ${questionsJson};
const EXAM_TITLE = ${safeTitleJs};
const TOTAL_MAX_SCORE = ${totalMaxScore};

const encCorrect = ["آفرین! ادامه بده 💪", "عالی بود! تو نابغه‌ای 🌟", "چه هوش بالایی داری 🧠", "دقیق و درست! 👏", "همینطور ادامه بده 🚀", "تو می‌تونی! 🎯", "پاسخ درست بود! ✨", "کارت درسته! 🏆", "محشر بود! 🌈", "عالی جواب دادی! 🎉"];
const encWrong = ["اشکالی نداره، یاد می‌گیری 🌸", "نزدیک بود! دوباره تلاش کن 💪", "مهم نیست، از اشتباهات یاد می‌گیریم 🌟", "تلاشت قابل تحسینه، ادامه بده 🚀", "کمی دقت کن، دفعه بعد درستش می‌کنی ✨", "پاسخ درست رو بخون و یاد بگیر 📖", "نگران نباش، تمرین باعث پیشرفت میشه 🧩", "دفعه بعد حتماً می‌تونی! 🎯"];

const alertMsgs = {
    missingFields: ["🌸 قهرمان کوچک! برای ورود، ابتدا باید تمام مشخصات خود را کامل بنویسی.", "🌟 عزیزم، لطفاً نام، نام خانوادگی، کلاس و مدرسه‌ات را بنویس.", "📝 برای شروع، ابتدا فرم مشخصات را به طور کامل پر کن."],
    lockedLevel: ["🔒 این مرحله هنوز قفل است! ابتدا باید مرحله قبلی را با موفقیت پشت سر بگذاری.", "🚧 برای باز کردن این مرحله، باید مرحله قبل رو پاس کنی."],
    alreadyPassed: ["✅ شما این مرحله را با نمره کامل پاس کرده‌اید و نیازی به بازی مجدد نیست.", "🏆 تو این مرحله رو عالی تموم کردی! نیازی به تکرارش نیست."],
    noReport: ["📜 شما هنوز هیچ مرحله‌ای را بازی نکرده‌اید! ابتدا باید حداقل یک مرحله را بازی کنید.", "📝 کارنامه‌ای وجود ندارد! برای دیدن کارنامه، ابتدا باید بازی کنی."],
    levelPassed: ["🎉 تبریک! تو این مرحله رو با موفقیت پشت سر گذاشتی!", "🏆 عالی بود! مرحله با موفقیت تموم شد."],
    gamePassed: ["🏆 تبریک! تو کل بازی رو با موفقیت پشت سر گذاشتی!", "🎉 آفرین! تونستی تمام مراحل رو پاس کنی."]
};

function getRandomAlert(type) {
    let arr = alertMsgs[type];
    return arr[Math.floor(Math.random() * arr.length)];
}

const msgs = {
    fName: { ok: ["چه اسم زیبایی داری 🌟", "اسمت مثل گل می‌مونه 🌸"], err: ["نامت را ننوشتی گلم 🌸", "اسم زیبایت را اینجا بنویس ✍️"] },
    lName: { ok: ["چه نام خانوادگی قشنگی 🥰", "چه نام خانوادگی باکلاسی 👑"], err: ["نام خانوادگی تو ننوشتی گلم 🌸", "نام خانوادگی‌ات را بنویس لطفاً 🖊️"] },
    classNum: { ok: ["چه کلاس فعالی داری 🎒", "چه کلاس باحالی داری 🏫"], err: ["کلاس چندمی؟ بنویس 🌸", "داخل کدام کلاس می‌نشینی؟ 🏫"] },
    school: { ok: ["چه مدرسه خوبی 🏫", "چه مدرسه باحالی 🏰"], err: ["اسم مدرسه‌ات را بنویس 🌸", "در کدام مدرسه درس می‌خوانی؟ 🏫"] }
};

let levelsData = [];
let state = { fName:"", lName:"", classNum:"", school:"", totalScore: 0, unlocked: 1, level: 0, idx: 0, qs: [], answered: false, levelScore: 0, levelCorrect: 0, levelWrong: 0 };
let levelStats = {}; 

const $ = id => document.getElementById(id);
const show = id => $(id).classList.remove("hidden");
const hide = id => $(id).classList.add("hidden");

function getRandomMsg(type, id) {
    let arr = msgs[id][type];
    return arr[Math.floor(Math.random() * arr.length)];
}

function getPersianDate() {
    let options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('fa-IR', options);
}

function prepareLevels() {
    const MAX_LEVELS = 3;
    if (ALL_QUESTIONS.length <= 4) {
        levelsData = [{ name: "۱. مرحله اصلی", questions: ALL_QUESTIONS }];
    } else {
        const chunkSize = Math.ceil(ALL_QUESTIONS.length / MAX_LEVELS);
        let lvlNum = 1;
        for (let i = 0; i < MAX_LEVELS; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, ALL_QUESTIONS.length);
            if (start < ALL_QUESTIONS.length) {
                levelsData.push({ name: "مرحله " + lvlNum++, questions: ALL_QUESTIONS.slice(start, end) });
            }
        }
    }
}

document.addEventListener("DOMContentLoaded", () => { 
    $("welcomeDate").innerText = getPersianDate(); 
    prepareLevels();
});

function checkField(id) {
    let el = $(id);
    let val = el.value.trim();
    let msgEl = $("msg-" + id);
    if (val.length > 0) {
        el.classList.remove("error"); el.classList.add("filled");
        msgEl.className = "field-msg msg-green"; msgEl.innerText = getRandomMsg('ok', id);
    } else {
        el.classList.remove("filled"); el.classList.add("error");
        msgEl.className = "field-msg msg-red"; msgEl.innerText = getRandomMsg('err', id);
    }
    checkAllFilled();
}

function checkAllFilled() {
    let isAllFilled = $("fName").value.trim().length > 0 && $("lName").value.trim().length > 0 && $("classNum").value.trim().length > 0 && $("school").value.trim().length > 0;
    if (isAllFilled) { $("startBtn").classList.remove("btn-disabled"); } 
    else { $("startBtn").classList.add("btn-disabled"); }
}

function handleStartClick() {
    let isAllFilled = $("fName").value.trim().length > 0 && $("lName").value.trim().length > 0 && $("classNum").value.trim().length > 0 && $("school").value.trim().length > 0;
    if (!isAllFilled) {
        alert(getRandomAlert('missingFields'));
        ['fName', 'lName', 'classNum', 'school'].forEach(id => checkField(id));
        playSound('wrong');
    } else { startGame(); }
}

function goWelcome() { hide("sc-menu"); show("sc-welcome"); }

let audioCtx;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playTone(freq, type, duration) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + duration);
}
function playSound(type) {
    initAudio();
    if (type === 'correct') { playTone(600, 'sine', 0.1); setTimeout(() => playTone(800, 'sine', 0.15), 100); }
    else if (type === 'wrong') { playTone(200, 'sawtooth', 0.3); }
    else if (type === 'welcome') { playTone(400, 'sine', 0.1); setTimeout(() => playTone(600, 'sine', 0.15), 100); setTimeout(() => playTone(800, 'sine', 0.2), 200); }
    else if (type === 'win') { playTone(400, 'sine', 0.1); setTimeout(() => playTone(500, 'sine', 0.1), 100); setTimeout(() => playTone(600, 'sine', 0.1), 200); setTimeout(() => playTone(800, 'sine', 0.4), 300); }
    else if (type === 'fail') { playTone(300, 'sawtooth', 0.2); setTimeout(() => playTone(200, 'sawtooth', 0.3), 200); }
}
function showConfetti(isFail) {
    if (typeof isFail === 'undefined') isFail = false;
    const emojis = isFail ? ['❌','💔','⚠️','💥'] : ['🌸','🌺','🌟','🎉','✨'];
    for(let i=0; i<30; i++) {
        let el = document.createElement('div');
        el.className = 'flower';
        el.innerText = emojis[Math.floor(Math.random()*emojis.length)];
        el.style.left = Math.random() * 100 + 'vw';
        el.style.animationDuration = (Math.random() * 1.5 + 1.5) + 's';
        el.style.fontSize = (Math.random() * 20 + 15) + 'px';
        if(isFail) el.style.filter = "grayscale(80%)";
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }
}

function startGame() {
    state.fName = $("fName").value.trim(); state.lName = $("lName").value.trim();
    state.classNum = $("classNum").value.trim(); state.school = $("school").value.trim();
    playSound('welcome'); showConfetti(); 
    updateMenu(); hide("sc-welcome"); show("sc-menu");
}

function updateMenu() {
    $("menuScore").innerText = "امتیاز کل: " + state.totalScore;
    const container = $("levelButtonsContainer");
    container.innerHTML = "";
    
    levelsData.forEach((lvl, index) => {
        const lvlNum = index + 1;
        let btn = document.createElement("button");
        btn.className = "b";
        
        let statusText = "";
        let isLocked = false;
        
        if (levelStats[lvlNum] && levelStats[lvlNum].percent === 100) {
            statusText = "✅ " + lvl.name;
        } else if (index > 0 && (!levelStats[index] || !levelStats[index].passed)) {
            statusText = "🔒 " + lvl.name;
            isLocked = true;
        } else {
            statusText = "🔓 " + lvl.name;
        }
        
        btn.innerText = statusText;
        btn.onclick = () => startLevel(lvlNum);
        if (isLocked) {
            btn.style.background = "#bdc3c7";
            btn.style.cursor = "not-allowed";
        }
        container.appendChild(btn);
    });
}

function goMenu() {
    $("menuScore").innerText = "امتیاز کل: " + state.totalScore;
    updateMenu(); 
    hide("sc-game"); hide("sc-level-end"); hide("sc-report"); show("sc-menu");
}

function updateLiveStats() {
    $("gameLevel").innerText = levelsData[state.level - 1].name;
    $("gameQNum").innerText = "سوال " + (state.idx + 1) + "/" + state.qs.length;
    $("gameScore").innerText = "امتیاز: " + state.totalScore;
    $("gameCorrect").innerText = "✅ " + state.levelCorrect;
    $("gameWrong").innerText = "❌ " + state.levelWrong;
}

function startLevel(lvl) {
    const lvlIndex = lvl - 1;
    
    if (lvlIndex > 0 && (!levelStats[lvlIndex] || !levelStats[lvlIndex].passed)) {
        alert(getRandomAlert('lockedLevel'));
        playSound('wrong');
        return;
    }
    
    if (levelStats[lvl] && levelStats[lvl].percent === 100) {
        alert(getRandomAlert('alreadyPassed'));
        return;
    }

    if (levelStats[lvl]) {
        state.totalScore -= levelStats[lvl].score;
    }

    state.level = lvl; state.idx = 0; state.levelScore = 0; state.levelCorrect = 0; state.levelWrong = 0;
    state.qs = [...levelsData[lvlIndex].questions].sort(() => Math.random() - 0.5);
    
    hide("sc-menu"); hide("sc-level-end"); show("sc-game");
    $("math-alert").style.display = "none";
    
    $("instructionBox").innerText = "به مرحله " + lvl + " خوش آمدی! به سوالات با دقت پاسخ بده.";
    $("instructionBox").classList.remove("hidden");

    updateLiveStats(); loadQ();
}

function loadQ() {
    state.answered = false; 
    $("f").innerText = ""; 
    $("n").style.display = "none";
    $("n").innerText = (state.idx === state.qs.length - 1) ? "پایان مرحله 🏁" : "سؤال بعدی ⏭️";
    $("n").onclick = nextQ; 
    
    const q = state.qs[state.idx];
    $("q").innerText = q.text; 
    $("options").innerHTML = "";
    updateLiveStats();
    
    if (q.type === 'multiple-choice') {
        let opts = [...q.options].sort(() => Math.random() - 0.5);
        opts.forEach(opt => {
            let btn = document.createElement("button");
            btn.className = "o"; btn.innerText = opt; 
            btn.onclick = () => checkAns(btn, opt, q.options[q.correctIndex], q.text);
            $("options").appendChild(btn);
        });
    } else if (q.type === 'true-false') {
        let trueBtn = document.createElement("button");
        trueBtn.className = "o"; trueBtn.innerText = "درست ✅"; 
        trueBtn.onclick = () => checkAns(trueBtn, true, q.correctAnswer, q.text);
        
        let falseBtn = document.createElement("button");
        falseBtn.className = "o"; falseBtn.innerText = "غلط ❌"; 
        falseBtn.onclick = () => checkAns(falseBtn, false, q.correctAnswer, q.text);
        
        $("options").appendChild(trueBtn);
        $("options").appendChild(falseBtn);
    } else {
        let input = document.createElement("input");
        input.type = "text"; input.className = "o"; input.placeholder = "پاسخ خود را بنویسید..."; input.style.textAlign = "center";
        input.id = "textInput";
        let submitBtn = document.createElement("button");
        submitBtn.className = "b"; submitBtn.innerText = "ثبت پاسخ"; submitBtn.style.marginTop = "10px";
        submitBtn.onclick = () => checkAns(input, input.value, q.answer, q.text);
        
        $("options").appendChild(input);
        $("options").appendChild(submitBtn);
    }
}

function normalizeText(str) {
    if (!str) return '';
    return str.toString().trim().toLowerCase()
        .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
        .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
        .replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\s+/g, ' ');
}

function checkAns(btnElement, chosen, correct, qText) {
    if (state.answered) return;
    state.answered = true;
    
    $("options").querySelectorAll(".o").forEach(b => {
        if (b.tagName === 'BUTTON') b.disabled = true;
        else b.disabled = true;
    });
    let submitBtn = $("options").querySelector("button.b");
    if (submitBtn) submitBtn.disabled = true;

    let isCorrect = false;
    let correctText = correct;

    if (typeof chosen === 'boolean') {
        isCorrect = (chosen === correct);
        correctText = correct ? 'درست' : 'غلط';
    } else {
        let normChosen = normalizeText(chosen);
        let normCorrect = normalizeText(correct);
        isCorrect = (normChosen !== '' && normChosen === normCorrect);
    }
    
    if (btnElement && btnElement.tagName === 'BUTTON' && correctText !== 'درست' && correctText !== 'غلط') {
        isCorrect = (chosen === correct);
    }

    if (isCorrect) {
        btnElement.classList.add("correct"); 
        state.levelScore += 10; state.totalScore += 10; state.levelCorrect++;
        playSound('correct'); showConfetti(false);
        $("f").style.color = "#27ae60"; 
        $("f").innerText = encCorrect[Math.floor(Math.random() * encCorrect.length)];
    } else {
        if (btnElement && btnElement.classList.contains("o")) btnElement.classList.add("wrong"); 
        state.levelWrong++;
        playSound('wrong');
        
        $("options").querySelectorAll(".o").forEach(b => { 
            if (b.innerText === correct || b.value === correct) b.classList.add("correct"); 
        });
        
        let wrongMsg = encWrong[Math.floor(Math.random() * encWrong.length)];
        $("f").style.color = "#e74c3c";
        $("f").innerHTML = '<span style="color:#e74c3c">' + wrongMsg + '</span><br>پاسخ صحیح: <span style="color:#27ae60">' + correctText + '</span>';
    }
    
    updateLiveStats(); 
    $("n").style.display = "block";

    if (state.idx === state.qs.length - 1) {
        $("n").style.display = "none"; 
        setTimeout(() => { nextQ(); }, 1500);
    } else {
        let remaining = state.qs.length - (state.idx + 1);
        let passMark = Math.floor(state.qs.length / 2) + 1;
        if (state.levelCorrect + remaining < passMark) {
            let mathAlert = $("math-alert");
            mathAlert.innerHTML = '❌ متاسفانه از نظر ریاضی امکان قبولی در این مرحله وجود ندارد. باید دوباره تلاش کنید.';
            mathAlert.style.display = "block";
            $("n").innerText = "تلاش مجدد 🔄";
            $("n").onclick = replayLevel;
        }
    }
}

function nextQ() {
    state.idx++;
    if (state.idx < state.qs.length) loadQ(); else endLevel();
}

function endLevel() {
    hide("sc-game"); show("sc-level-end");
    let qCount = state.qs.length;
    let percent = Math.round((state.levelCorrect / qCount) * 100);
    let passMark = Math.floor(qCount / 2) + 1;
    let isPassed = state.levelCorrect >= passMark;
    
    levelStats[state.level] = { name: levelsData[state.level - 1].name, qCount: qCount, correct: state.levelCorrect, wrong: state.levelWrong, score: state.levelScore, percent: percent, passed: isPassed };

    $("endLevelNum").innerText = levelsData[state.level - 1].name;
    $("levelEndDate").innerText = "تاریخ: " + getPersianDate();
    $("endCorrect").innerText = state.levelCorrect;
    $("endWrong").innerText = state.levelWrong;
    $("endTotalQ").innerText = qCount;
    $("endPercent").innerText = percent;
    $("endScore").innerText = state.levelScore;
    
    $("btn-pdf-level").innerText = "دریافت کارنامه مرحله " + state.level + " 📄";

    if (isPassed) {
        playSound('win'); showConfetti(); 
        $("levelEncouragement").innerHTML = '<span class="pass-msg">🎉 تبریک! شما در این مرحله قبول شدید.</span>';
        $("btn-pdf-level").style.display = "block"; 
        setTimeout(() => {
            if (state.level === levelsData.length) { alert(getRandomAlert('gamePassed')); } 
            else { alert(getRandomAlert('levelPassed')); }
        }, 500);
    } else {
        playSound('fail'); showConfetti(true); 
        $("levelEncouragement").innerHTML = '<span class="fail-msg">❌ متاسفانه شرط قبولی رو نتونستی کسب کنی.<br><span style="font-size:12px;color:#555">(حداقل پاسخ صحیح: ' + passMark + ' سوال)</span></span>';
        $("btn-pdf-level").style.display = "none"; 
    }
    
    $("btn-replay").style.display = (state.levelCorrect === qCount) ? "none" : "block";
    $("btn-next-level").style.display = (isPassed && state.level < levelsData.length) ? "block" : "none";
    $("btn-final-report").style.display = (state.level === levelsData.length) ? "block" : "none";
}

function replayLevel() { startLevel(state.level); }
function goNextLevel() { startLevel(state.level + 1); }

function showFinalReport() {
    let hasProgress = Object.keys(levelStats).length > 0;
    if (!hasProgress) {
        alert(getRandomAlert('noReport'));
        playSound('wrong');
        return;
    }

    hide("sc-menu"); hide("sc-level-end"); show("sc-report");
    let tScore = 0, tCorrect = 0, tWrong = 0, tQ = 0;
    let table = '<div class="table-wrap"><table><tr><th>مرحله</th><th>امتیاز</th><th>درست</th><th>غلط</th><th>کل سوال</th><th>درصد</th><th>وضعیت</th></tr>';
    
    for(let i = 1; i <= levelsData.length; i++) {
        let s = levelStats[i];
        if (s) {
            tScore += s.score; tCorrect += s.correct; tWrong += s.wrong; tQ += s.qCount;
            let status = s.passed ? '<span style="color:#27ae60">قبول</span>' : '<span style="color:#e74c3c">نیاز به تلاش</span>';
            table += '<tr><td>' + s.name + '</td><td>' + s.score + '</td><td>' + s.correct + '</td><td>' + s.wrong + '</td><td>' + s.qCount + '</td><td>' + s.percent + '%</td><td>' + status + '</td></tr>';
        } else {
            table += '<tr><td>' + levelsData[i-1].name + '</td><td colspan="6" style="color:#999">انجام نشده</td></tr>';
        }
    }
    table += '</table></div>';
    
    let tPercent = tQ > 0 ? Math.round((tCorrect / tQ) * 100) : 0;
    let tPassMark = Math.floor(ALL_QUESTIONS.length / 2) + 1;
    
    let allLevelsPassed = Object.values(levelStats).length === levelsData.length && Object.values(levelStats).every(s => s.passed);
    let tPassed = allLevelsPassed && (tCorrect >= tPassMark);
    
    let finalMsg = "";
    if (tQ === 0) { finalMsg = "شما هنوز هیچ مرحله‌ای را بازی نکرده‌اید."; } 
    else if (tPassed) {
        playSound('win'); showConfetti(); 
        finalMsg = '<span class="pass-msg">🏆 تبریک! شما در کل بازی قبول شدید.</span>';
    } else {
        playSound('fail'); showConfetti(true); 
        finalMsg = '<span class="fail-msg">❌ متاسفانه شرط قبولی کل بازی رو نتونستی کسب کنی.<br><span style="font-size:12px;color:#555">(برای قبولی باید تمام مراحل را پاس کنی)</span></span>';
    }

    $("reportText").innerHTML = '<p style="font-size:18px;color:#2980b9;text-align:center"><b>' + state.fName + ' ' + state.lName + ' عزیز</b> 🌺</p>' +
        '<p style="font-size:12px;color:#7f8c8d;margin-bottom:10px;text-align:center">تاریخ: ' + getPersianDate() + '</p>' +
        table +
        '<div style="margin-top:15px;padding-top:10px;border-top:2px solid #bdc3c7;font-weight:bold">' +
            '<p>مجموع امتیاز: ' + tScore + '</p>' +
            '<p>مجموع پاسخ صحیح: <span style="color:#27ae60">' + tCorrect + '</span> | مجموع پاسخ غلط: <span style="color:#e74c3c">' + tWrong + '</span></p>' +
            '<p>از کل ' + ALL_QUESTIONS.length + ' سوال | درصد کل موفقیت: <span style="color:#2980b9">' + tPercent + '%</span></p>' +
        '</div>' +
        '<div style="margin-top:15px;font-weight:bold">' + finalMsg + '</div>';
}

function printPDF(type) {
    let title = type === 'level' ? ('کارنامه مرحله ' + levelsData[state.level - 1].name) : 'کارنامه نهایی بازی';
    let content = "";
    
    if (type === 'level') {
        let s = levelStats[state.level];
        content = '<div style="overflow-x: auto; width: 100%;">' +
            '<table>' +
                '<tr><th>نام مرحله</th><th>امتیاز</th><th>درست</th><th>غلط</th><th>کل سوال</th><th>درصد</th><th>وضعیت</th></tr>' +
                '<tr><td>' + s.name + '</td><td>' + s.score + '</td><td>' + s.correct + '</td><td>' + s.wrong + '</td><td>' + s.qCount + '</td><td>' + s.percent + '%</td><td>' + (s.passed ? 'قبول' : 'نیاز به تلاش') + '</td></tr>' +
            '</table>' +
            '</div>' +
            '<p style="margin-top:20px; font-weight:bold;">تبریک! شما در این مرحله با موفقیت قبول شدید.</p>';
    } else {
        let tScore = 0, tCorrect = 0, tWrong = 0, tQ = 0;
        let tableHtml = '<div style="overflow-x: auto; width: 100%;"><table><tr><th>مرحله</th><th>امتیاز</th><th>درست</th><th>غلط</th><th>کل سوال</th><th>درصد</th><th>وضعیت</th></tr>';
        for(let i = 1; i <= levelsData.length; i++) {
            let s = levelStats[i];
            if (s) {
                tScore += s.score; tCorrect += s.correct; tWrong += s.wrong; tQ += s.qCount;
                tableHtml += '<tr><td>' + s.name + '</td><td>' + s.score + '</td><td>' + s.correct + '</td><td>' + s.wrong + '</td><td>' + s.qCount + '</td><td>' + s.percent + '%</td><td>' + (s.passed ? 'قبول' : 'نیاز به تلاش') + '</td></tr>';
            }
        }
        tableHtml += '</table></div>';
        let tPercent = tQ > 0 ? Math.round((tCorrect / tQ) * 100) : 0;
        let tPassMark = Math.floor(ALL_QUESTIONS.length / 2) + 1;
        
        let allLevelsPassed = Object.values(levelStats).length === levelsData.length && Object.values(levelStats).every(s => s.passed);
        let tPassed = allLevelsPassed && (tCorrect >= tPassMark);
        
        content = tableHtml +
            '<div style="margin-top:15px; padding-top:10px; border-top:2px solid #000; font-weight:bold;">' +
                '<p>مجموع امتیاز: ' + tScore + '</p>' +
                '<p>مجموع پاسخ صحیح: ' + tCorrect + ' | مجموع پاسخ غلط: ' + tWrong + '</p>' +
                '<p>از کل ' + ALL_QUESTIONS.length + ' سوال | درصد کل موفقیت: ' + tPercent + '%</p>' +
            '</div>' +
            '<p style="margin-top:20px; font-weight:bold; color:' + (tPassed ? '#27ae60' : '#e74c3c') + ';">' +
                (tPassed ? 'تبریک! شما در کل بازی قبول شدید.' : 'متاسفانه شرط قبولی کل بازی را کسب نکردید.') +
            '</p>';
    }

    let printWin = window.open('', '_blank');
    
    // ⚠️ رفع باگ حیاتی: استفاده از <\\/script> به جای <\/script> برای جلوگیری از بسته شدن زودهنگام تگ اسکریپت
    let htmlContent = '<!DOCTYPE html>' +
        '<html dir="rtl" lang="fa">' +
        '<head>' +
            '<meta charset="UTF-8">' +
            '<title>' + title + '</title>' +
            '<style>' +
                'body { font-family: Tahoma, sans-serif; direction: rtl; padding: 30px; text-align: center; }' +
                '.header { border-bottom: 3px double #2980b9; padding-bottom: 20px; margin-bottom: 20px; }' +
                'h1 { color: #2c3e50; margin-bottom: 5px; }' +
                'h2 { color: #3498db; }' +
                '.info { background: #f8f9fa; border: 1px solid #ddd; padding: 15px; border-radius: 8px; display: inline-block; margin-bottom: 20px; text-align: right; }' +
                '.info span { font-weight: bold; color: #2980b9; margin-left: 10px; }' +
                'table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; white-space: nowrap; }' +
                'th, td { border: 1px solid #000; padding: 10px; text-align: center; }' +
                'th { background: #ecf0f1; }' +
                '.footer { margin-top: 40px; font-size: 13px; color: #7f8c8d; }' +
            '</style>' +
        '</head>' +
        '<body>' +
            '<div class="header">' +
                '<h1>🎮 ' + EXAM_TITLE + '</h1>' +
                '<h2>' + title + '</h2>' +
            '</div>' +
            '<div class="info">' +
                '<div><span>نام:</span> ' + state.fName + '</div>' +
                '<div><span>نام خانوادگی:</span> ' + state.lName + '</div>' +
                '<div><span>کلاس:</span> ' + state.classNum + '</div>' +
                '<div><span>مدرسه:</span> ' + state.school + '</div>' +
            '</div>' +
            content +
            '<div class="footer">' +
                '<p>' + getPersianDate() + '</p>' +
            '</div>' +
            '<script>' +
                'window.onload = function() { setTimeout(function() { window.print(); }, 500); }' +
            '<\\/script>' + // اینجا باید دابل بک‌اسلش باشد تا در فایل تولیدی به درستی رندر شود
        '</body>' +
        '</html>';

    printWin.document.write(htmlContent);
    printWin.document.close();
}
</script>
</body>
</html>`;
}