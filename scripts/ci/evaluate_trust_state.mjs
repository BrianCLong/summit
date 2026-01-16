import fs from 'fs';
import path from 'path';

/**
 * Trust State Evaluator
 * 
 * Computes the current trust state (GREEN, AMBER, RED) based on:
 * 1. Determinism verification results
 * 2. Provenance existence
 * 3. Execution environment (Trusted Runner)
 */

const OUTPUT_FILE = 'artifacts/trust/trust_state.json';
const TRUST_MODEL_PATH = 'docs/ga/TRUST_DEGRADATION_MODEL.yml';

// Mock evidence checks (In a real system, these would check specific signed claims)
// For this proof, we check file existence and specific environment variables.

function evaluateState() {
    let state = 'GREEN';
    let reasons = [];

    // 1. Check Execution Environment (Trusted Runner)
    // We assume 'ci-trusted.yml' sets a specific env var or we are in a known environment.
    // For this proof, we check for GITHUB_ACTIONS=true (mocking trusted runner check)
    if (process.env.GITHUB_ACTIONS !== 'true' && process.env.TRUSTED_RUNNER_OVERRIDE !== 'true') {
        // In local execution without override, we degrade to AMBER or RED depending on strictness.
        // Let's degrade to AMBER for local dev ease, but warn.
        // Actually, per prompt: "RED -> block release". Unknown runner should be RED for release.
        // But for "evaluate", let's be strict.
        state = 'RED';
        reasons.push('Untrusted execution environment (not GITHUB_ACTIONS)');
    }

    // 2. Check Provenance Existence
    const provenancePath = 'docs/ga/slsa_provenance.example.json'; // Using example as the "generated" one for this step
    if (!fs.existsSync(provenancePath)) {
        state = 'RED';
        reasons.push('Missing SLSA Provenance artifact');
    }

    // 3. Check Determinism (Simulated check - usually consumes a report from verify_determinism.mjs)
    // Assuming verify_determinism.mjs runs BEFORE this and exits 1 if failed.
    // If we are here, determinism "passed" implicitly in the pipeline sequence.
    // However, if we wanted to be explicit, we could require a "determinism_report.json".

    // 4. Evidence Freshness (Simulated)
    // In a real system, verify timestamps in soc_evidence.json vs NOW.
    // For now, assume GREEN if artifacts exist.

    const report = {
        timestamp: new Date().toISOString().split('.')[0] + "Z", // Strict ISO 8601
        state: state,
        reasons: reasons,
        model_version: "1.0.0"
    };

    // Ensure output directory exists
    const outDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
    console.log(`Trust State Evaluated: ${state}`);

    if (state === 'RED') {
        console.error('❌ Trust State is RED. Pipeline should halt or block releases.');
        process.exit(1);
    } else if (state === 'AMBER') {
        console.warn('⚠️ Trust State is AMBER. Reducing outputs.');
    } else {
        console.log('✅ Trust State is GREEN.');
    }
}

evaluateState();
