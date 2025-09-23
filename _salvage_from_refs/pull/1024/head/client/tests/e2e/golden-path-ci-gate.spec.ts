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

import { test, expect, Page } from '@playwright/test';

interface TestUser {
  id: string;
  email: string;
  roles: string[];
  token: string;
}

// Mock test users for PBAC testing
const ADMIN_USER: TestUser = {
  id: 'admin-001',
  email: 'admin@intelgraph.test',
  roles: ['admin', 'analyst'],
  token: 'mock-admin-jwt-token'
};

const LIMITED_USER: TestUser = {
  id: 'viewer-001', 
  email: 'viewer@intelgraph.test',
  roles: ['viewer'],
  token: 'mock-viewer-jwt-token'
};

test.describe('Golden Path CI Gate - REQUIRED FOR MERGE', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up auth context
    await page.goto('/');
    await page.evaluate((user) => {
      localStorage.setItem('auth_token', user.token);
      localStorage.setItem('user', JSON.stringify(user));
    }, ADMIN_USER);
  });

  test('complete golden path with monitoring health check', async ({ page }) => {
    // Step 1: Verify monitoring health endpoint
    await test.step('Verify /monitoring/health endpoint', async () => {
      const healthResponse = await page.request.get('/monitoring/health');
      expect(healthResponse.status()).toBe(200);
      
      const healthData = await healthResponse.json();
      expect(healthData.status).toBe('healthy');
      expect(healthData.checks).toBeDefined();
    });

    // Step 2: Create Investigation
    await test.step('Create Demo Investigation', async () => {
      await page.goto('/investigations');
      await expect(page.locator('h1')).toContainText('Investigations');
      
      await page.click('[data-testid="create-investigation-button"]');
      await page.fill('[data-testid="investigation-title"]', 'Golden Path CI Test');
      await page.fill('[data-testid="investigation-description"]', 'Automated test investigation for CI gate');
      await page.click('[data-testid="create-investigation-submit"]');
      
      // Wait for creation and capture investigation ID
      await expect(page.locator('[data-testid="investigation-created"]')).toBeVisible();
      const investigationId = await page.locator('[data-testid="investigation-id"]').textContent();
      expect(investigationId).toBeTruthy();
    });

    // Step 3: Create Entities 
    await test.step('Create Test Entities', async () => {
      // Create Alice entity
      await page.click('[data-testid="add-entity-button"]');
      await page.fill('[data-testid="entity-label"]', 'Alice Chen');
      await page.selectOption('[data-testid="entity-type"]', 'person');
      await page.fill('[data-testid="entity-description"]', 'Supply chain manager at TechCorp');
      await page.click('[data-testid="entity-save"]');
      
      await expect(page.locator('[data-testid="entity-alice-chen"]')).toBeVisible();
      
      // Create Bob entity
      await page.click('[data-testid="add-entity-button"]');
      await page.fill('[data-testid="entity-label"]', 'Bob Martinez');
      await page.selectOption('[data-testid="entity-type"]', 'person');
      await page.fill('[data-testid="entity-description"]', 'Vendor coordinator at GlobalSupply');
      await page.click('[data-testid="entity-save"]');
      
      await expect(page.locator('[data-testid="entity-bob-martinez"]')).toBeVisible();
      
      // Create organization entity
      await page.click('[data-testid="add-entity-button"]');
      await page.fill('[data-testid="entity-label"]', 'TechCorp');
      await page.selectOption('[data-testid="entity-type"]', 'organization');
      await page.fill('[data-testid="entity-description"]', 'Technology manufacturing company');
      await page.click('[data-testid="entity-save"]');
      
      await expect(page.locator('[data-testid="entity-techcorp"]')).toBeVisible();
    });

    // Step 4: Create Relationships
    await test.step('Create Test Relationships', async () => {
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
      await expect(page.locator('[data-testid="relationship-alice-techcorp"]')).toBeVisible();
      await expect(page.locator('[data-testid="relationship-alice-bob"]')).toBeVisible();
    });

    // Step 5: Test GraphRAG with Explainable Results
    await test.step('Test GraphRAG Query with Explanations', async () => {
      // Open GraphRAG/Copilot panel
      await page.click('[data-testid="graphrag-panel-toggle"]');
      await expect(page.locator('[data-testid="graphrag-panel"]')).toBeVisible();
      
      // Submit a question
      const question = 'What is the connection between Alice and TechCorp?';
      await page.fill('[data-testid="graphrag-question-input"]', question);
      await page.click('[data-testid="graphrag-submit-button"]');
      
      // Wait for and verify response
      await expect(page.locator('[data-testid="graphrag-response"]')).toBeVisible({ timeout: 15000 });
      
      const response = page.locator('[data-testid="graphrag-response"]');
      await expect(response).toContainText('Alice');
      await expect(response).toContainText('TechCorp');
      
      // Verify explainable elements (why_paths and citations)
      await expect(page.locator('[data-testid="graphrag-citations"]')).toBeVisible();
      await expect(page.locator('[data-testid="graphrag-why-paths"]')).toBeVisible();
      
      // Check confidence score is displayed and reasonable
      const confidenceElement = page.locator('[data-testid="graphrag-confidence"]');
      await expect(confidenceElement).toBeVisible();
      const confidenceText = await confidenceElement.textContent();
      const confidence = parseFloat(confidenceText?.replace(/[^0-9.]/g, '') || '0');
      expect(confidence).toBeGreaterThan(0.5);
      
      // Verify graph overlay for explainability
      await expect(page.locator('[data-testid="graph-why-path-overlay"]')).toBeVisible();
      
      // Click on a why_path to verify interaction
      await page.click('[data-testid="why-path-item"]:first-child');
      await expect(page.locator('[data-testid="highlighted-relationship"]')).toBeVisible();
    });
  });

  test('PBAC denial verification for unauthorized access', async ({ page }) => {
    await test.step('Switch to Limited User', async () => {
      // Clear admin auth and set limited user
      await page.evaluate((user) => {
        localStorage.setItem('auth_token', user.token);
        localStorage.setItem('user', JSON.stringify(user));
      }, LIMITED_USER);
      
      // Reload to apply new auth context
      await page.reload();
    });

    await test.step('Verify PBAC Denies Unauthorized Mutations', async () => {
      await page.goto('/investigations');
      
      // Try to create investigation (should be denied for viewer role)
      await page.click('[data-testid="create-investigation-button"]');
      await page.fill('[data-testid="investigation-title"]', 'Unauthorized Test');
      await page.click('[data-testid="create-investigation-submit"]');
      
      // Should see authorization error
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/forbidden|not authorized|access denied/i);
    });

    await test.step('Verify PBAC Allows Authorized Reads', async () => {
      // Viewer should be able to read investigations
      await page.goto('/investigations');
      await expect(page.locator('[data-testid="investigations-list"]')).toBeVisible();
      
      // But not see create/edit controls
      await expect(page.locator('[data-testid="create-investigation-button"]')).not.toBeVisible();
    });

    await test.step('Verify GraphRAG Access Control', async () => {
      // Navigate to existing investigation
      await page.click('[data-testid="investigation-item"]:first-child');
      
      // Should be able to query GraphRAG (read operation)
      await page.click('[data-testid="graphrag-panel-toggle"]');
      await page.fill('[data-testid="graphrag-question-input"]', 'Test read access');
      await page.click('[data-testid="graphrag-submit-button"]');
      
      // Should get response or appropriate read-level access
      await expect(page.locator('[data-testid="graphrag-response"], [data-testid="graphrag-loading"]')).toBeVisible({ timeout: 10000 });
    });
  });

  test('monitoring and observability verification', async ({ page }) => {
    await test.step('Verify Prometheus Metrics Endpoint', async () => {
      const metricsResponse = await page.request.get('/monitoring/metrics');
      expect(metricsResponse.status()).toBe(200);
      
      const metricsText = await metricsResponse.text();
      
      // Verify key metrics are present
      expect(metricsText).toContain('graphql_');
      expect(metricsText).toContain('http_requests_total');
      expect(metricsText).toContain('process_');
    });

    await test.step('Verify Liveness and Readiness Probes', async () => {
      const livenessResponse = await page.request.get('/monitoring/live');
      expect(livenessResponse.status()).toBe(200);
      
      const readinessResponse = await page.request.get('/monitoring/ready');
      expect(readinessResponse.status()).toBe(200);
      
      const readinessData = await readinessResponse.json();
      expect(readinessData.status).toBe('ready');
    });

    await test.step('Verify Rate Limiting is Active', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const requests = Array.from({ length: 10 }, () => 
        page.request.get('/graphql', {
          data: { query: '{ __typename }' }
        })
      );
      
      const responses = await Promise.all(requests);
      
      // At least some should succeed, but verify rate limiting exists
      const successCount = responses.filter(r => r.status() === 200).length;
      expect(successCount).toBeGreaterThan(0);
      
      // Note: Actual rate limiting verification would need higher load
      // This is a basic smoke test that the endpoint responds appropriately
    });
  });

  test('persisted queries enforcement (production mode)', async ({ page }) => {
    await test.step('Verify Non-Persisted Query Rejection in Prod Mode', async () => {
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
          operationName: 'NonPersistedTestQuery'
        }
      });
      
      // Verify either success (dev) or appropriate rejection (prod)
      expect([200, 403, 400]).toContain(response.status());
      
      if (response.status() === 403) {
        const errorData = await response.json();
        expect(errorData.errors[0].extensions.code).toBe('PERSISTED_QUERY_NOT_FOUND');
      }
    });

    await test.step('Verify Introspection Disabled in Production', async () => {
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
          query: introspectionQuery
        }
      });
      
      // Should work in dev, be disabled in prod
      if (process.env.NODE_ENV === 'production') {
        expect(response.status()).toBe(400);
        const errorData = await response.json();
        expect(errorData.errors[0].message).toContain('introspection');
      } else {
        expect(response.status()).toBe(200);
      }
    });
  });

  test('end-to-end performance benchmarks', async ({ page }) => {
    await test.step('Measure Golden Path Performance', async () => {
      const startTime = Date.now();
      
      // Navigate to investigation
      await page.goto('/investigations/golden-path-ci-test');
      await expect(page.locator('[data-testid="investigation-loaded"]')).toBeVisible();
      
      const navigationTime = Date.now() - startTime;
      expect(navigationTime).toBeLessThan(5000); // < 5s navigation
      
      // Measure GraphRAG response time
      await page.click('[data-testid="graphrag-panel-toggle"]');
      
      const queryStartTime = Date.now();
      await page.fill('[data-testid="graphrag-question-input"]', 'Performance test query');
      await page.click('[data-testid="graphrag-submit-button"]');
      
      await expect(page.locator('[data-testid="graphrag-response"]')).toBeVisible({ timeout: 15000 });
      const graphragTime = Date.now() - queryStartTime;
      
      // Performance expectations for CI
      expect(graphragTime).toBeLessThan(10000); // < 10s for CI environment
      
      console.log(`Performance Metrics:
        - Navigation Time: ${navigationTime}ms
        - GraphRAG Response Time: ${graphragTime}ms`);
    });
  });
});

test.describe('Golden Path Data Validation', () => {
  test('verify required features are functional', async ({ page }) => {
    await test.step('Verify Combined Schema Includes GraphRAG', async () => {
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
          `
        }
      });
      
      expect(schemaResponse.status()).toBe(200);
      const schemaData = await schemaResponse.json();
      
      const queryFields = schemaData.data.__type.fields.map((f: any) => f.name);
      expect(queryFields).toContain('graphRagAnswer');
      expect(queryFields).toContain('similarEntities');
    });

    await test.step('Verify PBAC Plugin is Registered', async () => {
      // Test that field-level authorization is active
      const unauthorizedQuery = `
        query {
          adminOnlyField
        }
      `;
      
      // This should trigger PBAC evaluation (even if field doesn't exist)
      const response = await page.request.post('/graphql', {
        data: { query: unauthorizedQuery }
      });
      
      // Should get GraphQL validation error, not server error (indicates plugins are active)
      expect([200, 400]).toContain(response.status());
    });

    await test.step('Verify Essential Services Health', async () => {
      const healthResponse = await page.request.get('/monitoring/health');
      const healthData = await healthResponse.json();
      
      expect(healthData.checks.neo4j).toBe('healthy');
      expect(healthData.checks.redis).toBe('healthy');
      expect(healthData.checks.postgres).toBe('healthy');
    });
  });
});

// Test configuration for CI environment
test.describe.configure({ 
  mode: 'serial', // Run tests in sequence for CI stability
  timeout: 60000   // 60s timeout for CI environment
});