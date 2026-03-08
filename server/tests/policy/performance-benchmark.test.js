"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const node_module_1 = require("node:module");
const require = (0, node_module_1.createRequire)(import.meta.url);
(0, globals_1.describe)('performance benchmark', () => {
    (0, globals_1.test)('all operations complete within the configured budgets', () => {
        const { runPerformanceBenchmark, measureOperation, } = require('../../../scripts/ci/performance-benchmark.cjs');
        const result = runPerformanceBenchmark();
        (0, globals_1.expect)(result.passed).toBe(true);
        (0, globals_1.expect)(result.details.every((detail) => detail.includes('limit'))).toBe(true);
        const quickDuration = measureOperation(() => {
            const values = Array.from({ length: 1000 }, (_, index) => index * 2);
            values.reverse();
        });
        (0, globals_1.expect)(quickDuration).toBeGreaterThanOrEqual(0);
    });
});
