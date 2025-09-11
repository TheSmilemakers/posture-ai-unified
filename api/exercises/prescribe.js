/**
 * Exercise Prescription API Endpoint
 * Saves exercise prescriptions to database (replaces console.log placeholders)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Auth check middleware
function checkAuth(req) {
    const authHeader = req.headers.authorization;
    const apiKey = req.query.apiKey;
    
    const validToken = 'Bearer posture-api-2025';
    const validApiKey = 'posture-api-2025';
    
    return (authHeader === validToken) || (apiKey === validApiKey);
}

export default async function handler(req, res) {
    try {
        // Check authentication
        if (!checkAuth(req)) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized - Invalid API key or token'
            });
        }

        if (req.method !== 'POST') {
            return res.status(405).json({
                success: false,
                error: 'Method not allowed. Use POST.'
            });
        }

        const { 
            assessmentId, 
            clinicianId, 
            prescriptionData, 
            sessionsPerWeek = 3, 
            durationWeeks = 6,
            notes = ''
        } = req.body;

        // Validate required fields
        if (!assessmentId || !prescriptionData) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: assessmentId, prescriptionData'
            });
        }

        // Validate prescription data structure
        const { release, reset, rebuild } = prescriptionData;
        if (!release && !reset && !rebuild) {
            return res.status(400).json({
                success: false,
                error: 'Prescription must include at least one category (release, reset, rebuild)'
            });
        }

        try {
            // Start transaction by creating main prescription record
            const { data: prescription, error: prescriptionError } = await supabase
                .from('pra_exercise_prescriptions')
                .insert({
                    assessment_id: assessmentId,
                    prescribed_by: clinicianId || null,
                    sessions_per_week: sessionsPerWeek,
                    duration_weeks: durationWeeks,
                    status: 'active',
                    notes: notes
                })
                .select()
                .single();

            if (prescriptionError) {
                console.error('Failed to create prescription:', prescriptionError);
                throw new Error(`Failed to create prescription: ${prescriptionError.message}`);
            }

            console.log('✅ Created prescription record:', prescription.id);

            // Now insert individual exercises
            const exerciseInserts = [];
            let sortOrder = 0;

            // Process each category
            for (const [category, categoryData] of Object.entries({ release, reset, rebuild })) {
                if (!categoryData || !categoryData.exercises) continue;

                for (const exercise of categoryData.exercises) {
                    exerciseInserts.push({
                        prescription_id: prescription.id,
                        exercise_category: category,
                        exercise_name: exercise.name || exercise.title || 'Unknown Exercise',
                        sets: exercise.sets || null,
                        reps: exercise.reps || null,
                        hold_seconds: exercise.holdSeconds || exercise.duration || null,
                        frequency_per_day: exercise.frequency ? 
                            (typeof exercise.frequency === 'string' ? 
                                parseInt(exercise.frequency.replace(/\D/g, '')) || 1 : exercise.frequency) : 1,
                        video_url: exercise.videoUrl || exercise.video || null,
                        instructions: exercise.instructions || exercise.description || '',
                        contraindications: exercise.contraindications || [],
                        sort_order: sortOrder++
                    });
                }
            }

            // Insert all exercises
            if (exerciseInserts.length > 0) {
                const { data: exercises, error: exerciseError } = await supabase
                    .from('pra_prescribed_exercises')
                    .insert(exerciseInserts)
                    .select();

                if (exerciseError) {
                    console.error('Failed to insert exercises:', exerciseError);
                    // Try to rollback prescription
                    await supabase
                        .from('pra_exercise_prescriptions')
                        .delete()
                        .eq('id', prescription.id);
                    
                    throw new Error(`Failed to save exercises: ${exerciseError.message}`);
                }

                console.log(`✅ Inserted ${exercises.length} exercises for prescription ${prescription.id}`);
                
                return res.status(200).json({
                    success: true,
                    prescription: {
                        id: prescription.id,
                        assessmentId,
                        exerciseCount: exercises.length,
                        categories: {
                            release: release?.exercises?.length || 0,
                            reset: reset?.exercises?.length || 0,
                            rebuild: rebuild?.exercises?.length || 0
                        },
                        sessionsPerWeek,
                        durationWeeks,
                        status: 'active'
                    },
                    exercises: exercises,
                    message: `Exercise prescription created with ${exercises.length} exercises`
                });
            } else {
                // No exercises to save, clean up prescription
                await supabase
                    .from('pra_exercise_prescriptions')
                    .delete()
                    .eq('id', prescription.id);
                
                return res.status(400).json({
                    success: false,
                    error: 'No valid exercises found in prescription data'
                });
            }

        } catch (dbError) {
            console.error('Database error in exercise prescription:', dbError);
            return res.status(500).json({
                success: false,
                error: 'Failed to save exercise prescription',
                details: dbError.message
            });
        }

    } catch (error) {
        console.error('Exercise prescription API error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}