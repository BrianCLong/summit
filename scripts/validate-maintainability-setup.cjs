#!/usr/bin/env node

/**
 * Validates the maintainability metrics setup
 *
 * This script checks that all required files exist and are properly configured.
 * Run this to verify the maintainability system is ready to use.
 *
 * Usage:
 *   node scripts/validate-maintainability-setup.cjs
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - One or more checks failed
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const fullPath = path.join(process.cwd(), filePath);
  const exists = fs.existsSync(fullPath);

  if (exists) {
    log(`  ✓ ${description}`, 'green');
    return true;
  } else {
    log(`  ✗ ${description} (${filePath})`, 'red');
    return false;
  }
}

function checkJsonFile(filePath, description) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    log(`  ✗ ${description} - file not found`, 'red');
    return false;
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    JSON.parse(content);
    log(`  ✓ ${description}`, 'green');
    return true;
  } catch (e) {
    log(`  ✗ ${description} - invalid JSON`, 'red');
    return false;
  }
}

function checkPackageScript(scriptName) {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const hasScript = packageJson.scripts && packageJson.scripts[scriptName];

    if (hasScript) {
      log(`  ✓ Script: ${scriptName}`, 'green');
      return true;
    } else {
      log(`  ✗ Script: ${scriptName} not found in package.json`, 'red');
      return false;
    }
  } catch (e) {
    log(`  ✗ Could not read package.json`, 'red');
    return false;
  }
}

function main() {
  log('\n🔍 Validating Maintainability Metrics Setup\n', 'bold');

  let passed = 0;
  let failed = 0;

  // Check configuration files
  log('Configuration Files:', 'blue');
  const configFiles = [
    ['.eslintrc.complexity.cjs', 'ESLint complexity config'],
    ['sonar-project.properties', 'SonarQube config'],
    ['.github/workflows/maintainability-check.yml', 'CI workflow'],
  ];

  configFiles.forEach(([file, desc]) => {
    if (checkFile(file, desc)) passed++;
    else failed++;
  });

  // Check scripts
  log('\nScripts:', 'blue');
  const scripts = [
    ['scripts/maintainability-report.cjs', 'Report generator'],
    ['scripts/pre-commit-metrics.sh', 'Pre-commit hook'],
    ['scripts/generate-badge-json.cjs', 'Badge generator'],
  ];

  scripts.forEach(([file, desc]) => {
    if (checkFile(file, desc)) passed++;
    else failed++;
  });

  // Check documentation
  log('\nDocumentation:', 'blue');
  const docs = [
    ['MAINTAINABILITY.md', 'Main guide'],
    ['docs/MAINTAINABILITY_IMPLEMENTATION.md', 'Implementation guide'],
    ['docs/REFACTORING_GUIDE.md', 'Refactoring guide'],
    ['docs/BADGES.md', 'Badge guide'],
  ];

  docs.forEach(([file, desc]) => {
    if (checkFile(file, desc)) passed++;
    else failed++;
  });

  // Check package.json scripts
  log('\nNPM Scripts:', 'blue');
  const npmScripts = [
    'metrics:report',
    'metrics:report:json',
    'metrics:complexity',
    'metrics:loc',
    'metrics:all',
  ];

  npmScripts.forEach((script) => {
    if (checkPackageScript(script)) passed++;
    else failed++;
  });

  // Check optional files
  log('\nOptional Files:', 'blue');
  const optionalFiles = [
    ['reports/baseline-2025-11-20.md', 'Baseline report'],
    ['maintainability-report.md', 'Current report'],
    ['maintainability-report.json', 'Report JSON'],
    ['badges/summary.json', 'Badge data'],
  ];

  optionalFiles.forEach(([file, desc]) => {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      log(`  ✓ ${desc} (optional)`, 'green');
      passed++;
    } else {
      log(`  ○ ${desc} (optional, not found)`, 'yellow');
      // Don't count optional as failed
    }
  });

  // Summary
  log('\n' + '═'.repeat(50), 'bold');
  log(`\n📊 Summary: ${passed} passed, ${failed} failed\n`, 'bold');

  if (failed === 0) {
    log('✅ All required checks passed! Maintainability system is ready.\n', 'green');
    log('Next steps:', 'blue');
    log('  1. Run: pnpm run metrics:report', 'reset');
    log('  2. Review: maintainability-report.md', 'reset');
    log('  3. Set up pre-commit hook: ./scripts/pre-commit-metrics.sh', 'reset');
    log('');
    process.exit(0);
  } else {
    log(`❌ ${failed} check(s) failed. Please review the issues above.\n`, 'red');
    process.exit(1);
  }
}

main();
