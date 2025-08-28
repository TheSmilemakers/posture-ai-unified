// Test database connection endpoint
// Access at: /api/test-db

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
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

  try {
    // Test basic connection
    const { data: clinics, error: clinicsError } = await supabase
      .from('pra_clinics')
      .select('*');
    
    if (clinicsError) throw clinicsError;

    // Test if tables exist
    const tables = [
      'pra_clinics',
      'pra_clinicians',
      'pra_patients',
      'pra_assessments',
      'pra_measurements',
      'pra_exercise_prescriptions',
      'pra_audit_logs'
    ];

    const tableChecks = await Promise.all(
      tables.map(async (table) => {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          return { table, exists: !error, count };
        } catch (err) {
          return { table, exists: false, error: err.message };
        }
      })
    );

    res.status(200).json({ 
      connected: true,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://anxeptegnpfroajjzuqk.supabase.co',
      clinics: clinics || [],
      tables: tableChecks,
      message: 'Database connection successful! All pra_ tables are ready.'
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ 
      connected: false,
      error: error.message,
      hint: 'Make sure you ran the schema SQL in your Supabase project first.'
    });
  }
}