class TextAnalyzer {
    constructor() {
        this.textInput = document.getElementById('textInput');
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateStats();
    }

    bindEvents() {
        this.textInput.addEventListener('input', () => {
            this.updateStats();
        });

        this.textInput.addEventListener('paste', () => {
            setTimeout(() => this.updateStats(), 10);
        });
    }

    updateStats() {
        const text = this.textInput.value;
        const stats = this.analyzeText(text);
        this.displayStats(stats);
    }

    analyzeText(text) {
        const stats = {
            charCount: text.length,
            charCountNoSpace: text.replace(/\s/g, '').length,
            wordCount: this.countWords(text),
            lineCount: text.split('\n').length,
            paragraphCount: text.split('\n\n').filter(p => p.trim()).length,
            readingTime: Math.ceil(this.countWords(text) / 200), // 假设每分钟200字
            chineseCount: this.countChinese(text),
            englishCount: this.countEnglish(text),
            numberCount: this.countNumbers(text),
            punctuationCount: this.countPunctuation(text),
            avgWordLength: this.getAverageWordLength(text),
            longestWord: this.getLongestWord(text),
            shortestWord: this.getShortestWord(text),
            languageDetection: this.detectLanguage(text),
            wordFrequency: this.getWordFrequency(text)
        };

        return stats;
    }

    countWords(text) {
        if (!text.trim()) return 0;
        
        // 中英文混合计数
        const chineseWords = text.match(/[\u4e00-\u9fa5]/g) || [];
        const englishWords = text.match(/[a-zA-Z]+/g) || [];
        
        return chineseWords.length + englishWords.length;
    }

    countChinese(text) {
        const chinese = text.match(/[\u4e00-\u9fa5]/g);
        return chinese ? chinese.length : 0;
    }

    countEnglish(text) {
        const english = text.match(/[a-zA-Z]/g);
        return english ? english.length : 0;
    }

    countNumbers(text) {
        const numbers = text.match(/\d/g);
        return numbers ? numbers.length : 0;
    }

    countPunctuation(text) {
        const punctuation = text.match(/[^\w\s\u4e00-\u9fa5]/g);
        return punctuation ? punctuation.length : 0;
    }

    getAverageWordLength(text) {
        const words = text.match(/[a-zA-Z]+/g) || [];
        if (words.length === 0) return 0;
        
        const totalLength = words.reduce((sum, word) => sum + word.length, 0);
        return (totalLength / words.length).toFixed(1);
    }

    getLongestWord(text) {
        const words = text.match(/[a-zA-Z]+/g) || [];
        if (words.length === 0) return '-';
        
        return words.reduce((longest, word) => 
            word.length > longest.length ? word : longest
        );
    }

    getShortestWord(text) {
        const words = text.match(/[a-zA-Z]+/g) || [];
        if (words.length === 0) return '-';
        
        return words.reduce((shortest, word) => 
            word.length < shortest.length ? word : shortest
        );
    }

    detectLanguage(text) {
        const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
        const englishChars = text.match(/[a-zA-Z]/g) || [];
        
        if (chineseChars.length === 0 && englishChars.length === 0) return '无法检测';
        
        const chineseRatio = chineseChars.length / (chineseChars.length + englishChars.length);
        
        if (chineseRatio > 0.7) return '中文';
        if (chineseRatio < 0.3) return '英文';
        return '中英文混合';
    }

    getWordFrequency(text) {
        const words = text.toLowerCase().match(/[a-zA-Z\u4e00-\u9fa5]+/g) || [];
        const frequency = {};
        
        words.forEach(word => {
            frequency[word] = (frequency[word] || 0) + 1;
        });
        
        return Object.entries(frequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20);
    }

    displayStats(stats) {
        // 基础统计
        document.getElementById('charCount').textContent = stats.charCount.toLocaleString();
        document.getElementById('charCountNoSpace').textContent = stats.charCountNoSpace.toLocaleString();
        document.getElementById('wordCount').textContent = stats.wordCount.toLocaleString();
        document.getElementById('lineCount').textContent = stats.lineCount.toLocaleString();
        document.getElementById('paragraphCount').textContent = stats.paragraphCount.toLocaleString();
        document.getElementById('readingTime').textContent = stats.readingTime.toLocaleString();

        // 详细分析
        document.getElementById('chineseCount').textContent = stats.chineseCount.toLocaleString();
        document.getElementById('englishCount').textContent = stats.englishCount.toLocaleString();
        document.getElementById('numberCount').textContent = stats.numberCount.toLocaleString();
        document.getElementById('punctuationCount').textContent = stats.punctuationCount.toLocaleString();
        document.getElementById('avgWordLength').textContent = stats.avgWordLength;
        document.getElementById('longestWord').textContent = stats.longestWord;
        document.getElementById('shortestWord').textContent = stats.shortestWord;
        document.getElementById('languageDetection').textContent = stats.languageDetection;

        // 词频统计
        this.displayWordFrequency(stats.wordFrequency);
    }

    displayWordFrequency(wordFrequency) {
        const container = document.getElementById('wordFrequencyList');
        container.innerHTML = '';
        
        wordFrequency.forEach(([word, count]) => {
            const tag = document.createElement('span');
            tag.className = 'word-tag';
            tag.textContent = `${word} (${count})`;
            container.appendChild(tag);
        });
    }

    getStatsText() {
        const text = this.textInput.value;
        const stats = this.analyzeText(text);
        
        return `文本统计信息：
字符数：${stats.charCount.toLocaleString()}
字符数（不含空格）：${stats.charCountNoSpace.toLocaleString()}
单词数：${stats.wordCount.toLocaleString()}
行数：${stats.lineCount.toLocaleString()}
段落数：${stats.paragraphCount.toLocaleString()}
阅读时间：${stats.readingTime} 分钟
中文字符数：${stats.chineseCount.toLocaleString()}
英文字符数：${stats.englishCount.toLocaleString()}
数字字符数：${stats.numberCount.toLocaleString()}
标点符号数：${stats.punctuationCount.toLocaleString()}
平均单词长度：${stats.avgWordLength}
最长单词：${stats.longestWord}
最短单词：${stats.shortestWord}
语言检测：${stats.languageDetection}`;
    }
}

// 初始化分析器
const analyzer = new TextAnalyzer();

// 工具函数
async function copyStats() {
    try {
        const statsText = analyzer.getStatsText();
        await navigator.clipboard.writeText(statsText);
        showMessage('统计信息已复制到剪贴板', 'success');
    } catch (err) {
        showMessage('复制失败，请手动复制', 'danger');
    }
}

function clearText() {
    if (confirm('确定要清空所有文本吗？')) {
        analyzer.textInput.value = '';
        analyzer.updateStats();
        showMessage('文本已清空', 'info');
    }
}

async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        analyzer.textInput.value = text;
        analyzer.updateStats();
        showMessage('文本已从剪贴板粘贴', 'success');
    } catch (err) {
        showMessage('无法访问剪贴板，请手动粘贴', 'warning');
    }
}

function exportStats() {
    const statsText = analyzer.getStatsText();
    const blob = new Blob([statsText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `text-stats-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showMessage('统计信息已导出', 'success');
}

function showMessage(message, type = 'info') {
    // 简单的消息显示函数
    const messageEl = document.createElement('div');
    messageEl.textContent = message;
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        background: var(--primary-color);
        color: white;
        border-radius: 8px;
        box-shadow: var(--shadow);
        z-index: 1000;
        font-size: 14px;
    `;
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
        messageEl.remove();
    }, 3000);
}

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'l':
                e.preventDefault();
                clearText();
                break;
            case 'e':
                e.preventDefault();
                exportStats();
                break;
            case 'k':
                e.preventDefault();
                copyStats();
                break;
        }
    }
}); 