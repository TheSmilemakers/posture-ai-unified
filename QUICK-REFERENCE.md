# 🎯 Posture AI - Quick Reference

## 🚀 Start Development Server
```bash
cd posture-ai-unified
python3 -m http.server 3000
# Open: http://localhost:3000
# Password: posture2025
```

## 🧪 Test Pages
- **Main App**: http://localhost:3000
- **PDF Test**: http://localhost:3000/test-pdf.html
- **Backend Test**: http://localhost:3000/test-backend-integration.html
- **Complete MVP Test**: http://localhost:3000/test-complete-mvp.html

## 📊 Database Commands
```bash
# Test connection
npm run test:db

# View Supabase dashboard
open https://supabase.com/dashboard/project/anxeptegnpfroajjzuqk
```

## 🚀 Deployment
```bash
# Deploy to Vercel
vercel --prod

# Check deployment
open https://posture.rajanmaher.com
```

## 🔧 Common Fixes
```bash
# Port in use
lsof -ti:3000 | xargs kill -9

# Clear npm cache
npm cache clean --force
npm install

# Reset git
git status
git add -A
git commit -m "your message"
```

## 🔑 Important Info
- **Password**: posture2025
- **API Token**: Bearer posture-api-2025
- **Tables Prefix**: pra_
- **Session Duration**: 1 hour
- **PDF Watermark**: "MVP - Clinical Review Required"

## 📱 Mode Features
### Quick Mode
- Live camera capture
- Basic posture metrics
- Instant PDF report

### Clinical Mode
- 7-tab workflow
- Patient management
- Exercise prescription
- Professional PDF

### Advanced Mode
- 3-view analysis
- Auto-triggers after uploads
- Biomechanical calculations
- JSON + PDF export

## 🛠️ Key Files
```
main.js           # Entry point, auth
ui-controller.js  # UI logic, state
analysis.js       # Calculations
database-service.js # API calls
utils.js          # PDF generation
```

## 🐛 Debug Tips
```javascript
// Console commands
UIState                    // View current state
localStorage.clear()       // Clear session
testDatabaseConnection()   // Test backend
```

## 📞 Quick Links
- [Full Dev Guide](./DEVELOPMENT-GUIDE.md)
- [Project Docs](../CLAUDE.md)
- [API Guide](./database/supabase-integration.md)
- [Handover Notes](./HANDOVER_PROMPT.md)