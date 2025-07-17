class ImageToJPGConverter {
    constructor() {
        this.files = [];
        this.convertedImages = [];
        this.settings = {
            quality: 85,
            backgroundColor: '#FFFFFF',
            sizeOption: 'original',
            resizeWidth: null,
            resizeHeight: null,
            keepAspectRatio: true
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    setupEventListeners() {
        // 文件上传
        document.getElementById('fileInput').addEventListener('change', this.handleFileSelect.bind(this));

        // 质量控制
        const qualitySlider = document.getElementById('jpgQuality');
        const qualityValue = document.getElementById('qualityValue');
        qualitySlider.addEventListener('input', (e) => {
            this.settings.quality = parseInt(e.target.value);
            qualityValue.textContent = e.target.value + '%';
        });

        // 质量预设
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const quality = parseInt(e.target.getAttribute('data-quality'));
                this.settings.quality = quality;
                qualitySlider.value = quality;
                qualityValue.textContent = quality + '%';
                
                // 更新按钮状态
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // 尺寸选项
        document.querySelectorAll('input[name="sizeOption"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.settings.sizeOption = e.target.value;
                const resizeControls = document.getElementById('resizeControls');
                resizeControls.style.display = e.target.value === 'resize' ? 'block' : 'none';
            });
        });

        // 尺寸输入
        document.getElementById('resizeWidth').addEventListener('input', (e) => {
            this.settings.resizeWidth = parseInt(e.target.value) || null;
            if (this.settings.keepAspectRatio && this.settings.resizeWidth && this.files.length > 0) {
                this.updateHeightFromWidth();
            }
        });

        document.getElementById('resizeHeight').addEventListener('input', (e) => {
            this.settings.resizeHeight = parseInt(e.target.value) || null;
            if (this.settings.keepAspectRatio && this.settings.resizeHeight && this.files.length > 0) {
                this.updateWidthFromHeight();
            }
        });

        document.getElementById('keepAspectRatio').addEventListener('change', (e) => {
            this.settings.keepAspectRatio = e.target.checked;
        });

        // 背景色选择
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const colorData = e.currentTarget.getAttribute('data-color');
                
                if (colorData === 'custom') {
                    this.settings.backgroundColor = document.getElementById('customColor').value;
                } else {
                    this.settings.backgroundColor = colorData;
                }
                
                // 更新选中状态
                document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        document.getElementById('customColor').addEventListener('change', (e) => {
            this.settings.backgroundColor = e.target.value;
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
                file.type.startsWith('image/') && !file.type.includes('jpeg')
            );
            this.handleFiles(files);
        });
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files).filter(file => 
            file.type.startsWith('image/') && !file.type.includes('jpeg')
        );
        this.handleFiles(files);
    }

    handleFiles(files) {
        this.files = files;
        if (files.length > 0) {
            this.showSettings();
            this.preloadFirstImage();
        }
    }

    preloadFirstImage() {
        if (this.files.length === 0) return;
        
        const firstFile = this.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // 设置默认尺寸
                document.getElementById('resizeWidth').placeholder = `原始: ${img.width}px`;
                document.getElementById('resizeHeight').placeholder = `原始: ${img.height}px`;
                
                this.originalAspectRatio = img.width / img.height;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(firstFile);
    }

    updateHeightFromWidth() {
        if (!this.originalAspectRatio) return;
        const height = Math.round(this.settings.resizeWidth / this.originalAspectRatio);
        document.getElementById('resizeHeight').value = height;
        this.settings.resizeHeight = height;
    }

    updateWidthFromHeight() {
        if (!this.originalAspectRatio) return;
        const width = Math.round(this.settings.resizeHeight * this.originalAspectRatio);
        document.getElementById('resizeWidth').value = width;
        this.settings.resizeWidth = width;
    }

    showSettings() {
        document.getElementById('settingsSection').style.display = 'block';
    }

    async convertImages() {
        if (this.files.length === 0) return;

        this.showProgress();
        this.convertedImages = [];

        for (let i = 0; i < this.files.length; i++) {
            const file = this.files[i];
            const progress = ((i + 1) / this.files.length) * 100;
            
            this.updateProgress(progress, i + 1, this.files.length, `正在转换: ${file.name}`);

            try {
                const convertedImage = await this.convertImage(file);
                this.convertedImages.push(convertedImage);
            } catch (error) {
                console.error('转换失败:', error);
            }
        }

        this.hideProgress();
        this.displayResults();
    }

    convertImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // 计算目标尺寸
                    let targetWidth = img.width;
                    let targetHeight = img.height;
                    
                    if (this.settings.sizeOption === 'resize') {
                        if (this.settings.resizeWidth && this.settings.resizeHeight) {
                            targetWidth = this.settings.resizeWidth;
                            targetHeight = this.settings.resizeHeight;
                        } else if (this.settings.resizeWidth) {
                            targetWidth = this.settings.resizeWidth;
                            targetHeight = this.settings.keepAspectRatio ? 
                                Math.round(targetWidth / (img.width / img.height)) : img.height;
                        } else if (this.settings.resizeHeight) {
                            targetHeight = this.settings.resizeHeight;
                            targetWidth = this.settings.keepAspectRatio ? 
                                Math.round(targetHeight * (img.width / img.height)) : img.width;
                        }
                    }
                    
                    canvas.width = targetWidth;
                    canvas.height = targetHeight;
                    
                    // 设置背景色
                    ctx.fillStyle = this.settings.backgroundColor;
                    ctx.fillRect(0, 0, targetWidth, targetHeight);
                    
                    // 绘制图像
                    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                    
                    // 转换为JPG
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const originalFormat = file.type.split('/')[1].toUpperCase();
                            const compressionRatio = ((file.size - blob.size) / file.size * 100).toFixed(1);
                            
                            resolve({
                                originalFile: file,
                                convertedBlob: blob,
                                originalSize: file.size,
                                convertedSize: blob.size,
                                originalFormat: originalFormat,
                                newFormat: 'JPG',
                                compressionRatio: compressionRatio,
                                fileName: this.changeFileExtension(file.name, '.jpg'),
                                originalDimensions: `${img.width}×${img.height}`,
                                newDimensions: `${targetWidth}×${targetHeight}`
                            });
                        } else {
                            reject(new Error('转换失败'));
                        }
                    }, 'image/jpeg', this.settings.quality / 100);
                };
                img.onerror = () => reject(new Error('图像加载失败'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsDataURL(file);
        });
    }

    changeFileExtension(filename, newExtension) {
        const lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex !== -1) {
            return filename.substring(0, lastDotIndex) + newExtension;
        }
        return filename + newExtension;
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
        
        // 显示统计信息
        this.displayStats();
        
        // 显示图像列表
        const imageList = document.getElementById('imageList');
        imageList.innerHTML = '';

        this.convertedImages.forEach((imageData, index) => {
            const imageItem = this.createImageItem(imageData, index);
            imageList.appendChild(imageItem);
        });
    }

    displayStats() {
        const totalOriginalSize = this.convertedImages.reduce((sum, img) => sum + img.originalSize, 0);
        const totalConvertedSize = this.convertedImages.reduce((sum, img) => sum + img.convertedSize, 0);
        const averageCompression = this.convertedImages.reduce((sum, img) => sum + parseFloat(img.compressionRatio), 0) / this.convertedImages.length;

        const statsContainer = document.getElementById('conversionStats');
        statsContainer.innerHTML = `
            <div class="stat-item">
                <div class="stat-value">${this.convertedImages.length}</div>
                <div class="stat-label">转换文件</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${this.formatFileSize(totalOriginalSize)}</div>
                <div class="stat-label">原始大小</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${this.formatFileSize(totalConvertedSize)}</div>
                <div class="stat-label">转换后大小</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${averageCompression.toFixed(1)}%</div>
                <div class="stat-label">平均压缩率</div>
            </div>
        `;
    }

    createImageItem(imageData, index) {
        const item = document.createElement('div');
        item.className = 'image-item';

        const comparison = document.createElement('div');
        comparison.className = 'image-comparison';

        // 原始图像
        const originalSide = document.createElement('div');
        originalSide.className = 'image-side';
        const originalImg = document.createElement('img');
        originalImg.src = URL.createObjectURL(imageData.originalFile);
        const originalLabel = document.createElement('div');
        originalLabel.className = 'image-label';
        originalLabel.textContent = imageData.originalFormat;
        originalSide.appendChild(originalImg);
        originalSide.appendChild(originalLabel);

        // 转换后图像
        const convertedSide = document.createElement('div');
        convertedSide.className = 'image-side';
        const convertedImg = document.createElement('img');
        convertedImg.src = URL.createObjectURL(imageData.convertedBlob);
        const convertedLabel = document.createElement('div');
        convertedLabel.className = 'image-label';
        convertedLabel.textContent = 'JPG';
        convertedSide.appendChild(convertedImg);
        convertedSide.appendChild(convertedLabel);

        comparison.appendChild(originalSide);
        comparison.appendChild(convertedSide);

        const info = document.createElement('div');
        info.className = 'image-info';

        const name = document.createElement('div');
        name.className = 'image-name';
        name.textContent = imageData.fileName;

        const stats = document.createElement('div');
        stats.className = 'image-stats';
        stats.innerHTML = `
            <span>${imageData.originalDimensions} → ${imageData.newDimensions}</span>
            <span class="format-change">${imageData.originalFormat} → JPG</span>
        `;

        const sizeInfo = document.createElement('div');
        sizeInfo.className = 'image-stats';
        sizeInfo.innerHTML = `
            <span>${this.formatFileSize(imageData.originalSize)} → ${this.formatFileSize(imageData.convertedSize)}</span>
            <span>-${imageData.compressionRatio}%</span>
        `;

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn';
        downloadBtn.textContent = '下载JPG';
        downloadBtn.onclick = () => this.downloadImage(imageData);

        info.appendChild(name);
        info.appendChild(stats);
        info.appendChild(sizeInfo);
        info.appendChild(downloadBtn);

        item.appendChild(comparison);
        item.appendChild(info);

        return item;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    downloadImage(imageData) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(imageData.convertedBlob);
        link.download = imageData.fileName;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    async downloadAll() {
        if (this.convertedImages.length === 0) return;

        if (this.convertedImages.length === 1) {
            this.downloadImage(this.convertedImages[0]);
            return;
        }

        for (let i = 0; i < this.convertedImages.length; i++) {
            setTimeout(() => {
                this.downloadImage(this.convertedImages[i]);
            }, i * 500);
        }
    }

    clearAll() {
        this.files = [];
        this.convertedImages = [];
        document.getElementById('settingsSection').style.display = 'none';
        document.getElementById('previewSection').style.display = 'none';
        document.getElementById('fileInput').value = '';
        
        // 重置设置
        document.getElementById('jpgQuality').value = 85;
        document.getElementById('qualityValue').textContent = '85%';
        document.querySelector('[data-quality="85"]').classList.add('active');
        document.querySelector('input[value="original"]').checked = true;
        document.getElementById('resizeControls').style.display = 'none';
        
        // 清理对象URL
        document.querySelectorAll('.image-comparison img').forEach(img => {
            URL.revokeObjectURL(img.src);
        });
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new ImageToJPGConverter();
});