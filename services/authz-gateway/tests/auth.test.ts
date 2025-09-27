import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
} from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { createApp } from '../src/index';
import { stopObservability } from '../src/observability';
import { startOidcServer } from './helpers/oidc';
import { startScimServer } from './helpers/scim';
import { resetOidcClient } from '../src/oidc';
import { resetScimRoleMapper } from '../src/scim';
import type { Server } from 'http';

describe('token lifecycle', () => {
  let oidcServer: Server;
  let scimServer: Server;

  beforeAll(async () => {
    const oidc = await startOidcServer([
      {
        username: 'alice',
        password: 'password123',
        sub: 'alice',
        tenant: 'tenantA',
      },
    ]);
    oidcServer = oidc.server;
    process.env.OIDC_ISSUER = oidc.issuer;
    process.env.OIDC_CLIENT_ID = 'cos-client';
    process.env.OIDC_CLIENT_SECRET = 'cos-secret';
    const scim = await startScimServer(
      { alice: ['COS:Analyst'] },
      'scim-token',
    );
    scimServer = scim.server;
    process.env.SCIM_BASE_URL = scim.baseUrl;
    process.env.SCIM_TOKEN = 'scim-token';
    process.env.SCIM_CACHE_TTL_MS = '200';
  });

  beforeEach(() => {
    resetOidcClient();
    resetScimRoleMapper();
  });

  afterAll(async () => {
    await stopObservability();
    oidcServer.close();
    scimServer.close();
  });
  it('logs in and introspects', async () => {
    process.env.OPA_URL = 'http://localhost:8181/v1/data/authz/allow'; // unused in this test
    const app = await createApp();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        username: 'alice',
        password: 'password123',
        purpose: 'investigation',
      });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;
    const introspectRes = await request(app)
      .post('/auth/introspect')
      .send({ token });
    expect(introspectRes.status).toBe(200);
    expect(introspectRes.body.sub).toBe('alice');
    expect(introspectRes.body.purpose).toBe('investigation');
  });

  it('serves JWKS', async () => {
    const app = await createApp();
    const res = await request(app).get('/.well-known/jwks.json');
    expect(res.status).toBe(200);
    expect(res.body.keys[0].kty).toBe('RSA');
  });

  it('requires purpose on login', async () => {
    const app = await createApp();
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('purpose_required');
  });

  it('rejects invalid introspection token', async () => {
    const app = await createApp();
    const res = await request(app)
      .post('/auth/introspect')
      .send({ token: 'bad' });
    expect(res.status).toBe(401);
  });

  it('performs step-up authentication', async () => {
    const opaApp = startOpaAllowAll();
    const opa = await new Promise<Server>((resolve) => {
      const srv = opaApp.listen(0, () => resolve(srv));
    });
    const opaPort = (opa.address() as import('net').AddressInfo).port;
    process.env.OPA_URL = `http://localhost:${opaPort}/v1/data/authz/allow`;
    const app = await createApp();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        username: 'alice',
        password: 'password123',
        purpose: 'investigation',
      });
    const token = loginRes.body.token;
    const step = await request(app)
      .post('/auth/step-up')
      .set('Authorization', `Bearer ${token}`)
      .set('x-purpose', 'investigation');
    expect(step.status).toBe(200);
    const introspectRes = await request(app)
      .post('/auth/introspect')
      .send({ token: step.body.token });
    expect(introspectRes.status).toBe(200);
    expect(introspectRes.body.acr).toBe('loa2');
    opa.close();
  });
});

function startOpaAllowAll() {
  const opa = express();
  opa.use(express.json());
  opa.post('/v1/data/authz/allow', (_req, res) => res.json({ result: true }));
  return opa;
}
