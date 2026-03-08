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
const DashboardService_1 = require("./services/DashboardService");
const ChartService_1 = require("./services/ChartService");
const logger_1 = require("./utils/logger");
const config_1 = require("./config");
const auth_1 = require("./middleware/auth");
const app = (0, express_1.default)();
exports.app = app;
const PORT = config_1.config.server.port || 4004;
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: config_1.config.server.allowedOrigins,
    credentials: true,
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later',
});
app.use('/api/', limiter);
// Body parsing middleware
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'analytics-engine',
        version: process.env.npm_package_version || '1.0.0',
    });
});
// Database connections
let pgPool;
let neo4jDriver;
let redisClient;
let dashboardService;
let chartService;
const DASHBOARD_SORT_FIELDS = ['name', 'created_at', 'updated_at'];
const normalizeSortBy = (value) => {
    if (typeof value === 'string' &&
        DASHBOARD_SORT_FIELDS.includes(value)) {
        return value;
    }
    return 'updated_at';
};
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
        dashboardService = new DashboardService_1.DashboardService(pgPool, neo4jDriver, redisClient);
        chartService = new ChartService_1.ChartService(pgPool, neo4jDriver);
        logger_1.logger.info('Analytics services initialized successfully');
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize services:', error);
        process.exit(1);
    }
}
// Authentication middleware
app.use('/api', auth_1.authenticate);
// Dashboard API Routes
app.post('/api/dashboards', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const authReq = req;
        const userId = authReq.user.id;
        const dashboard = await dashboardService.createDashboard(req.body, userId);
        res.status(201).json(dashboard);
    }
    catch (error) {
        logger_1.logger.error('Error creating dashboard:', error);
        res.status(500).json({ error: 'Failed to create dashboard' });
    }
});
app.get('/api/dashboards', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const authReq = req;
        const { page = '1', limit = '20', search, tags, sortBy = 'updated_at', sortOrder = 'desc', } = req.query;
        const parsedLimit = parseInt(limit, 10);
        const parsedPage = parseInt(page, 10);
        const normalizedSortBy = normalizeSortBy(sortBy);
        const normalizedSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
        const options = {
            limit: parsedLimit,
            offset: (parsedPage - 1) * parsedLimit,
            search: typeof search === 'string' ? search : undefined,
            tags: typeof tags === 'string' ? tags.split(',') : undefined,
            sortBy: normalizedSortBy,
            sortOrder: normalizedSortOrder,
        };
        const result = await dashboardService.listDashboards(authReq.user.id, options);
        res.json({
            dashboards: result.dashboards,
            pagination: {
                total: result.total,
                page: parsedPage,
                limit: parsedLimit,
                pages: Math.ceil(result.total / parsedLimit),
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Error listing dashboards:', error);
        res.status(500).json({ error: 'Failed to list dashboards' });
    }
});
app.get('/api/dashboards/:id', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const authReq = req;
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const dashboard = await dashboardService.getDashboard(id, authReq.user.id);
        if (!dashboard) {
            return res.status(404).json({ error: 'Dashboard not found' });
        }
        res.json(dashboard);
    }
    catch (error) {
        logger_1.logger.error('Error getting dashboard:', error);
        res.status(500).json({ error: 'Failed to get dashboard' });
    }
});
app.put('/api/dashboards/:id', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const authReq = req;
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const dashboard = await dashboardService.updateDashboard(id, req.body, authReq.user.id);
        res.json(dashboard);
    }
    catch (error) {
        logger_1.logger.error('Error updating dashboard:', error);
        res.status(500).json({ error: 'Failed to update dashboard' });
    }
});
app.delete('/api/dashboards/:id', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const authReq = req;
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await dashboardService.deleteDashboard(id, authReq.user.id);
        res.status(204).send();
    }
    catch (error) {
        logger_1.logger.error('Error deleting dashboard:', error);
        res.status(500).json({ error: 'Failed to delete dashboard' });
    }
});
// Widget data endpoint
app.get('/api/widgets/:id/data', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const authReq = req;
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const data = await dashboardService.getWidgetData(id, authReq.user.id);
        res.json({ data, timestamp: new Date().toISOString() });
    }
    catch (error) {
        logger_1.logger.error('Error getting widget data:', error);
        res.status(500).json({ error: 'Failed to get widget data' });
    }
});
// Chart generation endpoints
app.post('/api/charts/generate', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const chartData = await chartService.generateChartData(req.body);
        res.json(chartData);
    }
    catch (error) {
        logger_1.logger.error('Error generating chart:', error);
        res.status(500).json({ error: 'Failed to generate chart' });
    }
});
// Predefined chart endpoints
app.get('/api/charts/entity-growth', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { start, end } = req.query;
        const timeRange = {
            start: new Date(start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
            end: new Date(end || new Date()),
        };
        const chartData = await chartService.getEntityGrowthChart(timeRange);
        res.json(chartData);
    }
    catch (error) {
        logger_1.logger.error('Error getting entity growth chart:', error);
        res.status(500).json({ error: 'Failed to generate entity growth chart' });
    }
});
app.get('/api/charts/entity-types', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const chartData = await chartService.getEntityTypeDistribution();
        res.json(chartData);
    }
    catch (error) {
        logger_1.logger.error('Error getting entity type distribution:', error);
        res
            .status(500)
            .json({ error: 'Failed to generate entity type distribution' });
    }
});
app.get('/api/charts/case-status', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const chartData = await chartService.getCaseStatusComparison();
        res.json(chartData);
    }
    catch (error) {
        logger_1.logger.error('Error getting case status comparison:', error);
        res
            .status(500)
            .json({ error: 'Failed to generate case status comparison' });
    }
});
app.get('/api/charts/activity-heatmap', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { days = '30' } = req.query;
        const heatmapData = await chartService.getActivityHeatmapData(parseInt(days));
        res.json(heatmapData);
    }
    catch (error) {
        logger_1.logger.error('Error getting activity heatmap:', error);
        res.status(500).json({ error: 'Failed to generate activity heatmap' });
    }
});
// Dashboard templates endpoints
app.get('/api/dashboard-templates', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const { category } = req.query;
        const templates = await dashboardService.getDashboardTemplates(category);
        res.json(templates);
    }
    catch (error) {
        logger_1.logger.error('Error getting dashboard templates:', error);
        res.status(500).json({ error: 'Failed to get dashboard templates' });
    }
});
app.post('/api/dashboard-templates/:id/create', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const authReq = req;
        const { name, customizations } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Dashboard name is required' });
        }
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const dashboard = await dashboardService.createDashboardFromTemplate(id, name, authReq.user.id, customizations);
        res.status(201).json(dashboard);
    }
    catch (error) {
        logger_1.logger.error('Error creating dashboard from template:', error);
        res
            .status(500)
            .json({ error: 'Failed to create dashboard from template' });
    }
});
// Analytics insights endpoints
app.get('/api/insights/overview', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const authReq = req;
        const insights = await generateOverviewInsights(authReq.user.id);
        res.json(insights);
    }
    catch (error) {
        logger_1.logger.error('Error generating overview insights:', error);
        res.status(500).json({ error: 'Failed to generate insights' });
    }
});
app.get('/api/insights/trends', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const authReq = req;
        const { period = '7d' } = req.query;
        const trends = await generateTrendInsights(authReq.user.id, period);
        res.json(trends);
    }
    catch (error) {
        logger_1.logger.error('Error generating trend insights:', error);
        res.status(500).json({ error: 'Failed to generate trend insights' });
    }
});
// Export endpoints
app.post('/api/dashboards/:id/export', (0, auth_1.authorize)(['user', 'admin']), async (req, res) => {
    try {
        const authReq = req;
        const { format = 'json' } = req.body;
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const dashboard = await dashboardService.getDashboard(id, authReq.user.id);
        if (!dashboard) {
            return res.status(404).json({ error: 'Dashboard not found' });
        }
        if (format === 'json') {
            res.json(dashboard);
        }
        else if (format === 'pdf') {
            // TODO: Implement PDF export
            res.status(501).json({ error: 'PDF export not implemented yet' });
        }
        else {
            res.status(400).json({ error: 'Unsupported export format' });
        }
    }
    catch (error) {
        logger_1.logger.error('Error exporting dashboard:', error);
        res.status(500).json({ error: 'Failed to export dashboard' });
    }
});
// Helper functions for insights
async function generateOverviewInsights(userId) {
    const queries = [
        'SELECT COUNT(*) as total_entities FROM entities',
        'SELECT COUNT(*) as total_cases FROM cases',
        'SELECT COUNT(*) as total_relationships FROM relationships',
        'SELECT COUNT(*) as total_dashboards FROM dashboards WHERE created_by = $1',
    ];
    const results = await Promise.all([
        pgPool.query(queries[0]),
        pgPool.query(queries[1]),
        pgPool.query(queries[2]),
        pgPool.query(queries[3], [userId]),
    ]);
    return {
        totalEntities: parseInt(results[0].rows[0].total_entities),
        totalCases: parseInt(results[1].rows[0].total_cases),
        totalRelationships: parseInt(results[2].rows[0].total_relationships),
        totalDashboards: parseInt(results[3].rows[0].total_dashboards),
        generatedAt: new Date(),
    };
}
async function generateTrendInsights(userId, period) {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const query = `
    SELECT 
      DATE_TRUNC('day', created_at) as date,
      'entities' as type,
      COUNT(*) as count
    FROM entities 
    WHERE created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY DATE_TRUNC('day', created_at)
    
    UNION ALL
    
    SELECT 
      DATE_TRUNC('day', created_at) as date,
      'cases' as type,
      COUNT(*) as count
    FROM cases 
    WHERE created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY DATE_TRUNC('day', created_at)
    
    ORDER BY date DESC
  `;
    const result = await pgPool.query(query);
    return {
        trends: result.rows,
        period,
        generatedAt: new Date(),
    };
}
// Error handling middleware
app.use((error, req, res, next) => {
    logger_1.logger.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
});
// 404 handler
app.use('*', (req, res) => {
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
            logger_1.logger.info(`Analytics Engine server running on port ${PORT}`);
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
if (require.main === module) {
    startServer();
}
