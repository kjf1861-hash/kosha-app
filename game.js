// ==========================================
// فایل game.js — منطق تولید فایل بازی آزمون (آفلاین)
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
    
    const gameQuestions = exam.questions.map((q, index) => {
        const safeQuestion = {
            index: index + 1,
            type: q.type,
            text: q.text,
            score: q.score
        };
        
        if (q.type === 'multiple-choice') {
            safeQuestion.options = q.options;
        }
        
        return safeQuestion;
    });
    
    const gameHtml = buildGameHtml(exam, subName, gameQuestions);
    
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

function buildGameHtml(exam, subName, questions) {
    // ✅ اصلاح امنیتی: امن‌سازی داده‌ها برای جلوگیری از شکستن کدهای جاوااسکریپت
    // با جایگزین کردن < با \u003c، از بسته شدن زودهنگام تگ اسکریپت جلوگیری می‌شود
    const jsonSafe = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');
    
    const questionsJson = jsonSafe(questions);
    const safeTitleJs = jsonSafe(exam.title);
    
    // ✅ اصلاح امنیتی: escape متن‌ها برای نمایش در HTML
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
        .game-body { padding: 25px 20px; }
        .progress-bar-outer {
            width: 100%;
            height: 10px;
            background: #e2e8f0;
            border-radius: 5px;
            margin-bottom: 20px;
            overflow: hidden;
        }
        .progress-bar-inner {
            height: 100%;
            background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
            border-radius: 5px;
            transition: width 0.4s ease;
        }
        .question-counter {
            text-align: center;
            font-size: 0.9rem;
            color: #64748b;
            margin-bottom: 15px;
            font-weight: bold;
        }
        .question-text {
            font-size: 1.15rem;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 20px;
            line-height: 1.8;
            padding: 15px;
            background: #f8fafc;
            border-radius: 12px;
            border-right: 4px solid #4A90E2;
            word-wrap: break-word;
        }
        .question-score-badge {
            display: inline-block;
            background: #fef3c7;
            color: #b45309;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 0.75rem;
            margin-bottom: 10px;
        }
        .options-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 20px;
        }
        .option-btn {
            background: white;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 15px;
            font-size: 1rem;
            font-family: inherit;
            color: #1e293b;
            cursor: pointer;
            text-align: right;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 10px;
            word-wrap: break-word;
        }
        .option-btn:hover {
            border-color: #4A90E2;
            background: #eff6ff;
            transform: translateX(-4px);
        }
        .option-btn.selected {
            border-color: #4A90E2;
            background: #dbeafe;
            box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.2);
        }
        .option-btn.correct {
            border-color: #22c55e;
            background: #dcfce7;
        }
        .option-btn.wrong {
            border-color: #ef4444;
            background: #fee2e2;
        }
        .option-letter {
            width: 30px;
            height: 30px;
            background: #f1f5f9;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            flex-shrink: 0;
            color: #4A90E2;
        }
        .text-answer-input {
            width: 100%;
            padding: 15px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            font-size: 1rem;
            font-family: inherit;
            color: #1e293b;
            outline: none;
            transition: border-color 0.2s;
            margin-bottom: 15px;
        }
        .text-answer-input:focus {
            border-color: #4A90E2;
            box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.15);
        }
        .nav-buttons {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        .btn-nav {
            flex: 1;
            padding: 15px;
            border-radius: 12px;
            border: none;
            font-size: 1rem;
            font-weight: bold;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-next {
            background: linear-gradient(135deg, #4A90E2 0%, #357ABD 100%);
            color: white;
            box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
        }
        .btn-next:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(74, 144, 226, 0.4); }
        .btn-prev {
            background: #f1f5f9;
            color: #64748b;
        }
        .btn-prev:hover { background: #e2e8f0; }
        .btn-next:disabled, .btn-prev:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        .finish-screen {
            text-align: center;
            padding: 20px;
        }
        .finish-icon { font-size: 4rem; margin-bottom: 15px; animation: bounce 1s ease; }
        @keyframes bounce {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
        }
        .finish-title { font-size: 1.4rem; color: #16a34a; margin-bottom: 10px; }
        .finish-subtitle { color: #64748b; margin-bottom: 20px; }
        .code-box {
            background: #f8fafc;
            border: 2px dashed #4A90E2;
            border-radius: 12px;
            padding: 15px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
            font-size: 1.1rem;
            font-weight: bold;
            color: #4A90E2;
            word-break: break-all;
            letter-spacing: 1px;
        }
        .code-label { font-size: 0.85rem; color: #64748b; margin-bottom: 10px; }
        .copy-btn {
            background: #4A90E2;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 10px;
            cursor: pointer;
            font-family: inherit;
            font-size: 0.9rem;
            margin-bottom: 15px;
        }
        .copy-btn:hover { background: #357ABD; }
        .restart-btn {
            background: #f1f5f9;
            color: #64748b;
            border: none;
            padding: 12px 30px;
            border-radius: 10px;
            cursor: pointer;
            font-family: inherit;
            font-size: 0.95rem;
        }
    </style>
</head>
<body>
    <div class="game-container" id="gameContainer">
        <div class="game-header">
            <h1>🎮 ${safeExamTitleHtml}</h1>
            <p>${safeSubNameHtml}</p>
            <div class="game-info-bar">
                <span>📅 ${safeDateHtml}</span>
                <span>❓ ${questions.length} سوال</span>
                <span>🎯 ${exam.maxScore} نمره</span>
            </div>
        </div>
        <div class="game-body" id="gameBody">
            <!-- توسط JS پر می‌شود -->
        </div>
    </div>

    <script>
        // ✅ تابع امنیتی برای جلوگیری از اجرای کدهای HTML در مرورگر دانش‌آموز
        function escapeHtml(str) {
            if (str === null || str === undefined) return '';
            return String(str).replace(/[&<>"']/g, function(m) {
                return {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                }[m];
            });
        }

        const EXAM_DATA = {
            title: ${safeTitleJs},
            maxScore: ${exam.maxScore},
            questions: ${questionsJson}
        };
        
        let currentQuestionIndex = 0;
        let userAnswers = [];
        
        function initGame() {
            userAnswers = EXAM_DATA.questions.map(q => {
                if (q.type === 'multiple-choice') return -1;
                if (q.type === 'true-false') return null;
                return '';
            });
            renderQuestion();
        }
        
        function renderQuestion() {
            const body = document.getElementById('gameBody');
            const q = EXAM_DATA.questions[currentQuestionIndex];
            const total = EXAM_DATA.questions.length;
            const progress = ((currentQuestionIndex) / total) * 100;
            
            let questionHtml = '';
            
            if (q.type === 'multiple-choice') {
                questionHtml = '<div class="options-list">';
                q.options.forEach((opt, i) => {
                    const letters = ['الف', 'ب', 'ج', 'د', 'ه', 'و'];
                    const isSelected = userAnswers[currentQuestionIndex] === i;
                    questionHtml += `
                        <button class="option-btn \${isSelected ? 'selected' : ''}" onclick="selectOption(\${i})">
                            <span class="option-letter">\${letters[i] || (i+1)}</span>
                            <span>\${escapeHtml(opt)}</span>
                        </button>
                    `;
                });
                questionHtml += '</div>';
            } else if (q.type === 'true-false') {
                const selected = userAnswers[currentQuestionIndex];
                questionHtml = `
                    <div class="options-list">
                        <button class="option-btn \${selected === true ? 'selected' : ''}" onclick="selectTrueFalse(true)">
                            <span class="option-letter">✅</span>
                            <span>درست</span>
                        </button>
                        <button class="option-btn \${selected === false ? 'selected' : ''}" onclick="selectTrueFalse(false)">
                            <span class="option-letter">❌</span>
                            <span>غلط</span>
                        </button>
                    </div>
                `;
            } else {
                const currentAnswer = userAnswers[currentQuestionIndex] || '';
                questionHtml = `
                    <input type="text" class="text-answer-input" 
                           placeholder="پاسخ خود را بنویسید..." 
                           value="\${escapeHtml(currentAnswer)}"
                           oninput="updateTextAnswer(this.value)">
                `;
            }
            
            const isFirst = currentQuestionIndex === 0;
            const isLast = currentQuestionIndex === total - 1;
            
            body.innerHTML = `
                <div class="progress-bar-outer">
                    <div class="progress-bar-inner" style="width: \${progress}%;"></div>
                </div>
                <div class="question-counter">سوال \${currentQuestionIndex + 1} از \${total}</div>
                <div class="question-text">
                    <span class="question-score-badge">\${q.score} نمره</span>
                    <br>
                    \${escapeHtml(q.text)}
                </div>
                \${questionHtml}
                <div class="nav-buttons">
                    <button class="btn-nav btn-prev" onclick="prevQuestion()" \${isFirst ? 'disabled' : ''}>▶ قبلی</button>
                    <button class="btn-nav btn-next" onclick="nextQuestion()">\${isLast ? '🏁 پایان آزمون' : 'بعدی ◀'}</button>
                </div>
            `;
        }
        
        function selectOption(index) {
            userAnswers[currentQuestionIndex] = index;
            renderQuestion();
        }
        
        function selectTrueFalse(value) {
            userAnswers[currentQuestionIndex] = value;
            renderQuestion();
        }
        
        function updateTextAnswer(value) {
            userAnswers[currentQuestionIndex] = value;
        }
        
        function prevQuestion() {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                renderQuestion();
            }
        }
        
        function nextQuestion() {
            if (currentQuestionIndex < EXAM_DATA.questions.length - 1) {
                currentQuestionIndex++;
                renderQuestion();
            } else {
                showFinishScreen();
            }
        }

// ⏸️ پایان بخش ۲ — منتظر پیام «ادامه» شما هستم تا بخش ۳ (آخرین بخش) را بفرستم.
        function showFinishScreen() {
            const answersString = userAnswers.map(a => {
                if (a === null) return 'null';
                if (typeof a === 'string') return a.trim();
                return a;
            }).join('|');
            
            let hash = 0;
            const combined = EXAM_DATA.title + '|' + answersString;
            for (let i = 0; i < combined.length; i++) {
                const char = combined.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            const code = Math.abs(hash).toString(36).toUpperCase().substring(0, 8).padStart(8, '0');
            
            document.getElementById('gameBody').innerHTML = `
                <div class="finish-screen">
                    <div class="finish-icon">🎉</div>
                    <div class="finish-title">آفرین! آزمون را به پایان رساندی.</div>
                    <div class="finish-subtitle">کد زیر را برای معلم خود بفرست تا نمره‌ات را ثبت کند.</div>
                    <div class="code-box" id="outputCode">\${code}</div>
                    <div class="code-label">کد خروجی (این کد را کپی کنید)</div>
                    <button class="copy-btn" onclick="copyCode('\${code}')">📋 کپی کد</button>
                    <br>
                    <button class="restart-btn" onclick="restartGame()">🔄 شروع مجدد</button>
                </div>
            `;
        }
        
        function copyCode(code) {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(code).then(() => {
                    alert('✅ کد کپی شد!');
                });
            } else {
                const ta = document.createElement('textarea');
                ta.value = code;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                alert('✅ کد کپی شد!');
            }
        }
        
        function restartGame() {
            currentQuestionIndex = 0;
            initGame();
        }
        
        initGame();
    </script>
</body>
</html>`;
}