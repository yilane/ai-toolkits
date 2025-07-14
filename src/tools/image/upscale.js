import ImageToolBase from './base/ImageToolBase.js';

/**
 * 图像质量提升工具
 * 支持基于算法的图像放大和质量增强，并支持批量处理
 */
export default class ImageUpscaleTool extends ImageToolBase {
    constructor() {
        super({
            id: 'image-upscale',
            name: '图像质量提升',
            description: '使用先进算法对图像进行放大和质量增强，保持细节清晰，并支持批量处理。',
            category: 'image',
            icon: '📈',
            iconColor: '#10B981',
            version: '1.0.0'
        });
        
        this.canvas = null;
        this.ctx = null;
        this.currentFile = null;
        this.currentUpscaledBlob = null;
        this.previewCanvas = null;
        this.previewCtx = null;
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.originalImage = null;
    }

    /**
     * 验证输入文件
     */
    validate(file) {
        const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        
        if (!file) {
            return { valid: false, message: '请选择要提升质量的图片文件' };
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
     * 执行图像质量提升
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
                scale = 2,
                algorithm = 'bicubic',
                enhanceSharpness = true,
                enhanceContrast = true,
                enhanceColor = true,
                quality = 0.95
            } = options;

            this.showProgress(10, '正在读取图像...');

            const upscaledBlob = await this.upscaleImage(file, {
                scale, algorithm, enhanceSharpness, enhanceContrast, enhanceColor, quality
            });

            this.updateUsageStats();
            
            this.showProgress(100, '图像质量提升完成！');
            this.showSuccess(`图像质量提升完成：放大 ${scale}x`);
            
            return upscaledBlob;
        } catch (error) {
            this.showError('图像质量提升失败', error);
            throw error;
        } finally {
            this.setProcessing(false);
        }
    }

    /**
     * 图像质量提升处理
     */
    async upscaleImage(file, options) {
        return new Promise((resolve, reject) => {
            const { scale, algorithm, enhanceSharpness, enhanceContrast, enhanceColor, quality } = options;
            
            const img = new Image();
            img.onload = async () => {
                try {
                    this.showProgress(30, '正在处理图像...');
                    
                    // 创建画布
                    this.canvas = document.createElement('canvas');
                    this.ctx = this.canvas.getContext('2d');
                    
                    const newWidth = Math.floor(img.width * scale);
                    const newHeight = Math.floor(img.height * scale);
                    
                    this.canvas.width = newWidth;
                    this.canvas.height = newHeight;

                    // 设置高质量渲染
                    this.ctx.imageSmoothingEnabled = true;
                    this.ctx.imageSmoothingQuality = 'high';

                    this.showProgress(50, '正在应用放大算法...');

                    // 应用放大算法
                    await this.applyUpscaleAlgorithm(img, newWidth, newHeight, algorithm);

                    this.showProgress(70, '正在增强图像质量...');

                    // 应用图像增强
                    if (enhanceSharpness || enhanceContrast || enhanceColor) {
                        this.applyImageEnhancement({
                            enhanceSharpness,
                            enhanceContrast,
                            enhanceColor
                        });
                    }

                    this.showProgress(90, '正在生成文件...');

                    // 转换为 Blob
                    this.canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('图像质量提升失败'));
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
     * 应用放大算法
     */
    async applyUpscaleAlgorithm(img, newWidth, newHeight, algorithm) {
        switch (algorithm) {
            case 'nearest':
                this.ctx.imageSmoothingEnabled = false;
                this.ctx.drawImage(img, 0, 0, newWidth, newHeight);
                break;
                
            case 'bilinear':
                this.ctx.imageSmoothingEnabled = true;
                this.ctx.imageSmoothingQuality = 'low';
                this.ctx.drawImage(img, 0, 0, newWidth, newHeight);
                break;
                
            case 'bicubic':
                this.ctx.imageSmoothingEnabled = true;
                this.ctx.imageSmoothingQuality = 'high';
                this.ctx.drawImage(img, 0, 0, newWidth, newHeight);
                break;
                
            case 'lanczos':
                // 使用多步放大模拟Lanczos效果
                await this.lanczosUpscale(img, newWidth, newHeight);
                break;
                
            case 'super-resolution':
                // 使用边缘保持的超分辨率算法
                await this.superResolutionUpscale(img, newWidth, newHeight);
                break;
                
            default:
                this.ctx.drawImage(img, 0, 0, newWidth, newHeight);
        }
    }

    /**
     * Lanczos风格的多步放大
     */
    async lanczosUpscale(img, finalWidth, finalHeight) {
        const steps = Math.ceil(Math.log2(Math.max(finalWidth / img.width, finalHeight / img.height)));
        let currentCanvas = document.createElement('canvas');
        let currentCtx = currentCanvas.getContext('2d');
        
        currentCanvas.width = img.width;
        currentCanvas.height = img.height;
        currentCtx.drawImage(img, 0, 0);
        
        for (let step = 0; step < steps; step++) {
            const progress = step / steps;
            const stepWidth = Math.floor(img.width + (finalWidth - img.width) * progress);
            const stepHeight = Math.floor(img.height + (finalHeight - img.height) * progress);
            
            const nextCanvas = document.createElement('canvas');
            const nextCtx = nextCanvas.getContext('2d');
            
            nextCanvas.width = stepWidth;
            nextCanvas.height = stepHeight;
            
            nextCtx.imageSmoothingEnabled = true;
            nextCtx.imageSmoothingQuality = 'high';
            nextCtx.drawImage(currentCanvas, 0, 0, stepWidth, stepHeight);
            
            currentCanvas = nextCanvas;
            currentCtx = nextCtx;
        }
        
        // 绘制最终结果
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        this.ctx.drawImage(currentCanvas, 0, 0, finalWidth, finalHeight);
    }

    /**
     * 超分辨率算法（边缘保持）
     */
    async superResolutionUpscale(img, finalWidth, finalHeight) {
        // 首先使用双三次插值
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        this.ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
        
        // 获取图像数据进行边缘增强
        const imageData = this.ctx.getImageData(0, 0, finalWidth, finalHeight);
        const data = imageData.data;
        
        // 应用锐化滤波器
        const sharpened = this.applySharpenFilter(imageData);
        this.ctx.putImageData(sharpened, 0, 0);
    }

    /**
     * 应用锐化滤波器
     */
    applySharpenFilter(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const output = new ImageData(width, height);
        const outputData = output.data;
        
        // 锐化核
        const kernel = [
            [0, -1, 0],
            [-1, 5, -1],
            [0, -1, 0]
        ];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) { // RGB channels
                    let sum = 0;
                    
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const pixelIndex = ((y + ky) * width + (x + kx)) * 4 + c;
                            sum += data[pixelIndex] * kernel[ky + 1][kx + 1];
                        }
                    }
                    
                    const outputIndex = (y * width + x) * 4 + c;
                    outputData[outputIndex] = Math.max(0, Math.min(255, sum));
                }
                
                // Alpha channel
                const alphaIndex = (y * width + x) * 4 + 3;
                outputData[alphaIndex] = data[alphaIndex];
            }
        }
        
        // 复制边界像素
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                    const index = (y * width + x) * 4;
                    for (let c = 0; c < 4; c++) {
                        outputData[index + c] = data[index + c];
                    }
                }
            }
        }
        
        return output;
    }

    /**
     * 应用图像增强
     */
    applyImageEnhancement(options) {
        const { enhanceSharpness, enhanceContrast, enhanceColor } = options;
        
        let filterString = '';
        
        if (enhanceSharpness) {
            filterString += 'contrast(110%) ';
        }
        
        if (enhanceContrast) {
            filterString += 'contrast(115%) brightness(102%) ';
        }
        
        if (enhanceColor) {
            filterString += 'saturate(110%) ';
        }
        
        if (filterString.trim()) {
            // 获取当前图像数据
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            
            // 应用滤镜
            this.ctx.filter = filterString.trim();
            this.ctx.putImageData(imageData, 0, 0);
            
            // 重置滤镜
            this.ctx.filter = 'none';
        }
    }

    /**
     * 获取工具UI
     */
    getUI() {
        return `
            <div class="tool-ui image-upscale-ui">
                <div class="processing-mode-tabs">
                    <button class="tab-button active" data-mode="single">单个文件处理</button>
                    <button class="tab-button" data-mode="batch">批量处理</button>
                </div>
                
                <div class="tab-content" id="single-mode">
                    <div class="upload-area" id="upscale-upload-area">
                        <input type="file" 
                               id="upscale-file-input" 
                               accept="image/jpeg,image/jpg,image/png,image/gif" 
                               class="file-input" />
                        <label for="upscale-file-input" class="upload-label">
                            <div class="upload-icon">📈</div>
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
                    
                    <div class="upscale-editor" id="upscale-editor" style="display: none;">
                        <div class="upscale-preview-container">
                            <div class="preview-comparison">
                                <div class="preview-section">
                                    <h5>原图预览</h5>
                                    <div class="preview-frame">
                                        <canvas id="original-preview-canvas" class="preview-canvas"></canvas>
                                    </div>
                                    <div class="preview-info" id="original-info">-</div>
                                </div>
                                
                                <div class="preview-section">
                                    <h5>放大预览</h5>
                                    <div class="preview-frame">
                                        <canvas id="upscaled-preview-canvas" class="preview-canvas"></canvas>
                                    </div>
                                    <div class="preview-info" id="upscaled-info">-</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="upscale-controls">
                            <div class="scale-settings">
                                <h5>放大设置</h5>
                                <div class="scale-options">
                                    <div class="form-group">
                                        <label class="form-label">放大倍数:</label>
                                        <div class="scale-buttons">
                                            <button class="scale-btn active" data-scale="2">2x</button>
                                            <button class="scale-btn" data-scale="3">3x</button>
                                            <button class="scale-btn" data-scale="4">4x</button>
                                            <button class="scale-btn" data-scale="custom">自定义</button>
                                        </div>
                                    </div>
                                    
                                    <div class="custom-scale-group" id="custom-scale-group" style="display: none;">
                                        <div class="form-row">
                                            <div class="form-group">
                                                <label class="form-label" for="custom-scale">自定义倍数:</label>
                                                <input type="number" 
                                                       id="custom-scale" 
                                                       class="form-input"
                                                       value="2" 
                                                       min="1.1" 
                                                       max="8" 
                                                       step="0.1" />
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">目标尺寸:</label>
                                                <div class="size-display" id="target-size-display">-</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="algorithm-settings">
                                <h5>放大算法</h5>
                                <div class="algorithm-options">
                                    <div class="form-group">
                                        <label class="form-label" for="upscale-algorithm">算法选择:</label>
                                        <select id="upscale-algorithm" class="form-input">
                                            <option value="bicubic">双三次插值 (推荐)</option>
                                            <option value="bilinear">双线性插值</option>
                                            <option value="nearest">最近邻插值</option>
                                            <option value="lanczos">Lanczos算法</option>
                                            <option value="super-resolution">超分辨率算法</option>
                                        </select>
                                    </div>
                                    
                                    <div class="algorithm-description" id="algorithm-description">
                                        双三次插值提供良好的图像质量和处理速度平衡，适合大多数场景。
                                    </div>
                                </div>
                            </div>
                            
                            <div class="enhancement-settings">
                                <h5>质量增强</h5>
                                <div class="enhancement-options">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="enhance-sharpness" checked>
                                        <span>增强锐度</span>
                                    </label>
                                    
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="enhance-contrast" checked>
                                        <span>增强对比度</span>
                                    </label>
                                    
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="enhance-color" checked>
                                        <span>增强色彩</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="quality-control">
                                <label class="form-label" for="upscale-quality">输出质量: <span id="quality-value">95%</span></label>
                                <input type="range" 
                                       id="upscale-quality" 
                                       class="form-input"
                                       min="0.1" 
                                       max="1" 
                                       step="0.05" 
                                       value="0.95" />
                            </div>
                            
                            <div class="action-buttons">
                                <button id="preview-upscale-btn" class="btn btn-secondary">预览效果</button>
                                <button id="upscale-btn" class="btn btn-primary" disabled>开始处理</button>
                                <button id="upscale-reset-btn" class="btn btn-secondary">重新开始</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="progress-container" id="upscale-progress" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill" id="upscale-progress-fill"></div>
                        </div>
                        <div class="progress-text" id="upscale-progress-text">准备中...</div>
                    </div>
                    
                    <div class="result-panel" id="upscale-result" style="display: none;">
                        <h4>质量提升结果</h4>
                        <div class="result-preview">
                            <canvas id="result-canvas" class="result-canvas"></canvas>
                        </div>
                        <div class="result-info">
                            <div class="info-item">
                                <span>原始尺寸:</span>
                                <span id="original-size-result">-</span>
                            </div>
                            <div class="info-item">
                                <span>提升后尺寸:</span>
                                <span id="upscaled-size-result">-</span>
                            </div>
                            <div class="info-item">
                                <span>放大倍数:</span>
                                <span id="scale-result">-</span>
                            </div>
                        </div>
                        
                        <div class="download-section">
                            <button id="download-btn" class="btn btn-primary">下载提升后的图片</button>
                        </div>
                    </div>
                </div>
                
                <div class="tab-content" id="batch-mode" style="display: none;">
                    ${this.getBatchUI()}
                </div>
            </div>
            
            <style>
                .image-upscale-ui .current-image-info {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                    margin-top: var(--spacing-md);
                }
                
                .image-upscale-ui .image-info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: var(--spacing-sm);
                    margin-top: var(--spacing-sm);
                }
                
                .image-upscale-ui .info-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--spacing-xs);
                    background: var(--bg-card);
                    border-radius: var(--border-radius-sm);
                }
                
                .image-upscale-ui .info-label {
                    font-size: 12px;
                    color: var(--text-muted);
                }
                
                .image-upscale-ui .info-value {
                    font-weight: 500;
                    color: var(--text-primary);
                }
                
                .image-upscale-ui .upscale-editor {
                    margin-top: var(--spacing-md);
                }
                
                .image-upscale-ui .upscale-preview-container {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                    margin-bottom: var(--spacing-md);
                }
                
                .image-upscale-ui .preview-comparison {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--spacing-md);
                }
                
                .image-upscale-ui .preview-section h5 {
                    margin: 0 0 var(--spacing-sm) 0;
                    font-size: 14px;
                    color: var(--text-primary);
                    text-align: center;
                }
                
                .image-upscale-ui .preview-frame {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-sm);
                    padding: var(--spacing-sm);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 200px;
                }
                
                .image-upscale-ui .preview-canvas {
                    max-width: 100%;
                    max-height: 200px;
                    border-radius: var(--border-radius-sm);
                }
                
                .image-upscale-ui .preview-info {
                    text-align: center;
                    font-size: 12px;
                    color: var(--text-muted);
                    margin-top: var(--spacing-xs);
                }
                
                .image-upscale-ui .upscale-controls {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                }
                
                .image-upscale-ui .upscale-controls h5 {
                    margin: 0 0 var(--spacing-sm) 0;
                    font-size: 14px;
                    color: var(--text-primary);
                }
                
                .image-upscale-ui .scale-settings {
                    margin-bottom: var(--spacing-md);
                }
                
                .image-upscale-ui .scale-buttons {
                    display: flex;
                    gap: var(--spacing-xs);
                    margin-top: var(--spacing-xs);
                }
                
                .image-upscale-ui .scale-btn {
                    padding: 6px 16px;
                    border: 1px solid var(--border-color);
                    background: var(--bg-card);
                    color: var(--text-secondary);
                    border-radius: var(--border-radius-sm);
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s ease;
                }
                
                .image-upscale-ui .scale-btn.active {
                    background: var(--color-primary);
                    color: white;
                    border-color: var(--color-primary);
                }
                
                .image-upscale-ui .scale-btn:hover {
                    border-color: var(--color-primary);
                    color: var(--color-primary);
                }
                
                .image-upscale-ui .custom-scale-group {
                    margin-top: var(--spacing-sm);
                    padding: var(--spacing-sm);
                    background: var(--bg-card);
                    border-radius: var(--border-radius-sm);
                }
                
                .image-upscale-ui .form-row {
                    display: flex;
                    gap: var(--spacing-md);
                    align-items: end;
                }
                
                .image-upscale-ui .form-row .form-group {
                    flex: 1;
                }
                
                .image-upscale-ui .size-display {
                    padding: 8px;
                    background: var(--bg-secondary);
                    border-radius: var(--border-radius-sm);
                    font-size: 14px;
                    color: var(--text-primary);
                    text-align: center;
                }
                
                .image-upscale-ui .algorithm-settings {
                    margin-bottom: var(--spacing-md);
                }
                
                .image-upscale-ui .algorithm-description {
                    margin-top: var(--spacing-xs);
                    padding: var(--spacing-sm);
                    background: var(--bg-card);
                    border-radius: var(--border-radius-sm);
                    font-size: 12px;
                    color: var(--text-muted);
                    line-height: 1.4;
                }
                
                .image-upscale-ui .enhancement-settings {
                    margin-bottom: var(--spacing-md);
                }
                
                .image-upscale-ui .enhancement-options {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-xs);
                }
                
                .image-upscale-ui .checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-xs);
                    cursor: pointer;
                    font-size: 14px;
                    color: var(--text-primary);
                }
                
                .image-upscale-ui .quality-control {
                    margin-bottom: var(--spacing-md);
                }
                
                .image-upscale-ui .action-buttons {
                    display: flex;
                    gap: var(--spacing-sm);
                    flex-wrap: wrap;
                }
                
                .image-upscale-ui .result-panel {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                    margin-top: var(--spacing-md);
                }
                
                .image-upscale-ui .result-preview {
                    text-align: center;
                    margin-bottom: var(--spacing-md);
                }
                
                .image-upscale-ui .result-canvas {
                    max-width: 400px;
                    max-height: 400px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-sm);
                }
                
                .image-upscale-ui .result-info {
                    display: flex;
                    gap: var(--spacing-md);
                    justify-content: center;
                    margin-bottom: var(--spacing-md);
                    flex-wrap: wrap;
                }
                
                .image-upscale-ui .download-section {
                    text-align: center;
                }
                
                .image-upscale-ui .processing-mode-tabs {
                    display: flex;
                    margin-bottom: var(--spacing-md);
                    border-bottom: 2px solid var(--border-color);
                }
                
                .image-upscale-ui .tab-button {
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
                
                .image-upscale-ui .tab-button.active {
                    color: var(--color-primary);
                    border-bottom-color: var(--color-primary);
                }
                
                .image-upscale-ui .tab-button:hover {
                    color: var(--color-primary);
                    background: var(--bg-hover);
                }
                
                .image-upscale-ui .tab-content {
                    min-height: 400px;
                }
                
                @media (max-width: 768px) {
                    .image-upscale-ui .preview-comparison {
                        grid-template-columns: 1fr;
                    }
                    
                    .image-upscale-ui .form-row {
                        flex-direction: column;
                    }
                    
                    .image-upscale-ui .scale-buttons {
                        flex-wrap: wrap;
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
        
        const fileInput = document.getElementById('upscale-file-input');
        const uploadArea = document.getElementById('upscale-upload-area');
        
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

        this.bindUpscaleEvents();
    }

    /**
     * 绑定放大相关事件
     */
    bindUpscaleEvents() {
        // 放大倍数按钮
        document.querySelectorAll('.scale-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setScale(e.target.dataset.scale);
            });
        });

        // 自定义倍数输入
        const customScaleInput = document.getElementById('custom-scale');
        if (customScaleInput) {
            customScaleInput.addEventListener('input', () => {
                this.updateTargetSize();
            });
        }

        // 算法选择
        const algorithmSelect = document.getElementById('upscale-algorithm');
        if (algorithmSelect) {
            algorithmSelect.addEventListener('change', (e) => {
                this.updateAlgorithmDescription(e.target.value);
            });
        }

        // 质量滑块
        const qualitySlider = document.getElementById('upscale-quality');
        const qualityValue = document.getElementById('quality-value');
        
        if (qualitySlider && qualityValue) {
            qualitySlider.addEventListener('input', (e) => {
                const value = Math.round(e.target.value * 100);
                qualityValue.textContent = value + '%';
            });
        }

        // 预览按钮
        const previewBtn = document.getElementById('preview-upscale-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                this.updatePreview();
            });
        }

        // 处理按钮
        const upscaleBtn = document.getElementById('upscale-btn');
        if (upscaleBtn) {
            upscaleBtn.addEventListener('click', () => {
                this.handleUpscale();
            });
        }

        // 重新开始按钮
        const upscaleResetBtn = document.getElementById('upscale-reset-btn');
        if (upscaleResetBtn) {
            upscaleResetBtn.addEventListener('click', () => {
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
     * 设置放大倍数
     */
    setScale(scaleValue) {
        // 更新按钮状态
        document.querySelectorAll('.scale-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.scale === scaleValue) {
                btn.classList.add('active');
            }
        });

        // 显示/隐藏自定义输入
        const customScaleGroup = document.getElementById('custom-scale-group');
        if (customScaleGroup) {
            customScaleGroup.style.display = scaleValue === 'custom' ? 'block' : 'none';
        }

        // 更新目标尺寸
        this.updateTargetSize();
    }

    /**
     * 更新目标尺寸显示
     */
    updateTargetSize() {
        if (!this.originalImage) return;

        const scale = this.getCurrentScale();
        const newWidth = Math.floor(this.originalWidth * scale);
        const newHeight = Math.floor(this.originalHeight * scale);

        const targetSizeDisplay = document.getElementById('target-size-display');
        if (targetSizeDisplay) {
            targetSizeDisplay.textContent = `${newWidth} × ${newHeight}`;
        }
    }

    /**
     * 获取当前放大倍数
     */
    getCurrentScale() {
        const activeBtn = document.querySelector('.scale-btn.active');
        if (!activeBtn) return 2;

        const scaleValue = activeBtn.dataset.scale;
        if (scaleValue === 'custom') {
            const customScaleInput = document.getElementById('custom-scale');
            return parseFloat(customScaleInput?.value || 2);
        }

        return parseFloat(scaleValue);
    }

    /**
     * 更新算法描述
     */
    updateAlgorithmDescription(algorithm) {
        const descriptions = {
            'nearest': '最近邻插值：速度最快，但可能产生锯齿效果，适合像素艺术。',
            'bilinear': '双线性插值：平衡速度和质量，适合一般图像处理。',
            'bicubic': '双三次插值：提供良好的图像质量和处理速度平衡，适合大多数场景。',
            'lanczos': 'Lanczos算法：高质量插值，边缘保持较好，处理时间稍长。',
            'super-resolution': '超分辨率算法：使用边缘增强技术，提供最佳质量，处理时间最长。'
        };

        const descriptionElement = document.getElementById('algorithm-description');
        if (descriptionElement) {
            descriptionElement.textContent = descriptions[algorithm] || descriptions['bicubic'];
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
            this.originalImage = img;
            
            this.showImageInfo(file, img.width, img.height);
            this.initializeUpscaleEditor();
            
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
     * 初始化放大编辑器
     */
    initializeUpscaleEditor() {
        const upscaleEditor = document.getElementById('upscale-editor');
        const upscaleBtn = document.getElementById('upscale-btn');

        if (upscaleEditor) upscaleEditor.style.display = 'block';
        if (upscaleBtn) upscaleBtn.disabled = false;

        // 显示原图预览
        this.showOriginalPreview();
        
        // 初始化目标尺寸
        this.updateTargetSize();
        
        // 初始化预览
        this.updatePreview();
    }

    /**
     * 显示原图预览
     */
    showOriginalPreview() {
        const originalPreviewCanvas = document.getElementById('original-preview-canvas');
        const originalInfo = document.getElementById('original-info');
        
        if (!originalPreviewCanvas || !this.originalImage) return;

        const ctx = originalPreviewCanvas.getContext('2d');
        const img = this.originalImage;
        
        // 计算预览尺寸
        const maxSize = 200;
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        
        const displayWidth = img.width * scale;
        const displayHeight = img.height * scale;
        
        originalPreviewCanvas.width = displayWidth;
        originalPreviewCanvas.height = displayHeight;
        
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
        
        if (originalInfo) {
            originalInfo.textContent = `${img.width} × ${img.height}`;
        }
    }

    /**
     * 更新放大预览
     */
    updatePreview() {
        const upscaledPreviewCanvas = document.getElementById('upscaled-preview-canvas');
        const upscaledInfo = document.getElementById('upscaled-info');
        
        if (!upscaledPreviewCanvas || !this.originalImage) return;

        const ctx = upscaledPreviewCanvas.getContext('2d');
        const img = this.originalImage;
        const scale = this.getCurrentScale();
        
        // 计算目标尺寸
        const targetWidth = Math.floor(img.width * scale);
        const targetHeight = Math.floor(img.height * scale);
        
        // 计算预览尺寸
        const maxSize = 200;
        const previewScale = Math.min(maxSize / targetWidth, maxSize / targetHeight, 1);
        
        const displayWidth = targetWidth * previewScale;
        const displayHeight = targetHeight * previewScale;
        
        upscaledPreviewCanvas.width = displayWidth;
        upscaledPreviewCanvas.height = displayHeight;
        
        // 设置渲染质量
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // 绘制放大预览
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
        
        if (upscaledInfo) {
            upscaledInfo.textContent = `${targetWidth} × ${targetHeight} (${scale}x)`;
        }
    }

    /**
     * 获取当前处理选项
     */
    getCurrentUpscaleOptions() {
        const scale = this.getCurrentScale();
        const algorithm = document.getElementById('upscale-algorithm')?.value || 'bicubic';
        const enhanceSharpness = document.getElementById('enhance-sharpness')?.checked || false;
        const enhanceContrast = document.getElementById('enhance-contrast')?.checked || false;
        const enhanceColor = document.getElementById('enhance-color')?.checked || false;
        const quality = parseFloat(document.getElementById('upscale-quality')?.value || 0.95);
        
        return {
            scale,
            algorithm,
            enhanceSharpness,
            enhanceContrast,
            enhanceColor,
            quality
        };
    }

    /**
     * 处理放大操作
     */
    async handleUpscale() {
        if (!this.currentFile) return;

        try {
            const options = this.getCurrentUpscaleOptions();

            // 显示进度条
            const progressContainer = document.getElementById('upscale-progress');
            if (progressContainer) progressContainer.style.display = 'block';

            const upscaledBlob = await this.execute(this.currentFile, options);

            this.currentUpscaledBlob = upscaledBlob;
            this.showResult();

        } catch (error) {
            console.error('Upscale failed:', error);
        } finally {
            // 隐藏进度条
            const progressContainer = document.getElementById('upscale-progress');
            if (progressContainer) progressContainer.style.display = 'none';
        }
    }

    /**
     * 显示处理结果
     */
    showResult() {
        const resultPanel = document.getElementById('upscale-result');
        const resultCanvas = document.getElementById('result-canvas');
        const originalSizeResult = document.getElementById('original-size-result');
        const upscaledSizeResult = document.getElementById('upscaled-size-result');
        const scaleResult = document.getElementById('scale-result');

        if (resultPanel) resultPanel.style.display = 'block';
        if (originalSizeResult) originalSizeResult.textContent = `${this.originalWidth} × ${this.originalHeight}`;
        
        const scale = this.getCurrentScale();
        if (scaleResult) scaleResult.textContent = scale + 'x';

        // 显示结果预览
        if (resultCanvas && this.currentUpscaledBlob) {
            const img = new Image();
            img.onload = () => {
                const maxSize = 400;
                const previewScale = Math.min(maxSize / img.width, maxSize / img.height, 1);
                
                resultCanvas.width = img.width * previewScale;
                resultCanvas.height = img.height * previewScale;
                
                const ctx = resultCanvas.getContext('2d');
                ctx.drawImage(img, 0, 0, resultCanvas.width, resultCanvas.height);
                
                if (upscaledSizeResult) upscaledSizeResult.textContent = `${img.width} × ${img.height}`;
                
                URL.revokeObjectURL(img.src);
            };
            img.src = URL.createObjectURL(this.currentUpscaledBlob);
        }
    }

    /**
     * 处理重置操作
     */
    handleReset() {
        // 重置表单
        const fileInput = document.getElementById('upscale-file-input');
        if (fileInput) fileInput.value = '';

        // 隐藏面板
        const infoPanel = document.getElementById('current-image-info');
        const upscaleEditor = document.getElementById('upscale-editor');
        const resultPanel = document.getElementById('upscale-result');
        const progressContainer = document.getElementById('upscale-progress');

        if (infoPanel) infoPanel.style.display = 'none';
        if (upscaleEditor) upscaleEditor.style.display = 'none';
        if (resultPanel) resultPanel.style.display = 'none';
        if (progressContainer) progressContainer.style.display = 'none';

        // 重置数据
        this.currentFile = null;
        this.currentUpscaledBlob = null;
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.originalImage = null;

        // 重置控件
        this.setScale('2');

        // 禁用处理按钮
        const upscaleBtn = document.getElementById('upscale-btn');
        if (upscaleBtn) upscaleBtn.disabled = true;
    }

    /**
     * 处理下载操作
     */
    handleDownload() {
        if (!this.currentUpscaledBlob || !this.currentFile) return;

        const extension = this.currentFile.name.split('.').pop();
        const nameWithoutExt = this.currentFile.name.replace(/\.[^/.]+$/, '');
        const scale = this.getCurrentScale();
        const filename = `${nameWithoutExt}_upscaled_${scale}x.${extension}`;

        this.downloadFile(this.currentUpscaledBlob, filename);
    }

    /**
     * 自定义进度显示
     */
    showProgress(progress, message = '') {
        super.showProgress(progress, message);

        const progressFill = document.getElementById('upscale-progress-fill');
        const progressText = document.getElementById('upscale-progress-text');

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
                <h5>批量放大设置</h5>
                <div class="batch-scale-options">
                    <label class="radio-label">
                        <input type="radio" name="batch-scale" value="2" checked>
                        <span>2x 放大</span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="batch-scale" value="3">
                        <span>3x 放大</span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="batch-scale" value="4">
                        <span>4x 放大</span>
                    </label>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="batch-upscale-algorithm">放大算法:</label>
                <select id="batch-upscale-algorithm" class="form-input">
                    <option value="bicubic">双三次插值 (推荐)</option>
                    <option value="bilinear">双线性插值</option>
                    <option value="lanczos">Lanczos算法</option>
                    <option value="super-resolution">超分辨率算法</option>
                </select>
            </div>
            
            <div class="form-group">
                <h5>质量增强选项</h5>
                <div class="enhancement-checkboxes">
                    <label class="checkbox-label">
                        <input type="checkbox" id="batch-enhance-sharpness" checked>
                        <span>增强锐度</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" id="batch-enhance-contrast" checked>
                        <span>增强对比度</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" id="batch-enhance-color" checked>
                        <span>增强色彩</span>
                    </label>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="batch-upscale-quality">输出质量: <span id="batch-upscale-quality-value">95%</span></label>
                <input type="range" 
                       id="batch-upscale-quality" 
                       class="form-input"
                       min="0.1" 
                       max="1" 
                       step="0.05" 
                       value="0.95" />
            </div>
        `;
    }
    
    /**
     * 获取批量处理选项
     */
    getBatchProcessingOptions() {
        const maxConcurrency = parseInt(document.getElementById('max-concurrency')?.value || 2); // 降低并发数
        const scale = parseFloat(document.querySelector('input[name="batch-scale"]:checked')?.value || 2);
        const algorithm = document.getElementById('batch-upscale-algorithm')?.value || 'bicubic';
        const enhanceSharpness = document.getElementById('batch-enhance-sharpness')?.checked || false;
        const enhanceContrast = document.getElementById('batch-enhance-contrast')?.checked || false;
        const enhanceColor = document.getElementById('batch-enhance-color')?.checked || false;
        const quality = parseFloat(document.getElementById('batch-upscale-quality')?.value || 0.95);
        
        return {
            maxConcurrency,
            scale,
            algorithm,
            enhanceSharpness,
            enhanceContrast,
            enhanceColor,
            quality,
            suffix: `upscaled_${scale}x`
        };
    }
    
    /**
     * 获取默认文件名后缀
     */
    getDefaultSuffix() {
        return 'upscaled';
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
        // 批量质量滑块
        const qualitySlider = document.getElementById('batch-upscale-quality');
        const qualityValue = document.getElementById('batch-upscale-quality-value');
        
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
        this.currentUpscaledBlob = null;
        this.originalImage = null;
    }
}