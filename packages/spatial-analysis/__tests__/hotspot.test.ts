/**
 * Hotspot detection tests
 */

import {
  GetisOrdAnalysis,
  detectHotspots,
  detectHighValueHotspots,
  detectLowValueHotspots,
  kernelDensityEstimation,
  HotspotPoint,
} from '../src/hotspot/getis-ord';

describe('Hotspot Detection', () => {
  // Create sample data with a clear hotspot cluster
  const hotspotCluster: HotspotPoint[] = [
    { latitude: 40.7128, longitude: -74.006, value: 10 },
    { latitude: 40.7129, longitude: -74.0061, value: 12 },
    { latitude: 40.713, longitude: -74.0062, value: 15 },
    { latitude: 40.7131, longitude: -74.0063, value: 11 },
    { latitude: 40.7132, longitude: -74.0064, value: 14 },
  ];

  const coldspotCluster: HotspotPoint[] = [
    { latitude: 40.8, longitude: -73.95, value: 1 },
    { latitude: 40.8001, longitude: -73.9501, value: 2 },
    { latitude: 40.8002, longitude: -73.9502, value: 1 },
  ];

  const randomPoints: HotspotPoint[] = [
    { latitude: 40.85, longitude: -73.9, value: 5 },
    { latitude: 40.9, longitude: -73.85, value: 6 },
  ];

  const allPoints = [...hotspotCluster, ...coldspotCluster, ...randomPoints];

  describe('GetisOrdAnalysis', () => {
    it('should create analysis instance', () => {
      const analysis = new GetisOrdAnalysis({ distanceThreshold: 500 });
      expect(analysis).toBeInstanceOf(GetisOrdAnalysis);
    });

    it('should analyze points and return hotspots', () => {
      const analysis = new GetisOrdAnalysis({ distanceThreshold: 500 });
      const hotspots = analysis.analyze(allPoints);

      expect(Array.isArray(hotspots)).toBe(true);
    });

    it('should return empty array for empty input', () => {
      const analysis = new GetisOrdAnalysis({ distanceThreshold: 500 });
      const hotspots = analysis.analyze([]);

      expect(hotspots).toHaveLength(0);
    });
  });

  describe('detectHotspots()', () => {
    it('should detect hotspots in data', () => {
      const hotspots = detectHotspots(allPoints, 1000);

      expect(Array.isArray(hotspots)).toBe(true);
      hotspots.forEach((h) => {
        expect(h).toHaveProperty('location');
        expect(h).toHaveProperty('zScore');
        expect(h).toHaveProperty('pValue');
        expect(h).toHaveProperty('significance');
      });
    });

    it('should include z-scores in results', () => {
      const hotspots = detectHotspots(allPoints, 1000);

      hotspots.forEach((h) => {
        expect(typeof h.zScore).toBe('number');
        expect(!isNaN(h.zScore)).toBe(true);
      });
    });

    it('should include significance levels', () => {
      const hotspots = detectHotspots(allPoints, 1000);

      const validSignificance = ['high', 'medium', 'low', 'none'];
      hotspots.forEach((h) => {
        expect(validSignificance).toContain(h.significance);
      });
    });
  });

  describe('detectHighValueHotspots()', () => {
    it('should return only positive z-score hotspots', () => {
      const hotspots = detectHighValueHotspots(allPoints, 1000);

      hotspots.forEach((h) => {
        expect(h.zScore).toBeGreaterThan(0);
      });
    });
  });

  describe('detectLowValueHotspots()', () => {
    it('should return only negative z-score hotspots', () => {
      const hotspots = detectLowValueHotspots(allPoints, 1000);

      hotspots.forEach((h) => {
        expect(h.zScore).toBeLessThan(0);
      });
    });
  });

  describe('kernelDensityEstimation()', () => {
    it('should generate density grid', () => {
      const density = kernelDensityEstimation(hotspotCluster, 0.01, 500);

      expect(Array.isArray(density)).toBe(true);
    });

    it('should return objects with lat, lon, density', () => {
      const density = kernelDensityEstimation(hotspotCluster, 0.01, 500);

      if (density.length > 0) {
        expect(density[0]).toHaveProperty('latitude');
        expect(density[0]).toHaveProperty('longitude');
        expect(density[0]).toHaveProperty('density');
      }
    });

    it('should return empty for empty input', () => {
      const density = kernelDensityEstimation([], 0.01, 500);
      expect(density).toHaveLength(0);
    });
  });
});
