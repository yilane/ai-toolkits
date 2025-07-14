/**
 * 主应用类
 * 负责整个应用的初始化、管理和协调各个模块
 */
import ConfigManager from './config-manager.js';
import ToolRegistry from '../tools/registry.js';
import ThemeManager from './theme.js';
import SearchManager from './search.js';

class App {
    constructor() {
        this.configManager = new ConfigManager();
        this.toolRegistry = new ToolRegistry();
        this.themeManager = new ThemeManager();
        this.searchManager = new SearchManager(this.toolRegistry);
        
        this.currentTool = null;
        this.currentCategory = 'all';
        this.initialized = false;
        this.loading = false;
        
        // UI 状态
        this.ui = {
            sidebarOpen: true,
            mobileMenuOpen: false,
            toolModalOpen: false,
            currentView: 'grid'
        };
        
        // 事件监听器
        this.eventListeners = new Map();
        
        this.init();
    }

    /**
     * 应用初始化
     */
    async init() {
        if (this.initialized) return;
        
        try {
            this.setLoading(true);
            console.log('Initializing AI Toolkit App...');
            
            // 1. 初始化配置管理器
            this.configManager.initialize();
            await this.configManager.loadConfigs();
            
            // 2. 初始化主题管理器
            this.themeManager.initialize();
            
            // 3. 初始化工具注册器
            this.toolRegistry.initialize();
            
            // 4. 加载工具
            await this.loadTools();
            
            // 5. 初始化UI
            this.initializeUI();
            
            // 6. 绑定事件
            this.bindEvents();
            
            this.initialized = true;
            this.setLoading(false);
            
            console.log('App initialized successfully');
            this.emit('app-initialized');
            
        } catch (error) {
            console.error('App initialization failed:', error);
            this.setLoading(false);
            this.showError('应用初始化失败', error);
            throw error;
        }
    }

    /**
     * 加载工具模块
     */
    async loadTools() {
        const toolsConfig = this.configManager.get('tools');
        if (!toolsConfig || !toolsConfig.tools) {
            console.warn('No tools configuration found');
            return;
        }

        const loadPromises = toolsConfig.tools
            .filter(toolConfig => toolConfig.enabled)
            .map(async (toolConfig) => {
                try {
                    // 动态导入工具模块
                    const modulePath = `../tools/${toolConfig.module}`;
                    const toolModule = await import(modulePath);
                    const ToolClass = toolModule.default;
                    
                    // 创建工具实例并注册
                    const tool = new ToolClass();
                    this.toolRegistry.register(tool);
                    
                    return { success: true, toolId: toolConfig.id };
                } catch (error) {
                    console.error(`Failed to load tool: ${toolConfig.id}`, error);
                    return { success: false, toolId: toolConfig.id, error };
                }
            });

        const results = await Promise.all(loadPromises);
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        console.log(`Tools loaded: ${successful} successful, ${failed} failed`);
        
        if (failed > 0) {
            console.warn('Some tools failed to load:', 
                results.filter(r => !r.success).map(r => r.toolId)
            );
        }
    }

    /**
     * 初始化UI
     */
    initializeUI() {
        this.renderHeader();
        this.renderSidebar();
        this.renderMainContent();
        this.updateToolsGrid();
        this.updateThemeToggle();
    }

    /**
     * 渲染头部组件
     */
    renderHeader() {
        const header = document.querySelector('.header');
        if (!header) return;

        // 绑定搜索输入事件
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
            
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearchSubmit(e.target.value);
                }
            });
        }

        // 绑定主题切换按钮
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // 绑定移动端菜单按钮
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }
    }

    /**
     * 渲染侧边栏
     */
    renderSidebar() {
        const categoriesConfig = this.configManager.get('categories');
        if (!categoriesConfig || !categoriesConfig.categories) return;

        const navList = document.querySelector('.nav-list');
        if (!navList) return;

        navList.innerHTML = '';

        categoriesConfig.categories.forEach(category => {
            const toolCount = category.id === 'all' 
                ? this.toolRegistry.getEnabledTools().length
                : this.toolRegistry.getByCategory(category.id).length;

            const navItem = this.createNavItem(category, toolCount);
            navList.appendChild(navItem);
        });
    }

    /**
     * 创建导航项
     */
    createNavItem(category, count) {
        const navItem = document.createElement('li');
        navItem.className = 'nav-item';

        const navLink = document.createElement('a');
        navLink.className = `nav-link ${category.id === this.currentCategory ? 'active' : ''}`;
        navLink.href = '#';
        navLink.dataset.category = category.id;
        
        navLink.innerHTML = `
            <span class="nav-icon">${category.icon}</span>
            <span>${category.name}</span>
            <span class="nav-count">${count}</span>
        `;

        navLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleCategoryChange(category.id);
        });

        navItem.appendChild(navLink);
        return navItem;
    }

    /**
     * 渲染主内容区
     */
    renderMainContent() {
        const mainHeader = document.querySelector('.main-header');
        if (mainHeader) {
            const title = mainHeader.querySelector('.main-title');
            const subtitle = mainHeader.querySelector('.main-subtitle');
            
            if (title) title.textContent = this.configManager.get('app.name', 'AI工具集');
            if (subtitle) subtitle.textContent = this.configManager.get('app.description', '智能工具平台');
        }
    }

    /**
     * 更新工具网格
     */
    updateToolsGrid() {
        const toolsGrid = document.getElementById('toolsGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (!toolsGrid) return;

        // 获取当前分类的工具
        const tools = this.currentCategory === 'all' 
            ? this.toolRegistry.getEnabledTools()
            : this.toolRegistry.getByCategory(this.currentCategory);

        // 清空网格
        toolsGrid.innerHTML = '';

        if (tools.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        // 生成工具卡片
        tools.forEach(tool => {
            const toolCard = this.createToolCard(tool);
            toolsGrid.appendChild(toolCard);
        });
    }

    /**
     * 创建工具卡片
     */
    createToolCard(tool) {
        const card = document.createElement('a');
        card.className = 'tools-item';
        card.href = '#';
        card.dataset.toolId = tool.id;
        
        card.innerHTML = `
            <div class="tools-item-icon" style="background-color: ${tool.iconColor}20; color: ${tool.iconColor}">
                ${tool.icon}
            </div>
            <h3>${tool.name}</h3>
            <div class="tools-item-content">
                <p>${tool.description}</p>
                ${tool.isNew ? '<span class="tools-item-badge new">新功能！</span>' : ''}
            </div>
        `;

        // 添加点击事件
        card.addEventListener('click', (e) => {
            e.preventDefault();
            this.openTool(tool.id);
        });

        return card;
    }

    /**
     * 打开工具
     */
    async openTool(toolId) {
        try {
            const tool = this.toolRegistry.getTool(toolId);
            if (!tool) {
                this.showError('工具未找到');
                return;
            }

            this.currentTool = tool;
            tool.updateUsageStats();
            
            // 显示工具界面
            this.showToolModal(tool);
            
            this.emit('tool-opened', { toolId, tool });
        } catch (error) {
            console.error('Failed to open tool:', error);
            this.showError('无法打开工具', error);
        }
    }

    /**
     * 显示工具模态框
     */
    showToolModal(tool) {
        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'tool-modal';
        modal.innerHTML = `
            <div class="tool-modal-overlay"></div>
            <div class="tool-modal-content">
                <div class="tool-modal-header">
                    <h2>${tool.name}</h2>
                    <button class="tool-modal-close">&times;</button>
                </div>
                <div class="tool-modal-body">
                    ${tool.getUI() || '<p>该工具暂未提供界面</p>'}
                </div>
            </div>
        `;

        // 绑定关闭事件
        const closeBtn = modal.querySelector('.tool-modal-close');
        const overlay = modal.querySelector('.tool-modal-overlay');
        
        const closeModal = () => {
            modal.remove();
            this.ui.toolModalOpen = false;
            this.currentTool = null;
        };

        closeBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);

        // 添加到页面
        document.body.appendChild(modal);
        this.ui.toolModalOpen = true;

        // ESC键关闭
        const handleKeyPress = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleKeyPress);
            }
        };
        document.addEventListener('keydown', handleKeyPress);
    }

    /**
     * 处理搜索
     */
    handleSearch(query) {
        this.searchManager.searchDebounced(query, {
            category: this.currentCategory
        }, (results) => {
            this.updateSearchResults(results);
        });
    }

    /**
     * 处理搜索提交
     */
    handleSearchSubmit(query) {
        this.searchManager.search(query, {
            category: this.currentCategory
        }).then(results => {
            this.updateSearchResults(results);
        });
    }

    /**
     * 更新搜索结果
     */
    updateSearchResults(results) {
        const toolsGrid = document.getElementById('toolsGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (!toolsGrid) return;

        toolsGrid.innerHTML = '';

        if (results.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        results.forEach(tool => {
            const toolCard = this.createToolCard(tool);
            toolsGrid.appendChild(toolCard);
        });
    }

    /**
     * 处理分类变更
     */
    handleCategoryChange(categoryId) {
        this.currentCategory = categoryId;
        
        // 更新导航状态
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-category="${categoryId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        // 更新工具网格
        this.updateToolsGrid();
        
        // 清空搜索
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        
        // 移动端自动关闭侧边栏
        if (window.innerWidth <= 768) {
            this.closeMobileMenu();
        }
        
        this.emit('category-changed', { categoryId });
    }

    /**
     * 切换主题
     */
    toggleTheme() {
        const currentTheme = this.themeManager.getCurrentTheme();
        const nextTheme = currentTheme.id === 'light' ? 'dark' : 'light';
        this.themeManager.setTheme(nextTheme);
        this.updateThemeToggle();
    }

    /**
     * 更新主题切换按钮
     */
    updateThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;

        const currentTheme = this.themeManager.getCurrentTheme();
        const isDark = currentTheme.actualTheme === 'dark';
        themeToggle.textContent = isDark ? '☀️' : '🌙';
    }

    /**
     * 切换移动端菜单
     */
    toggleMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        this.ui.mobileMenuOpen = !this.ui.mobileMenuOpen;
        
        if (this.ui.mobileMenuOpen) {
            sidebar.classList.add('mobile-open');
        } else {
            sidebar.classList.remove('mobile-open');
        }
    }

    /**
     * 关闭移动端菜单
     */
    closeMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('mobile-open');
        }
        this.ui.mobileMenuOpen = false;
    }

    /**
     * 绑定全局事件
     */
    bindEvents() {
        // 窗口调整大小
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                this.closeMobileMenu();
            }
        });

        // 点击外部关闭移动端菜单
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            const mobileMenuBtn = document.getElementById('mobileMenuBtn');
            
            if (window.innerWidth <= 768 && 
                this.ui.mobileMenuOpen &&
                !sidebar?.contains(e.target) && 
                !mobileMenuBtn?.contains(e.target)) {
                this.closeMobileMenu();
            }
        });

        // 主题变更监听
        this.themeManager.onThemeChange(() => {
            this.updateThemeToggle();
        });
    }

    /**
     * 设置加载状态
     */
    setLoading(loading) {
        this.loading = loading;
        
        const loadingElement = document.querySelector('.loading');
        if (loadingElement) {
            loadingElement.style.display = loading ? 'flex' : 'none';
        }
        
        this.emit('loading-changed', { loading });
    }

    /**
     * 显示错误消息
     */
    showError(message, error = null) {
        console.error(message, error);
        
        // 创建错误提示
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-toast';
        errorDiv.textContent = message;
        
        // 添加到页面
        document.body.appendChild(errorDiv);
        
        // 自动移除
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
        
        this.emit('error', { message, error });
    }

    /**
     * 显示成功消息
     */
    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-toast';
        successDiv.textContent = message;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
        
        this.emit('success', { message });
    }

    /**
     * 获取应用状态
     */
    getState() {
        return {
            initialized: this.initialized,
            loading: this.loading,
            currentCategory: this.currentCategory,
            currentTool: this.currentTool?.id || null,
            ui: { ...this.ui },
            stats: {
                toolCount: this.toolRegistry.getAllTools().length,
                enabledToolCount: this.toolRegistry.getEnabledTools().length,
                categoryStats: this.toolRegistry.getCategoryStats()
            }
        };
    }

    /**
     * 事件发射器
     */
    emit(event, data = {}) {
        const customEvent = new CustomEvent(`app-${event}`, {
            detail: { ...data, timestamp: new Date().toISOString() }
        });
        document.dispatchEvent(customEvent);
    }

    /**
     * 销毁应用
     */
    destroy() {
        // 清理资源
        this.toolRegistry.destroy();
        this.themeManager.destroy();
        this.searchManager.destroy();
        this.configManager.destroy();
        
        // 清理事件监听器
        this.eventListeners.clear();
        
        this.initialized = false;
        console.log('App destroyed');
    }
}

// 导出应用类
export default App;

// 全局应用实例
window.AiToolkitApp = null;

// DOM 加载完成后初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    try {
        window.AiToolkitApp = new App();
        await window.AiToolkitApp.init();
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
});