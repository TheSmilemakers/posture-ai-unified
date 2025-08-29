# Posture AI Live Site Test Checklist
**URL**: https://posture.rajanmaher.com  
**Password**: posture2025

## Initial Load Tests
- [ ] Site loads without errors
- [ ] Password prompt appears immediately
- [ ] Password "posture2025" works
- [ ] Site redirects to main app after authentication

## UI/UX Tests
### Header
- [ ] Logo/brand icon visible
- [ ] Theme toggle button works (Dark → System → Light)
- [ ] Background toggle button works
- [ ] Header auto-hides on scroll down
- [ ] Header reappears on scroll up or hover

### Mode Selection
- [ ] All three mode buttons are visible and clickable:
  - [ ] Quick Analysis (30 sec)
  - [ ] Clinical Mode (2 min)  
  - [ ] Advanced Analysis (5 min)
- [ ] Mode descriptions are clear
- [ ] Icons display correctly (no broken images)

### Theme Testing
- [ ] Dark mode displays correctly
- [ ] Light mode displays correctly
- [ ] System mode follows OS preference
- [ ] Theme persists after page refresh
- [ ] All text remains readable in all themes

## Functionality Tests
### Quick Analysis Mode
- [ ] Mode selection works
- [ ] Patient selection/creation flow works
- [ ] Image upload accepts JPG/PNG
- [ ] Camera capture works (if on mobile/has webcam)
- [ ] Analysis runs without errors
- [ ] Results display correctly
- [ ] Save/Export functions work
- [ ] PDF generation works

### Clinical Mode
- [ ] All 7 tabs are accessible
- [ ] Form validation works
- [ ] Progress is saved between tabs
- [ ] Image analysis functions properly
- [ ] Exercise prescription loads
- [ ] Save functionality works

### Advanced Analysis Mode
- [ ] Auto-triggers after 3 images
- [ ] 33-point detection visible
- [ ] Biomechanical calculations display
- [ ] Force vectors render correctly
- [ ] Export includes all data

## Mobile Responsiveness
- [ ] Site works on mobile devices
- [ ] Touch targets are adequate (44px minimum)
- [ ] Text is readable without zooming
- [ ] Buttons and forms are usable
- [ ] Camera capture works on mobile

## Performance Tests
- [ ] Page loads in < 3 seconds
- [ ] MediaPipe loads without errors
- [ ] No console errors in DevTools
- [ ] Memory usage stays reasonable
- [ ] Animations are smooth (60fps)

## Data Persistence
- [ ] Session data persists for 1 hour
- [ ] Theme preference saves
- [ ] Patient data saves to database
- [ ] Assessment data saves correctly

## Error Handling
- [ ] Invalid password shows error
- [ ] Network errors handled gracefully
- [ ] Invalid image formats rejected
- [ ] Missing data shows appropriate messages

## Browser Compatibility
Test on:
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Security Tests
- [ ] HTTPS enforced
- [ ] Password field is masked
- [ ] Session expires appropriately
- [ ] API endpoints require authentication

## Known Issues to Verify Fixed
- [ ] All buttons have proper event handlers
- [ ] No onclick attribute mismatches
- [ ] MediaPipe cleanup between modes
- [ ] State management works correctly

## Notes Section
_Record any issues, observations, or improvements needed:_

---

**Test Date**: ___________  
**Tested By**: ___________  
**Browser/Device**: ___________  
**Overall Status**: ⬜ Pass ⬜ Pass with Issues ⬜ Fail