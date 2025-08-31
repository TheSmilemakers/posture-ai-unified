# Team 2: Data Collection & State Management Team - Expert Agent Invocation Prompt

## Master Agent Invocation
"Use backend-architect, data-engineer, and state-management-expert agents to implement critical data collection and state management fixes for the Posture AI application"

## Complete Context & Mission

You are Team 2 of a coordinated three-team effort to fix data flow issues in a clinical-grade posture analysis application. Your team is responsible for ALL data collection, state management, and data transformation logic.

### Your Specific Fixes (from COMPLETE-DATA-FLOW-FIX-GUIDE.md):
1. **Fix 4**: Add Assessment tab data collection (lines 195-230)
2. **Fix 5**: Collect data on tab switch (lines 232-271)
3. **Fix 6**: Update processAdvancedResults for measurements array (lines 273-370)

### Critical Requirements:
- **QUALITY OVER SPEED**: Patient data integrity is paramount
- **PLAN FIRST**: Map the entire data flow before implementing
- **MAINTAIN STATE**: Never lose user data during navigation
- **PRECISION**: Every measurement must be accurately captured

### Files You Will Modify:
1. `assets/js/ui-controller.js` - Data collection functions
2. `assets/js/analysis.js` - Review only (coordinate with biomechanics)

### Coordination Protocol:
1. Read `IMPLEMENTATION-PROGRESS.md` for UIState contract
2. Update your section every hour
3. Coordinate with Team 1 on display triggers
4. Coordinate with Team 3 on data formats

### Technical Context:
- UIState is the single source of truth
- Tab switching should preserve all entered data
- MediaPipe provides 33 landmarks per pose
- Measurements must follow the database schema format
- Photos include base64 data and annotations

### Data Structure Requirements:
```javascript
// Clinical photos format
UIState.analysisData.clinical.photos = {
    front: {
        imageData: 'data:image/jpeg;base64,...',
        annotation: 'User notes about front view',
        uploaded: true,
        timestamp: '2024-01-30T12:00:00Z'
    },
    // side and back follow same structure
};

// Advanced measurements format
measurements = [
    {
        name: 'headTilt',
        type: 'head_tilt',
        value: 5.2,
        unit: 'degrees',
        confidence: 0.85,
        viewType: 'front'
    }
    // More measurements...
];
```

### Planning Phase Requirements:
Before implementing, create a plan that includes:
1. Complete data flow diagram from UI to state
2. Tab switching state preservation strategy
3. Data validation rules for each field
4. Transformation logic for measurements
5. Error handling for missing data

### Critical Data Collection Points:
1. **Clinical Assessment Tab**:
   - Photo uploads (base64 data)
   - Annotation textareas
   - Upload status flags

2. **Tab Switching**:
   - Current tab data must be saved
   - Previous tab parameter needed
   - Timing of collection critical

3. **Advanced Analysis**:
   - Raw landmarks storage
   - Measurement array generation
   - Confidence score preservation
   - Pattern detection results

### Testing Checklist:
- [ ] Clinical photos collected with annotations
- [ ] Tab switching preserves all data
- [ ] Advanced measurements in correct format
- [ ] No data loss on rapid tab switching
- [ ] Landmarks stored for all views
- [ ] Console logs confirm data collection
- [ ] Empty/null data handled gracefully
- [ ] Large images don't break state

### Integration Points:
1. **With Team 1**: 
   - `displayUploadedImage()` must trigger your state updates
   - Coordinate on when UI updates vs state updates

2. **With Team 3**:
   - Your measurement format must match database schema
   - Exercise prescription data structure alignment
   - Photo data size considerations

### Edge Cases to Handle:
- User uploads image then immediately switches tabs
- Multiple rapid tab switches
- Partial data (only 2 of 3 views uploaded)
- Re-uploading images (overwrite existing)
- Browser refresh (session recovery)

### Expected Deliverables:
1. Complete data collection for all workflows
2. Zero data loss during navigation
3. Proper measurement array formatting
4. Comprehensive error handling
5. Clear console logging for debugging

### Important Notes:
- The 'assessment' case is missing from collectCurrentTabData()
- Tab switching doesn't currently save data
- Advanced mode needs both raw and processed data
- Weight distribution is a special case (left/right split)

Begin by mapping the current data flow, identifying all collection points, and creating a comprehensive plan. Only after plan approval should you implement the fixes.