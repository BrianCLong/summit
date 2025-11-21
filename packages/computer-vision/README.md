# @intelgraph/computer-vision

Core computer vision types, utilities, and base classes for the IntelGraph platform.

## Features

- **Type-safe definitions** with Zod schemas for all CV data structures
- **Base classes** for building CV models and analyzers
- **Utility functions** for common CV operations (IoU, NMS, bbox transformations)
- **Performance monitoring** for tracking model inference metrics
- **Device abstraction** for CPU, CUDA, and edge deployment

## Installation

```bash
pnpm install @intelgraph/computer-vision
```

## Usage

```typescript
import {
  Detection,
  BoundingBox,
  ModelConfig,
  BaseComputerVisionModel,
  calculateIoU,
  nonMaximumSuppression,
} from '@intelgraph/computer-vision';

// Use types
const detection: Detection = {
  class_name: 'person',
  class_id: 0,
  confidence: 0.95,
  bbox: { x: 100, y: 100, width: 200, height: 300 },
  bbox_xyxy: [100, 100, 300, 400],
  area: 60000,
};

// Calculate IoU
const iou = calculateIoU(bbox1, bbox2);

// Apply NMS
const filtered = nonMaximumSuppression(detections, 0.5);
```

## Base Classes

- `BaseComputerVisionModel` - Abstract base for all CV models
- `IObjectDetector` - Interface for object detection models
- `IFaceAnalyzer` - Interface for face analysis models
- `IOCREngine` - Interface for OCR engines
- `ISceneAnalyzer` - Interface for scene understanding
- `IVideoAnalyzer` - Interface for video analysis
- `IImageForensics` - Interface for image forensics
- `IImageEnhancer` - Interface for image enhancement

## Utilities

- Bounding box operations (IoU, NMS, scaling, clipping)
- Vector similarity (cosine, Euclidean)
- Detection filtering and grouping
- Color space conversions
- Performance monitoring

## License

Proprietary - IntelGraph Platform
