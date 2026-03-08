"use strict";
/**
 * Temporal Fracture Forecasting Service
 *
 * Main entry point for the service. Sets up Express server with GraphQL API.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const drainHttpServer_1 = require("@apollo/server/plugin/drainHttpServer");
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const fs_1 = require("fs");
const path_1 = require("path");
const url_1 = require("url");
const pino_1 = __importDefault(require("pino"));
const TemporalFractureEngine_js_1 = require("./TemporalFractureEngine.js");
const temporalFractureResolvers_js_1 = require("./resolvers/temporalFractureResolvers.js");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, path_1.dirname)(__filename);
// Logger
const logger = (0, pino_1.default)({
    name: 'temporal-fracture-forecasting',
    level: process.env.LOG_LEVEL || 'info',
});
// Load GraphQL schema
const typeDefs = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, '../schema.graphql'), 'utf-8');
// Service configuration
const PORT = parseInt(process.env.PORT || '4500', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
// Initialize engine
const engine = new TemporalFractureEngine_js_1.TemporalFractureEngine();
async function startServer() {
    const app = (0, express_1.default)();
    const httpServer = http_1.default.createServer(app);
    // Apollo Server
    const server = new server_1.ApolloServer({
        typeDefs,
        resolvers: temporalFractureResolvers_js_1.temporalFractureResolvers,
        plugins: [(0, drainHttpServer_1.ApolloServerPluginDrainHttpServer)({ httpServer })],
        introspection: NODE_ENV !== 'production',
    });
    await server.start();
    // Middleware
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
    }));
    app.use((0, cors_1.default)({
        origin: NODE_ENV === 'production'
            ? process.env.ALLOWED_ORIGINS?.split(',') || []
            : '*',
        credentials: true,
    }));
    app.use(express_1.default.json());
    // Health check endpoints
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    app.get('/health/ready', (_req, res) => {
        // Check database connectivity, etc.
        const isReady = true; // TODO: Implement actual readiness checks
        if (isReady) {
            res.json({ status: 'ready', timestamp: new Date().toISOString() });
        }
        else {
            res
                .status(503)
                .json({ status: 'not ready', timestamp: new Date().toISOString() });
        }
    });
    app.get('/health/live', (_req, res) => {
        res.json({ status: 'alive', timestamp: new Date().toISOString() });
    });
    // GraphQL endpoint
    app.use('/graphql', (0, express4_1.expressMiddleware)(server, {
        context: async ({ req }) => ({
            engine,
            logger,
        }),
    }));
    // Start listening
    await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));
    logger.info(`🚀 Temporal Fracture Forecasting service ready at http://localhost:${PORT}/graphql`);
    logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
    logger.info(`Environment: ${NODE_ENV}`);
    // Graceful shutdown
    const shutdown = async () => {
        logger.info('Shutting down gracefully...');
        await server.stop();
        httpServer.close(() => {
            logger.info('Server closed');
            process.exit(0);
        });
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}
// Start server
startServer().catch((err) => {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
});
