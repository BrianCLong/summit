#!/usr/bin/env node

/**
 * RepoOS Validation & Health Check
 *
 * Validates all RepoOS components are working correctly
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const REPO_ROOT = process.cwd();
const checks = [];
let passed = 0;
let failed = 0;

function check(name, fn) {
  checks.push({ name, fn });
}

async function runChecks() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              RepoOS VALIDATION & HEALTH CHECK                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  for (const { name, fn } of checks) {
    process.stdout.write(`  ${name}...`.padEnd(60));
    try {
      await fn();
      console.log('✅ PASS');
      passed++;
    } catch (error) {
      console.log(`❌ FAIL: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '═'.repeat(65));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('═'.repeat(65) + '\n');

  if (failed === 0) {
    console.log('🎉 All checks passed! RepoOS is healthy and ready.');
    return true;
  } else {
    console.log('⚠️  Some checks failed. Review errors above.');
    return false;
  }
}

// ============================================================================
// VALIDATION CHECKS
// ============================================================================

check('Core files exist', async () => {
  const requiredFiles = [
    'REPOOS_DEPLOYMENT_REPORT.md',
    'scripts/repoos-analysis.mjs'
  ];

  for (const file of requiredFiles) {
    const exists = await fs.access(path.join(REPO_ROOT, file))
      .then(() => true)
      .catch(() => false);
    if (!exists) throw new Error(`Missing: ${file}`);
  }
});

check('Git repository is clean', () => {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    // Allow untracked files, but no uncommitted changes
    const lines = status.split('\n').filter(l => l.trim());
    const uncommitted = lines.filter(l => !l.startsWith('??'));
    if (uncommitted.length > 0) {
      throw new Error(`Uncommitted changes: ${uncommitted.length} files`);
    }
  } catch (error) {
    throw new Error(error.message);
  }
});

check('GitHub CLI is authenticated', () => {
  try {
    execSync('gh auth status', { stdio: 'pipe' });
  } catch {
    throw new Error('Run: gh auth login');
  }
});

check('Can fetch PRs from GitHub', () => {
  try {
    const output = execSync('gh pr list --limit 1 --json number', { encoding: 'utf8' });
    const prs = JSON.parse(output);
    if (!Array.isArray(prs)) throw new Error('Invalid PR data');
  } catch (error) {
    throw new Error(error.message);
  }
});

check('Analysis report is recent', async () => {
  try {
    const reportPath = path.join(REPO_ROOT, 'artifacts/repoos-analysis.json');
    const data = await fs.readFile(reportPath, 'utf-8');
    const report = JSON.parse(data);

    const age = Date.now() - new Date(report.timestamp).getTime();
    const ageHours = age / (1000 * 60 * 60);

    if (ageHours > 24) {
      throw new Error(`Report is ${Math.round(ageHours)}h old, run: node /tmp/repoos-analysis.mjs`);
    }
  } catch (error) {
    throw new Error(error.message);
  }
});

check('Deployment report is valid', async () => {
  try {
    const content = await fs.readFile(path.join(REPO_ROOT, 'REPOOS_DEPLOYMENT_REPORT.md'), 'utf-8');
    if (!content.includes('DEPLOYED')) throw new Error('Missing deployment status');
    if (!content.includes('RepoOS Components Deployed')) throw new Error('Incomplete report');
  } catch (error) {
    throw new Error(error.message);
  }
});

check('Analysis has valid concern data', async () => {
  try {
    const reportPath = path.join(REPO_ROOT, 'artifacts/repoos-analysis.json');
    const data = await fs.readFile(reportPath, 'utf-8');
    const report = JSON.parse(data);

    if (!report.concerns || Object.keys(report.concerns).length === 0) {
      throw new Error('No concerns detected');
    }

    if (report.totalPRs === 0) {
      throw new Error('No PRs analyzed');
    }
  } catch (error) {
    throw new Error(error.message);
  }
});

check('PR age distribution is valid', async () => {
  try {
    const reportPath = path.join(REPO_ROOT, 'artifacts/repoos-analysis.json');
    const data = await fs.readFile(reportPath, 'utf-8');
    const report = JSON.parse(data);

    const dist = report.ageDistribution;
    if (!dist || typeof dist.fresh !== 'number') {
      throw new Error('Invalid age distribution data');
    }
  } catch (error) {
    throw new Error(error.message);
  }
});

check('Node.js version is compatible', () => {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);
  if (major < 18) {
    throw new Error(`Node ${version} too old, need >= 18`);
  }
});

check('Required Node modules are available', async () => {
  try {
    await import('child_process');
    await import('fs/promises');
    await import('path');
  } catch (error) {
    throw new Error('Core modules not available');
  }
});

check('Artifacts directory exists', async () => {
  try {
    await fs.access(path.join(REPO_ROOT, 'artifacts'));
  } catch {
    throw new Error('artifacts/ directory missing');
  }
});

check('Can write to artifacts directory', async () => {
  try {
    const testFile = path.join(REPO_ROOT, 'artifacts/.repoos-test');
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
  } catch {
    throw new Error('Cannot write to artifacts/');
  }
});

// ============================================================================
// RUN VALIDATION
// ============================================================================

const healthy = await runChecks();
process.exit(healthy ? 0 : 1);
