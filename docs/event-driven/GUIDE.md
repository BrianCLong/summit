# Event-Driven Architecture Guide

## Overview

Summit's event-driven architecture provides a comprehensive platform for building distributed, scalable, and resilient intelligence systems using event sourcing, CQRS, and asynchronous messaging patterns.

## Architecture Components

### 1. Event Bus (`@intelgraph/event-bus`)

The core distributed message bus supporting pub-sub and queuing patterns.

```typescript
import { EventBus } from '@intelgraph/event-bus';

const eventBus = new EventBus({
  name: 'intelligence-ops',
  redis: {
    host: 'localhost',
    port: 6379
  },
  kafka: {
    brokers: ['kafka:9092']
  }
});

await eventBus.initialize();

// Publish to topic (pub-sub)
await eventBus.publish('intel.alerts', {
  threatLevel: 'high',
  entity: 'APT29',
  indicators: [...]
});

// Enqueue to queue (point-to-point)
await eventBus.enqueue('analysis-tasks', {
  taskType: 'entity-resolution',
  data: {...}
});

// Subscribe to topic
await eventBus.subscribe('intel.alerts', async (message) => {
  console.log('Alert received:', message.payload);
}, {
  guarantee: 'at-least-once',
  maxRetries: 3
});
```

### 2. Event Sourcing (`@intelgraph/event-sourcing`)

Persist all changes as a sequence of events for complete audit trail and replay capabilities.

```typescript
import {
  EventStore,
  Aggregate,
  AggregateRepository
} from '@intelgraph/event-sourcing';

// Define aggregate
class Investigation extends Aggregate<InvestigationState> {
  constructor(id: string) {
    super(id, 'Investigation', {
      status: 'pending',
      entities: [],
      findings: []
    });
  }

  startInvestigation(title: string, analyst: string) {
    this.raiseEvent('InvestigationStarted', {
      title,
      analyst,
      startedAt: new Date()
    });
  }

  addFinding(finding: Finding) {
    this.raiseEvent('FindingAdded', { finding });
  }

  protected apply(event: DomainEvent) {
    switch (event.eventType) {
      case 'InvestigationStarted':
        this.state.status = 'active';
        break;
      case 'FindingAdded':
        this.state.findings.push(event.payload.finding);
        break;
    }
  }
}

// Use repository
const eventStore = new EventStore({ connectionString: '...' });
await eventStore.initialize();

const repo = new AggregateRepository(eventStore, Investigation);

const investigation = new Investigation('inv-123');
investigation.startInvestigation('APT Investigation', 'analyst-1');
investigation.addFinding({...});

await repo.save(investigation);
```

### 3. CQRS (`@intelgraph/cqrs`)

Separate read and write models for optimized operations.

```typescript
import { CommandBus, QueryBus, ProjectionManager } from '@intelgraph/cqrs';

// Command side - writes
const commandBus = new CommandBus();

commandBus.register({
  commandType: 'CreateInvestigation',
  handler: async (command) => {
    const investigation = new Investigation(uuidv4());
    investigation.startInvestigation(
      command.payload.title,
      command.payload.analyst
    );
    await repo.save(investigation);

    return { success: true, data: { id: investigation.id } };
  }
});

await commandBus.execute('CreateInvestigation', {
  title: 'APT29 Campaign',
  analyst: 'analyst-1'
});

// Query side - reads
const queryBus = new QueryBus(redis);

queryBus.register({
  queryType: 'GetActiveInvestigations',
  handler: async (query) => {
    const investigations = await db.query(
      'SELECT * FROM investigations WHERE status = $1',
      ['active']
    );
    return { success: true, data: investigations };
  },
  cacheable: true,
  cacheTTL: 300
});

const result = await queryBus.execute('GetActiveInvestigations', {});
```

### 4. Async Messaging Patterns (`@intelgraph/messaging`)

#### Saga Orchestration

Coordinate distributed transactions with compensation logic.

```typescript
import { SagaOrchestrator } from '@intelgraph/messaging';

const orchestrator = new SagaOrchestrator(redis);

orchestrator.defineSaga({
  sagaId: 'entity-enrichment',
  name: 'Entity Enrichment Workflow',
  steps: [
    {
      stepId: 'fetch-osint',
      name: 'Fetch OSINT data',
      action: async (ctx) => {
        const data = await osintService.fetch(ctx.data.get('entityId'));
        ctx.data.set('osint', data);
      },
      compensation: async (ctx) => {
        await osintService.cleanup(ctx.data.get('entityId'));
      }
    },
    {
      stepId: 'analyze-risk',
      name: 'Analyze risk score',
      action: async (ctx) => {
        const score = await riskService.analyze(ctx.data.get('osint'));
        ctx.data.set('riskScore', score);
      }
    },
    {
      stepId: 'update-entity',
      name: 'Update entity record',
      action: async (ctx) => {
        await entityService.update(ctx.data.get('entityId'), {
          osint: ctx.data.get('osint'),
          riskScore: ctx.data.get('riskScore')
        });
      },
      compensation: async (ctx) => {
        await entityService.revert(ctx.data.get('entityId'));
      }
    }
  ]
});

await orchestrator.execute('entity-enrichment', {
  entityId: 'entity-123'
});
```

#### Request-Reply Pattern

Synchronous-style communication over async messaging.

```typescript
import { RequestReply } from '@intelgraph/messaging';

const requestReply = new RequestReply(eventBus);
await requestReply.initialize();

// Server side
await requestReply.handleRequests('entity.lookup', async (request) => {
  const entity = await db.findEntity(request.payload.id);
  return entity;
});

// Client side
const reply = await requestReply.request('entity.lookup',
  { id: 'entity-123' },
  5000 // timeout
);

console.log('Entity:', reply.payload);
```

### 5. Event Streaming (`@intelgraph/event-streaming`)

Real-time stream processing with windowing and aggregation.

```typescript
import {
  StreamProcessor,
  WindowedAggregator,
  WindowType,
  Aggregators
} from '@intelgraph/event-streaming';

// Stream processing pipeline
const processor = new StreamProcessor(eventBus);

const pipeline = StreamProcessor.builder('threat-analysis', 'raw.threats')
  .filter(threat => threat.severity >= 7)
  .map(threat => ({
    ...threat,
    enrichedAt: new Date(),
    category: categorizeThreat(threat)
  }))
  .to('analyzed.threats')
  .build();

processor.definePipeline(pipeline);
await processor.start('threat-analysis');

// Windowed aggregation
const aggregator = new WindowedAggregator(
  {
    type: WindowType.TUMBLING,
    size: 60000 // 1 minute windows
  },
  Aggregators.count()
);

aggregator.on('window:closed', ({ result }) => {
  console.log('Threats in last minute:', result);
});

aggregator.start();
```

## Deployment Patterns

### Standalone Service

Deploy as a dedicated microservice:

```bash
cd services/event-bus-service
npm start
```

Environment variables:
```
SERVICE_NAME=event-bus-service
REDIS_HOST=localhost
REDIS_PORT=6379
KAFKA_BROKERS=kafka1:9092,kafka2:9092
DATABASE_URL=postgresql://localhost/eventstore
PORT=3000
```

### Embedded Usage

Embed in your application:

```typescript
import { EventBus } from '@intelgraph/event-bus';

const eventBus = new EventBus(config);
await eventBus.initialize();

// Use throughout your application
```

## Best Practices

### 1. Event Design

- Use past tense for event names: `InvestigationCreated`, not `CreateInvestigation`
- Include all necessary data in events (avoid lookups)
- Keep events immutable
- Version your events from the start

### 2. Idempotency

Always design handlers to be idempotent:

```typescript
await eventBus.subscribe('entity.updated', async (message) => {
  const { entityId, version } = message.payload;

  // Check if already processed
  if (await cache.exists(`processed:${entityId}:${version}`)) {
    return; // Skip
  }

  // Process event
  await updateReadModel(message.payload);

  // Mark as processed
  await cache.set(`processed:${entityId}:${version}`, '1', 'EX', 3600);
});
```

### 3. Error Handling

Use dead letter queues for failed messages:

```typescript
await eventBus.subscribe('critical.events', handler, {
  maxRetries: 3,
  retryBackoff: 'exponential',
  deadLetterQueue: 'dlq-critical'
});
```

### 4. Monitoring

Track metrics and set up alerts:

```typescript
const metrics = eventBus.getMetrics();
console.log('Messages published:', metrics.messagesPublished);
console.log('Active subscriptions:', metrics.activeSubscriptions);
console.log('Dead letters:', metrics.messagesDeadLettered);
```

## Performance Optimization

### Batching

Batch events for better throughput:

```typescript
const events = [...];
for (const event of events) {
  await eventBus.publish('batch.topic', event, {
    persistent: true
  });
}
```

### Caching

Use query caching for read-heavy workloads:

```typescript
queryBus.register({
  queryType: 'ExpensiveQuery',
  handler: async (query) => {
    // Expensive operation
  },
  cacheable: true,
  cacheTTL: 600 // 10 minutes
});
```

### Snapshotting

Take snapshots for large aggregates:

```typescript
const repo = new AggregateRepository(
  eventStore,
  Investigation,
  snapshotStore,
  100 // snapshot every 100 events
);
```

## Troubleshooting

### Message Not Delivered

1. Check subscription is active
2. Verify topic/queue name
3. Check dead letter queue
4. Review logs for errors

### High Latency

1. Check Redis/Kafka connectivity
2. Review message sizes
3. Consider batching
4. Scale horizontally

### Memory Issues

1. Implement proper cleanup
2. Use streaming for large datasets
3. Limit in-memory caching
4. Monitor heap usage

## Next Steps

- Read [PATTERNS.md](./PATTERNS.md) for advanced patterns
- Read [BEST_PRACTICES.md](./BEST_PRACTICES.md) for production guidelines
- Explore examples in `/examples/event-driven`
