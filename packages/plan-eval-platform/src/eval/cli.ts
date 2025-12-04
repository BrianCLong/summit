#!/usr/bin/env tsx
/**
 * Plan Eval Platform CLI
 *
 * Command-line interface for running evaluations, benchmarks, and safety tests.
 */

import { parseArgs } from 'node:util';
import { join } from 'node:path';
import { EvalRunner } from './runner.js';
import { ScenarioLoader } from './scenario-loader.js';
import { MetricsCollector } from './metrics.js';
import { createRouter } from '../routing/index.js';
import { createCandidatesFromScenario } from '../routing/base-router.js';
import { SafetyChecker } from '../safety/checker.js';
import { RedTeamRunner } from '../safety/red-team.js';
import type { RouterType, Scenario, ScenarioStep } from '../types.js';

interface CLIOptions {
  command: string;
  scenarios?: string;
  output?: string;
  router?: RouterType;
  costWeight?: number;
  dryRun?: boolean;
  verbose?: boolean;
  category?: string;
  format?: string;
}

const HELP = `
Plan Eval Platform CLI

Usage: tsx cli.ts <command> [options]

Commands:
  run           Run evaluation scenarios
  list          List available scenarios
  benchmark     Generate benchmark report
  safety        Run safety/red-team tests
  help          Show this help message

Options:
  --scenarios, -s <path>   Path to scenarios directory (default: ./scenarios)
  --output, -o <path>      Output path for traces (default: ./experiments/traces.jsonl)
  --router, -r <type>      Router type: random, greedy_cost, adaptive (default: greedy_cost)
  --cost-weight, -c <n>    Cost weight 0-1 (default: 0.5)
  --dry-run, -d            Run without executing tools
  --verbose, -v            Verbose output
  --category <cat>         Filter scenarios by category
  --format, -f <fmt>       Output format: text, json (default: text)

Examples:
  tsx cli.ts run --scenarios ./scenarios --router greedy_cost
  tsx cli.ts list --category code_correction
  tsx cli.ts safety --verbose
  tsx cli.ts benchmark --output ./benchmark/report.md
`;

function parseArguments(): CLIOptions {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      scenarios: { type: 'string', short: 's', default: './scenarios' },
      output: { type: 'string', short: 'o', default: './experiments/traces.jsonl' },
      router: { type: 'string', short: 'r', default: 'greedy_cost' },
      'cost-weight': { type: 'string', short: 'c', default: '0.5' },
      'dry-run': { type: 'boolean', short: 'd', default: false },
      verbose: { type: 'boolean', short: 'v', default: false },
      category: { type: 'string' },
      format: { type: 'string', short: 'f', default: 'text' },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    console.log(HELP);
    process.exit(0);
  }

  return {
    command: positionals[0],
    scenarios: values.scenarios as string,
    output: values.output as string,
    router: values.router as RouterType,
    costWeight: parseFloat(values['cost-weight'] as string),
    dryRun: values['dry-run'] as boolean,
    verbose: values.verbose as boolean,
    category: values.category as string | undefined,
    format: values.format as string,
  };
}

async function runCommand(options: CLIOptions): Promise<void> {
  const scenariosPath = join(process.cwd(), options.scenarios!);
  const loader = new ScenarioLoader(scenariosPath);

  if (options.verbose) {
    console.log(`Loading scenarios from: ${scenariosPath}`);
  }

  // Load scenarios
  let scenarios: Scenario[];
  if (options.category) {
    scenarios = loader.loadByCategory(options.category as Scenario['category']);
  } else {
    scenarios = loader.loadAll();
  }

  if (scenarios.length === 0) {
    console.log('No scenarios found.');
    return;
  }

  console.log(`Found ${scenarios.length} scenarios`);

  // Create runner
  const runner = new EvalRunner({
    scenariosPath,
    outputPath: options.output!,
    routingConfig: {
      type: options.router!,
      costWeight: options.costWeight!,
      latencyBudgetMs: 10000,
      fallbackEnabled: true,
    },
    safetyConfig: {
      enabledChecks: ['jailbreak_detection', 'pii_detection', 'harmful_content', 'injection_attack'],
      blockOnViolation: true,
      logViolations: true,
    },
    maxConcurrency: 4,
    timeoutMs: 60000,
    dryRun: options.dryRun!,
  });

  // Set up router
  const router = createRouter(options.router!, { costWeight: options.costWeight });
  runner.setRouter(async (step: ScenarioStep, scenario: Scenario) => {
    const candidates = createCandidatesFromScenario(scenario, step);
    const decision = await router.route(step, candidates);
    return {
      tool: decision.selectedTool,
      score: decision.score,
      reasoning: decision.reasoning,
    };
  });

  // Set up safety checker
  const checker = new SafetyChecker();
  runner.setSafetyChecker(async (input) => {
    const result = await checker.checkInput(input);
    return {
      passed: result.passed,
      violations: result.violations,
    };
  });

  // Run scenarios
  console.log('\nRunning evaluations...\n');
  const startTime = Date.now();

  const results = options.category
    ? await runner.runByCategory(options.category as Scenario['category'])
    : await runner.runAll();

  const duration = Date.now() - startTime;

  // Collect metrics
  const collector = new MetricsCollector();
  collector.addResults(results);

  // Output results
  if (options.format === 'json') {
    console.log(JSON.stringify({
      scenarios: results.length,
      duration,
      metrics: collector.computeMetrics(),
      results: results.map((r) => ({
        scenarioId: r.scenarioId,
        success: r.success,
        errors: r.errors,
      })),
    }, null, 2));
  } else {
    console.log(collector.generateSummary());
    console.log(`\nCompleted in ${(duration / 1000).toFixed(1)}s`);
    console.log(`Traces written to: ${options.output}`);
  }

  await runner.close();
}

async function listCommand(options: CLIOptions): Promise<void> {
  const scenariosPath = join(process.cwd(), options.scenarios!);
  const loader = new ScenarioLoader(scenariosPath);

  let scenarios: Scenario[];
  if (options.category) {
    scenarios = loader.loadByCategory(options.category as Scenario['category']);
  } else {
    scenarios = loader.loadAll();
  }

  if (options.format === 'json') {
    console.log(JSON.stringify(scenarios.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      difficulty: s.difficulty,
      steps: s.steps.length,
      tools: s.tools.map((t) => t.name),
    })), null, 2));
  } else {
    console.log(`\nAvailable Scenarios (${scenarios.length}):\n`);
    console.log('ID'.padEnd(30) + 'Category'.padEnd(20) + 'Difficulty'.padEnd(12) + 'Name');
    console.log('-'.repeat(80));

    for (const s of scenarios) {
      console.log(
        s.id.padEnd(30) +
        s.category.padEnd(20) +
        (s.difficulty ?? 'N/A').padEnd(12) +
        s.name,
      );
    }
  }
}

async function safetyCommand(options: CLIOptions): Promise<void> {
  console.log('Running safety/red-team tests...\n');

  const runner = new RedTeamRunner();
  const results = await runner.runAll();

  if (options.format === 'json') {
    console.log(JSON.stringify({
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      falsePositives: results.falsePositives,
      falseNegatives: results.falseNegatives,
    }, null, 2));
  } else {
    console.log(runner.generateReport());
  }
}

async function benchmarkCommand(options: CLIOptions): Promise<void> {
  console.log('Generating benchmark report...\n');
  console.log('Run with: tsx benchmark/generate-report.ts');
  console.log(`Input: ${options.output}`);
}

async function main(): Promise<void> {
  const options = parseArguments();

  try {
    switch (options.command) {
      case 'run':
        await runCommand(options);
        break;
      case 'list':
        await listCommand(options);
        break;
      case 'safety':
        await safetyCommand(options);
        break;
      case 'benchmark':
        await benchmarkCommand(options);
        break;
      case 'help':
        console.log(HELP);
        break;
      default:
        console.error(`Unknown command: ${options.command}`);
        console.log(HELP);
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', (error as Error).message);
    if (options.verbose) {
      console.error((error as Error).stack);
    }
    process.exit(1);
  }
}

main();
