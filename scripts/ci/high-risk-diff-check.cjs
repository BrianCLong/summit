#!/usr/bin/env node
/*
 * High risk diff guardrail
 * - Blocks secrets, dependency pinning, workflow edits without CODEOWNER approval
 * - Emits findings to JSON for PR metadata consumption
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HIGH_RISK_PATHS = [
  '.github/workflows/',
  'secrets/',
  'server/src/security/',
  'terraform/',
  'infrastructure/',
];

const SECRET_PATTERNS = [
  /AWS_SECRET_ACCESS_KEY/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /x-api-key/i,
  /ghp_[A-Za-z0-9]{30,}/,
];

const DEP_PIN_PATTERNS = [/"version"\s*:\s*"\d+\.\d+\.\d+"/, /==\d+\.\d+\.\d+/];

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function getChangedFiles() {
  const base = process.env.GITHUB_BASE_REF || 'origin/main';
  try {
    return run(`git diff --name-only ${base}...HEAD`).split('\n').filter(Boolean);
  } catch (error) {
    const fallback = run('git diff --name-only HEAD~1...HEAD || true');
    return fallback ? fallback.split('\n').filter(Boolean) : [];
  }
}

function getDiff(file) {
  const base = process.env.GITHUB_BASE_REF || 'origin/main';
  try {
    return run(`git diff ${base}...HEAD -- ${file}`);
  } catch (error) {
    return '';
  }
}

function requiresCodeowner(file) {
  return HIGH_RISK_PATHS.some((prefix) => file.startsWith(prefix));
}

function analyze() {
  const findings = [];
  const files = getChangedFiles();

  files.forEach((file) => {
    const diff = getDiff(file);

    SECRET_PATTERNS.forEach((pattern) => {
      if (pattern.test(diff)) {
        findings.push({
          file,
          type: 'secret-leak',
          severity: 'critical',
          evidence: pattern.toString(),
        });
      }
    });

    DEP_PIN_PATTERNS.forEach((pattern) => {
      if (pattern.test(diff)) {
        findings.push({
          file,
          type: 'dependency-pin',
          severity: 'warning',
          evidence: pattern.toString(),
        });
      }
    });

    if (requiresCodeowner(file)) {
      findings.push({
        file,
        type: 'codeowner-review',
        severity: 'critical',
        evidence: 'Sensitive path requires human approval',
      });
    }
  });

  return { files, findings };
}

function writeReport(report) {
  const outputPath = path.resolve(process.env.PR_ALERT_PATH || 'artifacts/pr-risk-findings.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Risk findings written to ${outputPath}`);
}

function main() {
  const { files, findings } = analyze();
  const codeownerApproved = process.env.CODEOWNER_APPROVED === 'true';

  writeReport({
    filesReviewed: files,
    findings,
    codeownerApproved,
    generatedAt: new Date().toISOString(),
  });

  const criticals = findings.filter((f) => f.severity === 'critical');

  if (criticals.some((f) => f.type === 'codeowner-review') && !codeownerApproved) {
    console.error('CODEOWNER approval required for sensitive paths.');
    process.exit(1);
  }

  if (criticals.some((f) => f.type === 'secret-leak')) {
    console.error('Potential secret detected in diff.');
    process.exit(1);
  }

  console.log('High risk diff check completed.');
}

main();
