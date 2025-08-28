/**
 * Main Application Entry Point
 * Initializes the Posture AI Analysis Application
 */

import { initializeUI, selectMode, backToModeSelection, showTab, startCamera, closeCamera, 
         handleFileUpload, analyzePosture, generateClinicalReport, exportBiomechanics,
         resetQuickAnalysis, resetAdvancedAnalysis, saveQuickResults } from './ui-controller.js';

// Global functions that need to be accessible from HTML
window.selectMode = selectMode;
window.backToModeSelection = backToModeSelection;
window.showTab = showTab;
window.startCamera = startCamera;
window.handleFileUpload = handleFileUpload;
window.analyzePosture = analyzePosture;
window.generateClinicalReport = generateClinicalReport;
window.exportBiomechanics = exportBiomechanics;
window.resetQuickAnalysis = resetQuickAnalysis;
window.resetAdvancedAnalysis = resetAdvancedAnalysis;
window.saveQuickResults = saveQuickResults;

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Posture AI Analysis - Initializing...');
    
    // Check browser compatibility
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('Camera API not available. File upload mode only.');
    }
    
    // Initialize UI components
    initializeUI();
    
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
        navigator.serviceWorker.register('/sw.js').catch(err => {
            console.log('Service worker registration failed:', err);
        });
    }
    
    console.log('Posture AI Analysis - Ready');
});

// Clinical mode specific functions
window.saveClinicalInfo = function() {
    const form = document.getElementById('client-info-form');
    const formData = new FormData(form);
    const clientInfo = {};
    
    formData.forEach((value, key) => {
        clientInfo[key] = value;
    });
    
    // Store in UI state (imported from ui-controller)
    if (window.UIState) {
        window.UIState.analysisData.clinical.clientInfo = clientInfo;
    }
    
    // Show success notification
    if (window.showNotification) {
        window.showNotification('Client information saved', 'success');
    }
    
    // Move to next tab
    showTab('clinical', 'photo');
};

window.analyzeMovement = function(movement) {
    console.log('Analyzing movement:', movement);
    
    // Placeholder for movement analysis
    const results = {
        movement: movement,
        timestamp: new Date().toISOString(),
        quality: Math.random() * 100,
        compensations: [],
        recommendations: []
    };
    
    if (window.UIState) {
        window.UIState.analysisData.clinical.movements[movement] = results;
    }
    
    // Update UI to show analysis complete
    const btn = event.target;
    btn.textContent = 'Analysis Complete';
    btn.classList.add('btn-success');
    btn.disabled = true;
};

window.prescribeExercises = function() {
    console.log('Generating exercise prescription...');
    
    // In a real implementation, this would generate personalized exercises
    if (window.showNotification) {
        window.showNotification('Exercise prescription generated', 'success');
    }
};

window.saveClient = function() {
    const data = window.UIState ? window.UIState.analysisData.clinical : {};
    const timestamp = new Date().toISOString();
    
    // Save to local storage (in production, this would be a database)
    localStorage.setItem(`clinical-assessment-${timestamp}`, JSON.stringify(data));
    
    if (window.showNotification) {
        window.showNotification('Clinical assessment saved', 'success');
    }
};

// Export for module usage if needed
export { initializeUI };