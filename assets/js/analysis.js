/**
 * Biomechanical Analysis Module
 * Core algorithms for posture analysis
 */

import { LANDMARKS } from './mediapipe-init.js';
import { calibrateToRealWorld, calibrateToRealWorldEnhanced, convertToBodyPercentage } from './utils.js';

/**
 * Calculate angle between three points
 * @param {Object} p1 - First point
 * @param {Object} p2 - Middle point (vertex)
 * @param {Object} p3 - Third point
 * @returns {number} Angle in degrees
 */
export function calculateAngle(p1, p2, p3) {
    const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
    const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
    let angle = Math.abs(angle2 - angle1) * 180 / Math.PI;
    if (angle > 180) angle = 360 - angle;
    return angle;
}

/**
 * Calculate distance between two points
 * @param {Object} p1 - First point
 * @param {Object} p2 - Second point
 * @returns {number} Euclidean distance
 */
export function calculateDistance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = (p2.z || 0) - (p1.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate center of mass from landmarks
 * @param {Array} landmarks - Pose landmarks
 * @returns {Object} Center of mass coordinates
 */
export function calculateCenterOfMass(landmarks) {
    const segments = {
        head: { weight: 0.08, point: landmarks[LANDMARKS.NOSE] },
        trunk: { 
            weight: 0.46, 
            point: interpolatePoint(landmarks[LANDMARKS.LEFT_SHOULDER], landmarks[LANDMARKS.LEFT_HIP], 0.5) 
        },
        leftArm: { weight: 0.05, point: landmarks[LANDMARKS.LEFT_WRIST] },
        rightArm: { weight: 0.05, point: landmarks[LANDMARKS.RIGHT_WRIST] },
        leftLeg: { weight: 0.18, point: landmarks[LANDMARKS.LEFT_ANKLE] },
        rightLeg: { weight: 0.18, point: landmarks[LANDMARKS.RIGHT_ANKLE] }
    };
    
    let comX = 0, comY = 0;
    Object.values(segments).forEach(segment => {
        if (segment.point) {
            comX += segment.point.x * segment.weight;
            comY += segment.point.y * segment.weight;
        }
    });
    
    return { x: comX, y: comY };
}

/**
 * Interpolate between two points
 * @param {Object} p1 - First point
 * @param {Object} p2 - Second point
 * @param {number} ratio - Interpolation ratio (0-1)
 * @returns {Object} Interpolated point
 */
export function interpolatePoint(p1, p2, ratio) {
    if (!p1 || !p2) return null;
    return {
        x: p1.x + (p2.x - p1.x) * ratio,
        y: p1.y + (p2.y - p1.y) * ratio,
        z: p1.z ? p1.z + ((p2.z || 0) - p1.z) * ratio : 0
    };
}

/**
 * Basic postural metrics calculation with real-world calibration
 * @param {Array} landmarks - Pose landmarks
 * @param {number} patientHeight - Patient height in cm (default: 170)
 * @param {Object} imageMetadata - Image dimensions {width, height} (optional)
 * @returns {Object} Basic metrics in real-world units
 */
export function calculateBasicMetrics(landmarks, patientHeight = 170, imageMetadata = null) {
    const leftShoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];
    const leftEye = landmarks[LANDMARKS.LEFT_EYE];
    const rightEye = landmarks[LANDMARKS.RIGHT_EYE];
    const leftHip = landmarks[LANDMARKS.LEFT_HIP];
    const rightHip = landmarks[LANDMARKS.RIGHT_HIP];
    
    // Calculate raw normalized differences
    const rawHeadTilt = Math.abs(Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * 180 / Math.PI);
    const rawShoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
    const rawHipDiff = Math.abs(leftHip.y - rightHip.y);
    
    // Apply calibration if available
    if (imageMetadata && patientHeight) {
        const shoulderAsymmetryCm = calibrateToRealWorldEnhanced(rawShoulderDiff, patientHeight, imageMetadata, landmarks);
        const hipAsymmetryCm = calibrateToRealWorldEnhanced(rawHipDiff, patientHeight, imageMetadata, landmarks);
        
        return {
            headTilt: rawHeadTilt,  // Already in degrees - no calibration needed
            shoulderLevel: shoulderAsymmetryCm,  // Now in real centimeters
            hipLevel: hipAsymmetryCm  // Now in real centimeters
        };
    } else {
        // Fallback to normalized values with warning
        console.warn('calculateBasicMetrics: No calibration data available - using normalized coordinates');
        return {
            headTilt: rawHeadTilt,
            shoulderLevel: rawShoulderDiff * 100,  // Normalized scale
            hipLevel: rawHipDiff * 100  // Normalized scale
        };
    }
}

/**
 * Analyze front view landmarks with real-world calibration
 * @param {Array} landmarks - Pose landmarks
 * @param {number} patientHeight - Patient height in cm (default: 170)
 * @param {Object} imageMetadata - Image dimensions {width, height} (optional)
 * @returns {Object} Front view analysis in real-world units
 */
export function analyzeFrontView(landmarks, patientHeight = 170, imageMetadata = null) {
    const data = {
        view: 'front',
        totalDeviation: 0
    };
    
    // Q-Angle calculation (already in degrees - no calibration needed)
    const hip = landmarks[LANDMARKS.LEFT_HIP];
    const knee = landmarks[LANDMARKS.LEFT_KNEE];
    const ankle = landmarks[LANDMARKS.LEFT_ANKLE];
    data.qAngle = calculateAngle(hip, knee, ankle);
    
    // Shoulder symmetry with calibration
    const leftShoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];
    const rawShoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
    
    if (imageMetadata && patientHeight) {
        const shoulderAsymmetryCm = calibrateToRealWorldEnhanced(rawShoulderDiff, patientHeight, imageMetadata, landmarks);
        data.shoulderAsymmetry = convertToBodyPercentage(shoulderAsymmetryCm, patientHeight);
    } else {
        data.shoulderAsymmetry = rawShoulderDiff * 100; // Fallback normalized
    }
    
    // Hip symmetry with calibration  
    const leftHip = landmarks[LANDMARKS.LEFT_HIP];
    const rightHip = landmarks[LANDMARKS.RIGHT_HIP];
    const rawHipDiff = Math.abs(leftHip.y - rightHip.y);
    
    if (imageMetadata && patientHeight) {
        const hipAsymmetryCm = calibrateToRealWorldEnhanced(rawHipDiff, patientHeight, imageMetadata, landmarks);
        data.hipAsymmetry = convertToBodyPercentage(hipAsymmetryCm, patientHeight);
    } else {
        data.hipAsymmetry = rawHipDiff * 100; // Fallback normalized
    }
    
    // Weight distribution (percentage calculation - no calibration needed)
    const com = calculateCenterOfMass(landmarks);
    const leftFoot = landmarks[LANDMARKS.LEFT_FOOT_INDEX];
    const rightFoot = landmarks[LANDMARKS.RIGHT_FOOT_INDEX];
    const midFoot = leftFoot && rightFoot ? (leftFoot.x + rightFoot.x) / 2 : 0.5;
    
    data.weightDistribution = {
        left: Math.max(0, Math.min(100, 50 - (com.x - midFoot) * 100)),
        right: Math.max(0, Math.min(100, 50 + (com.x - midFoot) * 100))
    };
    
    // Calculate total deviation
    data.totalDeviation = data.shoulderAsymmetry * 2 + 
                         data.hipAsymmetry * 2 + 
                         Math.abs(data.qAngle - 15);
    
    return data;
}

/**
 * Analyze side view landmarks with real-world calibration
 * @param {Array} landmarks - Pose landmarks
 * @param {number} patientHeight - Patient height in cm (default: 170)
 * @param {Object} imageMetadata - Image dimensions {width, height} (optional)
 * @returns {Object} Side view analysis in real-world units
 */
export function analyzeSideView(landmarks, patientHeight = 170, imageMetadata = null) {
    const data = {
        view: 'side',
        totalDeviation: 0
    };
    
    // Forward head posture with calibration
    const ear = landmarks[LANDMARKS.LEFT_EAR] || landmarks[LANDMARKS.RIGHT_EAR];
    const shoulder = landmarks[LANDMARKS.LEFT_SHOULDER] || landmarks[LANDMARKS.RIGHT_SHOULDER];
    const rawForwardHead = ear && shoulder ? (ear.x - shoulder.x) : 0;
    
    if (imageMetadata && patientHeight && ear && shoulder) {
        const forwardHeadCm = calibrateToRealWorldEnhanced(Math.abs(rawForwardHead), patientHeight, imageMetadata, landmarks);
        data.forwardHead = convertToBodyPercentage(forwardHeadCm, patientHeight);
    } else {
        data.forwardHead = rawForwardHead * 100; // Fallback normalized
    }
    
    // Pelvic tilt estimation (already in degrees - no calibration needed)
    const hip = landmarks[LANDMARKS.LEFT_HIP] || landmarks[LANDMARKS.RIGHT_HIP];
    const knee = landmarks[LANDMARKS.LEFT_KNEE] || landmarks[LANDMARKS.RIGHT_KNEE];
    data.pelvicAngle = hip && knee ? 
        Math.atan2(knee.y - hip.y, knee.x - hip.x) * 180 / Math.PI : 0;
    
    // Kyphosis estimation (already in degrees - no calibration needed)
    const upperBack = landmarks[LANDMARKS.LEFT_SHOULDER] || landmarks[LANDMARKS.RIGHT_SHOULDER];
    const midBack = interpolatePoint(
        landmarks[LANDMARKS.LEFT_SHOULDER], 
        landmarks[LANDMARKS.LEFT_HIP], 
        0.5
    );
    const lowerBack = landmarks[LANDMARKS.LEFT_HIP];
    
    data.kyphosisAngle = upperBack && midBack && lowerBack ? 
        calculateAngle(upperBack, midBack, lowerBack) : 0;
    
    // Calculate total deviation
    data.totalDeviation = Math.abs(data.forwardHead) * 3 + 
                         Math.abs(data.pelvicAngle - 10) + 
                         Math.abs(data.kyphosisAngle - 160) * 0.5;
    
    return data;
}

/**
 * Analyze back view landmarks with real-world calibration
 * @param {Array} landmarks - Pose landmarks
 * @param {number} patientHeight - Patient height in cm (default: 170)
 * @param {Object} imageMetadata - Image dimensions {width, height} (optional)
 * @returns {Object} Back view analysis in real-world units
 */
export function analyzeBackView(landmarks, patientHeight = 170, imageMetadata = null) {
    const data = {
        view: 'back',
        totalDeviation: 0
    };
    
    // Scoliosis detection with calibration
    const spine = extractSpinePoints(landmarks);
    const rawSpinalDeviation = calculateMaxDeviation(spine);
    
    if (imageMetadata && patientHeight && rawSpinalDeviation > 0) {
        const spinalDeviationCm = calibrateToRealWorldEnhanced(rawSpinalDeviation, patientHeight, imageMetadata, landmarks);
        data.spinalDeviation = convertToBodyPercentage(spinalDeviationCm, patientHeight);
    } else {
        data.spinalDeviation = rawSpinalDeviation * 100; // Fallback normalized
    }
    
    // Scapular symmetry with calibration
    const leftShoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];
    const leftElbow = landmarks[LANDMARKS.LEFT_ELBOW];
    const rightElbow = landmarks[LANDMARKS.RIGHT_ELBOW];
    
    const rawScapularAsymmetry = leftShoulder && rightShoulder && leftElbow && rightElbow ?
        Math.abs((leftElbow.x - leftShoulder.x) - (rightElbow.x - rightShoulder.x)) : 0;
    
    if (imageMetadata && patientHeight && rawScapularAsymmetry > 0) {
        const scapularAsymmetryCm = calibrateToRealWorldEnhanced(rawScapularAsymmetry, patientHeight, imageMetadata, landmarks);
        data.scapularAsymmetry = convertToBodyPercentage(scapularAsymmetryCm, patientHeight);
    } else {
        data.scapularAsymmetry = rawScapularAsymmetry * 100; // Fallback normalized
    }
    
    // Calculate total deviation
    data.totalDeviation = data.spinalDeviation * 2 + data.scapularAsymmetry * 3;
    
    return data;
}

/**
 * Extract spine points from landmarks
 * @param {Array} landmarks - Pose landmarks
 * @returns {Array} Spine points
 */
export function extractSpinePoints(landmarks) {
    const points = [];
    
    if (landmarks[LANDMARKS.NOSE]) points.push(landmarks[LANDMARKS.NOSE]);
    
    const neckPoint = interpolatePoint(
        landmarks[LANDMARKS.NOSE], 
        landmarks[LANDMARKS.LEFT_SHOULDER], 
        0.5
    );
    if (neckPoint) points.push(neckPoint);
    
    if (landmarks[LANDMARKS.LEFT_SHOULDER]) points.push(landmarks[LANDMARKS.LEFT_SHOULDER]);
    
    const midBackPoint = interpolatePoint(
        landmarks[LANDMARKS.LEFT_SHOULDER], 
        landmarks[LANDMARKS.LEFT_HIP], 
        0.5
    );
    if (midBackPoint) points.push(midBackPoint);
    
    if (landmarks[LANDMARKS.LEFT_HIP]) points.push(landmarks[LANDMARKS.LEFT_HIP]);
    if (landmarks[LANDMARKS.RIGHT_HIP]) points.push(landmarks[LANDMARKS.RIGHT_HIP]);
    
    return points.filter(p => p !== null);
}

/**
 * Calculate maximum deviation from straight line
 * @param {Array} points - Array of points
 * @returns {number} Maximum deviation
 */
export function calculateMaxDeviation(points) {
    if (points.length < 3) return 0;
    
    let maxDev = 0;
    const startPoint = points[0];
    const endPoint = points[points.length - 1];
    
    for (let i = 1; i < points.length - 1; i++) {
        const expectedX = startPoint.x + (endPoint.x - startPoint.x) * (i / (points.length - 1));
        const deviation = Math.abs(points[i].x - expectedX);
        maxDev = Math.max(maxDev, deviation);
    }
    
    return maxDev;
}

/**
 * Get severity level based on value and thresholds
 * @param {number} value - Measured value
 * @param {Array} thresholds - Severity thresholds [optimal, mild, moderate]
 * @returns {string} Severity level
 */
export function getSeverity(value, thresholds) {
    if (value < thresholds[0]) return 'optimal';
    if (value < thresholds[1]) return 'mild';
    if (value < thresholds[2]) return 'moderate';
    return 'severe';
}

/**
 * Calculate injury risk scores
 * @param {Object} data - Combined analysis data
 * @returns {Object} Risk scores by body region
 */
export function calculateInjuryRisk(data) {
    const risks = {};
    
    // Low back pain risk
    risks.lowBack = Math.min(
        (Math.abs(data.pelvicAngle - 10) || 0) * 3 + 
        (Math.abs(data.forwardHead) || 0) * 2, 
        100
    );
    
    // Neck pain risk
    risks.neck = Math.min(
        (Math.abs(data.forwardHead) || 0) * 5 + 
        (data.shoulderAsymmetry || 0) * 3, 
        100
    );
    
    // Knee pain risk
    risks.knee = Math.min(
        (Math.abs(data.qAngle - 15) || 0) * 4 + 
        (data.hipAsymmetry || 0) * 2, 
        100
    );
    
    // Shoulder impingement risk
    risks.shoulder = Math.min(
        (data.shoulderAsymmetry || 0) * 4 + 
        (Math.abs(data.forwardHead) || 0) * 2, 
        100
    );
    
    return risks;
}

/**
 * Generate exercise recommendations based on analysis
 * @param {Object} metrics - Analysis metrics
 * @returns {Array} Recommended exercises
 */
export function generateExerciseRecommendations(metrics) {
    const exercises = [];
    
    if (metrics.forwardHead && Math.abs(metrics.forwardHead) > 3) {
        exercises.push({
            name: 'Chin Tucks',
            description: '3 x 10 reps, hold 5 seconds',
            targetArea: 'Neck alignment'
        });
    }
    
    if (metrics.shoulderAsymmetry && metrics.shoulderAsymmetry > 2) {
        exercises.push({
            name: 'Shoulder Shrugs',
            description: '3 x 15 reps, focus on symmetry',
            targetArea: 'Shoulder balance'
        });
    }
    
    if (metrics.spinalDeviation && metrics.spinalDeviation > 3) {
        exercises.push({
            name: 'Cat-Cow Stretches',
            description: '3 x 10 reps, slow and controlled',
            targetArea: 'Spinal mobility'
        });
    }
    
    // Always include core strengthening
    exercises.push({
        name: 'Plank Hold',
        description: '3 x 30 seconds, maintain neutral spine',
        targetArea: 'Core stability'
    });
    
    return exercises;
}