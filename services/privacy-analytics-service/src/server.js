"use strict";
// @ts-nocheck
/**
 * Privacy-Preserving Analytics Service - Main Server
 *
 * Provides REST API endpoints for privacy-preserving aggregate queries
 * with differential privacy, k-anonymity, and policy-based access control.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = require("express-rate-limit");
const uuid_1 = require("uuid");
const logger_js_1 = require("./utils/logger.js");
const config_js_1 = require("./utils/config.js");
const connections_js_1 = require("./db/connections.js");
const QueryExecutor_js_1 = require("./query/QueryExecutor.js");
const GovernanceClient_js_1 = require("./governance/GovernanceClient.js");
const PredefinedMetrics_js_1 = require("./metrics/PredefinedMetrics.js");
const index_js_1 = require("./types/index.js");
// ============================================================================
// Application Setup
// ============================================================================
const app = (0, express_1.default)();
exports.app = app;
const PORT = config_js_1.config.server.port;
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
        },
    },
}));
app.use((0, cors_1.default)({
    origin: config_js_1.config.server.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Tenant-ID'],
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: config_js_1.config.server.rateLimitWindowMs,
    max: config_js_1.config.server.rateLimitMaxRequests,
    message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);
// Body parsing
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging middleware
app.use((req, res, next) => {
    const requestId = req.headers['x-request-id'] || (0, uuid_1.v4)();
    req.headers['x-request-id'] = requestId;
    const startTime = Date.now();
    res.on('finish', () => {
        logger_js_1.logger.info({
            requestId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            durationMs: Date.now() - startTime,
            userAgent: req.headers['user-agent'],
        });
    });
    next();
});
// ============================================================================
// Service Instances
// ============================================================================
let queryExecutor;
let governanceClient;
// ============================================================================
// Authentication Middleware (simplified - integrate with your auth system)
// ============================================================================
function authenticate(req, res, next) {
    // In production, validate JWT token and extract user info
    const authHeader = req.headers.authorization;
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
        res.status(401).json({
            error: 'Unauthorized',
            message: 'X-Tenant-ID header is required',
        });
        return;
    }
    // Simplified auth - in production, validate token and extract claims
    req.user = {
        id: req.headers['x-user-id'] || 'anonymous',
        tenantId,
        roles: (req.headers['x-user-roles'] || 'user').split(','),
    };
    next();
}
function authorize(requiredRoles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        if (requiredRoles.length === 0) {
            next();
            return;
        }
        const hasRole = requiredRoles.some(role => req.user.roles.includes(role));
        if (!hasRole) {
            res.status(403).json({
                error: 'Forbidden',
                message: `Required roles: ${requiredRoles.join(', ')}`,
            });
            return;
        }
        next();
    };
}
// ============================================================================
// Health Endpoints
// ============================================================================
app.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        service: 'privacy-analytics-service',
        version: process.env.npm_package_version || '1.0.0',
        timestamp: new Date().toISOString(),
    });
});
app.get('/health/ready', async (_req, res) => {
    try {
        const dbHealth = await connections_js_1.db.checkHealth();
        const govHealth = await governanceClient.checkHealth();
        const isReady = dbHealth.postgres === 'healthy';
        res.status(isReady ? 200 : 503).json({
            status: isReady ? 'ready' : 'not_ready',
            checks: {
                database: dbHealth,
                governance: govHealth,
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        res.status(503).json({
            status: 'not_ready',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
app.get('/health/live', (_req, res) => {
    res.json({ status: 'alive', timestamp: new Date().toISOString() });
});
// ============================================================================
// Metrics Endpoint (Prometheus format)
// ============================================================================
app.get('/metrics', (_req, res) => {
    const budgetStates = queryExecutor?.getAllBudgetStates() || [];
    const metrics = `
# HELP privacy_analytics_requests_total Total number of analytics requests
# TYPE privacy_analytics_requests_total counter
privacy_analytics_requests_total{service="privacy-analytics"} 0

# HELP privacy_analytics_up Service health status
# TYPE privacy_analytics_up gauge
privacy_analytics_up{service="privacy-analytics"} 1

# HELP privacy_budget_spent_epsilon Total epsilon budget spent per tenant
# TYPE privacy_budget_spent_epsilon gauge
${budgetStates.map(b => `privacy_budget_spent_epsilon{tenant="${b.tenantId}"} ${b.spentBudget}`).join('\n')}

# HELP privacy_budget_remaining_epsilon Remaining epsilon budget per tenant
# TYPE privacy_budget_remaining_epsilon gauge
${budgetStates.map(b => `privacy_budget_remaining_epsilon{tenant="${b.tenantId}"} ${b.totalBudget - b.spentBudget}`).join('\n')}

# HELP privacy_queries_count Total queries per tenant
# TYPE privacy_queries_count counter
${budgetStates.map(b => `privacy_queries_count{tenant="${b.tenantId}"} ${b.queryCount}`).join('\n')}
`.trim();
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(metrics);
});
// ============================================================================
// API Endpoints
// ============================================================================
// Apply authentication to all API routes
app.use('/api', authenticate);
/**
 * POST /api/v1/aggregate
 * Execute a privacy-preserving aggregate query
 */
app.post('/api/v1/aggregate', authorize(['user', 'analyst', 'admin']), async (req, res) => {
    const requestId = req.headers['x-request-id'];
    try {
        // Validate request body
        const parseResult = index_js_1.AggregateQuerySchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({
                error: 'Invalid query',
                details: parseResult.error.errors.map(e => ({
                    path: e.path.join('.'),
                    message: e.message,
                })),
            });
            return;
        }
        const query = parseResult.data;
        // Build execution context with governance
        const context = await governanceClient.buildExecutionContext(req.user.tenantId, req.user.id, req.user.roles, query, req.body.useCase);
        context.executionId = requestId;
        // Execute query
        const result = await queryExecutor.execute(query, context);
        // Return result
        res.status(result.status === 'success' || result.status === 'partial' ? 200 :
            result.status === 'suppressed' ? 200 :
                result.status === 'denied' ? 403 : 500).json(result);
    }
    catch (error) {
        logger_js_1.logger.error({ requestId, error }, 'Aggregate query failed');
        res.status(500).json({
            error: 'Query execution failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            requestId,
        });
    }
});
/**
 * GET /api/v1/metrics
 * List available predefined metrics
 */
app.get('/api/v1/metrics', authorize([]), async (req, res) => {
    try {
        const metrics = PredefinedMetrics_js_1.predefinedMetrics.getByRoles(req.user.roles);
        res.json({
            metrics: metrics.map(m => ({
                id: m.id,
                name: m.name,
                description: m.description,
                category: m.category,
                refreshInterval: m.refreshInterval,
                requiredRoles: m.requiredRoles,
            })),
            total: metrics.length,
        });
    }
    catch (error) {
        logger_js_1.logger.error({ error }, 'Failed to list metrics');
        res.status(500).json({ error: 'Failed to list metrics' });
    }
});
/**
 * GET /api/v1/metrics/:id
 * Execute a predefined metric
 */
app.get('/api/v1/metrics/:id', authorize([]), async (req, res) => {
    const requestId = req.headers['x-request-id'];
    const metricId = req.params.id;
    try {
        const metric = PredefinedMetrics_js_1.predefinedMetrics.get(metricId);
        if (!metric) {
            res.status(404).json({
                error: 'Metric not found',
                metricId,
            });
            return;
        }
        // Check role access
        if (metric.requiredRoles.length > 0) {
            const hasAccess = metric.requiredRoles.some(r => req.user.roles.includes(r));
            if (!hasAccess) {
                res.status(403).json({
                    error: 'Forbidden',
                    message: `Required roles: ${metric.requiredRoles.join(', ')}`,
                });
                return;
            }
        }
        // Check cache
        if (metric.cacheable) {
            const cached = await connections_js_1.db.cacheGet(`metric:${metricId}:${req.user.tenantId}`);
            if (cached) {
                res.json({
                    ...cached,
                    cached: true,
                });
                return;
            }
        }
        // Build context with embedded policy
        const policies = [];
        if (metric.embeddedPolicy) {
            policies.push({
                id: `embedded-${metricId}`,
                name: `Embedded policy for ${metric.name}`,
                description: 'Embedded privacy policy',
                enabled: true,
                mechanism: metric.embeddedPolicy.mechanism,
                kAnonymity: metric.embeddedPolicy.kAnonymity,
                differentialPrivacy: metric.embeddedPolicy.differentialPrivacy,
                suppression: metric.embeddedPolicy.suppression,
                applicableSources: [metric.query.source],
                priority: 200, // High priority for embedded policies
                auditLevel: 'summary',
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }
        const context = {
            executionId: requestId,
            tenantId: req.user.tenantId,
            userId: req.user.id,
            roles: req.user.roles,
            policies,
            timestamp: new Date(),
            metadata: { metricId },
        };
        // Execute metric query
        const result = await queryExecutor.execute(metric.query, context);
        const response = {
            metric: {
                id: metric.id,
                name: metric.name,
                description: metric.description,
                category: metric.category,
            },
            result,
            cached: false,
        };
        // Cache result
        if (metric.cacheable && (result.status === 'success' || result.status === 'partial')) {
            await connections_js_1.db.cacheSet(`metric:${metricId}:${req.user.tenantId}`, response, metric.cacheTtl || 300);
        }
        res.json(response);
    }
    catch (error) {
        logger_js_1.logger.error({ requestId, metricId, error }, 'Metric execution failed');
        res.status(500).json({
            error: 'Metric execution failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            requestId,
        });
    }
});
/**
 * GET /api/v1/budget
 * Get privacy budget status for current tenant/user
 */
app.get('/api/v1/budget', authorize(['user', 'analyst', 'admin']), async (req, res) => {
    try {
        const budgetState = queryExecutor.getBudgetState(req.user.tenantId, req.user.id);
        res.json({
            tenantId: budgetState.tenantId,
            userId: budgetState.userId,
            budget: {
                total: budgetState.totalBudget,
                spent: budgetState.spentBudget,
                remaining: budgetState.totalBudget - budgetState.spentBudget,
                utilizationPercent: ((budgetState.spentBudget / budgetState.totalBudget) * 100).toFixed(2),
            },
            queries: {
                count: budgetState.queryCount,
            },
            period: {
                start: budgetState.periodStart,
                end: budgetState.periodEnd,
            },
        });
    }
    catch (error) {
        logger_js_1.logger.error({ error }, 'Failed to get budget status');
        res.status(500).json({ error: 'Failed to get budget status' });
    }
});
/**
 * GET /api/v1/audit
 * Get privacy audit log (admin only)
 */
app.get('/api/v1/audit', authorize(['admin', 'security']), async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
        const tenantFilter = req.query.tenantId;
        // Non-admins can only see their own tenant's audit log
        const effectiveTenantId = req.user.roles.includes('admin')
            ? tenantFilter
            : req.user.tenantId;
        const auditLog = queryExecutor.getAuditLog(effectiveTenantId, limit);
        res.json({
            records: auditLog,
            total: auditLog.length,
            limit,
        });
    }
    catch (error) {
        logger_js_1.logger.error({ error }, 'Failed to get audit log');
        res.status(500).json({ error: 'Failed to get audit log' });
    }
});
/**
 * GET /api/v1/admin/budgets
 * Get all privacy budget states (admin only)
 */
app.get('/api/v1/admin/budgets', authorize(['admin']), async (_req, res) => {
    try {
        const budgetStates = queryExecutor.getAllBudgetStates();
        res.json({
            budgets: budgetStates.map(b => ({
                tenantId: b.tenantId,
                userId: b.userId,
                total: b.totalBudget,
                spent: b.spentBudget,
                remaining: b.totalBudget - b.spentBudget,
                queryCount: b.queryCount,
                periodStart: b.periodStart,
                periodEnd: b.periodEnd,
            })),
            total: budgetStates.length,
        });
    }
    catch (error) {
        logger_js_1.logger.error({ error }, 'Failed to get budget states');
        res.status(500).json({ error: 'Failed to get budget states' });
    }
});
// ============================================================================
// Error Handling
// ============================================================================
app.use((error, _req, res, _next) => {
    logger_js_1.logger.error({ error }, 'Unhandled error');
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
});
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.originalUrl,
    });
});
// ============================================================================
// Server Lifecycle
// ============================================================================
async function startServer() {
    try {
        logger_js_1.logger.info('Starting Privacy Analytics Service...');
        // Connect to databases
        await connections_js_1.db.connect();
        // Initialize services
        queryExecutor = new QueryExecutor_js_1.QueryExecutor({
            postgres: connections_js_1.db.postgres,
            neo4j: connections_js_1.db.neo4j,
        }, {
            enableDP: config_js_1.config.privacy.enableDifferentialPrivacy,
            enableKAnonymity: config_js_1.config.privacy.enableKAnonymity,
            defaultMinCohortSize: config_js_1.config.privacy.defaultMinCohortSize,
            defaultEpsilon: config_js_1.config.privacy.defaultEpsilon,
        });
        governanceClient = new GovernanceClient_js_1.GovernanceClient(config_js_1.config.governance.serviceUrl, config_js_1.config.governance.opaEndpoint);
        // Start server
        const server = app.listen(PORT, () => {
            logger_js_1.logger.info(`Privacy Analytics Service running on port ${PORT}`);
            logger_js_1.logger.info(`Health check: http://localhost:${PORT}/health`);
            logger_js_1.logger.info(`API docs: http://localhost:${PORT}/api/v1`);
        });
        // Graceful shutdown
        const shutdown = async (signal) => {
            logger_js_1.logger.info({ signal }, 'Shutdown signal received');
            server.close(async () => {
                logger_js_1.logger.info('HTTP server closed');
                await connections_js_1.db.disconnect();
                logger_js_1.logger.info('Service shutdown complete');
                process.exit(0);
            });
            // Force exit after 30 seconds
            setTimeout(() => {
                logger_js_1.logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 30000);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (error) {
        logger_js_1.logger.error({ error }, 'Failed to start server');
        process.exit(1);
    }
}
// Start if main module
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
    startServer();
}
