import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  runAndWriteSmokeReport,
  sigstoreSmokeDefaults,
} from '../../../src/agents/supplychain/sigstore_smoke/runner.js';
import { SmokeCaseInput } from '../../../src/agents/supplychain/sigstore_smoke/types.js';

describe('sigstore smoke runner', () => {
  it('fails closed when a negative case reports success', async () => {
    const cases: SmokeCaseInput[] = [
      {
        id: 'SIGSTORE:COSIGN_MISMATCH',
        description: 'cosign bundle mismatch should fail verification',
        expectedFailureMode: 'COSIGN_MISMATCH_ACCEPTED',
        execute: () => ({
          ok: true,
          details: {
            fixture: 'mismatch.bundle.json',
          },
        }),
      },
    ];

    const report = await runAndWriteSmokeReport(
      cases,
      sigstoreSmokeDefaults.reportPath,
    );

    expect(report.schema).toBe('summit.sigstore.smoke.v1');
    expect(report.results).toHaveLength(1);
    expect(report.results[0].ok).toBe(false);
    expect(report.results[0].failure_mode).toBe('COSIGN_MISMATCH_ACCEPTED');
    expect(report.results[0].details.failClosed).toBe(true);

    const saved = await fs.readFile(sigstoreSmokeDefaults.reportPath, 'utf8');
    const parsed = JSON.parse(saved);
    expect(parsed.results[0].id).toBe('SIGSTORE:COSIGN_MISMATCH');
  });

  it('records unknown failures as hard fails', async () => {
    const outputPath = path.join(
      process.cwd(),
      'artifacts',
      'sigstore',
      'smoke.report.json',
    );
    const cases: SmokeCaseInput[] = [
      {
        id: 'SIGSTORE:REKOR_500',
        description: 'rekor 500 responses must fail closed',
        expectedFailureMode: 'REKOR_500_NOT_FAIL_CLOSED',
        execute: () => {
          throw new Error('rekor returned 500');
        },
      },
    ];

    const report = await runAndWriteSmokeReport(cases, outputPath);

    expect(report.results[0].ok).toBe(false);
    expect(report.results[0].failure_mode).toBe('UNKNOWN');
    expect(report.results[0].details.error).toBe('rekor returned 500');
  });
});
