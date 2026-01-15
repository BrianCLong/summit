import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import opsRouter from '../ops.js';
import { actionsRouter } from '../actions.js';
import { policyBundleStore } from '../../policy/bundleStore.js';
import { ActionPolicyService } from '../../services/ActionPolicyService.js';
jest.mock('../../scripts/maintenance.js', () => ({ runMaintenance: jest.fn() }));

jest.mock('../../audit/emit.js', () => ({
  emitAuditEvent: jest.fn().mockResolvedValue('audit-id'),
}));

jest.mock('../../middleware/auth.js', () => ({
  ensureAuthenticated: (_req: any, _res: any, next: any) => {
    (_req as any).user = { id: 'admin', role: 'ADMIN', tenantId: 'tenant-1' };
    next();
  },
  ensureRole: () => (_req: any, _res: any, next: any) => next(),
}));

const describeIf =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).correlationId = 'corr-test';
    (req as any).user = { id: 'admin', role: 'ADMIN', tenantId: 'tenant-1' };
    next();
  });
  app.use('/', opsRouter);
  app.use('/api/actions', actionsRouter);
  return app;
};

async function writeBundle(tmp: string, bundleId: string, version: string) {
  const bundle = {
    tenantId: 'tenant-1',
    bundleId,
    metadata: {},
    baseProfile: {
      id: 'base',
      version,
      regoPackage: 'actions',
      entrypoints: ['main'],
      guardrails: {},
      crossTenant: { mode: 'deny', allow: [], requireAgreements: true },
      rules: [
        {
          id: 'rule-1',
          effect: 'allow',
          conditions: {},
        },
      ],
    },
    overlays: [],
  };

  const file = path.join(tmp, `${bundleId}.bundle`);
  await fs.writeFile(file, JSON.stringify(bundle));
  return { file, id: bundleId };
}

describeIf('policy hot reload endpoints', () => {
  const tmpDir = path.join(os.tmpdir(), 'policy-hot-reload-tests');
  const originalHotReload = process.env.POLICY_HOT_RELOAD;
  const originalUnsigned = process.env.ALLOW_UNSIGNED_POLICY;

  beforeAll(async () => {
    await fs.mkdir(tmpDir, { recursive: true });
  });

  beforeEach(() => {
    process.env.POLICY_HOT_RELOAD = 'true';
    process.env.ALLOW_UNSIGNED_POLICY = 'true';
    policyBundleStore.reset();
  });

  afterAll(async () => {
    process.env.POLICY_HOT_RELOAD = originalHotReload;
    process.env.ALLOW_UNSIGNED_POLICY = originalUnsigned;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('reloads bundle versions and updates current policy', async () => {
    const { file: bundle1 } = await writeBundle(tmpDir, 'bundle-one', '1.0.0');
    const { file: bundle2 } = await writeBundle(tmpDir, 'bundle-two', '2.0.0');
    const app = buildApp();

    await request(app)
      .post('/ops/policy/reload')
      .send({ bundlePath: bundle1 })
      .expect(200);

    expect(policyBundleStore.currentPolicyVersionId).toBe('bundle-one');

    await request(app)
      .post('/ops/policy/reload')
      .send({ bundlePath: bundle2 })
      .expect(200);

    expect(policyBundleStore.currentPolicyVersionId).toBe('bundle-two');
    expect(policyBundleStore.list().length).toBe(2);
  });

  it('keeps pinned requests on their version while current advances', async () => {
    const { file: bundle1 } = await writeBundle(tmpDir, 'bundle-one', '1.0.0');
    const { file: bundle2 } = await writeBundle(tmpDir, 'bundle-two', '2.0.0');
    const app = buildApp();

    await request(app).post('/ops/policy/reload').send({ bundlePath: bundle1 });
    await request(app).post('/ops/policy/reload').send({ bundlePath: bundle2 });

    const observedContexts: any[] = [];

    const evaluateSpy = jest
      .spyOn(ActionPolicyService.prototype as any, 'evaluateWithOpa')
      .mockImplementation(async (req: any, requestHash, _meta, version) => {
        observedContexts.push(req.context);
        return {
          allow: true,
          policy_version: version,
          obligations: [],
          reason: requestHash,
        };
      });

    const pinned = await request(app)
      .post('/api/actions/preflight')
      .send({
        action: 'EXPORT_CASE',
        policyVersion: 'bundle-one',
        context: { policyVersion: 'bundle-one' },
      })
      .expect(200);

    expect(evaluateSpy).toHaveBeenCalledTimes(1);
    expect(evaluateSpy).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(String),
      expect.any(Object),
      'bundle-one',
    );
    expect(observedContexts[0]?.policyVersion).toBe('bundle-one');
    expect(pinned.body.decision.policyVersion).toBe('bundle-one');

    const current = await request(app)
      .post('/api/actions/preflight')
      .send({ action: 'EXPORT_CASE' })
      .expect(200);

    expect(evaluateSpy).toHaveBeenCalledTimes(2);
    expect(evaluateSpy).toHaveBeenLastCalledWith(
      expect.any(Object),
      expect.any(String),
      expect.any(Object),
      'bundle-two',
    );
    expect(current.body.decision.policyVersion).toBe('bundle-two');

    evaluateSpy.mockRestore();
  });

  it('rolls back to a prior version when requested', async () => {
    const { file: bundle1 } = await writeBundle(tmpDir, 'bundle-one', '1.0.0');
    const { file: bundle2 } = await writeBundle(tmpDir, 'bundle-two', '2.0.0');
    const app = buildApp();

    await request(app).post('/ops/policy/reload').send({ bundlePath: bundle1 });
    await request(app).post('/ops/policy/reload').send({ bundlePath: bundle2 });

    await request(app)
      .post('/ops/policy/rollback')
      .query({ toVersion: 'bundle-one' })
      .expect(200);

    expect(policyBundleStore.currentPolicyVersionId).toBe('bundle-one');
  });
});
