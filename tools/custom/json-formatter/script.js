class JSONFormatter {
    constructor() {
        this.jsonInput = document.getElementById('jsonInput');
        this.jsonOutput = document.getElementById('jsonOutput');
        this.inputLineNumbers = document.getElementById('inputLineNumbers');
        this.outputLineNumbers = document.getElementById('outputLineNumbers');
        
        this.pasteBtn = document.getElementById('pasteBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.formatBtn = document.getElementById('formatBtn');
        this.copyBtn = document.getElementById('copyBtn');
        
        this.inputStatus = document.getElementById('inputStatus');
        this.inputCharCount = document.getElementById('inputCharCount');
        this.inputSize = document.getElementById('inputSize');
        this.outputStatus = document.getElementById('outputStatus');
        this.outputCharCount = document.getElementById('outputCharCount');
        this.outputSize = document.getElementById('outputSize');
        
        this.errorSection = document.getElementById('errorSection');
        this.errorMessage = document.getElementById('errorMessage');
        this.errorLocation = document.getElementById('errorLocation');
        
        this.formatOptions = document.getElementsByName('format');
        this.indentSize = document.getElementById('indentSize');
        
        // 分析显示元素
        this.dataType = document.getElementById('dataType');
        this.depth = document.getElementById('depth');
        this.propertyCount = document.getElementById('propertyCount');
        this.stringCount = document.getElementById('stringCount');
        this.numberCount = document.getElementById('numberCount');
        this.booleanCount = document.getElementById('booleanCount');
        this.nullCount = document.getElementById('nullCount');
        this.objectCount = document.getElementById('objectCount');
        this.arrayCount = document.getElementById('arrayCount');
        this.maxArrayLength = document.getElementById('maxArrayLength');
        
        this.currentJSON = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateInputInfo();
        this.updateOutputInfo();
        this.updateLineNumbers();
    }

    bindEvents() {
        this.jsonInput.addEventListener('input', () => {
            this.updateInputInfo();
            this.updateLineNumbers();
            this.validateJSON();
        });

        this.jsonInput.addEventListener('scroll', () => {
            this.syncLineNumbers();
        });

        this.pasteBtn.addEventListener('click', () => {
            this.pasteText();
        });

        this.clearBtn.addEventListener('click', () => {
            this.clearInput();
        });

        this.formatBtn.addEventListener('click', () => {
            this.formatJSON();
        });

        this.copyBtn.addEventListener('click', () => {
            this.copyOutput();
        });

        this.formatOptions.forEach(option => {
            option.addEventListener('change', () => {
                if (this.currentJSON) {
                    this.formatJSON();
                }
            });
        });

        this.indentSize.addEventListener('change', () => {
            if (this.currentJSON) {
                this.formatJSON();
            }
        });

        // 快捷键支持
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'v':
                        if (document.activeElement !== this.jsonInput) {
                            e.preventDefault();
                            this.pasteText();
                        }
                        break;
                    case 'Enter':
                        e.preventDefault();
                        this.formatJSON();
                        break;
                    case 'l':
                        e.preventDefault();
                        this.clearInput();
                        break;
                }
            }
        });
    }

    updateInputInfo() {
        const text = this.jsonInput.value;
        const charCount = text.length;
        const size = new Blob([text]).size;
        
        this.inputCharCount.textContent = charCount.toLocaleString();
        this.inputSize.textContent = this.formatBytes(size);
        
        if (charCount === 0) {
            this.inputStatus.textContent = '等待输入';
            this.inputStatus.className = 'info-value';
        } else {
            this.validateJSON();
        }
    }

    updateOutputInfo() {
        const text = this.jsonOutput.textContent;
        const charCount = text.length;
        const size = new Blob([text]).size;
        
        this.outputCharCount.textContent = charCount.toLocaleString();
        this.outputSize.textContent = this.formatBytes(size);
    }

    updateLineNumbers() {
        this.updateInputLineNumbers();
        this.updateOutputLineNumbers();
    }

    updateInputLineNumbers() {
        const lines = this.jsonInput.value.split('\n').length;
        const lineNumbers = [];
        for (let i = 1; i <= lines; i++) {
            lineNumbers.push(i);
        }
        this.inputLineNumbers.textContent = lineNumbers.join('\n');
    }

    updateOutputLineNumbers() {
        const lines = this.jsonOutput.textContent.split('\n').length;
        const lineNumbers = [];
        for (let i = 1; i <= lines; i++) {
            lineNumbers.push(i);
        }
        this.outputLineNumbers.textContent = lineNumbers.join('\n');
    }

    syncLineNumbers() {
        const scrollTop = this.jsonInput.scrollTop;
        this.inputLineNumbers.scrollTop = scrollTop;
    }

    validateJSON() {
        const text = this.jsonInput.value.trim();
        
        if (!text) {
            this.inputStatus.textContent = '等待输入';
            this.inputStatus.className = 'info-value';
            this.hideError();
            return false;
        }

        try {
            const parsed = JSON.parse(text);
            this.currentJSON = parsed;
            this.inputStatus.textContent = '有效JSON';
            this.inputStatus.className = 'info-value valid';
            this.hideError();
            this.analyzeJSON(parsed);
            return true;
        } catch (error) {
            this.inputStatus.textContent = '无效JSON';
            this.inputStatus.className = 'info-value invalid';
            this.showError(error);
            this.clearAnalysis();
            return false;
        }
    }

    formatJSON() {
        if (!this.validateJSON()) {
            return;
        }

        const formatType = document.querySelector('input[name="format"]:checked').value;
        const indent = this.getIndentValue();
        
        try {
            let formatted;
            if (formatType === 'compact') {
                formatted = JSON.stringify(this.currentJSON);
            } else {
                formatted = JSON.stringify(this.currentJSON, null, indent);
            }
            
            this.jsonOutput.innerHTML = this.highlightJSON(formatted);
            this.outputStatus.textContent = '格式化成功';
            this.outputStatus.className = 'info-value valid';
            this.updateOutputInfo();
            this.updateOutputLineNumbers();
            
        } catch (error) {
            this.outputStatus.textContent = '格式化失败';
            this.outputStatus.className = 'info-value invalid';
            this.jsonOutput.textContent = '格式化失败: ' + error.message;
        }
    }

    getIndentValue() {
        const value = this.indentSize.value;
        if (value === 'tab') {
            return '\t';
        }
        return parseInt(value);
    }

    highlightJSON(json) {
        return json
            .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
                let cls = 'json-number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'json-key';
                    } else {
                        cls = 'json-string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'json-boolean';
                } else if (/null/.test(match)) {
                    cls = 'json-null';
                }
                return `<span class="${cls}">${match}</span>`;
            })
            .replace(/([{}[\],])/g, '<span class="json-punctuation">$1</span>');
    }

    analyzeJSON(json) {
        const analysis = this.getJSONAnalysis(json);
        
        this.dataType.textContent = analysis.dataType;
        this.depth.textContent = analysis.depth;
        this.propertyCount.textContent = analysis.propertyCount;
        this.stringCount.textContent = analysis.stringCount;
        this.numberCount.textContent = analysis.numberCount;
        this.booleanCount.textContent = analysis.booleanCount;
        this.nullCount.textContent = analysis.nullCount;
        this.objectCount.textContent = analysis.objectCount;
        this.arrayCount.textContent = analysis.arrayCount;
        this.maxArrayLength.textContent = analysis.maxArrayLength;
    }

    getJSONAnalysis(json) {
        const analysis = {
            dataType: this.getDataType(json),
            depth: 0,
            propertyCount: 0,
            stringCount: 0,
            numberCount: 0,
            booleanCount: 0,
            nullCount: 0,
            objectCount: 0,
            arrayCount: 0,
            maxArrayLength: 0
        };

        this.analyzeValue(json, analysis, 1);
        return analysis;
    }

    analyzeValue(value, analysis, depth) {
        analysis.depth = Math.max(analysis.depth, depth);

        if (value === null) {
            analysis.nullCount++;
        } else if (typeof value === 'boolean') {
            analysis.booleanCount++;
        } else if (typeof value === 'number') {
            analysis.numberCount++;
        } else if (typeof value === 'string') {
            analysis.stringCount++;
        } else if (Array.isArray(value)) {
            analysis.arrayCount++;
            analysis.maxArrayLength = Math.max(analysis.maxArrayLength, value.length);
            value.forEach(item => {
                this.analyzeValue(item, analysis, depth + 1);
            });
        } else if (typeof value === 'object') {
            analysis.objectCount++;
            const keys = Object.keys(value);
            analysis.propertyCount += keys.length;
            keys.forEach(key => {
                this.analyzeValue(value[key], analysis, depth + 1);
            });
        }
    }

    getDataType(value) {
        if (value === null) return 'null';
        if (Array.isArray(value)) return '数组';
        if (typeof value === 'object') return '对象';
        if (typeof value === 'string') return '字符串';
        if (typeof value === 'number') return '数字';
        if (typeof value === 'boolean') return '布尔值';
        return '未知';
    }

    clearAnalysis() {
        this.dataType.textContent = '-';
        this.depth.textContent = '-';
        this.propertyCount.textContent = '-';
        this.stringCount.textContent = '-';
        this.numberCount.textContent = '-';
        this.booleanCount.textContent = '-';
        this.nullCount.textContent = '-';
        this.objectCount.textContent = '-';
        this.arrayCount.textContent = '-';
        this.maxArrayLength.textContent = '-';
    }

    showError(error) {
        this.errorMessage.textContent = error.message;
        
        // 尝试提取错误位置
        const match = error.message.match(/position (\d+)/);
        if (match) {
            const position = parseInt(match[1]);
            const text = this.jsonInput.value;
            const lines = text.substring(0, position).split('\n');
            const line = lines.length;
            const column = lines[lines.length - 1].length + 1;
            this.errorLocation.textContent = `错误位置：第 ${line} 行，第 ${column} 列`;
        } else {
            this.errorLocation.textContent = '';
        }
        
        this.errorSection.style.display = 'block';
    }

    hideError() {
        this.errorSection.style.display = 'none';
    }

    async pasteText() {
        try {
            const text = await navigator.clipboard.readText();
            this.jsonInput.value = text;
            this.jsonInput.focus();
            this.updateInputInfo();
            this.updateLineNumbers();
            this.validateJSON();
        } catch (err) {
            console.error('无法读取剪贴板内容:', err);
            alert('无法读取剪贴板内容，请手动粘贴');
        }
    }

    clearInput() {
        this.jsonInput.value = '';
        this.jsonOutput.textContent = '格式化后的JSON将在这里显示';
        this.currentJSON = null;
        this.jsonInput.focus();
        this.updateInputInfo();
        this.updateOutputInfo();
        this.updateLineNumbers();
        this.hideError();
        this.clearAnalysis();
        this.outputStatus.textContent = '等待格式化';
        this.outputStatus.className = 'info-value';
    }

    async copyOutput() {
        try {
            const text = this.jsonOutput.textContent;
            await navigator.clipboard.writeText(text);
            
            const originalText = this.copyBtn.textContent;
            this.copyBtn.textContent = '已复制';
            setTimeout(() => {
                this.copyBtn.textContent = originalText;
            }, 2000);
        } catch (err) {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制');
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new JSONFormatter();
});