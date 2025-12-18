# @intelgraph/deepfake-detection

Shared TypeScript types and utilities for the IntelGraph deepfake detection system.

## Installation

```bash
pnpm add @intelgraph/deepfake-detection
```

## Usage

### Types

```typescript
import {
  MediaType,
  DeepfakeDetection,
  DetectorType,
  AlertSeverity,
  MLModel,
} from '@intelgraph/deepfake-detection';

const detection: DeepfakeDetection = {
  id: '123',
  mediaId: '456',
  isSynthetic: true,
  confidenceScore: 0.87,
  detectorType: DetectorType.VIDEO_FACE,
  modelVersion: 'v1.2.0',
  processingTimeMs: 2500,
  processedAt: new Date(),
  status: 'COMPLETED',
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

### Constants

```typescript
import {
  CONFIDENCE_THRESHOLDS,
  MODEL_VERSIONS,
  SUPPORTED_MIME_TYPES,
} from '@intelgraph/deepfake-detection/constants';

console.log(CONFIDENCE_THRESHOLDS.HIGH); // 0.7
console.log(MODEL_VERSIONS.VIDEO_FACE); // 'v1.2.0'
console.log(SUPPORTED_MIME_TYPES.VIDEO); // ['video/mp4', ...]
```

### Utilities

#### Validation

```typescript
import {
  validateConfidenceScore,
  validateMediaType,
  validateMimeType,
  validateFileSize,
} from '@intelgraph/deepfake-detection/utils';

try {
  validateConfidenceScore(0.85);
  validateMediaType('VIDEO');
  validateMimeType('video/mp4', 'VIDEO');
  validateFileSize(1024000, 'VIDEO');
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

#### Ensemble Scoring

```typescript
import {
  calculateEnsembleScore,
  temperatureScale,
} from '@intelgraph/deepfake-detection/utils';

const ensembleResult = calculateEnsembleScore({
  detections: [detection1, detection2, detection3],
  method: 'WEIGHTED_AVERAGE',
  threshold: 0.5,
});

console.log('Final confidence:', ensembleResult.finalConfidence);
console.log('Is synthetic:', ensembleResult.isSynthetic);
```

#### Metrics Calculation

```typescript
import {
  calculateMetrics,
  calculateAUC,
  calculatePSI,
} from '@intelgraph/deepfake-detection/utils';

const confusionMatrix = {
  truePositives: 95,
  trueNegatives: 90,
  falsePositives: 5,
  falseNegatives: 10,
};

const metrics = calculateMetrics(confusionMatrix);
console.log('Accuracy:', metrics.accuracy);
console.log('Precision:', metrics.precision);
console.log('Recall:', metrics.recall);
console.log('F1 Score:', metrics.f1Score);

const auc = calculateAUC(scores, labels);
console.log('AUC-ROC:', auc);

const psi = calculatePSI(baselineDistribution, currentDistribution);
console.log('Population Stability Index:', psi);
```

## API Reference

### Types

#### Media Types
- `Media` - Media file metadata
- `MediaType` - Enum: VIDEO, AUDIO, IMAGE
- `MediaStatus` - Enum: UPLOADED, PROCESSING, ANALYZED, FAILED, ARCHIVED
- `MediaMetadata` - Extracted technical metadata

#### Detection Types
- `DeepfakeDetection` - Detection result
- `DetectorType` - Enum: VIDEO_FACE, AUDIO_SPECTROGRAM, IMAGE_MANIPULATION, etc.
- `DetectionStatus` - Enum: PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED
- `EnsembleResult` - Combined result from multiple detectors
- `FrameScore` - Per-frame detection score (video)
- `SegmentScore` - Per-segment detection score (audio)
- `ExplanationData` - Model explainability data

#### Alert Types
- `DeepfakeAlert` - Alert for suspicious media
- `AlertSeverity` - Enum: LOW, MEDIUM, HIGH, CRITICAL
- `AlertStatus` - Enum: OPEN, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, FALSE_POSITIVE
- `AlertRule` - Alert triggering rule
- `NotificationChannel` - Enum: UI, EMAIL, WEBHOOK, SLACK, SMS

#### Model Types
- `MLModel` - ML model metadata
- `ModelType` - Enum: VIDEO_DETECTOR, AUDIO_DETECTOR, IMAGE_DETECTOR, ENSEMBLE
- `ModelStatus` - Enum: DRAFT, TESTING, STAGING, PRODUCTION, DEPRECATED
- `ModelFramework` - Enum: PYTORCH, TENSORFLOW, ONNX, etc.
- `ModelPerformanceMetric` - Model performance tracking
- `ModelCard` - Model documentation and ethical considerations
- `ModelDriftReport` - Drift detection report

### Constants

- `CONFIDENCE_THRESHOLDS` - Standard confidence thresholds
- `ALERT_SEVERITY_BY_CONFIDENCE` - Severity mapping
- `PROCESSING_TIMEOUTS` - Maximum processing times
- `FILE_SIZE_LIMITS` - Maximum file sizes
- `SUPPORTED_MIME_TYPES` - Supported media formats
- `MODEL_VERSIONS` - Current production model versions
- `ENSEMBLE_WEIGHTS` - Default ensemble voting weights
- `FEATURE_EXTRACTION` - Feature extraction parameters
- `DRIFT_THRESHOLDS` - Model drift detection thresholds
- `JOB_PRIORITIES` - Job queue priorities
- `CACHE_TTL` - Cache time-to-live values
- `RETRY_POLICY` - Retry configuration
- `RATE_LIMITS` - API rate limits
- `METRIC_NAMES` - Prometheus metric names
- `ERROR_CODES` - Standard error codes
- `FEATURE_FLAGS` - Feature toggles

### Utilities

#### Validation
- `validateConfidenceScore(score)` - Validate confidence score (0.0-1.0)
- `validateMediaType(type)` - Validate media type
- `validateMimeType(mimeType, mediaType)` - Validate MIME type
- `validateFileSize(sizeBytes, mediaType)` - Validate file size
- `validateUuid(uuid, fieldName)` - Validate UUID format
- `validateEmail(email)` - Validate email format
- `validateUrl(url)` - Validate URL format
- `validatePriority(priority)` - Validate priority (1-10)
- `validatePagination(limit, offset)` - Validate pagination params
- `sanitizeFilename(filename)` - Sanitize filename
- `validateSha256(checksum)` - Validate SHA-256 checksum

#### Ensemble Scoring
- `calculateEnsembleScore(input)` - Calculate ensemble score
- `calculateConfidenceInterval(scores, confidenceLevel, numBootstrap)` - Bootstrap confidence interval
- `temperatureScale(confidence, temperature)` - Temperature scaling for calibration

#### Metrics
- `calculateMetrics(confusionMatrix)` - Calculate classification metrics
- `calculateEER(scores, labels)` - Calculate Equal Error Rate
- `calculateAUC(scores, labels)` - Calculate AUC-ROC
- `calculatePSI(baseline, current, numBins)` - Calculate Population Stability Index
- `calculateKLDivergence(p, q)` - Calculate KL divergence
- `calculateCalibrationError(scores, labels, numBins)` - Calculate Expected Calibration Error
- `calculatePercentiles(values, percentiles)` - Calculate percentiles
- `calculateSummaryStats(values)` - Calculate summary statistics

## Development

```bash
# Build
pnpm build

# Test
pnpm test

# Lint
pnpm lint

# Type check
pnpm typecheck
```

## License

UNLICENSED - Internal use only
