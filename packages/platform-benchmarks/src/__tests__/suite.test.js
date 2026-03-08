"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const suite_js_1 = require("../suite.js");
(0, vitest_1.describe)('BenchmarkSuite', () => {
    const defaultConfig = {
        name: 'Test Suite',
        description: 'Test benchmark suite',
        defaultIterations: 50,
        defaultWarmupIterations: 5,
    };
    (0, vitest_1.it)('should create a benchmark suite', () => {
        const suite = (0, suite_js_1.createBenchmarkSuite)(defaultConfig);
        (0, vitest_1.expect)(suite).toBeInstanceOf(suite_js_1.BenchmarkSuite);
    });
    (0, vitest_1.it)('should add and run benchmarks', async () => {
        const suite = (0, suite_js_1.createBenchmarkSuite)(defaultConfig);
        suite.clearReporters();
        let setupCalled = false;
        let teardownCalled = false;
        let fnCalled = 0;
        suite.add({
            name: 'test-benchmark',
            setup: () => { setupCalled = true; },
            teardown: () => { teardownCalled = true; },
            fn: () => { fnCalled++; },
            config: {
                subsystem: 'api',
                language: 'typescript',
                workloadType: 'cpu',
            },
        });
        const results = await suite.run();
        (0, vitest_1.expect)(results).toHaveLength(1);
        (0, vitest_1.expect)(setupCalled).toBe(true);
        (0, vitest_1.expect)(teardownCalled).toBe(true);
        (0, vitest_1.expect)(fnCalled).toBeGreaterThan(0);
        (0, vitest_1.expect)(results[0].config.name).toBe('test-benchmark');
    });
    (0, vitest_1.it)('should run multiple benchmarks', async () => {
        const suite = (0, suite_js_1.createBenchmarkSuite)(defaultConfig);
        suite.clearReporters();
        suite.add({
            name: 'benchmark-1',
            fn: () => { let x = 1 + 1; },
            config: { subsystem: 'api', language: 'typescript', workloadType: 'cpu' },
        });
        suite.add({
            name: 'benchmark-2',
            fn: () => { let x = 2 + 2; },
            config: { subsystem: 'graph', language: 'typescript', workloadType: 'cpu' },
        });
        const results = await suite.run();
        (0, vitest_1.expect)(results).toHaveLength(2);
        (0, vitest_1.expect)(results[0].config.name).toBe('benchmark-1');
        (0, vitest_1.expect)(results[1].config.name).toBe('benchmark-2');
    });
    (0, vitest_1.it)('should call reporter methods', async () => {
        const suite = (0, suite_js_1.createBenchmarkSuite)(defaultConfig);
        suite.clearReporters();
        const mockReporter = {
            onSuiteStart: vitest_1.vi.fn(),
            onBenchmarkStart: vitest_1.vi.fn(),
            onBenchmarkComplete: vitest_1.vi.fn(),
            onSuiteComplete: vitest_1.vi.fn(),
            onError: vitest_1.vi.fn(),
        };
        suite.addReporter(mockReporter);
        suite.add({
            name: 'test',
            fn: () => { },
            config: { subsystem: 'api', language: 'typescript', workloadType: 'cpu' },
        });
        await suite.run();
        (0, vitest_1.expect)(mockReporter.onSuiteStart).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(mockReporter.onBenchmarkStart).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(mockReporter.onBenchmarkComplete).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(mockReporter.onSuiteComplete).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(mockReporter.onError).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('should handle benchmark errors', async () => {
        const suite = (0, suite_js_1.createBenchmarkSuite)(defaultConfig);
        suite.clearReporters();
        const mockReporter = {
            onSuiteStart: vitest_1.vi.fn(),
            onBenchmarkStart: vitest_1.vi.fn(),
            onBenchmarkComplete: vitest_1.vi.fn(),
            onSuiteComplete: vitest_1.vi.fn(),
            onError: vitest_1.vi.fn(),
        };
        suite.addReporter(mockReporter);
        suite.add({
            name: 'failing-benchmark',
            fn: () => { throw new Error('Test error'); },
            config: { subsystem: 'api', language: 'typescript', workloadType: 'cpu' },
        });
        const results = await suite.run();
        (0, vitest_1.expect)(results).toHaveLength(1);
        (0, vitest_1.expect)(results[0].passed).toBe(false);
        (0, vitest_1.expect)(results[0].error).toBe('Test error');
        (0, vitest_1.expect)(mockReporter.onError).toHaveBeenCalled();
    });
    (0, vitest_1.it)('should check if all benchmarks passed', async () => {
        const suite = (0, suite_js_1.createBenchmarkSuite)(defaultConfig);
        suite.clearReporters();
        suite.add({
            name: 'passing',
            fn: () => { },
            config: { subsystem: 'api', language: 'typescript', workloadType: 'cpu' },
        });
        await suite.run();
        (0, vitest_1.expect)(suite.allPassed()).toBe(true);
    });
    (0, vitest_1.it)('should support beforeEach and afterEach', async () => {
        const suite = (0, suite_js_1.createBenchmarkSuite)(defaultConfig);
        suite.clearReporters();
        let beforeEachCount = 0;
        let afterEachCount = 0;
        suite.add({
            name: 'with-hooks',
            beforeEach: () => { beforeEachCount++; },
            afterEach: () => { afterEachCount++; },
            fn: () => { },
            config: { subsystem: 'api', language: 'typescript', workloadType: 'cpu' },
        });
        await suite.run();
        // beforeEach and afterEach are called for each iteration
        (0, vitest_1.expect)(beforeEachCount).toBeGreaterThan(0);
        (0, vitest_1.expect)(afterEachCount).toBeGreaterThan(0);
        (0, vitest_1.expect)(beforeEachCount).toBe(afterEachCount);
    });
});
