// ==========================================
// فایل game.js — منطق تولید فایل بازی آزمون (آفلاین)
// نسخه ارتقاء یافته با قابلیت‌های صدا، افکت بصری، هشدار ریاضی و قفل مراحل
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
    
    // ۱. تبدیل سوالات تطبیقی به چهارگزینه‌ای
    const gameQuestions = [];
    exam.questions.forEach((q, index) => {
        if (q.type === 'matching' && q.pairs && q.pairs.length > 0) {
            q.pairs.forEach((pair, pIndex) => {
                let options = [pair.b, ...q.pairs.filter((_, i) => i !== pIndex).map(p => p.b)];
                options = options.sort(() => Math.random() - 0.5);
                const correctIndex = options.indexOf(pair.b);
                const distributedScore = Math.round((q.score / q.pairs.length) * 100) / 100;

                gameQuestions.push({
                    originalIndex: gameQuestions.length + 1,
                    type: 'multiple-choice',
                    text: `مفهوم «${pair.a}» با کدام گزینه تطبیق دارد؟ ${q.text ? '(' + q.text + ')' : ''}`,
                    options: options,
                    score: distributedScore,
                    correctIndex: correctIndex
                });
            });
        } else {
            const safeQuestion = {
                originalIndex: gameQuestions.length + 1,
                type: q.type,
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
    
    // ۲. تقسیم سوالات به مراحل (حداکثر ۳ مرحله)
    const MAX_LEVELS = 3;
    let levelsData = [];
    
    if (gameQuestions.length <= 4) {
        // اگر سوالات کم بود، همه در یک مرحله
        levelsData.push({ name: 'مرحله ۱', questions: gameQuestions });
    } else {
        const chunkSize = Math.ceil(gameQuestions.length / MAX_LEVELS);
        for (let i = 0; i < MAX_LEVELS; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, gameQuestions.length);
            if (start < gameQuestions.length) {
                const levelQuestions = gameQuestions.slice(start, end);
                // محاسبه نمره کل این مرحله
                let levelMaxScore = 0;
                levelQuestions.forEach(q => levelMaxScore += q.score);
                levelsData.push({
                    name: 'مرحله ' + (i + 1),
                    questions: levelQuestions,
                    maxScore: Math.round(levelMaxScore * 100) / 100
                });
            }
        }
    }
    
    // محاسبه نمره کل آزمون (برای نمایش در هدر)
    let totalMaxScore = 0;
    gameQuestions.forEach(q => totalMaxScore += q.score);
    
    const gameHtml = buildGameHtml(exam, subName, levelsData, totalMaxScore);
    
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

function buildGameHtml(exam, subName, levelsData, totalMaxScore) {
    const jsonSafe = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');
    
    const levelsJson = jsonSafe(levelsData);
    const safeTitleJs = jsonSafe(exam.title);
    
    const safeExamTitleHtml = escapeHtml(exam.title);
    const safeSubNameHtml = escapeHtml(subName);
    const safeDateHtml = escapeHtml(exam.date);
    
    return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>🎮 بازی آزمون: ${safeExamTitleHtml}</title>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body {
            margin: 0; padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: 'Vazirmatn', Tahoma, sans-serif;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 15px;
            direction: rtl;
        }
        .game-container {
            width: 100%;
            max-width: 600px;
            background: white;
            border-radius: 24px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
            animation: slideUp 0.5s ease-out;
            position: relative;
        }
        @keyframes slideUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .game-header {
            background: linear-gradient(135deg, #4A90E2 0%, #357ABD 100%);
            color: white;
            padding: 25px 20px;
            text-align: center;
            position: relative;
        }
        .game-header h1 { margin: 0 0 5px 0; font-size: 1.4rem; }
        .game-header p { margin: 0; font-size: 0.9rem; opacity: 0.9; }
        .game-info-bar {
            display: flex;
            justify-content: space-around;
            background: rgba(255,255,255,0.15);
            padding: 10px;
            border-radius: 12px;
            margin-top: 15px;
            font-size: 0.85rem;
        }
        .game-body { padding: 25px 20px; min-height: 400px; }
        
        /* Screens */
        .screen { display: none; }
        .screen.active { display: block; animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* Level Menu */
        .level-btn {
            display: block; width: 100%; padding: 15px; margin-bottom: 10px;
            background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px;
            font-size: 1.1rem; font-weight: bold; color: #1e293b; cursor: pointer;
            text-align: right; transition: all 0.2s; font-family: inherit;
            display: flex; justify-content: space-between; align-items: center;
        }
        .level-btn:hover:not(:disabled) { border-color: #4A90E2; background: #eff6ff; }
        .level-btn:disabled { opacity: 0.6; cursor: not-allowed; background: #f1f5f9; color: #94a3b8; border-color: #e2e8f0; }
        .level-btn .level-status { font-size: 0.85rem; padding: 4px 10px; border-radius: 20px; background: #e2e8f0; color: #64748b; }
        .level-btn.passed { border-color: #22c55e; background: #f0fdf4; }
        .level-btn.passed .level-status { background: #dcfce7; color: #15803d; }

        /* Stats Bar */
        .stats-bar {
            display: flex; justify-content: space-between; flex-wrap: wrap;
            background: #f8f9fa; padding: 8px; border-radius: 8px; font-size: 0.8rem;
            font-weight: bold; color: #555; margin-bottom: 15px; border: 1px solid #e9ecef;
        }
        .stats-bar span { margin: 2px; }
        .sc-score { color: #2980b9; } .sc-correct { color: #27ae60; } .sc-wrong { color: #e74c3c; }

        .progress-bar-outer { width: 100%; height: 10px; background: #e2e8f0; border-radius: 5px; margin-bottom: 20px; overflow: hidden; }
        .progress-bar-inner { height: 100%; background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%); border-radius: 5px; transition: width 0.4s ease; }
        
        .question-counter { text-align: center; font-size: 0.9rem; color: #64748b; margin-bottom: 15px; font-weight: bold; }
        .question-text {
            font-size: 1.15rem; font-weight: bold; color: #1e293b; margin-bottom: 20px;
            line-height: 1.8; padding: 15px; background: #f8fafc; border-radius: 12px;
            border-right: 4px solid #4A90E2; word-wrap: break-word;
        }
        .question-score-badge { display: inline-block; background: #fef3c7; color: #b45309; padding: 3px 10px; border-radius: 12px; font-size: 0.75rem; margin-bottom: 10px; }
        
        .options-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
        .option-btn {
            background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 15px;
            font-size: 1rem; font-family: inherit; color: #1e293b; cursor: pointer;
            text-align: right; transition: all 0.2s; display: flex; align-items: center;
            gap: 10px; word-wrap: break-word;
        }
        .option-btn:hover:not(:disabled) { border-color: #4A90E2; background: #eff6ff; transform: translateX(-4px); }
        .option-btn.selected { border-color: #4A90E2; background: #dbeafe; box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.2); }
        .option-btn.correct { border-color: #22c55e; background: #dcfce7; }
        .option-btn.wrong { border-color: #ef4444; background: #fee2e2; }
        .option-letter { width: 30px; height: 30px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; color: #4A90E2; }
        
        .text-answer-input {
            width: 100%; padding: 15px; border: 2px solid #e2e8f0; border-radius: 12px;
            font-size: 1rem; font-family: inherit; color: #1e293b; outline: none;
            transition: border-color 0.2s; margin-bottom: 15px;
        }
        .text-answer-input:focus { border-color: #4A90E2; box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.15); }
        
        .feedback-box { font-size: 0.95rem; font-weight: bold; margin-top: 15px; line-height: 1.6; padding: 10px; border-radius: 8px; display: none; }
        .feedback-box.show { display: block; animation: fadeIn 0.3s; }
        .feedback-correct { background: #dcfce7; color: #166534; border-right: 4px solid #22c55e; }
        .feedback-wrong { background: #fee2e2; color: #991b1b; border-right: 4px solid #ef4444; }
        
        .math-alert { display: none; background: #fef2f2; color: #b91c1c; padding: 10px; border-radius: 8px; margin-top: 15px; font-size: 0.85rem; border: 1px solid #fecaca; font-weight: bold; text-align: center; }
        .math-alert.show { display: block; }

        .nav-buttons { display: flex; gap: 10px; margin-top: 20px; }
        .btn-nav { flex: 1; padding: 15px; border-radius: 12px; border: none; font-size: 1rem; font-weight: bold; font-family: inherit; cursor: pointer; transition: all 0.2s; }
        .btn-next { background: linear-gradient(135deg, #4A90E2 0%, #357ABD 100%); color: white; box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3); }
        .btn-next:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(74, 144, 226, 0.4); }
        .btn-prev { background: #f1f5f9; color: #64748b; }
        .btn-prev:hover { background: #e2e8f0; }
        .btn-prev:disabled, .btn-next:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .btn-retry { background: #f59e0b; color: white; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3); }

        /* Result Screens */
        .finish-screen { text-align: center; padding: 10px; }
        .finish-icon { font-size: 4rem; margin-bottom: 10px; animation: bounce 1s ease; }
        @keyframes bounce { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
        .finish-title { font-size: 1.5rem; margin-bottom: 15px; font-weight: bold; }
        .finish-subtitle { color: #64748b; margin-bottom: 20px; font-size: 1rem; }
        
        .score-box { background: #f8fafc; border: 2px dashed #4A90E2; border-radius: 12px; padding: 20px; margin: 20px 0; font-weight: bold; }
        .score-number { font-size: 2.5rem; display: block; margin-bottom: 5px; }
        
        .result-actions { display: flex; flex-direction: column; gap: 10px; }
        .btn-action { width: 100%; padding: 15px; border: none; border-radius: 12px; font-size: 1rem; font-weight: bold; font-family: inherit; cursor: pointer; transition: all 0.2s; }
        .btn-primary { background: #4A90E2; color: white; }
        .btn-secondary { background: #f1f5f9; color: #64748b; }
        
        /* Confetti */
        .flower { position: fixed; top: -50px; font-size: 24px; z-index: 999; pointer-events: none; animation: fall 2.5s linear forwards; }
        @keyframes fall { to { transform: translateY(100vh) rotate(360deg); opacity: 0; } }
    </style>
</head>
<body>
    <div class="game-container">
        <div class="game-header">
            <h1>🎮 ${safeExamTitleHtml}</h1>
            <p>${safeSubNameHtml}</p>
            <div class="game-info-bar">
                <span>📅 ${safeDateHtml}</span>
                <span>🎯 ${totalMaxScore} نمره کل</span>
            </div>
        </div>
        <div class="game-body">
            
            <!-- صفحه انتخاب مرحله -->
            <div id="screen-menu" class="screen active">
                <h2 style="text-align:center; color:#1e293b; margin-bottom: 20px; font-size: 1.2rem;">مسیر خود را انتخاب کن:</h2>
                <div id="levels-container"></div>
            </div>

            <!-- صفحه بازی -->
            <div id="screen-game" class="screen">
                <div class="stats-bar">
                    <span id="gameLevelName" style="color:#4A90E2;">مرحله ۱</span>
                    <span id="gameQNum">سوال 1/1</span>
                    <span id="gameCorrect" class="sc-correct">✅ 0</span>
                    <span id="gameWrong" class="sc-wrong">❌ 0</span>
                </div>
                <div class="progress-bar-outer">
                    <div class="progress-bar-inner" id="progressBar" style="width: 0%;"></div>
                </div>
                <div class="question-counter" id="questionCounter">سوال 1 از 1</div>
                <div class="question-text" id="questionText">...</div>
                <div id="optionsContainer"></div>
                <div id="feedbackBox" class="feedback-box"></div>
                <div id="mathAlert" class="math-alert"></div>
                <div class="nav-buttons">
                    <button class="btn-nav btn-next" id="btnNext" onclick="handleNextClick()">سوال بعدی ⏭️</button>
                </div>
            </div>

            <!-- صفحه پایان مرحله -->
            <div id="screen-level-result" class="screen">
                <div class="finish-screen">
                    <div class="finish-icon" id="levelResultIcon">🎉</div>
                    <div class="finish-title" id="levelResultTitle"></div>
                    <div class="score-box" id="levelScoreBox"></div>
                    <div class="result-actions">
                        <button class="btn-action btn-primary" id="btnNextLevel" onclick="goToNextLevel()">رفتن به مرحله بعد 🚀</button>
                        <button class="btn-action btn-secondary" id="btnRetryLevel" onclick="retryLevel()">تلاش مجدد این مرحله 🔄</button>
                        <button class="btn-action btn-secondary" onclick="goToMenu()">بازگشت به منو 🔙</button>
                    </div>
                </div>
            </div>

            <!-- صفحه پایان کل بازی -->
            <div id="screen-final-result" class="screen">
                <div class="finish-screen">
                    <div class="finish-icon">🏆</div>
                    <div class="finish-title" style="color:#4A90E2;">پایان آزمون</div>
                    <div class="score-box" id="finalScoreBox"></div>
                    <div class="result-actions">
                        <button class="btn-action btn-secondary" onclick="location.reload()">شروع مجدد از ابتدا 🔄</button>
                    </div>
                </div>
            </div>

        </div>
    </div>

    <script>
        function escapeHtml(str) {
            if (str === null || str === undefined) return '';
            return String(str).replace(/[&<>"']/g, function(m) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
            });
        }
        
        function normalizeText(str) {
            if (!str) return '';
            return str.toString().trim().toLowerCase()
                .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
                .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
                .replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\\s+/g, ' ');
        }

        const LEVELS = ${levelsJson};
        
        const encCorrect = ["آفرین! ادامه بده 💪", "عالی بود! تو نابغه‌ای 🌟", "چه هوش بالایی داری 🧠", "دقیق و درست! 👏", "همینطور ادامه بده 🚀", "تو می‌تونی! 🎯", "پاسخ درست بود! ✨", "کارت درسته! 🏆", "محشر بود! 🌈", "عالی جواب دادی! 🎉"];
        const encWrong = ["اشکالی نداره، یاد می‌گیری 🌸", "نزدیک بود! دوباره تلاش کن 💪", "مهم نیست، از اشتباهات یاد می‌گیریم 🌟", "تلاشت قابل تحسینه، ادامه بده 🚀", "کمی دقت کن، دفعه بعد درستش می‌کنی ✨", "پاسخ درست رو بخون و یاد بگیر 📖", "نگران نباش، تمرین باعث پیشرفت میشه 🧩", "دفعه بعد حتماً می‌تونی! 🎯"];

        let state = {
            currentLevelIndex: 0,
            currentQuestionIndex: 0,
            userAnswers: [],
            levelCorrect: 0,
            levelWrong: 0,
            levelEarnedScore: 0,
            levelStats: {}, // { 0: { passed: true, correct: 3, wrong: 1 } }
            isAnswered: false
        };

        // ==========================================
        // سیستم صدا
        // ==========================================
        let audioCtx;
        function initAudio() { 
            if (!audioCtx) {
                try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
            } 
        }
        function playTone(freq, type, duration) {
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator(); 
            const gain = audioCtx.createGain();
            osc.type = type; 
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
            osc.connect(gain); 
            gain.connect(audioCtx.destination);
            osc.start(); 
            osc.stop(audioCtx.currentTime + duration);
        }
        function playSound(type) {
            initAudio();
            if (type === 'correct') { playTone(600, 'sine', 0.1); setTimeout(() => playTone(800, 'sine', 0.15), 100); }
            else if (type === 'wrong') { playTone(200, 'sawtooth', 0.3); }
            else if (type === 'win') { playTone(400, 'sine', 0.1); setTimeout(() => playTone(500, 'sine', 0.1), 100); setTimeout(() => playTone(600, 'sine', 0.1), 200); setTimeout(() => playTone(800, 'sine', 0.4), 300); }
            else if (type === 'fail') { playTone(300, 'sawtooth', 0.2); setTimeout(() => playTone(200, 'sawtooth', 0.3), 200); }
        }

        // ==========================================
        // افکت بصری (گل و ستاره)
        // ==========================================
        function showConfetti(isFail = false) {
            const emojis = isFail ? ['❌','💔','⚠️','💥'] : ['🌸','🌺','🌟','🎉','✨'];
            for(let i=0; i<25; i++) {
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

        function getRandomMsg(arr) {
            return arr[Math.floor(Math.random() * arr.length)];
        }

        function showScreen(screenId) {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById(screenId).classList.add('active');
        }

        // ==========================================
        // مدیریت منو و مراحل
        // ==========================================
        function renderMenu() {
            const container = document.getElementById('levels-container');
            container.innerHTML = '';
            
            LEVELS.forEach((level, index) => {
                const isUnlocked = index === 0 || (state.levelStats[index - 1] && state.levelStats[index - 1].passed);
                const stat = state.levelStats[index];
                
                let btnClass = 'level-btn';
                let statusHtml = '<span class="level-status">🔒 قفل</span>';
                
                if (stat && stat.passed) {
                    btnClass += ' passed';
                    statusHtml = '<span class="level-status">✅ پاس شده</span>';
                } else if (isUnlocked) {
                    statusHtml = '<span class="level-status">شروع</span>';
                }
                
                const btn = document.createElement('button');
                btn.className = btnClass;
                btn.disabled = !isUnlocked;
                btn.innerHTML = \`
                    <span>\${level.name}</span>
                    \${statusHtml}
                \`;
                btn.onclick = () => startLevel(index);
                container.appendChild(btn);
            });
            
            showScreen('screen-menu');
        }

        function startLevel(levelIndex) {
            state.currentLevelIndex = levelIndex;
            state.currentQuestionIndex = 0;
            state.levelCorrect = 0;
            state.levelWrong = 0;
            state.levelEarnedScore = 0;
            state.isAnswered = false;
            
            const level = LEVELS[levelIndex];
            document.getElementById('gameLevelName').innerText = level.name;
            
            showScreen('screen-game');
            loadQuestion();
        }

        function loadQuestion() {
            state.isAnswered = false;
            const level = LEVELS[state.currentLevelIndex];
            const q = level.questions[state.currentQuestionIndex];
            const totalInLevel = level.questions.length;
            
            // آپدیت هدر
            document.getElementById('gameQNum').innerText = \`سوال \${state.currentQuestionIndex + 1}/\${totalInLevel}\`;
            document.getElementById('gameCorrect').innerText = \`✅ \${state.levelCorrect}\`;
            document.getElementById('gameWrong').innerText = \`❌ \${state.levelWrong}\`;
            document.getElementById('progressBar').style.width = \`\${(state.currentQuestionIndex / totalInLevel) * 100}%\`;
            document.getElementById('questionCounter').innerText = \`سوال \${state.currentQuestionIndex + 1} از \${totalInLevel}\`;
            
            // آپدیت متن سوال
            document.getElementById('questionText').innerHTML = \`
                <span class="question-score-badge">\${q.score} نمره</span>
                <br>
                \${escapeHtml(q.text)}
            \`;
            
            // آپدیت گزینه‌ها
            const optionsContainer = document.getElementById('optionsContainer');
            optionsContainer.innerHTML = '';
            
            if (q.type === 'multiple-choice') {
                optionsContainer.className = 'options-list';
                q.options.forEach((opt, i) => {
                    const letters = ['الف', 'ب', 'ج', 'د', 'ه', 'و'];
                    const btn = document.createElement('button');
                    btn.className = 'option-btn';
                    btn.innerHTML = \`
                        <span class="option-letter">\${letters[i] || (i+1)}</span>
                        <span>\${escapeHtml(opt)}</span>
                    \`;
                    btn.onclick = () => checkAnswer(i);
                    optionsContainer.appendChild(btn);
                });
            } else if (q.type === 'true-false') {
                optionsContainer.className = 'options-list';
                const btnTrue = document.createElement('button');
                btnTrue.className = 'option-btn';
                btnTrue.innerHTML = '<span class="option-letter">✅</span><span>درست</span>';
                btnTrue.onclick = () => checkAnswer(true);
                optionsContainer.appendChild(btnTrue);
                
                const btnFalse = document.createElement('button');
                btnFalse.className = 'option-btn';
                btnFalse.innerHTML = '<span class="option-letter">❌</span><span>غلط</span>';
                btnFalse.onclick = () => checkAnswer(false);
                optionsContainer.appendChild(btnFalse);
            } else {
                optionsContainer.className = '';
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'text-answer-input';
                input.id = 'textAnswerInput';
                input.placeholder = 'پاسخ خود را بنویسید...';
                input.onkeydown = (e) => { if (e.key === 'Enter') checkAnswer(input.value); };
                optionsContainer.appendChild(input);
            }
            
            // ریست کردن بازخورد و دکمه‌ها
            const fb = document.getElementById('feedbackBox');
            fb.className = 'feedback-box';
            fb.innerText = '';
            
            const mathAlert = document.getElementById('mathAlert');
            mathAlert.className = 'math-alert';
            
            const btnNext = document.getElementById('btnNext');
            btnNext.style.display = 'none';
            btnNext.className = 'btn-nav btn-next';
            btnNext.innerText = (state.currentQuestionIndex === totalInLevel - 1) ? 'پایان مرحله 🏁' : 'سوال بعدی ⏭️';
            
            // فوکوس روی اینپوت متن اگر وجود داشت
            if (q.type !== 'multiple-choice' && q.type !== 'true-false') {
                setTimeout(() => {
                    const input = document.getElementById('textAnswerInput');
                    if (input) input.focus();
                }, 100);
            }
        }

        function checkAnswer(userAns) {
            if (state.isAnswered) return;
            state.isAnswered = true;
            
            const level = LEVELS[state.currentLevelIndex];
            const q = level.questions[state.currentQuestionIndex];
            let isCorrect = false;
            
            // غیرفعال کردن المان‌ها
            document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
            const textInput = document.getElementById('textAnswerInput');
            if (textInput) textInput.disabled = true;

            // بررسی پاسخ
            if (q.type === 'multiple-choice') {
                isCorrect = (userAns === q.correctIndex);
                const btns = document.querySelectorAll('.option-btn');
                btns.forEach((btn, idx) => {
                    if (idx === q.correctIndex) btn.classList.add('correct');
                    else if (idx === userAns) btn.classList.add('wrong');
                });
            } else if (q.type === 'true-false') {
                isCorrect = (userAns === q.correctAnswer);
                const btns = document.querySelectorAll('.option-btn');
                const correctIdx = q.correctAnswer ? 0 : 1;
                const userIdx = userAns ? 0 : 1;
                btns.forEach((btn, idx) => {
                    if (idx === correctIdx) btn.classList.add('correct');
                    else if (idx === userIdx) btn.classList.add('wrong');
                });
            } else {
                const normUser = normalizeText(userAns);
                const normCorrect = normalizeText(q.answer);
                isCorrect = (normUser !== '' && normUser === normCorrect);
                
                if (textInput) {
                    textInput.style.borderColor = isCorrect ? '#22c55e' : '#ef4444';
                    textInput.style.background = isCorrect ? '#f0fdf4' : '#fef2f2';
                }
            }

            // نمایش بازخورد
            const fb = document.getElementById('feedbackBox');
            if (isCorrect) {
                state.levelCorrect++;
                state.levelEarnedScore += q.score;
                playSound('correct');
                showConfetti(false);
                fb.className = 'feedback-box show feedback-correct';
                fb.innerHTML = getRandomMsg(encCorrect);
            } else {
                state.levelWrong++;
                playSound('wrong');
                fb.className = 'feedback-box show feedback-wrong';
                
                let correctText = '';
                if (q.type === 'multiple-choice') correctText = q.options[q.correctIndex];
                else if (q.type === 'true-false') correctText = q.correctAnswer ? 'درست' : 'غلط';
                else correctText = q.answer;
                
                fb.innerHTML = \`\${getRandomMsg(encWrong)}<br>پاسخ صحیح: <span style="color:#166534; font-weight:900;">\${escapeHtml(correctText)}</span>\`;
            }
            
            // آپدیت آمار
            document.getElementById('gameCorrect').innerText = \`✅ \${state.levelCorrect}\`;
            document.getElementById('gameWrong').innerText = \`❌ \${state.levelWrong}\`;
            document.getElementById('progressBar').style.width = \`\${((state.currentQuestionIndex + 1) / level.questions.length) * 100}%\`;

            // بررسی هشدار ریاضی
            const remaining = level.questions.length - (state.currentQuestionIndex + 1);
            const passMark = Math.ceil(level.questions.length * 0.5); // ۵۰٪ قبولی
            const btnNext = document.getElementById('btnNext');
            
            if (state.levelCorrect + remaining < passMark) {
                // دیگر امکان قبولی نیست
                const mathAlert = document.getElementById('mathAlert');
                mathAlert.className = 'math-alert show';
                mathAlert.innerHTML = \`⚠️ متاسفانه از نظر ریاضی امکان قبولی در این مرحله وجود ندارد (حداکثر نمره ممکن: \${state.levelCorrect + remaining} از \${passMark} لازم).\`;
                
                btnNext.style.display = 'block';
                btnNext.className = 'btn-nav btn-retry';
                btnNext.innerText = 'تلاش مجدد 🔄';
                btnNext.onclick = () => retryLevel();
            } else {
                btnNext.style.display = 'block';
            }
        }

        function handleNextClick() {
            const level = LEVELS[state.currentLevelIndex];
            if (state.currentQuestionIndex < level.questions.length - 1) {
                state.currentQuestionIndex++;
                loadQuestion();
            } else {
                finishLevel();
            }
        }

        function finishLevel() {
            const level = LEVELS[state.currentLevelIndex];
            const totalQ = level.questions.length;
            const passMark = Math.ceil(totalQ * 0.5);
            const isPassed = state.levelCorrect >= passMark;
            
            state.levelStats[state.currentLevelIndex] = {
                passed: isPassed,
                correct: state.levelCorrect,
                wrong: state.levelWrong
            };
            
            const iconEl = document.getElementById('levelResultIcon');
            const titleEl = document.getElementById('levelResultTitle');
            const scoreBox = document.getElementById('levelScoreBox');
            const btnNextLevel = document.getElementById('btnNextLevel');
            const btnRetryLevel = document.getElementById('btnRetryLevel');
            
            if (isPassed) {
                playSound('win');
                showConfetti(false);
                iconEl.innerText = '🎉';
                titleEl.style.color = '#16a34a';
                titleEl.innerText = 'آفرین! این مرحله رو پاس کردی.';
                scoreBox.style.borderColor = '#22c55e';
                scoreBox.style.color = '#16a34a';
            } else {
                playSound('fail');
                showConfetti(true);
                iconEl.innerText = '💪';
                titleEl.style.color = '#ef4444';
                titleEl.innerText = 'نیاز به تلاش بیشتر داری.';
                scoreBox.style.borderColor = '#ef4444';
                scoreBox.style.color = '#ef4444';
            }
            
            scoreBox.innerHTML = \`
                <span class="score-number">\${state.levelCorrect} از \${totalQ}</span>
                <span>پاسخ صحیح</span>
            \`;
            
            // نمایش دکمه‌ها
            if (isPassed && state.currentLevelIndex < LEVELS.length - 1) {
                btnNextLevel.style.display = 'block';
            } else {
                btnNextLevel.style.display = 'none';
            }
            btnRetryLevel.style.display = 'block';
            
            showScreen('screen-level-result');
        }

        function retryLevel() {
            startLevel(state.currentLevelIndex);
        }

        function goToNextLevel() {
            if (state.currentLevelIndex < LEVELS.length - 1) {
                startLevel(state.currentLevelIndex + 1);
            }
        }

        function goToMenu() {
            renderMenu();
        }

        // شروع برنامه
        renderMenu();
    </script>
</body>
</html>`;
}