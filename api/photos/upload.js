/**
 * Photo Upload API Endpoint
 * Handles large photo uploads for clinical assessments
 * Replaces dangerous photo truncation with proper storage
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

        const { assessmentId, viewType, imageData, annotation, mimeType = 'image/jpeg' } = req.body;

        // Validate required fields
        if (!assessmentId || !viewType || !imageData) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: assessmentId, viewType, imageData'
            });
        }

        // Validate viewType
        const validViews = ['front', 'side', 'back', 'other'];
        if (!validViews.includes(viewType)) {
            return res.status(400).json({
                success: false,
                error: `Invalid viewType. Must be one of: ${validViews.join(', ')}`
            });
        }

        // Validate image data format
        if (!imageData.startsWith('data:image/')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid image data format. Must be base64 data URL.'
            });
        }

        // Extract base64 data (remove data URL prefix)
        const base64Data = imageData.split(',')[1];
        if (!base64Data) {
            return res.status(400).json({
                success: false,
                error: 'Invalid base64 image data'
            });
        }

        // Check file size (limit to 5MB for clinical photos)
        const sizeInBytes = (base64Data.length * 3) / 4;
        const maxSizeInMB = 5;
        const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

        if (sizeInBytes > maxSizeInBytes) {
            return res.status(413).json({
                success: false,
                error: `Image too large. Maximum size is ${maxSizeInMB}MB, received ${(sizeInBytes / 1024 / 1024).toFixed(2)}MB`
            });
        }

        try {
            // Convert base64 to buffer
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            // Generate unique filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `assessment-${assessmentId}-${viewType}-${timestamp}.${mimeType.split('/')[1]}`;
            const storagePath = `assessments/${assessmentId}/${filename}`;

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('clinical-photos')
                .upload(storagePath, imageBuffer, {
                    contentType: mimeType,
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error('Supabase storage upload failed:', uploadError);
                throw new Error(`Storage upload failed: ${uploadError.message}`);
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('clinical-photos')
                .getPublicUrl(storagePath);

            // Save photo record to database
            const { data: photoRecord, error: dbError } = await supabase
                .from('pra_assessment_photos')
                .insert({
                    assessment_id: assessmentId,
                    view_type: viewType,
                    storage_path: storagePath,
                    mime_type: mimeType,
                    annotations: annotation ? { annotation } : {}
                })
                .select()
                .single();

            if (dbError) {
                console.error('Database insert failed:', dbError);
                // Try to cleanup uploaded file
                await supabase.storage.from('clinical-photos').remove([storagePath]);
                throw new Error(`Database save failed: ${dbError.message}`);
            }

            console.log(`✅ Photo uploaded successfully: ${filename} (${(sizeInBytes / 1024).toFixed(1)}KB)`);

            return res.status(200).json({
                success: true,
                photo: {
                    id: photoRecord.id,
                    assessmentId,
                    viewType,
                    storagePath,
                    publicUrl,
                    fileSize: sizeInBytes,
                    uploadedAt: photoRecord.uploaded_at
                },
                message: `${viewType} photo uploaded successfully`
            });

        } catch (storageError) {
            console.error('Photo storage error:', storageError);
            return res.status(500).json({
                success: false,
                error: 'Failed to store photo',
                details: storageError.message
            });
        }

    } catch (error) {
        console.error('Photo upload API error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

// Increase body size limit for photo uploads
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '6mb', // Allow up to 6MB for base64 encoded images
        },
    },
}