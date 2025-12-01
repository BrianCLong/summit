# Event-Driven Architecture Patterns

## Message Patterns

### 1. Event Notification

Events notify interested parties of state changes.

**Use when:**
- Multiple consumers need to react to changes
- Loose coupling between services is desired
- You want to build audit trails

**Example:**
```typescript
import { EventNotificationService } from '@intelgraph/messaging';

const eventService = new EventNotificationService(eventBus);

// Publish event
await eventService.publish({
  eventId: uuidv4(),
  eventType: 'InvestigationCompleted',
  aggregateId: 'inv-123',
  aggregateType: 'Investigation',
  payload: {
    investigationId: 'inv-123',
    findings: [...],
    completedBy: 'analyst-1'
  },
  timestamp: new Date()
});

// Subscribe to events
await eventService.subscribe(async (event) => {
  if (event.eventType === 'InvestigationCompleted') {
    await notifyStakeholders(event.payload);
  }
}, {
  eventTypes: ['InvestigationCompleted']
});
```

### 2. Event-Carried State Transfer

Events carry full state, eliminating need for lookups.

**Use when:**
- Consumers need complete data
- Reducing coupling is critical
- Network latency is a concern

**Example:**
```typescript
// Include full entity data in event
await eventBus.publish('entity.enriched', {
  entityId: 'entity-123',
  entity: {
    id: 'entity-123',
    name: 'Cozy Bear',
    type: 'threat-actor',
    aliases: ['APT29', 'The Dukes'],
    attributes: {...},
    relationships: [...]
  },
  enrichment: {
    sources: ['osint', 'humint'],
    confidence: 0.95,
    timestamp: new Date()
  }
});
```

### 3. Request-Reply

Synchronous-style communication over async channels.

**Use when:**
- You need a response
- Timeout handling is required
- RPC-style communication is needed

**Example:**
```typescript
import { RequestReply } from '@intelgraph/messaging';

const requestReply = new RequestReply(eventBus);

// Service side
await requestReply.handleRequests('risk.assess', async (request) => {
  const { entityId } = request.payload;
  const assessment = await assessRisk(entityId);
  return assessment;
});

// Client side
const reply = await requestReply.request('risk.assess',
  { entityId: 'entity-123' },
  5000
);

if (reply.success) {
  console.log('Risk score:', reply.payload.score);
}
```

## Saga Patterns

### 1. Orchestration

Central coordinator manages the saga.

**Use when:**
- Complex workflows with many steps
- Need centralized monitoring
- Business logic is complex

**Example:**
```typescript
import { SagaOrchestrator } from '@intelgraph/messaging';

const orchestrator = new SagaOrchestrator(redis);

orchestrator.defineSaga({
  sagaId: 'investigation-workflow',
  name: 'Investigation Workflow',
  steps: [
    {
      stepId: 'create-case',
      action: async (ctx) => {
        const caseId = await caseService.create(ctx.data.get('details'));
        ctx.data.set('caseId', caseId);
      },
      compensation: async (ctx) => {
        await caseService.delete(ctx.data.get('caseId'));
      }
    },
    {
      stepId: 'assign-analyst',
      action: async (ctx) => {
        await assignmentService.assign(
          ctx.data.get('caseId'),
          ctx.data.get('analystId')
        );
      },
      compensation: async (ctx) => {
        await assignmentService.unassign(ctx.data.get('caseId'));
      }
    },
    {
      stepId: 'notify-team',
      action: async (ctx) => {
        await notificationService.notify(
          ctx.data.get('teamId'),
          ctx.data.get('caseId')
        );
      }
    }
  ]
});
```

### 2. Choreography

Services react to events autonomously.

**Use when:**
- Services are independent
- Workflow is simple
- You want loose coupling

**Example:**
```typescript
// Service A publishes event
await eventBus.publish('case.created', {
  caseId: 'case-123',
  details: {...}
});

// Service B reacts
await eventBus.subscribe('case.created', async (msg) => {
  await assignAnalyst(msg.payload.caseId);
  // Publish next event
  await eventBus.publish('analyst.assigned', {
    caseId: msg.payload.caseId,
    analystId: 'analyst-1'
  });
});

// Service C reacts
await eventBus.subscribe('analyst.assigned', async (msg) => {
  await notifyTeam(msg.payload);
});
```

## CQRS Patterns

### 1. Projection Building

Build optimized read models from events.

**Example:**
```typescript
import { ProjectionManager } from '@intelgraph/cqrs';

const projectionManager = new ProjectionManager(eventStore, pool);
await projectionManager.initialize();

// Define projection
const investigationSummaryProjection: Projection = {
  name: 'investigation-summary',
  version: 1,
  eventHandlers: new Map([
    ['InvestigationCreated', async (event) => {
      await pool.query(`
        INSERT INTO investigation_summary (id, title, status, created_at)
        VALUES ($1, $2, $3, $4)
      `, [
        event.aggregateId,
        event.payload.title,
        'active',
        event.timestamp
      ]);
    }],
    ['InvestigationCompleted', async (event) => {
      await pool.query(`
        UPDATE investigation_summary
        SET status = 'completed', completed_at = $2
        WHERE id = $1
      `, [event.aggregateId, event.timestamp]);
    }]
  ])
};

projectionManager.register(investigationSummaryProjection);
```

### 2. Command Validation

Validate commands before execution.

**Example:**
```typescript
import { CommandBus } from '@intelgraph/cqrs';

const commandBus = new CommandBus();

// Add global validator
commandBus.addValidator(async (command) => {
  if (!command.metadata?.userId) {
    return {
      valid: false,
      errors: ['User ID required']
    };
  }
  return { valid: true };
});

// Add command-specific validator
commandBus.register({
  commandType: 'CreateInvestigation',
  handler: async (cmd) => {...},
  validators: [
    async (cmd) => {
      const { title, priority } = cmd.payload;

      const errors: string[] = [];

      if (!title || title.length < 3) {
        errors.push('Title must be at least 3 characters');
      }

      if (priority < 1 || priority > 5) {
        errors.push('Priority must be between 1 and 5');
      }

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      };
    }
  ]
});
```

## Stream Processing Patterns

### 1. Filtering and Transformation

Filter and transform events in real-time.

**Example:**
```typescript
import { StreamProcessor } from '@intelgraph/event-streaming';

const processor = new StreamProcessor(eventBus);

const pipeline = StreamProcessor.builder('high-priority-threats', 'threats.raw')
  // Filter high-priority threats
  .filter(threat => threat.priority >= 8)
  // Enrich with context
  .map(async (threat) => ({
    ...threat,
    context: await fetchContext(threat.id),
    analyzedAt: new Date()
  }))
  // Send to high-priority queue
  .to('threats.high-priority')
  .build();

processor.definePipeline(pipeline);
await processor.start('high-priority-threats');
```

### 2. Windowed Aggregation

Aggregate events over time windows.

**Example:**
```typescript
import {
  WindowedAggregator,
  WindowType,
  Aggregators
} from '@intelgraph/event-streaming';

// Count threats per minute
const threatCounter = new WindowedAggregator(
  {
    type: WindowType.TUMBLING,
    size: 60000 // 1 minute
  },
  Aggregators.count()
);

threatCounter.on('window:closed', ({ result, startTime, endTime }) => {
  console.log(`Threats from ${startTime} to ${endTime}: ${result}`);

  if (result > 100) {
    // Alert on anomaly
    alertService.send('High threat volume detected');
  }
});

// Subscribe to threat events
await eventBus.subscribe('threats.*', async (msg) => {
  threatCounter.addEvent({
    key: msg.metadata.messageId,
    value: msg.payload,
    timestamp: msg.metadata.timestamp
  });
});
```

### 3. Complex Event Processing

Detect patterns across multiple event streams.

**Example:**
```typescript
// Detect coordinated attack pattern
class AttackPatternDetector {
  private events: Map<string, Event[]> = new Map();

  async analyzeEvent(event: Event): Promise<boolean> {
    const { targetId } = event;

    if (!this.events.has(targetId)) {
      this.events.set(targetId, []);
    }

    const targetEvents = this.events.get(targetId)!;
    targetEvents.push(event);

    // Keep last hour of events
    const oneHourAgo = Date.now() - 3600000;
    this.events.set(
      targetId,
      targetEvents.filter(e => e.timestamp.getTime() > oneHourAgo)
    );

    // Check for pattern: 3+ different attack types in 1 hour
    const attackTypes = new Set(targetEvents.map(e => e.attackType));

    if (attackTypes.size >= 3) {
      await alertService.send({
        type: 'coordinated-attack',
        target: targetId,
        attackTypes: Array.from(attackTypes),
        eventCount: targetEvents.length
      });

      return true;
    }

    return false;
  }
}
```

## Event Sourcing Patterns

### 1. Snapshot Strategy

Optimize aggregate loading with snapshots.

**Example:**
```typescript
import { SnapshotStore, AggregateRepository } from '@intelgraph/event-sourcing';

const snapshotStore = new SnapshotStore(eventStoreConfig);

// Take snapshot every 100 events
const repo = new AggregateRepository(
  eventStore,
  Investigation,
  snapshotStore,
  100
);

// Loading will use snapshot if available
const investigation = await repo.load('inv-123');
```

### 2. Event Upcasting

Handle schema evolution.

**Example:**
```typescript
import { EventUpcasterChain, UpcastHelpers } from '@intelgraph/event-sourcing';

const upcasterChain = new EventUpcasterChain();

// Upcast from v1 to v2: rename field
upcasterChain.register('InvestigationCreated', {
  fromVersion: 1,
  toVersion: 2,
  upcast: UpcastHelpers.renameField('assignee', 'assignedTo')
});

// Upcast from v2 to v3: add new field
upcasterChain.register('InvestigationCreated', {
  fromVersion: 2,
  toVersion: 3,
  upcast: UpcastHelpers.addField('priority', 3) // default priority
});

// Apply upcasting when loading events
const events = await eventStore.getEventStream(aggregateId);
const upcastedEvents = upcasterChain.upcastMany(events.events);
```

## Integration Patterns

### 1. Anti-Corruption Layer

Protect domain model from external systems.

**Example:**
```typescript
class ExternalSystemAdapter {
  async handleExternalEvent(externalEvent: any): Promise<void> {
    // Translate to domain event
    const domainEvent = this.translateToDomainEvent(externalEvent);

    // Validate
    if (!this.isValid(domainEvent)) {
      logger.warn('Invalid external event', externalEvent);
      return;
    }

    // Publish to internal event bus
    await eventBus.publish('external.events', domainEvent);
  }

  private translateToDomainEvent(external: any): DomainEvent {
    return {
      eventType: this.mapEventType(external.type),
      payload: this.mapPayload(external.data),
      // ... other fields
    };
  }
}
```

### 2. Event Bridge

Bridge between different messaging systems.

**Example:**
```typescript
class KafkaToRedisbridge {
  async start(): Promise<void> {
    // Consume from Kafka
    await kafkaConsumer.subscribe(['external-topic']);

    await kafkaConsumer.run({
      eachMessage: async ({ message }) => {
        const event = JSON.parse(message.value.toString());

        // Publish to internal Redis-based event bus
        await eventBus.publish('bridged.events', event);
      }
    });
  }
}
```

## Monitoring Patterns

### 1. Event Tracing

Track events through the system.

**Example:**
```typescript
// Add trace ID to all events
const traceId = uuidv4();

await eventBus.publish('investigation.started', payload, {
  metadata: {
    traceId,
    spanId: uuidv4(),
    parentSpanId: undefined
  }
});

// Propagate trace ID
await eventBus.subscribe('investigation.started', async (msg) => {
  const { traceId, spanId } = msg.metadata;

  await eventBus.publish('analysis.requested', analysisPayload, {
    metadata: {
      traceId,
      spanId: uuidv4(),
      parentSpanId: spanId
    }
  });
});
```

### 2. Health Checks

Monitor system health.

**Example:**
```typescript
class EventBusHealthCheck {
  async check(): Promise<HealthStatus> {
    const metrics = eventBus.getMetrics();

    // Check dead letter queue depth
    if (metrics.messagesDeadLettered > 100) {
      return {
        status: 'unhealthy',
        reason: 'Too many dead letters'
      };
    }

    // Check consumer lag
    const lag = await this.calculateLag();
    if (lag > 10000) {
      return {
        status: 'degraded',
        reason: 'High consumer lag'
      };
    }

    return { status: 'healthy' };
  }
}
```

## Next Steps

- Implement these patterns in your services
- Monitor and measure effectiveness
- Iterate based on real-world usage
- Read [BEST_PRACTICES.md](./BEST_PRACTICES.md) for production guidelines
