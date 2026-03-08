"use strict";
/**
 * Cache Invalidation Service
 *
 * Manages cross-instance cache invalidation via Redis pub/sub.
 * Supports pattern-based, tag-based, and tenant-scoped invalidation.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.1 (System Operations)
 *
 * @module cache/CacheInvalidationService
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheInvalidationService = void 0;
exports.getCacheInvalidationService = getCacheInvalidationService;
const uuid_1 = require("uuid");
const events_1 = require("events");
const data_envelope_js_1 = require("../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
        policyId: 'invalidation-policy',
        result,
        decidedAt: new Date(),
        reason,
        evaluator: 'CacheInvalidationService',
    };
}
// ============================================================================
// Cache Invalidation Service
// ============================================================================
class CacheInvalidationService extends events_1.EventEmitter {
    publisher;
    subscriber;
    config;
    stats;
    handlers = new Map();
    eventBatch = [];
    batchTimer = null;
    isRunning = false;
    constructor(redis, config = {}) {
        super();
        this.publisher = redis;
        this.subscriber = redis.duplicate();
        this.config = {
            channelPrefix: config.channelPrefix ?? 'cache:invalidation',
            instanceId: config.instanceId ?? `instance-${(0, uuid_1.v4)().slice(0, 8)}`,
            enableBatching: config.enableBatching ?? true,
            batchFlushMs: config.batchFlushMs ?? 50,
            maxBatchSize: config.maxBatchSize ?? 100,
        };
        this.stats = {
            published: 0,
            received: 0,
            processed: 0,
            errors: 0,
            batches: 0,
        };
        logger_js_1.default.info({ instanceId: this.config.instanceId }, 'CacheInvalidationService initialized');
    }
    // --------------------------------------------------------------------------
    // Lifecycle
    // --------------------------------------------------------------------------
    /**
     * Start listening for invalidation events
     */
    async start() {
        if (this.isRunning)
            return;
        const channels = [
            `${this.config.channelPrefix}:keys`,
            `${this.config.channelPrefix}:patterns`,
            `${this.config.channelPrefix}:tags`,
            `${this.config.channelPrefix}:tenants`,
            `${this.config.channelPrefix}:all`,
        ];
        await this.subscriber.subscribe(...channels);
        this.subscriber.on('message', async (channel, message) => {
            try {
                const event = JSON.parse(message);
                // Ignore events from this instance
                if (event.source === this.config.instanceId) {
                    return;
                }
                this.stats.received++;
                await this.processEvent(event);
                this.stats.processed++;
            }
            catch (error) {
                this.stats.errors++;
                logger_js_1.default.error({ error, channel, message }, 'Failed to process invalidation event');
            }
        });
        this.isRunning = true;
        logger_js_1.default.info({ channels }, 'Invalidation listener started');
    }
    /**
     * Stop listening and clean up
     */
    async stop() {
        if (!this.isRunning)
            return;
        // Flush any pending batch
        await this.flushBatch();
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
        await this.subscriber.unsubscribe();
        this.isRunning = false;
        logger_js_1.default.info('Invalidation listener stopped');
    }
    // --------------------------------------------------------------------------
    // Publishing Invalidations
    // --------------------------------------------------------------------------
    /**
     * Invalidate a specific key
     */
    async invalidateKey(key, tenantId) {
        return this.publishEvent({
            type: 'key',
            target: key,
            tenantId,
        });
    }
    /**
     * Invalidate keys matching a pattern
     */
    async invalidatePattern(pattern, tenantId) {
        return this.publishEvent({
            type: 'pattern',
            target: pattern,
            tenantId,
        });
    }
    /**
     * Invalidate all keys with a specific tag
     */
    async invalidateTag(tag, tenantId) {
        return this.publishEvent({
            type: 'tag',
            target: tag,
            tenantId,
        });
    }
    /**
     * Invalidate all keys for a tenant
     */
    async invalidateTenant(tenantId) {
        return this.publishEvent({
            type: 'tenant',
            target: tenantId,
            tenantId,
        });
    }
    /**
     * Invalidate all caches
     */
    async invalidateAll() {
        return this.publishEvent({
            type: 'all',
            target: '*',
        });
    }
    /**
     * Batch multiple invalidations
     */
    async invalidateBatch(events) {
        let count = 0;
        for (const event of events) {
            const result = await this.publishEvent(event);
            if (result.data)
                count++;
        }
        return (0, data_envelope_js_1.createDataEnvelope)(count, {
            source: 'CacheInvalidationService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, `Batch invalidation: ${count} events`),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    // --------------------------------------------------------------------------
    // Event Handling
    // --------------------------------------------------------------------------
    /**
     * Register a handler for invalidation events
     */
    onInvalidation(type, handler) {
        const handlers = this.handlers.get(type) ?? [];
        handlers.push(handler);
        this.handlers.set(type, handlers);
    }
    /**
     * Process an incoming invalidation event
     */
    async processEvent(event) {
        // Emit for general listeners
        this.emit('invalidation', event);
        // Call specific handlers
        const handlers = this.handlers.get(event.type) ?? [];
        for (const handler of handlers) {
            try {
                await handler(event);
            }
            catch (error) {
                logger_js_1.default.error({ error, event }, 'Handler error for invalidation event');
            }
        }
        // Also call 'all' handlers for any type
        const allHandlers = this.handlers.get('all') ?? [];
        for (const handler of allHandlers) {
            try {
                await handler(event);
            }
            catch (error) {
                logger_js_1.default.error({ error, event }, 'Handler error for invalidation event');
            }
        }
        logger_js_1.default.debug({ event }, 'Processed invalidation event');
    }
    // --------------------------------------------------------------------------
    // Internal Publishing
    // --------------------------------------------------------------------------
    async publishEvent(eventData) {
        const event = {
            id: (0, uuid_1.v4)(),
            ...eventData,
            timestamp: Date.now(),
            source: this.config.instanceId,
        };
        if (this.config.enableBatching) {
            return this.addToBatch(event);
        }
        return this.publishImmediately(event);
    }
    async publishImmediately(event) {
        try {
            const channel = this.getChannelForType(event.type);
            await this.publisher.publish(channel, JSON.stringify(event));
            this.stats.published++;
            logger_js_1.default.debug({ event }, 'Published invalidation event');
            return (0, data_envelope_js_1.createDataEnvelope)(true, {
                source: 'CacheInvalidationService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Event published'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        catch (error) {
            this.stats.errors++;
            logger_js_1.default.error({ error, event }, 'Failed to publish invalidation event');
            return (0, data_envelope_js_1.createDataEnvelope)(false, {
                source: 'CacheInvalidationService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.FLAG, 'Event publish failed'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
    }
    addToBatch(event) {
        this.eventBatch.push(event);
        // Flush if batch is full
        if (this.eventBatch.length >= this.config.maxBatchSize) {
            setImmediate(() => this.flushBatch());
        }
        // Start timer if not running
        if (!this.batchTimer) {
            this.batchTimer = setTimeout(() => this.flushBatch(), this.config.batchFlushMs);
        }
        return (0, data_envelope_js_1.createDataEnvelope)(true, {
            source: 'CacheInvalidationService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Event batched'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    async flushBatch() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
        if (this.eventBatch.length === 0)
            return;
        const batch = this.eventBatch;
        this.eventBatch = [];
        // Group by channel
        const byChannel = new Map();
        for (const event of batch) {
            const channel = this.getChannelForType(event.type);
            const events = byChannel.get(channel) ?? [];
            events.push(event);
            byChannel.set(channel, events);
        }
        // Publish each group
        const pipeline = this.publisher.pipeline();
        for (const [channel, events] of byChannel) {
            for (const event of events) {
                pipeline.publish(channel, JSON.stringify(event));
            }
        }
        try {
            await pipeline.exec();
            this.stats.published += batch.length;
            this.stats.batches++;
            logger_js_1.default.debug({ count: batch.length }, 'Flushed invalidation batch');
        }
        catch (error) {
            this.stats.errors += batch.length;
            logger_js_1.default.error({ error, count: batch.length }, 'Failed to flush invalidation batch');
        }
    }
    getChannelForType(type) {
        switch (type) {
            case 'key':
                return `${this.config.channelPrefix}:keys`;
            case 'pattern':
                return `${this.config.channelPrefix}:patterns`;
            case 'tag':
                return `${this.config.channelPrefix}:tags`;
            case 'tenant':
                return `${this.config.channelPrefix}:tenants`;
            case 'all':
                return `${this.config.channelPrefix}:all`;
            default:
                return `${this.config.channelPrefix}:keys`;
        }
    }
    // --------------------------------------------------------------------------
    // Stats
    // --------------------------------------------------------------------------
    /**
     * Get invalidation statistics
     */
    getStats() {
        return (0, data_envelope_js_1.createDataEnvelope)({ ...this.stats }, {
            source: 'CacheInvalidationService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Stats retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            published: 0,
            received: 0,
            processed: 0,
            errors: 0,
            batches: 0,
        };
    }
}
exports.CacheInvalidationService = CacheInvalidationService;
// Export singleton factory
let instance = null;
function getCacheInvalidationService(redis, config) {
    if (!instance) {
        instance = new CacheInvalidationService(redis, config);
    }
    return instance;
}
exports.default = CacheInvalidationService;
