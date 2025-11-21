import { AggregateFunction } from './types';

/**
 * Common aggregation functions for stream processing
 */

/**
 * Count aggregation
 */
export function count<T>(): AggregateFunction<T, number, number> {
  return {
    createAccumulator: () => 0,
    add: (value, accumulator) => accumulator + 1,
    getResult: (accumulator) => accumulator,
    merge: (acc1, acc2) => acc1 + acc2,
  };
}

/**
 * Sum aggregation
 */
export function sum<T>(
  selector: (value: T) => number
): AggregateFunction<T, number, number> {
  return {
    createAccumulator: () => 0,
    add: (value, accumulator) => accumulator + selector(value),
    getResult: (accumulator) => accumulator,
    merge: (acc1, acc2) => acc1 + acc2,
  };
}

/**
 * Average aggregation
 */
export function average<T>(
  selector: (value: T) => number
): AggregateFunction<T, { sum: number; count: number }, number> {
  return {
    createAccumulator: () => ({ sum: 0, count: 0 }),
    add: (value, accumulator) => ({
      sum: accumulator.sum + selector(value),
      count: accumulator.count + 1,
    }),
    getResult: (accumulator) =>
      accumulator.count > 0 ? accumulator.sum / accumulator.count : 0,
    merge: (acc1, acc2) => ({
      sum: acc1.sum + acc2.sum,
      count: acc1.count + acc2.count,
    }),
  };
}

/**
 * Min aggregation
 */
export function min<T>(
  selector: (value: T) => number
): AggregateFunction<T, number, number> {
  return {
    createAccumulator: () => Number.MAX_VALUE,
    add: (value, accumulator) => Math.min(accumulator, selector(value)),
    getResult: (accumulator) => accumulator,
    merge: (acc1, acc2) => Math.min(acc1, acc2),
  };
}

/**
 * Max aggregation
 */
export function max<T>(
  selector: (value: T) => number
): AggregateFunction<T, number, number> {
  return {
    createAccumulator: () => Number.MIN_VALUE,
    add: (value, accumulator) => Math.max(accumulator, selector(value)),
    getResult: (accumulator) => accumulator,
    merge: (acc1, acc2) => Math.max(acc1, acc2),
  };
}

/**
 * Collect to list aggregation
 */
export function collectList<T>(): AggregateFunction<T, T[], T[]> {
  return {
    createAccumulator: () => [],
    add: (value, accumulator) => {
      accumulator.push(value);
      return accumulator;
    },
    getResult: (accumulator) => accumulator,
    merge: (acc1, acc2) => acc1.concat(acc2),
  };
}

/**
 * Collect to set aggregation (distinct values)
 */
export function collectSet<T>(): AggregateFunction<T, Set<T>, Set<T>> {
  return {
    createAccumulator: () => new Set<T>(),
    add: (value, accumulator) => {
      accumulator.add(value);
      return accumulator;
    },
    getResult: (accumulator) => accumulator,
    merge: (acc1, acc2) => new Set([...acc1, ...acc2]),
  };
}

/**
 * Top-K aggregation
 */
export function topK<T>(
  k: number,
  comparator: (a: T, b: T) => number
): AggregateFunction<T, T[], T[]> {
  return {
    createAccumulator: () => [],
    add: (value, accumulator) => {
      accumulator.push(value);
      accumulator.sort(comparator);
      return accumulator.slice(0, k);
    },
    getResult: (accumulator) => accumulator,
    merge: (acc1, acc2) => {
      const merged = acc1.concat(acc2);
      merged.sort(comparator);
      return merged.slice(0, k);
    },
  };
}

/**
 * Moving average aggregation
 */
export function movingAverage<T>(
  windowSize: number,
  selector: (value: T) => number
): AggregateFunction<T, { values: number[]; sum: number }, number> {
  return {
    createAccumulator: () => ({ values: [], sum: 0 }),
    add: (value, accumulator) => {
      const numValue = selector(value);
      accumulator.values.push(numValue);
      accumulator.sum += numValue;

      if (accumulator.values.length > windowSize) {
        const removed = accumulator.values.shift()!;
        accumulator.sum -= removed;
      }

      return accumulator;
    },
    getResult: (accumulator) =>
      accumulator.values.length > 0
        ? accumulator.sum / accumulator.values.length
        : 0,
    merge: (acc1, acc2) => {
      const merged = {
        values: acc1.values.concat(acc2.values).slice(-windowSize),
        sum: 0,
      };
      merged.sum = merged.values.reduce((a, b) => a + b, 0);
      return merged;
    },
  };
}

/**
 * Percentile aggregation (approximate using t-digest)
 */
export function percentile<T>(
  p: number,
  selector: (value: T) => number
): AggregateFunction<T, number[], number> {
  return {
    createAccumulator: () => [],
    add: (value, accumulator) => {
      accumulator.push(selector(value));
      return accumulator;
    },
    getResult: (accumulator) => {
      if (accumulator.length === 0) return 0;

      const sorted = accumulator.slice().sort((a, b) => a - b);
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, index)];
    },
    merge: (acc1, acc2) => acc1.concat(acc2),
  };
}

/**
 * Distinct count using HyperLogLog (approximate)
 */
export function distinctCount<T>(
  selector: (value: T) => string
): AggregateFunction<T, Set<string>, number> {
  return {
    createAccumulator: () => new Set<string>(),
    add: (value, accumulator) => {
      accumulator.add(selector(value));
      return accumulator;
    },
    getResult: (accumulator) => accumulator.size,
    merge: (acc1, acc2) => new Set([...acc1, ...acc2]),
  };
}

/**
 * Group by aggregation
 */
export function groupBy<T, K>(
  keySelector: (value: T) => K
): AggregateFunction<T, Map<K, T[]>, Map<K, T[]>> {
  return {
    createAccumulator: () => new Map<K, T[]>(),
    add: (value, accumulator) => {
      const key = keySelector(value);
      if (!accumulator.has(key)) {
        accumulator.set(key, []);
      }
      accumulator.get(key)!.push(value);
      return accumulator;
    },
    getResult: (accumulator) => accumulator,
    merge: (acc1, acc2) => {
      const merged = new Map(acc1);
      for (const [key, values] of acc2) {
        if (merged.has(key)) {
          merged.get(key)!.push(...values);
        } else {
          merged.set(key, values);
        }
      }
      return merged;
    },
  };
}

/**
 * Reduce aggregation
 */
export function reduce<T, R>(
  initialValue: R,
  reducer: (accumulator: R, value: T) => R
): AggregateFunction<T, R, R> {
  return {
    createAccumulator: () => initialValue,
    add: (value, accumulator) => reducer(accumulator, value),
    getResult: (accumulator) => accumulator,
    merge: (acc1, acc2) => reducer(acc1, acc2 as any), // Merge not straightforward for reduce
  };
}
