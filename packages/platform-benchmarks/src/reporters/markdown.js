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
exports.MarkdownReporter = void 0;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const harness_js_1 = require("../harness.js");
/**
 * Markdown reporter for PR comments and documentation
 */
class MarkdownReporter {
    outputPath;
    results = [];
    suiteConfig;
    constructor(outputPath) {
        this.outputPath = outputPath;
    }
    async onSuiteStart(suite) {
        this.suiteConfig = suite;
        this.results = [];
    }
    async onBenchmarkStart(_config) {
        // No-op
    }
    async onBenchmarkComplete(result) {
        this.results.push(result);
    }
    async onSuiteComplete(results) {
        const lines = [];
        // Header
        lines.push(`# Benchmark Results: ${this.suiteConfig?.name ?? 'Unknown'}`);
        lines.push('');
        lines.push(`**Generated:** ${new Date().toISOString()}`);
        lines.push(`**Git Commit:** ${results[0]?.gitCommit ?? 'unknown'}`);
        lines.push(`**Platform:** ${results[0]?.platform.os ?? 'unknown'}`);
        lines.push('');
        // Summary
        const passed = results.filter((r) => r.passed).length;
        const failed = results.length - passed;
        lines.push('## Summary');
        lines.push('');
        lines.push(`| Metric | Value |`);
        lines.push(`|--------|-------|`);
        lines.push(`| Total | ${results.length} |`);
        lines.push(`| Passed | ${passed} |`);
        lines.push(`| Failed | ${failed} |`);
        lines.push('');
        // Results table
        lines.push('## Results');
        lines.push('');
        lines.push('| Benchmark | Subsystem | Mean | p99 | Ops/sec | Status |');
        lines.push('|-----------|-----------|------|-----|---------|--------|');
        for (const result of results) {
            const status = result.passed ? '✅ Pass' : '❌ Fail';
            lines.push(`| ${result.config.name} | ${result.config.subsystem} | ` +
                `${harness_js_1.BenchmarkHarness.formatDuration(result.stats.mean)} | ` +
                `${harness_js_1.BenchmarkHarness.formatDuration(result.stats.percentiles.p99)} | ` +
                `${result.stats.opsPerSecond.toFixed(2)} | ${status} |`);
        }
        lines.push('');
        // Detailed results
        lines.push('## Detailed Results');
        lines.push('');
        for (const result of results) {
            lines.push(`### ${result.config.name}`);
            lines.push('');
            lines.push(`- **Subsystem:** ${result.config.subsystem}`);
            lines.push(`- **Workload Type:** ${result.config.workloadType}`);
            lines.push(`- **Iterations:** ${result.stats.iterations}`);
            lines.push('');
            lines.push('**Timing:**');
            lines.push(`- Mean: ${harness_js_1.BenchmarkHarness.formatDuration(result.stats.mean)}`);
            lines.push(`- Min: ${harness_js_1.BenchmarkHarness.formatDuration(result.stats.min)}`);
            lines.push(`- Max: ${harness_js_1.BenchmarkHarness.formatDuration(result.stats.max)}`);
            lines.push(`- p50: ${harness_js_1.BenchmarkHarness.formatDuration(result.stats.percentiles.p50)}`);
            lines.push(`- p95: ${harness_js_1.BenchmarkHarness.formatDuration(result.stats.percentiles.p95)}`);
            lines.push(`- p99: ${harness_js_1.BenchmarkHarness.formatDuration(result.stats.percentiles.p99)}`);
            lines.push('');
            lines.push('**Memory:**');
            lines.push(`- Heap Before: ${harness_js_1.BenchmarkHarness.formatBytes(result.memory.heapUsedBefore)}`);
            lines.push(`- Heap After: ${harness_js_1.BenchmarkHarness.formatBytes(result.memory.heapUsedAfter)}`);
            lines.push('');
        }
        const markdown = lines.join('\n');
        if (this.outputPath) {
            await fs.mkdir(path.dirname(this.outputPath), { recursive: true });
            await fs.writeFile(this.outputPath, markdown, 'utf8');
        }
        else {
            console.log(markdown);
        }
    }
    async onError(error, config) {
        console.error(`Error in ${config?.name ?? 'unknown'}: ${error.message}`);
    }
}
exports.MarkdownReporter = MarkdownReporter;
