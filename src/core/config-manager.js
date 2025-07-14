/**
 * 配置管理器
 * 负责加载、管理和缓存应用配置
 */
class ConfigManager {
    constructor() {
        this.configs = new Map();
        this.cache = new Map();
        this.watchers = new Map();
        this.isLoaded = false;
        this.baseUrl = '';
        
        // 默认配置
        this.defaults = {
            app: {
                name: 'AI工具集',
                version: '1.0.0',
                theme: 'light',
                language: 'zh-CN'
            },
            ui: {
                sidebarWidth: 240,
                headerHeight: 60,
                animationDuration: 300
            },
            performance: {
                lazyLoading: true,
                chunkSize: 50,
                cacheSize: 100
            }
        };
    }

    /**
     * 初始化配置管理器
     * @param {string} baseUrl - 基础URL
     */
    initialize(baseUrl = '') {
        this.baseUrl = baseUrl;
        console.log('ConfigManager initialized');
    }

    /**
     * 加载所有配置文件
     * @returns {Promise<boolean>} 加载是否成功
     */
    async loadConfigs() {
        if (this.isLoaded) {
            console.log('Configs already loaded');
            return true;
        }

        try {
            const configFiles = [
                { key: 'tools', path: './config/tools.json' },
                { key: 'categories', path: './config/categories.json' },
                { key: 'app', path: './config/app.json' }
            ];

            // 并行加载所有配置文件
            const loadPromises = configFiles.map(async ({ key, path }) => {
                try {
                    const config = await this.loadJSON(path);
                    this.configs.set(key, config);
                    return { key, success: true };
                } catch (error) {
                    console.warn(`Failed to load ${key} config:`, error.message);
                    // 使用默认配置
                    if (this.defaults[key]) {
                        this.configs.set(key, this.defaults[key]);
                    }
                    return { key, success: false, error };
                }
            });

            const results = await Promise.all(loadPromises);
            
            // 验证关键配置
            this.validateConfigs();
            
            this.isLoaded = true;
            
            // 触发配置加载完成事件
            this.emit('configs-loaded', { results });
            
            console.log('All configs loaded successfully');
            return true;
        } catch (error) {
            console.error('Failed to load configs:', error);
            this.isLoaded = false;
            return false;
        }
    }

    /**
     * 加载JSON配置文件
     * @param {string} path - 文件路径
     * @returns {Promise<Object>} 配置对象
     */
    async loadJSON(path) {
        const fullPath = this.baseUrl + path;
        
        try {
            const response = await fetch(fullPath);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // 验证JSON格式
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid JSON format');
            }

            return data;
        } catch (error) {
            throw new Error(`Failed to load config from ${path}: ${error.message}`);
        }
    }

    /**
     * 获取配置值
     * @param {string} key - 配置键
     * @param {*} defaultValue - 默认值
     * @returns {*} 配置值
     */
    get(key, defaultValue = null) {
        if (!key) return defaultValue;

        // 支持点号分隔的路径，如 'app.theme'
        const keys = key.split('.');
        let value = this.configs.get(keys[0]);

        if (value === undefined) {
            return defaultValue;
        }

        // 深度访问嵌套配置
        for (let i = 1; i < keys.length; i++) {
            if (value && typeof value === 'object' && keys[i] in value) {
                value = value[keys[i]];
            } else {
                return defaultValue;
            }
        }

        return value !== undefined ? value : defaultValue;
    }

    /**
     * 设置配置值
     * @param {string} key - 配置键
     * @param {*} value - 配置值
     * @param {boolean} notify - 是否通知观察者
     */
    set(key, value, notify = true) {
        if (!key) return;

        const keys = key.split('.');
        
        if (keys.length === 1) {
            // 直接设置顶级配置
            this.configs.set(key, value);
        } else {
            // 深度设置嵌套配置
            let config = this.configs.get(keys[0]);
            if (!config || typeof config !== 'object') {
                config = {};
                this.configs.set(keys[0], config);
            }

            let current = config;
            for (let i = 1; i < keys.length - 1; i++) {
                if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
        }

        // 清除相关缓存
        this.clearCacheByKey(key);

        // 通知观察者
        if (notify) {
            this.notifyWatchers(key, value);
        }
    }

    /**
     * 获取所有配置
     * @returns {Object} 所有配置
     */
    getAll() {
        const result = {};
        for (const [key, value] of this.configs.entries()) {
            result[key] = value;
        }
        return result;
    }

    /**
     * 验证配置完整性
     */
    validateConfigs() {
        const requiredConfigs = ['tools', 'categories'];
        
        for (const config of requiredConfigs) {
            if (!this.configs.has(config)) {
                console.warn(`Missing required config: ${config}`);
            }
        }

        // 验证工具配置
        const toolsConfig = this.get('tools');
        if (toolsConfig && !Array.isArray(toolsConfig.tools)) {
            console.warn('Invalid tools config: tools array is missing');
        }

        // 验证分类配置
        const categoriesConfig = this.get('categories');
        if (categoriesConfig && !Array.isArray(categoriesConfig.categories)) {
            console.warn('Invalid categories config: categories array is missing');
        }
    }

    /**
     * 重新加载配置
     * @param {string} configKey - 特定配置键（可选）
     * @returns {Promise<boolean>} 重新加载是否成功
     */
    async reload(configKey = null) {
        try {
            if (configKey) {
                // 重新加载特定配置
                const pathMap = {
                    'tools': './config/tools.json',
                    'categories': './config/categories.json',
                    'app': './config/app.json'
                };

                if (pathMap[configKey]) {
                    const config = await this.loadJSON(pathMap[configKey]);
                    this.configs.set(configKey, config);
                    this.notifyWatchers(configKey, config);
                    console.log(`Config reloaded: ${configKey}`);
                }
            } else {
                // 重新加载所有配置
                this.isLoaded = false;
                this.configs.clear();
                this.clearCache();
                await this.loadConfigs();
            }
            
            return true;
        } catch (error) {
            console.error('Failed to reload configs:', error);
            return false;
        }
    }

    /**
     * 配置热更新 - 监听配置变化
     * @param {string} key - 配置键
     * @param {Function} callback - 回调函数
     * @returns {Function} 取消监听函数
     */
    watch(key, callback) {
        if (!this.watchers.has(key)) {
            this.watchers.set(key, []);
        }
        
        this.watchers.get(key).push(callback);

        // 返回取消监听函数
        return () => {
            const callbacks = this.watchers.get(key);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }

    /**
     * 通知配置观察者
     * @param {string} key - 配置键
     * @param {*} value - 新值
     */
    notifyWatchers(key, value) {
        // 通知精确匹配的观察者
        const exactCallbacks = this.watchers.get(key) || [];
        exactCallbacks.forEach(callback => {
            try {
                callback(value, key);
            } catch (error) {
                console.error(`Watcher callback error for key '${key}':`, error);
            }
        });

        // 通知父级配置的观察者
        const parts = key.split('.');
        for (let i = parts.length - 1; i > 0; i--) {
            const parentKey = parts.slice(0, i).join('.');
            const parentCallbacks = this.watchers.get(parentKey) || [];
            
            parentCallbacks.forEach(callback => {
                try {
                    callback(this.get(parentKey), parentKey);
                } catch (error) {
                    console.error(`Parent watcher callback error for key '${parentKey}':`, error);
                }
            });
        }
    }

    /**
     * 缓存机制 - 获取缓存值或使用工厂函数创建
     * @param {string} key - 缓存键
     * @param {Function} factory - 工厂函数
     * @param {number} ttl - 生存时间（毫秒）
     * @returns {*} 缓存值
     */
    getCached(key, factory, ttl = 300000) { // 默认5分钟
        const cacheEntry = this.cache.get(key);
        const now = Date.now();

        // 检查缓存是否有效
        if (cacheEntry && (ttl === 0 || now - cacheEntry.timestamp < ttl)) {
            return cacheEntry.value;
        }

        // 使用工厂函数创建新值
        const value = factory();
        this.cache.set(key, {
            value,
            timestamp: now
        });

        // 清理过期缓存
        this.cleanupExpiredCache();

        return value;
    }

    /**
     * 清除缓存
     * @param {string} key - 缓存键（可选）
     */
    clearCache(key = null) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }

    /**
     * 根据键模式清除缓存
     * @param {string} keyPattern - 键模式
     */
    clearCacheByKey(keyPattern) {
        const keysToDelete = [];
        
        for (const [cacheKey] of this.cache) {
            if (cacheKey.startsWith(keyPattern)) {
                keysToDelete.push(cacheKey);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * 清理过期缓存
     */
    cleanupExpiredCache() {
        const now = Date.now();
        const maxCacheSize = this.get('performance.cacheSize', 100);
        
        // 清理过期项目
        for (const [key, entry] of this.cache) {
            if (now - entry.timestamp > 300000) { // 5分钟过期
                this.cache.delete(key);
            }
        }

        // 如果缓存仍然太大，删除最旧的条目
        if (this.cache.size > maxCacheSize) {
            const entries = Array.from(this.cache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            const toDelete = entries.slice(0, this.cache.size - maxCacheSize);
            toDelete.forEach(([key]) => this.cache.delete(key));
        }
    }

    /**
     * 导出配置
     * @param {Array} keys - 要导出的配置键（可选）
     * @returns {Object} 导出的配置
     */
    export(keys = null) {
        if (keys) {
            const result = {};
            keys.forEach(key => {
                const value = this.get(key);
                if (value !== null) {
                    result[key] = value;
                }
            });
            return result;
        }
        
        return this.getAll();
    }

    /**
     * 导入配置
     * @param {Object} configs - 配置对象
     * @param {boolean} merge - 是否合并现有配置
     */
    import(configs, merge = true) {
        if (!configs || typeof configs !== 'object') {
            throw new Error('Invalid configs object');
        }

        for (const [key, value] of Object.entries(configs)) {
            if (merge && this.configs.has(key)) {
                // 合并配置
                const existing = this.configs.get(key);
                if (typeof existing === 'object' && typeof value === 'object') {
                    this.configs.set(key, { ...existing, ...value });
                } else {
                    this.configs.set(key, value);
                }
            } else {
                // 直接替换
                this.configs.set(key, value);
            }
        }

        // 清除缓存
        this.clearCache();
        
        // 通知所有观察者
        for (const key of Object.keys(configs)) {
            this.notifyWatchers(key, this.configs.get(key));
        }
    }

    /**
     * 获取配置元数据
     * @returns {Object} 元数据
     */
    getMetadata() {
        return {
            isLoaded: this.isLoaded,
            configCount: this.configs.size,
            cacheSize: this.cache.size,
            watcherCount: this.watchers.size,
            lastLoaded: this.lastLoaded || null
        };
    }

    /**
     * 事件发射器
     * @param {string} event - 事件名称
     * @param {*} data - 事件数据
     */
    emit(event, data) {
        const customEvent = new CustomEvent(`config-${event}`, {
            detail: data
        });
        document.dispatchEvent(customEvent);
    }

    /**
     * 销毁配置管理器
     */
    destroy() {
        this.configs.clear();
        this.cache.clear();
        this.watchers.clear();
        this.isLoaded = false;
        console.log('ConfigManager destroyed');
    }
}

export default ConfigManager;