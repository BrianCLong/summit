"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateReleaseGate = evaluateReleaseGate;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Evaluates the release gate for a given branch by fetching CI artifacts
 * and running them through the OPA policy engine.
 */
async function evaluateReleaseGate(branch) {
    const opaInput = await fetchArtifacts(branch);
    const inputPath = path.join(process.cwd(), `opa-input-${Date.now()}.json`);
    fs.writeFileSync(inputPath, JSON.stringify(opaInput));
    try {
        // Find the OPA policy file. Assuming it's in the repo root /opa/policies/
        const repoRoot = findRepoRoot(process.cwd());
        const policyPath = path.join(repoRoot, 'opa/policies/release-gate.rego');
        // Execute OPA evaluation
        const cmd = `opa eval -d ${policyPath} -i ${inputPath} "data.summit.release.decision" --format json`;
        const output = (0, child_process_1.execSync)(cmd).toString();
        const result = JSON.parse(output);
        if (!result.result || result.result.length === 0) {
            throw new Error('OPA returned no results');
        }
        const decision = result.result[0].expressions[0].value;
        // OPA represents sets as objects with 'true' values in JSON
        const violations = decision.violations
            ? (Array.isArray(decision.violations) ? decision.violations : Object.keys(decision.violations))
            : [];
        return {
            allowed: decision.allow,
            violations,
            reason: decision.allow ? 'All release gates passed' : 'Release gate requirements not met',
            metadata: {
                ...decision,
                evaluationTimestamp: new Date().toISOString(),
                branch
            }
        };
    }
    catch (error) {
        console.error('OPA evaluation failed:', error);
        return {
            allowed: false,
            reason: `Internal error during policy evaluation: ${error instanceof Error ? error.message : String(error)}`,
            metadata: {
                error: error instanceof Error ? error.stack : String(error),
                branch
            }
        };
    }
    finally {
        if (fs.existsSync(inputPath)) {
            try {
                fs.unlinkSync(inputPath);
            }
            catch (e) {
                // Ignore unlink errors
            }
        }
    }
}
/**
 * Fetches artifacts from the CI environment.
 * In production, this reads from well-known paths where previous CI steps
 * have stored their reports (coverage, audit, etc.).
 */
async function fetchArtifacts(branch) {
    const coveragePath = path.join(process.cwd(), 'coverage/coverage-summary.json');
    const auditPath = path.join(process.cwd(), 'npm-audit.json');
    const ciArtifactsPath = path.join(process.cwd(), 'ci-artifacts.json');
    let coverage = 0;
    if (fs.existsSync(coveragePath)) {
        try {
            const data = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
            // Handle both istanbul and other formats
            coverage = data.total?.lines?.pct || data.coverage || 0;
        }
        catch (e) {
            console.warn('Failed to parse coverage-summary.json');
        }
    }
    else {
        // Fallback to environment variable for testing/manual runs
        coverage = parseInt(process.env.CODE_COVERAGE || '0', 10);
    }
    let auditStatus = 'unknown';
    let vulnCount = 0;
    if (fs.existsSync(auditPath)) {
        try {
            const data = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
            vulnCount = data.metadata?.vulnerabilities?.total || 0;
            auditStatus = vulnCount === 0 ? 'clean' : 'dirty';
        }
        catch (e) {
            console.warn('Failed to parse npm-audit.json');
        }
    }
    else {
        auditStatus = process.env.SECURITY_AUDIT || 'unknown';
        vulnCount = parseInt(process.env.VULN_COUNT || '0', 10);
    }
    let ciStatus = process.env.CI_STATUS || 'success';
    let isolation = process.env.TENANT_ISOLATION || 'ok';
    let driftResolved = process.env.DRIFT_RESOLVED !== 'false';
    if (fs.existsSync(ciArtifactsPath)) {
        try {
            const data = JSON.parse(fs.readFileSync(ciArtifactsPath, 'utf8'));
            ciStatus = data.status || ciStatus;
            isolation = data.tenant_isolation || isolation;
            driftResolved = data.drift_resolved !== false;
        }
        catch (e) {
            console.warn('Failed to parse ci-artifacts.json');
        }
    }
    return {
        branch,
        ci_artifacts: {
            status: ciStatus,
            tenant_isolation: isolation,
            drift_resolved: driftResolved
        },
        test_reports: {
            coverage: coverage,
            e2e: process.env.E2E_STATUS || 'green'
        },
        npm_audit: {
            status: auditStatus,
            vulnerabilities: vulnCount
        }
    };
}
/**
 * Helper to find the repository root by looking for the .git directory.
 */
function findRepoRoot(currentDir) {
    let dir = currentDir;
    while (dir !== path.parse(dir).root) {
        if (fs.existsSync(path.join(dir, '.git')) || fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
            return dir;
        }
        dir = path.dirname(dir);
    }
    return currentDir; // Fallback
}
