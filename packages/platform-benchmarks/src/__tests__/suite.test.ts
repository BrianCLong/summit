import { describe, it, expect, vi } from 'vitest';
import { createBenchmarkSuite, BenchmarkSuite } from '../suite.js';
import type { BenchmarkReporter, BenchmarkSuiteConfig } from '../types.js';

describe('BenchmarkSuite', () => {
  const defaultConfig: BenchmarkSuiteConfig = {
    name: 'Test Suite',
    description: 'Test benchmark suite',
    defaultIterations: 50,
    defaultWarmupIterations: 5,
  };

  it('should create a benchmark suite', () => {
    const suite = createBenchmarkSuite(defaultConfig);
    expect(suite).toBeInstanceOf(BenchmarkSuite);
  });

  it('should add and run benchmarks', async () => {
    const suite = createBenchmarkSuite(defaultConfig);
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

    expect(results).toHaveLength(1);
    expect(setupCalled).toBe(true);
    expect(teardownCalled).toBe(true);
    expect(fnCalled).toBeGreaterThan(0);
    expect(results[0].config.name).toBe('test-benchmark');
  });

  it('should run multiple benchmarks', async () => {
    const suite = createBenchmarkSuite(defaultConfig);
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

    expect(results).toHaveLength(2);
    expect(results[0].config.name).toBe('benchmark-1');
    expect(results[1].config.name).toBe('benchmark-2');
  });

  it('should call reporter methods', async () => {
    const suite = createBenchmarkSuite(defaultConfig);
    suite.clearReporters();

    const mockReporter: BenchmarkReporter = {
      onSuiteStart: vi.fn(),
      onBenchmarkStart: vi.fn(),
      onBenchmarkComplete: vi.fn(),
      onSuiteComplete: vi.fn(),
      onError: vi.fn(),
    };

    suite.addReporter(mockReporter);

    suite.add({
      name: 'test',
      fn: () => {},
      config: { subsystem: 'api', language: 'typescript', workloadType: 'cpu' },
    });

    await suite.run();

    expect(mockReporter.onSuiteStart).toHaveBeenCalledTimes(1);
    expect(mockReporter.onBenchmarkStart).toHaveBeenCalledTimes(1);
    expect(mockReporter.onBenchmarkComplete).toHaveBeenCalledTimes(1);
    expect(mockReporter.onSuiteComplete).toHaveBeenCalledTimes(1);
    expect(mockReporter.onError).not.toHaveBeenCalled();
  });

  it('should handle benchmark errors', async () => {
    const suite = createBenchmarkSuite(defaultConfig);
    suite.clearReporters();

    const mockReporter: BenchmarkReporter = {
      onSuiteStart: vi.fn(),
      onBenchmarkStart: vi.fn(),
      onBenchmarkComplete: vi.fn(),
      onSuiteComplete: vi.fn(),
      onError: vi.fn(),
    };

    suite.addReporter(mockReporter);

    suite.add({
      name: 'failing-benchmark',
      fn: () => { throw new Error('Test error'); },
      config: { subsystem: 'api', language: 'typescript', workloadType: 'cpu' },
    });

    const results = await suite.run();

    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(false);
    expect(results[0].error).toBe('Test error');
    expect(mockReporter.onError).toHaveBeenCalled();
  });

  it('should check if all benchmarks passed', async () => {
    const suite = createBenchmarkSuite(defaultConfig);
    suite.clearReporters();

    suite.add({
      name: 'passing',
      fn: () => {},
      config: { subsystem: 'api', language: 'typescript', workloadType: 'cpu' },
    });

    await suite.run();
    expect(suite.allPassed()).toBe(true);
  });

  it('should support beforeEach and afterEach', async () => {
    const suite = createBenchmarkSuite(defaultConfig);
    suite.clearReporters();

    let beforeEachCount = 0;
    let afterEachCount = 0;

    suite.add({
      name: 'with-hooks',
      beforeEach: () => { beforeEachCount++; },
      afterEach: () => { afterEachCount++; },
      fn: () => {},
      config: { subsystem: 'api', language: 'typescript', workloadType: 'cpu' },
    });

    await suite.run();

    // beforeEach and afterEach are called for each iteration
    expect(beforeEachCount).toBeGreaterThan(0);
    expect(afterEachCount).toBeGreaterThan(0);
    expect(beforeEachCount).toBe(afterEachCount);
  });
});
