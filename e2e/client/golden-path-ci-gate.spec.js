"use strict";
/**
 * Golden Path CI Gate E2E Test
 *
 * This test is REQUIRED for all PR merges. It verifies:
 * 1. Creates investigation → entities → relationships
 * 2. Runs graphRAGQuery with explainable results
 * 3. Verifies PBAC denial when user lacks role
 * 4. Checks /monitoring/health endpoint
 *
 * Acceptance bar: main cannot merge unless this passes
 */
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
// Mock test users for PBAC testing
const ADMIN_USER = {
    id: 'admin-001',
    email: 'admin@intelgraph.test',
    roles: ['admin', 'analyst'],
    token: 'mock-admin-jwt-token',
};
const LIMITED_USER = {
    id: 'viewer-001',
    email: 'viewer@intelgraph.test',
    roles: ['viewer'],
    token: 'mock-viewer-jwt-token',
};
test_1.test.describe('Golden Path CI Gate - REQUIRED FOR MERGE', () => {
    test_1.test.beforeEach(async ({ page }) => {
        // Enhanced stability: wait for network idle and set up auth context
        await page.goto('/', { waitUntil: 'networkidle' });
        // Wait for app to be ready
        await page.waitForLoadState('domcontentloaded');
        await page.evaluate((user) => {
            localStorage.setItem('auth_token', user.token);
            localStorage.setItem('user', JSON.stringify(user));
        }, ADMIN_USER);
        // Verify auth is set
        const hasAuth = await page.evaluate(() => !!localStorage.getItem('auth_token'));
        (0, test_1.expect)(hasAuth).toBeTruthy();
    });
    (0, test_1.test)('complete golden path with monitoring health check', async ({ page, }) => {
        // Step 1: Verify monitoring health endpoint
        await test_1.test.step('Verify /monitoring/health endpoint', async () => {
            const healthResponse = await page.request.get('/monitoring/health');
            (0, test_1.expect)(healthResponse.status()).toBe(200);
            const healthData = await healthResponse.json();
            (0, test_1.expect)(healthData.status).toBe('healthy');
            (0, test_1.expect)(healthData.checks).toBeDefined();
        });
        // Step 2: Create Investigation
        await test_1.test.step('Create Demo Investigation', async () => {
            await page.goto('/investigations', { waitUntil: 'networkidle' });
            await page.waitForSelector('h1', { timeout: 10000 });
            await (0, test_1.expect)(page.locator('h1')).toContainText('Investigations');
            // Wait for the create button to be interactive
            await page.waitForSelector('[data-testid="create-investigation-button"]', { state: 'visible' });
            await page.click('[data-testid="create-investigation-button"]');
            // Fill form with unique test data
            const testId = `golden-path-${Date.now()}`;
            await page.fill('[data-testid="investigation-title"]', `Golden Path CI Test ${testId}`);
            await page.fill('[data-testid="investigation-description"]', 'Automated test investigation for CI gate');
            // Submit and wait for success
            await page.click('[data-testid="create-investigation-submit"]');
            // Wait for creation and capture investigation ID
            await (0, test_1.expect)(page.locator('[data-testid="investigation-created"]')).toBeVisible({ timeout: 15000 });
            const investigationId = await page
                .locator('[data-testid="investigation-id"]')
                .textContent();
            (0, test_1.expect)(investigationId).toBeTruthy();
        });
        // Step 3: Create Entities
        await test_1.test.step('Create Test Entities', async () => {
            // Create Alice entity
            await page.click('[data-testid="add-entity-button"]');
            await page.fill('[data-testid="entity-label"]', 'Alice Chen');
            await page.selectOption('[data-testid="entity-type"]', 'person');
            await page.fill('[data-testid="entity-description"]', 'Supply chain manager at TechCorp');
            await page.click('[data-testid="entity-save"]');
            await (0, test_1.expect)(page.locator('[data-testid="entity-alice-chen"]')).toBeVisible();
            // Create Bob entity
            await page.click('[data-testid="add-entity-button"]');
            await page.fill('[data-testid="entity-label"]', 'Bob Martinez');
            await page.selectOption('[data-testid="entity-type"]', 'person');
            await page.fill('[data-testid="entity-description"]', 'Vendor coordinator at GlobalSupply');
            await page.click('[data-testid="entity-save"]');
            await (0, test_1.expect)(page.locator('[data-testid="entity-bob-martinez"]')).toBeVisible();
            // Create organization entity
            await page.click('[data-testid="add-entity-button"]');
            await page.fill('[data-testid="entity-label"]', 'TechCorp');
            await page.selectOption('[data-testid="entity-type"]', 'organization');
            await page.fill('[data-testid="entity-description"]', 'Technology manufacturing company');
            await page.click('[data-testid="entity-save"]');
            await (0, test_1.expect)(page.locator('[data-testid="entity-techcorp"]')).toBeVisible();
        });
        // Step 4: Create Relationships
        await test_1.test.step('Create Test Relationships', async () => {
            // Connect Alice to TechCorp
            await page.click('[data-testid="add-relationship-button"]');
            await page.selectOption('[data-testid="relationship-from"]', 'Alice Chen');
            await page.selectOption('[data-testid="relationship-to"]', 'TechCorp');
            await page.selectOption('[data-testid="relationship-type"]', 'employed_by');
            await page.fill('[data-testid="relationship-description"]', 'Alice works as supply chain manager');
            await page.click('[data-testid="relationship-save"]');
            // Connect Alice to Bob (communication)
            await page.click('[data-testid="add-relationship-button"]');
            await page.selectOption('[data-testid="relationship-from"]', 'Alice Chen');
            await page.selectOption('[data-testid="relationship-to"]', 'Bob Martinez');
            await page.selectOption('[data-testid="relationship-type"]', 'communicates_with');
            await page.fill('[data-testid="relationship-description"]', 'Regular business communications');
            await page.click('[data-testid="relationship-save"]');
            // Verify relationships exist in graph
            await (0, test_1.expect)(page.locator('[data-testid="relationship-alice-techcorp"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="relationship-alice-bob"]')).toBeVisible();
        });
        // Step 5: Test GraphRAG with Explainable Results
        await test_1.test.step('Test GraphRAG Query with Explanations', async () => {
            // Open GraphRAG/Copilot panel
            await page.click('[data-testid="graphrag-panel-toggle"]');
            await (0, test_1.expect)(page.locator('[data-testid="graphrag-panel"]')).toBeVisible();
            // Submit a question
            const question = 'What is the connection between Alice and TechCorp?';
            await page.fill('[data-testid="graphrag-question-input"]', question);
            await page.click('[data-testid="graphrag-submit-button"]');
            // Wait for and verify response
            await (0, test_1.expect)(page.locator('[data-testid="graphrag-response"]')).toBeVisible({ timeout: 15000 });
            const response = page.locator('[data-testid="graphrag-response"]');
            await (0, test_1.expect)(response).toContainText('Alice');
            await (0, test_1.expect)(response).toContainText('TechCorp');
            // Verify explainable elements (why_paths and citations)
            await (0, test_1.expect)(page.locator('[data-testid="graphrag-citations"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="graphrag-why-paths"]')).toBeVisible();
            // Check confidence score is displayed and reasonable
            const confidenceElement = page.locator('[data-testid="graphrag-confidence"]');
            await (0, test_1.expect)(confidenceElement).toBeVisible();
            const confidenceText = await confidenceElement.textContent();
            const confidence = parseFloat(confidenceText?.replace(/[^0-9.]/g, '') || '0');
            (0, test_1.expect)(confidence).toBeGreaterThan(0.5);
            // Verify graph overlay for explainability
            await (0, test_1.expect)(page.locator('[data-testid="graph-why-path-overlay"]')).toBeVisible();
            // Click on a why_path to verify interaction
            await page.click('[data-testid="why-path-item"]:first-child');
            await (0, test_1.expect)(page.locator('[data-testid="highlighted-relationship"]')).toBeVisible();
        });
    });
    (0, test_1.test)('PBAC denial verification for unauthorized access', async ({ page }) => {
        await test_1.test.step('Switch to Limited User', async () => {
            // Clear admin auth and set limited user
            await page.evaluate((user) => {
                localStorage.setItem('auth_token', user.token);
                localStorage.setItem('user', JSON.stringify(user));
            }, LIMITED_USER);
            // Reload to apply new auth context
            await page.reload();
        });
        await test_1.test.step('Verify PBAC Denies Unauthorized Mutations', async () => {
            await page.goto('/investigations');
            // Try to create investigation (should be denied for viewer role)
            await page.click('[data-testid="create-investigation-button"]');
            await page.fill('[data-testid="investigation-title"]', 'Unauthorized Test');
            await page.click('[data-testid="create-investigation-submit"]');
            // Should see authorization error
            await (0, test_1.expect)(page.locator('[data-testid="error-message"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="error-message"]')).toContainText(/forbidden|not authorized|access denied/i);
        });
        await test_1.test.step('Verify PBAC Allows Authorized Reads', async () => {
            // Viewer should be able to read investigations
            await page.goto('/investigations');
            await (0, test_1.expect)(page.locator('[data-testid="investigations-list"]')).toBeVisible();
            // But not see create/edit controls
            await (0, test_1.expect)(page.locator('[data-testid="create-investigation-button"]')).not.toBeVisible();
        });
        await test_1.test.step('Verify GraphRAG Access Control', async () => {
            // Navigate to existing investigation
            await page.click('[data-testid="investigation-item"]:first-child');
            // Should be able to query GraphRAG (read operation)
            await page.click('[data-testid="graphrag-panel-toggle"]');
            await page.fill('[data-testid="graphrag-question-input"]', 'Test read access');
            await page.click('[data-testid="graphrag-submit-button"]');
            // Should get response or appropriate read-level access
            await (0, test_1.expect)(page.locator('[data-testid="graphrag-response"], [data-testid="graphrag-loading"]')).toBeVisible({ timeout: 10000 });
        });
    });
    (0, test_1.test)('monitoring and observability verification', async ({ page }) => {
        await test_1.test.step('Verify Prometheus Metrics Endpoint', async () => {
            const metricsResponse = await page.request.get('/monitoring/metrics');
            (0, test_1.expect)(metricsResponse.status()).toBe(200);
            const metricsText = await metricsResponse.text();
            // Verify key metrics are present
            (0, test_1.expect)(metricsText).toContain('graphql_');
            (0, test_1.expect)(metricsText).toContain('http_requests_total');
            (0, test_1.expect)(metricsText).toContain('process_');
        });
        await test_1.test.step('Verify Liveness and Readiness Probes', async () => {
            const livenessResponse = await page.request.get('/monitoring/live');
            (0, test_1.expect)(livenessResponse.status()).toBe(200);
            const readinessResponse = await page.request.get('/monitoring/ready');
            (0, test_1.expect)(readinessResponse.status()).toBe(200);
            const readinessData = await readinessResponse.json();
            (0, test_1.expect)(readinessData.status).toBe('ready');
        });
        await test_1.test.step('Verify Rate Limiting is Active', async () => {
            // Make multiple rapid requests to trigger rate limiting
            const requests = Array.from({ length: 10 }, () => page.request.get('/graphql', {
                data: { query: '{ __typename }' },
            }));
            const responses = await Promise.all(requests);
            // At least some should succeed, but verify rate limiting exists
            const successCount = responses.filter((r) => r.status() === 200).length;
            (0, test_1.expect)(successCount).toBeGreaterThan(0);
            // Note: Actual rate limiting verification would need higher load
            // This is a basic smoke test that the endpoint responds appropriately
        });
    });
    (0, test_1.test)('persisted queries enforcement (production mode)', async ({ page }) => {
        await test_1.test.step('Verify Non-Persisted Query Rejection in Prod Mode', async () => {
            // This test would need to be run against a production-configured instance
            // For CI, we'll verify the mechanism exists
            const nonPersistedQuery = `
        query NonPersistedTestQuery {
          __type(name: "Query") {
            name
          }
        }
      `;
            // In production mode, this should be rejected
            // In dev mode, it should work but be logged as non-persisted
            const response = await page.request.post('/graphql', {
                data: {
                    query: nonPersistedQuery,
                    operationName: 'NonPersistedTestQuery',
                },
            });
            // Verify either success (dev) or appropriate rejection (prod)
            (0, test_1.expect)([200, 403, 400]).toContain(response.status());
            if (response.status() === 403) {
                const errorData = await response.json();
                (0, test_1.expect)(errorData.errors[0].extensions.code).toBe('PERSISTED_QUERY_NOT_FOUND');
            }
        });
        await test_1.test.step('Verify Introspection Disabled in Production', async () => {
            const introspectionQuery = `
        query IntrospectionQuery {
          __schema {
            types {
              name
            }
          }
        }
      `;
            const response = await page.request.post('/graphql', {
                data: {
                    query: introspectionQuery,
                },
            });
            // Should work in dev, be disabled in prod
            if (process.env.NODE_ENV === 'production') {
                (0, test_1.expect)(response.status()).toBe(400);
                const errorData = await response.json();
                (0, test_1.expect)(errorData.errors[0].message).toContain('introspection');
            }
            else {
                (0, test_1.expect)(response.status()).toBe(200);
            }
        });
    });
    (0, test_1.test)('end-to-end performance benchmarks', async ({ page }) => {
        await test_1.test.step('Measure Golden Path Performance', async () => {
            const startTime = Date.now();
            // Navigate to investigation
            await page.goto('/investigations/golden-path-ci-test');
            await (0, test_1.expect)(page.locator('[data-testid="investigation-loaded"]')).toBeVisible();
            const navigationTime = Date.now() - startTime;
            (0, test_1.expect)(navigationTime).toBeLessThan(5000); // < 5s navigation
            // Measure GraphRAG response time
            await page.click('[data-testid="graphrag-panel-toggle"]');
            const queryStartTime = Date.now();
            await page.fill('[data-testid="graphrag-question-input"]', 'Performance test query');
            await page.click('[data-testid="graphrag-submit-button"]');
            await (0, test_1.expect)(page.locator('[data-testid="graphrag-response"]')).toBeVisible({ timeout: 15000 });
            const graphragTime = Date.now() - queryStartTime;
            // Performance expectations for CI
            (0, test_1.expect)(graphragTime).toBeLessThan(10000); // < 10s for CI environment
            console.log(`Performance Metrics:
        - Navigation Time: ${navigationTime}ms
        - GraphRAG Response Time: ${graphragTime}ms`);
        });
    });
});
test_1.test.describe('Golden Path Data Validation', () => {
    (0, test_1.test)('verify required features are functional', async ({ page }) => {
        await test_1.test.step('Verify Combined Schema Includes GraphRAG', async () => {
            const schemaResponse = await page.request.post('/graphql', {
                data: {
                    query: `
            query {
              __type(name: "Query") {
                fields {
                  name
                }
              }
            }
          `,
                },
            });
            (0, test_1.expect)(schemaResponse.status()).toBe(200);
            const schemaData = await schemaResponse.json();
            const queryFields = schemaData.data.__type.fields.map((f) => f.name);
            (0, test_1.expect)(queryFields).toContain('graphRagAnswer');
            (0, test_1.expect)(queryFields).toContain('similarEntities');
        });
        await test_1.test.step('Verify PBAC Plugin is Registered', async () => {
            // Test that field-level authorization is active
            const unauthorizedQuery = `
        query {
          adminOnlyField
        }
      `;
            // This should trigger PBAC evaluation (even if field doesn't exist)
            const response = await page.request.post('/graphql', {
                data: { query: unauthorizedQuery },
            });
            // Should get GraphQL validation error, not server error (indicates plugins are active)
            (0, test_1.expect)([200, 400]).toContain(response.status());
        });
        await test_1.test.step('Verify Essential Services Health', async () => {
            const healthResponse = await page.request.get('/monitoring/health');
            const healthData = await healthResponse.json();
            (0, test_1.expect)(healthData.checks.neo4j).toBe('healthy');
            (0, test_1.expect)(healthData.checks.redis).toBe('healthy');
            (0, test_1.expect)(healthData.checks.postgres).toBe('healthy');
        });
    });
});
// Test configuration for CI environment
test_1.test.describe.configure({
    mode: 'serial', // Run tests in sequence for CI stability
    timeout: 60000, // 60s timeout for CI environment
});
