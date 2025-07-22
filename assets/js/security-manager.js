/**
 * 安全管理模块
 * 包含输入验证、XSS防护、CSP策略、安全头部等功能
 */

class SecurityManager {
    constructor() {
        this.allowedDomains = [
            'ai-toolkit.example.com',
            'localhost',
            '127.0.0.1'
        ];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.allowedFileTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'text/plain', 'application/json'
        ];
        this.init();
    }

    init() {
        this.setupCSP();
        this.setupSecurityHeaders();
        this.bindSecurityEventListeners();
        this.validateEnvironment();
    }

    /**
     * 设置内容安全策略(CSP)
     */
    setupCSP() {
        const cspMeta = document.createElement('meta');
        cspMeta.httpEquiv = 'Content-Security-Policy';
        cspMeta.content = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // 开发环境，生产环境应移除unsafe-*
            "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
            "font-src 'self' fonts.gstatic.com",
            "img-src 'self' data: blob:",
            "connect-src 'self'",
            "media-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests"
        ].join('; ');
        
        document.head.appendChild(cspMeta);
    }

    /**
     * 设置安全头部
     */
    setupSecurityHeaders() {
        // X-Content-Type-Options
        const noSniff = document.createElement('meta');
        noSniff.httpEquiv = 'X-Content-Type-Options';
        noSniff.content = 'nosniff';
        document.head.appendChild(noSniff);

        // X-Frame-Options
        const frameOptions = document.createElement('meta');
        frameOptions.httpEquiv = 'X-Frame-Options';
        frameOptions.content = 'DENY';
        document.head.appendChild(frameOptions);

        // Referrer Policy
        const referrerPolicy = document.createElement('meta');
        referrerPolicy.name = 'referrer';
        referrerPolicy.content = 'strict-origin-when-cross-origin';
        document.head.appendChild(referrerPolicy);
    }

    /**
     * 输入验证和清理
     */
    validateInput(input, type = 'text') {
        if (typeof input !== 'string') {
            throw new Error('输入必须是字符串');
        }

        switch (type) {
            case 'text':
                return this.sanitizeText(input);
            case 'html':
                return this.sanitizeHTML(input);
            case 'url':
                return this.validateURL(input);
            case 'email':
                return this.validateEmail(input);
            case 'filename':
                return this.sanitizeFilename(input);
            case 'json':
                return this.validateJSON(input);
            default:
                return this.sanitizeText(input);
        }
    }

    /**
     * 文本清理 - 防止XSS
     */
    sanitizeText(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * HTML清理 - 白名单方式
     */
    sanitizeHTML(html) {
        const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'span'];
        const allowedAttributes = ['class', 'style'];
        
        const div = document.createElement('div');
        div.innerHTML = html;
        
        const walker = document.createTreeWalker(
            div,
            NodeFilter.SHOW_ELEMENT,
            null,
            false
        );

        const elementsToRemove = [];
        let node;

        while (node = walker.nextNode()) {
            if (!allowedTags.includes(node.tagName.toLowerCase())) {
                elementsToRemove.push(node);
            } else {
                // 清理属性
                Array.from(node.attributes).forEach(attr => {
                    if (!allowedAttributes.includes(attr.name.toLowerCase())) {
                        node.removeAttribute(attr.name);
                    }
                });
            }
        }

        elementsToRemove.forEach(el => el.remove());
        return div.innerHTML;
    }

    /**
     * URL验证
     */
    validateURL(url) {
        try {
            const urlObj = new URL(url);
            
            // 检查协议
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                throw new Error('不支持的协议');
            }

            // 检查域名白名单（可选）
            if (this.allowedDomains.length > 0) {
                const isAllowed = this.allowedDomains.some(domain => 
                    urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
                );
                if (!isAllowed) {
                    console.warn('URL域名不在白名单中:', urlObj.hostname);
                }
            }

            return urlObj.toString();
        } catch (error) {
            throw new Error('无效的URL格式');
        }
    }

    /**
     * 邮箱验证
     */
    validateEmail(email) {
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        
        if (!emailRegex.test(email)) {
            throw new Error('无效的邮箱格式');
        }

        // 检查长度
        if (email.length > 254) {
            throw new Error('邮箱地址过长');
        }

        return email.toLowerCase();
    }

    /**
     * 文件名清理
     */
    sanitizeFilename(filename) {
        // 移除危险字符
        const sanitized = filename
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
            .replace(/^\.+/, '')
            .substring(0, 255);

        if (sanitized.length === 0) {
            throw new Error('无效的文件名');
        }

        return sanitized;
    }

    /**
     * JSON验证
     */
    validateJSON(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            
            // 检查大小限制
            if (jsonString.length > 1024 * 1024) { // 1MB
                throw new Error('JSON数据过大');
            }

            return parsed;
        } catch (error) {
            throw new Error('无效的JSON格式');
        }
    }

    /**
     * 文件验证
     */
    validateFile(file) {
        // 检查文件大小
        if (file.size > this.maxFileSize) {
            throw new Error(`文件大小超过限制 (${this.maxFileSize / (1024 * 1024)}MB)`);
        }

        // 检查文件类型
        if (!this.allowedFileTypes.includes(file.type)) {
            throw new Error('不支持的文件类型');
        }

        // 检查文件名
        const sanitizedName = this.sanitizeFilename(file.name);
        
        return {
            name: sanitizedName,
            size: file.size,
            type: file.type,
            valid: true
        };
    }

    /**
     * 防止点击劫持
     */
    preventClickjacking() {
        if (window.self !== window.top) {
            // 页面被嵌入iframe中
            console.warn('检测到页面被嵌入iframe，可能存在点击劫持风险');
            
            // 可选：跳出iframe
            // window.top.location = window.self.location;
        }
    }

    /**
     * 生成安全的随机字符串
     */
    generateSecureRandom(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const array = new Uint8Array(length);
        
        if (window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(array);
        } else {
            // 降级方案
            for (let i = 0; i < length; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
        }

        return Array.from(array, byte => chars[byte % chars.length]).join('');
    }

    /**
     * 安全的本地存储
     */
    secureStorage = {
        set: (key, value, encrypt = false) => {
            try {
                let data = JSON.stringify(value);
                
                if (encrypt) {
                    // 简单的编码（生产环境应使用真正的加密）
                    data = btoa(data);
                }
                
                localStorage.setItem(key, data);
                return true;
            } catch (error) {
                console.error('存储失败:', error);
                return false;
            }
        },

        get: (key, decrypt = false) => {
            try {
                let data = localStorage.getItem(key);
                
                if (!data) return null;
                
                if (decrypt) {
                    data = atob(data);
                }
                
                return JSON.parse(data);
            } catch (error) {
                console.error('读取存储失败:', error);
                return null;
            }
        },

        remove: (key) => {
            localStorage.removeItem(key);
        },

        clear: () => {
            localStorage.clear();
        }
    };

    /**
     * 绑定安全事件监听器
     */
    bindSecurityEventListeners() {
        // 防止右键菜单（可选）
        document.addEventListener('contextmenu', (e) => {
            if (this.isProduction()) {
                e.preventDefault();
            }
        });

        // 防止F12开发者工具（可选）
        document.addEventListener('keydown', (e) => {
            if (this.isProduction() && e.key === 'F12') {
                e.preventDefault();
            }
        });

        // 监听粘贴事件
        document.addEventListener('paste', (e) => {
            this.handlePasteEvent(e);
        });

        // 监听文件拖拽
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleFileDrop(e);
        });
    }

    /**
     * 处理粘贴事件
     */
    handlePasteEvent(event) {
        const items = event.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                try {
                    this.validateFile(file);
                } catch (error) {
                    console.warn('粘贴的图片验证失败:', error.message);
                    event.preventDefault();
                }
            }
        }
    }

    /**
     * 处理文件拖拽
     */
    handleFileDrop(event) {
        const files = event.dataTransfer?.files;
        if (!files) return;

        for (const file of files) {
            try {
                this.validateFile(file);
            } catch (error) {
                console.warn('拖拽的文件验证失败:', error.message);
                return false;
            }
        }
        return true;
    }

    /**
     * 环境验证
     */
    validateEnvironment() {
        // 检查HTTPS
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            console.warn('建议使用HTTPS协议以确保安全性');
        }

        // 检查点击劫持
        this.preventClickjacking();

        // 检查控制台警告
        if (this.isProduction()) {
            console.warn('⚠️ 安全警告：请勿在此处粘贴或运行任何代码，这可能会危害您的账户安全！');
        }
    }

    /**
     * 检查是否为生产环境
     */
    isProduction() {
        return location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
    }

    /**
     * 记录安全事件
     */
    logSecurityEvent(type, details) {
        const event = {
            timestamp: new Date().toISOString(),
            type: type,
            details: details,
            userAgent: navigator.userAgent,
            url: location.href,
            ip: this.getClientIP()
        };

        console.warn('Security Event:', event);
        
        // 生产环境中应发送到安全监控服务
        if (this.isProduction()) {
            // this.sendToSecurityService(event);
        }
    }

    /**
     * 获取客户端IP（需要后端配合）
     */
    getClientIP() {
        // 这里只是示例，实际需要后端API支持
        return 'unknown';
    }

    /**
     * 安全状态检查
     */
    getSecurityStatus() {
        return {
            https: location.protocol === 'https:',
            csp: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
            xContentTypeOptions: !!document.querySelector('meta[http-equiv="X-Content-Type-Options"]'),
            xFrameOptions: !!document.querySelector('meta[http-equiv="X-Frame-Options"]'),
            referrerPolicy: !!document.querySelector('meta[name="referrer"]'),
            secureContext: window.isSecureContext,
            cryptoSupport: !!(window.crypto && window.crypto.getRandomValues)
        };
    }
}

// 创建全局安全管理器实例
const securityManager = new SecurityManager();

// 导出到全局
window.SecurityManager = SecurityManager;
window.securityManager = securityManager;

export { SecurityManager, securityManager }; 