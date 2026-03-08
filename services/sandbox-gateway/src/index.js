"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const drainHttpServer_1 = require("@apollo/server/plugin/drainHttpServer");
const default_1 = require("@apollo/server/plugin/landingPage/default");
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const fs_1 = require("fs");
const path_1 = require("path");
const url_1 = require("url");
const pino_http_1 = __importDefault(require("pino-http"));
const resolvers_js_1 = require("./graphql/resolvers.js");
const auth_js_1 = require("./middleware/auth.js");
const index_js_1 = require("./metrics/index.js");
const logger_js_1 = require("./utils/logger.js");
const __dirname = (0, path_1.dirname)((0, url_1.fileURLToPath)(import.meta.url));
const requestLogger = (0, logger_js_1.createLogger)('Request');
// Load GraphQL schema
const typeDefs = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, 'graphql', 'schema.graphql'), 'utf-8');
// Configuration
const PORT = parseInt(process.env.PORT || '4100', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';
async function startServer() {
    const app = (0, express_1.default)();
    const httpServer = http_1.default.createServer(app);
    // Security middleware
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
    }));
    app.use((0, compression_1.default)());
    app.use((0, cors_1.default)({
        origin: NODE_ENV === 'production'
            ? process.env.ALLOWED_ORIGINS?.split(',') || []
            : '*',
        credentials: true,
    }));
    // Request logging
    app.use((0, pino_http_1.default)({
        logger: logger_js_1.logger,
        autoLogging: NODE_ENV === 'production',
        customLogLevel: (req, res, err) => {
            if (err || res.statusCode >= 500)
                return 'error';
            if (res.statusCode >= 400)
                return 'warn';
            return 'info';
        },
    }));
    // Health check endpoints (before auth)
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
        });
    });
    app.get('/health/ready', async (req, res) => {
        // Check dependencies
        const checks = {
            status: 'ready',
            timestamp: new Date().toISOString(),
            checks: {
                graphql: 'ok',
                // Would add actual dependency checks here
            },
        };
        res.json(checks);
    });
    app.get('/health/live', (req, res) => {
        res.json({ status: 'live', timestamp: new Date().toISOString() });
    });
    // Metrics endpoint
    app.get('/metrics', async (req, res) => {
        res.set('Content-Type', index_js_1.registry.contentType);
        res.end(await index_js_1.registry.metrics());
    });
    // Parse JSON bodies
    app.use(express_1.default.json({ limit: '10mb' }));
    // Rate limiting
    app.use('/graphql', (0, auth_js_1.rateLimit)({ windowMs: 60000, max: 1000 }));
    // Create Apollo Server
    const server = new server_1.ApolloServer({
        typeDefs,
        resolvers: resolvers_js_1.resolvers,
        plugins: [
            (0, drainHttpServer_1.ApolloServerPluginDrainHttpServer)({ httpServer }),
            (0, default_1.ApolloServerPluginLandingPageLocalDefault)({
                embed: true,
                includeCookies: true,
            }),
            // Custom plugin for metrics
            {
                async requestDidStart() {
                    const startTime = Date.now();
                    return {
                        async willSendResponse(requestContext) {
                            const duration = (Date.now() - startTime) / 1000;
                            index_js_1.metrics.httpRequestDuration.observe({ method: 'POST', path: '/graphql', status: '200' }, duration);
                            index_js_1.metrics.httpRequestsTotal.inc({
                                method: 'POST',
                                path: '/graphql',
                                status: '200',
                            });
                        },
                        async didEncounterErrors(requestContext) {
                            index_js_1.metrics.httpRequestsTotal.inc({
                                method: 'POST',
                                path: '/graphql',
                                status: '500',
                            });
                        },
                    };
                },
            },
        ],
        introspection: NODE_ENV !== 'production',
        formatError: (formattedError, error) => {
            // Log errors
            requestLogger.error('GraphQL Error', {
                message: formattedError.message,
                path: formattedError.path,
                extensions: formattedError.extensions,
            });
            // Hide internal errors in production
            if (NODE_ENV === 'production' && !formattedError.extensions?.code) {
                return {
                    message: 'Internal server error',
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                };
            }
            return formattedError;
        },
    });
    await server.start();
    // GraphQL endpoint with auth
    app.use('/graphql', auth_js_1.authMiddleware, (0, express4_1.expressMiddleware)(server, {
        context: async ({ req }) => {
            return {
                user: req.user,
                requestId: req.requestId,
                startTime: Date.now(),
            };
        },
    }));
    // REST API endpoints for simpler operations
    app.get('/api/v1/sandboxes', auth_js_1.authMiddleware, async (req, res) => {
        try {
            // Would call resolver directly
            res.json({ sandboxes: [], total: 0 });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to list sandboxes' });
        }
    });
    app.get('/api/v1/sandboxes/:id', auth_js_1.authMiddleware, async (req, res) => {
        try {
            res.json({ sandbox: null });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to get sandbox' });
        }
    });
    // 404 handler
    app.use((req, res) => {
        res.status(404).json({ error: 'Not found' });
    });
    // Error handler
    app.use((err, req, res, next) => {
        requestLogger.error('Unhandled error', {
            error: err.message,
            stack: err.stack,
            requestId: req.requestId,
        });
        res.status(500).json({
            error: NODE_ENV === 'production' ? 'Internal server error' : err.message,
        });
    });
    // Start server
    await new Promise((resolve) => {
        httpServer.listen({ port: PORT, host: HOST }, resolve);
    });
    logger_js_1.logger.info(`🚀 Sandbox Gateway ready`, {
        graphql: `http://${HOST}:${PORT}/graphql`,
        health: `http://${HOST}:${PORT}/health`,
        metrics: `http://${HOST}:${PORT}/metrics`,
        environment: NODE_ENV,
    });
    // Graceful shutdown
    const shutdown = async () => {
        logger_js_1.logger.info('Shutting down...');
        await server.stop();
        httpServer.close(() => {
            logger_js_1.logger.info('Server closed');
            process.exit(0);
        });
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}
startServer().catch((error) => {
    logger_js_1.logger.error('Failed to start server', { error: error.message });
    process.exit(1);
});
