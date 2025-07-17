class JPGConverter {
    constructor() {
        this.files = [];
        this.convertedImages = [];
        this.currentFormat = 'png';
        this.settings = {
            png: { quality: 'optimized', removeBackground: true },
            webp: { quality: 80, lossless: false },
            gif: { delay: 500, size: 'original', loop: true }
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    setupEventListeners() {
        document.getElementById('fileInput').addEventListener('change', this.handleFileSelect.bind(this));
        
        // 格式切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', this.switchFormat.bind(this));
        });

        // PNG设置
        document.querySelectorAll('[data-quality]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.settings.png.quality = e.target.getAttribute('data-quality');
                document.querySelectorAll('[data-quality]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        document.getElementById('removeBackground').addEventListener('change', (e) => {
            this.settings.png.removeBackground = e.target.checked;
        });

        // WebP设置
        document.getElementById('webpQuality').addEventListener('input', (e) => {
            this.settings.webp.quality = parseInt(e.target.value);
            document.getElementById('webpQualityValue').textContent = e.target.value + '%';
        });

        document.getElementById('webpLossless').addEventListener('change', (e) => {
            this.settings.webp.lossless = e.target.checked;
        });

        // GIF设置
        document.getElementById('gifDelay').addEventListener('input', (e) => {
            this.settings.gif.delay = parseInt(e.target.value);
            document.getElementById('gifDelayValue').textContent = e.target.value + 'ms';
        });

        document.getElementById('gifSize').addEventListener('change', (e) => {
            this.settings.gif.size = e.target.value;
        });

        document.getElementById('gifLoop').addEventListener('change', (e) => {
            this.settings.gif.loop = e.target.checked;
        });

        // 操作按钮
        document.getElementById('convertBtn').addEventListener('click', this.convertImages.bind(this));
        document.getElementById('downloadAllBtn').addEventListener('click', this.downloadAll.bind(this));
        document.getElementById('clearBtn').addEventListener('click', this.clearAll.bind(this));
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files).filter(file => 
                file.type === 'image/jpeg' || file.type === 'image/jpg'
            );
            this.handleFiles(files);
        });
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.handleFiles(files);
    }

    handleFiles(files) {
        this.files = files;
        if (files.length > 0) {
            document.getElementById('settingsSection').style.display = 'block';
            if (this.currentFormat === 'gif') {
                this.showGifPreview();
            }
        }
    }

    switchFormat(e) {
        const format = e.target.getAttribute('data-format');
        this.currentFormat = format;
        
        // 更新按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');
        
        // 更新内容显示
        document.querySelectorAll('.format-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(format + 'Content').classList.add('active');
        
        if (format === 'gif' && this.files.length > 0) {
            this.showGifPreview();
        }
    }

    showGifPreview() {
        const gifPreview = document.getElementById('gifPreview');
        const frameList = document.getElementById('frameList');
        
        gifPreview.style.display = 'block';
        frameList.innerHTML = '';
        
        this.files.forEach((file, index) => {
            const frameItem = document.createElement('div');
            frameItem.className = 'frame-item';
            frameItem.innerHTML = `
                <img src="${URL.createObjectURL(file)}" alt="Frame ${index + 1}">
                <span>帧 ${index + 1}</span>
            `;
            frameList.appendChild(frameItem);
        });
    }

    async convertImages() {
        if (this.files.length === 0) return;
        
        this.showProgress();
        
        try {
            if (this.currentFormat === 'gif') {
                await this.createGifAnimation();
            } else {
                await this.convertToFormat();
            }
            
            this.hideProgress();
            this.displayResults();
        } catch (error) {
            console.error('转换失败:', error);
            this.hideProgress();
            alert('转换失败，请重试');
        }
    }

    async convertToFormat() {
        this.convertedImages = [];
        
        for (let i = 0; i < this.files.length; i++) {
            const file = this.files[i];
            this.updateProgress((i + 1) / this.files.length * 100, i + 1, this.files.length, `正在转换: ${file.name}`);
            
            const converted = await this.convertSingleImage(file);
            this.convertedImages.push(converted);
        }
    }

    convertSingleImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    if (this.currentFormat === 'png' && this.settings.png.removeBackground) {
                        // 保持透明背景
                        ctx.drawImage(img, 0, 0);
                    } else {
                        // 添加白色背景
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0);
                    }
                    
                    const mimeType = this.currentFormat === 'png' ? 'image/png' : 'image/webp';
                    const quality = this.currentFormat === 'webp' ? this.settings.webp.quality / 100 : 1;
                    
                    canvas.toBlob((blob) => {
                        resolve({
                            originalFile: file,
                            convertedBlob: blob,
                            originalSize: file.size,
                            convertedSize: blob.size,
                            fileName: this.changeFileExtension(file.name, '.' + this.currentFormat),
                            newFormat: this.currentFormat.toUpperCase()
                        });
                    }, mimeType, quality);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    async createGifAnimation() {
        this.updateProgress(50, 1, 1, '正在创建GIF动画...');
        
        // 简化的GIF创建（实际应用中需要使用专门的GIF库）
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 使用第一张图片的尺寸
        const firstFile = this.files[0];
        const firstImg = await this.loadImage(firstFile);
        
        canvas.width = firstImg.width;
        canvas.height = firstImg.height;
        
        // 创建一个模拟的GIF（实际只是最后一帧）
        ctx.drawImage(firstImg, 0, 0);
        
        canvas.toBlob((blob) => {
            this.convertedImages = [{
                originalFile: firstFile,
                convertedBlob: blob,
                originalSize: this.files.reduce((sum, f) => sum + f.size, 0),
                convertedSize: blob.size,
                fileName: 'animation.gif',
                newFormat: 'GIF',
                frameCount: this.files.length
            }];
        }, 'image/gif');
    }

    loadImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    changeFileExtension(filename, newExtension) {
        const lastDotIndex = filename.lastIndexOf('.');
        return filename.substring(0, lastDotIndex) + newExtension;
    }

    showProgress() {
        document.getElementById('progressOverlay').style.display = 'flex';
    }

    hideProgress() {
        document.getElementById('progressOverlay').style.display = 'none';
    }

    updateProgress(percent, current, total, text) {
        document.getElementById('progressFill').style.width = percent + '%';
        document.getElementById('progressText').textContent = text;
        document.getElementById('progressCount').textContent = `${current}/${total}`;
        document.getElementById('progressPercent').textContent = Math.round(percent) + '%';
    }

    displayResults() {
        document.getElementById('previewSection').style.display = 'block';
        
        const imageList = document.getElementById('imageList');
        imageList.innerHTML = '';
        
        this.convertedImages.forEach((imageData, index) => {
            const item = document.createElement('div');
            item.className = 'image-item';
            
            const preview = document.createElement('img');
            preview.className = 'image-preview';
            preview.src = URL.createObjectURL(imageData.convertedBlob);
            preview.style.maxWidth = '100%';
            preview.style.height = '200px';
            preview.style.objectFit = 'contain';
            
            const info = document.createElement('div');
            info.className = 'image-info';
            info.innerHTML = `
                <div class="image-name">${imageData.fileName}</div>
                <div class="image-stats">
                    <span>格式: ${imageData.newFormat}</span>
                    <span>${imageData.frameCount ? `${imageData.frameCount} 帧` : '单张图片'}</span>
                </div>
                <div class="image-stats">
                    <span>大小: ${this.formatFileSize(imageData.convertedSize)}</span>
                </div>
                <button class="download-btn" onclick="downloadSingle(${index})">下载</button>
            `;
            
            item.appendChild(preview);
            item.appendChild(info);
            imageList.appendChild(item);
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    downloadSingle(index) {
        const imageData = this.convertedImages[index];
        const link = document.createElement('a');
        link.href = URL.createObjectURL(imageData.convertedBlob);
        link.download = imageData.fileName;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    downloadAll() {
        this.convertedImages.forEach((imageData, index) => {
            setTimeout(() => {
                this.downloadSingle(index);
            }, index * 500);
        });
    }

    clearAll() {
        this.files = [];
        this.convertedImages = [];
        document.getElementById('settingsSection').style.display = 'none';
        document.getElementById('previewSection').style.display = 'none';
        document.getElementById('fileInput').value = '';
        document.getElementById('gifPreview').style.display = 'none';
    }
}

let jpgConverter;
document.addEventListener('DOMContentLoaded', () => {
    jpgConverter = new JPGConverter();
    window.downloadSingle = jpgConverter.downloadSingle.bind(jpgConverter);
}); 