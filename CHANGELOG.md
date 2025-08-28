# Changelog - Posture AI Unified

All notable changes to the Posture AI Unified project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.2] - 2025-01-28

### Fixed
- Fixed CSS readability issues on mobile devices
  - Changed `.text-muted` color from `#6c757d` to `#595959` for WCAG AA compliance
  - Changed `.dark-text` color from `#495057` to `#2d3748` for better contrast
  - Added mobile-specific CSS overrides for font sizes and weights
  - Implemented high contrast mode support
  - All text now meets WCAG AA accessibility standards

### Deployment
- URL: https://posture-ai-f9i2uc6jp-rajans-projects-63939cf9.vercel.app

## [0.3.1] - 2025-01-28

### Fixed
- Fixed image upload functionality in Clinical and Advanced modes
  - Removed non-existent `uploadClinicalPhoto()` and `uploadAdvancedPhoto()` functions
  - Unified all upload handling through `handleFileUpload()` function
  - All three assessment modes now support image uploads correctly

### Deployment
- URL: https://posture-ai-h6mmk8ghk-rajans-projects-63939cf9.vercel.app

## [0.3.0] - 2025-01-28

### Added
- Comprehensive security headers via vercel.json
  - Content Security Policy (CSP)
  - Strict Transport Security (HSTS)
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Referrer-Policy
  - Permissions-Policy for camera access
- PWA icons (192x192 and 512x512)
- Clinical testing disclaimer with consent requirements
- Mobile-specific responsive design improvements

### Security
- Implemented security best practices for static deployment
- Added protection against XSS, clickjacking, and other attacks
- Configured proper camera permissions

### Changed
- Updated manifest.json with proper icon paths
- Enhanced mobile responsive design
- Improved button and touch target sizes

### Deployment
- URL: https://posture-ai-3qrk1bcc6-rajans-projects-63939cf9.vercel.app

## [0.2.0] - 2025-01-15

### Added
- Three assessment modes:
  - Quick Assessment (single photo)
  - Clinical Evaluation (front, side, back views)
  - Advanced Analysis (comprehensive assessment)
- MediaPipe Pose integration for all views
- Biomechanical analysis algorithms:
  - Forward head posture detection
  - Shoulder level analysis
  - Scoliosis screening (Cobb angle)
  - Q-angle calculation
  - Kyphosis and lordosis assessment
- Pattern recognition:
  - Upper/Lower Crossed Syndrome
  - Trendelenburg sign
  - Swayback posture detection

### Technical
- Implemented BiomechanicalAnalyzer class
- Added comprehensive error handling
- Created modular JavaScript architecture
- Implemented basic state management

## [0.1.0] - 2025-01-01

### Added
- Initial MVP release
- Basic MediaPipe Pose integration
- Simple posture analysis for front view
- Bootstrap UI framework
- Camera capture functionality
- Basic biomechanical calculations

### Known Limitations
- No backend/database (localStorage only)
- No user authentication
- No report generation
- Not HIPAA compliant
- Single user/device only

---

## Version Naming Convention

- **Major version (X.0.0)**: Breaking changes, major features
- **Minor version (0.X.0)**: New features, backwards compatible
- **Patch version (0.0.X)**: Bug fixes, minor improvements

## Roadmap

### [0.4.0] - Planned
- Backend API implementation (Node.js/Express)
- User authentication system
- PostgreSQL database integration
- Basic HIPAA compliance measures

### [0.5.0] - Planned
- Report generation system
- Exercise prescription module
- Progress tracking functionality
- Multi-user support

### [1.0.0] - Target Release
- Full HIPAA compliance
- Complete clinical validation
- EHR integration capability
- Production-ready for clinical use

---

*For detailed bug fixes and technical changes, see `bug-fixes-log.md`*
*For current project status, see `project-status.md`*
*For deployment history, see `deployment-log.md`*