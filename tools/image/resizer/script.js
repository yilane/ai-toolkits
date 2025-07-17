class ImageResizer {
    constructor() {
        this.files = [];
        this.processedImages = [];
        this.currentTab = 'percentage';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    setupEventListeners() {
        const fileInput = document.getElementById('fileInput');
        const qualitySlider = document.getElementById('qualitySlider');
        const qualityValue = document.getElementById('qualityValue');
        const processBtn = document.getElementById('processBtn');
        const downloadAllBtn = document.getElementById('downloadAllBtn');
        const clearBtn = document.getElementById('clearBtn');
        const tabBtns = document.querySelectorAll('.tab-btn');
        const presetBtns = document.querySelectorAll('.preset-btn');

        // 文件选择
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // 质量滑块
        qualitySlider.addEventListener('input', (e) => {
            qualityValue.textContent = e.target.value + '%';
        });

        // 处理按钮
        processBtn.addEventListener('click', this.processImages.bind(this));

        // 批量操作
        downloadAllBtn.addEventListener('click', this.downloadAll.bind(this));
        clearBtn.addEventListener('click', this.clearAll.bind(this));

        // 标签页切换
        tabBtns.forEach(btn => {
            btn.addEventListener('click', this.switchTab.bind(this));
        });

        // 预设尺寸
        presetBtns.forEach(btn => {
            btn.addEventListener('click', this.selectPreset.bind(this));
        });

        // 宽高比保持
        document.getElementById('maintainAspectRatio2').addEventListener('change', this.toggleAspectRatio.bind(this));
        document.getElementById('targetWidth').addEventListener('input', this.updateHeight.bind(this));
        document.getElementById('targetHeight').addEventListener('input', this.updateWidth.bind(this));
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
                file.type.startsWith('image/')
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
            this.showSettings();
            this.preloadImages();
        }
    }

    preloadImages() {
        // 预加载图片以获取原始尺寸
        this.files.forEach(file => {
            const img = new Image();
            img.onload = () => {
                file.originalWidth = img.width;
                file.originalHeight = img.height;
                this.updateDimensionInputs(img.width, img.height);
            };
            img.src = URL.createObjectURL(file);
        });
    }

    updateDimensionInputs(width, height) {
        if (this.files.length === 1) {
            document.getElementById('targetWidth').placeholder = `原始: ${width}px`;
            document.getElementById('targetHeight').placeholder = `原始: ${height}px`;
        }
    }

    showSettings() {
        document.getElementById('settingsSection').style.display = 'block';
    }

    switchTab(e) {
        const tabName = e.target.getAttribute('data-tab');
        
        // 更新按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');

        // 更新内容显示
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName + 'Tab').classList.add('active');

        this.currentTab = tabName;
    }

    selectPreset(e) {
        const width = parseInt(e.target.getAttribute('data-width'));
        const height = parseInt(e.target.getAttribute('data-height'));
        
        document.getElementById('targetWidth').value = width;
        document.getElementById('targetHeight').value = height;
        
        // 切换到像素标签页
        this.switchTab({ target: document.querySelector('[data-tab="pixels"]') });
    }

    toggleAspectRatio() {
        const maintainRatio = document.getElementById('maintainAspectRatio2').checked;
        if (maintainRatio && this.files.length > 0) {
            const file = this.files[0];
            if (file.originalWidth && file.originalHeight) {
                this.updateHeight();
            }
        }
    }

    updateHeight() {
        const maintainRatio = document.getElementById('maintainAspectRatio2').checked;
        if (!maintainRatio || this.files.length === 0) return;

        const file = this.files[0];
        const width = parseInt(document.getElementById('targetWidth').value);
        
        if (width && file.originalWidth && file.originalHeight) {
            const aspectRatio = file.originalHeight / file.originalWidth;
            const height = Math.round(width * aspectRatio);
            document.getElementById('targetHeight').value = height;
        }
    }

    updateWidth() {
        const maintainRatio = document.getElementById('maintainAspectRatio2').checked;
        if (!maintainRatio || this.files.length === 0) return;

        const file = this.files[0];
        const height = parseInt(document.getElementById('targetHeight').value);
        
        if (height && file.originalWidth && file.originalHeight) {
            const aspectRatio = file.originalWidth / file.originalHeight;
            const width = Math.round(height * aspectRatio);
            document.getElementById('targetWidth').value = width;
        }
    }

    async processImages() {
        if (this.files.length === 0) return;

        const progressOverlay = document.getElementById('progressOverlay');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        progressOverlay.style.display = 'flex';
        this.processedImages = [];

        const quality = parseInt(document.getElementById('qualitySlider').value) / 100;

        for (let i = 0; i < this.files.length; i++) {
            const file = this.files[i];
            const progress = ((i + 1) / this.files.length) * 100;
            
            progressFill.style.width = progress + '%';
            progressText.textContent = `正在调整 ${i + 1}/${this.files.length}: ${file.name}`;

            try {
                const dimensions = this.calculateDimensions(file);
                const processedImage = await this.resizeImage(file, dimensions.width, dimensions.height, quality);
                this.processedImages.push(processedImage);
            } catch (error) {
                console.error('尺寸调整失败:', error);
            }
        }

        progressOverlay.style.display = 'none';
        this.displayResults();
    }

    calculateDimensions(file) {
        const originalWidth = file.originalWidth;
        const originalHeight = file.originalHeight;

        switch (this.currentTab) {
            case 'percentage':
                const scale = parseFloat(document.getElementById('scalePercent').value) / 100;
                return {
                    width: Math.round(originalWidth * scale),
                    height: Math.round(originalHeight * scale)
                };

            case 'pixels':
                let targetWidth = parseInt(document.getElementById('targetWidth').value) || originalWidth;
                let targetHeight = parseInt(document.getElementById('targetHeight').value) || originalHeight;

                const maintainRatio = document.getElementById('maintainAspectRatio2').checked;
                if (maintainRatio) {
                    const aspectRatio = originalWidth / originalHeight;
                    if (targetWidth && !document.getElementById('targetHeight').value) {
                        targetHeight = Math.round(targetWidth / aspectRatio);
                    } else if (targetHeight && !document.getElementById('targetWidth').value) {
                        targetWidth = Math.round(targetHeight * aspectRatio);
                    }
                }

                return { width: targetWidth, height: targetHeight };

            case 'presets':
                const presetWidth = parseInt(document.getElementById('targetWidth').value) || originalWidth;
                const presetHeight = parseInt(document.getElementById('targetHeight').value) || originalHeight;
                return { width: presetWidth, height: presetHeight };

            default:
                return { width: originalWidth, height: originalHeight };
        }
    }

    resizeImage(file, targetWidth, targetHeight, quality) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                canvas.width = targetWidth;
                canvas.height = targetHeight;

                // 使用更好的缩放算法
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve({
                            originalFile: file,
                            processedBlob: blob,
                            originalWidth: file.originalWidth,
                            originalHeight: file.originalHeight,
                            newWidth: targetWidth,
                            newHeight: targetHeight,
                            originalSize: file.size,
                            newSize: blob.size,
                            fileName: file.name
                        });
                    } else {
                        reject(new Error('尺寸调整失败'));
                    }
                }, file.type, quality);
            };

            img.onerror = () => reject(new Error('图像加载失败'));
            img.src = URL.createObjectURL(file);
        });
    }

    displayResults() {
        const previewSection = document.getElementById('previewSection');
        const imageComparison = document.getElementById('imageComparison');

        previewSection.style.display = 'block';
        imageComparison.innerHTML = '';

        this.processedImages.forEach((imageData, index) => {
            const comparisonItem = this.createComparisonItem(imageData, index);
            imageComparison.appendChild(comparisonItem);
        });
    }

    createComparisonItem(imageData, index) {
        const item = document.createElement('div');
        item.className = 'comparison-item';

        const header = document.createElement('div');
        header.className = 'comparison-header';

        const title = document.createElement('div');
        title.className = 'comparison-title';
        title.textContent = imageData.fileName;

        const info = document.createElement('div');
        info.className = 'comparison-info';
        info.innerHTML = `
            ${imageData.originalWidth}×${imageData.originalHeight} → ${imageData.newWidth}×${imageData.newHeight}
        `;

        header.appendChild(title);
        header.appendChild(info);

        const images = document.createElement('div');
        images.className = 'comparison-images';

        const originalSide = document.createElement('div');
        originalSide.className = 'image-side';
        const originalImg = document.createElement('img');
        originalImg.src = URL.createObjectURL(imageData.originalFile);
        const originalLabel = document.createElement('div');
        originalLabel.className = 'image-label';
        originalLabel.textContent = '原始';
        originalSide.appendChild(originalImg);
        originalSide.appendChild(originalLabel);

        const processedSide = document.createElement('div');
        processedSide.className = 'image-side';
        const processedImg = document.createElement('img');
        processedImg.src = URL.createObjectURL(imageData.processedBlob);
        const processedLabel = document.createElement('div');
        processedLabel.className = 'image-label';
        processedLabel.textContent = '调整后';
        processedSide.appendChild(processedImg);
        processedSide.appendChild(processedLabel);

        images.appendChild(originalSide);
        images.appendChild(processedSide);

        const infoDiv = document.createElement('div');
        infoDiv.className = 'image-info';

        const sizeInfo = document.createElement('div');
        sizeInfo.className = 'size-info';
        sizeInfo.innerHTML = `
            <span>原始: ${this.formatFileSize(imageData.originalSize)}</span>
            <span>调整后: ${this.formatFileSize(imageData.newSize)}</span>
        `;

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn';
        downloadBtn.textContent = '下载';
        downloadBtn.onclick = () => this.downloadImage(imageData);

        infoDiv.appendChild(sizeInfo);
        infoDiv.appendChild(downloadBtn);

        item.appendChild(header);
        item.appendChild(images);
        item.appendChild(infoDiv);

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
        link.href = URL.createObjectURL(imageData.processedBlob);
        link.download = imageData.fileName;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    async downloadAll() {
        if (this.processedImages.length === 0) return;

        if (this.processedImages.length === 1) {
            this.downloadImage(this.processedImages[0]);
            return;
        }

        for (let i = 0; i < this.processedImages.length; i++) {
            setTimeout(() => {
                this.downloadImage(this.processedImages[i]);
            }, i * 500);
        }
    }

    clearAll() {
        this.files = [];
        this.processedImages = [];
        document.getElementById('settingsSection').style.display = 'none';
        document.getElementById('previewSection').style.display = 'none';
        document.getElementById('fileInput').value = '';
        
        // 重置表单
        document.getElementById('scalePercent').value = '100';
        document.getElementById('targetWidth').value = '';
        document.getElementById('targetHeight').value = '';
        document.getElementById('qualitySlider').value = '90';
        document.getElementById('qualityValue').textContent = '90%';
        
        // 清理对象URL
        document.querySelectorAll('.comparison-images img').forEach(img => {
            URL.revokeObjectURL(img.src);
        });
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new ImageResizer();
});