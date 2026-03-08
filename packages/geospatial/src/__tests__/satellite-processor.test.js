"use strict";
/**
 * Satellite Imagery Processor Tests
 * Tests for GDAL pipeline, raster/vector fusion, change detection, and caching
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const raster_vector_fusion_js_1 = require("../processing/raster-vector-fusion.js");
const change_detection_js_1 = require("../processing/change-detection.js");
const airgapped_cache_js_1 = require("../processing/airgapped-cache.js");
// Test fixtures
const createMockScene = (id, overrides = {}) => ({
    id,
    platform: 'sentinel-2',
    sensor: 'MSI',
    acquisitionDate: new Date('2024-01-15'),
    processingLevel: 'L2A',
    bbox: { minLon: -122.5, minLat: 37.5, maxLon: -122.0, maxLat: 38.0 },
    geometry: {
        type: 'Polygon',
        coordinates: [[
                [-122.5, 37.5],
                [-122.0, 37.5],
                [-122.0, 38.0],
                [-122.5, 38.0],
                [-122.5, 37.5],
            ]],
    },
    gsd: 10,
    bands: ['red', 'green', 'blue', 'nir'],
    cloudCoverPercent: 5,
    classification: 'unclassified',
    source: 'test',
    ingestTimestamp: new Date(),
    ...overrides,
});
const createMockTile = (sceneId, band, width = 100, height = 100, fillValue = 100) => {
    const data = new Float32Array(width * height);
    for (let i = 0; i < data.length; i++) {
        data[i] = fillValue + Math.random() * 50;
    }
    return {
        sceneId,
        tileId: `${sceneId}_${band}_0_0_10`,
        x: 0,
        y: 0,
        z: 10,
        bbox: { minLon: -122.5, minLat: 37.5, maxLon: -122.0, maxLat: 38.0 },
        band,
        width,
        height,
        data,
        noDataValue: -9999,
    };
};
const createMockFeatureCollection = () => ({
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [[
                        [-122.4, 37.6],
                        [-122.3, 37.6],
                        [-122.3, 37.7],
                        [-122.4, 37.7],
                        [-122.4, 37.6],
                    ]],
            },
            properties: {
                entityId: 'facility-001',
                entityType: 'industrial',
                classification: 'unclassified',
                confidence: 0.9,
            },
        },
        {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [-122.35, 37.65],
            },
            properties: {
                entityId: 'poi-001',
                entityType: 'observation',
                classification: 'unclassified',
                confidence: 0.8,
            },
        },
    ],
    metadata: {
        source: 'test',
        collectionDate: new Date().toISOString(),
    },
});
(0, globals_1.describe)('RasterVectorFusion', () => {
    let fusion;
    let scene;
    let rasterData;
    let vectorFeatures;
    (0, globals_1.beforeEach)(() => {
        const config = {
            vectorLayers: ['facilities'],
            rasterBands: ['red', 'green', 'blue', 'nir'],
            fusionMethod: 'overlay',
            outputType: 'enriched_vectors',
        };
        fusion = (0, raster_vector_fusion_js_1.createFusionProcessor)(config);
        scene = createMockScene('scene-001');
        rasterData = new Map([
            ['red', createMockTile('scene-001', 'red')],
            ['green', createMockTile('scene-001', 'green')],
            ['blue', createMockTile('scene-001', 'blue')],
            ['nir', createMockTile('scene-001', 'nir', 100, 100, 150)],
        ]);
        vectorFeatures = createMockFeatureCollection();
    });
    (0, globals_1.it)('should create fusion processor with config', () => {
        (0, globals_1.expect)(fusion).toBeDefined();
    });
    (0, globals_1.it)('should execute overlay fusion', async () => {
        const result = await fusion.fuse(scene, vectorFeatures, rasterData);
        (0, globals_1.expect)(result).toBeDefined();
        (0, globals_1.expect)(result.id).toBeTruthy();
        (0, globals_1.expect)(result.sceneId).toBe(scene.id);
        (0, globals_1.expect)(result.features.length).toBeGreaterThan(0);
        (0, globals_1.expect)(result.processingTimeMs).toBeGreaterThan(0);
    });
    (0, globals_1.it)('should enrich features with spectral signatures', async () => {
        const result = await fusion.fuse(scene, vectorFeatures, rasterData);
        for (const feature of result.features) {
            (0, globals_1.expect)(feature.properties.sceneId).toBe(scene.id);
            (0, globals_1.expect)(feature.properties.extractionMethod).toBe('overlay');
        }
    });
    (0, globals_1.it)('should emit progress events', async () => {
        const progressEvents = [];
        fusion.on('progress', (progress, message) => {
            progressEvents.push([progress, message]);
        });
        await fusion.fuse(scene, vectorFeatures, rasterData);
        (0, globals_1.expect)(progressEvents.length).toBeGreaterThan(0);
        (0, globals_1.expect)(progressEvents[0][0]).toBe(0); // First event should be 0%
        (0, globals_1.expect)(progressEvents[progressEvents.length - 1][0]).toBe(100); // Last should be 100%
    });
    (0, globals_1.it)('should handle zonal stats fusion for polygons', async () => {
        const zonalFusion = (0, raster_vector_fusion_js_1.createFusionProcessor)({
            vectorLayers: ['facilities'],
            rasterBands: ['red', 'nir'],
            fusionMethod: 'zonal_stats',
            outputType: 'enriched_vectors',
        });
        const result = await zonalFusion.fuse(scene, vectorFeatures, rasterData);
        // Should have features (only polygon features for zonal stats)
        const polygonFeatures = result.features.filter((f) => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon');
        (0, globals_1.expect)(polygonFeatures.length).toBeGreaterThan(0);
    });
});
(0, globals_1.describe)('ChangeDetectionEngine', () => {
    let engine;
    let beforeScene;
    let afterScene;
    let beforeRaster;
    let afterRaster;
    (0, globals_1.beforeEach)(() => {
        engine = (0, change_detection_js_1.createChangeDetectionEngine)({
            methods: ['spectral_differencing'],
            minConfidence: 0.5,
            minChangeMagnitude: 0.1,
            minAreaSqMeters: 50,
            maxCloudCover: 20,
            ensembleThreshold: 1,
        });
        beforeScene = createMockScene('before-001', {
            acquisitionDate: new Date('2024-01-01'),
        });
        afterScene = createMockScene('after-001', {
            acquisitionDate: new Date('2024-02-01'),
        });
        // Create before raster with uniform values
        beforeRaster = new Map([
            ['red', createMockTile('before-001', 'red', 50, 50, 100)],
            ['nir', createMockTile('before-001', 'nir', 50, 50, 150)],
        ]);
        // Create after raster with changes in specific area
        const afterRedTile = createMockTile('after-001', 'red', 50, 50, 100);
        const afterNirTile = createMockTile('after-001', 'nir', 50, 50, 150);
        // Introduce significant change in a region
        for (let y = 20; y < 30; y++) {
            for (let x = 20; x < 30; x++) {
                const idx = y * 50 + x;
                afterRedTile.data[idx] = 200; // Significant brightness increase
                afterNirTile.data[idx] = 250;
            }
        }
        afterRaster = new Map([
            ['red', afterRedTile],
            ['nir', afterNirTile],
        ]);
    });
    (0, globals_1.it)('should create change detection engine', () => {
        (0, globals_1.expect)(engine).toBeDefined();
    });
    (0, globals_1.it)('should detect changes between scenes', async () => {
        const result = await engine.detectChanges(beforeScene, afterScene, beforeRaster, afterRaster);
        (0, globals_1.expect)(result).toBeDefined();
        (0, globals_1.expect)(result.id).toBeTruthy();
        (0, globals_1.expect)(result.beforeSceneId).toBe(beforeScene.id);
        (0, globals_1.expect)(result.afterSceneId).toBe(afterScene.id);
        (0, globals_1.expect)(result.processingTimeMs).toBeGreaterThan(0);
    });
    (0, globals_1.it)('should reject scenes with high cloud cover', async () => {
        const cloudyScene = createMockScene('cloudy-001', {
            cloudCoverPercent: 50,
            acquisitionDate: new Date('2024-02-15'),
        });
        await (0, globals_1.expect)(engine.detectChanges(beforeScene, cloudyScene, beforeRaster, afterRaster)).rejects.toThrow(/cloud cover/i);
    });
    (0, globals_1.it)('should reject scenes in wrong temporal order', async () => {
        const olderScene = createMockScene('older-001', {
            acquisitionDate: new Date('2023-01-01'),
        });
        await (0, globals_1.expect)(engine.detectChanges(beforeScene, olderScene, beforeRaster, afterRaster)).rejects.toThrow(/after/i);
    });
    (0, globals_1.it)('should create agentic monitoring tasks', () => {
        const aoi = {
            type: 'Polygon',
            coordinates: [[
                    [-122.5, 37.5],
                    [-122.0, 37.5],
                    [-122.0, 38.0],
                    [-122.5, 38.0],
                    [-122.5, 37.5],
                ]],
        };
        const task = engine.createTask(aoi, 'monitor', 'priority', {
            minConfidence: 0.7,
            changeTypes: ['construction', 'demolition'],
            revisitIntervalHours: 12,
        });
        (0, globals_1.expect)(task).toBeDefined();
        (0, globals_1.expect)(task.taskId).toBeTruthy();
        (0, globals_1.expect)(task.taskType).toBe('monitor');
        (0, globals_1.expect)(task.priority).toBe('priority');
        (0, globals_1.expect)(task.status).toBe('queued');
    });
    (0, globals_1.it)('should track active tasks', () => {
        const aoi = {
            type: 'Polygon',
            coordinates: [[
                    [-122.5, 37.5],
                    [-122.0, 37.5],
                    [-122.0, 38.0],
                    [-122.5, 38.0],
                    [-122.5, 37.5],
                ]],
        };
        const task = engine.createTask(aoi, 'detect', 'immediate');
        const activeTasks = engine.getActiveTasks();
        (0, globals_1.expect)(activeTasks).toContainEqual(globals_1.expect.objectContaining({ taskId: task.taskId }));
        engine.cancelTask(task.taskId);
        const tasksAfterCancel = engine.getActiveTasks();
        (0, globals_1.expect)(tasksAfterCancel).not.toContainEqual(globals_1.expect.objectContaining({ taskId: task.taskId }));
    });
    (0, globals_1.afterEach)(() => {
        engine.dispose();
    });
});
(0, globals_1.describe)('AirgappedCache', () => {
    let cache;
    const testCacheDir = '/tmp/test-geospatial-cache-' + Date.now();
    (0, globals_1.beforeEach)(async () => {
        cache = (0, airgapped_cache_js_1.createAirgappedCache)({
            cacheDir: testCacheDir,
            maxSizeBytes: 100 * 1024 * 1024, // 100MB
            compressionEnabled: true,
            evictionPolicy: 'lru',
            persistIndex: false,
            checksumValidation: true,
        });
        await cache.initialize();
    });
    (0, globals_1.afterEach)(async () => {
        await cache.clear();
    });
    (0, globals_1.it)('should initialize cache', async () => {
        const stats = cache.getStats();
        (0, globals_1.expect)(stats.totalEntries).toBe(0);
        (0, globals_1.expect)(stats.totalSizeBytes).toBe(0);
    });
    (0, globals_1.it)('should store and retrieve metadata', async () => {
        const scene = createMockScene('cache-test-001');
        await cache.cacheScene(scene);
        const retrieved = await cache.getScene('cache-test-001');
        (0, globals_1.expect)(retrieved).toBeDefined();
        (0, globals_1.expect)(retrieved?.id).toBe(scene.id);
        (0, globals_1.expect)(retrieved?.platform).toBe(scene.platform);
    });
    (0, globals_1.it)('should store and retrieve generic data', async () => {
        const testData = { test: 'value', nested: { key: 123 } };
        await cache.set('test-key', testData, { dataType: 'metadata' });
        const retrieved = await cache.get('test-key');
        (0, globals_1.expect)(retrieved).toEqual(testData);
    });
    (0, globals_1.it)('should return null for missing keys', async () => {
        const result = await cache.get('nonexistent-key');
        (0, globals_1.expect)(result).toBeNull();
    });
    (0, globals_1.it)('should check key existence', async () => {
        await cache.set('exists-key', 'test', { dataType: 'metadata' });
        (0, globals_1.expect)(await cache.has('exists-key')).toBe(true);
        (0, globals_1.expect)(await cache.has('not-exists-key')).toBe(false);
    });
    (0, globals_1.it)('should delete entries', async () => {
        await cache.set('delete-key', 'test', { dataType: 'metadata' });
        (0, globals_1.expect)(await cache.has('delete-key')).toBe(true);
        const deleted = await cache.delete('delete-key');
        (0, globals_1.expect)(deleted).toBe(true);
        (0, globals_1.expect)(await cache.has('delete-key')).toBe(false);
    });
    (0, globals_1.it)('should track statistics', async () => {
        await cache.set('stat-key-1', 'test1', { dataType: 'metadata' });
        await cache.set('stat-key-2', 'test2', { dataType: 'raster' });
        const stats = cache.getStats();
        (0, globals_1.expect)(stats.totalEntries).toBe(2);
        (0, globals_1.expect)(stats.entriesByType.metadata).toBe(1);
        (0, globals_1.expect)(stats.entriesByType.raster).toBe(1);
    });
    (0, globals_1.it)('should handle priority-based entries', async () => {
        await cache.set('critical-data', 'important', {
            dataType: 'metadata',
            priority: 'critical',
        });
        await cache.set('normal-data', 'regular', {
            dataType: 'metadata',
            priority: 'normal',
        });
        const stats = cache.getStats();
        (0, globals_1.expect)(stats.entriesByPriority.critical).toBe(1);
        (0, globals_1.expect)(stats.entriesByPriority.normal).toBe(1);
    });
    (0, globals_1.it)('should compact expired entries', async () => {
        await cache.set('expires-soon', 'test', {
            dataType: 'metadata',
            ttlMs: 1, // Expires immediately
        });
        // Wait for expiration
        await new Promise((resolve) => setTimeout(resolve, 10));
        const { removed, freedBytes } = await cache.compact();
        (0, globals_1.expect)(removed).toBeGreaterThanOrEqual(1);
    });
    (0, globals_1.it)('should export inventory', async () => {
        await cache.set('inv-1', 'test1', { dataType: 'metadata' });
        await cache.set('inv-2', 'test2', { dataType: 'raster' });
        const inventory = await cache.exportInventory();
        (0, globals_1.expect)(inventory.entries.length).toBe(2);
        (0, globals_1.expect)(inventory.totalSize).toBeGreaterThan(0);
    });
});
(0, globals_1.describe)('Satellite Types', () => {
    (0, globals_1.it)('should create valid SatelliteScene', () => {
        const scene = createMockScene('type-test-001');
        (0, globals_1.expect)(scene.id).toBe('type-test-001');
        (0, globals_1.expect)(scene.platform).toBe('sentinel-2');
        (0, globals_1.expect)(scene.processingLevel).toBe('L2A');
        (0, globals_1.expect)(scene.bbox.minLon).toBeLessThan(scene.bbox.maxLon);
        (0, globals_1.expect)(scene.bbox.minLat).toBeLessThan(scene.bbox.maxLat);
    });
    (0, globals_1.it)('should create valid RasterTile', () => {
        const tile = createMockTile('tile-test-001', 'nir');
        (0, globals_1.expect)(tile.sceneId).toBe('tile-test-001');
        (0, globals_1.expect)(tile.band).toBe('nir');
        (0, globals_1.expect)(tile.data.length).toBe(tile.width * tile.height);
        (0, globals_1.expect)(tile.data instanceof Float32Array).toBe(true);
    });
    (0, globals_1.it)('should create valid IntelFeatureCollection', () => {
        const collection = createMockFeatureCollection();
        (0, globals_1.expect)(collection.type).toBe('FeatureCollection');
        (0, globals_1.expect)(collection.features.length).toBe(2);
        (0, globals_1.expect)(collection.features[0].properties?.entityId).toBeTruthy();
    });
});
(0, globals_1.describe)('Benchmarks', () => {
    (0, globals_1.it)('should benchmark fusion performance', async () => {
        const fusion = (0, raster_vector_fusion_js_1.createFusionProcessor)({
            vectorLayers: ['test'],
            rasterBands: ['red', 'nir'],
            fusionMethod: 'overlay',
            outputType: 'enriched_vectors',
        });
        const scene = createMockScene('bench-001');
        const rasterData = new Map([
            ['red', createMockTile('bench-001', 'red', 256, 256)],
            ['nir', createMockTile('bench-001', 'nir', 256, 256)],
        ]);
        // Create larger feature collection
        const features = {
            type: 'FeatureCollection',
            features: Array.from({ length: 100 }, (_, i) => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-122.5 + Math.random() * 0.5, 37.5 + Math.random() * 0.5],
                },
                properties: {
                    entityId: `bench-entity-${i}`,
                    entityType: 'test',
                },
            })),
        };
        const startTime = Date.now();
        const result = await fusion.fuse(scene, features, rasterData);
        const duration = Date.now() - startTime;
        console.log(`Fusion benchmark: ${features.features.length} features processed in ${duration}ms`);
        console.log(`  Output features: ${result.features.length}`);
        console.log(`  Features/second: ${Math.round((features.features.length / duration) * 1000)}`);
        (0, globals_1.expect)(result.features.length).toBe(features.features.length);
        (0, globals_1.expect)(duration).toBeLessThan(10000); // Should complete in under 10 seconds
    });
    (0, globals_1.it)('should benchmark change detection performance', async () => {
        const engine = (0, change_detection_js_1.createChangeDetectionEngine)({
            methods: ['spectral_differencing'],
            minConfidence: 0.5,
            minChangeMagnitude: 0.2,
            minAreaSqMeters: 100,
            maxCloudCover: 30,
        });
        const beforeScene = createMockScene('bench-before', {
            acquisitionDate: new Date('2024-01-01'),
        });
        const afterScene = createMockScene('bench-after', {
            acquisitionDate: new Date('2024-02-01'),
        });
        const size = 256;
        const beforeRaster = new Map([
            ['red', createMockTile('bench-before', 'red', size, size)],
        ]);
        // Create after raster with scattered changes
        const afterTile = createMockTile('bench-after', 'red', size, size);
        for (let i = 0; i < 20; i++) {
            const cx = Math.floor(Math.random() * (size - 20)) + 10;
            const cy = Math.floor(Math.random() * (size - 20)) + 10;
            for (let dy = -5; dy <= 5; dy++) {
                for (let dx = -5; dx <= 5; dx++) {
                    const idx = (cy + dy) * size + (cx + dx);
                    afterTile.data[idx] = 255;
                }
            }
        }
        const afterRaster = new Map([['red', afterTile]]);
        const startTime = Date.now();
        const result = await engine.detectChanges(beforeScene, afterScene, beforeRaster, afterRaster);
        const duration = Date.now() - startTime;
        console.log(`Change detection benchmark: ${size}x${size} pixels processed in ${duration}ms`);
        console.log(`  Changes detected: ${result.changes.length}`);
        console.log(`  Pixels/second: ${Math.round(((size * size) / duration) * 1000)}`);
        (0, globals_1.expect)(duration).toBeLessThan(5000); // Should complete in under 5 seconds
        engine.dispose();
    });
});
