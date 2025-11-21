# Computer Vision Platform Guide

Comprehensive guide to the IntelGraph Computer Vision and Image Analysis Platform.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Object Detection](#object-detection)
5. [Face Analysis](#face-analysis)
6. [OCR](#ocr)
7. [Satellite Imagery](#satellite-imagery)
8. [Video Analysis](#video-analysis)
9. [Image Forensics](#image-forensics)
10. [Production Deployment](#production-deployment)
11. [API Reference](#api-reference)

## Overview

The IntelGraph Computer Vision Platform provides enterprise-grade computer vision capabilities for:

- **Object Detection & Tracking** - Real-time detection with YOLO v8/v9, multi-object tracking
- **Face Analysis** - Detection, recognition, demographics, emotion recognition
- **OCR** - Multi-language text extraction, document analysis
- **Satellite Imagery** - Change detection, building detection, land use classification
- **Video Analysis** - Action recognition, crowd analysis, anomaly detection
- **Image Forensics** - Deepfake detection, manipulation detection, authenticity verification

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Vision API Service                        │
│                   (REST + WebSocket)                         │
└─────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐       ┌────▼────┐      ┌────▼────┐
    │ Object  │       │  Face   │      │   OCR   │
    │Detection│       │Analysis │      │ Engine  │
    └─────────┘       └─────────┘      └─────────┘
         │                 │                 │
    ┌────▼────┐       ┌────▼────┐      ┌────▼────┐
    │Satellite│       │  Video  │      │ Image   │
    │Analyzer │       │Analyzer │      │Forensics│
    └─────────┘       └─────────┘      └─────────┘
         │                 │                 │
    └─────────────────┬─────────────────────┘
                      │
         ┌────────────▼────────────┐
         │   Python CV Backend     │
         │  (YOLO, MTCNN, etc.)    │
         └─────────────────────────┘
```

## Quick Start

### Installation

```bash
# Install all CV packages
pnpm install @intelgraph/computer-vision
pnpm install @intelgraph/object-detection
pnpm install @intelgraph/face-analysis
pnpm install @intelgraph/ocr
pnpm install @intelgraph/satellite-imagery
pnpm install @intelgraph/video-analysis
pnpm install @intelgraph/image-forensics

# Install Python dependencies
pip install ultralytics mtcnn facenet-pytorch pytesseract opencv-python
```

### Basic Usage

```typescript
import { createYOLODetector } from '@intelgraph/object-detection';

const detector = createYOLODetector({
  model_type: 'yolov8',
  model_size: 'medium',
  device: 'cuda',
});

await detector.initialize();

const result = await detector.detect('/path/to/image.jpg');
console.log(`Found ${result.detections.length} objects`);
```

## Object Detection

### YOLO Detection

```typescript
import { createYOLODetector } from '@intelgraph/object-detection';

const detector = createYOLODetector({
  model_type: 'yolov8',
  model_size: 'medium',
  confidence_threshold: 0.5,
  nms_threshold: 0.4,
  device: 'auto',
});

await detector.initialize();

// Single image detection
const result = await detector.detect('/path/to/image.jpg', {
  confidenceThreshold: 0.6,
  classes: ['person', 'car', 'truck'],
});

// Batch processing
const images = ['img1.jpg', 'img2.jpg', 'img3.jpg'];
const results = await detector.processBatch(images);

// Get supported classes
const classes = detector.getSupportedClasses();
console.log(`Supports ${classes.length} classes`);
```

### Multi-Object Tracking

```typescript
import { createTracker } from '@intelgraph/object-detection';

const tracker = createTracker('bytetrack', {
  iou_threshold: 0.3,
  max_age: 30,
  min_hits: 3,
});

// Process video frames
const frames = await loadVideoFrames('/path/to/video.mp4');

for (const frame of frames) {
  const detections = await detector.detect(frame);
  const trackingResult = tracker.update(detections.detections);

  console.log(`Active tracks: ${trackingResult.active_tracks}`);
  console.log(`New tracks: ${trackingResult.new_tracks.length}`);
  console.log(`Lost tracks: ${trackingResult.lost_tracks.length}`);

  // Get tracked objects
  for (const track of trackingResult.tracked_objects) {
    console.log(`Track ${track.track_id}: ${track.detection.class_name}`);
    console.log(`Velocity: (${track.velocity.x}, ${track.velocity.y})`);
  }
}
```

### Instance Segmentation

```typescript
const instances = await detector.segmentInstances('/path/to/image.jpg');

for (const instance of instances) {
  console.log(`${instance.class_name}: ${instance.confidence}`);
  console.log(`Mask size: ${instance.mask.length}x${instance.mask[0].length}`);
}
```

## Face Analysis

### Face Detection

```typescript
import { FaceAnalyzer } from '@intelgraph/face-analysis';

const analyzer = new FaceAnalyzer({ device: 'cuda' });
await analyzer.initialize();

const result = await analyzer.detectFaces('/path/to/image.jpg', {
  minFaceSize: 20,
  confidenceThreshold: 0.7,
  extractEmbeddings: true,
  analyzeDemographics: true,
  detectEmotions: true,
});

for (const face of result.faces) {
  console.log(`Face ${face.face_id}:`);
  console.log(`  Confidence: ${face.confidence}`);
  console.log(`  Age: ${face.age}`);
  console.log(`  Gender: ${face.gender?.label} (${face.gender?.confidence})`);
  console.log(`  Emotion: ${face.emotion?.label} (${face.emotion?.confidence})`);
}
```

### Face Recognition

```typescript
// Extract face embeddings
const embeddings1 = await analyzer.extractEmbeddings('/path/to/person1.jpg');
const embeddings2 = await analyzer.extractEmbeddings('/path/to/person2.jpg');

// Compare faces
const result1 = await analyzer.detectFaces('/path/to/person1.jpg', { extractEmbeddings: true });
const result2 = await analyzer.detectFaces('/path/to/person2.jpg', { extractEmbeddings: true });

const similarity = await analyzer.compareFaces(result1.faces[0], result2.faces[0]);
console.log(`Face similarity: ${(similarity * 100).toFixed(1)}%`);
console.log(`Same person: ${similarity > 0.6 ? 'Yes' : 'No'}`);
```

### Face Clustering

```typescript
// Detect faces in multiple images
const allFaces = [];
const images = ['img1.jpg', 'img2.jpg', 'img3.jpg'];

for (const img of images) {
  const result = await analyzer.detectFaces(img, { extractEmbeddings: true });
  allFaces.push(...result.faces);
}

// Cluster similar faces
const clusters = await analyzer.clusterFaces(allFaces, { threshold: 0.6 });

console.log(`Found ${clusters.size} unique people`);
for (const [clusterId, faces] of clusters) {
  console.log(`Person ${clusterId}: ${faces.length} faces`);
}
```

## OCR

### Text Extraction

```typescript
import { OCREngine } from '@intelgraph/ocr';

const ocr = new OCREngine('tesseract', { device: 'cpu' });
await ocr.initialize();

const result = await ocr.extractText('/path/to/document.jpg', {
  languages: ['eng', 'spa', 'fra'],
  confidenceThreshold: 0.6,
  wordLevel: true,
});

console.log(`Extracted text: ${result.text}`);
console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
console.log(`Language: ${result.language}`);
console.log(`Blocks: ${result.blocks.length}`);
```

### Document Analysis

```typescript
// Extract structured data from receipts
const receipt = await ocr.extractStructuredData('/path/to/receipt.jpg', 'receipt');
console.log(`Merchant: ${receipt.merchant}`);
console.log(`Total: $${receipt.total}`);
console.log(`Items: ${receipt.items.length}`);

// Extract structured data from invoices
const invoice = await ocr.extractStructuredData('/path/to/invoice.jpg', 'invoice');
console.log(`Invoice #: ${invoice.invoice_number}`);
console.log(`Total: $${invoice.total}`);

// License plate recognition
const plate = await ocr.extractStructuredData('/path/to/plate.jpg', 'license_plate');
console.log(`Plate: ${plate.plate_number}`);
```

### Multi-Language Support

```typescript
// OCR supports 100+ languages
const languages = ocr.getSupportedLanguages();
console.log(`Supported languages: ${languages.length}`);

// Example: Chinese + English
const result = await ocr.extractText('/path/to/chinese-doc.jpg', {
  languages: ['chi_sim', 'eng'],
});
```

## Satellite Imagery

### Change Detection

```typescript
import { SatelliteAnalyzer } from '@intelgraph/satellite-imagery';

const analyzer = new SatelliteAnalyzer({ device: 'cuda' });
await analyzer.initialize();

const changes = await analyzer.detectChanges(
  '/path/to/before.tif',
  '/path/to/after.tif',
  {
    threshold: 0.5,
    minAreaSqm: 100,
  }
);

console.log(`Change percentage: ${changes.change_percentage}%`);
console.log(`Changed regions: ${changes.changed_regions.length}`);

for (const region of changes.changed_regions) {
  console.log(`  ${region.change_type}: ${region.area_sqm} sq m`);
}
```

### Land Use Classification

```typescript
const landUse = await analyzer.classifyLandUse('/path/to/satellite.tif');

console.log(`Dominant class: ${landUse.dominant_class}`);
for (const cls of landUse.classes) {
  console.log(`  ${cls.class_name}: ${cls.percentage}% (${cls.area_sqm} sq m)`);
}
```

### Building Detection

```typescript
const buildings = await analyzer.detectBuildings('/path/to/urban.tif', {
  minAreaSqm: 50,
  confidenceThreshold: 0.7,
});

console.log(`Detected ${buildings.length} buildings`);
```

## Video Analysis

### Video Processing

```typescript
import { VideoAnalyzer } from '@intelgraph/video-analysis';

const analyzer = new VideoAnalyzer({ device: 'cuda' });
await analyzer.initialize();

const result = await analyzer.analyzeVideo('/path/to/video.mp4', {
  detectActions: true,
  extractKeyFrames: true,
  trackObjects: true,
  analyzeCrowd: true,
});

console.log(`Frames: ${result.frame_count}`);
console.log(`Duration: ${result.duration_seconds}s`);
console.log(`FPS: ${result.fps}`);
console.log(`Actions: ${result.actions?.length}`);
console.log(`Key frames: ${result.key_frames?.length}`);
```

### Action Recognition

```typescript
const actions = await analyzer.detectActions('/path/to/video.mp4', {
  actionClasses: ['walking', 'running', 'fighting'],
});

for (const action of actions) {
  console.log(`${action.action_type}: frames ${action.start_frame}-${action.end_frame}`);
  console.log(`  Confidence: ${(action.confidence * 100).toFixed(1)}%`);
}
```

### Crowd Analysis

```typescript
const crowd = await analyzer.analyzeCrowd('/path/to/crowd-video.mp4');

console.log(`Crowd count: ${crowd.crowd_count}`);
console.log(`Density: ${crowd.crowd_density}`);
```

## Image Forensics

### Manipulation Detection

```typescript
import { ForensicsAnalyzer } from '@intelgraph/image-forensics';

const analyzer = new ForensicsAnalyzer({ device: 'cuda' });
await analyzer.initialize();

const result = await analyzer.detectManipulation('/path/to/image.jpg');

console.log(`Authentic: ${result.is_authentic}`);
console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
console.log(`Manipulations found: ${result.manipulations.length}`);

for (const manip of result.manipulations) {
  console.log(`  ${manip.manipulation_type}: ${(manip.confidence * 100).toFixed(1)}%`);
  console.log(`  Evidence: ${manip.evidence.join(', ')}`);
}
```

### Deepfake Detection

```typescript
const deepfake = await analyzer.detectDeepfake('/path/to/suspect.jpg', {
  methods: ['xception', 'efficientnet', 'capsule'],
});

console.log(`Is deepfake: ${deepfake.is_deepfake}`);
console.log(`Confidence: ${(deepfake.confidence * 100).toFixed(1)}%`);

for (const method of deepfake.detection_methods) {
  console.log(`  ${method.method}: ${(method.score * 100).toFixed(1)}%`);
}
```

### Metadata Analysis

```typescript
const metadata = await analyzer.analyzeMetadata('/path/to/image.jpg', {
  checkConsistency: true,
});

console.log(`Consistency score: ${metadata.consistency_score}`);
console.log(`Anomalies: ${metadata.anomalies.length}`);
console.log(`Camera: ${metadata.camera_fingerprint}`);
console.log(`Created: ${metadata.creation_date}`);
```

## Production Deployment

### Docker Deployment

```dockerfile
FROM nvidia/cuda:12.0-runtime-ubuntu22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    python3 python3-pip nodejs npm \
    tesseract-ocr

# Copy application
COPY . /app
WORKDIR /app

# Install packages
RUN pnpm install
RUN pip3 install -r requirements.txt

# Download models
RUN python3 download_models.py

# Start service
CMD ["node", "dist/index.js"]
```

### GPU Optimization

```typescript
// Enable TensorRT optimization
const detector = createYOLODetector({
  model_type: 'yolov8',
  model_size: 'medium',
  device: 'cuda',
  fp16: true,  // Half-precision for faster inference
});

// Batch processing for throughput
const results = await detector.processBatch(images, {
  batchSize: 16,  // Process 16 images at once
});
```

### Performance Monitoring

```typescript
import { PerformanceMonitor } from '@intelgraph/computer-vision';

const monitor = new PerformanceMonitor();

const timer = monitor.start();
const result = await detector.detect('/path/to/image.jpg');
const metrics = timer.end();

monitor.record('yolov8m', metrics);

// Get average metrics
const avgMetrics = monitor.getAverageMetrics('yolov8m');
console.log(`Average inference time: ${avgMetrics?.inference_time_ms}ms`);
console.log(`Throughput: ${avgMetrics?.throughput_fps} FPS`);
```

## API Reference

### Vision API Endpoints

```bash
# Object Detection
POST /api/v1/detect/objects
POST /api/v1/detect/objects/batch

# Face Analysis
POST /api/v1/face/detect
POST /api/v1/face/compare

# OCR
POST /api/v1/ocr/extract
POST /api/v1/ocr/document

# Satellite Imagery
POST /api/v1/satellite/analyze
POST /api/v1/satellite/change-detection

# Video Analysis
POST /api/v1/video/analyze

# Image Forensics
POST /api/v1/forensics/analyze
POST /api/v1/forensics/deepfake

# Health & Status
GET /health
GET /api/v1/models/info
```

### Example API Usage

```bash
# Object detection
curl -X POST -F "image=@photo.jpg" \
  -F "confidence_threshold=0.6" \
  -F "classes=person,car" \
  http://localhost:8080/api/v1/detect/objects

# Face comparison
curl -X POST \
  -F "images=@person1.jpg" \
  -F "images=@person2.jpg" \
  http://localhost:8080/api/v1/face/compare

# OCR
curl -X POST -F "image=@document.jpg" \
  -F "languages=eng,spa" \
  http://localhost:8080/api/v1/ocr/extract

# Deepfake detection
curl -X POST -F "image=@suspect.jpg" \
  http://localhost:8080/api/v1/forensics/deepfake
```

## Best Practices

1. **Use GPU for production** - CUDA significantly improves performance
2. **Batch processing** - Process multiple images at once for better throughput
3. **Model optimization** - Use TensorRT or ONNX for faster inference
4. **Confidence thresholds** - Tune thresholds based on your use case
5. **Error handling** - Always handle errors gracefully
6. **Monitoring** - Track performance metrics in production

## Support

For issues, questions, or feature requests, please contact the IntelGraph team.

## License

Proprietary - IntelGraph Platform
