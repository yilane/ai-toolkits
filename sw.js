/**
 * Service Worker for AI工具集
 * 提供PWA功能、离线缓存、后台同步等
 */

const CACHE_NAME = 'ai-toolkit-v1.0.0';
const STATIC_CACHE = 'ai-toolkit-static-v1';
const DYNAMIC_CACHE = 'ai-toolkit-dynamic-v1';

// 需要缓存的静态资源
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/assets/css/build.css',
    '/assets/js/main.js',
    '/assets/js/utils.js',
    '/assets/js/performance-optimizer.js',
    '/assets/js/security-manager.js',
    '/assets/js/ux-enhancer.js',
    '/assets/js/error-handler.js',
    '/data/tools.json',
    '/manifest.json',
    // 添加工具页面
    '/tools/custom/word-counter/index.html',
    '/tools/custom/color-picker/index.html',
    '/tools/custom/qr-generator/index.html',
    '/tools/custom/json-formatter/index.html'
];

// 动态缓存的资源模式
const CACHE_PATTERNS = [
    /^https:\/\/fonts\.googleapis\.com\/.*/,
    /^https:\/\/fonts\.gstatic\.com\/.*/,
    /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
    /\/tools\/.*\.html$/,
    /\/tools\/.*\.css$/,
    /\/tools\/.*\.js$/
];

// 安装事件 - 缓存静态资源
self.addEventListener('install', event => {
    console.log('[SW] Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Static assets cached');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[SW] Failed to cache static assets:', error);
            })
    );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', event => {
    console.log('[SW] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Activated');
                return self.clients.claim();
            })
    );
});

// 拦截网络请求
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // 跳过非GET请求
    if (request.method !== 'GET') {
        return;
    }
    
    // 跳过chrome-extension请求
    if (url.protocol === 'chrome-extension:') {
        return;
    }
    
    event.respondWith(
        handleFetchRequest(request)
    );
});

/**
 * 处理网络请求
 */
async function handleFetchRequest(request) {
    const url = new URL(request.url);
    
    try {
        // 1. 静态资源 - 缓存优先
        if (STATIC_ASSETS.includes(url.pathname) || url.pathname === '/') {
            return await cacheFirst(request, STATIC_CACHE);
        }
        
        // 2. 工具数据 - 网络优先，缓存降级
        if (url.pathname === '/data/tools.json') {
            return await networkFirst(request, DYNAMIC_CACHE);
        }
        
        // 3. 工具页面和资源 - 缓存优先
        if (isToolResource(url.pathname)) {
            return await cacheFirst(request, DYNAMIC_CACHE);
        }
        
        // 4. 图片和字体 - 缓存优先
        if (shouldCache(request.url)) {
            return await cacheFirst(request, DYNAMIC_CACHE);
        }
        
        // 5. 其他请求 - 网络优先
        return await networkFirst(request, DYNAMIC_CACHE);
        
    } catch (error) {
        console.error('[SW] Fetch error:', error);
        return await handleFetchError(request);
    }
}

/**
 * 缓存优先策略
 */
async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        console.log('[SW] Cache hit:', request.url);
        
        // 后台更新缓存
        updateCacheInBackground(request, cache);
        
        return cachedResponse;
    }
    
    console.log('[SW] Cache miss, fetching:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
}

/**
 * 网络优先策略
 */
async function networkFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            console.log('[SW] Network success, caching:', request.url);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', request.url);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

/**
 * 后台更新缓存
 */
async function updateCacheInBackground(request, cache) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            await cache.put(request, networkResponse);
            console.log('[SW] Background cache updated:', request.url);
        }
    } catch (error) {
        console.log('[SW] Background update failed:', request.url);
    }
}

/**
 * 检查是否为工具资源
 */
function isToolResource(pathname) {
    return pathname.startsWith('/tools/') && 
           (pathname.endsWith('.html') || 
            pathname.endsWith('.css') || 
            pathname.endsWith('.js'));
}

/**
 * 检查是否应该缓存
 */
function shouldCache(url) {
    return CACHE_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * 处理请求失败
 */
async function handleFetchError(request) {
    const url = new URL(request.url);
    
    // HTML页面 - 返回离线页面
    if (request.headers.get('Accept')?.includes('text/html')) {
        const cache = await caches.open(STATIC_CACHE);
        const offlinePage = await cache.match('/offline.html');
        
        if (offlinePage) {
            return offlinePage;
        }
        
        // 降级到主页
        return await cache.match('/index.html') || 
               new Response('离线状态，请检查网络连接', {
                   status: 503,
                   statusText: 'Service Unavailable'
               });
    }
    
    // 图片 - 返回占位图
    if (request.destination === 'image') {
        return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="#f0f0f0"/><text x="100" y="75" text-anchor="middle" fill="#999">图片加载失败</text></svg>',
            {
                headers: {
                    'Content-Type': 'image/svg+xml'
                }
            }
        );
    }
    
    // JSON数据 - 返回空数据
    if (url.pathname.endsWith('.json')) {
        return new Response('{"error": "数据加载失败"}', {
            status: 503,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
    
    // 默认错误响应
    return new Response('网络错误', {
        status: 503,
        statusText: 'Service Unavailable'
    });
}

// 后台同步
self.addEventListener('sync', event => {
    console.log('[SW] Background sync:', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

/**
 * 执行后台同步
 */
async function doBackgroundSync() {
    try {
        // 同步用户数据、设置等
        console.log('[SW] Performing background sync...');
        
        // 这里可以添加具体的同步逻辑
        // 例如：上传离线时的用户操作、同步设置等
        
    } catch (error) {
        console.error('[SW] Background sync failed:', error);
    }
}

// 推送通知
self.addEventListener('push', event => {
    console.log('[SW] Push received');
    
    const options = {
        body: event.data ? event.data.text() : '您有新的通知',
        icon: '/assets/images/icon-192x192.png',
        badge: '/assets/images/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: '查看详情',
                icon: '/assets/images/checkmark.png'
            },
            {
                action: 'close',
                title: '关闭',
                icon: '/assets/images/xmark.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('AI工具集', options)
    );
});

// 通知点击
self.addEventListener('notificationclick', event => {
    console.log('[SW] Notification click');
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// 消息处理
self.addEventListener('message', event => {
    console.log('[SW] Message received:', event.data);
    
    if (event.data && event.data.type) {
        switch (event.data.type) {
            case 'SKIP_WAITING':
                self.skipWaiting();
                break;
                
            case 'GET_VERSION':
                event.ports[0].postMessage({
                    version: CACHE_NAME
                });
                break;
                
            case 'CLEAR_CACHE':
                clearAllCaches().then(() => {
                    event.ports[0].postMessage({
                        success: true
                    });
                });
                break;
                
            case 'CACHE_URLS':
                cacheUrls(event.data.urls).then(() => {
                    event.ports[0].postMessage({
                        success: true
                    });
                });
                break;
        }
    }
});

/**
 * 清除所有缓存
 */
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('[SW] All caches cleared');
}

/**
 * 缓存指定URL
 */
async function cacheUrls(urls) {
    const cache = await caches.open(DYNAMIC_CACHE);
    await cache.addAll(urls);
    console.log('[SW] URLs cached:', urls);
} 