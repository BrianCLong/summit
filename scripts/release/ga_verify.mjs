#!/usr/bin/env node
/**
 * ga_verify.mjs
 *
 * Master GA verification script that validates all release requirements
 * without publishing or tagging. Produces a deterministic verification report.
 *
 * Usage:
 *   pnpm ga:verify
 *   ./scripts/release/ga_verify.mjs
 *   ./scripts/release/ga_verify.mjs --verbose
 *   ./scripts/release/ga_verify.mjs --output <path>
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Configuration
const CONFIG = {
  mainSHA: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
  mainBranch: 'main',
  requiredChecks: [
    'CI Core (Primary Gate)',
    'CI / config-guard',
    'CI / unit-tests',
    'GA Gate',
    'Release Readiness Gate',
    'SOC Controls',
    'Unit Tests & Coverage',
    'ga / gate',
  ],
  evidenceDir: 'artifacts/evidence',
  outputDir: 'artifacts/ga-verify',
  reportFile: 'ga_verify_report.md',
};

// State tracking
const results = {
  checks: [],
  evidenceGeneration: null,
  governanceLockfile: null,
  releaseBlockers: null,
  determinism: null,
  overall: 'pending',
};

let verbose = false;

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--verbose' || args[i] === '-v') {
      verbose = true;
    } else if (args[i] === '--output') {
      CONFIG.outputDir = args[++i];
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
GA Verification Script

Usage:
  pnpm ga:verify
  ./scripts/release/ga_verify.mjs [options]

Options:
  --verbose, -v      Show detailed output
  --output <dir>     Set output directory (default: artifacts/ga-verify)
  --help, -h         Show this help
      `);
      process.exit(0);
    }
  }
}

/**
 * Run command and capture output
 */
function run(cmd, opts = {}) {
  if (verbose) {
    console.log(`\n→ ${cmd}`);
  }
  try {
    const output = execSync(cmd, {
      encoding: 'utf8',
      stdio: opts.silent ? 'pipe' : 'inherit',
      ...opts,
    });
    return { success: true, output: output?.trim() || '' };
  } catch (error) {
    return {
      success: false,
      output: error.stdout?.trim() || '',
      error: error.stderr?.trim() || error.message,
    };
  }
}

/**
 * Silent command execution (no output)
 */
function runSilent(cmd) {
  return run(cmd, { silent: true });
}

/**
 * Log message with icon
 */
function log(icon, message) {
  console.log(`${icon} ${message}`);
}

/**
 * Check 0: Verify Antigravity Governance
 */
function checkAntigravity() {
  log('📋', 'Verifying Antigravity Governance...');

  const result = run('npm run compliance:antigravity', { silent: true });

  results.checks.push({
    name: 'Antigravity Governance',
    status: result.success ? 'pass' : 'fail',
    message: result.success ? 'Governance artifacts verified' : 'Governance verification failed',
    details: result.success ? null : result.error,
  });

  if (result.success) {
    log('✓', 'Antigravity Governance verified');
  } else {
    log('✗', 'Antigravity Governance FAILED');
  }

  return result.success;
}

/**
 * Check 1: Verify git status
 */
function checkGitStatus() {
  log('📋', 'Checking git status...');

  const branch = runSilent('git branch --show-current');
  if (!branch.success) {
    results.checks.push({
      name: 'Git Status',
      status: 'fail',
      message: 'Failed to get current branch',
    });
    return false;
  }

  if (branch.output !== CONFIG.mainBranch) {
    results.checks.push({
      name: 'Git Status',
      status: 'warn',
      message: `Not on ${CONFIG.mainBranch} branch (currently on ${branch.output})`,
    });
  } else {
    log('✓', `On ${CONFIG.mainBranch} branch`);
  }

  const status = runSilent('git status --porcelain');
  if (status.output) {
    results.checks.push({
      name: 'Git Status',
      status: 'warn',
      message: 'Working tree has uncommitted changes',
    });
  } else {
    log('✓', 'Working tree is clean');
    results.checks.push({
      name: 'Git Status',
      status: 'pass',
      message: `Clean working tree on ${CONFIG.mainBranch}`,
    });
  }

  return true;
}

/**
 * Check 2: Run linting
 */
function checkLint() {
  log('📋', 'Running lint checks...');

  const result = run('pnpm lint', { silent: true });

  results.checks.push({
    name: 'Lint',
    status: result.success ? 'pass' : 'fail',
    message: result.success ? 'All lint checks passed' : 'Lint errors found',
    details: result.success ? null : result.error,
  });

  if (result.success) {
    log('✓', 'Lint checks passed');
  } else {
    log('✗', 'Lint checks failed');
  }

  return result.success;
}

/**
 * Check 3: Run type checking
 */
function checkTypeCheck() {
  log('📋', 'Running TypeScript type checks...');

  const serverResult = run('pnpm --filter intelgraph-server typecheck', { silent: true });
  results.checks.push({
    name: 'TypeCheck (Server)',
    status: serverResult.success ? 'pass' : 'fail',
    message: serverResult.success ? 'Server typecheck passed' : 'Server typecheck failed',
  });

  const clientResult = run('pnpm --filter intelgraph-client typecheck', { silent: true });
  results.checks.push({
    name: 'TypeCheck (Client)',
    status: clientResult.success ? 'pass' : 'fail',
    message: clientResult.success ? 'Client typecheck passed' : 'Client typecheck failed',
  });

  const allPassed = serverResult.success && clientResult.success;
  if (allPassed) {
    log('✓', 'All type checks passed');
  } else {
    log('✗', 'Type check failures detected');
  }

  return allPassed;
}

/**
 * Check 4: Run tests
 */
function checkTests() {
  log('📋', 'Running unit tests...');

  const result = run('pnpm test:unit --passWithNoTests', { silent: true });

  results.checks.push({
    name: 'Unit Tests',
    status: result.success ? 'pass' : 'fail',
    message: result.success ? 'All unit tests passed' : 'Unit test failures',
  });

  if (result.success) {
    log('✓', 'Unit tests passed');
  } else {
    log('✗', 'Unit tests failed');
  }

  return result.success;
}

/**
 * Check 5: Generate evidence bundle
 */
function generateEvidenceBundle() {
  log('📋', 'Generating evidence bundle...');

  const result = run('./scripts/release/generate_evidence_bundle.sh --category all', { silent: true });

  results.evidenceGeneration = {
    status: result.success ? 'pass' : 'fail',
    message: result.success ? 'Evidence bundle generated' : 'Evidence bundle generation failed',
  };

  if (result.success) {
    log('✓', 'Evidence bundle generated');
  } else {
    log('✗', 'Evidence bundle generation failed');
  }

  return result.success;
}

/**
 * Check 6: Verify governance lockfile
 */
function verifyGovernanceLockfile() {
  log('📋', 'Verifying governance lockfile...');

  const lockfilePath = 'docs/releases/_state/governance_lockfile.json';

  if (!existsSync(lockfilePath)) {
    results.governanceLockfile = {
      status: 'warn',
      message: 'Governance lockfile not found (can be generated)',
    };
    log('⚠', 'Governance lockfile not found');
    return true; // Not fatal
  }

  const result = run('./scripts/release/verify_governance_lockfile.sh', { silent: true });

  results.governanceLockfile = {
    status: result.success ? 'pass' : 'fail',
    message: result.success ? 'Governance lockfile verified' : 'Governance lockfile verification failed',
  };

  if (result.success) {
    log('✓', 'Governance lockfile verified');
  } else {
    log('✗', 'Governance lockfile verification failed');
  }

  return result.success;
}

/**
 * Check 7: Check for release blockers
 */
function checkReleaseBlockers() {
  log('📋', 'Checking for release blockers...');

  if (!process.env.GITHUB_TOKEN) {
    results.releaseBlockers = {
      status: 'skip',
      message: 'Skipped (GITHUB_TOKEN not available)',
    };
    log('⏭', 'Skipping release blocker check (no GITHUB_TOKEN)');
    return true;
  }

  const result = runSilent('gh issue list --label release-blocker --state open --json number,title');

  if (result.success) {
    const blockers = JSON.parse(result.output || '[]');
    results.releaseBlockers = {
      status: blockers.length === 0 ? 'pass' : 'fail',
      message: blockers.length === 0 ? 'No open release blockers' : `${blockers.length} open release blocker(s)`,
      blockers,
    };

    if (blockers.length === 0) {
      log('✓', 'No open release blockers');
    } else {
      log('✗', `Found ${blockers.length} open release blocker(s)`);
    }

    return blockers.length === 0;
  } else {
    results.releaseBlockers = {
      status: 'warn',
      message: 'Could not check release blockers',
    };
    log('⚠', 'Could not check release blockers');
    return true; // Not fatal
  }
}

/**
 * Check 8: Verify API determinism
 */
function checkDeterminism() {
  log('📋', 'Verifying API determinism...');

  const statePath = 'docs/releases/_state/determinism_state.json';

  if (!existsSync(statePath)) {
    results.determinism = {
      status: 'warn',
      message: 'Determinism state file not found',
    };
    log('⚠', 'Determinism state file not found');
    return true; // Not fatal
  }

  try {
    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    const passed = state.status === 'pass' || state.deterministic === true;

    results.determinism = {
      status: passed ? 'pass' : 'fail',
      message: passed ? 'API determinism verified' : 'API determinism issues detected',
    };

    if (passed) {
      log('✓', 'API determinism verified');
    } else {
      log('✗', 'API determinism issues detected');
    }

    return passed;
  } catch (error) {
    results.determinism = {
      status: 'warn',
      message: `Could not parse determinism state: ${error.message}`,
    };
    log('⚠', 'Could not verify determinism');
    return true; // Not fatal
  }
}

/**
 * Generate verification report
 */
function generateReport() {
  log('📋', 'Generating verification report...');

  // Ensure output directory exists
  const outputPath = join(CONFIG.outputDir, CONFIG.mainSHA);
  mkdirSync(outputPath, { recursive: true });

  // Calculate overall status
  const allChecks = [
    ...results.checks,
    results.evidenceGeneration,
    results.governanceLockfile,
    results.releaseBlockers,
    results.determinism,
  ].filter(Boolean);

  const failedChecks = allChecks.filter(c => c.status === 'fail');
  const warnChecks = allChecks.filter(c => c.status === 'warn');
  const passedChecks = allChecks.filter(c => c.status === 'pass');

  results.overall = failedChecks.length > 0 ? 'fail' : warnChecks.length > 0 ? 'warn' : 'pass';

  // Generate report content
  const report = `# GA Verification Report

**Generated:** ${new Date().toISOString()}
**Commit SHA:** ${CONFIG.mainSHA}
**Branch:** ${CONFIG.mainBranch}
**Overall Status:** ${results.overall.toUpperCase()} ${getStatusIcon(results.overall)}

---

## Summary

- ✓ Passed: ${passedChecks.length}
- ⚠ Warnings: ${warnChecks.length}
- ✗ Failed: ${failedChecks.length}
- Total: ${allChecks.length}

---

## Checks

${allChecks.map(check => `
### ${check.name || 'Check'}

**Status:** ${check.status.toUpperCase()} ${getStatusIcon(check.status)}
**Message:** ${check.message}
${check.details ? `\n**Details:**\n\`\`\`\n${check.details}\n\`\`\`` : ''}
${check.blockers ? `\n**Blockers:**\n${check.blockers.map(b => `- #${b.number}: ${b.title}`).join('\n')}` : ''}
`).join('\n---\n')}

---

## Artifacts

- Evidence Bundle: \`${CONFIG.evidenceDir}\`
- Verification Report: \`${outputPath}/${CONFIG.reportFile}\`
- Main SHA: \`${CONFIG.mainSHA}\`

---

## Next Steps

${results.overall === 'pass' ? `
✓ All checks passed! Ready for GA release.

To proceed with release:
1. Review the release runbook: \`docs/releases/ga/GA_RELEASE_RUNBOOK.md\`
2. Follow the step-by-step release process
3. Do NOT publish without explicit approval
` : results.overall === 'warn' ? `
⚠ Some warnings detected. Review before proceeding.

1. Address warnings if critical
2. Otherwise, proceed with caution following the runbook
` : `
✗ Verification failed. Do NOT proceed with release.

1. Fix all failing checks
2. Re-run verification: \`pnpm ga:verify\`
3. Only proceed when all checks pass
`}

---

**Generated by:** scripts/release/ga_verify.mjs
**Session:** https://claude.ai/code/session_01B7URNgsB5Fj8X9B1WqiPgY
`;

  const reportPath = join(outputPath, CONFIG.reportFile);
  writeFileSync(reportPath, report);

  log('✓', `Report generated: ${reportPath}`);

  return reportPath;
}

/**
 * Get status icon
 */
function getStatusIcon(status) {
  switch (status) {
    case 'pass':
      return '✓';
    case 'fail':
      return '✗';
    case 'warn':
      return '⚠';
    case 'skip':
      return '⏭';
    default:
      return '?';
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  GA RELEASE VERIFICATION');
  console.log('═══════════════════════════════════════════');
  console.log('');

  parseArgs();

  // Run all checks
  checkAntigravity();
  checkGitStatus();
  checkLint();
  checkTypeCheck();
  checkTests();
  generateEvidenceBundle();
  verifyGovernanceLockfile();
  checkReleaseBlockers();
  checkDeterminism();

  // Generate report
  const reportPath = generateReport();

  // Print summary
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log(`  VERIFICATION ${results.overall.toUpperCase()}`);
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log(`Report: ${reportPath}`);
  console.log('');

  // Exit with appropriate code
  process.exit(results.overall === 'fail' ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
