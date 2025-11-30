
import { geoIntService, GeoPointSchema, TrackSchema } from '../services/GeoIntService';

describe('GeoIntService', () => {
    describe('Zod Validation', () => {
        it('should validate correct GeoPoints', () => {
            const valid = { lat: 45, lon: -90 };
            expect(GeoPointSchema.safeParse(valid).success).toBe(true);
        });

        it('should reject invalid coordinates', () => {
            const invalidLat = { lat: 100, lon: 0 };
            const invalidLon = { lat: 0, lon: 200 };
            expect(GeoPointSchema.safeParse(invalidLat).success).toBe(false);
            expect(GeoPointSchema.safeParse(invalidLon).success).toBe(false);
        });

        it('should validate track length', () => {
            const shortTrack = [{ lat: 0, lon: 0 }];
            expect(TrackSchema.safeParse(shortTrack).success).toBe(false);
        });
    });

    describe('analyzeMovement', () => {
        it('should throw error for invalid track', () => {
            expect(() => geoIntService.analyzeMovement([])).toThrow();
        });

        it('should calculate comprehensive metrics', () => {
            const track = [
                { lat: 0, lon: 0, timestamp: '2023-01-01T10:00:00Z' },
                { lat: 0, lon: 0.001, timestamp: '2023-01-01T10:00:10Z' }, // ~111m, 10s -> 11m/s
                { lat: 0, lon: 0.002, timestamp: '2023-01-01T10:00:20Z' }
            ];
            const result = geoIntService.analyzeMovement(track);

            expect(result.totalDistanceMeters).toBeGreaterThan(200);
            expect(result.maxSpeedMps).toBeCloseTo(11.1, 1);
            expect(result.avgSpeedMps).toBeCloseTo(11.1, 1);
            expect(result.segments).toHaveLength(2);
            expect(result.segments[0].bearingDegrees).toBeCloseTo(90, 0);
        });
    });

    describe('getElevationProfile', () => {
        it('should return empty array for short path', () => {
            expect(geoIntService.getElevationProfile([{lat:0, lon:0}])).toEqual([]);
        });

        it('should generate interpolated profile', () => {
            const path = [
                { lat: 0, lon: 0 },
                { lat: 0.01, lon: 0.01 } // ~1.5km
            ];
            const profile = geoIntService.getElevationProfile(path);

            expect(profile.length).toBeGreaterThan(10); // Should interpolate
            expect(profile[0].distance).toBe(0);
            expect(profile[profile.length-1].distance).toBeGreaterThan(1000);
            expect(profile[0].elevation).toBeGreaterThan(0);
        });
    });

    describe('transformCoordinates', () => {
        it('should transform WGS84 to Web Mercator', () => {
            const result = geoIntService.transformCoordinates(0, 0, 'EPSG:4326', 'EPSG:3857');
            expect(result.x).toBeCloseTo(0);
            expect(result.y).toBeCloseTo(0);
        });
    });
});
