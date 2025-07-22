/**
 * 性能优化模块
 * 包含懒加载、防抖节流、图片优化、内存管理等功能
 */

class PerformanceOptimizer {
    constructor() {
        this.intersectionObserver = null;
        this.imageCache = new Map();
        this.debounceTimers = new Map();
        this.throttleTimers = new Map();
        this.init();
    }

    init() {
        this.setupIntersectionObserver();
        this.setupImageOptimization();
        this.setupMemoryManagement();
        this.preloadCriticalResources();
    }

    /**
     * 设置Intersection Observer用于懒加载
     */
    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            this.loadLazyElement(entry.target);
                            this.intersectionObserver.unobserve(entry.target);
                        }
                    });
                },
                {
                    rootMargin: '50px 0px',
                    threshold: 0.1
                }
            );
        }
    }

    /**
     * 懒加载工具卡片
     */
    lazyLoadToolCards() {
        const toolCards = document.querySelectorAll('.tools-item[data-lazy]');
        toolCards.forEach(card => {
            if (this.intersectionObserver) {
                this.intersectionObserver.observe(card);
            } else {
                // 降级方案
                this.loadLazyElement(card);
            }
        });
    }

    /**
     * 加载懒加载元素
     */
    loadLazyElement(element) {
        if (element.dataset.src) {
            element.src = element.dataset.src;
            element.removeAttribute('data-src');
        }
        
        if (element.dataset.lazy) {
            element.classList.add('fade-in');
            element.removeAttribute('data-lazy');
        }
    }

    /**
     * 增强防抖函数 - 支持立即执行和取消
     */
    debounce(func, wait, key, immediate = false) {
        return (...args) => {
            const callNow = immediate && !this.debounceTimers.has(key);
            
            if (this.debounceTimers.has(key)) {
                clearTimeout(this.debounceTimers.get(key));
            }
            
            this.debounceTimers.set(key, setTimeout(() => {
                this.debounceTimers.delete(key);
                if (!immediate) func.apply(this, args);
            }, wait));
            
            if (callNow) func.apply(this, args);
        };
    }

    /**
     * 增强节流函数 - 支持尾调用
     */
    throttle(func, limit, key, trailing = true) {
        return (...args) => {
            if (!this.throttleTimers.has(key)) {
                func.apply(this, args);
                this.throttleTimers.set(key, setTimeout(() => {
                    this.throttleTimers.delete(key);
                    if (trailing) func.apply(this, args);
                }, limit));
            }
        };
    }

    /**
     * 图片优化和缓存
     */
    setupImageOptimization() {
        // 预加载关键图片
        this.preloadImages([
            '/assets/images/logo.webp',
            '/assets/images/hero-bg.webp'
        ]);
        
        // 图片格式检测和降级
        this.setupImageFallback();
    }

    /**
     * 预加载图片
     */
    preloadImages(urls) {
        urls.forEach(url => {
            if (!this.imageCache.has(url)) {
                const img = new Image();
                img.onload = () => this.imageCache.set(url, img);
                img.onerror = () => console.warn(`Failed to preload image: ${url}`);
                img.src = url;
            }
        });
    }

    /**
     * 图片格式降级
     */
    setupImageFallback() {
        // WebP支持检测
        const webpSupported = this.checkWebPSupport();
        
        if (!webpSupported) {
            // 替换所有WebP图片为JPEG/PNG
            document.querySelectorAll('img[src*=".webp"]').forEach(img => {
                const fallbackSrc = img.src.replace('.webp', '.jpg');
                img.src = fallbackSrc;
            });
        }
    }

    /**
     * 检测WebP支持
     */
    checkWebPSupport() {
        return new Promise(resolve => {
            const webP = new Image();
            webP.onload = webP.onerror = () => {
                resolve(webP.height === 2);
            };
            webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
        });
    }

    /**
     * 内存管理
     */
    setupMemoryManagement() {
        // 定期清理缓存
        setInterval(() => {
            this.cleanupCache();
        }, 300000); // 5分钟清理一次

        // 页面卸载时清理
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // 内存压力监控
        if ('memory' in performance) {
            this.monitorMemoryUsage();
        }
    }

    /**
     * 清理缓存
     */
    cleanupCache() {
        // 清理超过1小时的图片缓存
        const oneHour = 60 * 60 * 1000;
        const now = Date.now();
        
        this.imageCache.forEach((value, key) => {
            if (value.timestamp && now - value.timestamp > oneHour) {
                this.imageCache.delete(key);
            }
        });

        // 清理未使用的定时器
        this.debounceTimers.clear();
        this.throttleTimers.clear();
    }

    /**
     * 内存使用监控
     */
    monitorMemoryUsage() {
        const checkMemory = () => {
            const memory = performance.memory;
            const usage = memory.usedJSHeapSize / memory.totalJSHeapSize;
            
            if (usage > 0.8) {
                console.warn('High memory usage detected, cleaning up...');
                this.cleanup();
                // 强制垃圾回收（如果可用）
                if (window.gc) {
                    window.gc();
                }
            }
        };

        setInterval(checkMemory, 60000); // 每分钟检查一次
    }

    /**
     * 预加载关键资源
     */
    preloadCriticalResources() {
        // 预加载关键CSS
        this.preloadResource('/assets/css/build.css', 'style');
        
        // 预加载关键数据
        this.preloadResource('/data/tools.json', 'fetch');
        
        // DNS预解析
        this.preconnectDomains([
            'fonts.googleapis.com',
            'fonts.gstatic.com'
        ]);
    }

    /**
     * 预加载资源
     */
    preloadResource(href, as) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = href;
        link.as = as;
        document.head.appendChild(link);
    }

    /**
     * DNS预连接
     */
    preconnectDomains(domains) {
        domains.forEach(domain => {
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = `https://${domain}`;
            document.head.appendChild(link);
        });
    }

    /**
     * 虚拟滚动实现（用于大量工具列表）
     */
    createVirtualScroll(container, items, itemHeight, renderItem) {
        const scrollTop = container.scrollTop;
        const containerHeight = container.clientHeight;
        const totalHeight = items.length * itemHeight;
        
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = Math.min(
            startIndex + Math.ceil(containerHeight / itemHeight) + 1,
            items.length
        );

        // 清空容器
        container.innerHTML = '';
        
        // 创建占位空间
        const spacerBefore = document.createElement('div');
        spacerBefore.style.height = `${startIndex * itemHeight}px`;
        container.appendChild(spacerBefore);

        // 渲染可见项
        for (let i = startIndex; i < endIndex; i++) {
            const element = renderItem(items[i], i);
            container.appendChild(element);
        }

        // 创建后续占位空间
        const spacerAfter = document.createElement('div');
        spacerAfter.style.height = `${(items.length - endIndex) * itemHeight}px`;
        container.appendChild(spacerAfter);
    }

    /**
     * 批量DOM操作优化
     */
    batchDOMUpdates(updates) {
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                const fragment = document.createDocumentFragment();
                updates.forEach(update => update(fragment));
                resolve(fragment);
            });
        });
    }

    /**
     * 全局清理
     */
    cleanup() {
        // 清理观察器
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }

        // 清理缓存
        this.imageCache.clear();
        this.debounceTimers.clear();
        this.throttleTimers.clear();
    }

    /**
     * 获取性能指标
     */
    getPerformanceMetrics() {
        return {
            // 首次内容绘制
            fcp: this.getMetric('first-contentful-paint'),
            // 最大内容绘制
            lcp: this.getMetric('largest-contentful-paint'),
            // 首次输入延迟
            fid: this.getMetric('first-input-delay'),
            // 累积布局偏移
            cls: this.getMetric('cumulative-layout-shift'),
            // 内存使用
            memory: performance.memory ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            } : null
        };
    }

    /**
     * 获取特定性能指标
     */
    getMetric(name) {
        const entries = performance.getEntriesByName(name);
        return entries.length > 0 ? entries[0].value : null;
    }
}

// 创建全局性能优化器实例
const performanceOptimizer = new PerformanceOptimizer();

// 导出到全局
window.PerformanceOptimizer = PerformanceOptimizer;
window.performanceOptimizer = performanceOptimizer;

export { PerformanceOptimizer, performanceOptimizer }; 