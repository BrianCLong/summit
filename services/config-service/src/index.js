"use strict";
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
exports.createConfigClient = exports.ConfigClient = void 0;
// @ts-nocheck
const server_1 = require("@apollo/server");
const express4_1 = require("@as-integrations/express4");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const index_js_1 = require("./api/index.js");
const index_js_2 = require("./db/index.js");
const logger_js_1 = require("./utils/logger.js");
const metrics_js_1 = require("./utils/metrics.js");
const log = logger_js_1.logger.child({ module: 'server' });
const PORT = parseInt(process.env.PORT || '4100', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
async function startServer() {
    log.info('Starting Config Service...');
    // Initialize database connections
    log.info('Initializing database connections...');
    (0, index_js_2.initializePool)();
    (0, index_js_2.initializeRedis)();
    // Initialize schema if needed
    const schemaReady = await (0, index_js_2.isSchemaInitialized)();
    if (!schemaReady) {
        log.info('Initializing database schema...');
        await (0, index_js_2.initializeSchema)();
    }
    // Subscribe to cache invalidations
    await (0, index_js_2.subscribeToInvalidations)(async (message) => {
        log.debug({ message }, 'Received cache invalidation');
        if (message.type === 'all') {
            await (0, index_js_2.cacheDeletePattern)('*');
        }
        else if (message.key) {
            await (0, index_js_2.cacheDeletePattern)(`${message.type}:${message.key}:*`);
        }
    });
    // Create Express app
    const app = (0, express_1.default)();
    // Security middleware
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
    }));
    app.use((0, cors_1.default)({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
    }));
    // Create Apollo Server
    const server = new server_1.ApolloServer({
        typeDefs: index_js_1.typeDefs,
        resolvers: index_js_1.resolvers,
        introspection: NODE_ENV !== 'production',
        plugins: [
            {
                async requestDidStart() {
                    return {
                        async willSendResponse({ response, contextValue }) {
                            // Add request ID to response headers if available
                            const ctx = contextValue;
                            if (ctx.requestId && response.http) {
                                response.http.headers.set('X-Request-ID', ctx.requestId);
                            }
                        },
                    };
                },
            },
        ],
    });
    await server.start();
    // GraphQL endpoint
    app.use('/graphql', express_1.default.json({ limit: '1mb' }), (0, express4_1.expressMiddleware)(server, {
        context: index_js_1.createContext,
    }));
    // Health endpoints
    app.get('/health', async (req, res) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
        });
    });
    app.get('/health/ready', async (req, res) => {
        const [pgHealth, redisHealth] = await Promise.all([
            (0, index_js_2.postgresHealthCheck)(),
            (0, index_js_2.redisHealthCheck)(),
        ]);
        const ready = pgHealth && redisHealth;
        res.status(ready ? 200 : 503).json({
            status: ready ? 'ready' : 'not_ready',
            checks: {
                postgres: pgHealth ? 'ok' : 'fail',
                redis: redisHealth ? 'ok' : 'fail',
            },
            timestamp: new Date().toISOString(),
        });
    });
    app.get('/health/live', (req, res) => {
        res.json({ status: 'alive', timestamp: new Date().toISOString() });
    });
    // Metrics endpoint
    app.get('/metrics', async (req, res) => {
        try {
            res.set('Content-Type', metrics_js_1.registry.contentType);
            res.end(await metrics_js_1.registry.metrics());
        }
        catch (err) {
            res.status(500).end(String(err));
        }
    });
    // Start server
    app.listen(PORT, () => {
        log.info(`Config Service ready at http://localhost:${PORT}/graphql`);
        log.info(`Health check at http://localhost:${PORT}/health`);
        log.info(`Metrics at http://localhost:${PORT}/metrics`);
    });
    // Graceful shutdown
    const shutdown = async (signal) => {
        log.info({ signal }, 'Received shutdown signal');
        await server.stop();
        await (0, index_js_2.closePool)();
        await (0, index_js_2.closeRedis)();
        log.info('Config Service shut down gracefully');
        process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
startServer().catch((error) => {
    log.error({ error }, 'Failed to start Config Service');
    process.exit(1);
});
// Export for testing and programmatic use
__exportStar(require("./types/index.js"), exports);
__exportStar(require("./services/index.js"), exports);
__exportStar(require("./db/index.js"), exports);
var index_js_3 = require("./sdk/index.js");
Object.defineProperty(exports, "ConfigClient", { enumerable: true, get: function () { return index_js_3.ConfigClient; } });
Object.defineProperty(exports, "createConfigClient", { enumerable: true, get: function () { return index_js_3.createConfigClient; } });
