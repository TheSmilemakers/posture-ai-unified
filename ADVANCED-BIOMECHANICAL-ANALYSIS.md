# Advanced Biomechanical Analysis System - Technical Documentation

## Overview

The Advanced Biomechanical Analysis mode provides a comprehensive postural assessment using MediaPipe pose detection combined with clinical biomechanical algorithms. This system analyzes three views (front, side, back) to create a complete picture of postural deviations and injury risks.

## System Architecture

### 1. Core Components

- **EnhancedPoseDetector**: Advanced pose detection with temporal smoothing and landmark stability
- **BiomechanicalAnalyzer**: Clinical algorithms for postural measurements
- **CalibrationSystem**: Real-world measurement conversion using patient height
- **RiskAssessment**: Injury risk calculation based on deviations

### 2. Analysis Pipeline

```
Upload Images → MediaPipe Processing → Landmark Extraction → 
Calibration → Biomechanical Analysis → Risk Assessment → 
Report Generation
```

## Measurement Methodology

### Front View Analysis

#### 1. **Q-Angle (Quadriceps Angle)**
- **What it measures**: Knee valgus/varus alignment
- **Calculation**: Angle between hip-knee-ankle
- **Normal range**: 12-18° (15° ideal)
- **Clinical significance**: 
  - >20°: Increased ACL injury risk
  - <10°: Potential patellofemoral issues

```javascript
// Q-angle calculation
const qAngle = calculateAngle(
    landmarks[LANDMARKS.LEFT_HIP],
    landmarks[LANDMARKS.LEFT_KNEE],
    landmarks[LANDMARKS.LEFT_ANKLE]
);
```

#### 2. **Shoulder Asymmetry**
- **What it measures**: Shoulder height difference
- **Calculation**: Vertical distance between shoulders as body percentage
- **Normal range**: <1% of body height
- **Clinical significance**:
  - >2%: Potential scoliosis or muscle imbalance
  - >3%: Requires clinical evaluation

#### 3. **Hip Asymmetry**
- **What it measures**: Pelvic obliquity
- **Calculation**: Vertical distance between hip landmarks
- **Normal range**: <1% of body height
- **Clinical significance**: Indicates leg length discrepancy or pelvic dysfunction

#### 4. **Head Tilt**
- **What it measures**: Cervical lateral flexion
- **Calculation**: Angle between eye landmarks
- **Normal range**: <3°
- **Clinical significance**: Neck muscle imbalance, potential TMJ issues

#### 5. **Weight Distribution**
- **What it measures**: Left/right balance
- **Calculation**: Center of mass relative to midline
- **Normal range**: 45-55% per side
- **Clinical significance**: Compensation patterns, injury risk

### Side View Analysis

#### 1. **Forward Head Posture**
- **What it measures**: Anterior head carriage
- **Calculation**: Horizontal distance ear-shoulder as body percentage
- **Normal range**: <2% of body height
- **Clinical significance**:
  - >4%: Moderate forward head
  - >6%: Severe, high neck pain risk

```javascript
// Forward head calculation with calibration
const forwardHeadCm = calibrateToRealWorldEnhanced(
    Math.abs(ear.x - shoulder.x), 
    patientHeight, 
    imageMetadata, 
    landmarks
);
const forwardHeadPercent = convertToBodyPercentage(forwardHeadCm, patientHeight);
```

#### 2. **Pelvic Angle**
- **What it measures**: Anterior/posterior pelvic tilt
- **Calculation**: Angle of hip-knee line
- **Normal range**: 5-15° (10° ideal)
- **Clinical significance**:
  - <5°: Posterior tilt, flat back
  - >15°: Anterior tilt, increased lordosis

#### 3. **Kyphosis Angle**
- **What it measures**: Thoracic curvature
- **Calculation**: Angle between upper-mid-lower back points
- **Normal range**: 150-170° (160° ideal)
- **Clinical significance**:
  - <150°: Excessive kyphosis
  - >170°: Flat thoracic spine

### Back View Analysis

#### 1. **Spinal Deviation (Scoliosis Screen)**
- **What it measures**: Lateral spine curvature
- **Calculation**: Maximum deviation from vertical spine line
- **Normal range**: <2% of body height
- **Clinical significance**:
  - >3%: Possible scoliosis
  - >4%: Clinical evaluation recommended

#### 2. **Scapular Asymmetry**
- **What it measures**: Shoulder blade positioning
- **Calculation**: Difference in shoulder-elbow relationships
- **Normal range**: <1% of body height
- **Clinical significance**: Indicates muscle imbalance or thoracic dysfunction

## Calibration System

### Real-World Measurement Conversion

The system converts normalized MediaPipe coordinates (0-1) to real-world measurements using:

1. **Patient Height Reference**: User-provided height (default 170cm)
2. **Anatomical Landmarks**: Distance between consistent body landmarks
3. **Image Metadata**: Original image dimensions for aspect ratio

```javascript
// Calibration formula
const scaleFactor = patientHeight / estimatedBodyHeightInImage;
const realWorldMeasurement = pixelMeasurement * scaleFactor;
const bodyPercentage = (realWorldMeasurement / patientHeight) * 100;
```

### Measurement Units

- **Angles**: Degrees (°) - no calibration needed
- **Distances**: Body percentage (%) - calibrated to patient height
- **Asymmetries**: Body percentage (%) - normalized for comparison

## Deviation Scoring System

### Total Deviation Calculation

Each view contributes to a total deviation score:

```javascript
// Front view
totalDeviation = headTilt * 2 + 
                shoulderAsymmetry * 3 + 
                hipAsymmetry * 2 + 
                Math.abs(qAngle - 15);

// Side view  
totalDeviation = Math.abs(forwardHead) * 3 + 
                Math.abs(pelvicAngle - 10) + 
                Math.abs(kyphosisAngle - 160) * 0.5;

// Back view
totalDeviation = spinalDeviation * 5 + 
                scapularAsymmetry * 3;
```

### Overall Posture Score

```javascript
score = 100;
score -= Math.min(frontDeviation, 25);  // Max 25 point deduction per view
score -= Math.min(sideDeviation, 25);
score -= Math.min(backDeviation, 25);
finalScore = Math.max(0, score);  // 0-100 scale
```

## Risk Assessment Algorithm

### Injury Risk Calculation

The system calculates specific injury risks based on combined deviations:

#### 1. **Lower Back Pain Risk**
```javascript
risk = spinalDeviation * 5 + 
       Math.abs(pelvicAngle - 10) * 3 + 
       hipAsymmetry * 2;
// Capped at 100%
```

#### 2. **Neck Pain Risk**
```javascript
risk = Math.abs(forwardHead) * 5 + 
       shoulderAsymmetry * 3;
```

#### 3. **Knee Pain Risk**
```javascript
risk = Math.abs(qAngle - 15) * 4 + 
       hipAsymmetry * 2;
```

#### 4. **Shoulder Impingement Risk**
```javascript
risk = shoulderAsymmetry * 4 + 
       Math.abs(forwardHead) * 2;
```

### Risk Severity Classification

- **0-20%**: Low risk (green)
- **20-50%**: Moderate risk (yellow)
- **50-80%**: High risk (orange)
- **80-100%**: Very high risk (red)

## Temporal Smoothing & Quality Control

### Enhanced Pose Detection Features

1. **Multi-Frame Analysis**: Processes 5 frames per view for stability
2. **Temporal Smoothing**: Averages landmarks across frames
3. **Confidence Scoring**: Only accepts poses with >70% confidence
4. **Landmark Stability**: Checks frame-to-frame movement

```javascript
// Temporal smoothing algorithm
temporalSmoothing() {
    for (let i = 0; i < numLandmarks; i++) {
        let x = 0, y = 0, z = 0;
        this.landmarkHistory.forEach(frame => {
            x += frame[i].x;
            y += frame[i].y;
            z += frame[i].z || 0;
        });
        smoothed[i] = {
            x: x / frames,
            y: y / frames,
            z: z / frames
        };
    }
}
```

## Output & Reporting

### Visual Output

1. **Skeleton Overlay**: Color-coded pose visualization on each view
2. **Metric Cards**: Key measurements with severity indicators
3. **Risk Dashboard**: Visual representation of injury risks
4. **Charts**: 
   - Force distribution (left/right balance)
   - Movement pattern analysis
   - Risk assessment radar chart

### Data Export Format

```json
{
  "timestamp": "2024-01-31T10:30:00Z",
  "patientHeight": 170,
  "overallScore": 85,
  "views": {
    "front": {
      "qAngle": 16.5,
      "shoulderAsymmetry": 1.2,
      "hipAsymmetry": 0.8,
      "headTilt": 2.1,
      "weightDistribution": {
        "left": 48,
        "right": 52
      }
    },
    "side": {
      "forwardHead": 3.5,
      "pelvicAngle": 12.0,
      "kyphosisAngle": 155.0
    },
    "back": {
      "spinalDeviation": 1.8,
      "scapularAsymmetry": 0.9
    }
  },
  "risks": {
    "lowerBack": 25,
    "neck": 35,
    "knee": 15,
    "shoulder": 20
  },
  "recommendations": [...]
}
```

## Clinical Limitations & Disclaimers

1. **Not a Medical Diagnosis**: Results require clinical interpretation
2. **2D Limitations**: Cannot assess rotational deformities
3. **Clothing Effects**: Loose clothing may affect accuracy
4. **Static Analysis**: Does not capture dynamic dysfunction
5. **Calibration Accuracy**: Depends on accurate height input

## Quality Assurance

### Measurement Confidence

Each measurement includes a confidence score based on:
- Landmark visibility (>0.5 required)
- Temporal stability across frames
- Calibration success
- Image quality factors

### Error Handling

- Missing landmarks: Measurement skipped
- Low confidence: Warning displayed
- Calibration failure: Falls back to normalized values
- Processing timeout: 20 seconds per view

## Future Enhancements

1. **3D Analysis**: Integration of depth data when available
2. **Dynamic Assessment**: Video-based movement analysis
3. **AI Pattern Recognition**: Machine learning for pattern detection
4. **Clinical Integration**: Direct EHR connectivity
5. **Normative Database**: Age/gender-specific ranges

---

*This document represents the technical implementation as of January 2025. The system is in MVP stage and requires clinical validation before medical use.*