"use strict";
/**
 * Copilot Service Server
 *
 * Main entry point for the AI Copilot NL → Cypher/SQL service.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const pino_1 = require("pino");
const CopilotService_js_1 = require("./CopilotService.js");
const LlmAdapter_js_1 = require("./LlmAdapter.js");
const SafetyAnalyzer_js_1 = require("./SafetyAnalyzer.js");
const repositories_js_1 = require("./repositories.js");
const routes_js_1 = require("./routes.js");
// =============================================================================
// Logger
// =============================================================================
const logger = (0, pino_1.pino)({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
});
// =============================================================================
// Create Express App
// =============================================================================
function createApp() {
    const app = (0, express_1.default)();
    // Security middleware
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
    }));
    // Body parsing
    app.use(express_1.default.json({ limit: '1mb' }));
    // Request logging
    app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            logger.info({
                method: req.method,
                path: req.path,
                status: res.statusCode,
                duration: Date.now() - start,
            });
        });
        next();
    });
    // Initialize service dependencies
    const llmAdapter = new LlmAdapter_js_1.MockLlmAdapter();
    const safetyAnalyzer = new SafetyAnalyzer_js_1.SafetyAnalyzer();
    const draftRepository = new repositories_js_1.InMemoryDraftQueryRepository();
    const auditLog = new repositories_js_1.InMemoryAuditLog();
    const policyEngine = new CopilotService_js_1.StubPolicyEngine();
    const queryExecutor = new CopilotService_js_1.MockQueryExecutor();
    // Create copilot service
    const copilotService = new CopilotService_js_1.CopilotService(llmAdapter, safetyAnalyzer, draftRepository, auditLog, policyEngine, queryExecutor, {
        defaultDialect: 'CYPHER',
        draftExpirationMs: 30 * 60 * 1000, // 30 minutes
        maxDraftsPerUser: 20,
        requireConfirmation: true,
        allowSafetyOverride: true,
        privilegedRoles: ['ADMIN', 'SUPERVISOR', 'LEAD'],
    });
    // Create router with context resolvers
    const copilotRouter = (0, routes_js_1.createCopilotRouter)({
        copilotService,
        getUser: routes_js_1.createDefaultUserContext,
        getSchema: (0, routes_js_1.createDefaultSchemaResolver)(),
        getPolicy: (0, routes_js_1.createDefaultPolicyResolver)(),
    });
    // Mount routes
    app.use('/copilot', copilotRouter);
    // Root health check
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            service: 'copilot',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
        });
    });
    // 404 handler
    app.use((req, res) => {
        res.status(404).json({
            error: {
                code: 'NOT_FOUND',
                message: `Route not found: ${req.method} ${req.path}`,
            },
        });
    });
    // Global error handler
    app.use((error, req, res, next) => {
        logger.error({ error: error.message, stack: error.stack }, 'Unhandled error');
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: process.env.NODE_ENV === 'production'
                    ? 'An unexpected error occurred'
                    : error.message,
            },
        });
    });
    return app;
}
// =============================================================================
// Start Server
// =============================================================================
const PORT = parseInt(process.env.PORT || '8003', 10);
const HOST = process.env.HOST || '0.0.0.0';
const app = createApp();
app.listen(PORT, HOST, () => {
    logger.info(`Copilot service listening on ${HOST}:${PORT}`);
    logger.info('Endpoints:');
    logger.info(`  POST ${HOST}:${PORT}/copilot/preview  - Generate draft query`);
    logger.info(`  POST ${HOST}:${PORT}/copilot/execute  - Execute confirmed draft`);
    logger.info(`  GET  ${HOST}:${PORT}/copilot/draft/:id - Get draft by ID`);
    logger.info(`  GET  ${HOST}:${PORT}/copilot/drafts   - Get user's drafts`);
    logger.info(`  DELETE ${HOST}:${PORT}/copilot/draft/:id - Delete draft`);
    logger.info(`  GET  ${HOST}:${PORT}/copilot/health   - Health check`);
});
