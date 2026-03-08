"use strict";
/**
 * Event Bus Service - Standalone distributed event bus
 *
 * REST API for event bus operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
const event_bus_1 = require("@intelgraph/event-bus");
const event_sourcing_1 = require("@intelgraph/event-sourcing");
const cqrs_1 = require("@intelgraph/cqrs");
const ioredis_1 = __importDefault(require("ioredis"));
const logger = (0, pino_1.default)({ name: 'EventBusService' });
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, pino_http_1.default)({ logger }));
// Configuration
const config = {
    name: process.env.SERVICE_NAME || 'event-bus-service',
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD
    },
    kafka: process.env.KAFKA_BROKERS ? {
        brokers: process.env.KAFKA_BROKERS.split(',')
    } : undefined
};
const eventStoreConfig = {
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost/eventstore'
};
// Initialize components
let eventBus;
let eventStore;
let commandBus;
let queryBus;
let redis;
async function initialize() {
    logger.info('Initializing Event Bus Service...');
    // Initialize Redis
    redis = new ioredis_1.default(config.redis);
    // Initialize Event Bus
    eventBus = new event_bus_1.EventBus(config);
    await eventBus.initialize();
    // Initialize Event Store
    eventStore = new event_sourcing_1.EventStore(eventStoreConfig);
    await eventStore.initialize();
    // Initialize CQRS
    commandBus = new cqrs_1.CommandBus();
    queryBus = new cqrs_1.QueryBus(redis);
    logger.info('Event Bus Service initialized');
}
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'event-bus-service',
        timestamp: new Date().toISOString()
    });
});
// Publish message
app.post('/api/v1/publish', async (req, res) => {
    try {
        const { topic, payload, options } = req.body;
        const messageId = await eventBus.publish(topic, payload, options);
        res.json({
            success: true,
            messageId
        });
    }
    catch (err) {
        logger.error({ err }, 'Publish error');
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});
// Enqueue message
app.post('/api/v1/enqueue', async (req, res) => {
    try {
        const { queue, payload, options } = req.body;
        const messageId = await eventBus.enqueue(queue, payload, options);
        res.json({
            success: true,
            messageId
        });
    }
    catch (err) {
        logger.error({ err }, 'Enqueue error');
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});
// Get metrics
app.get('/api/v1/metrics', (req, res) => {
    const metrics = eventBus.getMetrics();
    res.json({
        success: true,
        metrics
    });
});
// Execute command
app.post('/api/v1/commands', async (req, res) => {
    try {
        const { commandType, payload, metadata } = req.body;
        const result = await commandBus.execute(commandType, payload, metadata);
        res.json(result);
    }
    catch (err) {
        logger.error({ err }, 'Command error');
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});
// Execute query
app.post('/api/v1/queries', async (req, res) => {
    try {
        const { queryType, parameters, metadata } = req.body;
        const result = await queryBus.execute(queryType, parameters, metadata);
        res.json(result);
    }
    catch (err) {
        logger.error({ err }, 'Query error');
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});
// Get event stream
app.get('/api/v1/events/:aggregateId', async (req, res) => {
    try {
        const { aggregateId } = req.params;
        const fromVersion = parseInt(req.query.fromVersion || '0');
        const stream = await eventStore.getEventStream(aggregateId, fromVersion);
        res.json({
            success: true,
            stream
        });
    }
    catch (err) {
        logger.error({ err }, 'Get event stream error');
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});
// Start server
const PORT = parseInt(process.env.PORT || '3000');
initialize().then(() => {
    app.listen(PORT, () => {
        logger.info({ port: PORT }, 'Event Bus Service listening');
    });
}).catch(err => {
    logger.error({ err }, 'Failed to initialize service');
    process.exit(1);
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    await eventBus.shutdown();
    await eventStore.close();
    await redis.quit();
    process.exit(0);
});
