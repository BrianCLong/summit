import request from 'supertest';
import { createApp } from '../../app.js';

describe('Policy Simulation API (feature-flagged)', () => {
  const originalFlag = process.env.POLICY_SIMULATION;
  let app: any;

  beforeAll(async () => {
    process.env.POLICY_SIMULATION = '1';
    app = await createApp();
  });

  afterAll(() => {
    process.env.POLICY_SIMULATION = originalFlag;
  });

  it('runs simulation with fixture events when none provided', async () => {
    const res = await request(app)
      .post('/api/policy/simulate')
      .set('Authorization', 'Bearer test-token')
      .send({ candidatePolicy: 'allow_role_analyst' })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.result.summary.totalEvents).toBeGreaterThan(0);
    expect(res.body.result.breakdowns.byTenant).toBeDefined();
  });

  it('returns 403 when feature flag disabled', async () => {
    process.env.POLICY_SIMULATION = '0';
    const res = await request(app)
      .post('/api/policy/simulate')
      .set('Authorization', 'Bearer test-token')
      .send({})
      .expect(403);

    expect(res.body.error).toMatch(/disabled/);
  });

  it('validates malformed events', async () => {
    process.env.POLICY_SIMULATION = '1';
    const res = await request(app)
      .post('/api/policy/simulate')
      .set('Authorization', 'Bearer test-token')
      .send({
        events: [
          { tenantId: 't1', action: 'read', decision: 'allow', actorId: '' },
        ],
      })
      .expect(400);

    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/actorId/);
  });
});
