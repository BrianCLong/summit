#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
/**
 * CLI for running benchmarks
 */
const commander_1 = require("commander");
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const suite_js_1 = require("./suite.js");
const console_js_1 = require("./reporters/console.js");
const json_js_1 = require("./reporters/json.js");
const markdown_js_1 = require("./reporters/markdown.js");
const csv_js_1 = require("./reporters/csv.js");
const baseline_js_1 = require("./comparators/baseline.js");
commander_1.program
    .name('benchmark')
    .description('Summit Platform Benchmark CLI')
    .version('1.0.0')
    .option('-f, --format <format>', 'Output format (json|markdown|csv|console)', 'console')
    .option('-o, --output <path>', 'Output file path')
    .option('-b, --baseline <path>', 'Baseline file for comparison')
    .option('--filter <pattern>', 'Filter benchmarks by name pattern')
    .option('--tags <tags>', 'Filter by tags (comma-separated)')
    .option('--ci', 'CI mode (deterministic, no colors)', false)
    .option('-v, --verbose', 'Verbose output', false)
    .option('--fail-on-regression', 'Exit with error on regression', false)
    .option('--regression-threshold <percent>', 'Regression threshold percentage', '10')
    .parse(process.argv);
const options = commander_1.program.opts();
async function main() {
    // Load benchmark definitions from benchmarks directory
    const benchmarksDir = path.join(process.cwd(), 'benchmarks');
    try {
        await fs.access(benchmarksDir);
    }
    catch {
        console.error('No benchmarks directory found. Create a "benchmarks" directory with benchmark files.');
        process.exit(1);
    }
    const files = await fs.readdir(benchmarksDir);
    const benchmarkFiles = files.filter(f => f.endsWith('.bench.ts') || f.endsWith('.bench.js'));
    if (benchmarkFiles.length === 0) {
        console.error('No benchmark files found (*.bench.ts or *.bench.js)');
        process.exit(1);
    }
    // Create suite
    const suite = (0, suite_js_1.createBenchmarkSuite)({
        name: 'Summit Platform Benchmarks',
        description: 'Cross-subsystem performance benchmarks',
        defaultIterations: 1000,
        defaultWarmupIterations: 100,
    });
    // Clear default reporter and add configured ones
    suite.clearReporters();
    switch (options.format) {
        case 'json':
            suite.addReporter(new json_js_1.JsonReporter(options.output));
            break;
        case 'markdown':
            suite.addReporter(new markdown_js_1.MarkdownReporter(options.output));
            break;
        case 'csv':
            suite.addReporter(new csv_js_1.CsvReporter(options.output));
            break;
        case 'console':
        default:
            suite.addReporter(new console_js_1.ConsoleReporter({ verbose: options.verbose, ci: options.ci }));
            break;
    }
    // Load and register benchmarks
    for (const file of benchmarkFiles) {
        const filePath = path.join(benchmarksDir, file);
        const module = await Promise.resolve(`${filePath}`).then(s => __importStar(require(s)));
        if (typeof module.default === 'function') {
            // Export is a function that registers benchmarks
            await module.default(suite);
        }
        else if (Array.isArray(module.benchmarks)) {
            // Export is an array of benchmark definitions
            for (const def of module.benchmarks) {
                // Filter by name if specified
                if (options.filter && !def.name.includes(options.filter)) {
                    continue;
                }
                // Filter by tags if specified
                if (options.tags) {
                    const filterTags = options.tags.split(',');
                    const defTags = def.config?.tags || [];
                    if (!filterTags.some((t) => defTags.includes(t))) {
                        continue;
                    }
                }
                suite.add(def);
            }
        }
    }
    // Run benchmarks
    const results = await suite.run();
    // Compare with baseline if provided
    if (options.baseline) {
        const comparator = new baseline_js_1.BaselineComparator(options.regressionThreshold);
        await comparator.loadBaseline(options.baseline);
        const regressions = comparator.getRegressions(results);
        if (regressions.length > 0) {
            console.log('\n## Regressions Detected\n');
            for (const regression of regressions) {
                console.log(comparator.formatComparison(regression));
                console.log('');
            }
            if (options.failOnRegression) {
                process.exit(1);
            }
        }
    }
    // Exit with error if any benchmark failed
    if (!suite.allPassed()) {
        process.exit(1);
    }
}
main().catch((error) => {
    console.error('Benchmark failed:', error);
    process.exit(1);
});
