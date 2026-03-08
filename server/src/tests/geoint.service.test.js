"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const GeoIntService_js_1 = require("../services/GeoIntService.js");
(0, globals_1.describe)('GeoIntService', () => {
    (0, globals_1.describe)('Zod Validation', () => {
        (0, globals_1.it)('should validate correct GeoPoints', () => {
            const valid = { lat: 45, lon: -90 };
            (0, globals_1.expect)(GeoIntService_js_1.GeoPointSchema.safeParse(valid).success).toBe(true);
        });
        (0, globals_1.it)('should reject invalid coordinates', () => {
            const invalidLat = { lat: 100, lon: 0 };
            const invalidLon = { lat: 0, lon: 200 };
            (0, globals_1.expect)(GeoIntService_js_1.GeoPointSchema.safeParse(invalidLat).success).toBe(false);
            (0, globals_1.expect)(GeoIntService_js_1.GeoPointSchema.safeParse(invalidLon).success).toBe(false);
        });
        (0, globals_1.it)('should validate track length', () => {
            const shortTrack = [{ lat: 0, lon: 0 }];
            (0, globals_1.expect)(GeoIntService_js_1.TrackSchema.safeParse(shortTrack).success).toBe(false);
        });
    });
    (0, globals_1.describe)('analyzeMovement', () => {
        (0, globals_1.it)('should throw error for invalid track', () => {
            (0, globals_1.expect)(() => GeoIntService_js_1.geoIntService.analyzeMovement([])).toThrow();
        });
        (0, globals_1.it)('should calculate comprehensive metrics', () => {
            const track = [
                { lat: 0, lon: 0, timestamp: '2023-01-01T10:00:00Z' },
                { lat: 0, lon: 0.001, timestamp: '2023-01-01T10:00:10Z' }, // ~111m, 10s -> 11m/s
                { lat: 0, lon: 0.002, timestamp: '2023-01-01T10:00:20Z' }
            ];
            const result = GeoIntService_js_1.geoIntService.analyzeMovement(track);
            (0, globals_1.expect)(result.totalDistanceMeters).toBeGreaterThan(200);
            (0, globals_1.expect)(result.maxSpeedMps).toBeCloseTo(11.1, 1);
            (0, globals_1.expect)(result.avgSpeedMps).toBeCloseTo(11.1, 1);
            (0, globals_1.expect)(result.segments).toHaveLength(2);
            (0, globals_1.expect)(result.segments[0].bearingDegrees).toBeCloseTo(90, 0);
        });
    });
    (0, globals_1.describe)('getElevationProfile', () => {
        (0, globals_1.it)('should return empty array for short path', () => {
            (0, globals_1.expect)(GeoIntService_js_1.geoIntService.getElevationProfile([{ lat: 0, lon: 0 }])).toEqual([]);
        });
        (0, globals_1.it)('should generate interpolated profile', () => {
            const path = [
                { lat: 0, lon: 0 },
                { lat: 0.01, lon: 0.01 } // ~1.5km
            ];
            const profile = GeoIntService_js_1.geoIntService.getElevationProfile(path);
            (0, globals_1.expect)(profile.length).toBeGreaterThan(10); // Should interpolate
            (0, globals_1.expect)(profile[0].distance).toBe(0);
            (0, globals_1.expect)(profile[profile.length - 1].distance).toBeGreaterThan(1000);
            (0, globals_1.expect)(profile[0].elevation).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('transformCoordinates', () => {
        (0, globals_1.it)('should transform WGS84 to Web Mercator', () => {
            const result = GeoIntService_js_1.geoIntService.transformCoordinates(0, 0, 'EPSG:4326', 'EPSG:3857');
            (0, globals_1.expect)(result.x).toBeCloseTo(0);
            (0, globals_1.expect)(result.y).toBeCloseTo(0);
        });
    });
});
