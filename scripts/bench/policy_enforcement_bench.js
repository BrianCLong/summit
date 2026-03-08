"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../../packages/agent-runtime/src/index.js");
const perf_hooks_1 = require("perf_hooks");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const __dirname = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
const ITERATIONS = 10000;
function main() {
    console.log(`Benchmarking Policy Enforcement (${ITERATIONS} iterations)...`);
    // Warmup
    for (let i = 0; i < 100; i++) {
        (0, index_js_1.enforceAction)("hash", "action", true);
    }
    const start = perf_hooks_1.performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        (0, index_js_1.enforceAction)("hash", "action", true);
    }
    const end = perf_hooks_1.performance.now();
    const totalMs = end - start;
    const perOpMs = totalMs / ITERATIONS;
    console.log(`Total time: ${totalMs.toFixed(2)}ms`);
    console.log(`Per op: ${perOpMs.toFixed(4)}ms`);
    const metrics = {
        total_ms: totalMs,
        per_op_ms: perOpMs,
        iterations: ITERATIONS
    };
    const artifactDir = process.env.ARTIFACT_DIR || path_1.default.join(process.cwd(), "artifacts", "policy");
    if (!fs_1.default.existsSync(artifactDir)) {
        fs_1.default.mkdirSync(artifactDir, { recursive: true });
    }
    fs_1.default.writeFileSync(path_1.default.join(artifactDir, "metrics_bench.json"), JSON.stringify(metrics, null, 2));
    if (perOpMs > 0.5) { // Arbitrary budget
        console.warn("Performance warning: > 0.5ms per enforcement op");
        // process.exit(1); // Don't fail yet until we know baseline
    }
}
main();
