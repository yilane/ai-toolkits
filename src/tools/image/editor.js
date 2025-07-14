import ImageToolBase from './base/ImageToolBase.js';

/**
 * 照片编辑器
 * 支持滤镜效果、亮度调节、对比度调节、饱和度调节、文字添加等功能，并支持批量处理
 */
export default class ImageEditorTool extends ImageToolBase {
    constructor() {
        super({
            id: 'image-editor',
            name: '照片编辑器',
            description: '对图像进行各种编辑操作，包括滤镜效果、亮度调节、对比度调节、饱和度调节、文字添加等，并支持批量处理。',
            category: 'image',
            icon: '🎨',
            iconColor: '#F59E0B',
            version: '1.0.0'
        });
        
        this.canvas = null;
        this.ctx = null;
        this.currentFile = null;
        this.currentEditedBlob = null;
        this.previewCanvas = null;
        this.previewCtx = null;
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.originalImage = null;
        this.originalImageData = null;
        
        // 编辑参数
        this.editParams = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            blur: 0,
            sepia: false,
            grayscale: false,
            invert: false,
            vintage: false,
            textOverlays: []
        };
    }

    /**
     * 验证输入文件
     */
    validate(file) {
        const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        
        if (!file) {
            return { valid: false, message: '请选择要编辑的图片文件' };
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
     * 执行图像编辑
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
                brightness = 0,
                contrast = 0,
                saturation = 0,
                blur = 0,
                sepia = false,
                grayscale = false,
                invert = false,
                vintage = false,
                textOverlays = [],
                quality = 0.9
            } = options;

            this.showProgress(10, '正在读取图像...');

            const editedBlob = await this.editImage(file, {
                brightness, contrast, saturation, blur,
                sepia, grayscale, invert, vintage,
                textOverlays, quality
            });

            this.updateUsageStats();
            
            this.showProgress(100, '编辑完成！');
            this.showSuccess('图像编辑完成');
            
            return editedBlob;
        } catch (error) {
            this.showError('编辑失败', error);
            throw error;
        } finally {
            this.setProcessing(false);
        }
    }

    /**
     * 编辑图像
     */
    async editImage(file, options) {
        return new Promise((resolve, reject) => {
            const { brightness, contrast, saturation, blur,
                    sepia, grayscale, invert, vintage,
                    textOverlays, quality } = options;
            
            const img = new Image();
            img.onload = async () => {
                try {
                    this.showProgress(30, '正在处理图像...');
                    
                    // 创建画布
                    this.canvas = document.createElement('canvas');
                    this.ctx = this.canvas.getContext('2d');
                    
                    this.canvas.width = img.width;
                    this.canvas.height = img.height;

                    // 设置高质量渲染
                    this.ctx.imageSmoothingEnabled = true;
                    this.ctx.imageSmoothingQuality = 'high';

                    this.showProgress(50, '正在应用滤镜...');

                    // 绘制原始图像
                    this.ctx.drawImage(img, 0, 0);

                    // 应用滤镜效果
                    this.applyFilters({
                        brightness, contrast, saturation, blur,
                        sepia, grayscale, invert, vintage
                    });

                    this.showProgress(70, '正在添加文字...');

                    // 添加文字覆盖层
                    if (textOverlays && textOverlays.length > 0) {
                        this.addTextOverlays(textOverlays);
                    }

                    this.showProgress(90, '正在生成文件...');

                    // 转换为 Blob
                    this.canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('图像编辑失败'));
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
     * 应用滤镜效果
     */
    applyFilters(filters) {
        const { brightness, contrast, saturation, blur,
                sepia, grayscale, invert, vintage } = filters;

        // 构建CSS滤镜字符串
        let filterString = '';
        
        if (brightness !== 0) {
            filterString += `brightness(${100 + brightness}%) `;
        }
        
        if (contrast !== 0) {
            filterString += `contrast(${100 + contrast}%) `;
        }
        
        if (saturation !== 0) {
            filterString += `saturate(${100 + saturation}%) `;
        }
        
        if (blur > 0) {
            filterString += `blur(${blur}px) `;
        }
        
        if (sepia) {
            filterString += 'sepia(100%) ';
        }
        
        if (grayscale) {
            filterString += 'grayscale(100%) ';
        }
        
        if (invert) {
            filterString += 'invert(100%) ';
        }
        
        if (vintage) {
            filterString += 'sepia(50%) contrast(120%) brightness(90%) ';
        }

        // 应用滤镜
        if (filterString.trim()) {
            this.ctx.filter = filterString.trim();
            
            // 重新绘制图像以应用滤镜
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.putImageData(imageData, 0, 0);
        }
    }

    /**
     * 添加文字覆盖层
     */
    addTextOverlays(textOverlays) {
        textOverlays.forEach(overlay => {
            const {
                text = '',
                x = 50,
                y = 50,
                fontSize = 24,
                fontFamily = 'Arial',
                color = '#FFFFFF',
                fontWeight = 'normal',
                opacity = 1
            } = overlay;

            if (!text) return;

            // 保存当前上下文
            this.ctx.save();

            // 设置字体样式
            this.ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
            this.ctx.fillStyle = color;
            this.ctx.globalAlpha = opacity;

            // 添加文字阴影增强可读性
            this.ctx.shadowColor = color === '#FFFFFF' ? '#000000' : '#FFFFFF';
            this.ctx.shadowBlur = 2;
            this.ctx.shadowOffsetX = 1;
            this.ctx.shadowOffsetY = 1;

            // 绘制文字
            this.ctx.fillText(text, x, y);

            // 恢复上下文
            this.ctx.restore();
        });
    }

    /**
     * 获取工具UI
     */
    getUI() {
        return `
            <div class="tool-ui image-editor-ui">
                <div class="processing-mode-tabs">
                    <button class="tab-button active" data-mode="single">单个文件处理</button>
                    <button class="tab-button" data-mode="batch">批量处理</button>
                </div>
                
                <div class="tab-content" id="single-mode">
                    <div class="upload-area" id="editor-upload-area">
                        <input type="file" 
                               id="editor-file-input" 
                               accept="image/jpeg,image/jpg,image/png,image/gif" 
                               class="file-input" />
                        <label for="editor-file-input" class="upload-label">
                            <div class="upload-icon">🎨</div>
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
                    
                    <div class="editor-workspace" id="editor-workspace" style="display: none;">
                        <div class="editor-preview-container">
                            <div class="editor-preview" id="editor-preview">
                                <canvas id="preview-canvas" class="preview-canvas"></canvas>
                            </div>
                        </div>
                        
                        <div class="editor-controls">
                            <div class="editor-tabs">
                                <button class="editor-tab active" data-tab="filters">滤镜</button>
                                <button class="editor-tab" data-tab="adjustments">调整</button>
                                <button class="editor-tab" data-tab="effects">效果</button>
                                <button class="editor-tab" data-tab="text">文字</button>
                            </div>
                            
                            <!-- 滤镜面板 -->
                            <div class="editor-panel" id="filters-panel">
                                <div class="filter-presets">
                                    <h5>预设滤镜</h5>
                                    <div class="preset-buttons">
                                        <button class="preset-btn active" data-preset="original">原图</button>
                                        <button class="preset-btn" data-preset="vintage">复古</button>
                                        <button class="preset-btn" data-preset="sepia">褐色</button>
                                        <button class="preset-btn" data-preset="grayscale">黑白</button>
                                        <button class="preset-btn" data-preset="invert">反色</button>
                                        <button class="preset-btn" data-preset="bright">明亮</button>
                                        <button class="preset-btn" data-preset="dramatic">戏剧</button>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 调整面板 -->
                            <div class="editor-panel" id="adjustments-panel" style="display: none;">
                                <div class="adjustment-controls">
                                    <div class="adjustment-group">
                                        <label class="adjustment-label">亮度: <span id="brightness-value">0</span></label>
                                        <input type="range" 
                                               id="brightness-slider" 
                                               class="adjustment-slider"
                                               min="-100" 
                                               max="100" 
                                               value="0" />
                                    </div>
                                    
                                    <div class="adjustment-group">
                                        <label class="adjustment-label">对比度: <span id="contrast-value">0</span></label>
                                        <input type="range" 
                                               id="contrast-slider" 
                                               class="adjustment-slider"
                                               min="-100" 
                                               max="100" 
                                               value="0" />
                                    </div>
                                    
                                    <div class="adjustment-group">
                                        <label class="adjustment-label">饱和度: <span id="saturation-value">0</span></label>
                                        <input type="range" 
                                               id="saturation-slider" 
                                               class="adjustment-slider"
                                               min="-100" 
                                               max="100" 
                                               value="0" />
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 效果面板 -->
                            <div class="editor-panel" id="effects-panel" style="display: none;">
                                <div class="effect-controls">
                                    <div class="adjustment-group">
                                        <label class="adjustment-label">模糊: <span id="blur-value">0</span>px</label>
                                        <input type="range" 
                                               id="blur-slider" 
                                               class="adjustment-slider"
                                               min="0" 
                                               max="10" 
                                               value="0" />
                                    </div>
                                    
                                    <div class="effect-toggles">
                                        <label class="toggle-label">
                                            <input type="checkbox" id="sepia-toggle">
                                            <span>褐色效果</span>
                                        </label>
                                        
                                        <label class="toggle-label">
                                            <input type="checkbox" id="grayscale-toggle">
                                            <span>黑白效果</span>
                                        </label>
                                        
                                        <label class="toggle-label">
                                            <input type="checkbox" id="invert-toggle">
                                            <span>反色效果</span>
                                        </label>
                                        
                                        <label class="toggle-label">
                                            <input type="checkbox" id="vintage-toggle">
                                            <span>复古效果</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 文字面板 -->
                            <div class="editor-panel" id="text-panel" style="display: none;">
                                <div class="text-controls">
                                    <div class="form-group">
                                        <label class="form-label" for="text-input">文字内容:</label>
                                        <input type="text" 
                                               id="text-input" 
                                               class="form-input"
                                               placeholder="输入要添加的文字" />
                                    </div>
                                    
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label class="form-label" for="text-size">字体大小:</label>
                                            <input type="number" 
                                                   id="text-size" 
                                                   class="form-input"
                                                   value="24" 
                                                   min="12" 
                                                   max="200" />
                                        </div>
                                        
                                        <div class="form-group">
                                            <label class="form-label" for="text-color">字体颜色:</label>
                                            <input type="color" 
                                                   id="text-color" 
                                                   class="color-input"
                                                   value="#FFFFFF" />
                                        </div>
                                    </div>
                                    
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label class="form-label" for="text-x">X 位置:</label>
                                            <input type="number" 
                                                   id="text-x" 
                                                   class="form-input"
                                                   value="50" 
                                                   min="0" />
                                        </div>
                                        
                                        <div class="form-group">
                                            <label class="form-label" for="text-y">Y 位置:</label>
                                            <input type="number" 
                                                   id="text-y" 
                                                   class="form-input"
                                                   value="50" 
                                                   min="0" />
                                        </div>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label class="form-label" for="text-opacity">透明度: <span id="text-opacity-value">100%</span></label>
                                        <input type="range" 
                                               id="text-opacity" 
                                               class="form-input"
                                               min="0.1" 
                                               max="1" 
                                               step="0.1" 
                                               value="1" />
                                    </div>
                                    
                                    <div class="text-actions">
                                        <button id="add-text-btn" class="btn btn-secondary">添加文字</button>
                                        <button id="clear-text-btn" class="btn btn-secondary">清除文字</button>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="editor-actions">
                                <div class="quality-control">
                                    <label class="form-label" for="editor-quality">输出质量: <span id="quality-value">90%</span></label>
                                    <input type="range" 
                                           id="editor-quality" 
                                           class="form-input"
                                           min="0.1" 
                                           max="1" 
                                           step="0.1" 
                                           value="0.9" />
                                </div>
                                
                                <div class="action-buttons">
                                    <button id="reset-all-btn" class="btn btn-secondary">重置所有</button>
                                    <button id="apply-edit-btn" class="btn btn-primary" disabled>应用编辑</button>
                                    <button id="editor-reset-btn" class="btn btn-secondary">重新开始</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="progress-container" id="editor-progress" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill" id="editor-progress-fill"></div>
                        </div>
                        <div class="progress-text" id="editor-progress-text">准备中...</div>
                    </div>
                    
                    <div class="result-panel" id="editor-result" style="display: none;">
                        <h4>编辑结果</h4>
                        <div class="result-preview">
                            <canvas id="result-canvas" class="result-canvas"></canvas>
                        </div>
                        <div class="result-info">
                            <div class="info-item">
                                <span>原始尺寸:</span>
                                <span id="original-size-result">-</span>
                            </div>
                            <div class="info-item">
                                <span>应用效果:</span>
                                <span id="applied-effects-result">-</span>
                            </div>
                        </div>
                        
                        <div class="download-section">
                            <button id="download-btn" class="btn btn-primary">下载编辑后的图片</button>
                        </div>
                    </div>
                </div>
                
                <div class="tab-content" id="batch-mode" style="display: none;">
                    ${this.getBatchUI()}
                </div>
            </div>
            
            <style>
                .image-editor-ui .current-image-info {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                    margin-top: var(--spacing-md);
                }
                
                .image-editor-ui .image-info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: var(--spacing-sm);
                    margin-top: var(--spacing-sm);
                }
                
                .image-editor-ui .info-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--spacing-xs);
                    background: var(--bg-card);
                    border-radius: var(--border-radius-sm);
                }
                
                .image-editor-ui .info-label {
                    font-size: 12px;
                    color: var(--text-muted);
                }
                
                .image-editor-ui .info-value {
                    font-weight: 500;
                    color: var(--text-primary);
                }
                
                .image-editor-ui .editor-workspace {
                    margin-top: var(--spacing-md);
                    display: grid;
                    grid-template-columns: 1fr 350px;
                    gap: var(--spacing-md);
                }
                
                .image-editor-ui .editor-preview-container {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                }
                
                .image-editor-ui .editor-preview {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 300px;
                }
                
                .image-editor-ui .preview-canvas {
                    max-width: 100%;
                    max-height: 500px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-sm);
                }
                
                .image-editor-ui .editor-controls {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                }
                
                .image-editor-ui .editor-tabs {
                    display: flex;
                    margin-bottom: var(--spacing-md);
                    border-bottom: 2px solid var(--border-color);
                }
                
                .image-editor-ui .editor-tab {
                    flex: 1;
                    padding: var(--spacing-sm);
                    border: none;
                    background: none;
                    cursor: pointer;
                    font-size: 14px;
                    color: var(--text-muted);
                    border-bottom: 2px solid transparent;
                    transition: all 0.2s ease;
                }
                
                .image-editor-ui .editor-tab.active {
                    color: var(--color-primary);
                    border-bottom-color: var(--color-primary);
                }
                
                .image-editor-ui .editor-tab:hover {
                    color: var(--color-primary);
                    background: var(--bg-hover);
                }
                
                .image-editor-ui .editor-panel {
                    margin-bottom: var(--spacing-md);
                }
                
                .image-editor-ui .editor-panel h5 {
                    margin: 0 0 var(--spacing-sm) 0;
                    font-size: 14px;
                    color: var(--text-primary);
                }
                
                .image-editor-ui .preset-buttons {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
                    gap: var(--spacing-xs);
                }
                
                .image-editor-ui .preset-btn {
                    padding: 6px 12px;
                    border: 1px solid var(--border-color);
                    background: var(--bg-card);
                    color: var(--text-secondary);
                    border-radius: var(--border-radius-sm);
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s ease;
                }
                
                .image-editor-ui .preset-btn.active {
                    background: var(--color-primary);
                    color: white;
                    border-color: var(--color-primary);
                }
                
                .image-editor-ui .preset-btn:hover {
                    border-color: var(--color-primary);
                    color: var(--color-primary);
                }
                
                .image-editor-ui .adjustment-controls {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-md);
                }
                
                .image-editor-ui .adjustment-group {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-xs);
                }
                
                .image-editor-ui .adjustment-label {
                    font-size: 14px;
                    color: var(--text-primary);
                    display: flex;
                    justify-content: space-between;
                }
                
                .image-editor-ui .adjustment-slider {
                    width: 100%;
                    height: 4px;
                    background: var(--bg-card);
                    border-radius: 2px;
                    outline: none;
                    -webkit-appearance: none;
                    appearance: none;
                }
                
                .image-editor-ui .adjustment-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    background: var(--color-primary);
                    border-radius: 50%;
                    cursor: pointer;
                }
                
                .image-editor-ui .adjustment-slider::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    background: var(--color-primary);
                    border-radius: 50%;
                    cursor: pointer;
                    border: none;
                }
                
                .image-editor-ui .effect-controls {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-md);
                }
                
                .image-editor-ui .effect-toggles {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-sm);
                }
                
                .image-editor-ui .toggle-label {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-xs);
                    cursor: pointer;
                    font-size: 14px;
                    color: var(--text-primary);
                }
                
                .image-editor-ui .text-controls {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-md);
                }
                
                .image-editor-ui .form-row {
                    display: flex;
                    gap: var(--spacing-md);
                }
                
                .image-editor-ui .form-row .form-group {
                    flex: 1;
                }
                
                .image-editor-ui .color-input {
                    width: 40px;
                    height: 32px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-sm);
                    cursor: pointer;
                }
                
                .image-editor-ui .text-actions {
                    display: flex;
                    gap: var(--spacing-sm);
                }
                
                .image-editor-ui .editor-actions {
                    border-top: 1px solid var(--border-color);
                    padding-top: var(--spacing-md);
                }
                
                .image-editor-ui .quality-control {
                    margin-bottom: var(--spacing-md);
                }
                
                .image-editor-ui .action-buttons {
                    display: flex;
                    gap: var(--spacing-sm);
                    flex-wrap: wrap;
                }
                
                .image-editor-ui .result-panel {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                    margin-top: var(--spacing-md);
                }
                
                .image-editor-ui .result-preview {
                    text-align: center;
                    margin-bottom: var(--spacing-md);
                }
                
                .image-editor-ui .result-canvas {
                    max-width: 300px;
                    max-height: 300px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-sm);
                }
                
                .image-editor-ui .result-info {
                    display: flex;
                    gap: var(--spacing-md);
                    justify-content: center;
                    margin-bottom: var(--spacing-md);
                    flex-wrap: wrap;
                }
                
                .image-editor-ui .download-section {
                    text-align: center;
                }
                
                .image-editor-ui .processing-mode-tabs {
                    display: flex;
                    margin-bottom: var(--spacing-md);
                    border-bottom: 2px solid var(--border-color);
                }
                
                .image-editor-ui .tab-button {
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
                
                .image-editor-ui .tab-button.active {
                    color: var(--color-primary);
                    border-bottom-color: var(--color-primary);
                }
                
                .image-editor-ui .tab-button:hover {
                    color: var(--color-primary);
                    background: var(--bg-hover);
                }
                
                .image-editor-ui .tab-content {
                    min-height: 400px;
                }
                
                @media (max-width: 768px) {
                    .image-editor-ui .editor-workspace {
                        grid-template-columns: 1fr;
                    }
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
        
        const fileInput = document.getElementById('editor-file-input');
        const uploadArea = document.getElementById('editor-upload-area');
        
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

        this.bindEditorEvents();
    }

    /**
     * 绑定编辑器相关事件
     */
    bindEditorEvents() {
        // 编辑器tab切换
        document.querySelectorAll('.editor-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchEditorTab(e.target.dataset.tab);
            });
        });

        // 预设滤镜
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.applyPreset(e.target.dataset.preset);
            });
        });

        // 调整滑块
        const adjustmentSliders = [
            { id: 'brightness-slider', valueId: 'brightness-value', param: 'brightness' },
            { id: 'contrast-slider', valueId: 'contrast-value', param: 'contrast' },
            { id: 'saturation-slider', valueId: 'saturation-value', param: 'saturation' },
            { id: 'blur-slider', valueId: 'blur-value', param: 'blur', unit: 'px' }
        ];

        adjustmentSliders.forEach(({ id, valueId, param, unit = '' }) => {
            const slider = document.getElementById(id);
            const valueDisplay = document.getElementById(valueId);
            
            if (slider && valueDisplay) {
                slider.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    valueDisplay.textContent = value + unit;
                    this.editParams[param] = value;
                    this.updatePreview();
                });
            }
        });

        // 效果开关
        const effectToggles = [
            { id: 'sepia-toggle', param: 'sepia' },
            { id: 'grayscale-toggle', param: 'grayscale' },
            { id: 'invert-toggle', param: 'invert' },
            { id: 'vintage-toggle', param: 'vintage' }
        ];

        effectToggles.forEach(({ id, param }) => {
            const toggle = document.getElementById(id);
            if (toggle) {
                toggle.addEventListener('change', (e) => {
                    this.editParams[param] = e.target.checked;
                    this.updatePreview();
                });
            }
        });

        // 文字透明度滑块
        const textOpacitySlider = document.getElementById('text-opacity');
        const textOpacityValue = document.getElementById('text-opacity-value');
        
        if (textOpacitySlider && textOpacityValue) {
            textOpacitySlider.addEventListener('input', (e) => {
                const value = Math.round(e.target.value * 100);
                textOpacityValue.textContent = value + '%';
            });
        }

        // 文字操作
        const addTextBtn = document.getElementById('add-text-btn');
        if (addTextBtn) {
            addTextBtn.addEventListener('click', () => {
                this.addTextOverlay();
            });
        }

        const clearTextBtn = document.getElementById('clear-text-btn');
        if (clearTextBtn) {
            clearTextBtn.addEventListener('click', () => {
                this.clearTextOverlays();
            });
        }

        // 质量滑块
        const qualitySlider = document.getElementById('editor-quality');
        const qualityValue = document.getElementById('quality-value');
        
        if (qualitySlider && qualityValue) {
            qualitySlider.addEventListener('input', (e) => {
                const value = Math.round(e.target.value * 100);
                qualityValue.textContent = value + '%';
            });
        }

        // 操作按钮
        const resetAllBtn = document.getElementById('reset-all-btn');
        if (resetAllBtn) {
            resetAllBtn.addEventListener('click', () => {
                this.resetAllEffects();
            });
        }

        const applyEditBtn = document.getElementById('apply-edit-btn');
        if (applyEditBtn) {
            applyEditBtn.addEventListener('click', () => {
                this.handleApplyEdit();
            });
        }

        const editorResetBtn = document.getElementById('editor-reset-btn');
        if (editorResetBtn) {
            editorResetBtn.addEventListener('click', () => {
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
     * 切换编辑器tab
     */
    switchEditorTab(tabName) {
        // 更新tab状态
        document.querySelectorAll('.editor-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });

        // 切换面板
        document.querySelectorAll('.editor-panel').forEach(panel => {
            panel.style.display = 'none';
        });

        const targetPanel = document.getElementById(tabName + '-panel');
        if (targetPanel) {
            targetPanel.style.display = 'block';
        }
    }

    /**
     * 应用预设滤镜
     */
    applyPreset(preset) {
        // 更新预设按钮状态
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.preset === preset) {
                btn.classList.add('active');
            }
        });

        // 重置参数
        this.resetEditParams();

        // 应用预设
        switch (preset) {
            case 'original':
                // 已经重置，无需额外操作
                break;
            case 'vintage':
                this.editParams.vintage = true;
                break;
            case 'sepia':
                this.editParams.sepia = true;
                break;
            case 'grayscale':
                this.editParams.grayscale = true;
                break;
            case 'invert':
                this.editParams.invert = true;
                break;
            case 'bright':
                this.editParams.brightness = 30;
                this.editParams.contrast = 20;
                break;
            case 'dramatic':
                this.editParams.contrast = 50;
                this.editParams.saturation = 30;
                break;
        }

        this.updateControlsFromParams();
        this.updatePreview();
    }

    /**
     * 重置编辑参数
     */
    resetEditParams() {
        this.editParams = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            blur: 0,
            sepia: false,
            grayscale: false,
            invert: false,
            vintage: false,
            textOverlays: []
        };
    }

    /**
     * 根据参数更新控件
     */
    updateControlsFromParams() {
        // 更新滑块
        const sliders = [
            { id: 'brightness-slider', valueId: 'brightness-value', param: 'brightness' },
            { id: 'contrast-slider', valueId: 'contrast-value', param: 'contrast' },
            { id: 'saturation-slider', valueId: 'saturation-value', param: 'saturation' },
            { id: 'blur-slider', valueId: 'blur-value', param: 'blur', unit: 'px' }
        ];

        sliders.forEach(({ id, valueId, param, unit = '' }) => {
            const slider = document.getElementById(id);
            const valueDisplay = document.getElementById(valueId);
            
            if (slider && valueDisplay) {
                slider.value = this.editParams[param];
                valueDisplay.textContent = this.editParams[param] + unit;
            }
        });

        // 更新开关
        const toggles = [
            { id: 'sepia-toggle', param: 'sepia' },
            { id: 'grayscale-toggle', param: 'grayscale' },
            { id: 'invert-toggle', param: 'invert' },
            { id: 'vintage-toggle', param: 'vintage' }
        ];

        toggles.forEach(({ id, param }) => {
            const toggle = document.getElementById(id);
            if (toggle) {
                toggle.checked = this.editParams[param];
            }
        });
    }

    /**
     * 添加文字覆盖层
     */
    addTextOverlay() {
        const text = document.getElementById('text-input')?.value || '';
        const fontSize = parseInt(document.getElementById('text-size')?.value || 24);
        const color = document.getElementById('text-color')?.value || '#FFFFFF';
        const x = parseInt(document.getElementById('text-x')?.value || 50);
        const y = parseInt(document.getElementById('text-y')?.value || 50);
        const opacity = parseFloat(document.getElementById('text-opacity')?.value || 1);

        if (!text.trim()) {
            this.showError('请输入文字内容');
            return;
        }

        const overlay = {
            text: text.trim(),
            fontSize,
            color,
            x,
            y,
            opacity,
            fontFamily: 'Arial',
            fontWeight: 'normal'
        };

        this.editParams.textOverlays.push(overlay);
        this.updatePreview();

        // 清空输入框
        const textInput = document.getElementById('text-input');
        if (textInput) textInput.value = '';
    }

    /**
     * 清除文字覆盖层
     */
    clearTextOverlays() {
        this.editParams.textOverlays = [];
        this.updatePreview();
    }

    /**
     * 重置所有效果
     */
    resetAllEffects() {
        this.resetEditParams();
        this.updateControlsFromParams();
        this.updatePreview();
        
        // 重置预设按钮状态
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.preset === 'original') {
                btn.classList.add('active');
            }
        });
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
        this.resetEditParams();

        // 获取图像尺寸并初始化编辑器
        const img = new Image();
        img.onload = () => {
            this.originalWidth = img.width;
            this.originalHeight = img.height;
            this.originalImage = img;
            
            this.showImageInfo(file, img.width, img.height);
            this.initializeEditor();
            
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
     * 初始化编辑器
     */
    initializeEditor() {
        const editorWorkspace = document.getElementById('editor-workspace');
        const previewCanvas = document.getElementById('preview-canvas');
        const applyEditBtn = document.getElementById('apply-edit-btn');

        if (editorWorkspace) editorWorkspace.style.display = 'grid';
        if (applyEditBtn) applyEditBtn.disabled = false;

        // 设置预览画布
        if (previewCanvas) {
            this.previewCanvas = previewCanvas;
            this.previewCtx = previewCanvas.getContext('2d');
            
            this.updatePreview();
        }
    }

    /**
     * 更新预览
     */
    updatePreview() {
        if (!this.originalImage || !this.previewCanvas) return;

        const img = this.originalImage;
        
        // 计算预览尺寸
        const maxWidth = 600;
        const maxHeight = 500;
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        
        const displayWidth = img.width * scale;
        const displayHeight = img.height * scale;
        
        this.previewCanvas.width = displayWidth;
        this.previewCanvas.height = displayHeight;
        
        // 设置高质量渲染
        this.previewCtx.imageSmoothingEnabled = true;
        this.previewCtx.imageSmoothingQuality = 'high';
        
        // 构建滤镜字符串
        let filterString = '';
        
        if (this.editParams.brightness !== 0) {
            filterString += `brightness(${100 + this.editParams.brightness}%) `;
        }
        
        if (this.editParams.contrast !== 0) {
            filterString += `contrast(${100 + this.editParams.contrast}%) `;
        }
        
        if (this.editParams.saturation !== 0) {
            filterString += `saturate(${100 + this.editParams.saturation}%) `;
        }
        
        if (this.editParams.blur > 0) {
            filterString += `blur(${this.editParams.blur}px) `;
        }
        
        if (this.editParams.sepia) {
            filterString += 'sepia(100%) ';
        }
        
        if (this.editParams.grayscale) {
            filterString += 'grayscale(100%) ';
        }
        
        if (this.editParams.invert) {
            filterString += 'invert(100%) ';
        }
        
        if (this.editParams.vintage) {
            filterString += 'sepia(50%) contrast(120%) brightness(90%) ';
        }
        
        // 应用滤镜
        this.previewCtx.filter = filterString.trim() || 'none';
        
        // 绘制图像
        this.previewCtx.drawImage(img, 0, 0, displayWidth, displayHeight);
        
        // 重置滤镜
        this.previewCtx.filter = 'none';
        
        // 添加文字覆盖层
        this.editParams.textOverlays.forEach(overlay => {
            const {
                text, fontSize, color, x, y, opacity, fontFamily, fontWeight
            } = overlay;
            
            this.previewCtx.save();
            this.previewCtx.font = `${fontWeight} ${fontSize * scale}px ${fontFamily}`;
            this.previewCtx.fillStyle = color;
            this.previewCtx.globalAlpha = opacity;
            
            // 添加文字阴影
            this.previewCtx.shadowColor = color === '#FFFFFF' ? '#000000' : '#FFFFFF';
            this.previewCtx.shadowBlur = 2;
            this.previewCtx.shadowOffsetX = 1;
            this.previewCtx.shadowOffsetY = 1;
            
            this.previewCtx.fillText(text, x * scale, y * scale);
            this.previewCtx.restore();
        });
    }

    /**
     * 获取当前编辑选项
     */
    getCurrentEditOptions() {
        const quality = parseFloat(document.getElementById('editor-quality')?.value || 0.9);
        
        return {
            ...this.editParams,
            quality
        };
    }

    /**
     * 处理应用编辑操作
     */
    async handleApplyEdit() {
        if (!this.currentFile) return;

        try {
            const options = this.getCurrentEditOptions();

            // 显示进度条
            const progressContainer = document.getElementById('editor-progress');
            if (progressContainer) progressContainer.style.display = 'block';

            const editedBlob = await this.execute(this.currentFile, options);

            this.currentEditedBlob = editedBlob;
            this.showResult();

        } catch (error) {
            console.error('Edit failed:', error);
        } finally {
            // 隐藏进度条
            const progressContainer = document.getElementById('editor-progress');
            if (progressContainer) progressContainer.style.display = 'none';
        }
    }

    /**
     * 显示编辑结果
     */
    showResult() {
        const resultPanel = document.getElementById('editor-result');
        const resultCanvas = document.getElementById('result-canvas');
        const originalSizeResult = document.getElementById('original-size-result');
        const appliedEffectsResult = document.getElementById('applied-effects-result');

        if (resultPanel) resultPanel.style.display = 'block';
        if (originalSizeResult) originalSizeResult.textContent = `${this.originalWidth} × ${this.originalHeight}`;
        
        // 生成应用效果描述
        const effects = [];
        if (this.editParams.brightness !== 0) effects.push('亮度调整');
        if (this.editParams.contrast !== 0) effects.push('对比度调整');
        if (this.editParams.saturation !== 0) effects.push('饱和度调整');
        if (this.editParams.blur > 0) effects.push('模糊效果');
        if (this.editParams.sepia) effects.push('褐色滤镜');
        if (this.editParams.grayscale) effects.push('黑白滤镜');
        if (this.editParams.invert) effects.push('反色滤镜');
        if (this.editParams.vintage) effects.push('复古滤镜');
        if (this.editParams.textOverlays.length > 0) effects.push(`文字覆盖(${this.editParams.textOverlays.length}个)`);
        
        if (appliedEffectsResult) {
            appliedEffectsResult.textContent = effects.length > 0 ? effects.join(', ') : '无';
        }

        // 显示结果预览
        if (resultCanvas && this.currentEditedBlob) {
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
            img.src = URL.createObjectURL(this.currentEditedBlob);
        }
    }

    /**
     * 处理重置操作
     */
    handleReset() {
        // 重置表单
        const fileInput = document.getElementById('editor-file-input');
        if (fileInput) fileInput.value = '';

        // 隐藏面板
        const infoPanel = document.getElementById('current-image-info');
        const editorWorkspace = document.getElementById('editor-workspace');
        const resultPanel = document.getElementById('editor-result');
        const progressContainer = document.getElementById('editor-progress');

        if (infoPanel) infoPanel.style.display = 'none';
        if (editorWorkspace) editorWorkspace.style.display = 'none';
        if (resultPanel) resultPanel.style.display = 'none';
        if (progressContainer) progressContainer.style.display = 'none';

        // 重置数据
        this.currentFile = null;
        this.currentEditedBlob = null;
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.originalImage = null;
        this.resetEditParams();

        // 重置控件
        this.updateControlsFromParams();
        this.resetAllEffects();

        // 禁用应用按钮
        const applyEditBtn = document.getElementById('apply-edit-btn');
        if (applyEditBtn) applyEditBtn.disabled = true;
    }

    /**
     * 处理下载操作
     */
    handleDownload() {
        if (!this.currentEditedBlob || !this.currentFile) return;

        const extension = this.currentFile.name.split('.').pop();
        const nameWithoutExt = this.currentFile.name.replace(/\.[^/.]+$/, '');
        const filename = `${nameWithoutExt}_edited.${extension}`;

        this.downloadFile(this.currentEditedBlob, filename);
    }

    /**
     * 自定义进度显示
     */
    showProgress(progress, message = '') {
        super.showProgress(progress, message);

        const progressFill = document.getElementById('editor-progress-fill');
        const progressText = document.getElementById('editor-progress-text');

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
                <h5>批量编辑设置</h5>
                <div class="batch-edit-presets">
                    <label class="radio-label">
                        <input type="radio" name="batch-edit-preset" value="none" checked>
                        <span>无处理</span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="batch-edit-preset" value="vintage">
                        <span>复古滤镜</span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="batch-edit-preset" value="grayscale">
                        <span>黑白滤镜</span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="batch-edit-preset" value="bright">
                        <span>明亮效果</span>
                    </label>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="batch-brightness">亮度调整: <span id="batch-brightness-value">0</span></label>
                <input type="range" 
                       id="batch-brightness" 
                       class="form-input"
                       min="-100" 
                       max="100" 
                       value="0" />
            </div>
            
            <div class="form-group">
                <label class="form-label" for="batch-contrast">对比度调整: <span id="batch-contrast-value">0</span></label>
                <input type="range" 
                       id="batch-contrast" 
                       class="form-input"
                       min="-100" 
                       max="100" 
                       value="0" />
            </div>
            
            <div class="form-group">
                <label class="form-label" for="batch-saturation">饱和度调整: <span id="batch-saturation-value">0</span></label>
                <input type="range" 
                       id="batch-saturation" 
                       class="form-input"
                       min="-100" 
                       max="100" 
                       value="0" />
            </div>
            
            <div class="form-group">
                <label class="form-label" for="batch-editor-quality">输出质量: <span id="batch-editor-quality-value">90%</span></label>
                <input type="range" 
                       id="batch-editor-quality" 
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
        const preset = document.querySelector('input[name="batch-edit-preset"]:checked')?.value || 'none';
        const brightness = parseInt(document.getElementById('batch-brightness')?.value || 0);
        const contrast = parseInt(document.getElementById('batch-contrast')?.value || 0);
        const saturation = parseInt(document.getElementById('batch-saturation')?.value || 0);
        const quality = parseFloat(document.getElementById('batch-editor-quality')?.value || 0.9);
        
        let options = {
            maxConcurrency,
            brightness,
            contrast,
            saturation,
            blur: 0,
            sepia: false,
            grayscale: false,
            invert: false,
            vintage: false,
            textOverlays: [],
            quality,
            suffix: 'edited'
        };
        
        // 应用预设
        switch (preset) {
            case 'vintage':
                options.vintage = true;
                break;
            case 'grayscale':
                options.grayscale = true;
                break;
            case 'bright':
                options.brightness = 30;
                options.contrast = 20;
                break;
        }
        
        return options;
    }
    
    /**
     * 获取默认文件名后缀
     */
    getDefaultSuffix() {
        return 'edited';
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
        // 批量调整滑块
        const sliders = [
            { id: 'batch-brightness', valueId: 'batch-brightness-value' },
            { id: 'batch-contrast', valueId: 'batch-contrast-value' },
            { id: 'batch-saturation', valueId: 'batch-saturation-value' }
        ];
        
        sliders.forEach(({ id, valueId }) => {
            const slider = document.getElementById(id);
            const valueDisplay = document.getElementById(valueId);
            
            if (slider && valueDisplay) {
                slider.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    valueDisplay.textContent = value;
                });
            }
        });
        
        // 批量质量滑块
        const qualitySlider = document.getElementById('batch-editor-quality');
        const qualityValue = document.getElementById('batch-editor-quality-value');
        
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
        this.currentEditedBlob = null;
        this.originalImage = null;
        this.originalImageData = null;
        this.resetEditParams();
    }
}