"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COST_BUCKETS = void 0;
exports.calculateCostFromUsage = calculateCostFromUsage;
const BYTES_PER_GB = 1024 ** 3;
const DAYS_PER_MONTH = 30;
exports.DEFAULT_COST_BUCKETS = {
    computeProxy: {
        key: 'computeProxy',
        description: 'Compute proxy units derived from aggregate compute duration.',
        unit: 'compute-second',
        rateUsd: 0.00002,
    },
    storageGbMonth: {
        key: 'storageGbMonth',
        description: 'Average storage footprint expressed in GB-months.',
        unit: 'gb-month',
        rateUsd: 0.12,
    },
    receiptSigningOps: {
        key: 'receiptSigningOps',
        description: 'Receipt signing operations per billing period.',
        unit: 'sign-op',
        rateUsd: 0.0004,
    },
};
function calculateCostFromUsage(usage, buckets = exports.DEFAULT_COST_BUCKETS) {
    const computeSeconds = usage.computeMs / 1000;
    const storageGbMonths = (usage.storageBytesAverage / BYTES_PER_GB) * (usage.periodDays / DAYS_PER_MONTH);
    const computeBucket = {
        key: buckets.computeProxy.key,
        unit: buckets.computeProxy.unit,
        quantity: computeSeconds,
        rateUsd: buckets.computeProxy.rateUsd,
        costUsd: computeSeconds * buckets.computeProxy.rateUsd,
    };
    const storageBucket = {
        key: buckets.storageGbMonth.key,
        unit: buckets.storageGbMonth.unit,
        quantity: storageGbMonths,
        rateUsd: buckets.storageGbMonth.rateUsd,
        costUsd: storageGbMonths * buckets.storageGbMonth.rateUsd,
    };
    const signingBucket = {
        key: buckets.receiptSigningOps.key,
        unit: buckets.receiptSigningOps.unit,
        quantity: usage.receiptSigningOps,
        rateUsd: buckets.receiptSigningOps.rateUsd,
        costUsd: usage.receiptSigningOps * buckets.receiptSigningOps.rateUsd,
    };
    const totalUsd = computeBucket.costUsd + storageBucket.costUsd + signingBucket.costUsd;
    return {
        buckets: {
            computeProxy: computeBucket,
            storageGbMonth: storageBucket,
            receiptSigningOps: signingBucket,
        },
        totalUsd,
    };
}
