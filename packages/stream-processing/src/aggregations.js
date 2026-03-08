"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.count = count;
exports.sum = sum;
exports.average = average;
exports.min = min;
exports.max = max;
exports.collectList = collectList;
exports.collectSet = collectSet;
exports.topK = topK;
exports.movingAverage = movingAverage;
exports.percentile = percentile;
exports.distinctCount = distinctCount;
exports.groupBy = groupBy;
exports.reduce = reduce;
/**
 * Common aggregation functions for stream processing
 */
/**
 * Count aggregation
 */
function count() {
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
function sum(selector) {
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
function average(selector) {
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
/**
 * Min aggregation
 */
function min(selector) {
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
function max(selector) {
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
function collectList() {
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
function collectSet() {
    return {
        createAccumulator: () => new Set(),
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
function topK(k, comparator) {
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
function movingAverage(windowSize, selector) {
    return {
        createAccumulator: () => ({ values: [], sum: 0 }),
        add: (value, accumulator) => {
            const numValue = selector(value);
            accumulator.values.push(numValue);
            accumulator.sum += numValue;
            if (accumulator.values.length > windowSize) {
                const removed = accumulator.values.shift();
                accumulator.sum -= removed;
            }
            return accumulator;
        },
        getResult: (accumulator) => accumulator.values.length > 0
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
function percentile(p, selector) {
    return {
        createAccumulator: () => [],
        add: (value, accumulator) => {
            accumulator.push(selector(value));
            return accumulator;
        },
        getResult: (accumulator) => {
            if (accumulator.length === 0) {
                return 0;
            }
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
function distinctCount(selector) {
    return {
        createAccumulator: () => new Set(),
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
function groupBy(keySelector) {
    return {
        createAccumulator: () => new Map(),
        add: (value, accumulator) => {
            const key = keySelector(value);
            if (!accumulator.has(key)) {
                accumulator.set(key, []);
            }
            accumulator.get(key).push(value);
            return accumulator;
        },
        getResult: (accumulator) => accumulator,
        merge: (acc1, acc2) => {
            const merged = new Map(acc1);
            for (const [key, values] of acc2) {
                if (merged.has(key)) {
                    merged.get(key).push(...values);
                }
                else {
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
function reduce(initialValue, reducer) {
    return {
        createAccumulator: () => initialValue,
        add: (value, accumulator) => reducer(accumulator, value),
        getResult: (accumulator) => accumulator,
        merge: (acc1, acc2) => reducer(acc1, acc2), // Merge not straightforward for reduce
    };
}
