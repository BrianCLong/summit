import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface ReleaseDecision {
  allowed: boolean;
  reason?: string;
  violations?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Evaluates the release gate for a given branch by fetching CI artifacts
 * and running them through the OPA policy engine.
 */
export async function evaluateReleaseGate(branch: string): Promise<ReleaseDecision> {
  const opaInput = await fetchArtifacts(branch);
  const inputPath = path.join(process.cwd(), `opa-input-${Date.now()}.json`);
  fs.writeFileSync(inputPath, JSON.stringify(opaInput));

  try {
    // Find the OPA policy file. Assuming it's in the repo root /opa/policies/
    const repoRoot = findRepoRoot(process.cwd());
    const policyPath = path.join(repoRoot, 'opa/policies/release-gate.rego');

    // Execute OPA evaluation
    const cmd = `opa eval -d ${policyPath} -i ${inputPath} "data.summit.release.decision" --format json`;
    const output = execSync(cmd).toString();
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
  } catch (error) {
    console.error('OPA evaluation failed:', error);
    return {
      allowed: false,
      reason: `Internal error during policy evaluation: ${error instanceof Error ? error.message : String(error)}`,
      metadata: {
        error: error instanceof Error ? error.stack : String(error),
        branch
      }
    };
  } finally {
    if (fs.existsSync(inputPath)) {
      try {
        fs.unlinkSync(inputPath);
      } catch (e) {
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
async function fetchArtifacts(branch: string): Promise<any> {
  const coveragePath = path.join(process.cwd(), 'coverage/coverage-summary.json');
  const auditPath = path.join(process.cwd(), 'npm-audit.json');
  const ciArtifactsPath = path.join(process.cwd(), 'ci-artifacts.json');

  let coverage = 0;
  if (fs.existsSync(coveragePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      // Handle both istanbul and other formats
      coverage = data.total?.lines?.pct || data.coverage || 0;
    } catch (e) {
      console.warn('Failed to parse coverage-summary.json');
    }
  } else {
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
    } catch (e) {
      console.warn('Failed to parse npm-audit.json');
    }
  } else {
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
    } catch (e) {
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
function findRepoRoot(currentDir: string): string {
  let dir = currentDir;
  while (dir !== path.parse(dir).root) {
    if (fs.existsSync(path.join(dir, '.git')) || fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return currentDir; // Fallback
}
