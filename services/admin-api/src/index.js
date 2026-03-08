"use strict";
/**
 * Admin Studio GraphQL API Server
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const drainHttpServer_1 = require("@apollo/server/plugin/drainHttpServer");
const http_1 = require("http");
const ws_1 = require("ws");
const ws_2 = require("graphql-ws/lib/use/ws");
const schema_1 = require("@graphql-tools/schema");
const graphql_subscriptions_1 = require("graphql-subscriptions");
const pg_1 = require("pg");
const redis_1 = require("redis");
const fs_1 = require("fs");
const url_1 = require("url");
const path_1 = require("path");
const slow_query_killer_1 = require("@intelgraph/slow-query-killer");
const metrics_exporter_1 = require("@intelgraph/metrics-exporter");
const resolvers_js_1 = require("./resolvers.js");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, path_1.dirname)(__filename);
// Configuration
const PORT = parseInt(process.env.ADMIN_API_PORT || '4100');
const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];
// Initialize dependencies
const db = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/summit',
});
const redis = (0, redis_1.createClient)({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
});
await redis.connect();
const pubsub = new graphql_subscriptions_1.PubSub();
const slowQueryKiller = new slow_query_killer_1.SlowQueryKiller({
    maxExecutionTimeMs: parseInt(process.env.DEFAULT_QUERY_TIMEOUT_MS || '30000'),
    maxCostDollars: parseFloat(process.env.DEFAULT_QUERY_MAX_COST || '1.0'),
    softThreshold: 0.8,
    killEnabled: process.env.NODE_ENV === 'production',
});
const metrics = new metrics_exporter_1.MetricsExporter({
    serviceName: 'admin-api',
    environment: process.env.NODE_ENV || 'development',
});
// Set up query monitoring events
slowQueryKiller.on('query_warning', (event) => {
    console.warn('Query warning:', event);
    pubsub.publish('QUERY_WARNING', { queryWarnings: event });
    pubsub.publish(`QUERY_WARNING_${event.tenantId}`, { queryWarnings: event });
});
slowQueryKiller.on('query_killed', (event) => {
    console.log('Query killed:', event);
    metrics.recordSlowQueryKill(event.database, event.tenantId);
    pubsub.publish('QUERY_KILL', { queryKills: event });
    pubsub.publish(`QUERY_KILL_${event.tenantId}`, { queryKills: event });
});
// Create Express app
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// Load GraphQL schema
const typeDefs = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, 'schema.graphql'), 'utf-8');
const schema = (0, schema_1.makeExecutableSchema)({ typeDefs, resolvers: resolvers_js_1.resolvers });
// Create WebSocket server for subscriptions
const wsServer = new ws_1.WebSocketServer({
    server: httpServer,
    path: '/graphql',
});
const serverCleanup = (0, ws_2.useServer)({
    schema,
    context: async () => ({
        db,
        redis,
        slowQueryKiller,
        metrics,
        pubsub,
    }),
}, wsServer);
// Create Apollo Server
const server = new server_1.ApolloServer({
    schema,
    plugins: [
        (0, drainHttpServer_1.ApolloServerPluginDrainHttpServer)({ httpServer }),
        {
            async serverWillStart() {
                return {
                    async drainServer() {
                        await serverCleanup.dispose();
                    },
                };
            },
        },
    ],
    introspection: process.env.NODE_ENV !== 'production',
});
await server.start();
// Middleware
app.use((0, cors_1.default)({
    origin: CORS_ORIGINS,
    credentials: true,
}));
app.use(express_1.default.json());
// Metrics middleware
app.use((0, metrics_exporter_1.createMetricsMiddleware)(metrics));
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'admin-api',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});
// Detailed health check
app.get('/health/detailed', async (req, res) => {
    const health = {
        status: 'ok',
        service: 'admin-api',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        dependencies: {},
    };
    // Check database
    try {
        await db.query('SELECT 1');
        health.dependencies.postgres = { status: 'healthy' };
    }
    catch (error) {
        health.dependencies.postgres = {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : String(error),
        };
        health.status = 'degraded';
    }
    // Check Redis
    try {
        await redis.ping();
        health.dependencies.redis = { status: 'healthy' };
    }
    catch (error) {
        health.dependencies.redis = {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : String(error),
        };
        health.status = 'degraded';
    }
    // Slow query stats
    health.dependencies.slowQueryKiller = {
        status: 'healthy',
        stats: slowQueryKiller.getStats(),
    };
    res.json(health);
});
// Prometheus metrics endpoint
app.get('/metrics', (0, metrics_exporter_1.createMetricsEndpoint)(metrics));
// GraphQL endpoint
app.use('/graphql', (0, express4_1.expressMiddleware)(server, {
    context: async ({ req }) => {
        // Extract user from JWT or session
        // For now, just pass through
        const user = req.headers.authorization
            ? {
                id: 'system',
                tenantId: req.headers['x-tenant-id'] || 'default',
                roles: ['admin'],
            }
            : undefined;
        return {
            db,
            redis,
            slowQueryKiller,
            metrics,
            pubsub,
            user,
        };
    },
}));
// Start periodic system metrics updates
setInterval(async () => {
    const memoryUsage = process.memoryUsage();
    const systemMetrics = {
        cpuUsagePercent: 0,
        memoryUsageBytes: memoryUsage.heapUsed,
        memoryUsagePercent: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        activeConnections: 0,
        requestRate: 0,
        errorRate: 0,
        p95LatencyMs: 0,
    };
    metrics.updateActiveConnections('http', 0); // Would track real connections
    pubsub.publish('SYSTEM_METRICS', { systemMetricsUpdated: systemMetrics });
}, 10000); // Every 10 seconds
// Error handling
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    slowQueryKiller.stop();
    await redis.quit();
    await db.end();
    httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
// Start server
httpServer.listen(PORT, () => {
    console.log(`🚀 Admin Studio GraphQL API running at http://localhost:${PORT}/graphql`);
    console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
    console.log(`🔍 Health check at http://localhost:${PORT}/health`);
    console.log(`📡 Subscriptions available at ws://localhost:${PORT}/graphql`);
});
