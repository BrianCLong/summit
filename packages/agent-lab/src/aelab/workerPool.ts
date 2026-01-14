export interface WorkerPool {
  run<T, R>(items: T[], handler: (item: T) => Promise<R>): Promise<R[]>;
}

export class LocalWorkerPool implements WorkerPool {
  constructor(private readonly maxParallel = 1) {}

  async run<T, R>(items: T[], handler: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let index = 0;

    const worker = async () => {
      while (true) {
        const current = index;
        index += 1;
        if (current >= items.length) return;
        results[current] = await handler(items[current]);
      }
    };

    const workers = Array.from({ length: Math.max(1, this.maxParallel) }, () => worker());
    await Promise.all(workers);
    return results;
  }
}
