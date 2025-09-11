# Code Refactoring Guide - Posture AI Unified
## Complete Diff Reference for Code Cleaning & Refactoring

Generated: January 2025  
Total Changes: 10 Priority Refactoring Items

---

## Table of Contents
1. [Critical Security Fixes](#1-critical-security-fixes)
2. [Extract Shared Constants](#2-extract-shared-constants)
3. [Remove Console Logs](#3-remove-console-logs)
4. [Refactor Large Functions](#4-refactor-large-functions)
5. [Add Event Listener Cleanup](#5-add-event-listener-cleanup)
6. [Fix Unused Imports](#6-fix-unused-imports)
7. [Standardize Naming Conventions](#7-standardize-naming-conventions)
8. [Consolidate CSS Variables](#8-consolidate-css-variables)
9. [Add Error Handling](#9-add-error-handling)
10. [Add JSDoc Documentation](#10-add-jsdoc-documentation)

---

## 1. Critical Security Fixes

### 1.1 Remove Hardcoded API Key
**File**: `assets/js/database-service.js`  
**Line**: 30

```diff
- const API_KEY = 'Bearer posture-api-2025'; // TODO: Load from environment
+ const API_KEY = process.env.POSTURE_API_KEY || 'Bearer posture-api-dev';
```

### 1.2 Remove Hardcoded Password
**File**: `assets/js/main.js`  
**Line**: 154

```diff
- const CORRECT_PASSWORD = 'posture2025'; // TODO: Replace with server-side authentication
+ // Password validation moved to server-side
+ const validatePassword = async (password) => {
+     const response = await fetch('/api/auth/validate', {
+         method: 'POST',
+         headers: { 'Content-Type': 'application/json' },
+         body: JSON.stringify({ password })
+     });
+     return response.ok;
+ };
```

### 1.3 Update CSP for Production
**File**: `index.html`  
**Line**: 11

```diff
- <meta http-equiv="Content-Security-Policy" content="default-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; media-src 'self' blob: data:; connect-src 'self' https://anxeptegnpfroajjzuqk.supabase.co https://supa-proxy.vercel.app http://localhost:* ws://localhost:*; object-src 'none'; frame-src 'none';">
+ <meta http-equiv="Content-Security-Policy" content="default-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; media-src 'self' blob: data:; connect-src 'self' https://anxeptegnpfroajjzuqk.supabase.co https://supa-proxy.vercel.app; object-src 'none'; frame-src 'none';">
```

---

## 2. Extract Shared Constants

### 2.1 Create Constants Module
**New File**: `assets/js/constants.js`

```javascript
/**
 * Shared constants for Posture AI application
 */

// Measurement units used across the application
export const MEASUREMENT_UNITS = {
    // Angles
    'head_tilt': 'degrees',
    'shoulder_level': 'mm',
    'hip_level': 'mm',
    'knee_angle': 'degrees',
    'forward_head': 'cm',
    'shoulder_protraction': 'cm',
    'kyphosis_angle': 'degrees',
    'lordosis_angle': 'degrees',
    'pelvic_tilt': 'degrees',
    'scoliosis_angle': 'degrees',
    'scapular_winging': 'degrees',
    'hip_rotation': 'degrees',
    'tibial_torsion': 'degrees'
};

// Application modes
export const APP_MODES = {
    QUICK: 'quick',
    CLINICAL: 'clinical',
    ADVANCED: 'advanced'
};

// Storage keys
export const STORAGE_KEYS = {
    PATIENT_DATA: 'pra_patientData',
    SESSION_DATA: 'pra_sessionData',
    AUTH_SESSION: 'pra_auth',
    UI_STATE: 'pra_uiState'
};

// API endpoints
export const API_ENDPOINTS = {
    BASE_URL: process.env.API_BASE_URL || '/api',
    PATIENTS: '/patients',
    ASSESSMENTS: '/assessments',
    MEASUREMENTS: '/measurements'
};

// Error messages
export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network connection error. Please check your internet connection.',
    AUTH_ERROR: 'Authentication failed. Please log in again.',
    VALIDATION_ERROR: 'Please check your input and try again.',
    MEDIAPIPE_ERROR: 'Camera initialization failed. Please ensure camera permissions are granted.',
    STORAGE_ERROR: 'Unable to save data locally. Please check browser storage permissions.'
};
```

### 2.2 Update ui-controller.js
**File**: `assets/js/ui-controller.js`  
**Lines**: 29-47

```diff
+ import { MEASUREMENT_UNITS, APP_MODES, STORAGE_KEYS, ERROR_MESSAGES } from './constants.js';
+ 
- // Measurement units for display
- const MEASUREMENT_UNITS = {
-     // Angles
-     'head_tilt': 'degrees',
-     'shoulder_level': 'mm',
-     'hip_level': 'mm',
-     'knee_angle': 'degrees',
-     'forward_head': 'cm',
-     'shoulder_protraction': 'cm',
-     'kyphosis_angle': 'degrees',
-     'lordosis_angle': 'degrees',
-     'pelvic_tilt': 'degrees',
-     'scoliosis_angle': 'degrees',
-     'scapular_winging': 'degrees',
-     'hip_rotation': 'degrees',
-     'tibial_torsion': 'degrees'
- };
```

### 2.3 Update database-service.js
**File**: `assets/js/database-service.js`  
**Lines**: 43-59

```diff
+ import { MEASUREMENT_UNITS, ERROR_MESSAGES } from './constants.js';
+ 
- // Duplicate from ui-controller.js - should be shared
- const MEASUREMENT_UNITS = {
-     'head_tilt': 'degrees',
-     'shoulder_level': 'mm',
-     'hip_level': 'mm',
-     'knee_angle': 'degrees',
-     'forward_head': 'cm',
-     'shoulder_protraction': 'cm',
-     'kyphosis_angle': 'degrees',
-     'lordosis_angle': 'degrees',
-     'pelvic_tilt': 'degrees',
-     'scoliosis_angle': 'degrees',
-     'scapular_winging': 'degrees',
-     'hip_rotation': 'degrees',
-     'tibial_torsion': 'degrees'
- };
```

---

## 3. Remove Console Logs

### 3.1 Remove Debug Logs from main.js
**File**: `assets/js/main.js`  
**Lines**: 13-14

```diff
- console.log('🚀 Posture AI Analysis System Starting...');
- console.log('📦 Version: 2.0.0-unified');
+ // Version info moved to about modal
```

### 3.2 Remove UI Debug Logs
**File**: `assets/js/ui-controller.js`  
**Multiple locations**

```diff
Line 126:
- console.log('🚀 Disclaimer button found, adding event listener...');

Line 132:
- console.log('✅ Disclaimer dismissed successfully');

Line 140:
- console.log('📱 Disclaimer button touched, dismissing modal...');

Line 148:
- console.log('⏰ Auto-dismissing disclaimer after timeout');
```

### 3.3 Remove Database Service Logs
**File**: `assets/js/database-service.js`  
**Line**: 22

```diff
- console.log('🌐 API Base URL:', API_BASE_URL);
+ // API configuration loaded
```

### 3.4 Remove Analysis Warnings
**File**: `assets/js/analysis.js`  
**Multiple locations**

```diff
Line 110:
- console.warn('No calibration data available. Results will be in pixels, not real-world units.');

Line 163:
- console.warn('Reference height not calibrated. Using default pixel-to-cm ratio.');

Line 180:
- console.log(`Using reference height: ${this.referenceHeight}cm`);

Line 229:
- console.warn('analyzeSideView: Insufficient landmarks detected');

Line 284:
- console.warn('analyzeBackView: Insufficient landmarks detected');
```

---

## 4. Refactor Large Functions

### 4.1 Refactor initializeUI Function
**File**: `assets/js/ui-controller.js`  
**Lines**: 89-171

```diff
- export function initializeUI() {
-     // [82 lines of mixed initialization code]
- }

+ /**
+  * Initialize all UI components and event handlers
+  */
+ export function initializeUI() {
+     initializeDateInputs();
+     initializeKeyboardShortcuts();
+     initializeTouchHandlers();
+     initializeAutoHideHeader();
+     initializeEventDelegation();
+     initializeDragAndDrop();
+     initializeFormValidation();
+     initializeDisclaimer();
+     initializeDatabase();
+     checkPreviousSession();
+ }
+ 
+ /**
+  * Set default dates for form inputs
+  */
+ function initializeDateInputs() {
+     const dobInput = document.getElementById('dob');
+     const assessmentDateInput = document.getElementById('assessmentDate');
+     if (dobInput && !dobInput.value) {
+         const thirtyYearsAgo = new Date();
+         thirtyYearsAgo.setFullYear(thirtyYearsAgo.getFullYear() - 30);
+         dobInput.value = thirtyYearsAgo.toISOString().split('T')[0];
+     }
+     if (assessmentDateInput && !assessmentDateInput.value) {
+         assessmentDateInput.value = new Date().toISOString().split('T')[0];
+     }
+ }
+ 
+ /**
+  * Setup global keyboard shortcuts
+  */
+ function initializeKeyboardShortcuts() {
+     document.addEventListener('keydown', (e) => {
+         if (e.key === 'Escape') {
+             const modal = document.querySelector('.modal.is-open');
+             if (modal) {
+                 modal.querySelector('[data-close-modal]')?.click();
+             }
+         }
+         if ((e.ctrlKey || e.metaKey) && e.key === 's') {
+             e.preventDefault();
+             const saveButton = document.querySelector('.save-button:not([disabled])');
+             if (saveButton) saveButton.click();
+         }
+     });
+ }
+ 
+ // ... continue with other extracted functions
```

### 4.2 Refactor Complex Event Handler
**File**: `assets/js/ui-controller.js`  
**Function**: handleGlobalClick

```diff
- function handleGlobalClick(e) {
-     // [Long function with many responsibilities]
- }

+ /**
+  * Global click event handler using event delegation
+  */
+ function handleGlobalClick(e) {
+     const handlers = {
+         '[data-mode]': handleModeSelection,
+         '[data-patient-option]': handlePatientOption,
+         '.tab-btn': handleTabSwitch,
+         '.capture-btn': handleCapture,
+         '.upload-area': handleUploadClick,
+         '.save-button': handleSave,
+         '.export-button': handleExport,
+         '.retry-button': handleRetry,
+         '[data-close-modal]': handleModalClose
+     };
+     
+     for (const [selector, handler] of Object.entries(handlers)) {
+         const target = e.target.closest(selector);
+         if (target) {
+             e.preventDefault();
+             handler(target, e);
+             break;
+         }
+     }
+ }
```

---

## 5. Add Event Listener Cleanup

### 5.1 Create Event Manager
**New code in**: `assets/js/ui-controller.js`

```diff
+ /**
+  * Event listener manager for cleanup
+  */
+ const eventListeners = new Map();
+ 
+ /**
+  * Add event listener with tracking
+  */
+ function addTrackedListener(element, event, handler, options) {
+     const key = `${element.id || element.className}_${event}`;
+     eventListeners.set(key, { element, event, handler, options });
+     element.addEventListener(event, handler, options);
+ }
+ 
+ /**
+  * Remove all tracked event listeners
+  */
+ export function cleanupEventListeners() {
+     eventListeners.forEach(({ element, event, handler, options }) => {
+         element.removeEventListener(event, handler, options);
+     });
+     eventListeners.clear();
+ }
```

### 5.2 Update Event Registration
**File**: `assets/js/ui-controller.js`  
**Various locations**

```diff
- window.addEventListener('scroll', throttledScroll, { passive: true });
+ addTrackedListener(window, 'scroll', throttledScroll, { passive: true });

- document.addEventListener('click', handleGlobalClick);
+ addTrackedListener(document, 'click', handleGlobalClick);

- disclaimerButton.addEventListener('touchend', (e) => {
+ addTrackedListener(disclaimerButton, 'touchend', (e) => {
```

### 5.3 Add Cleanup on Mode Switch
**File**: `assets/js/ui-controller.js`  
**Function**: switchMode

```diff
  export function switchMode(newMode) {
+     // Clean up previous mode
+     cleanupEventListeners();
+     cleanupMediaPipe();
+     revokeObjectURLs();
+     
      UIState.currentMode = newMode;
      // ... rest of function
  }
```

---

## 6. Fix Unused Imports

### 6.1 Remove Unused Imports
**File**: `assets/js/ui-controller.js`  
**Lines**: 8-18

```diff
  import { 
      BiomechanicalAnalyzer,
      calibrateWithHeight,
-     getSeverity,
      formatMeasurement 
  } from './analysis.js';
  import { 
      generatePDFReport,
-     generateExerciseRecommendations,
      downloadJSON 
  } from './reports.js';
  import { 
      saveToDatabase, 
      testDatabaseConnection 
  } from './database-service.js';
- import { sanitizer } from './utils.js';
```

---

## 7. Standardize Naming Conventions

### 7.1 Convert Snake Case to Camel Case
**Multiple files**

```diff
// storage-keys.js
- const pra_auth = sessionStorage.getItem('pra_auth');
+ const praAuth = sessionStorage.getItem('praAuth');

- const pra_errors = [];
+ const praErrors = [];

// database-service.js
- function format_measurement_data(measurements) {
+ function formatMeasurementData(measurements) {

- const measurement_type = key;
+ const measurementType = key;

// Pattern: Replace all snake_case with camelCase
```

### 7.2 Standardize Function Naming Pattern
**Multiple files**

```diff
// Current mixed patterns:
- calculateAngle()           // verb only
- interpolatePoint()         // verb + noun
- getDistance()              // verb + noun

// Standardized to verb + noun:
+ calculateJointAngle()
+ interpolateLandmarkPoint()
+ getEuclideanDistance()
```

---

## 8. Consolidate CSS Variables

### 8.1 Remove Duplicate Color Definitions
**File**: `assets/css/styles.css`  
**Lines**: 42-85

```diff
  :root{
    /* Primary palette */
-   --color-primary: #57564F;
-   --color-secondary: #7A7A73;
-   --color-tertiary: #DDDAD0;
-   --color-quaternary: #F8F3CE;
-   
-   /* Duplicate definitions - remove these */
-   --primary-color: #57564F;
-   --secondary-color: #7A7A73;
-   --bg-primary: #F8F3CE;
-   --bg-secondary: #DDDAD0;
+   --color-primary: #57564F;
+   --color-secondary: #7A7A73;
+   --color-tertiary: #DDDAD0;
+   --color-quaternary: #F8F3CE;
+   
+   /* Semantic color aliases */
+   --color-bg-primary: var(--color-quaternary);
+   --color-bg-secondary: var(--color-tertiary);
+   --color-text-primary: var(--color-primary);
+   --color-text-secondary: var(--color-secondary);
  }
```

### 8.2 Replace Magic Numbers with Variables
**File**: `assets/css/styles.css`  
**Various locations**

```diff
+ :root {
+   /* Layout constants */
+   --header-height: 64px;
+   --header-height-mobile: 56px;
+   --transition-delay: 150ms;
+   --animation-duration: 300ms;
+   --border-width: 2px;
+   --icon-size: 24px;
+   --touch-target: 44px;
+ }

  .app-header{
-   height:64px;
+   height: var(--header-height);
  }

  @media (max-width:768px){
    .app-header {
-     height:56px;
+     height: var(--header-height-mobile);
    }
  }

- transition: opacity 150ms ease;
+ transition: opacity var(--transition-delay) ease;
```

---

## 9. Add Error Handling

### 9.1 Service Worker Error Handling
**File**: `assets/js/main.js`  
**Lines**: 329-347

```diff
  if ('serviceWorker' in navigator) {
      window.addEventListener('load', async () => {
-         const registration = await navigator.serviceWorker.register('sw.js');
-         // console.log('ServiceWorker registered:', registration);
+         try {
+             const registration = await navigator.serviceWorker.register('sw.js');
+             // Store registration for later use
+             window.swRegistration = registration;
+         } catch (error) {
+             console.error('ServiceWorker registration failed:', error);
+             // Notify user of degraded functionality
+             if (window.showNotification) {
+                 window.showNotification(
+                     'Offline mode unavailable', 
+                     'error'
+                 );
+             }
+         }
      });
  }
```

### 9.2 Async Function Error Handling
**File**: `assets/js/database-service.js`  
**Various functions**

```diff
  export async function saveToDatabase(endpoint, data) {
-     const response = await fetch(`${API_BASE_URL}${endpoint}`, {
-         method: 'POST',
-         headers: {
-             'Authorization': API_KEY,
-             'Content-Type': 'application/json',
-         },
-         body: JSON.stringify(data),
-     });
-     
-     if (!response.ok) {
-         throw new Error(`HTTP error! status: ${response.status}`);
-     }
-     
-     return await response.json();
+     try {
+         const response = await fetch(`${API_BASE_URL}${endpoint}`, {
+             method: 'POST',
+             headers: {
+                 'Authorization': API_KEY,
+                 'Content-Type': 'application/json',
+             },
+             body: JSON.stringify(data),
+         });
+         
+         if (!response.ok) {
+             const error = new Error(`HTTP error! status: ${response.status}`);
+             error.status = response.status;
+             error.response = await response.text();
+             throw error;
+         }
+         
+         return await response.json();
+     } catch (error) {
+         // Network error or other fetch failure
+         if (!error.status) {
+             error.isNetworkError = true;
+         }
+         throw error;
+     }
  }
```

---

## 10. Add JSDoc Documentation

### 10.1 Document Complex Functions
**File**: `assets/js/analysis.js`  
**Function**: analyzeFrontView

```diff
+ /**
+  * Analyzes front view pose for postural deviations
+  * @param {Object} landmarks - MediaPipe pose landmarks (33 points)
+  * @param {Object} imageSize - Image dimensions {width, height}
+  * @returns {Object} Analysis results including:
+  *   - headTilt: Lateral head tilt in degrees (+ = right)
+  *   - shoulderLevel: Shoulder height difference in mm (+ = right higher)
+  *   - hipLevel: Hip height difference in mm (+ = right higher)
+  *   - kneeAngle: Q-angle measurement in degrees
+  * @throws {Error} If insufficient landmarks are detected
+  */
  analyzeFrontView(landmarks, imageSize) {
      if (!landmarks || !this.validateLandmarks(landmarks, 'front')) {
          throw new Error('Invalid or insufficient landmarks for front view analysis');
      }
      // ... rest of function
  }
```

### 10.2 Document Class Constructor
**File**: `assets/js/mediapipe-init.js`  
**Class**: EnhancedPoseDetector

```diff
+ /**
+  * Enhanced pose detector with temporal smoothing and confidence tracking
+  * @class
+  * @param {number} historySize - Number of frames to keep for smoothing (default: 5)
+  * @param {number} smoothingFactor - Weight for exponential smoothing (0-1, default: 0.3)
+  * @example
+  * const detector = new EnhancedPoseDetector(5, 0.3);
+  * detector.onResults = (results) => console.log(results);
+  * await detector.send({image: videoElement});
+  */
  export class EnhancedPoseDetector {
      constructor(historySize = 5, smoothingFactor = 0.3) {
          this.historySize = historySize;
          this.smoothingFactor = smoothingFactor;
          this.landmarkHistory = [];
          // ... rest of constructor
      }
  }
```

### 10.3 Document Utility Functions
**File**: `assets/js/utils.js`  
**Various functions**

```diff
+ /**
+  * Calculates Euclidean distance between two points
+  * @param {Object} point1 - First point {x, y, z?}
+  * @param {Object} point2 - Second point {x, y, z?}
+  * @returns {number} Distance in the same units as input
+  */
  export function getDistance(point1, point2) {
      const dx = point2.x - point1.x;
      const dy = point2.y - point1.y;
      const dz = (point2.z || 0) - (point1.z || 0);
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

+ /**
+  * Calculates angle between three points
+  * @param {Object} center - Center point of angle
+  * @param {Object} point1 - First point
+  * @param {Object} point2 - Second point
+  * @returns {number} Angle in degrees (0-180)
+  */
  export function calculateAngle(center, point1, point2) {
      // ... implementation
  }
```

---

## Implementation Priority & Impact

### Immediate (Security Critical)
1. **Remove hardcoded credentials** - Prevents security breach
2. **Update CSP** - Closes security vulnerabilities

### High Priority (Code Quality)
3. **Extract constants** - Eliminates duplication
4. **Remove console logs** - Cleaner production code
5. **Add error handling** - Better user experience

### Medium Priority (Maintainability)
6. **Refactor large functions** - Easier to maintain
7. **Add event cleanup** - Prevents memory leaks
8. **Fix unused imports** - Smaller bundle size

### Low Priority (Polish)
9. **Standardize naming** - Better consistency
10. **Add JSDoc** - Better documentation

---

## Testing After Refactoring

```bash
# Run local tests
cd posture-ai-unified
python3 -m http.server 3000

# Test each change:
1. Verify constants work across files
2. Check auth still functions
3. Ensure no console errors
4. Test mode switching for memory leaks
5. Verify all features still work

# Build for production
npm run build

# Check bundle size reduction
ls -la dist/
```

---

## Notes
- All line numbers are approximate and may vary slightly
- Test each change incrementally
- Create backups before major refactoring
- Consider using a linter (ESLint) to catch issues automatically