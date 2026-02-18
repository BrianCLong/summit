#!/usr/bin/env node
/**
 * Jest + pnpm Configuration Validator
 *
 * Run this script in CI to catch configuration drift early.
 * Usage: node scripts/ci/validate-jest-config.cjs
 */

const fs = require('fs');
const path = require('path');

const errors = [];
const warnings = [];

function log(msg) {
  console.log(`[validate-jest-config] ${msg}`);
}

function error(msg) {
  errors.push(msg);
  console.error(`[ERROR] ${msg}`);
}

function warn(msg) {
  warnings.push(msg);
  console.warn(`[WARN] ${msg}`);
}

// Check if tsconfig has isolatedModules: true
function checkTsConfig(filePath) {
  if (!fs.existsSync(filePath)) {
    return; // Optional file
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const config = JSON.parse(content);

    const compilerOptions = config.compilerOptions || {};

    // Check for isolatedModules when using NodeNext or ESNext modules
    const moduleType = compilerOptions.module?.toLowerCase() || '';
    if (moduleType.includes('nodenext') || moduleType.includes('esnext')) {
      if (!compilerOptions.isolatedModules) {
        error(`${filePath}: Missing "isolatedModules: true" with module: "${compilerOptions.module}". ts-jest requires this.`);
      }
    }

    log(`Validated: ${filePath}`);
  } catch (e) {
    error(`${filePath}: Failed to parse - ${e.message}`);
  }
}

// Check .npmrc uses correct kebab-case
function checkNpmrc(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Check for common camelCase mistakes
  const camelCaseOptions = [
    'nodeLinker',
    'shamefullyHoist',
    'publicHoistPattern',
    'strictPeerDependencies',
    'autoInstallPeers',
  ];

  for (const opt of camelCaseOptions) {
    if (content.includes(`${opt}=`)) {
      const kebab = opt.replace(/([A-Z])/g, '-$1').toLowerCase();
      error(`.npmrc: Found camelCase "${opt}". pnpm uses kebab-case: "${kebab}"`);
    }
  }

  log(`Validated: ${filePath}`);
}

// Check Jest config doesn't use deprecated ts-jest globals
function checkJestConfig(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Improved check for deprecated ts-jest globals
  // It should only error if 'ts-jest' is used INSIDE the globals block
  const globalsMatch = content.match(/globals\s*:\s*\{([^}]*)\}/s);
  if (globalsMatch && globalsMatch[1].includes("'ts-jest'")) {
    error(`${filePath}: Using deprecated ts-jest globals syntax. Use transform options instead.`);
  }

  log(`Validated: ${filePath}`);
}

// Check pnpm-workspace.yaml for duplicates
function checkWorkspace(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim().startsWith("- '"));
  const seen = new Set();

  for (const line of lines) {
    const pattern = line.trim();
    if (seen.has(pattern)) {
      error(`${filePath}: Duplicate workspace pattern found: ${pattern}`);
    }
    seen.add(pattern);
  }

  log(`Validated: ${filePath}`);
}

// Check node version alignment
function checkNodeVersion() {
  const nvmrcPath = path.join(process.cwd(), '.nvmrc');

  if (!fs.existsSync(nvmrcPath)) {
    warn('.nvmrc not found - consider adding for CI parity');
    return;
  }

  const nvmrcVersion = fs.readFileSync(nvmrcPath, 'utf8').trim();
  const currentVersion = process.version.replace('v', '');

  // Compare major.minor (allow patch differences)
  const [nvmMajor, nvmMinor] = nvmrcVersion.split('.').map(Number);
  const [curMajor, curMinor] = currentVersion.split('.').map(Number);

  if (nvmMajor !== curMajor || nvmMinor !== curMinor) {
    warn(`.nvmrc specifies ${nvmrcVersion} but running ${currentVersion}`);
  }

  log(`Node version check: .nvmrc=${nvmrcVersion}, current=${currentVersion}`);
}

// Main validation
function main() {
  log('Starting Jest + pnpm configuration validation...\n');

  // Check root configs
  checkNpmrc(path.join(process.cwd(), '.npmrc'));
  checkWorkspace(path.join(process.cwd(), 'pnpm-workspace.yaml'));
  checkTsConfig(path.join(process.cwd(), 'tsconfig.test.json'));
  checkJestConfig(path.join(process.cwd(), 'jest.config.cjs'));

  // Check server configs
  checkTsConfig(path.join(process.cwd(), 'server/tsconfig.json'));
  checkTsConfig(path.join(process.cwd(), 'server/tsconfig.test.json'));
  checkJestConfig(path.join(process.cwd(), 'server/jest.config.ts'));

  // Check client configs
  checkTsConfig(path.join(process.cwd(), 'client/tsconfig.json'));
  checkJestConfig(path.join(process.cwd(), 'client/jest.config.cjs'));

  // Check node version
  checkNodeVersion();

  console.log('\n' + '='.repeat(60));

  if (errors.length > 0) {
    console.error(`\n❌ FAILED: ${errors.length} error(s) found\n`);
    errors.forEach((e, i) => console.error(`  ${i + 1}. ${e}`));
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn(`\n⚠️  ${warnings.length} warning(s):\n`);
    warnings.forEach((w, i) => console.warn(`  ${i + 1}. ${w}`));
  }

  console.log('\n✅ All Jest + pnpm configuration checks passed\n');
  process.exit(0);
}

main();
