import request from 'supertest';
import { createServer } from './server.js';
import { PolicyDecision } from './policy-client.js';

type Stub = jest.Mock<Promise<PolicyDecision>, any>;

const allow: Stub = jest.fn(async () => ({ allow: true }));
const deny: Stub = jest.fn(async () => ({ allow: false, reason: 'denied' }));
const stepUp: Stub = jest.fn(async () => ({ allow: true, stepUpRequired: true, reason: 'step-up' }));

describe('golden-path service', () => {
  beforeEach(() => {
    allow.mockClear();
    deny.mockClear();
    stepUp.mockClear();
  });

  it('returns hello world', async () => {
    const app = createServer();
    const res = await request(app).get('/hello');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'hello, world' });
  });

  it('exposes health endpoints', async () => {
    const app = createServer();
    const health = await request(app).get('/healthz');
    expect(health.status).toBe(200);
    const ready = await request(app).get('/readyz');
    expect(ready.status).toBe(200);
  });

  it('guards secure approval with policy allow/deny', async () => {
    const app = createServer({ policyEvaluator: deny });
    const res = await request(app)
      .post('/payments/abc/approve')
      .set('x-user-id', 'u1')
      .send({ amount: 100 });
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('denied');
  });

  it('requires step-up when policy obligates it', async () => {
    const app = createServer({ policyEvaluator: stepUp });
    const res = await request(app)
      .post('/payments/abc/approve')
      .set('x-user-id', 'u1')
      .send({ amount: 100 });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('step-up-required');
  });

  it('approves when policy allows and step-up token is present', async () => {
    const app = createServer({ policyEvaluator: stepUp });
    const res = await request(app)
      .post('/payments/abc/approve')
      .set('x-user-id', 'u1')
      .set('x-step-up-token', 'asserted')
      .send({ amount: 50 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  it('can disable metrics endpoint', async () => {
    const app = createServer({ metricsEnabled: false });
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(404);
  });

  it('omits secure route when feature flag is off', async () => {
    const app = createServer({ secureApprovalEnabled: false });
    const res = await request(app)
      .post('/payments/abc/approve')
      .set('x-user-id', 'u1')
      .send({ amount: 100 });
    expect(res.status).toBe(404);
  });
});
