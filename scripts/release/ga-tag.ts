#!/usr/bin/env tsx

import { execSync } from 'child_process';
import semver from 'semver';
import { argv, exit } from 'process';
import { fileURLToPath } from 'url';

export const run = (args: string[]) => {
  const versionInput = args[0];
  const dryRun = args.includes('--dry-run');

  if (!versionInput) {
    console.error('Error: Version input is required.');
    console.log('Usage: tsx scripts/release/ga-tag.ts <version> [--dry-run]');
    exit(1);
  }

  const normalizedVersion = versionInput.startsWith('v')
    ? versionInput
    : `v${versionInput}`;

  if (!semver.valid(normalizedVersion)) {
    console.error(
      `Error: Invalid version format: "${versionInput}". Please use a valid semver format (e.g., 1.2.3).`,
    );
    exit(1);
  }

  const gitBranch = execSync('git rev-parse --abbrev-ref HEAD')
    .toString()
    .trim();
  if (gitBranch !== 'main') {
    console.error(
      `Error: Must be on the "main" branch to create a GA tag. Current branch: "${gitBranch}"`,
    );
    exit(1);
  }

  const gitStatus = execSync('git status --porcelain').toString().trim();
  if (gitStatus) {
    console.error(
      'Error: Working tree is not clean. Please commit or stash your changes.',
    );
    exit(1);
  }

  const existingTags = execSync('git tag').toString().split('\n');
  if (existingTags.includes(normalizedVersion)) {
    console.error(`Error: Tag "${normalizedVersion}" already exists.`);
    exit(1);
  }

  console.log(`Normalized version: ${normalizedVersion}`);
  console.log(`Dry run: ${dryRun}`);

  if (dryRun) {
    console.log('Dry run complete. No tag was created.');
  } else {
    try {
      execSync(
        `git tag -a "${normalizedVersion}" -m "Release ${normalizedVersion}"`,
      );
      console.log(`Successfully created annotated tag: ${normalizedVersion}`);
      console.log('Next steps:');
      console.log('  - git push origin --tags');
    } catch (error) {
      console.error('Error creating tag:', error);
      exit(1);
    }
  }
};

// This allows the script to be run directly from the command line
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  run(argv.slice(2));
}
