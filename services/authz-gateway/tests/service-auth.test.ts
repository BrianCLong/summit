import express from 'express';
import request from 'supertest';
import { requireServiceAuth, issueServiceToken } from '../src/service-auth';

function buildApp(allowedServices: string[]) {
  const app = express();
  app.use(express.json());
  app.post(
    '/internal',
    requireServiceAuth({
      audience: 'authz-gateway',
      allowedServices,
      requiredScopes: ['abac:decide'],
    }),
    (_req, res) => res.json({ ok: true }),
  );
  return app;
}

describe('service auth middleware', () => {
  const allowed = ['api-gateway', 'maestro'];
  const app = buildApp(allowed);

  it('accepts a valid caller', async () => {
    const token = await issueServiceToken({
      audience: 'authz-gateway',
      serviceId: 'api-gateway',
      scopes: ['abac:decide'],
    });
    const res = await request(app)
      .post('/internal')
      .set('x-service-token', token)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejects missing token', async () => {
    const res = await request(app).post('/internal');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('missing_service_token');
  });

  it('rejects unknown service', async () => {
    const token = await issueServiceToken({
      audience: 'authz-gateway',
      serviceId: 'untrusted',
      scopes: ['abac:decide'],
    });
    const res = await request(app)
      .post('/internal')
      .set('x-service-token', token)
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('invalid_service_token');
  });

  it('rejects expired token', async () => {
    const token = await issueServiceToken({
      audience: 'authz-gateway',
      serviceId: 'api-gateway',
      scopes: ['abac:decide'],
      expiresInSeconds: -5,
    });
    const res = await request(app)
      .post('/internal')
      .set('x-service-token', token)
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('invalid_service_token');
  });

  it('rejects missing scopes', async () => {
    const token = await issueServiceToken({
      audience: 'authz-gateway',
      serviceId: 'api-gateway',
      scopes: ['auth:introspect'],
    });
    const res = await request(app)
      .post('/internal')
      .set('x-service-token', token)
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('invalid_service_token');
  });
});
