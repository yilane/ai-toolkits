import ImageToolBase from './base/ImageToolBase.js';

/**
 * 图像尺寸调整工具
 * 支持按百分比或像素调整 JPG、PNG、GIF 图像尺寸，并支持批量处理
 */
export default class ImageResizeTool extends ImageToolBase {
    constructor() {
        super({
            id: 'image-resize',
            name: '调整图像的大小',
            description: '按照百分比或像素来定义尺寸，并调整JPG、PNG、SVG和GIF图片的尺寸。',
            category: 'image',
            icon: '📏',
            iconColor: '#3B82F6',
            version: '1.0.0'
        });
        
        this.canvas = null;
        this.ctx = null;
        this.currentFile = null;
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.newWidth = 0;
        this.newHeight = 0;
    }

    /**
     * 验证输入文件
     */
    validate(file) {
        const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        
        if (!file) {
            return { valid: false, message: '请选择要调整大小的图片文件' };
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
     * 执行图像尺寸调整
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
                width,
                height,
                maintainAspectRatio = true,
                resizeMode = 'pixels', // 'pixels' or 'percentage'
                percentage = 100,
                quality = 0.9
            } = options;

            this.showProgress(10, '正在读取图像...');

            const resizedBlob = await this.resizeImage(file, {
                width,
                height,
                maintainAspectRatio,
                resizeMode,
                percentage,
                quality
            });

            this.updateUsageStats();
            
            this.showProgress(100, '调整完成！');
            this.showSuccess(`图像尺寸调整完成：${this.originalWidth}×${this.originalHeight} → ${this.newWidth}×${this.newHeight}`);
            
            return resizedBlob;
        } catch (error) {
            this.showError('尺寸调整失败', error);
            throw error;
        } finally {
            this.setProcessing(false);
        }
    }

    /**
     * 调整图像尺寸
     */
    async resizeImage(file, options) {
        return new Promise((resolve, reject) => {
            const { width, height, maintainAspectRatio, resizeMode, percentage, quality } = options;
            
            const img = new Image();
            img.onload = () => {
                try {
                    this.originalWidth = img.width;
                    this.originalHeight = img.height;
                    
                    this.showProgress(30, '正在计算新尺寸...');
                    
                    // 计算新尺寸
                    const dimensions = this.calculateNewDimensions(
                        img.width, 
                        img.height, 
                        width, 
                        height,
                        maintainAspectRatio,
                        resizeMode,
                        percentage
                    );

                    this.newWidth = dimensions.width;
                    this.newHeight = dimensions.height;

                    this.showProgress(50, '正在调整图像尺寸...');

                    // 创建画布
                    this.canvas = document.createElement('canvas');
                    this.ctx = this.canvas.getContext('2d');
                    
                    this.canvas.width = this.newWidth;
                    this.canvas.height = this.newHeight;

                    // 设置高质量渲染
                    this.ctx.imageSmoothingEnabled = true;
                    this.ctx.imageSmoothingQuality = 'high';

                    this.showProgress(80, '正在渲染图像...');

                    // 绘制调整后的图像
                    this.ctx.drawImage(img, 0, 0, this.newWidth, this.newHeight);

                    this.showProgress(90, '正在生成文件...');

                    // 转换为 Blob
                    this.canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('图像尺寸调整失败'));
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
     * 计算新的图像尺寸
     */
    calculateNewDimensions(originalWidth, originalHeight, targetWidth, targetHeight, maintainAspectRatio, resizeMode, percentage) {
        let width, height;

        if (resizeMode === 'percentage') {
            // 按百分比调整
            const scale = percentage / 100;
            width = Math.round(originalWidth * scale);
            height = Math.round(originalHeight * scale);
        } else {
            // 按像素调整
            width = targetWidth || originalWidth;
            height = targetHeight || originalHeight;

            if (maintainAspectRatio) {
                const aspectRatio = originalWidth / originalHeight;
                
                if (targetWidth && !targetHeight) {
                    // 只指定宽度
                    width = targetWidth;
                    height = Math.round(targetWidth / aspectRatio);
                } else if (!targetWidth && targetHeight) {
                    // 只指定高度
                    height = targetHeight;
                    width = Math.round(targetHeight * aspectRatio);
                } else if (targetWidth && targetHeight) {
                    // 同时指定宽度和高度，保持纵横比
                    const targetAspectRatio = targetWidth / targetHeight;
                    
                    if (aspectRatio > targetAspectRatio) {
                        // 原图更宽，以宽度为准
                        width = targetWidth;
                        height = Math.round(targetWidth / aspectRatio);
                    } else {
                        // 原图更高，以高度为准
                        height = targetHeight;
                        width = Math.round(targetHeight * aspectRatio);
                    }
                }
            }
        }

        // 确保尺寸不为零或负数
        width = Math.max(1, Math.round(width));
        height = Math.max(1, Math.round(height));

        // 限制最大尺寸
        const maxDimension = 8192;
        if (width > maxDimension || height > maxDimension) {
            const scale = Math.min(maxDimension / width, maxDimension / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
        }

        return { width, height };
    }

    /**
     * 获取工具UI
     */
    getUI() {
        return `
            <div class="tool-ui image-resize-ui">
                <div class="processing-mode-tabs">
                    <button class="tab-button active" data-mode="single">单个文件处理</button>
                    <button class="tab-button" data-mode="batch">批量处理</button>
                </div>
                
                <div class="tab-content" id="single-mode">
                    <div class="upload-area" id="resize-upload-area">
                        <input type="file" 
                               id="resize-file-input" 
                               accept="image/jpeg,image/jpg,image/png,image/gif" 
                               class="file-input" />
                        <label for="resize-file-input" class="upload-label">
                            <div class="upload-icon">📏</div>
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
                
                <div class="options-panel" id="resize-options" style="display: none;">
                    <div class="resize-mode-tabs">
                        <button class="tab-btn active" data-mode="pixels">像素模式</button>
                        <button class="tab-btn" data-mode="percentage">百分比模式</button>
                    </div>
                    
                    <div class="tab-content" id="pixels-mode">
                        <div class="form-group">
                            <label class="form-label">
                                <input type="checkbox" id="maintain-aspect-ratio" checked> 保持纵横比
                            </label>
                        </div>
                        
                        <div style="display: flex; gap: 16px;">
                            <div class="form-group" style="flex: 1;">
                                <label class="form-label" for="target-width">宽度 (px)</label>
                                <input type="number" 
                                       id="target-width" 
                                       class="form-input"
                                       placeholder="输入宽度" 
                                       min="1" 
                                       max="8192" />
                            </div>
                            <div class="form-group" style="flex: 1;">
                                <label class="form-label" for="target-height">高度 (px)</label>
                                <input type="number" 
                                       id="target-height" 
                                       class="form-input"
                                       placeholder="输入高度" 
                                       min="1" 
                                       max="8192" />
                            </div>
                        </div>
                        
                        <div class="preset-sizes">
                            <span class="preset-label">常用尺寸:</span>
                            <button class="preset-btn" data-width="1920" data-height="1080">1920×1080</button>
                            <button class="preset-btn" data-width="1280" data-height="720">1280×720</button>
                            <button class="preset-btn" data-width="800" data-height="600">800×600</button>
                            <button class="preset-btn" data-width="400" data-height="400">400×400</button>
                        </div>
                    </div>
                    
                    <div class="tab-content" id="percentage-mode" style="display: none;">
                        <div class="form-group">
                            <label class="form-label" for="resize-percentage">缩放百分比: <span id="percentage-value">100%</span></label>
                            <input type="range" 
                                   id="resize-percentage" 
                                   class="form-input"
                                   min="10" 
                                   max="500" 
                                   step="5" 
                                   value="100" />
                            <div class="percentage-presets">
                                <button class="preset-btn" data-percentage="25">25%</button>
                                <button class="preset-btn" data-percentage="50">50%</button>
                                <button class="preset-btn" data-percentage="75">75%</button>
                                <button class="preset-btn" data-percentage="150">150%</button>
                                <button class="preset-btn" data-percentage="200">200%</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="output-quality">输出质量: <span id="quality-value">90%</span></label>
                        <input type="range" 
                               id="output-quality" 
                               class="form-input"
                               min="0.1" 
                               max="1" 
                               step="0.1" 
                               value="0.9" />
                    </div>
                    
                    <div class="preview-section" id="preview-section" style="display: none;">
                        <h4>预览新尺寸</h4>
                        <div class="size-preview">
                            <span id="preview-dimensions">-</span>
                            <small id="preview-file-size">预计文件大小: -</small>
                        </div>
                    </div>
                    
                    <div class="action-buttons" style="margin-top: 24px;">
                        <button id="resize-btn" class="btn btn-primary" disabled>开始调整</button>
                        <button id="resize-reset-btn" class="btn btn-secondary">重置</button>
                    </div>
                </div>
                
                <div class="progress-container" id="resize-progress" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill" id="resize-progress-fill"></div>
                    </div>
                    <div class="progress-text" id="resize-progress-text">准备中...</div>
                </div>
                
                <div class="result-panel" id="resize-result" style="display: none;">
                    <h4>调整结果</h4>
                    <div class="size-comparison">
                        <div class="comparison-item">
                            <div class="comparison-label">原始尺寸</div>
                            <div class="comparison-value" id="original-dimensions">-</div>
                        </div>
                        <div class="comparison-arrow">→</div>
                        <div class="comparison-item">
                            <div class="comparison-label">新尺寸</div>
                            <div class="comparison-value" id="new-dimensions">-</div>
                        </div>
                    </div>
                    
                    <div class="download-section" style="text-align: center; margin-top: 24px;">
                        <button id="download-btn" class="btn btn-primary">下载调整后的图片</button>
                    </div>
                </div>
            </div>
            
            <div class="tab-content" id="batch-mode" style="display: none;">
                ${this.getBatchUI()}
            </div>
            </div>
            
            <style>
                .image-resize-ui .current-image-info {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                    margin-top: var(--spacing-md);
                }
                
                .image-resize-ui .image-info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: var(--spacing-sm);
                    margin-top: var(--spacing-sm);
                }
                
                .image-resize-ui .info-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--spacing-xs);
                    background: var(--bg-card);
                    border-radius: var(--border-radius-sm);
                }
                
                .image-resize-ui .info-label {
                    font-size: 12px;
                    color: var(--text-muted);
                }
                
                .image-resize-ui .info-value {
                    font-weight: 500;
                    color: var(--text-primary);
                }
                
                .image-resize-ui .options-panel {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                    margin-top: var(--spacing-md);
                }
                
                .image-resize-ui .resize-mode-tabs {
                    display: flex;
                    margin-bottom: var(--spacing-md);
                    background: var(--bg-card);
                    border-radius: var(--border-radius-sm);
                    padding: 4px;
                }
                
                .image-resize-ui .tab-btn {
                    flex: 1;
                    padding: var(--spacing-xs) var(--spacing-sm);
                    border: none;
                    background: transparent;
                    color: var(--text-secondary);
                    border-radius: var(--border-radius-sm);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    font-size: 14px;
                }
                
                .image-resize-ui .tab-btn.active {
                    background: var(--primary-color);
                    color: white;
                }
                
                .image-resize-ui .preset-sizes,
                .image-resize-ui .percentage-presets {
                    display: flex;
                    flex-wrap: wrap;
                    gap: var(--spacing-xs);
                    margin-top: var(--spacing-sm);
                    align-items: center;
                }
                
                .image-resize-ui .preset-label {
                    font-size: 12px;
                    color: var(--text-muted);
                    margin-right: var(--spacing-xs);
                }
                
                .image-resize-ui .preset-btn {
                    padding: 4px 8px;
                    border: 1px solid var(--border-color);
                    background: var(--bg-card);
                    color: var(--text-secondary);
                    border-radius: var(--border-radius-sm);
                    cursor: pointer;
                    font-size: 12px;
                    transition: all var(--transition-fast);
                }
                
                .image-resize-ui .preset-btn:hover {
                    border-color: var(--primary-color);
                    color: var(--primary-color);
                }
                
                .image-resize-ui .preview-section {
                    background: var(--bg-card);
                    padding: var(--spacing-sm);
                    border-radius: var(--border-radius-sm);
                    margin-top: var(--spacing-md);
                }
                
                .image-resize-ui .size-preview {
                    text-align: center;
                }
                
                .image-resize-ui .size-preview span {
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--primary-color);
                }
                
                .image-resize-ui .size-preview small {
                    display: block;
                    margin-top: var(--spacing-xs);
                    color: var(--text-muted);
                }
                
                .image-resize-ui .size-comparison {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: var(--spacing-md);
                    margin: var(--spacing-md) 0;
                }
                
                .image-resize-ui .comparison-item {
                    text-align: center;
                    padding: var(--spacing-sm);
                    background: var(--bg-card);
                    border-radius: var(--border-radius-sm);
                    flex: 1;
                }
                
                .image-resize-ui .comparison-arrow {
                    font-size: 24px;
                    color: var(--primary-color);
                    font-weight: bold;
                }
                
                .image-resize-ui .comparison-label {
                    font-size: 12px;
                    color: var(--text-muted);
                    margin-bottom: var(--spacing-xs);
                }
                
                .image-resize-ui .comparison-value {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                
                .image-resize-ui .action-buttons {
                    display: flex;
                    gap: var(--spacing-sm);
                }
                
                .image-resize-ui .result-panel {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                    margin-top: var(--spacing-md);
                }
                
                .image-resize-ui .processing-mode-tabs {
                    display: flex;
                    margin-bottom: var(--spacing-md);
                    border-bottom: 2px solid var(--border-color);
                }
                
                .image-resize-ui .tab-button {
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
                
                .image-resize-ui .tab-button.active {
                    color: var(--color-primary);
                    border-bottom-color: var(--color-primary);
                }
                
                .image-resize-ui .tab-button:hover {
                    color: var(--color-primary);
                    background: var(--bg-hover);
                }
                
                .image-resize-ui .tab-content {
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
        
        const fileInput = document.getElementById('resize-file-input');
        const uploadArea = document.getElementById('resize-upload-area');
        
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

        this.bindUIEvents();
    }

    /**
     * 绑定UI控件事件
     */
    bindUIEvents() {
        // 模式切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                this.switchMode(mode);
            });
        });

        // 保持纵横比
        const aspectRatioCheckbox = document.getElementById('maintain-aspect-ratio');
        if (aspectRatioCheckbox) {
            aspectRatioCheckbox.addEventListener('change', () => {
                this.updatePreview();
            });
        }

        // 尺寸输入
        const widthInput = document.getElementById('target-width');
        const heightInput = document.getElementById('target-height');
        
        if (widthInput) {
            widthInput.addEventListener('input', () => {
                if (aspectRatioCheckbox?.checked) {
                    this.updateHeightFromWidth();
                }
                this.updatePreview();
            });
        }

        if (heightInput) {
            heightInput.addEventListener('input', () => {
                if (aspectRatioCheckbox?.checked) {
                    this.updateWidthFromHeight();
                }
                this.updatePreview();
            });
        }

        // 百分比滑块
        const percentageSlider = document.getElementById('resize-percentage');
        const percentageValue = document.getElementById('percentage-value');
        
        if (percentageSlider && percentageValue) {
            percentageSlider.addEventListener('input', (e) => {
                percentageValue.textContent = e.target.value + '%';
                this.updatePreview();
            });
        }

        // 质量滑块
        const qualitySlider = document.getElementById('output-quality');
        const qualityValue = document.getElementById('quality-value');
        
        if (qualitySlider && qualityValue) {
            qualitySlider.addEventListener('input', (e) => {
                const value = Math.round(e.target.value * 100);
                qualityValue.textContent = value + '%';
            });
        }

        // 预设尺寸按钮
        document.querySelectorAll('.preset-btn[data-width]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const width = e.target.dataset.width;
                const height = e.target.dataset.height;
                
                if (widthInput) widthInput.value = width;
                if (heightInput) heightInput.value = height;
                
                this.updatePreview();
            });
        });

        // 百分比预设按钮
        document.querySelectorAll('.preset-btn[data-percentage]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const percentage = e.target.dataset.percentage;
                
                if (percentageSlider) percentageSlider.value = percentage;
                if (percentageValue) percentageValue.textContent = percentage + '%';
                
                this.updatePreview();
            });
        });

        // 调整按钮
        const resizeBtn = document.getElementById('resize-btn');
        if (resizeBtn) {
            resizeBtn.addEventListener('click', () => {
                this.handleResize();
            });
        }

        // 重置按钮
        const resetBtn = document.getElementById('resize-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
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

        // 获取图像尺寸
        const img = new Image();
        img.onload = () => {
            this.originalWidth = img.width;
            this.originalHeight = img.height;
            
            this.showImageInfo(file, img.width, img.height);
            this.initializeControls();
            
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
     * 初始化控件
     */
    initializeControls() {
        const optionsPanel = document.getElementById('resize-options');
        const resizeBtn = document.getElementById('resize-btn');
        const widthInput = document.getElementById('target-width');
        const heightInput = document.getElementById('target-height');

        if (optionsPanel) optionsPanel.style.display = 'block';
        if (resizeBtn) resizeBtn.disabled = false;

        // 设置默认值
        if (widthInput) widthInput.value = this.originalWidth;
        if (heightInput) heightInput.value = this.originalHeight;

        this.updatePreview();
    }

    /**
     * 切换模式
     */
    switchMode(mode) {
        // 更新标签状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // 切换内容
        document.getElementById('pixels-mode').style.display = mode === 'pixels' ? 'block' : 'none';
        document.getElementById('percentage-mode').style.display = mode === 'percentage' ? 'block' : 'none';

        this.updatePreview();
    }

    /**
     * 从宽度更新高度
     */
    updateHeightFromWidth() {
        if (!this.originalWidth || !this.originalHeight) return;

        const widthInput = document.getElementById('target-width');
        const heightInput = document.getElementById('target-height');

        if (widthInput && heightInput && widthInput.value) {
            const newWidth = parseInt(widthInput.value);
            const aspectRatio = this.originalWidth / this.originalHeight;
            const newHeight = Math.round(newWidth / aspectRatio);
            heightInput.value = newHeight;
        }
    }

    /**
     * 从高度更新宽度
     */
    updateWidthFromHeight() {
        if (!this.originalWidth || !this.originalHeight) return;

        const widthInput = document.getElementById('target-width');
        const heightInput = document.getElementById('target-height');

        if (widthInput && heightInput && heightInput.value) {
            const newHeight = parseInt(heightInput.value);
            const aspectRatio = this.originalWidth / this.originalHeight;
            const newWidth = Math.round(newHeight * aspectRatio);
            widthInput.value = newWidth;
        }
    }

    /**
     * 更新预览
     */
    updatePreview() {
        if (!this.originalWidth || !this.originalHeight) return;

        const previewSection = document.getElementById('preview-section');
        const previewDimensions = document.getElementById('preview-dimensions');
        const previewFileSize = document.getElementById('preview-file-size');

        const activeMode = document.querySelector('.tab-btn.active')?.dataset.mode || 'pixels';
        let newWidth, newHeight;

        if (activeMode === 'percentage') {
            const percentage = parseInt(document.getElementById('resize-percentage')?.value || 100);
            newWidth = Math.round(this.originalWidth * percentage / 100);
            newHeight = Math.round(this.originalHeight * percentage / 100);
        } else {
            newWidth = parseInt(document.getElementById('target-width')?.value || this.originalWidth);
            newHeight = parseInt(document.getElementById('target-height')?.value || this.originalHeight);
        }

        if (previewSection) previewSection.style.display = 'block';
        if (previewDimensions) previewDimensions.textContent = `${newWidth} × ${newHeight}`;
        
        // 估算文件大小
        if (previewFileSize && this.currentFile) {
            const sizeRatio = (newWidth * newHeight) / (this.originalWidth * this.originalHeight);
            const estimatedSize = this.currentFile.size * sizeRatio;
            previewFileSize.textContent = `预计文件大小: ${this.formatFileSize(estimatedSize)}`;
        }
    }

    /**
     * 处理调整操作
     */
    async handleResize() {
        if (!this.currentFile) return;

        try {
            const activeMode = document.querySelector('.tab-btn.active')?.dataset.mode || 'pixels';
            const maintainAspectRatio = document.getElementById('maintain-aspect-ratio')?.checked || false;
            const quality = parseFloat(document.getElementById('output-quality')?.value || 0.9);

            let options = {
                maintainAspectRatio,
                quality,
                resizeMode: activeMode
            };

            if (activeMode === 'percentage') {
                options.percentage = parseInt(document.getElementById('resize-percentage')?.value || 100);
            } else {
                options.width = parseInt(document.getElementById('target-width')?.value);
                options.height = parseInt(document.getElementById('target-height')?.value);
            }

            // 显示进度条
            const progressContainer = document.getElementById('resize-progress');
            if (progressContainer) progressContainer.style.display = 'block';

            const resizedBlob = await this.execute(this.currentFile, options);

            this.currentResizedBlob = resizedBlob;
            this.showResult();

        } catch (error) {
            console.error('Resize failed:', error);
        } finally {
            // 隐藏进度条
            const progressContainer = document.getElementById('resize-progress');
            if (progressContainer) progressContainer.style.display = 'none';
        }
    }

    /**
     * 显示调整结果
     */
    showResult() {
        const resultPanel = document.getElementById('resize-result');
        const originalDimensionsEl = document.getElementById('original-dimensions');
        const newDimensionsEl = document.getElementById('new-dimensions');

        if (resultPanel) resultPanel.style.display = 'block';
        if (originalDimensionsEl) originalDimensionsEl.textContent = `${this.originalWidth} × ${this.originalHeight}`;
        if (newDimensionsEl) newDimensionsEl.textContent = `${this.newWidth} × ${this.newHeight}`;
    }

    /**
     * 处理重置操作
     */
    handleReset() {
        // 重置表单
        const fileInput = document.getElementById('resize-file-input');
        if (fileInput) fileInput.value = '';

        // 隐藏面板
        const infoPanel = document.getElementById('current-image-info');
        const optionsPanel = document.getElementById('resize-options');
        const resultPanel = document.getElementById('resize-result');
        const progressContainer = document.getElementById('resize-progress');

        if (infoPanel) infoPanel.style.display = 'none';
        if (optionsPanel) optionsPanel.style.display = 'none';
        if (resultPanel) resultPanel.style.display = 'none';
        if (progressContainer) progressContainer.style.display = 'none';

        // 重置数据
        this.currentFile = null;
        this.currentResizedBlob = null;
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.newWidth = 0;
        this.newHeight = 0;

        // 禁用调整按钮
        const resizeBtn = document.getElementById('resize-btn');
        if (resizeBtn) resizeBtn.disabled = true;
    }

    /**
     * 处理下载操作
     */
    handleDownload() {
        if (!this.currentResizedBlob || !this.currentFile) return;

        const extension = this.currentFile.name.split('.').pop();
        const nameWithoutExt = this.currentFile.name.replace(/\.[^/.]+$/, '');
        const filename = `${nameWithoutExt}_resized_${this.newWidth}x${this.newHeight}.${extension}`;

        this.downloadFile(this.currentResizedBlob, filename);
    }

    /**
     * 自定义进度显示
     */
    showProgress(progress, message = '') {
        super.showProgress(progress, message);

        const progressFill = document.getElementById('resize-progress-fill');
        const progressText = document.getElementById('resize-progress-text');

        if (progressFill) progressFill.style.width = `${progress}%`;
        if (progressText) progressText.textContent = message || `${progress}%`;
    }

    /**
     * 获取批量处理选项UI
     */
    getBatchOptionsUI() {
        return `
            ${super.getBatchOptionsUI()}
            
            <div class="batch-resize-mode-tabs">
                <button class="batch-tab-btn active" data-mode="pixels">像素模式</button>
                <button class="batch-tab-btn" data-mode="percentage">百分比模式</button>
            </div>
            
            <div class="batch-tab-content" id="batch-pixels-mode">
                <div class="form-group">
                    <label class="form-label">
                        <input type="checkbox" id="batch-maintain-aspect-ratio" checked> 保持纵横比
                    </label>
                </div>
                
                <div style="display: flex; gap: 16px;">
                    <div class="form-group" style="flex: 1;">
                        <label class="form-label" for="batch-target-width">宽度 (px)</label>
                        <input type="number" 
                               id="batch-target-width" 
                               class="form-input"
                               placeholder="输入宽度" 
                               min="1" 
                               max="8192" />
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label class="form-label" for="batch-target-height">高度 (px)</label>
                        <input type="number" 
                               id="batch-target-height" 
                               class="form-input"
                               placeholder="输入高度" 
                               min="1" 
                               max="8192" />
                    </div>
                </div>
                
                <div class="batch-preset-sizes">
                    <span class="preset-label">常用尺寸:</span>
                    <button class="preset-btn" data-width="1920" data-height="1080">1920×1080</button>
                    <button class="preset-btn" data-width="1280" data-height="720">1280×720</button>
                    <button class="preset-btn" data-width="800" data-height="600">800×600</button>
                    <button class="preset-btn" data-width="400" data-height="400">400×400</button>
                </div>
            </div>
            
            <div class="batch-tab-content" id="batch-percentage-mode" style="display: none;">
                <div class="form-group">
                    <label class="form-label" for="batch-resize-percentage">缩放百分比: <span id="batch-percentage-value">100%</span></label>
                    <input type="range" 
                           id="batch-resize-percentage" 
                           class="form-input"
                           min="10" 
                           max="500" 
                           step="5" 
                           value="100" />
                    <div class="batch-percentage-presets">
                        <button class="preset-btn" data-percentage="25">25%</button>
                        <button class="preset-btn" data-percentage="50">50%</button>
                        <button class="preset-btn" data-percentage="75">75%</button>
                        <button class="preset-btn" data-percentage="150">150%</button>
                        <button class="preset-btn" data-percentage="200">200%</button>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="batch-output-quality">输出质量: <span id="batch-quality-value">90%</span></label>
                <input type="range" 
                       id="batch-output-quality" 
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
        const activeMode = document.querySelector('.batch-tab-btn.active')?.dataset.mode || 'pixels';
        const maintainAspectRatio = document.getElementById('batch-maintain-aspect-ratio')?.checked || false;
        const quality = parseFloat(document.getElementById('batch-output-quality')?.value || 0.9);
        
        let options = {
            maxConcurrency,
            maintainAspectRatio,
            quality,
            resizeMode: activeMode,
            suffix: 'resized'
        };
        
        if (activeMode === 'percentage') {
            options.percentage = parseInt(document.getElementById('batch-resize-percentage')?.value || 100);
        } else {
            options.width = parseInt(document.getElementById('batch-target-width')?.value);
            options.height = parseInt(document.getElementById('batch-target-height')?.value);
        }
        
        return options;
    }
    
    /**
     * 获取默认文件名后缀
     */
    getDefaultSuffix() {
        return 'resized';
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
        // 批量模式切换
        document.querySelectorAll('.batch-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                this.switchBatchMode(mode);
            });
        });
        
        // 批量百分比滑块
        const percentageSlider = document.getElementById('batch-resize-percentage');
        const percentageValue = document.getElementById('batch-percentage-value');
        
        if (percentageSlider && percentageValue) {
            percentageSlider.addEventListener('input', (e) => {
                percentageValue.textContent = e.target.value + '%';
            });
        }
        
        // 批量质量滑块
        const qualitySlider = document.getElementById('batch-output-quality');
        const qualityValue = document.getElementById('batch-quality-value');
        
        if (qualitySlider && qualityValue) {
            qualitySlider.addEventListener('input', (e) => {
                const value = Math.round(e.target.value * 100);
                qualityValue.textContent = value + '%';
            });
        }
        
        // 批量预设尺寸按钮
        document.querySelectorAll('.batch-preset-sizes .preset-btn[data-width]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const width = e.target.dataset.width;
                const height = e.target.dataset.height;
                
                const widthInput = document.getElementById('batch-target-width');
                const heightInput = document.getElementById('batch-target-height');
                
                if (widthInput) widthInput.value = width;
                if (heightInput) heightInput.value = height;
            });
        });
        
        // 批量百分比预设按钮
        document.querySelectorAll('.batch-percentage-presets .preset-btn[data-percentage]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const percentage = e.target.dataset.percentage;
                
                const percentageSlider = document.getElementById('batch-resize-percentage');
                const percentageValue = document.getElementById('batch-percentage-value');
                
                if (percentageSlider) percentageSlider.value = percentage;
                if (percentageValue) percentageValue.textContent = percentage + '%';
            });
        });
    }
    
    /**
     * 切换批量处理模式
     */
    switchBatchMode(mode) {
        // 更新标签状态
        document.querySelectorAll('.batch-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // 切换内容
        const pixelsMode = document.getElementById('batch-pixels-mode');
        const percentageMode = document.getElementById('batch-percentage-mode');
        
        if (pixelsMode) pixelsMode.style.display = mode === 'pixels' ? 'block' : 'none';
        if (percentageMode) percentageMode.style.display = mode === 'percentage' ? 'block' : 'none';
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
        
        this.currentFile = null;
        this.currentResizedBlob = null;
    }
}