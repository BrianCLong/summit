/**
 * Computer Vision Utility Functions
 */

import { BoundingBox, BoundingBoxXYXY, Point, Detection } from './types.js';

/**
 * Convert XYWH bbox to XYXY format
 */
export function bboxToXYXY(bbox: BoundingBox): BoundingBoxXYXY {
  return {
    x1: bbox.x,
    y1: bbox.y,
    x2: bbox.x + bbox.width,
    y2: bbox.y + bbox.height,
  };
}

/**
 * Convert XYXY bbox to XYWH format
 */
export function xyxyToBbox(xyxy: BoundingBoxXYXY): BoundingBox {
  return {
    x: xyxy.x1,
    y: xyxy.y1,
    width: xyxy.x2 - xyxy.x1,
    height: xyxy.y2 - xyxy.y1,
  };
}

/**
 * Calculate Intersection over Union (IoU) between two bboxes
 */
export function calculateIoU(bbox1: BoundingBox, bbox2: BoundingBox): number {
  const xyxy1 = bboxToXYXY(bbox1);
  const xyxy2 = bboxToXYXY(bbox2);

  // Calculate intersection area
  const x1 = Math.max(xyxy1.x1, xyxy2.x1);
  const y1 = Math.max(xyxy1.y1, xyxy2.y1);
  const x2 = Math.min(xyxy1.x2, xyxy2.x2);
  const y2 = Math.min(xyxy1.y2, xyxy2.y2);

  const intersectionWidth = Math.max(0, x2 - x1);
  const intersectionHeight = Math.max(0, y2 - y1);
  const intersectionArea = intersectionWidth * intersectionHeight;

  // Calculate union area
  const area1 = bbox1.width * bbox1.height;
  const area2 = bbox2.width * bbox2.height;
  const unionArea = area1 + area2 - intersectionArea;

  // Calculate IoU
  return unionArea > 0 ? intersectionArea / unionArea : 0;
}

/**
 * Non-Maximum Suppression (NMS)
 */
export function nonMaximumSuppression(
  detections: Detection[],
  iouThreshold: number = 0.5
): Detection[] {
  if (detections.length === 0) {
    return [];
  }

  // Sort by confidence (descending)
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const keep: Detection[] = [];

  while (sorted.length > 0) {
    const current = sorted.shift()!;
    keep.push(current);

    // Remove detections with high IoU
    const remaining = sorted.filter((detection) => {
      const iou = calculateIoU(current.bbox, detection.bbox);
      return iou <= iouThreshold;
    });

    sorted.length = 0;
    sorted.push(...remaining);
  }

  return keep;
}

/**
 * Calculate distance between two points
 */
export function calculateDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate center of bounding box
 */
export function getBboxCenter(bbox: BoundingBox): Point {
  return {
    x: bbox.x + bbox.width / 2,
    y: bbox.y + bbox.height / 2,
  };
}

/**
 * Calculate area of bounding box
 */
export function getBboxArea(bbox: BoundingBox): number {
  return bbox.width * bbox.height;
}

/**
 * Check if point is inside bounding box
 */
export function isPointInBbox(point: Point, bbox: BoundingBox): boolean {
  return (
    point.x >= bbox.x &&
    point.x <= bbox.x + bbox.width &&
    point.y >= bbox.y &&
    point.y <= bbox.y + bbox.height
  );
}

/**
 * Scale bounding box
 */
export function scaleBbox(
  bbox: BoundingBox,
  scaleX: number,
  scaleY: number
): BoundingBox {
  return {
    x: bbox.x * scaleX,
    y: bbox.y * scaleY,
    width: bbox.width * scaleX,
    height: bbox.height * scaleY,
  };
}

/**
 * Expand bounding box by a factor
 */
export function expandBbox(bbox: BoundingBox, factor: number): BoundingBox {
  const expandX = bbox.width * (factor - 1) / 2;
  const expandY = bbox.height * (factor - 1) / 2;

  return {
    x: bbox.x - expandX,
    y: bbox.y - expandY,
    width: bbox.width * factor,
    height: bbox.height * factor,
  };
}

/**
 * Clip bounding box to image dimensions
 */
export function clipBbox(
  bbox: BoundingBox,
  imageWidth: number,
  imageHeight: number
): BoundingBox {
  const x = Math.max(0, Math.min(bbox.x, imageWidth));
  const y = Math.max(0, Math.min(bbox.y, imageHeight));
  const x2 = Math.max(0, Math.min(bbox.x + bbox.width, imageWidth));
  const y2 = Math.max(0, Math.min(bbox.y + bbox.height, imageHeight));

  return {
    x,
    y,
    width: x2 - x,
    height: y2 - y,
  };
}

/**
 * Normalize coordinates to 0-1 range
 */
export function normalizeBbox(
  bbox: BoundingBox,
  imageWidth: number,
  imageHeight: number
): BoundingBox {
  return {
    x: bbox.x / imageWidth,
    y: bbox.y / imageHeight,
    width: bbox.width / imageWidth,
    height: bbox.height / imageHeight,
  };
}

/**
 * Denormalize coordinates from 0-1 range
 */
export function denormalizeBbox(
  bbox: BoundingBox,
  imageWidth: number,
  imageHeight: number
): BoundingBox {
  return {
    x: bbox.x * imageWidth,
    y: bbox.y * imageHeight,
    width: bbox.width * imageWidth,
    height: bbox.height * imageHeight,
  };
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Calculate Euclidean distance between two vectors
 */
export function euclideanDistance(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length');
  }

  let sum = 0;
  for (let i = 0; i < vec1.length; i++) {
    const diff = vec1[i] - vec2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Normalize vector to unit length
 */
export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return magnitude === 0 ? vector : vector.map((val) => val / magnitude);
}

/**
 * Filter detections by confidence threshold
 */
export function filterByConfidence(
  detections: Detection[],
  threshold: number
): Detection[] {
  return detections.filter((d) => d.confidence >= threshold);
}

/**
 * Filter detections by class names
 */
export function filterByClasses(
  detections: Detection[],
  classNames: string[]
): Detection[] {
  const classSet = new Set(classNames);
  return detections.filter((d) => classSet.has(d.class_name));
}

/**
 * Filter detections by minimum area
 */
export function filterByArea(detections: Detection[], minArea: number): Detection[] {
  return detections.filter((d) => d.area >= minArea);
}

/**
 * Group detections by class
 */
export function groupByClass(detections: Detection[]): Map<string, Detection[]> {
  const grouped = new Map<string, Detection[]>();

  for (const detection of detections) {
    const className = detection.class_name;
    if (!grouped.has(className)) {
      grouped.set(className, []);
    }
    grouped.get(className)!.push(detection);
  }

  return grouped;
}

/**
 * Calculate aspect ratio of bounding box
 */
export function getAspectRatio(bbox: BoundingBox): number {
  return bbox.height === 0 ? 0 : bbox.width / bbox.height;
}

/**
 * Check if two bboxes overlap
 */
export function bboxesOverlap(bbox1: BoundingBox, bbox2: BoundingBox): boolean {
  return calculateIoU(bbox1, bbox2) > 0;
}

/**
 * Generate color map for classes
 */
export function generateColorMap(
  classNames: string[]
): Map<string, [number, number, number]> {
  const colors = new Map<string, [number, number, number]>();
  const predefinedColors: [number, number, number][] = [
    [255, 0, 0],     // Red
    [0, 255, 0],     // Green
    [0, 0, 255],     // Blue
    [255, 255, 0],   // Yellow
    [255, 0, 255],   // Magenta
    [0, 255, 255],   // Cyan
    [128, 0, 128],   // Purple
    [255, 165, 0],   // Orange
    [255, 192, 203], // Pink
    [128, 128, 128], // Gray
  ];

  classNames.forEach((className, index) => {
    if (index < predefinedColors.length) {
      colors.set(className, predefinedColors[index]);
    } else {
      // Generate random color
      const r = Math.floor(Math.random() * 256);
      const g = Math.floor(Math.random() * 256);
      const b = Math.floor(Math.random() * 256);
      colors.set(className, [r, g, b]);
    }
  });

  return colors;
}

/**
 * Calculate average confidence of detections
 */
export function getAverageConfidence(detections: Detection[]): number {
  if (detections.length === 0) {
    return 0;
  }

  const sum = detections.reduce((acc, d) => acc + d.confidence, 0);
  return sum / detections.length;
}

/**
 * Get top K detections by confidence
 */
export function getTopK(detections: Detection[], k: number): Detection[] {
  return [...detections].sort((a, b) => b.confidence - a.confidence).slice(0, k);
}

/**
 * Merge overlapping bboxes
 */
export function mergeOverlappingBboxes(
  bboxes: BoundingBox[],
  iouThreshold: number = 0.5
): BoundingBox[] {
  if (bboxes.length === 0) {
    return [];
  }

  const merged: BoundingBox[] = [];
  const used = new Set<number>();

  for (let i = 0; i < bboxes.length; i++) {
    if (used.has(i)) {
      continue;
    }

    let current = bboxes[i];
    const toMerge = [current];

    for (let j = i + 1; j < bboxes.length; j++) {
      if (used.has(j)) {
        continue;
      }

      const iou = calculateIoU(current, bboxes[j]);
      if (iou >= iouThreshold) {
        toMerge.push(bboxes[j]);
        used.add(j);
      }
    }

    // Merge bboxes
    const xyxy1 = toMerge.map(bboxToXYXY);
    const x1 = Math.min(...xyxy1.map((b) => b.x1));
    const y1 = Math.min(...xyxy1.map((b) => b.y1));
    const x2 = Math.max(...xyxy1.map((b) => b.x2));
    const y2 = Math.max(...xyxy1.map((b) => b.y2));

    merged.push(xyxyToBbox({ x1, y1, x2, y2 }));
    used.add(i);
  }

  return merged;
}

/**
 * Convert RGB to HSV
 */
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const v = max;

  if (delta !== 0) {
    s = delta / max;

    if (max === r) {
      h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / delta + 2) / 6;
    } else {
      h = ((r - g) / delta + 4) / 6;
    }
  }

  return [h * 360, s * 100, v * 100];
}

/**
 * Convert HSV to RGB
 */
export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  h /= 360;
  s /= 100;
  v /= 100;

  const c = v * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = v - c;

  let r = 0, g = 0, b = 0;

  if (h < 1 / 6) {
    [r, g, b] = [c, x, 0];
  } else if (h < 2 / 6) {
    [r, g, b] = [x, c, 0];
  } else if (h < 3 / 6) {
    [r, g, b] = [0, c, x];
  } else if (h < 4 / 6) {
    [r, g, b] = [0, x, c];
  } else if (h < 5 / 6) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}
