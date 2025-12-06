# Distributed Job Queue System

This document describes the BullMQ + Redis job queue foundation used for async workloads.

## Capabilities

- **BullMQ/Redis integration** using shared connection pooling and `QueueScheduler` for reliable delayed/retried jobs.
- **Priority queues** with configurable per-job priority and FIFO/LIFO controls.
- **Retries with exponential backoff** configured by default, overridable per job.
- **Dead-letter queues** that capture exhausted jobs with failure metadata for triage.
- **Progress tracking** via worker and queue event listeners with subscription helpers.
- **Job scheduling** using delayed jobs for absolute timestamps and repeat rules for cron-like workloads.
- **Worker management** with explicit start, pause/resume, shutdown, and concurrency controls.
- **Graceful lifecycle** that waits for schedulers/events to be ready before processing and exposes queue metrics for observability.

## Usage

```ts
import { JobQueue } from '../queue/job-queue.js';

const queue = new JobQueue<{ userId: string; exportId: string }>({
  name: 'export-jobs',
  deadLetterQueueName: 'export-jobs-dlq',
  workerOptions: { concurrency: 10 },
});

await queue.start(async (job) => {
  await job.updateProgress(10);
  // ...do work...
  await job.updateProgress(100);
  return { status: 'complete' };
});

const jobId = await queue.enqueue({ userId: '123', exportId: 'abc' }, {
  priority: 1,
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
});

queue.onProgress(({ jobId, progress }) => console.log(jobId, progress));

const metrics = await queue.metrics();
console.log(metrics);
```

## Dead-letter Handling

Jobs that exhaust their configured attempts are forwarded to the configured dead-letter queue with a payload that includes the failing job ID, the failure reason, and the original job data. Operators can inspect this queue to replay or diagnose failures.

## Observability

- Queue metrics (`waiting`, `active`, `completed`, `failed`, `delayed`) are surfaced via the `metrics()` helper.
- Progress events are emitted for any worker-initiated progress updates or queue-level progress events.
- Default retention keeps 1,000 completed jobs for 24 hours and failed jobs for seven days to support debugging without unbounded growth.
