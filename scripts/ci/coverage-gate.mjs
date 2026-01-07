#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_THRESHOLDS = { lines: 80, statements: 80, branches: 70, functions: 75 };

const COVERAGE_TARGETS = [
  {
    name: 'server',
    workspace: 'intelgraph-server',
    root: 'server',
    coverageFile: 'server/coverage/coverage-summary.json',
    thresholds: DEFAULT_THRESHOLDS,
    command:
      'pnpm --filter intelgraph-server run test:coverage -- --coverageReporters=json-summary --runInBand --passWithNoTests',
  },
  {
    name: 'client',
    workspace: 'client',
    root: 'client',
    coverageFile: 'client/coverage/coverage-summary.json',
    thresholds: { lines: 70, statements: 70, branches: 60, functions: 65 },
    command:
      'pnpm --filter client run test:coverage -- --coverageReporters=json-summary --runInBand --passWithNoTests',
  },
];

const REPORT_PATH = path.join('artifacts', 'ga', 'coverage-gate.json');

function readChangedFiles(baseRef) {
  const diffTargets = [
    `${baseRef}...HEAD`,
    `${baseRef}..HEAD`,
    'HEAD~1...HEAD',
  ];

  for (const diffTarget of diffTargets) {
    try {
      const output = execSync(`git diff --name-only ${diffTarget}`, {
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf8',
      });
      if (output.trim()) {
        return output
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean);
      }
    } catch (error) {
      // Fall through to next target
    }
  }

  // If we cannot determine changes, run everything to avoid false negatives.
  return null;
}

function isCodeFile(filePath) {
  return /(\.tsx?|\.jsx?)$/i.test(filePath) && !/\.(test|spec)\./i.test(filePath);
}

function targetHasChanges(target, changedFiles) {
  if (!Array.isArray(changedFiles)) {
    return true; // Unknown change set -> run to be safe
  }
  return changedFiles.some(
    (file) => isCodeFile(file) && file.startsWith(`${target.root}/`),
  );
}

function runCommand(command) {
  execSync(command, { stdio: 'inherit', env: { ...process.env, CI: 'true', NODE_ENV: 'test' } });
}

function loadCoverageSummary(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Coverage summary not found at ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function evaluateCoverage(summary, thresholds) {
  const metrics = summary.total || {};
  const failures = [];
  const results = {};

  for (const [metric, threshold] of Object.entries(thresholds)) {
    const value = metrics[metric]?.pct ?? 0;
    results[metric] = value;
    if (value < threshold) {
      failures.push(`${metric} ${value.toFixed(1)}% < ${threshold}%`);
    }
  }

  return { failures, results };
}

function writeReport(results) {
  const dir = path.dirname(REPORT_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify({
    generatedAt: new Date().toISOString(),
    results,
  }, null, 2));
}

function printSummary(results) {
  console.log('\nCoverage Gate Results');
  console.log('=====================');
  for (const result of results) {
    const status = result.status.padEnd(8, ' ');
    console.log(`- ${result.name}: ${status} ${result.message}`);
    if (result.metrics) {
      const metricLine = Object.entries(result.metrics)
        .map(([key, value]) => `${key}=${value.toFixed(1)}%`)
        .join(', ');
      console.log(`  thresholds: ${JSON.stringify(result.thresholds)}`);
      console.log(`  metrics:    ${metricLine}`);
    }
  }
}

function main() {
  const baseRef = process.env.COVERAGE_BASE_REF || 'origin/main';
  const runAll = process.argv.includes('--all') || process.env.COVERAGE_ALL === 'true';
  const changedFiles = runAll ? null : readChangedFiles(baseRef);

  const results = [];
  let failed = false;

  for (const target of COVERAGE_TARGETS) {
    const inScope = runAll || targetHasChanges(target, changedFiles);
    if (!inScope) {
      results.push({
        name: target.name,
        status: 'skipped',
        message: `no JS/TS deltas under ${target.root}; base=${baseRef}`,
      });
      continue;
    }

    try {
      console.log(`\n▶ Running coverage for ${target.name} (${target.command})`);
      runCommand(target.command);
      const summary = loadCoverageSummary(target.coverageFile);
      const { failures, results: metrics } = evaluateCoverage(
        summary,
        target.thresholds,
      );

      if (failures.length) {
        failed = true;
        results.push({
          name: target.name,
          status: 'failed',
          message: failures.join('; '),
          metrics,
          thresholds: target.thresholds,
        });
      } else {
        results.push({
          name: target.name,
          status: 'passed',
          message: 'all metrics meet thresholds',
          metrics,
          thresholds: target.thresholds,
        });
      }
    } catch (error) {
      failed = true;
      results.push({
        name: target.name,
        status: 'failed',
        message: error.message || 'coverage command failed',
      });
    }
  }

  writeReport(results);
  printSummary(results);

  if (failed) {
    console.error('\nCoverage gate failed. See artifacts/ga/coverage-gate.json for details.');
    process.exit(1);
  }

  console.log('\n✅ Coverage gate passed');
}

main();
