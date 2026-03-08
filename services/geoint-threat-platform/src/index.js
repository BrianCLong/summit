"use strict";
/**
 * GEOINT Threat Platform - Express Server
 * Main entry point with API routes and edge query optimization
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const repository_js_1 = require("./neo4j/repository.js");
const geoint_service_js_1 = require("./services/geoint-service.js");
const ioc_management_service_js_1 = require("./services/ioc-management-service.js");
const fusion_service_js_1 = require("./services/fusion-service.js");
// ============================================================================
// Configuration
// ============================================================================
const config = {
    port: parseInt(process.env.PORT || '4100'),
    neo4j: {
        uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
        user: process.env.NEO4J_USER || 'neo4j',
        password: process.env.NEO4J_PASSWORD || 'devpassword',
    },
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
    },
    queryTimeoutMs: 2000, // p95 < 2s target
};
// ============================================================================
// Initialize Services
// ============================================================================
const driver = neo4j_driver_1.default.driver(config.neo4j.uri, neo4j_driver_1.default.auth.basic(config.neo4j.user, config.neo4j.password), {
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 10000,
    maxTransactionRetryTime: 15000,
});
const repository = new repository_js_1.GEOINTNeo4jRepository(driver);
const geointService = new geoint_service_js_1.GEOINTService();
const iocService = new ioc_management_service_js_1.IOCManagementService(repository);
const fusionService = new fusion_service_js_1.FusionService(repository, geointService, iocService);
// ============================================================================
// Express App Setup
// ============================================================================
const app = (0, express_1.default)();
exports.app = app;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)(config.cors));
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
// Request timing middleware
app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
        const duration = Number(process.hrtime.bigint() - start) / 1e6;
        res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
        // Log slow queries
        if (duration > config.queryTimeoutMs) {
            console.warn(`Slow query detected: ${req.method} ${req.path} took ${duration.toFixed(2)}ms`);
        }
    });
    next();
});
// ============================================================================
// Health Check Routes
// ============================================================================
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'geoint-threat-platform' });
});
app.get('/health/ready', async (req, res) => {
    try {
        await driver.verifyConnectivity();
        res.json({ status: 'ready', neo4j: 'connected' });
    }
    catch (error) {
        res.status(503).json({ status: 'not ready', error: error.message });
    }
});
app.get('/health/live', (req, res) => {
    res.json({ status: 'live' });
});
// ============================================================================
// GEOINT API Routes
// ============================================================================
/**
 * Get threat data for a geographic region
 * Optimized for p95 < 2s response time
 */
app.post('/api/geoint/threat-data', async (req, res) => {
    try {
        const { bounds } = req.body;
        if (!bounds || !bounds.minLon || !bounds.minLat || !bounds.maxLon || !bounds.maxLat) {
            return res.status(400).json({ error: 'Invalid bounds parameter' });
        }
        // Execute queries in parallel for better performance
        const [threatActors, heatmap] = await Promise.all([
            repository.findThreatActorsInRegion({ bbox: bounds, limit: 100 }),
            repository.generateThreatHeatmap({ bbox: bounds }),
        ]);
        // Get IOCs in the region center
        const centerLat = (bounds.minLat + bounds.maxLat) / 2;
        const centerLon = (bounds.minLon + bounds.maxLon) / 2;
        const radius = Math.max((bounds.maxLat - bounds.minLat) * 111320, (bounds.maxLon - bounds.minLon) * 111320 * Math.cos(centerLat * Math.PI / 180)) / 2;
        const iocs = await repository.findIOCsInProximity({ latitude: centerLat, longitude: centerLon }, radius, { limit: 500 });
        res.json({
            threatActors: threatActors.data,
            iocs: iocs.data,
            heatmap: heatmap.data,
            metrics: {
                threatActorQueryTime: threatActors.metrics.queryTime,
                iocQueryTime: iocs.metrics.queryTime,
                heatmapQueryTime: heatmap.metrics.queryTime,
            },
        });
    }
    catch (error) {
        console.error('Error fetching threat data:', error);
        res.status(500).json({ error: 'Failed to fetch threat data' });
    }
});
/**
 * Retrieve geo points within a bounding box with deterministic ordering
 */
app.get('/geo/points', async (req, res) => {
    try {
        const bboxParam = req.query.bbox;
        if (typeof bboxParam !== 'string') {
            return res.status(400).json({ error: 'bbox query parameter is required' });
        }
        const parts = bboxParam.split(',').map(Number);
        if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) {
            return res.status(400).json({ error: 'bbox must be formatted as minLon,minLat,maxLon,maxLat' });
        }
        const [minLon, minLat, maxLon, maxLat] = parts;
        const limit = Math.min(parseInt(req.query.limit || '500', 10), 1000);
        const offset = parseInt(req.query.offset || '0', 10);
        const result = await repository.getGeoPointsByBBox({ minLon, minLat, maxLon, maxLat }, { limit, offset });
        res.json({ points: result.data, metrics: result.metrics });
    }
    catch (error) {
        console.error('Error fetching geo points:', error);
        res.status(500).json({ error: 'Failed to fetch geo points' });
    }
});
/**
 * Execute multi-INT fusion analysis
 */
app.post('/api/geoint/fusion', async (req, res) => {
    try {
        const { threatActorIds, iocIds, spatialBounds, timeRange } = req.body;
        const result = await fusionService.executeFusion({
            threatActorIds,
            iocIds,
            spatialBounds,
            timeRange: timeRange ? {
                start: new Date(timeRange.start),
                end: new Date(timeRange.end),
            } : undefined,
        });
        res.json(result);
    }
    catch (error) {
        console.error('Error executing fusion:', error);
        res.status(500).json({ error: 'Fusion analysis failed' });
    }
});
/**
 * Perform terrain viewshed analysis
 */
app.post('/api/geoint/terrain/viewshed', async (req, res) => {
    try {
        const { observer, maxRadius, resolution } = req.body;
        if (!observer || !observer.latitude || !observer.longitude) {
            return res.status(400).json({ error: 'Invalid observer parameter' });
        }
        const result = await geointService.performViewshedAnalysis({
            observer,
            maxRadius: maxRadius || 5000,
            resolution: resolution || 30,
        });
        res.json(result);
    }
    catch (error) {
        console.error('Error performing viewshed analysis:', error);
        res.status(500).json({ error: 'Viewshed analysis failed' });
    }
});
/**
 * Perform line of sight analysis
 */
app.post('/api/geoint/terrain/los', async (req, res) => {
    try {
        const { observer, target } = req.body;
        if (!observer || !target) {
            return res.status(400).json({ error: 'Observer and target required' });
        }
        const result = await geointService.performLineOfSightAnalysis({ observer, target });
        res.json(result);
    }
    catch (error) {
        console.error('Error performing LOS analysis:', error);
        res.status(500).json({ error: 'Line of sight analysis failed' });
    }
});
/**
 * Analyze terrain region
 */
app.post('/api/geoint/terrain/analyze', async (req, res) => {
    try {
        const { bbox, resolution } = req.body;
        if (!bbox) {
            return res.status(400).json({ error: 'Bounding box required' });
        }
        const result = await geointService.analyzeTerrainRegion(bbox, resolution || 30);
        res.json(result);
    }
    catch (error) {
        console.error('Error analyzing terrain:', error);
        res.status(500).json({ error: 'Terrain analysis failed' });
    }
});
// ============================================================================
// IOC Management Routes
// ============================================================================
/**
 * Ingest a single IOC
 */
app.post('/api/ioc', async (req, res) => {
    try {
        const result = await iocService.ingestIOC(req.body);
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Error ingesting IOC:', error);
        res.status(500).json({ error: 'Failed to ingest IOC' });
    }
});
/**
 * Bulk ingest IOCs
 */
app.post('/api/ioc/bulk', async (req, res) => {
    try {
        const { iocs, options } = req.body;
        if (!Array.isArray(iocs)) {
            return res.status(400).json({ error: 'iocs must be an array' });
        }
        const result = await iocService.bulkIngestIOCs(iocs, options);
        res.json(result);
    }
    catch (error) {
        console.error('Error bulk ingesting IOCs:', error);
        res.status(500).json({ error: 'Bulk ingestion failed' });
    }
});
/**
 * Find IOCs in geographic region
 */
app.post('/api/ioc/region', async (req, res) => {
    try {
        const { center, radiusMeters, types, severities, minConfidence } = req.body;
        if (!center || !radiusMeters) {
            return res.status(400).json({ error: 'center and radiusMeters required' });
        }
        const result = await iocService.findIOCsInRegion(center, radiusMeters, {
            types,
            severities,
            minConfidence,
        });
        res.json(result);
    }
    catch (error) {
        console.error('Error finding IOCs in region:', error);
        res.status(500).json({ error: 'Failed to find IOCs' });
    }
});
/**
 * Correlate IOC
 */
app.get('/api/ioc/:id/correlate', async (req, res) => {
    try {
        const result = await iocService.correlateIOC(req.params.id);
        res.json(result);
    }
    catch (error) {
        console.error('Error correlating IOC:', error);
        res.status(500).json({ error: 'IOC correlation failed' });
    }
});
/**
 * Export IOCs as STIX
 */
app.post('/api/ioc/export/stix', async (req, res) => {
    try {
        const { iocIds } = req.body;
        if (!Array.isArray(iocIds)) {
            return res.status(400).json({ error: 'iocIds must be an array' });
        }
        const stix = await iocService.exportToSTIX(iocIds);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="iocs.stix.json"');
        res.send(stix);
    }
    catch (error) {
        console.error('Error exporting STIX:', error);
        res.status(500).json({ error: 'STIX export failed' });
    }
});
/**
 * Generate IOC heatmap
 */
app.post('/api/ioc/heatmap', async (req, res) => {
    try {
        const { bbox, types, resolution } = req.body;
        if (!bbox) {
            return res.status(400).json({ error: 'bbox required' });
        }
        const result = await iocService.generateIOCHeatmap(bbox, { types, resolution });
        res.json(result);
    }
    catch (error) {
        console.error('Error generating heatmap:', error);
        res.status(500).json({ error: 'Heatmap generation failed' });
    }
});
// ============================================================================
// Intelligence Reports Routes
// ============================================================================
/**
 * Ingest intelligence report
 */
app.post('/api/intel/report', async (req, res) => {
    try {
        const result = await fusionService.ingestReport(req.body);
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Error ingesting report:', error);
        res.status(500).json({ error: 'Failed to ingest report' });
    }
});
/**
 * Fuse GEOINT with CTI
 */
app.post('/api/intel/fuse-geoint-cti', async (req, res) => {
    try {
        const { satelliteAnalysisId, reportIds, region } = req.body;
        if (!reportIds || !region) {
            return res.status(400).json({ error: 'reportIds and region required' });
        }
        const result = await fusionService.fuseGEOINTwithCTI({
            satelliteAnalysisId,
            reportIds,
            region,
        });
        res.json(result);
    }
    catch (error) {
        console.error('Error fusing GEOINT with CTI:', error);
        res.status(500).json({ error: 'GEOINT-CTI fusion failed' });
    }
});
// ============================================================================
// Metrics & Performance Routes
// ============================================================================
/**
 * Get query performance statistics
 */
app.get('/api/metrics/query-stats', async (req, res) => {
    try {
        const stats = await repository.getQueryStats();
        res.json({
            ...stats,
            target: {
                p95LatencyMs: config.queryTimeoutMs,
                status: stats.p95Latency < config.queryTimeoutMs ? 'MEETING_TARGET' : 'ABOVE_TARGET',
            },
        });
    }
    catch (error) {
        console.error('Error getting query stats:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});
/**
 * Clear query cache
 */
app.post('/api/admin/clear-cache', (req, res) => {
    repository.clearCache();
    res.json({ status: 'cache_cleared' });
});
// ============================================================================
// Error Handling
// ============================================================================
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});
// ============================================================================
// Startup
// ============================================================================
async function start() {
    try {
        // Initialize database indexes
        console.log('Initializing Neo4j indexes...');
        await repository.initializeIndexes();
        // Register default 3D visualization agents
        await geointService.registerAgent({
            id: 'viewshed-agent-1',
            name: 'Viewshed Analyzer',
            type: 'VIEWSHED_ANALYZER',
            status: 'READY',
            capabilities: ['viewshed', 'visibility_analysis'],
            configuration: {
                maxPoints: 1000000,
                cacheEnabled: true,
                gpuAccelerated: false,
            },
            metrics: {
                processedPoints: 0,
                averageLatency: 0,
                cacheHitRate: 0,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        await geointService.registerAgent({
            id: 'los-agent-1',
            name: 'Line of Sight Analyzer',
            type: 'LINE_OF_SIGHT',
            status: 'READY',
            capabilities: ['line_of_sight', 'intervisibility'],
            configuration: {
                cacheEnabled: true,
            },
            metrics: {
                processedPoints: 0,
                averageLatency: 0,
                cacheHitRate: 0,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        await geointService.registerAgent({
            id: 'terrain-agent-1',
            name: 'Terrain Mesh Renderer',
            type: 'TERRAIN_RENDERER',
            status: 'READY',
            capabilities: ['terrain_mesh', '3d_visualization'],
            configuration: {
                maxPoints: 5000000,
                lodLevels: 5,
                textureResolution: 4096,
                cacheEnabled: true,
                gpuAccelerated: true,
            },
            metrics: {
                processedPoints: 0,
                averageLatency: 0,
                cacheHitRate: 0,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        // Start server
        app.listen(config.port, () => {
            console.log(`GEOINT Threat Platform running on port ${config.port}`);
            console.log(`Health check: http://localhost:${config.port}/health`);
            console.log(`Query p95 target: <${config.queryTimeoutMs}ms`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    await repository.close();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await repository.close();
    process.exit(0);
});
start();
