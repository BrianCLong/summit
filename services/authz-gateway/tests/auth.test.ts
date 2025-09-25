import request from 'supertest';
import { createApp } from '../src/index';
import { stopObservability } from '../src/observability';

describe('token lifecycle', () => {
  afterAll(async () => {
    await stopObservability();
  });
  it('logs in and introspects', async () => {
    const app = await createApp();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;
    const introspectRes = await request(app)
      .post('/auth/introspect')
      .send({ token });
    expect(introspectRes.status).toBe(200);
    expect(introspectRes.body.sub).toBe('alice');
  });

  it('serves JWKS', async () => {
    const app = await createApp();
    const res = await request(app).get('/.well-known/jwks.json');
    expect(res.status).toBe(200);
    expect(res.body.keys[0].kty).toBe('RSA');
  });

  it('rejects invalid introspection token', async () => {
    const app = await createApp();
    const res = await request(app)
      .post('/auth/introspect')
      .send({ token: 'bad' });
    expect(res.status).toBe(401);
  });

  it('performs step-up authentication', async () => {
    const app = await createApp();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    const token = loginRes.body.token;
    const step = await request(app)
      .post('/auth/step-up')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenantA')
      .set('x-purpose', 'treatment')
      .set('x-authority', 'hipaa');
    expect(step.status).toBe(200);
    const introspectRes = await request(app)
      .post('/auth/introspect')
      .send({ token: step.body.token });
    expect(introspectRes.status).toBe(200);
    expect(introspectRes.body.acr).toBe('loa2');
  });
});
