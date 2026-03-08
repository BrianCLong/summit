"use strict";
/**
 * Switchboard Event Router
 * Scalable event routing layer that dynamically filters and directs
 * real-time data streams into Summit services based on configurable rules.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventRouter = exports.SwitchboardEventRouter = exports.RoutingDecisionSchema = exports.RoutingRuleSchema = exports.StreamEventSchema = exports.EventCategorySchema = exports.EventPrioritySchema = void 0;
const zod_1 = require("zod");
const events_1 = require("events");
// Event routing schemas
exports.EventPrioritySchema = zod_1.z.enum(['critical', 'high', 'normal', 'low', 'background']);
exports.EventCategorySchema = zod_1.z.enum([
    'system',
    'security',
    'analytics',
    'user_action',
    'integration',
    'ai_pipeline',
    'audit',
    'notification',
]);
exports.StreamEventSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: zod_1.z.string(),
    category: exports.EventCategorySchema,
    priority: exports.EventPrioritySchema,
    source: zod_1.z.string(),
    timestamp: zod_1.z.number(),
    tenantId: zod_1.z.string(),
    correlationId: zod_1.z.string().uuid().optional(),
    causationId: zod_1.z.string().uuid().optional(),
    payload: zod_1.z.record(zod_1.z.unknown()),
    metadata: zod_1.z.record(zod_1.z.string()).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    version: zod_1.z.string().default('1.0'),
});
exports.RoutingRuleSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    enabled: zod_1.z.boolean().default(true),
    priority: zod_1.z.number().int().min(0).max(1000).default(500),
    conditions: zod_1.z.object({
        eventTypes: zod_1.z.array(zod_1.z.string()).optional(),
        categories: zod_1.z.array(exports.EventCategorySchema).optional(),
        priorities: zod_1.z.array(exports.EventPrioritySchema).optional(),
        sources: zod_1.z.array(zod_1.z.string()).optional(),
        tenantIds: zod_1.z.array(zod_1.z.string()).optional(),
        tags: zod_1.z.array(zod_1.z.string()).optional(),
        customFilter: zod_1.z.string().optional(), // JSONPath or JS expression
    }),
    targets: zod_1.z.array(zod_1.z.object({
        service: zod_1.z.string(),
        topic: zod_1.z.string().optional(),
        transform: zod_1.z.string().optional(), // Transform function name
        retryPolicy: zod_1.z.object({
            maxRetries: zod_1.z.number().int().min(0).max(10).default(3),
            backoffMs: zod_1.z.number().int().min(100).default(1000),
            maxBackoffMs: zod_1.z.number().int().min(1000).default(30000),
        }).optional(),
    })),
    rateLimit: zod_1.z.object({
        maxEventsPerSecond: zod_1.z.number().int().min(1).default(1000),
        burstSize: zod_1.z.number().int().min(1).default(100),
    }).optional(),
    deadLetterTarget: zod_1.z.string().optional(),
    ttlMs: zod_1.z.number().int().optional(),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional(),
});
exports.RoutingDecisionSchema = zod_1.z.object({
    eventId: zod_1.z.string(),
    matchedRules: zod_1.z.array(zod_1.z.string()),
    targets: zod_1.z.array(zod_1.z.object({
        service: zod_1.z.string(),
        topic: zod_1.z.string().optional(),
        transformedPayload: zod_1.z.record(zod_1.z.unknown()).optional(),
    })),
    dropped: zod_1.z.boolean(),
    dropReason: zod_1.z.string().optional(),
    processingTimeMs: zod_1.z.number(),
    timestamp: zod_1.z.number(),
});
class ConsoleLogger {
    info(message, meta) {
        console.log(JSON.stringify({ level: 'info', message, ...meta, ts: Date.now() }));
    }
    warn(message, meta) {
        console.warn(JSON.stringify({ level: 'warn', message, ...meta, ts: Date.now() }));
    }
    error(message, meta) {
        console.error(JSON.stringify({ level: 'error', message, ...meta, ts: Date.now() }));
    }
    debug(message, meta) {
        console.debug(JSON.stringify({ level: 'debug', message, ...meta, ts: Date.now() }));
    }
}
class NoopMetrics {
    increment() { }
    histogram() { }
    gauge() { }
}
/**
 * Switchboard Event Router
 * Routes events to target services based on configurable rules
 */
class SwitchboardEventRouter extends events_1.EventEmitter {
    rules = new Map();
    transforms = new Map();
    eventQueue = [];
    options;
    metrics;
    flushTimer = null;
    isProcessing = false;
    // Event handlers for external delivery
    deliveryHandlers = new Map();
    constructor(options = {}) {
        super();
        this.options = {
            maxQueueSize: 10000,
            batchSize: 100,
            flushIntervalMs: 100,
            defaultRetryPolicy: { maxRetries: 3, backoffMs: 1000, maxBackoffMs: 30000 },
            logger: options.logger || new ConsoleLogger(),
            metrics: options.metrics || new NoopMetrics(),
            ...options,
        };
        this.metrics = {
            eventsReceived: 0,
            eventsRouted: 0,
            eventsDropped: 0,
            eventsFailed: 0,
            averageLatencyMs: 0,
            ruleMatchCounts: new Map(),
            targetDeliveryCounts: new Map(),
            errorCounts: new Map(),
        };
        this.registerDefaultTransforms();
        this.startFlushTimer();
    }
    /**
     * Register a routing rule
     */
    registerRule(rule) {
        const validated = exports.RoutingRuleSchema.parse(rule);
        this.rules.set(validated.id, validated);
        this.options.logger.info('Routing rule registered', { ruleId: validated.id, name: validated.name });
        this.emit('rule:registered', validated);
    }
    /**
     * Unregister a routing rule
     */
    unregisterRule(ruleId) {
        const deleted = this.rules.delete(ruleId);
        if (deleted) {
            this.options.logger.info('Routing rule unregistered', { ruleId });
            this.emit('rule:unregistered', ruleId);
        }
        return deleted;
    }
    /**
     * Get all registered rules
     */
    getRules() {
        return Array.from(this.rules.values()).sort((a, b) => b.priority - a.priority);
    }
    /**
     * Register a transform function
     */
    registerTransform(name, fn) {
        this.transforms.set(name, fn);
        this.options.logger.debug('Transform registered', { name });
    }
    /**
     * Register a delivery handler for a target service
     */
    registerDeliveryHandler(service, handler) {
        this.deliveryHandlers.set(service, handler);
        this.options.logger.info('Delivery handler registered', { service });
    }
    /**
     * Route an event through the system
     */
    async route(event, context) {
        const startTime = performance.now();
        this.metrics.eventsReceived++;
        this.options.metrics.increment('switchboard.events.received', { category: event.category });
        try {
            // Validate event
            const validatedEvent = exports.StreamEventSchema.parse(event);
            // Find matching rules
            const matchedRules = this.findMatchingRules(validatedEvent);
            if (matchedRules.length === 0) {
                this.metrics.eventsDropped++;
                this.options.metrics.increment('switchboard.events.dropped', { reason: 'no_matching_rules' });
                return {
                    eventId: validatedEvent.id,
                    matchedRules: [],
                    targets: [],
                    dropped: true,
                    dropReason: 'No matching routing rules',
                    processingTimeMs: performance.now() - startTime,
                    timestamp: Date.now(),
                };
            }
            // Collect all targets from matched rules
            const targets = [];
            for (const rule of matchedRules) {
                this.metrics.ruleMatchCounts.set(rule.id, (this.metrics.ruleMatchCounts.get(rule.id) || 0) + 1);
                for (const target of rule.targets) {
                    let transformedEvent = validatedEvent;
                    // Apply transform if specified
                    if (target.transform && this.transforms.has(target.transform)) {
                        const transformFn = this.transforms.get(target.transform);
                        transformedEvent = await transformFn(validatedEvent, context);
                    }
                    targets.push({
                        service: target.service,
                        topic: target.topic,
                        transformedPayload: transformedEvent.payload,
                    });
                    // Queue for delivery
                    await this.queueForDelivery(transformedEvent, target.service, target.topic);
                    this.metrics.targetDeliveryCounts.set(target.service, (this.metrics.targetDeliveryCounts.get(target.service) || 0) + 1);
                }
            }
            const processingTimeMs = performance.now() - startTime;
            this.updateAverageLatency(processingTimeMs);
            this.metrics.eventsRouted++;
            this.options.metrics.increment('switchboard.events.routed', { category: event.category });
            this.options.metrics.histogram('switchboard.routing.latency', processingTimeMs);
            const decision = {
                eventId: validatedEvent.id,
                matchedRules: matchedRules.map((r) => r.id),
                targets,
                dropped: false,
                processingTimeMs,
                timestamp: Date.now(),
            };
            this.emit('event:routed', decision);
            return decision;
        }
        catch (error) {
            this.metrics.eventsFailed++;
            this.options.metrics.increment('switchboard.events.failed');
            this.options.logger.error('Event routing failed', { eventId: event.id, error: error.message });
            throw error;
        }
    }
    /**
     * Route multiple events in batch
     */
    async routeBatch(events, context) {
        return Promise.all(events.map((event) => this.route(event, context)));
    }
    /**
     * Find rules matching an event
     */
    findMatchingRules(event) {
        const matchedRules = [];
        for (const rule of this.getRules()) {
            if (!rule.enabled)
                continue;
            if (this.matchesConditions(event, rule.conditions)) {
                matchedRules.push(rule);
            }
        }
        return matchedRules;
    }
    /**
     * Check if an event matches rule conditions
     */
    matchesConditions(event, conditions) {
        // Match event types
        if (conditions.eventTypes && conditions.eventTypes.length > 0) {
            const typeMatched = conditions.eventTypes.some((type) => {
                if (type.includes('*')) {
                    const pattern = new RegExp('^' + type.replace(/\*/g, '.*') + '$');
                    return pattern.test(event.type);
                }
                return type === event.type;
            });
            if (!typeMatched)
                return false;
        }
        // Match categories
        if (conditions.categories && conditions.categories.length > 0) {
            if (!conditions.categories.includes(event.category))
                return false;
        }
        // Match priorities
        if (conditions.priorities && conditions.priorities.length > 0) {
            if (!conditions.priorities.includes(event.priority))
                return false;
        }
        // Match sources
        if (conditions.sources && conditions.sources.length > 0) {
            const sourceMatched = conditions.sources.some((source) => {
                if (source.includes('*')) {
                    const pattern = new RegExp('^' + source.replace(/\*/g, '.*') + '$');
                    return pattern.test(event.source);
                }
                return source === event.source;
            });
            if (!sourceMatched)
                return false;
        }
        // Match tenant IDs
        if (conditions.tenantIds && conditions.tenantIds.length > 0) {
            if (!conditions.tenantIds.includes(event.tenantId))
                return false;
        }
        // Match tags
        if (conditions.tags && conditions.tags.length > 0) {
            if (!event.tags || !conditions.tags.some((tag) => event.tags.includes(tag))) {
                return false;
            }
        }
        // Custom filter (simple property matching)
        if (conditions.customFilter) {
            try {
                // Simple JSONPath-like evaluation
                const result = this.evaluateCustomFilter(event, conditions.customFilter);
                if (!result)
                    return false;
            }
            catch (error) {
                this.options.logger.warn('Custom filter evaluation failed', {
                    filter: conditions.customFilter,
                    error: error.message,
                });
                return false;
            }
        }
        return true;
    }
    /**
     * Evaluate custom filter expression
     */
    evaluateCustomFilter(event, filter) {
        // Simple property path evaluation (e.g., "payload.status == 'active'")
        const parts = filter.split(/\s*(==|!=|>|<|>=|<=)\s*/);
        if (parts.length !== 3)
            return true;
        const [path, operator, expectedValue] = parts;
        const actualValue = this.getNestedValue(event, path.trim());
        const expected = expectedValue.trim().replace(/^['"]|['"]$/g, '');
        switch (operator) {
            case '==':
                return String(actualValue) === expected;
            case '!=':
                return String(actualValue) !== expected;
            case '>':
                return Number(actualValue) > Number(expected);
            case '<':
                return Number(actualValue) < Number(expected);
            case '>=':
                return Number(actualValue) >= Number(expected);
            case '<=':
                return Number(actualValue) <= Number(expected);
            default:
                return true;
        }
    }
    /**
     * Get nested value from object
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            if (current && typeof current === 'object') {
                return current[key];
            }
            return undefined;
        }, obj);
    }
    /**
     * Queue event for delivery
     */
    async queueForDelivery(event, service, topic) {
        if (this.eventQueue.length >= this.options.maxQueueSize) {
            this.options.logger.warn('Event queue full, dropping oldest events');
            this.eventQueue = this.eventQueue.slice(-Math.floor(this.options.maxQueueSize * 0.9));
            this.metrics.eventsDropped++;
        }
        // Tag event with routing info
        const routedEvent = {
            ...event,
            metadata: {
                ...event.metadata,
                _targetService: service,
                _targetTopic: topic || 'default',
            },
        };
        this.eventQueue.push(routedEvent);
        // Trigger immediate flush if batch is ready
        if (this.eventQueue.length >= this.options.batchSize) {
            await this.flushQueue();
        }
    }
    /**
     * Flush event queue to delivery handlers
     */
    async flushQueue() {
        if (this.isProcessing || this.eventQueue.length === 0)
            return;
        this.isProcessing = true;
        const batch = this.eventQueue.splice(0, this.options.batchSize);
        // Group events by target service
        const grouped = new Map();
        for (const event of batch) {
            const service = event.metadata?._targetService || 'default';
            if (!grouped.has(service)) {
                grouped.set(service, []);
            }
            grouped.get(service).push(event);
        }
        // Deliver to each service
        const deliveryPromises = [];
        for (const [service, events] of grouped) {
            const handler = this.deliveryHandlers.get(service);
            if (handler) {
                deliveryPromises.push(handler(events, service).catch((error) => {
                    this.options.logger.error('Delivery failed', { service, error: error.message });
                    this.metrics.errorCounts.set(service, (this.metrics.errorCounts.get(service) || 0) + 1);
                    this.emit('delivery:failed', { service, events, error });
                }));
            }
            else {
                this.options.logger.warn('No delivery handler for service', { service });
                this.emit('event:undelivered', events);
            }
        }
        await Promise.allSettled(deliveryPromises);
        this.isProcessing = false;
    }
    /**
     * Start flush timer
     */
    startFlushTimer() {
        this.flushTimer = setInterval(() => {
            this.flushQueue().catch((error) => {
                this.options.logger.error('Flush timer error', { error: error.message });
            });
        }, this.options.flushIntervalMs);
    }
    /**
     * Register default transform functions
     */
    registerDefaultTransforms() {
        // Identity transform
        this.transforms.set('identity', (event) => event);
        // Redact sensitive fields
        this.transforms.set('redact_pii', (event) => ({
            ...event,
            payload: this.redactPII(event.payload),
        }));
        // Flatten nested payload
        this.transforms.set('flatten', (event) => ({
            ...event,
            payload: this.flattenObject(event.payload),
        }));
        // Extract specific fields
        this.transforms.set('extract_summary', (event) => ({
            ...event,
            payload: {
                id: event.id,
                type: event.type,
                source: event.source,
                timestamp: event.timestamp,
                summary: event.payload.summary || event.payload.message || '',
            },
        }));
        // Enrich with metadata
        this.transforms.set('enrich_metadata', (event, context) => ({
            ...event,
            metadata: {
                ...event.metadata,
                requestId: context.requestId,
                actor: context.actor,
                processedAt: Date.now(),
            },
        }));
        // Convert to audit format
        this.transforms.set('to_audit_format', (event) => ({
            ...event,
            type: `audit.${event.type}`,
            category: 'audit',
            payload: {
                ...event.payload,
                auditTimestamp: new Date().toISOString(),
                originalType: event.type,
                originalCategory: event.category,
            },
        }));
    }
    /**
     * Redact PII from object
     */
    redactPII(obj) {
        const piiFields = ['email', 'phone', 'ssn', 'password', 'secret', 'token', 'apiKey'];
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            if (piiFields.some((f) => key.toLowerCase().includes(f))) {
                result[key] = '[REDACTED]';
            }
            else if (typeof value === 'object' && value !== null) {
                result[key] = this.redactPII(value);
            }
            else {
                result[key] = value;
            }
        }
        return result;
    }
    /**
     * Flatten nested object
     */
    flattenObject(obj, prefix = '') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            const newKey = prefix ? `${prefix}.${key}` : key;
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                Object.assign(result, this.flattenObject(value, newKey));
            }
            else {
                result[newKey] = value;
            }
        }
        return result;
    }
    /**
     * Update average latency metric
     */
    updateAverageLatency(latencyMs) {
        const total = this.metrics.eventsRouted;
        const currentAvg = this.metrics.averageLatencyMs;
        this.metrics.averageLatencyMs = (currentAvg * (total - 1) + latencyMs) / total;
    }
    /**
     * Get router metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Get queue status
     */
    getQueueStatus() {
        return {
            size: this.eventQueue.length,
            maxSize: this.options.maxQueueSize,
            isProcessing: this.isProcessing,
        };
    }
    /**
     * Shutdown the router
     */
    async shutdown() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        // Flush remaining events
        while (this.eventQueue.length > 0) {
            await this.flushQueue();
        }
        this.options.logger.info('Event router shutdown complete');
    }
}
exports.SwitchboardEventRouter = SwitchboardEventRouter;
// Export singleton instance
exports.eventRouter = new SwitchboardEventRouter();
