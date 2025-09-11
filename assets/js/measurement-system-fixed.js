/**
 * Measurement System Module - FIXED VERSION
 * Provides unified measurement handling with proper unit tracking and calibration
 * Ensures clinical accuracy and consistency across the application
 */

/**
 * Enumeration of measurement units used in the application
 * @enum {string}
 */
export const MeasurementUnit = {
    PIXELS: 'px',
    CENTIMETERS: 'cm',
    MILLIMETERS: 'mm',
    PERCENTAGE: '%',
    DEGREES: 'deg',
    RADIANS: 'rad',
    NORMALIZED: 'norm' // 0-1 normalized values
};

/**
 * Measurement confidence levels
 * @enum {string}
 */
export const ConfidenceLevel = {
    HIGH: 'high',      // > 0.8
    MEDIUM: 'medium',  // 0.5 - 0.8
    LOW: 'low',        // < 0.5
    UNCALIBRATED: 'uncalibrated'
};

/**
 * Singleton calibration manager
 */
export class CalibrationManager {
    static instance = null;
    
    constructor() {
        this.calibrationData = null;
        this.confidence = 0;
    }
    
    static getInstance() {
        if (!CalibrationManager.instance) {
            CalibrationManager.instance = new CalibrationManager();
        }
        return CalibrationManager.instance;
    }
    
    setCalibration(data) {
        this.calibrationData = data;
        this.confidence = data.method === 'manual' ? 0.95 : data.confidence || 0.7;
    }
    
    getCalibration() {
        return this.calibrationData;
    }
    
    getConfidence() {
        return this.confidence;
    }
    
    isCalibrated() {
        return this.calibrationData !== null;
    }
    
    reset() {
        this.calibrationData = null;
        this.confidence = 0;
    }
}

/**
 * Class representing a measurement value with unit tracking and conversion
 */
export class MeasurementValue {
    /**
     * Create a new measurement value
     * @param {number} rawValue - The raw measurement value
     * @param {string} unit - The unit of measurement (from MeasurementUnit enum)
     * @param {Object} metadata - Additional metadata
     * @param {Object} metadata.calibrationData - Calibration information if available
     * @param {number} metadata.confidence - Confidence score (0-1)
     * @param {string} metadata.source - Source of the measurement (e.g., 'mediapipe', 'manual')
     * @param {Date} metadata.timestamp - When the measurement was taken
     */
    constructor(rawValue, unit, metadata = {}) {
        this.rawValue = rawValue;
        this.unit = unit;
        this.calibrationData = metadata.calibrationData || CalibrationManager.getInstance().getCalibration();
        this.confidence = metadata.confidence || 0;
        this.source = metadata.source || 'unknown';
        this.timestamp = metadata.timestamp || new Date();
        
        // Calculate confidence level
        this.confidenceLevel = this._calculateConfidenceLevel();
    }

    /**
     * Calculate confidence level based on numeric confidence
     * @private
     * @returns {string} Confidence level from ConfidenceLevel enum
     */
    _calculateConfidenceLevel() {
        if (!this.calibrationData) return ConfidenceLevel.UNCALIBRATED;
        if (this.confidence > 0.8) return ConfidenceLevel.HIGH;
        if (this.confidence > 0.5) return ConfidenceLevel.MEDIUM;
        return ConfidenceLevel.LOW;
    }

    /**
     * Get display value with appropriate unit conversion
     * @returns {number} Value converted for display
     */
    get displayValue() {
        if (this.calibrationData && this.unit === MeasurementUnit.PIXELS) {
            return this.convertTo(MeasurementUnit.CENTIMETERS);
        }
        return this.rawValue;
    }

    /**
     * Get formatted display string with unit
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted measurement string
     */
    getDisplayString(decimals = 2) {
        const value = this.displayValue;
        const unit = this.displayUnit;
        
        // Special formatting for percentages
        if (unit === MeasurementUnit.PERCENTAGE || unit === '%') {
            return `${value.toFixed(decimals)}%`;
        }
        
        // Special formatting for degrees
        if (unit === MeasurementUnit.DEGREES || unit === 'deg' || unit === 'degrees') {
            return `${value.toFixed(decimals)}°`;
        }
        
        // Special formatting for cm
        if (unit === MeasurementUnit.CENTIMETERS || unit === 'cm') {
            return `${value.toFixed(decimals)} cm`;
        }
        
        // Special formatting for mm
        if (unit === MeasurementUnit.MILLIMETERS || unit === 'mm') {
            return `${value.toFixed(decimals)} mm`;
        }
        
        // Default formatting
        return `${value.toFixed(decimals)} ${unit}`;
    }

    /**
     * Get the display unit (what should be shown to user)
     * @returns {string} Display unit
     */
    get displayUnit() {
        if (this.calibrationData && this.unit === MeasurementUnit.PIXELS) {
            return MeasurementUnit.CENTIMETERS;
        }
        if (this.unit === MeasurementUnit.NORMALIZED) {
            return MeasurementUnit.PERCENTAGE;
        }
        return this.unit;
    }

    /**
     * Convert measurement to a different unit
     * @param {string} targetUnit - Target unit from MeasurementUnit enum
     * @returns {number} Converted value
     */
    convertTo(targetUnit) {
        // Same unit, no conversion needed
        if (this.unit === targetUnit) {
            return this.rawValue;
        }

        // Pixels to real-world units (requires calibration)
        if (this.unit === MeasurementUnit.PIXELS) {
            if (!this.calibrationData || !this.calibrationData.pixelsPerCm) {
                console.warn('Cannot convert pixels without calibration');
                return this.rawValue; // Return raw value as fallback
            }
            
            const pixelsPerCm = this.calibrationData.pixelsPerCm;
            
            switch (targetUnit) {
                case MeasurementUnit.CENTIMETERS:
                case 'cm':
                    return this.rawValue / pixelsPerCm;
                case MeasurementUnit.MILLIMETERS:
                case 'mm':
                    return (this.rawValue / pixelsPerCm) * 10;
                default:
                    console.warn(`Cannot convert from ${this.unit} to ${targetUnit}`);
                    return this.rawValue;
            }
        }

        // Normalized to percentage
        if (this.unit === MeasurementUnit.NORMALIZED && targetUnit === MeasurementUnit.PERCENTAGE) {
            return this.rawValue * 100;
        }

        // Degrees to radians
        if (this.unit === MeasurementUnit.DEGREES && targetUnit === MeasurementUnit.RADIANS) {
            return this.rawValue * (Math.PI / 180);
        }
        
        // Radians to degrees
        if (this.unit === MeasurementUnit.RADIANS && targetUnit === MeasurementUnit.DEGREES) {
            return this.rawValue * (180 / Math.PI);
        }
        
        console.warn(`Conversion from ${this.unit} to ${targetUnit} not implemented`);
        return this.rawValue;
    }

    /**
     * Get confidence percentage
     * @returns {number} Confidence as percentage (0-100)
     */
    getConfidencePercentage() {
        return Math.round(this.confidence * 100);
    }

    /**
     * Check if measurement is reliable
     * @returns {boolean} True if confidence is medium or high
     */
    isReliable() {
        return this.confidenceLevel === ConfidenceLevel.HIGH || 
               this.confidenceLevel === ConfidenceLevel.MEDIUM;
    }

    /**
     * Create a formatted object for database storage
     * @returns {Object} Serializable measurement object
     */
    toJSON() {
        return {
            value: this.rawValue,
            unit: this.unit,
            displayValue: this.displayValue,
            displayUnit: this.displayUnit,
            confidence: this.confidence,
            confidenceLevel: this.confidenceLevel,
            source: this.source,
            timestamp: this.timestamp.toISOString(),
            calibrated: !!this.calibrationData
        };
    }
}

/**
 * Helper function to create a measurement with proper calibration
 * @param {string} type - Measurement type (e.g., 'shoulderAsymmetry')
 * @param {number} value - Raw measurement value
 * @param {string} unit - Unit of measurement
 * @param {Object} landmarks - Pose landmarks for confidence calculation
 * @returns {MeasurementValue} Properly calibrated measurement
 */
export function createMeasurement(type, value, unit, landmarks = null) {
    const calibration = CalibrationManager.getInstance().getCalibration();
    
    // Calculate confidence based on landmarks if provided
    let confidence = 0.5;
    if (landmarks) {
        confidence = calculateMeasurementConfidence(type, landmarks);
    }
    
    return new MeasurementValue(value, unit, {
        calibrationData: calibration,
        confidence: confidence,
        source: 'mediapipe'
    });
}

/**
 * Calculate confidence for a specific measurement type
 * @param {string} type - Measurement type
 * @param {Array} landmarks - Pose landmarks
 * @returns {number} Confidence score (0-1)
 */
function calculateMeasurementConfidence(type, landmarks) {
    const landmarkMap = {
        'shoulderAsymmetry': [11, 12], // Left and right shoulder
        'hipAsymmetry': [23, 24], // Left and right hip
        'forwardHead': [0, 7, 8, 11, 12], // Nose, ears, shoulders
        'qAngle': [23, 24, 25, 26, 27, 28], // Hips, knees, ankles
        'spinalDeviation': [0, 11, 12, 23, 24] // Key spine points
    };
    
    const relevantIndices = landmarkMap[type] || [11, 12, 23, 24]; // Default key points
    
    // Calculate average visibility of relevant landmarks
    let totalVisibility = 0;
    let count = 0;
    
    relevantIndices.forEach(idx => {
        if (landmarks[idx]) {
            totalVisibility += landmarks[idx].visibility || 0;
            count++;
        }
    });
    
    const avgVisibility = count > 0 ? totalVisibility / count : 0.5;
    
    // Apply calibration confidence modifier
    const calibration = CalibrationManager.getInstance();
    const calibrationConfidence = calibration.getConfidence();
    
    // Combined confidence
    return avgVisibility * 0.7 + calibrationConfidence * 0.3;
}

/**
 * Format measurement for display
 * @param {Object} measurement - Measurement object (raw or MeasurementValue)
 * @returns {string} Formatted display string
 */
export function formatMeasurement(measurement) {
    // Handle MeasurementValue instances
    if (measurement instanceof MeasurementValue) {
        return measurement.getDisplayString(1);
    }
    
    // Handle raw measurement objects with value/unit structure
    if (typeof measurement === 'object' && measurement.value !== undefined) {
        const value = measurement.value;
        const unit = measurement.unit;
        
        if (unit === 'degrees' || unit === 'deg') {
            return `${value.toFixed(1)}°`;
        }
        if (unit === 'percent' || unit === '%') {
            return `${value.toFixed(1)}%`;
        }
        if (unit === 'cm') {
            return `${value.toFixed(1)} cm`;
        }
        if (unit === 'mm') {
            return `${value.toFixed(0)} mm`;
        }
        
        return `${value.toFixed(1)} ${unit}`;
    }
    
    // Handle simple numeric values
    if (typeof measurement === 'number') {
        return measurement.toFixed(1);
    }
    
    return String(measurement);
}

// Export singleton instance for global access
export const calibrationManager = CalibrationManager.getInstance();
