import { ProcessedTelemetryEvent } from './client-types';

export class OfflineBatcher {
  private readonly queue: ProcessedTelemetryEvent[] = [];

  constructor(private readonly maxBatchSize: number = 50) {}

  enqueue(event: ProcessedTelemetryEvent): number {
    this.queue.push(event);
    return this.queue.length;
  }

  shouldFlush(): boolean {
    return this.queue.length >= this.maxBatchSize;
  }

  flush(): ProcessedTelemetryEvent[] {
    const snapshot = [...this.queue];
    this.queue.length = 0;
    return snapshot;
  }

  size(): number {
    return this.queue.length;
  }
}
