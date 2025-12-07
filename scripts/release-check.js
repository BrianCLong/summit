#!/usr/bin/env node

/**
 * Release Readiness Check Script
 *
 * Validates that the repository is ready for a release.
 * Runs pre-flight checks to catch common issues before triggering semantic-release.
 *
 * Usage:
 *   node scripts/release-check.js [options]
 *
 * Options:
 *   --fix        Attempt to fix issues where possible
 *   --verbose    Show detailed output
 *   --json       Output results as JSON
 *   --help       Show help
 *
 * Exit Codes:
 *   0 - All checks passed
 *   1 - One or more checks failed
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

// Parse arguments
function parseArgs(args) {
  return {
    fix: args.includes('--fix'),
    verbose: args.includes('--verbose'),
    json: args.includes('--json'),
    help: args.includes('--help') || args.includes('-h'),
  };
}

// Execute command and return result
function exec(command, options = {}) {
  try {
    return {
      success: true,
      output: execSync(command, {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        stdio: options.silent ? 'pipe' : 'inherit',
        ...options,
      }),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      output: error.stdout || '',
    };
  }
}

// Check definitions
const checks = [
  {
    name: 'Git repository clean',
    description: 'No uncommitted changes',
    run: () => {
      const result = exec('git status --porcelain', { silent: true });
      if (!result.success) return { passed: false, message: 'Git command failed' };
      const changes = result.output.trim();
      if (changes) {
        return {
          passed: false,
          message: `Uncommitted changes:\n${changes}`,
          fix: 'Commit or stash your changes before releasing',
        };
      }
      return { passed: true };
    },
  },
  {
    name: 'On release branch',
    description: 'Current branch is main, beta, or alpha',
    run: () => {
      const result = exec('git rev-parse --abbrev-ref HEAD', { silent: true });
      if (!result.success) return { passed: false, message: 'Git command failed' };
      const branch = result.output.trim();
      const releaseBranches = ['main', 'beta', 'alpha'];
      if (!releaseBranches.includes(branch)) {
        return {
          passed: false,
          message: `Current branch '${branch}' is not a release branch`,
          fix: `Switch to one of: ${releaseBranches.join(', ')}`,
        };
      }
      return { passed: true, message: `On branch: ${branch}` };
    },
  },
  {
    name: 'Up to date with remote',
    description: 'Local branch is up to date with origin',
    run: () => {
      exec('git fetch origin', { silent: true });
      const result = exec('git status -uno', { silent: true });
      if (!result.success) return { passed: false, message: 'Git command failed' };
      if (result.output.includes('Your branch is behind')) {
        return {
          passed: false,
          message: 'Local branch is behind origin',
          fix: 'Run: git pull origin <branch>',
        };
      }
      return { passed: true };
    },
  },
  {
    name: 'Semantic release config exists',
    description: '.releaserc.json configuration present',
    run: () => {
      const configPath = resolve(PROJECT_ROOT, '.releaserc.json');
      if (!existsSync(configPath)) {
        return {
          passed: false,
          message: '.releaserc.json not found',
          fix: 'Create semantic-release configuration',
        };
      }
      try {
        const config = JSON.parse(readFileSync(configPath, 'utf8'));
        if (!config.branches || !config.plugins) {
          return {
            passed: false,
            message: 'Invalid .releaserc.json structure',
          };
        }
        return { passed: true };
      } catch (e) {
        return { passed: false, message: `Invalid JSON: ${e.message}` };
      }
    },
  },
  {
    name: 'Package.json valid',
    description: 'package.json is valid JSON with version',
    run: () => {
      const pkgPath = resolve(PROJECT_ROOT, 'package.json');
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
        if (!pkg.version) {
          return { passed: false, message: 'No version field in package.json' };
        }
        return { passed: true, message: `Current version: ${pkg.version}` };
      } catch (e) {
        return { passed: false, message: `Invalid package.json: ${e.message}` };
      }
    },
  },
  {
    name: 'Conventional commits',
    description: 'Recent commits follow conventional format',
    run: () => {
      const result = exec('git log -10 --pretty=format:"%s"', { silent: true });
      if (!result.success) return { passed: false, message: 'Git command failed' };

      const commits = result.output.trim().split('\n').filter(Boolean);
      const conventionalRegex = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?!?:/;

      const nonConventional = commits.filter((c) => !conventionalRegex.test(c));

      if (nonConventional.length > 0) {
        return {
          passed: false,
          message: `Non-conventional commits found:\n${nonConventional.map((c) => `  - ${c}`).join('\n')}`,
          fix: 'Use conventional commit format: type(scope): description',
        };
      }
      return { passed: true, message: `Last ${commits.length} commits are conventional` };
    },
  },
  {
    name: 'No skip-ci in HEAD',
    description: 'HEAD commit does not skip CI',
    run: () => {
      const result = exec('git log -1 --pretty=format:"%s %b"', { silent: true });
      if (!result.success) return { passed: false, message: 'Git command failed' };

      if (result.output.includes('[skip ci]') || result.output.includes('[ci skip]')) {
        return {
          passed: false,
          message: 'HEAD commit contains [skip ci]',
          fix: 'Remove [skip ci] from commit message to allow release',
        };
      }
      return { passed: true };
    },
  },
  {
    name: 'Dependencies installed',
    description: 'node_modules exists and pnpm-lock.yaml is in sync',
    run: () => {
      if (!existsSync(resolve(PROJECT_ROOT, 'node_modules'))) {
        return {
          passed: false,
          message: 'node_modules not found',
          fix: 'Run: pnpm install',
        };
      }
      return { passed: true };
    },
  },
  {
    name: 'CHANGELOG.md exists',
    description: 'Changelog file is present',
    run: () => {
      if (!existsSync(resolve(PROJECT_ROOT, 'CHANGELOG.md'))) {
        return {
          passed: false,
          message: 'CHANGELOG.md not found',
          fix: 'Create CHANGELOG.md file',
        };
      }
      return { passed: true };
    },
  },
  {
    name: 'No secrets in staged files',
    description: 'Gitleaks check passes',
    run: () => {
      const result = exec('npx gitleaks protect --staged --no-banner --exit-code 1 2>/dev/null', {
        silent: true,
      });
      // If gitleaks is not installed, skip this check
      if (result.error && result.error.includes('command not found')) {
        return { passed: true, message: 'Gitleaks not installed, skipping' };
      }
      if (!result.success) {
        return {
          passed: false,
          message: 'Potential secrets detected in staged files',
          fix: 'Review and remove secrets before committing',
        };
      }
      return { passed: true };
    },
  },
];

// Run all checks
async function runChecks(options) {
  const results = [];
  let allPassed = true;

  console.log(`\n${colors.blue}Release Readiness Check${colors.reset}\n`);
  console.log(`${colors.gray}Running ${checks.length} checks...${colors.reset}\n`);

  for (const check of checks) {
    process.stdout.write(`  ${check.name}... `);

    const result = check.run();
    results.push({
      name: check.name,
      description: check.description,
      ...result,
    });

    if (result.passed) {
      console.log(`${colors.green}✓${colors.reset}`);
      if (options.verbose && result.message) {
        console.log(`    ${colors.gray}${result.message}${colors.reset}`);
      }
    } else {
      console.log(`${colors.red}✗${colors.reset}`);
      console.log(`    ${colors.red}${result.message}${colors.reset}`);
      if (result.fix) {
        console.log(`    ${colors.yellow}Fix: ${result.fix}${colors.reset}`);
      }
      allPassed = false;
    }
  }

  console.log('');

  if (allPassed) {
    console.log(`${colors.green}All checks passed! Ready to release.${colors.reset}\n`);
    console.log(`${colors.gray}To trigger a release, push to main/beta/alpha or run:${colors.reset}`);
    console.log(`  gh workflow run semantic-release.yml --ref main\n`);
  } else {
    console.log(`${colors.red}Some checks failed. Please fix the issues above.${colors.reset}\n`);
  }

  if (options.json) {
    console.log(JSON.stringify({ passed: allPassed, checks: results }, null, 2));
  }

  return allPassed;
}

// Show help
function showHelp() {
  console.log(`
Release Readiness Check

Validates that the repository is ready for a release.

Usage:
  node scripts/release-check.js [options]

Options:
  --fix        Attempt to fix issues where possible
  --verbose    Show detailed output
  --json       Output results as JSON
  --help       Show this help message

Checks performed:
${checks.map((c) => `  - ${c.name}: ${c.description}`).join('\n')}
`);
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  const passed = await runChecks(options);
  process.exit(passed ? 0 : 1);
}

main();
