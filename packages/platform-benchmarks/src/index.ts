/**
 * @summit/platform-benchmarks
 *
 * Cross-language benchmark harness for Summit platform.
 * Implements Prompt 17: Cross-subsystem Performance Benchmark Suite
 *
 * Features:
 * - Deterministic benchmark execution with statistical analysis
 * - Multi-language support (TS, Python, Go via subprocess)
 * - CI integration with JSON/Markdown output
 * - Baseline comparison and regression detection
 */

export * from './types.js';
export * from './harness.js';
export * from './runners/index.js';
export * from './reporters/index.js';
export * from './comparators/index.js';

// Re-export for convenience
export { BenchmarkHarness } from './harness.js';
export { createBenchmarkSuite } from './suite.js';
