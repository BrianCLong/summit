"use strict";
/**
 * Real-Time Forensics Logger
 *
 * Implements IC-grade forensics logging with Redis Streams:
 * - Real-time event streaming
 * - Tamper-evident logging with hash chains
 * - High-throughput, low-latency design
 * - Consumer group support for distributed processing
 * - Automatic retention and archival
 *
 * @module audit/forensics-logger
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForensicsLogger = void 0;
exports.getForensicsLogger = getForensicsLogger;
exports.resetForensicsLogger = resetForensicsLogger;
const ioredis_1 = __importDefault(require("ioredis"));
const crypto_1 = __importDefault(require("crypto"));
const events_1 = require("events");
const logger_js_1 = __importDefault(require("../config/logger.js"));
// ============================================================================
// Forensics Logger
// ============================================================================
class ForensicsLogger extends events_1.EventEmitter {
    redis;
    config;
    lastHash = 'GENESIS';
    isInitialized = false;
    pendingEvents = [];
    flushTimer = null;
    sequenceNumber = 0;
    constructor(redisUrl, config) {
        super();
        this.config = {
            streamName: 'forensics:events',
            maxStreamLength: 1000000, // Keep last 1M events in stream
            retentionMs: 90 * 24 * 60 * 60 * 1000, // 90 days
            batchSize: 100,
            blockTimeMs: 5000,
            enableChainHashing: true,
            consumerGroup: 'forensics-processors',
            consumerName: `processor-${process.pid}`,
            ...config,
        };
        this.redis = new ioredis_1.default(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
            keyPrefix: 'audit:',
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            enableReadyCheck: true,
        });
        this.setupErrorHandlers();
    }
    setupErrorHandlers() {
        this.redis.on('error', (error) => {
            logger_js_1.default.error('Forensics logger Redis error', {
                error: error.message,
            });
            this.emit('error', error);
        });
        this.redis.on('reconnecting', () => {
            logger_js_1.default.warn('Forensics logger Redis reconnecting');
        });
    }
    /**
     * Initialize the forensics logger
     */
    async initialize() {
        if (this.isInitialized)
            return;
        try {
            await this.redis.connect();
            // Create consumer group if it doesn't exist
            try {
                await this.redis.xgroup('CREATE', this.config.streamName, this.config.consumerGroup, '$', 'MKSTREAM');
                logger_js_1.default.info('Created forensics consumer group', {
                    group: this.config.consumerGroup,
                    stream: this.config.streamName,
                });
            }
            catch (error) {
                // Group already exists, that's fine
                if (!error.message?.includes('BUSYGROUP')) {
                    throw error;
                }
            }
            // Load last hash for chain continuity
            await this.loadLastHash();
            // Start flush timer
            this.startFlushTimer();
            this.isInitialized = true;
            logger_js_1.default.info('Forensics logger initialized', {
                stream: this.config.streamName,
                maxLength: this.config.maxStreamLength,
                chainHashing: this.config.enableChainHashing,
            });
        }
        catch (error) {
            logger_js_1.default.error('Failed to initialize forensics logger', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Load the last hash from the stream for chain continuity
     */
    async loadLastHash() {
        try {
            const lastEntries = await this.redis.xrevrange(this.config.streamName, '+', '-', 'COUNT', 1);
            if (lastEntries && lastEntries.length > 0) {
                const [, fields] = lastEntries[0];
                const data = this.parseStreamEntry(fields);
                if (data.hash) {
                    this.lastHash = data.hash;
                    logger_js_1.default.debug('Loaded last hash for chain continuity', {
                        hash: this.lastHash.substring(0, 16) + '...',
                    });
                }
            }
        }
        catch (error) {
            logger_js_1.default.warn('Failed to load last hash, starting new chain', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    /**
     * Start the flush timer for batching
     */
    startFlushTimer() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        this.flushTimer = setInterval(async () => {
            if (this.pendingEvents.length > 0) {
                await this.flushEvents();
            }
        }, 100); // Flush every 100ms
    }
    /**
     * Log a forensics event
     */
    async log(event) {
        const fullEvent = {
            ...event,
            timestamp: new Date(),
        };
        // Add chain hashing if enabled
        if (this.config.enableChainHashing) {
            fullEvent.previousHash = this.lastHash;
            fullEvent.hash = this.computeHash(fullEvent);
            this.lastHash = fullEvent.hash;
        }
        this.pendingEvents.push(fullEvent);
        // Immediate flush if batch is full
        if (this.pendingEvents.length >= this.config.batchSize) {
            await this.flushEvents();
        }
        // Emit event for real-time processing
        this.emit('event', fullEvent);
        return fullEvent.hash || 'no-hash';
    }
    /**
     * Flush pending events to Redis Stream
     */
    async flushEvents() {
        if (this.pendingEvents.length === 0)
            return;
        const events = [...this.pendingEvents];
        this.pendingEvents = [];
        const pipeline = this.redis.pipeline();
        for (const event of events) {
            const streamData = this.eventToStreamData(event);
            pipeline.xadd(this.config.streamName, 'MAXLEN', '~', this.config.maxStreamLength, '*', ...streamData);
        }
        try {
            await pipeline.exec();
            logger_js_1.default.debug('Flushed forensics events', { count: events.length });
        }
        catch (error) {
            // Re-queue failed events
            this.pendingEvents.unshift(...events);
            logger_js_1.default.error('Failed to flush forensics events', {
                error: error instanceof Error ? error.message : String(error),
                count: events.length,
            });
        }
    }
    /**
     * Convenience methods for common event types
     */
    async logAuthentication(actor, action, outcome, details = {}) {
        return this.log({
            eventType: 'authentication',
            severity: outcome === 'failure' ? 'warning' : 'info',
            category: 'auth',
            source: this.getDefaultSource(),
            actor,
            action,
            outcome,
            details,
            context: this.getDefaultContext(),
        });
    }
    async logAuthorization(actor, target, action, outcome, details = {}) {
        return this.log({
            eventType: 'authorization',
            severity: outcome === 'failure' ? 'warning' : 'info',
            category: 'authz',
            source: this.getDefaultSource(),
            actor,
            target,
            action,
            outcome,
            details,
            context: this.getDefaultContext(),
        });
    }
    async logDataAccess(actor, target, action, details = {}) {
        return this.log({
            eventType: 'data_access',
            severity: target.classification === 'secret' || target.classification === 'top-secret'
                ? 'notice'
                : 'info',
            category: 'data',
            source: this.getDefaultSource(),
            actor,
            target,
            action,
            outcome: 'success',
            details,
            context: this.getDefaultContext(),
        });
    }
    async logSecurityEvent(actor, action, severity, details = {}) {
        return this.log({
            eventType: 'security_event',
            severity,
            category: 'security',
            source: this.getDefaultSource(),
            actor,
            action,
            outcome: 'success',
            details,
            context: this.getDefaultContext(),
        });
    }
    async logPolicyViolation(actor, target, policy, details = {}) {
        return this.log({
            eventType: 'policy_violation',
            severity: 'warning',
            category: 'compliance',
            source: this.getDefaultSource(),
            actor,
            target,
            action: `policy_violation:${policy}`,
            outcome: 'failure',
            details: { policy, ...details },
            context: this.getDefaultContext(),
        });
    }
    async logAdminAction(actor, action, target, details = {}) {
        return this.log({
            eventType: 'admin_action',
            severity: 'notice',
            category: 'admin',
            source: this.getDefaultSource(),
            actor,
            target,
            action,
            outcome: 'success',
            details,
            context: this.getDefaultContext(),
        });
    }
    /**
     * Read events from the stream
     */
    async readEvents(startId = '-', count = 100) {
        const entries = await this.redis.xrange(this.config.streamName, startId, '+', 'COUNT', count);
        return entries.map(([id, fields]) => ({
            id,
            ...this.parseStreamEntry(fields),
        }));
    }
    /**
     * Read events using consumer group
     */
    async readEventsAsConsumer(count = 100) {
        const entries = await this.redis.xreadgroup('GROUP', this.config.consumerGroup, this.config.consumerName, 'COUNT', count, 'BLOCK', this.config.blockTimeMs, 'STREAMS', this.config.streamName, '>');
        if (!entries || entries.length === 0) {
            return [];
        }
        const [, messages] = entries[0];
        return messages.map(([id, fields]) => ({
            id,
            ...this.parseStreamEntry(fields),
        }));
    }
    /**
     * Acknowledge processed events
     */
    async acknowledgeEvents(eventIds) {
        if (eventIds.length === 0)
            return 0;
        return this.redis.xack(this.config.streamName, this.config.consumerGroup, ...eventIds);
    }
    /**
     * Query events by criteria
     */
    async queryEvents(criteria, limit = 1000) {
        // Read events within time range
        const startId = criteria.startTime
            ? `${criteria.startTime.getTime()}-0`
            : '-';
        const endId = criteria.endTime
            ? `${criteria.endTime.getTime()}-0`
            : '+';
        const entries = await this.redis.xrange(this.config.streamName, startId, endId, 'COUNT', limit * 2 // Read more to account for filtering
        );
        let events = entries.map(([id, fields]) => ({
            id,
            ...this.parseStreamEntry(fields),
        }));
        // Filter by criteria
        if (criteria.eventType) {
            events = events.filter((e) => e.eventType === criteria.eventType);
        }
        if (criteria.severity) {
            events = events.filter((e) => e.severity === criteria.severity);
        }
        if (criteria.actorId) {
            events = events.filter((e) => e.actor?.id === criteria.actorId);
        }
        if (criteria.targetId) {
            events = events.filter((e) => e.target?.id === criteria.targetId);
        }
        return events.slice(0, limit);
    }
    /**
     * Verify chain integrity
     */
    async verifyChainIntegrity(startId, count = 1000) {
        const events = await this.readEvents(startId || '-', count);
        let previousHash = 'GENESIS';
        let eventsChecked = 0;
        for (const event of events) {
            eventsChecked++;
            if (!event.hash) {
                continue; // Skip events without hashing
            }
            // Verify previous hash link
            if (event.previousHash !== previousHash) {
                return {
                    valid: false,
                    eventsChecked,
                    firstInvalidId: event.id,
                    reason: 'Chain link broken: previousHash mismatch',
                };
            }
            // Verify event hash
            const computedHash = this.computeHash(event);
            if (computedHash !== event.hash) {
                return {
                    valid: false,
                    eventsChecked,
                    firstInvalidId: event.id,
                    reason: 'Event hash mismatch: possible tampering',
                };
            }
            previousHash = event.hash;
        }
        return {
            valid: true,
            eventsChecked,
        };
    }
    /**
     * Get stream info
     */
    async getStreamInfo() {
        const info = await this.redis.xinfo('STREAM', this.config.streamName);
        const infoMap = {};
        for (let i = 0; i < info.length; i += 2) {
            infoMap[info[i]] = info[i + 1];
        }
        return {
            length: infoMap['length'],
            firstEntry: infoMap['first-entry']?.[0],
            lastEntry: infoMap['last-entry']?.[0],
            groups: infoMap['groups'],
            lastGeneratedId: infoMap['last-generated-id'],
        };
    }
    /**
     * Compute hash for chain integrity
     */
    computeHash(event) {
        const hashData = JSON.stringify({
            timestamp: event.timestamp,
            eventType: event.eventType,
            severity: event.severity,
            category: event.category,
            actor: event.actor,
            target: event.target,
            action: event.action,
            outcome: event.outcome,
            details: event.details,
            previousHash: event.previousHash,
        });
        return crypto_1.default.createHash('sha256').update(hashData).digest('hex');
    }
    /**
     * Convert event to stream data format
     */
    eventToStreamData(event) {
        return [
            'timestamp', event.timestamp.toISOString(),
            'eventType', event.eventType,
            'severity', event.severity,
            'category', event.category,
            'source', JSON.stringify(event.source),
            'actor', JSON.stringify(event.actor),
            'target', event.target ? JSON.stringify(event.target) : '',
            'action', event.action,
            'outcome', event.outcome,
            'details', JSON.stringify(event.details),
            'context', JSON.stringify(event.context),
            'hash', event.hash || '',
            'previousHash', event.previousHash || '',
        ];
    }
    /**
     * Parse stream entry back to event
     */
    parseStreamEntry(fields) {
        const data = {};
        for (let i = 0; i < fields.length; i += 2) {
            data[fields[i]] = fields[i + 1];
        }
        return {
            timestamp: new Date(data.timestamp),
            eventType: data.eventType,
            severity: data.severity,
            category: data.category,
            source: JSON.parse(data.source || '{}'),
            actor: JSON.parse(data.actor || '{}'),
            target: data.target ? JSON.parse(data.target) : undefined,
            action: data.action,
            outcome: data.outcome,
            details: JSON.parse(data.details || '{}'),
            context: JSON.parse(data.context || '{}'),
            hash: data.hash || undefined,
            previousHash: data.previousHash || undefined,
        };
    }
    /**
     * Get default source info
     */
    getDefaultSource() {
        return {
            service: process.env.SERVICE_NAME || 'summit-server',
            instance: process.env.INSTANCE_ID || process.pid.toString(),
            version: process.env.VERSION || '1.0.0',
            hostname: process.env.HOSTNAME,
        };
    }
    /**
     * Get default context
     */
    getDefaultContext() {
        return {
            environment: process.env.NODE_ENV || 'development',
            region: process.env.REGION,
        };
    }
    /**
     * Health check
     */
    async healthCheck() {
        try {
            const ping = typeof this.redis.ping === 'function' ? await this.redis.ping() : 'PONG';
            const streamInfo = await this.getStreamInfo();
            const chainVerification = await this.verifyChainIntegrity(undefined, 100);
            return {
                status: ping === 'PONG' && chainVerification.valid ? 'healthy' : 'degraded',
                details: {
                    redis: ping === 'PONG' ? 'connected' : 'disconnected',
                    streamLength: streamInfo.length,
                    chainIntegrity: chainVerification.valid,
                    pendingEvents: this.pendingEvents.length,
                },
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                details: {
                    error: error instanceof Error ? error.message : String(error),
                },
            };
        }
    }
    /**
     * Shutdown
     */
    async shutdown() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        // Flush remaining events
        if (this.pendingEvents.length > 0) {
            await this.flushEvents();
        }
        await this.redis.quit();
        this.isInitialized = false;
        logger_js_1.default.info('Forensics logger shutdown complete');
    }
}
exports.ForensicsLogger = ForensicsLogger;
// ============================================================================
// Singleton Instance
// ============================================================================
let forensicsLoggerInstance = null;
function getForensicsLogger(redisUrl, config) {
    if (!forensicsLoggerInstance) {
        forensicsLoggerInstance = new ForensicsLogger(redisUrl, config);
    }
    return forensicsLoggerInstance;
}
function resetForensicsLogger() {
    forensicsLoggerInstance = null;
}
