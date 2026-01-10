import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import crypto from 'node:crypto';
import { EvidenceRegistry } from '../evidenceRegistry.js';
import { EDiscoveryExportService } from '../ediscoveryExportService.js';

const createTempDir = async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'ediscovery-'));
  return dir;
};

describe('EDiscoveryExportService', () => {
  let tmpDir: string;
  let registry: EvidenceRegistry;

  beforeEach(async () => {
    tmpDir = await createTempDir();
    registry = new EvidenceRegistry();
  });

  afterEach(async () => {
    await fsp.rm(tmpDir, { recursive: true, force: true });
  });

  it('produces hashed manifests and custody trail entries', async () => {
    const service = new EDiscoveryExportService({
      outputDir: tmpDir,
      evidenceRegistry: registry,
    });

    const scope = {
      datasetId: 'customer-emails',
      holdId: 'HOLD-123',
      description: 'Email export for discovery',
      filters: { date_gte: '2024-01-01' },
    };

    const records = [
      { id: '1', subject: 'Hello', body: 'Test', timestamp: '2024-02-01' },
      { id: '2', subject: 'Reminder', body: 'Contract', timestamp: '2024-02-02' },
    ];

    const result = await service.exportDataset(scope, records);

    expect(fs.existsSync(result.manifest.payloadPath)).toBe(true);
    const payload = (await fsp.readFile(result.manifest.payloadPath, {
      encoding: 'utf8',
    })) as unknown as string;
    const computedHash = crypto
      .createHash('sha256')
      .update(await fsp.readFile(result.manifest.payloadPath))
      .digest('hex');
    expect(computedHash).toBe(result.manifest.checksum);
    expect(result.manifest.recordCount).toBe(2);

    const artifact = registry.getArtifact(result.evidenceArtifact.id);
    expect(artifact?.hash).toBe(artifact?.custodyTrail[0].checksum);
    expect(artifact?.custodyTrail).toHaveLength(2);
    expect(artifact?.custodyTrail[1].eventType).toBe('exported');
    expect(artifact?.custodyTrail[1].checksum).toBe(result.manifest.checksum);

    const lines = payload.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('HOLD-123');
  });
});
