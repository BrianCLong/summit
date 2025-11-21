#!/usr/bin/env node
/**
 * Graph Benchmark Runner for Summit Neo4j
 *
 * Usage:
 *   node runner/index.js --size small --scenarios quick
 *   node runner/index.js --size medium,large --scenarios all --budget-check
 *   node runner/index.js --help
 */

import neo4j from 'neo4j-driver';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import pino from 'pino';
import { generateDataset, generateCypherStatements } from '../fixtures/dataset-generator.js';
import { getScenarios } from '../scenarios/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = pino({ name: 'graph-benchmark', level: 'info' });

// Parse CLI arguments
const argv = yargs(hideBin(process.argv))
  .option('size', {
    describe: 'Dataset size(s) to benchmark',
    type: 'string',
    default: 'small',
    choices: ['small', 'medium', 'large', 'xl', 'all']
  })
  .option('scenarios', {
    describe: 'Scenario group to run',
    type: 'string',
    default: 'all',
    choices: ['quick', 'ci', 'all']
  })
  .option('iterations', {
    describe: 'Number of iterations per query',
    type: 'number',
    default: 100
  })
  .option('warmup', {
    describe: 'Number of warmup iterations',
    type: 'number',
    default: 10
  })
  .option('budget-check', {
    describe: 'Check against performance budgets and fail if exceeded',
    type: 'boolean',
    default: false
  })
  .option('neo4j-uri', {
    describe: 'Neo4j connection URI',
    type: 'string',
    default: 'bolt://localhost:7687'
  })
  .option('neo4j-user', {
    describe: 'Neo4j username',
    type: 'string',
    default: 'neo4j'
  })
  .option('neo4j-password', {
    describe: 'Neo4j password',
    type: 'string',
    default: 'testtest1'
  })
  .help()
  .argv;

class BenchmarkRunner {
  constructor(config) {
    this.config = config;
    this.driver = null;
    this.results = {
      metadata: {
        timestamp: new Date().toISOString(),
        config: {
          sizes: config.sizes,
          scenarios: config.scenarioMode,
          iterations: config.iterations,
          warmup: config.warmup
        },
        environment: {
          neo4jUri: config.neo4jUri,
          nodeVersion: process.version,
          platform: process.platform
        }
      },
      benchmarks: []
    };
  }

  async connect() {
    logger.info(`Connecting to Neo4j at ${this.config.neo4jUri}...`);
    this.driver = neo4j.driver(
      this.config.neo4jUri,
      neo4j.auth.basic(this.config.neo4jUser, this.config.neo4jPassword),
      {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 60000
      }
    );

    // Verify connection
    await this.driver.verifyConnectivity();
    logger.info('Connected to Neo4j successfully');
  }

  async disconnect() {
    if (this.driver) {
      await this.driver.close();
      logger.info('Disconnected from Neo4j');
    }
  }

  async loadDataset(dataset) {
    const session = this.driver.session();
    logger.info(`Loading dataset: ${dataset.metadata.size} (${dataset.metadata.nodeCount} nodes, ${dataset.metadata.edgeCount} edges)`);

    try {
      const statements = generateCypherStatements(dataset);
      let stmtCount = 0;

      for (const stmt of statements) {
        await session.run(stmt.query, stmt.params);
        stmtCount++;

        if (stmtCount % 10 === 0) {
          logger.info(`  Executed ${stmtCount}/${statements.length} statements...`);
        }
      }

      logger.info(`Dataset loaded successfully (${stmtCount} statements)`);
    } finally {
      await session.close();
    }
  }

  async runScenario(scenario, dataset) {
    const session = this.driver.session();
    logger.info(`Running scenario: ${scenario.name} - ${scenario.description}`);

    try {
      // Setup phase
      const setupCtx = await scenario.setup(session, dataset);

      const scenarioResults = {
        scenario: scenario.name,
        description: scenario.description,
        queries: []
      };

      // Run each query in the scenario
      for (const queryDef of scenario.queries) {
        logger.info(`  Query: ${queryDef.name}`);

        // Warmup iterations
        for (let i = 0; i < this.config.warmup; i++) {
          const params = queryDef.params(setupCtx, dataset);
          await session.run(queryDef.query, params);
        }

        // Benchmark iterations
        const latencies = [];
        let errorCount = 0;
        const memUsageBefore = process.memoryUsage();

        for (let i = 0; i < this.config.iterations; i++) {
          const params = queryDef.params(setupCtx, dataset);
          const startTime = process.hrtime.bigint();

          try {
            const result = await session.run(queryDef.query, params);
            const endTime = process.hrtime.bigint();
            const latencyMs = Number(endTime - startTime) / 1_000_000;
            latencies.push(latencyMs);

            // Force result consumption to ensure accurate timing
            result.records.length;
          } catch (error) {
            errorCount++;
            logger.error(`    Error in iteration ${i}: ${error.message}`);
          }
        }

        const memUsageAfter = process.memoryUsage();
        const memDelta = {
          heapUsed: memUsageAfter.heapUsed - memUsageBefore.heapUsed,
          external: memUsageAfter.external - memUsageBefore.external
        };

        // Calculate statistics
        const stats = this.calculateStats(latencies);
        stats.errorRate = errorCount / this.config.iterations;
        stats.memoryDeltaMB = memDelta.heapUsed / (1024 * 1024);

        scenarioResults.queries.push({
          name: queryDef.name,
          iterations: this.config.iterations,
          errorCount,
          ...stats
        });

        logger.info(`    p50: ${stats.p50.toFixed(2)}ms, p95: ${stats.p95.toFixed(2)}ms, p99: ${stats.p99.toFixed(2)}ms, errors: ${errorCount}`);
      }

      return scenarioResults;
    } finally {
      await session.close();
    }
  }

  calculateStats(latencies) {
    if (latencies.length === 0) {
      return { p50: 0, p95: 0, p99: 0, min: 0, max: 0, mean: 0, stddev: 0 };
    }

    const sorted = latencies.slice().sort((a, b) => a - b);
    const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const variance = sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sorted.length;
    const stddev = Math.sqrt(variance);

    return {
      p50: sorted[Math.floor(0.50 * sorted.length)],
      p95: sorted[Math.floor(0.95 * sorted.length)],
      p99: sorted[Math.floor(0.99 * sorted.length)],
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean,
      stddev
    };
  }

  async runBenchmarks() {
    const scenarios = getScenarios(this.config.scenarioMode);

    for (const size of this.config.sizes) {
      logger.info(`\n${'='.repeat(60)}`);
      logger.info(`Benchmarking dataset size: ${size}`);
      logger.info('='.repeat(60));

      // Generate and load dataset
      const dataset = generateDataset(size, `bench-${size}`);
      await this.loadDataset(dataset);

      const sizeResults = {
        size,
        dataset: dataset.metadata,
        scenarios: []
      };

      // Run all scenarios
      for (const scenario of scenarios) {
        const scenarioResult = await this.runScenario(scenario, dataset);
        sizeResults.scenarios.push(scenarioResult);
      }

      this.results.benchmarks.push(sizeResults);
    }
  }

  checkBudgets(budgets) {
    logger.info('\n' + '='.repeat(60));
    logger.info('Checking Performance Budgets');
    logger.info('='.repeat(60));

    let violations = [];

    for (const benchmark of this.results.benchmarks) {
      for (const scenario of benchmark.scenarios) {
        for (const query of scenario.queries) {
          const budgetKey = query.name;
          const budget = budgets.budgets[budgetKey];

          if (!budget) {
            logger.warn(`  No budget defined for ${budgetKey}`);
            continue;
          }

          // Check each threshold
          const checks = [
            { metric: 'p50', actual: query.p50, threshold: budget.thresholds.p50 },
            { metric: 'p95', actual: query.p95, threshold: budget.thresholds.p95 },
            { metric: 'p99', actual: query.p99, threshold: budget.thresholds.p99 }
          ];

          for (const check of checks) {
            const exceeded = check.actual > check.threshold;
            const status = exceeded ? '❌ FAIL' : '✅ PASS';
            const msg = `  ${status} ${benchmark.size}/${query.name}/${check.metric}: ${check.actual.toFixed(2)}ms (budget: ${check.threshold}ms)`;

            if (exceeded) {
              logger.error(msg);
              if (budget.critical) {
                violations.push({
                  size: benchmark.size,
                  query: query.name,
                  metric: check.metric,
                  actual: check.actual,
                  threshold: check.threshold,
                  critical: true
                });
              }
            } else {
              logger.info(msg);
            }
          }
        }
      }
    }

    this.results.budgetCheck = {
      passed: violations.length === 0,
      violations
    };

    if (violations.length > 0) {
      logger.error(`\n❌ Budget check FAILED: ${violations.length} critical violations`);
      return false;
    } else {
      logger.info('\n✅ Budget check PASSED: All queries within budgets');
      return true;
    }
  }

  async saveResults() {
    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const jsonPath = path.join(reportsDir, `benchmark-${timestamp}.json`);

    fs.writeFileSync(jsonPath, JSON.stringify(this.results, null, 2));
    logger.info(`\nResults saved to: ${jsonPath}`);

    // Also save as latest.json for easy access
    const latestPath = path.join(reportsDir, 'latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(this.results, null, 2));

    return jsonPath;
  }
}

async function main() {
  const sizes = argv.size === 'all'
    ? ['small', 'medium', 'large', 'xl']
    : argv.size.split(',');

  const config = {
    sizes,
    scenarioMode: argv.scenarios,
    iterations: argv.iterations,
    warmup: argv.warmup,
    neo4jUri: argv['neo4j-uri'],
    neo4jUser: argv['neo4j-user'],
    neo4jPassword: argv['neo4j-password'],
    budgetCheck: argv['budget-check']
  };

  const runner = new BenchmarkRunner(config);

  try {
    await runner.connect();
    await runner.runBenchmarks();
    const resultsPath = await runner.saveResults();

    // Check budgets if requested
    if (config.budgetCheck) {
      const budgetsPath = path.join(__dirname, '..', 'config', 'budgets.json');
      const budgets = JSON.parse(fs.readFileSync(budgetsPath, 'utf8'));
      const passed = runner.checkBudgets(budgets);

      if (!passed) {
        process.exit(1);
      }
    }

    logger.info('\n✅ Benchmark completed successfully');
    logger.info(`\nTo generate a report, run: npm run report`);
  } catch (error) {
    logger.error('Benchmark failed:', error);
    process.exit(1);
  } finally {
    await runner.disconnect();
  }
}

main();
