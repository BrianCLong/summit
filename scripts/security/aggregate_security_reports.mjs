import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

// Use command line args or environment variables for SHA and artifact dir
const SHA = process.env.GITHUB_SHA || process.argv[2];
if (!SHA) {
  console.error("Usage: node aggregate_security_reports.mjs <sha>");
  process.exit(1);
}

const ARTIFACTS_ROOT = process.env.ARTIFACTS_DIR || 'artifacts';
const GATE_DIR = path.join(ARTIFACTS_ROOT, 'security-gate', SHA);
const OUTPUT_FILE = path.join(GATE_DIR, 'summary.json');

if (!fs.existsSync(GATE_DIR)) {
  console.error(`Artifacts directory not found: ${GATE_DIR}`);
  // Create it to allow testing/demo, or fail
  fs.mkdirSync(GATE_DIR, { recursive: true });
}

// Expected reports
const REPORT_FILES = [
  'sast.report.json',
  'deps.report.json',
  'secrets.report.json',
  'license.report.json',
  'config-hardening.report.json'
];

const summary = {
  sha: SHA,
  timestamp: new Date().toISOString(), // Note: Timestamps in summary are okay, but not in deterministic inputs for diffing
  status: 'pass', // pass, fail
  checks: {}
};

let hasFailures = false;

REPORT_FILES.forEach(file => {
  const filePath = path.join(GATE_DIR, file);
  const checkName = file.replace('.report.json', '');

  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const report = JSON.parse(content);

      // Heuristic to determine pass/fail if not explicit
      let passed = true;
      if (report.status === 'fail' || report.status === 'failure') passed = false;
      if (report.vulnerabilities && report.vulnerabilities.length > 0) {
          // Check severity? Assuming the report generation handled filtering
          // For now, if vulnerabilities exist, it's a fail unless ignored
          passed = false;
      }
      if (report.findings && report.findings.length > 0) passed = false;

      if (!passed) hasFailures = true;

      summary.checks[checkName] = {
        present: true,
        passed: passed,
        details: report // Embed or link? Embedding for single-file view
      };
    } catch (e) {
      console.error(`Error parsing ${file}:`, e);
      summary.checks[checkName] = { present: true, passed: false, error: 'Parse Error' };
      hasFailures = true;
    }
  } else {
    // It's okay if not all reports are present? Or should we fail?
    // The policy determines requirements. This script just aggregates.
    summary.checks[checkName] = { present: false };
  }
});

if (hasFailures) {
  summary.status = 'fail';
}

// Deterministic output: Sort keys
const sortedSummary = JSON.stringify(summary, Object.keys(summary).sort(), 2);

fs.writeFileSync(OUTPUT_FILE, sortedSummary);
console.log(`Security summary generated at ${OUTPUT_FILE}`);

if (summary.status === 'fail') {
    // We exit 0 because this script just generates the report.
    // The gate enforcement (reconcile_required_checks) will decide if the build stops.
    console.log("Status: FAIL");
} else {
    console.log("Status: PASS");
}
