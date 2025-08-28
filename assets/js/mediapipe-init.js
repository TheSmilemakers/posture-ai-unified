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
 * Initialize MediaPipe Pose with appropriate settings
 * @param {string} mode - Analysis mode ('quick', 'clinical', 'advanced')
 * @returns {Pose} Configured pose instance
 */
export function initializePose(mode = 'quick') {
    const pose = new Pose({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
    });
    
    // Set complexity based on mode
    const complexity = mode === 'advanced' ? 2 : mode === 'clinical' ? 1 : 0;
    
    pose.setOptions({
        modelComplexity: complexity,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    
    return pose;
}

/**
 * Draw pose connections on canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} landmarks - Pose landmarks
 * @param {Array} connections - Connection pairs
 * @param {Object} style - Drawing style options
 */
export function drawConnectors(ctx, landmarks, connections, style = {}) {
    const { color = '#667eea', lineWidth = 2 } = style;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    
    connections.forEach(([start, end]) => {
        const startPoint = landmarks[start];
        const endPoint = landmarks[end];
        
        if (startPoint && endPoint && startPoint.visibility > 0.5 && endPoint.visibility > 0.5) {
            ctx.beginPath();
            ctx.moveTo(startPoint.x * ctx.canvas.width, startPoint.y * ctx.canvas.height);
            ctx.lineTo(endPoint.x * ctx.canvas.width, endPoint.y * ctx.canvas.height);
            ctx.stroke();
        }
    });
}

/**
 * Draw pose landmarks on canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} landmarks - Pose landmarks
 * @param {Object} style - Drawing style options
 */
export function drawLandmarks(ctx, landmarks, style = {}) {
    const { color = '#764ba2', radius = 3 } = style;
    
    ctx.fillStyle = color;
    
    landmarks.forEach(landmark => {
        if (landmark && landmark.visibility > 0.5) {
            ctx.beginPath();
            ctx.arc(
                landmark.x * ctx.canvas.width,
                landmark.y * ctx.canvas.height,
                radius,
                0,
                2 * Math.PI
            );
            ctx.fill();
        }
    });
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