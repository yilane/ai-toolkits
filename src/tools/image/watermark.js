import ImageToolBase from './base/ImageToolBase.js';

/**
 * 水印添加工具
 * 支持文字水印和图片水印，可调整位置、透明度、大小等属性，并支持批量处理
 */
export default class WatermarkTool extends ImageToolBase {
    constructor() {
        super({
            id: 'watermark',
            name: '添加水印',
            description: '为图像添加文字或图片水印，支持位置、透明度、大小调整，并支持批量处理。',
            category: 'image',
            icon: '💧',
            iconColor: '#0EA5E9',
            version: '1.0.0'
        });
        
        this.canvas = null;
        this.ctx = null;
        this.currentFile = null;
        this.currentWatermarkedBlob = null;
        this.previewCanvas = null;
        this.previewCtx = null;
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.watermarkImage = null;
        this.originalImage = null;
    }

    /**
     * 验证输入文件
     */
    validate(file) {
        const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        
        if (!file) {
            return { valid: false, message: '请选择要添加水印的图片文件' };
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
     * 执行水印添加
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
                type = 'text',
                text = '水印',
                fontSize = 24,
                fontFamily = 'Arial',
                fontColor = '#FFFFFF',
                fontWeight = 'normal',
                position = 'bottom-right',
                opacity = 0.7,
                margin = 20,
                watermarkImage = null,
                imageScale = 0.2,
                quality = 0.9
            } = options;

            this.showProgress(10, '正在读取图像...');

            const watermarkedBlob = await this.addWatermark(file, {
                type, text, fontSize, fontFamily, fontColor, fontWeight,
                position, opacity, margin, watermarkImage, imageScale, quality
            });

            this.updateUsageStats();
            
            this.showProgress(100, '水印添加完成！');
            this.showSuccess(`水印添加完成：${type === 'text' ? '文字水印' : '图片水印'}`);
            
            return watermarkedBlob;
        } catch (error) {
            this.showError('水印添加失败', error);
            throw error;
        } finally {
            this.setProcessing(false);
        }
    }

    /**
     * 添加水印
     */
    async addWatermark(file, options) {
        return new Promise((resolve, reject) => {
            const { type, text, fontSize, fontFamily, fontColor, fontWeight,
                    position, opacity, margin, watermarkImage, imageScale, quality } = options;
            
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

                    this.showProgress(50, '正在绘制基础图像...');

                    // 绘制原始图像
                    this.ctx.drawImage(img, 0, 0);

                    this.showProgress(70, '正在添加水印...');

                    // 添加水印
                    if (type === 'text') {
                        await this.addTextWatermark(text, fontSize, fontFamily, fontColor, fontWeight, position, opacity, margin);
                    } else if (type === 'image' && watermarkImage) {
                        await this.addImageWatermark(watermarkImage, position, opacity, margin, imageScale);
                    }

                    this.showProgress(90, '正在生成文件...');

                    // 转换为 Blob
                    this.canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('水印添加失败'));
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
     * 添加文字水印
     */
    addTextWatermark(text, fontSize, fontFamily, fontColor, fontWeight, position, opacity, margin) {
        return new Promise((resolve) => {
            // 设置字体
            this.ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
            this.ctx.fillStyle = fontColor;
            this.ctx.globalAlpha = opacity;
            
            // 测量文字尺寸
            const metrics = this.ctx.measureText(text);
            const textWidth = metrics.width;
            const textHeight = fontSize;
            
            // 计算位置
            const pos = this.calculatePosition(position, textWidth, textHeight, margin);
            
            // 添加文字描边（增强可读性）
            this.ctx.strokeStyle = fontColor === '#FFFFFF' ? '#000000' : '#FFFFFF';
            this.ctx.lineWidth = 1;
            this.ctx.strokeText(text, pos.x, pos.y);
            
            // 绘制文字
            this.ctx.fillText(text, pos.x, pos.y);
            
            // 恢复透明度
            this.ctx.globalAlpha = 1;
            
            resolve();
        });
    }

    /**
     * 添加图片水印
     */
    addImageWatermark(watermarkImageSrc, position, opacity, margin, scale) {
        return new Promise((resolve, reject) => {
            const watermarkImg = new Image();
            
            watermarkImg.onload = () => {
                // 计算水印图片尺寸
                const watermarkWidth = watermarkImg.width * scale;
                const watermarkHeight = watermarkImg.height * scale;
                
                // 计算位置
                const pos = this.calculatePosition(position, watermarkWidth, watermarkHeight, margin);
                
                // 设置透明度
                this.ctx.globalAlpha = opacity;
                
                // 绘制水印图片
                this.ctx.drawImage(watermarkImg, pos.x, pos.y, watermarkWidth, watermarkHeight);
                
                // 恢复透明度
                this.ctx.globalAlpha = 1;
                
                resolve();
            };
            
            watermarkImg.onerror = () => {
                reject(new Error('水印图片加载失败'));
            };
            
            // 支持 File 对象或 URL
            if (watermarkImageSrc instanceof File) {
                watermarkImg.src = URL.createObjectURL(watermarkImageSrc);
            } else {
                watermarkImg.src = watermarkImageSrc;
            }
        });
    }

    /**
     * 计算水印位置
     */
    calculatePosition(position, watermarkWidth, watermarkHeight, margin) {
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        let x, y;
        
        switch (position) {
            case 'top-left':
                x = margin;
                y = margin + watermarkHeight;
                break;
            case 'top-center':
                x = (canvasWidth - watermarkWidth) / 2;
                y = margin + watermarkHeight;
                break;
            case 'top-right':
                x = canvasWidth - watermarkWidth - margin;
                y = margin + watermarkHeight;
                break;
            case 'center-left':
                x = margin;
                y = (canvasHeight + watermarkHeight) / 2;
                break;
            case 'center':
                x = (canvasWidth - watermarkWidth) / 2;
                y = (canvasHeight + watermarkHeight) / 2;
                break;
            case 'center-right':
                x = canvasWidth - watermarkWidth - margin;
                y = (canvasHeight + watermarkHeight) / 2;
                break;
            case 'bottom-left':
                x = margin;
                y = canvasHeight - margin;
                break;
            case 'bottom-center':
                x = (canvasWidth - watermarkWidth) / 2;
                y = canvasHeight - margin;
                break;
            case 'bottom-right':
            default:
                x = canvasWidth - watermarkWidth - margin;
                y = canvasHeight - margin;
                break;
        }
        
        return { x, y };
    }

    /**
     * 获取工具UI
     */
    getUI() {
        return `
            <div class="tool-ui watermark-ui">
                <div class="processing-mode-tabs">
                    <button class="tab-button active" data-mode="single">单个文件处理</button>
                    <button class="tab-button" data-mode="batch">批量处理</button>
                </div>
                
                <div class="tab-content" id="single-mode">
                    <div class="upload-area" id="watermark-upload-area">
                        <input type="file" 
                               id="watermark-file-input" 
                               accept="image/jpeg,image/jpg,image/png,image/gif" 
                               class="file-input" />
                        <label for="watermark-file-input" class="upload-label">
                            <div class="upload-icon">💧</div>
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
                    
                    <div class="watermark-editor" id="watermark-editor" style="display: none;">
                        <div class="watermark-preview-container">
                            <div class="watermark-preview" id="watermark-preview">
                                <canvas id="preview-canvas" class="preview-canvas"></canvas>
                            </div>
                        </div>
                        
                        <div class="watermark-controls">
                            <div class="watermark-type-section">
                                <h5>水印类型</h5>
                                <div class="watermark-type-tabs">
                                    <button class="type-tab active" data-type="text">文字水印</button>
                                    <button class="type-tab" data-type="image">图片水印</button>
                                </div>
                            </div>
                            
                            <div class="watermark-settings">
                                <!-- 文字水印设置 -->
                                <div id="text-watermark-settings" class="watermark-settings-panel">
                                    <div class="form-group">
                                        <label class="form-label" for="watermark-text">水印文字:</label>
                                        <input type="text" 
                                               id="watermark-text" 
                                               class="form-input"
                                               value="水印" 
                                               placeholder="输入水印文字" />
                                    </div>
                                    
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label class="form-label" for="font-size">字体大小:</label>
                                            <input type="number" 
                                                   id="font-size" 
                                                   class="form-input"
                                                   value="24" 
                                                   min="12" 
                                                   max="200" />
                                        </div>
                                        
                                        <div class="form-group">
                                            <label class="form-label" for="font-family">字体:</label>
                                            <select id="font-family" class="form-input">
                                                <option value="Arial">Arial</option>
                                                <option value="Helvetica">Helvetica</option>
                                                <option value="Times New Roman">Times New Roman</option>
                                                <option value="Courier New">Courier New</option>
                                                <option value="Georgia">Georgia</option>
                                                <option value="Verdana">Verdana</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label class="form-label" for="font-color">字体颜色:</label>
                                            <div class="color-input-container">
                                                <input type="color" 
                                                       id="font-color" 
                                                       class="color-input"
                                                       value="#FFFFFF" />
                                                <span class="color-value">#FFFFFF</span>
                                            </div>
                                        </div>
                                        
                                        <div class="form-group">
                                            <label class="form-label" for="font-weight">字体粗细:</label>
                                            <select id="font-weight" class="form-input">
                                                <option value="normal">正常</option>
                                                <option value="bold">粗体</option>
                                                <option value="lighter">细体</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- 图片水印设置 -->
                                <div id="image-watermark-settings" class="watermark-settings-panel" style="display: none;">
                                    <div class="form-group">
                                        <label class="form-label">水印图片:</label>
                                        <div class="watermark-image-upload">
                                            <input type="file" 
                                                   id="watermark-image-input" 
                                                   accept="image/*" 
                                                   class="file-input" />
                                            <label for="watermark-image-input" class="upload-button">选择水印图片</label>
                                            <div id="watermark-image-preview" class="image-preview" style="display: none;">
                                                <img id="watermark-image-preview-img" class="preview-img" />
                                                <button type="button" id="remove-watermark-image" class="remove-button">×</button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label class="form-label" for="image-scale">水印大小: <span id="scale-value">20%</span></label>
                                        <input type="range" 
                                               id="image-scale" 
                                               class="form-input"
                                               min="0.05" 
                                               max="1" 
                                               step="0.05" 
                                               value="0.2" />
                                    </div>
                                </div>
                                
                                <!-- 通用设置 -->
                                <div class="common-settings">
                                    <div class="form-group">
                                        <label class="form-label" for="watermark-position">位置:</label>
                                        <div class="position-grid">
                                            <button class="position-btn" data-position="top-left">↖</button>
                                            <button class="position-btn" data-position="top-center">↑</button>
                                            <button class="position-btn" data-position="top-right">↗</button>
                                            <button class="position-btn" data-position="center-left">←</button>
                                            <button class="position-btn" data-position="center">●</button>
                                            <button class="position-btn" data-position="center-right">→</button>
                                            <button class="position-btn" data-position="bottom-left">↙</button>
                                            <button class="position-btn" data-position="bottom-center">↓</button>
                                            <button class="position-btn active" data-position="bottom-right">↘</button>
                                        </div>
                                    </div>
                                    
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label class="form-label" for="watermark-opacity">透明度: <span id="opacity-value">70%</span></label>
                                            <input type="range" 
                                                   id="watermark-opacity" 
                                                   class="form-input"
                                                   min="0.1" 
                                                   max="1" 
                                                   step="0.1" 
                                                   value="0.7" />
                                        </div>
                                        
                                        <div class="form-group">
                                            <label class="form-label" for="watermark-margin">边距:</label>
                                            <input type="number" 
                                                   id="watermark-margin" 
                                                   class="form-input"
                                                   value="20" 
                                                   min="0" 
                                                   max="200" />
                                        </div>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label class="form-label" for="watermark-quality">输出质量: <span id="quality-value">90%</span></label>
                                        <input type="range" 
                                               id="watermark-quality" 
                                               class="form-input"
                                               min="0.1" 
                                               max="1" 
                                               step="0.1" 
                                               value="0.9" />
                                    </div>
                                </div>
                            </div>
                            
                            <div class="action-buttons">
                                <button id="preview-watermark-btn" class="btn btn-secondary">预览效果</button>
                                <button id="watermark-btn" class="btn btn-primary" disabled>添加水印</button>
                                <button id="watermark-reset-btn" class="btn btn-secondary">重新开始</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="progress-container" id="watermark-progress" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill" id="watermark-progress-fill"></div>
                        </div>
                        <div class="progress-text" id="watermark-progress-text">准备中...</div>
                    </div>
                    
                    <div class="result-panel" id="watermark-result" style="display: none;">
                        <h4>水印添加结果</h4>
                        <div class="result-preview">
                            <canvas id="result-canvas" class="result-canvas"></canvas>
                        </div>
                        <div class="result-info">
                            <div class="info-item">
                                <span>原始尺寸:</span>
                                <span id="original-size-result">-</span>
                            </div>
                            <div class="info-item">
                                <span>水印类型:</span>
                                <span id="watermark-type-result">-</span>
                            </div>
                        </div>
                        
                        <div class="download-section">
                            <button id="download-btn" class="btn btn-primary">下载添加水印的图片</button>
                        </div>
                    </div>
                </div>
                
                <div class="tab-content" id="batch-mode" style="display: none;">
                    ${this.getBatchUI()}
                </div>
            </div>
            
            <style>
                .watermark-ui .current-image-info {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                    margin-top: var(--spacing-md);
                }
                
                .watermark-ui .image-info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: var(--spacing-sm);
                    margin-top: var(--spacing-sm);
                }
                
                .watermark-ui .info-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--spacing-xs);
                    background: var(--bg-card);
                    border-radius: var(--border-radius-sm);
                }
                
                .watermark-ui .info-label {
                    font-size: 12px;
                    color: var(--text-muted);
                }
                
                .watermark-ui .info-value {
                    font-weight: 500;
                    color: var(--text-primary);
                }
                
                .watermark-ui .watermark-editor {
                    margin-top: var(--spacing-md);
                }
                
                .watermark-ui .watermark-preview-container {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                    margin-bottom: var(--spacing-md);
                }
                
                .watermark-ui .watermark-preview {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 200px;
                }
                
                .watermark-ui .preview-canvas {
                    max-width: 100%;
                    max-height: 400px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-sm);
                }
                
                .watermark-ui .watermark-controls {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                }
                
                .watermark-ui .watermark-controls h5 {
                    margin: 0 0 var(--spacing-sm) 0;
                    font-size: 14px;
                    color: var(--text-primary);
                }
                
                .watermark-ui .watermark-type-section {
                    margin-bottom: var(--spacing-md);
                }
                
                .watermark-ui .watermark-type-tabs {
                    display: flex;
                    border-bottom: 2px solid var(--border-color);
                }
                
                .watermark-ui .type-tab {
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
                
                .watermark-ui .type-tab.active {
                    color: var(--color-primary);
                    border-bottom-color: var(--color-primary);
                }
                
                .watermark-ui .type-tab:hover {
                    color: var(--color-primary);
                    background: var(--bg-hover);
                }
                
                .watermark-ui .watermark-settings {
                    margin-bottom: var(--spacing-md);
                }
                
                .watermark-ui .watermark-settings-panel {
                    margin-bottom: var(--spacing-md);
                }
                
                .watermark-ui .form-row {
                    display: flex;
                    gap: var(--spacing-md);
                }
                
                .watermark-ui .form-row .form-group {
                    flex: 1;
                }
                
                .watermark-ui .color-input-container {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-xs);
                }
                
                .watermark-ui .color-input {
                    width: 40px;
                    height: 32px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-sm);
                    cursor: pointer;
                }
                
                .watermark-ui .color-value {
                    font-size: 12px;
                    color: var(--text-muted);
                    font-family: monospace;
                }
                
                .watermark-ui .watermark-image-upload {
                    position: relative;
                }
                
                .watermark-ui .upload-button {
                    display: inline-block;
                    padding: 8px 16px;
                    background: var(--color-primary);
                    color: white;
                    border-radius: var(--border-radius-sm);
                    cursor: pointer;
                    font-size: 14px;
                    transition: background 0.2s ease;
                }
                
                .watermark-ui .upload-button:hover {
                    background: var(--color-primary-dark);
                }
                
                .watermark-ui .image-preview {
                    position: relative;
                    margin-top: var(--spacing-sm);
                    display: inline-block;
                }
                
                .watermark-ui .preview-img {
                    max-width: 100px;
                    max-height: 100px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-sm);
                }
                
                .watermark-ui .remove-button {
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    width: 20px;
                    height: 20px;
                    background: var(--color-danger);
                    color: white;
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .watermark-ui .position-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 4px;
                    max-width: 120px;
                }
                
                .watermark-ui .position-btn {
                    width: 36px;
                    height: 36px;
                    border: 1px solid var(--border-color);
                    background: var(--bg-card);
                    color: var(--text-secondary);
                    border-radius: var(--border-radius-sm);
                    cursor: pointer;
                    font-size: 16px;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .watermark-ui .position-btn.active {
                    background: var(--color-primary);
                    color: white;
                    border-color: var(--color-primary);
                }
                
                .watermark-ui .position-btn:hover {
                    border-color: var(--color-primary);
                    color: var(--color-primary);
                }
                
                .watermark-ui .action-buttons {
                    display: flex;
                    gap: var(--spacing-sm);
                    flex-wrap: wrap;
                }
                
                .watermark-ui .result-panel {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                    margin-top: var(--spacing-md);
                }
                
                .watermark-ui .result-preview {
                    text-align: center;
                    margin-bottom: var(--spacing-md);
                }
                
                .watermark-ui .result-canvas {
                    max-width: 300px;
                    max-height: 300px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-sm);
                }
                
                .watermark-ui .result-info {
                    display: flex;
                    gap: var(--spacing-md);
                    justify-content: center;
                    margin-bottom: var(--spacing-md);
                    flex-wrap: wrap;
                }
                
                .watermark-ui .download-section {
                    text-align: center;
                }
                
                .watermark-ui .processing-mode-tabs {
                    display: flex;
                    margin-bottom: var(--spacing-md);
                    border-bottom: 2px solid var(--border-color);
                }
                
                .watermark-ui .tab-button {
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
                
                .watermark-ui .tab-button.active {
                    color: var(--color-primary);
                    border-bottom-color: var(--color-primary);
                }
                
                .watermark-ui .tab-button:hover {
                    color: var(--color-primary);
                    background: var(--bg-hover);
                }
                
                .watermark-ui .tab-content {
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
        
        const fileInput = document.getElementById('watermark-file-input');
        const uploadArea = document.getElementById('watermark-upload-area');
        
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

        this.bindWatermarkEvents();
    }

    /**
     * 绑定水印相关事件
     */
    bindWatermarkEvents() {
        // 水印类型切换
        document.querySelectorAll('.type-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchWatermarkType(e.target.dataset.type);
            });
        });

        // 位置按钮
        document.querySelectorAll('.position-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.position-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updatePreview();
            });
        });

        // 文字水印输入
        const textInput = document.getElementById('watermark-text');
        if (textInput) {
            textInput.addEventListener('input', () => this.updatePreview());
        }

        // 字体设置
        ['font-size', 'font-family', 'font-weight'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.updatePreview());
            }
        });

        // 颜色选择
        const fontColorInput = document.getElementById('font-color');
        const colorValue = document.querySelector('.color-value');
        if (fontColorInput && colorValue) {
            fontColorInput.addEventListener('input', (e) => {
                colorValue.textContent = e.target.value;
                this.updatePreview();
            });
        }

        // 水印图片上传
        const watermarkImageInput = document.getElementById('watermark-image-input');
        if (watermarkImageInput) {
            watermarkImageInput.addEventListener('change', (e) => {
                this.handleWatermarkImageSelect(e.target.files[0]);
            });
        }

        // 移除水印图片
        const removeWatermarkImage = document.getElementById('remove-watermark-image');
        if (removeWatermarkImage) {
            removeWatermarkImage.addEventListener('click', () => {
                this.removeWatermarkImage();
            });
        }

        // 滑块控件
        const opacitySlider = document.getElementById('watermark-opacity');
        const opacityValue = document.getElementById('opacity-value');
        if (opacitySlider && opacityValue) {
            opacitySlider.addEventListener('input', (e) => {
                const value = Math.round(e.target.value * 100);
                opacityValue.textContent = value + '%';
                this.updatePreview();
            });
        }

        const scaleSlider = document.getElementById('image-scale');
        const scaleValue = document.getElementById('scale-value');
        if (scaleSlider && scaleValue) {
            scaleSlider.addEventListener('input', (e) => {
                const value = Math.round(e.target.value * 100);
                scaleValue.textContent = value + '%';
                this.updatePreview();
            });
        }

        const qualitySlider = document.getElementById('watermark-quality');
        const qualityValue = document.getElementById('quality-value');
        if (qualitySlider && qualityValue) {
            qualitySlider.addEventListener('input', (e) => {
                const value = Math.round(e.target.value * 100);
                qualityValue.textContent = value + '%';
            });
        }

        // 边距输入
        const marginInput = document.getElementById('watermark-margin');
        if (marginInput) {
            marginInput.addEventListener('input', () => this.updatePreview());
        }

        // 预览按钮
        const previewBtn = document.getElementById('preview-watermark-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                this.updatePreview();
            });
        }

        // 水印按钮
        const watermarkBtn = document.getElementById('watermark-btn');
        if (watermarkBtn) {
            watermarkBtn.addEventListener('click', () => {
                this.handleWatermark();
            });
        }

        // 重新开始按钮
        const watermarkResetBtn = document.getElementById('watermark-reset-btn');
        if (watermarkResetBtn) {
            watermarkResetBtn.addEventListener('click', () => {
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
     * 切换水印类型
     */
    switchWatermarkType(type) {
        // 更新tab状态
        document.querySelectorAll('.type-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.type === type) {
                tab.classList.add('active');
            }
        });

        // 切换设置面板
        const textSettings = document.getElementById('text-watermark-settings');
        const imageSettings = document.getElementById('image-watermark-settings');

        if (type === 'text') {
            if (textSettings) textSettings.style.display = 'block';
            if (imageSettings) imageSettings.style.display = 'none';
        } else if (type === 'image') {
            if (textSettings) textSettings.style.display = 'none';
            if (imageSettings) imageSettings.style.display = 'block';
        }

        this.updatePreview();
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
            this.originalImage = img;
            
            this.showImageInfo(file, img.width, img.height);
            this.initializeWatermarkEditor();
            
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
     * 初始化水印编辑器
     */
    initializeWatermarkEditor() {
        const watermarkEditor = document.getElementById('watermark-editor');
        const previewCanvas = document.getElementById('preview-canvas');
        const watermarkBtn = document.getElementById('watermark-btn');

        if (watermarkEditor) watermarkEditor.style.display = 'block';
        if (watermarkBtn) watermarkBtn.disabled = false;

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
        const maxHeight = 400;
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        
        const displayWidth = img.width * scale;
        const displayHeight = img.height * scale;
        
        this.previewCanvas.width = displayWidth;
        this.previewCanvas.height = displayHeight;
        
        // 清空画布
        this.previewCtx.clearRect(0, 0, displayWidth, displayHeight);
        
        // 设置高质量渲染
        this.previewCtx.imageSmoothingEnabled = true;
        this.previewCtx.imageSmoothingQuality = 'high';
        
        // 绘制原始图像
        this.previewCtx.drawImage(img, 0, 0, displayWidth, displayHeight);
        
        // 添加水印预览
        this.addWatermarkPreview(scale);
    }

    /**
     * 添加水印预览
     */
    addWatermarkPreview(scale) {
        const activeType = document.querySelector('.type-tab.active')?.dataset.type || 'text';
        
        if (activeType === 'text') {
            this.addTextWatermarkPreview(scale);
        } else if (activeType === 'image' && this.watermarkImage) {
            this.addImageWatermarkPreview(scale);
        }
    }

    /**
     * 添加文字水印预览
     */
    addTextWatermarkPreview(scale) {
        const text = document.getElementById('watermark-text')?.value || '水印';
        const fontSize = parseInt(document.getElementById('font-size')?.value || 24) * scale;
        const fontFamily = document.getElementById('font-family')?.value || 'Arial';
        const fontColor = document.getElementById('font-color')?.value || '#FFFFFF';
        const fontWeight = document.getElementById('font-weight')?.value || 'normal';
        const position = document.querySelector('.position-btn.active')?.dataset.position || 'bottom-right';
        const opacity = parseFloat(document.getElementById('watermark-opacity')?.value || 0.7);
        const margin = parseInt(document.getElementById('watermark-margin')?.value || 20) * scale;
        
        // 设置字体
        this.previewCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        this.previewCtx.fillStyle = fontColor;
        this.previewCtx.globalAlpha = opacity;
        
        // 测量文字尺寸
        const metrics = this.previewCtx.measureText(text);
        const textWidth = metrics.width;
        const textHeight = fontSize;
        
        // 计算位置（使用预览画布尺寸）
        const pos = this.calculatePreviewPosition(position, textWidth, textHeight, margin);
        
        // 添加文字描边
        this.previewCtx.strokeStyle = fontColor === '#FFFFFF' ? '#000000' : '#FFFFFF';
        this.previewCtx.lineWidth = 1;
        this.previewCtx.strokeText(text, pos.x, pos.y);
        
        // 绘制文字
        this.previewCtx.fillText(text, pos.x, pos.y);
        
        // 恢复透明度
        this.previewCtx.globalAlpha = 1;
    }

    /**
     * 添加图片水印预览
     */
    addImageWatermarkPreview(scale) {
        if (!this.watermarkImage) return;
        
        const position = document.querySelector('.position-btn.active')?.dataset.position || 'bottom-right';
        const opacity = parseFloat(document.getElementById('watermark-opacity')?.value || 0.7);
        const margin = parseInt(document.getElementById('watermark-margin')?.value || 20) * scale;
        const imageScale = parseFloat(document.getElementById('image-scale')?.value || 0.2);
        
        // 计算水印图片尺寸
        const watermarkWidth = this.watermarkImage.width * imageScale * scale;
        const watermarkHeight = this.watermarkImage.height * imageScale * scale;
        
        // 计算位置
        const pos = this.calculatePreviewPosition(position, watermarkWidth, watermarkHeight, margin);
        
        // 设置透明度
        this.previewCtx.globalAlpha = opacity;
        
        // 绘制水印图片
        this.previewCtx.drawImage(this.watermarkImage, pos.x, pos.y, watermarkWidth, watermarkHeight);
        
        // 恢复透明度
        this.previewCtx.globalAlpha = 1;
    }

    /**
     * 计算预览位置
     */
    calculatePreviewPosition(position, watermarkWidth, watermarkHeight, margin) {
        const canvasWidth = this.previewCanvas.width;
        const canvasHeight = this.previewCanvas.height;
        
        let x, y;
        
        switch (position) {
            case 'top-left':
                x = margin;
                y = margin + watermarkHeight;
                break;
            case 'top-center':
                x = (canvasWidth - watermarkWidth) / 2;
                y = margin + watermarkHeight;
                break;
            case 'top-right':
                x = canvasWidth - watermarkWidth - margin;
                y = margin + watermarkHeight;
                break;
            case 'center-left':
                x = margin;
                y = (canvasHeight + watermarkHeight) / 2;
                break;
            case 'center':
                x = (canvasWidth - watermarkWidth) / 2;
                y = (canvasHeight + watermarkHeight) / 2;
                break;
            case 'center-right':
                x = canvasWidth - watermarkWidth - margin;
                y = (canvasHeight + watermarkHeight) / 2;
                break;
            case 'bottom-left':
                x = margin;
                y = canvasHeight - margin;
                break;
            case 'bottom-center':
                x = (canvasWidth - watermarkWidth) / 2;
                y = canvasHeight - margin;
                break;
            case 'bottom-right':
            default:
                x = canvasWidth - watermarkWidth - margin;
                y = canvasHeight - margin;
                break;
        }
        
        return { x, y };
    }

    /**
     * 处理水印图片选择
     */
    handleWatermarkImageSelect(file) {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showError('请选择有效的图片文件');
            return;
        }

        const img = new Image();
        img.onload = () => {
            this.watermarkImage = img;
            
            // 显示预览
            const preview = document.getElementById('watermark-image-preview');
            const previewImg = document.getElementById('watermark-image-preview-img');
            
            if (preview && previewImg) {
                previewImg.src = img.src;
                preview.style.display = 'block';
            }
            
            this.updatePreview();
        };
        
        img.src = URL.createObjectURL(file);
    }

    /**
     * 移除水印图片
     */
    removeWatermarkImage() {
        this.watermarkImage = null;
        
        const preview = document.getElementById('watermark-image-preview');
        const input = document.getElementById('watermark-image-input');
        
        if (preview) preview.style.display = 'none';
        if (input) input.value = '';
        
        this.updatePreview();
    }

    /**
     * 获取当前水印选项
     */
    getCurrentWatermarkOptions() {
        const activeType = document.querySelector('.type-tab.active')?.dataset.type || 'text';
        const position = document.querySelector('.position-btn.active')?.dataset.position || 'bottom-right';
        const opacity = parseFloat(document.getElementById('watermark-opacity')?.value || 0.7);
        const margin = parseInt(document.getElementById('watermark-margin')?.value || 20);
        const quality = parseFloat(document.getElementById('watermark-quality')?.value || 0.9);
        
        let options = {
            type: activeType,
            position,
            opacity,
            margin,
            quality
        };
        
        if (activeType === 'text') {
            options.text = document.getElementById('watermark-text')?.value || '水印';
            options.fontSize = parseInt(document.getElementById('font-size')?.value || 24);
            options.fontFamily = document.getElementById('font-family')?.value || 'Arial';
            options.fontColor = document.getElementById('font-color')?.value || '#FFFFFF';
            options.fontWeight = document.getElementById('font-weight')?.value || 'normal';
        } else if (activeType === 'image') {
            options.watermarkImage = this.watermarkImage;
            options.imageScale = parseFloat(document.getElementById('image-scale')?.value || 0.2);
        }
        
        return options;
    }

    /**
     * 处理水印操作
     */
    async handleWatermark() {
        if (!this.currentFile) return;

        const activeType = document.querySelector('.type-tab.active')?.dataset.type || 'text';
        
        if (activeType === 'image' && !this.watermarkImage) {
            this.showError('请先选择水印图片');
            return;
        }

        try {
            const options = this.getCurrentWatermarkOptions();

            // 显示进度条
            const progressContainer = document.getElementById('watermark-progress');
            if (progressContainer) progressContainer.style.display = 'block';

            const watermarkedBlob = await this.execute(this.currentFile, options);

            this.currentWatermarkedBlob = watermarkedBlob;
            this.showResult(activeType);

        } catch (error) {
            console.error('Watermark failed:', error);
        } finally {
            // 隐藏进度条
            const progressContainer = document.getElementById('watermark-progress');
            if (progressContainer) progressContainer.style.display = 'none';
        }
    }

    /**
     * 显示水印结果
     */
    showResult(watermarkType) {
        const resultPanel = document.getElementById('watermark-result');
        const resultCanvas = document.getElementById('result-canvas');
        const originalSizeResult = document.getElementById('original-size-result');
        const watermarkTypeResult = document.getElementById('watermark-type-result');

        if (resultPanel) resultPanel.style.display = 'block';
        if (originalSizeResult) originalSizeResult.textContent = `${this.originalWidth} × ${this.originalHeight}`;
        if (watermarkTypeResult) watermarkTypeResult.textContent = watermarkType === 'text' ? '文字水印' : '图片水印';

        // 显示结果预览
        if (resultCanvas && this.currentWatermarkedBlob) {
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
            img.src = URL.createObjectURL(this.currentWatermarkedBlob);
        }
    }

    /**
     * 处理重置操作
     */
    handleReset() {
        // 重置表单
        const fileInput = document.getElementById('watermark-file-input');
        if (fileInput) fileInput.value = '';

        // 隐藏面板
        const infoPanel = document.getElementById('current-image-info');
        const watermarkEditor = document.getElementById('watermark-editor');
        const resultPanel = document.getElementById('watermark-result');
        const progressContainer = document.getElementById('watermark-progress');

        if (infoPanel) infoPanel.style.display = 'none';
        if (watermarkEditor) watermarkEditor.style.display = 'none';
        if (resultPanel) resultPanel.style.display = 'none';
        if (progressContainer) progressContainer.style.display = 'none';

        // 重置数据
        this.currentFile = null;
        this.currentWatermarkedBlob = null;
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.originalImage = null;
        this.watermarkImage = null;

        // 重置水印图片预览
        this.removeWatermarkImage();

        // 禁用水印按钮
        const watermarkBtn = document.getElementById('watermark-btn');
        if (watermarkBtn) watermarkBtn.disabled = true;
    }

    /**
     * 处理下载操作
     */
    handleDownload() {
        if (!this.currentWatermarkedBlob || !this.currentFile) return;

        const activeType = document.querySelector('.type-tab.active')?.dataset.type || 'text';
        const extension = this.currentFile.name.split('.').pop();
        const nameWithoutExt = this.currentFile.name.replace(/\.[^/.]+$/, '');
        const filename = `${nameWithoutExt}_watermarked_${activeType}.${extension}`;

        this.downloadFile(this.currentWatermarkedBlob, filename);
    }

    /**
     * 自定义进度显示
     */
    showProgress(progress, message = '') {
        super.showProgress(progress, message);

        const progressFill = document.getElementById('watermark-progress-fill');
        const progressText = document.getElementById('watermark-progress-text');

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
                <h5>批量水印设置</h5>
                <div class="batch-watermark-types">
                    <label class="radio-label">
                        <input type="radio" name="batch-watermark-type" value="text" checked>
                        <span>文字水印</span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="batch-watermark-type" value="image">
                        <span>图片水印</span>
                    </label>
                </div>
            </div>
            
            <div id="batch-text-watermark">
                <div class="form-group">
                    <label class="form-label" for="batch-watermark-text">水印文字:</label>
                    <input type="text" 
                           id="batch-watermark-text" 
                           class="form-input"
                           value="水印" 
                           placeholder="输入水印文字" />
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="batch-font-size">字体大小:</label>
                    <input type="number" 
                           id="batch-font-size" 
                           class="form-input"
                           value="24" 
                           min="12" 
                           max="200" />
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="batch-font-color">字体颜色:</label>
                    <input type="color" 
                           id="batch-font-color" 
                           class="form-input"
                           value="#FFFFFF" />
                </div>
            </div>
            
            <div id="batch-image-watermark" style="display: none;">
                <div class="form-group">
                    <label class="form-label">水印图片:</label>
                    <input type="file" 
                           id="batch-watermark-image" 
                           accept="image/*" 
                           class="form-input" />
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="batch-image-scale">水印大小: <span id="batch-scale-value">20%</span></label>
                    <input type="range" 
                           id="batch-image-scale" 
                           class="form-input"
                           min="0.05" 
                           max="1" 
                           step="0.05" 
                           value="0.2" />
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="batch-watermark-position">位置:</label>
                <select id="batch-watermark-position" class="form-input">
                    <option value="top-left">左上角</option>
                    <option value="top-center">上中</option>
                    <option value="top-right">右上角</option>
                    <option value="center-left">左中</option>
                    <option value="center">居中</option>
                    <option value="center-right">右中</option>
                    <option value="bottom-left">左下角</option>
                    <option value="bottom-center">下中</option>
                    <option value="bottom-right" selected>右下角</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="batch-watermark-opacity">透明度: <span id="batch-opacity-value">70%</span></label>
                <input type="range" 
                       id="batch-watermark-opacity" 
                       class="form-input"
                       min="0.1" 
                       max="1" 
                       step="0.1" 
                       value="0.7" />
            </div>
            
            <div class="form-group">
                <label class="form-label" for="batch-watermark-quality">输出质量: <span id="batch-watermark-quality-value">90%</span></label>
                <input type="range" 
                       id="batch-watermark-quality" 
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
        const watermarkType = document.querySelector('input[name="batch-watermark-type"]:checked')?.value || 'text';
        const position = document.getElementById('batch-watermark-position')?.value || 'bottom-right';
        const opacity = parseFloat(document.getElementById('batch-watermark-opacity')?.value || 0.7);
        const quality = parseFloat(document.getElementById('batch-watermark-quality')?.value || 0.9);
        
        let options = {
            maxConcurrency,
            type: watermarkType,
            position,
            opacity,
            margin: 20,
            quality,
            suffix: 'watermarked'
        };
        
        if (watermarkType === 'text') {
            options.text = document.getElementById('batch-watermark-text')?.value || '水印';
            options.fontSize = parseInt(document.getElementById('batch-font-size')?.value || 24);
            options.fontFamily = 'Arial';
            options.fontColor = document.getElementById('batch-font-color')?.value || '#FFFFFF';
            options.fontWeight = 'normal';
        } else if (watermarkType === 'image') {
            const watermarkImageFile = document.getElementById('batch-watermark-image')?.files[0];
            if (watermarkImageFile) {
                options.watermarkImage = watermarkImageFile;
            }
            options.imageScale = parseFloat(document.getElementById('batch-image-scale')?.value || 0.2);
        }
        
        return options;
    }
    
    /**
     * 获取默认文件名后缀
     */
    getDefaultSuffix() {
        return 'watermarked';
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
        // 批量水印类型切换
        document.querySelectorAll('input[name="batch-watermark-type"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const textWatermark = document.getElementById('batch-text-watermark');
                const imageWatermark = document.getElementById('batch-image-watermark');
                
                if (e.target.value === 'text') {
                    if (textWatermark) textWatermark.style.display = 'block';
                    if (imageWatermark) imageWatermark.style.display = 'none';
                } else {
                    if (textWatermark) textWatermark.style.display = 'none';
                    if (imageWatermark) imageWatermark.style.display = 'block';
                }
            });
        });
        
        // 批量透明度滑块
        const opacitySlider = document.getElementById('batch-watermark-opacity');
        const opacityValue = document.getElementById('batch-opacity-value');
        
        if (opacitySlider && opacityValue) {
            opacitySlider.addEventListener('input', (e) => {
                const value = Math.round(e.target.value * 100);
                opacityValue.textContent = value + '%';
            });
        }
        
        // 批量尺寸滑块
        const scaleSlider = document.getElementById('batch-image-scale');
        const scaleValue = document.getElementById('batch-scale-value');
        
        if (scaleSlider && scaleValue) {
            scaleSlider.addEventListener('input', (e) => {
                const value = Math.round(e.target.value * 100);
                scaleValue.textContent = value + '%';
            });
        }
        
        // 批量质量滑块
        const qualitySlider = document.getElementById('batch-watermark-quality');
        const qualityValue = document.getElementById('batch-watermark-quality-value');
        
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
        this.currentWatermarkedBlob = null;
        this.originalImage = null;
        this.watermarkImage = null;
    }
}