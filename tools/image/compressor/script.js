class ImageCompressor {
    constructor() {
        this.files = [];
        this.compressedImages = [];
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
        const compressBtn = document.getElementById('compressBtn');
        const downloadAllBtn = document.getElementById('downloadAllBtn');
        const clearBtn = document.getElementById('clearBtn');

        fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        qualitySlider.addEventListener('input', (e) => {
            qualityValue.textContent = e.target.value + '%';
        });
        compressBtn.addEventListener('click', this.compressImages.bind(this));
        downloadAllBtn.addEventListener('click', this.downloadAll.bind(this));
        clearBtn.addEventListener('click', this.clearAll.bind(this));
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
        }
    }

    showSettings() {
        document.getElementById('settingsSection').style.display = 'block';
    }

    async compressImages() {
        if (this.files.length === 0) return;

        const progressOverlay = document.getElementById('progressOverlay');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        progressOverlay.style.display = 'flex';
        this.compressedImages = [];

        const quality = parseInt(document.getElementById('qualitySlider').value) / 100;
        const outputFormat = document.getElementById('outputFormat').value;
        const keepDimensions = document.getElementById('keepDimensions').checked;

        for (let i = 0; i < this.files.length; i++) {
            const file = this.files[i];
            const progress = ((i + 1) / this.files.length) * 100;
            
            progressFill.style.width = progress + '%';
            progressText.textContent = `正在压缩 ${i + 1}/${this.files.length}: ${file.name}`;

            try {
                const compressedImage = await this.compressImage(file, quality, outputFormat, keepDimensions);
                this.compressedImages.push(compressedImage);
            } catch (error) {
                console.error('压缩失败:', error);
            }
        }

        progressOverlay.style.display = 'none';
        this.displayResults();
    }

    compressImage(file, quality, outputFormat, keepDimensions) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                let { width, height } = img;

                // 如果不保持原始尺寸，可以进行适当的尺寸优化
                if (!keepDimensions) {
                    const maxSize = 1920;
                    if (width > maxSize || height > maxSize) {
                        const ratio = Math.min(maxSize / width, maxSize / height);
                        width = Math.floor(width * ratio);
                        height = Math.floor(height * ratio);
                    }
                }

                canvas.width = width;
                canvas.height = height;

                // 绘制图像
                ctx.drawImage(img, 0, 0, width, height);

                // 确定输出格式
                let mimeType;
                let extension;
                switch (outputFormat) {
                    case 'jpeg':
                        mimeType = 'image/jpeg';
                        extension = '.jpg';
                        break;
                    case 'png':
                        mimeType = 'image/png';
                        extension = '.png';
                        break;
                    case 'webp':
                        mimeType = 'image/webp';
                        extension = '.webp';
                        break;
                    default:
                        mimeType = file.type;
                        extension = this.getFileExtension(file.name);
                }

                // 压缩图像
                canvas.toBlob((blob) => {
                    if (blob) {
                        const compressionRatio = ((file.size - blob.size) / file.size * 100).toFixed(1);
                        
                        resolve({
                            originalFile: file,
                            compressedBlob: blob,
                            originalSize: file.size,
                            compressedSize: blob.size,
                            compressionRatio: compressionRatio,
                            fileName: this.changeFileExtension(file.name, extension),
                            mimeType: mimeType
                        });
                    } else {
                        reject(new Error('压缩失败'));
                    }
                }, mimeType, quality);
            };

            img.onerror = () => reject(new Error('图像加载失败'));
            img.src = URL.createObjectURL(file);
        });
    }

    getFileExtension(filename) {
        return filename.substring(filename.lastIndexOf('.'));
    }

    changeFileExtension(filename, newExtension) {
        const lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex !== -1) {
            return filename.substring(0, lastDotIndex) + newExtension;
        }
        return filename + newExtension;
    }

    displayResults() {
        const previewSection = document.getElementById('previewSection');
        const imageList = document.getElementById('imageList');

        previewSection.style.display = 'block';
        imageList.innerHTML = '';

        this.compressedImages.forEach((imageData, index) => {
            const imageItem = this.createImageItem(imageData, index);
            imageList.appendChild(imageItem);
        });
    }

    createImageItem(imageData, index) {
        const item = document.createElement('div');
        item.className = 'image-item';

        const preview = document.createElement('img');
        preview.className = 'image-preview';
        preview.src = URL.createObjectURL(imageData.compressedBlob);

        const info = document.createElement('div');
        info.className = 'image-info';

        const name = document.createElement('div');
        name.className = 'image-name';
        name.textContent = imageData.fileName;

        const stats = document.createElement('div');
        stats.className = 'image-stats';
        stats.innerHTML = `
            <span>原始: ${this.formatFileSize(imageData.originalSize)}</span>
            <span>压缩: ${this.formatFileSize(imageData.compressedSize)}</span>
            <span class="compression-ratio">-${imageData.compressionRatio}%</span>
        `;

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn';
        downloadBtn.textContent = '下载';
        downloadBtn.onclick = () => this.downloadImage(imageData);

        info.appendChild(name);
        info.appendChild(stats);
        info.appendChild(downloadBtn);

        item.appendChild(preview);
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
        link.href = URL.createObjectURL(imageData.compressedBlob);
        link.download = imageData.fileName;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    async downloadAll() {
        if (this.compressedImages.length === 0) return;

        // 如果只有一个文件，直接下载
        if (this.compressedImages.length === 1) {
            this.downloadImage(this.compressedImages[0]);
            return;
        }

        // 多个文件时，可以创建ZIP文件或者逐个下载
        // 这里采用逐个下载的方式
        for (let i = 0; i < this.compressedImages.length; i++) {
            setTimeout(() => {
                this.downloadImage(this.compressedImages[i]);
            }, i * 500); // 间隔500ms下载，避免浏览器阻止
        }
    }

    clearAll() {
        this.files = [];
        this.compressedImages = [];
        document.getElementById('settingsSection').style.display = 'none';
        document.getElementById('previewSection').style.display = 'none';
        document.getElementById('fileInput').value = '';
        
        // 清理所有对象URL
        document.querySelectorAll('.image-preview').forEach(img => {
            URL.revokeObjectURL(img.src);
        });
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new ImageCompressor();
});