"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const routes = [
    { path: '/', name: 'Home' },
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/pipelines', name: 'Pipelines' },
    { path: '/observability', name: 'Observability' },
    { path: '/settings', name: 'Settings' },
    { path: '/autonomy', name: 'Autonomy' },
];
// Test all core routes return 200 and have SPA content
for (const route of routes) {
    (0, test_1.test)(`${route.name} route returns 200 and renders SPA`, async ({ page }) => {
        const response = await page.goto(route.path);
        (0, test_1.expect)(response?.status()).toBe(200);
        // Wait for SPA to load and check for title or main content
        await (0, test_1.expect)(page).toHaveTitle(/Maestro|IntelGraph/i);
        // Look for common SPA indicators
        const hasReact = (await page.locator('#root').count()) > 0;
        const hasContent = await page.locator('body').textContent();
        (0, test_1.expect)(hasReact || (hasContent && hasContent.length > 100)).toBeTruthy();
    });
}
(0, test_1.test)('API health endpoint returns healthy JSON', async ({ request }) => {
    const response = await request.get('/api/health');
    (0, test_1.expect)(response.status()).toBe(200);
    const data = await response.json();
    (0, test_1.expect)(data).toHaveProperty('status');
    (0, test_1.expect)(data.status).toBe('healthy');
});
(0, test_1.test)('API status endpoint returns services overview', async ({ request }) => {
    const response = await request.get('/api/status');
    (0, test_1.expect)(response.status()).toBe(200);
    const data = await response.json();
    (0, test_1.expect)(data).toBeDefined();
    (0, test_1.expect)(typeof data).toBe('object');
});
(0, test_1.test)('GraphQL endpoint probe', async ({ request }) => {
    // Try common GraphQL paths
    const graphqlPaths = [
        '/api/graphql',
        '/graphql',
        '/gql',
        '/graph',
        '/v1/graphql',
    ];
    let workingPath = null;
    for (const path of graphqlPaths) {
        try {
            const introspectionQuery = {
                query: `
          query IntrospectionQuery {
            __schema {
              types {
                name
                description
              }
            }
          }
        `,
            };
            const headers = {
                'Content-Type': 'application/json',
            };
            // Add authorization if E2E_TOKEN is provided
            if (process.env.E2E_TOKEN) {
                headers['Authorization'] = `Bearer ${process.env.E2E_TOKEN}`;
            }
            const response = await request.post(path, {
                data: introspectionQuery,
                headers,
            });
            if (response.status() === 200) {
                const data = await response.json();
                // Check if response is valid GraphQL (has data or errors)
                if (data && (data.data || data.errors)) {
                    workingPath = path;
                    console.log(`GraphQL endpoint found at ${path}`);
                    // Validate introspection response structure
                    if (data.data && data.data.__schema) {
                        (0, test_1.expect)(data.data.__schema).toHaveProperty('types');
                        (0, test_1.expect)(Array.isArray(data.data.__schema.types)).toBeTruthy();
                    }
                    break;
                }
            }
        }
        catch (error) {
            // Continue to next path
            continue;
        }
    }
    (0, test_1.expect)(workingPath).not.toBeNull();
    console.log(`GraphQL introspection successful at ${workingPath}`);
});
(0, test_1.test)('GraphQL endpoint returns JSON (not HTML fallback)', async ({ request, }) => {
    const response = await request.post('/api/graphql', {
        data: {
            query: '{ __schema { queryType { name } } }',
        },
        headers: {
            'Content-Type': 'application/json',
        },
    });
    (0, test_1.expect)(response.status()).toBe(200);
    const contentType = response.headers()['content-type'];
    (0, test_1.expect)(contentType).toMatch(/application\/json/i);
    const responseText = await response.text();
    (0, test_1.expect)(responseText).not.toMatch(/<!DOCTYPE html>/i);
    (0, test_1.expect)(responseText).not.toMatch(/<html/i);
    // Should be valid JSON
    const data = JSON.parse(responseText);
    (0, test_1.expect)(data).toBeDefined();
});
