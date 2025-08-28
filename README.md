# 🦴 Posture AI Analysis App

A unified, mobile-responsive web application for AI-powered posture analysis using MediaPipe pose detection technology. Provides clinical-grade biomechanical assessment directly in the browser.

## 🔴 Current Status: Clinical Testing Phase

**Live Demo**: https://posture-ai-f9i2uc6jp-rajans-projects-63939cf9.vercel.app

⚠️ **Important**: This is a prototype for clinical testing only. Not HIPAA compliant. Requires patient consent before use.

### Recent Updates (January 2025)
- ✅ Fixed image upload functionality in all assessment modes
- ✅ Improved mobile text readability (WCAG AA compliant)
- ✅ Added comprehensive security headers
- ✅ PWA support with app icons
- 📝 See [CHANGELOG.md](./CHANGELOG.md) for detailed updates

## 🚀 Features

### Three Analysis Modes

1. **Quick Assessment** - Mobile-optimized rapid posture check
   - Live camera capture
   - Basic posture metrics
   - Instant recommendations

2. **Clinical Assessment** - Full clinical workflow
   - Client information management
   - Photo annotation system
   - Release/Reset/Rebuild movement prescription
   - PDF report generation

3. **Advanced Biomechanics** - Research-grade analysis
   - 33-point body landmark detection
   - Complex biomechanical calculations (Cobb angle, Q-angle, etc.)
   - Force distribution visualization
   - Muscle length-tension analysis
   - Risk assessment scores

## 📱 Mobile-First Design

- Progressive Web App (PWA) capable
- Touch-optimized interface
- Responsive layouts for all screen sizes
- Offline functionality
- Camera integration for live capture

## 🛠️ Technology Stack

- **MediaPipe Pose** - Google's ML model for pose detection
- **Chart.js** - Data visualization
- **Pure JavaScript** - No framework dependencies
- **CSS3** - Modern responsive design
- **HTML5** - Progressive enhancement

## 🚀 Quick Start

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/posture-ai-app.git
cd posture-ai-app
```

2. Start a local server:
```bash
python3 -m http.server 8000
# or
npx serve
```

3. Open in browser:
```
http://localhost:8000
```

### Deployment to Vercel

1. Install dependencies and Vercel CLI:
```bash
npm install
npm i -g vercel
```

2. Build optimized assets (optional - Vercel can do this):
```bash
npm run build
```

3. Deploy:
```bash
vercel --prod
```

4. Follow the prompts to link to your Vercel account

### Build Process

The app now includes build scripts for optimization:

```bash
# Build all assets (JS, CSS, Service Worker)
npm run build

# Build individual components
npm run build:js    # Minify JavaScript
npm run build:css   # Minify CSS
npm run build:sw    # Generate optimized Service Worker

# Clean build artifacts
npm run clean
```

### Custom Domain Setup

1. In Vercel dashboard, go to Settings → Domains
2. Add your subdomain: `posture.rajanmaher.com`
3. Update DNS records as instructed

## 📂 Project Structure

```
posture-ai-unified/
├── index.html              # Main application
├── assets/
│   ├── css/
│   │   └── styles.css     # Consolidated styles with mobile fixes
│   ├── js/
│   │   ├── mediapipe-init.js  # MediaPipe configuration
│   │   ├── analysis.js         # Biomechanical algorithms
│   │   ├── ui-controller.js    # UI state management
│   │   ├── utils.js           # Utility functions
│   │   └── main.js            # Core application logic
│   └── icons/
│       ├── icon-192x192.png   # PWA icon
│       └── icon-512x512.png   # PWA splash icon
├── vercel.json            # Security headers & deployment config
├── package.json           # Project metadata & build scripts
├── manifest.json          # PWA manifest
├── sw.js                 # Service worker
├── workbox-config.js     # Workbox PWA configuration
├── CHANGELOG.md          # Version history
├── deployment-log.md     # Deployment records
├── bug-fixes-log.md      # Detailed bug fixes
├── project-status.md     # Current project state
└── README.md             # This file
```

## 🔧 Configuration

### Environment Variables

No environment variables required - all processing happens client-side!

### Browser Requirements

- Chrome 79+ (recommended)
- Safari 14+
- Firefox 78+
- Edge 79+
- Mobile Safari/Chrome

### Camera Permissions

The app requires camera access for live capture features. Ensure:
- HTTPS connection (required for camera API)
- User grants camera permissions when prompted

## 📊 Measurement Accuracy

| Measurement | Accuracy | Use Case |
|------------|----------|----------|
| Large angles (>15°) | ±2° | Clinical screening |
| Small angles (<15°) | ±5° | General assessment |
| Linear distances | ±5mm | Relative comparisons |
| Symmetry comparison | ±3mm | Imbalance detection |

## 🔒 Privacy & Security

- **Local Processing**: All analysis performed in-browser
- **No Data Storage**: Images never leave the device
- **Security Headers**: Comprehensive security headers configured
- **CSP Protection**: Content Security Policy prevents XSS attacks
- **HTTPS Required**: Enforced via HSTS header

### Security Configuration (January 2025 Update)

The app now includes enhanced security measures:

1. **Content Security Policy (CSP)**
   - Restricts script sources to self and trusted CDNs
   - Prevents inline script injection
   - Blocks frame embedding

2. **Security Headers**
   - `Strict-Transport-Security`: Forces HTTPS for 1 year
   - `X-Content-Type-Options`: Prevents MIME sniffing
   - `X-Frame-Options`: Prevents clickjacking
   - `X-XSS-Protection`: Legacy XSS protection
   - `Referrer-Policy`: Controls referrer information
   - `Permissions-Policy`: Restricts feature access

3. **Build Optimization**
   - JavaScript minification via Terser
   - CSS minification via clean-css
   - Service Worker generation via Workbox
   - PWA manifest caching strategies

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see LICENSE file for details.

## 🏥 Clinical Disclaimer

This tool is designed for assessment and screening purposes. It does not replace professional medical evaluation. Always consult with qualified healthcare providers for diagnosis and treatment.

## 🐛 Known Issues & Limitations

### Current Limitations
- **No Backend**: All data stored in browser localStorage (not secure)
- **No Authentication**: No user login system
- **Not HIPAA Compliant**: Missing required security measures
- **No Real-World Calibration**: Measurements in relative units only
- **Single User**: No multi-user or multi-device support

### Technical Issues
- Wide-angle camera lenses may cause slight measurement distortion
- Loose clothing can interfere with landmark detection
- Best results with plain background and good lighting
- MediaPipe may fail in very low light conditions
- Memory usage increases with extended use (50+ analyses)

## 📞 Support

- GitHub Issues: [Create an issue](https://github.com/yourusername/posture-ai-app/issues)
- Documentation: See `/docs` folder
- Email: support@twotonysclinic.com

## 🙏 Acknowledgments

- Google MediaPipe team for the pose detection model
- Two Tonys Treatment Clinic for clinical expertise
- Open source community for inspiration

---

Built with ❤️ for better posture health