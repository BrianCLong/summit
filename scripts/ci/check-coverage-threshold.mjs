import fs from 'node:fs';
import path from 'node:path';

const threshold = Number(process.env.COVERAGE_THRESHOLD || '85');
const summaryPath = path.resolve(process.env.COVERAGE_SUMMARY_PATH || 'coverage/coverage-summary.json');

if (Number.isNaN(threshold) || threshold <= 0) {
  console.error(`::error::Invalid coverage threshold provided: ${process.env.COVERAGE_THRESHOLD}`);
  process.exit(1);
}

if (!fs.existsSync(summaryPath)) {
  console.error(`::error::Coverage summary not found at ${summaryPath}`);
  process.exit(1);
}

const summaryRaw = fs.readFileSync(summaryPath, 'utf8');
const coverageSummary = JSON.parse(summaryRaw);
const totals = coverageSummary.total || {};

const metrics = {
  lines: totals.lines?.pct ?? 0,
  statements: totals.statements?.pct ?? 0,
  branches: totals.branches?.pct ?? 0,
  functions: totals.functions?.pct ?? 0,
};

console.log(`Coverage summary (threshold ${threshold}%):`);
for (const [metric, value] of Object.entries(metrics)) {
  const formatted = value.toFixed(2).padStart(6, ' ');
  console.log(` - ${metric.padEnd(10, ' ')} ${formatted}%`);
}

const failures = Object.entries(metrics).filter(([, value]) => value < threshold);

if (failures.length > 0) {
  const details = failures
    .map(([metric, value]) => `${metric}: ${value.toFixed(2)}% (< ${threshold}%)`)
    .join(' | ');
  console.error(`::error::Coverage below threshold: ${details}`);
  process.exit(1);
}

console.log('✅ Coverage gate satisfied');
