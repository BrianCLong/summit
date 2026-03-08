"use strict";
/**
 * IntelGraph API Application Setup
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const drainHttpServer_1 = require("@apollo/server/plugin/drainHttpServer");
const body_parser_1 = require("body-parser");
const http_1 = require("http");
const schema_js_1 = require("./graphql/schema.js");
const index_js_1 = require("./graphql/resolvers/index.js");
const persisted_js_1 = require("./graphql/persisted.js");
const context_js_1 = require("./graphql/context.js");
const auth_js_1 = require("./middleware/auth.js");
const tenant_js_1 = require("./middleware/tenant.js");
const audit_js_1 = require("./middleware/audit.js");
const rateLimit_js_1 = require("./middleware/rateLimit.js");
const logger_js_1 = require("./utils/logger.js");
const rateLimitMetrics_js_1 = require("./observability/rateLimitMetrics.js");
const ingest_js_1 = require("./routes/ingest.js");
const copilot_js_1 = require("./routes/copilot.js");
const admin_js_1 = require("./routes/admin.js");
const cases_js_1 = require("./routes/cases.js");
const evidence_js_1 = require("./routes/evidence.js");
const analytics_ext_js_1 = require("./routes/analytics_ext.js");
const triage_js_1 = require("./routes/triage.js");
const preflight_js_1 = require("./routes/actions/preflight.js");
const swagger_js_1 = require("./docs/swagger.js");
const graphql_docs_js_1 = require("./docs/graphql-docs.js");
const openapi_validator_js_1 = require("./middleware/openapi-validator.js");
const version_middleware_js_1 = require("./versioning/version-middleware.js");
const versioning_js_1 = require("./routes/versioning.js");
async function createApp() {
    const app = (0, express_1.default)();
    const httpServer = (0, http_1.createServer)(app);
    // Security middleware
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: process.env.NODE_ENV === 'production',
        crossOriginEmbedderPolicy: false,
    }));
    // CORS configuration
    app.use((0, cors_1.default)({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || [
            'http://localhost:3000',
        ],
        credentials: true,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
    }));
    // General middleware
    app.use((0, compression_1.default)());
    app.use((0, body_parser_1.json)({ limit: '10mb' }));
    // API Version detection and validation
    app.use(version_middleware_js_1.versionMiddleware);
    // OpenAPI request validation (optional - only for /api routes)
    if (process.env.ENABLE_API_VALIDATION === 'true') {
        app.use(openapi_validator_js_1.validateRequest);
    }
    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
        });
    });
    // Metrics endpoint for monitoring
    app.get('/metrics', async (_req, res) => {
        try {
            const metrics = await (0, rateLimitMetrics_js_1.renderMetrics)();
            res.setHeader('Content-Type', rateLimitMetrics_js_1.metricsContentType);
            res.send(metrics);
        }
        catch (error) {
            logger_js_1.logger.error({ error }, 'Failed to render metrics');
            res.status(503).json({ error: 'metrics_unavailable' });
        }
    });
    // API Documentation (Swagger/OpenAPI)
    app.use('/api/docs', swagger_js_1.swaggerRouter);
    app.use('/api/docs', graphql_docs_js_1.graphqlDocsRouter);
    // API Versioning endpoints
    app.use('/api/versioning', versioning_js_1.versioningRouter);
    // Ingest wizard API (scaffold)
    app.use('/api/ingest', ingest_js_1.ingestRouter);
    // Copilot utility
    app.use('/api/copilot', copilot_js_1.copilotRouter);
    // Admin console
    app.use('/api/admin', admin_js_1.adminRouter);
    // Cases
    app.use('/api/cases', cases_js_1.casesRouter);
    // Evidence
    app.use('/api/evidence', evidence_js_1.evidenceRouter);
    // Analytics expansion
    app.use('/api/analytics', analytics_ext_js_1.analyticsExtRouter);
    // Triage queue
    app.use('/api/triage', triage_js_1.triageRouter);
    // Actions preflight (policy simulation)
    app.use('/api/actions', preflight_js_1.actionsPreflightRouter);
    // Create Apollo Server
    const server = new server_1.ApolloServer({
        typeDefs: schema_js_1.typeDefs,
        resolvers: index_js_1.resolvers,
        plugins: [(0, drainHttpServer_1.ApolloServerPluginDrainHttpServer)({ httpServer })],
        formatError: (error) => {
            logger_js_1.logger.error({
                message: 'GraphQL Error',
                error: error.message,
                path: error.path,
                extensions: error.extensions,
            });
            // Don't expose internal errors in production
            if (process.env.NODE_ENV === 'production') {
                if (error.extensions?.code === 'INTERNAL_SERVER_ERROR') {
                    return new Error('An internal error occurred');
                }
            }
            return error;
        },
    });
    // Start Apollo Server
    await server.start();
    // Basic GraphQL guard: require operationName (optional) and limit naive complexity by brace count
    function graphGuard(req, res, next) {
        try {
            if (req.method === 'POST') {
                const body = req.body || {};
                if (process.env.ENFORCE_GRAPHQL_OPNAME === 'true' &&
                    !body.operationName) {
                    return res.status(400).json({ error: 'operation_name_required' });
                }
                const q = String(body.query || '');
                const braces = (q.match(/[{}]/g) || []).length;
                const maxBraces = Number(process.env.GQL_MAX_BRACES || '200');
                if (braces > maxBraces)
                    return res.status(400).json({ error: 'query_too_complex' });
            }
        }
        catch { }
        next();
    }
    // Apply GraphQL middleware with authentication and tenant isolation
    // Support both versioned and unversioned endpoints
    const graphqlPaths = ['/graphql', '/v1/graphql', '/v2/graphql'];
    for (const path of graphqlPaths) {
        app.post(path, persisted_js_1.persistedGuard);
        app.use(path, graphGuard, rateLimit_js_1.rateLimitMiddleware, auth_js_1.authMiddleware, tenant_js_1.tenantMiddleware, audit_js_1.auditMiddleware, (0, express4_1.expressMiddleware)(server, {
            context: context_js_1.createContext,
        }));
    }
    return app;
}
