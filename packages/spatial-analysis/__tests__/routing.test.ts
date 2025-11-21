/**
 * Route analysis tests
 */

import {
  calculateRoute,
  dijkstraShortestPath,
  optimizeMultiStop,
  generateIsochrone,
  estimateTravelTime,
  findReachablePoints,
  calculatePathLength,
  simplifyPath,
} from '../src/routing/route-analysis';
import { GeoPoint } from '@intelgraph/geospatial';

describe('Route Analysis', () => {
  const nyc: GeoPoint = { latitude: 40.7128, longitude: -74.006 };
  const boston: GeoPoint = { latitude: 42.3601, longitude: -71.0589 };
  const philly: GeoPoint = { latitude: 39.9526, longitude: -75.1652 };
  const dc: GeoPoint = { latitude: 38.9072, longitude: -77.0369 };

  describe('calculateRoute()', () => {
    it('should calculate route between waypoints', () => {
      const route = calculateRoute([nyc, boston]);

      expect(route.segments).toHaveLength(1);
      expect(route.totalDistance).toBeGreaterThan(0);
      expect(route.totalDuration).toBeGreaterThan(0);
      expect(route.waypoints).toHaveLength(2);
    });

    it('should handle multiple waypoints', () => {
      const route = calculateRoute([nyc, philly, dc]);

      expect(route.segments).toHaveLength(2);
      expect(route.waypoints).toHaveLength(3);
    });

    it('should throw for less than 2 waypoints', () => {
      expect(() => calculateRoute([nyc])).toThrow();
    });

    it('should respect travel mode', () => {
      const walking = calculateRoute([nyc, philly], { mode: 'walking' });
      const driving = calculateRoute([nyc, philly], { mode: 'driving' });

      // Walking should take longer
      expect(walking.totalDuration).toBeGreaterThan(driving.totalDuration);
    });
  });

  describe('dijkstraShortestPath()', () => {
    const graph = new Map([
      ['A', new Map([['B', 1], ['C', 4]])],
      ['B', new Map([['A', 1], ['C', 2], ['D', 5]])],
      ['C', new Map([['A', 4], ['B', 2], ['D', 1]])],
      ['D', new Map([['B', 5], ['C', 1]])],
    ]);

    it('should find shortest path', () => {
      const result = dijkstraShortestPath(graph, 'A', 'D');

      expect(result).not.toBeNull();
      expect(result!.path).toContain('A');
      expect(result!.path).toContain('D');
      expect(result!.distance).toBe(4); // A->B->C->D = 1+2+1
    });

    it('should return null for unreachable nodes', () => {
      const disconnectedGraph = new Map([
        ['A', new Map([['B', 1]])],
        ['B', new Map([['A', 1]])],
        ['C', new Map()],
      ]);

      const result = dijkstraShortestPath(disconnectedGraph, 'A', 'C');
      expect(result).toBeNull();
    });
  });

  describe('optimizeMultiStop()', () => {
    it('should optimize stop order', () => {
      const result = optimizeMultiStop(nyc, [dc, boston, philly]);

      expect(result.orderedStops).toHaveLength(3);
      expect(result.totalDistance).toBeGreaterThan(0);
    });

    it('should return empty for no stops', () => {
      const result = optimizeMultiStop(nyc, []);
      expect(result.orderedStops).toHaveLength(0);
      expect(result.totalDistance).toBe(0);
    });

    it('should calculate return distance when requested', () => {
      const withoutReturn = optimizeMultiStop(nyc, [boston], false);
      const withReturn = optimizeMultiStop(nyc, [boston], true);

      expect(withReturn.totalDistance).toBeGreaterThan(withoutReturn.totalDistance);
    });
  });

  describe('generateIsochrone()', () => {
    it('should generate isochrone polygon', () => {
      const isochrone = generateIsochrone(nyc, 3600, 'driving');

      expect(isochrone.center).toEqual(nyc);
      expect(isochrone.time).toBe(3600);
      expect(isochrone.mode).toBe('driving');
      expect(isochrone.geometry.type).toBe('Polygon');
      expect(isochrone.area).toBeGreaterThan(0);
    });

    it('should create larger isochrone for longer time', () => {
      const short = generateIsochrone(nyc, 1800, 'driving');
      const long = generateIsochrone(nyc, 3600, 'driving');

      expect(long.area).toBeGreaterThan(short.area!);
    });

    it('should respect transport mode', () => {
      const walking = generateIsochrone(nyc, 3600, 'walking');
      const driving = generateIsochrone(nyc, 3600, 'driving');

      expect(driving.area).toBeGreaterThan(walking.area!);
    });
  });

  describe('estimateTravelTime()', () => {
    it('should estimate travel time', () => {
      const time = estimateTravelTime(nyc, boston);
      expect(time).toBeGreaterThan(0);
    });

    it('should return longer time for walking', () => {
      const walking = estimateTravelTime(nyc, boston, 'walking');
      const driving = estimateTravelTime(nyc, boston, 'driving');

      expect(walking).toBeGreaterThan(driving);
    });
  });

  describe('findReachablePoints()', () => {
    it('should find points within time limit', () => {
      const candidates = [boston, philly, dc];
      const reachable = findReachablePoints(nyc, candidates, 7200, 'driving');

      expect(reachable.length).toBeGreaterThan(0);
      reachable.forEach((r) => {
        expect(r.travelTime).toBeLessThanOrEqual(7200);
      });
    });

    it('should sort by travel time', () => {
      const candidates = [boston, philly, dc];
      const reachable = findReachablePoints(nyc, candidates, 100000, 'driving');

      for (let i = 1; i < reachable.length; i++) {
        expect(reachable[i].travelTime).toBeGreaterThanOrEqual(
          reachable[i - 1].travelTime
        );
      }
    });
  });

  describe('calculatePathLength()', () => {
    it('should calculate total path length', () => {
      const length = calculatePathLength([nyc, philly, dc]);
      expect(length).toBeGreaterThan(0);
    });

    it('should return 0 for single point', () => {
      const length = calculatePathLength([nyc]);
      expect(length).toBe(0);
    });
  });

  describe('simplifyPath()', () => {
    it('should simplify complex path', () => {
      const complexPath: GeoPoint[] = [
        { latitude: 40.7128, longitude: -74.006 },
        { latitude: 40.713, longitude: -74.005 },
        { latitude: 40.7132, longitude: -74.004 },
        { latitude: 40.7134, longitude: -74.003 },
        { latitude: 40.7136, longitude: -74.002 },
      ];

      const simplified = simplifyPath(complexPath, 0.001);
      expect(simplified.length).toBeLessThanOrEqual(complexPath.length);
    });

    it('should return same for 2 or fewer points', () => {
      const path = [nyc, boston];
      const simplified = simplifyPath(path, 0.1);
      expect(simplified).toHaveLength(2);
    });
  });
});
