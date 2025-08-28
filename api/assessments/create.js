// Create new assessment endpoint
// POST /api/assessments/create

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://anxeptegnpfroajjzuqk.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      patientId, 
      assessmentType = 'clinical',
      notes,
      clinicianId 
    } = req.body;

    // Validate required fields
    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    // Validate assessment type
    const validTypes = ['quick', 'clinical', 'advanced'];
    if (!validTypes.includes(assessmentType)) {
      return res.status(400).json({ 
        error: 'Invalid assessment type',
        validTypes 
      });
    }

    // Use test clinician if not provided
    const assessorId = clinicianId || 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    // Create assessment
    const { data: assessment, error: assessmentError } = await supabase
      .from('pra_assessments')
      .insert({
        patient_id: patientId,
        clinician_id: assessorId,
        assessment_type: assessmentType,
        notes: notes || '',
        status: 'draft'
      })
      .select()
      .single();

    if (assessmentError) throw assessmentError;

    // Log for audit trail
    await supabase.from('pra_audit_logs').insert({
      user_id: assessorId,
      action: 'CREATE_ASSESSMENT',
      resource_type: 'assessment',
      resource_id: assessment.id,
      details: { 
        patient_id: patientId,
        assessment_type: assessmentType
      }
    });

    res.status(200).json({ 
      success: true,
      assessment: {
        id: assessment.id,
        patientId: assessment.patient_id,
        assessmentType: assessment.assessment_type,
        status: assessment.status,
        createdAt: assessment.created_at
      },
      message: 'Assessment created successfully'
    });
  } catch (error) {
    console.error('Error creating assessment:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      hint: error.code === '23503' ? 'Patient not found' : undefined
    });
  }
}