/**
 * Switchboard Event Router
 * Scalable event routing layer that dynamically filters and directs
 * real-time data streams into Summit services based on configurable rules.
 */

import { z } from 'zod';
import { EventEmitter } from 'events';
import { SwitchboardContext, SwitchboardTarget } from './types';

// Event routing schemas
export const EventPrioritySchema = z.enum(['critical', 'high', 'normal', 'low', 'background']);
export type EventPriority = z.infer<typeof EventPrioritySchema>;

export const EventCategorySchema = z.enum([
  'system',
  'security',
  'analytics',
  'user_action',
  'integration',
  'ai_pipeline',
  'audit',
  'notification',
]);
export type EventCategory = z.infer<typeof EventCategorySchema>;

export const StreamEventSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  category: EventCategorySchema,
  priority: EventPrioritySchema,
  source: z.string(),
  timestamp: z.number(),
  tenantId: z.string(),
  correlationId: z.string().uuid().optional(),
  causationId: z.string().uuid().optional(),
  payload: z.record(z.unknown()),
  metadata: z.record(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  version: z.string().default('1.0'),
});

export type StreamEvent = z.infer<typeof StreamEventSchema>;

export const RoutingRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  priority: z.number().int().min(0).max(1000).default(500),
  conditions: z.object({
    eventTypes: z.array(z.string()).optional(),
    categories: z.array(EventCategorySchema).optional(),
    priorities: z.array(EventPrioritySchema).optional(),
    sources: z.array(z.string()).optional(),
    tenantIds: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    customFilter: z.string().optional(), // JSONPath or JS expression
  }),
  targets: z.array(z.object({
    service: z.string(),
    topic: z.string().optional(),
    transform: z.string().optional(), // Transform function name
    retryPolicy: z.object({
      maxRetries: z.number().int().min(0).max(10).default(3),
      backoffMs: z.number().int().min(100).default(1000),
      maxBackoffMs: z.number().int().min(1000).default(30000),
    }).optional(),
  })),
  rateLimit: z.object({
    maxEventsPerSecond: z.number().int().min(1).default(1000),
    burstSize: z.number().int().min(1).default(100),
  }).optional(),
  deadLetterTarget: z.string().optional(),
  ttlMs: z.number().int().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type RoutingRule = z.infer<typeof RoutingRuleSchema>;

export const RoutingDecisionSchema = z.object({
  eventId: z.string(),
  matchedRules: z.array(z.string()),
  targets: z.array(z.object({
    service: z.string(),
    topic: z.string().optional(),
    transformedPayload: z.record(z.unknown()).optional(),
  })),
  dropped: z.boolean(),
  dropReason: z.string().optional(),
  processingTimeMs: z.number(),
  timestamp: z.number(),
});

export type RoutingDecision = z.infer<typeof RoutingDecisionSchema>;

// Transform functions registry
type TransformFn = (event: StreamEvent, context: SwitchboardContext) => StreamEvent | Promise<StreamEvent>;

interface RouterMetrics {
  eventsReceived: number;
  eventsRouted: number;
  eventsDropped: number;
  eventsFailed: number;
  averageLatencyMs: number;
  ruleMatchCounts: Map<string, number>;
  targetDeliveryCounts: Map<string, number>;
  errorCounts: Map<string, number>;
}

interface RouterOptions {
  maxQueueSize?: number;
  batchSize?: number;
  flushIntervalMs?: number;
  defaultRetryPolicy?: RoutingRule['targets'][0]['retryPolicy'];
  logger?: Logger;
  metrics?: MetricsClient;
}

interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

interface MetricsClient {
  increment(metric: string, tags?: Record<string, string>): void;
  histogram(metric: string, value: number, tags?: Record<string, string>): void;
  gauge(metric: string, value: number, tags?: Record<string, string>): void;
}

class ConsoleLogger implements Logger {
  info(message: string, meta?: Record<string, unknown>) {
    console.log(JSON.stringify({ level: 'info', message, ...meta, ts: Date.now() }));
  }
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(JSON.stringify({ level: 'warn', message, ...meta, ts: Date.now() }));
  }
  error(message: string, meta?: Record<string, unknown>) {
    console.error(JSON.stringify({ level: 'error', message, ...meta, ts: Date.now() }));
  }
  debug(message: string, meta?: Record<string, unknown>) {
    console.debug(JSON.stringify({ level: 'debug', message, ...meta, ts: Date.now() }));
  }
}

class NoopMetrics implements MetricsClient {
  increment() {}
  histogram() {}
  gauge() {}
}

/**
 * Switchboard Event Router
 * Routes events to target services based on configurable rules
 */
export class SwitchboardEventRouter extends EventEmitter {
  private rules: Map<string, RoutingRule> = new Map();
  private transforms: Map<string, TransformFn> = new Map();
  private eventQueue: StreamEvent[] = [];
  private options: Required<RouterOptions>;
  private metrics: RouterMetrics;
  private flushTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  // Event handlers for external delivery
  private deliveryHandlers: Map<string, (events: StreamEvent[], target: string) => Promise<void>> = new Map();

  constructor(options: RouterOptions = {}) {
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
  registerRule(rule: RoutingRule): void {
    const validated = RoutingRuleSchema.parse(rule);
    this.rules.set(validated.id, validated);
    this.options.logger.info('Routing rule registered', { ruleId: validated.id, name: validated.name });
    this.emit('rule:registered', validated);
  }

  /**
   * Unregister a routing rule
   */
  unregisterRule(ruleId: string): boolean {
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
  getRules(): RoutingRule[] {
    return Array.from(this.rules.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Register a transform function
   */
  registerTransform(name: string, fn: TransformFn): void {
    this.transforms.set(name, fn);
    this.options.logger.debug('Transform registered', { name });
  }

  /**
   * Register a delivery handler for a target service
   */
  registerDeliveryHandler(
    service: string,
    handler: (events: StreamEvent[], target: string) => Promise<void>
  ): void {
    this.deliveryHandlers.set(service, handler);
    this.options.logger.info('Delivery handler registered', { service });
  }

  /**
   * Route an event through the system
   */
  async route(event: StreamEvent, context: SwitchboardContext): Promise<RoutingDecision> {
    const startTime = performance.now();
    this.metrics.eventsReceived++;
    this.options.metrics.increment('switchboard.events.received', { category: event.category });

    try {
      // Validate event
      const validatedEvent = StreamEventSchema.parse(event);

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
      const targets: RoutingDecision['targets'] = [];

      for (const rule of matchedRules) {
        this.metrics.ruleMatchCounts.set(
          rule.id,
          (this.metrics.ruleMatchCounts.get(rule.id) || 0) + 1
        );

        for (const target of rule.targets) {
          let transformedEvent = validatedEvent;

          // Apply transform if specified
          if (target.transform && this.transforms.has(target.transform)) {
            const transformFn = this.transforms.get(target.transform)!;
            transformedEvent = await transformFn(validatedEvent, context);
          }

          targets.push({
            service: target.service,
            topic: target.topic,
            transformedPayload: transformedEvent.payload,
          });

          // Queue for delivery
          await this.queueForDelivery(transformedEvent, target.service, target.topic);

          this.metrics.targetDeliveryCounts.set(
            target.service,
            (this.metrics.targetDeliveryCounts.get(target.service) || 0) + 1
          );
        }
      }

      const processingTimeMs = performance.now() - startTime;
      this.updateAverageLatency(processingTimeMs);
      this.metrics.eventsRouted++;
      this.options.metrics.increment('switchboard.events.routed', { category: event.category });
      this.options.metrics.histogram('switchboard.routing.latency', processingTimeMs);

      const decision: RoutingDecision = {
        eventId: validatedEvent.id,
        matchedRules: matchedRules.map((r) => r.id),
        targets,
        dropped: false,
        processingTimeMs,
        timestamp: Date.now(),
      };

      this.emit('event:routed', decision);
      return decision;
    } catch (error) {
      this.metrics.eventsFailed++;
      this.options.metrics.increment('switchboard.events.failed');
      this.options.logger.error('Event routing failed', { eventId: event.id, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Route multiple events in batch
   */
  async routeBatch(events: StreamEvent[], context: SwitchboardContext): Promise<RoutingDecision[]> {
    return Promise.all(events.map((event) => this.route(event, context)));
  }

  /**
   * Find rules matching an event
   */
  private findMatchingRules(event: StreamEvent): RoutingRule[] {
    const matchedRules: RoutingRule[] = [];

    for (const rule of this.getRules()) {
      if (!rule.enabled) continue;

      if (this.matchesConditions(event, rule.conditions)) {
        matchedRules.push(rule);
      }
    }

    return matchedRules;
  }

  /**
   * Check if an event matches rule conditions
   */
  private matchesConditions(
    event: StreamEvent,
    conditions: RoutingRule['conditions']
  ): boolean {
    // Match event types
    if (conditions.eventTypes && conditions.eventTypes.length > 0) {
      const typeMatched = conditions.eventTypes.some((type) => {
        if (type.includes('*')) {
          const pattern = new RegExp('^' + type.replace(/\*/g, '.*') + '$');
          return pattern.test(event.type);
        }
        return type === event.type;
      });
      if (!typeMatched) return false;
    }

    // Match categories
    if (conditions.categories && conditions.categories.length > 0) {
      if (!conditions.categories.includes(event.category)) return false;
    }

    // Match priorities
    if (conditions.priorities && conditions.priorities.length > 0) {
      if (!conditions.priorities.includes(event.priority)) return false;
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
      if (!sourceMatched) return false;
    }

    // Match tenant IDs
    if (conditions.tenantIds && conditions.tenantIds.length > 0) {
      if (!conditions.tenantIds.includes(event.tenantId)) return false;
    }

    // Match tags
    if (conditions.tags && conditions.tags.length > 0) {
      if (!event.tags || !conditions.tags.some((tag) => event.tags!.includes(tag))) {
        return false;
      }
    }

    // Custom filter (simple property matching)
    if (conditions.customFilter) {
      try {
        // Simple JSONPath-like evaluation
        const result = this.evaluateCustomFilter(event, conditions.customFilter);
        if (!result) return false;
      } catch (error) {
        this.options.logger.warn('Custom filter evaluation failed', {
          filter: conditions.customFilter,
          error: (error as Error).message,
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate custom filter expression
   */
  private evaluateCustomFilter(event: StreamEvent, filter: string): boolean {
    // Simple property path evaluation (e.g., "payload.status == 'active'")
    const parts = filter.split(/\s*(==|!=|>|<|>=|<=)\s*/);
    if (parts.length !== 3) return true;

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
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Queue event for delivery
   */
  private async queueForDelivery(
    event: StreamEvent,
    service: string,
    topic?: string
  ): Promise<void> {
    if (this.eventQueue.length >= this.options.maxQueueSize) {
      this.options.logger.warn('Event queue full, dropping oldest events');
      this.eventQueue = this.eventQueue.slice(-Math.floor(this.options.maxQueueSize * 0.9));
      this.metrics.eventsDropped++;
    }

    // Tag event with routing info
    const routedEvent: StreamEvent = {
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
  private async flushQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) return;

    this.isProcessing = true;
    const batch = this.eventQueue.splice(0, this.options.batchSize);

    // Group events by target service
    const grouped = new Map<string, StreamEvent[]>();
    for (const event of batch) {
      const service = event.metadata?._targetService as string || 'default';
      if (!grouped.has(service)) {
        grouped.set(service, []);
      }
      grouped.get(service)!.push(event);
    }

    // Deliver to each service
    const deliveryPromises: Promise<void>[] = [];
    for (const [service, events] of grouped) {
      const handler = this.deliveryHandlers.get(service);
      if (handler) {
        deliveryPromises.push(
          handler(events, service).catch((error) => {
            this.options.logger.error('Delivery failed', { service, error: (error as Error).message });
            this.metrics.errorCounts.set(service, (this.metrics.errorCounts.get(service) || 0) + 1);
            this.emit('delivery:failed', { service, events, error });
          })
        );
      } else {
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
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushQueue().catch((error) => {
        this.options.logger.error('Flush timer error', { error: (error as Error).message });
      });
    }, this.options.flushIntervalMs);
  }

  /**
   * Register default transform functions
   */
  private registerDefaultTransforms(): void {
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
      category: 'audit' as EventCategory,
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
  private redactPII(obj: Record<string, unknown>): Record<string, unknown> {
    const piiFields = ['email', 'phone', 'ssn', 'password', 'secret', 'token', 'apiKey'];
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (piiFields.some((f) => key.toLowerCase().includes(f))) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.redactPII(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Flatten nested object
   */
  private flattenObject(
    obj: Record<string, unknown>,
    prefix = ''
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(result, this.flattenObject(value as Record<string, unknown>, newKey));
      } else {
        result[newKey] = value;
      }
    }

    return result;
  }

  /**
   * Update average latency metric
   */
  private updateAverageLatency(latencyMs: number): void {
    const total = this.metrics.eventsRouted;
    const currentAvg = this.metrics.averageLatencyMs;
    this.metrics.averageLatencyMs = (currentAvg * (total - 1) + latencyMs) / total;
  }

  /**
   * Get router metrics
   */
  getMetrics(): RouterMetrics {
    return { ...this.metrics };
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { size: number; maxSize: number; isProcessing: boolean } {
    return {
      size: this.eventQueue.length,
      maxSize: this.options.maxQueueSize,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Shutdown the router
   */
  async shutdown(): Promise<void> {
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

// Export singleton instance
export const eventRouter = new SwitchboardEventRouter();
