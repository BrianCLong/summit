# Event-Driven Architecture Best Practices

## Event Design

### 1. Event Naming

**Use past tense for event names:**
```typescript
// Good
'InvestigationCreated'
'EntityEnriched'
'ThreatDetected'

// Bad
'CreateInvestigation'
'EnrichEntity'
'DetectThreat'
```

**Be specific and descriptive:**
```typescript
// Good
'HighPriorityThreatDetected'
'InvestigationAssignedToAnalyst'

// Bad
'Event'
'Update'
'Changed'
```

### 2. Event Structure

**Include complete context:**
```typescript
interface WellDesignedEvent {
  // Identity
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;

  // Timing
  timestamp: Date;
  version: number;

  // Causality
  correlationId?: string;
  causationId?: string;

  // Complete data (avoid requiring lookups)
  payload: {
    // All necessary data for consumers
    entityId: string;
    entityData: {...},
    changedFields: string[],
    previousValues?: {...},
    metadata: {...}
  };

  // Audit
  userId?: string;
  source: string;
}
```

**Don't store sensitive data in events:**
```typescript
// Bad
{
  eventType: 'UserRegistered',
  payload: {
    password: 'secret123',  // Never store passwords!
    ssn: '123-45-6789'      // Never store PII!
  }
}

// Good
{
  eventType: 'UserRegistered',
  payload: {
    userId: 'user-123',
    email: 'user@example.com',
    passwordHash: '$2b$...',  // Hashed
    hasCompletedKyc: true     // Flag, not data
  }
}
```

### 3. Event Versioning

**Version events from day one:**
```typescript
{
  eventType: 'InvestigationCreated',
  version: 1,  // Start at 1
  payload: {...}
}
```

**Use upcasters for evolution:**
```typescript
// V1 -> V2: Added priority field
upcasterChain.register('InvestigationCreated', {
  fromVersion: 1,
  toVersion: 2,
  upcast: UpcastHelpers.addField('priority', 3)
});

// V2 -> V3: Renamed assignee to assignedTo
upcasterChain.register('InvestigationCreated', {
  fromVersion: 2,
  toVersion: 3,
  upcast: UpcastHelpers.renameField('assignee', 'assignedTo')
});
```

## Message Handling

### 1. Idempotency

**Always design idempotent handlers:**
```typescript
await eventBus.subscribe('entity.updated', async (message) => {
  const { entityId, version, timestamp } = message.payload;

  // Use message ID for deduplication
  const processed = await redis.get(`processed:${message.metadata.messageId}`);
  if (processed) {
    logger.debug('Already processed, skipping');
    return;
  }

  // Process the message
  await updateEntity(entityId, message.payload);

  // Mark as processed (with TTL to prevent unbounded growth)
  await redis.setex(
    `processed:${message.metadata.messageId}`,
    86400,  // 24 hours
    '1'
  );
});
```

**Alternative: Use version numbers:**
```typescript
await eventBus.subscribe('entity.updated', async (message) => {
  const { entityId, version } = message.payload;

  const currentVersion = await getEntityVersion(entityId);

  // Only process if version is newer
  if (version <= currentVersion) {
    logger.debug('Stale event, skipping');
    return;
  }

  await updateEntity(entityId, message.payload);
});
```

### 2. Error Handling

**Use retries with exponential backoff:**
```typescript
await eventBus.subscribe('critical.task', handler, {
  maxRetries: 5,
  retryBackoff: 'exponential',
  retryDelay: 1000,  // Start with 1 second
  deadLetterQueue: 'dlq-critical'
});
```

**Implement circuit breakers:**
```typescript
const breaker = new CircuitBreaker(externalService.call, {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

await eventBus.subscribe('external.call', async (message) => {
  try {
    const result = await breaker.fire(message.payload);
    await processResult(result);
  } catch (err) {
    if (breaker.opened) {
      logger.warn('Circuit breaker open, queueing for retry');
      await retryQueue.enqueue(message);
    } else {
      throw err;
    }
  }
});
```

### 3. Dead Letter Queue Management

**Monitor and alert:**
```typescript
setInterval(async () => {
  const stats = await dlq.getStats();

  if (stats.totalMessages > 100) {
    await alertService.send({
      severity: 'high',
      message: `DLQ has ${stats.totalMessages} messages`
    });
  }
}, 60000);  // Check every minute
```

**Implement DLQ processors:**
```typescript
class DLQProcessor {
  async processFailedMessages(): Promise<void> {
    const messages = await dlq.getMessages(0, 100);

    for (const dlqMessage of messages) {
      const { envelope, failureReason } = dlqMessage;

      // Analyze failure
      if (this.isRetryable(failureReason)) {
        // Replay message
        await dlq.replay(envelope.metadata.messageId);
      } else {
        // Log for manual intervention
        await this.logForManualReview(dlqMessage);
      }
    }
  }
}
```

## Performance

### 1. Batching

**Batch event processing:**
```typescript
class BatchedEventProcessor {
  private batch: Event[] = [];
  private timer: NodeJS.Timeout;

  constructor(
    private batchSize: number = 100,
    private batchTimeout: number = 1000
  ) {}

  async addEvent(event: Event): Promise<void> {
    this.batch.push(event);

    if (this.batch.length >= this.batchSize) {
      await this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.batchTimeout);
    }
  }

  async flush(): Promise<void> {
    if (this.batch.length === 0) return;

    const events = [...this.batch];
    this.batch = [];

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    await this.processBatch(events);
  }

  private async processBatch(events: Event[]): Promise<void> {
    // Bulk insert to database
    await db.query(`
      INSERT INTO events (id, type, payload)
      SELECT * FROM UNNEST($1::uuid[], $2::text[], $3::jsonb[])
    `, [
      events.map(e => e.id),
      events.map(e => e.type),
      events.map(e => e.payload)
    ]);
  }
}
```

### 2. Caching

**Cache query results:**
```typescript
queryBus.register({
  queryType: 'GetInvestigation',
  handler: async (query) => {
    const investigation = await db.findInvestigation(query.parameters.id);
    return { success: true, data: investigation };
  },
  cacheable: true,
  cacheTTL: 300  // 5 minutes
});

// Invalidate on changes
commandBus.register({
  commandType: 'UpdateInvestigation',
  handler: async (command) => {
    await db.updateInvestigation(command.payload);

    // Invalidate cache
    await queryBus.invalidateCache('GetInvestigation', {
      id: command.payload.id
    });

    return { success: true };
  }
});
```

### 3. Backpressure

**Handle backpressure:**
```typescript
await eventBus.subscribeQueue('slow-tasks', handler, {
  prefetchCount: 1,  // Process one at a time
});

// Or use rate limiting
const rateLimiter = new RateLimiter({
  tokensPerInterval: 100,
  interval: 'second'
});

await eventBus.subscribe('high-volume', async (message) => {
  await rateLimiter.removeTokens(1);
  await handler(message);
});
```

## Monitoring

### 1. Metrics

**Track key metrics:**
```typescript
class MetricsCollector {
  private metrics = {
    messagesPublished: new Counter('messages_published'),
    messagesConsumed: new Counter('messages_consumed'),
    messagesFailed: new Counter('messages_failed'),
    processingTime: new Histogram('message_processing_seconds'),
    queueDepth: new Gauge('queue_depth')
  };

  recordPublish(topic: string): void {
    this.metrics.messagesPublished.inc({ topic });
  }

  recordConsume(topic: string, durationMs: number): void {
    this.metrics.messagesConsumed.inc({ topic });
    this.metrics.processingTime.observe(durationMs / 1000);
  }

  recordFailure(topic: string, error: string): void {
    this.metrics.messagesFailed.inc({ topic, error });
  }

  updateQueueDepth(queue: string, depth: number): void {
    this.metrics.queueDepth.set({ queue }, depth);
  }
}
```

### 2. Logging

**Structured logging:**
```typescript
logger.info({
  eventType: 'InvestigationCreated',
  aggregateId: 'inv-123',
  userId: 'analyst-1',
  correlationId: 'corr-456',
  duration: 234
}, 'Investigation created');
```

**Log levels:**
- ERROR: Failures requiring immediate attention
- WARN: Degraded performance, retries
- INFO: Business events, state changes
- DEBUG: Detailed flow information

### 3. Distributed Tracing

**Implement tracing:**
```typescript
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('event-bus');

await eventBus.subscribe('task', async (message) => {
  const span = tracer.startSpan('process-task', {
    attributes: {
      'message.id': message.metadata.messageId,
      'message.type': message.topic
    }
  });

  try {
    await handler(message);
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (err) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: err.message
    });
    throw err;
  } finally {
    span.end();
  }
});
```

## Security

### 1. Authentication & Authorization

**Validate permissions:**
```typescript
commandBus.addValidator(async (command) => {
  const { userId } = command.metadata;

  if (!userId) {
    return { valid: false, errors: ['Authentication required'] };
  }

  const hasPermission = await authService.checkPermission(
    userId,
    command.commandType
  );

  if (!hasPermission) {
    return { valid: false, errors: ['Insufficient permissions'] };
  }

  return { valid: true };
});
```

### 2. Encryption

**Encrypt sensitive payloads:**
```typescript
class EncryptedEventBus {
  async publish(topic: string, payload: any, options?: PublishOptions): Promise<string> {
    const encrypted = options?.encrypted
      ? await this.encrypt(payload)
      : payload;

    return this.eventBus.publish(topic, encrypted, options);
  }

  async subscribe(topic: string, handler: MessageHandler): Promise<Subscription> {
    return this.eventBus.subscribe(topic, async (message) => {
      const decrypted = await this.decrypt(message.payload);
      await handler({ ...message, payload: decrypted });
    });
  }

  private async encrypt(data: any): Promise<string> {
    // Use proper encryption (AES-256-GCM)
    return encryptionService.encrypt(JSON.stringify(data));
  }

  private async decrypt(data: string): Promise<any> {
    const decrypted = await encryptionService.decrypt(data);
    return JSON.parse(decrypted);
  }
}
```

## Testing

### 1. Unit Tests

**Test event handlers:**
```typescript
describe('InvestigationEventHandler', () => {
  it('should create investigation on InvestigationCreated event', async () => {
    const handler = new InvestigationEventHandler(mockDb);

    const event: DomainEvent = {
      eventType: 'InvestigationCreated',
      aggregateId: 'inv-123',
      payload: {
        title: 'Test Investigation',
        analyst: 'analyst-1'
      },
      timestamp: new Date()
    };

    await handler.handle(event);

    expect(mockDb.insert).toHaveBeenCalledWith(
      'investigations',
      expect.objectContaining({
        id: 'inv-123',
        title: 'Test Investigation'
      })
    );
  });
});
```

### 2. Integration Tests

**Test event flow:**
```typescript
describe('Investigation Workflow', () => {
  it('should complete full investigation workflow', async () => {
    const events: DomainEvent[] = [];

    // Subscribe to collect events
    await eventBus.subscribe('investigation.*', async (msg) => {
      events.push(msg.payload);
    });

    // Create investigation
    await commandBus.execute('CreateInvestigation', {
      title: 'Test',
      analyst: 'analyst-1'
    });

    // Wait for events
    await sleep(1000);

    expect(events).toContainEqual(
      expect.objectContaining({
        eventType: 'InvestigationCreated'
      })
    );

    expect(events).toContainEqual(
      expect.objectContaining({
        eventType: 'AnalystAssigned'
      })
    );
  });
});
```

### 3. Contract Testing

**Verify event schemas:**
```typescript
describe('Event Contracts', () => {
  it('should match InvestigationCreated schema', () => {
    const event = {
      eventType: 'InvestigationCreated',
      aggregateId: 'inv-123',
      payload: {
        title: 'Test',
        analyst: 'analyst-1',
        priority: 3
      }
    };

    const result = validateEventSchema('InvestigationCreated', 1, event);

    expect(result.valid).toBe(true);
  });
});
```

## Deployment

### 1. Blue-Green Deployment

Support multiple versions:
```typescript
// Version 1 handler
eventBus.subscribe('v1.events', handlerV1);

// Version 2 handler
eventBus.subscribe('v2.events', handlerV2);

// Router
eventBus.subscribe('events', async (msg) => {
  const version = getDeploymentVersion();
  await eventBus.publish(`${version}.events`, msg.payload);
});
```

### 2. Health Checks

```typescript
app.get('/health', async (req, res) => {
  const checks = await Promise.all([
    checkEventBus(),
    checkDatabase(),
    checkRedis(),
    checkKafka()
  ]);

  const healthy = checks.every(c => c.healthy);

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    checks
  });
});
```

### 3. Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');

  // Stop accepting new messages
  server.close();

  // Finish processing current messages
  await eventBus.shutdown();

  // Close connections
  await eventStore.close();
  await redis.quit();

  logger.info('Shutdown complete');
  process.exit(0);
});
```

## Summary

1. **Design events carefully** - they're your system's contract
2. **Make handlers idempotent** - messages may be delivered multiple times
3. **Handle errors gracefully** - use retries, DLQs, and circuit breakers
4. **Monitor everything** - metrics, logs, and traces
5. **Test thoroughly** - unit, integration, and contract tests
6. **Secure your system** - authentication, authorization, encryption
7. **Deploy safely** - health checks, graceful shutdown, versioning

Remember: Event-driven systems are eventually consistent. Design with this in mind!
