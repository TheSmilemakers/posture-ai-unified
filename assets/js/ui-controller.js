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
 * Initialize UI event listeners
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
    Chart.defaults.font.family = getComputedStyle(document.body).getPropertyValue('--font-family');

    // Add event listener for disclaimer button
    const disclaimerButton = document.querySelector('.clinical-disclaimer .btn-warning');
    if (disclaimerButton) {
        disclaimerButton.addEventListener('click', () => {
            document.querySelector('.clinical-disclaimer').classList.add('hidden');
        });
    }

    // Add event listeners for mode selection cards
    const modeCards = document.querySelectorAll('.mode-card');
    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            const mode = card.dataset.mode;
            if (mode) {
                selectMode(mode);
            }
        });
    });

    // Add event listener for back button
    const backButton = document.querySelector('.nav-back');
    if (backButton) {
        backButton.addEventListener('click', backToModeSelection);
    }

    // Add event listeners for tab navigation buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            if (tab) {
                showTab(UIState.currentMode, tab);
            }
        });
    });

    // Quick Assessment Mode
    const startCameraQuick = document.getElementById('start-camera-quick');
    if (startCameraQuick) {
        startCameraQuick.addEventListener('click', () => startCamera('quick'));
    }

    const uploadPhotoQuick = document.getElementById('upload-photo-quick');
    if (uploadPhotoQuick) {
        uploadPhotoQuick.addEventListener('change', (event) => handleFileUpload('quick', event));
    }

    const quickAnalyzeBtn = document.getElementById('quick-analyze-btn');
    if (quickAnalyzeBtn) {
        quickAnalyzeBtn.addEventListener('click', () => analyzePosture('quick'));
    }

    const saveQuickResultsBtn = document.getElementById('save-quick-results');
    if (saveQuickResultsBtn) {
        saveQuickResultsBtn.addEventListener('click', saveQuickResults);
    }

    const resetQuickAnalysisBtn = document.getElementById('reset-quick-analysis');
    if (resetQuickAnalysisBtn) {
        resetQuickAnalysisBtn.addEventListener('click', resetQuickAnalysis);
    }

    // Clinical Assessment Mode
    const nextToAssessment = document.getElementById('next-to-assessment');
    if (nextToAssessment) {
        nextToAssessment.addEventListener('click', () => showTab('clinical', 'assessment'));
    }

    const prevToClientInfo = document.getElementById('prev-to-client-info');
    if (prevToClientInfo) {
        prevToClientInfo.addEventListener('click', () => showTab('clinical', 'client-info'));
    }

    const nextToNorthStar = document.getElementById('next-to-north-star');
    if (nextToNorthStar) {
        nextToNorthStar.addEventListener('click', () => showTab('clinical', 'north-star'));
    }

    const clinicalFileUploads = document.querySelectorAll('#clinical-mode input[type="file"]');
    clinicalFileUploads.forEach(input => {
        input.addEventListener('change', (event) => {
            const view = input.dataset.view;
            if (view) {
                handleFileUpload(`clinical-${view}`, event);
            }
        });
    });

    // Advanced Biomechanics Mode
    const advancedFileUploads = document.querySelectorAll('#advanced-mode input[type="file"]');
    advancedFileUploads.forEach(input => {
        input.addEventListener('change', (event) => {
            const view = input.dataset.view;
            if (view) {
                handleFileUpload(`advanced-${view}`, event);
            }
        });
    });

    const generateClinicalReportBtn = document.getElementById('generate-clinical-report');
    if (generateClinicalReportBtn) {
        generateClinicalReportBtn.addEventListener('click', generateClinicalReport);
    }

    const exportBiomechanicsBtn = document.getElementById('export-biomechanics');
    if (exportBiomechanicsBtn) {
        exportBiomechanicsBtn.addEventListener('click', exportBiomechanics);
    }

    const resetAdvancedAnalysisBtn = document.getElementById('reset-advanced-analysis');
    if (resetAdvancedAnalysisBtn) {
        resetAdvancedAnalysisBtn.addEventListener('click', resetAdvancedAnalysis);
    }
}

/**
 * Select analysis mode
 * @param {string} mode - Selected mode ('quick', 'clinical', 'advanced')
 */
export function selectMode(mode) {
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
    
    // Initialize MediaPipe
    if (!UIState.pose) {
        UIState.pose = initializePose(mode);
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
 * Show specific tab in clinical mode
 * @param {string} mode - Current mode
 * @param {string} tabName - Tab to show
 */
export function showTab(mode, tabName) {
    // Hide all tabs
    document.querySelectorAll(`#${mode}-mode .tab-content`).forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from all buttons
    document.querySelectorAll(`#${mode}-mode .tab-btn`).forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${mode}-${tabName}`).classList.add('active');
    
    // Activate button
    const activeBtn = Array.from(document.querySelectorAll(`#${mode}-mode .tab-btn`))
        .find(btn => btn.textContent.toLowerCase().includes(tabName.replace('-', ' ')));
    if (activeBtn) activeBtn.classList.add('active');
    
    UIState.currentTab = tabName;
}

/**
 * Start camera for quick mode
 * @param {string} mode - Current mode
 */
export async function startCamera(mode) {
    try {
        closeCamera();
        
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
        
        UIState.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        const video = document.getElementById(`${mode}-camera`);
        video.srcObject = UIState.currentStream;
        video.classList.remove('hidden');
        
        // Show analyze button
        document.getElementById(`${mode}-analyze-btn`).classList.remove('hidden');
        
    } catch (error) {
        console.error('Camera error:', error);
        showNotification('Camera access denied. Please use file upload instead.', 'error');
    }
}

/**
 * Close camera stream
 */
export function closeCamera() {
    if (UIState.currentStream) {
        UIState.currentStream.getTracks().forEach(track => track.stop());
        UIState.currentStream = null;
    }
}

/**
 * Handle file upload for any mode
 * @param {string} identifier - View identifier (e.g., 'quick', 'clinical-front')
 * @param {Event} event - File input event
 */
export function handleFileUpload(identifier, event) {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        displayUploadedImage(identifier, e.target.result);
    };
    reader.readAsDataURL(file);
}

/**
 * Display uploaded image
 * @param {string} identifier - View identifier
 * @param {string} imageSrc - Image data URL
 */
function displayUploadedImage(identifier, imageSrc) {
    const preview = document.getElementById(`${identifier}-preview`);
    if (preview) {
        preview.src = imageSrc;
        preview.classList.remove('hidden');
    }
    
    // Hide camera if active
    const camera = document.getElementById(`${identifier}-camera`);
    if (camera) camera.classList.add('hidden');
    
    // Show analyze button for quick mode
    if (identifier === 'quick') {
        document.getElementById('quick-analyze-btn').classList.remove('hidden');
    }
    
    // Update status for clinical/advanced modes
    if (identifier.includes('-')) {
        const [mode, view] = identifier.split('-');
        updateUploadStatus(mode, view);
    }
}

/**
 * Update upload status for multi-view modes
 * @param {string} mode - Current mode
 * @param {string} view - View name (front/side/back)
 */
function updateUploadStatus(mode, view) {
    document.getElementById(`${mode}-${view}-status`).textContent = '✅';
    document.getElementById(`${mode}-${view}-card`).classList.add('completed');
    UIState.uploadedViews[mode][view] = true;
    
    // Check if all views are complete for advanced mode
    if (mode === 'advanced' && 
        UIState.uploadedViews.advanced.front && 
        UIState.uploadedViews.advanced.side && 
        UIState.uploadedViews.advanced.back) {
        
        showNotification('All views uploaded. Starting analysis...', 'success');
        performAdvancedAnalysis();
    }
}

/**
 * Analyze posture for quick mode
 * @param {string} mode - Current mode
 */
export async function analyzePosture(mode) {
    showLoading();
    
    let imageSource;
    const video = document.getElementById(`${mode}-camera`);
    const preview = document.getElementById(`${mode}-preview`);
    
    if (!video.classList.contains('hidden')) {
        // Capture from video
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        imageSource = canvas;
    } else {
        imageSource = preview;
    }
    
    // Process with MediaPipe
    UIState.pose.onResults((results) => {
        processQuickResults(results);
    });
    await UIState.pose.send({image: imageSource});
}

/**
 * Process quick mode results
 * @param {Object} results - MediaPipe results
 */
function processQuickResults(results) {
    hideLoading();
    
    if (!results.poseLandmarks) {
        showNotification('No pose detected. Please ensure full body is visible.', 'error');
        return;
    }
    
    // Calculate basic metrics
    const landmarks = results.poseLandmarks;
    const metrics = calculateBasicMetrics(landmarks);
    UIState.analysisData.quick = metrics;
    
    // Calculate score
    let score = 100;
    score -= Math.min(metrics.shoulderLevel * 5, 15);
    score -= Math.min(metrics.headTilt * 3, 10);
    score -= Math.min(metrics.hipLevel * 5, 15);
    score = Math.max(0, Math.round(score));
    
    // Display results
    displayQuickResults(score, metrics, landmarks);
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
 * Perform advanced biomechanical analysis
 */
async function performAdvancedAnalysis() {
    showLoading();
    
    // Process each view
    for (const view of ['front', 'side', 'back']) {
        const img = document.getElementById(`advanced-${view}-preview`);
        if (img && !img.classList.contains('hidden')) {
            await new Promise((resolve) => {
                UIState.pose.onResults((results) => {
                    processAdvancedResults(results, view);
                    resolve();
                });
                UIState.pose.send({image: img});
            });
        }
    }
    
    // Compile results
    compileAdvancedResults();
    hideLoading();
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
 * Show loading overlay
 */
export function showLoading() {
    document.getElementById('loading').classList.add('active');
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