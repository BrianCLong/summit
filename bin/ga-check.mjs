#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

// Helper to resolve paths relative to repo root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const EVIDENCE_DIR = path.join(REPO_ROOT, '.evidence/ga');
const RUNBOOKS_DIR = path.join(REPO_ROOT, 'RUNBOOKS');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Check failures list
const failures = [];
const summary = {
  smoke: 'PENDING',
  security: {
    secrets: 'PENDING',
    sbom: 'PENDING',
    vuln: 'PENDING',
  },
  ops: 'PENDING',
  observability: 'PENDING',
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function fail(msg) {
  log(`FAIL: ${msg}`, colors.red);
  failures.push(msg);
}

function pass(msg) {
  log(`PASS: ${msg}`, colors.green);
}

function warn(msg) {
    log(`WARN: ${msg}`, colors.yellow);
}

function getGitSha() {
  try {
    return execSync('git rev-parse HEAD', { cwd: REPO_ROOT }).toString().trim();
  } catch (e) {
    return 'unknown-sha';
  }
}

function isCI() {
    return process.env.CI === 'true';
}

// 1. Smoke Tests
async function checkSmoke() {
  log('\n--- Checking Smoke Tests ---', colors.blue);
  const smokeScript = path.join(REPO_ROOT, 'smoke-test.js');

  // Try to check if services are reachable before running full suite
  // Or just run it. If it fails in local dev, we might warn instead of failing the script if not in CI.
  // But strict requirement says "MUST fail".

  try {
    const result = spawnSync('node', [smokeScript, '--ci'], { cwd: REPO_ROOT, encoding: 'utf-8' });
    if (result.status === 0) {
      pass('Smoke tests passed.');
      summary.smoke = 'PASS';
    } else {
      if (!isCI()) {
        warn('Smoke tests failed. This is expected if local stack is not running. In CI this will fail.');
        // We mark as FAIL but maybe don't block local dev usage of this script?
        // But for the report, it is a FAIL.
        summary.smoke = 'FAIL';
        // We won't push to failures[] if not CI? No, let's be strict but clear.
        failures.push('Smoke tests failed (Check if stack is running)');
      } else {
        fail('Smoke tests failed.');
        console.error(result.stdout);
        console.error(result.stderr);
        summary.smoke = 'FAIL';
      }
    }
  } catch (e) {
    fail(`Smoke test execution error: ${e.message}`);
    summary.smoke = 'FAIL';
  }
}

// 2. Security Checks
function checkSecurity() {
  log('\n--- Checking Security ---', colors.blue);

  // 2a. Secrets (Gitleaks)
  const gitleaksReportPath = path.join(REPO_ROOT, 'gitleaks.json');
  if (fs.existsSync(gitleaksReportPath)) {
    try {
      const report = JSON.parse(fs.readFileSync(gitleaksReportPath, 'utf-8'));
      if (report.length === 0) {
        pass('Gitleaks found no secrets.');
        summary.security.secrets = 'PASS';
      } else {
        // FAIL if secrets found.
        fail(`Gitleaks found ${report.length} secrets.`);
        summary.security.secrets = 'FAIL';
      }
    } catch (e) {
      fail(`Failed to parse gitleaks report: ${e.message}`);
      summary.security.secrets = 'FAIL';
    }
  } else {
    // If running locally, maybe we can skip or warn
    if (!isCI()) {
        warn('gitleaks.json not found. Skipping secret check for local run.');
        summary.security.secrets = 'SKIPPED';
    } else {
        fail('gitleaks.json not found. Ensure secret scan runs before this check.');
        summary.security.secrets = 'MISSING';
    }
  }

  // 2b. SBOM
  try {
    log('Generating SBOM...');
    execSync('npm run generate:sbom', { cwd: REPO_ROOT, stdio: 'ignore' });
    pass('SBOM generation command succeeded.');
    summary.security.sbom = 'PASS';
  } catch (e) {
    fail(`SBOM generation failed: ${e.message}`);
    summary.security.sbom = 'FAIL';
  }

  // 2c. Vuln Scan (Trivy)
  const trivyReportPath = path.join(REPO_ROOT, 'trivy-results.json');
  if (fs.existsSync(trivyReportPath)) {
    try {
      const report = JSON.parse(fs.readFileSync(trivyReportPath, 'utf-8'));
      let criticals = 0;
      if (report.Results) {
        report.Results.forEach(res => {
          if (res.Vulnerabilities) {
            criticals += res.Vulnerabilities.filter(v => v.Severity === 'CRITICAL').length;
          }
        });
      }

      if (criticals === 0) {
        pass('Trivy found no critical vulnerabilities.');
        summary.security.vuln = 'PASS';
      } else {
        fail(`Trivy found ${criticals} critical vulnerabilities.`);
        summary.security.vuln = 'FAIL';
      }
    } catch (e) {
      fail(`Failed to parse trivy report: ${e.message}`);
      summary.security.vuln = 'FAIL';
    }
  } else {
     if (!isCI()) {
        warn('trivy-results.json not found. Skipping vuln check for local run.');
        summary.security.vuln = 'SKIPPED';
     } else {
        fail('trivy-results.json not found. Ensure vuln scan runs before this check.');
        summary.security.vuln = 'MISSING';
     }
  }
}

// 3. Ops Checks
function checkOps() {
  log('\n--- Checking Ops ---', colors.blue);

  const catalogPath = path.join(REPO_ROOT, 'catalog-info.yaml');
  let services = [];
  if (fs.existsSync(catalogPath)) {
    const content = fs.readFileSync(catalogPath, 'utf-8');
    const nameMatch = content.match(/name:\s*([\w-]+)/);
    if (nameMatch) {
      services.push(nameMatch[1]);
    }
  }

  if (services.length === 0) {
    services.push('maestro-api');
  }

  let opsFail = false;

  services.forEach(service => {
    // Try multiple possible filenames
    const possibleRunbooks = [
      path.join(RUNBOOKS_DIR, `${service}.md`),
      path.join(RUNBOOKS_DIR, `${service}-service.md`),
      path.join(RUNBOOKS_DIR, `${service.replace('-api', '')}.md`),
      path.join(RUNBOOKS_DIR, 'RUNBOOK.md'), // in RUNBOOKS/
      path.join(REPO_ROOT, 'RUNBOOK.md')     // in Root
    ];

    let foundRunbook = possibleRunbooks.find(p => fs.existsSync(p));

    if (foundRunbook) {
      const content = fs.readFileSync(foundRunbook, 'utf-8').toLowerCase();
      if (content.includes('oncall') || content.includes('pager') || content.includes('contact')) {
        pass(`Runbook for ${service} found (${path.relative(REPO_ROOT, foundRunbook)}) and contains oncall info.`);
      } else {
        fail(`Runbook for ${service} found (${path.relative(REPO_ROOT, foundRunbook)}) but missing Oncall/Pager section.`);
        opsFail = true;
      }
    } else {
        fail(`No runbook found for ${service}. Expected ${service}.md or RUNBOOK.md`);
        opsFail = true;
    }
  });

  summary.ops = opsFail ? 'FAIL' : 'PASS';
}

// 4. Observability Checks
function checkObservability() {
  log('\n--- Checking Observability ---', colors.blue);

  const sloPath = path.join(REPO_ROOT, 'slo-config.yaml');
  if (fs.existsSync(sloPath)) {
    pass('slo-config.yaml exists.');
  } else {
    fail('slo-config.yaml missing.');
    summary.observability = 'FAIL';
    return;
  }

  const grafanaDir = path.join(REPO_ROOT, 'ops/grafana');
  const monitoringDir = path.join(REPO_ROOT, 'monitoring');

  const hasGrafana = fs.existsSync(grafanaDir) && fs.readdirSync(grafanaDir).some(f => f.endsWith('.json'));
  const hasMonitoring = fs.existsSync(monitoringDir); // Loose check

  if (hasGrafana || hasMonitoring) {
     pass('Golden dashboard definitions found.');
     summary.observability = 'PASS';
  } else {
     fail('No golden dashboards found (checked ops/grafana and monitoring).');
     summary.observability = 'FAIL';
  }
}

async function main() {
  const sha = getGitSha();
  const outDir = path.join(EVIDENCE_DIR, sha);
  fs.mkdirSync(outDir, { recursive: true });

  await checkSmoke();
  checkSecurity();
  checkOps();
  checkObservability();

  const reportJson = {
    sha,
    timestamp: new Date().toISOString(),
    summary,
    failures
  };

  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(reportJson, null, 2));

  // Generate Markdown
  let md = `# GA Readiness Report\n\n**SHA:** ${sha}\n**Date:** ${new Date().toISOString()}\n\n`;
  md += `## Summary\n\n`;
  md += `| Category | Status | Details |\n`;
  md += `| --- | --- | --- |\n`;
  md += `| **Smoke Tests** | ${summary.smoke === 'PASS' ? '✅ PASS' : (summary.smoke === 'SKIPPED' ? '⚠️ SKIPPED' : '❌ FAIL')} | ${summary.smoke === 'PASS' ? 'Boot + Critical Path OK' : 'See failures'} |\n`;
  md += `| **Security** | ${Object.values(summary.security).every(s => s === 'PASS' || s === 'SKIPPED') ? '✅ PASS' : '❌ FAIL'} | Secrets: ${summary.security.secrets}, SBOM: ${summary.security.sbom}, Vuln: ${summary.security.vuln} |\n`;
  md += `| **Ops** | ${summary.ops === 'PASS' ? '✅ PASS' : '❌ FAIL'} | Runbooks & Oncall |\n`;
  md += `| **Observability** | ${summary.observability === 'PASS' ? '✅ PASS' : '❌ FAIL'} | SLOs & Dashboards |\n`;

  if (failures.length > 0) {
    md += `\n## Failures\n\n`;
    failures.forEach(f => md += `- ❌ ${f}\n`);
  } else {
    md += `\n## 🎉 Ready for GA\n\nAll checks passed.`;
  }

  fs.writeFileSync(path.join(outDir, 'report.md'), md);

  log(`\nReport generated at ${outDir}`);

  if (failures.length > 0) {
    log('GA Check FAILED', colors.red);
    process.exit(1);
  } else {
    log('GA Check PASSED', colors.green);
    process.exit(0);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
