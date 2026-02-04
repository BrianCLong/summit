#!/usr/bin/env npx tsx
/**
 * Go-Live GitHub Release Creator
 *
 * Creates a GitHub release from a verified evidence bundle.
 * Attaches all evidence artifacts and generates release notes.
 *
 * Usage:
 *   npx tsx scripts/release/create-go-live-release.ts [evidence-dir]
 *   pnpm release:go-live:github
 *
 * Options:
 *   --dry-run        Preview release without creating it
 *   --draft          Create as draft release
 *   --prerelease     Mark as pre-release
 *
 * Environment variables:
 *   EVIDENCE_DIR     Path to evidence directory
 *   GITHUB_TOKEN     GitHub token for API access (required)
 *   VERSION          Release version (default: from package.json)
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

interface GoLiveEvidence {
  version: string;
  generatedAt: string;
  git: {
    sha: string;
    branch: string;
    dirty: boolean;
  };
  summary: {
    passed: boolean;
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
  };
  metadata?: {
    ci: boolean;
    runUrl?: string;
  };
}

interface ReleaseNotes {
  version: string;
  tagName: string;
  title: string;
  body: string;
  prerelease: boolean;
}

function getDefaultEvidenceDir(): string {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  const sha = result.stdout?.trim() || 'unknown';
  return path.join('artifacts', 'evidence', 'go-live', sha);
}

function getPackageVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function ghRun(args: string[], dryRun = false): { success: boolean; output: string } {
  if (dryRun) {
    console.log(`[dry-run] gh ${args.join(' ')}`);
    return { success: true, output: '' };
  }

  const result = spawnSync('gh', args, {
    encoding: 'utf8',
    stdio: 'pipe',
  });

  return {
    success: result.status === 0,
    output: [result.stdout, result.stderr].filter(Boolean).join('\n').trim(),
  };
}

function checkGhCli(): boolean {
  const result = spawnSync('gh', ['--version'], { encoding: 'utf8', stdio: 'pipe' });
  return result.status === 0;
}

function checkGhAuth(): boolean {
  const result = spawnSync('gh', ['auth', 'status'], { encoding: 'utf8', stdio: 'pipe' });
  return result.status === 0;
}

function releaseExists(tagName: string): boolean {
  const result = ghRun(['release', 'view', tagName]);
  return result.success;
}

function parseArgs(): {
  dryRun: boolean;
  draft: boolean;
  prerelease: boolean;
  evidenceDir?: string;
} {
  const args = process.argv.slice(2);
  let dryRun = false;
  let draft = false;
  let prerelease = false;
  let evidenceDir: string | undefined;

  for (const arg of args) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg === '--draft') draft = true;
    else if (arg === '--prerelease') prerelease = true;
    else if (!arg.startsWith('--')) evidenceDir = arg;
  }

  return { dryRun, draft, prerelease, evidenceDir };
}

function main(): void {
  console.log('========================================');
  console.log('  Go-Live GitHub Release Creator');
  console.log('========================================\n');

  const { dryRun, draft, prerelease: forcePrerelease, evidenceDir: argEvidenceDir } = parseArgs();

  if (dryRun) {
    console.log('[release] Running in DRY-RUN mode\n');
  }

  // Check gh CLI
  if (!checkGhCli()) {
    console.error('❌ GitHub CLI (gh) not found. Install from https://cli.github.com/');
    process.exit(1);
  }

  if (!dryRun && !checkGhAuth()) {
    console.error('❌ Not authenticated with GitHub CLI. Run: gh auth login');
    process.exit(1);
  }

  // Get evidence directory
  const evidenceDir = argEvidenceDir || process.env.EVIDENCE_DIR || getDefaultEvidenceDir();
  console.log(`[release] Evidence directory: ${evidenceDir}`);

  // Load evidence
  const evidencePath = path.join(evidenceDir, 'evidence.json');
  if (!fs.existsSync(evidencePath)) {
    console.error(`\n❌ Evidence not found: ${evidencePath}`);
    console.error('   Run "pnpm release:go-live:full" first.');
    process.exit(1);
  }

  const evidence: GoLiveEvidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  console.log(`[release] Loaded evidence for commit ${evidence.git.sha}`);

  // Load release notes
  const releaseNotesPath = path.join(evidenceDir, 'release-notes.json');
  if (!fs.existsSync(releaseNotesPath)) {
    console.error(`\n❌ Release notes not found: ${releaseNotesPath}`);
    console.error('   Run "pnpm release:go-live:notes" first.');
    process.exit(1);
  }

  const releaseNotes: ReleaseNotes = JSON.parse(fs.readFileSync(releaseNotesPath, 'utf8'));

  // Determine if pre-release
  const isPrerelease = forcePrerelease || !evidence.summary.passed;
  const tagName = isPrerelease ? `v${releaseNotes.version}-prerelease` : `v${releaseNotes.version}`;

  console.log(`[release] Tag: ${tagName}`);
  console.log(`[release] Pre-release: ${isPrerelease}`);
  console.log(`[release] Draft: ${draft}`);

  // Check if release already exists
  if (!dryRun && releaseExists(tagName)) {
    console.error(`\n❌ Release ${tagName} already exists`);
    console.error('   Delete existing release or increment version.');
    process.exit(1);
  }

  // Collect artifacts to upload
  const artifacts: string[] = [];
  const artifactFiles = [
    'evidence.json',
    'evidence.md',
    'checksums.txt',
    'sbom.cdx.json',
    'provenance.json',
    'RELEASE_NOTES.md',
  ];

  for (const file of artifactFiles) {
    const filePath = path.join(evidenceDir, file);
    if (fs.existsSync(filePath)) {
      artifacts.push(filePath);
    }
  }

  console.log(`[release] Artifacts to upload: ${artifacts.length}`);

  // Build gh release create command
  const ghArgs = ['release', 'create', tagName];

  // Add options
  ghArgs.push('--title', releaseNotes.title);
  ghArgs.push('--notes-file', path.join(evidenceDir, 'RELEASE_NOTES.md'));
  ghArgs.push('--target', evidence.git.sha);

  if (draft) {
    ghArgs.push('--draft');
  }

  if (isPrerelease) {
    ghArgs.push('--prerelease');
  }

  // Add artifacts
  for (const artifact of artifacts) {
    ghArgs.push(artifact);
  }

  // Create release
  console.log(`\n[release] Creating GitHub release ${tagName}...`);

  const result = ghRun(ghArgs, dryRun);

  if (!result.success && !dryRun) {
    console.error(`\n❌ Failed to create release: ${result.output}`);
    process.exit(1);
  }

  // Summary
  console.log('\n========================================');
  console.log(`  ✅ GitHub Release Created: ${tagName}`);
  if (dryRun) {
    console.log('  (DRY-RUN - no changes made)');
  }
  console.log('========================================\n');

  if (!dryRun && result.output) {
    console.log('Release URL:', result.output);
  }

  // Print next steps
  console.log('Next steps:');
  if (draft) {
    console.log('  1. Review the draft release on GitHub');
    console.log('  2. Publish when ready');
  } else {
    console.log('  1. Verify release artifacts on GitHub');
    console.log('  2. Announce release to stakeholders');
  }
}

main();
