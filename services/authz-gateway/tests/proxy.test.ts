import express from 'express';
import request from 'supertest';
import { createApp } from '../src/index';
import { stopObservability } from '../src/observability';
import { resetAuditLog } from '../src/audit';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

let upstreamServer: Server;
let capturedHeaders: Record<string, string | string[] | undefined>;

beforeAll((done) => {
  const upstream = express();
  upstream.get('/resource', (req, res) => {
    capturedHeaders = req.headers;
    res.json({ data: 'ok' });
  });
  upstreamServer = upstream.listen(0, () => {
    const port = (upstreamServer.address() as AddressInfo).port;
    process.env.UPSTREAM = `http://localhost:${port}`;
    done();
  });
});

afterAll(async () => {
  upstreamServer.close();
  await stopObservability();
});

describe('proxy', () => {
  beforeEach(() => {
    resetAuditLog();
  });

  it('allows tenant aligned access and forwards headers', async () => {
    const app = await createApp();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    const token = loginRes.body.token;
    const res = await request(app)
      .get('/protected/resource')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenantA')
      .set('x-needtoknow', 'reader')
      .set('x-purpose', 'treatment')
      .set('x-authority', 'hipaa');
    expect(res.status).toBe(200);
    expect(res.body.data).toBe('ok');
    expect(capturedHeaders['x-purpose']).toBe('treatment');
    expect(capturedHeaders['x-authority']).toBe('hipaa');
    expect(res.headers['x-audit-id']).toBeDefined();
  });

  it('blocks cross tenant access with deny metadata', async () => {
    const app = await createApp();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    const token = loginRes.body.token;
    const res = await request(app)
      .get('/protected/resource')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenantB')
      .set('x-purpose', 'treatment')
      .set('x-authority', 'hipaa');
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      error: 'forbidden',
      policy: 'policy.tenant-isolation',
      appealLink: expect.stringContaining('appeals'),
      appealToken: expect.any(String),
    });
    expect(res.headers['x-audit-id']).toBeDefined();
  });
});
