// @ts-nocheck
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import request from 'supertest';
import { tenantIsolationMiddleware } from '../../middleware/tenant_isolation';
import { configureKillSwitch, KillSwitchMode } from '../../governance/kill_switch';

describe('Runtime Governance Enforcement', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    // Mock user for auth context
    app.use((req, res, next) => {
        if (req.headers['x-mock-user-tenant']) {
            (req as any).user = { id: 'user1', tenantId: req.headers['x-mock-user-tenant'] };
        }
        if (req.headers['x-mock-admin']) {
             if (!(req as any).user) (req as any).user = { id: 'admin1', tenantId: 'tenant1' };
            (req as any).user.roles = ['admin'];
        }
        next();
    });
    app.use(tenantIsolationMiddleware);
    app.get('/api/test', (req, res) => {
      res.json({ message: 'Success', data: 'test-data' });
    });
    app.post('/api/test', (req, res) => {
        res.json({ message: 'Created', data: 'new-data' });
    });

    // Reset kill switch
    configureKillSwitch({ mode: KillSwitchMode.OFF, deniedRoutes: [] });
  });

  it('should reject request without tenant_id', async () => {
    const res = await request(app).get('/api/test');
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.governanceVerdict.status, 'deny');
    assert.ok(res.body.governanceVerdict.reasons.some((r: any) => r.code === 'MISSING_TENANT_ID'));
  });

  it('should allow request with matching tenant_id', async () => {
    const res = await request(app)
      .get('/api/test')
      .set('x-tenant-id', 'tenant1')
      .set('x-mock-user-tenant', 'tenant1');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.governanceVerdict.status, 'allow');
    assert.strictEqual(res.body.governanceVerdict.tenant_id, 'tenant1');
  });

  it('should reject cross-tenant access', async () => {
    const res = await request(app)
      .get('/api/test')
      .set('x-tenant-id', 'tenant2')
      .set('x-mock-user-tenant', 'tenant1');

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.governanceVerdict.status, 'deny');
    assert.ok(res.body.governanceVerdict.reasons.some((r: any) => r.code === 'TENANT_MISMATCH'));
  });

  it('should enforce DENY_ALL kill switch', async () => {
    configureKillSwitch({ mode: KillSwitchMode.DENY_ALL });
    const res = await request(app)
      .get('/api/test')
      .set('x-tenant-id', 'tenant1')
      .set('x-mock-user-tenant', 'tenant1');

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.governanceVerdict.status, 'deny');
    assert.ok(res.body.governanceVerdict.reasons.some((r: any) => r.code === 'KS_DENY_ALL'));
  });

  it('should enforce READ_ONLY kill switch (allow GET)', async () => {
    configureKillSwitch({ mode: KillSwitchMode.READ_ONLY });
    const res = await request(app)
      .get('/api/test')
      .set('x-tenant-id', 'tenant1')
      .set('x-mock-user-tenant', 'tenant1');

    assert.strictEqual(res.status, 200);
    // Should be degraded or allowed depending on implementation detail.
    // Requirement said "allow reads with degrade verdict".
    assert.strictEqual(res.body.governanceVerdict.status, 'degrade');
    assert.ok(res.body.governanceVerdict.reasons.some((r: any) => r.code === 'KS_READ_ONLY_ACTIVE'));
  });

  it('should enforce READ_ONLY kill switch (deny POST)', async () => {
    configureKillSwitch({ mode: KillSwitchMode.READ_ONLY });
    const res = await request(app)
      .post('/api/test')
      .set('x-tenant-id', 'tenant1')
      .set('x-mock-user-tenant', 'tenant1');

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.governanceVerdict.status, 'deny');
    assert.ok(res.body.governanceVerdict.reasons.some((r: any) => r.code === 'KS_READ_ONLY'));
  });

  it('should allow break-glass access', async () => {
      configureKillSwitch({ mode: KillSwitchMode.DENY_ALL, breakGlassEnabled: true });
      process.env.BREAK_GLASS = '1';

      const res = await request(app)
        .get('/api/test')
        .set('x-tenant-id', 'tenant1')
        .set('x-mock-user-tenant', 'tenant1')
        .set('x-mock-admin', 'true')
        .set('x-break-glass', 'true');

      delete process.env.BREAK_GLASS;

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.governanceVerdict.status, 'allow');
      assert.ok(res.body.governanceVerdict.reasons.some((r: any) => r.code === 'BREAK_GLASS'));
  });
});
