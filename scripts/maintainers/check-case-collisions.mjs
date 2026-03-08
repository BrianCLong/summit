#!/usr/bin/env node

/**
 * Summit Case-Sensitivity Collision Detector
 *
 * Detects files and directories in the git index that differ only by case.
 * This prevents divergence between case-sensitive (Linux) and
 * case-insensitive (macOS, Windows) file systems.
 */

import { execSync } from 'child_process';

function checkCollisions() {
  const args = process.argv.slice(2);
  const warnOnly = args.includes('--warn-only');

  console.log('Checking for case-sensitivity path collisions in git index...');

  let files;
  try {
    // Get all files tracked by git
    const output = execSync('git ls-files', { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
    files = output.split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error: Failed to run git ls-files. Are you in a git repository?');
    process.exit(1);
  }

  // To detect directory collisions, we need to check every segment of every path.
  // Map: Lowercase Segment Path -> Set of Original Case Segment Paths
  // Example: "docs/security" -> {"docs/security", "Docs/Security"}
  const segmentMap = new Map();

  for (const file of files) {
    const parts = file.split('/');
    let currentPath = '';
    let currentLowerPath = '';

    for (let i = 0; i < parts.length; i++) {
      const segment = parts[i];
      const segmentLower = segment.toLowerCase();

      const prevPath = currentPath;
      currentPath = prevPath ? `${prevPath}/${segment}` : segment;
      currentLowerPath = currentLowerPath ? `${currentLowerPath}/${segmentLower}` : segmentLower;

      if (!segmentMap.has(currentLowerPath)) {
        segmentMap.set(currentLowerPath, new Set());
      }
      segmentMap.get(currentLowerPath).add(currentPath);
    }
  }

  const collisions = [];
  for (const [lowerPath, originalPaths] of segmentMap.entries()) {
    if (originalPaths.size > 1) {
      collisions.push({
        lowerPath,
        variants: Array.from(originalPaths).sort()
      });
    }
  }

  if (collisions.length > 0) {
    console.error('\n❌ ERROR: Case-sensitivity collisions detected!');
    console.error('The following paths differ only by case, which causes issues on macOS/Windows:');

    collisions.forEach(collision => {
      console.error(`\n  Group (canonical lowercase: ${collision.lowerPath}):`);
      collision.variants.forEach(variant => console.error(`    - ${variant}`));
      console.error(`  Recommendation: Choose one canonical casing and rename/merge the others.`);
    });

    console.error('\nSee docs/runbooks/case-sensitivity.md for remediation steps.');

    if (warnOnly) {
      console.warn('\n⚠️  Warn-only mode: Exiting with success despite collisions.');
      process.exit(0);
    } else {
      process.exit(1);
    }
  }

  console.log('✅ No case-sensitivity collisions found.');
  process.exit(0);
}

checkCollisions();
