# Central Coordination Guide - Three Team Implementation

## 🎯 Overview
This guide ensures smooth coordination between the three parallel implementation teams fixing the Posture AI data flow issues.

## 🔄 Communication Protocol

### Update Schedule
- **Every Hour**: Progress update in IMPLEMENTATION-PROGRESS.md
- **Every 2 Hours**: Integration checkpoint meeting
- **Immediate**: Any blockers or contract changes

### Update Format
```markdown
## Team [X] Update - [Timestamp]
**Progress**: Fix 1 ✅, Fix 2 🔄 (50%), Fix 3 ⏸️
**Current Focus**: [What you're working on]
**Blockers**: [Any issues]
**Next Hour**: [Plan]
**Integration Notes**: [Any changes affecting other teams]
```

## 🤝 Integration Boundaries

### Shared File Ownership
```
ui-controller.js:
├── Team 1 Functions (Display Logic):
│   ├── displayUploadedImage()
│   ├── updateQuickModeUI()
│   ├── updateClinicalPhotoStatus()
│   └── updateAdvancedViewStatus()
│
├── Team 2 Functions (Data Collection):
│   ├── collectCurrentTabData()
│   ├── showTab()
│   ├── processAdvancedResults()
│   └── checkAdvancedAutoAnalysis()
│
└── Team 3 Functions (Save Operations):
    ├── saveClinicalAssessment()
    ├── exportBiomechanics()
    ├── saveQuickResults()
    └── downloadJSON()
```

### Function Call Flow
```
Team 1 (Display) → Team 2 (Collect) → Team 3 (Save)
      ↓                    ↓                ↓
Shows Image         Updates State      Persists Data
      ↓                    ↓                ↓
User Feedback      State Valid       Database/File
```

## 📋 Pre-Implementation Checklist

### All Teams Must:
1. ✅ Read COMPLETE-DATA-FLOW-FIX-GUIDE.md
2. ✅ Review IMPLEMENTATION-PROGRESS.md
3. ✅ Understand their specific fixes
4. ✅ Create detailed plan BEFORE coding
5. ✅ Get plan approved
6. ✅ Set up test environment

## 🔍 Quality Gates

### Before Starting Implementation:
- [ ] Plan reviewed and approved
- [ ] Test cases defined
- [ ] Integration points identified
- [ ] Backup of current code

### Before Integration:
- [ ] Unit tests passing
- [ ] No console errors
- [ ] Integration points tested with mock data
- [ ] Documentation updated

### Before Completion:
- [ ] End-to-end testing complete
- [ ] Performance benchmarks met
- [ ] Code review completed
- [ ] All fixes verified

## 🚨 Conflict Resolution

### If Conflicts Arise:
1. **Stop work** on conflicting area
2. **Document** the conflict in this file
3. **Propose** resolution options
4. **Agree** on approach
5. **Implement** agreed solution

### Common Conflict Areas:
- UIState structure modifications
- Function parameter changes
- CSS class naming
- API payload formats

## 📊 Success Metrics

### Team 1 (Frontend):
- Images display < 100ms after upload
- No layout shift
- Mobile responsive
- Dark mode compatible

### Team 2 (Data Collection):
- 100% data capture rate
- No data loss on navigation
- Correct format transformation
- State consistency maintained

### Team 3 (Backend):
- Database saves < 3 seconds
- 100% save success (with fallback)
- Audit trail complete
- Backward compatibility

## 🔄 Integration Testing

### Phase 1: Component Testing
Each team tests their fixes independently:
- Team 1: Visual regression tests
- Team 2: State mutation tests
- Team 3: API integration tests

### Phase 2: Integration Testing
Cross-team integration points:
1. Upload → Display → Collect
2. Collect → Transform → Save
3. Save → Feedback → Display

### Phase 3: End-to-End Testing
Complete workflows:
1. Quick mode full flow
2. Clinical assessment with all tabs
3. Advanced analysis with auto-trigger
4. Data recovery after refresh

## 📝 Documentation Requirements

### Each Team Must Document:
1. **Changes Made**: List all modifications
2. **New Functions**: Purpose and parameters
3. **Modified Functions**: What changed and why
4. **Edge Cases**: How they're handled
5. **Performance Notes**: Any impacts

### Central Documentation Updates:
- API changes → Update API docs
- State changes → Update state contract
- UI changes → Update user guide
- Database changes → Update schema docs

## 🎯 Final Checkpoint

### Before Marking Complete:
1. [ ] All fixes implemented
2. [ ] All tests passing
3. [ ] No regressions
4. [ ] Documentation complete
5. [ ] Integration verified
6. [ ] Performance acceptable
7. [ ] Code review done
8. [ ] IMPLEMENTATION-PROGRESS.md final update

## 💡 Tips for Success

1. **Communicate Early**: Don't wait for problems
2. **Test Often**: Catch issues early
3. **Document Everything**: Future you will thank you
4. **Ask Questions**: No assumption is safe
5. **Quality First**: Better slow than broken

---

**Remember**: This is a medical application. Our users rely on data accuracy for clinical decisions. Take the time to do it right.