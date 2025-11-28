#!/usr/bin/env node
/**
 * CLI tool for running scenario evaluations
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { ScenarioGenerator, getBuiltInTemplates } from './generator/ScenarioGenerator.js';
import { GhostAnalyst } from './analyst/GhostAnalyst.js';
import { MetricsCollector } from './metrics/MetricsCollector.js';
import { HtmlReporter } from './metrics/reporters/HtmlReporter.js';
import { JsonReporter } from './metrics/reporters/JsonReporter.js';
import { CsvReporter } from './metrics/reporters/CsvReporter.js';
import type { HarnessConfig, WorkflowScript, GeneratedScenario } from './types/index.js';
import { parse as parseYaml } from 'yaml';

const program = new Command();

program
  .name('sim-harness')
  .description('IntelGraph Scenario Simulation and Evaluation Harness')
  .version('0.1.0');

program
  .command('run')
  .description('Run scenario evaluation')
  .option('-s, --scenario <name>', 'Scenario template name or path to YAML file')
  .option('-w, --workflow <path>', 'Path to workflow YAML file')
  .option('--api-url <url>', 'API URL', process.env.API_URL || 'http://localhost:4000/graphql')
  .option('--tenant-id <id>', 'Tenant ID', process.env.TENANT_ID || 'test-harness-001')
  .option('--token <token>', 'API token', process.env.API_TOKEN)
  .option('--seed <number>', 'Random seed', '42')
  .option('--size <size>', 'Scenario size (small, medium, large)', 'medium')
  .option('--output <path>', 'Output directory', './reports')
  .option('--format <format>', 'Report format (json, html, csv, all)', 'html')
  .option('--verbose', 'Verbose output', false)
  .option('--sessions <count>', 'Number of sessions to run', '1')
  .action(async (options) => {
    try {
      console.log('🚀 IntelGraph Simulation Harness');
      console.log('================================\n');

      // Load configuration
      const config = loadConfig(options);

      // Generate scenario
      console.log('📊 Generating scenario...');
      const scenario = await generateScenario(options);
      console.log(`✓ Generated scenario: ${scenario.name}`);
      console.log(`  - Entities: ${scenario.entities.length}`);
      console.log(`  - Relationships: ${scenario.relationships.length}`);
      console.log(`  - Signals: ${scenario.signals.length}\n`);

      // Save scenario data
      const scenarioPath = resolve(options.output, `${scenario.id}-data.json`);
      ensureDir(dirname(scenarioPath));
      writeFileSync(scenarioPath, JSON.stringify(scenario, null, 2));
      console.log(`✓ Saved scenario data: ${scenarioPath}\n`);

      // Load workflow
      console.log('📝 Loading workflow...');
      const workflow = loadWorkflow(options.workflow);
      console.log(`✓ Loaded workflow: ${workflow.name}\n`);

      // Initialize metrics collector
      const collector = new MetricsCollector();
      collector.setScenario(scenario);

      // Run sessions
      const sessionCount = parseInt(options.sessions, 10);
      console.log(`🏃 Running ${sessionCount} session(s)...\n`);

      for (let i = 0; i < sessionCount; i++) {
        console.log(`Session ${i + 1}/${sessionCount}:`);

        const analyst = new GhostAnalyst({
          apiUrl: config.api.url,
          token: config.api.token,
          tenantId: config.api.tenantId,
          script: workflow,
          timeout: config.api.timeout,
          verbose: options.verbose,
        });

        const session = await analyst.run({
          scenarioId: scenario.id,
          scenario,
        });

        collector.addSession(session);

        console.log(`  Status: ${session.status}`);
        console.log(`  Duration: ${(session.metrics.totalDuration / 1000).toFixed(2)}s`);
        console.log(`  Queries: ${session.metrics.queriesIssued}`);
        console.log(`  Errors: ${session.metrics.errorCount}\n`);
      }

      // Generate reports
      console.log('📈 Generating reports...\n');
      const report = await collector.generateReport();

      const formats = options.format === 'all'
        ? ['json', 'html', 'csv']
        : [options.format];

      for (const format of formats) {
        const reportPath = resolve(options.output, `${scenario.id}-report.${format}`);
        const content = generateReport(report, format as any);
        writeFileSync(reportPath, content);
        console.log(`✓ ${format.toUpperCase()} report: ${reportPath}`);
      }

      // Summary
      console.log('\n📊 Summary:');
      console.log(`  Success Rate: ${(report.aggregateMetrics.reliability.successRate * 100).toFixed(1)}%`);
      console.log(`  Avg Duration: ${(report.aggregateMetrics.performance.avgDuration / 1000).toFixed(2)}s`);
      console.log(`  Entities Found: ${(report.aggregateMetrics.correctness.entitiesFoundRate * 100).toFixed(1)}%`);

      if (report.aggregateMetrics.reliability.successRate < 1.0) {
        console.log('\n⚠️  Some sessions failed. Check the report for details.');
        process.exit(1);
      } else {
        console.log('\n✅ All sessions completed successfully!');
        process.exit(0);
      }
    } catch (error) {
      console.error('\n❌ Error:', (error as Error).message);
      if (options.verbose) {
        console.error((error as Error).stack);
      }
      process.exit(1);
    }
  });

program
  .command('list-scenarios')
  .description('List available built-in scenarios')
  .action(() => {
    console.log('Built-in Scenarios:\n');
    const templates = getBuiltInTemplates();
    for (const template of templates) {
      console.log(`  ${template.name}`);
      console.log(`    Type: ${template.type}`);
      console.log(`    Description: ${template.description}`);
      console.log(`    Entities: ${template.entities.reduce((sum, e) => sum + e.distribution.count, 0)}`);
      console.log('');
    }
  });

program
  .command('generate')
  .description('Generate scenario data without running evaluation')
  .option('-s, --scenario <name>', 'Scenario template name or path', 'fraud-ring')
  .option('--seed <number>', 'Random seed', '42')
  .option('--output <path>', 'Output file', './scenario.json')
  .action(async (options) => {
    try {
      console.log('📊 Generating scenario...');
      const scenario = await generateScenario(options);

      ensureDir(dirname(resolve(options.output)));
      writeFileSync(options.output, JSON.stringify(scenario, null, 2));

      console.log(`✓ Saved: ${options.output}`);
      console.log(`  - ID: ${scenario.id}`);
      console.log(`  - Name: ${scenario.name}`);
      console.log(`  - Entities: ${scenario.entities.length}`);
      console.log(`  - Relationships: ${scenario.relationships.length}`);
    } catch (error) {
      console.error('❌ Error:', (error as Error).message);
      process.exit(1);
    }
  });

/**
 * Load configuration from options
 */
function loadConfig(options: any): HarnessConfig {
  return {
    api: {
      url: options.apiUrl,
      token: options.token,
      tenantId: options.tenantId,
      timeout: 30000,
      maxRetries: 3,
    },
    execution: {
      deterministic: true,
      defaultSeed: parseInt(options.seed, 10),
      cleanupAfter: false,
      parallelSessions: 1,
    },
    reporting: {
      outputDir: options.output,
      formats: [options.format],
      verbose: options.verbose,
    },
    safety: {
      requireTestPrefix: true,
      blockProductionUrls: true,
      maxDataSize: 10000,
    },
  };
}

/**
 * Generate scenario from template
 */
async function generateScenario(options: any): Promise<GeneratedScenario> {
  let template: any;

  // Check if it's a file path
  if (options.scenario && existsSync(options.scenario)) {
    const content = readFileSync(options.scenario, 'utf-8');
    template = parseYaml(content);
  } else {
    // Use built-in template
    template = options.scenario || 'fraud-ring';
  }

  // Apply size modifiers
  const sizeMultipliers: Record<string, number> = {
    small: 0.5,
    medium: 1.0,
    large: 2.0,
  };
  const multiplier = sizeMultipliers[options.size] || 1.0;

  const generator = new ScenarioGenerator({
    template,
    params: {
      seed: parseInt(options.seed, 10),
      nodeCount: typeof template === 'string' ? undefined : Math.floor((template.params?.nodeCount || 50) * multiplier),
    },
  });

  return await generator.generate();
}

/**
 * Load workflow from file
 */
function loadWorkflow(path?: string): WorkflowScript {
  if (!path) {
    // Return default basic workflow
    return {
      name: 'basic-workflow',
      description: 'Basic investigation workflow',
      steps: [
        {
          name: 'health-check',
          action: 'graphql-query',
          query: 'query { __typename }',
        },
      ],
    };
  }

  const content = readFileSync(path, 'utf-8');
  return parseYaml(content);
}

/**
 * Generate report in specified format
 */
function generateReport(report: any, format: 'json' | 'html' | 'csv'): string {
  switch (format) {
    case 'json':
      return new JsonReporter().generate(report);
    case 'html':
      return new HtmlReporter().generate(report);
    case 'csv':
      return new CsvReporter().generate(report);
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

/**
 * Ensure directory exists
 */
function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// Run CLI
program.parse();
