/**
 * Tests for computer vision utility functions
 */

import {
  calculateIoU,
  bboxToXYXY,
  xyxyToBbox,
  nonMaximumSuppression,
  cosineSimilarity,
  euclideanDistance,
  normalizeVector,
  getBboxCenter,
  getBboxArea,
  isPointInBbox,
  scaleBbox,
  expandBbox,
  clipBbox,
  filterByConfidence,
} from '../utils';
import type { BoundingBox, Detection } from '../types';

describe('Bounding Box Utilities', () => {
  const bbox1: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
  const bbox2: BoundingBox = { x: 50, y: 50, width: 100, height: 100 };
  const bbox3: BoundingBox = { x: 200, y: 200, width: 50, height: 50 };

  describe('bboxToXYXY', () => {
    it('should convert XYWH to XYXY format', () => {
      const result = bboxToXYXY(bbox1);
      expect(result).toEqual({ x1: 0, y1: 0, x2: 100, y2: 100 });
    });
  });

  describe('xyxyToBbox', () => {
    it('should convert XYXY to XYWH format', () => {
      const xyxy = { x1: 10, y1: 20, x2: 110, y2: 120 };
      const result = xyxyToBbox(xyxy);
      expect(result).toEqual({ x: 10, y: 20, width: 100, height: 100 });
    });
  });

  describe('calculateIoU', () => {
    it('should calculate correct IoU for overlapping boxes', () => {
      const iou = calculateIoU(bbox1, bbox2);
      // Intersection: 50x50 = 2500, Union: 10000 + 10000 - 2500 = 17500
      expect(iou).toBeCloseTo(2500 / 17500, 4);
    });

    it('should return 0 for non-overlapping boxes', () => {
      const iou = calculateIoU(bbox1, bbox3);
      expect(iou).toBe(0);
    });

    it('should return 1 for identical boxes', () => {
      const iou = calculateIoU(bbox1, bbox1);
      expect(iou).toBe(1);
    });
  });

  describe('getBboxCenter', () => {
    it('should return the center point of bbox', () => {
      const center = getBboxCenter(bbox1);
      expect(center).toEqual({ x: 50, y: 50 });
    });
  });

  describe('getBboxArea', () => {
    it('should return the area of bbox', () => {
      const area = getBboxArea(bbox1);
      expect(area).toBe(10000);
    });
  });

  describe('isPointInBbox', () => {
    it('should return true for point inside bbox', () => {
      expect(isPointInBbox({ x: 50, y: 50 }, bbox1)).toBe(true);
    });

    it('should return false for point outside bbox', () => {
      expect(isPointInBbox({ x: 150, y: 150 }, bbox1)).toBe(false);
    });

    it('should return true for point on edge', () => {
      expect(isPointInBbox({ x: 0, y: 0 }, bbox1)).toBe(true);
      expect(isPointInBbox({ x: 100, y: 100 }, bbox1)).toBe(true);
    });
  });

  describe('scaleBbox', () => {
    it('should scale bbox by given factors', () => {
      const scaled = scaleBbox(bbox1, 2, 0.5);
      expect(scaled).toEqual({ x: 0, y: 0, width: 200, height: 50 });
    });
  });

  describe('expandBbox', () => {
    it('should expand bbox by factor', () => {
      const expanded = expandBbox({ x: 50, y: 50, width: 100, height: 100 }, 1.2);
      expect(expanded.width).toBe(120);
      expect(expanded.height).toBe(120);
      expect(expanded.x).toBe(40);
      expect(expanded.y).toBe(40);
    });
  });

  describe('clipBbox', () => {
    it('should clip bbox to image dimensions', () => {
      const bbox: BoundingBox = { x: -10, y: -10, width: 200, height: 200 };
      const clipped = clipBbox(bbox, 100, 100);
      expect(clipped).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    });
  });
});

describe('Vector Similarity', () => {
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vec = [1, 2, 3];
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0, 5);
    });

    it('should return -1 for opposite vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [-1, 0, 0];
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(-1, 5);
    });
  });

  describe('euclideanDistance', () => {
    it('should return 0 for identical vectors', () => {
      const vec = [1, 2, 3];
      expect(euclideanDistance(vec, vec)).toBe(0);
    });

    it('should calculate correct distance', () => {
      const vec1 = [0, 0, 0];
      const vec2 = [3, 4, 0];
      expect(euclideanDistance(vec1, vec2)).toBe(5);
    });
  });

  describe('normalizeVector', () => {
    it('should normalize vector to unit length', () => {
      const vec = [3, 4, 0];
      const normalized = normalizeVector(vec);
      const magnitude = Math.sqrt(normalized.reduce((sum, v) => sum + v * v, 0));
      expect(magnitude).toBeCloseTo(1, 5);
    });

    it('should handle zero vector', () => {
      const vec = [0, 0, 0];
      const normalized = normalizeVector(vec);
      expect(normalized).toEqual([0, 0, 0]);
    });
  });
});

describe('Detection Utilities', () => {
  const createDetection = (conf: number, className: string): Detection => ({
    class_name: className,
    class_id: 0,
    confidence: conf,
    bbox: { x: 0, y: 0, width: 100, height: 100 },
    bbox_xyxy: [0, 0, 100, 100],
    area: 10000,
  });

  describe('nonMaximumSuppression', () => {
    it('should return empty array for empty input', () => {
      expect(nonMaximumSuppression([])).toEqual([]);
    });

    it('should keep detection with highest confidence', () => {
      const detections = [
        createDetection(0.9, 'person'),
        createDetection(0.8, 'person'),
      ];
      // Same bbox, high IoU, should keep only highest confidence
      const result = nonMaximumSuppression(detections, 0.5);
      expect(result.length).toBe(1);
      expect(result[0].confidence).toBe(0.9);
    });
  });

  describe('filterByConfidence', () => {
    it('should filter detections below threshold', () => {
      const detections = [
        createDetection(0.9, 'person'),
        createDetection(0.5, 'car'),
        createDetection(0.3, 'dog'),
      ];
      const filtered = filterByConfidence(detections, 0.6);
      expect(filtered.length).toBe(1);
      expect(filtered[0].class_name).toBe('person');
    });
  });
});
