"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const logger_js_1 = require("./utils/logger.js");
const talents_js_1 = require("./routes/talents.js");
const PORT = parseInt(process.env.TALENT_MAGNET_PORT || '4050', 10);
const HOST = process.env.TALENT_MAGNET_HOST || '0.0.0.0';
const app = (0, express_1.default)();
exports.app = app;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
// Health endpoints
app.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        service: 'talent-magnet',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});
app.get('/health/ready', (_req, res) => {
    res.json({ status: 'ready' });
});
app.get('/health/live', (_req, res) => {
    res.json({ status: 'live' });
});
// API routes
app.use('/api/v1/talents', talents_js_1.talentRouter);
// Root endpoint
app.get('/', (_req, res) => {
    res.json({
        service: 'Global Talent Magnet AI',
        description: 'Recognize talent signals, offer personalized incentives, and accelerate onboarding',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            talents: '/api/v1/talents',
            match: '/api/v1/talents/match',
            stats: '/api/v1/talents/stats/summary',
        },
    });
});
// Error handler
app.use((err, _req, res, _next) => {
    logger_js_1.logger.error({ err }, 'Unhandled error');
    res.status(500).json({
        ok: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});
// 404 handler
app.use((_req, res) => {
    res.status(404).json({ ok: false, error: 'Not found' });
});
// Start server
const server = app.listen(PORT, HOST, () => {
    logger_js_1.logger.info({ port: PORT, host: HOST }, 'Global Talent Magnet AI service started');
});
// Graceful shutdown
const shutdown = () => {
    logger_js_1.logger.info('Shutting down...');
    server.close(() => {
        logger_js_1.logger.info('Server closed');
        process.exit(0);
    });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
