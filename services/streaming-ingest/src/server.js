"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const pino_1 = __importDefault(require("pino"));
const eventStore_js_1 = require("./eventStore.js");
const consumer_js_1 = require("./consumer.js");
const replay_js_1 = require("./replay.js");
const types_js_1 = require("./types.js");
const logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        },
    } : undefined,
});
const fastify = (0, fastify_1.default)({
    logger,
    requestIdLogLabel: 'requestId',
    disableRequestLogging: false,
});
// Configuration
const config = {
    port: parseInt(process.env.PORT || '8080', 10),
    host: process.env.HOST || '0.0.0.0',
    kafkaBrokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','),
    topics: (process.env.KAFKA_TOPICS || 'events').split(','),
    consumerGroup: process.env.KAFKA_CONSUMER_GROUP || 'streaming-ingest',
    postgresUrl: process.env.DATABASE_URL || 'postgresql://summit:password@postgres:5432/summit_dev',
    batchMode: process.env.BATCH_MODE === 'true',
    batchSize: parseInt(process.env.BATCH_SIZE || '100', 10),
};
// Initialize services
const eventStore = new eventStore_js_1.EventStore(config.postgresUrl, logger);
const replayService = new replay_js_1.ReplayService(config.kafkaBrokers, eventStore, logger);
let consumer;
// CORS
await fastify.register(cors_1.default, {
    origin: true,
    credentials: true,
});
// Health checks
fastify.get('/health', async () => {
    return { status: 'ok', service: 'streaming-ingest' };
});
fastify.get('/health/ready', async () => {
    // Check database connection
    try {
        await eventStore.initialize();
        return { status: 'ready', checks: { database: 'ok' } };
    }
    catch (error) {
        fastify.log.error({ error }, 'Readiness check failed');
        throw new Error('Service not ready');
    }
});
// Replay endpoint
fastify.post('/replay', async (request, reply) => {
    try {
        const replayRequest = types_js_1.ReplayRequestSchema.parse(request.body);
        const result = await replayService.replay(replayRequest);
        return {
            success: true,
            ...result,
        };
    }
    catch (error) {
        fastify.log.error({ error }, 'Replay failed');
        reply.code(500);
        return {
            success: false,
            error: error.message,
        };
    }
});
// Create checkpoint endpoint
fastify.post('/checkpoint', async (request, reply) => {
    try {
        const { topic, partition, offset } = request.body;
        if (!topic || partition === undefined || !offset) {
            reply.code(400);
            return { error: 'Missing required fields: topic, partition, offset' };
        }
        const checkpointId = await replayService.createCheckpoint(topic, partition, offset);
        return {
            success: true,
            checkpointId,
        };
    }
    catch (error) {
        fastify.log.error({ error }, 'Checkpoint creation failed');
        reply.code(500);
        return {
            success: false,
            error: error.message,
        };
    }
});
// Get checkpoint endpoint
fastify.get('/checkpoint/:id', async (request, reply) => {
    try {
        const { id } = request.params;
        const checkpoint = await eventStore.getCheckpoint(id);
        if (!checkpoint) {
            reply.code(404);
            return { error: 'Checkpoint not found' };
        }
        return checkpoint;
    }
    catch (error) {
        fastify.log.error({ error }, 'Failed to fetch checkpoint');
        reply.code(500);
        return {
            success: false,
            error: error.message,
        };
    }
});
// Metrics endpoint
fastify.get('/metrics', async () => {
    // TODO: Implement Prometheus metrics
    return {
        service: 'streaming-ingest',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
    };
});
// Graceful shutdown
async function shutdown() {
    logger.info('Shutting down gracefully...');
    if (consumer) {
        await consumer.stop();
    }
    await replayService.close();
    await eventStore.close();
    await fastify.close();
    process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
// Start server
async function start() {
    try {
        // Initialize event store
        await eventStore.initialize();
        logger.info('Event store initialized');
        // Initialize replay service
        await replayService.initialize();
        logger.info('Replay service initialized');
        // Start consumer
        consumer = new consumer_js_1.EventConsumer(config.kafkaBrokers, config.consumerGroup, eventStore, logger);
        if (config.batchMode) {
            await consumer.startBatch(config.topics, config.batchSize);
        }
        else {
            await consumer.start(config.topics);
        }
        // Start HTTP server
        await fastify.listen({ port: config.port, host: config.host });
        logger.info({
            port: config.port,
            topics: config.topics,
            batchMode: config.batchMode,
        }, 'Streaming ingest service started');
    }
    catch (error) {
        logger.error({ error }, 'Failed to start service');
        process.exit(1);
    }
}
start();
