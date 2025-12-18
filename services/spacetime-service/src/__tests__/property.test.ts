/**
 * Property-based tests using fast-check
 */

import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';
import {
  intervalsOverlap,
  overlapDuration,
  mergeIntervals,
  intervalIntersection,
} from '../utils/time.js';
import {
  haversineDistance,
  calculateCentroid,
  pointInPolygon,
} from '../utils/geo.js';
import type { Coordinate } from '../types/index.js';

// Arbitraries for generating test data
const coordinateArb = fc.record({
  latitude: fc.double({ min: -90, max: 90, noNaN: true }),
  longitude: fc.double({ min: -180, max: 180, noNaN: true }),
});

const validIntervalArb = fc.tuple(
  fc.nat({ max: 1000000 }),
  fc.nat({ max: 1000000 }),
).map(([a, b]) => ({
  start: Math.min(a, b),
  end: Math.max(a, b),
}));

describe('Property-based tests: Time utilities', () => {
  describe('intervalsOverlap', () => {
    it('is commutative', () => {
      fc.assert(
        fc.property(validIntervalArb, validIntervalArb, (a, b) => {
          return intervalsOverlap(a, b) === intervalsOverlap(b, a);
        }),
      );
    });

    it('interval always overlaps with itself', () => {
      fc.assert(
        fc.property(validIntervalArb, (interval) => {
          return intervalsOverlap(interval, interval);
        }),
      );
    });

    it('non-overlapping intervals have zero overlap duration', () => {
      fc.assert(
        fc.property(validIntervalArb, validIntervalArb, (a, b) => {
          if (!intervalsOverlap(a, b)) {
            return overlapDuration(a, b) === 0;
          }
          return true;
        }),
      );
    });
  });

  describe('overlapDuration', () => {
    it('is commutative', () => {
      fc.assert(
        fc.property(validIntervalArb, validIntervalArb, (a, b) => {
          return overlapDuration(a, b) === overlapDuration(b, a);
        }),
      );
    });

    it('is non-negative', () => {
      fc.assert(
        fc.property(validIntervalArb, validIntervalArb, (a, b) => {
          return overlapDuration(a, b) >= 0;
        }),
      );
    });

    it('overlap duration <= min interval length', () => {
      fc.assert(
        fc.property(validIntervalArb, validIntervalArb, (a, b) => {
          const overlap = overlapDuration(a, b);
          const minLength = Math.min(a.end - a.start, b.end - b.start);
          return overlap <= minLength;
        }),
      );
    });
  });

  describe('intervalIntersection', () => {
    it('intersection is contained in both intervals', () => {
      fc.assert(
        fc.property(validIntervalArb, validIntervalArb, (a, b) => {
          const intersection = intervalIntersection(a, b);
          if (intersection === null) {
            return !intervalsOverlap(a, b);
          }
          return (
            intersection.start >= a.start &&
            intersection.end <= a.end &&
            intersection.start >= b.start &&
            intersection.end <= b.end
          );
        }),
      );
    });
  });

  describe('mergeIntervals', () => {
    it('merged intervals are non-overlapping', () => {
      fc.assert(
        fc.property(fc.array(validIntervalArb, { maxLength: 20 }), (intervals) => {
          const merged = mergeIntervals(intervals);
          for (let i = 1; i < merged.length; i++) {
            // Each interval should start after previous ends
            if (merged[i].start <= merged[i - 1].end) {
              return false;
            }
          }
          return true;
        }),
      );
    });

    it('merged result covers same total time', () => {
      fc.assert(
        fc.property(fc.array(validIntervalArb, { maxLength: 10 }), (intervals) => {
          if (intervals.length === 0) return true;

          const merged = mergeIntervals(intervals);

          // Check a sample of points
          const samplePoints = intervals.flatMap((i) => [i.start, i.end]);
          for (const point of samplePoints) {
            const inOriginal = intervals.some(
              (i) => point >= i.start && point <= i.end,
            );
            const inMerged = merged.some(
              (i) => point >= i.start && point <= i.end,
            );
            if (inOriginal !== inMerged) {
              return false;
            }
          }
          return true;
        }),
      );
    });

    it('merged result length <= original length', () => {
      fc.assert(
        fc.property(fc.array(validIntervalArb, { maxLength: 20 }), (intervals) => {
          const merged = mergeIntervals(intervals);
          return merged.length <= intervals.length;
        }),
      );
    });
  });
});

describe('Property-based tests: Geo utilities', () => {
  describe('haversineDistance', () => {
    it('distance is non-negative', () => {
      fc.assert(
        fc.property(coordinateArb, coordinateArb, (a, b) => {
          return haversineDistance(a, b) >= 0;
        }),
      );
    });

    it('distance is symmetric', () => {
      fc.assert(
        fc.property(coordinateArb, coordinateArb, (a, b) => {
          const d1 = haversineDistance(a, b);
          const d2 = haversineDistance(b, a);
          return Math.abs(d1 - d2) < 0.001; // Allow for floating point errors
        }),
      );
    });

    it('distance to self is zero', () => {
      fc.assert(
        fc.property(coordinateArb, (coord) => {
          return haversineDistance(coord, coord) === 0;
        }),
      );
    });

    it('satisfies triangle inequality', () => {
      fc.assert(
        fc.property(coordinateArb, coordinateArb, coordinateArb, (a, b, c) => {
          const ab = haversineDistance(a, b);
          const bc = haversineDistance(b, c);
          const ac = haversineDistance(a, c);
          // Triangle inequality: d(a,c) <= d(a,b) + d(b,c)
          return ac <= ab + bc + 1; // +1 for floating point tolerance
        }),
      );
    });

    it('distance is bounded by half Earth circumference', () => {
      fc.assert(
        fc.property(coordinateArb, coordinateArb, (a, b) => {
          const distance = haversineDistance(a, b);
          const halfCircumference = Math.PI * 6371000; // ~20,000 km
          return distance <= halfCircumference + 1000;
        }),
      );
    });
  });

  describe('calculateCentroid', () => {
    it('centroid of single point is the point itself', () => {
      fc.assert(
        fc.property(coordinateArb, (coord) => {
          const centroid = calculateCentroid([coord]);
          return (
            Math.abs(centroid.latitude - coord.latitude) < 0.0001 &&
            Math.abs(centroid.longitude - coord.longitude) < 0.0001
          );
        }),
      );
    });

    it('centroid is within bounding box of points', () => {
      fc.assert(
        fc.property(
          fc.array(coordinateArb, { minLength: 1, maxLength: 20 }),
          (coords) => {
            const centroid = calculateCentroid(coords);
            const minLat = Math.min(...coords.map((c) => c.latitude));
            const maxLat = Math.max(...coords.map((c) => c.latitude));
            const minLon = Math.min(...coords.map((c) => c.longitude));
            const maxLon = Math.max(...coords.map((c) => c.longitude));

            // Allow some tolerance for spherical geometry effects
            const tolerance = 5;
            return (
              centroid.latitude >= minLat - tolerance &&
              centroid.latitude <= maxLat + tolerance &&
              centroid.longitude >= minLon - tolerance &&
              centroid.longitude <= maxLon + tolerance
            );
          },
        ),
      );
    });
  });

  describe('pointInPolygon', () => {
    it('point at polygon vertex may be inside or on edge', () => {
      // This is a known edge case - the result depends on implementation
      // Just ensure it doesn't throw
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 10, noNaN: true }),
          fc.double({ min: 0, max: 10, noNaN: true }),
          (x, y) => {
            const polygon = [
              [
                [0, 0],
                [10, 0],
                [10, 10],
                [0, 10],
                [0, 0],
              ],
            ] as [number, number][][];

            // Should not throw
            const result = pointInPolygon({ latitude: y, longitude: x }, polygon);
            return typeof result === 'boolean';
          },
        ),
      );
    });

    it('point clearly inside is inside', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 9, noNaN: true }),
          fc.double({ min: 1, max: 9, noNaN: true }),
          (x, y) => {
            const polygon = [
              [
                [0, 0],
                [10, 0],
                [10, 10],
                [0, 10],
                [0, 0],
              ],
            ] as [number, number][][];

            return pointInPolygon({ latitude: y, longitude: x }, polygon);
          },
        ),
      );
    });

    it('point clearly outside is outside', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 20, max: 100, noNaN: true }),
          fc.double({ min: 20, max: 100, noNaN: true }),
          (x, y) => {
            const polygon = [
              [
                [0, 0],
                [10, 0],
                [10, 10],
                [0, 10],
                [0, 0],
              ],
            ] as [number, number][][];

            return !pointInPolygon({ latitude: y, longitude: x }, polygon);
          },
        ),
      );
    });
  });
});

describe('Property-based tests: Edge cases', () => {
  describe('Zero-length intervals', () => {
    it('zero-length interval overlaps with itself', () => {
      fc.assert(
        fc.property(fc.nat({ max: 1000000 }), (time) => {
          const interval = { start: time, end: time };
          return intervalsOverlap(interval, interval);
        }),
      );
    });

    it('zero-length interval overlap duration is zero', () => {
      fc.assert(
        fc.property(fc.nat({ max: 1000000 }), (time) => {
          const interval = { start: time, end: time };
          return overlapDuration(interval, interval) === 0;
        }),
      );
    });
  });

  describe('Boundary coordinates', () => {
    it('handles extreme latitudes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(-90, 90),
          fc.double({ min: -180, max: 180, noNaN: true }),
          (lat, lon) => {
            const coord = { latitude: lat, longitude: lon };
            const distance = haversineDistance(coord, { latitude: 0, longitude: 0 });
            return distance >= 0 && isFinite(distance);
          },
        ),
      );
    });

    it('handles extreme longitudes', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -90, max: 90, noNaN: true }),
          fc.constantFrom(-180, 180),
          (lat, lon) => {
            const coord = { latitude: lat, longitude: lon };
            const distance = haversineDistance(coord, { latitude: 0, longitude: 0 });
            return distance >= 0 && isFinite(distance);
          },
        ),
      );
    });
  });
});
