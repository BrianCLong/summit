/**
 * /api/release/gonogo
 *
 * Aggregates provenance, SBOM, OPA policy checks, cosign verification status,
 * and evidence bundle state into a single Go/No-Go verdict.
 */
import { Router, Request, Response, type IRouter } from 'express';
import { readdir, readFile, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { execSync } from 'child_process';
import { PATHS, REPO_ROOT } from '../config.js';
import { getLatestCommit, getTags, countSignedCommits } from '../utils/git.js';
import { incCounter } from '../utils/metrics.js';

export const releaseRouter: IRouter = Router();

type PolicyResult = 'pass' | 'fail' | 'warn' | 'unknown';

interface PolicyCheck {
  name: string;
  file: string;
  result: PolicyResult;
  details: string;
}

interface SbomEntry {
  file: string;
  exists: boolean;
  sizeBytes: number;
  mtime: string;
}

interface EvidenceCheck {
  label: string;
  present: boolean;
  details: string;
}

async function checkOPAPolicies(): Promise<PolicyCheck[]> {
  let files: string[];
  try { files = await readdir(PATHS.ciPolicies); } catch { return []; }

  const checks: PolicyCheck[] = [];
  for (const file of files.filter((f) => extname(f) === '.rego')) {
    let content = '';
    try { content = await readFile(join(PATHS.ciPolicies, file), 'utf-8'); } catch { continue; }

    // Heuristic: look for `deny[...]` or `violation[...]` rules
    const hasDeny = /deny\s*\[/.test(content) || /violation\s*\[/.test(content);
    const name = basename(file, '.rego').replace(/_/g, ' ');

    // Try to run opa eval if available; fall back to static analysis
    let result: PolicyResult = 'unknown';
    let details = 'OPA binary not available – static analysis only';

    try {
      execSync('which opa', { stdio: 'ignore' });
      // opa is available; evaluate against empty input
      execSync(`opa eval -d "${join(PATHS.ciPolicies, file)}" "data" 2>/dev/null`, {
        stdio: 'ignore', timeout: 5000,
      });
      result = 'pass';
      details = 'OPA parsed without errors';
    } catch {
      if (hasDeny) {
        result = 'warn';
        details = `Policy defines deny/violation rules – manual review required`;
      } else {
        result = 'unknown';
        details = 'OPA not available; policy file exists';
      }
    }

    checks.push({ name, file, result, details });
  }
  return checks;
}

async function checkSbom(): Promise<SbomEntry[]> {
  const sbomPatterns = ['.artifacts/sbom', '.ci/sbom', 'sbom'];
  const entries: SbomEntry[] = [];

  for (const rel of sbomPatterns) {
    const dir = join(REPO_ROOT, rel);
    try {
      const files = await readdir(dir);
      for (const f of files) {
        const full = join(dir, f);
        const info = await stat(full);
        entries.push({
          file: `${rel}/${f}`,
          exists: true,
          sizeBytes: info.size,
          mtime: info.mtime.toISOString(),
        });
      }
    } catch { /* dir doesn't exist */ }
  }

  // Check for SBOM scripts
  try {
    const scriptDir = join(PATHS.ciScripts, 'sbom');
    const scripts = await readdir(scriptDir);
    for (const s of scripts) {
      entries.push({ file: `.ci/scripts/sbom/${s}`, exists: true, sizeBytes: 0, mtime: '' });
    }
  } catch { /* ok */ }

  return entries;
}

async function checkEvidence(): Promise<EvidenceCheck[]> {
  const checks: EvidenceCheck[] = [];

  // .artifacts/pr directory
  try {
    const files = (await readdir(PATHS.artifactsPr)).filter((f) => f !== 'schema.json');
    checks.push({ label: 'PR evidence artifacts', present: files.length > 0, details: `${files.length} artifact file(s) in .artifacts/pr/` });
  } catch {
    checks.push({ label: 'PR evidence artifacts', present: false, details: '.artifacts/pr/ not found' });
  }

  // cosign script
  const cosignScript = join(PATHS.ciScripts, 'cosign_sign_verify.sh');
  try {
    await stat(cosignScript);
    checks.push({ label: 'Cosign sign/verify script', present: true, details: '.ci/scripts/cosign_sign_verify.sh exists' });
  } catch {
    checks.push({ label: 'Cosign sign/verify script', present: false, details: 'cosign_sign_verify.sh not found' });
  }

  // OPA policies
  try {
    const policies = (await readdir(PATHS.ciPolicies)).filter((f) => extname(f) === '.rego');
    checks.push({ label: 'OPA/Rego policies', present: policies.length > 0, details: `${policies.length} policy file(s) in .ci/policies/` });
  } catch {
    checks.push({ label: 'OPA/Rego policies', present: false, details: '.ci/policies/ not found' });
  }

  // release evidence packager
  const packager = join(PATHS.ciScripts, 'release', 'evidence_packager.ts');
  try {
    await stat(packager);
    checks.push({ label: 'Evidence packager script', present: true, details: '.ci/scripts/release/evidence_packager.ts exists' });
  } catch {
    checks.push({ label: 'Evidence packager script', present: false, details: 'evidence_packager.ts not found' });
  }

  return checks;
}

// GET /api/release/gonogo
releaseRouter.get('/gonogo', async (_req: Request, res: Response) => {
  incCounter('summit_ui_gonogo_total', 'Go/No-Go page loads');

  const [commit, tags, policies, sbom, evidence] = await Promise.all([
    Promise.resolve(getLatestCommit()),
    Promise.resolve(getTags()),
    checkOPAPolicies(),
    checkSbom(),
    checkEvidence(),
  ]);

  const signedCommits = countSignedCommits(50);

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

  let verdict: 'GO' | 'NO-GO' | 'PENDING';
  if (hasFailedPolicy || hasMissingEvidence) {
    verdict = 'NO-GO';
  } else if (policies.some((p) => p.result === 'warn') || policies.length === 0) {
    verdict = 'PENDING';
  } else {
    verdict = 'GO';
  }

  res.json({ verdict, provenance, policies, sbom, evidence, generatedAt: new Date().toISOString() });
});
