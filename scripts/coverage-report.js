#!/usr/bin/env node
/**
 * Coverage Report Generator
 * Generates detailed coverage reports and checks thresholds
 */

const fs = require('fs');
const path = require('path');

const coveragePath = path.join(__dirname, '../server/coverage/coverage-summary.json');

if (!fs.existsSync(coveragePath)) {
  console.error('❌ Coverage file not found. Run tests with coverage first: pnpm test -- --coverage');
  process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
const total = coverage.total;

// Thresholds from jest.config.ts
const thresholds = {
  lines: 20,
  statements: 20,
  functions: 20,
  branches: 15,
};

console.log('\n╔════════════════════════════════════════╗');
console.log('║     TEST COVERAGE REPORT               ║');
console.log('╚════════════════════════════════════════╝\n');

console.log('Overall Coverage:\n');

const metrics = ['lines', 'statements', 'functions', 'branches'];
let allPassed = true;

metrics.forEach(metric => {
  const data = total[metric];
  const pct = data.pct.toFixed(2);
  const threshold = thresholds[metric];
  const passed = pct >= threshold;
  const status = passed ? '✅' : '❌';

  if (!passed) allPassed = false;

  console.log(`${status} ${metric.padEnd(12)} ${pct}%  (${data.covered}/${data.total})  [threshold: ${threshold}%]`);
});

console.log('\n' + '─'.repeat(60) + '\n');

// Find files with low coverage
const lowCoverageFiles = [];
Object.entries(coverage).forEach(([file, data]) => {
  if (file === 'total') return;

  const metrics = ['lines', 'statements', 'functions', 'branches'];
  const avgCoverage = metrics.reduce((sum, metric) => sum + data[metric].pct, 0) / metrics.length;

  if (avgCoverage < 50 && avgCoverage > 0) {
    lowCoverageFiles.push({
      file: file.replace(process.cwd(), ''),
      coverage: avgCoverage.toFixed(2),
    });
  }
});

if (lowCoverageFiles.length > 0) {
  console.log('⚠️  Files with Low Coverage (<50%):\n');
  lowCoverageFiles
    .sort((a, b) => a.coverage - b.coverage)
    .slice(0, 10)
    .forEach(({ file, coverage }) => {
      console.log(`   ${coverage}%  ${file}`);
    });
  console.log('');
}

// Find untested files
const untestedFiles = [];
Object.entries(coverage).forEach(([file, data]) => {
  if (file === 'total') return;

  if (data.lines.total > 0 && data.lines.covered === 0) {
    untestedFiles.push(file.replace(process.cwd(), ''));
  }
});

if (untestedFiles.length > 0) {
  console.log(`🔴 Untested Files (${untestedFiles.length}):\n`);
  untestedFiles.slice(0, 10).forEach(file => {
    console.log(`   ${file}`);
  });
  if (untestedFiles.length > 10) {
    console.log(`   ... and ${untestedFiles.length - 10} more`);
  }
  console.log('');
}

// Calculate coverage improvement needed
console.log('📈 Coverage Improvement Targets:\n');
console.log('   6-Month Goal:  60% (lines)');
console.log('   12-Month Goal: 80% (lines)');
console.log(`   Current:       ${total.lines.pct.toFixed(2)}%`);
console.log(`   Gap to 60%:    ${Math.max(0, 60 - total.lines.pct).toFixed(2)}%\n`);

const linesNeededFor60 = Math.ceil((60 * total.lines.total - total.lines.covered * 100) / (100 - 60));
const linesNeededFor80 = Math.ceil((80 * total.lines.total - total.lines.covered * 100) / (100 - 80));

console.log(`   To reach 60%: Add tests covering ~${Math.max(0, linesNeededFor60)} more lines`);
console.log(`   To reach 80%: Add tests covering ~${Math.max(0, linesNeededFor80)} more lines\n`);

console.log('─'.repeat(60) + '\n');

if (allPassed) {
  console.log('✅ All coverage thresholds passed!\n');
  process.exit(0);
} else {
  console.log('❌ Some coverage thresholds not met.\n');
  process.exit(1);
}
