/**
 * Measurement System Module
 * Provides unified measurement handling with proper unit tracking
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
        this.calibrationData = metadata.calibrationData || null;
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
        const unit = this.calibrationData ? this.displayUnit : this.unit;
        
        // Special formatting for percentages
        if (unit === MeasurementUnit.PERCENTAGE) {
            return `${value.toFixed(decimals)}%`;
        }
        
        // Special formatting for degrees
        if (unit === MeasurementUnit.DEGREES) {
            return `${value.toFixed(decimals)}°`;
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
        if (this.unit === MeasurementUnit.PIXELS && this.calibrationData) {
            const pixelsPerCm = this.calibrationData.pixelsPerCm;
            
            switch (targetUnit) {
                case MeasurementUnit.CENTIMETERS:
                    return this.rawValue / pixelsPerCm;
                case MeasurementUnit.MILLIMETERS:
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
     * Create a copy with new calibration data
     * @param {Object} calibrationData - New calibration data
     * @returns {MeasurementValue} New measurement instance
     */
    withCalibration(calibrationData) {
        return new MeasurementValue(this.rawValue, this.unit, {
            calibrationData,
            confidence: this.confidence,
            source: this.source,
            timestamp: this.timestamp
        });
    }

    /**
     * Convert to database storage format
     * @returns {Object} Database-ready object
     */
    toDatabase() {
        return {
            raw_value: this.rawValue,
            unit: this.unit,
            converted_value: this.displayValue,
            display_unit: this.displayUnit,
            confidence: this.confidence,
            confidence_level: this.confidenceLevel,
            source: this.source,
            timestamp: this.timestamp.toISOString(),
            has_calibration: !!this.calibrationData
        };
    }

    /**
     * Create from database format
     * @param {Object} dbData - Database object
     * @param {Object} calibrationData - Optional calibration data
     * @returns {MeasurementValue} New measurement instance
     */
    static fromDatabase(dbData, calibrationData = null) {
        return new MeasurementValue(dbData.raw_value, dbData.unit, {
            calibrationData,
            confidence: dbData.confidence,
            source: dbData.source,
            timestamp: new Date(dbData.timestamp)
        });
    }
}

/**
 * Utility class for unit conversions
 */
export class UnitConverter {
    /**
     * Convert pixels to centimeters
     * @param {number} pixels - Pixel value
     * @param {number} pixelsPerCm - Calibration factor
     * @returns {number} Value in centimeters
     */
    static pixelsToCm(pixels, pixelsPerCm) {
        if (!pixelsPerCm || pixelsPerCm <= 0) {
            throw new Error('Invalid calibration: pixelsPerCm must be positive');
        }
        return pixels / pixelsPerCm;
    }

    /**
     * Convert normalized coordinates to percentage
     * @param {number} normalized - Normalized value (0-1)
     * @returns {number} Percentage value
     */
    static normalizedToPercentage(normalized) {
        return normalized * 100;
    }

    /**
     * Calculate real-world distance from image coordinates
     * @param {Object} point1 - First point {x, y}
     * @param {Object} point2 - Second point {x, y}
     * @param {Object} calibrationData - Calibration information
     * @returns {MeasurementValue} Distance measurement
     */
    static calculateRealDistance(point1, point2, calibrationData) {
        const pixelDistance = Math.sqrt(
            Math.pow(point2.x - point1.x, 2) + 
            Math.pow(point2.y - point1.y, 2)
        );

        return new MeasurementValue(pixelDistance, MeasurementUnit.PIXELS, {
            calibrationData,
            confidence: calibrationData ? 0.9 : 0.3,
            source: 'calculated'
        });
    }

    /**
     * Convert angle from radians to degrees
     * @param {number} radians - Angle in radians
     * @returns {MeasurementValue} Angle in degrees
     */
    static radiansToDegrees(radians) {
        const degrees = radians * (180 / Math.PI);
        return new MeasurementValue(degrees, MeasurementUnit.DEGREES, {
            confidence: 1.0,
            source: 'converted'
        });
    }
}

/**
 * Class for managing calibration data
 */
export class CalibrationManager {
    /**
     * Create calibration data from known reference
     * @param {number} referenceHeightCm - Known height in centimeters
     * @param {number} referenceHeightPixels - Measured height in pixels
     * @returns {Object} Calibration data
     */
    static createCalibration(referenceHeightCm, referenceHeightPixels) {
        if (referenceHeightCm <= 0 || referenceHeightPixels <= 0) {
            throw new Error('Reference values must be positive');
        }

        const pixelsPerCm = referenceHeightPixels / referenceHeightCm;

        return {
            pixelsPerCm,
            referenceHeightCm,
            referenceHeightPixels,
            timestamp: new Date(),
            confidence: 0.85
        };
    }

    /**
     * Validate calibration data
     * @param {Object} calibrationData - Calibration data to validate
     * @returns {boolean} True if valid
     */
    static isValidCalibration(calibrationData) {
        return calibrationData && 
               calibrationData.pixelsPerCm > 0 &&
               calibrationData.confidence > 0.5;
    }

    /**
     * Get calibration quality assessment
     * @param {Object} calibrationData - Calibration data
     * @returns {string} Quality assessment
     */
    static getCalibrationQuality(calibrationData) {
        if (!calibrationData) return 'No calibration';
        if (calibrationData.confidence > 0.9) return 'Excellent';
        if (calibrationData.confidence > 0.7) return 'Good';
        if (calibrationData.confidence > 0.5) return 'Fair';
        return 'Poor';
    }
}