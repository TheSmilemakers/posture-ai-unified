-- Posture Rehab App (PRA) Database Schema
-- All tables prefixed with pra_ to avoid conflicts with existing data
-- Designed for HIPAA compliance and clinical use

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schema for better organization
CREATE SCHEMA IF NOT EXISTS posture_rehab;

-- Set search path
SET search_path TO posture_rehab, public;

-- =====================================================
-- ENCRYPTION FUNCTIONS
-- =====================================================

-- Key for encryption (in production, use proper key management)
-- This is a placeholder - replace with secure key management
CREATE OR REPLACE FUNCTION pra_get_encryption_key()
RETURNS TEXT AS $$
BEGIN
    -- In production, retrieve from secure key management service
    RETURN 'dev-key-replace-in-production-32chars!!';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Encrypt text
CREATE OR REPLACE FUNCTION pra_encrypt(plain_text TEXT)
RETURNS TEXT AS $$
BEGIN
    IF plain_text IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN encode(
        encrypt(
            plain_text::bytea,
            pra_get_encryption_key()::bytea,
            'aes'
        ),
        'base64'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrypt text
CREATE OR REPLACE FUNCTION pra_decrypt(encrypted_text TEXT)
RETURNS TEXT AS $$
BEGIN
    IF encrypted_text IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN convert_from(
        decrypt(
            decode(encrypted_text, 'base64')::bytea,
            pra_get_encryption_key()::bytea,
            'aes'
        ),
        'utf8'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Clinics table (for multi-tenancy)
CREATE TABLE IF NOT EXISTS pra_clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    settings JSONB DEFAULT '{}'::jsonb
);

-- Clinicians table
CREATE TABLE IF NOT EXISTS pra_clinicians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES pra_clinics(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    encrypted_name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'clinician', 'assistant')) DEFAULT 'clinician',
    active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Patients table (all PHI encrypted)
CREATE TABLE IF NOT EXISTS pra_patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES pra_clinics(id) ON DELETE CASCADE,
    patient_code TEXT UNIQUE NOT NULL, -- Non-PHI identifier
    encrypted_name TEXT NOT NULL,
    encrypted_email TEXT,
    encrypted_phone TEXT,
    encrypted_date_of_birth TEXT,
    encrypted_address TEXT,
    hashed_email TEXT, -- For lookups without decryption
    consent_status JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES pra_clinicians(id)
);

-- Consent records
CREATE TABLE IF NOT EXISTS pra_consent_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES pra_patients(id) ON DELETE CASCADE,
    consent_type TEXT CHECK (consent_type IN ('assessment', 'data_storage', 'research', 'photography')),
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    granted_by UUID REFERENCES pra_clinicians(id),
    ip_address INET,
    user_agent TEXT,
    signature_data TEXT -- Base64 encoded signature image
);

-- Assessments table
CREATE TABLE IF NOT EXISTS pra_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES pra_patients(id) ON DELETE CASCADE,
    clinician_id UUID REFERENCES pra_clinicians(id),
    assessment_type TEXT CHECK (assessment_type IN ('quick', 'clinical', 'advanced')),
    status TEXT CHECK (status IN ('draft', 'complete', 'reviewed')) DEFAULT 'draft',
    chief_complaint TEXT,
    clinical_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Assessment photos
CREATE TABLE IF NOT EXISTS pra_assessment_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES pra_assessments(id) ON DELETE CASCADE,
    view_type TEXT CHECK (view_type IN ('front', 'side', 'back', 'other')),
    storage_path TEXT NOT NULL, -- Path in secure storage
    mime_type TEXT DEFAULT 'image/jpeg',
    annotations JSONB DEFAULT '{}'::jsonb,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Biomechanical measurements
CREATE TABLE IF NOT EXISTS pra_measurements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES pra_assessments(id) ON DELETE CASCADE,
    measurement_type TEXT NOT NULL,
    value DECIMAL(10, 3) NOT NULL,
    unit TEXT NOT NULL,
    confidence DECIMAL(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
    view_type TEXT CHECK (view_type IN ('front', 'side', 'back')),
    landmarks JSONB, -- MediaPipe landmarks used
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Postural patterns detected
CREATE TABLE IF NOT EXISTS pra_postural_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES pra_assessments(id) ON DELETE CASCADE,
    pattern_type TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe')),
    confidence DECIMAL(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
    affected_regions TEXT[],
    clinical_significance TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Exercise prescriptions
CREATE TABLE IF NOT EXISTS pra_exercise_prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES pra_assessments(id) ON DELETE CASCADE,
    prescribed_by UUID REFERENCES pra_clinicians(id),
    prescription_date DATE DEFAULT CURRENT_DATE,
    sessions_per_week INTEGER DEFAULT 3,
    duration_weeks INTEGER DEFAULT 6,
    status TEXT CHECK (status IN ('active', 'completed', 'discontinued')) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Individual exercises in prescription
CREATE TABLE IF NOT EXISTS pra_prescribed_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID REFERENCES pra_exercise_prescriptions(id) ON DELETE CASCADE,
    exercise_category TEXT CHECK (exercise_category IN ('release', 'reset', 'rebuild')),
    exercise_name TEXT NOT NULL,
    sets INTEGER,
    reps INTEGER,
    hold_seconds INTEGER,
    frequency_per_day INTEGER DEFAULT 1,
    video_url TEXT,
    instructions TEXT,
    contraindications TEXT[],
    sort_order INTEGER DEFAULT 0
);

-- Red flags and safety alerts
CREATE TABLE IF NOT EXISTS pra_safety_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES pra_patients(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES pra_assessments(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('warning', 'urgent', 'emergency')),
    description TEXT NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    acknowledged_by UUID REFERENCES pra_clinicians(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    action_taken TEXT
);

-- Audit log for HIPAA compliance
CREATE TABLE IF NOT EXISTS pra_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    user_type TEXT CHECK (user_type IN ('clinician', 'system', 'patient')),
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_pra_patients_clinic ON pra_patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_pra_patients_hashed_email ON pra_patients(hashed_email);
CREATE INDEX IF NOT EXISTS idx_pra_assessments_patient ON pra_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_pra_assessments_clinician ON pra_assessments(clinician_id);
CREATE INDEX IF NOT EXISTS idx_pra_assessments_status ON pra_assessments(status);
CREATE INDEX IF NOT EXISTS idx_pra_measurements_assessment ON pra_measurements(assessment_id);
CREATE INDEX IF NOT EXISTS idx_pra_patterns_assessment ON pra_postural_patterns(assessment_id);
CREATE INDEX IF NOT EXISTS idx_pra_audit_created ON pra_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_pra_audit_user ON pra_audit_logs(user_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE pra_clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_clinicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_assessment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_postural_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_exercise_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_prescribed_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_safety_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_audit_logs ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (expand based on your auth strategy)
-- Example: Clinicians can only see their clinic's data
CREATE POLICY clinic_isolation ON pra_patients
    FOR ALL
    USING (clinic_id IN (
        SELECT clinic_id FROM pra_clinicians 
        WHERE id = auth.uid()
    ));

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION pra_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_pra_clinics_updated_at
    BEFORE UPDATE ON pra_clinics
    FOR EACH ROW
    EXECUTE FUNCTION pra_update_updated_at();

CREATE TRIGGER update_pra_clinicians_updated_at
    BEFORE UPDATE ON pra_clinicians
    FOR EACH ROW
    EXECUTE FUNCTION pra_update_updated_at();

CREATE TRIGGER update_pra_patients_updated_at
    BEFORE UPDATE ON pra_patients
    FOR EACH ROW
    EXECUTE FUNCTION pra_update_updated_at();

CREATE TRIGGER update_pra_assessments_updated_at
    BEFORE UPDATE ON pra_assessments
    FOR EACH ROW
    EXECUTE FUNCTION pra_update_updated_at();

-- Audit logging trigger
CREATE OR REPLACE FUNCTION pra_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO pra_audit_logs (
        user_id,
        user_type,
        action,
        resource_type,
        resource_id,
        details
    ) VALUES (
        auth.uid(),
        'clinician',
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object(
            'table', TG_TABLE_NAME,
            'operation', TG_OP,
            'timestamp', CURRENT_TIMESTAMP
        )
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_pra_patients
    AFTER INSERT OR UPDATE OR DELETE ON pra_patients
    FOR EACH ROW
    EXECUTE FUNCTION pra_audit_trigger();

CREATE TRIGGER audit_pra_assessments
    AFTER INSERT OR UPDATE OR DELETE ON pra_assessments
    FOR EACH ROW
    EXECUTE FUNCTION pra_audit_trigger();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Generate patient code
CREATE OR REPLACE FUNCTION pra_generate_patient_code()
RETURNS TEXT AS $$
BEGIN
    RETURN 'PT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
END;
$$ LANGUAGE plpgsql;

-- Hash email for lookups
CREATE OR REPLACE FUNCTION pra_hash_email(email TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(digest(LOWER(email), 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default clinic for testing
INSERT INTO pra_clinics (name, subdomain)
VALUES ('Two Tonys Treatment Clinic', 'twotonys')
ON CONFLICT (subdomain) DO NOTHING;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON SCHEMA posture_rehab IS 'Posture Rehab App schema - isolated from other projects';
COMMENT ON TABLE pra_patients IS 'Patient records with encrypted PHI';
COMMENT ON TABLE pra_assessments IS 'Posture assessment sessions';
COMMENT ON TABLE pra_measurements IS 'Biomechanical measurements from MediaPipe analysis';
COMMENT ON TABLE pra_audit_logs IS 'HIPAA compliance audit trail';
COMMENT ON FUNCTION pra_encrypt IS 'Encrypts sensitive data - replace key in production';
COMMENT ON FUNCTION pra_decrypt IS 'Decrypts sensitive data - use with caution';