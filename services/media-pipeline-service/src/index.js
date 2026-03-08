"use strict";
/**
 * Media Pipeline Service
 *
 * Main entry point for the media intake and processing service.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildServer = buildServer;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const health_routes_js_1 = require("./routes/health.routes.js");
const media_routes_js_1 = require("./routes/media.routes.js");
const transcript_routes_js_1 = require("./routes/transcript.routes.js");
const providers_routes_js_1 = require("./routes/providers.routes.js");
const correlationId_js_1 = require("./middleware/correlationId.js");
const policy_js_1 = require("./middleware/policy.js");
const registry_js_1 = require("./providers/registry.js");
const logger_js_1 = require("./utils/logger.js");
const index_js_1 = __importDefault(require("./config/index.js"));
async function buildServer() {
    const server = (0, fastify_1.default)({
        logger: {
            level: index_js_1.default.logLevel,
            transport: index_js_1.default.nodeEnv === 'development'
                ? {
                    target: 'pino-pretty',
                    options: {
                        colorize: true,
                        translateTime: 'SYS:standard',
                        ignore: 'pid,hostname',
                    },
                }
                : undefined,
        },
        trustProxy: true,
    });
    // Register plugins
    await server.register(helmet_1.default, {
        contentSecurityPolicy: index_js_1.default.nodeEnv === 'production' ? undefined : false,
    });
    await server.register(cors_1.default, {
        origin: index_js_1.default.corsOrigin,
        credentials: true,
    });
    // Register hooks
    server.addHook('preHandler', correlationId_js_1.correlationIdMiddleware);
    server.addHook('preHandler', policy_js_1.policyMiddleware);
    // Register routes
    await server.register(health_routes_js_1.healthRoutes);
    await server.register(media_routes_js_1.mediaRoutes);
    await server.register(transcript_routes_js_1.transcriptRoutes);
    await server.register(providers_routes_js_1.providerRoutes);
    // Error handler
    server.setErrorHandler((error, request, reply) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger_js_1.logger.error({
            error: errorMessage,
            stack: errorStack,
            correlationId: request.correlationId,
            url: request.url,
            method: request.method,
        }, 'Request error');
        const statusCode = error.statusCode || 500;
        const message = index_js_1.default.nodeEnv === 'production' && statusCode >= 500
            ? 'Internal server error'
            : errorMessage;
        reply.status(statusCode).send({
            error: message,
            correlationId: request.correlationId,
        });
    });
    return server;
}
async function start() {
    let server = null;
    try {
        logger_js_1.logger.info({
            nodeEnv: index_js_1.default.nodeEnv,
            port: index_js_1.default.port,
            host: index_js_1.default.host,
        }, 'Starting Media Pipeline Service');
        // Initialize provider registry
        await registry_js_1.providerRegistry.initialize();
        logger_js_1.logger.info('Provider registry initialized');
        // Build and start server
        server = await buildServer();
        await server.listen({
            port: index_js_1.default.port,
            host: index_js_1.default.host,
        });
        logger_js_1.logger.info({
            address: `http://${index_js_1.default.host}:${index_js_1.default.port}`,
            routes: server.printRoutes(),
        }, 'Media Pipeline Service started');
        // Graceful shutdown handlers
        const shutdown = async (signal) => {
            logger_js_1.logger.info({ signal }, 'Shutdown signal received');
            if (server) {
                await server.close();
                logger_js_1.logger.info('Server closed');
            }
            process.exit(0);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (error) {
        logger_js_1.logger.error({ error }, 'Failed to start server');
        process.exit(1);
    }
}
// Start the server
start();
