import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { writeEvidenceBundle } from '../../../src/agents/validation/evidence/writeEvidence';

const readJson = async <T>(filePath: string): Promise<T> => {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
};

describe('writeEvidenceBundle', () => {
  it('writes report, metrics, stamp, and index deterministically', async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'evidence-'));
    const baseDir = path.join(tmpDir, 'evidence');

    const result = await writeEvidenceBundle({
      baseDir,
      runId: 'run-001',
      createdAt: '2026-02-07T00:00:00Z',
      report: {
        evidence_id: 'EVD-software-factory-SCENARIO-001',
        item: { source: 'Simon Willison', date: '2026-02-07' },
        summary: 'Evidence schema baseline.',
        artifacts: ['schemas/report.schema.json'],
      },
      metrics: {
        satisfaction: 1,
        scenarios_total: 0,
        scenarios_passed: 0,
      },
    });

    const report = await readJson<Record<string, unknown>>(
      path.join(baseDir, 'run-001', 'report.json'),
    );
    const metrics = await readJson<Record<string, unknown>>(
      path.join(baseDir, 'run-001', 'metrics.json'),
    );
    const stamp = await readJson<Record<string, unknown>>(
      path.join(baseDir, 'run-001', 'stamp.json'),
    );
    const index = await readJson<typeof result.index>(
      path.join(baseDir, 'index.json'),
    );

    expect(report).toEqual(result.report);
    expect(metrics).toEqual(result.metrics);
    expect(stamp).toEqual({ created_at: '2026-02-07T00:00:00Z' });

    expect(report).not.toHaveProperty('created_at');
    expect(metrics).not.toHaveProperty('created_at');

    expect(index.entries).toHaveLength(1);
    expect(index.entries[0]).toEqual({
      evidence_id: 'EVD-software-factory-SCENARIO-001',
      paths: [
        path.join('run-001', 'report.json'),
        path.join('run-001', 'metrics.json'),
        path.join('run-001', 'stamp.json'),
      ],
    });
  });
});
