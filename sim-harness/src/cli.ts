#!/usr/bin/env node
/**
 * CLI for IntelGraph Simulation Harness
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import {
  ScenarioGenerator,
  GhostAnalyst,
  MetricsCollector,
  ComparisonReporter,
  ConfigLoader,
  Logger,
  ScenarioParameters,
  Workflow,
  WorkflowStep,
  SoakTestHarness,
} from './index.js';

const logger = new Logger('CLI');
const HEALTH_CHECK_QUERY = `
  query HealthCheck {
    __typename
  }
`;

interface CLIOptions {
  scenario?: string;
  config?: string;
  size?: string;
  noise?: number;
  seed?: number;
  report?: boolean;
  output?: string;
  baseline?: string;
  candidate?: string;
  workflow?: string;
  soak?: boolean;
  requests?: number;
  targetErrorRate?: number;
  latencySpikeEvery?: number;
  latencySpikeDelay?: number;
  dependencyDownEvery?: number;
  concurrency?: number;
  help?: boolean;
  version?: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--scenario':
      case '-s':
        options.scenario = args[++i];
        break;
      case '--config':
      case '-c':
        options.config = args[++i];
        break;
      case '--size':
        options.size = args[++i];
        break;
      case '--noise':
        options.noise = parseFloat(args[++i]);
        break;
      case '--seed':
        options.seed = parseInt(args[++i], 10);
        break;
      case '--report':
      case '-r':
        options.report = true;
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--baseline':
        options.baseline = args[++i];
        break;
      case '--candidate':
        options.candidate = args[++i];
        break;
      case '--workflow':
      case '-w':
        options.workflow = args[++i];
        break;
      case '--soak':
        options.soak = true;
        break;
      case '--requests':
        options.requests = parseInt(args[++i], 10);
        break;
      case '--target-error-rate':
        options.targetErrorRate = parseFloat(args[++i]);
        break;
      case '--latency-spike-every':
        options.latencySpikeEvery = parseInt(args[++i], 10);
        break;
      case '--latency-spike-delay':
        options.latencySpikeDelay = parseInt(args[++i], 10);
        break;
      case '--dependency-down-every':
        options.dependencyDownEvery = parseInt(args[++i], 10);
        break;
      case '--concurrency':
        options.concurrency = parseInt(args[++i], 10);
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--version':
      case '-v':
        options.version = true;
        break;
      default:
        console.warn(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
IntelGraph Simulation Harness CLI

Usage:
  sim-harness [options]

Options:
  -s, --scenario <type>     Scenario type (fraud-ring, terror-cell, corruption-network,
                            supply-chain, money-laundering, custom)
  -c, --config <file>       Configuration file path (JSON or YAML)
  -w, --workflow <file>     Workflow definition file (JSON or YAML)
  --size <size>             Graph size (small, medium, large, xlarge)
  --noise <level>           Noise level (0-1)
  --seed <number>           Random seed for deterministic generation
  -r, --report              Generate comparison report
  -o, --output <dir>        Output directory for reports
  --baseline <version>      Baseline version for comparison
  --candidate <version>     Candidate version for comparison
  -h, --help                Show this help message
  -v, --version             Show version
  --soak                    Run soak test harness instead of scenario workflow
  --requests <number>       Number of requests to send during soak (default: 500)
  --target-error-rate <n>   Maximum acceptable error rate (0-1) for soak
  --latency-spike-every <n> Inject latency spike every N requests
  --latency-spike-delay <n> Delay in ms applied to latency spike injections (default: 500)
  --dependency-down-every <n> Simulate dependency outage every N requests
  --concurrency <n>           Concurrent workers for soak (default: safety.maxConcurrentSessions)

Examples:
  # Run fraud ring scenario
  sim-harness --scenario fraud-ring --size large

  # Run with custom configuration
  sim-harness --config config/custom.yaml --scenario terror-cell

  # Run with custom workflow
  sim-harness --workflow workflows/investigation.yaml

  # Generate comparison report
  sim-harness --report --baseline v1.0.0 --candidate v1.1.0

  # Run all scenarios and generate report
  sim-harness --scenario all --report --output ./reports

Environment Variables:
  SIM_API_URL              API base URL
  SIM_GRAPHQL_URL          GraphQL endpoint URL
  SIM_GRAPH_SIZE           Default graph size
  SIM_NOISE_LEVEL          Default noise level
  SIM_SEED                 Random seed
  SIM_REPORT_DIR           Report output directory
  SIM_LOG_LEVEL            Log level (debug, info, warn, error)
  `);
}

function showVersion(): void {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
  );
  console.log(`IntelGraph Simulation Harness v${packageJson.version}`);
}

async function runScenario(
  scenarioType: string,
  config: any,
  options: CLIOptions
): Promise<void> {
  logger.info(`Running scenario: ${scenarioType}`);

  // Generate scenario
  const generator = new ScenarioGenerator(options.seed || config.scenarios.seed);
  const params: ScenarioParameters = {
    type: scenarioType as any,
    size: (options.size as any) || config.scenarios.defaultSize,
    noiseLevel: options.noise ?? config.scenarios.defaultNoise,
    missingDataRate: 0.1,
    conflictingEvidenceRate: 0.05,
    seed: options.seed || config.scenarios.seed,
  };

  const scenarioData = await generator.generate(params);
  logger.info(
    `Generated scenario with ${scenarioData.entities.length} entities and ${scenarioData.relationships.length} relationships`
  );

  // Load or create workflow
  let workflow: Workflow;
  if (options.workflow) {
    workflow = loadWorkflowFromFile(options.workflow);
  } else {
    workflow = createDefaultWorkflow(scenarioData);
  }

  // Run ghost analyst
  const analyst = new GhostAnalyst(config);
  const session = await analyst.runWorkflow(workflow, scenarioData);

  logger.info(`Session completed: ${session.id}`);
  logger.info(`Tasks completed: ${session.metrics.tasksCompleted}`);
  logger.info(`Tasks failed: ${session.metrics.tasksFailed}`);
  logger.info(
    `Success rate: ${(session.metrics.successRate * 100).toFixed(2)}%`
  );
  logger.info(`Duration: ${((session.metrics.duration || 0) / 1000).toFixed(2)}s`);
  logger.info(
    `Coverage: ${(session.metrics.coverageRate * 100).toFixed(2)}%`
  );

  // Save metrics
  const metricsCollector = analyst.getMetricsCollector();
  const outputDir = options.output || config.reporting.outputDir;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const metricsFile = path.join(
    outputDir,
    `metrics-${scenarioType}-${Date.now()}.json`
  );
  fs.writeFileSync(metricsFile, metricsCollector.exportToJSON(), 'utf8');
  logger.info(`Metrics saved to: ${metricsFile}`);

  const csvFile = path.join(
    outputDir,
    `metrics-${scenarioType}-${Date.now()}.csv`
  );
  fs.writeFileSync(csvFile, metricsCollector.exportToCSV(), 'utf8');
  logger.info(`CSV exported to: ${csvFile}`);
}

async function runSoakTest(config: any, options: CLIOptions): Promise<void> {
  const requestCount = options.requests || 500;
  const targetErrorRate = options.targetErrorRate ?? 0.01;
  const concurrency = options.concurrency || config.safety.maxConcurrentSessions;

  logger.info(
    `Starting soak test: ${requestCount} requests, target error rate ${(targetErrorRate * 100).toFixed(2)}%`
  );

  const client = axios.create({
    baseURL: config.api.graphqlUrl,
    timeout: config.api.timeout,
    headers: config.api.headers,
    validateStatus: () => true,
  });

  const harness = new SoakTestHarness(client, new Logger('SoakTestHarness')); 

  const result = await harness.run(
    {
      requestCount,
      targetErrorRate,
      concurrency,
      payload: { query: HEALTH_CHECK_QUERY },
      chaos: {
        latencySpikeEvery: options.latencySpikeEvery,
        latencySpikeDelayMs: options.latencySpikeDelay,
        dependencyDownEvery: options.dependencyDownEvery,
      },
    },
    async () => {
      const response = await client.post('', { query: HEALTH_CHECK_QUERY });
      if (response.status >= 400) {
        const error: any = new Error(`Received status ${response.status}`);
        error.response = { status: response.status };
        throw error;
      }
    }
  );

  logger.info(`Soak window: ${result.startTime} -> ${result.endTime}`);
  logger.info(`Success: ${result.successCount}/${result.totalRequests}`);
  logger.info(`Error rate: ${(result.errorRate * 100).toFixed(2)}%`);
  logger.info(
    `Latency (avg/p95/p99): ${result.averageLatency.toFixed(2)}ms/${result.p95Latency.toFixed(2)}ms/${result.p99Latency.toFixed(2)}ms`
  );
  logger.info(
    `Chaos injections - latency spikes: ${result.latencySpikesInjected}, dependency drops: ${result.dependencyDownInjected}`
  );

  if (!result.passed) {
    logger.error(
      `Soak test failed: observed error rate ${(result.errorRate * 100).toFixed(2)}% exceeds target ${(targetErrorRate * 100).toFixed(2)}%`
    );
  }
}

function loadWorkflowFromFile(filepath: string): Workflow {
  if (!fs.existsSync(filepath)) {
    throw new Error(`Workflow file not found: ${filepath}`);
  }

  const content = fs.readFileSync(filepath, 'utf8');
  const ext = path.extname(filepath).toLowerCase();

  if (ext === '.json') {
    return JSON.parse(content);
  } else if (ext === '.yaml' || ext === '.yml') {
    const yaml = require('js-yaml');
    return yaml.load(content) as Workflow;
  } else {
    throw new Error(`Unsupported workflow file format: ${ext}`);
  }
}

function createDefaultWorkflow(scenarioData: any): Workflow {
  const steps: WorkflowStep[] = [
    {
      type: 'CREATE_INVESTIGATION',
      params: {},
    },
  ];

  // Add entities
  for (let i = 0; i < scenarioData.entities.length; i++) {
    steps.push({
      type: 'ADD_ENTITY',
      params: { entityIndex: i },
    });
  }

  // Add relationships
  for (let i = 0; i < scenarioData.relationships.length; i++) {
    steps.push({
      type: 'ADD_RELATIONSHIP',
      params: { relationshipIndex: i },
    });
  }

  // Query and analyze
  steps.push(
    {
      type: 'QUERY_ENTITIES',
      params: {},
    },
    {
      type: 'QUERY_RELATIONSHIPS',
      params: {},
    },
    {
      type: 'RUN_COPILOT',
      params: {},
    },
    {
      type: 'EXPORT_DATA',
      params: {},
    }
  );

  return {
    name: 'Default Investigation Workflow',
    description: 'Standard workflow for testing investigation features',
    steps,
    strategy: 'systematic',
  };
}

async function generateComparisonReport(options: CLIOptions, config: any): Promise<void> {
  logger.info('Generating comparison report...');

  if (!options.baseline || !options.candidate) {
    throw new Error('Both --baseline and --candidate are required for comparison');
  }

  const outputDir = options.output || config.reporting.outputDir;

  // Load baseline and candidate metrics
  const baselineFile = path.join(outputDir, `metrics-${options.baseline}.json`);
  const candidateFile = path.join(outputDir, `metrics-${options.candidate}.json`);

  if (!fs.existsSync(baselineFile)) {
    throw new Error(`Baseline metrics not found: ${baselineFile}`);
  }

  if (!fs.existsSync(candidateFile)) {
    throw new Error(`Candidate metrics not found: ${candidateFile}`);
  }

  const baselineData = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
  const candidateData = JSON.parse(fs.readFileSync(candidateFile, 'utf8'));

  const reporter = new ComparisonReporter();
  const report = reporter.generateComparison(
    {
      version: options.baseline,
      metrics: baselineData.completedSessions || [],
    },
    {
      version: options.candidate,
      metrics: candidateData.completedSessions || [],
    }
  );

  // Save report
  const reportPath = await reporter.saveReport(
    report,
    outputDir,
    config.reporting.format
  );

  logger.info(`Comparison report generated: ${reportPath}`);

  // Print summary
  console.log('\n=== Comparison Summary ===');
  console.log(`Baseline: ${options.baseline}`);
  console.log(`Candidate: ${options.candidate}`);
  console.log(
    `Success Rate Change: ${(report.comparison.successRateDelta * 100).toFixed(2)}%`
  );
  console.log(
    `Performance Change: ${report.comparison.performanceDelta.toFixed(2)}%`
  );
  console.log(
    `Quality Change: ${(report.comparison.qualityDelta * 100).toFixed(2)}%`
  );

  if (report.comparison.regressions.length > 0) {
    console.log('\n⚠️ Regressions Detected:');
    report.comparison.regressions.forEach((r) => console.log(`  - ${r}`));
  }

  if (report.comparison.improvements.length > 0) {
    console.log('\n✅ Improvements:');
    report.comparison.improvements.forEach((i) => console.log(`  - ${i}`));
  }
}

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  if (options.version) {
    showVersion();
    process.exit(0);
  }

  try {
    // Load configuration
    let config;
    if (options.config) {
      config = ConfigLoader.loadFromFile(options.config);
    } else {
      config = ConfigLoader.loadFromEnv();
    }

    ConfigLoader.validate(config);

    // Handle comparison report
    if (options.report && options.baseline && options.candidate) {
      await generateComparisonReport(options, config);
      return;
    }

    if (options.soak) {
      await runSoakTest(config, options);
      return;
    }

    // Handle scenario execution
    if (!options.scenario) {
      throw new Error('--scenario is required. Use --help for usage information.');
    }

    if (options.scenario === 'all') {
      const scenarios = [
        'fraud-ring',
        'terror-cell',
        'corruption-network',
        'supply-chain',
        'money-laundering',
      ];
      for (const scenario of scenarios) {
        await runScenario(scenario, config, options);
      }
    } else {
      await runScenario(options.scenario, config, options);
    }

    logger.info('Simulation harness completed successfully');
    process.exit(0);
  } catch (error: any) {
    logger.error('Simulation harness failed:', error);
    console.error(error.message);
    process.exit(1);
  }
}

// Run CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
