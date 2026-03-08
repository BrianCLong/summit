"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = require("express-rate-limit");
const compression_1 = __importDefault(require("compression"));
const pg_1 = require("pg");
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const redis_1 = require("redis");
const GraphAnalyticsService_1 = require("./services/GraphAnalyticsService");
const NetworkVisualizationService_1 = require("./services/NetworkVisualizationService");
const logger_1 = require("./utils/logger");
const config_1 = require("./config");
const auth_1 = require("./middleware/auth");
const geoPoints_1 = require("./data/geoPoints");
const app = (0, express_1.default)();
exports.app = app;
const PORT = config_1.config.server.port || 4006;
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: config_1.config.server.allowedOrigins,
    credentials: true,
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // More restrictive for compute-intensive operations
    message: 'Too many requests from this IP, please try again later',
});
app.use('/api/', limiter);
// Body parsing middleware
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
const parseBbox = (bbox) => {
    const parts = bbox.split(',').map((value) => Number(value));
    if (parts.length !== 4 || parts.some((value) => Number.isNaN(value))) {
        return null;
    }
    const [minLng, minLat, maxLng, maxLat] = parts;
    if (minLng > maxLng || minLat > maxLat) {
        return null;
    }
    return [minLng, minLat, maxLng, maxLat];
};
const sortGeoPoints = (points) => points
    .slice()
    .sort((a, b) => {
    const timeDiff = new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime();
    if (timeDiff !== 0) {
        return timeDiff;
    }
    return a.id.localeCompare(b.id);
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'graph-analytics',
        version: process.env.npm_package_version || '1.0.0',
    });
});
// Geo endpoint for map overlays
app.get(['/geo/points', '/api/geo/points'], auth_1.authenticate, (0, auth_1.authorize)(['user', 'admin']), (req, res) => {
    const { bbox, limit } = req.query;
    if (!bbox || typeof bbox !== 'string') {
        return res.status(400).json({
            error: 'bbox query param is required as minLng,minLat,maxLng,maxLat',
        });
    }
    const parsedBbox = parseBbox(bbox);
    if (!parsedBbox) {
        return res
            .status(400)
            .json({ error: 'Invalid bbox format. Expected minLng,minLat,maxLng,maxLat' });
    }
    const [minLng, minLat, maxLng, maxLat] = parsedBbox;
    const filteredPoints = geoPoints_1.geoPoints.filter((point) => point.lng >= minLng &&
        point.lng <= maxLng &&
        point.lat >= minLat &&
        point.lat <= maxLat);
    const parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : undefined;
    const limitCap = Number.isFinite(parsedLimit) && parsedLimit && parsedLimit > 0
        ? Math.min(parsedLimit, 500)
        : 250;
    const orderedPoints = filteredPoints
        .slice()
        .sort((a, b) => {
        const timeDiff = new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime();
        if (timeDiff !== 0) {
            return timeDiff;
        }
        const latDiff = a.lat - b.lat;
        if (latDiff !== 0) {
            return latDiff;
        }
        const lngDiff = a.lng - b.lng;
        if (lngDiff !== 0) {
            return lngDiff;
        }
        return a.id.localeCompare(b.id);
    });
    res.json({
        count: filteredPoints.length,
        orderedBy: 'observedAt desc, lat asc, lng asc, id asc',
        points: orderedPoints.slice(0, limitCap),
    });
});
// Database connections
let pgPool;
let neo4jDriver;
let redisClient;
let graphAnalyticsService;
let networkVisualizationService;
async function initializeServices() {
    try {
        // PostgreSQL connection
        pgPool = new pg_1.Pool({
            host: config_1.config.database.postgres.host,
            port: config_1.config.database.postgres.port,
            user: config_1.config.database.postgres.user,
            password: config_1.config.database.postgres.password,
            database: config_1.config.database.postgres.database,
            ssl: config_1.config.database.postgres.ssl,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        // Test PostgreSQL connection
        await pgPool.query('SELECT NOW()');
        logger_1.logger.info('PostgreSQL connected successfully');
        // Neo4j connection
        neo4jDriver = neo4j_driver_1.default.driver(config_1.config.database.neo4j.uri, neo4j_driver_1.default.auth.basic(config_1.config.database.neo4j.user, config_1.config.database.neo4j.password));
        // Test Neo4j connection
        const session = neo4jDriver.session();
        await session.run('RETURN 1');
        await session.close();
        logger_1.logger.info('Neo4j connected successfully');
        // Redis connection
        redisClient = (0, redis_1.createClient)({
            socket: {
                host: config_1.config.redis.host,
                port: config_1.config.redis.port,
            },
            password: config_1.config.redis.password,
            database: config_1.config.redis.db,
        });
        await redisClient.connect();
        logger_1.logger.info('Redis connected successfully');
        // Initialize services
        graphAnalyticsService = new GraphAnalyticsService_1.GraphAnalyticsService(neo4jDriver, pgPool, redisClient);
        networkVisualizationService = new NetworkVisualizationService_1.NetworkVisualizationService(neo4jDriver);
        logger_1.logger.info('Graph analytics services initialized successfully');
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize services:', error);
        process.exit(1);
    }
}
// Authentication middleware
app.use('/api', auth_1.authenticate);
// Network Structure Analysis
app.post('/api/analysis/network-structure', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { filters } = req.body;
        const analysis = await graphAnalyticsService.analyzeNetworkStructure(filters);
        res.json(analysis);
    }
    catch (error) {
        logger_1.logger.error('Error analyzing network structure:', error);
        res.status(500).json({ error: 'Failed to analyze network structure' });
    }
});
// Path Analysis
app.post('/api/analysis/paths', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { sourceId, targetId, options } = req.body;
        if (!sourceId || !targetId) {
            return res
                .status(400)
                .json({ error: 'Source and target IDs are required' });
        }
        const pathAnalysis = await graphAnalyticsService.findShortestPaths(sourceId, targetId, options);
        res.json(pathAnalysis);
    }
    catch (error) {
        logger_1.logger.error('Error analyzing paths:', error);
        res.status(500).json({ error: 'Failed to analyze paths' });
    }
});
// Influence Analysis
app.post('/api/analysis/influence', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { nodeId, depth, relationshipTypes } = req.body;
        if (!nodeId) {
            return res.status(400).json({ error: 'Node ID is required' });
        }
        const influenceAnalysis = await graphAnalyticsService.analyzeInfluence(nodeId, depth || 3, relationshipTypes);
        res.json(influenceAnalysis);
    }
    catch (error) {
        logger_1.logger.error('Error analyzing influence:', error);
        res.status(500).json({ error: 'Failed to analyze influence' });
    }
});
// Anomaly Detection
app.post('/api/analysis/anomalies', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { options } = req.body;
        const anomalies = await graphAnalyticsService.detectAnomalies(options);
        res.json({ anomalies });
    }
    catch (error) {
        logger_1.logger.error('Error detecting anomalies:', error);
        res.status(500).json({ error: 'Failed to detect anomalies' });
    }
});
// Pattern Discovery
app.post('/api/analysis/patterns', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { patternTemplates } = req.body;
        if (!Array.isArray(patternTemplates) || patternTemplates.length === 0) {
            return res
                .status(400)
                .json({ error: 'Pattern templates are required' });
        }
        const patterns = await graphAnalyticsService.findPatterns(patternTemplates);
        res.json({ patterns });
    }
    catch (error) {
        logger_1.logger.error('Error finding patterns:', error);
        res.status(500).json({ error: 'Failed to find patterns' });
    }
});
// Built-in pattern templates
app.get('/api/analysis/pattern-templates', (0, auth_1.authorize)(['user', 'admin']), (req, res) => {
    const builtInPatterns = [
        {
            name: 'Star Pattern',
            description: 'Central node with multiple direct connections',
            cypherPattern: 'MATCH path = (center)-[r]-(connected) WHERE size((center)--()) > 5 RETURN path',
        },
        {
            name: 'Chain Pattern',
            description: 'Linear sequence of connected nodes',
            cypherPattern: 'MATCH path = (a)-[r1]-(b)-[r2]-(c)-[r3]-(d) WHERE NOT (a)--(c) AND NOT (b)--(d) RETURN path',
        },
        {
            name: 'Triangle Pattern',
            description: 'Three nodes forming a complete triangle',
            cypherPattern: 'MATCH path = (a)-[r1]-(b)-[r2]-(c)-[r3]-(a) RETURN path',
        },
        {
            name: 'Bridge Pattern',
            description: 'Node connecting two otherwise disconnected components',
            cypherPattern: 'MATCH (bridge)-[r1]-(group1), (bridge)-[r2]-(group2) WHERE NOT (group1)-->(group2) RETURN bridge, group1, group2',
        },
        {
            name: 'Clique Pattern',
            description: 'Fully connected subgraph of 4+ nodes',
            cypherPattern: 'MATCH (a)--(b), (b)--(c), (c)--(d), (d)--(a), (a)--(c), (b)--(d) RETURN a, b, c, d',
        },
    ];
    res.json({ patterns: builtInPatterns });
});
// Temporal Analysis
app.post('/api/analysis/temporal', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { timeframe, intervals } = req.body;
        if (!timeframe || !timeframe.start || !timeframe.end) {
            return res
                .status(400)
                .json({ error: 'Timeframe with start and end dates is required' });
        }
        const temporalAnalysis = await graphAnalyticsService.analyzeTemporalEvolution({
            start: new Date(timeframe.start),
            end: new Date(timeframe.end),
        }, intervals || 10);
        res.json(temporalAnalysis);
    }
    catch (error) {
        logger_1.logger.error('Error analyzing temporal evolution:', error);
        res.status(500).json({ error: 'Failed to analyze temporal evolution' });
    }
});
// Network Visualization Generation
app.post('/api/visualization/generate', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { query, parameters, config } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Cypher query is required' });
        }
        const visualization = await networkVisualizationService.generateVisualization(query, parameters || {}, config || {});
        res.json(visualization);
    }
    catch (error) {
        logger_1.logger.error('Error generating visualization:', error);
        res.status(500).json({ error: 'Failed to generate visualization' });
    }
});
// Pre-built Visualization Types
app.post('/api/visualization/subnet', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { centerNodeId, depth, config } = req.body;
        if (!centerNodeId) {
            return res.status(400).json({ error: 'Center node ID is required' });
        }
        const visualization = await networkVisualizationService.generateSubnetVisualization(centerNodeId, depth || 2, config || {});
        res.json(visualization);
    }
    catch (error) {
        logger_1.logger.error('Error generating subnet visualization:', error);
        res
            .status(500)
            .json({ error: 'Failed to generate subnet visualization' });
    }
});
app.post('/api/visualization/community', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { communityIds, config } = req.body;
        if (!Array.isArray(communityIds) || communityIds.length === 0) {
            return res.status(400).json({ error: 'Community IDs are required' });
        }
        const visualization = await networkVisualizationService.generateCommunityVisualization(communityIds, config || {});
        res.json(visualization);
    }
    catch (error) {
        logger_1.logger.error('Error generating community visualization:', error);
        res
            .status(500)
            .json({ error: 'Failed to generate community visualization' });
    }
});
app.post('/api/visualization/path', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { sourceId, targetId, pathType, config } = req.body;
        if (!sourceId || !targetId) {
            return res
                .status(400)
                .json({ error: 'Source and target IDs are required' });
        }
        const visualization = await networkVisualizationService.generatePathVisualization(sourceId, targetId, pathType || 'shortest', config || {});
        res.json(visualization);
    }
    catch (error) {
        logger_1.logger.error('Error generating path visualization:', error);
        res.status(500).json({ error: 'Failed to generate path visualization' });
    }
});
app.post('/api/visualization/timeline', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { timeRange, config } = req.body;
        if (!timeRange || !timeRange.start || !timeRange.end) {
            return res
                .status(400)
                .json({ error: 'Time range with start and end is required' });
        }
        const visualization = await networkVisualizationService.generateTimelineVisualization({
            start: new Date(timeRange.start),
            end: new Date(timeRange.end),
        }, config || {});
        res.json(visualization);
    }
    catch (error) {
        logger_1.logger.error('Error generating timeline visualization:', error);
        res
            .status(500)
            .json({ error: 'Failed to generate timeline visualization' });
    }
});
// Visualization Export
app.post('/api/visualization/export', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { visualization, format } = req.body;
        if (!visualization || !format) {
            return res
                .status(400)
                .json({ error: 'Visualization data and format are required' });
        }
        const exportData = await networkVisualizationService.exportVisualization(visualization, format);
        const contentTypes = {
            cytoscape: 'application/json',
            gephi: 'application/xml',
            graphml: 'application/xml',
            json: 'application/json',
        };
        const extensions = {
            cytoscape: 'json',
            gephi: 'gexf',
            graphml: 'graphml',
            json: 'json',
        };
        res.setHeader('Content-Type', contentTypes[format] || 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="network.${extensions[format]}"`);
        res.send(exportData);
    }
    catch (error) {
        logger_1.logger.error('Error exporting visualization:', error);
        res.status(500).json({ error: 'Failed to export visualization' });
    }
});
// Advanced Analytics Endpoints
app.post('/api/analysis/centrality', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { algorithm, filters } = req.body;
        // This would implement specific centrality algorithms
        res
            .status(501)
            .json({ error: 'Centrality analysis not implemented yet' });
    }
    catch (error) {
        logger_1.logger.error('Error calculating centrality:', error);
        res.status(500).json({ error: 'Failed to calculate centrality' });
    }
});
app.post('/api/analysis/community-detection', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { algorithm, parameters } = req.body;
        // This would implement community detection algorithms
        res
            .status(501)
            .json({ error: 'Community detection not implemented yet' });
    }
    catch (error) {
        logger_1.logger.error('Error detecting communities:', error);
        res.status(500).json({ error: 'Failed to detect communities' });
    }
});
app.post('/api/analysis/motifs', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { motifSize, filters } = req.body;
        // This would implement network motif detection
        res.status(501).json({ error: 'Motif detection not implemented yet' });
    }
    catch (error) {
        logger_1.logger.error('Error detecting motifs:', error);
        res.status(500).json({ error: 'Failed to detect motifs' });
    }
});
// Real-time Graph Updates
app.get('/api/updates/stream', (0, auth_1.authorize)(['user', 'admin']), (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
    });
    // Send initial connection
    res.write(`data: {"type": "connected", "timestamp": "${new Date().toISOString()}"}\n\n`);
    // Set up interval for periodic updates
    const interval = setInterval(() => {
        res.write(`data: {"type": "heartbeat", "timestamp": "${new Date().toISOString()}"}\n\n`);
    }, 30000);
    // Clean up on client disconnect
    req.on('close', () => {
        clearInterval(interval);
    });
});
// Graph Metrics Summary
app.get('/api/metrics/summary', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const session = neo4jDriver.session();
        try {
            const metricsQuery = `
        MATCH (n)
        OPTIONAL MATCH (n)-[r]-(m)
        RETURN 
          count(distinct n) as nodeCount,
          count(distinct r) as relationshipCount,
          count(distinct labels(n)) as labelCount,
          count(distinct type(r)) as relationshipTypeCount
      `;
            const result = await session.run(metricsQuery);
            const record = result.records[0];
            const summary = {
                nodes: record.get('nodeCount').toNumber(),
                relationships: record.get('relationshipCount').toNumber(),
                labels: record.get('labelCount').toNumber(),
                relationshipTypes: record.get('relationshipTypeCount').toNumber(),
                density: 0, // Would calculate based on actual network
                avgDegree: 0, // Would calculate
                components: 1, // Would calculate
                generatedAt: new Date().toISOString(),
            };
            res.json(summary);
        }
        finally {
            await session.close();
        }
    }
    catch (error) {
        logger_1.logger.error('Error getting graph metrics summary:', error);
        res.status(500).json({ error: 'Failed to get graph metrics summary' });
    }
});
// Error handling middleware
app.use((error, req, res, next) => {
    logger_1.logger.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
});
// 404 handler
app.use('/{*path}', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.originalUrl,
    });
});
// Start server
async function startServer() {
    try {
        await initializeServices();
        const server = app.listen(PORT, () => {
            logger_1.logger.info(`Graph Analytics Engine server running on port ${PORT}`);
            logger_1.logger.info(`Health check: http://localhost:${PORT}/health`);
        });
        // Graceful shutdown
        process.on('SIGTERM', async () => {
            logger_1.logger.info('SIGTERM received, shutting down gracefully');
            server.close(async () => {
                await pgPool.end();
                await neo4jDriver.close();
                await redisClient.quit();
                logger_1.logger.info('Server closed');
                process.exit(0);
            });
        });
        process.on('SIGINT', async () => {
            logger_1.logger.info('SIGINT received, shutting down gracefully');
            server.close(async () => {
                await pgPool.end();
                await neo4jDriver.close();
                await redisClient.quit();
                logger_1.logger.info('Server closed');
                process.exit(0);
            });
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Check if this module is the entry point (ESM-compatible)
const isMainModule = import.meta.url.endsWith(process.argv[1] ?? '') ||
    process.argv[1]?.includes('server.ts') ||
    process.argv[1]?.includes('server.js');
if (isMainModule) {
    startServer();
}
