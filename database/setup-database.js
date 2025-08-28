#!/usr/bin/env node

/**
 * Database Setup Script for Posture Rehab App
 * Runs the schema using Supabase JavaScript client
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://anxeptegnpfroajjzuqk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFueGVwdGVnbnBmcm9hamp6dXFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDcxOTY2MCwiZXhwIjoyMDY2Mjk1NjYwfQ.Em6tTSQICYvQALAg1WlAjYoiQjGk2nYJSweSfkg1plQ';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function runSchema() {
  console.log('🚀 Setting up Posture Rehab App database schema...\n');
  
  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, 'quick-setup.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split into individual statements (simple approach)
    // Note: This is a basic splitter, more complex SQL might need better parsing
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute.\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip comments and empty statements
      if (statement.trim().startsWith('--') || statement.trim().length <= 1) {
        continue;
      }
      
      // Show progress
      process.stdout.write(`Executing statement ${i + 1}/${statements.length}... `);
      
      try {
        // Execute via Supabase RPC (raw SQL execution)
        const { data, error } = await supabase.rpc('execute_sql', {
          query: statement
        });
        
        if (error) {
          // Try direct approach if RPC doesn't exist
          // Note: This won't work with service role key, but worth trying
          console.log('⚠️  Cannot execute raw SQL via client');
          errorCount++;
        } else {
          console.log('✅');
          successCount++;
        }
      } catch (err) {
        console.log('❌');
        console.error(`Error: ${err.message}`);
        errorCount++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    
    if (errorCount > 0) {
      console.log('\n⚠️  Some statements failed. This is normal if:');
      console.log('- Tables already exist');
      console.log('- RLS policies are already in place');
      console.log('- Test data was already inserted');
      console.log('\nFor best results, run the SQL directly in Supabase Dashboard.');
    }
    
    // Test the connection
    console.log('\n🧪 Testing database connection...');
    const { data: clinics, error: testError } = await supabase
      .from('pra_clinics')
      .select('*');
    
    if (testError) {
      console.log('❌ Could not query pra_clinics table');
      console.log('Please run the schema in Supabase Dashboard SQL editor');
    } else {
      console.log('✅ Successfully connected to database!');
      console.log(`Found ${clinics?.length || 0} clinics`);
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Note about Supabase limitations
console.log('⚠️  Note: Supabase JavaScript client cannot execute raw DDL statements.');
console.log('This script will attempt to set up the database, but for best results:');
console.log('1. Go to https://anxeptegnpfroajjzuqk.supabase.co');
console.log('2. Navigate to SQL Editor');
console.log('3. Copy contents of database/quick-setup.sql');
console.log('4. Click Run\n');

console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

setTimeout(() => {
  runSchema();
}, 5000);