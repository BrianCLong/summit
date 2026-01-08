#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const ARTIFACTS_DIR = join(ROOT_DIR, 'artifacts', 'rollback');

const checks = [];

function recordCheck(name, success, details = '') {
  checks.push({ name, success, details });
}

function checkFileExistence() {
  const rollbackRunbookPath = join(ROOT_DIR, 'docs/releases/ROLLBACK.md');
  const drillTemplatePath = join(ROOT_DIR, 'docs/releases/rollback-drills/ROLLBACK_DRILL_TEMPLATE.md');

  const runbookExists = existsSync(rollbackRunbookPath);
  recordCheck(
    'Deployment Rollback Procedure Exists',
    runbookExists,
    runbookExists ? 'File `docs/releases/ROLLBACK.md` found.' : 'File `docs/releases/ROLLBACK.md` not found.'
  );

  const templateExists = existsSync(drillTemplatePath);
  recordCheck(
    'Rollback Drill Artifact Exists',
    templateExists,
    templateExists ? 'File `docs/releases/rollback-drills/ROLLBACK_DRILL_TEMPLATE.md` found.' : 'File `docs/releases/rollback-drills/ROLLBACK_DRILL_TEMPLATE.md` not found.'
  );
}

function checkRunbookSections() {
  const rollbackRunbookPath = join(ROOT_DIR, 'docs/releases/ROLLBACK.md');
  if (!existsSync(rollbackRunbookPath)) {
    // This check is already done in checkFileExistence, but it's good practice
    // to ensure the file exists before reading it.
    recordCheck('Runbook Section Validation', false, '`docs/releases/ROLLBACK.md` not found, skipping section checks.');
    return;
  }

  const content = readFileSync(rollbackRunbookPath, 'utf8');
  const requiredHeadings = [
    '## A. Deployment Rollback Procedure',
    '## B. Data Safety Posture',
    '## C. Minimum "Rollback Drill" Artifact',
    '## D. Last-Known-Good Reference',
  ];

  requiredHeadings.forEach(heading => {
    const success = content.includes(heading);
    recordCheck(
      `Runbook Contains: ${heading}`,
      success,
      success ? 'Section found.' : 'Section not found.'
    );
  });
}

function checkLastKnownGoodTag() {
  try {
    const tags = execSync('git tag --list "rc-*" "ga-*"', { encoding: 'utf8' }).trim();
    const success = tags.length > 0;
    recordCheck(
      'Last-Known-Good Tag Exists',
      success,
      success ? 'Found at least one `rc-` or `ga-` tag.' : 'No `rc-` or `ga-` tags found.'
    );
  } catch (e) {
    recordCheck('Last-Known-Good Tag Exists', false, 'Failed to execute git command to check for tags.');
  }
}

function checkNonReversibleMigrations() {
  const rollbackRunbookPath = join(ROOT_DIR, 'docs/releases/ROLLBACK.md');
  if (!existsSync(rollbackRunbookPath)) {
    recordCheck('Non-Reversible Migration Policy', false, '`docs/releases/ROLLBACK.md` not found.');
    return;
  }

  const content = readFileSync(rollbackRunbookPath, 'utf8');
  const sectionRegex = /### 2\. Non-Reversible Migrations\n\n([\s\S]*?)(?=\n###|\n##|$)/;
  const match = content.match(sectionRegex);

  if (!match || !match[1]) {
    recordCheck('Non-Reversible Migration Policy', false, 'Section "Non-Reversible Migrations" not found.');
    return;
  }

  const sectionContent = match[1].trim();
  const success = sectionContent.length > 0 && sectionContent.toLowerCase() !== 'n/a';
  recordCheck(
    'Non-Reversible Migration Policy',
    success,
    success ? 'Policy is documented.' : 'Policy section is empty or "N/A".'
  );
}

async function main() {
  console.log('🔍 Running Rollback Readiness Validation...');

  checkFileExistence();
  checkRunbookSections();
  checkLastKnownGoodTag();
  checkNonReversibleMigrations();

  // Generate reports
  generateReports();

  const failures = checks.filter(c => !c.success).length;
  console.log(`\n🏁 Validation Complete. ${checks.length} checks run, ${failures} failures.`);

  if (failures > 0) {
    console.error('\n❌ Rollback readiness checks failed.');
    process.exit(1);
  } else {
    console.log('\n✅ All rollback readiness checks passed.');
  }
}

function generateReports() {
  if (!existsSync(ARTIFACTS_DIR)) {
    mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  // JSON Report
  const jsonReportPath = join(ARTIFACTS_DIR, 'readiness.json');
  writeFileSync(jsonReportPath, JSON.stringify({ checks }, null, 2));
  console.log(`📝 Wrote JSON report to ${jsonReportPath}`);

  // Markdown Report
  let mdReport = '# Rollback Readiness Report\n\n';
  mdReport += `**Generated:** ${new Date().toISOString()}\n\n`;
  mdReport += '| Check | Status | Details |\n';
  mdReport += '|---|---|---|\n';
  checks.forEach(check => {
    mdReport += `| ${check.name} | ${check.success ? '✅ Pass' : '❌ Fail'} | ${check.details} |\n`;
  });
  const mdReportPath = join(ARTIFACTS_DIR, 'readiness.md');
  writeFileSync(mdReportPath, mdReport);
  console.log(`📝 Wrote Markdown report to ${mdReportPath}`);
}

main().catch(err => {
  console.error('\n🚨 An unexpected error occurred:');
  console.error(err);
  process.exit(1);
});
