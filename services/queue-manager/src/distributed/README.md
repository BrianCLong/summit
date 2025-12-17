# Distributed Queue System

A resilient Redis-based distributed queue system with real-time notifications for agent fleets, air-gapped failover support, and parallel Codex task orchestration.

## Features

- **Redis Cluster Client**: Connection pooling with automatic failover
- **Distributed Queue**: Priority-based processing with dead-letter queues
- **Agent Fleet Notifier**: Real-time pub/sub notifications
- **Air-Gap Failover**: Local persistence during network isolation
- **Codex Task Orchestrator**: Parallel AI/ML task execution
- **E2E Testing Hooks**: Comprehensive testing utilities

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Distributed Queue System                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │ RedisClusterClient│◄──►│  Redis Cluster   │                   │
│  │  - Pool mgmt      │    │  - Primary       │                   │
│  │  - Failover       │    │  - Replica(s)    │                   │
│  │  - Health checks  │    │  - Sentinel      │                   │
│  └────────┬─────────┘    └──────────────────┘                   │
│           │                                                      │
│  ┌────────▼─────────┐    ┌──────────────────┐                   │
│  │ DistributedQueue │    │ AgentFleetNotifier│                   │
│  │  - Partitions    │    │  - Pub/Sub       │                   │
│  │  - Priority      │    │  - Presence      │                   │
│  │  - DLQ           │    │  - Heartbeat     │                   │
│  └────────┬─────────┘    └────────┬─────────┘                   │
│           │                       │                              │
│  ┌────────▼─────────┐    ┌────────▼─────────┐                   │
│  │ AirgapOrchestrator│   │ CodexOrchestrator │                   │
│  │  - Local storage │    │  - Parallel exec  │                   │
│  │  - Sync/recover  │    │  - Rate limiting  │                   │
│  └──────────────────┘    └──────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

```typescript
import {
  RedisClusterClient,
  DistributedQueue,
  AgentFleetNotifier,
  CodexTaskOrchestrator,
  DistributedPriority,
} from '@intelgraph/queue-manager';

// 1. Create Redis client with failover
const redisClient = new RedisClusterClient({
  nodes: [
    { host: 'redis-primary', port: 6379, role: 'primary' },
    { host: 'redis-replica', port: 6380, role: 'replica' },
  ],
  poolSize: 10,
  failoverMode: 'automatic',
});

await redisClient.initialize();

// 2. Create distributed queue
const queue = new DistributedQueue('tasks', redisClient, {
  partitions: [
    { id: 'high-priority', name: 'High Priority', weight: 2, maxConcurrency: 20 },
    { id: 'default', name: 'Default', weight: 1, maxConcurrency: 10 },
  ],
  deadLetterConfig: { enabled: true, alertOnThreshold: 100 },
});

await queue.initialize();

// 3. Register processor
queue.registerProcessor(async (job) => {
  console.log(`Processing: ${job.name}`);
  return { success: true };
});

// 4. Add jobs with priority
await queue.addJob('process-data', { payload: 'data' }, {
  priority: DistributedPriority.HIGH,
  partition: 'high-priority',
});
```

## Components

### RedisClusterClient

Connection pooling with automatic failover support.

```typescript
const client = new RedisClusterClient({
  nodes: [/* ... */],
  poolSize: 10,
  minPoolSize: 2,
  maxPoolSize: 50,
  failoverMode: 'automatic', // 'manual' | 'airgap-safe'
  healthCheckInterval: 10000,
});

// Execute commands with automatic retry/failover
const result = await client.execute('GET', 'key');

// Get pool statistics
const stats = client.getPoolStats();
```

### DistributedQueue

Priority-based distributed queue with partitioning and DLQ.

```typescript
const queue = new DistributedQueue('my-queue', redisClient, {
  partitions: [/* ... */],
  defaultRetryStrategy: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    jitter: true,
  },
});

// Add job with options
await queue.addJob('job-name', data, {
  priority: DistributedPriority.CRITICAL,
  idempotencyKey: 'unique-key',
  correlationId: 'trace-123',
});

// Bulk operations
await queue.addBulk([
  { name: 'job-1', data: {}, options: {} },
  { name: 'job-2', data: {}, options: {} },
]);

// Queue stats
const stats = await queue.getStats();
```

### AgentFleetNotifier

Real-time notifications for distributed agent fleets.

```typescript
const notifier = new AgentFleetNotifier(redisClient, {
  heartbeatInterval: 30000,
  heartbeatTimeout: 90000,
  enableOfflineBuffering: true,
});

await notifier.start();

// Register agent
const agent = await notifier.registerAgent({
  id: 'agent-1',
  fleetId: 'fleet-1',
  name: 'Worker Agent',
  status: 'online',
  capabilities: ['task-processing'],
  maxConcurrency: 10,
  currentLoad: 0,
});

// Send notification
await notifier.notify('agent-1', {
  type: 'job-available',
  payload: { jobId: 'job-123' },
  priority: DistributedPriority.HIGH,
});

// Broadcast to fleet
await notifier.broadcast({
  type: 'fleet-scaling',
  payload: { newCapacity: 100 },
  priority: DistributedPriority.NORMAL,
}, 'fleet-1');
```

### AirgapFailoverOrchestrator

Resilient queue operations during network isolation.

```typescript
const airgap = new AirgapFailoverOrchestrator(redisClient, {
  enabled: true,
  localStoragePath: '/data/queue-backup',
  maxLocalQueueSize: 10000,
  encryptLocalStorage: true,
});

await airgap.initialize(queue);

// Add job (works in both connected and airgapped modes)
await airgap.addJob('queue', 'job-name', data, options);

// Check status
const status = airgap.getStatus();
// { state: 'connected' | 'airgapped' | 'recovering', ... }

// Force airgap mode (for testing)
await airgap.forceAirgap();

// Manual sync trigger
await airgap.triggerSync();
```

### CodexTaskOrchestrator

Parallel AI/ML task execution with rate limiting.

```typescript
const orchestrator = new CodexTaskOrchestrator(queue, {
  defaultMaxParallel: 5,
  rateLimitMax: 100,
  rateLimitWindow: 60000,
  tokenBudget: 1000000,
});

// Submit single task
const task = await orchestrator.submitTask(
  'code-generation',
  { prompt: 'Generate a sorting function' },
  { model: 'gpt-4', timeout: 30000 },
);

// Submit batch with dependency graph
const batch = await orchestrator.submitBatch([
  { type: 'analysis', input: { prompt: 'Analyze code' } },
  { type: 'refactoring', input: { prompt: 'Refactor' }, config: { dependsOn: ['task-1'] } },
], { strategy: 'dependency-graph', maxParallel: 3 });

// Monitor token usage
const usage = orchestrator.getTokenUsage();
```

### E2E Testing Hooks

Comprehensive testing utilities for queue systems.

```typescript
import { E2ETestingHooks, createInterceptor } from '@intelgraph/queue-manager';

const hooks = new E2ETestingHooks({
  enabled: true,
  latencySimulation: { min: 10, max: 100, distribution: 'normal' },
  errorInjection: { rate: 0.1, types: ['timeout'] },
});

hooks.attach(queue);
hooks.enable();

// Create test suite
const suite = hooks.createSuite('Integration Tests');

hooks.addTest(suite.id, 'should process jobs', async (h) => {
  await queue.addJob('test', {});
  await h.waitForJobs(1);

  const assertion = h.assertJobCompleted('job-id');
  if (!assertion.passed) throw new Error(assertion.message);
});

// Run tests
const results = await hooks.runSuite(suite.id);
```

## Trade-offs & Design Decisions

### Connection Pooling
- **Trade-off**: Memory overhead from maintaining idle connections
- **Mitigation**: Configurable idle timeout, minimum/maximum pool sizes
- **Justification**: Essential for production throughput and failover speed

### Dead-Letter Queue
- **Trade-off**: Additional storage for failed jobs
- **Mitigation**: TTL-based expiry, configurable max age
- **Justification**: Critical for debugging and manual retry of failures

### Priority Processing
- **Trade-off**: Slight overhead vs pure FIFO
- **Mitigation**: Numeric priority mapping to BullMQ
- **Justification**: Required for SLA compliance and critical task handling

### Partitioning
- **Trade-off**: Increased complexity, multiple queues
- **Mitigation**: Abstracted partition management
- **Justification**: Essential for multi-tenant isolation and workload separation

### Air-Gap Local Storage
- **Trade-off**: I/O overhead, sync complexity
- **Mitigation**: Batched writes, checksums, conflict detection
- **Justification**: Required for disconnected/air-gapped environments

### Offline Notification Buffering
- **Trade-off**: Memory overhead for buffered messages
- **Mitigation**: Bounded buffer size, TTL on messages
- **Justification**: Ensures message delivery when agents reconnect

### Rate Limiting
- **Trade-off**: May slow throughput during bursts
- **Mitigation**: Token bucket algorithm, configurable windows
- **Justification**: Prevents API throttling, ensures fair usage

## Configuration Reference

### RedisClusterConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| nodes | RedisNodeConfig[] | required | List of Redis nodes |
| poolSize | number | 10 | Target pool size |
| minPoolSize | number | 2 | Minimum connections |
| maxPoolSize | number | 50 | Maximum connections |
| failoverMode | string | 'automatic' | Failover behavior |
| healthCheckInterval | number | 10000 | Health check interval (ms) |
| airgapMode | boolean | false | Enable air-gap support |

### DistributedJobOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| priority | DistributedPriority | NORMAL | Job priority (1-10) |
| partition | string | 'default' | Target partition |
| idempotencyKey | string | uuid | Unique key for deduplication |
| correlationId | string | uuid | Tracing correlation ID |
| timeout | number | 60000 | Job timeout (ms) |
| retryStrategy | RetryStrategy | default | Retry configuration |

## Metrics & Monitoring

All components emit Prometheus-compatible metrics:

```
# Queue metrics
queue_jobs_added_total{queue="name"}
queue_jobs_completed_total{queue="name"}
queue_jobs_failed_total{queue="name"}
queue_job_processing_duration_ms{queue="name"}

# Pool metrics
redis_pool_connections_total
redis_pool_connections_active
redis_failover_total

# Agent fleet metrics
fleet_agents_online{fleet="id"}
fleet_notifications_sent_total
```

## Testing

```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test --coverage

# Run specific test file
pnpm test DistributedQueue.test.ts
```

## License

MIT
