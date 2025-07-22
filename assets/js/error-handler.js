/**
 * 错误处理和监控模块
 * 包含全局错误捕获、用户友好的错误提示、错误上报、性能监控等功能
 */

class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 100;
        this.reportingEnabled = true;
        this.debugMode = false;
        this.errorCounts = new Map();
        this.init();
    }

    init() {
        this.setupGlobalErrorHandling();
        this.setupUnhandledRejectionHandling();
        this.setupPerformanceMonitoring();
        this.setupNetworkErrorHandling();
        this.checkDebugMode();
    }

    /**
     * 设置全局错误处理
     */
    setupGlobalErrorHandling() {
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'javascript',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                stack: event.error?.stack,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent
            });
        });
    }

    /**
     * 设置未处理的Promise拒绝处理
     */
    setupUnhandledRejectionHandling() {
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'promise',
                message: event.reason?.message || 'Unhandled Promise Rejection',
                reason: event.reason,
                stack: event.reason?.stack,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent
            });
        });
    }

    /**
     * 设置性能监控
     */
    setupPerformanceMonitoring() {
        // 监控长任务
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > 50) { // 长任务阈值50ms
                            this.reportPerformanceIssue('long-task', {
                                duration: entry.duration,
                                startTime: entry.startTime,
                                name: entry.name
                            });
                        }
                    }
                });
                observer.observe({ entryTypes: ['longtask'] });
            } catch (e) {
                // PerformanceObserver不支持longtask
            }

            // 监控导航性能
            try {
                const navObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.reportPerformanceMetrics(entry);
                    }
                });
                navObserver.observe({ entryTypes: ['navigation'] });
            } catch (e) {
                // 降级方案
                window.addEventListener('load', () => {
                    setTimeout(() => {
                        const perfData = performance.getEntriesByType('navigation')[0];
                        if (perfData) {
                            this.reportPerformanceMetrics(perfData);
                        }
                    }, 0);
                });
            }
        }

        // 监控内存使用
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                const usage = memory.usedJSHeapSize / memory.totalJSHeapSize;
                
                if (usage > 0.9) {
                    this.reportPerformanceIssue('high-memory', {
                        usage: usage,
                        used: memory.usedJSHeapSize,
                        total: memory.totalJSHeapSize,
                        limit: memory.jsHeapSizeLimit
                    });
                }
            }, 30000); // 每30秒检查一次
        }
    }

    /**
     * 设置网络错误处理
     */
    setupNetworkErrorHandling() {
        // 拦截fetch请求
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);
                
                if (!response.ok) {
                    this.handleNetworkError({
                        type: 'fetch',
                        url: args[0],
                        status: response.status,
                        statusText: response.statusText,
                        method: args[1]?.method || 'GET'
                    });
                }
                
                return response;
            } catch (error) {
                this.handleNetworkError({
                    type: 'fetch',
                    url: args[0],
                    error: error.message,
                    method: args[1]?.method || 'GET'
                });
                throw error;
            }
        };

        // 拦截XMLHttpRequest
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(...args) {
            this.addEventListener('error', () => {
                window.errorHandler?.handleNetworkError({
                    type: 'xhr',
                    url: args[1],
                    method: args[0],
                    status: this.status,
                    statusText: this.statusText
                });
            });
            
            return originalOpen.apply(this, args);
        };
    }

    /**
     * 检查调试模式
     */
    checkDebugMode() {
        this.debugMode = localStorage.getItem('debug') === 'true' || 
                        location.search.includes('debug=true') ||
                        location.hostname === 'localhost';
    }

    /**
     * 处理错误
     */
    handleError(errorInfo) {
        // 增加错误计数
        const errorKey = `${errorInfo.type}:${errorInfo.message}`;
        const count = this.errorCounts.get(errorKey) || 0;
        this.errorCounts.set(errorKey, count + 1);

        // 防止重复错误过多
        if (count > 5) {
            return;
        }

        // 存储错误
        this.storeError(errorInfo);

        // 显示用户友好的错误提示
        this.showUserError(errorInfo);

        // 上报错误（如果启用）
        if (this.reportingEnabled) {
            this.reportError(errorInfo);
        }

        // 调试模式下输出详细信息
        if (this.debugMode) {
            console.error('Error Details:', errorInfo);
        }
    }

    /**
     * 处理网络错误
     */
    handleNetworkError(networkError) {
        const errorInfo = {
            type: 'network',
            ...networkError,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        this.handleError(errorInfo);
    }

    /**
     * 存储错误信息
     */
    storeError(errorInfo) {
        this.errors.push(errorInfo);

        // 限制错误数量
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        // 存储到本地存储（用于调试）
        if (this.debugMode) {
            try {
                const storedErrors = JSON.parse(localStorage.getItem('debug_errors') || '[]');
                storedErrors.push(errorInfo);
                
                // 只保留最近50个错误
                if (storedErrors.length > 50) {
                    storedErrors.shift();
                }
                
                localStorage.setItem('debug_errors', JSON.stringify(storedErrors));
            } catch (e) {
                // 忽略存储错误
            }
        }
    }

    /**
     * 显示用户友好的错误提示
     */
    showUserError(errorInfo) {
        const userMessage = this.getUserFriendlyMessage(errorInfo);
        
        // 使用UX增强器显示通知
        if (window.uxEnhancer) {
            window.uxEnhancer.showNotification(userMessage, 'error', 5000);
        } else {
            // 降级方案
            this.showBasicErrorNotification(userMessage);
        }
    }

    /**
     * 获取用户友好的错误消息
     */
    getUserFriendlyMessage(errorInfo) {
        const errorMessages = {
            network: {
                404: '请求的资源未找到',
                500: '服务器内部错误，请稍后重试',
                403: '访问被拒绝，请检查权限',
                default: '网络请求失败，请检查网络连接'
            },
            javascript: {
                'Script error': '脚本加载失败，请刷新页面重试',
                'Network Error': '网络连接异常',
                'TypeError': '数据处理出现问题',
                default: '页面运行出现异常，请刷新页面重试'
            },
            promise: {
                default: '操作执行失败，请重试'
            }
        };

        const typeMessages = errorMessages[errorInfo.type];
        if (!typeMessages) {
            return '系统出现异常，请刷新页面重试';
        }

        // 根据状态码或错误消息匹配
        if (errorInfo.status && typeMessages[errorInfo.status]) {
            return typeMessages[errorInfo.status];
        }

        // 根据错误消息关键词匹配
        for (const [key, message] of Object.entries(typeMessages)) {
            if (key !== 'default' && errorInfo.message?.includes(key)) {
                return message;
            }
        }

        return typeMessages.default;
    }

    /**
     * 基础错误通知
     */
    showBasicErrorNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fee;
            border: 1px solid #fcc;
            color: #c33;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            z-index: 10000;
            max-width: 400px;
            font-size: 14px;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    /**
     * 上报错误
     */
    reportError(errorInfo) {
        // 这里应该发送到错误监控服务
        // 例如：Sentry, LogRocket, 或自建的错误收集服务
        
        if (this.debugMode) {
            console.log('Would report error:', errorInfo);
            return;
        }

        // 示例：发送到错误收集服务
        try {
            // fetch('/api/errors', {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //     },
            //     body: JSON.stringify(errorInfo)
            // }).catch(() => {
            //     // 忽略上报失败
            // });
        } catch (e) {
            // 忽略上报错误
        }
    }

    /**
     * 上报性能问题
     */
    reportPerformanceIssue(type, data) {
        const perfIssue = {
            type: 'performance',
            subtype: type,
            data: data,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        if (this.debugMode) {
            console.warn('Performance Issue:', perfIssue);
        }

        // 上报性能问题
        if (this.reportingEnabled) {
            // this.reportError(perfIssue);
        }
    }

    /**
     * 上报性能指标
     */
    reportPerformanceMetrics(perfData) {
        const metrics = {
            // 首次内容绘制
            fcp: perfData.responseStart - perfData.fetchStart,
            // DOM内容加载完成
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
            // 页面完全加载
            loadComplete: perfData.loadEventEnd - perfData.fetchStart,
            // DNS查询时间
            dnsLookup: perfData.domainLookupEnd - perfData.domainLookupStart,
            // TCP连接时间
            tcpConnect: perfData.connectEnd - perfData.connectStart,
            // 请求响应时间
            request: perfData.responseEnd - perfData.requestStart,
            // DOM解析时间
            domParsing: perfData.domInteractive - perfData.responseEnd
        };

        if (this.debugMode) {
            console.log('Performance Metrics:', metrics);
        }

        // 检查性能阈值
        if (metrics.loadComplete > 5000) {
            this.reportPerformanceIssue('slow-load', {
                loadTime: metrics.loadComplete,
                metrics: metrics
            });
        }
    }

    /**
     * 手动报告错误
     */
    reportManualError(message, context = {}) {
        const errorInfo = {
            type: 'manual',
            message: message,
            context: context,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            stack: new Error().stack
        };

        this.handleError(errorInfo);
    }

    /**
     * 获取错误统计
     */
    getErrorStats() {
        return {
            totalErrors: this.errors.length,
            errorsByType: this.groupErrorsByType(),
            errorCounts: Object.fromEntries(this.errorCounts),
            recentErrors: this.errors.slice(-10)
        };
    }

    /**
     * 按类型分组错误
     */
    groupErrorsByType() {
        const grouped = {};
        this.errors.forEach(error => {
            grouped[error.type] = (grouped[error.type] || 0) + 1;
        });
        return grouped;
    }

    /**
     * 清除错误记录
     */
    clearErrors() {
        this.errors = [];
        this.errorCounts.clear();
        
        if (this.debugMode) {
            localStorage.removeItem('debug_errors');
        }
    }

    /**
     * 设置错误上报状态
     */
    setReporting(enabled) {
        this.reportingEnabled = enabled;
    }

    /**
     * 获取调试信息
     */
    getDebugInfo() {
        return {
            errors: this.errors,
            errorCounts: Object.fromEntries(this.errorCounts),
            debugMode: this.debugMode,
            reportingEnabled: this.reportingEnabled,
            performance: this.getPerformanceInfo(),
            browser: this.getBrowserInfo()
        };
    }

    /**
     * 获取性能信息
     */
    getPerformanceInfo() {
        const perfData = performance.getEntriesByType('navigation')[0];
        if (!perfData) return null;

        return {
            loadTime: perfData.loadEventEnd - perfData.fetchStart,
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
            firstByte: perfData.responseStart - perfData.fetchStart,
            memory: performance.memory ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            } : null
        };
    }

    /**
     * 获取浏览器信息
     */
    getBrowserInfo() {
        return {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
    }
}

// 创建全局错误处理器实例
const errorHandler = new ErrorHandler();

// 导出到全局
window.ErrorHandler = ErrorHandler;
window.errorHandler = errorHandler;

// 提供便捷的错误报告函数
window.reportError = (message, context) => {
    errorHandler.reportManualError(message, context);
};

export { ErrorHandler, errorHandler }; 