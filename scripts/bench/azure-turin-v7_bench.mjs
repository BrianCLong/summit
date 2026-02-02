import fs from 'node:fs';
import path from 'node:path';
import { stableStringify } from './lib/stable_json.mjs';

function cpuBurn() {
    let x = 0;
    for (let i = 0; i < 1e7; i++) {
        x += Math.sin(i) * Math.cos(i);
    }
    return x;
}

const t0 = process.hrtime.bigint();
cpuBurn();
const t1 = process.hrtime.bigint();

const durationNs = Number(t1 - t0);
const durationMs = durationNs / 1e6;

const outDir = 'evidence/azure-turin-v7/bench';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const metrics = {
    evidence_id: "EVD-AZURETURINV7-BENCH-001",
    metrics: {
        cpu_burn_ms: durationMs,
        cpu_burn_ops_per_sec: 1e7 / (durationMs / 1000)
    }
};

fs.writeFileSync(path.join(outDir, 'metrics.json'), stableStringify(metrics));
console.log(`Benchmark complete. Duration: ${durationMs.toFixed(2)}ms`);
