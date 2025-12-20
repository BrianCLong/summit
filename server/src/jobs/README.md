# Distributed Job Queue System

The Summit application uses [BullMQ](https://docs.bullmq.io/) for handling distributed background jobs, backed by Redis.

## Architecture

The system consists of the following components:

-   **Queue Factory**: A centralized factory (`server/src/queue/queue.factory.ts`) for creating queues and workers with consistent configuration (Redis connection, exponential backoff, retention policies).
-   **Job Manager**: The `JobManager` (`server/src/jobs/job.manager.ts`) initializes and manages all the queues and workers in the application.
-   **Processors**: Individual job processors (`server/src/jobs/processors/`) contain the logic for handling specific tasks.
-   **Dashboard**: A monitoring dashboard is available at `/admin/queues`, provided by `@bull-board`.

## Queues and Priorities

The following queues are configured:

-   `ingestion-queue`: For heavy data ingestion tasks. High concurrency.
-   `reports-queue`: For generating PDF/CSV reports.
-   `analytics-queue`: For running scheduled analytics.
-   `notifications-queue`: For sending emails and alerts. High priority.
-   `webhooks-queue`: For processing incoming and outgoing webhooks.

Jobs can be added with priority options (`priority: number`) where lower numbers indicate higher priority.

## Best Practices

1.  **Idempotency**: Ensure job processors are idempotent. Jobs may be retried if they fail or if the worker crashes.
2.  **Error Handling**: Let errors throw to trigger retries. Handle non-retriable errors by catching them and logging, or by configuring specific retry strategies.
3.  **Atomic Operations**: Use transactions where possible within the job to ensure data consistency.
4.  **Monitoring**: Use the dashboard to monitor queue health and the Prometheus metrics (`job_failures_total`, `job_processing_duration_seconds`) for alerting.

## Adding a New Job Type

1.  Create a new processor in `server/src/jobs/processors/`.
2.  Add a new queue name constant in `server/src/jobs/job.definitions.ts`.
3.  Register the queue and worker in `server/src/jobs/job.manager.ts`.
4.  Write a unit test in `server/src/jobs/__tests__/`.

## Metrics

Prometheus metrics are automatically collected:
-   `job_queue_added_total`
-   `job_processing_duration_seconds`
-   `job_failures_total`
