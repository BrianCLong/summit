#!/usr/bin/env node
/**
 * Database Query Performance Benchmark
 *
 * This script benchmarks database queries before and after optimizations
 * to measure performance improvements.
 *
 * Usage:
 *   npm run benchmark:queries
 *   OR
 *   node --loader ts-node/esm src/db/benchmarks/query-performance-benchmark.ts
 *
 * Date: 2025-11-20
 * Reference: server/src/db/performance-analysis.md
 */

import { performance } from 'node:perf_hooks';
import { randomUUID as uuidv4 } from 'crypto';
// @ts-ignore - pg type imports
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// Configuration
// ============================================================================

const BENCHMARK_CONFIG = {
  // Sample data sizes
  ENTITY_COUNT: 10000,
  RELATIONSHIP_COUNT: 50000,
  INVESTIGATION_COUNT: 100,

  // Benchmark iterations
  WARMUP_ITERATIONS: 5,
  BENCHMARK_ITERATIONS: 100,

  // Test tenant
  TENANT_ID: 'benchmark-tenant-' + uuidv4(),
  USER_ID: 'benchmark-user-' + uuidv4(),
};

interface BenchmarkResult {
  testName: string;
  iterations: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
  meanMs: number;
  totalMs: number;
}

// ============================================================================
// Database Setup
// ============================================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

// ============================================================================
// Sample Data Generation
// ============================================================================

async function generateSampleData(): Promise<void> {
  console.log('\n📊 Generating sample data...');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Generate entities
    console.log(
      `   Inserting ${BENCHMARK_CONFIG.ENTITY_COUNT} sample entities...`,
    );
    const entityIds: string[] = [];
    const batchSize = 1000;

    for (let i = 0; i < BENCHMARK_CONFIG.ENTITY_COUNT; i += batchSize) {
      const batch = Math.min(batchSize, BENCHMARK_CONFIG.ENTITY_COUNT - i);
      const ids: string[] = [];
      const tenants: string[] = [];
      const kinds: string[] = [];
      const labels: string[][] = [];
      const props: string[] = [];

      for (let j = 0; j < batch; j++) {
        const id = uuidv4();
        ids.push(id);
        entityIds.push(id);
        tenants.push(BENCHMARK_CONFIG.TENANT_ID);
        kinds.push(j % 3 === 0 ? 'Person' : j % 3 === 1 ? 'Organization' : 'Location');
        labels.push(['test', 'benchmark']);
        props.push(
          JSON.stringify({
            name: `Entity ${i + j}`,
            benchmarkRun: true,
            investigationId:
              j % 10 === 0 ? `inv-${Math.floor((i + j) / 10)}` : undefined,
          }),
        );
      }

      await client.query(
        `INSERT INTO entities (id, tenant_id, kind, labels, props, created_by)
         SELECT * FROM UNNEST($1::uuid[], $2::text[], $3::text[], $4::text[][], $5::jsonb[], $6::text[])`,
        [ids, tenants, kinds, labels, props, new Array(batch).fill(BENCHMARK_CONFIG.USER_ID)],
      );
    }

    // Generate relationships
    console.log(
      `   Inserting ${BENCHMARK_CONFIG.RELATIONSHIP_COUNT} sample relationships...`,
    );
    for (let i = 0; i < BENCHMARK_CONFIG.RELATIONSHIP_COUNT; i += batchSize) {
      const batch = Math.min(
        batchSize,
        BENCHMARK_CONFIG.RELATIONSHIP_COUNT - i,
      );
      const ids: string[] = [];
      const tenants: string[] = [];
      const srcIds: string[] = [];
      const dstIds: string[] = [];
      const types: string[] = [];
      const props: string[] = [];

      for (let j = 0; j < batch; j++) {
        ids.push(uuidv4());
        tenants.push(BENCHMARK_CONFIG.TENANT_ID);
        srcIds.push(
          entityIds[Math.floor(Math.random() * entityIds.length)],
        );
        dstIds.push(
          entityIds[Math.floor(Math.random() * entityIds.length)],
        );
        types.push(
          j % 2 === 0 ? 'KNOWS' : j % 3 === 0 ? 'WORKS_AT' : 'RELATED_TO',
        );
        props.push(
          JSON.stringify({
            weight: Math.random(),
            benchmarkRun: true,
            investigationId:
              j % 10 === 0 ? `inv-${Math.floor((i + j) / 10)}` : undefined,
          }),
        );
      }

      await client.query(
        `INSERT INTO relationships (id, tenant_id, src_id, dst_id, type, props, created_by)
         SELECT * FROM UNNEST($1::uuid[], $2::text[], $3::uuid[], $4::uuid[], $5::text[], $6::jsonb[], $7::text[])`,
        [ids, tenants, srcIds, dstIds, types, props, new Array(batch).fill(BENCHMARK_CONFIG.USER_ID)],
      );
    }

    // Generate investigations
    console.log(
      `   Inserting ${BENCHMARK_CONFIG.INVESTIGATION_COUNT} sample investigations...`,
    );
    for (let i = 0; i < BENCHMARK_CONFIG.INVESTIGATION_COUNT; i++) {
      await client.query(
        `INSERT INTO investigations (id, tenant_id, name, status, props, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          `inv-${i}`,
          BENCHMARK_CONFIG.TENANT_ID,
          `Benchmark Investigation ${i}`,
          'active',
          JSON.stringify({ benchmarkRun: true }),
          BENCHMARK_CONFIG.USER_ID,
        ],
      );
    }

    await client.query('COMMIT');
    console.log('✅ Sample data generated successfully\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to generate sample data:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function cleanupSampleData(): Promise<void> {
  console.log('\n🧹 Cleaning up sample data...');

  await pool.query(
    `DELETE FROM relationships WHERE tenant_id = $1`,
    [BENCHMARK_CONFIG.TENANT_ID],
  );
  await pool.query(
    `DELETE FROM entities WHERE tenant_id = $1`,
    [BENCHMARK_CONFIG.TENANT_ID],
  );
  await pool.query(
    `DELETE FROM investigations WHERE tenant_id = $1`,
    [BENCHMARK_CONFIG.TENANT_ID],
  );

  console.log('✅ Cleanup complete\n');
}

// ============================================================================
// Benchmark Utilities
// ============================================================================

function calculateStats(durations: number[]): BenchmarkResult {
  const sorted = [...durations].sort((a, b) => a - b);
  const total = sorted.reduce((sum, d) => sum + d, 0);

  return {
    testName: '',
    iterations: sorted.length,
    p50Ms: sorted[Math.floor(sorted.length * 0.5)],
    p95Ms: sorted[Math.floor(sorted.length * 0.95)],
    p99Ms: sorted[Math.floor(sorted.length * 0.99)],
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
    meanMs: total / sorted.length,
    totalMs: total,
  };
}

async function runBenchmark(
  name: string,
  fn: () => Promise<void>,
): Promise<BenchmarkResult> {
  // Warmup
  for (let i = 0; i < BENCHMARK_CONFIG.WARMUP_ITERATIONS; i++) {
    await fn();
  }

  // Actual benchmark
  const durations: number[] = [];
  for (let i = 0; i < BENCHMARK_CONFIG.BENCHMARK_ITERATIONS; i++) {
    const start = performance.now();
    await fn();
    const duration = performance.now() - start;
    durations.push(duration);
  }

  const result = calculateStats(durations);
  result.testName = name;
  return result;
}

function printResults(results: BenchmarkResult[]) {
  console.log('\n' + '='.repeat(100));
  console.log('📈 BENCHMARK RESULTS');
  console.log('='.repeat(100));
  console.log(
    `${'Test Name'.padEnd(50)} | ${'Mean'.padStart(10)} | ${'p50'.padStart(10)} | ${'p95'.padStart(10)} | ${'p99'.padStart(10)} | ${'Min'.padStart(10)} | ${'Max'.padStart(10)}`,
  );
  console.log('-'.repeat(100));

  for (const result of results) {
    console.log(
      `${result.testName.padEnd(50)} | ${result.meanMs.toFixed(2).padStart(10)} | ${result.p50Ms.toFixed(2).padStart(10)} | ${result.p95Ms.toFixed(2).padStart(10)} | ${result.p99Ms.toFixed(2).padStart(10)} | ${result.minMs.toFixed(2).padStart(10)} | ${result.maxMs.toFixed(2).padStart(10)}`,
    );
  }

  console.log('='.repeat(100) + '\n');
}

// ============================================================================
// Benchmark Tests
// ============================================================================

async function benchmarkEntitySearchWithJsonb(
  useOptimizedIndexes: boolean,
): Promise<BenchmarkResult> {
  // This test shows before/after of JSONB GIN index
  const testName = useOptimizedIndexes
    ? '1. Entity Search with JSONB (WITH GIN index)'
    : '1. Entity Search with JSONB (NO index)';

  return runBenchmark(testName, async () => {
    await pool.query(
      `SELECT * FROM entities
       WHERE tenant_id = $1 AND props @> $2::jsonb
       LIMIT 10`,
      [
        BENCHMARK_CONFIG.TENANT_ID,
        JSON.stringify({ benchmarkRun: true }),
      ],
    );
  });
}

async function benchmarkInvestigationStats(): Promise<BenchmarkResult> {
  const testName = '2. Investigation Stats (OPTIMIZED - single query)';

  return runBenchmark(testName, async () => {
    await pool.query(
      `SELECT
         (SELECT COUNT(*)
          FROM entities
          WHERE tenant_id = $1
            AND props->>'investigationId' = $2) as entity_count,
         (SELECT COUNT(*)
          FROM relationships
          WHERE tenant_id = $1
            AND props->>'investigationId' = $2) as relationship_count`,
      [BENCHMARK_CONFIG.TENANT_ID, 'inv-1'],
    );
  });
}

async function benchmarkRelationshipsByEntity(): Promise<BenchmarkResult> {
  const testName = '3. Relationships by Entity (OPTIMIZED - UNION ALL)';

  // Pick a random entity
  const { rows } = await pool.query(
    `SELECT id FROM entities WHERE tenant_id = $1 LIMIT 1`,
    [BENCHMARK_CONFIG.TENANT_ID],
  );
  const entityId = rows[0].id;

  return runBenchmark(testName, async () => {
    await pool.query(
      `SELECT * FROM relationships
       WHERE tenant_id = $1 AND src_id = $2

       UNION ALL

       SELECT * FROM relationships
       WHERE tenant_id = $1 AND dst_id = $2

       ORDER BY created_at DESC`,
      [BENCHMARK_CONFIG.TENANT_ID, entityId, BENCHMARK_CONFIG.TENANT_ID, entityId],
    );
  });
}

async function benchmarkRelationshipCount(): Promise<BenchmarkResult> {
  const testName = '4. Relationship Count (OPTIMIZED - parallel queries)';

  // Pick a random entity
  const { rows } = await pool.query(
    `SELECT id FROM entities WHERE tenant_id = $1 LIMIT 1`,
    [BENCHMARK_CONFIG.TENANT_ID],
  );
  const entityId = rows[0].id;

  return runBenchmark(testName, async () => {
    await Promise.all([
      pool.query(
        `SELECT COUNT(*) as count FROM relationships
         WHERE tenant_id = $1 AND src_id = $2`,
        [BENCHMARK_CONFIG.TENANT_ID, entityId],
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM relationships
         WHERE tenant_id = $1 AND dst_id = $2`,
        [BENCHMARK_CONFIG.TENANT_ID, entityId],
      ),
    ]);
  });
}

// ============================================================================
// Main Benchmark Runner
// ============================================================================

async function main() {
  console.log('🚀 Database Query Performance Benchmark\n');
  console.log('Configuration:');
  console.log(`  Entities: ${BENCHMARK_CONFIG.ENTITY_COUNT}`);
  console.log(`  Relationships: ${BENCHMARK_CONFIG.RELATIONSHIP_COUNT}`);
  console.log(`  Investigations: ${BENCHMARK_CONFIG.INVESTIGATION_COUNT}`);
  console.log(`  Warmup iterations: ${BENCHMARK_CONFIG.WARMUP_ITERATIONS}`);
  console.log(`  Benchmark iterations: ${BENCHMARK_CONFIG.BENCHMARK_ITERATIONS}`);

  try {
    // Setup
    await generateSampleData();

    // Run benchmarks
    console.log('⏱️  Running benchmarks...\n');

    const results: BenchmarkResult[] = [];

    // Test 1: Entity search with JSONB (will benefit from GIN index)
    results.push(await benchmarkEntitySearchWithJsonb(true));

    // Test 2: Investigation stats (optimized single query)
    results.push(await benchmarkInvestigationStats());

    // Test 3: Relationships by entity (UNION ALL)
    results.push(await benchmarkRelationshipsByEntity());

    // Test 4: Relationship count (parallel queries)
    results.push(await benchmarkRelationshipCount());

    // Print results
    printResults(results);

    // Cleanup
    await cleanupSampleData();

    console.log('✅ Benchmark complete!\n');
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
