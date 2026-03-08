"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleReporter = void 0;
const chalk_1 = __importDefault(require("chalk"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const harness_js_1 = require("../harness.js");
/**
 * Console reporter for benchmark results
 */
class ConsoleReporter {
    verbose;
    ci;
    constructor(options) {
        this.verbose = options?.verbose ?? false;
        this.ci = options?.ci ?? false;
    }
    async onSuiteStart(suite) {
        const title = this.ci ? suite.name : chalk_1.default.bold.blue(suite.name);
        console.log(`\n${title}`);
        if (suite.description) {
            console.log(this.ci ? suite.description : chalk_1.default.gray(suite.description));
        }
        console.log('');
    }
    async onBenchmarkStart(config) {
        if (this.verbose) {
            const name = this.ci ? config.name : chalk_1.default.cyan(config.name);
            console.log(`  Running: ${name}...`);
        }
    }
    async onBenchmarkComplete(result) {
        const { config, stats, passed } = result;
        const status = passed
            ? this.ci ? '✓' : chalk_1.default.green('✓')
            : this.ci ? '✗' : chalk_1.default.red('✗');
        const name = this.ci ? config.name : chalk_1.default.white(config.name);
        const mean = harness_js_1.BenchmarkHarness.formatDuration(stats.mean);
        const ops = stats.opsPerSecond.toFixed(2);
        console.log(`  ${status} ${name}: ${mean}/op (${ops} ops/sec)`);
        if (this.verbose) {
            console.log(`    p50: ${harness_js_1.BenchmarkHarness.formatDuration(stats.percentiles.p50)}`);
            console.log(`    p95: ${harness_js_1.BenchmarkHarness.formatDuration(stats.percentiles.p95)}`);
            console.log(`    p99: ${harness_js_1.BenchmarkHarness.formatDuration(stats.percentiles.p99)}`);
            console.log(`    rme: ±${stats.rme.toFixed(2)}%`);
        }
    }
    async onSuiteComplete(results) {
        console.log('');
        // Summary table
        const table = new cli_table3_1.default({
            head: this.ci
                ? ['Benchmark', 'Mean', 'p99', 'Ops/sec', 'RME', 'Status']
                : [
                    chalk_1.default.white('Benchmark'),
                    chalk_1.default.white('Mean'),
                    chalk_1.default.white('p99'),
                    chalk_1.default.white('Ops/sec'),
                    chalk_1.default.white('RME'),
                    chalk_1.default.white('Status'),
                ],
            style: {
                head: [],
                border: [],
            },
        });
        for (const result of results) {
            const status = result.passed
                ? this.ci ? 'PASS' : chalk_1.default.green('PASS')
                : this.ci ? 'FAIL' : chalk_1.default.red('FAIL');
            table.push([
                result.config.name,
                harness_js_1.BenchmarkHarness.formatDuration(result.stats.mean),
                harness_js_1.BenchmarkHarness.formatDuration(result.stats.percentiles.p99),
                result.stats.opsPerSecond.toFixed(2),
                `±${result.stats.rme.toFixed(2)}%`,
                status,
            ]);
        }
        console.log(table.toString());
        // Summary
        const passed = results.filter((r) => r.passed).length;
        const failed = results.length - passed;
        const summary = this.ci
            ? `\n${passed} passed, ${failed} failed`
            : `\n${chalk_1.default.green(passed + ' passed')}, ${chalk_1.default.red(failed + ' failed')}`;
        console.log(summary);
    }
    async onError(error, config) {
        const prefix = config ? `[${config.name}] ` : '';
        const message = this.ci
            ? `  ✗ ${prefix}Error: ${error.message}`
            : chalk_1.default.red(`  ✗ ${prefix}Error: ${error.message}`);
        console.error(message);
    }
}
exports.ConsoleReporter = ConsoleReporter;
