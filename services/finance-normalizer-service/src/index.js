"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const logger_js_1 = require("./utils/logger.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const requestLogger_js_1 = require("./middleware/requestLogger.js");
const rateLimiter_js_1 = require("./middleware/rateLimiter.js");
const tenant_js_1 = require("./middleware/tenant.js");
const import_js_1 = require("./routes/import.js");
const transactions_js_1 = require("./routes/transactions.js");
const flows_js_1 = require("./routes/flows.js");
const parties_js_1 = require("./routes/parties.js");
const accounts_js_1 = require("./routes/accounts.js");
const health_js_1 = require("./routes/health.js");
const db_js_1 = require("./utils/db.js");
const PORT = parseInt(process.env.PORT || '4200', 10);
const HOST = process.env.HOST || '0.0.0.0';
function createApp() {
    const app = (0, express_1.default)();
    // Security middleware
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: process.env.NODE_ENV === 'production',
    }));
    // CORS configuration
    app.use((0, cors_1.default)({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }));
    // Compression
    app.use((0, compression_1.default)());
    // Body parsing
    app.use(express_1.default.json({ limit: '50mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
    // Request logging
    app.use(requestLogger_js_1.requestLogger);
    // Health check routes (no auth required)
    app.use('/health', health_js_1.healthRoutes);
    // Rate limiting
    app.use(rateLimiter_js_1.rateLimiter);
    // Tenant extraction
    app.use(tenant_js_1.tenantMiddleware);
    // API routes
    app.use('/api/v1/import', import_js_1.importRoutes);
    app.use('/api/v1/transactions', transactions_js_1.transactionRoutes);
    app.use('/api/v1/flows', flows_js_1.flowRoutes);
    app.use('/api/v1/parties', parties_js_1.partyRoutes);
    app.use('/api/v1/accounts', accounts_js_1.accountRoutes);
    // 404 handler
    app.use((_req, res) => {
        res.status(404).json({ error: 'Not found' });
    });
    // Error handler
    app.use(errorHandler_js_1.errorHandler);
    return app;
}
async function main() {
    logger_js_1.logger.info('Starting Finance Normalizer Service...');
    // Verify database connection
    try {
        await db_js_1.db.query('SELECT 1');
        logger_js_1.logger.info('Database connection established');
    }
    catch (error) {
        logger_js_1.logger.error('Failed to connect to database', { error });
        process.exit(1);
    }
    const app = createApp();
    app.listen(PORT, HOST, () => {
        logger_js_1.logger.info(`Finance Normalizer Service listening on ${HOST}:${PORT}`);
        logger_js_1.logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    // Graceful shutdown
    const shutdown = async (signal) => {
        logger_js_1.logger.info(`Received ${signal}, shutting down gracefully...`);
        await db_js_1.db.end();
        process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
main().catch((error) => {
    logger_js_1.logger.error('Fatal error during startup', { error });
    process.exit(1);
});
