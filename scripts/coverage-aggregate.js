#!/usr/bin/env node

/**
 * Repo-wide coverage aggregation and enforcement script
 * Enforces 80% lines / 75% branches across entire IntelGraph monorepo
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const THRESHOLDS = {
  lines: 80,
  branches: 75,
  functions: 70,
  statements: 80,
};

async function findCoverageFiles() {
  // Find all coverage-summary.json files across the monorepo
  const coverageFiles = await glob('**/coverage/coverage-summary.json', {
    ignore: ['node_modules/**', '**/node_modules/**'],
    cwd: process.cwd(),
  });

  console.log(`Found ${coverageFiles.length} coverage files:`, coverageFiles);
  return coverageFiles;
}

function readCoverageFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(
      `Warning: Could not read coverage file ${filePath}:`,
      error.message,
    );
    return null;
  }
}

function aggregateCoverage(coverageDataList) {
  const totals = {
    lines: { total: 0, covered: 0 },
    branches: { total: 0, covered: 0 },
    functions: { total: 0, covered: 0 },
    statements: { total: 0, covered: 0 },
  };

  for (const coverageData of coverageDataList) {
    if (!coverageData || !coverageData.total) continue;

    const { total } = coverageData;

    Object.keys(totals).forEach((metric) => {
      if (total[metric]) {
        totals[metric].total += total[metric].total || 0;
        totals[metric].covered += total[metric].covered || 0;
      }
    });
  }

  // Calculate percentages
  const percentages = {};
  Object.keys(totals).forEach((metric) => {
    const { total, covered } = totals[metric];
    percentages[metric] = total > 0 ? (covered / total) * 100 : 0;
  });

  return { totals, percentages };
}

function checkThresholds(percentages) {
  const results = [];
  let passed = true;

  Object.keys(THRESHOLDS).forEach((metric) => {
    const actual = percentages[metric];
    const threshold = THRESHOLDS[metric];
    const isPass = actual >= threshold;

    if (!isPass) passed = false;

    results.push({
      metric,
      actual: actual.toFixed(2),
      threshold,
      passed: isPass,
      status: isPass ? '✅' : '❌',
    });
  });

  return { results, passed };
}

function generateReport(aggregated, thresholdResults) {
  console.log('\n📊 IntelGraph Repo-wide Coverage Report');
  console.log('=' * 50);

  console.log('\n📈 Coverage Summary:');
  Object.keys(aggregated.percentages).forEach((metric) => {
    const percentage = aggregated.percentages[metric];
    const { total, covered } = aggregated.totals[metric];
    console.log(
      `  ${metric.padEnd(12)}: ${percentage.toFixed(2)}% (${covered}/${total})`,
    );
  });

  console.log('\n🎯 Threshold Compliance:');
  thresholdResults.results.forEach((result) => {
    console.log(
      `  ${result.status} ${result.metric.padEnd(12)}: ${result.actual}% (required: ${result.threshold}%)`,
    );
  });

  console.log(
    `\n🎯 Overall Status: ${thresholdResults.passed ? '✅ PASSED' : '❌ FAILED'}`,
  );

  if (!thresholdResults.passed) {
    console.log(
      '\n❌ Coverage thresholds not met. Please improve test coverage.',
    );
    console.log('   Required: 80% lines, 75% branches minimum');
  }

  return thresholdResults.passed;
}

function generateJunitXml(thresholdResults) {
  const testCount = thresholdResults.results.length;
  const failureCount = thresholdResults.results.filter((r) => !r.passed).length;

  const junit = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Coverage Thresholds" tests="${testCount}" failures="${failureCount}" time="0">
  <testsuite name="Repo-wide Coverage" tests="${testCount}" failures="${failureCount}" time="0">
    ${thresholdResults.results
      .map((result) => {
        if (result.passed) {
          return `    <testcase name="Coverage ${result.metric}" classname="Coverage" time="0"/>`;
        } else {
          return `    <testcase name="Coverage ${result.metric}" classname="Coverage" time="0">
      <failure message="Coverage below threshold">${result.metric}: ${result.actual}% &lt; ${result.threshold}%</failure>
    </testcase>`;
        }
      })
      .join('\n')}
  </testsuite>
</testsuites>`;

  fs.writeFileSync('coverage-junit.xml', junit);
  console.log('\n📄 JUnit XML report written to coverage-junit.xml');
}

async function main() {
  try {
    console.log('🔍 Scanning for coverage files...');
    const coverageFiles = await findCoverageFiles();

    if (coverageFiles.length === 0) {
      console.error(
        '❌ No coverage files found. Run tests first with coverage enabled.',
      );
      process.exit(1);
    }

    console.log('📊 Reading and aggregating coverage data...');
    const coverageDataList = coverageFiles
      .map(readCoverageFile)
      .filter((data) => data !== null);

    if (coverageDataList.length === 0) {
      console.error('❌ No valid coverage data found.');
      process.exit(1);
    }

    const aggregated = aggregateCoverage(coverageDataList);
    const thresholdResults = checkThresholds(aggregated.percentages);

    const passed = generateReport(aggregated, thresholdResults);
    generateJunitXml(thresholdResults);

    process.exit(passed ? 0 : 1);
  } catch (error) {
    console.error('❌ Coverage aggregation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { aggregateCoverage, checkThresholds, THRESHOLDS };
