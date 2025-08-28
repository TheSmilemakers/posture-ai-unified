# 🦴 Posture AI Analysis App

A unified, mobile-responsive web application for AI-powered posture analysis using MediaPipe pose detection technology. Provides clinical-grade biomechanical assessment directly in the browser.

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

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow the prompts to link to your Vercel account

### Custom Domain Setup

1. In Vercel dashboard, go to Settings → Domains
2. Add your subdomain: `posture.rajanmaher.com`
3. Update DNS records as instructed

## 📂 Project Structure

```
posture-ai-app/
├── index.html              # Main application
├── assets/
│   ├── css/
│   │   └── styles.css     # Consolidated styles
│   ├── js/
│   │   ├── mediapipe-init.js
│   │   ├── analysis.js
│   │   ├── ui-controller.js
│   │   └── utils.js
│   └── images/
├── vercel.json            # Vercel configuration
├── package.json           # Project metadata
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
- **HIPAA Ready**: Can be deployed in clinical settings
- **Secure Headers**: Security headers configured in vercel.json

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

## 🐛 Known Issues

- Wide-angle camera lenses may cause slight measurement distortion
- Loose clothing can interfere with landmark detection
- Best results with plain background and good lighting

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