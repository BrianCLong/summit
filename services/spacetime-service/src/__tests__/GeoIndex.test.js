"use strict";
/**
 * Unit tests for GeoIndex
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const GeoIndex_js_1 = require("../indexes/GeoIndex.js");
(0, globals_1.describe)('GeoIndex', () => {
    let index;
    (0, globals_1.beforeEach)(() => {
        index = (0, GeoIndex_js_1.createGeoIndex)(7);
    });
    (0, globals_1.describe)('insert', () => {
        (0, globals_1.it)('inserts entries correctly', () => {
            index.insert({
                id: '1',
                entityId: 'entity-1',
                coordinate: { latitude: 40.7128, longitude: -74.006 },
                data: { name: 'NYC' },
            });
            (0, globals_1.expect)(index.count).toBe(1);
            (0, globals_1.expect)(index.has('1')).toBe(true);
        });
        (0, globals_1.it)('updates existing entry on duplicate id', () => {
            index.insert({
                id: '1',
                entityId: 'entity-1',
                coordinate: { latitude: 40.7128, longitude: -74.006 },
                data: { name: 'NYC' },
            });
            index.insert({
                id: '1',
                entityId: 'entity-1',
                coordinate: { latitude: 34.0522, longitude: -118.2437 },
                data: { name: 'LA' },
            });
            (0, globals_1.expect)(index.count).toBe(1);
            (0, globals_1.expect)(index.get('1')?.data.name).toBe('LA');
        });
    });
    (0, globals_1.describe)('delete', () => {
        (0, globals_1.it)('deletes existing entry', () => {
            index.insert({
                id: '1',
                entityId: 'entity-1',
                coordinate: { latitude: 40.7128, longitude: -74.006 },
                data: { name: 'NYC' },
            });
            (0, globals_1.expect)(index.delete('1')).toBe(true);
            (0, globals_1.expect)(index.count).toBe(0);
        });
        (0, globals_1.it)('returns false for non-existent entry', () => {
            (0, globals_1.expect)(index.delete('non-existent')).toBe(false);
        });
    });
    (0, globals_1.describe)('findInBBox', () => {
        (0, globals_1.beforeEach)(() => {
            // NYC area points
            index.insert({
                id: '1',
                entityId: 'e1',
                coordinate: { latitude: 40.7128, longitude: -74.006 },
                data: { name: 'Manhattan' },
            });
            index.insert({
                id: '2',
                entityId: 'e1',
                coordinate: { latitude: 40.6892, longitude: -74.0445 },
                data: { name: 'Brooklyn' },
            });
            // LA point
            index.insert({
                id: '3',
                entityId: 'e2',
                coordinate: { latitude: 34.0522, longitude: -118.2437 },
                data: { name: 'LA' },
            });
        });
        (0, globals_1.it)('finds entries in bounding box', () => {
            const results = index.findInBBox({
                minLat: 40.5,
                maxLat: 41,
                minLon: -75,
                maxLon: -73,
            });
            (0, globals_1.expect)(results).toHaveLength(2);
        });
        (0, globals_1.it)('returns empty for bbox with no entries', () => {
            const results = index.findInBBox({
                minLat: 0,
                maxLat: 1,
                minLon: 0,
                maxLon: 1,
            });
            (0, globals_1.expect)(results).toHaveLength(0);
        });
    });
    (0, globals_1.describe)('findInRadius', () => {
        (0, globals_1.beforeEach)(() => {
            // Central point
            index.insert({
                id: 'center',
                entityId: 'e1',
                coordinate: { latitude: 40.7128, longitude: -74.006 },
                data: { name: 'Center' },
            });
            // Nearby point (~5km away)
            index.insert({
                id: 'near',
                entityId: 'e1',
                coordinate: { latitude: 40.7484, longitude: -73.9857 },
                data: { name: 'Near' },
            });
            // Far point (~4000km away)
            index.insert({
                id: 'far',
                entityId: 'e2',
                coordinate: { latitude: 34.0522, longitude: -118.2437 },
                data: { name: 'Far' },
            });
        });
        (0, globals_1.it)('finds entries within radius', () => {
            const results = index.findInRadius({ latitude: 40.7128, longitude: -74.006 }, 10000);
            (0, globals_1.expect)(results).toHaveLength(2);
            (0, globals_1.expect)(results.every((r) => r.distance <= 10000)).toBe(true);
        });
        (0, globals_1.it)('returns results sorted by distance', () => {
            const results = index.findInRadius({ latitude: 40.7128, longitude: -74.006 }, 10000);
            (0, globals_1.expect)(results[0].id).toBe('center');
            (0, globals_1.expect)(results[0].distance).toBe(0);
        });
        (0, globals_1.it)('respects limit parameter', () => {
            const results = index.findInRadius({ latitude: 40.7128, longitude: -74.006 }, 10000, 1);
            (0, globals_1.expect)(results).toHaveLength(1);
        });
    });
    (0, globals_1.describe)('findKNearest', () => {
        (0, globals_1.beforeEach)(() => {
            index.insert({
                id: '1',
                entityId: 'e1',
                coordinate: { latitude: 40.7128, longitude: -74.006 },
                data: { name: 'Point 1' },
            });
            index.insert({
                id: '2',
                entityId: 'e1',
                coordinate: { latitude: 40.7484, longitude: -73.9857 },
                data: { name: 'Point 2' },
            });
            index.insert({
                id: '3',
                entityId: 'e2',
                coordinate: { latitude: 40.758, longitude: -73.9855 },
                data: { name: 'Point 3' },
            });
        });
        (0, globals_1.it)('finds k nearest neighbors', () => {
            const results = index.findKNearest({ latitude: 40.7128, longitude: -74.006 }, 2);
            (0, globals_1.expect)(results).toHaveLength(2);
            (0, globals_1.expect)(results[0].id).toBe('1'); // Closest
        });
        (0, globals_1.it)('respects maxDistance parameter', () => {
            const results = index.findKNearest({ latitude: 40.7128, longitude: -74.006 }, 10, 1000);
            (0, globals_1.expect)(results.every((r) => r.distance <= 1000)).toBe(true);
        });
    });
    (0, globals_1.describe)('findInGeometry', () => {
        (0, globals_1.beforeEach)(() => {
            index.insert({
                id: '1',
                entityId: 'e1',
                coordinate: { latitude: 5, longitude: 5 },
                data: { name: 'Inside' },
            });
            index.insert({
                id: '2',
                entityId: 'e1',
                coordinate: { latitude: 15, longitude: 15 },
                data: { name: 'Outside' },
            });
        });
        (0, globals_1.it)('finds entries within polygon', () => {
            const polygon = {
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
            const results = index.findInGeometry(polygon);
            (0, globals_1.expect)(results).toHaveLength(1);
            (0, globals_1.expect)(results[0].id).toBe('1');
        });
    });
    (0, globals_1.describe)('findByEntity', () => {
        (0, globals_1.beforeEach)(() => {
            index.insert({
                id: '1',
                entityId: 'e1',
                coordinate: { latitude: 40.7128, longitude: -74.006 },
                data: { name: 'a' },
            });
            index.insert({
                id: '2',
                entityId: 'e1',
                coordinate: { latitude: 40.7484, longitude: -73.9857 },
                data: { name: 'b' },
            });
            index.insert({
                id: '3',
                entityId: 'e2',
                coordinate: { latitude: 34.0522, longitude: -118.2437 },
                data: { name: 'c' },
            });
        });
        (0, globals_1.it)('finds all entries for entity', () => {
            const results = index.findByEntity('e1');
            (0, globals_1.expect)(results).toHaveLength(2);
            (0, globals_1.expect)(results.every((r) => r.entityId === 'e1')).toBe(true);
        });
        (0, globals_1.it)('returns empty for non-existent entity', () => {
            const results = index.findByEntity('non-existent');
            (0, globals_1.expect)(results).toHaveLength(0);
        });
    });
    (0, globals_1.describe)('bulkInsert', () => {
        (0, globals_1.it)('inserts multiple entries efficiently', () => {
            const entries = [];
            for (let i = 0; i < 100; i++) {
                entries.push({
                    id: `${i}`,
                    entityId: `e${i % 10}`,
                    coordinate: { latitude: i * 0.1, longitude: i * 0.1 },
                    data: { name: `Point ${i}` },
                });
            }
            index.bulkInsert(entries);
            (0, globals_1.expect)(index.count).toBe(100);
        });
    });
    (0, globals_1.describe)('geohash operations', () => {
        (0, globals_1.it)('encodes coordinates to geohash', () => {
            const geohash = index.getGeohash({ latitude: 40.7128, longitude: -74.006 });
            (0, globals_1.expect)(geohash).toBeTruthy();
            (0, globals_1.expect)(geohash.length).toBe(7);
        });
        (0, globals_1.it)('decodes geohash to bounding box', () => {
            const geohash = index.getGeohash({ latitude: 40.7128, longitude: -74.006 });
            const bbox = index.decodeGeohash(geohash);
            (0, globals_1.expect)(bbox.minLat).toBeLessThanOrEqual(40.7128);
            (0, globals_1.expect)(bbox.maxLat).toBeGreaterThanOrEqual(40.7128);
            (0, globals_1.expect)(bbox.minLon).toBeLessThanOrEqual(-74.006);
            (0, globals_1.expect)(bbox.maxLon).toBeGreaterThanOrEqual(-74.006);
        });
        (0, globals_1.it)('finds entries by geohash prefix', () => {
            index.insert({
                id: '1',
                entityId: 'e1',
                coordinate: { latitude: 40.7128, longitude: -74.006 },
                data: { name: 'NYC' },
            });
            const geohash = index.getGeohash({ latitude: 40.7128, longitude: -74.006 });
            const prefix = geohash.substring(0, 4);
            const results = index.findByGeohashPrefix(prefix);
            (0, globals_1.expect)(results).toHaveLength(1);
        });
    });
    (0, globals_1.describe)('getBoundingBox', () => {
        (0, globals_1.it)('returns null for empty index', () => {
            (0, globals_1.expect)(index.getBoundingBox()).toBeNull();
        });
        (0, globals_1.it)('returns correct bounds', () => {
            index.insert({
                id: '1',
                entityId: 'e1',
                coordinate: { latitude: 40.7128, longitude: -74.006 },
                data: { name: 'NYC' },
            });
            index.insert({
                id: '2',
                entityId: 'e2',
                coordinate: { latitude: 34.0522, longitude: -118.2437 },
                data: { name: 'LA' },
            });
            const bbox = index.getBoundingBox();
            (0, globals_1.expect)(bbox).not.toBeNull();
            (0, globals_1.expect)(bbox.minLat).toBeCloseTo(34.0522, 4);
            (0, globals_1.expect)(bbox.maxLat).toBeCloseTo(40.7128, 4);
            (0, globals_1.expect)(bbox.minLon).toBeCloseTo(-118.2437, 4);
            (0, globals_1.expect)(bbox.maxLon).toBeCloseTo(-74.006, 4);
        });
    });
    (0, globals_1.describe)('clear', () => {
        (0, globals_1.it)('removes all entries', () => {
            index.insert({
                id: '1',
                entityId: 'e1',
                coordinate: { latitude: 40.7128, longitude: -74.006 },
                data: { name: 'NYC' },
            });
            index.clear();
            (0, globals_1.expect)(index.count).toBe(0);
            (0, globals_1.expect)(index.getEntityIds()).toHaveLength(0);
        });
    });
});
