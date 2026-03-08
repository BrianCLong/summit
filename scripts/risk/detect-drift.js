"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
exports.computeDrift = computeDrift;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {};
    for (let i = 0; i < args.length; i += 1) {
        const [key, value] = args[i].split('=');
        const normalizedKey = key.replace(/^--/, '');
        if (value === undefined) {
            options[normalizedKey] = args[i + 1];
            i += 1;
        }
        else {
            options[normalizedKey] = value;
        }
    }
    return {
        history: options.history ?? 'risk-history.json',
        output: options.output,
        window: Number(options.window ?? '10'),
    };
}
function loadHistory(filePath) {
    const absolute = node_path_1.default.resolve(process.cwd(), filePath);
    const raw = node_fs_1.default.readFileSync(absolute, 'utf8');
    return JSON.parse(raw);
}
function average(values) {
    if (values.length === 0)
        return 0;
    const total = values.reduce((sum, value) => sum + value, 0);
    return total / values.length;
}
function sliceWindow(items, window) {
    const recent = items.slice(-window);
    const baseline = items.slice(-window * 2, -window);
    return { baseline, recent };
}
function computeDrift(entries, window) {
    const { baseline, recent } = sliceWindow(entries, window);
    const baselineAverage = average(baseline.map((entry) => entry.score));
    const recentAverage = average(recent.map((entry) => entry.score));
    const baselineExceptions = average(baseline.map((entry) => entry.openExceptions ?? 0));
    const recentExceptions = average(recent.map((entry) => entry.openExceptions ?? 0));
    const baselineAgent = average(baseline.map((entry) => entry.agentSubscore ?? 0));
    const recentAgent = average(recent.map((entry) => entry.agentSubscore ?? 0));
    const debtTrend = average(recent.map((entry) => entry.debtDelta ?? 0));
    const warnings = [];
    if (baselineAverage > 0) {
        const increase = (recentAverage - baselineAverage) / baselineAverage;
        if (increase > 0.1) {
            warnings.push(`Risk average increased by ${(increase * 100).toFixed(1)}% (baseline=${baselineAverage.toFixed(2)}, recent=${recentAverage.toFixed(2)}).`);
        }
    }
    const exceptionDelta = recentExceptions - baselineExceptions;
    if (exceptionDelta > 3) {
        warnings.push(`Exception load rising by ${exceptionDelta.toFixed(1)} on average.`);
    }
    const agentDelta = recentAgent - baselineAgent;
    if (agentDelta > 5) {
        warnings.push(`Agent risk trending upward by ${agentDelta.toFixed(1)} points.`);
    }
    if (debtTrend >= 0) {
        warnings.push('Debt burn-down stalled or reversed (non-negative delta).');
    }
    return {
        window,
        baselineAverage,
        recentAverage,
        exceptionDelta,
        agentDelta,
        debtTrend,
        warnings,
        timestamp: new Date().toISOString(),
    };
}
function emitReport(report, output) {
    console.log('[RISK-DRIFT] Drift analysis summary');
    console.log(`- baseline average score: ${report.baselineAverage.toFixed(2)}`);
    console.log(`- recent average score: ${report.recentAverage.toFixed(2)}`);
    console.log(`- exception delta: ${report.exceptionDelta.toFixed(2)}`);
    console.log(`- agent delta: ${report.agentDelta.toFixed(2)}`);
    console.log(`- debt trend: ${report.debtTrend.toFixed(2)}`);
    if (report.warnings.length > 0) {
        console.warn('[RISK-DRIFT] Warnings detected:');
        report.warnings.forEach((warning) => console.warn(`- ${warning}`));
    }
    else {
        console.log('[RISK-DRIFT] No drift warnings detected.');
    }
    if (output) {
        const outputPath = node_path_1.default.resolve(process.cwd(), output);
        node_fs_1.default.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    }
}
function main() {
    const { history, output, window } = parseArgs();
    const entries = loadHistory(history);
    const report = computeDrift(entries, window);
    emitReport(report, output);
}
if (require.main === module) {
    main();
}
