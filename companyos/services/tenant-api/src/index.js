"use strict";
/**
 * CompanyOS Tenant API
 *
 * GraphQL API for tenant management, feature flags, and audit logging.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverReady = void 0;
const express_1 = __importDefault(require("express"));
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
const schema_js_1 = require("./graphql/schema.js");
const resolvers_js_1 = require("./graphql/resolvers.js");
const context_js_1 = require("./graphql/context.js");
const index_js_1 = require("./middleware/index.js");
const postgres_js_1 = require("./db/postgres.js");
const logger = (0, pino_1.default)({
    name: 'tenant-api',
    level: process.env.LOG_LEVEL || 'info',
});
const app = (0, express_1.default)();
const port = Number(process.env.PORT || 4101);
// Middleware
app.use(express_1.default.json());
app.use((0, pino_http_1.default)({
    logger,
    autoLogging: {
        ignore: (req) => req.url === '/health' ||
            req.url === '/healthz' ||
            req.url === '/metrics',
    },
}));
app.use(index_js_1.httpMetrics);
app.use(index_js_1.validateTenantId);
app.use(index_js_1.stubIdentity);
// Health endpoints
app.get('/health', async (req, res) => {
    const dbHealthy = await (0, postgres_js_1.healthCheck)();
    const status = dbHealthy ? 'healthy' : 'unhealthy';
    res.status(dbHealthy ? 200 : 503).json({
        status,
        service: 'tenant-api',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '0.1.0',
    });
});
app.get('/healthz', (req, res) => {
    res.json({ ok: true });
});
app.get('/health/ready', async (req, res) => {
    const dbHealthy = await (0, postgres_js_1.healthCheck)();
    res.status(dbHealthy ? 200 : 503).json({
        ready: dbHealthy,
        services: {
            postgres: dbHealthy ? 'healthy' : 'unhealthy',
        },
    });
});
app.get('/health/live', (req, res) => {
    res.json({ live: true });
});
app.get('/health/detailed', async (req, res) => {
    const dbHealthy = await (0, postgres_js_1.healthCheck)();
    res.json({
        status: dbHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '0.1.0',
        uptime: process.uptime(),
        services: {
            postgres: dbHealthy ? 'healthy' : 'unhealthy',
        },
        environment: process.env.NODE_ENV || 'development',
    });
});
// Metrics endpoint
app.get('/metrics', index_js_1.metricsHandler);
// Create Apollo Server
const apolloServer = new server_1.ApolloServer({
    typeDefs: schema_js_1.typeDefs,
    resolvers: resolvers_js_1.resolvers,
    introspection: process.env.NODE_ENV !== 'production',
});
// Promise that resolves when server is ready
let serverReadyResolve;
exports.serverReady = new Promise((resolve) => {
    serverReadyResolve = resolve;
});
// Start server
async function start() {
    await apolloServer.start();
    app.use('/graphql', (0, express4_1.expressMiddleware)(apolloServer, {
        context: async ({ req, res }) => {
            const requestId = req.headers['x-request-id'] || (0, context_js_1.generateRequestId)();
            const clientIp = (0, context_js_1.getClientIp)(req);
            return {
                req,
                res,
                user: req.user,
                requestId,
                clientIp,
                logger: logger.child({
                    requestId,
                    userId: req.user?.id,
                    tenantId: req.user?.tenantId,
                }),
            };
        },
    }));
    // Signal that server is ready for requests
    serverReadyResolve();
    if (process.env.NODE_ENV !== 'test') {
        app.listen(port, () => {
            logger.info({ port, graphql: `http://localhost:${port}/graphql` }, 'CompanyOS Tenant API started');
        });
    }
    // Graceful shutdown
    process.on('SIGTERM', async () => {
        logger.info('SIGTERM received, shutting down...');
        await apolloServer.stop();
        await (0, postgres_js_1.closePool)();
        process.exit(0);
    });
    process.on('SIGINT', async () => {
        logger.info('SIGINT received, shutting down...');
        await apolloServer.stop();
        await (0, postgres_js_1.closePool)();
        process.exit(0);
    });
}
start().catch((error) => {
    logger.error({ error }, 'Failed to start Tenant API');
    process.exit(1);
});
exports.default = app;
