"use strict";
/**
 * Stream Analytics - Aggregation Functions
 *
 * These are standalone implementations that mirror the stream-processing package
 * for use in analytics scenarios.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.count = count;
exports.sum = sum;
exports.average = average;
exports.min = min;
exports.max = max;
function count() {
    return {
        createAccumulator: () => 0,
        add: (_value, accumulator) => accumulator + 1,
        getResult: (accumulator) => accumulator,
        merge: (acc1, acc2) => acc1 + acc2,
    };
}
function sum(selector) {
    return {
        createAccumulator: () => 0,
        add: (value, accumulator) => accumulator + selector(value),
        getResult: (accumulator) => accumulator,
        merge: (acc1, acc2) => acc1 + acc2,
    };
}
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
function min(selector) {
    return {
        createAccumulator: () => Number.MAX_VALUE,
        add: (value, accumulator) => Math.min(accumulator, selector(value)),
        getResult: (accumulator) => accumulator,
        merge: (acc1, acc2) => Math.min(acc1, acc2),
    };
}
function max(selector) {
    return {
        createAccumulator: () => Number.MIN_VALUE,
        add: (value, accumulator) => Math.max(accumulator, selector(value)),
        getResult: (accumulator) => accumulator,
        merge: (acc1, acc2) => Math.max(acc1, acc2),
    };
}
