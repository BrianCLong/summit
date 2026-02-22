import { test, expect } from '@playwright/test';

test.describe('Summit API E2E', () => {
  // Target the Python backend directly
  test.use({ baseURL: 'http://localhost:8000' });

  test('should return health status for factflow', async ({ request }) => {
    const response = await request.get('/api/factflow/health');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toEqual({ status: 'healthy', product: 'factflow' });
  });

  test('should return health status for factlaw', async ({ request }) => {
    const response = await request.get('/api/factlaw/health');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toEqual({ status: 'healthy', product: 'factlaw' });
  });

  test('should verify live transcript via API', async ({ request }) => {
    // This endpoint relies on services that might degrade gracefully if dependencies (Redis) are missing.
    const response = await request.post('/api/factflow/verify-live-transcript', {
      params: { transcript: 'test claim' }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.verdict).toBeDefined();
    expect(data.claim).toBe('test claim');
  });
});
