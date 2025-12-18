# Job Queue Infrastructure

**Issue:** #11812 - Job Queue with Bull and Redis

## Overview

The IntelGraph Platform implements a robust job queue system using:
- **BullMQ** - High-performance job queue based on Redis
- **Redis** - In-memory data store for queue persistence
- **Bull Board** - Web-based dashboard for queue monitoring
- **Scheduled Jobs** - Cron-like repeatable tasks
- **Retry Logic** - Automatic retry with exponential backoff

## Architecture

```
┌──────────────┐
│ Application  │
│   Code       │
└──────┬───────┘
       │
       │ Add Job
       │
  ┌────▼────────┐
  │   Queue     │
  │   (Redis)   │
  └────┬────────┘
       │
       │ Process
       │
  ┌────▼────────┐
  │   Worker    │
  │  (BullMQ)   │
  └────┬────────┘
       │
       ├─────────────┬──────────────┐
       │             │              │
  ┌────▼────┐  ┌────▼────┐   ┌────▼────┐
  │Success  │  │ Retry   │   │ Failed  │
  └─────────┘  └─────────┘   └─────────┘
       │
  ┌────▼────────┐
  │ Bull Board  │
  │ Dashboard   │
  └─────────────┘
```

## Quick Start

### 1. Start Redis

```bash
# Using Docker Compose
docker-compose -f docker-compose.dev.yml up redis

# Or standalone
docker run -p 6379:6379 redis:7-alpine
```

### 2. Access Bull Board Dashboard

Navigate to: http://localhost:4000/queues

The dashboard shows:
- Active jobs
- Completed jobs
- Failed jobs
- Queue statistics
- Job details

## Creating a Queue

### Define Queue Name

```typescript
// server/src/queues/config.ts
export enum QueueName {
  EMAIL = 'email',
  NOTIFICATIONS = 'notifications',
  DATA_PROCESSING = 'data-processing',
  ANALYTICS = 'analytics',
}
```

### Get or Create Queue

```typescript
import { queueRegistry, QueueName } from './queues/config';

const queue = queueRegistry.getQueue(QueueName.EMAIL);
```

## Adding Jobs

### Simple Job

```typescript
import { addJob, QueueName, JobPriority } from './queues/config';

await addJob(
  QueueName.EMAIL,
  'send-welcome-email',
  {
    to: 'user@example.com',
    subject: 'Welcome to IntelGraph',
    body: 'Thank you for signing up!',
  },
  {
    priority: JobPriority.HIGH,
  }
);
```

### Delayed Job

```typescript
await addJob(
  QueueName.NOTIFICATIONS,
  'send-reminder',
  { message: 'Your trial expires soon' },
  {
    delay: 24 * 60 * 60 * 1000, // 24 hours
  }
);
```

### Job with Custom Retry

```typescript
await addJob(
  QueueName.DATA_PROCESSING,
  'process-data',
  { userId: 'user123', dataId: 'data456' },
  {
    attempts: 5,
    priority: JobPriority.CRITICAL,
  }
);
```

## Creating a Job Processor

### Basic Processor

```typescript
import { Job } from 'bullmq';
import { queueRegistry, QueueName } from './queues/config';
import logger from './utils/logger';

export interface MyJobData {
  userId: string;
  action: string;
}

export async function processMyJob(job: Job<MyJobData>): Promise<void> {
  logger.info(`Processing job ${job.id}`, {
    jobId: job.id,
    userId: job.data.userId,
  });

  try {
    // Your processing logic here
    await doWork(job.data);

    // Update progress
    await job.updateProgress(100);

    logger.info(`Job completed: ${job.id}`);
  } catch (error) {
    logger.error(`Job failed: ${job.id}`, {
      error: error instanceof Error ? error.message : String(error),
    });

    // Rethrow to trigger retry
    throw error;
  }
}

// Register worker
queueRegistry.registerWorker(QueueName.DATA_PROCESSING, processMyJob, {
  concurrency: 5,
});
```

### Processor with Progress Updates

```typescript
export async function processLargeFile(job: Job<FileData>): Promise<void> {
  const totalSteps = 100;

  for (let i = 0; i < totalSteps; i++) {
    await processChunk(i);

    // Update progress
    const progress = Math.floor((i / totalSteps) * 100);
    await job.updateProgress(progress);

    // Check if job is cancelled
    if (await job.isWaitingChildren()) {
      throw new Error('Job cancelled');
    }
  }

  await job.updateProgress(100);
}
```

### Processor with Error Handling

```typescript
export async function processWithRetry(job: Job<Data>): Promise<void> {
  const maxRetries = 3;
  const currentAttempt = job.attemptsMade;

  try {
    await riskyOperation(job.data);
  } catch (error) {
    if (currentAttempt < maxRetries) {
      logger.warn(`Job failed, will retry: ${job.id}`, {
        attempt: currentAttempt,
        maxRetries,
      });
      throw error; // Trigger retry
    } else {
      logger.error(`Job failed permanently: ${job.id}`, {
        attempts: currentAttempt,
      });
      // Handle permanent failure
      await notifyFailure(job.data);
      throw error;
    }
  }
}
```

## Scheduled Jobs (Cron)

### Adding Repeatable Jobs

```typescript
import { addRepeatableJob, QueueName } from './queues/config';

// Daily cleanup at 2 AM
await addRepeatableJob(
  QueueName.ANALYTICS,
  'daily-cleanup',
  {},
  '0 2 * * *'
);

// Hourly analytics
await addRepeatableJob(
  QueueName.ANALYTICS,
  'hourly-stats',
  {},
  '0 * * * *'
);

// Weekly report every Monday at 9 AM
await addRepeatableJob(
  QueueName.ANALYTICS,
  'weekly-report',
  {},
  '0 9 * * 1'
);
```

### Cron Pattern Examples

| Pattern | Description |
|---------|-------------|
| `* * * * *` | Every minute |
| `0 * * * *` | Every hour |
| `0 0 * * *` | Daily at midnight |
| `0 2 * * *` | Daily at 2 AM |
| `0 9 * * 1` | Every Monday at 9 AM |
| `0 0 1 * *` | First day of month |
| `*/15 * * * *` | Every 15 minutes |

## Job Priorities

```typescript
export enum JobPriority {
  CRITICAL = 1,  // Highest priority
  HIGH = 2,
  NORMAL = 3,    // Default
  LOW = 4,
  BACKGROUND = 5 // Lowest priority
}

// Use in job options
await addJob(queueName, jobName, data, {
  priority: JobPriority.CRITICAL,
});
```

## Retry Configuration

### Exponential Backoff

```typescript
await queue.add('job-name', data, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000, // 2s, 4s, 8s
  },
});
```

### Fixed Delay

```typescript
await queue.add('job-name', data, {
  attempts: 5,
  backoff: {
    type: 'fixed',
    delay: 5000, // 5s between each attempt
  },
});
```

### Custom Backoff

```typescript
await queue.add('job-name', data, {
  attempts: 3,
  backoff: {
    type: 'custom',
  },
});

// In worker options
queueRegistry.registerWorker(queueName, processor, {
  settings: {
    backoffStrategy: (attemptsMade: number) => {
      return attemptsMade * 1000 * Math.random();
    },
  },
});
```

## Job Lifecycle

```
┌──────────┐
│  Added   │
└────┬─────┘
     │
┌────▼────────┐
│   Waiting   │
└────┬────────┘
     │
┌────▼────────┐
│   Active    │
└────┬────────┘
     │
     ├─────────────┬──────────────┐
     │             │              │
┌────▼────┐  ┌────▼────┐   ┌────▼────┐
│Completed│  │ Failed  │   │ Delayed │
└─────────┘  └────┬────┘   └────┬────┘
                  │              │
             ┌────▼────┐         │
             │ Retry   │◄────────┘
             └────┬────┘
                  │
             ┌────▼────────┐
             │Permanently  │
             │  Failed     │
             └─────────────┘
```

## Monitoring

### Bull Board Dashboard

Access at http://localhost:4000/queues

Features:
- View all queues
- Monitor job states (waiting, active, completed, failed)
- Inspect job data and results
- Manually retry failed jobs
- Remove jobs
- View job logs
- Performance metrics

### Queue Metrics

```typescript
const queue = queueRegistry.getQueue(QueueName.EMAIL);

// Get counts
const counts = await queue.getJobCounts();
// { waiting: 5, active: 2, completed: 100, failed: 3 }

// Get waiting jobs
const waiting = await queue.getWaiting();

// Get failed jobs
const failed = await queue.getFailed();

// Get job by ID
const job = await queue.getJob('job-id-123');
```

### Programmatic Monitoring

```typescript
import logger from './utils/logger';

const queue = queueRegistry.getQueue(QueueName.EMAIL);

// Monitor queue events
queue.on('waiting', (jobId) => {
  logger.info(`Job waiting: ${jobId}`);
});

queue.on('active', (job) => {
  logger.info(`Job active: ${job.id}`);
});

queue.on('completed', (job, result) => {
  logger.info(`Job completed: ${job.id}`, { result });
});

queue.on('failed', (job, error) => {
  logger.error(`Job failed: ${job?.id}`, { error: error.message });
});
```

## Best Practices

### DO

✅ Use descriptive job names:
```typescript
await addJob(queue, 'send-password-reset-email', data);
```

✅ Include metadata for debugging:
```typescript
await addJob(queue, 'process-upload', {
  userId: 'user123',
  filename: 'data.csv',
  uploadedAt: new Date().toISOString(),
});
```

✅ Set appropriate priorities:
```typescript
// Critical user-facing operations
await addJob(queue, 'send-otp', data, {
  priority: JobPriority.CRITICAL,
});

// Background maintenance
await addJob(queue, 'cleanup-temp-files', {}, {
  priority: JobPriority.BACKGROUND,
});
```

✅ Handle errors gracefully:
```typescript
try {
  await processor(job.data);
} catch (error) {
  logger.error('Job processing error', { error });
  // Send to error tracking service
  throw error; // Trigger retry
}
```

✅ Use progress updates for long jobs:
```typescript
await job.updateProgress(25);
await job.updateProgress(50);
await job.updateProgress(75);
await job.updateProgress(100);
```

### DON'T

❌ Store large data in jobs:
```typescript
// BAD: Store reference instead
await addJob(queue, 'process', { fileContent: largeString });

// GOOD: Store reference
await addJob(queue, 'process', { fileId: 'file123' });
```

❌ Ignore failures silently:
```typescript
// BAD
catch (error) {
  // Swallow error
}

// GOOD
catch (error) {
  logger.error('Job failed', { error });
  throw error;
}
```

❌ Use jobs for real-time operations:
```typescript
// BAD: Use HTTP request instead
await addJob(queue, 'authenticate-user', credentials);

// GOOD: Use jobs for async work
await addJob(queue, 'send-welcome-email', { userId });
```

## Configuration

### Redis Configuration

```bash
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_QUEUE_DB=1
```

### Queue Worker Configuration

```bash
# .env
QUEUE_WORKER_CONCURRENCY=5  # Jobs per worker
```

### Queue Options

```typescript
const queue = new Queue('my-queue', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // 24 hours
      count: 1000,    // Keep last 1000
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // 7 days
    },
  },
});
```

## Troubleshooting

### Jobs not processing

1. Check Redis is running:
   ```bash
   docker-compose ps redis
   ```

2. Verify worker is registered:
   ```bash
   curl http://localhost:4000/queues/health
   ```

3. Check for errors in logs:
   ```bash
   tail -f logs/combined.log | grep -i queue
   ```

### Jobs failing repeatedly

1. Check Bull Board dashboard for error details
2. Review job data and processor logic
3. Increase retry attempts or delay
4. Add error handling and logging

### High Redis memory usage

1. Configure job retention:
   ```typescript
   removeOnComplete: true,
   removeOnFail: false, // Keep failed jobs for review
   ```

2. Clean up old jobs:
   ```typescript
   await queue.clean(24 * 3600 * 1000, 'completed');
   await queue.clean(7 * 24 * 3600 * 1000, 'failed');
   ```

## Examples

See `/server/src/queues/processors/` for examples:
- `emailProcessor.ts` - Email sending with retry
- `scheduledTasks.ts` - Cron-like scheduled jobs

## References

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Bull Board](https://github.com/felixmosh/bull-board)
- [Redis](https://redis.io/documentation)
- [Cron Expressions](https://crontab.guru/)
