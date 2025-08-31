# Implementation Prompt for Data Flow Fixes

## Context
After conversation compaction, use this prompt to implement all data flow fixes for the Posture AI unified app.

## Implementation Request Prompt

```
Please implement the data flow fixes from DATA-FLOW-FIX-IMPLEMENTATION.md in the posture-ai-unified project. The fixes address critical data collection and storage gaps in both Clinical Assessment and Advanced Analysis workflows.

Key files to modify:
1. assets/js/ui-controller.js
2. assets/js/database-service.js

Required fixes:
1. Add 'assessment' case to collectCurrentTabData() to capture clinical photos
2. Store uploaded images in UIState.analysisData.advanced.images
3. Convert advanced analysis data to measurements array format
4. Update database service to handle both data formats
5. Ensure photos are included when saving clinical assessments
6. Add complete data to exportBiomechanics including images and landmarks
7. Collect data when switching tabs in clinical workflow

Database alignment requirements:
- Measurements must include: type, value, unit, confidence, viewType
- Photos should have: imageData (base64), annotation, timestamp
- All data must flow to these API endpoints:
  - POST /api/assessments/create
  - POST /api/assessments/analyze
- Database tables (pra_ prefix):
  - pra_assessments
  - pra_measurements  
  - pra_assessment_photos (needs API endpoint)

Testing checklist:
- [ ] Clinical photos captured with annotations
- [ ] Advanced images stored in UIState
- [ ] Measurements array properly formatted
- [ ] Database receives complete payloads
- [ ] No data lost between tabs
- [ ] Export includes all data

Please implement these fixes maintaining the existing 50% opacity glassmorphism theme and all current functionality.
```

## Database Schema Reference

```sql
-- Measurements table structure
CREATE TABLE pra_measurements (
    id UUID PRIMARY KEY,
    assessment_id UUID REFERENCES pra_assessments(id),
    measurement_type VARCHAR(100) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) DEFAULT 'degrees',
    confidence DECIMAL(3,2) DEFAULT 0.85,
    view_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Photos table (needs API endpoint)
CREATE TABLE pra_assessment_photos (
    id UUID PRIMARY KEY,
    assessment_id UUID REFERENCES pra_assessments(id),
    view_type VARCHAR(50) NOT NULL, -- 'front', 'side', 'back'
    image_data TEXT, -- Base64 or URL
    annotation TEXT,
    uploaded_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoint Alignment

### Current Working Endpoints
- `GET /api/test-db` - Database connection test
- `POST /api/patients/create` - Create patient record
- `POST /api/assessments/create` - Create assessment
- `POST /api/assessments/analyze` - Store measurements

### Missing Endpoint (Needs Creation)
- `POST /api/photos/upload` - Upload assessment photos
  ```javascript
  // Expected payload
  {
    assessmentId: "uuid",
    photos: {
      front: { imageData: "base64...", annotation: "text" },
      side: { imageData: "base64...", annotation: "text" },
      back: { imageData: "base64...", annotation: "text" }
    }
  }
  ```

## Critical Implementation Notes

1. **Photo Size Handling**: Base64 images can be large. Consider:
   - Limiting to first 100KB for MVP
   - Implementing compression before storage
   - Using separate photo upload endpoint

2. **Backwards Compatibility**: Database service must handle:
   - Old format: Direct properties (qAngle, forwardHead)
   - New format: Measurements array

3. **Data Validation**: Add checks for:
   - Required fields before save
   - Valid measurement units
   - Confidence scores between 0-1

4. **Error Handling**: Graceful fallback if:
   - Photo upload fails (save rest of data)
   - Database is offline (local storage backup)

## Environment Variables Check

Ensure these are set in Vercel:
```
SUPABASE_URL=https://anxeptegnpfroajjzuqk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[secret key]
```

## Success Verification

After implementation, verify:
1. Open Network tab in browser DevTools
2. Complete Clinical Assessment with photos
3. Check `/api/assessments/analyze` payload includes measurements array
4. Complete Advanced Analysis  
5. Export data and verify JSON includes images and landmarks
6. Check Supabase dashboard for stored records

## Related Files
- DATA-FLOW-FIX-IMPLEMENTATION.md (detailed fix guide)
- PROJECT-STATE-JANUARY-2025.md (current state)
- database/schema.sql (full schema)