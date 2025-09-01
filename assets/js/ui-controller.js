/**
 * UI Controller Module
 * Manages user interface state and interactions
 */

import { initializePose, drawConnectors, drawLandmarks, POSE_CONNECTIONS, EnhancedPoseDetector, LANDMARKS } from './mediapipe-init.js';
import { sanitizer } from './sanitizer.js';
import { 
    calculateBasicMetrics, 
    analyzeFrontView, 
    analyzeSideView, 
    analyzeBackView,
    calculateInjuryRisk,
    generateExerciseRecommendations,
    getSeverity 
} from './analysis.js';
import { formatNumber, downloadJSON, generatePDF, calibrateToRealWorld, calibrateToRealWorldEnhanced, convertToBodyPercentage, getPatientHeight, getImageMetadata, validateCalibrationData, calculateLandmarkCalibration, calculateMeasurementConfidence, getCalibrationStatus } from './utils.js';
import { 
    createPatient,
    createAssessment,
    storeAnalysisResults,
    saveCompleteAssessment,
    testDatabaseConnection,
    uploadPhoto,
    uploadAssessmentPhotos,
    saveExercisePrescription
} from './database-service.js';

// CRITICAL FIX 1: Correct unit assignment mapping
// Replaces incorrect conditional logic that assigned "mm" to percentage measurements
const MEASUREMENT_UNITS = {
    // Angles - correctly assigned
    'qAngle': 'degrees',
    'pelvicAngle': 'degrees', 
    'kyphosisAngle': 'degrees',
    
    // Asymmetries - FIXED: should be percent, not mm
    'shoulderAsymmetry': 'percent',     // Was: 'mm' ❌ Now: 'percent' ✅
    'hipAsymmetry': 'percent',          // Was: 'mm' ❌ Now: 'percent' ✅
    'forwardHead': 'percent',           // Was: 'cm' ❌ Now: 'percent' ✅
    'spinalDeviation': 'percent',       // Was: 'units' ❌ Now: 'percent' ✅
    'scapularAsymmetry': 'percent',     // Was: 'units' ❌ Now: 'percent' ✅
    
    // Weight distribution - correctly assigned
    'weightDistributionLeft': 'percent',
    'weightDistributionRight': 'percent'
};

// Global UI State
export const UIState = {
    currentMode: null,
    currentTab: null,
    pose: null,
    enhancedDetector: null,
    currentStream: null,
    analysisData: {
        quick: {},
        clinical: {
            clientInfo: {},
            photos: {},
            movements: {}
        },
        advanced: {
            front: null,
            side: null,
            back: null,
            images: {},      // Store uploaded image data with metadata
            landmarks: {},   // Store MediaPipe pose landmarks for each view
            patterns: []     // Store detected postural patterns
        }
    },
    uploadedViews: {
        clinical: {
            front: false,
            side: false,
            back: false
        },
        advanced: {
            front: false,
            side: false,
            back: false
        }
    }
};

/**
 * Initialize UI event listeners with centralized event delegation
 */
export function initializeUI() {
    // Set today's date for forms
    const today = new Date().toISOString().split('T')[0];
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        if (!input.value) input.value = today;
    });
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Add touch event handling for mobile
    initializeTouchHandlers();
    
    // Initialize auto-hide header
    initializeAutoHideHeader();
    
    // Initialize charts if needed
    if (typeof Chart !== 'undefined') {
        Chart.defaults.font.family = getComputedStyle(document.body).getPropertyValue('--font-family');
    }

    // CENTRALIZED EVENT DELEGATION - Handle all clicks in one place
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('change', handleGlobalChange);
    
    // Initialize drag and drop for upload areas
    initializeDragAndDrop();
    
    // Initialize form validation
    initializeFormValidation();
    
    // Enhanced disclaimer handling with debugging and fallback
    const disclaimer = document.querySelector('.clinical-disclaimer');
    const disclaimerButton = document.querySelector('.clinical-disclaimer [data-close-modal]');
    
    if (disclaimer && disclaimerButton) {
        console.log('✅ Disclaimer elements found, setting up handlers...');
        
        // Primary click handler
        disclaimerButton.addEventListener('click', () => {
            console.log('🚀 Disclaimer button clicked, dismissing modal...');
            disclaimer.classList.add('hidden');
            console.log('✅ Disclaimer dismissed successfully');
        });
        
        // Alternative handler - click anywhere on button area
        disclaimerButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            console.log('📱 Disclaimer button touched, dismissing modal...');
            disclaimer.classList.add('hidden');
        });
        
        // Fallback - auto-dismiss after 10 seconds if still visible
        setTimeout(() => {
            if (disclaimer && !disclaimer.classList.contains('hidden')) {
                console.log('⏰ Auto-dismissing disclaimer after timeout...');
                disclaimer.classList.add('hidden');
            }
        }, 10000);
        
        // Emergency fallback - Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && disclaimer && !disclaimer.classList.contains('hidden')) {
                console.log('⌨️ Escape key pressed, dismissing disclaimer...');
                disclaimer.classList.add('hidden');
            }
        });
        
    } else {
        console.warn('❌ Disclaimer elements not found:', { disclaimer, disclaimerButton });
    }
    
    // Test database connection on startup
    testDatabaseOnStartup();
    
    // Check for previous session after a small delay
    setTimeout(() => {
        checkForPreviousSession();
    }, 500);
}

/**
 * Test database connection on startup
 */
async function testDatabaseOnStartup() {
    try {
        console.log('Testing database connection...');
        const result = await testDatabaseConnection();
        if (result.connected) {
            console.log('✅ Database connected successfully:', result);
            // Optional: Show a subtle indicator that backend is connected
        }
    } catch (error) {
        console.warn('⚠️ Database connection test failed:', error);
        console.log('App will continue with local-only functionality');
        // Don't show an error to user - app works without backend
    }
}

/**
 * Initialize auto-hide header functionality
 */
function initializeAutoHideHeader() {
    const header = document.getElementById('appHeader');
    if (!header) return;
    
    let lastScrollY = window.scrollY;
    let scrollThreshold = 100; // Hide header after scrolling 100px
    let hideTimeout;
    
    function handleScroll() {
        const currentScrollY = window.scrollY;
        
        // Don't hide header at the top of the page
        if (currentScrollY < scrollThreshold) {
            header.classList.remove('header-hidden');
            return;
        }
        
        // Hide header when scrolling down, show when scrolling up
        if (currentScrollY > lastScrollY) {
            // Scrolling down - hide header
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                header.classList.add('header-hidden');
            }, 150); // Small delay to prevent flickering
        } else {
            // Scrolling up - show header immediately
            clearTimeout(hideTimeout);
            header.classList.remove('header-hidden');
        }
        
        lastScrollY = currentScrollY;
    }
    
    // Throttled scroll event for better performance
    let scrollTicking = false;
    function throttledScroll() {
        if (!scrollTicking) {
            requestAnimationFrame(() => {
                handleScroll();
                scrollTicking = false;
            });
            scrollTicking = true;
        }
    }
    
    // Add scroll listener with passive for better performance
    window.addEventListener('scroll', throttledScroll, { passive: true });
    
    // Show header on focus/interaction (accessibility)
    header.addEventListener('focusin', () => {
        header.classList.remove('header-hidden');
    });
    
    // Show header when hovering near the top
    document.addEventListener('mousemove', (e) => {
        if (e.clientY < 80) { // Mouse near top of screen
            header.classList.remove('header-hidden');
        }
    });
    
    console.log('✅ Auto-hide header initialized');
}

/**
 * Select analysis mode
 * @param {string} mode - Selected mode ('quick', 'clinical', 'advanced')
 */
export function selectMode(mode) {
    try {
        console.log('🎯 Mode selected:', mode);
        UIState.currentMode = mode;
        
        // Validate required elements exist
        const modeSelection = document.getElementById('mode-selection');
        const patientSelection = document.getElementById('patient-selection');
        
        if (!modeSelection) {
            throw new Error('Mode selection element not found');
        }
        if (!patientSelection) {
            throw new Error('Patient selection element not found');
        }
        
        console.log('✅ Mode selection elements found, transitioning...');
        
        // Hide mode selection
        modeSelection.style.display = 'none';
        
        // Show patient selection
        patientSelection.classList.remove('hidden');
        
        // Add visual feedback
        showNotification(`${mode.charAt(0).toUpperCase() + mode.slice(1)} mode selected`, 'success');
        
        console.log('✅ Successfully transitioned to patient selection');
        
    } catch (error) {
        console.error('❌ Error selecting mode:', error);
        console.error('Available elements:', {
            modeSelection: !!document.getElementById('mode-selection'),
            patientSelection: !!document.getElementById('patient-selection')
        });
        showNotification('Error selecting mode. Please try again.', 'error');
    }
}

/**
 * Return to mode selection with comprehensive cleanup
 */
export function backToModeSelection() {
    // Save current session before cleanup
    saveSessionToStorage();
    
    // Clean up MediaPipe
    if (UIState.pose) {
        try {
            // Close the pose instance
            if (typeof UIState.pose.close === 'function') {
                UIState.pose.close();
            }
            UIState.pose = null;
        } catch (error) {
            console.warn('Error closing MediaPipe:', error);
            UIState.pose = null; // Ensure it's cleared even on error
        }
    }
    
    // Clean up enhanced detector if used
    if (UIState.enhancedDetector) {
        try {
            UIState.enhancedDetector.close();
            UIState.enhancedDetector = null;
        } catch (error) {
            console.warn('Error closing enhanced detector:', error);
        }
    }
    
    // Close camera streams
    closeCamera();
    
    // Clear all image data and blob URLs
    clearAllImageData();
    
    // Reset UI state
    UIState.currentMode = null;
    UIState.currentTab = null;
    UIState.currentPatientId = null;
    UIState.currentPatientName = null;
    UIState.currentAssessmentId = null;
    
    // Reset analysis data
    UIState.analysisData = {
        quick: {},
        clinical: {
            clientInfo: {},
            photos: {},
            movements: {}
        },
        advanced: {
            front: null,
            side: null,
            back: null
        }
    };
    
    // Reset upload states
    UIState.uploadedViews = {
        clinical: {
            front: false,
            side: false,
            back: false
        },
        advanced: {
            front: false,
            side: false,
            back: false
        }
    };
    
    // Hide main content
    document.getElementById('main-content').classList.remove('active');
    
    // Show mode selection
    document.getElementById('mode-selection').style.display = 'flex';
    
    // Reset all mode contents
    document.querySelectorAll('.mode-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Clear any form inputs
    clearAllFormInputs();
    
    // Hide patient selection
    document.getElementById('patient-selection').classList.add('hidden');
    
    // Show notification
    showNotification('Session ended. All data cleared.', 'info');
}

/**
 * Show specific tab in clinical mode with data collection
 * @param {string} mode - Current mode
 * @param {string} tabName - Tab to show
 */
export function showTab(mode, tabName) {
    try {
        // Get current tab before switching
        const previousTab = UIState.currentTab;
        
        // Save data from previous tab before switching
        if (previousTab && previousTab !== tabName) {
            if (mode === 'clinical') {
                collectCurrentTabData(previousTab);
                console.log(`Collected data from ${previousTab} tab before switching to ${tabName}`);
            }
        }
        
        // Hide all tabs
        document.querySelectorAll(`#${mode}-mode .tab-content`).forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active from all buttons
        document.querySelectorAll(`#${mode}-mode .tab-btn`).forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab
        const targetTab = document.getElementById(`${mode}-${tabName}`);
        if (targetTab) {
            targetTab.classList.add('active');
        }
        
        // Activate button
        const activeBtn = Array.from(document.querySelectorAll(`#${mode}-mode .tab-btn`))
            .find(btn => btn.dataset.tab === tabName);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Update tab data when showing summary
        if (mode === 'clinical' && tabName === 'summary') {
            updateSummaryTab();
        }
        
        UIState.currentTab = tabName;
        
    } catch (error) {
        console.error('Error showing tab:', error);
        showNotification('Error switching tabs', 'error');
    }
}

/**
 * Start camera for specified mode with enhanced error handling
 * @param {string} mode - Current mode
 */
export async function startCamera(mode) {
    try {
        showLoading('Initializing camera...');
        closeCamera(); // Clean up any existing stream
        
        // Check if camera is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera not available in this browser');
        }
        
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 }
            }
        };
        
        UIState.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        const video = document.getElementById(`${mode}-camera`);
        if (!video) {
            throw new Error('Video element not found');
        }
        
        video.srcObject = UIState.currentStream;
        video.classList.remove('hidden');
        
        // Wait for video to load before showing analyze button
        video.addEventListener('loadedmetadata', () => {
            hideLoading();
            const analyzeBtn = document.getElementById(`${mode}-analyze-btn`);
            if (analyzeBtn) {
                analyzeBtn.classList.remove('hidden');
                setButtonState(analyzeBtn, 'ready');
            }
            showNotification('Camera ready! Position yourself and click Analyze.', 'success');
        });
        
    } catch (error) {
        console.error('Camera error:', error);
        hideLoading();
        
        let errorMessage = 'Camera access failed. ';
        if (error.name === 'NotAllowedError') {
            errorMessage += 'Please allow camera access and try again.';
        } else if (error.name === 'NotFoundError') {
            errorMessage += 'No camera found. Please use file upload instead.';
        } else {
            errorMessage += 'Please use file upload instead.';
        }
        
        showNotification(errorMessage, 'error');
    }
}

/**
 * Close camera stream with comprehensive cleanup
 */
export function closeCamera() {
    try {
        if (UIState.currentStream) {
            UIState.currentStream.getTracks().forEach(track => {
                track.stop();
                console.log('Camera track stopped:', track.kind);
            });
            UIState.currentStream = null;
        }
        
        // Clean up video elements
        const videoElements = document.querySelectorAll('video');
        videoElements.forEach(video => {
            if (video.srcObject) {
                video.srcObject = null;
                video.classList.add('hidden');
            }
        });
        
        // Hide analyze buttons that depend on camera
        const analyzeButtons = document.querySelectorAll('[data-action="analyze-posture"]');
        analyzeButtons.forEach(btn => {
            const preview = document.getElementById(btn.dataset.mode + '-preview');
            if (!preview || preview.classList.contains('hidden')) {
                btn.classList.add('hidden');
            }
        });
        
    } catch (error) {
        console.error('Error closing camera:', error);
    }
}

/**
 * Handle file upload with comprehensive validation and error handling
 * @param {string} identifier - View identifier (e.g., 'quick', 'clinical-front')
 * @param {Event} event - File input event
 */
export function handleFileUpload(identifier, event) {
    const file = event.target.files[0];
    
    if (!file) {
        showNotification('No file selected', 'warning');
        return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showNotification('Please select a valid image file (JPG, PNG, etc.)', 'error');
        event.target.value = ''; // Clear input
        return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showNotification('Image too large. Please select an image under 10MB.', 'error');
        event.target.value = ''; // Clear input
        return;
    }
    
    showLoading('Processing image...');
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            displayUploadedImage(identifier, e.target.result);
            hideLoading();
            showNotification('Image uploaded successfully', 'success');
        } catch (error) {
            console.error('Error processing image:', error);
            hideLoading();
            showNotification('Error processing image. Please try again.', 'error');
        }
    };
    
    reader.onerror = function() {
        hideLoading();
        showNotification('Error reading file. Please try again.', 'error');
    };
    
    reader.readAsDataURL(file);
}

/**
 * Display uploaded image with enhanced error handling and validation
 * @param {string} identifier - View identifier
 * @param {string} imageSrc - Image data URL
 */
function displayUploadedImage(identifier, imageSrc) {
    try {
        // Validate image before displaying
        const img = new Image();
        img.onload = function() {
            // Check image dimensions
            if (this.width < 200 || this.height < 200) {
                showNotification('Image too small. Please use an image at least 200x200 pixels.', 'error');
                return;
            }
            
            const preview = document.getElementById(`${identifier}-preview`);
            if (preview) {
                preview.src = imageSrc;
                preview.classList.remove('hidden');
                
                // Add loading class until image loads
                preview.classList.add('loading');
                preview.onload = () => {
                    preview.classList.remove('loading');
                };
            }
            
            // Hide camera if active
            const camera = document.getElementById(`${identifier}-camera`);
            if (camera) camera.classList.add('hidden');
            
            // Show analyze button and calibration input for quick mode
            if (identifier === 'quick') {
                const analyzeBtn = document.getElementById('quick-analyze-btn');
                const calibrationDiv = document.getElementById('quick-calibration');
                if (analyzeBtn) {
                    analyzeBtn.classList.remove('hidden');
                    setButtonState(analyzeBtn, 'ready');
                }
                // CRITICAL FIX 2d: Show calibration input when image is uploaded
                if (calibrationDiv) {
                    calibrationDiv.classList.remove('hidden');
                }
            }
            
            // Store image in UIState for advanced mode
            if (identifier.includes('advanced-')) {
                const [mode, view] = identifier.split('-');
                if (!UIState.analysisData.advanced.images) {
                    UIState.analysisData.advanced.images = {};
                }
                UIState.analysisData.advanced.images[view] = {
                    imageData: imageSrc,
                    filename: 'uploaded-image.jpg',
                    uploadTime: new Date().toISOString(),
                    dimensions: {
                        width: this.width,
                        height: this.height
                    }
                };
                console.log(`Advanced mode: Stored ${view} image in UIState`);
            }
            
            // Update status for clinical/advanced modes
            if (identifier.includes('-')) {
                const [mode, view] = identifier.split('-');
                updateUploadStatus(mode, view);
            }
        };
        
        img.onerror = function() {
            console.error('displayUploadedImage: Failed to load image');
            showNotification('Invalid or corrupted image file. Please try another image.', 'error');
        };
        
        img.src = imageSrc;
        
    } catch (error) {
        console.error('Error displaying image:', error);
        showNotification(error.message || 'Error displaying image', 'error');
    }
}

/**
 * Update upload status for multi-view modes with enhanced feedback
 * @param {string} mode - Current mode
 * @param {string} view - View name (front/side/back)
 */
function updateUploadStatus(mode, view) {
    try {
        const statusElement = document.getElementById(`${mode}-${view}-status`);
        const cardElement = document.getElementById(`${mode}-${view}-card`);
        
        if (statusElement) {
            statusElement.textContent = '✅';
        }
        
        if (cardElement) {
            cardElement.classList.add('completed');
        }
        
        UIState.uploadedViews[mode][view] = true;
        
        // Check if all views are complete for advanced mode
        if (mode === 'advanced') {
            const allViews = UIState.uploadedViews.advanced;
            const totalViews = Object.keys(allViews).length;
            const completedViews = Object.values(allViews).filter(Boolean).length;
            
            // Show progress
            showNotification(`${completedViews}/${totalViews} views uploaded`, 'info');
            
            if (allViews.front && allViews.side && allViews.back) {
                showNotification('All views uploaded. Starting comprehensive analysis...', 'success');
                setTimeout(() => {
                    performAdvancedAnalysis().catch(error => {
                        console.error('Advanced analysis failed:', error);
                        showNotification('Analysis failed. Please try uploading the images again.', 'error');
                    });
                }, 500); // Small delay for UX
            }
        }
        
    } catch (error) {
        console.error('Error updating upload status:', error);
        showNotification('Error updating upload status', 'error');
    }
}

/**
 * Analyze posture with comprehensive error handling
 * @param {string} mode - Current mode
 */
export async function analyzePosture(mode) {
    try {
        // Show enhanced loading with progress for analysis
        const progressSteps = [
            'Validating image',
            'Detecting pose landmarks',
            'Calculating metrics',
            'Generating recommendations'
        ];
        const progressController = showLoadingWithProgress('Analyzing posture...', progressSteps);
        
        // Step 1: Validate image source
        progressController.updateProgress(0, 25);
        
        let imageSource;
        const video = document.getElementById(`${mode}-camera`);
        const preview = document.getElementById(`${mode}-preview`);
        
        // Determine image source
        if (video && !video.classList.contains('hidden') && video.videoWidth > 0) {
            // Capture from video
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            imageSource = canvas;
        } else if (preview && !preview.classList.contains('hidden') && preview.complete) {
            imageSource = preview;
        } else {
            throw new Error('No valid image source found. Please capture or upload an image first.');
        }
        
        // Step 2: Initialize MediaPipe
        progressController.updateProgress(1, 40);
        
        // Validate MediaPipe initialization
        // Always use EnhancedPoseDetector for advanced mode
        if (mode === 'advanced') {
            if (!UIState.enhancedDetector) {
                UIState.enhancedDetector = new EnhancedPoseDetector();
                await UIState.enhancedDetector.initialize(mode);
                UIState.pose = UIState.enhancedDetector.pose; // Get the actual pose object
            }
        } else if (!UIState.pose) {
            UIState.pose = initializePose(mode); // No await needed - synchronous!
        }
        
        // Step 3: Process with MediaPipe
        progressController.updateProgress(1, 60);
        
        // Process with MediaPipe with timeout
        const analysisPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Analysis timed out. Please try again.'));
            }, 30000); // 30 second timeout
            
            // Handle enhanced detector or regular pose
            if (mode === 'advanced') {
                UIState.enhancedDetector.on('pose', (results) => {
                    clearTimeout(timeout);
                    
                    // Step 4: Process results
                    progressController.updateProgress(2, 80);
                    
                    // Log enhanced metrics
                    console.log('Enhanced pose results:', {
                        confidence: results.confidence,
                        stability: results.stability,
                        landmarks: results.poseLandmarks.length
                    });
                    
                    processAdvancedResults(results, 'analysis');
                    
                    // Complete
                    progressController.updateProgress(3, 100);
                    progressController.complete();
                    
                    resolve(results);
                });
            } else {
                // Add error checking for pose object
                if (!UIState.pose || typeof UIState.pose.onResults !== 'function') {
                    console.error('MediaPipe pose not properly initialized');
                    reject(new Error('Pose detection engine not available. Please refresh the page.'));
                    return;
                }
                
                UIState.pose.onResults((results) => {
                    clearTimeout(timeout);
                    
                    // Step 4: Process results
                    progressController.updateProgress(2, 80);
                    
                    if (mode === 'quick') {
                        processQuickResults(results);
                    } else {
                        processAdvancedResults(results, 'analysis');
                    }
                    
                    // Complete
                    progressController.updateProgress(3, 100);
                    progressController.complete();
                    
                    resolve(results);
                });
            }
        });
        
        // Send image to the appropriate handler
        if (mode === 'advanced') {
            await UIState.enhancedDetector.send({image: imageSource});
        } else {
            // Ensure pose.send is available before calling
            if (!UIState.pose || typeof UIState.pose.send !== 'function') {
                throw new Error('MediaPipe not properly initialized. Please refresh the page.');
            }
            
            await UIState.pose.send({image: imageSource});
        }
        await analysisPromise;
        
    } catch (error) {
        console.error('Analysis error:', error);
        hideLoading();
        showNotification(error.message || 'Analysis failed. Please try again.', 'error');
        throw error; // Re-throw for button state handling
    }
}

/**
 * Process quick mode results with enhanced error handling and validation
 * @param {Object} results - MediaPipe results
 */
function processQuickResults(results) {
    try {
        hideLoading();
        
        // Validate MediaPipe results
        if (!results) {
            throw new Error('No analysis results received');
        }
        
        if (!results.poseLandmarks || results.poseLandmarks.length < 33) {
            throw new Error('Incomplete pose detected. Please ensure your full body is visible and try again.');
        }
        
        // Check landmark quality
        const landmarks = results.poseLandmarks;
        
        // Update calibration status with enhanced landmark-based system
        updateCalibrationStatus(landmarks, 'quick');
        const criticalLandmarks = [11, 12, 23, 24]; // shoulders and hips
        const lowQualityCount = criticalLandmarks.filter(idx => 
            !landmarks[idx] || landmarks[idx].visibility < 0.5
        ).length;
        
        if (lowQualityCount > 1) {
            showNotification('Low quality pose detection. Results may be less accurate.', 'warning');
        }
        
        // CRITICAL FIX 2d: Get patient height and image metadata for calibration
        const patientHeight = getPatientHeight('quick');
        const imageElement = document.getElementById('quick-preview');
        const imageMetadata = getImageMetadata('quick-preview');
        
        // Calculate basic metrics with real-world calibration
        const metrics = calculateBasicMetrics(landmarks, patientHeight, imageMetadata);
        if (!metrics || Object.values(metrics).some(v => isNaN(v))) {
            throw new Error('Error calculating posture metrics');
        }
        
        UIState.analysisData.quick = {
            ...metrics,
            timestamp: new Date().toISOString(),
            confidence: calculateOverallConfidence(landmarks)
        };
        
        // Calculate score with validation
        let score = 100;
        score -= Math.min(metrics.shoulderLevel * 5, 15);
        score -= Math.min(metrics.headTilt * 3, 10);
        score -= Math.min(metrics.hipLevel * 5, 15);
        score = Math.max(0, Math.round(score));
        
        // Display results
        displayQuickResults(score, metrics, landmarks);
        
    } catch (error) {
        console.error('Error processing quick results:', error);
        hideLoading();
        showNotification(error.message || 'Analysis failed. Please try again.', 'error');
        
        // Reset analyze button state
        const analyzeBtn = document.getElementById('quick-analyze-btn');
        if (analyzeBtn) {
            setButtonState(analyzeBtn, 'ready');
        }
    }
}

/**
 * Calculate overall confidence score from landmarks
 * @param {Array} landmarks - Pose landmarks
 * @returns {number} Confidence score (0-1)
 */
function calculateOverallConfidence(landmarks) {
    if (!landmarks || landmarks.length === 0) return 0;
    
    const visibleLandmarks = landmarks.filter(landmark => 
        landmark && landmark.visibility > 0.3
    );
    
    const averageVisibility = visibleLandmarks.reduce((sum, landmark) => 
        sum + landmark.visibility, 0
    ) / visibleLandmarks.length;
    
    return Math.round(averageVisibility * 100) / 100;
}

/**
 * Display quick assessment results
 * @param {number} score - Posture score
 * @param {Object} metrics - Calculated metrics
 * @param {Array} landmarks - Pose landmarks
 */
function displayQuickResults(score, metrics, landmarks) {
    // Update score
    document.getElementById('quick-score').textContent = score;
    
    // Check if we have calibration data (patient height set)
    const hasCalibration = getPatientHeight() > 0;
    const unitLabel = hasCalibration ? ' cm' : '';
    
    // Display metrics
    const metricsHTML = `
        <div class="metric-card">
            <div class="metric-header">
                <span class="metric-title">Head Alignment</span>
                <span class="metric-value">
                    ${formatNumber(metrics.headTilt, 1)}°
                    <span class="severity-indicator severity-${getSeverity(metrics.headTilt, [2, 5, 10])}"></span>
                </span>
            </div>
        </div>
        <div class="metric-card">
            <div class="metric-header">
                <span class="metric-title">Shoulder Level</span>
                <span class="metric-value">
                    ${formatNumber(metrics.shoulderLevel, 1)}${unitLabel}
                    <span class="severity-indicator severity-${getSeverity(metrics.shoulderLevel, [1, 2, 3])}"></span>
                </span>
            </div>
        </div>
        <div class="metric-card">
            <div class="metric-header">
                <span class="metric-title">Hip Level</span>
                <span class="metric-value">
                    ${formatNumber(metrics.hipLevel, 1)}${unitLabel}
                    <span class="severity-indicator severity-${getSeverity(metrics.hipLevel, [1, 2, 3])}"></span>
                </span>
            </div>
        </div>
    `;
    // Use innerHTML for metrics display (no user input)
    document.getElementById('quick-metrics').innerHTML = metricsHTML;
    
    // Generate recommendations
    const exercises = generateExerciseRecommendations(metrics);
    const recommendationsContainer = document.getElementById('quick-recommendations');
    recommendationsContainer.innerHTML = ''; // Clear existing content
    
    const ul = document.createElement('ul');
    ul.style.listStyle = 'none';
    ul.style.padding = '0';
    
    exercises.forEach(exercise => {
        const li = document.createElement('li');
        li.style.padding = '8px 0';
        
        const strong = document.createElement('strong');
        strong.textContent = exercise.name;
        
        li.appendChild(strong);
        li.appendChild(document.createTextNode(' - ' + exercise.description));
        ul.appendChild(li);
    });
    
    recommendationsContainer.appendChild(ul);
    
    // Show results
    document.getElementById('quick-results').classList.remove('hidden');
    
    // Draw skeleton on canvas
    const canvas = document.getElementById('quick-canvas');
    const ctx = canvas.getContext('2d');
    const img = document.getElementById('quick-preview');
    
    if (img && !img.classList.contains('hidden')) {
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        drawConnectors(ctx, landmarks, POSE_CONNECTIONS, {color: '#667eea', lineWidth: 2});
        drawLandmarks(ctx, landmarks, {color: '#764ba2', radius: 3});
    }
}

/**
 * Perform advanced biomechanical analysis with enhanced error handling
 */
async function performAdvancedAnalysis() {
    try {
        showLoading('Analyzing all views...');
        
        // Validate all images are loaded and ready
        const views = ['front', 'side', 'back'];
        const images = {};
        
        for (const view of views) {
            const img = document.getElementById(`advanced-${view}-preview`);
            if (!img || img.classList.contains('hidden') || !img.complete) {
                throw new Error(`${view} view image not ready. Please ensure all images are uploaded.`);
            }
            images[view] = img;
        }
        
        // Initialize MediaPipe if needed
        if (!UIState.pose) {
            showLoading('Initializing analysis engine...');
            UIState.pose = initializePose('advanced'); // No await needed - synchronous!
        }
        
        // Process each view with progress updates
        let completedViews = 0;
        for (const view of views) {
            showLoading(`Analyzing ${view} view (${completedViews + 1}/${views.length})...`);
            
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error(`Analysis of ${view} view timed out`));
                }, 20000); // 20 second timeout per view
                
                // Check if pose is properly initialized
                if (!UIState.pose || typeof UIState.pose.onResults !== 'function') {
                    console.error('MediaPipe pose not properly initialized for advanced mode');
                    reject(new Error('Pose detection engine not available. Please refresh the page.'));
                    return;
                }
                
                UIState.pose.onResults((results) => {
                    clearTimeout(timeout);
                    try {
                        processAdvancedResults(results, view);
                        completedViews++;
                        resolve(results);
                    } catch (error) {
                        reject(error);
                    }
                });
                
                // Verify pose.send exists before calling
                if (!UIState.pose || typeof UIState.pose.send !== 'function') {
                    reject(new Error('MediaPipe not initialized. Please refresh the page.'));
                    return;
                }
                
                UIState.pose.send({image: images[view]}).catch(reject);
            });
        }
        
        // Compile results
        showLoading('Compiling analysis results...');
        compileAdvancedResults();
        hideLoading();
        showNotification('Advanced analysis completed successfully!', 'success');
        
    } catch (error) {
        console.error('Advanced analysis error:', error);
        hideLoading();
        showNotification(error.message || 'Advanced analysis failed. Please try again.', 'error');
        
        // Reset upload states so user can try again
        resetAdvancedUploadStates();
    }
}

/**
 * Reset advanced mode upload states for retry
 */
function resetAdvancedUploadStates() {
    UIState.uploadedViews.advanced = {
        front: false,
        side: false,
        back: false
    };
    
    ['front', 'side', 'back'].forEach(view => {
        const statusElement = document.getElementById(`advanced-${view}-status`);
        const cardElement = document.getElementById(`advanced-${view}-card`);
        
        if (statusElement) {
            statusElement.textContent = '📷';
        }
        if (cardElement) {
            cardElement.classList.remove('completed');
        }
    });
}

// NOTE: calculateMeasurementConfidence is now imported from utils.js (enhanced version)

/**
 * Update calibration status display for a given mode
 * @param {Array} landmarks - MediaPipe landmarks
 * @param {string} mode - Analysis mode ('quick', 'clinical', 'advanced')
 */
function updateCalibrationStatus(landmarks, mode) {
    if (!landmarks || landmarks.length < 33) {
        console.log(`updateCalibrationStatus: No valid landmarks for ${mode} mode`);
        return;
    }
    
    try {
        const patientHeight = getPatientHeight(mode);
        const imageMetadata = getImageMetadata(`${mode}-preview`) || getImageMetadata(`${mode}-captured-image`);
        
        if (patientHeight && imageMetadata) {
            const calibrationData = calculateLandmarkCalibration(landmarks, patientHeight, imageMetadata);
            const status = getCalibrationStatus(calibrationData);
            
            console.log(`${mode} mode calibration:`, status);
            
            // Update UI with calibration status - could add visual indicators here
            // For now, just log the status for clinical review
        }
    } catch (error) {
        console.warn(`updateCalibrationStatus error for ${mode}:`, error.message);
    }
}

/**
 * Process advanced mode results
 * @param {Object} results - MediaPipe results
 * @param {string} view - Current view
 */
function processAdvancedResults(results, view) {
    if (!results.poseLandmarks) {
        showNotification(`No pose detected in ${view} view`, 'warning');
        return;
    }
    
    // Store raw landmarks for future use
    if (!UIState.analysisData.advanced.landmarks) {
        UIState.analysisData.advanced.landmarks = {};
    }
    UIState.analysisData.advanced.landmarks[view] = results.poseLandmarks;
    
    // Update calibration status with enhanced landmark-based system
    updateCalibrationStatus(results.poseLandmarks, 'advanced');
    
    // CRITICAL FIX 2d: Get patient height and image metadata for calibration  
    const patientHeight = getPatientHeight('advanced');
    const imageMetadata = getImageMetadata(`advanced-${view}-preview`);
    
    // Analyze based on view with real-world calibration
    let analysis;
    switch (view) {
        case 'front':
            analysis = analyzeFrontView(results.poseLandmarks, patientHeight, imageMetadata);
            break;
        case 'side':
            analysis = analyzeSideView(results.poseLandmarks, patientHeight, imageMetadata);
            break;
        case 'back':
            analysis = analyzeBackView(results.poseLandmarks, patientHeight, imageMetadata);
            break;
    }
    
    // Convert to database format with measurements array
    const measurements = [];
    if (analysis) {
        Object.entries(analysis).forEach(([key, value]) => {
            if (typeof value === 'number' && key !== 'totalDeviation' && key !== 'view') {
                measurements.push({
                    name: key,
                    type: key,  // Both for compatibility
                    value: value,
                    unit: MEASUREMENT_UNITS[key] || 'units',  // FIXED: Use correct unit mapping
                    confidence: calculateMeasurementConfidence(results.poseLandmarks, key), // FIXED: Dynamic confidence
                    viewType: view
                });
            }
        });
        
        // Handle special cases like weight distribution
        if (analysis.weightDistribution) {
            measurements.push(
                {
                    name: 'weightDistributionLeft',
                    type: 'weight_distribution_left',
                    value: analysis.weightDistribution.left,
                    unit: 'percent',
                    confidence: calculateMeasurementConfidence(results.poseLandmarks, 'weightDistributionLeft'), // FIXED: Dynamic confidence
                    viewType: view
                },
                {
                    name: 'weightDistributionRight',
                    type: 'weight_distribution_right',
                    value: analysis.weightDistribution.right,
                    unit: 'percent',
                    confidence: calculateMeasurementConfidence(results.poseLandmarks, 'weightDistributionRight'), // FIXED: Dynamic confidence
                    viewType: view
                }
            );
        }
    }
    
    // Store both formats for compatibility
    UIState.analysisData.advanced[view] = {
        ...analysis,
        measurements: measurements,
        confidence: results.confidence || 0.85,
        stability: results.stability || 1.0,
        timestamp: new Date().toISOString()
    };
    
    console.log(`Processed ${view} view with ${measurements.length} measurements`);
    
    // Draw skeleton
    const canvas = document.getElementById(`advanced-${view}-canvas`);
    const ctx = canvas.getContext('2d');
    const img = document.getElementById(`advanced-${view}-preview`);
    
    canvas.width = img.width;
    canvas.height = img.height;
    
    drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#667eea', lineWidth: 2});
    drawLandmarks(ctx, results.poseLandmarks, {color: '#764ba2', radius: 3});
}

/**
 * Compile and display advanced results
 */
function compileAdvancedResults() {
    const data = UIState.analysisData.advanced;
    
    // Calculate overall score
    let score = 100;
    if (data.front) score -= Math.min(data.front.totalDeviation, 25);
    if (data.side) score -= Math.min(data.side.totalDeviation, 25);
    if (data.back) score -= Math.min(data.back.totalDeviation, 25);
    score = Math.max(0, Math.round(score));
    
    // Display score
    document.getElementById('advanced-score').textContent = score;
    
    // Display metrics
    displayAdvancedMetrics(data);
    
    // Create charts
    createForceChart(data.front);
    createMovementChart(data);
    
    // Display risk assessment
    const combinedData = {...data.front, ...data.side, ...data.back};
    const risks = calculateInjuryRisk(combinedData);
    displayRiskAssessment(risks);
    
    // Show results section
    document.getElementById('advanced-results').classList.remove('hidden');
}

/**
 * Display advanced metrics
 * @param {Object} data - Analysis data
 */
function displayAdvancedMetrics(data) {
    let metricsHTML = '';
    
    if (data.front) {
        metricsHTML += createMetricCard('Q-Angle', 
            formatNumber(data.front.qAngle, 1) + '°',
            getSeverity(Math.abs(data.front.qAngle - 15), [3, 5, 8]));
        metricsHTML += createMetricCard('Shoulder Asymmetry', 
            formatNumber(data.front.shoulderAsymmetry, 1) + '%',
            getSeverity(data.front.shoulderAsymmetry, [1, 2, 3]));
    }
    
    if (data.side) {
        metricsHTML += createMetricCard('Forward Head', 
            formatNumber(data.side.forwardHead, 1) + '%',
            getSeverity(Math.abs(data.side.forwardHead), [2, 4, 6]));
        metricsHTML += createMetricCard('Pelvic Angle', 
            formatNumber(data.side.pelvicAngle, 1) + '°',
            getSeverity(Math.abs(data.side.pelvicAngle - 10), [5, 10, 15]));
    }
    
    if (data.back) {
        metricsHTML += createMetricCard('Spinal Deviation', 
            formatNumber(data.back.spinalDeviation, 1) + '%',
            getSeverity(data.back.spinalDeviation, [2, 3, 4]));
    }
    
    document.getElementById('advanced-metrics').innerHTML = metricsHTML;
}

/**
 * Create metric card HTML
 * @param {string} title - Metric title
 * @param {string} value - Metric value
 * @param {string} severity - Severity level
 * @returns {string} HTML string
 */
function createMetricCard(title, value, severity) {
    return `
        <div class="metric-card">
            <div class="metric-header">
                <span class="metric-title">${title}</span>
                <span class="metric-value">
                    ${value}
                    <span class="severity-indicator severity-${severity}"></span>
                </span>
            </div>
        </div>
    `;
}

/**
 * Create force distribution chart
 * @param {Object} frontData - Front view data
 */
function createForceChart(frontData) {
    if (!frontData || !frontData.weightDistribution) return;
    
    const ctx = document.getElementById('force-chart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Left Foot', 'Right Foot'],
            datasets: [{
                label: 'Weight Distribution (%)',
                data: [
                    frontData.weightDistribution.left, 
                    frontData.weightDistribution.right
                ],
                backgroundColor: ['#667eea', '#764ba2']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

/**
 * Create movement quality prediction chart
 * @param {Object} data - Combined analysis data
 */
function createMovementChart(data) {
    const ctx = document.getElementById('movement-chart').getContext('2d');
    
    // Predict movement quality based on postural data
    const predictions = {
        'Squat': 100,
        'Lunge': 100,
        'Overhead': 100,
        'Balance': 100,
        'Rotation': 100,
        'Flexion': 100
    };
    
    // Adjust predictions based on findings
    if (data.front) {
        predictions.Squat -= Math.min(data.front.shoulderAsymmetry * 5, 20);
        predictions.Lunge -= Math.min(data.front.hipAsymmetry * 5, 20);
        predictions.Balance -= Math.min(data.front.totalDeviation * 0.5, 20);
    }
    
    if (data.side) {
        predictions.Overhead -= Math.min(Math.abs(data.side.forwardHead) * 3, 20);
        predictions.Flexion -= Math.min(Math.abs(data.side.kyphosisAngle - 160) * 1.5, 20);
    }
    
    if (data.back) {
        predictions.Rotation -= Math.min(data.back.spinalDeviation * 3, 20);
    }
    
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: Object.keys(predictions),
            datasets: [{
                label: 'Movement Quality Prediction',
                data: Object.values(predictions).map(v => Math.max(0, v)),
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                borderColor: '#667eea',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

/**
 * Display risk assessment
 * @param {Object} risks - Risk scores
 */
function displayRiskAssessment(risks) {
    let html = '<div class="metrics-grid">';
    
    Object.entries(risks).forEach(([condition, risk]) => {
        const severity = risk < 30 ? 'optimal' : risk < 60 ? 'mild' : 'moderate';
        html += `
            <div class="metric-card">
                <div class="metric-header">
                    <span class="metric-title">${formatRiskName(condition)}</span>
                    <span class="metric-value">
                        ${Math.round(risk)}%
                        <span class="severity-indicator severity-${severity}"></span>
                    </span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    document.getElementById('risk-assessment').innerHTML = html;
}

/**
 * Format risk condition name
 * @param {string} condition - Condition key
 * @returns {string} Formatted name
 */
function formatRiskName(condition) {
    const names = {
        'lowBack': 'Low Back Pain',
        'neck': 'Neck Pain',
        'knee': 'Knee Pain',
        'shoulder': 'Shoulder Impingement'
    };
    return names[condition] || condition;
}

// Loading timeout management
let loadingTimeout = null;
let loadingStartTime = null;

/**
 * Show loading overlay with optional custom message and auto-hide timeout
 * @param {string} message - Optional loading message
 * @param {number} timeoutMs - Auto-hide timeout in milliseconds (default: 30 seconds)
 */
export function showLoading(message = 'Analyzing posture...', timeoutMs = 30000) {
    try {
        console.log('🔄 Showing loading:', message);
        loadingStartTime = Date.now();
        
        const loading = document.getElementById('loading');
        if (!loading) {
            console.error('❌ Loading element not found');
            return;
        }
        
        const loadingText = loading.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = message;
        }
        
        loading.classList.add('active');
        
        // Clear any existing timeout
        if (loadingTimeout) {
            clearTimeout(loadingTimeout);
        }
        
        // Set auto-hide timeout to prevent stuck loading
        loadingTimeout = setTimeout(() => {
            console.warn('⏰ Loading timeout reached, auto-hiding after', timeoutMs + 'ms');
            hideLoading();
            showNotification('Operation took longer than expected', 'warning');
        }, timeoutMs);
        
    } catch (error) {
        console.error('❌ Error showing loading:', error);
    }
}

/**
 * Show enhanced loading overlay with progress tracking
 */
export function showLoadingWithProgress(message = 'Processing...', steps = []) {
    try {
        console.log('🔄 Showing loading with progress:', message, steps);
        loadingStartTime = Date.now();
        
        const loading = document.getElementById('loading');
        if (!loading) {
            console.error('❌ Loading element not found');
            return null;
        }
        
        // Create enhanced loading content with progress
        loading.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">${message}</div>
                <div class="loading-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                    </div>
                    <div class="progress-steps">
                        ${steps.map((step, index) => `
                            <div class="progress-step" data-step="${index}">
                                <svg class="step-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                </svg>
                                <span class="step-text">${step}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        loading.classList.add('active');
        
        // Clear any existing timeout
        if (loadingTimeout) {
            clearTimeout(loadingTimeout);
        }
        
        // Set auto-hide timeout
        loadingTimeout = setTimeout(() => {
            console.warn('⏰ Loading timeout reached, auto-hiding');
            hideLoading();
            showNotification('Operation took longer than expected', 'warning');
        }, 60000); // 60 seconds for progress operations
        
        // Return progress controller
        return {
            updateProgress: (stepIndex, percent) => {
                const fill = document.getElementById('progress-fill');
                if (fill) {
                    fill.style.width = `${percent}%`;
                }
                
                const steps = loading.querySelectorAll('.progress-step');
                steps.forEach((step, index) => {
                    if (index < stepIndex) {
                        step.classList.add('completed');
                        step.querySelector('.step-icon').innerHTML = '<path d="M20 6L9 17l-5-5"/>';
                    } else if (index === stepIndex) {
                        step.classList.add('active');
                        step.classList.remove('completed');
                    }
                });
            },
            complete: () => {
                const fill = document.getElementById('progress-fill');
                if (fill) {
                    fill.style.width = '100%';
                }
                const steps = loading.querySelectorAll('.progress-step');
                steps.forEach(step => {
                    step.classList.add('completed');
                    step.querySelector('.step-icon').innerHTML = '<path d="M20 6L9 17l-5-5"/>';
                });
                setTimeout(hideLoading, 500);
            },
            hide: hideLoading
        };
        
    } catch (error) {
        console.error('❌ Error showing loading with progress:', error);
        return null;
    }
}

/**
 * Hide loading overlay
 */
export function hideLoading() {
    try {
        const loading = document.getElementById('loading');
        if (!loading) {
            console.error('❌ Loading element not found for hiding');
            return;
        }
        
        loading.classList.remove('active');
        
        // Clear timeout
        if (loadingTimeout) {
            clearTimeout(loadingTimeout);
            loadingTimeout = null;
        }
        
        // Log duration if we have start time
        if (loadingStartTime) {
            const duration = Date.now() - loadingStartTime;
            console.log('✅ Loading hidden after', duration + 'ms');
            loadingStartTime = null;
        }
        
    } catch (error) {
        console.error('❌ Error hiding loading:', error);
    }
}

/**
 * Show notification message
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success/error/warning)
 */
export function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#ffc107'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Handle keyboard shortcuts
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleKeyboardShortcuts(event) {
    // Cmd/Ctrl + S to save
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        saveCurrentWork();
    }
    
    // Escape to go back
    if (event.key === 'Escape') {
        if (UIState.currentMode) {
            backToModeSelection();
        }
    }
}

/**
 * Centralized click event handler using event delegation
 * @param {Event} event - Click event
 */
function handleGlobalClick(event) {
    const target = event.target;
    
    // Handle mode selection cards FIRST (before checking for data-action)
    if (target.closest('.mode-card')) {
        const modeCard = target.closest('.mode-card');
        const selectedMode = modeCard.dataset.mode;
        console.log('🔘 Mode card clicked:', {
            element: modeCard,
            mode: selectedMode,
            classList: Array.from(modeCard.classList),
            dataset: modeCard.dataset
        });
        
        if (selectedMode) {
            console.log('🚀 Calling selectMode with:', selectedMode);
            selectMode(selectedMode);
        } else {
            console.error('❌ No mode found in dataset:', modeCard.dataset);
        }
        return; // Exit after handling mode selection
    }
    
    // Handle back button
    if (target.closest('.nav-back')) {
        backToModeSelection();
        return;
    }
    
    // Handle tab buttons
    if (target.closest('.tab-btn')) {
        const tabBtn = target.closest('.tab-btn');
        const tabName = tabBtn.dataset.tab;
        if (tabName && UIState.currentMode) {
            showTab(UIState.currentMode, tabName);
        }
        return;
    }
    
    // Now handle buttons with data-action
    const button = target.closest('[data-action]');
    if (!button) return;
    
    const action = button.dataset.action;
    const mode = button.dataset.mode;
    const tab = button.dataset.tab;
    
    // Prevent double-clicks during processing
    if (button.classList.contains('processing')) {
        event.preventDefault();
        return;
    }
    
    try {
        switch (action) {
            case 'start-camera':
                setButtonState(button, 'processing');
                startCamera(mode).finally(() => {
                    setButtonState(button, 'ready');
                });
                break;
                
            case 'analyze-posture':
                setButtonState(button, 'processing');
                analyzePosture(mode).finally(() => {
                    setButtonState(button, 'ready');
                });
                break;
                
            case 'save-results':
                setButtonState(button, 'processing');
                saveQuickResults();
                setTimeout(() => setButtonState(button, 'success'), 1000);
                break;
                
            case 'reset-analysis':
                if (mode === 'quick') {
                    resetQuickAnalysis();
                } else if (mode === 'advanced') {
                    resetAdvancedAnalysis();
                }
                showNotification('Analysis reset successfully', 'success');
                break;
                
            case 'show-tab':
                showTab(mode, tab);
                break;
                
            case 'generate-report':
                setButtonState(button, 'processing');
                generateClinicalReport().finally(() => {
                    setButtonState(button, 'ready');
                });
                break;
                
            case 'export-data':
                setButtonState(button, 'processing');
                exportBiomechanics();
                setTimeout(() => setButtonState(button, 'success'), 1000);
                break;
                
            case 'save-clinical':
                setButtonState(button, 'processing');
                saveClinicalAssessment();
                setTimeout(() => setButtonState(button, 'success'), 1000);
                break;
                
            case 'generate-clinical-report':
                setButtonState(button, 'processing');
                generateClinicalPDFReport().finally(() => {
                    setButtonState(button, 'ready');
                });
                break;
                
            case 'create-patient':
                setButtonState(button, 'processing');
                handleCreatePatient().then(() => {
                    setButtonState(button, 'success');
                }).catch(() => {
                    setButtonState(button, 'error');
                });
                break;
                
            case 'skip-patient':
                handleSkipPatient();
                break;
                
            case 'back-to-modes':
                backToModeSelection();
                break;
                
            case 'camera-capture':
                handleCameraCapture(button);
                break;
                
            case 'file-browse':
                handleFileBrowse(button);
                break;
                
            default:
                console.warn('Unknown action:', action);
        }
    } catch (error) {
        console.error('Error handling click:', error);
        setButtonState(button, 'error');
        showNotification('Action failed. Please try again.', 'error');
    }
}

/**
 * Centralized change event handler for file inputs
 * @param {Event} event - Change event
 */
function handleGlobalChange(event) {
    const target = event.target;
    
    // Handle file uploads
    if (target.type === 'file' && target.files.length > 0) {
        const mode = target.dataset.mode;
        const view = target.dataset.view;
        
        let identifier;
        if (view) {
            identifier = `${mode}-${view}`;
        } else {
            identifier = mode;
        }
        
        handleFileUpload(identifier, event);
    }
}

/**
 * Set button state with visual feedback
 * @param {HTMLElement} button - Button element
 * @param {string} state - State: 'ready', 'processing', 'success', 'error'
 */
export function setButtonState(button, state) {
    // Remove all state classes
    button.classList.remove('processing', 'success', 'error');
    button.disabled = false;
    
    const originalText = button.dataset.originalText || button.textContent;
    button.dataset.originalText = originalText;
    
    switch (state) {
        case 'processing':
            button.classList.add('processing');
            button.disabled = true;
            const spinner = button.querySelector('.loading-spinner') || createSpinner();
            button.prepend(spinner);
            break;
            
        case 'success':
            button.classList.add('success');
            button.style.backgroundColor = 'var(--success-color)';
            setTimeout(() => {
                button.style.backgroundColor = '';
                button.classList.remove('success');
            }, 2000);
            break;
            
        case 'error':
            button.classList.add('error');
            button.style.backgroundColor = 'var(--danger-color)';
            setTimeout(() => {
                button.style.backgroundColor = '';
                button.classList.remove('error');
            }, 2000);
            break;
            
        case 'ready':
        default:
            // Remove spinner if exists
            const existingSpinner = button.querySelector('.loading-spinner');
            if (existingSpinner) {
                existingSpinner.remove();
            }
            break;
    }
}

/**
 * Create a loading spinner element
 * @returns {HTMLElement} Spinner element
 */
function createSpinner() {
    const spinner = document.createElement('span');
    spinner.className = 'loading-spinner';
    spinner.style.cssText = `
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 8px;
    `;
    return spinner;
}

/**
 * Initialize touch handlers for mobile
 */
function initializeTouchHandlers() {
    let touchStartY = 0;
    
    document.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
        const touchY = e.touches[0].clientY;
        const scrollTop = window.scrollY;
        
        // Prevent overscroll on iOS
        if (scrollTop === 0 && touchY > touchStartY) {
            e.preventDefault();
        }
    }, { passive: false });
}

/**
 * Save current work
 */
function saveCurrentWork() {
    const data = {
        mode: UIState.currentMode,
        timestamp: new Date().toISOString(),
        analysisData: UIState.analysisData[UIState.currentMode]
    };
    
    downloadJSON(data, `posture-analysis-${Date.now()}.json`);
    showNotification('Analysis saved!', 'success');
}

/**
 * Generate clinical report
 */
export function generateClinicalReport() {
    showLoading();
    
    setTimeout(() => {
        const reportData = {
            ...UIState.analysisData.advanced,
            generatedAt: new Date().toISOString(),
            clinic: 'Two Tonys Treatment Clinic'
        };
        
        // In production, this would generate an actual PDF
        console.log('Report data:', reportData);
        hideLoading();
        showNotification('Clinical report generated!', 'success');
    }, 2000);
}

/**
 * Export biomechanics data with enhanced metadata and image support
 */
export async function exportBiomechanics() {
    try {
        showLoading('Exporting biomechanics data...');
        
        const exportData = {
            timestamp: new Date().toISOString(),
            mode: 'advanced',
            analysisData: UIState.analysisData.advanced,
            images: UIState.analysisData.advanced.images || {},
            landmarks: UIState.analysisData.advanced.landmarks || {},
            measurements: {
                front: UIState.analysisData.advanced.front?.measurements || [],
                side: UIState.analysisData.advanced.side?.measurements || [],
                back: UIState.analysisData.advanced.back?.measurements || []
            },
            metadata: {
                version: '1.0',
                clinic: 'Posture Rehab AI',
                includesImages: !!UIState.analysisData.advanced.images && 
                               Object.keys(UIState.analysisData.advanced.images).length > 0,
                includesLandmarks: !!UIState.analysisData.advanced.landmarks && 
                                  Object.keys(UIState.analysisData.advanced.landmarks).length > 0,
                totalMeasurements: (UIState.analysisData.advanced.front?.measurements?.length || 0) +
                                  (UIState.analysisData.advanced.side?.measurements?.length || 0) +
                                  (UIState.analysisData.advanced.back?.measurements?.length || 0)
            }
        };
        
        // If patient exists, save to database
        if (UIState.currentPatientId) {
            saveCompleteAssessment({
                ...exportData,
                patientId: UIState.currentPatientId
            }).then(result => {
                if (result.success) {
                    showNotification('Analysis saved to database!', 'success');
                }
            }).catch(error => {
                console.error('Database save failed:', error);
                showNotification('Database save failed, but local export succeeded', 'warning');
            });
        }
        
        // Download JSON file
        downloadJSON(exportData, 'advanced-biomechanics-analysis');
        
        // Generate PDF report
        generatePDF(exportData);
        
        hideLoading();
        showNotification('Biomechanics analysis exported successfully!', 'success');
        
    } catch (error) {
        console.error('Error exporting biomechanics:', error);
        hideLoading();
        showNotification('Failed to export analysis: ' + error.message, 'error');
    }
}

/**
 * Reset quick analysis
 */
export function resetQuickAnalysis() {
    // Clear results
    document.getElementById('quick-results').classList.add('hidden');
    document.getElementById('quick-preview').classList.add('hidden');
    document.getElementById('quick-camera').classList.add('hidden');
    document.getElementById('quick-analyze-btn').classList.add('hidden');
    
    // Clear canvas
    const canvas = document.getElementById('quick-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Reset state
    UIState.analysisData.quick = {};
    
    // Close camera
    closeCamera();
}

/**
 * Reset advanced analysis
 */
export function resetAdvancedAnalysis() {
    // Reset state
    UIState.analysisData.advanced = {
        front: null,
        side: null,
        back: null,
        images: {},      // Store uploaded images for each view
        landmarks: {},   // Store MediaPipe pose landmarks for each view
        patterns: []     // Store detected postural patterns
    };
    UIState.uploadedViews.advanced = {
        front: false,
        side: false,
        back: false
    };
    
    // Reset UI
    ['front', 'side', 'back'].forEach(view => {
        document.getElementById(`advanced-${view}-preview`).classList.add('hidden');
        document.getElementById(`advanced-${view}-status`).textContent = '📷';
        document.getElementById(`advanced-${view}-card`).classList.remove('completed');
        
        // Clear canvas
        const canvas = document.getElementById(`advanced-${view}-canvas`);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
    
    // Hide results
    document.getElementById('advanced-results').classList.add('hidden');
}

/**
 * Collect data from the current clinical tab
 * @param {string} tabName - Current tab name
 */
function collectCurrentTabData(tabName) {
    try {
        switch (tabName) {
            case 'client-info': {
                const clientData = {
                    name: document.getElementById('client-name')?.value || '',
                    date: document.getElementById('assessment-date')?.value || '',
                    assessor: document.getElementById('assessor-name')?.value || '',
                    sessions: document.getElementById('sessions-per-week')?.value || '3'
                };
                UIState.analysisData.clinical.clientInfo = clientData;
                break;
            }
                
            case 'north-star': {
                const goalData = {
                    primaryGoal: document.getElementById('primary-goal')?.value || '',
                    timeline: document.getElementById('timeline')?.value || '',
                    objectives: Array.from(document.querySelectorAll('#clinical-north-star input[type="checkbox"]:checked'))
                        .map(cb => cb.value),
                    metrics: document.getElementById('success-metrics')?.value || ''
                };
                UIState.analysisData.clinical.goals = goalData;
                break;
            }
                
            case 'release': {
                const releaseData = {
                    exercises: collectSelectedExercises('#clinical-release .exercise-card'),
                    notes: document.getElementById('release-notes')?.value || ''
                };
                UIState.analysisData.clinical.release = releaseData;
                break;
            }
                
            case 'reset': {
                const resetData = {
                    exercises: collectSelectedExercises('#clinical-reset .exercise-card'),
                    notes: document.getElementById('reset-notes')?.value || ''
                };
                UIState.analysisData.clinical.reset = resetData;
                break;
            }
                
            case 'rebuild': {
                const rebuildData = {
                    exercises: collectSelectedExercises('#clinical-rebuild .exercise-card'),
                    progression: document.getElementById('progression-timeline')?.value || 'standard',
                    notes: document.getElementById('rebuild-notes')?.value || ''
                };
                UIState.analysisData.clinical.rebuild = rebuildData;
                break;
            }
                
            case 'assessment': {
                // Collect photo data and annotations
                const photoData = {};
                ['front', 'side', 'back'].forEach(view => {
                    const preview = document.getElementById(`clinical-${view}-preview`);
                    const annotationTextarea = document.querySelector(`#clinical-${view}-card textarea`);
                    
                    if (preview && !preview.classList.contains('hidden') && preview.src && preview.src !== window.location.href) {
                        photoData[view] = {
                            imageData: preview.src,  // Base64 data URL
                            annotation: annotationTextarea?.value || '',
                            uploaded: true,
                            timestamp: new Date().toISOString()
                        };
                        console.log(`Collected ${view} photo with annotation: "${annotationTextarea?.value || 'none'}"`);
                    }
                });
                
                // Store in UIState
                UIState.analysisData.clinical.photos = photoData;
                console.log('Clinical photos collected:', Object.keys(photoData));
                
                // Also update upload status
                Object.keys(photoData).forEach(view => {
                    UIState.uploadedViews.clinical[view] = true;
                });
                break;
            }
        }
    } catch (error) {
        console.error('Error collecting tab data:', error);
    }
}

/**
 * Collect selected exercises from a container
 * @param {string} containerSelector - CSS selector for exercise container
 * @returns {Array} Selected exercises
 */
function collectSelectedExercises(containerSelector) {
    const exercises = [];
    const exerciseCards = document.querySelectorAll(`${containerSelector}`);
    
    exerciseCards.forEach(card => {
        const checkbox = card.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked) {
            const exercise = {
                name: card.querySelector('h4')?.textContent || '',
                duration: card.querySelector('.exercise-duration')?.textContent || '',
                description: card.querySelector('.exercise-description')?.textContent || '',
                frequency: card.querySelector('.exercise-frequency')?.value || 'daily'
            };
            exercises.push(exercise);
        }
    });
    
    return exercises;
}

/**
 * Update the summary tab with collected data
 */
function updateSummaryTab() {
    try {
        // Update client info
        const clientInfo = UIState.analysisData.clinical.clientInfo || {};
        document.getElementById('summary-client-name').textContent = clientInfo.name || 'Not provided';
        document.getElementById('summary-date').textContent = clientInfo.date || 'Not set';
        document.getElementById('summary-assessor').textContent = clientInfo.assessor || 'Not provided';
        document.getElementById('summary-sessions').textContent = clientInfo.sessions || '3';
        
        // Update photo status
        const photoViews = ['front', 'side', 'back'];
        photoViews.forEach(view => {
            const statusElement = document.getElementById(`${view}-photo-status`);
            const isUploaded = UIState.uploadedViews.clinical[view];
            if (statusElement) {
                statusElement.textContent = isUploaded ? 'Uploaded' : 'Not uploaded';
                statusElement.className = isUploaded ? 'photo-status uploaded' : 'photo-status';
            }
        });
        
        // Update goals
        const goals = UIState.analysisData.clinical.goals || {};
        document.getElementById('summary-primary-goal').textContent = goals.primaryGoal || 'Not set';
        document.getElementById('summary-timeline').textContent = goals.timeline || 'Not set';
        
        const metricsElement = document.getElementById('summary-metrics');
        if (metricsElement) {
            metricsElement.textContent = goals.metrics || 'Not defined';
        }
        
        // Update exercise summaries
        updateExerciseSummary('release');
        updateExerciseSummary('reset');
        updateExerciseSummary('rebuild');
        
    } catch (error) {
        console.error('Error updating summary tab:', error);
        showNotification('Error updating summary', 'warning');
    }
}

/**
 * Update exercise summary for a specific phase
 * @param {string} phase - Exercise phase (release, reset, rebuild)
 */
function updateExerciseSummary(phase) {
    const exerciseData = UIState.analysisData.clinical[phase];
    const summaryElement = document.getElementById(`selected-${phase}-exercises`);
    
    if (!summaryElement) return;
    
    if (!exerciseData || !exerciseData.exercises || exerciseData.exercises.length === 0) {
        summaryElement.textContent = 'No exercises selected';
        return;
    }
    
    const exerciseList = exerciseData.exercises.map(ex => 
        `${ex.name} (${ex.frequency})`
    ).join(', ');
    
    summaryElement.textContent = exerciseList;
}

/**
 * Save clinical assessment data with enhanced photo handling
 */
async function saveClinicalAssessment() {
    try {
        showLoading('Saving clinical assessment...');
        
        // Ensure we have the latest photo data
        collectCurrentTabData('assessment');
        
        // Collect all data
        const assessmentData = {
            mode: 'clinical',
            timestamp: new Date().toISOString(),
            ...UIState.analysisData.clinical
        };
        
        // Check for photos to upload
        const photosToUpload = UIState.analysisData.clinical.photos || {};
        const hasPhotos = Object.keys(photosToUpload).some(view => 
            photosToUpload[view] && photosToUpload[view].imageData
        );
        
        // If patient exists, save to database
        if (UIState.currentPatientId) {
            try {
                // First, save the assessment without photos
                const result = await saveCompleteAssessment({
                    ...assessmentData,
                    patientId: UIState.currentPatientId
                });
                
                if (result.success) {
                    console.log('Assessment saved to database:', result);
                    
                    // Now upload photos if we have any
                    if (hasPhotos && result.assessmentId) {
                        showLoading('Uploading photos securely...');
                        
                        try {
                            const photoUploadResult = await uploadAssessmentPhotos(
                                result.assessmentId, 
                                photosToUpload
                            );
                            
                            if (photoUploadResult.success) {
                                const uploadCount = Object.keys(photoUploadResult.uploads).length;
                                showNotification(`Assessment saved! ${uploadCount} photos uploaded securely.`, 'success');
                                
                                if (photoUploadResult.errors.length > 0) {
                                    console.warn('Some photos failed to upload:', photoUploadResult.errors);
                                    showNotification(`Warning: ${photoUploadResult.errors.length} photos failed to upload`, 'warning');
                                }
                            } else {
                                showNotification('Assessment saved, but photo upload failed', 'warning');
                                console.error('All photo uploads failed:', photoUploadResult.errors);
                            }
                        } catch (photoError) {
                            console.error('Photo upload failed:', photoError);
                            showNotification('Assessment saved, but photo upload failed', 'warning');
                        }
                    } else {
                        showNotification('Assessment saved to database successfully!', 'success');
                    }
                } else {
                    throw new Error('Assessment save failed');
                }
            } catch (dbError) {
                console.error('Database save failed:', dbError);
                showNotification('Database save failed, but local file was saved', 'warning');
            }
        } else if (hasPhotos) {
            // No patient ID but we have photos - warn about photo loss
            showNotification('Photos cannot be saved without a patient record. Create a patient first.', 'warning');
        }
        
        // Always save locally as backup
        downloadJSON(assessmentData, 'clinical-assessment');
        
        // Generate PDF report
        generatePDF(assessmentData);
        
        hideLoading();
        showNotification('Clinical assessment saved successfully!', 'success');
        
    } catch (error) {
        hideLoading();
        console.error('Error saving clinical assessment:', error);
        showNotification('Failed to save assessment: ' + error.message, 'error');
    }
}

/**
 * Generate clinical PDF report
 */
async function generateClinicalPDFReport() {
    try {
        showLoading('Generating PDF report...');
        
        // Collect final data
        if (UIState.currentTab) {
            collectCurrentTabData(UIState.currentTab);
        }
        
        const reportData = {
            mode: 'clinical',
            patientName: UIState.currentPatientName || 'Anonymous Patient',
            patientId: UIState.currentPatientId,
            ...UIState.analysisData.clinical,
            generatedAt: new Date().toISOString(),
            clinic: 'Two Tonys Treatment Clinic'
        };
        
        // Use the existing generatePDF function from utils
        await generatePDF(reportData, `clinical-report-${Date.now()}.pdf`);
        hideLoading();
        showNotification('PDF report downloaded successfully!', 'success');
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        hideLoading();
        showNotification(error.message || 'Error generating PDF report', 'error');
    }
}

/**
 * Save quick results
 */
export async function saveQuickResults() {
    try {
        showLoading('Saving results...');
        
        const data = {
            timestamp: new Date().toISOString(),
            score: document.getElementById('quick-score').textContent,
            metrics: UIState.analysisData.quick,
            mode: 'quick'
        };
        
        // Download JSON file
        downloadJSON(data, `quick-analysis-${Date.now()}.json`);
        
        // Also save to database if connected
        try {
            const dbResult = await saveCompleteAssessment({
                ...data,
                results: UIState.analysisData.quick,
                clientInfo: {
                    name: 'Anonymous Patient - Quick Analysis'
                }
            });
            console.log('Quick analysis saved to database:', dbResult);
            showNotification('Results saved to database!', 'success');
            
            // Store the assessment ID for reference
            UIState.currentAssessmentId = dbResult.assessmentId;
            UIState.currentPatientId = dbResult.patientId;
            
        } catch (dbError) {
            console.warn('Database save failed, but local save succeeded:', dbError);
            showNotification('Results saved locally (database offline)', 'warning');
        }
        
        hideLoading();
        
    } catch (error) {
        console.error('Error saving quick results:', error);
        hideLoading();
        showNotification('Error saving results. Please try again.', 'error');
    }
}

/**
 * Handle patient creation
 */
async function handleCreatePatient() {
    try {
        // Use FormValidator for validation
        const patientCard = document.querySelector('#patient-selection .patient-card');
        if (!patientCard) {
            throw new Error('Patient form not found');
        }
        
        // Get form validator instance or create new one
        let validator = patientCard._validator;
        if (!validator) {
            validator = new FormValidator(patientCard);
            patientCard._validator = validator;
        }
        
        // Validate all fields
        if (!validator.validateAll()) {
            // FormValidator will handle error display
            throw new Error('Validation failed');
        }
        
        // Get validated values
        const name = document.getElementById('new-patient-name').value.trim();
        const dateOfBirth = document.getElementById('new-patient-dob').value;
        const complaints = document.getElementById('new-patient-complaints').value.trim();
        
        showLoading('Creating patient record...');
        
        const patient = await createPatient({
            name,
            dateOfBirth,
            complaints
        });
        
        console.log('Patient created:', patient);
        UIState.currentPatientId = patient.id;
        UIState.currentPatientName = patient.name;
        UIState.currentPatientComplaints = complaints;
        
        hideLoading();
        showNotification(`Patient "${patient.name}" created successfully!`, 'success');
        
        // Continue to the selected mode
        continueToMode();
        
    } catch (error) {
        console.error('Error creating patient:', error);
        hideLoading();
        showNotification('Failed to create patient. ' + (error.message || 'Please try again.'), 'error');
        throw error;
    }
}

/**
 * Handle anonymous patient flow
 */
function handleSkipPatient() {
    UIState.currentPatientId = null;
    UIState.currentPatientName = 'Anonymous';
    showNotification('Continuing with anonymous assessment', 'info');
    continueToMode();
}

/**
 * Continue to the selected mode after patient selection
 */
function continueToMode() {
    try {
        showLoading('Initializing analysis engine...');
        
        // Hide patient selection
        document.getElementById('patient-selection').classList.add('hidden');
        
        // Show main content
        const mainContent = document.getElementById('main-content');
        mainContent.classList.add('active');
        
        // Update navigation title
        const titles = {
            'quick': 'Quick Posture Check',
            'clinical': 'Clinical Assessment',
            'advanced': 'Advanced Biomechanics'
        };
        
        const navTitle = document.querySelector('.nav-title');
        if (navTitle) navTitle.textContent = titles[UIState.currentMode];
        
        // Show appropriate content
        showModeContent(UIState.currentMode);
        hideLoading();
        
    } catch (error) {
        console.error('Error continuing to mode:', error);
        hideLoading();
        showNotification('Error initializing mode. Please refresh and try again.', 'error');
    }
}

/**
 * Helper function to calculate age from date of birth
 * @param {string} dateOfBirth - Date of birth in YYYY-MM-DD format
 * @returns {number} Age in years
 */
function calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}


/**
 * Show content for a specific mode
 * @param {string} mode - Selected mode
 */
function showModeContent(mode) {
    try {
        // Show appropriate mode content
        document.querySelectorAll('.mode-content').forEach(content => {
            content.classList.add('hidden');
        });
        document.getElementById(`${mode}-mode`).classList.remove('hidden');
        
        // Update mode title if exists
        const modeTitle = document.getElementById('mode-title');
        if (modeTitle) {
            const titles = {
                'quick': 'Quick Assessment',
                'clinical': 'Clinical Assessment',
                'advanced': 'Advanced Biomechanics'
            };
            modeTitle.textContent = titles[mode];
        }
        
        // Initialize MediaPipe with error handling
        // For advanced mode, we'll initialize EnhancedPoseDetector in analyzePosture
        // to avoid creating multiple instances
        if (!UIState.pose && mode !== 'advanced') {
            UIState.pose = initializePose(mode);
        }
        
        // Show first tab for clinical mode
        if (mode === 'clinical') {
            showTab('clinical', 'client-info');
        }
        
        // Re-initialize drag and drop for new upload areas
        setTimeout(() => {
            initializeDragAndDrop();
        }, 100);
        
        showNotification(`${mode.charAt(0).toUpperCase() + mode.slice(1)} mode activated`, 'success');
        
    } catch (error) {
        console.error('Error showing mode content:', error);
        showNotification('Error loading mode. Please try again.', 'error');
    }
}

/**
 * Clear all image data and revoke blob URLs
 */
function clearAllImageData() {
    // Clear all img elements with blob or data URLs
    document.querySelectorAll('img[src^="blob:"], img[src^="data:"]').forEach(img => {
        if (img.src.startsWith('blob:')) {
            URL.revokeObjectURL(img.src);
        }
        img.src = '';
        img.classList.add('hidden');
    });
    
    // Clear all canvas elements
    document.querySelectorAll('canvas').forEach(canvas => {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
    
    // Hide all preview containers
    document.querySelectorAll('[id*="-preview"]').forEach(preview => {
        preview.classList.add('hidden');
    });
}

/**
 * Clear all form inputs
 */
function clearAllFormInputs() {
    // Clear text inputs
    document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input[type="date"]').forEach(input => {
        input.value = '';
    });
    
    // Clear textareas
    document.querySelectorAll('textarea').forEach(textarea => {
        textarea.value = '';
    });
    
    // Uncheck checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Reset selects
    document.querySelectorAll('select').forEach(select => {
        select.selectedIndex = 0;
    });
}

/**
 * Save current session to localStorage
 */
function saveSessionToStorage() {
    try {
        if (!UIState.currentMode || 
            (UIState.currentMode === 'quick' && Object.keys(UIState.analysisData.quick).length === 0) ||
            (UIState.currentMode === 'clinical' && Object.keys(UIState.analysisData.clinical.clientInfo).length === 0) ||
            (UIState.currentMode === 'advanced' && !UIState.analysisData.advanced.front)) {
            // No meaningful data to save
            return;
        }
        
        const sessionData = {
            timestamp: new Date().toISOString(),
            mode: UIState.currentMode,
            patientId: UIState.currentPatientId,
            patientName: UIState.currentPatientName,
            assessmentId: UIState.currentAssessmentId,
            analysisData: UIState.analysisData,
            uploadedViews: UIState.uploadedViews,
            currentTab: UIState.currentTab
        };
        
        // Encrypt sensitive data (basic obfuscation for MVP)
        const encodedData = btoa(JSON.stringify(sessionData));
        localStorage.setItem('postureAI_lastSession', encodedData);
        
        // Also save timestamp for session expiry
        localStorage.setItem('postureAI_sessionTime', new Date().toISOString());
        
    } catch (error) {
        console.warn('Error saving session:', error);
    }
}

/**
 * Restore session from localStorage
 */
export function restoreSession() {
    try {
        const encodedData = localStorage.getItem('postureAI_lastSession');
        const sessionTime = localStorage.getItem('postureAI_sessionTime');
        
        if (!encodedData || !sessionTime) return null;
        
        // Check if session is less than 1 hour old
        const sessionAge = Date.now() - new Date(sessionTime).getTime();
        const ONE_HOUR = 60 * 60 * 1000;
        
        if (sessionAge > ONE_HOUR) {
            // Session expired
            localStorage.removeItem('postureAI_lastSession');
            localStorage.removeItem('postureAI_sessionTime');
            return null;
        }
        
        // Decode and return session data
        const sessionData = JSON.parse(atob(encodedData));
        return sessionData;
        
    } catch (error) {
        console.warn('Error restoring session:', error);
        return null;
    }
}

/**
 * Initialize drag and drop functionality for upload areas
 */
function initializeDragAndDrop() {
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    
    document.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    
    // Add drag and drop to all upload areas
    document.querySelectorAll('.upload-area').forEach(area => {
        area.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            area.classList.add('drag-active');
        });
        
        area.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.target === area || !area.contains(e.relatedTarget)) {
                area.classList.remove('drag-active');
            }
        });
        
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            area.classList.remove('drag-active');
            
            const fileInput = area.querySelector('input[type="file"]');
            if (fileInput && e.dataTransfer.files.length > 0) {
                // Use the first file only
                const file = e.dataTransfer.files[0];
                
                // Check if it's an image
                if (file.type.startsWith('image/')) {
                    // Create a new FileList-like object
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    fileInput.files = dataTransfer.files;
                    
                    // Trigger change event
                    const changeEvent = new Event('change', { bubbles: true });
                    fileInput.dispatchEvent(changeEvent);
                } else {
                    showNotification('Please drop an image file', 'error');
                }
            }
        });
    });
}

/**
 * Handle camera capture button click
 * @param {HTMLElement} button - The button that was clicked
 */
function handleCameraCapture(button) {
    const mode = button.dataset.mode;
    const view = button.dataset.view;
    
    // For clinical/advanced modes, we need to implement camera capture
    // For now, we'll use the device camera through the file input with capture attribute
    const uploadArea = document.getElementById(`${mode}-${view}-upload-area`);
    if (uploadArea) {
        const fileInput = uploadArea.querySelector('input[type="file"]');
        if (fileInput) {
            // Set capture attribute to camera for direct camera access
            fileInput.setAttribute('capture', 'camera');
            fileInput.click();
            // Reset to environment after click for next time
            setTimeout(() => {
                fileInput.setAttribute('capture', 'environment');
            }, 100);
        }
    }
}

/**
 * Handle file browse button click
 * @param {HTMLElement} button - The button that was clicked
 */
function handleFileBrowse(button) {
    const mode = button.dataset.mode;
    const view = button.dataset.view;
    
    // Find the file input and trigger it
    const uploadArea = document.getElementById(`${mode}-${view}-upload-area`);
    if (uploadArea) {
        const fileInput = uploadArea.querySelector('input[type="file"]');
        if (fileInput) {
            // Remove capture attribute for file browse
            fileInput.removeAttribute('capture');
            fileInput.click();
            // Restore capture attribute after click
            setTimeout(() => {
                fileInput.setAttribute('capture', 'environment');
            }, 100);
        }
    }
}

/**
 * Check for and offer to restore previous session
 */
export function checkForPreviousSession() {
    const session = restoreSession();
    
    if (session) {
        const timeSince = new Date(session.timestamp).toLocaleTimeString();
        const message = `Found incomplete ${session.mode} assessment from ${timeSince}. Would you like to continue?`;
        
        if (confirm(message)) {
            // Restore the session
            UIState.currentMode = session.mode;
            UIState.currentPatientId = session.patientId;
            UIState.currentPatientName = session.patientName;
            UIState.currentAssessmentId = session.assessmentId;
            UIState.analysisData = session.analysisData;
            UIState.uploadedViews = session.uploadedViews;
            UIState.currentTab = session.currentTab;
            
            // Skip mode selection and patient selection
            document.getElementById('mode-selection').style.display = 'none';
            document.getElementById('patient-selection').classList.add('hidden');
            
            // Continue to the mode
            continueToMode();
            
            showNotification('Previous session restored successfully!', 'success');
            return true;
        } else {
            // Clear the stored session
            localStorage.removeItem('postureAI_lastSession');
            localStorage.removeItem('postureAI_sessionTime');
        }
    }
    
    return false;
}

/**
 * Enhanced Form Validation Class
 */
class FormValidator {
    constructor(formElement) {
        this.form = formElement;
        this.validators = {
            required: (value) => value.trim() !== '',
            email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            phone: (value) => /^[\d\s\-\+\(\)]+$/.test(value),
            date: (value) => !isNaN(Date.parse(value)),
            minLength: (value, min) => value.length >= parseInt(min),
            maxLength: (value, max) => value.length <= parseInt(max),
            pattern: (value, pattern) => new RegExp(pattern).test(value),
            age: (value) => {
                const age = calculateAge(value);
                return age >= 0 && age <= 120;
            }
        };
        
        this.errorMessages = {
            required: 'This field is required',
            email: 'Please enter a valid email address',
            phone: 'Please enter a valid phone number',
            date: 'Please enter a valid date',
            minLength: 'Must be at least {param} characters',
            maxLength: 'Must be no more than {param} characters',
            pattern: 'Please match the required format',
            age: 'Please enter a valid date of birth'
        };
        
        this.init();
    }
    
    init() {
        const inputs = this.form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            // Add validation attributes
            this.setupValidationAttributes(input);
            
            // Add real-time validation
            input.addEventListener('blur', () => this.validateField(input));
            
            // Debounced input validation
            let debounceTimer;
            input.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                
                if (input.classList.contains('touched')) {
                    debounceTimer = setTimeout(() => {
                        this.validateField(input);
                    }, 300);
                }
            });
            
            // Mark as touched on first interaction
            input.addEventListener('focus', () => {
                input.classList.add('touched');
            });
        });
        
        // Validate on submit
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.validateAll()) {
                this.form.dispatchEvent(new Event('validated'));
            }
        });
    }
    
    setupValidationAttributes(field) {
        // Set up validation rules based on field type and attributes
        const rules = [];
        
        if (field.hasAttribute('required')) {
            rules.push('required');
        }
        
        if (field.type === 'email') {
            rules.push('email');
        }
        
        if (field.type === 'tel') {
            rules.push('phone');
        }
        
        if (field.id === 'new-patient-dob') {
            rules.push('age');
        }
        
        if (field.hasAttribute('minlength')) {
            rules.push(`minLength:${field.getAttribute('minlength')}`);
        }
        
        if (field.hasAttribute('maxlength')) {
            rules.push(`maxLength:${field.getAttribute('maxlength')}`);
        }
        
        if (field.hasAttribute('pattern')) {
            rules.push(`pattern:${field.getAttribute('pattern')}`);
        }
        
        field.dataset.validate = rules.join('|');
    }
    
    validateField(field) {
        const rules = field.dataset.validate?.split('|') || [];
        const label = field.previousElementSibling?.textContent || 
                     field.placeholder || 
                     field.name || 
                     'Field';
        
        let isValid = true;
        let errorMessage = '';
        
        for (const rule of rules) {
            const [ruleName, param] = rule.split(':');
            const validator = this.validators[ruleName];
            
            if (validator && !validator(field.value, param)) {
                isValid = false;
                errorMessage = this.getErrorMessage(ruleName, label, param);
                break;
            }
        }
        
        this.showFieldFeedback(field, isValid, errorMessage);
        return isValid;
    }
    
    validateAll() {
        const inputs = this.form.querySelectorAll('input, textarea, select');
        let isValid = true;
        
        inputs.forEach(input => {
            input.classList.add('touched');
            if (!this.validateField(input)) {
                isValid = false;
            }
        });
        
        if (!isValid) {
            // Focus on first invalid field
            const firstInvalid = this.form.querySelector('.invalid');
            if (firstInvalid) {
                firstInvalid.focus();
                firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        
        return isValid;
    }
    
    showFieldFeedback(field, isValid, errorMessage) {
        const wrapper = field.closest('.form-group') || field.parentElement;
        const existingError = wrapper.querySelector('.field-error');
        
        if (existingError) {
            existingError.remove();
        }
        
        field.classList.toggle('invalid', !isValid);
        field.classList.toggle('valid', isValid && field.value.trim() !== '');
        
        if (!isValid && errorMessage) {
            const error = document.createElement('div');
            error.className = 'field-error';
            error.textContent = errorMessage;
            error.setAttribute('role', 'alert');
            error.setAttribute('aria-live', 'polite');
            field.parentNode.appendChild(error);
            
            // Announce error to screen readers
            if (window.announcer) {
                window.announcer.announceError(errorMessage);
            }
        }
    }
    
    getErrorMessage(rule, label, param) {
        let message = this.errorMessages[rule] || 'Invalid value';
        
        // Replace placeholders
        message = message.replace('{label}', label);
        message = message.replace('{param}', param);
        
        return message;
    }
}

/**
 * Initialize form validation for all forms
 */
function initializeFormValidation() {
    // Patient creation form
    const patientForm = document.querySelector('#patient-selection .patient-card');
    if (patientForm) {
        new FormValidator(patientForm);
    }
    
    // Clinical client form
    const clientForm = document.getElementById('client-form');
    if (clientForm) {
        new FormValidator(clientForm);
        
        // Handle form submission
        clientForm.addEventListener('validated', () => {
            // Form is valid, proceed to next tab
            showTab('clinical', 'assessment');
        });
    }
    
    // Add validation to dynamically created forms
    document.addEventListener('formCreated', (event) => {
        const form = event.detail.form;
        if (form) {
            new FormValidator(form);
        }
    });
}

// Export for use in other modules
export { FormValidator }