#!/usr/bin/env tsx
"use strict";
/**
 * Plan Eval Platform CLI
 *
 * Command-line interface for running evaluations, benchmarks, and safety tests.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const node_util_1 = require("node:util");
const node_path_1 = require("node:path");
const runner_js_1 = require("./runner.js");
const scenario_loader_js_1 = require("./scenario-loader.js");
const metrics_js_1 = require("./metrics.js");
const index_js_1 = require("../routing/index.js");
const base_router_js_1 = require("../routing/base-router.js");
const checker_js_1 = require("../safety/checker.js");
const red_team_js_1 = require("../safety/red-team.js");
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
function parseArguments() {
    const { values, positionals } = (0, node_util_1.parseArgs)({
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
        scenarios: values.scenarios,
        output: values.output,
        router: values.router,
        costWeight: parseFloat(values['cost-weight']),
        dryRun: values['dry-run'],
        verbose: values.verbose,
        category: values.category,
        format: values.format,
    };
}
async function runCommand(options) {
    const scenariosPath = (0, node_path_1.join)(process.cwd(), options.scenarios);
    const loader = new scenario_loader_js_1.ScenarioLoader(scenariosPath);
    if (options.verbose) {
        console.log(`Loading scenarios from: ${scenariosPath}`);
    }
    // Load scenarios
    let scenarios;
    if (options.category) {
        scenarios = loader.loadByCategory(options.category);
    }
    else {
        scenarios = loader.loadAll();
    }
    if (scenarios.length === 0) {
        console.log('No scenarios found.');
        return;
    }
    console.log(`Found ${scenarios.length} scenarios`);
    // Create runner
    const runner = new runner_js_1.EvalRunner({
        scenariosPath,
        outputPath: options.output,
        routingConfig: {
            type: options.router,
            costWeight: options.costWeight,
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
        dryRun: options.dryRun,
    });
    // Set up router
    const router = (0, index_js_1.createRouter)(options.router, { costWeight: options.costWeight });
    runner.setRouter(async (step, scenario) => {
        const candidates = (0, base_router_js_1.createCandidatesFromScenario)(scenario, step);
        const decision = await router.route(step, candidates);
        return {
            tool: decision.selectedTool,
            score: decision.score,
            reasoning: decision.reasoning,
        };
    });
    // Set up safety checker
    const checker = new checker_js_1.SafetyChecker();
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
        ? await runner.runByCategory(options.category)
        : await runner.runAll();
    const duration = Date.now() - startTime;
    // Collect metrics
    const collector = new metrics_js_1.MetricsCollector();
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
    }
    else {
        console.log(collector.generateSummary());
        console.log(`\nCompleted in ${(duration / 1000).toFixed(1)}s`);
        console.log(`Traces written to: ${options.output}`);
    }
    await runner.close();
}
async function listCommand(options) {
    const scenariosPath = (0, node_path_1.join)(process.cwd(), options.scenarios);
    const loader = new scenario_loader_js_1.ScenarioLoader(scenariosPath);
    let scenarios;
    if (options.category) {
        scenarios = loader.loadByCategory(options.category);
    }
    else {
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
    }
    else {
        console.log(`\nAvailable Scenarios (${scenarios.length}):\n`);
        console.log('ID'.padEnd(30) + 'Category'.padEnd(20) + 'Difficulty'.padEnd(12) + 'Name');
        console.log('-'.repeat(80));
        for (const s of scenarios) {
            console.log(s.id.padEnd(30) +
                s.category.padEnd(20) +
                (s.difficulty ?? 'N/A').padEnd(12) +
                s.name);
        }
    }
}
async function safetyCommand(options) {
    console.log('Running safety/red-team tests...\n');
    const runner = new red_team_js_1.RedTeamRunner();
    const results = await runner.runAll();
    if (options.format === 'json') {
        console.log(JSON.stringify({
            total: results.total,
            passed: results.passed,
            failed: results.failed,
            falsePositives: results.falsePositives,
            falseNegatives: results.falseNegatives,
        }, null, 2));
    }
    else {
        console.log(runner.generateReport());
    }
}
async function benchmarkCommand(options) {
    console.log('Generating benchmark report...\n');
    console.log('Run with: tsx benchmark/generate-report.ts');
    console.log(`Input: ${options.output}`);
}
async function main() {
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
    }
    catch (error) {
        console.error('Error:', error.message);
        if (options.verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}
main();
