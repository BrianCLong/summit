"use strict";
// @ts-nocheck
/**
 * Unified Audit Sink
 *
 * Central ingestion point for audit events from all services.
 * Provides a unified interface with backpressure handling to ensure
 * services are never blocked by slow audit logging.
 *
 * Features:
 * - Non-blocking event submission
 * - Backpressure signaling via Redis pub/sub
 * - Event validation and normalization
 * - Retry with exponential backoff
 * - Dead letter queue for failed events
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SINK_CONFIG = exports.AuditSink = void 0;
const events_1 = require("events");
const crypto_1 = require("crypto");
const ioredis_1 = __importDefault(require("ioredis"));
const zod_1 = require("zod");
/**
 * Validation schema for audit event input
 */
const AuditEventInputSchema = zod_1.z.object({
    eventType: zod_1.z.string().min(1),
    level: zod_1.z.enum(['debug', 'info', 'warn', 'error', 'critical']),
    correlationId: zod_1.z.string().uuid(),
    tenantId: zod_1.z.string().min(1),
    serviceId: zod_1.z.string().min(1),
    serviceName: zod_1.z.string().min(1),
    environment: zod_1.z.enum(['development', 'staging', 'production']),
    action: zod_1.z.string().min(1),
    outcome: zod_1.z.enum(['success', 'failure', 'partial', 'pending', 'denied']),
    message: zod_1.z.string().min(1),
    details: zod_1.z.record(zod_1.z.unknown()).optional(),
    userId: zod_1.z.string().optional(),
    resourceType: zod_1.z.string().optional(),
    resourceId: zod_1.z.string().optional(),
    criticalCategory: zod_1.z.string().optional(),
    complianceRelevant: zod_1.z.boolean().optional(),
    complianceFrameworks: zod_1.z.array(zod_1.z.string()).optional(),
    ipAddress: zod_1.z.string().optional(),
    userAgent: zod_1.z.string().optional(),
    sessionId: zod_1.z.string().uuid().optional(),
    requestId: zod_1.z.string().uuid().optional(),
    traceId: zod_1.z.string().optional(),
    spanId: zod_1.z.string().optional(),
    oldValues: zod_1.z.record(zod_1.z.unknown()).optional(),
    newValues: zod_1.z.record(zod_1.z.unknown()).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
/**
 * Unified audit sink for event ingestion
 */
class AuditSink extends events_1.EventEmitter {
    redis;
    subscriber;
    config;
    backpressureActive = false;
    connected = false;
    constructor(config) {
        super();
        this.config = config;
        // Create Redis connections
        this.redis = new ioredis_1.default({
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password,
            db: config.redis.db,
            retryStrategy: (times) => {
                const delay = Math.min(times * 100, 3000);
                return delay;
            },
        });
        this.subscriber = new ioredis_1.default({
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password,
            db: config.redis.db,
        });
        this.setupSubscriptions();
    }
    /**
     * Initialize the sink
     */
    async initialize() {
        await this.redis.ping();
        this.connected = true;
        this.emit('connected');
    }
    /**
     * Submit an audit event to the sink
     * Returns immediately - event is queued for processing
     */
    async submit(input) {
        const eventId = (0, crypto_1.randomUUID)();
        try {
            // Validate input
            const validation = AuditEventInputSchema.safeParse(input);
            if (!validation.success) {
                return {
                    success: false,
                    eventId,
                    queued: false,
                    error: `Validation failed: ${validation.error.message}`,
                };
            }
            // Check queue size for backpressure
            const queueSize = await this.redis.llen(this.config.queueName);
            if (queueSize >= this.config.maxQueueSize) {
                // For critical events, try to push anyway
                if (this.isCriticalEvent(input)) {
                    // Use priority queue for critical events
                    await this.pushToPriorityQueue(eventId, input);
                    return { success: true, eventId, queued: true };
                }
                // Signal backpressure
                if (!this.backpressureActive) {
                    this.backpressureActive = true;
                    await this.redis.publish(this.config.backpressureChannel, JSON.stringify({ active: true, queueSize }));
                    this.emit('backpressure', true);
                }
                return {
                    success: false,
                    eventId,
                    queued: false,
                    error: 'Queue full - backpressure active',
                };
            }
            // Enrich event
            const enrichedEvent = this.enrichEvent(eventId, input);
            // Push to queue
            await this.redis.rpush(this.config.queueName, JSON.stringify(enrichedEvent));
            // Release backpressure if queue is below threshold
            if (this.backpressureActive &&
                queueSize < this.config.maxQueueSize * 0.5) {
                this.backpressureActive = false;
                await this.redis.publish(this.config.backpressureChannel, JSON.stringify({ active: false, queueSize }));
                this.emit('backpressure', false);
            }
            return { success: true, eventId, queued: true };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.emit('error', { eventId, error: errorMessage });
            return {
                success: false,
                eventId,
                queued: false,
                error: errorMessage,
            };
        }
    }
    /**
     * Submit multiple events in batch
     */
    async submitBatch(inputs) {
        const results = [];
        // Use pipeline for efficiency
        const pipeline = this.redis.pipeline();
        const enrichedEvents = [];
        const priorityEvents = [];
        let queueSize = await this.redis.llen(this.config.queueName);
        let pipelineHasCommands = false;
        for (const input of inputs) {
            const eventId = (0, crypto_1.randomUUID)();
            const validation = AuditEventInputSchema.safeParse(input);
            if (!validation.success) {
                results.push({
                    success: false,
                    eventId,
                    queued: false,
                    error: `Validation failed: ${validation.error.message}`,
                });
                continue;
            }
            const isCritical = this.isCriticalEvent(input);
            if (queueSize >= this.config.maxQueueSize && !isCritical) {
                if (!this.backpressureActive) {
                    this.backpressureActive = true;
                    await this.redis.publish(this.config.backpressureChannel, JSON.stringify({ active: true, queueSize }));
                    this.emit('backpressure', true);
                }
                results.push({
                    success: false,
                    eventId,
                    queued: false,
                    error: 'Queue full - backpressure active',
                });
                continue;
            }
            const enrichedEvent = this.enrichEvent(eventId, input);
            const serializedEvent = JSON.stringify(enrichedEvent);
            if (queueSize >= this.config.maxQueueSize && isCritical) {
                priorityEvents.push({ eventId, event: enrichedEvent });
                pipeline.rpush(`${this.config.queueName}:priority`, serializedEvent);
                pipelineHasCommands = true;
            }
            else {
                enrichedEvents.push({ eventId, event: enrichedEvent });
                pipeline.rpush(this.config.queueName, serializedEvent);
                queueSize += 1;
                pipelineHasCommands = true;
            }
        }
        try {
            if (pipelineHasCommands) {
                await pipeline.exec();
            }
            for (const { eventId } of enrichedEvents) {
                results.push({ success: true, eventId, queued: true });
            }
            for (const { eventId } of priorityEvents) {
                results.push({ success: true, eventId, queued: true });
            }
            if (this.backpressureActive &&
                queueSize < this.config.maxQueueSize * 0.5) {
                this.backpressureActive = false;
                await this.redis.publish(this.config.backpressureChannel, JSON.stringify({ active: false, queueSize }));
                this.emit('backpressure', false);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            for (const { eventId } of enrichedEvents) {
                results.push({
                    success: false,
                    eventId,
                    queued: false,
                    error: errorMessage,
                });
            }
            for (const { eventId } of priorityEvents) {
                results.push({
                    success: false,
                    eventId,
                    queued: false,
                    error: errorMessage,
                });
            }
        }
        return results;
    }
    /**
     * Get queue status
     */
    async getQueueStatus() {
        const [queueSize, priorityQueueSize, deadLetterQueueSize] = await Promise.all([
            this.redis.llen(this.config.queueName),
            this.redis.llen(`${this.config.queueName}:priority`),
            this.redis.llen(this.config.deadLetterQueueName),
        ]);
        return {
            queueSize,
            priorityQueueSize,
            deadLetterQueueSize,
            backpressureActive: this.backpressureActive,
        };
    }
    /**
     * Check if backpressure is active
     */
    isBackpressureActive() {
        return this.backpressureActive;
    }
    /**
     * Close the sink
     */
    async close() {
        await this.subscriber.quit();
        await this.redis.quit();
        this.connected = false;
    }
    /**
     * Setup Redis subscriptions for backpressure notifications
     */
    setupSubscriptions() {
        this.subscriber.subscribe(this.config.backpressureChannel);
        this.subscriber.on('message', (channel, message) => {
            if (channel === this.config.backpressureChannel) {
                try {
                    const data = JSON.parse(message);
                    this.backpressureActive = data.active;
                    this.emit('backpressure', data.active);
                }
                catch {
                    // Ignore malformed messages
                }
            }
        });
    }
    /**
     * Enrich event with timestamp and ID
     */
    enrichEvent(eventId, input) {
        return {
            ...input,
            id: eventId,
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            details: input.details || {},
            complianceRelevant: input.complianceRelevant || false,
            complianceFrameworks: input.complianceFrameworks || [],
        };
    }
    /**
     * Push to priority queue for critical events
     */
    async pushToPriorityQueue(eventId, input) {
        const enrichedEvent = this.enrichEvent(eventId, input);
        await this.redis.rpush(`${this.config.queueName}:priority`, JSON.stringify(enrichedEvent));
    }
    /**
     * Check if an event is critical
     */
    isCriticalEvent(input) {
        if (input.criticalCategory)
            return true;
        if (input.level === 'critical' || input.level === 'error')
            return true;
        if (input.complianceRelevant)
            return true;
        const criticalTypes = [
            'security_alert',
            'data_breach',
            'access_denied',
            'anomaly_detected',
        ];
        return criticalTypes.includes(input.eventType);
    }
}
exports.AuditSink = AuditSink;
/**
 * Default sink configuration
 */
exports.DEFAULT_SINK_CONFIG = {
    queueName: 'audit:events',
    deadLetterQueueName: 'audit:events:dlq',
    maxRetries: 3,
    retryDelayMs: 1000,
    backpressureChannel: 'audit:backpressure',
    maxQueueSize: 100000,
};
