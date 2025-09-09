/**
 * Database Service Module
 * Handles all backend API interactions for the Posture Rehab AI App
 */

// API configuration - Updated for production domain
const API_BASE = (() => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // For localhost development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Try to detect the actual port being used
        const port = window.location.port || '3000';
        return `${protocol}//${hostname}:${port}/api`;
    }
    
    // For production domains (including posture.rajanmaher.com)
    return '/api';
})();

console.log('Database Service - API Base URL:', API_BASE);

// Auth headers for all API calls
// TODO: For production, load API key from environment variable or secure configuration
// SECURITY WARNING: Never commit API keys to source control
const getAuthHeaders = () => {
    // In production, this should come from a secure source
    // For MVP, using the hardcoded token that matches the API auth check
    const apiKey = window.POSTURE_API_KEY || 'Bearer posture-api-2025';
    
    return {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
    };
};

// REMOVED: Cached headers that were causing security issues
// Now calling getAuthHeaders() directly in each fetch request

// Helper function to add API key as URL parameter for environments that don't support headers
const withApiKeyParam = (url) => {
    // Add API key as query parameter for better compatibility
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}apiKey=posture-api-2025`;
};

// CRITICAL FIX 1: Correct unit assignment mapping (same as ui-controller.js)
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

/**
 * Patient Management
 */
export async function createPatient(patientData) {
    try {
        const response = await fetch(withApiKeyParam(`${API_BASE}/patients/create`), {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                name: patientData.name,
                email: patientData.email || '',
                phone: patientData.phone || '',
                dateOfBirth: patientData.dateOfBirth || null,
                complaints: patientData.complaints || ''
            })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to create patient');
        }
        
        return data.patient;
    } catch (error) {
        console.error('Error creating patient:', error);
        throw error;
    }
}

/**
 * Assessment Management
 */
export async function createAssessment(patientId, assessmentType = 'clinical') {
    try {
        const response = await fetch(withApiKeyParam(`${API_BASE}/assessments/create`), {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                patientId,
                assessmentType,
                notes: `${assessmentType} assessment initiated`
            })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to create assessment');
        }
        
        return data.assessment;
    } catch (error) {
        console.error('Error creating assessment:', error);
        throw error;
    }
}

/**
 * Store posture analysis results
 */
export async function storeAnalysisResults(assessmentId, analysisData) {
    try {
        // Convert analysis data to measurement format
        const measurements = [];
        let patterns = [];
        
        // Process measurements based on mode
        if (analysisData.mode === 'quick' && analysisData.results) {
            // Quick mode measurements
            if (analysisData.results.headTilt) {
                measurements.push({
                    type: 'head_tilt',
                    value: analysisData.results.headTilt.angle,
                    unit: 'degrees',
                    confidence: 0.85,
                    viewType: 'front'
                });
            }
            if (analysisData.results.shoulderLevel) {
                measurements.push({
                    type: 'shoulder_asymmetry',
                    value: analysisData.results.shoulderLevel.difference,
                    unit: 'pixels',
                    confidence: 0.85,
                    viewType: 'front'
                });
            }
        } else if (analysisData.mode === 'clinical') {
            // Clinical mode - extract from photos analysis
            Object.entries(analysisData.photos || {}).forEach(([view, data]) => {
                if (data.analysis) {
                    // Add each measurement from the analysis
                    Object.entries(data.analysis).forEach(([key, value]) => {
                        if (typeof value === 'number') {
                            measurements.push({
                                type: key,
                                value: value,
                                unit: key.includes('angle') ? 'degrees' : 'mm',
                                confidence: 0.9,
                                viewType: view
                            });
                        }
                    });
                }
            });
        } else if (analysisData.mode === 'advanced') {
            // Advanced mode - process each view
            ['front', 'side', 'back'].forEach(view => {
                const viewData = analysisData[view];
                if (viewData) {
                    // Handle both old format (direct properties) and new format (measurements array)
                    if (viewData.measurements && Array.isArray(viewData.measurements)) {
                        // New format - use directly
                        viewData.measurements.forEach(m => {
                            const numValue = parseFloat(m.value);
                            if (!isNaN(numValue)) {
                                measurements.push({
                                    type: m.type || m.name,  // Handle both property names
                                    value: numValue,
                                    unit: m.unit || 'degrees',
                                    confidence: m.confidence || 0.9,
                                    viewType: view
                                });
                            } else {
                                console.error(`Invalid numeric value for measurement ${m.type || m.name}: ${m.value}`);
                            }
                        });
                    } else {
                        // Old format - convert properties to measurements
                        Object.entries(viewData).forEach(([key, value]) => {
                            if (typeof value === 'number' && 
                                key !== 'totalDeviation' && 
                                key !== 'confidence' && 
                                key !== 'stability') {
                                const numValue = parseFloat(value);
                                if (!isNaN(numValue)) {
                                    measurements.push({
                                        type: key,
                                        value: numValue,
                                        unit: MEASUREMENT_UNITS[key] || 'units',  // FIXED: Use correct unit mapping
                                        confidence: viewData.confidence || 0.85,
                                        viewType: view
                                    });
                                } else {
                                    console.error(`Invalid numeric value for ${key}: ${value}`);
                                }
                            }
                        });
                        
                        // Note: weight distribution is now handled by the general loop above
                        // via weightDistributionLeft and weightDistributionRight properties
                    }
                }
            });
            
            // Add any detected patterns
            if (analysisData.patterns && Array.isArray(analysisData.patterns)) {
                patterns = analysisData.patterns;
            }
        }
        
        // Calculate overall score if available
        const overallScore = analysisData.overallScore || 
            (analysisData.summary && analysisData.summary.overallScore) || 
            calculateOverallScore(measurements);
        
        const response = await fetch(withApiKeyParam(`${API_BASE}/assessments/analyze`), {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                assessmentId,
                measurements,
                patterns,
                overallScore
            })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to store analysis results');
        }
        
        return data;
    } catch (error) {
        console.error('Error storing analysis results:', error);
        throw error;
    }
}

/**
 * Test database connection
 */
export async function testDatabaseConnection() {
    try {
        console.log('Testing database connection to:', `${API_BASE}/test-db`);
        
        const response = await fetch(withApiKeyParam(`${API_BASE}/test-db`), {
            headers: getAuthHeaders()
        });
        
        console.log('Database test response status:', response.status);
        console.log('Database test response headers:', Object.fromEntries(response.headers));
        
        // Check if response is actually JSON
        const contentType = response.headers.get('content-type');
        console.log('Response content-type:', contentType);
        
        if (!contentType || !contentType.includes('application/json')) {
            const textResponse = await response.text();
            console.error('❌ Expected JSON but got:', textResponse.substring(0, 500));
            throw new Error(`API returned ${contentType || 'unknown content'} instead of JSON. This usually means environment variables are missing in Vercel deployment.`);
        }
        
        const data = await response.json();
        console.log('Database test response data:', data);
        
        if (!response.ok || !data.connected) {
            throw new Error(data.error || `Database connection failed (Status: ${response.status})`);
        }
        
        return data;
    } catch (error) {
        console.error('Database connection test failed:', error);
        console.error('API Base URL was:', API_BASE);
        console.error('Full URL attempted:', `${API_BASE}/test-db`);
        throw error;
    }
}

/**
 * Helper function to calculate overall score from measurements
 */
function calculateOverallScore(measurements) {
    if (!measurements || measurements.length === 0) return 75;
    
    // Simple scoring based on deviation from normal
    let totalDeviation = 0;
    measurements.forEach(m => {
        // Assume normal is 0 for most angles
        totalDeviation += Math.abs(m.value);
    });
    
    // Convert to 0-100 score (100 is perfect posture)
    const avgDeviation = totalDeviation / measurements.length;
    const score = Math.max(0, Math.min(100, 100 - (avgDeviation * 2)));
    
    return Math.round(score);
}

/**
 * Save complete assessment with all data
 */
export async function saveCompleteAssessment(assessmentData) {
    try {
        // Create patient if needed
        let patientId = assessmentData.patientId;
        
        if (!patientId && assessmentData.clientInfo) {
            const patient = await createPatient({
                name: assessmentData.clientInfo.name || 'Anonymous Patient',
                email: assessmentData.clientInfo.email,
                phone: assessmentData.clientInfo.phone,
                dateOfBirth: assessmentData.clientInfo.dateOfBirth
            });
            patientId = patient.id;
        }
        
        // If still no patient ID, create anonymous patient
        if (!patientId) {
            const patient = await createPatient({
                name: assessmentData.patientName || 'Anonymous Patient',
                email: '',
                phone: ''
            });
            patientId = patient.id;
        }
        
        // Create assessment
        const assessment = await createAssessment(patientId, assessmentData.mode || 'clinical');
        
        // Store analysis results
        const result = await storeAnalysisResults(assessment.id, assessmentData);
        
        // Store exercise prescriptions if this is a clinical assessment
        if (assessmentData.mode === 'clinical' && assessment.id) {
            const prescriptionData = {
                release: assessmentData.release || {},
                reset: assessmentData.reset || {},
                rebuild: assessmentData.rebuild || {}
            };
            
            // Check if we have any exercises to save
            const hasExercises = 
                (prescriptionData.release.exercises?.length > 0) ||
                (prescriptionData.reset.exercises?.length > 0) ||
                (prescriptionData.rebuild.exercises?.length > 0);
            
            if (hasExercises) {
                try {
                    // Save exercise prescription to database
                    const prescriptionResult = await saveExercisePrescription(
                        assessment.id, 
                        prescriptionData, 
                        {
                            clinicianId: assessmentData.clinicianId || null,
                            sessionsPerWeek: parseInt(assessmentData.clientInfo?.sessions) || 3,
                            notes: `Exercise prescription from ${assessmentData.mode} assessment`
                        }
                    );
                    
                    console.log('✅ Exercise prescription saved successfully:', prescriptionResult);
                    
                } catch (prescError) {
                    console.error('Exercise prescription save failed:', prescError);
                    // Don't fail the entire assessment for prescription errors - this is clinical data
                    // but assessment data is still valuable without exercise prescription
                }
            }
        }
        
        return {
            success: true,
            patientId,
            assessmentId: assessment.id,
            ...result
        };
    } catch (error) {
        console.error('Error saving complete assessment:', error);
        throw error;
    }
}

/**
 * Upload photos to secure storage (replaces dangerous photo truncation)
 */
export async function uploadPhoto(assessmentId, viewType, imageData, annotation = '') {
    try {
        console.log(`Uploading ${viewType} photo for assessment ${assessmentId}...`);
        
        const response = await fetch(withApiKeyParam(`${API_BASE}/photos/upload`), {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                assessmentId,
                viewType,
                imageData,
                annotation,
                mimeType: 'image/jpeg'
            })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to upload photo');
        }
        
        console.log(`✅ ${viewType} photo uploaded successfully: ${data.photo.fileSize} bytes`);
        return data.photo;
        
    } catch (error) {
        console.error('Photo upload failed:', error);
        throw error;
    }
}

/**
 * Upload multiple photos for an assessment
 */
export async function uploadAssessmentPhotos(assessmentId, photoData) {
    const uploadResults = {};
    const uploadErrors = [];
    
    for (const [viewType, data] of Object.entries(photoData)) {
        if (data && data.imageData) {
            try {
                const result = await uploadPhoto(
                    assessmentId, 
                    viewType, 
                    data.imageData, 
                    data.annotation || ''
                );
                uploadResults[viewType] = result;
            } catch (error) {
                uploadErrors.push({
                    viewType,
                    error: error.message
                });
                console.error(`Failed to upload ${viewType} photo:`, error);
            }
        }
    }
    
    return {
        uploads: uploadResults,
        errors: uploadErrors,
        success: Object.keys(uploadResults).length > 0
    };
}

/**
 * Save exercise prescription to database (replaces console.log placeholder)
 */
export async function saveExercisePrescription(assessmentId, prescriptionData, options = {}) {
    try {
        console.log(`Saving exercise prescription for assessment ${assessmentId}...`);
        
        const response = await fetch(withApiKeyParam(`${API_BASE}/exercises/prescribe`), {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                assessmentId,
                clinicianId: options.clinicianId || null,
                prescriptionData,
                sessionsPerWeek: options.sessionsPerWeek || 3,
                durationWeeks: options.durationWeeks || 6,
                notes: options.notes || ''
            })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to save exercise prescription');
        }
        
        console.log(`✅ Exercise prescription saved: ${data.prescription.exerciseCount} exercises across ${Object.keys(data.prescription.categories).filter(cat => data.prescription.categories[cat] > 0).length} categories`);
        return data.prescription;
        
    } catch (error) {
        console.error('Exercise prescription save failed:', error);
        throw error;
    }
}