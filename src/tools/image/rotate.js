import ImageToolBase from './base/ImageToolBase.js';

/**
 * 图像旋转工具
 * 支持90度、180度、270度旋转以及自定义角度旋转，并支持批量处理
 */
export default class ImageRotateTool extends ImageToolBase {
    constructor() {
        super({
            id: 'image-rotate',
            name: '旋转图像',
            description: '旋转图像到指定角度，支持90度、180度、270度旋转以及自定义角度旋转，并支持批量处理。',
            category: 'image',
            icon: '🔄',
            iconColor: '#9333EA',
            version: '1.0.0'
        });
        
        this.canvas = null;
        this.ctx = null;
        this.currentFile = null;
        this.currentRotatedBlob = null;
        this.previewCanvas = null;
        this.previewCtx = null;
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.currentAngle = 0;
    }

    /**
     * 验证输入文件
     */
    validate(file) {
        const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        
        if (!file) {
            return { valid: false, message: '请选择要旋转的图片文件' };
        }

        if (!(file instanceof File)) {
            return { valid: false, message: '无效的文件格式' };
        }

        if (!supportedTypes.includes(file.type)) {
            return { valid: false, message: `不支持的文件格式。支持的格式：${supportedTypes.map(t => t.replace('image/', '')).join(', ')}` };
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            return { valid: false, message: `文件大小不能超过 ${this.formatFileSize(maxSize)}` };
        }

        return { valid: true, message: '' };
    }

    /**
     * 执行图像旋转
     */
    async execute(file, options = {}) {
        const validation = this.validate(file);
        if (!validation.valid) {
            throw new Error(validation.message);
        }

        this.currentFile = file;
        this.setProcessing(true);

        try {
            const {
                angle = 90,
                quality = 0.9,
                autoResize = true
            } = options;

            this.showProgress(10, '正在读取图像...');

            const rotatedBlob = await this.rotateImage(file, {
                angle, quality, autoResize
            });

            this.updateUsageStats();
            
            this.showProgress(100, '旋转完成！');
            this.showSuccess(`图像旋转完成：旋转角度 ${angle}°`);
            
            return rotatedBlob;
        } catch (error) {
            this.showError('旋转失败', error);
            throw error;
        } finally {
            this.setProcessing(false);
        }
    }

    /**
     * 旋转图像
     */
    async rotateImage(file, options) {
        return new Promise((resolve, reject) => {
            const { angle, quality, autoResize } = options;
            
            const img = new Image();
            img.onload = () => {
                try {
                    this.showProgress(30, '正在处理图像...');
                    
                    // 创建画布
                    this.canvas = document.createElement('canvas');
                    this.ctx = this.canvas.getContext('2d');
                    
                    // 计算旋转后的尺寸
                    const radians = (angle * Math.PI) / 180;
                    const cos = Math.abs(Math.cos(radians));
                    const sin = Math.abs(Math.sin(radians));
                    
                    let newWidth, newHeight;
                    
                    if (autoResize) {
                        // 自动调整尺寸以容纳旋转后的图像
                        newWidth = Math.floor(img.width * cos + img.height * sin);
                        newHeight = Math.floor(img.width * sin + img.height * cos);
                    } else {
                        // 保持原尺寸
                        newWidth = img.width;
                        newHeight = img.height;
                    }
                    
                    this.canvas.width = newWidth;
                    this.canvas.height = newHeight;

                    // 设置高质量渲染
                    this.ctx.imageSmoothingEnabled = true;
                    this.ctx.imageSmoothingQuality = 'high';

                    this.showProgress(60, '正在旋转图像...');

                    // 移动到画布中心
                    this.ctx.translate(newWidth / 2, newHeight / 2);
                    
                    // 旋转
                    this.ctx.rotate(radians);
                    
                    // 绘制图像（从中心点开始）
                    this.ctx.drawImage(img, -img.width / 2, -img.height / 2);

                    this.showProgress(90, '正在生成文件...');

                    // 转换为 Blob
                    this.canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('图像旋转失败'));
                        }
                    }, file.type, quality);

                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => {
                reject(new Error('图像加载失败，请检查文件是否损坏'));
            };

            this.showProgress(20, '正在加载图像...');
            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * 获取工具UI
     */
    getUI() {
        return `
            <div class="tool-ui image-rotate-ui">
                <div class="processing-mode-tabs">
                    <button class="tab-button active" data-mode="single">单个文件处理</button>
                    <button class="tab-button" data-mode="batch">批量处理</button>
                </div>
                
                <div class="tab-content" id="single-mode">
                    <div class="upload-area" id="rotate-upload-area">
                        <input type="file" 
                               id="rotate-file-input" 
                               accept="image/jpeg,image/jpg,image/png,image/gif" 
                               class="file-input" />
                        <label for="rotate-file-input" class="upload-label">
                            <div class="upload-icon">🔄</div>
                            <div class="upload-text">选择图片文件</div>
                            <div class="upload-hint">支持 JPG、PNG、GIF 格式，最大 10MB</div>
                        </label>
                    </div>
                
                    <div class="current-image-info" id="current-image-info" style="display: none;">
                        <h4>当前图像信息</h4>
                        <div class="image-info-grid">
                            <div class="info-item">
                                <span class="info-label">文件名:</span>
                                <span class="info-value" id="current-filename">-</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">尺寸:</span>
                                <span class="info-value" id="current-dimensions">-</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">文件大小:</span>
                                <span class="info-value" id="current-size">-</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="rotate-editor" id="rotate-editor" style="display: none;">
                        <div class="rotate-preview-container">
                            <div class="rotate-preview" id="rotate-preview">
                                <canvas id="preview-canvas" class="preview-canvas"></canvas>
                            </div>
                            
                            <div class="rotate-info">
                                <div class="rotate-info-item">
                                    <span>当前角度:</span>
                                    <span id="current-angle-info">0°</span>
                                </div>
                                <div class="rotate-info-item">
                                    <span>预览尺寸:</span>
                                    <span id="preview-size-info">-</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="rotate-controls">
                            <div class="quick-rotate-section">
                                <h5>快速旋转</h5>
                                <div class="quick-rotate-buttons">
                                    <button class="rotate-btn" data-angle="90">90°</button>
                                    <button class="rotate-btn" data-angle="180">180°</button>
                                    <button class="rotate-btn" data-angle="270">270°</button>
                                    <button class="rotate-btn" data-angle="-90">-90°</button>
                                </div>
                            </div>
                            
                            <div class="custom-rotate-section">
                                <h5>自定义角度</h5>
                                <div class="custom-rotate-controls">
                                    <div class="angle-slider-container">
                                        <label class="form-label">旋转角度: <span id="angle-value">0°</span></label>
                                        <input type="range" 
                                               id="rotate-angle" 
                                               class="angle-slider"
                                               min="-180" 
                                               max="180" 
                                               step="1" 
                                               value="0" />
                                    </div>
                                    <div class="angle-input-container">
                                        <label class="form-label">精确角度:</label>
                                        <input type="number" 
                                               id="angle-input" 
                                               class="form-input"
                                               min="-180" 
                                               max="180" 
                                               step="1" 
                                               value="0" />
                                        <span class="input-unit">°</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="rotation-options">
                                <h5>旋转选项</h5>
                                <div class="option-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="auto-resize" checked>
                                        <span>自动调整画布大小</span>
                                    </label>
                                    <div class="option-hint">勾选后会自动调整画布大小以容纳旋转后的图像</div>
                                </div>
                            </div>
                            
                            <div class="quality-control">
                                <label class="form-label" for="rotate-quality">输出质量: <span id="quality-value">90%</span></label>
                                <input type="range" 
                                       id="rotate-quality" 
                                       class="form-input"
                                       min="0.1" 
                                       max="1" 
                                       step="0.1" 
                                       value="0.9" />
                            </div>
                            
                            <div class="action-buttons">
                                <button id="rotate-btn" class="btn btn-primary" disabled>开始旋转</button>
                                <button id="reset-angle-btn" class="btn btn-secondary">重置角度</button>
                                <button id="rotate-reset-btn" class="btn btn-secondary">重新开始</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="progress-container" id="rotate-progress" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill" id="rotate-progress-fill"></div>
                        </div>
                        <div class="progress-text" id="rotate-progress-text">准备中...</div>
                    </div>
                    
                    <div class="result-panel" id="rotate-result" style="display: none;">
                        <h4>旋转结果</h4>
                        <div class="result-preview">
                            <canvas id="result-canvas" class="result-canvas"></canvas>
                        </div>
                        <div class="result-info">
                            <div class="info-item">
                                <span>原始尺寸:</span>
                                <span id="original-size-result">-</span>
                            </div>
                            <div class="info-item">
                                <span>旋转后尺寸:</span>
                                <span id="rotated-size-result">-</span>
                            </div>
                            <div class="info-item">
                                <span>旋转角度:</span>
                                <span id="angle-result">-</span>
                            </div>
                        </div>
                        
                        <div class="download-section">
                            <button id="download-btn" class="btn btn-primary">下载旋转后的图片</button>
                        </div>
                    </div>
                </div>
                
                <div class="tab-content" id="batch-mode" style="display: none;">
                    ${this.getBatchUI()}
                </div>
            </div>
            
            <style>
                .image-rotate-ui .current-image-info {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                    margin-top: var(--spacing-md);
                }
                
                .image-rotate-ui .image-info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: var(--spacing-sm);
                    margin-top: var(--spacing-sm);
                }
                
                .image-rotate-ui .info-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--spacing-xs);
                    background: var(--bg-card);
                    border-radius: var(--border-radius-sm);
                }
                
                .image-rotate-ui .info-label {
                    font-size: 12px;
                    color: var(--text-muted);
                }
                
                .image-rotate-ui .info-value {
                    font-weight: 500;
                    color: var(--text-primary);
                }
                
                .image-rotate-ui .rotate-editor {
                    margin-top: var(--spacing-md);
                }
                
                .image-rotate-ui .rotate-preview-container {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                    margin-bottom: var(--spacing-md);
                }
                
                .image-rotate-ui .rotate-preview {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-bottom: var(--spacing-sm);
                }
                
                .image-rotate-ui .preview-canvas {
                    max-width: 100%;
                    max-height: 400px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-sm);
                }
                
                .image-rotate-ui .rotate-info {
                    display: flex;
                    gap: var(--spacing-md);
                    justify-content: center;
                    font-size: 14px;
                    margin-top: var(--spacing-sm);
                }
                
                .image-rotate-ui .rotate-info-item {
                    display: flex;
                    gap: var(--spacing-xs);
                }
                
                .image-rotate-ui .rotate-controls {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                }
                
                .image-rotate-ui .rotate-controls h5 {
                    margin: 0 0 var(--spacing-sm) 0;
                    font-size: 14px;
                    color: var(--text-primary);
                }
                
                .image-rotate-ui .quick-rotate-section {
                    margin-bottom: var(--spacing-md);
                }
                
                .image-rotate-ui .quick-rotate-buttons {
                    display: flex;
                    gap: var(--spacing-sm);
                    flex-wrap: wrap;
                }
                
                .image-rotate-ui .rotate-btn {
                    padding: 8px 16px;
                    border: 1px solid var(--border-color);
                    background: var(--bg-card);
                    color: var(--text-secondary);
                    border-radius: var(--border-radius-sm);
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s ease;
                }
                
                .image-rotate-ui .rotate-btn:hover {
                    border-color: var(--color-primary);
                    color: var(--color-primary);
                    background: var(--bg-hover);
                }
                
                .image-rotate-ui .custom-rotate-section {
                    margin-bottom: var(--spacing-md);
                }
                
                .image-rotate-ui .custom-rotate-controls {
                    display: flex;
                    gap: var(--spacing-md);
                    align-items: end;
                    flex-wrap: wrap;
                }
                
                .image-rotate-ui .angle-slider-container {
                    flex: 1;
                    min-width: 200px;
                }
                
                .image-rotate-ui .angle-slider {
                    width: 100%;
                    margin-top: var(--spacing-xs);
                }
                
                .image-rotate-ui .angle-input-container {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-xs);
                }
                
                .image-rotate-ui .angle-input-container input {
                    width: 80px;
                }
                
                .image-rotate-ui .input-unit {
                    font-size: 14px;
                    color: var(--text-muted);
                }
                
                .image-rotate-ui .rotation-options {
                    margin-bottom: var(--spacing-md);
                }
                
                .image-rotate-ui .option-group {
                    margin-bottom: var(--spacing-sm);
                }
                
                .image-rotate-ui .checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-xs);
                    cursor: pointer;
                    font-size: 14px;
                }
                
                .image-rotate-ui .option-hint {
                    font-size: 12px;
                    color: var(--text-muted);
                    margin-top: var(--spacing-xs);
                    margin-left: 24px;
                }
                
                .image-rotate-ui .quality-control {
                    margin-bottom: var(--spacing-md);
                }
                
                .image-rotate-ui .action-buttons {
                    display: flex;
                    gap: var(--spacing-sm);
                    flex-wrap: wrap;
                }
                
                .image-rotate-ui .result-panel {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                    margin-top: var(--spacing-md);
                }
                
                .image-rotate-ui .result-preview {
                    text-align: center;
                    margin-bottom: var(--spacing-md);
                }
                
                .image-rotate-ui .result-canvas {
                    max-width: 300px;
                    max-height: 300px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-sm);
                }
                
                .image-rotate-ui .result-info {
                    display: flex;
                    gap: var(--spacing-md);
                    justify-content: center;
                    margin-bottom: var(--spacing-md);
                    flex-wrap: wrap;
                }
                
                .image-rotate-ui .download-section {
                    text-align: center;
                }
                
                .image-rotate-ui .processing-mode-tabs {
                    display: flex;
                    margin-bottom: var(--spacing-md);
                    border-bottom: 2px solid var(--border-color);
                }
                
                .image-rotate-ui .tab-button {
                    flex: 1;
                    padding: var(--spacing-sm) var(--spacing-md);
                    border: none;
                    background: none;
                    cursor: pointer;
                    font-size: 14px;
                    color: var(--text-muted);
                    border-bottom: 2px solid transparent;
                    transition: all 0.2s ease;
                }
                
                .image-rotate-ui .tab-button.active {
                    color: var(--color-primary);
                    border-bottom-color: var(--color-primary);
                }
                
                .image-rotate-ui .tab-button:hover {
                    color: var(--color-primary);
                    background: var(--bg-hover);
                }
                
                .image-rotate-ui .tab-content {
                    min-height: 400px;
                }
                
                /* 角度滑块样式 */
                .image-rotate-ui .angle-slider {
                    -webkit-appearance: none;
                    appearance: none;
                    height: 6px;
                    background: var(--bg-card);
                    border-radius: 3px;
                    outline: none;
                }
                
                .image-rotate-ui .angle-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    background: var(--color-primary);
                    border-radius: 50%;
                    cursor: pointer;
                }
                
                .image-rotate-ui .angle-slider::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    background: var(--color-primary);
                    border-radius: 50%;
                    cursor: pointer;
                    border: none;
                }
            </style>
        `;
    }

    /**
     * 工具加载时的初始化
     */
    async onLoad() {
        await super.onLoad();
        
        setTimeout(() => {
            this.bindEvents();
        }, 100);
    }

    /**
     * 绑定tab切换事件
     */
    bindTabEvents() {
        const tabButtons = document.querySelectorAll('.tab-button');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                this.switchTab(mode);
            });
        });
    }
    
    /**
     * 切换处理模式
     */
    switchTab(mode) {
        // 更新tab按钮状态
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            }
        });
        
        // 切换内容面板
        const singleMode = document.getElementById('single-mode');
        const batchMode = document.getElementById('batch-mode');
        
        if (mode === 'single') {
            if (singleMode) singleMode.style.display = 'block';
            if (batchMode) batchMode.style.display = 'none';
        } else if (mode === 'batch') {
            if (singleMode) singleMode.style.display = 'none';
            if (batchMode) batchMode.style.display = 'block';
        }
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 绑定tab切换事件
        this.bindTabEvents();
        
        const fileInput = document.getElementById('rotate-file-input');
        const uploadArea = document.getElementById('rotate-upload-area');
        
        if (!fileInput) return;

        // 文件选择
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });

        // 拖放上传
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('drag-over');
            });

            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFileSelect(files[0]);
                }
            });
        }

        this.bindRotateEvents();
    }

    /**
     * 绑定旋转相关事件
     */
    bindRotateEvents() {
        // 快速旋转按钮
        document.querySelectorAll('.rotate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const angle = parseInt(e.target.dataset.angle);
                this.setRotationAngle(angle);
            });
        });

        // 角度滑块
        const angleSlider = document.getElementById('rotate-angle');
        const angleValue = document.getElementById('angle-value');
        const angleInput = document.getElementById('angle-input');
        
        if (angleSlider && angleValue) {
            angleSlider.addEventListener('input', (e) => {
                const angle = parseInt(e.target.value);
                angleValue.textContent = angle + '°';
                if (angleInput) angleInput.value = angle;
                this.currentAngle = angle;
                this.updatePreview();
            });
        }

        // 角度输入框
        if (angleInput) {
            angleInput.addEventListener('input', (e) => {
                const angle = parseInt(e.target.value) || 0;
                if (angleSlider) angleSlider.value = angle;
                if (angleValue) angleValue.textContent = angle + '°';
                this.currentAngle = angle;
                this.updatePreview();
            });
        }

        // 质量滑块
        const qualitySlider = document.getElementById('rotate-quality');
        const qualityValue = document.getElementById('quality-value');
        
        if (qualitySlider && qualityValue) {
            qualitySlider.addEventListener('input', (e) => {
                const value = Math.round(e.target.value * 100);
                qualityValue.textContent = value + '%';
            });
        }

        // 旋转按钮
        const rotateBtn = document.getElementById('rotate-btn');
        if (rotateBtn) {
            rotateBtn.addEventListener('click', () => {
                this.handleRotate();
            });
        }

        // 重置角度按钮
        const resetAngleBtn = document.getElementById('reset-angle-btn');
        if (resetAngleBtn) {
            resetAngleBtn.addEventListener('click', () => {
                this.resetAngle();
            });
        }

        // 重新开始按钮
        const rotateResetBtn = document.getElementById('rotate-reset-btn');
        if (rotateResetBtn) {
            rotateResetBtn.addEventListener('click', () => {
                this.handleReset();
            });
        }

        // 下载按钮
        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.handleDownload();
            });
        }
    }

    /**
     * 处理文件选择
     */
    handleFileSelect(file) {
        if (!file) return;

        const validation = this.validate(file);
        if (!validation.valid) {
            this.showError(validation.message);
            return;
        }

        this.currentFile = file;
        this.currentAngle = 0;

        // 获取图像尺寸并初始化编辑器
        const img = new Image();
        img.onload = () => {
            this.originalWidth = img.width;
            this.originalHeight = img.height;
            
            this.showImageInfo(file, img.width, img.height);
            this.initializeRotateEditor(img);
            
            URL.revokeObjectURL(img.src);
        };
        
        img.src = URL.createObjectURL(file);
    }

    /**
     * 显示图像信息
     */
    showImageInfo(file, width, height) {
        const infoPanel = document.getElementById('current-image-info');
        const filenameEl = document.getElementById('current-filename');
        const dimensionsEl = document.getElementById('current-dimensions');
        const sizeEl = document.getElementById('current-size');

        if (infoPanel) infoPanel.style.display = 'block';
        if (filenameEl) filenameEl.textContent = file.name;
        if (dimensionsEl) dimensionsEl.textContent = `${width} × ${height}`;
        if (sizeEl) sizeEl.textContent = this.formatFileSize(file.size);
    }

    /**
     * 初始化旋转编辑器
     */
    initializeRotateEditor(img) {
        const rotateEditor = document.getElementById('rotate-editor');
        const previewCanvas = document.getElementById('preview-canvas');
        const rotateBtn = document.getElementById('rotate-btn');

        if (rotateEditor) rotateEditor.style.display = 'block';
        if (rotateBtn) rotateBtn.disabled = false;

        // 设置预览画布
        if (previewCanvas) {
            this.previewCanvas = previewCanvas;
            this.previewCtx = previewCanvas.getContext('2d');
            this.originalImage = img;
            
            this.updatePreview();
        }
    }

    /**
     * 更新预览
     */
    updatePreview() {
        if (!this.originalImage || !this.previewCanvas) return;

        const img = this.originalImage;
        const angle = this.currentAngle;
        const radians = (angle * Math.PI) / 180;
        const cos = Math.abs(Math.cos(radians));
        const sin = Math.abs(Math.sin(radians));

        // 计算预览尺寸
        const maxWidth = 400;
        const maxHeight = 300;
        
        const rotatedWidth = img.width * cos + img.height * sin;
        const rotatedHeight = img.width * sin + img.height * cos;
        
        const scale = Math.min(maxWidth / rotatedWidth, maxHeight / rotatedHeight, 1);
        
        const displayWidth = rotatedWidth * scale;
        const displayHeight = rotatedHeight * scale;
        
        this.previewCanvas.width = displayWidth;
        this.previewCanvas.height = displayHeight;
        
        // 清空画布
        this.previewCtx.clearRect(0, 0, displayWidth, displayHeight);
        
        // 设置高质量渲染
        this.previewCtx.imageSmoothingEnabled = true;
        this.previewCtx.imageSmoothingQuality = 'high';
        
        // 保存上下文
        this.previewCtx.save();
        
        // 移动到画布中心
        this.previewCtx.translate(displayWidth / 2, displayHeight / 2);
        
        // 旋转
        this.previewCtx.rotate(radians);
        
        // 绘制图像
        const scaledImgWidth = img.width * scale;
        const scaledImgHeight = img.height * scale;
        this.previewCtx.drawImage(img, -scaledImgWidth / 2, -scaledImgHeight / 2, scaledImgWidth, scaledImgHeight);
        
        // 恢复上下文
        this.previewCtx.restore();
        
        // 更新信息显示
        this.updateRotateInfo();
    }

    /**
     * 更新旋转信息显示
     */
    updateRotateInfo() {
        const currentAngleInfo = document.getElementById('current-angle-info');
        const previewSizeInfo = document.getElementById('preview-size-info');
        
        if (currentAngleInfo) {
            currentAngleInfo.textContent = this.currentAngle + '°';
        }
        
        if (previewSizeInfo && this.previewCanvas) {
            const autoResize = document.getElementById('auto-resize')?.checked;
            
            if (autoResize) {
                const radians = (this.currentAngle * Math.PI) / 180;
                const cos = Math.abs(Math.cos(radians));
                const sin = Math.abs(Math.sin(radians));
                
                const newWidth = Math.floor(this.originalWidth * cos + this.originalHeight * sin);
                const newHeight = Math.floor(this.originalWidth * sin + this.originalHeight * cos);
                
                previewSizeInfo.textContent = `${newWidth} × ${newHeight}`;
            } else {
                previewSizeInfo.textContent = `${this.originalWidth} × ${this.originalHeight}`;
            }
        }
    }

    /**
     * 设置旋转角度
     */
    setRotationAngle(angle) {
        this.currentAngle = angle;
        
        const angleSlider = document.getElementById('rotate-angle');
        const angleValue = document.getElementById('angle-value');
        const angleInput = document.getElementById('angle-input');
        
        if (angleSlider) angleSlider.value = angle;
        if (angleValue) angleValue.textContent = angle + '°';
        if (angleInput) angleInput.value = angle;
        
        this.updatePreview();
    }

    /**
     * 重置角度
     */
    resetAngle() {
        this.setRotationAngle(0);
    }

    /**
     * 处理旋转操作
     */
    async handleRotate() {
        if (!this.currentFile) return;

        try {
            const quality = parseFloat(document.getElementById('rotate-quality')?.value || 0.9);
            const autoResize = document.getElementById('auto-resize')?.checked || true;

            // 显示进度条
            const progressContainer = document.getElementById('rotate-progress');
            if (progressContainer) progressContainer.style.display = 'block';

            const rotatedBlob = await this.execute(this.currentFile, {
                angle: this.currentAngle,
                quality,
                autoResize
            });

            this.currentRotatedBlob = rotatedBlob;
            this.showResult();

        } catch (error) {
            console.error('Rotation failed:', error);
        } finally {
            // 隐藏进度条
            const progressContainer = document.getElementById('rotate-progress');
            if (progressContainer) progressContainer.style.display = 'none';
        }
    }

    /**
     * 显示旋转结果
     */
    showResult() {
        const resultPanel = document.getElementById('rotate-result');
        const resultCanvas = document.getElementById('result-canvas');
        const originalSizeResult = document.getElementById('original-size-result');
        const rotatedSizeResult = document.getElementById('rotated-size-result');
        const angleResult = document.getElementById('angle-result');

        if (resultPanel) resultPanel.style.display = 'block';
        if (originalSizeResult) originalSizeResult.textContent = `${this.originalWidth} × ${this.originalHeight}`;
        if (angleResult) angleResult.textContent = this.currentAngle + '°';

        // 显示结果预览
        if (resultCanvas && this.currentRotatedBlob) {
            const img = new Image();
            img.onload = () => {
                const maxSize = 300;
                const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
                
                resultCanvas.width = img.width * scale;
                resultCanvas.height = img.height * scale;
                
                const ctx = resultCanvas.getContext('2d');
                ctx.drawImage(img, 0, 0, resultCanvas.width, resultCanvas.height);
                
                if (rotatedSizeResult) rotatedSizeResult.textContent = `${img.width} × ${img.height}`;
                
                URL.revokeObjectURL(img.src);
            };
            img.src = URL.createObjectURL(this.currentRotatedBlob);
        }
    }

    /**
     * 处理重置操作
     */
    handleReset() {
        // 重置表单
        const fileInput = document.getElementById('rotate-file-input');
        if (fileInput) fileInput.value = '';

        // 隐藏面板
        const infoPanel = document.getElementById('current-image-info');
        const rotateEditor = document.getElementById('rotate-editor');
        const resultPanel = document.getElementById('rotate-result');
        const progressContainer = document.getElementById('rotate-progress');

        if (infoPanel) infoPanel.style.display = 'none';
        if (rotateEditor) rotateEditor.style.display = 'none';
        if (resultPanel) resultPanel.style.display = 'none';
        if (progressContainer) progressContainer.style.display = 'none';

        // 重置数据
        this.currentFile = null;
        this.currentRotatedBlob = null;
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.currentAngle = 0;
        this.originalImage = null;

        // 重置控件
        this.resetAngle();

        // 禁用旋转按钮
        const rotateBtn = document.getElementById('rotate-btn');
        if (rotateBtn) rotateBtn.disabled = true;
    }

    /**
     * 处理下载操作
     */
    handleDownload() {
        if (!this.currentRotatedBlob || !this.currentFile) return;

        const extension = this.currentFile.name.split('.').pop();
        const nameWithoutExt = this.currentFile.name.replace(/\.[^/.]+$/, '');
        const filename = `${nameWithoutExt}_rotated_${Math.abs(this.currentAngle)}deg.${extension}`;

        this.downloadFile(this.currentRotatedBlob, filename);
    }

    /**
     * 自定义进度显示
     */
    showProgress(progress, message = '') {
        super.showProgress(progress, message);

        const progressFill = document.getElementById('rotate-progress-fill');
        const progressText = document.getElementById('rotate-progress-text');

        if (progressFill) progressFill.style.width = `${progress}%`;
        if (progressText) progressText.textContent = message || `${progress}%`;
    }

    /**
     * 获取批量处理选项UI
     */
    getBatchOptionsUI() {
        return `
            ${super.getBatchOptionsUI()}
            
            <div class="form-group">
                <h5>批量旋转设置</h5>
                <div class="batch-rotate-modes">
                    <label class="radio-label">
                        <input type="radio" name="batch-rotate-mode" value="fixed" checked>
                        <span>固定角度</span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="batch-rotate-mode" value="auto">
                        <span>自动矫正</span>
                    </label>
                </div>
            </div>
            
            <div id="batch-fixed-angle">
                <div class="form-group">
                    <label class="form-label">旋转角度:</label>
                    <select id="batch-rotate-angle" class="form-input">
                        <option value="90">90° (顺时针)</option>
                        <option value="180">180° (倒转)</option>
                        <option value="270">270° (逆时针)</option>
                        <option value="-90">-90° (逆时针)</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="batch-auto-resize" checked>
                    <span>自动调整画布大小</span>
                </label>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="batch-rotate-quality">输出质量: <span id="batch-rotate-quality-value">90%</span></label>
                <input type="range" 
                       id="batch-rotate-quality" 
                       class="form-input"
                       min="0.1" 
                       max="1" 
                       step="0.1" 
                       value="0.9" />
            </div>
        `;
    }
    
    /**
     * 获取批量处理选项
     */
    getBatchProcessingOptions() {
        const maxConcurrency = parseInt(document.getElementById('max-concurrency')?.value || 3);
        const rotateMode = document.querySelector('input[name="batch-rotate-mode"]:checked')?.value || 'fixed';
        const quality = parseFloat(document.getElementById('batch-rotate-quality')?.value || 0.9);
        const autoResize = document.getElementById('batch-auto-resize')?.checked || true;
        
        let options = {
            maxConcurrency,
            quality,
            autoResize,
            rotateMode,
            suffix: 'rotated'
        };
        
        if (rotateMode === 'fixed') {
            const angle = parseInt(document.getElementById('batch-rotate-angle')?.value || 90);
            options.angle = angle;
        }
        
        return options;
    }
    
    /**
     * 获取默认文件名后缀
     */
    getDefaultSuffix() {
        return 'rotated';
    }
    
    /**
     * 获取支持的文件类型
     */
    getSupportedTypes() {
        return ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    }
    
    /**
     * 批量处理功能初始化
     */
    async initBatchProcessing() {
        await super.initBatchProcessing();
        
        // 绑定批量处理特定的事件
        setTimeout(() => {
            this.bindBatchSpecificEvents();
        }, 300);
    }
    
    /**
     * 绑定批量处理特定事件
     */
    bindBatchSpecificEvents() {
        // 批量旋转模式切换
        document.querySelectorAll('input[name="batch-rotate-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const fixedAngle = document.getElementById('batch-fixed-angle');
                if (fixedAngle) {
                    fixedAngle.style.display = e.target.value === 'fixed' ? 'block' : 'none';
                }
            });
        });
        
        // 批量质量滑块
        const qualitySlider = document.getElementById('batch-rotate-quality');
        const qualityValue = document.getElementById('batch-rotate-quality-value');
        
        if (qualitySlider && qualityValue) {
            qualitySlider.addEventListener('input', (e) => {
                const value = Math.round(e.target.value * 100);
                qualityValue.textContent = value + '%';
            });
        }
    }

    /**
     * 清理资源
     */
    cleanup() {
        super.cleanup();
        
        if (this.canvas) {
            this.canvas = null;
            this.ctx = null;
        }
        
        if (this.previewCanvas) {
            this.previewCanvas = null;
            this.previewCtx = null;
        }
        
        this.currentFile = null;
        this.currentRotatedBlob = null;
        this.originalImage = null;
    }
}