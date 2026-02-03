import { enforceAction } from "../../packages/agent-runtime/src/index.js";
import { performance } from "perf_hooks";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ITERATIONS = 10000;

function main() {
    console.log(`Benchmarking Policy Enforcement (${ITERATIONS} iterations)...`);

    // Warmup
    for (let i = 0; i < 100; i++) {
        enforceAction("hash", "action", true);
    }

    const start = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        enforceAction("hash", "action", true);
    }
    const end = performance.now();

    const totalMs = end - start;
    const perOpMs = totalMs / ITERATIONS;

    console.log(`Total time: ${totalMs.toFixed(2)}ms`);
    console.log(`Per op: ${perOpMs.toFixed(4)}ms`);

    const metrics = {
        total_ms: totalMs,
        per_op_ms: perOpMs,
        iterations: ITERATIONS
    };

    const artifactDir = process.env.ARTIFACT_DIR || path.join(process.cwd(), "artifacts", "policy");
    if (!fs.existsSync(artifactDir)) {
        fs.mkdirSync(artifactDir, { recursive: true });
    }

    fs.writeFileSync(path.join(artifactDir, "metrics_bench.json"), JSON.stringify(metrics, null, 2));

    if (perOpMs > 0.5) { // Arbitrary budget
        console.warn("Performance warning: > 0.5ms per enforcement op");
        // process.exit(1); // Don't fail yet until we know baseline
    }
}

main();
