class QRGenerator {
    constructor() {
        this.currentTab = 'text';
        this.generatedQR = null;
        
        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.inputTabs = document.querySelectorAll('.input-tab');
        this.tabContents = document.querySelectorAll('.tab-content');
        this.generateBtn = document.getElementById('generateBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.qrDisplay = document.getElementById('qrDisplay');
        this.qrActions = document.getElementById('qrActions');
        this.qrInfo = document.getElementById('qrInfo');
        
        // 输入元素
        this.textInput = document.getElementById('textInput');
        this.urlInput = document.getElementById('urlInput');
        this.wifiSSID = document.getElementById('wifiSSID');
        this.wifiPassword = document.getElementById('wifiPassword');
        this.wifiSecurity = document.getElementById('wifiSecurity');
        this.wifiHidden = document.getElementById('wifiHidden');
        this.emailAddress = document.getElementById('emailAddress');
        this.emailSubject = document.getElementById('emailSubject');
        this.emailBody = document.getElementById('emailBody');
        this.phoneNumber = document.getElementById('phoneNumber');
        
        // 设置元素
        this.errorLevel = document.getElementById('errorLevel');
        this.qrSize = document.getElementById('qrSize');
        this.foregroundColor = document.getElementById('foregroundColor');
        this.backgroundColor = document.getElementById('backgroundColor');
        
        // 信息显示元素
        this.contentType = document.getElementById('contentType');
        this.contentLength = document.getElementById('contentLength');
        this.errorLevelInfo = document.getElementById('errorLevelInfo');
        this.imageSizeInfo = document.getElementById('imageSizeInfo');
    }

    bindEvents() {
        // 标签切换
        this.inputTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });

        // 生成二维码
        this.generateBtn.addEventListener('click', () => {
            this.generateQR();
        });

        // 下载二维码
        this.downloadBtn.addEventListener('click', () => {
            this.downloadQR();
        });

        // 复制二维码
        this.copyBtn.addEventListener('click', () => {
            this.copyQR();
        });

        // 实时生成（输入变化时）
        const inputs = [
            this.textInput, this.urlInput, this.wifiSSID, this.wifiPassword,
            this.emailAddress, this.emailSubject, this.emailBody, this.phoneNumber
        ];
        
        inputs.forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    this.debounceGenerate();
                });
            }
        });

        // 设置变化时重新生成
        [this.errorLevel, this.qrSize, this.foregroundColor, this.backgroundColor].forEach(setting => {
            setting.addEventListener('change', () => {
                if (this.generatedQR) {
                    this.generateQR();
                }
            });
        });

        // WiFi 设置变化
        this.wifiSecurity.addEventListener('change', () => {
            this.debounceGenerate();
        });

        this.wifiHidden.addEventListener('change', () => {
            this.debounceGenerate();
        });
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        
        // 更新标签状态
        this.inputTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // 更新内容显示
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-content`);
        });
        
        // 清空之前的二维码
        this.clearQR();
    }

    getQRContent() {
        switch (this.currentTab) {
            case 'text':
                return this.textInput.value.trim();
            
            case 'url':
                const url = this.urlInput.value.trim();
                if (!url) return '';
                // 确保URL有协议
                return url.startsWith('http') ? url : `https://${url}`;
            
            case 'wifi':
                const ssid = this.wifiSSID.value.trim();
                const password = this.wifiPassword.value.trim();
                const security = this.wifiSecurity.value;
                const hidden = this.wifiHidden.checked;
                
                if (!ssid) return '';
                
                return `WIFI:T:${security};S:${ssid};P:${password};H:${hidden ? 'true' : 'false'};;`;
            
            case 'email':
                const email = this.emailAddress.value.trim();
                const subject = this.emailSubject.value.trim();
                const body = this.emailBody.value.trim();
                
                if (!email) return '';
                
                let mailto = `mailto:${email}`;
                const params = [];
                if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
                if (body) params.push(`body=${encodeURIComponent(body)}`);
                
                return params.length > 0 ? `${mailto}?${params.join('&')}` : mailto;
            
            case 'phone':
                const phone = this.phoneNumber.value.trim();
                return phone ? `tel:${phone}` : '';
            
            default:
                return '';
        }
    }

    async generateQR() {
        const content = this.getQRContent();
        
        if (!content) {
            this.showError('请输入要生成二维码的内容');
            return;
        }

        this.showLoading();
        
        try {
            const options = {
                width: parseInt(this.qrSize.value),
                margin: 2,
                color: {
                    dark: this.foregroundColor.value,
                    light: this.backgroundColor.value
                },
                errorCorrectionLevel: this.errorLevel.value
            };

            // 清空显示区域
            this.qrDisplay.innerHTML = '';
            
            // 生成二维码
            const canvas = document.createElement('canvas');
            await QRCode.toCanvas(canvas, content, options);
            
            // 显示二维码
            this.qrDisplay.appendChild(canvas);
            this.qrDisplay.classList.add('has-qr');
            
            // 保存生成的二维码
            this.generatedQR = {
                canvas: canvas,
                content: content,
                options: options
            };
            
            // 显示操作按钮和信息
            this.qrActions.style.display = 'flex';
            this.qrInfo.style.display = 'block';
            
            // 更新信息显示
            this.updateQRInfo(content, options);
            
            this.hideLoading();
            this.showSuccess('二维码生成成功！');
            
        } catch (error) {
            console.error('生成二维码失败:', error);
            this.showError('生成二维码失败，请检查输入内容');
            this.hideLoading();
        }
    }

    updateQRInfo(content, options) {
        // 内容类型
        const typeMap = {
            'text': '文本',
            'url': '链接',
            'wifi': 'WiFi',
            'email': '邮箱',
            'phone': '电话'
        };
        this.contentType.textContent = typeMap[this.currentTab] || '文本';
        
        // 字符长度
        this.contentLength.textContent = content.length;
        
        // 纠错等级
        const errorLevelMap = {
            'L': '低 (7%)',
            'M': '中 (15%)',
            'Q': '高 (25%)',
            'H': '最高 (30%)'
        };
        this.errorLevelInfo.textContent = errorLevelMap[options.errorCorrectionLevel];
        
        // 图片大小
        this.imageSizeInfo.textContent = `${options.width}x${options.width}px`;
    }

    downloadQR() {
        if (!this.generatedQR) return;
        
        const canvas = this.generatedQR.canvas;
        const link = document.createElement('a');
        link.download = `qrcode_${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    }

    async copyQR() {
        if (!this.generatedQR) return;
        
        try {
            const canvas = this.generatedQR.canvas;
            canvas.toBlob(async (blob) => {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({
                            'image/png': blob
                        })
                    ]);
                    this.showSuccess('二维码已复制到剪贴板');
                } catch (err) {
                    console.error('复制失败:', err);
                    this.showError('复制失败，请尝试下载');
                }
            });
        } catch (error) {
            console.error('复制失败:', error);
            this.showError('复制失败，请尝试下载');
        }
    }

    clearQR() {
        this.qrDisplay.innerHTML = `
            <div class="qr-placeholder">
                <div class="placeholder-icon">📱</div>
                <p>二维码将在这里显示</p>
            </div>
        `;
        this.qrDisplay.classList.remove('has-qr');
        this.qrActions.style.display = 'none';
        this.qrInfo.style.display = 'none';
        this.generatedQR = null;
    }

    showLoading() {
        this.generateBtn.disabled = true;
        this.generateBtn.innerHTML = `
            <div class="loading-spinner"></div>
            生成中...
        `;
    }

    hideLoading() {
        this.generateBtn.disabled = false;
        this.generateBtn.textContent = '生成二维码';
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type) {
        const existingMessage = document.querySelector('.error-message, .success-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageEl = document.createElement('div');
        messageEl.className = `${type}-message`;
        messageEl.textContent = message;
        messageEl.style.display = 'block';
        
        const inputSection = document.querySelector('.input-section');
        inputSection.insertBefore(messageEl, inputSection.firstChild);
        
        setTimeout(() => {
            messageEl.remove();
        }, 5000);
    }

    debounceGenerate() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            if (this.getQRContent()) {
                this.generateQR();
            }
        }, 500);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new QRGenerator();
});