"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamProcessorService = void 0;
const pino_1 = __importDefault(require("pino"));
const sinks_1 = require("./sinks");
const logger = (0, pino_1.default)({ name: 'stream-processor' });
/**
 * Stream processor service
 *
 * This service processes events from Kafka topics and writes to various sinks.
 * In production, it integrates with:
 * - @intelgraph/kafka-integration for Kafka consumer
 * - @intelgraph/stream-analytics for metrics and enrichment
 * - @intelgraph/cep-engine for pattern matching
 */
class StreamProcessorService {
    sinks = null;
    isRunning = false;
    async start() {
        logger.info('Starting stream processor service');
        // Initialize sinks
        const sinks = [];
        if (process.env.DATABASE_URL) {
            sinks.push(new sinks_1.PostgreSQLSink(process.env.DATABASE_URL));
        }
        if (process.env.REDIS_URL) {
            sinks.push(new sinks_1.RedisSink(process.env.REDIS_URL));
        }
        if (sinks.length > 0) {
            this.sinks = new sinks_1.MultiSink(sinks);
        }
        this.isRunning = true;
        logger.info('Stream processor service started');
        logger.info('Waiting for events...');
        // In production, this would initialize Kafka consumer and start processing
        // For now, we simulate a running service
        this.startHealthCheck();
    }
    startHealthCheck() {
        setInterval(() => {
            if (this.isRunning) {
                logger.debug('Service health check: OK');
            }
        }, 30000);
    }
    async processMessage(message) {
        try {
            logger.debug({ eventId: message.metadata.eventId }, 'Processing message');
            // Write to sinks
            if (this.sinks) {
                await this.sinks.write([message]);
            }
            return { success: true, retryable: false };
        }
        catch (error) {
            logger.error({ error }, 'Processing failed');
            return { success: false, retryable: true };
        }
    }
    async stop() {
        logger.info('Stopping stream processor service');
        this.isRunning = false;
        if (this.sinks) {
            await this.sinks.close();
        }
        logger.info('Stream processor service stopped');
    }
}
exports.StreamProcessorService = StreamProcessorService;
// Start service
const service = new StreamProcessorService();
service.start().catch((error) => {
    logger.fatal({ error }, 'Failed to start service');
    process.exit(1);
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received');
    await service.stop();
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger.info('SIGINT received');
    await service.stop();
    process.exit(0);
});
