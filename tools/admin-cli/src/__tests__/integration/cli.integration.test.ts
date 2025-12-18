/**
 * Integration tests for Admin CLI
 * Tests against mock API server
 */

import { MockApiServer, createMockAdminServer } from './mock-server.js';

describe('Admin CLI Integration Tests', () => {
  let server: MockApiServer;
  let serverUrl: string;

  beforeAll(async () => {
    server = createMockAdminServer();
    const port = await server.start();
    serverUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('Mock Server', () => {
    it('should respond to health check', async () => {
      const response = await fetch(`${serverUrl}/health`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.status).toBe('healthy');
    });

    it('should return tenant list', async () => {
      const response = await fetch(`${serverUrl}/admin/tenants`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.items).toBeDefined();
      expect(Array.isArray(data.items)).toBe(true);
    });

    it('should return graph stats', async () => {
      const response = await fetch(`${serverUrl}/admin/graph/stats`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.nodeCount).toBeGreaterThan(0);
      expect(data.edgeCount).toBeGreaterThan(0);
    });

    it('should accept POST requests', async () => {
      const response = await fetch(`${serverUrl}/admin/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Tenant', adminEmail: 'test@example.com' }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.name).toBe('Test Tenant');
    });

    it('should return 404 for unknown routes', async () => {
      const response = await fetch(`${serverUrl}/unknown/route`);

      expect(response.status).toBe(404);
    });
  });

  describe('API Client Integration', () => {
    it('should handle successful requests', async () => {
      // Import dynamically to avoid initialization issues
      const { createApiClient } = await import('../../utils/api-client.js');

      const client = createApiClient({
        endpoint: serverUrl,
        token: 'test-token',
      });

      const response = await client.get<{ status: string }>('/health');

      expect(response.success).toBe(true);
      expect(response.data?.status).toBe('healthy');
    });

    it('should handle 404 errors', async () => {
      const { createApiClient } = await import('../../utils/api-client.js');

      const client = createApiClient({
        endpoint: serverUrl,
        token: 'test-token',
      });

      const response = await client.get('/nonexistent');

      expect(response.success).toBe(false);
      expect(response.error?.code).toContain('404');
    });

    it('should include audit headers', async () => {
      // Add route to check headers
      server.get('/check-headers', (req) => ({
        body: {
          hasNonce: !!req.headers['x-audit-nonce'],
          hasTimestamp: !!req.headers['x-audit-ts'],
          hasAuth: !!req.headers['authorization'],
        },
      }));

      const { createApiClient } = await import('../../utils/api-client.js');

      const client = createApiClient({
        endpoint: serverUrl,
        token: 'test-token',
      });

      const response = await client.get<{
        hasNonce: boolean;
        hasTimestamp: boolean;
        hasAuth: boolean;
      }>('/check-headers');

      expect(response.success).toBe(true);
      expect(response.data?.hasNonce).toBe(true);
      expect(response.data?.hasTimestamp).toBe(true);
      expect(response.data?.hasAuth).toBe(true);
    });
  });

  describe('Tenant Operations', () => {
    it('should list tenants', async () => {
      const { createApiClient } = await import('../../utils/api-client.js');

      const client = createApiClient({
        endpoint: serverUrl,
        token: 'test-token',
      });

      const response = await client.get<{ items: unknown[] }>('/admin/tenants');

      expect(response.success).toBe(true);
      expect(response.data?.items.length).toBeGreaterThan(0);
    });

    it('should create tenant', async () => {
      const { createApiClient } = await import('../../utils/api-client.js');

      const client = createApiClient({
        endpoint: serverUrl,
        token: 'test-token',
      });

      const response = await client.post<{ id: string; name: string }>('/admin/tenants', {
        name: 'Integration Test Tenant',
        adminEmail: 'admin@test.com',
      });

      expect(response.success).toBe(true);
      expect(response.data?.id).toBeDefined();
      expect(response.data?.name).toBe('Integration Test Tenant');
    });
  });

  describe('Security Operations', () => {
    it('should list security keys', async () => {
      const { createApiClient } = await import('../../utils/api-client.js');

      const client = createApiClient({
        endpoint: serverUrl,
        token: 'test-token',
      });

      const response = await client.get<{ items: unknown[] }>('/admin/security/keys');

      expect(response.success).toBe(true);
      expect(response.data?.items.length).toBeGreaterThan(0);
    });

    it('should check policies', async () => {
      const { createApiClient } = await import('../../utils/api-client.js');

      const client = createApiClient({
        endpoint: serverUrl,
        token: 'test-token',
      });

      const response = await client.post<{ results: Array<{ policy: string; compliant: boolean }> }>(
        '/admin/security/check-policies',
        { checkAll: true }
      );

      expect(response.success).toBe(true);
      expect(response.data?.results.length).toBeGreaterThan(0);
      expect(response.data?.results[0].compliant).toBe(true);
    });
  });

  describe('Graph Operations', () => {
    it('should get graph stats', async () => {
      const { createApiClient } = await import('../../utils/api-client.js');

      const client = createApiClient({
        endpoint: serverUrl,
        token: 'test-token',
      });

      const response = await client.get<{
        nodeCount: number;
        edgeCount: number;
      }>('/admin/graph/stats');

      expect(response.success).toBe(true);
      expect(response.data?.nodeCount).toBeGreaterThan(0);
      expect(response.data?.edgeCount).toBeGreaterThan(0);
    });

    it('should check graph health', async () => {
      const { createApiClient } = await import('../../utils/api-client.js');

      const client = createApiClient({
        endpoint: serverUrl,
        token: 'test-token',
      });

      const response = await client.get<{
        status: string;
        latency: number;
      }>('/admin/graph/health');

      expect(response.success).toBe(true);
      expect(response.data?.status).toBe('healthy');
    });
  });

  describe('Data Operations', () => {
    it('should start backfill operation', async () => {
      const { createApiClient } = await import('../../utils/api-client.js');

      const client = createApiClient({
        endpoint: serverUrl,
        token: 'test-token',
      });

      const response = await client.post<{
        operationId: string;
        status: string;
      }>('/admin/data/backfill', {
        source: 'postgres',
        target: 'neo4j',
      });

      expect(response.success).toBe(true);
      expect(response.data?.operationId).toBeDefined();
      expect(response.data?.status).toBe('running');
    });

    it('should list operations', async () => {
      const { createApiClient } = await import('../../utils/api-client.js');

      const client = createApiClient({
        endpoint: serverUrl,
        token: 'test-token',
      });

      const response = await client.get<{ items: unknown[] }>('/admin/data/operations');

      expect(response.success).toBe(true);
      expect(response.data?.items.length).toBeGreaterThan(0);
    });
  });
});
