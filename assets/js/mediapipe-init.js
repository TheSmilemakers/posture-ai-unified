/**
 * MediaPipe Pose Initialization Module
 * Handles pose detection setup and configuration
 */

// MediaPipe Pose Connections
export const POSE_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5],
    [5, 6], [6, 8], [9, 10], [11, 12], [11, 13],
    [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
    [12, 14], [14, 16], [16, 18], [16, 20], [16, 22],
    [18, 20], [11, 23], [12, 24], [23, 24], [23, 25],
    [24, 26], [25, 27], [26, 28], [27, 29], [28, 30],
    [29, 31], [30, 32]
];

// Landmark indices
export const LANDMARKS = {
    NOSE: 0,
    LEFT_EYE_INNER: 1,
    LEFT_EYE: 2,
    LEFT_EYE_OUTER: 3,
    RIGHT_EYE_INNER: 4,
    RIGHT_EYE: 5,
    RIGHT_EYE_OUTER: 6,
    LEFT_EAR: 7,
    RIGHT_EAR: 8,
    MOUTH_LEFT: 9,
    MOUTH_RIGHT: 10,
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13,
    RIGHT_ELBOW: 14,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
    LEFT_PINKY: 17,
    RIGHT_PINKY: 18,
    LEFT_INDEX: 19,
    RIGHT_INDEX: 20,
    LEFT_THUMB: 21,
    RIGHT_THUMB: 22,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    LEFT_KNEE: 25,
    RIGHT_KNEE: 26,
    LEFT_ANKLE: 27,
    RIGHT_ANKLE: 28,
    LEFT_HEEL: 29,
    RIGHT_HEEL: 30,
    LEFT_FOOT_INDEX: 31,
    RIGHT_FOOT_INDEX: 32
};

/**
 * Enhanced Pose Detector with landmark stability and temporal smoothing
 */
export class EnhancedPoseDetector {
    constructor() {
        this.pose = null;
        this.calibration = null;
        this.confidenceThreshold = 0.7;
        this.landmarkHistory = [];
        this.historySize = 5;
        this.callbacks = {};
        this.isInitialized = false;
        this.isInitializing = false;
        this.initializationPromise = null;
        this.isStaticImageMode = false;  // Flag for static image processing
    }
    
    /**
     * Initialize MediaPipe with enhanced configuration
     */
    async initialize(mode = 'advanced') {
        // If already initialized, return existing pose
        if (this.isInitialized && this.pose) {
            console.log('Enhanced pose detector already initialized');
            return this.pose;
        }
        
        // If currently initializing, wait for completion
        if (this.isInitializing && this.initializationPromise) {
            console.log('Waiting for ongoing initialization...');
            return this.initializationPromise;
        }
        
        // Start initialization
        this.isInitializing = true;
        this.initializationPromise = this._performInitialization(mode);
        
        try {
            const pose = await this.initializationPromise;
            this.isInitialized = true;
            this.isInitializing = false;
            return pose;
        } catch (error) {
            this.isInitializing = false;
            this.initializationPromise = null;
            throw error;
        }
    }
    
    /**
     * Perform actual initialization with WASM loading check
     * @private
     */
    async _performInitialization(mode) {
        if (typeof Pose === 'undefined') {
            throw new Error('MediaPipe Pose library not loaded');
        }
        
        this.pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            }
        });
        
        const complexityMap = {
            'quick': 0,
            'clinical': 1,
            'advanced': 2
        };
        
        // Detect if we're in static image mode (advanced mode processes static images)
        this.isStaticImageMode = (mode === 'advanced');
        
        // Optimized configuration based on MediaPipe best practices
        this.pose.setOptions({
            modelComplexity: complexityMap[mode] || 2,  // Maximum accuracy for clinical use
            smoothLandmarks: !this.isStaticImageMode,  // Disable smoothing for static images
            enableSegmentation: false,                  // Not needed, saves performance
            smoothSegmentation: false,                  // Not using segmentation
            minDetectionConfidence: 0.7,                // Good balance for clinical accuracy
            minTrackingConfidence: 0.8                  // Higher for stability in measurements
        });
        
        this.pose.onResults(this.onResults.bind(this));
        
        // Wait for MediaPipe to be fully initialized (WASM loading)
        await this._waitForMediaPipeReady();
        
        console.log('Enhanced pose detector initialized for', mode, 'mode');
        return this.pose;
    }
    
    /**
     * Wait for MediaPipe WASM modules to load
     * @private
     */
    async _waitForMediaPipeReady() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 100; // 5 seconds timeout (50ms * 100)
            
            const checkReady = () => {
                attempts++;
                
                try {
                    // Check if pose methods are available
                    if (!this.pose || !this.pose.send || !this.pose.onResults || !this.pose.setOptions) {
                        throw new Error('MediaPipe methods not yet available');
                    }
                    
                    // Test if MediaPipe is truly ready by setting up a test callback
                    // This will throw if WASM modules aren't loaded
                    this.pose.onResults(() => {});
                    
                    // Re-set our actual callback
                    this.pose.onResults(this.onResults.bind(this));
                    
                    // If we get here, MediaPipe is ready
                    console.log('MediaPipe Enhanced Pose detector ready');
                    resolve();
                } catch (e) {
                    if (attempts >= maxAttempts) {
                        console.error('MediaPipe initialization timeout', {
                            error: e.message,
                            hasPose: !!this.pose,
                            hasSend: !!(this.pose?.send),
                            hasOnResults: !!(this.pose?.onResults),
                            hasSetOptions: !!(this.pose?.setOptions),
                            attempts
                        });
                        reject(new Error('MediaPipe initialization timed out. Please refresh the page.'));
                    } else {
                        // Retry after a short delay
                        setTimeout(checkReady, 50);
                    }
                }
            };
            
            // Start checking after a brief delay to allow WASM to begin loading
            setTimeout(checkReady, 100);
        });
    }
    
    /**
     * Process pose results with temporal smoothing
     */
    onResults(results) {
        if (!results.poseLandmarks) {
            console.warn('No pose detected in frame');
            return;
        }
        
        // Check pose quality before processing
        const avgVisibility = results.poseLandmarks.reduce(
            (sum, landmark) => sum + (landmark.visibility || 0), 0
        ) / results.poseLandmarks.length;
        
        if (avgVisibility < 0.6) {
            console.warn('Poor pose visibility:', avgVisibility.toFixed(2));
            return;
        }
        
        // Add to history for temporal smoothing
        this.landmarkHistory.push(results.poseLandmarks);
        if (this.landmarkHistory.length > this.historySize) {
            this.landmarkHistory.shift();
        }
        
        // Gate: Ensure we have at least one frame before processing
        if (this.landmarkHistory.length === 0) {
            return; // No frames to process
        }
        
        // Apply temporal smoothing only if we have enough frames
        // For static images (single frame), use the landmarks directly
        const smoothedLandmarks = this.landmarkHistory.length >= this.historySize 
            ? this.temporalSmoothing() 
            : results.poseLandmarks;
        
        // Calculate overall confidence
        const confidence = this.calculateConfidence(smoothedLandmarks);
        
        // Check landmark stability
        const stability = this.checkLandmarkStability();
        
        // For static images, skip stability check; for video, require stability > 0.8
        const passesQualityCheck = this.isStaticImageMode 
            ? confidence >= this.confidenceThreshold  // Static: confidence only
            : (confidence >= this.confidenceThreshold && stability > 0.8);  // Video: both checks
            
        if (passesQualityCheck) {
            const enhancedResults = {
                ...results,
                poseLandmarks: smoothedLandmarks,
                confidence,
                stability,
                isCalibrated: this.calibration?.calibrated || false
            };
            
            // Emit results to all pose callbacks
            if (this.callbacks.pose && this.callbacks.pose.size > 0) {
                this.callbacks.pose.forEach(callback => {
                    try {
                        callback(enhancedResults);
                    } catch (error) {
                        console.error('Error in pose callback:', error);
                    }
                });
            }
        }
    }
    
    /**
     * Apply temporal smoothing to landmarks
     */
    temporalSmoothing() {
        if (this.landmarkHistory.length === 0) return null;
        
        const smoothed = [];
        const numLandmarks = this.landmarkHistory[0].length;
        
        for (let i = 0; i < numLandmarks; i++) {
            let x = 0, y = 0, z = 0, visibility = 0;
            
            this.landmarkHistory.forEach(frame => {
                x += frame[i].x;
                y += frame[i].y;
                z += frame[i].z || 0;
                visibility += frame[i].visibility || 0;
            });
            
            const count = this.landmarkHistory.length;
            smoothed.push({
                x: x / count,
                y: y / count,
                z: z / count,
                visibility: visibility / count
            });
        }
        
        return smoothed;
    }
    
    /**
     * Calculate overall confidence from landmark visibilities
     */
    calculateConfidence(landmarks) {
        if (!landmarks || landmarks.length === 0) return 0;
        
        // Critical landmarks for posture analysis
        const criticalIndices = [
            LANDMARKS.NOSE,
            LANDMARKS.LEFT_SHOULDER,
            LANDMARKS.RIGHT_SHOULDER,
            LANDMARKS.LEFT_HIP,
            LANDMARKS.RIGHT_HIP,
            LANDMARKS.LEFT_KNEE,
            LANDMARKS.RIGHT_KNEE
        ];
        
        let totalVisibility = 0;
        criticalIndices.forEach(idx => {
            totalVisibility += landmarks[idx]?.visibility || 0;
        });
        
        return totalVisibility / criticalIndices.length;
    }
    
    /**
     * Check landmark stability across frames
     */
    checkLandmarkStability() {
        if (this.landmarkHistory.length < 2) return 0; // Return 0 stability for insufficient frames
        
        let totalMovement = 0;
        const current = this.landmarkHistory[this.landmarkHistory.length - 1];
        const previous = this.landmarkHistory[this.landmarkHistory.length - 2];
        
        for (let i = 0; i < current.length; i++) {
            const dx = current[i].x - previous[i].x;
            const dy = current[i].y - previous[i].y;
            totalMovement += Math.sqrt(dx * dx + dy * dy);
        }
        
        // Normalize movement (lower is more stable)
        const avgMovement = totalMovement / current.length;
        return Math.max(0, 1 - avgMovement * 10);
    }
    
    /**
     * Set callback functions
     */
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = new Set();
        }
        this.callbacks[event].add(callback);
    }
    
    /**
     * Remove callback function
     */
    off(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].delete(callback);
        }
    }
    
    /**
     * Remove all listeners for an event
     */
    removeAllListeners(event) {
        if (event) {
            delete this.callbacks[event];
        } else {
            this.callbacks = {};
        }
    }
    
    /**
     * Send image for processing
     */
    async send(input) {
        // Ensure initialization is complete before sending
        if (!this.isInitialized) {
            if (this.isInitializing && this.initializationPromise) {
                console.log('Waiting for initialization to complete before sending...');
                await this.initializationPromise;
            } else {
                throw new Error('Enhanced detector not initialized. Call initialize() first.');
            }
        }
        
        if (!this.pose || !this.pose.send) {
            throw new Error('MediaPipe pose not available. Please refresh the page.');
        }
        
        return this.pose.send(input);
    }
    
    /**
     * Clean up resources
     */
    close() {
        if (this.pose) {
            this.pose.close();
        }
        this.pose = null;
        this.landmarkHistory = [];
        this.callbacks = {};
        this.isInitialized = false;
        this.isInitializing = false;
        this.initializationPromise = null;
    }
}

/**
 * Initialize MediaPipe Pose with enhanced error handling and configuration
 * @param {string} mode - Analysis mode ('quick', 'clinical', 'advanced')
 * @returns {Promise<Pose>} Configured pose instance ready for use
 */
export async function initializePose(mode = 'quick') {
    try {
        // Check if MediaPipe is available
        if (typeof Pose === 'undefined') {
            console.error('MediaPipe Pose library not loaded. This may be due to CSP restrictions.');
            throw new Error('MediaPipe Pose library not loaded. Please check browser console for CSP errors.');
        }
        
        const pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            }
        });
        
        // Add initialization flag
        pose._isInitialized = false;
        
        // Set complexity based on mode with validation
        const complexityMap = {
            'quick': 0,
            'clinical': 1, 
            'advanced': 2
        };
        
        const complexity = complexityMap[mode] || 0;
        
        // Optimized configuration based on MediaPipe best practices
        const config = {
            modelComplexity: complexity,
            smoothLandmarks: true,                       // Essential for stable measurements
            enableSegmentation: false,                   // Not needed, saves performance
            smoothSegmentation: false,                   // Not using segmentation
            minDetectionConfidence: mode === 'advanced' ? 0.7 : 0.6,  // Higher baseline for accuracy
            minTrackingConfidence: mode === 'advanced' ? 0.8 : 0.7    // Higher for stability
        };
        
        console.log(`Initializing MediaPipe Pose for ${mode} mode with config:`, config);
        
        pose.setOptions(config);
        
        // Wait for MediaPipe to be fully initialized
        // MediaPipe models need to load before the pose object is ready
        await new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 100; // 5 seconds timeout (50ms * 100)
            
            // Check if pose methods are available and truly functional
            const checkReady = () => {
                attempts++;
                
                try {
                    // First check if methods exist
                    if (!pose.send || !pose.onResults || !pose.setOptions) {
                        throw new Error('MediaPipe methods not yet available');
                    }
                    
                    // Test if MediaPipe is truly ready by setting up a callback
                    // This will throw if WASM modules aren't loaded
                    pose.onResults(() => {});
                    
                    // If we get here, MediaPipe is ready
                    console.log('MediaPipe Pose initialized successfully');
                    pose._isInitialized = true;
                    resolve();
                } catch (e) {
                    if (attempts >= maxAttempts) {
                        console.error('MediaPipe initialization timeout', {
                            error: e.message,
                            hasSend: !!pose.send,
                            hasOnResults: !!pose.onResults,
                            hasSetOptions: !!pose.setOptions,
                            attempts
                        });
                        reject(new Error('MediaPipe initialization timed out. Please refresh the page.'));
                    } else {
                        // Retry after a short delay
                        setTimeout(checkReady, 50);
                    }
                }
            };
            
            // Start checking after a brief delay to allow WASM to begin loading
            setTimeout(checkReady, 100);
        });
        
        return pose;
        
    } catch (error) {
        console.error('Error creating MediaPipe Pose:', error);
        throw error;
    }
}

/**
 * Draw pose connections on canvas with enhanced error handling
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} landmarks - Pose landmarks
 * @param {Array} connections - Connection pairs
 * @param {Object} style - Drawing style options
 */
export function drawConnectors(ctx, landmarks, connections, style = {}) {
    try {
        if (!ctx || !landmarks || !connections) {
            console.warn('Invalid parameters for drawConnectors');
            return;
        }
        
        const { color = '#667eea', lineWidth = 2 } = style;
        
        // Save canvas state
        ctx.save();
        
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        connections.forEach(([start, end]) => {
            try {
                const startPoint = landmarks[start];
                const endPoint = landmarks[end];
                
                if (startPoint && endPoint && 
                    startPoint.visibility > 0.5 && endPoint.visibility > 0.5 &&
                    !isNaN(startPoint.x) && !isNaN(startPoint.y) &&
                    !isNaN(endPoint.x) && !isNaN(endPoint.y)) {
                    
                    ctx.beginPath();
                    ctx.moveTo(
                        startPoint.x * ctx.canvas.width, 
                        startPoint.y * ctx.canvas.height
                    );
                    ctx.lineTo(
                        endPoint.x * ctx.canvas.width, 
                        endPoint.y * ctx.canvas.height
                    );
                    ctx.stroke();
                }
            } catch (error) {
                console.warn('Error drawing connection:', error);
            }
        });
        
        // Restore canvas state
        ctx.restore();
        
    } catch (error) {
        console.error('Error in drawConnectors:', error);
    }
}

/**
 * Draw pose landmarks on canvas with enhanced error handling
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} landmarks - Pose landmarks
 * @param {Object} style - Drawing style options
 */
export function drawLandmarks(ctx, landmarks, style = {}) {
    try {
        if (!ctx || !landmarks) {
            console.warn('Invalid parameters for drawLandmarks');
            return;
        }
        
        const { color = '#764ba2', radius = 3 } = style;
        
        // Save canvas state
        ctx.save();
        
        ctx.fillStyle = color;
        
        landmarks.forEach((landmark, index) => {
            try {
                if (landmark && 
                    landmark.visibility > 0.5 &&
                    !isNaN(landmark.x) && !isNaN(landmark.y) &&
                    landmark.x >= 0 && landmark.x <= 1 &&
                    landmark.y >= 0 && landmark.y <= 1) {
                    
                    const x = landmark.x * ctx.canvas.width;
                    const y = landmark.y * ctx.canvas.height;
                    
                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, 2 * Math.PI);
                    ctx.fill();
                }
            } catch (error) {
                console.warn(`Error drawing landmark ${index}:`, error);
            }
        });
        
        // Restore canvas state
        ctx.restore();
        
    } catch (error) {
        console.error('Error in drawLandmarks:', error);
    }
}

/**
 * Check if pose landmarks are valid
 * @param {Array} landmarks - Pose landmarks
 * @returns {boolean} True if landmarks are valid
 */
export function validateLandmarks(landmarks) {
    if (!landmarks || landmarks.length < 33) return false;
    
    // Check if key landmarks are visible
    const keyLandmarks = [
        LANDMARKS.NOSE,
        LANDMARKS.LEFT_SHOULDER,
        LANDMARKS.RIGHT_SHOULDER,
        LANDMARKS.LEFT_HIP,
        LANDMARKS.RIGHT_HIP
    ];
    
    return keyLandmarks.every(idx => 
        landmarks[idx] && landmarks[idx].visibility > 0.3
    );
}