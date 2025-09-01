/**
 * Utility Functions Module
 * Common helper functions for the application
 */

import { LANDMARKS } from './mediapipe-init.js';
import { sanitizer } from './sanitizer.js';

/**
 * Format number to specified decimal places
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number
 */
export function formatNumber(num, decimals = 2) {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return num.toFixed(decimals);
}

/**
 * Download data as JSON file
 * @param {Object} data - Data to download
 * @param {string} filename - Filename for download
 */
export function downloadJSON(data, filename) {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Download data as CSV file
 * @param {Array} data - Array of objects to convert to CSV
 * @param {string} filename - Filename for download
 */
export function downloadCSV(data, filename) {
    if (!data || data.length === 0) return;
    
    // Extract headers
    const headers = Object.keys(data[0]);
    let csv = headers.join(',') + '\n';
    
    // Add data rows
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header];
            return typeof value === 'string' ? `"${value}"` : value;
        });
        csv += values.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Generate PDF report using jsPDF
 * @param {Object} data - Report data
 * @param {string} filename - Filename for download
 */
export async function generatePDF(data, filename) {
    try {
        // Dynamic import of jsPDF
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        // Add watermark for MVP
        doc.setFontSize(40);
        doc.setTextColor(230, 230, 230);
        doc.text('MVP - Clinical Review Required', 105, 150, {
            align: 'center',
            angle: 45
        });
        
        // Reset text color
        doc.setTextColor(0, 0, 0);
        
        // Header
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('Posture Analysis Report', 105, 20, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setFont(undefined, 'normal');
        doc.text('Two Tonys Treatment Clinic', 105, 30, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 105, 38, { align: 'center' });
        
        // Add safety disclaimer
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('This report is for clinical reference only and should be interpreted by a qualified healthcare professional.', 105, 48, { align: 'center', maxWidth: 170 });
        doc.setTextColor(0, 0, 0);
        
        let yPos = 65;
        
        // Patient Information
        if (data.clientInfo || data.clientName) {
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text('Patient Information', 20, yPos);
            yPos += 10;
            
            doc.setFontSize(11);
            doc.setFont(undefined, 'normal');
            
            const clientInfo = data.clientInfo || {};
            const patientName = clientInfo.name || data.clientName || 'Anonymous Patient';
            doc.text(`Name: ${patientName}`, 20, yPos);
            yPos += 7;
            
            if (clientInfo.date || data.assessmentDate) {
                doc.text(`Assessment Date: ${clientInfo.date || data.assessmentDate}`, 20, yPos);
                yPos += 7;
            }
            
            if (clientInfo.assessor || data.assessor) {
                doc.text(`Assessor: ${clientInfo.assessor || data.assessor}`, 20, yPos);
                yPos += 7;
            }
            
            yPos += 10;
        }
        
        // Analysis Results
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('Analysis Results', 20, yPos);
        yPos += 10;
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        
        // Process different data structures based on mode
        if (data.mode === 'clinical' && data.photos) {
            // Clinical mode results
            Object.entries(data.photos).forEach(([view, viewData]) => {
                if (viewData.analysis) {
                    doc.setFont(undefined, 'bold');
                    doc.text(`${view.charAt(0).toUpperCase() + view.slice(1)} View:`, 20, yPos);
                    yPos += 7;
                    doc.setFont(undefined, 'normal');
                    
                    Object.entries(viewData.analysis).forEach(([metric, value]) => {
                        if (typeof value === 'number') {
                            const metricName = metric.replace(/([A-Z])/g, ' $1').trim();
                            doc.text(`  • ${metricName}: ${formatNumber(value, 1)}°`, 25, yPos);
                            yPos += 6;
                        }
                    });
                    yPos += 5;
                }
            });
        } else if (data.analysisData) {
            // Advanced mode results
            ['front', 'side', 'back'].forEach(view => {
                const viewData = data.analysisData[view];
                if (viewData && viewData.measurements && viewData.measurements.length > 0) {
                    doc.setFont(undefined, 'bold');
                    doc.text(`${view.charAt(0).toUpperCase() + view.slice(1)} View:`, 20, yPos);
                    yPos += 7;
                    doc.setFont(undefined, 'normal');
                    
                    viewData.measurements.forEach(measurement => {
                        const status = measurement.severity || 'Normal';
                        doc.text(`  • ${measurement.name}: ${formatNumber(measurement.value, 1)} ${measurement.unit || '°'} (${status})`, 25, yPos);
                        yPos += 6;
                    });
                    yPos += 5;
                }
            });
        } else if (data.results || data.metrics) {
            // Quick mode results
            const results = data.results || data.metrics || {};
            
            if (results.headTilt) {
                doc.text(`• Head Tilt: ${formatNumber(results.headTilt.angle, 1)}° ${results.headTilt.direction}`, 25, yPos);
                yPos += 7;
            }
            if (results.shoulderLevel) {
                doc.text(`• Shoulder Level: ${formatNumber(results.shoulderLevel.difference, 1)}mm difference`, 25, yPos);
                yPos += 7;
            }
            if (results.hipAlignment) {
                doc.text(`• Hip Alignment: ${results.hipAlignment.status}`, 25, yPos);
                yPos += 7;
            }
        }
        
        // Check if we need a new page
        if (yPos > 240) {
            doc.addPage();
            yPos = 30;
        }
        
        // Recommendations/Exercise Prescriptions
        if (data.recommendations || data.movements?.exercises || data.exercises) {
            yPos += 10;
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text('Recommendations', 20, yPos);
            yPos += 10;
            
            doc.setFontSize(11);
            doc.setFont(undefined, 'normal');
            
            const recommendations = data.recommendations || 
                                  (data.movements?.exercises ? Object.values(data.movements.exercises).flat() : null) ||
                                  data.exercises || [];
            
            if (Array.isArray(recommendations)) {
                recommendations.forEach((rec, index) => {
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 30;
                    }
                    const recText = typeof rec === 'object' ? rec.name || rec.exercise : rec;
                    doc.text(`${index + 1}. ${recText}`, 25, yPos, { maxWidth: 160 });
                    yPos += 8;
                });
            }
        }
        
        // Add footer on last page
        doc.setFontSize(9);
        doc.setTextColor(128, 128, 128);
        doc.text('Generated by Posture AI Analysis System', 105, 285, { align: 'center' });
        doc.text('© Two Tonys Treatment Clinic', 105, 290, { align: 'center' });
        
        // Save the PDF
        doc.save(filename);
        
        return true;
    } catch (error) {
        console.error('PDF generation error:', error);
        
        // Fallback to HTML report
        const html = generateReportHTML(data);
        const newWindow = window.open('', '_blank');
        
        if (newWindow) {
            // Create a new document safely
            const doc = newWindow.document;
            doc.open();
            
            // Parse the HTML and create DOM elements
            const parser = new DOMParser();
            const parsedDoc = parser.parseFromString(html, 'text/html');
            
            // Copy the parsed content to the new window
            doc.documentElement.innerHTML = parsedDoc.documentElement.innerHTML;
            doc.close();
            
            setTimeout(() => {
                newWindow.print();
            }, 500);
        }
        
        throw new Error('PDF generation failed, opened print dialog instead');
    }
}

/**
 * Generate HTML report
 * @param {Object} data - Report data
 * @returns {string} HTML string
 */
function generateReportHTML(data) {
    const date = new Date().toLocaleDateString();
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Posture Analysis Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                h1 { color: #667eea; }
                h2 { color: #495057; margin-top: 30px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f8f9fa; }
                .header { text-align: center; margin-bottom: 30px; }
                .footer { margin-top: 50px; text-align: center; color: #6c757d; }
                @media print {
                    body { margin: 20px; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Posture Analysis Report</h1>
                <p>Two Tonys Treatment Clinic</p>
                <p>Date: ${date}</p>
            </div>
            
            ${data.clientName ? `<h2>Patient Information</h2>
            <p><strong>Name:</strong> ${sanitizer.escapeHtml(data.clientName)}</p>
            <p><strong>Assessment Date:</strong> ${sanitizer.escapeHtml(data.assessmentDate || date)}</p>
            <p><strong>Assessor:</strong> ${sanitizer.escapeHtml(data.assessor || 'System Generated')}</p>` : ''}
            
            <h2>Analysis Results</h2>
            <table>
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                    <th>Status</th>
                </tr>
                ${generateMetricsTable(data)}
            </table>
            
            ${data.recommendations ? `<h2>Recommendations</h2>
            <ul>${data.recommendations.map(rec => `<li>${sanitizer.escapeHtml(rec)}</li>`).join('')}</ul>` : ''}
            
            <div class="footer">
                <p>This report is for clinical reference only and should be interpreted by a qualified healthcare professional.</p>
                <p class="no-print">
                    <button onclick="window.print()">Print Report</button>
                    <button onclick="window.close()">Close</button>
                </p>
            </div>
        </body>
        </html>
    `;
}

/**
 * Generate metrics table rows
 * @param {Object} data - Metrics data
 * @returns {string} Table rows HTML
 */
function generateMetricsTable(data) {
    const metrics = [];
    
    if (data.forwardHead !== undefined) {
        metrics.push({
            name: 'Forward Head Position',
            value: `${formatNumber(data.forwardHead, 1)} cm`,
            status: getSeverityLabel(Math.abs(data.forwardHead), [2, 4, 6])
        });
    }
    
    if (data.shoulderAsymmetry !== undefined) {
        metrics.push({
            name: 'Shoulder Asymmetry',
            value: `${formatNumber(data.shoulderAsymmetry, 1)} cm`,
            status: getSeverityLabel(data.shoulderAsymmetry, [1, 2, 3])
        });
    }
    
    if (data.qAngle !== undefined) {
        metrics.push({
            name: 'Q-Angle',
            value: `${formatNumber(data.qAngle, 1)}°`,
            status: getSeverityLabel(Math.abs(data.qAngle - 15), [3, 5, 8])
        });
    }
    
    return metrics.map(m => `
        <tr>
            <td>${m.name}</td>
            <td>${m.value}</td>
            <td>${m.status}</td>
        </tr>
    `).join('');
}

/**
 * Get severity label
 * @param {number} value - Measured value
 * @param {Array} thresholds - Severity thresholds
 * @returns {string} Severity label
 */
function getSeverityLabel(value, thresholds) {
    if (value < thresholds[0]) return 'Normal';
    if (value < thresholds[1]) return 'Mild Deviation';
    if (value < thresholds[2]) return 'Moderate Deviation';
    return 'Significant Deviation';
}

/**
 * Debounce function to limit rate of function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function to limit rate of function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    
    const clonedObj = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            clonedObj[key] = deepClone(obj[key]);
        }
    }
    return clonedObj;
}

/**
 * Check if device is mobile
 * @returns {boolean} True if mobile device
 */
export function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Check if device supports touch
 * @returns {boolean} True if touch supported
 */
export function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get browser info
 * @returns {Object} Browser information
 */
export function getBrowserInfo() {
    const userAgent = navigator.userAgent;
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';
    
    if (userAgent.indexOf('Firefox') > -1) {
        browserName = 'Firefox';
        browserVersion = userAgent.match(/Firefox\/(\d+)/)[1];
    } else if (userAgent.indexOf('Chrome') > -1) {
        browserName = 'Chrome';
        browserVersion = userAgent.match(/Chrome\/(\d+)/)[1];
    } else if (userAgent.indexOf('Safari') > -1) {
        browserName = 'Safari';
        browserVersion = userAgent.match(/Version\/(\d+)/)[1];
    }
    
    return {
        name: browserName,
        version: browserVersion,
        userAgent: userAgent
    };
}

/**
 * Request fullscreen
 * @param {HTMLElement} element - Element to make fullscreen
 */
export function requestFullscreen(element = document.documentElement) {
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
}

/**
 * Exit fullscreen
 */
export function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise} Promise that resolves when copied
 */
export async function copyToClipboard(text) {
    if (navigator.clipboard) {
        return navigator.clipboard.writeText(text);
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            return Promise.resolve();
        } catch (err) {
            return Promise.reject(err);
        } finally {
            document.body.removeChild(textArea);
        }
    }
}

/**
 * Format date to local string
 * @param {Date|string} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date
 */
export function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options
    };
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString(undefined, defaultOptions);
}

/**
 * Calculate age from date of birth
 * @param {Date|string} dob - Date of birth
 * @returns {number} Age in years
 */
export function calculateAge(dob) {
    const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Generate unique ID
 * @returns {string} Unique identifier
 */
export function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Load image and return promise
 * @param {string} src - Image source
 * @returns {Promise<HTMLImageElement>} Promise that resolves with image
 */
export function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

/**
 * Convert base64 to blob
 * @param {string} base64 - Base64 string
 * @param {string} contentType - MIME type
 * @returns {Blob} Blob object
 */
export function base64ToBlob(base64, contentType = 'image/jpeg') {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    
    return new Blob(byteArrays, { type: contentType });
}

/**
 * CRITICAL FIX 2b: Calibration Utility Functions
 * These functions convert normalized MediaPipe coordinates to real-world clinical measurements
 */

/**
 * Calibrate normalized MediaPipe coordinates to real-world measurements
 * @param {number} normalizedValue - Value in 0-1 coordinate space
 * @param {number} patientHeightCm - Patient height in centimeters  
 * @param {Object} imageMetadata - Image dimensions {width, height}
 * @returns {number} Real-world measurement in centimeters
 */
export function calibrateToRealWorld(normalizedValue, patientHeightCm, imageMetadata) {
    if (!imageMetadata || !imageMetadata.height || !patientHeightCm) {
        console.warn('calibrateToRealWorld: Missing calibration data, returning normalized value');
        return Math.abs(normalizedValue) * 100; // Fallback to normalized scale
    }
    
    // Assume full body visible with 10% margin for head/feet
    // This is a simplified model - real clinical systems use reference objects
    const bodyHeightInPixels = imageMetadata.height * 0.9;
    const pixelsPerCm = bodyHeightInPixels / patientHeightCm;
    const pixelDifference = Math.abs(normalizedValue) * imageMetadata.height;
    
    return pixelDifference / pixelsPerCm; // Real centimeters
}

/**
 * Convert asymmetry measurement to percentage of body height
 * @param {number} asymmetryCm - Asymmetry in centimeters
 * @param {number} patientHeightCm - Patient height in centimeters
 * @returns {number} Percentage of body height
 */
export function convertToBodyPercentage(asymmetryCm, patientHeightCm) {
    if (!patientHeightCm || patientHeightCm <= 0) {
        console.warn('convertToBodyPercentage: Invalid patient height, using normalized scale');
        return asymmetryCm; // Return as-is if no valid height
    }
    
    return (asymmetryCm / patientHeightCm) * 100;
}

/**
 * Get patient height from appropriate input field
 * @param {string} mode - Current analysis mode ('quick', 'clinical', 'advanced')
 * @returns {number} Patient height in cm or default 170cm
 */
export function getPatientHeight(mode) {
    const heightInput = document.getElementById(`${mode}-patient-height`);
    
    if (!heightInput) {
        console.warn(`getPatientHeight: No height input found for mode '${mode}', using default 170cm`);
        return 170;
    }
    
    const height = parseInt(heightInput.value);
    
    // Validation: typical human height range 120-220cm
    if (height >= 120 && height <= 220) {
        return height;
    } else {
        console.warn(`getPatientHeight: Invalid height ${height}cm, using default 170cm`);
        return 170; // Safe default
    }
}

/**
 * Get image metadata from preview element
 * @param {string} elementId - ID of the image preview element
 * @returns {Object|null} Image metadata {width, height} or null if not available
 */
export function getImageMetadata(elementId) {
    const imageElement = document.getElementById(elementId);
    
    if (!imageElement || !imageElement.naturalWidth || !imageElement.naturalHeight) {
        console.warn(`getImageMetadata: No valid image data found for element '${elementId}'`);
        return null;
    }
    
    return {
        width: imageElement.naturalWidth,
        height: imageElement.naturalHeight
    };
}

/**
 * Validate calibration data before processing
 * @param {number} patientHeight - Patient height in cm
 * @param {Object} imageMetadata - Image dimensions
 * @returns {boolean} True if calibration data is valid
 */
export function validateCalibrationData(patientHeight, imageMetadata) {
    if (!patientHeight || patientHeight < 120 || patientHeight > 220) {
        console.error('Invalid patient height for calibration:', patientHeight);
        return false;
    }
    
    if (!imageMetadata || !imageMetadata.width || !imageMetadata.height) {
        console.error('Invalid image metadata for calibration:', imageMetadata);
        return false;
    }
    
    if (imageMetadata.width < 100 || imageMetadata.height < 100) {
        console.error('Image too small for reliable calibration:', imageMetadata);
        return false;
    }
    
    return true;
}

/**
 * ============================================
 * ENHANCED CALIBRATION SYSTEM - VERSION 2.0
 * Landmark-based clinical-grade calibration
 * Added to fix the 90% frame assumption bug
 * ============================================
 */

// MediaPipe landmark indices
const LANDMARKS = {
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
 * Calculate calibration from patient height and detected landmarks
 * FIXES: The critical 90% frame assumption bug
 * @param {Array} landmarks - MediaPipe pose landmarks (33 points)
 * @param {number} patientHeightCm - Patient height in centimeters
 * @param {Object} imageMetadata - Image dimensions {width, height}
 * @returns {Object} Calibration data with pixelsPerCm and confidence
 */
export function calculateLandmarkCalibration(landmarks, patientHeightCm, imageMetadata) {
    // Default fallback calibration
    const defaultCalibration = {
        pixelsPerCm: (imageMetadata?.height * 0.9) / (patientHeightCm || 170),
        confidence: 0.5,
        method: 'frame-assumption',
        error: 'Using fallback calibration'
    };
    
    // Validate inputs
    if (!landmarks || !Array.isArray(landmarks) || landmarks.length < 33) {
        console.warn('calculateLandmarkCalibration: Invalid landmarks');
        return defaultCalibration;
    }
    
    if (!validateCalibrationData(patientHeightCm, imageMetadata)) {
        return defaultCalibration;
    }
    
    // Get key landmarks for height calculation
    const nose = landmarks[LANDMARKS.NOSE];
    const leftAnkle = landmarks[LANDMARKS.LEFT_ANKLE];
    const rightAnkle = landmarks[LANDMARKS.RIGHT_ANKLE];
    const leftHeel = landmarks[LANDMARKS.LEFT_HEEL];
    const rightHeel = landmarks[LANDMARKS.RIGHT_HEEL];
    
    // Check minimum visibility
    const minVisibility = 0.5;
    if (!nose || !nose.visibility || nose.visibility < minVisibility) {
        console.warn('calculateLandmarkCalibration: Head not visible enough');
        return defaultCalibration;
    }
    
    // Determine lower reference point
    let lowerPoint;
    let measurementType;
    
    // Try heels first (more accurate for full height)
    if (leftHeel && rightHeel && 
        leftHeel.visibility > minVisibility && 
        rightHeel.visibility > minVisibility) {
        lowerPoint = {
            y: (leftHeel.y + rightHeel.y) / 2,
            visibility: (leftHeel.visibility + rightHeel.visibility) / 2
        };
        measurementType = 'nose-to-heel';
    }
    // Fall back to ankles
    else if (leftAnkle && rightAnkle && 
             leftAnkle.visibility > minVisibility && 
             rightAnkle.visibility > minVisibility) {
        lowerPoint = {
            y: (leftAnkle.y + rightAnkle.y) / 2,
            visibility: (leftAnkle.visibility + rightAnkle.visibility) / 2
        };
        measurementType = 'nose-to-ankle';
    }
    else {
        console.warn('calculateLandmarkCalibration: Lower body not visible enough');
        return defaultCalibration;
    }
    
    // Calculate body height in normalized coordinates (0-1)
    const bodyHeightNormalized = Math.abs(nose.y - lowerPoint.y);
    
    // Validate person is reasonably sized in frame
    if (bodyHeightNormalized < 0.3) {
        console.warn('calculateLandmarkCalibration: Person too small in frame');
        defaultCalibration.error = 'Person too small in frame';
        return defaultCalibration;
    }
    
    if (bodyHeightNormalized > 0.95) {
        console.warn('calculateLandmarkCalibration: Person may be cut off');
        defaultCalibration.error = 'Person may be cut off';
        return defaultCalibration;
    }
    
    // Convert to pixels
    const bodyHeightPixels = bodyHeightNormalized * imageMetadata.height;
    
    // Apply anthropometric ratio
    const anthropometricRatio = measurementType === 'nose-to-heel' ? 0.96 : 0.92;
    const estimatedFullHeightPixels = bodyHeightPixels / anthropometricRatio;
    const pixelsPerCm = estimatedFullHeightPixels / patientHeightCm;
    
    // Sanity check the result
    if (pixelsPerCm < 0.5 || pixelsPerCm > 20) {
        console.warn(`calculateLandmarkCalibration: Unusual result ${pixelsPerCm} px/cm`);
        defaultCalibration.error = `Unusual calibration: ${pixelsPerCm.toFixed(2)} px/cm`;
        return defaultCalibration;
    }
    
    // Calculate confidence based on multiple factors
    let confidence = 1.0;
    
    // Factor 1: Body size in frame (optimal is 60-80% of frame)
    if (bodyHeightNormalized < 0.5) {
        confidence *= 0.7;
    } else if (bodyHeightNormalized > 0.85) {
        confidence *= 0.8;
    }
    
    // Factor 2: Landmark visibility
    const avgVisibility = (nose.visibility + lowerPoint.visibility) / 2;
    confidence *= avgVisibility;
    
    // Factor 3: Measurement point quality
    if (measurementType === 'nose-to-ankle') {
        confidence *= 0.9; // Slightly less accurate than heel
    }
    
    return {
        pixelsPerCm: pixelsPerCm,
        confidence: Math.max(0.3, Math.min(1.0, confidence)),
        method: 'landmark-based',
        measurementType: measurementType,
        bodyHeightInFrame: bodyHeightNormalized,
        anthropometricRatio: anthropometricRatio,
        patientHeightCm: patientHeightCm,
        timestamp: new Date().toISOString()
    };
}

/**
 * Enhanced calibration wrapper - uses landmark-based when available
 * Backward compatible with existing calls
 * @param {number} normalizedValue - Value in 0-1 coordinate space
 * @param {number} patientHeightCm - Patient height in centimeters
 * @param {Object} imageMetadata - Image dimensions {width, height}
 * @param {Array|Object} landmarksOrOptions - Landmarks array or options object
 * @returns {number} Real-world measurement in centimeters
 */
export function calibrateToRealWorldEnhanced(normalizedValue, patientHeightCm, imageMetadata, landmarksOrOptions = null) {
    // Guard against null/undefined imageMetadata
    if (!imageMetadata || !imageMetadata.height || imageMetadata.height <= 0) {
        console.warn('calibrateToRealWorldEnhanced: Invalid imageMetadata', imageMetadata);
        return null;
    }
    
    let landmarks = null;
    let calibrationData = null;
    
    // Handle different parameter types for flexibility
    if (Array.isArray(landmarksOrOptions)) {
        landmarks = landmarksOrOptions;
    } else if (landmarksOrOptions && typeof landmarksOrOptions === 'object') {
        landmarks = landmarksOrOptions.landmarks;
        calibrationData = landmarksOrOptions.calibrationData;
    }
    
    // If we have pre-calculated calibration data, use it
    if (calibrationData && calibrationData.pixelsPerCm) {
        const pixelValue = Math.abs(normalizedValue) * imageMetadata.height;
        return pixelValue / calibrationData.pixelsPerCm;
    }
    
    // Try landmark-based calibration if landmarks available
    if (landmarks && landmarks.length >= 33) {
        const landmarkCalibration = calculateLandmarkCalibration(
            landmarks,
            patientHeightCm,
            imageMetadata
        );
        
        if (landmarkCalibration && landmarkCalibration.method === 'landmark-based') {
            const pixelValue = Math.abs(normalizedValue) * imageMetadata.height;
            return pixelValue / landmarkCalibration.pixelsPerCm;
        }
    }
    
    // Fallback to existing basic calibration
    return calibrateToRealWorld(normalizedValue, patientHeightCm, imageMetadata);
}

/**
 * Calculate asymmetry as percentage of segment width
 * More accurate than percentage of body height
 * @param {Object} leftPoint - Left landmark {x, y, visibility}
 * @param {Object} rightPoint - Right landmark {x, y, visibility}
 * @param {Object} calibrationData - Optional calibration data
 * @returns {number} Percentage asymmetry
 */
export function calculateSegmentAsymmetryPercent(leftPoint, rightPoint, calibrationData = null) {
    if (!leftPoint || !rightPoint) {
        return 0;
    }
    
    const verticalDiff = Math.abs(leftPoint.y - rightPoint.y);
    const horizontalWidth = Math.abs(leftPoint.x - rightPoint.x);
    
    if (horizontalWidth === 0) {
        return 0;
    }
    
    // Return as percentage of segment width
    return (verticalDiff / horizontalWidth) * 100;
}

/**
 * Calculate measurement confidence based on landmark visibility
 * @param {Array} landmarks - MediaPipe landmarks
 * @param {string} measurementType - Type of measurement
 * @param {Object} calibrationData - Optional calibration data
 * @returns {number} Confidence score 0-1
 */
export function calculateMeasurementConfidence(landmarks, measurementType, calibrationData = null) {
    if (!landmarks || !Array.isArray(landmarks)) {
        return 0.5;
    }
    
    // Define critical landmarks for each measurement
    const CRITICAL_LANDMARKS = {
        'shoulderAsymmetry': [LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER],
        'hipAsymmetry': [LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP],
        'forwardHead': [LANDMARKS.NOSE, LANDMARKS.LEFT_EAR, LANDMARKS.LEFT_SHOULDER],
        'qAngle': [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE],
        'pelvicTilt': [LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.RIGHT_KNEE],
        'headTilt': [LANDMARKS.NOSE, LANDMARKS.LEFT_EYE, LANDMARKS.RIGHT_EYE],
        'pelvicAngle': [LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.RIGHT_KNEE],
        'kyphosisAngle': [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP],
        'spinalDeviation': [LANDMARKS.NOSE, LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP],
        'scapularAsymmetry': [LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER, LANDMARKS.LEFT_ELBOW, LANDMARKS.RIGHT_ELBOW],
        'weightDistributionLeft': [LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP, LANDMARKS.LEFT_FOOT_INDEX],
        'weightDistributionRight': [LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_FOOT_INDEX]
    };
    
    const criticalIndices = CRITICAL_LANDMARKS[measurementType];
    if (!criticalIndices) {
        return 0.7; // Default confidence for unknown measurements
    }
    
    // Calculate average visibility
    let totalVisibility = 0;
    let count = 0;
    
    criticalIndices.forEach(idx => {
        const landmark = landmarks[idx];
        if (landmark && landmark.visibility !== undefined) {
            totalVisibility += landmark.visibility;
            count++;
        }
    });
    
    let confidence = count > 0 ? totalVisibility / count : 0.5;
    
    // Factor in calibration quality
    if (calibrationData && calibrationData.confidence) {
        confidence = confidence * 0.7 + calibrationData.confidence * 0.3;
    }
    
    // Apply measurement difficulty factor
    const DIFFICULTY_FACTORS = {
        'shoulderAsymmetry': 0.9,
        'hipAsymmetry': 0.85,
        'forwardHead': 0.8,
        'qAngle': 0.75,
        'pelvicTilt': 0.7,
        'pelvicAngle': 0.7,
        'kyphosisAngle': 0.75,
        'spinalDeviation': 0.7,
        'scapularAsymmetry': 0.8,
        'headTilt': 0.95,
        'weightDistributionLeft': 0.65,
        'weightDistributionRight': 0.65
    };
    
    const difficulty = DIFFICULTY_FACTORS[measurementType] || 0.8;
    confidence *= difficulty;
    
    return Math.max(0.3, Math.min(1.0, confidence));
}

/**
 * Check if calibration data is valid
 * @param {Object} calibration - Calibration data to validate
 * @returns {boolean} True if valid
 */
export function isCalibrationValid(calibration) {
    if (!calibration) return false;
    if (!calibration.pixelsPerCm || calibration.pixelsPerCm < 0.5 || calibration.pixelsPerCm > 20) return false;
    if (!calibration.confidence || calibration.confidence < 0.3) return false;
    
    // Check age if timestamp exists
    if (calibration.timestamp) {
        const age = Date.now() - new Date(calibration.timestamp).getTime();
        if (age > 30 * 60 * 1000) { // 30 minutes
            console.warn('Calibration is older than 30 minutes');
            return false;
        }
    }
    
    return true;
}

/**
 * Get calibration status for UI display
 * @param {Object} calibration - Calibration data
 * @returns {Object} Status information
 */
export function getCalibrationStatus(calibration) {
    if (!calibration) {
        return {
            status: 'uncalibrated',
            icon: '⚠️',
            text: 'Not calibrated',
            color: 'orange',
            confidence: 0
        };
    }
    
    if (!isCalibrationValid(calibration)) {
        return {
            status: 'invalid',
            icon: '❌',
            text: 'Invalid calibration',
            color: 'red',
            confidence: 0
        };
    }
    
    const confidence = calibration.confidence || 0;
    
    if (confidence >= 0.9) {
        return {
            status: 'excellent',
            icon: '✅',
            text: `Calibrated (${Math.round(confidence * 100)}% confidence)`,
            color: 'green',
            confidence: confidence,
            method: calibration.method
        };
    } else if (confidence >= 0.7) {
        return {
            status: 'good',
            icon: '✓',
            text: `Calibrated (${Math.round(confidence * 100)}% confidence)`,
            color: 'lightgreen',
            confidence: confidence,
            method: calibration.method
        };
    } else {
        return {
            status: 'poor',
            icon: '⚠️',
            text: `Weak calibration (${Math.round(confidence * 100)}% confidence)`,
            color: 'orange',
            confidence: confidence,
            method: calibration.method
        };
    }
}

// Export the landmark constants for use in other modules
export { LANDMARKS };