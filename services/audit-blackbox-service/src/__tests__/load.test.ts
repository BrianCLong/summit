/**
 * Load and Performance Tests for Audit Black Box Service
 *
 * Tests system performance under various load conditions:
 * - Throughput testing
 * - Latency measurements
 * - Concurrent access patterns
 * - Resource utilization
 */

import { createHash, randomBytes } from 'crypto';

// Mock implementations for testing
interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: string;
  actorId: string;
  actorType: string;
  action?: string;
  outcome: string;
  tenantId: string;
  metadata?: Record<string, unknown>;
}

interface PerformanceResult {
  operation: string;
  totalTimeMs: number;
  operationCount: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  maxLatencyMs: number;
  minLatencyMs: number;
  throughputOps: number;
  memoryUsedMB: number;
}

function generateEvent(): AuditEvent {
  return {
    id: randomBytes(16).toString('hex'),
    timestamp: new Date(),
    eventType: ['access', 'export', 'admin_change', 'policy_change'][
      Math.floor(Math.random() * 4)
    ],
    actorId: `user-${Math.floor(Math.random() * 1000)}`,
    actorType: 'user',
    action: `action-${Math.floor(Math.random() * 100)}`,
    outcome: 'success',
    tenantId: `tenant-${Math.floor(Math.random() * 10)}`,
    metadata: {
      source: 'load-test',
      requestId: randomBytes(8).toString('hex'),
    },
  };
}

function calculateEventHash(event: AuditEvent): string {
  const canonical = JSON.stringify(event, Object.keys(event).sort());
  return createHash('sha256').update(canonical).digest('hex');
}

function calculateChainHash(eventHash: string, previousHash: string, sequence: number): string {
  return createHash('sha256')
    .update(`${eventHash}:${previousHash}:${sequence}`)
    .digest('hex');
}

function measureLatencies(fn: () => void, iterations: number): number[] {
  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    fn();
    const end = process.hrtime.bigint();
    latencies.push(Number(end - start) / 1e6); // Convert to ms
  }

  return latencies;
}

function calculatePercentile(latencies: number[], percentile: number): number {
  const sorted = [...latencies].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function createPerformanceResult(
  operation: string,
  latencies: number[],
  totalTimeMs: number,
): PerformanceResult {
  const memoryUsage = process.memoryUsage();

  return {
    operation,
    totalTimeMs,
    operationCount: latencies.length,
    avgLatencyMs: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    p50LatencyMs: calculatePercentile(latencies, 50),
    p95LatencyMs: calculatePercentile(latencies, 95),
    p99LatencyMs: calculatePercentile(latencies, 99),
    maxLatencyMs: Math.max(...latencies),
    minLatencyMs: Math.min(...latencies),
    throughputOps: (latencies.length / totalTimeMs) * 1000,
    memoryUsedMB: memoryUsage.heapUsed / (1024 * 1024),
  };
}

describe('Load Tests: Hash Operations', () => {
  const ITERATIONS = 10000;
  const WARMUP_ITERATIONS = 1000;

  beforeAll(() => {
    // Warmup
    for (let i = 0; i < WARMUP_ITERATIONS; i++) {
      const event = generateEvent();
      calculateEventHash(event);
    }
  });

  it('should benchmark event hash calculation', () => {
    const events = Array.from({ length: ITERATIONS }, generateEvent);
    const start = Date.now();

    const latencies = events.map((event) => {
      const opStart = process.hrtime.bigint();
      calculateEventHash(event);
      const opEnd = process.hrtime.bigint();
      return Number(opEnd - opStart) / 1e6;
    });

    const totalTime = Date.now() - start;
    const result = createPerformanceResult('eventHash', latencies, totalTime);

    console.log('Event Hash Performance:', JSON.stringify(result, null, 2));

    // Performance assertions
    expect(result.avgLatencyMs).toBeLessThan(1); // < 1ms average
    expect(result.p99LatencyMs).toBeLessThan(5); // < 5ms p99
    expect(result.throughputOps).toBeGreaterThan(1000); // > 1000 ops/sec
  });

  it('should benchmark chain hash calculation', () => {
    const hashes = Array.from({ length: ITERATIONS }, () => randomBytes(32).toString('hex'));
    const previousHash = '0'.repeat(64);
    const start = Date.now();

    const latencies = hashes.map((hash, i) => {
      const opStart = process.hrtime.bigint();
      calculateChainHash(hash, previousHash, i);
      const opEnd = process.hrtime.bigint();
      return Number(opEnd - opStart) / 1e6;
    });

    const totalTime = Date.now() - start;
    const result = createPerformanceResult('chainHash', latencies, totalTime);

    console.log('Chain Hash Performance:', JSON.stringify(result, null, 2));

    expect(result.avgLatencyMs).toBeLessThan(0.5);
    expect(result.throughputOps).toBeGreaterThan(5000);
  });

  it('should benchmark full chain append operation', () => {
    const events = Array.from({ length: ITERATIONS }, generateEvent);
    const chain: { eventHash: string; chainHash: string }[] = [];
    const GENESIS = '0'.repeat(64);

    const start = Date.now();

    const latencies = events.map((event, i) => {
      const opStart = process.hrtime.bigint();

      const eventHash = calculateEventHash(event);
      const previousHash = i === 0 ? GENESIS : chain[i - 1].chainHash;
      const chainHash = calculateChainHash(eventHash, previousHash, i);
      chain.push({ eventHash, chainHash });

      const opEnd = process.hrtime.bigint();
      return Number(opEnd - opStart) / 1e6;
    });

    const totalTime = Date.now() - start;
    const result = createPerformanceResult('chainAppend', latencies, totalTime);

    console.log('Chain Append Performance:', JSON.stringify(result, null, 2));

    expect(result.avgLatencyMs).toBeLessThan(2);
    expect(result.p99LatencyMs).toBeLessThan(10);
    expect(chain.length).toBe(ITERATIONS);
  });
});

describe('Load Tests: Concurrent Operations', () => {
  const CONCURRENT_WORKERS = 10;
  const OPERATIONS_PER_WORKER = 1000;

  it('should handle concurrent hash calculations', async () => {
    const startMemory = process.memoryUsage().heapUsed;
    const start = Date.now();

    const workers = Array.from({ length: CONCURRENT_WORKERS }, async (_, workerId) => {
      const latencies: number[] = [];

      for (let i = 0; i < OPERATIONS_PER_WORKER; i++) {
        const event = generateEvent();
        const opStart = process.hrtime.bigint();
        calculateEventHash(event);
        const opEnd = process.hrtime.bigint();
        latencies.push(Number(opEnd - opStart) / 1e6);
      }

      return { workerId, latencies };
    });

    const results = await Promise.all(workers);
    const totalTime = Date.now() - start;
    const endMemory = process.memoryUsage().heapUsed;

    const allLatencies = results.flatMap((r) => r.latencies);
    const result = createPerformanceResult('concurrentHash', allLatencies, totalTime);

    console.log('Concurrent Hash Performance:', JSON.stringify(result, null, 2));
    console.log(
      `Memory delta: ${((endMemory - startMemory) / (1024 * 1024)).toFixed(2)} MB`,
    );

    expect(result.operationCount).toBe(CONCURRENT_WORKERS * OPERATIONS_PER_WORKER);
    expect(result.avgLatencyMs).toBeLessThan(2);
  });

  it('should handle concurrent chain building', async () => {
    const CHAINS = 5;
    const EVENTS_PER_CHAIN = 2000;
    const GENESIS = '0'.repeat(64);

    const start = Date.now();

    const chainBuilders = Array.from({ length: CHAINS }, async (_, chainId) => {
      const chain: { eventHash: string; chainHash: string }[] = [];
      const latencies: number[] = [];

      for (let i = 0; i < EVENTS_PER_CHAIN; i++) {
        const event = generateEvent();
        const opStart = process.hrtime.bigint();

        const eventHash = calculateEventHash(event);
        const previousHash = i === 0 ? GENESIS : chain[i - 1].chainHash;
        const chainHash = calculateChainHash(eventHash, previousHash, i);
        chain.push({ eventHash, chainHash });

        const opEnd = process.hrtime.bigint();
        latencies.push(Number(opEnd - opStart) / 1e6);
      }

      return { chainId, chainLength: chain.length, latencies };
    });

    const results = await Promise.all(chainBuilders);
    const totalTime = Date.now() - start;

    const allLatencies = results.flatMap((r) => r.latencies);
    const result = createPerformanceResult('concurrentChains', allLatencies, totalTime);

    console.log('Concurrent Chains Performance:', JSON.stringify(result, null, 2));

    // All chains should be complete
    for (const r of results) {
      expect(r.chainLength).toBe(EVENTS_PER_CHAIN);
    }
  });
});

describe('Load Tests: Memory Pressure', () => {
  it('should handle large event payloads', () => {
    const ITERATIONS = 100;
    const PAYLOAD_SIZE_KB = 64;

    const largeEvents = Array.from({ length: ITERATIONS }, () => ({
      ...generateEvent(),
      metadata: {
        largePayload: randomBytes(PAYLOAD_SIZE_KB * 1024).toString('base64'),
      },
    }));

    const startMemory = process.memoryUsage().heapUsed;
    const start = Date.now();

    const latencies = largeEvents.map((event) => {
      const opStart = process.hrtime.bigint();
      calculateEventHash(event);
      const opEnd = process.hrtime.bigint();
      return Number(opEnd - opStart) / 1e6;
    });

    const totalTime = Date.now() - start;
    const endMemory = process.memoryUsage().heapUsed;

    const result = createPerformanceResult('largePayload', latencies, totalTime);

    console.log('Large Payload Performance:', JSON.stringify(result, null, 2));
    console.log(
      `Memory delta: ${((endMemory - startMemory) / (1024 * 1024)).toFixed(2)} MB`,
    );

    // Large payloads will be slower but should still complete
    expect(result.avgLatencyMs).toBeLessThan(50);
  });

  it('should maintain performance under sustained load', () => {
    const DURATION_MS = 5000; // 5 seconds
    const latencies: number[] = [];
    let operationCount = 0;

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    while (Date.now() - startTime < DURATION_MS) {
      const event = generateEvent();
      const opStart = process.hrtime.bigint();
      calculateEventHash(event);
      const opEnd = process.hrtime.bigint();

      latencies.push(Number(opEnd - opStart) / 1e6);
      operationCount++;
    }

    const totalTime = Date.now() - startTime;
    const endMemory = process.memoryUsage().heapUsed;

    const result = createPerformanceResult('sustainedLoad', latencies, totalTime);

    console.log('Sustained Load Performance:', JSON.stringify(result, null, 2));
    console.log(`Operations completed: ${operationCount}`);
    console.log(
      `Memory delta: ${((endMemory - startMemory) / (1024 * 1024)).toFixed(2)} MB`,
    );

    // Check for performance degradation
    const firstQuarter = latencies.slice(0, Math.floor(latencies.length / 4));
    const lastQuarter = latencies.slice(-Math.floor(latencies.length / 4));

    const firstAvg = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length;
    const lastAvg = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length;

    // Last quarter shouldn't be more than 2x slower than first quarter
    expect(lastAvg).toBeLessThan(firstAvg * 2);
  });
});

describe('Load Tests: Chain Verification', () => {
  it('should benchmark chain verification performance', () => {
    const CHAIN_LENGTH = 10000;
    const GENESIS = '0'.repeat(64);

    // Build chain first
    const chain: { eventHash: string; chainHash: string; sequence: number }[] = [];

    for (let i = 0; i < CHAIN_LENGTH; i++) {
      const event = generateEvent();
      const eventHash = calculateEventHash(event);
      const previousHash = i === 0 ? GENESIS : chain[i - 1].chainHash;
      const chainHash = calculateChainHash(eventHash, previousHash, i);
      chain.push({ eventHash, chainHash, sequence: i });
    }

    // Benchmark verification
    const start = Date.now();
    const verificationLatencies: number[] = [];

    for (let i = 0; i < chain.length; i++) {
      const opStart = process.hrtime.bigint();

      const entry = chain[i];
      const expectedPrevious = i === 0 ? GENESIS : chain[i - 1].chainHash;
      const recalculated = calculateChainHash(entry.eventHash, expectedPrevious, i);
      const isValid = recalculated === entry.chainHash;

      const opEnd = process.hrtime.bigint();
      verificationLatencies.push(Number(opEnd - opStart) / 1e6);

      expect(isValid).toBe(true);
    }

    const totalTime = Date.now() - start;
    const result = createPerformanceResult('chainVerify', verificationLatencies, totalTime);

    console.log('Chain Verification Performance:', JSON.stringify(result, null, 2));
    console.log(`Chain length: ${CHAIN_LENGTH}`);

    expect(result.avgLatencyMs).toBeLessThan(0.5);
    expect(result.throughputOps).toBeGreaterThan(5000);
  });

  it('should benchmark range verification', () => {
    const CHAIN_LENGTH = 10000;
    const RANGE_SIZE = 1000;
    const GENESIS = '0'.repeat(64);

    // Build chain
    const chain: { eventHash: string; chainHash: string }[] = [];

    for (let i = 0; i < CHAIN_LENGTH; i++) {
      const event = generateEvent();
      const eventHash = calculateEventHash(event);
      const previousHash = i === 0 ? GENESIS : chain[i - 1].chainHash;
      const chainHash = calculateChainHash(eventHash, previousHash, i);
      chain.push({ eventHash, chainHash });
    }

    // Benchmark range verifications at different positions
    const positions = [0, 2500, 5000, 7500, CHAIN_LENGTH - RANGE_SIZE];
    const results: { position: number; timeMs: number }[] = [];

    for (const startPos of positions) {
      const start = Date.now();

      for (let i = startPos; i < startPos + RANGE_SIZE; i++) {
        const entry = chain[i];
        const expectedPrevious = i === 0 ? GENESIS : chain[i - 1].chainHash;
        calculateChainHash(entry.eventHash, expectedPrevious, i);
      }

      results.push({ position: startPos, timeMs: Date.now() - start });
    }

    console.log('Range Verification Results:', results);

    // All ranges should take similar time (O(n) where n is range size)
    const avgTime = results.reduce((a, b) => a + b.timeMs, 0) / results.length;
    for (const r of results) {
      expect(r.timeMs).toBeLessThan(avgTime * 2);
    }
  });
});

describe('Load Tests: Throughput Limits', () => {
  it('should determine maximum sustainable throughput', async () => {
    const TARGET_THROUGHPUT = [1000, 5000, 10000, 20000, 50000]; // ops/sec
    const TEST_DURATION_MS = 1000;

    const results: { targetOps: number; achievedOps: number; avgLatencyMs: number }[] = [];

    for (const targetOps of TARGET_THROUGHPUT) {
      const intervalMs = 1000 / targetOps;
      const operations: number[] = [];
      let operationCount = 0;

      const startTime = Date.now();

      while (Date.now() - startTime < TEST_DURATION_MS) {
        const opStart = process.hrtime.bigint();
        const event = generateEvent();
        calculateEventHash(event);
        const opEnd = process.hrtime.bigint();

        operations.push(Number(opEnd - opStart) / 1e6);
        operationCount++;

        // Attempt to maintain target rate (simplified)
        const elapsed = Date.now() - startTime;
        const expectedOps = (elapsed / 1000) * targetOps;
        if (operationCount > expectedOps) {
          // We're ahead, would normally sleep but skip for this test
        }
      }

      const actualTime = Date.now() - startTime;
      const achievedOps = (operationCount / actualTime) * 1000;
      const avgLatencyMs = operations.reduce((a, b) => a + b, 0) / operations.length;

      results.push({ targetOps, achievedOps, avgLatencyMs });
    }

    console.log('Throughput Test Results:');
    console.table(results);

    // Should achieve at least 80% of low targets
    expect(results[0].achievedOps).toBeGreaterThan(results[0].targetOps * 0.8);
  });
});

describe('Load Tests: Resource Cleanup', () => {
  it('should not leak memory over many operations', async () => {
    const ITERATIONS = 50000;
    const SAMPLE_INTERVAL = 10000;

    const memorySnapshots: { iteration: number; heapUsedMB: number }[] = [];

    // Force GC if available
    if (global.gc) {
      global.gc();
    }

    for (let i = 0; i < ITERATIONS; i++) {
      const event = generateEvent();
      calculateEventHash(event);

      if (i % SAMPLE_INTERVAL === 0) {
        if (global.gc) {
          global.gc();
        }
        memorySnapshots.push({
          iteration: i,
          heapUsedMB: process.memoryUsage().heapUsed / (1024 * 1024),
        });
      }
    }

    // Final snapshot
    if (global.gc) {
      global.gc();
    }
    memorySnapshots.push({
      iteration: ITERATIONS,
      heapUsedMB: process.memoryUsage().heapUsed / (1024 * 1024),
    });

    console.log('Memory Snapshots:');
    console.table(memorySnapshots);

    // Memory should not grow significantly
    const firstSnapshot = memorySnapshots[0].heapUsedMB;
    const lastSnapshot = memorySnapshots[memorySnapshots.length - 1].heapUsedMB;
    const growth = lastSnapshot - firstSnapshot;

    console.log(`Memory growth: ${growth.toFixed(2)} MB`);

    // Allow some growth but not unbounded
    expect(growth).toBeLessThan(50); // < 50MB growth for 50k operations
  });
});
