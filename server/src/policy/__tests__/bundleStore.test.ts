import express from 'express';
import request from 'supertest';
import { writeFileSync, mkdtempSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { jest } from '@jest/globals';
import { policyBundleStore } from '../bundleStore.js';

jest.mock('../../scripts/maintenance.js', () => ({ runMaintenance: jest.fn() }));
jest.mock('../../backup/BackupService.js', () => ({
  BackupService: jest.fn().mockImplementation(() => ({
    backupPostgres: jest.fn(),
    backupNeo4j: jest.fn(),
    backupRedis: jest.fn(),
  })),
}));
jest.mock('../../dr/DisasterRecoveryService.js', () => ({
  DisasterRecoveryService: jest.fn().mockImplementation(() => ({
    runDrill: jest.fn().mockResolvedValue(true),
    getStatus: jest.fn().mockResolvedValue({ status: 'ok' }),
  })),
}));

import opsRouter from '../../routes/ops.js';

function buildTempBundle(content: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'policy-bundle-'));
  const filePath = path.join(dir, 'bundle.tar');
  writeFileSync(filePath, content);
  return filePath;
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    // Minimal admin user context for ensureRole
    req.user = { id: 'admin-user', role: 'admin' } as any;
    next();
  });
  app.use('/ops', opsRouter);
  return app;
}

describe('policy bundle hot reload', () => {
  beforeEach(() => {
    process.env.ALLOW_UNSIGNED_POLICY = 'true';
    process.env.POLICY_HOT_RELOAD = 'true';
    policyBundleStore.resetForTests();
  });

  test('reload updates current version while pinned stays stable', async () => {
    const app = buildApp();
    const initialPath = buildTempBundle('v1');
    const secondPath = buildTempBundle('v2');

    const firstRes = await request(app)
      .post('/ops/policy/reload')
      .send({ bundlePath: initialPath, versionId: 'v1' })
      .expect(200);

    expect(firstRes.body.currentVersionId).toBe('v1');

    const pinned = policyBundleStore.resolveVersion('v1');
    expect(pinned.versionId).toBe('v1');
    expect(pinned.pinned).toBe(true);

    const secondRes = await request(app)
      .post('/ops/policy/reload')
      .send({ bundlePath: secondPath, versionId: 'v2' })
      .expect(200);

    expect(secondRes.body.currentVersionId).toBe('v2');

    const pinnedAfter = policyBundleStore.resolveVersion('v1');
    expect(pinnedAfter.versionId).toBe('v1');
    expect(pinnedAfter.pinned).toBe(true);

    const current = policyBundleStore.resolveVersion();
    expect(current.versionId).toBe('v2');
    expect(current.pinned).toBe(false);
  });

  test('rollback restores prior version', async () => {
    const app = buildApp();
    const initialPath = buildTempBundle('v1');
    const secondPath = buildTempBundle('v2');

    await request(app)
      .post('/ops/policy/reload')
      .send({ bundlePath: initialPath, versionId: 'v1' })
      .expect(200);

    await request(app)
      .post('/ops/policy/reload')
      .send({ bundlePath: secondPath, versionId: 'v2' })
      .expect(200);

    const rollbackRes = await request(app)
      .post('/ops/policy/rollback')
      .query({ toVersion: 'v1' })
      .expect(200);

    expect(rollbackRes.body.currentVersionId).toBe('v1');
    const resolved = policyBundleStore.resolveVersion();
    expect(resolved.versionId).toBe('v1');
  });
});
