import fs from 'fs';
import path from 'path';
import express from 'express';
import request from 'supertest';
import type { AddressInfo } from 'net';

const auditLogPath = path.join(__dirname, '..', 'audit.log');
const breakGlassStatePath = path.join(
  __dirname,
  '..',
  'break-glass-state.json',
);
const breakGlassEventsPath = path.join(
  __dirname,
  '..',
  'break-glass-events.log',
);

function cleanupLogs() {
  [auditLogPath, breakGlassStatePath, breakGlassEventsPath].forEach((file) => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });
}

async function bootstrap({
  ttlSeconds = '60',
  opaDecision,
}: {
  ttlSeconds?: string;
  opaDecision?: unknown;
} = {}) {
  cleanupLogs();
  jest.resetModules();
  process.env.AUTHZ_DEMO_USERNAME = 'alice';
  process.env.AUTHZ_DEMO_PASSWORD = 'password123';
  process.env.BREAK_GLASS_TTL_SECONDS = ttlSeconds;
  const opa = express();
  opa.use(express.json());
  opa.post('/v1/data/summit/abac/decision', (_req, res) =>
    res.json({
      result: opaDecision ?? { allow: true, reason: 'allow', obligations: [] },
    }),
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
  delete process.env.AUTHZ_DEMO_USERNAME;
  delete process.env.AUTHZ_DEMO_PASSWORD;
  jest.resetModules();
  cleanupLogs();
}

describe('break glass access', () => {
  afterAll(() => {
    cleanupLogs();
  });

  it('rejects requests without justification', async () => {
    const { app, opaServer, upstreamServer, stopObservability } =
      await bootstrap();
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
    const {
      app,
      opaServer,
      upstreamServer,
      stopObservability,
      sessionManager,
    } = await bootstrap({ ttlSeconds: '5' });

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
    expect(approvalRes.body.singleUse).toBe(true);
    expect(approvalRes.body.immutableExpiry).toBe(true);

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

    await expect(
      sessionManager.elevateSession(approvalRes.body.sid, {
        extendSeconds: 60,
      }),
    ).rejects.toThrow('session_not_extendable');

    const auditLog = fs.readFileSync(auditLogPath, 'utf8');
    expect(auditLog).toMatch(/break_glass/);

    await teardown([opaServer, upstreamServer], stopObservability);
  });

  it('expires elevated tokens after the configured TTL', async () => {
    const {
      app,
      opaServer,
      upstreamServer,
      stopObservability,
      sessionManager,
    } = await bootstrap({ ttlSeconds: '1' });

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

  it('enforces ABAC/OPA decisions and emits audit trail during break-glass usage', async () => {
    const {
      app,
      opaServer,
      upstreamServer,
      stopObservability,
      sessionManager,
    } = await bootstrap({
      ttlSeconds: '10',
      opaDecision: { allow: false, reason: 'policy_denied' },
    });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    const baseToken = loginRes.body.token;

    const requestRes = await request(app)
      .post('/access/break-glass/request')
      .set('Authorization', `Bearer ${baseToken}`)
      .send({ justification: 'zero trust drill', ticketId: 'INC-77' });

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

    const protectedRes = await request(app)
      .get('/protected/data')
      .set('Authorization', `Bearer ${approvalRes.body.token}`)
      .set('x-resource-id', 'dataset-alpha');

    expect(protectedRes.status).toBe(403);
    expect(protectedRes.body.reason).toBe('policy_denied');

    const events = fs
      .readFileSync(breakGlassEventsPath, 'utf8')
      .trim()
      .split('\n');
    expect(
      events.filter((line) => line.includes('"type":"request"')).length,
    ).toBe(1);
    expect(
      events.filter((line) => line.includes('"type":"approval"')).length,
    ).toBe(1);
    expect(
      events.filter((line) => line.includes('"type":"usage"')).length,
    ).toBe(1);

    const auditLog = fs.readFileSync(auditLogPath, 'utf8');
    expect(auditLog).toMatch(/policy_denied/);

    await teardown([opaServer, upstreamServer], stopObservability);
  });

  it('prevents re-approval once a break-glass grant expires', async () => {
    const {
      app,
      opaServer,
      upstreamServer,
      stopObservability,
      sessionManager,
    } = await bootstrap({ ttlSeconds: '2' });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    const baseToken = loginRes.body.token;

    const requestRes = await request(app)
      .post('/access/break-glass/request')
      .set('Authorization', `Bearer ${baseToken}`)
      .send({ justification: 'contain incident', ticketId: 'INC-401' });

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

    const state = JSON.parse(fs.readFileSync(breakGlassStatePath, 'utf8')) as {
      requests: Record<string, { sid: string }>;
    };
    const sid = state.requests[requestRes.body.requestId].sid;
    sessionManager.expire(sid);

    await expect(
      sessionManager.validate(approvalRes.body.token),
    ).rejects.toThrow('session_expired');

    const secondApproval = await request(app)
      .post('/access/break-glass/approve')
      .set('Authorization', `Bearer ${elevatedToken}`)
      .send({ requestId: requestRes.body.requestId });

    expect(secondApproval.status).toBe(410);
    expect(secondApproval.body.error).toBe('request_expired');

    const events = fs.readFileSync(breakGlassEventsPath, 'utf8');
    expect(events).toMatch(/expiry/);

    await teardown([opaServer, upstreamServer], stopObservability);
  });
});
