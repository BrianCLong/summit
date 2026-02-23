/**
 * Playwright Global Teardown
 *
 * Cleanup after cross-browser testing suite completion.
 */

import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const globalTeardown = async (config: FullConfig) => {
  console.log('🧹 Starting global teardown for cross-browser tests...');

  // Clean up authentication files
  const authFiles = ['auth-state.json', 'test-data.json'];

  authFiles.forEach((file) => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`✅ Cleaned up ${file}`);
    }
  });

  // Clean up temporary test data files
  const tempDir = path.join(process.cwd(), 'temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('✅ Cleaned up temporary directory');
  }

  // Generate final test report summary
  const testResults = path.join('test-results', 'test-results.json');
  if (fs.existsSync(testResults)) {
    try {
      const results = JSON.parse(fs.readFileSync(testResults, 'utf8'));
      const summary = {
        totalTests:
          results.suites?.reduce(
            (sum: number, suite: any) => sum + (suite.specs?.length || 0),
            0,
          ) || 0,
        passed:
          results.suites?.reduce(
            (sum: number, suite: any) =>
              sum + (suite.specs?.filter((spec: any) => spec.ok).length || 0),
            0,
          ) || 0,
        failed:
          results.suites?.reduce(
            (sum: number, suite: any) =>
              sum + (suite.specs?.filter((spec: any) => !spec.ok).length || 0),
            0,
          ) || 0,
        duration: results.stats?.duration || 0,
      };

      console.log('📊 Test Summary:');
      console.log(`   Total: ${summary.totalTests}`);
      console.log(`   Passed: ${summary.passed}`);
      console.log(`   Failed: ${summary.failed}`);
      console.log(`   Duration: ${(summary.duration / 1000).toFixed(2)}s`);

      // Write summary for CI/CD systems
      fs.writeFileSync(
        path.join('test-results', 'summary.json'),
        JSON.stringify(summary, null, 2),
      );
    } catch (error) {
      console.warn('⚠️ Could not parse test results:', error);
    }
  }

  console.log('✅ Global teardown completed successfully');
};

export default globalTeardown;
