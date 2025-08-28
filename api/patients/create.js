// Create new patient endpoint
// POST /api/patients/create

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
    const { name, email, phone, dateOfBirth, clinicianId } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Patient name is required' });
    }

    // Use test clinic and clinician if not provided
    const clinicId = req.body.clinicId || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // Test clinic
    const createdBy = clinicianId || 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // Test clinician

    // Create patient with auto-generated code
    const { data: patient, error: patientError } = await supabase
      .from('pra_patients')
      .insert({
        clinic_id: clinicId,
        name,
        email,
        phone,
        date_of_birth: dateOfBirth,
        created_by: createdBy
      })
      .select()
      .single();

    if (patientError) throw patientError;

    // Log for audit trail
    await supabase.from('pra_audit_logs').insert({
      user_id: createdBy,
      action: 'CREATE_PATIENT',
      resource_type: 'patient',
      resource_id: patient.id,
      details: { 
        patient_name: name,
        clinic_id: clinicId
      }
    });

    res.status(200).json({ 
      success: true,
      patient: {
        id: patient.id,
        patientCode: patient.patient_code,
        name: patient.name,
        email: patient.email,
        createdAt: patient.created_at
      },
      message: 'Patient created successfully'
    });
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      hint: error.code === '23505' ? 'A patient with this email already exists' : undefined
    });
  }
}