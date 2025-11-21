/**
 * Point-in-polygon algorithm tests
 */

import {
  pointInPolygon,
  isPointInPolygon,
  pointsInPolygon,
  pointsWithinRadius,
  polygonArea,
  polygonCentroid,
} from '../src/algorithms/point-in-polygon';
import { GeoPoint } from '@intelgraph/geospatial';
import { Position } from 'geojson';

describe('Point-in-Polygon', () => {
  // Simple square polygon around NYC
  const nycPolygon: Position[][] = [
    [
      [-74.1, 40.7],
      [-73.9, 40.7],
      [-73.9, 40.8],
      [-74.1, 40.8],
      [-74.1, 40.7], // Closed ring
    ],
  ];

  const insidePoint: GeoPoint = { latitude: 40.75, longitude: -74.0 };
  const outsidePoint: GeoPoint = { latitude: 40.6, longitude: -74.0 };
  const edgePoint: GeoPoint = { latitude: 40.7, longitude: -74.0 };

  describe('pointInPolygon()', () => {
    it('should return true for point inside polygon', () => {
      const result = pointInPolygon(insidePoint, nycPolygon);
      expect(result).toBe(true);
    });

    it('should return false for point outside polygon', () => {
      const result = pointInPolygon(outsidePoint, nycPolygon);
      expect(result).toBe(false);
    });
  });

  describe('isPointInPolygon()', () => {
    it('should detect point inside polygon using Turf.js', () => {
      const result = isPointInPolygon(insidePoint, nycPolygon);
      expect(result).toBe(true);
    });

    it('should detect point outside polygon', () => {
      const result = isPointInPolygon(outsidePoint, nycPolygon);
      expect(result).toBe(false);
    });
  });

  describe('pointsInPolygon()', () => {
    it('should filter points within polygon', () => {
      const points = [insidePoint, outsidePoint, edgePoint];
      const inside = pointsInPolygon(points, nycPolygon);

      expect(inside.length).toBeGreaterThanOrEqual(1);
      expect(inside).toContainEqual(insidePoint);
      expect(inside).not.toContainEqual(outsidePoint);
    });

    it('should return empty array when no points inside', () => {
      const farPoints = [
        { latitude: 35.0, longitude: -80.0 },
        { latitude: 36.0, longitude: -81.0 },
      ];
      const inside = pointsInPolygon(farPoints, nycPolygon);
      expect(inside).toHaveLength(0);
    });
  });

  describe('pointsWithinRadius()', () => {
    const center: GeoPoint = { latitude: 40.7128, longitude: -74.006 };
    const nearPoint: GeoPoint = { latitude: 40.713, longitude: -74.007 };
    const farPoint: GeoPoint = { latitude: 41.0, longitude: -74.0 };

    it('should find points within radius', () => {
      const points = [nearPoint, farPoint];
      const result = pointsWithinRadius(points, center, 500); // 500m

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should exclude points outside radius', () => {
      const result = pointsWithinRadius([farPoint], center, 500);
      expect(result).toHaveLength(0);
    });
  });

  describe('polygonArea()', () => {
    it('should calculate polygon area', () => {
      const area = polygonArea(nycPolygon);
      expect(area).toBeGreaterThan(0);
    });
  });

  describe('polygonCentroid()', () => {
    it('should calculate polygon centroid', () => {
      const centroid = polygonCentroid(nycPolygon);

      expect(centroid.latitude).toBeCloseTo(40.75, 1);
      expect(centroid.longitude).toBeCloseTo(-74.0, 1);
    });
  });
});
