"use strict";
/**
 * CompanyOS Service Template - Main Entry Point
 * Implements D2: Paved Road Template v2
 *
 * Pre-wired with:
 * - OPA authorization
 * - Tenant context
 * - Metrics collection
 * - Health endpoints
 * - Rate limiting
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const config_js_1 = require("./config.js");
const logger_js_1 = require("./utils/logger.js");
const auth_js_1 = require("./middleware/auth.js");
const tenant_js_1 = require("./middleware/tenant.js");
const metrics_js_1 = require("./middleware/metrics.js");
const health_js_1 = require("./routes/health.js");
const example_js_1 = require("./routes/example.js");
// Create Express app
const app = (0, express_1.default)();
exports.app = app;
// ============================================================================
// MIDDLEWARE STACK
// ============================================================================
// JSON parsing
app.use(express_1.default.json());
// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        logger_js_1.logger.info('Request completed', {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: Date.now() - start,
            tenantId: req.tenantContext?.tenantId,
        });
    });
    next();
});
// Metrics collection
app.use(metrics_js_1.metricsMiddleware);
// Health endpoints (no auth required)
app.use('/health', health_js_1.healthRoutes);
// Metrics endpoint (no auth required in dev)
app.get('/metrics', metrics_js_1.metricsHandler);
// ============================================================================
// PROTECTED ROUTES
// ============================================================================
// Authentication & tenant context
app.use(auth_js_1.authMiddleware);
app.use(tenant_js_1.tenantMiddleware);
// Application routes
app.use('/api/v1', example_js_1.exampleRoutes);
// ============================================================================
// ERROR HANDLING
// ============================================================================
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        path: req.path,
    });
});
// Global error handler
app.use((err, req, res, _next) => {
    logger_js_1.logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
    });
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});
// ============================================================================
// SERVER STARTUP
// ============================================================================
const PORT = config_js_1.config.port;
app.listen(PORT, () => {
    logger_js_1.logger.info('Server started', {
        port: PORT,
        environment: config_js_1.config.nodeEnv,
        opaUrl: config_js_1.config.opaUrl,
    });
});
