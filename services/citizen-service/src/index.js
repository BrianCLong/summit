"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const pino_1 = __importDefault(require("pino"));
const citizen_js_1 = __importDefault(require("./routes/citizen.js"));
const health_js_1 = require("./middleware/health.js");
const metrics_js_1 = require("./middleware/metrics.js");
const security_js_1 = require("./middleware/security.js");
const cors_js_1 = require("./middleware/cors.js");
const CacheService_js_1 = require("./services/CacheService.js");
const logger = (0, pino_1.default)({
    name: 'citizen-service',
    level: process.env.LOG_LEVEL || 'info',
});
const app = (0, express_1.default)();
exports.app = app;
const PORT = process.env.PORT || 4010;
// Security middleware (before parsing)
app.use(cors_js_1.corsMiddleware);
app.use(security_js_1.securityHeaders);
app.use(security_js_1.requestId);
// Body parsing
app.use(express_1.default.json({ limit: '1mb' }));
app.use(security_js_1.sanitizeInput);
// Rate limiting for API routes
app.use('/api', security_js_1.rateLimitMiddleware);
// Metrics
app.use(metrics_js_1.metricsMiddleware);
// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        logger.info({
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: Date.now() - start,
            requestId: res.getHeader('X-Request-ID'),
        });
    });
    next();
});
// Health routes (no rate limiting)
app.use((0, health_js_1.createHealthRouter)());
// Prometheus metrics endpoint
app.get('/metrics', (_req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send(metrics_js_1.metricsCollector.getPrometheusMetrics());
});
// JSON metrics endpoint
app.get('/metrics/json', (_req, res) => {
    res.json(metrics_js_1.metricsCollector.getMetrics());
});
// API routes
app.use('/api/v1', citizen_js_1.default);
// 404 handler
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});
// Error handler
app.use((err, _req, res, _next) => {
    logger.error({ err }, 'Unhandled error');
    res.status(500).json({ error: 'Internal server error' });
});
// Graceful shutdown
async function shutdown(signal) {
    logger.info({ signal }, 'Shutting down gracefully');
    try {
        await CacheService_js_1.cacheService.disconnect();
        logger.info('Cache disconnected');
    }
    catch (error) {
        logger.error({ error }, 'Error during shutdown');
    }
    process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
// Start server
async function start() {
    try {
        // Connect to cache (optional, continues without it)
        await CacheService_js_1.cacheService.connect();
        app.listen(PORT, () => {
            logger.info(`Citizen Service running on port ${PORT}`);
            logger.info('Real-time citizen-centric service automation enabled');
            logger.info({
                endpoints: {
                    health: '/health',
                    healthLive: '/health/live',
                    healthReady: '/health/ready',
                    metrics: '/metrics',
                    api: '/api/v1',
                },
            });
        });
    }
    catch (error) {
        logger.error({ error }, 'Failed to start service');
        process.exit(1);
    }
}
// Only start if not in test mode
if (process.env.NODE_ENV !== 'test') {
    start();
}
