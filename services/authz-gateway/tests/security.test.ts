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
import { SignJWT } from 'jose';
import { getPrivateKey } from '../src/keys';
import { startOidcServer } from './helpers/oidc';
import { startScimServer } from './helpers/scim';
import { resetOidcClient } from '../src/oidc';
import { resetScimRoleMapper } from '../src/scim';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

let opaServer: Server;
let upstreamServer: Server;
let oidcServer: Server;
let scimServer: Server;
let setScimGroups: ((userId: string, groups: string[]) => void) | undefined;

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
  setScimGroups = scim.setGroups;
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
  setScimGroups?.('alice', ['COS:Analyst']);
  if (existsSync('audit.log')) {
    unlinkSync('audit.log');
  }
});

describe('security', () => {
  it('rejects tampered token', async () => {
    const app = await createApp();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        username: 'alice',
        password: 'password123',
        purpose: 'investigation',
      });
    const token = loginRes.body.token + 'tampered';
    const res = await request(app)
      .get('/protected/resource')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenantA')
      .set('x-purpose', 'investigation');
    expect(res.status).toBe(401);
  });

  it('rejects expired token', async () => {
    const app = await createApp();
    const token = await new SignJWT({
      sub: 'alice',
      tenantId: 'tenantA',
      roles: ['reader'],
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'authz-gateway-1' })
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1)
      .sign(getPrivateKey());
    const res = await request(app)
      .get('/protected/resource')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenantA')
      .set('x-purpose', 'investigation');
    expect(res.status).toBe(401);
  });

  it('rejects missing authorization header', async () => {
    const app = await createApp();
    const res = await request(app)
      .get('/protected/resource')
      .set('x-tenant-id', 'tenantA')
      .set('x-purpose', 'investigation');
    expect(res.status).toBe(401);
  });

  it('rejects when purpose header is absent', async () => {
    const app = await createApp();
    const token = await new SignJWT({
      sub: 'alice',
      tenantId: 'tenantA',
      roles: ['reader'],
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'authz-gateway-1' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(getPrivateKey());
    const res = await request(app)
      .get('/protected/resource')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenantA');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('purpose_required');
  });

  it('rejects when tenant context cannot be determined', async () => {
    const app = await createApp();
    const token = await new SignJWT({
      sub: 'alice',
      roles: ['reader'],
      purpose: 'investigation',
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'authz-gateway-1' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(getPrivateKey());
    const res = await request(app)
      .get('/protected/resource')
      .set('Authorization', `Bearer ${token}`)
      .set('x-purpose', 'investigation');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('tenant_required');
  });

  it('prevents role escalation', async () => {
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
      .set('x-purpose', 'investigation')
      .set('x-needtoknow', 'admin');
    expect(res.status).toBe(403);
  });

  it('allows same-tenant access with SCIM synchronized roles', async () => {
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
  });

  it('denies cross-tenant access even after SCIM group change', async () => {
    setScimGroups?.('alice', ['COS:Lead']);
    await new Promise((resolve) => setTimeout(resolve, 75));
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

  it('reflects new SCIM roles after cache expiry', async () => {
    setScimGroups?.('alice', ['COS:Lead']);
    await new Promise((resolve) => setTimeout(resolve, 75));
    const app = await createApp();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        username: 'alice',
        password: 'password123',
        purpose: 'investigation',
      });
    const token = loginRes.body.token;
    const introspection = await request(app)
      .post('/auth/introspect')
      .send({ token });
    expect(introspection.body.roles).toContain('writer');
  });

  it('records audit context with tenant and purpose', async () => {
    const app = await createApp();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        username: 'alice',
        password: 'password123',
        purpose: 'investigation',
      });
    const token = loginRes.body.token;
    await request(app)
      .get('/protected/resource')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenantA')
      .set('x-purpose', 'investigation');
    const entries = readFileSync('audit.log', 'utf-8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    const last = entries[entries.length - 1];
    expect(last.subject).toBe('alice');
    expect(last.tenantId).toBe('tenantA');
    expect(last.purpose).toBe('investigation');
  });
});
