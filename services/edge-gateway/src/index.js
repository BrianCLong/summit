"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const pino_1 = require("pino");
const pino_http_1 = __importDefault(require("pino-http"));
const http_proxy_middleware_1 = require("http-proxy-middleware");
const auth_1 = require("./middleware/auth");
const metrics_1 = require("./middleware/metrics");
const logger = (0, pino_1.pino)({ name: 'edge-gateway' });
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);
// Logging
app.use((0, pino_http_1.default)({ logger }));
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Metrics collection
app.use(metrics_1.metricsMiddleware);
// Health check (no auth required)
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
// Apply authentication to all /api routes
app.use('/api', auth_1.authMiddleware);
// Proxy to edge orchestrator
app.use('/api/orchestrator', (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: process.env.ORCHESTRATOR_URL || 'http://localhost:8080',
    changeOrigin: true,
    pathRewrite: {
        '^/api/orchestrator': '/api'
    },
    onError: (err, req, res) => {
        logger.error({ err }, 'Proxy error');
        res.status(502).json({
            error: 'Bad Gateway',
            message: 'Failed to connect to orchestrator service'
        });
    }
}));
// WebSocket support for real-time updates
app.use('/ws', (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: process.env.ORCHESTRATOR_URL || 'http://localhost:8080',
    changeOrigin: true,
    ws: true
}));
// Error handling
app.use((err, req, res, next) => {
    logger.error({ err, path: req.path }, 'Unhandled error');
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.path
    });
});
// Start server
const server = app.listen(port, () => {
    logger.info({ port }, 'Edge gateway service started');
});
// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});
exports.default = app;
