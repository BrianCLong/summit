import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import yaml from 'js-yaml';
import crypto from 'node:crypto';

// Utilities
const sha256 = (str) => crypto.createHash('sha256').update(str).digest('hex');

// Parse Args
const args = process.argv.slice(2);
const getArg = (name) => {
    const idx = args.indexOf(name);
    return idx !== -1 ? args[idx + 1] : null;
};

const policyPath = getArg('--policy') || 'docs/governance/GOVERNANCE_POLICY_PACK.yml';
const mode = getArg('--mode') || process.env.GOVERNANCE_MODE || 'pr';
const sha = getArg('--sha') || process.env.GITHUB_SHA || spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout.trim();
const outDir = getArg('--out') || `artifacts/governance/unified/${sha}`;

console.log(`[Unified Gate] Starting...`);
console.log(`  Policy: ${policyPath}`);
console.log(`  Mode:   ${mode}`);
console.log(`  SHA:    ${sha}`);
console.log(`  Out:    ${outDir}`);

// Load Policy
let policy;
try {
    const fileContents = fs.readFileSync(policyPath, 'utf8');
    policy = yaml.load(fileContents);
    // Basic validation
    if (policy.schema_version !== '1') throw new Error('Unsupported schema version');
} catch (e) {
    console.error(`[Unified Gate] Failed to load policy: ${e.message}`);
    process.exit(2);
}

// Resolve Gates
const gates = policy.gates.map(gate => {
    const overrides = policy.mode_overrides?.[mode]?.gates?.[gate.id] || {};
    return { ...gate, ...overrides };
});

const report = {
    verdict: 'pending',
    mode,
    sha,
    timestamp: new Date().toISOString(),
    gates: []
};

// Execution
fs.mkdirSync(outDir, { recursive: true });

let allRequiredPassed = true;

for (const gate of gates) {
    // Check if gate is applicable for this mode if 'modes' constraint exists
    if (gate.modes && !gate.modes.includes(mode)) {
        console.log(`[Unified Gate] Skipping ${gate.id} (not applicable for mode ${mode})`);
        report.gates.push({ id: gate.id, status: 'skipped', reason: 'mode_mismatch' });
        continue;
    }

    console.log(`[Unified Gate] Running ${gate.id}...`);

    // Prepare environment
    // We inject variables so gates can know where to output if they support it
    const env = {
        ...process.env,
        GOVERNANCE_MODE: mode,
        EVIDENCE_OUTPUT_DIR: path.resolve(`artifacts/evidence/${sha}`), // For evidence_bundle
        REPRO_OUTPUT_FILE: path.resolve(`artifacts/repro/${sha}/reproducibility-report.json`), // For repro_build
        GA_VERIFY_SHA: sha, // For ga:verify
        CI: process.env.CI || 'true',
        // Add others as needed
    };

    // Replace ${sha} in command if present (unlikely but good practice)
    const command = gate.command.replace(/\$\{sha\}/g, sha);

    const startTime = Date.now();
    let result;
    try {
        result = spawnSync(command, {
            shell: true,
            env,
            encoding: 'utf-8',
            stdio: 'pipe' // Capture output
        });
    } catch (e) {
        result = { status: 1, error: e, stdout: '', stderr: e.message };
    }
    const durationMs = Date.now() - startTime;

    // Capture logs (truncated)
    const logFile = path.join(outDir, `${gate.id}.log`);
    const output = `STDOUT:\n${result.stdout}\n\nSTDERR:\n${result.stderr}`;
    fs.writeFileSync(logFile, output);

    const passed = result.status === 0;

    // Check outputs if defined
    let outputsFound = true;
    const outputPaths = {};
    if (passed && gate.outputs) {
        for (const [key, pattern] of Object.entries(gate.outputs)) {
            const resolvedPath = pattern.replace(/\$\{sha\}/g, sha);
            if (fs.existsSync(resolvedPath)) {
                outputPaths[key] = resolvedPath;
            } else {
                console.error(`  [Unified Gate] Missing output for ${gate.id}: ${resolvedPath}`);
                outputsFound = false;
            }
        }
    }

    const gateStatus = (passed && outputsFound) ? 'passed' : 'failed';
    const failureReason = !passed ? `Exit code ${result.status}` : (!outputsFound ? 'Missing outputs' : null);

    console.log(`  -> ${gateStatus.toUpperCase()} (${durationMs}ms)`);
    if (gateStatus === 'failed' && gate.required) {
        allRequiredPassed = false;
        if (policy.execution.fail_fast) {
            console.error(`  [Unified Gate] Fail fast enabled. Aborting.`);
        }
    }

    report.gates.push({
        id: gate.id,
        required: gate.required,
        command: gate.command,
        status: gateStatus,
        exit_code: result.status,
        duration_ms: durationMs,
        outputs_found: outputsFound,
        output_paths: outputPaths,
        log_path: logFile,
        failure_reason: failureReason
    });

    if (gateStatus === 'failed' && gate.required && policy.execution.fail_fast) {
        break;
    }
}

// Final Verdict
report.verdict = allRequiredPassed ? 'passed' : 'failed';

// Artifact Generation
const reportJsonPath = path.join(outDir, 'report.json');
const reportMdPath = path.join(outDir, 'report.md');
const stampPath = path.join(outDir, 'stamp.json');
const indexPath = path.join(outDir, 'index.json');

// Report JSON
fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2));

// Stamp
const stamp = {
    status: report.verdict,
    sha,
    mode,
    timestamp: report.timestamp,
    policy_hash: sha256(fs.readFileSync(policyPath, 'utf8')),
    report_hash: sha256(fs.readFileSync(reportJsonPath, 'utf8'))
};
fs.writeFileSync(stampPath, JSON.stringify(stamp, null, 2));

// Report MD
const mdLines = [
    `# Governance Unified Gate Report`,
    `**Verdict:** ${report.verdict.toUpperCase()}`,
    `**Mode:** ${mode}`,
    `**SHA:** ${sha}`,
    `**Timestamp:** ${report.timestamp}`,
    ``,
    `## Gate Results`,
    `| ID | Status | Required | Duration | Details |`,
    `|----|--------|----------|----------|---------|`
];
report.gates.forEach(g => {
    const icon = g.status === 'passed' ? '✅' : (g.status === 'skipped' ? '⏭️' : '❌');
    mdLines.push(`| ${g.id} | ${icon} ${g.status} | ${g.required} | ${g.duration_ms}ms | [Logs](${path.basename(g.log_path)}) |`);
});
fs.writeFileSync(reportMdPath, mdLines.join('\n'));

// Index JSON
const index = {
    report: reportJsonPath,
    stamp: stampPath,
    gates: report.gates.reduce((acc, g) => {
        acc[g.id] = {
            status: g.status,
            logs: g.log_path,
            outputs: g.output_paths
        };
        return acc;
    }, {})
};
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

console.log(`[Unified Gate] Finished. Verdict: ${report.verdict}`);
console.log(`  Report: ${reportJsonPath}`);

process.exit(report.verdict === 'passed' ? 0 : 1);
