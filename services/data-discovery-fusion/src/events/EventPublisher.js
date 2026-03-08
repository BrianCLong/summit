"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventPublisher = void 0;
exports.getEventPublisher = getEventPublisher;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_js_1 = require("../utils/logger.js");
const DEFAULT_CONFIG = {
    streamKey: 'data-discovery:events',
    maxLen: 10000,
};
/**
 * Event Publisher
 * Publishes discovery events to Redis Streams for consumption by other services
 */
class EventPublisher {
    config;
    redis = null;
    connected = false;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Connect to Redis
     */
    async connect() {
        if (this.connected)
            return;
        try {
            const redisUrl = this.config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
            this.redis = new ioredis_1.default(redisUrl, {
                maxRetriesPerRequest: 3,
                retryStrategy: (times) => Math.min(times * 100, 3000),
            });
            await this.redis.ping();
            this.connected = true;
            logger_js_1.logger.info('EventPublisher connected to Redis');
        }
        catch (error) {
            logger_js_1.logger.warn('EventPublisher failed to connect to Redis, events will be logged only', { error });
            this.redis = null;
        }
    }
    /**
     * Disconnect from Redis
     */
    async disconnect() {
        if (this.redis) {
            await this.redis.quit();
            this.redis = null;
            this.connected = false;
            logger_js_1.logger.info('EventPublisher disconnected from Redis');
        }
    }
    /**
     * Publish an event to the stream
     */
    async publish(event) {
        const eventData = {
            type: event.type,
            payload: JSON.stringify(event.payload),
            timestamp: event.timestamp.toISOString(),
            correlationId: event.correlationId,
        };
        // Always log the event
        logger_js_1.logger.debug('Publishing event', { type: event.type, correlationId: event.correlationId });
        if (!this.redis || !this.connected) {
            // Fallback to just logging
            logger_js_1.logger.info('Event (no Redis)', eventData);
            return null;
        }
        try {
            const messageId = await this.redis.xadd(this.config.streamKey, 'MAXLEN', '~', this.config.maxLen, '*', ...Object.entries(eventData).flat());
            return messageId;
        }
        catch (error) {
            logger_js_1.logger.error('Failed to publish event', { error, event: eventData });
            return null;
        }
    }
    /**
     * Publish source discovered event
     */
    async publishSourceDiscovered(source) {
        return this.publish({
            type: 'source_discovered',
            payload: source,
            timestamp: new Date(),
            correlationId: crypto.randomUUID(),
        });
    }
    /**
     * Publish source profiled event
     */
    async publishSourceProfiled(sourceId, profile) {
        return this.publish({
            type: 'source_profiled',
            payload: { sourceId, profile },
            timestamp: new Date(),
            correlationId: crypto.randomUUID(),
        });
    }
    /**
     * Publish fusion completed event
     */
    async publishFusionCompleted(results) {
        return this.publish({
            type: 'fusion_completed',
            payload: { count: results.length, results },
            timestamp: new Date(),
            correlationId: crypto.randomUUID(),
        });
    }
    /**
     * Publish deduplication completed event
     */
    async publishDeduplicationCompleted(results) {
        return this.publish({
            type: 'dedup_completed',
            payload: { clusters: results.length, results },
            timestamp: new Date(),
            correlationId: crypto.randomUUID(),
        });
    }
    /**
     * Publish feedback received event
     */
    async publishFeedbackReceived(feedback) {
        return this.publish({
            type: 'feedback_received',
            payload: feedback,
            timestamp: new Date(),
            correlationId: crypto.randomUUID(),
        });
    }
    /**
     * Check if connected
     */
    isConnected() {
        return this.connected;
    }
}
exports.EventPublisher = EventPublisher;
// Singleton for easy access
let defaultPublisher = null;
function getEventPublisher() {
    if (!defaultPublisher) {
        defaultPublisher = new EventPublisher();
    }
    return defaultPublisher;
}
