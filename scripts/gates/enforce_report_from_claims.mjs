#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const defaultScanDirs = ['server/src/routes', 'server/src/services', 'server/src/agents', 'agents', 'packages/reporting'];
const defaultAllowlist = ['docs/architecture/REPORTING_CONTRACT.md', 'scripts/gates/enforce_report_from_claims.mjs'];
const defaultDisallowedPatterns = [
  /retrieval_context/i,
  /raw_context/i,
  /context_dump/i,
  /prompt_context/i,
  /report\s*\+=/i,
  /reportText\s*\+=/i,
];

const textExt = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.md', '.yml', '.yaml']);

function parseCsv(value) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

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

/**
 * @param {{
 *   repoRoot?: string,
 *   scanDirs?: string[],
 *   allowlist?: string[],
 *   patterns?: RegExp[]
 * }} [options]
 */
export function runReportGate(options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();

  const envScanDirs = process.env.REPORT_GATE_SCAN_DIRS ? parseCsv(process.env.REPORT_GATE_SCAN_DIRS) : null;
  const envAllowlist = process.env.REPORT_GATE_ALLOWLIST ? parseCsv(process.env.REPORT_GATE_ALLOWLIST) : null;

  const scanDirs = (options.scanDirs ?? envScanDirs ?? defaultScanDirs).filter((dir) =>
    fs.existsSync(path.join(repoRoot, dir))
  );
  const allowlist = new Set(options.allowlist ?? envAllowlist ?? defaultAllowlist);
  const patterns = options.patterns ?? defaultDisallowedPatterns;

  const violations = [];

  for (const relativeDir of scanDirs) {
    const files = collectFiles(path.join(repoRoot, relativeDir));

    for (const file of files) {
      const relPath = path.relative(repoRoot, file);
      if (allowlist.has(relPath)) continue;

      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          violations.push({ file: relPath, pattern: pattern.toString() });
        }
      }
    }
  }

  return violations;
}

function main() {
  const violations = runReportGate();

  if (violations.length > 0) {
    console.error('enforce_report_from_claims: FAIL');
    for (const violation of violations) {
      console.error(`- ${violation.file} matched ${violation.pattern}`);
    }
    process.exit(1);
  }

  console.log('enforce_report_from_claims: OK');
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  main();
}
