import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from './index.js';

const ORIGINAL_ENV = { ...process.env };

describe('security controls', () => {
  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'test',
      RATE_LIMIT_TENANT_MAX_PER_MINUTE: '1',
      RATE_LIMIT_ADMIN_MAX_PER_MINUTE: '5',
      RATE_LIMIT_MAX_PER_MINUTE: '5',
    };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('enforces CSRF tokens on state-changing routes', async () => {
    const app = await createApp();
    const agent = request.agent(app);

    const forbidden = await agent.post('/actions/ping').send({}).expect(403);
    assert.match(forbidden.body.error, /CSRF/i);

    const tokenResponse = await agent.get('/security/csrf-token').expect(200);
    const token = tokenResponse.body.token;
    assert.ok(token);

    const allowed = await agent.post('/actions/ping').set('x-csrf-token', token).send({}).expect(200);
    assert.equal(allowed.body.status, 'ok');
  });

  it('applies tenant-aware rate limiting', async () => {
    const app = await createApp();
    const agent = request.agent(app);

    const tokenResponse = await agent.get('/security/csrf-token').expect(200);
    const token = tokenResponse.body.token;

    await agent
      .post('/actions/ping')
      .set('x-csrf-token', token)
      .set('x-tenant-id', 'alpha')
      .send({})
      .expect(200);

    const limited = await agent
      .post('/actions/ping')
      .set('x-csrf-token', token)
      .set('x-tenant-id', 'alpha')
      .send({})
      .expect(429);

    assert.match(limited.body.error, /Too many requests/i);
  });

  it('blocks SSRF-style metadata probes via WAF', async () => {
    const app = await createApp();
    await request(app).get('/latest/meta-data/iam/security-credentials').expect(403);
  });
});

