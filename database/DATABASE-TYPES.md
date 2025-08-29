# Posture Rehab AI App - Complete Database Types & Structure

## Overview

The Posture Rehab AI App uses Supabase PostgreSQL with a carefully designed schema for clinical data management. All tables use the `pra_` prefix to ensure isolation in shared Supabase environments.

## Database Tables (11 Total)

### 1. pra_clinics
**Purpose**: Multi-clinic support for enterprise deployments

```sql
CREATE TABLE pra_clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields**:
- `id` (UUID): Unique identifier for each clinic
- `name` (TEXT): Clinic name for display
- `subdomain` (TEXT): Optional subdomain for clinic-specific URLs
- `settings` (JSONB): Flexible configuration storage
  - Example: `{"timezone": "America/New_York", "logo_url": "...", "features": ["advanced_mode"]}`
- `created_at` (TIMESTAMPTZ): Record creation timestamp
- `updated_at` (TIMESTAMPTZ): Last modification timestamp

### 2. pra_clinicians
**Purpose**: Staff management with role-based access control

```sql
CREATE TABLE pra_clinicians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES pra_clinics(id),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'clinician', 'assistant')),
    active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields**:
- `id` (UUID): Unique clinician identifier
- `clinic_id` (UUID): Associated clinic (foreign key)
- `email` (TEXT): Unique email for authentication
- `name` (TEXT): Display name
- `role` (TEXT): Permission level
  - `admin`: Full clinic management
  - `clinician`: Patient assessment and treatment
  - `assistant`: Limited assessment support
- `active` (BOOLEAN): Account status
- `last_login` (TIMESTAMPTZ): Activity tracking
- `created_at`, `updated_at` (TIMESTAMPTZ): Audit timestamps

**Note**: Full HIPAA schema includes `encrypted_name` field for PHI protection

### 3. pra_patients
**Purpose**: Patient record management with privacy protection

```sql
CREATE TABLE pra_patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES pra_clinics(id),
    patient_code TEXT UNIQUE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    date_of_birth DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES pra_clinicians(id)
);
```

**Fields**:
- `id` (UUID): Internal patient identifier
- `clinic_id` (UUID): Clinic association
- `patient_code` (TEXT): Human-readable code (auto-generated like 'PT-12345')
- `name` (TEXT): Patient name (encrypted in production)
- `email` (TEXT): Optional contact email
- `phone` (TEXT): Optional contact phone
- `date_of_birth` (DATE): For age-specific analysis
- `created_at` (TIMESTAMPTZ): Registration date
- `created_by` (UUID): Registering clinician

**Privacy Features**:
- Auto-generated patient codes avoid exposing internal IDs
- Full schema includes encrypted fields for all PHI
- Support for anonymous assessments (null patient_id)

### 4. pra_assessments
**Purpose**: Core assessment session tracking

```sql
CREATE TABLE pra_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES pra_patients(id),
    clinician_id UUID REFERENCES pra_clinicians(id),
    assessment_type TEXT NOT NULL CHECK (assessment_type IN ('quick', 'clinical', 'advanced')),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'complete', 'reviewed')),
    chief_complaint TEXT,
    clinical_notes TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields**:
- `id` (UUID): Unique assessment identifier
- `patient_id` (UUID): Associated patient (nullable for anonymous)
- `clinician_id` (UUID): Conducting clinician
- `assessment_type` (TEXT): Mode of assessment
  - `quick`: Single front view, basic analysis
  - `clinical`: Full workflow with exercise prescription
  - `advanced`: Three views with detailed biomechanics
- `status` (TEXT): Workflow status
  - `draft`: In progress
  - `complete`: Finished assessment
  - `reviewed`: Clinician reviewed and approved
- `chief_complaint` (TEXT): Patient's primary concern
- `clinical_notes` (TEXT): Clinician observations
- `notes` (TEXT): General notes
- `created_at` (TIMESTAMPTZ): Start time
- `completed_at` (TIMESTAMPTZ): Completion time
- `updated_at` (TIMESTAMPTZ): Last modification

### 5. pra_measurements
**Purpose**: Store all biomechanical measurements from MediaPipe analysis

```sql
CREATE TABLE pra_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES pra_assessments(id) ON DELETE CASCADE,
    measurement_type TEXT NOT NULL,
    value DECIMAL(10, 3) NOT NULL,
    unit TEXT NOT NULL,
    confidence DECIMAL(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
    view_type TEXT CHECK (view_type IN ('front', 'side', 'back')),
    landmarks JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields**:
- `id` (UUID): Unique measurement ID
- `assessment_id` (UUID): Parent assessment
- `measurement_type` (TEXT): Type of measurement
  - Examples: 'head_tilt', 'shoulder_level_difference', 'forward_head_distance', 'cobb_angle'
- `value` (DECIMAL): Numeric measurement value (3 decimal precision)
- `unit` (TEXT): Measurement unit ('degrees', 'mm', 'cm', 'ratio')
- `confidence` (DECIMAL): Algorithm confidence (0.00-1.00)
- `view_type` (TEXT): Camera view used
- `landmarks` (JSONB): Raw MediaPipe data
  - Structure: `{"pose": [...33 landmarks], "face": [...], "hands": [...]}`
- `created_at` (TIMESTAMPTZ): Measurement timestamp

**Common Measurement Types**:
```javascript
// Front View
- head_tilt (degrees)
- shoulder_level_difference (mm)
- hip_level_difference (mm)
- q_angle_left/right (degrees)

// Side View  
- forward_head_distance (cm)
- thoracic_kyphosis (degrees)
- lumbar_lordosis (degrees)
- anterior_pelvic_tilt (degrees)

// Back View
- cobb_angle (degrees)
- scapular_asymmetry (mm)
- trunk_rotation (degrees)
```

### 6. pra_postural_patterns
**Purpose**: Clinical pattern detection results

```sql
CREATE TABLE pra_postural_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES pra_assessments(id) ON DELETE CASCADE,
    pattern_type TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe')),
    confidence DECIMAL(3, 2),
    affected_regions TEXT[],
    clinical_significance TEXT,
    detected_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields**:
- `id` (UUID): Pattern record ID
- `assessment_id` (UUID): Parent assessment
- `pattern_type` (TEXT): Detected condition
  - Examples: 'upper_crossed_syndrome', 'lower_crossed_syndrome', 'scoliosis', 'forward_head_posture'
- `severity` (TEXT): Clinical severity rating
- `confidence` (DECIMAL): Detection confidence
- `affected_regions` (TEXT[]): Body regions affected
  - Examples: ['neck', 'upper_back'], ['lower_back', 'hips']
- `clinical_significance` (TEXT): Interpretation notes
- `detected_at` (TIMESTAMPTZ): Detection timestamp

### 7. pra_exercise_prescriptions
**Purpose**: Treatment plan management

```sql
CREATE TABLE pra_exercise_prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES pra_assessments(id),
    prescribed_by UUID REFERENCES pra_clinicians(id),
    exercises JSONB NOT NULL,
    prescription_date DATE DEFAULT CURRENT_DATE,
    sessions_per_week INTEGER DEFAULT 3,
    duration_weeks INTEGER DEFAULT 6,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'discontinued')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields**:
- `id` (UUID): Prescription ID
- `assessment_id` (UUID): Related assessment
- `prescribed_by` (UUID): Prescribing clinician
- `exercises` (JSONB): Exercise details
  ```json
  {
    "release": ["upper_trap_stretch", "pec_stretch"],
    "reset": ["chin_tucks", "wall_angels"],
    "rebuild": ["band_rows", "face_pulls"]
  }
  ```
- `prescription_date` (DATE): Start date
- `sessions_per_week` (INTEGER): Frequency
- `duration_weeks` (INTEGER): Program length
- `status` (TEXT): Prescription status
- `notes` (TEXT): Special instructions
- `created_at` (TIMESTAMPTZ): Creation time

### 8. pra_prescribed_exercises
**Purpose**: Individual exercise details within prescriptions

```sql
CREATE TABLE pra_prescribed_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    sort_order INTEGER
);
```

**Fields**:
- `id` (UUID): Exercise record ID
- `prescription_id` (UUID): Parent prescription
- `exercise_category` (TEXT): 3R protocol phase
- `exercise_name` (TEXT): Exercise identifier
- `sets` (INTEGER): Number of sets
- `reps` (INTEGER): Repetitions per set
- `hold_seconds` (INTEGER): Hold duration for stretches
- `frequency_per_day` (INTEGER): Daily frequency
- `video_url` (TEXT): Instructional video link
- `instructions` (TEXT): Written instructions
- `contraindications` (TEXT[]): Conditions to avoid
- `sort_order` (INTEGER): Display order

### 9. pra_audit_logs
**Purpose**: HIPAA-compliant audit trail

```sql
CREATE TABLE pra_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_type TEXT CHECK (user_type IN ('clinician', 'system', 'patient')),
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields**:
- `id` (UUID): Log entry ID
- `user_id` (UUID): Acting user
- `user_type` (TEXT): User category
- `action` (TEXT): Action performed
  - Examples: 'view_patient', 'create_assessment', 'export_data'
- `resource_type` (TEXT): Affected resource type
- `resource_id` (UUID): Affected resource ID
- `ip_address` (INET): Client IP address
- `user_agent` (TEXT): Browser/client info
- `details` (JSONB): Additional context
- `created_at` (TIMESTAMPTZ): Action timestamp

### 10. pra_safety_alerts
**Purpose**: Clinical safety and red flag tracking

```sql
CREATE TABLE pra_safety_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES pra_patients(id),
    assessment_id UUID REFERENCES pra_assessments(id),
    alert_type TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('warning', 'urgent', 'emergency')),
    description TEXT NOT NULL,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_by UUID REFERENCES pra_clinicians(id),
    acknowledged_at TIMESTAMPTZ,
    action_taken TEXT
);
```

**Fields**:
- `id` (UUID): Alert ID
- `patient_id` (UUID): Affected patient
- `assessment_id` (UUID): Related assessment
- `alert_type` (TEXT): Type of safety concern
  - Examples: 'severe_pain', 'neurological_symptoms', 'red_flag'
- `severity` (TEXT): Urgency level
- `description` (TEXT): Detailed description
- `detected_at` (TIMESTAMPTZ): Detection time
- `acknowledged_by` (UUID): Acknowledging clinician
- `acknowledged_at` (TIMESTAMPTZ): Acknowledgment time
- `action_taken` (TEXT): Resolution description

### 11. pra_consent_records
**Purpose**: Patient consent management

```sql
CREATE TABLE pra_consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES pra_patients(id),
    consent_type TEXT CHECK (consent_type IN ('assessment', 'data_storage', 'research', 'photography')),
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    granted_by UUID REFERENCES pra_clinicians(id),
    ip_address INET,
    user_agent TEXT,
    signature_data TEXT
);
```

**Fields**:
- `id` (UUID): Consent record ID
- `patient_id` (UUID): Consenting patient
- `consent_type` (TEXT): Type of consent
- `granted` (BOOLEAN): Consent status
- `granted_at` (TIMESTAMPTZ): Consent timestamp
- `expires_at` (TIMESTAMPTZ): Expiration date
- `granted_by` (UUID): Witnessing clinician
- `ip_address` (INET): Client IP
- `user_agent` (TEXT): Browser info
- `signature_data` (TEXT): Digital signature

## Indexes

```sql
-- Performance optimization indexes
CREATE INDEX idx_assessments_patient_id ON pra_assessments(patient_id);
CREATE INDEX idx_assessments_clinician_id ON pra_assessments(clinician_id);
CREATE INDEX idx_measurements_assessment_id ON pra_measurements(assessment_id);
CREATE INDEX idx_measurements_type ON pra_measurements(measurement_type);
CREATE INDEX idx_patterns_assessment_id ON pra_postural_patterns(assessment_id);
CREATE INDEX idx_audit_logs_user_id ON pra_audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON pra_audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON pra_audit_logs(created_at);
```

## Helper Functions

### pra_create_test_patient
```sql
CREATE OR REPLACE FUNCTION pra_create_test_patient(patient_name TEXT)
RETURNS UUID AS $$
DECLARE
    new_patient_id UUID;
    test_clinic_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    test_clinician_id UUID := 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
BEGIN
    INSERT INTO pra_patients (clinic_id, patient_code, name, created_by)
    VALUES (
        test_clinic_id,
        'PT-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0'),
        patient_name,
        test_clinician_id
    )
    RETURNING id INTO new_patient_id;
    
    RETURN new_patient_id;
END;
$$ LANGUAGE plpgsql;
```

### pra_clean_test_data
```sql
CREATE OR REPLACE FUNCTION pra_clean_test_data()
RETURNS void AS $$
BEGIN
    DELETE FROM pra_assessments WHERE clinician_id = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    DELETE FROM pra_patients WHERE created_by = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
END;
$$ LANGUAGE plpgsql;
```

## Security Configuration

### Row Level Security (RLS)
All tables have RLS enabled with basic policies:

```sql
-- Enable RLS on all tables
ALTER TABLE pra_clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE pra_clinicians ENABLE ROW LEVEL SECURITY;
-- ... etc for all tables

-- Basic policy example (production requires more sophisticated policies)
CREATE POLICY "Enable all access for authenticated users" ON pra_patients
    FOR ALL USING (auth.role() = 'authenticated');
```

### Encryption Functions (Production Schema)
```sql
-- Example encryption functions for PHI
CREATE OR REPLACE FUNCTION encrypt_pii(data TEXT, key_id TEXT)
RETURNS BYTEA AS $$
BEGIN
    -- Implementation uses pgcrypto or external KMS
    RETURN pgp_sym_encrypt(data, get_encryption_key(key_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_pii(data BYTEA, key_id TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(data, get_encryption_key(key_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## TypeScript Types (Frontend Integration)

```typescript
// Database types for frontend usage
export interface Patient {
    id: string;
    clinic_id: string;
    patient_code: string;
    name: string;
    email?: string;
    phone?: string;
    date_of_birth?: string;
    created_at: string;
    created_by: string;
}

export interface Assessment {
    id: string;
    patient_id?: string;
    clinician_id: string;
    assessment_type: 'quick' | 'clinical' | 'advanced';
    status: 'draft' | 'complete' | 'reviewed';
    chief_complaint?: string;
    clinical_notes?: string;
    notes?: string;
    created_at: string;
    completed_at?: string;
    updated_at: string;
}

export interface Measurement {
    id: string;
    assessment_id: string;
    measurement_type: string;
    value: number;
    unit: string;
    confidence: number;
    view_type?: 'front' | 'side' | 'back';
    landmarks?: any;
    created_at: string;
}

export interface PosturalPattern {
    id: string;
    assessment_id: string;
    pattern_type: string;
    severity: 'mild' | 'moderate' | 'severe';
    confidence: number;
    affected_regions: string[];
    clinical_significance?: string;
    detected_at: string;
}

export interface ExercisePrescription {
    id: string;
    assessment_id: string;
    prescribed_by: string;
    exercises: {
        release: string[];
        reset: string[];
        rebuild: string[];
    };
    prescription_date: string;
    sessions_per_week: number;
    duration_weeks: number;
    status: 'active' | 'completed' | 'discontinued';
    notes?: string;
    created_at: string;
}
```

## Test Data

```sql
-- Pre-configured test data
INSERT INTO pra_clinics (id, name, settings) VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Test Clinic', '{"features": ["all"]}');

INSERT INTO pra_clinicians (id, clinic_id, email, name, role) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'test@clinic.com', 'Test Clinician', 'admin');
```

## Migration Notes

### From MVP to Production
1. Enable field-level encryption for PHI
2. Implement comprehensive RLS policies
3. Add data retention policies
4. Configure automated backups
5. Set up audit log archival
6. Implement key rotation
7. Add performance monitoring

### Compliance Considerations
- All PHI fields must be encrypted at rest
- Audit logs must be immutable
- Data retention per HIPAA guidelines (7 years)
- Regular security audits required
- Access control must follow least privilege
- All timestamps in UTC for consistency

## Performance Considerations

### Query Optimization
- Indexes on all foreign keys
- Composite indexes for common queries
- JSONB GIN indexes for searchable JSON fields
- Partitioning for audit logs (by month)

### Expected Load
- 10,000+ assessments/month
- 500+ concurrent clinicians
- Sub-200ms query response time
- 99.9% uptime requirement

## Integration Points

### API Endpoints
- `/api/patients/*` - Patient management
- `/api/assessments/*` - Assessment operations
- `/api/measurements/*` - Measurement storage
- `/api/reports/*` - Report generation

### External Services
- Supabase Auth for authentication
- Supabase Storage for images/videos
- Vercel Functions for API
- CDN for exercise videos