import pino from 'pino';
import { ExecutionReceipt } from '@intelgraph/provenance';

export interface ReceiptJob {
  id: string;
  receipt: ExecutionReceipt;
  attempts?: number;
}

export interface WorkerMetrics {
  queueDepth: number;
  dlqDepth: number;
  processed: number;
  failed: number;
  backpressure: boolean;
}

export interface ReceiptWorkerOptions {
  maxAttempts?: number;
  backpressureThreshold?: number;
  logger?: pino.Logger;
}

export type ReceiptProcessor = (receipt: ExecutionReceipt) => Promise<void>;

export class ReceiptWorker {
  private readonly maxAttempts: number;
  private readonly backpressureThreshold: number;
  private readonly logger: pino.Logger;
  private readonly queue: ReceiptJob[] = [];
  private readonly dlq: ReceiptJob[] = [];
  private processing = false;
  private metrics: WorkerMetrics = {
    queueDepth: 0,
    dlqDepth: 0,
    processed: 0,
    failed: 0,
    backpressure: false,
  };

  constructor(
    private readonly processor: ReceiptProcessor,
    options: ReceiptWorkerOptions = {},
  ) {
    this.maxAttempts = options.maxAttempts ?? 3;
    this.backpressureThreshold = options.backpressureThreshold ?? 50;
    this.logger = options.logger ?? pino({ name: 'receipt-worker' });
  }

  enqueue(job: ReceiptJob): void {
    this.queue.push({ ...job, attempts: job.attempts ?? 0 });
    this.updateMetrics();
    this.maybeProcess();
  }

  metricsSnapshot(): WorkerMetrics {
    return { ...this.metrics };
  }

  private updateMetrics(): void {
    this.metrics = {
      ...this.metrics,
      queueDepth: this.queue.length,
      dlqDepth: this.dlq.length,
      backpressure: this.queue.length >= this.backpressureThreshold,
    };
  }

  private maybeProcess(): void {
    if (this.processing) return;
    this.processing = true;
    setImmediate(() => this.drain());
  }

  private async drain(): Promise<void> {
    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      try {
        await this.processor(job.receipt);
        this.metrics.processed += 1;
      } catch (err) {
        const attempts = (job.attempts ?? 0) + 1;
        if (attempts >= this.maxAttempts) {
          this.logger.error({ id: job.id, err }, 'job moved to DLQ');
          this.metrics.failed += 1;
          this.dlq.push({ ...job, attempts });
        } else {
          this.logger.warn({ id: job.id, attempts }, 'retrying receipt job');
          this.queue.push({ ...job, attempts });
        }
      }
      this.updateMetrics();
    }
    this.processing = false;
  }
}
