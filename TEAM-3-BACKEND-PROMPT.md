# Team 3: Backend Integration Team - Expert Agent Invocation Prompt

## Master Agent Invocation
"Use backend-architect, database-architect, api-designer, and integration-specialist agents to implement critical backend integration fixes for the Posture AI application"

## Complete Context & Mission

You are Team 3 of a coordinated three-team effort to fix data flow issues in a clinical-grade posture analysis application. Your team is responsible for ALL database operations, API integrations, and data persistence logic.

### Your Specific Fixes (from COMPLETE-DATA-FLOW-FIX-GUIDE.md):
1. **Fix 7**: Update storeAnalysisResults for both formats (lines 372-443)
2. **Fix 8**: Update saveClinicalAssessment with photos (lines 529-606)
3. **Fix 9**: Update exportBiomechanics function (lines 608-667)
4. **Fix 10**: Save exercise prescriptions to database (lines 447-524)

### Critical Requirements:
- **QUALITY OVER SPEED**: Data integrity for medical records is critical
- **PLAN FIRST**: Design the complete persistence strategy
- **BACKWARD COMPATIBILITY**: Support both old and new data formats
- **HIPAA CONSIDERATIONS**: Audit trail and data security

### Files You Will Modify:
1. `assets/js/database-service.js` - Core database operations
2. `assets/js/ui-controller.js` - Save functions only

### Coordination Protocol:
1. Read `IMPLEMENTATION-PROGRESS.md` for data contracts
2. Update your section every hour
3. Expect data in formats from Team 2
4. Maintain API compatibility

### Technical Context:
- Supabase backend with pra_ prefixed tables
- API authentication via Bearer token
- Current endpoints: patients, assessments, analyze
- Missing: photo upload, exercise prescription
- JSON + optional PDF export

### Database Schema (Critical):
```sql
-- Key tables you're working with:
pra_assessments (id, patient_id, assessment_type, status...)
pra_measurements (assessment_id, type, value, unit, confidence...)
pra_exercise_prescriptions (assessment_id, prescribed_by, sessions_per_week...)
pra_prescribed_exercises (prescription_id, exercise_name, sets, reps...)
pra_assessment_photos (assessment_id, view_type, storage_path...) -- No API yet
```

### Planning Phase Requirements:
Before implementing, create a plan that includes:
1. Data persistence strategy for each mode
2. Photo handling approach (base64 vs storage)
3. Exercise prescription data model
4. Error recovery mechanisms
5. Performance optimization for large payloads

### Critical Integration Points:

1. **Measurement Storage**:
   - Support both object properties and arrays
   - Handle special cases (weight distribution)
   - Maintain confidence scores
   - Include view type

2. **Photo Handling**:
   - Current: Base64 in JSON (size issue)
   - Future: Supabase Storage URLs
   - Annotations must be preserved
   - Size limits consideration

3. **Exercise Prescriptions**:
   - Three R's: Release, Reset, Rebuild
   - Individual exercise details
   - Progression timelines
   - Clinical notes

### API Payload Formats:
```javascript
// Current working format
{
    measurements: [
        {
            type: 'head_tilt',
            value: 5.2,
            unit: 'degrees',
            confidence: 0.85,
            viewType: 'front'
        }
    ]
}

// Exercise prescription format
{
    assessment_id: 'uuid',
    prescribed_by: 'clinician_id',
    prescription_date: '2024-01-30',
    sessions_per_week: 3,
    duration_weeks: 6,
    exercises: [
        {
            category: 'release',
            name: 'Upper trap stretch',
            sets: 3,
            reps: 10,
            hold_seconds: 30
        }
    ]
}
```

### Testing Checklist:
- [ ] All save functions include database call
- [ ] Backward compatibility with old format
- [ ] Network failures handled gracefully
- [ ] Large photo payloads don't timeout
- [ ] Exercise prescriptions link correctly
- [ ] Audit logs created for all operations
- [ ] Success notifications accurate
- [ ] Local backup always works

### Error Handling Requirements:
```javascript
try {
    // Database operation
    const result = await saveCompleteAssessment(data);
    if (result.success) {
        showNotification('Saved to database', 'success');
    }
} catch (error) {
    console.error('Database save failed:', error);
    showNotification('Database save failed, but local file saved', 'warning');
    // Always ensure local backup
    downloadJSON(data, 'assessment-backup');
}
```

### Performance Considerations:
- Photo data can be 1-5MB per image
- API timeout is 10 seconds
- Consider chunking large payloads
- Implement progress indicators
- Cache successful saves

### Integration with Other Teams:
1. **From Team 2**: 
   - Expect measurements in array format
   - Photos as base64 with annotations
   - Complete UIState structure

2. **To Frontend**:
   - Provide save status updates
   - Return assessment IDs
   - Handle loading states

### Future Considerations (Document but don't implement):
- Supabase Storage for photos
- Real-time sync capabilities
- Offline queue for saves
- Bulk assessment uploads

### Expected Deliverables:
1. All data successfully persists to database
2. Exercise prescriptions saved with relations
3. Graceful fallback for failures
4. Performance within 3-second target
5. Complete audit trail

### Important Notes:
- storeAnalysisResults needs dual format support
- Exercise prescriptions have nested structure
- Photo storage is MVP only (base64 for now)
- Some async operations can be parallel

Begin by analyzing the current database service, understanding the API contracts, and creating a comprehensive plan. Only after plan approval should you implement the fixes.