import fs from 'fs';
import path from 'path';
import express from 'express';
import request from 'supertest';
import type { AddressInfo } from 'net';

const auditLogPath = path.join(__dirname, '..', 'audit.log');
const breakGlassStatePath = path.join(__dirname, '..', 'break-glass-state.json');
const breakGlassEventsPath = path.join(__dirname, '..', 'break-glass-events.log');

function cleanupLogs() {
  [auditLogPath, breakGlassStatePath, breakGlassEventsPath].forEach((file) => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });
}

async function bootstrap({ ttlSeconds = '60' }: { ttlSeconds?: string } = {}) {
  cleanupLogs();
  jest.resetModules();
  process.env.BREAK_GLASS_TTL_SECONDS = ttlSeconds;
  const opa = express();
  opa.use(express.json());
  opa.post('/v1/data/summit/abac/decision', (_req, res) =>
    res.json({ result: { allow: true, reason: 'allow', obligations: [] } }),
  );
  const opaServer = opa.listen(0);
  const opaPort = (opaServer.address() as AddressInfo).port;
  process.env.OPA_URL = `http://localhost:${opaPort}/v1/data/summit/abac/decision`;

  const upstream = express();
  upstream.get('/data', (_req, res) => res.json({ ok: true }));
  const upstreamServer = upstream.listen(0);
  const upstreamPort = (upstreamServer.address() as AddressInfo).port;
  process.env.UPSTREAM = `http://localhost:${upstreamPort}`;

  const { createApp } = await import('../src/index');
  const { stopObservability } = await import('../src/observability');
  const { sessionManager } = await import('../src/session');
  const app = await createApp();
  return { app, opaServer, upstreamServer, stopObservability, sessionManager };
}

async function teardown(
  servers: Array<{ close: () => void }> = [],
  stopObservability?: () => Promise<void>,
) {
  servers.forEach((server) => server.close());
  if (stopObservability) {
    await stopObservability();
  }
  delete process.env.BREAK_GLASS_TTL_SECONDS;
  delete process.env.OPA_URL;
  delete process.env.UPSTREAM;
  jest.resetModules();
  cleanupLogs();
}

describe('break glass access', () => {
  afterAll(() => {
    cleanupLogs();
  });

  it('rejects requests without justification', async () => {
    const { app, opaServer, upstreamServer, stopObservability } = await bootstrap();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    const token = loginRes.body.token;

    const res = await request(app)
      .post('/access/break-glass/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ ticketId: 'INC-100' });

    expect(res.status).toBe(400);
    await teardown([opaServer, upstreamServer], stopObservability);
  });

  it('issues a short-lived break-glass token, audits usage, and enforces single use', async () => {
    const { app, opaServer, upstreamServer, stopObservability, sessionManager } =
      await bootstrap({ ttlSeconds: '5' });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    const baseToken = loginRes.body.token;

    const requestRes = await request(app)
      .post('/access/break-glass/request')
      .set('Authorization', `Bearer ${baseToken}`)
      .send({ justification: 'prod outage', ticketId: 'INC-42' });

    expect(requestRes.status).toBe(201);
    const { session } = await sessionManager.validate(baseToken);
    const elevatedToken = await sessionManager.elevateSession(session.sid, {
      acr: 'loa2',
      amr: ['mfa'],
    });

    const approvalRes = await request(app)
      .post('/access/break-glass/approve')
      .set('Authorization', `Bearer ${elevatedToken}`)
      .send({ requestId: requestRes.body.requestId });

    expect(approvalRes.status).toBe(200);
    expect(approvalRes.body.scope).toContain('break_glass:elevated');

    const protectedRes = await request(app)
      .get('/protected/data')
      .set('Authorization', `Bearer ${approvalRes.body.token}`)
      .set('x-resource-id', 'dataset-alpha');

    expect(protectedRes.status).toBe(200);

    const reuseRes = await request(app)
      .get('/protected/data')
      .set('Authorization', `Bearer ${approvalRes.body.token}`)
      .set('x-resource-id', 'dataset-alpha');

    expect(reuseRes.status).toBe(401);

    const auditLog = fs.readFileSync(auditLogPath, 'utf8');
    expect(auditLog).toMatch(/break_glass/);

    await teardown([opaServer, upstreamServer], stopObservability);
  });

  it('expires elevated tokens after the configured TTL', async () => {
    const { app, opaServer, upstreamServer, stopObservability, sessionManager } =
      await bootstrap({ ttlSeconds: '1' });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    const baseToken = loginRes.body.token;

    const requestRes = await request(app)
      .post('/access/break-glass/request')
      .set('Authorization', `Bearer ${baseToken}`)
      .send({ justification: 'break glass', ticketId: 'INC-99' });

    const { session } = await sessionManager.validate(baseToken);
    const elevatedToken = await sessionManager.elevateSession(session.sid, {
      acr: 'loa2',
      amr: ['mfa'],
    });

    const approvalRes = await request(app)
      .post('/access/break-glass/approve')
      .set('Authorization', `Bearer ${elevatedToken}`)
      .send({ requestId: requestRes.body.requestId });

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const expiredRes = await request(app)
      .get('/protected/data')
      .set('Authorization', `Bearer ${approvalRes.body.token}`)
      .set('x-resource-id', 'dataset-alpha');

    expect(expiredRes.status).toBe(401);
    expect(expiredRes.body.error).toBe('session_expired');

    const events = fs.readFileSync(breakGlassEventsPath, 'utf8');
    expect(events).toMatch(/expiry/);
    await teardown([opaServer, upstreamServer], stopObservability);
  });
});
