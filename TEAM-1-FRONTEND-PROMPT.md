# Team 1: Frontend UI/Display Team - Expert Agent Invocation Prompt

## Master Agent Invocation
"Use frontend-developer, ui-ux-designer, and css-architect agents to implement critical frontend fixes for the Posture AI application"

## Complete Context & Mission

You are Team 1 of a coordinated three-team effort to fix data flow issues in a clinical-grade posture analysis application. Your team is responsible for ALL frontend display and UI-related fixes.

### Your Specific Fixes (from COMPLETE-DATA-FLOW-FIX-GUIDE.md):
1. **Fix 1**: Add CSS for uploaded images (lines 25-68)
2. **Fix 2**: Fix image loading race condition (lines 70-151)
3. **Fix 3**: Initialize UIState.analysisData.advanced.images (lines 153-193)

### Critical Requirements:
- **QUALITY OVER SPEED**: This is a healthcare application. Every pixel matters.
- **PLAN FIRST**: Create a detailed implementation plan before writing any code
- **TEST THOROUGHLY**: Each fix must be tested in all 3 modes (quick, clinical, advanced)
- **MAINTAIN STANDARDS**: Follow the existing CSS conventions and design system

### Files You Will Modify:
1. `assets/css/styles.css` - Add image display styles
2. `assets/js/ui-controller.js` - Fix display functions ONLY

### Coordination Protocol:
1. Read `IMPLEMENTATION-PROGRESS.md` for data contracts
2. Update your section every hour
3. Do NOT modify functions owned by other teams
4. Test integration points with mock data

### Technical Context:
- The app uses vanilla JavaScript with ES6 modules
- CSS uses custom properties and modern features (light-dark() function)
- Images are base64 encoded data URLs
- Mobile-first responsive design is critical
- Glassmorphism effects with backdrop-filter

### Quality Standards:
```css
/* Follow this CSS pattern */
.element-name {
    /* Layout properties first */
    /* Display properties */
    /* Styling properties */
    /* Transitions last */
}
```

```javascript
// Follow this JS pattern
function functionName(param1, param2) {
    try {
        console.log(`functionName: Starting with ${param1}`);
        // Implementation
        return result;
    } catch (error) {
        console.error('functionName: Error:', error);
        showNotification('User-friendly message', 'error');
    }
}
```

### Planning Phase Requirements:
Before implementing, create a plan that includes:
1. Detailed analysis of current image display issues
2. CSS specificity calculations to avoid conflicts
3. Race condition timeline and solution approach
4. Testing strategy for each browser
5. Performance impact assessment

### Testing Checklist:
- [ ] Images display in quick mode
- [ ] Images display in clinical mode (all 3 views)
- [ ] Images display in advanced mode (all 3 views)
- [ ] No layout shift when images load
- [ ] Mobile responsive (test at 375px, 768px, 1024px)
- [ ] Dark mode compatibility
- [ ] Loading states show correctly
- [ ] Error states handle gracefully

### Expected Deliverables:
1. Complete implementation of all 3 fixes
2. Zero visual regressions
3. Improved loading experience
4. Documentation of any edge cases found
5. Updated IMPLEMENTATION-PROGRESS.md

### Important Notes:
- The `.uploaded-image` class is currently missing from CSS
- Image previews use IDs like `clinical-front-preview`
- Race condition occurs because onload is set after src
- UIState structure must match the contract exactly

Begin by analyzing the current frontend code, understanding the display flow, and creating a comprehensive plan. Only after plan approval should you implement the fixes.