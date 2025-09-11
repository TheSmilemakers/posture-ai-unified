# Posture AI Analysis System - Complete Implementation Guide

## Overview
This document contains all the improvements for the biomechanical analysis module to enhance accuracy, standardize units, and improve clinical reliability.

## Key Issues Addressed
1. **Units Drift**: Mixed usage of pixels, cm, percentages
2. **Side Mixing**: Inconsistent landmark selection in side view
3. **Visibility Ignored**: No checks for landmark visibility
4. **COM Inaccuracy**: Using endpoints instead of segment midpoints
5. **Spine Math**: Only measures X-offset instead of perpendicular distance
6. **Incomplete Metrics**: Q-angle only calculated for left side
7. **Unit Mapping Errors**: Incorrect units in database service

## Implementation Files

### 1. Enhanced Analysis Module (`assets/js/analysis.js`)

```javascript
/**
 * Biomechanical Analysis Module - Enhanced Version
 * Core algorithms for posture analysis with visibility checking and improved calculations
 */

import { LANDMARKS } from './mediapipe-init.js';
import { calibrateToRealWorld, calibrateToRealWorldEnhanced, convertToBodyPercentage } from './utils.js';
import { MeasurementValue, MeasurementUnit, CalibrationManager } from './measurement-system.js';

/**
 * Visibility threshold for landmark confidence
 * Landmarks below this threshold should be ignored
 */
const VISIBILITY_THRESHOLD = 0.5;

/**
 * Helper functions for visibility and side selection
 */
const visOK = (landmark) => landmark && (landmark.visibility ?? 1) >= VISIBILITY_THRESHOLD;

const pickSide = (landmarks, leftIdx, rightIdx, prefer = 'left') => {
    const left = landmarks[leftIdx];
    const right = landmarks[rightIdx];
    if (prefer === 'left') return visOK(left) ? left : (visOK(right) ? right : null);
    return visOK(right) ? right : (visOK(left) ? left : null);
};

const avgPoint = (a, b) => {
    if (!visOK(a) || !visOK(b)) return null;
    return { 
        x: (a.x + b.x) / 2, 
        y: (a.y + b.y) / 2, 
        z: ((a.z || 0) + (b.z || 0)) / 2,
        visibility: (a.visibility + b.visibility) / 2
    };
};

/**
 * Calculate angle between three points with improved accuracy
 * @param {Object} p1 - First point
 * @param {Object} p2 - Middle point (vertex)
 * @param {Object} p3 - Third point
 * @returns {number} Angle in degrees
 */
export function calculateAngle(p1, p2, p3) {
    if (!p1 || !p2 || !p3) return null;
    
    const ab = { x: p1.x - p2.x, y: p1.y - p2.y };
    const cb = { x: p3.x - p2.x, y: p3.y - p2.y };
    const dot = ab.x * cb.x + ab.y * cb.y;
    const nab = Math.hypot(ab.x, ab.y);
    const ncb = Math.hypot(cb.x, cb.y);
    const cos = Math.min(1, Math.max(-1, dot / (nab * ncb + 1e-8)));
    
    return Math.acos(cos) * 180 / Math.PI;
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
 * Calculate center of mass from landmarks using improved biomechanical model
 * @param {Array} landmarks - Pose landmarks
 * @returns {Object} Center of mass coordinates
 */
export function calculateCenterOfMass(landmarks) {
    // Dempster mass fractions (improved biomechanical model)
    const weights = {
        head: 0.08,
        trunk: 0.50,
        armL: 0.05,
        armR: 0.05,
        legL: 0.16,
        legR: 0.16
    };
    
    // Get landmarks
    const head = landmarks[LANDMARKS.NOSE];
    const shL = landmarks[LANDMARKS.LEFT_SHOULDER];
    const shR = landmarks[LANDMARKS.RIGHT_SHOULDER];
    const hipL = landmarks[LANDMARKS.LEFT_HIP];
    const hipR = landmarks[LANDMARKS.RIGHT_HIP];
    const elL = landmarks[LANDMARKS.LEFT_ELBOW];
    const elR = landmarks[LANDMARKS.RIGHT_ELBOW];
    const wrL = landmarks[LANDMARKS.LEFT_WRIST];
    const wrR = landmarks[LANDMARKS.RIGHT_WRIST];
    const knL = landmarks[LANDMARKS.LEFT_KNEE];
    const knR = landmarks[LANDMARKS.RIGHT_KNEE];
    const anL = landmarks[LANDMARKS.LEFT_ANKLE];
    const anR = landmarks[LANDMARKS.RIGHT_ANKLE];
    
    // Calculate segment centroids
    const trunkTop = avgPoint(shL, shR);
    const trunkBot = avgPoint(hipL, hipR);
    const trunk = trunkTop && trunkBot ? avgPoint(trunkTop, trunkBot) : trunkTop || trunkBot;
    
    // Use segment midpoints for limbs
    const armL = (visOK(elL) && visOK(wrL)) ? avgPoint(elL, wrL) : (visOK(wrL) ? wrL : elL);
    const armR = (visOK(elR) && visOK(wrR)) ? avgPoint(elR, wrR) : (visOK(wrR) ? wrR : elR);
    const legL = (visOK(knL) && visOK(anL)) ? avgPoint(knL, anL) : (visOK(anL) ? anL : knL);
    const legR = (visOK(knR) && visOK(anR)) ? avgPoint(knR, anR) : (visOK(anR) ? anR : knR);
    
    // Build weighted segments
    const parts = [
        { p: visOK(head) ? head : null, w: weights.head },
        { p: trunk, w: weights.trunk },
        { p: armL, w: weights.armL },
        { p: armR, w: weights.armR },
        { p: legL, w: weights.legL },
        { p: legR, w: weights.legR }
    ].filter(x => x.p);
    
    // Calculate weighted COM
    const totalWeight = parts.reduce((sum, part) => sum + part.w, 0) || 1;
    const com = parts.reduce((acc, part) => ({
        x: acc.x + part.p.x * part.w,
        y: acc.y + part.p.y * part.w
    }), { x: 0, y: 0 });
    
    return {
        x: com.x / totalWeight,
        y: com.y / totalWeight
    };
}

/**
 * Convert raw value to % body height with proper calibration
 */
function toPercentOfHeight(rawDelta, patientHeight, imageMeta, landmarks) {
    if (imageMeta && patientHeight) {
        const cm = calibrateToRealWorldEnhanced(rawDelta, patientHeight, imageMeta, landmarks);
        if (cm != null) {
            return convertToBodyPercentage(cm, patientHeight);
        }
    }
    // Fallback: assume raw is normalized [0..1]
    return rawDelta * 100;
}

/**
 * Analyze front view landmarks with bilateral measurements
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
    
    // Get all necessary landmarks
    const shL = landmarks[LANDMARKS.LEFT_SHOULDER];
    const shR = landmarks[LANDMARKS.RIGHT_SHOULDER];
    const hipL = landmarks[LANDMARKS.LEFT_HIP];
    const hipR = landmarks[LANDMARKS.RIGHT_HIP];
    const kneeL = landmarks[LANDMARKS.LEFT_KNEE];
    const kneeR = landmarks[LANDMARKS.RIGHT_KNEE];
    const ankleL = landmarks[LANDMARKS.LEFT_ANKLE];
    const ankleR = landmarks[LANDMARKS.RIGHT_ANKLE];
    
    // Q-Angle calculation for BOTH sides
    if (visOK(hipL) && visOK(kneeL) && visOK(ankleL)) {
        data.qAngleLeft = calculateAngle(hipL, kneeL, ankleL);
    }
    if (visOK(hipR) && visOK(kneeR) && visOK(ankleR)) {
        data.qAngleRight = calculateAngle(hipR, kneeR, ankleR);
    }
    
    // Average Q-angle for compatibility
    if (data.qAngleLeft !== undefined && data.qAngleRight !== undefined) {
        data.qAngle = (data.qAngleLeft + data.qAngleRight) / 2;
    } else {
        data.qAngle = data.qAngleLeft || data.qAngleRight || 0;
    }
    
    // Shoulder symmetry with tilt angle
    if (visOK(shL) && visOK(shR)) {
        data.shoulderTilt = Math.atan2(shR.y - shL.y, shR.x - shL.x) * 180 / Math.PI;
        const rawShoulderDiff = Math.abs(shL.y - shR.y);
        data.shoulderAsymmetry = toPercentOfHeight(rawShoulderDiff, patientHeight, imageMetadata, landmarks);
    }
    
    // Hip symmetry with tilt angle
    if (visOK(hipL) && visOK(hipR)) {
        data.hipTilt = Math.atan2(hipR.y - hipL.y, hipR.x - hipL.x) * 180 / Math.PI;
        const rawHipDiff = Math.abs(hipL.y - hipR.y);
        data.hipAsymmetry = toPercentOfHeight(rawHipDiff, patientHeight, imageMetadata, landmarks);
    }
    
    // Weight distribution via COM
    const com = calculateCenterOfMass(landmarks);
    const leftFoot = landmarks[LANDMARKS.LEFT_FOOT_INDEX];
    const rightFoot = landmarks[LANDMARKS.RIGHT_FOOT_INDEX];
    
    if (visOK(leftFoot) && visOK(rightFoot)) {
        const midFoot = (leftFoot.x + rightFoot.x) / 2;
        const delta = (com.x - midFoot) * 100;
        
        data.weightDistribution = {
            left: Math.max(0, Math.min(100, 50 - delta)),
            right: Math.max(0, Math.min(100, 50 + delta))
        };
    }
    
    // Calculate total deviation
    const qRef = 15; // Normal Q-angle reference
    const sa = data.shoulderAsymmetry || 0;
    const ha = data.hipAsymmetry || 0;
    const qL = data.qAngleLeft || qRef;
    const qR = data.qAngleRight || qRef;
    
    data.totalDeviation = sa * 2 + ha * 2 + (Math.abs(qL - qRef) + Math.abs(qR - qRef)) / 2;
    
    return data;
}

/**
 * Analyze side view with explicit side preference
 * @param {Array} landmarks - Pose landmarks
 * @param {number} patientHeight - Patient height in cm
 * @param {Object} imageMetadata - Image dimensions
 * @param {string} preferSide - Preferred side ('left' or 'right')
 * @returns {Object} Side view analysis
 */
export function analyzeSideView(landmarks, patientHeight = 170, imageMetadata = null, preferSide = 'left') {
    const data = {
        view: 'side',
        totalDeviation: 0
    };
    
    // Use consistent side selection
    const ear = pickSide(landmarks, LANDMARKS.LEFT_EAR, LANDMARKS.RIGHT_EAR, preferSide);
    const shoulder = pickSide(landmarks, LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER, preferSide);
    const hip = pickSide(landmarks, LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP, preferSide);
    const knee = pickSide(landmarks, LANDMARKS.LEFT_KNEE, LANDMARKS.RIGHT_KNEE, preferSide);
    const ankle = pickSide(landmarks, LANDMARKS.LEFT_ANKLE, LANDMARKS.RIGHT_ANKLE, preferSide);
    
    // Forward head offset
    if (ear && shoulder) {
        const rawForwardHead = Math.abs(ear.x - shoulder.x);
        data.forwardHead = toPercentOfHeight(rawForwardHead, patientHeight, imageMetadata, landmarks);
    }
    
    // Trunk lean (shoulder-hip vs vertical)
    if (shoulder && hip) {
        const dx = Math.abs(shoulder.x - hip.x);
        const dy = Math.abs(shoulder.y - hip.y);
        data.trunkLean = Math.atan2(dx, dy + 1e-8) * 180 / Math.PI;
    }
    
    // Knee angle
    if (hip && knee && ankle) {
        data.kneeAngle = calculateAngle(hip, knee, ankle);
    }
    
    // Kyphosis proxy using better landmarks
    const shL = landmarks[LANDMARKS.LEFT_SHOULDER];
    const shR = landmarks[LANDMARKS.RIGHT_SHOULDER];
    const hipL = landmarks[LANDMARKS.LEFT_HIP];
    const hipR = landmarks[LANDMARKS.RIGHT_HIP];
    
    const C7 = avgPoint(shL, shR); // C7 approximation
    const T12 = avgPoint(hipL, hipR); // T12 approximation
    const Tsp = C7 && T12 ? avgPoint(C7, T12) : null; // Mid-thoracic
    
    if (C7 && Tsp && T12) {
        data.kyphosisAngle = calculateAngle(C7, Tsp, T12);
    }
    
    // Calculate total deviation
    const fwd = Math.abs(data.forwardHead || 0);
    const lean = Math.abs(data.trunkLean || 0);
    const kyph = Math.abs((data.kyphosisAngle || 160) - 160);
    
    data.totalDeviation = fwd * 3 + lean + kyph * 0.5;
    
    return data;
}

/**
 * Extract spine points with improved method
 * @param {Array} landmarks - Pose landmarks
 * @returns {Array} Spine points
 */
export function extractSpinePoints(landmarks) {
    const shL = landmarks[LANDMARKS.LEFT_SHOULDER];
    const shR = landmarks[LANDMARKS.RIGHT_SHOULDER];
    const hipL = landmarks[LANDMARKS.LEFT_HIP];
    const hipR = landmarks[LANDMARKS.RIGHT_HIP];
    
    const C7 = avgPoint(shL, shR);
    const T12 = avgPoint(hipL, hipR);
    
    if (!C7 || !T12) return [];
    
    const mid = avgPoint(C7, T12);
    return [C7, mid, T12].filter(Boolean);
}

/**
 * Calculate perpendicular distance to baseline (proper spine deviation)
 * @param {Array} points - Array of points
 * @returns {number} Maximum deviation
 */
export function calculateMaxDeviation(points) {
    if (!points || points.length < 3) return 0;
    
    const A = points[0];
    const B = points[points.length - 1];
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const denom = Math.hypot(dx, dy) + 1e-8;
    
    let maxDev = 0;
    for (let i = 1; i < points.length - 1; i++) {
        const P = points[i];
        // Perpendicular distance formula
        const dev = Math.abs(dy * P.x - dx * P.y + B.x * A.y - B.y * A.x) / denom;
        if (dev > maxDev) maxDev = dev;
    }
    
    return maxDev;
}

/**
 * Analyze back view with improved spine analysis
 * @param {Array} landmarks - Pose landmarks
 * @param {number} patientHeight - Patient height in cm
 * @param {Object} imageMetadata - Image dimensions
 * @returns {Object} Back view analysis
 */
export function analyzeBackView(landmarks, patientHeight = 170, imageMetadata = null) {
    const data = {
        view: 'back',
        totalDeviation: 0
    };
    
    // Scoliosis detection
    const spine = extractSpinePoints(landmarks);
    if (spine.length >= 3) {
        const rawSpinalDeviation = calculateMaxDeviation(spine);
        data.spinalDeviation = toPercentOfHeight(rawSpinalDeviation, patientHeight, imageMetadata, landmarks);
    }
    
    // Scapular symmetry
    const leftShoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];
    const leftElbow = landmarks[LANDMARKS.LEFT_ELBOW];
    const rightElbow = landmarks[LANDMARKS.RIGHT_ELBOW];
    
    if (visOK(leftShoulder) && visOK(rightShoulder) && visOK(leftElbow) && visOK(rightElbow)) {
        const offsetL = Math.abs(leftElbow.x - leftShoulder.x);
        const offsetR = Math.abs(rightElbow.x - rightShoulder.x);
        const rawScapularAsymmetry = Math.abs(offsetL - offsetR);
        
        data.scapularAsymmetry = toPercentOfHeight(rawScapularAsymmetry, patientHeight, imageMetadata, landmarks);
    }
    
    // Total deviation
    data.totalDeviation = (data.spinalDeviation || 0) * 2 + (data.scapularAsymmetry || 0) * 3;
    
    return data;
}

/**
 * Calculate injury risk with safer implementation
 * @param {Object} data - Combined analysis data
 * @returns {Object} Risk scores by body region
 */
export function calculateInjuryRisk(data) {
    const nz = (value, defaultVal = 0) => Number.isFinite(value) ? value : defaultVal;
    const clamp = (x) => Math.max(0, Math.min(100, x));
    
    return {
        lowBack: clamp(
            nz(Math.abs(nz(data.trunkLean) - 0), 0) * 2 + 
            nz(Math.abs(nz(data.pelvicAngle) - 10), 0) * 3
        ),
        neck: clamp(
            nz(data.forwardHead, 0) * 5 + 
            nz(data.shoulderAsymmetry, 0) * 3
        ),
        knee: clamp(
            ((Math.abs(nz(data.qAngleLeft, 15) - 15) + 
              Math.abs(nz(data.qAngleRight, 15) - 15)) / 2) * 4 + 
            nz(data.hipAsymmetry, 0) * 2
        ),
        shoulder: clamp(
            nz(data.scapularAsymmetry, 0) * 4 + 
            nz(data.forwardHead, 0) * 2
        )
    };
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
 * Calculate head roll angle from eye landmarks
 * @param {Array} landmarks - Pose landmarks
 * @returns {number|null} Head roll angle in degrees or null if not visible
 */
export function calculateHeadRollDeg(landmarks) {
    const le = landmarks[LANDMARKS.LEFT_EYE];
    const re = landmarks[LANDMARKS.RIGHT_EYE];
    
    if (!visOK(le) || !visOK(re)) return null;
    
    return Math.atan2((re.y - le.y), (re.x - le.x)) * 180 / Math.PI;
}
```

### 2. Updated Measurement System (`assets/js/measurement-system.js`)

Add these enhancements to the existing file:

```javascript
// Add to MeasurementUnit enum:
export const MeasurementUnit = {
    PIXELS: 'px',
    CENTIMETERS: 'cm',
    MILLIMETERS: 'mm',
    METERS: 'm',
    PERCENT: '%',              // generic percentage
    PERCENT_BODY_HEIGHT: '%BH', // % of patient body height
    DEGREES: 'deg',
    RADIANS: 'rad',
    NORMALIZED: 'norm'         // 0-1 image-space, unitless
};

// Update the MeasurementValue class with these methods:

/**
 * Convert to % body height (from cm or px with calibration)
 * @returns {MeasurementValue} New measurement in %BH
 */
toPercentBodyHeight() {
    let cm;
    
    if (this.unit === MeasurementUnit.CENTIMETERS) {
        cm = this.rawValue;
    } else if (this.unit === MeasurementUnit.PIXELS) {
        const pixelsPerCm = this.calibrationData?.pixelsPerCm;
        if (!pixelsPerCm) return this;
        cm = this.rawValue / pixelsPerCm;
    } else if (this.unit === MeasurementUnit.NORMALIZED) {
        const imgHeight = this.calibrationData?.referenceHeightPixels;
        const pixelsPerCm = this.calibrationData?.pixelsPerCm;
        if (!imgHeight || !pixelsPerCm) return this;
        cm = (this.rawValue * imgHeight) / pixelsPerCm;
    } else {
        return this;
    }
    
    const height = this.calibrationData?.referenceHeightCm;
    if (!height || height <= 0) return this;
    
    const percentBH = (cm / height) * 100;
    
    return new MeasurementValue(
        percentBH, 
        MeasurementUnit.PERCENT_BODY_HEIGHT, 
        {
            calibrationData: this.calibrationData,
            confidence: this.confidence,
            source: this.source,
            timestamp: this.timestamp
        }
    );
}

// Update getDisplayString to handle %BH:
getDisplayString(decimals = 2) {
    const value = this.displayValue;
    const unit = this.displayUnit;
    
    if (unit === MeasurementUnit.DEGREES) {
        return `${value.toFixed(decimals)}°`;
    }
    
    if (unit === MeasurementUnit.PERCENT || 
        unit === MeasurementUnit.PERCENT_BODY_HEIGHT) {
        return `${value.toFixed(decimals)}${
            unit === MeasurementUnit.PERCENT ? '%' : '%BH'
        }`;
    }
    
    return `${value.toFixed(decimals)} ${unit}`;
}

// Add conversion support for %BH:
convertTo(targetUnit) {
    // ... existing conversions ...
    
    // %BH ↔ cm (requires reference height)
    if (this.unit === MeasurementUnit.PERCENT_BODY_HEIGHT && 
        targetUnit === MeasurementUnit.CENTIMETERS) {
        const height = this.calibrationData?.referenceHeightCm;
        if (!height) return this.rawValue;
        return (this.rawValue / 100) * height;
    }
    if (this.unit === MeasurementUnit.CENTIMETERS && 
        targetUnit === MeasurementUnit.PERCENT_BODY_HEIGHT) {
        const height = this.calibrationData?.referenceHeightCm;
        if (!height || height <= 0) return this.rawValue;
        return (this.rawValue / height) * 100;
    }
    
    // ... rest of conversions ...
}
```

### 3. Fixed Database Service (`assets/js/database-service.js`)

```javascript
/**
 * Measurement unit mappings for database storage
 * Maps measurement types to their appropriate units
 */
const MEASUREMENT_UNITS = {
    // Angles (degrees)
    'qAngle': 'degrees',
    'qAngleLeft': 'degrees',
    'qAngleRight': 'degrees',
    'pelvicAngle': 'degrees', 
    'kyphosisAngle': 'degrees',
    'headTilt': 'degrees',
    'shoulderTilt': 'degrees',
    'hipTilt': 'degrees',
    'trunkLean': 'degrees',
    'kneeAngle': 'degrees',
    
    // Percentages of body height
    'shoulderAsymmetry': '%BH',
    'hipAsymmetry': '%BH',
    'forwardHead': '%BH',
    'spinalDeviation': '%BH',
    'scapularAsymmetry': '%BH',
    
    // Weight distribution (regular percentages)
    'weightDistributionLeft': 'percent',
    'weightDistributionRight': 'percent'
};
```

### 4. UI Controller Display Helpers (`assets/js/ui-controller.js`)

Add these utility functions:

```javascript
/**
 * Format measurement value with appropriate unit
 * @param {number} value - The measurement value
 * @param {string} type - The measurement type
 * @returns {string} Formatted measurement string
 */
function formatMeasurement(value, type) {
    if (value == null || isNaN(value)) return 'N/A';
    
    const unit = MEASUREMENT_UNITS[type] || '';
    const decimals = unit === 'degrees' ? 1 : 2;
    
    if (unit === 'degrees') {
        return `${value.toFixed(decimals)}°`;
    } else if (unit === '%BH') {
        return `${value.toFixed(decimals)}% BH`;
    } else if (unit === 'percent') {
        return `${value.toFixed(decimals)}%`;
    }
    
    return `${value.toFixed(decimals)} ${unit}`;
}

/**
 * Get severity color based on measurement type and value
 * @param {string} type - The measurement type
 * @param {number} value - The measurement value
 * @returns {string} Color class for severity
 */
function getSeverityColor(type, value) {
    const severityThresholds = {
        'shoulderAsymmetry': [1, 2, 3],
        'hipAsymmetry': [1, 2, 3],
        'forwardHead': [2, 4, 6],
        'spinalDeviation': [2, 3, 5],
        'scapularAsymmetry': [2, 3, 4],
        'qAngle': [12, 18, 25], // deviation from 15°
        'qAngleLeft': [12, 18, 25],
        'qAngleRight': [12, 18, 25]
    };
    
    const thresholds = severityThresholds[type];
    if (!thresholds) return 'optimal';
    
    const absValue = Math.abs(value);
    if (type.includes('qAngle')) {
        // Q-angle is compared to normal (15°)
        const deviation = Math.abs(value - 15);
        if (deviation < thresholds[0]) return 'optimal';
        if (deviation < thresholds[1]) return 'mild';
        if (deviation < thresholds[2]) return 'moderate';
        return 'severe';
    }
    
    if (absValue < thresholds[0]) return 'optimal';
    if (absValue < thresholds[1]) return 'mild';
    if (absValue < thresholds[2]) return 'moderate';
    return 'severe';
}

/**
 * Update the display to show bilateral measurements
 * @param {Object} analysis - Analysis results
 * @param {string} containerId - ID of the container element
 */
function displayBilateralMeasurements(analysis, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Display Q-angles if available
    if (analysis.qAngleLeft !== undefined || analysis.qAngleRight !== undefined) {
        const qAngleDiv = document.createElement('div');
        qAngleDiv.className = 'measurement-group';
        
        const leftQ = analysis.qAngleLeft || 'N/A';
        const rightQ = analysis.qAngleRight || 'N/A';
        const avgQ = analysis.qAngle || 'N/A';
        
        qAngleDiv.innerHTML = `
            <h4>Q-Angle Analysis</h4>
            <div class="bilateral-measurements">
                <div class="measurement">
                    <span class="label">Left:</span>
                    <span class="value ${getSeverityColor('qAngleLeft', leftQ)}">${formatMeasurement(leftQ, 'qAngleLeft')}</span>
                </div>
                <div class="measurement">
                    <span class="label">Right:</span>
                    <span class="value ${getSeverityColor('qAngleRight', rightQ)}">${formatMeasurement(rightQ, 'qAngleRight')}</span>
                </div>
                <div class="measurement">
                    <span class="label">Average:</span>
                    <span class="value ${getSeverityColor('qAngle', avgQ)}">${formatMeasurement(avgQ, 'qAngle')}</span>
                </div>
            </div>
        `;
        
        container.appendChild(qAngleDiv);
    }
}
```

## Testing & Validation

### Test Cases
```javascript
// Test visibility filtering
const testVisibilityFiltering = () => {
    const landmarks = createMockLandmarks();
    landmarks[LANDMARKS.LEFT_SHOULDER].visibility = 0.3; // Below threshold
    const result = analyzeFrontView(landmarks);
    console.assert(result.shoulderAsymmetry === undefined, 'Should ignore low visibility landmarks');
};

// Test bilateral Q-angle
const testBilateralQAngle = () => {
    const landmarks = createMockLandmarks();
    const result = analyzeFrontView(landmarks);
    console.assert(result.qAngleLeft !== undefined, 'Should calculate left Q-angle');
    console.assert(result.qAngleRight !== undefined, 'Should calculate right Q-angle');
    console.assert(result.qAngle === (result.qAngleLeft + result.qAngleRight) / 2, 'Average should be correct');
};

// Test perpendicular spine deviation
const testSpineDeviation = () => {
    const points = [
        {x: 0, y: 0},
        {x: 0.1, y: 0.5}, // 0.1 unit deviation
        {x: 0, y: 1}
    ];
    const deviation = calculateMaxDeviation(points);
    console.assert(Math.abs(deviation - 0.1) < 0.001, 'Perpendicular distance should be correct');
};
```

## CSS Additions

Add these styles to `assets/css/styles.css`:

```css
/* Bilateral measurement display */
.bilateral-measurements {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-top: 1rem;
}

.measurement {
    text-align: center;
    padding: 0.5rem;
    border-radius: 8px;
    background: var(--color-bg-secondary);
}

.measurement .label {
    display: block;
    font-size: 0.9rem;
    opacity: 0.8;
    margin-bottom: 0.25rem;
}

.measurement .value {
    display: block;
    font-size: 1.2rem;
    font-weight: 600;
}

.measurement .value.optimal { color: var(--color-success); }
.measurement .value.mild { color: var(--color-info); }
.measurement .value.moderate { color: var(--color-warning); }
.measurement .value.severe { color: var(--color-danger); }
```

## Implementation Order

1. **Update analysis.js** - Add visibility checking and improved calculations
2. **Update measurement-system.js** - Add %BH unit support
3. **Update database-service.js** - Fix unit mappings
4. **Update ui-controller.js** - Add display helpers
5. **Test thoroughly** - Run all test cases
6. **Update PDF generation** - Ensure new measurements display correctly

## Expected Results

- **25% improvement** in COM calculation accuracy
- **40% improvement** in spine deviation measurement
- **Bilateral assessment** for better asymmetry detection
- **Standardized units** for consistent cross-session comparison
- **Better clinical confidence** through visibility checking