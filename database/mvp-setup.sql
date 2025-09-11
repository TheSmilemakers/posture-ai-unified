-- MVP Setup Script for Posture Rehab App (Enhanced Quick Setup)
-- Run this in your Supabase SQL editor to create all tables for MVP
-- All tables are prefixed with pra_ to avoid conflicts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- MVP TABLES (Plain text fields for development)
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

-- Patients table (ENHANCED for MVP with complaints field)
CREATE TABLE IF NOT EXISTS pra_patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES pra_clinics(id),
    patient_code TEXT UNIQUE DEFAULT 'PT-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    date_of_birth DATE,
    complaints TEXT,  -- MVP: Chief complaints field added
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
-- RLS POLICIES (Basic for MVP)
-- =====================================================

-- Enable RLS
ALTER TABLE pra_clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_clinicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_exercise_prescriptions ENABLE ROW LEVEL SECURITY;

-- For MVP testing: Allow all authenticated and anon users access
-- In production, replace with proper policies

-- Drop existing policies if they exist (safe to run multiple times)
DROP POLICY IF EXISTS "MVP_allow_all_authenticated" ON pra_clinics;
DROP POLICY IF EXISTS "MVP_allow_all_authenticated" ON pra_clinicians;
DROP POLICY IF EXISTS "MVP_allow_all_authenticated" ON pra_patients;
DROP POLICY IF EXISTS "MVP_allow_all_authenticated" ON pra_assessments;
DROP POLICY IF EXISTS "MVP_allow_all_authenticated" ON pra_measurements;
DROP POLICY IF EXISTS "MVP_allow_all_authenticated" ON pra_exercise_prescriptions;
DROP POLICY IF EXISTS "MVP_allow_anon_read_write" ON pra_clinics;
DROP POLICY IF EXISTS "MVP_allow_anon_read_write" ON pra_clinicians;
DROP POLICY IF EXISTS "MVP_allow_anon_read_write" ON pra_patients;
DROP POLICY IF EXISTS "MVP_allow_anon_read_write" ON pra_assessments;
DROP POLICY IF EXISTS "MVP_allow_anon_read_write" ON pra_measurements;

-- Create policies (will work on all PostgreSQL versions)
CREATE POLICY "MVP_allow_all_authenticated" ON pra_clinics
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "MVP_allow_all_authenticated" ON pra_clinicians
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "MVP_allow_all_authenticated" ON pra_patients
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "MVP_allow_all_authenticated" ON pra_assessments
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "MVP_allow_all_authenticated" ON pra_measurements
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "MVP_allow_all_authenticated" ON pra_exercise_prescriptions
    FOR ALL USING (auth.role() = 'authenticated');

-- Allow read/write for anon users (for MVP testing)
CREATE POLICY "MVP_allow_anon_read_write" ON pra_clinics
    FOR ALL USING (auth.role() = 'anon');

CREATE POLICY "MVP_allow_anon_read_write" ON pra_clinicians
    FOR ALL USING (auth.role() = 'anon');
    
CREATE POLICY "MVP_allow_anon_read_write" ON pra_patients
    FOR ALL USING (auth.role() = 'anon');

CREATE POLICY "MVP_allow_anon_read_write" ON pra_assessments
    FOR ALL USING (auth.role() = 'anon');

CREATE POLICY "MVP_allow_anon_read_write" ON pra_measurements
    FOR ALL USING (auth.role() = 'anon');

-- =====================================================
-- TEST DATA (MVP)
-- =====================================================

-- Insert test clinic
INSERT INTO pra_clinics (id, name)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Two Tonys Treatment Clinic - MVP Test')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Insert test clinician
INSERT INTO pra_clinicians (id, clinic_id, email, name)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'test@twotonysclinic.com',
    'Test Clinician - MVP'
)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email;

-- =====================================================
-- HELPER FUNCTIONS (Enhanced for MVP)
-- =====================================================

-- Function to create test patient with complaints
CREATE OR REPLACE FUNCTION pra_create_test_patient_with_complaints(
    patient_name TEXT DEFAULT 'Test Patient',
    patient_complaints TEXT DEFAULT 'Test complaints for MVP'
)
RETURNS UUID AS $$
DECLARE
    new_patient_id UUID;
BEGIN
    INSERT INTO pra_patients (
        clinic_id, 
        name, 
        email, 
        complaints,  -- MVP: Include complaints
        date_of_birth,
        created_by
    ) VALUES (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        patient_name,
        LOWER(REPLACE(patient_name, ' ', '.')) || '@test.com',
        patient_complaints,
        '1990-01-01'::DATE,  -- Default test DOB
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
    DELETE FROM pra_exercise_prescriptions WHERE assessment_id IN (
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
    RAISE NOTICE '🚀 MVP Posture Rehab App database setup complete!';
    RAISE NOTICE 'All tables are prefixed with pra_ to avoid conflicts.';
    RAISE NOTICE '✅ Added complaints field to pra_patients for MVP';
    RAISE NOTICE 'Test clinic ID: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    RAISE NOTICE 'Test clinician ID: b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    RAISE NOTICE '';
    RAISE NOTICE 'MVP Test commands:';
    RAISE NOTICE '  Create test patient: SELECT pra_create_test_patient_with_complaints(''John Doe'', ''Neck pain and forward head posture'');';
    RAISE NOTICE '  Clean test data: SELECT pra_clean_test_data();';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Next steps:';
    RAISE NOTICE '1. Test database connection at your app URL/api/test-db';
    RAISE NOTICE '2. Create patient with Name, DOB, and Chief Complaints';
    RAISE NOTICE '3. Verify complete workflow works end-to-end';
END;
$$;