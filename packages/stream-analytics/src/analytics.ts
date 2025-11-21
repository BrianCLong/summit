/**
 * Stream Analytics - Aggregation Functions
 *
 * These are standalone implementations that mirror the stream-processing package
 * for use in analytics scenarios.
 */

export type AggregateFunction<T, A, R> = {
  createAccumulator: () => A;
  add: (value: T, accumulator: A) => A;
  getResult: (accumulator: A) => R;
  merge?: (acc1: A, acc2: A) => A;
};

export function count<T>(): AggregateFunction<T, number, number> {
  return {
    createAccumulator: () => 0,
    add: (_value, accumulator) => accumulator + 1,
    getResult: (accumulator) => accumulator,
    merge: (acc1, acc2) => acc1 + acc2,
  };
}

export function sum<T>(selector: (value: T) => number): AggregateFunction<T, number, number> {
  return {
    createAccumulator: () => 0,
    add: (value, accumulator) => accumulator + selector(value),
    getResult: (accumulator) => accumulator,
    merge: (acc1, acc2) => acc1 + acc2,
  };
}

export function average<T>(selector: (value: T) => number): AggregateFunction<T, { sum: number; count: number }, number> {
  return {
    createAccumulator: () => ({ sum: 0, count: 0 }),
    add: (value, accumulator) => ({
      sum: accumulator.sum + selector(value),
      count: accumulator.count + 1,
    }),
    getResult: (accumulator) => accumulator.count > 0 ? accumulator.sum / accumulator.count : 0,
    merge: (acc1, acc2) => ({
      sum: acc1.sum + acc2.sum,
      count: acc1.count + acc2.count,
    }),
  };
}

export function min<T>(selector: (value: T) => number): AggregateFunction<T, number, number> {
  return {
    createAccumulator: () => Number.MAX_VALUE,
    add: (value, accumulator) => Math.min(accumulator, selector(value)),
    getResult: (accumulator) => accumulator,
    merge: (acc1, acc2) => Math.min(acc1, acc2),
  };
}

export function max<T>(selector: (value: T) => number): AggregateFunction<T, number, number> {
  return {
    createAccumulator: () => Number.MIN_VALUE,
    add: (value, accumulator) => Math.max(accumulator, selector(value)),
    getResult: (accumulator) => accumulator,
    merge: (acc1, acc2) => Math.max(acc1, acc2),
  };
}
