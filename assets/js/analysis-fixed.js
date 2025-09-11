/**
 * Biomechanical Analysis Module - FIXED VERSION
 * Core algorithms for posture analysis with proper calibration
 */

import { LANDMARKS } from './mediapipe-init.js';
import { calibrateToRealWorld, calibrateToRealWorldEnhanced, convertToBodyPercentage } from './utils.js';
import { MeasurementValue, MeasurementUnit, CalibrationManager } from './measurement-system.js';

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
 * FIXED: Establish calibration based on patient height
 * @param {Array} landmarks - Pose landmarks
 * @param {number} patientHeight - Patient height in cm
 * @param {Object} imageMetadata - Image dimensions
 * @returns {Object} Calibration data
 */
function establishCalibration(landmarks, patientHeight, imageMetadata) {
    // Average human proportions: nose to ankle ≈ 93% of total height
    const nose = landmarks[LANDMARKS.NOSE];
    const leftAnkle = landmarks[LANDMARKS.LEFT_ANKLE];
    const rightAnkle = landmarks[LANDMARKS.RIGHT_ANKLE];
    
    if (!nose || !leftAnkle || !rightAnkle) {
        return {
            pixelsPerCm: 2.5, // Default fallback
            confidence: 0.3,
            method: 'default'
        };
    }
    
    const ankleMidpoint = interpolatePoint(leftAnkle, rightAnkle, 0.5);
    const noseToAnklePixels = calculateDistance(nose, ankleMidpoint);
    
    // Convert to actual pixels if normalized
    const imageHeight = imageMetadata?.height || 1000; // Default image height
    const actualPixelDistance = noseToAnklePixels * imageHeight;
    
    // Calculate pixels per cm
    const estimatedBodyHeight = patientHeight * 0.93; // cm
    const pixelsPerCm = actualPixelDistance / estimatedBodyHeight;
    
    // Calculate confidence based on landmark visibility
    const avgVisibility = (nose.visibility + leftAnkle.visibility + rightAnkle.visibility) / 3;
    const confidence = Math.min(0.95, avgVisibility * 1.2);
    
    return {
        pixelsPerCm: pixelsPerCm,
        confidence: confidence,
        method: 'height_estimation',
        patientHeight: patientHeight
    };
}

/**
 * FIXED: Basic postural metrics calculation with real-world calibration
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
    
    // FIXED: Establish proper calibration
    const calibration = establishCalibration(landmarks, patientHeight, imageMetadata);
    const calibrationManager = CalibrationManager.getInstance();
    calibrationManager.setCalibration(calibration);
    
    // Calculate head tilt angle (degrees)
    const rawHeadTilt = Math.abs(Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * 180 / Math.PI);
    
    // FIXED: Calculate shoulder asymmetry in CENTIMETERS, not percent
    const shoulderDiffNormalized = Math.abs(leftShoulder.y - rightShoulder.y);
    const shoulderDiffPixels = shoulderDiffNormalized * (imageMetadata?.height || 1000);
    const shoulderAsymmetryCm = shoulderDiffPixels / calibration.pixelsPerCm;
    
    // FIXED: Calculate hip asymmetry in CENTIMETERS
    const hipDiffNormalized = Math.abs(leftHip.y - rightHip.y);
    const hipDiffPixels = hipDiffNormalized * (imageMetadata?.height || 1000);
    const hipAsymmetryCm = hipDiffPixels / calibration.pixelsPerCm;
    
    // Calculate confidence for each measurement
    const headTiltConfidence = (leftEye.visibility + rightEye.visibility) / 2;
    const shoulderConfidence = (leftShoulder.visibility + rightShoulder.visibility) / 2;
    const hipConfidence = (leftHip.visibility + rightHip.visibility) / 2;
    
    return {
        headTilt: {
            value: rawHeadTilt,
            unit: 'degrees',
            confidence: headTiltConfidence * calibration.confidence
        },
        shoulderAsymmetry: {
            value: shoulderAsymmetryCm,
            unit: 'cm',  // FIXED: Real-world unit
            confidence: shoulderConfidence * calibration.confidence
        },
        hipAsymmetry: {
            value: hipAsymmetryCm,
            unit: 'cm',  // FIXED: Real-world unit
            confidence: hipConfidence * calibration.confidence
        },
        severity: {
            headTilt: getSeverity(rawHeadTilt, [5, 10, 15]),
            shoulderAsymmetry: getSeverity(shoulderAsymmetryCm, [1, 2, 3]), // cm thresholds
            hipAsymmetry: getSeverity(hipAsymmetryCm, [1, 2, 3])           // cm thresholds
        },
        postureScore: calculatePostureScore(rawHeadTilt, shoulderAsymmetryCm, hipAsymmetryCm),
        calibration: calibration
    };
}

/**
 * Calculate overall posture score
 */
function calculatePostureScore(headTilt, shoulderAsymmetry, hipAsymmetry) {
    // Weight factors for each measurement
    const weights = {
        headTilt: 0.3,
        shoulder: 0.35,
        hip: 0.35
    };
    
    // Normalize to 0-100 scale
    const headScore = Math.max(0, 100 - (headTilt * 2));  // 0° = 100, 50° = 0
    const shoulderScore = Math.max(0, 100 - (shoulderAsymmetry * 20)); // 0cm = 100, 5cm = 0
    const hipScore = Math.max(0, 100 - (hipAsymmetry * 20)); // 0cm = 100, 5cm = 0
    
    return Math.round(
        headScore * weights.headTilt +
        shoulderScore * weights.shoulder +
        hipScore * weights.hip
    );
}

/**
 * FIXED: Analyze front view with proper calibration
 * @param {Array} landmarks - Pose landmarks
 * @param {number} patientHeight - Patient height in cm
 * @param {Object} imageMetadata - Image metadata
 * @returns {Object} Front view analysis
 */
export function analyzeFrontView(landmarks, patientHeight = 170, imageMetadata = null) {
    const leftShoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];
    const leftHip = landmarks[LANDMARKS.LEFT_HIP];
    const rightHip = landmarks[LANDMARKS.RIGHT_HIP];
    const leftKnee = landmarks[LANDMARKS.LEFT_KNEE];
    const rightKnee = landmarks[LANDMARKS.RIGHT_KNEE];
    const leftAnkle = landmarks[LANDMARKS.LEFT_ANKLE];
    const rightAnkle = landmarks[LANDMARKS.RIGHT_ANKLE];
    
    // Get calibration
    const calibration = establishCalibration(landmarks, patientHeight, imageMetadata);
    
    // Q-Angle calculation
    const leftQAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightQAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    const avgQAngle = (leftQAngle + rightQAngle) / 2;
    
    // Weight distribution (as percentage)
    const centerOfMass = calculateCenterOfMass(landmarks);
    const bodyMidline = (leftHip.x + rightHip.x) / 2;
    const weightShift = ((centerOfMass.x - bodyMidline) / Math.abs(leftHip.x - rightHip.x)) * 100;
    
    // Shoulder level difference in cm
    const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y) * (imageMetadata?.height || 1000) / calibration.pixelsPerCm;
    
    // Hip level difference in cm
    const hipDiff = Math.abs(leftHip.y - rightHip.y) * (imageMetadata?.height || 1000) / calibration.pixelsPerCm;
    
    return {
        qAngle: {
            left: leftQAngle,
            right: rightQAngle,
            average: avgQAngle,
            unit: 'degrees',
            confidence: (leftKnee.visibility + rightKnee.visibility + leftAnkle.visibility + rightAnkle.visibility) / 4
        },
        shoulderLevel: {
            difference: shoulderDiff,
            unit: 'cm',
            higher: leftShoulder.y < rightShoulder.y ? 'left' : 'right',
            confidence: (leftShoulder.visibility + rightShoulder.visibility) / 2
        },
        hipLevel: {
            difference: hipDiff,
            unit: 'cm',
            higher: leftHip.y < rightHip.y ? 'left' : 'right',
            confidence: (leftHip.visibility + rightHip.visibility) / 2
        },
        weightDistribution: {
            left: 50 - weightShift,
            right: 50 + weightShift,
            unit: 'percent',
            confidence: calibration.confidence
        },
        calibration: calibration
    };
}

/**
 * FIXED: Analyze side view with proper calibration
 * @param {Array} landmarks - Pose landmarks
 * @param {number} patientHeight - Patient height in cm
 * @param {Object} imageMetadata - Image metadata
 * @returns {Object} Side view analysis
 */
export function analyzeSideView(landmarks, patientHeight = 170, imageMetadata = null) {
    const nose = landmarks[LANDMARKS.NOSE];
    const shoulder = landmarks[LANDMARKS.LEFT_SHOULDER] || landmarks[LANDMARKS.RIGHT_SHOULDER];
    const hip = landmarks[LANDMARKS.LEFT_HIP] || landmarks[LANDMARKS.RIGHT_HIP];
    const knee = landmarks[LANDMARKS.LEFT_KNEE] || landmarks[LANDMARKS.RIGHT_KNEE];
    const ankle = landmarks[LANDMARKS.LEFT_ANKLE] || landmarks[LANDMARKS.RIGHT_ANKLE];
    const ear = landmarks[LANDMARKS.LEFT_EAR] || landmarks[LANDMARKS.RIGHT_EAR];
    
    // Get calibration
    const calibration = establishCalibration(landmarks, patientHeight, imageMetadata);
    
    // Forward head posture in cm
    const shoulderLine = shoulder.x;
    const earPosition = ear ? ear.x : nose.x;
    const forwardHeadPixels = Math.abs(earPosition - shoulderLine) * (imageMetadata?.width || 1000);
    const forwardHeadCm = forwardHeadPixels / calibration.pixelsPerCm;
    
    // Pelvic tilt angle
    const pelvicAngle = calculateAngle(
        { x: hip.x - 0.1, y: hip.y },
        hip,
        { x: hip.x + 0.1, y: hip.y }
    );
    
    // Knee flexion angle
    const kneeAngle = calculateAngle(hip, knee, ankle);
    
    // Spinal curvature analysis
    const spinePoints = extractSpinePoints(landmarks);
    const spinalDeviation = calculateMaxDeviation(spinePoints) * (imageMetadata?.width || 1000) / calibration.pixelsPerCm;
    
    return {
        forwardHead: {
            value: forwardHeadCm,
            unit: 'cm',
            confidence: (ear?.visibility || nose.visibility) * calibration.confidence
        },
        pelvicTilt: {
            value: pelvicAngle,
            unit: 'degrees',
            confidence: hip.visibility
        },
        kneeFlexion: {
            value: kneeAngle,
            unit: 'degrees',
            confidence: (hip.visibility + knee.visibility + ankle.visibility) / 3
        },
        spinalCurvature: {
            deviation: spinalDeviation,
            unit: 'cm',
            confidence: calibration.confidence
        },
        calibration: calibration
    };
}

/**
 * Analyze back view
 * @param {Array} landmarks - Pose landmarks
 * @param {number} patientHeight - Patient height in cm
 * @param {Object} imageMetadata - Image metadata
 * @returns {Object} Back view analysis
 */
export function analyzeBackView(landmarks, patientHeight = 170, imageMetadata = null) {
    const data = analyzeFrontView(landmarks, patientHeight, imageMetadata);
    
    // Additional back-specific analysis
    const leftShoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];
    
    // Get calibration
    const calibration = data.calibration;
    
    // Scapular winging assessment (simplified)
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x) * (imageMetadata?.width || 1000) / calibration.pixelsPerCm;
    
    data.scapularSymmetry = {
        shoulderWidth: shoulderWidth,
        unit: 'cm',
        confidence: (leftShoulder.visibility + rightShoulder.visibility) / 2
    };
    
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
    
    // Check if we have the new format with value/unit or old format
    const getMetricValue = (metric) => {
        if (typeof metric === 'object' && metric.value !== undefined) {
            return metric.value;
        }
        return metric;
    };
    
    const forwardHead = getMetricValue(metrics.forwardHead);
    const shoulderAsymmetry = getMetricValue(metrics.shoulderAsymmetry);
    const spinalDeviation = getMetricValue(metrics.spinalCurvature?.deviation || metrics.spinalDeviation);
    
    if (forwardHead && forwardHead > 2) { // 2cm threshold
        exercises.push({
            name: 'Chin Tucks',
            description: '3 x 10 reps, hold 5 seconds',
            targetArea: 'Neck alignment'
        });
    }
    
    if (shoulderAsymmetry && shoulderAsymmetry > 1) { // 1cm threshold
        exercises.push({
            name: 'Shoulder Shrugs',
            description: '3 x 15 reps, focus on symmetry',
            targetArea: 'Shoulder balance'
        });
    }
    
    if (spinalDeviation && spinalDeviation > 2) { // 2cm threshold
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
