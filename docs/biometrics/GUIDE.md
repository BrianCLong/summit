# Biometric and Identity Intelligence Platform Guide

## Overview

The IntelGraph Biometric and Identity Intelligence Platform provides comprehensive capabilities for biometric processing, identity resolution, watchlist screening, and behavioral analysis for intelligence and security applications.

## Table of Contents

1. [Architecture](#architecture)
2. [Getting Started](#getting-started)
3. [Core Capabilities](#core-capabilities)
4. [API Reference](#api-reference)
5. [Integration Guide](#integration-guide)
6. [Security](#security)
7. [Performance](#performance)
8. [Troubleshooting](#troubleshooting)

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Integration Layer                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Border   │  │ Law      │  │ Visa     │  │ Financial│   │
│  │ Control  │  │ Enforce. │  │ Systems  │  │ KYC      │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                       API Gateway                            │
│              Authentication & Authorization                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Core Services                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Biometric   │  │   Identity   │  │  Watchlist   │     │
│  │   Service    │  │   Fusion     │  │  Screening   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Processing Engines                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Facial   │  │Behavioral│  │ Document │  │   Risk   │   │
│  │Recognition│  │ Analysis │  │   Verify │  │ Scoring  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │PostgreSQL│  │  Redis   │  │  Vector  │  │  Audit   │   │
│  │ (Primary)│  │  (Cache) │  │   DB     │  │   Log    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Capture**: Biometric data captured from devices
2. **Quality Check**: Assess quality of biometric samples
3. **Extraction**: Extract biometric templates/features
4. **Enrollment**: Store templates in database
5. **Matching**: Compare against gallery (1:1 or 1:N)
6. **Screening**: Check against watchlists
7. **Fusion**: Combine multiple modalities
8. **Decision**: Accept, reject, or manual review

## Getting Started

### Prerequisites

- Node.js 18+ or TypeScript 5+
- PostgreSQL 14+
- Redis 7+
- Docker (optional)

### Installation

```bash
# Install packages
pnpm install

# Build packages
pnpm run build

# Setup database
psql -U postgres -d biometrics -f services/biometric-service/schema.sql

# Start services
pnpm --filter @intelgraph/biometric-service dev
pnpm --filter @intelgraph/identity-fusion-service dev
```

### Quick Start Example

```typescript
import { BiometricService } from '@intelgraph/biometric-service';
import { BiometricModality } from '@intelgraph/biometrics';

const service = new BiometricService();

// Enroll a person with face biometric
const person = await service.enrollPerson({
  templates: [{
    id: crypto.randomUUID(),
    modality: BiometricModality.FACE,
    format: 'JPEG',
    data: base64EncodedImage,
    quality: {
      score: 85,
      isAcceptable: true,
      timestamp: new Date().toISOString()
    },
    captureDate: new Date().toISOString(),
    source: 'enrollment_station_1'
  }],
  metadata: {
    firstName: 'John',
    lastName: 'Doe'
  }
});

console.log('Enrolled person:', person.personId);

// Screen against watchlists
const screeningResult = await service.screenWatchlists({
  requestId: crypto.randomUUID(),
  requestType: 'VERIFICATION',
  priority: 'HIGH',
  subject: {
    identityId: person.personId,
    biometricData: [{
      modality: BiometricModality.FACE,
      templateId: person.templates[0].id
    }]
  },
  context: {
    timestamp: new Date().toISOString(),
    location: 'Airport Terminal 1'
  }
});

console.log('Screening result:', screeningResult.recommendation);
```

## Core Capabilities

### 1. Facial Biometrics

#### Face Detection

```typescript
import { FaceDetection } from '@intelgraph/facial-recognition';

// Detect faces in image
const detection: FaceDetection = {
  faceId: crypto.randomUUID(),
  boundingBox: {
    x: 100,
    y: 150,
    width: 200,
    height: 200
  },
  confidence: 0.98,
  landmarks: [
    { type: 'LEFT_EYE', x: 150, y: 180, confidence: 0.99 },
    { type: 'RIGHT_EYE', x: 250, y: 180, confidence: 0.99 },
    { type: 'NOSE_TIP', x: 200, y: 220, confidence: 0.97 }
  ],
  pose: {
    roll: 2.5,
    pitch: -5.0,
    yaw: 10.0
  },
  quality: {
    score: 85,
    isAcceptable: true,
    timestamp: new Date().toISOString()
  }
};
```

#### Face Recognition

```typescript
import { FaceEncoding } from '@intelgraph/facial-recognition';

// Extract face encoding
const encoding: FaceEncoding = {
  encodingId: crypto.randomUUID(),
  algorithm: 'FACENET',
  version: '2023.1',
  vector: [0.12, -0.45, 0.78, /* ... 512 dimensions */],
  dimensions: 512,
  normalized: true,
  quality: qualityScore,
  metadata: {
    extractionTime: 150,
    imageSize: { width: 1920, height: 1080 }
  }
};
```

#### Age Progression

```typescript
import { AgeProgression } from '@intelgraph/facial-recognition';

// Age progress a face photo
const progression: AgeProgression = {
  sourceAge: 25,
  targetAge: 45,
  sourceImage: 'base64_encoded_image',
  progressedImage: 'base64_aged_image',
  method: 'GAN',
  confidence: 0.82,
  metadata: {
    processingTime: 5000,
    modelVersion: 'v2.1'
  }
};
```

### 2. Behavioral Biometrics

#### Gait Analysis

```typescript
import { GaitSignature } from '@intelgraph/behavioral-analysis';

const gaitSignature: GaitSignature = {
  signatureId: crypto.randomUUID(),
  personId: personId,
  features: [/* gait features */],
  summary: {
    averageVelocity: 1.3,
    averageCadence: 110,
    gaitPattern: 'NORMAL',
    asymmetry: 0.05,
    stability: 0.92
  },
  captureInfo: {
    duration: 10,
    distance: 13,
    viewAngle: 90,
    resolution: '1920x1080'
  }
};
```

#### Keystroke Dynamics

```typescript
import { KeystrokeProfile } from '@intelgraph/behavioral-analysis';

const keystrokeProfile: KeystrokeProfile = {
  profileId: crypto.randomUUID(),
  sessionId: sessionId,
  events: [/* keystroke events */],
  statistics: {
    averageDwellTime: 95,
    dwellTimeStdDev: 15,
    averageFlightTime: 180,
    flightTimeStdDev: 30,
    typingSpeed: 65, // WPM
    errorRate: 0.02,
    backspaceFrequency: 0.08,
    pausePatterns: []
  }
};
```

### 3. Identity Resolution

#### Cross-Source Matching

```typescript
import { IdentityFusionService } from '@intelgraph/identity-fusion-service';

const service = new IdentityFusionService();

// Resolve identity across multiple sources
const resolution = await service.resolveIdentity({
  targetIdentity: {
    type: 'PERSON',
    biographicData: {
      fullName: 'John Doe',
      dateOfBirth: '1980-01-15',
      nationality: ['US']
    }
  },
  sources: ['border_database', 'visa_system', 'law_enforcement'],
  threshold: 80
});
```

#### Multi-Modal Fusion

```typescript
// Fuse face + fingerprint + iris
const fusionResult = await service.fuseBiometrics({
  identityId: personId,
  modalityScores: [
    { modality: 'FACE', score: 85, confidence: 0.92 },
    { modality: 'FINGERPRINT', score: 92, confidence: 0.95 },
    { modality: 'IRIS', score: 88, confidence: 0.90 }
  ],
  strategy: 'SCORE_LEVEL',
  threshold: 80
});

// Result: fusedScore = 88.2, fusedConfidence = 0.93
console.log('Fused result:', fusionResult.isMatch); // true
```

### 4. Watchlist Screening

#### Screen Subject

```typescript
import { ScreeningRequest } from '@intelgraph/watchlist-screening';

const screeningRequest: ScreeningRequest = {
  requestId: crypto.randomUUID(),
  requestType: 'IDENTIFICATION',
  priority: 'HIGH',
  subject: {
    biographicData: {
      fullName: 'John Doe',
      dateOfBirth: '1980-01-15',
      nationality: 'US'
    },
    biometricData: [{
      modality: 'FACE',
      templateId: faceTemplateId
    }]
  },
  thresholds: {
    biometric: 85,
    biographic: 80,
    overall: 82
  },
  context: {
    location: 'JFK Airport',
    timestamp: new Date().toISOString(),
    operator: 'officer_123',
    purpose: 'border_control'
  }
};

const result = await service.screenWatchlists(screeningRequest);
```

#### Handle Alerts

```typescript
import { Alert } from '@intelgraph/watchlist-screening';

if (result.status === 'HIGH_CONFIDENCE_MATCH') {
  // Generate alert for review
  const alert: Alert = {
    alertId: crypto.randomUUID(),
    screeningResultId: result.resultId,
    alertType: 'WATCHLIST_HIT',
    severity: 'HIGH',
    status: 'NEW',
    subject: {
      identityId: personId,
      name: 'John Doe'
    },
    priority: 'URGENT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    escalated: true
  };

  // Route to appropriate personnel
  await routeAlert(alert);
}
```

### 5. Document Verification

#### Verify Travel Document

```typescript
import { DocumentVerification } from '@intelgraph/document-verification';

const verification: DocumentVerification = {
  verificationId: crypto.randomUUID(),
  document: documentRecord,
  mrz: mrzData,
  authentication: {
    authenticationId: crypto.randomUUID(),
    documentId: documentRecord.documentId,
    authentic: true,
    confidence: 0.95,
    overallScore: 95,
    securityFeatures: [
      { featureType: 'HOLOGRAM', detected: true, authentic: true, confidence: 0.98 },
      { featureType: 'UV_FEATURE', detected: true, authentic: true, confidence: 0.96 },
      { featureType: 'WATERMARK', detected: true, authentic: true, confidence: 0.94 }
    ],
    metadata: {
      processingTime: 2500,
      algorithmVersion: '3.1',
      timestamp: new Date().toISOString()
    }
  },
  overallResult: {
    verified: true,
    confidence: 0.95,
    score: 95,
    recommendation: 'ACCEPT'
  },
  metadata: {
    totalProcessingTime: 3000,
    verificationDate: new Date().toISOString(),
    verifiedBy: 'system',
    location: 'border_post_1'
  }
};
```

## API Reference

### Biometric Service API

#### POST /api/v1/enroll
Enroll a new person with biometric data.

**Request:**
```json
{
  "templates": [{
    "id": "uuid",
    "modality": "FACE",
    "format": "JPEG",
    "data": "base64_encoded",
    "quality": { "score": 85, "isAcceptable": true },
    "captureDate": "2025-11-20T10:00:00Z",
    "source": "enrollment_station"
  }],
  "metadata": { "firstName": "John", "lastName": "Doe" }
}
```

**Response:**
```json
{
  "personId": "uuid",
  "enrollmentDate": "2025-11-20T10:00:00Z",
  "status": "ACTIVE"
}
```

#### POST /api/v1/verify
Verify 1:1 biometric match.

#### POST /api/v1/identify
Identify 1:N biometric search.

#### POST /api/v1/screen
Screen against watchlists.

#### GET /api/v1/persons/:personId
Retrieve person record.

### Identity Fusion Service API

#### POST /api/v1/fuse
Fuse multiple biometric modalities.

#### POST /api/v1/resolve
Resolve identity across sources.

#### GET /api/v1/graph/:identityId
Build identity relationship graph.

#### POST /api/v1/attribute
Attribute digital activities to identity.

## Integration Guide

### Border Control Integration

```typescript
import { BiometricService } from '@intelgraph/biometric-service';

class BorderControlSystem {
  private biometricService: BiometricService;

  async processTraveler(traveler: Traveler) {
    // 1. Capture biometrics
    const faceImage = await captureFaceImage();
    const fingerprints = await captureFingerprints();

    // 2. Screen against watchlists
    const screening = await this.biometricService.screenWatchlists({
      requestId: crypto.randomUUID(),
      requestType: 'BORDER_CROSSING',
      priority: 'HIGH',
      subject: {
        biometricData: [
          { modality: 'FACE', templateId: await extractTemplate(faceImage) },
          { modality: 'FINGERPRINT', templateId: await extractTemplate(fingerprints) }
        ],
        documentData: traveler.passport
      },
      context: {
        timestamp: new Date().toISOString(),
        location: 'POE_Airport_Terminal_1'
      }
    });

    // 3. Make decision
    if (screening.recommendation === 'CLEAR') {
      return { decision: 'ADMIT', screening };
    } else if (screening.recommendation === 'SECONDARY_SCREENING') {
      return { decision: 'REFER_SECONDARY', screening };
    } else {
      return { decision: 'DENY', screening };
    }
  }
}
```

### Law Enforcement Integration

```typescript
import { IdentityFusionService } from '@intelgraph/identity-fusion-service';

class InvestigationSystem {
  async investigateSuspect(evidence: Evidence) {
    // Build identity graph from evidence
    const graph = await fusionService.buildIdentityGraph(evidence.subjectId);

    // Find aliases and related identities
    const aliases = graph.edges.filter(e => e.edgeType === 'ALIAS_OF');

    // Search across databases
    const matches = await identifyAcrossDatabases(evidence.biometrics);

    return {
      graph,
      aliases,
      matches,
      riskAssessment: await assessRisk(evidence.subjectId)
    };
  }
}
```

## Security

### Authentication

```typescript
// JWT-based authentication
app.use((req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});
```

### Authorization

```typescript
// Role-based access control
function requireRole(role: string) {
  return (req, res, next) => {
    if (!req.user.roles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

app.post('/api/v1/enroll', requireRole('ENROLLMENT_OFFICER'), enrollHandler);
app.post('/api/v1/screen', requireRole('SCREENING_OFFICER'), screenHandler);
```

### Encryption

All biometric data encrypted at rest with AES-256:

```typescript
import crypto from 'crypto';

function encryptBiometric(data: string, key: Buffer): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}
```

## Performance

### Throughput Benchmarks

- **Face enrollment**: 100 enrollments/second
- **1:1 verification**: 1000 verifications/second
- **1:N identification**: 100,000 searches/second (1M gallery)
- **Watchlist screening**: 500 screenings/second

### Optimization Tips

1. **Use Redis caching** for frequently accessed data
2. **Batch operations** when possible
3. **Enable vector indexing** for fast similarity search
4. **Partition databases** by date/region for large scale
5. **Use async processing** for non-real-time operations

## Troubleshooting

### Common Issues

#### Poor Match Quality

```typescript
// Check biometric quality before matching
if (template.quality.score < 70) {
  console.warn('Low quality biometric sample');
  // Request recapture
}
```

#### Slow Identification

```typescript
// Add database indexes
CREATE INDEX idx_vectors ON biometric_vectors USING ivfflat (vector_data);

// Use filters to reduce search space
const matches = await identify({
  probe: template,
  filters: {
    status: ['ACTIVE'],
    dateRange: { start: '2024-01-01', end: '2025-12-31' }
  }
});
```

#### False Positives

```typescript
// Adjust thresholds
const screening = await screen({
  threshold: 90, // Increase threshold to reduce false positives
  maxResults: 5  // Limit candidates
});

// Use multi-modal fusion
const fused = await fuse({
  modalityScores: [face, fingerprint, iris],
  strategy: 'SCORE_LEVEL'
}); // More accurate than single modality
```

## Support

- **Documentation**: https://docs.intelgraph.com/biometrics
- **API Reference**: https://api.intelgraph.com/biometrics
- **Support**: support@intelgraph.com
- **Security Issues**: security@intelgraph.com

---

**Version**: 1.0.0
**Last Updated**: 2025-11-20
