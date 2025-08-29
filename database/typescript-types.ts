// Posture Rehab AI App - Database TypeScript Types
// Auto-generated from database schema

// ============================================
// Core Entity Types
// ============================================

export interface Clinic {
    id: string;
    name: string;
    subdomain?: string | null;
    settings?: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface Clinician {
    id: string;
    clinic_id: string;
    email: string;
    name: string;
    role: 'admin' | 'clinician' | 'assistant';
    active: boolean;
    last_login?: string | null;
    created_at: string;
    updated_at: string;
}

export interface Patient {
    id: string;
    clinic_id: string;
    patient_code: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    date_of_birth?: string | null;
    created_at: string;
    created_by: string;
}

// ============================================
// Assessment Types
// ============================================

export interface Assessment {
    id: string;
    patient_id?: string | null;
    clinician_id: string;
    assessment_type: 'quick' | 'clinical' | 'advanced';
    status: 'draft' | 'complete' | 'reviewed';
    chief_complaint?: string | null;
    clinical_notes?: string | null;
    notes?: string | null;
    created_at: string;
    completed_at?: string | null;
    updated_at: string;
}

export interface Measurement {
    id: string;
    assessment_id: string;
    measurement_type: string;
    value: number;
    unit: string;
    confidence?: number | null;
    view_type?: 'front' | 'side' | 'back' | null;
    landmarks?: MediaPipeLandmarks | null;
    created_at: string;
}

export interface PosturalPattern {
    id: string;
    assessment_id: string;
    pattern_type: string;
    severity?: 'mild' | 'moderate' | 'severe' | null;
    confidence?: number | null;
    affected_regions?: string[] | null;
    clinical_significance?: string | null;
    detected_at: string;
}

// ============================================
// Treatment Types
// ============================================

export interface ExercisePrescription {
    id: string;
    assessment_id: string;
    prescribed_by: string;
    exercises: ThreeRExercises;
    prescription_date: string;
    sessions_per_week: number;
    duration_weeks: number;
    status: 'active' | 'completed' | 'discontinued';
    notes?: string | null;
    created_at: string;
}

export interface PrescribedExercise {
    id: string;
    prescription_id: string;
    exercise_category: 'release' | 'reset' | 'rebuild';
    exercise_name: string;
    sets?: number | null;
    reps?: number | null;
    hold_seconds?: number | null;
    frequency_per_day: number;
    video_url?: string | null;
    instructions?: string | null;
    contraindications?: string[] | null;
    sort_order?: number | null;
}

// ============================================
// Compliance & Safety Types
// ============================================

export interface AuditLog {
    id: string;
    user_id?: string | null;
    user_type?: 'clinician' | 'system' | 'patient' | null;
    action: string;
    resource_type?: string | null;
    resource_id?: string | null;
    ip_address?: string | null;
    user_agent?: string | null;
    details?: Record<string, any> | null;
    created_at: string;
}

export interface SafetyAlert {
    id: string;
    patient_id?: string | null;
    assessment_id?: string | null;
    alert_type: string;
    severity: 'warning' | 'urgent' | 'emergency';
    description: string;
    detected_at: string;
    acknowledged_by?: string | null;
    acknowledged_at?: string | null;
    action_taken?: string | null;
}

export interface ConsentRecord {
    id: string;
    patient_id: string;
    consent_type: 'assessment' | 'data_storage' | 'research' | 'photography';
    granted: boolean;
    granted_at: string;
    expires_at?: string | null;
    granted_by?: string | null;
    ip_address?: string | null;
    user_agent?: string | null;
    signature_data?: string | null;
}

// ============================================
// Specialized JSON Types
// ============================================

export interface ThreeRExercises {
    release: string[];
    reset: string[];
    rebuild: string[];
}

export interface MediaPipeLandmarks {
    pose?: PoseLandmark[];
    face?: FaceLandmark[];
    hands?: HandLandmark[];
}

export interface PoseLandmark {
    x: number;
    y: number;
    z: number;
    visibility: number;
}

export interface FaceLandmark {
    x: number;
    y: number;
    z: number;
}

export interface HandLandmark {
    x: number;
    y: number;
    z: number;
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreatePatientRequest {
    clinic_id: string;
    name: string;
    email?: string;
    phone?: string;
    date_of_birth?: string;
}

export interface CreateAssessmentRequest {
    patient_id?: string;
    clinician_id: string;
    assessment_type: 'quick' | 'clinical' | 'advanced';
    chief_complaint?: string;
}

export interface SaveMeasurementRequest {
    assessment_id: string;
    measurements: Array<{
        measurement_type: string;
        value: number;
        unit: string;
        confidence?: number;
        view_type?: 'front' | 'side' | 'back';
        landmarks?: MediaPipeLandmarks;
    }>;
}

export interface CreatePrescriptionRequest {
    assessment_id: string;
    prescribed_by: string;
    exercises: ThreeRExercises;
    sessions_per_week?: number;
    duration_weeks?: number;
    notes?: string;
}

// ============================================
// Utility Types
// ============================================

export type MeasurementType = 
    | 'head_tilt'
    | 'shoulder_level_difference'
    | 'hip_level_difference'
    | 'q_angle_left'
    | 'q_angle_right'
    | 'forward_head_distance'
    | 'thoracic_kyphosis'
    | 'lumbar_lordosis'
    | 'anterior_pelvic_tilt'
    | 'cobb_angle'
    | 'scapular_asymmetry'
    | 'trunk_rotation';

export type PatternType =
    | 'upper_crossed_syndrome'
    | 'lower_crossed_syndrome'
    | 'forward_head_posture'
    | 'rounded_shoulders'
    | 'anterior_pelvic_tilt'
    | 'scoliosis'
    | 'trendelenburg_sign';

export type ViewType = 'front' | 'side' | 'back';

export type AssessmentType = 'quick' | 'clinical' | 'advanced';

export type AssessmentStatus = 'draft' | 'complete' | 'reviewed';

export type ClinicianRole = 'admin' | 'clinician' | 'assistant';

export type ExerciseCategory = 'release' | 'reset' | 'rebuild';

export type PrescriptionStatus = 'active' | 'completed' | 'discontinued';

export type AlertSeverity = 'warning' | 'urgent' | 'emergency';

export type ConsentType = 'assessment' | 'data_storage' | 'research' | 'photography';

export type UserType = 'clinician' | 'system' | 'patient';

// ============================================
// Database Response Types
// ============================================

export interface DatabaseError {
    code: string;
    message: string;
    details?: string;
    hint?: string;
}

export interface DatabaseResponse<T> {
    data?: T;
    error?: DatabaseError;
}

export interface PaginatedResponse<capitalize<function_name>(){
    data: T[];
    count: number;
    page: number;
    page_size: number;
    total_pages: number;
}

// ============================================
// Complex Query Result Types
// ============================================

export interface AssessmentWithMeasurements extends Assessment {
    measurements: Measurement[];
    patterns?: PosturalPattern[];
    prescription?: ExercisePrescription;
}

export interface PatientWithAssessments extends Patient {
    assessments: Assessment[];
    latest_assessment?: Assessment;
    total_assessments: number;
}

export interface PrescriptionWithExercises extends ExercisePrescription {
    exercises_detailed: PrescribedExercise[];
    patient?: Patient;
    assessment?: Assessment;
}

export interface ClinicalSummary {
    patient_id: string;
    total_assessments: number;
    latest_assessment_date?: string;
    active_prescriptions: number;
    detected_patterns: string[];
    risk_level?: 'low' | 'medium' | 'high';
    compliance_rate?: number;
}

// ============================================
// Form/UI Helper Types
// ============================================

export interface AssessmentFormData {
    patient_id?: string;
    assessment_type: AssessmentType;
    chief_complaint?: string;
    images?: {
        front?: string;
        side?: string;
        back?: string;
    };
}

export interface ExerciseFormData {
    category: ExerciseCategory;
    name: string;
    sets?: number;
    reps?: number;
    hold_seconds?: number;
    frequency_per_day: number;
    instructions?: string;
    video_url?: string;
}

export interface PatientSearchParams {
    clinic_id?: string;
    search_term?: string;
    created_after?: string;
    created_before?: string;
    limit?: number;
    offset?: number;
}

// ============================================
// Constants
// ============================================

export const MEASUREMENT_UNITS = {
    angle: 'degrees',
    distance: 'cm',
    difference: 'mm',
    ratio: 'ratio',
} as const;

export const CLINICAL_THRESHOLDS = {
    head_tilt: { mild: 5, moderate: 10, severe: 15 },
    forward_head: { mild: 2.5, moderate: 5, severe: 7.5 },
    shoulder_difference: { mild: 10, moderate: 20, severe: 30 },
    cobb_angle: { mild: 10, moderate: 25, severe: 40 },
} as const;

export const EXERCISE_DEFAULTS = {
    sessions_per_week: 3,
    duration_weeks: 6,
    sets: 3,
    reps: 12,
    hold_seconds: 30,
    frequency_per_day: 1,
} as const;