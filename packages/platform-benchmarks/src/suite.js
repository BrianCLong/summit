"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BenchmarkSuite = void 0;
exports.createBenchmarkSuite = createBenchmarkSuite;
const harness_js_1 = require("./harness.js");
const console_js_1 = require("./reporters/console.js");
/**
 * Benchmark suite for organizing and running multiple benchmarks
 */
class BenchmarkSuite {
    config;
    benchmarks = [];
    reporters = [];
    results = [];
    constructor(config) {
        this.config = config;
        // Default console reporter
        this.reporters.push(new console_js_1.ConsoleReporter());
    }
    /**
     * Add a benchmark to the suite
     */
    add(definition) {
        this.benchmarks.push(definition);
        return this;
    }
    /**
     * Add a reporter
     */
    addReporter(reporter) {
        this.reporters.push(reporter);
        return this;
    }
    /**
     * Clear default reporters
     */
    clearReporters() {
        this.reporters = [];
        return this;
    }
    /**
     * Run all benchmarks in the suite
     */
    async run() {
        this.results = [];
        // Notify suite start
        for (const reporter of this.reporters) {
            await reporter.onSuiteStart(this.config);
        }
        for (const benchmark of this.benchmarks) {
            const config = {
                name: benchmark.name,
                subsystem: benchmark.config?.subsystem ?? 'api',
                language: benchmark.config?.language ?? 'typescript',
                workloadType: benchmark.config?.workloadType ?? 'cpu',
                iterations: benchmark.config?.iterations ?? this.config.defaultIterations ?? 1000,
                warmupIterations: benchmark.config?.warmupIterations ?? this.config.defaultWarmupIterations ?? 100,
                timeout: benchmark.config?.timeout ?? 30000,
                tags: benchmark.config?.tags ?? this.config.tags ?? [],
                description: benchmark.config?.description,
            };
            // Notify benchmark start
            for (const reporter of this.reporters) {
                await reporter.onBenchmarkStart(config);
            }
            try {
                // Run setup
                if (benchmark.setup) {
                    await benchmark.setup();
                }
                // Create harness and run
                const harness = new harness_js_1.BenchmarkHarness(config, this.config.thresholds);
                // Wrap function with before/after each if provided
                const wrappedFn = async () => {
                    if (benchmark.beforeEach) {
                        await benchmark.beforeEach();
                    }
                    await benchmark.fn();
                    if (benchmark.afterEach) {
                        await benchmark.afterEach();
                    }
                };
                harness.add(benchmark.name, wrappedFn);
                const result = await harness.run();
                // Run teardown
                if (benchmark.teardown) {
                    await benchmark.teardown();
                }
                this.results.push(result);
                // Notify benchmark complete
                for (const reporter of this.reporters) {
                    await reporter.onBenchmarkComplete(result);
                }
            }
            catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                // Notify error
                for (const reporter of this.reporters) {
                    await reporter.onError(err, config);
                }
                // Add failed result
                this.results.push({
                    config,
                    stats: {
                        iterations: 0,
                        mean: 0,
                        stdDev: 0,
                        min: 0,
                        max: 0,
                        percentiles: { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 },
                        opsPerSecond: 0,
                        marginOfError: 0,
                        rme: 0,
                    },
                    memory: {
                        heapUsedBefore: 0,
                        heapUsedAfter: 0,
                        heapUsedPeak: 0,
                        external: 0,
                        arrayBuffers: 0,
                    },
                    timestamp: new Date().toISOString(),
                    gitCommit: 'unknown',
                    nodeVersion: process.version,
                    platform: {
                        os: 'unknown',
                        arch: 'unknown',
                        cpus: 0,
                        totalMemory: 0,
                    },
                    passed: false,
                    error: err.message,
                });
            }
        }
        // Notify suite complete
        for (const reporter of this.reporters) {
            await reporter.onSuiteComplete(this.results);
        }
        return this.results;
    }
    /**
     * Get results
     */
    getResults() {
        return [...this.results];
    }
    /**
     * Check if all benchmarks passed
     */
    allPassed() {
        return this.results.every((r) => r.passed);
    }
}
exports.BenchmarkSuite = BenchmarkSuite;
/**
 * Create a new benchmark suite
 */
function createBenchmarkSuite(config) {
    return new BenchmarkSuite(config);
}
