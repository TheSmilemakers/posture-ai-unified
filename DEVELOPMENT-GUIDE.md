# 🚀 Posture AI Development Guide

This guide covers everything you need to develop, test, and deploy the Posture AI application.

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [Development Setup](#development-setup)
3. [Running the Application](#running-the-application)
4. [Testing Guide](#testing-guide)
5. [Deployment](#deployment)
6. [Troubleshooting](#troubleshooting)

## 🏃 Quick Start

```bash
# 1. Navigate to project
cd /Users/rajan/Documents/Posture\ Rehab\ Ai\ App/posture-ai-unified

# 2. Install dependencies
npm install

# 3. Start local server
python3 -m http.server 3000

# 4. Open browser
open http://localhost:3000

# 5. Enter password when prompted
# Password: posture2025
```

## 🛠️ Development Setup

### Prerequisites
- Node.js 14+ (for npm packages)
- Python 3 (for local server)
- Modern browser (Chrome/Edge/Safari/Firefox)
- Git (for version control)

### Environment Setup

1. **Create `.env.local` file** (for local development):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://anxeptegnpfroajjzuqk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

2. **Install dependencies**:
```bash
npm install
```

3. **Verify installation**:
```bash
npm list jspdf @supabase/supabase-js
```

## 🖥️ Running the Application

### Method 1: Python HTTP Server (Recommended)
```bash
# Using Python 3
python3 -m http.server 3000

# Alternative ports if 3000 is busy
python3 -m http.server 8000
python3 -m http.server 8080
```

### Method 2: Node HTTP Server
```bash
# Install http-server globally
npm install -g http-server

# Run server
http-server -p 3000 -c-1

# With CORS enabled (for API testing)
http-server -p 3000 -c-1 --cors
```

### Method 3: VS Code Live Server
1. Install "Live Server" extension
2. Right-click `index.html`
3. Select "Open with Live Server"

### Method 4: Vercel Dev (For API testing)
```bash
# Install Vercel CLI
npm install -g vercel

# Run development server
vercel dev
```

## 🧪 Testing Guide

### 1. Basic Functionality Test
```bash
# Start server
python3 -m http.server 3000
```

Navigate to: http://localhost:3000
- Enter password: `posture2025`
- Test all 3 modes (Quick, Clinical, Advanced)
- Verify PDF generation works
- Check database saves (console logs)

### 2. PDF Generation Test
Navigate to: http://localhost:3000/test-pdf.html
- Click each button to test PDF generation
- Verify PDFs download correctly
- Check console for any errors

### 3. Backend Integration Test
Navigate to: http://localhost:3000/test-backend-integration.html
- Click "Test Connection" - should show success
- Click "Create Patient" - should create patient
- Click "Run Complete Test" - should complete workflow

### 4. Complete MVP Test
Navigate to: http://localhost:3000/test-complete-mvp.html
- Review all completed features
- Use test buttons to verify functionality

### 5. Database Connection Test
```bash
npm run test:db
```
Expected output:
```
✅ All tables exist!
🎉 Database is ready for use!
```

### 6. Manual Testing Checklist

#### Quick Mode:
- [ ] Camera capture works
- [ ] Image upload works
- [ ] Analysis runs correctly
- [ ] Results display properly
- [ ] Save generates PDF
- [ ] Data saves to database

#### Clinical Mode:
- [ ] All 7 tabs accessible
- [ ] Client info saves
- [ ] Photo uploads work
- [ ] Exercise prescription works
- [ ] Generate report creates PDF
- [ ] Assessment saves to database

#### Advanced Mode:
- [ ] All 3 image uploads work
- [ ] Auto-analysis triggers after 3rd image
- [ ] Biomechanics display correctly
- [ ] Export generates JSON + PDF
- [ ] Data saves to database

#### State Management:
- [ ] Back button cleans up properly
- [ ] No memory leaks
- [ ]MediaPipe closes correctly
- [ ] Forms clear on mode switch

#### Session Persistence:
- [ ] Start assessment, refresh page
- [ ] Recovery prompt appears
- [ ] Session restores correctly
- [ ] 1-hour expiry works

## 🚀 Deployment

### Vercel Deployment (Production)

1. **Initial Setup** (if not done):
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login
```

2. **Deploy to Production**:
```bash
# Deploy to production
vercel --prod

# Or use npm script
npm run deploy
```

3. **Environment Variables**:
Set these in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Post-Deployment Verification
1. Visit: https://posture.rajanmaher.com
2. Enter password: `posture2025`
3. Test core functionality
4. Verify database connection
5. Check PDF generation

## 🔧 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or try a different port
python3 -m http.server 8080
```

#### 2. MediaPipe Not Loading
- Clear browser cache
- Check internet connection (CDN required)
- Try incognito/private mode
- Check console for errors

#### 3. Database Connection Failed
- Verify `.env.local` exists
- Check Supabase credentials
- Ensure tables exist (run `npm run test:db`)
- Check API endpoints are deployed

#### 4. PDF Generation Issues
- Ensure jsPDF is installed: `npm install jspdf`
- Check browser console for errors
- Try fallback print dialog
- Verify no popup blockers

#### 5. Camera Not Working
- Check browser permissions
- Ensure HTTPS or localhost
- Try different browser
- Check if camera in use by other app

### Debug Mode
Add to URL for verbose logging:
```
http://localhost:3000?debug=true
```

### Browser Console Commands
```javascript
// Check current state
console.log(UIState);

// Test database connection
testDatabaseConnection().then(console.log);

// Clear session
localStorage.clear();
sessionStorage.clear();
```

## 📚 Additional Resources

### Project Structure
```
posture-ai-unified/
├── index.html          # Main entry point
├── assets/
│   ├── css/           # Styles
│   ├── js/            # JavaScript modules
│   └── img/           # PWA icons
├── api/               # Vercel serverless functions
├── database/          # Schema and setup
├── test-*.html        # Test pages
└── docs/              # Documentation
```

### Key Files
- `main.js` - Application entry point
- `ui-controller.js` - UI state management
- `analysis.js` - Biomechanical calculations
- `database-service.js` - API interactions
- `utils.js` - PDF generation and utilities

### API Endpoints
- `GET /api/test-db` - Test database connection
- `POST /api/patients/create` - Create patient
- `POST /api/assessments/create` - Create assessment
- `POST /api/assessments/analyze` - Store analysis

### Browser Support
- Chrome 90+ (Recommended)
- Edge 90+
- Safari 14+
- Firefox 88+

### Mobile Support
- iOS Safari 14+
- Chrome Android 90+
- Samsung Internet 14+

## 🤝 Contributing

1. Check current branch: `git branch`
2. Create feature branch: `git checkout -b feature/your-feature`
3. Make changes and test thoroughly
4. Commit with clear messages
5. Push to repository
6. Create pull request

## 📞 Support

If you encounter issues:
1. Check this guide first
2. Review error messages in console
3. Check test pages for specific features
4. Review CLAUDE.md for architecture details

---

Last Updated: January 2025
MVP Status: 99% Complete - Production Ready