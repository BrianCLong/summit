#!/usr/bin/env npx ts-node --esm
/**
 * PR Validation Script
 *
 * Validates a pull request against PVE policies.
 */

import { createPRValidator } from '../src/github/pull-request-validator.js';
import { execSync } from 'node:child_process';
import { parseDiff } from '../src/github/diff-parser.js';

async function main() {
  const prNumber = process.env.PR_NUMBER ? parseInt(process.env.PR_NUMBER, 10) : undefined;
  const githubToken = process.env.GITHUB_TOKEN;

  console.log('🔍 PVE Policy Validation');
  console.log('========================');

  // Get diff
  let diffOutput: string;
  try {
    if (process.env.GITHUB_BASE_REF) {
      // In GitHub Actions PR context
      diffOutput = execSync(
        `git diff origin/${process.env.GITHUB_BASE_REF}...HEAD`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 },
      );
    } else {
      // Local: compare against main
      diffOutput = execSync('git diff main...HEAD', {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
      });
    }
  } catch (error) {
    console.error('Failed to get diff:', error);
    process.exit(1);
  }

  if (!diffOutput.trim()) {
    console.log('✅ No changes to validate');
    process.exit(0);
  }

  const validator = createPRValidator({
    githubToken,
    owner: process.env.GITHUB_REPOSITORY?.split('/')[0],
    repo: process.env.GITHUB_REPOSITORY?.split('/')[1],
  });

  try {
    const result = await validator.validateDiff(diffOutput, {
      title: process.env.PR_TITLE || 'Local validation',
      body: process.env.PR_BODY,
      author: process.env.GITHUB_ACTOR || 'local',
      isDraft: false,
    });

    console.log('');
    console.log(`📊 Results: ${result.summary.passed} passed, ${result.summary.errors} errors, ${result.summary.warnings} warnings`);
    console.log('');

    // Print errors
    const errors = result.results.filter((r) => !r.allowed && r.severity === 'error');
    if (errors.length > 0) {
      console.log('❌ Errors:');
      for (const error of errors) {
        console.log(`  - [${error.policy}] ${error.message}`);
        if (error.location?.file) {
          console.log(`    File: ${error.location.file}${error.location.line ? `:${error.location.line}` : ''}`);
        }
        if (error.fix) {
          console.log(`    Fix: ${error.fix}`);
        }
      }
      console.log('');
    }

    // Print warnings
    const warnings = result.results.filter((r) => !r.allowed && r.severity === 'warning');
    if (warnings.length > 0) {
      console.log('⚠️  Warnings:');
      for (const warning of warnings) {
        console.log(`  - [${warning.policy}] ${warning.message}`);
      }
      console.log('');
    }

    if (result.passed) {
      console.log('✅ All policy checks passed!');
      process.exit(0);
    } else {
      console.log('❌ Policy validation failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('Validation error:', error);
    process.exit(1);
  }
}

main();
