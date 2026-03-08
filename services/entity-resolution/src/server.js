"use strict";
/**
 * Entity Resolution Service - HTTP Server
 *
 * Express server entry point
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
const ErService_js_1 = require("./services/ErService.js");
const InMemoryRepositories_js_1 = require("./repositories/InMemoryRepositories.js");
const classifier_js_1 = require("./matching/classifier.js");
const routes_js_1 = require("./api/routes.js");
// Logger
const logger = (0, pino_1.default)({ name: 'entity-resolution-service' });
// Create Express app
const app = (0, express_1.default)();
// Middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use((0, pino_http_1.default)({
    logger,
    customLogLevel: (req, res, err) => {
        if (res.statusCode >= 500 || err)
            return 'error';
        if (res.statusCode >= 400)
            return 'warn';
        return 'info';
    },
}));
// Initialize repositories (in-memory for now)
const entityRepo = new InMemoryRepositories_js_1.InMemoryEntityRecordRepository();
const decisionRepo = new InMemoryRepositories_js_1.InMemoryMatchDecisionRepository();
const mergeRepo = new InMemoryRepositories_js_1.InMemoryMergeOperationRepository();
// Initialize ER service
const erService = new ErService_js_1.ErService(entityRepo, decisionRepo, mergeRepo, classifier_js_1.DEFAULT_CONFIG);
// Mount API routes
app.use('/er', (0, routes_js_1.createApiRouter)(erService));
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'Entity Resolution Service',
        version: '1.0.0',
        endpoints: {
            health: 'GET /er/health',
            compare: 'POST /er/compare',
            batchCandidates: 'POST /er/batch-candidates',
            merge: 'POST /er/merge',
            split: 'POST /er/split',
            getDecision: 'GET /er/decisions/:id',
            getMergeHistory: 'GET /er/merge-history/:recordId',
        },
    });
});
// Error handler
app.use((err, req, res, next) => {
    logger.error({ err, req: req.url }, 'Unhandled error');
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
    });
});
// Start server
const PORT = process.env.PORT || 3100;
app.listen(PORT, () => {
    logger.info(`Entity Resolution Service listening on port ${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/er/health`);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});
process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});
