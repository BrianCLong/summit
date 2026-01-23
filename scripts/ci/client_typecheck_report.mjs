#!/usr/bin/env node
/**
 * client_typecheck_report.mjs
 *
 * Deterministic TypeScript error reporter for the client package.
 */

import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..');
const CLIENT_DIR = join(ROOT_DIR, 'client');
const OUTPUT_DIR = join(ROOT_DIR, 'docs', 'ops', 'typescript');
const OUTPUT_PATH = join(OUTPUT_DIR, 'client-typecheck-report.json');

const TSC_COMMAND = 'pnpm exec tsc --project tsconfig.strict.json --noEmit';

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    baseline: args.includes('--baseline') ? args[args.indexOf('--baseline') + 1] : null,
    help: args.includes('--help') || args.includes('-h')
  };
}

function runTypecheck() {
  console.log(`Running: ${TSC_COMMAND}`);
  console.log(`In directory: ${CLIENT_DIR}`);
  try {
    execSync(TSC_COMMAND, { cwd: CLIENT_DIR, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { success: true, output: '' };
  } catch (error) {
    return { success: false, output: error.stdout || error.stderr || '' };
  }
}

function parseErrors(output) {
  const errors = [];
  const errorRegex = /^(.+)\((\d+),(\d+)\): error (TS\d+): (.+)$/gm;
  let match;
  while ((match = errorRegex.exec(output)) !== null) {
    errors.push({ file: match[1].trim(), line: parseInt(match[2], 10), col: parseInt(match[3], 10), code: match[4], message: match[5].trim() });
  }
  return errors;
}

function sortErrors(errors) {
  return errors.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    if (a.line !== b.line) return a.line - b.line;
    if (a.col !== b.col) return a.col - b.col;
    return a.code.localeCompare(b.code);
  });
}

function generateReport(errors) {
  const grouped = {};
  for (const error of errors) {
    grouped[error.file] = (grouped[error.file] || 0) + 1;
  }
  return { generated: new Date().toISOString(), package: 'client', tsconfigUsed: 'tsconfig.strict.json', command: TSC_COMMAND, totalErrors: errors.length, errorsByFile: grouped, errors };
}

function main() {
  const options = parseArgs();
  if (options.help) {
    console.log('Usage: node scripts/ci/client_typecheck_report.mjs [--baseline path]');
    process.exit(0);
  }

  const { success, output } = runTypecheck();

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  if (success) {
    console.log('\n✅ Client typecheck passed with 0 errors!\n');
    writeFileSync(OUTPUT_PATH, JSON.stringify(generateReport([]), null, 2));
    console.log(`Report written to: ${OUTPUT_PATH}`);
    process.exit(0);
  }

  const errors = sortErrors(parseErrors(output));
  const report = generateReport(errors);
  writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
  console.log(`Report written to: ${OUTPUT_PATH}`);

  if (options.baseline && existsSync(options.baseline)) {
    const baseline = JSON.parse(readFileSync(options.baseline, 'utf-8'));
    const key = e => `${e.file}:${e.line}:${e.col}:${e.code}`;
    const baselineSet = new Set((baseline.errors || []).map(key));
    const newErrors = errors.filter(e => !baselineSet.has(key(e)));
    if (newErrors.length > 0) {
      console.error(`❌ ${newErrors.length} new TypeScript errors detected!`);
      process.exit(1);
    }
    console.log('✅ No new errors compared to baseline.');
    process.exit(0);
  }

  console.error(`❌ Client typecheck failed with ${errors.length} error(s).`);
  process.exit(1);
}

main();
