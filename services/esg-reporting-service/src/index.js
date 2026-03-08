"use strict";
/**
 * ESG Reporting Service
 * Main entry point for the ESG metrics tracking and automated reporting service
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const logger_js_1 = require("./utils/logger.js");
const database_js_1 = require("./utils/database.js");
const SchedulerService_js_1 = require("./services/SchedulerService.js");
const reports_js_1 = __importDefault(require("./routes/reports.js"));
const schedules_js_1 = __importDefault(require("./routes/schedules.js"));
const frameworks_js_1 = __importDefault(require("./routes/frameworks.js"));
const app = (0, express_1.default)();
exports.app = app;
const PORT = parseInt(process.env.PORT || '3450', 10);
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger_js_1.logger.info({
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration,
        });
    });
    next();
});
// ============================================================================
// Health Check Endpoints
// ============================================================================
app.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        service: 'esg-reporting-service',
        version: process.env.npm_package_version || '1.0.0',
        timestamp: new Date().toISOString(),
    });
});
app.get('/health/ready', async (_req, res) => {
    try {
        // Check database connectivity
        await database_js_1.db.query('SELECT 1');
        res.json({
            ready: true,
            checks: {
                database: 'ok',
            },
        });
    }
    catch (error) {
        res.status(503).json({
            ready: false,
            checks: {
                database: 'failed',
            },
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
app.get('/health/live', (_req, res) => {
    res.json({ live: true });
});
// ============================================================================
// API Routes
// ============================================================================
app.use('/api/v1/reports', reports_js_1.default);
app.use('/api/v1/schedules', schedules_js_1.default);
app.use('/api/v1/frameworks', frameworks_js_1.default);
// ============================================================================
// Error Handling
// ============================================================================
// 404 handler
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});
// Global error handler
app.use((err, _req, res, _next) => {
    logger_js_1.logger.error({ error: err }, 'Unhandled error');
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});
// ============================================================================
// Server Startup
// ============================================================================
async function start() {
    try {
        // Connect to database
        logger_js_1.logger.info('Connecting to database...');
        await database_js_1.db.connect();
        // Initialize scheduler
        logger_js_1.logger.info('Initializing report scheduler...');
        await SchedulerService_js_1.schedulerService.initialize();
        // Start server
        app.listen(PORT, () => {
            logger_js_1.logger.info({ port: PORT }, 'ESG Reporting Service started');
            logger_js_1.logger.info('Available endpoints:');
            logger_js_1.logger.info('  GET  /health - Health check');
            logger_js_1.logger.info('  GET  /health/ready - Readiness check');
            logger_js_1.logger.info('  GET  /health/live - Liveness check');
            logger_js_1.logger.info('  POST /api/v1/reports - Create report');
            logger_js_1.logger.info('  GET  /api/v1/reports - List reports');
            logger_js_1.logger.info('  GET  /api/v1/reports/:id - Get report');
            logger_js_1.logger.info('  PATCH /api/v1/reports/:id - Update report');
            logger_js_1.logger.info('  DELETE /api/v1/reports/:id - Delete report');
            logger_js_1.logger.info('  POST /api/v1/reports/:id/metrics - Add metric');
            logger_js_1.logger.info('  GET  /api/v1/reports/:id/metrics - Get metrics');
            logger_js_1.logger.info('  POST /api/v1/reports/:id/export - Export report');
            logger_js_1.logger.info('  POST /api/v1/schedules - Create schedule');
            logger_js_1.logger.info('  GET  /api/v1/schedules - List schedules');
            logger_js_1.logger.info('  GET  /api/v1/frameworks - List frameworks');
        });
    }
    catch (error) {
        logger_js_1.logger.error({ error }, 'Failed to start service');
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger_js_1.logger.info('SIGTERM received, shutting down...');
    SchedulerService_js_1.schedulerService.shutdown();
    await database_js_1.db.disconnect();
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger_js_1.logger.info('SIGINT received, shutting down...');
    SchedulerService_js_1.schedulerService.shutdown();
    await database_js_1.db.disconnect();
    process.exit(0);
});
// Start the service
start();
