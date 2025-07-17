class TextCounter {
    constructor() {
        this.textInput = document.getElementById('textInput');
        this.charCount = document.getElementById('charCount');
        this.charCountNoSpaces = document.getElementById('charCountNoSpaces');
        this.wordCount = document.getElementById('wordCount');
        this.lineCount = document.getElementById('lineCount');
        this.paragraphCount = document.getElementById('paragraphCount');
        this.sentenceCount = document.getElementById('sentenceCount');
        this.mostFrequentWord = document.getElementById('mostFrequentWord');
        this.avgWordLength = document.getElementById('avgWordLength');
        this.readingTime = document.getElementById('readingTime');
        this.clearBtn = document.getElementById('clearBtn');
        this.pasteBtn = document.getElementById('pasteBtn');
        
        this.init();
    }

    init() {
        this.textInput.addEventListener('input', () => this.updateStats());
        this.textInput.addEventListener('paste', () => {
            setTimeout(() => this.updateStats(), 10);
        });
        this.clearBtn.addEventListener('click', () => this.clearText());
        this.pasteBtn.addEventListener('click', () => this.pasteText());
        
        this.updateStats();
    }

    updateStats() {
        const text = this.textInput.value;
        
        // 基本统计
        const charCountValue = text.length;
        const charCountNoSpacesValue = text.replace(/\s/g, '').length;
        const words = this.getWords(text);
        const wordCountValue = words.length;
        const lineCountValue = text ? text.split('\n').length : 0;
        const paragraphCountValue = this.getParagraphCount(text);
        const sentenceCountValue = this.getSentenceCount(text);
        
        // 更新显示
        this.charCount.textContent = charCountValue.toLocaleString();
        this.charCountNoSpaces.textContent = charCountNoSpacesValue.toLocaleString();
        this.wordCount.textContent = wordCountValue.toLocaleString();
        this.lineCount.textContent = lineCountValue.toLocaleString();
        this.paragraphCount.textContent = paragraphCountValue.toLocaleString();
        this.sentenceCount.textContent = sentenceCountValue.toLocaleString();
        
        // 高级统计
        this.updateAdvancedStats(text, words);
    }

    getWords(text) {
        if (!text.trim()) return [];
        
        // 支持中英文分词
        const words = text
            .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
            .trim()
            .split(/\s+/)
            .filter(word => word.length > 0);
        
        return words;
    }

    getParagraphCount(text) {
        if (!text.trim()) return 0;
        return text.trim().split(/\n\s*\n/).length;
    }

    getSentenceCount(text) {
        if (!text.trim()) return 0;
        
        // 支持中英文句子分割
        const sentences = text
            .replace(/[.!?。！？]+/g, '|')
            .split('|')
            .filter(sentence => sentence.trim().length > 0);
        
        return sentences.length;
    }

    updateAdvancedStats(text, words) {
        if (words.length === 0) {
            this.mostFrequentWord.textContent = '-';
            this.avgWordLength.textContent = '0';
            this.readingTime.textContent = '0 分钟';
            return;
        }

        // 最常用词汇
        const wordFreq = {};
        words.forEach(word => {
            const lowerWord = word.toLowerCase();
            wordFreq[lowerWord] = (wordFreq[lowerWord] || 0) + 1;
        });

        const mostFrequent = Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])[0];
        
        this.mostFrequentWord.textContent = mostFrequent ? 
            `${mostFrequent[0]} (${mostFrequent[1]}次)` : '-';

        // 平均单词长度
        const avgLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
        this.avgWordLength.textContent = avgLength.toFixed(1);

        // 阅读时间估算（平均200字/分钟）
        const readingMinutes = Math.ceil(text.length / 200);
        this.readingTime.textContent = `${readingMinutes} 分钟`;
    }

    clearText() {
        this.textInput.value = '';
        this.textInput.focus();
        this.updateStats();
    }

    async pasteText() {
        try {
            const text = await navigator.clipboard.readText();
            this.textInput.value = text;
            this.textInput.focus();
            this.updateStats();
        } catch (err) {
            console.error('无法读取剪贴板内容:', err);
            alert('无法读取剪贴板内容，请手动粘贴');
        }
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new TextCounter();
});

// 添加快捷键支持
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case 'a':
                if (document.activeElement === document.getElementById('textInput')) {
                    e.preventDefault();
                    document.getElementById('textInput').select();
                }
                break;
            case 'l':
                e.preventDefault();
                document.getElementById('clearBtn').click();
                break;
        }
    }
});