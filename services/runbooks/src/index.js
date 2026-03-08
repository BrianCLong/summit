"use strict";
/**
 * Runbook Orchestration Service
 *
 * HTTP service that wraps the runbook engine and provides
 * REST API for runbook management and execution.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const runbook_engine_1 = require("@intelgraph/runbook-engine");
// Configuration from environment
const PORT = parseInt(process.env.PORT || '4000', 10);
const OPA_ENDPOINT = process.env.OPA_ENDPOINT || 'http://localhost:8181';
const MAX_CONCURRENT_STEPS = parseInt(process.env.MAX_CONCURRENT_STEPS || '10', 10);
const MAX_EXECUTION_TIME_MS = parseInt(process.env.MAX_EXECUTION_TIME_MS || '3600000', 10);
const RATE_LIMIT_PER_TENANT = parseInt(process.env.RATE_LIMIT_PER_TENANT || '100', 10);
const USE_MOCK_AUTHZ = process.env.USE_MOCK_AUTHZ === 'true';
async function main() {
    console.log('Starting Runbook Orchestration Service...');
    // Initialize authz client
    const authzClient = USE_MOCK_AUTHZ
        ? new runbook_engine_1.MockAuthzClient()
        : new runbook_engine_1.OPAAuthzClient(OPA_ENDPOINT);
    console.log(`Using ${USE_MOCK_AUTHZ ? 'mock' : 'OPA'} authz client (${OPA_ENDPOINT})`);
    const authzMiddleware = new runbook_engine_1.AuthzMiddleware(authzClient);
    // Initialize safety validator
    const safetyValidator = new runbook_engine_1.SafetyValidator({
        ...runbook_engine_1.DEFAULT_SAFETY_CONFIG,
        maxConcurrentSteps: MAX_CONCURRENT_STEPS,
        maxExecutionTimeMs: MAX_EXECUTION_TIME_MS,
        rateLimitPerTenant: RATE_LIMIT_PER_TENANT,
    });
    // Initialize resource tracker
    const resourceTracker = new runbook_engine_1.TenantResourceTracker();
    // Initialize engine
    const engine = new runbook_engine_1.RunbookEngine({
        maxConcurrentSteps: MAX_CONCURRENT_STEPS,
        defaultRetryPolicy: {
            maxAttempts: 3,
            initialDelayMs: 1000,
            maxDelayMs: 10000,
            backoffMultiplier: 2,
        },
        storageBackend: 'memory', // TODO: Use PostgreSQL in production
        detailedLogging: true,
    });
    // Register built-in executors
    engine.registerExecutor(new runbook_engine_1.ConditionalExecutor());
    engine.registerExecutor(new runbook_engine_1.LoopExecutor());
    engine.registerExecutor(new runbook_engine_1.ApprovalExecutor());
    engine.registerExecutor(new runbook_engine_1.EventWaitExecutor());
    engine.registerExecutor(new runbook_engine_1.ServiceCallExecutor());
    console.log('Registered 5 built-in executors');
    // Initialize Express app
    const app = (0, express_1.default)();
    app.use(express_1.default.json({ limit: '10mb' }));
    // Request logging
    app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
        });
        next();
    });
    // Mount runbook API
    app.use('/api/v1', (0, runbook_engine_1.createRunbookAPI)(engine));
    // Root endpoint
    app.get('/', (req, res) => {
        res.json({
            service: 'runbook-orchestration',
            version: '1.0.0',
            status: 'running',
            endpoints: {
                health: '/api/v1/health',
                runbooks: '/api/v1/runbooks',
                executions: '/api/v1/executions',
            },
        });
    });
    // Error handler
    app.use((err, req, res, next) => {
        console.error('Unhandled error:', err);
        res.status(500).json({
            error: 'Internal server error',
            message: err.message,
        });
    });
    // Start server
    const server = app.listen(PORT, () => {
        console.log(`Runbook Orchestration Service listening on port ${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
    });
    // Graceful shutdown
    const shutdown = async () => {
        console.log('Shutting down gracefully...');
        server.close(() => {
            console.log('HTTP server closed');
            process.exit(0);
        });
        // Force shutdown after 30 seconds
        setTimeout(() => {
            console.error('Forced shutdown after timeout');
            process.exit(1);
        }, 30000);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
