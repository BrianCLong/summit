"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runGate = runGate;
const evidence_js_1 = require("./evidence.js");
async function runGate(gateName, gateFn, baseDir = 'artifacts/supplychain') {
    const start = Date.now();
    const stamp = {
        evidence_id: `EVID:SUPPLYCHAIN:${gateName}:v1`,
        created_at: new Date().toISOString(),
    };
    console.log(`Running gate: ${gateName}...`);
    try {
        const result = await gateFn();
        const duration = Date.now() - start;
        const report = {
            evidence_id: stamp.evidence_id,
            gate: gateName,
            ok: result.ok,
            findings: result.findings
        };
        const metrics = {
            evidence_id: stamp.evidence_id,
            durations_ms: { [gateName]: duration },
            counters: { findings: result.findings.length }
        };
        (0, evidence_js_1.writeEvidence)(baseDir, gateName, report, metrics, stamp);
        if (!result.ok) {
            console.error(`Gate ${gateName} failed with ${result.findings.length} findings.`);
            // We exit 1 to fail CI, but only after writing evidence
            process.exit(1);
        }
        console.log(`Gate ${gateName} passed.`);
    }
    catch (error) {
        console.error(`Gate ${gateName} crashed:`, error);
        process.exit(1);
    }
}
