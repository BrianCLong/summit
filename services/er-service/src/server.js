"use strict";
/**
 * Entity Resolution Service - Main Entry Point
 *
 * Starts the ER service with HTTP API, event bus, and batch processor.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
exports.start = start;
const express_1 = __importDefault(require("express"));
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
const routes_js_1 = require("./api/routes.js");
const connection_js_1 = require("./db/connection.js");
const EventBus_js_1 = require("./events/EventBus.js");
const BatchProcessor_js_1 = require("./batch/BatchProcessor.js");
const logger = (0, pino_1.default)({ name: 'er-service' });
function loadConfig() {
    return {
        port: parseInt(process.env.ER_SERVICE_PORT ?? '8090', 10),
        database: {
            host: process.env.DB_HOST ?? 'localhost',
            port: parseInt(process.env.DB_PORT ?? '5432', 10),
            database: process.env.DB_NAME ?? 'intelgraph',
            user: process.env.DB_USER ?? 'postgres',
            password: process.env.DB_PASSWORD ?? '',
            maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS ?? '20', 10),
        },
        kafka: {
            brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
            clientId: process.env.KAFKA_CLIENT_ID ?? 'er-service',
            topic: process.env.KAFKA_TOPIC ?? 'er-events',
        },
        enableBatchWorker: process.env.ENABLE_BATCH_WORKER !== 'false',
    };
}
async function createApp(config) {
    const app = (0, express_1.default)();
    // Middleware
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use((0, pino_http_1.default)({ logger }));
    // CORS for development
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
            return;
        }
        next();
    });
    // Routes
    app.use(routes_js_1.apiRouter);
    return app;
}
async function start() {
    const config = loadConfig();
    logger.info({ port: config.port }, 'Starting ER service');
    try {
        // Initialize database
        const db = (0, connection_js_1.initializeDatabase)(config.database);
        await db.initialize();
        logger.info('Database connection established');
        // Initialize event bus
        const eventBus = (0, EventBus_js_1.initializeEventBus)(config.kafka);
        await eventBus.connect();
        logger.info('Event bus connected');
        // Start batch worker if enabled
        if (config.enableBatchWorker) {
            await BatchProcessor_js_1.batchProcessor.start();
            logger.info('Batch processor started');
        }
        // Create and start HTTP server
        const app = await createApp(config);
        const server = app.listen(config.port, () => {
            logger.info({ port: config.port }, 'ER service listening');
        });
        // Graceful shutdown
        const shutdown = async (signal) => {
            logger.info({ signal }, 'Shutdown signal received');
            server.close(async () => {
                try {
                    if (config.enableBatchWorker) {
                        await BatchProcessor_js_1.batchProcessor.stop();
                    }
                    await eventBus.disconnect();
                    await db.close();
                    logger.info('Graceful shutdown complete');
                    process.exit(0);
                }
                catch (error) {
                    logger.error({ error }, 'Error during shutdown');
                    process.exit(1);
                }
            });
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (error) {
        logger.error({ error }, 'Failed to start ER service');
        process.exit(1);
    }
}
// Start if running directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
    start();
}
