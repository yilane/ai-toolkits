/**
 * 批量上传组件
 * 支持多文件选择、拖拽上传、进度显示等功能
 */
export default class BatchUpload {
    constructor(options = {}) {
        this.options = {
            maxFiles: 50,
            maxFileSize: 10 * 1024 * 1024, // 10MB
            allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml'],
            multiple: true,
            showPreview: true,
            dragAndDrop: true,
            autoUpload: false,
            ...options
        };

        this.files = [];
        this.uploadedFiles = [];
        this.callbacks = {
            onFileAdd: null,
            onFileRemove: null,
            onFileError: null,
            onProgress: null,
            onComplete: null
        };

        this.container = null;
        this.dropZone = null;
        this.fileInput = null;
        this.fileList = null;
        this.progressBar = null;
        this.uploadButton = null;
        this.clearButton = null;
    }

    /**
     * 初始化组件
     */
    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container element with id "${containerId}" not found`);
        }

        this.render();
        this.bindEvents();
    }

    /**
     * 渲染组件HTML
     */
    render() {
        this.container.innerHTML = `
            <div class="batch-upload-container">
                <div class="upload-dropzone" id="upload-dropzone">
                    <input type="file" 
                           id="batch-file-input" 
                           class="file-input"
                           ${this.options.multiple ? 'multiple' : ''}
                           accept="${this.options.allowedTypes.join(',')}" />
                    <label for="batch-file-input" class="dropzone-label">
                        <div class="dropzone-icon">📁</div>
                        <div class="dropzone-text">
                            <p>点击选择文件或拖拽文件到此处</p>
                            <small>支持 ${this.getFileTypeHint()}</small>
                        </div>
                    </label>
                </div>

                <div class="upload-controls">
                    <div class="file-stats">
                        <span class="file-count">已选择 <span id="selected-count">0</span> 个文件</span>
                        <span class="file-size">总大小: <span id="total-size">0 B</span></span>
                    </div>
                    <div class="control-buttons">
                        <button id="upload-btn" class="btn btn-primary" disabled>开始上传</button>
                        <button id="clear-btn" class="btn btn-secondary">清空</button>
                    </div>
                </div>

                <div class="upload-progress" id="upload-progress" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                    </div>
                    <div class="progress-text" id="progress-text">准备中...</div>
                </div>

                <div class="file-list" id="file-list">
                    <!-- 文件列表将在这里显示 -->
                </div>
            </div>
        `;

        this.setupElements();
        this.addStyles();
    }

    /**
     * 设置元素引用
     */
    setupElements() {
        this.dropZone = document.getElementById('upload-dropzone');
        this.fileInput = document.getElementById('batch-file-input');
        this.fileList = document.getElementById('file-list');
        this.progressBar = document.getElementById('upload-progress');
        this.uploadButton = document.getElementById('upload-btn');
        this.clearButton = document.getElementById('clear-btn');
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 文件选择事件
        this.fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
        });

        // 拖拽事件
        if (this.options.dragAndDrop) {
            this.dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.dropZone.classList.add('drag-over');
            });

            this.dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                this.dropZone.classList.remove('drag-over');
            });

            this.dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                this.dropZone.classList.remove('drag-over');
                this.handleFileSelect(e.dataTransfer.files);
            });
        }

        // 按钮事件
        this.uploadButton.addEventListener('click', () => {
            this.startUpload();
        });

        this.clearButton.addEventListener('click', () => {
            this.clearFiles();
        });
    }

    /**
     * 处理文件选择
     */
    handleFileSelect(fileList) {
        const files = Array.from(fileList);
        
        for (const file of files) {
            if (this.files.length >= this.options.maxFiles) {
                this.showError(`最多只能选择 ${this.options.maxFiles} 个文件`);
                break;
            }

            const validation = this.validateFile(file);
            if (validation.valid) {
                this.addFile(file);
            } else {
                this.showError(`文件 ${file.name}: ${validation.message}`);
            }
        }

        this.updateStats();
        this.updateUploadButton();
    }

    /**
     * 验证文件
     */
    validateFile(file) {
        // 文件类型验证
        if (!this.options.allowedTypes.includes(file.type)) {
            return {
                valid: false,
                message: `不支持的文件类型，支持的类型：${this.getFileTypeHint()}`
            };
        }

        // 文件大小验证
        if (file.size > this.options.maxFileSize) {
            return {
                valid: false,
                message: `文件大小超过限制 (${this.formatFileSize(this.options.maxFileSize)})`
            };
        }

        // 重复文件验证
        if (this.files.some(f => f.name === file.name && f.size === file.size)) {
            return {
                valid: false,
                message: '文件已存在'
            };
        }

        return { valid: true, message: '' };
    }

    /**
     * 添加文件到列表
     */
    addFile(file) {
        const fileId = Date.now() + Math.random();
        const fileItem = {
            id: fileId,
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            status: 'pending', // pending, uploading, success, error
            progress: 0,
            error: null,
            preview: null
        };

        this.files.push(fileItem);
        this.renderFileItem(fileItem);

        // 生成预览
        if (this.options.showPreview && file.type.startsWith('image/')) {
            this.createPreview(fileItem);
        }

        // 回调
        if (this.callbacks.onFileAdd) {
            this.callbacks.onFileAdd(fileItem);
        }
    }

    /**
     * 移除文件
     */
    removeFile(fileId) {
        const index = this.files.findIndex(f => f.id === fileId);
        if (index !== -1) {
            const fileItem = this.files[index];
            this.files.splice(index, 1);
            
            // 移除DOM元素
            const element = document.getElementById(`file-item-${fileId}`);
            if (element) {
                element.remove();
            }

            // 回调
            if (this.callbacks.onFileRemove) {
                this.callbacks.onFileRemove(fileItem);
            }

            this.updateStats();
            this.updateUploadButton();
        }
    }

    /**
     * 渲染文件项
     */
    renderFileItem(fileItem) {
        const fileItemElement = document.createElement('div');
        fileItemElement.className = 'file-item';
        fileItemElement.id = `file-item-${fileItem.id}`;
        
        fileItemElement.innerHTML = `
            <div class="file-preview">
                <div class="file-icon">${this.getFileIcon(fileItem.type)}</div>
                <img class="file-thumbnail" id="thumbnail-${fileItem.id}" style="display: none;" />
            </div>
            <div class="file-info">
                <div class="file-name">${fileItem.name}</div>
                <div class="file-size">${this.formatFileSize(fileItem.size)}</div>
            </div>
            <div class="file-progress">
                <div class="file-status" id="status-${fileItem.id}">等待上传</div>
                <div class="progress-bar small" id="progress-${fileItem.id}" style="display: none;">
                    <div class="progress-fill" id="progress-fill-${fileItem.id}"></div>
                </div>
            </div>
            <div class="file-actions">
                <button class="btn-icon btn-remove" onclick="batchUpload.removeFile(${fileItem.id})">
                    ❌
                </button>
            </div>
        `;

        this.fileList.appendChild(fileItemElement);
    }

    /**
     * 创建文件预览
     */
    createPreview(fileItem) {
        if (!fileItem.file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            fileItem.preview = e.target.result;
            const thumbnail = document.getElementById(`thumbnail-${fileItem.id}`);
            if (thumbnail) {
                thumbnail.src = e.target.result;
                thumbnail.style.display = 'block';
                thumbnail.parentElement.querySelector('.file-icon').style.display = 'none';
            }
        };
        reader.readAsDataURL(fileItem.file);
    }

    /**
     * 开始上传
     */
    async startUpload() {
        if (this.files.length === 0) return;

        this.uploadButton.disabled = true;
        this.progressBar.style.display = 'block';
        
        const totalFiles = this.files.length;
        let completedFiles = 0;

        try {
            for (const fileItem of this.files) {
                if (fileItem.status === 'pending') {
                    await this.uploadFile(fileItem);
                    completedFiles++;
                    
                    const overallProgress = Math.round((completedFiles / totalFiles) * 100);
                    this.updateProgress(overallProgress, `已完成 ${completedFiles}/${totalFiles} 个文件`);
                }
            }

            this.showSuccess('所有文件上传完成！');
            
            if (this.callbacks.onComplete) {
                this.callbacks.onComplete(this.files);
            }

        } catch (error) {
            this.showError('上传过程中发生错误：' + error.message);
        } finally {
            this.uploadButton.disabled = false;
            setTimeout(() => {
                this.progressBar.style.display = 'none';
            }, 2000);
        }
    }

    /**
     * 上传单个文件
     */
    async uploadFile(fileItem) {
        return new Promise((resolve, reject) => {
            fileItem.status = 'uploading';
            this.updateFileStatus(fileItem.id, '上传中...', true);

            // 模拟上传进度
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += Math.random() * 30;
                if (progress > 90) progress = 90;
                
                this.updateFileProgress(fileItem.id, progress);
                
                if (this.callbacks.onProgress) {
                    this.callbacks.onProgress(fileItem, progress);
                }
            }, 100);

            // 模拟上传完成
            setTimeout(() => {
                clearInterval(progressInterval);
                fileItem.status = 'success';
                fileItem.progress = 100;
                this.updateFileStatus(fileItem.id, '上传完成', false);
                this.updateFileProgress(fileItem.id, 100);
                resolve();
            }, 1000 + Math.random() * 2000);
        });
    }

    /**
     * 更新文件状态
     */
    updateFileStatus(fileId, status, showProgress = false) {
        const statusElement = document.getElementById(`status-${fileId}`);
        const progressElement = document.getElementById(`progress-${fileId}`);
        
        if (statusElement) {
            statusElement.textContent = status;
        }
        
        if (progressElement) {
            progressElement.style.display = showProgress ? 'block' : 'none';
        }
    }

    /**
     * 更新文件进度
     */
    updateFileProgress(fileId, progress) {
        const progressFill = document.getElementById(`progress-fill-${fileId}`);
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
    }

    /**
     * 更新总体进度
     */
    updateProgress(progress, message) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        
        if (progressText) {
            progressText.textContent = message;
        }
    }

    /**
     * 更新统计信息
     */
    updateStats() {
        const countElement = document.getElementById('selected-count');
        const sizeElement = document.getElementById('total-size');
        
        if (countElement) {
            countElement.textContent = this.files.length;
        }
        
        if (sizeElement) {
            const totalSize = this.files.reduce((sum, file) => sum + file.size, 0);
            sizeElement.textContent = this.formatFileSize(totalSize);
        }
    }

    /**
     * 更新上传按钮状态
     */
    updateUploadButton() {
        if (this.uploadButton) {
            this.uploadButton.disabled = this.files.length === 0;
        }
    }

    /**
     * 清空文件列表
     */
    clearFiles() {
        this.files = [];
        this.fileList.innerHTML = '';
        this.fileInput.value = '';
        this.updateStats();
        this.updateUploadButton();
    }

    /**
     * 获取文件类型提示
     */
    getFileTypeHint() {
        return this.options.allowedTypes
            .map(type => type.replace('image/', ''))
            .join(', ');
    }

    /**
     * 获取文件图标
     */
    getFileIcon(type) {
        if (type.startsWith('image/')) {
            return '🖼️';
        }
        return '📄';
    }

    /**
     * 格式化文件大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 显示错误消息
     */
    showError(message) {
        const event = new CustomEvent('batch-upload-error', {
            detail: { message }
        });
        document.dispatchEvent(event);
    }

    /**
     * 显示成功消息
     */
    showSuccess(message) {
        const event = new CustomEvent('batch-upload-success', {
            detail: { message }
        });
        document.dispatchEvent(event);
    }

    /**
     * 设置回调函数
     */
    on(event, callback) {
        if (this.callbacks.hasOwnProperty(`on${event.charAt(0).toUpperCase() + event.slice(1)}`)) {
            this.callbacks[`on${event.charAt(0).toUpperCase() + event.slice(1)}`] = callback;
        }
    }

    /**
     * 获取文件列表
     */
    getFiles() {
        return this.files;
    }

    /**
     * 获取已上传的文件
     */
    getUploadedFiles() {
        return this.files.filter(file => file.status === 'success');
    }

    /**
     * 添加样式
     */
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .batch-upload-container {
                width: 100%;
                max-width: 800px;
                margin: 0 auto;
            }

            .upload-dropzone {
                border: 2px dashed var(--border-color, #ddd);
                border-radius: var(--border-radius, 8px);
                padding: 32px;
                text-align: center;
                background: var(--bg-secondary, #f8f9fa);
                margin-bottom: 16px;
                transition: all 0.3s ease;
            }

            .upload-dropzone.drag-over {
                border-color: var(--color-primary, #007bff);
                background: var(--color-primary-light, #e3f2fd);
            }

            .upload-dropzone .file-input {
                display: none;
            }

            .dropzone-label {
                cursor: pointer;
                display: block;
            }

            .dropzone-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }

            .dropzone-text p {
                margin: 0 0 8px 0;
                font-size: 16px;
                color: var(--text-primary, #333);
            }

            .dropzone-text small {
                color: var(--text-muted, #666);
            }

            .upload-controls {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                padding: 16px;
                background: var(--bg-card, #fff);
                border-radius: var(--border-radius, 8px);
            }

            .file-stats {
                display: flex;
                gap: 24px;
                font-size: 14px;
                color: var(--text-muted, #666);
            }

            .control-buttons {
                display: flex;
                gap: 8px;
            }

            .upload-progress {
                margin-bottom: 16px;
            }

            .progress-bar {
                width: 100%;
                height: 8px;
                background: var(--bg-secondary, #f0f0f0);
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 8px;
            }

            .progress-bar.small {
                height: 4px;
            }

            .progress-fill {
                height: 100%;
                background: var(--color-primary, #007bff);
                transition: width 0.3s ease;
            }

            .progress-text {
                text-align: center;
                font-size: 14px;
                color: var(--text-muted, #666);
            }

            .file-list {
                max-height: 400px;
                overflow-y: auto;
                border: 1px solid var(--border-color, #ddd);
                border-radius: var(--border-radius, 8px);
                background: var(--bg-card, #fff);
            }

            .file-item {
                display: flex;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid var(--border-color, #eee);
            }

            .file-item:last-child {
                border-bottom: none;
            }

            .file-preview {
                width: 48px;
                height: 48px;
                margin-right: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                background: var(--bg-secondary, #f8f9fa);
                overflow: hidden;
            }

            .file-icon {
                font-size: 24px;
            }

            .file-thumbnail {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .file-info {
                flex: 1;
                min-width: 0;
            }

            .file-name {
                font-size: 14px;
                font-weight: 500;
                color: var(--text-primary, #333);
                margin-bottom: 4px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .file-size {
                font-size: 12px;
                color: var(--text-muted, #666);
            }

            .file-progress {
                width: 120px;
                margin-right: 12px;
            }

            .file-status {
                font-size: 12px;
                color: var(--text-muted, #666);
                margin-bottom: 4px;
            }

            .file-actions {
                display: flex;
                gap: 4px;
            }

            .btn-icon {
                width: 32px;
                height: 32px;
                border: none;
                background: none;
                cursor: pointer;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s ease;
            }

            .btn-icon:hover {
                background: var(--bg-secondary, #f0f0f0);
            }

            .btn-remove {
                color: var(--color-danger, #dc3545);
            }

            .btn {
                padding: 8px 16px;
                border: none;
                border-radius: var(--border-radius, 4px);
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s ease;
            }

            .btn-primary {
                background: var(--color-primary, #007bff);
                color: white;
            }

            .btn-primary:hover:not(:disabled) {
                background: var(--color-primary-dark, #0056b3);
            }

            .btn-primary:disabled {
                background: var(--bg-secondary, #f0f0f0);
                color: var(--text-muted, #666);
                cursor: not-allowed;
            }

            .btn-secondary {
                background: var(--bg-secondary, #f8f9fa);
                color: var(--text-primary, #333);
                border: 1px solid var(--border-color, #ddd);
            }

            .btn-secondary:hover {
                background: var(--bg-hover, #e2e6ea);
            }
        `;
        document.head.appendChild(style);
    }
}

// 全局实例，用于在HTML中调用
window.batchUpload = null;