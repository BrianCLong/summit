"use strict";
/**
 * Scenario Engine Service
 *
 * What-If & Counterfactual Modeling for IntelGraph
 *
 * Features:
 * - Sandbox scenario copies of graphs/cases
 * - What-if tools (remove/add edges, delay events, change parameters)
 * - Isolated from production data
 * - Impact metrics computation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const index_js_1 = require("./middleware/index.js");
const index_js_2 = require("./routes/index.js");
const index_js_3 = require("./services/index.js");
const DEFAULT_CONFIG = {
    port: 3500,
    maxScenariosPerTenant: 100,
    defaultRetentionDays: 30,
    enableAutoCleanup: true,
};
function createApp(config = {}) {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    const app = (0, express_1.default)();
    // Initialize store
    const store = new index_js_3.ScenarioStore(mergedConfig.sourceProvider, {
        maxScenariosPerTenant: mergedConfig.maxScenariosPerTenant,
        defaultRetentionDays: mergedConfig.defaultRetentionDays,
        enableAutoCleanup: mergedConfig.enableAutoCleanup,
    });
    // Middleware
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(index_js_1.correlationId);
    // Health endpoints (no auth required)
    app.get('/health', (_req, res) => {
        res.json({
            status: 'healthy',
            service: 'scenario-engine',
            timestamp: new Date().toISOString(),
            environment: 'non-production',
        });
    });
    app.get('/health/ready', (_req, res) => {
        res.json({
            ready: true,
            service: 'scenario-engine',
        });
    });
    app.get('/health/live', (_req, res) => {
        res.json({
            alive: true,
            service: 'scenario-engine',
        });
    });
    // Metrics endpoint
    app.get('/metrics', (_req, res) => {
        const stats = store.getStats();
        res.json({
            scenarios_total: stats.totalScenarios,
            scenarios_by_status: stats.byStatus,
            scenarios_by_mode: stats.byMode,
            scenarios_by_tenant: stats.byTenant,
        });
    });
    // API routes (require tenant)
    const apiRouter = express_1.default.Router();
    apiRouter.use(index_js_1.tenantGuard);
    // Mount route handlers
    apiRouter.use('/scenarios', (0, index_js_2.createScenarioRoutes)(store));
    apiRouter.use('/whatif', (0, index_js_2.createWhatIfRoutes)(store));
    apiRouter.use('/analytics', (0, index_js_2.createAnalyticsRoutes)(store));
    app.use('/api/v1', apiRouter);
    // Error handling
    app.use((err, _req, res, _next) => {
        console.error('Unhandled error:', err);
        res.status(500).json({
            error: 'Internal server error',
            message: err.message,
        });
    });
    // 404 handler
    app.use((_req, res) => {
        res.status(404).json({
            error: 'Not found',
            message: 'The requested endpoint does not exist',
        });
    });
    return { app, store };
}
// Start server if run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
    const port = parseInt(process.env.PORT || '3500', 10);
    const { app, store } = createApp({ port });
    const server = app.listen(port, () => {
        console.log(`🚀 Scenario Engine Service running on port ${port}`);
        console.log(`   Environment: non-production (sandbox mode only)`);
        console.log(`   Health: http://localhost:${port}/health`);
        console.log(`   API: http://localhost:${port}/api/v1`);
    });
    // Graceful shutdown
    const shutdown = () => {
        console.log('Shutting down Scenario Engine Service...');
        store.shutdown();
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}
exports.default = createApp;
// Re-export types and services for library usage
__exportStar(require("./types/index.js"), exports);
__exportStar(require("./services/index.js"), exports);
