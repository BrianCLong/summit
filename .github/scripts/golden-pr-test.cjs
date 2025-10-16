#!/usr/bin/env node

/**
 * Golden PR Test Suite
 *
 * Validates Release Captain functionality with carefully crafted test scenarios.
 * Used for both CI validation and manual verification of the system.
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

class GoldenPRTester {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
    this.testRepo = options.testRepo || process.env.GITHUB_REPOSITORY;
    this.githubToken = options.githubToken || process.env.GITHUB_TOKEN;
    this.results = [];
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'success' ? '✅' : '📝';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runTest(testName, testFn) {
    this.log(`Starting test: ${testName}`, 'info');

    try {
      const startTime = Date.now();
      const result = await testFn();
      const duration = Date.now() - startTime;

      this.results.push({
        name: testName,
        status: 'PASS',
        duration,
        result,
      });

      this.log(`Test passed: ${testName} (${duration}ms)`, 'success');
      return result;
    } catch (error) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        error: error.message,
      });

      this.log(`Test failed: ${testName} - ${error.message}`, 'error');
      throw error;
    }
  }

  async createTestPR(scenario) {
    this.log(`Creating test PR for scenario: ${scenario.name}`);

    // Create test branch
    const branchName = `golden-test-${scenario.name}-${Date.now()}`;

    if (!this.dryRun) {
      execSync(`git checkout -b ${branchName}`, { stdio: 'pipe' });

      // Apply test changes
      for (const change of scenario.changes) {
        await this.applyChange(change);
      }

      // Commit changes
      execSync('git add .', { stdio: 'pipe' });
      execSync(`git commit -m "${scenario.commitMessage}"`, { stdio: 'pipe' });
      execSync(`git push origin ${branchName}`, { stdio: 'pipe' });

      // Create PR
      const prData = execSync(
        `gh pr create \
        --title "${scenario.title}" \
        --body "${scenario.body}" \
        --label "${scenario.labels.join(',')}" \
        ${scenario.draft ? '--draft' : ''} \
        --json number,url`,
        { encoding: 'utf8' },
      );

      const pr = JSON.parse(prData);
      this.log(`Created PR #${pr.number}: ${pr.url}`);

      return {
        number: pr.number,
        url: pr.url,
        branch: branchName,
      };
    } else {
      this.log('Dry run: Would create PR with changes');
      return {
        number: 999,
        url: 'https://github.com/example/repo/pull/999',
        branch: branchName,
      };
    }
  }

  async applyChange(change) {
    switch (change.type) {
      case 'create_file':
        fs.writeFileSync(change.path, change.content);
        break;
      case 'modify_file':
        if (fs.existsSync(change.path)) {
          const content = fs.readFileSync(change.path, 'utf8');
          const modified = content.replace(change.find, change.replace);
          fs.writeFileSync(change.path, modified);
        }
        break;
      case 'delete_file':
        if (fs.existsSync(change.path)) {
          fs.unlinkSync(change.path);
        }
        break;
    }
  }

  async triggerReleaseCapt(prNumber, command = '/merge-pr') {
    this.log(`Triggering Release Captain: ${command} ${prNumber}`);

    if (!this.dryRun) {
      // Post comment to trigger Release Captain
      execSync(`gh pr comment ${prNumber} --body "${command} ${prNumber}"`, {
        env: { ...process.env, GH_TOKEN: this.githubToken },
      });

      // Wait for workflow to complete
      await this.waitForWorkflow(prNumber);
    } else {
      this.log('Dry run: Would trigger Release Captain');
    }
  }

  async waitForWorkflow(prNumber, timeoutMs = 300000) {
    this.log(`Waiting for Release Captain workflow to complete...`);

    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      try {
        const runs = execSync(
          `gh run list --workflow=release-captain.yml --limit=5 --json status,conclusion,databaseId`,
          {
            encoding: 'utf8',
            env: { ...process.env, GH_TOKEN: this.githubToken },
          },
        );

        const runList = JSON.parse(runs);
        const latestRun = runList[0];

        if (latestRun.status === 'completed') {
          this.log(
            `Workflow completed with conclusion: ${latestRun.conclusion}`,
          );
          return latestRun;
        }

        await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
      } catch (error) {
        this.log(`Error checking workflow status: ${error.message}`);
      }
    }

    throw new Error('Workflow timeout');
  }

  async cleanupTestPR(pr) {
    if (!this.dryRun && pr.number !== 999) {
      this.log(`Cleaning up test PR #${pr.number}`);

      try {
        // Close PR
        execSync(`gh pr close ${pr.number} --delete-branch`, {
          env: { ...process.env, GH_TOKEN: this.githubToken },
        });

        this.log(`Cleaned up PR #${pr.number} and branch ${pr.branch}`);
      } catch (error) {
        this.log(`Cleanup failed: ${error.message}`, 'error');
      }
    }
  }

  getTestScenarios() {
    return [
      {
        name: 'low-risk-frontend',
        title: 'feat(web): add user profile avatar component',
        body: 'Simple frontend component with tests and documentation.',
        commitMessage: 'Add avatar component with tests',
        labels: ['frontend', 'low-risk'],
        draft: false,
        changes: [
          {
            type: 'create_file',
            path: 'apps/web/src/components/Avatar.tsx',
            content: `import React from 'react';

interface AvatarProps {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar: React.FC<AvatarProps> = ({ src, alt, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <img
      src={src}
      alt={alt}
      className={\`rounded-full \${sizeClasses[size]}\`}
    />
  );
};`,
          },
          {
            type: 'create_file',
            path: 'apps/web/src/components/__tests__/Avatar.test.tsx',
            content: `import { render, screen } from '@testing-library/react';
import { Avatar } from '../Avatar';

describe('Avatar', () => {
  it('renders with correct src and alt', () => {
    render(<Avatar src="test.jpg" alt="Test Avatar" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'test.jpg');
    expect(img).toHaveAttribute('alt', 'Test Avatar');
  });

  it('applies correct size classes', () => {
    render(<Avatar src="test.jpg" alt="Test" size="lg" />);
    const img = screen.getByRole('img');
    expect(img).toHaveClass('w-16', 'h-16');
  });
});`,
          },
        ],
        expectedOutcome: 'approved',
      },
      {
        name: 'medium-risk-backend',
        title: 'feat(api): add user preferences endpoint',
        body: 'New API endpoint with validation and tests.',
        commitMessage: 'Add user preferences API endpoint',
        labels: ['backend', 'api', 'medium-risk'],
        draft: false,
        changes: [
          {
            type: 'create_file',
            path: 'services/api/src/routes/preferences.ts',
            content: `import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';

const router = Router();

const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark']).optional(),
  language: z.string().optional(),
  notifications: z.boolean().optional()
});

router.get('/preferences', async (req, res) => {
  // Get user preferences
  res.json({ preferences: {} });
});

router.put('/preferences', validateRequest(preferencesSchema), async (req, res) => {
  // Update user preferences
  res.json({ success: true });
});

export default router;`,
          },
          {
            type: 'create_file',
            path: 'services/api/src/routes/__tests__/preferences.test.ts',
            content: `import request from 'supertest';
import app from '../../app';

describe('Preferences API', () => {
  it('should get user preferences', async () => {
    const response = await request(app)
      .get('/api/preferences')
      .expect(200);

    expect(response.body).toHaveProperty('preferences');
  });

  it('should update user preferences', async () => {
    const response = await request(app)
      .put('/api/preferences')
      .send({ theme: 'dark', notifications: true })
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});`,
          },
        ],
        expectedOutcome: 'approved',
      },
      {
        name: 'high-risk-migration',
        title: 'feat(db): add user_settings table migration',
        body: 'Database migration to add user settings table with proper constraints.',
        commitMessage: 'Add user_settings table migration',
        labels: ['database', 'migration', 'high-risk'],
        draft: false,
        changes: [
          {
            type: 'create_file',
            path: 'services/api/migrations/20241201_add_user_settings.sql',
            content: `-- Add user_settings table
-- Migration: 20241201_add_user_settings
-- Author: Release Captain Test

BEGIN;

CREATE TABLE user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  setting_key VARCHAR(255) NOT NULL,
  setting_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, setting_key)
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_user_settings_key ON user_settings(setting_key);

COMMIT;`,
          },
          {
            type: 'create_file',
            path: 'services/api/migrations/rollback/20241201_add_user_settings.sql',
            content: `-- Rollback user_settings table
-- Migration: 20241201_add_user_settings (rollback)

BEGIN;

DROP TABLE IF EXISTS user_settings;

COMMIT;`,
          },
        ],
        expectedOutcome: 'requires_migration_review',
      },
      {
        name: 'blocking-security-issue',
        title: 'fix: remove hardcoded API key',
        body: 'Removes accidentally committed API key.',
        commitMessage: 'Remove hardcoded API key',
        labels: ['security', 'hotfix'],
        draft: false,
        changes: [
          {
            type: 'create_file',
            path: 'services/api/src/config/secrets.ts',
            content: `// Configuration with hardcoded secret (should be blocked)
export const config = {
  apiKey: 'sk-1234567890abcdef',  // This should trigger security scan
  database: {
    host: process.env.DB_HOST,
    password: 'hardcoded-password-123'  // This should also trigger scan
  }
};`,
          },
        ],
        expectedOutcome: 'blocked_security',
      },
      {
        name: 'failing-tests',
        title: 'feat: add broken feature',
        body: 'Feature that should fail tests.',
        commitMessage: 'Add feature with failing tests',
        labels: ['feature'],
        draft: false,
        changes: [
          {
            type: 'create_file',
            path: 'services/api/src/broken-feature.ts',
            content: `export function brokenFunction() {
  throw new Error('This function is intentionally broken');
}`,
          },
          {
            type: 'create_file',
            path: 'services/api/src/__tests__/broken-feature.test.ts',
            content: `import { brokenFunction } from '../broken-feature';

describe('Broken Feature', () => {
  it('should work correctly', () => {
    // This test will fail
    expect(brokenFunction()).toBe('success');
  });
});`,
          },
        ],
        expectedOutcome: 'blocked_tests',
      },
    ];
  }

  async runAllTests() {
    this.log('🚀 Starting Golden PR Test Suite');

    const scenarios = this.getTestScenarios();
    let passedTests = 0;
    let failedTests = 0;

    for (const scenario of scenarios) {
      try {
        await this.runTest(`golden-pr-${scenario.name}`, async () => {
          const pr = await this.createTestPR(scenario);

          try {
            await this.triggerReleaseCapt(pr.number);

            // Verify the expected outcome
            await this.verifyOutcome(pr.number, scenario.expectedOutcome);

            return { pr, outcome: scenario.expectedOutcome };
          } finally {
            await this.cleanupTestPR(pr);
          }
        });

        passedTests++;
      } catch (error) {
        failedTests++;
        if (!this.dryRun) {
          this.log(
            `Test scenario ${scenario.name} failed: ${error.message}`,
            'error',
          );
        }
      }
    }

    // Generate test report
    const report = this.generateReport(passedTests, failedTests);
    this.log('📊 Test suite completed');

    return {
      passedTests,
      failedTests,
      totalTests: scenarios.length,
      report,
      results: this.results,
    };
  }

  async verifyOutcome(prNumber, expectedOutcome) {
    this.log(
      `Verifying outcome for PR #${prNumber}: expected ${expectedOutcome}`,
    );

    if (this.dryRun) {
      this.log('Dry run: Skipping outcome verification');
      return;
    }

    // Get PR comments to check Release Captain's response
    const comments = execSync(
      `gh pr view ${prNumber} --json comments --jq '.comments[].body'`,
      {
        encoding: 'utf8',
        env: { ...process.env, GH_TOKEN: this.githubToken },
      },
    );

    switch (expectedOutcome) {
      case 'approved':
        if (!comments.includes('READY TO MERGE')) {
          throw new Error('Expected PR to be approved for merge');
        }
        break;
      case 'blocked_security':
        if (!comments.includes('security') && !comments.includes('violation')) {
          throw new Error('Expected security blocking');
        }
        break;
      case 'blocked_tests':
        if (!comments.includes('test') && !comments.includes('fail')) {
          throw new Error('Expected test failure blocking');
        }
        break;
      case 'requires_migration_review':
        if (!comments.includes('migration') && !comments.includes('review')) {
          throw new Error('Expected migration review requirement');
        }
        break;
    }

    this.log(`✅ Outcome verified: ${expectedOutcome}`);
  }

  generateReport(passed, failed) {
    const total = passed + failed;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    return `
# 🏆 Golden PR Test Results

**Summary**: ${passed}/${total} tests passed (${passRate}%)

## Test Results
${this.results
  .map(
    (result) =>
      `- **${result.name}**: ${result.status}${result.duration ? ` (${result.duration}ms)` : ''}${result.error ? ` - ${result.error}` : ''}`,
  )
  .join('\n')}

## Release Captain Validation
${passed === total ? '✅ Release Captain is functioning correctly' : '❌ Release Captain has issues that need attention'}

---
*Generated at ${new Date().toISOString()}*
    `;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    testRepo: process.env.GITHUB_REPOSITORY,
    githubToken: process.env.GITHUB_TOKEN,
  };

  if (!options.testRepo) {
    console.error('GITHUB_REPOSITORY environment variable required');
    process.exit(1);
  }

  if (!options.githubToken) {
    console.error('GITHUB_TOKEN environment variable required');
    process.exit(1);
  }

  try {
    const tester = new GoldenPRTester(options);
    const results = await tester.runAllTests();

    console.log(results.report);

    if (results.failedTests > 0) {
      console.error(`❌ ${results.failedTests} tests failed`);
      process.exit(1);
    } else {
      console.log(`✅ All ${results.passedTests} tests passed`);
      process.exit(0);
    }
  } catch (error) {
    console.error('Golden PR test suite failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { GoldenPRTester };
