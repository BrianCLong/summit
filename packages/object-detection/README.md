# @intelgraph/object-detection

Advanced object detection with YOLO v8/v9, Faster R-CNN, and multi-object tracking for the IntelGraph platform.

## Features

- **YOLOv8/v9** - Real-time object detection with multiple model sizes
- **Multi-Object Tracking** - SORT, ByteTrack for tracking across frames
- **Instance Segmentation** - Segment individual object instances
- **Small Object Detection** - Tiling strategy for detecting small objects
- **3D Object Detection** - Depth and 3D bounding box estimation
- **Custom Training** - Train on custom datasets
- **GPU Acceleration** - CUDA support for high-performance inference

## Installation

```bash
pnpm install @intelgraph/object-detection
```

## Usage

### Basic Object Detection

```typescript
import { createYOLODetector } from '@intelgraph/object-detection';

const detector = createYOLODetector({
  model_type: 'yolov8',
  model_size: 'medium',
  confidence_threshold: 0.5,
  device: 'auto',
});

await detector.initialize();

const result = await detector.detect('/path/to/image.jpg');
console.log(`Found ${result.detections.length} objects`);

for (const det of result.detections) {
  console.log(`${det.class_name}: ${(det.confidence * 100).toFixed(1)}%`);
}
```

### Multi-Object Tracking

```typescript
import { createTracker } from '@intelgraph/object-detection';

const tracker = createTracker('bytetrack', {
  iou_threshold: 0.3,
  max_age: 30,
});

// Process video frames
for (const frame of frames) {
  const detections = await detector.detect(frame);
  const trackingResult = tracker.update(detections.detections);

  console.log(`Active tracks: ${trackingResult.active_tracks}`);
  console.log(`New tracks: ${trackingResult.new_tracks.length}`);
}
```

### Batch Processing

```typescript
const images = ['img1.jpg', 'img2.jpg', 'img3.jpg'];
const results = await detector.processBatch(images);

for (const result of results) {
  console.log(`Processed in ${result.processing_time_ms}ms`);
}
```

### Custom Classes

```typescript
const result = await detector.detect('/path/to/image.jpg', {
  classes: ['person', 'car', 'truck'],
  confidenceThreshold: 0.7,
});
```

## Supported Models

- **YOLOv8** - nano, small, medium, large, xlarge
- **YOLOv9** - nano, small, medium, large, xlarge
- **YOLOv8-seg** - Instance segmentation
- **Custom** - Train your own models

## Performance

| Model | Size | Speed (ms) | mAP |
|-------|------|-----------|-----|
| YOLOv8n | 3.2MB | 2-5ms (GPU) | 37.3 |
| YOLOv8s | 11.2MB | 3-8ms (GPU) | 44.9 |
| YOLOv8m | 25.9MB | 5-15ms (GPU) | 50.2 |
| YOLOv8l | 43.7MB | 8-25ms (GPU) | 52.9 |
| YOLOv8x | 68.2MB | 12-40ms (GPU) | 53.9 |

## License

Proprietary - IntelGraph Platform
