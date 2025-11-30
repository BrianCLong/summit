#!/usr/bin/env node
/**
 * @fileoverview Performance Benchmarking Suite
 *
 * Comprehensive performance testing framework implementing:
 * - Load testing with configurable concurrency
 * - Latency percentile analysis (p50, p95, p99)
 * - Throughput measurement
 * - Memory and CPU profiling
 * - Database query performance
 * - API endpoint benchmarks
 * - Stress testing
 * - Soak testing
 *
 * @module scripts/performance-benchmark
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');
const os = require('os');
const v8 = require('v8');

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
  concurrency: parseInt(process.env.BENCHMARK_CONCURRENCY || '10', 10),
  duration: parseInt(process.env.BENCHMARK_DURATION || '30', 10), // seconds
  warmupDuration: parseInt(process.env.BENCHMARK_WARMUP || '5', 10), // seconds
  requestTimeout: parseInt(process.env.BENCHMARK_TIMEOUT || '30000', 10), // ms
  authToken: process.env.BENCHMARK_AUTH_TOKEN || '',
  outputFormat: process.env.BENCHMARK_OUTPUT || 'console', // console, json, csv
};

// ============================================================================
// Types
// ============================================================================

/**
 * @typedef {Object} BenchmarkResult
 * @property {string} name - Benchmark name
 * @property {number} totalRequests - Total requests made
 * @property {number} successfulRequests - Successful requests
 * @property {number} failedRequests - Failed requests
 * @property {number} duration - Total duration in ms
 * @property {number} rps - Requests per second
 * @property {LatencyStats} latency - Latency statistics
 * @property {number[]} errors - Error codes encountered
 */

/**
 * @typedef {Object} LatencyStats
 * @property {number} min - Minimum latency
 * @property {number} max - Maximum latency
 * @property {number} mean - Mean latency
 * @property {number} p50 - 50th percentile
 * @property {number} p75 - 75th percentile
 * @property {number} p90 - 90th percentile
 * @property {number} p95 - 95th percentile
 * @property {number} p99 - 99th percentile
 * @property {number} stdDev - Standard deviation
 */

// ============================================================================
// Utilities
// ============================================================================

/**
 * Calculate percentile from sorted array
 * @param {number[]} sorted - Sorted array of values
 * @param {number} p - Percentile (0-100)
 * @returns {number}
 */
function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Calculate standard deviation
 * @param {number[]} values - Array of values
 * @param {number} mean - Mean value
 * @returns {number}
 */
function standardDeviation(values, mean) {
  if (values.length === 0) return 0;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Calculate latency statistics
 * @param {number[]} latencies - Array of latency values
 * @returns {LatencyStats}
 */
function calculateLatencyStats(latencies) {
  if (latencies.length === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      p50: 0,
      p75: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      stdDev: 0,
    };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Math.round(mean * 100) / 100,
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    stdDev: Math.round(standardDeviation(sorted, mean) * 100) / 100,
  };
}

/**
 * Format bytes to human readable
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
}

/**
 * Get system metrics
 * @returns {Object}
 */
function getSystemMetrics() {
  const memUsage = process.memoryUsage();
  const heapStats = v8.getHeapStatistics();

  return {
    cpuUsage: os.loadavg(),
    memoryUsage: {
      rss: formatBytes(memUsage.rss),
      heapTotal: formatBytes(memUsage.heapTotal),
      heapUsed: formatBytes(memUsage.heapUsed),
      external: formatBytes(memUsage.external),
    },
    heapStats: {
      totalHeapSize: formatBytes(heapStats.total_heap_size),
      usedHeapSize: formatBytes(heapStats.used_heap_size),
      heapSizeLimit: formatBytes(heapStats.heap_size_limit),
    },
    platform: {
      os: os.platform(),
      cpus: os.cpus().length,
      totalMemory: formatBytes(os.totalmem()),
      freeMemory: formatBytes(os.freemem()),
    },
  };
}

// ============================================================================
// HTTP Client
// ============================================================================

class BenchmarkHttpClient {
  constructor(config) {
    this.config = config;
    this.protocol = config.baseUrl.startsWith('https') ? https : http;
    this.baseUrl = new URL(config.baseUrl);
  }

  /**
   * Make HTTP request and measure latency
   * @param {Object} options - Request options
   * @returns {Promise<{statusCode: number, latency: number, error?: Error}>}
   */
  async request(options) {
    const startTime = performance.now();

    return new Promise((resolve) => {
      const reqOptions = {
        hostname: this.baseUrl.hostname,
        port: this.baseUrl.port || (this.baseUrl.protocol === 'https:' ? 443 : 80),
        path: options.path || '/',
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.authToken && {
            Authorization: `Bearer ${this.config.authToken}`,
          }),
          ...options.headers,
        },
        timeout: this.config.requestTimeout,
      };

      const req = this.protocol.request(reqOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          const latency = performance.now() - startTime;
          resolve({
            statusCode: res.statusCode,
            latency,
            data,
          });
        });
      });

      req.on('error', (error) => {
        const latency = performance.now() - startTime;
        resolve({
          statusCode: 0,
          latency,
          error,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        const latency = performance.now() - startTime;
        resolve({
          statusCode: 0,
          latency,
          error: new Error('Request timeout'),
        });
      });

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  /**
   * Make GraphQL request
   * @param {string} query - GraphQL query
   * @param {Object} variables - Query variables
   * @returns {Promise<Object>}
   */
  async graphql(query, variables = {}) {
    return this.request({
      path: '/graphql',
      method: 'POST',
      body: { query, variables },
    });
  }
}

// ============================================================================
// Benchmark Runner
// ============================================================================

class BenchmarkRunner {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.client = new BenchmarkHttpClient(this.config);
    this.results = [];
  }

  /**
   * Run a single benchmark
   * @param {string} name - Benchmark name
   * @param {Function} requestFn - Function that returns request options
   * @returns {Promise<BenchmarkResult>}
   */
  async runBenchmark(name, requestFn) {
    console.log(`\n📊 Running benchmark: ${name}`);
    console.log(`   Concurrency: ${this.config.concurrency}`);
    console.log(`   Duration: ${this.config.duration}s`);
    console.log(`   Warmup: ${this.config.warmupDuration}s`);

    // Warmup phase
    console.log('\n🔥 Warmup phase...');
    await this.runPhase(requestFn, this.config.warmupDuration * 1000);

    // Benchmark phase
    console.log('⚡ Benchmark phase...');
    const result = await this.runPhase(requestFn, this.config.duration * 1000);

    const benchmarkResult = {
      name,
      totalRequests: result.total,
      successfulRequests: result.success,
      failedRequests: result.failed,
      duration: result.duration,
      rps: Math.round((result.total / result.duration) * 1000 * 100) / 100,
      latency: calculateLatencyStats(result.latencies),
      errors: result.errorCodes,
      timestamp: new Date().toISOString(),
    };

    this.results.push(benchmarkResult);
    this.printResult(benchmarkResult);

    return benchmarkResult;
  }

  /**
   * Run a benchmark phase
   * @param {Function} requestFn
   * @param {number} durationMs
   * @returns {Promise<Object>}
   */
  async runPhase(requestFn, durationMs) {
    const startTime = performance.now();
    const endTime = startTime + durationMs;
    const latencies = [];
    let total = 0;
    let success = 0;
    let failed = 0;
    const errorCodes = {};

    const workers = [];
    for (let i = 0; i < this.config.concurrency; i++) {
      workers.push(
        (async () => {
          while (performance.now() < endTime) {
            const options = await requestFn();
            const result = await this.client.request(options);

            total++;
            latencies.push(result.latency);

            if (result.statusCode >= 200 && result.statusCode < 400) {
              success++;
            } else {
              failed++;
              const code = result.error ? 'ERROR' : result.statusCode;
              errorCodes[code] = (errorCodes[code] || 0) + 1;
            }
          }
        })()
      );
    }

    await Promise.all(workers);

    return {
      total,
      success,
      failed,
      latencies,
      errorCodes,
      duration: performance.now() - startTime,
    };
  }

  /**
   * Print benchmark result
   * @param {BenchmarkResult} result
   */
  printResult(result) {
    console.log('\n📈 Results:');
    console.log(`   Total Requests:     ${result.totalRequests}`);
    console.log(`   Successful:         ${result.successfulRequests}`);
    console.log(`   Failed:             ${result.failedRequests}`);
    console.log(`   Duration:           ${(result.duration / 1000).toFixed(2)}s`);
    console.log(`   Requests/sec:       ${result.rps}`);
    console.log('\n   Latency (ms):');
    console.log(`     Min:              ${result.latency.min.toFixed(2)}`);
    console.log(`     Max:              ${result.latency.max.toFixed(2)}`);
    console.log(`     Mean:             ${result.latency.mean.toFixed(2)}`);
    console.log(`     P50:              ${result.latency.p50.toFixed(2)}`);
    console.log(`     P95:              ${result.latency.p95.toFixed(2)}`);
    console.log(`     P99:              ${result.latency.p99.toFixed(2)}`);
    console.log(`     Std Dev:          ${result.latency.stdDev.toFixed(2)}`);

    if (Object.keys(result.errors).length > 0) {
      console.log('\n   Errors:');
      for (const [code, count] of Object.entries(result.errors)) {
        console.log(`     ${code}: ${count}`);
      }
    }
  }

  /**
   * Run all defined benchmarks
   * @returns {Promise<Object>}
   */
  async runAll() {
    console.log('🚀 Starting Performance Benchmark Suite');
    console.log('═'.repeat(50));
    console.log('\n📋 System Information:');
    const sysMetrics = getSystemMetrics();
    console.log(`   OS: ${sysMetrics.platform.os}`);
    console.log(`   CPUs: ${sysMetrics.platform.cpus}`);
    console.log(`   Total Memory: ${sysMetrics.platform.totalMemory}`);
    console.log(`   Free Memory: ${sysMetrics.platform.freeMemory}`);

    // Health check benchmark
    await this.runBenchmark('Health Check', async () => ({
      path: '/health',
      method: 'GET',
    }));

    // GraphQL query benchmark
    await this.runBenchmark('GraphQL Simple Query', async () => ({
      path: '/graphql',
      method: 'POST',
      body: {
        query: `query { __typename }`,
      },
    }));

    // GraphQL introspection benchmark
    await this.runBenchmark('GraphQL Introspection', async () => ({
      path: '/graphql',
      method: 'POST',
      body: {
        query: `
          query IntrospectionQuery {
            __schema {
              types {
                name
              }
            }
          }
        `,
      },
    }));

    // Entity listing benchmark (if authenticated)
    if (this.config.authToken) {
      await this.runBenchmark('Entity Listing', async () => ({
        path: '/graphql',
        method: 'POST',
        body: {
          query: `
            query {
              entities(first: 10) {
                edges {
                  node {
                    id
                    type
                    label
                  }
                }
              }
            }
          `,
        },
      }));

      await this.runBenchmark('Investigation Listing', async () => ({
        path: '/graphql',
        method: 'POST',
        body: {
          query: `
            query {
              investigations(first: 10) {
                edges {
                  node {
                    id
                    title
                    status
                  }
                }
              }
            }
          `,
        },
      }));
    }

    // Generate summary
    const summary = this.generateSummary();
    this.printSummary(summary);

    return {
      results: this.results,
      summary,
      system: sysMetrics,
    };
  }

  /**
   * Generate benchmark summary
   * @returns {Object}
   */
  generateSummary() {
    if (this.results.length === 0) {
      return { message: 'No benchmarks run' };
    }

    const totalRequests = this.results.reduce((sum, r) => sum + r.totalRequests, 0);
    const totalSuccess = this.results.reduce((sum, r) => sum + r.successfulRequests, 0);
    const avgRps = this.results.reduce((sum, r) => sum + r.rps, 0) / this.results.length;
    const avgLatency =
      this.results.reduce((sum, r) => sum + r.latency.mean, 0) / this.results.length;
    const maxP99 = Math.max(...this.results.map((r) => r.latency.p99));

    return {
      totalBenchmarks: this.results.length,
      totalRequests,
      totalSuccess,
      successRate: ((totalSuccess / totalRequests) * 100).toFixed(2) + '%',
      averageRps: Math.round(avgRps * 100) / 100,
      averageLatency: Math.round(avgLatency * 100) / 100,
      maxP99Latency: Math.round(maxP99 * 100) / 100,
      sloCompliance: {
        p95Under100ms: this.results.filter((r) => r.latency.p95 < 100).length,
        p99Under500ms: this.results.filter((r) => r.latency.p99 < 500).length,
        successRateOver99: this.results.filter(
          (r) => r.successfulRequests / r.totalRequests >= 0.99
        ).length,
      },
    };
  }

  /**
   * Print summary
   * @param {Object} summary
   */
  printSummary(summary) {
    console.log('\n' + '═'.repeat(50));
    console.log('📊 BENCHMARK SUMMARY');
    console.log('═'.repeat(50));
    console.log(`\n   Total Benchmarks:   ${summary.totalBenchmarks}`);
    console.log(`   Total Requests:     ${summary.totalRequests}`);
    console.log(`   Success Rate:       ${summary.successRate}`);
    console.log(`   Average RPS:        ${summary.averageRps}`);
    console.log(`   Average Latency:    ${summary.averageLatency}ms`);
    console.log(`   Max P99 Latency:    ${summary.maxP99Latency}ms`);
    console.log('\n   SLO Compliance:');
    console.log(
      `     P95 < 100ms:      ${summary.sloCompliance.p95Under100ms}/${summary.totalBenchmarks}`
    );
    console.log(
      `     P99 < 500ms:      ${summary.sloCompliance.p99Under500ms}/${summary.totalBenchmarks}`
    );
    console.log(
      `     Success > 99%:    ${summary.sloCompliance.successRateOver99}/${summary.totalBenchmarks}`
    );
    console.log('\n' + '═'.repeat(50));
  }

  /**
   * Export results to JSON
   * @returns {string}
   */
  exportJson() {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        config: this.config,
        results: this.results,
        summary: this.generateSummary(),
        system: getSystemMetrics(),
      },
      null,
      2
    );
  }

  /**
   * Export results to CSV
   * @returns {string}
   */
  exportCsv() {
    const headers = [
      'name',
      'totalRequests',
      'successfulRequests',
      'failedRequests',
      'rps',
      'latencyMin',
      'latencyMax',
      'latencyMean',
      'latencyP50',
      'latencyP95',
      'latencyP99',
    ];

    const rows = this.results.map((r) =>
      [
        r.name,
        r.totalRequests,
        r.successfulRequests,
        r.failedRequests,
        r.rps,
        r.latency.min,
        r.latency.max,
        r.latency.mean,
        r.latency.p50,
        r.latency.p95,
        r.latency.p99,
      ].join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }
}

// ============================================================================
// Stress Test Runner
// ============================================================================

class StressTestRunner extends BenchmarkRunner {
  constructor(config = {}) {
    super(config);
    this.stressConfig = {
      startConcurrency: config.startConcurrency || 1,
      maxConcurrency: config.maxConcurrency || 100,
      step: config.step || 10,
      stepDuration: config.stepDuration || 10, // seconds
      targetRps: config.targetRps || null,
      maxErrorRate: config.maxErrorRate || 0.05, // 5%
    };
  }

  /**
   * Run stress test with increasing load
   * @param {Function} requestFn
   * @returns {Promise<Object>}
   */
  async runStressTest(requestFn) {
    console.log('\n🔥 Starting Stress Test');
    console.log('═'.repeat(50));
    console.log(`   Start Concurrency:  ${this.stressConfig.startConcurrency}`);
    console.log(`   Max Concurrency:    ${this.stressConfig.maxConcurrency}`);
    console.log(`   Step Size:          ${this.stressConfig.step}`);
    console.log(`   Step Duration:      ${this.stressConfig.stepDuration}s`);

    const stressResults = [];
    let breakingPoint = null;

    for (
      let concurrency = this.stressConfig.startConcurrency;
      concurrency <= this.stressConfig.maxConcurrency;
      concurrency += this.stressConfig.step
    ) {
      console.log(`\n📈 Testing with concurrency: ${concurrency}`);

      this.config.concurrency = concurrency;
      const result = await this.runPhase(
        requestFn,
        this.stressConfig.stepDuration * 1000
      );

      const errorRate = result.failed / result.total;
      const stats = calculateLatencyStats(result.latencies);

      stressResults.push({
        concurrency,
        rps: Math.round((result.total / result.duration) * 1000 * 100) / 100,
        errorRate: Math.round(errorRate * 10000) / 100,
        latency: stats,
      });

      console.log(`   RPS: ${stressResults[stressResults.length - 1].rps}`);
      console.log(`   Error Rate: ${stressResults[stressResults.length - 1].errorRate}%`);
      console.log(`   P99 Latency: ${stats.p99.toFixed(2)}ms`);

      // Check if we've hit the breaking point
      if (errorRate > this.stressConfig.maxErrorRate && !breakingPoint) {
        breakingPoint = {
          concurrency,
          errorRate: Math.round(errorRate * 10000) / 100,
          rps: stressResults[stressResults.length - 1].rps,
        };
        console.log(`\n⚠️  Breaking point detected at concurrency ${concurrency}!`);
      }
    }

    // Find optimal concurrency (highest RPS with acceptable error rate)
    const validResults = stressResults.filter(
      (r) => r.errorRate <= this.stressConfig.maxErrorRate * 100
    );
    const optimalResult = validResults.reduce(
      (best, r) => (r.rps > best.rps ? r : best),
      validResults[0] || stressResults[0]
    );

    console.log('\n' + '═'.repeat(50));
    console.log('📊 STRESS TEST SUMMARY');
    console.log('═'.repeat(50));
    console.log(`\n   Optimal Concurrency: ${optimalResult.concurrency}`);
    console.log(`   Max Stable RPS:      ${optimalResult.rps}`);
    if (breakingPoint) {
      console.log(`   Breaking Point:      ${breakingPoint.concurrency} concurrent`);
    }

    return {
      stressResults,
      optimalConcurrency: optimalResult.concurrency,
      maxStableRps: optimalResult.rps,
      breakingPoint,
    };
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'benchmark';

  try {
    switch (command) {
      case 'benchmark': {
        const runner = new BenchmarkRunner();
        const results = await runner.runAll();

        if (DEFAULT_CONFIG.outputFormat === 'json') {
          console.log(runner.exportJson());
        } else if (DEFAULT_CONFIG.outputFormat === 'csv') {
          console.log(runner.exportCsv());
        }
        break;
      }

      case 'stress': {
        const runner = new StressTestRunner({
          startConcurrency: parseInt(args[1] || '1', 10),
          maxConcurrency: parseInt(args[2] || '100', 10),
          step: parseInt(args[3] || '10', 10),
        });

        await runner.runStressTest(async () => ({
          path: '/health',
          method: 'GET',
        }));
        break;
      }

      case 'soak': {
        console.log('🕐 Starting Soak Test (30 minutes)');
        const runner = new BenchmarkRunner({
          duration: 1800, // 30 minutes
          warmupDuration: 60,
        });

        await runner.runBenchmark('Soak Test - Health', async () => ({
          path: '/health',
          method: 'GET',
        }));
        break;
      }

      default:
        console.log('Usage: node performance-benchmark.js [benchmark|stress|soak]');
        console.log('');
        console.log('Commands:');
        console.log('  benchmark  Run standard benchmark suite');
        console.log('  stress     Run stress test with increasing load');
        console.log('  soak       Run 30-minute soak test');
        console.log('');
        console.log('Environment variables:');
        console.log('  API_BASE_URL          API base URL (default: http://localhost:4000)');
        console.log('  BENCHMARK_CONCURRENCY Concurrent requests (default: 10)');
        console.log('  BENCHMARK_DURATION    Test duration in seconds (default: 30)');
        console.log('  BENCHMARK_AUTH_TOKEN  Bearer token for authenticated endpoints');
        console.log('  BENCHMARK_OUTPUT      Output format: console, json, csv');
        process.exit(1);
    }

    console.log('\n✅ Benchmark complete!');
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  BenchmarkRunner,
  StressTestRunner,
  BenchmarkHttpClient,
  calculateLatencyStats,
  getSystemMetrics,
  DEFAULT_CONFIG,
};
