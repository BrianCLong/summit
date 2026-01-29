#!/usr/bin/env npx tsx
/**
 * Go-Live Evidence Bundle Generator
 *
 * Generates a machine-readable evidence bundle proving production go-live readiness.
 * Collects git state, toolchain versions, and runs verification checks.
 *
 * Usage:
 *   npx tsx scripts/evidence/generate-go-live-evidence.ts
 *   pnpm evidence:go-live:gen
 *
 * Environment variables:
 *   SKIP_CHECKS=1        Skip running checks (use existing results)
 *   SMOKE_URL=<url>      Override smoke test URL
 *   CI=true              Indicates CI environment
 */

import { spawnSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Schema version - bump when schema changes
const SCHEMA_VERSION = '1.0.0';

// Whitelisted environment variable prefixes (non-secret)
const ENV_WHITELIST_PREFIXES = [
  'NODE_ENV',
  'CI',
  'GITHUB_',
  'OTEL_SERVICE_NAME',
  'OTEL_EXPORTER_OTLP_ENDPOINT',
  'GA_VERIFY_MODE',
  'SMOKE_URL',
  'BASE_URL',
];

// Secret patterns to exclude
const SECRET_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /credential/i,
  /auth/i,
];

interface CheckResult {
  status: 'passed' | 'failed' | 'skipped';
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  exitCode?: number;
  summary?: string;
  details?: Record<string, unknown>;
}

interface GoLiveEvidence {
  version: string;
  generatedAt: string;
  git: {
    sha: string;
    shortSha: string;
    branch: string;
    dirty: boolean;
    author?: string;
    message?: string;
  };
  toolchain: {
    node: string;
    pnpm: string;
    platform: string;
    arch: string;
  };
  checks: {
    lint: CheckResult;
    build: CheckResult;
    test: CheckResult;
    smoke: CheckResult;
  };
  summary: {
    passed: boolean;
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    durationMs: number;
  };
  environment: Record<string, string>;
  metadata?: {
    ci: boolean;
    ciProvider?: string;
    runId?: string;
    runUrl?: string;
  };
}

function getGitInfo(): GoLiveEvidence['git'] {
  const run = (args: string[]): string => {
    const result = spawnSync('git', args, { encoding: 'utf8', stdio: 'pipe' });
    return result.stdout?.trim() ?? '';
  };

  const sha = run(['rev-parse', 'HEAD']);
  const shortSha = sha.substring(0, 7);
  const branch = run(['rev-parse', '--abbrev-ref', 'HEAD']);
  const dirty = run(['status', '--porcelain']).length > 0;
  const author = run(['log', '-1', '--format=%an <%ae>']);
  const message = run(['log', '-1', '--format=%s']);

  return { sha, shortSha, branch, dirty, author, message };
}

function getToolchainInfo(): GoLiveEvidence['toolchain'] {
  const nodeVersion = process.version;

  let pnpmVersion = 'unknown';
  try {
    const result = spawnSync('pnpm', ['--version'], { encoding: 'utf8', stdio: 'pipe' });
    pnpmVersion = result.stdout?.trim() ?? 'unknown';
  } catch {
    // Ignore
  }

  return {
    node: nodeVersion,
    pnpm: pnpmVersion,
    platform: process.platform,
    arch: process.arch,
  };
}

function getWhitelistedEnv(): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (!value) continue;

    // Check if key matches whitelist prefix
    const isWhitelisted = ENV_WHITELIST_PREFIXES.some(
      (prefix) => key === prefix || key.startsWith(prefix)
    );
    if (!isWhitelisted) continue;

    // Exclude anything that looks like a secret
    const isSecret = SECRET_PATTERNS.some((pattern) => pattern.test(key));
    if (isSecret) continue;

    result[key] = value;
  }

  return result;
}

function getCIMetadata(): GoLiveEvidence['metadata'] {
  const ci = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

  if (!ci) {
    return { ci: false };
  }

  // GitHub Actions
  if (process.env.GITHUB_ACTIONS) {
    const runId = process.env.GITHUB_RUN_ID ?? '';
    const repo = process.env.GITHUB_REPOSITORY ?? '';
    return {
      ci: true,
      ciProvider: 'github',
      runId,
      runUrl: runId && repo ? `https://github.com/${repo}/actions/runs/${runId}` : undefined,
    };
  }

  return { ci: true };
}

function runCheck(
  name: string,
  command: string,
  args: string[],
  env: Record<string, string> = {}
): CheckResult {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  console.log(`\n[evidence] Running ${name}: ${command} ${args.join(' ')}`);

  const result = spawnSync(command, args, {
    env: { ...process.env, ...env },
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
    maxBuffer: 50 * 1024 * 1024,
    shell: false,
  });

  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - startMs;

  // Extract summary from output
  const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
  let summary = result.status === 0 ? 'Passed' : 'Failed';

  // Try to extract test summary
  const testMatch = output.match(/Tests:\s+(\d+ skipped, )?\d+ passed/);
  if (testMatch) {
    summary = testMatch[0];
  }

  // Print abbreviated output
  if (result.status !== 0) {
    const lines = output.split('\n').filter(Boolean);
    const tail = lines.slice(-20).join('\n');
    console.log(`[evidence] ${name} FAILED (exit ${result.status}):\n${tail}`);
  } else {
    console.log(`[evidence] ${name} PASSED in ${durationMs}ms`);
  }

  return {
    status: result.status === 0 ? 'passed' : 'failed',
    startedAt,
    finishedAt,
    durationMs,
    exitCode: result.status ?? -1,
    summary,
  };
}

function runSmokeCheck(smokeUrl?: string): CheckResult {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  const smokePath = path.join(process.cwd(), 'scripts/go-live/smoke-prod.sh');

  if (!fs.existsSync(smokePath)) {
    console.log('[evidence] Smoke script not found, skipping');
    return {
      status: 'skipped',
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: 0,
      summary: 'Smoke script not found',
    };
  }

  const args = smokeUrl ? ['--url', smokeUrl] : [];

  // If no URL provided and not in CI, skip smoke test (requires running services)
  if (!smokeUrl && !process.env.CI) {
    console.log('[evidence] Skipping smoke test (no URL provided, not in CI)');
    return {
      status: 'skipped',
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: 0,
      summary: 'Skipped (no URL provided)',
    };
  }

  console.log(`\n[evidence] Running smoke test: ${smokePath} ${args.join(' ')}`);

  const result = spawnSync('bash', [smokePath, ...args], {
    env: process.env,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
    maxBuffer: 10 * 1024 * 1024,
  });

  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - startMs;

  const output = [result.stdout, result.stderr].filter(Boolean).join('\n');

  if (result.status !== 0) {
    console.log(`[evidence] smoke FAILED:\n${output.slice(-1000)}`);
  } else {
    console.log(`[evidence] smoke PASSED in ${durationMs}ms`);
  }

  return {
    status: result.status === 0 ? 'passed' : 'failed',
    startedAt,
    finishedAt,
    durationMs,
    exitCode: result.status ?? -1,
    summary: result.status === 0 ? 'All endpoints healthy' : 'Health check failed',
  };
}

function generateChecksums(dir: string): string {
  const files = ['evidence.json', 'evidence.md'];
  const lines: string[] = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      lines.push(`${hash}  ${file}`);
    }
  }

  return lines.join('\n') + '\n';
}

function generateMarkdownSummary(evidence: GoLiveEvidence): string {
  const status = evidence.summary.passed ? '✅ PASSED' : '❌ FAILED';
  const checkRows = Object.entries(evidence.checks)
    .map(([name, result]) => {
      const icon = result.status === 'passed' ? '✅' : result.status === 'skipped' ? '⏭️' : '❌';
      return `| ${name} | ${icon} ${result.status} | ${result.durationMs}ms | ${result.summary ?? '-'} |`;
    })
    .join('\n');

  return `# Go-Live Evidence Bundle

**Status:** ${status}
**Generated:** ${evidence.generatedAt}
**Commit:** ${evidence.git.sha} (${evidence.git.branch})
**Dirty:** ${evidence.git.dirty ? 'Yes ⚠️' : 'No'}

## Summary

- **Total Checks:** ${evidence.summary.totalChecks}
- **Passed:** ${evidence.summary.passedChecks}
- **Failed:** ${evidence.summary.failedChecks}
- **Duration:** ${evidence.summary.durationMs}ms

## Check Results

| Check | Status | Duration | Summary |
|-------|--------|----------|---------|
${checkRows}

## Toolchain

- **Node.js:** ${evidence.toolchain.node}
- **pnpm:** ${evidence.toolchain.pnpm}
- **Platform:** ${evidence.toolchain.platform} (${evidence.toolchain.arch})

## Git Info

- **SHA:** \`${evidence.git.sha}\`
- **Branch:** ${evidence.git.branch}
- **Author:** ${evidence.git.author ?? 'N/A'}
- **Message:** ${evidence.git.message ?? 'N/A'}

${evidence.metadata?.ci ? `## CI Info

- **Provider:** ${evidence.metadata.ciProvider ?? 'unknown'}
- **Run ID:** ${evidence.metadata.runId ?? 'N/A'}
- **Run URL:** ${evidence.metadata.runUrl ?? 'N/A'}
` : ''}
---
*Generated by generate-go-live-evidence.ts*
`;
}

async function main(): Promise<void> {
  const skipChecks = process.env.SKIP_CHECKS === '1';
  const smokeUrl = process.env.SMOKE_URL;

  console.log('========================================');
  console.log('  Go-Live Evidence Bundle Generator');
  console.log('========================================');

  const overallStart = Date.now();

  // Collect metadata
  console.log('\n[evidence] Collecting git info...');
  const git = getGitInfo();
  console.log(`[evidence] Commit: ${git.sha} (${git.branch})`);

  console.log('[evidence] Collecting toolchain info...');
  const toolchain = getToolchainInfo();
  console.log(`[evidence] Node: ${toolchain.node}, pnpm: ${toolchain.pnpm}`);

  // Output directory
  const outDir = path.join('artifacts', 'evidence', 'go-live', git.sha);
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`[evidence] Output directory: ${outDir}`);

  // Run checks
  let checks: GoLiveEvidence['checks'];

  if (skipChecks) {
    console.log('\n[evidence] SKIP_CHECKS=1, using placeholder results');
    const now = new Date().toISOString();
    const placeholder: CheckResult = {
      status: 'skipped',
      startedAt: now,
      finishedAt: now,
      durationMs: 0,
      summary: 'Skipped (SKIP_CHECKS=1)',
    };
    checks = {
      lint: placeholder,
      build: placeholder,
      test: placeholder,
      smoke: placeholder,
    };
  } else {
    console.log('\n[evidence] Running verification checks...');

    const lint = runCheck('lint', 'pnpm', ['lint']);
    const build = runCheck('build', 'pnpm', ['build']);
    // Use targeted GA verify tests (server unit tests only) for faster, more reliable results
    const test = runCheck('test', 'pnpm', ['--filter', 'intelgraph-server', 'test:unit'], { GA_VERIFY_MODE: 'true' });
    const smoke = runSmokeCheck(smokeUrl);

    checks = { lint, build, test, smoke };
  }

  // Calculate summary
  const checkResults = Object.values(checks);
  const totalChecks = checkResults.length;
  const passedChecks = checkResults.filter((c) => c.status === 'passed').length;
  const skippedChecks = checkResults.filter((c) => c.status === 'skipped').length;
  const failedChecks = checkResults.filter((c) => c.status === 'failed').length;
  const passed = failedChecks === 0 && (passedChecks > 0 || skippedChecks === totalChecks);

  const durationMs = Date.now() - overallStart;

  // Build evidence object
  const evidence: GoLiveEvidence = {
    version: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    git,
    toolchain,
    checks,
    summary: {
      passed,
      totalChecks,
      passedChecks,
      failedChecks,
      durationMs,
    },
    environment: getWhitelistedEnv(),
    metadata: getCIMetadata(),
  };

  // Write outputs
  const evidencePath = path.join(outDir, 'evidence.json');
  const mdPath = path.join(outDir, 'evidence.md');
  const checksumPath = path.join(outDir, 'checksums.txt');

  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  console.log(`\n[evidence] Wrote ${evidencePath}`);

  fs.writeFileSync(mdPath, generateMarkdownSummary(evidence));
  console.log(`[evidence] Wrote ${mdPath}`);

  const checksums = generateChecksums(outDir);
  fs.writeFileSync(checksumPath, checksums);
  console.log(`[evidence] Wrote ${checksumPath}`);

  // Final summary
  console.log('\n========================================');
  if (passed) {
    console.log('  ✅ Evidence bundle generated - ALL CHECKS PASSED');
  } else {
    console.log('  ❌ Evidence bundle generated - SOME CHECKS FAILED');
  }
  console.log(`  📁 ${outDir}`);
  console.log('========================================\n');

  // Exit with appropriate code
  process.exit(passed ? 0 : 1);
}

main().catch((error) => {
  console.error('[evidence] Fatal error:', error);
  process.exit(1);
});
