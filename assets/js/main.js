/**
 * Main Application Entry Point
 * Initializes the Posture AI Analysis Application
 */

import { initializeUI, selectMode, backToModeSelection, showTab, startCamera, closeCamera, 
         handleFileUpload, analyzePosture, generateClinicalReport, exportBiomechanics,
         resetQuickAnalysis, resetAdvancedAnalysis, saveQuickResults } from './ui-controller.js';
import { sanitizer } from './sanitizer.js';

// Error Boundary Implementation
class ErrorBoundary {
    constructor() {
        this.hasError = false;
        this.error = null;
        
        // Catch unhandled errors
        window.addEventListener('error', (event) => {
            this.handleError(event.error, event);
        });
        
        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, event);
        });
    }
    
    handleError(error, event) {
        console.error('Application Error:', error);
        
        // Don't show error modal for network errors during dev
        if (error?.message?.includes('Failed to fetch') && window.location.hostname === 'localhost') {
            console.warn('Network error ignored in development');
            return;
        }
        
        // Show user-friendly error message
        this.showErrorModal(error);
        
        // Log to error tracking service
        this.logError(error);
        
        // Prevent default error handling
        if (event && event.preventDefault) {
            event.preventDefault();
        }
    }
    
    showErrorModal(error) {
        // Check if error modal already exists
        if (document.querySelector('.error-modal')) {
            return;
        }
        
        const errorModal = document.createElement('div');
        errorModal.className = 'error-modal';
        errorModal.innerHTML = `
            <div class="error-content">
                <h3>
                    <svg class="error-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    Something went wrong
                </h3>
                <p>We encountered an error. Please refresh the page and try again.</p>
                <p class="error-details">${this.sanitizeErrorMessage(error)}</p>
                <div class="error-actions">
                    <button onclick="location.reload()" class="btn btn-primary">Refresh Page</button>
                    <button onclick="this.closest('.error-modal').remove()" class="btn btn-secondary">Dismiss</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(errorModal);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            errorModal.remove();
        }, 10000);
    }
    
    sanitizeErrorMessage(error) {
        if (!error) return 'Unknown error occurred';
        
        const message = error.message || error.toString();
        
        // Remove sensitive information
        return message
            .replace(/https?:\/\/[^\s]+/g, '[URL]')
            .replace(/Bearer\s+[^\s]+/g, 'Bearer [TOKEN]')
            .substring(0, 200);
    }
    
    logError(error) {
        // Prepare error data for logging
        const errorData = {
            message: error?.message || 'Unknown error',
            stack: error?.stack || 'No stack trace',
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            // Add app-specific context
            mode: window.UIState?.currentMode || 'unknown',
            authenticated: sessionStorage.getItem('pra_auth') === 'true'
        };
        
        // TODO: Send to error tracking service (e.g., Sentry)
        console.error('Error logged:', errorData);
        
        // Store in localStorage for debugging
        try {
            const errors = JSON.parse(localStorage.getItem('pra_errors') || '[]');
            errors.push(errorData);
            // Keep only last 10 errors
            if (errors.length > 10) {
                errors.shift();
            }
            localStorage.setItem('pra_errors', JSON.stringify(errors));
        } catch (e) {
            console.warn('Could not store error log:', e);
        }
    }
}

// Initialize error boundary
const errorBoundary = new ErrorBoundary();

// All event handling is now centralized in ui-controller.js using event delegation

// Simple authentication for MVP
// TODO: Replace with server-side authentication (e.g., Basic Auth, OAuth) for production
function checkAuth() {
    // Force re-authentication on each page load for production
    // This ensures password prompt always appears
    const urlParams = new URLSearchParams(window.location.search);
    // SECURITY: Only allow skipAuth on localhost for development
    const skipAuth = urlParams.get('skipAuth') === 'development' &&
        (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
    
    if (skipAuth) {
        console.warn('Authentication skipped - development mode (localhost only)');
        return true;
    }
    
    // Always prompt for password on production
    const password = prompt('Restricted area. Enter access password:');
    if (password !== 'posture2025') {
        alert('Incorrect password. Please reload the page to try again.');
        // Clear any existing auth
        sessionStorage.removeItem('pra_auth');
        return false;
    }
    sessionStorage.setItem('pra_auth', 'true');
    return true;
}

// Initialize theme toggle functionality (modern 2025 implementation)
function initializeThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    // Get current theme from controller or default to dark
    const currentTheme = window.__themeController ? window.__themeController.current : 'dark';
    updateThemeToggleUI(themeToggle, currentTheme);
    
    // Add click functionality for three-way toggle (starting from dark)
    themeToggle.addEventListener('click', () => {
        const themes = ['dark', 'system', 'light'];
        const currentIndex = themes.indexOf(window.__themeController.current);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        
        // Apply theme using controller
        window.__themeController.set(nextTheme);
        updateThemeToggleUI(themeToggle, nextTheme);
        
        // Update aria-pressed for accessibility
        themeToggle.setAttribute('aria-pressed', 'true');
        setTimeout(() => themeToggle.setAttribute('aria-pressed', 'false'), 150);
        
        // Show brief feedback
        showThemeChangeFeedback(nextTheme);
    });
}

// Update theme toggle button visual state
function updateThemeToggleUI(button, theme) {
    if (!button) return;
    
    button.setAttribute('data-theme', theme);
    
    // Update title text
    const themeNames = {
        dark: 'Dark theme active - click for system',
        system: 'System theme active - click for light',  
        light: 'Light theme active - click for dark'
    };
    
    button.title = themeNames[theme] || themeNames.system;
    
    // Update main icon based on theme (now uses SVG)
    const iconEl = button.querySelector('.control-icon');
    if (iconEl) {
        // Different SVG paths for different themes
        const svgPaths = {
            light: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
            dark: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
            system: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>'
        };
        iconEl.innerHTML = svgPaths[theme] || svgPaths.system;
    }
}

// Show brief visual feedback for theme changes
function showThemeChangeFeedback(theme) {
    // Create temporary feedback element
    const feedback = document.createElement('div');
    feedback.className = 'theme-feedback';
    feedback.textContent = `${theme.charAt(0).toUpperCase() + theme.slice(1)} theme`;
    feedback.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: var(--color-bg-secondary);
        color: var(--color-text-primary);
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: var(--shadow-md);
        z-index: 1001;
        opacity: 0;
        transform: translateX(20px);
        transition: all 0.3s ease;
        pointer-events: none;
    `;
    
    document.body.appendChild(feedback);
    
    // Animate in
    requestAnimationFrame(() => {
        feedback.style.opacity = '1';
        feedback.style.transform = 'translateX(0)';
    });
    
    // Remove after delay
    setTimeout(() => {
        feedback.style.opacity = '0';
        feedback.style.transform = 'translateX(20px)';
        setTimeout(() => {
            if (feedback.parentNode) {
                document.body.removeChild(feedback);
            }
        }, 300);
    }, 1500);
}

// Initialize background toggle functionality  
function initializeBackgroundToggle() {
    const bgToggle = document.getElementById('bgToggle');
    if (!bgToggle) return;
    
    // Check for saved preference
    const savedPref = localStorage.getItem('pra_background_disabled');
    if (savedPref === 'true') {
        document.body.classList.add('no-background');
    }
    
    // Add toggle functionality
    bgToggle.addEventListener('click', () => {
        const isDisabled = document.body.classList.toggle('no-background');
        localStorage.setItem('pra_background_disabled', isDisabled.toString());
        
        // Update aria-pressed for accessibility
        bgToggle.setAttribute('aria-pressed', isDisabled.toString());
    });
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication first
    if (!checkAuth()) return;
    
    console.log('Posture AI Analysis - Initializing...');
    
    // Check browser compatibility
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('Camera API not available. File upload mode only.');
    }
    
    // Initialize UI components
    initializeUI();
    
    // Initialize theme toggle (modern 2025 implementation)
    initializeThemeToggle();
    
    // Initialize background toggle
    initializeBackgroundToggle();
    
    // Add global error handler
    window.addEventListener('error', (event) => {
        console.error('Application error:', event.error);
    });
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            closeCamera();
        }
    });
    
    // Add online/offline handling
    window.addEventListener('online', () => {
        console.log('Application is online');
    });
    
    window.addEventListener('offline', () => {
        console.log('Application is offline - some features may be limited');
    });
    
    // Register service worker for PWA support (if available)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => {
            console.log('Service worker registration failed:', err);
        });
    }
    
    console.log('Posture AI Analysis - Ready');
});

// Removed window functions - all event handling now centralized in ui-controller.js

// Export for module usage if needed
export { initializeUI };