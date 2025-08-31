# MediaPipe CSP Fix Documentation

## Problem
MediaPipe's WebAssembly module was failing to load due to Content Security Policy (CSP) restrictions:
- Error: `Refused to compile or instantiate WebAssembly module because 'unsafe-eval' is not allowed`
- This caused `UIState.pose.send()` and `UIState.pose.onResults()` to fail with TypeError

## Solution Implemented

### 1. Updated CSP to Allow WASM (MVP Solution)

**Added `'wasm-unsafe-eval'` to script-src directive in:**
- `index.html` (line 12)
- `vercel.json` (line 27)

**Before:**
```
script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline';
```

**After:**
```
script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline' 'wasm-unsafe-eval';
```

### 2. Added Robust Error Handling

**Updated `ui-controller.js`** to check if MediaPipe is properly initialized before using:
- Lines 807-814: Check before `pose.onResults()` in standard mode
- Lines 832-837: Check before `pose.send()` 
- Lines 1046-1054: Check before `pose.onResults()` in advanced mode
- Lines 1057-1063: Check before `pose.send()` in advanced mode

**Updated `mediapipe-init.js`** (line 253-254) with better error messaging

## Security Considerations

### Why 'wasm-unsafe-eval' is Safer than 'unsafe-eval'
- **'wasm-unsafe-eval'**: Only allows WebAssembly compilation, not string-to-code execution
- **'unsafe-eval'**: Allows all dynamic code evaluation (much more dangerous)

### Risk Assessment for MVP
- **Low Risk**: MediaPipe from jsdelivr CDN is a trusted source
- **Contained**: Only affects WASM compilation, not general JavaScript execution
- **Temporary**: Clearly marked as MVP-only solution with TODO comments

## Production Migration Plan

For production deployment:

1. **Download MediaPipe WASM files locally:**
   ```bash
   # Download these files from CDN:
   - pose_landmark_lite.tflite
   - pose_web.binarypb
   - pose_solution_packed_assets.data
   - pose_solution_wasm_bin.wasm
   ```

2. **Host files in `/assets/mediapipe/`**

3. **Update MediaPipe initialization:**
   ```javascript
   const pose = new Pose({
       locateFile: (file) => {
           return `/assets/mediapipe/${file}`;
       }
   });
   ```

4. **Remove 'wasm-unsafe-eval' from CSP**

## Testing

1. Clear browser cache
2. Open browser console
3. Load the app and test all three modes
4. Verify no CSP errors in console
5. Confirm pose detection works properly

## References
- [MDN: CSP script-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src)
- [W3C: wasm-unsafe-eval](https://w3c.github.io/webappsec-csp/#should-block-wasm-code-compilation)