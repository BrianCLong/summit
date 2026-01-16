import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
// We'll try to load js-yaml, if fails we might need a fallback or assume environment has it.
// Since this is reconcile script, it needs to read the policy.
let yaml;
try {
    yaml = require('js-yaml');
} catch (e) {
    console.error("js-yaml not found. Please install dependencies.");
    process.exit(1);
}

const SHA = process.env.GITHUB_SHA || process.argv[2];
const STAGE = process.env.DEPLOY_STAGE || 'pr'; // pr, main, release

const POLICY_PATH = path.resolve('docs/security/security_gates.yml');
const ARTIFACTS_ROOT = process.env.ARTIFACTS_DIR || 'artifacts';
const GATE_DIR = path.join(ARTIFACTS_ROOT, 'security-gate', SHA);
const DRIFT_FILE = path.join(GATE_DIR, 'required-checks-drift.json');

// Exceptions
const EXCEPTIONS_PATH = path.resolve('docs/security/exceptions.yml');

function reconcile() {
    if (!fs.existsSync(POLICY_PATH)) {
        console.error("Policy file missing");
        process.exit(1);
    }

    const policy = yaml.load(fs.readFileSync(POLICY_PATH, 'utf-8'));
    const requiredChecks = policy.required_checks[STAGE] || [];
    const gates = policy.gates;

    const drift = {
        sha: SHA,
        stage: STAGE,
        timestamp: new Date().toISOString(),
        missing: [],
        failed: [],
        exceptions_used: [],
        status: 'pass'
    };

    // Load Summary
    const summaryFile = path.join(GATE_DIR, 'summary.json');
    let summary = { checks: {} };
    if (fs.existsSync(summaryFile)) {
        summary = JSON.parse(fs.readFileSync(summaryFile, 'utf-8'));
    }

    // Load Exceptions
    let exceptions = [];
    if (fs.existsSync(EXCEPTIONS_PATH)) {
        const doc = yaml.load(fs.readFileSync(EXCEPTIONS_PATH, 'utf-8'));
        if (doc && doc.exceptions) exceptions = doc.exceptions;
    }

    requiredChecks.forEach(checkId => {
        const gateDef = gates[checkId];
        const checkResult = summary.checks[checkId];

        // Check if report exists
        if (!checkResult || !checkResult.present) {
            drift.missing.push(checkId);
            drift.status = 'fail';
            return;
        }

        // Check if passed
        if (!checkResult.passed) {
            // Look for exception
            const exception = exceptions.find(ex =>
                ex.check_id === checkId &&
                new Date(ex.expiry) > new Date()
            );

            if (exception) {
                drift.exceptions_used.push({
                    check: checkId,
                    exception_id: exception.id,
                    rationale: exception.rationale
                });
            } else {
                drift.failed.push(checkId);
                drift.status = 'fail';
            }
        }
    });

    // Write drift report
    if (!fs.existsSync(GATE_DIR)) fs.mkdirSync(GATE_DIR, { recursive: true });
    fs.writeFileSync(DRIFT_FILE, JSON.stringify(drift, null, 2));

    console.log(`Reconciliation Complete. Status: ${drift.status}`);
    if (drift.status === 'fail') {
        console.error("Blocking checks failed:", drift.failed);
        console.error("Missing checks:", drift.missing);
        process.exit(1);
    }
}

reconcile();
