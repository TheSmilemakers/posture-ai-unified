-- Quick Setup Script for Posture Rehab App
-- Run this in your Supabase SQL editor to create all tables
-- All tables are prefixed with pra_ to avoid conflicts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- SIMPLIFIED TABLES (No encryption for testing)
-- =====================================================

-- Clinics table
CREATE TABLE IF NOT EXISTS pra_clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clinicians table
CREATE TABLE IF NOT EXISTS pra_clinicians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES pra_clinics(id),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'clinician',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patients table
CREATE TABLE IF NOT EXISTS pra_patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES pra_clinics(id),
    patient_code TEXT UNIQUE DEFAULT 'PT-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    date_of_birth DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES pra_clinicians(id)
);

-- Assessments table
CREATE TABLE IF NOT EXISTS pra_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES pra_patients(id),
    clinician_id UUID REFERENCES pra_clinicians(id),
    assessment_type TEXT DEFAULT 'clinical',
    status TEXT DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Measurements table
CREATE TABLE IF NOT EXISTS pra_measurements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES pra_assessments(id),
    measurement_type TEXT NOT NULL,
    value DECIMAL(10, 3) NOT NULL,
    unit TEXT NOT NULL,
    confidence DECIMAL(3, 2),
    view_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercise prescriptions
CREATE TABLE IF NOT EXISTS pra_exercise_prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES pra_assessments(id),
    exercises JSONB NOT NULL,
    prescribed_by UUID REFERENCES pra_clinicians(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS pra_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_pra_patients_clinic ON pra_patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_pra_assessments_patient ON pra_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_pra_measurements_assessment ON pra_measurements(assessment_id);

-- =====================================================
-- RLS POLICIES (Basic)
-- =====================================================

-- Enable RLS
ALTER TABLE pra_clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_clinicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_exercise_prescriptions ENABLE ROW LEVEL SECURITY;

-- For testing: Allow all authenticated users to access all data
-- In production, replace with proper policies
CREATE POLICY "Allow all for authenticated users" ON pra_clinics
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON pra_clinicians
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON pra_patients
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON pra_assessments
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON pra_measurements
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON pra_exercise_prescriptions
    FOR ALL USING (auth.role() = 'authenticated');

-- Public read for anon users (remove in production)
CREATE POLICY "Allow read for anon users" ON pra_clinics
    FOR SELECT USING (auth.role() = 'anon');

-- =====================================================
-- TEST DATA
-- =====================================================

-- Insert test clinic
INSERT INTO pra_clinics (id, name)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Two Tonys Treatment Clinic - Test')
ON CONFLICT DO NOTHING;

-- Insert test clinician
INSERT INTO pra_clinicians (id, clinic_id, email, name)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'test@twotonysclinic.com',
    'Test Clinician'
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to create test patient
CREATE OR REPLACE FUNCTION pra_create_test_patient(
    patient_name TEXT DEFAULT 'Test Patient'
)
RETURNS UUID AS $$
DECLARE
    new_patient_id UUID;
BEGIN
    INSERT INTO pra_patients (
        clinic_id, 
        name, 
        email, 
        created_by
    ) VALUES (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        patient_name,
        LOWER(REPLACE(patient_name, ' ', '.')) || '@test.com',
        'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    ) RETURNING id INTO new_patient_id;
    
    RETURN new_patient_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean test data
CREATE OR REPLACE FUNCTION pra_clean_test_data()
RETURNS VOID AS $$
BEGIN
    DELETE FROM pra_measurements WHERE assessment_id IN (
        SELECT id FROM pra_assessments WHERE patient_id IN (
            SELECT id FROM pra_patients WHERE email LIKE '%@test.com'
        )
    );
    DELETE FROM pra_assessments WHERE patient_id IN (
        SELECT id FROM pra_patients WHERE email LIKE '%@test.com'
    );
    DELETE FROM pra_patients WHERE email LIKE '%@test.com';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Posture Rehab App tables created successfully!';
    RAISE NOTICE 'All tables are prefixed with pra_ to avoid conflicts.';
    RAISE NOTICE 'Test clinic ID: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    RAISE NOTICE 'Test clinician ID: b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    RAISE NOTICE '';
    RAISE NOTICE 'To create a test patient: SELECT pra_create_test_patient(''John Doe'');';
    RAISE NOTICE 'To clean test data: SELECT pra_clean_test_data();';
END;
$$;