"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
// @ts-nocheck - Express v5 type compatibility issues with middleware
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const pino_http_1 = __importDefault(require("pino-http"));
const config_js_1 = require("./config.js");
const logger_js_1 = require("./utils/logger.js");
const database_js_1 = require("./db/database.js");
const metrics_js_1 = require("./utils/metrics.js");
const approval_service_js_1 = require("./services/approval-service.js");
const approvals_js_1 = __importDefault(require("./routes/approvals.js"));
const health_js_1 = __importDefault(require("./routes/health.js"));
const app = (0, express_1.default)();
exports.app = app;
// ============================================================================
// Middleware
// ============================================================================
// Security headers
app.use((0, helmet_1.default)());
// Compression
app.use((0, compression_1.default)());
// CORS
app.use((0, cors_1.default)({
    origin: config_js_1.config.nodeEnv === 'production' ? false : '*',
    credentials: true,
}));
// Body parsing
app.use(express_1.default.json({ limit: '1mb' }));
// Request logging
app.use((0, pino_http_1.default)({
    logger: logger_js_1.logger,
    autoLogging: {
        ignore: (req) => req.url === '/health' || req.url === '/health/live',
    },
}));
// ============================================================================
// Routes
// ============================================================================
// Health endpoints (no auth required)
app.use('/health', health_js_1.default);
// Metrics endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', metrics_js_1.registry.contentType);
    res.end(await metrics_js_1.registry.metrics());
});
// API routes
app.use('/api/v1', approvals_js_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
    });
});
// Global error handler
app.use((err, req, res, next) => {
    logger_js_1.logger.error({ err, path: req.path }, 'Unhandled error');
    res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
    });
});
// ============================================================================
// Startup
// ============================================================================
async function start() {
    try {
        // Connect to database
        await database_js_1.db.connect();
        logger_js_1.logger.info('Database connected');
        // Start expiration job (every 5 minutes)
        setInterval(async () => {
            try {
                await approval_service_js_1.approvalService.expireStaleRequests();
            }
            catch (err) {
                logger_js_1.logger.error({ err }, 'Failed to expire stale requests');
            }
        }, 5 * 60 * 1000);
        // Start server
        app.listen(config_js_1.config.port, () => {
            logger_js_1.logger.info({
                port: config_js_1.config.port,
                env: config_js_1.config.nodeEnv,
                features: config_js_1.config.features,
            }, `Approvals service listening on port ${config_js_1.config.port}`);
        });
    }
    catch (err) {
        logger_js_1.logger.error({ err }, 'Failed to start service');
        process.exit(1);
    }
}
// ============================================================================
// Graceful Shutdown
// ============================================================================
async function shutdown(signal) {
    logger_js_1.logger.info({ signal }, 'Shutdown signal received');
    try {
        await database_js_1.db.disconnect();
        logger_js_1.logger.info('Database disconnected');
    }
    catch (err) {
        logger_js_1.logger.error({ err }, 'Error during shutdown');
    }
    process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
// Start the service
start();
