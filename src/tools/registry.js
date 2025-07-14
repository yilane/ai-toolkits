/**
 * 工具注册器
 * 管理所有工具的注册、查找、分类等功能
 */
class ToolRegistry {
    constructor() {
        this.tools = new Map();
        this.categories = new Map();
        this.listeners = new Map();
        this.initialized = false;
    }

    /**
     * 初始化注册器
     */
    initialize() {
        if (this.initialized) return;
        
        this.initialized = true;
        console.log('ToolRegistry initialized');
    }

    /**
     * 注册工具
     * @param {ToolInterface} tool - 工具实例
     * @returns {boolean} 注册是否成功
     */
    register(tool) {
        try {
            // 验证工具接口
            if (!this.validateTool(tool)) {
                throw new Error(`Invalid tool interface: ${tool?.id || 'unknown'}`);
            }

            // 检查是否已存在
            if (this.tools.has(tool.id)) {
                console.warn(`Tool already registered: ${tool.id}`);
                return false;
            }

            // 注册工具
            this.tools.set(tool.id, tool);
            this.addToCategory(tool.category, tool);
            
            // 调用工具的加载方法
            tool.onLoad();
            
            // 触发注册事件
            this.emit('tool-registered', { tool });
            
            console.log(`Tool registered: ${tool.name} (${tool.id})`);
            return true;
        } catch (error) {
            console.error('Failed to register tool:', error);
            return false;
        }
    }

    /**
     * 取消注册工具
     * @param {string} toolId - 工具ID
     * @returns {boolean} 取消注册是否成功
     */
    unregister(toolId) {
        const tool = this.tools.get(toolId);
        if (!tool) {
            console.warn(`Tool not found: ${toolId}`);
            return false;
        }

        try {
            // 调用工具的卸载方法
            tool.onUnload();
            
            // 从注册表中移除
            this.tools.delete(toolId);
            this.removeFromCategory(tool.category, toolId);
            
            // 触发取消注册事件
            this.emit('tool-unregistered', { tool });
            
            console.log(`Tool unregistered: ${tool.name} (${toolId})`);
            return true;
        } catch (error) {
            console.error('Failed to unregister tool:', error);
            return false;
        }
    }

    /**
     * 获取指定分类的工具
     * @param {string} category - 分类名称
     * @returns {Array} 工具列表
     */
    getByCategory(category) {
        if (category === 'all') {
            return this.getAllTools();
        }
        return this.categories.get(category) || [];
    }

    /**
     * 获取所有工具
     * @returns {Array} 工具列表
     */
    getAllTools() {
        return Array.from(this.tools.values());
    }

    /**
     * 获取已启用的工具
     * @returns {Array} 已启用的工具列表
     */
    getEnabledTools() {
        return this.getAllTools().filter(tool => tool.enabled !== false);
    }

    /**
     * 根据ID获取工具
     * @param {string} toolId - 工具ID
     * @returns {ToolInterface|null} 工具实例
     */
    getTool(toolId) {
        return this.tools.get(toolId) || null;
    }

    /**
     * 搜索工具
     * @param {string} query - 搜索关键词
     * @param {Object} options - 搜索选项
     * @returns {Array} 匹配的工具列表
     */
    search(query, options = {}) {
        if (!query || query.trim() === '') {
            return options.includeDisabled ? this.getAllTools() : this.getEnabledTools();
        }

        const normalizedQuery = query.toLowerCase().trim();
        const tools = options.includeDisabled ? this.getAllTools() : this.getEnabledTools();
        
        return tools.filter(tool => {
            const nameMatch = tool.name.toLowerCase().includes(normalizedQuery);
            const descMatch = tool.description.toLowerCase().includes(normalizedQuery);
            const categoryMatch = tool.category.toLowerCase().includes(normalizedQuery);
            
            return nameMatch || descMatch || categoryMatch;
        }).sort((a, b) => {
            // 优先显示名称匹配的工具
            const aNameMatch = a.name.toLowerCase().includes(normalizedQuery);
            const bNameMatch = b.name.toLowerCase().includes(normalizedQuery);
            
            if (aNameMatch && !bNameMatch) return -1;
            if (!aNameMatch && bNameMatch) return 1;
            
            // 其次按使用次数排序
            return (b.usageCount || 0) - (a.usageCount || 0);
        });
    }

    /**
     * 按标签搜索工具
     * @param {Array} tags - 标签列表
     * @returns {Array} 匹配的工具列表
     */
    searchByTags(tags) {
        if (!tags || tags.length === 0) return this.getEnabledTools();
        
        return this.getEnabledTools().filter(tool => {
            const toolTags = tool.getConfig('tags', []);
            return tags.some(tag => toolTags.includes(tag));
        });
    }

    /**
     * 获取工具统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        const tools = this.getAllTools();
        const categories = new Map();
        
        tools.forEach(tool => {
            const category = tool.category;
            if (!categories.has(category)) {
                categories.set(category, { total: 0, enabled: 0 });
            }
            
            const stats = categories.get(category);
            stats.total++;
            if (tool.enabled) {
                stats.enabled++;
            }
        });

        return {
            totalTools: tools.length,
            enabledTools: tools.filter(tool => tool.enabled).length,
            categories: Object.fromEntries(categories),
            mostUsed: tools
                .filter(tool => tool.usageCount > 0)
                .sort((a, b) => b.usageCount - a.usageCount)
                .slice(0, 5)
                .map(tool => ({
                    id: tool.id,
                    name: tool.name,
                    usageCount: tool.usageCount
                }))
        };
    }

    /**
     * 获取热门工具
     * @param {number} limit - 限制数量
     * @returns {Array} 热门工具列表
     */
    getPopularTools(limit = 10) {
        return this.getEnabledTools()
            .filter(tool => tool.usageCount > 0)
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, limit);
    }

    /**
     * 获取最近使用的工具
     * @param {number} limit - 限制数量
     * @returns {Array} 最近使用的工具列表
     */
    getRecentTools(limit = 10) {
        return this.getEnabledTools()
            .filter(tool => tool.lastUsed)
            .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
            .slice(0, limit);
    }

    /**
     * 获取新工具
     * @returns {Array} 新工具列表
     */
    getNewTools() {
        return this.getEnabledTools().filter(tool => tool.isNew);
    }

    /**
     * 将工具添加到分类
     * @param {string} category - 分类名称
     * @param {ToolInterface} tool - 工具实例
     */
    addToCategory(category, tool) {
        if (!this.categories.has(category)) {
            this.categories.set(category, []);
        }
        this.categories.get(category).push(tool);
    }

    /**
     * 从分类中移除工具
     * @param {string} category - 分类名称
     * @param {string} toolId - 工具ID
     */
    removeFromCategory(category, toolId) {
        const tools = this.categories.get(category);
        if (tools) {
            const index = tools.findIndex(tool => tool.id === toolId);
            if (index > -1) {
                tools.splice(index, 1);
            }
        }
    }

    /**
     * 验证工具接口
     * @param {*} tool - 工具对象
     * @returns {boolean} 是否有效
     */
    validateTool(tool) {
        if (!tool) return false;
        
        const requiredFields = ['id', 'name', 'description', 'category'];
        const requiredMethods = ['execute'];
        
        // 检查必需字段
        for (const field of requiredFields) {
            if (!tool[field] || typeof tool[field] !== 'string') {
                console.error(`Tool validation failed: missing or invalid field '${field}'`);
                return false;
            }
        }
        
        // 检查必需方法
        for (const method of requiredMethods) {
            if (!tool[method] || typeof tool[method] !== 'function') {
                console.error(`Tool validation failed: missing or invalid method '${method}'`);
                return false;
            }
        }
        
        return true;
    }

    /**
     * 获取所有分类
     * @returns {Array} 分类列表
     */
    getCategories() {
        return Array.from(this.categories.keys());
    }

    /**
     * 获取分类统计
     * @returns {Object} 分类统计
     */
    getCategoryStats() {
        const stats = {};
        
        for (const [category, tools] of this.categories.entries()) {
            stats[category] = {
                total: tools.length,
                enabled: tools.filter(tool => tool.enabled).length
            };
        }
        
        return stats;
    }

    /**
     * 批量注册工具
     * @param {Array} tools - 工具列表
     * @returns {Object} 注册结果统计
     */
    batchRegister(tools) {
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };
        
        tools.forEach(tool => {
            try {
                if (this.register(tool)) {
                    results.success++;
                } else {
                    results.failed++;
                }
            } catch (error) {
                results.failed++;
                results.errors.push({
                    toolId: tool?.id || 'unknown',
                    error: error.message
                });
            }
        });
        
        return results;
    }

    /**
     * 导出工具列表
     * @param {Object} options - 导出选项
     * @returns {Array} 工具数据
     */
    export(options = {}) {
        const tools = options.includeDisabled ? this.getAllTools() : this.getEnabledTools();
        
        return tools.map(tool => ({
            ...tool.getMetadata(),
            status: tool.getStatus()
        }));
    }

    // 事件系统
    /**
     * 注册事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * 移除事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(event, callback) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {*} data - 事件数据
     */
    emit(event, data) {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Event callback error for '${event}':`, error);
            }
        });
    }

    /**
     * 清理所有资源
     */
    destroy() {
        // 卸载所有工具
        for (const tool of this.tools.values()) {
            try {
                tool.onUnload();
            } catch (error) {
                console.error(`Error unloading tool ${tool.id}:`, error);
            }
        }
        
        // 清理数据
        this.tools.clear();
        this.categories.clear();
        this.listeners.clear();
        
        this.initialized = false;
        console.log('ToolRegistry destroyed');
    }
}

export default ToolRegistry;