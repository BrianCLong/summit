"use strict";
/**
 * Property-based tests using fast-check
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fast_check_1 = __importDefault(require("fast-check"));
const time_js_1 = require("../utils/time.js");
const geo_js_1 = require("../utils/geo.js");
// Arbitraries for generating test data
const coordinateArb = fast_check_1.default.record({
    latitude: fast_check_1.default.double({ min: -90, max: 90, noNaN: true }),
    longitude: fast_check_1.default.double({ min: -180, max: 180, noNaN: true }),
});
const validIntervalArb = fast_check_1.default.tuple(fast_check_1.default.nat({ max: 1000000 }), fast_check_1.default.nat({ max: 1000000 })).map(([a, b]) => ({
    start: Math.min(a, b),
    end: Math.max(a, b),
}));
(0, globals_1.describe)('Property-based tests: Time utilities', () => {
    (0, globals_1.describe)('intervalsOverlap', () => {
        (0, globals_1.it)('is commutative', () => {
            fast_check_1.default.assert(fast_check_1.default.property(validIntervalArb, validIntervalArb, (a, b) => {
                return (0, time_js_1.intervalsOverlap)(a, b) === (0, time_js_1.intervalsOverlap)(b, a);
            }));
        });
        (0, globals_1.it)('interval always overlaps with itself', () => {
            fast_check_1.default.assert(fast_check_1.default.property(validIntervalArb, (interval) => {
                return (0, time_js_1.intervalsOverlap)(interval, interval);
            }));
        });
        (0, globals_1.it)('non-overlapping intervals have zero overlap duration', () => {
            fast_check_1.default.assert(fast_check_1.default.property(validIntervalArb, validIntervalArb, (a, b) => {
                if (!(0, time_js_1.intervalsOverlap)(a, b)) {
                    return (0, time_js_1.overlapDuration)(a, b) === 0;
                }
                return true;
            }));
        });
    });
    (0, globals_1.describe)('overlapDuration', () => {
        (0, globals_1.it)('is commutative', () => {
            fast_check_1.default.assert(fast_check_1.default.property(validIntervalArb, validIntervalArb, (a, b) => {
                return (0, time_js_1.overlapDuration)(a, b) === (0, time_js_1.overlapDuration)(b, a);
            }));
        });
        (0, globals_1.it)('is non-negative', () => {
            fast_check_1.default.assert(fast_check_1.default.property(validIntervalArb, validIntervalArb, (a, b) => {
                return (0, time_js_1.overlapDuration)(a, b) >= 0;
            }));
        });
        (0, globals_1.it)('overlap duration <= min interval length', () => {
            fast_check_1.default.assert(fast_check_1.default.property(validIntervalArb, validIntervalArb, (a, b) => {
                const overlap = (0, time_js_1.overlapDuration)(a, b);
                const minLength = Math.min(a.end - a.start, b.end - b.start);
                return overlap <= minLength;
            }));
        });
    });
    (0, globals_1.describe)('intervalIntersection', () => {
        (0, globals_1.it)('intersection is contained in both intervals', () => {
            fast_check_1.default.assert(fast_check_1.default.property(validIntervalArb, validIntervalArb, (a, b) => {
                const intersection = (0, time_js_1.intervalIntersection)(a, b);
                if (intersection === null) {
                    return !(0, time_js_1.intervalsOverlap)(a, b);
                }
                return (intersection.start >= a.start &&
                    intersection.end <= a.end &&
                    intersection.start >= b.start &&
                    intersection.end <= b.end);
            }));
        });
    });
    (0, globals_1.describe)('mergeIntervals', () => {
        (0, globals_1.it)('merged intervals are non-overlapping', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.array(validIntervalArb, { maxLength: 20 }), (intervals) => {
                const merged = (0, time_js_1.mergeIntervals)(intervals);
                for (let i = 1; i < merged.length; i++) {
                    // Each interval should start after previous ends
                    if (merged[i].start <= merged[i - 1].end) {
                        return false;
                    }
                }
                return true;
            }));
        });
        (0, globals_1.it)('merged result covers same total time', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.array(validIntervalArb, { maxLength: 10 }), (intervals) => {
                if (intervals.length === 0)
                    return true;
                const merged = (0, time_js_1.mergeIntervals)(intervals);
                // Check a sample of points
                const samplePoints = intervals.flatMap((i) => [i.start, i.end]);
                for (const point of samplePoints) {
                    const inOriginal = intervals.some((i) => point >= i.start && point <= i.end);
                    const inMerged = merged.some((i) => point >= i.start && point <= i.end);
                    if (inOriginal !== inMerged) {
                        return false;
                    }
                }
                return true;
            }));
        });
        (0, globals_1.it)('merged result length <= original length', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.array(validIntervalArb, { maxLength: 20 }), (intervals) => {
                const merged = (0, time_js_1.mergeIntervals)(intervals);
                return merged.length <= intervals.length;
            }));
        });
    });
});
(0, globals_1.describe)('Property-based tests: Geo utilities', () => {
    (0, globals_1.describe)('haversineDistance', () => {
        (0, globals_1.it)('distance is non-negative', () => {
            fast_check_1.default.assert(fast_check_1.default.property(coordinateArb, coordinateArb, (a, b) => {
                return (0, geo_js_1.haversineDistance)(a, b) >= 0;
            }));
        });
        (0, globals_1.it)('distance is symmetric', () => {
            fast_check_1.default.assert(fast_check_1.default.property(coordinateArb, coordinateArb, (a, b) => {
                const d1 = (0, geo_js_1.haversineDistance)(a, b);
                const d2 = (0, geo_js_1.haversineDistance)(b, a);
                return Math.abs(d1 - d2) < 0.001; // Allow for floating point errors
            }));
        });
        (0, globals_1.it)('distance to self is zero', () => {
            fast_check_1.default.assert(fast_check_1.default.property(coordinateArb, (coord) => {
                return (0, geo_js_1.haversineDistance)(coord, coord) === 0;
            }));
        });
        (0, globals_1.it)('satisfies triangle inequality', () => {
            fast_check_1.default.assert(fast_check_1.default.property(coordinateArb, coordinateArb, coordinateArb, (a, b, c) => {
                const ab = (0, geo_js_1.haversineDistance)(a, b);
                const bc = (0, geo_js_1.haversineDistance)(b, c);
                const ac = (0, geo_js_1.haversineDistance)(a, c);
                // Triangle inequality: d(a,c) <= d(a,b) + d(b,c)
                return ac <= ab + bc + 1; // +1 for floating point tolerance
            }));
        });
        (0, globals_1.it)('distance is bounded by half Earth circumference', () => {
            fast_check_1.default.assert(fast_check_1.default.property(coordinateArb, coordinateArb, (a, b) => {
                const distance = (0, geo_js_1.haversineDistance)(a, b);
                const halfCircumference = Math.PI * 6371000; // ~20,000 km
                return distance <= halfCircumference + 1000;
            }));
        });
    });
    (0, globals_1.describe)('calculateCentroid', () => {
        (0, globals_1.it)('centroid of single point is the point itself', () => {
            fast_check_1.default.assert(fast_check_1.default.property(coordinateArb, (coord) => {
                const centroid = (0, geo_js_1.calculateCentroid)([coord]);
                return (Math.abs(centroid.latitude - coord.latitude) < 0.0001 &&
                    Math.abs(centroid.longitude - coord.longitude) < 0.0001);
            }));
        });
        (0, globals_1.it)('centroid is within bounding box of points', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.array(coordinateArb, { minLength: 1, maxLength: 20 }), (coords) => {
                const centroid = (0, geo_js_1.calculateCentroid)(coords);
                const minLat = Math.min(...coords.map((c) => c.latitude));
                const maxLat = Math.max(...coords.map((c) => c.latitude));
                const minLon = Math.min(...coords.map((c) => c.longitude));
                const maxLon = Math.max(...coords.map((c) => c.longitude));
                // Allow some tolerance for spherical geometry effects
                const tolerance = 5;
                return (centroid.latitude >= minLat - tolerance &&
                    centroid.latitude <= maxLat + tolerance &&
                    centroid.longitude >= minLon - tolerance &&
                    centroid.longitude <= maxLon + tolerance);
            }));
        });
    });
    (0, globals_1.describe)('pointInPolygon', () => {
        (0, globals_1.it)('point at polygon vertex may be inside or on edge', () => {
            // This is a known edge case - the result depends on implementation
            // Just ensure it doesn't throw
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.double({ min: 0, max: 10, noNaN: true }), fast_check_1.default.double({ min: 0, max: 10, noNaN: true }), (x, y) => {
                const polygon = [
                    [
                        [0, 0],
                        [10, 0],
                        [10, 10],
                        [0, 10],
                        [0, 0],
                    ],
                ];
                // Should not throw
                const result = (0, geo_js_1.pointInPolygon)({ latitude: y, longitude: x }, polygon);
                return typeof result === 'boolean';
            }));
        });
        (0, globals_1.it)('point clearly inside is inside', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.double({ min: 1, max: 9, noNaN: true }), fast_check_1.default.double({ min: 1, max: 9, noNaN: true }), (x, y) => {
                const polygon = [
                    [
                        [0, 0],
                        [10, 0],
                        [10, 10],
                        [0, 10],
                        [0, 0],
                    ],
                ];
                return (0, geo_js_1.pointInPolygon)({ latitude: y, longitude: x }, polygon);
            }));
        });
        (0, globals_1.it)('point clearly outside is outside', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.double({ min: 20, max: 100, noNaN: true }), fast_check_1.default.double({ min: 20, max: 100, noNaN: true }), (x, y) => {
                const polygon = [
                    [
                        [0, 0],
                        [10, 0],
                        [10, 10],
                        [0, 10],
                        [0, 0],
                    ],
                ];
                return !(0, geo_js_1.pointInPolygon)({ latitude: y, longitude: x }, polygon);
            }));
        });
    });
});
(0, globals_1.describe)('Property-based tests: Edge cases', () => {
    (0, globals_1.describe)('Zero-length intervals', () => {
        (0, globals_1.it)('zero-length interval overlaps with itself', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.nat({ max: 1000000 }), (time) => {
                const interval = { start: time, end: time };
                return (0, time_js_1.intervalsOverlap)(interval, interval);
            }));
        });
        (0, globals_1.it)('zero-length interval overlap duration is zero', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.nat({ max: 1000000 }), (time) => {
                const interval = { start: time, end: time };
                return (0, time_js_1.overlapDuration)(interval, interval) === 0;
            }));
        });
    });
    (0, globals_1.describe)('Boundary coordinates', () => {
        (0, globals_1.it)('handles extreme latitudes', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.constantFrom(-90, 90), fast_check_1.default.double({ min: -180, max: 180, noNaN: true }), (lat, lon) => {
                const coord = { latitude: lat, longitude: lon };
                const distance = (0, geo_js_1.haversineDistance)(coord, { latitude: 0, longitude: 0 });
                return distance >= 0 && isFinite(distance);
            }));
        });
        (0, globals_1.it)('handles extreme longitudes', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.double({ min: -90, max: 90, noNaN: true }), fast_check_1.default.constantFrom(-180, 180), (lat, lon) => {
                const coord = { latitude: lat, longitude: lon };
                const distance = (0, geo_js_1.haversineDistance)(coord, { latitude: 0, longitude: 0 });
                return distance >= 0 && isFinite(distance);
            }));
        });
    });
});
