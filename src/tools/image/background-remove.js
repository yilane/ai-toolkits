import ImageToolBase from './base/ImageToolBase.js';

/**
 * 背景去除工具
 * 支持自动背景检测和去除，可调整容差和边缘羽化，并支持批量处理
 */
export default class BackgroundRemoveTool extends ImageToolBase {
    constructor() {
        super({
            id: 'background-remove',
            name: '背景去除',
            description: '自动检测并去除图像背景，支持容差调整、边缘羽化和手动调整，并支持批量处理。',
            category: 'image',
            icon: '🎭',
            iconColor: '#8B5CF6',
            version: '1.0.0'
        });
        
        this.canvas = null;
        this.ctx = null;
        this.currentFile = null;
        this.currentProcessedBlob = null;
        this.previewCanvas = null;
        this.previewCtx = null;
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.originalImage = null;
        this.originalImageData = null;
    }

    /**
     * 验证输入文件
     */
    validate(file) {
        const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        
        if (!file) {
            return { valid: false, message: '请选择要去除背景的图片文件' };
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
     * 执行背景去除
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
                method = 'edge-detection',
                tolerance = 30,
                feathering = 5,
                backgroundColor = 'auto',
                preserveTransparency = true,
                quality = 1.0
            } = options;

            this.showProgress(10, '正在读取图像...');

            const processedBlob = await this.removeBackground(file, {
                method, tolerance, feathering, backgroundColor, preserveTransparency, quality
            });

            this.updateUsageStats();
            
            this.showProgress(100, '背景去除完成！');
            this.showSuccess('背景去除完成');
            
            return processedBlob;
        } catch (error) {
            this.showError('背景去除失败', error);
            throw error;
        } finally {
            this.setProcessing(false);
        }
    }

    /**
     * 背景去除处理
     */
    async removeBackground(file, options) {
        return new Promise((resolve, reject) => {
            const { method, tolerance, feathering, backgroundColor, preserveTransparency, quality } = options;
            
            const img = new Image();
            img.onload = async () => {
                try {
                    this.showProgress(30, '正在分析图像...');
                    
                    // 创建画布
                    this.canvas = document.createElement('canvas');
                    this.ctx = this.canvas.getContext('2d');
                    
                    this.canvas.width = img.width;
                    this.canvas.height = img.height;

                    // 绘制原始图像
                    this.ctx.drawImage(img, 0, 0);

                    this.showProgress(50, '正在检测背景...');

                    // 获取图像数据
                    const imageData = this.ctx.getImageData(0, 0, img.width, img.height);

                    // 根据方法去除背景
                    let processedData;
                    switch (method) {
                        case 'color-similarity':
                            processedData = this.removeBackgroundByColor(imageData, tolerance, backgroundColor);
                            break;
                        case 'edge-detection':
                            processedData = this.removeBackgroundByEdges(imageData, tolerance);
                            break;
                        case 'magic-wand':
                            processedData = this.removeBackgroundByMagicWand(imageData, tolerance);
                            break;
                        default:
                            processedData = this.removeBackgroundByEdges(imageData, tolerance);
                    }

                    this.showProgress(70, '正在优化边缘...');

                    // 应用边缘羽化
                    if (feathering > 0) {
                        processedData = this.applyFeathering(processedData, feathering);
                    }

                    this.showProgress(85, '正在生成结果...');

                    // 绘制处理后的图像
                    this.ctx.putImageData(processedData, 0, 0);

                    this.showProgress(95, '正在生成文件...');

                    // 转换为 Blob，强制使用 PNG 以保持透明度
                    this.canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('背景去除失败'));
                        }
                    }, 'image/png', quality);

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
     * 基于颜色相似度去除背景
     */
    removeBackgroundByColor(imageData, tolerance, backgroundColor) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // 自动检测背景色（使用边角像素）
        let bgColor;
        if (backgroundColor === 'auto') {
            bgColor = this.detectBackgroundColor(imageData);
        } else {
            bgColor = this.hexToRgb(backgroundColor);
        }
        
        // 创建新的图像数据
        const newData = new Uint8ClampedArray(data);
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // 计算与背景色的差异
            const diff = Math.sqrt(
                Math.pow(r - bgColor.r, 2) +
                Math.pow(g - bgColor.g, 2) +
                Math.pow(b - bgColor.b, 2)
            );
            
            // 如果差异小于容差，设为透明
            if (diff <= tolerance) {
                newData[i + 3] = 0; // 设置 alpha 为 0（透明）
            }
        }
        
        return new ImageData(newData, width, height);
    }

    /**
     * 基于边缘检测去除背景
     */
    removeBackgroundByEdges(imageData, tolerance) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // 创建灰度图像
        const grayscale = this.convertToGrayscale(imageData);
        
        // 应用边缘检测（Sobel算子）
        const edges = this.detectEdges(grayscale);
        
        // 基于边缘强度创建蒙版
        const mask = this.createMaskFromEdges(edges, tolerance);
        
        // 应用蒙版
        const newData = new Uint8ClampedArray(data);
        
        for (let i = 0; i < data.length; i += 4) {
            const pixelIndex = i / 4;
            const alpha = mask[pixelIndex];
            newData[i + 3] = alpha;
        }
        
        return new ImageData(newData, width, height);
    }

    /**
     * 基于魔术棒工具去除背景
     */
    removeBackgroundByMagicWand(imageData, tolerance) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // 从边角开始洪水填充算法
        const mask = new Array(width * height).fill(255);
        const corners = [
            0, // 左上角
            width - 1, // 右上角
            (height - 1) * width, // 左下角
            (height - 1) * width + width - 1 // 右下角
        ];
        
        for (const corner of corners) {
            if (mask[corner] === 255) {
                this.floodFill(imageData, mask, corner, tolerance);
            }
        }
        
        // 应用蒙版
        const newData = new Uint8ClampedArray(data);
        
        for (let i = 0; i < data.length; i += 4) {
            const pixelIndex = i / 4;
            newData[i + 3] = mask[pixelIndex];
        }
        
        return new ImageData(newData, width, height);
    }

    /**
     * 洪水填充算法
     */
    floodFill(imageData, mask, startIndex, tolerance) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        const startR = data[startIndex * 4];
        const startG = data[startIndex * 4 + 1];
        const startB = data[startIndex * 4 + 2];
        
        const stack = [startIndex];
        const visited = new Set();
        
        while (stack.length > 0) {
            const currentIndex = stack.pop();
            
            if (visited.has(currentIndex) || mask[currentIndex] === 0) {
                continue;
            }
            
            visited.add(currentIndex);
            
            const x = currentIndex % width;
            const y = Math.floor(currentIndex / width);
            
            if (x < 0 || x >= width || y < 0 || y >= height) {
                continue;
            }
            
            const r = data[currentIndex * 4];
            const g = data[currentIndex * 4 + 1];
            const b = data[currentIndex * 4 + 2];
            
            // 检查颜色相似度
            const diff = Math.sqrt(
                Math.pow(r - startR, 2) +
                Math.pow(g - startG, 2) +
                Math.pow(b - startB, 2)
            );
            
            if (diff <= tolerance) {
                mask[currentIndex] = 0; // 标记为背景
                
                // 添加相邻像素到栈中
                if (x > 0) stack.push(currentIndex - 1);
                if (x < width - 1) stack.push(currentIndex + 1);
                if (y > 0) stack.push(currentIndex - width);
                if (y < height - 1) stack.push(currentIndex + width);
            }
        }
    }

    /**
     * 检测背景色
     */
    detectBackgroundColor(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // 采样边角像素
        const samples = [
            // 左上角
            { r: data[0], g: data[1], b: data[2] },
            // 右上角
            { r: data[(width - 1) * 4], g: data[(width - 1) * 4 + 1], b: data[(width - 1) * 4 + 2] },
            // 左下角
            { r: data[(height - 1) * width * 4], g: data[(height - 1) * width * 4 + 1], b: data[(height - 1) * width * 4 + 2] },
            // 右下角
            { r: data[((height - 1) * width + width - 1) * 4], g: data[((height - 1) * width + width - 1) * 4 + 1], b: data[((height - 1) * width + width - 1) * 4 + 2] }
        ];
        
        // 计算平均颜色
        const avgColor = {
            r: Math.round(samples.reduce((sum, s) => sum + s.r, 0) / samples.length),
            g: Math.round(samples.reduce((sum, s) => sum + s.g, 0) / samples.length),
            b: Math.round(samples.reduce((sum, s) => sum + s.b, 0) / samples.length)
        };
        
        return avgColor;
    }

    /**
     * 转换为灰度图像
     */
    convertToGrayscale(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const grayscale = new Array(width * height);
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // 使用加权平均计算灰度值
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            grayscale[i / 4] = gray;
        }
        
        return grayscale;
    }

    /**
     * 边缘检测（Sobel算子）
     */
    detectEdges(grayscale, width) {
        const height = grayscale.length / width;
        const edges = new Array(grayscale.length);
        
        // Sobel算子
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0, gy = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixel = grayscale[(y + ky) * width + (x + kx)];
                        const kernelIndex = (ky + 1) * 3 + (kx + 1);
                        
                        gx += pixel * sobelX[kernelIndex];
                        gy += pixel * sobelY[kernelIndex];
                    }
                }
                
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                edges[y * width + x] = Math.min(255, magnitude);
            }
        }
        
        // 填充边界
        for (let x = 0; x < width; x++) {
            edges[x] = 0; // 顶部边界
            edges[(height - 1) * width + x] = 0; // 底部边界
        }
        for (let y = 0; y < height; y++) {
            edges[y * width] = 0; // 左侧边界
            edges[y * width + width - 1] = 0; // 右侧边界
        }
        
        return edges;
    }

    /**
     * 从边缘创建蒙版
     */
    createMaskFromEdges(edges, tolerance) {
        const mask = new Array(edges.length);
        
        for (let i = 0; i < edges.length; i++) {
            // 边缘强度越高，越可能是前景
            const edgeStrength = edges[i];
            const alpha = edgeStrength > tolerance ? 255 : Math.max(0, edgeStrength * 2);
            mask[i] = Math.min(255, alpha);
        }
        
        return mask;
    }

    /**
     * 应用边缘羽化
     */
    applyFeathering(imageData, featherRadius) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const newData = new Uint8ClampedArray(data);
        
        // 高斯模糊半径
        const radius = Math.max(1, featherRadius);
        const sigma = radius / 3;
        
        // 生成高斯核
        const kernelSize = radius * 2 + 1;
        const kernel = new Array(kernelSize);
        let kernelSum = 0;
        
        for (let i = 0; i < kernelSize; i++) {
            const x = i - radius;
            kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
            kernelSum += kernel[i];
        }
        
        // 归一化核
        for (let i = 0; i < kernelSize; i++) {
            kernel[i] /= kernelSum;
        }
        
        // 只对 alpha 通道应用模糊
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let alphaSum = 0;
                
                for (let k = 0; k < kernelSize; k++) {
                    const sx = Math.max(0, Math.min(width - 1, x + k - radius));
                    const pixelIndex = (y * width + sx) * 4 + 3;
                    alphaSum += data[pixelIndex] * kernel[k];
                }
                
                const outputIndex = (y * width + x) * 4 + 3;
                newData[outputIndex] = Math.round(alphaSum);
            }
        }
        
        return new ImageData(newData, width, height);
    }

    /**
     * 十六进制颜色转RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }

    /**
     * 获取工具UI
     */
    getUI() {
        return `
            <div class="tool-ui background-remove-ui">
                <div class="processing-mode-tabs">
                    <button class="tab-button active" data-mode="single">单个文件处理</button>
                    <button class="tab-button" data-mode="batch">批量处理</button>
                </div>
                
                <div class="tab-content" id="single-mode">
                    <div class="upload-area" id="background-upload-area">
                        <input type="file" 
                               id="background-file-input" 
                               accept="image/jpeg,image/jpg,image/png,image/gif" 
                               class="file-input" />
                        <label for="background-file-input" class="upload-label">
                            <div class="upload-icon">🎭</div>
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
                    
                    <div class="background-editor" id="background-editor" style="display: none;">
                        <div class="background-preview-container">
                            <div class="preview-comparison">
                                <div class="preview-section">
                                    <h5>原图预览</h5>
                                    <div class="preview-frame">
                                        <canvas id="original-preview-canvas" class="preview-canvas"></canvas>
                                    </div>
                                </div>
                                
                                <div class="preview-section">
                                    <h5>处理预览</h5>
                                    <div class="preview-frame">
                                        <div class="background-selector">
                                            <button class="bg-option active" data-bg="transparent">透明</button>
                                            <button class="bg-option" data-bg="white">白色</button>
                                            <button class="bg-option" data-bg="black">黑色</button>
                                        </div>
                                        <canvas id="processed-preview-canvas" class="preview-canvas"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="background-controls">
                            <div class="method-settings">
                                <h5>检测方法</h5>
                                <div class="method-options">
                                    <div class="form-group">
                                        <label class="form-label" for="remove-method">背景检测方法:</label>
                                        <select id="remove-method" class="form-input">
                                            <option value="edge-detection">边缘检测 (推荐)</option>
                                            <option value="color-similarity">颜色相似度</option>
                                            <option value="magic-wand">魔术棒工具</option>
                                        </select>
                                    </div>
                                    
                                    <div class="method-description" id="method-description">
                                        边缘检测通过分析图像边缘来区分前景和背景，适合大多数场景。
                                    </div>
                                </div>
                            </div>
                            
                            <div class="tolerance-settings">
                                <h5>精度设置</h5>
                                <div class="tolerance-controls">
                                    <div class="form-group">
                                        <label class="form-label" for="tolerance-slider">检测容差: <span id="tolerance-value">30</span></label>
                                        <input type="range" 
                                               id="tolerance-slider" 
                                               class="form-input"
                                               min="1" 
                                               max="100" 
                                               value="30" />
                                        <div class="tolerance-hint">容差越小检测越精确，容差越大检测范围越广</div>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label class="form-label" for="feathering-slider">边缘羽化: <span id="feathering-value">5</span>px</label>
                                        <input type="range" 
                                               id="feathering-slider" 
                                               class="form-input"
                                               min="0" 
                                               max="20" 
                                               value="5" />
                                        <div class="tolerance-hint">羽化可以让边缘更加自然柔和</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="background-color-settings" id="background-color-settings" style="display: none;">
                                <h5>背景色设置</h5>
                                <div class="background-color-options">
                                    <div class="form-group">
                                        <label class="form-label">背景色检测:</label>
                                        <div class="bg-detection-options">
                                            <label class="radio-label">
                                                <input type="radio" name="bg-detection" value="auto" checked>
                                                <span>自动检测</span>
                                            </label>
                                            <label class="radio-label">
                                                <input type="radio" name="bg-detection" value="manual">
                                                <span>手动指定</span>
                                            </label>
                                        </div>
                                    </div>
                                    
                                    <div class="manual-bg-color" id="manual-bg-color" style="display: none;">
                                        <div class="form-group">
                                            <label class="form-label" for="background-color">选择背景色:</label>
                                            <div class="color-input-container">
                                                <input type="color" 
                                                       id="background-color" 
                                                       class="color-input"
                                                       value="#FFFFFF" />
                                                <span class="color-value">#FFFFFF</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="output-settings">
                                <h5>输出设置</h5>
                                <div class="output-options">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="preserve-transparency" checked>
                                        <span>保持透明度 (PNG格式)</span>
                                    </label>
                                    
                                    <div class="form-group">
                                        <label class="form-label" for="output-quality">输出质量: <span id="quality-value">100%</span></label>
                                        <input type="range" 
                                               id="output-quality" 
                                               class="form-input"
                                               min="0.1" 
                                               max="1" 
                                               step="0.1" 
                                               value="1" />
                                    </div>
                                </div>
                            </div>
                            
                            <div class="action-buttons">
                                <button id="preview-remove-btn" class="btn btn-secondary">预览效果</button>
                                <button id="remove-background-btn" class="btn btn-primary" disabled>去除背景</button>
                                <button id="background-reset-btn" class="btn btn-secondary">重新开始</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="progress-container" id="background-progress" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill" id="background-progress-fill"></div>
                        </div>
                        <div class="progress-text" id="background-progress-text">准备中...</div>
                    </div>
                    
                    <div class="result-panel" id="background-result" style="display: none;">
                        <h4>背景去除结果</h4>
                        <div class="result-preview">
                            <canvas id="result-canvas" class="result-canvas"></canvas>
                        </div>
                        <div class="result-info">
                            <div class="info-item">
                                <span>原始尺寸:</span>
                                <span id="original-size-result">-</span>
                            </div>
                            <div class="info-item">
                                <span>处理方法:</span>
                                <span id="method-result">-</span>
                            </div>
                            <div class="info-item">
                                <span>输出格式:</span>
                                <span id="format-result">PNG (透明背景)</span>
                            </div>
                        </div>
                        
                        <div class="download-section">
                            <button id="download-btn" class="btn btn-primary">下载去除背景的图片</button>
                        </div>
                    </div>
                </div>
                
                <div class="tab-content" id="batch-mode" style="display: none;">
                    ${this.getBatchUI()}
                </div>
            </div>
            
            <style>
                .background-remove-ui .current-image-info {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                    margin-top: var(--spacing-md);
                }
                
                .background-remove-ui .image-info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: var(--spacing-sm);
                    margin-top: var(--spacing-sm);
                }
                
                .background-remove-ui .info-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--spacing-xs);
                    background: var(--bg-card);
                    border-radius: var(--border-radius-sm);
                }
                
                .background-remove-ui .info-label {
                    font-size: 12px;
                    color: var(--text-muted);
                }
                
                .background-remove-ui .info-value {
                    font-weight: 500;
                    color: var(--text-primary);
                }
                
                .background-remove-ui .background-editor {
                    margin-top: var(--spacing-md);
                }
                
                .background-remove-ui .background-preview-container {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                    margin-bottom: var(--spacing-md);
                }
                
                .background-remove-ui .preview-comparison {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--spacing-md);
                }
                
                .background-remove-ui .preview-section h5 {
                    margin: 0 0 var(--spacing-sm) 0;
                    font-size: 14px;
                    color: var(--text-primary);
                    text-align: center;
                }
                
                .background-remove-ui .preview-frame {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-sm);
                    padding: var(--spacing-sm);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    min-height: 250px;
                }
                
                .background-remove-ui .background-selector {
                    display: flex;
                    gap: var(--spacing-xs);
                    margin-bottom: var(--spacing-sm);
                }
                
                .background-remove-ui .bg-option {
                    padding: 4px 12px;
                    border: 1px solid var(--border-color);
                    background: var(--bg-secondary);
                    color: var(--text-secondary);
                    border-radius: var(--border-radius-sm);
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s ease;
                }
                
                .background-remove-ui .bg-option.active {
                    background: var(--color-primary);
                    color: white;
                    border-color: var(--color-primary);
                }
                
                .background-remove-ui .bg-option:hover {
                    border-color: var(--color-primary);
                    color: var(--color-primary);
                }
                
                .background-remove-ui .preview-canvas {
                    max-width: 100%;
                    max-height: 200px;
                    border-radius: var(--border-radius-sm);
                }
                
                .background-remove-ui .background-controls {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                }
                
                .background-remove-ui .background-controls h5 {
                    margin: 0 0 var(--spacing-sm) 0;
                    font-size: 14px;
                    color: var(--text-primary);
                }
                
                .background-remove-ui .method-settings {
                    margin-bottom: var(--spacing-md);
                }
                
                .background-remove-ui .method-description {
                    margin-top: var(--spacing-xs);
                    padding: var(--spacing-sm);
                    background: var(--bg-card);
                    border-radius: var(--border-radius-sm);
                    font-size: 12px;
                    color: var(--text-muted);
                    line-height: 1.4;
                }
                
                .background-remove-ui .tolerance-settings {
                    margin-bottom: var(--spacing-md);
                }
                
                .background-remove-ui .tolerance-hint {
                    font-size: 11px;
                    color: var(--text-muted);
                    margin-top: var(--spacing-xs);
                }
                
                .background-remove-ui .background-color-settings {
                    margin-bottom: var(--spacing-md);
                }
                
                .background-remove-ui .bg-detection-options {
                    display: flex;
                    gap: var(--spacing-md);
                    margin-top: var(--spacing-xs);
                }
                
                .background-remove-ui .radio-label {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-xs);
                    cursor: pointer;
                    font-size: 14px;
                    color: var(--text-primary);
                }
                
                .background-remove-ui .color-input-container {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-xs);
                }
                
                .background-remove-ui .color-input {
                    width: 40px;
                    height: 32px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-sm);
                    cursor: pointer;
                }
                
                .background-remove-ui .color-value {
                    font-size: 12px;
                    color: var(--text-muted);
                    font-family: monospace;
                }
                
                .background-remove-ui .output-settings {
                    margin-bottom: var(--spacing-md);
                }
                
                .background-remove-ui .checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-xs);
                    cursor: pointer;
                    font-size: 14px;
                    color: var(--text-primary);
                    margin-bottom: var(--spacing-sm);
                }
                
                .background-remove-ui .action-buttons {
                    display: flex;
                    gap: var(--spacing-sm);
                    flex-wrap: wrap;
                }
                
                .background-remove-ui .result-panel {
                    background: var(--bg-secondary);
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius);
                    margin-top: var(--spacing-md);
                }
                
                .background-remove-ui .result-preview {
                    text-align: center;
                    margin-bottom: var(--spacing-md);
                    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><rect width="10" height="10" fill="%23f0f0f0"/><rect x="10" y="10" width="10" height="10" fill="%23f0f0f0"/></svg>');
                    padding: var(--spacing-md);
                    border-radius: var(--border-radius-sm);
                }
                
                .background-remove-ui .result-canvas {
                    max-width: 400px;
                    max-height: 400px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-sm);
                }
                
                .background-remove-ui .result-info {
                    display: flex;
                    gap: var(--spacing-md);
                    justify-content: center;
                    margin-bottom: var(--spacing-md);
                    flex-wrap: wrap;
                }
                
                .background-remove-ui .download-section {
                    text-align: center;
                }
                
                .background-remove-ui .processing-mode-tabs {
                    display: flex;
                    margin-bottom: var(--spacing-md);
                    border-bottom: 2px solid var(--border-color);
                }
                
                .background-remove-ui .tab-button {
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
                
                .background-remove-ui .tab-button.active {
                    color: var(--color-primary);
                    border-bottom-color: var(--color-primary);
                }
                
                .background-remove-ui .tab-button:hover {
                    color: var(--color-primary);
                    background: var(--bg-hover);
                }
                
                .background-remove-ui .tab-content {
                    min-height: 400px;
                }
                
                @media (max-width: 768px) {
                    .background-remove-ui .preview-comparison {
                        grid-template-columns: 1fr;
                    }
                    
                    .background-remove-ui .bg-detection-options {
                        flex-direction: column;
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
        
        const fileInput = document.getElementById('background-file-input');
        const uploadArea = document.getElementById('background-upload-area');
        
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

        this.bindBackgroundEvents();
    }

    /**
     * 绑定背景去除相关事件
     */
    bindBackgroundEvents() {
        // 背景预览选择器
        document.querySelectorAll('.bg-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.bg-option').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updatePreviewBackground(e.target.dataset.bg);
            });
        });

        // 检测方法选择
        const methodSelect = document.getElementById('remove-method');
        if (methodSelect) {
            methodSelect.addEventListener('change', (e) => {
                this.updateMethodDescription(e.target.value);
                this.toggleBackgroundColorSettings(e.target.value);
            });
        }

        // 背景色检测方式
        document.querySelectorAll('input[name="bg-detection"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const manualBgColor = document.getElementById('manual-bg-color');
                if (manualBgColor) {
                    manualBgColor.style.display = e.target.value === 'manual' ? 'block' : 'none';
                }
            });
        });

        // 背景色选择
        const backgroundColorInput = document.getElementById('background-color');
        const colorValue = document.querySelector('.color-value');
        if (backgroundColorInput && colorValue) {
            backgroundColorInput.addEventListener('input', (e) => {
                colorValue.textContent = e.target.value;
            });
        }

        // 滑块控件
        const toleranceSlider = document.getElementById('tolerance-slider');
        const toleranceValue = document.getElementById('tolerance-value');
        if (toleranceSlider && toleranceValue) {
            toleranceSlider.addEventListener('input', (e) => {
                toleranceValue.textContent = e.target.value;
            });
        }

        const featheringSlider = document.getElementById('feathering-slider');
        const featheringValue = document.getElementById('feathering-value');
        if (featheringSlider && featheringValue) {
            featheringSlider.addEventListener('input', (e) => {
                featheringValue.textContent = e.target.value;
            });
        }

        const qualitySlider = document.getElementById('output-quality');
        const qualityValue = document.getElementById('quality-value');
        if (qualitySlider && qualityValue) {
            qualitySlider.addEventListener('input', (e) => {
                const value = Math.round(e.target.value * 100);
                qualityValue.textContent = value + '%';
            });
        }

        // 预览按钮
        const previewBtn = document.getElementById('preview-remove-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                this.updateProcessedPreview();
            });
        }

        // 处理按钮
        const removeBtn = document.getElementById('remove-background-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                this.handleRemoveBackground();
            });
        }

        // 重新开始按钮
        const backgroundResetBtn = document.getElementById('background-reset-btn');
        if (backgroundResetBtn) {
            backgroundResetBtn.addEventListener('click', () => {
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
     * 更新方法描述
     */
    updateMethodDescription(method) {
        const descriptions = {
            'edge-detection': '边缘检测通过分析图像边缘来区分前景和背景，适合大多数场景。',
            'color-similarity': '颜色相似度通过分析背景色与像素颜色的相似度来去除背景，适合背景色单一的图片。',
            'magic-wand': '魔术棒工具从图像边角开始检测相似颜色区域，适合背景色相对统一的图片。'
        };

        const descriptionElement = document.getElementById('method-description');
        if (descriptionElement) {
            descriptionElement.textContent = descriptions[method] || descriptions['edge-detection'];
        }
    }

    /**
     * 切换背景色设置面板显示
     */
    toggleBackgroundColorSettings(method) {
        const backgroundColorSettings = document.getElementById('background-color-settings');
        if (backgroundColorSettings) {
            backgroundColorSettings.style.display = method === 'color-similarity' ? 'block' : 'none';
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
            this.initializeBackgroundEditor();
            
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
     * 初始化背景去除编辑器
     */
    initializeBackgroundEditor() {
        const backgroundEditor = document.getElementById('background-editor');
        const removeBtn = document.getElementById('remove-background-btn');

        if (backgroundEditor) backgroundEditor.style.display = 'block';
        if (removeBtn) removeBtn.disabled = false;

        // 显示原图预览
        this.showOriginalPreview();
        
        // 初始化处理预览
        this.updateProcessedPreview();
    }

    /**
     * 显示原图预览
     */
    showOriginalPreview() {
        const originalPreviewCanvas = document.getElementById('original-preview-canvas');
        
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
    }

    /**
     * 更新处理预览
     */
    async updateProcessedPreview() {
        if (!this.originalImage) return;

        try {
            const options = this.getCurrentRemoveOptions();
            
            // 创建临时画布进行处理
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            
            tempCanvas.width = this.originalImage.width;
            tempCanvas.height = this.originalImage.height;
            tempCtx.drawImage(this.originalImage, 0, 0);
            
            // 获取图像数据
            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            
            // 应用背景去除（简化版本用于预览）
            let processedData;
            switch (options.method) {
                case 'color-similarity':
                    processedData = this.removeBackgroundByColor(imageData, options.tolerance, options.backgroundColor);
                    break;
                case 'magic-wand':
                    processedData = this.removeBackgroundByMagicWand(imageData, options.tolerance);
                    break;
                default:
                    processedData = this.removeBackgroundByEdges(imageData, options.tolerance);
            }
            
            // 显示预览
            this.showProcessedPreview(processedData);
            
        } catch (error) {
            console.error('Preview update failed:', error);
        }
    }

    /**
     * 显示处理后的预览
     */
    showProcessedPreview(processedData) {
        const processedPreviewCanvas = document.getElementById('processed-preview-canvas');
        
        if (!processedPreviewCanvas) return;

        const ctx = processedPreviewCanvas.getContext('2d');
        
        // 计算预览尺寸
        const maxSize = 200;
        const scale = Math.min(maxSize / processedData.width, maxSize / processedData.height, 1);
        
        const displayWidth = processedData.width * scale;
        const displayHeight = processedData.height * scale;
        
        processedPreviewCanvas.width = displayWidth;
        processedPreviewCanvas.height = displayHeight;
        
        // 创建临时画布来缩放处理后的数据
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCanvas.width = processedData.width;
        tempCanvas.height = processedData.height;
        tempCtx.putImageData(processedData, 0, 0);
        
        // 绘制缩放后的预览
        ctx.drawImage(tempCanvas, 0, 0, displayWidth, displayHeight);
        
        // 应用背景颜色
        this.updatePreviewBackground();
    }

    /**
     * 更新预览背景
     */
    updatePreviewBackground(bgType) {
        const canvas = document.getElementById('processed-preview-canvas');
        if (!canvas) return;

        const activeBg = bgType || document.querySelector('.bg-option.active')?.dataset.bg || 'transparent';
        
        switch (activeBg) {
            case 'white':
                canvas.style.background = '#FFFFFF';
                break;
            case 'black':
                canvas.style.background = '#000000';
                break;
            case 'transparent':
            default:
                canvas.style.background = 'url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><rect width="10" height="10" fill="%23f0f0f0"/><rect x="10" y="10" width="10" height="10" fill="%23f0f0f0"/></svg>\')';
                break;
        }
    }

    /**
     * 获取当前去除选项
     */
    getCurrentRemoveOptions() {
        const method = document.getElementById('remove-method')?.value || 'edge-detection';
        const tolerance = parseInt(document.getElementById('tolerance-slider')?.value || 30);
        const feathering = parseInt(document.getElementById('feathering-slider')?.value || 5);
        const bgDetection = document.querySelector('input[name="bg-detection"]:checked')?.value || 'auto';
        const backgroundColor = bgDetection === 'manual' ? 
            document.getElementById('background-color')?.value : 'auto';
        const preserveTransparency = document.getElementById('preserve-transparency')?.checked || true;
        const quality = parseFloat(document.getElementById('output-quality')?.value || 1.0);
        
        return {
            method,
            tolerance,
            feathering,
            backgroundColor,
            preserveTransparency,
            quality
        };
    }

    /**
     * 处理背景去除操作
     */
    async handleRemoveBackground() {
        if (!this.currentFile) return;

        try {
            const options = this.getCurrentRemoveOptions();

            // 显示进度条
            const progressContainer = document.getElementById('background-progress');
            if (progressContainer) progressContainer.style.display = 'block';

            const processedBlob = await this.execute(this.currentFile, options);

            this.currentProcessedBlob = processedBlob;
            this.showResult();

        } catch (error) {
            console.error('Background removal failed:', error);
        } finally {
            // 隐藏进度条
            const progressContainer = document.getElementById('background-progress');
            if (progressContainer) progressContainer.style.display = 'none';
        }
    }

    /**
     * 显示处理结果
     */
    showResult() {
        const resultPanel = document.getElementById('background-result');
        const resultCanvas = document.getElementById('result-canvas');
        const originalSizeResult = document.getElementById('original-size-result');
        const methodResult = document.getElementById('method-result');

        if (resultPanel) resultPanel.style.display = 'block';
        if (originalSizeResult) originalSizeResult.textContent = `${this.originalWidth} × ${this.originalHeight}`;
        
        const method = document.getElementById('remove-method')?.value || 'edge-detection';
        const methodNames = {
            'edge-detection': '边缘检测',
            'color-similarity': '颜色相似度',
            'magic-wand': '魔术棒工具'
        };
        if (methodResult) methodResult.textContent = methodNames[method] || '边缘检测';

        // 显示结果预览
        if (resultCanvas && this.currentProcessedBlob) {
            const img = new Image();
            img.onload = () => {
                const maxSize = 400;
                const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
                
                resultCanvas.width = img.width * scale;
                resultCanvas.height = img.height * scale;
                
                const ctx = resultCanvas.getContext('2d');
                ctx.drawImage(img, 0, 0, resultCanvas.width, resultCanvas.height);
                
                URL.revokeObjectURL(img.src);
            };
            img.src = URL.createObjectURL(this.currentProcessedBlob);
        }
    }

    /**
     * 处理重置操作
     */
    handleReset() {
        // 重置表单
        const fileInput = document.getElementById('background-file-input');
        if (fileInput) fileInput.value = '';

        // 隐藏面板
        const infoPanel = document.getElementById('current-image-info');
        const backgroundEditor = document.getElementById('background-editor');
        const resultPanel = document.getElementById('background-result');
        const progressContainer = document.getElementById('background-progress');

        if (infoPanel) infoPanel.style.display = 'none';
        if (backgroundEditor) backgroundEditor.style.display = 'none';
        if (resultPanel) resultPanel.style.display = 'none';
        if (progressContainer) progressContainer.style.display = 'none';

        // 重置数据
        this.currentFile = null;
        this.currentProcessedBlob = null;
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.originalImage = null;
        this.originalImageData = null;

        // 禁用处理按钮
        const removeBtn = document.getElementById('remove-background-btn');
        if (removeBtn) removeBtn.disabled = true;
    }

    /**
     * 处理下载操作
     */
    handleDownload() {
        if (!this.currentProcessedBlob || !this.currentFile) return;

        const nameWithoutExt = this.currentFile.name.replace(/\.[^/.]+$/, '');
        const filename = `${nameWithoutExt}_no_background.png`;

        this.downloadFile(this.currentProcessedBlob, filename);
    }

    /**
     * 自定义进度显示
     */
    showProgress(progress, message = '') {
        super.showProgress(progress, message);

        const progressFill = document.getElementById('background-progress-fill');
        const progressText = document.getElementById('background-progress-text');

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
                <h5>批量背景去除设置</h5>
                <div class="batch-method-options">
                    <label class="radio-label">
                        <input type="radio" name="batch-remove-method" value="edge-detection" checked>
                        <span>边缘检测 (推荐)</span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="batch-remove-method" value="color-similarity">
                        <span>颜色相似度</span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="batch-remove-method" value="magic-wand">
                        <span>魔术棒工具</span>
                    </label>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="batch-tolerance">检测容差: <span id="batch-tolerance-value">30</span></label>
                <input type="range" 
                       id="batch-tolerance" 
                       class="form-input"
                       min="1" 
                       max="100" 
                       value="30" />
            </div>
            
            <div class="form-group">
                <label class="form-label" for="batch-feathering">边缘羽化: <span id="batch-feathering-value">5</span>px</label>
                <input type="range" 
                       id="batch-feathering" 
                       class="form-input"
                       min="0" 
                       max="20" 
                       value="5" />
            </div>
            
            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="batch-preserve-transparency" checked>
                    <span>保持透明度 (PNG格式)</span>
                </label>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="batch-bg-quality">输出质量: <span id="batch-bg-quality-value">100%</span></label>
                <input type="range" 
                       id="batch-bg-quality" 
                       class="form-input"
                       min="0.1" 
                       max="1" 
                       step="0.1" 
                       value="1" />
            </div>
        `;
    }
    
    /**
     * 获取批量处理选项
     */
    getBatchProcessingOptions() {
        const maxConcurrency = parseInt(document.getElementById('max-concurrency')?.value || 2); // 降低并发数
        const method = document.querySelector('input[name="batch-remove-method"]:checked')?.value || 'edge-detection';
        const tolerance = parseInt(document.getElementById('batch-tolerance')?.value || 30);
        const feathering = parseInt(document.getElementById('batch-feathering')?.value || 5);
        const preserveTransparency = document.getElementById('batch-preserve-transparency')?.checked || true;
        const quality = parseFloat(document.getElementById('batch-bg-quality')?.value || 1.0);
        
        return {
            maxConcurrency,
            method,
            tolerance,
            feathering,
            backgroundColor: 'auto',
            preserveTransparency,
            quality,
            suffix: 'no_background'
        };
    }
    
    /**
     * 获取默认文件名后缀
     */
    getDefaultSuffix() {
        return 'no_background';
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
        // 批量容差滑块
        const toleranceSlider = document.getElementById('batch-tolerance');
        const toleranceValue = document.getElementById('batch-tolerance-value');
        
        if (toleranceSlider && toleranceValue) {
            toleranceSlider.addEventListener('input', (e) => {
                toleranceValue.textContent = e.target.value;
            });
        }
        
        // 批量羽化滑块
        const featheringSlider = document.getElementById('batch-feathering');
        const featheringValue = document.getElementById('batch-feathering-value');
        
        if (featheringSlider && featheringValue) {
            featheringSlider.addEventListener('input', (e) => {
                featheringValue.textContent = e.target.value;
            });
        }
        
        // 批量质量滑块
        const qualitySlider = document.getElementById('batch-bg-quality');
        const qualityValue = document.getElementById('batch-bg-quality-value');
        
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
        this.currentProcessedBlob = null;
        this.originalImage = null;
        this.originalImageData = null;
    }
}