import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { RBACManager } from '../../../packages/authentication/src/rbac/rbac-manager.js';

import { buildApp } from '../src/app.js';
import { InMemoryPolicyDecisionStore, type PolicyDecisionStore } from '../src/services/PolicyDecisionStore.js';
import { PolicySimulationService } from '../src/services/policyService.js';
import { ReceiptStore, ReceiptVerifier } from '../src/routes/receipts/get.js';
import { EventPublisher } from '../src/services/EventPublisher.js';

class AllowAllPolicyService implements PolicySimulationService {
  async simulate() {
    return {
      allow: true,
      reason: 'ok',
      obligations: [],
      redactions: [],
      raw: {},
    };
  }
}

class StubReceiptStore implements ReceiptStore {
  private receipts = new Map<string, any>([['r1', { id: 'r1', payload: 'ok' }]]);

  async get(id: string) {
    return this.receipts.get(id);
  }
}

class StubReceiptVerifier implements ReceiptVerifier {
  async verify(_receipt: any) {
    return true;
  }
}

class StubEventPublisher extends EventPublisher {
  public published: any[] = [];

  async publish(event: any) {
    this.published.push(event);
  }
}

describe('API authentication, tenant isolation, and RBAC', () => {
  const buildTestApp = () => {
    const rbacManager = new RBACManager();
    const executeEvents = new StubEventPublisher();
    const decisionStore = new InMemoryPolicyDecisionStore(() => new Date('2024-01-01T00:00:00Z'));

    decisionStore.upsertPreflight({
      id: 'pf-allowed',
      action: 'collect',
      input: { target: 'alpha' },
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
      request: {
        subject: { id: 'user-1', roles: ['action_operator'], tenantId: 'tenant-a' },
        action: { name: 'collect' },
      },
    });

    return {
      rbacManager,
      app: buildApp({
        rbacManager,
        decisionStore,
        events: executeEvents,
        policyService: new AllowAllPolicyService(),
        store: new StubReceiptStore(),
        verifier: new StubReceiptVerifier(),
      }),
      executeEvents,
      preflightStore: decisionStore,
    };
  };

  it('rejects unauthenticated requests', async () => {
    const { app } = buildTestApp();

    const response = await request(app).get('/epics');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('unauthorized');
  });

  it('rejects requests without tenant context', async () => {
    const { app } = buildTestApp();

    const response = await request(app)
      .get('/epics')
      .set('Authorization', 'Bearer dev-token-67890');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('tenant_context_required');
  });

  it('denies operations when role lacks permission', async () => {
    const { app } = buildTestApp();

    // Use API key which does NOT have epic update permission
    const response = await request(app)
      .post('/epics/epic-1/tasks/task-1/status')
      .set('X-API-Key', 'dev-key-12345')
      .set('X-Tenant-ID', 'tenant-a')
      .send({ status: 'in_progress' });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('forbidden');
  });

  it('enforces RBAC on privileged actions and succeeds when permitted', async () => {
    const { app } = buildTestApp();

    // Use API key which HAS action_operator role
    const preflightResponse = await request(app)
      .post('/actions/preflight')
      .set('X-API-Key', 'dev-key-12345')
      .set('X-Tenant-ID', 'tenant-a')
      .send({
        subject: { id: 'user-1', roles: ['action_operator'], tenantId: 'tenant-a' },
        action: { name: 'collect' },
      });

    expect(preflightResponse.status).toBe(200);
    expect(preflightResponse.body.decision).toBe('allow');

    const executeResponse = await request(app)
      .post('/actions/execute')
      .set('X-API-Key', 'dev-key-12345')
      .set('X-Tenant-ID', 'tenant-a')
      .send({ preflight_id: 'pf-allowed', action: 'collect', input: { target: 'alpha' } });

    expect(executeResponse.status).toBe(200);
    expect(executeResponse.body.status).toBe('accepted');
  });

  it('blocks cross-tenant access attempts', async () => {
    const { app } = buildTestApp();

    const response = await request(app)
      .get('/epics')
      .set('Authorization', 'Bearer dev-token-67890')
      .set('X-Actor-Tenant-ID', 'tenant-a')
      .set('X-Tenant-ID', 'tenant-b');

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('tenant_access_denied');
  });
});
