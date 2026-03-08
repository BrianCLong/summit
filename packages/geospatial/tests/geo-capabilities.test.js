"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../src/index.js");
const washington = { latitude: 38.8977, longitude: -77.0365 };
describe('Coordinate handling', () => {
    it('converts between lat/lon and UTM/MGRS', () => {
        const utm = (0, index_js_1.toUTM)(washington);
        expect(utm.zone).toBeGreaterThan(17);
        const restored = (0, index_js_1.utmToLatLon)(utm);
        expect(restored.latitude).toBeCloseTo(washington.latitude, 4);
        expect(restored.longitude).toBeCloseTo(washington.longitude, 4);
        const mgrs = (0, index_js_1.toMGRS)(washington, 5);
        const mgrsString = `${mgrs.zone}${mgrs.band}${mgrs.grid}${mgrs.easting}${mgrs.northing}`;
        const back = (0, index_js_1.mgrsToPoint)(mgrsString);
        expect(back.latitude).toBeCloseTo(washington.latitude, 2);
    });
});
describe('PostGIS query builders', () => {
    const bbox = { minLon: -77.1, minLat: 38.8, maxLon: -77.0, maxLat: 39, crs: 'EPSG:4326' };
    it('builds spatial query with filters', () => {
        const query = (0, index_js_1.buildSpatialQuery)('intel_events', 'geom', {
            bbox,
            maxDistance: 5000,
            filters: { origin: washington, classification: 'secret' },
            limit: 10,
            offset: 5,
        });
        expect(query.text).toContain('intel_events');
        expect(query.values.length).toBe(4);
    });
    it('builds route match query', () => {
        const query = (0, index_js_1.buildRouteMatchQuery)('routes', 'geom', [washington], 25);
        expect(query.text).toContain('ST_DWithin');
        expect(query.values[1]).toBe(25);
    });
});
describe('Geocoding and reverse geocoding', () => {
    const geocoder = new index_js_1.GeocodingEngine(new index_js_1.InMemoryGeocoder([
        {
            id: '1',
            name: 'White House',
            center: washington,
            aliases: ['Pennsylvania Avenue'],
        },
        {
            id: '2',
            name: 'Arlington',
            center: { latitude: 38.8816, longitude: -77.091 },
        },
    ]));
    it('returns ranked geocode results', async () => {
        const result = await geocoder.geocode('White');
        expect(result.matches[0].label).toBe('White House');
    });
    it('returns nearest reverse geocode results', async () => {
        const result = await geocoder.reverseGeocode(washington);
        expect(result.nearest[0].label).toBe('White House');
    });
});
describe('Routing and geofencing', () => {
    const graph = new index_js_1.RouteGraph();
    graph
        .addNode('A', { latitude: 38.89, longitude: -77.05 })
        .addNode('B', washington)
        .addNode('C', { latitude: 38.91, longitude: -77.02 });
    graph.addEdge('A', 'B');
    graph.addEdge('B', 'C');
    const geofence = {
        id: 'no-go',
        name: 'Restricted',
        geometry: {
            type: 'Polygon',
            coordinates: [[[-77.04, 38.9], [-77.02, 38.9], [-77.02, 38.91], [-77.04, 38.91], [-77.04, 38.9]]],
        },
        type: 'proximity',
        enabled: true,
    };
    it('optimizes route while avoiding geofences', () => {
        const route = (0, index_js_1.optimizeRoute)(graph, ['A', 'B', 'C'], { avoidGeofences: [geofence] });
        expect(route.segments.length).toBeGreaterThanOrEqual(2);
        expect(route.totalDistance).toBeGreaterThan(0);
    });
    it('emits entry and exit events', () => {
        const track = {
            id: 't1',
            entityId: 'asset',
            startTime: new Date(),
            endTime: new Date(),
            points: [
                { latitude: 38.905, longitude: -77.05, timestamp: new Date() },
                { latitude: 38.905, longitude: -77.03, timestamp: new Date(Date.now() + 60_000) },
                { latitude: 38.905, longitude: -77.05, timestamp: new Date(Date.now() + 120_000) },
            ],
        };
        const events = (0, index_js_1.evaluateGeofences)([track], [geofence], { dwellThresholdMs: 30_000 });
        const types = events.map((e) => e.eventType);
        expect(types).toContain('entry');
        expect(types).toContain('exit');
    });
});
describe('Heatmaps, clustering, and movement', () => {
    const samplePoints = [
        washington,
        { latitude: 38.9, longitude: -77.0 },
        { latitude: 38.91, longitude: -77.0 },
        { latitude: 39.0, longitude: -77.1 },
    ];
    it('builds heatmap tiles with intensities', () => {
        const heatmap = (0, index_js_1.generateHeatmap)(samplePoints, { cellSizeKm: 2 });
        expect(heatmap.features.length).toBeGreaterThan(0);
        expect(heatmap.features[0].properties?.count).toBeDefined();
    });
    it('clusters nearby points', () => {
        const clusters = (0, index_js_1.clusterPoints)(samplePoints, { epsilonMeters: 20000, minPoints: 2 });
        expect(clusters.length).toBeGreaterThan(0);
        expect(clusters[0].points.length).toBeGreaterThanOrEqual(2);
    });
    it('derives movement statistics', () => {
        const track = {
            id: 'm1',
            entityId: 'asset',
            startTime: new Date(),
            endTime: new Date(),
            points: [
                { latitude: 38.9, longitude: -77.0, timestamp: new Date() },
                { latitude: 38.901, longitude: -77.001, timestamp: new Date(Date.now() + 60_000) },
                { latitude: 38.902, longitude: -77.002, timestamp: new Date(Date.now() + 180_000) },
            ],
        };
        const stats = (0, index_js_1.analyzeTrack)(track, 0.1, 60_000);
        expect(stats.totalDistance).toBeGreaterThan(0);
        expect(stats.stops.length).toBeGreaterThanOrEqual(1);
    });
});
describe('Terrain and imagery', () => {
    it('generates 3D terrain mesh', () => {
        const grid = [
            [10, 20],
            [30, 40],
        ];
        const mesh = (0, index_js_1.generateTerrainMesh)(grid, { minLon: -1, minLat: -1, maxLon: 1, maxLat: 1, crs: 'EPSG:4326' });
        expect(mesh.features.length).toBe(1);
        const coordinates = mesh.features[0].geometry.coordinates[0][0];
        expect(coordinates[2]).toBe(10);
    });
    it('indexes imagery and returns best coverage', () => {
        const catalog = new index_js_1.SatelliteImageryCatalog();
        catalog.register({
            id: 'img1',
            capturedAt: new Date('2024-01-01'),
            provider: 'sentinel',
            uri: 's3://sentinel/img1',
            bbox: { minLon: -78, minLat: 38, maxLon: -76, maxLat: 40, crs: 'EPSG:4326' },
            cloudCover: 5,
            resolutionMeters: 10,
        });
        const best = catalog.bestCoverage(washington);
        expect(best?.id).toBe('img1');
    });
});
