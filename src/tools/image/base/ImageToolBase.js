import ToolInterface from '../../base/tool-interface.js';
import BatchUpload from '../../../components/batch-upload/BatchUpload.js';
import BatchProcessor from '../../../core/batch-processor.js';

/**
 * 图像工具基类
 * 为所有图像处理工具提供统一的批量处理接口
 */
export default class ImageToolBase extends ToolInterface {
    constructor(config) {
        super(config);
        
        // 批量处理相关属性
        this.batchUpload = null;
        this.batchProcessor = null;
        this.currentFiles = [];
        this.processedResults = [];
        this.supportsBatch = true;
        this.batchOptions = {
            maxFiles: 50,
            maxFileSize: 10 * 1024 * 1024, // 10MB
            allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml'],
            showPreview: true,
            autoProcess: false
        };
    }

    /**
     * 验证批量文件
     */
    validateBatch(files) {
        const results = [];
        
        for (const file of files) {
            const validation = this.validate(file);
            results.push({
                file: file,
                valid: validation.valid,
                message: validation.message
            });
        }
        
        const validFiles = results.filter(r => r.valid).map(r => r.file);
        const invalidFiles = results.filter(r => !r.valid);
        
        return {
            valid: validFiles.length > 0,
            validFiles: validFiles,
            invalidFiles: invalidFiles,
            message: invalidFiles.length > 0 
                ? `${invalidFiles.length} 个文件验证失败` 
                : '所有文件验证通过'
        };
    }

    /**
     * 批量处理文件
     */
    async processBatch(files, options = {}) {
        if (!this.supportsBatch) {
            throw new Error('此工具不支持批量处理');
        }

        const validation = this.validateBatch(files);
        if (!validation.valid) {
            throw new Error('没有有效的文件可以处理');
        }

        this.setProcessing(true);
        this.currentFiles = validation.validFiles;
        this.processedResults = [];

        try {
            // 创建批量处理器
            this.batchProcessor = new BatchProcessor({
                maxConcurrency: options.maxConcurrency || 3,
                progressCallback: (info) => {
                    this.onBatchProgress(info);
                },
                errorCallback: (error) => {
                    this.onBatchError(error);
                },
                successCallback: (info) => {
                    this.onBatchComplete(info);
                }
            });

            // 添加任务到队列
            for (const file of validation.validFiles) {
                const task = BatchProcessor.createImageTask(this, file, options);
                this.batchProcessor.addTask(task);
            }

            // 开始处理
            await this.batchProcessor.start();

            // 收集结果
            const completedTasks = this.batchProcessor.getCompletedTasks();
            this.processedResults = completedTasks.map(task => ({
                file: task.data,
                result: task.result,
                filename: this.generateFilename(task.data, options)
            }));

            this.updateUsageStats();
            return this.processedResults;

        } catch (error) {
            this.showError('批量处理失败', error);
            throw error;
        } finally {
            this.setProcessing(false);
        }
    }

    /**
     * 获取处理进度信息
     */
    getProgressInfo() {
        if (!this.batchProcessor) {
            return {
                progress: 0,
                message: '未开始处理',
                stats: null
            };
        }

        const stats = this.batchProcessor.getStats();
        return {
            progress: stats.overallProgress,
            message: `已处理 ${stats.processedTasks}/${stats.totalTasks} 个文件`,
            stats: stats
        };
    }

    /**
     * 取消批量处理
     */
    cancelBatch() {
        if (this.batchProcessor) {
            this.batchProcessor.stop();
            this.setProcessing(false);
            this.showSuccess('批量处理已取消');
        }
    }

    /**
     * 批量进度回调
     */
    onBatchProgress(info) {
        const progress = info.overallProgress;
        const message = `处理中... ${info.processedTasks}/${info.totalTasks}`;
        
        this.showProgress(progress, message);
        
        // 更新UI进度
        this.updateBatchUI(info);
    }

    /**
     * 批量错误回调
     */
    onBatchError(errorInfo) {
        const { task, error } = errorInfo;
        console.error(`文件 ${task.data.name} 处理失败:`, error);
        
        // 不中断整个批量处理，只记录错误
        this.showError(`文件 ${task.data.name} 处理失败: ${error.message}`);
    }

    /**
     * 批量完成回调
     */
    onBatchComplete(info) {
        const { completedTasks, failedTasks, duration } = info;
        
        if (failedTasks > 0) {
            this.showError(`批量处理完成，${completedTasks} 个文件成功，${failedTasks} 个文件失败`);
        } else {
            this.showSuccess(`批量处理完成！成功处理 ${completedTasks} 个文件，耗时 ${this.formatDuration(duration)}`);
        }

        // 显示下载选项
        this.showBatchResults();
    }

    /**
     * 生成输出文件名
     */
    generateFilename(file, options = {}) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        const extension = file.name.split('.').pop();
        const suffix = options.suffix || this.getDefaultSuffix();
        
        return `${nameWithoutExt}_${suffix}.${extension}`;
    }

    /**
     * 获取默认文件名后缀
     */
    getDefaultSuffix() {
        return 'processed';
    }

    /**
     * 格式化持续时间
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        
        if (minutes > 0) {
            return `${minutes}分${seconds % 60}秒`;
        }
        return `${seconds}秒`;
    }

    /**
     * 批量下载结果
     */
    async downloadBatchResults() {
        if (this.processedResults.length === 0) {
            this.showError('没有可下载的文件');
            return;
        }

        try {
            if (this.processedResults.length === 1) {
                // 单个文件直接下载
                const result = this.processedResults[0];
                this.downloadFile(result.result, result.filename);
            } else {
                // 多个文件打包下载
                await this.downloadAsZip();
            }
        } catch (error) {
            this.showError('下载失败', error);
        }
    }

    /**
     * 打包下载为ZIP
     */
    async downloadAsZip() {
        // 这里需要引入ZIP库，比如JSZip
        // 由于当前环境可能没有JSZip，我们提供一个简化的实现
        
        this.showError('批量下载功能需要ZIP库支持，请逐个下载文件');
        
        // 为每个结果创建下载链接
        this.createBatchDownloadLinks();
    }

    /**
     * 创建批量下载链接
     */
    createBatchDownloadLinks() {
        const downloadContainer = document.getElementById('batch-download-container');
        if (!downloadContainer) return;

        downloadContainer.innerHTML = '';
        
        this.processedResults.forEach((result, index) => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(result.result);
            link.download = result.filename;
            link.textContent = `下载 ${result.filename}`;
            link.className = 'download-link';
            link.style.display = 'block';
            link.style.margin = '4px 0';
            
            downloadContainer.appendChild(link);
        });
    }

    /**
     * 显示批量结果
     */
    showBatchResults() {
        const resultContainer = document.getElementById('batch-result-container');
        if (!resultContainer) return;

        const stats = this.batchProcessor.getStats();
        
        resultContainer.innerHTML = `
            <div class="batch-result-summary">
                <h4>批量处理结果</h4>
                <div class="result-stats">
                    <div class="stat-item">
                        <span class="stat-label">总计文件:</span>
                        <span class="stat-value">${stats.totalTasks}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">成功处理:</span>
                        <span class="stat-value success">${stats.completedTasks}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">处理失败:</span>
                        <span class="stat-value error">${stats.failedTasks}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">成功率:</span>
                        <span class="stat-value">${Math.round(stats.successRate)}%</span>
                    </div>
                </div>
                
                ${this.processedResults.length > 0 ? `
                    <div class="download-section">
                        <button id="download-all-btn" class="btn btn-primary">
                            下载所有文件 (${this.processedResults.length})
                        </button>
                        <div id="batch-download-container" class="batch-download-links">
                            <!-- 下载链接将在这里生成 -->
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        // 绑定下载事件
        const downloadAllBtn = document.getElementById('download-all-btn');
        if (downloadAllBtn) {
            downloadAllBtn.addEventListener('click', () => {
                this.downloadBatchResults();
            });
        }

        // 创建下载链接
        this.createBatchDownloadLinks();
        
        resultContainer.style.display = 'block';
    }

    /**
     * 更新批量处理UI
     */
    updateBatchUI(info) {
        // 更新进度条
        const batchProgress = document.getElementById('batch-progress-fill');
        const batchProgressText = document.getElementById('batch-progress-text');
        
        if (batchProgress) {
            batchProgress.style.width = `${info.overallProgress}%`;
        }
        
        if (batchProgressText) {
            batchProgressText.textContent = `处理中... ${info.processedTasks}/${info.totalTasks} (${info.overallProgress}%)`;
        }

        // 更新文件列表状态
        this.updateFileItemStatus(info);
    }

    /**
     * 更新文件项状态
     */
    updateFileItemStatus(info) {
        // 根据批量上传组件的实现来更新文件状态
        // 这需要与BatchUpload组件配合
    }

    /**
     * 获取批量处理UI
     */
    getBatchUI() {
        if (!this.supportsBatch) {
            return '';
        }

        return `
            <div class="batch-processing-section">
                <div class="batch-upload-container" id="batch-upload-container">
                    <!-- 批量上传组件将在这里初始化 -->
                </div>
                
                <div class="batch-options" id="batch-options" style="display: none;">
                    <h4>批量处理设置</h4>
                    ${this.getBatchOptionsUI()}
                    
                    <div class="batch-controls">
                        <button id="start-batch-btn" class="btn btn-primary" disabled>
                            开始批量处理
                        </button>
                        <button id="cancel-batch-btn" class="btn btn-secondary" style="display: none;">
                            取消处理
                        </button>
                    </div>
                </div>
                
                <div class="batch-progress-container" id="batch-progress-container" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill" id="batch-progress-fill"></div>
                    </div>
                    <div class="progress-text" id="batch-progress-text">准备中...</div>
                </div>
                
                <div class="batch-result-container" id="batch-result-container" style="display: none;">
                    <!-- 批量处理结果将在这里显示 -->
                </div>
            </div>
            
            <style>
                .batch-processing-section {
                    margin-top: 24px;
                    padding: 24px;
                    background: var(--bg-secondary);
                    border-radius: var(--border-radius);
                }
                
                .batch-options {
                    margin: 16px 0;
                    padding: 16px;
                    background: var(--bg-card);
                    border-radius: var(--border-radius);
                }
                
                .batch-controls {
                    display: flex;
                    gap: 12px;
                    margin-top: 16px;
                }
                
                .batch-progress-container {
                    margin: 16px 0;
                }
                
                .batch-result-summary {
                    padding: 16px;
                    background: var(--bg-card);
                    border-radius: var(--border-radius);
                }
                
                .result-stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 16px;
                    margin: 16px 0;
                }
                
                .stat-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    background: var(--bg-secondary);
                    border-radius: var(--border-radius-sm);
                }
                
                .stat-label {
                    font-size: 14px;
                    color: var(--text-muted);
                }
                
                .stat-value {
                    font-weight: 600;
                    color: var(--text-primary);
                }
                
                .stat-value.success {
                    color: var(--color-success);
                }
                
                .stat-value.error {
                    color: var(--color-danger);
                }
                
                .download-section {
                    margin-top: 24px;
                    padding-top: 16px;
                    border-top: 1px solid var(--border-color);
                }
                
                .batch-download-links {
                    margin-top: 16px;
                    max-height: 200px;
                    overflow-y: auto;
                }
                
                .download-link {
                    display: block;
                    padding: 8px 12px;
                    margin: 4px 0;
                    background: var(--bg-secondary);
                    color: var(--color-primary);
                    text-decoration: none;
                    border-radius: var(--border-radius-sm);
                    transition: background 0.2s ease;
                }
                
                .download-link:hover {
                    background: var(--bg-hover);
                }
            </style>
        `;
    }

    /**
     * 获取批量选项UI（子类可重写）
     */
    getBatchOptionsUI() {
        return `
            <div class="form-group">
                <label class="form-label" for="max-concurrency">并发处理数:</label>
                <select id="max-concurrency" class="form-input">
                    <option value="1">1 (慢速，稳定)</option>
                    <option value="2">2</option>
                    <option value="3" selected>3 (推荐)</option>
                    <option value="4">4</option>
                    <option value="5">5 (快速，可能不稳定)</option>
                </select>
            </div>
        `;
    }

    /**
     * 初始化批量处理功能
     */
    async initBatchProcessing() {
        if (!this.supportsBatch) return;

        // 初始化批量上传组件
        this.batchUpload = new BatchUpload({
            ...this.batchOptions,
            allowedTypes: this.getSupportedTypes()
        });

        // 设置回调
        this.batchUpload.on('fileAdd', (file) => {
            this.onBatchFileAdd(file);
        });

        this.batchUpload.on('fileRemove', (file) => {
            this.onBatchFileRemove(file);
        });

        // 初始化批量上传组件
        setTimeout(() => {
            const container = document.getElementById('batch-upload-container');
            if (container) {
                this.batchUpload.init('batch-upload-container');
                this.bindBatchEvents();
            }
        }, 100);
    }

    /**
     * 绑定批量处理事件
     */
    bindBatchEvents() {
        const startBtn = document.getElementById('start-batch-btn');
        const cancelBtn = document.getElementById('cancel-batch-btn');
        
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.handleStartBatch();
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.cancelBatch();
            });
        }
    }

    /**
     * 处理开始批量操作
     */
    async handleStartBatch() {
        const files = this.batchUpload.getFiles().map(item => item.file);
        if (files.length === 0) {
            this.showError('请先选择要处理的文件');
            return;
        }

        try {
            // 获取批量选项
            const options = this.getBatchProcessingOptions();
            
            // 显示进度容器
            const progressContainer = document.getElementById('batch-progress-container');
            const cancelBtn = document.getElementById('cancel-batch-btn');
            const startBtn = document.getElementById('start-batch-btn');
            
            if (progressContainer) progressContainer.style.display = 'block';
            if (cancelBtn) cancelBtn.style.display = 'inline-block';
            if (startBtn) startBtn.disabled = true;

            // 开始批量处理
            await this.processBatch(files, options);

        } catch (error) {
            console.error('Batch processing failed:', error);
        } finally {
            const cancelBtn = document.getElementById('cancel-batch-btn');
            const startBtn = document.getElementById('start-batch-btn');
            
            if (cancelBtn) cancelBtn.style.display = 'none';
            if (startBtn) startBtn.disabled = false;
        }
    }

    /**
     * 获取批量处理选项
     */
    getBatchProcessingOptions() {
        const maxConcurrency = parseInt(document.getElementById('max-concurrency')?.value || 3);
        
        return {
            maxConcurrency,
            suffix: this.getDefaultSuffix()
        };
    }

    /**
     * 批量文件添加回调
     */
    onBatchFileAdd(file) {
        // 显示批量选项
        const optionsPanel = document.getElementById('batch-options');
        const startBtn = document.getElementById('start-batch-btn');
        
        if (optionsPanel) optionsPanel.style.display = 'block';
        if (startBtn) startBtn.disabled = false;
    }

    /**
     * 批量文件移除回调
     */
    onBatchFileRemove(file) {
        const remainingFiles = this.batchUpload.getFiles();
        
        if (remainingFiles.length === 0) {
            const optionsPanel = document.getElementById('batch-options');
            const startBtn = document.getElementById('start-batch-btn');
            
            if (optionsPanel) optionsPanel.style.display = 'none';
            if (startBtn) startBtn.disabled = true;
        }
    }

    /**
     * 获取支持的文件类型（子类可重写）
     */
    getSupportedTypes() {
        return this.batchOptions.allowedTypes;
    }

    /**
     * 工具加载时初始化批量功能
     */
    async onLoad() {
        await super.onLoad();
        
        // 延迟初始化批量功能，确保DOM准备就绪
        setTimeout(() => {
            this.initBatchProcessing();
        }, 200);
    }

    /**
     * 清理批量处理资源
     */
    cleanup() {
        super.cleanup();
        
        if (this.batchProcessor) {
            this.batchProcessor.stop();
            this.batchProcessor = null;
        }
        
        if (this.batchUpload) {
            this.batchUpload.clearFiles();
            this.batchUpload = null;
        }
        
        this.currentFiles = [];
        this.processedResults = [];
    }
}