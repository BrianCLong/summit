/**
 * Distance calculation tests
 */

import {
  haversineDistance,
  vincentyDistance,
  distance3D,
  bearing,
  destination,
  midpoint,
  centroid,
} from '../src/utils/distance';
import { GeoPoint } from '../src/types/geospatial';

describe('Distance Utilities', () => {
  const nyc: GeoPoint = { latitude: 40.7128, longitude: -74.006 };
  const la: GeoPoint = { latitude: 34.0522, longitude: -118.2437 };
  const london: GeoPoint = { latitude: 51.5074, longitude: -0.1278 };

  describe('haversineDistance()', () => {
    it('should calculate distance between NYC and LA', () => {
      const distance = haversineDistance(nyc, la);
      // NYC to LA is approximately 3,940 km
      expect(distance).toBeGreaterThan(3900000);
      expect(distance).toBeLessThan(4000000);
    });

    it('should return 0 for same point', () => {
      const distance = haversineDistance(nyc, nyc);
      expect(distance).toBe(0);
    });

    it('should calculate distance between NYC and London', () => {
      const distance = haversineDistance(nyc, london);
      // NYC to London is approximately 5,570 km
      expect(distance).toBeGreaterThan(5500000);
      expect(distance).toBeLessThan(5700000);
    });
  });

  describe('vincentyDistance()', () => {
    it('should calculate accurate distance', () => {
      const distance = vincentyDistance(nyc, la);
      // Should be similar to haversine but more accurate
      expect(distance).toBeGreaterThan(3900000);
      expect(distance).toBeLessThan(4000000);
    });

    it('should return 0 for co-incident points', () => {
      const distance = vincentyDistance(nyc, nyc);
      expect(distance).toBe(0);
    });
  });

  describe('distance3D()', () => {
    it('should include elevation in distance', () => {
      const mountain: GeoPoint = { ...nyc, elevation: 1000 };
      const valley: GeoPoint = { ...nyc, elevation: 0 };

      const distance = distance3D(mountain, valley);
      // Should be close to 1000m (vertical distance)
      expect(distance).toBeCloseTo(1000, -1);
    });

    it('should handle points without elevation', () => {
      const distance = distance3D(nyc, la);
      expect(distance).toBeGreaterThan(0);
    });
  });

  describe('bearing()', () => {
    it('should calculate bearing between points', () => {
      const bearingValue = bearing(nyc, la);
      // NYC to LA is roughly west-southwest (~270 degrees)
      expect(bearingValue).toBeGreaterThan(250);
      expect(bearingValue).toBeLessThan(280);
    });

    it('should return value between 0 and 360', () => {
      const bearingValue = bearing(nyc, london);
      expect(bearingValue).toBeGreaterThanOrEqual(0);
      expect(bearingValue).toBeLessThan(360);
    });
  });

  describe('destination()', () => {
    it('should calculate destination point', () => {
      const dest = destination(nyc, 1000, 90); // 1km east

      expect(dest.latitude).toBeCloseTo(nyc.latitude, 2);
      expect(dest.longitude).toBeGreaterThan(nyc.longitude);
    });

    it('should handle various bearings', () => {
      const north = destination(nyc, 1000, 0);
      const south = destination(nyc, 1000, 180);

      expect(north.latitude).toBeGreaterThan(nyc.latitude);
      expect(south.latitude).toBeLessThan(nyc.latitude);
    });
  });

  describe('midpoint()', () => {
    it('should calculate midpoint between two points', () => {
      const mid = midpoint(nyc, la);

      // Midpoint should be roughly between the two
      expect(mid.latitude).toBeLessThan(nyc.latitude);
      expect(mid.latitude).toBeGreaterThan(la.latitude);
    });
  });

  describe('centroid()', () => {
    it('should calculate centroid of multiple points', () => {
      const points = [nyc, la, london];
      const center = centroid(points);

      expect(center.latitude).toBeDefined();
      expect(center.longitude).toBeDefined();
    });

    it('should return same point for single input', () => {
      const center = centroid([nyc]);
      expect(center.latitude).toBeCloseTo(nyc.latitude, 5);
      expect(center.longitude).toBeCloseTo(nyc.longitude, 5);
    });

    it('should throw for empty array', () => {
      expect(() => centroid([])).toThrow();
    });
  });
});
