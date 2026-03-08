"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const pools_js_1 = require("../pools.js");
(0, globals_1.describe)('pickCheapestEligible', () => {
    const pools = [
        { id: 'pool-a', region: 'us-east-1', labels: [], capacity: 10 },
        { id: 'pool-b', region: 'us-west-2', labels: [], capacity: 20 },
        { id: 'pool-c', region: 'eu-west-1', labels: [], capacity: 15 },
    ];
    (0, globals_1.it)('selects cheapest among multiple pools given estimates', () => {
        const costs = {
            'pool-a': {
                pool_id: 'pool-a',
                cpu_sec_usd: '0.02',
                gb_sec_usd: 0.005,
                egress_gb_usd: 0.1,
            },
            'pool-b': {
                pool_id: 'pool-b',
                cpu_sec_usd: 0.015,
                gb_sec_usd: 0.01,
                egress_gb_usd: 0.08,
            },
        };
        const est = { cpuSec: 10, gbSec: 5, egressGb: 2 };
        const result = (0, pools_js_1.pickCheapestEligible)(pools, costs, est);
        (0, globals_1.expect)(result?.id).toBe('pool-b');
        (0, globals_1.expect)(result?.price).toBeCloseTo(0.36);
    });
    (0, globals_1.it)('respects residency filter', () => {
        const costs = {
            'pool-a': {
                pool_id: 'pool-a',
                cpu_sec_usd: 0.01,
                gb_sec_usd: 0.01,
                egress_gb_usd: 0.01,
            },
            'pool-c': {
                pool_id: 'pool-c',
                cpu_sec_usd: 0.001,
                gb_sec_usd: 0.001,
                egress_gb_usd: 0.001,
            },
        };
        const est = { cpuSec: 10, gbSec: 10, egressGb: 10 };
        const result = (0, pools_js_1.pickCheapestEligible)(pools, costs, est, 'us-east');
        (0, globals_1.expect)(result?.id).toBe('pool-a');
        (0, globals_1.expect)(result?.price).toBeCloseTo(0.3);
    });
    (0, globals_1.it)('skips pools with missing pricing', () => {
        const costs = {
            'pool-b': {
                pool_id: 'pool-b',
                cpu_sec_usd: 0.02,
                gb_sec_usd: 0.02,
                egress_gb_usd: 0.02,
            },
        };
        const result = (0, pools_js_1.pickCheapestEligible)([{ id: 'pool-missing', region: 'us-east-1', labels: [], capacity: 5 }, pools[1]], costs, { cpuSec: 1, gbSec: 1, egressGb: 1 });
        (0, globals_1.expect)(result).toEqual({ id: 'pool-b', price: 0.06 });
    });
    (0, globals_1.it)('uses lexicographic tie-breaker on equal price', () => {
        const costs = {
            'pool-a': {
                pool_id: 'pool-a',
                cpu_sec_usd: 0.01,
                gb_sec_usd: 0.01,
                egress_gb_usd: 0.01,
            },
            'pool-b': {
                pool_id: 'pool-b',
                cpu_sec_usd: 0.01,
                gb_sec_usd: 0.01,
                egress_gb_usd: 0.01,
            },
        };
        const est = { cpuSec: 5, gbSec: 5, egressGb: 5 };
        const result = (0, pools_js_1.pickCheapestEligible)(pools, costs, est);
        (0, globals_1.expect)(result?.id).toBe('pool-a');
        (0, globals_1.expect)(result?.price).toBeCloseTo(0.15);
    });
    (0, globals_1.it)('treats missing or negative estimates as zero', () => {
        const costs = {
            'pool-a': {
                pool_id: 'pool-a',
                cpu_sec_usd: 1,
                gb_sec_usd: 1,
                egress_gb_usd: 1,
            },
            'pool-b': {
                pool_id: 'pool-b',
                cpu_sec_usd: 1,
                gb_sec_usd: 1,
                egress_gb_usd: 1,
            },
        };
        const est = { cpuSec: -5, gbSec: undefined, egressGb: Number.NaN };
        const result = (0, pools_js_1.pickCheapestEligible)(pools, costs, est);
        (0, globals_1.expect)(result).toEqual({ id: 'pool-a', price: 0 });
    });
});
