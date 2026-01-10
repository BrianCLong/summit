import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { EvidenceIntegrityService } from '../integrity-service.js';

const queryMock = jest.fn();
const incidentMock = jest.fn();

jest.mock('../../db/postgres.js', () => ({
  getPostgresPool: () => ({
    query: (...args: any[]) => queryMock(...args),
  }),
}));

jest.mock('../../incident.js', () => ({
  openIncident: (...args: any[]) => incidentMock(...args),
}));

describe('EvidenceIntegrityService', () => {
  let storageRoot: string;

  beforeEach(async () => {
    storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'evidence-int-'));
    queryMock.mockReset();
    incidentMock.mockReset();
  });

  afterEach(async () => {
    await fs.rm(storageRoot, { recursive: true, force: true });
  });

  test('reports hash mismatch for tampered file and emits incident when enabled', async () => {
    const inlineContent = Buffer.from('inline-ok');
    const inlineHash = crypto.createHash('sha256').update(inlineContent).digest('hex');

    const tamperedContent = 'tampered-content';
    const storedHash = crypto
      .createHash('sha256')
      .update('original-content')
      .digest('hex');

    const filePath = path.join(storageRoot, 'evidence', 'run-1', 'artifact.log');
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, tamperedContent);

    const artifactRows = [
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
        return { rows: artifactCall === 1 ? artifactRows : [] };
      }
      if (sql.includes('FROM evidence_artifact_content')) {
        return { rows: [{ content: inlineContent }] };
      }
      return { rows: [] };
    });

    const service = new EvidenceIntegrityService({ storageRoot });
    const result = await service.verifyAll({
      chunkSize: 2,
      rateLimitPerSecond: 100,
      emitIncidents: true,
    });

    const computedTamperedHash = crypto
      .createHash('sha256')
      .update(tamperedContent)
      .digest('hex');

    expect(result.checked).toBe(2);
    expect(result.mismatches).toHaveLength(1);
    expect(result.mismatches[0]).toMatchObject({
      artifactId: 'file-1',
      mismatchType: 'hash_mismatch',
      storagePath: filePath,
      computedHash: computedTamperedHash,
    });
    expect(incidentMock).toHaveBeenCalledTimes(1);
  });

  test('returns passing result when hashes match for inline content', async () => {
    const content = Buffer.from('expected-content');
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    const artifactRows = [
      {
        id: 'inline-1',
        run_id: 'run-9',
        artifact_type: 'receipt',
        sha256_hash: hash,
        s3_key: 'inline://evidence_artifact_content/inline-1',
        created_at: new Date('2024-01-01T01:00:00Z'),
      },
    ];

    let artifactCall = 0;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM evidence_artifacts')) {
        artifactCall += 1;
        return { rows: artifactCall === 1 ? artifactRows : [] };
      }
      if (sql.includes('FROM evidence_artifact_content')) {
        return { rows: [{ content }] };
      }
      return { rows: [] };
    });

    const service = new EvidenceIntegrityService({ storageRoot });
    const result = await service.verifyAll({ chunkSize: 1, rateLimitPerSecond: 100 });

    expect(result.checked).toBe(1);
    expect(result.passed).toBe(1);
    expect(result.mismatches).toHaveLength(0);
    expect(incidentMock).not.toHaveBeenCalled();
  });
});
