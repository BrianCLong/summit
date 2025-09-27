import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
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
import type { AddressInfo } from 'net';

let upstreamServer: Server;
let opaServer: Server;
let oidcServer: Server;
let scimServer: Server;

beforeAll(async () => {
  const upstream = express();
  upstream.get('/resource', (_req, res) => res.json({ data: 'ok' }));
  upstreamServer = await new Promise<Server>((resolve) => {
    const srv = upstream.listen(0, () => resolve(srv));
  });
  const upstreamPort = (upstreamServer.address() as AddressInfo).port;
  process.env.UPSTREAM = `http://localhost:${upstreamPort}`;

  const opaApp = express();
  opaApp.use(express.json());
  opaApp.post('/v1/data/authz/allow', (req, res) => {
    const { user, resource } = req.body.input;
    if (user.tenantId !== resource.tenantId) {
      return res.json({ result: false });
    }
    if (resource.needToKnow && !user.roles.includes(resource.needToKnow)) {
      return res.json({ result: false });
    }
    if (user.purpose !== 'investigation') {
      return res.json({ result: false });
    }
    return res.json({ result: true });
  });
  opaServer = await new Promise<Server>((resolve) => {
    const srv = opaApp.listen(0, () => resolve(srv));
  });
  const opaPort = (opaServer.address() as AddressInfo).port;
  process.env.OPA_URL = `http://localhost:${opaPort}/v1/data/authz/allow`;

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

  const scim = await startScimServer({ alice: ['COS:Analyst'] }, 'scim-token');
  scimServer = scim.server;
  process.env.SCIM_BASE_URL = scim.baseUrl;
  process.env.SCIM_TOKEN = 'scim-token';
  process.env.SCIM_CACHE_TTL_MS = '50';
});

afterAll(async () => {
  upstreamServer.close();
  opaServer.close();
  oidcServer.close();
  scimServer.close();
  await stopObservability();
});

beforeEach(() => {
  resetOidcClient();
  resetScimRoleMapper();
});

describe('proxy', () => {
  it('allows same-tenant access', async () => {
    const app = await createApp();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        username: 'alice',
        password: 'password123',
        purpose: 'investigation',
      });
    const token = loginRes.body.token;
    const res = await request(app)
      .get('/protected/resource')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenantA')
      .set('x-purpose', 'investigation');
    expect(res.status).toBe(200);
    expect(res.body.data).toBe('ok');
  });

  it('blocks cross-tenant access', async () => {
    const app = await createApp();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        username: 'alice',
        password: 'password123',
        purpose: 'investigation',
      });
    const token = loginRes.body.token;
    const res = await request(app)
      .get('/protected/resource')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenantB')
      .set('x-purpose', 'investigation');
    expect(res.status).toBe(403);
  });
});
