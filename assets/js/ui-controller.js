/**
 * UI Controller Module
 * Manages user interface state and interactions
 */

import { initializePose, drawConnectors, drawLandmarks, POSE_CONNECTIONS } from './mediapipe-init.js';
import { 
    calculateBasicMetrics, 
    analyzeFrontView, 
    analyzeSideView, 
    analyzeBackView,
    calculateInjuryRisk,
    generateExerciseRecommendations,
    getSeverity 
} from './analysis.js';
import { formatNumber, downloadJSON, generatePDF } from './utils.js';

// Global UI State
export const UIState = {
    currentMode: null,
    currentTab: null,
    pose: null,
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
            back: null
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
    
    // Initialize charts if needed
    if (typeof Chart !== 'undefined') {
        Chart.defaults.font.family = getComputedStyle(document.body).getPropertyValue('--font-family');
    }

    // CENTRALIZED EVENT DELEGATION - Handle all clicks in one place
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('change', handleGlobalChange);
    
    // Add event listener for disclaimer button
    const disclaimerButton = document.querySelector('.clinical-disclaimer .btn-warning');
    if (disclaimerButton) {
        disclaimerButton.addEventListener('click', () => {
            document.querySelector('.clinical-disclaimer').classList.add('hidden');
        });
    }
}

/**
 * Select analysis mode
 * @param {string} mode - Selected mode ('quick', 'clinical', 'advanced')
 */
export function selectMode(mode) {
    try {
        showLoading('Initializing analysis engine...');
        
        UIState.currentMode = mode;
        
        // Hide mode selection
        document.getElementById('mode-selection').style.display = 'none';
        
        // Show main content
        const mainContent = document.getElementById('main-content');
        mainContent.classList.add('active');
        
        // Update navigation title
        const titles = {
            'quick': 'Quick Assessment',
            'clinical': 'Clinical Assessment',
            'advanced': 'Advanced Biomechanics'
        };
        document.getElementById('mode-title').textContent = titles[mode];
        
        // Show appropriate mode content
        document.querySelectorAll('.mode-content').forEach(content => {
            content.classList.add('hidden');
        });
        document.getElementById(`${mode}-mode`).classList.remove('hidden');
        
        // Initialize MediaPipe with error handling
        if (!UIState.pose) {
            UIState.pose = initializePose(mode);
        }
        
        // Show first tab for clinical mode
        if (mode === 'clinical') {
            showTab('clinical', 'client-info');
        }
        
        hideLoading();
        showNotification(`${titles[mode]} mode activated`, 'success');
        
    } catch (error) {
        console.error('Error initializing mode:', error);
        hideLoading();
        showNotification('Failed to initialize analysis mode. Please try again.', 'error');
    }
}

/**
 * Return to mode selection
 */
export function backToModeSelection() {
    UIState.currentMode = null;
    closeCamera();
    
    // Hide main content
    document.getElementById('main-content').classList.remove('active');
    
    // Show mode selection
    document.getElementById('mode-selection').style.display = 'flex';
    
    // Reset all mode contents
    document.querySelectorAll('.mode-content').forEach(content => {
        content.classList.add('hidden');
    });
}

/**
 * Show specific tab in clinical mode with data collection
 * @param {string} mode - Current mode
 * @param {string} tabName - Tab to show
 */
export function showTab(mode, tabName) {
    try {
        // Collect data from current tab before switching (if clinical mode)
        if (mode === 'clinical' && UIState.currentTab) {
            collectCurrentTabData(UIState.currentTab);
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
                throw new Error('Image too small. Please use an image at least 200x200 pixels.');
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
            
            // Show analyze button for quick mode with proper state
            if (identifier === 'quick') {
                const analyzeBtn = document.getElementById('quick-analyze-btn');
                if (analyzeBtn) {
                    analyzeBtn.classList.remove('hidden');
                    setButtonState(analyzeBtn, 'ready');
                }
            }
            
            // Update status for clinical/advanced modes
            if (identifier.includes('-')) {
                const [mode, view] = identifier.split('-');
                updateUploadStatus(mode, view);
            }
        };
        
        img.onerror = function() {
            throw new Error('Invalid or corrupted image file.');
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
        showLoading('Analyzing posture...');
        
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
        
        // Validate MediaPipe initialization
        if (!UIState.pose) {
            UIState.pose = initializePose(mode);
        }
        
        // Process with MediaPipe with timeout
        const analysisPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Analysis timed out. Please try again.'));
            }, 30000); // 30 second timeout
            
            UIState.pose.onResults((results) => {
                clearTimeout(timeout);
                if (mode === 'quick') {
                    processQuickResults(results);
                } else {
                    processAdvancedResults(results, 'analysis');
                }
                resolve(results);
            });
        });
        
        await UIState.pose.send({image: imageSource});
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
        const criticalLandmarks = [11, 12, 23, 24]; // shoulders and hips
        const lowQualityCount = criticalLandmarks.filter(idx => 
            !landmarks[idx] || landmarks[idx].visibility < 0.5
        ).length;
        
        if (lowQualityCount > 1) {
            showNotification('Low quality pose detection. Results may be less accurate.', 'warning');
        }
        
        // Calculate basic metrics with error handling
        const metrics = calculateBasicMetrics(landmarks);
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
                    ${formatNumber(metrics.shoulderLevel, 1)} cm
                    <span class="severity-indicator severity-${getSeverity(metrics.shoulderLevel, [1, 2, 3])}"></span>
                </span>
            </div>
        </div>
        <div class="metric-card">
            <div class="metric-header">
                <span class="metric-title">Hip Level</span>
                <span class="metric-value">
                    ${formatNumber(metrics.hipLevel, 1)} cm
                    <span class="severity-indicator severity-${getSeverity(metrics.hipLevel, [1, 2, 3])}"></span>
                </span>
            </div>
        </div>
    `;
    document.getElementById('quick-metrics').innerHTML = metricsHTML;
    
    // Generate recommendations
    const exercises = generateExerciseRecommendations(metrics);
    let recommendationsHTML = '<ul style="list-style: none; padding: 0;">';
    exercises.forEach(exercise => {
        recommendationsHTML += `
            <li style="padding: 8px 0;">
                <strong>${exercise.name}</strong> - ${exercise.description}
            </li>
        `;
    });
    recommendationsHTML += '</ul>';
    document.getElementById('quick-recommendations').innerHTML = recommendationsHTML;
    
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
            UIState.pose = initializePose('advanced');
            // Wait a bit for MediaPipe to initialize
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Process each view with progress updates
        let completedViews = 0;
        for (const view of views) {
            showLoading(`Analyzing ${view} view (${completedViews + 1}/${views.length})...`);
            
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error(`Analysis of ${view} view timed out`));
                }, 20000); // 20 second timeout per view
                
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
    
    // Analyze based on view
    let analysis;
    switch (view) {
        case 'front':
            analysis = analyzeFrontView(results.poseLandmarks);
            break;
        case 'side':
            analysis = analyzeSideView(results.poseLandmarks);
            break;
        case 'back':
            analysis = analyzeBackView(results.poseLandmarks);
            break;
    }
    
    UIState.analysisData.advanced[view] = analysis;
    
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
            formatNumber(data.front.shoulderAsymmetry, 1) + ' cm',
            getSeverity(data.front.shoulderAsymmetry, [1, 2, 3]));
    }
    
    if (data.side) {
        metricsHTML += createMetricCard('Forward Head', 
            formatNumber(data.side.forwardHead, 1) + ' cm',
            getSeverity(Math.abs(data.side.forwardHead), [2, 4, 6]));
        metricsHTML += createMetricCard('Pelvic Angle', 
            formatNumber(data.side.pelvicAngle, 1) + '°',
            getSeverity(Math.abs(data.side.pelvicAngle - 10), [5, 10, 15]));
    }
    
    if (data.back) {
        metricsHTML += createMetricCard('Spinal Deviation', 
            formatNumber(data.back.spinalDeviation, 1) + ' cm',
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

/**
 * Show loading overlay with optional custom message
 * @param {string} message - Optional loading message
 */
export function showLoading(message = 'Analyzing posture...') {
    const loading = document.getElementById('loading');
    const loadingText = loading.querySelector('.loading-text');
    if (loadingText) {
        loadingText.textContent = message;
    }
    loading.classList.add('active');
}

/**
 * Hide loading overlay
 */
export function hideLoading() {
    document.getElementById('loading').classList.remove('active');
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
                
            default:
                console.warn('Unknown action:', action);
        }
    } catch (error) {
        console.error('Error handling click:', error);
        setButtonState(button, 'error');
        showNotification('Action failed. Please try again.', 'error');
    }
    
    // Handle mode selection cards
    if (target.closest('.mode-card')) {
        const modeCard = target.closest('.mode-card');
        const selectedMode = modeCard.dataset.mode;
        if (selectedMode) {
            selectMode(selectedMode);
        }
    }
    
    // Handle back button
    if (target.closest('.nav-back')) {
        backToModeSelection();
    }
    
    // Handle tab buttons
    if (target.closest('.tab-btn')) {
        const tabBtn = target.closest('.tab-btn');
        const tabName = tabBtn.dataset.tab;
        if (tabName && UIState.currentMode) {
            showTab(UIState.currentMode, tabName);
        }
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
 * Export biomechanics data
 */
export function exportBiomechanics() {
    const exportData = {
        timestamp: new Date().toISOString(),
        mode: 'advanced',
        analysisData: UIState.analysisData.advanced,
        metadata: {
            version: '1.0',
            clinic: 'Two Tonys Treatment Clinic'
        }
    };
    
    downloadJSON(exportData, `biomechanics-${Date.now()}.json`);
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
        back: null
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
            case 'client-info':
                const clientData = {
                    name: document.getElementById('client-name')?.value || '',
                    date: document.getElementById('assessment-date')?.value || '',
                    assessor: document.getElementById('assessor-name')?.value || '',
                    sessions: document.getElementById('sessions-per-week')?.value || '3'
                };
                UIState.analysisData.clinical.clientInfo = clientData;
                break;
                
            case 'north-star':
                const goalData = {
                    primaryGoal: document.getElementById('primary-goal')?.value || '',
                    timeline: document.getElementById('timeline')?.value || '',
                    objectives: Array.from(document.querySelectorAll('#clinical-north-star input[type="checkbox"]:checked'))
                        .map(cb => cb.value),
                    metrics: document.getElementById('success-metrics')?.value || ''
                };
                UIState.analysisData.clinical.goals = goalData;
                break;
                
            case 'release':
                const releaseData = {
                    exercises: collectSelectedExercises('#clinical-release .exercise-card'),
                    notes: document.getElementById('release-notes')?.value || ''
                };
                UIState.analysisData.clinical.release = releaseData;
                break;
                
            case 'reset':
                const resetData = {
                    exercises: collectSelectedExercises('#clinical-reset .exercise-card'),
                    notes: document.getElementById('reset-notes')?.value || ''
                };
                UIState.analysisData.clinical.reset = resetData;
                break;
                
            case 'rebuild':
                const rebuildData = {
                    exercises: collectSelectedExercises('#clinical-rebuild .exercise-card'),
                    progression: document.getElementById('progression-timeline')?.value || 'standard',
                    notes: document.getElementById('rebuild-notes')?.value || ''
                };
                UIState.analysisData.clinical.rebuild = rebuildData;
                break;
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
 * Save clinical assessment data
 */
function saveClinicalAssessment() {
    try {
        // Collect any remaining data
        if (UIState.currentTab) {
            collectCurrentTabData(UIState.currentTab);
        }
        
        // Add summary notes
        const summaryNotes = document.getElementById('clinical-summary-notes')?.value || '';
        UIState.analysisData.clinical.summaryNotes = summaryNotes;
        
        // Create complete assessment data
        const assessmentData = {
            timestamp: new Date().toISOString(),
            mode: 'clinical',
            version: '1.0',
            clinic: 'Two Tonys Treatment Clinic',
            ...UIState.analysisData.clinical
        };
        
        // Save to localStorage and download
        const filename = `clinical-assessment-${Date.now()}.json`;
        localStorage.setItem('last-clinical-assessment', JSON.stringify(assessmentData));
        downloadJSON(assessmentData, filename);
        
        showNotification('Clinical assessment saved successfully!', 'success');
        
    } catch (error) {
        console.error('Error saving clinical assessment:', error);
        showNotification('Error saving assessment. Please try again.', 'error');
    }
}

/**
 * Generate clinical PDF report
 */
async function generateClinicalPDFReport() {
    try {
        // Collect final data
        if (UIState.currentTab) {
            collectCurrentTabData(UIState.currentTab);
        }
        
        const reportData = {
            ...UIState.analysisData.clinical,
            generatedAt: new Date().toISOString(),
            clinic: 'Two Tonys Treatment Clinic'
        };
        
        // Use the existing generatePDF function from utils
        generatePDF(reportData, `clinical-report-${Date.now()}.pdf`);
        showNotification('PDF report generated!', 'success');
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        showNotification('Error generating PDF report', 'error');
        throw error;
    }
}

/**
 * Save quick results
 */
export function saveQuickResults() {
    const data = {
        timestamp: new Date().toISOString(),
        score: document.getElementById('quick-score').textContent,
        metrics: UIState.analysisData.quick,
        mode: 'quick'
    };
    
    downloadJSON(data, `quick-analysis-${Date.now()}.json`);
    showNotification('Results saved!', 'success');
}