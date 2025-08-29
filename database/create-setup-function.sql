-- Create a setup function that can be called via RPC
-- Run this FIRST in Supabase Dashboard, then you can call it via API

CREATE OR REPLACE FUNCTION pra_setup_schema()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    table_count INT;
BEGIN
    -- Check if tables already exist
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE 'pra_%';
    
    IF table_count > 0 THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Schema already exists',
            'table_count', table_count
        );
    END IF;
    
    -- Create tables
    CREATE TABLE IF NOT EXISTS pra_clinics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pra_clinicians (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        clinic_id UUID REFERENCES pra_clinics(id),
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'clinician',
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

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

    CREATE TABLE IF NOT EXISTS pra_exercise_prescriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        assessment_id UUID REFERENCES pra_assessments(id),
        exercises JSONB NOT NULL,
        prescribed_by UUID REFERENCES pra_clinicians(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pra_audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID,
        action TEXT NOT NULL,
        resource_type TEXT,
        resource_id UUID,
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_pra_patients_clinic ON pra_patients(clinic_id);
    CREATE INDEX IF NOT EXISTS idx_pra_assessments_patient ON pra_assessments(patient_id);
    CREATE INDEX IF NOT EXISTS idx_pra_measurements_assessment ON pra_measurements(assessment_id);
    
    -- Enable RLS
    ALTER TABLE pra_clinics ENABLE ROW LEVEL SECURITY;
    ALTER TABLE pra_clinicians ENABLE ROW LEVEL SECURITY;
    ALTER TABLE pra_patients ENABLE ROW LEVEL SECURITY;
    ALTER TABLE pra_assessments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE pra_measurements ENABLE ROW LEVEL SECURITY;
    ALTER TABLE pra_exercise_prescriptions ENABLE ROW LEVEL SECURITY;
    
    -- Basic RLS policies
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
    
    -- Public read for anon users
    CREATE POLICY "Allow read for anon users" ON pra_clinics
        FOR SELECT USING (auth.role() = 'anon');
        
    -- Insert test data
    INSERT INTO pra_clinics (id, name)
    VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Two Tonys Treatment Clinic - Test')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO pra_clinicians (id, clinic_id, email, name)
    VALUES (
        'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'test@twotonysclinic.com',
        'Test Clinician'
    )
    ON CONFLICT DO NOTHING;
    
    -- Count tables again
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE 'pra_%';
    
    RETURN json_build_object(
        'success', true,
        'message', 'Schema created successfully',
        'table_count', table_count,
        'test_clinic_id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'test_clinician_id', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Error creating schema',
        'error', SQLERRM
    );
END;
$$;