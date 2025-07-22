/**
 * 用户体验增强模块
 * 包含加载状态、错误处理、快捷键、无障碍功能、手势操作等
 */

class UXEnhancer {
    constructor() {
        this.loadingStates = new Map();
        this.shortcuts = new Map();
        this.notifications = [];
        this.maxNotifications = 5;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isTouch = false;
        this.init();
    }

    init() {
        this.setupKeyboardShortcuts();
        this.setupAccessibility();
        this.setupTouchGestures();
        this.setupNotificationSystem();
        this.setupProgressIndicators();
        this.bindEventListeners();
    }

    /**
     * 设置键盘快捷键
     */
    setupKeyboardShortcuts() {
        // 定义快捷键
        this.shortcuts.set('ctrl+k', () => this.focusSearch());
        this.shortcuts.set('ctrl+/', () => this.showShortcuts());
        this.shortcuts.set('ctrl+shift+d', () => this.toggleTheme());
        this.shortcuts.set('escape', () => this.closeModals());
        this.shortcuts.set('ctrl+shift+c', () => this.clearCache());

        // 绑定键盘事件
        document.addEventListener('keydown', (e) => {
            const key = this.getShortcutKey(e);
            const handler = this.shortcuts.get(key);
            
            if (handler && !this.isInputFocused()) {
                e.preventDefault();
                handler();
            }
        });
    }

    /**
     * 获取快捷键字符串
     */
    getShortcutKey(event) {
        const parts = [];
        if (event.ctrlKey) parts.push('ctrl');
        if (event.shiftKey) parts.push('shift');
        if (event.altKey) parts.push('alt');
        if (event.metaKey) parts.push('meta');
        
        const key = event.key.toLowerCase();
        if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
            parts.push(key);
        }
        
        return parts.join('+');
    }

    /**
     * 检查输入框是否获得焦点
     */
    isInputFocused() {
        const activeElement = document.activeElement;
        return activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.contentEditable === 'true'
        );
    }

    /**
     * 聚焦搜索框
     */
    focusSearch() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    /**
     * 显示快捷键帮助
     */
    showShortcuts() {
        const shortcuts = [
            { key: 'Ctrl + K', action: '聚焦搜索框' },
            { key: 'Ctrl + /', action: '显示快捷键帮助' },
            { key: 'Ctrl + Shift + D', action: '切换主题' },
            { key: 'Esc', action: '关闭弹窗' },
            { key: 'Ctrl + Shift + C', action: '清除缓存' }
        ];

        this.showModal('快捷键帮助', shortcuts.map(s => 
            `<div class="shortcut-item">
                <kbd>${s.key}</kbd>
                <span>${s.action}</span>
            </div>`
        ).join(''));
    }

    /**
     * 切换主题
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        this.showNotification(`已切换到${newTheme === 'dark' ? '深色' : '浅色'}模式`, 'success');
    }

    /**
     * 关闭所有模态框
     */
    closeModals() {
        const modals = document.querySelectorAll('.modal, .dropdown-menu, .tooltip');
        modals.forEach(modal => {
            modal.style.display = 'none';
            modal.classList.remove('show', 'active');
        });
    }

    /**
     * 清除缓存
     */
    clearCache() {
        if (confirm('确定要清除所有缓存数据吗？')) {
            localStorage.clear();
            sessionStorage.clear();
            
            // 清除性能优化器缓存
            if (window.performanceOptimizer) {
                window.performanceOptimizer.cleanup();
            }
            
            this.showNotification('缓存已清除', 'success');
        }
    }

    /**
     * 设置无障碍功能
     */
    setupAccessibility() {
        // 添加跳转到主内容的链接
        this.addSkipLink();
        
        // 改善焦点管理
        this.improveFocusManagement();
        
        // 添加ARIA标签
        this.addAriaLabels();
        
        // 键盘导航支持
        this.setupKeyboardNavigation();
    }

    /**
     * 添加跳转链接
     */
    addSkipLink() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main';
        skipLink.textContent = '跳转到主内容';
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: var(--primary-color);
            color: white;
            padding: 8px;
            text-decoration: none;
            border-radius: 4px;
            z-index: 9999;
            transition: top 0.3s;
        `;
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    /**
     * 改善焦点管理
     */
    improveFocusManagement() {
        // 焦点环样式
        const style = document.createElement('style');
        style.textContent = `
            .focus-visible {
                outline: 2px solid var(--primary-color);
                outline-offset: 2px;
            }
            
            :focus:not(.focus-visible) {
                outline: none;
            }
        `;
        document.head.appendChild(style);

        // 焦点陷阱（用于模态框）
        this.setupFocusTrap();
    }

    /**
     * 设置焦点陷阱
     */
    setupFocusTrap() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const modal = document.querySelector('.modal.show');
                if (modal) {
                    this.trapFocus(e, modal);
                }
            }
        });
    }

    /**
     * 焦点陷阱实现
     */
    trapFocus(event, container) {
        const focusableElements = container.querySelectorAll(
            'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
            if (document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        }
    }

    /**
     * 添加ARIA标签
     */
    addAriaLabels() {
        // 为搜索框添加标签
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.setAttribute('aria-label', '搜索工具');
            searchInput.setAttribute('role', 'searchbox');
        }

        // 为导航添加标签
        const nav = document.querySelector('nav');
        if (nav) {
            nav.setAttribute('aria-label', '主导航');
        }

        // 为工具网格添加标签
        const toolsGrid = document.getElementById('toolsGrid');
        if (toolsGrid) {
            toolsGrid.setAttribute('aria-label', '工具列表');
            toolsGrid.setAttribute('role', 'grid');
        }
    }

    /**
     * 设置键盘导航
     */
    setupKeyboardNavigation() {
        // 方向键导航工具卡片
        document.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                this.handleArrowNavigation(e);
            }
        });
    }

    /**
     * 处理方向键导航
     */
    handleArrowNavigation(event) {
        const toolCards = Array.from(document.querySelectorAll('.tools-item'));
        const currentIndex = toolCards.indexOf(document.activeElement);
        
        if (currentIndex === -1) return;

        let nextIndex;
        const columns = this.getGridColumns();

        switch (event.key) {
            case 'ArrowRight':
                nextIndex = Math.min(currentIndex + 1, toolCards.length - 1);
                break;
            case 'ArrowLeft':
                nextIndex = Math.max(currentIndex - 1, 0);
                break;
            case 'ArrowDown':
                nextIndex = Math.min(currentIndex + columns, toolCards.length - 1);
                break;
            case 'ArrowUp':
                nextIndex = Math.max(currentIndex - columns, 0);
                break;
        }

        if (nextIndex !== undefined && toolCards[nextIndex]) {
            event.preventDefault();
            toolCards[nextIndex].focus();
        }
    }

    /**
     * 获取网格列数
     */
    getGridColumns() {
        const toolsGrid = document.getElementById('toolsGrid');
        if (!toolsGrid) return 1;
        
        const computedStyle = getComputedStyle(toolsGrid);
        const columns = computedStyle.gridTemplateColumns.split(' ').length;
        return columns || 1;
    }

    /**
     * 设置触摸手势
     */
    setupTouchGestures() {
        document.addEventListener('touchstart', (e) => {
            this.isTouch = true;
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        });

        document.addEventListener('touchend', (e) => {
            if (!this.isTouch) return;
            
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            const deltaX = touchEndX - this.touchStartX;
            const deltaY = touchEndY - this.touchStartY;
            
            // 检测滑动手势
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                    this.handleSwipeRight();
                } else {
                    this.handleSwipeLeft();
                }
            }
            
            this.isTouch = false;
        });
    }

    /**
     * 右滑处理
     */
    handleSwipeRight() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && window.innerWidth <= 768) {
            sidebar.classList.add('mobile-open');
        }
    }

    /**
     * 左滑处理
     */
    handleSwipeLeft() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('mobile-open')) {
            sidebar.classList.remove('mobile-open');
        }
    }

    /**
     * 设置通知系统
     */
    setupNotificationSystem() {
        // 创建通知容器
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 12px;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }

    /**
     * 显示通知
     */
    showNotification(message, type = 'info', duration = 4000) {
        const notification = this.createNotification(message, type);
        const container = document.getElementById('notification-container');
        
        // 限制通知数量
        if (this.notifications.length >= this.maxNotifications) {
            const oldestNotification = this.notifications.shift();
            oldestNotification.element.remove();
        }

        container.appendChild(notification.element);
        this.notifications.push(notification);

        // 动画显示
        requestAnimationFrame(() => {
            notification.element.classList.add('show');
        });

        // 自动隐藏
        if (duration > 0) {
            notification.timer = setTimeout(() => {
                this.hideNotification(notification);
            }, duration);
        }

        return notification;
    }

    /**
     * 创建通知元素
     */
    createNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: var(--spacing-md);
            box-shadow: var(--shadow-lg);
            transform: translateX(100%);
            transition: all 0.3s ease;
            opacity: 0;
            cursor: pointer;
        `;

        // 根据类型设置颜色
        const colors = {
            success: 'var(--success-color)',
            error: 'var(--danger-color)',
            warning: 'var(--warning-color)',
            info: 'var(--info-color)'
        };

        notification.style.borderLeftColor = colors[type] || colors.info;

        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${this.getNotificationIcon(type)}</div>
                <div class="notification-message">${message}</div>
                <button class="notification-close" aria-label="关闭通知">&times;</button>
            </div>
        `;

        // 显示样式
        notification.querySelector('.show').style.cssText = `
            transform: translateX(0);
            opacity: 1;
        `;

        const notificationObj = {
            element: notification,
            type: type,
            message: message,
            timer: null
        };

        // 绑定事件
        notification.addEventListener('click', () => {
            this.hideNotification(notificationObj);
        });

        return notificationObj;
    }

    /**
     * 获取通知图标
     */
    getNotificationIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }

    /**
     * 隐藏通知
     */
    hideNotification(notification) {
        if (notification.timer) {
            clearTimeout(notification.timer);
        }

        notification.element.style.transform = 'translateX(100%)';
        notification.element.style.opacity = '0';

        setTimeout(() => {
            notification.element.remove();
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        }, 300);
    }

    /**
     * 设置进度指示器
     */
    setupProgressIndicators() {
        // 全局加载指示器
        this.createGlobalLoader();
        
        // 页面加载进度条
        this.createPageProgressBar();
    }

    /**
     * 创建全局加载器
     */
    createGlobalLoader() {
        const loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--bg-overlay);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;

        loader.innerHTML = `
            <div class="loader-content">
                <div class="spinner"></div>
                <div class="loader-text">加载中...</div>
            </div>
        `;

        document.body.appendChild(loader);
    }

    /**
     * 创建页面进度条
     */
    createPageProgressBar() {
        const progressBar = document.createElement('div');
        progressBar.id = 'page-progress';
        progressBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 0%;
            height: 3px;
            background: var(--primary-color);
            z-index: 10000;
            transition: width 0.3s ease;
        `;

        document.body.appendChild(progressBar);

        // 监听页面加载
        window.addEventListener('load', () => {
            this.updatePageProgress(100);
            setTimeout(() => {
                progressBar.style.opacity = '0';
            }, 500);
        });
    }

    /**
     * 更新页面进度
     */
    updatePageProgress(progress) {
        const progressBar = document.getElementById('page-progress');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    }

    /**
     * 显示加载状态
     */
    showLoading(key = 'default', message = '加载中...') {
        this.loadingStates.set(key, true);
        
        const loader = document.getElementById('global-loader');
        const loaderText = loader.querySelector('.loader-text');
        
        if (loaderText) {
            loaderText.textContent = message;
        }
        
        loader.style.display = 'flex';
    }

    /**
     * 隐藏加载状态
     */
    hideLoading(key = 'default') {
        this.loadingStates.delete(key);
        
        // 如果没有其他加载状态，隐藏加载器
        if (this.loadingStates.size === 0) {
            const loader = document.getElementById('global-loader');
            loader.style.display = 'none';
        }
    }

    /**
     * 显示模态框
     */
    showModal(title, content, options = {}) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--bg-overlay);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        modal.innerHTML = `
            <div class="modal-content" style="
                background: var(--bg-card);
                border-radius: var(--radius-xl);
                padding: var(--spacing-lg);
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: var(--shadow-lg);
            ">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" aria-label="关闭">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${options.showFooter ? '<div class="modal-footer"></div>' : ''}
            </div>
        `;

        // 绑定关闭事件
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        document.body.appendChild(modal);
        return modal;
    }

    /**
     * 绑定事件监听器
     */
    bindEventListeners() {
        // 窗口大小变化
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // 网络状态变化
        window.addEventListener('online', () => {
            this.showNotification('网络连接已恢复', 'success');
        });

        window.addEventListener('offline', () => {
            this.showNotification('网络连接已断开', 'warning');
        });

        // 页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handlePageHidden();
            } else {
                this.handlePageVisible();
            }
        });
    }

    /**
     * 处理窗口大小变化
     */
    handleResize() {
        // 更新移动端菜单状态
        if (window.innerWidth > 768) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.remove('mobile-open');
            }
        }
    }

    /**
     * 页面隐藏时的处理
     */
    handlePageHidden() {
        // 暂停动画和定时器
        document.body.classList.add('page-hidden');
    }

    /**
     * 页面可见时的处理
     */
    handlePageVisible() {
        // 恢复动画和定时器
        document.body.classList.remove('page-hidden');
    }
}

// 创建全局用户体验增强器实例
const uxEnhancer = new UXEnhancer();

// 导出到全局
window.UXEnhancer = UXEnhancer;
window.uxEnhancer = uxEnhancer;

export { UXEnhancer, uxEnhancer }; 