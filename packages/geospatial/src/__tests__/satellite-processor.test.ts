/**
 * Satellite Imagery Processor Tests
 * Tests for GDAL pipeline, raster/vector fusion, change detection, and caching
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as turf from '@turf/turf';
import {
  SatelliteScene,
  RasterTile,
  SpectralBand,
  BoundingBox,
  ChangeType,
  FusionConfig,
  ExtractedFeature,
  GeoNodeType,
  ProvenanceRecord,
} from '../types/satellite.js';
import { IntelFeatureCollection } from '../types/geospatial.js';
import { RasterVectorFusion, createFusionProcessor } from '../processing/raster-vector-fusion.js';
import { ChangeDetectionEngine, createChangeDetectionEngine } from '../processing/change-detection.js';
import { AirgappedCache, createAirgappedCache } from '../processing/airgapped-cache.js';

// Test fixtures
const createMockScene = (id: string, overrides: Partial<SatelliteScene> = {}): SatelliteScene => ({
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

const createMockTile = (
  sceneId: string,
  band: SpectralBand,
  width = 100,
  height = 100,
  fillValue = 100
): RasterTile => {
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

const createMockFeatureCollection = (): IntelFeatureCollection => ({
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

describe('RasterVectorFusion', () => {
  let fusion: RasterVectorFusion;
  let scene: SatelliteScene;
  let rasterData: Map<SpectralBand, RasterTile>;
  let vectorFeatures: IntelFeatureCollection;

  beforeEach(() => {
    const config: FusionConfig = {
      vectorLayers: ['facilities'],
      rasterBands: ['red', 'green', 'blue', 'nir'],
      fusionMethod: 'overlay',
      outputType: 'enriched_vectors',
    };

    fusion = createFusionProcessor(config);
    scene = createMockScene('scene-001');

    rasterData = new Map([
      ['red', createMockTile('scene-001', 'red')],
      ['green', createMockTile('scene-001', 'green')],
      ['blue', createMockTile('scene-001', 'blue')],
      ['nir', createMockTile('scene-001', 'nir', 100, 100, 150)],
    ]);

    vectorFeatures = createMockFeatureCollection();
  });

  it('should create fusion processor with config', () => {
    expect(fusion).toBeDefined();
  });

  it('should execute overlay fusion', async () => {
    const result = await fusion.fuse(scene, vectorFeatures, rasterData);

    expect(result).toBeDefined();
    expect(result.id).toBeTruthy();
    expect(result.sceneId).toBe(scene.id);
    expect(result.features.length).toBeGreaterThan(0);
    expect(result.processingTimeMs).toBeGreaterThan(0);
  });

  it('should enrich features with spectral signatures', async () => {
    const result = await fusion.fuse(scene, vectorFeatures, rasterData);

    for (const feature of result.features) {
      expect(feature.properties.sceneId).toBe(scene.id);
      expect(feature.properties.extractionMethod).toBe('overlay');
    }
  });

  it('should emit progress events', async () => {
    const progressEvents: Array<[number, string]> = [];

    fusion.on('progress', (progress, message) => {
      progressEvents.push([progress, message]);
    });

    await fusion.fuse(scene, vectorFeatures, rasterData);

    expect(progressEvents.length).toBeGreaterThan(0);
    expect(progressEvents[0][0]).toBe(0); // First event should be 0%
    expect(progressEvents[progressEvents.length - 1][0]).toBe(100); // Last should be 100%
  });

  it('should handle zonal stats fusion for polygons', async () => {
    const zonalFusion = createFusionProcessor({
      vectorLayers: ['facilities'],
      rasterBands: ['red', 'nir'],
      fusionMethod: 'zonal_stats',
      outputType: 'enriched_vectors',
    });

    const result = await zonalFusion.fuse(scene, vectorFeatures, rasterData);

    // Should have features (only polygon features for zonal stats)
    const polygonFeatures = result.features.filter(
      (f) => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'
    );
    expect(polygonFeatures.length).toBeGreaterThan(0);
  });
});

describe('ChangeDetectionEngine', () => {
  let engine: ChangeDetectionEngine;
  let beforeScene: SatelliteScene;
  let afterScene: SatelliteScene;
  let beforeRaster: Map<SpectralBand, RasterTile>;
  let afterRaster: Map<SpectralBand, RasterTile>;

  beforeEach(() => {
    engine = createChangeDetectionEngine({
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

  it('should create change detection engine', () => {
    expect(engine).toBeDefined();
  });

  it('should detect changes between scenes', async () => {
    const result = await engine.detectChanges(
      beforeScene,
      afterScene,
      beforeRaster,
      afterRaster
    );

    expect(result).toBeDefined();
    expect(result.id).toBeTruthy();
    expect(result.beforeSceneId).toBe(beforeScene.id);
    expect(result.afterSceneId).toBe(afterScene.id);
    expect(result.processingTimeMs).toBeGreaterThan(0);
  });

  it('should reject scenes with high cloud cover', async () => {
    const cloudyScene = createMockScene('cloudy-001', {
      cloudCoverPercent: 50,
      acquisitionDate: new Date('2024-02-15'),
    });

    await expect(
      engine.detectChanges(beforeScene, cloudyScene, beforeRaster, afterRaster)
    ).rejects.toThrow(/cloud cover/i);
  });

  it('should reject scenes in wrong temporal order', async () => {
    const olderScene = createMockScene('older-001', {
      acquisitionDate: new Date('2023-01-01'),
    });

    await expect(
      engine.detectChanges(beforeScene, olderScene, beforeRaster, afterRaster)
    ).rejects.toThrow(/after/i);
  });

  it('should create agentic monitoring tasks', () => {
    const aoi = {
      type: 'Polygon' as const,
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

    expect(task).toBeDefined();
    expect(task.taskId).toBeTruthy();
    expect(task.taskType).toBe('monitor');
    expect(task.priority).toBe('priority');
    expect(task.status).toBe('queued');
  });

  it('should track active tasks', () => {
    const aoi = {
      type: 'Polygon' as const,
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
    expect(activeTasks).toContainEqual(expect.objectContaining({ taskId: task.taskId }));

    engine.cancelTask(task.taskId);

    const tasksAfterCancel = engine.getActiveTasks();
    expect(tasksAfterCancel).not.toContainEqual(expect.objectContaining({ taskId: task.taskId }));
  });

  afterEach(() => {
    engine.dispose();
  });
});

describe('AirgappedCache', () => {
  let cache: AirgappedCache;
  const testCacheDir = '/tmp/test-geospatial-cache-' + Date.now();

  beforeEach(async () => {
    cache = createAirgappedCache({
      cacheDir: testCacheDir,
      maxSizeBytes: 100 * 1024 * 1024, // 100MB
      compressionEnabled: true,
      evictionPolicy: 'lru',
      persistIndex: false,
      checksumValidation: true,
    });

    await cache.initialize();
  });

  afterEach(async () => {
    await cache.clear();
  });

  it('should initialize cache', async () => {
    const stats = cache.getStats();
    expect(stats.totalEntries).toBe(0);
    expect(stats.totalSizeBytes).toBe(0);
  });

  it('should store and retrieve metadata', async () => {
    const scene = createMockScene('cache-test-001');

    await cache.cacheScene(scene);

    const retrieved = await cache.getScene('cache-test-001');
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(scene.id);
    expect(retrieved?.platform).toBe(scene.platform);
  });

  it('should store and retrieve generic data', async () => {
    const testData = { test: 'value', nested: { key: 123 } };

    await cache.set('test-key', testData, { dataType: 'metadata' });

    const retrieved = await cache.get<typeof testData>('test-key');
    expect(retrieved).toEqual(testData);
  });

  it('should return null for missing keys', async () => {
    const result = await cache.get('nonexistent-key');
    expect(result).toBeNull();
  });

  it('should check key existence', async () => {
    await cache.set('exists-key', 'test', { dataType: 'metadata' });

    expect(await cache.has('exists-key')).toBe(true);
    expect(await cache.has('not-exists-key')).toBe(false);
  });

  it('should delete entries', async () => {
    await cache.set('delete-key', 'test', { dataType: 'metadata' });

    expect(await cache.has('delete-key')).toBe(true);

    const deleted = await cache.delete('delete-key');
    expect(deleted).toBe(true);

    expect(await cache.has('delete-key')).toBe(false);
  });

  it('should track statistics', async () => {
    await cache.set('stat-key-1', 'test1', { dataType: 'metadata' });
    await cache.set('stat-key-2', 'test2', { dataType: 'raster' });

    const stats = cache.getStats();
    expect(stats.totalEntries).toBe(2);
    expect(stats.entriesByType.metadata).toBe(1);
    expect(stats.entriesByType.raster).toBe(1);
  });

  it('should handle priority-based entries', async () => {
    await cache.set('critical-data', 'important', {
      dataType: 'metadata',
      priority: 'critical',
    });

    await cache.set('normal-data', 'regular', {
      dataType: 'metadata',
      priority: 'normal',
    });

    const stats = cache.getStats();
    expect(stats.entriesByPriority.critical).toBe(1);
    expect(stats.entriesByPriority.normal).toBe(1);
  });

  it('should compact expired entries', async () => {
    await cache.set('expires-soon', 'test', {
      dataType: 'metadata',
      ttlMs: 1, // Expires immediately
    });

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 10));

    const { removed, freedBytes } = await cache.compact();
    expect(removed).toBeGreaterThanOrEqual(1);
  });

  it('should export inventory', async () => {
    await cache.set('inv-1', 'test1', { dataType: 'metadata' });
    await cache.set('inv-2', 'test2', { dataType: 'raster' });

    const inventory = await cache.exportInventory();
    expect(inventory.entries.length).toBe(2);
    expect(inventory.totalSize).toBeGreaterThan(0);
  });
});

describe('Satellite Types', () => {
  it('should create valid SatelliteScene', () => {
    const scene = createMockScene('type-test-001');

    expect(scene.id).toBe('type-test-001');
    expect(scene.platform).toBe('sentinel-2');
    expect(scene.processingLevel).toBe('L2A');
    expect(scene.bbox.minLon).toBeLessThan(scene.bbox.maxLon);
    expect(scene.bbox.minLat).toBeLessThan(scene.bbox.maxLat);
  });

  it('should create valid RasterTile', () => {
    const tile = createMockTile('tile-test-001', 'nir');

    expect(tile.sceneId).toBe('tile-test-001');
    expect(tile.band).toBe('nir');
    expect(tile.data.length).toBe(tile.width * tile.height);
    expect(tile.data instanceof Float32Array).toBe(true);
  });

  it('should create valid IntelFeatureCollection', () => {
    const collection = createMockFeatureCollection();

    expect(collection.type).toBe('FeatureCollection');
    expect(collection.features.length).toBe(2);
    expect(collection.features[0].properties?.entityId).toBeTruthy();
  });
});

describe('Benchmarks', () => {
  it('should benchmark fusion performance', async () => {
    const fusion = createFusionProcessor({
      vectorLayers: ['test'],
      rasterBands: ['red', 'nir'],
      fusionMethod: 'overlay',
      outputType: 'enriched_vectors',
    });

    const scene = createMockScene('bench-001');
    const rasterData = new Map<SpectralBand, RasterTile>([
      ['red', createMockTile('bench-001', 'red', 256, 256)],
      ['nir', createMockTile('bench-001', 'nir', 256, 256)],
    ]);

    // Create larger feature collection
    const features: IntelFeatureCollection = {
      type: 'FeatureCollection',
      features: Array.from({ length: 100 }, (_, i) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
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

    expect(result.features.length).toBe(features.features.length);
    expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds
  });

  it('should benchmark change detection performance', async () => {
    const engine = createChangeDetectionEngine({
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
    const beforeRaster = new Map<SpectralBand, RasterTile>([
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
    const afterRaster = new Map<SpectralBand, RasterTile>([['red', afterTile]]);

    const startTime = Date.now();
    const result = await engine.detectChanges(
      beforeScene,
      afterScene,
      beforeRaster,
      afterRaster
    );
    const duration = Date.now() - startTime;

    console.log(`Change detection benchmark: ${size}x${size} pixels processed in ${duration}ms`);
    console.log(`  Changes detected: ${result.changes.length}`);
    console.log(`  Pixels/second: ${Math.round(((size * size) / duration) * 1000)}`);

    expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds

    engine.dispose();
  });
});
