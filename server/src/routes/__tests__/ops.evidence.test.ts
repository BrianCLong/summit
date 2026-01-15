import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import request from 'supertest';
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
    getStatus: jest.fn().mockResolvedValue({ ok: true }),
  })),
}));

import opsRouter from '../ops.js';
import { EvidenceIntegrityService } from '../../evidence/integrity-service.js';
import * as integrityModule from '../../evidence/integrity-service.js';

const queryMock = jest.fn();
const incidentMock = jest.fn();

jest.mock('../../incident.js', () => ({
  openIncident: (...args: any[]) => incidentMock(...args),
}));

const describeIf =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

describeIf('POST /ops/evidence/verify', () => {
  let app: express.Application;
  let storageRoot: string;

  beforeEach(async () => {
    storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'evidence-ops-'));
    app = express();
    app.use(express.json());
    app.use('/ops', opsRouter);
    queryMock.mockReset();
    incidentMock.mockReset();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.rm(storageRoot, { recursive: true, force: true });
    delete process.env.EVIDENCE_INTEGRITY;
  });

  it('rejects requests when EVIDENCE_INTEGRITY flag is disabled', async () => {
    process.env.EVIDENCE_INTEGRITY = 'false';

    const response = await request(app).post('/ops/evidence/verify');

    expect(response.status).toBe(503);
    expect(response.body.ok).toBe(false);
  });

  it('returns mismatch details and emits an incident for tampered artifacts', async () => {
    process.env.EVIDENCE_INTEGRITY = 'true';

    const tamperedContent = 'tampered';
    const storedHash = crypto.createHash('sha256').update('original').digest('hex');
    const filePath = path.join(storageRoot, 'evidence', 'run-1', 'artifact.log');
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, tamperedContent);

    const inlineContent = Buffer.from('inline-ok');
    const inlineHash = crypto.createHash('sha256').update(inlineContent).digest('hex');

    const artifacts = [
      {
        id: 'inline-1',
        run_id: 'run-1',
        artifact_type: 'log',
        sha256_hash: inlineHash,
        s3_key: 'inline://evidence_artifact_content/inline-1',
        created_at: new Date('2024-01-01T00:00:00Z'),
      },
      {
        id: 'file-1',
        run_id: 'run-1',
        artifact_type: 'log',
        sha256_hash: storedHash,
        s3_key: path.relative(storageRoot, filePath),
        created_at: new Date('2024-01-01T00:00:10Z'),
      },
    ];

    let artifactCall = 0;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM evidence_artifacts')) {
        artifactCall += 1;
        return { rows: artifactCall === 1 ? artifacts : [] };
      }
      if (sql.includes('FROM evidence_artifact_content')) {
        return { rows: [{ content: inlineContent }] };
      }
      return { rows: [] };
    });

    const service = new EvidenceIntegrityService({ storageRoot, pool: { query: queryMock } });
    jest
      .spyOn(integrityModule.evidenceIntegrityService, 'verifyAll')
      .mockImplementation((options) =>
        service.verifyAll({ ...options, rateLimitPerSecond: 100, emitIncidents: true }),
      );

    const response = await request(app)
      .post('/ops/evidence/verify')
      .send({ chunkSize: 2, rateLimitPerSecond: 100, emitIncidents: true });

    const computedTamperedHash = crypto.createHash('sha256').update(tamperedContent).digest('hex');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.mismatches).toHaveLength(1);
    expect(response.body.mismatches[0]).toMatchObject({
      artifactId: 'file-1',
      storagePath: filePath,
      mismatchType: 'hash_mismatch',
      computedHash: computedTamperedHash,
      fileHash: computedTamperedHash,
    });
    expect(incidentMock).toHaveBeenCalledTimes(1);
  });

  it('returns passing verification for valid artifacts', async () => {
    process.env.EVIDENCE_INTEGRITY = 'true';

    const content = Buffer.from('expected-content');
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    const inlineKey = 'inline://evidence_artifact_content/inline-1';

    const artifacts = [
      {
        id: 'inline-1',
        run_id: 'run-9',
        artifact_type: 'receipt',
        sha256_hash: hash,
        s3_key: inlineKey,
        created_at: new Date('2024-01-01T01:00:00Z'),
      },
    ];

    let artifactCall = 0;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM evidence_artifacts')) {
        artifactCall += 1;
        return { rows: artifactCall === 1 ? artifacts : [] };
      }
      if (sql.includes('FROM evidence_artifact_content')) {
        return { rows: [{ content }] };
      }
      return { rows: [] };
    });

    const service = new EvidenceIntegrityService({ storageRoot, pool: { query: queryMock } });
    jest
      .spyOn(integrityModule.evidenceIntegrityService, 'verifyAll')
      .mockImplementation((options) =>
        service.verifyAll({ ...options, rateLimitPerSecond: 100, emitIncidents: true }),
      );

    const response = await request(app)
      .post('/ops/evidence/verify')
      .send({ chunkSize: 2, rateLimitPerSecond: 100 });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.checked).toBe(1);
    expect(response.body.passed).toBe(1);
    expect(response.body.mismatches).toHaveLength(0);
    expect(incidentMock).not.toHaveBeenCalled();
  });
});
