/**
 * 主题管理器
 * 负责管理应用主题切换、样式变量和用户偏好
 */
class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
        this.availableThemes = new Map();
        this.customThemes = new Map();
        this.listeners = new Map();
        this.initialized = false;
        
        // 系统主题检测
        this.systemTheme = this.detectSystemTheme();
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        this.init();
    }

    /**
     * 初始化主题管理器
     */
    init() {
        if (this.initialized) return;
        
        // 注册默认主题
        this.registerDefaultThemes();
        
        // 监听系统主题变化
        this.mediaQuery.addListener(this.handleSystemThemeChange.bind(this));
        
        // 从本地存储加载主题偏好
        this.loadThemePreference();
        
        this.initialized = true;
        console.log('ThemeManager initialized');
    }

    /**
     * 注册默认主题
     */
    registerDefaultThemes() {
        // Light 主题
        this.registerTheme('light', {
            name: '浅色主题',
            description: '明亮清爽的浅色主题',
            variables: {
                // 主色调
                '--primary-color': '#4d90fe',
                '--secondary-color': '#5B6AFF',
                '--accent-color': '#667EEA',
                
                // 背景色
                '--bg-primary': '#FFFFFF',
                '--bg-secondary': '#F5F7FA',
                '--bg-card': '#FFFFFF',
                '--bg-overlay': 'rgba(0, 0, 0, 0.5)',
                
                // 文字颜色
                '--text-primary': '#333333',
                '--text-secondary': '#666666',
                '--text-muted': '#999999',
                '--text-inverse': '#FFFFFF',
                
                // 边框和阴影
                '--border-color': '#E5E7EB',
                '--border-focus': '#4d90fe',
                '--shadow-base': '0 4px 12px rgba(0,0,0,0.08)',
                '--shadow-hover': '0 8px 24px rgba(0,0,0,0.12)',
                '--shadow-modal': '0 20px 40px rgba(0,0,0,0.15)',
                
                // 状态色
                '--color-success': '#10B981',
                '--color-warning': '#F59E0B',
                '--color-error': '#EF4444',
                '--color-info': '#3B82F6',
                
                // 间距
                '--spacing-xs': '8px',
                '--spacing-sm': '16px',
                '--spacing-md': '24px',
                '--spacing-lg': '32px',
                '--spacing-xl': '48px',
                
                // 动画
                '--transition-fast': '0.15s ease',
                '--transition-base': '0.3s ease',
                '--transition-slow': '0.5s ease'
            }
        });

        // Dark 主题
        this.registerTheme('dark', {
            name: '深色主题',
            description: '护眼舒适的深色主题',
            variables: {
                // 主色调
                '--primary-color': '#4d90fe',
                '--secondary-color': '#5B6AFF',
                '--accent-color': '#667EEA',
                
                // 背景色
                '--bg-primary': '#1a1a1a',
                '--bg-secondary': '#2d2d30',
                '--bg-card': '#252526',
                '--bg-overlay': 'rgba(0, 0, 0, 0.7)',
                
                // 文字颜色
                '--text-primary': '#cccccc',
                '--text-secondary': '#9d9d9d',
                '--text-muted': '#6d6d6d',
                '--text-inverse': '#333333',
                
                // 边框和阴影
                '--border-color': '#3e3e42',
                '--border-focus': '#4d90fe',
                '--shadow-base': '0 4px 12px rgba(0,0,0,0.3)',
                '--shadow-hover': '0 8px 24px rgba(0,0,0,0.4)',
                '--shadow-modal': '0 20px 40px rgba(0,0,0,0.6)',
                
                // 状态色
                '--color-success': '#10B981',
                '--color-warning': '#F59E0B',
                '--color-error': '#EF4444',
                '--color-info': '#3B82F6',
                
                // 间距
                '--spacing-xs': '8px',
                '--spacing-sm': '16px',
                '--spacing-md': '24px',
                '--spacing-lg': '32px',
                '--spacing-xl': '48px',
                
                // 动画
                '--transition-fast': '0.15s ease',
                '--transition-base': '0.3s ease',
                '--transition-slow': '0.5s ease'
            }
        });

        // Auto 主题（跟随系统）
        this.registerTheme('auto', {
            name: '跟随系统',
            description: '自动跟随系统主题设置',
            isAuto: true
        });
    }

    /**
     * 注册主题
     * @param {string} id - 主题ID
     * @param {Object} theme - 主题配置
     */
    registerTheme(id, theme) {
        if (!id || !theme) {
            console.warn('Invalid theme registration');
            return false;
        }

        this.availableThemes.set(id, {
            id,
            ...theme,
            createdAt: new Date().toISOString()
        });

        this.emit('theme-registered', { id, theme });
        return true;
    }

    /**
     * 设置当前主题
     * @param {string} themeId - 主题ID
     * @param {boolean} savePreference - 是否保存偏好
     */
    setTheme(themeId, savePreference = true) {
        if (!themeId) return false;

        // 处理 auto 主题
        if (themeId === 'auto') {
            this.currentTheme = 'auto';
            const actualTheme = this.systemTheme;
            this.applyTheme(actualTheme);
        } else if (this.availableThemes.has(themeId)) {
            this.currentTheme = themeId;
            this.applyTheme(themeId);
        } else {
            console.warn(`Theme not found: ${themeId}`);
            return false;
        }

        // 保存用户偏好
        if (savePreference) {
            this.saveThemePreference(themeId);
        }

        // 触发主题变更事件
        this.emit('theme-changed', {
            themeId: this.currentTheme,
            actualTheme: themeId === 'auto' ? this.systemTheme : themeId
        });

        return true;
    }

    /**
     * 应用主题
     * @param {string} themeId - 主题ID
     */
    applyTheme(themeId) {
        const theme = this.availableThemes.get(themeId);
        if (!theme) return;

        const root = document.documentElement;
        
        // 设置主题属性
        root.setAttribute('data-theme', themeId);
        
        // 应用CSS变量
        if (theme.variables) {
            Object.entries(theme.variables).forEach(([property, value]) => {
                root.style.setProperty(property, value);
            });
        }

        // 应用自定义CSS类
        if (theme.className) {
            document.body.className = document.body.className
                .replace(/theme-\w+/g, '')
                .trim() + ` ${theme.className}`;
        }

        console.log(`Theme applied: ${themeId}`);
    }

    /**
     * 切换主题（在可用主题间循环）
     */
    toggleTheme() {
        const themes = Array.from(this.availableThemes.keys());
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        
        this.setTheme(nextTheme);
    }

    /**
     * 检测系统主题
     * @returns {string} 系统主题
     */
    detectSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    /**
     * 处理系统主题变化
     * @param {MediaQueryListEvent} e - 媒体查询事件
     */
    handleSystemThemeChange(e) {
        this.systemTheme = e.matches ? 'dark' : 'light';
        
        // 如果当前是 auto 主题，则应用新的系统主题
        if (this.currentTheme === 'auto') {
            this.applyTheme(this.systemTheme);
            this.emit('system-theme-changed', { systemTheme: this.systemTheme });
        }
    }

    /**
     * 保存主题偏好到本地存储
     * @param {string} themeId - 主题ID
     */
    saveThemePreference(themeId) {
        try {
            localStorage.setItem('ai-toolkit-theme', themeId);
        } catch (error) {
            console.warn('Failed to save theme preference:', error);
        }
    }

    /**
     * 从本地存储加载主题偏好
     */
    loadThemePreference() {
        try {
            const savedTheme = localStorage.getItem('ai-toolkit-theme');
            if (savedTheme && this.availableThemes.has(savedTheme)) {
                this.setTheme(savedTheme, false);
            } else {
                // 默认使用 auto 主题
                this.setTheme('auto', false);
            }
        } catch (error) {
            console.warn('Failed to load theme preference:', error);
            this.setTheme('light', false);
        }
    }

    /**
     * 创建自定义主题
     * @param {string} id - 主题ID
     * @param {Object} baseTheme - 基础主题ID
     * @param {Object} customizations - 自定义配置
     * @returns {boolean} 创建是否成功
     */
    createCustomTheme(id, baseTheme, customizations) {
        if (!id || !baseTheme || !customizations) return false;

        const base = this.availableThemes.get(baseTheme);
        if (!base) {
            console.warn(`Base theme not found: ${baseTheme}`);
            return false;
        }

        const customTheme = {
            id,
            name: customizations.name || `自定义主题 ${id}`,
            description: customizations.description || '用户自定义主题',
            isCustom: true,
            baseTheme,
            variables: {
                ...base.variables,
                ...customizations.variables
            }
        };

        this.customThemes.set(id, customTheme);
        this.availableThemes.set(id, customTheme);
        
        this.emit('custom-theme-created', { id, theme: customTheme });
        return true;
    }

    /**
     * 删除自定义主题
     * @param {string} id - 主题ID
     * @returns {boolean} 删除是否成功
     */
    deleteCustomTheme(id) {
        const theme = this.customThemes.get(id);
        if (!theme) return false;

        this.customThemes.delete(id);
        this.availableThemes.delete(id);

        // 如果删除的是当前主题，切换到默认主题
        if (this.currentTheme === id) {
            this.setTheme('light');
        }

        this.emit('custom-theme-deleted', { id });
        return true;
    }

    /**
     * 获取当前主题
     * @returns {Object} 当前主题信息
     */
    getCurrentTheme() {
        return {
            id: this.currentTheme,
            theme: this.availableThemes.get(this.currentTheme),
            actualTheme: this.currentTheme === 'auto' ? this.systemTheme : this.currentTheme
        };
    }

    /**
     * 获取所有可用主题
     * @returns {Array} 主题列表
     */
    getAvailableThemes() {
        return Array.from(this.availableThemes.values());
    }

    /**
     * 获取主题变量值
     * @param {string} variable - 变量名
     * @returns {string} 变量值
     */
    getThemeVariable(variable) {
        return getComputedStyle(document.documentElement)
            .getPropertyValue(variable)
            .trim();
    }

    /**
     * 设置主题变量
     * @param {string} variable - 变量名
     * @param {string} value - 变量值
     */
    setThemeVariable(variable, value) {
        document.documentElement.style.setProperty(variable, value);
    }

    /**
     * 导出主题配置
     * @param {string} themeId - 主题ID
     * @returns {Object} 主题配置
     */
    exportTheme(themeId) {
        const theme = this.availableThemes.get(themeId);
        if (!theme) return null;

        return {
            ...theme,
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * 导入主题配置
     * @param {Object} themeConfig - 主题配置
     * @returns {boolean} 导入是否成功
     */
    importTheme(themeConfig) {
        if (!themeConfig || !themeConfig.id) return false;

        this.registerTheme(themeConfig.id, themeConfig);
        return true;
    }

    /**
     * 获取主题预览
     * @param {string} themeId - 主题ID
     * @returns {Object} 预览信息
     */
    getThemePreview(themeId) {
        const theme = this.availableThemes.get(themeId);
        if (!theme) return null;

        return {
            id: theme.id,
            name: theme.name,
            description: theme.description,
            primaryColor: theme.variables?.['--primary-color'],
            backgroundColor: theme.variables?.['--bg-primary'],
            textColor: theme.variables?.['--text-primary']
        };
    }

    /**
     * 注册主题变更监听器
     * @param {Function} callback - 回调函数
     * @returns {Function} 取消监听函数
     */
    onThemeChange(callback) {
        return this.on('theme-changed', callback);
    }

    /**
     * 事件监听器注册
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     * @returns {Function} 取消监听函数
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        
        this.listeners.get(event).push(callback);

        // 返回取消监听函数
        return () => {
            const callbacks = this.listeners.get(event);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
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
                console.error(`Theme event callback error for '${event}':`, error);
            }
        });
    }

    /**
     * 销毁主题管理器
     */
    destroy() {
        // 移除系统主题监听器
        this.mediaQuery.removeListener(this.handleSystemThemeChange.bind(this));
        
        // 清理数据
        this.availableThemes.clear();
        this.customThemes.clear();
        this.listeners.clear();
        
        this.initialized = false;
        console.log('ThemeManager destroyed');
    }
}

export default ThemeManager;