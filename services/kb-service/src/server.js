"use strict";
// @ts-nocheck
/**
 * KB Service API Server
 * Knowledge Base service for documentation, runbooks, SOPs, and contextual help
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const index_js_1 = require("./routes/index.js");
const index_js_2 = require("./middleware/index.js");
const connection_js_1 = require("./db/connection.js");
const app = (0, express_1.default)();
const PORT = parseInt(process.env.KB_SERVICE_PORT || '3200', 10);
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
}));
// Request processing
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Logging
app.use(index_js_2.requestLogger);
// Health checks
app.get('/health', async (_req, res) => {
    res.json({
        status: 'healthy',
        service: 'kb-service',
        timestamp: new Date().toISOString(),
    });
});
app.get('/health/ready', async (_req, res) => {
    try {
        const dbHealthy = await (0, connection_js_1.healthCheck)();
        if (dbHealthy) {
            res.json({
                status: 'ready',
                service: 'kb-service',
                database: 'connected',
                timestamp: new Date().toISOString(),
            });
        }
        else {
            res.status(503).json({
                status: 'not_ready',
                service: 'kb-service',
                database: 'disconnected',
                timestamp: new Date().toISOString(),
            });
        }
    }
    catch (error) {
        res.status(503).json({
            status: 'not_ready',
            service: 'kb-service',
            database: 'error',
            timestamp: new Date().toISOString(),
        });
    }
});
app.get('/health/live', (_req, res) => {
    res.json({
        status: 'alive',
        service: 'kb-service',
        timestamp: new Date().toISOString(),
    });
});
// API Routes
app.use('/api/v1/kb/articles', index_js_1.articleRouter);
app.use('/api/v1/kb', index_js_1.helpRouter);
app.use('/api/v1/kb/admin', index_js_1.adminRouter);
// Error handling
app.use(index_js_2.notFoundHandler);
app.use(index_js_2.errorHandler);
// Graceful shutdown
async function shutdown(signal) {
    index_js_2.logger.info({ signal }, 'Received shutdown signal');
    try {
        await (0, connection_js_1.closePool)();
        index_js_2.logger.info('Database connections closed');
        process.exit(0);
    }
    catch (error) {
        index_js_2.logger.error({ error }, 'Error during shutdown');
        process.exit(1);
    }
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
// Start server
const server = app.listen(PORT, () => {
    index_js_2.logger.info({ port: PORT }, 'KB Service started');
});
exports.server = server;
// Handle server errors
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        index_js_2.logger.error({ port: PORT }, 'Port already in use');
    }
    else {
        index_js_2.logger.error({ error }, 'Server error');
    }
    process.exit(1);
});
exports.default = app;
