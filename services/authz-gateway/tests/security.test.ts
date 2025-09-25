import request from 'supertest';
import { createApp } from '../src/index';
import { stopObservability } from '../src/observability';
import { SignJWT } from 'jose';
import { getPrivateKey } from '../src/keys';
import { resetAuditLog } from '../src/audit';

describe('security', () => {
  afterAll(async () => {
    await stopObservability();
  });

  beforeEach(() => {
    resetAuditLog();
  });

  it('rejects tampered token', async () => {
    const app = await createApp();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    const token = `${loginRes.body.token}tampered`;
    const res = await request(app)
      .get('/protected/resource')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenantA')
      .set('x-purpose', 'treatment')
      .set('x-authority', 'hipaa');
    expect(res.status).toBe(401);
  });

  it('rejects expired token', async () => {
    const app = await createApp();
    const token = await new SignJWT({
      sub: 'alice',
      tenantId: 'tenantA',
      roles: ['reader'],
      status: 'active',
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'authz-gateway-1' })
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1)
      .sign(getPrivateKey());
    const res = await request(app)
      .get('/protected/resource')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenantA')
      .set('x-purpose', 'treatment')
      .set('x-authority', 'hipaa');
    expect(res.status).toBe(401);
  });

  it('enforces need-to-know requirement', async () => {
    const app = await createApp();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    const token = loginRes.body.token;
    const res = await request(app)
      .get('/protected/resource')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenantA')
      .set('x-needtoknow', 'clinical')
      .set('x-purpose', 'treatment')
      .set('x-authority', 'hipaa');
    expect(res.status).toBe(403);
    expect(res.body.policy).toBe('policy.need-to-know');
  });
});
