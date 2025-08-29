/**
 * Main Application Entry Point
 * Initializes the Posture AI Analysis Application
 */

import { initializeUI, selectMode, backToModeSelection, showTab, startCamera, closeCamera, 
         handleFileUpload, analyzePosture, generateClinicalReport, exportBiomechanics,
         resetQuickAnalysis, resetAdvancedAnalysis, saveQuickResults } from './ui-controller.js';

// All event handling is now centralized in ui-controller.js using event delegation

// Simple authentication for MVP
function checkAuth() {
    const isAuthenticated = sessionStorage.getItem('pra_auth') === 'true';
    if (!isAuthenticated) {
        const password = prompt('Please enter the access password:');
        // Simple password check - replace 'your-password-here' with your actual password
        if (password !== 'posture2025') {
            alert('Incorrect password. Please reload the page to try again.');
            // Don't redirect, just stop execution
            return false;
        }
        sessionStorage.setItem('pra_auth', 'true');
    }
    return true;
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