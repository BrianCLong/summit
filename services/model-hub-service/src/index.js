"use strict";
/**
 * Model Hub Service
 *
 * Centralized model registry, routing, and governance for LLMs, embeddings,
 * and classifiers in the IntelGraph platform.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const logger_js_1 = require("./utils/logger.js");
const connection_js_1 = require("./db/connection.js");
const migrations_js_1 = require("./db/migrations.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const models_js_1 = require("./routes/models.js");
const routing_js_1 = require("./routes/routing.js");
const governance_js_1 = require("./routes/governance.js");
const app = (0, express_1.default)();
exports.app = app;
// Middleware
app.use(express_1.default.json({ limit: '10mb' }));
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'model-hub-service',
        timestamp: new Date().toISOString(),
    });
});
// Health check with database status
app.get('/health/detailed', async (req, res) => {
    const dbHealth = await connection_js_1.db.healthCheck();
    res.json({
        status: dbHealth.status === 'healthy' ? 'healthy' : 'degraded',
        service: 'model-hub-service',
        timestamp: new Date().toISOString(),
        components: {
            database: dbHealth,
        },
    });
});
// API Routes
app.use('/api/v1/models', models_js_1.modelsRouter);
app.use('/api/v1/routing', routing_js_1.routingRouter);
app.use('/api/v1/governance', governance_js_1.governanceRouter);
// Error handler
app.use(errorHandler_js_1.errorHandler);
// Start server
async function start() {
    const PORT = parseInt(process.env.MODEL_HUB_PORT || '3010');
    try {
        // Connect to database
        await connection_js_1.db.connect();
        // Run migrations
        await (0, migrations_js_1.runMigrations)();
        app.listen(PORT, () => {
            logger_js_1.logger.info({
                message: 'Model Hub Service started',
                port: PORT,
                environment: process.env.NODE_ENV || 'development',
            });
        });
    }
    catch (error) {
        logger_js_1.logger.error({
            message: 'Failed to start Model Hub Service',
            error: error instanceof Error ? error.message : String(error),
        });
        process.exit(1);
    }
}
// Handle shutdown
process.on('SIGTERM', async () => {
    logger_js_1.logger.info('Received SIGTERM, shutting down...');
    await connection_js_1.db.close();
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger_js_1.logger.info('Received SIGINT, shutting down...');
    await connection_js_1.db.close();
    process.exit(0);
});
// Start if main module
start();
