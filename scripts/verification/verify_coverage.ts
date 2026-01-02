#!/usr/bin/env ts-node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type CoverageMetrics = {
  lines?: { pct: number; total: number; covered: number };
  statements?: { pct: number; total: number; covered: number };
  functions?: { pct: number; total: number; covered: number };
  branches?: { pct: number; total: number; covered: number };
};

type CoverageSummary = Record<string, CoverageMetrics> & { total: CoverageMetrics };

type EvaluationResult = {
  metrics: CoverageMetrics;
  failures: Array<{ metric: keyof Thresholds; actual: number; threshold: number }>;
  offenders: Array<{ file: string; pct: number }>;
};

type Thresholds = {
  lines: number;
  statements: number;
  functions: number;
  branches: number;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const isMain = path.resolve(process.argv[1] ?? '') === __filename;
const serverRoot = path.join(repoRoot, 'server');
const coverageDir = path.join(serverRoot, 'coverage');
const summaryPath = path.join(coverageDir, 'coverage-summary.json');

const thresholds: Thresholds = {
  lines: (parseFloat(process.env.COVERAGE_LINES ?? process.env.COVERAGE_THRESHOLD ?? '0.8') || 0.8) * 100,
  statements: (parseFloat(process.env.COVERAGE_STATEMENTS ?? process.env.COVERAGE_THRESHOLD ?? '0.8') || 0.8) * 100,
  functions: (parseFloat(process.env.COVERAGE_FUNCTIONS ?? process.env.COVERAGE_THRESHOLD ?? '0.8') || 0.8) * 100,
  branches: (parseFloat(process.env.COVERAGE_BRANCHES ?? '0.75') || 0.75) * 100,
};

function cleanCoverageDirectory(): void {
  fs.rmSync(coverageDir, { recursive: true, force: true });
}

function runCoverageSuite(): void {
  const env = {
    ...process.env,
    CI: 'true',
    NODE_ENV: 'test',
    TZ: process.env.TZ ?? 'UTC',
  };

  execSync(
    [
      'pnpm',
      '--filter intelgraph-server',
      'exec --',
      'jest --config jest.config.ts --coverage --runInBand --passWithNoTests',
      '--coverageDirectory=coverage --coverageReporters=json-summary,text-summary',
    ].join(' '),
    {
      cwd: repoRoot,
      stdio: 'inherit',
      env,
    },
  );
}

function loadCoverageSummary(): CoverageSummary {
  if (!fs.existsSync(summaryPath)) {
    throw new Error(`Coverage summary missing at ${path.relative(repoRoot, summaryPath)}`);
  }

  const raw = fs.readFileSync(summaryPath, 'utf8');
  return JSON.parse(raw) as CoverageSummary;
}

function normalizePath(filePath: string): string {
  if (path.isAbsolute(filePath)) {
    return path.relative(repoRoot, filePath);
  }

  const normalized = filePath.replace(/^\.\//, '').replace(/^\//, '');
  return path.relative(repoRoot, path.resolve(serverRoot, normalized));
}

function evaluate(summary: CoverageSummary): EvaluationResult {
  const metrics = summary.total ?? {};
  const failures: Array<{ metric: keyof Thresholds; actual: number; threshold: number }> = [];

  (Object.keys(thresholds) as Array<keyof Thresholds>).forEach((metric) => {
    const value = metrics[metric]?.pct ?? 0;
    if (value < thresholds[metric]) {
      failures.push({ metric, actual: value, threshold: thresholds[metric] });
    }
  });

  const offenderCandidates = Object.entries(summary)
    .filter(([key]) => key !== 'total')
    .map(([key, value]) => ({
      file: normalizePath(key),
      pct: value.lines?.pct ?? 0,
    }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 5);

  return { metrics, failures, offenders: offenderCandidates };
}

function printReport(
  metrics: CoverageMetrics,
  failures: Array<{ metric: keyof Thresholds; actual: number; threshold: number }>,
  offenders: Array<{ file: string; pct: number }>,
): void {
  console.log('📊 Coverage Gate (server)');
  console.log('-------------------------');
  console.log(`Lines:      ${(metrics.lines?.pct ?? 0).toFixed(2)}%`);
  console.log(`Statements: ${(metrics.statements?.pct ?? 0).toFixed(2)}%`);
  console.log(`Functions:  ${(metrics.functions?.pct ?? 0).toFixed(2)}%`);
  console.log(`Branches:   ${(metrics.branches?.pct ?? 0).toFixed(2)}%`);
  console.log('\nThresholds:');
  console.log(
    `  Lines ${thresholds.lines.toFixed(1)}% | Statements ${thresholds.statements.toFixed(1)}% | Functions ${thresholds.functions.toFixed(1)}% | Branches ${thresholds.branches.toFixed(1)}%`,
  );

  if (failures.length === 0) {
    console.log('\n✅ Coverage gate satisfied.');
    console.log('Re-run locally: pnpm verify:coverage');
    return;
  }

  console.error('\n❌ Coverage gate failed.');
  failures.forEach((failure) => {
    console.error(
      `  - ${failure.metric}: ${failure.actual.toFixed(2)}% (required ${failure.threshold.toFixed(1)}%)`,
    );
  });

  if (offenders.length > 0) {
    console.error('\nTop uncovered files (by line coverage):');
    offenders.forEach((offender) => {
      console.error(`  - ${offender.file}: ${offender.pct.toFixed(2)}%`);
    });
  }

  console.error('\nRe-run locally: pnpm verify:coverage');
}

function main() {
  cleanCoverageDirectory();
  runCoverageSuite();
  const summary = loadCoverageSummary();
  const { metrics, failures, offenders } = evaluate(summary);
  printReport(metrics, failures, offenders);
  if (failures.length > 0) {
    process.exit(1);
  }
}

if (isMain) {
  try {
    main();
  } catch (error) {
    console.error('Coverage verification failed:', error instanceof Error ? error.message : error);
    console.error('Re-run locally: pnpm verify:coverage');
    process.exit(1);
  }
}
