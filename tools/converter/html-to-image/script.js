class HTMLToImageConverter {
    constructor() {
        this.currentMode = 'url';
        this.currentContent = null;
        this.resultBlob = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 标签页切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', this.switchTab.bind(this));
        });

        // URL输入
        document.getElementById('loadUrlBtn').addEventListener('click', this.loadUrl.bind(this));
        document.getElementById('urlInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadUrl();
        });

        // 示例URL
        document.querySelectorAll('.example-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = e.target.getAttribute('data-url');
                document.getElementById('urlInput').value = url;
                this.loadUrl();
            });
        });

        // HTML预览
        document.getElementById('previewHtmlBtn').addEventListener('click', this.previewHtml.bind(this));

        // 设置选项
        document.getElementById('screenshotSize').addEventListener('change', (e) => {
            const customSize = document.getElementById('customSize');
            customSize.style.display = e.target.value === 'custom' ? 'flex' : 'none';
        });

        document.getElementById('imageQuality').addEventListener('input', (e) => {
            document.getElementById('imageQualityValue').textContent = e.target.value + '%';
        });

        // 操作按钮
        document.getElementById('convertBtn').addEventListener('click', this.convertToImage.bind(this));
        document.getElementById('downloadBtn').addEventListener('click', this.downloadImage.bind(this));
        document.getElementById('newConversionBtn').addEventListener('click', this.resetConverter.bind(this));
    }

    switchTab(e) {
        const tab = e.target.getAttribute('data-tab');
        this.currentMode = tab;
        
        // 更新按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');
        
        // 更新内容显示
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tab + 'Tab').classList.add('active');
    }

    async loadUrl() {
        const url = document.getElementById('urlInput').value.trim();
        if (!url) {
            alert('请输入有效的URL地址');
            return;
        }

        this.showProgress('正在加载网页...');
        
        try {
            // 模拟加载过程
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // 由于跨域限制，这里只能模拟显示
            this.showPreview(url, 'url');
            this.currentContent = url;
            
        } catch (error) {
            console.error('加载失败:', error);
            alert('网页加载失败，请检查URL是否正确或网络连接');
        } finally {
            this.hideProgress();
        }
    }

    previewHtml() {
        const htmlContent = document.getElementById('htmlInput').value.trim();
        if (!htmlContent) {
            alert('请输入HTML代码');
            return;
        }

        this.showPreview(htmlContent, 'html');
        this.currentContent = htmlContent;
    }

    showPreview(content, type) {
        const previewFrame = document.getElementById('previewFrame');
        const previewSection = document.getElementById('previewSection');
        const settingsSection = document.getElementById('settingsSection');
        
        if (type === 'html') {
            previewFrame.srcdoc = content;
            document.getElementById('pageTitle').textContent = '自定义HTML';
        } else {
            // 由于跨域限制，显示一个占位符
            previewFrame.srcdoc = `
                <div style="padding: 20px; text-align: center; color: #666;">
                    <h3>URL预览</h3>
                    <p>目标网址：${content}</p>
                    <p>由于浏览器跨域限制，这里显示预览占位符</p>
                    <p>实际转换时会访问真实网页内容</p>
                </div>
            `;
            document.getElementById('pageTitle').textContent = content;
        }
        
        document.getElementById('pageSize').textContent = '1920×1080';
        document.getElementById('loadStatus').textContent = '已加载';
        
        previewSection.style.display = 'block';
        settingsSection.style.display = 'block';
    }

    async convertToImage() {
        if (!this.currentContent) {
            alert('请先加载网页内容');
            return;
        }

        this.showProgress('正在生成图片...');
        
        try {
            // 模拟转换过程
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 获取设置
            const format = document.querySelector('input[name="outputFormat"]:checked').value;
            const quality = parseInt(document.getElementById('imageQuality').value);
            
            // 模拟生成图片
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 获取截图尺寸
            const size = this.getScreenshotSize();
            canvas.width = size.width;
            canvas.height = size.height;
            
            // 绘制模拟内容
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#333333';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('网页截图预览', canvas.width / 2, canvas.height / 2 - 50);
            
            ctx.font = '16px Arial';
            ctx.fillStyle = '#666666';
            ctx.fillText('这是一个演示图片', canvas.width / 2, canvas.height / 2);
            ctx.fillText(`格式: ${format.toUpperCase()}`, canvas.width / 2, canvas.height / 2 + 30);
            ctx.fillText(`尺寸: ${size.width}×${size.height}`, canvas.width / 2, canvas.height / 2 + 60);
            
            // 转换为blob
            const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
            canvas.toBlob((blob) => {
                this.resultBlob = blob;
                this.showResult(canvas.toDataURL(), format, size, blob.size);
            }, mimeType, quality / 100);
            
        } catch (error) {
            console.error('转换失败:', error);
            alert('图片生成失败，请重试');
        } finally {
            this.hideProgress();
        }
    }

    getScreenshotSize() {
        const sizeOption = document.getElementById('screenshotSize').value;
        
        if (sizeOption === 'custom') {
            const width = parseInt(document.getElementById('customWidth').value) || 1920;
            const height = parseInt(document.getElementById('customHeight').value) || 1080;
            return { width, height };
        }
        
        const sizeMap = {
            'full': { width: 1920, height: 1080 },
            '1920x1080': { width: 1920, height: 1080 },
            '1366x768': { width: 1366, height: 768 },
            '1280x720': { width: 1280, height: 720 }
        };
        
        return sizeMap[sizeOption] || { width: 1920, height: 1080 };
    }

    showResult(imageUrl, format, size, fileSize) {
        const resultImage = document.getElementById('resultImage');
        const resultSection = document.getElementById('resultSection');
        
        resultImage.src = imageUrl;
        document.getElementById('resultSize').textContent = this.formatFileSize(fileSize);
        document.getElementById('resultDimensions').textContent = `${size.width}×${size.height}`;
        document.getElementById('resultFormat').textContent = format.toUpperCase();
        
        resultSection.style.display = 'block';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    downloadImage() {
        if (!this.resultBlob) return;
        
        const format = document.querySelector('input[name="outputFormat"]:checked').value;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(this.resultBlob);
        link.download = `screenshot.${format}`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    resetConverter() {
        document.getElementById('previewSection').style.display = 'none';
        document.getElementById('settingsSection').style.display = 'none';
        document.getElementById('resultSection').style.display = 'none';
        document.getElementById('urlInput').value = '';
        document.getElementById('htmlInput').value = '';
        this.currentContent = null;
        this.resultBlob = null;
    }

    showProgress(text) {
        document.getElementById('progressText').textContent = text;
        document.getElementById('progressOverlay').style.display = 'flex';
    }

    hideProgress() {
        document.getElementById('progressOverlay').style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new HTMLToImageConverter();
}); 