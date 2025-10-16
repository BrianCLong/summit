import { test, expect } from '@playwright/test';

test('APQ uses hashed GET without raw query bodies', async ({ page }) => {
  const graphqlRequests: Array<{
    method: string;
    url: string;
    hasQuery: boolean;
    hasExtensions: boolean;
  }> = [];

  page.on('request', (request) => {
    if (request.url().includes('/graphql')) {
      const url = request.url();
      const method = request.method();
      const hasQuery =
        url.includes('query=') &&
        !url.includes('query=%7B%22query%22%3A%22%22%7D'); // Empty query object
      const hasExtensions =
        url.includes('extensions=') || url.includes('persistedQuery');

      graphqlRequests.push({
        method,
        url,
        hasQuery,
        hasExtensions,
      });
    }
  });

  // Navigate to dashboard which should trigger GraphQL requests
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  // Wait a bit more to ensure all GraphQL requests are captured
  await page.waitForTimeout(1000);

  // Verify we captured some GraphQL requests
  expect(graphqlRequests.length).toBeGreaterThan(0);

  // Check each GraphQL request
  const violations: string[] = [];

  graphqlRequests.forEach((req, index) => {
    // All GraphQL requests should use GET for persisted queries
    if (req.method !== 'GET') {
      violations.push(
        `Request ${index + 1}: Uses ${req.method} instead of GET`,
      );
    }

    // Should have extensions/persistedQuery for APQ
    if (!req.hasExtensions) {
      violations.push(
        `Request ${index + 1}: Missing APQ extensions - ${req.url.substring(0, 100)}...`,
      );
    }

    // Should NOT have raw query bodies in GET requests
    if (req.method === 'GET' && req.hasQuery) {
      violations.push(
        `Request ${index + 1}: Contains raw query body in GET request - ${req.url.substring(0, 100)}...`,
      );
    }
  });

  if (violations.length > 0) {
    console.log('GraphQL Requests captured:');
    graphqlRequests.forEach((req, i) => {
      console.log(
        `  ${i + 1}. ${req.method} - Extensions: ${req.hasExtensions}, Query: ${req.hasQuery}`,
      );
      console.log(`     ${req.url.substring(0, 150)}...`);
    });
  }

  expect(
    violations,
    `APQ violations found:\n${violations.join('\n')}`,
  ).toHaveLength(0);

  // Additional check: verify dashboard actually loaded (sanity check)
  await expect(page.locator('[aria-label="Overview stats"]')).toBeVisible();
});
