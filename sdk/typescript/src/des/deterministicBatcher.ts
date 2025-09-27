export class DeterministicBatcher<T> {
  constructor(private readonly batchSize: number) {
    if (!Number.isInteger(batchSize) || batchSize <= 0) {
      throw new Error('Batch size must be a positive integer');
    }
  }

  batch<K>(items: T[], keyFn: (item: T) => K): T[][] {
    const sorted = [...items].sort((lhs, rhs) => {
      const left = keyFn(lhs);
      const right = keyFn(rhs);
      if (left < right) return -1;
      if (left > right) return 1;
      return 0;
    });
    return this.chunk(sorted);
  }

  batchWithScore(items: T[], scoreFn: (item: T) => number): T[][] {
    const sorted = [...items].sort((lhs, rhs) => scoreFn(lhs) - scoreFn(rhs));
    return this.chunk(sorted);
  }

  private chunk(sorted: T[]): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < sorted.length; i += this.batchSize) {
      result.push(sorted.slice(i, i + this.batchSize));
    }
    return result;
  }
}

export const defaultBatcher = <T>(): DeterministicBatcher<T> =>
  new DeterministicBatcher<T>(64);
