#!/usr/bin/env ts-node
/**
 * GA Tag Creator
 *
 * Creates deterministic, validated GA release tags with proper semver validation,
 * working tree checks, and branch verification.
 *
 * Usage:
 *   ./ga-tag.ts --version 2.0.0 [--dry-run] [--push] [--branch main]
 *   ./ga-tag.ts --version v2.0.0 --dry-run
 *   ./ga-tag.ts --help
 *
 * Features:
 * - Normalizes version input (handles with/without 'v' prefix)
 * - Validates semantic versioning (major.minor.patch)
 * - Ensures clean working tree
 * - Verifies correct branch (default: main)
 * - Prevents duplicate tags
 * - Creates annotated tag: ga/vX.Y.Z
 * - Dry-run mode for testing
 * - Optional push to remote
 */

import { execSync } from 'child_process';
import * as process from 'process';

interface Args {
  version: string;
  dryRun: boolean;
  push: boolean;
  branch: string;
  help: boolean;
}

const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function parseArgs(): Args {
  const args: Partial<Args> = {
    dryRun: false,
    push: false,
    branch: 'main',
    help: false,
  };

  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--dry-run' || arg === '-n') {
      args.dryRun = true;
    } else if (arg === '--push' || arg === '-p') {
      args.push = true;
    } else if (arg === '--version' || arg === '-v') {
      args.version = argv[++i];
    } else if (arg === '--branch' || arg === '-b') {
      args.branch = argv[++i];
    }
  }

  return args as Args;
}

function printHelp(): void {
  console.log(`
GA Tag Creator - Create deterministic, validated GA release tags

Usage:
  ./ga-tag.ts --version <version> [options]

Options:
  -v, --version <version>   Version to tag (e.g., 2.0.0 or v2.0.0)
  -n, --dry-run             Perform dry run without creating tag
  -p, --push                Push tag to remote after creation
  -b, --branch <branch>     Expected branch (default: main)
  -h, --help                Show this help message

Examples:
  ./ga-tag.ts --version 2.0.0 --dry-run
  ./ga-tag.ts --version v2.1.0 --push
  ./ga-tag.ts --version 1.5.3 --branch main --dry-run

Exit Codes:
  0  Success
  1  Invalid arguments or validation failure
  2  Git operation failure
`);
}

function execGit(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (error: any) {
    throw new Error(`Git command failed: ${cmd}\n${error.message}`);
  }
}

function normalizeVersion(version: string): string {
  // Remove 'v' prefix if present
  const normalized = version.startsWith('v') ? version.slice(1) : version;
  return normalized;
}

function validateSemver(version: string): boolean {
  return SEMVER_REGEX.test(version);
}

function checkWorkingTreeClean(): void {
  const status = execGit('git status --porcelain');

  if (status.length > 0) {
    console.error('❌ Error: Working tree is not clean. Please commit or stash changes.');
    console.error('\nUncommitted changes:');
    console.error(status);
    process.exit(1);
  }

  console.log('✓ Working tree is clean');
}

function checkBranch(expectedBranch: string): void {
  const currentBranch = execGit('git rev-parse --abbrev-ref HEAD');

  if (currentBranch !== expectedBranch) {
    console.error(`❌ Error: Not on expected branch '${expectedBranch}' (currently on '${currentBranch}')`);
    console.error(`\nSwitch to the correct branch with:`);
    console.error(`  git checkout ${expectedBranch}`);
    process.exit(1);
  }

  console.log(`✓ On expected branch: ${expectedBranch}`);
}

function checkTagExists(tag: string): boolean {
  try {
    execGit(`git rev-parse ${tag}`);
    return true;
  } catch {
    return false;
  }
}

function createAnnotatedTag(tag: string, version: string, dryRun: boolean): void {
  const message = `GA Release ${version}

This is a General Availability (GA) release.

Created: ${new Date().toISOString()}
Branch: ${execGit('git rev-parse --abbrev-ref HEAD')}
Commit: ${execGit('git rev-parse HEAD')}
`;

  const cmd = `git tag -a "${tag}" -m "${message}"`;

  if (dryRun) {
    console.log(`\n[DRY RUN] Would create tag with command:`);
    console.log(`  ${cmd}`);
    console.log(`\nTag message:`);
    console.log(message);
  } else {
    execGit(cmd);
    console.log(`✓ Created annotated tag: ${tag}`);
  }
}

function pushTag(tag: string, dryRun: boolean): void {
  const cmd = `git push origin ${tag}`;

  if (dryRun) {
    console.log(`\n[DRY RUN] Would push tag with command:`);
    console.log(`  ${cmd}`);
  } else {
    console.log(`\nPushing tag to remote...`);
    execGit(cmd);
    console.log(`✓ Pushed tag to remote: ${tag}`);
  }
}

function printNextSteps(tag: string, version: string, pushed: boolean, dryRun: boolean): void {
  console.log(`\n${'='.repeat(60)}`);

  if (dryRun) {
    console.log('DRY RUN COMPLETE - No changes were made');
    console.log(`${'='.repeat(60)}`);
    console.log(`\nTo create the tag for real, run without --dry-run:`);
    console.log(`  ./scripts/release/ga-tag.ts --version ${version}`);
  } else {
    console.log('GA TAG CREATED SUCCESSFULLY');
    console.log(`${'='.repeat(60)}`);
    console.log(`\nTag created: ${tag}`);
    console.log(`Version: ${version}`);

    if (!pushed) {
      console.log(`\nNext steps:`);
      console.log(`  1. Push the tag to trigger the GA release workflow:`);
      console.log(`     git push origin ${tag}`);
      console.log(`\n  2. Monitor the workflow at:`);
      console.log(`     https://github.com/$(git config --get remote.origin.url | sed 's/.*://;s/.git$//')/actions`);
    } else {
      console.log(`\n✓ Tag has been pushed to remote`);
      console.log(`\nMonitor the GA release workflow at:`);
      console.log(`  https://github.com/$(git config --get remote.origin.url | sed 's/.*://;s/.git$//')/actions`);
    }

    console.log(`\n  The workflow will:`);
    console.log(`    - Build release artifacts (server/dist, client/dist)`);
    console.log(`    - Generate checksums (SHA256)`);
    console.log(`    - Generate SBOM (CycloneDX + SPDX)`);
    console.log(`    - Generate SLSA provenance`);
    console.log(`    - Sign artifacts with cosign (keyless)`);
    console.log(`    - Create GitHub Release with all artifacts`);
  }

  console.log(`\n${'='.repeat(60)}`);
}

function main(): void {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.version) {
    console.error('❌ Error: --version is required');
    console.error('\nRun with --help for usage information');
    process.exit(1);
  }

  console.log('GA Tag Creator');
  console.log('='.repeat(60));

  // Normalize and validate version
  const normalized = normalizeVersion(args.version);
  const tag = `ga/v${normalized}`;

  console.log(`\nInput version: ${args.version}`);
  console.log(`Normalized: ${normalized}`);
  console.log(`Tag: ${tag}`);

  if (args.dryRun) {
    console.log(`Mode: DRY RUN`);
  }
  console.log('');

  // Validate semver
  if (!validateSemver(normalized)) {
    console.error(`❌ Error: Invalid semantic version: ${normalized}`);
    console.error('\nExpected format: major.minor.patch (e.g., 2.0.0)');
    console.error('Must use numeric values only, no letters or pre-release tags');
    process.exit(1);
  }
  console.log(`✓ Valid semantic version: ${normalized}`);

  // Check if we're in a git repository
  try {
    execGit('git rev-parse --git-dir');
  } catch {
    console.error('❌ Error: Not in a git repository');
    process.exit(2);
  }

  // Check working tree is clean
  checkWorkingTreeClean();

  // Check we're on the expected branch
  checkBranch(args.branch);

  // Check tag doesn't already exist
  if (checkTagExists(tag)) {
    console.error(`❌ Error: Tag '${tag}' already exists`);
    console.error('\nTo view existing tag:');
    console.error(`  git show ${tag}`);
    console.error('\nTo delete the tag (if needed):');
    console.error(`  git tag -d ${tag}                    # Delete locally`);
    console.error(`  git push origin :refs/tags/${tag}    # Delete remotely`);
    process.exit(1);
  }
  console.log(`✓ Tag does not exist: ${tag}`);

  // Create the tag
  console.log('');
  createAnnotatedTag(tag, normalized, args.dryRun);

  // Push if requested
  if (args.push) {
    pushTag(tag, args.dryRun);
  }

  // Print next steps
  printNextSteps(tag, normalized, args.push, args.dryRun);
}

// Run main function
try {
  main();
} catch (error: any) {
  console.error(`\n❌ Fatal error: ${error.message}`);
  process.exit(2);
}
