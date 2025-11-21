/**
 * Simple async queue with concurrency control
 * Replaces p-queue for better portability
 */

interface QueueTask<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

export class AsyncQueue {
  private concurrency: number;
  private running: number = 0;
  private queue: QueueTask<any>[] = [];

  constructor(options?: { concurrency?: number }) {
    this.concurrency = options?.concurrency || 1;
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.running++;

    try {
      const result = await task.fn();
      task.resolve(result);
    } catch (error) {
      task.reject(error as Error);
    } finally {
      this.running--;
      this.process();
    }
  }

  get size(): number {
    return this.queue.length;
  }

  get pending(): number {
    return this.running;
  }

  clear(): void {
    this.queue = [];
  }
}
