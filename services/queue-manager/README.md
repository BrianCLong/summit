# Queue Manager System

Comprehensive queue management system for background jobs with BullMQ, supporting millions of jobs with horizontal scaling.

## Features

- ✅ **BullMQ/Redis Integration**: Enterprise-grade job queuing with Redis backend
- ✅ **Priority & Scheduling**: Job prioritization (CRITICAL, HIGH, NORMAL, LOW, BACKGROUND) and delayed execution
- ✅ **Retry Logic**: Exponential backoff with configurable retry attempts
- ✅ **Dead Letter Queue**: Automatic handling of permanently failed jobs
- ✅ **Rate Limiting**: Per-queue rate limits using token bucket algorithm
- ✅ **Job Chaining**: Sequential job execution with dependency management
- ✅ **Workflow Engine**: Complex multi-step workflows with success/failure paths
- ✅ **Real-time Monitoring**: Prometheus metrics and web dashboard
- ✅ **Horizontal Scaling**: Auto-scaling workers based on queue load and system resources
- ✅ **Graceful Shutdown**: Clean termination of workers and connections

## Quick Start

### Installation

```bash
cd services/queue-manager
pnpm install
```

### Configuration

Set environment variables:

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
WORKER_CONCURRENCY=10
LOG_LEVEL=info
```

### Running

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

### Access Points

- **Dashboard**: http://localhost:3010
- **API**: http://localhost:3010/api
- **Metrics**: http://localhost:3010/metrics

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Queue Manager System                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Producer   │───▶│    Queue     │───▶│   Worker     │  │
│  │   Services   │    │   (BullMQ)   │    │    Pool      │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                             │                     │          │
│                             ▼                     ▼          │
│                      ┌──────────────┐    ┌──────────────┐  │
│                      │    Redis     │    │   Metrics    │  │
│                      │   Backend    │    │  Collector   │  │
│                      └──────────────┘    └──────────────┘  │
│                                                  │          │
│                                                  ▼          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Monitoring Dashboard                     │  │
│  │  - Real-time metrics  - Queue controls               │  │
│  │  - Job history        - Worker management            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Usage Examples

### Basic Job Processing

```typescript
import { QueueManager, JobPriority } from '@intelgraph/queue-manager';

const queueManager = new QueueManager();

// Register a queue
queueManager.registerQueue('email-notifications', {
  rateLimit: { max: 100, duration: 60000 }, // 100 jobs per minute
});

// Register a processor
queueManager.registerProcessor('email-notifications', async (job) => {
  const { to, subject, body } = job.data;
  await sendEmail(to, subject, body);
  return { sent: true };
});

// Start workers
await queueManager.startWorkers();

// Add a job
await queueManager.addJob(
  'email-notifications',
  'send-welcome-email',
  {
    to: 'user@example.com',
    subject: 'Welcome!',
    body: 'Welcome to our platform',
  },
  {
    priority: JobPriority.HIGH,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  }
);
```

### Scheduled Jobs

```typescript
// Schedule a job for future execution
await queueManager.addJob(
  'data-processing',
  'generate-report',
  { reportType: 'monthly', month: '2025-01' },
  {
    scheduledAt: new Date('2025-02-01T00:00:00Z'),
    priority: JobPriority.NORMAL,
  }
);
```

### Bulk Job Processing

```typescript
// Add multiple jobs at once
const jobs = [
  {
    name: 'process-user',
    data: { userId: 1 },
    options: { priority: JobPriority.HIGH },
  },
  {
    name: 'process-user',
    data: { userId: 2 },
    options: { priority: JobPriority.NORMAL },
  },
  // ... thousands more
];

await queueManager.addBulk('user-processing', jobs);
```

### Job Chaining

```typescript
// Chain jobs together
await queueManager.addJob(
  'data-ingestion',
  'ingest-data',
  { source: 's3://bucket/data.csv' },
  {
    priority: JobPriority.HIGH,
    chainTo: [
      {
        queueName: 'data-processing',
        jobName: 'process-data',
        data: { format: 'csv' },
      },
      {
        queueName: 'notifications',
        jobName: 'notify-completion',
        data: { type: 'ingestion-complete' },
      },
    ],
  }
);
```

### Workflow Execution

```typescript
// Execute complex workflows
const workflow = {
  id: 'user-onboarding-workflow',
  name: 'User Onboarding',
  steps: [
    {
      queueName: 'email-notifications',
      jobName: 'send-welcome-email',
      data: { userId: 123 },
      onSuccess: [
        {
          queueName: 'data-processing',
          jobName: 'create-user-profile',
          data: { userId: 123 },
          onSuccess: [
            {
              queueName: 'email-notifications',
              jobName: 'send-profile-created',
              data: { userId: 123 },
            },
          ],
          onFailure: [
            {
              queueName: 'notifications',
              jobName: 'alert-admin',
              data: { error: 'profile-creation-failed', userId: 123 },
            },
          ],
        },
      ],
    },
  ],
  metadata: {
    createdBy: 'system',
    correlationId: 'workflow-123',
    tags: ['onboarding', 'user'],
  },
};

await queueManager.executeWorkflow(workflow);
```

### Job Priority Levels

```typescript
import { JobPriority } from '@intelgraph/queue-manager';

// CRITICAL (1) - Highest priority, process immediately
await queueManager.addJob('alerts', 'security-alert', data, {
  priority: JobPriority.CRITICAL,
});

// HIGH (2) - Important jobs, process soon
await queueManager.addJob('notifications', 'urgent-notification', data, {
  priority: JobPriority.HIGH,
});

// NORMAL (3) - Default priority
await queueManager.addJob('email', 'newsletter', data, {
  priority: JobPriority.NORMAL,
});

// LOW (4) - Can wait if system is busy
await queueManager.addJob('cleanup', 'delete-old-logs', data, {
  priority: JobPriority.LOW,
});

// BACKGROUND (5) - Lowest priority, process when idle
await queueManager.addJob('analytics', 'update-metrics', data, {
  priority: JobPriority.BACKGROUND,
});
```

## Queue Patterns

### Pattern 1: Fan-Out Processing

Process a single input across multiple workers:

```typescript
// Producer
const userIds = [1, 2, 3, 4, 5, /* ... thousands more */];
const jobs = userIds.map(userId => ({
  name: 'process-user',
  data: { userId },
}));

await queueManager.addBulk('user-processing', jobs);
```

### Pattern 2: Map-Reduce

Distribute work and aggregate results:

```typescript
// Map phase: Break large dataset into chunks
const chunks = splitDataIntoChunks(largeDataset, 1000);
const mapJobs = chunks.map((chunk, index) => ({
  name: 'map-process',
  data: { chunk, index },
  options: {
    chainTo: [{
      queueName: 'reduce-processing',
      jobName: 'reduce-results',
      data: { totalChunks: chunks.length },
    }],
  },
}));

await queueManager.addBulk('map-processing', mapJobs);
```

### Pattern 3: Priority Queue

Handle mixed priority workloads:

```typescript
// High-priority user-facing tasks
await queueManager.addJob('mixed-queue', 'user-request', userData, {
  priority: JobPriority.HIGH,
});

// Low-priority background tasks
await queueManager.addJob('mixed-queue', 'analytics', analyticsData, {
  priority: JobPriority.BACKGROUND,
});
```

### Pattern 4: Rate-Limited External API Calls

Respect third-party API rate limits:

```typescript
queueManager.registerQueue('external-api', {
  rateLimit: {
    max: 100, // Max 100 requests
    duration: 60000, // Per 60 seconds
  },
});

queueManager.registerProcessor('external-api', async (job) => {
  const response = await fetch(`https://api.example.com/${job.data.endpoint}`);
  return response.json();
});
```

### Pattern 5: Cron-like Scheduled Jobs

Recurring scheduled tasks:

```typescript
// Run daily at midnight
setInterval(async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  await queueManager.addJob('maintenance', 'daily-cleanup', {}, {
    scheduledAt: tomorrow,
  });
}, 24 * 60 * 60 * 1000);
```

### Pattern 6: Event-Driven Processing

Process events from various sources:

```typescript
// Listen to events and enqueue
eventBus.on('user.registered', async (event) => {
  await queueManager.addJob('user-events', 'handle-registration', event.data, {
    priority: JobPriority.HIGH,
    metadata: {
      correlationId: event.id,
      tags: ['user-event', 'registration'],
    },
  });
});
```

### Pattern 7: Dead Letter Queue Handling

Monitor and reprocess failed jobs:

```typescript
// Processor for dead letter queue
queueManager.registerProcessor('dead-letter-queue', async (job) => {
  const { originalQueue, originalData, failureReason } = job.data;

  // Log to monitoring system
  await logFailedJob(originalQueue, originalData, failureReason);

  // Optionally retry with modifications
  if (shouldRetry(failureReason)) {
    await queueManager.addJob(originalQueue, 'retry', originalData, {
      priority: JobPriority.LOW,
    });
  }
});
```

## API Reference

### QueueManager

#### `registerQueue(name, options?)`

Register a new queue.

**Parameters:**
- `name` (string): Queue name
- `options` (object):
  - `rateLimit` (object): Rate limit configuration
    - `max` (number): Maximum jobs per duration
    - `duration` (number): Duration in milliseconds
  - `defaultJobOptions` (object): Default options for all jobs in this queue

**Returns:** Queue instance

#### `registerProcessor(queueName, processor)`

Register a job processor for a queue.

**Parameters:**
- `queueName` (string): Queue name
- `processor` (function): Async function that processes jobs

#### `addJob(queueName, jobName, data, options?)`

Add a job to a queue.

**Parameters:**
- `queueName` (string): Queue name
- `jobName` (string): Job name/type
- `data` (any): Job payload
- `options` (object):
  - `priority` (JobPriority): Job priority level
  - `scheduledAt` (Date): When to execute the job
  - `attempts` (number): Max retry attempts
  - `backoff` (object): Retry backoff configuration
  - `chainTo` (array): Jobs to chain after this one
  - `metadata` (object): Custom metadata

**Returns:** Promise<Job>

#### `addBulk(queueName, jobs)`

Add multiple jobs at once.

**Parameters:**
- `queueName` (string): Queue name
- `jobs` (array): Array of job objects

**Returns:** Promise<Job[]>

#### `executeWorkflow(workflow)`

Execute a multi-step workflow.

**Parameters:**
- `workflow` (object): Workflow definition

**Returns:** Promise<void>

#### `getQueueMetrics(queueName)`

Get metrics for a specific queue.

**Returns:** Promise<QueueMetrics>

#### `getAllMetrics()`

Get metrics for all queues.

**Returns:** Promise<QueueMetrics[]>

#### `pauseQueue(queueName)`

Pause job processing for a queue.

#### `resumeQueue(queueName)`

Resume job processing for a paused queue.

#### `cleanQueue(queueName, grace?, status?)`

Clean old jobs from a queue.

**Parameters:**
- `grace` (number): Grace period in milliseconds (default: 24 hours)
- `status` ('completed' | 'failed'): Job status to clean

#### `shutdown()`

Gracefully shutdown all workers and close connections.

## Monitoring & Metrics

### Prometheus Metrics

The queue manager exposes the following Prometheus metrics at `/metrics`:

- `queue_jobs_added_total`: Counter of jobs added to queues
- `queue_jobs_processing`: Gauge of currently processing jobs
- `queue_jobs_completed_total`: Counter of completed jobs
- `queue_jobs_failed_total`: Counter of failed jobs
- `queue_job_processing_duration_ms`: Histogram of job processing duration

### Dashboard

Access the web dashboard at `http://localhost:3010` to view:

- Real-time queue metrics
- Job counts (waiting, active, completed, failed)
- Throughput graphs
- Error rates
- Average processing times
- Queue controls (pause, resume, clean)

## Horizontal Scaling

### Worker Auto-Scaling

```typescript
import { WorkerManager } from '@intelgraph/queue-manager';

const workerManager = new WorkerManager(connection, {
  minWorkers: 1,
  maxWorkers: 16, // Scale up to 16 workers per queue
  scaleUpThreshold: 100, // Scale up if queue > 100 jobs
  scaleDownThreshold: 10, // Scale down if queue < 10 jobs
  cpuThreshold: 0.8, // Don't scale up if CPU > 80%
  memoryThreshold: 0.85, // Don't scale up if memory > 85%
});

// Initialize worker pool
await workerManager.initializeWorkerPool('email-notifications', emailProcessor, 2);

// Start auto-scaling
workerManager.startAutoScaling(30000); // Check every 30 seconds

// Manually scale
await workerManager.scaleWorkers('email-notifications', 8, emailProcessor);
```

### Multi-Instance Deployment

Deploy multiple queue manager instances for high availability:

```yaml
# docker-compose.yml
version: '3.8'
services:
  queue-worker-1:
    image: queue-manager:latest
    environment:
      - REDIS_HOST=redis
      - WORKER_CONCURRENCY=10
    deploy:
      replicas: 3

  queue-worker-2:
    image: queue-manager:latest
    environment:
      - REDIS_HOST=redis
      - WORKER_CONCURRENCY=20
    deploy:
      replicas: 2

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
```

## Performance Tuning

### Redis Configuration

For high-throughput scenarios:

```bash
# redis.conf
maxmemory 8gb
maxmemory-policy allkeys-lru
save ""  # Disable RDB snapshots for performance
appendonly yes
appendfsync everysec
```

### Worker Concurrency

Adjust concurrency based on job characteristics:

- **CPU-bound jobs**: Set concurrency = number of CPU cores
- **I/O-bound jobs**: Set concurrency = 2-4x CPU cores
- **Mixed workloads**: Monitor and tune based on metrics

### Queue Separation

Separate queues by:
- **Priority**: Critical, high, normal, low
- **Resource type**: CPU-intensive, I/O-intensive, memory-intensive
- **Latency requirements**: Real-time, near-real-time, batch

## Best Practices

1. **Idempotent Jobs**: Design jobs to be safely retried
2. **Small Payloads**: Keep job data small; store large data externally
3. **Timeout Handling**: Set appropriate timeouts for job execution
4. **Error Handling**: Use try-catch and return meaningful error messages
5. **Monitoring**: Monitor queue depth, processing time, and error rates
6. **Resource Limits**: Set rate limits to protect downstream services
7. **Dead Letter Queue**: Monitor and handle permanently failed jobs
8. **Graceful Degradation**: Handle Redis connection failures gracefully

## Troubleshooting

### High Memory Usage

```typescript
// Aggressive cleanup of completed jobs
await queueManager.cleanQueue('my-queue', 3600000, 'completed'); // 1 hour

// Or configure on queue registration
queueManager.registerQueue('my-queue', {
  defaultJobOptions: {
    removeOnComplete: {
      age: 3600, // 1 hour
      count: 100,
    },
  },
});
```

### Stalled Jobs

Stalled jobs are automatically retried. Monitor stalled counts:

```typescript
const metrics = await queueManager.getQueueMetrics('my-queue');
console.log('Stalled:', metrics.stalled);
```

### Connection Issues

Implement connection retry logic:

```typescript
const connection = new IORedis({
  host: 'redis',
  port: 6379,
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});
```

## Contributing

See the main project CONTRIBUTING.md for guidelines.

## License

MIT
