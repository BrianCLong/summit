import { promises as fs } from 'node:fs';
import path from 'node:path';
import { writeEvidence } from '../../../src/agents/repoFlow/evidenceWriter';
import {
  EvidenceMetrics,
  EvidenceReport,
  EvidenceStamp,
} from '../../../src/agents/repoFlow/types';
import { createTempDir } from './helpers';

describe('writeEvidence', () => {
  it('writes deterministic evidence artifacts', async () => {
    const dir = await createTempDir();
    const report: EvidenceReport = {
      evidenceId: 'EVID-123',
      repo: { url: 'file://repo', ref: 'main' },
      changes: { filesTouched: ['README.md'] },
      sandbox: { profile: 'local', exitCode: 0 },
      policy: { decision: 'allow', reasons: [], policyHash: 'hash' },
    };
    const metrics: EvidenceMetrics = {
      evidenceId: 'EVID-123',
      filesTouchedCount: 1,
      sandboxDurationMs: 10,
      sandboxExitCode: 0,
      policyDecision: 'allow',
    };
    const stamp: EvidenceStamp = {
      evidenceId: 'EVID-123',
      gitSha: 'abc123',
      policyHash: 'hash',
      schemaVersion: '1.0.0',
    };

    await writeEvidence(dir, report, metrics, stamp);

    const reportJson = await fs.readFile(path.join(dir, 'report.json'), 'utf8');
    const metricsJson = await fs.readFile(
      path.join(dir, 'metrics.json'),
      'utf8',
    );
    const stampJson = await fs.readFile(path.join(dir, 'stamp.json'), 'utf8');

    expect(reportJson).toContain('"evidenceId": "EVID-123"');
    expect(metricsJson).toContain('"sandboxDurationMs": 10');
    expect(stampJson).not.toContain('timestamp');
  });
});
