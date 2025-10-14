const fs = require('node:fs');
const { execSync } = require('node:child_process');
const path = require('node:path');
const { createResult } = require('./lib/reporting.cjs');
const { getChangedFiles } = require('./lib/git-utils.cjs');

const COVERAGE_REPORT_PATH = 'coverage/coverage-summary.json';
const DEFAULT_THRESHOLD = 0.85;
const METRICS = ['statements', 'branches', 'functions', 'lines'];

function runUnitCoverageCheck({ baseRef, threshold = DEFAULT_THRESHOLD }) {
  const description =
    'Ensures unit tests exercise new and modified source files with at least 85% coverage.';
  const remediation =
    'Add or update unit tests targeting the new logic, or refactor code into testable units to raise coverage above 85%.';
  try {
    executeCoverageSuite();
    const summary = loadCoverageSummary(COVERAGE_REPORT_PATH);
    const changedFiles = getChangedFiles(baseRef).filter(isEligibleSourceFile);
    const evaluation = evaluateCoverage(summary, changedFiles, threshold);
    return createResult({
      name: 'unit-test-coverage',
      description,
      passed: evaluation.passed,
      details: evaluation.details,
      remediation
    });
  } catch (error) {
    const message = extractErrorMessage(error);
    return createResult({
      name: 'unit-test-coverage',
      description,
      passed: false,
      details: [message],
      remediation
    });
  }
}

function executeCoverageSuite() {
  execSync(
    'npm run test:jest -- --coverage --coverageReporters=json-summary --passWithNoTests --runInBand',
    {
      stdio: 'inherit'
    }
  );
}

function loadCoverageSummary(reportPath) {
  if (!fs.existsSync(reportPath)) {
    throw new Error(`Coverage summary not found at ${reportPath}`);
  }
  return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
}

function evaluateCoverage(summary, changedFiles, threshold = DEFAULT_THRESHOLD) {
  const details = [];
  const eligibleFiles = changedFiles.filter(isEligibleSourceFile);
  if (eligibleFiles.length === 0) {
    return {
      passed: true,
      details: ['No eligible source files changed; coverage requirement automatically satisfied.']
    };
  }
  const coverageThreshold = threshold * 100;
  let allPassing = true;
  for (const filePath of eligibleFiles) {
    const coverageEntry = findCoverageEntry(summary, filePath);
    if (!coverageEntry) {
      details.push(`Missing coverage data for ${filePath}. Add targeted tests to exercise this file.`);
      allPassing = false;
      continue;
    }
    for (const metric of METRICS) {
      const metricInfo = coverageEntry[metric];
      if (!metricInfo) {
        details.push(`Coverage metric "${metric}" missing for ${filePath}.`);
        allPassing = false;
        continue;
      }
      if (metricInfo.pct < coverageThreshold) {
        const pct = metricInfo.pct.toFixed(1);
        details.push(
          `${filePath}: ${metric} coverage ${pct}% is below required ${(coverageThreshold).toFixed(0)}%.`
        );
        allPassing = false;
      }
    }
  }
  if (allPassing) {
    details.push(
      `All changed source files meet or exceed ${(coverageThreshold).toFixed(0)}% coverage across statements, branches, functions, and lines.`
    );
  }
  return { passed: allPassing, details };
}

function isEligibleSourceFile(filePath) {
  const normalized = filePath.replace(/\\\\/g, '/');
  if (!/(\.tsx?|\.jsx?)$/i.test(normalized)) {
    return false;
  }
  if (/\.test\.|\.spec\./i.test(normalized)) {
    return false;
  }
  if (/__tests__/.test(normalized)) {
    return false;
  }
  if (/\/tests\//.test(normalized)) {
    return false;
  }
  return true;
}

function findCoverageEntry(summary, filePath) {
  if (!summary) {
    return null;
  }
  const normalized = filePath.replace(/\\\\/g, '/');
  const candidates = new Set([
    normalized,
    normalized.startsWith('./') ? normalized.slice(2) : `./${normalized}`,
    path.relative(process.cwd(), path.resolve(process.cwd(), normalized)).replace(/\\\\/g, '/')
  ]);
  for (const candidate of candidates) {
    if (summary[candidate]) {
      return summary[candidate];
    }
  }
  const entryKey = Object.keys(summary).find((key) => {
    if (key === 'total') {
      return false;
    }
    return key.endsWith(normalized);
  });
  return entryKey ? summary[entryKey] : null;
}

function extractErrorMessage(error) {
  if (!error) {
    return 'Unit test command failed without an error message.';
  }
  if (error.stderr) {
    const stderr = error.stderr.toString().trim();
    if (stderr) {
      return stderr;
    }
  }
  if (error.stdout) {
    const stdout = error.stdout.toString().trim();
    if (stdout) {
      return stdout;
    }
  }
  return error.message || 'Unit test execution failed.';
}

module.exports = {
  runUnitCoverageCheck,
  executeCoverageSuite,
  loadCoverageSummary,
  evaluateCoverage
};
