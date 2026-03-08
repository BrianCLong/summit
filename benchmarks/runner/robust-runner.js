"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BenchRunner = void 0;
const fs_1 = __importDefault(require("fs"));
class BenchRunner {
    results = [];
    async run(config) {
        const warmup = config.warmupIterations || 5;
        const iterations = config.measureIterations || 20;
        const maxStdDevPct = config.maxStdDevPct || 10;
        console.log(`[Bench] Running: ${config.name}`);
        console.log(`        Warmup: ${warmup}, Iterations: ${iterations}`);
        // Warmup
        for (let i = 0; i < warmup; i++) {
            await config.fn();
        }
        // Measure
        const samples = [];
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            await config.fn();
            const end = performance.now();
            samples.push(end - start);
        }
        // Stats
        samples.sort((a, b) => a - b);
        const sum = samples.reduce((a, b) => a + b, 0);
        const mean = sum / samples.length;
        const median = samples[Math.floor(samples.length / 2)];
        const p95 = samples[Math.floor(samples.length * 0.95)];
        const variance = samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / samples.length;
        const stdDev = Math.sqrt(variance);
        const stdDevPct = (stdDev / mean) * 100;
        const stable = stdDevPct <= maxStdDevPct;
        const result = {
            name: config.name,
            samples,
            mean,
            median,
            p95,
            stdDev,
            stdDevPct,
            stable
        };
        this.results.push(result);
        console.log(`        Median: ${median.toFixed(2)}ms, P95: ${p95.toFixed(2)}ms`);
        console.log(`        StdDev: ${stdDev.toFixed(2)}ms (${stdDevPct.toFixed(2)}%)`);
        if (!stable) {
            console.warn(`        [WARNING] Benchmark unstable! Variance > ${maxStdDevPct}%`);
        }
    }
    saveReport(filepath) {
        fs_1.default.writeFileSync(filepath, JSON.stringify(this.results, null, 2));
        console.log(`[Bench] Report saved to ${filepath}`);
    }
}
exports.BenchRunner = BenchRunner;
// Example usage if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const runner = new BenchRunner();
    runner.run({
        name: 'CPU Spin 10ms',
        fn: () => {
            const start = Date.now();
            while (Date.now() - start < 10) { }
        }
    }).then(() => runner.saveReport('bench_results.json'));
}
