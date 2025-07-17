class ImageEnhancer {
    constructor() {
        this.originalImage = null;
        this.originalFile = null;
        this.enhancedBlob = null;
        this.currentSettings = {
            mode: 'scale',
            scale: 2,
            enhanceType: 'photo',
            customScale: 2,
            sharpenLevel: 50,
            denoiseLevel: 30,
            preserveDetails: true,
            outputFormat: 'original',
            quality: 95
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

        // 标签页切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', this.switchTab.bind(this));
        });

        // 放大模式选择
        document.querySelectorAll('.scale-item').forEach(item => {
            item.addEventListener('click', this.selectScale.bind(this));
        });

        // 增强类型选择
        document.querySelectorAll('.enhance-item').forEach(item => {
            item.addEventListener('click', this.selectEnhanceType.bind(this));
        });

        // 自定义设置
        this.setupCustomControls();

        // 输出设置
        this.setupOutputControls();

        // 操作按钮
        document.getElementById('enhanceBtn').addEventListener('click', this.enhanceImage.bind(this));
        document.getElementById('downloadBtn').addEventListener('click', this.downloadImage.bind(this));
        document.getElementById('newEnhanceBtn').addEventListener('click', this.backToSettings.bind(this));
        document.getElementById('toggleCompare').addEventListener('click', this.toggleComparison.bind(this));
        document.getElementById('zoomBtn').addEventListener('click', this.zoomImages.bind(this));
    }

    setupCustomControls() {
        const customScale = document.getElementById('customScale');
        const customScaleValue = document.getElementById('customScaleValue');
        const sharpenLevel = document.getElementById('sharpenLevel');
        const sharpenValue = document.getElementById('sharpenValue');
        const denoiseLevel = document.getElementById('denoiseLevel');
        const denoiseValue = document.getElementById('denoiseValue');
        const preserveDetails = document.getElementById('preserveDetails');

        customScale.addEventListener('input', (e) => {
            this.currentSettings.customScale = parseFloat(e.target.value);
            customScaleValue.textContent = e.target.value + 'x';
        });

        sharpenLevel.addEventListener('input', (e) => {
            this.currentSettings.sharpenLevel = parseInt(e.target.value);
            sharpenValue.textContent = e.target.value + '%';
        });

        denoiseLevel.addEventListener('input', (e) => {
            this.currentSettings.denoiseLevel = parseInt(e.target.value);
            denoiseValue.textContent = e.target.value + '%';
        });

        preserveDetails.addEventListener('change', (e) => {
            this.currentSettings.preserveDetails = e.target.checked;
        });
    }

    setupOutputControls() {
        const outputFormat = document.getElementById('outputFormat');
        const qualitySlider = document.getElementById('qualitySlider');
        const qualityValue = document.getElementById('qualityValue');

        outputFormat.addEventListener('change', (e) => {
            this.currentSettings.outputFormat = e.target.value;
        });

        qualitySlider.addEventListener('input', (e) => {
            this.currentSettings.quality = parseInt(e.target.value);
            qualityValue.textContent = e.target.value + '%';
        });
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
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.handleFile(file);
            }
        });
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.handleFile(file);
        }
    }

    handleFile(file) {
        this.originalFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            this.originalImage = new Image();
            this.originalImage.onload = () => {
                this.showSettings();
            };
            this.originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    showSettings() {
        document.getElementById('settingsSection').style.display = 'block';
    }

    switchTab(e) {
        const tabName = e.target.getAttribute('data-tab');
        this.currentSettings.mode = tabName;
        
        // 更新标签页状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');

        // 更新内容显示
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName + 'Tab').classList.add('active');
    }

    selectScale(e) {
        const scale = parseInt(e.target.closest('.scale-item').getAttribute('data-scale'));
        this.currentSettings.scale = scale;
        
        // 更新选择状态
        document.querySelectorAll('.scale-item').forEach(item => {
            item.classList.remove('active');
        });
        e.target.closest('.scale-item').classList.add('active');
    }

    selectEnhanceType(e) {
        const type = e.target.closest('.enhance-item').getAttribute('data-type');
        this.currentSettings.enhanceType = type;
        
        // 更新选择状态
        document.querySelectorAll('.enhance-item').forEach(item => {
            item.classList.remove('active');
        });
        e.target.closest('.enhance-item').classList.add('active');
    }

    async enhanceImage() {
        if (!this.originalImage) return;

        this.showProgress();
        
        try {
            // 模拟AI增强过程
            await this.simulateEnhancementProcess();
            
            // 执行实际的图像增强
            const enhancedImage = await this.processImageEnhancement();
            
            this.hideProgress();
            this.showResults(enhancedImage);
        } catch (error) {
            console.error('增强失败:', error);
            this.hideProgress();
            alert('图像增强失败，请重试。');
        }
    }

    async simulateEnhancementProcess() {
        const steps = [
            { text: '正在分析图像特征', duration: 1000 },
            { text: '正在计算增强参数', duration: 1500 },
            { text: '正在应用AI算法', duration: 2000 },
            { text: '正在优化图像质量', duration: 1500 },
            { text: '正在生成增强结果', duration: 1000 }
        ];

        let totalProgress = 0;
        const progressIncrement = 100 / steps.length;

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            document.getElementById('progressText').textContent = step.text;
            
            await new Promise(resolve => setTimeout(resolve, step.duration));
            
            totalProgress += progressIncrement;
            this.updateProgress(totalProgress);
        }
    }

    async processImageEnhancement() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 计算增强后的尺寸
        const scale = this.getEffectiveScale();
        const newWidth = Math.round(this.originalImage.width * scale);
        const newHeight = Math.round(this.originalImage.height * scale);
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // 使用高质量缩放
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // 绘制放大后的图像
        ctx.drawImage(this.originalImage, 0, 0, newWidth, newHeight);
        
        // 应用增强效果
        await this.applyEnhancementEffects(ctx, newWidth, newHeight);
        
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                this.enhancedBlob = blob;
                resolve(canvas);
            }, this.getOutputMimeType(), this.currentSettings.quality / 100);
        });
    }

    getEffectiveScale() {
        switch (this.currentSettings.mode) {
            case 'scale':
                return this.currentSettings.scale;
            case 'enhance':
                // 根据增强类型选择默认放大倍数
                const scaleMap = {
                    'photo': 2,
                    'art': 4,
                    'text': 3
                };
                return scaleMap[this.currentSettings.enhanceType] || 2;
            case 'custom':
                return this.currentSettings.customScale;
            default:
                return 2;
        }
    }

    async applyEnhancementEffects(ctx, width, height) {
        // 应用锐化效果
        if (this.currentSettings.sharpenLevel > 0) {
            this.applySharpenFilter(ctx, width, height);
        }
        
        // 应用降噪效果
        if (this.currentSettings.denoiseLevel > 0) {
            this.applyDenoiseFilter(ctx, width, height);
        }
        
        // 根据增强类型应用特定效果
        this.applyEnhanceTypeEffects(ctx, width, height);
    }

    applySharpenFilter(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const intensity = this.currentSettings.sharpenLevel / 100;
        
        // 简单的锐化内核
        const sharpenKernel = [
            0, -1 * intensity, 0,
            -1 * intensity, 5 * intensity, -1 * intensity,
            0, -1 * intensity, 0
        ];
        
        // 应用卷积滤波器
        const newData = new Uint8ClampedArray(data.length);
        
        for (let i = 0; i < data.length; i += 4) {
            const pixel = Math.floor(i / 4);
            const x = pixel % width;
            const y = Math.floor(pixel / width);
            
            if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
                let r = 0, g = 0, b = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        const weight = sharpenKernel[(ky + 1) * 3 + (kx + 1)];
                        
                        r += data[idx] * weight;
                        g += data[idx + 1] * weight;
                        b += data[idx + 2] * weight;
                    }
                }
                
                newData[i] = Math.max(0, Math.min(255, r + data[i] * (1 - intensity)));
                newData[i + 1] = Math.max(0, Math.min(255, g + data[i + 1] * (1 - intensity)));
                newData[i + 2] = Math.max(0, Math.min(255, b + data[i + 2] * (1 - intensity)));
            } else {
                newData[i] = data[i];
                newData[i + 1] = data[i + 1];
                newData[i + 2] = data[i + 2];
            }
            
            newData[i + 3] = data[i + 3]; // Alpha
        }
        
        const newImageData = new ImageData(newData, width, height);
        ctx.putImageData(newImageData, 0, 0);
    }

    applyDenoiseFilter(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const intensity = this.currentSettings.denoiseLevel / 100;
        
        // 简单的高斯模糊降噪
        const radius = Math.ceil(intensity * 2);
        const newData = new Uint8ClampedArray(data.length);
        
        for (let i = 0; i < data.length; i += 4) {
            const pixel = Math.floor(i / 4);
            const x = pixel % width;
            const y = Math.floor(pixel / width);
            
            let r = 0, g = 0, b = 0, count = 0;
            
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const idx = (ny * width + nx) * 4;
                        const weight = Math.exp(-(dx * dx + dy * dy) / (2 * radius * radius));
                        
                        r += data[idx] * weight;
                        g += data[idx + 1] * weight;
                        b += data[idx + 2] * weight;
                        count += weight;
                    }
                }
            }
            
            newData[i] = Math.round(r / count);
            newData[i + 1] = Math.round(g / count);
            newData[i + 2] = Math.round(b / count);
            newData[i + 3] = data[i + 3];
        }
        
        const newImageData = new ImageData(newData, width, height);
        ctx.putImageData(newImageData, 0, 0);
    }

    applyEnhanceTypeEffects(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        switch (this.currentSettings.enhanceType) {
            case 'photo':
                // 增强对比度和饱和度
                this.enhanceContrast(data, 1.1);
                this.enhanceSaturation(data, 1.2);
                break;
            case 'art':
                // 增强色彩鲜艳度
                this.enhanceVibrance(data, 1.3);
                break;
            case 'text':
                // 增强锐度和对比度
                this.enhanceContrast(data, 1.3);
                break;
        }
        
        const newImageData = new ImageData(data, width, height);
        ctx.putImageData(newImageData, 0, 0);
    }

    enhanceContrast(data, factor) {
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.max(0, Math.min(255, ((data[i] - 128) * factor) + 128));
            data[i + 1] = Math.max(0, Math.min(255, ((data[i + 1] - 128) * factor) + 128));
            data[i + 2] = Math.max(0, Math.min(255, ((data[i + 2] - 128) * factor) + 128));
        }
    }

    enhanceSaturation(data, factor) {
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            
            data[i] = Math.max(0, Math.min(255, gray + (r - gray) * factor));
            data[i + 1] = Math.max(0, Math.min(255, gray + (g - gray) * factor));
            data[i + 2] = Math.max(0, Math.min(255, gray + (b - gray) * factor));
        }
    }

    enhanceVibrance(data, factor) {
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const delta = max - min;
            
            if (delta > 0) {
                const saturation = delta / max;
                const adjustment = (1 - saturation) * factor;
                
                data[i] = Math.max(0, Math.min(255, r + (r - min) * adjustment));
                data[i + 1] = Math.max(0, Math.min(255, g + (g - min) * adjustment));
                data[i + 2] = Math.max(0, Math.min(255, b + (b - min) * adjustment));
            }
        }
    }

    getOutputMimeType() {
        switch (this.currentSettings.outputFormat) {
            case 'png':
                return 'image/png';
            case 'jpeg':
                return 'image/jpeg';
            case 'webp':
                return 'image/webp';
            default:
                return this.originalFile.type;
        }
    }

    showProgress() {
        document.getElementById('progressOverlay').style.display = 'flex';
        this.updateProgress(0);
    }

    hideProgress() {
        document.getElementById('progressOverlay').style.display = 'none';
    }

    updateProgress(percent) {
        document.getElementById('progressFill').style.width = percent + '%';
        document.getElementById('progressPercent').textContent = Math.round(percent) + '%';
    }

    showResults(enhancedCanvas) {
        document.getElementById('previewSection').style.display = 'block';
        
        // 显示原始图片
        const originalImg = document.getElementById('originalImage');
        originalImg.src = this.originalImage.src;
        
        // 显示增强后图片
        const enhancedImg = document.getElementById('enhancedImage');
        enhancedImg.src = enhancedCanvas.toDataURL();
        
        // 更新信息
        document.getElementById('originalSize').textContent = 
            `${this.originalImage.width}×${this.originalImage.height}`;
        document.getElementById('originalFileSize').textContent = 
            this.formatFileSize(this.originalFile.size);
        
        document.getElementById('enhancedSize').textContent = 
            `${enhancedCanvas.width}×${enhancedCanvas.height}`;
        document.getElementById('enhancedFileSize').textContent = 
            this.formatFileSize(this.enhancedBlob.size);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    downloadImage() {
        if (!this.enhancedBlob) return;
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(this.enhancedBlob);
        link.download = `enhanced_${this.originalFile.name}`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    backToSettings() {
        document.getElementById('previewSection').style.display = 'none';
        this.enhancedBlob = null;
    }

    toggleComparison() {
        const originalImg = document.getElementById('originalImage');
        const enhancedImg = document.getElementById('enhancedImage');
        const btn = document.getElementById('toggleCompare');
        
        if (btn.textContent === '对比查看') {
            // 显示对比模式
            originalImg.style.filter = 'grayscale(0)';
            enhancedImg.style.filter = 'grayscale(100%)';
            btn.textContent = '正常查看';
        } else {
            // 恢复正常模式
            originalImg.style.filter = 'none';
            enhancedImg.style.filter = 'none';
            btn.textContent = '对比查看';
        }
    }

    zoomImages() {
        const originalImg = document.getElementById('originalImage');
        const enhancedImg = document.getElementById('enhancedImage');
        const containers = document.querySelectorAll('.image-container');
        
        containers.forEach(container => {
            if (container.style.transform === 'scale(2)') {
                container.style.transform = 'scale(1)';
                container.style.overflow = 'hidden';
            } else {
                container.style.transform = 'scale(2)';
                container.style.overflow = 'scroll';
            }
        });
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new ImageEnhancer();
});