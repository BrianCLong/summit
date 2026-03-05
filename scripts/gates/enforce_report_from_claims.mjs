#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();

const focusedScanDirs = [
  'server/src/routes',
  'server/src/services',
  'server/src/agents',
  'agents',
  'packages/reporting',
].filter((dir) => fs.existsSync(path.join(repoRoot, dir)));

const allowedPaths = new Set([
  'docs/architecture/REPORTING_CONTRACT.md',
  'scripts/gates/enforce_report_from_claims.mjs',
]);

const disallowedPatterns = [
  /retrieval_context/i,
  /raw_context/i,
  /context_dump/i,
  /prompt_context/i,
  /report\s*\+=/i,
  /reportText\s*\+=/i,
];

const textExt = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.md', '.yml', '.yaml']);

function collectFiles(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage') continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, results);
      continue;
    }

    if (textExt.has(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }

  return results;
}

const violations = [];

for (const relativeDir of focusedScanDirs) {
  const dir = path.join(repoRoot, relativeDir);
  const files = collectFiles(dir);

  for (const file of files) {
    const relPath = path.relative(repoRoot, file);
    if (allowedPaths.has(relPath)) continue;

    const content = fs.readFileSync(file, 'utf8');
    for (const pattern of disallowedPatterns) {
      if (pattern.test(content)) {
        violations.push({ file: relPath, pattern: pattern.toString() });
      }
    }
  }
}

if (violations.length > 0) {
  console.error('enforce_report_from_claims: FAIL');
  for (const violation of violations) {
    console.error(`- ${violation.file} matched ${violation.pattern}`);
  }
  process.exit(1);
}

console.log('enforce_report_from_claims: OK');
