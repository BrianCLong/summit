#!/usr/bin/env ts-node
"use strict";
/**
 * CI Safety Gate
 *
 * Runs safety harness and enforces quality gates for CI/CD pipelines.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSafetyGate = runSafetyGate;
const runner_js_1 = require("../src/runner.js");
const reporter_js_1 = require("../src/reporter.js");
const chalk_1 = __importDefault(require("chalk"));
async function runSafetyGate(options) {
    console.log(chalk_1.default.bold.cyan('\n🛡️  CI Safety Gate\n'));
    const runnerConfig = {
        testPacksDir: options.testPacksDir,
        targetEndpoint: options.targetEndpoint,
        environment: options.environment,
        buildVersion: options.buildVersion,
        parallel: true,
        maxConcurrency: 10,
        timeout: 30000,
    };
    const runner = new runner_js_1.SafetyHarnessRunner(runnerConfig);
    // Load and run tests
    console.log(chalk_1.default.yellow('📦 Loading test packs...'));
    await runner.loadTestPacks();
    console.log(chalk_1.default.yellow('🚀 Executing safety tests...\n'));
    const testRun = await runner.runAll();
    // Generate reports
    console.log(chalk_1.default.yellow('\n📄 Generating reports...'));
    const reporter = new reporter_js_1.SafetyReporter(testRun);
    // Save JSON report
    await reporter.generate({
        format: 'json',
        outputPath: `${options.outputDir}/safety-report.json`,
        includeDetails: true,
        includeLogs: true,
        highlightFailures: true,
    });
    // Save JUnit report for CI integration
    await reporter.generate({
        format: 'junit',
        outputPath: `${options.outputDir}/safety-junit.xml`,
        includeDetails: false,
        includeLogs: false,
        highlightFailures: true,
    });
    // Save HTML report for artifacts
    await reporter.generate({
        format: 'html',
        outputPath: `${options.outputDir}/safety-report.html`,
        includeDetails: true,
        includeLogs: false,
        highlightFailures: true,
    });
    console.log(chalk_1.default.green('✓ Reports generated'));
    // Print console summary
    reporter.printConsoleSummary();
    // Evaluate safety gate
    const { summary } = testRun;
    // Count failures by severity
    const criticalFailures = testRun.results.filter(r => !r.passed && r.failure?.severity === 'critical').length;
    const highFailures = testRun.results.filter(r => !r.passed && r.failure?.severity === 'high').length;
    const mediumFailures = testRun.results.filter(r => !r.passed && r.failure?.severity === 'medium').length;
    const lowFailures = testRun.results.filter(r => !r.passed && r.failure?.severity === 'low').length;
    // Determine pass/fail based on config
    let passed = true;
    const reasons = [];
    if (!options.config.enabled) {
        console.log(chalk_1.default.yellow('\n⚠️  Safety gate is DISABLED - tests run for informational purposes only'));
        passed = true;
    }
    else {
        if (options.config.failOnCritical && criticalFailures > 0) {
            passed = false;
            reasons.push(`Critical failures detected: ${criticalFailures}`);
        }
        if (options.config.failOnHigh && highFailures > 0) {
            passed = false;
            reasons.push(`High-severity failures detected: ${highFailures}`);
        }
        const failureRate = summary.failed / summary.total;
        if (failureRate > options.config.maxFailureRate) {
            passed = false;
            reasons.push(`Failure rate ${(failureRate * 100).toFixed(1)}% exceeds threshold ${(options.config.maxFailureRate * 100).toFixed(1)}%`);
        }
    }
    // Build CI report
    const report = {
        passed,
        summary: passed
            ? '✅ Safety gate PASSED'
            : `❌ Safety gate FAILED: ${reasons.join('; ')}`,
        details: {
            totalTests: summary.total,
            passed: summary.passed,
            failed: summary.failed,
            criticalFailures,
            highFailures,
        },
        exitCode: passed ? 0 : 1,
    };
    // Print gate result
    console.log(chalk_1.default.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    if (passed) {
        console.log(chalk_1.default.bold.green('✅ SAFETY GATE PASSED'));
    }
    else {
        console.log(chalk_1.default.bold.red('❌ SAFETY GATE FAILED'));
        console.log(chalk_1.default.red('\nFailure reasons:'));
        reasons.forEach(reason => console.log(chalk_1.default.red(`  • ${reason}`)));
    }
    console.log(chalk_1.default.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
    return report;
}
// CLI execution
if (require.main === module) {
    const config = {
        enabled: process.env.CI_SAFETY_GATE_ENABLED !== 'false',
        failOnCritical: process.env.CI_FAIL_ON_CRITICAL !== 'false',
        failOnHigh: process.env.CI_FAIL_ON_HIGH === 'true',
        maxFailureRate: parseFloat(process.env.CI_MAX_FAILURE_RATE || '0.1'),
        requireAllPacks: process.env.CI_REQUIRE_ALL_PACKS === 'true',
    };
    const options = {
        testPacksDir: process.env.TESTPACKS_DIR || '../testpacks',
        targetEndpoint: process.env.TARGET_ENDPOINT || 'http://localhost:4000',
        environment: process.env.ENVIRONMENT || 'ci',
        buildVersion: process.env.BUILD_VERSION || process.env.GITHUB_SHA,
        outputDir: process.env.OUTPUT_DIR || './safety-reports',
        config,
    };
    runSafetyGate(options)
        .then(report => {
        console.log(chalk_1.default.gray(`\nReports saved to: ${options.outputDir}/`));
        process.exit(report.exitCode);
    })
        .catch(error => {
        console.error(chalk_1.default.red('\n✗ Safety gate execution failed:'), error.message);
        console.error(error.stack);
        process.exit(1);
    });
}
