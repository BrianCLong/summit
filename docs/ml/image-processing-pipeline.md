# Summit Image Processing Pipeline

This document outlines the lightweight computer-vision pipeline that powers
image understanding for the ingest wizard and GraphQL APIs.

## Overview

The pipeline is designed for quick analysis of uploaded imagery without the
need for heavyweight GPU-bound models. It combines Python (OpenCV) for feature
detection with the existing Node.js services for orchestration and storage.

1. **Upload** – Images are uploaded through the ingest wizard. `MediaUploadService`
   persists the file, extracts metadata, and exposes the absolute storage path.
2. **Detection** – `ImageProcessingService` invokes the Python module
   `server/python/vision/image_processing.py`, which performs contour-based
   detection to identify high-contrast objects.
3. **Storage** – Detection results are persisted to Neo4j via
   `ImageDetectionRepo`, producing an `ImageAsset` node with `DetectedObject`
   children and bounding box metadata.
4. **Access** – GraphQL exposes the detections through the
   `imageDetections` query and the `MediaSource.detections` field, enabling
   downstream analytics and UI overlays.

## Python Pipeline

The Python module uses OpenCV to:

- Convert images to grayscale and smooth with Gaussian blur.
- Apply Canny edge detection followed by dilation.
- Extract contours above a configurable minimum area.
- Emit normalized bounding boxes and confidences as JSON for easy consumption
  by the Node.js services.

Run it standalone:

```bash
python server/python/vision/image_processing.py --image uploads/example.jpg --min-area 750
```

The script prints a JSON payload containing the detection results.

## GraphQL Contracts

```graphql
query ImageDetections($mediaSourceId: ID!) {
  imageDetections(mediaSourceId: $mediaSourceId) {
    id
    className
    confidence
    boundingBox {
      x
      y
      width
      height
    }
  }
}
```

Every `MediaSource` node now exposes a `detections` field that returns the same
structure, making it easy for clients to overlay bounding boxes when rendering
previews in the ingest wizard.

## Future Enhancements

- Swap the contour detector for a Torch/YOLO model when GPU resources are
  available.
- Add temporal smoothing for video keyframes using the same repository.
- Surface quality metrics (blur, brightness) to prioritize analyst review.
