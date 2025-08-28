/**
 * Workbox Configuration for PWA Generation
 * Generates optimized service worker with advanced caching strategies
 */

module.exports = {
  // Output configuration
  swDest: 'sw-generated.js',
  
  // Files to precache
  globDirectory: './',
  globPatterns: [
    'index.html',
    'manifest.json',
    'assets/css/**/*.{css,min.css}',
    'assets/js/**/*.{js,min.js}',
    'assets/icons/*.png'
  ],
  
  // Skip waiting and claim clients
  skipWaiting: true,
  clientsClaim: true,
  
  // Runtime caching strategies
  runtimeCaching: [
    // CDN resources - cache first
    {
      urlPattern: /^https:\/\/cdn\.jsdelivr\.net\//,
      handler: 'CacheFirst',
      options: {
        cacheName: 'cdn-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
        }
      }
    },
    // Images - cache first with network fallback
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    },
    // MediaPipe models - cache first (large files)
    {
      urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\//,
      handler: 'CacheFirst',
      options: {
        cacheName: 'mediapipe-cache',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        },
        cacheableResponse: {
          statuses: [0, 200]
        }
      }
    }
  ],
  
  // Manifest transformations
  manifestTransforms: [
    (manifestEntries) => {
      const manifest = manifestEntries.map(entry => {
        // Add revision hashes for better cache busting
        const url = new URL(entry.url, self.location);
        url.searchParams.set('v', '1.0.0');
        entry.url = url.href;
        return entry;
      });
      return {manifest};
    }
  ],
  
  // Ignore query strings for caching
  ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
  
  // Clean up old caches
  cleanupOutdatedCaches: true,
  
  // Navigation preload (faster page loads)
  navigationPreload: true
};