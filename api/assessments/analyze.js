// Store posture analysis results endpoint
// POST /api/assessments/analyze

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
    const { assessmentId, measurements, patterns, overallScore } = req.body;

    // Validate required fields
    if (!assessmentId) {
      return res.status(400).json({ error: 'Assessment ID is required' });
    }

    if (!measurements || !Array.isArray(measurements)) {
      return res.status(400).json({ error: 'Measurements array is required' });
    }

    // Store all measurements
    const measurementPromises = measurements.map(m => 
      supabase.from('pra_measurements').insert({
        assessment_id: assessmentId,
        measurement_type: m.type || m.name, // Support both formats
        value: m.value,
        unit: m.unit || 'degrees', // Default to degrees
        confidence: m.confidence || 0.85,
        view_type: m.viewType || m.view || null
      })
    );
    
    const measurementResults = await Promise.all(measurementPromises);
    
    // Check for errors
    const measurementErrors = measurementResults.filter(r => r.error);
    if (measurementErrors.length > 0) {
      throw new Error(`Failed to store measurements: ${measurementErrors[0].error.message}`);
    }

    // Store patterns if provided
    if (patterns && Array.isArray(patterns)) {
      const patternPromises = patterns.map(p => 
        supabase.from('pra_measurements').insert({
          assessment_id: assessmentId,
          measurement_type: `pattern_${p.type}`,
          value: p.severity === 'severe' ? 3 : p.severity === 'moderate' ? 2 : 1,
          unit: 'severity',
          confidence: p.confidence || 0.80,
          view_type: 'composite'
        })
      );
      await Promise.all(patternPromises);
    }

    // Store overall score
    if (overallScore !== undefined) {
      await supabase.from('pra_measurements').insert({
        assessment_id: assessmentId,
        measurement_type: 'overall_score',
        value: overallScore,
        unit: 'percentage',
        confidence: 1.0,
        view_type: 'composite'
      });
    }

    // Update assessment status to complete
    const { error: updateError } = await supabase
      .from('pra_assessments')
      .update({ 
        status: 'complete',
        completed_at: new Date().toISOString()
      })
      .eq('id', assessmentId);

    if (updateError) throw updateError;

    // Get assessment details for audit
    const { data: assessment } = await supabase
      .from('pra_assessments')
      .select('patient_id, clinician_id')
      .eq('id', assessmentId)
      .single();

    // Log for audit trail
    await supabase.from('pra_audit_logs').insert({
      user_id: assessment?.clinician_id || 'system',
      action: 'COMPLETE_ANALYSIS',
      resource_type: 'assessment',
      resource_id: assessmentId,
      details: { 
        measurement_count: measurements.length,
        pattern_count: patterns?.length || 0,
        overall_score: overallScore
      }
    });

    res.status(200).json({ 
      success: true,
      assessmentId,
      measurementCount: measurements.length,
      message: 'Analysis results stored successfully'
    });
  } catch (error) {
    console.error('Error storing analysis:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}