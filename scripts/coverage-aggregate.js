#!/usr/bin/env node

/**
 * Repo-wide coverage aggregation and enforcement script
 * Enforces 80% lines / 75% branches across entire IntelGraph monorepo
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const THRESHOLDS = {
  lines: 80,
  branches: 75,
  functions: 70,
  statements: 80,
};

const DEFAULT_SCOPE = 'all';
const DEFAULT_BASE_REF = 'origin/main';

function normalizePath(filePath) {
  return path.relative(process.cwd(), filePath).split(path.sep).join('/');
}

function workspaceFromPath(filePath) {
  const normalized = normalizePath(filePath);
  const [first, second] = normalized.split('/');

  if (first === 'packages' && second) return `${first}/${second}`;
  if (first) return first;
  return 'root';
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    scope: process.env.COVERAGE_SCOPE || DEFAULT_SCOPE,
    baseRef: process.env.COVERAGE_BASE_REF || DEFAULT_BASE_REF,
  };

  for (const arg of args) {
    if (arg.startsWith('--scope=')) {
      options.scope = arg.replace('--scope=', '');
    }
    if (arg.startsWith('--base=')) {
      options.baseRef = arg.replace('--base=', '');
    }
  }

  return options;
}

function listChangedWorkspaces(baseRef) {
  try {
    const diff = execSync(`git diff --name-only ${baseRef}...HEAD`, {
      encoding: 'utf8',
    });

    const workspaces = new Set();

    diff
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const workspace = workspaceFromPath(line);
        if (workspace) workspaces.add(workspace);
      });

    return Array.from(workspaces);
  } catch (error) {
    console.warn(
      `⚠️  Unable to determine changed workspaces from ${baseRef}: ${error.message}`,
    );
    return [];
  }
}

async function findCoverageFiles() {
  const seen = [];

  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === 'node_modules') continue;
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (
        entry.isFile() &&
        entry.name === 'coverage-summary.json' &&
        fullPath.includes(`${path.sep}coverage${path.sep}`)
      ) {
        seen.push(fullPath);
      }
    }
  }

  walk(process.cwd());

  console.log(`Found ${seen.length} coverage files:`, seen.map(normalizePath));
  return seen;
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

function generateReport(overall, workspaceReports, scopeInfo) {
  console.log('\n📊 IntelGraph Repo-wide Coverage Report');
  console.log('='.repeat(50));

  if (scopeInfo?.filteredWorkspaces?.length) {
    console.log(
      `➡️  Scope: changed workspaces only (${scopeInfo.filteredWorkspaces.join(', ')}) based on ${scopeInfo.baseRef}`,
    );
  }

  console.log('\n📈 Workspace Coverage:');
  workspaceReports.forEach((report) => {
    console.log(`- ${report.workspace}`);
    Object.keys(report.aggregated.percentages).forEach((metric) => {
      const percentage = report.aggregated.percentages[metric];
      const { total, covered } = report.aggregated.totals[metric];
      console.log(
        `    ${metric.padEnd(12)}: ${percentage.toFixed(2)}% (${covered}/${total})`,
      );
    });

    report.thresholdResults.results.forEach((result) => {
      console.log(
        `    ${result.status} ${result.metric.padEnd(10)} ${result.actual}% (min ${result.threshold}%)`,
      );
    });
  });

  console.log('\n📈 Aggregated Summary:');
  Object.keys(overall.aggregated.percentages).forEach((metric) => {
    const percentage = overall.aggregated.percentages[metric];
    const { total, covered } = overall.aggregated.totals[metric];
    console.log(
      `  ${metric.padEnd(12)}: ${percentage.toFixed(2)}% (${covered}/${total})`,
    );
  });

  console.log('\n🎯 Threshold Compliance:');
  overall.thresholdResults.results.forEach((result) => {
    console.log(
      `  ${result.status} ${result.metric.padEnd(12)}: ${result.actual}% (required: ${result.threshold}%)`,
    );
  });

  const failingWorkspaces = workspaceReports.filter(
    (report) => !report.thresholdResults.passed,
  );

  if (failingWorkspaces.length) {
    console.log('\n❌ Failing workspaces:');
    failingWorkspaces.forEach((report) => {
      const failedMetrics = report.thresholdResults.results
        .filter((result) => !result.passed)
        .map(
          (result) => `${result.metric} ${result.actual}% (<${result.threshold}%)`,
        )
        .join(', ');
      console.log(`  - ${report.workspace}: ${failedMetrics}`);
    });
  }

  console.log(
    `\n🎯 Overall Status: ${overall.thresholdResults.passed ? '✅ PASSED' : '❌ FAILED'}`,
  );

  if (!overall.thresholdResults.passed) {
    console.log(
      '\n❌ Coverage thresholds not met. Please improve test coverage.',
    );
    console.log('   Required: 80% lines, 75% branches minimum');
  }

  return overall.thresholdResults.passed && failingWorkspaces.length === 0;
}

function generateJunitXml(workspaceReports) {
  const testCount = workspaceReports.reduce(
    (total, report) => total + report.thresholdResults.results.length,
    0,
  );
  const failureCount = workspaceReports.reduce(
    (total, report) =>
      total + report.thresholdResults.results.filter((r) => !r.passed).length,
    0,
  );

  const workspaceXml = workspaceReports
    .map((report) => {
      const workspaceCases = report.thresholdResults.results
        .map((result) => {
          if (result.passed) {
            return `    <testcase name="${report.workspace} coverage ${result.metric}" classname="Coverage" time="0"/>`;
          }
          return `    <testcase name="${report.workspace} coverage ${result.metric}" classname="Coverage" time="0">
      <failure message="Coverage below threshold">${result.metric}: ${result.actual}% &lt; ${result.threshold}%</failure>
    </testcase>`;
        })
        .join('\n');

      return `  <testsuite name="${report.workspace}" tests="${report.thresholdResults.results.length}" failures="${report.thresholdResults.results.filter((r) => !r.passed).length}" time="0">
${workspaceCases}
  </testsuite>`;
    })
    .join('\n');

  const junit = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Coverage Thresholds" tests="${testCount}" failures="${failureCount}" time="0">
${workspaceXml}
</testsuites>`;

  fs.writeFileSync('coverage-junit.xml', junit);
  console.log('\n📄 JUnit XML report written to coverage-junit.xml');
}

async function main() {
  try {
    const options = parseArgs();
    console.log('🔍 Scanning for coverage files...');
    const coverageFiles = await findCoverageFiles();

    if (coverageFiles.length === 0) {
      console.error(
        '❌ No coverage files found. Run tests first with coverage enabled.',
      );
      process.exit(1);
    }

    const normalizedFiles = coverageFiles.map(normalizePath).sort();

    const coverageDataList = normalizedFiles
      .map((filePath) => ({
        path: filePath,
        workspace: workspaceFromPath(filePath),
        data: readCoverageFile(filePath),
      }))
      .filter((entry) => entry.data !== null);

    if (coverageDataList.length === 0) {
      console.error('❌ No valid coverage data found.');
      process.exit(1);
    }

    const changedWorkspaces =
      options.scope === 'changed' ? listChangedWorkspaces(options.baseRef) : [];

    const scopedCoverageData =
      changedWorkspaces.length > 0
        ? coverageDataList.filter((entry) =>
            changedWorkspaces.includes(entry.workspace),
          )
        : coverageDataList;

    if (scopedCoverageData.length === 0) {
      console.error(
        '❌ No coverage data found for the selected scope. Run coverage for the changed workspaces or adjust COVERAGE_SCOPE.',
      );
      process.exit(1);
    }

    const workspaceReports = Array.from(
      scopedCoverageData.reduce((acc, entry) => {
        const list = acc.get(entry.workspace) || [];
        list.push(entry.data);
        acc.set(entry.workspace, list);
        return acc;
      }, new Map()),
    )
      .map(([workspace, workspaceCoverage]) => ({
        workspace,
        aggregated: aggregateCoverage(workspaceCoverage),
      }))
      .map((report) => ({
        ...report,
        thresholdResults: checkThresholds(report.aggregated.percentages),
      }))
      .sort((a, b) => a.workspace.localeCompare(b.workspace));

    const overallCoverage = aggregateCoverage(
      scopedCoverageData.map((entry) => entry.data),
    );
    const overall = {
      aggregated: overallCoverage,
      thresholdResults: checkThresholds(overallCoverage.percentages),
    };

    const passed = generateReport(overall, workspaceReports, {
      filteredWorkspaces: changedWorkspaces,
      baseRef: options.baseRef,
    });
    generateJunitXml(workspaceReports);

    process.exit(passed ? 0 : 1);
  } catch (error) {
    console.error('❌ Coverage aggregation failed:', error);
    process.exit(1);
  }
}

const currentFilePath = fileURLToPath(import.meta.url);
const invokedFilePath = process.argv[1]
  ? path.resolve(process.argv[1])
  : undefined;

if (invokedFilePath && currentFilePath === invokedFilePath) {
  main();
}

export {
  aggregateCoverage,
  checkThresholds,
  THRESHOLDS,
  workspaceFromPath,
  normalizePath,
};
