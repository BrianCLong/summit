# Deception Detection System - User Guide

## Overview

The IntelGraph Deception Detection System is a comprehensive, enterprise-grade platform for identifying deepfakes, manipulated media, disinformation campaigns, and synthetic content. This guide covers all aspects of using the system effectively.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Architecture](#architecture)
3. [Packages](#packages)
4. [Services](#services)
5. [API Reference](#api-reference)
6. [Use Cases](#use-cases)
7. [Best Practices](#best-practices)
8. [Performance](#performance)

## Getting Started

### Installation

```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm -w run build

# Start services
pnpm -F @intelgraph/deception-detection-service start
pnpm -F @intelgraph/authenticity-service start
```

### Quick Start Example

```typescript
import { UnifiedDeceptionDetector } from '@intelgraph/deception-detector';

const detector = new UnifiedDeceptionDetector();

// Analyze for deception
const result = await detector.analyzeComprehensive({
  text: "Content to analyze",
  media: imageBuffer,
  account: accountData,
  network: connectionData
});

console.log(`Deceptive: ${result.isDeceptive}`);
console.log(`Confidence: ${result.overallScore}`);
console.log(`Severity: ${result.severity}`);
```

## Architecture

### System Components

The deception detection system consists of multiple specialized packages and two main services:

```
┌─────────────────────────────────────────────────────────┐
│            Unified Deception Detector                   │
│                 (Main Interface)                        │
└──────────────────┬──────────────────────────────────────┘
                   │
         ┌─────────┼─────────┐
         │         │         │
    ┌────▼───┐ ┌──▼───┐ ┌───▼────┐
    │Deepfake│ │Media │ │Disinfor│
    │Detector│ │Manip.│ │Campaign│
    └────────┘ └──────┘ └────────┘
         │         │         │
    ┌────▼───┐ ┌──▼───┐ ┌───▼────┐
    │Fake    │ │Synth.│ │Content │
    │Account │ │Media │ │Verify  │
    └────────┘ └──────┘ └────────┘
```

### Service Architecture

```
┌──────────────────────────────────────────────────┐
│        Application Layer                         │
└────────────┬─────────────────────────────────────┘
             │
     ┌───────┴───────┐
     │               │
┌────▼────┐    ┌────▼─────────┐
│Deception│    │Authenticity  │
│Detection│    │Service       │
│Service  │    │              │
│Port 3100│    │Port 3101     │
└─────────┘    └──────────────┘
```

## Packages

### 1. Deepfake Detection (`@intelgraph/deepfake-detection`)

Detects deepfakes across multiple modalities.

**Features:**
- Facial manipulation detection
- Voice synthesis identification
- Video manipulation analysis
- Temporal consistency checking
- GAN artifact detection
- Biometric anomaly detection

**Usage:**

```typescript
import { DeepfakeDetector } from '@intelgraph/deepfake-detection';

const detector = new DeepfakeDetector();

const result = await detector.detectDeepfake({
  type: 'image',
  buffer: imageBuffer,
  metadata: { frameRate: 30 }
});

console.log(`Deepfake: ${result.isDeepfake}`);
console.log(`Confidence: ${result.confidence}`);
console.log(`Method: ${result.detectionMethod}`);
```

### 2. Media Manipulation (`@intelgraph/media-manipulation`)

Detects photo editing, splicing, and tampering.

**Features:**
- Copy-paste detection
- Splicing detection
- Content-aware fill detection
- EXIF metadata analysis
- Compression analysis
- Provenance tracking

**Usage:**

```typescript
import { MediaManipulationDetector } from '@intelgraph/media-manipulation';

const detector = new MediaManipulationDetector();

const result = await detector.detectManipulation(imageBuffer);

console.log(`Manipulated: ${result.isManipulated}`);
console.log(`Manipulations found: ${result.manipulations.length}`);
```

### 3. Disinformation Detection (`@intelgraph/disinformation-detection`)

Identifies coordinated campaigns and bot networks.

**Features:**
- Coordinated behavior detection
- Bot network identification
- Narrative tracking
- Influence network mapping
- Amplification detection
- Super-spreader identification

**Usage:**

```typescript
import { DisinformationDetector } from '@intelgraph/disinformation-detection';

const detector = new DisinformationDetector();

const result = await detector.analyzeCampaign({
  content: posts,
  accounts: accountList,
  network: connections
});

console.log(`Campaign detected: ${result.campaignDetected}`);
console.log(`Bot networks: ${result.botNetworks.length}`);
```

### 4. Fake Account Detection (`@intelgraph/fake-account-detection`)

Identifies bots, sockpuppets, and fake accounts.

**Features:**
- Bot scoring
- Sockpuppet detection
- Profile authenticity assessment
- Behavior pattern analysis
- Network analysis
- Engagement pattern analysis

**Usage:**

```typescript
import { FakeAccountDetector } from '@intelgraph/fake-account-detection';

const detector = new FakeAccountDetector();

const result = await detector.analyzeAccount({
  id: 'user123',
  profile: profileData,
  activity: activityData,
  connections: connectionList
});

console.log(`Fake: ${result.isFake}`);
console.log(`Account type: ${result.accountType}`);
console.log(`Bot score: ${result.behaviorAnalysis.activityPattern.humanLikelihood}`);
```

### 5. Synthetic Media Detection (`@intelgraph/synthetic-media`)

Detects AI-generated content.

**Features:**
- AI text detection (GPT, Claude, etc.)
- GAN-generated image detection
- Neural vocoder detection
- Generator identification
- Model fingerprinting
- Training artifact detection

**Usage:**

```typescript
import { SyntheticMediaDetector, MediaType } from '@intelgraph/synthetic-media';

const detector = new SyntheticMediaDetector();

const result = await detector.detect({
  type: MediaType.TEXT,
  content: "Text to analyze"
});

console.log(`Synthetic: ${result.isSynthetic}`);
console.log(`Generator: ${result.generatorType}`);
```

### 6. Content Verification (`@intelgraph/content-verification`)

Fact-checking and authenticity verification.

**Features:**
- Automated fact-checking
- Source credibility assessment
- Citation verification
- Scientific claim validation
- Statistical claim checking
- Context manipulation detection

**Usage:**

```typescript
import { ContentVerifier } from '@intelgraph/content-verification';

const verifier = new ContentVerifier();

const result = await verifier.verifyContent({
  text: contentText,
  source: sourceURL,
  claims: extractedClaims
});

console.log(`Authentic: ${result.isAuthentic}`);
console.log(`Credibility: ${result.credibility.overall}`);
console.log(`Fact checks: ${result.factChecks.length}`);
```

## Services

### Deception Detection Service (Port 3100)

REST API for all deception detection capabilities.

**Endpoints:**

- `POST /api/detect/comprehensive` - Multi-modal analysis
- `POST /api/detect/deepfake` - Deepfake detection
- `POST /api/detect/manipulation` - Media manipulation
- `POST /api/detect/disinformation` - Campaign detection
- `POST /api/detect/fake-account` - Fake account detection
- `POST /api/detect/synthetic-media` - AI-generated content
- `POST /api/verify/content` - Content verification
- `POST /api/analyze/behavior` - Behavioral analysis
- `POST /api/analyze/misinformation-spread` - Spread analysis
- `POST /api/detect/platform-manipulation` - Platform manipulation

### Authenticity Service (Port 3101)

REST API for verification workflows.

**Endpoints:**

- `POST /api/verify/comprehensive` - Full verification
- `POST /api/verify/provenance` - Provenance chain
- `POST /api/verify/metadata` - Metadata analysis
- `POST /api/verify/fact-check` - Fact-checking
- `POST /api/verify/source-credibility` - Source assessment
- `POST /api/create/provenance-record` - Create record
- `POST /api/verify/scientific-claim` - Scientific verification
- `POST /api/verify/statistical-claim` - Statistical verification

## API Reference

### Comprehensive Analysis

```bash
curl -X POST http://localhost:3100/api/detect/comprehensive \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Content to analyze",
    "media": "<base64-encoded-image>",
    "account": {
      "id": "user123",
      "profile": {...},
      "activity": {...}
    },
    "network": [...]
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "overallScore": 0.75,
    "isDeceptive": true,
    "severity": "high",
    "categories": [
      {
        "name": "Deepfake Detection",
        "detected": true,
        "confidence": 0.85,
        "details": {...}
      }
    ],
    "recommendations": [
      "Multiple deception indicators detected",
      "Verify with independent sources"
    ]
  }
}
```

## Use Cases

### 1. Media Verification for News Organizations

Verify images and videos before publication:

```typescript
const detector = new MediaManipulationDetector();
const deepfakeDetector = new DeepfakeDetector();

// Check for manipulation
const manipResult = await detector.detectManipulation(imageBuffer);

if (manipResult.isManipulated) {
  console.log('⚠️ Image manipulation detected');
}

// Check for deepfakes
const deepfakeResult = await deepfakeDetector.detectDeepfake({
  type: 'image',
  buffer: imageBuffer
});

if (deepfakeResult.isDeepfake) {
  console.log('⚠️ Deepfake detected');
}
```

### 2. Social Media Platform Moderation

Detect and flag fake accounts:

```typescript
const accountDetector = new FakeAccountDetector();

for (const account of suspiciousAccounts) {
  const result = await accountDetector.analyzeAccount(account);

  if (result.isFake && result.confidence > 0.8) {
    await flagAccount(account.id, result);
  }
}
```

### 3. Disinformation Campaign Monitoring

Track and analyze coordinated campaigns:

```typescript
const disinfoDetector = new DisinformationDetector();

const result = await disinfoDetector.analyzeCampaign({
  content: recentPosts,
  accounts: involvedAccounts,
  network: connections
});

if (result.campaignDetected) {
  console.log(`Campaign confidence: ${result.confidence}`);
  console.log(`Bot networks: ${result.botNetworks.length}`);
  console.log(`Super-spreaders: ${result.influenceMap.superSpreaders}`);
}
```

### 4. Content Fact-Checking

Verify claims and assess credibility:

```typescript
const verifier = new ContentVerifier();

const result = await verifier.verifyContent({
  text: article.text,
  source: article.source,
  claims: article.claims
});

console.log(`Overall authenticity: ${result.confidence}`);
console.log(`Source credibility: ${result.credibility.overall}`);

for (const factCheck of result.factChecks) {
  console.log(`Claim: ${factCheck.claim}`);
  console.log(`Verdict: ${factCheck.verdict}`);
}
```

## Best Practices

### 1. Multi-Modal Analysis

Always use multiple detection methods for higher confidence:

```typescript
const unifiedDetector = new UnifiedDeceptionDetector();

// Analyze across all modalities
const result = await unifiedDetector.analyzeComprehensive({
  media: imageBuffer,
  text: caption,
  account: posterAccount,
  network: sharers
});
```

### 2. Confidence Thresholds

Use appropriate thresholds based on use case:

```typescript
const THRESHOLDS = {
  automated_action: 0.9,    // High confidence for automation
  flag_for_review: 0.7,     // Medium confidence for flagging
  warning_label: 0.5,       // Low confidence for warnings
};

if (result.confidence > THRESHOLDS.automated_action) {
  await removeContent(contentId);
} else if (result.confidence > THRESHOLDS.flag_for_review) {
  await flagForHumanReview(contentId);
} else if (result.confidence > THRESHOLDS.warning_label) {
  await addWarningLabel(contentId);
}
```

### 3. Performance Optimization

Process in batches for large-scale analysis:

```typescript
async function processBatch(items: any[], batchSize: number) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(item => detector.analyze(item))
    );
    await processResults(results);
  }
}
```

### 4. Logging and Auditing

Keep detailed logs for all detections:

```typescript
async function detectWithLogging(content: any) {
  const startTime = Date.now();
  const result = await detector.analyze(content);

  await logDetection({
    contentId: content.id,
    timestamp: new Date(),
    processingTime: Date.now() - startTime,
    result: result,
    confidence: result.confidence,
    method: 'unified_detector'
  });

  return result;
}
```

## Performance

### Benchmarks

Typical processing times on standard hardware:

| Operation | Time | Throughput |
|-----------|------|------------|
| Image deepfake detection | 200-500ms | 2-5 images/sec |
| Text authenticity check | 50-100ms | 10-20 texts/sec |
| Account analysis | 100-200ms | 5-10 accounts/sec |
| Campaign analysis | 1-5s | Depends on network size |

### Optimization Tips

1. **Use caching** for repeated analyses
2. **Batch processing** for bulk operations
3. **Async processing** for non-blocking workflows
4. **GPU acceleration** for image/video analysis
5. **Distributed processing** for large-scale operations

## Support

For issues, questions, or contributions:

- **Documentation**: `/docs/deception/`
- **API Reference**: See service `/api/capabilities` endpoints
- **Detection Methods**: See `DETECTION_METHODS.md`

## License

MIT License - See LICENSE file for details.
