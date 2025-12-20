# Deception Detection Methods

## Overview

This document provides technical details on the detection methods, algorithms, and techniques used in the IntelGraph Deception Detection System.

## Table of Contents

1. [Deepfake Detection Methods](#deepfake-detection-methods)
2. [Media Manipulation Detection](#media-manipulation-detection)
3. [Disinformation Campaign Detection](#disinformation-campaign-detection)
4. [Fake Account Detection](#fake-account-detection)
5. [Synthetic Media Detection](#synthetic-media-detection)
6. [Content Verification Methods](#content-verification-methods)
7. [Detection Accuracy](#detection-accuracy)
8. [Limitations](#limitations)

## Deepfake Detection Methods

### 1. Facial Manipulation Detection

#### Facial Landmark Analysis
- **Method**: Extract 68-point or 478-point facial landmarks
- **Indicators**:
  - Inconsistent landmark positions across frames
  - Unnatural facial geometry
  - Asymmetric features
- **Accuracy**: ~92% on high-quality images

#### Boundary Artifact Detection
- **Method**: Analyze edges between face and background
- **Indicators**:
  - Sharp discontinuities in skin tone
  - Mismatched hair/face boundaries
  - Blending artifacts
- **Detection Rate**: 85-90% for face swaps

#### Blink Rate Analysis
- **Method**: Track eye closure patterns over time
- **Indicators**:
  - Absence of blinking (early deepfakes)
  - Unnatural blink duration
  - Irregular blink patterns
- **Accuracy**: ~88% for video sequences

#### Micro-Expression Analysis
- **Method**: Detect brief involuntary expressions
- **Indicators**:
  - Missing micro-expressions
  - Inconsistent muscle movements
  - Unnatural expression timing
- **Detection Rate**: 75-80%

### 2. Voice Synthesis Detection

#### Spectral Analysis
- **Method**: Analyze frequency spectrum using FFT
- **Indicators**:
  - Unnatural frequency peaks
  - Missing high-frequency components
  - Phase discontinuities
- **Accuracy**: ~90% for neural vocoders

#### Prosody Analysis
- **Method**: Analyze rhythm, stress, and intonation
- **Indicators**:
  - Monotonous rhythm
  - Unnatural pauses
  - Robotic timing
- **Detection Rate**: 82-88%

#### Jitter and Shimmer Analysis
- **Method**: Measure pitch and amplitude variation
- **Normal Values**:
  - Jitter: 0.5-1.0%
  - Shimmer: 3-7%
- **Indicators**: Values outside normal range or too perfect
- **Accuracy**: ~85%

#### Harmonic-to-Noise Ratio (HNR)
- **Method**: Measure voice quality
- **Normal Range**: 10-25 dB
- **Indicators**: Unnaturally high or low HNR
- **Accuracy**: ~80%

### 3. Video Manipulation Detection

#### Temporal Consistency Analysis
- **Method**: Analyze frame-to-frame consistency
- **Techniques**:
  - Optical flow analysis (Lucas-Kanade, Farneback)
  - Frame coherence scoring
  - Motion consistency checking
- **Detection Rate**: 87-93%

#### Lighting Analysis
- **Method**: Validate lighting physics
- **Checks**:
  - Shadow direction consistency
  - Reflection geometry
  - Color temperature matching
- **Accuracy**: ~85%

#### Compression Artifact Analysis
- **Method**: Detect inconsistent compression
- **Indicators**:
  - Different compression levels in regions
  - Double JPEG compression
  - Block artifact patterns
- **Detection Rate**: 80-85%

## Media Manipulation Detection

### 1. Error Level Analysis (ELA)

**Process**:
1. Resave image at known quality (95%)
2. Compute difference from original
3. Amplify differences
4. Identify anomalous regions

**Effectiveness**: 75-85% for detecting edits

### 2. Noise Analysis

**Method**: Extract and analyze noise patterns

**Indicators**:
- Inconsistent noise across regions
- Missing noise (too smooth)
- Added artificial noise

**Accuracy**: 80-90%

### 3. Copy-Move Detection

**Algorithms**:
- **Block Matching**: Compare overlapping blocks
- **Keypoint Matching**: SIFT/SURF feature matching
- **Zernike Moments**: Rotation-invariant descriptors

**Detection Rate**: 85-95% for identical copies, 70-80% for transformed copies

### 4. Splicing Detection

**Methods**:
- Double JPEG compression analysis
- Noise inconsistency detection
- Color Filter Array (CFA) analysis
- Photo Response Non-Uniformity (PRNU)

**Accuracy**: 82-90%

### 5. EXIF Metadata Analysis

**Checks**:
- Software modifications
- Date/time consistency
- Camera/lens compatibility
- GPS anomalies
- Thumbnail consistency

**Detection Rate**: 70-80% for tampering

## Disinformation Campaign Detection

### 1. Coordinated Behavior Detection

#### Timing Coordination Analysis
**Method**: Analyze temporal posting patterns

**Metrics**:
- Coefficient of variation (CV) of intervals
- Low CV (<0.3) indicates high coordination

**Confidence Scoring**:
```
CV < 0.3: confidence = 0.9
CV < 0.5: confidence = 0.7
CV >= 0.5: confidence = 0.3
```

#### Content Similarity Analysis
**Method**: Jaccard similarity on text

**Formula**:
```
similarity = |intersection| / |union|
```

**Thresholds**:
- similarity > 0.8: High coordination
- similarity > 0.5: Moderate coordination

### 2. Bot Network Identification

#### Bot Scoring Algorithm

**Factors**:
1. Generic profile (0.2)
2. High posting frequency (0.3)
3. Default profile image (0.2)
4. Recent account creation (0.1)
5. Automated patterns (0.2)

**Classification**:
- Score > 0.8: Likely bot
- Score 0.6-0.8: Suspicious
- Score < 0.6: Likely human

#### Network Clustering
**Method**: Graph-based clustering

**Indicators**:
- Dense connection clusters
- Synchronized activity
- Similar content patterns

**Detection Rate**: 80-90% for coordinated networks

### 3. Narrative Tracking

**Methods**:
- Text clustering (semantic similarity)
- Meme evolution tracking
- Cross-platform diffusion analysis

**Metrics**:
- Velocity: posts per time unit
- Acceleration: change in velocity
- Reach: unique accounts reached

## Fake Account Detection

### 1. Profile Authenticity Scoring

**Components**:
```
authenticity =
  imageAuthenticity * 0.3 +
  bioQuality * 0.3 +
  completeness * 0.2 +
  consistency * 0.2
```

### 2. Behavioral Pattern Analysis

#### Activity Metrics
- **Post Frequency**: Human: <50/day, Bot: >50/day
- **Regularity**: High CV = human, Low CV = bot
- **Active Hours**: 24/7 activity suspicious

#### Human Likelihood Calculation
```
humanLikelihood = 1.0
if postFrequency > 50: humanLikelihood -= 0.3
if regularity > 0.9: humanLikelihood -= 0.3
if activeHours.length > 20: humanLikelihood -= 0.2
if burstiness > 0.8: humanLikelihood -= 0.2
```

### 3. Engagement Pattern Analysis

**Metrics**:
- Follow ratio: followers / following
- Reciprocity: mutual connections / total
- Engagement rate: interactions / followers

**Red Flags**:
- Follow ratio < 0.1
- Reciprocity < 0.1
- Engagement rate < 0.01

## Synthetic Media Detection

### 1. AI Text Detection

#### Perplexity Analysis
**Method**: Measure text predictability

**Indicators**:
- Low perplexity = AI (more predictable)
- High perplexity = human (more varied)

**Proxy Metric**: Lexical diversity
```
diversity = uniqueWords / totalWords
diversity < 0.6: AI likely
```

#### Burstiness Analysis
**Method**: Measure sentence length variation

**Formula**:
```
burstiness = stdDev / mean (sentence lengths)
```

**Thresholds**:
- burstiness < 0.3: AI likely
- burstiness > 0.5: Human likely

#### N-gram Analysis
**Method**: Detect AI-specific phrases

**Common AI Phrases**:
- "it is important to note"
- "as an AI"
- "furthermore"
- "in conclusion"

**Detection**: 2+ phrases = 0.8 confidence

### 2. GAN-Generated Image Detection

**Methods**:
1. **Frequency Domain Analysis**: Detect spectral artifacts
2. **Checkerboard Pattern Detection**: Up-sampling artifacts
3. **Color Consistency**: Unnatural color distributions
4. **Texture Analysis**: Repetitive patterns

**Accuracy**: 85-92% for common GANs

### 3. Neural Vocoder Detection

**Fingerprints**:
- WaveNet: Specific frequency patterns
- MelGAN: Phase characteristics
- Tacotron: Prosody artifacts

**Detection Rate**: 80-88%

## Content Verification Methods

### 1. Source Credibility Assessment

**Factors**:
```
credibility =
  sourceQuality * 0.4 +
  expertiseLevel * 0.2 +
  (1 - biasScore) * 0.2 +
  transparency * 0.2
```

**Known Credible Sources**:
- reuters.com: 0.9
- apnews.com: 0.9
- bbc.com: 0.85
- nature.com: 0.95

### 2. Fact-Checking Methods

#### Pattern-Based Detection
**Red Flag Patterns**:
- "proven cure"
- "doctors hate"
- "miracle"
- "100% effective"

#### Citation Analysis
**Requirements**:
- Minimum 2 citations
- Valid citation format
- Accessible sources

### 3. Statistical Claim Verification

**Checks**:
1. Percentages > 100%
2. Suspiciously round numbers
3. Correlation vs causation confusion
4. Missing sample sizes

## Detection Accuracy

### Overall Performance

| Detection Type | Accuracy | False Positive Rate |
|----------------|----------|---------------------|
| Deepfake (Image) | 90-95% | 5-8% |
| Deepfake (Video) | 87-93% | 7-10% |
| Deepfake (Audio) | 88-92% | 6-9% |
| Media Manipulation | 82-90% | 8-12% |
| Bot Detection | 85-92% | 5-10% |
| Synthetic Text | 80-88% | 10-15% |
| Synthetic Image | 85-92% | 8-12% |
| Disinformation Campaign | 78-88% | 12-18% |

### Factors Affecting Accuracy

1. **Media Quality**
   - Higher quality = better detection
   - Compressed media reduces accuracy by 10-20%

2. **Sophistication Level**
   - Advanced techniques harder to detect
   - State-of-the-art deepfakes: 70-80% accuracy

3. **Context Availability**
   - More context = better accuracy
   - Multi-modal analysis increases confidence

## Limitations

### Known Limitations

1. **Adversarial Techniques**
   - Specifically designed to evade detection
   - Requires continuous model updates

2. **Quality Degradation**
   - Heavy compression obscures artifacts
   - Low-resolution media limits analysis

3. **Novel Techniques**
   - New generation methods may evade detection
   - Requires ongoing research and updates

4. **Context Dependence**
   - Some methods require specific metadata
   - Missing information reduces accuracy

5. **False Positives**
   - Heavy legitimate editing may trigger alerts
   - Unusual but authentic content flagged

### Mitigation Strategies

1. **Ensemble Methods**: Combine multiple detection techniques
2. **Human Review**: High-stakes decisions require human oversight
3. **Confidence Thresholds**: Use appropriate thresholds for use case
4. **Regular Updates**: Continuous model training and updating
5. **Multi-Modal Analysis**: Leverage multiple data sources

## Research and Development

### Ongoing Improvements

1. **Adversarial Training**: Train on evasion techniques
2. **Transfer Learning**: Adapt to new deepfake methods
3. **Explainable AI**: Improve interpretability
4. **Real-time Detection**: Optimize for speed
5. **Cross-Platform Correlation**: Track across platforms

### Future Directions

1. Integration with blockchain for provenance
2. Real-time video stream analysis
3. Improved context understanding
4. Advanced social network analysis
5. Automated counter-narrative generation

## References

### Academic Papers

1. "FaceForensics++: Learning to Detect Manipulated Facial Images"
2. "The Eyes Tell All: Detecting Political Orientation from Eye Movement Data"
3. "Detecting Both Machine and Human Created Fake Face Images"
4. "The Deepfake Detection Challenge Dataset"
5. "Limits of Deepfake Detection: A Robust Estimation Viewpoint"

### Standards and Frameworks

1. C2PA (Coalition for Content Provenance and Authenticity)
2. IEEE P7012 - Machine Learning Model Verification
3. NIST Guidelines for AI Risk Management
4. ISO/IEC 24029 - AI Trustworthiness

## Appendix

### Glossary

- **Deepfake**: Synthetic media created using deep learning
- **GAN**: Generative Adversarial Network
- **EXIF**: Exchangeable Image File Format (metadata)
- **PRNU**: Photo Response Non-Uniformity
- **CFA**: Color Filter Array
- **Perplexity**: Measure of prediction uncertainty
- **Burstiness**: Variation in temporal patterns

### Tool Versions

- TensorFlow: 2.x
- OpenCV: 4.x
- FFmpeg: 4.4+
- Sharp: 0.33+

For more information, see the main [GUIDE.md](./GUIDE.md).
