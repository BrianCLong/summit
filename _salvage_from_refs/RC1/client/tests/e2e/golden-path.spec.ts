/**
 * Golden Path E2E Test
 * 
 * Tests the complete Investigation → Entities → Relationships → Copilot → Results flow
 * with deterministic demo data to ensure explainable GraphRAG responses.
 * 
 * This test is REQUIRED to pass for all PRs.
 */

import { test, expect, Page } from '@playwright/test';

// Golden Path: Investigation → Entities → Relationships → Copilot → Results
test.describe('Golden Path - Complete Investigation Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Ensure demo data is loaded
    await page.goto('/');
    
    // Wait for app to initialize
    await expect(page.locator('[data-testid="app-loaded"]')).toBeVisible({ timeout: 10000 });
  });

  test('complete golden path flow with explainable results', async ({ page }) => {
    // Step 1: Navigate to Investigation
    await test.step('Navigate to Demo Investigation', async () => {
      await page.click('[data-testid="investigations-nav"]');
      await expect(page.locator('h1')).toContainText('Investigations');
      
      // Click on demo investigation
      await page.click('[data-testid="investigation-demo-investigation-001"]');
      await expect(page.locator('h1')).toContainText('Supply Chain Infiltration Demo');
    });

    // Step 2: View Entities
    await test.step('Explore Entities in Graph', async () => {
      // Wait for graph to load
      await expect(page.locator('[data-testid="cytoscape-graph"]')).toBeVisible();
      
      // Verify demo entities are visible
      await expect(page.locator('[data-testid="entity-alice-001"]')).toBeVisible();
      await expect(page.locator('[data-testid="entity-bob-002"]')).toBeVisible();
      await expect(page.locator('[data-testid="entity-techcorp-003"]')).toBeVisible();
      
      // Click on Alice Chen entity
      await page.click('[data-testid="entity-alice-001"]');
      await expect(page.locator('[data-testid="entity-details"]')).toContainText('Alice Chen');
    });

    // Step 3: Examine Relationships
    await test.step('Examine Relationships', async () => {
      // Check relationship between Alice and TechCorp
      await page.click('[data-testid="relationship-alice-techcorp-001"]');
      await expect(page.locator('[data-testid="relationship-details"]')).toContainText('employed_by');
      
      // Verify relationship properties are shown
      await expect(page.locator('[data-testid="relationship-properties"]')).toContainText('Supply Chain Manager');
    });

    // Step 4: Use Copilot for Questions
    await test.step('Ask Copilot Questions', async () => {
      // Open Copilot panel
      await page.click('[data-testid="copilot-toggle"]');
      await expect(page.locator('[data-testid="copilot-panel"]')).toBeVisible();
      
      // Ask first question
      const questionInput = page.locator('[data-testid="copilot-question-input"]');
      await questionInput.fill('What connects Alice to GlobalSupply Inc?');
      await page.click('[data-testid="copilot-ask-button"]');
      
      // Wait for response
      await expect(page.locator('[data-testid="copilot-response"]')).toBeVisible({ timeout: 15000 });
      
      // Verify response contains expected information
      const response = page.locator('[data-testid="copilot-response"]');
      await expect(response).toContainText('Alice Chen');
      await expect(response).toContainText('Bob Martinez');
      await expect(response).toContainText('GlobalSupply Inc');
    });

    // Step 5: Verify Explainable Results (why_paths overlay)
    await test.step('Verify Explainable Results with Why Paths', async () => {
      // Check that why_paths are highlighted on the graph
      await expect(page.locator('[data-testid="highlighted-path"]')).toBeVisible();
      
      // Verify specific edge IDs are highlighted
      await expect(page.locator('[data-testid="edge-rel-alice-bob-003"]')).toHaveClass(/highlighted|why-path/);
      await expect(page.locator('[data-testid="edge-rel-bob-globalsupply-002"]')).toHaveClass(/highlighted|why-path/);
      
      // Click on highlighted path to see details
      await page.click('[data-testid="edge-rel-alice-bob-003"]');
      await expect(page.locator('[data-testid="path-explanation"]')).toContainText('This connection shows');
    });

    // Step 6: Verify Entity Citations
    await test.step('Verify Entity Citations', async () => {
      // Check that cited entities are highlighted
      const citationsList = page.locator('[data-testid="response-citations"]');
      await expect(citationsList).toBeVisible();
      
      // Verify expected entity citations
      await expect(citationsList).toContainText('entity-alice-001');
      await expect(citationsList).toContainText('entity-bob-002');
      await expect(citationsList).toContainText('entity-globalsupply-004');
      
      // Click on citation to focus entity
      await page.click('[data-testid="citation-entity-alice-001"]');
      await expect(page.locator('[data-testid="entity-alice-001"]')).toHaveClass(/focused|highlighted/);
    });

    // Step 7: Ask Second Question to Test Different Path
    await test.step('Test Second Question - Contract Access', async () => {
      const questionInput = page.locator('[data-testid="copilot-question-input"]');
      await questionInput.clear();
      await questionInput.fill('Who has access to the supply contract?');
      await page.click('[data-testid="copilot-ask-button"]');
      
      // Wait for new response
      await expect(page.locator('[data-testid="copilot-response"]')).toBeVisible({ timeout: 15000 });
      
      // Verify contract-related entities are mentioned
      const response = page.locator('[data-testid="copilot-response"]');
      await expect(response).toContainText('Supply Contract SC-2024-789');
      await expect(response).toContainText('Alice Chen');
      await expect(response).toContainText('Bob Martinez');
      
      // Verify different paths are highlighted
      await expect(page.locator('[data-testid="edge-rel-techcorp-contract-004"]')).toHaveClass(/highlighted|why-path/);
      await expect(page.locator('[data-testid="edge-rel-globalsupply-contract-005"]')).toHaveClass(/highlighted|why-path/);
    });

    // Step 8: Verify Confidence and Metadata
    await test.step('Verify Response Metadata', async () => {
      // Check confidence score is displayed
      const metadata = page.locator('[data-testid="response-metadata"]');
      await expect(metadata).toBeVisible();
      await expect(metadata).toContainText('Confidence:');
      
      // Verify confidence is reasonable (> 0.7)
      const confidenceText = await metadata.locator('[data-testid="confidence-score"]').textContent();
      const confidence = parseFloat(confidenceText || '0');
      expect(confidence).toBeGreaterThan(0.7);
      
      // Check source information is provided
      await expect(metadata).toContainText('Sources:');
      await expect(metadata).toContainText('hr_records');
      await expect(metadata).toContainText('vendor_database');
    });
  });

  test('golden path works with graph interactions', async ({ page }) => {
    await test.step('Load Investigation and Interact with Graph', async () => {
      // Navigate to demo investigation
      await page.goto('/investigations/demo-investigation-001');
      await expect(page.locator('[data-testid="cytoscape-graph"]')).toBeVisible();
      
      // Test graph interactions work
      await page.click('[data-testid="entity-alice-001"]');
      await expect(page.locator('[data-testid="entity-details"]')).toBeVisible();
      
      // Test graph layout changes
      await page.click('[data-testid="layout-force"]');
      await page.waitForTimeout(1000); // Allow layout to settle
      
      // Verify entities are still interactive after layout change
      await page.click('[data-testid="entity-bob-002"]');
      await expect(page.locator('[data-testid="entity-details"]')).toContainText('Bob Martinez');
    });
  });

  test('golden path handles errors gracefully', async ({ page }) => {
    await test.step('Test Error Handling in Copilot', async () => {
      await page.goto('/investigations/demo-investigation-001');
      
      // Open copilot
      await page.click('[data-testid="copilot-toggle"]');
      
      // Ask a question that should return no results
      const questionInput = page.locator('[data-testid="copilot-question-input"]');
      await questionInput.fill('What is the meaning of life in quantum mechanics?');
      await page.click('[data-testid="copilot-ask-button"]');
      
      // Verify graceful error handling
      await expect(page.locator('[data-testid="copilot-response"]')).toBeVisible({ timeout: 15000 });
      const response = page.locator('[data-testid="copilot-response"]');
      await expect(response).toContainText(/insufficient.*information|cannot.*answer|not.*found/i);
    });
  });

  test('golden path performance benchmarks', async ({ page }) => {
    await test.step('Measure Performance Benchmarks', async () => {
      const startTime = Date.now();
      
      // Navigate to investigation
      await page.goto('/investigations/demo-investigation-001');
      await expect(page.locator('[data-testid="cytoscape-graph"]')).toBeVisible();
      
      const graphLoadTime = Date.now() - startTime;
      expect(graphLoadTime).toBeLessThan(5000); // Graph should load in < 5s
      
      // Measure copilot response time
      await page.click('[data-testid="copilot-toggle"]');
      
      const questionStartTime = Date.now();
      const questionInput = page.locator('[data-testid="copilot-question-input"]');
      await questionInput.fill('What connects Alice to GlobalSupply Inc?');
      await page.click('[data-testid="copilot-ask-button"]');
      
      await expect(page.locator('[data-testid="copilot-response"]')).toBeVisible({ timeout: 15000 });
      const responseTime = Date.now() - questionStartTime;
      
      // Response should be within acceptable limits
      expect(responseTime).toBeLessThan(10000); // < 10s for demo data
      
      console.log(`Performance Metrics:
        - Graph Load Time: ${graphLoadTime}ms
        - GraphRAG Response Time: ${responseTime}ms`);
    });
  });
});

test.describe('Golden Path Data Validation', () => {
  test('verify demo data is properly seeded', async ({ page }) => {
    await test.step('Check Demo Data Exists via API', async () => {
      // This could be enhanced to check GraphQL API directly
      await page.goto('/investigations/demo-investigation-001');
      
      // Verify investigation exists
      await expect(page.locator('h1')).toContainText('Supply Chain Infiltration Demo');
      
      // Verify expected entities exist
      const expectedEntities = [
        'Alice Chen',
        'Bob Martinez', 
        'TechCorp',
        'GlobalSupply Inc',
        'Supply Contract SC-2024-789'
      ];
      
      for (const entity of expectedEntities) {
        await expect(page.locator('[data-testid="entities-panel"]')).toContainText(entity);
      }
    });
  });
});