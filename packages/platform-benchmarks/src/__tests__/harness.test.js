"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const harness_js_1 = require("../harness.js");
(0, vitest_1.describe)('BenchmarkHarness', () => {
    const defaultConfig = {
        name: 'test-benchmark',
        subsystem: 'api',
        language: 'typescript',
        workloadType: 'cpu',
        iterations: 100,
        warmupIterations: 10,
        timeout: 5000,
        tags: ['test'],
    };
    (0, vitest_1.it)('should run a simple benchmark', async () => {
        const harness = new harness_js_1.BenchmarkHarness(defaultConfig);
        let counter = 0;
        harness.add('increment', () => {
            counter++;
        });
        const result = await harness.run();
        (0, vitest_1.expect)(result.config.name).toBe('test-benchmark');
        (0, vitest_1.expect)(result.stats.iterations).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.stats.mean).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.stats.opsPerSecond).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.passed).toBe(true);
    });
    (0, vitest_1.it)('should calculate percentiles correctly', async () => {
        const harness = new harness_js_1.BenchmarkHarness(defaultConfig);
        harness.add('variable-work', () => {
            // Simulate variable work
            let sum = 0;
            for (let i = 0; i < 1000; i++) {
                sum += i;
            }
            return sum;
        });
        const result = await harness.run();
        (0, vitest_1.expect)(result.stats.percentiles.p50).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.stats.percentiles.p95).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.stats.percentiles.p99).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.stats.percentiles.p99).toBeGreaterThanOrEqual(result.stats.percentiles.p95);
        (0, vitest_1.expect)(result.stats.percentiles.p95).toBeGreaterThanOrEqual(result.stats.percentiles.p50);
    });
    (0, vitest_1.it)('should fail threshold check when exceeded', async () => {
        const harness = new harness_js_1.BenchmarkHarness(defaultConfig, {
            maxMean: 1, // 1 nanosecond - impossible to achieve
        });
        harness.add('slow-op', () => {
            let sum = 0;
            for (let i = 0; i < 10000; i++) {
                sum += i;
            }
            return sum;
        });
        const result = await harness.run();
        (0, vitest_1.expect)(result.passed).toBe(false);
    });
    (0, vitest_1.it)('should pass threshold check when within limits', async () => {
        const harness = new harness_js_1.BenchmarkHarness(defaultConfig, {
            maxMean: 1_000_000_000, // 1 second
            minOpsPerSecond: 1,
        });
        harness.add('fast-op', () => {
            return 1 + 1;
        });
        const result = await harness.run();
        (0, vitest_1.expect)(result.passed).toBe(true);
    });
    (0, vitest_1.it)('should capture memory statistics', async () => {
        const harness = new harness_js_1.BenchmarkHarness(defaultConfig);
        harness.add('memory-test', () => {
            const arr = new Array(100).fill(0);
            return arr.length;
        });
        const result = await harness.run();
        (0, vitest_1.expect)(result.memory.heapUsedBefore).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.memory.heapUsedAfter).toBeGreaterThan(0);
    });
    (0, vitest_1.describe)('formatDuration', () => {
        (0, vitest_1.it)('should format nanoseconds', () => {
            (0, vitest_1.expect)(harness_js_1.BenchmarkHarness.formatDuration(500)).toBe('500.00 ns');
        });
        (0, vitest_1.it)('should format microseconds', () => {
            (0, vitest_1.expect)(harness_js_1.BenchmarkHarness.formatDuration(5000)).toBe('5.00 µs');
        });
        (0, vitest_1.it)('should format milliseconds', () => {
            (0, vitest_1.expect)(harness_js_1.BenchmarkHarness.formatDuration(5_000_000)).toBe('5.00 ms');
        });
        (0, vitest_1.it)('should format seconds', () => {
            (0, vitest_1.expect)(harness_js_1.BenchmarkHarness.formatDuration(5_000_000_000)).toBe('5.00 s');
        });
    });
    (0, vitest_1.describe)('formatBytes', () => {
        (0, vitest_1.it)('should format bytes', () => {
            (0, vitest_1.expect)(harness_js_1.BenchmarkHarness.formatBytes(500)).toBe('500.00 B');
        });
        (0, vitest_1.it)('should format kilobytes', () => {
            (0, vitest_1.expect)(harness_js_1.BenchmarkHarness.formatBytes(5000)).toBe('4.88 KB');
        });
        (0, vitest_1.it)('should format megabytes', () => {
            (0, vitest_1.expect)(harness_js_1.BenchmarkHarness.formatBytes(5_000_000)).toBe('4.77 MB');
        });
        (0, vitest_1.it)('should format gigabytes', () => {
            (0, vitest_1.expect)(harness_js_1.BenchmarkHarness.formatBytes(5_000_000_000)).toBe('4.66 GB');
        });
    });
});
