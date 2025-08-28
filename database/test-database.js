#!/usr/bin/env node

/**
 * Database Test Script
 * Verifies that the Posture Rehab App schema is properly set up
 */

const { createClient } = require('@supabase/supabase-js');

// Use environment variables or defaults
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://anxeptegnpfroajjzuqk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFueGVwdGVnbnBmcm9hamp6dXFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDcxOTY2MCwiZXhwIjoyMDY2Mjk1NjYwfQ.Em6tTSQICYvQALAg1WlAjYoiQjGk2nYJSweSfkg1plQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  console.log('🧪 Testing Posture Rehab App Database...\n');
  
  const tables = [
    'pra_clinics',
    'pra_clinicians',
    'pra_patients',
    'pra_assessments',
    'pra_measurements',
    'pra_exercise_prescriptions',
    'pra_audit_logs'
  ];
  
  let allTablesExist = true;
  
  // Test each table
  for (const table of tables) {
    process.stdout.write(`Checking ${table}... `);
    
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log('❌ Not found');
        allTablesExist = false;
      } else {
        console.log(`✅ Found (${count || 0} records)`);
      }
    } catch (err) {
      console.log('❌ Error:', err.message);
      allTablesExist = false;
    }
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  if (!allTablesExist) {
    console.log('⚠️  Some tables are missing!');
    console.log('\nTo set up the database:');
    console.log('1. Go to https://anxeptegnpfroajjzuqk.supabase.co');
    console.log('2. Click on "SQL Editor" in the sidebar');
    console.log('3. Click "New query"');
    console.log('4. Copy ALL contents from database/quick-setup.sql');
    console.log('5. Paste and click "Run"');
    console.log('\nThe schema file is located at:');
    console.log('database/quick-setup.sql');
    return;
  }
  
  console.log('✅ All tables exist!\n');
  
  // Test creating a patient
  console.log('Testing database operations...\n');
  
  try {
    // Create a test patient
    const testPatientName = `Test Patient ${Date.now()}`;
    const { data: patient, error: patientError } = await supabase
      .from('pra_patients')
      .insert({
        clinic_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: testPatientName,
        email: `test${Date.now()}@test.com`,
        created_by: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      })
      .select()
      .single();
    
    if (patientError) {
      console.log('❌ Could not create test patient:', patientError.message);
    } else {
      console.log('✅ Successfully created test patient');
      console.log(`   ID: ${patient.id}`);
      console.log(`   Code: ${patient.patient_code}`);
      
      // Clean up
      await supabase
        .from('pra_patients')
        .delete()
        .eq('id', patient.id);
      console.log('✅ Cleaned up test data');
    }
  } catch (err) {
    console.log('❌ Error testing operations:', err.message);
  }
  
  console.log('\n🎉 Database is ready for use!');
  console.log('\nYou can now:');
  console.log('1. Open http://localhost:8000/test-backend.html');
  console.log('2. Test the API endpoints');
  console.log('3. Start building the frontend integration');
}

// Run the test
testDatabase().catch(console.error);