// 应用主逻辑
class ToolsApp {
    constructor() {
        this.tools = [];
        this.categories = {};
        this.currentCategory = 'all';
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.searchQuery = '';
        
        this.init();
    }

    // 初始化应用
    async init() {
        try {
            await this.loadToolsData();
            this.initializeTheme();
            this.renderNavigation();
            this.renderTools();
            this.bindEventListeners();
            this.updateCounts();
        } catch (error) {
            console.error('初始化应用失败:', error);
            this.showError('应用加载失败，请刷新页面重试');
        }
    }

    // 加载工具数据
    async loadToolsData() {
        try {
            const response = await fetch('./data/tools.json');
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            this.tools = data.tools || [];
            this.categories = data.categories || {};
        } catch (error) {
            console.error('加载工具数据失败:', error);
            this.showError('无法加载工具数据，请检查网络连接或联系管理员');
            throw error;
        }
    }

    // 初始化主题
    initializeTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateThemeToggle();
    }

    // 更新主题切换按钮
    updateThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.textContent = this.currentTheme === 'light' ? '🌙' : '☀️';
        }
    }

    // 渲染导航
    renderNavigation() {
        const navList = document.getElementById('navList');
        if (!navList) return;

        navList.innerHTML = '';

        // 检查是否有分类数据
        if (!this.categories || Object.keys(this.categories).length === 0) {
            return;
        }

        // 添加全部工具导航
        if (this.categories.all) {
            const allItem = this.createNavItem('all', this.categories.all.name, this.categories.all.icon);
            navList.appendChild(allItem);
        }

        // 添加其他分类导航
        Object.entries(this.categories).forEach(([key, category]) => {
            if (key !== 'all') {
                const navItem = this.createNavItem(key, category.name, category.icon);
                navList.appendChild(navItem);
            }
        });
    }

    // 创建导航项
    createNavItem(category, name, icon) {
        const li = document.createElement('li');
        li.className = 'nav-item';

        const a = document.createElement('a');
        a.href = '#';
        a.className = `nav-link ${category === this.currentCategory ? 'active' : ''}`;
        a.dataset.category = category;

        const count = this.getToolsCount(category);
        
        a.innerHTML = `
            <span class="nav-icon">${icon}</span>
            <span>${name}</span>
            <span class="nav-count">${count}</span>
        `;

        li.appendChild(a);
        return li;
    }

    // 获取工具数量
    getToolsCount(category) {
        if (category === 'all') return this.tools.length;
        return this.tools.filter(tool => tool.category === category).length;
    }

    // 更新导航计数
    updateCounts() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const category = link.dataset.category;
            const countElement = link.querySelector('.nav-count');
            if (countElement) {
                countElement.textContent = this.getToolsCount(category);
            }
        });
    }

    // 渲染工具卡片
    renderTools() {
        const toolsGrid = document.getElementById('toolsGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (!toolsGrid || !emptyState) return;

        // 过滤工具
        const filteredTools = this.tools.filter(tool => {
            const matchesCategory = this.currentCategory === 'all' || tool.category === this.currentCategory;
            const matchesSearch = this.searchQuery === '' || 
                tool.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                tool.description.toLowerCase().includes(this.searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });

        // 清空网格
        toolsGrid.innerHTML = '';

        if (filteredTools.length === 0) {
            emptyState.style.display = 'block';
            return;
        } else {
            emptyState.style.display = 'none';
        }

        // 生成工具卡片
        filteredTools.forEach(tool => {
            const toolCard = this.createToolCard(tool);
            toolsGrid.appendChild(toolCard);
        });
    }

    // 创建工具卡片
    createToolCard(tool) {
        const card = document.createElement('a');
        card.className = 'tools-item';
        card.href = '#';
        
        card.innerHTML = `
            <div class="tools-item-icon" style="background-color: ${tool.iconColor}20; color: ${tool.iconColor}">
                ${tool.icon}
            </div>
            <h3>${tool.name}</h3>
            <div class="tools-item-content">
                <p>${tool.description}</p>
                <div class="tools-item-badges">
                    ${tool.isNew ? '<span class="tools-item-badge new">新功能！</span>' : ''}
                    ${tool.author ? `<span class="tools-item-badge">${tool.author}</span>` : ''}
                </div>
            </div>
        `;

        // 添加点击事件
        card.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleToolClick(tool);
        });

        return card;
    }

    // 处理工具点击
    handleToolClick(tool) {
        if (tool.url) {
            // 如果是相对路径，在当前窗口打开
            if (tool.url.startsWith('./')) {
                window.location.href = tool.url;
            } else {
                // 如果是绝对路径，在新窗口打开
                window.open(tool.url, '_blank');
            }
        } else {
            AppUtils.showMessage(`即将打开工具: ${tool.name}`, 'info');
        }
    }

    // 绑定事件监听器
    bindEventListeners() {
        // 主题切换
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // 搜索功能
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e));
        }

        // 分类导航
        document.addEventListener('click', (e) => {
            if (e.target.closest('.nav-link')) {
                e.preventDefault();
                this.handleCategoryChange(e.target.closest('.nav-link'));
            }
        });

        // 移动端菜单
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => this.toggleMobileMenu());
        }

        // 点击外部关闭移动端菜单
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            const mobileMenuBtn = document.getElementById('mobileMenuBtn');
            
            if (window.innerWidth <= 768 && 
                sidebar && !sidebar.contains(e.target) && 
                mobileMenuBtn && !mobileMenuBtn.contains(e.target)) {
                sidebar.classList.remove('mobile-open');
            }
        });

        // 响应式处理
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.classList.remove('mobile-open');
                }
            }
        });
    }

    // 切换主题
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);
        this.updateThemeToggle();
    }

    // 处理搜索
    handleSearch(e) {
        this.searchQuery = e.target.value.trim();
        this.renderTools();
    }

    // 处理分类变更
    handleCategoryChange(linkElement) {
        // 更新当前分类
        this.currentCategory = linkElement.dataset.category;
        
        // 更新导航状态
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        linkElement.classList.add('active');
        
        // 重新渲染工具
        this.renderTools();
        
        // 移动端自动关闭侧边栏
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.remove('mobile-open');
            }
        }
    }

    // 切换移动端菜单
    toggleMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('mobile-open');
        }
    }

    // 显示消息
    showMessage(message, type = 'info') {
        AppUtils.showMessage(message, type);
    }

    // 显示错误
    showError(message) {
        AppUtils.showError(message);
    }
}

// 应用特定的工具函数
const AppUtils = {
    // 显示消息提示
    showMessage(message, type = 'info') {
        // 创建消息提示元素
        const messageElement = document.createElement('div');
        messageElement.className = `alert alert-${type}`;
        messageElement.textContent = message;
        messageElement.style.position = 'fixed';
        messageElement.style.top = '20px';
        messageElement.style.right = '20px';
        messageElement.style.zIndex = '9999';
        messageElement.style.minWidth = '300px';
        messageElement.style.boxShadow = 'var(--shadow-hover)';
        
        // 添加到页面
        document.body.appendChild(messageElement);
        
        // 自动移除
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 3000);
    },

    // 显示错误
    showError(message) {
        this.showMessage(message, 'danger');
    },

    // 显示成功
    showSuccess(message) {
        this.showMessage(message, 'success');
    },

    // 显示警告
    showWarning(message) {
        this.showMessage(message, 'warning');
    },

    // 显示信息
    showInfo(message) {
        this.showMessage(message, 'info');
    }
};

// 应用初始化
document.addEventListener('DOMContentLoaded', () => {
    // 创建应用实例
    window.app = new ToolsApp();
    
    // 将工具函数暴露到全局
    window.AppUtils = AppUtils;
});

// 导出模块（如果需要）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ToolsApp, AppUtils };
}