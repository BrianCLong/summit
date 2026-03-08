import request from 'supertest';
import { createApp } from '../src/index';
import { stopObservability } from '../src/observability';
import { issueServiceToken } from '../src/service-auth';
import { sessionManager } from '../src/session';

describe('break glass flow', () => {
  afterAll(async () => {
    await stopObservability();
  });

  afterEach(() => {
    jest.useRealTimers();
    sessionManager.clear();
    delete process.env.BREAK_GLASS;
    delete process.env.SERVICE_AUTH_CALLERS;
    delete process.env.AUTHZ_DEMO_USERNAME;
    delete process.env.AUTHZ_DEMO_PASSWORD;
  });

  it('grants, uses, and expires elevated access', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    process.env.BREAK_GLASS = '1';
    process.env.SERVICE_AUTH_CALLERS = 'ops';
    process.env.AUTHZ_DEMO_USERNAME = 'alice';
    process.env.AUTHZ_DEMO_PASSWORD = 'password123';
    const app = await createApp();

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    expect(loginRes.status).toBe(200);
    const { session } = await sessionManager.validate(loginRes.body.token);

    const serviceToken = await issueServiceToken({
      audience: 'authz-gateway',
      serviceId: 'ops',
      scopes: ['breakglass:manage'],
      expiresInSeconds: 60,
    });

    const grantRes = await request(app)
      .post('/admin/break-glass/grant')
      .set('x-service-token', serviceToken)
      .send({
        sid: session.sid,
        reason: 'auth outage',
        role: 'oncall-admin',
        requestedBy: 'pagerduty-oncall',
        durationSeconds: 5,
        approvals: [{ approver: 'security-duty', note: 'dual-approval' }],
      });
    expect(grantRes.status).toBe(200);
    const elevatedToken = grantRes.body.token;

    const verifyRes = await request(app)
      .get('/break-glass/verify')
      .set('Authorization', `Bearer ${elevatedToken}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.session.reason).toBe('auth outage');
    expect(verifyRes.body.session.approvals[0].approver).toBe('security-duty');

    jest.setSystemTime(new Date(Date.now() + 10_000));
    const expiredRes = await request(app)
      .get('/break-glass/verify')
      .set('Authorization', `Bearer ${elevatedToken}`);
    expect(expiredRes.status).toBe(401);
    expect(expiredRes.body.error).toBe('session_expired');
  });
});
