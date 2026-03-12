#!/usr/bin/env node

/**
 * Audit Logger Performance Benchmarks
 *
 * Measures performance of immutable audit logger under various conditions:
 * - Single entry logging
 * - Batch logging
 * - Signature generation/verification
 * - Audit trail verification at scale
 *
 * Run with: node services/repoos/__tests__/audit-performance-benchmark.mjs
 */

import { ImmutableAuditLogger } from '../immutable-audit-logger.mjs';
import crypto from 'crypto';
import fs from 'fs/promises';

// Benchmark configuration
const BENCHMARK_DIR = 'artifacts/repoos/benchmark-audit';
const TEST_SECRET = crypto.randomBytes(32).toString('base64');

// Colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatTime(ms) {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatThroughput(opsPerSec) {
  if (opsPerSec > 1000) return `${(opsPerSec / 1000).toFixed(2)}k ops/sec`;
  return `${opsPerSec.toFixed(2)} ops/sec`;
}

// ============================================================================
// Benchmarks
// ============================================================================

class BenchmarkRunner {
  constructor() {
    this.results = [];
  }

  async run(name, fn, iterations = 1) {
    log(`\n📊 ${name}`, 'cyan');
    log(`   Iterations: ${iterations}`, 'reset');

    // Warmup
    if (iterations > 1) {
      await fn();
    }

    // Measure
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      await fn();
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;
    const opsPerSec = (iterations / totalTime) * 1000;

    log(`   Total: ${formatTime(totalTime)}`, 'reset');
    log(`   Average: ${formatTime(avgTime)}`, 'reset');
    log(`   Throughput: ${formatThroughput(opsPerSec)}`, 'green');

    this.results.push({
      name,
      iterations,
      totalTime,
      avgTime,
      opsPerSec
    });

    return { totalTime, avgTime, opsPerSec };
  }

  printSummary() {
    log('\n' + '═'.repeat(80), 'blue');
    log('Performance Summary', 'blue');
    log('═'.repeat(80), 'blue');

    console.log('\n| Benchmark | Iterations | Avg Time | Throughput |');
    console.log('|-----------|------------|----------|------------|');

    for (const result of this.results) {
      const name = result.name.padEnd(35);
      const iters = result.iterations.toString().padEnd(10);
      const avg = formatTime(result.avgTime).padEnd(8);
      const throughput = formatThroughput(result.opsPerSec);

      console.log(`| ${name} | ${iters} | ${avg} | ${throughput} |`);
    }

    console.log('');
  }

  printRecommendations() {
    log('\n' + '═'.repeat(80), 'blue');
    log('Performance Recommendations', 'blue');
    log('═'.repeat(80), 'blue');
    console.log('');

    // Analyze results
    const signatureGen = this.results.find(r => r.name.includes('Signature generation'));
    const singleLog = this.results.find(r => r.name.includes('Single entry logging'));
    const batchLog = this.results.find(r => r.name.includes('Batch logging (100'));
    const verification = this.results.find(r => r.name.includes('Verify 1000 entries'));

    if (signatureGen && signatureGen.avgTime > 1) {
      log('⚠️  Signature generation is slow (> 1ms)', 'yellow');
      log('   Consider: Upgrade Node.js version or hardware', 'reset');
    } else if (signatureGen) {
      log('✅ Signature generation performance is good', 'green');
    }

    if (singleLog && singleLog.avgTime > 50) {
      log('⚠️  Single entry logging is slow (> 50ms)', 'yellow');
      log('   Consider: Check disk I/O, use SSD, or batch writes', 'reset');
    } else if (singleLog) {
      log('✅ Single entry logging performance is good', 'green');
    }

    if (batchLog && singleLog) {
      const batchImprovement = (singleLog.avgTime * 100) / batchLog.avgTime;
      log(`📈 Batch logging is ${batchImprovement.toFixed(1)}x faster than single writes`, 'cyan');

      if (batchImprovement > 5) {
        log('   Recommendation: Use batch writes for high-throughput scenarios', 'reset');
      }
    }

    if (verification && verification.avgTime > 5000) {
      log('⚠️  Verification is slow (> 5s for 1000 entries)', 'yellow');
      log('   Consider: Parallel verification or incremental verification', 'reset');
    } else if (verification) {
      log('✅ Audit trail verification performance is good', 'green');
    }

    // General recommendations
    log('\n💡 General Guidelines:', 'cyan');
    log('   - Signature generation: < 1ms (target)', 'reset');
    log('   - Single entry logging: < 50ms (acceptable), < 10ms (good)', 'reset');
    log('   - Batch logging (100 entries): < 500ms', 'reset');
    log('   - Verification (1000 entries): < 2s', 'reset');

    console.log('');
  }
}

// ============================================================================
// Test Data Generators
// ============================================================================

function generateEntry(id = null) {
  return {
    actionId: id || `action-bench-${Date.now()}-${Math.random()}`,
    timestamp: new Date().toISOString(),
    evidenceId: 'entropy-benchmark',
    type: 'test_action',
    status: 'executed',
    trigger: 'benchmark',
    details: 'Performance benchmark entry'
  };
}

function generateEntries(count) {
  return Array.from({ length: count }, (_, i) =>
    generateEntry(`action-bench-${Date.now()}-${i}`)
  );
}

// ============================================================================
// Main Benchmark Suite
// ============================================================================

async function main() {
  log('\n🚀 S-AOS Audit Logger Performance Benchmarks\n', 'blue');
  log('═'.repeat(80), 'blue');

  const runner = new BenchmarkRunner();
  const logger = new ImmutableAuditLogger({
    secret: TEST_SECRET,
    localDir: BENCHMARK_DIR
  });

  // Clean benchmark directory
  await fs.rm(BENCHMARK_DIR, { recursive: true, force: true });

  // ============================================================================
  // Benchmark 1: Signature Generation
  // ============================================================================

  await runner.run(
    'Signature generation (single entry)',
    () => {
      const entry = generateEntry();
      logger.generateSignature(entry);
    },
    10000  // 10k iterations
  );

  // ============================================================================
  // Benchmark 2: Signature Verification
  // ============================================================================

  await runner.run(
    'Signature verification (single entry)',
    () => {
      const entry = generateEntry();
      const signature = logger.generateSignature(entry);
      const signedEntry = { ...entry, signature };
      logger.verifySignature(signedEntry);
    },
    10000  // 10k iterations
  );

  // ============================================================================
  // Benchmark 3: Single Entry Logging
  // ============================================================================

  await fs.rm(BENCHMARK_DIR, { recursive: true, force: true });

  await runner.run(
    'Single entry logging (local filesystem)',
    async () => {
      const entry = generateEntry();
      await logger.logAction(entry);
    },
    100  // 100 iterations
  );

  // ============================================================================
  // Benchmark 4: Batch Logging
  // ============================================================================

  await fs.rm(BENCHMARK_DIR, { recursive: true, force: true });

  const batchEntries100 = generateEntries(100);
  await runner.run(
    'Batch logging (100 entries)',
    async () => {
      for (const entry of batchEntries100) {
        await logger.logAction(entry);
      }
    },
    1  // 1 iteration (logging 100 entries)
  );

  // ============================================================================
  // Benchmark 5: Large Batch Logging
  // ============================================================================

  await fs.rm(BENCHMARK_DIR, { recursive: true, force: true });

  const batchEntries1000 = generateEntries(1000);
  await runner.run(
    'Batch logging (1000 entries)',
    async () => {
      for (const entry of batchEntries1000) {
        await logger.logAction(entry);
      }
    },
    1  // 1 iteration (logging 1000 entries)
  );

  // ============================================================================
  // Benchmark 6: Audit Trail Verification (100 entries)
  // ============================================================================

  await fs.rm(BENCHMARK_DIR, { recursive: true, force: true });

  // Pre-populate with 100 entries
  const entries100 = generateEntries(100);
  for (const entry of entries100) {
    await logger.logAction(entry);
  }

  await runner.run(
    'Verify audit trail (100 entries)',
    async () => {
      await logger.verifyAuditTrail();
    },
    10  // 10 iterations
  );

  // ============================================================================
  // Benchmark 7: Audit Trail Verification (1000 entries)
  // ============================================================================

  await fs.rm(BENCHMARK_DIR, { recursive: true, force: true });

  // Pre-populate with 1000 entries
  const entries1000 = generateEntries(1000);
  for (const entry of entries1000) {
    await logger.logAction(entry);
  }

  await runner.run(
    'Verify audit trail (1000 entries)',
    async () => {
      await logger.verifyAuditTrail();
    },
    5  // 5 iterations
  );

  // ============================================================================
  // Benchmark 8: Concurrent Logging (Simulated)
  // ============================================================================

  await fs.rm(BENCHMARK_DIR, { recursive: true, force: true });

  await runner.run(
    'Concurrent logging (10 parallel writes)',
    async () => {
      const concurrentEntries = generateEntries(10);
      await Promise.all(
        concurrentEntries.map(entry => logger.logAction(entry))
      );
    },
    10  // 10 iterations
  );

  // ============================================================================
  // Summary
  // ============================================================================

  runner.printSummary();
  runner.printRecommendations();

  // Cleanup
  await fs.rm(BENCHMARK_DIR, { recursive: true, force: true });

  log('✅ Benchmarks complete\n', 'green');
}

// ============================================================================
// Run
// ============================================================================

main().catch(error => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});
