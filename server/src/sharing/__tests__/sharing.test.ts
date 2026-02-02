import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import type { Server } from 'http';
import sharingRouter from '../../routes/sharing.js';
import { resetStore } from '../store.js';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api', sharingRouter);
  return app;
};

const startServer = (app: express.Express) => {
  return new Promise<Server>((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
};

describe('sharing flows', () => {
  const app = buildApp();
  let server: Server;
  let api: request.SuperTest<request.Test>;

  beforeAll(async () => {
    server = await startServer(app);
    api = request(server);
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    resetStore();
  });

  it('creates, accesses, and revokes a share link with audit entries', async () => {
    const scope = { tenantId: 't1', caseId: 'c1' };
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    const createRes = await api
      .post('/api/share-links')
      .send({
        scope,
        resourceType: 'bundle',
        resourceId: 'bundle-123',
        expiresAt,
        permissions: ['view', 'download'],
        createdBy: 'tester',
      })
      .expect(201);

    const token = createRes.body.token;
    const accessRes = await api.get(`/api/share/${token}`).expect(200);
    expect(accessRes.body.resourceId).toBe('bundle-123');

    await api.post(`/api/share-links/${createRes.body.link.id}/revoke`).send({ reason: 'policy' }).expect(200);
    await api.get(`/api/share/${token}`).expect(403);

    const audit = await api.get('/api/sharing/audit').expect(200);
    expect(audit.body.some((e: any) => e.type === 'share.created')).toBe(true);
    expect(audit.body.some((e: any) => e.type === 'share.access')).toBe(true);
    expect(audit.body.some((e: any) => e.type === 'share.revoked')).toBe(true);
    expect(audit.body.some((e: any) => e.type === 'share.denied')).toBe(true);
  });

  it('previews share and matches plan hash on creation', async () => {
    const scope = { tenantId: 't1' };
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    const preview = await api
      .post('/api/share-links/preview')
      .send({ scope, resources: ['doc-1'], permissions: ['view'], labelId: undefined })
      .expect(200);

    const created = await api
      .post('/api/share-links')
      .send({
        scope,
        resourceType: 'document',
        resourceId: 'doc-1',
        expiresAt,
        permissions: ['view'],
        createdBy: 'tester',
      })
      .expect(201);

    expect(created.body.planHash).toEqual(preview.body.planHash);
  });

  it('enforces view-only permission on download', async () => {
    const scope = { tenantId: 'tenant-perm' };
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    const createRes = await api
      .post('/api/share-links')
      .send({
        scope,
        resourceType: 'report',
        resourceId: 'rep-1',
        expiresAt,
        permissions: ['view'],
        createdBy: 'tester',
      })
      .expect(201);

    await api.get(`/api/share/${createRes.body.token}?download=1`).expect(403);
  });

  it('enforces single-use reviewer invites', async () => {
    const scope = { tenantId: 'tenant-invite' };
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    const inviteRes = await api
      .post('/api/reviewers/invite')
      .send({ email: 'reviewer@example.com', scope, resources: ['rep-1'], expiresAt })
      .expect(201);

    const accepted = await api.post(`/api/reviewers/invite/${inviteRes.body.id}/accept`).expect(200);
    expect(accepted.body.invite.status).toBe('accepted');
    await api.post(`/api/reviewers/invite/${inviteRes.body.id}/accept`).expect(404);
  });
});
