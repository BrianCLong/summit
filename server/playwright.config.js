"use strict";
/**
 * Playwright Configuration for IntelGraph E2E Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
/**
 * See https://playwright.dev/docs/test-configuration.
 */
exports.default = (0, test_1.defineConfig)({
    testDir: './tests/e2e',
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 1 : undefined,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['junit', { outputFile: 'test-results/playwright-results.xml' }],
        ['list'],
    ],
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: process.env.BASE_URL || 'http://localhost:3000',
        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'retain-on-failure',
        /* Record video on failure */
        video: 'retain-on-failure',
        /* Take screenshot on failure */
        screenshot: 'only-on-failure',
        /* Ignore HTTPS errors */
        ignoreHTTPSErrors: true,
    },
    /* Configure projects for major browsers */
    projects: [
        // Setup project
        {
            name: 'setup',
            testMatch: /.*\.setup\.ts/,
        },
        {
            name: 'chromium',
            use: { ...test_1.devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'firefox',
            use: { ...test_1.devices['Desktop Firefox'] },
            dependencies: ['setup'],
        },
        {
            name: 'webkit',
            use: { ...test_1.devices['Desktop Safari'] },
            dependencies: ['setup'],
        },
        /* Test against mobile viewports. */
        {
            name: 'Mobile Chrome',
            use: { ...test_1.devices['Pixel 5'] },
            dependencies: ['setup'],
        },
        {
            name: 'Mobile Safari',
            use: { ...test_1.devices['iPhone 12'] },
            dependencies: ['setup'],
        },
        /* Test against branded browsers. */
        {
            name: 'Microsoft Edge',
            use: { ...test_1.devices['Desktop Edge'], channel: 'msedge' },
            dependencies: ['setup'],
        },
        {
            name: 'Google Chrome',
            use: { ...test_1.devices['Desktop Chrome'], channel: 'chrome' },
            dependencies: ['setup'],
        },
    ],
    /* Run your local dev server before starting the tests */
    webServer: process.env.CI
        ? undefined
        : [
            {
                command: 'pnpm run dev',
                cwd: '../client',
                port: 3000,
                reuseExistingServer: !process.env.CI,
                timeout: 120000,
            },
            {
                command: 'pnpm run dev',
                cwd: '../server',
                port: 4000,
                reuseExistingServer: !process.env.CI,
                timeout: 120000,
            },
        ],
    /* Global setup and teardown */
    globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
    globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),
    /* Test timeout */
    timeout: 30000,
    expect: {
        timeout: 10000,
    },
    /* Output directories */
    outputDir: 'test-results/playwright-artifacts',
});
