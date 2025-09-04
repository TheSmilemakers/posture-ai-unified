# Cache Fix Instructions for Advanced Mode Error

## Problem Identified
The error "MediaPipe pose not properly initialized for advanced mode" is caused by the browser running **cached/old JavaScript code** from the service worker. The error message doesn't even exist in the current codebase!

## Solution Implemented

### 1. Service Worker Updates
- Updated cache version from `v1.0.6` to `v1.0.7`
- Added `skipWaiting()` for immediate activation
- Added `clients.claim()` to force all tabs to use new worker
- Implemented network-first strategy for JavaScript files

### 2. Cache Busting
- Added version query parameter to main.js import: `?v=1.0.7`
- Service worker now always fetches fresh JS files from network

### 3. Version Tracking
- Added `APP_VERSION` constant to detect old code
- Console logs app version on startup
- Auto-reload when new service worker is activated

## How to Test the Fix

### For Users:
1. **Clear Browser Cache Completely**:
   - Chrome/Edge: `Ctrl+Shift+Delete` → Select "Cached images and files" → Clear data
   - Safari: `Cmd+Option+E` → Empty Caches
   - Or use: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac) for hard refresh

2. **Check Version**:
   - Open browser console (F12)
   - Should see: `Posture AI App Version: 1.0.7`
   - If you see an older version, cache is still active

3. **Force Update (if needed)**:
   - Open DevTools → Application tab
   - Service Workers → Unregister all workers
   - Clear storage → Clear site data
   - Refresh page

### For Developers:
```bash
# Test locally
python3 -m http.server 3000

# Check console for:
# - "Posture AI App Version: 1.0.7"
# - "New service worker activated, reloading page..."
# - No "MediaPipe pose not properly initialized" errors
```

## What Changed

1. **sw.js**:
   - Cache name: `posture-ai-v1.0.7`
   - Added `self.skipWaiting()` in install event
   - Added `clients.claim()` in activate event
   - Network-first strategy for JS files

2. **index.html**:
   - Added version param: `main.js?v=1.0.7`

3. **main.js**:
   - Added version logging
   - Auto-reload on service worker update

## Prevention

For future updates:
1. Always increment cache version in sw.js
2. Update version query param in index.html
3. Test with cleared cache before deployment

## Verification

After clearing cache and reloading:
1. Upload all 3 images in advanced mode
2. Analysis should complete without errors
3. Skeletons should overlay correctly on each image
4. No initialization errors in console