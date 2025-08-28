# Posture Rehab AI - Database Schema Design

## Overview
This document outlines a HIPAA-compliant database schema for the Posture Rehab AI app that can be safely integrated into an existing Supabase project.

## 1. Schema Strategy

### Namespace Approach
All posture app tables will use the prefix `pra_` (Posture Rehab App) to avoid conflicts:
- `pra_patients`
- `pra_assessments`
- `pra_measurements`
- `pra_exercise_prescriptions`
- `pra_audit_logs`

### Schema Organization
```sql
-- Create a separate schema for better organization (optional but recommended)
CREATE SCHEMA IF NOT EXISTS posture_rehab;

-- Set search path to include both schemas
SET search_path TO posture_rehab, public;
```

### Migration Path to Production
1. **Development**: Use prefixed tables in public schema
2. **Staging**: Move to dedicated schema
3. **Production**: Deploy to separate Supabase project or dedicated schema
4. **Migration Script**: Export/import with namespace changes

## 2. Core Tables Schema

### Enable Required Extensions
```sql
-- Enable encryption and UUID extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Encryption Key Management
```sql
-- Create a secure key storage table (for demonstration - use Supabase Vault in production)
CREATE TABLE IF NOT EXISTS pra_encryption_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_name VARCHAR(255) UNIQUE NOT NULL,
    encrypted_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    rotated_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);

-- Insert master encryption key (in production, use Supabase Vault)
-- This is just for testing - NEVER store actual keys in code
INSERT INTO pra_encryption_keys (key_name, encrypted_key) 
VALUES ('pra_master_key', pgp_sym_encrypt('your-32-byte-key-here', 'your-key-encryption-key'));
```

### Patients Table
```sql
CREATE TABLE IF NOT EXISTS pra_patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Encrypted PHI fields
    encrypted_first_name TEXT NOT NULL,
    encrypted_last_name TEXT NOT NULL,
    encrypted_email TEXT NOT NULL,
    encrypted_phone TEXT,
    encrypted_dob TEXT NOT NULL,
    
    -- Non-PHI fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_assessment_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    
    -- Consent tracking
    consent_version VARCHAR(20) NOT NULL,
    consent_date TIMESTAMPTZ NOT NULL,
    consent_ip INET,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    clinic_id UUID, -- For multi-tenant support
    
    -- Search optimization (hashed for privacy)
    email_hash TEXT UNIQUE NOT NULL,
    phone_hash TEXT
);

-- Indexes for performance
CREATE INDEX idx_pra_patients_email_hash ON pra_patients(email_hash);
CREATE INDEX idx_pra_patients_clinic_id ON pra_patients(clinic_id);
CREATE INDEX idx_pra_patients_status ON pra_patients(status);
```

### Assessments Table
```sql
CREATE TABLE IF NOT EXISTS pra_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES pra_patients(id) ON DELETE CASCADE,
    
    -- Assessment metadata
    assessment_type VARCHAR(50) NOT NULL CHECK (assessment_type IN ('initial', 'follow_up', 'discharge')),
    assessment_date TIMESTAMPTZ DEFAULT NOW(),
    
    -- Clinical data
    chief_complaint TEXT,
    pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
    functional_limitations TEXT[],
    red_flags TEXT[],
    
    -- Photo storage (encrypted URLs)
    encrypted_photo_urls JSONB, -- {front: 'encrypted_url', side: 'encrypted_url', back: 'encrypted_url'}
    
    -- Analysis results
    posture_patterns JSONB NOT NULL, -- Detected patterns and confidence scores
    risk_assessment JSONB, -- Risk scores and factors
    clinical_notes TEXT,
    
    -- Metadata
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    analysis_version VARCHAR(20) NOT NULL,
    processing_time_ms INTEGER,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'complete', 'reviewed', 'error')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Audit
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_pra_assessments_patient_id ON pra_assessments(patient_id);
CREATE INDEX idx_pra_assessments_date ON pra_assessments(assessment_date DESC);
CREATE INDEX idx_pra_assessments_status ON pra_assessments(status);
```

### Measurements Table
```sql
CREATE TABLE IF NOT EXISTS pra_measurements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES pra_assessments(id) ON DELETE CASCADE,
    
    -- Measurement data
    measurement_type VARCHAR(100) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    
    -- Clinical significance
    normal_range_min DECIMAL(10,2),
    normal_range_max DECIMAL(10,2),
    clinical_significance VARCHAR(50) CHECK (clinical_significance IN ('normal', 'mild', 'moderate', 'severe')),
    
    -- Confidence and accuracy
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    measurement_error DECIMAL(10,2),
    
    -- Metadata
    landmark_data JSONB, -- Raw MediaPipe data
    calculation_method VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pra_measurements_assessment_id ON pra_measurements(assessment_id);
CREATE INDEX idx_pra_measurements_type ON pra_measurements(measurement_type);
```

### Exercise Prescriptions Table
```sql
CREATE TABLE IF NOT EXISTS pra_exercise_prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES pra_assessments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES pra_patients(id) ON DELETE CASCADE,
    
    -- Prescription details
    prescription_date TIMESTAMPTZ DEFAULT NOW(),
    prescribed_by UUID REFERENCES auth.users(id),
    
    -- Exercise program
    exercises JSONB NOT NULL, -- Array of exercise objects with sets, reps, frequency
    protocol_type VARCHAR(50) NOT NULL, -- '3R', 'custom', etc.
    phase VARCHAR(20) CHECK (phase IN ('release', 'reset', 'rebuild', 'all')),
    
    -- Duration and compliance
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    frequency_per_week INTEGER NOT NULL,
    
    -- Contraindications and precautions
    contraindications TEXT[],
    precautions TEXT[],
    special_instructions TEXT,
    
    -- Progress tracking
    compliance_rate DECIMAL(3,2),
    last_performed_date DATE,
    patient_feedback JSONB,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'discontinued')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pra_prescriptions_patient_id ON pra_exercise_prescriptions(patient_id);
CREATE INDEX idx_pra_prescriptions_assessment_id ON pra_exercise_prescriptions(assessment_id);
CREATE INDEX idx_pra_prescriptions_status ON pra_exercise_prescriptions(status);
```

### Audit Logs Table
```sql
CREATE TABLE IF NOT EXISTS pra_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Action details
    action_type VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    
    -- User and session info
    user_id UUID REFERENCES auth.users(id),
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Change tracking
    old_values JSONB,
    new_values JSONB,
    
    -- PHI access tracking
    accessed_phi BOOLEAN DEFAULT false,
    phi_fields TEXT[],
    access_reason TEXT,
    
    -- Clinical significance
    is_clinical_action BOOLEAN DEFAULT false,
    clinical_impact VARCHAR(50),
    
    -- Metadata
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    additional_context JSONB
);

-- Indexes
CREATE INDEX idx_pra_audit_user_id ON pra_audit_logs(user_id);
CREATE INDEX idx_pra_audit_timestamp ON pra_audit_logs(timestamp DESC);
CREATE INDEX idx_pra_audit_table_record ON pra_audit_logs(table_name, record_id);
CREATE INDEX idx_pra_audit_phi ON pra_audit_logs(accessed_phi) WHERE accessed_phi = true;
```

### Consent Records Table
```sql
CREATE TABLE IF NOT EXISTS pra_consent_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES pra_patients(id) ON DELETE CASCADE,
    
    -- Consent details
    consent_type VARCHAR(100) NOT NULL,
    consent_version VARCHAR(20) NOT NULL,
    consent_text TEXT NOT NULL,
    
    -- Agreement tracking
    agreed BOOLEAN NOT NULL,
    agreed_at TIMESTAMPTZ NOT NULL,
    
    -- Verification
    verification_method VARCHAR(50) NOT NULL, -- 'electronic', 'verbal', 'written'
    ip_address INET,
    user_agent TEXT,
    
    -- Witness info (if applicable)
    witness_name TEXT,
    witness_signature TEXT,
    
    -- Revocation
    revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pra_consent_patient_id ON pra_consent_records(patient_id);
CREATE INDEX idx_pra_consent_type ON pra_consent_records(consent_type);
```

## 3. Security Implementation

### Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE pra_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_exercise_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_consent_records ENABLE ROW LEVEL SECURITY;

-- Patients table policies
CREATE POLICY "Clinicians can view their clinic's patients" ON pra_patients
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM pra_user_clinics 
            WHERE clinic_id = pra_patients.clinic_id
        )
    );

CREATE POLICY "Clinicians can create patients in their clinic" ON pra_patients
    FOR INSERT WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM pra_user_clinics 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Clinicians can update their clinic's patients" ON pra_patients
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM pra_user_clinics 
            WHERE clinic_id = pra_patients.clinic_id
        )
    );

-- Assessments table policies
CREATE POLICY "Clinicians can view assessments for their patients" ON pra_assessments
    FOR SELECT USING (
        patient_id IN (
            SELECT id FROM pra_patients 
            WHERE clinic_id IN (
                SELECT clinic_id FROM pra_user_clinics 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Clinicians can create assessments for their patients" ON pra_assessments
    FOR INSERT WITH CHECK (
        patient_id IN (
            SELECT id FROM pra_patients 
            WHERE clinic_id IN (
                SELECT clinic_id FROM pra_user_clinics 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Audit logs policies (read-only for compliance officers)
CREATE POLICY "Compliance officers can view all audit logs" ON pra_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pra_user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'compliance_officer'
        )
    );

CREATE POLICY "System can insert audit logs" ON pra_audit_logs
    FOR INSERT WITH CHECK (true); -- Handled by service role
```

### Encryption Functions

```sql
-- Function to encrypt PHI
CREATE OR REPLACE FUNCTION pra_encrypt_phi(plain_text TEXT)
RETURNS TEXT AS $$
DECLARE
    encryption_key TEXT;
BEGIN
    -- Get active encryption key (simplified for example)
    SELECT pgp_sym_decrypt(encrypted_key::bytea, 'your-key-encryption-key') 
    INTO encryption_key
    FROM pra_encryption_keys 
    WHERE key_name = 'pra_master_key' AND is_active = true
    LIMIT 1;
    
    RETURN pgp_sym_encrypt(plain_text, encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt PHI
CREATE OR REPLACE FUNCTION pra_decrypt_phi(encrypted_text TEXT)
RETURNS TEXT AS $$
DECLARE
    encryption_key TEXT;
BEGIN
    -- Get active encryption key
    SELECT pgp_sym_decrypt(encrypted_key::bytea, 'your-key-encryption-key') 
    INTO encryption_key
    FROM pra_encryption_keys 
    WHERE key_name = 'pra_master_key' AND is_active = true
    LIMIT 1;
    
    RETURN pgp_sym_decrypt(encrypted_text::bytea, encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to hash emails/phones for searching
CREATE OR REPLACE FUNCTION pra_hash_identifier(identifier TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(sha256((identifier || 'pra-salt-2024')::bytea), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Audit Trigger

```sql
-- Generic audit trigger function
CREATE OR REPLACE FUNCTION pra_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[];
    phi_fields TEXT[] := ARRAY['encrypted_first_name', 'encrypted_last_name', 'encrypted_email', 'encrypted_phone', 'encrypted_dob'];
    accessed_phi_fields TEXT[];
BEGIN
    -- Determine old and new data
    IF TG_OP = 'DELETE' THEN
        old_data = to_jsonb(OLD);
        new_data = NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        old_data = to_jsonb(OLD);
        new_data = to_jsonb(NEW);
        
        -- Find changed fields
        SELECT array_agg(key) INTO changed_fields
        FROM jsonb_each(old_data)
        WHERE old_data->key IS DISTINCT FROM new_data->key;
    ELSE -- INSERT
        old_data = NULL;
        new_data = to_jsonb(NEW);
    END IF;
    
    -- Check if PHI was accessed
    IF TG_OP = 'UPDATE' THEN
        accessed_phi_fields = changed_fields && phi_fields;
    END IF;
    
    -- Insert audit log
    INSERT INTO pra_audit_logs (
        action_type,
        table_name,
        record_id,
        user_id,
        old_values,
        new_values,
        accessed_phi,
        phi_fields,
        is_clinical_action
    ) VALUES (
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        auth.uid(),
        old_data,
        new_data,
        array_length(accessed_phi_fields, 1) > 0,
        accessed_phi_fields,
        TG_TABLE_NAME IN ('pra_assessments', 'pra_measurements', 'pra_exercise_prescriptions')
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to all tables
CREATE TRIGGER audit_pra_patients 
    AFTER INSERT OR UPDATE OR DELETE ON pra_patients
    FOR EACH ROW EXECUTE FUNCTION pra_audit_trigger();

CREATE TRIGGER audit_pra_assessments 
    AFTER INSERT OR UPDATE OR DELETE ON pra_assessments
    FOR EACH ROW EXECUTE FUNCTION pra_audit_trigger();

CREATE TRIGGER audit_pra_measurements 
    AFTER INSERT OR UPDATE OR DELETE ON pra_measurements
    FOR EACH ROW EXECUTE FUNCTION pra_audit_trigger();

CREATE TRIGGER audit_pra_exercise_prescriptions 
    AFTER INSERT OR UPDATE OR DELETE ON pra_exercise_prescriptions
    FOR EACH ROW EXECUTE FUNCTION pra_audit_trigger();
```

## 4. Supporting Tables

### User Roles and Permissions
```sql
-- User roles table
CREATE TABLE IF NOT EXISTS pra_user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    role VARCHAR(50) NOT NULL CHECK (role IN ('clinician', 'admin', 'compliance_officer', 'patient')),
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- User-clinic associations for multi-tenancy
CREATE TABLE IF NOT EXISTS pra_user_clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    clinic_id UUID NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, clinic_id)
);

-- Clinics table
CREATE TABLE IF NOT EXISTS pra_clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    encrypted_address TEXT,
    encrypted_phone TEXT,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 5. Views for Simplified Access

### Patient Summary View (with decryption for authorized users)
```sql
CREATE OR REPLACE VIEW pra_patient_summary AS
SELECT 
    p.id,
    pra_decrypt_phi(p.encrypted_first_name) as first_name,
    pra_decrypt_phi(p.encrypted_last_name) as last_name,
    pra_decrypt_phi(p.encrypted_email) as email,
    p.created_at,
    p.last_assessment_date,
    p.status,
    COUNT(DISTINCT a.id) as total_assessments,
    COUNT(DISTINCT ep.id) as active_prescriptions
FROM pra_patients p
LEFT JOIN pra_assessments a ON p.id = a.patient_id
LEFT JOIN pra_exercise_prescriptions ep ON p.id = ep.patient_id AND ep.status = 'active'
GROUP BY p.id;

-- Apply RLS to view
CREATE POLICY "View patient summary" ON pra_patients
    FOR SELECT USING (
        clinic_id IN (
            SELECT clinic_id FROM pra_user_clinics 
            WHERE user_id = auth.uid()
        )
    );
```

## 6. Test Data Generator (Safe PHI-like data)

```sql
-- Function to generate test patients with fake PHI
CREATE OR REPLACE FUNCTION pra_generate_test_patients(num_patients INTEGER)
RETURNS VOID AS $$
DECLARE
    i INTEGER;
    test_first_names TEXT[] := ARRAY['Test_John', 'Test_Jane', 'Test_Bob', 'Test_Alice', 'Test_Charlie'];
    test_last_names TEXT[] := ARRAY['TestSmith', 'TestJohnson', 'TestWilliams', 'TestBrown', 'TestDavis'];
BEGIN
    FOR i IN 1..num_patients LOOP
        INSERT INTO pra_patients (
            encrypted_first_name,
            encrypted_last_name,
            encrypted_email,
            encrypted_dob,
            email_hash,
            consent_version,
            consent_date
        ) VALUES (
            pra_encrypt_phi(test_first_names[1 + (i % 5)]),
            pra_encrypt_phi(test_last_names[1 + (i % 5)]),
            pra_encrypt_phi('testpatient' || i || '@example.com'),
            pra_encrypt_phi('1970-01-01'),
            pra_hash_identifier('testpatient' || i || '@example.com'),
            '1.0',
            NOW()
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to clean test data
CREATE OR REPLACE FUNCTION pra_clean_test_data()
RETURNS VOID AS $$
BEGIN
    -- Delete only test patients (identified by email pattern)
    DELETE FROM pra_patients 
    WHERE pra_decrypt_phi(encrypted_email) LIKE 'testpatient%@example.com';
END;
$$ LANGUAGE plpgsql;
```

## 7. Performance Optimization

### Indexes for Common Queries
```sql
-- Composite indexes for common queries
CREATE INDEX idx_pra_assessments_patient_date ON pra_assessments(patient_id, assessment_date DESC);
CREATE INDEX idx_pra_measurements_assessment_type ON pra_measurements(assessment_id, measurement_type);
CREATE INDEX idx_pra_prescriptions_patient_status ON pra_exercise_prescriptions(patient_id, status);

-- Partial indexes for active records
CREATE INDEX idx_pra_patients_active ON pra_patients(id) WHERE status = 'active';
CREATE INDEX idx_pra_prescriptions_active ON pra_exercise_prescriptions(patient_id) WHERE status = 'active';
```

### Materialized Views for Analytics
```sql
-- Patient progress tracking
CREATE MATERIALIZED VIEW pra_patient_progress AS
SELECT 
    p.patient_id,
    p.assessment_date,
    jsonb_object_agg(m.measurement_type, m.value) as measurements,
    a.posture_patterns,
    a.confidence_score
FROM pra_assessments a
JOIN pra_measurements m ON a.id = m.assessment_id
JOIN pra_patients p ON a.patient_id = p.id
WHERE a.status = 'complete'
GROUP BY p.patient_id, p.assessment_date, a.posture_patterns, a.confidence_score
ORDER BY p.patient_id, p.assessment_date;

-- Refresh strategy
CREATE INDEX idx_pra_progress_patient ON pra_patient_progress(patient_id);
```

## Migration and Cleanup Scripts

### Export to Production
```sql
-- Export schema and data (excluding test data)
-- Run from command line:
-- pg_dump -h localhost -U postgres -d your_db -n posture_rehab -t 'pra_*' -f posture_rehab_export.sql

-- Or create a function to export non-test data
CREATE OR REPLACE FUNCTION pra_export_production_data()
RETURNS TABLE (
    table_name TEXT,
    record_count BIGINT
) AS $$
BEGIN
    -- Create temporary tables with production data only
    CREATE TEMP TABLE prod_patients AS
    SELECT * FROM pra_patients 
    WHERE pra_decrypt_phi(encrypted_email) NOT LIKE 'test%@example.com';
    
    -- Return counts
    RETURN QUERY
    SELECT 'pra_patients'::TEXT, COUNT(*)::BIGINT FROM prod_patients;
END;
$$ LANGUAGE plpgsql;
```

### Cleanup Script
```sql
-- Complete cleanup function
CREATE OR REPLACE FUNCTION pra_cleanup_all()
RETURNS VOID AS $$
BEGIN
    -- Disable triggers temporarily
    SET session_replication_role = replica;
    
    -- Drop all PRA tables in correct order
    DROP TABLE IF EXISTS pra_audit_logs CASCADE;
    DROP TABLE IF EXISTS pra_consent_records CASCADE;
    DROP TABLE IF EXISTS pra_exercise_prescriptions CASCADE;
    DROP TABLE IF EXISTS pra_measurements CASCADE;
    DROP TABLE IF EXISTS pra_assessments CASCADE;
    DROP TABLE IF EXISTS pra_patients CASCADE;
    DROP TABLE IF EXISTS pra_user_clinics CASCADE;
    DROP TABLE IF EXISTS pra_user_roles CASCADE;
    DROP TABLE IF EXISTS pra_clinics CASCADE;
    DROP TABLE IF EXISTS pra_encryption_keys CASCADE;
    
    -- Drop functions
    DROP FUNCTION IF EXISTS pra_encrypt_phi CASCADE;
    DROP FUNCTION IF EXISTS pra_decrypt_phi CASCADE;
    DROP FUNCTION IF EXISTS pra_hash_identifier CASCADE;
    DROP FUNCTION IF EXISTS pra_audit_trigger CASCADE;
    DROP FUNCTION IF EXISTS pra_generate_test_patients CASCADE;
    DROP FUNCTION IF EXISTS pra_clean_test_data CASCADE;
    
    -- Drop views
    DROP VIEW IF EXISTS pra_patient_summary CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS pra_patient_progress CASCADE;
    
    -- Re-enable triggers
    SET session_replication_role = DEFAULT;
END;
$$ LANGUAGE plpgsql;
```