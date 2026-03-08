#!/usr/bin/env node
"use strict";
/**
 * CLI tool for running scenario evaluations
 */
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs_1 = require("fs");
const path_1 = require("path");
const ScenarioGenerator_js_1 = require("./generator/ScenarioGenerator.js");
const GhostAnalyst_js_1 = require("./analyst/GhostAnalyst.js");
const MetricsCollector_js_1 = require("./metrics/MetricsCollector.js");
const HtmlReporter_js_1 = require("./metrics/reporters/HtmlReporter.js");
const JsonReporter_js_1 = require("./metrics/reporters/JsonReporter.js");
const CsvReporter_js_1 = require("./metrics/reporters/CsvReporter.js");
const yaml_1 = require("yaml");
const program = new commander_1.Command();
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
        const scenarioPath = (0, path_1.resolve)(options.output, `${scenario.id}-data.json`);
        ensureDir((0, path_1.dirname)(scenarioPath));
        (0, fs_1.writeFileSync)(scenarioPath, JSON.stringify(scenario, null, 2));
        console.log(`✓ Saved scenario data: ${scenarioPath}\n`);
        // Load workflow
        console.log('📝 Loading workflow...');
        const workflow = loadWorkflow(options.workflow);
        console.log(`✓ Loaded workflow: ${workflow.name}\n`);
        // Initialize metrics collector
        const collector = new MetricsCollector_js_1.MetricsCollector();
        collector.setScenario(scenario);
        // Run sessions
        const sessionCount = parseInt(options.sessions, 10);
        console.log(`🏃 Running ${sessionCount} session(s)...\n`);
        for (let i = 0; i < sessionCount; i++) {
            console.log(`Session ${i + 1}/${sessionCount}:`);
            const analyst = new GhostAnalyst_js_1.GhostAnalyst({
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
            const reportPath = (0, path_1.resolve)(options.output, `${scenario.id}-report.${format}`);
            const content = generateReport(report, format);
            (0, fs_1.writeFileSync)(reportPath, content);
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
        }
        else {
            console.log('\n✅ All sessions completed successfully!');
            process.exit(0);
        }
    }
    catch (error) {
        console.error('\n❌ Error:', error.message);
        if (options.verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
});
program
    .command('list-scenarios')
    .description('List available built-in scenarios')
    .action(() => {
    console.log('Built-in Scenarios:\n');
    const templates = (0, ScenarioGenerator_js_1.getBuiltInTemplates)();
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
        ensureDir((0, path_1.dirname)((0, path_1.resolve)(options.output)));
        (0, fs_1.writeFileSync)(options.output, JSON.stringify(scenario, null, 2));
        console.log(`✓ Saved: ${options.output}`);
        console.log(`  - ID: ${scenario.id}`);
        console.log(`  - Name: ${scenario.name}`);
        console.log(`  - Entities: ${scenario.entities.length}`);
        console.log(`  - Relationships: ${scenario.relationships.length}`);
    }
    catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
});
/**
 * Load configuration from options
 */
function loadConfig(options) {
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
async function generateScenario(options) {
    let template;
    // Check if it's a file path
    if (options.scenario && (0, fs_1.existsSync)(options.scenario)) {
        const content = (0, fs_1.readFileSync)(options.scenario, 'utf-8');
        template = (0, yaml_1.parse)(content);
    }
    else {
        // Use built-in template
        template = options.scenario || 'fraud-ring';
    }
    // Apply size modifiers
    const sizeMultipliers = {
        small: 0.5,
        medium: 1.0,
        large: 2.0,
    };
    const multiplier = sizeMultipliers[options.size] || 1.0;
    const generator = new ScenarioGenerator_js_1.ScenarioGenerator({
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
function loadWorkflow(path) {
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
    const content = (0, fs_1.readFileSync)(path, 'utf-8');
    return (0, yaml_1.parse)(content);
}
/**
 * Generate report in specified format
 */
function generateReport(report, format) {
    switch (format) {
        case 'json':
            return new JsonReporter_js_1.JsonReporter().generate(report);
        case 'html':
            return new HtmlReporter_js_1.HtmlReporter().generate(report);
        case 'csv':
            return new CsvReporter_js_1.CsvReporter().generate(report);
        default:
            throw new Error(`Unknown format: ${format}`);
    }
}
/**
 * Ensure directory exists
 */
function ensureDir(dir) {
    if (!(0, fs_1.existsSync)(dir)) {
        (0, fs_1.mkdirSync)(dir, { recursive: true });
    }
}
// Run CLI
program.parse();
