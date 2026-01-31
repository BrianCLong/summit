#!/usr/bin/env node

import { execSync } from 'node:child_process';

/**
 * Summit Case-Sensitivity Marshal
 * Detects case-insensitive path collisions in the git index.
 *
 * This script prevents the "macOS vs Linux duplicate-path" nightmare
 * where files differing only by case cause silent corruption.
 */

function main() {
  const args = process.argv.slice(2);
  const warnOnly = args.includes('--warn-only');
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log(`
Usage: node check-case-collisions.mjs [options]

Options:
  --warn-only    Exit with code 0 even if collisions are found.
  --help, -h     Show this help message.

Description:
  Scans the git index for files or directories that differ only by case.
  These collisions cause issues on case-insensitive filesystems like macOS
  where both "File.txt" and "file.txt" would refer to the same physical file.
    `);
    process.exit(0);
  }

  console.log('--- Case-Sensitivity Collision Detector ---');
  console.log('Scanning git index...');

  let files;
  try {
    // Use git ls-files to get all tracked files in the current index.
    // Increased maxBuffer to 100MB to handle large repositories (avoids ENOBUFS).
    const output = execSync('git ls-files', {
      encoding: 'utf-8',
      maxBuffer: 100 * 1024 * 1024
    });
    files = output.split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error: Failed to get files from git. Are you in a git repository?');
    if (error.code === 'ENOBUFS') {
      console.error('Error: Git output exceeded buffer size.');
    } else {
      console.error('Details:', error.message);
    }
    process.exit(1);
  }

  // allPaths will store every unique path and parent directory path
  const allPaths = new Set();
  for (const file of files) {
    const segments = file.split('/');
    let currentPath = '';
    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      allPaths.add(currentPath);
    }
  }

  // Group paths by their lowercase representation to find collisions
  const collisions = new Map();
  for (const path of allPaths) {
    const lower = path.toLowerCase();
    if (!collisions.has(lower)) {
      collisions.set(lower, []);
    }
    collisions.get(lower).push(path);
  }

  let foundCollisions = false;
  const collisionGroups = Array.from(collisions.entries())
    .filter(([_, group]) => group.length > 1)
    .sort(([a], [b]) => a.localeCompare(b));

  if (collisionGroups.length > 0) {
    foundCollisions = true;
    console.error(`\n❌ Found ${collisionGroups.length} case-sensitivity collision groups:\n`);

    for (const [lower, group] of collisionGroups) {
      console.error(`Group [${lower}]:`);
      group.sort().forEach(p => console.error(`  - ${p}`));
      console.error(`  Recommendation: Choose one canonical casing and 'git mv' the others.\n`);
    }
  }

  if (foundCollisions) {
    if (warnOnly) {
      console.log('⚠️ Collisions found, but exiting with 0 due to --warn-only.');
      process.exit(0);
    } else {
      console.error('FATAL: Case-sensitivity collisions detected. Fix them or use --warn-only to bypass.');
      process.exit(1);
    }
  } else {
    console.log('✅ No case-sensitivity collisions detected.');
    process.exit(0);
  }
}

main();
