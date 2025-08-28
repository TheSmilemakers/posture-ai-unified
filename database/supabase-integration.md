# Supabase Integration Guide for Posture Rehab App

This guide helps you set up the backend database for your Posture Rehab AI app using your existing Supabase project.

## 🚀 Quick Start

### 1. Run the Database Schema

1. Go to your Supabase Dashboard: https://anxeptegnpfroajjzuqk.supabase.co
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy the entire contents of `database/quick-setup.sql`
5. Paste and click **Run**

You should see success messages confirming table creation.

### 2. Verify Tables Were Created

In the Supabase Dashboard:
1. Go to **Table Editor**
2. You should see these new tables (all prefixed with `pra_`):
   - `pra_clinics`
   - `pra_clinicians`
   - `pra_patients`
   - `pra_assessments`
   - `pra_measurements`
   - `pra_exercise_prescriptions`
   - `pra_audit_logs`

### 3. Test with Sample Data

Run this in the SQL editor to create a test patient:
```sql
SELECT pra_create_test_patient('John Doe');
```

## 🔐 Environment Variables for Your App

Add these to your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://anxeptegnpfroajjzuqk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFueGVwdGVnbnBmcm9hamp6dXFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MTk2NjAsImV4cCI6MjA2NjI5NTY2MH0.b9K5TLQN9yIky1EgHODL4oKNmdugnq_66WK_8zkA1iA
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFueGVwdGVnbnBmcm9hamp6dXFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDcxOTY2MCwiZXhwIjoyMDY2Mjk1NjYwfQ.Em6tTSQICYvQALAg1WlAjYoiQjGk2nYJSweSfkg1plQ
```

## 📁 API Structure for Vercel Functions

Create these API endpoints in your `posture-ai-unified/api/` directory:

### Basic API Structure
```
api/
├── auth/
│   ├── login.js         # Clinician login
│   └── logout.js        # Session management
├── patients/
│   ├── create.js        # Create new patient
│   ├── [id].js         # Get/update patient
│   └── list.js         # List clinic's patients
├── assessments/
│   ├── create.js        # Start new assessment
│   ├── [id].js         # Get/update assessment
│   └── analyze.js       # Process MediaPipe data
├── measurements/
│   └── create.js        # Store measurements
└── reports/
    └── generate.js      # Create PDF reports
```

## 🔗 Integration Examples

### Example 1: Create Patient (Vercel Function)
```javascript
// api/patients/create.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, clinicianId } = req.body;
    
    // Create patient with auto-generated code
    const { data, error } = await supabase
      .from('pra_patients')
      .insert({
        clinic_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // Test clinic
        name,
        email,
        created_by: clinicianId
      })
      .select()
      .single();

    if (error) throw error;

    // Log for audit
    await supabase.from('pra_audit_logs').insert({
      user_id: clinicianId,
      action: 'CREATE_PATIENT',
      resource_type: 'patient',
      resource_id: data.id,
      details: { patient_name: name }
    });

    res.status(200).json({ patient: data });
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ error: error.message });
  }
}
```

### Example 2: Store Posture Analysis
```javascript
// api/assessments/analyze.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { assessmentId, measurements, patterns } = req.body;
    
    // Store measurements
    const measurementPromises = measurements.map(m => 
      supabase.from('pra_measurements').insert({
        assessment_id: assessmentId,
        measurement_type: m.type,
        value: m.value,
        unit: m.unit,
        confidence: m.confidence,
        view_type: m.viewType
      })
    );
    
    await Promise.all(measurementPromises);
    
    // Update assessment status
    await supabase
      .from('pra_assessments')
      .update({ 
        status: 'complete',
        completed_at: new Date().toISOString()
      })
      .eq('id', assessmentId);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error storing analysis:', error);
    res.status(500).json({ error: error.message });
  }
}
```

### Example 3: Frontend Integration
```javascript
// In your ui-controller.js
async function saveAssessmentToDatabase(assessmentData) {
  try {
    // Create assessment
    const assessmentRes = await fetch('/api/assessments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: assessmentData.patientId,
        clinicianId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // Test clinician
        assessmentType: assessmentData.type,
        notes: assessmentData.notes
      })
    });
    
    const { assessment } = await assessmentRes.json();
    
    // Store measurements
    await fetch('/api/assessments/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessmentId: assessment.id,
        measurements: assessmentData.measurements,
        patterns: assessmentData.patterns
      })
    });
    
    return assessment.id;
  } catch (error) {
    console.error('Error saving assessment:', error);
    throw error;
  }
}
```

## 🧪 Testing Your Integration

### 1. Test Database Connection
Create a test file `api/test-db.js`:
```javascript
export default async function handler(req, res) {
  try {
    const { data, error } = await supabase
      .from('pra_clinics')
      .select('*');
    
    if (error) throw error;
    
    res.status(200).json({ 
      connected: true, 
      clinics: data 
    });
  } catch (error) {
    res.status(500).json({ 
      connected: false, 
      error: error.message 
    });
  }
}
```

### 2. Test with cURL
```bash
# Test database connection
curl http://localhost:3000/api/test-db

# Create a patient
curl -X POST http://localhost:3000/api/patients/create \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Patient","email":"test@example.com","clinicianId":"b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"}'
```

## 🔒 Security Considerations

### For Testing Phase
- Using simplified schema without encryption
- Basic RLS policies allow authenticated access
- Test data uses @test.com emails

### Before Production
1. Enable proper encryption for PHI
2. Implement strict RLS policies
3. Add comprehensive audit logging
4. Set up proper authentication flow
5. Enable 2FA for clinicians
6. Configure CORS properly
7. Add rate limiting

## 🧹 Cleanup Test Data

To remove all test data:
```sql
SELECT pra_clean_test_data();
```

To completely remove all pra_ tables (careful!):
```sql
DROP SCHEMA IF EXISTS posture_rehab CASCADE;
DROP TABLE IF EXISTS pra_audit_logs CASCADE;
DROP TABLE IF EXISTS pra_prescribed_exercises CASCADE;
DROP TABLE IF EXISTS pra_exercise_prescriptions CASCADE;
DROP TABLE IF EXISTS pra_safety_alerts CASCADE;
DROP TABLE IF EXISTS pra_postural_patterns CASCADE;
DROP TABLE IF EXISTS pra_measurements CASCADE;
DROP TABLE IF EXISTS pra_assessment_photos CASCADE;
DROP TABLE IF EXISTS pra_assessments CASCADE;
DROP TABLE IF EXISTS pra_consent_records CASCADE;
DROP TABLE IF EXISTS pra_patients CASCADE;
DROP TABLE IF EXISTS pra_clinicians CASCADE;
DROP TABLE IF EXISTS pra_clinics CASCADE;
```

## 📚 Next Steps

1. Run the schema in your Supabase project
2. Create the API endpoints in Vercel Functions
3. Update your frontend to call the APIs
4. Test with sample data
5. Implement authentication flow
6. Add proper error handling
7. Enable production security features

## 🆘 Troubleshooting

### Common Issues

1. **"relation does not exist"** - Make sure you ran the schema SQL first
2. **"permission denied"** - Check RLS policies or use service role key
3. **"duplicate key"** - Clear test data with `pra_clean_test_data()`
4. **CORS errors** - Configure Vercel CORS headers properly

### Getting Help

- Supabase Docs: https://supabase.com/docs
- Vercel Functions: https://vercel.com/docs/functions
- Project Issues: Create an issue in your GitHub repo