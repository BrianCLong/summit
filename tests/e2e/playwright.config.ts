/**
 * Playwright Configuration for IntelGraph Cross-Browser Testing
 *
 * Comprehensive browser testing setup supporting Chrome, Firefox, Safari, and Edge
 * with accessibility testing, performance monitoring, and security validation.
 *
 * Enhanced with:
 * - Intelligent parallelization for CI/CD
 * - Visual regression testing support
 * - Sharding for distributed execution
 * - Per-test timeout management
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import os from 'os';

/**
 * Calculate optimal worker count based on environment
 */
const getWorkerCount = () => {
  if (process.env.CI) {
    // CI environment: use parallelization with shard support
    return parseInt(process.env.E2E_WORKERS || '4', 10);
  }
  // Local development: use 50% of CPU cores
  return Math.max(1, Math.floor(os.cpus().length / 2));
};

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry failed tests */
  retries: process.env.CI ? 2 : 0,

  /* Parallelization with intelligent worker count */
  workers: getWorkerCount(),

  /* Sharding support for distributed test execution */
  shard: process.env.CI
    ? {
        current: parseInt(process.env.SHARD_INDEX || '1', 10),
        total: parseInt(process.env.SHARD_TOTAL || '1', 10),
      }
    : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI
    ? [
        ['list'],
        ['json', { outputFile: 'test-results/test-results.json' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['github'], // GitHub Actions annotations
        ['./reporters/intelgraph-reporter.ts'],
      ]
    : [
        ['html', { outputFolder: 'playwright-report', open: 'on-failure' }],
        ['list'],
        ['./reporters/intelgraph-reporter.ts'],
      ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshots on failure */
    screenshot: 'only-on-failure',

    /* Video recording */
    video: 'retain-on-failure',

    /* Accept downloads */
    acceptDownloads: true,

    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,

    /* Custom test timeout */
    actionTimeout: 30000,
    navigationTimeout: 60000,

    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'X-Test-Environment': process.env.NODE_ENV || 'test',
      'X-Test-Suite': 'playwright-e2e',
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        // Enable performance monitoring
        launchOptions: {
          args: ['--enable-precise-memory-info', '--enable-automation'],
        },
      },
    },

    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    /* Test against mobile viewports. */
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'webkit-mobile',
      use: { ...devices['iPhone 12'] },
    },

    /* Microsoft Edge */
    {
      name: 'msedge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },

    /* Google Chrome */
    {
      name: 'google-chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },

    // High resolution testing
    {
      name: 'chromium-4k',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 3840, height: 2160 },
      },
    },

    // Security testing with specific flags
    {
      name: 'chromium-security',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--enable-precise-memory-info',
          ],
        },
      },
    },

    // Accessibility testing
    {
      name: 'chromium-a11y',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
      testMatch: '**/*accessibility*.spec.ts',
    },

    // Performance testing
    {
      name: 'chromium-performance',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--enable-automation',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
          ],
        },
      },
      testMatch: '**/*performance*.spec.ts',
    },
  ],

  /* Global setup and teardown */
  globalSetup: require.resolve('./global-setup'),
  globalTeardown: require.resolve('./global-teardown'),

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },

  /* Test output directory */
  outputDir: 'test-results/',

  /* Maximum time one test can run for */
  timeout: 120000,

  /* Expect timeout */
  expect: {
    timeout: 10000,
    // Custom screenshot comparison threshold
    toHaveScreenshot: { threshold: 0.2 },
    toMatchSnapshot: { threshold: 0.3 },
  },
});
