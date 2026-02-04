#!/usr/bin/env npx tsx
/**
 * Go-Live Tag Creator
 *
 * Creates an immutable, annotated git tag for a verified go-live release.
 * Only creates tags for commits with passing evidence bundles.
 *
 * Usage:
 *   npx tsx scripts/release/create-go-live-tag.ts [evidence-dir]
 *   pnpm release:go-live:tag
 *
 * Options:
 *   --dry-run        Preview tag without creating it
 *   --force          Create tag even if checks failed (marks as pre-release)
 *   --push           Push tag to origin after creation
 *
 * Environment variables:
 *   EVIDENCE_DIR     Path to evidence directory
 *   VERSION          Release version (default: from package.json)
 *   DRY_RUN          Set to 1 for dry-run mode
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

function gitRun(args: string[], dryRun = false): { success: boolean; output: string } {
  if (dryRun) {
    console.log(`[dry-run] git ${args.join(' ')}`);
    return { success: true, output: '' };
  }

  const result = spawnSync('git', args, {
    encoding: 'utf8',
    stdio: 'pipe',
  });

  return {
    success: result.status === 0,
    output: [result.stdout, result.stderr].filter(Boolean).join('\n').trim(),
  };
}

function tagExists(tagName: string): boolean {
  const result = gitRun(['tag', '-l', tagName]);
  return result.output.includes(tagName);
}

function parseArgs(): { dryRun: boolean; force: boolean; push: boolean; evidenceDir?: string } {
  const args = process.argv.slice(2);
  let dryRun = process.env.DRY_RUN === '1';
  let force = false;
  let push = false;
  let evidenceDir: string | undefined;

  for (const arg of args) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg === '--force') force = true;
    else if (arg === '--push') push = true;
    else if (!arg.startsWith('--')) evidenceDir = arg;
  }

  return { dryRun, force, push, evidenceDir };
}

function main(): void {
  console.log('========================================');
  console.log('  Go-Live Tag Creator');
  console.log('========================================\n');

  const { dryRun, force, push, evidenceDir: argEvidenceDir } = parseArgs();

  if (dryRun) {
    console.log('[tag] Running in DRY-RUN mode\n');
  }

  // Get evidence directory
  const evidenceDir = argEvidenceDir || process.env.EVIDENCE_DIR || getDefaultEvidenceDir();
  console.log(`[tag] Evidence directory: ${evidenceDir}`);

  // Load evidence
  const evidencePath = path.join(evidenceDir, 'evidence.json');
  if (!fs.existsSync(evidencePath)) {
    console.error(`\n❌ Evidence not found: ${evidencePath}`);
    console.error('   Run "pnpm evidence:go-live:gen" first.');
    process.exit(1);
  }

  const evidence: GoLiveEvidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  console.log(`[tag] Loaded evidence for commit ${evidence.git.sha}`);

  // Check if evidence passed
  if (!evidence.summary.passed && !force) {
    console.error('\n❌ Cannot create go-live tag: evidence checks failed');
    console.error('   Use --force to create a pre-release tag anyway.');
    process.exit(1);
  }

  if (evidence.git.dirty) {
    console.warn('\n⚠️  Warning: Evidence was generated from a dirty working tree');
  }

  // Get version and create tag name
  const version = process.env.VERSION || getPackageVersion();
  const tagName = evidence.summary.passed ? `v${version}` : `v${version}-prerelease`;
  console.log(`[tag] Tag name: ${tagName}`);

  // Check if tag already exists
  if (tagExists(tagName)) {
    console.error(`\n❌ Tag ${tagName} already exists`);
    console.error('   Increment version or delete existing tag first.');
    process.exit(1);
  }

  // Create tag message
  const tagMessage = `Go-Live Release ${version}

Evidence Summary:
- Commit: ${evidence.git.sha}
- Branch: ${evidence.git.branch}
- Checks: ${evidence.summary.passedChecks}/${evidence.summary.totalChecks} passed
- Status: ${evidence.summary.passed ? 'PASSED' : 'FAILED (pre-release)'}
- Generated: ${evidence.generatedAt}
${evidence.metadata?.runUrl ? `- CI Run: ${evidence.metadata.runUrl}` : ''}

Evidence Schema Version: ${evidence.version}
Evidence Bundle: ${evidenceDir}

This tag was created from a verified go-live evidence bundle.
`;

  // Create annotated tag
  console.log(`\n[tag] Creating annotated tag ${tagName} at ${evidence.git.sha}`);

  const tagResult = gitRun(
    ['tag', '-a', tagName, evidence.git.sha, '-m', tagMessage],
    dryRun
  );

  if (!tagResult.success && !dryRun) {
    console.error(`\n❌ Failed to create tag: ${tagResult.output}`);
    process.exit(1);
  }

  console.log(`[tag] ✅ Tag ${tagName} created`);

  // Push if requested
  if (push) {
    console.log(`[tag] Pushing tag ${tagName} to origin...`);
    const pushResult = gitRun(['push', 'origin', tagName], dryRun);

    if (!pushResult.success && !dryRun) {
      console.error(`\n❌ Failed to push tag: ${pushResult.output}`);
      process.exit(1);
    }

    console.log(`[tag] ✅ Tag pushed to origin`);
  }

  // Summary
  console.log('\n========================================');
  console.log(`  ✅ Go-Live Tag Created: ${tagName}`);
  if (dryRun) {
    console.log('  (DRY-RUN - no changes made)');
  }
  console.log('========================================\n');

  // Print next steps
  console.log('Next steps:');
  if (!push && !dryRun) {
    console.log(`  1. Push the tag: git push origin ${tagName}`);
  }
  console.log(`  2. Create GitHub release from tag ${tagName}`);
  console.log('  3. Attach evidence bundle artifacts to release');
}

main();
