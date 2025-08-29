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
const authHeaders = {
    'Authorization': 'Bearer posture-api-2025',
    'Content-Type': 'application/json'
};

/**
 * Patient Management
 */
export async function createPatient(patientData) {
    try {
        const response = await fetch(`${API_BASE}/patients/create`, {
            method: 'POST',
            headers: authHeaders,
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
        const response = await fetch(`${API_BASE}/assessments/create`, {
            method: 'POST',
            headers: authHeaders,
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
        const patterns = [];
        
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
                if (viewData && viewData.measurements) {
                    viewData.measurements.forEach(m => {
                        measurements.push({
                            type: m.name,
                            value: m.value,
                            unit: m.unit || 'degrees',
                            confidence: m.confidence || 0.9,
                            viewType: view
                        });
                    });
                }
                
                // Add patterns
                if (viewData && viewData.patterns) {
                    viewData.patterns.forEach(p => {
                        patterns.push({
                            type: p.name,
                            severity: p.severity,
                            confidence: p.confidence || 0.85
                        });
                    });
                }
            });
        }
        
        // Calculate overall score if available
        const overallScore = analysisData.overallScore || 
            (analysisData.summary && analysisData.summary.overallScore) || 
            calculateOverallScore(measurements);
        
        const response = await fetch(`${API_BASE}/assessments/analyze`, {
            method: 'POST',
            headers: authHeaders,
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
        
        const response = await fetch(`${API_BASE}/test-db`, {
            headers: authHeaders
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