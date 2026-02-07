import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeEvidence, writeEvidenceIndex } from '../../../src/agents/evidence/writer';

describe('evidence writer', () => {
  const tempRoot = mkdtempSync(join(tmpdir(), 'evidence-test-'));

  afterAll(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('writes deterministic evidence artifacts', () => {
    const runDir = join(tempRoot, 'run-1');
    writeEvidence(
      runDir,
      {
        summary: 'ok',
        area: 'rlm-tea-dmoe',
        id: 'EVD-RLM-TEA-DMOE-EVID-001',
        evidenceIds: ['EVD-RLM-TEA-DMOE-TEA-001'],
      },
      { metrics: { b: 2, a: 1 } },
      { generated_at_iso: '2026-01-01T00:00:00Z' },
    );

    const report = readFileSync(join(runDir, 'report.json'), 'utf8');
    const metrics = readFileSync(join(runDir, 'metrics.json'), 'utf8');
    const stamp = readFileSync(join(runDir, 'stamp.json'), 'utf8');

    expect(report).toContain('"id"');
    expect(report).toContain('"area"');
    expect(metrics).toContain('"a"');
    expect(metrics).toContain('"b"');
    expect(stamp).toContain('generated_at_iso');
  });

  it('writes a stable evidence index', () => {
    const indexPath = join(tempRoot, 'index.json');
    writeEvidenceIndex(indexPath, {
      version: 1,
      items: [
        {
          evidenceId: 'EVD-RLM-TEA-DMOE-EVID-001',
          files: {
            report: 'evidence/run/report.json',
            metrics: 'evidence/run/metrics.json',
            stamp: 'evidence/run/stamp.json',
          },
        },
      ],
    });

    const indexContents = readFileSync(indexPath, 'utf8');
    expect(indexContents).toContain('"evidenceId"');
    expect(indexContents).toContain('"files"');
  });
});
