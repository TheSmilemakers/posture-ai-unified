/**
 * Service Worker for Posture AI PWA
 * Enables offline functionality and caching
 */

const CACHE_NAME = 'posture-ai-v1.0.7'; // Fixed advanced mode initialization and skeleton overlay
const urlsToCache = [
    './',
    './index.html',
    './assets/css/styles.css',
    './assets/js/main.js',
    './assets/js/mediapipe-init.js',
    './assets/js/analysis.js',
    './assets/js/ui-controller.js',
    './assets/js/utils.js',
    './manifest.json',
    './assets/img/icon-192.png',
    './assets/img/icon-512.png',
    './assets/css/Sansation/Sansation-Regular.ttf',
    './assets/css/Sansation/Sansation-Light.ttf',
    './assets/css/Sansation/Sansation-Bold.ttf',
    './assets/css/Sansation/Sansation-Italic.ttf',
    'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js',
    'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
    'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
    // Force immediate activation of new service worker
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    // Claim all clients immediately
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Force all tabs to use new service worker immediately
            return clients.claim();
        })
    );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', event => {
    // For JavaScript files, always fetch fresh to avoid stale code
    const isJavaScript = event.request.url.includes('.js');
    const isLocalAsset = event.request.url.includes('/assets/js/');
    
    if (isJavaScript && isLocalAsset) {
        // Network-first strategy for JS files
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Update cache with fresh version
                    if (response && response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Fall back to cache if network fails
                    return caches.match(event.request);
                })
        );
        return;
    }
    
    // Cache-first strategy for other resources
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Clone the request
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(response => {
                    // Check if valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone the response
                    const responseToCache = response.clone();

                    // Add to cache
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                });
            })
            .catch(() => {
                // Offline fallback
                return new Response('Offline - Please check your internet connection', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: new Headers({
                        'Content-Type': 'text/plain'
                    })
                });
            })
    );
});