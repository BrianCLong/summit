"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const os_1 = require("os");
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\$&');
const parseArgs = () => {
    const args = process.argv.slice(2);
    const options = {};
    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        if (arg === '--iterations' && args[i + 1]) {
            options.iterations = Number(args[i + 1]);
            i += 1;
        }
        else if (arg === '--command' && args[i + 1]) {
            options.command = args[i + 1];
            i += 1;
        }
        else if (arg === '--pattern' && args[i + 1]) {
            options.pattern = args[i + 1];
            i += 1;
        }
        else if (arg === '--outputDir' && args[i + 1]) {
            options.outputDir = args[i + 1];
            i += 1;
        }
    }
    return {
        iterations: options.iterations && options.iterations > 0 ? options.iterations : 10,
        command: options.command || 'pnpm exec jest',
        pattern: options.pattern,
        outputDir: options.outputDir || 'reports',
    };
};
const readJestOutput = async (outputFile) => {
    if (!(0, fs_1.existsSync)(outputFile)) {
        return null;
    }
    const content = await (0, promises_1.readFile)(outputFile, 'utf8');
    try {
        return JSON.parse(content);
    }
    catch (error) {
        console.warn(`Failed to parse JSON from ${outputFile}: ${error.message}`);
        return null;
    }
};
const collectResults = (json, summary) => {
    const results = json.testResults || [];
    results.forEach((fileResult) => {
        fileResult.assertionResults.forEach((assertion) => {
            const id = `${fileResult.name}::${assertion.fullName}`;
            const current = summary.get(id) || {
                id,
                file: fileResult.name,
                name: assertion.fullName,
                passes: 0,
                failures: 0,
                iterations: 0,
                flaky: false,
                failureRate: 0,
            };
            current.iterations += 1;
            if (assertion.status === 'passed') {
                current.passes += 1;
            }
            else if (assertion.status === 'failed') {
                current.failures += 1;
            }
            summary.set(id, current);
        });
    });
};
const buildReport = (summary, metadata) => {
    const tests = [];
    const flakyTests = [];
    summary.forEach((result) => {
        const totalRuns = result.passes + result.failures;
        const failureRate = totalRuns === 0 ? 0 : result.failures / totalRuns;
        const enhanced = {
            ...result,
            iterations: totalRuns,
            flaky: result.passes > 0 && result.failures > 0,
            failureRate,
        };
        tests.push(enhanced);
        if (enhanced.flaky) {
            flakyTests.push(enhanced);
        }
    });
    const topOffenders = [...flakyTests].sort((a, b) => b.failureRate - a.failureRate || b.failures - a.failures).slice(0, 10);
    return {
        metadata,
        iterations: [],
        tests: tests.sort((a, b) => b.failureRate - a.failureRate),
        flakyTests,
        topOffenders,
    };
};
const main = async () => {
    const options = parseArgs();
    const startedAt = new Date().toISOString();
    const summary = new Map();
    const iterations = [];
    await (0, promises_1.mkdir)(options.outputDir, { recursive: true });
    for (let i = 0; i < options.iterations; i += 1) {
        const outputFile = path_1.default.join((0, os_1.tmpdir)(), `flaky-run-${Date.now()}-${i}.json`);
        const patternFlag = options.pattern ? ` --testNamePattern="${escapeRegex(options.pattern)}"` : '';
        const command = `${options.command} --json --outputFile="${outputFile}" --runInBand --testLocationInResults${patternFlag}`;
        console.log(`\n[flaky-scan] Iteration ${i + 1}/${options.iterations}`);
        const started = Date.now();
        const result = (0, child_process_1.spawnSync)(command, { shell: true, stdio: 'inherit' });
        const durationMs = Date.now() - started;
        iterations.push({ index: i + 1, exitCode: result.status, durationMs, outputFile });
        const json = await readJestOutput(outputFile);
        if (json) {
            collectResults(json, summary);
        }
    }
    const finishedAt = new Date().toISOString();
    const metadata = {
        iterations: options.iterations,
        command: options.command,
        pattern: options.pattern,
        startedAt,
        finishedAt,
        outputDir: options.outputDir,
    };
    const report = buildReport(summary, metadata);
    report.iterations = iterations;
    const timestamp = finishedAt.replace(/[:.]/g, '-');
    const reportPath = path_1.default.join(options.outputDir, `flaky-tests-${timestamp}.json`);
    await (0, promises_1.writeFile)(reportPath, JSON.stringify(report, null, 2));
    if (report.flakyTests.length === 0) {
        console.log(`No flaky tests detected across ${options.iterations} iterations.`);
    }
    else {
        console.log('\nFlaky tests detected:');
        report.topOffenders.forEach((test, index) => {
            const rate = (test.failureRate * 100).toFixed(1);
            console.log(`${index + 1}. ${test.name} (${test.file}) - failure rate ${rate}%`);
        });
    }
    console.log(`\nReport written to ${reportPath}`);
};
main().catch((error) => {
    console.error('[flaky-scan] Failed to execute detection', error);
    process.exit(1);
});
