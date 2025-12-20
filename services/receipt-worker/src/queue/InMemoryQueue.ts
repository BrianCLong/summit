import { ReceiptJob } from '../types.js';

export class InMemoryQueue<TPayload = unknown> {
  private queue: Array<ReceiptJob<TPayload>> = [];

  enqueue(job: Omit<ReceiptJob<TPayload>, 'attempts' | 'enqueuedAt'> & {
    attempts?: number;
    enqueuedAt?: number;
    firstEnqueuedAt?: number;
  }): void {
    const normalizedJob: ReceiptJob<TPayload> = {
      ...job,
      attempts: job.attempts ?? 0,
      enqueuedAt: job.enqueuedAt ?? Date.now(),
      firstEnqueuedAt: job.firstEnqueuedAt ?? Date.now(),
    };

    this.queue.push(normalizedJob);
  }

  dequeue(): ReceiptJob<TPayload> | undefined {
    return this.queue.shift();
  }

  size(): number {
    return this.queue.length;
  }

  drain(): ReceiptJob<TPayload>[] {
    const drained = [...this.queue];
    this.queue = [];
    return drained;
  }
}
