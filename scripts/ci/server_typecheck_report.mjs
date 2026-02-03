#!/usr/bin/env node
/**
 * Server TypeScript Error Report Generator
 *
 * Produces a deterministic JSON report of all TypeScript errors in the server package.
 * Used by CI to track type safety regressions.
 *
 * Usage:
 *   node scripts/ci/server_typecheck_report.mjs [--output <path>] [--baseline <path>]
 *
 * Options:
 *   --output   Output path for the JSON report (default: docs/ops/typescript/server-typecheck-report.json)
 *   --baseline Path to baseline report for comparison (enables no-new-errors mode)
 */

import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '../..');
const SERVER_DIR = join(ROOT_DIR, 'server');

const DEFAULT_OUTPUT = join(ROOT_DIR, 'docs/ops/typescript/server-typecheck-report.json');
const TSC_COMMAND = 'pnpm exec tsc --noEmit';

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    output: DEFAULT_OUTPUT,
    baseline: null,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
      result.output = resolve(args[++i]);
    } else if (args[i] === '--baseline' && args[i + 1]) {
      result.baseline = resolve(args[++i]);
    }
  }

  return result;
}

/**
 * Run tsc and capture all error output
 */
async function runTypecheck() {
  return new Promise((resolve) => {
    const proc = spawn('pnpm', ['exec', 'tsc', '--noEmit'], {
      cwd: SERVER_DIR,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({
        exitCode: code,
        output: stdout + stderr,
      });
    });
  });
}

/**
 * Parse TypeScript error output into structured format
 *
 * Example line:
 * src/app.ts(682,25): error TS2769: No overload matches this call.
 */
function parseErrors(output) {
  const errors = [];
  const errorRegex = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/gm;

  let match;
  while ((match = errorRegex.exec(output)) !== null) {
    const [, file, line, col, code, message] = match;

    // Normalize file path to be relative to server/
    const normalizedFile = file.startsWith('src/')
      ? `server/${file}`
      : file.startsWith('server/')
        ? file
        : `server/${file}`;

    errors.push({
      file: normalizedFile,
      line: parseInt(line, 10),
      col: parseInt(col, 10),
      code,
      message: message.trim(),
    });
  }

  return errors;
}

/**
 * Sort errors deterministically: by file, then line, then col, then code
 */
function sortErrors(errors) {
  return errors.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    if (a.line !== b.line) return a.line - b.line;
    if (a.col !== b.col) return a.col - b.col;
    return a.code.localeCompare(b.code);
  });
}

/**
 * Generate the report object
 */
function generateReport(errors) {
  return {
    generatedBy: 'scripts/ci/server_typecheck_report.mjs',
    tscCommand: TSC_COMMAND,
    errorCount: errors.length,
    fileCount: new Set(errors.map(e => e.file)).size,
    errors: sortErrors(errors),
  };
}

/**
 * Compare current errors with baseline to find new errors
 */
function compareWithBaseline(currentErrors, baselineReport) {
  const baselineSet = new Set(
    baselineReport.errors.map(e => `${e.file}:${e.line}:${e.col}:${e.code}`)
  );

  const newErrors = currentErrors.filter(
    e => !baselineSet.has(`${e.file}:${e.line}:${e.col}:${e.code}`)
  );

  const fixedErrors = baselineReport.errors.filter(
    e => !currentErrors.some(
      c => c.file === e.file && c.line === e.line && c.col === e.col && c.code === e.code
    )
  );

  return { newErrors, fixedErrors };
}

/**
 * Main execution
 */
async function main() {
  const args = parseArgs();

  console.log('Running server TypeScript check...');
  console.log(`Command: ${TSC_COMMAND}`);
  console.log(`Working directory: ${SERVER_DIR}`);
  console.log('');

  const { exitCode, output } = await runTypecheck();
  const errors = parseErrors(output);
  const report = generateReport(errors);

  // Ensure output directory exists
  const outputDir = dirname(args.output);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Write report
  writeFileSync(args.output, JSON.stringify(report, null, 2) + '\n');
  console.log(`Report written to: ${args.output}`);
  console.log(`Total errors: ${report.errorCount}`);
  console.log(`Files affected: ${report.fileCount}`);
  console.log('');

  // Baseline comparison mode
  if (args.baseline) {
    if (!existsSync(args.baseline)) {
      console.error(`Baseline file not found: ${args.baseline}`);
      process.exit(1);
    }

    const baselineReport = JSON.parse(readFileSync(args.baseline, 'utf-8'));
    const { newErrors, fixedErrors } = compareWithBaseline(errors, baselineReport);

    console.log('=== Baseline Comparison ===');
    console.log(`Baseline errors: ${baselineReport.errorCount}`);
    console.log(`Current errors: ${report.errorCount}`);
    console.log(`New errors: ${newErrors.length}`);
    console.log(`Fixed errors: ${fixedErrors.length}`);
    console.log('');

    if (newErrors.length > 0) {
      console.error('NEW TYPE ERRORS DETECTED:');
      newErrors.forEach(e => {
        console.error(`  ${e.file}(${e.line},${e.col}): ${e.code}: ${e.message}`);
      });
      console.log('');
      process.exit(1);
    }

    if (fixedErrors.length > 0) {
      console.log('Fixed errors (consider updating baseline):');
      fixedErrors.forEach(e => {
        console.log(`  ${e.file}(${e.line},${e.col}): ${e.code}`);
      });
    }

    console.log('No new type errors introduced.');
    process.exit(0);
  }

  // Standard mode: exit with tsc's exit code
  if (exitCode !== 0) {
    console.log('TypeScript errors detected. See report for details.');
  } else {
    console.log('No TypeScript errors detected.');
  }

  // Print summary by file
  if (errors.length > 0) {
    console.log('');
    console.log('=== Errors by File ===');
    const byFile = {};
    errors.forEach(e => {
      byFile[e.file] = (byFile[e.file] || 0) + 1;
    });
    Object.entries(byFile)
      .sort((a, b) => b[1] - a[1])
      .forEach(([file, count]) => {
        console.log(`  ${file}: ${count} error(s)`);
      });
  }

  process.exit(exitCode);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
