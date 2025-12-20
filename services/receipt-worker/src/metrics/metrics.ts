import {
  Counter,
  Gauge,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

export class ReceiptWorkerMetrics {
  private readonly registry: Registry;
  private readonly queueLagSeconds: Gauge;
  private readonly dlqDepthGauge: Gauge;
  private readonly retryCounter: Counter;
  private readonly dlqCounter: Counter;
  private readonly successCounter: Counter;

  constructor(registry?: Registry) {
    this.registry = registry ?? new Registry();
    collectDefaultMetrics({ register: this.registry });

    this.queueLagSeconds = new Gauge({
      name: 'receipt_queue_lag_seconds',
      help: 'Time spent in the queue before processing (seconds).',
      registers: [this.registry],
    });

    this.dlqDepthGauge = new Gauge({
      name: 'receipt_dlq_depth',
      help: 'Number of messages currently in the dead-letter queue.',
      registers: [this.registry],
    });

    this.retryCounter = new Counter({
      name: 'receipt_retry_total',
      help: 'Number of retries triggered by transient failures.',
      registers: [this.registry],
    });

    this.dlqCounter = new Counter({
      name: 'receipt_dlq_total',
      help: 'Total messages routed to the dead-letter queue.',
      registers: [this.registry],
    });

    this.successCounter = new Counter({
      name: 'receipt_processed_total',
      help: 'Total successfully processed receipt messages.',
      registers: [this.registry],
    });
  }

  observeLag(seconds: number): void {
    this.queueLagSeconds.set(seconds);
  }

  recordRetry(): void {
    this.retryCounter.inc();
  }

  recordSuccess(): void {
    this.successCounter.inc();
  }

  recordDlq(depth: number): void {
    this.dlqCounter.inc();
    this.updateDlqDepth(depth);
  }

  updateDlqDepth(depth: number): void {
    this.dlqDepthGauge.set(depth);
  }

  getRegistry(): Registry {
    return this.registry;
  }

  async getLatestLag(): Promise<number> {
    const values = (await this.queueLagSeconds.get()).values?.[0];
    return values?.value ?? 0;
  }

  async getDlqDepth(): Promise<number> {
    const values = (await this.dlqDepthGauge.get()).values?.[0];
    return values?.value ?? 0;
  }
}
