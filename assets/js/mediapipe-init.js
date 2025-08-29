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
 * Initialize MediaPipe Pose with enhanced error handling and configuration
 * @param {string} mode - Analysis mode ('quick', 'clinical', 'advanced')
 * @returns {Promise<Pose>} Promise that resolves to configured pose instance
 */
export function initializePose(mode = 'quick') {
    return new Promise((resolve, reject) => {
        try {
            // Check if MediaPipe is available
            if (typeof Pose === 'undefined') {
                throw new Error('MediaPipe Pose library not loaded');
            }
            
            const pose = new Pose({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
                }
            });
            
            // Set complexity based on mode with validation
            const complexityMap = {
                'quick': 0,
                'clinical': 1, 
                'advanced': 2
            };
            
            const complexity = complexityMap[mode] || 0;
            
            // Enhanced configuration based on mode
            const config = {
                modelComplexity: complexity,
                smoothLandmarks: true,
                enableSegmentation: false,
                minDetectionConfidence: mode === 'advanced' ? 0.7 : 0.5,
                minTrackingConfidence: mode === 'advanced' ? 0.7 : 0.5
            };
            
            console.log(`Initializing MediaPipe Pose for ${mode} mode with config:`, config);
            
            pose.setOptions(config);
            
            // Add initialization timeout
            const timeout = setTimeout(() => {
                reject(new Error('MediaPipe initialization timed out'));
            }, 10000);
            
            // Test if pose is working by attempting to initialize
            pose.initialize().then(() => {
                clearTimeout(timeout);
                console.log('MediaPipe Pose initialized successfully');
                resolve(pose);
            }).catch(error => {
                clearTimeout(timeout);
                reject(new Error(`MediaPipe initialization failed: ${error.message}`));
            });
            
        } catch (error) {
            console.error('Error creating MediaPipe Pose:', error);
            reject(error);
        }
    });
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