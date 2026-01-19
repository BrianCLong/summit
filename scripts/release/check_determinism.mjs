#!/usr/bin/env node

/**
 * Determinism Check Script
 * Scans the codebase for nondeterministic patterns that could affect build reproducibility.
 * Patterns checked:
 * - Date.now(), new Date() (Runtime timestamps)
 * - toISOString() (Often used with Date)
 * - localeCompare (Locale-dependent sorting)
 * - fs.readdir (Unordered file listing)
 */

import { promises as fs } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// Configuration
const CONFIG = {
  ignoreDirs: [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    'test-results',
    '.cache',
    'artifacts',
    'generated'
  ],
  ignoreFiles: [
    'check_determinism.mjs', // Ignore self
    'package-lock.json',
    'pnpm-lock.yaml',
    'yarn.lock'
  ],
  extensions: ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx'],
  patterns: [
    {
      regex: /Date\.now\(\)/g,
      message: 'Runtime timestamp usage (Date.now()) detected. Use a deterministic timestamp source or stamp.json.',
      severity: 'error'
    },
    {
      regex: /new Date\(\)/g,
      message: 'Runtime timestamp usage (new Date()) detected. Use a deterministic timestamp source or stamp.json.',
      severity: 'error'
    },
    {
      regex: /\.toISOString\(\)/g,
      message: 'Date serialization (toISOString()) detected. Ensure the source date is deterministic.',
      severity: 'warning'
    },
    {
      regex: /\.localeCompare\(/g,
      message: 'Locale-dependent comparison detected. Use codepoint comparison for deterministic sorting.',
      severity: 'error'
    },
    {
      regex: /fs\.readdir\(/g,
      message: 'fs.readdir() returns unsorted files. Ensure you sort the result.',
      severity: 'warning'
    },
    {
      regex: /fs\.readdirSync\(/g,
      message: 'fs.readdirSync() returns unsorted files. Ensure you sort the result.',
      severity: 'warning'
    }
  ]
};

async function scanFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const violations = [];

    // Skip large files or minified code roughly
    if (content.length > 500000) return [];

    CONFIG.patterns.forEach(pattern => {
      const matches = content.match(pattern.regex);
      if (matches) {
        // Find line numbers
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (pattern.regex.test(line)) {
            // Check for disable comments
            if (line.includes('// determinism:ignore') || line.includes('/* determinism:ignore */')) {
              return;
            }

            violations.push({
              file: filePath,
              line: index + 1,
              message: pattern.message,
              severity: pattern.severity,
              code: line.trim()
            });
          }
        });
      }
    });

    return violations;
  } catch (error) {
    console.error(`Error reading ${filePath}: ${error.message}`);
    return [];
  }
}

async function walkDir(dir) {
  const files = await fs.readdir(dir);
  let results = [];

  for (const file of files) {
    const fullPath = join(dir, file);
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      if (!CONFIG.ignoreDirs.includes(file)) {
        results = results.concat(await walkDir(fullPath));
      }
    } else {
      const ext = fullPath.substring(fullPath.lastIndexOf('.'));
      if (CONFIG.extensions.includes(ext) && !CONFIG.ignoreFiles.includes(file)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

async function main() {
  const rootDir = process.cwd();
  console.log(`🔍 Scanning for nondeterministic patterns in ${rootDir}...`);

  const files = await walkDir(rootDir);
  console.log(`Checking ${files.length} files...`);

  let allViolations = [];

  for (const file of files) {
    const violations = await scanFile(file);
    if (violations.length > 0) {
      allViolations = allViolations.concat(violations);
    }
  }

  // Filter out test files from strict errors, maybe?
  // For now, treat tests as code that should also be deterministic if possible,
  // but maybe lower severity?
  // User instruction: "Blockers to hunt: ... Required fix: all runtime times -> write only to stamp.json; never inside hashed artifacts."
  // This implies strictness.

  if (allViolations.length > 0) {
    console.log('\n⚠️  Determinism Violations Found:');

    let errorCount = 0;

    allViolations.forEach(v => {
      const relPath = relative(rootDir, v.file);
      const icon = v.severity === 'error' ? '❌' : '⚠️';
      console.log(`${icon} ${relPath}:${v.line} - ${v.message}`);
      console.log(`   Code: ${v.code}`);

      if (v.severity === 'error') errorCount++;
    });

    console.log(`\nFound ${allViolations.length} issues (${errorCount} errors).`);

    if (process.argv.includes('--fail-on-error') && errorCount > 0) {
      console.error('❌ FAILED: Deterministic build requirements not met.');
      process.exit(1);
    }
  } else {
    console.log('✅ No determinism violations found.');
  }
}

if (process.argv[1].endsWith('check_determinism.mjs')) {
    main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}
