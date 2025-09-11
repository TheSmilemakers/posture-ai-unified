/**
 * Sanitizer Module
 * Provides comprehensive input sanitization to prevent XSS attacks
 * Following OWASP guidelines for healthcare applications
 */

const sanitizer = {
    /**
     * HTML escape function for preventing XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML-safe text
     */
    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;',
            '`': '&#x60;',
            '=': '&#x3D;'
        };
        
        return String(text).replace(/[&<>"'`=/]/g, s => map[s]);
    },

    /**
     * Sanitize form data object
     * @param {Object} data - Form data to sanitize
     * @returns {Object} Sanitized form data
     */
    sanitizeFormData(data) {
        if (typeof data !== 'object' || data === null) return {};
        
        const cleaned = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                cleaned[key] = this.escapeHtml(value);
            } else if (typeof value === 'object' && value !== null) {
                cleaned[key] = this.sanitizeFormData(value);
            } else {
                cleaned[key] = value;
            }
        }
        return cleaned;
    },

    /**
     * Validate and sanitize file names
     * @param {string} filename - Original filename
     * @returns {string} Safe filename
     */
    sanitizeFileName(filename) {
        if (!filename) return 'unnamed_file';
        
        // Remove path components and keep only filename
        const baseName = filename.split(/[/\\]/).pop();
        
        // Replace dangerous characters with underscores
        // Allow only alphanumeric, dots, hyphens, and underscores
        return baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
    },

    /**
     * Validate email format
     * @param {string} email - Email address to validate
     * @returns {boolean} True if valid email format
     */
    validateEmail(email) {
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return emailRegex.test(email);
    },

    /**
     * Validate and sanitize patient name
     * @param {string} name - Patient name
     * @returns {string} Sanitized name
     */
    sanitizePatientName(name) {
        if (!name) return '';
        
        // Allow letters, spaces, hyphens, apostrophes, and periods
        // Common in medical names (e.g., O'Connor, Dr. Smith, Mary-Jane)
        const cleaned = name.replace(/[^a-zA-Z\s\-'.]/g, '').trim();
        
        // Limit length for database storage
        return cleaned.substring(0, 100);
    },

    /**
     * Sanitize numeric input
     * @param {any} value - Value to sanitize
     * @param {number} min - Minimum allowed value
     * @param {number} max - Maximum allowed value
     * @param {number} defaultValue - Default if invalid
     * @returns {number} Sanitized number
     */
    sanitizeNumber(value, min = 0, max = 999, defaultValue = 0) {
        const num = parseFloat(value);
        
        if (isNaN(num)) return defaultValue;
        if (num < min) return min;
        if (num > max) return max;
        
        return num;
    },

    /**
     * Sanitize text area content (notes, comments)
     * @param {string} text - Text content
     * @param {number} maxLength - Maximum allowed length
     * @returns {string} Sanitized text
     */
    sanitizeTextArea(text, maxLength = 1000) {
        if (!text) return '';
        
        // Escape HTML but preserve line breaks
        let cleaned = this.escapeHtml(text);
        
        // Convert line breaks to <br> for display
        cleaned = cleaned.replace(/\n/g, '<br>');
        
        // Limit length
        return cleaned.substring(0, maxLength);
    },

    /**
     * Create safe DOM element with text content
     * @param {string} tag - HTML tag name
     * @param {string} content - Text content
     * @param {Object} attributes - Element attributes
     * @returns {HTMLElement} Safe DOM element
     */
    createSafeElement(tag, content = '', attributes = {}) {
        const element = document.createElement(tag);
        
        // Use textContent for safety
        element.textContent = content;
        
        // Set attributes safely
        for (const [key, value] of Object.entries(attributes)) {
            if (key === 'class') {
                element.className = String(value);
            } else if (key === 'id' && /^[a-zA-Z][\w-]*$/.test(value)) {
                element.id = value;
            } else if (key.startsWith('data-')) {
                element.setAttribute(key, String(value));
            }
        }
        
        return element;
    },

    /**
     * Sanitize URL for safe usage
     * @param {string} url - URL to sanitize
     * @param {string[]} allowedProtocols - Allowed URL protocols
     * @returns {string} Sanitized URL or empty string if invalid
     */
    sanitizeUrl(url, allowedProtocols = ['http:', 'https:']) {
        if (!url) return '';
        
        try {
            const parsed = new URL(url);
            
            if (allowedProtocols.includes(parsed.protocol)) {
                return parsed.href;
            }
        } catch (e) {
            // Invalid URL
        }
        
        return '';
    },

    /**
     * Sanitize measurement values for display
     * @param {any} value - Measurement value
     * @param {string} unit - Unit of measurement
     * @returns {string} Safe display string
     */
    sanitizeMeasurement(value, unit = '') {
        const num = this.sanitizeNumber(value, -999, 999, 0);
        const safeUnit = this.escapeHtml(unit);
        
        return `${num.toFixed(2)} ${safeUnit}`.trim();
    }
};

// Export for use in other modules
export { sanitizer };