"use strict";
/**
 * Unit tests for geographic utility functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const geo_js_1 = require("../utils/geo.js");
(0, globals_1.describe)('toRadians and toDegrees', () => {
    (0, globals_1.it)('converts degrees to radians', () => {
        (0, globals_1.expect)((0, geo_js_1.toRadians)(180)).toBeCloseTo(Math.PI, 10);
        (0, globals_1.expect)((0, geo_js_1.toRadians)(90)).toBeCloseTo(Math.PI / 2, 10);
        (0, globals_1.expect)((0, geo_js_1.toRadians)(0)).toBe(0);
    });
    (0, globals_1.it)('converts radians to degrees', () => {
        (0, globals_1.expect)((0, geo_js_1.toDegrees)(Math.PI)).toBeCloseTo(180, 10);
        (0, globals_1.expect)((0, geo_js_1.toDegrees)(Math.PI / 2)).toBeCloseTo(90, 10);
        (0, globals_1.expect)((0, geo_js_1.toDegrees)(0)).toBe(0);
    });
    (0, globals_1.it)('are inverse operations', () => {
        const original = 45;
        (0, globals_1.expect)((0, geo_js_1.toDegrees)((0, geo_js_1.toRadians)(original))).toBeCloseTo(original, 10);
    });
});
(0, globals_1.describe)('haversineDistance', () => {
    (0, globals_1.it)('calculates zero distance for same point', () => {
        const point = { latitude: 40.7128, longitude: -74.006 };
        (0, globals_1.expect)((0, geo_js_1.haversineDistance)(point, point)).toBe(0);
    });
    (0, globals_1.it)('calculates distance between NYC and LA', () => {
        const nyc = { latitude: 40.7128, longitude: -74.006 };
        const la = { latitude: 34.0522, longitude: -118.2437 };
        const distance = (0, geo_js_1.haversineDistance)(nyc, la);
        // NYC to LA is approximately 3935 km
        (0, globals_1.expect)(distance).toBeGreaterThan(3900000);
        (0, globals_1.expect)(distance).toBeLessThan(4000000);
    });
    (0, globals_1.it)('calculates distance between London and Paris', () => {
        const london = { latitude: 51.5074, longitude: -0.1278 };
        const paris = { latitude: 48.8566, longitude: 2.3522 };
        const distance = (0, geo_js_1.haversineDistance)(london, paris);
        // London to Paris is approximately 344 km
        (0, globals_1.expect)(distance).toBeGreaterThan(340000);
        (0, globals_1.expect)(distance).toBeLessThan(350000);
    });
    (0, globals_1.it)('handles antipodal points', () => {
        const point1 = { latitude: 0, longitude: 0 };
        const point2 = { latitude: 0, longitude: 180 };
        const distance = (0, geo_js_1.haversineDistance)(point1, point2);
        // Half Earth circumference is approximately 20,000 km
        (0, globals_1.expect)(distance).toBeGreaterThan(19900000);
        (0, globals_1.expect)(distance).toBeLessThan(20100000);
    });
});
(0, globals_1.describe)('calculateBearing', () => {
    (0, globals_1.it)('calculates bearing due north', () => {
        const from = { latitude: 0, longitude: 0 };
        const to = { latitude: 10, longitude: 0 };
        (0, globals_1.expect)((0, geo_js_1.calculateBearing)(from, to)).toBeCloseTo(0, 1);
    });
    (0, globals_1.it)('calculates bearing due east', () => {
        const from = { latitude: 0, longitude: 0 };
        const to = { latitude: 0, longitude: 10 };
        (0, globals_1.expect)((0, geo_js_1.calculateBearing)(from, to)).toBeCloseTo(90, 1);
    });
    (0, globals_1.it)('calculates bearing due south', () => {
        const from = { latitude: 10, longitude: 0 };
        const to = { latitude: 0, longitude: 0 };
        (0, globals_1.expect)((0, geo_js_1.calculateBearing)(from, to)).toBeCloseTo(180, 1);
    });
    (0, globals_1.it)('calculates bearing due west', () => {
        const from = { latitude: 0, longitude: 10 };
        const to = { latitude: 0, longitude: 0 };
        (0, globals_1.expect)((0, geo_js_1.calculateBearing)(from, to)).toBeCloseTo(270, 1);
    });
});
(0, globals_1.describe)('destinationPoint', () => {
    (0, globals_1.it)('calculates destination due north', () => {
        const start = { latitude: 0, longitude: 0 };
        const dest = (0, geo_js_1.destinationPoint)(start, 0, 111320); // ~1 degree latitude
        (0, globals_1.expect)(dest.latitude).toBeCloseTo(1, 1);
        (0, globals_1.expect)(dest.longitude).toBeCloseTo(0, 5);
    });
    (0, globals_1.it)('calculates destination due east at equator', () => {
        const start = { latitude: 0, longitude: 0 };
        const dest = (0, geo_js_1.destinationPoint)(start, 90, 111320); // ~1 degree longitude at equator
        (0, globals_1.expect)(dest.latitude).toBeCloseTo(0, 5);
        (0, globals_1.expect)(dest.longitude).toBeCloseTo(1, 1);
    });
    (0, globals_1.it)('round-trips with haversineDistance', () => {
        const start = { latitude: 40.7128, longitude: -74.006 };
        const distance = 5000; // 5 km
        const bearing = 45;
        const dest = (0, geo_js_1.destinationPoint)(start, bearing, distance);
        const calculatedDistance = (0, geo_js_1.haversineDistance)(start, dest);
        (0, globals_1.expect)(calculatedDistance).toBeCloseTo(distance, -1); // Within 10 meters
    });
});
(0, globals_1.describe)('calculateCentroid', () => {
    (0, globals_1.it)('returns same point for single coordinate', () => {
        const point = { latitude: 40.7128, longitude: -74.006 };
        const centroid = (0, geo_js_1.calculateCentroid)([point]);
        (0, globals_1.expect)(centroid.latitude).toBeCloseTo(point.latitude, 10);
        (0, globals_1.expect)(centroid.longitude).toBeCloseTo(point.longitude, 10);
    });
    (0, globals_1.it)('calculates midpoint for two points', () => {
        const points = [
            { latitude: 0, longitude: 0 },
            { latitude: 0, longitude: 10 },
        ];
        const centroid = (0, geo_js_1.calculateCentroid)(points);
        (0, globals_1.expect)(centroid.latitude).toBeCloseTo(0, 5);
        (0, globals_1.expect)(centroid.longitude).toBeCloseTo(5, 1);
    });
    (0, globals_1.it)('throws for empty array', () => {
        (0, globals_1.expect)(() => (0, geo_js_1.calculateCentroid)([])).toThrow();
    });
    (0, globals_1.it)('averages elevation when present', () => {
        const points = [
            { latitude: 0, longitude: 0, elevation: 100 },
            { latitude: 0, longitude: 10, elevation: 200 },
        ];
        const centroid = (0, geo_js_1.calculateCentroid)(points);
        (0, globals_1.expect)(centroid.elevation).toBeCloseTo(150, 10);
    });
});
(0, globals_1.describe)('calculateBoundingBox', () => {
    (0, globals_1.it)('calculates bounding box for single point', () => {
        const bbox = (0, geo_js_1.calculateBoundingBox)([{ latitude: 10, longitude: 20 }]);
        (0, globals_1.expect)(bbox).toEqual({ minLat: 10, maxLat: 10, minLon: 20, maxLon: 20 });
    });
    (0, globals_1.it)('calculates bounding box for multiple points', () => {
        const points = [
            { latitude: 10, longitude: 20 },
            { latitude: 30, longitude: 40 },
            { latitude: 20, longitude: 30 },
        ];
        const bbox = (0, geo_js_1.calculateBoundingBox)(points);
        (0, globals_1.expect)(bbox).toEqual({ minLat: 10, maxLat: 30, minLon: 20, maxLon: 40 });
    });
    (0, globals_1.it)('throws for empty array', () => {
        (0, globals_1.expect)(() => (0, geo_js_1.calculateBoundingBox)([])).toThrow();
    });
});
(0, globals_1.describe)('calculatePathDistance', () => {
    (0, globals_1.it)('returns 0 for empty path', () => {
        (0, globals_1.expect)((0, geo_js_1.calculatePathDistance)([])).toBe(0);
    });
    (0, globals_1.it)('returns 0 for single point', () => {
        (0, globals_1.expect)((0, geo_js_1.calculatePathDistance)([{ latitude: 0, longitude: 0 }])).toBe(0);
    });
    (0, globals_1.it)('calculates total path distance', () => {
        const points = [
            { latitude: 0, longitude: 0 },
            { latitude: 1, longitude: 0 },
            { latitude: 1, longitude: 1 },
        ];
        const distance = (0, geo_js_1.calculatePathDistance)(points);
        // Should be approximately 2 degrees * 111km
        (0, globals_1.expect)(distance).toBeGreaterThan(200000);
        (0, globals_1.expect)(distance).toBeLessThan(250000);
    });
});
(0, globals_1.describe)('calculateSpeed', () => {
    (0, globals_1.it)('calculates speed correctly', () => {
        const from = { latitude: 0, longitude: 0, timestamp: 0 };
        const to = { latitude: 0, longitude: 1, timestamp: 111320 }; // ~111km in ~111s = ~1km/s
        const speed = (0, geo_js_1.calculateSpeed)(from, to);
        (0, globals_1.expect)(speed).toBeCloseTo(1000, -1); // Within 10 m/s
    });
    (0, globals_1.it)('returns 0 for zero time delta', () => {
        const from = { latitude: 0, longitude: 0, timestamp: 0 };
        const to = { latitude: 0, longitude: 1, timestamp: 0 };
        (0, globals_1.expect)((0, geo_js_1.calculateSpeed)(from, to)).toBe(0);
    });
});
(0, globals_1.describe)('pointInPolygon', () => {
    const square = [
        [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
        ],
    ];
    (0, globals_1.it)('returns true for point inside polygon', () => {
        (0, globals_1.expect)((0, geo_js_1.pointInPolygon)({ latitude: 5, longitude: 5 }, square)).toBe(true);
    });
    (0, globals_1.it)('returns false for point outside polygon', () => {
        (0, globals_1.expect)((0, geo_js_1.pointInPolygon)({ latitude: 15, longitude: 15 }, square)).toBe(false);
    });
    (0, globals_1.it)('handles point on edge', () => {
        // Edge cases can vary; just ensure it doesn't throw
        const result = (0, geo_js_1.pointInPolygon)({ latitude: 5, longitude: 0 }, square);
        (0, globals_1.expect)(typeof result).toBe('boolean');
    });
    (0, globals_1.it)('handles polygon with hole', () => {
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
        ];
        // Inside outer but outside hole
        (0, globals_1.expect)((0, geo_js_1.pointInPolygon)({ latitude: 2, longitude: 2 }, polygonWithHole)).toBe(true);
        // Inside hole (should be outside)
        (0, globals_1.expect)((0, geo_js_1.pointInPolygon)({ latitude: 10, longitude: 10 }, polygonWithHole)).toBe(false);
    });
});
(0, globals_1.describe)('pointInGeometry', () => {
    (0, globals_1.it)('handles Point geometry', () => {
        const geometry = { type: 'Point', coordinates: [5, 5] };
        (0, globals_1.expect)((0, geo_js_1.pointInGeometry)({ latitude: 5, longitude: 5 }, geometry)).toBe(true);
        (0, globals_1.expect)((0, geo_js_1.pointInGeometry)({ latitude: 6, longitude: 5 }, geometry)).toBe(false);
    });
    (0, globals_1.it)('handles Polygon geometry', () => {
        const geometry = {
            type: 'Polygon',
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
        (0, globals_1.expect)((0, geo_js_1.pointInGeometry)({ latitude: 5, longitude: 5 }, geometry)).toBe(true);
        (0, globals_1.expect)((0, geo_js_1.pointInGeometry)({ latitude: 15, longitude: 15 }, geometry)).toBe(false);
    });
    (0, globals_1.it)('handles MultiPolygon geometry', () => {
        const geometry = {
            type: 'MultiPolygon',
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
        (0, globals_1.expect)((0, geo_js_1.pointInGeometry)({ latitude: 5, longitude: 5 }, geometry)).toBe(true);
        (0, globals_1.expect)((0, geo_js_1.pointInGeometry)({ latitude: 25, longitude: 25 }, geometry)).toBe(true);
        (0, globals_1.expect)((0, geo_js_1.pointInGeometry)({ latitude: 15, longitude: 15 }, geometry)).toBe(false);
    });
});
(0, globals_1.describe)('calculatePolygonArea', () => {
    (0, globals_1.it)('calculates area of a square', () => {
        const polygon = [
            [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
            ],
        ];
        const area = (0, geo_js_1.calculatePolygonArea)(polygon);
        // 1 degree square at equator is approximately 12,364 km²
        (0, globals_1.expect)(area).toBeGreaterThan(10000000000); // > 10,000 km²
        (0, globals_1.expect)(area).toBeLessThan(15000000000); // < 15,000 km²
    });
    (0, globals_1.it)('returns 0 for empty polygon', () => {
        (0, globals_1.expect)((0, geo_js_1.calculatePolygonArea)([])).toBe(0);
    });
    (0, globals_1.it)('returns 0 for polygon with too few points', () => {
        (0, globals_1.expect)((0, geo_js_1.calculatePolygonArea)([[]])).toBe(0);
        (0, globals_1.expect)((0, geo_js_1.calculatePolygonArea)([
            [
                [0, 0],
                [1, 1],
            ],
        ])).toBe(0);
    });
});
(0, globals_1.describe)('createCircle', () => {
    (0, globals_1.it)('creates a circular polygon', () => {
        const center = { latitude: 0, longitude: 0 };
        const circle = (0, geo_js_1.createCircle)(center, 1000, 8);
        (0, globals_1.expect)(circle.type).toBe('Polygon');
        (0, globals_1.expect)(circle.coordinates).toHaveLength(1);
        (0, globals_1.expect)(circle.coordinates[0]).toHaveLength(9); // 8 segments + closing point
    });
    (0, globals_1.it)('creates closed polygon', () => {
        const center = { latitude: 0, longitude: 0 };
        const circle = (0, geo_js_1.createCircle)(center, 1000, 8);
        const ring = circle.coordinates[0];
        (0, globals_1.expect)(ring[0]).toEqual(ring[ring.length - 1]);
    });
});
(0, globals_1.describe)('simplifyPath', () => {
    (0, globals_1.it)('returns same path for 2 or fewer points', () => {
        const single = [{ latitude: 0, longitude: 0 }];
        (0, globals_1.expect)((0, geo_js_1.simplifyPath)(single, 100)).toEqual(single);
        const two = [
            { latitude: 0, longitude: 0 },
            { latitude: 1, longitude: 1 },
        ];
        (0, globals_1.expect)((0, geo_js_1.simplifyPath)(two, 100)).toEqual(two);
    });
    (0, globals_1.it)('simplifies path by removing intermediate points', () => {
        // Collinear points
        const path = [
            { latitude: 0, longitude: 0 },
            { latitude: 0.5, longitude: 0 },
            { latitude: 1, longitude: 0 },
        ];
        const simplified = (0, geo_js_1.simplifyPath)(path, 1000);
        (0, globals_1.expect)(simplified.length).toBeLessThanOrEqual(path.length);
    });
    (0, globals_1.it)('preserves points beyond tolerance', () => {
        const path = [
            { latitude: 0, longitude: 0 },
            { latitude: 0, longitude: 1 },
            { latitude: 1, longitude: 1 },
        ];
        // With very small tolerance, all points should be preserved
        const simplified = (0, geo_js_1.simplifyPath)(path, 0.001);
        (0, globals_1.expect)(simplified.length).toBe(path.length);
    });
});
(0, globals_1.describe)('boundingBoxesIntersect', () => {
    (0, globals_1.it)('returns true for overlapping boxes', () => {
        const a = { minLat: 0, maxLat: 10, minLon: 0, maxLon: 10 };
        const b = { minLat: 5, maxLat: 15, minLon: 5, maxLon: 15 };
        (0, globals_1.expect)((0, geo_js_1.boundingBoxesIntersect)(a, b)).toBe(true);
    });
    (0, globals_1.it)('returns true for fully contained box', () => {
        const a = { minLat: 0, maxLat: 20, minLon: 0, maxLon: 20 };
        const b = { minLat: 5, maxLat: 15, minLon: 5, maxLon: 15 };
        (0, globals_1.expect)((0, geo_js_1.boundingBoxesIntersect)(a, b)).toBe(true);
    });
    (0, globals_1.it)('returns true for touching boxes', () => {
        const a = { minLat: 0, maxLat: 10, minLon: 0, maxLon: 10 };
        const b = { minLat: 10, maxLat: 20, minLon: 0, maxLon: 10 };
        (0, globals_1.expect)((0, geo_js_1.boundingBoxesIntersect)(a, b)).toBe(true);
    });
    (0, globals_1.it)('returns false for non-overlapping boxes', () => {
        const a = { minLat: 0, maxLat: 10, minLon: 0, maxLon: 10 };
        const b = { minLat: 20, maxLat: 30, minLon: 20, maxLon: 30 };
        (0, globals_1.expect)((0, geo_js_1.boundingBoxesIntersect)(a, b)).toBe(false);
    });
});
(0, globals_1.describe)('expandBoundingBox', () => {
    (0, globals_1.it)('expands bounding box by distance', () => {
        const bbox = { minLat: 0, maxLat: 10, minLon: 0, maxLon: 10 };
        const expanded = (0, geo_js_1.expandBoundingBox)(bbox, 111320); // ~1 degree
        (0, globals_1.expect)(expanded.minLat).toBeLessThan(bbox.minLat);
        (0, globals_1.expect)(expanded.maxLat).toBeGreaterThan(bbox.maxLat);
        (0, globals_1.expect)(expanded.minLon).toBeLessThan(bbox.minLon);
        (0, globals_1.expect)(expanded.maxLon).toBeGreaterThan(bbox.maxLon);
    });
    (0, globals_1.it)('respects coordinate limits', () => {
        const bbox = { minLat: -89, maxLat: 89, minLon: -179, maxLon: 179 };
        const expanded = (0, geo_js_1.expandBoundingBox)(bbox, 500000); // 500 km
        (0, globals_1.expect)(expanded.minLat).toBeGreaterThanOrEqual(-90);
        (0, globals_1.expect)(expanded.maxLat).toBeLessThanOrEqual(90);
        (0, globals_1.expect)(expanded.minLon).toBeGreaterThanOrEqual(-180);
        (0, globals_1.expect)(expanded.maxLon).toBeLessThanOrEqual(180);
    });
});
