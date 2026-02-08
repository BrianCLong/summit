import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

import {
  assertNoTimestampsOutsideStamp,
  stringifyCanonicalJson,
  writeEvidenceBundle,
} from '../../../src/graphrag/evidence/writeEvidence';

describe('evidence bundle utilities', () => {
  it('stringifyCanonicalJson sorts object keys deterministically', () => {
    const output = stringifyCanonicalJson({ b: 2, a: 1 });
    expect(output.indexOf('"a": 1')).toBeLessThan(output.indexOf('"b": 2'));
  });

  it('rejects timestamps outside stamp.json', () => {
    const bundle = {
      report: { generatedAt: '2026-02-06T12:00:00Z' },
      metrics: {},
      stamp: {
        schemaVersion: '1.0',
        runId: 'run-1',
        generatedAt: '2026-02-06T12:00:00Z',
      },
      index: [],
    };

    expect(() => assertNoTimestampsOutsideStamp(bundle)).toThrow(
      'Timestamps must appear only in stamp.json.',
    );
  });

  it('writes a deterministic evidence bundle with index.json', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'evidence-'));
    const bundle = {
      report: { schemaVersion: '1.0', findings: [] },
      metrics: { schemaVersion: '1.0', coverage: 1, evidenceDensity: 2 },
      stamp: {
        schemaVersion: '1.0',
        runId: 'run-2',
        generatedAt: '2026-02-06T12:00:00Z',
      },
      index: [{ evidenceId: 'EVD-COMPDECODE-SCHEMA-001', files: ['report.json'] }],
    };

    await writeEvidenceBundle(bundle, dir);

    await expect(
      fs.stat(path.join(dir, 'report.json')),
    ).resolves.toBeDefined();
    await expect(
      fs.stat(path.join(dir, 'metrics.json')),
    ).resolves.toBeDefined();
    await expect(
      fs.stat(path.join(dir, 'stamp.json')),
    ).resolves.toBeDefined();
    await expect(
      fs.stat(path.join(dir, 'evidence', 'index.json')),
    ).resolves.toBeDefined();
  });
});
