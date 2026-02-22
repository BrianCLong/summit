import { promises as fs } from 'node:fs';
import path from 'node:path';
import { runPolicyGate } from '../../../src/agents/repoFlow/policyGate';
import { EvidenceReport } from '../../../src/agents/repoFlow/types';
import { createTempDir } from './helpers';

describe('runPolicyGate', () => {
  it('denies when forbidden path is touched', async () => {
    const dir = await createTempDir();
    const policyPath = path.join(dir, 'policy.json');
    await fs.writeFile(
      policyPath,
      JSON.stringify(
        {
          version: '1',
          denyPaths: ['docs/security/never-log'],
          requiredEvidenceFields: ['evidenceId'],
          secretPatterns: [],
        },
        null,
        2,
      ),
      'utf8',
    );

    const evidence: EvidenceReport = {
      evidenceId: 'EVID-1',
      repo: { url: 'file://repo', ref: 'main' },
      changes: { filesTouched: ['docs/security/never-log.txt'] },
      sandbox: { profile: 'local', exitCode: 0 },
      policy: { decision: 'allow', reasons: [], policyHash: '' },
    };

    const decision = await runPolicyGate({
      changedFiles: ['docs/security/never-log.txt'],
      evidence,
      policyPath,
    });

    expect(decision.decision).toBe('deny');
    expect(decision.reasons[0]).toContain('Denied paths');
  });

  it('denies when required evidence fields are missing', async () => {
    const dir = await createTempDir();
    const policyPath = path.join(dir, 'policy.json');
    await fs.writeFile(
      policyPath,
      JSON.stringify(
        {
          version: '1',
          denyPaths: [],
          requiredEvidenceFields: ['repo.url'],
          secretPatterns: [],
        },
        null,
        2,
      ),
      'utf8',
    );

    const evidence = {
      evidenceId: 'EVID-2',
      repo: { url: '', ref: 'main' },
      changes: { filesTouched: [] },
      sandbox: { profile: 'local', exitCode: 0 },
      policy: { decision: 'allow', reasons: [], policyHash: '' },
    } satisfies EvidenceReport;

    const decision = await runPolicyGate({
      changedFiles: [],
      evidence,
      policyPath,
    });

    expect(decision.decision).toBe('deny');
    expect(decision.reasons[0]).toContain('Missing evidence fields');
  });
});
