"use strict";
// @ts-nocheck
/**
 * Data Factory Service - Main Entry Point
 *
 * Fastify-based REST API server for dataset curation, labeling workflows,
 * and training data management.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildServer = buildServer;
exports.start = start;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
const pino_1 = __importDefault(require("pino"));
const connection_js_1 = require("./db/connection.js");
const index_js_1 = require("./services/index.js");
const index_js_2 = require("./routes/index.js");
const logger = (0, pino_1.default)({
    name: 'data-factory-service',
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty' }
        : undefined,
});
const config = {
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT || '8080', 10),
};
async function buildServer() {
    const app = (0, fastify_1.default)({
        logger: {
            level: process.env.LOG_LEVEL || 'info',
        },
        requestIdHeader: 'x-request-id',
        requestIdLogLabel: 'requestId',
    });
    // Register plugins
    await app.register(cors_1.default, {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-request-id'],
    });
    await app.register(helmet_1.default, {
        contentSecurityPolicy: false,
    });
    // Swagger documentation
    await app.register(swagger_1.default, {
        openapi: {
            info: {
                title: 'Data Factory Service API',
                description: 'API for dataset curation, labeling workflows, and training data management',
                version: '1.0.0',
            },
            servers: [
                {
                    url: `http://localhost:${config.port}`,
                    description: 'Development server',
                },
            ],
            tags: [
                { name: 'datasets', description: 'Dataset management' },
                { name: 'samples', description: 'Sample management' },
                { name: 'labeling', description: 'Labeling jobs and queues' },
                { name: 'workflows', description: 'Labeling workflows' },
                { name: 'exports', description: 'Dataset exports' },
                { name: 'annotators', description: 'Annotator management' },
                { name: 'quality', description: 'Quality control' },
            ],
        },
    });
    await app.register(swagger_ui_1.default, {
        routePrefix: '/docs',
        uiConfig: {
            docExpansion: 'list',
            deepLinking: true,
        },
    });
    // Initialize database
    (0, connection_js_1.createPool)();
    // Create service container
    const services = (0, index_js_1.createServiceContainer)();
    // Register routes
    (0, index_js_2.registerRoutes)(app, services);
    // Health check endpoints
    app.get('/health', async () => {
        return { status: 'healthy', timestamp: new Date().toISOString() };
    });
    app.get('/health/ready', async () => {
        const dbHealth = await (0, connection_js_1.healthCheck)();
        return {
            status: dbHealth.status === 'healthy' ? 'ready' : 'not_ready',
            timestamp: new Date().toISOString(),
            database: dbHealth,
        };
    });
    app.get('/health/live', async () => {
        return { status: 'live', timestamp: new Date().toISOString() };
    });
    app.get('/health/detailed', async () => {
        const dbHealth = await (0, connection_js_1.healthCheck)();
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            database: dbHealth,
        };
    });
    // Metrics endpoint (Prometheus format)
    app.get('/metrics', async () => {
        const dbHealth = await (0, connection_js_1.healthCheck)();
        return `# HELP data_factory_up Service health status
# TYPE data_factory_up gauge
data_factory_up 1

# HELP data_factory_db_pool_size Database pool size
# TYPE data_factory_db_pool_size gauge
data_factory_db_pool_size ${dbHealth.poolSize}

# HELP data_factory_db_pool_idle Idle connections in pool
# TYPE data_factory_db_pool_idle gauge
data_factory_db_pool_idle ${dbHealth.idleCount}

# HELP data_factory_db_pool_waiting Waiting connections
# TYPE data_factory_db_pool_waiting gauge
data_factory_db_pool_waiting ${dbHealth.waitingCount}

# HELP data_factory_db_latency_ms Database query latency
# TYPE data_factory_db_latency_ms gauge
data_factory_db_latency_ms ${dbHealth.latency}
`;
    });
    // Root endpoint
    app.get('/', async () => {
        return {
            service: 'data-factory-service',
            version: '1.0.0',
            description: 'Dataset curation, labeling workflows, and training data management',
            documentation: '/docs',
            health: '/health',
        };
    });
    return app;
}
async function start() {
    try {
        const app = await buildServer();
        // Graceful shutdown
        const shutdown = async (signal) => {
            logger.info({ signal }, 'Received shutdown signal');
            try {
                await app.close();
                await (0, connection_js_1.closePool)();
                logger.info('Server shut down gracefully');
                process.exit(0);
            }
            catch (error) {
                logger.error({ error }, 'Error during shutdown');
                process.exit(1);
            }
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        await app.listen({ port: config.port, host: config.host });
        logger.info({ host: config.host, port: config.port }, 'Data Factory Service started');
        logger.info(`API documentation available at http://localhost:${config.port}/docs`);
    }
    catch (error) {
        logger.error({ error }, 'Failed to start server');
        process.exit(1);
    }
}
// Start server if running directly
start();
