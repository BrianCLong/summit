import request from 'supertest';
import { createApp } from '../src/index';
import { issueServiceToken } from '../src/service-auth';
import { sloTracker, resetSloTracker } from '../src/slo';

describe('Standards and evidence endpoints', () => {
  beforeEach(() => {
    resetSloTracker();
  });

  it('returns per-tenant SLO snapshots', async () => {
    sloTracker.record('tenant-slo', '/protected', 0.12, 200);
    const token = await issueServiceToken({
      audience: 'authz-gateway',
      serviceId: 'api-gateway',
      scopes: ['slo:read'],
    });

    const app = await createApp();
    const res = await request(app)
      .get('/slo/tenant-slo')
      .set('x-service-token', token)
      .expect(200);

    expect(res.body.tenantId).toBe('tenant-slo');
    expect(res.body.requestCount).toBeGreaterThanOrEqual(1);
  });

  it('emits incident evidence bundles with metrics snapshots', async () => {
    const token = await issueServiceToken({
      audience: 'authz-gateway',
      serviceId: 'api-gateway',
      scopes: ['incident:evidence'],
    });
    const app = await createApp();

    const res = await request(app)
      .post('/incidents/evidence')
      .set('x-service-token', token)
      .set('x-tenant-id', 'tenant-incident')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
    expect(res.body.metrics).toBeDefined();
    expect(res.body.metricsSnapshot).toBeDefined();
  });

  it('exposes standards hooks and policy bundles', async () => {
    const standardsToken = await issueServiceToken({
      audience: 'authz-gateway',
      serviceId: 'api-gateway',
      scopes: ['standards:read'],
    });
    const policyToken = await issueServiceToken({
      audience: 'authz-gateway',
      serviceId: 'api-gateway',
      scopes: ['policy:export'],
    });
    const app = await createApp();

    const hooksRes = await request(app)
      .get('/standards/hooks')
      .set('x-service-token', standardsToken)
      .expect(200);
    expect(hooksRes.body.audit).toBeDefined();
    expect(hooksRes.body.policyBundle).toBeDefined();

    const policyRes = await request(app)
      .get('/policy/bundle')
      .set('x-service-token', policyToken)
      .expect(200);
    expect(policyRes.body.policies[0].contents).toBeDefined();
  });
});
