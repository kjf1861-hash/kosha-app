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
    
    const gameQuestions = [];
    exam.questions.forEach((q, index) => {
        if (q.type === 'matching' && q.pairs && q.pairs.length > 0) {
            // تبدیل سوال تطبیقی به چند سوال چهارگزینه‌ای
            q.pairs.forEach((pair, pIndex) => {
                let options = [pair.b, ...q.pairs.filter((_, i) => i !== pIndex).map(p => p.b)];
                // مخلوط کردن گزینه‌ها
                options = options.sort(() => Math.random() - 0.5);
                const correctIndex = options.indexOf(pair.b);
                
                // توزیع نمره سوال بین جفت‌ها
                const distributedScore = Math.round((q.score / q.pairs.length) * 100) / 100;

                gameQuestions.push({
                    index: gameQuestions.length + 1,
                    type: 'multiple-choice',
                    text: `مفهوم «${pair.a}» با کدام گزینه تطبیق دارد؟ ${q.text ? '(' + q.text + ')' : ''}`,
                    options: options,
                    score: distributedScore,
                    correctIndex: correctIndex
                });
            });
        } else {
            // بقیه انواع سوالات
            const safeQuestion = {
                index: gameQuestions.length + 1,
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
    
    // ✅ محاسبه دقیق نمره کل بر اساس سوالات تبدیل‌شده
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

function buildGameHtml(exam, subName, questions, maxScore) {
    const jsonSafe = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');
    
    const questionsJson = jsonSafe(questions);
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
            padding: 10px;
        }
        .finish-icon { font-size: 4rem; margin-bottom: 10px; animation: bounce 1s ease; }
        @keyframes bounce {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
        }
        .finish-title { font-size: 1.5rem; margin-bottom: 15px; font-weight: bold; }
        .finish-subtitle { color: #64748b; margin-bottom: 20px; font-size: 1.1rem; }
        
        .score-box {
            background: #f8fafc;
            border: 2px dashed #4A90E2;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            font-weight: bold;
        }
        .score-number { font-size: 2.5rem; display: block; margin-bottom: 5px; }
        
        .review-list {
            text-align: right;
            max-height: 300px;
            overflow-y: auto;
            background: #f8fafc;
            padding: 15px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            margin-bottom: 20px;
        }
        .review-item {
            background: #fee2e2;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 10px;
            font-size: 0.9rem;
            border-right: 4px solid #ef4444;
            line-height: 1.6;
        }
        .review-item strong { color: #1e293b; display: block; margin-bottom: 5px; }
        .review-user-ans { color: #ef4444; text-decoration: line-through; }
        .review-correct-ans { color: #16a34a; font-weight: bold; }
        
        .restart-btn {
            background: #4A90E2;
            color: white;
            border: none;
            padding: 15px 40px;
            border-radius: 12px;
            cursor: pointer;
            font-family: inherit;
            font-size: 1.1rem;
            font-weight: bold;
            transition: all 0.2s;
        }
        .restart-btn:hover { background: #357ABD; transform: translateY(-2px); }
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
                <span>🎯 ${maxScore} نمره</span>
            </div>
        </div>
        <div class="game-body" id="gameBody">
            <!-- توسط JS پر می‌شود -->
        </div>
    </div>

    <script>
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
        
        function normalizeText(str) {
            if (!str) return '';
            return str.toString().trim().toLowerCase()
                .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
                .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
                .replace(/ي/g, 'ی')
                .replace(/ك/g, 'ک')
                .replace(/\s+/g, ' ');
        }

        const EXAM_DATA = {
            title: ${safeTitleJs},
            maxScore: ${maxScore},
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
                    questionHtml += \`
                        <button class="option-btn \${isSelected ? 'selected' : ''}" onclick="selectOption(\${i})">
                            <span class="option-letter">\${letters[i] || (i+1)}</span>
                            <span>\${escapeHtml(opt)}</span>
                        </button>
                    \`;
                });
                questionHtml += '</div>';
            } else if (q.type === 'true-false') {
                const selected = userAnswers[currentQuestionIndex];
                questionHtml = \`
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
                \`;
            } else {
                const currentAnswer = userAnswers[currentQuestionIndex] || '';
                questionHtml = \`
                    <input type="text" class="text-answer-input" 
                           placeholder="پاسخ خود را بنویسید..." 
                           value="\${escapeHtml(currentAnswer)}"
                           oninput="updateTextAnswer(this.value)">
                \`;
            }
            
            const isFirst = currentQuestionIndex === 0;
            const isLast = currentQuestionIndex === total - 1;
            
            body.innerHTML = \`
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
            \`;
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
        
        function showFinishScreen() {
            let totalEarned = 0;
            let reviewHtml = '';

            EXAM_DATA.questions.forEach((q, index) => {
                const userAns = userAnswers[index];
                let isCorrect = false;
                let correctAnswerText = '';
                let userAnswerText = '';
                let hasAnswer = false;

                if (q.type === 'multiple-choice') {
                    hasAnswer = userAns >= 0;
                    isCorrect = userAns === q.correctIndex;
                    correctAnswerText = q.options[q.correctIndex];
                    userAnswerText = hasAnswer ? q.options[userAns] : 'بدون پاسخ';
                } else if (q.type === 'true-false') {
                    hasAnswer = userAns !== null;
                    isCorrect = userAns === q.correctAnswer;
                    correctAnswerText = q.correctAnswer ? 'درست' : 'غلط';
                    userAnswerText = hasAnswer ? (userAns ? 'درست' : 'غلط') : 'بدون پاسخ';
                } else {
                    hasAnswer = userAns.trim() !== '';
                    const normUser = normalizeText(userAns);
                    const normCorrect = normalizeText(q.answer);
                    isCorrect = normUser === normCorrect;
                    correctAnswerText = q.answer;
                    userAnswerText = hasAnswer ? userAns : 'بدون پاسخ';
                }

                if (isCorrect) {
                    totalEarned += q.score;
                } else {
                    // اضافه کردن به لیست مرور
                    reviewHtml += \`
                        <div class="review-item">
                            <strong>سوال \${index + 1}: \${escapeHtml(q.text)}</strong>
                            <div>پاسخ شما: <span class="review-user-ans">\${escapeHtml(userAnswerText)}</span></div>
                            <div>پاسخ صحیح: <span class="review-correct-ans">\${escapeHtml(correctAnswerText)}</span></div>
                        </div>
                    \`;
                }
            });

            // گرد کردن نمره برای جلوگیری از اعشار طولانی
            totalEarned = Math.round(totalEarned * 100) / 100;
            const percent = Math.round((totalEarned / EXAM_DATA.maxScore) * 100);
            
            let resultColor = percent >= 85 ? '#22c55e' : percent >= 50 ? '#f59e0b' : '#ef4444';
            let resultIcon = percent >= 85 ? '🏆' : percent >= 50 ? '👍' : '💪';
            let resultText = percent >= 85 ? 'عالی بود! تو یک قهرمان هستی.' : percent >= 50 ? 'خوب بود، اما می‌توانی بهتر باشی.' : 'نیاز به تمرین بیشتر داری. ناامید نشو!';

            let reviewSection = '';
            if (reviewHtml) {
                reviewSection = \`
                    <h3 style="color: #ef4444; margin-top: 25px; margin-bottom: 10px; text-align: center;">🔍 مرور اشتباهات</h3>
                    <div class="review-list">
                        \${reviewHtml}
                    </div>
                \`;
            } else {
                reviewSection = \`
                    <div style="background: #dcfce7; color: #16a34a; padding: 15px; border-radius: 12px; font-weight: bold; margin-bottom: 20px;">
                        🎉 تبریک! به تمام سوالات درست پاسخ دادی.
                    </div>
                \`;
            }

            document.getElementById('gameBody').innerHTML = \`
                <div class="finish-screen">
                    <div class="finish-icon">\${resultIcon}</div>
                    <div class="finish-title" style="color: \${resultColor};">\${resultText}</div>
                    
                    <div class="score-box" style="border-color: \${resultColor}; color: \${resultColor};">
                        <span class="score-number">\${totalEarned} از \${EXAM_DATA.maxScore}</span>
                        <span>درصد موفقیت: \${percent}٪</span>
                    </div>
                    
                    \${reviewSection}
                    
                    <button class="restart-btn" onclick="restartGame()">🔄 شروع مجدد آزمون</button>
                </div>
            \`;
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