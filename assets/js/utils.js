/**
 * Utility Functions Module
 * Common helper functions for the application
 */

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
 * Generate PDF report (placeholder - would use a library like jsPDF in production)
 * @param {Object} data - Report data
 * @param {string} filename - Filename for download
 */
export function generatePDF(data, filename) {
    // In production, this would use a PDF generation library
    console.log('PDF generation requested:', data, filename);
    
    // For now, generate HTML and open in new window
    const html = generateReportHTML(data);
    const newWindow = window.open('', '_blank');
    newWindow.document.write(html);
    newWindow.document.close();
    
    // Trigger print dialog
    setTimeout(() => {
        newWindow.print();
    }, 500);
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
            <p><strong>Name:</strong> ${data.clientName}</p>
            <p><strong>Assessment Date:</strong> ${data.assessmentDate || date}</p>
            <p><strong>Assessor:</strong> ${data.assessor || 'System Generated'}</p>` : ''}
            
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
            <ul>${data.recommendations.map(rec => `<li>${rec}</li>`).join('')}</ul>` : ''}
            
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