/**
 * CompanyOS Tenant API - Smoke Tests
 *
 * Golden path verification for tenant operations.
 * Run with: pnpm --filter @companyos/tenant-api test:smoke
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_BASE = process.env.TENANT_API_URL || 'http://localhost:4101';

async function graphqlRequest(query: string, variables: Record<string, unknown> = {}) {
  const response = await fetch(`${API_BASE}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'smoke-test-user',
      'x-user-email': 'smoke@companyos.local',
      'x-user-roles': 'platform-admin',
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await response.json();
  if (json.errors) {
    throw new Error(`GraphQL Error: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

describe('CompanyOS Tenant API Smoke Tests', () => {
  let testTenantId: string;
  const testSlug = `smoke-test-${Date.now()}`;

  describe('Health Checks', () => {
    it('should return healthy status on /health', async () => {
      const response = await fetch(`${API_BASE}/health`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.service).toBe('tenant-api');
    });

    it('should return ok on /healthz', async () => {
      const response = await fetch(`${API_BASE}/healthz`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.ok).toBe(true);
    });

    it('should return detailed health on /health/detailed', async () => {
      const response = await fetch(`${API_BASE}/health/detailed`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('services');
      expect(data).toHaveProperty('uptime');
    });

    it('should return prometheus metrics on /metrics', async () => {
      const response = await fetch(`${API_BASE}/metrics`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/plain');
    });
  });

  describe('GraphQL Health', () => {
    it('should respond to _health query', async () => {
      const data = await graphqlRequest(`
        query {
          _health {
            status
            timestamp
            version
          }
        }
      `);

      expect(data._health.status).toBe('healthy');
      expect(data._health).toHaveProperty('timestamp');
      expect(data._health).toHaveProperty('version');
    });
  });

  describe('Tenant CRUD Operations', () => {
    it('should create a new tenant', async () => {
      const data = await graphqlRequest(
        `
        mutation CreateTenant($input: CreateTenantInput!) {
          createTenant(input: $input) {
            id
            name
            slug
            status
            isActive
          }
        }
      `,
        {
          input: {
            name: 'Smoke Test Tenant',
            slug: testSlug,
            description: 'Created by smoke test',
            dataRegion: 'us-east-1',
            classification: 'unclassified',
          },
        },
      );

      expect(data.createTenant).toHaveProperty('id');
      expect(data.createTenant.name).toBe('Smoke Test Tenant');
      expect(data.createTenant.slug).toBe(testSlug);
      expect(data.createTenant.status).toBe('active');
      expect(data.createTenant.isActive).toBe(true);

      testTenantId = data.createTenant.id;
    });

    it('should read the created tenant by ID', async () => {
      const data = await graphqlRequest(
        `
        query GetTenant($id: ID!) {
          tenant(id: $id) {
            id
            name
            slug
            dataRegion
            classification
          }
        }
      `,
        { id: testTenantId },
      );

      expect(data.tenant.id).toBe(testTenantId);
      expect(data.tenant.name).toBe('Smoke Test Tenant');
    });

    it('should read the tenant by slug', async () => {
      const data = await graphqlRequest(
        `
        query GetTenantBySlug($slug: String!) {
          tenantBySlug(slug: $slug) {
            id
            name
            slug
          }
        }
      `,
        { slug: testSlug },
      );

      expect(data.tenantBySlug.id).toBe(testTenantId);
    });

    it('should list tenants', async () => {
      const data = await graphqlRequest(`
        query {
          tenants(limit: 10) {
            tenants {
              id
              name
            }
            totalCount
          }
        }
      `);

      expect(data.tenants.tenants.length).toBeGreaterThanOrEqual(1);
      expect(data.tenants.totalCount).toBeGreaterThanOrEqual(1);
    });

    it('should update the tenant', async () => {
      const data = await graphqlRequest(
        `
        mutation UpdateTenant($id: ID!, $input: UpdateTenantInput!) {
          updateTenant(id: $id, input: $input) {
            id
            name
            description
          }
        }
      `,
        {
          id: testTenantId,
          input: {
            name: 'Updated Smoke Test Tenant',
            description: 'Updated by smoke test',
          },
        },
      );

      expect(data.updateTenant.name).toBe('Updated Smoke Test Tenant');
      expect(data.updateTenant.description).toBe('Updated by smoke test');
    });
  });

  describe('Feature Flags', () => {
    it('should enable a feature flag', async () => {
      const data = await graphqlRequest(
        `
        mutation EnableFlag($tenantId: ID!, $flagName: String!) {
          enableFeatureFlag(tenantId: $tenantId, flagName: $flagName) {
            id
            flagName
            enabled
          }
        }
      `,
        {
          tenantId: testTenantId,
          flagName: 'ai_copilot_access',
        },
      );

      expect(data.enableFeatureFlag.flagName).toBe('ai_copilot_access');
      expect(data.enableFeatureFlag.enabled).toBe(true);
    });

    it('should get effective feature flags', async () => {
      const data = await graphqlRequest(
        `
        query GetFlags($tenantId: ID!) {
          effectiveFeatureFlags(tenantId: $tenantId) {
            aiCopilotAccess
            billingEnabled
            exportEnabled
            apiAccess
          }
        }
      `,
        { tenantId: testTenantId },
      );

      expect(data.effectiveFeatureFlags.aiCopilotAccess).toBe(true);
      expect(data.effectiveFeatureFlags.exportEnabled).toBe(true);
      expect(data.effectiveFeatureFlags.apiAccess).toBe(true);
    });

    it('should disable a feature flag', async () => {
      const data = await graphqlRequest(
        `
        mutation DisableFlag($tenantId: ID!, $flagName: String!) {
          disableFeatureFlag(tenantId: $tenantId, flagName: $flagName) {
            flagName
            enabled
          }
        }
      `,
        {
          tenantId: testTenantId,
          flagName: 'ai_copilot_access',
        },
      );

      expect(data.disableFeatureFlag.enabled).toBe(false);
    });
  });

  describe('Audit Events', () => {
    it('should have audit events for tenant operations', async () => {
      const data = await graphqlRequest(
        `
        query GetAuditEvents($filter: AuditEventFilter) {
          auditEvents(filter: $filter, limit: 10) {
            events {
              id
              eventType
              action
              resourceType
              createdAt
            }
            totalCount
          }
        }
      `,
        {
          filter: { tenantId: testTenantId },
        },
      );

      expect(data.auditEvents.events.length).toBeGreaterThanOrEqual(1);
      expect(data.auditEvents.totalCount).toBeGreaterThanOrEqual(1);

      // Should have tenant_created event
      const createEvent = data.auditEvents.events.find(
        (e: any) => e.eventType === 'tenant_created',
      );
      expect(createEvent).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    it('should delete (archive) the test tenant', async () => {
      const data = await graphqlRequest(
        `
        mutation DeleteTenant($id: ID!) {
          deleteTenant(id: $id)
        }
      `,
        { id: testTenantId },
      );

      expect(data.deleteTenant).toBe(true);
    });

    it('should verify tenant is archived', async () => {
      const data = await graphqlRequest(
        `
        query GetTenant($id: ID!) {
          tenant(id: $id) {
            status
            isActive
          }
        }
      `,
        { id: testTenantId },
      );

      expect(data.tenant.status).toBe('archived');
      expect(data.tenant.isActive).toBe(false);
    });
  });
});
