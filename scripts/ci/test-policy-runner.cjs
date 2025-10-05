const fs = require('node:fs');
const { execSync } = require('node:child_process');
const { summarize, createResult } = require('./lib/reporting.cjs');
const { runUnitCoverageCheck } = require('./coverage-check.cjs');
const { runConsoleLogScan } = require('./console-log-scan.cjs');
const { runAsyncAwaitScan } = require('./async-error-scan.cjs');
const { runPerformanceBenchmark } = require('./performance-benchmark.cjs');

const REPORT_PATH = 'test-policy-report.json';

function runPolicySuite(options = {}) {
  const baseRef = options.baseRef || process.env.TEST_POLICY_BASE || process.env.GITHUB_BASE_REF || 'origin/main';
  const results = [];

  results.push(runUnitCoverageCheck({ baseRef }));
  results.push(
    runCommandCheck({
      name: 'api-integration-tests',
      command: 'npm run test:integration',
      description: 'Runs API integration tests covering service boundaries and endpoint contracts.',
      remediation: 'Fix the API implementation or update integration fixtures until the tests pass.'
    })
  );
  results.push(
    runCommandCheck({
      name: 'api-contract-tests',
      command: 'npm run test:api',
      description: 'Executes API contract checks for persisted queries and schema drift.',
      remediation: 'Align the API contract or adjust the tests to reflect the expected response shape.'
    })
  );
  results.push(
    runCommandCheck({
      name: 'end-to-end-tests',
      command: 'npm run test:e2e',
      description: 'Validates critical user journeys through Playwright end-to-end scenarios.',
      remediation: 'Repair end-to-end flows or update the tests to reflect the intended behaviour.'
    })
  );
  results.push(runPerformanceBenchmark());
  results.push(runConsoleLogScan({ baseRef }));
  results.push(runAsyncAwaitScan({ baseRef }));

  const report = summarize(results);
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  if (!report.summary.passed) {
    const failed = report.summary.failures.map((failure) => failure.name).join(', ');
    throw new Error(failed ? `Test policy requirements failed: ${failed}` : 'Test policy requirements failed.');
  }
  return report;
}

function runCommandCheck({ name, command, description, remediation }) {
  try {
    execSync(command, { stdio: 'inherit', shell: true });
    return createResult({
      name,
      description,
      passed: true,
      details: [`${name} succeeded.`],
      remediation
    });
  } catch (error) {
    const message = extractErrorMessage(error);
    return createResult({
      name,
      description,
      passed: false,
      details: [message],
      remediation
    });
  }
}

function extractErrorMessage(error) {
  if (!error) {
    return 'Command failed without an error message.';
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
  return error.message || 'Command execution failed.';
}

if (require.main === module) {
  try {
    runPolicySuite();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  runPolicySuite,
  runCommandCheck
};
