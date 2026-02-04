#!/usr/bin/env npx tsx
/**
 * generate-release-notes-from-evidence.ts
 *
 * Generates release notes from go-live evidence bundle.
 * This script:
 * 1. Reads evidence from artifacts/evidence/go-live/<sha>/evidence.json
 * 2. Produces artifacts/release/<sha>/RELEASE_NOTES.md
 * 3. Fails if evidence is missing or unverifiable
 *
 * Usage:
 *   pnpm release:notes
 *   npx tsx scripts/release/generate-release-notes-from-evidence.ts [--sha <sha>]
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

// Configuration
const CONFIG = {
  evidenceBaseDir: 'artifacts/evidence/go-live',
  releaseBaseDir: 'artifacts/release',
  releaseNotesFile: 'RELEASE_NOTES.md',
  evidenceFile: 'evidence.json',
  goLiveReadinessPath: 'docs/GO_LIVE_READINESS.md',
};

interface CICheck {
  name: string;
  status: 'pass' | 'fail' | 'skip' | 'warn';
  message?: string;
}

interface Evidence {
  version: string;
  sha: string;
  timestamp: string;
  branch: string;
  checks: {
    lint: CICheck;
    build: CICheck;
    tests: CICheck;
    gaVerify: CICheck;
    smoke: CICheck;
  };
  endpoints: {
    validated: string[];
    failed: string[];
  };
  warnings: string[];
  exceptions: string[];
  metadata: {
    generator: string;
    nodeVersion: string;
    pnpmVersion: string;
  };
}

/**
 * Parse command line arguments
 */
function parseArgs(): { sha: string; verbose: boolean } {
  const args = process.argv.slice(2);
  let sha = '';
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--sha' && args[i + 1]) {
      sha = args[++i];
    } else if (args[i] === '--verbose' || args[i] === '-v') {
      verbose = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Release Notes Generator from Evidence

Usage:
  pnpm release:notes
  npx tsx scripts/release/generate-release-notes-from-evidence.ts [options]

Options:
  --sha <sha>     Use specific commit SHA (default: current HEAD)
  --verbose, -v   Show detailed output
  --help, -h      Show this help
      `);
      process.exit(0);
    }
  }

  if (!sha) {
    sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  }

  return { sha, verbose };
}

/**
 * Get status emoji
 */
function getStatusEmoji(status: string): string {
  switch (status) {
    case 'pass':
      return '✅';
    case 'fail':
      return '❌';
    case 'warn':
      return '⚠️';
    case 'skip':
      return '⏭️';
    default:
      return '❓';
  }
}

/**
 * Load evidence file
 */
function loadEvidence(sha: string): Evidence | null {
  const evidencePath = join(CONFIG.evidenceBaseDir, sha, CONFIG.evidenceFile);

  if (!existsSync(evidencePath)) {
    return null;
  }

  try {
    const content = readFileSync(evidencePath, 'utf8');
    return JSON.parse(content) as Evidence;
  } catch (error) {
    console.error(`Failed to parse evidence file: ${error}`);
    return null;
  }
}

/**
 * Verify evidence integrity
 */
function verifyEvidence(evidence: Evidence, sha: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check SHA match
  if (evidence.sha !== sha) {
    errors.push(`SHA mismatch: evidence=${evidence.sha}, expected=${sha}`);
  }

  // Check required fields
  if (!evidence.version) {
    errors.push('Missing evidence version');
  }

  if (!evidence.timestamp) {
    errors.push('Missing evidence timestamp');
  }

  if (!evidence.checks) {
    errors.push('Missing CI checks data');
  }

  // Check for critical failures
  if (evidence.checks?.gaVerify?.status === 'fail') {
    errors.push('GA verification failed - release not allowed');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate release notes markdown
 */
function generateReleaseNotes(evidence: Evidence): string {
  const date = new Date().toISOString().split('T')[0];
  const shortSha = evidence.sha.substring(0, 8);

  const checksTable = Object.entries(evidence.checks)
    .map(([name, check]) => {
      const emoji = getStatusEmoji(check.status);
      const message = check.message || '-';
      return `| ${name} | ${emoji} ${check.status.toUpperCase()} | ${message} |`;
    })
    .join('\n');

  const endpointsValidated = evidence.endpoints?.validated?.length
    ? evidence.endpoints.validated.map(e => `- \`${e}\``).join('\n')
    : '- No endpoints validated';

  const endpointsFailed = evidence.endpoints?.failed?.length
    ? evidence.endpoints.failed.map(e => `- \`${e}\``).join('\n')
    : '- None';

  const warnings = evidence.warnings?.length
    ? evidence.warnings.map(w => `- ${w}`).join('\n')
    : '- None';

  const exceptions = evidence.exceptions?.length
    ? evidence.exceptions.map(e => `- ${e}`).join('\n')
    : '- None';

  return `# Release Notes

**Commit SHA:** \`${evidence.sha}\`
**Short SHA:** \`${shortSha}\`
**Date:** ${date}
**Evidence Generated:** ${evidence.timestamp}
**Branch:** \`${evidence.branch}\`

---

## CI Checks Summary

| Check | Status | Message |
|-------|--------|---------|
${checksTable}

---

## Deployment Commands

### Docker Compose (Local/Dev)

\`\`\`bash
# Pull the specific release image
docker pull summit/intelgraph:${shortSha}

# Deploy with docker-compose
docker-compose -f docker-compose.yml up -d
\`\`\`

### Helm (Kubernetes/Production)

\`\`\`bash
# Upgrade/Install with Helm
helm upgrade --install intelgraph ./deploy/helm/intelgraph \\
  -f ./deploy/helm/intelgraph/values-prod.yaml \\
  --set image.tag=${shortSha} \\
  --namespace production

# Wait for rollout
kubectl rollout status deployment/intelgraph-api -n production
\`\`\`

See \`docs/GO_LIVE_READINESS.md\` for complete deployment playbook.

---

## Operational Validation

### Endpoints Validated

${endpointsValidated}

### Endpoints Failed

${endpointsFailed}

---

## Known Warnings/Exceptions

### Warnings

${warnings}

### Exceptions

${exceptions}

---

## Evidence Metadata

| Property | Value |
|----------|-------|
| Generator | ${evidence.metadata?.generator || 'unknown'} |
| Node Version | ${evidence.metadata?.nodeVersion || 'unknown'} |
| pnpm Version | ${evidence.metadata?.pnpmVersion || 'unknown'} |

---

## Verification

This release was generated from verified go-live evidence.

To verify this release:

\`\`\`bash
# Re-run evidence verification
pnpm evidence:go-live:verify

# Check evidence file
cat artifacts/evidence/go-live/${evidence.sha}/evidence.json
\`\`\`

---

**Generated by:** scripts/release/generate-release-notes-from-evidence.ts
`;
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  RELEASE NOTES GENERATOR');
  console.log('═══════════════════════════════════════════');
  console.log('');

  const { sha, verbose } = parseArgs();

  console.log(`Commit SHA: ${sha}`);
  console.log('');

  // Step 1: Load evidence
  console.log('📋 Loading evidence...');
  const evidence = loadEvidence(sha);

  if (!evidence) {
    console.error('');
    console.error('❌ ERROR: Evidence file not found');
    console.error(`   Expected: ${join(CONFIG.evidenceBaseDir, sha, CONFIG.evidenceFile)}`);
    console.error('');
    console.error('To generate evidence, run:');
    console.error('  pnpm evidence:go-live:generate');
    console.error('');
    process.exit(1);
  }

  console.log('✓ Evidence loaded');

  // Step 2: Verify evidence
  console.log('');
  console.log('📋 Verifying evidence...');
  const verification = verifyEvidence(evidence, sha);

  if (!verification.valid) {
    console.error('');
    console.error('❌ ERROR: Evidence verification failed');
    for (const error of verification.errors) {
      console.error(`   - ${error}`);
    }
    console.error('');
    console.error('To re-verify, run:');
    console.error('  pnpm evidence:go-live:verify');
    console.error('');
    process.exit(1);
  }

  console.log('✓ Evidence verified');

  // Step 3: Generate release notes
  console.log('');
  console.log('📋 Generating release notes...');

  const releaseNotes = generateReleaseNotes(evidence);

  // Step 4: Write release notes
  const outputDir = join(CONFIG.releaseBaseDir, sha);
  mkdirSync(outputDir, { recursive: true });

  const outputPath = join(outputDir, CONFIG.releaseNotesFile);
  writeFileSync(outputPath, releaseNotes);

  console.log(`✓ Release notes written to: ${outputPath}`);

  // Step 5: Write release manifest
  const manifest = {
    schemaVersion: '1.0.0',
    sha: evidence.sha,
    generatedAt: new Date().toISOString(),
    evidenceFile: join(CONFIG.evidenceBaseDir, sha, CONFIG.evidenceFile),
    releaseNotesFile: outputPath,
    checksStatus: {
      lint: evidence.checks.lint?.status,
      build: evidence.checks.build?.status,
      tests: evidence.checks.tests?.status,
      gaVerify: evidence.checks.gaVerify?.status,
      smoke: evidence.checks.smoke?.status,
    },
    warnings: evidence.warnings?.length || 0,
    exceptions: evidence.exceptions?.length || 0,
  };

  const manifestPath = join(outputDir, 'release-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`✓ Release manifest written to: ${manifestPath}`);

  // Summary
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  RELEASE NOTES GENERATED');
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log(`SHA:          ${sha}`);
  console.log(`Output Dir:   ${outputDir}`);
  console.log(`Notes:        ${CONFIG.releaseNotesFile}`);
  console.log(`Manifest:     release-manifest.json`);
  console.log('');

  if (verbose) {
    console.log('--- Release Notes Preview ---');
    console.log(releaseNotes);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
