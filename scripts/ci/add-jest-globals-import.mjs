#!/usr/bin/env node
/**
 * Wave A Codemod: Add @jest/globals import to test files
 *
 * Usage: node scripts/ci/add-jest-globals-import.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const JEST_GLOBALS_IMPORT = "import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';";

const dryRun = process.argv.includes('--dry-run');
let fixed = 0;
let skipped = 0;
let errors = 0;

function findTestFiles(dir, files = []) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory() && !entry.includes('node_modules')) {
        findTestFiles(fullPath, files);
      } else if (entry.endsWith('.test.ts') || entry.endsWith('.test.tsx')) {
        files.push(fullPath);
      }
    } catch {
      // Skip inaccessible files
    }
  }
  return files;
}

function needsJestGlobals(content) {
  return !content.includes("from '@jest/globals'") &&
         !content.includes('from "@jest/globals"');
}

function addJestGlobalsImport(content) {
  // Find the first import statement or the start of the file
  const lines = content.split('\n');
  let insertIndex = 0;

  // Skip any initial comments or empty lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*') || line === '') {
      insertIndex = i + 1;
    } else if (line.startsWith('import ')) {
      insertIndex = i;
      break;
    } else {
      // Non-import, non-comment line - insert before it
      insertIndex = i;
      break;
    }
  }

  // Insert the import
  lines.splice(insertIndex, 0, JEST_GLOBALS_IMPORT);
  return lines.join('\n');
}

// Find all test files
const serverDir = join(process.cwd(), 'server');
const testDirs = [
  join(serverDir, 'tests'),
  join(serverDir, 'src'),
];

console.log(`🔍 Scanning for test files missing @jest/globals import...`);
console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

const allFiles = [];
for (const dir of testDirs) {
  try {
    findTestFiles(dir, allFiles);
  } catch {
    // Directory might not exist
  }
}

console.log(`📁 Found ${allFiles.length} test files total\n`);

for (const file of allFiles) {
  try {
    const content = readFileSync(file, 'utf-8');
    const relPath = relative(process.cwd(), file);

    if (needsJestGlobals(content)) {
      const newContent = addJestGlobalsImport(content);

      if (dryRun) {
        console.log(`  [would fix] ${relPath}`);
      } else {
        writeFileSync(file, newContent, 'utf-8');
        console.log(`  ✅ ${relPath}`);
      }
      fixed++;
    } else {
      skipped++;
    }
  } catch (err) {
    console.error(`  ❌ Error processing ${file}: ${err.message}`);
    errors++;
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`📊 Summary:`);
console.log(`   ${dryRun ? 'Would fix' : 'Fixed'}: ${fixed} files`);
console.log(`   Skipped (already has import): ${skipped} files`);
console.log(`   Errors: ${errors} files`);

if (dryRun && fixed > 0) {
  console.log(`\n💡 Run without --dry-run to apply changes`);
}

process.exit(errors > 0 ? 1 : 0);
