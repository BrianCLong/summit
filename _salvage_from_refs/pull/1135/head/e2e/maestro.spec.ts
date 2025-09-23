import { test, expect, request } from '@playwright/test';

const ROUTES = ['/', '/dashboard', '/pipelines', '/observability', '/settings', '/autonomy'];

test.describe('Maestro UI - Core routes', () => {
  for (const path of ROUTES) {
    test(`route ${path} responds and renders`, async ({ page, baseURL }) => {
      const url = new URL(path, baseURL).toString();
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded' });
      expect(resp, `No response navigating to ${url}`).toBeTruthy();
      expect(resp!.ok(), `Non-OK status for ${url}: ${resp && resp.status()}`).toBeTruthy();
      await expect(page).toHaveTitle(/Maestro Conductor/i);
      // Sanity check for app shell
      await expect(page.locator('body')).toBeVisible();
    });
  }
});

test.describe('Maestro API - Health and Status', () => {
  test('GET /api/health returns healthy JSON', async ({ request, baseURL }) => {
    const r = await request.get(new URL('/api/health', baseURL).toString());
    expect(r.ok()).toBeTruthy();
    expect(r.headers()['content-type']).toMatch(/application\/json/);
    const json = await r.json();
    expect(json.status).toBe('healthy');
    expect(typeof json.version).toBe('string');
  });

  test('GET /api/status returns services overview', async ({ request, baseURL }) => {
    const r = await request.get(new URL('/api/status', baseURL).toString());
    expect(r.ok()).toBeTruthy();
    expect(r.headers()['content-type']).toMatch(/application\/json/);
    const json = await r.json();
    expect(json.status).toBe('success');
    expect(Array.isArray(json.services)).toBeTruthy();
  });
});

test.describe('GraphQL endpoint probe', () => {
  const candidates = ['/api/graphql', '/graphql', '/gql', '/graph', '/v1/graphql'];
  const introspection = {
    operationName: 'Introspection',
    query:
      'query Introspection { __schema { queryType { name } mutationType { name } subscriptionType { name } types { name kind } } }',
    variables: {},
  };

  test('Find a working GraphQL endpoint and validate introspection', async ({ request, baseURL }) => {
    let success = false;
    let firstOk: { path: string; json: any } | null = null;
    const authHeader = process.env.E2E_TOKEN ? { Authorization: `Bearer ${process.env.E2E_TOKEN}` } : {};
    for (const path of candidates) {
      const url = new URL(path, baseURL).toString();
      const r = await request.post(url, {
        data: introspection,
        headers: { 'content-type': 'application/json', accept: 'application/json', ...authHeader },
      });
      const ct = r.headers()['content-type'] || '';
      if (!r.ok() || !ct.includes('application/json')) {
        continue; // Likely SPA fallback or non-GraphQL
      }
      const json = await r.json();
      if (json.data || json.errors) {
        success = true;
        firstOk = { path, json };
        break;
      }
    }
    expect(success, 'No GraphQL endpoint responded with JSON to introspection').toBeTruthy();

    // Minimal structural checks
    expect(firstOk!.json).toBeTruthy();
    expect(firstOk!.json.data || firstOk!.json.errors).toBeTruthy();
    test.info().annotations.push({ type: 'graphql-endpoint', description: firstOk!.path });
  });
});
