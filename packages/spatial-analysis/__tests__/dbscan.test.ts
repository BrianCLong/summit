/**
 * DBSCAN clustering algorithm tests
 */

import { DBSCAN, dbscan, findOptimalEpsilon } from '../src/clustering/dbscan';
import { GeoPoint } from '@intelgraph/geospatial';

describe('DBSCAN Clustering', () => {
  const clusterA: GeoPoint[] = [
    { latitude: 40.7128, longitude: -74.0060 },
    { latitude: 40.7129, longitude: -74.0061 },
    { latitude: 40.7130, longitude: -74.0062 },
    { latitude: 40.7131, longitude: -74.0063 },
  ];

  const clusterB: GeoPoint[] = [
    { latitude: 40.8000, longitude: -73.9500 },
    { latitude: 40.8001, longitude: -73.9501 },
    { latitude: 40.8002, longitude: -73.9502 },
  ];

  const noisePoint: GeoPoint = { latitude: 41.0000, longitude: -73.5000 };

  const allPoints = [...clusterA, ...clusterB, noisePoint];

  describe('dbscan()', () => {
    it('should identify distinct clusters', () => {
      const clusters = dbscan(allPoints, 500, 2); // 500m epsilon, 2 min points

      // Should find at least 2 clusters (plus possibly noise)
      const realClusters = clusters.filter((c) => !c.noise);
      expect(realClusters.length).toBeGreaterThanOrEqual(2);
    });

    it('should identify noise points', () => {
      const clusters = dbscan(allPoints, 500, 2);

      const noiseCluster = clusters.find((c) => c.noise);
      expect(noiseCluster).toBeDefined();
      expect(noiseCluster!.points.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array for empty input', () => {
      const clusters = dbscan([], 500, 2);
      expect(clusters).toHaveLength(0);
    });

    it('should calculate cluster centroids', () => {
      const clusters = dbscan(clusterA, 500, 2);

      clusters.forEach((cluster) => {
        expect(cluster.centroid).toBeDefined();
        expect(cluster.centroid.latitude).toBeGreaterThan(0);
        expect(cluster.centroid.longitude).toBeLessThan(0);
      });
    });

    it('should calculate cluster density', () => {
      const clusters = dbscan(clusterA, 500, 2);

      clusters.forEach((cluster) => {
        expect(cluster.density).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('DBSCAN class', () => {
    it('should create instance with config', () => {
      const clusterer = new DBSCAN({ epsilon: 1000, minPoints: 3 });
      expect(clusterer).toBeInstanceOf(DBSCAN);
    });

    it('should cluster using instance method', () => {
      const clusterer = new DBSCAN({ epsilon: 500, minPoints: 2 });
      const clusters = clusterer.cluster(clusterA);

      expect(clusters.length).toBeGreaterThan(0);
    });
  });

  describe('findOptimalEpsilon()', () => {
    it('should return a positive number', () => {
      const epsilon = findOptimalEpsilon(allPoints, 4);
      expect(epsilon).toBeGreaterThan(0);
    });

    it('should work with small k values', () => {
      const epsilon = findOptimalEpsilon(allPoints, 2);
      expect(epsilon).toBeGreaterThan(0);
    });
  });
});
