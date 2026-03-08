"use strict";
/**
 * Playwright Global Setup
 *
 * Handles authentication, test data setup, and environment preparation
 * for cross-browser testing suite.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const fs_1 = __importDefault(require("fs"));
const globalSetup = async (config) => {
    console.log('🚀 Starting global setup for cross-browser tests...');
    // Create test results directories
    const dirs = [
        'test-results',
        'playwright-report',
        'allure-results',
        'screenshots',
        'videos',
    ];
    dirs.forEach((dir) => {
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
    });
    // Set up authentication if required
    if (process.env.E2E_AUTH_REQUIRED === 'true') {
        await setupAuthentication();
    }
    // Set up test data
    await setupTestData();
    // Verify application is running
    await verifyApplicationHealth();
    console.log('✅ Global setup completed successfully');
};
async function setupAuthentication() {
    console.log('🔐 Setting up authentication for E2E tests...');
    const browser = await test_1.chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
        const baseURL = process.env.BASE_URL || 'http://localhost:3000';
        // Navigate to login page
        await page.goto(`${baseURL}/login`);
        // Check if we need to perform login
        const loginForm = page.locator('[data-testid="login-form"]');
        if (await loginForm.isVisible()) {
            // Perform login with test credentials
            await page.fill('[data-testid="email-input"]', process.env.E2E_TEST_EMAIL || 'test@intelgraph.ai');
            await page.fill('[data-testid="password-input"]', process.env.E2E_TEST_PASSWORD || 'test-password-123');
            await page.click('[data-testid="login-button"]');
            // Wait for successful login
            await page.waitForURL('**/dashboard', { timeout: 30000 });
            // Save authentication state
            await context.storageState({ path: 'auth-state.json' });
            console.log('✅ Authentication state saved');
        }
        else {
            console.log('ℹ️ No login required or already authenticated');
        }
    }
    catch (error) {
        console.warn('⚠️ Authentication setup failed:', error);
        // Don't fail global setup for auth issues
    }
    finally {
        await browser.close();
    }
}
async function setupTestData() {
    console.log('📊 Setting up test data...');
    // Create test data for E2E tests
    const testData = {
        users: [
            {
                id: 'test-user-1',
                email: 'analyst@test.intelgraph.ai',
                role: 'ANALYST',
                tenantId: 'test-tenant',
            },
            {
                id: 'test-user-2',
                email: 'admin@test.intelgraph.ai',
                role: 'ADMIN',
                tenantId: 'test-tenant',
            },
        ],
        pipelines: [
            {
                id: 'test-pipeline-1',
                name: 'E2E Test Pipeline',
                description: 'Pipeline created for E2E testing',
                spec: {
                    nodes: [
                        { id: 'input', type: 'source' },
                        { id: 'process', type: 'transform' },
                        { id: 'output', type: 'sink' },
                    ],
                    edges: [
                        { from: 'input', to: 'process' },
                        { from: 'process', to: 'output' },
                    ],
                },
            },
        ],
        executors: [
            {
                id: 'test-executor-1',
                name: 'E2E Test Executor',
                kind: 'cpu',
                capacity: 4,
                status: 'ready',
            },
        ],
        mcpServers: [
            {
                id: 'test-mcp-server-1',
                name: 'E2E Test MCP Server',
                url: 'ws://localhost:3001/mcp',
                scopes: ['test:read', 'test:write'],
            },
        ],
    };
    // Save test data to file
    fs_1.default.writeFileSync('test-data.json', JSON.stringify(testData, null, 2));
    // If API is available, seed test data
    if (process.env.SEED_TEST_DATA === 'true') {
        await seedTestDataViaAPI(testData);
    }
    console.log('✅ Test data setup completed');
}
async function seedTestDataViaAPI(testData) {
    try {
        const baseURL = process.env.BASE_URL || 'http://localhost:3000';
        const browser = await test_1.chromium.launch();
        const context = await browser.newContext();
        // Load auth state if available
        if (fs_1.default.existsSync('auth-state.json')) {
            await context.addInitScript(() => {
                const authState = JSON.parse(fs_1.default.readFileSync('auth-state.json', 'utf8'));
                if (authState.localStorage) {
                    for (const [key, value] of Object.entries(authState.localStorage)) {
                        localStorage.setItem(key, value);
                    }
                }
            });
        }
        const page = await context.newPage();
        // Seed pipelines via API
        for (const pipeline of testData.pipelines) {
            await page.request.post(`${baseURL}/api/maestro/v1/pipelines`, {
                data: pipeline,
                failOnStatusCode: false, // Don't fail if pipeline already exists
            });
        }
        // Seed executors via API
        for (const executor of testData.executors) {
            await page.request.post(`${baseURL}/api/maestro/v1/executors`, {
                data: executor,
                failOnStatusCode: false,
            });
        }
        console.log('✅ Test data seeded via API');
        await browser.close();
    }
    catch (error) {
        console.warn('⚠️ Failed to seed test data via API:', error);
    }
}
async function verifyApplicationHealth() {
    console.log('🏥 Verifying application health...');
    const browser = await test_1.chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
        const baseURL = process.env.BASE_URL || 'http://localhost:3000';
        // Check health endpoint
        const healthResponse = await page.request.get(`${baseURL}/health`);
        if (!healthResponse.ok()) {
            throw new Error(`Health check failed: ${healthResponse.status()}`);
        }
        // Check if main application loads
        await page.goto(baseURL);
        await page.waitForSelector('body', { timeout: 30000 });
        // Check for critical JavaScript errors
        const errors = [];
        page.on('pageerror', (error) => {
            errors.push(error.message);
        });
        await page.waitForTimeout(3000);
        if (errors.length > 0) {
            console.warn('⚠️ JavaScript errors detected:', errors);
        }
        else {
            console.log('✅ No critical JavaScript errors found');
        }
        // Check if Maestro API is available
        try {
            const maestroHealthResponse = await page.request.get(`${baseURL}/api/maestro/v1/health`);
            if (maestroHealthResponse.ok()) {
                console.log('✅ Maestro API health check passed');
            }
            else {
                console.warn('⚠️ Maestro API health check failed');
            }
        }
        catch (error) {
            console.warn('⚠️ Maestro API not available:', error);
        }
        console.log('✅ Application health verification completed');
    }
    catch (error) {
        console.error('❌ Application health check failed:', error);
        throw error; // Fail global setup if app is not healthy
    }
    finally {
        await browser.close();
    }
}
exports.default = globalSetup;
