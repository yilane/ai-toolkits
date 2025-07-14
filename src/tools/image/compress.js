import ImageToolBase from './base/ImageToolBase.js';

/**
 * 图像压缩工具
 * 支持压缩 JPG、PNG、GIF 和 SVG 图像，并支持批量处理
 */
export default class ImageCompressTool extends ImageToolBase {
    constructor() {
        super({
            id: 'image-compress',
            name: '压缩图像文件',
            description: '压缩JPG、PNG、SVG、以及GIF，同时节省空间，保持质量。',
            category: 'image',
            icon: '🗜️',
            iconColor: '#10B981',
            version: '1.0.0'
        });
        
        this.canvas = null;
        this.ctx = null;
        this.currentFile = null;
        this.originalSize = 0;
        this.compressedSize = 0;
    }

    /**
     * 验证输入文件
     */
    validate(file) {
        const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml'];
        
        if (!file) {
            return { valid: false, message: '请选择要压缩的图片文件' };
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
     * 执行图像压缩
     */
    async execute(file, options = {}) {
        const validation = this.validate(file);
        if (!validation.valid) {
            throw new Error(validation.message);
        }

        this.currentFile = file;
        this.originalSize = file.size;
        this.setProcessing(true);

        try {
            const {
                quality = 0.8,
                maxWidth = null,
                maxHeight = null,
                format = file.type
            } = options;

            this.showProgress(10, '正在读取图像...');

            // SVG 特殊处理
            if (file.type === 'image/svg+xml') {
                return await this.compressSVG(file, options);
            }

            // 其他格式图像处理
            const compressedBlob = await this.compressImage(file, {
                quality,
                maxWidth,
                maxHeight,
                format
            });

            this.compressedSize = compressedBlob.size;
            this.updateUsageStats();
            
            this.showProgress(100, '压缩完成！');
            this.showSuccess(`图像压缩完成，节省了 ${this.getSavingsPercent()}%`);
            
            return compressedBlob;
        } catch (error) {
            this.showError('压缩失败', error);
            throw error;
        } finally {
            this.setProcessing(false);
        }
    }

    /**
     * 压缩普通图像
     */
    async compressImage(file, options) {
        return new Promise((resolve, reject) => {
            const { quality, maxWidth, maxHeight, format } = options;
            
            const img = new Image();
            img.onload = () => {
                try {
                    this.showProgress(30, '正在处理图像...');
                    
                    // 计算新尺寸
                    let { width, height } = this.calculateNewDimensions(
                        img.width, 
                        img.height, 
                        maxWidth, 
                        maxHeight
                    );

                    // 创建画布
                    this.canvas = document.createElement('canvas');
                    this.ctx = this.canvas.getContext('2d');
                    
                    this.canvas.width = width;
                    this.canvas.height = height;

                    // 设置高质量渲染
                    this.ctx.imageSmoothingEnabled = true;
                    this.ctx.imageSmoothingQuality = 'high';

                    this.showProgress(60, '正在压缩图像...');

                    // 绘制图像
                    this.ctx.drawImage(img, 0, 0, width, height);

                    // 转换为 Blob
                    this.canvas.toBlob((blob) => {
                        if (blob) {
                            this.showProgress(90, '正在生成文件...');
                            resolve(blob);
                        } else {
                            reject(new Error('图像压缩失败'));
                        }
                    }, format, quality);

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
     * 压缩 SVG 文件
     */
    async compressSVG(file, options = {}) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    this.showProgress(30, '正在处理 SVG...');
                    
                    let svgContent = e.target.result;
                    
                    // 移除注释
                    svgContent = svgContent.replace(/<!--[\s\S]*?-->/g, '');
                    
                    // 移除多余的空白
                    svgContent = svgContent.replace(/\s+/g, ' ');
                    svgContent = svgContent.replace(/>\s+</g, '><');
                    
                    // 移除不必要的属性
                    svgContent = svgContent.replace(/\s*(id|class)="[^"]*"/g, '');
                    
                    this.showProgress(80, '正在生成压缩文件...');
                    
                    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
                    resolve(blob);
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('SVG 文件读取失败'));
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * 计算新的图像尺寸
     */
    calculateNewDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
        let width = originalWidth;
        let height = originalHeight;

        if (maxWidth && width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }

        if (maxHeight && height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
        }

        return { 
            width: Math.round(width), 
            height: Math.round(height) 
        };
    }

    /**
     * 获取节省的百分比
     */
    getSavingsPercent() {
        if (!this.originalSize || !this.compressedSize) return 0;
        
        const savings = ((this.originalSize - this.compressedSize) / this.originalSize) * 100;
        return Math.max(0, Math.round(savings));
    }

    /**
     * 获取工具UI
     */
    getUI() {
        return `
            <div class="tool-ui image-compress-ui">
                <div class="processing-mode-tabs">
                    <button class="tab-button active" data-mode="single">单个文件处理</button>
                    <button class="tab-button" data-mode="batch">批量处理</button>
                </div>
                
                <div class="tab-content" id="single-mode">
                    <div class="upload-area" id="compress-upload-area">
                        <input type="file" 
                               id="compress-file-input" 
                               accept="image/jpeg,image/jpg,image/png,image/gif,image/svg+xml" 
                               class="file-input" />
                        <label for="compress-file-input" class="upload-label">
                            <div class="upload-icon">📁</div>
                            <div class="upload-text">选择图片文件</div>
                            <div class="upload-hint">支持 JPG、PNG、GIF、SVG 格式，最大 10MB</div>
                        </label>
                    </div>
                
                <div class="options-panel" id="compress-options" style="display: none;">
                    <div class="form-group">
                        <label class="form-label" for="quality-slider">压缩质量: <span id="quality-value">80%</span></label>
                        <input type="range" 
                               id="quality-slider" 
                               class="form-input"
                               min="0.1" 
                               max="1" 
                               step="0.1" 
                               value="0.8" />
                        <small>质量越高，文件越大；质量越低，压缩越明显</small>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <input type="checkbox" id="resize-enabled"> 调整图像尺寸
                        </label>
                    </div>
                    
                    <div class="resize-options" id="resize-options" style="display: none;">
                        <div style="display: flex; gap: 16px;">
                            <div class="form-group" style="flex: 1;">
                                <label class="form-label" for="max-width">最大宽度 (px)</label>
                                <input type="number" 
                                       id="max-width" 
                                       class="form-input"
                                       placeholder="如: 1920" 
                                       min="1" />
                            </div>
                            <div class="form-group" style="flex: 1;">
                                <label class="form-label" for="max-height">最大高度 (px)</label>
                                <input type="number" 
                                       id="max-height" 
                                       class="form-input"
                                       placeholder="如: 1080" 
                                       min="1" />
                            </div>
                        </div>
                    </div>
                    
                    <div class="action-buttons" style="margin-top: 24px;">
                        <button id="compress-btn" class="btn btn-primary" disabled>开始压缩</button>
                        <button id="compress-reset-btn" class="btn btn-secondary">重置</button>
                    </div>
                </div>
                
                <div class="progress-container" id="compress-progress" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill" id="compress-progress-fill"></div>
                    </div>
                    <div class="progress-text" id="compress-progress-text">准备中...</div>
                </div>
                
                <div class="result-panel" id="compress-result" style="display: none;">
                    <h4>压缩结果</h4>
                    <div class="file-comparison" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin: 16px 0;">
                        <div class="comparison-item">
                            <div class="comparison-label">原始文件</div>
                            <div class="comparison-value" id="original-size">-</div>
                        </div>
                        <div class="comparison-item">
                            <div class="comparison-label">压缩后</div>
                            <div class="comparison-value" id="compressed-size">-</div>
                        </div>
                        <div class="comparison-item">
                            <div class="comparison-label">节省空间</div>
                            <div class="comparison-value success" id="savings-percent">-</div>
                        </div>
                    </div>
                    
                    <div class="download-section" style="text-align: center; margin-top: 24px;">
                        <button id="download-btn" class="btn btn-primary">下载压缩后的图片</button>
                    </div>
                </div>
            </div>
            
            <div class="tab-content" id="batch-mode" style="display: none;">
                ${this.getBatchUI()}
            </div>
            </div>
            
            <style>
                .image-compress-ui .options-panel {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                    margin-top: var(--spacing-md);
                }
                
                .image-compress-ui .action-buttons {
                    display: flex;
                    gap: var(--spacing-sm);
                }
                
                .image-compress-ui .result-panel {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                    margin-top: var(--spacing-md);
                }
                
                .image-compress-ui .comparison-item {
                    text-align: center;
                    padding: var(--spacing-sm);
                    background: var(--bg-card);
                    border-radius: var(--border-radius-sm);
                }
                
                .image-compress-ui .comparison-label {
                    font-size: 12px;
                    color: var(--text-muted);
                    margin-bottom: var(--spacing-xs);
                }
                
                .image-compress-ui .comparison-value {
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                
                .image-compress-ui .comparison-value.success {
                    color: var(--color-success);
                }
                
                .image-compress-ui .progress-container {
                    margin: var(--spacing-md) 0;
                }
                
                .image-compress-ui #quality-slider {
                    width: 100%;
                    margin: var(--spacing-xs) 0;
                }
                
                .image-compress-ui .resize-options {
                    background: var(--bg-card);
                    padding: var(--spacing-sm);
                    border-radius: var(--border-radius-sm);
                    margin-top: var(--spacing-xs);
                }
                
                .image-compress-ui .processing-mode-tabs {
                    display: flex;
                    margin-bottom: var(--spacing-md);
                    border-bottom: 2px solid var(--border-color);
                }
                
                .image-compress-ui .tab-button {
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
                
                .image-compress-ui .tab-button.active {
                    color: var(--color-primary);
                    border-bottom-color: var(--color-primary);
                }
                
                .image-compress-ui .tab-button:hover {
                    color: var(--color-primary);
                    background: var(--bg-hover);
                }
                
                .image-compress-ui .tab-content {
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
        
        // 等待 DOM 元素准备好
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
        
        const fileInput = document.getElementById('compress-file-input');
        const uploadArea = document.getElementById('compress-upload-area');
        const qualitySlider = document.getElementById('quality-slider');
        const qualityValue = document.getElementById('quality-value');
        const resizeEnabled = document.getElementById('resize-enabled');
        const resizeOptions = document.getElementById('resize-options');
        const compressBtn = document.getElementById('compress-btn');
        const resetBtn = document.getElementById('compress-reset-btn');
        const downloadBtn = document.getElementById('download-btn');

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

        // 质量滑块
        if (qualitySlider && qualityValue) {
            qualitySlider.addEventListener('input', (e) => {
                const value = Math.round(e.target.value * 100);
                qualityValue.textContent = value + '%';
            });
        }

        // 尺寸调整选项
        if (resizeEnabled && resizeOptions) {
            resizeEnabled.addEventListener('change', (e) => {
                resizeOptions.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        // 压缩按钮
        if (compressBtn) {
            compressBtn.addEventListener('click', () => {
                this.handleCompress();
            });
        }

        // 重置按钮
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.handleReset();
            });
        }

        // 下载按钮
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
        this.originalSize = file.size;

        // 显示选项面板
        const optionsPanel = document.getElementById('compress-options');
        const compressBtn = document.getElementById('compress-btn');
        
        if (optionsPanel) optionsPanel.style.display = 'block';
        if (compressBtn) compressBtn.disabled = false;

        // 隐藏结果面板
        const resultPanel = document.getElementById('compress-result');
        if (resultPanel) resultPanel.style.display = 'none';

        this.showSuccess(`已选择文件: ${file.name} (${this.formatFileSize(file.size)})`);
    }

    /**
     * 处理压缩操作
     */
    async handleCompress() {
        if (!this.currentFile) return;

        try {
            const quality = parseFloat(document.getElementById('quality-slider')?.value || 0.8);
            const resizeEnabled = document.getElementById('resize-enabled')?.checked || false;
            const maxWidth = resizeEnabled ? parseInt(document.getElementById('max-width')?.value) || null : null;
            const maxHeight = resizeEnabled ? parseInt(document.getElementById('max-height')?.value) || null : null;

            // 显示进度条
            const progressContainer = document.getElementById('compress-progress');
            if (progressContainer) progressContainer.style.display = 'block';

            const compressedBlob = await this.execute(this.currentFile, {
                quality,
                maxWidth,
                maxHeight
            });

            this.currentCompressedBlob = compressedBlob;
            this.showResult();

        } catch (error) {
            console.error('Compression failed:', error);
        } finally {
            // 隐藏进度条
            const progressContainer = document.getElementById('compress-progress');
            if (progressContainer) progressContainer.style.display = 'none';
        }
    }

    /**
     * 显示压缩结果
     */
    showResult() {
        const resultPanel = document.getElementById('compress-result');
        const originalSizeEl = document.getElementById('original-size');
        const compressedSizeEl = document.getElementById('compressed-size');
        const savingsPercentEl = document.getElementById('savings-percent');

        if (resultPanel) resultPanel.style.display = 'block';
        if (originalSizeEl) originalSizeEl.textContent = this.formatFileSize(this.originalSize);
        if (compressedSizeEl) compressedSizeEl.textContent = this.formatFileSize(this.compressedSize);
        if (savingsPercentEl) savingsPercentEl.textContent = `${this.getSavingsPercent()}%`;
    }

    /**
     * 处理重置操作
     */
    handleReset() {
        // 重置表单
        const fileInput = document.getElementById('compress-file-input');
        if (fileInput) fileInput.value = '';

        // 隐藏面板
        const optionsPanel = document.getElementById('compress-options');
        const resultPanel = document.getElementById('compress-result');
        const progressContainer = document.getElementById('compress-progress');

        if (optionsPanel) optionsPanel.style.display = 'none';
        if (resultPanel) resultPanel.style.display = 'none';
        if (progressContainer) progressContainer.style.display = 'none';

        // 重置数据
        this.currentFile = null;
        this.currentCompressedBlob = null;
        this.originalSize = 0;
        this.compressedSize = 0;

        // 禁用压缩按钮
        const compressBtn = document.getElementById('compress-btn');
        if (compressBtn) compressBtn.disabled = true;
    }

    /**
     * 处理下载操作
     */
    handleDownload() {
        if (!this.currentCompressedBlob || !this.currentFile) return;

        const extension = this.currentFile.name.split('.').pop();
        const nameWithoutExt = this.currentFile.name.replace(/\.[^/.]+$/, '');
        const filename = `${nameWithoutExt}_compressed.${extension}`;

        this.downloadFile(this.currentCompressedBlob, filename);
    }

    /**
     * 自定义进度显示
     */
    showProgress(progress, message = '') {
        super.showProgress(progress, message);

        const progressFill = document.getElementById('compress-progress-fill');
        const progressText = document.getElementById('compress-progress-text');

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
                <label class="form-label" for="batch-quality-slider">压缩质量: <span id="batch-quality-value">80%</span></label>
                <input type="range" 
                       id="batch-quality-slider" 
                       class="form-input"
                       min="0.1" 
                       max="1" 
                       step="0.1" 
                       value="0.8" />
                <small>质量越高，文件越大；质量越低，压缩越明显</small>
            </div>
            
            <div class="form-group">
                <label class="form-label">
                    <input type="checkbox" id="batch-resize-enabled"> 调整图像尺寸
                </label>
            </div>
            
            <div class="batch-resize-options" id="batch-resize-options" style="display: none;">
                <div style="display: flex; gap: 16px;">
                    <div class="form-group" style="flex: 1;">
                        <label class="form-label" for="batch-max-width">最大宽度 (px)</label>
                        <input type="number" 
                               id="batch-max-width" 
                               class="form-input"
                               placeholder="如: 1920" 
                               min="1" />
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label class="form-label" for="batch-max-height">最大高度 (px)</label>
                        <input type="number" 
                               id="batch-max-height" 
                               class="form-input"
                               placeholder="如: 1080" 
                               min="1" />
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 获取批量处理选项
     */
    getBatchProcessingOptions() {
        const maxConcurrency = parseInt(document.getElementById('max-concurrency')?.value || 3);
        const quality = parseFloat(document.getElementById('batch-quality-slider')?.value || 0.8);
        const resizeEnabled = document.getElementById('batch-resize-enabled')?.checked || false;
        const maxWidth = resizeEnabled ? parseInt(document.getElementById('batch-max-width')?.value) || null : null;
        const maxHeight = resizeEnabled ? parseInt(document.getElementById('batch-max-height')?.value) || null : null;
        
        return {
            maxConcurrency,
            quality,
            maxWidth,
            maxHeight,
            suffix: 'compressed'
        };
    }
    
    /**
     * 获取默认文件名后缀
     */
    getDefaultSuffix() {
        return 'compressed';
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
        const qualitySlider = document.getElementById('batch-quality-slider');
        const qualityValue = document.getElementById('batch-quality-value');
        const resizeEnabled = document.getElementById('batch-resize-enabled');
        const resizeOptions = document.getElementById('batch-resize-options');
        
        // 批量质量滑块
        if (qualitySlider && qualityValue) {
            qualitySlider.addEventListener('input', (e) => {
                const value = Math.round(e.target.value * 100);
                qualityValue.textContent = value + '%';
            });
        }
        
        // 批量尺寸调整选项
        if (resizeEnabled && resizeOptions) {
            resizeEnabled.addEventListener('change', (e) => {
                resizeOptions.style.display = e.target.checked ? 'block' : 'none';
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
        
        if (this.currentFile) {
            URL.revokeObjectURL(this.currentFile);
        }
        
        this.currentFile = null;
        this.currentCompressedBlob = null;
    }
}