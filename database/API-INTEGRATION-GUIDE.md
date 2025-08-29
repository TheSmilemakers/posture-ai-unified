# Posture Rehab AI - API Integration Guide

## Overview

This guide provides comprehensive examples for integrating with the Posture Rehab AI database API. All endpoints require authentication and return consistent response formats.

## Authentication

All API requests require a Bearer token in the Authorization header:

```javascript
const authHeaders = {
    'Authorization': 'Bearer posture-api-2025',
    'Content-Type': 'application/json'
};
```

## Base Configuration

```javascript
// api-config.js
const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://posture.rajanmaher.com/api'
    : 'http://localhost:3000/api';

const DEFAULT_CLINIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const DEFAULT_CLINICIAN_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
```

## Patient Management

### Create a New Patient

```javascript
async function createPatient(patientData) {
    const response = await fetch(`${API_BASE_URL}/patients/create`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
            clinic_id: DEFAULT_CLINIC_ID,
            name: patientData.name,
            email: patientData.email,
            phone: patientData.phone,
            date_of_birth: patientData.dateOfBirth
        })
    });
    
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || 'Failed to create patient');
    }
    
    return result.data; // Returns Patient object with generated patient_code
}

// Usage
try {
    const newPatient = await createPatient({
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '555-1234',
        dateOfBirth: '1990-01-15'
    });
    console.log('Patient created:', newPatient.patient_code);
} catch (error) {
    console.error('Error creating patient:', error);
}
```

### Get Patient by ID

```javascript
async function getPatient(patientId) {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}`, {
        headers: authHeaders
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch patient');
    }
    
    const result = await response.json();
    return result.data;
}
```

### Search Patients

```javascript
async function searchPatients(searchTerm, limit = 10) {
    const params = new URLSearchParams({
        search: searchTerm,
        limit: limit.toString(),
        clinic_id: DEFAULT_CLINIC_ID
    });
    
    const response = await fetch(`${API_BASE_URL}/patients/search?${params}`, {
        headers: authHeaders
    });
    
    const result = await response.json();
    return result.data; // Array of patients
}
```

## Assessment Management

### Create a New Assessment

```javascript
async function createAssessment(patientId, assessmentType, chiefComplaint) {
    const response = await fetch(`${API_BASE_URL}/assessments/create`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
            patient_id: patientId, // Optional for anonymous
            clinician_id: DEFAULT_CLINICIAN_ID,
            assessment_type: assessmentType, // 'quick', 'clinical', 'advanced'
            chief_complaint: chiefComplaint,
            status: 'draft'
        })
    });
    
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || 'Failed to create assessment');
    }
    
    return result.data; // Returns Assessment object
}

// Create anonymous assessment
const anonymousAssessment = await createAssessment(
    null, // No patient ID
    'quick',
    'General posture check'
);
```

### Save MediaPipe Analysis Results

```javascript
async function saveAnalysisResults(assessmentId, analysisData, viewType) {
    // Prepare measurements from analysis
    const measurements = [];
    
    // Example for front view measurements
    if (viewType === 'front') {
        measurements.push({
            measurement_type: 'head_tilt',
            value: analysisData.headTilt,
            unit: 'degrees',
            confidence: analysisData.confidence,
            view_type: 'front',
            landmarks: analysisData.rawLandmarks
        });
        
        measurements.push({
            measurement_type: 'shoulder_level_difference',
            value: analysisData.shoulderDifference,
            unit: 'mm',
            confidence: analysisData.confidence,
            view_type: 'front'
        });
    }
    
    // Save measurements
    const response = await fetch(`${API_BASE_URL}/assessments/analyze`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
            assessment_id: assessmentId,
            measurements: measurements,
            patterns: analysisData.detectedPatterns || []
        })
    });
    
    const result = await response.json();
    return result.data;
}

// Usage with BiomechanicalAnalyzer
const analyzer = new BiomechanicalAnalyzer();
const frontAnalysis = analyzer.analyzeFrontView(landmarks);

await saveAnalysisResults(assessmentId, {
    headTilt: frontAnalysis.headTilt,
    shoulderDifference: frontAnalysis.shoulderLevel.difference,
    confidence: frontAnalysis.confidence,
    rawLandmarks: landmarks,
    detectedPatterns: frontAnalysis.patterns
}, 'front');
```

### Complete Assessment Workflow

```javascript
async function completeAssessmentWorkflow(patientData, images) {
    try {
        // Step 1: Create or get patient
        let patient;
        if (patientData.isAnonymous) {
            patient = null;
        } else {
            patient = await createPatient(patientData);
        }
        
        // Step 2: Create assessment
        const assessment = await createAssessment(
            patient?.id || null,
            'advanced', // For 3-view analysis
            patientData.chiefComplaint
        );
        
        // Step 3: Analyze each view
        const analyzer = new BiomechanicalAnalyzer();
        
        for (const [viewType, imageData] of Object.entries(images)) {
            // Process image with MediaPipe
            const landmarks = await processImageWithMediaPipe(imageData);
            
            // Analyze based on view type
            let analysis;
            switch (viewType) {
                case 'front':
                    analysis = analyzer.analyzeFrontView(landmarks);
                    break;
                case 'side':
                    analysis = analyzer.analyzeSideView(landmarks);
                    break;
                case 'back':
                    analysis = analyzer.analyzeBackView(landmarks);
                    break;
            }
            
            // Save measurements
            await saveAnalysisResults(assessment.id, analysis, viewType);
        }
        
        // Step 4: Detect overall patterns
        const patterns = analyzer.detectPatterns(allAnalysisData);
        await savePosturalPatterns(assessment.id, patterns);
        
        // Step 5: Generate prescription if clinical mode
        if (assessment.assessment_type === 'clinical') {
            const prescription = await generateExercisePrescription(
                assessment.id,
                patterns
            );
        }
        
        // Step 6: Mark assessment as complete
        await updateAssessmentStatus(assessment.id, 'complete');
        
        return {
            success: true,
            assessmentId: assessment.id,
            patientCode: patient?.patient_code
        };
        
    } catch (error) {
        console.error('Assessment workflow failed:', error);
        // Log to audit trail
        await logError('assessment_workflow', error);
        throw error;
    }
}
```

## Exercise Prescription

### Create Exercise Prescription

```javascript
async function createExercisePrescription(assessmentId, detectedPatterns) {
    // Select exercises based on patterns
    const exercises = {
        release: [],
        reset: [],
        rebuild: []
    };
    
    // Example pattern-based selection
    if (detectedPatterns.includes('forward_head_posture')) {
        exercises.release.push('upper_trap_stretch', 'levator_scapulae_stretch');
        exercises.reset.push('chin_tucks', 'deep_neck_flexor_activation');
        exercises.rebuild.push('resistance_band_rows', 'face_pulls');
    }
    
    if (detectedPatterns.includes('rounded_shoulders')) {
        exercises.release.push('pec_minor_stretch', 'doorway_chest_stretch');
        exercises.reset.push('wall_angels', 'scapular_wall_slides');
        exercises.rebuild.push('external_rotation', 'prone_y_t_w');
    }
    
    const response = await fetch(`${API_BASE_URL}/prescriptions/create`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
            assessment_id: assessmentId,
            prescribed_by: DEFAULT_CLINICIAN_ID,
            exercises: exercises,
            sessions_per_week: 3,
            duration_weeks: 6,
            notes: 'Progress to next phase when current exercises become easy'
        })
    });
    
    const result = await response.json();
    return result.data;
}
```

### Add Detailed Exercise Instructions

```javascript
async function addExerciseDetails(prescriptionId, exerciseDetails) {
    const exercises = exerciseDetails.map((exercise, index) => ({
        prescription_id: prescriptionId,
        exercise_category: exercise.category,
        exercise_name: exercise.name,
        sets: exercise.sets || 3,
        reps: exercise.reps || 12,
        hold_seconds: exercise.holdSeconds || null,
        frequency_per_day: exercise.frequencyPerDay || 1,
        video_url: exercise.videoUrl,
        instructions: exercise.instructions,
        contraindications: exercise.contraindications || [],
        sort_order: index + 1
    }));
    
    const response = await fetch(`${API_BASE_URL}/exercises/batch-create`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ exercises })
    });
    
    return response.json();
}
```

## Safety & Compliance

### Log Safety Alert

```javascript
async function logSafetyAlert(patientId, assessmentId, alertData) {
    const response = await fetch(`${API_BASE_URL}/safety-alerts/create`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
            patient_id: patientId,
            assessment_id: assessmentId,
            alert_type: alertData.type,
            severity: alertData.severity, // 'warning', 'urgent', 'emergency'
            description: alertData.description
        })
    });
    
    if (alertData.severity === 'emergency') {
        // Trigger immediate notification
        await notifyClinician(DEFAULT_CLINICIAN_ID, alertData);
    }
    
    return response.json();
}

// Red flag detection example
function checkForRedFlags(patientResponses) {
    const redFlags = [];
    
    if (patientResponses.painLevel > 7) {
        redFlags.push({
            type: 'severe_pain',
            severity: 'urgent',
            description: `Patient reports pain level ${patientResponses.painLevel}/10`
        });
    }
    
    if (patientResponses.neurologicalSymptoms) {
        redFlags.push({
            type: 'neurological_symptoms',
            severity: 'emergency',
            description: 'Patient reports neurological symptoms'
        });
    }
    
    return redFlags;
}
```

### Audit Logging

```javascript
async function logAuditEvent(action, resourceType, resourceId, details = {}) {
    const response = await fetch(`${API_BASE_URL}/audit-logs/create`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
            user_id: getCurrentUserId(),
            user_type: 'clinician',
            action: action,
            resource_type: resourceType,
            resource_id: resourceId,
            details: details,
            ip_address: await getUserIP(),
            user_agent: navigator.userAgent
        })
    });
    
    return response.json();
}

// Automatic audit logging wrapper
async function auditedAction(action, resourceType, resourceId, actionFn) {
    try {
        const result = await actionFn();
        await logAuditEvent(action, resourceType, resourceId, {
            status: 'success',
            result: result
        });
        return result;
    } catch (error) {
        await logAuditEvent(action, resourceType, resourceId, {
            status: 'failed',
            error: error.message
        });
        throw error;
    }
}

// Usage
const patient = await auditedAction(
    'create_patient',
    'patient',
    null,
    () => createPatient(patientData)
);
```

## Report Generation

### Generate PDF Report

```javascript
async function generatePDFReport(assessmentId) {
    const response = await fetch(`${API_BASE_URL}/reports/generate`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
            assessment_id: assessmentId,
            include_sections: [
                'patient_info',
                'measurements',
                'postural_analysis',
                'exercise_prescription',
                'clinical_notes'
            ],
            format: 'pdf'
        })
    });
    
    if (!response.ok) {
        throw new Error('Failed to generate report');
    }
    
    // Get PDF blob
    const blob = await response.blob();
    
    // Download PDF
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assessment-${assessmentId}-report.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
}
```

## Error Handling

### Standardized Error Handler

```javascript
class APIError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
    }
}

async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...authHeaders,
                ...options.headers
            }
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new APIError(
                result.error || 'Request failed',
                response.status,
                result.details
            );
        }
        
        return result.data;
        
    } catch (error) {
        if (error instanceof APIError) {
            throw error;
        }
        
        // Network or parsing error
        throw new APIError(
            'Network error',
            0,
            { originalError: error.message }
        );
    }
}

// Usage with retry logic
async function apiRequestWithRetry(url, options, maxRetries = 3) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await apiRequest(url, options);
        } catch (error) {
            lastError = error;
            
            // Don't retry on client errors
            if (error.code >= 400 && error.code < 500) {
                throw error;
            }
            
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
    }
    
    throw lastError;
}
```

## Batch Operations

### Batch Save Measurements

```javascript
async function batchSaveMeasurements(assessmentId, allMeasurements) {
    // Chunk measurements to avoid payload size limits
    const BATCH_SIZE = 50;
    const chunks = [];
    
    for (let i = 0; i < allMeasurements.length; i += BATCH_SIZE) {
        chunks.push(allMeasurements.slice(i, i + BATCH_SIZE));
    }
    
    const results = await Promise.all(
        chunks.map(chunk => 
            apiRequest(`${API_BASE_URL}/measurements/batch`, {
                method: 'POST',
                body: JSON.stringify({
                    assessment_id: assessmentId,
                    measurements: chunk
                })
            })
        )
    );
    
    return results.flat();
}
```

## Real-time Updates (WebSocket)

```javascript
// WebSocket connection for real-time updates
class RealtimeConnection {
    constructor() {
        this.ws = null;
        this.reconnectInterval = 5000;
        this.shouldReconnect = true;
    }
    
    connect() {
        const wsUrl = API_BASE_URL.replace('http', 'ws') + '/realtime';
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('Realtime connection established');
            // Authenticate
            this.send({
                type: 'auth',
                token: 'posture-api-2025'
            });
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleRealtimeUpdate(data);
        };
        
        this.ws.onclose = () => {
            if (this.shouldReconnect) {
                setTimeout(() => this.connect(), this.reconnectInterval);
            }
        };
    }
    
    handleRealtimeUpdate(data) {
        switch (data.type) {
            case 'assessment_updated':
                // Update UI with new assessment data
                updateAssessmentUI(data.payload);
                break;
                
            case 'safety_alert':
                // Show immediate notification
                showSafetyAlert(data.payload);
                break;
                
            case 'prescription_modified':
                // Refresh prescription display
                refreshPrescription(data.payload);
                break;
        }
    }
    
    send(data) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }
    
    disconnect() {
        this.shouldReconnect = false;
        this.ws?.close();
    }
}

// Usage
const realtime = new RealtimeConnection();
realtime.connect();

// Subscribe to specific assessment updates
realtime.send({
    type: 'subscribe',
    channel: `assessment:${assessmentId}`
});
```

## Testing

### API Integration Tests

```javascript
// test-api-integration.js
async function runIntegrationTests() {
    console.log('Starting API integration tests...');
    
    const tests = {
        // Test patient creation
        async testPatientCreation() {
            const patient = await createPatient({
                name: 'Test Patient ' + Date.now(),
                email: 'test@example.com'
            });
            
            assert(patient.id, 'Patient should have ID');
            assert(patient.patient_code, 'Patient should have code');
            return patient;
        },
        
        // Test assessment workflow
        async testAssessmentWorkflow(patientId) {
            // Create assessment
            const assessment = await createAssessment(
                patientId,
                'quick',
                'Test assessment'
            );
            
            // Add measurements
            await saveAnalysisResults(assessment.id, {
                headTilt: 5.2,
                shoulderDifference: 12.5,
                confidence: 0.85
            }, 'front');
            
            // Complete assessment
            await updateAssessmentStatus(assessment.id, 'complete');
            
            return assessment;
        },
        
        // Test error handling
        async testErrorHandling() {
            try {
                await createPatient({ name: null }); // Invalid data
                throw new Error('Should have failed');
            } catch (error) {
                assert(error.code === 400, 'Should return 400 error');
            }
        }
    };
    
    // Run all tests
    for (const [name, test] of Object.entries(tests)) {
        try {
            console.log(`Running ${name}...`);
            await test();
            console.log(`✓ ${name} passed`);
        } catch (error) {
            console.error(`✗ ${name} failed:`, error);
        }
    }
}

// Run tests
if (typeof module !== 'undefined' && module.exports) {
    runIntegrationTests();
}
```

## Best Practices

1. **Always validate data before sending**
2. **Handle network errors gracefully**
3. **Implement proper authentication token refresh**
4. **Use batch operations for multiple items**
5. **Log all errors to audit trail**
6. **Cache frequently accessed data**
7. **Implement offline queue for failed requests**
8. **Use WebSocket for real-time updates when available**
9. **Sanitize all user inputs**
10. **Follow HIPAA guidelines for PHI handling**