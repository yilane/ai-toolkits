import ImageToolBase from './base/ImageToolBase.js';

/**
 * 图像裁剪工具
 * 支持可视化裁剪区域选择、预设比例、精确像素设置，并支持批量处理
 */
export default class ImageCropTool extends ImageToolBase {
    constructor() {
        super({
            id: 'image-crop',
            name: '裁剪图像',
            description: '裁剪图像的指定区域，支持预设比例、自定义区域选择，并支持批量处理。',
            category: 'image',
            icon: '✂️',
            iconColor: '#E11D48',
            version: '1.0.0'
        });
        
        this.canvas = null;
        this.ctx = null;
        this.currentFile = null;
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.cropArea = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.previewCanvas = null;
        this.previewCtx = null;
        this.imageElement = null;
    }

    /**
     * 验证输入文件
     */
    validate(file) {
        const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        
        if (!file) {
            return { valid: false, message: '请选择要裁剪的图片文件' };
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
     * 执行图像裁剪
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
                x = this.cropArea.x,
                y = this.cropArea.y,
                width = this.cropArea.width,
                height = this.cropArea.height,
                quality = 0.9
            } = options;

            this.showProgress(10, '正在读取图像...');

            const croppedBlob = await this.cropImage(file, {
                x, y, width, height, quality
            });

            this.updateUsageStats();
            
            this.showProgress(100, '裁剪完成！');
            this.showSuccess(`图像裁剪完成：裁剪区域 ${width}×${height}`);
            
            return croppedBlob;
        } catch (error) {
            this.showError('裁剪失败', error);
            throw error;
        } finally {
            this.setProcessing(false);
        }
    }

    /**
     * 裁剪图像
     */
    async cropImage(file, options) {
        return new Promise((resolve, reject) => {
            const { x, y, width, height, quality } = options;
            
            const img = new Image();
            img.onload = () => {
                try {
                    this.showProgress(30, '正在处理图像...');
                    
                    // 创建画布
                    this.canvas = document.createElement('canvas');
                    this.ctx = this.canvas.getContext('2d');
                    
                    this.canvas.width = width;
                    this.canvas.height = height;

                    // 设置高质量渲染
                    this.ctx.imageSmoothingEnabled = true;
                    this.ctx.imageSmoothingQuality = 'high';

                    this.showProgress(60, '正在裁剪图像...');

                    // 绘制裁剪区域
                    this.ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

                    this.showProgress(90, '正在生成文件...');

                    // 转换为 Blob
                    this.canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('图像裁剪失败'));
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
            <div class="tool-ui image-crop-ui">
                <div class="processing-mode-tabs">
                    <button class="tab-button active" data-mode="single">单个文件处理</button>
                    <button class="tab-button" data-mode="batch">批量处理</button>
                </div>
                
                <div class="tab-content" id="single-mode">
                    <div class="upload-area" id="crop-upload-area">
                        <input type="file" 
                               id="crop-file-input" 
                               accept="image/jpeg,image/jpg,image/png,image/gif" 
                               class="file-input" />
                        <label for="crop-file-input" class="upload-label">
                            <div class="upload-icon">✂️</div>
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
                    
                    <div class="crop-editor" id="crop-editor" style="display: none;">
                        <div class="crop-preview-container">
                            <div class="crop-preview" id="crop-preview">
                                <canvas id="preview-canvas" class="preview-canvas"></canvas>
                                <div class="crop-overlay" id="crop-overlay">
                                    <div class="crop-selection" id="crop-selection">
                                        <div class="crop-handle crop-handle-nw"></div>
                                        <div class="crop-handle crop-handle-ne"></div>
                                        <div class="crop-handle crop-handle-sw"></div>
                                        <div class="crop-handle crop-handle-se"></div>
                                        <div class="crop-handle crop-handle-n"></div>
                                        <div class="crop-handle crop-handle-s"></div>
                                        <div class="crop-handle crop-handle-w"></div>
                                        <div class="crop-handle crop-handle-e"></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="crop-info">
                                <div class="crop-info-item">
                                    <span>选择区域:</span>
                                    <span id="selection-info">未选择</span>
                                </div>
                                <div class="crop-info-item">
                                    <span>裁剪尺寸:</span>
                                    <span id="crop-size-info">-</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="crop-controls">
                            <div class="aspect-ratio-section">
                                <h5>纵横比</h5>
                                <div class="aspect-ratio-buttons">
                                    <button class="ratio-btn active" data-ratio="free">自由</button>
                                    <button class="ratio-btn" data-ratio="1:1">1:1</button>
                                    <button class="ratio-btn" data-ratio="4:3">4:3</button>
                                    <button class="ratio-btn" data-ratio="3:2">3:2</button>
                                    <button class="ratio-btn" data-ratio="16:9">16:9</button>
                                    <button class="ratio-btn" data-ratio="2:1">2:1</button>
                                </div>
                            </div>
                            
                            <div class="precise-controls">
                                <h5>精确设置</h5>
                                <div class="precise-inputs">
                                    <div class="input-group">
                                        <label>X:</label>
                                        <input type="number" id="crop-x" min="0" value="0" />
                                    </div>
                                    <div class="input-group">
                                        <label>Y:</label>
                                        <input type="number" id="crop-y" min="0" value="0" />
                                    </div>
                                    <div class="input-group">
                                        <label>宽度:</label>
                                        <input type="number" id="crop-width" min="1" value="100" />
                                    </div>
                                    <div class="input-group">
                                        <label>高度:</label>
                                        <input type="number" id="crop-height" min="1" value="100" />
                                    </div>
                                </div>
                            </div>
                            
                            <div class="preset-crops">
                                <h5>快速裁剪</h5>
                                <div class="preset-buttons">
                                    <button class="preset-btn" data-preset="center-square">居中正方形</button>
                                    <button class="preset-btn" data-preset="full-width">全宽度</button>
                                    <button class="preset-btn" data-preset="left-half">左半部分</button>
                                    <button class="preset-btn" data-preset="right-half">右半部分</button>
                                </div>
                            </div>
                            
                            <div class="quality-control">
                                <label class="form-label" for="crop-quality">输出质量: <span id="quality-value">90%</span></label>
                                <input type="range" 
                                       id="crop-quality" 
                                       class="form-input"
                                       min="0.1" 
                                       max="1" 
                                       step="0.1" 
                                       value="0.9" />
                            </div>
                            
                            <div class="action-buttons">
                                <button id="crop-btn" class="btn btn-primary" disabled>开始裁剪</button>
                                <button id="reset-crop-btn" class="btn btn-secondary">重置选择</button>
                                <button id="crop-reset-btn" class="btn btn-secondary">重新开始</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="progress-container" id="crop-progress" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill" id="crop-progress-fill"></div>
                        </div>
                        <div class="progress-text" id="crop-progress-text">准备中...</div>
                    </div>
                    
                    <div class="result-panel" id="crop-result" style="display: none;">
                        <h4>裁剪结果</h4>
                        <div class="result-preview">
                            <canvas id="result-canvas" class="result-canvas"></canvas>
                        </div>
                        <div class="result-info">
                            <div class="info-item">
                                <span>原始尺寸:</span>
                                <span id="original-size-result">-</span>
                            </div>
                            <div class="info-item">
                                <span>裁剪后尺寸:</span>
                                <span id="cropped-size-result">-</span>
                            </div>
                        </div>
                        
                        <div class="download-section">
                            <button id="download-btn" class="btn btn-primary">下载裁剪后的图片</button>
                        </div>
                    </div>
                </div>
                
                <div class="tab-content" id="batch-mode" style="display: none;">
                    ${this.getBatchUI()}
                </div>
            </div>
            
            <style>
                .image-crop-ui .current-image-info {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                    margin-top: var(--spacing-md);
                }
                
                .image-crop-ui .image-info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: var(--spacing-sm);
                    margin-top: var(--spacing-sm);
                }
                
                .image-crop-ui .info-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--spacing-xs);
                    background: var(--bg-card);
                    border-radius: var(--border-radius-sm);
                }
                
                .image-crop-ui .info-label {
                    font-size: 12px;
                    color: var(--text-muted);
                }
                
                .image-crop-ui .info-value {
                    font-weight: 500;
                    color: var(--text-primary);
                }
                
                .image-crop-ui .crop-editor {
                    margin-top: var(--spacing-md);
                }
                
                .image-crop-ui .crop-preview-container {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                    margin-bottom: var(--spacing-md);
                }
                
                .image-crop-ui .crop-preview {
                    position: relative;
                    display: inline-block;
                    max-width: 100%;
                    margin-bottom: var(--spacing-sm);
                }
                
                .image-crop-ui .preview-canvas {
                    display: block;
                    max-width: 100%;
                    height: auto;
                    border: 1px solid var(--border-color);
                }
                
                .image-crop-ui .crop-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                }
                
                .image-crop-ui .crop-selection {
                    position: absolute;
                    border: 2px solid var(--color-primary);
                    background: rgba(0, 123, 255, 0.1);
                    pointer-events: all;
                    cursor: move;
                }
                
                .image-crop-ui .crop-handle {
                    position: absolute;
                    width: 8px;
                    height: 8px;
                    background: var(--color-primary);
                    border: 1px solid white;
                    border-radius: 50%;
                }
                
                .image-crop-ui .crop-handle-nw { top: -4px; left: -4px; cursor: nw-resize; }
                .image-crop-ui .crop-handle-ne { top: -4px; right: -4px; cursor: ne-resize; }
                .image-crop-ui .crop-handle-sw { bottom: -4px; left: -4px; cursor: sw-resize; }
                .image-crop-ui .crop-handle-se { bottom: -4px; right: -4px; cursor: se-resize; }
                .image-crop-ui .crop-handle-n { top: -4px; left: 50%; transform: translateX(-50%); cursor: n-resize; }
                .image-crop-ui .crop-handle-s { bottom: -4px; left: 50%; transform: translateX(-50%); cursor: s-resize; }
                .image-crop-ui .crop-handle-w { top: 50%; left: -4px; transform: translateY(-50%); cursor: w-resize; }
                .image-crop-ui .crop-handle-e { top: 50%; right: -4px; transform: translateY(-50%); cursor: e-resize; }
                
                .image-crop-ui .crop-info {
                    display: flex;
                    gap: var(--spacing-md);
                    font-size: 14px;
                }
                
                .image-crop-ui .crop-info-item {
                    display: flex;
                    gap: var(--spacing-xs);
                }
                
                .image-crop-ui .crop-controls {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                }
                
                .image-crop-ui .crop-controls h5 {
                    margin: 0 0 var(--spacing-sm) 0;
                    font-size: 14px;
                    color: var(--text-primary);
                }
                
                .image-crop-ui .aspect-ratio-section {
                    margin-bottom: var(--spacing-md);
                }
                
                .image-crop-ui .aspect-ratio-buttons {
                    display: flex;
                    gap: var(--spacing-xs);
                    flex-wrap: wrap;
                }
                
                .image-crop-ui .ratio-btn {
                    padding: 4px 12px;
                    border: 1px solid var(--border-color);
                    background: var(--bg-card);
                    color: var(--text-secondary);
                    border-radius: var(--border-radius-sm);
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s ease;
                }
                
                .image-crop-ui .ratio-btn.active {
                    background: var(--color-primary);
                    color: white;
                    border-color: var(--color-primary);
                }
                
                .image-crop-ui .ratio-btn:hover {
                    border-color: var(--color-primary);
                    color: var(--color-primary);
                }
                
                .image-crop-ui .precise-controls {
                    margin-bottom: var(--spacing-md);
                }
                
                .image-crop-ui .precise-inputs {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
                    gap: var(--spacing-sm);
                }
                
                .image-crop-ui .input-group {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-xs);
                }
                
                .image-crop-ui .input-group label {
                    font-size: 12px;
                    color: var(--text-muted);
                    min-width: 30px;
                }
                
                .image-crop-ui .input-group input {
                    flex: 1;
                    padding: 4px 8px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-sm);
                    font-size: 12px;
                }
                
                .image-crop-ui .preset-crops {
                    margin-bottom: var(--spacing-md);
                }
                
                .image-crop-ui .preset-buttons {
                    display: flex;
                    gap: var(--spacing-xs);
                    flex-wrap: wrap;
                }
                
                .image-crop-ui .preset-btn {
                    padding: 6px 12px;
                    border: 1px solid var(--border-color);
                    background: var(--bg-card);
                    color: var(--text-secondary);
                    border-radius: var(--border-radius-sm);
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s ease;
                }
                
                .image-crop-ui .preset-btn:hover {
                    border-color: var(--color-primary);
                    color: var(--color-primary);
                }
                
                .image-crop-ui .quality-control {
                    margin-bottom: var(--spacing-md);
                }
                
                .image-crop-ui .action-buttons {
                    display: flex;
                    gap: var(--spacing-sm);
                    flex-wrap: wrap;
                }
                
                .image-crop-ui .result-panel {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                    margin-top: var(--spacing-md);
                }
                
                .image-crop-ui .result-preview {
                    text-align: center;
                    margin-bottom: var(--spacing-md);
                }
                
                .image-crop-ui .result-canvas {
                    max-width: 300px;
                    max-height: 300px;
                    border: 1px solid var(--border-color);
                }
                
                .image-crop-ui .result-info {
                    display: flex;
                    gap: var(--spacing-md);
                    justify-content: center;
                    margin-bottom: var(--spacing-md);
                }
                
                .image-crop-ui .download-section {
                    text-align: center;
                }
                
                .image-crop-ui .processing-mode-tabs {
                    display: flex;
                    margin-bottom: var(--spacing-md);
                    border-bottom: 2px solid var(--border-color);
                }
                
                .image-crop-ui .tab-button {
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
                
                .image-crop-ui .tab-button.active {
                    color: var(--color-primary);
                    border-bottom-color: var(--color-primary);
                }
                
                .image-crop-ui .tab-button:hover {
                    color: var(--color-primary);
                    background: var(--bg-hover);
                }
                
                .image-crop-ui .tab-content {
                    min-height: 400px;
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
        
        const fileInput = document.getElementById('crop-file-input');
        const uploadArea = document.getElementById('crop-upload-area');
        
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

        this.bindCropEvents();
    }

    /**
     * 绑定裁剪相关事件
     */
    bindCropEvents() {
        // 纵横比按钮
        document.querySelectorAll('.ratio-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setAspectRatio(e.target.dataset.ratio);
                document.querySelectorAll('.ratio-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // 精确输入
        ['crop-x', 'crop-y', 'crop-width', 'crop-height'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => {
                    this.updateCropFromInputs();
                });
            }
        });

        // 预设裁剪
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.applyPreset(e.target.dataset.preset);
            });
        });

        // 质量滑块
        const qualitySlider = document.getElementById('crop-quality');
        const qualityValue = document.getElementById('quality-value');
        
        if (qualitySlider && qualityValue) {
            qualitySlider.addEventListener('input', (e) => {
                const value = Math.round(e.target.value * 100);
                qualityValue.textContent = value + '%';
            });
        }

        // 裁剪按钮
        const cropBtn = document.getElementById('crop-btn');
        if (cropBtn) {
            cropBtn.addEventListener('click', () => {
                this.handleCrop();
            });
        }

        // 重置选择按钮
        const resetCropBtn = document.getElementById('reset-crop-btn');
        if (resetCropBtn) {
            resetCropBtn.addEventListener('click', () => {
                this.resetCropSelection();
            });
        }

        // 重新开始按钮
        const cropResetBtn = document.getElementById('crop-reset-btn');
        if (cropResetBtn) {
            cropResetBtn.addEventListener('click', () => {
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

        // 获取图像尺寸并初始化编辑器
        const img = new Image();
        img.onload = () => {
            this.originalWidth = img.width;
            this.originalHeight = img.height;
            
            this.showImageInfo(file, img.width, img.height);
            this.initializeCropEditor(img);
            
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
     * 初始化裁剪编辑器
     */
    initializeCropEditor(img) {
        const cropEditor = document.getElementById('crop-editor');
        const previewCanvas = document.getElementById('preview-canvas');
        const cropBtn = document.getElementById('crop-btn');

        if (cropEditor) cropEditor.style.display = 'block';
        if (cropBtn) cropBtn.disabled = false;

        // 设置预览画布
        if (previewCanvas) {
            this.previewCanvas = previewCanvas;
            this.previewCtx = previewCanvas.getContext('2d');
            
            // 计算显示尺寸
            const maxWidth = 600;
            const maxHeight = 400;
            const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
            
            previewCanvas.width = img.width * scale;
            previewCanvas.height = img.height * scale;
            previewCanvas.style.width = previewCanvas.width + 'px';
            previewCanvas.style.height = previewCanvas.height + 'px';
            
            // 绘制图像
            this.previewCtx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);
            
            // 初始化裁剪区域
            this.initializeCropSelection();
        }
    }

    /**
     * 初始化裁剪选择区域
     */
    initializeCropSelection() {
        const canvasWidth = this.previewCanvas.width;
        const canvasHeight = this.previewCanvas.height;
        
        // 默认选择中心区域
        const defaultSize = Math.min(canvasWidth, canvasHeight) * 0.6;
        
        this.cropArea = {
            x: (canvasWidth - defaultSize) / 2,
            y: (canvasHeight - defaultSize) / 2,
            width: defaultSize,
            height: defaultSize
        };
        
        this.updateCropSelection();
        this.updateCropInputs();
        this.bindCropInteraction();
    }

    /**
     * 更新裁剪选择显示
     */
    updateCropSelection() {
        const cropSelection = document.getElementById('crop-selection');
        if (!cropSelection) return;
        
        const { x, y, width, height } = this.cropArea;
        
        cropSelection.style.left = x + 'px';
        cropSelection.style.top = y + 'px';
        cropSelection.style.width = width + 'px';
        cropSelection.style.height = height + 'px';
        
        this.updateCropInfo();
    }

    /**
     * 更新裁剪信息显示
     */
    updateCropInfo() {
        const selectionInfo = document.getElementById('selection-info');
        const cropSizeInfo = document.getElementById('crop-size-info');
        
        if (selectionInfo) {
            const { x, y, width, height } = this.getActualCropArea();
            selectionInfo.textContent = `${Math.round(x)}, ${Math.round(y)}`;
        }
        
        if (cropSizeInfo) {
            const { width, height } = this.getActualCropArea();
            cropSizeInfo.textContent = `${Math.round(width)} × ${Math.round(height)}`;
        }
    }

    /**
     * 获取实际裁剪区域（相对于原始图像）
     */
    getActualCropArea() {
        const scaleX = this.originalWidth / this.previewCanvas.width;
        const scaleY = this.originalHeight / this.previewCanvas.height;
        
        return {
            x: this.cropArea.x * scaleX,
            y: this.cropArea.y * scaleY,
            width: this.cropArea.width * scaleX,
            height: this.cropArea.height * scaleY
        };
    }

    /**
     * 更新裁剪输入框
     */
    updateCropInputs() {
        const actualCrop = this.getActualCropArea();
        
        const xInput = document.getElementById('crop-x');
        const yInput = document.getElementById('crop-y');
        const widthInput = document.getElementById('crop-width');
        const heightInput = document.getElementById('crop-height');
        
        if (xInput) xInput.value = Math.round(actualCrop.x);
        if (yInput) yInput.value = Math.round(actualCrop.y);
        if (widthInput) widthInput.value = Math.round(actualCrop.width);
        if (heightInput) heightInput.value = Math.round(actualCrop.height);
    }

    /**
     * 从输入框更新裁剪区域
     */
    updateCropFromInputs() {
        const xInput = document.getElementById('crop-x');
        const yInput = document.getElementById('crop-y');
        const widthInput = document.getElementById('crop-width');
        const heightInput = document.getElementById('crop-height');
        
        if (xInput && yInput && widthInput && heightInput) {
            const scaleX = this.previewCanvas.width / this.originalWidth;
            const scaleY = this.previewCanvas.height / this.originalHeight;
            
            this.cropArea = {
                x: parseInt(xInput.value) * scaleX,
                y: parseInt(yInput.value) * scaleY,
                width: parseInt(widthInput.value) * scaleX,
                height: parseInt(heightInput.value) * scaleY
            };
            
            this.updateCropSelection();
        }
    }

    /**
     * 绑定裁剪区域交互
     */
    bindCropInteraction() {
        const cropSelection = document.getElementById('crop-selection');
        if (!cropSelection) return;
        
        // 简化的拖拽实现
        let isDragging = false;
        let dragStart = { x: 0, y: 0 };
        let originalArea = null;
        
        cropSelection.addEventListener('mousedown', (e) => {
            isDragging = true;
            dragStart.x = e.clientX;
            dragStart.y = e.clientY;
            originalArea = { ...this.cropArea };
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - dragStart.x;
            const deltaY = e.clientY - dragStart.y;
            
            this.cropArea.x = Math.max(0, Math.min(
                this.previewCanvas.width - this.cropArea.width,
                originalArea.x + deltaX
            ));
            this.cropArea.y = Math.max(0, Math.min(
                this.previewCanvas.height - this.cropArea.height,
                originalArea.y + deltaY
            ));
            
            this.updateCropSelection();
            this.updateCropInputs();
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    /**
     * 设置纵横比
     */
    setAspectRatio(ratio) {
        if (ratio === 'free') return;
        
        const [w, h] = ratio.split(':').map(Number);
        const aspectRatio = w / h;
        
        // 保持当前宽度，调整高度
        const newHeight = this.cropArea.width / aspectRatio;
        
        if (newHeight <= this.previewCanvas.height) {
            this.cropArea.height = newHeight;
        } else {
            // 如果高度超出，保持高度，调整宽度
            this.cropArea.width = this.cropArea.height * aspectRatio;
        }
        
        // 确保不超出边界
        this.cropArea.x = Math.min(this.cropArea.x, this.previewCanvas.width - this.cropArea.width);
        this.cropArea.y = Math.min(this.cropArea.y, this.previewCanvas.height - this.cropArea.height);
        
        this.updateCropSelection();
        this.updateCropInputs();
    }

    /**
     * 应用预设裁剪
     */
    applyPreset(preset) {
        const canvasWidth = this.previewCanvas.width;
        const canvasHeight = this.previewCanvas.height;
        
        switch (preset) {
            case 'center-square':
                const size = Math.min(canvasWidth, canvasHeight) * 0.8;
                this.cropArea = {
                    x: (canvasWidth - size) / 2,
                    y: (canvasHeight - size) / 2,
                    width: size,
                    height: size
                };
                break;
                
            case 'full-width':
                this.cropArea = {
                    x: 0,
                    y: canvasHeight * 0.1,
                    width: canvasWidth,
                    height: canvasHeight * 0.8
                };
                break;
                
            case 'left-half':
                this.cropArea = {
                    x: 0,
                    y: 0,
                    width: canvasWidth / 2,
                    height: canvasHeight
                };
                break;
                
            case 'right-half':
                this.cropArea = {
                    x: canvasWidth / 2,
                    y: 0,
                    width: canvasWidth / 2,
                    height: canvasHeight
                };
                break;
        }
        
        this.updateCropSelection();
        this.updateCropInputs();
    }

    /**
     * 重置裁剪选择
     */
    resetCropSelection() {
        this.initializeCropSelection();
    }

    /**
     * 处理裁剪操作
     */
    async handleCrop() {
        if (!this.currentFile) return;

        try {
            const quality = parseFloat(document.getElementById('crop-quality')?.value || 0.9);
            const actualCrop = this.getActualCropArea();

            // 显示进度条
            const progressContainer = document.getElementById('crop-progress');
            if (progressContainer) progressContainer.style.display = 'block';

            const croppedBlob = await this.execute(this.currentFile, {
                x: actualCrop.x,
                y: actualCrop.y,
                width: actualCrop.width,
                height: actualCrop.height,
                quality
            });

            this.currentCroppedBlob = croppedBlob;
            this.showResult(actualCrop);

        } catch (error) {
            console.error('Crop failed:', error);
        } finally {
            // 隐藏进度条
            const progressContainer = document.getElementById('crop-progress');
            if (progressContainer) progressContainer.style.display = 'none';
        }
    }

    /**
     * 显示裁剪结果
     */
    showResult(cropArea) {
        const resultPanel = document.getElementById('crop-result');
        const resultCanvas = document.getElementById('result-canvas');
        const originalSizeResult = document.getElementById('original-size-result');
        const croppedSizeResult = document.getElementById('cropped-size-result');

        if (resultPanel) resultPanel.style.display = 'block';
        if (originalSizeResult) originalSizeResult.textContent = `${this.originalWidth} × ${this.originalHeight}`;
        if (croppedSizeResult) croppedSizeResult.textContent = `${Math.round(cropArea.width)} × ${Math.round(cropArea.height)}`;

        // 显示结果预览
        if (resultCanvas && this.currentCroppedBlob) {
            const img = new Image();
            img.onload = () => {
                const maxSize = 300;
                const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
                
                resultCanvas.width = img.width * scale;
                resultCanvas.height = img.height * scale;
                
                const ctx = resultCanvas.getContext('2d');
                ctx.drawImage(img, 0, 0, resultCanvas.width, resultCanvas.height);
                
                URL.revokeObjectURL(img.src);
            };
            img.src = URL.createObjectURL(this.currentCroppedBlob);
        }
    }

    /**
     * 处理重置操作
     */
    handleReset() {
        // 重置表单
        const fileInput = document.getElementById('crop-file-input');
        if (fileInput) fileInput.value = '';

        // 隐藏面板
        const infoPanel = document.getElementById('current-image-info');
        const cropEditor = document.getElementById('crop-editor');
        const resultPanel = document.getElementById('crop-result');
        const progressContainer = document.getElementById('crop-progress');

        if (infoPanel) infoPanel.style.display = 'none';
        if (cropEditor) cropEditor.style.display = 'none';
        if (resultPanel) resultPanel.style.display = 'none';
        if (progressContainer) progressContainer.style.display = 'none';

        // 重置数据
        this.currentFile = null;
        this.currentCroppedBlob = null;
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.cropArea = { x: 0, y: 0, width: 0, height: 0 };

        // 禁用裁剪按钮
        const cropBtn = document.getElementById('crop-btn');
        if (cropBtn) cropBtn.disabled = true;
    }

    /**
     * 处理下载操作
     */
    handleDownload() {
        if (!this.currentCroppedBlob || !this.currentFile) return;

        const extension = this.currentFile.name.split('.').pop();
        const nameWithoutExt = this.currentFile.name.replace(/\.[^/.]+$/, '');
        const actualCrop = this.getActualCropArea();
        const filename = `${nameWithoutExt}_cropped_${Math.round(actualCrop.width)}x${Math.round(actualCrop.height)}.${extension}`;

        this.downloadFile(this.currentCroppedBlob, filename);
    }

    /**
     * 自定义进度显示
     */
    showProgress(progress, message = '') {
        super.showProgress(progress, message);

        const progressFill = document.getElementById('crop-progress-fill');
        const progressText = document.getElementById('crop-progress-text');

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
                <h5>批量裁剪设置</h5>
                <div class="batch-crop-modes">
                    <label class="radio-label">
                        <input type="radio" name="batch-crop-mode" value="center" checked>
                        <span>居中裁剪</span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="batch-crop-mode" value="custom">
                        <span>自定义区域</span>
                    </label>
                </div>
            </div>
            
            <div id="batch-custom-crop" style="display: none;">
                <div class="form-group">
                    <label class="form-label">裁剪比例:</label>
                    <select id="batch-aspect-ratio" class="form-input">
                        <option value="1:1">1:1 (正方形)</option>
                        <option value="4:3">4:3</option>
                        <option value="3:2">3:2</option>
                        <option value="16:9">16:9</option>
                        <option value="2:1">2:1</option>
                        <option value="free">自由比例</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">裁剪尺寸 (像素):</label>
                    <div style="display: flex; gap: 12px;">
                        <input type="number" id="batch-crop-width" placeholder="宽度" class="form-input" style="flex: 1;" />
                        <input type="number" id="batch-crop-height" placeholder="高度" class="form-input" style="flex: 1;" />
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="batch-crop-quality">输出质量: <span id="batch-crop-quality-value">90%</span></label>
                <input type="range" 
                       id="batch-crop-quality" 
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
        const cropMode = document.querySelector('input[name="batch-crop-mode"]:checked')?.value || 'center';
        const quality = parseFloat(document.getElementById('batch-crop-quality')?.value || 0.9);
        
        let options = {
            maxConcurrency,
            quality,
            cropMode,
            suffix: 'cropped'
        };
        
        if (cropMode === 'custom') {
            const aspectRatio = document.getElementById('batch-aspect-ratio')?.value;
            const width = parseInt(document.getElementById('batch-crop-width')?.value);
            const height = parseInt(document.getElementById('batch-crop-height')?.value);
            
            options.aspectRatio = aspectRatio;
            if (width) options.width = width;
            if (height) options.height = height;
        }
        
        return options;
    }
    
    /**
     * 获取默认文件名后缀
     */
    getDefaultSuffix() {
        return 'cropped';
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
        // 批量裁剪模式切换
        document.querySelectorAll('input[name="batch-crop-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const customCrop = document.getElementById('batch-custom-crop');
                if (customCrop) {
                    customCrop.style.display = e.target.value === 'custom' ? 'block' : 'none';
                }
            });
        });
        
        // 批量质量滑块
        const qualitySlider = document.getElementById('batch-crop-quality');
        const qualityValue = document.getElementById('batch-crop-quality-value');
        
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
        this.currentCroppedBlob = null;
        this.imageElement = null;
    }
}