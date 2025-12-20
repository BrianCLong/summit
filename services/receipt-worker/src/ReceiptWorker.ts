import { InMemoryQueue } from './queue/InMemoryQueue.js';
import { ReceiptHandler, ReceiptJob, ReceiptWorkerConfig } from './types.js';
import { ReceiptWorkerMetrics } from './metrics/metrics.js';

export interface ReceiptWorkerOptions<TPayload = unknown> {
  queue: InMemoryQueue<TPayload>;
  deadLetterQueue: InMemoryQueue<TPayload>;
  handler: ReceiptHandler<TPayload>;
  metrics: ReceiptWorkerMetrics;
  config?: Partial<ReceiptWorkerConfig>;
}

const defaultConfig: ReceiptWorkerConfig = {
  maxAttempts: 5,
  backoffMs: 250,
  backoffCapMs: 5_000,
  pollIntervalMs: 50,
};

export class ReceiptWorker<TPayload = unknown> {
  private readonly queue: InMemoryQueue<TPayload>;
  private readonly deadLetterQueue: InMemoryQueue<TPayload>;
  private readonly handler: ReceiptHandler<TPayload>;
  private readonly metrics: ReceiptWorkerMetrics;
  private readonly config: ReceiptWorkerConfig;
  private processing = false;
  private poller?: ReturnType<typeof setInterval>;
  private readonly backoffTimers = new Set<ReturnType<typeof setTimeout>>();

  constructor(options: ReceiptWorkerOptions<TPayload>) {
    this.queue = options.queue;
    this.deadLetterQueue = options.deadLetterQueue;
    this.handler = options.handler;
    this.metrics = options.metrics;
    this.config = { ...defaultConfig, ...options.config };
  }

  start(): void {
    if (this.poller) {
      return;
    }

    this.poller = setInterval(
      () => this.processNext().catch((error) => this.logError(error)),
      this.config.pollIntervalMs,
    );
  }

  stop(): void {
    if (this.poller) {
      clearInterval(this.poller);
      this.poller = undefined;
    }

    for (const timer of this.backoffTimers) {
      clearTimeout(timer);
    }

    this.backoffTimers.clear();
  }

  private async processNext(): Promise<void> {
    if (this.processing) {
      return;
    }

    const job = this.queue.dequeue();
    if (!job) {
      return;
    }

    this.processing = true;
    const startedAt = Date.now();

    try {
      this.metrics.observeLag((startedAt - job.firstEnqueuedAt) / 1000);
      await this.handler(job);
      this.metrics.recordSuccess();
    } catch (error) {
      await this.handleFailure(job, error as Error);
    } finally {
      this.processing = false;
    }
  }

  private async handleFailure(job: ReceiptJob<TPayload>, error: Error) {
    const nextAttempt = job.attempts + 1;

    if (nextAttempt >= this.config.maxAttempts) {
      this.routeToDeadLetter(job, error);
      return;
    }

    const delay = Math.min(
      this.config.backoffMs * 2 ** (nextAttempt - 1),
      this.config.backoffCapMs,
    );

    this.metrics.recordRetry();
    const timer = setTimeout(() => {
      this.backoffTimers.delete(timer);
      this.queue.enqueue({
        ...job,
        attempts: nextAttempt,
        enqueuedAt: Date.now(),
      });
    }, delay);

    this.backoffTimers.add(timer);
  }

  private routeToDeadLetter(job: ReceiptJob<TPayload>, error: Error) {
    this.deadLetterQueue.enqueue({
      ...job,
      attempts: job.attempts + 1,
      enqueuedAt: Date.now(),
      lastError: error.message,
    });

    this.metrics.recordDlq(this.deadLetterQueue.size());
  }

  private logError(error: unknown): void {
    // eslint-disable-next-line no-console
    console.error('[receipt-worker] error encountered', error);
  }
}
