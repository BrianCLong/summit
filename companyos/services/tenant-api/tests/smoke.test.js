"use strict";
/**
 * CompanyOS Tenant API - Smoke Tests
 *
 * Golden path verification for tenant operations.
 * Run with: pnpm --filter @intelgraph/tenant-api test:smoke
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const API_BASE = process.env.TENANT_API_URL || 'http://localhost:4101';
async function graphqlRequest(query, variables = {}) {
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
(0, vitest_1.describe)('CompanyOS Tenant API Smoke Tests', () => {
    let testTenantId;
    const testSlug = `smoke-test-${Date.now()}`;
    (0, vitest_1.describe)('Health Checks', () => {
        (0, vitest_1.it)('should return healthy status on /health', async () => {
            const response = await fetch(`${API_BASE}/health`);
            (0, vitest_1.expect)(response.status).toBe(200);
            const data = await response.json();
            (0, vitest_1.expect)(data.status).toBe('healthy');
            (0, vitest_1.expect)(data.service).toBe('tenant-api');
        });
        (0, vitest_1.it)('should return ok on /healthz', async () => {
            const response = await fetch(`${API_BASE}/healthz`);
            (0, vitest_1.expect)(response.status).toBe(200);
            const data = await response.json();
            (0, vitest_1.expect)(data.ok).toBe(true);
        });
        (0, vitest_1.it)('should return detailed health on /health/detailed', async () => {
            const response = await fetch(`${API_BASE}/health/detailed`);
            (0, vitest_1.expect)(response.status).toBe(200);
            const data = await response.json();
            (0, vitest_1.expect)(data).toHaveProperty('services');
            (0, vitest_1.expect)(data).toHaveProperty('uptime');
        });
        (0, vitest_1.it)('should return prometheus metrics on /metrics', async () => {
            const response = await fetch(`${API_BASE}/metrics`);
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.headers.get('content-type')).toContain('text/plain');
        });
    });
    (0, vitest_1.describe)('GraphQL Health', () => {
        (0, vitest_1.it)('should respond to _health query', async () => {
            const data = await graphqlRequest(`
        query {
          _health {
            status
            timestamp
            version
          }
        }
      `);
            (0, vitest_1.expect)(data._health.status).toBe('healthy');
            (0, vitest_1.expect)(data._health).toHaveProperty('timestamp');
            (0, vitest_1.expect)(data._health).toHaveProperty('version');
        });
    });
    (0, vitest_1.describe)('Tenant CRUD Operations', () => {
        (0, vitest_1.it)('should create a new tenant', async () => {
            const data = await graphqlRequest(`
        mutation CreateTenant($input: CreateTenantInput!) {
          createTenant(input: $input) {
            id
            name
            slug
            status
            isActive
          }
        }
      `, {
                input: {
                    name: 'Smoke Test Tenant',
                    slug: testSlug,
                    description: 'Created by smoke test',
                    dataRegion: 'us-east-1',
                    classification: 'unclassified',
                },
            });
            (0, vitest_1.expect)(data.createTenant).toHaveProperty('id');
            (0, vitest_1.expect)(data.createTenant.name).toBe('Smoke Test Tenant');
            (0, vitest_1.expect)(data.createTenant.slug).toBe(testSlug);
            (0, vitest_1.expect)(data.createTenant.status).toBe('active');
            (0, vitest_1.expect)(data.createTenant.isActive).toBe(true);
            testTenantId = data.createTenant.id;
        });
        (0, vitest_1.it)('should read the created tenant by ID', async () => {
            const data = await graphqlRequest(`
        query GetTenant($id: ID!) {
          tenant(id: $id) {
            id
            name
            slug
            dataRegion
            classification
          }
        }
      `, { id: testTenantId });
            (0, vitest_1.expect)(data.tenant.id).toBe(testTenantId);
            (0, vitest_1.expect)(data.tenant.name).toBe('Smoke Test Tenant');
        });
        (0, vitest_1.it)('should read the tenant by slug', async () => {
            const data = await graphqlRequest(`
        query GetTenantBySlug($slug: String!) {
          tenantBySlug(slug: $slug) {
            id
            name
            slug
          }
        }
      `, { slug: testSlug });
            (0, vitest_1.expect)(data.tenantBySlug.id).toBe(testTenantId);
        });
        (0, vitest_1.it)('should list tenants', async () => {
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
            (0, vitest_1.expect)(data.tenants.tenants.length).toBeGreaterThanOrEqual(1);
            (0, vitest_1.expect)(data.tenants.totalCount).toBeGreaterThanOrEqual(1);
        });
        (0, vitest_1.it)('should update the tenant', async () => {
            const data = await graphqlRequest(`
        mutation UpdateTenant($id: ID!, $input: UpdateTenantInput!) {
          updateTenant(id: $id, input: $input) {
            id
            name
            description
          }
        }
      `, {
                id: testTenantId,
                input: {
                    name: 'Updated Smoke Test Tenant',
                    description: 'Updated by smoke test',
                },
            });
            (0, vitest_1.expect)(data.updateTenant.name).toBe('Updated Smoke Test Tenant');
            (0, vitest_1.expect)(data.updateTenant.description).toBe('Updated by smoke test');
        });
    });
    (0, vitest_1.describe)('Feature Flags', () => {
        (0, vitest_1.it)('should enable a feature flag', async () => {
            const data = await graphqlRequest(`
        mutation EnableFlag($tenantId: ID!, $flagName: String!) {
          enableFeatureFlag(tenantId: $tenantId, flagName: $flagName) {
            id
            flagName
            enabled
          }
        }
      `, {
                tenantId: testTenantId,
                flagName: 'ai_copilot_access',
            });
            (0, vitest_1.expect)(data.enableFeatureFlag.flagName).toBe('ai_copilot_access');
            (0, vitest_1.expect)(data.enableFeatureFlag.enabled).toBe(true);
        });
        (0, vitest_1.it)('should get effective feature flags', async () => {
            const data = await graphqlRequest(`
        query GetFlags($tenantId: ID!) {
          effectiveFeatureFlags(tenantId: $tenantId) {
            aiCopilotAccess
            billingEnabled
            exportEnabled
            apiAccess
          }
        }
      `, { tenantId: testTenantId });
            (0, vitest_1.expect)(data.effectiveFeatureFlags.aiCopilotAccess).toBe(true);
            (0, vitest_1.expect)(data.effectiveFeatureFlags.exportEnabled).toBe(true);
            (0, vitest_1.expect)(data.effectiveFeatureFlags.apiAccess).toBe(true);
        });
        (0, vitest_1.it)('should disable a feature flag', async () => {
            const data = await graphqlRequest(`
        mutation DisableFlag($tenantId: ID!, $flagName: String!) {
          disableFeatureFlag(tenantId: $tenantId, flagName: $flagName) {
            flagName
            enabled
          }
        }
      `, {
                tenantId: testTenantId,
                flagName: 'ai_copilot_access',
            });
            (0, vitest_1.expect)(data.disableFeatureFlag.enabled).toBe(false);
        });
    });
    (0, vitest_1.describe)('Audit Events', () => {
        (0, vitest_1.it)('should have audit events for tenant operations', async () => {
            const data = await graphqlRequest(`
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
      `, {
                filter: { tenantId: testTenantId },
            });
            (0, vitest_1.expect)(data.auditEvents.events.length).toBeGreaterThanOrEqual(1);
            (0, vitest_1.expect)(data.auditEvents.totalCount).toBeGreaterThanOrEqual(1);
            // Should have tenant_created event
            const createEvent = data.auditEvents.events.find((e) => e.eventType === 'tenant_created');
            (0, vitest_1.expect)(createEvent).toBeDefined();
        });
    });
    (0, vitest_1.describe)('Cleanup', () => {
        (0, vitest_1.it)('should delete (archive) the test tenant', async () => {
            const data = await graphqlRequest(`
        mutation DeleteTenant($id: ID!) {
          deleteTenant(id: $id)
        }
      `, { id: testTenantId });
            (0, vitest_1.expect)(data.deleteTenant).toBe(true);
        });
        (0, vitest_1.it)('should verify tenant is archived', async () => {
            const data = await graphqlRequest(`
        query GetTenant($id: ID!) {
          tenant(id: $id) {
            status
            isActive
          }
        }
      `, { id: testTenantId });
            (0, vitest_1.expect)(data.tenant.status).toBe('archived');
            (0, vitest_1.expect)(data.tenant.isActive).toBe(false);
        });
    });
});
