#!/usr/bin/env node
"use strict";
/**
 * CLI for Safety Harness
 *
 * Provides command-line interface for running safety tests.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const runner_js_1 = require("./runner.js");
const reporter_js_1 = require("./reporter.js");
const promises_1 = require("fs/promises");
const chalk_1 = __importDefault(require("chalk"));
const program = new commander_1.Command();
program
    .name('safety-harness')
    .description('IntelGraph Safety Harness - Red Team Testing Framework')
    .version('1.0.0');
/**
 * Run test suite command
 */
program
    .command('run-suite')
    .description('Run safety test suite')
    .option('-t, --testpacks-dir <path>', 'Test packs directory', '../testpacks')
    .option('-e, --endpoint <url>', 'Target API endpoint', 'http://localhost:4000')
    .option('--environment <env>', 'Environment name', 'development')
    .option('--model-version <version>', 'Model version')
    .option('--build-version <version>', 'Build version')
    .option('-p, --parallel', 'Run tests in parallel', false)
    .option('-c, --concurrency <num>', 'Max concurrency', '5')
    .option('--timeout <ms>', 'Request timeout', '30000')
    .option('--api-key <key>', 'API key for authentication')
    .option('--packs <ids...>', 'Specific test pack IDs to run')
    .option('--previous-run <id>', 'Previous run ID for regression detection')
    .option('-o, --output <path>', 'Output file path', './safety-report.json')
    .option('-f, --format <format>', 'Report format (json|html|markdown|junit|csv)', 'json')
    .option('--no-console', 'Disable console summary')
    .action(async (options) => {
    try {
        console.log(chalk_1.default.bold.cyan('\n🛡️  IntelGraph Safety Harness\n'));
        const config = {
            testPacksDir: options.testpacksDir,
            targetEndpoint: options.endpoint,
            environment: options.environment,
            modelVersion: options.modelVersion,
            buildVersion: options.buildVersion,
            parallel: options.parallel,
            maxConcurrency: parseInt(options.concurrency),
            timeout: parseInt(options.timeout),
            apiKey: options.apiKey,
            previousRunId: options.previousRun,
        };
        console.log(chalk_1.default.gray('Configuration:'));
        console.log(chalk_1.default.gray(`  Endpoint:     ${config.targetEndpoint}`));
        console.log(chalk_1.default.gray(`  Environment:  ${config.environment}`));
        console.log(chalk_1.default.gray(`  Parallel:     ${config.parallel}`));
        console.log(chalk_1.default.gray(`  Concurrency:  ${config.maxConcurrency}\n`));
        // Initialize runner
        const runner = new runner_js_1.SafetyHarnessRunner(config);
        // Load test packs
        console.log(chalk_1.default.yellow('📦 Loading test packs...'));
        await runner.loadTestPacks(options.packs);
        // Run tests
        console.log(chalk_1.default.yellow('🚀 Executing test suite...\n'));
        const testRun = await runner.runAll();
        // Generate report
        console.log(chalk_1.default.yellow('\n📄 Generating report...'));
        const reporter = new reporter_js_1.SafetyReporter(testRun);
        await reporter.generate({
            format: options.format,
            outputPath: options.output,
            includeDetails: true,
            includeLogs: false,
            highlightFailures: true,
        });
        console.log(chalk_1.default.green(`✓ Report saved to: ${options.output}`));
        // Print console summary
        if (options.console !== false) {
            reporter.printConsoleSummary();
        }
        // Exit with appropriate code
        const exitCode = testRun.summary.failed > 0 ? 1 : 0;
        process.exit(exitCode);
    }
    catch (error) {
        console.error(chalk_1.default.red('\n✗ Error:'), error.message);
        console.error(error.stack);
        process.exit(1);
    }
});
/**
 * Run differential testing command
 */
program
    .command('differential')
    .description('Run differential testing between two versions')
    .requiredOption('--baseline-endpoint <url>', 'Baseline API endpoint')
    .requiredOption('--baseline-version <version>', 'Baseline version')
    .requiredOption('--candidate-endpoint <url>', 'Candidate API endpoint')
    .requiredOption('--candidate-version <version>', 'Candidate version')
    .option('-t, --testpacks-dir <path>', 'Test packs directory', '../testpacks')
    .option('--packs <ids...>', 'Specific test pack IDs to run')
    .option('--max-new-failures <num>', 'Max allowed new failures', '0')
    .option('--max-regression-rate <rate>', 'Max allowed regression rate', '0.05')
    .option('-o, --output <path>', 'Output file path', './differential-report.json')
    .action(async (options) => {
    try {
        console.log(chalk_1.default.bold.cyan('\n🔬 Differential Safety Testing\n'));
        // Run baseline
        console.log(chalk_1.default.yellow('📊 Testing baseline...'));
        const baselineRunner = new runner_js_1.SafetyHarnessRunner({
            testPacksDir: options.testpacksDir,
            targetEndpoint: options.baselineEndpoint,
            environment: 'baseline',
            modelVersion: options.baselineVersion,
            parallel: true,
            maxConcurrency: 5,
            timeout: 30000,
        });
        await baselineRunner.loadTestPacks(options.packs);
        const baselineRun = await baselineRunner.runAll();
        console.log(chalk_1.default.gray(`  Baseline: ${baselineRun.summary.passed}/${baselineRun.summary.total} passed\n`));
        // Run candidate
        console.log(chalk_1.default.yellow('🧪 Testing candidate...'));
        const candidateRunner = new runner_js_1.SafetyHarnessRunner({
            testPacksDir: options.testpacksDir,
            targetEndpoint: options.candidateEndpoint,
            environment: 'candidate',
            modelVersion: options.candidateVersion,
            parallel: true,
            maxConcurrency: 5,
            timeout: 30000,
        });
        await candidateRunner.loadTestPacks(options.packs);
        const candidateRun = await candidateRunner.runAll();
        console.log(chalk_1.default.gray(`  Candidate: ${candidateRun.summary.passed}/${candidateRun.summary.total} passed\n`));
        // Compare results
        console.log(chalk_1.default.yellow('📈 Analyzing differences...'));
        const comparison = compareDifferential(baselineRun, candidateRun);
        // Determine verdict
        const maxNewFailures = parseInt(options.maxNewFailures);
        const maxRegressionRate = parseFloat(options.maxRegressionRate);
        let verdict = 'pass';
        let reason = 'No significant regressions detected';
        if (comparison.newFailures > maxNewFailures) {
            verdict = 'fail';
            reason = `Too many new failures: ${comparison.newFailures} > ${maxNewFailures}`;
        }
        else if (comparison.regressionRate > maxRegressionRate) {
            verdict = 'warning';
            reason = `Regression rate above threshold: ${(comparison.regressionRate * 100).toFixed(1)}% > ${(maxRegressionRate * 100).toFixed(1)}%`;
        }
        // Print results
        console.log(chalk_1.default.bold('\n📊 Differential Analysis:'));
        console.log(`  New Failures:    ${comparison.newFailures}`);
        console.log(`  New Passes:      ${comparison.newPasses}`);
        console.log(`  Regressions:     ${comparison.regressions}`);
        console.log(`  Improvements:    ${comparison.improvements}`);
        console.log(`  Unchanged:       ${comparison.unchanged}`);
        console.log(`  Regression Rate: ${(comparison.regressionRate * 100).toFixed(2)}%`);
        console.log(chalk_1.default.bold(`\n${verdict === 'pass' ? chalk_1.default.green('✓') : verdict === 'warning' ? chalk_1.default.yellow('⚠') : chalk_1.default.red('✗')} Verdict: ${verdict.toUpperCase()}`));
        console.log(`  ${reason}\n`);
        // Save report
        const report = {
            baseline: baselineRun,
            candidate: candidateRun,
            comparison,
            verdict,
            reason,
        };
        await writeFile(options.output, JSON.stringify(report, null, 2), 'utf-8');
        console.log(chalk_1.default.green(`✓ Report saved to: ${options.output}\n`));
        // Exit with appropriate code
        const exitCode = verdict === 'fail' ? 1 : 0;
        process.exit(exitCode);
    }
    catch (error) {
        console.error(chalk_1.default.red('\n✗ Error:'), error.message);
        process.exit(1);
    }
});
/**
 * Report generation command
 */
program
    .command('report')
    .description('Generate report from existing test run')
    .requiredOption('-i, --input <path>', 'Input test run JSON file')
    .option('-o, --output <path>', 'Output file path', './report.html')
    .option('-f, --format <format>', 'Report format (json|html|markdown|junit|csv)', 'html')
    .action(async (options) => {
    try {
        console.log(chalk_1.default.yellow('📄 Loading test run...'));
        const content = await (0, promises_1.readFile)(options.input, 'utf-8');
        const testRun = JSON.parse(content);
        console.log(chalk_1.default.yellow('✏️  Generating report...'));
        const reporter = new reporter_js_1.SafetyReporter(testRun);
        await reporter.generate({
            format: options.format,
            outputPath: options.output,
            includeDetails: true,
            includeLogs: false,
            highlightFailures: true,
        });
        console.log(chalk_1.default.green(`✓ Report saved to: ${options.output}\n`));
    }
    catch (error) {
        console.error(chalk_1.default.red('✗ Error:'), error.message);
        process.exit(1);
    }
});
/**
 * List test packs command
 */
program
    .command('list')
    .description('List available test packs')
    .option('-t, --testpacks-dir <path>', 'Test packs directory', '../testpacks')
    .action(async (options) => {
    try {
        const runner = new runner_js_1.SafetyHarnessRunner({
            testPacksDir: options.testpacksDir,
            targetEndpoint: 'http://localhost:4000',
            environment: 'development',
            parallel: false,
            maxConcurrency: 1,
            timeout: 30000,
        });
        await runner.loadTestPacks();
        console.log(chalk_1.default.bold('\n📦 Available Test Packs:\n'));
        // List would be implemented by exposing testPacks from runner
        console.log(chalk_1.default.gray('  (Implementation pending)\n'));
    }
    catch (error) {
        console.error(chalk_1.default.red('✗ Error:'), error.message);
        process.exit(1);
    }
});
program.parse();
/**
 * Helper: Compare differential test runs
 */
function compareDifferential(baseline, candidate) {
    const baselineResults = new Map(baseline.results.map((r) => [r.scenarioId, r]));
    const candidateResults = new Map(candidate.results.map((r) => [r.scenarioId, r]));
    let newFailures = 0;
    let newPasses = 0;
    let regressions = 0;
    let improvements = 0;
    let unchanged = 0;
    for (const [scenarioId, candidateResult] of candidateResults) {
        const baselineResult = baselineResults.get(scenarioId);
        if (!baselineResult) {
            // New scenario
            if (!candidateResult.passed)
                newFailures++;
            continue;
        }
        if (baselineResult.passed && !candidateResult.passed) {
            regressions++;
            newFailures++;
        }
        else if (!baselineResult.passed && candidateResult.passed) {
            improvements++;
            newPasses++;
        }
        else {
            unchanged++;
        }
    }
    const total = candidateResults.size;
    const regressionRate = regressions / total;
    return {
        newFailures,
        newPasses,
        regressions,
        improvements,
        unchanged,
        regressionRate,
    };
}
