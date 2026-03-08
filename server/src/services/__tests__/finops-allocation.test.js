"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const allocation_js_1 = require("../../../../finops/allocation.js");
(0, globals_1.describe)('allocateCostBuckets', () => {
    (0, globals_1.it)('calculates bucket costs using metering ratios', () => {
        const result = (0, allocation_js_1.allocateCostBuckets)({
            computeUnits: 1200,
            storageGbHours: 48,
            egressGb: 12,
            thirdPartyRequests: 3000,
        }, allocation_js_1.defaultMeteringRatios);
        const compute = result.buckets.find((b) => b.bucket === 'compute');
        const storage = result.buckets.find((b) => b.bucket === 'storage');
        const egress = result.buckets.find((b) => b.bucket === 'egress');
        const thirdParty = result.buckets.find((b) => b.bucket === 'third_party');
        (0, globals_1.expect)(result.totalCostUsd).toBeCloseTo(5.2858, 4);
        (0, globals_1.expect)(compute?.costUsd).toBeCloseTo(3.0, 4);
        (0, globals_1.expect)(storage?.costUsd).toBeCloseTo(0.0058, 4);
        (0, globals_1.expect)(egress?.costUsd).toBeCloseTo(1.08, 4);
        (0, globals_1.expect)(thirdParty?.costUsd).toBeCloseTo(1.2, 4);
    });
    (0, globals_1.it)('keeps allocation percentages bounded even with zero usage', () => {
        const result = (0, allocation_js_1.allocateCostBuckets)({ computeUnits: 0, storageGbHours: 0, egressGb: 0, thirdPartyRequests: 0 }, allocation_js_1.defaultMeteringRatios);
        const pctSum = result.buckets.reduce((sum, bucket) => sum + bucket.allocationPct, 0);
        (0, globals_1.expect)(result.totalCostUsd).toBe(0);
        (0, globals_1.expect)(pctSum).toBe(0);
    });
});
