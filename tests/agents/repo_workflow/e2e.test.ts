import path from 'node:path';
import { promises as fs } from 'node:fs';
import { runRepoFlow } from '../../../src/agents/repoFlow';
import { createTempDir, initGitRepo } from './helpers';

const policyFixture = {
  version: '1',
  denyPaths: ['docs/security/never-log'],
  requiredEvidenceFields: ['evidenceId', 'repo.url', 'policy.policyHash'],
  secretPatterns: [],
};

describe('runRepoFlow', () => {
  it('creates branch, commits, and writes evidence', async () => {
    const repoDir = await createTempDir();
    await initGitRepo(repoDir);

    const policyPath = path.join(repoDir, 'policy.json');
    await fs.writeFile(policyPath, JSON.stringify(policyFixture, null, 2), 'utf8');

    const result = await runRepoFlow(
      {
        repoDir,
        repoUrl: 'file://repo',
        ref: 'main',
        slug: 'e2e',
        changeDescription: 'add change file',
      },
      {
        policyPath,
        applyChange: async (dir) => {
          const filePath = path.join(dir, 'change.txt');
          await fs.writeFile(filePath, 'change', 'utf8');
          return ['change.txt'];
        },
        evidenceDir: path.join(repoDir, 'artifacts', 'evidence', 'EVID-test'),
      },
    );

    const report = await fs.readFile(result.reportPath, 'utf8');

    expect(result.branchName).toBe('summit/agent/e2e');
    expect(report).toContain('"evidenceId"');
  });
});
