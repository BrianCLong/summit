"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_perf_hooks_1 = require("node:perf_hooks");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const dataRedaction_ts_1 = require("../src/utils/dataRedaction.ts");
const __dirname = node_path_1.default.dirname((0, node_url_1.fileURLToPath)(import.meta.url));
const ITERATIONS = 1000;
const samples = [];
const sampleData = {
    email: 'user@example.com',
    phone: '555-1234',
    name: 'Alice Agent',
    address: '123 Main St',
};
const user = { id: 'u1', role: 'ANALYST' };
for (let i = 0; i < ITERATIONS; i++) {
    const start = node_perf_hooks_1.performance.now();
    (0, dataRedaction_ts_1.redactData)(sampleData, user);
    const duration = node_perf_hooks_1.performance.now() - start;
    samples.push(duration);
}
samples.sort((a, b) => a - b);
const p95 = samples[Math.floor(ITERATIONS * 0.95)];
const avg = samples.reduce((a, b) => a + b, 0) / ITERATIONS;
const memoryMb = process.memoryUsage().rss / 1024 / 1024;
const results = {
    function: 'redactData',
    iterations: ITERATIONS,
    avgMs: Number(avg.toFixed(3)),
    p95Ms: Number(p95.toFixed(3)),
    memoryMb: Number(memoryMb.toFixed(1)),
};
const outFile = node_path_1.default.join(__dirname, 'microbench-results.json');
node_fs_1.default.writeFileSync(outFile, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
