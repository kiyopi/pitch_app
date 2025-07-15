/**
 * Service Worker - モバイルキャッシュ制御
 * バージョン: v1.2.2-restart-optimization
 */

const CACHE_NAME = 'pitch-training-v1.2.2-restart-optimization';
const CACHE_VERSION = '1.2.2';

// キャッシュ対象ファイル
const CACHE_FILES = [
    '/',
    '/index.html',
    '/full-scale-training.html',
    '/about.html',
    '/full-scale-training.js',
    '/VERSION.json'
];

// Service Worker インストール
self.addEventListener('install', event => {
    console.log('🔧 Service Worker インストール中...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 キャッシュファイル準備中...');
                return cache.addAll(CACHE_FILES);
            })
            .then(() => {
                console.log('✅ Service Worker インストール完了');
                return self.skipWaiting(); // 即座にアクティブ化
            })
            .catch(error => {
                console.error('❌ Service Worker インストール失敗:', error);
            })
    );
});

// Service Worker アクティベーション
self.addEventListener('activate', event => {
    console.log('⚡ Service Worker アクティベーション中...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        // 古いバージョンのキャッシュを削除
                        if (cacheName !== CACHE_NAME) {
                            console.log(`🗑️ 古いキャッシュ削除: ${cacheName}`);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker アクティベーション完了');
                return self.clients.claim(); // 既存のクライアントを制御
            })
    );
});

// フェッチイベント（ネットワーク要求の処理）
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // モバイル専用のキャッシュ戦略
    if (isStaticResource(url.pathname)) {
        // 静的リソース: Cache First + Network Fallback
        event.respondWith(handleStaticResource(event.request));
    } else if (isAPIRequest(url.pathname)) {
        // API要求: Network First + Cache Fallback
        event.respondWith(handleAPIRequest(event.request));
    } else {
        // その他: ネットワーク優先
        event.respondWith(fetch(event.request));
    }
});

// 静的リソース判定
function isStaticResource(pathname) {
    const staticExtensions = ['.html', '.js', '.css', '.json'];
    return staticExtensions.some(ext => pathname.endsWith(ext)) || 
           pathname === '/' || 
           pathname === '/index.html';
}

// API要求判定
function isAPIRequest(pathname) {
    return pathname.includes('/api/') || 
           pathname.includes('esm.sh');
}

// 静的リソースハンドラー
async function handleStaticResource(request) {
    const url = new URL(request.url);
    
    try {
        // モバイルの場合はキャッシュバスティングパラメータをチェック
        const isMobile = request.headers.get('User-Agent')?.includes('Mobile');
        
        if (isMobile && (url.searchParams.has('v') || url.searchParams.has('t'))) {
            // バージョンパラメータがある場合は常にネットワークから取得
            console.log(`🔄 強制更新: ${url.pathname}`);
            const response = await fetch(request);
            
            if (response.ok) {
                // 新しいレスポンスをキャッシュに保存
                const cache = await caches.open(CACHE_NAME);
                const clonedRequest = removeVersionParams(request);
                await cache.put(clonedRequest, response.clone());
            }
            
            return response;
        }
        
        // 通常のキャッシュファースト戦略
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log(`📦 キャッシュから返却: ${url.pathname}`);
            return cachedResponse;
        }
        
        // キャッシュにない場合はネットワークから取得
        console.log(`🌐 ネットワークから取得: ${url.pathname}`);
        const response = await fetch(request);
        
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
        }
        
        return response;
        
    } catch (error) {
        console.error(`❌ リソース取得失敗: ${url.pathname}`, error);
        
        // ネットワークエラーの場合はキャッシュから返す
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // キャッシュもない場合はエラーレスポンス
        return new Response('リソースが利用できません', { 
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// API要求ハンドラー
async function handleAPIRequest(request) {
    try {
        // ネットワークファースト
        const response = await fetch(request);
        
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
        }
        
        return response;
        
    } catch (error) {
        console.warn(`⚠️ API要求失敗、キャッシュから返却: ${request.url}`);
        
        const cachedResponse = await caches.match(request);
        return cachedResponse || new Response('オフラインです', { 
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// URLからバージョンパラメータを除去
function removeVersionParams(request) {
    const url = new URL(request.url);
    url.searchParams.delete('v');
    url.searchParams.delete('t');
    
    return new Request(url.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        mode: request.mode,
        credentials: request.credentials,
        cache: request.cache,
        redirect: request.redirect,
        referrer: request.referrer
    });
}

// メッセージハンドラー（クライアントからの要求処理）
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        console.log('🗑️ キャッシュクリア要求受信');
        
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
        }).then(() => {
            console.log('✅ 全キャッシュクリア完了');
            event.ports[0].postMessage({ success: true });
        }).catch(error => {
            console.error('❌ キャッシュクリア失敗:', error);
            event.ports[0].postMessage({ success: false, error: error.message });
        });
    }
});