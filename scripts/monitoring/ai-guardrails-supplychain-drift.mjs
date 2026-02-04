import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Define gates to check
const gates = [
    'scripts/ci/ai_upgrade_grounding_gate.mjs',
    'scripts/ci/dependency_intake_gate.mjs',
    'scripts/ci/dev_threat_audit_gate.mjs'
];

let failed = false;
const results = {};

console.log('Starting Supply Chain Drift Detection...');

for (const gate of gates) {
    console.log(`[DriftCheck] verifying gate: ${gate}`);
    if (fs.existsSync(gate)) {
        const start = Date.now();
        const res = spawnSync('node', [gate], { stdio: 'inherit', shell: true });
        const duration = Date.now() - start;

        if (res.status !== 0) {
            console.error(`[DriftCheck] Gate ${gate} failed!`);
            failed = true;
        }
        results[gate] = { status: res.status, duration_ms: duration };
    } else {
        console.warn(`[DriftCheck] Gate script not found: ${gate}`);
        results[gate] = { status: 'missing' };
    }
}

// Generate drift evidence
const driftDir = 'artifacts/supplychain/drift';
fs.mkdirSync(driftDir, { recursive: true });

const report = {
    evidence_id: "EVID:SUPPLYCHAIN:drift-check:v1",
    ok: !failed,
    timestamp: new Date().toISOString(),
    results
};

fs.writeFileSync(path.join(driftDir, 'report.json'), JSON.stringify(report, null, 2));

console.log(`Drift report written to ${driftDir}/report.json`);

if (failed) {
    console.error('Drift detected: One or more gates failed.');
    process.exit(1);
}
console.log('[DriftCheck] All gates passed.');
