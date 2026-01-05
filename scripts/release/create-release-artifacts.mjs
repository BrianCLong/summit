#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, appendFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

// This script orchestrates the creation of release artifacts.
// It is intended to be called by CI/CD pipelines.

const TAG = process.env.TAG || process.argv[2];
const PREV_TAG = process.env.PREV_TAG || process.argv[3];
const GITHUB_STEP_SUMMARY = process.env.GITHUB_STEP_SUMMARY;

if (!TAG) {
  console.error('Error: TAG is required');
  process.exit(1);
}

console.log(`Creating release artifacts for ${TAG}...`);

// 1. Generate Release Notes
const generatorScript = resolve(process.cwd(), 'scripts/release/generate-release-notes.mjs');
try {
  execSync(`node "${generatorScript}" "${TAG}" "${PREV_TAG || ''}"`, { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to generate release notes');
  process.exit(1);
}

// 2. Handle CHANGELOG integration (if applicable)
// The prompt requires: "Preserve existing “use CHANGELOG section if present” behavior only if the repo already does this"
// Since we are creating this file and have no access to legacy extraction logic in this context,
// we will rely on the commit parsing.
// If a CHANGELOG.md file exists, we might consider appending it, but usually generated notes are specific to the release.
// We'll leave this as-is for now, respecting the "otherwise keep commit-based notes as canonical" clause.

// 3. Update Step Summary
if (GITHUB_STEP_SUMMARY && existsSync(GITHUB_STEP_SUMMARY)) {
  const notesPath = resolve('dist/release/release-notes.md');
  if (existsSync(notesPath)) {
    const notes = readFileSync(notesPath, 'utf8');
    const summaryLines = [
      '## Release Notes Preview',
      '',
      ...notes.split('\n').slice(0, 30),
      '',
      ...(notes.split('\n').length > 30 ? ['... (see full release notes for more)'] : [])
    ];

    appendFileSync(GITHUB_STEP_SUMMARY, summaryLines.join('\n'));
    console.log('Added release notes preview to step summary.');
  }
}

console.log('Release artifacts created successfully.');
