"use strict";
/**
 * GEOINT Service Tests
 * Comprehensive test suite for geospatial intelligence analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const geoint_service_js_1 = require("../services/geoint-service.js");
(0, vitest_1.describe)('GEOINTService', () => {
    let service;
    (0, vitest_1.beforeEach)(() => {
        service = new geoint_service_js_1.GEOINTService();
    });
    (0, vitest_1.describe)('3D Visualization Agents', () => {
        (0, vitest_1.it)('should register a visualization agent', async () => {
            const agent = {
                id: 'test-agent',
                name: 'Test Agent',
                type: 'VIEWSHED_ANALYZER',
                status: 'IDLE',
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
            (0, vitest_1.expect)(agents).toHaveLength(1);
            (0, vitest_1.expect)(agents[0].id).toBe('test-agent');
            (0, vitest_1.expect)(agents[0].status).toBe('READY');
        });
        (0, vitest_1.it)('should get agents by type', async () => {
            await service.registerAgent({
                id: 'viewshed-1',
                name: 'Viewshed 1',
                type: 'VIEWSHED_ANALYZER',
                status: 'IDLE',
                capabilities: [],
                configuration: {},
                metrics: { processedPoints: 0, averageLatency: 0, cacheHitRate: 0 },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            await service.registerAgent({
                id: 'los-1',
                name: 'LOS 1',
                type: 'LINE_OF_SIGHT',
                status: 'IDLE',
                capabilities: [],
                configuration: {},
                metrics: { processedPoints: 0, averageLatency: 0, cacheHitRate: 0 },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            const viewshedAgents = service.getAgentsByType('VIEWSHED_ANALYZER');
            const losAgents = service.getAgentsByType('LINE_OF_SIGHT');
            (0, vitest_1.expect)(viewshedAgents).toHaveLength(1);
            (0, vitest_1.expect)(losAgents).toHaveLength(1);
        });
    });
    (0, vitest_1.describe)('Viewshed Analysis', () => {
        (0, vitest_1.it)('should perform viewshed analysis', async () => {
            const result = await service.performViewshedAnalysis({
                observer: { latitude: 38.9, longitude: -77.0, elevation: 100 },
                maxRadius: 1000,
                resolution: 50,
            });
            (0, vitest_1.expect)(result).toBeDefined();
            (0, vitest_1.expect)(result.observerPoint.latitude).toBe(38.9);
            (0, vitest_1.expect)(result.observerPoint.longitude).toBe(-77.0);
            (0, vitest_1.expect)(result.visibleArea).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.visibleCells).toBeInstanceOf(Array);
            (0, vitest_1.expect)(result.blindSpots).toBeInstanceOf(Array);
            (0, vitest_1.expect)(result.analysisTime).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should return visible cells within radius', async () => {
            const result = await service.performViewshedAnalysis({
                observer: { latitude: 38.9, longitude: -77.0, elevation: 100 },
                maxRadius: 500,
                resolution: 100,
            });
            // All visible cells should be within the max radius
            for (const cell of result.visibleCells) {
                (0, vitest_1.expect)(cell.distance).toBeLessThanOrEqual(500);
            }
        });
    });
    (0, vitest_1.describe)('Line of Sight Analysis', () => {
        (0, vitest_1.it)('should perform line of sight analysis', async () => {
            const result = await service.performLineOfSightAnalysis({
                observer: { latitude: 38.9, longitude: -77.0, elevation: 100 },
                target: { latitude: 38.91, longitude: -77.01, elevation: 50 },
            });
            (0, vitest_1.expect)(result).toBeDefined();
            (0, vitest_1.expect)(result.observer.latitude).toBe(38.9);
            (0, vitest_1.expect)(result.target.latitude).toBe(38.91);
            (0, vitest_1.expect)(typeof result.visible).toBe('boolean');
            (0, vitest_1.expect)(result.obstructions).toBeInstanceOf(Array);
            (0, vitest_1.expect)(typeof result.clearanceAngle).toBe('number');
            (0, vitest_1.expect)(result.distance).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should calculate correct distance between observer and target', async () => {
            const result = await service.performLineOfSightAnalysis({
                observer: { latitude: 38.9, longitude: -77.0, elevation: 100 },
                target: { latitude: 38.9, longitude: -77.0, elevation: 100 },
            });
            // Same point should have ~0 distance
            (0, vitest_1.expect)(result.distance).toBeLessThan(1);
        });
    });
    (0, vitest_1.describe)('Terrain Analysis', () => {
        (0, vitest_1.it)('should analyze terrain region', async () => {
            const bbox = {
                minLon: -77.1,
                minLat: 38.85,
                maxLon: -77.0,
                maxLat: 38.95,
            };
            const result = await service.analyzeTerrainRegion(bbox, 100);
            (0, vitest_1.expect)(result).toBeDefined();
            (0, vitest_1.expect)(result.bbox).toEqual(bbox);
            (0, vitest_1.expect)(result.statistics.minElevation).toBeLessThanOrEqual(result.statistics.maxElevation);
            (0, vitest_1.expect)(result.statistics.meanSlope).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(result.statistics.meanSlope).toBeLessThanOrEqual(90);
            (0, vitest_1.expect)(result.accessibility.vehicleAccessible).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(result.accessibility.vehicleAccessible).toBeLessThanOrEqual(100);
        });
        (0, vitest_1.it)('should identify strategic terrain features', async () => {
            const bbox = {
                minLon: -77.1,
                minLat: 38.85,
                maxLon: -77.0,
                maxLat: 38.95,
            };
            const result = await service.analyzeTerrainRegion(bbox, 100);
            (0, vitest_1.expect)(result.strategicValue.observationPoints).toBeInstanceOf(Array);
            (0, vitest_1.expect)(result.strategicValue.chokPoints).toBeInstanceOf(Array);
            (0, vitest_1.expect)(result.strategicValue.coverAreas).toBeInstanceOf(Array);
            // Check observation points have required properties
            for (const point of result.strategicValue.observationPoints) {
                (0, vitest_1.expect)(point).toHaveProperty('latitude');
                (0, vitest_1.expect)(point).toHaveProperty('longitude');
                (0, vitest_1.expect)(point).toHaveProperty('score');
            }
        });
        (0, vitest_1.it)('should classify terrain types', async () => {
            const bbox = {
                minLon: -77.1,
                minLat: 38.85,
                maxLon: -77.0,
                maxLat: 38.95,
            };
            const result = await service.analyzeTerrainRegion(bbox, 100);
            (0, vitest_1.expect)(result.terrainClassification).toBeDefined();
            // Total percentage should sum to approximately 100
            const totalPercentage = Object.values(result.terrainClassification)
                .reduce((sum, val) => sum + val, 0);
            (0, vitest_1.expect)(totalPercentage).toBeCloseTo(100, 0);
        });
    });
    (0, vitest_1.describe)('Terrain Mesh Generation', () => {
        (0, vitest_1.it)('should generate terrain mesh for 3D visualization', async () => {
            const result = await service.generateTerrainMesh({
                bbox: { minLon: -77.05, minLat: 38.9, maxLon: -77.0, maxLat: 38.95 },
                resolution: 100,
            });
            (0, vitest_1.expect)(result).toBeDefined();
            (0, vitest_1.expect)(result.vertices).toBeInstanceOf(Float32Array);
            (0, vitest_1.expect)(result.indices).toBeInstanceOf(Uint32Array);
            (0, vitest_1.expect)(result.normals).toBeInstanceOf(Float32Array);
            (0, vitest_1.expect)(result.uvs).toBeInstanceOf(Float32Array);
            // Vertices should be 3 components per point (x, y, z)
            (0, vitest_1.expect)(result.vertices.length % 3).toBe(0);
            // Normals should match vertices count
            (0, vitest_1.expect)(result.normals.length).toBe(result.vertices.length);
            // UVs should be 2 components per point
            (0, vitest_1.expect)(result.uvs.length).toBe((result.vertices.length / 3) * 2);
            // Indices should form triangles (3 per triangle)
            (0, vitest_1.expect)(result.indices.length % 3).toBe(0);
        });
    });
    (0, vitest_1.describe)('Satellite Imagery Analysis', () => {
        (0, vitest_1.it)('should analyze satellite imagery', async () => {
            const result = await service.analyzeSatelliteImagery('test-image-123', [
                'BUILDINGS',
                'VEHICLES',
                'ANOMALIES',
            ]);
            (0, vitest_1.expect)(result).toBeDefined();
            (0, vitest_1.expect)(result.id).toBeDefined();
            (0, vitest_1.expect)(result.imageId).toBe('test-image-123');
            (0, vitest_1.expect)(result.provider).toBe('MAXAR');
            (0, vitest_1.expect)(result.imageryType).toBe('OPTICAL');
            (0, vitest_1.expect)(result.detectedFeatures).toBeInstanceOf(Array);
            (0, vitest_1.expect)(result.anomalies).toBeInstanceOf(Array);
            (0, vitest_1.expect)(result.processingDuration).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should perform change detection', async () => {
            const result = await service.performChangeDetection('base-image-1', 'compare-image-2');
            (0, vitest_1.expect)(result).toBeDefined();
            (0, vitest_1.expect)(result.analysisId).toBeDefined();
            (0, vitest_1.expect)(result.baseImageId).toBe('base-image-1');
            (0, vitest_1.expect)(result.compareImageId).toBe('compare-image-2');
            (0, vitest_1.expect)(result.timeDelta).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.changes).toBeInstanceOf(Array);
            (0, vitest_1.expect)(result.summary).toBeDefined();
            (0, vitest_1.expect)(result.summary.totalChangedArea).toBeGreaterThanOrEqual(0);
        });
    });
    (0, vitest_1.describe)('Agent Task Execution', () => {
        (0, vitest_1.beforeEach)(async () => {
            await service.registerAgent({
                id: 'viewshed-test',
                name: 'Viewshed Test Agent',
                type: 'VIEWSHED_ANALYZER',
                status: 'IDLE',
                capabilities: ['viewshed'],
                configuration: { cacheEnabled: true },
                metrics: { processedPoints: 0, averageLatency: 0, cacheHitRate: 0 },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
        });
        (0, vitest_1.it)('should execute agent task', async () => {
            const result = await service.executeAgentTask('viewshed-test', 'viewshed', {
                observer: { latitude: 38.9, longitude: -77.0, elevation: 100 },
                maxRadius: 500,
                resolution: 50,
            });
            (0, vitest_1.expect)(result).toBeDefined();
        });
        (0, vitest_1.it)('should throw error for unknown agent', async () => {
            await (0, vitest_1.expect)(service.executeAgentTask('unknown-agent', 'task', {})).rejects.toThrow('Agent unknown-agent not found');
        });
    });
});
(0, vitest_1.describe)('Edge Query Performance', () => {
    let service;
    (0, vitest_1.beforeEach)(() => {
        service = new geoint_service_js_1.GEOINTService();
    });
    (0, vitest_1.it)('should complete viewshed analysis within p95 target (<2s)', async () => {
        const startTime = performance.now();
        await service.performViewshedAnalysis({
            observer: { latitude: 38.9, longitude: -77.0, elevation: 100 },
            maxRadius: 2000,
            resolution: 30,
        });
        const duration = performance.now() - startTime;
        (0, vitest_1.expect)(duration).toBeLessThan(2000); // p95 < 2s target
    });
    (0, vitest_1.it)('should complete terrain analysis within p95 target (<2s)', async () => {
        const startTime = performance.now();
        await service.analyzeTerrainRegion({ minLon: -77.1, minLat: 38.85, maxLon: -77.0, maxLat: 38.95 }, 50);
        const duration = performance.now() - startTime;
        (0, vitest_1.expect)(duration).toBeLessThan(2000);
    });
    (0, vitest_1.it)('should complete LOS analysis within p95 target (<2s)', async () => {
        const startTime = performance.now();
        await service.performLineOfSightAnalysis({
            observer: { latitude: 38.9, longitude: -77.0, elevation: 100 },
            target: { latitude: 38.95, longitude: -77.05, elevation: 80 },
        });
        const duration = performance.now() - startTime;
        (0, vitest_1.expect)(duration).toBeLessThan(2000);
    });
});
