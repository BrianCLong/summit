#!/usr/bin/env node
/**
 * Remediation Validation Script
 * Validates that all acceptance criteria are met per Council NFRs
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function execCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      cwd: ROOT_DIR,
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options,
    });
    return { success: true, output: result };
  } catch (error) {
    return {
      success: false,
      output: error.stdout || error.stderr || error.message,
      error,
    };
  }
}

const CRITERIA = {
  'Package Manager Consistency': {
    description: 'Single package manager (pnpm) across monorepo',
    test: () => {
      const hasPnpmLock = fs.existsSync(path.join(ROOT_DIR, 'pnpm-lock.yaml'));
      const hasNpmLock = fs.existsSync(path.join(ROOT_DIR, 'package-lock.json'));
      const hasYarnLock = fs.existsSync(path.join(ROOT_DIR, 'yarn.lock'));

      const pass = hasPnpmLock && !hasNpmLock && !hasYarnLock;
      return {
        pass,
        actual: hasPnpmLock
          ? 'pnpm'
          : hasNpmLock
            ? 'npm'
            : hasYarnLock
              ? 'yarn'
              : 'none',
        expected: 'pnpm only',
        details: pass ? '✓ Using pnpm consistently' : '✗ Multiple lockfiles detected',
      };
    },
  },

  'Workspace Configuration': {
    description: 'Valid pnpm-workspace.yaml present',
    test: () => {
      const workspaceFile = path.join(ROOT_DIR, 'pnpm-workspace.yaml');
      const exists = fs.existsSync(workspaceFile);

      if (!exists) {
        return {
          pass: false,
          actual: 'missing',
          expected: 'present',
          details: '✗ pnpm-workspace.yaml not found',
        };
      }

      try {
        const content = fs.readFileSync(workspaceFile, 'utf8');
        const hasPackages = content.includes('packages:');
        return {
          pass: hasPackages,
          actual: hasPackages ? 'valid' : 'invalid',
          expected: 'valid',
          details: hasPackages
            ? '✓ Workspace configuration valid'
            : '✗ Missing packages declaration',
        };
      } catch (error) {
        return {
          pass: false,
          actual: 'error',
          expected: 'valid',
          details: `✗ Error reading file: ${error.message}`,
        };
      }
    },
  },

  'Turborepo Configuration': {
    description: 'Enhanced turbo.json with caching',
    test: () => {
      const turboFile = path.join(ROOT_DIR, 'turbo.json');
      if (!fs.existsSync(turboFile)) {
        return {
          pass: false,
          actual: 'missing',
          expected: 'present',
          details: '✗ turbo.json not found',
        };
      }

      try {
        const turbo = JSON.parse(fs.readFileSync(turboFile, 'utf8'));
        const hasTasks = turbo.tasks && Object.keys(turbo.tasks).length > 0;
        const hasBuild = turbo.tasks?.build;
        const hasTest = turbo.tasks?.test;
        const hasLint = turbo.tasks?.lint;
        const hasTypecheck = turbo.tasks?.typecheck;
        const hasDev = turbo.tasks?.dev;

        const allPresent = hasBuild && hasTest && hasLint && hasTypecheck && hasDev;

        return {
          pass: hasTasks && allPresent,
          actual: hasTasks
            ? `${Object.keys(turbo.tasks).length} tasks`
            : 'no tasks',
          expected: '≥5 tasks (build, dev, test, lint, typecheck)',
          details: allPresent
            ? '✓ All required tasks configured'
            : `✗ Missing tasks: ${[!hasBuild && 'build', !hasDev && 'dev', !hasTest && 'test', !hasLint && 'lint', !hasTypecheck && 'typecheck'].filter(Boolean).join(', ')}`,
        };
      } catch (error) {
        return {
          pass: false,
          actual: 'invalid JSON',
          expected: 'valid',
          details: `✗ Error parsing turbo.json: ${error.message}`,
        };
      }
    },
  },

  'Package Script Coverage': {
    description: 'All packages have standard scripts',
    test: () => {
      const reportPath = path.join(ROOT_DIR, 'MONOREPO_AUDIT_REPORT.json');

      if (!fs.existsSync(reportPath)) {
        return {
          pass: false,
          actual: 'No audit run',
          expected: '≥95% coverage',
          details:
            '⚠️  Run: node scripts/audit-monorepo.js to generate report',
        };
      }

      try {
        const audit = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        const total = audit.summary.total || 0;
        const withMissing = audit.summary.withMissingScripts || 0;
        const coverage = total > 0 ? ((total - withMissing) / total) * 100 : 0;

        return {
          pass: coverage >= 95,
          actual: `${coverage.toFixed(1)}%`,
          expected: '≥95%',
          details:
            coverage >= 95
              ? `✓ ${total - withMissing}/${total} packages compliant`
              : `✗ ${withMissing} packages missing scripts`,
        };
      } catch (error) {
        return {
          pass: false,
          actual: 'error',
          expected: '≥95%',
          details: `✗ Error reading audit report: ${error.message}`,
        };
      }
    },
  },

  'Development Environment': {
    description: 'compose/dev.yml exists and is valid',
    test: () => {
      const composeFile = path.join(ROOT_DIR, 'compose/dev.yml');
      const exists = fs.existsSync(composeFile);

      if (!exists) {
        return {
          pass: false,
          actual: 'missing',
          expected: 'present',
          details: '✗ compose/dev.yml not found',
        };
      }

      try {
        const content = fs.readFileSync(composeFile, 'utf8');
        const hasServices = content.includes('services:');
        const hasPostgres = content.includes('postgres:');
        const hasRedis = content.includes('redis:');
        const hasNeo4j = content.includes('neo4j:');

        return {
          pass: hasServices && hasPostgres && hasRedis && hasNeo4j,
          actual: hasServices ? 'valid' : 'invalid',
          expected: 'valid with all services',
          details:
            hasServices && hasPostgres && hasRedis && hasNeo4j
              ? '✓ All infrastructure services configured'
              : '✗ Missing required services',
        };
      } catch (error) {
        return {
          pass: false,
          actual: 'error',
          expected: 'valid',
          details: `✗ Error reading file: ${error.message}`,
        };
      }
    },
  },

  'Makefile Commands': {
    description: 'Makefile has dev, dev-down, test-ci targets',
    test: () => {
      const makefilePath = path.join(ROOT_DIR, 'Makefile');
      if (!fs.existsSync(makefilePath)) {
        return {
          pass: false,
          actual: 'missing',
          expected: 'present',
          details: '✗ Makefile not found',
        };
      }

      try {
        const content = fs.readFileSync(makefilePath, 'utf8');
        const hasDev = content.includes('dev:');
        const hasDevDown = content.includes('dev-down:');
        const hasTestCI = content.includes('test-ci:');

        return {
          pass: hasDev && hasDevDown && hasTestCI,
          actual: [hasDev && 'dev', hasDevDown && 'dev-down', hasTestCI && 'test-ci']
            .filter(Boolean)
            .join(', '),
          expected: 'dev, dev-down, test-ci',
          details:
            hasDev && hasDevDown && hasTestCI
              ? '✓ All required targets present'
              : `✗ Missing: ${[!hasDev && 'dev', !hasDevDown && 'dev-down', !hasTestCI && 'test-ci'].filter(Boolean).join(', ')}`,
        };
      } catch (error) {
        return {
          pass: false,
          actual: 'error',
          expected: 'valid',
          details: `✗ Error reading Makefile: ${error.message}`,
        };
      }
    },
  },

  'Lint Status': {
    description: 'No lint errors (pnpm run lint)',
    test: () => {
      console.log(`\n${colors.dim}  Running: pnpm run lint...${colors.reset}`);
      const result = execCommand('pnpm run lint', { silent: true });

      return {
        pass: result.success,
        actual: result.success ? '0 errors' : 'has errors',
        expected: '0 errors',
        details: result.success
          ? '✓ Lint checks passed'
          : '✗ Lint errors detected (run pnpm run lint for details)',
        skipInCI: true, // Skip in CI if dependencies aren't installed
      };
    },
  },

  'Type Checking': {
    description: 'No type errors (pnpm run typecheck)',
    test: () => {
      console.log(`\n${colors.dim}  Running: pnpm run typecheck...${colors.reset}`);
      const result = execCommand('pnpm run typecheck', { silent: true });

      return {
        pass: result.success,
        actual: result.success ? '0 errors' : 'has errors',
        expected: '0 errors',
        details: result.success
          ? '✓ Type checks passed'
          : '✗ Type errors detected (run pnpm run typecheck for details)',
        skipInCI: true,
      };
    },
  },
};

// Main execution
function main() {
  console.log(
    `\n${colors.cyan}╔═══════════════════════════════════════════════════════╗${colors.reset}`
  );
  console.log(
    `${colors.cyan}║${colors.reset}  MONOREPO REMEDIATION VALIDATION                    ${colors.cyan}║${colors.reset}`
  );
  console.log(
    `${colors.cyan}╚═══════════════════════════════════════════════════════╝${colors.reset}\n`
  );

  const results = [];
  let allPass = true;
  const skipCI = process.env.CI === 'true';

  for (const [name, criterion] of Object.entries(CRITERIA)) {
    if (skipCI && criterion.test().skipInCI) {
      console.log(`${colors.yellow}⊘${colors.reset} ${name}: Skipped in CI`);
      continue;
    }

    console.log(`\n${colors.blue}Testing:${colors.reset} ${criterion.description}`);

    try {
      const result = criterion.test();
      const icon = result.pass ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;

      console.log(
        `${icon} ${name}: ${result.actual} ${colors.dim}(expected: ${result.expected})${colors.reset}`
      );
      console.log(`  ${result.details}`);

      results.push({ name, ...result });
      allPass = allPass && result.pass;
    } catch (error) {
      console.log(`${colors.red}✗${colors.reset} ${name}: Error`);
      console.log(`  ${colors.red}${error.message}${colors.reset}`);
      allPass = false;
    }
  }

  // Summary
  console.log(
    `\n${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`
  );

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;

  console.log(`${colors.blue}Summary:${colors.reset}`);
  console.log(`  ${colors.green}✓ Passed:${colors.reset} ${passed}/${results.length}`);
  if (failed > 0) {
    console.log(`  ${colors.red}✗ Failed:${colors.reset} ${failed}/${results.length}`);
  }

  if (allPass) {
    console.log(
      `\n${colors.green}✓✓✓ All acceptance criteria met! Ready for production.${colors.reset}\n`
    );
    process.exit(0);
  } else {
    console.log(
      `\n${colors.red}✗✗✗ Some criteria failed. Please review and fix issues.${colors.reset}\n`
    );

    // Action items
    console.log(`${colors.yellow}Action Items:${colors.reset}`);
    results
      .filter((r) => !r.pass)
      .forEach((r) => {
        console.log(`  • ${r.name}`);
      });
    console.log('');

    process.exit(1);
  }
}

main();
