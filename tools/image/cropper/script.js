class ImageCropper {
    constructor() {
        this.image = null;
        this.originalFile = null;
        this.canvas = null;
        this.ctx = null;
        this.cropBox = {
            x: 0,
            y: 0,
            width: 100,
            height: 100
        };
        this.isDragging = false;
        this.isResizing = false;
        this.dragStart = { x: 0, y: 0 };
        this.resizeHandle = null;
        this.aspectRatio = null;
        this.canvasOffset = { x: 0, y: 0 };
        this.scaleFactor = 1;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.setupCanvas();
    }

    setupEventListeners() {
        const fileInput = document.getElementById('fileInput');
        const qualitySlider = document.getElementById('qualitySlider');
        const qualityValue = document.getElementById('qualityValue');
        const cropBtn = document.getElementById('cropBtn');
        const resetBtn = document.getElementById('resetBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        const newCropBtn = document.getElementById('newCropBtn');
        const ratioBtns = document.querySelectorAll('.ratio-btn');

        fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        qualitySlider.addEventListener('input', (e) => {
            qualityValue.textContent = e.target.value + '%';
        });
        cropBtn.addEventListener('click', this.cropImage.bind(this));
        resetBtn.addEventListener('click', this.resetCrop.bind(this));
        downloadBtn.addEventListener('click', this.downloadImage.bind(this));
        newCropBtn.addEventListener('click', this.backToEdit.bind(this));

        ratioBtns.forEach(btn => {
            btn.addEventListener('click', this.selectRatio.bind(this));
        });

        // 数值输入框事件
        const cropInputs = ['cropX', 'cropY', 'cropWidth', 'cropHeight'];
        cropInputs.forEach(id => {
            const input = document.getElementById(id);
            input.addEventListener('input', this.updateCropFromInputs.bind(this));
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

    setupCanvas() {
        this.canvas = document.getElementById('cropCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
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
            this.image = new Image();
            this.image.onload = () => {
                this.setupEditor();
            };
            this.image.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    setupEditor() {
        document.getElementById('editorSection').style.display = 'block';
        this.drawImage();
        this.initializeCropBox();
    }

    drawImage() {
        const maxWidth = this.canvas.parentElement.clientWidth - 48;
        const maxHeight = 600;
        
        let drawWidth = this.image.width;
        let drawHeight = this.image.height;
        
        // 计算缩放比例
        const scaleX = maxWidth / drawWidth;
        const scaleY = maxHeight / drawHeight;
        this.scaleFactor = Math.min(scaleX, scaleY, 1);
        
        drawWidth *= this.scaleFactor;
        drawHeight *= this.scaleFactor;
        
        this.canvas.width = drawWidth;
        this.canvas.height = drawHeight;
        
        this.ctx.clearRect(0, 0, drawWidth, drawHeight);
        this.ctx.drawImage(this.image, 0, 0, drawWidth, drawHeight);
        
        // 计算画布偏移
        const rect = this.canvas.getBoundingClientRect();
        this.canvasOffset.x = rect.left;
        this.canvasOffset.y = rect.top;
    }

    initializeCropBox() {
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // 默认裁剪框为图像的80%
        this.cropBox = {
            x: Math.floor(canvasWidth * 0.1),
            y: Math.floor(canvasHeight * 0.1),
            width: Math.floor(canvasWidth * 0.8),
            height: Math.floor(canvasHeight * 0.8)
        };
        
        this.updateCropBox();
        this.updateInputs();
    }

    updateCropBox() {
        const cropBoxEl = document.getElementById('cropBox');
        const cropOverlay = document.getElementById('cropOverlay');
        
        // 更新裁剪框位置和大小
        cropBoxEl.style.left = this.cropBox.x + 'px';
        cropBoxEl.style.top = this.cropBox.y + 'px';
        cropBoxEl.style.width = this.cropBox.width + 'px';
        cropBoxEl.style.height = this.cropBox.height + 'px';
        
        // 更新尺寸信息
        const actualWidth = Math.round(this.cropBox.width / this.scaleFactor);
        const actualHeight = Math.round(this.cropBox.height / this.scaleFactor);
        document.getElementById('cropDimensions').textContent = `${actualWidth}×${actualHeight}`;
    }

    updateInputs() {
        const actualX = Math.round(this.cropBox.x / this.scaleFactor);
        const actualY = Math.round(this.cropBox.y / this.scaleFactor);
        const actualWidth = Math.round(this.cropBox.width / this.scaleFactor);
        const actualHeight = Math.round(this.cropBox.height / this.scaleFactor);
        
        document.getElementById('cropX').value = actualX;
        document.getElementById('cropY').value = actualY;
        document.getElementById('cropWidth').value = actualWidth;
        document.getElementById('cropHeight').value = actualHeight;
    }

    updateCropFromInputs() {
        const x = parseInt(document.getElementById('cropX').value) || 0;
        const y = parseInt(document.getElementById('cropY').value) || 0;
        const width = parseInt(document.getElementById('cropWidth').value) || 100;
        const height = parseInt(document.getElementById('cropHeight').value) || 100;
        
        this.cropBox = {
            x: Math.max(0, Math.min(x * this.scaleFactor, this.canvas.width - width * this.scaleFactor)),
            y: Math.max(0, Math.min(y * this.scaleFactor, this.canvas.height - height * this.scaleFactor)),
            width: Math.min(width * this.scaleFactor, this.canvas.width - x * this.scaleFactor),
            height: Math.min(height * this.scaleFactor, this.canvas.height - y * this.scaleFactor)
        };
        
        this.updateCropBox();
    }

    selectRatio(e) {
        const ratio = e.target.getAttribute('data-ratio');
        
        // 更新按钮状态
        document.querySelectorAll('.ratio-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');
        
        if (ratio === 'free') {
            this.aspectRatio = null;
        } else {
            const [w, h] = ratio.split(':').map(Number);
            this.aspectRatio = w / h;
            this.applyCropRatio();
        }
    }

    applyCropRatio() {
        if (!this.aspectRatio) return;
        
        const currentRatio = this.cropBox.width / this.cropBox.height;
        
        if (currentRatio > this.aspectRatio) {
            // 当前宽度过大，调整宽度
            this.cropBox.width = this.cropBox.height * this.aspectRatio;
        } else {
            // 当前高度过大，调整高度
            this.cropBox.height = this.cropBox.width / this.aspectRatio;
        }
        
        // 确保裁剪框不超出画布
        this.cropBox.x = Math.max(0, Math.min(this.cropBox.x, this.canvas.width - this.cropBox.width));
        this.cropBox.y = Math.max(0, Math.min(this.cropBox.y, this.canvas.height - this.cropBox.height));
        
        this.updateCropBox();
        this.updateInputs();
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.dragStart = { x, y };
        
        // 检查是否点击了调整手柄
        const handle = this.getResizeHandle(x, y);
        if (handle) {
            this.isResizing = true;
            this.resizeHandle = handle;
            this.canvas.style.cursor = this.getResizeCursor(handle);
        } else if (this.isInsideCropBox(x, y)) {
            this.isDragging = true;
            this.canvas.style.cursor = 'move';
        } else {
            // 创建新的裁剪框
            this.cropBox = {
                x: x,
                y: y,
                width: 0,
                height: 0
            };
            this.isResizing = true;
            this.resizeHandle = 'bottom-right';
        }
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.isDragging) {
            const dx = x - this.dragStart.x;
            const dy = y - this.dragStart.y;
            
            this.cropBox.x = Math.max(0, Math.min(this.cropBox.x + dx, this.canvas.width - this.cropBox.width));
            this.cropBox.y = Math.max(0, Math.min(this.cropBox.y + dy, this.canvas.height - this.cropBox.height));
            
            this.dragStart = { x, y };
            this.updateCropBox();
            this.updateInputs();
        } else if (this.isResizing) {
            this.resizeCropBox(x, y);
        } else {
            // 更新鼠标样式
            const handle = this.getResizeHandle(x, y);
            if (handle) {
                this.canvas.style.cursor = this.getResizeCursor(handle);
            } else if (this.isInsideCropBox(x, y)) {
                this.canvas.style.cursor = 'move';
            } else {
                this.canvas.style.cursor = 'crosshair';
            }
        }
    }

    handleMouseUp() {
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
        this.canvas.style.cursor = 'crosshair';
    }

    getResizeHandle(x, y) {
        const handles = [
            { name: 'top-left', x: this.cropBox.x, y: this.cropBox.y },
            { name: 'top-right', x: this.cropBox.x + this.cropBox.width, y: this.cropBox.y },
            { name: 'bottom-left', x: this.cropBox.x, y: this.cropBox.y + this.cropBox.height },
            { name: 'bottom-right', x: this.cropBox.x + this.cropBox.width, y: this.cropBox.y + this.cropBox.height },
            { name: 'top-center', x: this.cropBox.x + this.cropBox.width / 2, y: this.cropBox.y },
            { name: 'bottom-center', x: this.cropBox.x + this.cropBox.width / 2, y: this.cropBox.y + this.cropBox.height },
            { name: 'left-center', x: this.cropBox.x, y: this.cropBox.y + this.cropBox.height / 2 },
            { name: 'right-center', x: this.cropBox.x + this.cropBox.width, y: this.cropBox.y + this.cropBox.height / 2 }
        ];
        
        for (const handle of handles) {
            if (Math.abs(x - handle.x) <= 6 && Math.abs(y - handle.y) <= 6) {
                return handle.name;
            }
        }
        return null;
    }

    getResizeCursor(handle) {
        const cursors = {
            'top-left': 'nw-resize',
            'top-right': 'ne-resize',
            'bottom-left': 'sw-resize',
            'bottom-right': 'se-resize',
            'top-center': 'n-resize',
            'bottom-center': 's-resize',
            'left-center': 'w-resize',
            'right-center': 'e-resize'
        };
        return cursors[handle] || 'default';
    }

    isInsideCropBox(x, y) {
        return x >= this.cropBox.x && x <= this.cropBox.x + this.cropBox.width &&
               y >= this.cropBox.y && y <= this.cropBox.y + this.cropBox.height;
    }

    resizeCropBox(x, y) {
        const minSize = 20;
        let newCropBox = { ...this.cropBox };
        
        switch (this.resizeHandle) {
            case 'top-left':
                newCropBox.width = this.cropBox.x + this.cropBox.width - x;
                newCropBox.height = this.cropBox.y + this.cropBox.height - y;
                newCropBox.x = x;
                newCropBox.y = y;
                break;
            case 'top-right':
                newCropBox.width = x - this.cropBox.x;
                newCropBox.height = this.cropBox.y + this.cropBox.height - y;
                newCropBox.y = y;
                break;
            case 'bottom-left':
                newCropBox.width = this.cropBox.x + this.cropBox.width - x;
                newCropBox.height = y - this.cropBox.y;
                newCropBox.x = x;
                break;
            case 'bottom-right':
                newCropBox.width = x - this.cropBox.x;
                newCropBox.height = y - this.cropBox.y;
                break;
            case 'top-center':
                newCropBox.height = this.cropBox.y + this.cropBox.height - y;
                newCropBox.y = y;
                break;
            case 'bottom-center':
                newCropBox.height = y - this.cropBox.y;
                break;
            case 'left-center':
                newCropBox.width = this.cropBox.x + this.cropBox.width - x;
                newCropBox.x = x;
                break;
            case 'right-center':
                newCropBox.width = x - this.cropBox.x;
                break;
        }
        
        // 应用宽高比约束
        if (this.aspectRatio) {
            if (this.resizeHandle.includes('left') || this.resizeHandle.includes('right')) {
                newCropBox.height = newCropBox.width / this.aspectRatio;
            } else {
                newCropBox.width = newCropBox.height * this.aspectRatio;
            }
        }
        
        // 确保最小尺寸
        if (newCropBox.width < minSize || newCropBox.height < minSize) return;
        
        // 确保不超出画布
        newCropBox.x = Math.max(0, Math.min(newCropBox.x, this.canvas.width - newCropBox.width));
        newCropBox.y = Math.max(0, Math.min(newCropBox.y, this.canvas.height - newCropBox.height));
        newCropBox.width = Math.min(newCropBox.width, this.canvas.width - newCropBox.x);
        newCropBox.height = Math.min(newCropBox.height, this.canvas.height - newCropBox.y);
        
        this.cropBox = newCropBox;
        this.updateCropBox();
        this.updateInputs();
    }

    resetCrop() {
        this.initializeCropBox();
        this.aspectRatio = null;
        document.querySelectorAll('.ratio-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector('[data-ratio="free"]').classList.add('active');
    }

    cropImage() {
        const outputFormat = document.getElementById('outputFormat').value;
        const quality = parseInt(document.getElementById('qualitySlider').value) / 100;
        
        // 创建裁剪后的画布
        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d');
        
        // 计算实际裁剪区域
        const actualX = this.cropBox.x / this.scaleFactor;
        const actualY = this.cropBox.y / this.scaleFactor;
        const actualWidth = this.cropBox.width / this.scaleFactor;
        const actualHeight = this.cropBox.height / this.scaleFactor;
        
        cropCanvas.width = actualWidth;
        cropCanvas.height = actualHeight;
        
        // 裁剪图像
        cropCtx.drawImage(
            this.image,
            actualX, actualY, actualWidth, actualHeight,
            0, 0, actualWidth, actualHeight
        );
        
        // 确定输出格式
        let mimeType = this.originalFile.type;
        if (outputFormat !== 'original') {
            mimeType = `image/${outputFormat}`;
        }
        
        // 生成结果
        cropCanvas.toBlob((blob) => {
            this.croppedBlob = blob;
            this.showPreview(cropCanvas);
        }, mimeType, quality);
    }

    showPreview(cropCanvas) {
        document.getElementById('previewSection').style.display = 'block';
        
        // 显示原始图像
        const originalCanvas = document.getElementById('originalCanvas');
        const originalCtx = originalCanvas.getContext('2d');
        const maxPreviewSize = 300;
        
        let originalWidth = this.image.width;
        let originalHeight = this.image.height;
        const originalScale = Math.min(maxPreviewSize / originalWidth, maxPreviewSize / originalHeight);
        
        originalCanvas.width = originalWidth * originalScale;
        originalCanvas.height = originalHeight * originalScale;
        originalCtx.drawImage(this.image, 0, 0, originalCanvas.width, originalCanvas.height);
        
        // 显示裁剪结果
        const resultCanvas = document.getElementById('resultCanvas');
        const resultCtx = resultCanvas.getContext('2d');
        
        let resultWidth = cropCanvas.width;
        let resultHeight = cropCanvas.height;
        const resultScale = Math.min(maxPreviewSize / resultWidth, maxPreviewSize / resultHeight);
        
        resultCanvas.width = resultWidth * resultScale;
        resultCanvas.height = resultHeight * resultScale;
        resultCtx.drawImage(cropCanvas, 0, 0, resultCanvas.width, resultCanvas.height);
        
        // 更新信息
        document.getElementById('originalInfo').textContent = `${this.image.width}×${this.image.height}`;
        document.getElementById('originalSize').textContent = this.formatFileSize(this.originalFile.size);
        document.getElementById('resultInfo').textContent = `${cropCanvas.width}×${cropCanvas.height}`;
        document.getElementById('resultSize').textContent = this.formatFileSize(this.croppedBlob.size);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    downloadImage() {
        if (!this.croppedBlob) return;
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(this.croppedBlob);
        link.download = 'cropped_' + this.originalFile.name;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    backToEdit() {
        document.getElementById('previewSection').style.display = 'none';
        this.croppedBlob = null;
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new ImageCropper();
});