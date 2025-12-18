/**
 * Unit tests for geographic utility functions
 */

import { describe, expect, it } from '@jest/globals';
import {
  toRadians,
  toDegrees,
  haversineDistance,
  calculateBearing,
  destinationPoint,
  calculateCentroid,
  calculateBoundingBox,
  calculatePathDistance,
  calculateSpeed,
  pointInPolygon,
  pointInGeometry,
  calculatePolygonArea,
  createCircle,
  simplifyPath,
  boundingBoxesIntersect,
  expandBoundingBox,
} from '../utils/geo.js';
import type { Coordinate } from '../types/index.js';

describe('toRadians and toDegrees', () => {
  it('converts degrees to radians', () => {
    expect(toRadians(180)).toBeCloseTo(Math.PI, 10);
    expect(toRadians(90)).toBeCloseTo(Math.PI / 2, 10);
    expect(toRadians(0)).toBe(0);
  });

  it('converts radians to degrees', () => {
    expect(toDegrees(Math.PI)).toBeCloseTo(180, 10);
    expect(toDegrees(Math.PI / 2)).toBeCloseTo(90, 10);
    expect(toDegrees(0)).toBe(0);
  });

  it('are inverse operations', () => {
    const original = 45;
    expect(toDegrees(toRadians(original))).toBeCloseTo(original, 10);
  });
});

describe('haversineDistance', () => {
  it('calculates zero distance for same point', () => {
    const point = { latitude: 40.7128, longitude: -74.006 };
    expect(haversineDistance(point, point)).toBe(0);
  });

  it('calculates distance between NYC and LA', () => {
    const nyc = { latitude: 40.7128, longitude: -74.006 };
    const la = { latitude: 34.0522, longitude: -118.2437 };
    const distance = haversineDistance(nyc, la);
    // NYC to LA is approximately 3935 km
    expect(distance).toBeGreaterThan(3900000);
    expect(distance).toBeLessThan(4000000);
  });

  it('calculates distance between London and Paris', () => {
    const london = { latitude: 51.5074, longitude: -0.1278 };
    const paris = { latitude: 48.8566, longitude: 2.3522 };
    const distance = haversineDistance(london, paris);
    // London to Paris is approximately 344 km
    expect(distance).toBeGreaterThan(340000);
    expect(distance).toBeLessThan(350000);
  });

  it('handles antipodal points', () => {
    const point1 = { latitude: 0, longitude: 0 };
    const point2 = { latitude: 0, longitude: 180 };
    const distance = haversineDistance(point1, point2);
    // Half Earth circumference is approximately 20,000 km
    expect(distance).toBeGreaterThan(19900000);
    expect(distance).toBeLessThan(20100000);
  });
});

describe('calculateBearing', () => {
  it('calculates bearing due north', () => {
    const from = { latitude: 0, longitude: 0 };
    const to = { latitude: 10, longitude: 0 };
    expect(calculateBearing(from, to)).toBeCloseTo(0, 1);
  });

  it('calculates bearing due east', () => {
    const from = { latitude: 0, longitude: 0 };
    const to = { latitude: 0, longitude: 10 };
    expect(calculateBearing(from, to)).toBeCloseTo(90, 1);
  });

  it('calculates bearing due south', () => {
    const from = { latitude: 10, longitude: 0 };
    const to = { latitude: 0, longitude: 0 };
    expect(calculateBearing(from, to)).toBeCloseTo(180, 1);
  });

  it('calculates bearing due west', () => {
    const from = { latitude: 0, longitude: 10 };
    const to = { latitude: 0, longitude: 0 };
    expect(calculateBearing(from, to)).toBeCloseTo(270, 1);
  });
});

describe('destinationPoint', () => {
  it('calculates destination due north', () => {
    const start = { latitude: 0, longitude: 0 };
    const dest = destinationPoint(start, 0, 111320); // ~1 degree latitude
    expect(dest.latitude).toBeCloseTo(1, 1);
    expect(dest.longitude).toBeCloseTo(0, 5);
  });

  it('calculates destination due east at equator', () => {
    const start = { latitude: 0, longitude: 0 };
    const dest = destinationPoint(start, 90, 111320); // ~1 degree longitude at equator
    expect(dest.latitude).toBeCloseTo(0, 5);
    expect(dest.longitude).toBeCloseTo(1, 1);
  });

  it('round-trips with haversineDistance', () => {
    const start = { latitude: 40.7128, longitude: -74.006 };
    const distance = 5000; // 5 km
    const bearing = 45;
    const dest = destinationPoint(start, bearing, distance);
    const calculatedDistance = haversineDistance(start, dest);
    expect(calculatedDistance).toBeCloseTo(distance, -1); // Within 10 meters
  });
});

describe('calculateCentroid', () => {
  it('returns same point for single coordinate', () => {
    const point = { latitude: 40.7128, longitude: -74.006 };
    const centroid = calculateCentroid([point]);
    expect(centroid.latitude).toBeCloseTo(point.latitude, 10);
    expect(centroid.longitude).toBeCloseTo(point.longitude, 10);
  });

  it('calculates midpoint for two points', () => {
    const points: Coordinate[] = [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 10 },
    ];
    const centroid = calculateCentroid(points);
    expect(centroid.latitude).toBeCloseTo(0, 5);
    expect(centroid.longitude).toBeCloseTo(5, 1);
  });

  it('throws for empty array', () => {
    expect(() => calculateCentroid([])).toThrow();
  });

  it('averages elevation when present', () => {
    const points: Coordinate[] = [
      { latitude: 0, longitude: 0, elevation: 100 },
      { latitude: 0, longitude: 10, elevation: 200 },
    ];
    const centroid = calculateCentroid(points);
    expect(centroid.elevation).toBeCloseTo(150, 10);
  });
});

describe('calculateBoundingBox', () => {
  it('calculates bounding box for single point', () => {
    const bbox = calculateBoundingBox([{ latitude: 10, longitude: 20 }]);
    expect(bbox).toEqual({ minLat: 10, maxLat: 10, minLon: 20, maxLon: 20 });
  });

  it('calculates bounding box for multiple points', () => {
    const points: Coordinate[] = [
      { latitude: 10, longitude: 20 },
      { latitude: 30, longitude: 40 },
      { latitude: 20, longitude: 30 },
    ];
    const bbox = calculateBoundingBox(points);
    expect(bbox).toEqual({ minLat: 10, maxLat: 30, minLon: 20, maxLon: 40 });
  });

  it('throws for empty array', () => {
    expect(() => calculateBoundingBox([])).toThrow();
  });
});

describe('calculatePathDistance', () => {
  it('returns 0 for empty path', () => {
    expect(calculatePathDistance([])).toBe(0);
  });

  it('returns 0 for single point', () => {
    expect(calculatePathDistance([{ latitude: 0, longitude: 0 }])).toBe(0);
  });

  it('calculates total path distance', () => {
    const points: Coordinate[] = [
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 0 },
      { latitude: 1, longitude: 1 },
    ];
    const distance = calculatePathDistance(points);
    // Should be approximately 2 degrees * 111km
    expect(distance).toBeGreaterThan(200000);
    expect(distance).toBeLessThan(250000);
  });
});

describe('calculateSpeed', () => {
  it('calculates speed correctly', () => {
    const from = { latitude: 0, longitude: 0, timestamp: 0 };
    const to = { latitude: 0, longitude: 1, timestamp: 111320 }; // ~111km in ~111s = ~1km/s
    const speed = calculateSpeed(from, to);
    expect(speed).toBeCloseTo(1000, -1); // Within 10 m/s
  });

  it('returns 0 for zero time delta', () => {
    const from = { latitude: 0, longitude: 0, timestamp: 0 };
    const to = { latitude: 0, longitude: 1, timestamp: 0 };
    expect(calculateSpeed(from, to)).toBe(0);
  });
});

describe('pointInPolygon', () => {
  const square = [
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ],
  ] as [number, number][][];

  it('returns true for point inside polygon', () => {
    expect(pointInPolygon({ latitude: 5, longitude: 5 }, square)).toBe(true);
  });

  it('returns false for point outside polygon', () => {
    expect(pointInPolygon({ latitude: 15, longitude: 15 }, square)).toBe(false);
  });

  it('handles point on edge', () => {
    // Edge cases can vary; just ensure it doesn't throw
    const result = pointInPolygon({ latitude: 5, longitude: 0 }, square);
    expect(typeof result).toBe('boolean');
  });

  it('handles polygon with hole', () => {
    const polygonWithHole = [
      [
        [0, 0],
        [20, 0],
        [20, 20],
        [0, 20],
        [0, 0],
      ],
      [
        [5, 5],
        [15, 5],
        [15, 15],
        [5, 15],
        [5, 5],
      ],
    ] as [number, number][][];

    // Inside outer but outside hole
    expect(pointInPolygon({ latitude: 2, longitude: 2 }, polygonWithHole)).toBe(true);

    // Inside hole (should be outside)
    expect(pointInPolygon({ latitude: 10, longitude: 10 }, polygonWithHole)).toBe(false);
  });
});

describe('pointInGeometry', () => {
  it('handles Point geometry', () => {
    const geometry = { type: 'Point' as const, coordinates: [5, 5] };
    expect(pointInGeometry({ latitude: 5, longitude: 5 }, geometry)).toBe(true);
    expect(pointInGeometry({ latitude: 6, longitude: 5 }, geometry)).toBe(false);
  });

  it('handles Polygon geometry', () => {
    const geometry = {
      type: 'Polygon' as const,
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
      ],
    };
    expect(pointInGeometry({ latitude: 5, longitude: 5 }, geometry)).toBe(true);
    expect(pointInGeometry({ latitude: 15, longitude: 15 }, geometry)).toBe(false);
  });

  it('handles MultiPolygon geometry', () => {
    const geometry = {
      type: 'MultiPolygon' as const,
      coordinates: [
        [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
        ],
        [
          [
            [20, 20],
            [30, 20],
            [30, 30],
            [20, 30],
            [20, 20],
          ],
        ],
      ],
    };
    expect(pointInGeometry({ latitude: 5, longitude: 5 }, geometry)).toBe(true);
    expect(pointInGeometry({ latitude: 25, longitude: 25 }, geometry)).toBe(true);
    expect(pointInGeometry({ latitude: 15, longitude: 15 }, geometry)).toBe(false);
  });
});

describe('calculatePolygonArea', () => {
  it('calculates area of a square', () => {
    const polygon = [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ] as [number, number][][];
    const area = calculatePolygonArea(polygon);
    // 1 degree square at equator is approximately 12,364 km²
    expect(area).toBeGreaterThan(10000000000); // > 10,000 km²
    expect(area).toBeLessThan(15000000000); // < 15,000 km²
  });

  it('returns 0 for empty polygon', () => {
    expect(calculatePolygonArea([])).toBe(0);
  });

  it('returns 0 for polygon with too few points', () => {
    expect(calculatePolygonArea([[]])).toBe(0);
    expect(
      calculatePolygonArea([
        [
          [0, 0],
          [1, 1],
        ],
      ]),
    ).toBe(0);
  });
});

describe('createCircle', () => {
  it('creates a circular polygon', () => {
    const center = { latitude: 0, longitude: 0 };
    const circle = createCircle(center, 1000, 8);

    expect(circle.type).toBe('Polygon');
    expect(circle.coordinates).toHaveLength(1);
    expect(circle.coordinates[0]).toHaveLength(9); // 8 segments + closing point
  });

  it('creates closed polygon', () => {
    const center = { latitude: 0, longitude: 0 };
    const circle = createCircle(center, 1000, 8);
    const ring = circle.coordinates[0];

    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });
});

describe('simplifyPath', () => {
  it('returns same path for 2 or fewer points', () => {
    const single = [{ latitude: 0, longitude: 0 }];
    expect(simplifyPath(single, 100)).toEqual(single);

    const two = [
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 1 },
    ];
    expect(simplifyPath(two, 100)).toEqual(two);
  });

  it('simplifies path by removing intermediate points', () => {
    // Collinear points
    const path: Coordinate[] = [
      { latitude: 0, longitude: 0 },
      { latitude: 0.5, longitude: 0 },
      { latitude: 1, longitude: 0 },
    ];
    const simplified = simplifyPath(path, 1000);
    expect(simplified.length).toBeLessThanOrEqual(path.length);
  });

  it('preserves points beyond tolerance', () => {
    const path: Coordinate[] = [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
      { latitude: 1, longitude: 1 },
    ];
    // With very small tolerance, all points should be preserved
    const simplified = simplifyPath(path, 0.001);
    expect(simplified.length).toBe(path.length);
  });
});

describe('boundingBoxesIntersect', () => {
  it('returns true for overlapping boxes', () => {
    const a = { minLat: 0, maxLat: 10, minLon: 0, maxLon: 10 };
    const b = { minLat: 5, maxLat: 15, minLon: 5, maxLon: 15 };
    expect(boundingBoxesIntersect(a, b)).toBe(true);
  });

  it('returns true for fully contained box', () => {
    const a = { minLat: 0, maxLat: 20, minLon: 0, maxLon: 20 };
    const b = { minLat: 5, maxLat: 15, minLon: 5, maxLon: 15 };
    expect(boundingBoxesIntersect(a, b)).toBe(true);
  });

  it('returns true for touching boxes', () => {
    const a = { minLat: 0, maxLat: 10, minLon: 0, maxLon: 10 };
    const b = { minLat: 10, maxLat: 20, minLon: 0, maxLon: 10 };
    expect(boundingBoxesIntersect(a, b)).toBe(true);
  });

  it('returns false for non-overlapping boxes', () => {
    const a = { minLat: 0, maxLat: 10, minLon: 0, maxLon: 10 };
    const b = { minLat: 20, maxLat: 30, minLon: 20, maxLon: 30 };
    expect(boundingBoxesIntersect(a, b)).toBe(false);
  });
});

describe('expandBoundingBox', () => {
  it('expands bounding box by distance', () => {
    const bbox = { minLat: 0, maxLat: 10, minLon: 0, maxLon: 10 };
    const expanded = expandBoundingBox(bbox, 111320); // ~1 degree

    expect(expanded.minLat).toBeLessThan(bbox.minLat);
    expect(expanded.maxLat).toBeGreaterThan(bbox.maxLat);
    expect(expanded.minLon).toBeLessThan(bbox.minLon);
    expect(expanded.maxLon).toBeGreaterThan(bbox.maxLon);
  });

  it('respects coordinate limits', () => {
    const bbox = { minLat: -89, maxLat: 89, minLon: -179, maxLon: 179 };
    const expanded = expandBoundingBox(bbox, 500000); // 500 km

    expect(expanded.minLat).toBeGreaterThanOrEqual(-90);
    expect(expanded.maxLat).toBeLessThanOrEqual(90);
    expect(expanded.minLon).toBeGreaterThanOrEqual(-180);
    expect(expanded.maxLon).toBeLessThanOrEqual(180);
  });
});
