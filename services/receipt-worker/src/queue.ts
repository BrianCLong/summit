import { Receipt, signReceipt, ReceiptSignature } from '@intelgraph/provenance';

interface Logger {
  debug: (msg: unknown, ...args: unknown[]) => void;
  warn: (msg: unknown, ...args: unknown[]) => void;
  error: (msg: unknown, ...args: unknown[]) => void;
}

export interface ReceiptJob {
  id: string;
  draft: Omit<Receipt, 'signature' | 'proofs' | 'payloadHash' | 'version'> & {
    signature?: Partial<ReceiptSignature>;
  };
  attempt?: number;
}

export interface ReceiptWorkerOptions {
  maxAttempts?: number;
  backpressureThreshold?: number;
  handler?: (job: ReceiptJob) => Promise<Receipt>;
  logger?: Logger;
}

export class ReceiptWorker {
  private readonly queue: ReceiptJob[] = [];

  private readonly dlq: ReceiptJob[] = [];

  private readonly maxAttempts: number;

  private readonly backpressureThreshold: number;

  private readonly handler: (job: ReceiptJob) => Promise<Receipt>;

  private readonly logger: Logger;

  private processedCount = 0;

  private failedCount = 0;

  private dlqCount = 0;

  constructor(options: ReceiptWorkerOptions = {}) {
    this.maxAttempts = options.maxAttempts ?? 3;
    this.backpressureThreshold = options.backpressureThreshold ?? 20;
    this.handler = options.handler ?? (async (job) => signReceipt(job.draft));
    this.logger =
      options.logger ??
      ({
        debug: () => {},
        warn: () => {},
        error: () => {},
      } satisfies Logger);
  }

  enqueue(job: ReceiptJob) {
    this.queue.push({ ...job, attempt: job.attempt ?? 0 });
    this.updateGauges();
  }

  getQueueLength() {
    return this.queue.length;
  }

  getDlqLength() {
    return this.dlq.length;
  }

  getMetricsSnapshot() {
    return {
      queue: this.queue.length,
      dlq: this.dlq.length,
      backpressure: this.queue.length >= this.backpressureThreshold,
      processed: this.processedCount,
      failed: this.failedCount,
    };
  }

  async tick(): Promise<Receipt | null> {
    const job = this.queue.shift();
    if (!job) return null;

    try {
      const receipt = await this.handler(job);
      this.processedCount += 1;
      this.logger.debug({ jobId: job.id, receiptId: receipt.id }, 'processed receipt job');
      return receipt;
    } catch (err) {
      job.attempt = (job.attempt ?? 0) + 1;
      this.failedCount += 1;
      this.logger.warn({ jobId: job.id, attempt: job.attempt, err }, 'receipt job failed');

      if (job.attempt >= this.maxAttempts) {
        this.dlq.push(job);
        this.dlqCount += 1;
        this.logger.error({ jobId: job.id }, 'receipt job moved to DLQ');
      } else {
        this.queue.push(job);
      }
    } finally {
      this.updateGauges();
    }

    return null;
  }

  async drain(): Promise<void> {
    while (this.queue.length > 0) {
      await this.tick();
    }
  }

  private updateGauges() {
    // no-op placeholder for future metrics integration
  }
}

export function buildSignedReceiptDraft(
  overrides: Partial<Receipt>,
  signature?: Partial<ReceiptSignature>,
): Omit<Receipt, 'signature' | 'proofs' | 'payloadHash' | 'version'> & {
  signature?: Partial<ReceiptSignature>;
} {
  return {
    id: overrides.id ?? 'job',
    caseId: overrides.caseId ?? 'case',
    claimIds: overrides.claimIds ?? ['claim'],
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    actor: overrides.actor ?? { id: 'worker', role: 'system' },
    pipeline: overrides.pipeline,
    metadata: overrides.metadata,
    redactions: overrides.redactions,
    signature,
  };
}
