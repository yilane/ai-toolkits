/**
 * 工具基类接口
 * 所有工具必须继承此类并实现必要的方法
 */
class ToolInterface {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.category = config.category;
        this.icon = config.icon;
        this.iconColor = config.iconColor;
        this.version = config.version;
        this.isNew = config.isNew || false;
        this.config = config.config || {};
        this.enabled = config.enabled !== false;
        
        // 运行时状态
        this.isLoaded = false;
        this.isProcessing = false;
        this.lastUsed = null;
        this.usageCount = 0;
    }

    /**
     * 必须实现的方法 - 执行工具功能
     * @param {*} input - 输入数据
     * @param {Object} options - 选项参数
     * @returns {Promise<*>} 处理结果
     */
    async execute(input, options = {}) {
        throw new Error(`Tool ${this.id}: execute method must be implemented`);
    }

    /**
     * 可选实现的方法 - 验证输入数据
     * @param {*} input - 输入数据
     * @returns {Object} 验证结果 {valid: boolean, message: string}
     */
    validate(input) {
        return { valid: true, message: '' };
    }
    
    /**
     * 可选实现的方法 - 获取工具UI
     * @returns {string|null} HTML字符串或null
     */
    getUI() {
        return null;
    }
    
    /**
     * 可选实现的方法 - 清理资源
     */
    cleanup() {
        // 默认实现：清理DOM事件监听器
        this.removeEventListeners();
    }
    
    /**
     * 可选实现的方法 - 工具加载时调用
     */
    async onLoad() {
        this.isLoaded = true;
        console.log(`Tool loaded: ${this.name}`);
    }
    
    /**
     * 可选实现的方法 - 工具卸载时调用
     */
    async onUnload() {
        this.cleanup();
        this.isLoaded = false;
        console.log(`Tool unloaded: ${this.name}`);
    }

    /**
     * 获取工具状态信息
     * @returns {Object} 状态信息
     */
    getStatus() {
        return {
            id: this.id,
            name: this.name,
            isLoaded: this.isLoaded,
            isProcessing: this.isProcessing,
            enabled: this.enabled,
            lastUsed: this.lastUsed,
            usageCount: this.usageCount
        };
    }

    /**
     * 更新使用统计
     */
    updateUsageStats() {
        this.lastUsed = new Date();
        this.usageCount++;
    }

    /**
     * 设置处理状态
     * @param {boolean} processing - 是否正在处理
     */
    setProcessing(processing) {
        this.isProcessing = processing;
    }

    /**
     * 启用/禁用工具
     * @param {boolean} enabled - 是否启用
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * 获取工具配置
     * @param {string} key - 配置键
     * @param {*} defaultValue - 默认值
     * @returns {*} 配置值
     */
    getConfig(key, defaultValue = null) {
        return this.config[key] !== undefined ? this.config[key] : defaultValue;
    }

    /**
     * 设置工具配置
     * @param {string} key - 配置键
     * @param {*} value - 配置值
     */
    setConfig(key, value) {
        this.config[key] = value;
    }

    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @returns {string} 格式化后的大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 创建下载链接
     * @param {Blob} blob - 文件数据
     * @param {string} filename - 文件名
     */
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * 显示进度
     * @param {number} progress - 进度百分比 (0-100)
     * @param {string} message - 进度消息
     */
    showProgress(progress, message = '') {
        const event = new CustomEvent('tool-progress', {
            detail: {
                toolId: this.id,
                progress,
                message
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * 显示错误消息
     * @param {string} message - 错误消息
     * @param {Error} error - 错误对象
     */
    showError(message, error = null) {
        const event = new CustomEvent('tool-error', {
            detail: {
                toolId: this.id,
                message,
                error
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * 显示成功消息
     * @param {string} message - 成功消息
     * @param {*} data - 附加数据
     */
    showSuccess(message, data = null) {
        const event = new CustomEvent('tool-success', {
            detail: {
                toolId: this.id,
                message,
                data
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * 移除事件监听器（在子类中重写以清理特定的监听器）
     */
    removeEventListeners() {
        // 子类可以重写此方法来清理特定的事件监听器
    }

    /**
     * 验证文件类型
     * @param {File} file - 文件对象
     * @param {Array} allowedTypes - 允许的文件类型
     * @returns {boolean} 是否允许
     */
    validateFileType(file, allowedTypes) {
        if (!file || !allowedTypes) return false;
        return allowedTypes.some(type => 
            file.type === type || 
            file.name.toLowerCase().endsWith(`.${type.replace('image/', '')}`)
        );
    }

    /**
     * 验证文件大小
     * @param {File} file - 文件对象
     * @param {number} maxSize - 最大大小（字节）
     * @returns {boolean} 是否在允许范围内
     */
    validateFileSize(file, maxSize) {
        if (!file) return false;
        return file.size <= maxSize;
    }

    /**
     * 创建预览图
     * @param {File} file - 图片文件
     * @returns {Promise<string>} 预览图URL
     */
    createPreview(file) {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                reject(new Error('Not an image file'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * 工具元数据
     * @returns {Object} 元数据
     */
    getMetadata() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            category: this.category,
            icon: this.icon,
            iconColor: this.iconColor,
            version: this.version,
            isNew: this.isNew,
            enabled: this.enabled,
            config: this.config
        };
    }
}

export default ToolInterface;