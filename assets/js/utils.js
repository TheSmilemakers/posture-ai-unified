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
        newWindow.document.write(html);
        newWindow.document.close();
        
        setTimeout(() => {
            newWindow.print();
        }, 500);
        
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