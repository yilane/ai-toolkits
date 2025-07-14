/**
 * 搜索管理器
 * 负责工具搜索、过滤、排序和搜索历史管理
 */
class SearchManager {
    constructor(toolRegistry) {
        this.toolRegistry = toolRegistry;
        this.searchHistory = [];
        this.maxHistorySize = 20;
        this.debounceTimeout = null;
        this.debounceDelay = 300;
        this.currentQuery = '';
        this.currentFilters = {};
        this.searchStats = {
            totalSearches: 0,
            popularQueries: new Map(),
            averageResultCount: 0
        };
        
        this.init();
    }

    /**
     * 初始化搜索管理器
     */
    init() {
        this.loadSearchHistory();
        this.loadSearchStats();
        console.log('SearchManager initialized');
    }

    /**
     * 执行搜索
     * @param {string} query - 搜索查询
     * @param {Object} options - 搜索选项
     * @returns {Promise<Array>} 搜索结果
     */
    async search(query, options = {}) {
        const {
            category = null,
            includeDisabled = false,
            sortBy = 'relevance',
            limit = null,
            fuzzy = true
        } = options;

        this.currentQuery = query;
        this.updateSearchStats(query);

        try {
            let results = [];

            if (!query || query.trim() === '') {
                // 空查询返回所有工具或分类工具
                results = category && category !== 'all' 
                    ? this.toolRegistry.getByCategory(category)
                    : this.toolRegistry.getEnabledTools();
            } else {
                // 执行搜索
                results = this.performSearch(query, {
                    category,
                    includeDisabled,
                    fuzzy
                });
            }

            // 应用排序
            results = this.sortResults(results, sortBy, query);

            // 应用限制
            if (limit && limit > 0) {
                results = results.slice(0, limit);
            }

            // 记录搜索历史
            if (query && query.trim() !== '') {
                this.addToHistory(query, results.length);
            }

            // 触发搜索事件
            this.emit('search-completed', {
                query,
                resultCount: results.length,
                options
            });

            return results;
        } catch (error) {
            console.error('Search error:', error);
            this.emit('search-error', { query, error });
            return [];
        }
    }

    /**
     * 防抖搜索
     * @param {string} query - 搜索查询
     * @param {Object} options - 搜索选项
     * @param {Function} callback - 回调函数
     */
    searchDebounced(query, options = {}, callback = null) {
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }

        this.debounceTimeout = setTimeout(async () => {
            try {
                const results = await this.search(query, options);
                if (callback) {
                    callback(results);
                }
                this.emit('search-debounced', { query, results });
            } catch (error) {
                console.error('Debounced search error:', error);
                if (callback) {
                    callback([]);
                }
            }
        }, this.debounceDelay);
    }

    /**
     * 执行实际搜索逻辑
     * @param {string} query - 搜索查询
     * @param {Object} options - 选项
     * @returns {Array} 搜索结果
     */
    performSearch(query, options) {
        const normalizedQuery = query.toLowerCase().trim();
        const { category, includeDisabled, fuzzy } = options;
        
        // 获取基础工具列表
        let tools = includeDisabled 
            ? this.toolRegistry.getAllTools()
            : this.toolRegistry.getEnabledTools();

        // 按分类过滤
        if (category && category !== 'all') {
            tools = tools.filter(tool => tool.category === category);
        }

        // 执行搜索匹配
        const results = tools.filter(tool => {
            return this.matchesTool(tool, normalizedQuery, { fuzzy });
        }).map(tool => {
            // 计算相关性得分
            const relevanceScore = this.calculateRelevance(tool, normalizedQuery);
            return {
                tool,
                relevanceScore,
                matchType: this.getMatchType(tool, normalizedQuery)
            };
        });

        return results;
    }

    /**
     * 检查工具是否匹配搜索条件
     * @param {Object} tool - 工具对象
     * @param {string} query - 搜索查询
     * @param {Object} options - 选项
     * @returns {boolean} 是否匹配
     */
    matchesTool(tool, query, options = {}) {
        const { fuzzy = true } = options;

        // 精确匹配
        const nameMatch = tool.name.toLowerCase().includes(query);
        const descMatch = tool.description.toLowerCase().includes(query);
        const categoryMatch = tool.category.toLowerCase().includes(query);

        if (nameMatch || descMatch || categoryMatch) {
            return true;
        }

        // 模糊匹配
        if (fuzzy) {
            return this.fuzzyMatch(tool.name, query) ||
                   this.fuzzyMatch(tool.description, query);
        }

        return false;
    }

    /**
     * 模糊匹配
     * @param {string} text - 文本
     * @param {string} query - 查询
     * @returns {boolean} 是否匹配
     */
    fuzzyMatch(text, query) {
        const normalizedText = text.toLowerCase().replace(/\s+/g, '');
        const normalizedQuery = query.toLowerCase().replace(/\s+/g, '');
        
        // 检查是否包含查询的所有字符（按顺序）
        let queryIndex = 0;
        for (let i = 0; i < normalizedText.length && queryIndex < normalizedQuery.length; i++) {
            if (normalizedText[i] === normalizedQuery[queryIndex]) {
                queryIndex++;
            }
        }
        
        return queryIndex === normalizedQuery.length;
    }

    /**
     * 计算相关性得分
     * @param {Object} tool - 工具对象
     * @param {string} query - 搜索查询
     * @returns {number} 相关性得分
     */
    calculateRelevance(tool, query) {
        let score = 0;
        
        const name = tool.name.toLowerCase();
        const description = tool.description.toLowerCase();
        
        // 名称匹配权重最高
        if (name.includes(query)) {
            score += 100;
            if (name.startsWith(query)) {
                score += 50; // 前缀匹配额外加分
            }
            if (name === query) {
                score += 100; // 完全匹配额外加分
            }
        }
        
        // 描述匹配
        if (description.includes(query)) {
            score += 50;
        }
        
        // 分类匹配
        if (tool.category.toLowerCase().includes(query)) {
            score += 30;
        }
        
        // 使用频率权重
        score += (tool.usageCount || 0) * 0.1;
        
        // 新工具轻微加分
        if (tool.isNew) {
            score += 5;
        }
        
        return score;
    }

    /**
     * 获取匹配类型
     * @param {Object} tool - 工具对象
     * @param {string} query - 搜索查询
     * @returns {string} 匹配类型
     */
    getMatchType(tool, query) {
        const name = tool.name.toLowerCase();
        const description = tool.description.toLowerCase();
        
        if (name === query) return 'exact-name';
        if (name.includes(query)) return 'name';
        if (description.includes(query)) return 'description';
        if (tool.category.toLowerCase().includes(query)) return 'category';
        return 'fuzzy';
    }

    /**
     * 排序搜索结果
     * @param {Array} results - 搜索结果
     * @param {string} sortBy - 排序方式
     * @param {string} query - 搜索查询
     * @returns {Array} 排序后的结果
     */
    sortResults(results, sortBy, query = '') {
        const sortedResults = [...results];
        
        switch (sortBy) {
            case 'relevance':
                sortedResults.sort((a, b) => {
                    // 优先按相关性得分排序
                    if (a.relevanceScore !== b.relevanceScore) {
                        return b.relevanceScore - a.relevanceScore;
                    }
                    // 相关性相同时按使用次数排序
                    return (b.tool.usageCount || 0) - (a.tool.usageCount || 0);
                });
                break;
                
            case 'name':
                sortedResults.sort((a, b) => 
                    a.tool.name.localeCompare(b.tool.name, 'zh-CN')
                );
                break;
                
            case 'category':
                sortedResults.sort((a, b) => {
                    if (a.tool.category !== b.tool.category) {
                        return a.tool.category.localeCompare(b.tool.category);
                    }
                    return a.tool.name.localeCompare(b.tool.name, 'zh-CN');
                });
                break;
                
            case 'usage':
                sortedResults.sort((a, b) => 
                    (b.tool.usageCount || 0) - (a.tool.usageCount || 0)
                );
                break;
                
            case 'newest':
                sortedResults.sort((a, b) => {
                    // 新工具优先
                    if (a.tool.isNew !== b.tool.isNew) {
                        return b.tool.isNew ? 1 : -1;
                    }
                    return 0;
                });
                break;
                
            default:
                // 默认相关性排序
                sortedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
        }
        
        // 返回工具对象数组
        return sortedResults.map(result => result.tool || result);
    }

    /**
     * 获取搜索建议
     * @param {string} query - 部分查询
     * @param {number} limit - 建议数量限制
     * @returns {Array} 搜索建议
     */
    getSuggestions(query, limit = 5) {
        if (!query || query.length < 2) return [];
        
        const normalizedQuery = query.toLowerCase();
        const suggestions = new Set();
        
        // 从工具名称获取建议
        this.toolRegistry.getEnabledTools().forEach(tool => {
            const name = tool.name.toLowerCase();
            if (name.includes(normalizedQuery)) {
                suggestions.add(tool.name);
            }
        });
        
        // 从搜索历史获取建议
        this.searchHistory.forEach(item => {
            if (item.query.toLowerCase().includes(normalizedQuery)) {
                suggestions.add(item.query);
            }
        });
        
        return Array.from(suggestions).slice(0, limit);
    }

    /**
     * 添加到搜索历史
     * @param {string} query - 搜索查询
     * @param {number} resultCount - 结果数量
     */
    addToHistory(query, resultCount) {
        const trimmedQuery = query.trim();
        if (!trimmedQuery) return;
        
        // 移除重复项
        this.searchHistory = this.searchHistory.filter(item => 
            item.query !== trimmedQuery
        );
        
        // 添加到历史开头
        this.searchHistory.unshift({
            query: trimmedQuery,
            resultCount,
            timestamp: new Date().toISOString()
        });
        
        // 限制历史大小
        if (this.searchHistory.length > this.maxHistorySize) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
        }
        
        this.saveSearchHistory();
    }

    /**
     * 获取搜索历史
     * @param {number} limit - 限制数量
     * @returns {Array} 搜索历史
     */
    getSearchHistory(limit = 10) {
        return this.searchHistory.slice(0, limit);
    }

    /**
     * 清除搜索历史
     */
    clearSearchHistory() {
        this.searchHistory = [];
        this.saveSearchHistory();
        this.emit('search-history-cleared');
    }

    /**
     * 更新搜索统计
     * @param {string} query - 搜索查询
     */
    updateSearchStats(query) {
        this.searchStats.totalSearches++;
        
        if (query && query.trim()) {
            const normalizedQuery = query.toLowerCase().trim();
            const count = this.searchStats.popularQueries.get(normalizedQuery) || 0;
            this.searchStats.popularQueries.set(normalizedQuery, count + 1);
        }
        
        this.saveSearchStats();
    }

    /**
     * 获取热门搜索
     * @param {number} limit - 限制数量
     * @returns {Array} 热门搜索列表
     */
    getPopularSearches(limit = 10) {
        return Array.from(this.searchStats.popularQueries.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([query, count]) => ({ query, count }));
    }

    /**
     * 获取搜索统计
     * @returns {Object} 搜索统计信息
     */
    getSearchStats() {
        return {
            ...this.searchStats,
            historySize: this.searchHistory.length,
            popularSearches: this.getPopularSearches(5)
        };
    }

    /**
     * 保存搜索历史到本地存储
     */
    saveSearchHistory() {
        try {
            localStorage.setItem('ai-toolkit-search-history', 
                JSON.stringify(this.searchHistory)
            );
        } catch (error) {
            console.warn('Failed to save search history:', error);
        }
    }

    /**
     * 从本地存储加载搜索历史
     */
    loadSearchHistory() {
        try {
            const saved = localStorage.getItem('ai-toolkit-search-history');
            if (saved) {
                this.searchHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('Failed to load search history:', error);
            this.searchHistory = [];
        }
    }

    /**
     * 保存搜索统计到本地存储
     */
    saveSearchStats() {
        try {
            const statsToSave = {
                ...this.searchStats,
                popularQueries: Array.from(this.searchStats.popularQueries.entries())
            };
            localStorage.setItem('ai-toolkit-search-stats', 
                JSON.stringify(statsToSave)
            );
        } catch (error) {
            console.warn('Failed to save search stats:', error);
        }
    }

    /**
     * 从本地存储加载搜索统计
     */
    loadSearchStats() {
        try {
            const saved = localStorage.getItem('ai-toolkit-search-stats');
            if (saved) {
                const stats = JSON.parse(saved);
                this.searchStats = {
                    ...stats,
                    popularQueries: new Map(stats.popularQueries || [])
                };
            }
        } catch (error) {
            console.warn('Failed to load search stats:', error);
        }
    }

    /**
     * 高级搜索
     * @param {Object} criteria - 搜索条件
     * @returns {Array} 搜索结果
     */
    advancedSearch(criteria) {
        const {
            query = '',
            categories = [],
            isNew = null,
            hasUsage = null,
            sortBy = 'relevance'
        } = criteria;
        
        let tools = this.toolRegistry.getEnabledTools();
        
        // 按文本查询过滤
        if (query) {
            tools = tools.filter(tool => 
                this.matchesTool(tool, query.toLowerCase())
            );
        }
        
        // 按分类过滤
        if (categories.length > 0) {
            tools = tools.filter(tool => 
                categories.includes(tool.category)
            );
        }
        
        // 按新工具状态过滤
        if (isNew !== null) {
            tools = tools.filter(tool => 
                Boolean(tool.isNew) === isNew
            );
        }
        
        // 按使用情况过滤
        if (hasUsage !== null) {
            tools = tools.filter(tool => 
                hasUsage ? (tool.usageCount || 0) > 0 : (tool.usageCount || 0) === 0
            );
        }
        
        // 排序
        return this.sortResults(tools.map(tool => ({ tool })), sortBy, query);
    }

    /**
     * 事件发射器
     * @param {string} event - 事件名称
     * @param {*} data - 事件数据
     */
    emit(event, data) {
        const customEvent = new CustomEvent(`search-${event}`, {
            detail: data
        });
        document.dispatchEvent(customEvent);
    }

    /**
     * 销毁搜索管理器
     */
    destroy() {
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }
        
        this.saveSearchHistory();
        this.saveSearchStats();
        
        this.searchHistory = [];
        this.searchStats.popularQueries.clear();
        
        console.log('SearchManager destroyed');
    }
}

export default SearchManager;