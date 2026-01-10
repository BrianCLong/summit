import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { jest } from '@jest/globals';
import express from 'express';
import {
  loadAndValidatePolicyBundle,
  policyHotReloadEnabled,
} from '../../policy/loader.js';
import { policyBundleStore, rollbackPolicyBundle } from '../../policy/policyBundleStore.js';

jest.mock('argon2', () => ({ __esModule: true, hash: jest.fn(), verify: jest.fn() }));

const originalEnv = { ...process.env };

function buildBundle(version: string, bundleId?: string) {
  return {
    tenantId: 'tenant-1',
    bundleId,
    metadata: {},
    baseProfile: {
      id: `base-${version}`,
      version,
      regoPackage: 'maestro.policy',
      entrypoints: ['allow'],
      guardrails: { defaultDeny: true, requirePurpose: false, requireJustification: false },
      crossTenant: { mode: 'deny', allow: [], requireAgreements: true },
      rules: [
        {
          id: `rule-${version}`,
          effect: 'allow',
          priority: 0,
          conditions: { actions: ['read'] },
        },
      ],
    },
    overlays: [],
  } as const;
}

async function writeBundle(tempDir: string, bundle: unknown, name: string) {
  const bundlePath = path.join(tempDir, `${name}.json`);
  await fs.writeFile(bundlePath, JSON.stringify(bundle, null, 2));
  return bundlePath;
}

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = { id: 'admin', role: 'admin', tenantId: 'system' };
    next();
  });

  app.post('/ops/policy/reload', async (req, res) => {
    if (!policyHotReloadEnabled())
      return res.status(404).json({ error: 'POLICY_HOT_RELOAD disabled' });
    const { bundlePath, signaturePath } = req.body || {};
    if (!bundlePath) return res.status(400).json({ error: 'bundlePath is required' });
    try {
      const { bundle, verification } = await loadAndValidatePolicyBundle(
        bundlePath,
        signaturePath,
      );
      const record = await policyBundleStore.upsertBundle(bundle, verification, true);
      res.json({ ok: true, currentPolicyVersionId: record.versionId, digest: record.digest });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/ops/policy/rollback', async (req, res) => {
    if (!policyHotReloadEnabled())
      return res.status(404).json({ error: 'POLICY_HOT_RELOAD disabled' });
    const target = typeof req.query.toVersion === 'string' ? req.query.toVersion : undefined;
    try {
      const record = await rollbackPolicyBundle(target);
      res.json({ ok: true, currentPolicyVersionId: record.versionId });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  return app;
}

describe('policy hot reload admin endpoints', () => {
  beforeAll(() => {
    process.env.POLICY_HOT_RELOAD = 'true';
    process.env.ALLOW_UNSIGNED_POLICY = 'true';
    process.env.POLICY_BUNDLE_STORAGE_PATH = path.join(os.tmpdir(), `bundles-${Date.now()}.json`);
  });

  beforeEach(async () => {
    policyBundleStore.reset();
    await policyBundleStore.persist();
  });

  afterAll(async () => {
    Object.assign(process.env, originalEnv);
  });

  it('reloads policy bundle and updates current version', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'policy-test-'));
    const bundlePath = await writeBundle(tmp, buildBundle('1.0.0', 'v1'), 'bundle-1');
    const app = buildTestApp();

    const res = await request(app)
      .post('/ops/policy/reload')
      .set('Authorization', 'Bearer test-token')
      .send({ bundlePath })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.currentPolicyVersionId).toBe('v1');
    const current = await policyBundleStore.resolveEffective();
    expect(current.versionId).toBe('v1');
  });

  it('keeps pinned version when new bundle is activated and allows rollback', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'policy-test-'));
    const bundleOne = await writeBundle(tmp, buildBundle('2.0.0', 'v2'), 'bundle-2');
    const bundleTwo = await writeBundle(tmp, buildBundle('3.0.0', 'v3'), 'bundle-3');
    const app = buildTestApp();

    await request(app)
      .post('/ops/policy/reload')
      .set('Authorization', 'Bearer test-token')
      .send({ bundlePath: bundleOne })
      .expect(200);

    await request(app)
      .post('/ops/policy/reload')
      .set('Authorization', 'Bearer test-token')
      .send({ bundlePath: bundleTwo })
      .expect(200);

    const pinned = await policyBundleStore.resolveEffective('v2');
    expect(pinned.versionId).toBe('v2');
    const current = await policyBundleStore.resolveEffective();
    expect(current.versionId).toBe('v3');

    const rollback = await request(app)
      .post('/ops/policy/rollback')
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(rollback.body.currentPolicyVersionId).toBe('v2');
    const afterRollback = await policyBundleStore.resolveEffective();
    expect(afterRollback.versionId).toBe('v2');
  });

  it('resolves pinned and current versions for requests through lifecycle', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'policy-test-'));
    const bundleOne = await writeBundle(tmp, buildBundle('4.0.0', 'v4'), 'bundle-4');
    const bundleTwo = await writeBundle(tmp, buildBundle('5.0.0', 'v5'), 'bundle-5');
    const app = buildTestApp();

    await request(app)
      .post('/ops/policy/reload')
      .set('Authorization', 'Bearer test-token')
      .send({ bundlePath: bundleOne })
      .expect(200);

    const pinnedTokenVersion = 'v4';

    await request(app)
      .post('/ops/policy/reload')
      .set('Authorization', 'Bearer test-token')
      .send({ bundlePath: bundleTwo })
      .expect(200);

    const pinned = await policyBundleStore.resolveRequestBundle({ pinnedVersionId: pinnedTokenVersion });
    expect(pinned.versionId).toBe('v4');

    const current = await policyBundleStore.resolveRequestBundle();
    expect(current.versionId).toBe('v5');

    await request(app)
      .post('/ops/policy/rollback')
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    const afterRollback = await policyBundleStore.resolveRequestBundle();
    expect(afterRollback.versionId).toBe('v4');
    const pinnedAfterRollback = await policyBundleStore.resolveRequestBundle({ pinnedVersionId: pinnedTokenVersion });
    expect(pinnedAfterRollback.versionId).toBe('v4');
  });
});
