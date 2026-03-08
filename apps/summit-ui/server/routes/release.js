"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.releaseRouter = void 0;
/**
 * /api/release/gonogo
 *
 * Aggregates provenance, SBOM, OPA policy checks, cosign verification status,
 * and evidence bundle state into a single Go/No-Go verdict.
 */
const express_1 = require("express");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const child_process_1 = require("child_process");
const config_js_1 = require("../config.js");
const git_js_1 = require("../utils/git.js");
const metrics_js_1 = require("../utils/metrics.js");
exports.releaseRouter = (0, express_1.Router)();
async function checkOPAPolicies() {
    let files;
    try {
        files = await (0, promises_1.readdir)(config_js_1.PATHS.ciPolicies);
    }
    catch {
        return [];
    }
    const checks = [];
    for (const file of files.filter((f) => (0, path_1.extname)(f) === '.rego')) {
        let content = '';
        try {
            content = await (0, promises_1.readFile)((0, path_1.join)(config_js_1.PATHS.ciPolicies, file), 'utf-8');
        }
        catch {
            continue;
        }
        // Heuristic: look for `deny[...]` or `violation[...]` rules
        const hasDeny = /deny\s*\[/.test(content) || /violation\s*\[/.test(content);
        const name = (0, path_1.basename)(file, '.rego').replace(/_/g, ' ');
        // Try to run opa eval if available; fall back to static analysis
        let result = 'unknown';
        let details = 'OPA binary not available – static analysis only';
        try {
            (0, child_process_1.execSync)('which opa', { stdio: 'ignore' });
            // opa is available; evaluate against empty input
            (0, child_process_1.execSync)(`opa eval -d "${(0, path_1.join)(config_js_1.PATHS.ciPolicies, file)}" "data" 2>/dev/null`, {
                stdio: 'ignore', timeout: 5000,
            });
            result = 'pass';
            details = 'OPA parsed without errors';
        }
        catch {
            if (hasDeny) {
                result = 'warn';
                details = `Policy defines deny/violation rules – manual review required`;
            }
            else {
                result = 'unknown';
                details = 'OPA not available; policy file exists';
            }
        }
        checks.push({ name, file, result, details });
    }
    return checks;
}
async function checkSbom() {
    const sbomPatterns = ['.artifacts/sbom', '.ci/sbom', 'sbom'];
    const entries = [];
    for (const rel of sbomPatterns) {
        const dir = (0, path_1.join)(config_js_1.REPO_ROOT, rel);
        try {
            const files = await (0, promises_1.readdir)(dir);
            for (const f of files) {
                const full = (0, path_1.join)(dir, f);
                const info = await (0, promises_1.stat)(full);
                entries.push({
                    file: `${rel}/${f}`,
                    exists: true,
                    sizeBytes: info.size,
                    mtime: info.mtime.toISOString(),
                });
            }
        }
        catch { /* dir doesn't exist */ }
    }
    // Check for SBOM scripts
    try {
        const scriptDir = (0, path_1.join)(config_js_1.PATHS.ciScripts, 'sbom');
        const scripts = await (0, promises_1.readdir)(scriptDir);
        for (const s of scripts) {
            entries.push({ file: `.ci/scripts/sbom/${s}`, exists: true, sizeBytes: 0, mtime: '' });
        }
    }
    catch { /* ok */ }
    return entries;
}
async function checkEvidence() {
    const checks = [];
    // .artifacts/pr directory
    try {
        const files = (await (0, promises_1.readdir)(config_js_1.PATHS.artifactsPr)).filter((f) => f !== 'schema.json');
        checks.push({ label: 'PR evidence artifacts', present: files.length > 0, details: `${files.length} artifact file(s) in .artifacts/pr/` });
    }
    catch {
        checks.push({ label: 'PR evidence artifacts', present: false, details: '.artifacts/pr/ not found' });
    }
    // cosign script
    const cosignScript = (0, path_1.join)(config_js_1.PATHS.ciScripts, 'cosign_sign_verify.sh');
    try {
        await (0, promises_1.stat)(cosignScript);
        checks.push({ label: 'Cosign sign/verify script', present: true, details: '.ci/scripts/cosign_sign_verify.sh exists' });
    }
    catch {
        checks.push({ label: 'Cosign sign/verify script', present: false, details: 'cosign_sign_verify.sh not found' });
    }
    // OPA policies
    try {
        const policies = (await (0, promises_1.readdir)(config_js_1.PATHS.ciPolicies)).filter((f) => (0, path_1.extname)(f) === '.rego');
        checks.push({ label: 'OPA/Rego policies', present: policies.length > 0, details: `${policies.length} policy file(s) in .ci/policies/` });
    }
    catch {
        checks.push({ label: 'OPA/Rego policies', present: false, details: '.ci/policies/ not found' });
    }
    // release evidence packager
    const packager = (0, path_1.join)(config_js_1.PATHS.ciScripts, 'release', 'evidence_packager.ts');
    try {
        await (0, promises_1.stat)(packager);
        checks.push({ label: 'Evidence packager script', present: true, details: '.ci/scripts/release/evidence_packager.ts exists' });
    }
    catch {
        checks.push({ label: 'Evidence packager script', present: false, details: 'evidence_packager.ts not found' });
    }
    return checks;
}
// GET /api/release/gonogo
exports.releaseRouter.get('/gonogo', async (_req, res) => {
    (0, metrics_js_1.incCounter)('summit_ui_gonogo_total', 'Go/No-Go page loads');
    const [commit, tags, policies, sbom, evidence] = await Promise.all([
        Promise.resolve((0, git_js_1.getLatestCommit)()),
        Promise.resolve((0, git_js_1.getTags)()),
        checkOPAPolicies(),
        checkSbom(),
        checkEvidence(),
    ]);
    const signedCommits = (0, git_js_1.countSignedCommits)(50);
    const provenance = {
        latestTag: tags[0] ?? null,
        latestCommit: commit.hash,
        commitMessage: commit.message,
        author: commit.author,
        date: commit.date,
        signedCommits,
    };
    // Determine verdict
    const hasFailedPolicy = policies.some((p) => p.result === 'fail');
    const hasMissingEvidence = evidence.some((e) => !e.present && e.label.includes('artifact'));
    let verdict;
    if (hasFailedPolicy || hasMissingEvidence) {
        verdict = 'NO-GO';
    }
    else if (policies.some((p) => p.result === 'warn') || policies.length === 0) {
        verdict = 'PENDING';
    }
    else {
        verdict = 'GO';
    }
    res.json({ verdict, provenance, policies, sbom, evidence, generatedAt: new Date().toISOString() });
});
