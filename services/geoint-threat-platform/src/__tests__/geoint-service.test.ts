/**
 * GEOINT Service Tests
 * Comprehensive test suite for geospatial intelligence analysis
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GEOINTService } from '../services/geoint-service.js';

describe('GEOINTService', () => {
  let service: GEOINTService;

  beforeEach(() => {
    service = new GEOINTService();
  });

  describe('3D Visualization Agents', () => {
    it('should register a visualization agent', async () => {
      const agent = {
        id: 'test-agent',
        name: 'Test Agent',
        type: 'VIEWSHED_ANALYZER' as const,
        status: 'IDLE' as const,
        capabilities: ['viewshed'],
        configuration: {
          maxPoints: 1000000,
          cacheEnabled: true,
        },
        metrics: {
          processedPoints: 0,
          averageLatency: 0,
          cacheHitRate: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await service.registerAgent(agent);
      const agents = service.getAgentsByType('VIEWSHED_ANALYZER');

      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe('test-agent');
      expect(agents[0].status).toBe('READY');
    });

    it('should get agents by type', async () => {
      await service.registerAgent({
        id: 'viewshed-1',
        name: 'Viewshed 1',
        type: 'VIEWSHED_ANALYZER' as const,
        status: 'IDLE' as const,
        capabilities: [],
        configuration: {},
        metrics: { processedPoints: 0, averageLatency: 0, cacheHitRate: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await service.registerAgent({
        id: 'los-1',
        name: 'LOS 1',
        type: 'LINE_OF_SIGHT' as const,
        status: 'IDLE' as const,
        capabilities: [],
        configuration: {},
        metrics: { processedPoints: 0, averageLatency: 0, cacheHitRate: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const viewshedAgents = service.getAgentsByType('VIEWSHED_ANALYZER');
      const losAgents = service.getAgentsByType('LINE_OF_SIGHT');

      expect(viewshedAgents).toHaveLength(1);
      expect(losAgents).toHaveLength(1);
    });
  });

  describe('Viewshed Analysis', () => {
    it('should perform viewshed analysis', async () => {
      const result = await service.performViewshedAnalysis({
        observer: { latitude: 38.9, longitude: -77.0, elevation: 100 },
        maxRadius: 1000,
        resolution: 50,
      });

      expect(result).toBeDefined();
      expect(result.observerPoint.latitude).toBe(38.9);
      expect(result.observerPoint.longitude).toBe(-77.0);
      expect(result.visibleArea).toBeGreaterThan(0);
      expect(result.visibleCells).toBeInstanceOf(Array);
      expect(result.blindSpots).toBeInstanceOf(Array);
      expect(result.analysisTime).toBeGreaterThan(0);
    });

    it('should return visible cells within radius', async () => {
      const result = await service.performViewshedAnalysis({
        observer: { latitude: 38.9, longitude: -77.0, elevation: 100 },
        maxRadius: 500,
        resolution: 100,
      });

      // All visible cells should be within the max radius
      for (const cell of result.visibleCells) {
        expect(cell.distance).toBeLessThanOrEqual(500);
      }
    });
  });

  describe('Line of Sight Analysis', () => {
    it('should perform line of sight analysis', async () => {
      const result = await service.performLineOfSightAnalysis({
        observer: { latitude: 38.9, longitude: -77.0, elevation: 100 },
        target: { latitude: 38.91, longitude: -77.01, elevation: 50 },
      });

      expect(result).toBeDefined();
      expect(result.observer.latitude).toBe(38.9);
      expect(result.target.latitude).toBe(38.91);
      expect(typeof result.visible).toBe('boolean');
      expect(result.obstructions).toBeInstanceOf(Array);
      expect(typeof result.clearanceAngle).toBe('number');
      expect(result.distance).toBeGreaterThan(0);
    });

    it('should calculate correct distance between observer and target', async () => {
      const result = await service.performLineOfSightAnalysis({
        observer: { latitude: 38.9, longitude: -77.0, elevation: 100 },
        target: { latitude: 38.9, longitude: -77.0, elevation: 100 },
      });

      // Same point should have ~0 distance
      expect(result.distance).toBeLessThan(1);
    });
  });

  describe('Terrain Analysis', () => {
    it('should analyze terrain region', async () => {
      const bbox = {
        minLon: -77.1,
        minLat: 38.85,
        maxLon: -77.0,
        maxLat: 38.95,
      };

      const result = await service.analyzeTerrainRegion(bbox, 100);

      expect(result).toBeDefined();
      expect(result.bbox).toEqual(bbox);
      expect(result.statistics.minElevation).toBeLessThanOrEqual(result.statistics.maxElevation);
      expect(result.statistics.meanSlope).toBeGreaterThanOrEqual(0);
      expect(result.statistics.meanSlope).toBeLessThanOrEqual(90);
      expect(result.accessibility.vehicleAccessible).toBeGreaterThanOrEqual(0);
      expect(result.accessibility.vehicleAccessible).toBeLessThanOrEqual(100);
    });

    it('should identify strategic terrain features', async () => {
      const bbox = {
        minLon: -77.1,
        minLat: 38.85,
        maxLon: -77.0,
        maxLat: 38.95,
      };

      const result = await service.analyzeTerrainRegion(bbox, 100);

      expect(result.strategicValue.observationPoints).toBeInstanceOf(Array);
      expect(result.strategicValue.chokPoints).toBeInstanceOf(Array);
      expect(result.strategicValue.coverAreas).toBeInstanceOf(Array);

      // Check observation points have required properties
      for (const point of result.strategicValue.observationPoints) {
        expect(point).toHaveProperty('latitude');
        expect(point).toHaveProperty('longitude');
        expect(point).toHaveProperty('score');
      }
    });

    it('should classify terrain types', async () => {
      const bbox = {
        minLon: -77.1,
        minLat: 38.85,
        maxLon: -77.0,
        maxLat: 38.95,
      };

      const result = await service.analyzeTerrainRegion(bbox, 100);

      expect(result.terrainClassification).toBeDefined();

      // Total percentage should sum to approximately 100
      const totalPercentage = Object.values(result.terrainClassification)
        .reduce((sum, val) => sum + val, 0);
      expect(totalPercentage).toBeCloseTo(100, 0);
    });
  });

  describe('Terrain Mesh Generation', () => {
    it('should generate terrain mesh for 3D visualization', async () => {
      const result = await service.generateTerrainMesh({
        bbox: { minLon: -77.05, minLat: 38.9, maxLon: -77.0, maxLat: 38.95 },
        resolution: 100,
      });

      expect(result).toBeDefined();
      expect(result.vertices).toBeInstanceOf(Float32Array);
      expect(result.indices).toBeInstanceOf(Uint32Array);
      expect(result.normals).toBeInstanceOf(Float32Array);
      expect(result.uvs).toBeInstanceOf(Float32Array);

      // Vertices should be 3 components per point (x, y, z)
      expect(result.vertices.length % 3).toBe(0);
      // Normals should match vertices count
      expect(result.normals.length).toBe(result.vertices.length);
      // UVs should be 2 components per point
      expect(result.uvs.length).toBe((result.vertices.length / 3) * 2);
      // Indices should form triangles (3 per triangle)
      expect(result.indices.length % 3).toBe(0);
    });
  });

  describe('Satellite Imagery Analysis', () => {
    it('should analyze satellite imagery', async () => {
      const result = await service.analyzeSatelliteImagery('test-image-123', [
        'BUILDINGS',
        'VEHICLES',
        'ANOMALIES',
      ]);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.imageId).toBe('test-image-123');
      expect(result.provider).toBe('MAXAR');
      expect(result.imageryType).toBe('OPTICAL');
      expect(result.detectedFeatures).toBeInstanceOf(Array);
      expect(result.anomalies).toBeInstanceOf(Array);
      expect(result.processingDuration).toBeGreaterThan(0);
    });

    it('should perform change detection', async () => {
      const result = await service.performChangeDetection('base-image-1', 'compare-image-2');

      expect(result).toBeDefined();
      expect(result.analysisId).toBeDefined();
      expect(result.baseImageId).toBe('base-image-1');
      expect(result.compareImageId).toBe('compare-image-2');
      expect(result.timeDelta).toBeGreaterThan(0);
      expect(result.changes).toBeInstanceOf(Array);
      expect(result.summary).toBeDefined();
      expect(result.summary.totalChangedArea).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Agent Task Execution', () => {
    beforeEach(async () => {
      await service.registerAgent({
        id: 'viewshed-test',
        name: 'Viewshed Test Agent',
        type: 'VIEWSHED_ANALYZER' as const,
        status: 'IDLE' as const,
        capabilities: ['viewshed'],
        configuration: { cacheEnabled: true },
        metrics: { processedPoints: 0, averageLatency: 0, cacheHitRate: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    it('should execute agent task', async () => {
      const result = await service.executeAgentTask('viewshed-test', 'viewshed', {
        observer: { latitude: 38.9, longitude: -77.0, elevation: 100 },
        maxRadius: 500,
        resolution: 50,
      });

      expect(result).toBeDefined();
    });

    it('should throw error for unknown agent', async () => {
      await expect(
        service.executeAgentTask('unknown-agent', 'task', {})
      ).rejects.toThrow('Agent unknown-agent not found');
    });
  });
});

describe('Edge Query Performance', () => {
  let service: GEOINTService;

  beforeEach(() => {
    service = new GEOINTService();
  });

  it('should complete viewshed analysis within p95 target (<2s)', async () => {
    const startTime = performance.now();

    await service.performViewshedAnalysis({
      observer: { latitude: 38.9, longitude: -77.0, elevation: 100 },
      maxRadius: 2000,
      resolution: 30,
    });

    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(2000); // p95 < 2s target
  });

  it('should complete terrain analysis within p95 target (<2s)', async () => {
    const startTime = performance.now();

    await service.analyzeTerrainRegion(
      { minLon: -77.1, minLat: 38.85, maxLon: -77.0, maxLat: 38.95 },
      50
    );

    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(2000);
  });

  it('should complete LOS analysis within p95 target (<2s)', async () => {
    const startTime = performance.now();

    await service.performLineOfSightAnalysis({
      observer: { latitude: 38.9, longitude: -77.0, elevation: 100 },
      target: { latitude: 38.95, longitude: -77.05, elevation: 80 },
    });

    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(2000);
  });
});
